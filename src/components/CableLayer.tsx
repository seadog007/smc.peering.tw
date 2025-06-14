import { useState, useEffect } from 'react';
import { Polyline, Marker, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
import type { LatLngExpression, PopupEvent } from 'leaflet';

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
  segments: Segment[];
  equipments?: Equipment[];
}

// A new component to handle the dynamic popup content
function InteractivePolyline({ cable, segment }: { cable: Cable; segment: Segment }) {
    const [clickedLatLng, setClickedLatLng] = useState<string | null>(null);

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
            color={segment.color || 'blue'}
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
  const [cables, setCables] = useState<Cable[]>([]);

  useEffect(() => {
    loadCables().then(setCables);
  }, []);

  return (
    <>
      {cables.map((cable) => (
        <div key={cable.id}>
          {cable.segments
            .filter((segment) => !segment.hidden)
            .map((segment) => (
              <InteractivePolyline key={segment.id} cable={cable} segment={segment} />
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