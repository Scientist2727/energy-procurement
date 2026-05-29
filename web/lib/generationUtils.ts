export interface GenerationRecord {
  date: string
  solar_generation_mw: number
  wind_offshore_generation_mw: number
  wind_onshore_generation_mw: number
  biomass_generation_mw: number
  hydro_generation_mw: number
  other_renewable_generation_mw: number
  nuclear_generation_mw: number
  lignite_generation_mw: number
  hard_coal_generation_mw: number
  natural_gas_generation_mw: number
  other_conventional_generation_mw: number
}

export const TECH_CONFIG = [
  // Rendered bottom → top in the stack
  { key: 'solar',             srcKey: 'solar_generation_mw',              label: 'Solar',              color: '#fbbf24' },
  { key: 'wind_offshore',     srcKey: 'wind_offshore_generation_mw',      label: 'Wind Offshore',      color: '#1e40af' },
  { key: 'wind_onshore',      srcKey: 'wind_onshore_generation_mw',       label: 'Wind Onshore',       color: '#60a5fa' },
  { key: 'biomass',           srcKey: 'biomass_generation_mw',            label: 'Biomass',            color: '#16a34a' },
  { key: 'hydro',             srcKey: 'hydro_generation_mw',              label: 'Hydro',              color: '#06b6d4' },
  { key: 'other_renewable',   srcKey: 'other_renewable_generation_mw',    label: 'Other Renewables',   color: '#84cc16' },
  { key: 'nuclear',           srcKey: 'nuclear_generation_mw',            label: 'Nuclear',            color: '#a855f7' },
  { key: 'lignite',           srcKey: 'lignite_generation_mw',            label: 'Lignite',            color: '#92400e' },
  { key: 'hard_coal',         srcKey: 'hard_coal_generation_mw',          label: 'Hard Coal',          color: '#78716c' },
  { key: 'natural_gas',       srcKey: 'natural_gas_generation_mw',        label: 'Natural Gas',        color: '#fb923c' },
  { key: 'other_conventional', srcKey: 'other_conventional_generation_mw', label: 'Other Conv.',       color: '#374151' },
] as const

export type TechKey = typeof TECH_CONFIG[number]['key']

// Each record: percentage share per tech (dataKeys for Recharts) +
// underscore-prefixed absolute MW values (accessed only via tooltip payload)
export interface DailyGenMix {
  date: string
  solar: number;        wind_offshore: number; wind_onshore: number
  biomass: number;      hydro: number;         other_renewable: number
  nuclear: number;      lignite: number;       hard_coal: number
  natural_gas: number;  other_conventional: number
  _total_mw: number
  _solar_mw: number;        _wind_offshore_mw: number; _wind_onshore_mw: number
  _biomass_mw: number;      _hydro_mw: number;         _other_renewable_mw: number
  _nuclear_mw: number;      _lignite_mw: number;       _hard_coal_mw: number
  _natural_gas_mw: number;  _other_conventional_mw: number
}

export function toShareData(records: GenerationRecord[]): DailyGenMix[] {
  return records.map((r) => {
    const total = TECH_CONFIG.reduce(
      (s, t) => s + Math.max(0, r[t.srcKey as keyof GenerationRecord] as number || 0),
      0,
    )
    const pct = (v: number) => total > 0 ? Math.round(Math.max(0, v) / total * 1000) / 10 : 0

    return {
      date: r.date,
      solar:              pct(r.solar_generation_mw),
      wind_offshore:      pct(r.wind_offshore_generation_mw),
      wind_onshore:       pct(r.wind_onshore_generation_mw),
      biomass:            pct(r.biomass_generation_mw),
      hydro:              pct(r.hydro_generation_mw),
      other_renewable:    pct(r.other_renewable_generation_mw),
      nuclear:            pct(r.nuclear_generation_mw),
      lignite:            pct(r.lignite_generation_mw),
      hard_coal:          pct(r.hard_coal_generation_mw),
      natural_gas:        pct(r.natural_gas_generation_mw),
      other_conventional: pct(r.other_conventional_generation_mw),
      _total_mw:              Math.round(total),
      _solar_mw:              Math.round(r.solar_generation_mw || 0),
      _wind_offshore_mw:      Math.round(r.wind_offshore_generation_mw || 0),
      _wind_onshore_mw:       Math.round(r.wind_onshore_generation_mw || 0),
      _biomass_mw:            Math.round(r.biomass_generation_mw || 0),
      _hydro_mw:              Math.round(r.hydro_generation_mw || 0),
      _other_renewable_mw:    Math.round(r.other_renewable_generation_mw || 0),
      _nuclear_mw:            Math.round(r.nuclear_generation_mw || 0),
      _lignite_mw:            Math.round(r.lignite_generation_mw || 0),
      _hard_coal_mw:          Math.round(r.hard_coal_generation_mw || 0),
      _natural_gas_mw:        Math.round(r.natural_gas_generation_mw || 0),
      _other_conventional_mw: Math.round(r.other_conventional_generation_mw || 0),
    }
  })
}
