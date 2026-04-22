import { useTranslation } from "react-i18next";

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

  return (
    <div className="relative min-w-[188px] rounded-xl bg-white/5 p-2 text-white shadow-lg backdrop-blur-md text-shadow-sm">
      <div className="pointer-events-none absolute inset-0 size-full rounded-xl border border-white/5" />
      <div
        className="pointer-events-none absolute inset-0 rounded-xl border border-white/10 bg-white/10"
        style={{
          maskImage:
            "radial-gradient(circle at top, black 0%, transparent 60%)",
        }}
      />
      <div className="relative flex flex-col gap-2">
        <div className="text-center">
          <p className="text-sm opacity-75">
            {t("legend.title")}
          </p>
          <p className="text-[11px] leading-4 text-white/50">
            {t("legend.description")}
          </p>
        </div>
        <div className="flex flex-col gap-1.5 rounded-lg bg-black/10 px-2 py-1.5">
          {legendItems.map((item) => (
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
              <span className="text-white/80">
                {t(`legend.items.${item.key}`)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
