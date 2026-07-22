[CmdletBinding()]
param(
    [string]$Fixture,
    [string]$AccountUrl = $env:Storage__AccountUrl,
    [string]$FileSystem = $(if ($env:Storage__FileSystem) { $env:Storage__FileSystem } else { 'flight-snapshots' }),
    [string]$Region = $(if ($env:Storage__Region) { $env:Storage__Region } else { 'ch' }),
    [string]$OutputDir,
    [string]$CapturedAt,
    [string]$Bounds = '47.20,8.20,47.75,8.95'
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$project = Join-Path $repoRoot 'scripts\seed\OpenSkySnapshotSeed\OpenSkySnapshotSeed.csproj'

& dotnet build $project -v minimal
if (-not $?) { exit $LASTEXITCODE }

$argsList = @('run', '--project', $project, '--no-build', '--')

if ($Fixture) { $argsList += @('--fixture', $Fixture) }
if ($AccountUrl) { $argsList += @('--account-url', $AccountUrl) }
if ($FileSystem) { $argsList += @('--filesystem', $FileSystem) }
if ($Region) { $argsList += @('--region', $Region) }
if ($OutputDir) { $argsList += @('--output-dir', $OutputDir) }
if ($CapturedAt) { $argsList += @('--captured-at', $CapturedAt) }
if ($Bounds) { $argsList += @('--bounds', $Bounds) }

& dotnet @argsList
if (-not $?) { exit $LASTEXITCODE }
