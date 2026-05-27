"""Unit tests for compute_yoy_overlay."""
from __future__ import annotations

import pandas as pd
import pytest

from pipeline.metrics.yoy import compute_yoy_overlay


def _make_df(years: list[int], value: float = 50.0) -> pd.DataFrame:
    frames = []
    for year in years:
        idx = pd.date_range(f"{year}-01-01", f"{year}-12-31", freq="h", tz="UTC")
        frames.append(pd.DataFrame({"timestamp_utc": idx, "price": value}))
    return pd.concat(frames, ignore_index=True)


def test_output_columns():
    df = _make_df([2022, 2023])
    result = compute_yoy_overlay(df, value_col="price", years_back=1)
    assert set(result.columns) == {"day_of_year", "year", "value"}


def test_years_present():
    df = _make_df([2020, 2021, 2022, 2023, 2024])
    result = compute_yoy_overlay(df, value_col="price", years_back=4)
    assert set(result["year"].unique()) == {2020, 2021, 2022, 2023, 2024}


def test_no_years_beyond_years_back():
    df = _make_df([2019, 2020, 2021, 2022, 2023, 2024])
    result = compute_yoy_overlay(df, value_col="price", years_back=3)
    assert 2019 not in result["year"].values
    assert 2020 not in result["year"].values


def test_day_of_year_range():
    df = _make_df([2023, 2024])
    result = compute_yoy_overlay(df, value_col="price", years_back=1)
    assert result["day_of_year"].between(1, 366).all()


def test_constant_value_preserved():
    df = _make_df([2023, 2024], value=99.0)
    result = compute_yoy_overlay(df, value_col="price", years_back=1)
    assert (result["value"] == 99.0).all()


def test_daily_average_computed():
    """Two rows on the same day with different values → result is their mean."""
    df = pd.DataFrame({
        "timestamp_utc": [
            pd.Timestamp("2024-06-15 00:00", tz="UTC"),
            pd.Timestamp("2024-06-15 12:00", tz="UTC"),
        ],
        "price": [100.0, 200.0],
    })
    result = compute_yoy_overlay(df, value_col="price", years_back=0)
    assert len(result) == 1
    assert abs(result.iloc[0]["value"] - 150.0) < 1e-6
