# scripts/bootstrap-cicd.ps1
# HUMAN-RUN (non-delegable): creates identity, RBAC, and resource groups.
# Requires: az login as an Owner of the subscription.
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)] [string] $SubscriptionId,
    [string] $Repo = 'urruegg/ATCSimulator',
    [string] $AppName = 'gh-oidc-atcsim',
    [string] $Location = 'swedencentral',
    [string[]] $Environments = @('sit', 'prod')
)

$ErrorActionPreference = 'Stop'
az account set --subscription $SubscriptionId

# Register resource providers used by the infra (subscription-scoped, one-time).
# The least-privilege deployer identity is RG-scoped and cannot self-register these.
# Microsoft.Maps/Cdn/Network back the shared platform (Azure Maps, Azure Front Door, Azure DNS).
foreach ($ns in 'Microsoft.Web', 'Microsoft.KeyVault', 'Microsoft.OperationalInsights', 'Microsoft.Insights', 'Microsoft.ManagedIdentity', 'Microsoft.CognitiveServices', 'Microsoft.Maps', 'Microsoft.Cdn', 'Microsoft.Network') {
    az provider register --namespace $ns | Out-Null
}

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
    # Data-plane write access so the deploy workflow can seed Key Vault secrets (fr24-token).
    az role assignment create --assignee $appId --role 'Key Vault Secrets Officer' --scope $scope | Out-Null

    $cred = @{
        name      = "github-$env"
        issuer    = 'https://token.actions.githubusercontent.com'
        subject   = "repo:${Repo}:environment:$env"
        audiences = @('api://AzureADTokenExchange')
    } | ConvertTo-Json -Compress
    $cred | az ad app federated-credential create --id $appId --parameters '@-' | Out-Null
}

# --- Shared cross-solution platform (RG 'swissshub': Azure DNS + Front Door) -------
# The shared template (infra/shared/main.bicep) is *subscription-scoped* and creates
# the 'swissshub' RG itself, so CD runs `az deployment sub create`. The 'deploy-shared'
# CD job reuses the 'sit' federated credential/environment (it runs before deploy-sit),
# so no extra federated credential is needed.
$sharedRg = 'swissshub'
$dnsZoneContributorRoleId = 'befefa01-2a29-4197-83a8-272ff33ce314' # DNS Zone Contributor (built-in)
az group create -n $sharedRg -l $Location | Out-Null
$sharedScope = "/subscriptions/$SubscriptionId/resourceGroups/$sharedRg"
# Manage shared-RG resources (DNS zone, Front Door profile) — RG-scoped least privilege.
az role assignment create --assignee $appId --role 'Contributor' --scope $sharedScope 2>$null | Out-Null
# Data-plane: create/update DNS record sets (apex/CNAME/_dnsauth TXT) for custom domains + TLS.
az role assignment create --assignee $appId --role $dnsZoneContributorRoleId --scope $sharedScope 2>$null | Out-Null

# Subscription-scoped Contributor: REQUIRED so `az deployment sub create` can create the
# 'swissshub' RG via the subscription-scoped shared template. This is intentionally broader
# than the RG-scoped least-privilege grants above; it is the minimum role that allows a
# subscription deployment to create a resource group. Scope tighter (pre-create the RG
# out-of-band and drop this grant) if the broader blast radius is unacceptable.
$subScope = "/subscriptions/$SubscriptionId"
az role assignment create --assignee $appId --role 'Contributor' --scope $subScope 2>$null | Out-Null

$tenantId = (az account show --query tenantId -o tsv)
Write-Host "AZURE_CLIENT_ID=$appId"
Write-Host "AZURE_TENANT_ID=$tenantId"
Write-Host "AZURE_SUBSCRIPTION_ID=$SubscriptionId"
Write-Host 'Add the values above as GitHub Environment variables for sit and prod.'
