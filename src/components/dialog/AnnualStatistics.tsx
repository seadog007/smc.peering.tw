import { useQuery } from '@tanstack/react-query';
import { useEffect, useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Skeleton } from '@/components/ui/skeleton';
import { buildAnnualStatistics, buildRepairTrend } from '@/lib/annual-statistics';
import { cablesQueryOptions } from '@/lib/cables';
import { incidentsQueryOptions } from '@/lib/incidents';

import RepairTrendChart from './RepairTrendChart';

import type { IncidentScope, RepairWindow } from '@/lib/annual-statistics';

export default function AnnualStatistics({ isActive }: { isActive: boolean }) {
  const { t, i18n } = useTranslation();
  const id = useId();
  const [scope, setScope] = useState<IncidentScope>('outages');
  const [window, setWindow] = useState<RepairWindow>(5);
  const [now, setNow] = useState(Date.now);
  const { data: incidents, isPending, isError, refetch, isFetching } = useQuery({ ...incidentsQueryOptions, enabled: isActive });
  const { data: cables } = useQuery({ ...cablesQueryOptions, enabled: isActive });

  useEffect(() => {
    if (!isActive) return;
    setNow(Date.now());
    const timer = globalThis.setInterval(() => setNow(Date.now()), 60_000);
    return () => globalThis.clearInterval(timer);
  }, [isActive]);

  const statistics = useMemo(() => buildAnnualStatistics(incidents ?? [], scope, now), [incidents, scope, now]);
  const trend = useMemo(() => buildRepairTrend(statistics.completedRepairs, window), [statistics, window]);
  const cableNames = useMemo(() => new Map(cables?.map((cable) => [cable.id, cable.name])), [cables]);
  const formatDays = (days: number) => new Intl.NumberFormat(i18n.language, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(days);

  if (isPending) {
    return (
      <div role="status" className="space-y-4">
        <p className="text-sm text-white/60">{t('annualStatistics.loading')}</p>
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError && !incidents) {
    return (
      <div role="alert" className="space-y-3 py-6 text-sm">
        <p>{t('annualStatistics.loadError')}</p>
        <button type="button" className="rounded-md border border-white/20 px-3 py-2 hover:bg-white/10" disabled={isFetching} onClick={() => { void refetch(); }}>
          {t('annualStatistics.retry')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-sm text-white/90">
      <div className="space-y-4">
        <p className="rounded-lg border border-sky-400/20 bg-sky-400/5 p-3 text-xs leading-relaxed text-sky-100/80">{t('annualStatistics.coverageNote')}</p>
        {isError && <p role="status" className="text-xs text-amber-200">{t('annualStatistics.refreshError')}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor={`${id}-scope`} className="font-medium">{t('annualStatistics.scope')}</label>
          <NativeSelect id={`${id}-scope`} value={scope} onChange={(event) => setScope(event.target.value as IncidentScope)}>
            <NativeSelectOption value="outages">{t('annualStatistics.outages')}</NativeSelectOption>
            <NativeSelectOption value="all">{t('annualStatistics.all')}</NativeSelectOption>
          </NativeSelect>
        </div>
        <p className="text-xs leading-relaxed text-white/60">{t(`annualStatistics.${scope}Definition`)}</p>
      </div>

      <section aria-labelledby={`${id}-annual`} className="space-y-3">
        <h2 id={`${id}-annual`} className="font-semibold">{t('annualStatistics.annualOverview')}</h2>
        {statistics.years.length === 0
          ? <p className="rounded-lg border border-white/10 p-6 text-center text-white/60">{t('annualStatistics.noIncidents')}</p>
          : (
              <div className="overflow-hidden rounded-lg border border-white/10">
                <table className="w-full table-fixed text-right text-xs tabular-nums sm:text-sm">
                  <caption className="sr-only">{t('annualStatistics.annualOverview')}</caption>
                  <thead className="bg-white/5 text-white/60">
                    <tr>
                      <th scope="col" className="w-[16%] px-2 py-3 text-left font-medium">{t('annualStatistics.year')}</th>
                      <th scope="col" className="px-2 py-3 font-medium">{t('annualStatistics.incidentCount')}</th>
                      <th scope="col" className="px-2 py-3 font-medium">{t('annualStatistics.repairedCount')}</th>
                      <th scope="col" className="px-2 py-3 font-medium">{t('annualStatistics.unresolvedCount')}</th>
                      <th scope="col" className="px-2 py-3 font-medium">{t('annualStatistics.averageDays')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {statistics.years.map((year) => (
                      <tr key={year.year}>
                        <th scope="row" className="px-2 py-4 text-left font-medium">{year.year}</th>
                        <td className="px-2 py-4">{year.incidents}</td>
                        <td className="px-2 py-4">
                          {year.repaired}
                          {year.excludedRepairs > 0 && <span className="mt-1 block text-[10px] text-amber-200">{t('annualStatistics.invalidRepairCount', { count: year.excludedRepairs })}</span>}
                        </td>
                        <td className="px-2 py-4">{year.unresolved}</td>
                        <td className="px-2 py-4 font-medium text-sky-300">{year.averageDays === null ? '—' : formatDays(year.averageDays)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        <div className="space-y-1 text-xs leading-relaxed text-amber-200">
          {statistics.invalidStarts > 0 && <p>{t('annualStatistics.invalidStarts', { count: statistics.invalidStarts })}</p>}
          {statistics.futureStarts > 0 && <p>{t('annualStatistics.futureStarts', { count: statistics.futureStarts })}</p>}
          {statistics.excludedRepairs > 0 && <p>{t('annualStatistics.excludedRepairs', { count: statistics.excludedRepairs })}</p>}
        </div>
      </section>

      <section aria-labelledby={`${id}-trend`} className="rounded-lg border border-white/10 p-3 sm:p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 id={`${id}-trend`} className="font-semibold">{t('annualStatistics.trendTitle')}</h2>
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor={`${id}-window`} className="text-xs text-white/60">{t('annualStatistics.window')}</label>
            <NativeSelect id={`${id}-window`} value={window} onChange={(event) => setWindow(Number(event.target.value) as RepairWindow)}>
              {([5, 10, 20] as const).map((count) => <NativeSelectOption key={count} value={count}>{t('annualStatistics.windowSize', { count })}</NativeSelectOption>)}
            </NativeSelect>
          </div>
        </div>
        {trend.length > 0
          ? <RepairTrendChart points={trend} cableNames={cableNames} />
          : <p className="py-10 text-center text-white/60">{t('annualStatistics.noRepairs')}</p>}
        {trend.length > 0 && trend.length < window && <p className="mt-3 text-xs text-amber-200">{t('annualStatistics.insufficientSamples', { count: trend.length, window })}</p>}
        <p className="mt-4 text-xs leading-relaxed text-white/60">{t('annualStatistics.trendDefinition', { count: window })}</p>
      </section>

      <details className="text-xs leading-relaxed text-white/60">
        <summary className="cursor-pointer font-medium text-white/80">{t('annualStatistics.methodology')}</summary>
        <div className="mt-2 space-y-2">
          <p>{t('annualStatistics.yearDefinition')}</p>
          <p>{t('annualStatistics.repairDefinition')}</p>
          <p>{t('annualStatistics.unresolvedDefinition')}</p>
        </div>
      </details>
    </div>
  );
}
