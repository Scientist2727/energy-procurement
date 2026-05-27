"""Year-over-year overlay reshaping."""
from __future__ import annotations

import pandas as pd


def compute_yoy_overlay(
    df: pd.DataFrame,
    value_col: str,
    years_back: int = 4,
) -> pd.DataFrame:
    """Reshape a time series so that the x-axis is day-of-year and each year is a column.

    Resamples to daily averages first so the output stays manageable regardless
    of input resolution.

    Args:
        df: DataFrame containing ``timestamp_utc`` and ``value_col``.
        value_col: Name of the column to reshape.
        years_back: How many years before the final year in the data to include.
                    ``years_back=4`` yields 5 years total.

    Returns:
        Long-format DataFrame with columns: ``day_of_year``, ``year``, ``value``
    """
    series = df.set_index("timestamp_utc")[value_col].sort_index()

    end_year = series.index.max().year
    start_year = end_year - years_back

    series = series[series.index.year >= start_year]
    daily = series.resample("D").mean()

    records: list[dict] = []
    for ts, val in daily.items():
        if pd.notna(val):
            records.append({
                "day_of_year": ts.timetuple().tm_yday,
                "year": ts.year,
                "value": float(val),
            })

    return pd.DataFrame(records)
