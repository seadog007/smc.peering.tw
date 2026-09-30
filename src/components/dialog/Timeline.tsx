import { History } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import AnnualStatistics from '@/components/dialog/AnnualStatistics';

export function TimelineView({ isActive }: { isActive: boolean }) {
  const { t } = useTranslation();
  const id = useId();
  const [tab, setTab] = useState('timeline');
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const tabs = ['timeline', 'annualStatistics'] as const;

  return (
    <div>
      <div role="tablist" aria-label={t('timeline.views')} className="mb-5 flex gap-1 rounded-lg bg-white/5 p-1">
        {tabs.map((value, index) => (
          <button
            key={value}
            ref={(element) => { tabRefs.current[index] = element; }}
            type="button"
            role="tab"
            id={`${id}-${value}-tab`}
            aria-controls={`${id}-${value}-panel`}
            aria-selected={tab === value}
            tabIndex={tab === value ? 0 : -1}
            className="flex-1 rounded-md px-3 py-2 text-sm text-white/60 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-sky-400 aria-selected:bg-white/10 aria-selected:font-medium aria-selected:text-white"
            onClick={() => setTab(value)}
            onKeyDown={(event) => {
              let next = index;
              if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
              else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
              else if (event.key === 'Home') next = 0;
              else if (event.key === 'End') next = tabs.length - 1;
              else return;
              event.preventDefault();
              setTab(tabs[next]);
              tabRefs.current[next]?.focus();
            }}
          >
            {t(`timeline.tabs.${value}`)}
          </button>
        ))}
      </div>
      {tabs.map((value) => (
        <div key={value} role="tabpanel" id={`${id}-${value}-panel`} aria-labelledby={`${id}-${value}-tab`} hidden={tab !== value} tabIndex={0} className="outline-offset-4">
          {tab === value && (value === 'timeline' ? <CableTimelineView isActive={isActive} /> : <AnnualStatistics isActive={isActive} />)}
        </div>
      ))}
    </div>
  );
}

function CableTimelineView({ isActive }: { isActive: boolean }) {
  const { t } = useTranslation();
  const now = new Date();
  const timelineRange = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  const [cables, setCables] = useState<{ id: string; name: string }[]>([]);
  const [shouldRender, setShouldRender] = useState(false);
  const hasLoaded = shouldRender && cables.length > 0;

  useEffect(() => {
    if (!isActive || cables.length > 0) {
      return;
    }
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
  }, [isActive, cables.length]);

  useEffect(() => {
    if (!isActive) {
      setShouldRender(false);
      return;
    }

    const handle = window.setTimeout(() => {
      setShouldRender(true);
    }, 200);

    return () => {
      window.clearTimeout(handle);
    };
  }, [isActive]);

  if (hasLoaded) {
    return (
      <TimelineContent
        cables={cables}
        startDate={timelineRange}
        endDate={now}
      />
    );
  }

  return (
    <div className="w-full divide-y">
      {cables.map((cable) => {
        return (
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
        );
      })}
    </div>
  );
}

export default function TimelineDialog() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

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
            <DialogDescription className="sr-only">{t('timeline.description')}</DialogDescription>
            <TimelineView isActive={open} />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
