param(
  [Parameter(Mandatory = $true)] [string] $TenantId,
  [Parameter(Mandatory = $true)] [string] $SubscriptionId,
  [string] $Prefix = "atcsim"
)

$ErrorActionPreference = "Stop"

az account set --subscription $SubscriptionId | Out-Null

$webName = "$Prefix-web-dev"
$apiName = "$Prefix-api-dev"

$webApp = az ad app create --display-name $webName --web-redirect-uris "http://localhost:5173" "https://$webName.azurewebsites.net" | ConvertFrom-Json
$apiApp = az ad app create --display-name $apiName --identifier-uris "api://$apiName" | ConvertFrom-Json

$scopeId = [guid]::NewGuid().Guid
$scopePayload = "[{\"adminConsentDescription\":\"Access flight and voice APIs\",\"adminConsentDisplayName\":\"Access ATCSim APIs\",\"id\":\"$scopeId\",\"isEnabled\":true,\"type\":\"User\",\"userConsentDescription\":\"Allow access to APIs\",\"userConsentDisplayName\":\"Access ATCSim APIs\",\"value\":\"access_as_user\"}]"

az ad app update --id $apiApp.appId --set "api.oauth2PermissionScopes=$scopePayload" | Out-Null

Write-Host "TENANT_ID=$TenantId"
Write-Host "WEB_CLIENT_ID=$($webApp.appId)"
Write-Host "API_CLIENT_ID=$($apiApp.appId)"
Write-Host "API_SCOPE=api://$apiName/access_as_user"
