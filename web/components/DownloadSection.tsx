'use client'

import { useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import type { DailyGenMix } from '@/lib/generationUtils'
import type { SolarWindPriceRecord } from '@/lib/solarWindPriceUtils'

// ── Field catalogue ───────────────────────────────────────────────────────────

type FieldKey =
  | 'price_eur_mwh' | 'net_exports_mw' | '_total_mw'
  | '_solar_mw' | '_wind_onshore_mw' | '_wind_offshore_mw'
  | '_biomass_mw' | '_hydro_mw' | '_other_renewable_mw'
  | '_nuclear_mw' | '_lignite_mw' | '_hard_coal_mw'
  | '_natural_gas_mw' | '_other_conventional_mw'

interface Field { key: FieldKey; label: string }

interface FieldGroup { label: string; fields: Field[] }

const FIELD_GROUPS: FieldGroup[] = [
  {
    label: 'Market',
    fields: [
      { key: 'price_eur_mwh',  label: 'DA Price (EUR/MWh)' },
      { key: 'net_exports_mw', label: 'Net Exports (MW)' },
      { key: '_total_mw',      label: 'Total Generation (MW)' },
    ],
  },
  {
    label: 'Renewables',
    fields: [
      { key: '_solar_mw',           label: 'Solar (MW)' },
      { key: '_wind_onshore_mw',    label: 'Wind Onshore (MW)' },
      { key: '_wind_offshore_mw',   label: 'Wind Offshore (MW)' },
      { key: '_biomass_mw',         label: 'Biomass (MW)' },
      { key: '_hydro_mw',           label: 'Hydro (MW)' },
      { key: '_other_renewable_mw', label: 'Other Renewables (MW)' },
    ],
  },
  {
    label: 'Conventional',
    fields: [
      { key: '_nuclear_mw',            label: 'Nuclear (MW)' },
      { key: '_lignite_mw',            label: 'Lignite (MW)' },
      { key: '_hard_coal_mw',          label: 'Hard Coal (MW)' },
      { key: '_natural_gas_mw',        label: 'Natural Gas (MW)' },
      { key: '_other_conventional_mw', label: 'Other Conventional (MW)' },
    ],
  },
]

const ALL_FIELDS: Field[] = FIELD_GROUPS.flatMap((g) => g.fields)
const LABEL_MAP: Record<FieldKey, string> = Object.fromEntries(
  ALL_FIELDS.map((f) => [f.key, f.label]),
) as Record<FieldKey, string>

// ── Merged row type ───────────────────────────────────────────────────────────

type UnifiedRow = DailyGenMix & {
  price_eur_mwh?: number
  net_exports_mw?: number
}

function mergeData(
  genRows: DailyGenMix[],
  priceRows: SolarWindPriceRecord[],
  isHourly: boolean,
): UnifiedRow[] {
  const prefixLen = isHourly ? 16 : 10
  const priceMap = new Map(priceRows.map((r) => [r.date.slice(0, prefixLen), r]))
  return genRows.map((g) => {
    const p = priceMap.get(g.date.slice(0, prefixLen))
    return { ...g, price_eur_mwh: p?.price_eur_mwh, net_exports_mw: p?.net_exports_mw }
  })
}

// ── Export helpers ────────────────────────────────────────────────────────────

function buildExportRows(rows: UnifiedRow[], fields: Set<FieldKey>) {
  return rows.map((r) => {
    const out: Record<string, string | number | undefined> = { 'Timestamp (UTC)': r.date }
    for (const f of ALL_FIELDS) {
      if (fields.has(f.key)) {
        out[LABEL_MAP[f.key]] = (r as unknown as Record<string, number>)[f.key]
      }
    }
    return out
  })
}

function triggerCsv(exportRows: ReturnType<typeof buildExportRows>, filename: string) {
  if (!exportRows.length) return
  const headers = Object.keys(exportRows[0])
  const lines = [
    headers.join(','),
    ...exportRows.map((r) => headers.map((h) => r[h] ?? '').join(',')),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

function triggerXlsx(exportRows: ReturnType<typeof buildExportRows>, filename: string) {
  if (!exportRows.length) return
  const ws = XLSX.utils.json_to_sheet(exportRows)
  const colCount = Object.keys(exportRows[0]).length
  ws['!cols'] = Array.from({ length: colCount }, () => ({ wch: 22 }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'DE-LU Market Data')
  XLSX.writeFile(wb, filename)
}

function subtractDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString().slice(0, 10)
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DownloadSection({
  dailyMix,
  hourlyMix,
  swpDaily,
  swpHourly,
  lastUpdated,
}: {
  dailyMix:  DailyGenMix[]
  hourlyMix: DailyGenMix[]
  swpDaily:  SolarWindPriceRecord[]
  swpHourly: SolarWindPriceRecord[]
  lastUpdated: string
}) {
  const minDate = dailyMix.at(0)?.date.slice(0, 10) ?? ''
  const maxDate = dailyMix.at(-1)?.date.slice(0, 10) ?? ''

  const [from, setFrom] = useState(() => subtractDays(maxDate, 30))
  const [to, setTo]     = useState(maxDate)

  const [selected, setSelected] = useState<Set<FieldKey>>(
    () => new Set(ALL_FIELDS.map((f) => f.key)),
  )

  const periodDays = (new Date(to).getTime() - new Date(from).getTime()) / 86_400_000
  const isHourly   = periodDays <= 90

  const merged = useMemo(
    () => mergeData(isHourly ? hourlyMix : dailyMix, isHourly ? swpHourly : swpDaily, isHourly),
    [isHourly, hourlyMix, dailyMix, swpHourly, swpDaily],
  )

  const filtered = useMemo(
    () => merged.filter((r) => { const d = r.date.slice(0, 10); return d >= from && d <= to }),
    [merged, from, to],
  )

  const exportRows = useMemo(() => buildExportRows(filtered, selected), [filtered, selected])

  function toggleField(key: FieldKey) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  function toggleGroup(keys: FieldKey[]) {
    const allOn = keys.every((k) => selected.has(k))
    setSelected((prev) => {
      const next = new Set(prev)
      if (allOn) keys.forEach((k) => next.delete(k))
      else       keys.forEach((k) => next.add(k))
      return next
    })
  }

  const filename    = `DE-LU_${from}_${to}_${isHourly ? 'hourly' : 'daily'}`
  const canDownload = exportRows.length > 0 && selected.size > 0

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Data Export</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Generation, prices &amp; flows · DE-LU · select fields and period
          </p>
        </div>
        <span className="text-xs text-gray-400 mt-1 shrink-0">Updated {lastUpdated}</span>
      </div>

      {/* Date range */}
      <div className="mb-6">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Period</p>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-500">From</span>
            <input
              type="date" value={from} min={minDate} max={to}
              onChange={(e) => e.target.value && setFrom(e.target.value)}
              className="border border-gray-200 rounded-md px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-500">to</span>
            <input
              type="date" value={to} min={from} max={maxDate}
              onChange={(e) => e.target.value && setTo(e.target.value)}
              className="border border-gray-200 rounded-md px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
            isHourly
              ? 'bg-blue-50 border-blue-100 text-blue-600'
              : 'bg-gray-50 border-gray-200 text-gray-500'
          }`}>
            {isHourly ? 'Hourly' : 'Daily avg'}
          </span>
          <span className="text-sm text-gray-400 tabular-nums">
            {filtered.length.toLocaleString()} rows
          </span>
        </div>
        {isHourly && (
          <p className="text-xs text-gray-400 mt-1.5">
            Hourly data available for the last 90 days · longer periods use daily averages
          </p>
        )}
      </div>

      {/* Field selector */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Fields</p>
          <div className="flex gap-2">
            <button
              onClick={() => setSelected(new Set(ALL_FIELDS.map((f) => f.key)))}
              className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
            >
              Select all
            </button>
            <span className="text-gray-300">·</span>
            <button
              onClick={() => setSelected(new Set())}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-5">
          {FIELD_GROUPS.map((group) => {
            const groupKeys = group.fields.map((f) => f.key)
            const allOn  = groupKeys.every((k) => selected.has(k))
            const someOn = !allOn && groupKeys.some((k) => selected.has(k))
            return (
              <div key={group.label}>
                <button
                  onClick={() => toggleGroup(groupKeys)}
                  className="flex items-center gap-1.5 mb-2.5 group"
                >
                  <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${
                    allOn  ? 'bg-blue-600 border-blue-600 text-white' :
                    someOn ? 'bg-blue-100 border-blue-300' :
                             'border-gray-300'
                  }`}>
                    {(allOn || someOn) && (
                      <span className="text-[9px] font-bold leading-none text-blue-700">✓</span>
                    )}
                  </span>
                  <span className="text-xs font-semibold text-gray-500 group-hover:text-gray-700 uppercase tracking-wide transition-colors">
                    {group.label}
                  </span>
                </button>
                <div className="space-y-2 pl-5">
                  {group.fields.map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={selected.has(key)}
                        onChange={() => toggleField(key)}
                        className="w-3.5 h-3.5 accent-blue-600"
                      />
                      <span className="text-xs text-gray-600 group-hover:text-gray-900 transition-colors">
                        {label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Download bar */}
      <div className="flex flex-wrap items-center gap-3 pt-5 border-t border-gray-100">
        <span className="text-xs text-gray-400">
          {selected.size} column{selected.size !== 1 ? 's' : ''} · {filtered.length.toLocaleString()} rows
        </span>
        <div className="flex gap-2 ml-auto">
          <button
            disabled={!canDownload}
            onClick={() => triggerCsv(exportRows, `${filename}.csv`)}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Download CSV
          </button>
          <button
            disabled={!canDownload}
            onClick={() => triggerXlsx(exportRows, `${filename}.xlsx`)}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            Download XLSX
          </button>
        </div>
      </div>
    </div>
  )
}
