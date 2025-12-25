import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

type Path = string[];

interface CableLite {
  id: string;
  name: string;
  available_path?: Path[];
  segments?: { id: string; retired?: boolean }[];
}

interface Incident {
  date: string;
  status: string;
  cableid: string;
  segment: string;
  resolved_at: string;
}

export default function OutageCounter() {
  const { t } = useTranslation();

  const [total, setTotal] = useState<number | null>(null);
  const [outages, setOutages] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadCablesLite(): Promise<CableLite[]> {
      const modules = import.meta.glob("../data/cables/*.json");
      const cablePromises = Object.values(modules).map(async (loader: any) => {
        const module = await loader();
        return (module as { default: CableLite }).default;
      });
      return Promise.all(cablePromises);
    }

    async function loadIncidents(): Promise<Incident[]> {
      const res = await fetch("/data/incidents.json");
      if (!res.ok) throw new Error(`Failed to fetch incidents: ${res.status}`);
      const incidentsData = (await res.json()) as Incident[];
      incidentsData.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
      return incidentsData;
    }

    function commonPrefixLength(paths: Path[]) {
      if (paths.length === 0) return 0;
      let prefixLen = paths[0].length;
      for (const path of paths.slice(1)) {
        prefixLen = Math.min(prefixLen, path.length);
        for (let i = 0; i < prefixLen; i++) {
          if (path[i] !== paths[0][i]) {
            prefixLen = i;
            break;
          }
        }
      }
      return prefixLen;
    }

    function groupPaths(paths: Path[]) {
      const grouped: Path[][] = [];
      const byFirstTwo = new Map<string, Path[]>();

      for (const path of paths) {
        if (path.length >= 2) {
          const key = `${path[0]}|${path[1]}`;
          const bucket = byFirstTwo.get(key) ?? [];
          bucket.push(path);
          byFirstTwo.set(key, bucket);
        } else {
          grouped.push([path]);
        }
      }

      for (const bucket of byFirstTwo.values()) {
        if (bucket.length > 1) {
          grouped.push(bucket);
        } else {
          grouped.push([bucket[0]]);
        }
      }

      return grouped;
    }

    function isDomesticPath(path: Path) {
      if (path.length < 2) return false;
      const start = path[0];
      const end = path[path.length - 1];
      return start.startsWith("TW") && end.startsWith("TW");
    }

    function computePathAvailability(
      cables?: CableLite[],
      incidents?: Incident[],
    ) {
      if (!cables || !incidents)
        return { totalIntl: 0, remainingIntl: 0, totalDom: 0, remainingDom: 0 };

      let totalIntl = 0;
      let remainingIntl = 0;
      let totalDom = 0;
      let remainingDom = 0;

      const activeIncidents = incidents.filter(
        (incident) =>
          !incident.resolved_at || incident.resolved_at.trim() === "",
      );

      cables.forEach((cable) => {
        if (!cable.available_path || cable.available_path.length === 0) return;

        // Identify retired segments for this cable
        const retiredSegments = new Set(
          cable.segments
            ?.filter((s) => s.retired)
            .map((s) => s.id) || []
        );

        // Filter out paths that contain any retired segment
        const validPaths = cable.available_path.filter((path) => {
          // If the path contains a node (segment ID) that is marked as retired, exclude it.
          // Note: 'path' array contains segment IDs mixed with country codes? 
          // Based on c2c.json: ["TW", "c2c-seg-2b", "c2c-seg-2a", "HK"]
          // "c2c-seg-2b" is a segment ID.
          return !path.some((node) => retiredSegments.has(node));
        });

        if (validPaths.length === 0) return;

        const downSegments = new Set(
          activeIncidents
            .filter((incident) => incident.cableid === cable.id)
            .map((incident) => incident.segment?.trim())
            .filter((id): id is string => Boolean(id && id.length > 0)),
        );

        const pathGroups = groupPaths(validPaths);

        pathGroups.forEach((paths) => {
          if (paths.length === 0) return;

          // Treat single paths as independent routes.
          if (paths.length === 1) {
            const path = paths[0];
            const isUp = path.every((node) => !downSegments.has(node));
            const domestic = isDomesticPath(path);
            if (domestic) {
              totalDom += 1;
              if (isUp) remainingDom += 1;
            } else {
              totalIntl += 1;
              if (isUp) remainingIntl += 1;
            }
            return;
          }

          // Shared backbone with multiple branches (e.g., APG)
          const prefixLen = commonPrefixLength(paths);
          // Require at least two shared nodes to consider grouped; otherwise fall back to independent counting.
          if (prefixLen < 2) {
            paths.forEach((path) => {
              const isUp = path.every((node) => !downSegments.has(node));
              const domestic = isDomesticPath(path);
              if (domestic) {
                totalDom += 1;
                if (isUp) remainingDom += 1;
              } else {
                totalIntl += 1;
                if (isUp) remainingIntl += 1;
              }
            });
            return;
          }

          // Grouped path category: if all paths are domestic, treat as domestic; otherwise international.
          const groupDomestic = paths.every((p) => isDomesticPath(p));

          if (groupDomestic) {
            totalDom += 1;
          } else {
            totalIntl += 1;
          }

          const shared = paths[0].slice(0, prefixLen);
          const sharedDown = shared.some((node) => downSegments.has(node));
          if (sharedDown) return;

          const branchUp = paths.some((path) =>
            path.slice(prefixLen).every((node) => !downSegments.has(node)),
          );
          if (!branchUp) return;

          if (groupDomestic) {
            remainingDom += 1;
          } else {
            remainingIntl += 1;
          }
        });
      });

      return { totalIntl, remainingIntl, totalDom, remainingDom };
    }

    (async () => {
      try {
        const [cables, incidents] = await Promise.all([
          loadCablesLite(),
          loadIncidents(),
        ]);
        //@ts-ignore 這是等等會用到的妙妙工具
        const { totalDom, totalIntl, remainingDom, remainingIntl } =
          computePathAvailability(cables, incidents);
        if (!mounted) return;
        setTotal(totalIntl);
        setOutages(totalIntl - remainingIntl);
      } catch (err) {
        // on error, fallback to nulls
        // console.error(err);
        if (!mounted) return;
        setTotal(null);
        setOutages(null);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const totalDisplay = total ?? "--";
  const onlineDisplay = total && outages ? total - outages : "--";
  const outageDisplay = outages ?? "--";

  return (
    <div className="relative mb-1 rounded-xl bg-white/5 p-2 shadow-lg backdrop-blur-md text-shadow-sm">
      <div className="pointer-events-none absolute inset-0 size-full rounded-xl border border-white/5" />
      <div
        className="pointer-events-none absolute inset-0 rounded-xl border border-white/10 bg-white/10"
        style={{
          maskImage:
            "radial-gradient(circle at top, black 0%, transparent 60%)",
        }}
      />
      <div className="text-center text-sm opacity-75">
        {t("common.outageStatus")}
      </div>
      <div className="flex items-center justify-center text-center tabular-nums">
        <div className="flex w-16 flex-col gap-1 px-3 py-2">
          <div className="bg-linear-to-b from-green-300 to-green-500 bg-clip-text text-2xl leading-[1em] font-semibold text-transparent">
            {onlineDisplay}
          </div>
          <div className="text-xs opacity-50">{t("common.online")}</div>
        </div>
        <div className="h-10 w-px bg-linear-to-b from-transparent via-white/20 to-transparent" />
        <div className="flex w-16 flex-col gap-1 px-3 py-2">
          <div className="bg-linear-to-b from-red-300 to-red-500 bg-clip-text text-2xl leading-[1em] font-semibold text-transparent">
            {outageDisplay}
          </div>
          <div className="text-xs opacity-50">{t("common.disconnected")}</div>
        </div>
        <div className="h-10 w-px bg-linear-to-b from-transparent via-white/20 to-transparent" />
        <div className="flex w-16 flex-col gap-1 px-3 py-2">
          <div className="bg-linear-to-b from-white to-gray-100 bg-clip-text text-2xl leading-[1em] font-semibold text-transparent">
            {totalDisplay}
          </div>
          <div className="text-xs opacity-50">{t("common.total")}</div>
        </div>
      </div>
      <div className="shdaow-sm relative h-0.5 w-full overflow-hidden rounded-full bg-white/50">
        <div
          className="absolute top-0 left-0 h-full bg-linear-to-b from-green-400 to-green-500"
          style={{
            width:
              total && outages ? `${((total - outages) / total) * 100}%` : "0%",
          }}
        />
        <div
          className="absolute top-0 right-0 h-full bg-linear-to-b from-red-400 to-red-500"
          style={{
            width: total && outages ? `${(outages / total) * 100}%` : "0%",
          }}
        />
      </div>
    </div>
  );
}
