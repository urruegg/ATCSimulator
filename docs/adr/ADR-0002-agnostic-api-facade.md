# ADR-0002: Simulator-vendor-agnostic API façade (Azure API Management)

| Field | Value |
| --- | --- |
| Product | ATCSimulator |
| Document | ADR-0002 — Simulator-vendor-agnostic API façade |
| Version | 0.1 (Draft) |
| Date | 2026-07-14 |
| Author | Cloud Solution Architect (CSA), Microsoft |
| Status | Accepted |
| Classification | Public — anonymized demo |

**Related documents:** [../../api/openapi.yaml](../../api/openapi.yaml) · [../SD.md](../SD.md) · [../DATA.md](../DATA.md) §5 · [../SECURITY.md](../SECURITY.md) §3/§9.2 · [../DESIGN-PRINCIPLES.md](../DESIGN-PRINCIPLES.md) DP-20 · [ADR-0001-realtime-model-region.md](./ADR-0001-realtime-model-region.md)
**Related IDs:** `NFR-08` · `NFR-09` · `NFR-19` · `C-04` · `DP-20` · `RISK-13`

---

## Status

**Accepted.** Applies to both scopes. The machine-readable contract lives at [../../api/openapi.yaml](../../api/openapi.yaml).

## Context

- The Customer runs **simulators from multiple vendors**; earlier single-vendor speech algorithms failed on Swiss dialects and place names. A single-vendor coupling would hamper integration and limit value for the whole Academy (source facts; `DP-20`).
- The engagement goal is to deliver the ASR/NLP/TTS/command-mapping capabilities as **simulator-vendor-independent software services** connectable by API.
- The demo must also ingest a **public live-flight feed** (FlightAware/Flightradar24) safely, and the production plane must expose services to simulator vendors **without leaking personal data** to them (`C-04`, [../SECURITY.md](../SECURITY.md) §9.2).
- The runtime component diagram already defines an **"AGNOSTIC API" boundary** in front of the six virtual-pilot components (`AG-F-01..AG-F-06`).
- Foundation models are expected to be **swappable** (OpenAI/Microsoft/others) without breaking clients ([ADR-0001](./ADR-0001-realtime-model-region.md)).

## Decision

Adopt **Azure API Management (APIM) as the single "Agnostic API" façade** in front of the virtual-pilot services, versioned by the OpenAPI contract at [../../api/openapi.yaml](../../api/openapi.yaml).

- **One controlled entry/exit** for: session lifecycle, aircraft selection from the public feed, ATC-instruction submission, read-back retrieval, transcript retrieval, and real-time audio channel negotiation.
- APIM enforces **Entra JWT auth + per-vendor subscription keys/certs**, **schema validation** (reject unknown fields / out-of-range commands), **rate limiting/quotas**, **request/response logging with personal data redacted**, and **mTLS to backends** (`NFR-08`).
- **Vendor path sees minimum-necessary fields** — callsigns, commands, session/correlation IDs — **never** trainee identity, voice, or performance data (`C-04`, [../DATA.md](../DATA.md) §5).
- The **public flight feed is ingested only via APIM** into the non-personal demo plane, with **no route** into the production personal plane (`NFR-09`, `NFR-19`).
- Simulator vendors integrate via **adapters behind the façade**; foundation models and speech vendors are swapped behind the same stable contract (`DP-20`).
- **API-first change control:** the OpenAPI file changes first; [../DATA.md](../DATA.md) §5 is kept in sync; breaking changes are versioned and gated.

## Consequences

### Positive

- True **vendor independence**: simulators and speech/model vendors are swappable without changing clients.
- A single, testable **security & governance choke point** (auth, schema validation, throttling, redaction, mTLS) — strong STRIDE coverage for the API boundary ([../SECURITY.md](../SECURITY.md) §9.2).
- Enforces **data minimization** on the vendor path by construction (`C-04`).
- Clean seam to keep the **demo real-time plane isolated** from the production personal plane (`NFR-19`).

### Negative / trade-offs

- APIM adds a component to operate and a potential **latency hop** — must be budgeted against the real-time SLO (`DP-11`); use it for control/signalling while the media stream uses a negotiated WebSocket/WebRTC channel (see `audio/negotiate` in the OpenAPI stub).
- Requires **contract discipline** (API-first) and adapter development per simulator vendor.
- Cost and configuration overhead vs calling backends directly (accepted for the governance/portability benefit).

## Alternatives considered

1. **Direct point-to-point integration per simulator vendor.** Rejected: re-creates the single-vendor coupling problem, multiplies security surface, and leaks data contracts.
2. **A hand-rolled API gateway (in Container Apps).** Rejected: reinvents authN/Z, throttling, schema validation, and logging that APIM provides as managed capability; weaker governance story for a green-field Customer.
3. **Azure Front Door / App Gateway only.** Useful for edge/WAF but does not provide API product management, per-vendor subscriptions, schema validation, or the developer-portal contract governance we need; may sit **in front of** APIM but not replace it.
4. **Expose backends directly and rely on network controls.** Rejected: violates data-minimization on the vendor path (`C-04`) and the single-façade principle (`NFR-08`).
