@description('Azure region for all resources.')
param location string = resourceGroup().location

@description('Naming prefix for all resources.')
param prefix string = 'atcsim'

@description('Resource tags applied to all resources.')
param tags object = {}

var resourceToken = uniqueString(resourceGroup().id)
var keyVaultName = take('${prefix}kv${resourceToken}', 24)

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: '${prefix}-law-${resourceToken}'
  location: location
  tags: tags
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

module appInsights './modules/appinsights.bicep' = {
  name: 'appinsights'
  params: {
    name: '${prefix}-ai-${resourceToken}'
    location: location
    tags: tags
    logAnalyticsWorkspaceId: logAnalytics.id
  }
}

module plan './modules/appservice-plan.bicep' = {
  name: 'appservice-plan'
  params: {
    name: '${prefix}-plan-${resourceToken}'
    location: location
    tags: tags
  }
}

module keyVault './modules/keyvault.bicep' = {
  name: 'keyvault'
  params: {
    name: keyVaultName
    location: location
    tags: tags
  }
}

module flightDataApi './modules/apiapp.bicep' = {
  name: 'flight-data-api'
  params: {
    name: '${prefix}-flight-${resourceToken}'
    location: location
    tags: tags
    appServicePlanId: plan.outputs.id
    appInsightsConnectionString: appInsights.outputs.connectionString
    serviceName: 'flight-data-api'
    keyVaultName: keyVault.outputs.name
    // FR24 token is injected as an app setting post-deploy by the CD action.
    // The demo vault is policy-locked (public network access disabled) and the
    // App Service has no VNet/private endpoint in the PoC, so Key Vault
    // references cannot resolve. Production restores KV + private endpoint.
    appSettings: []
  }
}

module voiceAgentApi './modules/apiapp.bicep' = {
  name: 'voice-agent-api'
  params: {
    name: '${prefix}-voice-${resourceToken}'
    location: location
    tags: tags
    appServicePlanId: plan.outputs.id
    appInsightsConnectionString: appInsights.outputs.connectionString
    serviceName: 'voice-agent-api'
    keyVaultName: keyVault.outputs.name
    // Voice agent runs in mock mode for the PoC; Foundry secrets are wired via
    // Key Vault in production (private endpoint). See note on flightDataApi.
    appSettings: []
  }
}

module web './modules/webapp.bicep' = {
  name: 'web'
  params: {
    name: '${prefix}-web-${resourceToken}'
    location: location
    tags: tags
    appServicePlanId: plan.outputs.id
    appInsightsConnectionString: appInsights.outputs.connectionString
    serviceName: 'web'
  }
}

output keyVaultName string = keyVault.outputs.name
output webHostName string = web.outputs.defaultHostName
output flightDataApiHostName string = flightDataApi.outputs.defaultHostName
output voiceAgentApiHostName string = voiceAgentApi.outputs.defaultHostName
output applicationInsightsName string = appInsights.outputs.name
