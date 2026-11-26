. "$PSScriptRoot\\common.ps1"
$ctx = Get-TLCBuildContext

python (Join-Path $PSScriptRoot "validate_project.py")
Assert-LastExitCode "Source validation"

& (Join-Path $PSScriptRoot "run_automation.ps1")
if (-not $?) { throw "Automation stage failed." }
& (Join-Path $PSScriptRoot "build_windows.ps1")
if (-not $?) { throw "Windows package stage failed." }
& (Join-Path $PSScriptRoot "build_android.ps1")
if (-not $?) { throw "Android package stage failed." }

Write-Host "TLC Gender Clash release-candidate source/tests/packages completed."
Write-Host "Signing, physical-device QA, performance profiling, and final release approval remain mandatory."
