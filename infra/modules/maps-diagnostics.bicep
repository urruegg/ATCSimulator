@description('Name of the Azure Maps account.')
param mapsName string

@description('Log Analytics workspace resource id.')
param logAnalyticsWorkspaceId string

@description('Diagnostic setting name.')
param diagnosticSettingName string = 'send-to-log-analytics'

resource maps 'Microsoft.Maps/accounts@2023-06-01' existing = {
  name: mapsName
}

resource diagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: diagnosticSettingName
  scope: maps
  properties: {
    workspaceId: logAnalyticsWorkspaceId
    logs: [
      {
        categoryGroup: 'allLogs'
        enabled: true
      }
    ]
    metrics: [
      {
        category: 'AllMetrics'
        enabled: true
      }
    ]
  }
}
