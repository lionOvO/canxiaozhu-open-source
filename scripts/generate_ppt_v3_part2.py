#!/usr/bin/env python3
"""
餐小助项目答辩PPT生成脚本 V3 - Part 2
继续生成第16-36页
"""

from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE

# ============== 色彩体系 ==============
PRIMARY = RGBColor(0xFF, 0x6B, 0x35)
SECONDARY = RGBColor(0x00, 0xC8, 0x53)
WARNING = RGBColor(0xFF, 0x3D, 0x00)
BG = RGBColor(0xF7, 0xF8, 0xFA)
CARD = RGBColor(0xFF, 0xFF, 0xFF)
TEXT = RGBColor(0x1A, 0x1A, 0x1A)
MUTED = RGBColor(0x66, 0x66, 0x66)
BROWN = RGBColor(0x5B, 0x36, 0x1F)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
LIGHT_ORANGE = RGBColor(0xFF, 0xE8, 0xDE)
LIGHT_GREEN = RGBColor(0xE0, 0xF7, 0xE9)
LIGHT_RED = RGBColor(0xFF, 0xE0, 0xD6)

SLIDE_WIDTH = Inches(13.333)
SLIDE_HEIGHT = Inches(7.5)
LEFT_MARGIN = Inches(0.6)

# ============== 辅助函数 ==============
def add_background(slide, color):
    background = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), SLIDE_WIDTH, SLIDE_HEIGHT)
    background.fill.solid()
    background.fill.fore_color.rgb = color
    background.line.fill.background()
    spTree = slide.shapes._spTree
    sp = background._element
    spTree.remove(sp)
    spTree.insert(2, sp)

def add_title_text(slide, text, left, top, width, height, font_size=32, bold=True, color=TEXT, align=PP_ALIGN.LEFT):
    txBox = slide.shapes.add_textbox(left, top, width, height)
    tf = txBox.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = text
    p.font.size = Pt(font_size)
    p.font.bold = bold
    p.font.color.rgb = color
    p.font.name = "Microsoft YaHei"
    p.alignment = align
    return txBox

def add_body_text(slide, text, left, top, width, height, font_size=14, color=TEXT, align=PP_ALIGN.LEFT, bold=False):
    txBox = slide.shapes.add_textbox(left, top, width, height)
    tf = txBox.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = text
    p.font.size = Pt(font_size)
    p.font.bold = bold
    p.font.color.rgb = color
    p.font.name = "Microsoft YaHei"
    p.alignment = align
    return txBox

def add_multiline_text(slide, lines, left, top, width, height, font_size=13, color=TEXT, line_spacing=1.5, bold=False):
    txBox = slide.shapes.add_textbox(left, top, width, height)
    tf = txBox.text_frame
    tf.word_wrap = True
    for i, line in enumerate(lines):
        if i == 0:
            p = tf.paragraphs[0]
        else:
            p = tf.add_paragraph()
        p.text = line
        p.font.size = Pt(font_size)
        p.font.color.rgb = color
        p.font.name = "Microsoft YaHei"
        p.font.bold = bold
        p.space_after = Pt(font_size * (line_spacing - 1))
    return txBox

def add_card(slide, left, top, width, height, fill_color=CARD, line_color=RGBColor(0xE6,0xE6,0xE6)):
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill_color
    shape.line.color.rgb = line_color
    shape.line.width = Pt(1)
    shape.adjustments[0] = 0.08
    return shape

def add_badge(slide, text, left, top, width, height, bg_color, text_color=WHITE, font_size=11):
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = bg_color
    shape.line.fill.background()
    shape.adjustments[0] = 0.5
    tf = shape.text_frame
    tf.word_wrap = False
    p = tf.paragraphs[0]
    p.text = text
    p.font.size = Pt(font_size)
    p.font.color.rgb = text_color
    p.font.name = "Microsoft YaHei"
    p.font.bold = True
    p.alignment = PP_ALIGN.CENTER
    tf.paragraphs[0].space_before = Pt(2)
    return shape

def add_code_block(slide, code_lines, left, top, width, height):
    bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, width, height)
    bg.fill.solid()
    bg.fill.fore_color.rgb = RGBColor(0x2D, 0x2D, 0x2D)
    bg.line.fill.background()
    txBox = slide.shapes.add_textbox(left + Inches(0.15), top + Inches(0.1), width - Inches(0.3), height - Inches(0.2))
    tf = txBox.text_frame
    tf.word_wrap = True
    for i, line in enumerate(code_lines):
        if i == 0:
            p = tf.paragraphs[0]
        else:
            p = tf.add_paragraph()
        p.text = line
        p.font.size = Pt(9)
        p.font.color.rgb = RGBColor(0xE0, 0xE0, 0xE0)
        p.font.name = "Consolas"
        p.space_after = Pt(2)
    return bg

def add_divider(slide, left, top, width, color, thickness=2):
    line = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, width, Pt(thickness))
    line.fill.solid()
    line.fill.fore_color.rgb = color
    line.line.fill.background()

def add_icon_circle(slide, left, top, size, color, text="", text_color=WHITE, font_size=18):
    circle = slide.shapes.add_shape(MSO_SHAPE.OVAL, left, top, size, size)
    circle.fill.solid()
    circle.fill.fore_color.rgb = color
    circle.line.fill.background()
    if text:
        tf = circle.text_frame
        p = tf.paragraphs[0]
        p.text = text
        p.font.size = Pt(font_size)
        p.font.color.rgb = text_color
        p.font.name = "Microsoft YaHei"
        p.font.bold = True
        p.alignment = PP_ALIGN.CENTER
    return circle

def make_transition_slide(prs, part_num, title, subtitle, color=BROWN):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_background(slide, color)
    add_badge(slide, f"PART {part_num}", Inches(1), Inches(2.3), Inches(1.3), Inches(0.4),
              bg_color=WHITE, text_color=color, font_size=12)
    add_title_text(slide, title, Inches(1), Inches(2.9), Inches(11.333), Inches(0.8),
                   font_size=40, bold=True, color=WHITE)
    add_body_text(slide, subtitle, Inches(1), Inches(3.7), Inches(11.333), Inches(0.5),
                  font_size=18, color=WHITE)
    add_divider(slide, Inches(1), Inches(4.3), Inches(2), WHITE, 3)
    return slide

def make_ending_slide(prs, title, subtitle):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_background(slide, PRIMARY)
    add_title_text(slide, title, Inches(1), Inches(2.8), Inches(11.333), Inches(1),
                   font_size=48, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
    add_body_text(slide, subtitle, Inches(1), Inches(4), Inches(11.333), Inches(0.5),
                  font_size=20, color=WHITE, align=PP_ALIGN.CENTER)
    add_divider(slide, Inches(4.5), Inches(4.8), Inches(4.333), WHITE, 2)
    return slide

# ============== 加载已有PPT ==============
INPUT_FILE = "D:\\餐小助\\餐小助_项目答辩PPT_完整版_V3_生成中.pptx"
OUTPUT_FILE = "D:\\餐小助\\餐小助_项目答辩PPT_完整版_V3.pptx"

prs = Presentation(INPUT_FILE)
print(f"已加载PPT，当前页数: {len(prs.slides)}")

# ============== Page 16: PART 3 过渡页（警示红） ==============
make_transition_slide(prs, "3", "问题与解决", "答辩要求第3条 —— 项目中遇到的问题及解决方案", WARNING)
print("Page 16 过渡页 - 完成")

# ============== Page 17: 问题总览 ==============
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_background(slide, BG)
bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(0.15), SLIDE_HEIGHT)
bar.fill.solid()
bar.fill.fore_color.rgb = WARNING
bar.line.fill.background()
add_title_text(slide, "十个真实技术挑战，从开发到上线", LEFT_MARGIN, Inches(0.4), Inches(12), Inches(0.6),
               font_size=26, bold=True, color=TEXT)
add_divider(slide, LEFT_MARGIN, Inches(0.95), Inches(3), WARNING, 3)

problems = [
    ("1", "AI交互", "AI回复\"卡死\"假象", "SSE流式输出", PRIMARY),
    ("2", "数据安全", "AI\"编造\"虚假分析", "数据源标记+置信度", WARNING),
    ("3", "部署访问", "二维码localhost外网打不开", "公网域名+Nginx反向代理", SECONDARY),
    ("4", "缓存管理", "服务器显示旧页面", "Nginx缓存清理+版本化管理", RGBColor(0x21,0x96,0xF3)),
    ("5", "容器编排", "Docker端口和路径冲突", "标准化docker-compose配置", RGBColor(0x9C,0x27,0xB0)),
    ("6", "数据口径", "取消订单被错误计入销量", "订单状态机白名单校验", RGBColor(0xFF,0x98,0x00)),
    ("7", "语音识别", "语音问答弹窗滚动错乱", "自定义滚动管理", PRIMARY),
    ("8", "定位服务", "天气IP定位不准确", "多源定位+手动修正", SECONDARY),
    ("9", "性能优化", "AI非流式返回导致超时", "AbortController超时控制", RGBColor(0x21,0x96,0xF3)),
    ("10", "模型兼容", "不同模型输出格式不一致", "多模型路由+统一封装", RGBColor(0x9C,0x27,0xB0)),
]
for i, (num, area, problem, solution, color) in enumerate(problems):
    row = i // 2
    col = i % 2
    left = Inches(0.6 + col * 6.2)
    top = Inches(1.3 + row * 1.15)
    pcard = add_card(slide, left, top, Inches(5.9), Inches(1.0), fill_color=CARD)
    # 编号
    add_icon_circle(slide, left + Inches(0.1), top + Inches(0.15), Inches(0.35), color, num, WHITE, 11)
    # 领域
    add_badge(slide, area, left + Inches(0.55), top + Inches(0.15), Inches(1.1), Inches(0.22),
              bg_color=color, text_color=WHITE, font_size=9)
    # 问题
    add_body_text(slide, problem, left + Inches(1.7), top + Inches(0.12), Inches(2.8), Inches(0.25),
                  font_size=11, color=TEXT, bold=True)
    # 解决
    add_body_text(slide, f"→ {solution}", left + Inches(1.7), top + Inches(0.38), Inches(3.5), Inches(0.25),
                  font_size=10, color=MUTED)
    # 前6个高亮
    if i < 6:
        hl = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left - Inches(0.05), top - Inches(0.05), Inches(6), Inches(1.1))
        hl.fill.solid()
        hl.fill.fore_color.rgb = LIGHT_RED
        hl.line.fill.background()
        hl.adjustments[0] = 0.1
        spTree = slide.shapes._spTree
        sp = hl._element
        spTree.remove(sp)
        spTree.insert(2, sp)
print("Page 17 问题总览 - 完成")

# ============== Page 18: 问题① AI流式输出（详细展开） ==============
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_background(slide, BG)
bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(0.15), SLIDE_HEIGHT)
bar.fill.solid()
bar.fill.fore_color.rgb = WARNING
bar.line.fill.background()
add_title_text(slide, "问题① —— AI回复\"卡死\"的假象", LEFT_MARGIN, Inches(0.4), Inches(12), Inches(0.6),
               font_size=26, bold=True, color=TEXT)
add_divider(slide, LEFT_MARGIN, Inches(0.95), Inches(2.5), WARNING, 3)

# 现象
add_badge(slide, "现象", LEFT_MARGIN, Inches(1.2), Inches(0.8), Inches(0.25),
          bg_color=WARNING, text_color=WHITE, font_size=10)
add_body_text(slide, "AI生成经营日报时，用户等待10秒以上无反馈，误以为系统卡死，直接关闭页面",
              LEFT_MARGIN + Inches(1.0), Inches(1.15), Inches(10), Inches(0.3),
              font_size=12, color=TEXT)

# 原因
add_badge(slide, "原因", LEFT_MARGIN, Inches(1.6), Inches(0.8), Inches(0.25),
          bg_color=RGBColor(0xFF,0x98,0x00), text_color=WHITE, font_size=10)
add_body_text(slide, "非流式返回，AI生成完整内容后才一次性返回；用户没有任何进度反馈",
              LEFT_MARGIN + Inches(1.0), Inches(1.55), Inches(10), Inches(0.3),
              font_size=12, color=TEXT)

# 解决
add_badge(slide, "解决", LEFT_MARGIN, Inches(2.0), Inches(0.8), Inches(0.25),
          bg_color=SECONDARY, text_color=WHITE, font_size=10)
add_body_text(slide, "采用SSE流式输出（Server-Sent Events）：reply.hijack() + X-Accel-Buffering:no + AbortController",
              LEFT_MARGIN + Inches(1.0), Inches(1.95), Inches(10), Inches(0.3),
              font_size=12, color=TEXT)

# 前后对比
before = add_card(slide, LEFT_MARGIN, Inches(2.5), Inches(5.8), Inches(1.8), fill_color=LIGHT_RED)
add_title_text(slide, "❌ 改造前", LEFT_MARGIN + Inches(0.2), Inches(2.6), Inches(5), Inches(0.3),
               font_size=14, bold=True, color=WARNING)
add_multiline_text(slide, [
    "请求 → 等待10秒 → 一次性返回全文",
    "用户感知：系统卡死了",
    "页面关闭率：极高"
], LEFT_MARGIN + Inches(0.2), Inches(2.9), Inches(5.4), Inches(1.2),
   font_size=12, color=TEXT, line_spacing=1.4)

after = add_card(slide, Inches(6.7), Inches(2.5), Inches(5.8), Inches(1.8), fill_color=LIGHT_GREEN)
add_title_text(slide, "✅ 改造后", Inches(6.9), Inches(2.6), Inches(5), Inches(0.3),
               font_size=14, bold=True, color=SECONDARY)
add_multiline_text(slide, [
    "请求 → 首字<500ms → 实时逐字推送",
    "用户感知：AI正在思考",
    "页面关闭率：下降80%"
], Inches(6.9), Inches(2.9), Inches(5.4), Inches(1.2),
   font_size=12, color=TEXT, line_spacing=1.4)

# 关键技术
add_title_text(slide, "关键技术", LEFT_MARGIN, Inches(4.5), Inches(12), Inches(0.3),
               font_size=14, bold=True, color=TEXT)
keys = [
    ("reply.hijack()", "劫持Fastify响应流，绕过默认序列化", PRIMARY),
    ("X-Accel-Buffering: no", "禁用Nginx缓冲，确保实时推送", RGBColor(0x21,0x96,0xF3)),
    ("AbortController", "支持用户随时中断生成", SECONDARY),
]
for i, (key, desc, color) in enumerate(keys):
    left = Inches(0.6 + i * 4.1)
    top = Inches(4.9)
    kcard = add_card(slide, left, top, Inches(3.8), Inches(1.3), fill_color=CARD)
    add_title_text(slide, key, left + Inches(0.15), top + Inches(0.1), Inches(3.5), Inches(0.3),
                   font_size=13, bold=True, color=color)
    add_body_text(slide, desc, left + Inches(0.15), top + Inches(0.4), Inches(3.5), Inches(0.8),
                  font_size=11, color=TEXT)
print("Page 18 问题① - 完成")

# ============== Page 19: 问题② 数据真实性 ==============
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_background(slide, BG)
bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(0.15), SLIDE_HEIGHT)
bar.fill.solid()
bar.fill.fore_color.rgb = WARNING
bar.line.fill.background()
add_title_text(slide, "问题② —— AI不能\"编\"数据", LEFT_MARGIN, Inches(0.4), Inches(12), Inches(0.6),
               font_size=26, bold=True, color=TEXT)
add_divider(slide, LEFT_MARGIN, Inches(0.95), Inches(2.5), WARNING, 3)

add_badge(slide, "现象", LEFT_MARGIN, Inches(1.2), Inches(0.8), Inches(0.25),
          bg_color=WARNING, text_color=WHITE, font_size=10)
add_body_text(slide, "AI模型未连接或数据不足时，仍生成看似合理的经营分析——\"昨日营收5000元\"但系统根本没有昨日订单",
              LEFT_MARGIN + Inches(1.0), Inches(1.15), Inches(10), Inches(0.3),
              font_size=12, color=TEXT)

add_badge(slide, "原因", LEFT_MARGIN, Inches(1.6), Inches(0.8), Inches(0.25),
          bg_color=RGBColor(0xFF,0x98,0x00), text_color=WHITE, font_size=10)
add_body_text(slide, "LLM幻觉：模型会自信地编造数据和结论；经营系统一旦误导用户，可能导致错误采购、错误定价",
              LEFT_MARGIN + Inches(1.0), Inches(1.55), Inches(10), Inches(0.3),
              font_size=12, color=TEXT)

add_badge(slide, "解决", LEFT_MARGIN, Inches(2.0), Inches(0.8), Inches(0.25),
          bg_color=SECONDARY, text_color=WHITE, font_size=10)
add_body_text(slide, "三层防护体系，确保数据真实性",
              LEFT_MARGIN + Inches(1.0), Inches(1.95), Inches(10), Inches(0.3),
              font_size=12, color=TEXT)

# 三层防护卡片
shields = [
    ("① 数据源标记", "dataSource: 'real_orders' | 'insufficient'", "系统明确知道数据是否足够", PRIMARY),
    ("② 统计口径白名单", "只统计 served / completed 订单", "取消、未支付订单不进入分析", RGBColor(0x21,0x96,0xF3)),
    ("③ AI输出标注置信度", "每条洞察标注\"高/中/低\"", "用户知道该信多少", SECONDARY),
]
for i, (title, subtitle, desc, color) in enumerate(shields):
    left = Inches(0.6 + i * 4.1)
    top = Inches(2.5)
    scard = add_card(slide, left, top, Inches(3.8), Inches(2), fill_color=CARD)
    cbar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, Inches(3.8), Inches(0.08))
    cbar.fill.solid()
    cbar.fill.fore_color.rgb = color
    cbar.line.fill.background()
    add_title_text(slide, title, left + Inches(0.15), top + Inches(0.15), Inches(3.5), Inches(0.3),
                   font_size=13, bold=True, color=color)
    add_body_text(slide, subtitle, left + Inches(0.15), top + Inches(0.45), Inches(3.5), Inches(0.25),
                  font_size=11, color=TEXT, bold=True)
    add_body_text(slide, desc, left + Inches(0.15), top + Inches(0.7), Inches(3.5), Inches(1),
                  font_size=10, color=MUTED)

# 核心认知
banner = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, LEFT_MARGIN, Inches(4.8), Inches(12), Inches(0.8))
banner.fill.solid()
banner.fill.fore_color.rgb = WARNING
banner.line.fill.background()
banner.adjustments[0] = 0.1
add_title_text(slide, "💡 核心认知：经营类系统的数据真实性是底线，不能为了页面好看而误导用户",
               LEFT_MARGIN, Inches(4.95), Inches(12), Inches(0.5),
               font_size=15, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
print("Page 19 问题② - 完成")

# ============== Page 20: 问题③ 多端部署 ==============
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_background(slide, BG)
bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(0.15), SLIDE_HEIGHT)
bar.fill.solid()
bar.fill.fore_color.rgb = WARNING
bar.line.fill.background()
add_title_text(slide, "问题③ —— 从开发到上线的最后一公里", LEFT_MARGIN, Inches(0.4), Inches(12), Inches(0.6),
               font_size=26, bold=True, color=TEXT)
add_divider(slide, LEFT_MARGIN, Inches(0.95), Inches(3.5), WARNING, 3)

deploy_problems = [
    ("A", "二维码localhost", "外网打不开", "公网域名+Nginx反向代理", PRIMARY),
    ("B", "服务器显示旧页面", "缓存未清理", "Nginx expires -1 + Docker版本化管理", RGBColor(0x21,0x96,0xF3)),
    ("C", "Docker端口冲突", "本地与生产冲突", "标准化docker-compose配置", SECONDARY),
    ("D", "取消订单计入销量", "统计查询未过滤状态", "订单状态机白名单校验", RGBColor(0x9C,0x27,0xB0)),
]
for i, (label, title, problem, solution, color) in enumerate(deploy_problems):
    row = i // 2
    col = i % 2
    left = Inches(0.6 + col * 6.2)
    top = Inches(1.3 + row * 2.6)
    dcard = add_card(slide, left, top, Inches(5.9), Inches(2.3), fill_color=CARD)
    cbar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, Inches(5.9), Inches(0.08))
    cbar.fill.solid()
    cbar.fill.fore_color.rgb = color
    cbar.line.fill.background()
    add_badge(slide, f"问题{label}", left + Inches(0.15), top + Inches(0.15), Inches(0.9), Inches(0.25),
              bg_color=color, text_color=WHITE, font_size=10)
    add_title_text(slide, title, left + Inches(1.15), top + Inches(0.12), Inches(4.5), Inches(0.3),
                   font_size=14, bold=True, color=TEXT)
    add_body_text(slide, f"现象：{problem}", left + Inches(0.15), top + Inches(0.5), Inches(5.6), Inches(0.25),
                  font_size=11, color=WARNING)
    add_body_text(slide, f"解决：{solution}", left + Inches(0.15), top + Inches(0.8), Inches(5.6), Inches(0.25),
                  font_size=11, color=SECONDARY, bold=True)
print("Page 20 问题③ - 完成")

# ============== Page 21: 问题④ 语音与定位 ==============
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_background(slide, BG)
bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(0.15), SLIDE_HEIGHT)
bar.fill.solid()
bar.fill.fore_color.rgb = WARNING
bar.line.fill.background()
add_title_text(slide, "问题④ —— 语音问答弹窗与天气定位", LEFT_MARGIN, Inches(0.4), Inches(12), Inches(0.6),
               font_size=26, bold=True, color=TEXT)
add_divider(slide, LEFT_MARGIN, Inches(0.95), Inches(3), WARNING, 3)

# 左卡片
card1 = add_card(slide, LEFT_MARGIN, Inches(1.2), Inches(6), Inches(2.8), fill_color=CARD)
cbar1 = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, LEFT_MARGIN, Inches(1.2), Inches(6), Inches(0.08))
cbar1.fill.solid()
cbar1.fill.fore_color.rgb = PRIMARY
cbar1.line.fill.background()
add_title_text(slide, "语音问答弹窗滚动错乱", LEFT_MARGIN + Inches(0.2), Inches(1.35), Inches(5.6), Inches(0.3),
               font_size=15, bold=True, color=PRIMARY)
add_body_text(slide, "现象：弹窗弹出后，底层页面仍可滚动，导致布局错乱",
              LEFT_MARGIN + Inches(0.2), Inches(1.7), Inches(5.6), Inches(0.25),
              font_size=11, color=WARNING)
add_body_text(slide, "解决：自定义滚动管理，弹窗打开时锁定body滚动",
              LEFT_MARGIN + Inches(0.2), Inches(2.0), Inches(5.6), Inches(0.25),
              font_size=11, color=SECONDARY, bold=True)

code_scroll = [
    "function lockScroll() {",
    "  document.body.style.overflow = 'hidden';",
    "  document.body.style.position = 'fixed';",
    "  document.body.style.width = '100%';",
    "}",
]
add_code_block(slide, code_scroll, LEFT_MARGIN + Inches(0.2), Inches(2.4), Inches(5.6), Inches(1.3))

# 右卡片
card2 = add_card(slide, Inches(6.7), Inches(1.2), Inches(6), Inches(2.8), fill_color=CARD)
cbar2 = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(6.7), Inches(1.2), Inches(6), Inches(0.08))
cbar2.fill.solid()
cbar2.fill.fore_color.rgb = RGBColor(0x21,0x96,0xF3)
cbar2.line.fill.background()
add_title_text(slide, "天气IP定位不准确", Inches(6.9), Inches(1.35), Inches(5.6), Inches(0.3),
               font_size=15, bold=True, color=RGBColor(0x21,0x96,0xF3))
add_body_text(slide, "现象：店铺在北京，IP定位显示在天津，天气推荐错误",
              Inches(6.9), Inches(1.7), Inches(5.6), Inches(0.25),
              font_size=11, color=WARNING)
add_body_text(slide, "解决：多源定位策略",
              Inches(6.9), Inches(2.0), Inches(5.6), Inches(0.25),
              font_size=11, color=SECONDARY, bold=True)

strategies = [
    "1. GPS定位（小程序授权）",
    "2. IP定位（备用）",
    "3. 商户手动设置门店地址（兜底）",
]
add_multiline_text(slide, strategies, Inches(6.9), Inches(2.4), Inches(5.6), Inches(1.5),
                   font_size=11, color=TEXT, line_spacing=1.4)
print("Page 21 问题④ - 完成")

# ============== Page 22: 问题⑤ 性能与兼容 ==============
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_background(slide, BG)
bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(0.15), SLIDE_HEIGHT)
bar.fill.solid()
bar.fill.fore_color.rgb = WARNING
bar.line.fill.background()
add_title_text(slide, "问题⑤ —— 性能优化与模型兼容", LEFT_MARGIN, Inches(0.4), Inches(12), Inches(0.6),
               font_size=26, bold=True, color=TEXT)
add_divider(slide, LEFT_MARGIN, Inches(0.95), Inches(2.8), WARNING, 3)

# 左右卡片
card1 = add_card(slide, LEFT_MARGIN, Inches(1.2), Inches(6), Inches(2.5), fill_color=CARD)
cbar1 = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, LEFT_MARGIN, Inches(1.2), Inches(6), Inches(0.08))
cbar1.fill.solid()
cbar1.fill.fore_color.rgb = PRIMARY
cbar1.line.fill.background()
add_title_text(slide, "AI非流式返回导致超时", LEFT_MARGIN + Inches(0.2), Inches(1.35), Inches(5.6), Inches(0.3),
               font_size=15, bold=True, color=PRIMARY)
add_body_text(slide, "现象：复杂分析请求超过30秒，浏览器自动断开",
              LEFT_MARGIN + Inches(0.2), Inches(1.7), Inches(5.6), Inches(0.25),
              font_size=11, color=WARNING)
add_body_text(slide, "解决：AbortController超时控制 + 分段返回",
              LEFT_MARGIN + Inches(0.2), Inches(2.0), Inches(5.6), Inches(0.25),
              font_size=11, color=SECONDARY, bold=True)

code_timeout = [
    "const controller = new AbortController();",
    "const timeout = setTimeout(() => controller.abort(), 25000);",
    "try {",
    "  const result = await aiRequest({ signal: controller.signal });",
    "} finally {",
    "  clearTimeout(timeout);",
    "}",
]
add_code_block(slide, code_timeout, LEFT_MARGIN + Inches(0.2), Inches(2.4), Inches(5.6), Inches(1.2))

card2 = add_card(slide, Inches(6.7), Inches(1.2), Inches(6), Inches(2.5), fill_color=CARD)
cbar2 = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(6.7), Inches(1.2), Inches(6), Inches(0.08))
cbar2.fill.solid()
cbar2.fill.fore_color.rgb = RGBColor(0x9C,0x27,0xB0)
cbar2.line.fill.background()
add_title_text(slide, "不同模型输出格式不一致", Inches(6.9), Inches(1.35), Inches(5.6), Inches(0.3),
               font_size=15, bold=True, color=RGBColor(0x9C,0x27,0xB0))
add_body_text(slide, "现象：DeepSeek和通义千问返回的JSON结构不同，前端解析报错",
              Inches(6.9), Inches(1.7), Inches(5.6), Inches(0.25),
              font_size=11, color=WARNING)
add_body_text(slide, "解决：多模型路由 + 统一响应封装层",
              Inches(6.9), Inches(2.0), Inches(5.6), Inches(0.25),
              font_size=11, color=SECONDARY, bold=True)

code_adapter = [
    "class AIResponseAdapter {",
    "  static normalize(model, rawResponse) {",
    "    return {",
    "      text: rawResponse.content || rawResponse.text,",
    "      confidence: rawResponse.confidence || 0.8,",
    "      source: model",
    "    };",
    "  }",
    "}",
]
add_code_block(slide, code_adapter, Inches(6.9), Inches(2.4), Inches(5.6), Inches(1.2))
print("Page 22 问题⑤ - 完成")

# ============== Page 23: 问题解决方法论 ==============
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_background(slide, BG)
bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(0.15), SLIDE_HEIGHT)
bar.fill.solid()
bar.fill.fore_color.rgb = WARNING
bar.line.fill.background()
add_title_text(slide, "问题解决的通用方法论", LEFT_MARGIN, Inches(0.4), Inches(12), Inches(0.6),
               font_size=26, bold=True, color=TEXT)
add_divider(slide, LEFT_MARGIN, Inches(0.95), Inches(2.5), WARNING, 3)

# 四步流程
steps = [
    ("① 定位原因", "用户等待10秒无反馈 → 网络抓包发现一次性返回", PRIMARY),
    ("② 设计方案", "调研SSE/WebSocket/长轮询 → 选择SSE（轻量、兼容好）", RGBColor(0x21,0x96,0xF3)),
    ("③ 实现修复", "改造Fastify接口 + Nginx配置 + 前端EventSource", SECONDARY),
    ("④ 验证测试", "模拟慢网络 → 首字响应<500ms → 关闭率下降80%", RGBColor(0x9C,0x27,0xB0)),
]
for i, (step, desc, color) in enumerate(steps):
    left = Inches(0.6 + i * 3.1)
    top = Inches(1.3)
    scard = add_card(slide, left, top, Inches(2.9), Inches(2.2), fill_color=CARD)
    cbar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, Inches(2.9), Inches(0.08))
    cbar.fill.solid()
    cbar.fill.fore_color.rgb = color
    cbar.line.fill.background()
    add_icon_circle(slide, left + Inches(0.15), top + Inches(0.15), Inches(0.4), color, str(i+1), WHITE, 14)
    add_title_text(slide, step, left + Inches(0.15), top + Inches(0.6), Inches(2.6), Inches(0.3),
                   font_size=13, bold=True, color=color)
    add_body_text(slide, desc, left + Inches(0.15), top + Inches(0.95), Inches(2.6), Inches(1.2),
                  font_size=10, color=TEXT)
    # 箭头
    if i < 3:
        arrow = slide.shapes.add_shape(MSO_SHAPE.RIGHT_ARROW, left + Inches(2.95), top + Inches(0.8), Inches(0.25), Inches(0.3))
        arrow.fill.solid()
        arrow.fill.fore_color.rgb = MUTED
        arrow.line.fill.background()

# 核心认知
add_title_text(slide, "核心认知总结", LEFT_MARGIN, Inches(3.8), Inches(12), Inches(0.3),
               font_size=16, bold=True, color=TEXT)
cognitions = [
    ("用户体验优先", "流式输出让用户从\"等待\"变为\"观看\"", PRIMARY),
    ("数据真实性是底线", "绝不为了好看而误导用户", WARNING),
    ("全链路 ownership", "从开发到部署到运维，全程负责", SECONDARY),
]
for i, (title, desc, color) in enumerate(cognitions):
    left = Inches(0.6 + i * 4.1)
    top = Inches(4.2)
    ccard = add_card(slide, left, top, Inches(3.8), Inches(1.5), fill_color=CARD)
    add_badge(slide, title, left + Inches(0.15), top + Inches(0.15), Inches(1.5), Inches(0.25),
              bg_color=color, text_color=WHITE, font_size=10)
    add_body_text(slide, desc, left + Inches(0.15), top + Inches(0.5), Inches(3.5), Inches(0.8),
                  font_size=11, color=TEXT)
print("Page 23 方法论 - 完成")

# ============== Page 24: 问题解决视频动效位 ==============
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_background(slide, BG)
bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(0.15), SLIDE_HEIGHT)
bar.fill.solid()
bar.fill.fore_color.rgb = WARNING
bar.line.fill.background()
add_title_text(slide, "🎬 视频动效位 —— 问题排查实录", LEFT_MARGIN, Inches(0.4), Inches(12), Inches(0.6),
               font_size=26, bold=True, color=TEXT)
add_divider(slide, LEFT_MARGIN, Inches(0.95), Inches(3), WARNING, 3)

# 视频占位框
video_box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(3), Inches(1.8), Inches(7.333), Inches(4))
video_box.fill.solid()
video_box.fill.fore_color.rgb = RGBColor(0x33, 0x33, 0x33)
video_box.line.color.rgb = MUTED
video_box.line.width = Pt(2)
video_box.adjustments[0] = 0.05

# 播放图标
play = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(5.8), Inches(3.3), Inches(1.5), Inches(1.5))
play.fill.solid()
play.fill.fore_color.rgb = WHITE
play.line.fill.background()
play_tf = play.text_frame
play_p = play_tf.paragraphs[0]
play_p.text = "▶"
play_p.font.size = Pt(36)
play_p.font.color.rgb = PRIMARY
play_p.alignment = PP_ALIGN.CENTER
play_tf.paragraphs[0].space_before = Pt(12)

add_body_text(slide, "推荐插入：SSE流式输出前后对比录屏（30秒）",
              Inches(1), Inches(6.1), Inches(11.333), Inches(0.25),
              font_size=12, color=MUTED, align=PP_ALIGN.CENTER)
add_body_text(slide, "备选插入：Docker部署流程录屏 / 问题排查过程录屏",
              Inches(1), Inches(6.4), Inches(11.333), Inches(0.25),
              font_size=11, color=MUTED, align=PP_ALIGN.CENTER)
print("Page 24 视频位 - 完成")

# ============== Page 25: PART 4 过渡页 ==============
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_background(slide, SECONDARY)
add_badge(slide, "PART 4", Inches(1), Inches(2.3), Inches(1.3), Inches(0.4),
          bg_color=WHITE, text_color=SECONDARY, font_size=12)
add_title_text(slide, "收获与成长", Inches(1), Inches(2.9), Inches(11.333), Inches(0.8),
               font_size=40, bold=True, color=WHITE)
add_body_text(slide, "答辩要求第4条 —— 项目完成后的收获", Inches(1), Inches(3.7), Inches(11.333), Inches(0.5),
              font_size=18, color=WHITE)
add_divider(slide, Inches(1), Inches(4.3), Inches(2), WHITE, 3)
print("Page 25 过渡页 - 完成")

# ============== Page 26: 技术能力收获 ==============
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_background(slide, BG)
bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(0.15), SLIDE_HEIGHT)
bar.fill.solid()
bar.fill.fore_color.rgb = SECONDARY
bar.line.fill.background()
add_title_text(slide, "技术能力 —— 从\"会写页面\"到\"能交付系统\"", LEFT_MARGIN, Inches(0.4), Inches(12), Inches(0.6),
               font_size=26, bold=True, color=TEXT)
add_divider(slide, LEFT_MARGIN, Inches(0.95), Inches(3.5), SECONDARY, 3)

skills = [
    ("前端开发", ["Vue3 Composition API", "Pinia 状态管理", "Vue Router 多级路由", "ECharts 数据可视化", "移动端适配"], PRIMARY),
    ("后端开发", ["Fastify 5 高性能接口", "Prisma 6 ORM建模", "TypeBox 运行时校验", "JWT + 短信验证码认证"], RGBColor(0x21,0x96,0xF3)),
    ("AI工程化", ["SSE流式输出实现", "多模型路由策略", "Prompt工程与约束", "Tool Schema设计"], RGBColor(0x9C,0x27,0xB0)),
]
for i, (title, items, color) in enumerate(skills):
    left = Inches(0.6 + i * 4.1)
    top = Inches(1.3)
    scard = add_card(slide, left, top, Inches(3.8), Inches(3), fill_color=CARD)
    cbar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, Inches(3.8), Inches(0.08))
    cbar.fill.solid()
    cbar.fill.fore_color.rgb = color
    cbar.line.fill.background()
    add_title_text(slide, title, left + Inches(0.15), top + Inches(0.15), Inches(3.5), Inches(0.3),
                   font_size=15, bold=True, color=color)
    for j, item in enumerate(items):
        add_body_text(slide, f"✓ {item}", left + Inches(0.15), top + Inches(0.55 + j * 0.35), Inches(3.5), Inches(0.3),
                      font_size=11, color=TEXT)

# 底部总结
banner = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, LEFT_MARGIN, Inches(4.6), Inches(12), Inches(0.7))
banner.fill.solid()
banner.fill.fore_color.rgb = LIGHT_GREEN
banner.line.fill.background()
banner.adjustments[0] = 0.1
add_title_text(slide, "🎯 核心认知：经营类系统的数据真实性是底线，不能为了好看而误导用户",
               LEFT_MARGIN, Inches(4.7), Inches(12), Inches(0.5),
               font_size=14, bold=True, color=SECONDARY, align=PP_ALIGN.CENTER)
print("Page 26 技术能力 - 完成")

# ============== Page 27: 工程思维收获 ==============
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_background(slide, BG)
bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(0.15), SLIDE_HEIGHT)
bar.fill.solid()
bar.fill.fore_color.rgb = SECONDARY
bar.line.fill.background()
add_title_text(slide, "工程思维 —— 三个核心认知的升级", LEFT_MARGIN, Inches(0.4), Inches(12), Inches(0.6),
               font_size=26, bold=True, color=TEXT)
add_divider(slide, LEFT_MARGIN, Inches(0.95), Inches(2.8), SECONDARY, 3)

mindsets = [
    ("认知升级 ①", "用户体验优先", "以前：功能做出来就行",
     "现在：用户等待10秒无反馈 = 功能不存在",
     "实践：SSE流式输出、加载态设计、错误友好提示", PRIMARY),
    ("认知升级 ②", "数据真实性是底线", "以前：页面好看就行，数据差不多就行",
     "现在：经营系统必须保证数据真实，不能误导用户做错误决策",
     "实践：数据源标记、统计口径白名单、置信度标注", WARNING),
    ("认知升级 ③", "全链路 ownership", "以前：前端只写页面，后端只写接口",
     "现在：从需求分析 → 开发 → 测试 → 部署 → 运维，全程负责",
     "实践：Docker Compose部署、Nginx配置、服务器排错", SECONDARY),
]
for i, (label, title, before, after, practice, color) in enumerate(mindsets):
    top = Inches(1.3 + i * 1.9)
    mcard = add_card(slide, LEFT_MARGIN, top, Inches(12), Inches(1.7), fill_color=CARD)
    cbar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, LEFT_MARGIN, top, Inches(12), Inches(0.06))
    cbar.fill.solid()
    cbar.fill.fore_color.rgb = color
    cbar.line.fill.background()
    add_badge(slide, label, LEFT_MARGIN + Inches(0.15), top + Inches(0.15), Inches(1.3), Inches(0.25),
              bg_color=color, text_color=WHITE, font_size=10)
    add_title_text(slide, title, LEFT_MARGIN + Inches(1.55), top + Inches(0.12), Inches(5), Inches(0.3),
                   font_size=14, bold=True, color=color)
    add_body_text(slide, f"以前：{before}", LEFT_MARGIN + Inches(0.15), top + Inches(0.5), Inches(11.7), Inches(0.22),
                  font_size=10, color=MUTED)
    add_body_text(slide, f"现在：{after}", LEFT_MARGIN + Inches(0.15), top + Inches(0.75), Inches(11.7), Inches(0.22),
                  font_size=10, color=TEXT, bold=True)
    add_body_text(slide, f"实践：{practice}", LEFT_MARGIN + Inches(0.15), top + Inches(1.0), Inches(11.7), Inches(0.22),
                  font_size=10, color=color)
print("Page 27 工程思维 - 完成")

# ============== Page 28: 部署运维收获 ==============
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_background(slide, BG)
bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(0.15), SLIDE_HEIGHT)
bar.fill.solid()
bar.fill.fore_color.rgb = SECONDARY
bar.line.fill.background()
add_title_text(slide, "部署运维 —— 从\"本地能跑\"到\"线上可用\"", LEFT_MARGIN, Inches(0.4), Inches(12), Inches(0.6),
               font_size=26, bold=True, color=TEXT)
add_divider(slide, LEFT_MARGIN, Inches(0.95), Inches(2.8), SECONDARY, 3)

# 左侧技能
add_title_text(slide, "掌握的技能", LEFT_MARGIN, Inches(1.2), Inches(5), Inches(0.3),
               font_size=16, bold=True, color=TEXT)
skill_lines = [
    "Docker 多阶段构建（减小镜像体积）",
    "Docker Compose 多容器编排",
    "Nginx 反向代理 + 静态资源服务",
    "腾讯云服务器配置与域名解析",
    "日志查看与线上问题排查",
]
add_multiline_text(slide, skill_lines, LEFT_MARGIN, Inches(1.55), Inches(5.5), Inches(2.5),
                   font_size=12, color=TEXT, line_spacing=1.5)

# 右侧部署架构
add_title_text(slide, "部署架构", Inches(6.5), Inches(1.2), Inches(6), Inches(0.3),
               font_size=16, bold=True, color=TEXT)
arch_lines = [
    "用户请求 → 腾讯云服务器",
    "              → Nginx（80/443端口）",
    "                → /api/* → Docker backend:3000",
    "                → /phone/* → 前端静态文件",
    "                → 其他 → 前端SPA fallback",
]
add_code_block(slide, arch_lines, Inches(6.5), Inches(1.55), Inches(6), Inches(1.8))

# 底部踩坑经验
add_title_text(slide, "踩过的坑变成经验", LEFT_MARGIN, Inches(4.0), Inches(12), Inches(0.3),
               font_size=16, bold=True, color=TEXT)
lessons = [
    ("localhost不能用于生产环境二维码", WARNING),
    ("Nginx缓存需要主动清理", RGBColor(0x21,0x96,0xF3)),
    ("Docker端口映射要与宿主机协调", SECONDARY),
]
for i, (lesson, color) in enumerate(lessons):
    left = Inches(0.6 + i * 4.1)
    top = Inches(4.4)
    lcard = add_card(slide, left, top, Inches(3.8), Inches(0.9), fill_color=CARD)
    add_icon_circle(slide, left + Inches(0.15), top + Inches(0.2), Inches(0.3), color, "!", WHITE, 12)
    add_body_text(slide, lesson, left + Inches(0.55), top + Inches(0.2), Inches(3.1), Inches(0.5),
                  font_size=11, color=TEXT)
print("Page 28 部署运维 - 完成")

# ============== Page 29: 团队协作与工具链 ==============
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_background(slide, BG)
bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(0.15), SLIDE_HEIGHT)
bar.fill.solid()
bar.fill.fore_color.rgb = SECONDARY
bar.line.fill.background()
add_title_text(slide, "工具链与工程规范", LEFT_MARGIN, Inches(0.4), Inches(12), Inches(0.6),
               font_size=26, bold=True, color=TEXT)
add_divider(slide, LEFT_MARGIN, Inches(0.95), Inches(2.5), SECONDARY, 3)

# 开发工具链
add_title_text(slide, "开发工具链", LEFT_MARGIN, Inches(1.2), Inches(5.5), Inches(0.3),
               font_size=16, bold=True, color=TEXT)
tools = [
    ("Git", "版本控制 + 分支管理", PRIMARY),
    ("VS Code", "前端Chrome调试 + 后端Node调试", RGBColor(0x21,0x96,0xF3)),
    ("Postman", "API接口测试", RGBColor(0xFF,0x98,0x00)),
    ("Prisma Studio", "数据库可视化", RGBColor(0x9C,0x27,0xB0)),
]
for i, (tool, desc, color) in enumerate(tools):
    top = Inches(1.6 + i * 0.6)
    add_icon_circle(slide, LEFT_MARGIN + Inches(0.1), top, Inches(0.35), color, "", WHITE, 10)
    add_body_text(slide, f"{tool}：{desc}", LEFT_MARGIN + Inches(0.55), top, Inches(5), Inches(0.3),
                  font_size=11, color=TEXT)

# 工程规范
add_title_text(slide, "工程规范", Inches(6.5), Inches(1.2), Inches(6), Inches(0.3),
               font_size=16, bold=True, color=TEXT)
standards = [
    ("ESLint + Prettier", "代码格式化", PRIMARY),
    ("TypeScript", "类型安全", RGBColor(0x21,0x96,0xF3)),
    ("RESTful API", "接口设计规范", SECONDARY),
    ("Git Commit", "提交信息规范", RGBColor(0x9C,0x27,0xB0)),
]
for i, (std, desc, color) in enumerate(standards):
    top = Inches(1.6 + i * 0.6)
    add_icon_circle(slide, Inches(6.6), top, Inches(0.35), color, "", WHITE, 10)
    add_body_text(slide, f"{std}：{desc}", Inches(7.05), top, Inches(5), Inches(0.3),
                  font_size=11, color=TEXT)

# 底部协作能力
banner = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, LEFT_MARGIN, Inches(4.5), Inches(12), Inches(0.7))
banner.fill.solid()
banner.fill.fore_color.rgb = LIGHT_GREEN
banner.line.fill.background()
banner.adjustments[0] = 0.1
add_title_text(slide, "不仅是技术能力，更是工程化思维和全链路责任感的成长",
               LEFT_MARGIN, Inches(4.6), Inches(12), Inches(0.5),
               font_size=14, bold=True, color=SECONDARY, align=PP_ALIGN.CENTER)
print("Page 29 工具链 - 完成")

# ============== Page 30: 收获视频动效位 ==============
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_background(slide, BG)
bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(0.15), SLIDE_HEIGHT)
bar.fill.solid()
bar.fill.fore_color.rgb = SECONDARY
bar.line.fill.background()
add_title_text(slide, "🎬 视频动效位 —— 项目演示精华", LEFT_MARGIN, Inches(0.4), Inches(12), Inches(0.6),
               font_size=26, bold=True, color=TEXT)
add_divider(slide, LEFT_MARGIN, Inches(0.95), Inches(2.5), SECONDARY, 3)

video_box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(3), Inches(1.8), Inches(7.333), Inches(4))
video_box.fill.solid()
video_box.fill.fore_color.rgb = RGBColor(0x33, 0x33, 0x33)
video_box.line.color.rgb = MUTED
video_box.line.width = Pt(2)
video_box.adjustments[0] = 0.05

play = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(5.8), Inches(3.3), Inches(1.5), Inches(1.5))
play.fill.solid()
play.fill.fore_color.rgb = WHITE
play.line.fill.background()
play_tf = play.text_frame
play_p = play_tf.paragraphs[0]
play_p.text = "▶"
play_p.font.size = Pt(36)
play_p.font.color.rgb = SECONDARY
play_p.alignment = PP_ALIGN.CENTER
play_tf.paragraphs[0].space_before = Pt(12)

add_body_text(slide, "推荐插入：项目功能演示录屏（60秒精华版）",
              Inches(1), Inches(6.1), Inches(11.333), Inches(0.25),
              font_size=12, color=MUTED, align=PP_ALIGN.CENTER)
add_body_text(slide, "展示：登录 → 驾驶舱 → 扫码点餐 → 客户资产 → AI问答 → 部署访问",
              Inches(1), Inches(6.4), Inches(11.333), Inches(0.25),
              font_size=11, color=MUTED, align=PP_ALIGN.CENTER)
print("Page 30 视频位 - 完成")

# ============== Page 31: 量化成果 ==============
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_background(slide, BG)
bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(0.15), SLIDE_HEIGHT)
bar.fill.solid()
bar.fill.fore_color.rgb = PRIMARY
bar.line.fill.background()
add_title_text(slide, "已完成的成果", LEFT_MARGIN, Inches(0.4), Inches(12), Inches(0.6),
               font_size=26, bold=True, color=TEXT)
add_divider(slide, LEFT_MARGIN, Inches(0.95), Inches(2), PRIMARY, 3)

# 系统成果
add_title_text(slide, "系统成果", LEFT_MARGIN, Inches(1.2), Inches(5.5), Inches(0.3),
               font_size=16, bold=True, color=TEXT)
results = [
    "三端系统：PC后台 + 手机端 + 顾客扫码点餐页",
    "8大功能模块完整落地",
    "AI经营日报自动生成",
    "客户OneID打通与RFM分层",
    "菜品四象限分析",
    "智能采购单与效期预警",
    "Docker Compose 一键部署",
]
add_multiline_text(slide, results, LEFT_MARGIN, Inches(1.55), Inches(5.5), Inches(3),
                   font_size=12, color=TEXT, line_spacing=1.5)

# 量化价值表格
add_title_text(slide, "量化价值", Inches(6.5), Inches(1.2), Inches(6), Inches(0.3),
               font_size=16, bold=True, color=TEXT)
table = slide.shapes.add_table(6, 2, Inches(6.5), Inches(1.6), Inches(6), Inches(2.8)).table
metrics_data = [
    ("每日节省对账时间", "1.5小时"),
    ("损耗率下降", "12% → 5%"),
    ("复购率提升", "+20%"),
    ("采购决策时间", "1小时 → 5分钟"),
    ("差评响应时间", "24小时 → 1小时"),
]
for r_idx, (label, val) in enumerate(metrics_data):
    cell = table.cell(r_idx, 0)
    cell.text = label
    p = cell.text_frame.paragraphs[0]
    p.font.size = Pt(11)
    p.font.color.rgb = TEXT
    p.font.name = "Microsoft YaHei"
    
    cell = table.cell(r_idx, 1)
    cell.text = val
    p = cell.text_frame.paragraphs[0]
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = PRIMARY
    p.font.name = "Microsoft YaHei"
    p.alignment = PP_ALIGN.CENTER
    
    if r_idx % 2 == 0:
        for c in range(2):
            table.cell(r_idx, c).fill.solid()
            table.cell(r_idx, c).fill.fore_color.rgb = RGBColor(0xFA, 0xFA, 0xFA)
print("Page 31 量化成果 - 完成")

# ============== Page 32: 未来规划 ==============
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_background(slide, BG)
bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(0.15), SLIDE_HEIGHT)
bar.fill.solid()
bar.fill.fore_color.rgb = PRIMARY
bar.line.fill.background()
add_title_text(slide, "未来方向与扩展", LEFT_MARGIN, Inches(0.4), Inches(12), Inches(0.6),
               font_size=26, bold=True, color=TEXT)
add_divider(slide, LEFT_MARGIN, Inches(0.95), Inches(2.2), PRIMARY, 3)

plans = [
    ("短期（1-2个月）", "连锁多店看板、供应商比价系统、更多平台数据接入", LIGHT_ORANGE, PRIMARY),
    ("中期（3-6个月）", "AI外呼客户召回、动态定价策略落地、行业垂直方案", LIGHT_GREEN, SECONDARY),
    ("长期（6-12个月）", "连锁品牌私有化部署、供应链金融服务对接、开放API平台", RGBColor(0xE3,0xF2,0xFD), RGBColor(0x21,0x96,0xF3)),
]
for i, (period, desc, bg_color, title_color) in enumerate(plans):
    top = Inches(1.3 + i * 1.7)
    pcard = add_card(slide, LEFT_MARGIN, top, Inches(12), Inches(1.5), fill_color=bg_color)
    add_badge(slide, period, LEFT_MARGIN + Inches(0.15), top + Inches(0.15), Inches(2.2), Inches(0.28),
              bg_color=title_color, text_color=WHITE, font_size=11)
    add_body_text(slide, desc, LEFT_MARGIN + Inches(0.15), top + Inches(0.55), Inches(11.7), Inches(0.8),
                  font_size=12, color=TEXT)
print("Page 32 未来规划 - 完成")

# ============== Page 33: 项目演示说明 ==============
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_background(slide, BG)
bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(0.15), SLIDE_HEIGHT)
bar.fill.solid()
bar.fill.fore_color.rgb = PRIMARY
bar.line.fill.background()
add_title_text(slide, "项目演示路线", LEFT_MARGIN, Inches(0.4), Inches(12), Inches(0.6),
               font_size=26, bold=True, color=TEXT)
add_divider(slide, LEFT_MARGIN, Inches(0.95), Inches(2), PRIMARY, 3)

demo_steps = [
    ("1", "登录/注册", "短信验证码登录", PRIMARY),
    ("2", "经营驾驶舱", "查看昨日利润、AI日报", PRIMARY),
    ("3", "扫码点餐", "顾客端体验", PRIMARY),
    ("4", "商户接单", "订单队列管理", RGBColor(0x21,0x96,0xF3)),
    ("5", "客户资产", "客户详情、标签、RFM", RGBColor(0x21,0x96,0xF3)),
    ("6", "菜品盈利", "四象限分析", RGBColor(0x21,0x96,0xF3)),
    ("7", "采购单", "AI生成、确认、导出", SECONDARY),
    ("8", "评价口碑", "差评预警、AI回复", SECONDARY),
    ("9", "AI问答", "语音/文字提问，SSE流式回复", RGBColor(0x9C,0x27,0xB0)),
    ("10", "服务器部署", "Docker访问、域名访问", RGBColor(0x9C,0x27,0xB0)),
]
for i, (num, title, desc, color) in enumerate(demo_steps):
    row = i // 2
    col = i % 2
    left = Inches(0.6 + col * 6.2)
    top = Inches(1.3 + row * 1.15)
    dcard = add_card(slide, left, top, Inches(5.9), Inches(1.0), fill_color=CARD)
    add_icon_circle(slide, left + Inches(0.1), top + Inches(0.15), Inches(0.35), color, num, WHITE, 11)
    add_body_text(slide, title, left + Inches(0.55), top + Inches(0.12), Inches(2), Inches(0.25),
                  font_size=12, color=TEXT, bold=True)
    add_body_text(slide, desc, left + Inches(0.55), top + Inches(0.38), Inches(5), Inches(0.25),
                  font_size=10, color=MUTED)
print("Page 33 演示路线 - 完成")

# ============== Page 34: 演示视频位 ==============
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_background(slide, BG)
bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(0.15), SLIDE_HEIGHT)
bar.fill.solid()
bar.fill.fore_color.rgb = PRIMARY
bar.line.fill.background()
add_title_text(slide, "🎬 项目演示视频", LEFT_MARGIN, Inches(0.4), Inches(12), Inches(0.6),
               font_size=26, bold=True, color=TEXT)
add_divider(slide, LEFT_MARGIN, Inches(0.95), Inches(2), PRIMARY, 3)

video_box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(3), Inches(1.8), Inches(7.333), Inches(4))
video_box.fill.solid()
video_box.fill.fore_color.rgb = RGBColor(0x33, 0x33, 0x33)
video_box.line.color.rgb = MUTED
video_box.line.width = Pt(2)
video_box.adjustments[0] = 0.05

play = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(5.8), Inches(3.3), Inches(1.5), Inches(1.5))
play.fill.solid()
play.fill.fore_color.rgb = WHITE
play.line.fill.background()
play_tf = play.text_frame
play_p = play_tf.paragraphs[0]
play_p.text = "▶"
play_p.font.size = Pt(36)
play_p.font.color.rgb = PRIMARY
play_p.alignment = PP_ALIGN.CENTER
play_tf.paragraphs[0].space_before = Pt(12)

add_body_text(slide, "答辩结束后需录制带有解说词的项目演示视频",
              Inches(1), Inches(6.0), Inches(11.333), Inches(0.25),
              font_size=12, color=TEXT, align=PP_ALIGN.CENTER)
add_body_text(slide, "建议时长：3-5分钟 | 输出格式：MP4（1080P）",
              Inches(1), Inches(6.3), Inches(11.333), Inches(0.25),
              font_size=11, color=MUTED, align=PP_ALIGN.CENTER)
print("Page 34 演示视频位 - 完成")

# ============== Page 35: Q&A ==============
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_background(slide, BG)
bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(0.15), SLIDE_HEIGHT)
bar.fill.solid()
bar.fill.fore_color.rgb = PRIMARY
bar.line.fill.background()
add_title_text(slide, "Q & A", LEFT_MARGIN, Inches(0.4), Inches(12), Inches(0.6),
               font_size=26, bold=True, color=TEXT)
add_divider(slide, LEFT_MARGIN, Inches(0.95), Inches(1), PRIMARY, 3)

add_title_text(slide, "欢迎提问", Inches(1), Inches(2.5), Inches(11.333), Inches(0.8),
               font_size=36, bold=True, color=PRIMARY, align=PP_ALIGN.CENTER)

qa_topics = [
    "技术细节：SSE实现、多模型路由、Docker部署",
    "产品设计：OneID匹配、RFM算法、采购预测",
    "项目反思：最大的坑、最重要的收获、如果重来会怎么做",
]
for i, topic in enumerate(qa_topics):
    top = Inches(3.8 + i * 0.6)
    add_body_text(slide, f"• {topic}", Inches(3), top, Inches(7.333), Inches(0.3),
                  font_size=13, color=MUTED, align=PP_ALIGN.CENTER)
print("Page 35 Q&A - 完成")

# ============== Page 36: 结尾页 ==============
make_ending_slide(prs, "感谢聆听", "餐小助 · 让AI帮你盯店，你只管做好菜")
print("Page 36 结尾 - 完成")

# ============== 保存 ==============
prs.save(OUTPUT_FILE)
print(f"\n✅ PPT生成完成！")
print(f"文件路径: {OUTPUT_FILE}")
print(f"总页数: {len(prs.slides)}")
