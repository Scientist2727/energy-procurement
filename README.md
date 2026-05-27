# Energy Procurement Dashboard — Data Pipeline

Daily-updated data pipeline for German power market analytics. Fetches public data from SMARD.de and ENTSO-E, computes derived metrics, and writes JSON files consumed by the frontend.

## Setup

### Prerequisites

- Python 3.11+
- [uv](https://docs.astral.sh/uv/) package manager

### Install

```bash
uv sync --extra dev
cp .env.example .env
# Set ENTSOE_API_KEY in .env if you have one (optional)
```

### Run

```bash
uv run python pipeline/run.py
```

Fetches SMARD data (or loads from `data/raw/smard_raw.parquet` cache on re-runs), computes all metrics, and writes three JSON files to `data/`.

To force a fresh fetch, delete `data/raw/smard_raw.parquet`.

### Tests

```bash
uv run pytest
```

---

## Output File Schemas

### `data/spot_quantiles.json`

Rolling p10/p25/p50/p75/p90 bands for the DA spot price over the last 365 days at hourly resolution.

```json
{
  "meta": {
    "last_updated": "2025-01-01T00:00:00+00:00",
    "source": "SMARD.de",
    "units": "EUR/MWh",
    "description": "..."
  },
  "data": [
    {"timestamp_utc": "2024-12-31T23:00:00Z", "window_days": 30, "quantile": 0.5, "value": 85.4},
    ...
  ]
}
```

### `data/capture_prices.json`

Monthly volume-weighted capture prices for solar, wind onshore, wind offshore, and combined renewables. Includes baseload reference and capture rate.

```json
{
  "meta": {...},
  "data": [
    {
      "period": "2024-01-31T00:00:00Z",
      "asset": "solar",
      "capture_price_eur_mwh": 72.1,
      "baseload_eur_mwh": 85.0,
      "capture_rate_pct": 84.8
    },
    ...
  ]
}
```

### `data/yoy_overlay.json`

DA spot price daily averages reshaped by day-of-year, last 5 years.

```json
{
  "meta": {...},
  "data": [
    {"day_of_year": 1, "year": 2024, "value": 78.5},
    ...
  ]
}
```

---

## Data Sources

| Source | Usage |
|---|---|
| [SMARD.de](https://www.smard.de) | Primary: DE day-ahead prices, generation by type, total load |
| [ENTSO-E Transparency Platform](https://transparency.entsoe.eu) | Optional: multi-country expansion (AT/FR/NL/IT) |

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ENTSOE_API_KEY` | No | ENTSO-E API key; pipeline runs without it using SMARD only |
