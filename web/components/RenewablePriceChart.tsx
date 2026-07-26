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
  return new Date(value + 'T12:00:00Z').toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
}

function xTickFormatterHourly(value: string) {
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
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

  const totalRen = d.solar_mw + d.wind_onshore_mw + d.wind_offshore_mw
  const dateStr = isHourly
    ? new Date(label!).toLocaleString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : new Date(label! + 'T12:00:00Z').toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric',
      })

  return (
    <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-lg text-sm max-w-[230px]">
      <p className="font-semibold text-gray-700 text-xs uppercase tracking-wide mb-2.5">{dateStr}</p>

      <div className="space-y-1.5 pb-2.5 mb-2.5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: '#f59e0b' }} />
          <span className="text-gray-500 flex-1 text-xs">Solar</span>
          <span className="font-semibold tabular-nums text-gray-800 text-xs">{fmtMW(d.solar_mw)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: '#1e40af' }} />
          <span className="text-gray-500 flex-1 text-xs">Wind Offshore</span>
          <span className="font-semibold tabular-nums text-gray-800 text-xs">{fmtMW(d.wind_offshore_mw)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: '#60a5fa' }} />
          <span className="text-gray-500 flex-1 text-xs">Wind Onshore</span>
          <span className="font-semibold tabular-nums text-gray-800 text-xs">{fmtMW(d.wind_onshore_mw)}</span>
        </div>
        <div className="flex items-center gap-2 pt-0.5">
          <span className="w-2.5 h-2.5 shrink-0" />
          <span className="text-gray-400 flex-1 text-[10px]">Total wind + solar</span>
          <span className="tabular-nums text-gray-500 text-[10px]">{fmtMW(totalRen)}</span>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-sm shrink-0"
            style={{ background: d.net_exports_mw >= 0 ? '#16a34a' : '#f97316' }}
          />
          <span className="text-gray-500 flex-1 text-xs">
            {d.net_exports_mw >= 0 ? 'Net Export' : 'Net Import'}
          </span>
          <span className="font-semibold tabular-nums text-gray-800 text-xs">
            {fmtMW(Math.abs(d.net_exports_mw))}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: '#dc2626' }} />
          <span className="text-gray-500 flex-1 text-xs">DA Price</span>
          <span className={`font-bold tabular-nums text-xs ${d.price_eur_mwh < 0 ? 'text-red-600' : 'text-gray-800'}`}>
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
  const chartData = useMemo<ChartRow[]>(
    () =>
      data.map((d) => ({
        ...d,
        export_mw: Math.max(0, d.net_exports_mw ?? 0),
        import_mw: Math.min(0, d.net_exports_mw ?? 0),
        price_neg: Math.min(0, d.price_eur_mwh ?? 0),
      })),
    [data],
  )

  const hasNegativePrice = chartData.some((d) => d.price_neg < 0)

  return (
    <ResponsiveContainer width="100%" height={460}>
      <ComposedChart data={chartData} margin={{ top: 12, right: 64, bottom: 4, left: 4 }}>
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
          yAxisId="left"
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          tickFormatter={(v) => `${Math.round(v / 1000)} GW`}
          width={48}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          tickFormatter={(v) => `${Math.round(v)}€`}
          width={48}
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

        <Area yAxisId="left" stackId="ren" dataKey="solar_mw"         name="Solar"        fill="#fde68a" stroke="#f59e0b" strokeWidth={0.5} fillOpacity={0.9} isAnimationActive={false} />
        <Area yAxisId="left" stackId="ren" dataKey="wind_offshore_mw" name="Wind Offshore" fill="#1e40af" stroke="#1e40af" strokeWidth={0}   fillOpacity={0.85} isAnimationActive={false} />
        <Area yAxisId="left" stackId="ren" dataKey="wind_onshore_mw"  name="Wind Onshore"  fill="#60a5fa" stroke="#60a5fa" strokeWidth={0}   fillOpacity={0.85} isAnimationActive={false} />

        <Bar yAxisId="left" stackId="exp" dataKey="export_mw" name="Net Export" fill="#16a34a" fillOpacity={0.75} barSize={isHourly ? 1 : 2} isAnimationActive={false} />
        <Bar yAxisId="left" stackId="exp" dataKey="import_mw" name="Net Import" fill="#f97316" fillOpacity={0.75} barSize={isHourly ? 1 : 2} isAnimationActive={false} />

        <ReferenceLine yAxisId="left" y={0} stroke="#cbd5e1" strokeDasharray="4 2" />

        {hasNegativePrice && (
          <Area yAxisId="right" dataKey="price_neg" name="" legendType="none" fill="#fecaca" fillOpacity={0.4} stroke="none" isAnimationActive={false} />
        )}
        {hasNegativePrice && (
          <ReferenceLine yAxisId="right" y={0} stroke="#fca5a5" strokeDasharray="4 2" />
        )}

        <Line
          yAxisId="right"
          dataKey="price_eur_mwh"
          name="DA Price"
          stroke="#dc2626"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 3, fill: '#dc2626', stroke: '#fff', strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
