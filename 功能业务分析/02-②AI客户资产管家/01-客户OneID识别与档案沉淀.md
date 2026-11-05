# ② AI客户资产管家 / 01 客户OneID识别与档案沉淀

**实现状态：部分实现** · 核对日期：2026-10-27

以下两图依据当前源码；仅对已存在链路作实现描述。尚未实现的范围在边界中说明。

## 业务范围与数据契约

| 项目 | 说明 |
| --- | --- |
| 入口与触发 | 顾客下单后自动同步；客户查询前自动回填 |
| 状态 | 部分实现 |
| 接口与关键入参 | POST /api/v2/public/dining/:token/orders；POST /api/v2/customer/profile |
| 主要调用 | syncCustomerProfileFromOrder / backfillCustomerProfiles |
| 读取或写入数据 | 同一shopId下 CustomerProfileSnapshot 和非取消 DiningOrder明细 |
| 核心处理 | 手机号或脱敏号匹配；无手机号时按姓名匹配；按订单ID更新历史，重新计算消费与简化分层 |
| 响应与数据去向 | 统一客户档案或订单提交结果 |

对应PRD功能：客户OneID打通。

## 业务流程图

```mermaid
flowchart TD
  N1(["开始"])
  N2["用户 → 前端页面<br/>顾客提交资料下单，或商户打开客户页"]
  N3["前端页面 → 后端路由<br/>下单请求或customer/profile查询"]
  N4["后端路由 → 业务服务<br/>提交订单后同步，或查询前backfillCustomerProfiles"]
  N5["业务服务 → 数据库<br/>读取本店非取消有姓名或手机号订单及客户快照"]
  N6["数据库 → 业务服务<br/>订单和候选档案"]
  N7{"逐笔需要同步的订单"}
  N8["业务服务内部处理<br/>先匹配手机号/phoneMask；无手机号才按姓名"]
  N9{"找到既有客户？"}
  N10["业务服务内部处理<br/>按订单ID替换或追加历史并重新累计"]
  N11["业务服务 → 数据库<br/>UPDATE CustomerProfileSnapshot.payload"]
  N12["业务服务内部处理<br/>分配customerId并构建档案"]
  N13["业务服务 → 数据库<br/>CREATE CustomerProfileSnapshot"]
  N14(["继续"])
  N15["数据库 → 业务服务<br/>档案写入结果"]
  N16["业务服务 → 后端路由<br/>客户数据或订单结果"]
  N17["后端路由 → 前端页面<br/>JSON success/data；失败返回error"]
  N18["前端页面 → 用户<br/>展示订单结果或客户档案"]
  N19(["完成 / 可继续操作"])
  N1 -->|"用户 → 前端页面：调用或传递"| N2
  N2 -->|"前端页面 → 后端路由：调用或传递"| N3
  N3 -->|"后端路由 → 业务服务：调用或传递"| N4
  N4 -->|"业务服务 → 数据库：调用或传递"| N5
  N5 -.->|"数据库 → 业务服务：返回数据"| N6
  N6 --> N7
  N7 -->|"继续处理"| N8
  N8 --> N9
  N9 -->|"是 / 正常分支"| N10
  N10 -->|"业务服务 → 数据库：调用或传递"| N11
  N9 -->|"未找到既有客户"| N12
  N12 -->|"业务服务 → 数据库：调用或传递"| N13
  N11 --> N14
  N13 --> N14
  N14 -.->|"数据库 → 业务服务：返回数据"| N15
  N15 -->|"下一次"| N7
  N7 -.->|"循环完成或停止"| N16
  N16 -.->|"后端路由 → 前端页面：返回数据"| N17
  N17 -.->|"前端页面 → 用户：返回数据"| N18
  N18 --> N19
  classDef user fill:#f8fafc,stroke:#64748b,color:#0f172a
  class N1,N18,N19 user
  classDef front fill:#eff6ff,stroke:#60a5fa,color:#0f172a
  class N2,N17 front
  classDef back fill:#fff7ed,stroke:#fb923c,color:#0f172a
  class N3,N4,N6,N7,N8,N9,N10,N12,N14,N15,N16 back
  classDef data fill:#f0fdf4,stroke:#4ade80,color:#0f172a
  class N5,N11,N13 data
```

## 时序图

```mermaid
sequenceDiagram
  autonumber
  actor U as 业务用户
  participant F as 前端Vue页面
  participant A as 后端Fastify路由
  participant S as 后端业务服务
  participant D as SQLite数据库与Prisma访问层
  U->>F: 顾客提交资料下单，或商户打开客户页
  F->>A: 下单请求或customer/profile查询
  A->>S: 提交订单后同步，或查询前backfillCustomerProfiles
  S->>D: 读取本店非取消有姓名或手机号订单及客户快照
  D-->>S: 订单和候选档案
  loop 逐笔需要同步的订单
    S->>S: 先匹配手机号/phoneMask；无手机号才按姓名
    alt 找到既有客户
      S->>S: 按订单ID替换或追加历史并重新累计
      S->>D: UPDATE CustomerProfileSnapshot.payload
    else 未找到既有客户
      S->>S: 分配customerId并构建档案
      S->>D: CREATE CustomerProfileSnapshot
    end
    D-->>S: 档案写入结果
  end
  S-->>A: 客户数据或订单结果
  A-->>F: JSON success/data；失败返回error
  F-->>U: 展示订单结果或客户档案
```

## 规则、异常与完成边界

仅同一门店内匹配，并非全平台或跨店主数据OneID；脱敏号匹配可能重号，未接入顾客UnionID。客户历史最多保存20条；加菜按同一订单ID替换历史项。下单后就同步，不以served/completed为前提。取消订单没有对应删除既有客户历史的回滚链路。

前端准备：读取当前门店及页面参数。

结果处理：更新 Pinia 或页面状态并渲染。

异常处理：参数校验、资源查询或业务处理失败；前端展示错误并允许重试。JSON、SSE和浏览器本地动作按各自协议反馈，失败不会凭空产生成功结果。

访问范围：此旧业务路由没有Agent/RAG同等的统一会话与门店鉴权；PC请求可携Bearer，但不能据此前端行为推断后端已核验。

## 源码与需求依据

- [backend/src/services/dining-service.ts:484](D:/餐小助/backend/src/services/dining-service.ts:484)
- [backend/src/routes/v2.ts:143](D:/餐小助/backend/src/routes/v2.ts:143)
- [front-pc/src/views/CustomersView.vue:1](D:/餐小助/front-pc/src/views/CustomersView.vue:1)
- [front-phone/src/views/CustomersView.vue:1](D:/餐小助/front-phone/src/views/CustomersView.vue:1)
- [front-pc/src/stores/merchant.ts:1](D:/餐小助/front-pc/src/stores/merchant.ts:1)

[返回模块与功能目录](../README.md)
