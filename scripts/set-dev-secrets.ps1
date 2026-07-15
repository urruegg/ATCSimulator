<#
.SYNOPSIS
    Seeds development secrets for the ATCSimulator PoCs into Azure Key Vault.

.DESCRIPTION
    Writes the FR24 sandbox token and Foundry endpoint/key into the target
    Key Vault. Values are read as secure input and never printed. The caller
    must be signed in with `az login` and hold the Key Vault Secrets Officer
    role on the target vault.

.EXAMPLE
    ./scripts/set-dev-secrets.ps1 -VaultName atcsimkvabcdef123456
#>
param(
    [Parameter(Mandatory = $true)] [string] $VaultName,
    [Parameter(Mandatory = $true)] [securestring] $Fr24Token,
    [Parameter(Mandatory = $true)] [securestring] $FoundryEndpoint,
    [Parameter(Mandatory = $true)] [securestring] $FoundryApiKey
)

$ErrorActionPreference = 'Stop'

function ConvertFrom-SecureStringPlain {
    param([securestring] $Secure)
    $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secure)
    try {
        return [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
    }
    finally {
        [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }
}

$secrets = @{
    'fr24-token'       = $Fr24Token
    'foundry-endpoint' = $FoundryEndpoint
    'foundry-api-key'  = $FoundryApiKey
}

foreach ($name in $secrets.Keys) {
    $plain = ConvertFrom-SecureStringPlain -Secure $secrets[$name]
    az keyvault secret set --vault-name $VaultName --name $name --value $plain | Out-Null
    Write-Host "Set secret '$name' in vault '$VaultName'."
}
