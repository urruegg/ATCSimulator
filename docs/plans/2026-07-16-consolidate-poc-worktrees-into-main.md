# Consolidate PoC Worktrees into Main Implementation Plan

| Field | Value |
| --- | --- |
| Product | ATCSimulator |
| Document | Consolidate PoC Worktrees into Main — Implementation Plan |
| Type | Plan |
| Version | 0.1 (Draft) |
| Date | 2026-07-16 |
| Author | ATCSimulator team |
| Status | Draft — ready to execute |
| Classification | Public — anonymized demo |

**Related documents:** [PoC E2E validation runbook](../runbooks/poc-e2e-validation-runbook.md) · [CI/CD deployment runbook](../runbooks/cicd-deployment-runbook.md) · [two-PoCs plan](./2026-07-14-two-pocs-demo-foundation-implementation-plan.md) · [Voice Live plan](./2026-07-15-voice-live-foundry-poc-implementation-plan.md) · [NON_DELEGABLE_WORK.md](../../.github/agents/NON_DELEGABLE_WORK.md)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate the three PoC feature branches/worktrees so `main` is the single clean foundation for the next sprint — bringing across only genuinely-unique work, validating `main` end-to-end against the runbook, then removing the stale worktrees and branches.

**Architecture:** `main` is already the source of truth: `feat/atcsim-two-pocs-foundation` (`f3dff1e`) and `feat/voice-live-foundry` (`ae48b30`) are **already merged**. `feat/cloud-platform-cicd` (`4fa90d5`) is **stale** — it branched before the voice-live merge, so a naive `git merge` would delete delivered files (voice-live, Foundry). Therefore we **cherry-pick only unique artifacts** (the copilot/MCP enablement pack) rather than merge, validate, and clean up. All destructive steps (branch/worktree deletion) require **explicit human approval**.

**Tech Stack:** git worktrees, .NET 8 (`dotnet build`/`test`), Node/Vite (`npm`), Bicep (`az bicep build`), markdownlint, GitHub CLI (`gh`), Azure CLI (`az`).

---

## Branch/worktree state (verified 2026-07-16)

| Branch | Tip | Merged into main? | Action |
| --- | --- | --- | --- |
| `feat/atcsim-two-pocs-foundation` | `f3dff1e` | ✅ Yes | Clean up worktree + branch |
| `feat/voice-live-foundry` | `ae48b30` | ✅ Yes | Clean up worktree + branch |
| `feat/cloud-platform-cicd` | `4fa90d5` | ❌ No (stale/divergent) | Cherry-pick unique work, then clean up |

Unique-to-`cloud-platform-cicd` assessment (3 commits ahead of main):

- `3f5f12f` — **copilot/MCP enablement pack (6 files, UNIQUE — not in main).**
- `b63654f` — FR24 base path / version header / reg mapping — **already in main** (`079f6f9`). Skip.
- `4fa90d5` — CD hardening (what-if, provider registration, validation, named deploys, oidc rename) — **partially in main**; port only unique bits (Task 3).

Uncommitted change to triage: `.worktrees/atcsim-cloud-platform-cicd/scripts/bootstrap-entra.ps1` (modified, not committed).

## File Structure

- Create (in main, from `3f5f12f`): `.github/agents/flight-data.agent.md`, `.github/instructions/flight-data.instructions.md`, `.github/prompts/add-flight-data-feature.prompt.md`, `.github/prompts/query-fr24-mcp.prompt.md`, `.vscode/mcp.json`, `docs/skills/flight-data-fr24/SKILL.md` — the flight-data Copilot enablement pack.
- Modify (maybe, Task 3): `.github/actions/deploy-environment/action.yml` — only if the stale branch's CD hardening has unique, still-relevant value.
- Modify: `docs/sprints/` sprint note — mark PoC complete / next-sprint foundation.
- No product source/infra changes are expected; `main` already contains the delivered PoC code.

---

## Task 1: Triage the uncommitted worktree change

**Files:**

- Inspect: `.worktrees/atcsim-cloud-platform-cicd/scripts/bootstrap-entra.ps1`

- [ ] **Step 1: Diff the uncommitted change**

Run: `git -C .worktrees/atcsim-cloud-platform-cicd diff -- scripts/bootstrap-entra.ps1`
Expected: shows the local edits. Compare against `main`'s current `scripts/bootstrap-entra.ps1` (which already has the SP-creation + additive redirect-URI fixes from commits `45ac0dd`/`921694a`).

- [ ] **Step 2: Decide keep vs discard**

Decision rule: if the change is already represented in `main` (SP creation, redirect URIs), it is **obsolete** → discard. If it contains anything new and valuable, capture it in Task 3.

- [ ] **Step 3: Discard the obsolete worktree edit (only if Step 2 = obsolete)**

Run: `git -C .worktrees/atcsim-cloud-platform-cicd checkout -- scripts/bootstrap-entra.ps1`
Expected: worktree is clean (`git -C .worktrees/atcsim-cloud-platform-cicd status --short` empty).

> No commit here — this only cleans an unneeded local edit so the worktree can be removed later.

## Task 2: Bring the unique Copilot/MCP enablement pack into main

Bring only the 6 unique files from `3f5f12f` onto `main` via an isolated worktree + `feat/` branch (repo PoC-phase model), so `main` stays protected by the normal flow.

**Files (all created on the new branch, copied from `3f5f12f`):**

- Create: `.github/agents/flight-data.agent.md`
- Create: `.github/instructions/flight-data.instructions.md`
- Create: `.github/prompts/add-flight-data-feature.prompt.md`
- Create: `.github/prompts/query-fr24-mcp.prompt.md`
- Create: `.vscode/mcp.json`
- Create: `docs/skills/flight-data-fr24/SKILL.md`

- [ ] **Step 1: Create an isolated worktree + branch from current main**

Run:

```powershell
git worktree add -b feat/consolidate-enablement-pack .worktrees/atcsim-consolidate 921694a
```

Expected: new worktree at `.worktrees/atcsim-consolidate` on `feat/consolidate-enablement-pack`.

- [ ] **Step 2: Restore the 6 unique files from `3f5f12f` into the new worktree**

Run:

```powershell
$files = @(
  '.github/agents/flight-data.agent.md',
  '.github/instructions/flight-data.instructions.md',
  '.github/prompts/add-flight-data-feature.prompt.md',
  '.github/prompts/query-fr24-mcp.prompt.md',
  '.vscode/mcp.json',
  'docs/skills/flight-data-fr24/SKILL.md'
)
foreach ($f in $files) { git -C .worktrees/atcsim-consolidate checkout 3f5f12f -- $f }
git -C .worktrees/atcsim-consolidate status --short
```

Expected: the 6 files appear staged/added; no other files changed.

- [ ] **Step 3: Sanity-check MCP config has no secrets**

Run: `git -C .worktrees/atcsim-consolidate show :.vscode/mcp.json`
Expected: no tokens/keys/connection strings inline (must use env/input references only). If a secret is present, replace with an input/env reference before committing (guardrail: no secrets in code).

- [ ] **Step 4: Lint the docs the pack adds**

Run: `npx markdownlint-cli2 ".worktrees/atcsim-consolidate/docs/skills/flight-data-fr24/SKILL.md" ".worktrees/atcsim-consolidate/.github/**/*.md"`
Expected: `Summary: 0 error(s)`. (If `npx` is blocked by the npm proxy, rely on the pre-commit hook in Step 5, which runs markdownlint locally.)

- [ ] **Step 5: Commit**

```bash
git -C .worktrees/atcsim-consolidate add .github docs/skills/flight-data-fr24 .vscode/mcp.json
git -C .worktrees/atcsim-consolidate commit -m "feat(dx): add flight-data FR24 copilot + MCP enablement pack (refs #3)"
```

Expected: pre-commit markdownlint passes; one commit created.

## Task 3: Evaluate and port unique CD hardening (conditional)

**Files:**

- Compare: `.github/actions/deploy-environment/action.yml` (main) vs the version at `4fa90d5`.

- [ ] **Step 1: Diff the CD action between main and the stale branch**

Run: `git diff main:.github/actions/deploy-environment/action.yml 4fa90d5:.github/actions/deploy-environment/action.yml`
Expected: shows differences. Main already has retry + FR24 app-setting + RP registration in bootstrap.

- [ ] **Step 2: Identify genuinely-unique, still-relevant hardening**

Candidates from `4fa90d5`: pre-deploy `what-if`, named deployments, extra validation. Keep only what is **not** in main **and** still valuable given main already registers the RP (`2c76074`) and validates via `verify-environment.ps1`.

- [ ] **Step 3: Apply the selected hardening on the Task 2 branch (only if Step 2 found value)**

Edit `.worktrees/atcsim-consolidate/.github/actions/deploy-environment/action.yml` to add only the selected steps (e.g., a `what-if` preview before `az deployment group create`). Show the exact YAML added.

- [ ] **Step 4: Validate the action file is well-formed**

Run: `Get-Content .worktrees/atcsim-consolidate/.github/actions/deploy-environment/action.yml | Out-Null` and visually confirm YAML indentation; optionally `az deployment group what-if` locally against `rg-atcsim-sit` if credentials allow.
Expected: file parses; no destructive change to the deploy flow.

- [ ] **Step 5: Commit (only if Step 3 applied)**

```bash
git -C .worktrees/atcsim-consolidate add .github/actions/deploy-environment/action.yml
git -C .worktrees/atcsim-consolidate commit -m "ci: port what-if preview + named deploy hardening from cicd PoC (refs #3)"
```

> If Step 2 finds nothing unique, record "CD hardening already in main — nothing to port" and skip Steps 3–5.

## Task 4: Full local validation on the consolidation branch

- [ ] **Step 1: Backend build + tests**

Run:

```powershell
dotnet test .worktrees/atcsim-consolidate/tests/apis/AtcSim.FlightDataApi.Tests/AtcSim.FlightDataApi.Tests.csproj --nologo -v quiet
dotnet test .worktrees/atcsim-consolidate/tests/apis/AtcSim.VoiceAgentApi.Tests/AtcSim.VoiceAgentApi.Tests.csproj --nologo -v quiet
```

Expected: both `Passed!` (FlightData 2, VoiceAgent 11).

- [ ] **Step 2: Frontend tests + build**

Run:

```powershell
Push-Location .worktrees/atcsim-consolidate/src/web/atcsim-shell; npm ci; npx vitest run; npm run build; Pop-Location
```

Expected: 6/6 tests pass; Vite build succeeds. (If `npm ci` is blocked by the age-gated proxy, use `npm install`.)

- [ ] **Step 3: Infra build**

Run: `az bicep build --file .worktrees/atcsim-consolidate/infra/main.bicep`
Expected: compiles (only the version-upgrade warning on stderr).

- [ ] **Step 4: Docs lint (whole repo)**

Run: `npx markdownlint-cli2 ".worktrees/atcsim-consolidate/**/*.md"`
Expected: `Summary: 0 error(s)`. (Fallback: the pre-commit hook already lints on each commit.)

## Task 5: Merge the consolidation branch into main

- [ ] **Step 1: Confirm main is current and clean**

Run: `git -C . fetch origin; git -C . status --short; git -C . log --oneline origin/main..main`
Expected: clean tree; nothing unpushed (or only expected commits).

- [ ] **Step 2: Merge --no-ff (repo policy)**

Run:

```bash
git merge --no-ff feat/consolidate-enablement-pack -m "Merge feat/consolidate-enablement-pack: flight-data copilot/MCP enablement pack (refs #3)"
```

Expected: merge commit created; the 6 pack files (and any Task 3 change) now on `main`.

- [ ] **Step 3: Push main**

Run: `git push origin main`
Expected: `main -> main` updated on origin. (Adding `.github/**` will trigger CD only if it also touches `src/**`/`infra/**`; the enablement pack does not, so no deploy is expected.)

## Task 6: End-to-end validation of main per the runbook

Follow [PoC E2E validation runbook](../runbooks/poc-e2e-validation-runbook.md) against SIT.

- [ ] **Step 1: Resolve SIT endpoints**

Run:

```powershell
$rg='rg-atcsim-sit'
$web='https://'+(az deployment group show -g $rg -n main --query properties.outputs.webHostName.value -o tsv)
$flight='https://'+(az deployment group show -g $rg -n main --query properties.outputs.flightDataApiHostName.value -o tsv)
$voice='https://'+(az deployment group show -g $rg -n main --query properties.outputs.voiceAgentApiHostName.value -o tsv)
```

Expected: three `azurewebsites.net` URLs.

- [ ] **Step 2: Smoke test (warm up first if cold)**

Run: `& ./scripts/verify-environment.ps1 -WebUrl $web -FlightApiUrl $flight -VoiceApiUrl $voice`
Expected: `All environment checks passed.` (If first run shows cold-start timeouts, re-hit `$flight/health` and `$web` once, then re-run.)

- [ ] **Step 3: PoC 1 + PoC 2 evidence**

Run:

```powershell
$b=[uri]::EscapeDataString('47.7,47.2,8.3,8.8')
Invoke-RestMethod "$flight/api/aircraft?bounds=$b" | Select-Object -First 3 callsign, aircraftType, altitudeFt
$body=@{ transcript='What does the aircraft selection PoC prove?'; audioBase64='' } | ConvertTo-Json
Invoke-RestMethod "$voice/api/voice/respond" -Method Post -ContentType 'application/json' -Body $body | Select-Object answerText, totalLatencyMs
```

Expected: ≥1 live aircraft; non-empty `answerText`. **Evidence:** capture both outputs.

- [ ] **Step 4: Signed-in UI spot check (human, browser)**

Sign in to `$web`; confirm the aircraft list + selection and the voice-proof round-trip. **Evidence:** screenshots. (Live Voice Live speech-to-speech remains runbook §5.2, gated on Foundry agent publish — out of scope here.)

## Task 7: Clean up worktrees and branches (REQUIRES EXPLICIT HUMAN APPROVAL)

> **Destructive — do not run without explicit user approval.** Deletions are non-delegable ([NON_DELEGABLE_WORK.md](../../.github/agents/NON_DELEGABLE_WORK.md)). Confirm each branch is merged before deleting.

- [ ] **Step 1: Re-confirm merge status**

Run: `git branch --merged main | Select-String 'feat/'`
Expected: lists `feat/atcsim-two-pocs-foundation`, `feat/voice-live-foundry`, and `feat/consolidate-enablement-pack`. `feat/cloud-platform-cicd` should now contribute nothing unique (verified in Tasks 1–3).

- [ ] **Step 2: Remove worktrees**

Run:

```powershell
git worktree remove .worktrees/atcsim-two-pocs-foundation
git worktree remove .worktrees/atcsim-voice-live-foundry
git worktree remove .worktrees/atcsim-consolidate
git worktree remove .worktrees/atcsim-cloud-platform-cicd
```

Expected: worktrees removed; `git worktree list` shows only the main checkout.

- [ ] **Step 3: Delete local branches (after approval)**

Run:

```powershell
git branch -d feat/atcsim-two-pocs-foundation feat/voice-live-foundry feat/consolidate-enablement-pack
```

Expected: each reports "Deleted branch …". For `feat/cloud-platform-cicd`, only delete once its unique work is confirmed captured; if `git branch -d` refuses (not fully merged), **stop and re-review** rather than forcing `-D`.

- [ ] **Step 4: Delete remote branches (after approval, per branch)**

Run:

```powershell
git push origin --delete feat/voice-live-foundry
git push origin --delete feat/cloud-platform-cicd
```

Expected: remote branches removed. (Keep any branch still referenced by an open PR.)

## Task 8: Mark the PoC complete and set the next-sprint foundation

**Files:**

- Modify: the current sprint note under `docs/sprints/` (and its `README.md` index if present).

- [ ] **Step 1: Record the outcome**

Add a short "PoC outcome" subsection: both PoCs validated on SIT (smoke 5/5, guardrail 11/11, signed-in UI), CD green to SIT+PROD, auth blockers fixed (SP creation, redirect URIs, RP registration). Link the [PoC E2E validation runbook](../runbooks/poc-e2e-validation-runbook.md).

- [ ] **Step 2: List next-sprint foundation items**

Record the two known open items: (1) wire an Azure Maps account/key so map tiles render; (2) publish the Foundry agent + set `VoiceLive__AgentId`/`VoiceLive__ProjectId` to enable the live Voice Live loop (runbook §5.2).

- [ ] **Step 3: Lint + commit + push**

```bash
git add docs/sprints
git commit -m "docs(sprint): record PoC outcome and next-sprint foundation"
git push origin main
```

Expected: pre-commit markdownlint passes; `main` updated on origin.

---

## Traceability

- Consolidates the delivered work of the [two-PoCs plan](./2026-07-14-two-pocs-demo-foundation-implementation-plan.md) and [Voice Live plan](./2026-07-15-voice-live-foundry-poc-implementation-plan.md), both already merged.
- Brings across the unique flight-data enablement pack (`refs #3`) from `feat/cloud-platform-cicd`.
- Validation gate = [PoC E2E validation runbook](../runbooks/poc-e2e-validation-runbook.md); golden-phraseology/command-mapping guardrail tests remain the merge gate.
- Destructive cleanup (Task 7) is gated on explicit human approval per [NON_DELEGABLE_WORK.md](../../.github/agents/NON_DELEGABLE_WORK.md).

## Self-review notes

- **No naive merge of `feat/cloud-platform-cicd`** — it is stale and would revert the voice-live/Foundry files; only unique artifacts are cherry-picked (Task 2/3).
- **No secrets** — Task 2 Step 3 explicitly checks `.vscode/mcp.json`.
- **Deletes gated** — Task 7 requires explicit approval and uses safe `-d` (not `-D`).
- **Every task has exact commands and expected outputs**; validation uses existing build/test/lint tooling and the runbook.
