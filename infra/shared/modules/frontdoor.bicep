@description('Azure Front Door Standard profile name.')
param profileName string = 'fdswissshub'
@description('Name of the AFD endpoint under the profile.')
param endpointName string = 'afd-swissshub'
@description('Origin host name for the web (shell) App Service (default hostname of the target env).')
param webOriginHostName string
@description('Origin host name for the flight-data API App Service.')
param flightOriginHostName string
@description('Origin host name for the voice-agent API App Service.')
param voiceOriginHostName string
@description('Custom domain FQDN for the app (e.g. appsit.atcsim.swissshub.com).')
param appHostName string
@description('Custom domain FQDN for the api (e.g. apisit.atcsim.swissshub.com).')
param apiHostName string
@description('Resource tags.')
param tags object = {}

// ---------------------------------------------------------------------------
// Front Door Standard profile (global)
// ---------------------------------------------------------------------------
resource profile 'Microsoft.Cdn/profiles@2023-05-01' = {
  name: profileName
  location: 'Global'
  tags: tags
  sku: {
    name: 'Standard_AzureFrontDoor'
  }
}

resource endpoint 'Microsoft.Cdn/profiles/afdEndpoints@2023-05-01' = {
  parent: profile
  name: endpointName
  location: 'Global'
  properties: {
    enabledState: 'Enabled'
  }
}

// ---------------------------------------------------------------------------
// Origin groups (web / flight / voice) each with a health probe + one origin
// ---------------------------------------------------------------------------
var loadBalancingSettings = {
  sampleSize: 4
  successfulSamplesRequired: 3
  additionalLatencyInMilliseconds: 50
}
var healthProbeSettings = {
  probePath: '/'
  probeRequestType: 'HEAD'
  probeProtocol: 'Https'
  probeIntervalInSeconds: 100
}

resource webOriginGroup 'Microsoft.Cdn/profiles/originGroups@2023-05-01' = {
  parent: profile
  name: 'og-web'
  properties: {
    loadBalancingSettings: loadBalancingSettings
    healthProbeSettings: healthProbeSettings
  }
}

resource webOrigin 'Microsoft.Cdn/profiles/originGroups/origins@2023-05-01' = {
  parent: webOriginGroup
  name: 'origin-web'
  properties: {
    hostName: webOriginHostName
    httpPort: 80
    httpsPort: 443
    originHostHeader: webOriginHostName
    priority: 1
    weight: 1000
    enabledState: 'Enabled'
    enforceCertificateNameCheck: true
  }
}

resource flightOriginGroup 'Microsoft.Cdn/profiles/originGroups@2023-05-01' = {
  parent: profile
  name: 'og-flight'
  properties: {
    loadBalancingSettings: loadBalancingSettings
    healthProbeSettings: healthProbeSettings
  }
}

resource flightOrigin 'Microsoft.Cdn/profiles/originGroups/origins@2023-05-01' = {
  parent: flightOriginGroup
  name: 'origin-flight'
  properties: {
    hostName: flightOriginHostName
    httpPort: 80
    httpsPort: 443
    originHostHeader: flightOriginHostName
    priority: 1
    weight: 1000
    enabledState: 'Enabled'
    enforceCertificateNameCheck: true
  }
}

resource voiceOriginGroup 'Microsoft.Cdn/profiles/originGroups@2023-05-01' = {
  parent: profile
  name: 'og-voice'
  properties: {
    loadBalancingSettings: loadBalancingSettings
    healthProbeSettings: healthProbeSettings
  }
}

resource voiceOrigin 'Microsoft.Cdn/profiles/originGroups/origins@2023-05-01' = {
  parent: voiceOriginGroup
  name: 'origin-voice'
  properties: {
    hostName: voiceOriginHostName
    httpPort: 80
    httpsPort: 443
    originHostHeader: voiceOriginHostName
    priority: 1
    weight: 1000
    enabledState: 'Enabled'
    enforceCertificateNameCheck: true
  }
}

// ---------------------------------------------------------------------------
// Custom domains (app / api) with Front Door managed TLS certificate
// ---------------------------------------------------------------------------
resource appCustomDomain 'Microsoft.Cdn/profiles/customDomains@2023-05-01' = {
  parent: profile
  name: 'cd-app'
  properties: {
    hostName: appHostName
    tlsSettings: {
      certificateType: 'ManagedCertificate'
      minimumTlsVersion: 'TLS12'
    }
  }
}

resource apiCustomDomain 'Microsoft.Cdn/profiles/customDomains@2023-05-01' = {
  parent: profile
  name: 'cd-api'
  properties: {
    hostName: apiHostName
    tlsSettings: {
      certificateType: 'ManagedCertificate'
      minimumTlsVersion: 'TLS12'
    }
  }
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
resource appRoute 'Microsoft.Cdn/profiles/afdEndpoints/routes@2023-05-01' = {
  parent: endpoint
  name: 'route-app'
  properties: {
    customDomains: [
      {
        id: appCustomDomain.id
      }
    ]
    originGroup: {
      id: webOriginGroup.id
    }
    supportedProtocols: [
      'Https'
    ]
    patternsToMatch: [
      '/*'
    ]
    forwardingProtocol: 'HttpsOnly'
    linkToDefaultDomain: 'Disabled'
    httpsRedirect: 'Enabled'
    enabledState: 'Enabled'
  }
  dependsOn: [
    webOrigin
  ]
}

resource apiFlightRoute 'Microsoft.Cdn/profiles/afdEndpoints/routes@2023-05-01' = {
  parent: endpoint
  name: 'route-api-flight'
  properties: {
    customDomains: [
      {
        id: apiCustomDomain.id
      }
    ]
    originGroup: {
      id: flightOriginGroup.id
    }
    supportedProtocols: [
      'Https'
    ]
    patternsToMatch: [
      '/api/aircraft*'
      '/api/maps/*'
    ]
    forwardingProtocol: 'HttpsOnly'
    linkToDefaultDomain: 'Disabled'
    httpsRedirect: 'Enabled'
    enabledState: 'Enabled'
  }
  dependsOn: [
    flightOrigin
  ]
}

resource apiVoiceRoute 'Microsoft.Cdn/profiles/afdEndpoints/routes@2023-05-01' = {
  parent: endpoint
  name: 'route-api-voice'
  properties: {
    customDomains: [
      {
        id: apiCustomDomain.id
      }
    ]
    originGroup: {
      id: voiceOriginGroup.id
    }
    supportedProtocols: [
      'Https'
    ]
    patternsToMatch: [
      '/api/voice/*'
    ]
    forwardingProtocol: 'HttpsOnly'
    linkToDefaultDomain: 'Disabled'
    httpsRedirect: 'Enabled'
    enabledState: 'Enabled'
  }
  dependsOn: [
    voiceOrigin
  ]
}

// ---------------------------------------------------------------------------
// Outputs
// ---------------------------------------------------------------------------
output endpointHostName string = endpoint.properties.hostName
output frontDoorId string = profile.properties.frontDoorId
output appValidationToken string = appCustomDomain.properties.validationProperties.validationToken
output apiValidationToken string = apiCustomDomain.properties.validationProperties.validationToken
