@description('Name of the Azure Maps account.')
param mapsName string

@description('Log Analytics workspace resource id.')
param logAnalyticsWorkspaceId string

@description('Diagnostic setting name.')
param diagnosticSettingName string = 'send-to-log-analytics'

resource maps 'Microsoft.Maps/accounts@2023-06-01' existing = {
  name: mapsName
}

// Azure Maps accounts expose no diagnostic *log* categories (a diagnostic
// setting with `categoryGroup: 'allLogs'` fails deployment with
// "CategoryGroup: 'allLogs' is not supported, supported ones are: ''").
// Only platform metrics are supported, so send AllMetrics to Log Analytics.
resource diagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: diagnosticSettingName
  scope: maps
  properties: {
    workspaceId: logAnalyticsWorkspaceId
    metrics: [
      {
        category: 'AllMetrics'
        enabled: true
      }
    ]
  }
}
