export const dynamic = 'force-dynamic'

import fs from 'fs'
import path from 'path'
import SpotPriceSection from '@/components/SpotPriceSection'
import GenerationMixSection from '@/components/GenerationMixSection'
import RenewablePriceSection from '@/components/RenewablePriceSection'
import CapturePriceSection from '@/components/CapturePriceSection'
import YoYSection from '@/components/YoYSection'
import PriceDurationSection from '@/components/PriceDurationSection'
import DownloadSection from '@/components/DownloadSection'
import SummarySection, { type SummaryStats } from '@/components/SummarySection'
import { pivotQuantiles, type QuantileRecord } from '@/lib/dataUtils'
import { toShareData, type GenerationRecord } from '@/lib/generationUtils'
import { pivotCaptureData, type CaptureRecord } from '@/lib/capturePriceUtils'
import type { SolarWindPriceRecord } from '@/lib/solarWindPriceUtils'
import type { YoYRecord } from '@/lib/yoyUtils'
import type { PdcRecord } from '@/lib/priceDurationUtils'

function readJson<T>(filename: string): T {
  return JSON.parse(
    fs.readFileSync(path.join(process.cwd(), '..', 'data', filename), 'utf-8'),
  ) as T
}

export default function Home() {
  const spotJson = readJson<{ meta: { last_updated: string }; data: QuantileRecord[] }>('spot_quantiles.json')
  const chartData = pivotQuantiles(spotJson.data, 365)
  const lastUpdated = new Date(spotJson.meta.last_updated).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

  const genJson = readJson<{ meta: { last_updated: string }; data: GenerationRecord[] }>('generation_mix.json')
  const genMixData = toShareData(genJson.data)
  const genLastUpdated = new Date(genJson.meta.last_updated).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

  const genHourlyJson = readJson<{ data: GenerationRecord[] }>('generation_mix_hourly.json')
  const hourlyMixData = toShareData(genHourlyJson.data)

  const swpHourlyJson = readJson<{ meta: { last_updated: string }; data: SolarWindPriceRecord[] }>('solar_wind_price_hourly.json')
  const swpLastUpdated = new Date(swpHourlyJson.meta.last_updated).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
  const swpHourly = swpHourlyJson.data

  const swpDailyJson = readJson<{ data: SolarWindPriceRecord[] }>('solar_wind_price_daily.json')

  const captureJson = readJson<{ meta: { last_updated: string }; data: CaptureRecord[] }>('capture_prices.json')
  const captureData = pivotCaptureData(captureJson.data)
  const captureLastUpdated = new Date(captureJson.meta.last_updated).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

  const yoyJson = readJson<{ meta: { last_updated: string }; data: YoYRecord[] }>('yoy_overlay.json')
  const yoyLastUpdated = new Date(yoyJson.meta.last_updated).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

  const pdcJson = readJson<{ meta: { last_updated: string }; data: PdcRecord[] }>('price_duration.json')
  const pdcLastUpdated = new Date(pdcJson.meta.last_updated).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

  const avg = (arr: number[]) => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null
  const last7d  = swpHourly.slice(-168)
  const last30d = swpHourly.slice(-720)
  const latest  = swpHourly.at(-1)
  const latestPriceTime = latest?.date
    ? new Date(latest.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ', ' +
      new Date(latest.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    : '—'

  const recentDaily = genMixData.slice(-30)
  const renewablesShare30d = avg(
    recentDaily.map((d) => d.solar + d.wind_onshore + d.wind_offshore + d.biomass + d.hydro + d.other_renewable),
  )

  const summaryStats: SummaryStats = {
    latestPrice:        latest?.price_eur_mwh ?? null,
    latestPriceTime,
    avg7dPrice:         avg(last7d.map((d) => d.price_eur_mwh)),
    avg30dPrice:        avg(last30d.map((d) => d.price_eur_mwh)),
    renewablesShare30d: renewablesShare30d != null ? Math.round(renewablesShare30d * 10) / 10 : null,
    negativeHours30d:   last30d.filter((d) => d.price_eur_mwh < 0).length,
    totalHours30d:      last30d.length,
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top accent bar */}
      <div className="h-1 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500 shrink-0" />

      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-8 pb-6 border-b border-gray-200">
            <div>
              <p className="text-[11px] font-bold text-blue-600 uppercase tracking-widest mb-2">
                DE-LU Power Market
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                Energy Procurement Dashboard
              </h1>
              <p className="text-sm text-gray-400 mt-1.5">
                Public market data · Source:{' '}
                <a
                  href="https://www.smard.de/en"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-gray-600 transition-colors"
                >
                  SMARD.de
                </a>
                {' '}· Updated daily
              </p>
            </div>
            <div className="flex items-center gap-1.5 self-start bg-green-50 border border-green-100 px-3 py-1.5 rounded-full shrink-0">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="text-xs font-semibold text-green-700">Live</span>
            </div>
          </div>

          {/* Summary stat cards */}
          <SummarySection stats={summaryStats} />

          {/* Chart sections */}
          <div className="space-y-8">
            <section>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                Market Prices
              </p>
              <div className="space-y-6">
                <SpotPriceSection data={chartData} lastUpdated={lastUpdated} />
                <YoYSection data={yoyJson.data} lastUpdated={yoyLastUpdated} />
                <PriceDurationSection data={pdcJson.data} lastUpdated={pdcLastUpdated} />
              </div>
            </section>

            <section>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                Generation Mix
              </p>
              <GenerationMixSection daily={genMixData} hourly={hourlyMixData} lastUpdated={genLastUpdated} />
            </section>

            <section>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                Renewables &amp; Price Correlation
              </p>
              <RenewablePriceSection
                hourly={swpHourlyJson.data}
                daily={swpDailyJson.data}
                lastUpdated={swpLastUpdated}
              />
            </section>

            <section>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                Capture Prices
              </p>
              <CapturePriceSection data={captureData} lastUpdated={captureLastUpdated} />
            </section>

            <section>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                Download
              </p>
              <DownloadSection
                dailyMix={genMixData}
                hourlyMix={hourlyMixData}
                swpDaily={swpDailyJson.data}
                swpHourly={swpHourlyJson.data}
                lastUpdated={lastUpdated}
              />
            </section>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p className="text-xs text-gray-400">
            Data:{' '}
            <a
              href="https://www.smard.de/en"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-gray-600 transition-colors"
            >
              SMARD.de
            </a>
            {' '}(Bundesnetzagentur) · Not financial advice
          </p>
          <p className="text-xs text-gray-400">DE-LU bidding zone</p>
        </div>
      </footer>
    </div>
  )
}
