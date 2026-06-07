"""Price duration curve computation — hourly prices ranked descending per year."""
from __future__ import annotations

import numpy as np
import pandas as pd

_PRICE_COL = "DA_wholesale_price_eur_mwh"
_N_POINTS = 200  # percentile samples per year


def compute_price_duration(df: pd.DataFrame, years_back: int = 4) -> pd.DataFrame:
    """Return a sampled price duration curve for each of the last N years.

    Each year's hourly prices are sorted descending and sampled at _N_POINTS
    evenly-spaced percentiles (0 % = highest price, 100 % = lowest price).

    Returns:
        DataFrame with columns: year (int), pct (float 0–100), price_eur_mwh (float)
    """
    work = df[["timestamp_utc", _PRICE_COL]].copy()
    work["timestamp_utc"] = pd.to_datetime(work["timestamp_utc"], utc=True)
    work["year"] = work["timestamp_utc"].dt.year

    current_year = int(work["year"].max())
    min_year = current_year - years_back
    work = work[work["year"] >= min_year]

    pct_axis = np.linspace(0, 100, _N_POINTS + 1)
    records: list[dict] = []

    for year, group in work.groupby("year"):
        prices = np.sort(group[_PRICE_COL].dropna().values)[::-1]  # descending
        n = len(prices)
        if n == 0:
            continue
        indices = np.clip((pct_axis / 100 * n).astype(int), 0, n - 1)
        for pct, idx in zip(pct_axis, indices):
            records.append({
                "year": int(year),
                "pct": round(float(pct), 1),
                "price_eur_mwh": round(float(prices[idx]), 2),
            })

    return pd.DataFrame(records)
