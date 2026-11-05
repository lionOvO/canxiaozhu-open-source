param([switch]$DryRun)

$ErrorActionPreference = 'Stop'
try {
  Import-Module (Join-Path $PSScriptRoot 'scripts\canteen-dev.psm1') -Force
  Invoke-CanteenDev -ProjectRoot $PSScriptRoot -Frontend pc -DryRun:$DryRun
} catch {
  Write-Host "Startup failed: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}
