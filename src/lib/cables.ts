export interface Segment {
  id: string;
  hidden?: boolean;
  coordinates: [number, number][];
  color?: string;
  retired?: boolean;
  building?: boolean;
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
  building?: boolean;
  segments: Segment[];
  equipments?: Equipment[];
  available_path?: string[][];
}

export type CableFilter = 'all' | 'normal' | 'broken';

async function loadCables(): Promise<Cable[]> {
  const modules = import.meta.glob<{ default: Cable }>('../data/cables/*.json');
  return Promise.all(Object.values(modules).map(async (loader) => (await loader()).default));
}

export const cablesQueryOptions = {
  queryKey: ['cables'],
  queryFn: loadCables,
  staleTime: Infinity,
};

export function isCableSegmentVisible(
  cableId: string,
  segment: Pick<Segment, 'hidden'>,
  status: 'normal' | 'broken' | 'partial_disconnected',
  filter: CableFilter,
  selectedId: string | null,
  previewId: string | null,
) {
  if (segment.hidden) return false;
  if (cableId === previewId) return true;
  if (selectedId && selectedId !== cableId) return false;
  return filter === 'all'
    || (filter === 'normal' && status === 'normal')
    || (filter === 'broken' && status !== 'normal');
}
