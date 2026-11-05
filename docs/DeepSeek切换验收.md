# AI 经营助手切换 DeepSeek

日期：2026-10-27。

后端 `backend/.env` 原有两处 `AI_PROVIDER`，后面的 `qwen` 覆盖前面的 `deepseek`。已合并为唯一的 `AI_PROVIDER=deepseek`，沿用已实现的 OpenAI 兼容接入、LangChain 单 Agent 和业务工具。

当前模型为 `deepseek-flash`，地址 `https://api.deepseek.com`。密钥由用户填写在后端 `DEEPSEEK_API_KEY` 中，本文件不记录密钥。官方接口及工具调用说明：[API](https://api-docs.deepseek.com/)、[工具调用](https://api-docs.deepseek.com/guides/tool_calls/)。

## 验证结果

- 后端类型检查通过。
- 本地程序测试通过：DeepSeek 兼容工具循环、资料引用、门店隔离、权限、SSE 事件、工具次数限制及取消行为。此项使用测试模型服务。
- 填写密钥并重新加载配置后，真实 DeepSeek 调用成功，实际调用 `get_daily_report` 并完成回答。
- 使用真实门店 3001，只读核对：回答最近经营日为 2026-08-15，招牌牛肉饭 2 份、1 笔订单、营收 56 元、估算利润 32 元，均与当前业务数据一致，并明确区分最近经营日与今天。
- 后端健康检查正常。RAG 向量模型仍为本机 Ollama `bge-m3:latest`，无需千问服务额度。

前端刷新后读取后端状态即可显示 DeepSeek。独立场景演示默认仍明确使用脚本化对话模拟器；如需在隔离数据上使用真实 DeepSeek，可在 `backend` 运行 `npm run demo:agent:real`，先关闭占用相同模拟端口的旧演示服务。
