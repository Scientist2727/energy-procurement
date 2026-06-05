type StatCardProps = {
  label: string
  value: string
  valueColor?: string
  sub: string
  subColor?: string
  accent: string
}

function StatCard({ label, value, valueColor = 'text-gray-900', sub, subColor = 'text-gray-400', accent }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
      <div className={`h-1 w-full ${accent}`} />
      <div className="px-5 pt-4 pb-5 flex flex-col gap-1">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
        <p className={`text-2xl font-bold tabular-nums leading-tight ${valueColor}`}>{value}</p>
        <p className={`text-xs ${subColor}`}>{sub}</p>
      </div>
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

function priceDelta(current: number | null, reference: number | null): { text: string; color: string } {
  if (current == null || reference == null || reference === 0) return { text: '—', color: 'text-gray-400' }
  const pct = ((current - reference) / Math.abs(reference)) * 100
  const down = pct < 0
  const arrow = down ? '▼' : '▲'
  const color = down ? (pct <= -5 ? 'text-green-600' : 'text-gray-400') : (pct >= 5 ? 'text-red-500' : 'text-gray-400')
  return { text: `${arrow} ${Math.abs(pct).toFixed(1)}% vs 30d avg`, color }
}

export default function SummarySection({ stats }: { stats: SummaryStats }) {
  const { latestPrice, latestPriceTime, avg7dPrice, avg30dPrice, renewablesShare30d, negativeHours30d, totalHours30d } = stats

  const delta = priceDelta(avg7dPrice, avg30dPrice)
  const negPct = totalHours30d > 0 ? ((negativeHours30d / totalHours30d) * 100).toFixed(1) : '0'

  const latestColor = latestPrice == null ? 'text-gray-900'
    : latestPrice < 0 ? 'text-red-600'
    : (avg30dPrice != null && latestPrice < avg30dPrice * 0.7) ? 'text-green-600'
    : 'text-gray-900'

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <StatCard
        label="Latest DA Price"
        value={fmtPrice(latestPrice)}
        valueColor={latestColor}
        sub={`as of ${latestPriceTime}`}
        accent="bg-blue-500"
      />
      <StatCard
        label="7-Day Avg Price"
        value={fmtPrice(avg7dPrice)}
        sub={delta.text}
        subColor={delta.color}
        accent="bg-indigo-400"
      />
      <StatCard
        label="Renewables Share"
        value={renewablesShare30d != null ? `${renewablesShare30d.toFixed(1)}%` : '—'}
        sub="solar · wind · bio · hydro · 30d avg"
        accent="bg-green-500"
      />
      <StatCard
        label="Negative Price Hours"
        value={`${negativeHours30d} h`}
        valueColor={negativeHours30d > 0 ? 'text-red-600' : 'text-gray-900'}
        sub={`${negPct}% of hours · last 30 days`}
        subColor={negativeHours30d > 0 ? 'text-red-400' : 'text-gray-400'}
        accent={negativeHours30d > 0 ? 'bg-red-400' : 'bg-gray-200'}
      />
    </div>
  )
}
