'use client'

import { useMemo, useState } from 'react'
import QuantileBandChart from './QuantileBandChart'
import type { DailyQuantile } from '@/lib/dataUtils'

const PRESETS = [
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '6M', days: 180 },
  { label: '1Y', days: 365 },
] as const

type PresetLabel = typeof PRESETS[number]['label']

function subtractDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T12:00:00Z')  // noon UTC avoids DST edge cases
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString().slice(0, 10)
}

export default function SpotPriceSection({
  data,
  lastUpdated,
}: {
  data: DailyQuantile[]
  lastUpdated: string
}) {
  const minDate = data.at(0)?.date ?? ''
  const maxDate = data.at(-1)?.date ?? ''

  // Initialise to match the default '1Y' preset
  const [activePreset, setActivePreset] = useState<PresetLabel | null>('1Y')
  const [startDate, setStartDate] = useState(() => subtractDays(maxDate, 365))
  const [endDate, setEndDate] = useState(maxDate)

  const filtered = useMemo(() => {
    if (!startDate || !endDate) return data
    return data.filter((d) => d.date >= startDate && d.date <= endDate)
  }, [data, startDate, endDate])

  function applyPreset(label: PresetLabel, days: number) {
    setStartDate(subtractDays(maxDate, days))
    setEndDate(maxDate)
    setActivePreset(label)
  }

  function handleStart(v: string) {
    if (!v) return
    setStartDate(v)
    setActivePreset(null)
  }

  function handleEnd(v: string) {
    if (!v) return
    setEndDate(v)
    setActivePreset(null)
  }

  const isCustom = activePreset === null

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-base font-semibold text-gray-800">Day-Ahead Spot Price</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Rolling 365-day quantile bands · EUR/MWh · DE-LU
          </p>
        </div>
        <span className="text-xs text-gray-400 mt-1 shrink-0">Updated {lastUpdated}</span>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        {/* Preset buttons */}
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

        {/* Custom date range */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>From</span>
          <input
            type="date"
            value={startDate}
            max={endDate || maxDate}
            onChange={(e) => handleStart(e.target.value)}
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
            onChange={(e) => handleEnd(e.target.value)}
            className={`border rounded-md px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
              isCustom ? 'border-blue-400 bg-blue-50' : 'border-gray-200'
            }`}
          />
          <span className="text-gray-300">·</span>
          <span className="text-gray-400">{filtered.length}d</span>
        </div>
      </div>

      <QuantileBandChart key={`${startDate}|${endDate}`} data={filtered} />
    </div>
  )
}
