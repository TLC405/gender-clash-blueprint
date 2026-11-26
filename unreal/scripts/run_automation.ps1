. "$PSScriptRoot\\common.ps1"
$ctx = Get-TLCBuildContext
$ReportDir = Join-Path $ctx.RepoRoot "artifacts\\unreal-tests"
New-Item -ItemType Directory -Force -Path $ReportDir | Out-Null

& $ctx.EditorCmd $ctx.Project -unattended -nop4 -NullRHI "-ExecCmds=Automation RunTests TLC.GenderClash; Automation WaitForTests; Quit" "-ReportOutputPath=$ReportDir"
Assert-LastExitCode "Unreal automation tests"
Write-Host "TLC Unreal automation tests completed. Reports: $ReportDir"
