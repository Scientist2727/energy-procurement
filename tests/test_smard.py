"""Smoke tests for the SMARD fetcher (HTTP mocked via responses)."""
from __future__ import annotations

from datetime import datetime, timezone

import pandas as pd
import pytest
import responses as rsps

from pipeline.fetchers.smard import SmardClient, fetch_all_smard

START = datetime(2021, 1, 1, tzinfo=timezone.utc)
END   = datetime(2021, 1, 2, tzinfo=timezone.utc)

# Millisecond timestamps used in mock payloads
TS_0 = 1609459200000  # 2021-01-01 00:00 UTC
TS_1 = TS_0 + 3_600_000  # 2021-01-01 01:00 UTC

_BASE = "https://www.smard.de/app/chart_data"


def _index_url(fid: str, region: str) -> str:
    return f"{_BASE}/{fid}/{region}/index_hour.json"


def _slice_url(fid: str, region: str, ts: int) -> str:
    return f"{_BASE}/{fid}/{region}/{fid}_{region}_hour_{ts}.json"


@rsps.activate
def test_fetch_series_returns_correct_shape():
    fid, region = "4169", "DE"
    rsps.add(rsps.GET, _index_url(fid, region), json={"timestamps": [TS_0]})
    rsps.add(
        rsps.GET,
        _slice_url(fid, region, TS_0),
        json={"series": [[TS_0, 50.0], [TS_1, 55.0]]},
    )

    client = SmardClient(request_delay=0.0)
    df = client.fetch_series(fid, region, "price", start_utc=START, end_utc=END)

    assert isinstance(df, pd.DataFrame)
    assert list(df.columns) == ["timestamp_utc", "price"]
    assert len(df) == 2
    assert df["price"].tolist() == [50.0, 55.0]


@rsps.activate
def test_fetch_series_drops_nulls():
    fid, region = "4169", "DE"
    rsps.add(rsps.GET, _index_url(fid, region), json={"timestamps": [TS_0]})
    rsps.add(
        rsps.GET,
        _slice_url(fid, region, TS_0),
        json={"series": [[TS_0, None], [TS_1, 42.0]]},
    )

    client = SmardClient(request_delay=0.0)
    df = client.fetch_series(fid, region, "price", start_utc=START, end_utc=END)

    assert len(df) == 1
    assert df["price"].iloc[0] == 42.0


@rsps.activate
def test_fetch_series_clamps_to_window():
    fid, region = "4169", "DE"
    ts_outside = TS_0 - 7_200_000  # two hours before START
    rsps.add(rsps.GET, _index_url(fid, region), json={"timestamps": [TS_0]})
    rsps.add(
        rsps.GET,
        _slice_url(fid, region, TS_0),
        json={"series": [[ts_outside, 99.0], [TS_0, 10.0]]},
    )

    client = SmardClient(request_delay=0.0)
    df = client.fetch_series(fid, region, "price", start_utc=START, end_utc=END)

    assert all(df["timestamp_utc"] >= pd.Timestamp(START))


@rsps.activate
def test_fetch_series_retries_on_error(mocker):
    fid, region = "4169", "DE"
    rsps.add(rsps.GET, _index_url(fid, region), json={"timestamps": [TS_0]})
    # First call fails, second succeeds
    rsps.add(rsps.GET, _slice_url(fid, region, TS_0), body=Exception("network error"))
    rsps.add(
        rsps.GET,
        _slice_url(fid, region, TS_0),
        json={"series": [[TS_0, 50.0]]},
    )

    sleep_mock = mocker.patch("pipeline.fetchers.smard.time.sleep")
    client = SmardClient(retry_count=3, retry_delay=0.0, request_delay=0.0)
    df = client.fetch_series(fid, region, "price", start_utc=START, end_utc=END)

    assert len(df) == 1
    # sleep was called for the retry
    assert sleep_mock.call_count >= 1


@rsps.activate
def test_fetch_all_smard_adds_renewables_col(mocker):
    """fetch_all_smard must produce a renewables_mw column."""
    # Use a minimal FILTERS dict to keep the test fast
    minimal_filters = {
        "DA_wholesale_price_eur_mwh": ("4169", "DE"),
        "solar_generation_mw":        ("4068", "DE-LU"),
    }

    def _mock_fetch_series(self, fid, region, colname, start_utc=None, end_utc=None):
        ts = pd.Timestamp("2021-01-01", tz="UTC")
        return pd.DataFrame({"timestamp_utc": [ts], colname: [100.0]})

    mocker.patch(
        "pipeline.fetchers.smard.SmardClient.fetch_series",
        new=_mock_fetch_series,
    )

    df = fetch_all_smard(start_utc=START, end_utc=END, filters=minimal_filters)

    assert "renewables_mw" in df.columns
    # solar_generation_mw (100) is the only renewable present → renewables_mw == 100
    assert df["renewables_mw"].iloc[0] == 100.0
