#!/usr/bin/env python3
"""
餐小助项目答辩PPT生成器 - 全新版本
重点突出第3、4条：问题与解决、收获与成长
"""
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from pptx.oxml.ns import nsmap
from pptx.oxml import parse_xml
import os

# 创建演示文稿
prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)

# 定义颜色方案
ORANGE = RGBColor(255, 107, 53)
GREEN = RGBColor(0, 200, 83)
RED = RGBColor(255, 61, 0)
BROWN = RGBColor(91, 54, 31)
BG = RGBColor(247, 248, 250)
CARD = RGBColor(255, 255, 255)
TEXT = RGBColor(26, 26, 26)
MUTED = RGBColor(102, 102, 102)
WHITE = RGBColor(255, 255, 255)

def add_bg(slide, color=BG):
    """添加背景色"""
    bg = slide.background
    fill = bg.fill
    fill.solid()
    fill.fore_color.rgb = color

def add_shape_bg(slide, color):
    """添加形状背景"""
    shape = slide.shapes.add_shape(
        MSO_SHAPE.RECTANGLE,
        0, 0,
        prs.slide_width,
        prs.slide_height
    )
    shape.fill.solid()
    shape.fill.fore_color.rgb = color
    shape.line.fill.background()

def add_text_box(slide, left, top, width, height, text, font_size=18, bold=False, color=TEXT, align=PP_ALIGN.LEFT):
    """添加文本框"""
    txBox = slide.shapes.add_textbox(left, top, width, height)
    tf = txBox.text_frame
    tf.text = text
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.font.size = Pt(font_size)
    p.font.bold = bold
    p.font.color.rgb = color
    p.alignment = align
    return txBox

def add_rounded_rect(slide, left, top, width, height, fill_color, line_color=None):
    """添加圆角矩形"""
    shape = slide.shapes.add_shape(
        MSO_SHAPE.ROUNDED_RECTANGLE,
        left, top, width, height
    )
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill_color
    if line_color:
        shape.line.color.rgb = line_color
        shape.line.width = Pt(1)
    else:
        shape.line.fill.background()
    return shape

def add_pill(slide, left, top, width, height, text, fill_color, font_size=11):
    """添加胶囊标签"""
    shape = slide.shapes.add_shape(
        MSO_SHAPE.ROUNDED_RECTANGLE,
        left, top, width, height
    )
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill_color
    shape.line.fill.background()
    
    tf = shape.text_frame
    tf.text = text
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.font.size = Pt(font_size)
    p.font.bold = True
    p.font.color.rgb = WHITE
    p.alignment = PP_ALIGN.CENTER
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    return shape

def add_multiline_text(slide, left, top, width, height, lines, font_size=12, color=MUTED):
    """添加多行文本"""
    txBox = slide.shapes.add_textbox(left, top, width, height)
    tf = txBox.text_frame
    tf.word_wrap = True
    
    for i, line in enumerate(lines):
        if i == 0:
            p = tf.paragraphs[0]
        else:
            p = tf.add_paragraph()
        p.text = f"• {line}"
        p.font.size = Pt(font_size)
        p.font.color.rgb = color
        p.space_after = Pt(6)
    return txBox

# ========== 第1页：封面 ==========
slide = prs.slides.add_slide(prs.slide_layouts[6])  # 空白布局
add_shape_bg(slide, RGBColor(255, 140, 90))

# 装饰圆形
circle1 = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(22), Inches(-2), Inches(12), Inches(8))
circle1.fill.solid()
circle1.fill.fore_color.rgb = RGBColor(255, 176, 136)
circle1.fill.fore_color.brightness = 0.3
circle1.line.fill.background()

circle2 = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(-2), Inches(13), Inches(10), Inches(6))
circle2.fill.solid()
circle2.fill.fore_color.rgb = RGBColor(168, 216, 160)
circle2.fill.fore_color.brightness = 0.35
circle2.line.fill.background()

# 技术栈标签
add_pill(slide, Inches(2.5), Inches(4.5), Inches(14), Inches(0.8), 
         "Vue3 + Fastify + Prisma + AI + Docker", GREEN, 11)

# 主标题
add_text_box(slide, Inches(2.5), Inches(6.5), Inches(28), Inches(2.5),
             "餐小助", 52, True, WHITE, PP_ALIGN.LEFT)

# 副标题
add_text_box(slide, Inches(2.5), Inches(9.5), Inches(28), Inches(1.2),
             "商户智能经营助手", 28, True, WHITE, PP_ALIGN.LEFT)

# 描述
add_text_box(slide, Inches(2.5), Inches(11.2), Inches(28), Inches(0.8),
             '项目答辩——从"会写页面"到"能交付系统"', 14, False, RGBColor(255, 208, 184), PP_ALIGN.LEFT)

# 分隔线
line = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(8), Inches(12.5), Inches(18), Inches(0.04))
line.fill.solid()
line.fill.fore_color.rgb = WHITE
line.line.fill.background()

# 页脚
add_text_box(slide, Inches(2.5), Inches(13), Inches(28), Inches(0.6),
             "答辩人：餐小助团队    2026年8月", 12, False, RGBColor(255, 208, 184), PP_ALIGN.LEFT)

# ========== 第2页：目录 ==========
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide, BG)

# 顶部装饰条
bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, Inches(0.12))
bar.fill.solid()
bar.fill.fore_color.rgb = ORANGE
bar.line.fill.background()

# 标题
add_text_box(slide, Inches(1.5), Inches(0.5), Inches(30), Inches(1.2),
             "答辩提纲", 28, True, TEXT, PP_ALIGN.LEFT)

# 副标题
add_text_box(slide, Inches(1.5), Inches(1.7), Inches(30), Inches(0.6),
             "五大章节，重点聚焦问题与收获", 12, False, MUTED, PP_ALIGN.LEFT)

# 分隔线
sep = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(1.5), Inches(2.3), Inches(3), Inches(0.04))
sep.fill.solid()
sep.fill.fore_color.rgb = ORANGE
sep.line.fill.background()

# 目录项
items = [
    ("01", "项目介绍", '中小餐饮的"数字店长"', ORANGE),
    ("02", "功能与技术", "八大模块 + 全栈架构", GREEN),
    ("03", "问题与解决", "开发中的技术挑战（重点）", RED),
    ("04", "收获与成长", "从技术栈到工程思维（重点）", BROWN),
    ("05", "成果展望", "量化成果与未来方向", GREEN),
]

for i, (num, title, desc, color) in enumerate(items):
    y = Inches(3.2 + i * 2.8)
    
    # 卡片背景
    card = add_rounded_rect(slide, Inches(1.5), y, Inches(30.5), Inches(2.2), CARD, RGBColor(224, 224, 224))
    
    # 编号圆形
    circle = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(2), y + Inches(0.3), Inches(1.6), Inches(1.6))
    circle.fill.solid()
    circle.fill.fore_color.rgb = color
    circle.line.fill.background()
    
    # 编号文字
    add_text_box(slide, Inches(2), y + Inches(0.3), Inches(1.6), Inches(1.6),
                 num, 20, True, WHITE, PP_ALIGN.CENTER)
    
    # 标题
    add_text_box(slide, Inches(4.2), y + Inches(0.2), Inches(8), Inches(0.8),
                 title, 18, True, TEXT, PP_ALIGN.LEFT)
    
    # 描述
    add_text_box(slide, Inches(4.2), y + Inches(1.1), Inches(25), Inches(0.6),
                 desc, 12, False, MUTED, PP_ALIGN.LEFT)

# ========== 第3页：项目定位 ==========
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide, BG)

bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, Inches(0.12))
bar.fill.solid()
bar.fill.fore_color.rgb = ORANGE
bar.line.fill.background()

add_text_box(slide, Inches(1.5), Inches(0.5), Inches(30), Inches(1.2),
             '项目定位：中小餐饮的"数字店长"', 28, True, TEXT, PP_ALIGN.LEFT)

add_text_box(slide, Inches(1.5), Inches(1.7), Inches(30), Inches(0.6),
             '中小餐饮平均寿命18个月，死因是"不会算账、不会管客、不会控损耗"', 12, False, MUTED, PP_ALIGN.LEFT)

sep = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(1.5), Inches(2.3), Inches(3), Inches(0.04))
sep.fill.solid()
sep.fill.fore_color.rgb = ORANGE
sep.line.fill.background()

# 四个卡片
cards = [
    ("痛点", RED, "核心痛点", ["中小餐饮平均寿命仅18个月", "不会算账、不会管客、不会控损耗", "多渠道数据孤岛，对账困难"]),
    ("方案", GREEN, "解决方案", ["AI经营助手，自动算账、管客、控损耗", "接入美团/饿了么/抖音等多渠道数据", "每日自动生成经营日报"]),
    ("价值", ORANGE, "量化价值", ["单店月均降本3000元", "单店月均增收5000元", "综合经营效率提升30%"]),
    ("形态", BROWN, "产品形态", ["PC商户后台：复杂配置与数据看板", "手机端商户页：移动查看关键数据", "顾客扫码点餐页：桌码进入点餐"]),
]

for i, (tag, tag_color, title, content) in enumerate(cards):
    col = i % 2
    row = i // 2
    x = Inches(1.5 + col * 15.75)
    y = Inches(2.8 + row * 8.25)
    
    card = add_rounded_rect(slide, x, y, Inches(15.25), Inches(7.75), CARD, RGBColor(224, 224, 224))
    
    # 标签
    add_pill(slide, x + Inches(0.3), y + Inches(0.3), Inches(2), Inches(0.6), tag, tag_color, 10)
    
    # 标题
    add_text_box(slide, x + Inches(0.3), y + Inches(1.1), Inches(14.65), Inches(0.6),
                 title, 15, True, TEXT, PP_ALIGN.LEFT)
    
    # 内容
    add_multiline_text(slide, x + Inches(0.3), y + Inches(1.8), Inches(14.65), Inches(5.5),
                       content, 11, MUTED)

# ========== 第4页：功能架构 ==========
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide, BG)

bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, Inches(0.12))
bar.fill.solid()
bar.fill.fore_color.rgb = ORANGE
bar.line.fill.background()

add_text_box(slide, Inches(1.5), Inches(0.5), Inches(30), Inches(1.2),
             "八大模块覆盖经营全链路", 28, True, TEXT, PP_ALIGN.LEFT)

add_text_box(slide, Inches(1.5), Inches(1.7), Inches(30), Inches(0.6),
             "围绕PRD的8大模块，当前项目已覆盖核心可演示链路", 12, False, MUTED, PP_ALIGN.LEFT)

sep = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(1.5), Inches(2.3), Inches(3), Inches(0.04))
sep.fill.solid()
sep.fill.fore_color.rgb = ORANGE
sep.line.fill.background()

modules = [
    ("核心", ORANGE, "AI经营驾驶舱", ["日报自动生成、多渠道对账", "异常预警、语音问答"]),
    ("核心", ORANGE, "客户资产管家", ["OneID打通、38个自动标签", "RFM分层、流失预警与召回"]),
    ("核心", ORANGE, "菜品盈利分析", ["四象限分类、购物篮分析", "成本波动监控"]),
    ("核心", ORANGE, "智能采购与库存", ["销量预测、智能采购单", "效期预警"]),
    ("扩展", GREEN, "智能定价与促销", ["动态定价、AI促销方案", "分层发券"]),
    ("扩展", GREEN, "员工/评价/系统", ["员工排班、评价口碑", "系统管理"]),
]

for i, (tag, tag_color, title, content) in enumerate(modules):
    col = i % 3
    row = i // 3
    x = Inches(1.5 + col * 10.5)
    y = Inches(2.8 + row * 8.25)
    
    card = add_rounded_rect(slide, x, y, Inches(10), Inches(7.75), CARD, RGBColor(224, 224, 224))
    
    add_pill(slide, x + Inches(0.3), y + Inches(0.3), Inches(2), Inches(0.6), tag, tag_color, 10)
    
    add_text_box(slide, x + Inches(0.3), y + Inches(1.1), Inches(9.4), Inches(0.6),
                 title, 15, True, TEXT, PP_ALIGN.LEFT)
    
    add_multiline_text(slide, x + Inches(0.3), y + Inches(1.8), Inches(9.4), Inches(5.5),
                       content, 11, MUTED)

# ========== 第5页：技术架构 ==========
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide, BG)

bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, Inches(0.12))
bar.fill.solid()
bar.fill.fore_color.rgb = ORANGE
bar.line.fill.background()

add_text_box(slide, Inches(1.5), Inches(0.5), Inches(30), Inches(1.2),
             "全栈技术架构", 28, True, TEXT, PP_ALIGN.LEFT)

add_text_box(slide, Inches(1.5), Inches(1.7), Inches(30), Inches(0.6),
             "前端三端 + 后端服务 + AI层 + 数据层 + 云部署", 12, False, MUTED, PP_ALIGN.LEFT)

sep = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(1.5), Inches(2.3), Inches(3), Inches(0.04))
sep.fill.solid()
sep.fill.fore_color.rgb = ORANGE
sep.line.fill.background()

tech_cards = [
    ("前端", GREEN, "前端展示层", ["Vue3 + Pinia + Vue Router + ECharts", "PC商户后台 + 手机商户端 + 顾客扫码页"]),
    ("后端", ORANGE, "业务接口层", ["Fastify 5 + Prisma 6 + TypeBox", "Swagger文档、CORS、Helmet、RateLimit"]),
    ("AI", BROWN, "AI能力层", ["DeepSeek-V3（推理）、通义千问-Max（BI）", "豆包-Pro（创意）、文心一言-4.0（NLP）"]),
    ("部署", RED, "云部署层", ["Docker Compose + Nginx", "腾讯云公网IP、数据卷持久化"]),
]

for i, (tag, tag_color, title, content) in enumerate(tech_cards):
    col = i % 2
    row = i // 2
    x = Inches(1.5 + col * 15.75)
    y = Inches(2.8 + row * 8.25)
    
    card = add_rounded_rect(slide, x, y, Inches(15.25), Inches(7.75), CARD, RGBColor(224, 224, 224))
    
    add_pill(slide, x + Inches(0.3), y + Inches(0.3), Inches(2), Inches(0.6), tag, tag_color, 10)
    
    add_text_box(slide, x + Inches(0.3), y + Inches(1.1), Inches(14.65), Inches(0.6),
                 title, 15, True, TEXT, PP_ALIGN.LEFT)
    
    add_multiline_text(slide, x + Inches(0.3), y + Inches(1.8), Inches(14.65), Inches(5.5),
                       content, 11, MUTED)

# ========== 第6页：过渡页 - 问题与解决 ==========
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_shape_bg(slide, RGBColor(91, 54, 31))

circle1 = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(22), Inches(-2), Inches(14), Inches(10))
circle1.fill.solid()
circle1.fill.fore_color.rgb = RGBColor(255, 140, 90)
circle1.fill.fore_color.brightness = 0.2
circle1.line.fill.background()

circle2 = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(-3), Inches(12), Inches(12), Inches(8))
circle2.fill.solid()
circle2.fill.fore_color.rgb = RGBColor(0, 200, 83)
circle2.fill.fore_color.brightness = 0.25
circle2.line.fill.background()

add_pill(slide, Inches(11), Inches(4.5), Inches(12), Inches(0.9), "CORE SECTION", ORANGE, 13)

add_text_box(slide, Inches(2), Inches(6.5), Inches(30), Inches(2.5),
             "遇到的问题及解决方案", 44, True, WHITE, PP_ALIGN.CENTER)

line = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(10), Inches(9.5), Inches(14), Inches(0.04))
line.fill.solid()
line.fill.fore_color.rgb = ORANGE
line.line.fill.background()

add_text_box(slide, Inches(2), Inches(10), Inches(30), Inches(1),
             "答辩要求第3条重点 · 真实开发不是一路顺风", 16, False, RGBColor(255, 208, 184), PP_ALIGN.CENTER)

# ========== 第7页：问题① - AI回复卡死 ==========
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide, BG)

bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, Inches(0.12))
bar.fill.solid()
bar.fill.fore_color.rgb = ORANGE
bar.line.fill.background()

add_text_box(slide, Inches(1.5), Inches(0.5), Inches(30), Inches(1.2),
             '问题①：AI回复"卡死"的假象', 28, True, TEXT, PP_ALIGN.LEFT)

add_text_box(slide, Inches(1.5), Inches(1.7), Inches(30), Inches(0.6),
             '用户体验优化：从"等待"到"观看"', 12, False, MUTED, PP_ALIGN.LEFT)

sep = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(1.5), Inches(2.3), Inches(3), Inches(0.04))
sep.fill.solid()
sep.fill.fore_color.rgb = ORANGE
sep.line.fill.background()

problem1_cards = [
    ("现象", RED, "问题现象", ["AI生成经营日报时，用户等待10秒以上无反馈", "用户误以为系统卡死，反复点击"]),
    ("原因", BROWN, "原因分析", ['非流式返回，用户看不到"思考中"的状态', "缺少进度反馈机制"]),
    ("解决", GREEN, "解决方案", ["采用SSE流式输出（Server-Sent Events）", "reply.hijack() + X-Accel-Buffering:no", "AbortController控制停止生成"]),
    ("效果", ORANGE, "最终效果", ["用户实时看到AI逐字生成", '体验从"等待"变为"观看"', "支持停止生成和禁用重复发送"]),
]

for i, (tag, tag_color, title, content) in enumerate(problem1_cards):
    col = i % 2
    row = i // 2
    x = Inches(1.5 + col * 15.75)
    y = Inches(2.8 + row * 8.25)
    
    card = add_rounded_rect(slide, x, y, Inches(15.25), Inches(7.75), CARD, RGBColor(224, 224, 224))
    
    add_pill(slide, x + Inches(0.3), y + Inches(0.3), Inches(2), Inches(0.6), tag, tag_color, 10)
    
    add_text_box(slide, x + Inches(0.3), y + Inches(1.1), Inches(14.65), Inches(0.6),
                 title, 15, True, TEXT, PP_ALIGN.LEFT)
    
    add_multiline_text(slide, x + Inches(0.3), y + Inches(1.8), Inches(14.65), Inches(5.5),
                       content, 11, MUTED)

# ========== 第8页：问题② - 数据真实性 ==========
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide, BG)

bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, Inches(0.12))
bar.fill.solid()
bar.fill.fore_color.rgb = ORANGE
bar.line.fill.background()

add_text_box(slide, Inches(1.5), Inches(0.5), Inches(30), Inches(1.2),
             '问题②：AI不能"编"数据', 28, True, TEXT, PP_ALIGN.LEFT)

add_text_box(slide, Inches(1.5), Inches(1.7), Inches(30), Inches(0.6),
             '经营系统的底线——绝不误导用户', 12, False, MUTED, PP_ALIGN.LEFT)

sep = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(1.5), Inches(2.3), Inches(3), Inches(0.04))
sep.fill.solid()
sep.fill.fore_color.rgb = ORANGE
sep.line.fill.background()

problem2_cards = [
    ("现象", RED, "问题现象", ["AI模型未连接时，可能生成虚假经营分析", "LLM幻觉：模型会自信地编造数据"]),
    ("原因", BROWN, "原因分析", ["降级mock容易误导真实经营判断", "没有数据源标记和校验机制"]),
    ("解决", GREEN, "解决方案", ["dataSource标记（real_orders | insufficient）", "只统计served/completed订单", "AI输出标注置信度"]),
    ("效果", ORANGE, "最终效果", ["模型不可用时直接展示失败原因", "不伪造经营建议", "经营系统的底线：绝不误导用户"]),
]

for i, (tag, tag_color, title, content) in enumerate(problem2_cards):
    col = i % 2
    row = i // 2
    x = Inches(1.5 + col * 15.75)
    y = Inches(2.8 + row * 8.25)
    
    card = add_rounded_rect(slide, x, y, Inches(15.25), Inches(7.75), CARD, RGBColor(224, 224, 224))
    
    add_pill(slide, x + Inches(0.3), y + Inches(0.3), Inches(2), Inches(0.6), tag, tag_color, 10)
    
    add_text_box(slide, x + Inches(0.3), y + Inches(1.1), Inches(14.65), Inches(0.6),
                 title, 15, True, TEXT, PP_ALIGN.LEFT)
    
    add_multiline_text(slide, x + Inches(0.3), y + Inches(1.8), Inches(14.65), Inches(5.5),
                       content, 11, MUTED)

# ========== 第9页：问题③ - 部署上线 ==========
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide, BG)

bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, Inches(0.12))
bar.fill.solid()
bar.fill.fore_color.rgb = ORANGE
bar.line.fill.background()

add_text_box(slide, Inches(1.5), Inches(0.5), Inches(30), Inches(1.2),
             "问题③：从开发到上线的最后一公里", 28, True, TEXT, PP_ALIGN.LEFT)

add_text_box(slide, Inches(1.5), Inches(1.7), Inches(30), Inches(0.6),
             "全链路交付能力和运维思维", 12, False, MUTED, PP_ALIGN.LEFT)

sep = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(1.5), Inches(2.3), Inches(3), Inches(0.04))
sep.fill.solid()
sep.fill.fore_color.rgb = ORANGE
sep.line.fill.background()

problem3_cards = [
    ("问题A", RED, "二维码外网访问", ["二维码使用localhost导致外网打不开", "解决：公网域名 + Nginx反向代理"]),
    ("问题B", RED, "服务器显示旧页面", ["Nginx缓存导致页面不更新", "解决：缓存清理 + Docker镜像版本化"]),
    ("问题C", RED, "Docker部署冲突", ["端口冲突、中文路径导致compose失败", "解决：固定project name、独立端口18080"]),
    ("问题D", RED, "订单统计不准", ["取消订单被错误计入销量", "解决：状态机白名单，只统计completed"]),
]

for i, (tag, tag_color, title, content) in enumerate(problem3_cards):
    col = i % 2
    row = i // 2
    x = Inches(1.5 + col * 15.75)
    y = Inches(2.8 + row * 8.25)
    
    card = add_rounded_rect(slide, x, y, Inches(15.25), Inches(7.75), CARD, RGBColor(224, 224, 224))
    
    add_pill(slide, x + Inches(0.3), y + Inches(0.3), Inches(2), Inches(0.6), tag, tag_color, 10)
    
    add_text_box(slide, x + Inches(0.3), y + Inches(1.1), Inches(14.65), Inches(0.6),
                 title, 15, True, TEXT, PP_ALIGN.LEFT)
    
    add_multiline_text(slide, x + Inches(0.3), y + Inches(1.8), Inches(14.65), Inches(5.5),
                       content, 11, MUTED)

# ========== 第10页：过渡页 - 收获与成长 ==========
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_shape_bg(slide, RGBColor(91, 54, 31))

circle1 = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(22), Inches(-2), Inches(14), Inches(10))
circle1.fill.solid()
circle1.fill.fore_color.rgb = RGBColor(255, 140, 90)
circle1.fill.fore_color.brightness = 0.2
circle1.line.fill.background()

circle2 = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(-3), Inches(12), Inches(12), Inches(8))
circle2.fill.solid()
circle2.fill.fore_color.rgb = RGBColor(0, 200, 83)
circle2.fill.fore_color.brightness = 0.25
circle2.line.fill.background()

add_pill(slide, Inches(11), Inches(4.5), Inches(12), Inches(0.9), "CORE SECTION", ORANGE, 13)

add_text_box(slide, Inches(2), Inches(6.5), Inches(30), Inches(2.5),
             "项目完成后的收获", 44, True, WHITE, PP_ALIGN.CENTER)

line = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(10), Inches(9.5), Inches(14), Inches(0.04))
line.fill.solid()
line.fill.fore_color.rgb = ORANGE
line.line.fill.background()

add_text_box(slide, Inches(2), Inches(10), Inches(30), Inches(1),
             '答辩要求第4条重点 · 从"写页面"到"做系统"', 16, False, RGBColor(255, 208, 184), PP_ALIGN.CENTER)

# ========== 第11页：技术收获 ==========
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide, BG)

bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, Inches(0.12))
bar.fill.solid()
bar.fill.fore_color.rgb = ORANGE
bar.line.fill.background()

add_text_box(slide, Inches(1.5), Inches(0.5), Inches(30), Inches(1.2),
             "从技术栈到工程思维", 28, True, TEXT, PP_ALIGN.LEFT)

add_text_box(slide, Inches(1.5), Inches(1.7), Inches(30), Inches(0.6),
             '这次项目最大的价值，是从"会写页面"走向"能交付系统"', 12, False, MUTED, PP_ALIGN.LEFT)

sep = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(1.5), Inches(2.3), Inches(3), Inches(0.04))
sep.fill.solid()
sep.fill.fore_color.rgb = ORANGE
sep.line.fill.background()

skill_cards = [
    ("前端", GREEN, "前端能力", ["Vue3多端页面开发", "Pinia状态管理、Vue Router路由", "移动端弹层滚动、响应式布局"]),
    ("后端", ORANGE, "后端能力", ["Fastify接口设计、Prisma数据建模", "注册登录、短信验证码、订单接口", "客户、菜品、采购、评价、天气接口"]),
    ("AI", BROWN, "AI工程化", ["SSE流式输出、多模型路由", "Prompt工程、Tool Schema设计", "置信度标注、可解释输出"]),
    ("运维", RED, "部署运维", ["Docker Compose三阶段构建", "Nginx反向代理、腾讯云服务器", "通过日志、curl定位问题"]),
]

for i, (tag, tag_color, title, content) in enumerate(skill_cards):
    col = i % 2
    row = i // 2
    x = Inches(1.5 + col * 15.75)
    y = Inches(2.8 + row * 8.25)
    
    card = add_rounded_rect(slide, x, y, Inches(15.25), Inches(7.75), CARD, RGBColor(224, 224, 224))
    
    add_pill(slide, x + Inches(0.3), y + Inches(0.3), Inches(2), Inches(0.6), tag, tag_color, 10)
    
    add_text_box(slide, x + Inches(0.3), y + Inches(1.1), Inches(14.65), Inches(0.6),
                 title, 15, True, TEXT, PP_ALIGN.LEFT)
    
    add_multiline_text(slide, x + Inches(0.3), y + Inches(1.8), Inches(14.65), Inches(5.5),
                       content, 11, MUTED)

# ========== 第12页：工程思维收获 ==========
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide, BG)

bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, Inches(0.12))
bar.fill.solid()
bar.fill.fore_color.rgb = ORANGE
bar.line.fill.background()

add_text_box(slide, Inches(1.5), Inches(0.5), Inches(30), Inches(1.2),
             "工程思维的转变", 28, True, TEXT, PP_ALIGN.LEFT)

add_text_box(slide, Inches(1.5), Inches(1.7), Inches(30), Inches(0.6),
             "从功能实现到系统交付的全局视角", 12, False, MUTED, PP_ALIGN.LEFT)

sep = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(1.5), Inches(2.3), Inches(3), Inches(0.04))
sep.fill.solid()
sep.fill.fore_color.rgb = ORANGE
sep.line.fill.background()

mindset_cards = [
    ("思维1", ORANGE, "数据真实性优先", ["不为页面好看而伪造数据", "dataSource标记、状态机白名单", "经营系统的底线思维"]),
    ("思维2", GREEN, "用户体验闭环", ["从'能用'到'好用'", "SSE流式输出、进度反馈", "异常提示、错误处理"]),
    ("思维3", BROWN, "全链路交付", ["从本地开发到云端部署", "Docker容器化、Nginx配置", "域名、HTTPS、缓存管理"]),
    ("思维4", RED, "可维护性", ["代码结构清晰、模块解耦", "TypeBox类型安全、Prisma ORM", "日志记录、问题定位能力"]),
]

for i, (tag, tag_color, title, content) in enumerate(mindset_cards):
    col = i % 2
    row = i // 2
    x = Inches(1.5 + col * 15.75)
    y = Inches(2.8 + row * 8.25)
    
    card = add_rounded_rect(slide, x, y, Inches(15.25), Inches(7.75), CARD, RGBColor(224, 224, 224))
    
    add_pill(slide, x + Inches(0.3), y + Inches(0.3), Inches(2), Inches(0.6), tag, tag_color, 10)
    
    add_text_box(slide, x + Inches(0.3), y + Inches(1.1), Inches(14.65), Inches(0.6),
                 title, 15, True, TEXT, PP_ALIGN.LEFT)
    
    add_multiline_text(slide, x + Inches(0.3), y + Inches(1.8), Inches(14.65), Inches(5.5),
                       content, 11, MUTED)

# ========== 第13页：成果展示 ==========
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide, BG)

bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, Inches(0.12))
bar.fill.solid()
bar.fill.fore_color.rgb = ORANGE
bar.line.fill.background()

add_text_box(slide, Inches(1.5), Inches(0.5), Inches(30), Inches(1.2),
             "成果展示", 28, True, TEXT, PP_ALIGN.LEFT)

add_text_box(slide, Inches(1.5), Inches(1.7), Inches(30), Inches(0.6),
             "核心功能演示与量化指标", 12, False, MUTED, PP_ALIGN.LEFT)

sep = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(1.5), Inches(2.3), Inches(3), Inches(0.04))
sep.fill.solid()
sep.fill.fore_color.rgb = ORANGE
sep.line.fill.background()

result_cards = [
    ("已完成", GREEN, "系统交付", ["三端系统：PC后台 + 手机 + 顾客扫码", "8大模块、AI日报、客户OneID", "菜品四象限、智能采购、Docker部署"]),
    ("量化", ORANGE, "量化目标", ["每日节省对账时间1.5小时", "损耗率从12%降至5%", "复购率提升20%"]),
    ("演示", BROWN, "演示截图位", ["[此处插入系统截图]", "经营驾驶舱、客户详情页", "采购单确认页、AI问答界面"]),
]

for i, (tag, tag_color, title, content) in enumerate(result_cards):
    col = i % 3
    x = Inches(1.5 + col * 10.5)
    y = Inches(2.8)
    
    card = add_rounded_rect(slide, x, y, Inches(10), Inches(13.5), CARD, RGBColor(224, 224, 224))
    
    add_pill(slide, x + Inches(0.3), y + Inches(0.3), Inches(2), Inches(0.6), tag, tag_color, 10)
    
    add_text_box(slide, x + Inches(0.3), y + Inches(1.1), Inches(9.4), Inches(0.6),
                 title, 15, True, TEXT, PP_ALIGN.LEFT)
    
    add_multiline_text(slide, x + Inches(0.3), y + Inches(1.8), Inches(9.4), Inches(11),
                       content, 11, MUTED)

# ========== 第14页：未来展望 ==========
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide, BG)

bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, Inches(0.12))
bar.fill.solid()
bar.fill.fore_color.rgb = ORANGE
bar.line.fill.background()

add_text_box(slide, Inches(1.5), Inches(0.5), Inches(30), Inches(1.2),
             "未来展望", 28, True, TEXT, PP_ALIGN.LEFT)

add_text_box(slide, Inches(1.5), Inches(1.7), Inches(30), Inches(0.6),
             "持续迭代与扩展方向", 12, False, MUTED, PP_ALIGN.LEFT)

sep = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(1.5), Inches(2.3), Inches(3), Inches(0.04))
sep.fill.solid()
sep.fill.fore_color.rgb = ORANGE
sep.line.fill.background()

future_cards = [
    ("短期", ORANGE, "功能完善", ["MySQL替换SQLite", "HTTPS域名配置", "更多AI模型接入"]),
    ("中期", GREEN, "业务扩展", ["连锁多店看板", "供应链比价", "AI外呼召回"]),
    ("长期", BROWN, "行业深耕", ["行业垂直方案", "数据中台建设", "SaaS化服务"]),
]

for i, (tag, tag_color, title, content) in enumerate(future_cards):
    col = i % 3
    x = Inches(1.5 + col * 10.5)
    y = Inches(2.8)
    
    card = add_rounded_rect(slide, x, y, Inches(10), Inches(13.5), CARD, RGBColor(224, 224, 224))
    
    add_pill(slide, x + Inches(0.3), y + Inches(0.3), Inches(2), Inches(0.6), tag, tag_color, 10)
    
    add_text_box(slide, x + Inches(0.3), y + Inches(1.1), Inches(9.4), Inches(0.6),
                 title, 15, True, TEXT, PP_ALIGN.LEFT)
    
    add_multiline_text(slide, x + Inches(0.3), y + Inches(1.8), Inches(9.4), Inches(11),
                       content, 11, MUTED)

# ========== 第15页：致谢 ==========
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_shape_bg(slide, RGBColor(255, 140, 90))

circle1 = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(20), Inches(-2), Inches(15), Inches(10))
circle1.fill.solid()
circle1.fill.fore_color.rgb = RGBColor(255, 176, 136)
circle1.fill.fore_color.brightness = 0.25
circle1.line.fill.background()

circle2 = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(-2), Inches(12), Inches(12), Inches(8))
circle2.fill.solid()
circle2.fill.fore_color.rgb = RGBColor(168, 216, 160)
circle2.fill.fore_color.brightness = 0.3
circle2.line.fill.background()

add_text_box(slide, Inches(2), Inches(6), Inches(30), Inches(3),
             "感谢聆听", 56, True, WHITE, PP_ALIGN.CENTER)

line = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(10), Inches(10), Inches(14), Inches(0.04))
line.fill.solid()
line.fill.fore_color.rgb = WHITE
line.line.fill.background()

add_text_box(slide, Inches(2), Inches(11), Inches(30), Inches(1.5),
             "餐小助 · 让AI帮你盯店，你只管做好菜", 20, False, RGBColor(255, 224, 208), PP_ALIGN.CENTER)

# 保存文件
output_path = r"D:\餐小助\餐小助_项目答辩PPT_完整版.pptx"
prs.save(output_path)
print(f"✓ PPT已生成：{output_path}")
print(f"✓ 共{len(prs.slides)}页")
print("✓ 重点内容：第6-9页（问题与解决）、第10-12页（收获与成长）")
