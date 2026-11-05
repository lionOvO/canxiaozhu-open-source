# ⑧ 系统管理与数据接入 / 28 RAG多文件批量导入与部分重试

**实现状态：已实现** · 核对日期：2026-10-27

以下两图依据当前源码；仅对已存在链路作实现描述。尚未实现的范围在边界中说明。

## 业务范围与数据契约

| 项目 | 说明 |
| --- | --- |
| 入口与触发 | PC门店资料→多选Markdown或TXT |
| 状态 | 已实现 |
| 接口与关键入参 | 逐份POST /api/v2/agent/knowledge；没有独立batch路由 |
| 主要调用 | readKnowledgeFiles → importKnowledgeQueue → importKnowledgeDocument |
| 读取或写入数据 | 浏览器本地文件队列与各自独立AgentKnowledgeDocument |
| 核心处理 | 每批≤20份、每份≤200000字节；逐份校验、逐份提交、成功项跳过重试 |
| 响应与数据去向 | 每文件pending/importing/success/error状态及总成功/失败数量 |

## 业务流程图

```mermaid
flowchart TD
  N1(["开始"])
  N2["用户 → 前端页面<br/>选择多个.md或.txt文件"]
  N3["前端页面 → 浏览器<br/>读取arrayBuffer并严格UTF-8解码"]
  N4["浏览器 → 前端页面<br/>文本或文件大小/编码错误"]
  N5["前端页面内部处理<br/>最多20文件，逐份编辑名称、版本、日期、来源与正文"]
  N6{"依次处理队列，成功项跳过"}
  N7["前端页面内部处理<br/>检查仍挂载、仍是原门店且保留管理权限"]
  N8{"本地校验通过？"}
  N9["前端页面 → 后端路由<br/>POST单文档接口；固定本批shop_id与Bearer"]
  N10["后端路由内部处理<br/>TypeBox校验；读取Bearer会话并核验assignedShopIds，资料<br/>写操作另需settings权限"]
  N11["后端路由 → RAG服务<br/>import并校验版本和数量"]
  N12["RAG服务 → 数据库<br/>每份独立事务保存"]
  N13["数据库 → RAG服务<br/>提交或回滚"]
  N14["RAG服务 → 后端路由<br/>文档或错误"]
  N15["后端路由 → 前端页面<br/>此文件成功/失败结果"]
  N16["前端页面内部处理<br/>记录success或error，继续下一份"]
  N17["前端页面内部处理<br/>记录该文件error，不发送请求"]
  N18(["继续"])
  N19["前端页面 → 后端路由<br/>批次结束刷新资料和状态"]
  N20["后端路由 → 前端页面<br/>最新列表"]
  N21["前端页面 → 用户<br/>显示逐项结果；失败项修正后重试"]
  N22(["完成 / 可继续操作"])
  N1 -->|"用户 → 前端页面：调用或传递"| N2
  N2 -->|"前端页面 → 浏览器：调用或传递"| N3
  N3 -.->|"浏览器 → 前端页面：返回数据"| N4
  N4 -->|"前端页面内部处理"| N5
  N5 --> N6
  N6 -->|"继续处理"| N7
  N7 --> N8
  N8 -->|"是 / 正常分支"| N9
  N9 -->|"后端路由内部处理"| N10
  N10 -->|"后端路由 → RAG服务：调用或传递"| N11
  N11 -->|"RAG服务 → 数据库：调用或传递"| N12
  N12 -.->|"数据库 → RAG服务：返回数据"| N13
  N13 -.->|"RAG服务 → 后端路由：返回数据"| N14
  N14 -.->|"后端路由 → 前端页面：返回数据"| N15
  N15 -->|"前端页面内部处理"| N16
  N8 -->|"本地校验失败"| N17
  N16 --> N18
  N17 --> N18
  N18 -->|"下一次"| N6
  N6 -->|"循环完成或停止"| N19
  N19 -.->|"后端路由 → 前端页面：返回数据"| N20
  N20 -.->|"前端页面 → 用户：返回数据"| N21
  N21 --> N22
  classDef user fill:#f8fafc,stroke:#64748b,color:#0f172a
  class N1,N21,N22 user
  classDef front fill:#eff6ff,stroke:#60a5fa,color:#0f172a
  class N2,N3,N4,N5,N6,N7,N8,N15,N16,N17,N18,N20 front
  classDef back fill:#fff7ed,stroke:#fb923c,color:#0f172a
  class N9,N10,N11,N13,N14,N19 back
  classDef data fill:#f0fdf4,stroke:#4ade80,color:#0f172a
  class N12 data
```

## 时序图

```mermaid
sequenceDiagram
  autonumber
  actor U as 业务用户
  participant F as 前端Vue页面
  participant B as 浏览器API与本地存储
  participant A as 后端Fastify路由
  participant K as 后端资料检索与索引服务
  participant D as SQLite数据库与Prisma访问层
  U->>F: 选择多个.md或.txt文件
  F->>B: 读取arrayBuffer并严格UTF-8解码
  B-->>F: 文本或文件大小/编码错误
  F->>F: 最多20文件，逐份编辑名称、版本、日期、来源与正文
  loop 依次处理队列，成功项跳过
    F->>F: 检查仍挂载、仍是原门店且保留管理权限
    alt 本地校验通过
      F->>A: POST单文档接口；固定本批shop_id与Bearer
      A->>A: TypeBox校验；读取Bearer会话并核验assignedShopIds，资料写操作另需settings权限
      A->>K: import并校验版本和数量
      K->>D: 每份独立事务保存
      D-->>K: 提交或回滚
      K-->>A: 文档或错误
      A-->>F: 此文件成功/失败结果
      F->>F: 记录success或error，继续下一份
    else 本地校验失败
      F->>F: 记录该文件error，不发送请求
    end
  end
  F->>A: 批次结束刷新资料和状态
  A-->>F: 最新列表
  F-->>U: 显示逐项结果；失败项修正后重试
```

## 规则、异常与完成边界

批量不是单个原子事务，部分成功不会回滚；成功项在本地队列重试时不重复提交。切换门店或卸载会停止后续提交，已发出的当前请求可能仍成功，不承诺全撤销。文件默认从表单继承分类/版本/日期，每份文件可独立修改。文件大小按200000字节限制，正文另受20至60000字和NUL校验。

前端准备：读取当前门店及页面参数。

结果处理：更新 Pinia 或页面状态并渲染。

异常处理：参数校验、资源查询或业务处理失败；前端展示错误并允许重试。JSON、SSE和浏览器本地动作按各自协议反馈，失败不会凭空产生成功结果。

访问范围：此功能读取需有效Bearer会话及当前门店授权；导入、启停和索引写入另需settings权限。

## 源码与需求依据

- [front-pc/src/utils/knowledge-import.ts:13](D:/餐小助/front-pc/src/utils/knowledge-import.ts:13)
- [front-pc/src/utils/knowledge-import.ts:46](D:/餐小助/front-pc/src/utils/knowledge-import.ts:46)
- [front-pc/src/components/KnowledgeManager.vue:71](D:/餐小助/front-pc/src/components/KnowledgeManager.vue:71)
- [backend/src/services/knowledge-service.ts:130](D:/餐小助/backend/src/services/knowledge-service.ts:130)

[返回模块与功能目录](../README.md)
