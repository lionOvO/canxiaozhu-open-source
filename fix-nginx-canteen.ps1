param(
  [string]$Server = "203.0.113.10",
  [string]$User = "ubuntu",
  [string]$RemoteDir = "/opt/projects/canteen-helper"
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command ssh.exe -ErrorAction SilentlyContinue)) {
  throw "Command not found: ssh.exe. Please enable Windows OpenSSH Client first."
}

$RemoteScript = @'
set -e
APP_DIR="__REMOTE_DIR__"
SERVER_IP="__SERVER__"
export PATH="/usr/local/bin:/usr/bin:/bin:$(npm prefix -g 2>/dev/null)/bin:$PATH"

echo "==> Check canteen-helper project"
test -d "$APP_DIR/backend"
test -d "$APP_DIR/front-pc"
test -d "$APP_DIR/front-phone"

echo "==> Ensure frontend builds exist"
if [ ! -f "$APP_DIR/front-pc/dist/index.html" ]; then
  cd "$APP_DIR/front-pc"
  npm install --registry=https://registry.npmmirror.com
  npm run build
fi

if [ ! -f "$APP_DIR/front-phone/dist/index.html" ]; then
  cd "$APP_DIR/front-phone"
  npm install --registry=https://registry.npmmirror.com
  VITE_BASE_PATH=/phone/ npm run build
fi

echo "==> Stop Docker containers publishing port 80"
if command -v docker >/dev/null 2>&1; then
  IDS="$(sudo docker ps --format '{{.ID}} {{.Ports}}' | awk '$0 ~ /0\.0\.0\.0:80->|\[::\]:80->|:::80->|:80->/ { print $1 }')"
  if [ -n "$IDS" ]; then
    echo "$IDS" | xargs -r sudo docker update --restart=no >/dev/null
    echo "$IDS" | xargs -r sudo docker stop
  fi
fi

echo "==> Write Nginx site"
BACKUP_DIR="/etc/nginx/canteen-backup-$(date +%Y%m%d%H%M%S)"
sudo mkdir -p "$BACKUP_DIR"
sudo cp -a /etc/nginx/sites-enabled "$BACKUP_DIR/" 2>/dev/null || true
sudo cp -a /etc/nginx/conf.d "$BACKUP_DIR/" 2>/dev/null || true
sudo rm -f /etc/nginx/sites-enabled/canteen-helper

sudo tee /etc/nginx/sites-available/canteen-helper >/dev/null <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name ${SERVER_IP};

    client_max_body_size 20m;

    location /api/ {
        proxy_pass http://127.0.0.1:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
    }

    location ^~ /phone/assets/ {
        alias ${APP_DIR}/front-phone/dist/assets/;
        access_log off;
        expires 7d;
    }

    location ^~ /phone/ {
        alias ${APP_DIR}/front-phone/dist/;
        try_files \$uri \$uri/ /phone/index.html;
    }

    location = /phone {
        return 301 /phone/;
    }

    location / {
        root ${APP_DIR}/front-pc/dist;
        try_files \$uri \$uri/ /index.html;
    }
}
NGINX

sudo ln -sf /etc/nginx/sites-available/canteen-helper /etc/nginx/sites-enabled/canteen-helper
sudo nginx -t
sudo systemctl restart nginx

echo "==> Validate local HTTP"
sudo ss -ltnp | grep ':80'
curl -I "http://127.0.0.1/" | head -n 1
curl -I "http://127.0.0.1/phone/" | head -n 1
curl -s "http://127.0.0.1/phone/" | grep -E "餐小助|/phone/assets|assets" | head -n 3 || true

echo "==> Nginx switched to canteen-helper"
echo "PC: http://${SERVER_IP}/"
echo "Phone: http://${SERVER_IP}/phone/"
'@

$RemoteScript = $RemoteScript.Replace("__REMOTE_DIR__", $RemoteDir).Replace("__SERVER__", $Server)

Write-Host "Fixing Nginx on $Server..."
$RemoteScript | ssh.exe "${User}@${Server}" "bash -s"
if ($LASTEXITCODE -ne 0) {
  throw "Nginx fix failed. Please check the server output above."
}

Write-Host ""
Write-Host "Done. Open:"
Write-Host "PC: http://$Server/"
Write-Host "Phone: http://$Server/phone/?v=$(Get-Date -Format yyyyMMddHHmmss)"
