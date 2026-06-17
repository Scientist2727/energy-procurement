'use client'

import { useMemo, useState } from 'react'
import CapturePriceChart, { type ViewMode } from './CapturePriceChart'
import { CAPTURE_ASSETS, type CapturePivot } from '@/lib/capturePriceUtils'

const PRESETS = [
  { label: '1Y',  months: 12 },
  { label: '2Y',  months: 24 },
  { label: '3Y',  months: 36 },
  { label: 'All', months: 99999 },
] as const

type PresetLabel = typeof PRESETS[number]['label']
type BannerGran = 'month' | 'year'

interface PeriodRow {
  baseload_eur_mwh: number
  solar_eur_mwh: number
  wind_onshore_eur_mwh: number
  wind_offshore_eur_mwh: number
  combined_renewables_eur_mwh: number
  solar_rate: number
  wind_onshore_rate: number
  wind_offshore_rate: number
  combined_renewables_rate: number
}

const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function formatMonthLabel(isoMonth: string): string {
  const [y, m] = isoMonth.split('-').map(Number)
  return `${MONTH_ABBR[m - 1]} ${y}`
}

function subtractMonths(isoMonth: string, n: number): string {
  const [y, m] = isoMonth.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 - n, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

function avg(vals: number[]) {
  const valid = vals.filter((v) => v != null && !isNaN(v))
  return valid.length ? valid.reduce((s, v) => s + v, 0) / valid.length : NaN
}

function rateColor(rate: number): string {
  if (rate >= 95) return 'text-green-600'
  if (rate >= 90) return 'text-gray-700'
  if (rate >= 80) return 'text-orange-500'
  return 'text-red-500'
}

function buildPeriodRow(rows: CapturePivot[]): PeriodRow {
  return {
    baseload_eur_mwh:              avg(rows.map((r) => r.baseload_eur_mwh)),
    solar_eur_mwh:                 avg(rows.map((r) => r.solar_eur_mwh)),
    wind_onshore_eur_mwh:          avg(rows.map((r) => r.wind_onshore_eur_mwh)),
    wind_offshore_eur_mwh:         avg(rows.map((r) => r.wind_offshore_eur_mwh)),
    combined_renewables_eur_mwh:   avg(rows.map((r) => r.combined_renewables_eur_mwh)),
    solar_rate:                    avg(rows.map((r) => r.solar_rate)),
    wind_onshore_rate:             avg(rows.map((r) => r.wind_onshore_rate)),
    wind_offshore_rate:            avg(rows.map((r) => r.wind_offshore_rate)),
    combined_renewables_rate:      avg(rows.map((r) => r.combined_renewables_rate)),
  }
}

export default function CapturePriceSection({
  data,
  lastUpdated,
}: {
  data: CapturePivot[]
  lastUpdated: string
}) {
  const minMonth = data.at(0)?.month ?? ''
  const maxMonth = data.at(-1)?.month ?? ''

  const [activePreset, setActivePreset] = useState<PresetLabel>('3Y')
  const [view, setView] = useState<ViewMode>('price')
  const [bannerGran, setBannerGran] = useState<BannerGran>('month')
  const [bannerPeriod, setBannerPeriod] = useState(() => maxMonth)

  const startMonth = useMemo(() => {
    const preset = PRESETS.find((p) => p.label === activePreset)!
    return preset.months >= 99999 ? minMonth : subtractMonths(maxMonth, preset.months)
  }, [activePreset, minMonth, maxMonth])

  const filtered = useMemo(
    () => data.filter((d) => d.month >= startMonth),
    [data, startMonth],
  )

  // All available periods for navigation
  const availableMonths = useMemo(() => data.map((d) => d.month).sort(), [data])
  const availableYears  = useMemo(
    () => [...new Set(data.map((d) => d.month.slice(0, 4)))].sort(),
    [data],
  )

  function navigate(dir: -1 | 1) {
    if (bannerGran === 'month') {
      const idx = availableMonths.indexOf(bannerPeriod)
      const next = availableMonths[idx + dir]
      if (next) setBannerPeriod(next)
    } else {
      const idx = availableYears.indexOf(bannerPeriod.slice(0, 4))
      const next = availableYears[idx + dir]
      if (next) setBannerPeriod(next)
    }
  }

  function switchGran(gran: BannerGran) {
    setBannerGran(gran)
    setBannerPeriod(gran === 'month' ? maxMonth : maxMonth.slice(0, 4))
  }

  const bannerRow = useMemo((): PeriodRow | null => {
    if (bannerGran === 'month') {
      const found = data.find((d) => d.month === bannerPeriod)
      return found ? buildPeriodRow([found]) : null
    }
    const rows = data.filter((d) => d.month.startsWith(bannerPeriod.slice(0, 4)))
    return rows.length ? buildPeriodRow(rows) : null
  }, [data, bannerGran, bannerPeriod])

  const canGoPrev = bannerGran === 'month'
    ? availableMonths.indexOf(bannerPeriod) > 0
    : availableYears.indexOf(bannerPeriod.slice(0, 4)) > 0

  const canGoNext = bannerGran === 'month'
    ? availableMonths.indexOf(bannerPeriod) < availableMonths.length - 1
    : availableYears.indexOf(bannerPeriod.slice(0, 4)) < availableYears.length - 1

  const periodLabel = bannerGran === 'month' ? formatMonthLabel(bannerPeriod) : bannerPeriod.slice(0, 4)

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Capture Prices</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Monthly volume-weighted capture price vs. baseload · EUR/MWh · DE-LU
          </p>
        </div>
        <span className="text-xs text-gray-400 mt-0.5 shrink-0">Updated {lastUpdated}</span>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex gap-1">
          {PRESETS.map(({ label }) => (
            <button
              key={label}
              onClick={() => setActivePreset(label)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                activePreset === label
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="h-5 w-px bg-gray-200" />

        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm font-medium">
          <button
            onClick={() => setView('price')}
            className={`px-3 py-1 transition-colors ${
              view === 'price' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            €/MWh
          </button>
          <button
            onClick={() => setView('rate')}
            className={`px-3 py-1 transition-colors border-l border-gray-200 ${
              view === 'rate' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            Capture Rate
          </button>
        </div>

        <div className="h-5 w-px bg-gray-200" />
        <span className="text-sm text-gray-400">{filtered.length} months</span>
      </div>

      <CapturePriceChart key={`${startMonth}|${view}`} data={filtered} view={view} />

      {/* Explainer */}
      <p className="text-xs text-gray-400 mt-4 leading-relaxed">
        Capture price: the average spot price weighted by each technology&apos;s actual hourly generation profile.
        A declining capture rate reflects the merit-order effect — as more renewables generate simultaneously,
        they push prices lower during their own peak output hours.
      </p>

      {/* Period banner */}
      <div className="mt-5 pt-5 border-t border-gray-100">
        {/* Banner controls */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
            <button
              onClick={() => switchGran('month')}
              className={`px-3 py-1.5 transition-colors ${
                bannerGran === 'month' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => switchGran('year')}
              className={`px-3 py-1.5 transition-colors border-l border-gray-200 ${
                bannerGran === 'year' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              Year
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate(-1)}
              disabled={!canGoPrev}
              className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
            >
              ‹
            </button>
            <span className="text-sm font-semibold text-gray-700 w-20 text-center tabular-nums">
              {periodLabel}
            </span>
            <button
              onClick={() => navigate(1)}
              disabled={!canGoNext}
              className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
            >
              ›
            </button>
          </div>

          {bannerRow && (
            <span className="text-xs text-gray-400 ml-auto">
              Baseload ref.: <span className="text-gray-600 font-medium tabular-nums">{bannerRow.baseload_eur_mwh.toFixed(1)} €/MWh</span>
              {bannerGran === 'year' && <span className="ml-1">(avg)</span>}
            </span>
          )}
        </div>

        {/* Stat cards */}
        {bannerRow ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {CAPTURE_ASSETS.map(({ key, label, color }) => {
              const price = (bannerRow as unknown as Record<string, number>)[`${key}_eur_mwh`]
              const rate  = (bannerRow as unknown as Record<string, number>)[`${key}_rate`]
              const diff  = price - bannerRow.baseload_eur_mwh
              return (
                <div key={key} className="rounded-lg border border-gray-100 bg-gray-50/40 p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                    <span className="text-xs font-medium text-gray-500">{label}</span>
                  </div>

                  {view === 'price' ? (
                    <>
                      <p className="text-xl font-bold text-gray-900 tabular-nums leading-none mb-1">
                        {isNaN(price) ? '—' : `${price.toFixed(1)}`}
                        <span className="text-sm font-normal text-gray-400 ml-1">€/MWh</span>
                      </p>
                      <div className="flex items-baseline gap-2">
                        <span className={`text-sm font-semibold tabular-nums ${rateColor(rate)}`}>
                          {isNaN(rate) ? '—' : `${rate.toFixed(1)}%`}
                        </span>
                        {!isNaN(diff) && (
                          <span className={`text-xs tabular-nums ${diff < 0 ? 'text-red-400' : 'text-green-500'}`}>
                            {diff >= 0 ? '+' : ''}{diff.toFixed(1)} vs BL
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className={`text-2xl font-bold tabular-nums leading-none ${rateColor(rate)}`}>
                      {isNaN(rate) ? '—' : `${rate.toFixed(1)}`}
                      <span className="text-sm font-normal text-gray-400 ml-0.5">%</span>
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-4">No data for this period</p>
        )}
      </div>
    </div>
  )
}
