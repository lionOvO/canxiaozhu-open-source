# 餐小助 Docker 测试版部署说明

这套配置用于先在服务器上启动一份不影响正式站的 Docker 测试版。默认访问地址是：

- PC 端：`http://203.0.113.10:18080/`
- 手机端：`http://203.0.113.10:18080/phone/`
- 后端健康检查：`http://203.0.113.10:18080/api/v2/health`

当前正式站 `http://203.0.113.10/` 仍由原来的 Nginx + PM2 方式提供，不会被这套测试版抢占。

## 服务器目录

建议放在：

```bash
/opt/projects/canteen-helper-docker-test
```

不要使用中文目录名，避免 Node、Prisma、SQLite 路径解析出现乱码问题。

## 首次部署

1. 上传本项目到服务器测试目录。

2. 进入目录并创建环境文件：

```bash
cd /opt/projects/canteen-helper-docker-test
cp .env.docker.example .env.docker
nano .env.docker
```

3. 如果你要复用当前正式站数据，先复制数据库到 Docker volume：

```bash
docker volume create canteen-test-db
CID=$(docker create -v canteen-test-db:/data busybox)
docker cp /opt/projects/canteen-helper/backend/prisma/dev.db "$CID:/data/dev.db"
docker rm "$CID"
```

如果正式站仍在旧目录，则把上面路径改为：

```bash
/opt/canteen-helper/backend/prisma/dev.db
```

4. 构建并启动测试版：

```bash
docker compose -f docker-compose.canteen-test.yml --env-file .env.docker up -d --build
```

5. 查看状态：

```bash
docker compose -f docker-compose.canteen-test.yml --env-file .env.docker ps
docker compose -f docker-compose.canteen-test.yml --env-file .env.docker logs --tail=80
```

## 验证

在服务器执行：

```bash
curl -I http://127.0.0.1:18080/
curl -I http://127.0.0.1:18080/phone/
curl -i http://127.0.0.1:18080/api/v2/health
```

在浏览器打开：

```text
http://203.0.113.10:18080/
http://203.0.113.10:18080/phone/
```

如果外网打不开，优先检查腾讯云安全组是否放行 `18080` 端口。

## 更新测试版

上传最新代码后执行：

```bash
cd /opt/projects/canteen-helper-docker-test
docker compose -f docker-compose.canteen-test.yml --env-file .env.docker up -d --build
```

## 停止和回滚

停止测试版：

```bash
docker compose -f docker-compose.canteen-test.yml --env-file .env.docker down
```

这不会影响正式站，也不会删除 Docker volume 里的 SQLite 数据。

不要执行 `docker compose down -v`，除非你明确想删除测试版数据库。

## 切换为正式站的建议

确认以下功能都正常后，再考虑把 80 端口切到 Docker：

- 登录、注册、短信验证码
- 天气系统
- AI 语音问答
- 扫码点餐、加菜、订单队列
- 客户资产、菜品盈利、采购单、评价口碑、多店看板、系统管理

正式切换前需要先备份：

```bash
mkdir -p /opt/backups/canteen-helper-$(date +%Y%m%d-%H%M%S)
cp /opt/projects/canteen-helper/backend/prisma/dev.db /opt/backups/canteen-helper-$(date +%Y%m%d-%H%M%S)/dev.db
cp /opt/projects/canteen-helper/backend/.env /opt/backups/canteen-helper-$(date +%Y%m%d-%H%M%S)/backend.env
```

## 常见问题

- `no configuration file provided`：你不在项目根目录，先 `cd /opt/projects/canteen-helper-docker-test`。
- `port is already allocated`：`PUBLIC_PORT` 被占用，改 `.env.docker` 里的 `PUBLIC_PORT`，例如 `18081`。
- 页面能开但 API 失败：看后端日志 `docker logs canteen-backend-test --tail=100`。
- 扫码二维码打不开：确认 `.env.docker` 里的 `PUBLIC_HOST` 是公网 IP，`PUBLIC_PORT` 是实际开放端口。
- 天气浏览器定位失败：纯 IP + HTTP 下浏览器精准定位会受限制，手动城市和后端 IP 定位仍可用。
