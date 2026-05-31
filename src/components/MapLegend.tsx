import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "motion/react";

interface CableWithEquipment {
  equipments?: unknown[];
}

async function loadCablesForLegend(): Promise<CableWithEquipment[]> {
  const modules = import.meta.glob("../data/cables/*.json");
  const cablePromises = Object.values(modules).map(async (loader) => {
    const module = await loader();
    return (module as { default: CableWithEquipment }).default;
  });
  return Promise.all(cablePromises);
}

const legendItems = [
  {
    key: "normal",
    color: "#48A9FF",
    line: true,
  },
  {
    key: "broken",
    color: "#ff0000",
    line: true,
  },
  {
    key: "partial",
    color: "#fcc800",
    line: true,
  },
  {
    key: "retired",
    color: "#292a2f",
    line: true,
  },
  {
    key: "building",
    color: "#292a2f",
    line: true,
    dashed: true,
  },
  {
    key: "landingPoint",
    color: "#2563eb",
    line: false,
  },
  {
    key: "equipment",
    color: "#ffffff",
    line: false,
  },
] as const;

export default function MapLegend() {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);
  const isCollapsed = collapsed;

  const { data: cables } = useQuery({
    queryKey: ["cables"],
    queryFn: async () => loadCablesForLegend(),
  });

  const hasEquipment = Boolean(
    cables?.some((cable) => (cable.equipments?.length ?? 0) > 0),
  );

  const visibleLegendItems = hasEquipment
    ? legendItems
    : legendItems.filter((item) => item.key !== "equipment");

  return (
    <div
      className="relative w-full min-w-0 rounded-xl bg-white/5 p-2 text-white shadow-lg backdrop-blur-md text-shadow-sm"
      data-tour="map-legend"
    >
      <div className="pointer-events-none absolute inset-0 size-full rounded-xl border border-white/5" />
      <div
        className="pointer-events-none absolute inset-0 rounded-xl border border-white/10 bg-white/10"
        style={{
          maskImage:
            "radial-gradient(circle at top, black 0%, transparent 60%)",
        }}
      />
      <div className="relative flex flex-col md:flex-col-reverse">
        <div className="relative flex min-h-7 items-center justify-center">
          <p className="text-sm opacity-75">{t("legend.title")}</p>
          <motion.button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            className="absolute right-0 flex size-7 items-center justify-center rounded-full text-white/70 backdrop-blur-lg transition-colors hover:bg-white/10 hover:text-white"
            aria-expanded={!isCollapsed}
            aria-label={isCollapsed ? "Show map legend" : "Hide map legend"}
            whileHover={{
              scale: 1.05,
            }}
            whileTap={{
              scale: 0.95,
            }}
          >
            <ChevronDown
              className={`size-4 transition-transform ${isCollapsed ? "-rotate-180" : "rotate-0"}`}
            />
          </motion.button>
        </div>
        <AnimatePresence initial={false}>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, height: 0, filter: "blur(4px)" }}
              animate={{ opacity: 1, height: "auto", filter: "blur(0px)" }}
              exit={{ opacity: 0, height: 0, filter: "blur(4px)" }}
              className="overflow-hidden"
            >
              <div className="relative flex flex-col gap-1.5 rounded-lg bg-white/10 px-2 py-1.5 max-md:mt-2 md:mb-2">
                <div className="pointer-events-none absolute inset-0 size-full rounded-lg border border-white/5" />
                <div
                  className="pointer-events-none absolute inset-0 rounded-lg border border-white/10 bg-white/10"
                  style={{
                    maskImage:
                      "radial-gradient(circle at top, black 0%, transparent 60%)",
                  }}
                />
                {visibleLegendItems.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center gap-2 text-xs"
                  >
                    <span className="flex w-7 shrink-0 items-center justify-center">
                      {item.line ? (
                        <span
                          className="block h-[3px] w-7 rounded-full"
                          style={{
                            backgroundColor:
                              "dashed" in item && item.dashed
                                ? undefined
                                : item.color,
                            backgroundImage:
                              "dashed" in item && item.dashed
                                ? `repeating-linear-gradient(to right, ${item.color} 0 6px, transparent 6px 10px)`
                                : undefined,
                          }}
                        />
                      ) : (
                        <span
                          className="block size-3 rounded-full ring-1 ring-white/25"
                          style={{ backgroundColor: item.color }}
                        />
                      )}
                    </span>
                    <span className="min-w-0 break-words text-white/80">
                      {t(`legend.items.${item.key}`)}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
