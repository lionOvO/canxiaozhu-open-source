from __future__ import annotations

from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_AUTO_SHAPE_TYPE
from pptx.enum.text import PP_ALIGN, MSO_AUTO_SIZE, MSO_ANCHOR
from pptx.util import Inches, Pt


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "餐小助_项目答辩PPT_侧重问题解决与收获.pptx"
NOTES = ROOT / "餐小助_项目答辩讲稿提纲.md"


W, H = Inches(13.333), Inches(7.5)

BG = RGBColor(248, 243, 232)
INK = RGBColor(38, 31, 24)
MUTED = RGBColor(107, 92, 75)
BROWN = RGBColor(91, 54, 31)
ORANGE = RGBColor(226, 116, 44)
GOLD = RGBColor(245, 181, 83)
GREEN = RGBColor(61, 130, 103)
RED = RGBColor(188, 72, 55)
CARD = RGBColor(255, 250, 240)
LINE = RGBColor(230, 213, 184)
BLUE = RGBColor(58, 111, 151)


def cm(v: float):
    return Inches(v / 2.54)


def set_fill(shape, color: RGBColor, transparency: int = 0):
    shape.fill.solid()
    shape.fill.fore_color.rgb = color
    if transparency:
        shape.fill.transparency = transparency
    shape.line.color.rgb = color


def set_line(shape, color: RGBColor = LINE, width: float = 1):
    shape.line.color.rgb = color
    shape.line.width = Pt(width)


def add_text(
    slide,
    text: str,
    x: float,
    y: float,
    w: float,
    h: float,
    size: int = 20,
    color: RGBColor = INK,
    bold: bool = False,
    font: str = "Microsoft YaHei",
    align=PP_ALIGN.LEFT,
    valign=MSO_ANCHOR.TOP,
    line_spacing: float | None = None,
):
    box = slide.shapes.add_textbox(cm(x), cm(y), cm(w), cm(h))
    tf = box.text_frame
    tf.clear()
    tf.word_wrap = True
    tf.auto_size = MSO_AUTO_SIZE.TEXT_TO_FIT_SHAPE
    tf.vertical_anchor = valign
    p = tf.paragraphs[0]
    p.alignment = align
    if line_spacing:
        p.line_spacing = line_spacing
    run = p.add_run()
    run.text = text
    run.font.name = font
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color
    return box


def add_rich_lines(slide, lines, x, y, w, h, size=16, color=INK):
    box = slide.shapes.add_textbox(cm(x), cm(y), cm(w), cm(h))
    tf = box.text_frame
    tf.clear()
    tf.word_wrap = True
    tf.auto_size = MSO_AUTO_SIZE.TEXT_TO_FIT_SHAPE
    for idx, line in enumerate(lines):
        p = tf.paragraphs[0] if idx == 0 else tf.add_paragraph()
        p.space_after = Pt(6)
        p.line_spacing = 1.15
        run = p.add_run()
        run.text = line
        run.font.name = "Microsoft YaHei"
        run.font.size = Pt(size)
        run.font.color.rgb = color
    return box


def add_card(slide, x, y, w, h, fill=CARD, line=LINE, radius=True):
    shape_type = MSO_AUTO_SHAPE_TYPE.ROUNDED_RECTANGLE if radius else MSO_AUTO_SHAPE_TYPE.RECTANGLE
    shape = slide.shapes.add_shape(shape_type, cm(x), cm(y), cm(w), cm(h))
    set_fill(shape, fill)
    set_line(shape, line, 1)
    return shape


def add_pill(slide, text, x, y, w, h, fill=ORANGE, color=RGBColor(255, 255, 255), size=12):
    pill = slide.shapes.add_shape(MSO_AUTO_SHAPE_TYPE.ROUNDED_RECTANGLE, cm(x), cm(y), cm(w), cm(h))
    set_fill(pill, fill)
    pill.line.color.rgb = fill
    tf = pill.text_frame
    tf.clear()
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    run = p.add_run()
    run.text = text
    run.font.name = "Microsoft YaHei"
    run.font.size = Pt(size)
    run.font.bold = True
    run.font.color.rgb = color
    return pill


def add_bg(slide, section=""):
    bg = slide.shapes.add_shape(MSO_AUTO_SHAPE_TYPE.RECTANGLE, 0, 0, W, H)
    set_fill(bg, BG)
    bg.line.color.rgb = BG
    # Soft atmosphere shapes
    blob1 = slide.shapes.add_shape(MSO_AUTO_SHAPE_TYPE.OVAL, cm(26), cm(-2.2), cm(12), cm(8))
    set_fill(blob1, RGBColor(253, 212, 139), 22)
    blob1.line.transparency = 100
    blob2 = slide.shapes.add_shape(MSO_AUTO_SHAPE_TYPE.OVAL, cm(-2), cm(14), cm(10), cm(7))
    set_fill(blob2, RGBColor(187, 219, 179), 35)
    blob2.line.transparency = 100
    add_text(slide, "餐小助 · 项目答辩", 0.85, 0.45, 5.8, 0.5, 10, MUTED, True)
    if section:
        add_pill(slide, section, 29.7, 0.35, 2.8, 0.65, BROWN, size=10)


def add_title(slide, title, subtitle=None, section=""):
    add_bg(slide, section)
    add_text(slide, title, 0.9, 1.1, 21, 1.2, 28, INK, True)
    if subtitle:
        add_text(slide, subtitle, 0.95, 2.25, 21, 0.75, 14, MUTED)


def bullet_card(slide, title, bullets, x, y, w, h, accent=ORANGE):
    add_card(slide, x, y, w, h)
    add_pill(slide, title, x + 0.35, y + 0.35, min(w - 0.7, 4.7), 0.62, accent, size=11)
    add_rich_lines(slide, [f"• {b}" for b in bullets], x + 0.45, y + 1.25, w - 0.9, h - 1.55, size=13, color=INK)


def metric(slide, label, value, x, y, w, color=ORANGE):
    add_card(slide, x, y, w, 2.35)
    add_text(slide, value, x + 0.35, y + 0.35, w - 0.7, 0.8, 26, color, True)
    add_text(slide, label, x + 0.35, y + 1.22, w - 0.7, 0.75, 12, MUTED)


def connector(slide, x1, y1, x2, y2, color=ORANGE):
    line = slide.shapes.add_connector(1, cm(x1), cm(y1), cm(x2), cm(y2))
    line.line.color.rgb = color
    line.line.width = Pt(2.2)
    return line


def make_deck():
    prs = Presentation()
    prs.slide_width = W
    prs.slide_height = H
    blank = prs.slide_layouts[6]

    # 1 Cover
    s = prs.slides.add_slide(blank)
    add_bg(s)
    add_pill(s, "Vue3 + Fastify + Prisma + AI + Docker", 1.0, 1.0, 8.8, 0.7, GREEN, size=12)
    add_text(s, "餐小助", 1.0, 2.1, 9, 1.1, 44, BROWN, True)
    add_text(s, "商户智能经营助手", 1.0, 3.05, 12, 0.9, 30, INK, True)
    add_text(s, "项目答辩展示 · 侧重问题解决方案与项目收获", 1.05, 4.05, 14, 0.8, 16, MUTED)
    metric(s, "自动沉淀扫码点餐、订单、客户、菜品、评价与采购数据", "数据闭环", 22.3, 1.35, 8.6, GREEN)
    metric(s, "从本地一键启动到腾讯云 Docker 测试版部署", "可运行交付", 22.3, 4.1, 8.6, ORANGE)

    # 2 Requirement mapping
    s = prs.slides.add_slide(blank)
    add_title(s, "答辩要求与本次展示重点", "PDF 要求包含 5 项，本 PPT 会明显加重第 3、4 项。", "要求对应")
    items = [
        ("1 个人与项目介绍", "说明项目定位、目标用户和业务价值"),
        ("2 重点模块/精彩代码", "展示扫码点餐、AI 问答、数据分析、注册认证等核心实现"),
        ("3 遇到的问题及解决方案", "重点：样式错位、真实数据、AI 调用、部署 500、二维码外网访问等"),
        ("4 项目完成后的收获", "重点：产品闭环、工程化、数据口径、安全部署与调试能力"),
        ("5 项目演示", "给出可录屏演示路线，方便后续录制解说视频"),
    ]
    y = 3.05
    for idx, (k, v) in enumerate(items):
        color = ORANGE if idx in (2, 3) else GREEN if idx == 4 else BROWN
        add_card(s, 1.0, y + idx * 1.15, 30.5, 0.86, RGBColor(255, 252, 246))
        add_pill(s, k, 1.3, y + idx * 1.15 + 0.14, 6.8, 0.55, color, size=10)
        add_text(s, v, 8.7, y + idx * 1.15 + 0.16, 20.5, 0.48, 13, INK)

    # 3 Project intro
    s = prs.slides.add_slide(blank)
    add_title(s, "项目定位：给中小餐饮商户的数字店长", "餐小助不是单纯聊天工具，而是围绕“订单-客户-菜品-采购-评价-经营建议”的经营辅助系统。", "项目介绍")
    bullet_card(
        s,
        "目标用户",
        ["社区快餐店、夫妻店、小型连锁门店", "老板需要快速知道昨天赚了多少、今天该做什么", "减少对账、备货、客户维护和差评处理的重复劳动"],
        1.0,
        3.0,
        9.5,
        4.1,
        GREEN,
    )
    bullet_card(
        s,
        "核心价值",
        ["通过扫码点餐沉淀真实订单数据", "用客户标签、菜品四象限、采购建议辅助经营", "通过 AI 日报和语音问答降低看报表门槛"],
        11.3,
        3.0,
        9.5,
        4.1,
        ORANGE,
    )
    bullet_card(
        s,
        "交付形态",
        ["PC 商户后台：复杂配置、订单队列、系统管理", "手机端商户页：移动查看关键数据", "顾客扫码点餐页：桌码进入、购物车、加菜、订单状态"],
        21.6,
        3.0,
        9.5,
        4.1,
        BROWN,
    )

    # 4 Product architecture
    s = prs.slides.add_slide(blank)
    add_title(s, "整体业务闭环：从顾客下单到商户决策", "项目真正落地的关键，是让顾客端产生的数据回流到商户端分析，而不是只做静态页面。", "功能闭环")
    steps = [
        ("顾客扫码", "桌码 token\n自动识别桌号"),
        ("点餐提交", "菜品、数量\n称呼、手机号、备注"),
        ("商户接单", "订单队列\n状态切换动画"),
        ("数据沉淀", "订单/客户/菜品\n写入数据库"),
        ("经营分析", "日报/客户资产\n菜品盈利/采购"),
        ("AI 辅助", "流式问答\n行动建议"),
    ]
    x = 0.9
    for i, (title, desc) in enumerate(steps):
        add_card(s, x + i * 5.25, 3.1, 4.5, 2.65)
        add_text(s, title, x + i * 5.25 + 0.35, 3.45, 3.8, 0.5, 15, BROWN, True, align=PP_ALIGN.CENTER)
        add_text(s, desc, x + i * 5.25 + 0.35, 4.25, 3.8, 1.0, 12, MUTED, align=PP_ALIGN.CENTER)
        if i < len(steps) - 1:
            connector(s, x + i * 5.25 + 4.5, 4.42, x + (i + 1) * 5.25, 4.42)
    add_text(s, "数据不再只是页面展示，而是可以持续计算、追踪、复盘的经营资产。", 1.2, 6.45, 28, 0.55, 16, GREEN, True, align=PP_ALIGN.CENTER)

    # 5 Implemented modules
    s = prs.slides.add_slide(blank)
    add_title(s, "已实现功能总览", "围绕 PRD 的 8 大模块，当前项目已覆盖核心可演示链路。", "功能实现")
    modules = [
        ("经营驾驶舱", "营收、利润、客单价、核心趋势、天气经营建议"),
        ("AI 经营日报", "异常归因、TOP 菜品、行动建议、经营总结"),
        ("扫码点餐", "桌码二维码、顾客菜单、购物车、加菜、订单状态"),
        ("客户资产", "按手机号/称呼沉淀客户、客户分层、备注、召回建议"),
        ("菜品盈利", "销量/毛利四象限、成本提醒、菜单优化建议"),
        ("智能采购", "预测采购清单、临期预警、供应商比价、确认导出"),
        ("评价口碑", "评价聚合、差评归因、AI 回复、处理状态"),
        ("多店/系统", "门店对比、数据源、员工权限、知识库、部署管理"),
    ]
    for i, (name, desc) in enumerate(modules):
        col = i % 4
        row = i // 4
        x = 1.0 + col * 7.7
        y = 2.65 + row * 2.45
        add_card(s, x, y, 7.0, 1.85)
        add_text(s, name, x + 0.35, y + 0.28, 6.3, 0.4, 14, BROWN, True)
        add_text(s, desc, x + 0.35, y + 0.82, 6.2, 0.8, 11, MUTED)

    # 6 Highlight modules and code
    s = prs.slides.add_slide(blank)
    add_title(s, "重点模块与精彩代码", "选取最能体现项目完整度的 4 类实现。", "重点模块")
    bullet_card(
        s,
        "扫码点餐实时闭环",
        ["Public API：/api/v2/public/dining/:token/menu", "提交订单支持 existing_order_id，实现顾客后续加菜", "商户端轮询订单队列并进行状态流转"],
        1.0,
        2.85,
        10.0,
        4.25,
        ORANGE,
    )
    bullet_card(
        s,
        "AI 流式问答",
        ["前端 fetch SSE：Accept: text/event-stream", "后端 AsyncGenerator 逐步推送 thinking/delta/done", "未连接模型时明确报错，避免虚假分析误导用户"],
        11.7,
        2.85,
        10.0,
        4.25,
        GREEN,
    )
    bullet_card(
        s,
        "数据模型落地",
        ["Prisma 建模 Shop / MerchantUser / DiningOrder / MenuItem", "订单、客户、菜品、评价、采购数据统一归属门店", "密码哈希、登录日志、Session 表支撑安全认证"],
        22.4,
        2.85,
        9.2,
        4.25,
        BROWN,
    )

    # 7 Data and algorithm logic
    s = prs.slides.add_slide(blank)
    add_title(s, "数据口径：避免“看起来有数据，其实不可信”", "开发中反复校正的核心，是让页面统计只基于有效业务状态。", "数据逻辑")
    bullet_card(
        s,
        "有效订单口径",
        ["菜品销量、利润、客户资产不统计已取消订单", "已上桌/已完成订单才进入经营驾驶舱核心金额", "顾客取消、空扫二维码不沉淀为有效消费"],
        1.0,
        2.85,
        9.8,
        4.3,
        RED,
    )
    bullet_card(
        s,
        "客户沉淀口径",
        ["顾客端录入称呼和手机号后进入客户资产", "手机号优先作为客户识别依据，称呼作为展示信息", "客户备注直接保存到列表与数据库，便于后续维护"],
        11.5,
        2.85,
        9.8,
        4.3,
        GREEN,
    )
    bullet_card(
        s,
        "经营分析口径",
        ["菜品盈利按销量和毛利做四象限", "采购单结合销量预测、库存、损耗和临期风险", "天气接入和风天气，城市选择与 IP 定位分开处理"],
        22.0,
        2.85,
        9.8,
        4.3,
        ORANGE,
    )

    # 8 Problems 1
    s = prs.slides.add_slide(blank)
    add_title(s, "项目中遇到的问题及解决方案（一）", "重点对应答辩要求第 3 条：真实开发不是一路顺风，关键是能定位、能修复、能验证。", "问题解决")
    rows = [
        ("语音问答窗口挤成一坨", "移动端弹层高度、滚动容器和背景页面滚动冲突", "改为独立 sheet 容器，锁定 body 滚动，让内容区自身滚动"),
        ("AI 看似在思考但用户无感知", "非流式返回导致等待过程像卡死", "接入 SSE 流式输出，加入思考状态、停止生成和禁用重复发送"),
        ("未连接 AI 仍返回分析", "降级 mock 容易误导真实经营判断", "模型不可用时直接展示失败原因，不伪造经营建议"),
        ("天气定位不准", "IP 定位受运营商出口影响，可能飘到异地", "提供手动城市搜索/选择，并接入和风天气真实天气接口"),
    ]
    y = 2.55
    for i, (p, reason, sol) in enumerate(rows):
        add_card(s, 1.0, y + i * 1.25, 30.7, 0.98)
        add_pill(s, f"问题 {i+1}", 1.35, y + i * 1.25 + 0.2, 2.2, 0.52, RED, size=9)
        add_text(s, p, 3.9, y + i * 1.25 + 0.18, 7.6, 0.5, 12, BROWN, True)
        add_text(s, reason, 11.9, y + i * 1.25 + 0.18, 8.2, 0.5, 11, MUTED)
        add_text(s, sol, 20.5, y + i * 1.25 + 0.18, 10.4, 0.5, 11, GREEN, True)

    # 9 Problems 2
    s = prs.slides.add_slide(blank)
    add_title(s, "项目中遇到的问题及解决方案（二）", "这部分是我在项目中最有价值的“工程排错记录”。", "问题解决")
    rows = [
        ("服务器显示旧页面/500 错误", "Nginx 路径、构建产物、缓存和项目目录混乱", "统一 /opt/projects 管理，区分正式版/测试版，检查 nginx、healthz 与日志"),
        ("二维码本地能扫，外网顾客打不开", "二维码指向 localhost 或局域网地址", "生成公网 IP/端口地址，并开放云服务器安全组端口"),
        ("Docker 化迁移出错", "端口冲突、中文路径导致 compose 项目名为空、依赖构建失败", "使用固定 compose project name、独立端口 18080、volume 保存数据库"),
        ("扫码订单统计不准", "取消订单仍进入销量/客户统计", "重新审核统计口径，只让有效订单进入分析模块"),
    ]
    y = 2.55
    for i, (p, reason, sol) in enumerate(rows):
        add_card(s, 1.0, y + i * 1.25, 30.7, 0.98)
        add_pill(s, f"问题 {i+5}", 1.35, y + i * 1.25 + 0.2, 2.2, 0.52, RED, size=9)
        add_text(s, p, 3.9, y + i * 1.25 + 0.18, 7.6, 0.5, 12, BROWN, True)
        add_text(s, reason, 11.9, y + i * 1.25 + 0.18, 8.2, 0.5, 11, MUTED)
        add_text(s, sol, 20.5, y + i * 1.25 + 0.18, 10.4, 0.5, 11, GREEN, True)

    # 10 Gains
    s = prs.slides.add_slide(blank)
    add_title(s, "项目完成后的收获", "重点对应答辩要求第 4 条：这次项目最大的价值，是从“写页面”走向“做可用系统”。", "项目收获")
    gains = [
        ("产品思维", ["学会围绕真实餐饮场景设计闭环：顾客下单、商户接单、数据沉淀、经营分析。", "意识到不能用虚假数据误导用户，经营系统必须强调可信口径。"]),
        ("前端能力", ["掌握 Vue3、Pinia、Vue Router 的多端页面组织。", "处理移动端弹层滚动、购物车动画、状态切换、响应式布局等体验细节。"]),
        ("后端能力", ["使用 Fastify + Prisma 设计业务接口和数据模型。", "完成注册登录、短信验证码、订单、客户、菜品、采购、评价、天气、AI 等接口。"]),
        ("部署运维", ["理解本地开发、服务器部署、Nginx、Docker Compose、端口、安全组和数据卷。", "学会通过 health check、日志、curl、浏览器报错定位问题。"]),
    ]
    for i, (name, bullets) in enumerate(gains):
        x = 1.0 + (i % 2) * 15.6
        y = 2.7 + (i // 2) * 2.3
        bullet_card(s, name, bullets, x, y, 14.3, 1.85, [ORANGE, GREEN, BROWN, BLUE][i])

    # 11 Tech architecture / deployment
    s = prs.slides.add_slide(blank)
    add_title(s, "技术架构与部署能力", "项目从前端页面扩展到后端接口、数据库、第三方服务和云端部署。", "技术实现")
    layers = [
        ("前端展示层", "PC 商户后台 / 手机商户端 / 顾客扫码点餐页\nVue3 + TypeScript + Pinia + Router"),
        ("业务接口层", "Fastify 路由、TypeBox 校验、统一 Envelope、错误处理\nSwagger 文档、CORS、Helmet、RateLimit"),
        ("数据持久层", "Prisma + SQLite 当前部署\nShop、User、Order、MenuItem、Customer、Review 等模型"),
        ("外部能力层", "Qwen 大模型流式问答、和风天气、阿里云短信/号码认证\n后续可替换 MySQL 与 HTTPS 域名"),
        ("云部署层", "Docker Compose、Nginx 静态资源与 API 代理\n腾讯云公网 IP、端口隔离、数据卷持久化"),
    ]
    for i, (name, desc) in enumerate(layers):
        add_card(s, 1.2 + i * 6.2, 2.65, 5.5, 3.7)
        add_pill(s, name, 1.6 + i * 6.2, 3.0, 4.7, 0.58, [ORANGE, GREEN, BROWN, BLUE, RED][i], size=10)
        add_text(s, desc, 1.55 + i * 6.2, 4.0, 4.8, 1.7, 10, MUTED, align=PP_ALIGN.CENTER)

    # 12 Demo route
    s = prs.slides.add_slide(blank)
    add_title(s, "项目演示路线", "录制讲解视频时，可按这条路线展示，逻辑最顺。", "项目演示")
    demo = [
        ("1 登录/注册", "展示账号认证、验证码注册、登录后进入经营后台"),
        ("2 经营驾驶舱", "查看利润、订单、天气建议和快捷入口"),
        ("3 扫码点餐", "打开桌码，进入顾客点餐页，加入购物车并提交订单"),
        ("4 商户接单", "订单进入队列，切换接单、制作中、已上桌、完成状态"),
        ("5 数据分析", "客户资产、菜品盈利、采购单、评价口碑跟随订单变化"),
        ("6 AI 与部署", "演示语音问答流式输出，说明服务器 Docker 测试版访问"),
    ]
    for i, (title, desc) in enumerate(demo):
        x = 1.0 + (i % 3) * 10.4
        y = 2.55 + (i // 3) * 2.35
        add_card(s, x, y, 9.4, 1.8)
        add_pill(s, title, x + 0.35, y + 0.28, 3.5, 0.55, ORANGE if i < 3 else GREEN, size=10)
        add_text(s, desc, x + 0.45, y + 1.0, 8.4, 0.55, 11, MUTED)
    add_text(s, "结束语：餐小助的目标不是替代老板，而是把重复统计交给系统，把经营判断还给人。", 1.0, 6.8, 30, 0.45, 14, BROWN, True, align=PP_ALIGN.CENTER)

    prs.save(OUT)


def write_notes():
    content = """# 餐小助项目答辩讲稿提纲

## 1. 开场
我做的项目叫“餐小助”，定位是中小餐饮商户的智能经营助手。它不是单纯的聊天机器人，而是围绕餐饮门店每天真实发生的订单、客户、菜品、采购和评价数据，帮助老板快速看清经营状况。

## 2. 展示重点
根据项目答辩要求，本次展示包含个人与项目介绍、重点模块和精彩代码、项目演示。但我会重点说明两部分：项目中遇到的问题及解决方案，以及项目完成后的收获。

## 3. 核心功能
系统包含 PC 商户后台、手机商户端和顾客扫码点餐页。顾客扫描桌码进入菜单，下单后订单会进入商户端队列，订单完成后数据会进入客户资产、菜品盈利、AI 日报、采购建议和评价口碑等分析模块。

## 4. 重点问题与解决方案
开发中遇到的问题主要包括：语音问答弹窗滚动错乱、AI 非流式返回导致用户误以为卡死、未连接模型时不能返回虚假分析、天气 IP 定位不准确、服务器显示旧页面、二维码使用 localhost 导致外网打不开、Docker 部署端口和路径冲突、取消订单被错误计入销量等。每个问题都通过定位原因、修改交互或数据口径、重新验证来解决。

## 5. 项目收获
这次项目让我从“会写页面”进一步走到“能交付系统”。我掌握了 Vue3 多端页面开发、Pinia 状态管理、Fastify 接口设计、Prisma 数据建模、短信验证码注册、AI 流式问答、真实天气接口、Docker Compose 部署和服务器排错。更重要的是，我理解了经营类系统必须保证数据真实，不能为了页面好看而误导用户。

## 6. 演示顺序
建议录屏时按：登录注册、经营驾驶舱、扫码点餐、商户接单、客户资产、菜品盈利、采购单、评价口碑、AI 问答、服务器部署访问的顺序展示。
"""
    NOTES.write_text(content, encoding="utf-8")


if __name__ == "__main__":
    make_deck()
    write_notes()
    print(OUT)
    print(NOTES)
