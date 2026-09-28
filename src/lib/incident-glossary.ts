interface GlossaryPattern {
  pattern: string;
  caseSensitive?: boolean;
  hyphenSeparator?: boolean;
}

function station(pattern: string): GlossaryPattern {
  // Station names are meaningful here only when followed by a separate CLS token.
  return { pattern: `(?:${pattern})(?=\\s+CLS(?![A-Za-z0-9_-]))` };
}

function country(alpha2: string, alpha3: string): GlossaryPattern {
  return {
    pattern: `${alpha3}|${alpha2}`,
    caseSensitive: true,
    hyphenSeparator: true,
  };
}

// User-facing titles and explanations live in the incidentGlossary i18n keys.
const glossaryPatterns = {
  'cls': { pattern: 'CLS' },
  'repeater': { pattern: 'R(?:[A-Z]+-?)?\\d+[A-Z]?(?:-\\d+[A-Z]?)*' },
  'shunt': { pattern: 'Shunt(?:[ \\t]+Fault)?' },
  'etr': { pattern: 'ETR' },
  'stations.tamsui': station('TNS|Tamsui|Tanshui'),
  'stations.shantou': station('SHT|Shantou'),
  'stations.bali': station('Bali|Pa-li'),
  'stations.chungHomKok': station('Chung\\s+Hom\\s+Kok'),
  'stations.chongming': station('Chongming'),
  'stations.chikura': station('Chikura'),
  'countries.CN': country('CN', 'CHN'),
  'countries.GU': country('GU', 'GUM'),
  'countries.HK': country('HK', 'HKG'),
  'countries.JP': country('JP', 'JPN'),
  'countries.KR': country('KR', 'KOR'),
  'countries.MY': country('MY', 'MYS'),
  'countries.PH': country('PH', 'PHL'),
  'countries.SG': country('SG', 'SGP'),
  'countries.TH': country('TH', 'THA'),
  'countries.TW': country('TW', 'TWN'),
  'countries.US': country('US', 'USA'),
  'countries.VN': country('VN', 'VNM'),
} satisfies Record<string, GlossaryPattern>;

export type IncidentGlossaryTerm = keyof typeof glossaryPatterns;

export interface IncidentDescriptionPart {
  text: string;
  start: number;
  term?: IncidentGlossaryTerm;
}

const matchers = Object.entries(glossaryPatterns).map(([term, rule]: [string, GlossaryPattern]) => {
  // Only country codes allow hyphen-separated endpoints, e.g. HK-SG.
  const wordCharacters = rule.hyphenSeparator ? 'A-Za-z0-9_' : 'A-Za-z0-9_-';
  return {
    term: term as IncidentGlossaryTerm,
    // ASCII boundaries allow Chinese adjacency while excluding partial IDs.
    pattern: new RegExp(
      `(?<![${wordCharacters}])(?:${rule.pattern})(?![${wordCharacters}])`,
      rule.caseSensitive ? 'g' : 'gi',
    ),
  };
});

export function splitIncidentDescription(text: string): IncidentDescriptionPart[] {
  const urls = [...text.matchAll(/(?:https?:\/\/|www\.)[^\s<>"'，。；、（）]+/gi)]
    .map((match) => ({ start: match.index, end: match.index + match[0].length }));
  const matches = matchers.flatMap(({ term, pattern }) =>
    [...text.matchAll(pattern)]
      .filter((match) => !urls.some((url) =>
        match.index < url.end && match.index + match[0].length > url.start,
      ))
      .map((match) => ({ text: match[0], start: match.index, term })),
  ).sort((a, b) => a.start - b.start || b.text.length - a.text.length);

  const parts: IncidentDescriptionPart[] = [];
  let cursor = 0;
  for (const match of matches) {
    if (match.start < cursor) continue;
    if (match.start > cursor) {
      parts.push({ text: text.slice(cursor, match.start), start: cursor });
    }
    parts.push(match);
    cursor = match.start + match.text.length;
  }
  if (cursor < text.length) {
    parts.push({ text: text.slice(cursor), start: cursor });
  }
  return parts;
}
