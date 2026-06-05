export interface CaptureRecord {
  period: string
  asset: string
  capture_price_eur_mwh: number
  baseload_eur_mwh: number
  capture_rate_pct: number
}

// One row per calendar month — all four assets + shared baseload collapsed to columns
export interface CapturePivot {
  month: string  // "2024-01"
  baseload_eur_mwh: number
  solar_eur_mwh: number
  wind_onshore_eur_mwh: number
  wind_offshore_eur_mwh: number
  combined_renewables_eur_mwh: number
  solar_rate: number
  wind_onshore_rate: number
  wind_offshore_rate: number
  combined_renewables_rate: number
}

export const CAPTURE_ASSETS = [
  { key: 'solar',               label: 'Solar',            color: '#f59e0b' },
  { key: 'wind_onshore',        label: 'Wind Onshore',     color: '#60a5fa' },
  { key: 'wind_offshore',       label: 'Wind Offshore',    color: '#1e40af' },
  { key: 'combined_renewables', label: 'Combined Renew.',  color: '#a855f7' },
] as const

export type AssetKey = typeof CAPTURE_ASSETS[number]['key']

export function pivotCaptureData(records: CaptureRecord[]): CapturePivot[] {
  const byMonth: Record<string, Partial<CapturePivot>> = {}

  for (const r of records) {
    const month = r.period.slice(0, 7)
    if (!byMonth[month]) byMonth[month] = { month, baseload_eur_mwh: r.baseload_eur_mwh }
    else byMonth[month].baseload_eur_mwh = r.baseload_eur_mwh

    const k = r.asset as AssetKey
    ;(byMonth[month] as Record<string, number>)[`${k}_eur_mwh`] = r.capture_price_eur_mwh
    ;(byMonth[month] as Record<string, number>)[`${k}_rate`]    = r.capture_rate_pct
  }

  return (Object.values(byMonth) as CapturePivot[])
    .filter((r) => r.month)
    .sort((a, b) => a.month.localeCompare(b.month))
}
