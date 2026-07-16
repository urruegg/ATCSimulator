# scripts/bootstrap-entra.ps1
# HUMAN-RUN: creates the web (SPA) and API app registrations for user sign-in, and
# (optionally) grants the data-plane "Foundry User" role so human builders can
# create agents in the Foundry portal.
# Requires: az login with rights to create app registrations (and, for the Foundry
# role assignment, rights to write role assignments on the target account).
param(
  [Parameter(Mandatory = $true)] [string] $TenantId,
  [Parameter(Mandatory = $true)] [string] $SubscriptionId,
  [string] $Prefix = "atcsim",
  [string[]] $WebRedirectUris = @("http://localhost:5173"),
  # Optional: grant the data-plane "Foundry User" role (required to build agents in
  # the Foundry portal; otherwise it blocks with "You don't have permission to
  # build agents in this project."). When -FoundryAccountName and -ResourceGroup
  # are supplied, each principal in -FoundryUserObjectIds (defaults to the
  # signed-in user) is granted the role at the account scope.
  [string] $FoundryAccountName,
  [string] $ResourceGroup,
  [string[]] $FoundryUserObjectIds = @()
)

$ErrorActionPreference = "Stop"
az account set --subscription $SubscriptionId | Out-Null

$webName = "$Prefix-web"
$apiName = "$Prefix-api"

# Web app (SPA platform for MSAL.js auth-code + PKCE). Reuse if it already exists.
$webApp = az ad app list --display-name $webName --query "[0]" -o json | ConvertFrom-Json
if (-not $webApp) { $webApp = az ad app create --display-name $webName --sign-in-audience AzureADMyOrg | ConvertFrom-Json }
# Merge (union) with any already-registered SPA redirect URIs so re-running with
# deployed sit/prod hostnames is additive and never drops existing entries.
$existingUris = az ad app show --id $webApp.appId --query "spa.redirectUris" -o json | ConvertFrom-Json
if (-not $existingUris) { $existingUris = @() }
$mergedUris = @($existingUris + $WebRedirectUris | Where-Object { $_ } | Select-Object -Unique)
$spaBody = @{ spa = @{ redirectUris = $mergedUris } } | ConvertTo-Json -Depth 5
$spaFile = New-TemporaryFile
Set-Content -Path $spaFile -Value $spaBody -Encoding utf8
az rest --method PATCH --uri "https://graph.microsoft.com/v1.0/applications/$($webApp.id)" --headers "Content-Type=application/json" --body "@$spaFile" | Out-Null
Remove-Item $spaFile -Force

# API app with an access_as_user scope. Reuse if it exists; the identifier URI
# must contain the app ID per the default tenant policy.
$apiApp = az ad app list --display-name $apiName --query "[0]" -o json | ConvertFrom-Json
if (-not $apiApp) { $apiApp = az ad app create --display-name $apiName --sign-in-audience AzureADMyOrg | ConvertFrom-Json }
$apiIdentifierUri = "api://$($apiApp.appId)"
az ad app update --id $apiApp.appId --identifier-uris $apiIdentifierUri | Out-Null
$scope = @{
  adminConsentDescription = "Access flight and voice APIs"
  adminConsentDisplayName = "Access ATCSim APIs"
  id                      = [guid]::NewGuid().Guid
  isEnabled               = $true
  type                    = "User"
  userConsentDescription  = "Allow access to APIs"
  userConsentDisplayName  = "Access ATCSim APIs"
  value                   = "access_as_user"
}
$apiBody = @{ api = @{ oauth2PermissionScopes = @($scope) } } | ConvertTo-Json -Depth 6
$apiFile = New-TemporaryFile
Set-Content -Path $apiFile -Value $apiBody -Encoding utf8
az rest --method PATCH --uri "https://graph.microsoft.com/v1.0/applications/$($apiApp.id)" --headers "Content-Type=application/json" --body "@$apiFile" | Out-Null
Remove-Item $apiFile -Force

# Ensure a service principal (enterprise app) exists for each app registration.
# Token issuance for the API scope requires the API to have a service principal
# in this tenant; without it, sign-in fails with AADSTS650052.
foreach ($appId in @($webApp.appId, $apiApp.appId)) {
  $existingSp = az ad sp list --filter "appId eq '$appId'" --query "[0].id" -o tsv
  if (-not $existingSp) { az ad sp create --id $appId | Out-Null }
}

# Grant the data-plane "Foundry User" role so human builders can create agents in
# the Foundry portal. Idempotent; only runs when a Foundry account is supplied.
# RBAC propagation can take a few minutes on the Cognitive Services data plane, so
# a hard refresh / re-login may be needed before the portal reflects the change.
if ($FoundryAccountName -and $ResourceGroup) {
  $foundryScope = "/subscriptions/$SubscriptionId/resourceGroups/$ResourceGroup/providers/Microsoft.CognitiveServices/accounts/$FoundryAccountName"
  $principals = @($FoundryUserObjectIds | Where-Object { $_ })
  if (-not $principals) { $principals = @(az ad signed-in-user show --query id -o tsv) }
  foreach ($principalId in $principals) {
    $has = az role assignment list --assignee $principalId --scope $foundryScope --query "[?roleDefinitionName=='Foundry User'] | length(@)" -o tsv
    if ($has -eq "0") {
      az role assignment create --assignee $principalId --role "Foundry User" --scope $foundryScope | Out-Null
      Write-Host "Assigned 'Foundry User' to $principalId on $FoundryAccountName"
    }
    else {
      Write-Host "'Foundry User' already assigned to $principalId on $FoundryAccountName"
    }
  }
}

Write-Host "TENANT_ID=$TenantId"
Write-Host "WEB_CLIENT_ID=$($webApp.appId)"
Write-Host "API_CLIENT_ID=$($apiApp.appId)"
Write-Host "API_SCOPE=$apiIdentifierUri/access_as_user"
Write-Host "NOTE: after the first deploy, re-run this script with the deployed web hostnames to register them as SPA redirect URIs (additive), e.g.:"
Write-Host "  ./scripts/bootstrap-entra.ps1 -TenantId <t> -SubscriptionId <s> -WebRedirectUris @('http://localhost:5173','https://<sit-web-host>/','https://<prod-web-host>/')"
Write-Host "  (MSAL uses redirectUri '/', so include the trailing slash on each hostname.)"
Write-Host "NOTE: to let a human build agents in the Foundry portal, grant the 'Foundry User' role, e.g.:"
Write-Host "  ./scripts/bootstrap-entra.ps1 -TenantId <t> -SubscriptionId <s> -FoundryAccountName <foundry-acct> -ResourceGroup <rg> [-FoundryUserObjectIds @('<oid1>','<oid2>')]"
Write-Host "  (Data-plane RBAC can take a few minutes to propagate; hard refresh or re-login in the portal afterward.)"
