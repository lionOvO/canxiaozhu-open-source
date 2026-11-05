#!/usr/bin/env python3
"""
基于V2模板生成餐小助项目答辩PPTX
复制V2的基础设施文件，重新生成15页幻灯片内容
"""

import zipfile
import shutil
import os
import re
from pathlib import Path

SRC_FILE = Path(r"D:\餐小助\餐小助_项目答辩PPT_重点问题解决与收获_V2.pptx")
OUT_FILE = Path(r"D:\餐小助\餐小助_项目答辩PPT_重点问题解决与收获.pptx")
TMP_DIR = Path(r"D:\餐小助\_pptx_build")

# 颜色
C_ORANGE = "FF6B35"
C_GREEN = "00C853"
C_RED = "FF3D00"
C_BROWN = "5B361F"
C_BG = "F7F8FA"
C_CARD = "FFFFFF"
C_TEXT = "1A1A1A"
C_MUTED = "666666"
C_WHITE = "FFFFFF"
C_BORDER = "E0E1E6"
C_DARK_BG = "261B14"

# V2幻灯片尺寸
SLIDE_W = 12191695
SLIDE_H = 6858000

def cm_to_emu(cm):
    return int(cm * 360000)

def make_shape_bg(sid, name, x, y, w, h, fill):
    """背景矩形"""
    return f'''<p:sp><p:nvSpPr><p:cNvPr id="{sid}" name="{name}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="{w}" cy="{h}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="{fill}"/></a:solidFill><a:ln><a:noFill/></a:ln><a:effectLst/></p:spPr><p:style><a:lnRef idx="1"><a:schemeClr val="accent1"/></a:lnRef><a:fillRef idx="3"><a:schemeClr val="accent1"/></a:fillRef><a:effectRef idx="2"><a:schemeClr val="accent1"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="lt1"/></a:fontRef></p:style><p:txBody><a:bodyPr rtlCol="0" anchor="ctr"/><a:lstStyle/><a:p><a:pPr algn="ctr"/></a:p></p:txBody></p:sp>'''

def make_top_bar(sid):
    """顶部橙色条"""
    return make_shape_bg(sid, "TopBar", 0, 0, SLIDE_W, 128016, C_ORANGE)

def make_sep_line(sid, x=502920, y=384048, w=64008, h=384048):
    """橙色分隔线"""
    return make_shape_bg(sid, "SepLine", x, y, w, h, C_ORANGE)

def make_textbox(sid, name, x, y, w, h, text, font_size=2400, bold="1", color=C_TEXT, align="l", font="微软雅黑"):
    """文本框"""
    return f'''<p:sp><p:nvSpPr><p:cNvPr id="{sid}" name="{name}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="{w}" cy="{h}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr><p:txBody><a:bodyPr wrap="square" anchor="t" lIns="0" rIns="0" tIns="0" bIns="0"><a:spAutoFit/></a:bodyPr><a:lstStyle/><a:p><a:pPr algn="{align}"/><a:r><a:rPr sz="{font_size}" b="{bold}" i="0"><a:solidFill><a:srgbClr val="{color}"/></a:solidFill><a:latin typeface="{font}"/><a:ea typeface="{font}"/></a:rPr><a:t>{text}</a:t></a:r></a:p></p:txBody></p:sp>'''

def make_rounded_card(sid, name, x, y, w, h, fill=C_CARD, border=C_BORDER):
    """圆角卡片"""
    return f'''<p:sp><p:nvSpPr><p:cNvPr id="{sid}" name="{name}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="{w}" cy="{h}"/></a:xfrm><a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val 6000"/></a:avLst></a:prstGeom><a:solidFill><a:srgbClr val="{fill}"/></a:solidFill><a:ln w="15240"><a:solidFill><a:srgbClr val="{border}"/></a:solidFill></a:ln><a:effectLst/></p:spPr><p:style><a:lnRef idx="1"><a:schemeClr val="accent1"/></a:lnRef><a:fillRef idx="3"><a:schemeClr val="accent1"/></a:fillRef><a:effectRef idx="2"><a:schemeClr val="accent1"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="lt1"/></a:fontRef></p:style><p:txBody><a:bodyPr rtlCol="0" anchor="ctr"/><a:lstStyle/><a:p><a:pPr algn="ctr"/></a:p></p:txBody></p:sp>'''

def make_pill(sid, name, x, y, w, h, text, fill=C_ORANGE, font_size=1100):
    """标签"""
    return f'''<p:sp><p:nvSpPr><p:cNvPr id="{sid}" name="{name}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="{w}" cy="{h}"/></a:xfrm><a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val 16000"/></a:avLst></a:prstGeom><a:solidFill><a:srgbClr val="{fill}"/></a:solidFill><a:ln><a:noFill/></a:ln><a:effectLst/></p:spPr><p:style><a:lnRef idx="1"><a:schemeClr val="accent1"/></a:lnRef><a:fillRef idx="3"><a:schemeClr val="accent1"/></a:fillRef><a:effectRef idx="2"><a:schemeClr val="accent1"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="lt1"/></a:fontRef></p:style><p:txBody><a:bodyPr rtlCol="0" anchor="ctr"/><a:lstStyle/><a:p><a:pPr algn="ctr"/><a:r><a:rPr sz="{font_size}" b="1" i="0"><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:latin typeface="微软雅黑"/><a:ea typeface="微软雅黑"/></a:rPr><a:t>{text}</a:t></a:r></a:p></p:txBody></p:sp>'''

def make_oval(sid, name, x, y, w, h, fill, alpha=30000):
    """装饰圆"""
    return f'''<p:sp><p:nvSpPr><p:cNvPr id="{sid}" name="{name}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="{w}" cy="{h}"/></a:xfrm><a:prstGeom prst="ellipse"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="{fill}"><a:alpha val="{alpha}"/></a:srgbClr></a:solidFill><a:ln><a:noFill/></a:ln><a:effectLst/></p:spPr><p:style><a:lnRef idx="1"><a:schemeClr val="accent1"/></a:lnRef><a:fillRef idx="3"><a:schemeClr val="accent1"/></a:fillRef><a:effectRef idx="2"><a:schemeClr val="accent1"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="lt1"/></a:fontRef></p:style><p:txBody><a:bodyPr rtlCol="0" anchor="ctr"/><a:lstStyle/><a:p><a:pPr algn="ctr"/></a:p></p:txBody></p:sp>'''

def make_bullet_textbox(sid, name, x, y, w, h, items, font_size=1300, color=C_MUTED):
    """多行文本框（带项目符号）"""
    paras = ""
    for item in items:
        paras += f'''<a:p><a:pPr algn="l" marL="228600"/><a:r><a:rPr sz="{font_size}" b="0" i="0"><a:solidFill><a:srgbClr val="{color}"/></a:solidFill><a:latin typeface="微软雅黑"/><a:ea typeface="微软雅黑"/></a:rPr><a:t>• {item}</a:t></a:r></a:p>'''
    return f'''<p:sp><p:nvSpPr><p:cNvPr id="{sid}" name="{name}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="{w}" cy="{h}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr><p:txBody><a:bodyPr wrap="square" anchor="t" lIns="91440" rIns="91440" tIns="45720" bIns="45720"><a:spAutoFit/></a:bodyPr><a:lstStyle/>{paras}</p:txBody></p:sp>'''

def make_slide_header(sp_shapes, sid, title, subtitle):
    """添加页面标题和副标题"""
    sp_shapes.append(make_top_bar(sid)); sid += 1
    sp_shapes.append(make_sep_line(sid)); sid += 1
    sp_shapes.append(make_textbox(sid, "CONTENTS", 713232, 347472, 7772400, 274320, "CONTENTS", 1100, "1", C_ORANGE)); sid += 1
    sp_shapes.append(make_textbox(sid, "Title", 713232, 566928, 9601200, 457200, title, 2400, "1", C_TEXT)); sid += 1
    if subtitle:
        sp_shapes.append(make_textbox(sid, "Subtitle", 713232, 1050000, 10000000, 300000, subtitle, 1200, "0", C_MUTED)); sid += 1
    return sid

def make_content_page(title, subtitle, cards):
    """通用内容页：2列卡片布局"""
    sp_shapes = []
    sid = 2
    sp_shapes.append(make_shape_bg(sid, "Background", 0, 0, SLIDE_W, SLIDE_H, C_BG)); sid += 1
    sid = make_slide_header(sp_shapes, sid, title, subtitle)

    for i, card in enumerate(cards):
        col = i % 2
        row = i // 2
        x = 502920 + col * 5842000
        y = 1400000 + row * 2400000
        w = 5600000
        h = 2100000

        sp_shapes.append(make_rounded_card(sid, f"Card{i}", x, y, w, h)); sid += 1

        if card.get("tag"):
            sp_shapes.append(make_pill(sid, f"Tag{i}", x + 100000, y + 80000, 800000, 320000, card["tag"], card.get("tag_color", C_ORANGE), 1100)); sid += 1
            title_y = y + 450000
        else:
            title_y = y + 100000

        sp_shapes.append(make_textbox(sid, f"CTitle{i}", x + 100000, title_y, w - 200000, 350000, card["title"], 1600, "1", C_TEXT)); sid += 1

        if card.get("content"):
            content_y = title_y + 380000
            content_h = h - (content_y - y) - 100000
            sp_shapes.append(make_bullet_textbox(sid, f"CContent{i}", x + 100000, content_y, w - 200000, content_h, card["content"], 1200, C_MUTED)); sid += 1

    return build_slide_xml(sp_shapes)

def make_cover_page():
    """封面页"""
    sp_shapes = []
    sid = 2
    # 深色背景
    sp_shapes.append(make_shape_bg(sid, "Background", 0, 0, SLIDE_W, SLIDE_H, C_DARK_BG)); sid += 1
    # 顶部橙色条
    sp_shapes.append(make_top_bar(sid)); sid += 1
    # 底部橙色条
    sp_shapes.append(make_shape_bg(sid, "BottomBar", 0, SLIDE_H - 146304, SLIDE_W, 146304, C_ORANGE)); sid += 1
    # 装饰圆
    sp_shapes.append(make_oval(sid, "Blob1", 8000000, -200000, 4000000, 3000000, C_ORANGE, 20000)); sid += 1
    sp_shapes.append(make_oval(sid, "Blob2", -500000, 4500000, 3500000, 2500000, C_GREEN, 25000)); sid += 1

    # 技术栈标签
    sp_shapes.append(make_pill(sid, "TechTag", 914400, 822960, 4500000, 400000, "Vue3 + Fastify + Prisma + AI + Docker", C_GREEN, 1200)); sid += 1

    # 主标题
    sp_shapes.append(make_textbox(sid, "MainTitle", 914400, 1500000, 10000000, 700000, "餐小助", 4800, "1", C_WHITE, "l")); sid += 1

    # 副标题
    sp_shapes.append(make_textbox(sid, "SubTitle", 914400, 2300000, 10000000, 500000, "商户智能经营助手", 3000, "1", C_WHITE, "l")); sid += 1

    # 描述
    sp_shapes.append(make_textbox(sid, "Desc", 914400, 2900000, 10000000, 300000, "项目答辩——从\"会写页面\"到\"能交付系统\"", 1400, "0", "FFD0B8", "l")); sid += 1

    # 分隔线
    sp_shapes.append(make_shape_bg(sid, "SepLine", 914400, 3300000, 5000000, 30000, C_ORANGE)); sid += 1

    # 底部信息
    sp_shapes.append(make_textbox(sid, "Footer", 914400, 3400000, 10000000, 300000, "答辩人：餐小助团队    2026年8月", 1200, "0", "FFD0B8", "l")); sid += 1

    return build_slide_xml(sp_shapes)

def make_toc_page():
    """目录页"""
    sp_shapes = []
    sid = 2
    sp_shapes.append(make_shape_bg(sid, "Background", 0, 0, SLIDE_W, SLIDE_H, C_BG)); sid += 1
    sid = make_slide_header(sp_shapes, sid, "答辩提纲", "五大章节，重点聚焦问题与收获")

    items = [
        ("01", "项目介绍", "中小餐饮的\"数字店长\"", C_ORANGE),
        ("02", "功能与技术", "八大模块 + 全栈架构", C_GREEN),
        ("03", "问题与解决", "开发中的技术挑战（重点）", C_RED),
        ("04", "收获与成长", "从技术栈到工程思维（重点）", C_BROWN),
        ("05", "成果展望", "量化成果与未来方向", C_GREEN),
    ]

    for i, (num, title, desc, color) in enumerate(items):
        y = 1500000 + i * 900000
        sp_shapes.append(make_rounded_card(sid, f"TOC{i}", 502920, y, 11183112, 750000)); sid += 1
        # 编号圆
        sp_shapes.append(make_oval(sid, f"Num{i}", 600000, y + 100000, 550000, 550000, color, 0)); sid += 1
        sp_shapes.append(make_textbox(sid, f"NumText{i}", 600000, y + 100000, 550000, 550000, num, 2000, "1", C_WHITE, "ctr")); sid += 1
        # 标题
        sp_shapes.append(make_textbox(sid, f"TOCTitle{i}", 1300000, y + 120000, 3000000, 300000, title, 1800, "1", C_TEXT)); sid += 1
        # 描述
        sp_shapes.append(make_textbox(sid, f"TOCDesc{i}", 1300000, y + 420000, 9000000, 250000, desc, 1200, "0", C_MUTED)); sid += 1

    return build_slide_xml(sp_shapes)

def make_transition_page(title, subtitle):
    """过渡页"""
    sp_shapes = []
    sid = 2
    # 深色背景
    sp_shapes.append(make_shape_bg(sid, "Background", 0, 0, SLIDE_W, SLIDE_H, C_BROWN)); sid += 1
    # 装饰圆
    sp_shapes.append(make_oval(sid, "Blob1", 8000000, -200000, 4000000, 3000000, C_ORANGE, 20000)); sid += 1
    sp_shapes.append(make_oval(sid, "Blob2", -500000, 4500000, 3500000, 2500000, C_GREEN, 25000)); sid += 1
    # 标签
    sp_shapes.append(make_pill(sid, "CoreTag", 4500000, 1800000, 3000000, 400000, "CORE SECTION", C_ORANGE, 1400)); sid += 1
    # 标题
    sp_shapes.append(make_textbox(sid, "TransTitle", 914400, 2400000, 10000000, 700000, title, 4400, "1", C_WHITE, "ctr")); sid += 1
    # 分隔线
    sp_shapes.append(make_shape_bg(sid, "SepLine", 4000000, 3200000, 4000000, 30000, C_ORANGE)); sid += 1
    # 副标题
    sp_shapes.append(make_textbox(sid, "TransSub", 914400, 3400000, 10000000, 300000, subtitle, 1600, "0", "FFD0B8", "ctr")); sid += 1

    return build_slide_xml(sp_shapes)

def make_ending_page():
    """结尾页"""
    sp_shapes = []
    sid = 2
    # 橙色背景
    sp_shapes.append(make_shape_bg(sid, "Background", 0, 0, SLIDE_W, SLIDE_H, C_ORANGE)); sid += 1
    # 装饰圆
    sp_shapes.append(make_oval(sid, "Blob1", 8000000, -200000, 4000000, 3000000, C_WHITE, 20000)); sid += 1
    sp_shapes.append(make_oval(sid, "Blob2", -500000, 4500000, 3500000, 2500000, C_GREEN, 25000)); sid += 1
    # 感谢
    sp_shapes.append(make_textbox(sid, "Thanks", 914400, 2000000, 10000000, 800000, "感谢聆听", 5600, "1", C_WHITE, "ctr")); sid += 1
    # 分隔线
    sp_shapes.append(make_shape_bg(sid, "SepLine", 4000000, 3000000, 4000000, 30000, C_WHITE)); sid += 1
    # Slogan
    sp_shapes.append(make_textbox(sid, "Slogan", 914400, 3200000, 10000000, 400000, "餐小助 · 让AI帮你盯店，你只管做好菜", 2000, "0", "FFE0D0", "ctr")); sid += 1

    return build_slide_xml(sp_shapes)

def build_slide_xml(sp_shapes):
    """构建幻灯片XML"""
    shapes_xml = "\n".join(sp_shapes)
    return f'''<?xml version='1.0' encoding='UTF-8' standalone='yes'?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>{shapes_xml}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>'''

def build_presentation_xml(num_slides):
    """构建presentation.xml"""
    sld_ids = ""
    for i in range(num_slides):
        sld_ids += f'<p:sldId id="{256 + i}" r:id="rId{7 + i}"/>'
    return f'''<?xml version='1.0' encoding='UTF-8' standalone='yes'?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" saveSubsetFonts="1" autoCompressPictures="0"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>{sld_ids}</p:sldIdLst><p:sldSz cx="12191695" cy="6858000" type="screen4x3"/><p:notesSz cx="6858000" cy="9144000"/><p:defaultTextStyle><a:defPPr><a:defRPr lang="en-US"/></a:defPPr><a:lvl1pPr marL="0" algn="l" defTabSz="457200" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1"><a:defRPr sz="1800" kern="1200"><a:solidFill><a:schemeClr val="tx1"/></a:solidFill><a:latin typeface="+mn-lt"/><a:ea typeface="+mn-ea"/><a:cs typeface="+mn-cs"/></a:defRPr></a:lvl1pPr><a:lvl2pPr marL="457200" algn="l" defTabSz="457200" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1"><a:defRPr sz="1800" kern="1200"><a:solidFill><a:schemeClr val="tx1"/></a:solidFill><a:latin typeface="+mn-lt"/><a:ea typeface="+mn-ea"/><a:cs typeface="+mn-cs"/></a:defRPr></a:lvl2pPr><a:lvl3pPr marL="914400" algn="l" defTabSz="457200" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1"><a:defRPr sz="1800" kern="1200"><a:solidFill><a:schemeClr val="tx1"/></a:solidFill><a:latin typeface="+mn-lt"/><a:ea typeface="+mn-ea"/><a:cs typeface="+mn-cs"/></a:defRPr></a:lvl3pPr><a:lvl4pPr marL="1371600" algn="l" defTabSz="457200" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1"><a:defRPr sz="1800" kern="1200"><a:solidFill><a:schemeClr val="tx1"/></a:solidFill><a:latin typeface="+mn-lt"/><a:ea typeface="+mn-ea"/><a:cs typeface="+mn-cs"/></a:defRPr></a:lvl4pPr><a:lvl5pPr marL="1828800" algn="l" defTabSz="457200" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1"><a:defRPr sz="1800" kern="1200"><a:solidFill><a:schemeClr val="tx1"/></a:solidFill><a:latin typeface="+mn-lt"/><a:ea typeface="+mn-ea"/><a:cs typeface="+mn-cs"/></a:defRPr></a:lvl5pPr><a:lvl6pPr marL="2286000" algn="l" defTabSz="457200" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1"><a:defRPr sz="1800" kern="1200"><a:solidFill><a:schemeClr val="tx1"/></a:solidFill><a:latin typeface="+mn-lt"/><a:ea typeface="+mn-ea"/><a:cs typeface="+mn-cs"/></a:defRPr></a:lvl6pPr><a:lvl7pPr marL="2743200" algn="l" defTabSz="457200" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1"><a:defRPr sz="1800" kern="1200"><a:solidFill><a:schemeClr val="tx1"/></a:solidFill><a:latin typeface="+mn-lt"/><a:ea typeface="+mn-ea"/><a:cs typeface="+mn-cs"/></a:defRPr></a:lvl7pPr><a:lvl8pPr marL="3200400" algn="l" defTabSz="457200" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1"><a:defRPr sz="1800" kern="1200"><a:solidFill><a:schemeClr val="tx1"/></a:solidFill><a:latin typeface="+mn-lt"/><a:ea typeface="+mn-ea"/><a:cs typeface="+mn-cs"/></a:defRPr></a:lvl8pPr><a:lvl9pPr marL="3657600" algn="l" defTabSz="457200" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1"><a:defRPr sz="1800" kern="1200"><a:solidFill><a:schemeClr val="tx1"/></a:solidFill><a:latin typeface="+mn-lt"/><a:ea typeface="+mn-ea"/><a:cs typeface="+mn-cs"/></a:defRPr></a:lvl9pPr></p:defaultTextStyle></p:presentation>'''

def build_presentation_rels(num_slides):
    """构建presentation rels"""
    rels = '<?xml version=\'1.0\' encoding=\'UTF-8\' standalone=\'yes\'?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    rels += '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>'
    rels += '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>'
    rels += '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="slideLayouts/slideLayout1.xml"/>'
    rels += '<Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="slideLayouts/slideLayout2.xml"/>'
    rels += '<Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="slideLayouts/slideLayout3.xml"/>'
    rels += '<Relationship Id="rId6" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="slideLayouts/slideLayout4.xml"/>'
    for i in range(num_slides):
        rels += f'<Relationship Id="rId{7 + i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide{i + 1}.xml"/>'
    rels += '</Relationships>'
    return rels

def build_content_types(num_slides):
    """构建Content_Types.xml"""
    types = '<?xml version=\'1.0\' encoding=\'UTF-8\' standalone=\'yes\'?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    types += '<Default Extension="bin" ContentType="application/vnd.openxmlformats-officedocument.presentationml.printerSettings"/>'
    types += '<Default Extension="jpeg" ContentType="image/jpeg"/>'
    types += '<Default Extension="png" ContentType="image/png"/>'
    types += '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
    types += '<Default Extension="xml" ContentType="application/xml"/>'
    types += '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>'
    types += '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>'
    types += '<Override PartName="/docProps/thumbnail.jpeg" ContentType="image/jpeg"/>'
    types += '<Override PartName="/ppt/presProps.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presProps+xml"/>'
    types += '<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>'
    types += '<Override PartName="/ppt/tableStyles.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.tableStyles+xml"/>'
    types += '<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>'
    types += '<Override PartName="/ppt/viewProps.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.viewProps+xml"/>'
    types += '<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>'
    for i in range(1, 12):
        types += f'<Override PartName="/ppt/slideLayouts/slideLayout{i}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>'
    for i in range(1, num_slides + 1):
        types += f'<Override PartName="/ppt/slides/slide{i}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>'
    types += '</Types>'
    return types

def create_pptx():
    """创建PPTX文件"""
    NUM_SLIDES = 15

    # 清理临时目录
    if TMP_DIR.exists():
        shutil.rmtree(TMP_DIR)
    TMP_DIR.mkdir(parents=True)

    # 从V2提取基础设施文件
    with zipfile.ZipFile(SRC_FILE, 'r') as src_z:
        infra_files = [
            '[Content_Types].xml',
            '_rels/.rels',
            'docProps/app.xml',
            'docProps/core.xml',
            'docProps/thumbnail.jpeg',
            'ppt/presProps.xml',
            'ppt/tableStyles.xml',
            'ppt/viewProps.xml',
            'ppt/theme/theme1.xml',
            'ppt/slideMasters/slideMaster1.xml',
            'ppt/slideMasters/_rels/slideMaster1.xml.rels',
        ]
        for i in range(1, 12):
            infra_files.append(f'ppt/slideLayouts/slideLayout{i}.xml')
            infra_files.append(f'ppt/slideLayouts/_rels/slideLayout{i}.xml.rels')
        infra_files.append('ppt/printerSettings/printerSettings1.bin')

        for f in infra_files:
            try:
                data = src_z.read(f)
                out_path = TMP_DIR / f
                out_path.parent.mkdir(parents=True, exist_ok=True)
                out_path.write_bytes(data)
            except KeyError:
                pass

    # 生成幻灯片内容
    slides_data = [
        # Slide 1: 封面
        ("cover", None, None),
        # Slide 2: 目录
        ("toc", None, None),
        # Slide 3: 项目定位
        ("content", "项目定位：中小餐饮的\"数字店长\"", "中小餐饮平均寿命18个月，死因是\"不会算账、不会管客、不会控损耗\"", [
            {"tag": "痛点", "tag_color": C_RED, "title": "核心痛点", "content": ["中小餐饮平均寿命仅18个月", "不会算账、不会管客、不会控损耗", "多渠道数据孤岛，对账困难"]},
            {"tag": "方案", "tag_color": C_GREEN, "title": "解决方案", "content": ["AI经营助手，自动算账、管客、控损耗", "接入美团/饿了么/抖音等多渠道数据", "每日自动生成经营日报"]},
            {"tag": "价值", "tag_color": C_ORANGE, "title": "量化价值", "content": ["单店月均降本3000元", "单店月均增收5000元", "综合经营效率提升30%"]},
            {"tag": "形态", "tag_color": C_BROWN, "title": "产品形态", "content": ["PC商户后台：复杂配置与数据看板", "手机端商户页：移动查看关键数据", "顾客扫码点餐页：桌码进入点餐"]},
        ]),
        # Slide 4: 功能架构
        ("content", "八大模块覆盖经营全链路", "围绕PRD的8大模块，当前项目已覆盖核心可演示链路", [
            {"tag": "核心", "tag_color": C_ORANGE, "title": "AI经营驾驶舱", "content": ["日报自动生成、多渠道对账", "异常预警、语音问答"]},
            {"tag": "核心", "tag_color": C_ORANGE, "title": "客户资产管家", "content": ["OneID打通、38个自动标签", "RFM分层、流失预警与召回"]},
            {"tag": "核心", "tag_color": C_ORANGE, "title": "菜品盈利分析", "content": ["四象限分类、购物篮分析", "成本波动监控"]},
            {"tag": "核心", "tag_color": C_ORANGE, "title": "智能采购与库存", "content": ["销量预测、智能采购单", "效期预警"]},
            {"tag": "扩展", "tag_color": C_GREEN, "title": "智能定价与促销", "content": ["动态定价、AI促销方案", "分层发券"]},
            {"tag": "扩展", "tag_color": C_GREEN, "title": "员工/评价/系统", "content": ["员工排班、评价口碑", "系统管理"]},
        ]),
        # Slide 5: 技术架构
        ("content", "全栈技术架构", "前端三端 + 后端服务 + AI层 + 数据层 + 云部署", [
            {"tag": "前端", "tag_color": C_GREEN, "title": "前端展示层", "content": ["Vue3 + Pinia + Vue Router + ECharts", "PC商户后台 + 手机商户端 + 顾客扫码页"]},
            {"tag": "后端", "tag_color": C_ORANGE, "title": "业务接口层", "content": ["Fastify 5 + Prisma 6 + TypeBox", "Swagger文档、CORS、Helmet、RateLimit"]},
            {"tag": "AI", "tag_color": C_BROWN, "title": "AI能力层", "content": ["DeepSeek-V3（推理）、通义千问-Max（BI）", "豆包-Pro（创意）、文心一言-4.0（NLP）"]},
            {"tag": "部署", "tag_color": C_RED, "title": "云部署层", "content": ["Docker Compose + Nginx", "腾讯云公网IP、数据卷持久化"]},
        ]),
        # Slide 6: 业务闭环
        ("content", "业务闭环：从顾客下单到商户决策", "数据不再只是页面展示，而是可持续计算、追踪、复盘的经营资产", [
            {"tag": "顾客端", "tag_color": C_ORANGE, "title": "扫码点餐", "content": ["桌码token自动识别桌号", "菜品、数量、称呼、手机号、备注", "购物车、加菜、订单状态"]},
            {"tag": "商户端", "tag_color": C_GREEN, "title": "接单与分析", "content": ["订单队列、状态流转动画", "数据沉淀到客户/菜品/评价", "AI日报、采购建议、经营分析"]},
            {"tag": "数据", "tag_color": C_BROWN, "title": "数据模型", "content": ["OneID客户主数据、订单事实表", "菜品维度表、标签体系", "订单状态机白名单校验"]},
            {"tag": "AI", "tag_color": C_RED, "title": "智能辅助", "content": ["SSE流式AI问答", "多模型路由策略", "置信度标注、可解释输出"]},
        ]),
        # Slide 7: 核心模块
        ("content", "三大核心模块落地", "用具体数据和场景证明产品价值", [
            {"tag": "模块一", "tag_color": C_ORANGE, "title": "经营驾驶舱", "content": ["每日8点AI日报自动推送", "含营收/利润/TOP3/异常/建议", "生成时间 < 30秒"]},
            {"tag": "模块二", "tag_color": C_GREEN, "title": "客户资产", "content": ["OneID跨平台合并客户", "手机号匹配率 > 95%", "自动RFM重算 + 流失风险评分"]},
            {"tag": "模块三", "tag_color": C_BROWN, "title": "智能采购", "content": ["基于90天历史 + 天气预测销量", "自动生成采购单", "损耗率从12%降至5%"]},
        ]),
        # Slide 8: 过渡页 - 问题与解决
        ("transition", "遇到的问题及解决方案", "答辩要求第3条重点 · 真实开发不是一路顺风"),
        # Slide 9: 问题1
        ("content", "问题①：AI回复\"卡死\"的假象", "用户体验优化：从\"等待\"到\"观看\"", [
            {"tag": "现象", "tag_color": C_RED, "title": "问题现象", "content": ["AI生成经营日报时，用户等待10秒以上无反馈", "用户误以为系统卡死，反复点击"]},
            {"tag": "原因", "tag_color": C_BROWN, "title": "原因分析", "content": ["非流式返回，用户看不到\"思考中\"的状态", "缺少进度反馈机制"]},
            {"tag": "解决", "tag_color": C_GREEN, "title": "解决方案", "content": ["采用SSE流式输出（Server-Sent Events）", "reply.hijack() + X-Accel-Buffering:no", "AbortController控制停止生成"]},
            {"tag": "效果", "tag_color": C_ORANGE, "title": "最终效果", "content": ["用户实时看到AI逐字生成", "体验从\"等待\"变为\"观看\"", "支持停止生成和禁用重复发送"]},
        ]),
        # Slide 10: 问题2
        ("content", "问题②：AI不能\"编\"数据", "经营系统的底线——绝不误导用户", [
            {"tag": "现象", "tag_color": C_RED, "title": "问题现象", "content": ["AI模型未连接时，可能生成虚假经营分析", "LLM幻觉：模型会自信地编造数据"]},
            {"tag": "原因", "tag_color": C_BROWN, "title": "原因分析", "content": ["降级mock容易误导真实经营判断", "没有数据源标记和校验机制"]},
            {"tag": "解决", "tag_color": C_GREEN, "title": "解决方案", "content": ["dataSource标记（real_orders | insufficient）", "只统计served/completed订单", "AI输出标注置信度"]},
            {"tag": "效果", "tag_color": C_ORANGE, "title": "最终效果", "content": ["模型不可用时直接展示失败原因", "不伪造经营建议", "经营系统的底线：绝不误导用户"]},
        ]),
        # Slide 11: 问题3
        ("content", "问题③：从开发到上线的最后一公里", "全链路交付能力和运维思维", [
            {"tag": "问题A", "tag_color": C_RED, "title": "二维码外网访问", "content": ["二维码使用localhost导致外网打不开", "解决：公网域名 + Nginx反向代理"]},
            {"tag": "问题B", "tag_color": C_RED, "title": "服务器显示旧页面", "content": ["Nginx缓存导致页面不更新", "解决：缓存清理 + Docker镜像版本化"]},
            {"tag": "问题C", "tag_color": C_RED, "title": "Docker部署冲突", "content": ["端口冲突、中文路径导致compose失败", "解决：固定project name、独立端口18080"]},
            {"tag": "问题D", "tag_color": C_RED, "title": "订单统计不准", "content": ["取消订单被错误计入销量", "解决：状态机白名单，只统计completed"]},
        ]),
        # Slide 12: 过渡页 - 收获与成长
        ("transition", "项目完成后的收获", "答辩要求第4条重点 · 从\"写页面\"到\"做系统\""),
        # Slide 13: 技术收获
        ("content", "从技术栈到工程思维", "这次项目最大的价值，是从\"会写页面\"走向\"能交付系统\"", [
            {"tag": "前端", "tag_color": C_GREEN, "title": "前端能力", "content": ["Vue3多端页面开发", "Pinia状态管理、Vue Router路由", "移动端弹层滚动、响应式布局"]},
            {"tag": "后端", "tag_color": C_ORANGE, "title": "后端能力", "content": ["Fastify接口设计、Prisma数据建模", "注册登录、短信验证码、订单接口", "客户、菜品、采购、评价、天气接口"]},
            {"tag": "AI", "tag_color": C_BROWN, "title": "AI工程化", "content": ["SSE流式输出、多模型路由", "Prompt工程、Tool Schema设计", "置信度标注、可解释输出"]},
            {"tag": "运维", "tag_color": C_RED, "title": "部署运维", "content": ["Docker Compose三阶段构建", "Nginx反向代理、腾讯云服务器", "通过日志、curl定位问题"]},
        ]),
        # Slide 14: 成果展望
        ("content", "成果与未来方向", "已完成核心闭环，未来持续扩展", [
            {"tag": "已完成", "tag_color": C_GREEN, "title": "项目成果", "content": ["三端系统：PC后台 + 手机 + 顾客扫码", "8大模块、AI日报、客户OneID", "菜品四象限、智能采购、Docker部署"]},
            {"tag": "量化", "tag_color": C_ORANGE, "title": "量化目标", "content": ["每日节省对账时间1.5小时", "损耗率从12%降至5%", "复购率提升20%"]},
            {"tag": "未来", "tag_color": C_BROWN, "title": "未来扩展", "content": ["连锁多店看板、供应链比价", "AI外呼召回、行业垂直方案", "MySQL替换、HTTPS域名"]},
        ]),
        # Slide 15: 结尾
        ("ending", None, None),
    ]

    # 生成幻灯片XML
    slide_xmls = []
    for slide_info in slides_data:
        slide_type = slide_info[0]
        if slide_type == "cover":
            slide_xmls.append(make_cover_page())
        elif slide_type == "toc":
            slide_xmls.append(make_toc_page())
        elif slide_type == "transition":
            slide_xmls.append(make_transition_page(slide_info[1], slide_info[2]))
        elif slide_type == "ending":
            slide_xmls.append(make_ending_page())
        elif slide_type == "content":
            slide_xmls.append(make_content_page(slide_info[1], slide_info[2], slide_info[3]))

    # 写入幻灯片文件
    for i, xml in enumerate(slide_xmls, 1):
        slide_path = TMP_DIR / f"ppt/slides/slide{i}.xml"
        slide_path.parent.mkdir(parents=True, exist_ok=True)
        slide_path.write_text(xml, encoding='utf-8')

        # 写入rels
        rels_path = TMP_DIR / f"ppt/slides/_rels/slide{i}.xml.rels"
        rels_path.parent.mkdir(parents=True, exist_ok=True)
        rels_path.write_text('<?xml version=\'1.0\' encoding=\'UTF-8\' standalone=\'yes\'?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>', encoding='utf-8')

    # 更新presentation.xml
    pres_path = TMP_DIR / "ppt/presentation.xml"
    pres_path.write_text(build_presentation_xml(NUM_SLIDES), encoding='utf-8')

    # 更新presentation rels
    pres_rels_path = TMP_DIR / "ppt/_rels/presentation.xml.rels"
    pres_rels_path.parent.mkdir(parents=True, exist_ok=True)
    pres_rels_path.write_text(build_presentation_rels(NUM_SLIDES), encoding='utf-8')

    # 更新Content_Types
    ct_path = TMP_DIR / "[Content_Types].xml"
    ct_path.write_text(build_content_types(NUM_SLIDES), encoding='utf-8')

    # 打包PPTX
    if OUT_FILE.exists():
        OUT_FILE.unlink()

    with zipfile.ZipFile(OUT_FILE, 'w', zipfile.ZIP_DEFLATED) as zf:
        for file_path in TMP_DIR.rglob('*'):
            if file_path.is_file():
                arcname = str(file_path.relative_to(TMP_DIR))
                zf.write(file_path, arcname)

    # 清理临时目录
    shutil.rmtree(TMP_DIR)

    print(f"PPTX文件已生成: {OUT_FILE}")
    print(f"文件大小: {OUT_FILE.stat().st_size} bytes")
    print(f"幻灯片数量: {NUM_SLIDES}")

if __name__ == '__main__':
    create_pptx()
