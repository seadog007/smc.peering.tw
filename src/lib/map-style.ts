import type { LayerProps } from '@vis.gl/react-maplibre';
import type { ExpressionSpecification, StyleSpecification } from 'maplibre-gl';

const TILE_ORIGIN = 'https://static.lb.exptech.dev/api/v1/map';

const MAP_BACKGROUND = '#1f2025';
const MAP_LAND = '#3F4045';

export const POINT_SOURCE_ID = 'points';

export const POINT_HIT_LAYER_ID = 'points-hit';

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

/** Scales a pixel width with zoom; equals `width` at the default zoom (5.5). */
function byZoom(width: number | ExpressionSpecification): ExpressionSpecification {
  return [
    'interpolate', ['exponential', 1.4], ['zoom'],
    3, ['*', width, 0.7],
    5.5, width,
    10, ['*', width, 2],
  ];
}

const HOVERED: ExpressionSpecification = ['boolean', ['feature-state', 'hover'], false];

// Zoom must stay the outermost expression, so the hover bump goes inside it.
const POINT_RADIUS = byZoom(['+', 6, ['case', HOVERED, 1, 0]]);

/** Equipment and landing-point layers. Rendered inside the `points` GeoJSON source. */
export const POINT_LAYERS: LayerProps[] = [
  {
    id: 'equipment-points',
    type: 'circle',
    filter: ['==', ['get', 'kind'], 'equipment'],
    paint: {
      'circle-color': '#ffffff',
      'circle-radius': POINT_RADIUS,
      'circle-stroke-color': MAP_BACKGROUND,
      'circle-stroke-width': 1,
    },
  },
  {
    id: 'landing-points',
    type: 'circle',
    filter: ['==', ['get', 'kind'], 'landing'],
    paint: {
      'circle-color': '#2563eb',
      'circle-radius': POINT_RADIUS,
      'circle-stroke-color': 'rgba(255, 255, 255, 0.95)',
      'circle-stroke-width': 2,
    },
  },
  {
    // Invisible tap target larger than the dots, for touch screens.
    id: POINT_HIT_LAYER_ID,
    type: 'circle',
    paint: {
      'circle-color': '#000000',
      'circle-radius': 14,
      'circle-opacity': 0,
    },
  },
];
