# 餐小助 Backend

面向 `front-pc` 的后端服务，提供经营驾驶舱、AI 日报、客户资产、采购单、评价口碑、多店看板和系统管理接口。

## 技术栈

- Fastify 5
- TypeScript
- Prisma + SQLite（本地开发）
- OpenAPI / Swagger
- 可切换 AI Provider（`mock` / `openai` / `qwen`）

## 本地启动

1. 复制环境变量

```powershell
Copy-Item .env.example .env
```

2. 安装依赖

```powershell
npm.cmd install
```

3. 生成 Prisma Client、建库并灌种子

```powershell
npm.cmd run prisma:generate
npm.cmd run db:push
npm.cmd run db:seed
```

4. 启动服务

```powershell
npm.cmd run dev
```

默认监听 `http://127.0.0.1:3000`，接口文档在 `http://127.0.0.1:3000/docs`。

## AI 配置

### 使用 DeepSeek（当前经营助手默认配置）

```env
AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=在本机填写真实密钥
DEEPSEEK_MODEL=deepseek-flash
DEEPSEEK_BASE_URL=https://api.deepseek.com
```

修改后重启后端。密钥只保存在后端环境变量，不写进前端或知识库。
PC `/assistant` 为经营助手工作台，支持真实工具调用、采购只读试算和门店采购资料检索。
资料支持 Markdown / TXT 导入、原文引用、门店隔离、生效日期和停用；检索为中文关键词加权检索，当前不使用向量数据库。
详细资料准备要求见 `../docs/RAG资料准备与经营助手使用说明.md`。

### 使用 Qwen 3.7 Plus

在 `.env` 里配置：

```env
AI_PROVIDER=qwen
QWEN_API_KEY=你的百炼 API Key
QWEN_MODEL=qwen3.7-plus
QWEN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
```

当前实现通过 OpenAI SDK 访问百炼的 OpenAI 兼容 Chat Completions API。

### 使用 OpenAI

```env
AI_PROVIDER=openai
OPENAI_API_KEY=你的 OpenAI API Key
OPENAI_MODEL=gpt-5
```

### 未接入模型

```env
AI_PROVIDER=mock
```

`mock` 代表模型未接入，会明确返回不可用，不生成虚假经营回答。业务页面仍可独立使用。
