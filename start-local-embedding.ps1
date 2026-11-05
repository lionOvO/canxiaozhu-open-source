param([switch]$DryRun)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
try {
  Import-Module (Join-Path $PSScriptRoot 'scripts\canteen-dev.psm1') -Force
  Invoke-CanteenDev -ProjectRoot $PSScriptRoot -EmbeddingOnly -DryRun:$DryRun
} catch {
  Write-Host "BGE-M3 startup failed: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}
