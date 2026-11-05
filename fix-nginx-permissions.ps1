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

echo "==> Fix directory permissions for Nginx"
sudo chown -R ubuntu:ubuntu "$APP_DIR"
sudo find "$APP_DIR" -type d -exec chmod 755 {} \;
sudo find "$APP_DIR/front-pc/dist" "$APP_DIR/front-phone/dist" -type f -exec chmod 644 {} \;
sudo chmod 755 /opt "$APP_DIR" "$APP_DIR/front-pc" "$APP_DIR/front-phone"

echo "==> Verify files as nginx user"
sudo -u www-data test -r "$APP_DIR/front-pc/dist/index.html"
sudo -u www-data test -r "$APP_DIR/front-phone/dist/index.html"

echo "==> Rewrite Nginx config"
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

    location = /phone {
        return 301 /phone/;
    }

    location ^~ /phone/ {
        alias ${APP_DIR}/front-phone/dist/;
        try_files \$uri \$uri/ /phone/index.html;
    }

    location / {
        root ${APP_DIR}/front-pc/dist;
        try_files \$uri \$uri/ /index.html;
    }
}
NGINX

sudo rm -f /etc/nginx/sites-enabled/canteen-helper
sudo ln -sf /etc/nginx/sites-available/canteen-helper /etc/nginx/sites-enabled/canteen-helper
sudo nginx -t
sudo systemctl restart nginx

echo "==> Validate local pages"
curl -I "http://127.0.0.1/" | head -n 1
curl -I "http://127.0.0.1/phone/" | head -n 1
curl -s "http://127.0.0.1/" | grep -E "餐小助|智能文件管理助手|Vite App|assets" | head -n 3 || true
curl -s "http://127.0.0.1/phone/" | grep -E "餐小助|智能文件管理助手|Vite App|phone/assets|assets" | head -n 3 || true

echo "==> Recent Nginx errors"
sudo tail -n 20 /var/log/nginx/error.log || true

echo "==> Done"
echo "PC: http://${SERVER_IP}/?v=$(date +%s)"
echo "Phone: http://${SERVER_IP}/phone/?v=$(date +%s)"
'@

$RemoteScript = $RemoteScript.Replace("__REMOTE_DIR__", $RemoteDir).Replace("__SERVER__", $Server)

Write-Host "Fixing Nginx permissions on $Server..."
$RemoteScript | ssh.exe "${User}@${Server}" "bash -s"
if ($LASTEXITCODE -ne 0) {
  throw "Permission fix failed. Please send the terminal output."
}

Write-Host ""
Write-Host "Open:"
Write-Host "PC: http://$Server/?v=$(Get-Date -Format yyyyMMddHHmmss)"
Write-Host "Phone: http://$Server/phone/?v=$(Get-Date -Format yyyyMMddHHmmss)"
