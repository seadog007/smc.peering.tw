import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { cn, useFormatDate } from "@/lib/utils";
import { TriangleAlert, Check, XCircle, CalendarClock } from "lucide-react";
interface Incident {
  date: string;
  status: string;
  cableid: string;
  segment: string;
  title: string;
  description: string;
  reparing_at: string;
  resolved_at: string;
}

export default function IncidentList({
  showHistorical = false,
}: {
  showHistorical?: boolean;
}) {
  const { t } = useTranslation();
  const { formatDateTime } = useFormatDate();

  const { data: incidents } = useQuery({
    queryKey: ["incidents"],
    queryFn: async () => {
      const res = await fetch("/data/incidents.json");
      if (!res.ok) throw new Error(`Failed to fetch incidents: ${res.status}`);
      const sortedIncidents = (await res.json()) as Incident[];
      sortedIncidents.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
      return sortedIncidents;
    },
  });

  const filteredIncidents = incidents?.filter((incident) =>
    showHistorical
      ? incident.resolved_at && incident.resolved_at !== ""
      : !incident.resolved_at || incident.resolved_at === "",
  );

  const calcDays = (start: string, end?: string) => {
    const nowMs = Date.now();
    const s = new Date(start);
    const hasEnd = end && end !== "";
    if (!hasEnd && s.getTime() > nowMs) {
      return Math.ceil((s.getTime() - nowMs) / (1000 * 60 * 60 * 24));
    }
    const e = hasEnd ? new Date(end) : new Date(nowMs);
    const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
    return diff >= 0 ? diff : 0;
  };

  return (
    <div className="flex flex-col divide-y text-sm tracking-tight">
      {filteredIncidents?.map((incident, index) => {
        const isHistorical = showHistorical;
        const status = incident.status;
        const startDate = new Date(incident.date);
        const isUpcoming =
          (!incident.resolved_at || incident.resolved_at.trim() === "") &&
          startDate.getTime() > Date.now();
        const daysValue = calcDays(incident.date, incident.resolved_at);

        // Determine pill classes, icon and label
        let pillClass = "";
        let IconComponent = TriangleAlert;
        let iconClass = "size-4 animate-pulse";
        let label = isHistorical ? t("common.resolved") : t("common.active");

        if (isHistorical) {
          pillClass += " bg-green-900/40 text-green-400";
          IconComponent = Check;
          iconClass = "size-4";
        } else if (isUpcoming) {
          pillClass += " bg-sky-500/35 text-sky-200";
          IconComponent = CalendarClock;
          iconClass = "size-4";
          label = t("common.scheduled");
        } else if (status === "partial_disconnected") {
          // partial: orange
          pillClass += " bg-orange-500/40 text-orange-300";
          IconComponent = TriangleAlert;
          iconClass = "size-4 animate-pulse";
          label = t("common.partial_disconnected");
        } else if (status === "disconnected") {
          // disconnected: red
          pillClass += " bg-red-500/40 text-red-300";
          IconComponent = XCircle;
          iconClass = "size-4 animate-pulse";
          label = t("common.disconnected");
        } else {
          // fallback: use active / red
          pillClass += " bg-red-500/40 text-red-300";
          IconComponent = TriangleAlert;
          iconClass = "size-4 animate-pulse";
          label = t("common.active");
        }

        return (
          <div
            key={`${incident.cableid}-${incident.date}-${index}`}
            className="flex items-center gap-4 py-3"
          >
            <div className="w-12 flex-shrink-0 text-center md:w-18">
              <div className="text-2xl font-bold md:text-3xl">{daysValue}</div>
              <div className="text-white/80">
                {isUpcoming ? t("common.daysAfter") : t("common.days")}
              </div>
            </div>

            <div className="flex-1">
              <div className="flex flex-wrap-reverse items-center justify-between gap-1 tracking-tighter text-white/60">
                <div>{formatDateTime(incident.date)}</div>
                <div
                  className={cn(
                    "relative ml-auto rounded-full px-1.5 py-1 text-xs",
                    pillClass,
                  )}
                >
                  <span className="flex items-center gap-1 drop-shadow-md drop-shadow-black/20">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    <IconComponent className={iconClass as any} />

                    {label}
                  </span>
                  <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/5 to-transparent" />
                  <div className="absolute inset-0 rounded-full border-t border-white/2.5" />
                </div>
              </div>
              <h3 className="text-lg font-semibold">{incident.title}</h3>

              <p className="text-sm text-white/80">{incident.description}</p>

              <div className="mt-1.5 flex flex-col gap-1 border-t border-white/10 pt-1.5 text-sm text-white/70 empty:hidden">
                {incident.reparing_at && incident.reparing_at !== "" && (
                  <div className="flex items-center justify-between gap-1">
                    <span>{t("incidents.reparing_at")}</span>
                    <span className="text-right text-white/50">
                      {formatDateTime(incident.reparing_at)}
                    </span>
                  </div>
                )}

                {incident.resolved_at && incident.resolved_at !== "" && (
                  <div className="flex items-center justify-between gap-1">
                    <span>{t("incidents.resolved_at")}</span>
                    <span className="text-right text-white/50">
                      {formatDateTime(incident.resolved_at)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {filteredIncidents?.length === 0 && (
        <div className="py-6">
          <p className="text-sm text-slate-700 dark:text-slate-200">
            {showHistorical
              ? t("common.noHistoricalIncidents")
              : t("common.noActiveIncidents")}
          </p>
        </div>
      )}
    </div>
  );
}
