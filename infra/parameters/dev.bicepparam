using '../main.bicep'

param location = 'swedencentral'
param prefix = 'atcsim'
param tags = {
  environment: 'dev'
  workload: 'atcsim-pocs'
}
