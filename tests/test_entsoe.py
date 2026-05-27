"""Smoke tests for the ENTSO-E fetcher."""
from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

import pandas as pd
import pytest

from pipeline.fetchers.entsoe import (
    fetch_day_ahead_prices,
    fetch_generation_by_type,
    fetch_load,
)

START = datetime(2021, 1, 1, tzinfo=timezone.utc)
END   = datetime(2021, 1, 8, tzinfo=timezone.utc)

_MOCK_INDEX = pd.DatetimeIndex([
    pd.Timestamp("2021-01-01 00:00", tz="UTC"),
    pd.Timestamp("2021-01-01 01:00", tz="UTC"),
])


# ---------------------------------------------------------------------------
# No-key path: all functions must return None
# ---------------------------------------------------------------------------

def test_fetch_day_ahead_prices_no_key(monkeypatch):
    monkeypatch.delenv("ENTSOE_API_KEY", raising=False)
    assert fetch_day_ahead_prices(START, END) is None


def test_fetch_load_no_key(monkeypatch):
    monkeypatch.delenv("ENTSOE_API_KEY", raising=False)
    assert fetch_load(START, END) is None


def test_fetch_generation_by_type_no_key(monkeypatch):
    monkeypatch.delenv("ENTSOE_API_KEY", raising=False)
    assert fetch_generation_by_type(START, END) is None


# ---------------------------------------------------------------------------
# With-key path: results are well-formed DataFrames
# ---------------------------------------------------------------------------

def _mock_client(query_method: str, return_value) -> MagicMock:
    client = MagicMock()
    getattr(client, query_method).return_value = return_value
    return client


def test_fetch_day_ahead_prices_with_key(monkeypatch):
    monkeypatch.setenv("ENTSOE_API_KEY", "fake-key")
    mock_series = pd.Series([50.0, 55.0], index=_MOCK_INDEX)

    with patch("pipeline.fetchers.entsoe._get_client", return_value=_mock_client("query_day_ahead_prices", mock_series)):
        df = fetch_day_ahead_prices(START, END)

    assert df is not None
    assert list(df.columns) == ["timestamp_utc", "price_eur_mwh"]
    assert len(df) == 2
    assert df["price_eur_mwh"].tolist() == [50.0, 55.0]


def test_fetch_load_with_key(monkeypatch):
    monkeypatch.setenv("ENTSOE_API_KEY", "fake-key")
    mock_series = pd.Series([5000.0, 5100.0], index=_MOCK_INDEX)

    with patch("pipeline.fetchers.entsoe._get_client", return_value=_mock_client("query_load", mock_series)):
        df = fetch_load(START, END)

    assert df is not None
    assert list(df.columns) == ["timestamp_utc", "load_mw"]
    assert len(df) == 2


def test_fetch_generation_by_type_with_key(monkeypatch):
    monkeypatch.setenv("ENTSOE_API_KEY", "fake-key")
    mock_df = pd.DataFrame(
        {"Solar": [100.0, 200.0], "Wind Onshore": [300.0, 400.0]},
        index=_MOCK_INDEX,
    )
    mock_df.index.name = "timestamp"

    with patch("pipeline.fetchers.entsoe._get_client", return_value=_mock_client("query_generation", mock_df)):
        df = fetch_generation_by_type(START, END)

    assert df is not None
    assert "timestamp_utc" in df.columns
    assert len(df) == 2
