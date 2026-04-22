import { useCallback, useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useLocalStorage } from "usehooks-ts";
import { driver, type Driver } from "driver.js";
import { useTourStore } from "@/stores/tour";

function getEl(selector: string) {
  return document.querySelector(selector) as HTMLElement | null;
}

export default function TourController() {
  const { t } = useTranslation();
  const setStartTour = useTourStore((s) => s.setStartTour);

  const [tourAutoStartAllowed, setTourAutoStartAllowed] = useLocalStorage(
    "tourAutoStartAllowed",
    false,
  );
  const [warningAcknowledged] = useLocalStorage("warningAcknowledged", false);
  const [tourTriggered, setTourTriggered] = useLocalStorage(
    "tourTriggered",
    false,
  );

  const driverRef = useRef<Driver | null>(null);
  const runningRef = useRef(false);

  const popoverClassName = useMemo(
    () =>
      [
        "max-w-[320px] rounded-xl border border-black/10 bg-white text-slate-900 shadow-lg",
        "[&_.driver-popover-title]:text-base [&_.driver-popover-title]:font-semibold",
        "[&_.driver-popover-description]:text-sm [&_.driver-popover-description]:text-slate-700",
        "[&_.driver-popover-footer]:gap-2",
        "[&_.driver-popover-navigation-btns]:gap-2",
        "[&_.driver-popover-prev-btn]:rounded-lg [&_.driver-popover-prev-btn]:border [&_.driver-popover-prev-btn]:border-black/10 [&_.driver-popover-prev-btn]:bg-white [&_.driver-popover-prev-btn]:px-3 [&_.driver-popover-prev-btn]:py-2 [&_.driver-popover-prev-btn]:text-slate-900 [&_.driver-popover-prev-btn]:hover:bg-slate-50",
        "[&_.driver-popover-next-btn]:rounded-lg [&_.driver-popover-next-btn]:border [&_.driver-popover-next-btn]:border-black/10 [&_.driver-popover-next-btn]:bg-slate-900 [&_.driver-popover-next-btn]:px-3 [&_.driver-popover-next-btn]:py-2 [&_.driver-popover-next-btn]:text-white [&_.driver-popover-next-btn]:hover:bg-slate-800",
        "[&_.driver-popover-close-btn]:text-slate-500 [&_.driver-popover-close-btn]:hover:text-slate-900",
      ].join(" "),
    [],
  );

  const buildDriver = useCallback(() => {
    const d = driver({
      showProgress: true,
      overlayOpacity: 0.75,
      smoothScroll: false,
      allowClose: true,
      nextBtnText: t("tour.controls.next"),
      prevBtnText: t("tour.controls.back"),
      doneBtnText: t("tour.controls.done"),
      onDestroyed: () => {
        runningRef.current = false;
        driverRef.current = null;
      },
      steps: [
        {
          element: '[data-tour="counter"]',
          popover: {
            title: t("tour.counter.title"),
            description: t("tour.counter.body"),
            side: "right",
            align: "start",
            popoverClass: popoverClassName,
            onPopoverRender: () => getEl('[data-tour="counter"]'),
          },
        },
        {
          element: '[data-tour="map-legend"]',
          popover: {
            title: t("tour.legend.title"),
            description: t("tour.legend.body"),
            side: "right",
            align: "start",
            popoverClass: popoverClassName,
            onPopoverRender: () => getEl('[data-tour="map-legend"]'),
          },
        },
        {
          element: '[data-tour="incident-panel"]',
          popover: {
            title: t("tour.incidents.title"),
            description: t("tour.incidents.body"),
            side: "left",
            align: "start",
            popoverClass: popoverClassName,
            onPopoverRender: () => getEl('[data-tour="incident-panel"]'),
          },
        },
      ],
    });
    return d;
  }, [popoverClassName, t]);

  const startTour = useCallback(() => {
    if (runningRef.current) return;
    runningRef.current = true;

    const d = buildDriver();
    driverRef.current = d;
    d.drive();
  }, [buildDriver]);

  useEffect(() => {
    setStartTour(startTour);
    return () => {
      setStartTour(() => {});
      driverRef.current?.destroy();
      driverRef.current = null;
    };
  }, [setStartTour, startTour]);

  useEffect(() => {
    if (!tourAutoStartAllowed && warningAcknowledged) {
      setTourAutoStartAllowed(true);
    }
  }, [setTourAutoStartAllowed, tourAutoStartAllowed, warningAcknowledged]);

  useEffect(() => {
    if (!tourAutoStartAllowed) return;
    if (tourTriggered) return;
    setTourTriggered(true);
    startTour();
  }, [setTourTriggered, startTour, tourAutoStartAllowed, tourTriggered]);

  return null;
}

