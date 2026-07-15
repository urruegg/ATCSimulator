using '../main.bicep'

param location = 'swedencentral'
param prefix = 'atcsim'
param tags = {
  environment: 'prod'
  workload: 'atcsim-pocs'
}
