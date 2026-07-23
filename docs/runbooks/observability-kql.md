# Observability KQL Starter Runbook

| Field | Value |
| --- | --- |
| Product | ATCSimulator |
| Document | Observability KQL Starter Runbook |
| Version | 0.1 (Draft) |
| Date | 2026-07-22 |
| Author | ATCSimulator team |
| Status | Draft |
| Classification | Public — anonymized demo |

Use the Log Analytics workspace output by `infra/main.bicep`. Queries are
redacted by design: do not add audio payloads, transcript text, access tokens,
or raw function-call arguments (`NFR-20`).

## API failures and latency

```kusto
requests
| where timestamp > ago(24h)
| summarize
    Requests=count(),
    Failures=countif(success == false),
    P95DurationMs=percentile(duration, 95)
  by cloud_RoleName, bin(timestamp, 15m)
| order by timestamp desc
```

## Dependency failures

```kusto
dependencies
| where timestamp > ago(24h)
| where success == false
| summarize Failures=count() by cloud_RoleName, target, type, resultCode
| order by Failures desc
```

## Domain telemetry events

```kusto
traces
| where timestamp > ago(24h)
| where message has "telemetry_event"
| extend eventName = tostring(customDimensions.TelemetryEventName)
| summarize Events=count() by eventName, cloud_RoleName, bin(timestamp, 15m)
| order by timestamp desc
```

## FR24 fallback and stale snapshots

```kusto
traces
| where timestamp > ago(24h)
| where customDimensions.TelemetryEventName in (
    "AtcSim.FlightFeed.Failure",
    "AtcSim.FlightFeed.QuotaExhausted")
| project
    timestamp,
    eventName=tostring(customDimensions.TelemetryEventName),
    fallbackServed=tobool(customDimensions.FallbackServed),
    snapshotAgeSeconds=todouble(customDimensions.SnapshotAgeSeconds)
| order by timestamp desc
```

## Maps token broker failures

```kusto
traces
| where timestamp > ago(24h)
| where customDimensions.TelemetryEventName == "AtcSim.MapsTokenBroker.Failure"
| summarize Failures=count() by reason=tostring(customDimensions.Reason), bin(timestamp, 15m)
| order by timestamp desc
```

## Voice-loop latency markers

```kusto
customMetrics
| where timestamp > ago(24h)
| where name == "atcsim.voice_loop.stage_latency_ms"
| summarize P50=percentile(value, 50), P95=percentile(value, 95)
  by stage=tostring(customDimensions.stage), bin(timestamp, 15m)
| order by timestamp desc
```

## Starter workbook layout

1. API health: request count, failure rate, p95 duration by role.
2. Dependencies: failed dependency calls by target/result code.
3. Flight feed: quota-exhaustion count, fallback count, max snapshot age.
4. Maps broker: token-broker failures by reason.
5. Voice loop: p50/p95 stage latency for `stt`, `intent`, `command`,
   `read_back`, and `tts`.
