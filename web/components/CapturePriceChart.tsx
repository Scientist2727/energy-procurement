'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import { CAPTURE_ASSETS, type CapturePivot } from '@/lib/capturePriceUtils'

export type ViewMode = 'price' | 'rate'

function xTickFormatter(value: string) {
  return new Date(value + '-15T12:00:00Z').toLocaleDateString('en-GB', {
    month: 'short', year: '2-digit',
  })
}

function CustomTooltip({
  active,
  payload,
  label,
  view,
}: {
  active?: boolean
  payload?: Array<{ payload: CapturePivot }>
  label?: string
  view: ViewMode
}) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload

  const dateStr = new Date(label! + '-15T12:00:00Z').toLocaleDateString('en-GB', {
    month: 'long', year: 'numeric',
  })

  return (
    <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-lg text-sm min-w-[210px]">
      <p className="font-semibold text-gray-600 text-xs uppercase tracking-wide mb-2.5">{dateStr}</p>

      {view === 'price' && (
        <div className="space-y-1 mb-2 pb-2 border-b border-gray-100">
          <div className="flex justify-between gap-4">
            <span className="text-gray-400 text-xs">Baseload ref.</span>
            <span className="font-medium tabular-nums text-gray-700">
              {d.baseload_eur_mwh.toFixed(1)} €/MWh
            </span>
          </div>
        </div>
      )}

      <div className="space-y-1">
        {CAPTURE_ASSETS.map(({ key, label, color }) => {
          if (view === 'price') {
            const price = (d as unknown as Record<string, number>)[`${key}_eur_mwh`]
            const rate  = (d as unknown as Record<string, number>)[`${key}_rate`]
            if (price == null) return null
            const diff = price - d.baseload_eur_mwh
            return (
              <div key={key} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                <span className="text-gray-600 flex-1">{label}</span>
                <span className="font-medium tabular-nums text-gray-800">{price.toFixed(1)}</span>
                <span className={`text-xs tabular-nums ${diff < 0 ? 'text-red-400' : 'text-green-500'}`}>
                  {diff >= 0 ? '+' : ''}{diff.toFixed(1)}
                </span>
                <span className="text-xs text-gray-400 tabular-nums w-14 text-right">{rate?.toFixed(1)}%</span>
              </div>
            )
          } else {
            const rate = (d as unknown as Record<string, number>)[`${key}_rate`]
            if (rate == null) return null
            return (
              <div key={key} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                <span className="text-gray-600 flex-1">{label}</span>
                <span className={`font-medium tabular-nums ${rate < 90 ? 'text-orange-500' : rate < 95 ? 'text-gray-700' : 'text-green-600'}`}>
                  {rate.toFixed(1)}%
                </span>
              </div>
            )
          }
        })}
      </div>
    </div>
  )
}

export default function CapturePriceChart({
  data,
  view,
}: {
  data: CapturePivot[]
  view: ViewMode
}) {
  return (
    <ResponsiveContainer width="100%" height={380}>
      <LineChart data={data} margin={{ top: 12, right: 20, bottom: 4, left: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" strokeOpacity={0.8} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          tickFormatter={xTickFormatter}
          minTickGap={60}
          axisLine={{ stroke: '#e2e8f0' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          tickFormatter={(v) => view === 'price' ? `${Math.round(v)}€` : `${Math.round(v)}%`}
          width={44}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip view={view} />} />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => <span style={{ fontSize: 11, color: '#94a3b8' }}>{value}</span>}
        />

        {view === 'price' && (
          <Line
            dataKey="baseload_eur_mwh"
            name="Baseload"
            stroke="#94a3b8"
            strokeWidth={1.5}
            strokeDasharray="5 3"
            dot={false}
            isAnimationActive={false}
          />
        )}

        {view === 'rate' && (
          <ReferenceLine y={100} stroke="#94a3b8" strokeDasharray="4 2" label={{ value: '100%', position: 'right', fontSize: 11, fill: '#94a3b8' }} />
        )}

        {CAPTURE_ASSETS.map(({ key, label, color }) => (
          <Line
            key={key}
            dataKey={view === 'price' ? `${key}_eur_mwh` : `${key}_rate`}
            name={label}
            stroke={color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
