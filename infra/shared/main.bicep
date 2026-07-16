targetScope = 'subscription'

@description('Azure region for the shared resource group metadata.')
param location string = 'swedencentral'
@description('Name of the shared resource group (cross-solution).')
param sharedResourceGroupName string = 'swissshub'
@description('Public DNS zone (FQDN).')
param dnsZoneName string = 'swissshub.com'
@description('Resource tags.')
param tags object = {
  workload: 'shared-platform'
  managedBy: 'bicep'
}

resource sharedRg 'Microsoft.Resources/resourceGroups@2023-07-01' = {
  name: sharedResourceGroupName
  location: location
  tags: tags
}

module dns './modules/dns.bicep' = {
  scope: sharedRg
  name: 'dns'
  params: {
    zoneName: dnsZoneName
    tags: tags
  }
}

output sharedResourceGroupName string = sharedRg.name
output dnsZoneName string = dns.outputs.zoneName
output nameServers array = dns.outputs.nameServers