# scripts/verify-environment.ps1
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)] [string] $WebUrl,
    [Parameter(Mandatory = $true)] [string] $FlightApiUrl,
    [Parameter(Mandatory = $true)] [string] $VoiceApiUrl,
    [string] $Bounds = '47.7,47.2,8.3,8.8'
)

$ErrorActionPreference = 'Stop'
$failures = @()

function Test-Endpoint {
    param([string] $Name, [scriptblock] $Check)
    try {
        & $Check
        Write-Host "PASS: $Name"
    }
    catch {
        Write-Host "FAIL: $Name - $($_.Exception.Message)"
        $script:failures += $Name
    }
}

Test-Endpoint 'flight-data /health' {
    $r = Invoke-WebRequest -UseBasicParsing "$FlightApiUrl/health" -TimeoutSec 30
    if ($r.StatusCode -ne 200) { throw "status $($r.StatusCode)" }
}

Test-Endpoint 'voice-agent /health' {
    $r = Invoke-WebRequest -UseBasicParsing "$VoiceApiUrl/health" -TimeoutSec 30
    if ($r.StatusCode -ne 200) { throw "status $($r.StatusCode)" }
}

Test-Endpoint 'aircraft returns live data' {
    $r = Invoke-RestMethod "$FlightApiUrl/api/aircraft?bounds=$([uri]::EscapeDataString($Bounds))" -TimeoutSec 60
    if (-not $r -or $r.Count -lt 1) { throw 'no aircraft returned' }
}

Test-Endpoint 'voice respond (mock)' {
    $body = @{ transcript = 'What does the aircraft selection PoC prove?'; audioBase64 = '' } | ConvertTo-Json
    $r = Invoke-RestMethod "$VoiceApiUrl/api/voice/respond" -Method Post -ContentType 'application/json' -Body $body -TimeoutSec 60
    if (-not $r.answerText) { throw 'no answerText' }
}

Test-Endpoint 'web root reachable' {
    $r = Invoke-WebRequest -UseBasicParsing $WebUrl -TimeoutSec 30
    if ($r.StatusCode -ne 200) { throw "status $($r.StatusCode)" }
}

if ($failures.Count -gt 0) {
    Write-Error "Verification failed: $($failures -join ', ')"
    exit 1
}

Write-Host 'All environment checks passed.'
