import type { Incident } from './incidents';

export type IncidentScope = 'outages' | 'all';
export type RepairWindow = 5 | 10 | 20;
type StatisticsIncident = Pick<Incident, 'date' | 'status' | 'reason' | 'cableid' | 'title'> & {
  resolved_at?: string | null;
};

export interface AnnualSummary {
  year: number;
  incidents: number;
  repaired: number;
  unresolved: number;
  excludedRepairs: number;
  averageDays: number | null;
}

export interface CompletedRepair {
  sourceIndex: number;
  incident: StatisticsIncident;
  startedAt: number;
  resolvedAt: number;
  days: number;
}

export interface RepairTrendPoint extends CompletedRepair {
  rollingAverage: number | null;
}

const DAY_MS = 86_400_000;
const yearFormatter = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Taipei', year: 'numeric' });

// Unzoned ISO dates are Taiwan local time, independent of the viewer's timezone.
// Validate calendar days explicitly because Date.parse normalizes e.g. February 30.
function parseIncidentDate(value: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:\d{2})?)?$/.exec(value.trim());
  if (!match) return NaN;
  const [, year, month, day, hour, minute, second, , zone] = match;
  const calendarDate = new Date(`${year}-${month}-${day}T00:00:00Z`);
  if (calendarDate.getUTCFullYear() !== Number(year)
    || calendarDate.getUTCMonth() + 1 !== Number(month)
    || calendarDate.getUTCDate() !== Number(day)
    || Number(hour ?? 0) > 23 || Number(minute ?? 0) > 59 || Number(second ?? 0) > 59) return NaN;
  return Date.parse(hour ? `${value.trim()}${zone ? '' : '+08:00'}` : `${value.trim()}T00:00:00+08:00`);
}

export function buildAnnualStatistics(
  incidents: readonly StatisticsIncident[],
  scope: IncidentScope,
  now: number,
) {
  const byYear = new Map<number, AnnualSummary>();
  const completedRepairs: CompletedRepair[] = [];
  let invalidStarts = 0;
  let futureStarts = 0;
  let excludedRepairs = 0;

  incidents.forEach((incident, sourceIndex) => {
    if (scope === 'outages' && (incident.reason === 'maintenance'
      || !['disconnected', 'partial_disconnected'].includes(incident.status))) return;

    const startedAt = parseIncidentDate(incident.date);
    if (!Number.isFinite(startedAt)) {
      invalidStarts++;
      return;
    }
    if (startedAt > now) {
      futureStarts++;
      return;
    }

    const year = Number(yearFormatter.format(startedAt));
    const summary = byYear.get(year) ?? {
      year, incidents: 0, repaired: 0, unresolved: 0, excludedRepairs: 0, averageDays: null,
    };
    byYear.set(year, summary);
    summary.incidents++;

    if (!incident.resolved_at?.trim()) {
      summary.unresolved++;
      return;
    }
    const resolvedAt = parseIncidentDate(incident.resolved_at);
    if (!Number.isFinite(resolvedAt) || resolvedAt < startedAt || resolvedAt > now) {
      summary.excludedRepairs++;
      excludedRepairs++;
      return;
    }
    const days = (resolvedAt - startedAt) / DAY_MS;
    const totalDays = (summary.averageDays ?? 0) * summary.repaired + days;
    summary.repaired++;
    summary.averageDays = totalDays / summary.repaired;
    completedRepairs.push({ sourceIndex, incident, startedAt, resolvedAt, days });
  });

  // Show zero-event years inside the available range, including the current year.
  if (byYear.size) {
    const firstYear = Math.min(...byYear.keys());
    const currentYear = Number(yearFormatter.format(now));
    for (let year = firstYear; year <= currentYear; year++) {
      if (!byYear.has(year)) {
        byYear.set(year, { year, incidents: 0, repaired: 0, unresolved: 0, excludedRepairs: 0, averageDays: null });
      }
    }
  }

  completedRepairs.sort((a, b) => a.resolvedAt - b.resolvedAt || a.sourceIndex - b.sourceIndex);
  return {
    years: [...byYear.values()].sort((a, b) => b.year - a.year),
    completedRepairs,
    invalidStarts,
    futureStarts,
    excludedRepairs,
  };
}

export function buildRepairTrend(repairs: readonly CompletedRepair[], window: RepairWindow): RepairTrendPoint[] {
  let total = 0;
  return repairs.map((repair, index) => {
    total += repair.days;
    if (index >= window) total -= repairs[index - window].days;
    return { ...repair, rollingAverage: index + 1 >= window ? total / window : null };
  });
}
