"""Main pipeline orchestrator.

Usage:
    uv run python pipeline/run.py

Fetches SMARD data (uses parquet cache on re-runs), computes three metric sets,
and writes JSON files to data/.
"""
from __future__ import annotations

import json
import logging
import sys
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
from dotenv import load_dotenv

from pipeline.fetchers.entsoe import fetch_day_ahead_prices
from pipeline.fetchers.smard import DEFAULT_START_UTC, fetch_all_smard
from pipeline.metrics.capture_prices import compute_capture_prices
from pipeline.metrics.quantiles import compute_price_quantiles
from pipeline.metrics.yoy import compute_yoy_overlay

load_dotenv()
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)

_ROOT     = Path(__file__).parent.parent
DATA_DIR  = _ROOT / "data"
RAW_DIR   = DATA_DIR / "raw"
SMARD_PARQUET = RAW_DIR / "smard_raw.parquet"


# ---------------------------------------------------------------------------
# Cache helpers
# ---------------------------------------------------------------------------

def _load_smard() -> pd.DataFrame:
    """Load SMARD data, fetching only what's new since the last cached run.

    First run: full fetch from DEFAULT_START_UTC to now (~20 min).
    Subsequent runs: fetch only from (cache_end - 7 days) to now, then
    merge and deduplicate — typically completes in under a minute.
    """
    RAW_DIR.mkdir(parents=True, exist_ok=True)

    if not SMARD_PARQUET.exists():
        logger.info("No cache found — performing full fetch from %s ...", DEFAULT_START_UTC.date())
        df = fetch_all_smard(start_utc=DEFAULT_START_UTC)
        df.to_parquet(SMARD_PARQUET, index=False)
        logger.info("Cached %d rows to %s", len(df), SMARD_PARQUET)
        return df

    cached = pd.read_parquet(SMARD_PARQUET)
    cache_end = cached["timestamp_utc"].max()
    now = pd.Timestamp("now", tz="UTC")

    if cache_end >= now - pd.Timedelta(hours=12):
        logger.info("Cache is fresh (ends %s) — skipping fetch", cache_end.date())
        return cached

    # Overlap by 7 days to catch any SMARD revisions to recent data
    incremental_start = (cache_end - pd.Timedelta(days=7)).to_pydatetime()
    logger.info(
        "Cache ends %s — fetching incremental update from %s ...",
        cache_end.date(), incremental_start.date(),
    )
    new_df = fetch_all_smard(start_utc=incremental_start)

    combined = (
        pd.concat([cached, new_df], ignore_index=True)
        .drop_duplicates("timestamp_utc")
        .sort_values("timestamp_utc")
        .reset_index(drop=True)
    )
    combined.to_parquet(SMARD_PARQUET, index=False)
    logger.info(
        "Updated cache: %d → %d rows (ends %s)",
        len(cached), len(combined), combined["timestamp_utc"].max().date(),
    )
    return combined


# ---------------------------------------------------------------------------
# JSON helpers
# ---------------------------------------------------------------------------

def _meta(source: str, units: str, description: str) -> dict:
    return {
        "last_updated": datetime.now(timezone.utc).isoformat(),
        "source": source,
        "units": units,
        "description": description,
    }


def _to_records(df: pd.DataFrame) -> list[dict]:
    """Serialise a DataFrame to a list of JSON-safe dicts."""
    return json.loads(df.to_json(orient="records", date_format="iso", default_handler=str))


def _write(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload, indent=2, default=str), encoding="utf-8")
    logger.info("Wrote %s", path)


# ---------------------------------------------------------------------------
# Output writers
# ---------------------------------------------------------------------------

def write_spot_quantiles(df: pd.DataFrame) -> None:
    """Write data/spot_quantiles.json — rolling quantile bands, last 365 days."""
    cutoff = df["timestamp_utc"].max() - pd.Timedelta(days=365)
    recent = df[df["timestamp_utc"] >= cutoff].copy()

    quantiles_df = compute_price_quantiles(recent, windows=(30, 365))

    _write(
        DATA_DIR / "spot_quantiles.json",
        {
            "meta": _meta(
                source="SMARD.de",
                units="EUR/MWh",
                description=(
                    "Rolling p10/p25/p50/p75/p90 bands for the DA spot price "
                    "over the last 365 days at hourly resolution."
                ),
            ),
            "data": _to_records(quantiles_df),
        },
    )
    logger.info("  → %d quantile records", len(quantiles_df))


def write_capture_prices(df: pd.DataFrame) -> None:
    """Write data/capture_prices.json — monthly capture prices, full history."""
    capture_df = compute_capture_prices(df)

    _write(
        DATA_DIR / "capture_prices.json",
        {
            "meta": _meta(
                source="SMARD.de",
                units="EUR/MWh, %",
                description=(
                    "Monthly volume-weighted capture prices for solar, wind onshore, "
                    "wind offshore, and combined renewables; includes baseload reference "
                    "and capture rate."
                ),
            ),
            "data": _to_records(capture_df),
        },
    )
    logger.info("  → %d capture-price records", len(capture_df))


_GEN_COLS = [
    "solar_generation_mw",
    "wind_offshore_generation_mw",
    "wind_onshore_generation_mw",
    "biomass_generation_mw",
    "hydro_generation_mw",
    "other_renewable_generation_mw",
    "nuclear_generation_mw",
    "lignite_generation_mw",
    "hard_coal_generation_mw",
    "natural_gas_generation_mw",
    "other_conventional_generation_mw",
]


def write_generation_mix(df: pd.DataFrame) -> None:
    """Write data/generation_mix.json — daily avg generation by technology, full history."""
    present = [c for c in _GEN_COLS if c in df.columns]

    daily = (
        df.set_index("timestamp_utc")[present]
        .sort_index()
        .clip(lower=0)
        .resample("D").mean()
        .round(1)
    )
    daily.index = daily.index.strftime("%Y-%m-%d")
    daily.index.name = "date"
    daily = daily.reset_index()

    _write(
        DATA_DIR / "generation_mix.json",
        {
            "meta": _meta(
                source="SMARD.de",
                units="MW (daily average)",
                description="Daily average electricity generation by technology for DE-LU.",
            ),
            "data": json.loads(daily.to_json(orient="records")),
        },
    )
    logger.info("  → %d generation mix records", len(daily))


def write_generation_mix_hourly(df: pd.DataFrame) -> None:
    """Write data/generation_mix_hourly.json — hourly generation by technology, last 90 days."""
    present = [c for c in _GEN_COLS if c in df.columns]
    cutoff = df["timestamp_utc"].max() - pd.Timedelta(days=90)
    recent = df[df["timestamp_utc"] >= cutoff]

    hourly = (
        recent.set_index("timestamp_utc")[present]
        .sort_index()
        .clip(lower=0)
        .resample("h").mean()
        .round(1)
    )
    hourly.index = hourly.index.strftime("%Y-%m-%dT%H:%M")
    hourly.index.name = "date"
    hourly = hourly.reset_index()

    _write(
        DATA_DIR / "generation_mix_hourly.json",
        {
            "meta": _meta(
                source="SMARD.de",
                units="MW (hourly average)",
                description="Hourly average electricity generation by technology for DE-LU, last 90 days.",
            ),
            "data": json.loads(hourly.to_json(orient="records")),
        },
    )
    logger.info("  → %d hourly generation mix records", len(hourly))


def write_yoy_overlay(df: pd.DataFrame) -> None:
    """Write data/yoy_overlay.json — spot price by day-of-year for last 5 years."""
    yoy_df = compute_yoy_overlay(df, value_col="DA_wholesale_price_eur_mwh", years_back=4)

    _write(
        DATA_DIR / "yoy_overlay.json",
        {
            "meta": _meta(
                source="SMARD.de",
                units="EUR/MWh",
                description=(
                    "DA spot price daily averages reshaped by day-of-year "
                    "for the last 5 years."
                ),
            ),
            "data": _to_records(yoy_df),
        },
    )
    logger.info("  → %d yoy records", len(yoy_df))


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    # Primary: SMARD
    df = _load_smard()
    logger.info("SMARD dataframe: %d rows × %d columns", len(df), len(df.columns))

    # Optional: ENTSO-E (cached if fetched)
    entsoe_prices = fetch_day_ahead_prices(DEFAULT_START_UTC)
    if entsoe_prices is not None:
        out_path = RAW_DIR / "entsoe_prices.parquet"
        RAW_DIR.mkdir(parents=True, exist_ok=True)
        entsoe_prices.to_parquet(out_path, index=False)
        logger.info("Cached ENTSO-E prices to %s", out_path)

    write_spot_quantiles(df)
    write_capture_prices(df)
    write_generation_mix(df)
    write_generation_mix_hourly(df)
    write_yoy_overlay(df)

    logger.info("Pipeline complete. JSON files written to %s/", DATA_DIR)


if __name__ == "__main__":
    main()
