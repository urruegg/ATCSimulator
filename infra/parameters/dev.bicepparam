using '../main.bicep'

param location = 'swedencentral'
param observabilityLocation = 'swedencentral'
param dataBoundary = 'demo'
param prefix = 'atcsim'
param tags = {
  environment: 'dev'
  workload: 'atcsim-pocs'
}
