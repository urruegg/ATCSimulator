@description('Name of the Foundry (AI Services) account.')
param name string

@description('Azure region.')
param location string

@description('Resource tags.')
param tags object = {}

@description('Principal id of the broker managed identity to grant access.')
param brokerPrincipalId string

resource account 'Microsoft.CognitiveServices/accounts@2024-10-01' = {
  name: name
  location: location
  tags: tags
  kind: 'AIServices'
  sku: { name: 'S0' }
  properties: {
    customSubDomainName: name
    publicNetworkAccess: 'Enabled'
  }
}

// Cognitive Services User (data-plane) for the broker identity.
var cognitiveServicesUser = 'a97b65f3-24c7-4388-baec-2e87135dc908'
resource roleAssign 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(account.id, brokerPrincipalId, cognitiveServicesUser)
  scope: account
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', cognitiveServicesUser)
    principalId: brokerPrincipalId
    principalType: 'ServicePrincipal'
  }
}

output endpoint string = 'wss://${name}.services.ai.azure.com'
output name string = account.name
