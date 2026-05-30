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
  return new Date(value + 'T12:00:00Z').toLocaleDateString('en-GB', {
    month: 'short', year: '2-digit',
  })
}

function xTickFormatterHourly(value: string) {
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short',
  })
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
    <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 shadow text-sm max-w-xs">
      <p className="font-semibold text-gray-800 mb-1">{dateStr}</p>
      <p className="text-xs text-gray-400 mb-2">
        Total: {d._total_mw.toLocaleString()} MW avg
      </p>
      <div className="space-y-0.5">
        {sorted.map(({ key, label, color }) => {
          const pct = d[key as keyof DailyGenMix] as number
          const mw  = d[`_${key}_mw` as keyof DailyGenMix] as number
          if (pct < 0.5) return null
          return (
            <div key={key} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: color }} />
              <span className="text-gray-600 flex-1">{label}</span>
              <span className="font-medium text-gray-800 tabular-nums">{pct.toFixed(1)}%</span>
              <span className="text-gray-400 tabular-nums text-xs">{mw.toLocaleString()} MW</span>
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
      <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12, fill: '#64748b' }}
          tickFormatter={isHourly ? xTickFormatterHourly : xTickFormatterDaily}
          minTickGap={isHourly ? 50 : 70}
        />
        <YAxis
          tick={{ fontSize: 12, fill: '#64748b' }}
          tickFormatter={(v) => `${Math.round(v)}%`}
          domain={[0, 100]}
          ticks={[0, 20, 40, 60, 80, 100]}
          width={44}
        />
        <Tooltip content={<CustomTooltip isHourly={isHourly} />} />
        <Legend
          iconType="rect"
          iconSize={10}
          formatter={(value) => (
            <span style={{ fontSize: 12, color: '#64748b' }}>{value}</span>
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
            isAnimationActive={false}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  )
}
