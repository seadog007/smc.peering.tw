import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { cn, useFormatDate } from "@/lib/utils";
import { TriangleAlert, Check } from "lucide-react";
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
    const s = new Date(start);
    const e = end && end !== "" ? new Date(end) : new Date();
    const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
    return diff >= 0 ? diff : 0;
  };

  return (
    <div className="flex flex-col divide-y text-sm">
      {filteredIncidents?.map((incident, index) => (
        <div key={`${incident.cableid}-${incident.date}-${index}`}>
          <div className="flex items-center gap-4 py-4">
            <div className="w-12 flex-shrink-0 text-center md:w-18">
              <div className="text-2xl font-bold md:text-3xl">
                {calcDays(incident.date, incident.resolved_at)}
              </div>
              <div className="text-white/80">{t("common.days")}</div>
            </div>

            <div className="flex-1">
              <div className="flex items-center justify-between gap-1 text-white/60">
                <div>{formatDateTime(incident.date)}</div>
                <div
                  className={cn(
                    "relative rounded-full px-1.5 py-1 text-xs",
                    showHistorical
                      ? "bg-green-900/20 text-green-400"
                      : "bg-red-500/20 text-red-300",
                  )}
                >
                  <span className="flex items-center gap-1 drop-shadow-md drop-shadow-black/20">
                    {showHistorical ? (
                      <Check className="size-4" />
                    ) : (
                      <TriangleAlert className="size-4 animate-pulse" />
                    )}

                    {showHistorical ? t("common.resolved") : t("common.active")}
                  </span>
                  <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/5 to-transparent" />
                  <div className="absolute inset-0 rounded-full border-t border-white/2.5" />
                </div>
              </div>
              <h3 className="text-lg font-semibold">{incident.title}</h3>

              <p className="text-sm text-white/80">{incident.description}</p>

              <div className="mt-2 flex flex-col gap-1 border-t border-white/10 pt-2 text-sm text-white/70 empty:hidden">
                {incident.reparing_at && incident.reparing_at !== "" && (
                  <div className="flex items-center justify-between">
                    <span>{t("incidents.reparing_at")}</span>
                    <span className="ml-1 text-white/50">
                      {formatDateTime(incident.reparing_at)}
                    </span>
                  </div>
                )}

                {incident.resolved_at && incident.resolved_at !== "" && (
                  <div className="flex items-center justify-between">
                    <span>{t("incidents.resolved_at")}</span>
                    <span className="ml-1 text-white/50">
                      {formatDateTime(incident.resolved_at)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}

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
