# Ollama is shared with other applications. Reuse it; never stop it with the project.
Set-StrictMode -Version Latest

function Get-CanteenOllamaModels {
  try { return Invoke-RestMethod -Uri 'http://127.0.0.1:11434/api/tags' -TimeoutSec 3 }
  catch { return $null }
}

function Ensure-CanteenOllama {
  param([string]$ProjectRoot, [switch]$DryRun)
  $models = Get-CanteenOllamaModels
  if ($null -eq $models) {
    $command = Get-Command ollama.exe -ErrorAction SilentlyContinue
    if ($null -eq $command) { throw 'Ollama is not installed. Install Ollama and pull bge-m3 first.' }
    if ($DryRun) {
      Write-Host '[DryRun] Start installed Ollama in background; no model will be downloaded.'
      return
    }
    $appPath = Join-Path (Split-Path $command.Source -Parent) 'ollama app.exe'
    if (-not (Test-Path -LiteralPath $appPath)) {
      throw 'Please start the installed Ollama service, then retry. No model was downloaded.'
    }
    # Preserve the installed app's configured model directory.
    Start-Process -FilePath $appPath -WorkingDirectory (Split-Path $appPath -Parent) -WindowStyle Hidden | Out-Null
    $deadline = (Get-Date).AddSeconds(60)
    do {
      $models = Get-CanteenOllamaModels
      if ($null -ne $models) { break }
      Start-Sleep -Milliseconds 500
    } while ((Get-Date) -lt $deadline)
    if ($null -eq $models) { throw 'Ollama did not become ready on 127.0.0.1:11434. Check its application logs.' }
  }
  if (-not $models.PSObject.Properties['models']) { throw 'Port 11434 did not return an Ollama model list.' }
  if (-not (@($models.models | Where-Object { $_.name -eq 'bge-m3:latest' }).Count)) {
    throw 'The installed Ollama has no bge-m3:latest. Run ollama pull bge-m3 manually if needed. No model was downloaded.'
  }
  Write-Host 'Reusing installed Ollama bge-m3:latest on port 11434; no API key required.' -ForegroundColor Green
}

Export-ModuleMember -Function Ensure-CanteenOllama
