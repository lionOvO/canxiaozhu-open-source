# Regression checks for ownership and fixed-port reuse; does not stop services.
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'canteen-dev.psm1') -Force
$projectRoot = Split-Path $PSScriptRoot -Parent
& (Get-Module canteen-dev) {
  param($ProjectRoot)
  function Assert-Check([bool]$Condition, [string]$Description) {
    if (-not $Condition) { throw "FAIL: $Description" }
    Write-Host "PASS: $Description"
  }
  function New-Runner([string]$Command, [string]$Directory) {
    [pscustomobject]@{
      ProcessId = 12345; ParentProcessId = 0; Name = 'node.exe'
      CommandLine = $Command; CanteenWorkingDirectory = $Directory
    }
  }
  $services = @(Get-CanteenServices $ProjectRoot)
  $backend = $services | Where-Object Name -eq backend
  $pc = $services | Where-Object Name -eq pc
  Assert-Check (@($services | Where-Object Name -eq embedding).Count -eq 0) 'Shared Ollama is excluded from project stop targets'
  $relative = New-Runner 'node.exe --import tsx src/server.ts' $backend.Directory
  Assert-Check (Test-CanteenProcess $relative $backend) 'Relative backend entry and exact working directory are recognized'
  Assert-Check (Test-CanteenProcess (New-Runner 'node.exe --import=tsx .\src\server.ts' $backend.Directory) $backend) 'Equals import and dot-relative entry are recognized'
  Assert-Check (-not (Test-CanteenProcess (New-Runner $relative.CommandLine ($backend.Directory + '-other')) $backend)) 'Another project with the same relative command is rejected'
  Assert-Check (-not (Test-CanteenProcess (New-Runner $relative.CommandLine $null) $backend)) 'Unreadable working directory is rejected'
  Assert-Check (-not (Test-CanteenProcess (New-Runner 'node.exe src/server.ts' $backend.Directory) $backend)) 'Unrecognized backend runner is rejected'
  $absolute = 'node.exe "' + (Join-Path $backend.Directory $backend.Cli) + '" watch src/server.ts'
  Assert-Check (Test-CanteenProcess (New-Runner $absolute $null) $backend) 'Existing absolute tsx watcher remains recognized'
  $preview = New-Runner 'node.exe node_modules/vite/bin/vite.js --port 5183 --strictPort' $pc.Directory
  Assert-Check (Test-CanteenProcess $preview $pc) 'Relative Vite entry belongs to this project'
  Assert-Check (-not (Test-CanteenRunnerPort $preview $pc)) 'Preview on 5183 is excluded from fixed-port startup reuse'
  Assert-Check (Test-CanteenRunnerPort (New-Runner 'node.exe node_modules/vite/bin/vite.js --port=5173' $pc.Directory) $pc) 'Configured fixed port remains reusable'
  $wrongFrontend = New-Runner $preview.CommandLine (Join-Path $ProjectRoot 'front-phone')
  Assert-Check (-not (Test-CanteenProcess $wrongFrontend $pc)) 'Phone working directory is not mistaken for PC'

  # Exercise the real conflict/ancestor decision with deterministic listeners.
  $originalListenerFunction = ${function:Get-CanteenListenerIds}
  try {
    Set-Item function:script:Get-CanteenListenerIds { param([int]$Port) 12345 }
    Assert-Check (Assert-CanteenPort $backend @($relative)) 'Matching relative backend listener is reusable'
    $rejected = $false
    try { Assert-CanteenPort $backend @((New-Runner $relative.CommandLine ($backend.Directory + '-other'))) | Out-Null }
    catch { $rejected = $_.Exception.Message -match 'unverified service' }
    Assert-Check $rejected 'Foreign listener still blocks startup'
    $watcher = New-Runner $absolute $backend.Directory
    $watcher.ProcessId = 12346
    $child = New-Runner 'node.exe --require tsx child.js' $null
    $child.ParentProcessId = $watcher.ProcessId
    Assert-Check (Assert-CanteenPort $backend @($child, $watcher)) 'Child of verified watcher remains reusable'
  } finally { Set-Item function:script:Get-CanteenListenerIds $originalListenerFunction }

  # Verify native directory reading in the actual Windows PowerShell host.
  if (-not ('CanteenProcessDirectory' -as [type])) {
    Add-Type -Path (Join-Path $PSScriptRoot 'canteen-process-directory.cs')
  }
  $currentDirectory = [CanteenProcessDirectory]::ReadDirectory($PID)
  Assert-Check ([string]::Equals($currentDirectory.TrimEnd('\'), [Environment]::CurrentDirectory.TrimEnd('\'), [StringComparison]::OrdinalIgnoreCase)) 'Native process directory reader matches the host directory'
  Assert-Check ($null -eq [CanteenProcessDirectory]::ReadDirectory(-1)) 'Missing process fails closed'
} $projectRoot
