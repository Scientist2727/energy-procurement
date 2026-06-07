'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ReferenceLine, ResponsiveContainer,
} from 'recharts'
import { doyToMonthLabel, type YoYRow } from '@/lib/yoyUtils'

// Colours: older years fade to slate, current year is vivid blue
const YEAR_COLORS: Record<number, string> = {
  0: '#cbd5e1', // oldest −4
  1: '#94a3b8',
  2: '#60a5fa',
  3: '#2563eb',
  4: '#1d4ed8', // most recent / current
}

function yearColor(year: number, years: number[]): string {
  const idx = years.indexOf(year)
  return YEAR_COLORS[idx] ?? '#94a3b8'
}

function CustomTooltip({
  active, payload, label, years,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: number
  years: number[]
}) {
  if (!active || !payload?.length || label == null) return null

  return (
    <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 shadow text-sm min-w-[160px]">
      <p className="font-semibold text-gray-700 mb-2">Day {label} — {doyToMonthLabel(label)}</p>
      <div className="space-y-1">
        {[...payload].reverse().map((p) => (
          <div key={p.name} className="flex justify-between gap-4">
            <span style={{ color: p.color }} className="font-medium">{p.name}</span>
            <span className="tabular-nums text-gray-700">
              {p.value != null ? `${p.value.toFixed(1)} €` : '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function YoYChart({
  rows, years,
}: {
  rows: YoYRow[]
  years: number[]
}) {
  const monthTickDoys = [1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335]

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="doy"
          type="number"
          domain={[1, 365]}
          ticks={monthTickDoys}
          tickFormatter={doyToMonthLabel}
          tick={{ fontSize: 12, fill: '#64748b' }}
        />
        <YAxis
          tick={{ fontSize: 12, fill: '#64748b' }}
          tickFormatter={(v) => `${Math.round(v)}€`}
          width={48}
        />
        <ReferenceLine y={0} stroke="#e2e8f0" strokeWidth={1} />
        <Tooltip content={<CustomTooltip years={years} />} />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => <span style={{ fontSize: 12, color: '#64748b' }}>{value}</span>}
        />
        {years.map((year) => (
          <Line
            key={year}
            dataKey={String(year)}
            name={String(year)}
            stroke={yearColor(year, years)}
            strokeWidth={year === years.at(-1) ? 2.5 : 1.5}
            dot={false}
            isAnimationActive={false}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
