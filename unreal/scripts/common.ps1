param()

$ErrorActionPreference = "Stop"

function Get-TLCBuildContext {
    $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\\..")).Path
    $Project = Join-Path $RepoRoot "unreal\\TLCGenderClash.uproject"
    if (-not $env:UE_ROOT) { throw "UE_ROOT is not set. Point it at the Unreal Engine 5.8 installation root." }
    $UAT = Join-Path $env:UE_ROOT "Engine\\Build\\BatchFiles\\RunUAT.bat"
    $EditorCmd = Join-Path $env:UE_ROOT "Engine\\Binaries\\Win64\\UnrealEditor-Cmd.exe"
    if (-not (Test-Path $Project)) { throw "Project not found: $Project" }
    if (-not (Test-Path $UAT)) { throw "RunUAT not found: $UAT" }
    if (-not (Test-Path $EditorCmd)) { throw "UnrealEditor-Cmd not found: $EditorCmd" }
    return @{ RepoRoot=$RepoRoot; Project=$Project; UAT=$UAT; EditorCmd=$EditorCmd }
}

function Assert-LastExitCode([string] $Step) {
    if ($LASTEXITCODE -ne 0) { throw "$Step failed with exit code $LASTEXITCODE" }
}
