import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from 'react-i18next';
import { useQuery } from "@tanstack/react-query";
import { useMediaQuery } from "usehooks-ts";
import { Map, Source, Layer, Popup } from "@vis.gl/react-maplibre";

import { cableNames, getCableServiceStart } from '@/lib/cable-names';
import { cablesQueryOptions, isCableSegmentVisible } from '@/lib/cables';
import { incidentsQueryOptions, newestIncidentsFirst } from '@/lib/incidents';
import {
  BASE_MAP_STYLE,
  CABLE_HIT_LAYER_ID,
  CABLE_LAYERS,
  CABLE_SOURCE_ID,
  POINT_HIT_LAYER_ID,
  POINT_LAYERS,
  POINT_SOURCE_ID,
} from '@/lib/map-style';

import type { MapLayerMouseEvent, MapRef } from "@vis.gl/react-maplibre";
import type { Feature, FeatureCollection, LineString, Point } from "geojson";
import type { CableFilter } from '@/lib/cables';
import {
  getSegmentColor,
  getSegmentStatus,
  isBuildingSegment,
} from "@/lib/cable-status";
import "maplibre-gl/dist/maplibre-gl.css";
import landingPointsJson from "@/data/landing-points.json" with { type: "json" };

interface LandingPoint {
  id: string;
  name: string;
  coordinates: [number, number];
}

type PointKind = "equipment" | "landing";

interface PointProperties {
  key: string;
  kind: PointKind;
  name: string;
  // Exact position; geometry read back from rendered tiles is quantised.
  lng: number;
  lat: number;
}

interface CableProperties {
  cableId: string;
  cableName: string;
  segmentId: string;
  color: string;
  status: ReturnType<typeof getSegmentStatus>;
  lineWidth: number;
  building: boolean;
  // Set on the cable previewed from search. Preview changes the visible set
  // anyway, so it rides along with that data update instead of feature-state.
  preview?: boolean;
}

interface CableSelection {
  kind: "cable";
  cableId: string;
  cableName: string;
  segmentId: string;
  coordinates: [number, number];
}

interface PointSelection {
  kind: PointKind;
  name: string;
  coordinates: [number, number];
}

type Selection = CableSelection | PointSelection;

interface FeatureRef {
  source: string;
  id: string | number;
}

const LANDING_POINT_FEATURES: Feature<Point, PointProperties>[] = (
  landingPointsJson as unknown as LandingPoint[]
).map((lp) => ({
  type: "Feature",
  properties: {
    key: `lp-${lp.id}`,
    kind: "landing",
    name: lp.name,
    lng: lp.coordinates[0],
    lat: lp.coordinates[1],
  },
  geometry: { type: "Point", coordinates: lp.coordinates },
}));

const INTERACTIVE_LAYER_IDS = [POINT_HIT_LAYER_ID, CABLE_HIT_LAYER_ID];

// Phones report up to 3x; drawing past 2x costs GPU time without a visible gain.
const PIXEL_RATIO = window.devicePixelRatio > 2 ? 2 : undefined;

interface MapWithCablesProps {
  cableFilter?: CableFilter;
  isolatedCableId?: string | null;
  previewCableId?: string | null;
}

function MapWithCables({
  cableFilter = "all",
  isolatedCableId = null,
  previewCableId = null,
}: MapWithCablesProps) {
  const { t } = useTranslation();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const mapRef = useRef<MapRef>(null);
  const hoveredRef = useRef<FeatureRef | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);

  const { data: incidents } = useQuery({
    ...incidentsQueryOptions,
    select: newestIncidentsFirst,
  });

  const { data: cables } = useQuery(cablesQueryOptions);

  const setHovered = useCallback((next: FeatureRef | null) => {
    const map = mapRef.current?.getMap();
    const prev = hoveredRef.current;
    if (!map || (prev?.source === next?.source && prev?.id === next?.id)) return;

    if (prev && map.getSource(prev.source)) map.setFeatureState(prev, { hover: false });
    if (next) map.setFeatureState(next, { hover: true });
    hoveredRef.current = next;
    map.getCanvas().style.cursor = next ? "pointer" : "";
  }, []);

  useEffect(() => {
    setSelection((current) => (current?.kind === "landing" ? current : null));
    setHovered(null);
  }, [isolatedCableId, cableFilter, setHovered]);

  useEffect(() => {
    if (previewCableId) setHovered(null);
  }, [previewCableId, setHovered]);

  // Status depends only on the data, so it is resolved once per load rather
  // than on every filter, isolation, or preview change.
  const segmentFeatures = useMemo(() => {
    if (!cables || !incidents) return [];

    return cables.flatMap((cable) =>
      cable.segments
        .filter((segment) => !segment.hidden)
        .map((segment) => {
          const status = getSegmentStatus(segment, cable, incidents);
          const feature: Feature<LineString, CableProperties> = {
            type: "Feature",
            properties: {
              cableId: cable.id,
              cableName: cable.name,
              segmentId: segment.id,
              color: getSegmentColor(segment, cable, incidents),
              status,
              lineWidth: status === "normal" ? 1.5 : 3,
              building: isBuildingSegment(segment, cable),
            },
            geometry: { type: "LineString", coordinates: segment.coordinates },
          };
          return { feature, segment };
        }),
    );
  }, [cables, incidents]);

  const cableData = useMemo<FeatureCollection<LineString, CableProperties>>(() => ({
    type: "FeatureCollection",
    features: segmentFeatures
      .filter(({ feature, segment }) => isCableSegmentVisible(
        feature.properties.cableId,
        segment,
        feature.properties.status,
        cableFilter,
        isolatedCableId,
        previewCableId,
      ))
      .map(({ feature }) => (feature.properties.cableId === previewCableId
        ? { ...feature, properties: { ...feature.properties, preview: true } }
        : feature)),
  }), [segmentFeatures, cableFilter, isolatedCableId, previewCableId]);

  const pointData = useMemo<FeatureCollection<Point, PointProperties>>(() => {
    const equipment = (cables ?? [])
      .filter((cable) => !isolatedCableId || cable.id === isolatedCableId || cable.id === previewCableId)
      .flatMap((cable) => cable.equipments ?? [])
      .map((equip): Feature<Point, PointProperties> => ({
        type: "Feature",
        properties: {
          key: `eq-${equip.id}`,
          kind: "equipment",
          name: equip.name,
          lng: equip.coordinate[0],
          lat: equip.coordinate[1],
        },
        geometry: { type: "Point", coordinates: equip.coordinate },
      }));

    // Landing points last so they draw over equipment, as the markers did.
    return { type: "FeatureCollection", features: [...equipment, ...LANDING_POINT_FEATURES] };
  }, [cables, isolatedCableId, previewCableId]);

  const handleMouseMove = useCallback((event: MapLayerMouseEvent) => {
    const feature = event.features?.[0];
    setHovered(feature?.id === undefined ? null : { source: feature.source, id: feature.id });
  }, [setHovered]);

  const handleMouseLeave = useCallback(() => setHovered(null), [setHovered]);

  const handleClick = useCallback((event: MapLayerMouseEvent) => {
    const feature = event.features?.[0];
    if (!feature) return;

    if (feature.source === POINT_SOURCE_ID) {
      const point = feature.properties as PointProperties;
      setSelection({ kind: point.kind, name: point.name, coordinates: [point.lng, point.lat] });
      return;
    }

    const cable = feature.properties as CableProperties;
    setSelection({
      kind: "cable",
      cableId: cable.cableId,
      cableName: cable.cableName,
      segmentId: cable.segmentId,
      coordinates: [event.lngLat.lng, event.lngLat.lat],
    });
  }, []);

  return (
    <Map
      ref={mapRef}
      initialViewState={
        isMobile
          ? {
            longitude: 121,
            latitude: 22.5,
            zoom: 5.5,
          }
          : {
            longitude: 125,
            latitude: 23.5,
            zoom: 5.5,
          }
      }
      style={{ width: "100%", height: "100%" }}
      mapStyle={BASE_MAP_STYLE}
      pixelRatio={PIXEL_RATIO}
      interactiveLayerIds={INTERACTIVE_LAYER_IDS}
      doubleClickZoom={false}
      keyboard={false}
      attributionControl={false}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      <Source id={CABLE_SOURCE_ID} type="geojson" data={cableData} promoteId="cableId">
        {CABLE_LAYERS.map((layer) => <Layer key={layer.id} {...layer} />)}
      </Source>

      <Source id={POINT_SOURCE_ID} type="geojson" data={pointData} promoteId="key">
        {POINT_LAYERS.map((layer) => <Layer key={layer.id} {...layer} />)}
      </Source>

      {selection?.kind === "cable" && (
        <Popup
          longitude={selection.coordinates[0]}
          latitude={selection.coordinates[1]}
          onClose={() => setSelection(null)}
          closeButton={true}
          closeOnClick={false}
          maxWidth="min(340px, calc(100vw - 32px))"
          className="z-20"
          offset={6}
        >
          <div className="max-h-[calc(100svh-64px)] overflow-y-auto px-3 py-2">
            <h3 className="m-0 pr-5 text-sm leading-snug font-semibold break-words text-gray-700">
              {selection.cableName}
            </h3>
            {(cableNames[selection.cableId] ?? [null]).map((names) => {
              const serviceStart = getCableServiceStart(names);
              return (
                <dl
                  key={names?.englishAbbreviation ?? selection.cableId}
                  className="mt-2 space-y-1 border-t border-gray-300 pt-2 text-xs wrap-anywhere"
                >
                  <div>
                    <dt className="text-gray-500">
                      {t('cablePopup.chineseName')}
                    </dt>
                    <dd className="text-gray-700">
                      {names?.chineseName ?? t('cablePopup.notProvided')}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">
                      {t('cablePopup.englishAbbreviation')}
                    </dt>
                    <dd className="text-gray-700">
                      {names?.englishAbbreviation ?? t('cablePopup.notProvided')}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">
                      {t('cablePopup.englishName')}
                    </dt>
                    <dd className="text-gray-700">
                      {names?.englishName ?? t('cablePopup.notProvided')}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">
                      {t('cablePopup.connectedCountries')}
                    </dt>
                    <dd className="text-gray-700">
                      {names?.countries?.length
                        ? names.countries
                            .map((country) => t(`cablePopup.countryNames.${country}`, { defaultValue: country }))
                            .join('、')
                        : t('cablePopup.notProvided')}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">
                      {t('cablePopup.serviceStart')}
                    </dt>
                    <dd className="text-gray-700">
                      {serviceStart
                        ? (
                            <time dateTime={serviceStart.yearMonth.replace('/', '-')}>
                              {serviceStart.yearMonth}
                            </time>
                          )
                        : t('cablePopup.notProvided')}
                    </dd>
                  </div>
                </dl>
              );
            })}
            <p className="mt-2 text-xs wrap-anywhere text-slate-400">
              {t('cablePopup.segmentId')}
              : {selection.segmentId}
            </p>
            <CoordinateLine coordinates={selection.coordinates} />
          </div>
        </Popup>
      )}

      {selection && selection.kind !== "cable" && (
        <Popup
          longitude={selection.coordinates[0]}
          latitude={selection.coordinates[1]}
          onClose={() => setSelection(null)}
          closeButton={true}
          closeOnClick={false}
          maxWidth={selection.kind === "landing" ? "260px" : "250px"}
          offset={6}
        >
          <div className="px-3 py-2">
            <h3 className="m-0 pr-5 text-sm leading-snug font-semibold break-words text-gray-700">
              {selection.name}
            </h3>
            <CoordinateLine coordinates={selection.coordinates} />
          </div>
        </Popup>
      )}
    </Map>
  );
}

function CoordinateLine({ coordinates }: { coordinates: [number, number] }) {
  return (
    <div className="mt-1 border-t border-gray-300 pt-1">
      <p className="text-xs whitespace-nowrap text-gray-500">
        {`${coordinates[1].toFixed(4)}°N, ${coordinates[0].toFixed(4)}°E`}
      </p>
    </div>
  );
}

export default memo(MapWithCables);
