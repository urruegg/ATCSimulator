# Runbook — Operations / SRE Triage (AG-E-07)

| Field | Value |
| --- | --- |
| Product | ATCSimulator |
| Owner | Operations / SRE agent (AG-E-07) + Cloud/Platform Ops (human) |
| Depends on | Full-stack Application Insights + Log Analytics (issue #15) |
| Classification | Public — anonymized demo |

> **Purpose.** The entry point the [Operations / SRE agent](../../.github/agents/operations.agent.md)
> uses to turn telemetry **signals** into deduped, well-formed **issues + spec + plan**
> ready for a review-gated PR. **Read-only to production. Propose only. Never merge.
> No PII in any query or output (`NFR-20`). No operational-ATC connectivity (`CON-01`).**

## 0. Preconditions

- App Insights + Log Analytics deployed and wired (issue #15). Confirm the workspace
  and the custom events below exist; if a name differs, reconcile with #15's ADR.
- `az` logged in with **reader** on the workspace, or query via the Azure portal /
  `az monitor log-analytics query`. Never use write/owner credentials for triage.

## 1. Custom signal contract (aligned with issue #15)

| Custom event / metric | Meaning | Emitting tier |
| --- | --- | --- |
| `feed.fallback` | Served snapshot instead of live FR24 | flight-data API |
| `feed.quotaExhausted` | FR24 credit/quota exhausted | flight-data API |
| `snapshot.ageSeconds` (metric) | Age of served snapshot | flight-data API |
| `maps.tokenFailed` | Maps token broker failure (`/api/maps/token`) | flight-data API / web |
| `voice.loopLatencyMs` (metric) | STT→intent→command→read-back→TTS latency | voice-agent API |

## 2. Starter KQL set (bounded time windows only)

> Always scope with `where timestamp > ago(<window>)`. Prefer **aggregate counts**
> over raw payloads. Never `project` fields that could carry audio/transcript/PII.

```kusto
// 2.1 Failed requests by cloud role (last 24h)
requests
| where timestamp > ago(24h) and success == false
| summarize failures = count(), byResult = dcount(resultCode) by cloud_RoleName, resultCode
| order by failures desc
```

```kusto
// 2.2 Top exceptions by type/component (last 24h) — no message payloads with PII
exceptions
| where timestamp > ago(24h)
| summarize count(), firstSeen = min(timestamp), lastSeen = max(timestamp)
    by cloud_RoleName, type, problemId
| order by count_ desc
```

```kusto
// 2.3 Dependency failures / slow calls (Maps, ADLS, Foundry, FR24)
dependencies
| where timestamp > ago(24h)
| summarize calls = count(), fails = countif(success == false), p95Ms = percentile(duration, 95)
    by target, name
| where fails > 0 or p95Ms > 2000
| order by fails desc, p95Ms desc
```

```kusto
// 2.4 FR24 feed fallback + quota exhaustion (cold-start / credit signal)
customEvents
| where timestamp > ago(24h) and name in ('feed.fallback','feed.quotaExhausted','maps.tokenFailed')
| summarize count(), lastSeen = max(timestamp) by name
| order by lastSeen desc
```

```kusto
// 2.5 Snapshot staleness (fallback data age)
customMetrics
| where timestamp > ago(24h) and name == 'snapshot.ageSeconds'
| summarize maxAgeSec = max(value), p95 = percentile(value, 95) by bin(timestamp, 1h)
| order by timestamp desc
```

```kusto
// 2.6 Voice-loop latency breach (experience signal)
customMetrics
| where timestamp > ago(24h) and name == 'voice.loopLatencyMs'
| summarize p50 = percentile(value,50), p95 = percentile(value,95), p99 = percentile(value,99)
| extend breach = p95 > 1500   // proposed SLO threshold — validate with EA
```

```kusto
// 2.7 Client-side / blank-map errors (web shell)
exceptions
| where timestamp > ago(24h) and cloud_RoleName has 'atcsim-shell'
| summarize count() by problemId, outerType
| order by count_ desc
```

## 3. Signal → action decision tree

1. **Any `feed.quotaExhausted` AND `snapshot.ageSeconds` high (or snapshot empty)** →
   the cold-start fallback (issue #14) is missing/stale → open or link a `bug`,
   propose reseed + alert; reference [fr24-credit.md](./fr24-credit.md) and ADR-0008.
2. **`maps.tokenFailed` > 0 or blank-map client errors** → Maps rendering regression →
   link to issue #13; if recurring post-fix, open a new `bug` with evidence.
3. **`requests`/`dependencies` failures spike after a deploy** → likely regression →
   correlate `gh run list` + `git log`; open a `bug`, tag the suspect commit/PR.
4. **Voice-loop p95 breach** → experience degradation → open `enhancement`/`bug`,
   route to voice-agent owners; propose an SLO with EA.
5. **Recurring same signal, no owner** → propose an **alert** (KQL-as-code) +
   dashboard tile as an `enhancement` to SecDevOps.

## 4. Issue authoring checklist (mirror repo conventions)

- Title `type(scope): ...`; label `bug` or `enhancement`.
- Body: Summary · Where (files) · **Evidence** (KQL + window + impact, PII-free) ·
  **RCA hypotheses** ("to confirm, do not assume") · Acceptance criteria · Guardrails
  (`CON-01`/`CON-03`/`NFR-20`) · Traceability stubs (`FR/NFR → US-###`).
- Dedupe first (`gh issue list`, `gh search issues`); link instead of duplicating.
- Add a dated spec (`docs/specs/`) + plan (`docs/plans/`) scoped for one PR; name the
  target delivery/role agent. Hand off via [AGENT_WORKFLOW.md](../../.github/agents/AGENT_WORKFLOW.md).

## 5. Escalate to a human (do not act)

Incident **severity declaration**, stakeholder/customer comms, any restricted or
destructive action, residency changes, secret rotation — **human-only**
([NON_DELEGABLE_WORK.md](../../.github/agents/NON_DELEGABLE_WORK.md)). Prepare the
proposal with evidence and hand off.
