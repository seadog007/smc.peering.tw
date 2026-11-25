import { memo, useEffect, useMemo, useState } from "react";
import { useTranslation } from 'react-i18next';
import { useQuery } from "@tanstack/react-query";
import { useMediaQuery } from "usehooks-ts";
import { Map, Source, Layer, Marker, Popup } from "@vis.gl/react-maplibre";

import { cableNames, getCableServiceStart } from '@/lib/cable-names';
import { cablesQueryOptions, isCableSegmentVisible } from '@/lib/cables';
import { incidentsQueryOptions, newestIncidentsFirst } from '@/lib/incidents';
import { BASE_MAP_STYLE } from '@/lib/map-style';

import type { Feature, FeatureCollection, LineString } from "geojson";
import type { CableFilter, Equipment } from '@/lib/cables';
import {
  getSegmentColor,
  getSegmentStatus,
  isBuildingSegment,
} from "@/lib/cable-status";
import "maplibre-gl/dist/maplibre-gl.css";
import { motion } from "motion/react";
import landingPointsJson from "@/data/landing-points.json" with { type: "json" };

interface LandingPoint {
  id: string;
  name: string;
  coordinates: [number, number];
}

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
  const landingPoints = landingPointsJson as unknown as LandingPoint[];
  const [cursor, setCursor] = useState<string>("");
  const [hoveredCableId, setHoveredCableId] = useState<string | null>(null);
  const [selectedCable, setSelectedCable] = useState<{
    cableId: string;
    cableName: string;
    segmentId: string;
    coordinates: [number, number];
  } | null>(null);

  const [selectedEquipment, setSelectedEquipment] = useState<{
    name: string;
    coordinates: [number, number];
  } | null>(null);

  const [selectedLandingPoint, setSelectedLandingPoint] = useState<{
    name: string;
    coordinates: [number, number];
  } | null>(null);

  const { data: incidents } = useQuery({
    ...incidentsQueryOptions,
    select: newestIncidentsFirst,
  });

  const { data: cables } = useQuery(cablesQueryOptions);

  useEffect(() => {
    setSelectedCable(null);
    setSelectedEquipment(null);
    setHoveredCableId(null);
    setCursor("");
  }, [isolatedCableId, cableFilter]);

  useEffect(() => {
    if (previewCableId) setHoveredCableId(null);
  }, [previewCableId]);

  const highlightedCableId = previewCableId ?? hoveredCableId;

  // Status depends only on the data, so it is resolved once per load rather
  // than on every filter, isolation, or preview change.
  const segmentFeatures = useMemo(() => {
    if (!cables || !incidents) return [];

    return cables.flatMap((cable) =>
      cable.segments
        .filter((segment) => !segment.hidden)
        .map((segment) => {
          const status = getSegmentStatus(segment, cable, incidents);
          const color = getSegmentColor(segment, cable, incidents);
          const building = isBuildingSegment(segment, cable);
          const features: Feature<LineString>[] = [];

          if (status === "broken") {
            features.push({
              type: "Feature",
              properties: {
                cableName: cable.name,
                segmentId: segment.id,
                cableId: cable.id,
                color: "#ff0000",
                status: "broken-glow",
                lineWidth: 15,
                lineBlur: 12,
                lineOpacity: 0.4,
              },
              geometry: {
                type: "LineString",
                coordinates: segment.coordinates,
              },
            } as Feature<LineString>);
          }

          features.push({
            type: "Feature",
            properties: {
              cableName: cable.name,
              segmentId: segment.id,
              cableId: cable.id,
              color,
              status,
              lineWidth: status === "broken" || status === "partial_disconnected" ? 3 : 1.5,
              lineBlur: 0,
              lineOpacity: 1,
              building,
            },
            geometry: {
              type: "LineString",
              coordinates: segment.coordinates,
            },
          } as Feature<LineString>);

          return { cableId: cable.id, segment, status, features };
        }),
    );
  }, [cables, incidents]);

  const cableData: FeatureCollection<LineString> = useMemo(
    () => ({
      type: "FeatureCollection",
      features: segmentFeatures
        .filter(({ cableId, segment, status }) => isCableSegmentVisible(
          cableId, segment, status, cableFilter, isolatedCableId, previewCableId,
        ))
        .flatMap(({ features }) => features),
    }),
    [segmentFeatures, cableFilter, isolatedCableId, previewCableId],
  );

  const handleCableClick = (event: any) => {
    const feature = event.features?.find(
      (f: any) => f.properties?.status !== "broken-glow",
    );
    if (!feature) return;

    const coordinates = event.lngLat;
    const properties = feature.properties as {
      cableId: string;
      cableName: string;
      segmentId: string;
    };

    setSelectedCable({
      cableId: properties.cableId,
      cableName: properties.cableName,
      segmentId: properties.segmentId,
      coordinates: [coordinates.lng, coordinates.lat],
    });
  };

  const handleEquipmentClick = (equipment: Equipment) => {
    setSelectedEquipment({
      name: equipment.name,
      coordinates: equipment.coordinate,
    });
  };

  // Change cursor to pointer when hovering over interactive cable features (excluding glow layer)
  const handleMouseMove = (event: any) => {
    const feature = event.features?.find(
      (f: any) => f.properties?.status !== "broken-glow",
    );
    setCursor(feature ? "pointer" : "");
    setHoveredCableId(feature ? (feature.properties?.cableId ?? null) : null);
  };

  return (
    <Map
      cursor={cursor}
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
      interactiveLayerIds={["cables-hit", "cables-layer", "cables-building-layer"]}
      doubleClickZoom={false}
      keyboard={false}
      attributionControl={false}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        setCursor("");
        setHoveredCableId(null);
      }}
      onClick={handleCableClick}
    >
      <Source id="cables" type="geojson" data={cableData}>
        {/* Hover glow layer for better visual feedback */}
        <Layer
          id="cables-hover-glow"
          type="line"
          filter={
            (highlightedCableId
              ? [
                "all",
                ["!=", ["get", "status"], "broken-glow"],
                ["==", ["get", "cableId"], highlightedCableId],
              ]
              : ["==", ["get", "cableId"], "__none__"]) as any
          }
          layout={{ "line-join": "round", "line-cap": "round" }}
          paint={{
            "line-color": previewCableId ? "#fff" : "#333",
            "line-width": 8,
            "line-blur": previewCableId ? 2 : 0,
            "line-opacity": previewCableId ? 0.85 : 1,
          }}
        />
        <Layer
          id="cables-layer"
          type="line"
          filter={["!=", ["get", "building"], true] as any}
          layout={{ "line-join": "round", "line-cap": "round" }}
          paint={{
            "line-color": ["get", "color"],
            "line-width": ["get", "lineWidth"],
            "line-blur": ["get", "lineBlur"],
            "line-opacity": ["get", "lineOpacity"],
          }}
        />
        <Layer
          id="cables-building-layer"
          type="line"
          filter={["==", ["get", "building"], true] as any}
          layout={{ "line-join": "round", "line-cap": "round" }}
          paint={{
            "line-color": ["get", "color"],
            "line-width": ["get", "lineWidth"],
            "line-blur": ["get", "lineBlur"],
            "line-opacity": ["get", "lineOpacity"],
            "line-dasharray": [2, 2],
          }}
        />
        {/* Invisible wide hit area to make hover/click easier */}
        <Layer
          id="cables-hit"
          type="line"
          layout={{ "line-join": "round", "line-cap": "round" }}
          paint={{
            "line-color": "#000000",
            "line-width": 18,
            "line-opacity": 0,
            "line-blur": 0,
          }}
        />
      </Source>

      {cables?.filter((cable) => !isolatedCableId || cable.id === isolatedCableId || cable.id === previewCableId).map((cable) =>
        cable.equipments?.map((equip) => (
          <Marker
            key={`marker-${equip.id}`}
            longitude={equip.coordinate[0]}
            latitude={equip.coordinate[1]}
            onClick={() => handleEquipmentClick(equip)}
          >
            <div className="z-[1] size-5 cursor-pointer rounded-full bg-white" />
          </Marker>
        )),
      )}

      {landingPoints.map((lp) => (
        <Marker
          key={`lp-${lp.id}`}
          longitude={lp.coordinates[0]}
          latitude={lp.coordinates[1]}
          onClick={() =>
            setSelectedLandingPoint({
              name: lp.name,
              coordinates: lp.coordinates,
            })
          }
        >
          <motion.div
            className="size-4 cursor-pointer rounded-full bg-gradient-to-b from-blue-500 to-blue-600 shadow-lg ring-2 ring-white/95 md:size-3"
            whileHover={{
              scale: 1.05,
            }}
            whileTap={{
              scale: 0.95,
            }}
          />
        </Marker>
      ))}

      {selectedCable && (
        <Popup
          longitude={selectedCable.coordinates[0]}
          latitude={selectedCable.coordinates[1]}
          onClose={() => setSelectedCable(null)}
          closeButton={true}
          closeOnClick={false}
          maxWidth="min(340px, calc(100vw - 32px))"
          className="z-20"
          offset={6}
        >
          <div className="max-h-[calc(100svh-64px)] overflow-y-auto px-3 py-2">
            <h3 className="m-0 pr-5 text-sm leading-snug font-semibold break-words text-gray-700">
              {selectedCable.cableName}
            </h3>
            {(cableNames[selectedCable.cableId] ?? [null]).map((names) => {
              const serviceStart = getCableServiceStart(names);
              return (
                <dl
                  key={names?.englishAbbreviation ?? selectedCable.cableId}
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
              : {selectedCable.segmentId}
            </p>
            <div className="mt-1 border-t border-gray-300 pt-1">
              <p className="text-xs whitespace-nowrap text-gray-500">
                {selectedCable.coordinates[1].toFixed(4)}°N,{" "}
                {selectedCable.coordinates[0].toFixed(4)}°E
              </p>
            </div>
          </div>
        </Popup>
      )}

      {selectedEquipment && (
        <Popup
          longitude={selectedEquipment.coordinates[0]}
          latitude={selectedEquipment.coordinates[1]}
          onClose={() => setSelectedEquipment(null)}
          closeButton={true}
          closeOnClick={false}
          maxWidth="250px"
          offset={6}
        >
          <div className="px-3 py-2">
            <h3 className="m-0 pr-5 text-sm leading-snug font-semibold break-words text-gray-700">
              {selectedEquipment.name}
            </h3>
            <div className="mt-1 border-t border-gray-300 pt-1">
              <p className="text-xs whitespace-nowrap text-gray-500">
                {selectedEquipment.coordinates[1].toFixed(4)}°N,{" "}
                {selectedEquipment.coordinates[0].toFixed(4)}°E
              </p>
            </div>
          </div>
        </Popup>
      )}

      {selectedLandingPoint && (
        <Popup
          longitude={selectedLandingPoint.coordinates[0]}
          latitude={selectedLandingPoint.coordinates[1]}
          onClose={() => setSelectedLandingPoint(null)}
          closeButton={true}
          closeOnClick={false}
          maxWidth="260px"
          offset={6}
        >
          <div className="px-3 py-2">
            <h3 className="m-0 pr-5 text-sm leading-snug font-semibold break-words text-gray-700">
              {selectedLandingPoint.name}
            </h3>
            <div className="mt-1 border-t border-gray-300 pt-1">
              <p className="text-xs whitespace-nowrap text-gray-500">
                {selectedLandingPoint.coordinates[1].toFixed(4)}°N,{" "}
                {selectedLandingPoint.coordinates[0].toFixed(4)}°E
              </p>
            </div>
          </div>
        </Popup>
      )}
    </Map>
  );
}

export default memo(MapWithCables);
