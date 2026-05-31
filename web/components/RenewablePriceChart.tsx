'use client'

import { useMemo } from 'react'
import {
  ComposedChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import type { SolarWindPriceRecord } from '@/lib/solarWindPriceUtils'

type ChartRow = SolarWindPriceRecord & {
  export_mw: number
  import_mw: number
  price_neg: number
}

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

function fmtMW(mw: number) {
  const abs = Math.abs(mw)
  return abs >= 1000 ? `${(mw / 1000).toFixed(1)} GW` : `${mw.toFixed(0)} MW`
}

function CustomTooltip({
  active,
  payload,
  label,
  isHourly,
}: {
  active?: boolean
  payload?: Array<{ payload: ChartRow }>
  label?: string
  isHourly?: boolean
}) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload

  const totalWind = d.wind_onshore_mw + d.wind_offshore_mw
  const totalRen  = d.solar_mw + totalWind

  const dateStr = isHourly
    ? new Date(label!).toLocaleString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : new Date(label! + 'T12:00:00Z').toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric',
      })

  return (
    <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 shadow text-sm max-w-[220px]">
      <p className="font-semibold text-gray-800 mb-2">{dateStr}</p>
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-sm shrink-0 bg-amber-400" />
          <span className="text-gray-600 flex-1">Solar</span>
          <span className="font-medium tabular-nums text-gray-800">{fmtMW(d.solar_mw)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-sm shrink-0 bg-blue-800" />
          <span className="text-gray-600 flex-1">Wind Offshore</span>
          <span className="font-medium tabular-nums text-gray-800">{fmtMW(d.wind_offshore_mw)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-sm shrink-0 bg-blue-400" />
          <span className="text-gray-600 flex-1">Wind Onshore</span>
          <span className="font-medium tabular-nums text-gray-800">{fmtMW(d.wind_onshore_mw)}</span>
        </div>
        <div className="flex items-center gap-2 pt-1 mt-0.5 border-t border-gray-100">
          <span className="w-2 h-2 shrink-0 opacity-0" />
          <span className="text-gray-400 flex-1 text-xs">Total solar + wind</span>
          <span className="tabular-nums text-gray-600 text-xs">{fmtMW(totalRen)}</span>
        </div>
        <div className="flex items-center gap-2 pt-1 mt-0.5 border-t border-gray-100">
          <span
            className="w-2 h-2 rounded-sm shrink-0"
            style={{ background: d.net_exports_mw >= 0 ? '#22c55e' : '#f97316' }}
          />
          <span className="text-gray-600 flex-1">
            {d.net_exports_mw >= 0 ? 'Net Export' : 'Net Import'}
          </span>
          <span className="font-medium tabular-nums text-gray-800">
            {fmtMW(Math.abs(d.net_exports_mw))}
          </span>
        </div>
        <div className="flex items-center gap-2 pt-1 mt-0.5 border-t border-gray-100">
          <span className="w-2 h-2 rounded-sm shrink-0 bg-red-400" />
          <span className="text-gray-600 flex-1">DA Price</span>
          <span className={`font-medium tabular-nums ${d.price_eur_mwh < 0 ? 'text-red-600' : 'text-gray-800'}`}>
            {d.price_eur_mwh != null ? `${d.price_eur_mwh.toFixed(1)} €/MWh` : '—'}
          </span>
        </div>
      </div>
    </div>
  )
}

export default function RenewablePriceChart({
  data,
  isHourly = false,
}: {
  data: SolarWindPriceRecord[]
  isHourly?: boolean
}) {
  const chartData = useMemo<ChartRow[]>(() =>
    data.map((d) => ({
      ...d,
      export_mw:  Math.max(0, d.net_exports_mw ?? 0),
      import_mw:  Math.min(0, d.net_exports_mw ?? 0),
      price_neg:  Math.min(0, d.price_eur_mwh  ?? 0),
    })),
    [data],
  )

  const hasNegativePrice = chartData.some((d) => d.price_neg < 0)

  return (
    <ResponsiveContainer width="100%" height={460}>
      <ComposedChart data={chartData} margin={{ top: 8, right: 60, bottom: 8, left: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12, fill: '#64748b' }}
          tickFormatter={isHourly ? xTickFormatterHourly : xTickFormatterDaily}
          minTickGap={isHourly ? 50 : 70}
        />
        <YAxis
          yAxisId="left"
          tick={{ fontSize: 12, fill: '#64748b' }}
          tickFormatter={(v) => `${Math.round(v / 1000)} GW`}
          width={52}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tick={{ fontSize: 12, fill: '#64748b' }}
          tickFormatter={(v) => `${Math.round(v)}€`}
          width={52}
        />
        <Tooltip content={<CustomTooltip isHourly={isHourly} />} />
        <Legend
          iconType="rect"
          iconSize={10}
          formatter={(value) => (
            <span style={{ fontSize: 12, color: '#64748b' }}>{value}</span>
          )}
        />

        {/* Stacked solar + wind areas */}
        <Area yAxisId="left" stackId="ren" dataKey="solar_mw"         name="Solar"         fill="#fbbf24" stroke="#fbbf24" strokeWidth={0} isAnimationActive={false} />
        <Area yAxisId="left" stackId="ren" dataKey="wind_offshore_mw" name="Wind Offshore"  fill="#1e40af" stroke="#1e40af" strokeWidth={0} isAnimationActive={false} />
        <Area yAxisId="left" stackId="ren" dataKey="wind_onshore_mw"  name="Wind Onshore"   fill="#60a5fa" stroke="#60a5fa" strokeWidth={0} isAnimationActive={false} />

        {/* Net exports: stacked so positive (green) and negative (orange) never overlap */}
        <Bar yAxisId="left" stackId="exp" dataKey="export_mw" name="Net Export" fill="#22c55e" fillOpacity={0.85} barSize={isHourly ? 1 : 2} isAnimationActive={false} />
        <Bar yAxisId="left" stackId="exp" dataKey="import_mw" name="Net Import" fill="#f97316" fillOpacity={0.85} barSize={isHourly ? 1 : 2} isAnimationActive={false} />

        <ReferenceLine yAxisId="left" y={0} stroke="#cbd5e1" strokeDasharray="4 2" />

        {/* Price line */}
        <Line yAxisId="right" dataKey="price_eur_mwh" name="Price" stroke="#ef4444" strokeWidth={1.5} dot={false} isAnimationActive={false} />

        {/* Filled red area for negative price periods */}
        {hasNegativePrice && (
          <Area yAxisId="right" dataKey="price_neg" name="" legendType="none" fill="#fecaca" fillOpacity={0.45} stroke="none" isAnimationActive={false} />
        )}

        {hasNegativePrice && (
          <ReferenceLine yAxisId="right" y={0} stroke="#fca5a5" strokeDasharray="4 2" />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  )
}
