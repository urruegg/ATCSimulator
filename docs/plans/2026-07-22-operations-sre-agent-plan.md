# Plan — Operations / SRE Agent (AG-E-07)

| Field | Value |
| --- | --- |
| Product | ATCSimulator |
| Document | Implementation plan — Operations / SRE agent |
| Date | 2026-07-22 |
| Status | Draft (for review-gated PR) |
| Related issue | #16 |
| Spec | [2026-07-22-operations-sre-agent-design.md](../specs/2026-07-22-operations-sre-agent-design.md) |
| Classification | Public — anonymized demo |

## Milestones

1. **M1 — Agent definition (this PR).**
   - Add `.github/agents/operations.agent.md` (AG-E-07): role, when-to-use, signals,
     triage→issue loop, guardrails (read-only/propose-only/never-merge), handoffs.
   - Register in `AGENTS.md` §4 and `.github/copilot-instructions.md` §6.
   - Add `docs/runbooks/ops-triage.md` (starter KQL + decision tree + issue checklist).
   - Add this spec + plan. Validate markdownlint. **DoD:** docs lint-clean, cross-refs
     resolve, guardrails explicit. *(Depends on #15 for live signals but ships the
     governance/definition independently.)*

2. **M2 — Signal contract lock-in (after #15 merges).**
   - Reconcile custom-event/metric names with #15's ADR; adjust `ops-triage.md` KQL.
   - Verify the agent (read-only) can query the workspace in dev.

3. **M3 — First live triage dry-run.**
   - Run the runbook against dev telemetry; produce one sample issue + spec + plan to
     validate the loop end-to-end; capture evidence.

4. **M4 — Alerting-as-code (follow-up `enhancement`).**
   - Propose Azure Monitor alerts + a workbook (KQL-as-code) via SecDevOps; new ADR
     if an SLO/alerting architecture decision is introduced.

## Sequencing & dependencies

- M1 is independent and shippable now (docs/agent only).
- M2–M3 depend on **#15** (App Insights + Log Analytics) being merged/deployed.
- M4 depends on M3 outcomes.

## Guardrails (all milestones)

Read-only to prod; propose only; **never merge/approve**; no operational-ATC path
(`CON-01`); no PII in telemetry/issues (`NFR-20`); residency-aware (DP-18); human
gates (EA/RAI) and human merge preserved.

## Validation

- markdownlint-clean (`markdownlint-cli2 "**/*.md"`).
- Cross-references resolve (agent ↔ AGENTS.md ↔ copilot-instructions ↔ runbook ↔ spec/plan).
- No secrets, no PII, no operational-ATC connectivity introduced.
