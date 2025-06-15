import { useSuspenseQuery } from "@tanstack/react-query";
import type { LatLngExpression } from "leaflet";

export interface Segment {
  id: string;
  hidden?: boolean;
  coordinates: LatLngExpression[];
  color?: string;
}

export interface Equipment {
  id: string;
  name: string;
  coordinate: [number, number];
}

export interface Cable {
  id: string;
  name: string;
  color?: string;
  segments: Segment[];
  equipments?: Equipment[];
  available_path?: string[][];
}

async function loadCables(): Promise<Cable[]> {
  const modules = import.meta.glob("../data/cables/*.json");
  const cablePromises = Object.values(modules).map(async (loader) => {
    const module = await loader();
    return (module as { default: Cable }).default;
  });
  return Promise.all(cablePromises);
}

export function useCable() {
  const { data: cables } = useSuspenseQuery({
    queryKey: ["cables"],
    queryFn: async (): Promise<Cable[]> => {
      return await loadCables();
    },
  });

  return cables;
}
