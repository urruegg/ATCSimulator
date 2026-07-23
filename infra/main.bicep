@description('Azure region for all resources.')
param location string = resourceGroup().location

@description('Naming prefix for all resources.')
param prefix string = 'atcsim'

@description('Resource tags applied to all resources.')
param tags object = {}

@description('Data boundary for residency controls. Use production for personal data so observability stays in Switzerland North.')
@allowed([
  'demo'
  'production'
])
param dataBoundary string = 'demo'

@description('Telemetry region for demo/non-personal environments. Production personal-data telemetry is forced to Switzerland North.')
param observabilityLocation string = location

@description('Foundry agent name bound to the Voice Live broker (published out-of-band via the Foundry agent runbook).')
param voiceLiveAgentId string = 'atcsim-virtual-pilot'

var resourceToken = uniqueString(resourceGroup().id)
var effectiveObservabilityLocation = dataBoundary == 'production' ? 'switzerlandnorth' : observabilityLocation
var keyVaultName = take('${prefix}kv${resourceToken}', 24)
var foundryName = take('${prefix}fdry${resourceToken}', 24)
var foundryEndpoint = 'wss://${foundryName}.services.ai.azure.com'
// Computed once and shared by the flightDataApi app setting and the maps
// module name param to avoid a circular module reference.
var mapsName = take('${prefix}map${resourceToken}', 20)
var speechName = take('${prefix}spch${resourceToken}', 24)
// Custom-subdomain endpoint derived from the deterministic account name so the
// broker can be configured without a circular module reference (mirrors the
// foundryEndpoint pattern). Entra auth requires this host, not the regional one.
var speechEndpoint = 'https://${speechName}.cognitiveservices.azure.com/'
// ADLS Gen2 snapshot store. Name + DFS endpoint are derived from the
// deterministic account name so the flight app setting can be wired without a
// circular module reference (mirrors the speechEndpoint pattern).
var storageName = take('${prefix}st${resourceToken}', 24)
var storageDfsEndpoint = 'https://${storageName}.dfs.${environment().suffixes.storage}'
var snapshotFileSystem = 'flight-snapshots'

module logAnalytics './modules/loganalytics.bicep' = {
  name: 'loganalytics'
  params: {
    name: '${prefix}-law-${resourceToken}'
    location: effectiveObservabilityLocation
    tags: tags
    retentionInDays: 30
  }
}

module appInsights './modules/appinsights.bicep' = {
  name: 'appinsights'
  params: {
    name: '${prefix}-ai-${resourceToken}'
    location: effectiveObservabilityLocation
    tags: tags
    logAnalyticsWorkspaceId: logAnalytics.outputs.id
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
    appSettings: [
      {
        name: 'Maps__AccountName'
        value: mapsName
      }
      {
        name: 'Storage__AccountUrl'
        value: storageDfsEndpoint
      }
      {
        name: 'Storage__FileSystem'
        value: snapshotFileSystem
      }
      {
        name: 'Storage__Region'
        value: 'ch'
      }
    ]
  }
}

module storage './modules/storage.bicep' = {
  name: 'storage'
  params: {
    name: storageName
    location: location
    tags: tags
    fileSystemName: snapshotFileSystem
    writerPrincipalId: flightDataApi.outputs.principalId
  }
}

module storageDiagnostics './modules/storage-diagnostics.bicep' = {
  name: 'storage-diagnostics'
  params: {
    storageAccountName: storage.outputs.name
    logAnalyticsWorkspaceId: logAnalytics.outputs.id
  }
}

module maps './modules/maps.bicep' = {
  name: 'maps'
  params: {
    name: mapsName
    tags: tags
    readerPrincipalId: flightDataApi.outputs.principalId
  }
}

module mapsDiagnostics './modules/maps-diagnostics.bicep' = {
  name: 'maps-diagnostics'
  params: {
    mapsName: maps.outputs.name
    logAnalyticsWorkspaceId: logAnalytics.outputs.id
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
    // The Voice Live endpoint is derived from the Foundry account name so the
    // broker can reach the control channel without a circular module reference.
    // Speech region + endpoint are static (derived from the account name) to
    // avoid a circular dependency; Speech__ResourceId is injected post-deploy
    // via Key Vault (production) or directly (PoC).
    appSettings: [
      {
        name: 'VoiceLive__Endpoint'
        value: foundryEndpoint
      }
      {
        name: 'VoiceLive__AgentId'
        value: voiceLiveAgentId
      }
      {
        name: 'VoiceLive__ProjectId'
        value: '${foundryName}-project'
      }
      {
        name: 'Speech__Region'
        value: 'switzerlandnorth'
      }
      {
        name: 'Speech__Endpoint'
        value: speechEndpoint
      }
    ]
  }
}

module speech './modules/speech.bicep' = {
  name: 'speech'
  params: {
    name: speechName
    location: 'switzerlandnorth'
    tags: tags
    userPrincipalId: voiceAgentApi.outputs.principalId
  }
}

module foundry './modules/foundry.bicep' = {
  name: 'foundry'
  params: {
    name: foundryName
    location: location
    tags: tags
    brokerPrincipalId: voiceAgentApi.outputs.principalId
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

module flightDataApiDiagnostics './modules/appservice-diagnostics.bicep' = {
  name: 'flight-data-api-diagnostics'
  params: {
    appName: flightDataApi.outputs.name
    logAnalyticsWorkspaceId: logAnalytics.outputs.id
  }
}

module voiceAgentApiDiagnostics './modules/appservice-diagnostics.bicep' = {
  name: 'voice-agent-api-diagnostics'
  params: {
    appName: voiceAgentApi.outputs.name
    logAnalyticsWorkspaceId: logAnalytics.outputs.id
  }
}

module webDiagnostics './modules/appservice-diagnostics.bicep' = {
  name: 'web-diagnostics'
  params: {
    appName: web.outputs.name
    logAnalyticsWorkspaceId: logAnalytics.outputs.id
  }
}

output keyVaultName string = keyVault.outputs.name
output webHostName string = web.outputs.defaultHostName
output flightDataApiHostName string = flightDataApi.outputs.defaultHostName
output voiceAgentApiHostName string = voiceAgentApi.outputs.defaultHostName
output applicationInsightsName string = appInsights.outputs.name
output logAnalyticsWorkspaceName string = logAnalytics.outputs.name
output foundryName string = foundry.outputs.name
output foundryEndpoint string = foundryEndpoint
output mapsAccountName string = maps.outputs.name
output mapsClientId string = maps.outputs.clientId
output speechAccountName string = speech.outputs.name
output speechRegion string = 'switzerlandnorth'
output speechEndpoint string = speech.outputs.endpoint
output storageAccountName string = storage.outputs.name
output storageDfsEndpoint string = storageDfsEndpoint
