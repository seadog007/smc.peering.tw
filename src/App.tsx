import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Funnel } from "lucide-react";
import Sidebar from "./components/Sidebar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

import IntroModal from "@/components/dialog/Intro";
import Map from "./components/Map";
import CurrentTime from "./components/CurrentTime";

import "./i18n";

function App() {
  const { t, i18n } = useTranslation();
  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);
  const [cableFilter, setCableFilter] = useState<"all" | "normal" | "broken">(
    "all",
  );

  const handleCableFilterChange = (value: string) => {
    if (value.startsWith("filter-")) {
      setCableFilter(
        value.replace("filter-", "") as "all" | "normal" | "broken",
      );
    }
  };
  return (
    <div className="relative h-[100svh] w-full">
      <Map cableFilter={cableFilter} />
      <div className="absolute top-2 max-md:right-2 md:left-2">
        <Select
          onValueChange={handleCableFilterChange}
          value={`filter-${cableFilter}`}
        >
          <SelectTrigger className="flex w-12 items-center justify-center rounded-full border border-white/5 p-0 shadow-lg backdrop-blur-md data-[size=default]:h-12 dark:bg-[#19191B]/80 dark:hover:bg-[#19191B] [&>svg:nth-child(2)]:hidden">
            <Funnel className="size-4" />
          </SelectTrigger>
          <SelectContent className="border border-white/5 bg-[#19191B]/80 shadow-lg backdrop-blur-md">
            <SelectItem value="filter-all">{t("filter.all")}</SelectItem>
            <SelectItem value="filter-normal">{t("filter.normal")}</SelectItem>
            <SelectItem value="filter-broken">{t("filter.broken")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="absolute left-2 max-md:top-2 md:bottom-2">
        <CurrentTime />
      </div>
      <Sidebar />
      <IntroModal />
    </div>
  );
}

export default App;
