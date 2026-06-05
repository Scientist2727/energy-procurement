'use client'

import { useMemo, useState } from 'react'
import CapturePriceChart, { type ViewMode } from './CapturePriceChart'
import type { CapturePivot } from '@/lib/capturePriceUtils'

const PRESETS = [
  { label: '1Y',  months: 12 },
  { label: '2Y',  months: 24 },
  { label: '3Y',  months: 36 },
  { label: 'All', months: 99999 },
] as const

type PresetLabel = typeof PRESETS[number]['label']

function subtractMonths(isoMonth: string, n: number): string {
  const [y, m] = isoMonth.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 - n, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

export default function CapturePriceSection({
  data,
  lastUpdated,
}: {
  data: CapturePivot[]
  lastUpdated: string
}) {
  const minMonth = data.at(0)?.month ?? ''
  const maxMonth = data.at(-1)?.month ?? ''

  const [activePreset, setActivePreset] = useState<PresetLabel>('3Y')
  const [view, setView] = useState<ViewMode>('price')

  const startMonth = useMemo(() => {
    const preset = PRESETS.find((p) => p.label === activePreset)!
    return preset.months >= 99999 ? minMonth : subtractMonths(maxMonth, preset.months)
  }, [activePreset, minMonth, maxMonth])

  const filtered = useMemo(
    () => data.filter((d) => d.month >= startMonth),
    [data, startMonth],
  )

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Capture Prices</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Monthly volume-weighted capture price vs. baseload · EUR/MWh · DE-LU
          </p>
        </div>
        <span className="text-xs text-gray-400 mt-0.5 shrink-0">Updated {lastUpdated}</span>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        {/* Period presets */}
        <div className="flex gap-1">
          {PRESETS.map(({ label, months }) => (
            <button
              key={label}
              onClick={() => setActivePreset(label)}
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

        {/* View toggle */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm font-medium">
          <button
            onClick={() => setView('price')}
            className={`px-3 py-1 transition-colors ${
              view === 'price' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            €/MWh
          </button>
          <button
            onClick={() => setView('rate')}
            className={`px-3 py-1 transition-colors border-l border-gray-200 ${
              view === 'rate' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            Capture Rate
          </button>
        </div>

        <div className="h-5 w-px bg-gray-200" />
        <span className="text-sm text-gray-400">{filtered.length} months</span>
      </div>

      <CapturePriceChart key={`${startMonth}|${view}`} data={filtered} view={view} />

      {/* Explainer */}
      <p className="text-xs text-gray-400 mt-4 leading-relaxed">
        Capture price: the average spot price weighted by each technology&apos;s actual hourly generation profile.
        A declining capture rate reflects the merit-order effect — as more renewables generate simultaneously,
        they push prices lower during their own peak output hours.
      </p>
    </div>
  )
}
