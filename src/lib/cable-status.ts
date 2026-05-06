export type Path = string[];

export interface CableStatusSegment {
  id: string;
  retired?: boolean;
  building?: boolean;
}

export interface CableStatusCable {
  id: string;
  building?: boolean;
  available_path?: Path[];
  segments?: CableStatusSegment[];
}

export interface CableStatusIncident {
  cableid: string;
  segment?: string;
  resolved_at?: string | null;
}

interface PathAvailability {
  totalIntl: number;
  remainingIntl: number;
  totalDom: number;
  remainingDom: number;
}

export function isActiveIncident(incident: CableStatusIncident) {
  return !incident.resolved_at || incident.resolved_at.trim() === "";
}

function isBuildingSegment(
  segment: CableStatusSegment,
  cable: CableStatusCable,
) {
  return Boolean(cable.building || segment.building);
}

function getUnavailableSegmentIds(cable: CableStatusCable) {
  return new Set(
    cable.segments
      ?.filter((segment) => segment.retired || isBuildingSegment(segment, cable))
      .map((segment) => segment.id) ?? [],
  );
}

function getValidPaths(cable: CableStatusCable) {
  const unavailableSegmentIds = getUnavailableSegmentIds(cable);
  return (
    cable.available_path?.filter(
      (path) => !path.some((node) => unavailableSegmentIds.has(node)),
    ) ?? []
  );
}

function commonPrefixLength(paths: Path[]) {
  if (paths.length === 0) return 0;
  let prefixLen = paths[0].length;
  for (const path of paths.slice(1)) {
    prefixLen = Math.min(prefixLen, path.length);
    for (let index = 0; index < prefixLen; index += 1) {
      if (path[index] !== paths[0][index]) {
        prefixLen = index;
        break;
      }
    }
  }
  return prefixLen;
}

function groupPaths(paths: Path[]) {
  const grouped: Path[][] = [];
  const byFirstTwo = new Map<string, Path[]>();

  for (const path of paths) {
    if (path.length >= 2) {
      const key = `${path[0]}|${path[1]}`;
      const bucket = byFirstTwo.get(key) ?? [];
      bucket.push(path);
      byFirstTwo.set(key, bucket);
    } else {
      grouped.push([path]);
    }
  }

  for (const bucket of byFirstTwo.values()) {
    if (bucket.length > 1) {
      grouped.push(bucket);
    } else {
      grouped.push([bucket[0]]);
    }
  }

  return grouped;
}

function isDomesticPath(path: Path) {
  if (path.length < 2) return false;
  const start = path[0];
  const end = path[path.length - 1];
  return start.startsWith("TW") && end.startsWith("TW");
}

export function computePathAvailability(
  cables?: CableStatusCable[],
  incidents?: CableStatusIncident[],
): PathAvailability {
  if (!cables || !incidents) {
    return { totalIntl: 0, remainingIntl: 0, totalDom: 0, remainingDom: 0 };
  }

  let totalIntl = 0;
  let remainingIntl = 0;
  let totalDom = 0;
  let remainingDom = 0;

  const activeIncidents = incidents.filter(isActiveIncident);

  cables.forEach((cable) => {
    if (!cable.available_path || cable.available_path.length === 0) return;

    const unavailableSegments = getUnavailableSegmentIds(cable);
    const validPaths = getValidPaths(cable);

    if (validPaths.length === 0) return;

    const downSegments = new Set(
      activeIncidents
        .filter((incident) => incident.cableid === cable.id)
        .map((incident) => incident.segment?.trim())
        .filter(
          (id): id is string =>
            Boolean(id && id.length > 0 && !unavailableSegments.has(id)),
        ),
    );

    const pathGroups = groupPaths(validPaths);

    pathGroups.forEach((paths) => {
      if (paths.length === 0) return;

      if (paths.length === 1) {
        const path = paths[0];
        const isUp = path.every((node) => !downSegments.has(node));
        const domestic = isDomesticPath(path);
        if (domestic) {
          totalDom += 1;
          if (isUp) remainingDom += 1;
        } else {
          totalIntl += 1;
          if (isUp) remainingIntl += 1;
        }
        return;
      }

      const prefixLen = commonPrefixLength(paths);
      if (prefixLen < 2) {
        paths.forEach((path) => {
          const isUp = path.every((node) => !downSegments.has(node));
          const domestic = isDomesticPath(path);
          if (domestic) {
            totalDom += 1;
            if (isUp) remainingDom += 1;
          } else {
            totalIntl += 1;
            if (isUp) remainingIntl += 1;
          }
        });
        return;
      }

      const groupDomestic = paths.every((path) => isDomesticPath(path));

      if (groupDomestic) {
        totalDom += 1;
      } else {
        totalIntl += 1;
      }

      const shared = paths[0].slice(0, prefixLen);
      const sharedDown = shared.some((node) => downSegments.has(node));
      if (sharedDown) return;

      const branchUp = paths.some((path) =>
        path.slice(prefixLen).every((node) => !downSegments.has(node)),
      );
      if (!branchUp) return;

      if (groupDomestic) {
        remainingDom += 1;
      } else {
        remainingIntl += 1;
      }
    });
  });

  return { totalIntl, remainingIntl, totalDom, remainingDom };
}
