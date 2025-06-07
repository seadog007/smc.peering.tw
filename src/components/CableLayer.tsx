import { useEffect, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import type { LatLngTuple } from 'leaflet';

interface CableSegment {
  id: string;
  hidden?: boolean;
  coordinates: [number, number][];
}

interface Cable {
  id: string;
  name: string;
  segments: CableSegment[];
}

export default function CableLayer() {
  const map = useMap();
  const [cables, setCables] = useState<Cable[]>([]);

  useEffect(() => {
    const loadCables = async () => {
      console.log('Starting to load cable files...');
      try {
        // Dynamically import all JSON files from the cables directory
        const cableFiles = import.meta.glob<{ default: Cable }>('/src/data/cables/*.json');
        console.log('Found cable files:', Object.keys(cableFiles));
        
        const loadedCables: Cable[] = [];

        for (const path in cableFiles) {
          console.log('Loading cable file:', path);
          const module = await cableFiles[path]();
          console.log('Loaded cable data:', module.default);
          loadedCables.push(module.default);
        }

        console.log('All cables loaded:', loadedCables);
        setCables(loadedCables);
      } catch (error) {
        console.error('Error loading cable data:', error);
      }
    };

    loadCables();
  }, []);

  useEffect(() => {
    console.log('Drawing effect triggered. Map:', !!map, 'Cables:', cables.length);
    
    if (!map || cables.length === 0) {
      console.log('Skipping drawing - map or cables not ready');
      return;
    }

    // Create a layer group for all cables
    const cableLayer = L.layerGroup().addTo(map);
    console.log('Created cable layer');

    // Draw each cable
    cables.forEach(cable => {
      console.log('Drawing cable:', cable.name, 'with', cable.segments.length, 'segments');
      cable.segments.forEach(segment => {
        // Skip hidden segments
        if (segment.hidden) {
          console.log('Skipping hidden segment:', segment.id);
          return;
        }

        console.log('Drawing segment:', segment.id, 'with', segment.coordinates.length, 'points');
        // Swap coordinates from [longitude, latitude] to [latitude, longitude]
        const leafletCoordinates = segment.coordinates.map(([lon, lat]) => [lat, lon] as LatLngTuple);
        const polyline = L.polyline(leafletCoordinates, {
          color: '#4a90e2',
          weight: 2,
          opacity: 0.8,
        }).bindPopup(`<b>${cable.name}</b><br>Segment: ${segment.id}`);

        cableLayer.addLayer(polyline);
      });
    });

    console.log('Finished drawing all cables');

    // Cleanup function
    return () => {
      console.log('Cleaning up cable layer');
      map.removeLayer(cableLayer);
    };
  }, [map, cables]);

  return null;
} 