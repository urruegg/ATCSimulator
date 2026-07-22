# ZRH cold-start fallback snapshot seed

| Field | Value |
| --- | --- |
| Product | ATCSimulator |
| Scope | Demo flight-data feed, public/non-personal data only |
| Related | [ADR-0008](../adr/ADR-0008-fr24-resilience-snapshots.md), [DATA.md §5.4](../DATA.md#54-flight-feed-resilience-contracts-sprint-3), issue #14 |

## Purpose

Use this runbook when a new environment has no FR24-derived fallback snapshot yet, or when the FR24 account is out of credit before the first successful live capture. The seed writes the same Parquet schema and paths as the live snapshot writer: `region=ch/latest.parquet` plus a dated archive under `region=ch/dt=YYYY-MM-DD/HH-mm-ss.parquet`.

The live seed source is the anonymous OpenSky Network public API for a Zurich TMA-sized bounding box. The checked-in fixture at `data/flight-feed/opensky-zrh-sample.json` supports deterministic tests and offline or air-gapped dry runs.

## Guardrails

- Public aircraft state only; no personal data (`CON-03`).
- No operational-ATC connectivity (`CON-01`).
- No secrets. Storage authentication uses the same managed identity / `DefaultAzureCredential` pattern as ADR-0008.
- Do not scrape `flightradar24.com`.

## Live ADLS seed

Run from the repository root after the flight-data API managed identity has `Storage Blob Data Contributor` on the snapshot storage account:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\seed-zrh-snapshot.ps1 `
  -AccountUrl "https://<storage-account>.dfs.core.windows.net" `
  -FileSystem "flight-snapshots" `
  -Region "ch"
```

The default OpenSky bounding box is `47.20,8.20,47.75,8.95`, covering LSZH arrivals/departures and the local TMA without expanding to all of Switzerland. Re-run is safe: `latest.parquet` is overwritten and a new dated archive is added.

## Offline fixture seed / dry run

To prove schema compatibility without network or Azure access:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\seed-zrh-snapshot.ps1 `
  -Fixture data\flight-feed\opensky-zrh-sample.json `
  -OutputDir artifacts\seed-dryrun `
  -CapturedAt 2026-07-22T09:00:00Z
```

Inspect `artifacts\seed-dryrun\region=ch\latest.parquet` or point local tooling at that directory. Do not commit generated artifacts.

## Validation

- `dotnet test tests/apis/AtcSim.FlightDataApi.Tests/AtcSim.FlightDataApi.Tests.csproj`
- For the seed task itself: `dotnet build scripts\seed\OpenSkySnapshotSeed\OpenSkySnapshotSeed.csproj`
- Optional dry run: command above should print `Seeded <n> aircraft ...` and create both `latest.parquet` and a dated archive.
