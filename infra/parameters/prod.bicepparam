using '../main.bicep'

param location = 'swedencentral'
param observabilityLocation = 'switzerlandnorth'
param dataBoundary = 'production'
param prefix = 'atcsim'
param tags = {
  environment: 'prod'
  workload: 'atcsim-pocs'
}
