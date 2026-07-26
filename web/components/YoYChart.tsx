'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts'
import { doyToMonthLabel, type YoYRow } from '@/lib/yoyUtils'

const YEAR_COLORS: Record<number, string> = {
  0: '#e2e8f0',
  1: '#cbd5e1',
  2: '#93c5fd',
  3: '#3b82f6',
  4: '#1d4ed8',
}

const YEAR_OPACITY: Record<number, number> = {
  0: 0.6, 1: 0.7, 2: 0.8, 3: 0.9, 4: 1,
}

function yearColor(year: number, years: number[]): string {
  const idx = years.indexOf(year)
  return YEAR_COLORS[idx] ?? '#94a3b8'
}

function yearOpacity(year: number, years: number[]): number {
  const idx = years.indexOf(year)
  return YEAR_OPACITY[idx] ?? 0.7
}

function CustomTooltip({
  active,
  payload,
  label,
  years,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: number
  years: number[]
}) {
  if (!active || !payload?.length || label == null) return null

  return (
    <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-lg text-sm min-w-[170px]">
      <p className="font-semibold text-gray-600 text-xs uppercase tracking-wide mb-2.5">
        {doyToMonthLabel(label)} · Day {label}
      </p>
      <div className="space-y-1.5">
        {[...payload].reverse().map((p) => {
          const isLatest = p.name === String(years.at(-1))
          return (
            <div key={p.name} className="flex justify-between items-center gap-4">
              <span style={{ color: p.color }} className={`text-xs ${isLatest ? 'font-bold' : 'font-medium'}`}>
                {p.name}
              </span>
              <span className={`tabular-nums text-xs ${isLatest ? 'font-bold text-gray-800' : 'text-gray-600'}`}>
                {p.value != null ? `${p.value.toFixed(1)} €/MWh` : '—'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function YoYChart({ rows, years }: { rows: YoYRow[]; years: number[] }) {
  const monthTickDoys = [1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335]

  return (
    <div>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={rows} margin={{ top: 12, right: 20, bottom: 4, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" strokeOpacity={0.8} />
          <XAxis
            dataKey="doy"
            type="number"
            domain={[1, 365]}
            ticks={monthTickDoys}
            tickFormatter={doyToMonthLabel}
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={{ stroke: '#e2e8f0' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickFormatter={(v) => `${Math.round(v)}€`}
            width={44}
            axisLine={false}
            tickLine={false}
          />
          <ReferenceLine y={0} stroke="#e2e8f0" strokeWidth={1} />
          <Tooltip content={<CustomTooltip years={years} />} />
          {years.map((year) => {
            const isLatest = year === years.at(-1)
            return (
              <Line
                key={year}
                dataKey={String(year)}
                name={String(year)}
                stroke={yearColor(year, years)}
                strokeWidth={isLatest ? 2.5 : 1.5}
                strokeOpacity={yearOpacity(year, years)}
                dot={false}
                activeDot={isLatest ? { r: 4, fill: yearColor(year, years), stroke: '#fff', strokeWidth: 2 } : false}
                isAnimationActive={false}
                connectNulls
              />
            )
          })}
        </LineChart>
      </ResponsiveContainer>

      <div className="flex items-center justify-center gap-4 mt-2 flex-wrap">
        {years.map((year) => {
          const isLatest = year === years.at(-1)
          const color = yearColor(year, years)
          const opacity = yearOpacity(year, years)
          return (
            <div key={year} className="flex items-center gap-1.5">
              <span
                className="rounded"
                style={{
                  display: 'inline-block',
                  width: 20,
                  height: isLatest ? 3 : 2,
                  background: color,
                  opacity,
                }}
              />
              <span className={`text-xs ${isLatest ? 'font-semibold text-gray-700' : 'text-gray-400'}`}>
                {year}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
