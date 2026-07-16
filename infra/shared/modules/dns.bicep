@description('Public DNS zone name (must be the FQDN of the domain).')
param zoneName string = 'swissshub.com'
@description('Resource tags.')
param tags object = {}

resource zone 'Microsoft.Network/dnsZones@2018-05-01' = {
  name: zoneName
  location: 'global'
  tags: tags
}

output nameServers array = zone.properties.nameServers
output zoneName string = zone.name