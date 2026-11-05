# Shared by both launchers. Keep this file ASCII for Windows PowerShell 5.1.
Set-StrictMode -Version Latest

function Get-CanteenServices {
  param([string]$ProjectRoot)
  @(
    [pscustomobject]@{ Name = 'backend'; Directory = (Join-Path $ProjectRoot 'backend'); Port = 3000; Cli = 'node_modules\tsx\dist\cli.mjs'; Arguments = 'watch src/server.ts'; Hint = 'tsx.*cli\.mjs'; Url = 'http://127.0.0.1:3000/api/v2/health' }
    [pscustomobject]@{ Name = 'pc'; Directory = (Join-Path $ProjectRoot 'front-pc'); Port = 5173; Cli = 'node_modules\vite\bin\vite.js'; Arguments = '--port 5173 --strictPort'; Hint = 'vite.*vite\.js'; Url = 'http://localhost:5173/dashboard' }
    [pscustomobject]@{ Name = 'phone'; Directory = (Join-Path $ProjectRoot 'front-phone'); Port = 5174; Cli = 'node_modules\vite\bin\vite.js'; Arguments = '--host 0.0.0.0 --port 5174 --strictPort'; Hint = 'vite.*vite\.js'; Url = 'http://localhost:5174/dashboard' }
  )
}

function Test-CanteenProcess {
  param($Process, $Service)
  if ($null -eq $Process -or [string]::IsNullOrEmpty($Process.CommandLine)) { return $false }
  if ($Process.Name -ne 'node.exe') { return $false }
  $command = $Process.CommandLine.Replace('/', '\')
  if ($command.IndexOf($Service.Directory + '\', [StringComparison]::OrdinalIgnoreCase) -ge 0 -and $command -match $Service.Hint) {
    return $true
  }
  # npm / IDE / manual launches can use relative entry paths. Only recognize
  # these when the actual node process directory exactly matches this service.
  $isRelativeRunner = if ($Service.Name -eq 'backend') {
    $command -match '(^|[\s"''])(\.\\)?src\\server\.ts($|[\s"''])' -and
      ($command -match '--import(?:=|\s+)(?:"tsx"|''tsx''|tsx)(?=\s|$)' -or $command -match $Service.Hint)
  } else {
    $command -match '(^|[\s"''])(\.\\)?node_modules\\vite\\bin\\vite\.js($|[\s"''])'
  }
  if (-not $isRelativeRunner) { return $false }
  if (-not $Process.PSObject.Properties['CanteenWorkingDirectory']) {
    $directory = $null
    try {
      if (-not ('CanteenProcessDirectory' -as [type])) {
        Add-Type -Path (Join-Path $PSScriptRoot 'canteen-process-directory.cs') -ErrorAction Stop
      }
      $directory = [CanteenProcessDirectory]::ReadDirectory([int]$Process.ProcessId)
    } catch { $directory = $null }
    $Process | Add-Member -NotePropertyName CanteenWorkingDirectory -NotePropertyValue $directory
  }
  if ([string]::IsNullOrEmpty($Process.CanteenWorkingDirectory)) { return $false }
  return [string]::Equals($Process.CanteenWorkingDirectory.TrimEnd('\'), $Service.Directory.TrimEnd('\'), [StringComparison]::OrdinalIgnoreCase)
}

function Get-CanteenListenerIds {
  param([int]$Port)
  $listenerIds = @(
    foreach ($line in (& "$env:SystemRoot\System32\netstat.exe" -ano)) {
      if ($line -match '^\s*TCP\s+\S+:(\d+)\s+\S+\s+LISTENING\s+(\d+)\s*$') {
        if ([int]$Matches[1] -eq $Port) { [int]$Matches[2] }
      }
    }
  )
  return $listenerIds | Select-Object -Unique
}

function Test-CanteenRunnerPort {
  param($Process, $Service)
  # A Vite instance used for preview on another port must not block launching
  # the fixed user-facing port. Keep process ownership separate for Stop.
  if ($Service.Name -ne 'backend' -and $Process.CommandLine -match '--port(?:=|\s+)["'']?(\d+)') {
    return [int]$Matches[1] -eq $Service.Port
  }
  return $true
}

function Get-CanteenProcessSnapshot {
  @(Get-CimInstance -Query 'SELECT ProcessId,ParentProcessId,Name,CommandLine,CreationDate FROM Win32_Process')
}

function Assert-CanteenPort {
  param($Service, [array]$Processes)
  $listenerIds = @(Get-CanteenListenerIds -Port $Service.Port)
  foreach ($listenerId in $listenerIds) {
    $owned = $false
    $ancestorId = $listenerId
    for ($depth = 0; $depth -lt 8 -and $ancestorId -gt 0; $depth++) {
      $process = $Processes | Where-Object { $_.ProcessId -eq $ancestorId } | Select-Object -First 1
      if ($null -eq $process) { break }
      if (Test-CanteenProcess -Process $process -Service $Service) { $owned = $true; break }
      $ancestorId = [int]$process.ParentProcessId
    }
    if (-not $owned) {
      $occupant = $Processes | Where-Object { $_.ProcessId -eq $listenerId } | Select-Object -First 1
      $detail = if ($null -ne $occupant) { " Process: $($occupant.Name)." } else { '' }
      throw "Port $($Service.Port) is occupied by an unverified service (PID $listenerId).$detail Close that service or check its working directory, then retry. No process was stopped."
    }
  }
  return $listenerIds.Count -gt 0
}

function Test-CanteenReady {
  param($Service)
  try {
    if ($Service.Name -eq 'backend') {
      $response = Invoke-RestMethod -Uri $Service.Url -TimeoutSec 2
      return $response.success -eq $true -and $response.data.status -eq 'ok'
    }
    # Mobile Vite listens on IPv4; Windows PowerShell may try localhost via IPv6 first.
    $checkUrl = if ($Service.Name -eq 'phone') { 'http://127.0.0.1:5174/dashboard' } else { $Service.Url }
    $response = Invoke-WebRequest -Uri $checkUrl -UseBasicParsing -TimeoutSec 2
    return $response.StatusCode -eq 200 -and $response.Content -match '/@vite/client'
  } catch { return $false }
}

function Wait-CanteenReady {
  param($Service, $Process, [string]$LogDirectory, [array]$Processes)
  $timeoutSeconds = 45
  $deadline = (Get-Date).AddSeconds($timeoutSeconds)
  do {
    if ($null -ne $Process -and $Process.HasExited) {
      throw "$($Service.Name) exited with code $($Process.ExitCode). See $LogDirectory\$($Service.Name).error.log"
    }
    if (Test-CanteenReady -Service $Service) {
      if ($null -ne $Process) { $Processes = @(Get-CanteenProcessSnapshot) }
      if (Assert-CanteenPort -Service $Service -Processes $Processes) { return }
    }
    Start-Sleep -Milliseconds 400
  } while ((Get-Date) -lt $deadline)
  throw "$($Service.Name) was not ready within $timeoutSeconds seconds. See logs in $LogDirectory"
}

function Stop-CanteenProcesses {
  param([array]$Services, [switch]$DryRun)
  $snapshot = @(Get-CanteenProcessSnapshot)
  $targets = @{}
  foreach ($process in $snapshot) {
    foreach ($service in $Services) {
      $isLegacyWindow = $process.Name -eq 'powershell.exe' -and
        $null -ne $process.CommandLine -and
        $process.CommandLine.Contains("Canteen Helper - ") -and
        $process.CommandLine.Contains("Set-Location -LiteralPath '$($service.Directory)'")
      if ((Test-CanteenProcess -Process $process -Service $service) -or $isLegacyWindow) {
        $targets[[int]$process.ProcessId] = $process
      }
    }
  }
  # Include only descendants of the positively identified project runners/windows.
  do {
    $added = $false
    foreach ($process in $snapshot) {
      if ($targets.ContainsKey([int]$process.ParentProcessId) -and -not $targets.ContainsKey([int]$process.ProcessId)) {
        $targets[[int]$process.ProcessId] = $process
        $added = $true
      }
    }
  } while ($added)
  if ($targets.Count -eq 0) { Write-Host 'No project development services are running.'; return }
  # Stop roots first, preventing tsx watch from respawning a stopped child.
  $remaining = @{} + $targets
  while ($remaining.Count -gt 0) {
    foreach ($process in @($remaining.Values)) {
      if ($remaining.ContainsKey([int]$process.ParentProcessId)) { continue }
      if ($DryRun) {
        Write-Host "[DryRun] Stop $($process.Name) PID $($process.ProcessId)"
      } else {
        $current = Get-Process -Id $process.ProcessId -ErrorAction SilentlyContinue
        if ($null -ne $current -and [Math]::Abs(($current.StartTime.ToUniversalTime() - $process.CreationDate.ToUniversalTime()).TotalMilliseconds) -lt 1) {
          try { $current.Kill() } catch { if (-not $current.HasExited) { throw } }
        }
      }
      $remaining.Remove([int]$process.ProcessId)
    }
  }
  Write-Host 'Project development services stopped.' -ForegroundColor Green
}

function Start-CanteenBackground {
  param($Service, [string]$NodePath, [string]$LogDirectory)
  # Native redirection keeps logs flowing after the launcher exits. The environment
  # passes Unicode/spaced paths without embedding them in shell command text.
  $values = @{
    CANTEEN_DEV_NODE = $NodePath
    CANTEEN_DEV_CLI = (Join-Path $Service.Directory $Service.Cli)
    CANTEEN_DEV_OUT = (Join-Path $LogDirectory "$($Service.Name).log")
    CANTEEN_DEV_ERR = (Join-Path $LogDirectory "$($Service.Name).error.log")
  }
  $previous = @{}
  try {
    foreach ($key in $values.Keys) {
      $previous[$key] = [Environment]::GetEnvironmentVariable($key, 'Process')
      [Environment]::SetEnvironmentVariable($key, $values[$key], 'Process')
    }
    $arguments = '/d /v:off /s /c ""%CANTEEN_DEV_NODE%" "%CANTEEN_DEV_CLI%" ' + $Service.Arguments + ' 1>"%CANTEEN_DEV_OUT%" 2>"%CANTEEN_DEV_ERR%""'
    Start-Process -FilePath "$env:SystemRoot\System32\cmd.exe" -ArgumentList $arguments -WorkingDirectory $Service.Directory -WindowStyle Hidden -PassThru
  } finally {
    foreach ($key in $previous.Keys) { [Environment]::SetEnvironmentVariable($key, $previous[$key], 'Process') }
  }
}

function Invoke-CanteenDev {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory)][string]$ProjectRoot,
    [ValidateSet('pc', 'phone')][string]$Frontend = 'pc',
    [ValidateSet('Start', 'Stop')][string]$Action = 'Start',
    [switch]$EmbeddingOnly,
    [switch]$DryRun
  )
  $ProjectRoot = [IO.Path]::GetFullPath($ProjectRoot).TrimEnd('\')
  $services = @(Get-CanteenServices -ProjectRoot $ProjectRoot)
  $logDirectory = Join-Path $ProjectRoot '.tmp\canteen-dev'
  $hashProvider = [Security.Cryptography.SHA256]::Create()
  try {
    $hash = [BitConverter]::ToString($hashProvider.ComputeHash([Text.Encoding]::UTF8.GetBytes($ProjectRoot.ToLowerInvariant()))).Replace('-', '')
  } finally { $hashProvider.Dispose() }
  $mutex = New-Object Threading.Mutex($false, "Local\CanteenHelper-$hash")
  $locked = $false
  try {
    Write-Host 'Checking project services...' -ForegroundColor Cyan
    try { $locked = $mutex.WaitOne(60000) } catch [Threading.AbandonedMutexException] { $locked = $true }
    if (-not $locked) { throw 'Another startup or stop is still running. Please try again shortly.' }
    if ($Action -eq 'Stop') { Stop-CanteenProcesses -Services $services -DryRun:$DryRun; return }

    Import-Module (Join-Path $PSScriptRoot 'canteen-ollama.psm1') -Force -DisableNameChecking
    if ($EmbeddingOnly) { Ensure-CanteenOllama -ProjectRoot $ProjectRoot -DryRun:$DryRun; return }

    $selectedNames = @('backend', $Frontend)
    $backendEnv = Join-Path $ProjectRoot 'backend\.env'
    $useLocalEmbedding = (Test-Path -LiteralPath $backendEnv) -and (Select-String -LiteralPath $backendEnv -Pattern '^\s*EMBEDDING_PROVIDER\s*=\s*local\s*$' -Quiet)
    $selected = @($services | Where-Object { $_.Name -in $selectedNames })
    $node = Get-Command node.exe -ErrorAction Stop
    # Preflight BOTH ports before starting anything.
    $running = @{}
    $processes = @(Get-CanteenProcessSnapshot)
    foreach ($service in $selected) {
      $cliPath = Join-Path $service.Directory $service.Cli
      if (-not (Test-Path -LiteralPath $cliPath -PathType Leaf)) {
        throw "Missing $cliPath. Run npm install in $($service.Directory) first."
      }
      $running[$service.Name] = Assert-CanteenPort -Service $service -Processes $processes
    }
    if ($useLocalEmbedding) { Ensure-CanteenOllama -ProjectRoot $ProjectRoot -DryRun:$DryRun }
    if (-not $DryRun) { New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null }
    foreach ($service in $selected) {
      $child = $null
      if ($running[$service.Name]) {
        Write-Host "Reusing $($service.Name) on port $($service.Port)." -ForegroundColor Green
      } else {
        # Reuse a watcher that is starting or waiting for a source fix without listening.
        $existing = @($processes | Where-Object {
          (Test-CanteenProcess -Process $_ -Service $service) -and (Test-CanteenRunnerPort -Process $_ -Service $service)
        })
        if ($existing.Count -gt 0) {
          Write-Host "Waiting for existing $($service.Name) runner (PID $($existing[0].ProcessId))."
        } elseif ($DryRun) {
          Write-Host "[DryRun] Start hidden: $($service.Name), port $($service.Port); logs: $logDirectory"
        } else {
          $child = Start-CanteenBackground -Service $service -NodePath $node.Source -LogDirectory $logDirectory
          Write-Host "Started $($service.Name) in background (PID $($child.Id))." -ForegroundColor Green
        }
      }
      if (-not $DryRun) { Wait-CanteenReady -Service $service -Process $child -LogDirectory $logDirectory -Processes $processes }
    }
    $frontendService = $selected | Where-Object { $_.Name -eq $Frontend }
    $access = @("Local: $($frontendService.Url)")
    if ($Frontend -eq 'phone') {
      $addresses = @([Net.NetworkInformation.NetworkInterface]::GetAllNetworkInterfaces() |
        Where-Object { $_.OperationalStatus -eq 'Up' -and $_.NetworkInterfaceType -ne 'Loopback' } |
        ForEach-Object { $_.GetIPProperties().UnicastAddresses } |
        Where-Object { $_.Address.AddressFamily -eq 'InterNetwork' -and $_.Address.ToString() -notlike '169.254.*' } |
        ForEach-Object { $_.Address.ToString() } | Select-Object -Unique)
      $access += @($addresses | ForEach-Object { "Phone (same LAN): http://${_}:5174/dashboard" })
    }
    $access | ForEach-Object { Write-Host $_ -ForegroundColor Cyan }
    if (-not $DryRun) {
      $access | Set-Content -LiteralPath (Join-Path $logDirectory "$Frontend-urls.txt") -Encoding UTF8
    }
    Write-Host "Logs: $logDirectory"
    Write-Host 'Ready. This startup window can close; services will keep running.' -ForegroundColor Green
  } finally {
    if ($locked) { $mutex.ReleaseMutex() }
    $mutex.Dispose()
  }
}

Export-ModuleMember -Function Invoke-CanteenDev
