# ⑧ 系统管理与数据接入 / 26 RAG资料列表与有效状态

**实现状态：已实现** · 核对日期：2026-10-27

以下两图依据当前源码；仅对已存在链路作实现描述。尚未实现的范围在边界中说明。

## 业务范围与数据契约

| 项目 | 说明 |
| --- | --- |
| 入口与触发 | PC /assistant → 门店资料 |
| 状态 | 已实现 |
| 接口与关键入参 | GET /api/v2/agent/knowledge?shop_id；GET /api/v2/agent/status?shop_id |
| 主要调用 | KnowledgeManager.load → KnowledgeService.list / status |
| 读取或写入数据 | AgentKnowledgeDocument元数据、AgentKnowledgeEmbedding有效缓存 |
| 核心处理 | 列出本店资料，以启停状态及上海日期区分使用中、待生效、已过期、已停用 |
| 响应与数据去向 | 最多100条文档元数据；有效资料数和索引状态 |

## 业务流程图

```mermaid
flowchart TD
  N1(["开始"])
  N2["用户 → 前端页面<br/>打开门店资料弹窗"]
  N3["前端页面 → 后端路由<br/>并行GET资料列表与agent/status；shop_id、Bearer"]
  N4["后端路由内部处理<br/>验证会话及门店范围"]
  N5["后端路由 → RAG服务<br/>list(shopId)和status(shopId)"]
  N6["RAG服务 → 数据库<br/>资料元数据最多100条；状态仅计算active且当前有效的候选"]
  N7["数据库 → RAG服务<br/>资料列表、当前候选片段及有效向量"]
  N8["RAG服务 → 后端路由<br/>列表与检索状态DTO"]
  N9["后端路由 → 前端页面<br/>JSON响应"]
  N10["前端页面内部处理<br/>依据Asia/Shanghai日期计算状态；仅settings权限显示管理按<br/>钮"]
  N11["前端页面 → 用户<br/>资料版本、来源、时间及索引进度"]
  N12(["完成 / 可继续操作"])
  N1 -->|"用户 → 前端页面：调用或传递"| N2
  N2 -->|"前端页面 → 后端路由：调用或传递"| N3
  N3 -->|"后端路由内部处理"| N4
  N4 -->|"后端路由 → RAG服务：调用或传递"| N5
  N5 -->|"RAG服务 → 数据库：调用或传递"| N6
  N6 -.->|"数据库 → RAG服务：返回数据"| N7
  N7 -.->|"RAG服务 → 后端路由：返回数据"| N8
  N8 -.->|"后端路由 → 前端页面：返回数据"| N9
  N9 -->|"前端页面内部处理"| N10
  N10 -.->|"前端页面 → 用户：返回数据"| N11
  N11 --> N12
  classDef user fill:#f8fafc,stroke:#64748b,color:#0f172a
  class N1,N11,N12 user
  classDef front fill:#eff6ff,stroke:#60a5fa,color:#0f172a
  class N2,N9,N10 front
  classDef back fill:#fff7ed,stroke:#fb923c,color:#0f172a
  class N3,N4,N5,N7,N8 back
  classDef data fill:#f0fdf4,stroke:#4ade80,color:#0f172a
  class N6 data
```

## 时序图

```mermaid
sequenceDiagram
  autonumber
  actor U as 业务用户
  participant F as 前端Vue页面
  participant A as 后端Fastify路由
  participant K as 后端资料检索与索引服务
  participant D as SQLite数据库与Prisma访问层
  U->>F: 打开门店资料弹窗
  F->>A: 并行GET资料列表与agent/status；shop_id、Bearer
  A->>A: 验证会话及门店范围
  A->>K: list(shopId)和status(shopId)
  K->>D: 资料元数据最多100条；状态仅计算active且当前有效的候选
  D-->>K: 资料列表、当前候选片段及有效向量
  K-->>A: 列表与检索状态DTO
  A-->>F: JSON响应
  F->>F: 依据Asia/Shanghai日期计算状态；仅settings权限显示管理按钮
  F-->>U: 资料版本、来源、时间及索引进度
```

## 规则、异常与完成边界

active资料数量上限50，包含尚未生效或已过期但未停用的active行；activeDocuments只计算当前生效资料，因此两者数量可能不同。列表可含停用版本，文档正文不随列表返回。列表最多100条且无分页入口。仅查看无需settings权限，仍须登录并属于该门店。

前端准备：读取当前门店及页面参数。

结果处理：更新 Pinia 或页面状态并渲染。

异常处理：参数校验、资源查询或业务处理失败；前端展示错误并允许重试。JSON、SSE和浏览器本地动作按各自协议反馈，失败不会凭空产生成功结果。

访问范围：此功能读取需有效Bearer会话及当前门店授权；导入、启停和索引写入另需settings权限。

## 源码与需求依据

- [front-pc/src/components/KnowledgeManager.vue:30](D:/餐小助/front-pc/src/components/KnowledgeManager.vue:30)
- [front-pc/src/components/KnowledgeManager.vue:98](D:/餐小助/front-pc/src/components/KnowledgeManager.vue:98)
- [backend/src/routes/agent-knowledge.ts:27](D:/餐小助/backend/src/routes/agent-knowledge.ts:27)
- [backend/src/services/knowledge-service.ts:105](D:/餐小助/backend/src/services/knowledge-service.ts:105)
- [backend/src/services/knowledge-vector-index.ts:60](D:/餐小助/backend/src/services/knowledge-vector-index.ts:60)

[返回模块与功能目录](../README.md)
