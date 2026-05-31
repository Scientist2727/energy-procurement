export const dynamic = 'force-dynamic'

import fs from 'fs'
import path from 'path'
import SpotPriceSection from '@/components/SpotPriceSection'
import GenerationMixSection from '@/components/GenerationMixSection'
import RenewablePriceSection from '@/components/RenewablePriceSection'
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
