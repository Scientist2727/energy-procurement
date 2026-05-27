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
from pipeline.fetchers.smard import DEFAULT_END_UTC, DEFAULT_START_UTC, fetch_all_smard
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
    """Return SMARD DataFrame from parquet cache, or fetch and cache if absent."""
    if SMARD_PARQUET.exists():
        logger.info("Loading SMARD data from cache: %s", SMARD_PARQUET)
        return pd.read_parquet(SMARD_PARQUET)

    logger.info("No cache found — fetching SMARD data from API ...")
    df = fetch_all_smard(start_utc=DEFAULT_START_UTC, end_utc=DEFAULT_END_UTC)
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    df.to_parquet(SMARD_PARQUET, index=False)
    logger.info("Cached %d rows to %s", len(df), SMARD_PARQUET)
    return df


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
    entsoe_prices = fetch_day_ahead_prices(DEFAULT_START_UTC, DEFAULT_END_UTC)
    if entsoe_prices is not None:
        out_path = RAW_DIR / "entsoe_prices.parquet"
        RAW_DIR.mkdir(parents=True, exist_ok=True)
        entsoe_prices.to_parquet(out_path, index=False)
        logger.info("Cached ENTSO-E prices to %s", out_path)

    write_spot_quantiles(df)
    write_capture_prices(df)
    write_yoy_overlay(df)

    logger.info("Pipeline complete. JSON files written to %s/", DATA_DIR)


if __name__ == "__main__":
    main()
