import type { StyleSpecification } from 'maplibre-gl';

// Keep map style object identity stable to avoid style reload flicker on re-renders
export const BASE_MAP_STYLE: StyleSpecification = {
  version: 8,
  name: 'ExpTech Studio',
  sources: {
    map: {
      type: 'vector',
      url: 'https://lb.exptech.dev/api/v1/map/tiles/tiles.json',
    },
  },
  sprite: '',
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: { 'background-color': '#1f2025' },
    },
    {
      'id': 'county',
      'type': 'fill',
      'source': 'map',
      'source-layer': 'city',
      'paint': { 'fill-color': '#3F4045' },
    },
    {
      'id': 'county-outline',
      'type': 'line',
      'source': 'map',
      'source-layer': 'city',
      'paint': { 'line-color': '#a9b4bc' },
    },
    {
      'id': 'town',
      'type': 'fill',
      'source': 'map',
      'source-layer': 'town',
      'paint': { 'fill-color': 'transparent' },
    },
    {
      'id': 'global',
      'type': 'fill',
      'source': 'map',
      'source-layer': 'global',
      'paint': {
        'fill-color': '#3F4045',
        'fill-opacity': 1,
      },
    },
  ],
};
