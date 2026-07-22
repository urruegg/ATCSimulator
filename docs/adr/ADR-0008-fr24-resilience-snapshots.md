# ADR-0008: FR24 Resilience via Snapshot Persistence & Fallback

| Field | Value |
| --- | --- |
| Product | ATCSimulator |
| Document | ADR-0008 — FR24 Resilience via Snapshot Persistence & Fallback |
| Version | 0.1 (Draft) |
| Date | 2026-07-21 |
| Author | ATCSimulator team |
| Status | Accepted |
| Classification | Public — anonymized demo |

**Related documents:** [../DATA.md](../DATA.md) §5.4 · [../SECURITY.md](../SECURITY.md) · [../BOM.md](../BOM.md) · [../../api/openapi.yaml](../../api/openapi.yaml) · [../../infra/modules/storage.bicep](../../infra/modules/storage.bicep) · [ADR-0003-split-plane-data-residency.md](./ADR-0003-split-plane-data-residency.md) · [ADR-0006-azure-maps-keyless-auth.md](./ADR-0006-azure-maps-keyless-auth.md) · [spec](../specs/2026-07-21-fr24-resilience-snapshot-persistence-design.md) · [plan](../plans/2026-07-21-fr24-resilience-snapshot-persistence-plan.md) · [FR24 credit runbook](../runbooks/fr24-credit.md) · [ZRH cold-start seed runbook](../runbooks/zrh-cold-start-snapshot-seed.md)
**Related IDs:** `CON-01`, `CON-03` · `DP-11`, `DP-18` · Sprint issue [#10](https://github.com/urruegg/ATCSimulator/issues/10)

---

## Status

**Accepted.** Makes the aircraft-selection demo work **at any time**, including when the FlightRadar24 (FR24) API account has **no credit**, by persisting each successful live load as a Parquet snapshot to ADLS Gen2 and serving the latest snapshot on FR24 402/failure. Complements [ADR-0003](./ADR-0003-split-plane-data-residency.md) (split-plane residency) and reuses the keyless managed-identity pattern of [ADR-0006](./ADR-0006-azure-maps-keyless-auth.md).

## Context

`GET /api/aircraft` proxies FR24 live and only translated FR24 **429** → 503. Any other upstream failure — notably FR24 **402 "Credit limit reached"** — surfaced as an opaque **500**, which broke the SIT post-deploy smoke test and blocked the pipeline. The FR24 account is periodically out of credit, so the demo could not be relied on.

The feed carries **public/synthetic** aircraft positions only — no personal data (`CON-03`) — and is never connected to operational ATC (`CON-01`). That makes it safe to cache and replay FR24 responses without a compliance impact.

Requirements:

- The demo must run **without** live FR24 credit (aircraft still selectable).
- The feed health must be **observable** to the user (why is data stale?).
- No new compute service; extend the existing `AtcSim.FlightDataApi`.
- Keyless access to storage (managed identity), EU residency, no PII.

## Decision

Persist every successful Switzerland-wide live load as **Parquet** to **ADLS Gen2** and **auto-fall back** to the latest snapshot when FR24 is out of credit or unreachable, with a **tri-state feed status** shown in the footer and a **snapshot selector** available in fallback. Add a one-shot **ZRH cold-start seed** sourced from the anonymous OpenSky Network public API so `latest.parquet` can exist before the first successful FR24 capture. The seed uses the existing `SnapshotSerializer` / `ISnapshotStore` path, so its schema is identical to live snapshots.

The approved decisions:

| # | Decision | Choice |
| --- | --- | --- |
| D1 | Snapshot trigger | **Snapshot-on-success** — every successful live load writes a snapshot (best-effort; never fails the live response) |
| D2 | Retention | **Keep all timestamped snapshots** indefinitely (historical reuse) **+** an overwritable `latest` pointer |
| D3 | Fallback scope | **Auto-fallback to latest** on no-credit/offline **+** a selector limited to the **last 10** snapshots |
| D4 | Selector visibility | **Only in fallback** (yellow/red); defaults to latest; **hidden when green** |
| D5 | Status presentation | Footer ribbon **left**: colored dot + localized label (`Connected` / `No credits` / `Offline`) + hover tooltip with detail |
| D6 | Storage format | **Parquet** (columnar) in ADLS Gen2, analytics-ready |
| D7 | Architecture | **Extend `AtcSim.FlightDataApi`** (no new compute); ADLS via **managed identity**; add `ISnapshotStore` + status provider |
| D8 | Cold-start seed | **One-shot OpenSky ZRH seed** — anonymous public endpoint, ZRH TMA box, idempotent latest overwrite + dated archive |

### Behaviour

`GET /api/aircraft` returns an **envelope** `{ source, snapshotAt, aircraft[] }`:

| FR24 result | API action | Envelope |
| --- | --- | --- |
| **200** | Best-effort write snapshot; cache `credit=ok` | `source: "live"` |
| **402** (credit) | Cache `credit=no_credit`; read latest snapshot | `source: "snapshot"`, state `no_credit` |
| **429 / 5xx / network / auth** | Read latest snapshot | `source: "snapshot"`, state `offline` |
| any of the above but **no snapshot exists** | — | `503` |

- `GET /api/aircraft?snapshot={id}` pins a specific archived snapshot.
- `GET /api/flight-snapshots` lists the last 10 snapshots (newest first).
- `GET /api/flight-feed/status` returns `{ state, checkedAt }` where `state ∈ connected | no_credit | offline`, derived from a **cheap FR24 `/api/usage` probe** (does not burn a data credit) plus the cached credit state. Polled by the client every 60 s.
- `scripts\seed-zrh-snapshot.ps1` can seed `latest.parquet` and the archive from the OpenSky ZRH box (`47.20,8.20,47.75,8.95` by default) or from the checked-in deterministic fixture at `data\flight-feed\opensky-zrh-sample.json`.

### Storage & access

- ADLS Gen2 (`StorageV2`, `isHnsEnabled=true`), **Sweden Central** (same region as the flight-data API), filesystem `flight-snapshots`, `allowBlobPublicAccess=false`, TLS 1.2, **no account keys** (`allowSharedKeyAccess=false`).
- Access via **managed identity** (`DefaultAzureCredential`) with **Storage Blob Data Contributor**; no SAS or keys in the browser or config (`DP-11`).
- Path layout and Parquet schema are documented in [DATA.md §5.4](../DATA.md); the OpenAPI stub is the authoritative interface.

## Consequences

### Positive

- **Demo always works** — aircraft selection functions on cached snapshots even with zero FR24 credit; a degraded feed is a **200 snapshot**, not a 500.
- **Observable** — the tri-state ribbon tells the user exactly why data may be stale (green/yellow/red) with the snapshot time in the tooltip.
- **No new compute** — the existing flight-data API is extended; only a storage account is added.
- **Keyless + in-region** — managed-identity access, EU residency, no PII, no keys/SAS (`CON-03`, `DP-11`, `DP-18`).
- **Analytics-ready** — Parquet + Hive-style partitioning enables future historical simulation and analysis over the archive.

### Negative / trade-offs

- **Stale data in fallback** — snapshots reflect the last successful live load, not real-time traffic; acceptable for a selection demo and surfaced explicitly to the user.
- **Breaking envelope change** — `GET /api/aircraft` moved from a bare `Aircraft[]` to `{ source, snapshotAt, aircraft }`; the frontend client and the smoke test were updated in lockstep.
- **Storage cost & growth** — timestamped snapshots are kept indefinitely; volume is tiny (a few KB per snapshot) but unbounded. A retention/lifecycle policy is a follow-up.
- **`DateTimeOffset` limitation** — Parquet.Net does not round-trip `DateTimeOffset`, so `snapshotAt` is stored as a UTC `DateTime` and reconstructed as `DateTimeOffset` at the boundary.

## Alternatives considered

1. **Fail loudly on no credit (status quo).** Rejected: breaks the demo and the pipeline whenever FR24 credit runs out — the exact problem this sprint solves.
2. **In-memory cache only (no persistence).** Rejected: lost on every app restart/scale event; the demo could still be dead after a cold start.
3. **New dedicated snapshot microservice.** Rejected (YAGNI): the flight-data API already owns FR24 access; a separate service adds deployment and auth surface for no benefit at this scope.
4. **JSON/CSV instead of Parquet.** Rejected: Parquet is columnar and analytics-ready (D6) at negligible extra cost via Parquet.Net.
5. **Scheduled/timer snapshotting.** Deferred: snapshot-on-success covers the demo need without a timer; scheduled capture is a follow-up.
6. **Account keys / SAS for storage.** Rejected: violates the keyless posture (`DP-11`); managed identity + Storage Blob Data Contributor is used instead.

## References

- [Spec](../specs/2026-07-21-fr24-resilience-snapshot-persistence-design.md) — FR24 resilience & snapshot persistence design (decisions D1–D7)
- [Plan](../plans/2026-07-21-fr24-resilience-snapshot-persistence-plan.md) — Implementation plan (19 TDD tasks)
- [DATA.md §5.4](../DATA.md) — Flight-feed resilience contracts and snapshot storage layout
- [FR24 credit runbook](../runbooks/fr24-credit.md) — Operating the feed (green/yellow/red, top-up, snapshot inspection)
- [ZRH cold-start seed runbook](../runbooks/zrh-cold-start-snapshot-seed.md) — OpenSky seed command and offline fixture dry run
- [ADR-0003](./ADR-0003-split-plane-data-residency.md) — Split-plane residency
- [ADR-0006](./ADR-0006-azure-maps-keyless-auth.md) — Keyless managed-identity access
- [`../../infra/modules/storage.bicep`](../../infra/modules/storage.bicep) — ADLS Gen2 module + role assignment
