# ⑧ 系统管理与数据接入 / 30 RAG资料重新启用与版本冲突校验

**实现状态：已实现** · 核对日期：2026-10-27

以下两图依据当前源码；仅对已存在链路作实现描述。尚未实现的范围在边界中说明。

## 业务范围与数据契约

| 项目 | 说明 |
| --- | --- |
| 入口与触发 | PC门店资料列表→已停用版本启用 |
| 状态 | 已实现 |
| 接口与关键入参 | POST /api/v2/agent/knowledge/:id/activate；{shop_id} |
| 主要调用 | KnowledgeService.activate → checkActivation |
| 读取或写入数据 | 原AgentKnowledgeDocument；不创建副本，兼容有效的原向量缓存 |
| 核心处理 | 事务核验文档门店、active数量和同名有效期重叠；已active直接返回 |
| 响应与数据去向 | 原文档恢复active；是否可检索仍由当前日期决定 |

## 业务流程图

```mermaid
flowchart TD
  N1(["开始"])
  N2["用户 → 前端页面<br/>点击已停用资料启用"]
  N3["前端页面 → 后端路由<br/>POST文档activate；id、shop_id与Bearer"]
  N4["后端路由内部处理<br/>TypeBox校验；读取Bearer会话并核验assignedShopIds，资料<br/>写操作另需settings权限"]
  N5["后端路由 → RAG服务<br/>activate(shopId,id)"]
  N6["RAG服务 → 数据库<br/>事务查询原文档"]
  N7["数据库 → RAG服务<br/>所属门店与状态"]
  N8{"已经active？"}
  N9["RAG服务内部处理<br/>幂等返回，不重复占用数量"]
  N10["RAG服务 → 数据库<br/>检查本店active&lt;50且同名生效区间无重叠"]
  N11{"满足恢复条件？"}
  N12["RAG服务 → 数据库<br/>UPDATE原id为active，更新updatedAt"]
  N13["数据库 → RAG服务<br/>事务提交"]
  N14["RAG服务 → 后端路由<br/>400/409，事务回滚且仍archived"]
  N15(["继续"])
  N16(["继续"])
  N17["RAG服务 → 后端路由<br/>文档详情或错误"]
  N18["后端路由 → 前端页面<br/>JSON结果"]
  N19["前端页面 → 后端路由<br/>成功后重查列表及索引状态"]
  N20["后端路由 → 前端页面<br/>使用中/待生效/过期以及索引状态"]
  N21["前端页面 → 用户<br/>显示实际状态，必要时提示重建索引"]
  N22(["完成 / 可继续操作"])
  N1 -->|"用户 → 前端页面：调用或传递"| N2
  N2 -->|"前端页面 → 后端路由：调用或传递"| N3
  N3 -->|"后端路由内部处理"| N4
  N4 -->|"后端路由 → RAG服务：调用或传递"| N5
  N5 -->|"RAG服务 → 数据库：调用或传递"| N6
  N6 -.->|"数据库 → RAG服务：返回数据"| N7
  N7 --> N8
  N8 -->|"是 / 正常分支"| N9
  N8 -->|"已停用"| N10
  N10 --> N11
  N11 -->|"是 / 正常分支"| N12
  N12 -.->|"数据库 → RAG服务：返回数据"| N13
  N11 -.->|"超限或时间冲突"| N14
  N13 --> N15
  N14 --> N15
  N9 --> N16
  N15 --> N16
  N16 -.->|"RAG服务 → 后端路由：返回数据"| N17
  N17 -.->|"后端路由 → 前端页面：返回数据"| N18
  N18 -->|"前端页面 → 后端路由：调用或传递"| N19
  N19 -.->|"后端路由 → 前端页面：返回数据"| N20
  N20 -.->|"前端页面 → 用户：返回数据"| N21
  N21 --> N22
  classDef user fill:#f8fafc,stroke:#64748b,color:#0f172a
  class N1,N21,N22 user
  classDef front fill:#eff6ff,stroke:#60a5fa,color:#0f172a
  class N2,N18,N20 front
  classDef back fill:#fff7ed,stroke:#fb923c,color:#0f172a
  class N3,N4,N5,N7,N8,N9,N13,N14,N16,N17,N19 back
  classDef data fill:#f0fdf4,stroke:#4ade80,color:#0f172a
  class N6,N10,N11,N12,N15 data
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
  U->>F: 点击已停用资料启用
  F->>A: POST文档activate；id、shop_id与Bearer
  A->>A: TypeBox校验；读取Bearer会话并核验assignedShopIds，资料写操作另需settings权限
  A->>K: activate(shopId,id)
  K->>D: 事务查询原文档
  D-->>K: 所属门店与状态
  alt 已经active
    K->>K: 幂等返回，不重复占用数量
  else 已停用
    K->>D: 检查本店active<50且同名生效区间无重叠
    alt 满足恢复条件
      K->>D: UPDATE原id为active，更新updatedAt
      D-->>K: 事务提交
    else 超限或时间冲突
      K-->>A: 400/409，事务回滚且仍archived
    end
  end
  K-->>A: 文档详情或错误
  A-->>F: JSON结果
  F->>A: 成功后重查列表及索引状态
  A-->>F: 使用中/待生效/过期以及索引状态
  F-->>U: 显示实际状态，必要时提示重建索引
```

## 规则、异常与完成边界

同名区间首尾日期均包含；旧版effectiveUntil为空表示长期，可能与新版重叠。启用不修改内容和版本、不延长有效期、不复制文档。重新启用后符合fingerprint与textHash的向量可复用；未来或已过期资料即使active也不参与当前检索。

前端准备：读取当前门店及页面参数。

结果处理：更新 Pinia 或页面状态并渲染。

异常处理：参数校验、资源查询或业务处理失败；前端展示错误并允许重试。JSON、SSE和浏览器本地动作按各自协议反馈，失败不会凭空产生成功结果。

访问范围：此功能读取需有效Bearer会话及当前门店授权；导入、启停和索引写入另需settings权限。

## 源码与需求依据

- [backend/src/services/knowledge-service.ts:167](D:/餐小助/backend/src/services/knowledge-service.ts:167)
- [backend/src/services/knowledge-service.ts:119](D:/餐小助/backend/src/services/knowledge-service.ts:119)
- [backend/src/routes/agent-knowledge.ts:48](D:/餐小助/backend/src/routes/agent-knowledge.ts:48)
- [backend/src/services/knowledge-vector-index.ts:36](D:/餐小助/backend/src/services/knowledge-vector-index.ts:36)
- [front-pc/src/components/KnowledgeManager.vue:83](D:/餐小助/front-pc/src/components/KnowledgeManager.vue:83)

[返回模块与功能目录](../README.md)
