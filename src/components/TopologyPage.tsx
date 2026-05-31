import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { TopologyView } from "@/components/dialog/Topology";
import "@/i18n";

export default function TopologyPage() {
  const { t, i18n } = useTranslation();

  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  return (
    <div className="flex h-svh w-full flex-col bg-[#0b0b0d] text-white">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <a
          href="/"
          className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft className="size-4" />
          {t("topology.backToMap")}
        </a>
        <h1 className="text-base font-semibold sm:text-lg">
          {t("topology.title")}
        </h1>
      </header>
      <main className="min-h-0 flex-1 overflow-hidden p-3 sm:p-4">
        <TopologyView isActive variant="page" />
      </main>
    </div>
  );
}
