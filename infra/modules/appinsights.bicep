@description('Name of the Application Insights component.')
param name string

@description('Azure region.')
param location string

@description('Resource tags.')
param tags object = {}

@description('Resource id of the Log Analytics workspace to link.')
param logAnalyticsWorkspaceId string

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: name
  location: location
  tags: tags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalyticsWorkspaceId
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

output connectionString string = appInsights.properties.ConnectionString
output name string = appInsights.name
