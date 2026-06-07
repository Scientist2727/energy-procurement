export interface PdcRecord {
  year: number
  pct: number
  price_eur_mwh: number
}

export interface PdcRow {
  pct: number
  [year: string]: number
}

export function pivotPdc(records: PdcRecord[]): { rows: PdcRow[]; years: number[] } {
  const yearSet = new Set<number>()
  const byPct = new Map<number, PdcRow>()

  for (const r of records) {
    yearSet.add(r.year)
    if (!byPct.has(r.pct)) byPct.set(r.pct, { pct: r.pct })
    byPct.get(r.pct)![String(r.year)] = r.price_eur_mwh
  }

  const rows = [...byPct.values()].sort((a, b) => a.pct - b.pct)
  const years = [...yearSet].sort()
  return { rows, years }
}
