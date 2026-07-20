@description('Name of the Azure AI Speech account.')
param name string
@description('Azure region for the Speech account.')
param location string
@description('Resource tags.')
param tags object = {}
@description('Principal id of the voice-agent API managed identity to grant Speech data use.')
param userPrincipalId string

resource speech 'Microsoft.CognitiveServices/accounts@2023-05-01' = {
  name: name
  location: location
  sku: { name: 'S0' }
  kind: 'SpeechServices'
  tags: tags
  properties: {
    customSubDomainName: name
    publicNetworkAccess: 'Enabled'
  }
}

// Cognitive Services User role for the voice-agent identity.
var cognitiveServicesUser = 'a97b65f3-24c7-4388-baec-2e87135dc908'
resource roleAssign 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(speech.id, userPrincipalId, cognitiveServicesUser)
  scope: speech
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', cognitiveServicesUser)
    principalId: userPrincipalId
    principalType: 'ServicePrincipal'
  }
}

output name string = speech.name
output endpoint string = speech.properties.endpoint
output resourceId string = speech.id
