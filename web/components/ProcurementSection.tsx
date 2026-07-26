'use client'

import { useMemo, useState } from 'react'
import type { DailyQuantile } from '@/lib/dataUtils'
import type { CapturePivot } from '@/lib/capturePriceUtils'

interface Props {
  captureData: CapturePivot[]
  latestQuantile: DailyQuantile | undefined
  avg30dPrice: number | null
}

const TECHS = [
  { key: 'solar' as const,         label: 'Solar',         rateKey: 'solar_rate' as const,         priceKey: 'solar_eur_mwh' as const },
  { key: 'wind_onshore' as const,  label: 'Wind Onshore',  rateKey: 'wind_onshore_rate' as const,  priceKey: 'wind_onshore_eur_mwh' as const },
  { key: 'wind_offshore' as const, label: 'Wind Offshore', rateKey: 'wind_offshore_rate' as const, priceKey: 'wind_offshore_eur_mwh' as const },
]

function avg(vals: number[]): number | null {
  const valid = vals.filter((v) => v != null && !isNaN(v))
  return valid.length ? valid.reduce((s, v) => s + v, 0) / valid.length : null
}

function fmtCost(mwh: number, price: number): string {
  const cost = mwh * price
  if (cost >= 1_000_000) return `€${(cost / 1_000_000).toFixed(2)}M`
  if (cost >= 10_000) return `€${Math.round(cost / 1_000)}k`
  return `€${Math.round(cost).toLocaleString()}`
}

export default function ProcurementSection({ captureData, latestQuantile, avg30dPrice }: Props) {
  const [consumption, setConsumption] = useState(10_000)
  const [strikePrice, setStrikePrice] = useState<number | ''>(75)
  const [techIdx, setTechIdx] = useState(0)

  const tech = TECHS[techIdx]

  const last12m = useMemo(() => {
    return [...captureData].sort((a, b) => b.month.localeCompare(a.month)).slice(0, 12)
  }, [captureData])

  const avg12mCapturePrice = useMemo(
    () => avg(last12m.map((r) => (r as unknown as Record<string, number>)[tech.priceKey])),
    [last12m, tech],
  )
  const avg12mCaptureRate = useMemo(
    () => avg(last12m.map((r) => (r as unknown as Record<string, number>)[tech.rateKey])),
    [last12m, tech],
  )
  const avg12mBaseload = useMemo(() => avg(last12m.map((r) => r.baseload_eur_mwh)), [last12m])

  const strike = typeof strikePrice === 'number' ? strikePrice : null
  const ppaDiff =
    strike != null && avg12mCapturePrice != null
      ? ((strike - avg12mCapturePrice) / avg12mCapturePrice) * 100
      : null

  const verdict =
    ppaDiff == null
      ? null
      : ppaDiff < -15
      ? { label: 'Clearly Competitive', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200', dot: 'bg-green-500' }
      : ppaDiff < -5
      ? { label: 'Competitive', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', dot: 'bg-green-400' }
      : ppaDiff < 5
      ? { label: 'At Market Level', color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200', dot: 'bg-slate-400' }
      : ppaDiff < 15
      ? { label: 'Above Market', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', dot: 'bg-orange-400' }
      : { label: 'Expensive', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', dot: 'bg-red-500' }

  const priceRows = latestQuantile
    ? [
        { label: 'Best case',   sublabel: 'p10', price: latestQuantile.p10 },
        { label: 'Low',         sublabel: 'p25', price: latestQuantile.p25 },
        { label: 'Typical',     sublabel: 'p50', price: latestQuantile.p50, highlight: true },
        { label: 'Elevated',    sublabel: 'p75', price: latestQuantile.p75 },
        { label: 'Worst case',  sublabel: 'p90', price: latestQuantile.p90 },
      ]
    : []

  const marketSignal =
    latestQuantile && avg30dPrice != null
      ? avg30dPrice < latestQuantile.p25
        ? { text: 'Market is in the bottom quartile — conditions favour locking in rates or reducing hedge.', positive: true }
        : avg30dPrice > latestQuantile.p75
        ? { text: 'Market is above the 75th percentile — consider reducing spot exposure or deferring flexible loads.', positive: false }
        : { text: 'Market is within the typical range (p25–p75). Standard procurement strategy applies.', positive: null }
      : null

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Procurement Intelligence</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Analytical tools for energy buyers · calibrated to current DE-LU market data
          </p>
        </div>
        <span className="flex items-center gap-1.5 shrink-0 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full text-xs font-semibold text-blue-600">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
          Live data
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ── Annual Cost Estimator ────────────────────────────────── */}
        <div className="rounded-lg border border-gray-100 bg-gray-50/40 p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-0.5">Annual Cost Estimator</h3>
          <p className="text-xs text-gray-400 mb-4">
            See what your portfolio would cost across the current 12-month price distribution.
          </p>

          <div className="mb-5">
            <label className="text-xs font-medium text-gray-500 block mb-1.5">Annual consumption</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={consumption}
                min={100}
                max={10_000_000}
                step={1000}
                onChange={(e) => setConsumption(Math.max(100, Number(e.target.value)))}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 w-36 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-400">MWh / year</span>
            </div>
          </div>

          <div className="rounded-lg border border-gray-100 bg-white overflow-hidden">
            <div className="grid grid-cols-3 text-[11px] font-medium text-gray-400 uppercase tracking-wider px-3 py-2 border-b border-gray-100">
              <span>Scenario</span>
              <span className="text-right">Price</span>
              <span className="text-right">Annual cost</span>
            </div>
            {priceRows.map(({ label, sublabel, price, highlight }) => (
              <div
                key={sublabel}
                className={`grid grid-cols-3 px-3 py-2.5 ${
                  highlight
                    ? 'bg-blue-50 border-y border-blue-100'
                    : 'border-b border-gray-50 last:border-0'
                }`}
              >
                <div>
                  <span className={`text-xs font-medium ${highlight ? 'text-blue-700' : 'text-gray-700'}`}>
                    {label}
                  </span>
                  <span className={`text-[10px] ml-1 ${highlight ? 'text-blue-400' : 'text-gray-400'}`}>
                    {sublabel}
                  </span>
                </div>
                <div className={`text-xs tabular-nums text-right ${highlight ? 'text-blue-600' : 'text-gray-500'}`}>
                  {price.toFixed(1)} €
                </div>
                <div className={`text-sm font-bold tabular-nums text-right ${highlight ? 'text-blue-700' : 'text-gray-700'}`}>
                  {fmtCost(consumption, price)}
                </div>
              </div>
            ))}
            {avg30dPrice != null && (
              <div className="grid grid-cols-3 px-3 py-2.5 border-t border-gray-200 bg-gray-50">
                <div>
                  <span className="text-xs font-medium text-gray-500">30d avg</span>
                  <span className="text-[10px] ml-1 text-gray-400">current</span>
                </div>
                <div className="text-xs tabular-nums text-right text-gray-500">
                  {avg30dPrice.toFixed(1)} €
                </div>
                <div className="text-sm font-bold tabular-nums text-right text-gray-700">
                  {fmtCost(consumption, avg30dPrice)}
                </div>
              </div>
            )}
          </div>

          {marketSignal && (
            <p className={`text-xs mt-3 leading-relaxed ${
              marketSignal.positive === true
                ? 'text-green-600'
                : marketSignal.positive === false
                ? 'text-orange-600'
                : 'text-gray-400'
            }`}>
              {marketSignal.text}
            </p>
          )}
        </div>

        {/* ── PPA Viability Check ──────────────────────────────────── */}
        <div className="rounded-lg border border-gray-100 bg-gray-50/40 p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-0.5">PPA Viability Check</h3>
          <p className="text-xs text-gray-400 mb-4">
            Compare a proposed long-term PPA strike to the actual market capture price over the last 12 months.
          </p>

          <div className="grid grid-cols-2 gap-3 mb-5">
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1.5">Strike price</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={strikePrice}
                  min={0}
                  max={500}
                  step={0.5}
                  onChange={(e) => {
                    const v = e.target.value
                    setStrikePrice(v === '' ? '' : Math.max(0, Number(v)))
                  }}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 w-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-xs text-gray-400">€/MWh</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1.5">Technology</label>
              <select
                value={techIdx}
                onChange={(e) => setTechIdx(Number(e.target.value))}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full bg-white"
              >
                {TECHS.map((t, i) => (
                  <option key={t.key} value={i}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Market reference */}
          <div className="rounded-lg border border-gray-100 bg-white p-3 mb-4">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2.5">
              12-month market reference · {tech.label}
            </p>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Avg capture price</span>
                <span className="text-sm font-bold tabular-nums text-gray-800">
                  {avg12mCapturePrice != null ? `${avg12mCapturePrice.toFixed(1)} €/MWh` : '—'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Avg capture rate</span>
                <span className="text-sm font-bold tabular-nums text-gray-800">
                  {avg12mCaptureRate != null ? `${avg12mCaptureRate.toFixed(1)}%` : '—'}{' '}
                  <span className="text-xs font-normal text-gray-400">of baseload</span>
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-gray-50 pt-2">
                <span className="text-xs text-gray-400">Avg baseload ref.</span>
                <span className="text-xs tabular-nums text-gray-500">
                  {avg12mBaseload != null ? `${avg12mBaseload.toFixed(1)} €/MWh` : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Verdict */}
          {verdict && ppaDiff != null && avg12mCapturePrice != null && strike != null ? (
            <div className={`rounded-lg border px-4 py-3.5 ${verdict.bg} ${verdict.border}`}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${verdict.dot}`} />
                  <span className={`text-sm font-bold ${verdict.color}`}>{verdict.label}</span>
                </div>
                <span className={`text-sm font-bold tabular-nums ${verdict.color}`}>
                  {ppaDiff >= 0 ? '+' : ''}{ppaDiff.toFixed(1)}%
                </span>
              </div>
              <p className={`text-xs leading-relaxed ${verdict.color} opacity-80`}>
                {ppaDiff < 0
                  ? `Strike of ${strike.toFixed(1)} €/MWh is ${Math.abs(ppaDiff).toFixed(1)}% below the 12-month avg capture (${avg12mCapturePrice.toFixed(1)} €/MWh). This PPA looks favourable versus recent market.`
                  : `Strike of ${strike.toFixed(1)} €/MWh is ${ppaDiff.toFixed(1)}% above the 12-month avg capture (${avg12mCapturePrice.toFixed(1)} €/MWh). Evaluate spot and short-term alternatives.`
                }
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-xs text-gray-400 text-center">
              Enter a strike price to see the viability assessment.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
