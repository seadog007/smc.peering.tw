import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
import type { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import landingPoints from '../data/landing-points.json';
import CableLayer from './CableLayer';
import MapViewController from './MapViewController';
import './Map.css';

// Create a custom white dot icon
const whiteDotIcon = new Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iNiIgZmlsbD0id2hpdGUiLz48L3N2Zz4=',
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});

interface MapProps {
  center: LatLngExpression;
}

export default function Map({ center }: MapProps) {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <MapContainer 
        center={center} // Center of Taiwan
        zoom={7} // Zoom level to show whole Taiwan
        style={{ height: '100%', width: '100%' }}
        zoomControl={false} // Disable zoom controls
        dragging={true} // Disable dragging
        touchZoom={false} // Disable touch zoom
        doubleClickZoom={false} // Disable double click zoom
        scrollWheelZoom={true} // Disable scroll wheel zoom
        boxZoom={false} // Disable box zoom
        keyboard={false} // Disable keyboard navigation
        zoomSnap={0.1} // Snap to 0.1 zoom levels
      >
        <MapViewController center={center} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <CableLayer />
        
        {/* Render landing points */}
        {landingPoints.map((point) => (
          <Marker
            key={point.id}
            position={[point.coordinates[1], point.coordinates[0]]}
            icon={whiteDotIcon}
            title={point.name}
          >
            <Popup>{point.name}</Popup>
          </Marker>
        ))}

      </MapContainer>
    </div>
  );
} 