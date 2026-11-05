# Compatibility entry: reuse installed Ollama; do not download another runtime.
param([switch]$DryRun)
$ErrorActionPreference = 'Stop'
& (Join-Path $PSScriptRoot 'start-local-embedding.ps1') -DryRun:$DryRun
