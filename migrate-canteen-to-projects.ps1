param(
  [string]$Server = "203.0.113.10",
  [string]$User = "ubuntu",
  [string]$LegacyDir = "/opt/canteen-helper",
  [string]$RemoteDir = "/opt/projects/canteen-helper"
)

$ErrorActionPreference = "Stop"

function Require-Command {
  param([string]$Name)

  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Command not found: $Name. Please enable Windows OpenSSH Client first."
  }
}

Require-Command "ssh.exe"

$RemoteScript = @'
set -e

LEGACY_DIR="__LEGACY_DIR__"
APP_DIR="__REMOTE_DIR__"
SITE_NAME="canteen-helper"
NGINX_AVAILABLE="/etc/nginx/sites-available/${SITE_NAME}"
NGINX_ENABLED="/etc/nginx/sites-enabled/${SITE_NAME}"

if [ "$(id -u)" -eq 0 ]; then
  SUDO=""
else
  SUDO="sudo"
fi

if [ ! -d "$LEGACY_DIR" ]; then
  echo "ERROR: legacy project directory not found: $LEGACY_DIR"
  exit 11
fi

if [ ! -d "$LEGACY_DIR/backend" ] || [ ! -d "$LEGACY_DIR/front-pc" ] || [ ! -d "$LEGACY_DIR/front-phone" ]; then
  echo "ERROR: legacy directory is not a complete canteen-helper project: $LEGACY_DIR"
  exit 12
fi

echo "==> Prepare target directory"
$SUDO mkdir -p "$(dirname "$APP_DIR")"
if [ -d "$APP_DIR" ] && [ "$(find "$APP_DIR" -mindepth 1 -maxdepth 1 | wc -l)" -gt 0 ]; then
  BACKUP_EXISTING="${APP_DIR}.before-migration.$(date +%Y%m%d-%H%M%S)"
  echo "Target directory is not empty, backup it to: $BACKUP_EXISTING"
  $SUDO mv "$APP_DIR" "$BACKUP_EXISTING"
fi
$SUDO mkdir -p "$APP_DIR"
$SUDO chown -R "$(id -un)":"$(id -gn)" "$(dirname "$APP_DIR")"

echo "==> Copy existing online project to centralized directory"
cp -a "$LEGACY_DIR"/. "$APP_DIR"/

echo "==> Backup migrated production data"
BACKUP_DIR="$APP_DIR/backups/migration-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
if [ -f "$APP_DIR/backend/prisma/dev.db" ]; then
  cp "$APP_DIR/backend/prisma/dev.db" "$BACKUP_DIR/dev.db"
  echo "database backup: $BACKUP_DIR/dev.db"
fi
if [ -f "$APP_DIR/backend/.env" ]; then
  cp "$APP_DIR/backend/.env" "$BACKUP_DIR/backend.env"
  chmod 600 "$BACKUP_DIR/backend.env" || true
  echo "env backup: $BACKUP_DIR/backend.env"
fi

echo "==> Ensure frontend build directories exist"
test -f "$APP_DIR/front-pc/dist/index.html"
test -f "$APP_DIR/front-phone/dist/index.html"

echo "==> Switch PM2 backend to centralized directory"
if ! command -v pm2 >/dev/null 2>&1; then
  echo "pm2 is not installed, installing..."
  $SUDO npm install -g pm2 --registry=https://registry.npmmirror.com
fi
export PATH="$(npm prefix -g)/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
pm2 delete canteen-backend >/dev/null 2>&1 || true
pm2 start "$APP_DIR/backend/dist/server.js" --name canteen-backend --cwd "$APP_DIR/backend"
pm2 save

echo "==> Write canteen-helper nginx site without touching other projects"
$SUDO tee "$NGINX_AVAILABLE" >/dev/null <<NGINX
server {
    listen 80;
    server_name 203.0.113.10;

    client_max_body_size 20m;
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;

    location = / {
        root ${APP_DIR}/front-pc/dist;
        try_files /index.html =404;
        add_header Cache-Control "no-cache";
    }

    location = /index.html {
        root ${APP_DIR}/front-pc/dist;
        add_header Cache-Control "no-cache";
    }

    location /assets/ {
        alias ${APP_DIR}/front-pc/dist/assets/;
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

    location = /phone/ {
        alias ${APP_DIR}/front-phone/dist/index.html;
        add_header Cache-Control "no-cache";
    }

    location = /phone/index.html {
        alias ${APP_DIR}/front-phone/dist/index.html;
        add_header Cache-Control "no-cache";
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

$SUDO ln -sfn "$NGINX_AVAILABLE" "$NGINX_ENABLED"
$SUDO nginx -t
$SUDO systemctl reload nginx

echo "==> Validate migrated service"
curl -sS -I http://127.0.0.1/ | head -n 1
curl -sS -I http://127.0.0.1/phone/ | head -n 1
curl -sS -i http://127.0.0.1:3000/api/v2/health | head -n 12

echo "==> Migration completed"
echo "New app dir: $APP_DIR"
echo "Legacy dir kept as rollback: $LEGACY_DIR"
'@

$RemoteScript = $RemoteScript.Replace("__LEGACY_DIR__", $LegacyDir).Replace("__REMOTE_DIR__", $RemoteDir)

Write-Host "Migrating canteen-helper on server $Server..."
$RemoteScript | ssh.exe "${User}@${Server}" "bash -s"
if ($LASTEXITCODE -ne 0) {
  throw "Migration failed. Please send the last 50 lines of this terminal output."
}

Write-Host ""
Write-Host "Migration completed."
Write-Host "PC: http://$Server/"
Write-Host "Phone: http://$Server/phone/"
