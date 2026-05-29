'use client'

import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { DailyQuantile } from '@/lib/dataUtils'

function fmt(v: number) {
  return `${v.toFixed(1)} EUR/MWh`
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
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 shadow text-sm">
      <p className="font-semibold text-gray-800 mb-2">{date}</p>
      <div className="space-y-1 text-gray-600">
        <p><span className="text-gray-400">p90</span>  {fmt(d.p90)}</p>
        <p><span className="text-gray-400">p75</span>  {fmt(d.p75)}</p>
        <p className="font-medium text-blue-800"><span>p50</span>  {fmt(d.p50)}</p>
        <p><span className="text-gray-400">p25</span>  {fmt(d.p25)}</p>
        <p><span className="text-gray-400">p10</span>  {fmt(d.p10)}</p>
      </div>
    </div>
  )
}

function xTickFormatter(value: string) {
  return new Date(value).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
}

export default function QuantileBandChart({ data }: { data: DailyQuantile[] }) {
  return (
    <ResponsiveContainer width="100%" height={420}>
      <ComposedChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12, fill: '#64748b' }}
          tickFormatter={xTickFormatter}
          minTickGap={70}
        />
        <YAxis
          tick={{ fontSize: 12, fill: '#64748b' }}
          tickFormatter={(v) => `${v}`}
          unit=" €"
          width={56}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(value) => (
            <span className="text-sm text-gray-600">{value}</span>
          )}
        />

        {/* Transparent base up to p10 — keeps bands floating at the right y position */}
        <Area
          stackId="q"
          dataKey="_base"
          fill="transparent"
          stroke="none"
          legendType="none"
          tooltipType="none"
          name=""
        />
        {/* p10 – p25 outer band (light) */}
        <Area
          stackId="q"
          dataKey="_lo"
          fill="#dbeafe"
          stroke="none"
          name="p10 – p90"
          legendType="rect"
        />
        {/* p25 – p75 inner band (darker) */}
        <Area
          stackId="q"
          dataKey="_mid"
          fill="#93c5fd"
          stroke="none"
          name="p25 – p75"
          legendType="rect"
        />
        {/* p75 – p90 outer band (light, same as _lo — shares legend entry) */}
        <Area
          stackId="q"
          dataKey="_hi"
          fill="#dbeafe"
          stroke="none"
          legendType="none"
          name=""
        />

        {/* Median line on top */}
        <Line
          dataKey="p50"
          name="Median (p50)"
          stroke="#1e40af"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
