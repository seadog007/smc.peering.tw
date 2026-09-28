import cableMetadata from '@/data/cable-metadata.json' with { type: 'json' };

export interface CableServiceStart {
  /** Verified service month, formatted as yyyy/mm; never a planned date. */
  yearMonth: string;
  sourceUrl: string;
}

export interface CableNames {
  chineseName: string;
  englishAbbreviation: string;
  englishName?: string;
  countries?: readonly string[];
  serviceStart?: CableServiceStart;
  taiwanServiceStart?: CableServiceStart;
}

// Cable-specific values are maintained in the data repository.
export const cableNames: Readonly<
  Record<string, readonly CableNames[] | undefined>
> = cableMetadata.cables;

export function getCableServiceStart(names: CableNames | null | undefined) {
  return names?.taiwanServiceStart ?? names?.serviceStart;
}
