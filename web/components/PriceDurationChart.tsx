'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, Legend, ResponsiveContainer,
} from 'recharts'
import type { PdcRow } from '@/lib/priceDurationUtils'

const YEAR_COLORS: Record<number, string> = {
  0: '#cbd5e1',
  1: '#94a3b8',
  2: '#60a5fa',
  3: '#2563eb',
  4: '#1d4ed8',
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
      <p className="font-semibold text-gray-700 mb-2">{label}% of hours</p>
      <div className="space-y-1">
        {[...payload].reverse().map((p) => (
          <div key={p.name} className="flex justify-between gap-4">
            <span style={{ color: p.color }} className="font-medium">{p.name}</span>
            <span className={`tabular-nums font-medium ${p.value < 0 ? 'text-red-500' : 'text-gray-700'}`}>
              {p.value != null ? `${p.value.toFixed(1)} €` : '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function PriceDurationChart({
  rows, years,
}: {
  rows: PdcRow[]
  years: number[]
}) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="pct"
          type="number"
          domain={[0, 100]}
          ticks={[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]}
          tickFormatter={(v) => `${v}%`}
          tick={{ fontSize: 12, fill: '#64748b' }}
        />
        <YAxis
          tick={{ fontSize: 12, fill: '#64748b' }}
          tickFormatter={(v) => `${Math.round(v)}€`}
          width={52}
        />
        <ReferenceLine y={0} stroke="#fca5a5" strokeWidth={1.5} strokeDasharray="4 2"
          label={{ value: '0 €', position: 'right', fontSize: 11, fill: '#f87171' }}
        />
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
