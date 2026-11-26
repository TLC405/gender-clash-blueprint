. "$PSScriptRoot\\common.ps1"
$ctx = Get-TLCBuildContext
$Archive = Join-Path $ctx.RepoRoot "artifacts\\android"

python (Join-Path $PSScriptRoot "validate_project.py")
Assert-LastExitCode "Source validation"
if (-not $env:ANDROID_HOME) { throw "ANDROID_HOME is not set. Configure the UE 5.8-supported Android SDK/NDK first." }

& $ctx.UAT BuildCookRun "-project=$($ctx.Project)" -noP4 -targetplatform=Android -clientconfig=Shipping -build -cook -stage -pak -archive "-archivedirectory=$Archive"
Assert-LastExitCode "Android Shipping package"
Write-Host "Android Shipping package: $Archive"
