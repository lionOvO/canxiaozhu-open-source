param(
  [string]$Server = "203.0.113.10",
  [string]$User = "ubuntu",
  [string]$RemoteDir = "/opt/projects/canteen-helper",
  [switch]$InstallDeps,
  [switch]$SeedDb,
  [switch]$SkipLocalBuild
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$SmartUpdateScript = Join-Path $ScriptDir "smart-update-server.ps1"

if (-not (Test-Path -LiteralPath $SmartUpdateScript)) {
  throw "smart-update-server.ps1 not found: $SmartUpdateScript"
}

$arguments = @(
  "-NoProfile",
  "-ExecutionPolicy",
  "Bypass",
  "-File",
  $SmartUpdateScript,
  "-Server",
  $Server,
  "-User",
  $User,
  "-RemoteDir",
  $RemoteDir
)

if ($InstallDeps) {
  $arguments += "-InstallDeps"
}

if ($SeedDb) {
  $arguments += "-SeedDb"
}

if ($SkipLocalBuild) {
  $arguments += "-SkipLocalBuild"
}

& powershell @arguments
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}
