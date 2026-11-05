param(
  [string]$Server = "203.0.113.10",
  [string]$User = "ubuntu",
  [string]$RemoteDir = "/opt/projects/canteen-helper"
)

$ErrorActionPreference = "Stop"

function Require-Command {
  param([string]$Name)

  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Command not found: $Name. Please enable Windows OpenSSH Client first."
  }
}

Require-Command "npm.cmd"
Require-Command "scp.exe"
Require-Command "ssh.exe"

$Workspace = Split-Path -Parent $MyInvocation.MyCommand.Path
$PcDir = Join-Path $Workspace "front-pc"
$PhoneDir = Join-Path $Workspace "front-phone"
$StagingRoot = Join-Path $env:TEMP "canteen-helper-dist-repair"

if (Test-Path $StagingRoot) {
  $Resolved = (Resolve-Path $StagingRoot).Path
  if (-not $Resolved.StartsWith($env:TEMP, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Unsafe staging path: $Resolved"
  }
  Remove-Item -LiteralPath $StagingRoot -Recurse -Force
}

New-Item -ItemType Directory -Path $StagingRoot | Out-Null

Write-Host "Building PC frontend locally..."
$env:VITE_CUSTOMER_ORDER_BASE_URL = "http://$Server/phone"
npm.cmd run build --prefix $PcDir
Remove-Item Env:\VITE_CUSTOMER_ORDER_BASE_URL -ErrorAction SilentlyContinue
if (-not (Test-Path (Join-Path $PcDir "dist\index.html"))) {
  throw "PC frontend build did not produce dist/index.html"
}

Write-Host "Building phone frontend locally..."
$env:VITE_BASE_PATH = "/phone/"
npm.cmd run build --prefix $PhoneDir
Remove-Item Env:\VITE_BASE_PATH -ErrorAction SilentlyContinue
if (-not (Test-Path (Join-Path $PhoneDir "dist\index.html"))) {
  throw "Phone frontend build did not produce dist/index.html"
}

Copy-Item -Path (Join-Path $PcDir "dist") -Destination (Join-Path $StagingRoot "front-pc-dist") -Recurse -Force
Copy-Item -Path (Join-Path $PhoneDir "dist") -Destination (Join-Path $StagingRoot "front-phone-dist") -Recurse -Force

Write-Host "Preparing remote temp directory..."
ssh.exe "${User}@${Server}" "rm -rf /tmp/canteen-dist-repair && mkdir -p /tmp/canteen-dist-repair"
if ($LASTEXITCODE -ne 0) {
  throw "Failed to prepare remote temp directory."
}

Write-Host "Uploading built dist files..."
scp.exe -r "${StagingRoot}\*" "${User}@${Server}:/tmp/canteen-dist-repair/"
if ($LASTEXITCODE -ne 0) {
  throw "Failed to upload built dist files."
}

$RemoteScript = @'
set -e

APP_DIR="__REMOTE_DIR__"
if [ "$(id -u)" -eq 0 ]; then
  SUDO=""
else
  SUDO="sudo"
fi

echo "==> Install frontend dist files"
$SUDO mkdir -p "${APP_DIR}/front-pc" "${APP_DIR}/front-phone"
$SUDO rm -rf "${APP_DIR}/front-pc/dist" "${APP_DIR}/front-phone/dist"
$SUDO cp -a /tmp/canteen-dist-repair/front-pc-dist "${APP_DIR}/front-pc/dist"
$SUDO cp -a /tmp/canteen-dist-repair/front-phone-dist "${APP_DIR}/front-phone/dist"

echo "==> Repair frontend permissions"
$SUDO chmod 755 /opt || true
$SUDO chmod 755 "${APP_DIR}" "${APP_DIR}/front-pc" "${APP_DIR}/front-phone" || true
$SUDO find "${APP_DIR}/front-pc/dist" -type d -exec chmod 755 {} \;
$SUDO find "${APP_DIR}/front-pc/dist" -type f -exec chmod 644 {} \;
$SUDO find "${APP_DIR}/front-phone/dist" -type d -exec chmod 755 {} \;
$SUDO find "${APP_DIR}/front-phone/dist" -type f -exec chmod 644 {} \;

echo "==> Write clean nginx config"
$SUDO tee /etc/nginx/sites-available/canteen-helper >/dev/null <<NGINX
server {
    listen 80;
    server_name 203.0.113.10;

    client_max_body_size 20m;
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;

    location /assets/ {
        root ${APP_DIR}/front-pc/dist;
        expires 30d;
        add_header Cache-Control "public, max-age=2592000, immutable";
        try_files \$uri =404;
    }

    location /phone/assets/ {
        alias ${APP_DIR}/front-phone/dist/assets/;
        expires 30d;
        add_header Cache-Control "public, max-age=2592000, immutable";
        try_files \$uri =404;
    }

    location = /favicon.ico {
        root ${APP_DIR}/front-pc/dist;
        access_log off;
        try_files /favicon.ico =204;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
    }

    location /phone/ {
        alias ${APP_DIR}/front-phone/dist/;
        try_files \$uri \$uri/ /phone/index.html;
    }

    location / {
        root ${APP_DIR}/front-pc/dist;
        try_files \$uri \$uri/ /index.html;
    }
}
NGINX

$SUDO ln -sfn /etc/nginx/sites-available/canteen-helper /etc/nginx/sites-enabled/canteen-helper
$SUDO nginx -t
$SUDO systemctl restart nginx

echo "==> Ensure backend is running if build exists"
if [ -f "${APP_DIR}/backend/dist/server.js" ]; then
  if ! command -v pm2 >/dev/null 2>&1; then
    $SUDO npm install -g pm2 --registry=https://registry.npmmirror.com
  fi
  export PATH="$(npm prefix -g)/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
  cd "${APP_DIR}/backend"
  pm2 delete canteen-backend >/dev/null 2>&1 || true
  pm2 start "${APP_DIR}/backend/dist/server.js" --name canteen-backend --cwd "${APP_DIR}/backend"
  pm2 save
fi

echo "==> Verify HTTP responses"
curl -sS -I http://127.0.0.1/ || true
curl -sS -I http://127.0.0.1/phone/ || true
curl -sS -i http://127.0.0.1:3000/api/v2/health || true

echo "==> Recent nginx errors"
$SUDO tail -n 40 /var/log/nginx/error.log || true

echo "==> Dist repair completed"
'@

$RemoteScript = $RemoteScript.Replace("__REMOTE_DIR__", $RemoteDir)

Write-Host "Repairing server with local built dist..."
$RemoteScript | ssh.exe "${User}@${Server}" "bash -s"
if ($LASTEXITCODE -ne 0) {
  throw "Dist repair failed. Please send the last 40 lines of this terminal output."
}

$CacheBust = Get-Date -Format yyyyMMddHHmmss
Write-Host ""
Write-Host "Dist repair completed."
Write-Host "PC: http://$Server/?v=$CacheBust"
Write-Host "Phone: http://$Server/phone/?v=$CacheBust"
