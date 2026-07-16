# Sprint — PoC Outcome and Next-Sprint Foundation

| Field | Value |
| --- | --- |
| Product | ATCSimulator |
| Document | Sprint — PoC Outcome and Next-Sprint Foundation |
| Type | Sprint |
| Version | 1.0 |
| Date | 2026-07-16 |
| Author | ATCSimulator team |
| Status | Active |
| Classification | Public — anonymized demo |

**Related documents:** [two-PoCs plan](../plans/2026-07-14-two-pocs-demo-foundation-implementation-plan.md) · [Voice Live plan](../plans/2026-07-15-voice-live-foundry-poc-implementation-plan.md) · [consolidation plan](../plans/2026-07-16-consolidate-poc-worktrees-into-main.md) · [PoC E2E validation runbook](../runbooks/poc-e2e-validation-runbook.md) · [CI/CD deployment runbook](../runbooks/cicd-deployment-runbook.md) · sprint issues #1, #3

---

## Scope

Closes the PoC phase (two PoCs on a shared Entra-protected shell) and records the validated foundation carried into the next sprint. Demo plane only (Scope 2): public/synthetic data, no personal data, no operational-ATC connectivity.

## PoC outcome — validated

Both PoCs are delivered, merged to `main`, deployed, and validated end-to-end.

- **PoC 1 — Aircraft selection:** live FR24 sandbox data via `flight-data-api`, aircraft list + selection UX in the signed-in shell (verified in-browser: `SAS7679` selected).
- **PoC 2 — Virtual pilot:** deterministic, schema-validated simulator-command boundary (server-side); mock virtual-pilot answer with sub-200 ms round-trip; synthetic-voice disclosure (`DP-16`).
- **CI/CD:** `main`-driven GitHub Actions deploys to SIT (auto) and PROD (reviewer gate); SIT green, including the added `what-if` preview step.
- **Auth:** Entra sign-in works end-to-end (web SPA + API scope) after fixing three environment gaps.

### Evidence

- Smoke test (`verify-environment.ps1`): 5/5 pass on SIT.
- Deterministic guardrail tests (`AtcSim.VoiceAgentApi.Tests`): 11/11 pass (out-of-range / unknown / missing-parameter rejections).
- Signed-in UI: aircraft selection + voice-proof round-trip (71 / 149 ms).
- CD: SIT + PROD deployed successfully; consolidation redeploy `deploy-sit` green.

### Fixes hardened into bootstrap (durable)

- Register `Microsoft.CognitiveServices` resource provider ([bootstrap-cicd.ps1](../../scripts/bootstrap-cicd.ps1)).
- Create service principals for the web + API app registrations — AADSTS650052 ([bootstrap-entra.ps1](../../scripts/bootstrap-entra.ps1)).
- Additively register deployed web hostnames as SPA redirect URIs — AADSTS50011 ([bootstrap-entra.ps1](../../scripts/bootstrap-entra.ps1)).

## Consolidation into main

- `feat/atcsim-two-pocs-foundation` and `feat/voice-live-foundry` were already merged; worktrees and branches removed.
- The unique flight-data Copilot/MCP enablement pack and the CD `what-if`/input-validation steps were brought over from `feat/cloud-platform-cicd` (which was stale) and merged to `main`.
- `feat/cloud-platform-cicd` is retained (local + remote) pending a manual decision; its unique work is already captured on `main`.

## Next-sprint foundation

- [ ] Provision an Azure Maps account + key and wire it into the shell so map tiles render (currently a placeholder host).
- [ ] Publish the Foundry virtual-pilot agent ([agents/voice-pilot/agent.yaml](../../agents/voice-pilot/agent.yaml)) and set `VoiceLive__AgentId` / `VoiceLive__ProjectId` on `voice-agent-api` to enable the live Voice Live speech-to-speech loop (runbook §5.2).
- [ ] Decide the fate of `feat/cloud-platform-cicd` (delete once confirmed fully superseded).
- [ ] Approve the PROD deployment gate when ready to promote the enablement pack + CD `what-if` step.

## Expected delivery evidence (next sprint)

- Live map tiles rendering with a selected aircraft.
- Live spoken read-back of an accepted command and rejection of an out-of-range command (runbook §5.2), captured as a recording.
- Golden-phraseology / command-mapping evals remain the merge gate.
