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

Require-Command "ssh.exe"

$RemoteScript = @'
set -e

APP_DIR="__REMOTE_DIR__"
SITE_AVAILABLE="/etc/nginx/sites-available/canteen-helper"
SITE_ENABLED="/etc/nginx/sites-enabled/canteen-helper"

if [ "$(id -u)" -eq 0 ]; then
  SUDO=""
else
  SUDO="sudo"
fi

print_diagnostics() {
  echo "==> Diagnostics"
  echo "-- dist files --"
  ls -la "${APP_DIR}/front-pc/dist" 2>/dev/null || true
  ls -la "${APP_DIR}/front-phone/dist" 2>/dev/null || true
  echo "-- nginx config --"
  $SUDO sed -n '1,240p' "${SITE_AVAILABLE}" 2>/dev/null || true
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

echo "==> Server repair started"
echo "App dir: ${APP_DIR}"

echo "==> Check built frontend files"
if [ ! -f "${APP_DIR}/front-pc/dist/index.html" ]; then
  echo "ERROR: Missing PC frontend build: ${APP_DIR}/front-pc/dist/index.html"
  echo "Run quick-update-all.ps1 again and make sure the PC frontend build succeeds."
  exit 31
fi

if [ ! -f "${APP_DIR}/front-phone/dist/index.html" ]; then
  echo "ERROR: Missing phone frontend build: ${APP_DIR}/front-phone/dist/index.html"
  echo "Run quick-update-all.ps1 again and make sure the phone frontend build succeeds."
  exit 32
fi

echo "==> Ensure nginx is installed"
if ! command -v nginx >/dev/null 2>&1; then
  $SUDO env DEBIAN_FRONTEND=noninteractive apt-get update
  $SUDO env DEBIAN_FRONTEND=noninteractive apt-get install -y nginx
fi

echo "==> Repair read permissions for nginx"
$SUDO chmod 755 /opt || true
$SUDO chmod 755 "${APP_DIR}" "${APP_DIR}/front-pc" "${APP_DIR}/front-phone" || true
$SUDO find "${APP_DIR}/front-pc/dist" -type d -exec chmod 755 {} \;
$SUDO find "${APP_DIR}/front-pc/dist" -type f -exec chmod 644 {} \;
$SUDO find "${APP_DIR}/front-phone/dist" -type d -exec chmod 755 {} \;
$SUDO find "${APP_DIR}/front-phone/dist" -type f -exec chmod 644 {} \;

echo "==> Write clean canteen-helper nginx site"
$SUDO tee "${SITE_AVAILABLE}" >/dev/null <<NGINX
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

echo "==> Update canteen-helper nginx site"
$SUDO ln -sfn "${SITE_AVAILABLE}" "${SITE_ENABLED}"
$SUDO nginx -t
$SUDO systemctl enable nginx >/dev/null 2>&1 || true
$SUDO systemctl restart nginx

echo "==> Ensure backend process"
if [ -f "${APP_DIR}/backend/dist/server.js" ]; then
  if ! command -v pm2 >/dev/null 2>&1; then
    echo "==> Install pm2"
    $SUDO npm install -g pm2 --registry=https://registry.npmmirror.com
  fi
  export PATH="$(npm prefix -g)/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
  cd "${APP_DIR}/backend"
  pm2 delete canteen-backend >/dev/null 2>&1 || true
  pm2 start "${APP_DIR}/backend/dist/server.js" --name canteen-backend --cwd "${APP_DIR}/backend"
  pm2 save
else
  echo "WARN: Backend build not found: ${APP_DIR}/backend/dist/server.js"
fi

echo "==> Local health checks"
assert_http_ok "PC frontend" "http://127.0.0.1/"
assert_http_ok "Phone frontend" "http://127.0.0.1/phone/"
assert_http_ok "Backend health" "http://127.0.0.1:3000/api/v2/health"

echo "==> Server repair completed"
echo "PC: http://203.0.113.10/?v=$(date +%Y%m%d%H%M%S)"
echo "Phone: http://203.0.113.10/phone/?v=$(date +%Y%m%d%H%M%S)"
'@

$RemoteScript = $RemoteScript.Replace("__REMOTE_DIR__", $RemoteDir)

Write-Host "Repairing server $Server ..."
$RemoteScript | ssh.exe "${User}@${Server}" "bash -s"
if ($LASTEXITCODE -ne 0) {
  throw "Server repair failed. Please send the last 40 lines of the terminal output."
}
