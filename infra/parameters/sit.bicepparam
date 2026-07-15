using '../main.bicep'

param location = 'swedencentral'
param prefix = 'atcsim'
param tags = {
  environment: 'sit'
  workload: 'atcsim-pocs'
}
