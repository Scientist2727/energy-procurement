"""Unit tests for compute_capture_prices."""
from __future__ import annotations

import math

import pandas as pd
import pytest

from pipeline.metrics.capture_prices import compute_capture_prices

_COLS = [
    "timestamp_utc",
    "DA_wholesale_price_eur_mwh",
    "solar_generation_mw",
    "wind_onshore_generation_mw",
    "wind_offshore_generation_mw",
]


def _make_df(prices, solar, wind_on, wind_off, start="2021-01-01", freq="h"):
    n = len(prices)
    return pd.DataFrame({
        "timestamp_utc":             pd.date_range(start, periods=n, freq=freq, tz="UTC"),
        "DA_wholesale_price_eur_mwh": prices,
        "solar_generation_mw":        solar,
        "wind_onshore_generation_mw": wind_on,
        "wind_offshore_generation_mw": wind_off,
    })


def test_output_columns():
    df = _make_df([100.0] * 24, [10.0] * 24, [0.0] * 24, [0.0] * 24)
    result = compute_capture_prices(df)
    assert set(result.columns) == {
        "period", "asset", "capture_price_eur_mwh", "baseload_eur_mwh", "capture_rate_pct"
    }


def test_constant_price_capture_equals_baseload():
    """If price is constant at 80, every asset's capture price == 80 and rate == 100%."""
    df = _make_df([80.0] * 720, [50.0] * 720, [100.0] * 720, [30.0] * 720)
    result = compute_capture_prices(df)
    for _, row in result.iterrows():
        if not math.isnan(row["capture_price_eur_mwh"]):
            assert abs(row["capture_price_eur_mwh"] - 80.0) < 1e-6
            assert abs(row["capture_rate_pct"] - 100.0) < 1e-6


def test_zero_volume_gives_nan():
    """An asset that never generates should have NaN capture price."""
    df = _make_df([100.0] * 720, [0.0] * 720, [50.0] * 720, [0.0] * 720)
    result = compute_capture_prices(df)
    solar_rows = result[result["asset"] == "solar"]
    assert all(math.isnan(v) for v in solar_rows["capture_price_eur_mwh"])


def test_volume_weighting():
    """Solar generates only when price==200; baseload is (100+200)/2==150.
    Capture price for solar must be 200, capture rate must be 200/150*100 ≈ 133.3%.
    """
    # 2 hours: price [100, 200], solar [0, 10]
    df = _make_df(
        prices=[100.0, 200.0],
        solar=[0.0, 10.0],
        wind_on=[5.0, 5.0],
        wind_off=[0.0, 0.0],
        start="2021-01-01",
        freq="h",
    )
    result = compute_capture_prices(df, freq="ME")
    solar_row = result[result["asset"] == "solar"].iloc[0]
    assert abs(solar_row["capture_price_eur_mwh"] - 200.0) < 1e-6
    assert abs(solar_row["baseload_eur_mwh"] - 150.0) < 1e-6
    assert abs(solar_row["capture_rate_pct"] - (200.0 / 150.0 * 100)) < 1e-4


def test_combined_renewables_present():
    df = _make_df([100.0] * 720, [50.0] * 720, [100.0] * 720, [30.0] * 720)
    result = compute_capture_prices(df)
    assert "combined_renewables" in result["asset"].values


def test_missing_column_raises():
    df = pd.DataFrame({
        "timestamp_utc": pd.date_range("2021-01-01", periods=2, freq="h", tz="UTC"),
        "DA_wholesale_price_eur_mwh": [100.0, 100.0],
    })
    with pytest.raises(ValueError, match="Missing columns"):
        compute_capture_prices(df)
