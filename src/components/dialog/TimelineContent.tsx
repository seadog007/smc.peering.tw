import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useFormatDate } from "@/lib/utils";

interface Cable {
  id: string;
  name: string;
}

interface TimelineSegment {
  startTime: Date;
  endTime: Date;
  status: "online" | "disconnected" | "partial_disconnected" | "notice";
}

interface Incident {
  date: string;
  status: string;
  cableid: string;
  segment: string;
  description: string;
  resolved_at: string;
}

interface UptimeTimelineProps {
  cables: Cable[];
  startDate: Date;
  endDate: Date;
}

const DAY_IN_MS = 24 * 60 * 60 * 1000;

type TimelineStatus = TimelineSegment["status"] | "unknown";

interface TimelinePoint {
  id: string;
  label: string;
  value: number;
  status: TimelineStatus;
  rangeStart: string;
  rangeEnd: string;
  durationMs: number;
  tooltipStart: string;
  tooltipEnd?: string;
  incidentDescription?: string;
}

interface CableTimeline {
  segments: TimelineSegment[];
  points: TimelinePoint[];
  uptimePercent: number;
  latestStatus: TimelineStatus;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function clampDate(date: Date, min: Date, max: Date) {
  const time = date.getTime();
  const minTime = min.getTime();
  const maxTime = max.getTime();
  if (time < minTime) {
    return new Date(minTime);
  }
  if (time > maxTime) {
    return new Date(maxTime);
  }
  return date;
}

function buildTimelineSegments(
  cables: Cable[],
  incidents: Incident[],
  startDate: Date,
  endDate: Date,
) {
  const segmentsByCable: Record<string, TimelineSegment[]> = {};

  cables.forEach((cable) => {
    segmentsByCable[cable.id] = [
      {
        startTime: new Date(startDate),
        endTime: new Date(endDate),
        status: "online",
      },
    ];
  });

  const sortedIncidents = [...incidents].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  sortedIncidents.forEach((incident) => {
    const cableId = incident.cableid;
    if (!segmentsByCable[cableId]) {
      segmentsByCable[cableId] = [
        {
          startTime: new Date(startDate),
          endTime: new Date(endDate),
          status: "online",
        },
      ];
    }

    const incidentStart = clampDate(
      new Date(incident.date),
      startDate,
      endDate,
    );
    const incidentEndRaw = incident.resolved_at
      ? new Date(incident.resolved_at)
      : endDate;
    const incidentEnd = clampDate(incidentEndRaw, startDate, endDate);

    if (incidentEnd.getTime() <= incidentStart.getTime()) {
      return;
    }

    if (incidentEnd <= startDate || incidentStart >= endDate) {
      return;
    }

    const currentSegments = segmentsByCable[cableId];
    const targetSegment = currentSegments.find(
      (segment) =>
        segment.status === "online" &&
        incidentStart < segment.endTime &&
        incidentEnd > segment.startTime,
    );

    if (!targetSegment) {
      return;
    }

    segmentsByCable[cableId] = currentSegments.filter(
      (segment) => segment !== targetSegment,
    );

    const beforeStart = targetSegment.startTime;
    const afterEnd = targetSegment.endTime;

    if (incidentStart > beforeStart) {
      segmentsByCable[cableId].push({
        startTime: new Date(beforeStart),
        endTime: new Date(incidentStart),
        status: "online",
      });
    }

    segmentsByCable[cableId].push({
      startTime: new Date(incidentStart),
      endTime: new Date(incidentEnd),
      status: incident.status as TimelineSegment["status"],
    });

    if (incidentEnd < afterEnd) {
      segmentsByCable[cableId].push({
        startTime: new Date(incidentEnd),
        endTime: new Date(afterEnd),
        status: "online",
      });
    }
  });

  Object.values(segmentsByCable).forEach((segments) => {
    segments.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  });

  return segmentsByCable;
}

const STATUS_PRIORITY: Record<TimelineStatus, number> = {
  online: 0,
  notice: 1,
  partial_disconnected: 2,
  disconnected: 3,
  unknown: -1,
};

function selectStatus(statuses: TimelineSegment["status"][]): TimelineStatus {
  if (statuses.length === 0) {
    return "online";
  }
  return statuses.reduce<TimelineStatus>((current, candidate) => {
    return STATUS_PRIORITY[candidate] > STATUS_PRIORITY[current]
      ? candidate
      : current;
  }, "online");
}

function createTimelinePoints(
  segments: TimelineSegment[],
  incidents: Incident[],
  startDate: Date,
  endDate: Date,
) {
  const points: TimelinePoint[] = [];
  if (endDate <= startDate) {
    const iso = startDate.toISOString();
    return [
      {
        id: iso,
        label: iso,
        value: 1,
        status: "online" as TimelineStatus,
        rangeStart: iso,
        rangeEnd: iso,
        durationMs: 1,
        tooltipStart: iso,
        tooltipEnd: iso,
      },
    ];
  }

  const sortedIncidents = [...incidents].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const start = startOfDay(startDate).getTime();
  const end = endDate.getTime();
  const totalDays = Math.ceil((end - start) / DAY_IN_MS);
  const useWeeklyBuckets = totalDays > 90;
  const bucketSizeMs = useWeeklyBuckets ? DAY_IN_MS * 7 : DAY_IN_MS;

  for (let cursor = start; cursor < end; cursor += bucketSizeMs) {
    const bucketStart = cursor;
    const bucketEnd = Math.min(cursor + bucketSizeMs, end);

    const intersectingSegments = segments.filter(
      (segment) =>
        segment.startTime.getTime() < bucketEnd &&
        segment.endTime.getTime() > bucketStart,
    );

    const bucketStatuses = intersectingSegments.map(
      (segment) => segment.status,
    );
    const status = selectStatus(bucketStatuses);

    const relatedIncident = sortedIncidents.find((incident) => {
      const incidentStart = new Date(incident.date).getTime();
      const incidentEnd = incident.resolved_at
        ? new Date(incident.resolved_at).getTime()
        : end;
      return incidentStart < bucketEnd && incidentEnd > bucketStart;
    });

    const clampedStart = Math.max(bucketStart, startDate.getTime());
    const inclusiveEnd = Math.max(clampedStart, bucketEnd - 1);
    const durationMs = Math.max(1, bucketEnd - clampedStart);
    const bucketLabelDate = new Date(bucketStart);
    const tooltipStart = relatedIncident
      ? new Date(relatedIncident.date).toISOString()
      : new Date(clampedStart).toISOString();
    const tooltipEnd = relatedIncident?.resolved_at
      ? new Date(relatedIncident.resolved_at).toISOString()
      : relatedIncident
        ? undefined
        : new Date(inclusiveEnd).toISOString();

    points.push({
      id: bucketLabelDate.toISOString(),
      label: bucketLabelDate.toISOString(),
      value: 1,
      status,
      rangeStart: new Date(clampedStart).toISOString(),
      rangeEnd: new Date(inclusiveEnd).toISOString(),
      durationMs,
      tooltipStart,
      tooltipEnd,
      incidentDescription: relatedIncident?.description,
    });
  }

  return points;
}

function computeUptimePercent(
  segments: TimelineSegment[],
  startDate: Date,
  endDate: Date,
) {
  const total = endDate.getTime() - startDate.getTime();
  if (total <= 0) {
    return 100;
  }

  const uptime = segments.reduce((acc, segment) => {
    const segmentStart = Math.max(
      segment.startTime.getTime(),
      startDate.getTime(),
    );
    const segmentEnd = Math.min(segment.endTime.getTime(), endDate.getTime());
    const duration = Math.max(0, segmentEnd - segmentStart);
    if (segment.status === "online") {
      return acc + duration;
    }
    return acc;
  }, 0);

  return (uptime / total) * 100;
}

function getStatusAtDate(
  segments: TimelineSegment[],
  date: Date,
): TimelineStatus {
  const match = segments.find(
    (segment) =>
      segment.startTime.getTime() <= date.getTime() &&
      segment.endTime.getTime() >= date.getTime(),
  );

  return match?.status ?? segments[segments.length - 1]?.status ?? "online";
}

export default function UptimeTimeline({
  cables,
  startDate,
  endDate,
}: UptimeTimelineProps) {
  const { t } = useTranslation();
  const { formatDateTime, formatDate } = useFormatDate();
  const [timelineByCable, setTimelineByCable] = useState<
    Record<string, CableTimeline>
  >({});

  useEffect(() => {
    let isCancelled = false;

    const loadIncidents = async () => {
      try {
        const response = await fetch("/data/incidents.json");
        const data: Incident[] = await response.json();

        if (isCancelled) {
          return;
        }

        const segmentsMap = buildTimelineSegments(
          cables,
          data,
          startDate,
          endDate,
        );

        const incidentsByCable = data.reduce<Record<string, Incident[]>>(
          (acc, incident) => {
            const incidentStart = new Date(incident.date);
            const incidentEnd = incident.resolved_at
              ? new Date(incident.resolved_at)
              : endDate;
            if (incidentEnd <= startDate || incidentStart >= endDate) {
              return acc;
            }

            if (!acc[incident.cableid]) {
              acc[incident.cableid] = [];
            }
            acc[incident.cableid].push(incident);
            return acc;
          },
          {},
        );

        const nextTimeline: Record<string, CableTimeline> = {};

        cables.forEach((cable) => {
          const cableSegments = segmentsMap[cable.id] ?? [
            {
              startTime: new Date(startDate),
              endTime: new Date(endDate),
              status: "online" as const,
            },
          ];

          const cableIncidents = incidentsByCable[cable.id] ?? [];
          const points = createTimelinePoints(
            cableSegments,
            cableIncidents,
            startDate,
            endDate,
          );

          nextTimeline[cable.id] = {
            segments: cableSegments,
            points,
            uptimePercent: computeUptimePercent(
              cableSegments,
              startDate,
              endDate,
            ),
            latestStatus: getStatusAtDate(cableSegments, endDate),
          };
        });

        if (!isCancelled) {
          setTimelineByCable(nextTimeline);
        }
      } catch (error) {
        if (!isCancelled) {
          console.error("Error loading incidents:", error);
        }
      }
    };

    if (cables.length > 0) {
      void loadIncidents();
    } else {
      setTimelineByCable({});
    }

    return () => {
      isCancelled = true;
    };
  }, [cables, startDate, endDate]);

  const fallbackPoints: TimelinePoint[] = useMemo(
    () =>
      createTimelinePoints(
        [
          {
            startTime: new Date(startDate),
            endTime: new Date(endDate),
            status: "online",
          },
        ],
        [],
        startDate,
        endDate,
      ),
    [startDate, endDate],
  );

  const getStatusColor = (status: TimelineStatus) => {
    switch (status) {
      case "online":
        return "var(--color-uptime-online)";
      case "disconnected":
        return "var(--color-uptime-disconnected)";
      case "partial_disconnected":
        return "var(--color-uptime-partial-disconnected)";
      case "notice":
        return "var(--color-uptime-notice)";
      default:
        return "var(--color-uptime-unknown)";
    }
  };

  const getStatusLabel = (status: TimelineStatus) => {
    switch (status) {
      case "online":
        return t("common.online");
      case "disconnected":
        return t("common.disconnected");
      case "partial_disconnected":
        return t("common.partial_disconnected");
      case "notice":
        return t("common.notice");
      default:
        return t("common.unknown");
    }
  };

  return (
    <div className="w-full space-y-4">
      {cables.map((cable) => {
        const timeline = timelineByCable[cable.id];
        const points = timeline?.points ?? fallbackPoints;
        const uptimePercent = timeline?.uptimePercent ?? 100;
        const latestStatus =
          timeline?.latestStatus ?? ("online" as TimelineStatus);

        return (
          <div
            key={cable.id}
            className="rounded-md border border-white/5 bg-white/5 p-4 shadow-lg"
          >
            <div className="flex items-start justify-between gap-6">
              <div className="shrink-0">
                <div className="text-lg font-semibold">{cable.name}</div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span
                    className="inline-flex size-2 rounded-full"
                    style={{ backgroundColor: getStatusColor(latestStatus) }}
                  />
                  {getStatusLabel(latestStatus)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold">
                  {uptimePercent.toFixed(1)}%
                </div>
                <div className="text-xs tracking-wide text-slate-500 uppercase">
                  {t("timeline.uptimeLabel")}
                </div>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex h-14 w-full overflow-hidden rounded-md bg-white/5">
                {points.map((point, index) => {
                  const statusColor = getStatusColor(point.status);
                  const tooltipStartLabel = formatDateTime(point.tooltipStart);
                  const tooltipEndLabel = point.tooltipEnd
                    ? formatDateTime(point.tooltipEnd)
                    : t("common.active");
                  return (
                    <Tooltip key={point.id}>
                      <TooltipTrigger asChild>
                        <div
                          role="button"
                          tabIndex={0}
                          className="group relative h-full cursor-pointer transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-white/80"
                          style={{
                            flexGrow: point.durationMs,
                            flexBasis: 0,
                            minWidth: "1px",
                            backgroundColor: statusColor,
                          }}
                        >
                          <span className="sr-only">
                            {getStatusLabel(point.status)}
                          </span>
                          {index < points.length - 1 ? (
                            <div className="pointer-events-none absolute top-0 right-0 h-full w-px bg-white/10" />
                          ) : null}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" align="center">
                        <div className="text-sm font-semibold">
                          {getStatusLabel(point.status)}
                        </div>
                        <div className="mt-1 text-[11px] text-slate-400">
                          {tooltipStartLabel} - {tooltipEndLabel}
                        </div>
                        {point.incidentDescription ? (
                          <div className="mt-2 w-40 text-xs text-gray-500">
                            {point.incidentDescription}
                          </div>
                        ) : null}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </div>
            <div className="mt-3 flex justify-between text-[11px] text-slate-500">
              <span>{formatDate(startDate)}</span>
              <span>
                {t("timeline.uptimePercentage", {
                  value: uptimePercent.toFixed(1),
                })}
              </span>
              <span>{formatDate(endDate)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
