#!/usr/bin/env python3
"""
餐小助项目答辩PPT - HTML演示文稿版本
可在浏览器中完美展示，支持导出PDF
"""
from pathlib import Path

OUT = Path(r"D:\餐小助\餐小助_项目答辩PPT.html")

HTML = r'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>餐小助 - 项目答辩PPT</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
    font-family: "Microsoft YaHei", "PingFang SC", sans-serif;
    background: #1a1a2e;
    overflow: hidden;
    width: 100vw;
    height: 100vh;
}
.slide-container {
    width: 100vw;
    height: 100vh;
    position: relative;
}
.slide {
    position: absolute;
    top: 0; left: 0;
    width: 100%; height: 100%;
    display: none;
    padding: 60px 80px;
    overflow: hidden;
}
.slide.active { display: flex; flex-direction: column; }

/* 封面样式 */
.cover {
    background: linear-gradient(135deg, #FF8C5A 0%, #E85D26 100%);
    justify-content: center;
    align-items: center;
    text-align: center;
}
.cover .tech-tag {
    background: #00C853;
    color: white;
    padding: 12px 30px;
    border-radius: 30px;
    font-size: 18px;
    margin-bottom: 40px;
    display: inline-block;
}
.cover h1 {
    font-size: 80px;
    color: white;
    margin-bottom: 20px;
    font-weight: bold;
}
.cover h2 {
    font-size: 36px;
    color: white;
    margin-bottom: 30px;
    font-weight: normal;
}
.cover .subtitle {
    font-size: 22px;
    color: #FFD0B8;
    margin-bottom: 40px;
}
.cover .footer {
    font-size: 18px;
    color: #FFD0B8;
    border-top: 2px solid white;
    padding-top: 20px;
    width: 60%;
}

/* 内容页样式 */
.content-slide {
    background: #F7F8FA;
}
.top-bar {
    height: 8px;
    background: #FF6B35;
    position: absolute;
    top: 0; left: 0;
    width: 100%;
}
.page-title {
    font-size: 36px;
    color: #1A1A1A;
    margin-top: 30px;
    margin-bottom: 10px;
    font-weight: bold;
}
.page-subtitle {
    font-size: 18px;
    color: #666666;
    margin-bottom: 20px;
}
.separator {
    width: 100px;
    height: 4px;
    background: #FF6B35;
    margin-bottom: 30px;
}
.cards {
    display: grid;
    gap: 20px;
    flex: 1;
}
.cards-2 { grid-template-columns: 1fr 1fr; }
.cards-3 { grid-template-columns: 1fr 1fr 1fr; }
.cards-4 { grid-template-columns: 1fr 1fr; }

.card {
    background: white;
    border-radius: 12px;
    padding: 24px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    border: 1px solid #E0E0E0;
}
.card-tag {
    display: inline-block;
    padding: 6px 16px;
    border-radius: 20px;
    font-size: 14px;
    color: white;
    font-weight: bold;
    margin-bottom: 12px;
}
.tag-red { background: #FF3D00; }
.tag-green { background: #00C853; }
.tag-orange { background: #FF6B35; }
.tag-brown { background: #5B361F; }
.card-title {
    font-size: 20px;
    color: #1A1A1A;
    font-weight: bold;
    margin-bottom: 12px;
}
.card-content {
    font-size: 15px;
    color: #666666;
    line-height: 1.8;
}
.card-content li {
    list-style: none;
    padding-left: 20px;
    position: relative;
}
.card-content li:before {
    content: "•";
    position: absolute;
    left: 0;
    color: #FF6B35;
}

/* 过渡页样式 */
.transition {
    background: linear-gradient(135deg, #5B361F 0%, #3D2415 100%);
    justify-content: center;
    align-items: center;
    text-align: center;
}
.transition .core-tag {
    background: #FF6B35;
    color: white;
    padding: 12px 30px;
    border-radius: 30px;
    font-size: 16px;
    margin-bottom: 30px;
    display: inline-block;
}
.transition h1 {
    font-size: 56px;
    color: white;
    margin-bottom: 20px;
}
.transition .line {
    width: 200px;
    height: 3px;
    background: #FF6B35;
    margin: 20px auto;
}
.transition .subtitle {
    font-size: 22px;
    color: #FFD0B8;
}

/* 目录页样式 */
.toc {
    background: #F7F8FA;
}
.toc-item {
    display: flex;
    align-items: center;
    background: white;
    border-radius: 12px;
    padding: 20px 30px;
    margin-bottom: 16px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    border: 1px solid #E0E0E0;
}
.toc-num {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    font-weight: bold;
    color: white;
    margin-right: 20px;
    flex-shrink: 0;
}
.toc-title {
    font-size: 22px;
    color: #1A1A1A;
    font-weight: bold;
    margin-right: 20px;
}
.toc-desc {
    font-size: 16px;
    color: #666666;
}

/* 结尾页 */
.ending {
    background: linear-gradient(135deg, #FF8C5A 0%, #E85D26 100%);
    justify-content: center;
    align-items: center;
    text-align: center;
}
.ending h1 {
    font-size: 72px;
    color: white;
    margin-bottom: 30px;
}
.ending .line {
    width: 200px;
    height: 3px;
    background: white;
    margin: 20px auto;
}
.ending .slogan {
    font-size: 28px;
    color: #FFE0D0;
}

/* 导航按钮 */
.nav {
    position: fixed;
    bottom: 30px;
    right: 30px;
    display: flex;
    gap: 10px;
    z-index: 1000;
}
.nav button {
    background: rgba(255,255,255,0.9);
    border: none;
    padding: 12px 24px;
    border-radius: 25px;
    cursor: pointer;
    font-size: 16px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    transition: all 0.3s;
}
.nav button:hover {
    background: #FF6B35;
    color: white;
}
.page-indicator {
    position: fixed;
    bottom: 30px;
    left: 30px;
    background: rgba(255,255,255,0.9);
    padding: 12px 24px;
    border-radius: 25px;
    font-size: 16px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}

/* 打印/导出PDF样式 */
@media print {
    body { background: white; overflow: visible; }
    .slide {
        position: relative;
        display: flex !important;
        page-break-after: always;
        width: 100%;
        height: 100vh;
    }
    .nav, .page-indicator { display: none; }
}
</style>
</head>
<body>
<div class="slide-container">

<!-- 第1页：封面 -->
<div class="slide cover active">
    <div class="tech-tag">Vue3 + Fastify + Prisma + AI + Docker</div>
    <h1>餐小助</h1>
    <h2>商户智能经营助手</h2>
    <div class="subtitle">项目答辩——从"会写页面"到"能交付系统"</div>
    <div class="footer">答辩人：餐小助团队 &nbsp;&nbsp;&nbsp; 2026年8月</div>
</div>

<!-- 第2页：目录 -->
<div class="slide content-slide toc">
    <div class="top-bar"></div>
    <div class="page-title">答辩提纲</div>
    <div class="page-subtitle">五大章节，重点聚焦问题与收获</div>
    <div class="separator"></div>
    <div class="cards" style="grid-template-columns: 1fr;">
        <div class="toc-item">
            <div class="toc-num" style="background:#FF6B35;">01</div>
            <div class="toc-title">项目介绍</div>
            <div class="toc-desc">中小餐饮的"数字店长"</div>
        </div>
        <div class="toc-item">
            <div class="toc-num" style="background:#00C853;">02</div>
            <div class="toc-title">功能与技术</div>
            <div class="toc-desc">八大模块 + 全栈架构</div>
        </div>
        <div class="toc-item">
            <div class="toc-num" style="background:#FF3D00;">03</div>
            <div class="toc-title">问题与解决</div>
            <div class="toc-desc">开发中的技术挑战（重点）</div>
        </div>
        <div class="toc-item">
            <div class="toc-num" style="background:#5B361F;">04</div>
            <div class="toc-title">收获与成长</div>
            <div class="toc-desc">从技术栈到工程思维（重点）</div>
        </div>
        <div class="toc-item">
            <div class="toc-num" style="background:#00C853;">05</div>
            <div class="toc-title">成果展望</div>
            <div class="toc-desc">量化成果与未来方向</div>
        </div>
    </div>
</div>

<!-- 第3页：项目定位 -->
<div class="slide content-slide">
    <div class="top-bar"></div>
    <div class="page-title">项目定位：中小餐饮的"数字店长"</div>
    <div class="page-subtitle">中小餐饮平均寿命18个月，死因是"不会算账、不会管客、不会控损耗"</div>
    <div class="separator"></div>
    <div class="cards cards-2">
        <div class="card">
            <div class="card-tag tag-red">痛点</div>
            <div class="card-title">核心痛点</div>
            <ul class="card-content">
                <li>中小餐饮平均寿命仅18个月</li>
                <li>不会算账、不会管客、不会控损耗</li>
                <li>多渠道数据孤岛，对账困难</li>
            </ul>
        </div>
        <div class="card">
            <div class="card-tag tag-green">方案</div>
            <div class="card-title">解决方案</div>
            <ul class="card-content">
                <li>AI经营助手，自动算账、管客、控损耗</li>
                <li>接入美团/饿了么/抖音等多渠道数据</li>
                <li>每日自动生成经营日报</li>
            </ul>
        </div>
        <div class="card">
            <div class="card-tag tag-orange">价值</div>
            <div class="card-title">量化价值</div>
            <ul class="card-content">
                <li>单店月均降本3000元</li>
                <li>单店月均增收5000元</li>
                <li>综合经营效率提升30%</li>
            </ul>
        </div>
        <div class="card">
            <div class="card-tag tag-brown">形态</div>
            <div class="card-title">产品形态</div>
            <ul class="card-content">
                <li>PC商户后台：复杂配置与数据看板</li>
                <li>手机端商户页：移动查看关键数据</li>
                <li>顾客扫码点餐页：桌码进入点餐</li>
            </ul>
        </div>
    </div>
</div>

<!-- 第4页：功能架构 -->
<div class="slide content-slide">
    <div class="top-bar"></div>
    <div class="page-title">八大模块覆盖经营全链路</div>
    <div class="page-subtitle">围绕PRD的8大模块，当前项目已覆盖核心可演示链路</div>
    <div class="separator"></div>
    <div class="cards cards-3">
        <div class="card">
            <div class="card-tag tag-orange">核心</div>
            <div class="card-title">AI经营驾驶舱</div>
            <ul class="card-content">
                <li>日报自动生成、多渠道对账</li>
                <li>异常预警、语音问答</li>
            </ul>
        </div>
        <div class="card">
            <div class="card-tag tag-orange">核心</div>
            <div class="card-title">客户资产管家</div>
            <ul class="card-content">
                <li>OneID打通、38个自动标签</li>
                <li>RFM分层、流失预警与召回</li>
            </ul>
        </div>
        <div class="card">
            <div class="card-tag tag-orange">核心</div>
            <div class="card-title">菜品盈利分析</div>
            <ul class="card-content">
                <li>四象限分类、购物篮分析</li>
                <li>成本波动监控</li>
            </ul>
        </div>
        <div class="card">
            <div class="card-tag tag-orange">核心</div>
            <div class="card-title">智能采购与库存</div>
            <ul class="card-content">
                <li>销量预测、智能采购单</li>
                <li>效期预警</li>
            </ul>
        </div>
        <div class="card">
            <div class="card-tag tag-green">扩展</div>
            <div class="card-title">智能定价与促销</div>
            <ul class="card-content">
                <li>动态定价、AI促销方案</li>
                <li>分层发券</li>
            </ul>
        </div>
        <div class="card">
            <div class="card-tag tag-green">扩展</div>
            <div class="card-title">员工/评价/系统</div>
            <ul class="card-content">
                <li>员工排班、评价口碑</li>
                <li>系统管理</li>
            </ul>
        </div>
    </div>
</div>

<!-- 第5页：技术架构 -->
<div class="slide content-slide">
    <div class="top-bar"></div>
    <div class="page-title">全栈技术架构</div>
    <div class="page-subtitle">前端三端 + 后端服务 + AI层 + 数据层 + 云部署</div>
    <div class="separator"></div>
    <div class="cards cards-2">
        <div class="card">
            <div class="card-tag tag-green">前端</div>
            <div class="card-title">前端展示层</div>
            <ul class="card-content">
                <li>Vue3 + Pinia + Vue Router + ECharts</li>
                <li>PC商户后台 + 手机商户端 + 顾客扫码页</li>
            </ul>
        </div>
        <div class="card">
            <div class="card-tag tag-orange">后端</div>
            <div class="card-title">业务接口层</div>
            <ul class="card-content">
                <li>Fastify 5 + Prisma 6 + TypeBox</li>
                <li>Swagger文档、CORS、Helmet、RateLimit</li>
            </ul>
        </div>
        <div class="card">
            <div class="card-tag tag-brown">AI</div>
            <div class="card-title">AI能力层</div>
            <ul class="card-content">
                <li>DeepSeek-V3（推理）、通义千问-Max（BI）</li>
                <li>豆包-Pro（创意）、文心一言-4.0（NLP）</li>
            </ul>
        </div>
        <div class="card">
            <div class="card-tag tag-red">部署</div>
            <div class="card-title">云部署层</div>
            <ul class="card-content">
                <li>Docker Compose + Nginx</li>
                <li>腾讯云公网IP、数据卷持久化</li>
            </ul>
        </div>
    </div>
</div>

<!-- 第6页：业务闭环 -->
<div class="slide content-slide">
    <div class="top-bar"></div>
    <div class="page-title">业务闭环：从顾客下单到商户决策</div>
    <div class="page-subtitle">数据不再只是页面展示，而是可持续计算、追踪、复盘的经营资产</div>
    <div class="separator"></div>
    <div class="cards cards-2">
        <div class="card">
            <div class="card-tag tag-orange">顾客端</div>
            <div class="card-title">扫码点餐</div>
            <ul class="card-content">
                <li>桌码token自动识别桌号</li>
                <li>菜品、数量、称呼、手机号、备注</li>
                <li>购物车、加菜、订单状态</li>
            </ul>
        </div>
        <div class="card">
            <div class="card-tag tag-green">商户端</div>
            <div class="card-title">接单与分析</div>
            <ul class="card-content">
                <li>订单队列、状态流转动画</li>
                <li>数据沉淀到客户/菜品/评价</li>
                <li>AI日报、采购建议、经营分析</li>
            </ul>
        </div>
        <div class="card">
            <div class="card-tag tag-brown">数据</div>
            <div class="card-title">数据模型</div>
            <ul class="card-content">
                <li>OneID客户主数据、订单事实表</li>
                <li>菜品维度表、标签体系</li>
                <li>订单状态机白名单校验</li>
            </ul>
        </div>
        <div class="card">
            <div class="card-tag tag-red">AI</div>
            <div class="card-title">智能辅助</div>
            <ul class="card-content">
                <li>SSE流式AI问答</li>
                <li>多模型路由策略</li>
                <li>置信度标注、可解释输出</li>
            </ul>
        </div>
    </div>
</div>

<!-- 第7页：核心模块 -->
<div class="slide content-slide">
    <div class="top-bar"></div>
    <div class="page-title">三大核心模块落地</div>
    <div class="page-subtitle">用具体数据和场景证明产品价值</div>
    <div class="separator"></div>
    <div class="cards cards-3">
        <div class="card">
            <div class="card-tag tag-orange">模块一</div>
            <div class="card-title">经营驾驶舱</div>
            <ul class="card-content">
                <li>每日8点AI日报自动推送</li>
                <li>含营收/利润/TOP3/异常/建议</li>
                <li>生成时间 &lt; 30秒</li>
            </ul>
        </div>
        <div class="card">
            <div class="card-tag tag-green">模块二</div>
            <div class="card-title">客户资产</div>
            <ul class="card-content">
                <li>OneID跨平台合并客户</li>
                <li>手机号匹配率 &gt; 95%</li>
                <li>自动RFM重算 + 流失风险评分</li>
            </ul>
        </div>
        <div class="card">
            <div class="card-tag tag-brown">模块三</div>
            <div class="card-title">智能采购</div>
            <ul class="card-content">
                <li>基于90天历史 + 天气预测销量</li>
                <li>自动生成采购单</li>
                <li>损耗率从12%降至5%</li>
            </ul>
        </div>
    </div>
</div>

<!-- 第8页：过渡页 - 问题与解决 -->
<div class="slide transition">
    <div class="core-tag">CORE SECTION</div>
    <h1>遇到的问题及解决方案</h1>
    <div class="line"></div>
    <div class="subtitle">答辩要求第3条重点 · 真实开发不是一路顺风</div>
</div>

<!-- 第9页：问题1 -->
<div class="slide content-slide">
    <div class="top-bar"></div>
    <div class="page-title">问题①：AI回复"卡死"的假象</div>
    <div class="page-subtitle">用户体验优化：从"等待"到"观看"</div>
    <div class="separator"></div>
    <div class="cards cards-2">
        <div class="card">
            <div class="card-tag tag-red">现象</div>
            <div class="card-title">问题现象</div>
            <ul class="card-content">
                <li>AI生成经营日报时，用户等待10秒以上无反馈</li>
                <li>用户以为系统卡死，反复点击</li>
            </ul>
        </div>
        <div class="card">
            <div class="card-tag tag-brown">原因</div>
            <div class="card-title">原因分析</div>
            <ul class="card-content">
                <li>非流式返回，用户看不到"思考中"的状态</li>
                <li>缺少进度反馈机制</li>
            </ul>
        </div>
        <div class="card">
            <div class="card-tag tag-green">解决</div>
            <div class="card-title">解决方案</div>
            <ul class="card-content">
                <li>采用SSE流式输出（Server-Sent Events）</li>
                <li>reply.hijack() + X-Accel-Buffering:no</li>
                <li>AbortController控制停止生成</li>
            </ul>
        </div>
        <div class="card">
            <div class="card-tag tag-orange">效果</div>
            <div class="card-title">最终效果</div>
            <ul class="card-content">
                <li>用户实时看到AI逐字生成</li>
                <li>体验从"等待"变为"观看"</li>
                <li>支持停止生成和禁用重复发送</li>
            </ul>
        </div>
    </div>
</div>

<!-- 第10页：问题2 -->
<div class="slide content-slide">
    <div class="top-bar"></div>
    <div class="page-title">问题②：AI不能"编"数据</div>
    <div class="page-subtitle">经营系统的底线——绝不误导用户</div>
    <div class="separator"></div>
    <div class="cards cards-2">
        <div class="card">
            <div class="card-tag tag-red">现象</div>
            <div class="card-title">问题现象</div>
            <ul class="card-content">
                <li>AI模型未连接时，可能生成虚假经营分析</li>
                <li>LLM幻觉：模型会自信地编造数据</li>
            </ul>
        </div>
        <div class="card">
            <div class="card-tag tag-brown">原因</div>
            <div class="card-title">原因分析</div>
            <ul class="card-content">
                <li>降级mock容易误导真实经营判断</li>
                <li>没有数据源标记和校验机制</li>
            </ul>
        </div>
        <div class="card">
            <div class="card-tag tag-green">解决</div>
            <div class="card-title">解决方案</div>
            <ul class="card-content">
                <li>dataSource标记（real_orders | insufficient）</li>
                <li>只统计served/completed订单</li>
                <li>AI输出标注置信度</li>
            </ul>
        </div>
        <div class="card">
            <div class="card-tag tag-orange">效果</div>
            <div class="card-title">最终效果</div>
            <ul class="card-content">
                <li>模型不可用时直接展示失败原因</li>
                <li>不伪造经营建议</li>
                <li>经营系统的底线：绝不误导用户</li>
            </ul>
        </div>
    </div>
</div>

<!-- 第11页：问题3 -->
<div class="slide content-slide">
    <div class="top-bar"></div>
    <div class="page-title">问题③：从开发到上线的最后一公里</div>
    <div class="page-subtitle">全链路交付能力和运维思维</div>
    <div class="separator"></div>
    <div class="cards cards-2">
        <div class="card">
            <div class="card-tag tag-red">问题A</div>
            <div class="card-title">二维码外网访问</div>
            <ul class="card-content">
                <li>二维码使用localhost导致外网打不开</li>
                <li>解决：公网域名 + Nginx反向代理</li>
            </ul>
        </div>
        <div class="card">
            <div class="card-tag tag-red">问题B</div>
            <div class="card-title">服务器显示旧页面</div>
            <ul class="card-content">
                <li>Nginx缓存导致页面不更新</li>
                <li>解决：缓存清理 + Docker镜像版本化</li>
            </ul>
        </div>
        <div class="card">
            <div class="card-tag tag-red">问题C</div>
            <div class="card-title">Docker部署冲突</div>
            <ul class="card-content">
                <li>端口冲突、中文路径导致compose失败</li>
                <li>解决：固定project name、独立端口18080</li>
            </ul>
        </div>
        <div class="card">
            <div class="card-tag tag-red">问题D</div>
            <div class="card-title">订单统计不准</div>
            <ul class="card-content">
                <li>取消订单被错误计入销量</li>
                <li>解决：状态机白名单，只统计completed</li>
            </ul>
        </div>
    </div>
</div>

<!-- 第12页：过渡页 - 收获与成长 -->
<div class="slide transition">
    <div class="core-tag">CORE SECTION</div>
    <h1>项目完成后的收获</h1>
    <div class="line"></div>
    <div class="subtitle">答辩要求第4条重点 · 从"写页面"到"做系统"</div>
</div>

<!-- 第13页：技术收获 -->
<div class="slide content-slide">
    <div class="top-bar"></div>
    <div class="page-title">从技术栈到工程思维</div>
    <div class="page-subtitle">这次项目最大的价值，是从"会写页面"走向"能交付系统"</div>
    <div class="separator"></div>
    <div class="cards cards-2">
        <div class="card">
            <div class="card-tag tag-green">前端</div>
            <div class="card-title">前端能力</div>
            <ul class="card-content">
                <li>Vue3多端页面开发</li>
                <li>Pinia状态管理、Vue Router路由</li>
                <li>移动端弹层滚动、响应式布局</li>
            </ul>
        </div>
        <div class="card">
            <div class="card-tag tag-orange">后端</div>
            <div class="card-title">后端能力</div>
            <ul class="card-content">
                <li>Fastify接口设计、Prisma数据建模</li>
                <li>注册登录、短信验证码、订单接口</li>
                <li>客户、菜品、采购、评价、天气接口</li>
            </ul>
        </div>
        <div class="card">
            <div class="card-tag tag-brown">AI</div>
            <div class="card-title">AI工程化</div>
            <ul class="card-content">
                <li>SSE流式输出、多模型路由</li>
                <li>Prompt工程、Tool Schema设计</li>
                <li>置信度标注、可解释输出</li>
            </ul>
        </div>
        <div class="card">
            <div class="card-tag tag-red">运维</div>
            <div class="card-title">部署运维</div>
            <ul class="card-content">
                <li>Docker Compose三阶段构建</li>
                <li>Nginx反向代理、腾讯云服务器</li>
                <li>通过日志、curl定位问题</li>
            </ul>
        </div>
    </div>
</div>

<!-- 第14页：成果展望 -->
<div class="slide content-slide">
    <div class="top-bar"></div>
    <div class="page-title">成果与未来方向</div>
    <div class="page-subtitle">已完成核心闭环，未来持续扩展</div>
    <div class="separator"></div>
    <div class="cards cards-3">
        <div class="card">
            <div class="card-tag tag-green">已完成</div>
            <div class="card-title">项目成果</div>
            <ul class="card-content">
                <li>三端系统：PC后台 + 手机 + 顾客扫码</li>
                <li>8大模块、AI日报、客户OneID</li>
                <li>菜品四象限、智能采购、Docker部署</li>
            </ul>
        </div>
        <div class="card">
            <div class="card-tag tag-orange">量化</div>
            <div class="card-title">量化目标</div>
            <ul class="card-content">
                <li>每日节省对账时间1.5小时</li>
                <li>损耗率从12%降至5%</li>
                <li>复购率提升20%</li>
            </ul>
        </div>
        <div class="card">
            <div class="card-tag tag-brown">未来</div>
            <div class="card-title">未来扩展</div>
            <ul class="card-content">
                <li>连锁多店看板、供应链比价</li>
                <li>AI外呼召回、行业垂直方案</li>
                <li>MySQL替换、HTTPS域名</li>
            </ul>
        </div>
    </div>
</div>

<!-- 第15页：结尾 -->
<div class="slide ending">
    <h1>感谢聆听</h1>
    <div class="line"></div>
    <div class="slogan">餐小助 · 让AI帮你盯店，你只管做好菜</div>
</div>

</div>

<!-- 导航控制 -->
<div class="page-indicator" id="pageIndicator">1 / 15</div>
<div class="nav">
    <button onclick="prevSlide()">上一页</button>
    <button onclick="nextSlide()">下一页</button>
</div>

<script>
let currentSlide = 0;
const slides = document.querySelectorAll('.slide');
const totalSlides = slides.length;
const pageIndicator = document.getElementById('pageIndicator');

function showSlide(n) {
    slides[currentSlide].classList.remove('active');
    currentSlide = (n + totalSlides) % totalSlides;
    slides[currentSlide].classList.add('active');
    pageIndicator.textContent = (currentSlide + 1) + ' / ' + totalSlides;
}

function nextSlide() { showSlide(currentSlide + 1); }
function prevSlide() { showSlide(currentSlide - 1); }

// 键盘导航
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        nextSlide();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        prevSlide();
    }
});

// 触摸滑动支持
let touchStartX = 0;
document.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
});
document.addEventListener('touchend', (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) > 50) {
        if (diff > 0) nextSlide();
        else prevSlide();
    }
});
</script>
</body>
</html>
'''

if OUT.exists():
    OUT.unlink()

OUT.write_text(HTML, encoding='utf-8')
print(f"OK: {OUT} ({OUT.stat().st_size} bytes, 15 slides)")
print("请在浏览器中打开此文件进行演示")
print("导出PDF：浏览器中按 Ctrl+P，选择"另存为PDF"")
