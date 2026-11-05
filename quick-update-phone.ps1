param(
  [string]$Server = "203.0.113.10",
  [string]$User = "ubuntu",
  [string]$RemoteDir = "/opt/projects/canteen-helper",
  [switch]$InstallDeps
)

$ErrorActionPreference = "Stop"

function Require-Command {
  param([string]$Name)

  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Command not found: $Name. Please enable Windows OpenSSH Client first."
  }
}

function Invoke-RobocopyChecked {
  param(
    [string]$Source,
    [string]$Destination
  )

  robocopy $Source $Destination /E /XD node_modules dist .git .vite /XF *.log .env | Out-Host
  if ($LASTEXITCODE -ge 8) {
    throw "Robocopy failed: $Source -> $Destination. Exit code: $LASTEXITCODE"
  }
}

Require-Command "scp.exe"
Require-Command "ssh.exe"

$Workspace = Split-Path -Parent $MyInvocation.MyCommand.Path
$SourceDir = Join-Path $Workspace "front-phone"
if (-not (Test-Path $SourceDir)) {
  throw "front-phone folder not found: $SourceDir"
}

$StagingRoot = Join-Path $env:TEMP "canteen-helper-phone-update"
$Staging = Join-Path $StagingRoot "front-phone"

if (Test-Path $StagingRoot) {
  $Resolved = (Resolve-Path $StagingRoot).Path
  if (-not $Resolved.StartsWith($env:TEMP, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Unsafe staging path: $Resolved"
  }
  Remove-Item -LiteralPath $StagingRoot -Recurse -Force
}

New-Item -ItemType Directory -Path $Staging | Out-Null

Write-Host "Preparing phone frontend files..."
Invoke-RobocopyChecked -Source $SourceDir -Destination $Staging

Write-Host "Preparing remote temp directory..."
ssh.exe "${User}@${Server}" "rm -rf /tmp/canteen-phone-upload && mkdir -p /tmp/canteen-phone-upload"
if ($LASTEXITCODE -ne 0) {
  throw "Failed to prepare remote upload directory."
}

Write-Host "Uploading phone frontend to $Server..."
scp.exe -r "${Staging}\*" "${User}@${Server}:/tmp/canteen-phone-upload/"
if ($LASTEXITCODE -ne 0) {
  throw "Upload failed. Please verify the server address, SSH account, and password."
}

$RemoteScript = @'
set -e
export PATH="/usr/local/bin:/usr/bin:/bin:$PATH"
if [ "$(id -u)" -eq 0 ]; then
  SUDO=""
else
  SUDO="sudo"
fi

FORCE_INSTALL_DEPS="__INSTALL_DEPS__"

deps_hash() {
  ( [ -f package.json ] && sha256sum package.json || true
    [ -f package-lock.json ] && sha256sum package-lock.json || true ) | sha256sum | awk '{print $1}'
}

install_deps_if_needed() {
  CURRENT_HASH="$(deps_hash)"
  PREVIOUS_HASH="$(cat .deploy-deps.sha256 2>/dev/null || true)"
  if [ "$FORCE_INSTALL_DEPS" = "1" ] || [ ! -d node_modules ] || [ "$CURRENT_HASH" != "$PREVIOUS_HASH" ]; then
    echo "==> Install dependencies: front-phone"
    npm install --registry=https://registry.npmmirror.com
    deps_hash > .deploy-deps.sha256
  else
    echo "==> Skip dependencies: front-phone unchanged"
  fi
}

echo "==> Sync phone frontend"
$SUDO mkdir -p __REMOTE_DIR__/front-phone
$SUDO chown -R "$(id -un)":"$(id -gn)" __REMOTE_DIR__/front-phone
find __REMOTE_DIR__/front-phone -mindepth 1 -maxdepth 1 ! -name node_modules ! -name dist ! -name .deploy-deps.sha256 -exec rm -rf {} +
cp -a /tmp/canteen-phone-upload/. __REMOTE_DIR__/front-phone/

echo "==> Build phone frontend"
cd __REMOTE_DIR__/front-phone
install_deps_if_needed
VITE_BASE_PATH=/phone/ npm run build
test -f __REMOTE_DIR__/front-phone/dist/index.html

echo "==> Reload nginx"
$SUDO nginx -t
$SUDO systemctl reload nginx

echo "==> Phone update completed"
echo "Phone: http://__SERVER__/phone/"
'@

$InstallDepsFlag = if ($InstallDeps) { "1" } else { "0" }
$RemoteScript = $RemoteScript.Replace("__REMOTE_DIR__", $RemoteDir).Replace("__SERVER__", $Server).Replace("__INSTALL_DEPS__", $InstallDepsFlag)

Write-Host "Updating phone frontend on server..."
$RemoteScript | ssh.exe "${User}@${Server}" "bash -s"
if ($LASTEXITCODE -ne 0) {
  throw "Remote phone update failed. If this is the first deployment, run upload-and-deploy-tencent.ps1 once first."
}

$CacheBust = Get-Date -Format yyyyMMddHHmmss
Write-Host ""
Write-Host "Phone update completed."
Write-Host "Phone: http://$Server/phone/?v=$CacheBust"
