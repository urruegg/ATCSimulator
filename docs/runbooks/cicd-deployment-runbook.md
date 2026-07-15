# CI/CD Deployment Runbook — SIT & PROD

| Field | Value |
| --- | --- |
| Product | ATCSimulator |
| Document | CI/CD Deployment Runbook — SIT & PROD |
| Type | Runbook |
| Version | 0.1 (Draft) |
| Date | 2026-07-15 |
| Author | ATCSimulator team |
| Status | Active |
| Classification | Confidential — anonymized |

**Related documents:** [ALM.md](../ALM.md) · [cloud CI/CD design](../specs/2026-07-15-cloud-platform-cicd-design.md) · [cloud CI/CD plan](../plans/2026-07-15-cloud-platform-cicd-plan.md) · [NON_DELEGABLE_WORK.md](../../.github/agents/NON_DELEGABLE_WORK.md) · sprint issue #3

---

## Purpose

Bootstrap, deploy, verify, and recover the two cloud environments (`sit`, `prod`) for
the ATCSimulator baseline (web shell + `flight-data-api` + `voice-agent-api`) in
Sweden Central. Deployment is GitHub Actions native (`az` CLI + Bicep) with OIDC.

## Roles

- **Human operator (Owner)** runs the one-time bootstrap and approves the PROD gate.
  These steps are **non-delegable** ([NON_DELEGABLE_WORK.md](../../.github/agents/NON_DELEGABLE_WORK.md)).
- **CI/CD** performs all deployment steps automatically once bootstrap is complete.

## Prerequisites

- `az login` as an **Owner** of subscription `75102af9-fc92-45d4-99a8-5510a24b5421`.
- A valid **FR24 sandbox token**.
- Repository admin access to configure GitHub Environments.

## 1. One-time bootstrap (human-run)

- [ ] Sign in and run the bootstrap script:

```powershell
az login
pwsh scripts/bootstrap-cicd.ps1 -SubscriptionId 75102af9-fc92-45d4-99a8-5510a24b5421
```

Expected: resource groups `rg-atcsim-sit` and `rg-atcsim-prod` created; the
`gh-atcsim-deployer` app registration + federated credentials created; the script
prints `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`.

## 2. Configure GitHub Environments (human-run)

- [ ] In GitHub → Settings → Environments, create `sit` and `prod`.
- [ ] Add a **required reviewer** to `prod`.
- [ ] On **both** environments set variables `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`,
  `AZURE_SUBSCRIPTION_ID`, `WEB_CLIENT_ID`, `API_SCOPE`, and the secret `FR24_TOKEN`.

Expected: both environments exist; `prod` shows a protection rule.

## 3. Trigger a deployment

- [ ] Merge to `main` (or run the `CD` workflow via `workflow_dispatch`).

Expected: `deploy-sit` provisions infra, deploys the apps, seeds the FR24 secret,
sets the API CORS origin, and runs `scripts/verify-environment.ps1`. `deploy-prod`
waits on the reviewer gate.

## 4. SIT verification (automatic gate)

The `Verify environment` step runs the checks below; all must pass before the PROD
gate opens:

- both APIs `/health` return 200;
- `GET /api/aircraft?bounds=…` returns at least one live FR24 aircraft;
- `POST /api/voice/respond` returns a mock answer;
- web root returns 200.

If it fails, read the job log, fix the root cause, and re-run.

## 5. PROD gate and manual user-verification (human-run)

- [ ] Approve the `prod` environment gate in the workflow run.
- [ ] Open the PROD web URL from the job summary and walk through: sign in → select
  an aircraft on the map → run the voice proof.
- [ ] Record the evidence (screenshots / notes) in sprint issue #3.

Expected: the PoC works end-to-end in PROD.

## 6. Rollback

- Redeploy the last-known-good commit by re-running `CD` from that ref, or revert the
  offending merge commit on `main` and let `CD` redeploy.
- Infra is idempotent (`az deployment group create` re-applies `main.bicep`).
- For identity/RBAC or destructive resource changes, require explicit Owner approval
  ([NON_DELEGABLE_WORK.md](../../.github/agents/NON_DELEGABLE_WORK.md)).

## 7. Residency note

SIT and PROD run in **Sweden Central (EU)** to showcase the current Microsoft stack;
the PoC/Demo uses public/synthetic data only. Personal/production data and classic
STT/TTS for the MVP require **Switzerland North** (DP-18) and are documented and
deferred; the real-time speech model is not GA in Switzerland North as of Jul 2026,
so a future in-country plane may need the EU Data Zone or classic STT+TTS. See
[ALM.md](../ALM.md) section 5.
