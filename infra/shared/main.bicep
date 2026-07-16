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

@description('Deploy the shared Azure Front Door profile + custom domains. Disabled by default; CD enables it once per-env origin hostnames are known.')
param deployFrontDoor bool = false
@description('Origin host name for the web (shell) App Service of the target env.')
param webOriginHostName string = ''
@description('Origin host name for the flight-data API App Service of the target env.')
param flightOriginHostName string = ''
@description('Origin host name for the voice-agent API App Service of the target env.')
param voiceOriginHostName string = ''
@description('Custom domain FQDN for the app, e.g. appsit.atcsim.swissshub.com.')
param appHostName string = ''
@description('Custom domain FQDN for the api, e.g. apisit.atcsim.swissshub.com.')
param apiHostName string = ''
@description('DNS label (relative to the zone) for the app custom domain, e.g. appsit.atcsim.')
param appLabel string = ''
@description('DNS label (relative to the zone) for the api custom domain, e.g. apisit.atcsim.')
param apiLabel string = ''

resource sharedRg 'Microsoft.Resources/resourceGroups@2023-07-01' = {
  name: sharedResourceGroupName
  location: location
  tags: tags
}

module frontdoor './modules/frontdoor.bicep' = if (deployFrontDoor) {
  scope: sharedRg
  name: 'frontdoor'
  params: {
    webOriginHostName: webOriginHostName
    flightOriginHostName: flightOriginHostName
    voiceOriginHostName: voiceOriginHostName
    appHostName: appHostName
    apiHostName: apiHostName
    tags: tags
  }
}

module dns './modules/dns.bicep' = {
  scope: sharedRg
  name: 'dns'
  params: {
    zoneName: dnsZoneName
    tags: tags
    appLabel: appLabel
    apiLabel: apiLabel
    frontDoorEndpointHostName: deployFrontDoor ? frontdoor!.outputs.endpointHostName : ''
    appValidationToken: deployFrontDoor ? frontdoor!.outputs.appValidationToken : ''
    apiValidationToken: deployFrontDoor ? frontdoor!.outputs.apiValidationToken : ''
  }
}

output sharedResourceGroupName string = sharedRg.name
output dnsZoneName string = dns.outputs.zoneName
output nameServers array = dns.outputs.nameServers
output frontDoorEndpointHostName string = deployFrontDoor ? frontdoor!.outputs.endpointHostName : ''
output frontDoorId string = deployFrontDoor ? frontdoor!.outputs.frontDoorId : ''