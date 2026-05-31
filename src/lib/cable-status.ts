export type Path = string[];

export type SegmentRuntimeStatus =
  | "normal"
  | "broken"
  | "partial_disconnected";

export type TopologyRuntimeStatus =
  | "online"
  | "partial_disconnected"
  | "disconnected"
  | "unknown";

export interface CableStatusSegment {
  id: string;
  hidden?: boolean;
  color?: string;
  retired?: boolean;
  building?: boolean;
}

export interface CableStatusCable {
  id: string;
  name?: string;
  color?: string;
  building?: boolean;
  available_path?: Path[];
  segments?: CableStatusSegment[];
}

export interface CableStatusIncident {
  status: string;
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

export const TOPOLOGY_STATUS_RANK: Record<TopologyRuntimeStatus, number> = {
  unknown: -1,
  online: 0,
  partial_disconnected: 1,
  disconnected: 2,
};

export function isActiveIncident(incident: CableStatusIncident) {
  return !incident.resolved_at || incident.resolved_at.trim() === "";
}

export function isBuildingSegment(
  segment: CableStatusSegment,
  cable: CableStatusCable,
) {
  return Boolean(cable.building || segment.building);
}

// Path-propagation logic: if any segment on a path is affected,
// all segments on that path are considered broken (no available route).
export function markBroken(paths: Path[], inputNodes: string[]) {
  const failedPaths = new Set<string>();
  for (const node of inputNodes) {
    for (const path of paths) {
      if (path.includes(node)) failedPaths.add(JSON.stringify(path));
    }
  }
  const failedPathsArray = Array.from(failedPaths).map(
    (p) => JSON.parse(p) as Path,
  );
  const flatAll = paths.flat();
  const flatFailed = failedPathsArray.flat();
  const failedNodesSet = new Set(flatFailed);
  const out: string[] = [];
  for (const node of failedNodesSet) {
    const countAll = flatAll.filter((n) => n === node).length;
    const countFailed = flatFailed.filter((n) => n === node).length;
    if (countAll === countFailed) out.push(node);
  }
  return out.sort();
}

export function getUnavailableSegmentIds(cable: CableStatusCable) {
  return new Set(
    cable.segments
      ?.filter((segment) => segment.retired || isBuildingSegment(segment, cable))
      .map((segment) => segment.id) ?? [],
  );
}

export function getValidPaths(cable: CableStatusCable) {
  const unavailableSegmentIds = getUnavailableSegmentIds(cable);
  return (
    cable.available_path?.filter(
      (path) => !path.some((node) => unavailableSegmentIds.has(node)),
    ) ?? []
  );
}

export function getSegmentStatus(
  segment: CableStatusSegment,
  cable: CableStatusCable,
  incidents: CableStatusIncident[],
): SegmentRuntimeStatus {
  if (isBuildingSegment(segment, cable)) return "normal";

  const activeIncidents = incidents.filter(
    (incident) => incident.cableid === cable.id && isActiveIncident(incident),
  );
  if (activeIncidents.length > 0 && cable.available_path) {
    const unavailableSegmentIds = getUnavailableSegmentIds(cable);
    const validPaths = getValidPaths(cable);
    if (validPaths.length === 0) {
      // No valid paths; fall through to normal status.
    } else {
      // Run markBroken only on non-partial incidents so that partial_disconnected
      // segments with alternative routes are not incorrectly marked as fully broken.
      const disconnectedIncidents = activeIncidents.filter(
        (incident) => incident.status !== "partial_disconnected",
      );
      if (disconnectedIncidents.length > 0) {
        const affectedSegments = disconnectedIncidents
          .map((incident) => incident.segment?.trim())
          .filter(
            (id): id is string =>
              Boolean(id && id.length > 0 && !unavailableSegmentIds.has(id)),
          );
        const brokenSegments = markBroken(validPaths, affectedSegments);
        if (brokenSegments.includes(segment.id)) return "broken";
      }

      // For partial_disconnected, also propagate along the same logical paths
      // so upstream/downstream segments share the partial highlight.
      const partialIncidents = activeIncidents.filter(
        (incident) => incident.status === "partial_disconnected",
      );
      const directPartialSegments = partialIncidents
        .map((incident) => incident.segment?.trim())
        .filter(
          (id): id is string =>
            Boolean(id && id.length > 0 && !unavailableSegmentIds.has(id)),
        );

      const propagatedPartialSegments =
        directPartialSegments.length > 0
          ? markBroken(validPaths, directPartialSegments)
          : [];

      const partialSegmentsSet = new Set([
        ...directPartialSegments,
        ...propagatedPartialSegments,
      ]);

      if (partialSegmentsSet.has(segment.id)) return "partial_disconnected";
    }
  }
  return "normal";
}

export function getSegmentColor(
  segment: CableStatusSegment,
  cable: CableStatusCable,
  incidents: CableStatusIncident[],
) {
  if (segment.retired) return "#292a2f";
  if (isBuildingSegment(segment, cable)) return "#292a2f";
  if (segment.color) return segment.color;
  const status = getSegmentStatus(segment, cable, incidents);
  if (status === "broken") return "#ff0000";
  if (status === "partial_disconnected") return "#fcc800";
  return cable.color || "#48A9FF";
}

export function getWorstTopologyStatus(
  statuses: Iterable<TopologyRuntimeStatus>,
): TopologyRuntimeStatus {
  let worst: TopologyRuntimeStatus = "unknown";
  for (const status of statuses) {
    if (TOPOLOGY_STATUS_RANK[status] > TOPOLOGY_STATUS_RANK[worst]) {
      worst = status;
    }
  }
  return worst;
}

export function getTopologyStatusFromIncidentStatus(status: string) {
  if (status === "partial_disconnected") return "partial_disconnected";
  return "disconnected";
}

export function getTopologyStatusFromSegmentStatus(
  status: SegmentRuntimeStatus,
): TopologyRuntimeStatus {
  if (status === "broken") return "disconnected";
  if (status === "partial_disconnected") return "partial_disconnected";
  return "online";
}

export function getSegmentTopologyStatus(
  cable: CableStatusCable,
  segmentId: string,
  incidents: CableStatusIncident[],
): TopologyRuntimeStatus {
  const segment = cable.segments?.find((item) => item.id === segmentId);
  if (!segment) return "unknown";
  return getTopologyStatusFromSegmentStatus(
    getSegmentStatus(segment, cable, incidents),
  );
}

export function getCableTopologyStatus(
  cable: CableStatusCable,
  incidents: CableStatusIncident[],
): TopologyRuntimeStatus {
  const activeIncidents = incidents.filter(
    (incident) => incident.cableid === cable.id && isActiveIncident(incident),
  );
  if (activeIncidents.length === 0) return "online";

  const segmentStatuses =
    cable.segments
      ?.filter((segment) => !segment.retired && !isBuildingSegment(segment, cable))
      .map((segment) => getSegmentTopologyStatus(cable, segment.id, incidents)) ??
    [];
  const worstSegmentStatus = getWorstTopologyStatus(segmentStatuses);
  if (worstSegmentStatus !== "online" && worstSegmentStatus !== "unknown") {
    return worstSegmentStatus;
  }

  const cableLevelIncident = activeIncidents.find(
    (incident) => !incident.segment || incident.segment.trim() === "",
  );
  if (cableLevelIncident) {
    return getTopologyStatusFromIncidentStatus(cableLevelIncident.status);
  }

  return worstSegmentStatus === "unknown" ? "unknown" : "online";
}

export function getPathTopologyStatus(
  cable: CableStatusCable,
  path: Path,
  incidents: CableStatusIncident[],
): TopologyRuntimeStatus {
  const unavailableSegmentIds = getUnavailableSegmentIds(cable);
  const segmentIds = new Set(cable.segments?.map((segment) => segment.id) ?? []);
  const pathSegmentIds = path.filter((node) => segmentIds.has(node));
  const availablePathSegmentIds = pathSegmentIds.filter(
    (segmentId) => !unavailableSegmentIds.has(segmentId),
  );

  if (availablePathSegmentIds.length === 0) return "unknown";

  const pathSegmentIdSet = new Set(availablePathSegmentIds);
  const statuses: TopologyRuntimeStatus[] = incidents
    .filter((incident) => incident.cableid === cable.id && isActiveIncident(incident))
    .flatMap((incident) => {
      const incidentSegment = incident.segment?.trim();
      if (!incidentSegment) {
        return [getTopologyStatusFromIncidentStatus(incident.status)];
      }
      if (!pathSegmentIdSet.has(incidentSegment)) return [];
      return [getTopologyStatusFromIncidentStatus(incident.status)];
    });

  if (statuses.length === 0) return "online";
  return getWorstTopologyStatus(statuses);
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
