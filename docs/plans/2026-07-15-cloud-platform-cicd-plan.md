# Cloud Platform IaC & GitHub CI/CD Implementation Plan

| Field | Value |
| --- | --- |
| Product | ATCSimulator |
| Document | Cloud Platform IaC & GitHub CI/CD — Implementation Plan |
| Type | Plan |
| Version | 0.1 (Draft) |
| Date | 2026-07-15 |
| Author | ATCSimulator team |
| Status | Ready for execution |
| Classification | Confidential — anonymized |

**Related documents:** [design spec](../specs/2026-07-15-cloud-platform-cicd-design.md) · [SECURITY.md](../SECURITY.md) · [VERSIONING.md](../VERSIONING.md) · [AGENT_WORKFLOW.md](../../.github/agents/AGENT_WORKFLOW.md) · [NON_DELEGABLE_WORK.md](../../.github/agents/NON_DELEGABLE_WORK.md) · sprint issue #3

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy the sprint-1 App Service baseline (shared web shell + `flight-data-api` + `voice-agent-api`) to two cloud environments — SIT (auto on merge) and PROD (gated) — in Sweden Central, using GitHub Actions native `az` CLI + Bicep with OIDC federation.

**Architecture:** Reuse the existing RG-scoped `infra/main.bicep`; add per-environment parameter files and resource groups. Two workflows: `ci.yml` (build/test/lint) and `cd.yml` (deploy-sit → gated deploy-prod). The frontend gains an env-driven API base URL and the APIs gain CORS so the web tier can call the separate API App Services cross-origin. Cloud identity/RBAC bootstrap and the PROD gate are human-run (non-delegable).

**Tech Stack:** GitHub Actions, Azure CLI, Bicep, OIDC federation to Entra, App Service (Linux), Key Vault, Application Insights, React/Vite, ASP.NET Core minimal APIs, PowerShell.

---

## File Structure

### Application changes (enable cross-origin end-to-end)

- Modify: `src/web/atcsim-shell/src/vite-env.d.ts` — declare API base-URL env vars.
- Modify: `src/web/atcsim-shell/src/features/flight-data/aircraftApi.ts` — prefix base URL.
- Modify: `src/web/atcsim-shell/src/features/voice-agent/voiceSessionApi.ts` — prefix base URL.
- Modify: `src/apis/AtcSim.FlightDataApi/Program.cs` — add CORS from `Web__Origin`.
- Modify: `src/apis/AtcSim.VoiceAgentApi/Program.cs` — add CORS from `Web__Origin`.

### Infrastructure

- Create: `infra/parameters/sit.bicepparam`
- Create: `infra/parameters/prod.bicepparam`
- Modify: `infra/modules/webapp.bicep` — SPA startup command + `Web__Origin` note.

### CI/CD

- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/cd.yml`
- Create: `scripts/verify-environment.ps1`
- Create: `scripts/bootstrap-cicd.ps1` (human-run)

### Documentation

- Create: `docs/ALM.md` — environments, pipeline, bootstrap runbook, residency note.
- Modify: `docs/OPERATIONS.md` — cross-link the CI/CD runbook.

---

## Task 1: Frontend API base URL + API CORS

Enables the web tier (one App Service) to call the two API App Services on other
origins. Defaults keep same-origin behaviour so existing tests stay green.

**Files:**

- Modify: `src/web/atcsim-shell/src/vite-env.d.ts`
- Modify: `src/web/atcsim-shell/src/features/flight-data/aircraftApi.ts`
- Modify: `src/web/atcsim-shell/src/features/voice-agent/voiceSessionApi.ts`
- Modify: `src/apis/AtcSim.FlightDataApi/Program.cs`
- Modify: `src/apis/AtcSim.VoiceAgentApi/Program.cs`
- Test: `src/web/atcsim-shell/src/features/flight-data/aircraftApi.test.ts`

- [ ] **Step 1: Update the failing test to assert base-URL behaviour**

```ts
// src/web/atcsim-shell/src/features/flight-data/aircraftApi.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fetchAircraft } from './aircraftApi';

describe('fetchAircraft', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('requests aircraft with bounds query on the same origin by default', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [{ callsign: 'SWR123' }] }));
    await fetchAircraft('47.7,8.3,47.2,8.8');
    expect(fetch).toHaveBeenCalledWith('/api/aircraft?bounds=47.7%2C8.3%2C47.2%2C8.8', expect.any(Object));
  });

  it('prefixes the configured flight API base URL', async () => {
    vi.stubEnv('VITE_FLIGHT_API_BASE_URL', 'https://atcsim-flight.example.net');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));
    await fetchAircraft('1,2,3,4');
    expect(fetch).toHaveBeenCalledWith('https://atcsim-flight.example.net/api/aircraft?bounds=1%2C2%2C3%2C4', expect.any(Object));
  });
});
```

- [ ] **Step 2: Run the test to verify the new case fails**

Run: `npm run test --prefix src/web/atcsim-shell -- aircraftApi`
Expected: FAIL — the base-URL case fails because `aircraftApi.ts` ignores the env var.

- [ ] **Step 3: Declare the env vars**

```ts
// src/web/atcsim-shell/src/vite-env.d.ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ENTRA_CLIENT_ID: string;
  readonly VITE_ENTRA_TENANT_ID: string;
  readonly VITE_API_SCOPE: string;
  readonly VITE_FLIGHT_API_BASE_URL?: string;
  readonly VITE_VOICE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

- [ ] **Step 4: Prefix the base URL in the two clients**

```ts
// src/web/atcsim-shell/src/features/flight-data/aircraftApi.ts
import type { Aircraft } from './types';

const BASE_URL = import.meta.env.VITE_FLIGHT_API_BASE_URL ?? '';

export async function fetchAircraft(bounds: string): Promise<Aircraft[]> {
  const response = await fetch(`${BASE_URL}/api/aircraft?bounds=${encodeURIComponent(bounds)}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch aircraft');
  }

  return response.json();
}
```

```ts
// src/web/atcsim-shell/src/features/voice-agent/voiceSessionApi.ts
import type { VoiceTurnRequest, VoiceTurnResponse } from './types';

const BASE_URL = import.meta.env.VITE_VOICE_API_BASE_URL ?? '';

export async function sendVoiceTurn(request: VoiceTurnRequest): Promise<VoiceTurnResponse> {
  const response = await fetch(`${BASE_URL}/api/voice/respond`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error('Voice response failed');
  }

  return response.json();
}
```

- [ ] **Step 5: Add CORS to both APIs**

```csharp
// src/apis/AtcSim.FlightDataApi/Program.cs — add before var app = builder.Build();
var webOrigin = builder.Configuration["Web:Origin"];
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        if (!string.IsNullOrWhiteSpace(webOrigin))
        {
            policy.WithOrigins(webOrigin).AllowAnyHeader().AllowAnyMethod().AllowCredentials();
        }
    });
});
```

Add `app.UseCors();` immediately after `var app = builder.Build();`. Apply the same
two edits to `src/apis/AtcSim.VoiceAgentApi/Program.cs` (identical block).

- [ ] **Step 6: Run frontend + backend tests to verify pass**

Run: `npm run test --prefix src/web/atcsim-shell` then `dotnet test tests/apis/AtcSim.FlightDataApi.Tests/AtcSim.FlightDataApi.Tests.csproj` and `dotnet test tests/apis/AtcSim.VoiceAgentApi.Tests/AtcSim.VoiceAgentApi.Tests.csproj`
Expected: all pass (frontend 2 files; backend 2 + 3).

- [ ] **Step 7: Commit**

```bash
git add src/web/atcsim-shell/src src/apis/AtcSim.FlightDataApi/Program.cs src/apis/AtcSim.VoiceAgentApi/Program.cs
git commit -m "feat: env-driven api base url and cors for cross-origin e2e (refs #3)"
```

## Task 2: Environment parameter files + web SPA startup command

**Files:**

- Create: `infra/parameters/sit.bicepparam`
- Create: `infra/parameters/prod.bicepparam`
- Modify: `infra/modules/webapp.bicep`

- [ ] **Step 1: Create the SIT parameter file**

```bicep
// infra/parameters/sit.bicepparam
using '../main.bicep'

param location = 'swedencentral'
param prefix = 'atcsim'
param tags = {
  environment: 'sit'
  workload: 'atcsim-pocs'
}
```

- [ ] **Step 2: Create the PROD parameter file**

```bicep
// infra/parameters/prod.bicepparam
using '../main.bicep'

param location = 'swedencentral'
param prefix = 'atcsim'
param tags = {
  environment: 'prod'
  workload: 'atcsim-pocs'
}
```

- [ ] **Step 3: Add the SPA startup command to the web app module**

In `infra/modules/webapp.bicep`, inside `siteConfig`, add `appCommandLine` so the
Node App Service serves the built SPA:

```bicep
    siteConfig: {
      linuxFxVersion: 'NODE|20-lts'
      alwaysOn: true
      ftpsState: 'FtpsOnly'
      minTlsVersion: '1.2'
      appCommandLine: 'pm2 serve /home/site/wwwroot --no-daemon --spa'
      appSettings: [
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsightsConnectionString
        }
        {
          name: 'SCM_DO_BUILD_DURING_DEPLOYMENT'
          value: 'false'
        }
      ]
    }
```

(The `dist` output is prebuilt in CI, so `SCM_DO_BUILD_DURING_DEPLOYMENT` becomes `false`.)

- [ ] **Step 4: Validate the Bicep and parameter files**

Run: `az bicep build --file infra/main.bicep` then `az bicep build-params --file infra/parameters/sit.bicepparam` and `az bicep build-params --file infra/parameters/prod.bicepparam`
Expected: all compile with exit code 0 and no errors.

- [ ] **Step 5: Commit**

```bash
git add infra/parameters/sit.bicepparam infra/parameters/prod.bicepparam infra/modules/webapp.bicep
git commit -m "feat: add sit/prod bicep params and spa startup command (refs #3)"
```

## Task 3: CI workflow

**Files:**

- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create the CI workflow**

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  build-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '8.0.x'

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Backend tests
        run: |
          dotnet test tests/apis/AtcSim.FlightDataApi.Tests/AtcSim.FlightDataApi.Tests.csproj -c Release
          dotnet test tests/apis/AtcSim.VoiceAgentApi.Tests/AtcSim.VoiceAgentApi.Tests.csproj -c Release

      - name: Frontend tests and build
        working-directory: src/web/atcsim-shell
        run: |
          npm ci
          npm test
          npm run build

      - name: Bicep build
        run: az bicep build --file infra/main.bicep

      - name: Markdownlint
        run: npx --yes markdownlint-cli2 "**/*.md"
```

- [ ] **Step 2: Validate the workflow YAML**

Run: `npx --yes yaml-lint .github/workflows/ci.yml` (or open in an editor with YAML validation)
Expected: valid YAML, no parse errors.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add build-test workflow (refs #3)"
```

## Task 4: Environment verification script

**Files:**

- Create: `scripts/verify-environment.ps1`

- [ ] **Step 1: Create the verification script**

```powershell
# scripts/verify-environment.ps1
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)] [string] $WebUrl,
    [Parameter(Mandatory = $true)] [string] $FlightApiUrl,
    [Parameter(Mandatory = $true)] [string] $VoiceApiUrl,
    [string] $Bounds = '47.7,8.3,47.2,8.8'
)

$ErrorActionPreference = 'Stop'
$failures = @()

function Test-Endpoint {
    param([string] $Name, [scriptblock] $Check)
    try {
        & $Check
        Write-Host "PASS: $Name"
    }
    catch {
        Write-Host "FAIL: $Name - $($_.Exception.Message)"
        $script:failures += $Name
    }
}

Test-Endpoint 'flight-data /health' {
    $r = Invoke-WebRequest -UseBasicParsing "$FlightApiUrl/health" -TimeoutSec 30
    if ($r.StatusCode -ne 200) { throw "status $($r.StatusCode)" }
}

Test-Endpoint 'voice-agent /health' {
    $r = Invoke-WebRequest -UseBasicParsing "$VoiceApiUrl/health" -TimeoutSec 30
    if ($r.StatusCode -ne 200) { throw "status $($r.StatusCode)" }
}

Test-Endpoint 'aircraft returns live data' {
    $r = Invoke-RestMethod "$FlightApiUrl/api/aircraft?bounds=$([uri]::EscapeDataString($Bounds))" -TimeoutSec 60
    if (-not $r -or $r.Count -lt 1) { throw 'no aircraft returned' }
}

Test-Endpoint 'voice respond (mock)' {
    $body = @{ transcript = 'What does the aircraft selection PoC prove?'; audioBase64 = '' } | ConvertTo-Json
    $r = Invoke-RestMethod "$VoiceApiUrl/api/voice/respond" -Method Post -ContentType 'application/json' -Body $body -TimeoutSec 60
    if (-not $r.answerText) { throw 'no answerText' }
}

Test-Endpoint 'web root reachable' {
    $r = Invoke-WebRequest -UseBasicParsing $WebUrl -TimeoutSec 30
    if ($r.StatusCode -ne 200) { throw "status $($r.StatusCode)" }
}

if ($failures.Count -gt 0) {
    Write-Error "Verification failed: $($failures -join ', ')"
    exit 1
}

Write-Host 'All environment checks passed.'
```

- [ ] **Step 2: Validate the script parses**

Run: `pwsh -NoProfile -Command "[void][System.Management.Automation.Language.Parser]::ParseFile('scripts/verify-environment.ps1', [ref]$null, [ref]$null); 'parsed ok'"`
Expected: prints `parsed ok` with no parser errors.

- [ ] **Step 3: Commit**

```bash
git add scripts/verify-environment.ps1
git commit -m "test: add environment verification script (refs #3)"
```

## Task 5: CD workflow

**Files:**

- Create: `.github/workflows/cd.yml`

- [ ] **Step 1: Create the CD workflow**

```yaml
# .github/workflows/cd.yml
name: CD

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  id-token: write
  contents: read

env:
  LOCATION: swedencentral

jobs:
  deploy-sit:
    runs-on: ubuntu-latest
    environment: sit
    concurrency: deploy-sit
    steps:
      - uses: actions/checkout@v4
      - uses: azure/login@v2
        with:
          client-id: ${{ vars.AZURE_CLIENT_ID }}
          tenant-id: ${{ vars.AZURE_TENANT_ID }}
          subscription-id: ${{ vars.AZURE_SUBSCRIPTION_ID }}
      - uses: ./.github/actions/deploy-environment
        with:
          environment: sit
          resource-group: rg-atcsim-sit
          fr24-token: ${{ secrets.FR24_TOKEN }}
          entra-client-id: ${{ vars.WEB_CLIENT_ID }}
          entra-tenant-id: ${{ vars.AZURE_TENANT_ID }}
          api-scope: ${{ vars.API_SCOPE }}

  deploy-prod:
    runs-on: ubuntu-latest
    environment: prod
    needs: deploy-sit
    concurrency: deploy-prod
    steps:
      - uses: actions/checkout@v4
      - uses: azure/login@v2
        with:
          client-id: ${{ vars.AZURE_CLIENT_ID }}
          tenant-id: ${{ vars.AZURE_TENANT_ID }}
          subscription-id: ${{ vars.AZURE_SUBSCRIPTION_ID }}
      - uses: ./.github/actions/deploy-environment
        with:
          environment: prod
          resource-group: rg-atcsim-prod
          fr24-token: ${{ secrets.FR24_TOKEN }}
          entra-client-id: ${{ vars.WEB_CLIENT_ID }}
          entra-tenant-id: ${{ vars.AZURE_TENANT_ID }}
          api-scope: ${{ vars.API_SCOPE }}
```

- [ ] **Step 2: Create the composite deploy action**

```yaml
# .github/actions/deploy-environment/action.yml
name: Deploy environment
description: Provision infra and deploy the ATCSimulator baseline to one environment.
inputs:
  environment: { required: true }
  resource-group: { required: true }
  fr24-token: { required: true }
  entra-client-id: { required: true }
  entra-tenant-id: { required: true }
  api-scope: { required: true }
runs:
  using: composite
  steps:
    - name: Ensure resource group
      shell: bash
      run: az group create -n ${{ inputs.resource-group }} -l swedencentral

    - name: Provision infrastructure
      shell: bash
      run: |
        az deployment group create \
          -g ${{ inputs.resource-group }} \
          -f infra/main.bicep \
          -p infra/parameters/${{ inputs.environment }}.bicepparam

    - name: Read outputs
      id: outputs
      shell: bash
      run: |
        KV=$(az deployment group show -g ${{ inputs.resource-group }} -n main --query properties.outputs.keyVaultName.value -o tsv)
        WEB=$(az deployment group show -g ${{ inputs.resource-group }} -n main --query properties.outputs.webHostName.value -o tsv)
        FLIGHT=$(az deployment group show -g ${{ inputs.resource-group }} -n main --query properties.outputs.flightDataApiHostName.value -o tsv)
        VOICE=$(az deployment group show -g ${{ inputs.resource-group }} -n main --query properties.outputs.voiceAgentApiHostName.value -o tsv)
        echo "kv=$KV" >> "$GITHUB_OUTPUT"
        echo "web=https://$WEB" >> "$GITHUB_OUTPUT"
        echo "flight=https://$FLIGHT" >> "$GITHUB_OUTPUT"
        echo "voice=https://$VOICE" >> "$GITHUB_OUTPUT"

    - name: Seed FR24 secret
      shell: bash
      run: az keyvault secret set --vault-name ${{ steps.outputs.outputs.kv }} --name fr24-token --value "${{ inputs.fr24-token }}"

    - name: Set API CORS origin
      shell: bash
      run: |
        az webapp config appsettings set -g ${{ inputs.resource-group }} \
          --name $(basename ${{ steps.outputs.outputs.flight }} | cut -d. -f1) \
          --settings Web__Origin=${{ steps.outputs.outputs.web }}
        az webapp config appsettings set -g ${{ inputs.resource-group }} \
          --name $(basename ${{ steps.outputs.outputs.voice }} | cut -d. -f1) \
          --settings Web__Origin=${{ steps.outputs.outputs.web }}

    - uses: actions/setup-dotnet@v4
      with:
        dotnet-version: '8.0.x'

    - name: Publish and deploy APIs
      shell: bash
      run: |
        for svc in FlightDataApi VoiceAgentApi; do
          dotnet publish src/apis/AtcSim.$svc/AtcSim.$svc.csproj -c Release -o publish/$svc
          (cd publish/$svc && zip -r ../$svc.zip .)
        done
        az webapp deploy -g ${{ inputs.resource-group }} \
          --name $(basename ${{ steps.outputs.outputs.flight }} | cut -d. -f1) --type zip --src-path publish/FlightDataApi.zip
        az webapp deploy -g ${{ inputs.resource-group }} \
          --name $(basename ${{ steps.outputs.outputs.voice }} | cut -d. -f1) --type zip --src-path publish/VoiceAgentApi.zip

    - uses: actions/setup-node@v4
      with:
        node-version: '20'

    - name: Build and deploy web (env-specific)
      shell: bash
      working-directory: src/web/atcsim-shell
      env:
        VITE_ENTRA_CLIENT_ID: ${{ inputs.entra-client-id }}
        VITE_ENTRA_TENANT_ID: ${{ inputs.entra-tenant-id }}
        VITE_API_SCOPE: ${{ inputs.api-scope }}
        VITE_FLIGHT_API_BASE_URL: ${{ steps.outputs.outputs.flight }}
        VITE_VOICE_API_BASE_URL: ${{ steps.outputs.outputs.voice }}
      run: |
        npm ci
        npm run build
        (cd dist && zip -r ../web.zip .)
        az webapp deploy -g ${{ inputs.resource-group }} \
          --name $(basename ${{ steps.outputs.outputs.web }} | cut -d. -f1) --type zip --src-path web.zip

    - name: Verify environment
      shell: pwsh
      run: ./scripts/verify-environment.ps1 -WebUrl "${{ steps.outputs.outputs.web }}" -FlightApiUrl "${{ steps.outputs.outputs.flight }}" -VoiceApiUrl "${{ steps.outputs.outputs.voice }}"

    - name: Summary
      shell: bash
      run: |
        echo "### ${{ inputs.environment }} deployed" >> "$GITHUB_STEP_SUMMARY"
        echo "- Web: ${{ steps.outputs.outputs.web }}" >> "$GITHUB_STEP_SUMMARY"
        echo "- Flight API: ${{ steps.outputs.outputs.flight }}" >> "$GITHUB_STEP_SUMMARY"
        echo "- Voice API: ${{ steps.outputs.outputs.voice }}" >> "$GITHUB_STEP_SUMMARY"
```

- [ ] **Step 3: Validate the workflow and action YAML**

Run: `npx --yes yaml-lint .github/workflows/cd.yml .github/actions/deploy-environment/action.yml`
Expected: valid YAML, no parse errors.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/cd.yml .github/actions/deploy-environment/action.yml
git commit -m "ci: add gated cd workflow for sit and prod (refs #3)"
```

## Task 6: OIDC and resource-group bootstrap script (human-run)

**Files:**

- Create: `scripts/bootstrap-cicd.ps1`

- [ ] **Step 1: Create the bootstrap script**

```powershell
# scripts/bootstrap-cicd.ps1
# HUMAN-RUN (non-delegable): creates identity, RBAC, and resource groups.
# Requires: az login as an Owner of the subscription.
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)] [string] $SubscriptionId,
    [string] $Repo = 'urruegg/ATCSimulator',
    [string] $AppName = 'gh-atcsim-deployer',
    [string] $Location = 'swedencentral',
    [string[]] $Environments = @('sit', 'prod')
)

$ErrorActionPreference = 'Stop'
az account set --subscription $SubscriptionId

$app = az ad app create --display-name $AppName | ConvertFrom-Json
$appId = $app.appId
az ad sp create --id $appId | Out-Null
$sp = az ad sp show --id $appId | ConvertFrom-Json

foreach ($env in $Environments) {
    $rg = "rg-atcsim-$env"
    az group create -n $rg -l $Location | Out-Null
    $scope = "/subscriptions/$SubscriptionId/resourceGroups/$rg"
    az role assignment create --assignee $appId --role 'Contributor' --scope $scope | Out-Null
    az role assignment create --assignee $appId --role 'User Access Administrator' --scope $scope | Out-Null

    $cred = @{
        name      = "github-$env"
        issuer    = 'https://token.actions.githubusercontent.com'
        subject   = "repo:${Repo}:environment:$env"
        audiences = @('api://AzureADTokenExchange')
    } | ConvertTo-Json -Compress
    $cred | az ad app federated-credential create --id $appId --parameters '@-' | Out-Null
}

$tenantId = (az account show --query tenantId -o tsv)
Write-Host "AZURE_CLIENT_ID=$appId"
Write-Host "AZURE_TENANT_ID=$tenantId"
Write-Host "AZURE_SUBSCRIPTION_ID=$SubscriptionId"
Write-Host 'Add the values above as GitHub Environment variables for sit and prod.'
```

- [ ] **Step 2: Validate the script parses**

Run: `pwsh -NoProfile -Command "[void][System.Management.Automation.Language.Parser]::ParseFile('scripts/bootstrap-cicd.ps1', [ref]$null, [ref]$null); 'parsed ok'"`
Expected: prints `parsed ok`.

- [ ] **Step 3: Commit**

```bash
git add scripts/bootstrap-cicd.ps1
git commit -m "ci: add human-run oidc and resource-group bootstrap script (refs #3)"
```

## Task 7: Documentation — ALM runbook and residency note

**Files:**

- Create: `docs/ALM.md`
- Modify: `docs/OPERATIONS.md`

- [ ] **Step 1: Create the ALM runbook**

Create `docs/ALM.md` with the standard document header (per the Docs Agent
document-header standard) and these sections: environments table (dev local, sit,
prod); the CI/CD flow (mirror the Mermaid diagram from the design spec); the
human-run bootstrap runbook (run `scripts/bootstrap-cicd.ps1`, create the GitHub
Environments `sit`/`prod`, add the `prod` required reviewer, set variables
`AZURE_CLIENT_ID`/`AZURE_TENANT_ID`/`AZURE_SUBSCRIPTION_ID`/`WEB_CLIENT_ID`/`API_SCOPE`
and the `FR24_TOKEN` secret); the promotion/gate description; and the residency
traceability note (Sweden Central now; Switzerland North deferred for MVP personal
data, with the real-time-model GA caveat).

- [ ] **Step 2: Cross-link from OPERATIONS.md**

Add a line to `docs/OPERATIONS.md` linking `docs/ALM.md` for CI/CD and environment
operations.

- [ ] **Step 3: Validate markdown**

Run: `npx --yes markdownlint-cli2 "docs/ALM.md" "docs/OPERATIONS.md"`
Expected: `0 error(s)`.

- [ ] **Step 4: Commit**

```bash
git add docs/ALM.md docs/OPERATIONS.md
git commit -m "docs: add alm runbook and residency note (refs #3)"
```

## Task 8: Human-run cloud execution runbook (non-delegable)

This task is executed by a human with the Owner account; agents prepare, humans run.
See [NON_DELEGABLE_WORK.md](../../.github/agents/NON_DELEGABLE_WORK.md).

- [ ] **Step 1: Bootstrap identity and resource groups**

Run: `az login` then `pwsh scripts/bootstrap-cicd.ps1 -SubscriptionId 75102af9-fc92-45d4-99a8-5510a24b5421`
Expected: two resource groups created; app registration + federated credentials created; the three `AZURE_*` values printed.

- [ ] **Step 2: Configure GitHub Environments**

In GitHub → Settings → Environments, create `sit` and `prod`; add a required
reviewer to `prod`. On each environment set variables `AZURE_CLIENT_ID`,
`AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, `WEB_CLIENT_ID`, `API_SCOPE` and the
secret `FR24_TOKEN`.
Expected: both environments exist; `prod` shows a protection rule.

- [ ] **Step 3: Trigger the pipeline**

Merge this sprint's branch to `main` (or run the `CD` workflow via `workflow_dispatch`).
Expected: `deploy-sit` runs and the verification step passes; `deploy-prod` waits on the reviewer gate.

- [ ] **Step 4: Approve PROD and verify**

Approve the `prod` environment gate. After `deploy-prod` completes, open the PROD web
URL from the job summary and perform the manual walkthrough: sign in, select an
aircraft on the map, run the voice proof.
Expected: PoC works end-to-end in PROD (outcome 2). Record evidence in issue #3.

## Self-Review Notes

- Spec coverage: environments (Task 2/8), region/residency (Task 7), IaC params (Task 2), OIDC/RBAC (Task 6), CI (Task 3), CD gated promotion (Task 5), deployment mechanics (Task 5), verification (Task 4/8), secrets/config (Task 5/8), security guardrails (Task 6/7), responsibilities (Task 8), out-of-scope respected (no Foundry, no SWA, no semantic-release).
- Placeholder scan: no `TBD`/`TODO`; every code/YAML/script step contains full content.
- Type consistency: Bicep outputs referenced in the CD action (`keyVaultName`, `webHostName`, `flightDataApiHostName`, `voiceAgentApiHostName`) match the outputs defined in `infra/main.bicep`; env var names (`VITE_FLIGHT_API_BASE_URL`, `VITE_VOICE_API_BASE_URL`, `Web__Origin`) are consistent across app code and workflow.
