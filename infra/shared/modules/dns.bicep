@description('Public DNS zone name (must be the FQDN of the domain).')
param zoneName string = 'swissshub.com'
@description('Resource tags.')
param tags object = {}
@description('DNS label (relative to the zone) for the app custom domain, e.g. appsit.atcsim.')
param appLabel string = ''
@description('DNS label (relative to the zone) for the api custom domain, e.g. apisit.atcsim.')
param apiLabel string = ''
@description('Front Door endpoint host name to point the custom-domain CNAMEs at. Empty disables the records.')
param frontDoorEndpointHostName string = ''
@description('Front Door managed-TLS validation token for the app custom domain.')
param appValidationToken string = ''
@description('Front Door managed-TLS validation token for the api custom domain.')
param apiValidationToken string = ''

resource zone 'Microsoft.Network/dnsZones@2018-05-01' = {
  name: zoneName
  location: 'global'
  tags: tags
}

// ---------------------------------------------------------------------------
// Front Door custom-domain records (only when a Front Door endpoint is wired)
// ---------------------------------------------------------------------------
resource appCname 'Microsoft.Network/dnsZones/CNAME@2018-05-01' = if (!empty(frontDoorEndpointHostName)) {
  parent: zone
  name: appLabel
  properties: {
    TTL: 3600
    CNAMERecord: {
      cname: frontDoorEndpointHostName
    }
  }
}

resource apiCname 'Microsoft.Network/dnsZones/CNAME@2018-05-01' = if (!empty(frontDoorEndpointHostName)) {
  parent: zone
  name: apiLabel
  properties: {
    TTL: 3600
    CNAMERecord: {
      cname: frontDoorEndpointHostName
    }
  }
}

resource appDnsAuth 'Microsoft.Network/dnsZones/TXT@2018-05-01' = if (!empty(frontDoorEndpointHostName)) {
  parent: zone
  name: '_dnsauth.${appLabel}'
  properties: {
    TTL: 3600
    TXTRecords: [
      {
        value: [
          appValidationToken
        ]
      }
    ]
  }
}

resource apiDnsAuth 'Microsoft.Network/dnsZones/TXT@2018-05-01' = if (!empty(frontDoorEndpointHostName)) {
  parent: zone
  name: '_dnsauth.${apiLabel}'
  properties: {
    TTL: 3600
    TXTRecords: [
      {
        value: [
          apiValidationToken
        ]
      }
    ]
  }
}

output nameServers array = zone.properties.nameServers
output zoneName string = zone.name