# FR24 Credit & Flight-Feed Resilience Runbook

| Field | Value |
| --- | --- |
| Product | ATCSimulator |
| Document | FR24 Credit & Flight-Feed Resilience Runbook |
| Type | Runbook |
| Version | 0.1 (Draft) |
| Date | 2026-07-21 |
| Author | ATCSimulator team |
| Status | Active |
| Classification | Public — anonymized demo |

**Related documents:** [poc-e2e-validation-runbook.md](./poc-e2e-validation-runbook.md) · [cicd-deployment-runbook.md](./cicd-deployment-runbook.md) · [../DATA.md](../DATA.md) §5.4 · [../adr/ADR-0008-fr24-resilience-snapshots.md](../adr/ADR-0008-fr24-resilience-snapshots.md) · [spec](../specs/2026-07-21-fr24-resilience-snapshot-persistence-design.md) · [../../api/openapi.yaml](../../api/openapi.yaml) · [../../infra/modules/storage.bicep](../../infra/modules/storage.bicep)

---

## Purpose

Keep the aircraft-selection demo working **at any time**, including when the
FlightRadar24 (FR24) API account has **no credit**. This runbook explains the
tri-state feed status, how the snapshot fallback keeps the demo alive, how to
top up FR24 credit, and how to inspect the ADLS Gen2 snapshot store.

Demo plane (Scope 2) only: public/synthetic flight positions, **no personal
data**, no operational-ATC connectivity (`CON-01`, `CON-03`).

## 1. What the footer feed status means

The footer ribbon shows a colored dot (left) driven by
`GET /api/flight-feed/status`, polled every 60 s.

| Color | State | Meaning | What the user sees |
| --- | --- | --- | --- |
| 🟢 Green | `connected` | FR24 reachable **and** has credit; live data streaming | Live aircraft; snapshot selector hidden |
| 🟡 Yellow | `no_credit` | FR24 reachable but **out of credit** (HTTP 402) | Latest saved snapshot served; snapshot selector shown |
| 🔴 Red | `offline` | Feed service unreachable (network / 429 / 5xx / auth) | Latest saved snapshot served if available; selector shown |

The tooltip shows detail (e.g. the snapshot capture time). When not green, a
searchable **snapshot selector** appears so the user can pick any of the last
10 saved snapshots as the simulation starting point.

## 2. How snapshots keep the demo alive

- **Snapshot-on-success:** every successful Switzerland-wide live load writes a
  Parquet snapshot to ADLS Gen2 (best-effort; a write failure never fails the
  live response).
- **Auto-fallback:** on FR24 **402** (credit exhausted) or any feed failure, the
  API transparently returns the **latest** snapshot as
  `{ "source": "snapshot", ... }` instead of erroring.
- **Cold-start seed (automatic):** on a **fresh** environment with no stored
  snapshot yet, the API serves a **bundled** public ZRH fixture
  (`Seed/opensky-zrh-cold-start.json`) as a `source: "snapshot"` response and
  best-effort persists it. So the demo works from the very first request without
  any manual seeding.
- **Result:** aircraft selection keeps working with the last-known traffic
  picture even with **zero** FR24 credit. `GET /api/aircraft` returns `503` only
  in the unlikely case that there is **no** stored snapshot **and** the bundled
  cold-start fixture is missing.

> To pre-seed a brand-new environment with **real** traffic, load the app once
> while FR24 has credit (or call
> `GET /api/aircraft?bounds=45.8,5.9,47.8,10.5`) so a live snapshot replaces the
> bundled cold-start seed.

## 3. How to top up / restore FR24 credit

1. Sign in to the FlightRadar24 API account (business/API portal) used by the
   demo. Credentials are held by the account owner (not in the repo).
2. Top up or renew the **data credit** / subscription for the API plan.
3. No redeploy is needed — the flight-data API re-probes FR24 on the next
   `/api/aircraft` call and the next 60 s status poll. The ribbon returns to
   🟢 green automatically once a live call succeeds.
4. The FR24 bearer token is injected as the `Fr24__ApiToken` app setting on the
   `flight-data-api` App Service by the CD pipeline; rotate it there if the
   token (not just the credit) changed.

## 4. How to inspect the ADLS Gen2 snapshot store

- **Account:** `StorageV2` with hierarchical namespace (ADLS Gen2), Sweden
  Central, container/filesystem **`flight-snapshots`**. The account name is
  deterministic (`atcsim st <token>`); find it via the SIT resource group or the
  `storageAccountName` output of `infra/main.bicep`.
- **Access:** Entra/managed identity only — **no account keys**
  (`allowSharedKeyAccess=false`). Grant yourself **Storage Blob Data Reader**
  (or Contributor) on the account to browse.
- **Path layout:** `region=ch/dt=<yyyy-MM-dd>/<HH-mm-ss>.parquet` (archive, kept
  indefinitely) plus an overwritable `latest` pointer. The snapshot **id** used
  by `?snapshot={id}` and `/api/flight-snapshots` is the archive path without
  the `region=<r>/` prefix and without the `.parquet` suffix
  (e.g. `dt=2026-07-21/10-30-05`).
- **Browse (CLI):**

  ```bash
  az storage fs file list \
    --account-name <storageAccountName> \
    --file-system flight-snapshots \
    --auth-mode login -o table
  ```

- **List via the API:** `GET /api/flight-snapshots` returns the last 10 snapshots
  as `[{ id, capturedAt }]`, newest first.
- **Schema:** one Parquet row per aircraft; see [DATA.md §5.4](../DATA.md) for the
  authoritative column list. `snapshotAt` is stored as UTC.

## 5. Verifying resilience (smoke test)

`scripts/verify-environment.ps1` treats a **snapshot** response as a **PASS**
(degraded but functional). The aircraft check parses the envelope and passes
when `source` is `live` **or** `snapshot`, failing only on an HTTP error or a
malformed envelope. So the CD pipeline stays green even when FR24 has no credit,
as long as at least one snapshot exists.

```powershell
pwsh ./scripts/verify-environment.ps1 `
  -WebUrl <web> -FlightApiUrl <flight> -VoiceApiUrl <voice>
```

Expect `PASS: aircraft feed serves live or snapshot data`.

## 6. Troubleshooting

| Symptom | Likely cause | Action |
| --- | --- | --- |
| Ribbon 🔴 red, `/api/aircraft` → 503 | No stored snapshot **and** bundled cold-start fixture missing | Confirm `Seed/opensky-zrh-cold-start.json` shipped in the deploy; load once with FR24 credit to seed a live snapshot (§2) |
| Ribbon 🟡 yellow persists after top-up | Credit added but cached state stale | Wait one status poll (≤60 s) or trigger a live `/api/aircraft` call |
| Ribbon 🔴 red but FR24 has credit | Token misconfigured / 401-403, or network | Check `Fr24__ApiToken` app setting; inspect flight-data-api logs |
| Snapshot writes not appearing | MI missing role on storage | Confirm **Storage Blob Data Contributor** on the flight-data MI (see storage.bicep) |
| Smoke test fails on aircraft check | True 500/unreachable API, not a credit issue | Check flight-data-api health and logs; this is a real outage |
