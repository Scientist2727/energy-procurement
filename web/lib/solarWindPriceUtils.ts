export interface SolarWindPriceRecord {
  date: string
  solar_mw: number
  wind_onshore_mw: number
  wind_offshore_mw: number
  price_eur_mwh: number
  net_exports_mw: number
}
