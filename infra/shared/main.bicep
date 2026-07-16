// RG-scoped: deploys into the pre-existing shared resource group (default
// 'swissshub'), created once by scripts/bootstrap-cicd.ps1 with elevated
// rights. This avoids granting the CI identity any subscription-scope role
// (least privilege) - CI needs only Contributor on the shared RG.

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

module frontdoor './modules/frontdoor.bicep' = if (deployFrontDoor) {
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

output sharedResourceGroupName string = resourceGroup().name
output dnsZoneName string = dns.outputs.zoneName
output nameServers array = dns.outputs.nameServers
output frontDoorEndpointHostName string = deployFrontDoor ? frontdoor!.outputs.endpointHostName : ''
output frontDoorId string = deployFrontDoor ? frontdoor!.outputs.frontDoorId : ''