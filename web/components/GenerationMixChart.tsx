'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { TECH_CONFIG, type DailyGenMix } from '@/lib/generationUtils'

function xTickFormatterDaily(value: string) {
  return new Date(value + 'T12:00:00Z').toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
}

function xTickFormatterHourly(value: string) {
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function CustomTooltip({
  active,
  payload,
  label,
  isHourly,
}: {
  active?: boolean
  payload?: { payload: DailyGenMix }[]
  label?: string
  isHourly?: boolean
}) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload

  const dateStr = isHourly
    ? new Date(label!).toLocaleString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : new Date(label! + 'T12:00:00Z').toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric',
      })

  const sorted = [...TECH_CONFIG].sort(
    (a, b) => (d[b.key as keyof DailyGenMix] as number) - (d[a.key as keyof DailyGenMix] as number),
  )

  return (
    <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-lg text-sm max-w-xs">
      <p className="font-semibold text-gray-700 text-xs uppercase tracking-wide mb-1">{dateStr}</p>
      <p className="text-[10px] text-gray-400 mb-2.5">
        Total: {d._total_mw.toLocaleString()} MW avg
      </p>
      <div className="space-y-1">
        {sorted.map(({ key, label, color }) => {
          const pct = d[key as keyof DailyGenMix] as number
          const mw  = d[`_${key}_mw` as keyof DailyGenMix] as number
          if (pct < 0.5) return null
          return (
            <div key={key} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: color }} />
              <span className="text-gray-500 flex-1 text-xs">{label}</span>
              <span className="font-semibold text-gray-800 tabular-nums text-xs">{pct.toFixed(1)}%</span>
              <span className="text-gray-400 tabular-nums text-[10px] w-20 text-right">{mw.toLocaleString()} MW</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function GenerationMixChart({
  data,
  isHourly = false,
}: {
  data: DailyGenMix[]
  isHourly?: boolean
}) {
  return (
    <ResponsiveContainer width="100%" height={420}>
      <AreaChart data={data} margin={{ top: 12, right: 20, bottom: 4, left: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" strokeOpacity={0.8} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          tickFormatter={isHourly ? xTickFormatterHourly : xTickFormatterDaily}
          minTickGap={isHourly ? 50 : 70}
          axisLine={{ stroke: '#e2e8f0' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          tickFormatter={(v) => `${Math.round(v)}%`}
          domain={[0, 100]}
          ticks={[0, 25, 50, 75, 100]}
          width={40}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip isHourly={isHourly} />} />
        <Legend
          iconType="rect"
          iconSize={9}
          formatter={(value) => (
            <span style={{ fontSize: 11, color: '#94a3b8' }}>{value}</span>
          )}
        />
        {TECH_CONFIG.map(({ key, label, color }) => (
          <Area
            key={key}
            stackId="gen"
            dataKey={key}
            name={label}
            fill={color}
            stroke={color}
            strokeWidth={0}
            fillOpacity={0.9}
            isAnimationActive={false}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  )
}
