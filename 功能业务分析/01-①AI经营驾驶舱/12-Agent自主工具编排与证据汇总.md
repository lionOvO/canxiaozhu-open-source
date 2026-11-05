# ① AI经营驾驶舱 / 12 Agent自主工具编排与证据汇总

**实现状态：已实现** · 核对日期：2026-10-27

以下两图依据当前源码；仅对已存在链路作实现描述。尚未实现的范围在边界中说明。

## 业务范围与数据契约

| 项目 | 说明 |
| --- | --- |
| 入口与触发 | PC /assistant 提出经营或采购问题 |
| 状态 | 已实现 |
| 接口与关键入参 | POST /api/v2/agent/qa/stream；{shop_id,question_text,history?} |
| 主要调用 | runBusinessAgent → createAgent → buildBusinessTools |
| 读取或写入数据 | 本店订单、成本、库存、采购资料；完整回答另写VoiceQuestionLog |
| 核心处理 | 模型按问题选择业务工具，程序执行并回传结果，证据充分后生成回答 |
| 响应与数据去向 | 回答、使用工具列表、knowledgeSources、purchasePlan?、purchaseReview? |

## 业务流程图

```mermaid
flowchart TD
  N1(["开始"])
  N2["用户 → 前端页面<br/>提出经营或采购问题"]
  N3["前端页面 → 后端路由<br/>发送Bearer、shop_id、问题与最近历史"]
  N4["后端路由内部处理<br/>验证会话与门店；校验问题长度和历史条数"]
  N5["后端路由 → Agent<br/>初始化单Agent；shopId捕获于工具闭包"]
  N6{"最多8次工具调用，图递归上限12"}
  N7["Agent → 外部模型或平台<br/>发送系统约束、最近历史和7种工具schema"]
  N8["外部模型或平台 → Agent<br/>回答或tool_calls"]
  N9{"模型要求调用工具？"}
  N10["Agent → 业务服务<br/>Zod严格校验参数；执行命名工具"]
  N11["Agent → 后端路由<br/>tool_start / tool_end；真实callId"]
  N12["后端路由 → 前端页面<br/>SSE工具事件"]
  N13["业务服务 → 数据库<br/>读取授权门店业务数据；资料另经RAG检索"]
  N14["数据库 → 业务服务<br/>数值、日期或原文"]
  N15["业务服务 → Agent<br/>工具结果及采购/资料证据"]
  N16(["继续"])
  N17["Agent内部处理<br/>去重资料分配S1等ID；未知引用改为未核实来源"]
  N18["Agent → 业务服务<br/>complete：完整内容和结构化证据"]
  N19["业务服务 → 数据库<br/>写完整问答日志，不存图状态"]
  N20["业务服务 → 后端路由<br/>AssistantMessage"]
  N21["后端路由 → 前端页面<br/>SSE done"]
  N22["前端页面 → 用户<br/>展示结论、工具记录、依据和待确认事项"]
  N23(["完成 / 可继续操作"])
  N1 -->|"用户 → 前端页面：调用或传递"| N2
  N2 -->|"前端页面 → 后端路由：调用或传递"| N3
  N3 -->|"后端路由内部处理"| N4
  N4 -->|"后端路由 → Agent：调用或传递"| N5
  N5 --> N6
  N6 -->|"继续处理"| N7
  N7 -.->|"外部模型或平台 → Agent：返回数据"| N8
  N8 --> N9
  N9 -->|"是"| N10
  N10 -.->|"Agent → 后端路由：返回数据"| N11
  N11 -.->|"后端路由 → 前端页面：返回数据"| N12
  N12 -->|"业务服务 → 数据库：调用或传递"| N13
  N13 -.->|"数据库 → 业务服务：返回数据"| N14
  N14 -.->|"业务服务 → Agent：返回数据"| N15
  N15 --> N16
  N9 -->|"否 / 跳过"| N16
  N16 -->|"下一次"| N6
  N6 -->|"循环完成或停止"| N17
  N17 -.->|"Agent → 业务服务：返回数据"| N18
  N18 -->|"业务服务 → 数据库：调用或传递"| N19
  N19 -.->|"业务服务 → 后端路由：返回数据"| N20
  N20 -.->|"后端路由 → 前端页面：返回数据"| N21
  N21 -.->|"前端页面 → 用户：返回数据"| N22
  N22 --> N23
  classDef user fill:#f8fafc,stroke:#64748b,color:#0f172a
  class N1,N22,N23 user
  classDef front fill:#eff6ff,stroke:#60a5fa,color:#0f172a
  class N2,N12,N21 front
  classDef back fill:#fff7ed,stroke:#fb923c,color:#0f172a
  class N3,N4,N5,N6,N8,N9,N10,N11,N14,N15,N16,N17,N18,N20 back
  classDef data fill:#f0fdf4,stroke:#4ade80,color:#0f172a
  class N13,N19 data
  classDef external fill:#faf5ff,stroke:#c084fc,color:#0f172a
  class N7 external
```

## 时序图

```mermaid
sequenceDiagram
  autonumber
  actor U as 业务用户
  participant F as 前端Vue页面
  participant A as 后端Fastify路由
  participant R as 后端LangChain单Agent
  participant S as 后端业务服务
  participant D as SQLite数据库与Prisma访问层
  participant E as 外部模型或平台服务
  U->>F: 提出经营或采购问题
  F->>A: 发送Bearer、shop_id、问题与最近历史
  A->>A: 验证会话与门店；校验问题长度和历史条数
  A->>R: 初始化单Agent；shopId捕获于工具闭包
  loop 最多8次工具调用，图递归上限12
    R->>E: 发送系统约束、最近历史和7种工具schema
    E-->>R: 回答或tool_calls
    opt 模型要求调用工具
      R->>S: Zod严格校验参数；执行命名工具
      R-->>A: tool_start / tool_end；真实callId
      A-->>F: SSE工具事件
      S->>D: 读取授权门店业务数据；资料另经RAG检索
      D-->>S: 数值、日期或原文
      S-->>R: 工具结果及采购/资料证据
    end
  end
  R->>R: 去重资料分配S1等ID；未知引用改为未核实来源
  R-->>S: complete：完整内容和结构化证据
  S->>D: 写完整问答日志，不存图状态
  S-->>A: AssistantMessage
  A-->>F: SSE done
  F-->>U: 展示结论、工具记录、依据和待确认事项
```

## 规则、异常与完成边界

工具共7个：get_business_dashboard、get_daily_report、get_dish_sales、get_stock_snapshot、calculate_purchase_plan、search_purchase_knowledge、review_purchase_readiness。由LangChain createAgent提供模型—工具循环，源码没有自定义多Agent、StateGraph节点或checkpointer。门店不是模型可填写的参数。工具操作业务数据为只读，成功完成的问答日志会落库。工具选择来自模型与提示词，不能将提示词要求当作程序必然保证。

前端准备：读取当前门店及页面参数。

结果处理：更新 Pinia 或页面状态并渲染。

异常处理：参数校验、资源查询或业务处理失败；前端展示错误并允许重试。JSON、SSE和浏览器本地动作按各自协议反馈，失败不会凭空产生成功结果。

采购前核对优先review_purchase_readiness；其已包含采购试算及库存，不需要重复计算。仅查经营事实无需强制RAG；规则、报价、截单等问题必须有有效资料依据。

访问范围：Agent与资料接口校验Bearer会话及assignedShopIds；门店ID不作为模型可修改的工具参数。

## 源码与需求依据

- [backend/src/services/business-agent.ts:30](D:/餐小助/backend/src/services/business-agent.ts:30)
- [backend/src/services/business-agent.ts:67](D:/餐小助/backend/src/services/business-agent.ts:67)
- [backend/src/services/merchant-service.ts:2298](D:/餐小助/backend/src/services/merchant-service.ts:2298)
- [backend/src/routes/v2.ts:970](D:/餐小助/backend/src/routes/v2.ts:970)

[返回模块与功能目录](../README.md)
