import { History } from "lucide-react";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import TimelineContent from "@/components/dialog/TimelineContent";
import SidebarButton from "@/components/SidebarButton";
export default function AboutDialog() {
  const { t } = useTranslation();
  const now = new Date();
  const timelineRange = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  const [cables, setCables] = useState<{ id: string; name: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const hasLoaded = shouldRender && cables.length > 0;

  useEffect(() => {
    if (!open || cables.length > 0) {
      return;
    }
    // Dynamically import cable data only when dialog is open
    // Dynamically import cable data only when dialog is open
    const loadCables = async () => {
      const cableFiles = import.meta.glob<{
        default: { id: string; name: string; building?: boolean };
      }>("/src/data/cables/*.json");
      const loadedCables: { id: string; name: string }[] = [];
      for (const path in cableFiles) {
        const module = await cableFiles[path]();
        if (module.default.building) {
          continue;
        }
        loadedCables.push({
          id: module.default.id,
          name: module.default.name,
        });
      }
      setCables(loadedCables);
    };
    void loadCables();
  }, [open, cables.length]);

  useEffect(() => {
    if (!open) {
      setShouldRender(false);
      return;
    }

    const handle = window.setTimeout(() => {
      setShouldRender(true);
    }, 200);

    return () => {
      window.clearTimeout(handle);
    };
  }, [open]);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <SidebarButton>
              <History className="size-5" />
            </SidebarButton>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t("timeline.title")}</p>
        </TooltipContent>
      </Tooltip>
      <DialogContent className="p-0 sm:max-w-3xl">
        <ScrollArea className="h-full max-h-[80vh] overflow-y-auto">
          <div className="p-6">
            <DialogHeader className="mb-3">
              <DialogTitle> {t("timeline.title")}</DialogTitle>
            </DialogHeader>
            {hasLoaded ? (
              <TimelineContent
                cables={cables}
                startDate={timelineRange}
                endDate={now}
              />
            ) : (
              <div className="w-full divide-y">
                {cables.map((cable) => {
                  return (
                    <div key={cable.id} className="py-1">
                      <div className="flex items-start justify-between gap-6">
                        <div className="shrink-0">
                          <div className="text-lg font-semibold">
                            {cable.name}
                          </div>
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
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
