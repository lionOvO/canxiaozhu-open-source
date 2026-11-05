# ④ AI智能采购与库存 / 08 采购单CSV导出

**实现状态：已实现** · 核对日期：2026-10-27

以下两图依据当前源码；仅对已存在链路作实现描述。尚未实现的范围在边界中说明。

## 业务范围与数据契约

| 项目 | 说明 |
| --- | --- |
| 入口与触发 | PC及手机采购页导出按钮 |
| 状态 | 已实现 |
| 接口与关键入参 | POST /api/v2/purchase/order/export；{shop_id,order} |
| 主要调用 | exportPurchaseOrder |
| 读取或写入数据 | 按shopId和id读取采购单及Shop；保存采购单和ExportLog |
| 核心处理 | 已确认使用持久化单且保留已确认状态；未确认使用草稿重算并标记已导出；转义CSV和添加UTF-8 BOM |
| 响应与数据去向 | CSV字节、Content-Disposition、X-Export-Message |

## 业务流程图

```mermaid
flowchart TD
  N1(["开始"])
  N2["用户 → 前端页面<br/>点击导出采购单"]
  N3["前端页面 → 后端路由<br/>POST /api/v2/purchase/order/export；shop_id与order"]
  N4["后端路由 → 业务服务<br/>exportPurchaseOrder"]
  N5["业务服务 → 数据库<br/>读取本店采购单与门店"]
  N6{"采购单已确认？"}
  N7["数据库 → 业务服务<br/>使用持久化payload并保留已确认"]
  N8["业务服务 → 数据库<br/>重算并保存草稿，状态已导出"]
  N9(["继续"])
  N10["业务服务内部处理<br/>按采购行及库存明细构建CSV；单元格转义和BOM"]
  N11["业务服务 → 数据库<br/>创建ExportLog"]
  N12["数据库 → 业务服务<br/>记录成功"]
  N13["业务服务 → 后端路由<br/>filename、content、message"]
  N14["后端路由 → 前端页面<br/>text/csv；附件文件名及导出提示头"]
  N15["前端页面 → 浏览器<br/>Blob → ObjectURL → a.download → 回收URL"]
  N16["前端页面 → 用户<br/>文件下载及操作反馈；错误响应则展示原因"]
  N17(["完成 / 可继续操作"])
  N1 -->|"用户 → 前端页面：调用或传递"| N2
  N2 -->|"前端页面 → 后端路由：调用或传递"| N3
  N3 -->|"后端路由 → 业务服务：调用或传递"| N4
  N4 -->|"业务服务 → 数据库：调用或传递"| N5
  N5 --> N6
  N6 -.->|"是 / 正常分支"| N7
  N6 -->|"未确认"| N8
  N7 --> N9
  N8 --> N9
  N9 -->|"业务服务内部处理"| N10
  N10 -->|"业务服务 → 数据库：调用或传递"| N11
  N11 -.->|"数据库 → 业务服务：返回数据"| N12
  N12 -.->|"业务服务 → 后端路由：返回数据"| N13
  N13 -.->|"后端路由 → 前端页面：返回数据"| N14
  N14 -->|"前端页面 → 浏览器：调用或传递"| N15
  N15 -.->|"前端页面 → 用户：返回数据"| N16
  N16 --> N17
  classDef user fill:#f8fafc,stroke:#64748b,color:#0f172a
  class N1,N16,N17 user
  classDef front fill:#eff6ff,stroke:#60a5fa,color:#0f172a
  class N2,N14,N15 front
  classDef back fill:#fff7ed,stroke:#fb923c,color:#0f172a
  class N3,N4,N7,N10,N12,N13 back
  classDef data fill:#f0fdf4,stroke:#4ade80,color:#0f172a
  class N5,N6,N8,N9,N11 data
```

## 时序图

```mermaid
sequenceDiagram
  autonumber
  actor U as 业务用户
  participant F as 前端Vue页面
  participant B as 浏览器API与本地存储
  participant A as 后端Fastify路由
  participant S as 后端业务服务
  participant D as SQLite数据库与Prisma访问层
  U->>F: 点击导出采购单
  F->>A: POST /api/v2/purchase/order/export；shop_id与order
  A->>S: exportPurchaseOrder
  S->>D: 读取本店采购单与门店
  alt 采购单已确认
    D-->>S: 使用持久化payload并保留已确认
  else 未确认
    S->>D: 重算并保存草稿，状态已导出
  end
  S->>S: 按采购行及库存明细构建CSV；单元格转义和BOM
  S->>D: 创建ExportLog
  D-->>S: 记录成功
  S-->>A: filename、content、message
  A-->>F: text/csv；附件文件名及导出提示头
  F->>B: Blob → ObjectURL → a.download → 回收URL
  F-->>U: 文件下载及操作反馈；错误响应则展示原因
```

## 规则、异常与完成边界

实际为text/csv文件下载；后端写ExportLog。已确认采购单导出不会增加在途；前端store却会设为已导出，前后端显示可能不同。没有PDF或Excel专用导出器。

前端准备：读取当前门店及页面参数。

结果处理：更新 Pinia 或页面状态并渲染。

异常处理：参数校验、资源查询或业务处理失败；前端展示错误并允许重试。JSON、SSE和浏览器本地动作按各自协议反馈，失败不会凭空产生成功结果。

访问范围：此旧业务路由没有Agent/RAG同等的统一会话与门店鉴权；PC请求可携Bearer，但不能据此前端行为推断后端已核验。

## 源码与需求依据

- [backend/src/services/merchant-service.ts:2145](D:/餐小助/backend/src/services/merchant-service.ts:2145)
- [backend/src/routes/v2.ts:701](D:/餐小助/backend/src/routes/v2.ts:701)
- [front-pc/src/views/PurchaseView.vue:1](D:/餐小助/front-pc/src/views/PurchaseView.vue:1)
- [front-phone/src/views/PurchaseView.vue:1](D:/餐小助/front-phone/src/views/PurchaseView.vue:1)
- [front-pc/src/views/InventoryView.vue:1](D:/餐小助/front-pc/src/views/InventoryView.vue:1)
- [front-phone/src/views/InventoryView.vue:1](D:/餐小助/front-phone/src/views/InventoryView.vue:1)
- [front-pc/src/stores/merchant.ts:1](D:/餐小助/front-pc/src/stores/merchant.ts:1)

[返回模块与功能目录](../README.md)
