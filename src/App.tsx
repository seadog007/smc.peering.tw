import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Sidebar from "./components/Sidebar";
import CableFilter from "./components/CableFilter";

import IntroModal from "@/components/dialog/Intro";
import Map from "./components/Map";
import CurrentTime from "@/components/CurrentTime";
import OutageCounter from "@/components/OutageCounter";
import MapLegend from "@/components/MapLegend";
import "./i18n";

function App() {
  const { t, i18n } = useTranslation();
  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  const [cableFilter, setCableFilter] = useState<"all" | "normal" | "broken">(
    "all",
  );

  return (
    <div className="relative h-svh w-full">
      <Map cableFilter={cableFilter} />
      <div className="absolute top-2 z-10 max-md:right-2 md:left-2">
        <CableFilter
          cableFilter={cableFilter}
          setCableFilter={setCableFilter}
          t={t}
        />
      </div>
      <div className="absolute left-2 z-10 max-md:top-2 md:bottom-2">
        <div className="relative inline-block">
          <OutageCounter />
          <div className="absolute left-0 w-full max-md:top-[calc(100%+0.5rem)] md:bottom-[calc(100%+0.5rem)]">
            <MapLegend />
          </div>
        </div>
      </div>
      <div className="absolute right-2 z-10 max-md:bottom-[168px] md:right-[416px] md:bottom-2">
        <CurrentTime />
      </div>
      <Sidebar />
      <IntroModal />
    </div>
  );
}

export default App;
