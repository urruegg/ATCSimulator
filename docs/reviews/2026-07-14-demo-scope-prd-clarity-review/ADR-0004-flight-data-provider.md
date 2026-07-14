# ADR-0004 — Public flight-data provider for the demo

| Field | Value |
| --- | --- |
| Status | Proposed |
| Date | 2026-07-14 |
| Deciders | Enterprise Architect (AG-E-03), Product Owner (AG-E-01), CSA |
| Related | [../FLIGHT-DATA-SOURCES.md](../FLIGHT-DATA-SOURCES.md) · [ADR-0002-agnostic-api-facade.md](./ADR-0002-agnostic-api-facade.md) · PRD FR-01 / ASS-03 |

## Context

The demo (Scope 2, **FR-01**) lets a trainee **pick a real aircraft near a Swiss airport** to seed a voice-simulation scenario. We need a public flight-tracking feed that supports **area/bounding-box queries** and returns **callsign, aircraft type, position, altitude, heading, and speed**. The data is about **aircraft, not persons** → non-personal → **no data-residency constraint**; the gating concerns are the **commercial licence (ToS)**, cost, field richness, and reliability during a live workshop. Candidates evaluated: Flightradar24 API, FlightAware AeroAPI, OpenSky Network, adsb.lol, airplanes.live, ADS-B Exchange, AirLabs, aviationstack (full analysis in [../FLIGHT-DATA-SOURCES.md](../FLIGHT-DATA-SOURCES.md)).

## Decision

1. **Primary source: Flightradar24 API** (Explorer $9/mo or Essential $90/mo). It is commercially licensed, matches the source referenced by the engagement owner, exposes a `bounds` box query and *Live flight positions (full)* fields (callsign, registration, type, origin/destination), offers a **free sandbox** to build against, and ships official SDKs + an MCP server.
2. **Alternative: FlightAware AeroAPI (Standard tier)** — used if the Customer prefers FlightAware or wants Aireon satellite ADS-B.
3. **Free developer spikes only: OpenSky Network / adsb.lol / airplanes.live** — for local build/test, never the customer-facing commercial demo (non-commercial licences; OpenSky may block Azure IPs).
4. **Always ship a recorded fixture** (extend `data/scenarios/sample-scenario.json`) as the default, reproducible demo path; the live feed is the optional "wow."
5. **Consume via a `FlightFeedAdapter` behind the Agnostic API/APIM façade** (per [ADR-0002](./ADR-0002-agnostic-api-facade.md)); provider key in **Key Vault**; server-side only; **seed-once-then-simulate**.

## Consequences

- **Positive:** commercially clean for a Microsoft→Customer demo; low cost; provider-swappable; reproducible offline; minimal rate/credit footprint (one query per scenario start).
- **Negative / trade-offs:** a paid subscription is required for the customer demo; exact FR24 endpoint paths/credit costs must be confirmed in the FR24 API portal; provider ToS must be checked for "training-simulator/derivative-works" use (tracked as **ASS-03**).
- **Follow-ups:** confirm licence clause with the chosen provider; capture a Swiss-airport fixture; implement adapters for FR24 (primary), OpenSky (dev), and fixture (offline).

## Alternatives considered

- **OpenSky as primary** — rejected: non-commercial licence + potential Azure-IP blocking.
- **Community feeds (adsb.lol/airplanes.live) as primary** — rejected: non-commercial / ODbL / no SLA.
- **aviationstack** — rejected as primary: schedule/status oriented, weaker for map-pick-an-aircraft.
