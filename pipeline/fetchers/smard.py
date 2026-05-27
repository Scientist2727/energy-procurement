"""SMARD.de chart data fetcher — day-ahead price, generation mix, and load for DE/DE-LU."""
from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional

import pandas as pd
import requests

logger = logging.getLogger(__name__)

BASE_URL = "https://www.smard.de/app/chart_data"
RESOLUTION = "hour"

# Filter IDs confirmed against SMARD documentation (May 2026)
FILTERS: dict[str, tuple[str, str]] = {
    "DA_wholesale_price_eur_mwh":        ("4169", "DE"),
    "load_mw":                           ("410",  "DE-LU"),
    "solar_generation_mw":               ("4068", "DE-LU"),
    "wind_onshore_generation_mw":        ("4067", "DE-LU"),
    "wind_offshore_generation_mw":       ("1225", "DE-LU"),
    "lignite_generation_mw":             ("1223", "DE-LU"),
    "hard_coal_generation_mw":           ("4069", "DE-LU"),
    "natural_gas_generation_mw":         ("4071", "DE-LU"),
    "nuclear_generation_mw":             ("1224", "DE-LU"),
    "residual_load_mw":                  ("4359", "DE-LU"),
    "hydro_generation_mw":               ("1226", "DE-LU"),
    "other_conventional_generation_mw":  ("1227", "DE-LU"),
    "other_renewable_generation_mw":     ("1228", "DE-LU"),
    "biomass_generation_mw":             ("4066", "DE-LU"),
    "pumped_storage_generation_mw":      ("4070", "DE-LU"),
}

# Columns that sum into renewables_mw (pumped storage excluded — it is dispatchable)
_RENEWABLE_COLS = [
    "solar_generation_mw",
    "wind_onshore_generation_mw",
    "wind_offshore_generation_mw",
    "biomass_generation_mw",
    "hydro_generation_mw",
    "other_renewable_generation_mw",
]

DEFAULT_START_UTC = datetime(2018, 1, 1, tzinfo=timezone.utc)
DEFAULT_END_UTC   = datetime(2025, 9, 30, tzinfo=timezone.utc)


@dataclass
class SmardClient:
    """HTTP client for the SMARD.de chart data API."""

    base_url: str = BASE_URL
    resolution: str = RESOLUTION
    retry_count: int = 3
    retry_delay: float = 0.8
    request_delay: float = 0.2

    def _get_available_timestamps(self, filter_id: str, region: str) -> list[int]:
        """Return the sorted list of slice timestamps available for a filter/region."""
        url = f"{self.base_url}/{filter_id}/{region}/index_{self.resolution}.json"
        r = requests.get(url, timeout=30)
        r.raise_for_status()
        return sorted(r.json()["timestamps"])

    def _fetch_slice(self, filter_id: str, region: str, ts_ms: int) -> list:
        """Download one time-slice and return its raw rows."""
        url = (
            f"{self.base_url}/{filter_id}/{region}/"
            f"{filter_id}_{region}_{self.resolution}_{ts_ms}.json"
        )
        r = requests.get(url, timeout=30)
        r.raise_for_status()
        js = r.json()
        # SMARD uses different top-level keys across series
        return js.get("series", js.get("data", js.get("chart_data"))) or js.get("values", [])

    def fetch_series(
        self,
        filter_id: str,
        region: str,
        colname: str,
        start_utc: datetime = DEFAULT_START_UTC,
        end_utc: datetime = DEFAULT_END_UTC,
    ) -> pd.DataFrame:
        """Fetch a single SMARD time series for the given filter, region, and window.

        Returns a DataFrame with columns ``timestamp_utc`` and ``colname``.
        Applies chunked downloading, a 3-retry policy per slice, and clamps to
        [start_utc, end_utc).
        """
        all_ts = self._get_available_timestamps(filter_id, region)
        start_ms = int(pd.Timestamp(start_utc).timestamp() * 1000)
        end_ms   = int(pd.Timestamp(end_utc).timestamp() * 1000)

        slice_ts = [ts for ts in all_ts if start_ms <= ts < end_ms]
        if not slice_ts:
            # Our start predates SMARD coverage — fall back to earliest available
            slice_ts = [min(all_ts)]

        rows: list = []
        for ts in slice_ts:
            chunk: list = []
            for attempt in range(self.retry_count):
                try:
                    chunk = self._fetch_slice(filter_id, region, ts)
                    break
                except Exception as exc:
                    if attempt == self.retry_count - 1:
                        logger.error(
                            "All %d retries exhausted for slice ts=%d (%s/%s): %s",
                            self.retry_count, ts, filter_id, region, exc,
                        )
                        raise
                    logger.warning(
                        "Retry %d/%d for slice ts=%d (%s/%s): %s",
                        attempt + 1, self.retry_count, ts, filter_id, region, exc,
                    )
                    time.sleep(self.retry_delay)
            if isinstance(chunk, list) and chunk and isinstance(chunk[0], list):
                rows.extend(chunk)
            time.sleep(self.request_delay)

        df = pd.DataFrame(rows, columns=["ts_ms", colname])
        df = df.dropna(subset=[colname])
        df["timestamp_utc"] = pd.to_datetime(df["ts_ms"], unit="ms", utc=True)

        df = df[
            (df["timestamp_utc"] >= pd.Timestamp(start_utc))
            & (df["timestamp_utc"] < pd.Timestamp(end_utc))
        ]

        df = (
            df[["timestamp_utc", colname]]
            .drop_duplicates("timestamp_utc")
            .sort_values("timestamp_utc")
            .reset_index(drop=True)
        )
        logger.info("Fetched %d rows for %s (%s/%s)", len(df), colname, filter_id, region)
        return df


def fetch_all_smard(
    start_utc: datetime = DEFAULT_START_UTC,
    end_utc: datetime = DEFAULT_END_UTC,
    filters: Optional[dict[str, tuple[str, str]]] = None,
) -> pd.DataFrame:
    """Fetch all configured SMARD series and merge into a single DataFrame.

    Series are merged with ``merge_asof`` on ``timestamp_utc`` (nearest match)
    to handle minor timestamp misalignments across filters.

    A ``renewables_mw`` column is appended: sum of solar, wind onshore,
    wind offshore, biomass, hydro, and other renewables (pumped storage excluded).
    """
    if filters is None:
        filters = FILTERS

    client = SmardClient()
    dfs: list[pd.DataFrame] = []

    for colname, (fid, region) in filters.items():
        logger.info("Fetching %s (filter=%s, region=%s) ...", colname, fid, region)
        dfs.append(client.fetch_series(fid, region, colname, start_utc=start_utc, end_utc=end_utc))

    merged = dfs[0]
    for d in dfs[1:]:
        merged = pd.merge_asof(
            merged.sort_values("timestamp_utc"),
            d.sort_values("timestamp_utc"),
            on="timestamp_utc",
            direction="nearest",
        )

    present_renewable_cols = [c for c in _RENEWABLE_COLS if c in merged.columns]
    merged["renewables_mw"] = merged[present_renewable_cols].sum(axis=1, skipna=True)

    logger.info(
        "SMARD merge complete: %d rows, %d columns", len(merged), len(merged.columns)
    )
    return merged
