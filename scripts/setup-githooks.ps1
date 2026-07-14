$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
Push-Location $repoRoot
try {
    git config --local core.hooksPath .githooks
    Write-Host 'Configured local Git hooks path to .githooks'

    $hooksPath = git config --local --get core.hooksPath
    if ($hooksPath -ne '.githooks') {
        throw "Unexpected hooks path value: '$hooksPath'"
    }

    Write-Host 'Pre-commit markdownlint hook is now active for this clone.'
}
finally {
    Pop-Location
}
