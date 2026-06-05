export const dynamic = 'force-dynamic'

import fs from 'fs'
import path from 'path'
import SpotPriceSection from '@/components/SpotPriceSection'
import GenerationMixSection from '@/components/GenerationMixSection'
import RenewablePriceSection from '@/components/RenewablePriceSection'
import SummarySection, { type SummaryStats } from '@/components/SummarySection'
import { pivotQuantiles, type QuantileRecord } from '@/lib/dataUtils'
import { toShareData, type GenerationRecord } from '@/lib/generationUtils'
import type { SolarWindPriceRecord } from '@/lib/solarWindPriceUtils'

export default function Home() {
  const spotRaw = fs.readFileSync(
    path.join(process.cwd(), '..', 'data', 'spot_quantiles.json'),
    'utf-8',
  )
  const spotJson: { meta: { last_updated: string }; data: QuantileRecord[] } = JSON.parse(spotRaw)
  const chartData = pivotQuantiles(spotJson.data, 365)
  const lastUpdated = new Date(spotJson.meta.last_updated).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

  const genRaw = fs.readFileSync(
    path.join(process.cwd(), '..', 'data', 'generation_mix.json'),
    'utf-8',
  )
  const genJson: { meta: { last_updated: string }; data: GenerationRecord[] } = JSON.parse(genRaw)
  const genMixData = toShareData(genJson.data)
  const genLastUpdated = new Date(genJson.meta.last_updated).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

  const genHourlyRaw = fs.readFileSync(
    path.join(process.cwd(), '..', 'data', 'generation_mix_hourly.json'),
    'utf-8',
  )
  const genHourlyJson: { data: GenerationRecord[] } = JSON.parse(genHourlyRaw)
  const hourlyMixData = toShareData(genHourlyJson.data)

  const swpHourlyRaw = fs.readFileSync(
    path.join(process.cwd(), '..', 'data', 'solar_wind_price_hourly.json'),
    'utf-8',
  )
  const swpHourlyJson: { meta: { last_updated: string }; data: SolarWindPriceRecord[] } = JSON.parse(swpHourlyRaw)
  const swpLastUpdated = new Date(swpHourlyJson.meta.last_updated).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

  // Compute summary stats from hourly data
  const swpHourly = swpHourlyJson.data
  const avg = (arr: number[]) => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null
  const last7d  = swpHourly.slice(-168)
  const last30d = swpHourly.slice(-720)
  const latest  = swpHourly.at(-1)
  const latestPriceTime = latest?.date
    ? new Date(latest.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ', ' +
      new Date(latest.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    : '—'

  // Renewables share from daily gen mix (last 30 daily rows)
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

  const swpDailyRaw = fs.readFileSync(
    path.join(process.cwd(), '..', 'data', 'solar_wind_price_daily.json'),
    'utf-8',
  )
  const swpDailyJson: { data: SolarWindPriceRecord[] } = JSON.parse(swpDailyRaw)

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
            Energy Procurement Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            German power market · Public data · Updated daily
          </p>
        </div>

        <SummarySection stats={summaryStats} />

        <SpotPriceSection data={chartData} lastUpdated={lastUpdated} />

        <div className="mt-6">
          <GenerationMixSection daily={genMixData} hourly={hourlyMixData} lastUpdated={genLastUpdated} />
        </div>

        <div className="mt-6">
          <RenewablePriceSection
            hourly={swpHourlyJson.data}
            daily={swpDailyJson.data}
            lastUpdated={swpLastUpdated}
          />
        </div>
      </div>
    </main>
  )
}
