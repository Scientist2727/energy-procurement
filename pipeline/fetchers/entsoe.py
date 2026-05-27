"""ENTSO-E Transparency Platform fetcher via entsoe-py.

Primary purpose: multi-country expansion (AT/FR/NL/IT basis charts).
SMARD is the primary source for DE; this module is additive.
Gracefully skips all fetches if ENTSOE_API_KEY is not set.
"""
from __future__ import annotations

import logging
import os
from datetime import datetime
from typing import Optional

import pandas as pd

logger = logging.getLogger(__name__)


def _get_client():
    """Return an entsoe-py PandasClient, or None if the key/library is unavailable."""
    api_key = os.getenv("ENTSOE_API_KEY")
    if not api_key:
        logger.warning("ENTSOE_API_KEY not set — skipping ENTSO-E fetch")
        return None
    try:
        from entsoe import EntsoePandasClient  # type: ignore[import]
        return EntsoePandasClient(api_key=api_key)
    except ImportError:
        logger.warning("entsoe-py not installed — skipping ENTSO-E fetch")
        return None


def _to_ts(dt: datetime) -> pd.Timestamp:
    """Convert a datetime to a UTC-aware pandas Timestamp."""
    ts = pd.Timestamp(dt)
    return ts.tz_localize("UTC") if ts.tzinfo is None else ts.tz_convert("UTC")


def fetch_day_ahead_prices(
    start: datetime,
    end: datetime,
    country: str = "DE_LU",
) -> Optional[pd.DataFrame]:
    """Fetch ENTSO-E day-ahead prices for a bidding zone.

    Returns a DataFrame with columns ``timestamp_utc``, ``price_eur_mwh``,
    or None if no API key is configured.
    """
    client = _get_client()
    if client is None:
        return None

    logger.info("Fetching ENTSO-E day-ahead prices for %s ...", country)
    series = client.query_day_ahead_prices(country, start=_to_ts(start), end=_to_ts(end))
    df = series.rename("price_eur_mwh").reset_index()
    df.columns = ["timestamp_utc", "price_eur_mwh"]
    df["timestamp_utc"] = pd.to_datetime(df["timestamp_utc"], utc=True)
    logger.info("Fetched %d ENTSO-E day-ahead price rows for %s", len(df), country)
    return df


def fetch_load(
    start: datetime,
    end: datetime,
    country: str = "DE",
) -> Optional[pd.DataFrame]:
    """Fetch ENTSO-E actual total load for a country.

    Returns a DataFrame with columns ``timestamp_utc``, ``load_mw``,
    or None if no API key is configured.
    """
    client = _get_client()
    if client is None:
        return None

    logger.info("Fetching ENTSO-E load for %s ...", country)
    series = client.query_load(country, start=_to_ts(start), end=_to_ts(end))
    df = series.rename("load_mw").reset_index()
    df.columns = ["timestamp_utc", "load_mw"]
    df["timestamp_utc"] = pd.to_datetime(df["timestamp_utc"], utc=True)
    logger.info("Fetched %d ENTSO-E load rows for %s", len(df), country)
    return df


def fetch_generation_by_type(
    start: datetime,
    end: datetime,
    country: str = "DE",
) -> Optional[pd.DataFrame]:
    """Fetch ENTSO-E actual generation by production type for a country.

    Returns a DataFrame with a ``timestamp_utc`` column plus one column per
    fuel type, or None if no API key is configured.
    """
    client = _get_client()
    if client is None:
        return None

    logger.info("Fetching ENTSO-E generation by type for %s ...", country)
    df = client.query_generation(country, start=_to_ts(start), end=_to_ts(end), psr_type=None)
    df = df.reset_index()
    # entsoe-py uses the datetime as the first column; normalise its name
    df = df.rename(columns={df.columns[0]: "timestamp_utc"})
    df["timestamp_utc"] = pd.to_datetime(df["timestamp_utc"], utc=True)
    logger.info("Fetched %d ENTSO-E generation rows for %s", len(df), country)
    return df
