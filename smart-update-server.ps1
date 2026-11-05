param(
  [string]$Server = "203.0.113.10",
  [string]$User = "ubuntu",
  [string]$RemoteDir = "/opt/projects/canteen-helper",
  [switch]$InstallDeps,
  [switch]$SeedDb,
  [switch]$SkipLocalBuild,
  [switch]$AcceptPrismaDataLoss
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
    [string]$Destination,
    [string[]]$ExtraExcludeFiles = @()
  )

  $ExcludeFiles = @("*.log", ".env", "dev.db") + $ExtraExcludeFiles
  robocopy $Source $Destination /E /XD node_modules dist .git .vite /XF $ExcludeFiles | Out-Host
  if ($LASTEXITCODE -ge 8) {
    throw "Robocopy failed: $Source -> $Destination. Exit code: $LASTEXITCODE"
  }
}

function Invoke-NpmBuild {
  param(
    [string]$Path,
    [hashtable]$EnvVars = @()
  )

  $oldValues = @{}
  foreach ($key in $EnvVars.Keys) {
    $oldValues[$key] = [Environment]::GetEnvironmentVariable($key, "Process")
    [Environment]::SetEnvironmentVariable($key, [string]$EnvVars[$key], "Process")
  }

  try {
    npm.cmd run build --prefix $Path
  } finally {
    foreach ($key in $EnvVars.Keys) {
      [Environment]::SetEnvironmentVariable($key, $oldValues[$key], "Process")
    }
  }
}

Require-Command "scp.exe"
Require-Command "ssh.exe"
Require-Command "tar.exe"
if (-not $SkipLocalBuild) {
  Require-Command "npm.cmd"
}

$Workspace = Split-Path -Parent $MyInvocation.MyCommand.Path
$StagingRoot = Join-Path $env:TEMP "canteen-helper-smart-update"
$Staging = Join-Path $StagingRoot "canteen-helper"
$DistStaging = Join-Path $Staging "prebuilt-dist"
$ArchivePath = Join-Path $StagingRoot "canteen-helper-smart-update.tgz"

if (Test-Path $StagingRoot) {
  $Resolved = (Resolve-Path $StagingRoot).Path
  if (-not $Resolved.StartsWith($env:TEMP, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Unsafe staging path: $Resolved"
  }
  Remove-Item -LiteralPath $StagingRoot -Recurse -Force
}

New-Item -ItemType Directory -Path $Staging | Out-Null

Write-Host "Preparing smart update files..."
Invoke-RobocopyChecked -Source (Join-Path $Workspace "backend") -Destination (Join-Path $Staging "backend")
Invoke-RobocopyChecked -Source (Join-Path $Workspace "front-pc") -Destination (Join-Path $Staging "front-pc")
Invoke-RobocopyChecked -Source (Join-Path $Workspace "front-phone") -Destination (Join-Path $Staging "front-phone")
Copy-Item -Path (Join-Path $Workspace "switch-server-to-canteen-helper.sh") -Destination $Staging -Force

if (-not $SkipLocalBuild) {
  Write-Host "Building frontend dist locally as fallback..."
  Invoke-NpmBuild -Path (Join-Path $Workspace "front-pc") -EnvVars @{
    VITE_CUSTOMER_ORDER_BASE_URL = "http://$Server/phone"
  }
  Invoke-NpmBuild -Path (Join-Path $Workspace "front-phone") -EnvVars @{
    VITE_BASE_PATH = "/phone/"
  }

  $PcDist = Join-Path $Workspace "front-pc\dist"
  $PhoneDist = Join-Path $Workspace "front-phone\dist"
  if (-not (Test-Path (Join-Path $PcDist "index.html"))) {
    throw "Local PC build did not produce dist/index.html"
  }
  if (-not (Test-Path (Join-Path $PhoneDist "index.html"))) {
    throw "Local phone build did not produce dist/index.html"
  }

  New-Item -ItemType Directory -Path $DistStaging | Out-Null
  Copy-Item -Path $PcDist -Destination (Join-Path $DistStaging "front-pc-dist") -Recurse -Force
  Copy-Item -Path $PhoneDist -Destination (Join-Path $DistStaging "front-phone-dist") -Recurse -Force
} else {
  Write-Host "Local fallback build skipped by request."
}

Write-Host "Packing smart update package..."
tar.exe -czf $ArchivePath -C $StagingRoot "canteen-helper"
if ($LASTEXITCODE -ne 0) {
  throw "Failed to create update archive."
}

Write-Host "Uploading smart update package to $Server..."
scp.exe $ArchivePath "${User}@${Server}:/tmp/canteen-smart-upload.tgz"
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

APP_DIR="__REMOTE_DIR__"
LEGACY_APP_DIR="/opt/canteen-helper"
SERVER="__SERVER__"
FORCE_INSTALL_DEPS="__INSTALL_DEPS__"
SEED_DB="__SEED_DB__"
ACCEPT_PRISMA_DATA_LOSS="__ACCEPT_PRISMA_DATA_LOSS__"
UPLOAD_ARCHIVE="/tmp/canteen-smart-upload.tgz"
UPLOAD_DIR="/tmp/canteen-smart-upload"
export PRISMA_ENGINES_MIRROR="https://registry.npmmirror.com/-/binary/prisma"
export PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1

echo "==> Unpack uploaded package"
rm -rf "$UPLOAD_DIR"
mkdir -p "$UPLOAD_DIR"
tar -xzf "$UPLOAD_ARCHIVE" -C "$UPLOAD_DIR" --strip-components=1

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

create_backup() {
  BACKUP_ROOT="$APP_DIR/backups"
  BACKUP_STAMP="$(date +%Y%m%d-%H%M%S)"
  BACKUP_DIR="$BACKUP_ROOT/$BACKUP_STAMP"

  echo "==> Backup production data"
  $SUDO mkdir -p "$BACKUP_DIR"
  $SUDO chown -R "$(id -un)":"$(id -gn)" "$BACKUP_ROOT"

  if [ -f "$APP_DIR/backend/prisma/dev.db" ]; then
    cp "$APP_DIR/backend/prisma/dev.db" "$BACKUP_DIR/dev.db"
    echo "    database: $BACKUP_DIR/dev.db"
  else
    echo "    database: skipped, dev.db not found"
  fi

  if [ -f "$APP_DIR/backend/.env" ]; then
    cp "$APP_DIR/backend/.env" "$BACKUP_DIR/backend.env"
    chmod 600 "$BACKUP_DIR/backend.env" || true
    echo "    backend env: $BACKUP_DIR/backend.env"
  else
    echo "    backend env: skipped, .env not found"
  fi

  if [ "$APP_DIR" != "$LEGACY_APP_DIR" ] && [ -d "$LEGACY_APP_DIR" ]; then
    if [ -f "$LEGACY_APP_DIR/backend/prisma/dev.db" ]; then
      cp "$LEGACY_APP_DIR/backend/prisma/dev.db" "$BACKUP_DIR/legacy-dev.db"
      echo "    legacy database: $BACKUP_DIR/legacy-dev.db"
    fi

    if [ -f "$LEGACY_APP_DIR/backend/.env" ]; then
      cp "$LEGACY_APP_DIR/backend/.env" "$BACKUP_DIR/legacy-backend.env"
      chmod 600 "$BACKUP_DIR/legacy-backend.env" || true
      echo "    legacy backend env: $BACKUP_DIR/legacy-backend.env"
    fi
  fi

  if [ -f "$APP_DIR/front-pc/.env" ]; then
    cp "$APP_DIR/front-pc/.env" "$BACKUP_DIR/front-pc.env"
    chmod 600 "$BACKUP_DIR/front-pc.env" || true
    echo "    front-pc env: $BACKUP_DIR/front-pc.env"
  fi

  if [ -f "$APP_DIR/front-phone/.env" ]; then
    cp "$APP_DIR/front-phone/.env" "$BACKUP_DIR/front-phone.env"
    chmod 600 "$BACKUP_DIR/front-phone.env" || true
    echo "    front-phone env: $BACKUP_DIR/front-phone.env"
  fi

  if [ -d "$APP_DIR/front-pc/dist" ]; then
    tar -czf "$BACKUP_DIR/front-pc-dist.tgz" -C "$APP_DIR/front-pc" dist
    echo "    pc dist: $BACKUP_DIR/front-pc-dist.tgz"
  fi

  if [ -d "$APP_DIR/front-phone/dist" ]; then
    tar -czf "$BACKUP_DIR/front-phone-dist.tgz" -C "$APP_DIR/front-phone" dist
    echo "    phone dist: $BACKUP_DIR/front-phone-dist.tgz"
  fi

  find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d -mtime +14 -exec rm -rf {} +
}

migrate_legacy_state_if_needed() {
  if [ "$APP_DIR" = "$LEGACY_APP_DIR" ] || [ ! -d "$LEGACY_APP_DIR" ]; then
    return
  fi

  echo "==> Migrate legacy production data if needed"
  if [ ! -f "$APP_DIR/backend/prisma/dev.db" ] && [ -f "$LEGACY_APP_DIR/backend/prisma/dev.db" ]; then
    mkdir -p "$APP_DIR/backend/prisma"
    cp "$LEGACY_APP_DIR/backend/prisma/dev.db" "$APP_DIR/backend/prisma/dev.db"
    echo "    migrated database from $LEGACY_APP_DIR"
  else
    echo "    database migration skipped"
  fi

  if [ ! -f "$APP_DIR/backend/.env" ] && [ -f "$LEGACY_APP_DIR/backend/.env" ]; then
    mkdir -p "$APP_DIR/backend"
    cp "$LEGACY_APP_DIR/backend/.env" "$APP_DIR/backend/.env"
    chmod 600 "$APP_DIR/backend/.env" || true
    echo "    migrated backend .env from $LEGACY_APP_DIR"
  else
    echo "    backend .env migration skipped"
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

install_pm2_if_needed() {
  if ! command -v pm2 >/dev/null 2>&1; then
    echo "==> Install pm2"
    $SUDO npm install -g pm2 --registry=https://registry.npmmirror.com
  fi
  export PATH="$(npm prefix -g)/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
  if ! command -v pm2 >/dev/null 2>&1; then
    echo "ERROR: pm2 is not available after installation."
    echo "npm global prefix: $(npm prefix -g)"
    exit 24
  fi
}

install_prebuilt_dist_if_available() {
  if [ -f /tmp/canteen-smart-upload/prebuilt-dist/front-pc-dist/index.html ] &&
     [ -f /tmp/canteen-smart-upload/prebuilt-dist/front-phone-dist/index.html ]; then
    echo "==> Install local prebuilt frontend dist fallback"
    $SUDO rm -rf "$APP_DIR/front-pc/dist" "$APP_DIR/front-phone/dist"
    $SUDO cp -a /tmp/canteen-smart-upload/prebuilt-dist/front-pc-dist "$APP_DIR/front-pc/dist"
    $SUDO cp -a /tmp/canteen-smart-upload/prebuilt-dist/front-phone-dist "$APP_DIR/front-phone/dist"
  else
    echo "ERROR: Server frontend build failed and no local prebuilt dist fallback was uploaded."
    exit 31
  fi
}

repair_permissions() {
  $SUDO chmod 755 /opt || true
  $SUDO chmod 755 "$APP_DIR" "$APP_DIR/front-pc" "$APP_DIR/front-phone" || true
  $SUDO find "$APP_DIR/front-pc/dist" -type d -exec chmod 755 {} \; 2>/dev/null || true
  $SUDO find "$APP_DIR/front-pc/dist" -type f -exec chmod 644 {} \; 2>/dev/null || true
  $SUDO find "$APP_DIR/front-phone/dist" -type d -exec chmod 755 {} \; 2>/dev/null || true
  $SUDO find "$APP_DIR/front-phone/dist" -type f -exec chmod 644 {} \; 2>/dev/null || true
}

print_diagnostics() {
  echo "==> Deployment diagnostics"
  echo "-- dist files --"
  ls -la "$APP_DIR/front-pc/dist" 2>/dev/null || true
  ls -la "$APP_DIR/front-phone/dist" 2>/dev/null || true
  echo "-- nginx config --"
  $SUDO sed -n '1,240p' /etc/nginx/sites-available/canteen-helper 2>/dev/null || true
  echo "-- nginx test --"
  $SUDO nginx -t || true
  echo "-- listening ports --"
  ss -ltnp | grep -E ':(80|3000)\b' || true
  echo "-- pm2 --"
  pm2 list || true
  echo "-- backend health direct --"
  curl -sS -i http://127.0.0.1:3000/api/v2/health || true
  echo "-- nginx error log --"
  $SUDO tail -n 120 /var/log/nginx/error.log || true
}

assert_http_ok() {
  NAME="$1"
  URL="$2"
  STATUS="$(curl -sS -o /tmp/canteen-http-check-body -w '%{http_code}' "$URL" || echo 000)"
  echo "${NAME}: HTTP ${STATUS}"
  case "$STATUS" in
    200|204|304) return 0 ;;
    *)
      echo "ERROR: ${NAME} check failed: ${URL}"
      print_diagnostics
      exit 41
      ;;
  esac
}

echo "==> Sync project files"
$SUDO mkdir -p "$APP_DIR"
$SUDO chown -R "$(id -un)":"$(id -gn)" "$APP_DIR"
create_backup
migrate_legacy_state_if_needed
sync_backend /tmp/canteen-smart-upload/backend "$APP_DIR/backend"
sync_frontend /tmp/canteen-smart-upload/front-pc "$APP_DIR/front-pc"
sync_frontend /tmp/canteen-smart-upload/front-phone "$APP_DIR/front-phone"
cp -a /tmp/canteen-smart-upload/switch-server-to-canteen-helper.sh "$APP_DIR/"

echo "==> Build backend"
cd "$APP_DIR/backend"
install_deps_if_needed "backend"
npm run prisma:generate
if [ "$ACCEPT_PRISMA_DATA_LOSS" = "1" ]; then
  echo "==> Push database schema with explicit Prisma data-loss confirmation"
  npx prisma db push --accept-data-loss
else
  echo "==> Push database schema"
  if ! npm run db:push; then
    echo ""
    echo "ERROR: Prisma schema push was blocked by a data-loss warning."
    echo "If the warning only mentions adding unique constraints for nullable wechatOpenId/wechatUnionId,"
    echo "rerun this script with: -AcceptPrismaDataLoss"
    echo "Do not use that flag if Prisma warns about dropping tables, columns, or deleting data."
    exit 72
  fi
fi
if [ "$SEED_DB" = "1" ]; then
  npm run db:seed
else
  echo "==> Skip database seed"
fi
npm run build

echo "==> Restart backend"
install_pm2_if_needed
pm2 delete canteen-backend >/dev/null 2>&1 || true
pm2 start "$APP_DIR/backend/dist/server.js" --name canteen-backend --cwd "$APP_DIR/backend"
pm2 save

FRONTEND_BUILD_OK=1
echo "==> Build PC frontend on server"
if ! (
  cd "$APP_DIR/front-pc" &&
  install_deps_if_needed "front-pc" &&
  VITE_CUSTOMER_ORDER_BASE_URL="http://${SERVER}/phone" npm run build &&
  test -f "$APP_DIR/front-pc/dist/index.html"
); then
  FRONTEND_BUILD_OK=0
fi

echo "==> Build phone frontend on server"
if ! (
  cd "$APP_DIR/front-phone" &&
  install_deps_if_needed "front-phone" &&
  VITE_BASE_PATH=/phone/ npm run build &&
  test -f "$APP_DIR/front-phone/dist/index.html"
); then
  FRONTEND_BUILD_OK=0
fi

if [ "$FRONTEND_BUILD_OK" != "1" ]; then
  install_prebuilt_dist_if_available
fi

echo "==> Switch nginx to canteen-helper"
cd "$APP_DIR"
repair_permissions
$SUDO APP_DIR="$APP_DIR" bash switch-server-to-canteen-helper.sh

echo "==> Validate deployment"
test -f "$APP_DIR/front-pc/dist/index.html"
test -f "$APP_DIR/front-phone/dist/index.html"
assert_http_ok "PC frontend" "http://127.0.0.1/"
assert_http_ok "Phone frontend" "http://127.0.0.1/phone/"
assert_http_ok "Backend health" "http://127.0.0.1:3000/api/v2/health"

echo "==> Smart update completed"
echo "PC: http://${SERVER}/"
echo "Phone: http://${SERVER}/phone/"
'@

$InstallDepsFlag = if ($InstallDeps) { "1" } else { "0" }
$SeedDbFlag = if ($SeedDb) { "1" } else { "0" }
$AcceptPrismaDataLossFlag = if ($AcceptPrismaDataLoss) { "1" } else { "0" }
$RemoteScript = $RemoteScript.Replace("__REMOTE_DIR__", $RemoteDir).Replace("__SERVER__", $Server).Replace("__INSTALL_DEPS__", $InstallDepsFlag).Replace("__SEED_DB__", $SeedDbFlag).Replace("__ACCEPT_PRISMA_DATA_LOSS__", $AcceptPrismaDataLossFlag)

Write-Host "Running smart update on server..."
$RemoteScript | ssh.exe "${User}@${Server}" "bash -s"
if ($LASTEXITCODE -ne 0) {
  throw "Smart update failed. Please send the last 50 lines of this terminal output."
}

$CacheBust = Get-Date -Format yyyyMMddHHmmss
Write-Host ""
Write-Host "Smart update completed."
Write-Host "PC: http://$Server/?v=$CacheBust"
Write-Host "Phone: http://$Server/phone/?v=$CacheBust"
