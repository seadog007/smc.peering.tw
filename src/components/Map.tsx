import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import type { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';
import landingPoints from '../data/landing-points.json';
import CableLayer from './CableLayer';

// Create a custom white dot icon
const whiteDotIcon = new Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iNiIgZmlsbD0id2hpdGUiLz48L3N2Zz4=',
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});

interface MapProps {
  center: LatLngExpression;
  markers: Array<{
    position: LatLngExpression;
    title: string;
    customIcon?: Icon;
  }>;
  lines: Array<{
    positions: LatLngExpression[];
    color: string;
  }>;
}

function MapController({ center }: { center: LatLngExpression }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center);
    // Disable all map interactions
    map.dragging.disable();
    map.touchZoom.disable();
    map.doubleClickZoom.disable();
    map.scrollWheelZoom.disable();
    map.boxZoom.disable();
    map.keyboard.disable();
  }, [center, map]);

  return null;
}

export default function Map({ center, markers, lines }: MapProps) {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <MapContainer 
        center={[23.5, 121]} // Center of Taiwan
        zoom={7} // Zoom level to show whole Taiwan
        style={{ height: '100%', width: '100%' }}
        zoomControl={false} // Disable zoom controls
        dragging={false} // Disable dragging
        touchZoom={false} // Disable touch zoom
        doubleClickZoom={false} // Disable double click zoom
        scrollWheelZoom={false} // Disable scroll wheel zoom
        boxZoom={false} // Disable box zoom
        keyboard={false} // Disable keyboard navigation
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <MapController center={[23.5, 121]} />
        <CableLayer />
        
        {/* Render landing points */}
        {landingPoints.map((point) => (
          <Marker
            key={point.id}
            position={[point.coordinates[1], point.coordinates[0]]}
            icon={whiteDotIcon}
            title={point.name}
          />
        ))}
        
        {markers.map((marker, index) => (
          <Marker
            key={index}
            position={marker.position}
            icon={marker.customIcon || whiteDotIcon}
            title={marker.title}
          />
        ))}
        
        {lines.map((line, index) => (
          <Polyline
            key={index}
            positions={line.positions}
            pathOptions={{ color: line.color }}
          />
        ))}
      </MapContainer>
    </div>
  );
} 