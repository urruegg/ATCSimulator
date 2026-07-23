# ADR-0009: Workspace-Based Observability

| Field | Value |
| --- | --- |
| Product | ATCSimulator |
| Document | ADR-0009 — Workspace-Based Observability |
| Version | 0.1 (Draft) |
| Date | 2026-07-22 |
| Author | ATCSimulator team |
| Status | Accepted |
| Classification | Public — anonymized demo |

**Related documents:** [../SECURITY.md](../SECURITY.md) §7 ·
[../OPERATIONS.md](../OPERATIONS.md) ·
[ADR-0003-split-plane-data-residency.md](./ADR-0003-split-plane-data-residency.md) ·
[ADR-0008-fr24-resilience-snapshots.md](./ADR-0008-fr24-resilience-snapshots.md)
**Related IDs:** `NFR-20`, `NFR-22`, `NFR-25`, `CON-01`, `CON-03`, `DP-10`,
`DP-18`, `DP-19` · Issue
[#15](https://github.com/urruegg/ATCSimulator/issues/15)

---

## Status

**Accepted.** ATCSimulator uses a single Log Analytics workspace plus
workspace-based Application Insights as the observability backbone for the demo
App Services, the flight-data API, the voice-agent API, Azure Maps, and ADLS.

## Context

The Operations/SRE workstream needs reliable signals for stability, failures,
latency, dependency health, stale public-flight snapshots, FR24 credit exhaustion,
Maps token brokerage, and the voice loop. Before this decision, telemetry was
not consistently wired end to end.

The demo plane carries only public flight data and synthetic voice (`CON-03`) and
has no operational ATC connectivity (`CON-01`). Production/personal telemetry
may reveal identifiers through operational logs, so residency follows
[ADR-0003](./ADR-0003-split-plane-data-residency.md): personal/production
observability stays in Switzerland North.

## Decision

1. Add a first-class Log Analytics workspace module and link Application
   Insights through `WorkspaceResourceId`.
2. Parameterize observability residency:
   - `dataBoundary=demo` keeps telemetry in `observabilityLocation`.
   - `dataBoundary=production` forces telemetry to `switzerlandnorth`.
3. Export the Application Insights connection string only through App Service
   app settings (`APPLICATIONINSIGHTS_CONNECTION_STRING`); no secrets or
   connection strings are committed to code.
4. Instrument the .NET APIs with Azure Monitor OpenTelemetry for requests,
   dependencies, exceptions, logs, custom activities, and metrics.
5. Emit custom, redacted telemetry events:
   - `AtcSim.FlightFeed.Success`
   - `AtcSim.FlightFeed.Failure`
   - `AtcSim.FlightFeed.QuotaExhausted`
   - `AtcSim.MapsTokenBroker.Success`
   - `AtcSim.MapsTokenBroker.Failure`
   - `AtcSim.VoiceLoop.StageLatency`
   - `AtcSim.VoiceLoop.CommandDispatch`
6. Send diagnostic settings for App Service, Azure Maps, and ADLS/Blob to the
   workspace.

## Consequences

### Positive

- SRE has a single query surface for app and platform health.
- The demo exposes degraded feed states and voice-loop latency without logging
  personal audio, transcripts, tokens, or raw function-call arguments.
- Production residency is safe by default because `dataBoundary=production`
  overrides the telemetry region to Switzerland North.

### Negative / trade-offs

- Diagnostic-category availability is Azure-resource specific; deployment
  validation must check diagnostic settings in each target subscription.
- The browser shell receives the connection string for platform correlation, but
  browser SDK instrumentation remains a follow-up pending RAI review.
- App Services still use public ingestion/query for Azure Monitor in the PoC;
  production should evaluate Private Link for Azure Monitor.

## Alternatives considered

1. **Application Insights without Log Analytics.** Rejected: weaker cross-resource
   KQL and dashboarding for the Operations/SRE agent.
2. **Per-service workspaces.** Rejected: unnecessary for the PoC and fragments
   correlation.
3. **Telemetry in the app region for all environments.** Rejected: unsafe for
   production/personal data because it could move logs out of Switzerland North.
