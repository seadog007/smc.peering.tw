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
      try {
        const res = await fetch("/data/incidents.json");
        if (!res.ok) {
          throw new Error(res.statusText);
        }
  
        return await res.json();
      } catch {
        return [];
      }
    },
  });

  return incidents;
}
