import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Network } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import SidebarButton from "@/components/SidebarButton";
import {
  getTopologyEdgeStatus,
  getTopologyNodeStatuses,
  isAffectedTopologyStatus,
  type TopologyData,
  type TopologyNode,
} from "@/lib/topology";
import {
  isActiveIncident,
  type CableStatusCable,
  type CableStatusIncident,
  type TopologyRuntimeStatus,
} from "@/lib/cable-status";
import topologyJson from "@/data/topology.json" with { type: "json" };

interface Incident extends CableStatusIncident {
  date: string;
}

interface LayoutNode extends TopologyNode {
  x: number;
  y: number;
  width: number;
  height: number;
  status: TopologyRuntimeStatus;
}

const TOPOLOGY_DATA = topologyJson as TopologyData;
const SVG_PADDING_X = 72;
const LEVEL_GAP = 244;
const NODE_WIDTH = 168;
const NODE_HEIGHT = 52;
const STATUS_ORDER: TopologyRuntimeStatus[] = [
  "online",
  "partial_disconnected",
  "disconnected",
  "unknown",
];

const STATUS_COLORS: Record<
  TopologyRuntimeStatus,
  { fill: string; stroke: string; line: string; dot: string }
> = {
  online: {
    fill: "#052e26",
    stroke: "#34d399",
    line: "#34d399",
    dot: "#34d399",
  },
  partial_disconnected: {
    fill: "#3b2f05",
    stroke: "#facc15",
    line: "#facc15",
    dot: "#facc15",
  },
  disconnected: {
    fill: "#3b0a0a",
    stroke: "#f87171",
    line: "#f87171",
    dot: "#f87171",
  },
  unknown: {
    fill: "#111827",
    stroke: "#64748b",
    line: "#64748b",
    dot: "#94a3b8",
  },
};

const STATUS_BADGE_CLASSES: Record<TopologyRuntimeStatus, string> = {
  online: "border-emerald-400/25 bg-emerald-500/15 text-emerald-100",
  partial_disconnected: "border-yellow-400/25 bg-yellow-500/15 text-yellow-100",
  disconnected: "border-red-400/25 bg-red-500/15 text-red-100",
  unknown: "border-slate-400/25 bg-slate-500/15 text-slate-100",
};

async function loadCables(): Promise<CableStatusCable[]> {
  const modules = import.meta.glob<{ default: CableStatusCable }>(
    "/src/data/cables/*.json",
  );
  const cablePromises = Object.values(modules).map(async (loader) => {
    const module = await loader();
    return module.default;
  });
  return Promise.all(cablePromises);
}

async function loadIncidents(): Promise<Incident[]> {
  const res = await fetch("/data/incidents.json");
  if (!res.ok) throw new Error(`Failed to fetch incidents: ${res.status}`);
  const incidentsData = (await res.json()) as Incident[];
  incidentsData.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  return incidentsData;
}

function getNodeColumn(node: TopologyNode) {
  if (typeof node.level === "number") return node.level;
  if (node.type === "isp") return 0;
  if (node.type === "destination") return 2;
  return 1;
}

function createLayoutNodes(
  nodes: TopologyNode[],
  nodeStatuses: Record<string, TopologyRuntimeStatus>,
) {
  const groups = new Map<number, TopologyNode[]>();

  nodes.forEach((node) => {
    const level = getNodeColumn(node);
    const group = groups.get(level) ?? [];
    group.push(node);
    groups.set(level, group);
  });

  const sortedLevels = Array.from(groups.keys()).sort((a, b) => a - b);
  const maxRows = Math.max(1, ...Array.from(groups.values()).map((group) => group.length));
  const height = Math.max(360, NODE_HEIGHT + 104 + (maxRows - 1) * 84);
  const width = Math.max(
    760,
    SVG_PADDING_X * 2 + NODE_WIDTH + (sortedLevels.length - 1) * LEVEL_GAP,
  );
  const layoutNodes: LayoutNode[] = [];

  sortedLevels.forEach((level, columnIndex) => {
    const group = groups.get(level) ?? [];
    const groupHeight = NODE_HEIGHT + Math.max(0, group.length - 1) * 84;
    const startY = (height - groupHeight) / 2;

    group.forEach((node, index) => {
      layoutNodes.push({
        ...node,
        x: SVG_PADDING_X + columnIndex * LEVEL_GAP,
        y: startY + index * 84,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        status: nodeStatuses[node.id] ?? "unknown",
      });
    });
  });

  return {
    height,
    nodes: layoutNodes,
    width,
  };
}

function getEdgePath(source: LayoutNode, target: LayoutNode) {
  const sourceIsLeft = source.x <= target.x;
  const startX = sourceIsLeft ? source.x + source.width : source.x;
  const endX = sourceIsLeft ? target.x : target.x + target.width;
  const startY = source.y + source.height / 2;
  const endY = target.y + target.height / 2;
  const direction = endX >= startX ? 1 : -1;
  const controlOffset = Math.max(72, Math.abs(endX - startX) / 2);

  return [
    `M ${startX} ${startY}`,
    `C ${startX + controlOffset * direction} ${startY}`,
    `${endX - controlOffset * direction} ${endY}`,
    `${endX} ${endY}`,
  ].join(" ");
}

function truncateLabel(label: string, maxLength = 22) {
  if (label.length <= maxLength) return label;
  return `${label.slice(0, maxLength - 3)}...`;
}

function TopologyStatusBadge({
  status,
}: {
  status: TopologyRuntimeStatus;
}) {
  const { t } = useTranslation();
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs ${STATUS_BADGE_CLASSES[status]}`}
    >
      <span
        className="size-2 rounded-full"
        style={{ backgroundColor: STATUS_COLORS[status].dot }}
      />
      {t(`topology.status.${status}`)}
    </span>
  );
}

function TopologyStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
      <div className="text-xs text-white/55">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums text-white">
        {value}
      </div>
    </div>
  );
}

function EmptyTopology() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-[320px] items-center justify-center rounded-lg border border-white/10 bg-white/5 p-6 text-center">
      <div className="flex max-w-sm flex-col items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-lg border border-white/10 bg-black/20">
          <Network className="size-6 text-white/70" />
        </div>
        <div>
          <div className="text-base font-semibold text-white">
            {t("topology.empty.title")}
          </div>
          <p className="mt-1 text-sm leading-relaxed text-white/60">
            {t("topology.empty.description")}
          </p>
        </div>
      </div>
    </div>
  );
}

function LoadingTopology() {
  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-3">
        <Skeleton className="h-[70px] rounded-lg" />
        <Skeleton className="h-[70px] rounded-lg" />
        <Skeleton className="h-[70px] rounded-lg" />
      </div>
      <Skeleton className="h-[420px] rounded-lg" />
    </div>
  );
}

function TopologySvg({
  topology,
  nodeStatuses,
}: {
  topology: TopologyData;
  nodeStatuses: Record<string, TopologyRuntimeStatus>;
}) {
  const { t } = useTranslation();
  const layout = useMemo(
    () => createLayoutNodes(topology.nodes, nodeStatuses),
    [topology.nodes, nodeStatuses],
  );
  const nodeById = new Map(layout.nodes.map((node) => [node.id, node]));

  return (
    <div className="overflow-x-auto rounded-lg border border-white/10 bg-black/20">
      <svg
        role="img"
        aria-label={t("topology.title")}
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        className="min-h-[360px] w-full min-w-[760px]"
      >
        <g fill="none">
          {topology.edges.map((edge) => {
            const source = nodeById.get(edge.source);
            const target = nodeById.get(edge.target);
            if (!source || !target) return null;
            const status = getTopologyEdgeStatus(edge, nodeStatuses);
            const color = STATUS_COLORS[status].line;

            return (
              <path
                key={edge.id ?? `${edge.source}-${edge.target}`}
                d={getEdgePath(source, target)}
                stroke={color}
                strokeWidth={2.5}
                strokeOpacity={status === "unknown" ? 0.45 : 0.75}
              />
            );
          })}
        </g>

        {layout.nodes.map((node) => {
          const colors = STATUS_COLORS[node.status];
          return (
            <g key={node.id} transform={`translate(${node.x} ${node.y})`}>
              <title>
                {node.label} - {t(`topology.status.${node.status}`)}
              </title>
              <rect
                width={node.width}
                height={node.height}
                rx={8}
                fill={colors.fill}
                fillOpacity={0.9}
                stroke={colors.stroke}
                strokeOpacity={0.75}
              />
              <circle
                cx={node.width - 16}
                cy={16}
                r={5}
                fill={colors.dot}
              />
              <text
                x={14}
                y={22}
                fill="#f8fafc"
                fontSize={13}
                fontWeight={600}
              >
                {truncateLabel(node.label)}
              </text>
              <text x={14} y={40} fill="#94a3b8" fontSize={10}>
                {t(`topology.types.${node.type}`)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function TopologyContent({
  topology,
  cables,
  incidents,
  isLoading,
}: {
  topology: TopologyData;
  cables: CableStatusCable[];
  incidents: Incident[];
  isLoading: boolean;
}) {
  const { t } = useTranslation();
  const nodeStatuses = useMemo(
    () => getTopologyNodeStatuses(topology, cables, incidents),
    [topology, cables, incidents],
  );

  if (topology.nodes.length === 0) {
    return <EmptyTopology />;
  }

  if (isLoading) {
    return <LoadingTopology />;
  }

  const ispNodes = topology.nodes.filter((node) => node.type === "isp");
  const affectedIspCount = ispNodes.filter((node) =>
    isAffectedTopologyStatus(nodeStatuses[node.id] ?? "unknown"),
  ).length;
  const activeIncidentCount = incidents.filter(isActiveIncident).length;

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-3">
        <TopologyStat
          label={t("topology.summary.affectedIsps")}
          value={`${affectedIspCount}/${ispNodes.length}`}
        />
        <TopologyStat
          label={t("topology.summary.activeIncidents")}
          value={activeIncidentCount}
        />
        <TopologyStat
          label={t("topology.summary.nodes")}
          value={topology.nodes.length}
        />
      </div>

      <TopologySvg topology={topology} nodeStatuses={nodeStatuses} />

      <div className="flex flex-wrap gap-2">
        {STATUS_ORDER.map((status) => (
          <TopologyStatusBadge key={status} status={status} />
        ))}
      </div>
    </div>
  );
}

export function TopologyView({ isActive }: { isActive: boolean }) {
  const hasTopologyData = TOPOLOGY_DATA.nodes.length > 0;

  const { data: cables = [], isLoading: cablesLoading } = useQuery({
    queryKey: ["topology", "cables"],
    queryFn: loadCables,
    enabled: isActive && hasTopologyData,
  });

  const { data: incidents = [], isLoading: incidentsLoading } = useQuery({
    queryKey: ["incidents"],
    queryFn: loadIncidents,
    enabled: isActive && hasTopologyData,
  });

  return (
    <TopologyContent
      topology={TOPOLOGY_DATA}
      cables={cables}
      incidents={incidents}
      isLoading={hasTopologyData && (cablesLoading || incidentsLoading)}
    />
  );
}

export default function TopologyDialog() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <SidebarButton>
              <Network className="size-5" />
            </SidebarButton>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t("topology.title")}</p>
        </TooltipContent>
      </Tooltip>
      <DialogContent className="p-0 sm:max-w-5xl">
        <ScrollArea className="h-full max-h-[82vh] overflow-y-auto">
          <div className="p-6">
            <DialogHeader className="mb-3">
              <DialogTitle>{t("topology.title")}</DialogTitle>
              <DialogDescription className="sr-only">
                {t("topology.title")}
              </DialogDescription>
            </DialogHeader>
            <TopologyView isActive={open} />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
