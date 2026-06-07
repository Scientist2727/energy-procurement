'use client'

import { useMemo, useState } from 'react'
import PriceDurationChart from './PriceDurationChart'
import { pivotPdc, type PdcRecord } from '@/lib/priceDurationUtils'

export default function PriceDurationSection({
  data,
  lastUpdated,
}: {
  data: PdcRecord[]
  lastUpdated: string
}) {
  const { rows, years } = useMemo(() => pivotPdc(data), [data])
  const [hiddenYears, setHiddenYears] = useState<Set<number>>(new Set())

  function toggleYear(year: number) {
    setHiddenYears((prev) => {
      const next = new Set(prev)
      next.has(year) ? next.delete(year) : next.add(year)
      return next
    })
  }

  const visibleRows = useMemo(() => {
    if (hiddenYears.size === 0) return rows
    return rows.map((row) => {
      const r = { ...row }
      for (const y of hiddenYears) delete r[String(y)]
      return r
    })
  }, [rows, hiddenYears])

  const visibleYears = years.filter((y) => !hiddenYears.has(y))

  const YEAR_COLORS: Record<number, string> = {
    0: '#cbd5e1', 1: '#94a3b8', 2: '#60a5fa', 3: '#2563eb', 4: '#1d4ed8',
  }

  // Stats for current year: % of hours below 0, below 50€, above 100€
  const currentYear = years.at(-1)
  const currentRows = currentYear
    ? data.filter((r) => r.year === currentYear)
    : []
  const negPct  = currentRows.find((r) => r.price_eur_mwh <= 0)?.pct ?? 0
  const sub50   = currentRows.find((r) => r.price_eur_mwh <= 50)?.pct
  const above100 = currentRows.find((r) => r.price_eur_mwh <= 100)

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Price Duration Curve</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Hourly DA prices ranked descending · % of hours above each price level · DE-LU
          </p>
        </div>
        <span className="text-xs text-gray-400 mt-1 shrink-0">Updated {lastUpdated}</span>
      </div>

      {/* Quick stats for current year */}
      {currentYear && (
        <div className="flex flex-wrap gap-3 mb-5">
          <div className="flex items-center gap-1.5 bg-red-50 border border-red-100 rounded-full px-3 py-1">
            <span className="text-xs font-semibold text-red-600 tabular-nums">
              {negPct.toFixed(1)}%
            </span>
            <span className="text-xs text-red-400">negative hours ({currentYear})</span>
          </div>
          {sub50 != null && (
            <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 rounded-full px-3 py-1">
              <span className="text-xs font-semibold text-blue-600 tabular-nums">
                {sub50.toFixed(0)}%
              </span>
              <span className="text-xs text-blue-400">of hours below 50 €/MWh ({currentYear})</span>
            </div>
          )}
        </div>
      )}

      {/* Year toggles */}
      <div className="flex flex-wrap gap-2 mb-5">
        {years.map((year, idx) => {
          const color = YEAR_COLORS[idx] ?? '#94a3b8'
          const hidden = hiddenYears.has(year)
          const isCurrent = year === years.at(-1)
          return (
            <button
              key={year}
              onClick={() => toggleYear(year)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                hidden
                  ? 'border-gray-200 text-gray-300 bg-white'
                  : isCurrent
                  ? 'border-blue-200 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-gray-50 text-gray-600'
              }`}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: hidden ? '#e2e8f0' : color }} />
              {year}
            </button>
          )
        })}
      </div>

      <PriceDurationChart rows={visibleRows} years={visibleYears} />

      <p className="text-xs text-gray-400 mt-4 leading-relaxed">
        Read horizontally: at 50% on the x-axis, the curve shows the median hourly price.
        The steepness at the left indicates peak price volatility; the tail at the right
        shows how many hours have negative or near-zero prices.
      </p>
    </div>
  )
}
