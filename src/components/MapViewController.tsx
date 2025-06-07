import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';

interface MapViewControllerProps {
  center: LatLngExpression;
}

export default function MapViewController({ center }: MapViewControllerProps) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);

  return null;
} 