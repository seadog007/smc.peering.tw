import { memo, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { computePathAvailability } from "@/lib/cable-status";
import { cablesQueryOptions } from "@/lib/cables";
import { incidentsQueryOptions } from "@/lib/incidents";

function OutageCounter() {
  const { t } = useTranslation();

  // The same queries the map and incident list use, so the cables and
  // incidents are loaded once instead of fetched again here.
  const { data: cables } = useQuery(cablesQueryOptions);
  const { data: incidents } = useQuery(incidentsQueryOptions);

  const availability = useMemo(
    () => (cables && incidents ? computePathAvailability(cables, incidents) : null),
    [cables, incidents],
  );
  const total = availability ? availability.totalIntl : null;
  const outages = availability
    ? availability.totalIntl - availability.remainingIntl
    : null;

  const totalDisplay = total ?? "--";
  const onlineDisplay = total && outages ? total - outages : "--";
  const outageDisplay = outages ?? "--";

  return (
    <Tooltip useTouch>
      <TooltipTrigger asChild>
        <div
          className="relative mb-1 cursor-help rounded-xl bg-white/5 p-2 shadow-lg backdrop-blur-md text-shadow-sm"
          tabIndex={0}
          role="group"
          aria-label={t("common.outageStatus")}
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
                  total && outages
                    ? `${((total - outages) / total) * 100}%`
                    : "0%",
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
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={8} className="max-w-64">
        <p>{t("common.outageStatusHint")}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export default memo(OutageCounter);
