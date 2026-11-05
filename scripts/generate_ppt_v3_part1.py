#!/usr/bin/env python3
"""
餐小助项目答辩PPT生成脚本 V3
36页专业答辩PPT，重点展开问题与解决、收获与成长
"""

from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from pptx.oxml.ns import nsmap
from pptx.oxml import parse_xml
import os

# ============== 色彩体系 ==============
PRIMARY = RGBColor(0xFF, 0x6B, 0x35)      # 活力橙
SECONDARY = RGBColor(0x00, 0xC8, 0x53)    # 清新绿
WARNING = RGBColor(0xFF, 0x3D, 0x00)      # 警示红
BG = RGBColor(0xF7, 0xF8, 0xFA)           # 暖灰白
CARD = RGBColor(0xFF, 0xFF, 0xFF)         # 纯白
TEXT = RGBColor(0x1A, 0x1A, 0x1A)         # 深灰
MUTED = RGBColor(0x66, 0x66, 0x66)        # 中灰
BROWN = RGBColor(0x5B, 0x36, 0x1F)        # 棕色
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
LIGHT_ORANGE = RGBColor(0xFF, 0xE8, 0xDE) # 浅橙背景
LIGHT_GREEN = RGBColor(0xE0, 0xF7, 0xE9)  # 浅绿背景
LIGHT_RED = RGBColor(0xFF, 0xE0, 0xD6)    # 浅红背景

# ============== 尺寸常量 ==============
SLIDE_WIDTH = Inches(13.333)
SLIDE_HEIGHT = Inches(7.5)
LEFT_MARGIN = Inches(0.6)
RIGHT_MARGIN = Inches(12.733)
TOP_MARGIN = Inches(0.5)
CONTENT_TOP = Inches(1.4)

prs = Presentation()
prs.slide_width = SLIDE_WIDTH
prs.slide_height = SLIDE_HEIGHT

# ============== 辅助函数 ==============

def add_background(slide, color):
    """添加纯色背景"""
    background = slide.shapes.add_shape(
        MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), SLIDE_WIDTH, SLIDE_HEIGHT
    )
    background.fill.solid()
    background.fill.fore_color.rgb = color
    background.line.fill.background()
    # 移到最底层
    spTree = slide.shapes._spTree
    sp = background._element
    spTree.remove(sp)
    spTree.insert(2, sp)

def add_title_text(slide, text, left, top, width, height, font_size=32, bold=True, color=TEXT, align=PP_ALIGN.LEFT):
    """添加标题文本框"""
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
    """添加正文文本框"""
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
    """添加多行文本"""
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
    """添加卡片背景"""
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill_color
    shape.line.color.rgb = line_color
    shape.line.width = Pt(1)
    # 圆角调整
    shape.adjustments[0] = 0.08
    return shape

def add_badge(slide, text, left, top, width, height, bg_color, text_color=WHITE, font_size=11):
    """添加标签徽章"""
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
    """添加代码块"""
    # 背景
    bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, width, height)
    bg.fill.solid()
    bg.fill.fore_color.rgb = RGBColor(0x2D, 0x2D, 0x2D)
    bg.line.fill.background()
    # 代码文本
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
    """添加分割线"""
    line = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, width, Pt(thickness))
    line.fill.solid()
    line.fill.fore_color.rgb = color
    line.line.fill.background()

def add_icon_circle(slide, left, top, size, color, text="", text_color=WHITE, font_size=18):
    """添加圆形图标"""
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

# ============== 页面模板 ==============

def make_cover_slide(prs, title, subtitle, tags=None):
    """封面页"""
    slide = prs.slides.add_slide(prs.slide_layouts[6])  # 空白布局
    add_background(slide, PRIMARY)
    # 主标题
    add_title_text(slide, title, Inches(1), Inches(2.2), Inches(11.333), Inches(1.2),
                   font_size=54, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
    # 副标题
    add_title_text(slide, subtitle, Inches(1), Inches(3.5), Inches(11.333), Inches(0.6),
                   font_size=24, bold=False, color=WHITE, align=PP_ALIGN.CENTER)
    # 标签
    if tags:
        tag_start = Inches(3.5)
        for i, tag in enumerate(tags):
            left = tag_start + i * Inches(1.6)
            add_badge(slide, tag, left, Inches(4.5), Inches(1.4), Inches(0.35),
                     bg_color=WHITE, text_color=PRIMARY, font_size=11)
    # 底部装饰线
    add_divider(slide, Inches(4), Inches(5.2), Inches(5.333), WHITE, 2)
    # 底部信息
    add_body_text(slide, "项目答辩 · 2026", Inches(1), Inches(5.5), Inches(11.333), Inches(0.4),
                  font_size=14, color=WHITE, align=PP_ALIGN.CENTER)
    return slide

def make_toc_slide(prs, items, highlight_idx=None):
    """目录页"""
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_background(slide, BG)
    # 标题
    add_title_text(slide, "CONTENTS", LEFT_MARGIN, Inches(0.5), Inches(4), Inches(0.7),
                   font_size=36, bold=True, color=TEXT)
    add_divider(slide, LEFT_MARGIN, Inches(1.15), Inches(1.5), PRIMARY, 3)
    # 目录项
    colors = [PRIMARY, RGBColor(0x9C,0x27,0xB0), WARNING, SECONDARY, RGBColor(0x21,0x96,0xF3)]
    for i, (num, title, desc) in enumerate(items):
        top = Inches(1.6 + i * 1.05)
        is_highlight = (highlight_idx is not None and i in highlight_idx)
        # 编号圆圈
        circle_color = colors[i % len(colors)]
        add_icon_circle(slide, Inches(0.7), top, Inches(0.5), circle_color, num, WHITE, 14)
        # 标题
        add_title_text(slide, title, Inches(1.4), top, Inches(10), Inches(0.4),
                       font_size=18, bold=True, color=TEXT)
        # 描述
        add_body_text(slide, desc, Inches(1.4), top + Inches(0.35), Inches(10), Inches(0.3),
                      font_size=12, color=MUTED)
        # 高亮背景
        if is_highlight:
            hl = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.5), top - Inches(0.1), Inches(12.2), Inches(0.9))
            hl.fill.solid()
            hl.fill.fore_color.rgb = LIGHT_ORANGE
            hl.line.fill.background()
            hl.adjustments[0] = 0.1
            # 移到后面
            spTree = slide.shapes._spTree
            sp = hl._element
            spTree.remove(sp)
            spTree.insert(2, sp)
    return slide

def make_transition_slide(prs, part_num, title, subtitle, color=BROWN):
    """过渡页"""
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_background(slide, color)
    # PART标签
    add_badge(slide, f"PART {part_num}", Inches(1), Inches(2.3), Inches(1.3), Inches(0.4),
              bg_color=WHITE, text_color=color, font_size=12)
    # 标题
    add_title_text(slide, title, Inches(1), Inches(2.9), Inches(11.333), Inches(0.8),
                   font_size=40, bold=True, color=WHITE)
    # 副标题
    add_body_text(slide, subtitle, Inches(1), Inches(3.7), Inches(11.333), Inches(0.5),
                  font_size=18, color=WHITE)
    # 装饰线
    add_divider(slide, Inches(1), Inches(4.3), Inches(2), WHITE, 3)
    return slide

def make_content_slide(prs, title, lines, has_code=False, code_lines=None, accent_color=PRIMARY):
    """标准内容页"""
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_background(slide, BG)
    # 顶部装饰条
    bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(0.15), SLIDE_HEIGHT)
    bar.fill.solid()
    bar.fill.fore_color.rgb = accent_color
    bar.line.fill.background()
    # 标题
    add_title_text(slide, title, LEFT_MARGIN, Inches(0.4), Inches(12), Inches(0.6),
                   font_size=26, bold=True, color=TEXT)
    add_divider(slide, LEFT_MARGIN, Inches(0.95), Inches(1.2), accent_color, 3)
    # 内容行
    if lines:
        add_multiline_text(slide, lines, LEFT_MARGIN, Inches(1.2), Inches(12), Inches(5.5),
                           font_size=14, color=TEXT, line_spacing=1.6)
    # 代码块
    if has_code and code_lines:
        add_code_block(slide, code_lines, LEFT_MARGIN, Inches(4.5), Inches(12), Inches(2.5))
    return slide

def make_card_slide(prs, title, cards, accent_color=PRIMARY, cols=2):
    """卡片布局页"""
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_background(slide, BG)
    bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(0.15), SLIDE_HEIGHT)
    bar.fill.solid()
    bar.fill.fore_color.rgb = accent_color
    bar.line.fill.background()
    add_title_text(slide, title, LEFT_MARGIN, Inches(0.4), Inches(12), Inches(0.6),
                   font_size=26, bold=True, color=TEXT)
    add_divider(slide, LEFT_MARGIN, Inches(0.95), Inches(1.2), accent_color, 3)
    # 卡片
    card_width = (Inches(12) - Inches(0.3) * (cols - 1)) / cols
    for i, (card_title, card_lines, card_color) in enumerate(cards):
        row = i // cols
        col = i % cols
        left = LEFT_MARGIN + col * (card_width + Inches(0.3))
        top = Inches(1.2 + row * 2.8)
        # 卡片背景
        card = add_card(slide, left, top, card_width, Inches(2.5), fill_color=CARD)
        # 卡片顶部色条
        cbar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, card_width, Inches(0.08))
        cbar.fill.solid()
        cbar.fill.fore_color.rgb = card_color
        cbar.line.fill.background()
        # 卡片标题
        add_title_text(slide, card_title, left + Inches(0.15), top + Inches(0.15), card_width - Inches(0.3), Inches(0.35),
                       font_size=15, bold=True, color=card_color)
        # 卡片内容
        add_multiline_text(slide, card_lines, left + Inches(0.15), top + Inches(0.5),
                           card_width - Inches(0.3), Inches(1.8),
                           font_size=11, color=TEXT, line_spacing=1.4)
    return slide

def make_table_slide(prs, title, headers, rows, accent_color=PRIMARY):
    """表格页"""
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_background(slide, BG)
    bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(0.15), SLIDE_HEIGHT)
    bar.fill.solid()
    bar.fill.fore_color.rgb = accent_color
    bar.line.fill.background()
    add_title_text(slide, title, LEFT_MARGIN, Inches(0.4), Inches(12), Inches(0.6),
                   font_size=26, bold=True, color=TEXT)
    add_divider(slide, LEFT_MARGIN, Inches(0.95), Inches(1.2), accent_color, 3)
    # 表格
    num_rows = len(rows) + 1
    num_cols = len(headers)
    table = slide.shapes.add_table(num_rows, num_cols, LEFT_MARGIN, Inches(1.2), Inches(12), Inches(0.6 * num_rows)).table
    # 表头
    for i, h in enumerate(headers):
        cell = table.cell(0, i)
        cell.text = h
        cell.fill.solid()
        cell.fill.fore_color.rgb = accent_color
        p = cell.text_frame.paragraphs[0]
        p.font.size = Pt(12)
        p.font.bold = True
        p.font.color.rgb = WHITE
        p.font.name = "Microsoft YaHei"
        p.alignment = PP_ALIGN.CENTER
    # 数据行
    for r_idx, row in enumerate(rows):
        for c_idx, val in enumerate(row):
            cell = table.cell(r_idx + 1, c_idx)
            cell.text = str(val)
            p = cell.text_frame.paragraphs[0]
            p.font.size = Pt(11)
            p.font.color.rgb = TEXT
            p.font.name = "Microsoft YaHei"
            p.alignment = PP_ALIGN.CENTER if c_idx > 0 else PP_ALIGN.LEFT
            if r_idx % 2 == 0:
                cell.fill.solid()
                cell.fill.fore_color.rgb = RGBColor(0xFA, 0xFA, 0xFA)
    return slide

def make_ending_slide(prs, title, subtitle):
    """结尾页"""
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_background(slide, PRIMARY)
    add_title_text(slide, title, Inches(1), Inches(2.8), Inches(11.333), Inches(1),
                   font_size=48, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
    add_body_text(slide, subtitle, Inches(1), Inches(4), Inches(11.333), Inches(0.5),
                  font_size=20, color=WHITE, align=PP_ALIGN.CENTER)
    add_divider(slide, Inches(4.5), Inches(4.8), Inches(4.333), WHITE, 2)
    return slide

# ============== 生成36页PPT ==============

print("开始生成PPT...")

# === Page 1: 封面 ===
make_cover_slide(prs, "餐小助·商户智能经营助手",
    "项目答辩 —— 从\"会写页面\"到\"能交付系统\"",
    ["Vue3", "Fastify", "Prisma", "AI", "Docker"])
print("Page 1 封面 - 完成")

# === Page 2: 答辩要求对照 ===
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_background(slide, BG)
add_title_text(slide, "本次答辩将完整回应5项要求", LEFT_MARGIN, Inches(0.4), Inches(12), Inches(0.6),
               font_size=26, bold=True, color=TEXT)
add_divider(slide, LEFT_MARGIN, Inches(0.95), Inches(2.5), PRIMARY, 3)

requirements = [
    ("①", "个人介绍与项目介绍", "PART 1 · 项目介绍", "P4-P8", PRIMARY),
    ("②", "重点模块、精彩代码", "PART 2 · 核心功能与代码", "P9-P15", RGBColor(0x9C,0x27,0xB0)),
    ("③", "遇到的问题及解决方案", "PART 3 · 问题与解决（重点）", "P16-P24", WARNING),
    ("④", "项目完成后的收获", "PART 4 · 收获与成长（重点）", "P25-P30", SECONDARY),
    ("⑤", "项目演示", "PART 5 · 演示说明", "P31-P36", RGBColor(0x21,0x96,0xF3)),
]
for i, (num, req, part, pages, color) in enumerate(requirements):
    top = Inches(1.3 + i * 1.1)
    # 编号
    add_icon_circle(slide, Inches(0.7), top, Inches(0.55), color, num, WHITE, 16)
    # 要求
    add_title_text(slide, req, Inches(1.5), top, Inches(5), Inches(0.35),
                   font_size=17, bold=True, color=TEXT)
    # 章节
    add_body_text(slide, part, Inches(1.5), top + Inches(0.32), Inches(5), Inches(0.25),
                  font_size=12, color=MUTED)
    # 页码
    add_badge(slide, pages, Inches(10.5), top + Inches(0.05), Inches(1.8), Inches(0.3),
              bg_color=color, text_color=WHITE, font_size=11)
    # 第3、4条高亮
    if i in [2, 3]:
        hl = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.5), top - Inches(0.1), Inches(12.2), Inches(0.95))
        hl.fill.solid()
        hl.fill.fore_color.rgb = LIGHT_RED if i == 2 else LIGHT_GREEN
        hl.line.fill.background()
        hl.adjustments[0] = 0.1
        spTree = slide.shapes._spTree
        sp = hl._element
        spTree.remove(sp)
        spTree.insert(2, sp)

# 重点提示
add_badge(slide, "⭐ 重点展开", Inches(10), Inches(5.8), Inches(2), Inches(0.4),
          bg_color=WARNING, text_color=WHITE, font_size=14)
print("Page 2 答辩要求对照 - 完成")

# === Page 3: 目录 ===
make_toc_slide(prs, [
    ("01", "PART 1 · 项目介绍", "中小餐饮的\"数字店长\""),
    ("02", "PART 2 · 核心功能", "八大模块与精彩代码"),
    ("03", "PART 3 · 问题与解决", "十个真实技术挑战 ⭐"),
    ("04", "PART 4 · 收获与成长", "从页面到系统的跨越 ⭐"),
    ("05", "PART 5 · 成果展望", "量化价值与未来方向"),
], highlight_idx=[2, 3])
print("Page 3 目录 - 完成")

# === Page 4: PART 1 过渡页 ===
make_transition_slide(prs, "1", "项目介绍", "为什么做？为谁做？做成什么样？", BROWN)
print("Page 4 过渡页 - 完成")

# === Page 5: 行业痛点 ===
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_background(slide, BG)
bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(0.15), SLIDE_HEIGHT)
bar.fill.solid()
bar.fill.fore_color.rgb = PRIMARY
bar.line.fill.background()
add_title_text(slide, "中小餐饮的生死困局", LEFT_MARGIN, Inches(0.4), Inches(12), Inches(0.6),
               font_size=26, bold=True, color=TEXT)
add_divider(slide, LEFT_MARGIN, Inches(0.95), Inches(2.5), PRIMARY, 3)

# 左侧数据
data_lines = [
    "中国餐饮AI市场规模突破800亿元",
    "80%以上产品集中在C端，B端经营智能工具稀缺",
    "中小餐饮平均寿命仅18个月",
    "主要死因不是口味，而是：",
]
add_multiline_text(slide, data_lines, LEFT_MARGIN, Inches(1.2), Inches(5.5), Inches(2.5),
                   font_size=14, color=TEXT, line_spacing=1.6)

# 三个痛点卡片
pain_points = [
    ("💰", "不会算账", "美团、饿了么、堂食订单混在一起，月底算不清真实利润", WARNING),
    ("👥", "不会管客", "老客户来了叫不上名字，没有会员系统，无法留存", RGBColor(0x9C,0x27,0xB0)),
    ("📦", "不会控损耗", "进货靠经验，绿叶菜经常剩一半倒掉", RGBColor(0x21,0x96,0xF3)),
]
for i, (icon, title, desc, color) in enumerate(pain_points):
    left = Inches(0.6 + i * 4.1)
    top = Inches(3.5)
    card = add_card(slide, left, top, Inches(3.8), Inches(2.5), fill_color=CARD)
    # 顶部色条
    cbar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, Inches(3.8), Inches(0.08))
    cbar.fill.solid()
    cbar.fill.fore_color.rgb = color
    cbar.line.fill.background()
    # 图标
    add_icon_circle(slide, left + Inches(0.2), top + Inches(0.2), Inches(0.5), color, icon, WHITE, 20)
    # 标题
    add_title_text(slide, title, left + Inches(0.8), top + Inches(0.25), Inches(2.8), Inches(0.35),
                   font_size=16, bold=True, color=color)
    # 描述
    add_body_text(slide, desc, left + Inches(0.2), top + Inches(0.8), Inches(3.4), Inches(1.5),
                  font_size=12, color=TEXT)

# 底部数据
big_num = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.6), Inches(6.2), Inches(12), Inches(0.9))
big_num.fill.solid()
big_num.fill.fore_color.rgb = LIGHT_RED
big_num.line.fill.background()
big_num.adjustments[0] = 0.1
add_title_text(slide, "⚠ 平均寿命仅18个月", Inches(1), Inches(6.35), Inches(11), Inches(0.5),
               font_size=22, bold=True, color=WARNING, align=PP_ALIGN.CENTER)
print("Page 5 行业痛点 - 完成")

# === Page 6: 解决方案 ===
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_background(slide, BG)
bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(0.15), SLIDE_HEIGHT)
bar.fill.solid()
bar.fill.fore_color.rgb = PRIMARY
bar.line.fill.background()
add_title_text(slide, "餐小助 —— 中小餐饮商户的\"数字店长\"", LEFT_MARGIN, Inches(0.4), Inches(12), Inches(0.6),
               font_size=26, bold=True, color=TEXT)
add_divider(slide, LEFT_MARGIN, Inches(0.95), Inches(3), PRIMARY, 3)

# 三端产品
products = [
    ("📱", "手机商户端", "微信小程序", "看数据、查日报、语音问答、接收预警", PRIMARY),
    ("💻", "PC商户后台", "Web管理端", "复杂配置、多店看板、数据导出、知识库", RGBColor(0x21,0x96,0xF3)),
    ("📲", "顾客点餐页", "扫码即用", "扫码下单、订单追踪、评价反馈", SECONDARY),
]
for i, (icon, title, platform, desc, color) in enumerate(products):
    left = Inches(0.6 + i * 4.1)
    top = Inches(1.2)
    card = add_card(slide, left, top, Inches(3.8), Inches(2.2), fill_color=CARD)
    cbar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, Inches(3.8), Inches(0.08))
    cbar.fill.solid()
    cbar.fill.fore_color.rgb = color
    cbar.line.fill.background()
    add_icon_circle(slide, left + Inches(0.2), top + Inches(0.2), Inches(0.45), color, icon, WHITE, 18)
    add_title_text(slide, title, left + Inches(0.75), top + Inches(0.22), Inches(2.9), Inches(0.3),
                   font_size=15, bold=True, color=color)
    add_body_text(slide, platform, left + Inches(0.2), top + Inches(0.7), Inches(3.4), Inches(0.25),
                  font_size=11, color=MUTED)
    add_body_text(slide, desc, left + Inches(0.2), top + Inches(1.0), Inches(3.4), Inches(1),
                  font_size=11, color=TEXT)

# 价值承诺表格
add_title_text(slide, "核心价值承诺", LEFT_MARGIN, Inches(3.7), Inches(12), Inches(0.4),
               font_size=18, bold=True, color=TEXT)
values = [
    ("省人力", "自动汇总多渠道订单、自动对账、自动生成采购单", "替代1.5个杂工统计工作量"),
    ("省时间", "每日经营数据自动推送，老板无需手动拉表", "每天分析时间从2小时降至10分钟"),
    ("省损耗", "销量预测+效期预警+采购建议", "损耗率从12%降至5%"),
    ("多赚钱", "客户分层运营+菜品优化+智能定价", "复购率提升20%，月均增收5000元"),
]
for i, (val, desc, target) in enumerate(values):
    top = Inches(4.2 + i * 0.7)
    # 标签
    add_badge(slide, val, LEFT_MARGIN, top, Inches(1.1), Inches(0.3),
              bg_color=PRIMARY if i < 2 else SECONDARY, text_color=WHITE, font_size=11)
    # 描述
    add_body_text(slide, desc, LEFT_MARGIN + Inches(1.3), top, Inches(6), Inches(0.25),
                  font_size=12, color=TEXT)
    # 目标
    add_body_text(slide, target, LEFT_MARGIN + Inches(7.5), top, Inches(4.5), Inches(0.25),
                  font_size=11, color=MUTED)
print("Page 6 解决方案 - 完成")

# === Page 7: 功能架构 ===
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_background(slide, BG)
bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(0.15), SLIDE_HEIGHT)
bar.fill.solid()
bar.fill.fore_color.rgb = PRIMARY
bar.line.fill.background()
add_title_text(slide, "八大模块覆盖经营全链路", LEFT_MARGIN, Inches(0.4), Inches(12), Inches(0.6),
               font_size=26, bold=True, color=TEXT)
add_divider(slide, LEFT_MARGIN, Inches(0.95), Inches(2.8), PRIMARY, 3)

modules = [
    ("AI经营驾驶舱", "日报/对账/预警/语音问答", PRIMARY),
    ("客户资产管家", "OneID/标签/RFM/流失预警", RGBColor(0x9C,0x27,0xB0)),
    ("菜品盈利分析", "四象限/购物篮/成本监控", RGBColor(0xFF,0x98,0x00)),
    ("智能采购库存", "销量预测/采购单/效期预警", SECONDARY),
    ("智能定价促销", "动态定价/AI方案/分层发券", RGBColor(0x21,0x96,0xF3)),
    ("员工与排班", "客流预测/人效/证件预警", RGBColor(0x00,0x96,0x88)),
    ("评价与口碑", "聚合/差评预警/NLP归因", WARNING),
    ("系统管理", "多平台接入/权限/数据导出", MUTED),
]
for i, (title, desc, color) in enumerate(modules):
    row = i // 4
    col = i % 4
    left = Inches(0.6 + col * 3.1)
    top = Inches(1.3 + row * 2.6)
    card = add_card(slide, left, top, Inches(2.9), Inches(2.3), fill_color=CARD)
    # 顶部色条
    cbar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, Inches(2.9), Inches(0.08))
    cbar.fill.solid()
    cbar.fill.fore_color.rgb = color
    cbar.line.fill.background()
    # 编号
    add_body_text(slide, f"0{i+1}", left + Inches(0.15), top + Inches(0.15), Inches(0.5), Inches(0.25),
                  font_size=10, color=MUTED)
    # 标题
    add_title_text(slide, title, left + Inches(0.15), top + Inches(0.4), Inches(2.6), Inches(0.35),
                   font_size=13, bold=True, color=color)
    # 描述
    add_body_text(slide, desc, left + Inches(0.15), top + Inches(0.8), Inches(2.6), Inches(1.2),
                  font_size=10, color=TEXT)
print("Page 7 功能架构 - 完成")

# === Page 8: 技术架构 ===
make_content_slide(prs, "全栈技术架构", [
    "前端层：Vue3 + Pinia + Vue Router + ECharts（PC + 手机双端适配）",
    "后端层：Fastify 5 + Prisma 6 + TypeBox + OpenAI SDK",
    "AI层：多模型路由策略",
    "    · DeepSeek-V3（主力推理，T=0.3）",
    "    · 通义千问-Max（复杂BI分析）",
    "    · 豆包-Pro（创意文案、语音交互）",
    "    · 文心一言-4.0（NLP分类）",
    "数据层：OneID客户主数据、订单事实表、菜品维度表、38个标签体系",
    "部署层：Docker Compose + Nginx + 腾讯云服务器",
])
print("Page 8 技术架构 - 完成")

# === Page 9: PART 2 过渡页 ===
make_transition_slide(prs, "2", "核心功能与精彩代码", "三大核心模块落地 + 三段关键代码", BROWN)
print("Page 9 过渡页 - 完成")

# === Page 10: 核心模块① ===
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_background(slide, BG)
bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(0.15), SLIDE_HEIGHT)
bar.fill.solid()
bar.fill.fore_color.rgb = PRIMARY
bar.line.fill.background()
add_title_text(slide, "核心模块 ① —— AI经营驾驶舱", LEFT_MARGIN, Inches(0.4), Inches(12), Inches(0.6),
               font_size=26, bold=True, color=TEXT)
add_divider(slide, LEFT_MARGIN, Inches(0.95), Inches(2.5), PRIMARY, 3)

features = [
    "每日 8:00 自动推送AI经营日报",
    "内容包含：营收、利润、订单量、客单价、TOP3菜品、异常提醒、天气建议",
    "生成时间 < 30秒，支持语音播报",
]
add_multiline_text(slide, features, LEFT_MARGIN, Inches(1.2), Inches(5.5), Inches(1.5),
                   font_size=14, color=TEXT, line_spacing=1.6)

# 日报示例卡片
card = add_card(slide, Inches(6.5), Inches(1.2), Inches(6), Inches(3), fill_color=CARD)
cbar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(6.5), Inches(1.2), Inches(6), Inches(0.08))
cbar.fill.solid()
cbar.fill.fore_color.rgb = PRIMARY
cbar.line.fill.background()
add_title_text(slide, "📋 AI经营日报示例", Inches(6.7), Inches(1.35), Inches(5.6), Inches(0.3),
               font_size=14, bold=True, color=PRIMARY)
report_lines = [
    "昨日营收：3,680元（环比+12%）",
    "真实利润：1,120元（利润率30.4%）",
    "订单量：112单，客单价32.9元",
    "TOP3菜品：酸菜鱼、红烧肉、干锅土豆片",
    "",
    "⚠ 异常：退单率6.2%，建议检查外卖包装",
    "💡 建议：今天有雨，外卖预计多15%，提前备打包盒",
]
add_multiline_text(slide, report_lines, Inches(6.7), Inches(1.75), Inches(5.6), Inches(2.5),
                   font_size=12, color=TEXT, line_spacing=1.4)

# 底部指标
metrics = [
    ("生成时间", "<30秒", PRIMARY),
    ("推送时间", "每日8:00", PRIMARY),
    ("打开率目标", "≥60%", SECONDARY),
]
for i, (label, val, color) in enumerate(metrics):
    left = Inches(0.6 + i * 4.1)
    top = Inches(4.8)
    mcard = add_card(slide, left, top, Inches(3.8), Inches(1.5), fill_color=CARD)
    add_body_text(slide, label, left + Inches(0.2), top + Inches(0.15), Inches(3.4), Inches(0.25),
                  font_size=11, color=MUTED)
    add_title_text(slide, val, left + Inches(0.2), top + Inches(0.45), Inches(3.4), Inches(0.5),
                   font_size=28, bold=True, color=color)
print("Page 10 核心模块① - 完成")

# === Page 11: 核心模块② ===
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_background(slide, BG)
bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(0.15), SLIDE_HEIGHT)
bar.fill.solid()
bar.fill.fore_color.rgb = RGBColor(0x9C,0x27,0xB0)
bar.line.fill.background()
add_title_text(slide, "核心模块 ② —— 客户资产管家", LEFT_MARGIN, Inches(0.4), Inches(12), Inches(0.6),
               font_size=26, bold=True, color=TEXT)
add_divider(slide, LEFT_MARGIN, Inches(0.95), Inches(2.5), RGBColor(0x9C,0x27,0xB0), 3)

features = [
    "OneID 跨平台客户统一标识（手机号 + UnionID 匹配）",
    "手机号匹配率 > 95%",
    "38个自动标签体系（基础/偏好/行为/价值）",
    "RFM 自动重算 + 流失风险评分",
]
add_multiline_text(slide, features, LEFT_MARGIN, Inches(1.2), Inches(5.5), Inches(1.5),
                   font_size=14, color=TEXT, line_spacing=1.6)

# 召回建议卡片
card = add_card(slide, Inches(6.5), Inches(1.2), Inches(6), Inches(2.5), fill_color=LIGHT_ORANGE)
add_title_text(slide, "💡 AI召回建议示例", Inches(6.7), Inches(1.35), Inches(5.6), Inches(0.3),
               font_size=14, bold=True, color=PRIMARY)
recall_lines = [
    "张先生已30天未消费，历史客单价68元",
    "偏好酸菜鱼和辣味",
    "",
    "建议发放一张\"满50减5元\"无门槛券",
    "预计召回率 65%",
    "预计成本 5元，预计增收 44元",
]
add_multiline_text(slide, recall_lines, Inches(6.7), Inches(1.75), Inches(5.6), Inches(2),
                   font_size=12, color=TEXT, line_spacing=1.4)

# 标签体系
add_title_text(slide, "38个自动标签体系", LEFT_MARGIN, Inches(3.5), Inches(12), Inches(0.3),
               font_size=16, bold=True, color=TEXT)
tags = [
    ("基础标签", "男性客户、会员客户", RGBColor(0x21,0x96,0xF3)),
    ("偏好标签", "晚餐常客、爱吃辣、外卖党", PRIMARY),
    ("行为标签", "雨天点外卖、新品尝鲜", SECONDARY),
    ("价值标签", "高价值客户、流失风险", RGBColor(0x9C,0x27,0xB0)),
]
for i, (cat, examples, color) in enumerate(tags):
    left = Inches(0.6 + i * 3.1)
    top = Inches(4)
    tcard = add_card(slide, left, top, Inches(2.9), Inches(1.8), fill_color=CARD)
    add_badge(slide, cat, left + Inches(0.15), top + Inches(0.15), Inches(1.2), Inches(0.28),
              bg_color=color, text_color=WHITE, font_size=10)
    add_body_text(slide, examples, left + Inches(0.15), top + Inches(0.55), Inches(2.6), Inches(1),
                  font_size=11, color=TEXT)
print("Page 11 核心模块② - 完成")

# === Page 12: 核心模块③ ===
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_background(slide, BG)
bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(0.15), SLIDE_HEIGHT)
bar.fill.solid()
bar.fill.fore_color.rgb = SECONDARY
bar.line.fill.background()
add_title_text(slide, "核心模块 ③ —— 智能采购与库存", LEFT_MARGIN, Inches(0.4), Inches(12), Inches(0.6),
               font_size=26, bold=True, color=TEXT)
add_divider(slide, LEFT_MARGIN, Inches(0.95), Inches(2.8), SECONDARY, 3)

features = [
    "基于 90天历史订单 + 天气 + 节假日预测销量",
    "预测准确率 > 75%",
    "自动生成采购单：预测销量 × BOM - 库存",
    "效期预警：提前 24/48/72小时 分级提醒",
]
add_multiline_text(slide, features, LEFT_MARGIN, Inches(1.2), Inches(5.5), Inches(1.5),
                   font_size=14, color=TEXT, line_spacing=1.6)

# 采购单表格
add_title_text(slide, "采购单示例", Inches(6.5), Inches(1.2), Inches(6), Inches(0.3),
               font_size=14, bold=True, color=SECONDARY)
table = slide.shapes.add_table(5, 5, Inches(6.5), Inches(1.6), Inches(6), Inches(1.8)).table
headers = ["食材", "建议量", "单价", "金额", "置信度"]
for i, h in enumerate(headers):
    cell = table.cell(0, i)
    cell.text = h
    cell.fill.solid()
    cell.fill.fore_color.rgb = SECONDARY
    p = cell.text_frame.paragraphs[0]
    p.font.size = Pt(10)
    p.font.bold = True
    p.font.color.rgb = WHITE
    p.font.name = "Microsoft YaHei"
    p.alignment = PP_ALIGN.CENTER

data = [
    ["鱼片", "14kg", "¥28", "¥392", "82%"],
    ["上海青", "8kg", "¥4.5", "¥36", "65%"],
    ["五花肉", "10kg", "¥22", "¥220", "78%"],
    ["酸菜", "6kg", "¥5", "¥30", "80%"],
]
for r_idx, row in enumerate(data):
    for c_idx, val in enumerate(row):
        cell = table.cell(r_idx + 1, c_idx)
        cell.text = val
        p = cell.text_frame.paragraphs[0]
        p.font.size = Pt(10)
        p.font.color.rgb = TEXT
        p.font.name = "Microsoft YaHei"
        p.alignment = PP_ALIGN.CENTER
        if r_idx % 2 == 0:
            cell.fill.solid()
            cell.fill.fore_color.rgb = RGBColor(0xF5, 0xF5, 0xF5)

# 底部数据
add_title_text(slide, "损耗率对比", LEFT_MARGIN, Inches(3.8), Inches(4), Inches(0.3),
               font_size=16, bold=True, color=TEXT)
before = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, LEFT_MARGIN, Inches(4.2), Inches(2.5), Inches(1.2))
before.fill.solid()
before.fill.fore_color.rgb = LIGHT_RED
before.line.fill.background()
add_title_text(slide, "使用前", LEFT_MARGIN + Inches(0.2), Inches(4.3), Inches(2), Inches(0.25),
               font_size=12, bold=True, color=WARNING)
add_title_text(slide, "12%", LEFT_MARGIN + Inches(0.2), Inches(4.55), Inches(2), Inches(0.5),
               font_size=32, bold=True, color=WARNING)

arrow = slide.shapes.add_shape(MSO_SHAPE.RIGHT_ARROW, Inches(3.3), Inches(4.5), Inches(1), Inches(0.6))
arrow.fill.solid()
arrow.fill.fore_color.rgb = PRIMARY
arrow.line.fill.background()

after = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(4.5), Inches(4.2), Inches(2.5), Inches(1.2))
after.fill.solid()
after.fill.fore_color.rgb = LIGHT_GREEN
after.line.fill.background()
add_title_text(slide, "使用后", Inches(4.7), Inches(4.3), Inches(2), Inches(0.25),
               font_size=12, bold=True, color=SECONDARY)
add_title_text(slide, "5%", Inches(4.7), Inches(4.55), Inches(2), Inches(0.5),
               font_size=32, bold=True, color=SECONDARY)

add_body_text(slide, "↓ 下降 7个百分点，每月节省食材成本约1500-3000元",
              LEFT_MARGIN, Inches(5.6), Inches(6), Inches(0.3),
              font_size=12, color=SECONDARY)
print("Page 12 核心模块③ - 完成")

# === Page 13-15: 精彩代码 ===
# Page 13: SSE流式输出
code_sse = [
    "// Fastify SSE 流式回复核心代码",
    "reply.hijack();                    // 劫持响应，绕过默认序列化",
    "reply.raw.writeHead(200, {",
    "  'Content-Type': 'text/event-stream',",
    "  'Cache-Control': 'no-cache',",
    "  'X-Accel-Buffering': 'no',       // 关键：禁用Nginx缓冲",
    "  'Connection': 'keep-alive'",
    "});",
    "",
    "const controller = new AbortController();",
    "const stream = await openai.chat.completions.create({",
    "  model: 'deepseek-v3',",
    "  messages,",
    "  stream: true,",
    "}, { signal: controller.signal });",
    "",
    "for await (const chunk of stream) {",
    "  const text = chunk.choices[0]?.delta?.content || '';",
    "  reply.raw.write(`data: ${JSON.stringify({ text })}\\n\\n`);",
    "}",
    "reply.raw.end();",
]
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_background(slide, BG)
bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(0.15), SLIDE_HEIGHT)
bar.fill.solid()
bar.fill.fore_color.rgb = PRIMARY
bar.line.fill.background()
add_title_text(slide, "精彩代码 ① —— SSE流式输出，告别\"卡死\"假象", LEFT_MARGIN, Inches(0.4), Inches(12), Inches(0.6),
               font_size=26, bold=True, color=TEXT)
add_divider(slide, LEFT_MARGIN, Inches(0.95), Inches(2.5), PRIMARY, 3)
add_body_text(slide, "技术点：reply.hijack() + X-Accel-Buffering:no + AbortController",
              LEFT_MARGIN, Inches(1.1), Inches(12), Inches(0.3),
              font_size=12, color=MUTED)
add_code_block(slide, code_sse, LEFT_MARGIN, Inches(1.5), Inches(12), Inches(4))

# 效果对比
add_badge(slide, "改造前：等待10秒 → 一次性返回", LEFT_MARGIN, Inches(5.7), Inches(4.5), Inches(0.35),
          bg_color=WARNING, text_color=WHITE, font_size=11)
add_badge(slide, "改造后：首字<500ms → 实时逐字推送", Inches(5.5), Inches(5.7), Inches(5), Inches(0.35),
          bg_color=SECONDARY, text_color=WHITE, font_size=11)
print("Page 13 精彩代码① - 完成")

# Page 14: OneID
code_oneid = [
    "// OneID 匹配流程",
    "async function matchCustomer(order) {",
    "  // 1. 手机号精确匹配",
    "  let customer = await db.customer.findUnique({",
    "    where: { phone_hash: hashPhone(order.phone) }",
    "  });",
    "  ",
    "  // 2. 姓名+手机号后四位模糊匹配",
    "  if (!customer) {",
    "    customer = await fuzzyMatch(order.name, order.phone_mask);",
    "  }",
    "  ",
    "  // 3. 创建或更新快照",
    "  const snapshot = await upsertSnapshot(order);",
    "  ",
    "  // 4. 自动重算RFM",
    "  await recalculateRFM(customer.id);",
    "  ",
    "  // 5. 更新标签体系",
    "  await updateCustomerTags(customer.id, order);",
    "}",
]
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_background(slide, BG)
bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(0.15), SLIDE_HEIGHT)
bar.fill.solid()
bar.fill.fore_color.rgb = RGBColor(0x9C,0x27,0xB0)
bar.line.fill.background()
add_title_text(slide, "精彩代码 ② —— OneID客户智能合并", LEFT_MARGIN, Inches(0.4), Inches(12), Inches(0.6),
               font_size=26, bold=True, color=TEXT)
add_divider(slide, LEFT_MARGIN, Inches(0.95), Inches(2.5), RGBColor(0x9C,0x27,0xB0), 3)
add_body_text(slide, "技术点：手机号/mask匹配 → 快照检查 → 姓名兜底 → RFM重算",
              LEFT_MARGIN, Inches(1.1), Inches(12), Inches(0.3),
              font_size=12, color=MUTED)
add_code_block(slide, code_oneid, LEFT_MARGIN, Inches(1.5), Inches(12), Inches(3.8))
add_title_text(slide, "匹配率 > 95%", LEFT_MARGIN, Inches(5.5), Inches(3), Inches(0.4),
               font_size=24, bold=True, color=RGBColor(0x9C,0x27,0xB0))
print("Page 14 精彩代码② - 完成")

# Page 15: 订单状态机
code_state = [
    "// 订单状态机（服务端白名单校验）",
    "const ORDER_STATES = {",
    "  PENDING: 'pending',",
    "  ACCEPTED: 'accepted',",
    "  COOKING: 'cooking',",
    "  SERVED: 'served',",
    "  COMPLETED: 'completed',",
    "  CANCELLED: 'cancelled'",
    "};",
    "",
    "const VALID_TRANSITIONS = {",
    "  pending: ['accepted', 'cancelled'],",
    "  accepted: ['cooking', 'cancelled'],",
    "  cooking: ['served', 'cancelled'],",
    "  served: ['completed'],",
    "  completed: [],",
    "  cancelled: []",
    "};",
    "",
    "// 统计口径：只有 completed 订单进入经营分析",
    "function shouldIncludeInStats(order) {",
    "  return order.status === 'completed';",
    "}",
]
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_background(slide, BG)
bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(0.15), SLIDE_HEIGHT)
bar.fill.solid()
bar.fill.fore_color.rgb = SECONDARY
bar.line.fill.background()
add_title_text(slide, "精彩代码 ③ —— 订单状态机与数据口径", LEFT_MARGIN, Inches(0.4), Inches(12), Inches(0.6),
               font_size=26, bold=True, color=TEXT)
add_divider(slide, LEFT_MARGIN, Inches(0.95), Inches(2.8), SECONDARY, 3)
add_body_text(slide, "技术点：pending → accepted → cooking → served → completed/cancelled（服务端白名单校验）",
              LEFT_MARGIN, Inches(1.1), Inches(12), Inches(0.3),
              font_size=12, color=MUTED)
add_code_block(slide, code_state, LEFT_MARGIN, Inches(1.5), Inches(12), Inches(3.5))

# 状态机流程图
states = [("pending", PRIMARY), ("accepted", PRIMARY), ("cooking", PRIMARY), ("served", PRIMARY), ("completed", SECONDARY)]
for i, (state, color) in enumerate(states):
    left = Inches(0.8 + i * 2.3)
    top = Inches(5.2)
    box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, Inches(1.8), Inches(0.5))
    box.fill.solid()
    box.fill.fore_color.rgb = color
    box.line.fill.background()
    box.adjustments[0] = 0.2
    tf = box.text_frame
    p = tf.paragraphs[0]
    p.text = state
    p.font.size = Pt(11)
    p.font.color.rgb = WHITE
    p.font.name = "Microsoft YaHei"
    p.font.bold = True
    p.alignment = PP_ALIGN.CENTER
    if i < len(states) - 1:
        arrow = slide.shapes.add_shape(MSO_SHAPE.RIGHT_ARROW, left + Inches(1.85), top + Inches(0.12), Inches(0.4), Inches(0.26))
        arrow.fill.solid()
        arrow.fill.fore_color.rgb = MUTED
        arrow.line.fill.background()
print("Page 15 精彩代码③ - 完成")

print("\n前15页已完成，继续生成第16-36页...")

# 保存进度
OUTPUT_FILE = "D:\\餐小助\\餐小助_项目答辩PPT_完整版_V3_生成中.pptx"
prs.save(OUTPUT_FILE)
print(f"进度已保存: {OUTPUT_FILE}")
