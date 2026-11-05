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

  robocopy $Source $Destination /E /XD node_modules dist .git .vite /XF *.log .env dev.db | Out-Host
  if ($LASTEXITCODE -ge 8) {
    throw "Robocopy failed: $Source -> $Destination. Exit code: $LASTEXITCODE"
  }
}

Require-Command "scp.exe"
Require-Command "ssh.exe"

$Workspace = Split-Path -Parent $MyInvocation.MyCommand.Path
$StagingRoot = Join-Path $env:TEMP "canteen-helper-deploy"
$Staging = Join-Path $StagingRoot "canteen-helper"

if (Test-Path $StagingRoot) {
  $Resolved = (Resolve-Path $StagingRoot).Path
  if (-not $Resolved.StartsWith($env:TEMP, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Unsafe staging path: $Resolved"
  }
  Remove-Item -LiteralPath $StagingRoot -Recurse -Force
}

New-Item -ItemType Directory -Path $Staging | Out-Null

Write-Host "Preparing deploy files..."
Invoke-RobocopyChecked -Source (Join-Path $Workspace "backend") -Destination (Join-Path $Staging "backend")
Invoke-RobocopyChecked -Source (Join-Path $Workspace "front-pc") -Destination (Join-Path $Staging "front-pc")
Invoke-RobocopyChecked -Source (Join-Path $Workspace "front-phone") -Destination (Join-Path $Staging "front-phone")

Copy-Item -Path (Join-Path $Workspace "switch-server-to-canteen-helper.sh") -Destination $Staging -Force
Copy-Item -Path (Join-Path $Workspace "deploy-tencent-ubuntu.md") -Destination $Staging -Force

Write-Host "Preparing remote temp directory..."
ssh.exe "${User}@${Server}" "rm -rf /tmp/canteen-helper-upload && mkdir -p /tmp/canteen-helper-upload"
if ($LASTEXITCODE -ne 0) {
  throw "Failed to prepare remote upload directory."
}

Write-Host "Uploading project directory to $Server..."
scp.exe -r "${Staging}\*" "${User}@${Server}:/tmp/canteen-helper-upload/"
if ($LASTEXITCODE -ne 0) {
  throw "Upload failed. SSH login was rejected or the connection was closed. Please verify the server password, SSH port 22, and whether root login is allowed."
}

$RemoteScript = @'
set -e
export PATH="/usr/local/bin:/usr/bin:/bin:$PATH"
if [ "$(id -u)" -eq 0 ]; then
  SUDO=""
else
  SUDO="sudo"
fi

echo "==> Install base packages"
$SUDO env DEBIAN_FRONTEND=noninteractive apt-get update
$SUDO env DEBIAN_FRONTEND=noninteractive apt-get install -y nginx unzip curl xz-utils ca-certificates

NODE_MAJOR=0
if command -v node >/dev/null 2>&1; then
  NODE_MAJOR="$(node -v | sed 's/^v//' | cut -d. -f1)"
fi

if [ "$NODE_MAJOR" -lt 22 ]; then
  echo "==> Install Node.js 22 binary package"
  NODE_VERSION="v22.18.0"
  MACHINE_ARCH="$(uname -m)"
  if [ "$MACHINE_ARCH" = "x86_64" ]; then
    NODE_ARCH="x64"
  elif [ "$MACHINE_ARCH" = "aarch64" ] || [ "$MACHINE_ARCH" = "arm64" ]; then
    NODE_ARCH="arm64"
  else
    echo "ERROR: Unsupported CPU architecture: $MACHINE_ARCH"
    exit 20
  fi

  NODE_FILE="node-${NODE_VERSION}-linux-${NODE_ARCH}.tar.xz"
  NODE_URL_CN="https://npmmirror.com/mirrors/node/${NODE_VERSION}/${NODE_FILE}"
  NODE_URL_OFFICIAL="https://nodejs.org/dist/${NODE_VERSION}/${NODE_FILE}"

  if ! curl -fL --connect-timeout 20 --max-time 300 "$NODE_URL_CN" -o "/tmp/${NODE_FILE}"; then
    echo "==> China mirror failed, try official Node.js dist"
    curl -fL --connect-timeout 20 --max-time 300 "$NODE_URL_OFFICIAL" -o "/tmp/${NODE_FILE}"
  fi

  $SUDO rm -rf "/usr/local/node-${NODE_VERSION}-linux-${NODE_ARCH}"
  $SUDO tar -xJf "/tmp/${NODE_FILE}" -C /usr/local
  $SUDO ln -sf "/usr/local/node-${NODE_VERSION}-linux-${NODE_ARCH}/bin/node" /usr/local/bin/node
  $SUDO ln -sf "/usr/local/node-${NODE_VERSION}-linux-${NODE_ARCH}/bin/npm" /usr/local/bin/npm
  $SUDO ln -sf "/usr/local/node-${NODE_VERSION}-linux-${NODE_ARCH}/bin/npx" /usr/local/bin/npx
  if [ -f "/usr/local/node-${NODE_VERSION}-linux-${NODE_ARCH}/bin/corepack" ]; then
    $SUDO ln -sf "/usr/local/node-${NODE_VERSION}-linux-${NODE_ARCH}/bin/corepack" /usr/local/bin/corepack
  fi

  NODE_MAJOR="$(node -v | sed 's/^v//' | cut -d. -f1)"
fi

if [ "$NODE_MAJOR" -lt 22 ]; then
  echo "ERROR: Node.js 22+ is required. Current: $(node -v 2>/dev/null || echo none)"
  exit 21
fi

echo "==> Configure npm registry"
npm config set registry https://registry.npmmirror.com
$SUDO npm config set registry https://registry.npmmirror.com
export PRISMA_ENGINES_MIRROR="https://registry.npmmirror.com/-/binary/prisma"
export PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1
FORCE_INSTALL_DEPS="__INSTALL_DEPS__"

if ! command -v pm2 >/dev/null 2>&1; then
  echo "==> Install pm2"
  $SUDO npm install -g pm2 --registry=https://registry.npmmirror.com
fi
export PATH="$(npm prefix -g)/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
if ! command -v pm2 >/dev/null 2>&1; then
  echo "ERROR: pm2 is not available after installation."
  echo "npm global prefix: $(npm prefix -g)"
  exit 22
fi

deps_hash() {
  ( [ -f package.json ] && sha256sum package.json || true
    [ -f package-lock.json ] && sha256sum package-lock.json || true ) | sha256sum | awk '{print $1}'
}

install_deps_if_needed() {
  APP_NAME="$1"
  CURRENT_HASH="$(deps_hash)"
  PREVIOUS_HASH="$(cat .deploy-deps.sha256 2>/dev/null || true)"
  if [ "$FORCE_INSTALL_DEPS" = "1" ] || [ ! -d node_modules ] || [ "$CURRENT_HASH" != "$PREVIOUS_HASH" ]; then
    echo "==> Install dependencies: $APP_NAME"
    npm install --registry=https://registry.npmmirror.com
    deps_hash > .deploy-deps.sha256
  else
    echo "==> Skip dependencies: $APP_NAME unchanged"
  fi
}

sync_frontend() {
  SRC="$1"
  DEST="$2"
  $SUDO mkdir -p "$DEST"
  $SUDO chown -R "$(id -un)":"$(id -gn)" "$DEST"
  find "$DEST" -mindepth 1 -maxdepth 1 ! -name node_modules ! -name dist ! -name .deploy-deps.sha256 -exec rm -rf {} +
  cp -a "$SRC"/. "$DEST"/
}

sync_backend() {
  SRC="$1"
  DEST="$2"
  DB_BACKUP="/tmp/canteen-helper-dev.db.backup"
  $SUDO mkdir -p "$DEST"
  $SUDO chown -R "$(id -un)":"$(id -gn)" "$DEST"
  if [ -f "$DEST/prisma/dev.db" ]; then
    cp "$DEST/prisma/dev.db" "$DB_BACKUP"
  fi
  find "$DEST" -mindepth 1 -maxdepth 1 ! -name node_modules ! -name dist ! -name .deploy-deps.sha256 ! -name .env -exec rm -rf {} +
  cp -a "$SRC"/. "$DEST"/
  if [ -f "$DB_BACKUP" ]; then
    mkdir -p "$DEST/prisma"
    cp "$DB_BACKUP" "$DEST/prisma/dev.db"
  fi
}

echo "==> Copy uploaded project to __REMOTE_DIR__"
$SUDO mkdir -p __REMOTE_DIR__
$SUDO chown -R "$(id -un)":"$(id -gn)" __REMOTE_DIR__
sync_backend /tmp/canteen-helper-upload/backend __REMOTE_DIR__/backend
sync_frontend /tmp/canteen-helper-upload/front-pc __REMOTE_DIR__/front-pc
sync_frontend /tmp/canteen-helper-upload/front-phone __REMOTE_DIR__/front-phone
cp -a /tmp/canteen-helper-upload/switch-server-to-canteen-helper.sh __REMOTE_DIR__/
cp -a /tmp/canteen-helper-upload/deploy-tencent-ubuntu.md __REMOTE_DIR__/

echo "==> Install and build backend"
cd __REMOTE_DIR__/backend
install_deps_if_needed "backend"
npm run prisma:generate
DB_NEEDS_SEED=0
if [ ! -f prisma/dev.db ] || [ ! -s prisma/dev.db ]; then
  DB_NEEDS_SEED=1
fi
npm run db:push
if [ "$DB_NEEDS_SEED" = "1" ]; then
  npm run db:seed
else
  echo "==> Skip database seed: existing database preserved"
fi
npm run build

echo "==> Start backend"
pm2 delete canteen-backend >/dev/null 2>&1 || true
pm2 start __REMOTE_DIR__/backend/dist/server.js --name canteen-backend --cwd __REMOTE_DIR__/backend
pm2 save

echo "==> Build PC frontend"
cd __REMOTE_DIR__/front-pc
install_deps_if_needed "front-pc"
VITE_CUSTOMER_ORDER_BASE_URL=http://__SERVER__/phone npm run build

echo "==> Build phone frontend"
cd __REMOTE_DIR__/front-phone
install_deps_if_needed "front-phone"
VITE_BASE_PATH=/phone/ npm run build
test -f __REMOTE_DIR__/front-phone/dist/index.html

echo "==> Switch Nginx to canteen-helper"
cd __REMOTE_DIR__
$SUDO APP_DIR="__REMOTE_DIR__" bash switch-server-to-canteen-helper.sh

echo "==> Validate deployment"
test -f __REMOTE_DIR__/front-pc/dist/index.html
test -f __REMOTE_DIR__/front-phone/dist/index.html
$SUDO nginx -T 2>/dev/null | grep -q "__REMOTE_DIR__/front-pc/dist"
$SUDO nginx -T 2>/dev/null | grep -q "__REMOTE_DIR__/front-phone/dist"
if ! $SUDO ss -ltnp | grep ':80' | grep -q nginx; then
  echo "ERROR: Port 80 is not served by nginx."
  $SUDO ss -ltnp | grep ':80' || true
  exit 23
fi

echo "==> Deployment completed"
echo "PC: http://__SERVER__/"
echo "Phone: http://__SERVER__/phone/"
'@

$InstallDepsFlag = if ($InstallDeps) { "1" } else { "0" }
$RemoteScript = $RemoteScript.Replace("__REMOTE_DIR__", $RemoteDir).Replace("__SERVER__", $Server).Replace("__INSTALL_DEPS__", $InstallDepsFlag)

Write-Host "Deploying on server..."
$RemoteScript | ssh.exe "${User}@${Server}" "bash -s"
if ($LASTEXITCODE -ne 0) {
  throw "Remote deployment failed. The project may not have been deployed. Please check the SSH login and server output above."
}

$CacheBust = Get-Date -Format yyyyMMddHHmmss
Write-Host ""
Write-Host "Deployment completed."
Write-Host "PC: http://$Server/"
Write-Host "Phone: http://$Server/phone/"
Write-Host "If your phone still shows the old page, open: http://$Server/phone/?v=$CacheBust"
