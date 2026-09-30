import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import * as ts from 'typescript';

// Exercise the actual pure TypeScript modules without adding a test dependency.
async function loadModule(path) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
  });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}

const { buildAnnualStatistics, buildRepairTrend } = await loadModule('../src/lib/annual-statistics.ts');
const { newestIncidentsFirst } = await loadModule('../src/lib/incidents.ts');
const now = Date.parse('2026-09-30T12:00:00+08:00');
const incident = (overrides = {}) => ({
  date: '2025-01-01T00:00:00+08:00',
  resolved_at: '2025-01-02T12:00:00+08:00',
  status: 'disconnected', reason: 'unknown', cableid: 'test-cable', title: 'Test incident',
  ...overrides,
});
const summary = (records, scope = 'outages') => buildAnnualStatistics(records, scope, now);

test('empty input and scopes without eligible events have no years or trend', () => {
  assert.deepEqual(summary([]).years, []);
  assert.deepEqual(summary([incident({ status: 'notice' })]).completedRepairs, []);
  assert.deepEqual(buildRepairTrend([], 5), []);
});

test('outages include full and partial disconnections, excluding maintenance', () => {
  const records = [incident(), incident({ status: 'partial_disconnected' }),
    incident({ reason: 'maintenance' }), incident({ status: 'notice' })];
  assert.equal(summary(records).years.find((year) => year.year === 2025).incidents, 2);
  assert.equal(summary(records, 'all').years.find((year) => year.year === 2025).incidents, 4);
});

test('records are counted individually and fractional and zero-day repairs are retained', () => {
  const duplicate = incident();
  const result = summary([duplicate, duplicate,
    incident({ resolved_at: '2025-01-01T06:00:00+08:00' }),
    incident({ resolved_at: '2025-01-01T00:00:00+08:00' })]);
  const year = result.years.find((row) => row.year === 2025);
  assert.equal(year.incidents, 4);
  assert.equal(year.repaired, 4);
  assert.equal(year.averageDays, 3.25 / 4);
});

test('unresolved records are counted without inventing repair durations', () => {
  const result = summary(['', '  ', null, undefined].map((resolved_at) => incident({ resolved_at })));
  assert.equal(result.years[1].unresolved, 4);
  assert.equal(result.years[1].averageDays, null);
  assert.equal(result.completedRepairs.length, 0);
});

test('start years use Taipei time and cross-year repairs belong to the start year', () => {
  const result = summary([
    incident({ date: '2024-12-31T15:59:00Z', resolved_at: '2025-01-02T15:59:00Z' }),
    incident({ date: '2024-12-31T16:00:00Z', resolved_at: '2025-01-01T16:00:00Z' }),
  ]);
  assert.equal(result.years.find((row) => row.year === 2024).averageDays, 2);
  assert.equal(result.years.find((row) => row.year === 2025).averageDays, 1);
});

test('date-only and unzoned ISO dates are Taiwan local time', () => {
  const result = summary([
    incident({ date: '2025-01-01', resolved_at: '2025-01-02T00:00:00+08:00' }),
    incident({ date: '2025-01-01T00:00', resolved_at: '2025-01-01T06:00:00+08:00' }),
  ]);
  assert.deepEqual(result.completedRepairs.map((repair) => repair.days), [0.25, 1]);
});

test('invalid starts and future starts are excluded from all totals', () => {
  const result = summary(['invalid', '', '2025-02-29', '2025-02-30', '2025-13-01', '2025-01-01T24:00:00Z', '2027-01-01']
    .map((date) => incident({ date })));
  assert.equal(result.invalidStarts, 6);
  assert.equal(result.futureStarts, 1);
  assert.deepEqual(result.years, []);
});

test('valid leap days and timestamps equal to now are accepted', () => {
  const result = summary([
    incident({ date: '2024-02-29', resolved_at: '2024-03-01' }),
    incident({ date: '2026-09-30T12:00:00+08:00', resolved_at: '2026-09-30T12:00:00+08:00' }),
  ]);
  assert.deepEqual(result.completedRepairs.map((repair) => repair.days), [1, 0]);
});

test('invalid, reversed, and future repairs remain events but are excluded from repair calculations', () => {
  const records = ['bad', '2025-02-30', '2024-12-31', '2027-01-01'].map((resolved_at) => incident({ resolved_at }));
  records.push(incident({ resolved_at: '' }), incident());
  const result = summary(records);
  const year = result.years.find((row) => row.year === 2025);
  assert.equal(result.excludedRepairs, 4);
  assert.deepEqual([year.incidents, year.repaired, year.unresolved, year.excludedRepairs], [6, 1, 1, 4]);
  assert.equal(year.averageDays, 1.5);
  assert.equal(result.completedRepairs.length, 1);
});

test('missing years have zero counts and no average, newest year first', () => {
  const result = summary([incident({ date: '2024-01-01', resolved_at: '' }), incident({ date: '2026-01-01', resolved_at: '' })]);
  assert.deepEqual(result.years.map((row) => row.year), [2026, 2025, 2024]);
  assert.deepEqual(result.years[1], { year: 2025, incidents: 0, repaired: 0, unresolved: 0, excludedRepairs: 0, averageDays: null });
});

test('repairs are ordered by completion time and retain source order for ties', () => {
  const records = [incident({ date: '2025-01-01', resolved_at: '2025-01-05' }),
    incident({ date: '2025-01-04', resolved_at: '2025-01-05' }),
    incident({ resolved_at: '2025-01-02' })];
  const before = structuredClone(records);
  assert.deepEqual(summary(records).completedRepairs.map((repair) => repair.sourceIndex), [2, 0, 1]);
  const newest = newestIncidentsFirst(records);
  assert.deepEqual(newest.map((record) => record.date), [records[1].date, records[0].date, records[2].date]);
  assert.deepEqual(records, before);
});

for (const window of [5, 10, 20]) {
  test(`rolling ${window} uses full windows, includes the current repair, and crosses years`, () => {
    const day = 86400000;
    const records = Array.from({ length: 23 }, (_, index) => {
      const resolvedAt = Date.parse('2024-12-20T00:00:00Z') + index * day;
      return incident({ date: new Date(resolvedAt - (index + 1) * day).toISOString(), resolved_at: new Date(resolvedAt).toISOString() });
    });
    const repairs = summary(records).completedRepairs;
    const before = structuredClone(repairs);
    const trend = buildRepairTrend(repairs, window);
    assert.ok(trend.slice(0, window - 1).every((point) => point.rollingAverage === null));
    assert.equal(trend[window - 1].rollingAverage, (window + 1) / 2);
    assert.equal(trend[window].rollingAverage, (window + 3) / 2);
    assert.equal(trend[22].rollingAverage, (24 - window + 23) / 2);
    assert.deepEqual(repairs, before);
  });
}

test('both locales expose every statistics label at the root', async () => {
  const locales = await Promise.all(['en', 'zh-tw'].map(async (locale) => JSON.parse(await readFile(new URL(`../src/i18n/locales/${locale}.json`, import.meta.url), 'utf8'))));
  assert.deepEqual(Object.keys(locales[0].annualStatistics).sort(), Object.keys(locales[1].annualStatistics).sort());
  for (const locale of locales) {
    assert.ok(locale.timeline.tabs.annualStatistics);
    assert.ok(locale.timeline.tabs.timeline);
    assert.ok(Object.values(locale.annualStatistics).every((value) => typeof value === 'string' && value.length > 0));
  }
});
