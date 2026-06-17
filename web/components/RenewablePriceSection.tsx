'use client'

import { useMemo, useState } from 'react'
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

function subtractDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString().slice(0, 10)
}

function toRows(data: SolarWindPriceRecord[]) {
  return data.map((d) => ({
    'Timestamp (UTC)':        d.date,
    'DA Price (EUR/MWh)':     d.price_eur_mwh,
    'Solar (MW)':             d.solar_mw,
    'Wind Onshore (MW)':      d.wind_onshore_mw,
    'Wind Offshore (MW)':     d.wind_offshore_mw,
    'Net Exports (MW)':       d.net_exports_mw,
  }))
}

function downloadCsv(data: SolarWindPriceRecord[], filename: string) {
  const rows = toRows(data)
  const headers = Object.keys(rows[0])
  const lines = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => r[h as keyof typeof r]).join(',')),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function downloadXlsx(data: SolarWindPriceRecord[], filename: string) {
  const ws = XLSX.utils.json_to_sheet(toRows(data))
  // Column widths
  ws['!cols'] = [{ wch: 20 }, { wch: 18 }, { wch: 14 }, { wch: 18 }, { wch: 18 }, { wch: 16 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'DA Market Data')
  XLSX.writeFile(wb, filename)
}

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
  const [endDate, setEndDate] = useState(maxDate)

  const periodDays = useMemo(() => {
    if (!startDate || !endDate) return 30
    return (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
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

  const fileBase = `DE-LU_market_${startDate}_${endDate}_${isHourly ? 'hourly' : 'daily'}`

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
        <span className="text-xs text-gray-400 mt-1 shrink-0">Updated {lastUpdated}</span>
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
            type="date"
            value={startDate}
            max={endDate || maxDate}
            onChange={(e) => { if (e.target.value) { setStartDate(e.target.value); setActivePreset(null) } }}
            className={`border rounded-md px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
              isCustom ? 'border-blue-400 bg-blue-50' : 'border-gray-200'
            }`}
          />
          <span>to</span>
          <input
            type="date"
            value={endDate}
            min={startDate || minDate}
            max={maxDate}
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

        {/* Download buttons */}
        <div className="flex items-center gap-1 ml-auto">
          <span className="text-xs text-gray-400 mr-1">Export</span>
          <button
            onClick={() => downloadCsv(filtered, `${fileBase}.csv`)}
            className="px-2.5 py-1 rounded-md text-xs font-medium text-gray-500 border border-gray-200 hover:bg-gray-50 hover:text-gray-700 transition-colors"
          >
            CSV
          </button>
          <button
            onClick={() => downloadXlsx(filtered, `${fileBase}.xlsx`)}
            className="px-2.5 py-1 rounded-md text-xs font-medium text-emerald-600 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition-colors"
          >
            XLSX
          </button>
        </div>
      </div>

      <RenewablePriceChart key={`${startDate}|${endDate}`} data={filtered} isHourly={isHourly} />
    </div>
  )
}
