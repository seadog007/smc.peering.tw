import { useState } from 'react';
import { Polyline, Marker, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
import type { LatLngExpression, PopupEvent } from 'leaflet';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useIncidents, type Incident } from '../hooks/useIncidents';

// Re-use the white dot icon from Map.tsx
const whiteDotIcon = new Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iNiIgZmlsbD0id2hpdGUiLz48L3N2Zz4=',
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});

interface Segment {
  id: string;
  hidden?: boolean;
  coordinates: LatLngExpression[];
  color?: string;
}

interface Equipment {
  id: string;
  name: string;
  coordinate: [number, number];
}

interface Cable {
  id: string;
  name: string;
  color?: string;
  segments: Segment[];
  equipments?: Equipment[];
  available_path?: string[][];
}

function markBroken(paths: string[][], inputNodes: string[]) {
  const failedPaths = new Set<string>();

  // 將所有包含 inputNodes 的 path 存入 Set（避免重複）
  for (const node of inputNodes) {
    for (const path of paths) {
      if (path.includes(node)) {
        failedPaths.add(JSON.stringify(path)); // 使用 JSON 作為 Set 的 key
      }
    }
  }

  // 還原 Set 裡的 path 為 array
  const failedPathsArray = Array.from(failedPaths).map(p => JSON.parse(p) as string[]);

  // 扁平化處理
  const flatAll = paths.flat();
  const flatFailed = failedPathsArray.flat();

  // 找出所有出現在 failed path 中的節點
  const failedNodesSet = new Set(flatFailed);

  const out = [];
  for (const node of failedNodesSet) {
    const countAll = flatAll.filter(n => n === node).length;
    const countFailed = flatFailed.filter(n => n === node).length;

    if (countAll === countFailed) {
      out.push(node);
    }
  }

  return out.sort();
}

// A new component to handle the dynamic popup content
function InteractivePolyline({ cable, segment, incidents }: { cable: Cable; segment: Segment; incidents: Incident[] }) {
  const [clickedLatLng, setClickedLatLng] = useState<string | null>(null);

  const getSegmentColor = (segment: Segment) => {
    // If segment has a color override, use it
    if (segment.color) {
      return segment.color;
    }

    // Get active incidents for this cable
    const activeIncidents = incidents.filter(incident => 
      incident.cableid === cable.id && !incident.resolved_at
    );

    if (activeIncidents.length > 0 && cable.available_path) {
      // Get affected segments from active incidents
      const affectedSegments = activeIncidents.map(incident => incident.segment);
      
      // Use markBroken to determine if this segment should be marked as broken
      const brokenSegments = markBroken(cable.available_path, affectedSegments);
      
      // If this segment is in the broken segments list, color it red
      if (brokenSegments.includes(segment.id)) {
        return '#ff0000';
      }
    }

    // Default color if no incidents or not affected
    return cable.color || '#48A9FF';
  };

  const eventHandlers = {
    popupopen: (e: PopupEvent) => {
      const latlng = e.popup.getLatLng();
      if (latlng) {
        setClickedLatLng(`Lat: ${latlng.lat.toFixed(5)}, Lng: ${latlng.lng.toFixed(5)}`);
      }
    },
    popupclose: () => {
      setClickedLatLng(null);
    }
  };
  
  return (
    <Polyline
      positions={segment.coordinates.map(coord => (Array.isArray(coord) ? [coord[1], coord[0]] : coord))}
      color={getSegmentColor(segment)}
      weight={2}
      eventHandlers={eventHandlers}
    >
      <Popup>
        <b>{cable.name}</b><br />
        Segment: {segment.id}
        {clickedLatLng && <><br />{clickedLatLng}</>}
      </Popup>
    </Polyline>
  );
}

async function loadCables(): Promise<Cable[]> {
  const modules = import.meta.glob('../data/cables/*.json');
  const cablePromises = Object.values(modules).map(async (loader) => {
    const module = await loader();
    return (module as { default: Cable }).default;
  });
  return Promise.all(cablePromises);
}

export default function CableLayer() {
  const incidents = useIncidents();

  const { data: cables } = useSuspenseQuery({
    queryKey: ['cables'],
    queryFn: async (): Promise<Cable[]> => {
      return await loadCables();
    },
  });

  return (
    <>
      {cables.map((cable) => (
        <div key={cable.id}>
          {cable.segments
            .filter((segment) => !segment.hidden)
            .map((segment) => (
              <InteractivePolyline 
                key={segment.id} 
                cable={cable} 
                segment={segment} 
                incidents={incidents}
              />
            ))}
          {cable.equipments?.map((equip) => (
            <Marker
              key={equip.id}
              position={[equip.coordinate[1], equip.coordinate[0]]}
              icon={whiteDotIcon}
              title={equip.name}
            >
              <Popup>{equip.name}</Popup>
            </Marker>
          ))}
        </div>
      ))}
    </>
  );
}