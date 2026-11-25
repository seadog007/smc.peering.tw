import type { StyleSpecification } from 'maplibre-gl';

const TILE_ORIGIN = 'https://static.lb.exptech.dev/api/v1/map';

const MAP_BACKGROUND = '#1f2025';
const MAP_LAND = '#3F4045';

/**
 * ExpTech base map with the palette and layer order shared by DPIP and TREM-Lite:
 * land fills, faint township borders, then county borders on top. No hillshade:
 * it costs an extra GPU pass per tile and DEM downloads for little value here.
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
      // Township mesh only once the island is large enough for it to read as
      // detail instead of noise; below minzoom the layer is not laid out at all.
      'id': 'town-outline',
      'type': 'line',
      'source': 'map',
      'source-layer': 'town',
      'minzoom': 7,
      'paint': {
        'line-color': '#6A6B72',
        'line-width': 0.4,
        'line-opacity': ['interpolate', ['linear'], ['zoom'], 7, 0, 8, 0.7],
      },
    },
    {
      'id': 'county-outline',
      'type': 'line',
      'source': 'map',
      'source-layer': 'city',
      'paint': {
        'line-color': '#a9b4bc',
        'line-width': ['interpolate', ['linear'], ['zoom'], 3, 0.5, 6, 1],
      },
    },
  ],
};
