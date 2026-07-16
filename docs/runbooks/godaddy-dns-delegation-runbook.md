# GoDaddy → Azure DNS Delegation Runbook — `swissshub.com`

| Field | Value |
| --- | --- |
| Product | ATCSimulator |
| Document | GoDaddy → Azure DNS Delegation Runbook — swissshub.com |
| Type | Runbook |
| Version | 0.1 (Draft) |
| Date | 2026-07-16 |
| Author | ATCSimulator team |
| Status | Active |
| Classification | Public — anonymized demo |

**Related documents:** [ADR-0005 shared platform](../adr/ADR-0005-shared-platform-frontdoor-dns.md) · [design spec](../specs/2026-07-16-zrh-realflight-ux-shared-platform-design.md) · [CI/CD deployment runbook](./cicd-deployment-runbook.md) · [NON_DELEGABLE_WORK.md](../../.github/agents/NON_DELEGABLE_WORK.md) · GitHub issue #5

---

## Purpose

Delegate the public domain `swissshub.com` from **GoDaddy** to the shared **Azure DNS** zone (in the `swissshub` resource group), so Azure becomes authoritative and the Front Door custom domains (`app`/`appsit`/`api`/`apisit`.atcsim.swissshub.com) can validate and obtain managed TLS.

## Roles

- **Domain owner (human, non-delegable):** performs the nameserver change in the GoDaddy account. This is a [non-delegable](../../.github/agents/NON_DELEGABLE_WORK.md) manual step.
- **Azure Owner/Contributor:** deploys the shared platform (creates the DNS zone).

## Prerequisites

- The shared platform is deployed (Azure DNS zone `swissshub.com` exists in RG `swissshub`) — via the CD `deploy-shared` job or `az deployment sub create --location swedencentral --template-file infra/shared/main.bicep --name shared-platform`.
- Access to the GoDaddy account that owns `swissshub.com`.
- `az login` with at least Reader on RG `swissshub`.

## 1. Read the Azure name servers

```powershell
az network dns zone show -g swissshub -n swissshub.com --query nameServers -o tsv
```

Expected: four hostnames like `ns1-NN.azure-dns.com`, `ns2-NN.azure-dns.net`, `ns3-NN.azure-dns.org`, `ns4-NN.azure-dns.info`. Copy all four (drop any trailing dot).

## 2. Set the nameservers at GoDaddy (human, non-delegable)

- [ ] Sign in to GoDaddy → **My Products** → `swissshub.com` → **DNS** / **Manage DNS**.
- [ ] Under **Nameservers**, choose **Change** → **Enter my own nameservers (advanced)**.
- [ ] Enter the **four** Azure name servers from step 1 (no trailing dots). Remove any GoDaddy defaults.
- [ ] **Save**. GoDaddy shows a warning that this moves DNS control to Azure — confirm.

> Do NOT keep GoDaddy A/CNAME records for this domain — Azure DNS is now authoritative. Manage all records in the Azure zone.

## 3. Verify delegation propagated

```powershell
Resolve-DnsName -Type NS swissshub.com | Select-Object NameHost
```

Expected: the four `*.azure-dns.*` name servers. Propagation is usually minutes but can take up to 24–48 h. Re-check until the Azure NS appear.

## 4. Confirm downstream validation

Once delegation resolves, the Front Door custom domains validate automatically (the `_dnsauth.*` TXT + `CNAME` records are created in the Azure zone by the shared deploy):

```powershell
az afd custom-domain list --profile-name fdswissshub -g swissshub --query "[].{domain:hostName,state:domainValidationState}" -o table
```

Expected: each custom domain reaches `Approved`; managed certificates issue shortly after. Then verify HTTPS reachability per [poc-e2e-validation-runbook.md](./poc-e2e-validation-runbook.md) §7.3.

## 5. Rollback

To revert, set the GoDaddy nameservers back to **GoDaddy defaults** (Change → **GoDaddy nameservers**). DNS control returns to GoDaddy; Azure-zone records stop resolving publicly. No Azure resources are deleted by this step.
