import { forwardRef, useEffect, useMemo, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import { useQuery } from '@tanstack/react-query';

import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';
import type { Feature, FeatureCollection, LineString } from 'geojson';
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
  const failedPathsArray = Array.from(failedPaths).map((p) => JSON.parse(p) as string[]);

  // 扁平化處理
  const flatAll = paths.flat();
  const flatFailed = failedPathsArray.flat();

  // 找出所有出現在 failed path 中的節點
  const failedNodesSet = new Set(flatFailed);

  const out = [];
  for (const node of failedNodesSet) {
    const countAll = flatAll.filter((n) => n === node).length;
    const countFailed = flatFailed.filter((n) => n === node).length;

    if (countAll === countFailed) {
      out.push(node);
    }
  }

  return out.sort();
}

function getSegmentStatus(segment: Segment, cable: Cable, incidents: Incident[]) {
  const activeIncidents = incidents.filter((incident) =>
    incident.cableid === cable.id && (!incident.resolved_at || incident.resolved_at === ''),
  );

  if (activeIncidents.length > 0 && cable.available_path) {
    const affectedSegments = activeIncidents.map((incident) => incident.segment);
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

  const activeIncidents = incidents.filter((incident) =>
    incident.cableid === cable.id && (!incident.resolved_at || incident.resolved_at === ''),
  );

  if (activeIncidents.length > 0 && cable.available_path) {
    const affectedSegments = activeIncidents.map((incident) => incident.segment);
    const brokenSegments = markBroken(cable.available_path, affectedSegments);

    if (brokenSegments.includes(segment.id)) {
      return '#ff0000';
    }
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
  cableFilter?: 'all' | 'normal' | 'broken';
}

const CableLayer = forwardRef<HTMLDivElement, CableLayerProps>(({ map, cableFilter = 'all' }) => {
  const layersAdded = useRef<boolean>(false);
  const markersAdded = useRef<Set<string>>(new Set());
  const popupRef = useRef<maplibregl.Popup | null>(null);

  const { data: incidents, isLoading: incidentsLoading } = useQuery({ queryKey: ['incidents'], queryFn: async () => {
    try {
      const res = await fetch('/data/incidents.json');
      if (!res.ok) {
        throw new Error(`Failed to fetch incidents: ${res.status}`);
      }

      return (await res.json()) as Incident[];
    }
    catch (error) {
      console.error('Error loading data:', error);
    }
  },
  });

  const { data: cables, isLoading: cablesLoading } = useQuery({ queryKey: ['cables'], queryFn: async () => {
    const cablesData = await loadCables();
    return cablesData;
  },
  });

  const isLoading = useMemo(() => {
    return incidentsLoading || cablesLoading;
  }, [incidentsLoading, cablesLoading]);

  useEffect(() => {
    if (!map || isLoading || cables?.length === 0) return;

    const allFeatures: Feature<LineString>[] = [];

    cables?.forEach((cable) => {
      cable.segments
        .filter((segment) => !segment.hidden)
        .forEach((segment) => {
          const status = getSegmentStatus(segment, cable, incidents || []);
          const color = getSegmentColor(segment, cable, incidents || []);

          const shouldShow = cableFilter === 'all'
            || (cableFilter === 'normal' && status === 'normal')
            || (cableFilter === 'broken' && status === 'broken');

          if (shouldShow) {
            if (status === 'broken') {
              allFeatures.push({
                type: 'Feature',
                properties: {
                  cableName: cable.name,
                  segmentId: segment.id,
                  cableId: cable.id,
                  color: '#ff0000',
                  status: 'broken-glow',
                  lineWidth: 15,
                  lineBlur: 12,
                  lineOpacity: 0.4,
                },
                geometry: {
                  type: 'LineString',
                  coordinates: segment.coordinates,
                },
              } as Feature<LineString>);
            }

            allFeatures.push({
              type: 'Feature',
              properties: {
                cableName: cable.name,
                segmentId: segment.id,
                cableId: cable.id,
                color,
                status,
                lineWidth: status === 'broken' ? 3 : 1.5,
                lineBlur: 0,
                lineOpacity: 1,
              },
              geometry: {
                type: 'LineString',
                coordinates: segment.coordinates,
              },
            } as Feature<LineString>);
          }
        });
    });

    const sourceId = 'all-cables-source';
    const source = map.getSource(sourceId);

    if (source) {
      (source as GeoJSONSource).setData({
        type: 'FeatureCollection',
        features: allFeatures,
      } as FeatureCollection<LineString>);
    }
    else {
      map.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: allFeatures,
        } as FeatureCollection<LineString>,
      });
    }

    if (!layersAdded.current && map.getSource(sourceId)) {
      map.addLayer({
        id: 'cables-layer',
        type: 'line',
        source: sourceId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['get', 'lineWidth'],
          'line-blur': ['get', 'lineBlur'],
          'line-opacity': ['get', 'lineOpacity'],
        },
      }, 'landing-marker-layer');

      map.on('click', 'cables-layer', (e) => {
        const feature = e.features?.find((f) => f.properties?.status !== 'broken-glow');
        if (!feature) return;

        const coordinates = e.lngLat;
        const properties = feature.properties;

        if (popupRef.current) {
          popupRef.current.remove();
        }

        popupRef.current = new maplibregl.Popup({
          offset: 25,
          closeButton: true,
          closeOnClick: false,
          className: 'landing-point-popup',
          maxWidth: '250px',
        })
          .setLngLat(coordinates)
          .setHTML(`
            <div style="padding: 10px 12px;">
              <h3 style="margin: 0 0 8px 0; padding-right: 20px; color: #48A9FF; font-size: 14px; font-weight: bold; word-wrap: break-word;">
                ${properties?.cableName}
              </h3>
              <p style="margin: 0 0 4px 0; color: #a9b4bc; font-size: 12px;">
                Segment: ${properties?.segmentId}
              </p>
              <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #3F4045;">
                <p style="margin: 0; color: #6b7280; font-size: 11px; white-space: nowrap;">
                  ${coordinates.lat.toFixed(4)}°N, ${coordinates.lng.toFixed(4)}°E
                </p>
              </div>
            </div>
          `)
          .addTo(map);
      });

      map.on('mouseenter', 'cables-layer', () => {
        map.getCanvas().style.cursor = 'pointer';
      });

      map.on('mouseleave', 'cables-layer', () => {
        map.getCanvas().style.cursor = '';
      });

      layersAdded.current = true;
    }

    cables?.forEach((cable) => {
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
            rotationAlignment: 'viewport',
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
              className: 'landing-point-popup',
              maxWidth: '250px',
            })
              .setLngLat(equip.coordinate)
              .setHTML(`
                <div style="padding: 10px 12px;">
                  <h3 style="margin: 0 0 8px 0; padding-right: 20px; color: #48A9FF; font-size: 14px; font-weight: bold; word-wrap: break-word;">
                    ${equip.name}
                  </h3>
                  <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #3F4045;">
                    <p style="margin: 0; color: #6b7280; font-size: 11px; white-space: nowrap;">
                      ${equip.coordinate[1].toFixed(4)}°N, ${equip.coordinate[0].toFixed(4)}°E
                    </p>
                  </div>
                </div>
              `)
              .addTo(map);
          });

          markersAdded.current.add(markerId);
        }
      });
    });

    return () => {
      if (popupRef.current) {
        popupRef.current.remove();
      }
    };
  }, [map, cables, incidents, isLoading, cableFilter]);

  return null;
});

CableLayer.displayName = 'CableLayer';

export default CableLayer;
