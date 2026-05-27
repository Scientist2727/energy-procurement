"""Unit tests for compute_price_quantiles."""
from __future__ import annotations

import pandas as pd
import pytest

from pipeline.metrics.quantiles import compute_price_quantiles

# 48 hourly rows of constant price 100 → all quantiles should equal 100
_CONSTANT_DF = pd.DataFrame({
    "timestamp_utc": pd.date_range("2021-01-01", periods=48, freq="h", tz="UTC"),
    "DA_wholesale_price_eur_mwh": [100.0] * 48,
})

# 10 hourly rows: values 1..10
_RAMP_DF = pd.DataFrame({
    "timestamp_utc": pd.date_range("2021-01-01", periods=10, freq="h", tz="UTC"),
    "DA_wholesale_price_eur_mwh": list(range(1, 11)),
})


def test_output_columns():
    result = compute_price_quantiles(_CONSTANT_DF, windows=(7,))
    assert set(result.columns) == {"timestamp_utc", "window_days", "quantile", "value"}


def test_constant_series_all_quantiles_equal_constant():
    result = compute_price_quantiles(_CONSTANT_DF, windows=(7,))
    assert (result["value"] == 100.0).all()


def test_expected_quantile_levels():
    result = compute_price_quantiles(_CONSTANT_DF, windows=(7,))
    assert set(result["quantile"].unique()) == {0.10, 0.25, 0.50, 0.75, 0.90}


def test_window_values_present():
    result = compute_price_quantiles(_RAMP_DF, windows=(1, 3))
    assert set(result["window_days"].unique()) == {1, 3}


def test_p50_of_ramp_with_full_window():
    # With window_days=1 (24 h) but only 10 rows, min_periods=1 means we get values
    # At the last row, rolling over all 10 values: p50 of [1..10] ≈ 5.5
    result = compute_price_quantiles(_RAMP_DF, windows=(1,))
    last_p50 = (
        result[result["quantile"] == 0.50]
        .sort_values("timestamp_utc")
        .iloc[-1]["value"]
    )
    assert abs(last_p50 - 5.5) < 0.5


def test_no_duplicate_timestamps_per_window_quantile():
    result = compute_price_quantiles(_CONSTANT_DF, windows=(7,))
    grouped = result.groupby(["window_days", "quantile"])
    for _, g in grouped:
        assert g["timestamp_utc"].nunique() == len(g), "duplicate timestamps found"


def test_custom_value_col():
    df = _CONSTANT_DF.rename(columns={"DA_wholesale_price_eur_mwh": "price"})
    result = compute_price_quantiles(df, value_col="price", windows=(7,))
    assert (result["value"] == 100.0).all()
