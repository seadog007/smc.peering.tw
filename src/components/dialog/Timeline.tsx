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
  useEffect(() => {
    // Dynamically import cable data to pass to timeline
    const loadCables = async () => {
      const cableFiles = import.meta.glob<{
        default: { id: string; name: string };
      }>("/src/data/cables/*.json");
      const loadedCables = [];
      for (const path in cableFiles) {
        const module = await cableFiles[path]();
        loadedCables.push({
          id: module.default.id,
          name: module.default.name,
        });
      }
      setCables(loadedCables);
    };
    void loadCables();
  }, []);
  return (
    <Dialog>
      <Tooltip>
        <TooltipTrigger>
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
            <TimelineContent
              cables={cables}
              startDate={timelineRange}
              endDate={now}
            />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
