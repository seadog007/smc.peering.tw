import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  computePathAvailability,
  type CableStatusCable,
  type CableStatusIncident,
} from "@/lib/cable-status";

interface CableLite extends CableStatusCable {
  name: string;
}

interface Incident extends CableStatusIncident {
  date: string;
  status: string;
  reason: string;
  cableid: string;
  segment: string;
  resolved_at: string;
}

export default function OutageCounter() {
  const { t } = useTranslation();

  const [total, setTotal] = useState<number | null>(null);
  const [outages, setOutages] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadCablesLite(): Promise<CableLite[]> {
      const modules = import.meta.glob<{ default: CableLite }>(
        "../data/cables/*.json",
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

    (async () => {
      try {
        const [cables, incidents] = await Promise.all([
          loadCablesLite(),
          loadIncidents(),
        ]);
        const { totalIntl, remainingIntl } =
          computePathAvailability(cables, incidents);
        if (!mounted) return;
        setTotal(totalIntl);
        setOutages(totalIntl - remainingIntl);
      } catch {
        // on error, fallback to nulls
        if (!mounted) return;
        setTotal(null);
        setOutages(null);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const totalDisplay = total ?? "--";
  const onlineDisplay = total && outages ? total - outages : "--";
  const outageDisplay = outages ?? "--";

  return (
    <div
      className="relative mb-1 rounded-xl bg-white/5 p-2 shadow-lg backdrop-blur-md text-shadow-sm"
      data-tour="counter"
    >
      <div className="pointer-events-none absolute inset-0 size-full rounded-xl border border-white/5" />
      <div
        className="pointer-events-none absolute inset-0 rounded-xl border border-white/10 bg-white/10"
        style={{
          maskImage:
            "radial-gradient(circle at top, black 0%, transparent 60%)",
        }}
      />
      <div className="text-center text-sm opacity-75">
        {t("common.outageStatus")}
      </div>
      <div className="flex items-center justify-center text-center tabular-nums">
        <div className="flex w-16 flex-col items-center gap-1 px-2 py-2">
          <div className="bg-linear-to-b from-green-300 to-green-500 bg-clip-text text-2xl leading-[1em] font-semibold text-transparent">
            {onlineDisplay}
          </div>
          <div className="w-full text-center text-xs opacity-50">
            {t("common.online")}
          </div>
        </div>
        <div className="h-10 w-px bg-linear-to-b from-transparent via-white/20 to-transparent" />
        <div className="flex w-16 flex-col items-center gap-1 px-2 py-2">
          <div className="bg-linear-to-b from-red-300 to-red-500 bg-clip-text text-2xl leading-[1em] font-semibold text-transparent">
            {outageDisplay}
          </div>
          <div className="w-full text-center text-xs opacity-50">
            {t("common.affected")}
          </div>
        </div>
        <div className="h-10 w-px bg-linear-to-b from-transparent via-white/20 to-transparent" />
        <div className="flex w-16 flex-col items-center gap-1 px-2 py-2">
          <div className="bg-linear-to-b from-white to-gray-100 bg-clip-text text-2xl leading-[1em] font-semibold text-transparent">
            {totalDisplay}
          </div>
          <div className="w-full text-center text-xs opacity-50">
            {t("common.total")}
          </div>
        </div>
      </div>
      <div className="shdaow-sm relative h-0.5 w-full overflow-hidden rounded-full bg-white/50">
        <div
          className="absolute top-0 left-0 h-full bg-linear-to-b from-green-400 to-green-500"
          style={{
            width:
              total && outages ? `${((total - outages) / total) * 100}%` : "0%",
          }}
        />
        <div
          className="absolute top-0 right-0 h-full bg-linear-to-b from-red-400 to-red-500"
          style={{
            width: total && outages ? `${(outages / total) * 100}%` : "0%",
          }}
        />
      </div>
    </div>
  );
}
