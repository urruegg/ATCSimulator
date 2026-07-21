@description('Name of the ADLS Gen2 storage account (3-24 lowercase alphanumerics).')
param name string
@description('Azure region for the storage account.')
param location string
@description('Resource tags.')
param tags object = {}
@description('Name of the blob container (filesystem) that holds flight snapshots.')
param fileSystemName string = 'flight-snapshots'
@description('Principal id of the flight-data API managed identity to grant snapshot read/write.')
param writerPrincipalId string

// StorageV2 with hierarchical namespace enabled = ADLS Gen2. Public blob access
// is disabled; the flight-data API reaches it over Entra (managed identity),
// never with account keys.
resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: name
  location: location
  tags: tags
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    isHnsEnabled: true
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    allowSharedKeyAccess: false
    supportsHttpsTrafficOnly: true
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: storage
  name: 'default'
}

resource container 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobService
  name: fileSystemName
}

// Storage Blob Data Contributor for the flight-data identity: read + write the
// Parquet snapshots that keep the demo alive when FR24 credit is exhausted.
var storageBlobDataContributor = 'ba92f5b4-2d11-453d-a403-e96b0029c9fe'
resource roleAssign 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storage.id, writerPrincipalId, storageBlobDataContributor)
  scope: storage
  properties: {
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      storageBlobDataContributor
    )
    principalId: writerPrincipalId
    principalType: 'ServicePrincipal'
  }
}

output name string = storage.name
output dfsEndpoint string = storage.properties.primaryEndpoints.dfs
output fileSystemName string = fileSystemName
