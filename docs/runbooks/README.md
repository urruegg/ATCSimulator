# Runbooks

| Field | Value |
| --- | --- |
| Product | ATCSimulator |
| Document | Runbooks — Folder Guide |
| Type | Index |
| Version | 1.0 |
| Date | 2026-07-15 |
| Author | ATCSimulator team |
| Status | Active |
| Classification | Public — anonymized demo |

> Every document in this folder must begin with the standard header table — see the [Docs Agent](../../.github/agents/docs.agent.md) document-header standard.

Central location for operational runbooks — the step-by-step procedures an operator
follows to bootstrap, deploy, verify, and recover the ATCSimulator environments.

Recommended filename pattern:

- `<topic>-runbook.md`

Each runbook should:

- state its prerequisites and who may run it (note any non-delegable steps)
- give exact, ordered commands with expected outcomes
- link back to the governing spec, plan, or ADR

## Index

- [cicd-deployment-runbook.md](./cicd-deployment-runbook.md) — bootstrap, deploy, and verify the SIT and PROD cloud environments.
- [poc-e2e-validation-runbook.md](./poc-e2e-validation-runbook.md) — validate the two PoCs end-to-end on SIT and capture the PoC evidence.
