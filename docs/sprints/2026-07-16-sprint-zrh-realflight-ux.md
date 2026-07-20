# Sprint — ZRH Real-Flight UX + Shared Platform

| Field | Value |
| --- | --- |
| Product | ATCSimulator |
| Document | Sprint — ZRH Real-Flight UX + Shared Platform |
| Type | Sprint |
| Version | 1.0 |
| Date | 2026-07-16 |
| Author | ATCSimulator team |
| Status | Active |
| Classification | Public — anonymized demo |

**GitHub issue:** [#5 Sprint: ZRH Real-Flight UX + Shared Platform](https://github.com/urruegg/ATCSimulator/issues/5)
**Related documents:** [design spec](../specs/2026-07-16-zrh-realflight-ux-shared-platform-design.md) · [implementation plan](../plans/2026-07-16-zrh-realflight-ux-shared-platform-plan.md) · [PoC outcome / foundation](./2026-07-16-poc-outcome-and-next-sprint-foundation.md) · [PoC E2E validation runbook](../runbooks/poc-e2e-validation-runbook.md) · [ADR-0002](../adr/ADR-0002-agnostic-api-facade.md) · [ADR-0004](../adr/ADR-0004-voice-live-foundry-agent.md)

---

## Goal

Deliver the ZRH real-flight experience (Teams-like shell, extended Map + live Chat, four languages, brandkit) and the shared platform (Azure Maps, Azure DNS delegation, shared Azure Front Door, custom domains + TLS). Demo plane only — public/synthetic data, no personal data, no operational-ATC connectivity.

## Phases

1. **App shell, i18n, theming** — Teams-like rail + header, EN/DE/FR/IT, brandkit theme/logo, full-height layout, shared selection state.
2. **Map view** — keyless Azure Maps (ZRH), all live sandbox flights, click-to-select, real-time selected-flight header, 5s user-set refresh.
3. **Chat view** — live Voice Live + Foundry-agent loop; ATC (mic) / Pilot columns, both transcribed; synthetic-voice disclosure.
4. **Shared platform & infra** — shared `swissshub` RG, Azure DNS zone `swissshub.com`, Azure Front Door `fdswissshub`, Azure Maps account, custom domains + Front Door-managed TLS.

## Human gates (non-delegable)

- GoDaddy nameserver change to delegate `swissshub.com` to Azure DNS.
- Publish the Foundry virtual-pilot agent + set `VoiceLive__AgentId`/`VoiceLive__ProjectId`.
- PROD deployment approval.

## Expected delivery evidence

- Signed-in ZRH map with live flights; select → armed Chat view (screens).
- Live chat: spoken read-back of an accepted command + rejection of an out-of-range command; both sides transcribed (recording).
- Language switch re-translates all views; airport dropdown lists all Swiss airports (full scope), ZRH default.
- Custom domains reachable over HTTPS via Front Door.
- Frontend (Vitest) + backend (xUnit) green; `az bicep build` clean; golden-phraseology evals remain the merge gate.

## Traceability

Requirement → story → tests/evals → evidence is maintained in each PR and linked back to issue [#5](https://github.com/urruegg/ATCSimulator/issues/5).
