import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import landingPoints from '../data/landing-points.json';
import CableLayer from './CableLayer';
import './Map.css';

export default function Map() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const cableLayerRef = useRef<any>(null);

  useEffect(() => {
    if (map.current) return;
    if (!mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          map: {
            type: 'vector',
            url: 'https://lb.exptech.dev/api/v1/map/tiles/tiles.json',
          },
        },
        layers: [
          {
            id: 'background',
            type: 'background',
            paint: {
              'background-color': '#1f2025',
            },
          },
          {
            'id': 'county',
            'type': 'fill',
            'source': 'map',
            'source-layer': 'city',
            'paint': {
              'fill-color':'#3F4045',
              'fill-opacity': 1,
            },
          },
          {
            'id': 'town',
            'type': 'fill',
            'source': 'map',
            'source-layer': 'town',
            'paint': {
              'fill-color':  '#3F4045',
              'fill-opacity': 1,
            },
          },
          {
            'id': 'county-outline',
            'source': 'map',
            'source-layer': 'city',
            'type': 'line',
            'paint': {
              'line-color':  '#a9b4bc',
            },
          },
          {
            'id': 'global',
            'type': 'fill',
            'source': 'map',
            'source-layer': 'global',
            'paint': {
              'fill-color':  '#3F4045',
              'fill-opacity': 1,
            },
          }
        ]
      },
      center: [121.6, 23.5],
      zoom: 6.8,
      minZoom: 4,
      maxZoom: 12,
      doubleClickZoom: false,
      keyboard: false,
      attributionControl: false
    });

    // Add navigation controls
    // map.current.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
  }, []);

  useEffect(() => {
    if (map.current) {
      map.current.fitBounds([[118.0, 21.2], [124.0, 25.8]],{ padding: 20, duration: 0 });
    }
  }, []);

  useEffect(() => {
    if (!map.current) return;

    map.current.on('load', () => {
      landingPoints.forEach((point:{id:string, name:string, coordinates:[number, number]}) => {
        const el = document.createElement('div');
        el.className = 'landing-point-marker';
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
          .setLngLat([point.coordinates[0], point.coordinates[1]])
          .addTo(map.current!);

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          
          new maplibregl.Popup({
            offset: 25,
            closeButton: true,
            closeOnClick: false,
            className: 'landing-point-popup'
          })
          .setLngLat([point.coordinates[0], point.coordinates[1]])
          .setHTML(`
            <div style="padding: 8px 12px; min-width: 120px;">
              <h3 style="margin: 0 0 8px 0; color: #48A9FF; font-size: 14px; font-weight: bold;">
                ${point.name}
              </h3>
              <p style="margin: 0; color: #a9b4bc; font-size: 12px;">
                海纜登陸點
              </p>
              <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #3F4045;">
                <p style="margin: 0; color: #6b7280; font-size: 11px;">
                  ${point.coordinates[1].toFixed(4)}°N, ${point.coordinates[0].toFixed(4)}°E
                </p>
              </div>
            </div>
          `)
          .addTo(map.current!);
        });
      });
    });
  }, []);


  return (
    <div style={{ width: '100%', height: '100%' }}>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
      <CableLayer ref={cableLayerRef} map={map.current} />
    </div>
  );
} 