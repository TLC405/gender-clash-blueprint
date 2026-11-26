. "$PSScriptRoot\\common.ps1"
$ctx = Get-TLCBuildContext
$Archive = Join-Path $ctx.RepoRoot "artifacts\\windows"

python (Join-Path $PSScriptRoot "validate_project.py")
Assert-LastExitCode "Source validation"

& $ctx.UAT BuildCookRun "-project=$($ctx.Project)" -noP4 -targetplatform=Win64 -clientconfig=Shipping -build -cook -stage -pak -archive "-archivedirectory=$Archive"
Assert-LastExitCode "Windows Shipping package"
Write-Host "Windows Shipping package: $Archive"
