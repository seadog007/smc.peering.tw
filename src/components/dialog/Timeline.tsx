import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";
import TimelineContent from "@/components/dialog/TimelineContent";

export default function TimelineView({ isActive }: { isActive: boolean }) {
  const { t } = useTranslation();
  const now = new Date();
  const timelineRange = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  const [cables, setCables] = useState<{ id: string; name: string }[]>([]);
  const [shouldRender, setShouldRender] = useState(false);
  const hasLoaded = shouldRender && cables.length > 0;

  useEffect(() => {
    if (!isActive || cables.length > 0) return;
    const loadCables = async () => {
      const cableFiles = import.meta.glob<{
        default: { id: string; name: string; building?: boolean };
      }>("/src/data/cables/*.json");
      const loadedCables: { id: string; name: string }[] = [];
      for (const path in cableFiles) {
        const module = await cableFiles[path]();
        if (module.default.building) continue;
        loadedCables.push({ id: module.default.id, name: module.default.name });
      }
      setCables(loadedCables);
    };
    void loadCables();
  }, [isActive, cables.length]);

  useEffect(() => {
    if (!isActive) {
      setShouldRender(false);
      return;
    }
    const handle = window.setTimeout(() => {
      setShouldRender(true);
    }, 200);
    return () => window.clearTimeout(handle);
  }, [isActive]);

  return (
    <div className="text-base font-semibold text-white">
      {hasLoaded ? (
        <TimelineContent
          cables={cables}
          startDate={timelineRange}
          endDate={now}
        />
      ) : (
        <div className="w-full divide-y divide-white/10">
          {cables.length > 0
            ? cables.map((cable) => (
                <div key={cable.id} className="py-1">
                  <div className="flex items-start justify-between gap-6">
                    <div className="shrink-0">
                      <div className="text-lg font-semibold">{cable.name}</div>
                      <Skeleton className="h-[18px] w-[3em] rounded-md" />
                    </div>
                    <div className="text-right">
                      <Skeleton className="h-[28px] w-[3em] rounded-md" />
                      <div className="text-xs tracking-wide text-white/50 uppercase">
                        {t("timeline.uptimeLabel")}
                      </div>
                    </div>
                  </div>
                  <div className="mt-1">
                    <Skeleton className="h-8 w-full rounded-md" />
                  </div>
                  <div className="mt-1 flex justify-between text-xs text-white/50">
                    <Skeleton className="h-[14px] w-[4em] rounded-md" />
                    <Skeleton className="h-[14px] w-[4em] rounded-md" />
                    <Skeleton className="h-[14px] w-[4em] rounded-md" />
                  </div>
                </div>
              ))
            : Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="py-1">
                  <div className="flex items-start justify-between gap-6">
                    <Skeleton className="h-7 w-32 rounded-md" />
                    <Skeleton className="h-7 w-16 rounded-md" />
                  </div>
                  <div className="mt-1">
                    <Skeleton className="h-8 w-full rounded-md" />
                  </div>
                </div>
              ))}
        </div>
      )}
    </div>
  );
}
