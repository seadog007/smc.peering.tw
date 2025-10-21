import { History } from "lucide-react";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import UptimeTimeline from "@/components/UptimeTimeline";
import SidebarButton from "@/components/SidebarButton";
export default function AboutDialog() {
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
      <DialogTrigger asChild>
        <SidebarButton>
          <History className="size-5" />
        </SidebarButton>
      </DialogTrigger>
      <DialogContent>
        <UptimeTimeline
          cables={cables}
          startDate={timelineRange}
          endDate={now}
        />
      </DialogContent>
    </Dialog>
  );
}
