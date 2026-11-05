# 餐小助腾讯云 Ubuntu 部署

服务器公网 IP：`203.0.113.10`

## 1. 腾讯云安全组

在轻量应用服务器防火墙/安全组放行：

```text
22
80
443
```

## 2. 登录服务器

```bash
ssh root@203.0.113.10
```

## 3. 安装运行环境

```bash
apt update
apt install -y nginx git curl unzip rsync
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.bashrc
nvm install 22
nvm use 22
npm install -g pm2
```

## 4. 上传项目

推荐把项目放在：

```text
/opt/canteen-helper
```

如果从本机上传，可以在 Windows PowerShell 执行：

```powershell
scp -r "D:\餐小助" root@203.0.113.10:/opt/canteen-helper
```

如果服务器上目录变成 `/opt/canteen-helper/餐小助`，可以移动一次：

```bash
mv /opt/canteen-helper/餐小助/* /opt/canteen-helper/
```

## 5. 配置后端环境变量

在服务器创建：

```bash
nano /opt/canteen-helper/backend/.env
```

内容示例：

```env
PORT=3000
HOST=127.0.0.1
DATABASE_URL="file:./dev.db"
CORS_ORIGIN="http://203.0.113.10"

AI_PROVIDER=qwen
QWEN_API_KEY=你的通义千问Key
QWEN_MODEL=qwen3.7-plus
QWEN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1

QWEATHER_API_KEY=你的和风天气Key
QWEATHER_API_HOST=你的和风天气Host
```

## 6. 构建并启动后端

```bash
cd /opt/canteen-helper/backend
npm install
npm run prisma:generate
npm run db:push
npm run db:seed
npm run build
pm2 start dist/server.js --name canteen-backend
pm2 save
pm2 startup
```

检查后端：

```bash
curl http://127.0.0.1:3000/api/v2/health
```

## 7. 构建 PC 端

```bash
cd /opt/canteen-helper/front-pc
npm install
npm run build
```

## 8. 构建手机端

手机端部署到 `/phone/`，所以构建时要带 base：

```bash
cd /opt/canteen-helper/front-phone
npm install
VITE_BASE_PATH=/phone/ npm run build
```

## 9. 配置 Nginx

创建配置：

```bash
nano /etc/nginx/sites-available/canteen-helper
```

填入：

```nginx
server {
    listen 80;
    server_name 203.0.113.10;

    client_max_body_size 20m;

    location /api/ {
        proxy_pass http://127.0.0.1:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }

    location /phone/ {
        alias /opt/canteen-helper/front-phone/dist/;
        try_files $uri $uri/ /phone/index.html;
    }

    location / {
        root /opt/canteen-helper/front-pc/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

启用配置：

```bash
ln -s /etc/nginx/sites-available/canteen-helper /etc/nginx/sites-enabled/canteen-helper
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
```

如果访问公网 IP 仍然打开旧项目，例如“智能文件管理助手”，说明服务器 80 端口还在使用旧站点配置。可以上传并运行项目根目录的切换脚本：

```bash
cd /opt/canteen-helper
bash switch-server-to-canteen-helper.sh
```

这个脚本会备份 `/etc/nginx/sites-enabled`，停用旧站点入口，并把 `http://203.0.113.10/` 切换到餐小助 PC 端，把 `http://203.0.113.10/phone/` 切换到餐小助手机端。

## 10. 访问地址

PC 端：

```text
http://203.0.113.10/
```

手机端：

```text
http://203.0.113.10/phone/
```

## 11. 常用维护命令

查看后端日志：

```bash
pm2 logs canteen-backend
```

重启后端：

```bash
pm2 restart canteen-backend
```

重启 Nginx：

```bash
systemctl reload nginx
```

## 12. 有域名后的调整

把 Nginx 中的：

```nginx
server_name 203.0.113.10;
```

改成你的域名，例如：

```nginx
server_name app.example.com;
```

然后用 certbot 配 HTTPS。
