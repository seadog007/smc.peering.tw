import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Minus, Network, Plus, RotateCcw } from "lucide-react";
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

type TopologyDirection = "horizontal" | "vertical";
type TopologyFolding = "one" | "two";

interface TopologyLayoutOptions {
  direction: TopologyDirection;
  folding: TopologyFolding;
}

const TOPOLOGY_DATA = topologyJson as TopologyData;
const SVG_PADDING_X = 72;
const SVG_PADDING_Y = 48;
const LEVEL_GAP = 112;
const NODE_COLUMN_GAP = 196;
const NODE_ROW_GAP = 84;
const NODE_WIDTH = 168;
const NODE_HEIGHT = 52;
const FOLDING_THRESHOLD = 10;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.25;
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

function createFoldedGroups(nodes: TopologyNode[], folding: TopologyFolding) {
  if (folding === "one" || nodes.length <= FOLDING_THRESHOLD) return [nodes];

  const splitIndex = Math.ceil(nodes.length / 2);
  return [nodes.slice(0, splitIndex), nodes.slice(splitIndex)].filter(
    (group) => group.length > 0,
  );
}

function createLayoutNodes(
  nodes: TopologyNode[],
  nodeStatuses: Record<string, TopologyRuntimeStatus>,
  options: TopologyLayoutOptions,
) {
  const groups = new Map<number, TopologyNode[]>();

  nodes.forEach((node) => {
    const level = getNodeColumn(node);
    const group = groups.get(level) ?? [];
    group.push(node);
    groups.set(level, group);
  });

  const sortedLevels = Array.from(groups.keys()).sort((a, b) => a - b);
  const levelLayouts = sortedLevels.map((level) => {
    const group = groups.get(level) ?? [];
    const lanes = createFoldedGroups(group, options.folding);
    const isVertical = options.direction === "vertical";
    const laneLengths = lanes.map((lane) => lane.length);
    const width = isVertical
      ? Math.max(
          NODE_WIDTH,
          ...laneLengths.map(
            (length) => NODE_WIDTH + Math.max(0, length - 1) * NODE_COLUMN_GAP,
          ),
        )
      : NODE_WIDTH + Math.max(0, lanes.length - 1) * NODE_COLUMN_GAP;
    const height = isVertical
      ? NODE_HEIGHT + Math.max(0, lanes.length - 1) * NODE_ROW_GAP
      : Math.max(
          NODE_HEIGHT,
          ...laneLengths.map(
            (length) => NODE_HEIGHT + Math.max(0, length - 1) * NODE_ROW_GAP,
          ),
        );

    return {
      height,
      lanes,
      level,
      width,
    };
  });
  const maxLevelWidth = Math.max(
    NODE_WIDTH,
    ...levelLayouts.map((level) => level.width),
  );
  const maxLevelHeight = Math.max(
    NODE_HEIGHT,
    ...levelLayouts.map((level) => level.height),
  );
  const width =
    options.direction === "vertical"
      ? Math.max(760, SVG_PADDING_X * 2 + maxLevelWidth)
      : Math.max(
          760,
          SVG_PADDING_X * 2 +
            levelLayouts.reduce((total, level) => total + level.width, 0) +
            Math.max(0, levelLayouts.length - 1) * LEVEL_GAP,
        );
  const height =
    options.direction === "vertical"
      ? Math.max(
          360,
          SVG_PADDING_Y * 2 +
            levelLayouts.reduce((total, level) => total + level.height, 0) +
            Math.max(0, levelLayouts.length - 1) * LEVEL_GAP,
        )
      : Math.max(360, SVG_PADDING_Y * 2 + maxLevelHeight);
  const layoutNodes: LayoutNode[] = [];

  if (options.direction === "vertical") {
    let y = SVG_PADDING_Y;

    levelLayouts.forEach((levelLayout) => {
      levelLayout.lanes.forEach((row, rowIndex) => {
        const rowWidth =
          NODE_WIDTH + Math.max(0, row.length - 1) * NODE_COLUMN_GAP;
        const startX = (width - rowWidth) / 2;

        row.forEach((node, index) => {
          layoutNodes.push({
            ...node,
            x: startX + index * NODE_COLUMN_GAP,
            y: y + rowIndex * NODE_ROW_GAP,
            width: NODE_WIDTH,
            height: NODE_HEIGHT,
            status: nodeStatuses[node.id] ?? "unknown",
          });
        });
      });

      y += levelLayout.height + LEVEL_GAP;
    });
  } else {
    let x = SVG_PADDING_X;

    levelLayouts.forEach((levelLayout) => {
      const levelStartY = (height - levelLayout.height) / 2;

      levelLayout.lanes.forEach((column, columnIndex) => {
        const columnHeight =
          NODE_HEIGHT + Math.max(0, column.length - 1) * NODE_ROW_GAP;
        const columnStartY =
          levelStartY + (levelLayout.height - columnHeight) / 2;

        column.forEach((node, index) => {
          layoutNodes.push({
            ...node,
            x: x + columnIndex * NODE_COLUMN_GAP,
            y: columnStartY + index * NODE_ROW_GAP,
            width: NODE_WIDTH,
            height: NODE_HEIGHT,
            status: nodeStatuses[node.id] ?? "unknown",
          });
        });
      });

      x += levelLayout.width + LEVEL_GAP;
    });
  }

  return {
    height,
    nodes: layoutNodes,
    width,
  };
}

function getEdgePath(
  source: LayoutNode,
  target: LayoutNode,
  direction: TopologyDirection,
) {
  if (direction === "horizontal") {
    const sourceIsLeft = source.x <= target.x;
    const startX = sourceIsLeft ? source.x + source.width : source.x;
    const endX = sourceIsLeft ? target.x : target.x + target.width;
    const startY = source.y + source.height / 2;
    const endY = target.y + target.height / 2;
    const directionMultiplier = sourceIsLeft ? 1 : -1;
    const controlOffset = Math.max(72, Math.abs(endX - startX) / 2);

    return [
      `M ${startX} ${startY}`,
      `C ${startX + controlOffset * directionMultiplier} ${startY}`,
      `${endX - controlOffset * directionMultiplier} ${endY}`,
      `${endX} ${endY}`,
    ].join(" ");
  }

  const startX = source.x + source.width / 2;
  const endX = target.x + target.width / 2;
  const startY = source.y + source.height;
  const endY = target.y;
  const controlOffset = Math.max(48, Math.abs(endY - startY) / 2);

  return [
    `M ${startX} ${startY}`,
    `C ${startX} ${startY + controlOffset}`,
    `${endX} ${endY - controlOffset}`,
    `${endX} ${endY}`,
  ].join(" ");
}

function truncateLabel(label: string, maxLength = 22) {
  if (label.length <= maxLength) return label;
  return `${label.slice(0, maxLength - 3)}...`;
}

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

function snapZoom(value: number, direction: "down" | "nearest" = "nearest") {
  const scaled = value / ZOOM_STEP;
  const rounded =
    direction === "down" ? Math.floor(scaled) : Math.round(scaled);
  return clampZoom(rounded * ZOOM_STEP);
}

function getFitTransform(
  layout: { width: number; height: number },
  viewport: { width: number; height: number },
) {
  const padding = 32;
  const availableWidth = Math.max(1, viewport.width - padding);
  const availableHeight = Math.max(1, viewport.height - padding);
  const fitZoom = Math.min(
    availableWidth / layout.width,
    availableHeight / layout.height,
    1,
  );
  const zoom = snapZoom(fitZoom, "down");

  return {
    zoom,
    pan: {
      x: (viewport.width - layout.width * zoom) / 2,
      y: (viewport.height - layout.height * zoom) / 2,
    },
  };
}

function TopologySegmentedControl<TValue extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: TValue; label: string }[];
  value: TValue;
  onChange: (value: TValue) => void;
}) {
  return (
    <div
      className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 p-1"
      role="group"
      aria-label={label}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
              isActive
                ? "bg-white text-slate-950"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
            aria-pressed={isActive}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function TopologyZoomButton({
  children,
  label,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className="flex size-8 items-center justify-center rounded-md border border-white/10 bg-white/10 text-white/80 transition-colors hover:bg-white/15 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
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
    <div className="min-w-0 rounded-lg border border-white/10 bg-white/5 px-2 py-2 sm:px-3">
      <div className="truncate text-[11px] text-white/55 sm:text-xs">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold tabular-nums text-white sm:text-xl">
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
    <div className="w-full min-w-[760px] space-y-3">
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
  const viewportRef = useRef<HTMLDivElement>(null);
  const [direction, setDirection] =
    useState<TopologyDirection>("horizontal");
  const [folding, setFolding] = useState<TopologyFolding>("two");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({
    panX: 0,
    panY: 0,
    x: 0,
    y: 0,
  });
  const layout = useMemo(
    () =>
      createLayoutNodes(topology.nodes, nodeStatuses, { direction, folding }),
    [topology.nodes, nodeStatuses, direction, folding],
  );
  const nodeById = new Map(layout.nodes.map((node) => [node.id, node]));
  const canZoomOut = zoom > MIN_ZOOM;
  const canZoomIn = zoom < MAX_ZOOM;
  const foldingOptions =
    direction === "horizontal"
      ? [
          {
            value: "two" as const,
            label: t("topology.controls.twoColumns"),
          },
          {
            value: "one" as const,
            label: t("topology.controls.oneColumn"),
          },
        ]
      : [
          {
            value: "two" as const,
            label: t("topology.controls.twoRows"),
          },
          {
            value: "one" as const,
            label: t("topology.controls.oneRow"),
          },
        ];
  const fitToViewport = () => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const next = getFitTransform(layout, {
      width: viewport.clientWidth,
      height: viewport.clientHeight,
    });
    setZoom(next.zoom);
    setPan(next.pan);
  };

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const initial = getFitTransform(layout, {
      width: viewport.clientWidth,
      height: viewport.clientHeight,
    });
    setZoom(initial.zoom);
    setPan(initial.pan);

    const resizeObserver = new ResizeObserver(() => {
      const next = getFitTransform(layout, {
        width: viewport.clientWidth,
        height: viewport.clientHeight,
      });
      setZoom(next.zoom);
      setPan(next.pan);
    });

    resizeObserver.observe(viewport);
    return () => resizeObserver.disconnect();
  }, [direction, folding, layout.height, layout.width]);

  return (
    <div className="rounded-lg border border-white/10 bg-black/20">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 p-2">
        <div className="flex flex-wrap items-center gap-2">
          <TopologySegmentedControl
            label={t("topology.controls.direction")}
            options={[
              {
                value: "horizontal",
                label: t("topology.controls.horizontal"),
              },
              {
                value: "vertical",
                label: t("topology.controls.vertical"),
              },
            ]}
            value={direction}
            onChange={setDirection}
          />
          <TopologySegmentedControl
            label={t("topology.controls.folding")}
            options={foldingOptions}
            value={folding}
            onChange={setFolding}
          />
        </div>
        <div className="flex items-center gap-2">
          <TopologyZoomButton
            label="Zoom out"
            onClick={() => setZoom((value) => snapZoom(value - ZOOM_STEP))}
            disabled={!canZoomOut}
          >
            <Minus className="size-4" />
          </TopologyZoomButton>
          <div className="min-w-14 text-center text-xs font-medium tabular-nums text-white/70">
            {Math.round(zoom * 100)}%
          </div>
          <TopologyZoomButton
            label="Zoom in"
            onClick={() => setZoom((value) => snapZoom(value + ZOOM_STEP))}
            disabled={!canZoomIn}
          >
            <Plus className="size-4" />
          </TopologyZoomButton>
          <TopologyZoomButton label="Reset zoom" onClick={fitToViewport}>
            <RotateCcw className="size-4" />
          </TopologyZoomButton>
        </div>
      </div>
      <div
        ref={viewportRef}
        className={`h-[420px] overflow-hidden md:h-[520px] ${isPanning ? "cursor-grabbing" : "cursor-grab"}`}
        style={{ touchAction: "none", userSelect: "none" }}
        onPointerDown={(event) => {
          const viewport = event.currentTarget;
          if (event.pointerType === "mouse" && event.button !== 0) return;

          event.preventDefault();
          panStartRef.current = {
            x: event.clientX,
            y: event.clientY,
            panX: pan.x,
            panY: pan.y,
          };
          setIsPanning(true);
          viewport.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const viewport = event.currentTarget;
          if (!viewport || !isPanning) return;

          event.preventDefault();
          const deltaX = event.clientX - panStartRef.current.x;
          const deltaY = event.clientY - panStartRef.current.y;
          setPan({
            x: panStartRef.current.panX + deltaX,
            y: panStartRef.current.panY + deltaY,
          });
        }}
        onPointerUp={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
          setIsPanning(false);
        }}
        onPointerCancel={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
          setIsPanning(false);
        }}
      >
        <svg
          role="img"
          aria-label={t("topology.title")}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          className="block"
          style={{
            width: `${layout.width}px`,
            height: `${layout.height}px`,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
            willChange: "transform",
          }}
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
                  d={getEdgePath(source, target, direction)}
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
    <div className="w-full space-y-3 md:w-[976px] md:max-w-[976px]">
      <div className="grid grid-cols-3 gap-2">
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
