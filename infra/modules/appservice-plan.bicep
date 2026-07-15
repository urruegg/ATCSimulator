@description('Name of the App Service plan.')
param name string

@description('Azure region for the plan.')
param location string

@description('Resource tags.')
param tags object = {}

resource plan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: name
  location: location
  tags: tags
  sku: {
    name: 'B1'
    tier: 'Basic'
  }
  kind: 'linux'
  properties: {
    reserved: true
  }
}

output id string = plan.id
output name string = plan.name
