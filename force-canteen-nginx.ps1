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

echo "==> Current port 80 owner"
sudo ss -ltnp | grep ':80 ' || true

echo "==> Stop Docker containers that publish host port 80"
if command -v docker >/dev/null 2>&1; then
  sudo docker ps --format 'table {{.ID}}\t{{.Image}}\t{{.Ports}}\t{{.Names}}'
  IDS="$(sudo docker ps --format '{{.ID}} {{.Ports}}' | awk '$0 ~ /0\.0\.0\.0:80->|\[::\]:80->|:::80->|:80->/ { print $1 }')"
  if [ -n "$IDS" ]; then
    echo "$IDS" | xargs -r sudo docker update --restart=no >/dev/null
    echo "$IDS" | xargs -r sudo docker stop
  fi
fi

echo "==> Check canteen-helper dist"
test -f "$APP_DIR/front-pc/dist/index.html"
test -f "$APP_DIR/front-phone/dist/index.html"

echo "==> Replace Nginx site"
sudo mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled
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

echo "==> Verify port 80 after takeover"
sudo ss -ltnp | grep ':80 '
curl -s http://127.0.0.1/ | grep -E '餐小助|智能文件管理助手|Vite App' | head -n 5 || true
curl -s http://127.0.0.1/phone/ | grep -E '餐小助|智能文件管理助手|Vite App|assets' | head -n 5 || true

echo "==> Done"
echo "PC: http://${SERVER_IP}/?v=$(date +%s)"
echo "Phone: http://${SERVER_IP}/phone/?v=$(date +%s)"
'@

$RemoteScript = $RemoteScript.Replace("__REMOTE_DIR__", $RemoteDir).Replace("__SERVER__", $Server)

Write-Host "Force switching port 80 to canteen-helper Nginx..."
$RemoteScript | ssh.exe "${User}@${Server}" "bash -s"
if ($LASTEXITCODE -ne 0) {
  throw "Force switch failed. Please send the terminal output."
}

Write-Host ""
Write-Host "Open:"
Write-Host "PC: http://$Server/?v=$(Get-Date -Format yyyyMMddHHmmss)"
Write-Host "Phone: http://$Server/phone/?v=$(Get-Date -Format yyyyMMddHHmmss)"
