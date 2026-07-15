# KPI Baseline for Delegated Delivery — ATCSimulator

Version: 1.0
Date: 2026-07-15
Status: Active (Initial Baseline)

## Scope

Initial baseline for agent-assisted delivery quality and speed on ATCSimulator.
Metrics blend generic delivery health with ATCSimulator-specific quality gates
(phraseology fidelity, latency budget, residency/segregation, RAI).

## Baseline method

- Use a rolling sample of the last 10 merged PRs for first calibration.
- Manual extraction is acceptable for this initial version.
- Replace `TBD` with measured values at the next sprint update.

## Delivery metrics

| Metric | Baseline source | Baseline (initial) | Target (next sprint) |
| --- | --- | --- | --- |
| PR cycle time (open to merge) | Last 10 merged PRs | TBD | -20% |
| Review rework rounds per PR | PR comment threads | TBD | -25% |
| Missing docs/ADR/traceability defects | PR review findings | TBD | -50% |
| Failed CI runs caused by policy misses | CI history | TBD | -30% |
| Agent-completed PR ratio | Tagged pilot PRs | Pilot reference established | >= 30% in pilot scope |

## ATCSimulator quality-gate metrics

| Metric | Baseline source | Baseline (initial) | Target (next sprint) |
| --- | --- | --- | --- |
| Golden-phraseology regression rate | Eval runs ([AI.md](../../docs/AI.md) §7) | TBD | 0 regressions merged |
| Command-mapping accuracy (false command rate) | Eval runs (`NFR-21`) | TBD | false rate -> 0 |
| Real-time latency budget adherence (p95) | Integration runs (`NFR-01`) | TBD | within budget |
| IaC-scan / policy-as-code findings at merge | GHAS + IaC scan (`NFR-16`) | TBD | 0 high/critical |
| Residency/segregation test pass rate | Release check (`NFR-19`) | TBD | 100% |

## Notes

1. First pilot reference: the two-PoCs demo foundation sprint (Tasks 1-8), merged
   to `main` (merge `b1aa56a`) and tracked by issue #1.
2. Pilot evidence establishes process feasibility, not final KPI maturity.
3. Replace `TBD` with measured values during next-sprint planning.
