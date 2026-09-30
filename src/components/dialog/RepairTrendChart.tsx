import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import type { RepairTrendPoint } from '@/lib/annual-statistics';

function RepairPoint({ point, cableName, x, y, width, formatDays, formatDate }: {
  point: RepairTrendPoint;
  cableName: string;
  x: number;
  y: number;
  width: number;
  formatDays: (days: number) => string;
  formatDate: (timestamp: number) => string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const details = [
    [t('annualStatistics.startedAt'), formatDate(point.startedAt)],
    [t('annualStatistics.resolvedAt'), formatDate(point.resolvedAt)],
    [t('annualStatistics.repairDuration'), t('annualStatistics.daysValue', { value: formatDays(point.days) })],
    [t('annualStatistics.rollingAverage'), point.rollingAverage === null
      ? t('annualStatistics.notEnoughSamples')
      : t('annualStatistics.daysValue', { value: formatDays(point.rollingAverage) })],
  ];

  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="absolute size-5 -translate-x-1/2 -translate-y-1/2 cursor-help rounded-full hover:ring-2 hover:ring-sky-300 focus-visible:outline-2 focus-visible:outline-sky-300"
          style={{ left: `${x / width * 100}%`, top: y }}
          aria-label={[cableName, point.incident.title, ...details.map(([label, value]) => `${label}: ${value}`)].join(' · ')}
          onClick={(event) => {
            event.preventDefault();
            setOpen(true);
          }}
        />
      </TooltipTrigger>
      <TooltipContent sideOffset={6} collisionPadding={16} className="max-w-[min(22rem,calc(100vw-2rem))] text-left text-pretty">
        <p className="font-semibold">{cableName}</p>
        <p className="mt-1">{point.incident.title}</p>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 tabular-nums">
          {details.map(([label, value]) => (
            <div key={label} className="contents">
              <dt>{label}</dt>
              <dd className="text-right">{value}</dd>
            </div>
          ))}
        </dl>
      </TooltipContent>
    </Tooltip>
  );
}

export default function RepairTrendChart({ points, cableNames }: {
  points: RepairTrendPoint[];
  cableNames: Map<string, string>;
}) {
  const { t, i18n } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const titleId = useId();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.max(240, entry.contentRect.width));
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const numberFormatter = new Intl.NumberFormat(i18n.language, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const dateFormatter = new Intl.DateTimeFormat(i18n.language, {
    timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });
  const tickFormatter = new Intl.DateTimeFormat(i18n.language, {
    timeZone: 'Asia/Taipei', year: '2-digit', month: '2-digit', day: '2-digit',
  });
  const minDate = points[0].resolvedAt;
  const maxDate = points[points.length - 1].resolvedAt;
  const maxDays = Math.max(1, Math.ceil(Math.max(...points.map((point) => point.days)) / 4) * 4);
  const left = 46;
  const right = width - 18;
  const top = 18;
  const bottom = 216;
  const x = (timestamp: number) => minDate === maxDate
    ? (left + right) / 2
    : left + (timestamp - minDate) / (maxDate - minDate) * (right - left);
  const y = (days: number) => bottom - days / maxDays * (bottom - top);
  const averages = points.filter((point) => point.rollingAverage !== null);
  const tickCount = minDate === maxDate ? 1 : width < 440 ? 3 : 4;

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/75">
        <span className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-sky-400" />
          {t('annualStatistics.completedRepairs')}
        </span>
        <span className="flex items-center gap-2">
          <span className="h-0.5 w-5 bg-amber-400" />
          {t('annualStatistics.rollingAverage')}
        </span>
      </div>
      <p className="text-xs text-white/60">{t('annualStatistics.daysAxis')}</p>
      <div ref={containerRef} className="relative w-full">
        <svg width="100%" height="260" viewBox={`0 0 ${width} 260`} role="img" aria-labelledby={titleId}>
          <title id={titleId}>{t('annualStatistics.chartDescription')}</title>
          {Array.from({ length: 5 }, (_, index) => {
            const days = maxDays * index / 4;
            return (
              <g key={index}>
                <line x1={left} x2={right} y1={y(days)} y2={y(days)} stroke="currentColor" className="text-white/10" />
                <text x={left - 9} y={y(days) + 4} textAnchor="end" fill="currentColor" className="text-white/60" fontSize="11">
                  {new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 }).format(days)}
                </text>
              </g>
            );
          })}
          {Array.from({ length: tickCount }, (_, index) => {
            const date = minDate + (maxDate - minDate) * index / Math.max(1, tickCount - 1);
            return (
              <text key={index} x={x(date)} y={bottom + 23} textAnchor={tickCount === 1 ? 'middle' : index === 0 ? 'start' : index === tickCount - 1 ? 'end' : 'middle'} fill="currentColor" className="text-white/60" fontSize="11">
                {tickFormatter.format(date)}
              </text>
            );
          })}
          <polyline
            points={averages.map((point) => `${x(point.resolvedAt)},${y(point.rollingAverage!)}`).join(' ')}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinejoin="round"
            className="text-amber-400"
          />
          {averages.map((point) => <circle key={point.sourceIndex} cx={x(point.resolvedAt)} cy={y(point.rollingAverage!)} r="2.5" fill="currentColor" className="text-amber-400" />)}
          {points.map((point) => <circle key={point.sourceIndex} cx={x(point.resolvedAt)} cy={y(point.days)} r="3.5" fill="currentColor" className="text-sky-400" />)}
        </svg>
        {points.map((point) => (
          <RepairPoint
            key={point.sourceIndex}
            point={point}
            cableName={cableNames.get(point.incident.cableid) ?? point.incident.cableid}
            x={x(point.resolvedAt)}
            y={y(point.days)}
            width={width}
            formatDays={(days) => numberFormatter.format(days)}
            formatDate={(timestamp) => dateFormatter.format(timestamp)}
          />
        ))}
      </div>
      <p className="text-center text-xs text-white/60">{t('annualStatistics.resolutionAxis')}</p>
      <p className="mt-3 text-xs text-white/60">{t('annualStatistics.pointHint')}</p>
    </div>
  );
}
