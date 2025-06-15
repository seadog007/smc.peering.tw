import { useSuspenseQuery } from "@tanstack/react-query";

export interface Incident {
  date: string;
  status: string;
  cableid: string;
  segment: string;
  title: string;
  description: string;
  reparing_at: string;
  resolved_at: string;
}

export function useIncidents() {
  const { data: incidents } = useSuspenseQuery({
    queryKey: ["incidents"],
    queryFn: async (): Promise<Incident[]> => {
      return await fetch("/data/incidents.json").then((res) => res.json());
    },
  });

  return incidents;
}
