import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Sidebar from "./components/Sidebar";
import CableFilter from "./components/CableFilter";

import IntroModal from "@/components/dialog/Intro";
import LanguageSelectModal from "@/components/dialog/LanguageSelect";
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

  const [needsLanguageSelect, setNeedsLanguageSelect] = useState(false);
  useEffect(() => {
    const lng = (localStorage.getItem("i18nextLng") ?? "").trim();
    if (!lng) setNeedsLanguageSelect(true);
  }, []);

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
        <div className="flex w-max flex-col gap-2 md:flex-col-reverse">
          <OutageCounter />
          <MapLegend />
        </div>
      </div>
      <div className="absolute right-2 z-10 max-md:bottom-[168px] md:right-[416px] md:bottom-2">
        <CurrentTime />
      </div>
      <Sidebar />
      <LanguageSelectModal
        open={needsLanguageSelect}
        onDone={() => setNeedsLanguageSelect(false)}
      />
      {!needsLanguageSelect && <IntroModal />}
    </div>
  );
}

export default App;
