import type { StyleSpecification } from 'maplibre-gl';

const TILE_ORIGIN = 'https://static.lb.exptech.dev/api/v1/map';

const MAP_BACKGROUND = '#1f2025';
const MAP_LAND = '#3F4045';

/**
 * Land fills first, then borders, so the global land fill can no longer
 * cover the county borders.
 *
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
      paint: { 'background-color': MAP_BACKGROUND },
    },
    {
      'id': 'global',
      'type': 'fill',
      'source': 'map',
      'source-layer': 'global',
      'paint': { 'fill-color': MAP_LAND },
    },
    {
      'id': 'county',
      'type': 'fill',
      'source': 'map',
      'source-layer': 'city',
      'paint': { 'fill-color': MAP_LAND },
    },
    {
      'id': 'town',
      'type': 'fill',
      'source': 'map',
      'source-layer': 'town',
      'paint': { 'fill-color': 'transparent' },
    },
    {
      'id': 'county-outline',
      'type': 'line',
      'source': 'map',
      'source-layer': 'city',
      'paint': { 'line-color': '#a9b4bc' },
    },
  ],
};
