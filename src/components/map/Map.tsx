import * as maplibregl from "maplibre-gl";
import { useEffect, useRef, useState } from "react";

import "maplibre-gl/dist/maplibre-gl.css";
import landingPoints from "../../data/landing-points.json";
import CableLayer from "./CableLayer";

import "./Map.css";
import type { Feature, Geometry } from "geojson";

interface LandingPoint {
  name: string;
  coordinates: [number, number];
}

interface MapProps {
  cableFilter?: "all" | "normal" | "broken";
}

export default function Map({ cableFilter = "all" }: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const cableLayerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    if (map.current) return;
    if (!mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          map: {
            type: "vector",
            url: "https://lb.exptech.dev/api/v1/map/tiles/tiles.json",
          },
        },
        layers: [
          {
            id: "background",
            type: "background",
            paint: {
              "background-color": "#0b0c0d",
            },
          },
          {
            id: "county",
            type: "fill",
            source: "map",
            "source-layer": "city",
            paint: {
              "fill-color": "#304046",
              "fill-opacity": 1,
            },
          },
          {
            id: "town",
            type: "fill",
            source: "map",
            "source-layer": "town",
            paint: {
              "fill-color": "#304046",
              "fill-opacity": 1,
            },
          },
          {
            id: "county-outline",
            source: "map",
            "source-layer": "city",
            type: "line",
            paint: {
              "line-color": "#738B93",
            },
          },
          {
            id: "global",
            type: "fill",
            source: "map",
            "source-layer": "global",
            paint: {
              "fill-color": "#304046",
              "fill-opacity": 1,
            },
          },
        ],
      },
      center: [121.6, 23.5],
      zoom: 6.8,
      minZoom: 4,
      maxZoom: 12,
      doubleClickZoom: false,
      keyboard: false,
      attributionControl: false,
    });

    // Add navigation controls
    // map.current.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    map.current.on("load", () => {
      setMapLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (map.current) {
      if (isMobile) {
        map.current.fitBounds(
          [
            [118, 21.2],
            [124, 25.8],
          ],
          { padding: 20, duration: 0 },
        );
      } else {
        map.current.fitBounds(
          [
            [117, 20],
            [130, 28],
          ],
          { padding: 20, duration: 0 },
        );
      }
    }
  }, [isMobile]);

  useEffect(() => {
    if (!map.current) return;

    const currentMap = map.current;
    const landingMarkerList: Feature<Geometry>[] = [];

    map.current.on("load", () => {
      const typedLandingPoints = landingPoints as unknown as LandingPoint[];

      for (const point of typedLandingPoints) {
        landingMarkerList.push({
          type: "Feature",
          properties: {
            name: point.name,
            coordinates: point.coordinates,
          },
          geometry: {
            type: "Point",
            coordinates: point.coordinates,
          },
        });
      }

      const sourceId = "landing-marker-points";
      const source = currentMap.getSource(sourceId);

      if (!source) {
        currentMap.addSource(sourceId, {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: landingMarkerList,
          },
        });

        // point shadow layer
        currentMap.addLayer({
          id: "landing-marker-shadow-layer",
          type: "circle",
          source: sourceId,
          paint: {
            "circle-color": "#ffffff",
            "circle-radius": 12,
            "circle-blur": 0.8,
            "circle-opacity": 0.4,
          },
        });

        // point normal layer
        currentMap.addLayer({
          id: "landing-marker-layer",
          type: "circle",
          source: sourceId,
          paint: {
            "circle-radius": 7,
            "circle-color": "#ffffff",
          },
        });

        // bind click event
        currentMap.on("click", "landing-marker-layer", (event) => {
          // Close existing popup if any
          if (popupRef.current) {
            popupRef.current.remove();
          }

          const properties = event.features![0].properties;
          // 被 maplibre 轉換成 string, 需自行轉回 array
          const coordinates = JSON.parse(
            properties.coordinates as string,
          ) as number[];

          popupRef.current = new maplibregl.Popup({
            offset: 25,
            closeButton: true,
            closeOnClick: false,
            className: "landing-point-popup",
            maxWidth: "250px",
          })
            .setLngLat([coordinates[0], coordinates[1]])
            .setHTML(
              `
            <div style="padding: 10px 12px;">
              <h3 style="margin: 0 0 8px 0; padding-right: 20px; color: #48A9FF; font-size: 14px; font-weight: bold; word-wrap: break-word;">
                ${properties.name}
              </h3>
              <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #3F4045;">
                <p style="margin: 0; color: #6b7280; font-size: 11px; white-space: nowrap;">
                  ${coordinates[1].toFixed(4)}°N, ${coordinates[0].toFixed(4)}°E
                </p>
              </div>
            </div>
          `,
            )
            .addTo(currentMap);
        });

        // cursor pointer
        currentMap.on("mouseenter", "landing-marker-layer", () => {
          currentMap.getCanvas().style.cursor = "pointer";
        });

        currentMap.on("mouseleave", "landing-marker-layer", () => {
          currentMap.getCanvas().style.cursor = "";
        });
      }
    });
  }, []);

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />
      {mapLoaded && map.current && (
        <CableLayer
          ref={cableLayerRef}
          map={map.current}
          cableFilter={cableFilter}
        />
      )}
    </div>
  );
}
