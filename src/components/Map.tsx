import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useMediaQuery } from "usehooks-ts";
import { Map, Source, Layer, Marker, Popup } from "@vis.gl/react-maplibre";
import type { StyleSpecification } from "maplibre-gl";
import type { Feature, FeatureCollection, LineString } from "geojson";
import { cn } from "@/lib/utils";
import "maplibre-gl/dist/maplibre-gl.css";
import { motion } from "motion/react";
import landingPointsJson from "@/data/landing-points.json" with { type: "json" };

// Keep map style object identity stable to avoid style reload flicker on re-renders
const BASE_MAP_STYLE: StyleSpecification = {
  version: 8,
  name: "ExpTech Studio",
  sources: {
    map: {
      type: "vector",
      url: "https://lb.exptech.dev/api/v1/map/tiles/tiles.json",
    },
  },
  sprite: "",
  layers: [
    {
      id: "background",
      type: "background",
      paint: { "background-color": "#1f2025" },
    },
    {
      id: "county",
      type: "fill",
      source: "map",
      "source-layer": "city",
      paint: { "fill-color": "#3F4045" },
    },
    {
      id: "county-outline",
      type: "line",
      source: "map",
      "source-layer": "city",
      paint: { "line-color": "#a9b4bc" },
    },
    {
      id: "town",
      type: "fill",
      source: "map",
      "source-layer": "town",
      paint: { "fill-color": "transparent" },
    },
    {
      id: "global",
      type: "fill",
      source: "map",
      "source-layer": "global",
      paint: {
        "fill-color": "#3F4045",
        "fill-opacity": 1,
      },
    },
  ],
};

interface Segment {
  id: string;
  hidden?: boolean;
  coordinates: [number, number][];
  color?: string;
}
interface Equipment {
  id: string;
  name: string;
  coordinate: [number, number];
}
interface Cable {
  id: string;
  name: string;
  color?: string;
  segments: Segment[];
  equipments?: Equipment[];
  available_path?: string[][];
}
interface LandingPoint {
  id: string;
  name: string;
  coordinates: [number, number];
}
interface Incident {
  date: string;
  status: string;
  cableid: string;
  segment: string;
  title: string;
  description: string;
  resolved_at: string;
}

// Path-propagation logic: if any segment on a path is affected,
// all segments on that path are considered broken (no available route).
function markBroken(paths: string[][], inputNodes: string[]) {
  const failedPaths = new Set<string>();
  for (const node of inputNodes) {
    for (const path of paths) {
      if (path.includes(node)) failedPaths.add(JSON.stringify(path));
    }
  }
  const failedPathsArray = Array.from(failedPaths).map(
    (p) => JSON.parse(p) as string[],
  );
  const flatAll = paths.flat();
  const flatFailed = failedPathsArray.flat();
  const failedNodesSet = new Set(flatFailed);
  const out: string[] = [];
  for (const node of failedNodesSet) {
    const countAll = flatAll.filter((n) => n === node).length;
    const countFailed = flatFailed.filter((n) => n === node).length;
    if (countAll === countFailed) out.push(node);
  }
  return out.sort();
}

function getSegmentStatus(
  segment: Segment,
  cable: Cable,
  incidents: Incident[],
) {
  const activeIncidents = incidents.filter(
    (incident) =>
      incident.cableid === cable.id &&
      (!incident.resolved_at || incident.resolved_at.trim() === ""),
  );
  if (activeIncidents.length > 0 && cable.available_path) {
    const affectedSegments = activeIncidents
      .map((incident) => incident.segment?.trim())
      .filter((id): id is string => Boolean(id && id.length > 0));
    const brokenSegments = markBroken(cable.available_path, affectedSegments);
    if (brokenSegments.includes(segment.id)) return "broken";
  }
  return "normal";
}

function getSegmentColor(
  segment: Segment,
  cable: Cable,
  incidents: Incident[],
) {
  if (segment.color) return segment.color;
  const activeIncidents = incidents.filter(
    (incident) =>
      incident.cableid === cable.id &&
      (!incident.resolved_at || incident.resolved_at.trim() === ""),
  );
  if (activeIncidents.length > 0 && cable.available_path) {
    const affectedSegments = activeIncidents
      .map((incident) => incident.segment?.trim())
      .filter((id): id is string => Boolean(id && id.length > 0));
    const brokenSegments = markBroken(cable.available_path, affectedSegments);
    if (brokenSegments.includes(segment.id)) return "#ff0000";
  }
  return cable.color || "#48A9FF";
}

async function loadCables(): Promise<Cable[]> {
  const modules = import.meta.glob("../data/cables/*.json");
  const cablePromises = Object.values(modules).map(async (loader) => {
    const module = await loader();
    return (module as { default: Cable }).default;
  });
  return Promise.all(cablePromises);
}

type CableFilter = "all" | "normal" | "broken";

interface MapWithCablesProps {
  cableFilter?: CableFilter;
}

export default function MapWithCables({
  cableFilter = "all",
}: MapWithCablesProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const landingPoints = landingPointsJson as unknown as LandingPoint[];
  const [cursor, setCursor] = useState<string>("");
  const [hoveredCableId, setHoveredCableId] = useState<string | null>(null);
  const [selectedCable, setSelectedCable] = useState<{
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

  const { data: incidents, isLoading: incidentsLoading } = useQuery({
    queryKey: ["incidents"],
    queryFn: async () => {
      const res = await fetch("/data/incidents.json");
      if (!res.ok) throw new Error(`Failed to fetch incidents: ${res.status}`);
      const incidentsData = (await res.json()) as Incident[];
      incidentsData.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
      return incidentsData;
    },
  });

  const { data: cables, isLoading: cablesLoading } = useQuery({
    queryKey: ["cables"],
    queryFn: async () => loadCables(),
  });

  const isLoading = useMemo(
    () => incidentsLoading || cablesLoading,
    [incidentsLoading, cablesLoading],
  );

  const cableFeatures = useMemo(() => {
    if (!cables || !incidents) return [];

    const allFeatures: Feature<LineString>[] = [];

    cables.forEach((cable) => {
      cable.segments
        .filter((segment) => !segment.hidden)
        .forEach((segment) => {
          const status = getSegmentStatus(segment, cable, incidents);
          const color = getSegmentColor(segment, cable, incidents);

          const shouldShow =
            cableFilter === "all" ||
            (cableFilter === "normal" && status === "normal") ||
            (cableFilter === "broken" && status === "broken");

          if (!shouldShow) return;

          if (status === "broken") {
            allFeatures.push({
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

          allFeatures.push({
            type: "Feature",
            properties: {
              cableName: cable.name,
              segmentId: segment.id,
              cableId: cable.id,
              color,
              status,
              lineWidth: status === "broken" ? 3 : 1.5,
              lineBlur: 0,
              lineOpacity: 1,
            },
            geometry: {
              type: "LineString",
              coordinates: segment.coordinates,
            },
          } as Feature<LineString>);
        });
    });

    return allFeatures;
  }, [cables, incidents, cableFilter]);

  const cableData: FeatureCollection<LineString> = useMemo(
    () => ({
      type: "FeatureCollection",
      features: cableFeatures,
    }),
    [cableFeatures],
  );

  const handleCableClick = (event: any) => {
    const feature = event.features?.find(
      (f: any) => f.properties?.status !== "broken-glow",
    );
    if (!feature) return;

    const coordinates = event.lngLat;
    const properties = feature.properties;

    setSelectedCable({
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

  if (isLoading) {
    return (
      <div className={cn("flex h-full w-full items-center justify-center")}>
        <div className="text-white">Loading map...</div>
      </div>
    );
  }

  return (
    <Map
      cursor={cursor}
      initialViewState={
        isMobile
          ? {
              longitude: 121,
              latitude: 20.5,
              zoom: 4.5,
            }
          : {
              longitude: 125,
              latitude: 23.5,
              zoom: 5,
            }
      }
      style={{ width: "100%", height: "100%" }}
      mapStyle={BASE_MAP_STYLE}
      interactiveLayerIds={["cables-hit", "cables-layer"]}
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
            (hoveredCableId
              ? [
                  "all",
                  ["!=", ["get", "status"], "broken-glow"],
                  ["==", ["get", "cableId"], hoveredCableId],
                ]
              : ["==", ["get", "cableId"], "__none__"]) as any
          }
          layout={{ "line-join": "round", "line-cap": "round" }}
          paint={{
            "line-color": "#fff",
            "line-width": 8,
            "line-opacity": 0.1,
          }}
        />
        <Layer
          id="cables-layer"
          type="line"
          layout={{ "line-join": "round", "line-cap": "round" }}
          paint={{
            "line-color": ["get", "color"],
            "line-width": ["get", "lineWidth"],
            "line-blur": ["get", "lineBlur"],
            "line-opacity": ["get", "lineOpacity"],
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

      {cables?.map((cable) =>
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
          maxWidth="250px"
          offset={25}
        >
          <div className="px-3 py-2">
            <h3 className="m-0 pr-5 text-sm leading-snug font-semibold break-words text-gray-700">
              {selectedCable.cableName}
            </h3>
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
          offset={25}
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
          offset={25}
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
