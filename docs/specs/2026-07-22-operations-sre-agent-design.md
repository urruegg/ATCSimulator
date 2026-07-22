# Spec — Operations / SRE Agent (AG-E-07)

| Field | Value |
| --- | --- |
| Product | ATCSimulator |
| Document | Design spec — Operations / SRE agent |
| Date | 2026-07-22 |
| Status | Draft (for review-gated PR) |
| Related issue | #16 |
| Depends on | #15 (full-stack Application Insights + Log Analytics) |
| Classification | Public — anonymized demo |

## 1. Problem & outcome

Today ATCSimulator has **no operational feedback loop**: App Insights is not wired
(#15) and no one systematically turns telemetry into fixes. We want a **dedicated
Operations / SRE agent** that monitors the deployed solution, **intakes signals**,
**triages** them against the platform, and produces **actionable, traceable issues +
spec + plan** ready for a **review-gated PR** — improving stability and experience
without ever taking restricted actions or merging.

## 2. Scope

**In:** an engineering custom agent (`AG-E-07`) definition; a triage runbook with a
starter KQL set and a signal→issue decision tree; registration in `AGENTS.md` and
`copilot-instructions.md`; the custom-telemetry signal contract it consumes.

**Out (non-goals):** implementing the App Insights wiring itself (that is #15);
building fixes (delivery/role agents do that); any alerting IaC (proposed as
follow-up `enhancement`); auto-merge or auto-approval of any kind.

## 3. Design

- **Signal source:** Log Analytics workspace + App Insights (#15). The agent is
  **read-only** (workspace *reader*), queries bounded time windows, and never emits
  PII (`NFR-20`).
- **Signal contract:** custom events/metrics `feed.fallback`, `feed.quotaExhausted`,
  `snapshot.ageSeconds`, `maps.tokenFailed`, `voice.loopLatencyMs`, plus platform
  `requests`/`dependencies`/`exceptions`/availability. Names reconciled with #15's ADR.
- **Operating loop:** detect → classify (severity + component) → dedupe → author
  issue → draft spec + plan → hand off to a delivery/role agent. Human gates (EA/RAI)
  and human merge remain intact.
- **Governance:** read-only to prod; proposes only; never merges/approves; no
  operational-ATC connectivity (`CON-01`); residency-aware (DP-18); cites
  `NFR-##`/`DP-##`/ADR in every artifact.

## 4. Interfaces & handoffs

Feeds → Feature/Developer (implement), SecDevOps (alerts/KQL-as-code/CI gates), Infra
(resource diagnostics), EA (SLO/alert architecture, sign-off), RAI (no-PII
confirmation). Human: Cloud/Platform Ops owns operations; incident severity + comms
are human-only.

## 5. Acceptance criteria

- `.github/agents/operations.agent.md` present, matching the existing agent-file
  pattern, with explicit read-only/propose-only/never-merge guardrails.
- `AGENTS.md` §4 and `.github/copilot-instructions.md` §6 register AG-E-07.
- `docs/runbooks/ops-triage.md` provides the starter KQL + decision tree + issue
  checklist, aligned to #15's signal contract.
- markdownlint-clean; no secrets; no PII; no operational-ATC path.

## 6. Traceability

`NFR` (observability/operability, `NFR-20` no-PII telemetry) → `US-###` (link from
[BACKLOG.md](../BACKLOG.md) at implementation) → this spec + plan → review-gated PR.
A new ADR is proposed if/when the agent introduces an SLO/alerting architecture.
