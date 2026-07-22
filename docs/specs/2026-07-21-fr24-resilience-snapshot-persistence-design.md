# FR24 Resilience & Snapshot Persistence — Design

| Field | Value |
| --- | --- |
| Product | ATCSimulator |
| Document | FR24 Resilience & Snapshot Persistence — Design (Spec) |
| Type | Spec |
| Version | 0.1 (Draft) |
| Date | 2026-07-21 |
| Author | ATCSimulator team |
| Status | Draft for review |
| Sprint issue | [#10](https://github.com/urruegg/ATCSimulator/issues/10) |
| Classification | Public — anonymized demo |
| Subscription | `75102af9-fc92-45d4-99a8-5510a24b5421` (ME-MngEnvMCAP164444-urruegg-2) |
| Region | ADLS Gen2 → **Sweden Central** (matches the flight-data API; flight positions are non-personal public data) |

**Related documents:** [DATA.md](../DATA.md) · [SECURITY.md](../SECURITY.md) · [BOM.md](../BOM.md) · [SD.md](../SD.md) · [../../api/openapi.yaml](../../api/openapi.yaml) · Simulator scenarios design [2026-07-20](./2026-07-20-simulator-scenarios-efficient-flightload-design.md) · ZRH design [2026-07-16](./2026-07-16-zrh-realflight-ux-shared-platform-design.md) · [PoC E2E validation runbook](../runbooks/poc-e2e-validation-runbook.md)

---

## 1. Objective

The demo must run **at any time**, even when the FlightRadar24 (FR24) API account has **no credit**. Today `GET /api/aircraft` proxies FR24 live and only translates FR24 **429** → 503; any other upstream failure — notably FR24 **402 "Credit limit reached"** — surfaces as an opaque **500**, which broke the SIT post-deploy smoke test and blocked the pipeline.

This sprint makes the flight feed **resilient and observable**:

1. **Snapshot persistence** — every successful Switzerland-wide live load is written to **ADLS Gen2 as Parquet** (columnar, analytics-ready): a full timestamped archive kept indefinitely plus an overwritable `latest`.
2. **Graceful fallback** — when FR24 has no credit (402) or is unreachable, the API serves the **last-known snapshot** so aircraft selection still works. In fallback the user can pick among the **last 10** snapshots.
3. **Service status indicator** — the footer ribbon shows a tri-state flight-feed status: **green** (connected + credit), **yellow** (connected, no credits — showing snapshot), **red** (offline — showing snapshot / no data).

Demo plane only (Scope 2): public/synthetic flight positions, **no personal data**, **no operational-ATC connectivity** (`CON-01`, `CON-03`).

## 2. Approved decisions

| # | Decision | Choice |
| --- | --- | --- |
| D1 | Snapshot trigger | **Snapshot-on-success** — every successful Switzerland-wide live load writes a snapshot |
| D2 | Retention | **Keep all timestamped snapshots** indefinitely (historical-simulation reuse) **+** an overwritable `latest` |
| D3 | Fallback scope | **Auto-fallback to latest** on no-credit/offline **+** a selector limited to the **last 10** snapshots |
| D4 | Selector visibility | **Only in fallback** (yellow/red); defaults to latest; **hidden when green** |
| D5 | Status presentation | Footer ribbon **left**: colored dot + localized label (`Connected` / `No credits` / `Offline`) + hover tooltip with detail (e.g., snapshot time) |
| D6 | Storage format | **Parquet** (columnar) in ADLS Gen2, for future analytics |
| D7 | Architecture | **Extend `AtcSim.FlightDataApi`** (no new compute service); ADLS via **managed identity**; add `ISnapshotStore` + status provider |

## 3. Architecture

Extend the existing .NET 8 minimal-API `AtcSim.FlightDataApi`. No new compute service.

```text
                         ┌──────────────────────────── AtcSim.FlightDataApi ────────────────────────────┐
browser (SPA)  ──HTTP──▶ │  GET /api/aircraft ─┬─ live 200 ─▶ write snapshot (best-effort) ─▶ source=live │
  BottomRibbon           │                     ├─ FR24 402  ─▶ read latest ────────────────▶ source=snapshot (no_credit)
  useFlightData          │                     └─ 429/5xx/net ▶ read latest ────────────────▶ source=snapshot (offline)
  useFlightFeedStatus    │  GET /api/aircraft?snapshot={id} ─▶ read specific archived snapshot            │
                         │  GET /api/flight-snapshots?take=10 ─▶ list {id, snapshotAt}                    │
                         │  GET /api/flight-feed/status ─▶ {state, checkedAt, latestSnapshotAt}           │
                         │       └─ FR24 /api/usage (cheap, no data credit) + cached credit state         │
                         │  ISnapshotStore ─(Parquet.Net, Managed Identity)─▶ ADLS Gen2 (flight-snapshots)│
                         └──────────────────────────────────────────────────────────────────────────────┘
```

New units (each has one purpose, a narrow interface, and is independently testable):

| Unit | Purpose / interface |
| --- | --- |
| `Services/ISnapshotStore.cs` | `Task WriteAsync(IReadOnlyList<AircraftResponse>, CancellationToken)`; `Task<SnapshotResult?> ReadLatestAsync(ct)`; `Task<IReadOnlyList<SnapshotInfo>> ListAsync(int take, ct)`; `Task<SnapshotResult?> ReadByIdAsync(string id, ct)` |
| `Services/AdlsSnapshotStore.cs` | Implements `ISnapshotStore` over ADLS Gen2 using `DataLakeServiceClient` + `DefaultAzureCredential`; serializes/deserializes Parquet via `Parquet.Net` |
| `Services/IFlightFeedStatusProvider.cs` + impl | Derives tri-state; caches the last credit result from data calls; probes FR24 `/api/usage` for connectivity/auth |
| `Options/StorageOptions.cs` | `AccountUrl` (dfs endpoint), `Filesystem` (default `flight-snapshots`), `Region` (default `ch`) |
| `Contracts/*` | `AircraftFeedResponse { source, snapshotAt, aircraft[] }`, `SnapshotInfo { id, snapshotAt }`, `FeedStatus { state, checkedAt, latestSnapshotAt }` |

`Fr24FlightFeedService` gains an explicit **402** signal (parallel to the existing 429 `FlightFeedRateLimitedException`) so the endpoint can branch cleanly.

## 4. Storage layout (ADLS Gen2, Parquet)

- **Account:** ADLS Gen2 (`StorageV2`, `isHnsEnabled=true`), Sweden Central; filesystem **`flight-snapshots`**.
- **Parquet schema (one row per aircraft):** `callsign (string)`, `type (string)`, `reg (string?)`, `lat (double)`, `lon (double)`, `alt (int)`, `track (int)`, `gspeed (int)`, `snapshotAt (timestamp, UTC)`.
- **Paths** (Hive-style partitioning for analytics):
  - Archive: `region=ch/dt=YYYY-MM-DD/HH-mm-ss.parquet` (kept indefinitely).
  - Latest pointer: `region=ch/latest.parquet` (overwritten each success).
- **Snapshot id:** the archive path timestamp (e.g., `2026-07-21T06-30-00Z`), URL-safe, used by `?snapshot={id}` and the selector.

## 5. Backend behaviour (state machine)

### 5.1 `GET /api/aircraft` (live, default)

| FR24 result | API action | Response |
| --- | --- | --- |
| **200** | Parse; **best-effort** write snapshot (archive + latest); cache `credit=ok`, `lastLiveAt` | `200 { source:"live", snapshotAt, aircraft }` |
| **402** (credit) | Cache `credit=no_credit`; read `latest` snapshot | `200 { source:"snapshot", snapshotAt, aircraft }`, header `X-Feed-State: no_credit` |
| **429 / 5xx / network** | Read `latest` snapshot | `200 { source:"snapshot", snapshotAt, aircraft }`, header `X-Feed-State: offline` |
| **401/403** (auth) | Read `latest` snapshot | `200 { source:"snapshot" }`, header `X-Feed-State: offline` (token misconfig logged) |
| any of the above **but no snapshot exists** | — | `503 { error, state }` |

Snapshot writes are wrapped in `try/catch` and **never** fail the live response (logged as a warning).

### 5.2 Other endpoints

- `GET /api/aircraft?snapshot={id}` → read that specific archived snapshot → `200 { source:"snapshot", snapshotAt, aircraft }` (404 if missing).
- `GET /api/flight-snapshots?take=10` → `200 [{ id, snapshotAt }]` newest-first (bounded, default 10, max 50).
- `GET /api/flight-feed/status` → `200 { state, checkedAt, latestSnapshotAt }` where `state ∈ connected | no_credit | offline`.

### 5.3 Status derivation (no data credit burned)

`/api/flight-feed/status` calls FR24 **`/api/usage?period=24h`** (returns 200 even when data calls 402; does not consume a data credit) and combines it with the cached credit state:

- usage call **fails** (network / 401 / 403 / 5xx) → **offline**
- usage **200** and last data call was **402** → **no_credit**
- usage **200** and credit ok/unknown → **connected**

The status endpoint never returns the FR24 token or usage payload to the client. On cold start (no data call yet) the state is optimistically **connected**; the first `/api/aircraft` call resolves it.

## 6. Frontend UX

| Unit | Change |
| --- | --- |
| `features/flight-data/useFlightFeedStatus.ts` (**new**) | Polls `/api/flight-feed/status` on mount + every **60 s**; returns `{ state, latestSnapshotAt, checkedAt }` |
| `features/flight-data/flightFeedApi.ts` (**new**) | `fetchFeedStatus()`, `fetchSnapshots(take)` |
| `features/flight-data/aircraftApi.ts` | Parse the new `{ source, snapshotAt, aircraft }` envelope; optional `snapshotId` param → `?snapshot={id}` |
| `features/flight-data/useFlightData.ts` | Return `source` and accept an optional `snapshotId`; when set, fetch that snapshot instead of live |
| `app/FeedStatusIndicator.tsx` (**new**) | Colored dot + localized label + Fluent `Tooltip`; green/yellow/red per `state`; tooltip shows snapshot time in fallback |
| `app/BottomRibbon.tsx` | Render `FeedStatusIndicator` on the **left**; keep last-updated on the right |
| `features/flight-data/SnapshotSelector.tsx` (**new**) | Fluent `Combobox` listing last 10 snapshots (localized time labels); **shown only when `state !== connected`**; defaults to latest; selecting reloads aircraft from that snapshot |
| `state/AppStateContext.tsx` | Track `selectedSnapshotId: string \| null` (reset when going back green) |
| `i18n/locales/{en,de,fr,it}` | New keys (see below) in **all four** locales |

New i18n keys: `feed.status.connected`, `feed.status.noCredit`, `feed.status.offline`, `feed.status.label`, `feed.tooltip.connected`, `feed.tooltip.noCredit`, `feed.tooltip.offline`, `feed.snapshot.label`, `feed.snapshot.placeholder`, `feed.snapshot.none`.

**Colors** (Fluent tokens): green `colorStatusSuccessBackground3`, yellow `colorStatusWarningBackground3`, red `colorStatusDangerBackground3`.

## 7. Infrastructure

| Change | Detail |
| --- | --- |
| `infra/modules/storage.bicep` (**new**) | ADLS Gen2 account `StorageV2`, `isHnsEnabled=true`, `minimumTlsVersion=TLS1_2`, `allowBlobPublicAccess=false`; filesystem `flight-snapshots`; deterministic name (`atcsimstg{token}`, ≤24 lc-alnum) mirroring existing modules |
| `infra/main.bicep` | Instantiate storage; pass `Storage__AccountUrl` (`https://{name}.dfs.core.windows.net/`) + `Storage__Filesystem` app settings to `flightDataApi`; assign **Storage Blob Data Contributor** (`ba92f5b4-2d11-453d-a403-e96b0029c9fe`) to the flight-API MI on the storage scope |

Derive the storage endpoint statically from the deterministic name to avoid a circular dependency (mirrors the Sprint 2 Speech pattern). `az bicep build --file infra/main.bicep` must be clean; the generated `main.json` is not committed.

## 8. Guardrails & compliance

- `CON-01` no operational-ATC path; `CON-03` public/synthetic flight positions only, **no personal data** — snapshots contain public ADS-B-style fields (callsign, type, position, altitude, heading, speed), no PII.
- **Residency:** ADLS Gen2 in **Sweden Central** (EU), same region as the flight-data API. MI-only access (`DefaultAzureCredential` → Storage Blob Data Contributor); **no account keys or SAS** in the browser or in config.
- The status endpoint never exposes the FR24 token or raw usage data.
- A new **ADR-0008 (FR24 resilience + snapshot fallback)** captures the decision to serve cached data on credit/feed failure.

## 9. API contract (API-first)

Update [../../api/openapi.yaml](../../api/openapi.yaml) **first**, keep [DATA.md](../DATA.md) in sync:

| Method + path | Purpose |
| --- | --- |
| `GET /api/aircraft` (evolved) | Envelope `{ source, snapshotAt, aircraft }`; `source ∈ live \| snapshot`; header `X-Feed-State` |
| `GET /api/aircraft?snapshot={id}` | Read a specific archived snapshot |
| `GET /api/flight-snapshots?take=10` | List last N snapshots `{ id, snapshotAt }` |
| `GET /api/flight-feed/status` | `{ state, checkedAt, latestSnapshotAt }` |

**Breaking change note:** `GET /api/aircraft` moves from a bare `Aircraft[]` to an envelope. The frontend client is updated in lockstep; the smoke test (`verify-environment.ps1`) is updated to read `.aircraft` and to **pass** when `source=snapshot` (feed degraded but demo functional).

## 10. Testing & validation

- **Backend (xUnit):** `AdlsSnapshotStore` Parquet **round-trip** (write → read equal rows) against an abstracted stream/store; `/api/aircraft` branches — live 200 writes + `source=live`; 402 → `source=snapshot` + `no_credit`; 5xx/network → `source=snapshot` + `offline`; no-snapshot → 503; `?snapshot={id}` reads specific + 404; `/api/flight-snapshots` ordering/bounds; status mapping (offline/no_credit/connected) with a fake FR24 usage probe. Use fake `IFlightFeedService` + fake `ISnapshotStore`.
- **Frontend (Vitest):** `FeedStatusIndicator` renders all three states + tooltip; `SnapshotSelector` visible only in fallback, hidden when green, defaults to latest, selection triggers snapshot fetch; `useFlightFeedStatus` polling; `useFlightData` snapshot mode; aircraft envelope parsing; **i18n parity** across en/de/fr/it.
- **Infra:** `az bicep build` clean; role assignment present.
- **Smoke test:** `scripts/verify-environment.ps1` updated so the pipeline is **green** when the feed is degraded (snapshot served) and only fails on a true 500/unreachable API.
- **E2E (runbook):** live load writes a snapshot; simulate no-credit (402) → ribbon yellow + latest snapshot served + selector shows last 10; simulate offline → ribbon red.

## 11. Out of scope (YAGNI)

- Historical picker beyond the last 10 snapshots; a query/analytics layer over the Parquet archive.
- Scheduled/timer snapshotting (snapshot-on-success only this sprint).
- Automated FR24 credit top-up or alerting.
- Storage **private endpoints** / network lockdown (public network + MI + no public blob access this sprint; private networking is a follow-up).
- Persisting simulation transcripts/results (still deferred).
