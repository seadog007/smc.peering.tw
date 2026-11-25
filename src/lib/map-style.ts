import type { StyleSpecification } from 'maplibre-gl';

const TILE_ORIGIN = 'https://static.lb.exptech.dev/api/v1/map';

/**
 * Tiles are addressed directly instead of through tiles.json, which saves a
 * round trip before the first tile request. The source stops at z9 (higher
 * levels add no detail) and MapLibre overzooms past it.
 */
export const BASE_MAP_STYLE: StyleSpecification = {
  version: 8,
  name: 'ExpTech Studio',
  sources: {
    map: {
      type: 'vector',
      tiles: [`${TILE_ORIGIN}/tiles/{z}/{x}/{y}.pbf`],
      minzoom: 0,
      maxzoom: 9,
    },
  },
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
