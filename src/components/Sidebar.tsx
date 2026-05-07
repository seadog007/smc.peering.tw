import { clsx } from "clsx";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Drawer } from "vaul";
import { useTranslation } from "react-i18next";
import {
  CircleHelp,
  Languages,
  Radio,
  Info,
  History,
  Network,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import SidebarButton from "@/components/SidebarButton";
import AboutContent from "@/components/dialog/About";
import TimelineView from "@/components/dialog/Timeline";
import TopologyView from "@/components/dialog/Topology";
import { useTourStore } from "@/stores/tour";
import IncidentList from "@/components/IncidentList";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { ProgressiveBlur } from "@/components/ui/progressive-blur";

const FADE_HEIGHT = "48px";

// Vaul calculates bottom snap offsets from the full viewport height. Because
// the drawer itself is capped below the top UI inset, pixel snap points must
// include that inset to expose the intended visible height.
const MOBILE_DRAWER_TOP_INSET = 48;
const SNAP_PEEK_VISIBLE_HEIGHT = 112;
// snap[0] = peek (just handle + tab bar hint), snap[1] = half, snap[2] = full
const SNAP_PEEK = `${MOBILE_DRAWER_TOP_INSET + SNAP_PEEK_VISIBLE_HEIGHT + 64}px`;
const SNAP_FULL = 1;
const snapPoints = [SNAP_PEEK, SNAP_FULL];

type TabId = "incidents" | "about" | "timeline" | "topology";
const WIDE_TABS: TabId[] = ["timeline", "topology"];

interface Tab {
  id: TabId;
  labelKey: string;
  icon: React.ReactNode;
  dataTour?: string;
}

const TABS: Tab[] = [
  {
    id: "incidents",
    labelKey: "tab.incidents",
    icon: <Radio className="size-5" />,
  },
  {
    id: "about",
    labelKey: "tab.about",
    icon: <Info className="size-5" />,
    dataTour: "about-dialog",
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
];

// ─── MaskedScroll ─────────────────────────────────────────────────────────────
function MaskedScroll({
  children,
  className,
  bottomPad,
}: {
  children: React.ReactNode;
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
    const h = setTimeout(update, 0);
    return () => clearTimeout(h);
  }, [children, update]);

  let maskImage = "none";
  if (hasScrollbar) {
    const parts: string[] = [];
    if (!isAtTop) {
      parts.push(`transparent 0px`, `black ${FADE_HEIGHT}`);
    } else {
      parts.push(`black 0px`);
    }
    const bottomFade = !isAtBottom ? FADE_HEIGHT : "0px";
    parts.push(`black calc(100% - ${bottomFade})`);
    parts.push(!isAtBottom ? `transparent 100%` : `black 100%`);
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

// ─── TabBar ───────────────────────────────────────────────────────────────────
function TabBar({
  activeTab,
  onTabClick,
  onHeightChange,
  className,
  style,
}: {
  activeTab: TabId;
  onTabClick: (tab: TabId) => void;
  onHeightChange?: (h: number) => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    const el = ref.current;
    if (!el || !onHeightChange) return;
    const ro = new ResizeObserver(() => onHeightChange(el.offsetHeight));
    ro.observe(el);
    onHeightChange(el.offsetHeight);
    return () => ro.disconnect();
  }, [onHeightChange]);

  return (
    <div ref={ref} className={cn("px-3 pb-3", className)} style={style}>
      <div className="relative inline-flex w-full items-center justify-center rounded-full bg-[#19191B]/50 p-1 backdrop-blur">
        {/* Bottom glow highlight */}
        <div
          className="pointer-events-none absolute inset-0 rounded-full bg-white/35 mix-blend-plus-lighter"
          style={{
            maskImage: `radial-gradient(ellipse at bottom, transparent 60%, black 160%)`,
          }}
        />
        {/* Edge ring */}
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
                    layoutId="nav-tabs-active-bg"
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
  onHeightChange: (h: number) => void;
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

// ─── Sidebar (desktop) ────────────────────────────────────────────────────────
function DesktopSidebar({
  activeTab,
  setActiveTab,
}: {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
}) {
  const { t } = useTranslation();
  const [showHistorical, setShowHistorical] = useState(false);
  const [tabBarHeight, setTabBarHeight] = useState(72);
  const startTour = useTourStore((s) => s.startTour);
  const isWide = WIDE_TABS.includes(activeTab);

  return (
    <motion.div
      animate={{ width: isWide ? "min(60vw, 700px)" : "400px" }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="absolute top-2 right-2 z-10 flex h-[calc(100svh-16px)] rounded-2xl bg-[#19191B]/80 shadow-lg backdrop-blur-md"
      data-tour="incident-panel"
    >
      <div className="relative flex h-full w-full flex-col overflow-hidden rounded-2xl">
        {/* Top bar */}
        <div className="shrink-0">
          <div className="flex w-full items-center justify-between p-3 pb-0">
            {activeTab === "incidents" ? (
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
            ) : (
              <div className="text-lg font-semibold text-white">
                {activeTab === "about" && <span>{t("about.title")}</span>}
                {activeTab === "timeline" && <span>{t("timeline.title")}</span>}
                {activeTab === "topology" && <span>{t("topology.title")}</span>}
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

        {/* Content */}
        <MaskedScroll
          className="min-h-0 flex-1 p-3"
          bottomPad={tabBarHeight + 24}
          key={activeTab}
        >
          <div data-tour="incident-list">
            {activeTab === "incidents" && (
              <IncidentList showHistorical={showHistorical} />
            )}
            {activeTab === "about" && <AboutContent />}
            {activeTab === "timeline" && <TimelineView isActive />}
            {activeTab === "topology" && <TopologyView isActive />}
          </div>
        </MaskedScroll>

        <ProgressiveBlur
          className="pointer-events-none absolute bottom-0 left-0 h-[96px] w-full bg-linear-to-b from-transparent to-black/5"
          blurIntensity={1}
        />
        {/* Floating tab bar */}
        <TabBar
          activeTab={activeTab}
          onTabClick={setActiveTab}
          onHeightChange={setTabBarHeight}
          className="absolute right-0 bottom-0 left-0 z-10 mx-auto w-[400px]"
        />
      </div>

      {/* Glass overlays */}
      <div className="pointer-events-none absolute inset-0 size-full rounded-2xl border border-white/5" />
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl border border-white/10 bg-white/10"
        style={{
          maskImage:
            "radial-gradient(circle at top, black 0%, transparent 20%)",
        }}
      />
    </motion.div>
  );
}

// ─── MobileSidebar ────────────────────────────────────────────────────────────
function MobileSidebar({
  activeTab,
  setActiveTab,
}: {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
}) {
  const { t } = useTranslation();
  const [snap, setSnap] = useState<number | string | null>(SNAP_PEEK);
  const [showHistorical, setShowHistorical] = useState(false);
  const [tabBarHeight, setTabBarHeight] = useState(72);
  const startTour = useTourStore((s) => s.startTour);

  const handleTabClick = (tab: TabId) => {
    setActiveTab(tab);
    if (snap !== SNAP_FULL) setSnap(SNAP_FULL);
  };

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
            data-tour="incident-panel"
            className="fixed right-2 bottom-0 left-2 z-10 flex h-full flex-col rounded-t-2xl border border-white/5 bg-[#19191B]/80 shadow-lg backdrop-blur-md"
            style={{ maxHeight: `calc(100svh - ${MOBILE_DRAWER_TOP_INSET}px)` }}
          >
            {/* Drag handle */}
            <div className="flex shrink-0 items-center justify-center py-3">
              <div className="h-1 w-20 rounded-full bg-white/15" />
            </div>

            {/* Content  */}
            <div
              className={cn(
                "min-h-0 flex-1 overflow-hidden transition-opacity",
              )}
            >
              <div className="shrink-0">
                <div className="flex w-full items-center justify-between px-3 pb-0">
                  {activeTab === "incidents" ? (
                    <NativeSelect
                      className="md:text-md h-auto border-white/5 font-semibold shadow-none"
                      data-tour="incident-mode-select"
                      value={showHistorical.toString()}
                      onChange={(e) =>
                        setShowHistorical(e.target.value === "true")
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
                    <TopologyView isActive={snap !== SNAP_PEEK} />
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

// ─── Root export ──────────────────────────────────────────────────────────────
export default function Sidebar() {
  const [activeTab, setActiveTab] = useState<TabId>("incidents");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return isMobile ? (
    <MobileSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
  ) : (
    <DesktopSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
  );
}

// ─── ChangeLanguageButton ─────────────────────────────────────────────────────
function ChangeLanguageButton() {
  const { i18n } = useTranslation();
  const toggle = () => {
    const next = i18n.language === "en" ? "zh-TW" : "en";
    localStorage.setItem("i18nextLng", next);
    i18n.changeLanguage(next);
  };
  return (
    <SidebarButton onClick={toggle}>
      <Languages className="size-5" />
    </SidebarButton>
  );
}
