"""Volume-weighted capture price computation for solar and wind assets."""
from __future__ import annotations

import pandas as pd

_PRICE_COL = "DA_wholesale_price_eur_mwh"

_ASSET_VOL_COLS: dict[str, str] = {
    "solar":        "solar_generation_mw",
    "wind_onshore": "wind_onshore_generation_mw",
    "wind_offshore": "wind_offshore_generation_mw",
}


def compute_capture_prices(
    df: pd.DataFrame,
    freq: str = "ME",
) -> pd.DataFrame:
    """Compute monthly volume-weighted capture prices for solar, wind, and combined renewables.

    Capture price = sum(price * volume) / sum(volume) for each asset within the period.
    Also returns the simple-average baseload reference and the capture rate
    (capture_price / baseload * 100 %).

    Args:
        df: DataFrame containing ``timestamp_utc``, ``DA_wholesale_price_eur_mwh``,
            and the three generation columns.
        freq: Pandas resample frequency string. Defaults to ``"ME"`` (month-end).

    Returns:
        Long-format DataFrame with columns:
            ``period``, ``asset``, ``capture_price_eur_mwh``,
            ``baseload_eur_mwh``, ``capture_rate_pct``
    """
    required = [_PRICE_COL] + list(_ASSET_VOL_COLS.values())
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"Missing columns: {missing}")

    work = (
        df[["timestamp_utc"] + required]
        .copy()
        .set_index("timestamp_utc")
        .sort_index()
    )

    records: list[dict] = []

    for period, group in work.resample(freq):
        price = group[_PRICE_COL]
        baseload = price.mean()

        for asset, vol_col in _ASSET_VOL_COLS.items():
            volume = group[vol_col].clip(lower=0)
            total_vol = volume.sum()
            if total_vol > 0:
                capture_price = float((price * volume).sum() / total_vol)
            else:
                capture_price = float("nan")

            records.append({
                "period": period,
                "asset": asset,
                "capture_price_eur_mwh": capture_price,
                "baseload_eur_mwh": float(baseload),
                "capture_rate_pct": (capture_price / baseload * 100)
                                    if baseload and baseload != 0 else float("nan"),
            })

        # Combined: all three assets pooled
        combined_vol = sum(group[c].clip(lower=0) for c in _ASSET_VOL_COLS.values())
        total_combined = combined_vol.sum()
        if total_combined > 0:
            combined_capture = float((price * combined_vol).sum() / total_combined)
        else:
            combined_capture = float("nan")

        records.append({
            "period": period,
            "asset": "combined_renewables",
            "capture_price_eur_mwh": combined_capture,
            "baseload_eur_mwh": float(baseload),
            "capture_rate_pct": (combined_capture / baseload * 100)
                                if baseload and baseload != 0 else float("nan"),
        })

    return pd.DataFrame(records)
