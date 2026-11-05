## Page 1: 封面
- **Page Type**: Cover
- **Page Title**: 餐小助·商户智能经营助手
- **Page Subtitle**: 项目答辩——从"会写页面"到"能交付系统"
- **Selected Template**:
- **Content Structure**: 项目名称、副标题、答辩人信息、日期
- **Content Density**: Light
- **Narrative Role**: 建立第一印象，传达项目定位
- **Image Requirements**: 无
- **Page Weight**: Core page
- **Notes**: 科技商务风格，突出"AI+餐饮"主题

## Page 2: 目录
- **Page Type**: TOC
- **Page Title**: 答辩提纲
- **Page Subtitle**:
- **Selected Template**:
- **Content Structure**: 5个章节导航——①项目介绍 ②功能与技术 ③问题与解决 ④收获与成长 ⑤成果展望
- **Content Density**: Light
- **Narrative Role**: 让观众快速了解整体结构
- **Image Requirements**: 无
- **Page Weight**: Secondary page

## Page 3: 项目介绍
- **Page Type**: Content
- **Page Title**: 项目定位：中小餐饮的"数字店长"
- **Page Subtitle**:
- **Selected Template**:
- **Content Structure**:
  - 核心痛点：中小餐饮平均寿命18个月，死因是"不会算账、不会管客、不会控损耗"
  - 解决方案：AI经营助手，接入多渠道订单数据，自动算账、管客、控损耗、做促销
  - 产品形态：PC后台 + 手机端 + 顾客扫码点餐页
  - 价值承诺：单店月均降本3000元，增收5000元，效率提升30%
- **Content Density**: Medium
- **Narrative Role**: 建立问题意识，引出解决方案
- **Image Requirements**: 无
- **Page Weight**: Core page

## Page 4: 系统功能架构
- **Page Type**: Content
- **Page Title**: 八大模块覆盖经营全链路
- **Page Subtitle**:
- **Selected Template**:
- **Content Structure**:
  - AI经营驾驶舱：日报自动生成、多渠道对账、异常预警、语音问答
  - 客户资产管家：OneID打通、38个自动标签、RFM分层、流失预警与召回
  - 菜品盈利分析：四象限分类、购物篮分析、成本波动监控
  - 智能采购与库存：销量预测、智能采购单、效期预警
  - 智能定价与促销：动态定价、AI促销方案、分层发券
  - 员工与排班、评价与口碑、系统管理
- **Content Density**: Medium
- **Narrative Role**: 展示系统完整性和模块化设计
- **Image Requirements**: 功能架构图（8个模块的层级关系）
- **Page Weight**: Core page

## Page 5: 技术栈与架构
- **Page Type**: Content
- **Page Title**: 全栈技术架构
- **Page Subtitle**:
- **Selected Template**:
- **Content Structure**:
  - 前端：Vue3 + Pinia + Vue Router + ECharts（PC+手机双端）
  - 后端：Fastify 5 + Prisma 6 + TypeBox + OpenAI SDK
  - AI层：多模型路由策略——DeepSeek-V3（推理）、通义千问-Max（BI）、豆包-Pro（创意）、文心一言-4.0（NLP）
  - 数据层：OneID客户主数据、订单事实表、菜品维度表、标签体系
  - 部署：Docker Compose + Nginx + 腾讯云
- **Content Density**: Medium
- **Narrative Role**: 展示技术深度和架构合理性
- **Image Requirements**: 技术架构分层图
- **Page Weight**: Core page

## Page 6: 重点模块演示
- **Page Type**: Content
- **Page Title**: 三大核心模块落地
- **Page Subtitle**:
- **Selected Template**:
- **Content Structure**:
  - 经营驾驶舱：每日8点AI日报自动推送，含营收/利润/TOP3/异常/建议，生成时间<30秒
  - 客户资产：OneID跨平台合并客户，手机号匹配率>95%，自动RFM重算+流失风险评分
  - 智能采购：基于90天历史+天气预测销量，自动生成采购单，损耗率从12%降至5%
- **Content Density**: Medium
- **Narrative Role**: 用具体数据和场景证明产品价值
- **Image Requirements**: 无（使用数据卡片展示）
- **Page Weight**: Core page

## Page 7: 精彩代码展示
- **Page Type**: Content
- **Page Title**: 两个关键代码设计
- **Page Subtitle**:
- **Selected Template**:
- **Content Structure**:
  - 代码片段1：SSE流式AI回复——reply.hijack() + X-Accel-Buffering:no + AbortController
  - 代码片段2：OneID智能合并——手机号/mask匹配既有快照，姓名兜底，自动RFM重算
  - 代码片段3：订单状态机——pending→accepted→cooking→served→completed/cancelled，服务端白名单校验
- **Content Density**: Medium
- **Narrative Role**: 展示编码能力和工程细节
- **Image Requirements**: 无（代码块展示）
- **Page Weight**: Core page

## Page 8: 过渡页——问题与解决
- **Page Type**: Transition
- **Page Title**: 遇到的问题及解决方案
- **Page Subtitle**: 第三条重点
- **Selected Template**:
- **Content Structure**: 章节过渡页
- **Content Density**: Light
- **Narrative Role**: 强调这是答辩重点，承上启下
- **Image Requirements**: 无
- **Page Weight**: Transition page

## Page 9: 问题①——AI流式输出
- **Page Type**: Content
- **Page Title**: 问题①：AI回复"卡死"的假象
- **Page Subtitle**:
- **Selected Template**:
- **Content Structure**:
  - 现象：AI生成经营日报时，用户等待10秒以上无反馈，误以为系统卡死
  - 原因：非流式返回，用户看不到"思考中"的状态反馈
  - 解决：采用SSE流式输出（Server-Sent Events），reply.hijack() + X-Accel-Buffering:no + AbortController
  - 效果：用户实时看到AI逐字生成，体验从"等待"变为"观看"
- **Content Density**: Medium
- **Narrative Role**: 展示交互设计思维和用户体验优化
- **Image Requirements**: 流式输出前后对比流程图
- **Page Weight**: Core page

## Page 10: 问题②——数据真实性
- **Page Type**: Content
- **Page Title**: 问题②：AI不能"编"数据
- **Page Subtitle**:
- **Selected Template**:
- **Content Structure**:
  - 现象：AI模型未连接时，可能生成看似合理但虚假的经营分析
  - 原因：LLM幻觉——模型会自信地编造数据和结论
  - 解决：dataSource标记（real_orders | insufficient），所有指标只统计served/completed订单，AI输出标注置信度
  - 效果：经营系统的底线——绝不误导用户
- **Content Density**: Medium
- **Narrative Role**: 展示对数据真实性的工程坚守
- **Image Requirements**: 数据校验流程图
- **Page Weight**: Core page

## Page 11: 问题③——多端部署
- **Page Type**: Content
- **Page Title**: 问题③：从开发到上线的最后一公里
- **Page Subtitle**:
- **Selected Template**:
- **Content Structure**:
  - 问题A：二维码使用localhost导致外网打不开 → 公网域名+nginx反向代理配置
  - 问题B：服务器显示旧页面 → Nginx缓存清理+Docker镜像版本化管理
  - 问题C：Docker端口和路径冲突 → 标准化docker-compose.canteen-test.yml
  - 问题D：取消订单被错误计入销量 → 订单状态机白名单校验，只有completed才进入统计
- **Content Density**: Medium
- **Narrative Role**: 展示全链路交付能力和运维思维
- **Image Requirements**: 部署架构图
- **Page Weight**: Core page

## Page 12: 过渡页——收获与成长
- **Page Type**: Transition
- **Page Title**: 项目完成后的收获
- **Page Subtitle**: 第四条重点
- **Selected Template**:
- **Content Structure**: 章节过渡页
- **Content Density**: Light
- **Narrative Role**: 强调这是答辩重点，引出收获总结
- **Image Requirements**: 无
- **Page Weight**: Transition page

## Page 13: 技术收获
- **Page Type**: Content
- **Page Title**: 从技术栈到工程思维
- **Page Subtitle**:
- **Selected Template**:
- **Content Structure**:
  - 技术能力：Vue3多端页面开发、Pinia状态管理、Fastify接口设计、Prisma数据建模
  - AI工程化：SSE流式输出、多模型路由、Prompt工程、Tool Schema设计
  - 运维部署：Docker Compose三阶段构建、Nginx反向代理、腾讯云服务器配置
  - 核心认知：经营类系统的数据真实性是底线，不能为了好看而误导用户
- **Content Density**: Medium
- **Narrative Role**: 总结技术成长和认知提升
- **Image Requirements**: 无
- **Page Weight**: Core page

## Page 14: 成果展示与展望
- **Page Type**: Content
- **Page Title**: 成果与未来方向
- **Page Subtitle**:
- **Selected Template**:
- **Content Structure**:
  - 已完成：三端系统、8大模块、AI日报、客户OneID、菜品四象限、智能采购、Docker部署
  - 量化目标：每日节省对账时间1.5小时、损耗率从12%降至5%、复购率提升20%
  - 未来扩展：连锁多店看板、供应链比价、AI外呼召回、行业垂直方案
- **Content Density**: Medium
- **Narrative Role**: 收尾总结，展示完整性和未来潜力
- **Image Requirements**: 无
- **Page Weight**: Core page

## Page 15: 结尾页
- **Page Type**: Ending
- **Page Title**: 感谢聆听
- **Page Subtitle**: 餐小助·让AI帮你盯店，你只管做好菜
- **Selected Template**:
- **Content Structure**: 感谢语+项目Slogan+联系方式
- **Content Density**: Light
- **Narrative Role**: 优雅收尾，强化品牌记忆
- **Image Requirements**: 无
- **Page Weight**: Core page
