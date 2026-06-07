export interface YoYRecord {
  day_of_year: number
  year: number
  value: number
}

export interface YoYRow {
  doy: number
  [year: string]: number
}

// Map doy 1-365 → a stable month label for x-axis ticks
// Using non-leap-year boundaries
const DOY_MONTH_STARTS = [1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335]
const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export function doyToMonthLabel(doy: number): string {
  let idx = DOY_MONTH_STARTS.findLastIndex((s) => doy >= s)
  if (idx < 0) idx = 0
  return MONTH_ABBR[idx]
}

export function pivotYoY(records: YoYRecord[]): { rows: YoYRow[]; years: number[] } {
  const yearSet = new Set<number>()
  const byDoy = new Map<number, YoYRow>()

  for (const r of records) {
    yearSet.add(r.year)
    if (!byDoy.has(r.day_of_year)) byDoy.set(r.day_of_year, { doy: r.day_of_year })
    byDoy.get(r.day_of_year)![String(r.year)] = r.value
  }

  const rows = [...byDoy.values()].sort((a, b) => a.doy - b.doy)
  const years = [...yearSet].sort()
  return { rows, years }
}
