import { clsx } from "clsx";
import { cn } from "@/lib/utils";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Drawer } from "vaul";
import { useTranslation } from "react-i18next";
import {
  CircleHelp,
  History,
  Info,
  Languages,
  Network,
  Radio,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { ScrollArea } from "@/components/ui/scroll-area";
import SidebarButton from "@/components/SidebarButton";
import AboutDialog, { AboutContent } from "@/components/dialog/About";
import TimelineDialog, { TimelineView } from "@/components/dialog/Timeline";
import TopologyDialog, { TopologyView } from "@/components/dialog/Topology";
import { useTourStore } from "@/stores/tour";

import IncidentList from "@/components/IncidentList";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { ProgressiveBlur } from "@/components/ui/progressive-blur";

const FADE_HEIGHT = "48px";
const MOBILE_DRAWER_TOP_INSET = 48;
const SNAP_PEEK_VISIBLE_HEIGHT = 112;
const SNAP_PEEK = `${MOBILE_DRAWER_TOP_INSET + SNAP_PEEK_VISIBLE_HEIGHT + 64}px`;
const SNAP_FULL = 1;
const snapPoints = [SNAP_PEEK, SNAP_FULL];

type TabId = "incidents" | "about" | "timeline" | "topology";

interface Tab {
  id: TabId;
  labelKey: string;
  icon: ReactNode;
  dataTour?: string;
}

const TABS: Tab[] = [
  {
    id: "incidents",
    labelKey: "tab.incidents",
    icon: <Radio className="size-5" />,
  },
  {
    id: "timeline",
    labelKey: "tab.timeline",
    icon: <History className="size-5" />,
    dataTour: "timeline-dialog",
  },
  {
    id: "topology",
    labelKey: "tab.topology",
    icon: <Network className="size-5" />,
    dataTour: "topology-dialog",
  },
  {
    id: "about",
    labelKey: "tab.about",
    icon: <Info className="size-5" />,
    dataTour: "about-dialog",
  },
];

function MaskedScroll({
  children,
  className,
  bottomPad,
}: {
  children: ReactNode;
  className?: string;
  bottomPad?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isAtTop, setIsAtTop] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(false);
  const [hasScrollbar, setHasScrollbar] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const { scrollTop, clientHeight, scrollHeight } = el;
    setIsAtTop(scrollTop <= 0);
    setIsAtBottom(scrollTop + clientHeight >= scrollHeight - 1);
    setHasScrollbar(scrollHeight > clientHeight);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [update]);

  useEffect(() => {
    const handle = window.setTimeout(update, 0);
    return () => window.clearTimeout(handle);
  }, [children, update]);

  let maskImage = "none";
  if (hasScrollbar) {
    const parts: string[] = [];
    if (!isAtTop) {
      parts.push("transparent 0px", `black ${FADE_HEIGHT}`);
    } else {
      parts.push("black 0px");
    }
    const bottomFade = !isAtBottom ? FADE_HEIGHT : "0px";
    parts.push(`black calc(100% - ${bottomFade})`);
    parts.push(!isAtBottom ? "transparent 100%" : "black 100%");
    maskImage = `linear-gradient(to bottom, ${parts.join(", ")})`;
  }

  return (
    <div
      ref={ref}
      className={cn("relative overflow-y-auto", className)}
      style={{
        scrollbarWidth: "none",
        paddingBottom: bottomPad,
        maskImage,
        WebkitMaskImage: maskImage,
      }}
    >
      {children}
    </div>
  );
}

function TabBar({
  activeTab,
  onTabClick,
  onHeightChange,
  className,
  style,
}: {
  activeTab: TabId;
  onTabClick: (tab: TabId) => void;
  onHeightChange?: (height: number) => void;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    const el = ref.current;
    if (!el || !onHeightChange) return;
    const resizeObserver = new ResizeObserver(() => {
      onHeightChange(el.offsetHeight);
    });
    resizeObserver.observe(el);
    onHeightChange(el.offsetHeight);
    return () => resizeObserver.disconnect();
  }, [onHeightChange]);

  return (
    <div ref={ref} className={cn("px-3 pb-3", className)} style={style}>
      <div className="relative inline-flex w-full items-center justify-center rounded-full bg-[#19191B]/50 p-1 backdrop-blur">
        <div
          className="pointer-events-none absolute inset-0 rounded-full bg-white/35 mix-blend-plus-lighter"
          style={{
            maskImage:
              "radial-gradient(ellipse at bottom, transparent 60%, black 160%)",
          }}
        />
        <div className="pointer-events-none absolute inset-0 rounded-full border-[0.5px] border-white/10" />

        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <motion.button
              key={tab.id}
              layout
              onClick={() => onTabClick(tab.id)}
              data-tour={tab.dataTour}
              className={clsx(
                "group relative min-w-0 flex-1 cursor-pointer rounded-full px-3 py-1.5",
                "flex flex-col items-center gap-0.5",
                "text-[10px] font-medium whitespace-nowrap transition-colors",
                "focus-visible:outline-none active:scale-95",
              )}
            >
              <AnimatePresence initial={false}>
                {isActive && (
                  <motion.span
                    layoutId="mobile-nav-tabs-active-bg"
                    className="pointer-events-none absolute inset-0 rounded-full bg-white/15"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 35 }}
                  />
                )}
              </AnimatePresence>
              <span
                className={cn(
                  "relative",
                  isActive
                    ? "text-white drop-shadow-sm drop-shadow-white/25"
                    : "opacity-40 group-hover:opacity-60",
                )}
              >
                {tab.icon}
              </span>
              <span
                className={cn(
                  "relative leading-none",
                  isActive
                    ? "text-white drop-shadow-sm drop-shadow-white/25"
                    : "text-white/40 hover:text-white/60",
                )}
              >
                {t(tab.labelKey, { defaultValue: tab.id })}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function MobileFixedTabBar({
  activeTab,
  onTabClick,
  onHeightChange,
}: {
  activeTab: TabId;
  onTabClick: (tab: TabId) => void;
  onHeightChange: (height: number) => void;
}) {
  return createPortal(
    <>
      <ProgressiveBlur
        className="pointer-events-none fixed bottom-0 left-0 z-20 mx-[9px] h-[96px] w-[calc(100%-18px)] bg-linear-to-b from-transparent to-black/5"
        blurIntensity={1}
      />
      <TabBar
        activeTab={activeTab}
        onTabClick={onTabClick}
        onHeightChange={onHeightChange}
        style={{
          position: "fixed",
          right: 8,
          bottom: "max(8px, env(safe-area-inset-bottom))",
          left: 8,
          zIndex: 20,
        }}
      />
    </>,
    document.body,
  );
}

function MobileSidebar() {
  const { t } = useTranslation();
  const [snap, setSnap] = useState<number | string | null>(SNAP_PEEK);
  const [activeTab, setActiveTab] = useState<TabId>("incidents");
  const [showHistorical, setShowHistorical] = useState(false);
  const [tabBarHeight, setTabBarHeight] = useState(72);
  const startTour = useTourStore((s) => s.startTour);
  const tourActive = useTourStore((s) => s.tourActive);
  const topologyTourOpen = useTourStore((s) => s.topologyTourOpen);
  const prevTopologyTourOpen = useRef(topologyTourOpen);

  const handleTabClick = (tab: TabId) => {
    setActiveTab(tab);
    if (snap !== SNAP_FULL) setSnap(SNAP_FULL);
  };

  useEffect(() => {
    const wasOpen = prevTopologyTourOpen.current;
    prevTopologyTourOpen.current = topologyTourOpen;

    if (topologyTourOpen) {
      setActiveTab("topology");
      setSnap(SNAP_FULL);
    } else if (wasOpen || tourActive) {
      setSnap(SNAP_PEEK);
    }
  }, [topologyTourOpen, tourActive]);

  return (
    <>
      <Drawer.Root
        snapPoints={snapPoints}
        activeSnapPoint={snap}
        setActiveSnapPoint={setSnap}
        dismissible={false}
        modal={false}
        open
      >
        <Drawer.Trigger className="pointer-events-none absolute top-0 left-0 opacity-0" />
        <Drawer.Portal>
          <Drawer.Content
            data-testid="content"
            data-tour="incident-panel"
            className="border-b-none fixed right-2 bottom-0 left-2 z-10 mx-[-1px] flex h-full w-[calc(100vw-16px)] flex-col rounded-t-2xl border border-white/5 bg-[#19191B]/80 shadow-lg backdrop-blur-md"
            style={{ maxHeight: `calc(100svh - ${MOBILE_DRAWER_TOP_INSET}px)` }}
          >
            <div className="flex shrink-0 items-center justify-center py-3">
              <div className="h-1 w-20 rounded-full bg-white/15" />
            </div>

            <div className="min-h-0 flex-1 overflow-hidden">
              <div className="shrink-0">
                <div className="flex w-full items-center justify-between px-3 pb-0">
                  {activeTab === "incidents" ? (
                    <NativeSelect
                      className="md:text-md h-auto border-white/5 font-semibold shadow-none"
                      data-tour="incident-mode-select"
                      value={showHistorical.toString()}
                      onChange={(event) =>
                        setShowHistorical(event.target.value === "true")
                      }
                    >
                      <NativeSelectOption value="false">
                        {t("incidents.activeTitle")}
                      </NativeSelectOption>
                      <NativeSelectOption value="true">
                        {t("incidents.historicalTitle")}
                      </NativeSelectOption>
                    </NativeSelect>
                  ) : (
                    <div className="text-lg font-semibold text-white">
                      {activeTab === "about" && <span>{t("about.title")}</span>}
                      {activeTab === "timeline" && (
                        <span>{t("timeline.title")}</span>
                      )}
                      {activeTab === "topology" && (
                        <span>{t("topology.title")}</span>
                      )}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <div data-tour="change-language">
                      <ChangeLanguageButton />
                    </div>
                    <div data-tour="tour-help">
                      <SidebarButton onClick={startTour}>
                        <CircleHelp className="size-5" />
                      </SidebarButton>
                    </div>
                  </div>
                </div>
              </div>

              <MaskedScroll
                className="h-full p-3"
                bottomPad={tabBarHeight + 48}
                key={activeTab}
              >
                <div data-tour="incident-list">
                  {activeTab === "incidents" && (
                    <IncidentList showHistorical={showHistorical} />
                  )}
                  {activeTab === "about" && <AboutContent />}
                  {activeTab === "timeline" && (
                    <TimelineView isActive={snap !== SNAP_PEEK} />
                  )}
                  {activeTab === "topology" && (
                    <TopologyView
                      isActive={snap !== SNAP_PEEK}
                      allowDirectionSwitch={false}
                    />
                  )}
                </div>
              </MaskedScroll>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
      <MobileFixedTabBar
        activeTab={activeTab}
        onTabClick={handleTabClick}
        onHeightChange={setTabBarHeight}
      />
    </>
  );
}

export default function Sidebar() {
  const { i18n } = useTranslation();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const isEnglish = i18n.language.startsWith("en");

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return isMobile ? (
    <MobileSidebar />
  ) : (
    <div
      className={cn(
        "absolute top-2 right-2 z-10 flex h-[calc(100svh-16px)] rounded-2xl bg-[#19191B]/80 shadow-lg backdrop-blur-md",
        isEnglish ? "w-[460px]" : "w-[400px]",
      )}
      data-tour="incident-panel"
    >
      <div className="pointer-events-none absolute inset-0 size-full rounded-[22px] border border-white/5" />
      <div
        className="pointer-events-none absolute inset-0 rounded-[22px] border border-white/10 bg-white/10"
        style={{
          maskImage:
            "radial-gradient(circle at top, black 0%, transparent 20%)",
        }}
      />
      <SidebarContent />
    </div>
  );
}

function SidebarContent() {
  const { t } = useTranslation();
  const [showHistorical, setShowHistorical] = useState(false);
  const startTour = useTourStore((s) => s.startTour);

  return (
    <>
      <div className="relative z-10 flex h-full w-full flex-col gap-3 p-3">
        <div className="flex w-full items-center justify-between">
          <NativeSelect
            className="md:text-md h-auto border-white/5 font-semibold shadow-none"
            data-tour="incident-mode-select"
            value={showHistorical.toString()}
            onChange={(e) => setShowHistorical(e.target.value === "true")}
          >
            <NativeSelectOption value="false">
              {t("incidents.activeTitle")}
            </NativeSelectOption>
            <NativeSelectOption value="true">
              {t("incidents.historicalTitle")}
            </NativeSelectOption>
          </NativeSelect>
          <div className="flex gap-2">
            <div data-tour="change-language">
              <ChangeLanguageButton />
            </div>
            <div data-tour="timeline-dialog">
              <TimelineDialog />
            </div>
            <div data-tour="topology-dialog">
              <TopologyDialog />
            </div>
            <div data-tour="tour-help">
              <SidebarButton onClick={startTour}>
                <CircleHelp className="size-5" />
              </SidebarButton>
            </div>
            <div data-tour="about-dialog">
              <AboutDialog />
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 overflow-y-auto rounded-lg border border-white/5 bg-white/5 shadow-lg">
          <div className="px-4" data-tour="incident-list">
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
    localStorage.setItem("i18nextLng", lang);
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
