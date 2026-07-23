@description('Name of the API App Service.')
param name string

@description('Azure region.')
param location string

@description('Resource tags.')
param tags object = {}

@description('Resource id of the App Service plan.')
param appServicePlanId string

@description('Application Insights connection string.')
param appInsightsConnectionString string

@description('azd service name used to map deployments to this resource.')
param serviceName string

@description('Additional app settings as an array of name/value objects.')
param appSettings array = []

@description('Name of the Key Vault to grant secret read access to.')
param keyVaultName string

var keyVaultSecretsUserRoleId = '4633458b-17de-408a-b874-0445c86b69e6'

var baseSettings = [
  {
    name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
    value: appInsightsConnectionString
  }
  {
    name: 'ASPNETCORE_ENVIRONMENT'
    value: 'Production'
  }
]

resource site 'Microsoft.Web/sites@2023-12-01' = {
  name: name
  location: location
  tags: union(tags, { 'azd-service-name': serviceName })
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlanId
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'DOTNETCORE|8.0'
      alwaysOn: true
      ftpsState: 'FtpsOnly'
      minTlsVersion: '1.2'
      appSettings: concat(baseSettings, appSettings)
    }
  }
}

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: keyVaultName
}

resource keyVaultSecretsUser 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, site.id, keyVaultSecretsUserRoleId)
  scope: keyVault
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', keyVaultSecretsUserRoleId)
    principalId: site.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

output name string = site.name
output id string = site.id
output defaultHostName string = site.properties.defaultHostName
output principalId string = site.identity.principalId
