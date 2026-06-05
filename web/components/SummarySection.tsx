type StatCardProps = {
  label: string
  value: string
  valueColor?: string
  sub: string
  subColor?: string
}

function StatCard({ label, value, valueColor = 'text-gray-900', sub, subColor = 'text-gray-400' }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col gap-1">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-semibold tabular-nums ${valueColor}`}>{value}</p>
      <p className={`text-xs ${subColor}`}>{sub}</p>
    </div>
  )
}

export type SummaryStats = {
  latestPrice: number | null
  latestPriceTime: string
  avg7dPrice: number | null
  avg30dPrice: number | null
  renewablesShare30d: number | null
  negativeHours30d: number
  totalHours30d: number
}

function fmtPrice(v: number | null) {
  if (v == null) return '—'
  return `${v.toFixed(1)} €/MWh`
}

function priceDeltaLabel(current: number | null, reference: number | null): { text: string; color: string } {
  if (current == null || reference == null) return { text: '', color: 'text-gray-400' }
  const delta = current - reference
  const pct = (delta / Math.abs(reference)) * 100
  const sign = delta >= 0 ? '+' : ''
  const color = delta <= -5 ? 'text-green-600' : delta >= 5 ? 'text-red-500' : 'text-gray-400'
  return { text: `${sign}${pct.toFixed(1)}% vs 30d avg`, color }
}

export default function SummarySection({ stats }: { stats: SummaryStats }) {
  const { latestPrice, latestPriceTime, avg7dPrice, avg30dPrice, renewablesShare30d, negativeHours30d, totalHours30d } = stats

  const delta = priceDeltaLabel(avg7dPrice, avg30dPrice)
  const negPct = totalHours30d > 0 ? ((negativeHours30d / totalHours30d) * 100).toFixed(1) : '0'

  const latestColor = latestPrice != null && latestPrice < 0
    ? 'text-red-600'
    : latestPrice != null && avg30dPrice != null && latestPrice < avg30dPrice * 0.7
      ? 'text-green-600'
      : 'text-gray-900'

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <StatCard
        label="Latest DA Price"
        value={fmtPrice(latestPrice)}
        valueColor={latestColor}
        sub={`as of ${latestPriceTime}`}
      />
      <StatCard
        label="7-Day Avg Price"
        value={fmtPrice(avg7dPrice)}
        sub={delta.text}
        subColor={delta.color}
      />
      <StatCard
        label="Renewables Share"
        value={renewablesShare30d != null ? `${renewablesShare30d.toFixed(1)}%` : '—'}
        sub="solar · wind · bio · hydro · 30d avg"
      />
      <StatCard
        label="Negative Price Hours"
        value={`${negativeHours30d} h`}
        valueColor={negativeHours30d > 0 ? 'text-red-600' : 'text-gray-900'}
        sub={`${negPct}% of hours · last 30 days`}
        subColor={negativeHours30d > 0 ? 'text-red-400' : 'text-gray-400'}
      />
    </div>
  )
}
