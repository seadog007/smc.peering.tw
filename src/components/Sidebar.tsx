import { clsx } from "clsx";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { useState, useEffect } from "react";
import { Drawer } from "vaul";
import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import SidebarButton from "@/components/SidebarButton";
import AboutDialog from "@/components/dialog/About";
import TimelineDialog from "@/components/dialog/Timeline";

import IncidentList from "@/components/IncidentList";

const snapPoints = ["355px", 1];

export default function Sidebar() {
  const [snap, setSnap] = useState<number | string | null>(snapPoints[0]);
  const [isOpen, setIsOpen] = useState(true);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return isMobile ? (
    <Drawer.Root
      dismissible={false}
      snapPoints={snapPoints}
      activeSnapPoint={snap}
      setActiveSnapPoint={setSnap}
      open={isOpen}
      onOpenChange={setIsOpen}
      modal={false}
    >
      <Drawer.Trigger className="pointer-events-none absolute top-0 left-0 opacity-0"></Drawer.Trigger>
      <Drawer.Overlay className="fixed inset-0 bg-black/40" />
      <Drawer.Portal>
        <Drawer.Content
          data-testid="content"
          className="border-b-none fixed right-2 bottom-0 left-2 mx-[-1px] flex h-full max-h-[calc(100svh-48px)] w-[calc(100vw-16px)] flex-col rounded-t-2xl border border-white/5 bg-[#19191B]/80 shadow-lg backdrop-blur-md"
        >
          <div
            className={clsx(
              "mx-auto flex w-full flex-col overflow-hidden pt-5",
            )}
          >
            <div className="mb-2 flex items-center justify-center">
              <div className="h-1 w-20 rounded-full bg-white/15" />
            </div>
            <div className={cn(snap === 1 && "h-[calc(100svh-48px-24px)]")}>
              <SidebarContent />
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  ) : (
    <motion.div
      className="absolute top-2 right-2 flex h-[calc(100svh-16px)] w-[400px] rounded-2xl border border-white/5 bg-[#19191B]/80 shadow-lg backdrop-blur-md"
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <SidebarContent />
    </motion.div>
  );
}
function SidebarContent() {
  const { t } = useTranslation();
  const [showHistorical, setShowHistorical] = useState(false);
  return (
    <>
      <div className="flex h-full w-full flex-col">
        <div className="flex w-full items-center justify-between p-4">
          <div>
            <select
              className="w-max text-lg font-semibold outline-0"
              value={showHistorical.toString()}
              onChange={(e) => setShowHistorical(e.target.value === "true")}
            >
              <option value="false">{t("incidents.activeTitle")}</option>
              <option value="true">{t("incidents.historicalTitle")}</option>
            </select>
          </div>
          <div className="flex gap-2">
            <ChangeLanguageButton />
            <TimelineDialog />
            <AboutDialog />
          </div>
        </div>
        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="p-4 pt-0">
            <IncidentList showHistorical={showHistorical} />
          </div>
        </ScrollArea>
      </div>
    </>
  );
}

function ChangeLanguageButton() {
  const { i18n } = useTranslation();
  function changeLanguage(lang: string) {
    i18n.changeLanguage(lang);
  }
  return (
    <SidebarButton
      onClick={() =>
        i18n.language === "en" ? changeLanguage("zh-TW") : changeLanguage("en")
      }
    >
      <Languages className="size-5" />
    </SidebarButton>
  );
}
