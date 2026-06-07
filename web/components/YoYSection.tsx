'use client'

import { useMemo, useState } from 'react'
import YoYChart from './YoYChart'
import { pivotYoY, type YoYRecord } from '@/lib/yoyUtils'

export default function YoYSection({
  data,
  lastUpdated,
}: {
  data: YoYRecord[]
  lastUpdated: string
}) {
  const { rows, years } = useMemo(() => pivotYoY(data), [data])

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

  // Year colours matching YoYChart
  const YEAR_COLORS: Record<number, string> = {
    0: '#cbd5e1', 1: '#94a3b8', 2: '#60a5fa', 3: '#2563eb', 4: '#1d4ed8',
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Year-on-Year Price Comparison</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Daily avg DA price by day-of-year · EUR/MWh · DE-LU
          </p>
        </div>
        <span className="text-xs text-gray-400 mt-1 shrink-0">Updated {lastUpdated}</span>
      </div>

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
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: hidden ? '#e2e8f0' : color }}
              />
              {year}
            </button>
          )
        })}
      </div>

      <YoYChart rows={visibleRows} years={visibleYears} />
    </div>
  )
}
