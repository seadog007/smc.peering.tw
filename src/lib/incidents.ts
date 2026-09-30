export interface Incident {
  date: string;
  status: string;
  reason: string;
  cableid: string;
  segment: string;
  title: string;
  description: string;
  reparing_at: string;
  resolved_at: string;
}

async function loadIncidents(): Promise<Incident[]> {
  const response = await fetch('/data/incidents.json');
  if (!response.ok) throw new Error(`Failed to fetch incidents: ${response.status}`);
  const data: unknown = await response.json();
  if (!Array.isArray(data)) throw new Error('Invalid incidents data');
  return data as Incident[];
}

// Keep the export's order in the cache; views can sort a copy using select.
export const incidentsQueryOptions = {
  queryKey: ['incidents'],
  queryFn: loadIncidents,
};

export function newestIncidentsFirst(incidents: Incident[]): Incident[] {
  return [...incidents].sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
}
