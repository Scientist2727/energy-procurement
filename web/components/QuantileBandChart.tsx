'use client'

import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import type { DailyQuantile } from '@/lib/dataUtils'

function xTickFormatter(value: string) {
  return new Date(value).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { payload: DailyQuantile }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const date = new Date(label!).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
  const rows: [string, number, string][] = [
    ['p90', d.p90, 'text-slate-400'],
    ['p75', d.p75, 'text-slate-500'],
    ['p50', d.p50, 'text-blue-700'],
    ['p25', d.p25, 'text-slate-500'],
    ['p10', d.p10, 'text-slate-400'],
  ]
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-lg text-sm min-w-[190px]">
      <p className="font-semibold text-gray-700 mb-2.5 text-xs uppercase tracking-wide">{date}</p>
      <div className="space-y-1.5">
        {rows.map(([label, val, cls]) => (
          <div key={label} className="flex items-center justify-between gap-6">
            <span className={`text-xs font-medium tabular-nums ${cls}`}>{label}</span>
            <span className={`text-sm font-bold tabular-nums ${label === 'p50' ? 'text-blue-700' : 'text-gray-700'}`}>
              {val.toFixed(1)} <span className="text-xs font-normal text-gray-400">€/MWh</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function QuantileBandChart({ data }: { data: DailyQuantile[] }) {
  return (
    <div>
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart data={data} margin={{ top: 12, right: 20, bottom: 4, left: 4 }}>
          <defs>
            <linearGradient id="outerBand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#eff6ff" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#eff6ff" stopOpacity={0.5} />
            </linearGradient>
            <linearGradient id="innerBand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#bfdbfe" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#bfdbfe" stopOpacity={0.6} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" strokeOpacity={0.8} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickFormatter={xTickFormatter}
            minTickGap={70}
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
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="#e2e8f0" strokeWidth={1} />

          <Area stackId="q" dataKey="_base" fill="transparent" stroke="none" legendType="none" tooltipType="none" name="" isAnimationActive={false} />
          <Area stackId="q" dataKey="_lo"   fill="url(#outerBand)" stroke="#dbeafe" strokeWidth={0.5} name="p10–p90" legendType="none" isAnimationActive={false} />
          <Area stackId="q" dataKey="_mid"  fill="url(#innerBand)" stroke="#93c5fd" strokeWidth={0.5} name="p25–p75" legendType="none" isAnimationActive={false} />
          <Area stackId="q" dataKey="_hi"   fill="url(#outerBand)" stroke="#dbeafe" strokeWidth={0.5} legendType="none" name="" isAnimationActive={false} />

          <Line
            dataKey="p50"
            name="Median (p50)"
            stroke="#1d4ed8"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#1d4ed8', stroke: '#fff', strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Custom legend */}
      <div className="flex items-center justify-center gap-5 mt-2">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ background: '#bfdbfe' }} />
          <span className="text-xs text-gray-400">p25–p75 range</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ background: '#eff6ff' }} />
          <span className="text-xs text-gray-400">p10–p90 range</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-0.5 rounded" style={{ background: '#1d4ed8' }} />
          <span className="text-xs text-gray-400">Median (p50)</span>
        </div>
      </div>
    </div>
  )
}
