import { useState, useEffect, useRef, forwardRef } from 'react';
import maplibregl from 'maplibre-gl';
import type { Map as MapLibreMap } from 'maplibre-gl';
import incidentsData from '../data/incidents.json';
import './CableLayer.css';

interface Segment {
  id: string;
  hidden?: boolean;
  coordinates: [number, number][];
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

interface Incident {
  date: string;
  status: string;
  cableid: string;
  segment: string;
  title: string;
  description: string;
  resolved_at: string;
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

function getSegmentStatus(segment: Segment, cable: Cable, incidents: Incident[]) {
  const activeIncidents = incidents.filter(incident => 
    incident.cableid === cable.id && !incident.resolved_at
  );

  if (activeIncidents.length > 0 && cable.available_path) {
    const affectedSegments = activeIncidents.map(incident => incident.segment);
    
    const brokenSegments = markBroken(cable.available_path, affectedSegments);
    
    if (brokenSegments.includes(segment.id)) {
      return 'broken';
    }
  }

  return 'normal';
}

function getSegmentColor(segment: Segment, cable: Cable, incidents: Incident[]) {
  if (segment.color) {
    return segment.color;
  }

  const status = getSegmentStatus(segment, cable, incidents);
  
  if (status === 'broken') {
    return '#ff0000';
  }
  
  return cable.color || '#48A9FF';
}

async function loadCables(): Promise<Cable[]> {
  const modules = import.meta.glob('../data/cables/*.json');
  const cablePromises = Object.values(modules).map(async (loader) => {
    const module = await loader();
    return (module as { default: Cable }).default;
  });
  return Promise.all(cablePromises);
}

interface CableLayerProps {
  map: MapLibreMap | null;
}

const CableLayer = forwardRef<any, CableLayerProps>(({ map }) => {
  const [cables, setCables] = useState<Cable[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const sourcesAdded = useRef<Set<string>>(new Set());
  const layersAdded = useRef<Set<string>>(new Set());
  const markersAdded = useRef<Set<string>>(new Set());
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIncidents(incidentsData as Incident[]);

        const cablesData = await loadCables();
        setCables(cablesData);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    if (!map || isLoading || cables.length === 0) return;
    
    const normalCableLayers: string[] = [];

    cables.forEach((cable) => {
      cable.segments
        .filter((segment) => !segment.hidden)
        .forEach((segment) => {
          const sourceId = `cable-${cable.id}-segment-${segment.id}`;
          const layerId = `cable-layer-${cable.id}-segment-${segment.id}`;

          if (!sourcesAdded.current.has(sourceId)) {
            const coordinates = segment.coordinates;
            
            map.addSource(sourceId, {
              type: 'geojson',
              data: {
                type: 'Feature',
                properties: {
                  cableName: cable.name,
                  segmentId: segment.id,
                  cableId: cable.id
                },
                geometry: {
                  type: 'LineString',
                  coordinates
                }
              }
            });

            sourcesAdded.current.add(sourceId);
          }

          if (!layersAdded.current.has(layerId)) {
            const status = getSegmentStatus(segment, cable, incidents);
            const color = getSegmentColor(segment, cable, incidents);
            
            map.addLayer({
              id: layerId,
              type: 'line',
              source: sourceId,
              layout: {
                'line-join': 'round',
                'line-cap': 'round'
              },
              paint: {
                'line-color': color,
                'line-width': status === 'broken' ? 1.5 : 2,
                'line-opacity': status === 'broken' ? 0.3 : 1
              }
            });

            layersAdded.current.add(layerId);
            
            if (status === 'normal') {
              normalCableLayers.push(layerId);
            }

            map.on('click', layerId, (e) => {
              const coordinates = e.lngLat;
              const properties = e.features?.[0]?.properties;
              
              if (popupRef.current) {
                popupRef.current.remove();
              }

              popupRef.current = new maplibregl.Popup()
                .setLngLat(coordinates)
                .setHTML(`
                  <b>${properties?.cableName}</b><br/>
                  Segment: ${properties?.segmentId}<br/>
                  Lat: ${coordinates.lat.toFixed(5)}, Lng: ${coordinates.lng.toFixed(5)}
                `)
                .addTo(map);
            });

            map.on('mouseenter', layerId, () => {
              map.getCanvas().style.cursor = 'pointer';
            });

            map.on('mouseleave', layerId, () => {
              map.getCanvas().style.cursor = '';
            });
          }
        });

      cable.equipments?.forEach((equip) => {
        const markerId = `marker-${equip.id}`;
        
        if (!markersAdded.current.has(markerId)) {
          const el = document.createElement('div');
          el.className = 'equipment-marker landing-point-marker';
          el.style.width = '12px';
          el.style.height = '12px';
          el.style.borderRadius = '50%';
          el.style.backgroundColor = '#ffffff';
          el.style.boxShadow = '0 0 15px rgba(255, 255, 255, 0.6)';
          el.style.cursor = 'pointer';

          new maplibregl.Marker({ 
            element: el, 
            anchor: 'center',
            pitchAlignment: 'viewport',
            rotationAlignment: 'viewport'
          })
            .setLngLat(equip.coordinate)
            .addTo(map);

          el.addEventListener('click', () => {
            if (popupRef.current) {
              popupRef.current.remove();
            }

            popupRef.current = new maplibregl.Popup({
              offset: 25,
              closeButton: true,
              closeOnClick: false,
              className: 'landing-point-popup'
            })
              .setLngLat(equip.coordinate)
              .setHTML(`
                <div style="padding: 8px 12px; min-width: 120px;">
                  <h3 style="margin: 0; color: #48A9FF; font-size: 14px; font-weight: bold;">
                    ${equip.name}
                  </h3>
                </div>
              `)
              .addTo(map);
          });

          markersAdded.current.add(markerId);
        }
      });
    });
    
    if (normalCableLayers.length > 0) {
      let startTime: number | null = null;
      
      const animate = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const progress = (timestamp - startTime) / 3000;
        
        const opacity = 0.7 + 0.3 * Math.sin(progress * Math.PI * 2);
        
        normalCableLayers.forEach(layerId => {
          if (map.getLayer(layerId)) {
            map.setPaintProperty(layerId, 'line-opacity', opacity);
          }
        });
        
        animationFrameRef.current = requestAnimationFrame(animate);
      };
      
      animationFrameRef.current = requestAnimationFrame(animate);
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [map, cables, incidents, isLoading]);

  return null;
});

CableLayer.displayName = 'CableLayer';

export default CableLayer;