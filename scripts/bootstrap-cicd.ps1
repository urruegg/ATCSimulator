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
foreach ($ns in 'Microsoft.Web', 'Microsoft.KeyVault', 'Microsoft.OperationalInsights', 'Microsoft.Insights', 'Microsoft.ManagedIdentity') {
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

$tenantId = (az account show --query tenantId -o tsv)
Write-Host "AZURE_CLIENT_ID=$appId"
Write-Host "AZURE_TENANT_ID=$tenantId"
Write-Host "AZURE_SUBSCRIPTION_ID=$SubscriptionId"
Write-Host 'Add the values above as GitHub Environment variables for sit and prod.'
