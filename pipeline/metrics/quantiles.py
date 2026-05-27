"""Rolling price quantile bands."""
from __future__ import annotations

import pandas as pd


def compute_price_quantiles(
    df: pd.DataFrame,
    value_col: str = "DA_wholesale_price_eur_mwh",
    windows: tuple[int, ...] = (30, 365),
) -> pd.DataFrame:
    """Compute rolling price quantiles at hourly resolution.

    For each window in ``windows`` (days) and each quantile in
    [p10, p25, p50, p75, p90], slides a rolling window over the series.

    Returns a long-format DataFrame with columns:
        ``timestamp_utc``, ``window_days``, ``quantile``, ``value``
    """
    quantile_levels = [0.10, 0.25, 0.50, 0.75, 0.90]
    series = df.set_index("timestamp_utc")[value_col].sort_index()

    frames: list[pd.DataFrame] = []
    for window_days in windows:
        window_hours = window_days * 24
        for q in quantile_levels:
            rolled = series.rolling(window=window_hours, min_periods=1).quantile(q)
            frame = rolled.dropna().rename("value").reset_index()
            frame["window_days"] = window_days
            frame["quantile"] = q
            frames.append(frame)

    return pd.concat(frames, ignore_index=True)[
        ["timestamp_utc", "window_days", "quantile", "value"]
    ]
