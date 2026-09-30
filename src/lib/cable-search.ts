import type { CableNames } from './cable-names';
import type { Cable } from './cables';

type FieldKind = 'name' | 'country' | 'segment' | 'equipment' | 'date' | 'id';

interface SearchField {
  kind: FieldKind;
  value: string;
  normalized: string;
}

export interface CableSearchEntry {
  id: string;
  name: string;
  chineseName: string;
  englishName: string;
  fields: SearchField[];
}

export interface CableSearchResult extends CableSearchEntry {
  match: SearchField;
  score: number;
}

const countryAlpha3: Record<string, string> = {
  CN: 'CHN', GU: 'GUM', HK: 'HKG', JP: 'JPN', KR: 'KOR', MY: 'MYS',
  PH: 'PHL', SG: 'SGP', TH: 'THA', TW: 'TWN', US: 'USA', VN: 'VNM',
};

export function normalizeCableSearch(value: string) {
  return value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
}

export function buildCableSearchIndex(
  cables: readonly Cable[],
  metadata: Readonly<Record<string, readonly CableNames[] | undefined>>,
  countryNames: (code: string) => readonly string[],
): CableSearchEntry[] {
  return [...new Map(cables.map((cable) => [cable.id, cable])).values()]
    .filter((cable) => cable.segments.some((segment) => !segment.hidden))
    .map((cable) => {
      const names = metadata[cable.id] ?? [];
      const fields: SearchField[] = [];
      const add = (kind: FieldKind, value: string | undefined) => {
        if (value && !fields.some((field) => field.kind === kind && field.value === value)) {
          fields.push({ kind, value, normalized: normalizeCableSearch(value) });
        }
      };
      add('name', cable.name);
      add('id', cable.id);
      for (const name of names) {
        add('name', name.englishAbbreviation);
        add('name', name.chineseName);
        add('name', name.englishName);
        for (const code of name.countries ?? []) {
          add('country', [code, countryAlpha3[code], ...countryNames(code)].filter(Boolean).join(' · '));
        }
        add('date', name.taiwanServiceStart?.yearMonth);
        add('date', name.serviceStart?.yearMonth);
      }
      for (const segment of cable.segments) {
        if (!segment.hidden) add('segment', segment.id);
      }
      for (const equipment of cable.equipments ?? []) {
        add('equipment', equipment.id);
        add('equipment', equipment.name);
      }
      return {
        id: cable.id,
        name: cable.name,
        chineseName: [...new Set(names.map((name) => name.chineseName))].join('、'),
        englishName: [...new Set(names.map((name) => name.englishName).filter(Boolean))].join(' / '),
        fields,
      };
    });
}

export function searchCables(index: readonly CableSearchEntry[], query: string): CableSearchResult[] {
  const normalized = normalizeCableSearch(query);
  if (!normalized) return [];
  const tokens = query.trim().split(/\s+/u).map(normalizeCableSearch).filter(Boolean);
  const results: CableSearchResult[] = [];
  for (const entry of index) {
    const fullMatches = entry.fields.filter((field) => field.normalized.includes(normalized));
    if (!fullMatches.length && !tokens.every((token) => entry.fields.some((field) => field.normalized.includes(token)))) {
      continue;
    }
    const matches = fullMatches.length ? fullMatches : entry.fields.filter((field) => tokens.some((token) => field.normalized.includes(token)));
    const rank = (field: SearchField) => {
      if (field.kind !== 'name') return 3;
      if (field.normalized === normalized) return 0;
      if (field.normalized.startsWith(normalized)) return 1;
      return 2;
    };
    matches.sort((a, b) => rank(a) - rank(b));
    results.push({ ...entry, match: matches[0], score: rank(matches[0]) });
  }
  return results.sort((a, b) => a.score - b.score || a.name.localeCompare(b.name, 'en') || a.id.localeCompare(b.id, 'en'));
}
