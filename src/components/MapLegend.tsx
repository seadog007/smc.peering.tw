import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useMediaQuery } from "usehooks-ts";

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
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [collapsed, setCollapsed] = useState(false);
  const isCollapsed = isMobile && collapsed;

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
    <div className="relative w-full min-w-0 rounded-xl bg-white/5 p-2 text-white shadow-lg backdrop-blur-md text-shadow-sm">
      <div className="pointer-events-none absolute inset-0 size-full rounded-xl border border-white/5" />
      <div
        className="pointer-events-none absolute inset-0 rounded-xl border border-white/10 bg-white/10"
        style={{
          maskImage:
            "radial-gradient(circle at top, black 0%, transparent 60%)",
        }}
      />
      <div className="relative flex flex-col gap-2">
        <div className="relative min-w-0 text-center">
          <div className="min-w-0">
             <div className="relative flex items-center justify-center">
              <p className="text-sm opacity-75">
                {t("legend.title")}
              </p>
              <button
                type="button"
                onClick={() => setCollapsed((value) => !value)}
                className="absolute right-0 flex size-7 items-center justify-center rounded-full bg-white/5 text-white/70 transition-colors hover:bg-white/10 hover:text-white md:hidden"
                aria-expanded={!isCollapsed}
                aria-label={isCollapsed ? "Show map legend" : "Hide map legend"}
              >
                <ChevronDown
                  className={`size-4 transition-transform ${isCollapsed ? "-rotate-90" : "rotate-0"}`}
                />
              </button>
            </div>

            {!isCollapsed && (
              <p className="mt-1 text-[11px] leading-4 text-white/50">
                {t("legend.description")}
              </p>
            )}
          </div>
        </div>
        {!isCollapsed && (
          <div className="flex flex-col gap-1.5 rounded-lg bg-black/10 px-2 py-1.5">
            {visibleLegendItems.map((item) => (
              <div key={item.key} className="flex items-center gap-2 text-xs">
                {item.line ? (
                  <span
                    className="block h-[3px] w-7 shrink-0 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                ) : (
                  <span
                    className="block size-3 shrink-0 rounded-full ring-1 ring-white/25"
                    style={{ backgroundColor: item.color }}
                  />
                )}
                <span className="min-w-0 break-words text-white/80">
                  {t(`legend.items.${item.key}`)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
