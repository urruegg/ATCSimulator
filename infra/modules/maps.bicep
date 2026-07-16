@description('Name of the Azure Maps account.')
param name string
@description('Resource tags.')
param tags object = {}
@description('Principal id of the flight-data API managed identity to grant Maps data read.')
param readerPrincipalId string

resource maps 'Microsoft.Maps/accounts@2023-06-01' = {
  name: name
  location: 'global'
  sku: { name: 'G2' }
  kind: 'Gen2'
  tags: tags
}

// Azure Maps Data Reader (data-plane) for the flight-data identity.
var azureMapsDataReader = '423170ca-a8f6-4b0f-8487-9e4eb8f49bfa'
resource roleAssign 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(maps.id, readerPrincipalId, azureMapsDataReader)
  scope: maps
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', azureMapsDataReader)
    principalId: readerPrincipalId
    principalType: 'ServicePrincipal'
  }
}

output name string = maps.name