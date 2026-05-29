export interface QuantileRecord {
  timestamp_utc: string
  window_days: number
  quantile: number
  value: number
}

export interface DailyQuantile {
  date: string
  // Actual quantile values — used for tooltip and median line
  p10: number
  p25: number
  p50: number
  p75: number
  p90: number
  // Stacked differences — used by Recharts Area stacking
  _base: number  // p10 (transparent base)
  _lo: number    // p25 - p10 (outer band, lower half)
  _mid: number   // p75 - p25 (inner band)
  _hi: number    // p90 - p75 (outer band, upper half)
}

export function pivotQuantiles(
  records: QuantileRecord[],
  windowDays: number,
): DailyQuantile[] {
  // Accumulate sum + count per (date, quantile) for daily averaging
  const acc = new Map<string, Map<number, { sum: number; n: number }>>()

  for (const r of records) {
    if (r.window_days !== windowDays) continue
    const date = r.timestamp_utc.slice(0, 10)
    if (!acc.has(date)) acc.set(date, new Map())
    const qMap = acc.get(date)!
    if (!qMap.has(r.quantile)) qMap.set(r.quantile, { sum: 0, n: 0 })
    const entry = qMap.get(r.quantile)!
    entry.sum += r.value
    entry.n += 1
  }

  const rows: DailyQuantile[] = []
  for (const [date, qMap] of [...acc.entries()].sort()) {
    const avg = (q: number) => {
      const e = qMap.get(q)
      return e ? e.sum / e.n : 0
    }
    const p10 = avg(0.1)
    const p25 = avg(0.25)
    const p50 = avg(0.5)
    const p75 = avg(0.75)
    const p90 = avg(0.9)
    rows.push({
      date,
      p10, p25, p50, p75, p90,
      _base: p10,
      _lo:   p25 - p10,
      _mid:  p75 - p25,
      _hi:   p90 - p75,
    })
  }
  return rows
}
