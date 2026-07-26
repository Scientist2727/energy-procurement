// Server component — no 'use client' needed, all values pre-computed

type PriceBand = 'negative' | 'very_low' | 'low' | 'normal' | 'elevated' | 'high'

export interface MarketBriefProps {
  currentPrice: number | null
  p10: number; p25: number; p50: number; p75: number; p90: number
  renewablesShare30d: number | null
  negativeHours30d: number
  totalHours30d: number
  avg30dPrice: number | null
}

function priceBand(price: number, p10: number, p25: number, p75: number, p90: number): PriceBand {
  if (price < 0)   return 'negative'
  if (price < p10) return 'very_low'
  if (price < p25) return 'low'
  if (price < p75) return 'normal'
  if (price < p90) return 'elevated'
  return 'high'
}

const BAND_STYLE: Record<PriceBand, { bg: string; border: string; dot: string; label: string; text: string }> = {
  negative: { bg: 'bg-red-50',    border: 'border-red-200',    dot: 'bg-red-500',    label: 'Negative',   text: 'text-red-700' },
  very_low: { bg: 'bg-green-50',  border: 'border-green-200',  dot: 'bg-green-500',  label: 'Very Low',   text: 'text-green-700' },
  low:      { bg: 'bg-green-50',  border: 'border-green-200',  dot: 'bg-green-400',  label: 'Low',        text: 'text-green-700' },
  normal:   { bg: 'bg-slate-50',  border: 'border-slate-200',  dot: 'bg-slate-400',  label: 'Normal',     text: 'text-slate-700' },
  elevated: { bg: 'bg-orange-50', border: 'border-orange-200', dot: 'bg-orange-400', label: 'Elevated',   text: 'text-orange-700' },
  high:     { bg: 'bg-red-50',    border: 'border-red-200',    dot: 'bg-red-500',    label: 'High',       text: 'text-red-700' },
}

function brief(
  price: number, band: PriceBand,
  p25: number, p50: number, p75: number,
  renewables: number | null,
  negPct: number,
  avg30d: number | null,
): string {
  const parts: string[] = []

  // Price context
  if (band === 'negative') {
    parts.push(`DA price is negative at ${price.toFixed(1)} €/MWh — flexible loads should be running now.`)
  } else if (band === 'very_low' || band === 'low') {
    const below = ((p50 - price) / p50 * 100).toFixed(0)
    parts.push(`DA price of ${price.toFixed(1)} €/MWh is ${below}% below the 12-month median — favourable buying conditions.`)
  } else if (band === 'elevated' || band === 'high') {
    const above = ((price - p50) / p50 * 100).toFixed(0)
    parts.push(`DA price of ${price.toFixed(1)} €/MWh is ${above}% above the 12-month median — consider deferring flexible consumption.`)
  } else {
    parts.push(`DA price of ${price.toFixed(1)} €/MWh is in the normal range (12-month median: ${p50.toFixed(0)} €/MWh).`)
  }

  // Renewables context
  if (renewables != null) {
    if (renewables > 65) {
      parts.push(`Renewables are providing ${renewables.toFixed(0)}% of generation — elevated RE share is compressing prices.`)
    } else if (renewables < 35) {
      parts.push(`Renewables share is low at ${renewables.toFixed(0)}% — conventional generation is driving the current price level.`)
    } else {
      parts.push(`Renewables share: ${renewables.toFixed(0)}% over the last 30 days.`)
    }
  }

  // Negative price frequency
  if (negPct > 10) {
    parts.push(`${negPct.toFixed(1)}% of hours in the past 30 days were negative — significant curtailment pressure.`)
  }

  return parts.join(' ')
}

export default function MarketBrief({
  currentPrice, p10, p25, p50, p75, p90,
  renewablesShare30d, negativeHours30d, totalHours30d, avg30dPrice,
}: MarketBriefProps) {
  if (currentPrice == null) return null

  const band = priceBand(currentPrice, p10, p25, p75, p90)
  const style = BAND_STYLE[band]
  const negPct = totalHours30d > 0 ? (negativeHours30d / totalHours30d) * 100 : 0
  const briefText = brief(currentPrice, band, p25, p50, p75, renewablesShare30d, negPct, avg30dPrice)

  return (
    <div className={`rounded-xl border ${style.bg} ${style.border} px-5 py-4 mb-6 flex flex-col sm:flex-row sm:items-center gap-3`}>
      <div className="flex items-center gap-2.5 shrink-0">
        <span className={`w-2.5 h-2.5 rounded-full ${style.dot}`} />
        <span className={`text-xs font-bold uppercase tracking-widest ${style.text}`}>
          Market Signal
        </span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${style.border} ${style.text}`}>
          {style.label}
        </span>
      </div>
      <p className="text-xs text-gray-600 leading-relaxed">{briefText}</p>
    </div>
  )
}
