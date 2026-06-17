'use client'

import { useMemo, useState, useRef, useEffect } from 'react'
import * as XLSX from 'xlsx'
import RenewablePriceChart from './RenewablePriceChart'
import type { SolarWindPriceRecord } from '@/lib/solarWindPriceUtils'

const PRESETS = [
  { label: '1D', days: 1 },
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '6M', days: 180 },
  { label: '1Y', days: 365 },
  { label: '3Y', days: 365 * 3 },
  { label: 'All', days: 99999 },
] as const

type PresetLabel = typeof PRESETS[number]['label']

const FIELDS = [
  { key: 'price_eur_mwh',      label: 'DA Price (EUR/MWh)' },
  { key: 'solar_mw',           label: 'Solar (MW)' },
  { key: 'wind_onshore_mw',    label: 'Wind Onshore (MW)' },
  { key: 'wind_offshore_mw',   label: 'Wind Offshore (MW)' },
  { key: 'net_exports_mw',     label: 'Net Exports (MW)' },
] as const

type FieldKey = typeof FIELDS[number]['key']

function subtractDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString().slice(0, 10)
}

function buildRows(
  data: SolarWindPriceRecord[],
  fields: Set<FieldKey>,
) {
  return data.map((d) => {
    const row: Record<string, string | number> = { 'Timestamp (UTC)': d.date }
    for (const f of FIELDS) {
      if (fields.has(f.key)) row[f.label] = d[f.key]
    }
    return row
  })
}

function triggerCsv(rows: ReturnType<typeof buildRows>, filename: string) {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const lines = [headers.join(','), ...rows.map((r) => headers.map((h) => r[h]).join(','))]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

function triggerXlsx(rows: ReturnType<typeof buildRows>, filename: string) {
  if (!rows.length) return
  const ws = XLSX.utils.json_to_sheet(rows)
  const colCount = Object.keys(rows[0]).length
  ws['!cols'] = Array.from({ length: colCount }, (_, i) => ({ wch: i === 0 ? 20 : 18 }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'DE-LU Market Data')
  XLSX.writeFile(wb, filename)
}

// ── Export panel ────────────────────────────────────────────────────────────

function ExportPanel({
  minDate,
  maxDate,
  hourly,
  daily,
  onClose,
}: {
  minDate: string
  maxDate: string
  hourly: SolarWindPriceRecord[]
  daily: SolarWindPriceRecord[]
  onClose: () => void
}) {
  const [from, setFrom] = useState(subtractDays(maxDate, 30))
  const [to, setTo]   = useState(maxDate)
  const [fields, setFields] = useState<Set<FieldKey>>(
    new Set(FIELDS.map((f) => f.key)),
  )

  function toggleField(key: FieldKey) {
    setFields((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const periodDays = (new Date(to).getTime() - new Date(from).getTime()) / 86_400_000
  const isHourly = periodDays <= 90
  const src = isHourly ? hourly : daily

  const filtered = useMemo(
    () => src.filter((d) => { const day = d.date.slice(0, 10); return day >= from && day <= to }),
    [src, from, to],
  )

  const rows = useMemo(() => buildRows(filtered, fields), [filtered, fields])

  const gran = isHourly ? 'hourly' : 'daily'
  const filename = `DE-LU_${from}_${to}_${gran}`

  return (
    <div className="absolute right-0 top-full mt-2 z-20 w-72 bg-white rounded-xl border border-gray-200 shadow-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-semibold text-gray-800">Export data</span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors text-lg leading-none">×</button>
      </div>

      {/* Date range */}
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Period</p>
      <div className="flex items-center gap-2 mb-1">
        <input
          type="date" value={from} min={minDate} max={to}
          onChange={(e) => e.target.value && setFrom(e.target.value)}
          className="flex-1 border border-gray-200 rounded-md px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <span className="text-xs text-gray-400">to</span>
        <input
          type="date" value={to} min={from} max={maxDate}
          onChange={(e) => e.target.value && setTo(e.target.value)}
          className="flex-1 border border-gray-200 rounded-md px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <p className="text-[10px] text-gray-400 mb-4">
        {filtered.length} {isHourly ? 'hourly' : 'daily'} rows
        {isHourly
          ? ' · hourly data available for last 90 days'
          : ' · periods >90 days use daily averages'}
      </p>

      {/* Fields */}
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Fields</p>
      <div className="space-y-1.5 mb-4">
        {FIELDS.map(({ key, label }) => (
          <label key={key} className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={fields.has(key)}
              onChange={() => toggleField(key)}
              className="w-3.5 h-3.5 accent-blue-600"
            />
            <span className="text-xs text-gray-600 group-hover:text-gray-900 transition-colors">{label}</span>
          </label>
        ))}
      </div>

      {/* Download buttons */}
      <div className="flex gap-2">
        <button
          disabled={!rows.length || !fields.size}
          onClick={() => triggerCsv(rows, `${filename}.csv`)}
          className="flex-1 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          CSV
        </button>
        <button
          disabled={!rows.length || !fields.size}
          onClick={() => triggerXlsx(rows, `${filename}.xlsx`)}
          className="flex-1 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          XLSX
        </button>
      </div>
    </div>
  )
}

// ── Main section ─────────────────────────────────────────────────────────────

export default function RenewablePriceSection({
  daily,
  hourly,
  lastUpdated,
}: {
  daily: SolarWindPriceRecord[]
  hourly: SolarWindPriceRecord[]
  lastUpdated: string
}) {
  const minDate = daily.at(0)?.date ?? ''
  const maxDate = daily.at(-1)?.date ?? ''

  const [activePreset, setActivePreset] = useState<PresetLabel | null>('1D')
  const [startDate, setStartDate] = useState(() => subtractDays(maxDate, 1))
  const [endDate, setEndDate]   = useState(maxDate)
  const [exportOpen, setExportOpen] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)

  // Close panel on outside click
  useEffect(() => {
    if (!exportOpen) return
    function handler(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [exportOpen])

  const periodDays = useMemo(() => {
    if (!startDate || !endDate) return 30
    return (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86_400_000
  }, [startDate, endDate])

  const isHourly = periodDays <= 90

  const filtered = useMemo(() => {
    const src = isHourly ? hourly : daily
    return src.filter((d) => {
      const day = d.date.slice(0, 10)
      return day >= startDate && day <= endDate
    })
  }, [daily, hourly, isHourly, startDate, endDate])

  function applyPreset(label: PresetLabel, days: number) {
    setStartDate(days >= 99999 ? minDate : subtractDays(maxDate, days))
    setEndDate(maxDate)
    setActivePreset(label)
  }

  const negativeCount = filtered.filter((d) => d.price_eur_mwh < 0).length
  const isCustom = activePreset === null

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Solar & Wind vs. Price</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Generation, DA spot price & net exports · {isHourly ? 'hourly' : 'daily avg'} · DE-LU
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {/* Export trigger */}
          <div ref={exportRef} className="relative">
            <button
              onClick={() => setExportOpen((o) => !o)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors ${
                exportOpen
                  ? 'bg-blue-700 text-white'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export data
            </button>

            {exportOpen && (
              <ExportPanel
                minDate={minDate}
                maxDate={maxDate}
                hourly={hourly}
                daily={daily}
                onClose={() => setExportOpen(false)}
              />
            )}
          </div>
          <span className="text-xs text-gray-400 mt-0.5">Updated {lastUpdated}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex gap-1">
          {PRESETS.map(({ label, days }) => (
            <button
              key={label}
              onClick={() => applyPreset(label, days)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                activePreset === label
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="h-5 w-px bg-gray-200" />

        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
          <span>From</span>
          <input
            type="date" value={startDate} max={endDate || maxDate}
            onChange={(e) => { if (e.target.value) { setStartDate(e.target.value); setActivePreset(null) } }}
            className={`border rounded-md px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
              isCustom ? 'border-blue-400 bg-blue-50' : 'border-gray-200'
            }`}
          />
          <span>to</span>
          <input
            type="date" value={endDate} min={startDate || minDate} max={maxDate}
            onChange={(e) => { if (e.target.value) { setEndDate(e.target.value); setActivePreset(null) } }}
            className={`border rounded-md px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
              isCustom ? 'border-blue-400 bg-blue-50' : 'border-gray-200'
            }`}
          />
          <span className="text-gray-300">·</span>
          <span className="text-gray-400">{filtered.length}{isHourly ? 'h' : 'd'}</span>
          {negativeCount > 0 && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
              {negativeCount}{isHourly ? 'h' : 'd'} negative
            </span>
          )}
        </div>

      </div>

      <RenewablePriceChart key={`${startDate}|${endDate}`} data={filtered} isHourly={isHourly} />
    </div>
  )
}
