#!/usr/bin/env bash
set -euo pipefail

# Keep the server path ASCII-only. Prisma and Node tooling can misparse
# database paths when the deployed directory contains non-ASCII characters.
APP_DIR="${APP_DIR:-/opt/projects/canteen-helper}"
SITE_NAME="canteen-helper"
NGINX_AVAILABLE="/etc/nginx/sites-available/${SITE_NAME}"
NGINX_ENABLED="/etc/nginx/sites-enabled/${SITE_NAME}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run with sudo, for example: sudo APP_DIR=${APP_DIR} bash switch-server-to-canteen-helper.sh"
  exit 1
fi

if [[ ! -f "${APP_DIR}/front-pc/dist/index.html" ]]; then
  echo "PC build is missing: ${APP_DIR}/front-pc/dist/index.html"
  exit 1
fi

if [[ ! -f "${APP_DIR}/front-phone/dist/index.html" ]]; then
  echo "Phone build is missing: ${APP_DIR}/front-phone/dist/index.html"
  exit 1
fi

if ! command -v nginx >/dev/null 2>&1; then
  echo "Installing Nginx..."
  apt-get update
  apt-get install -y nginx
fi

# Only create/update the canteen-helper site. Do not delete other projects'
# Nginx sites and do not stop Docker containers on a shared server.
cat > "${NGINX_AVAILABLE}" <<NGINX
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
        root ${APP_DIR}/front-phone/dist;
        try_files /index.html =404;
        add_header Cache-Control "no-cache";
    }

    location = /phone/index.html {
        root ${APP_DIR}/front-phone/dist;
        try_files /index.html =404;
        add_header Cache-Control "no-cache";
    }

    location /phone/ {
        alias ${APP_DIR}/front-phone/dist/;
        try_files \$uri \$uri/ /phone/index.html;
    }

    location / {
        root ${APP_DIR}/front-pc/dist;
        try_files \$uri /index.html;
    }
}
NGINX

ln -sfn "${NGINX_AVAILABLE}" "${NGINX_ENABLED}"
nginx -t
systemctl enable nginx
systemctl reload nginx

echo "Canteen Helper is configured."
echo "PC: http://203.0.113.10/"
echo "Phone: http://203.0.113.10/phone/"
