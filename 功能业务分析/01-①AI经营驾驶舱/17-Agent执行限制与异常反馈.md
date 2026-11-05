# ① AI经营驾驶舱 / 17 Agent执行限制与异常反馈

**实现状态：已实现** · 核对日期：2026-10-27

以下两图依据当前源码；仅对已存在链路作实现描述。尚未实现的范围在边界中说明。

## 业务范围与数据契约

| 项目 | 说明 |
| --- | --- |
| 入口与触发 | PC助手运行、超时、连接异常和权限失败 |
| 状态 | 已实现 |
| 接口与关键入参 | POST /api/v2/agent/qa/stream；流前HTTP错误、流中SSE error |
| 主要调用 | runBusinessAgent的bounded / combinedSignal；路由getUserFacingAiError |
| 读取或写入数据 | 本轮调用计数、模型状态、客户端断开信号；成功才写问答日志 |
| 核心处理 | 8次工具调用、递归12、模型45秒及整轮90秒；区分401/402/429等模型错误 |
| 响应与数据去向 | 友好错误、失败步骤、保留文字、可重新提问 |

## 业务流程图

```mermaid
flowchart TD
  N1(["开始"])
  N2["用户 → 前端页面<br/>发起问答"]
  N3["前端页面 → 后端路由<br/>Bearer、门店与问题"]
  N4{"登录或门店校验失败？"}
  N5["后端路由 → 前端页面<br/>HTTP 400/401/403 JSON，尚未建立SSE"]
  N6["前端页面 → 用户<br/>显示校验失败"]
  N7["后端路由 → Agent<br/>创建SSE及取消信号"]
  N8["Agent内部处理<br/>验证模型配置；合并客户端信号和90秒超时"]
  N9["Agent → 外部模型或平台<br/>调用模型；单次timeout45秒、maxRetries=0"]
  N10{"模型或工具正常？"}
  N11["外部模型或平台 → Agent<br/>结果或工具调用"]
  N12["Agent内部处理<br/>最多8次工具；递归限制12"]
  N13["Agent → 后端路由<br/>回答及complete"]
  N14["后端路由 → 前端页面<br/>SSE delta/done"]
  N15["Agent → 后端路由<br/>AiProviderUnavailableError；保留可公开原因"]
  N16["后端路由 → 前端页面<br/>SSE error并结束连接"]
  N17["前端页面 → Pinia<br/>保留已收到文字，运行中步骤标failed"]
  N18["前端页面 → 用户<br/>错误说明及重试入口"]
  N19(["继续"])
  N20(["继续"])
  N21(["完成 / 可继续操作"])
  N1 -->|"用户 → 前端页面：调用或传递"| N2
  N2 -->|"前端页面 → 后端路由：调用或传递"| N3
  N3 --> N4
  N4 -.->|"是 / 正常分支"| N5
  N5 -.->|"前端页面 → 用户：返回数据"| N6
  N4 -->|"校验通过"| N7
  N7 -->|"Agent内部处理"| N8
  N8 -->|"Agent → 外部模型或平台：调用或传递"| N9
  N9 --> N10
  N10 -.->|"是 / 正常分支"| N11
  N11 -->|"Agent内部处理"| N12
  N12 -.->|"Agent → 后端路由：返回数据"| N13
  N13 -.->|"后端路由 → 前端页面：返回数据"| N14
  N10 -.->|"额度错误、无有效回答、工具上限或超时"| N15
  N15 -.->|"后端路由 → 前端页面：返回数据"| N16
  N16 -->|"前端页面 → Pinia：调用或传递"| N17
  N17 -.->|"前端页面 → 用户：返回数据"| N18
  N14 --> N19
  N18 --> N19
  N6 --> N20
  N19 --> N20
  N20 --> N21
  classDef user fill:#f8fafc,stroke:#64748b,color:#0f172a
  class N1,N6,N18,N21 user
  classDef front fill:#eff6ff,stroke:#60a5fa,color:#0f172a
  class N2,N5,N14,N16,N17 front
  classDef back fill:#fff7ed,stroke:#fb923c,color:#0f172a
  class N3,N4,N7,N8,N11,N12,N13,N15,N20 back
  classDef external fill:#faf5ff,stroke:#c084fc,color:#0f172a
  class N9,N10,N19 external
```

## 时序图

```mermaid
sequenceDiagram
  autonumber
  actor U as 业务用户
  participant F as 前端Vue页面
  participant P as 前端Pinia状态
  participant A as 后端Fastify路由
  participant R as 后端LangChain单Agent
  participant E as 外部模型或平台服务
  U->>F: 发起问答
  F->>A: Bearer、门店与问题
  alt 登录或门店校验失败
    A-->>F: HTTP 400/401/403 JSON，尚未建立SSE
    F-->>U: 显示校验失败
  else 校验通过
    A->>R: 创建SSE及取消信号
    R->>R: 验证模型配置；合并客户端信号和90秒超时
    R->>E: 调用模型；单次timeout45秒、maxRetries=0
    alt 模型或工具正常
      E-->>R: 结果或工具调用
      R->>R: 最多8次工具；递归限制12
      R-->>A: 回答及complete
      A-->>F: SSE delta/done
    else 额度错误、无有效回答、工具上限或超时
      R-->>A: AiProviderUnavailableError；保留可公开原因
      A-->>F: SSE error并结束连接
      F->>P: 保留已收到文字，运行中步骤标failed
      F-->>U: 错误说明及重试入口
    end
  end
```

## 规则、异常与完成边界

模型401提示密钥无效、402余额不足、429频繁；本地mock未配置会明确报错，不返回假经营答案。8次上限在工具包装和事件监听两处限制；提示词只读之外，实际工具也没有确认采购等写接口。数据库/向量调用不会因模型断开获得统一事务回滚；业务工具结果与日志边界分别说明。

前端准备：读取当前门店及页面参数。

结果处理：更新 Pinia 或页面状态并渲染。

异常处理：参数校验、资源查询或业务处理失败；前端展示错误并允许重试。JSON、SSE和浏览器本地动作按各自协议反馈，失败不会凭空产生成功结果。

访问范围：Agent与资料接口校验Bearer会话及assignedShopIds；门店ID不作为模型可修改的工具参数。

## 源码与需求依据

- [backend/src/services/business-agent.ts:32](D:/餐小助/backend/src/services/business-agent.ts:32)
- [backend/src/services/business-agent.ts:113](D:/餐小助/backend/src/services/business-agent.ts:113)
- [backend/src/routes/v2.ts:78](D:/餐小助/backend/src/routes/v2.ts:78)
- [front-pc/src/stores/merchant.ts:966](D:/餐小助/front-pc/src/stores/merchant.ts:966)

[返回模块与功能目录](../README.md)
