import { useTranslation } from "react-i18next";
const CABLE_COUNT = 56;
const OUTAGE_COUNT = 2;
export default function OutageCounter() {
  const { t } = useTranslation();
  return (
    <div className="flex w-full justify-between gap-2">
      <div className="relative w-max rounded-2xl bg-[#19191B]/50 shadow-lg backdrop-blur-md">
        <div className="pointer-events-none absolute inset-0 size-full rounded-2xl border border-white/5" />
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl border border-white/10 bg-white/10"
          style={{
            maskImage:
              "radial-gradient(circle at top, black 0%, transparent 80%)",
          }}
        />
        <div className="flex divide-x divide-white/5 text-center tabular-nums">
          <div className="flex w-16 flex-col gap-1 px-3 py-2">
            <div className="text-2xl leading-[1em] text-red-400">
              {OUTAGE_COUNT}
            </div>
            <div className="text-xs opacity-50">{t("common.disconnected")}</div>
          </div>
          <div className="flex w-16 flex-col gap-1 px-3 py-2">
            <div className="text-2xl leading-[1em]">{CABLE_COUNT}</div>
            <div className="text-xs opacity-50">{t("common.total")}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
