import {
  getSegmentTopologyStatus,
  type CableStatusCable,
  type CableStatusIncident,
  type TopologyRuntimeStatus,
} from "@/lib/cable-status";

export type TopologyNodeType = "isp" | "segment" | "destination";

export type TopologyDependency = string[];

export interface TopologyNode {
  id: string;
  label: string;
  type: TopologyNodeType;
  level?: number;
  dependency?: TopologyDependency;
}

export interface TopologyEdge {
  id?: string;
  source: string;
  target: string;
}

export interface TopologyData {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
}

export type TopologyStatusMap = Record<string, TopologyRuntimeStatus>;

function getDependencyStatus(
  dependency: TopologyDependency,
  cableBySegmentId: Map<string, CableStatusCable>,
  incidents: CableStatusIncident[],
): TopologyRuntimeStatus {
  if (dependency.length === 0) return "unknown";

  const statuses = dependency.map((segmentId) => {
    const cable = cableBySegmentId.get(segmentId);
    if (!cable) return "unknown";
    return getSegmentTopologyStatus(cable, segmentId, incidents);
  });

  if (statuses.some((status) => status === "disconnected")) {
    return "disconnected";
  }
  if (statuses.some((status) => status === "partial_disconnected")) {
    return "partial_disconnected";
  }
  if (statuses.some((status) => status === "online")) return "online";
  return "unknown";
}

function getOutgoingNodeIds(nodeId: string, edges: TopologyEdge[]) {
  return edges
    .filter((edge) => edge.source === nodeId)
    .map((edge) => edge.target);
}

function getIncomingNodeIds(nodeId: string, edges: TopologyEdge[]) {
  return edges
    .filter((edge) => edge.target === nodeId)
    .map((edge) => edge.source);
}

function aggregateDependencyStatuses(
  statuses: TopologyRuntimeStatus[],
): TopologyRuntimeStatus {
  if (statuses.length === 0) return "unknown";
  if (statuses.every((status) => status === "unknown")) return "unknown";
  if (statuses.every((status) => status === "disconnected")) {
    return "disconnected";
  }
  if (statuses.some(isAffectedTopologyStatus)) return "partial_disconnected";
  if (statuses.some((status) => status === "online")) return "online";
  return "unknown";
}

function getAggregatedNodeStatus(
  nodeIds: string[],
  statuses: Map<string, TopologyRuntimeStatus>,
) {
  return aggregateDependencyStatuses(
    nodeIds.map((nodeId) => statuses.get(nodeId) ?? "unknown"),
  );
}

function getDerivedNodeStatus(
  node: TopologyNode,
  edges: TopologyEdge[],
  statuses: Map<string, TopologyRuntimeStatus>,
) {
  const outgoingStatus = getAggregatedNodeStatus(
    getOutgoingNodeIds(node.id, edges),
    statuses,
  );

  if (outgoingStatus !== "unknown" || node.type === "isp") {
    return outgoingStatus;
  }

  return getAggregatedNodeStatus(getIncomingNodeIds(node.id, edges), statuses);
}

export function getTopologyNodeStatuses(
  topology: TopologyData,
  cables: CableStatusCable[],
  incidents: CableStatusIncident[],
): TopologyStatusMap {
  const cableBySegmentId = new Map<string, CableStatusCable>();
  for (const cable of cables) {
    for (const segment of cable.segments ?? []) {
      cableBySegmentId.set(segment.id, cable);
    }
  }
  const directStatuses = new Map<string, TopologyRuntimeStatus>();
  const statuses = new Map<string, TopologyRuntimeStatus>();

  for (const node of topology.nodes) {
    const status = node.dependency
      ? getDependencyStatus(node.dependency, cableBySegmentId, incidents)
      : undefined;
    if (status) {
      directStatuses.set(node.id, status);
      statuses.set(node.id, status);
    } else {
      statuses.set(node.id, "unknown");
    }
  }

  for (let pass = 0; pass < topology.nodes.length; pass += 1) {
    let changed = false;

    for (const node of topology.nodes) {
      if (directStatuses.has(node.id)) continue;

      const nextStatus = getDerivedNodeStatus(node, topology.edges, statuses);
      if (nextStatus !== statuses.get(node.id)) {
        statuses.set(node.id, nextStatus);
        changed = true;
      }
    }

    if (!changed) break;
  }

  return Object.fromEntries(statuses);
}

export function getTopologyEdgeStatus(
  edge: TopologyEdge,
  nodeStatuses: TopologyStatusMap,
): TopologyRuntimeStatus {
  return nodeStatuses[edge.target] ?? nodeStatuses[edge.source] ?? "unknown";
}

export function isAffectedTopologyStatus(status: TopologyRuntimeStatus) {
  return status === "disconnected" || status === "partial_disconnected";
}
