#!/usr/bin/env python3
"""
餐小助项目答辩PPT生成器 - 使用ElementTree正确构建XML
彻底解决编码和XML结构问题
"""
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

OUT = Path(r"D:\餐小助\餐小助_项目答辩PPT_v4.pptx")

# 颜色
ORANGE = "FF6B35"
GREEN = "00C853"
RED = "FF3D00"
BROWN = "5B361F"
BG = "F7F8FA"
CARD = "FFFFFF"
TEXT = "1A1A1A"
MUTED = "666666"
WHITE = "FFFFFF"
BORDER = "E0E0E0"

# EMU转换
def emu(cm):
    return int(cm * 360000)

SW = emu(33.867)
SH = emu(19.05)

# XML命名空间
NSMAP = {
    'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
    'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
    'p': 'http://schemas.openxmlformats.org/presentationml/2006/main',
}

def register_ns():
    for prefix, uri in NSMAP.items():
        ET.register_namespace(prefix, uri)

register_ns()

def make_solid_fill(color):
    fill = ET.Element(f'{{{NSMAP["a"]}}}solidFill')
    clr = ET.SubElement(fill, f'{{{NSMAP["a"]}}}srgbClr', val=color)
    return fill

def make_no_fill():
    return ET.Element(f'{{{NSMAP["a"]}}}noFill')

def make_ln(w="0", color=None):
    ln = ET.Element(f'{{{NSMAP["a"]}}}ln', w=str(w))
    if color:
        sf = ET.SubElement(ln, f'{{{NSMAP["a"]}}}solidFill')
        ET.SubElement(sf, f'{{{NSMAP["a"]}}}srgbClr', val=color)
    else:
        ET.SubElement(ln, f'{{{NSMAP["a"]}}}noFill')
    return ln

def make_xfrm(x, y, cx, cy):
    xfrm = ET.Element(f'{{{NSMAP["a"]}}}xfrm')
    ET.SubElement(xfrm, f'{{{NSMAP["a"]}}}off', x=str(x), y=str(y))
    ET.SubElement(xfrm, f'{{{NSMAP["a"]}}}ext', cx=str(cx), cy=str(cy))
    return xfrm

def make_prst_geom(prst, adj=None):
    geom = ET.Element(f'{{{NSMAP["a"]}}}prstGeom', prst=prst)
    if adj:
        avlst = ET.SubElement(geom, f'{{{NSMAP["a"]}}}avLst')
        ET.SubElement(avlst, f'{{{NSMAP["a"]}}}gd', name="adj", fmla=f"val {adj}")
    else:
        ET.SubElement(geom, f'{{{NSMAP["a"]}}}avLst')
    return geom

def make_rpr(sz, bold=False, color=TEXT):
    rpr = ET.Element(f'{{{NSMAP["a"]}}}rPr', lang="zh-CN", sz=str(sz), dirty="0")
    sf = ET.SubElement(rpr, f'{{{NSMAP["a"]}}}solidFill')
    ET.SubElement(sf, f'{{{NSMAP["a"]}}}srgbClr', val=color)
    ET.SubElement(rpr, f'{{{NSMAP["a"]}}}latin', typeface="Microsoft YaHei")
    ET.SubElement(rpr, f'{{{NSMAP["a"]}}}ea', typeface="Microsoft YaHei")
    if bold:
        rpr.set('b', '1')
    return rpr

def make_textbox(x, y, cx, cy, text, sz=1800, bold=False, color=TEXT, align="l", anchor="t", txBox=True):
    sp = ET.Element(f'{{{NSMAP["p"]}}}sp')
    nvSpPr = ET.SubElement(sp, f'{{{NSMAP["p"]}}}nvSpPr')
    ET.SubElement(nvSpPr, f'{{{NSMAP["p"]}}}cNvPr', id="99", name="tb")
    ET.SubElement(nvSpPr, f'{{{NSMAP["p"]}}}cNvSpPr')
    nvPr = ET.SubElement(nvSpPr, f'{{{NSMAP["p"]}}}nvPr')
    if txBox:
        nvPr.set('txBox', '1')

    spPr = ET.SubElement(sp, f'{{{NSMAP["p"]}}}spPr')
    spPr.append(make_xfrm(x, y, cx, cy))
    spPr.append(make_prst_geom("rect"))
    spPr.append(make_no_fill())

    txBody = ET.SubElement(sp, f'{{{NSMAP["p"]}}}txBody')
    ET.SubElement(txBody, f'{{{NSMAP["a"]}}}bodyPr', anchor=anchor, wrap="square")
    ET.SubElement(txBody, f'{{{NSMAP["a"]}}}lstStyle')
    p = ET.SubElement(txBody, f'{{{NSMAP["a"]}}}p')
    ET.SubElement(p, f'{{{NSMAP["a"]}}}pPr', algn=align)
    r = ET.SubElement(p, f'{{{NSMAP["a"]}}}r')
    r.append(make_rpr(sz, bold, color))
    t = ET.SubElement(r, f'{{{NSMAP["a"]}}}t')
    t.text = text
    return sp

def make_multiline(x, y, cx, cy, lines, sz=1200, color=MUTED):
    sp = ET.Element(f'{{{NSMAP["p"]}}}sp')
    nvSpPr = ET.SubElement(sp, f'{{{NSMAP["p"]}}}nvSpPr')
    ET.SubElement(nvSpPr, f'{{{NSMAP["p"]}}}cNvPr', id="99", name="ml")
    ET.SubElement(nvSpPr, f'{{{NSMAP["p"]}}}cNvSpPr')
    nvPr = ET.SubElement(nvSpPr, f'{{{NSMAP["p"]}}}nvPr')
    nvPr.set('txBox', '1')

    spPr = ET.SubElement(sp, f'{{{NSMAP["p"]}}}spPr')
    spPr.append(make_xfrm(x, y, cx, cy))
    spPr.append(make_prst_geom("rect"))
    spPr.append(make_no_fill())

    txBody = ET.SubElement(sp, f'{{{NSMAP["p"]}}}txBody')
    ET.SubElement(txBody, f'{{{NSMAP["a"]}}}bodyPr', anchor="t", wrap="square")
    ET.SubElement(txBody, f'{{{NSMAP["a"]}}}lstStyle')
    for line in lines:
        p = ET.SubElement(txBody, f'{{{NSMAP["a"]}}}p')
        ET.SubElement(p, f'{{{NSMAP["a"]}}}pPr', algn="l", marL="228600")
        r = ET.SubElement(p, f'{{{NSMAP["a"]}}}r')
        r.append(make_rpr(sz, False, color))
        t = ET.SubElement(r, f'{{{NSMAP["a"]}}}t')
        t.text = f"\u2022 {line}"
    return sp

def make_round_rect(x, y, cx, cy, fill, line_color=None, line_w="0"):
    sp = ET.Element(f'{{{NSMAP["p"]}}}sp')
    nvSpPr = ET.SubElement(sp, f'{{{NSMAP["p"]}}}nvSpPr')
    ET.SubElement(nvSpPr, f'{{{NSMAP["p"]}}}cNvPr', id="99", name="rr")
    ET.SubElement(nvSpPr, f'{{{NSMAP["p"]}}}cNvSpPr')
    ET.SubElement(nvSpPr, f'{{{NSMAP["p"]}}}nvPr')

    spPr = ET.SubElement(sp, f'{{{NSMAP["p"]}}}spPr')
    spPr.append(make_xfrm(x, y, cx, cy))
    spPr.append(make_prst_geom("roundRect", "5000"))
    spPr.append(make_solid_fill(fill))
    if line_color:
        spPr.append(make_ln(str(line_w), line_color))
    else:
        spPr.append(make_ln("0"))
    ET.SubElement(spPr, f'{{{NSMAP["a"]}}}effectLst')

    txBody = ET.SubElement(sp, f'{{{NSMAP["p"]}}}txBody')
    ET.SubElement(txBody, f'{{{NSMAP["a"]}}}bodyPr', rtlCol="0", anchor="ctr")
    ET.SubElement(txBody, f'{{{NSMAP["a"]}}}lstStyle')
    p = ET.SubElement(txBody, f'{{{NSMAP["a"]}}}p')
    ET.SubElement(p, f'{{{NSMAP["a"]}}}pPr', algn="ctr")
    return sp

def make_pill(x, y, cx, cy, text, fill=ORANGE, sz=1100):
    sp = ET.Element(f'{{{NSMAP["p"]}}}sp')
    nvSpPr = ET.SubElement(sp, f'{{{NSMAP["p"]}}}nvSpPr')
    ET.SubElement(nvSpPr, f'{{{NSMAP["p"]}}}cNvPr', id="99", name="pill")
    ET.SubElement(nvSpPr, f'{{{NSMAP["p"]}}}cNvSpPr')
    ET.SubElement(nvSpPr, f'{{{NSMAP["p"]}}}nvPr')

    spPr = ET.SubElement(sp, f'{{{NSMAP["p"]}}}spPr')
    spPr.append(make_xfrm(x, y, cx, cy))
    spPr.append(make_prst_geom("roundRect", "16000"))
    spPr.append(make_solid_fill(fill))
    spPr.append(make_ln("0"))
    ET.SubElement(spPr, f'{{{NSMAP["a"]}}}effectLst')

    txBody = ET.SubElement(sp, f'{{{NSMAP["p"]}}}txBody')
    ET.SubElement(txBody, f'{{{NSMAP["a"]}}}bodyPr', rtlCol="0", anchor="ctr")
    ET.SubElement(txBody, f'{{{NSMAP["a"]}}}lstStyle')
    p = ET.SubElement(txBody, f'{{{NSMAP["a"]}}}p')
    ET.SubElement(p, f'{{{NSMAP["a"]}}}pPr', algn="ctr")
    r = ET.SubElement(p, f'{{{NSMAP["a"]}}}r')
    r.append(make_rpr(sz, True, WHITE))
    t = ET.SubElement(r, f'{{{NSMAP["a"]}}}t')
    t.text = text
    return sp

def make_oval(x, y, cx, cy, fill, alpha=25000):
    sp = ET.Element(f'{{{NSMAP["p"]}}}sp')
    nvSpPr = ET.SubElement(sp, f'{{{NSMAP["p"]}}}nvSpPr')
    ET.SubElement(nvSpPr, f'{{{NSMAP["p"]}}}cNvPr', id="99", name="oval")
    ET.SubElement(nvSpPr, f'{{{NSMAP["p"]}}}cNvSpPr')
    ET.SubElement(nvSpPr, f'{{{NSMAP["p"]}}}nvPr')

    spPr = ET.SubElement(sp, f'{{{NSMAP["p"]}}}spPr')
    spPr.append(make_xfrm(x, y, cx, cy))
    spPr.append(make_prst_geom("ellipse"))
    sf = ET.SubElement(spPr, f'{{{NSMAP["a"]}}}solidFill')
    clr = ET.SubElement(sf, f'{{{NSMAP["a"]}}}srgbClr', val=fill)
    ET.SubElement(clr, f'{{{NSMAP["a"]}}}alpha', val=str(alpha))
    spPr.append(make_ln())
    ET.SubElement(spPr, f'{{{NSMAP["a"]}}}effectLst')

    txBody = ET.SubElement(sp, f'{{{NSMAP["p"]}}}txBody')
    ET.SubElement(txBody, f'{{{NSMAP["a"]}}}bodyPr', rtlCol="0", anchor="ctr")
    ET.SubElement(txBody, f'{{{NSMAP["a"]}}}lstStyle')
    p = ET.SubElement(txBody, f'{{{NSMAP["a"]}}}p')
    ET.SubElement(p, f'{{{NSMAP["a"]}}}pPr', algn="ctr")
    return sp

def make_rect(x, y, cx, cy, fill=None):
    sp = ET.Element(f'{{{NSMAP["p"]}}}sp')
    nvSpPr = ET.SubElement(sp, f'{{{NSMAP["p"]}}}nvSpPr')
    ET.SubElement(nvSpPr, f'{{{NSMAP["p"]}}}cNvPr', id="99", name="rect")
    ET.SubElement(nvSpPr, f'{{{NSMAP["p"]}}}cNvSpPr')
    ET.SubElement(nvSpPr, f'{{{NSMAP["p"]}}}nvPr')

    spPr = ET.SubElement(sp, f'{{{NSMAP["p"]}}}spPr')
    spPr.append(make_xfrm(x, y, cx, cy))
    spPr.append(make_prst_geom("rect"))
    if fill:
        spPr.append(make_solid_fill(fill))
    else:
        spPr.append(make_no_fill())
    spPr.append(make_ln("0"))

    txBody = ET.SubElement(sp, f'{{{NSMAP["p"]}}}txBody')
    ET.SubElement(txBody, f'{{{NSMAP["a"]}}}bodyPr', rtlCol="0", anchor="ctr")
    ET.SubElement(txBody, f'{{{NSMAP["a"]}}}lstStyle')
    p = ET.SubElement(txBody, f'{{{NSMAP["a"]}}}p')
    ET.SubElement(p, f'{{{NSMAP["a"]}}}pPr', algn="ctr")
    return sp

def set_ids(elements, start_id=2):
    """给所有元素设置唯一的id"""
    sid = start_id
    for el in elements:
        for cNvPr in el.iter(f'{{{NSMAP["p"]}}}cNvPr'):
            cNvPr.set('id', str(sid))
            sid += 1
    return sid

def build_slide(bg_xml, shapes):
    """构建一个完整的幻灯片"""
    sld = ET.Element(f'{{{NSMAP["p"]}}}sld')
    cSld = ET.SubElement(sld, f'{{{NSMAP["p"]}}}cSld', name="Slide")
    cSld.append(bg_xml)
    spTree = ET.SubElement(cSld, f'{{{NSMAP["p"]}}}spTree')
    nvGrpSpPr = ET.SubElement(spTree, f'{{{NSMAP["p"]}}}nvGrpSpPr')
    ET.SubElement(nvGrpSpPr, f'{{{NSMAP["p"]}}}cNvPr', id="1", name="")
    ET.SubElement(nvGrpSpPr, f'{{{NSMAP["p"]}}}cNvGrpSpPr')
    ET.SubElement(nvGrpSpPr, f'{{{NSMAP["p"]}}}nvPr')
    ET.SubElement(spTree, f'{{{NSMAP["p"]}}}grpSpPr')
    for shape in shapes:
        spTree.append(shape)
    clrMapOvr = ET.SubElement(sld, f'{{{NSMAP["p"]}}}clrMapOvr')
    ET.SubElement(clrMapOvr, f'{{{NSMAP["a"]}}}masterClrMapping')
    return sld

def make_bg_solid(color):
    bg = ET.Element(f'{{{NSMAP["p"]}}}bg')
    bgPr = ET.SubElement(bg, f'{{{NSMAP["p"]}}}bgPr')
    sf = ET.SubElement(bgPr, f'{{{NSMAP["a"]}}}solidFill')
    ET.SubElement(sf, f'{{{NSMAP["a"]}}}srgbClr', val=color)
    ET.SubElement(bgPr, f'{{{NSMAP["a"]}}}effectLst')
    return bg

def make_bg_gradient(c1, c2):
    bg = ET.Element(f'{{{NSMAP["p"]}}}bg')
    bgPr = ET.SubElement(bg, f'{{{NSMAP["p"]}}}bgPr')
    gf = ET.SubElement(bgPr, f'{{{NSMAP["a"]}}}gradFill', rotWithShape="1")
    gsLst = ET.SubElement(gf, f'{{{NSMAP["a"]}}}gsLst')
    gs1 = ET.SubElement(gsLst, f'{{{NSMAP["a"]}}}gs', pos="0")
    sf1 = ET.SubElement(gs1, f'{{{NSMAP["a"]}}}solidFill')
    ET.SubElement(sf1, f'{{{NSMAP["a"]}}}srgbClr', val=c1)
    gs2 = ET.SubElement(gsLst, f'{{{NSMAP["a"]}}}gs', pos="100000")
    sf2 = ET.SubElement(gs2, f'{{{NSMAP["a"]}}}solidFill')
    ET.SubElement(sf2, f'{{{NSMAP["a"]}}}srgbClr', val=c2)
    ET.SubElement(bgPr, f'{{{NSMAP["a"]}}}effectLst')
    return bg

# ========== 幻灯片内容 ==========

def make_cover_slide():
    shapes = []
    shapes.append(make_oval(emu(22), emu(-2), emu(12), emu(8), "FFB088", 30000))
    shapes.append(make_oval(emu(-2), emu(13), emu(10), emu(6), "A8D8A0", 35000))
    shapes.append(make_pill(emu(2.5), emu(4.5), emu(14), emu(0.8), "Vue3 + Fastify + Prisma + AI + Docker", GREEN, 1100))
    shapes.append(make_textbox(emu(2.5), emu(6.5), emu(28), emu(2.5), "餐小助", 5200, True, WHITE, "ctr"))
    shapes.append(make_textbox(emu(2.5), emu(9.5), emu(28), emu(1.2), "商户智能经营助手", 2800, True, WHITE, "ctr"))
    shapes.append(make_textbox(emu(2.5), emu(11.2), emu(28), emu(0.8), '项目答辩\u2014\u2014从\u201c会写页面\u201d到\u201c能交付系统\u201d', 1400, False, "FFD0B8", "ctr"))
    shapes.append(make_rect(emu(8), emu(12.5), emu(18), emu(0.04), WHITE))
    shapes.append(make_textbox(emu(2.5), emu(13), emu(28), emu(0.6), "答辩人：餐小助团队    2026年8月", 1200, False, "FFD0B8", "ctr"))
    set_ids(shapes)
    return build_slide(make_bg_gradient("FF8C5A", "E85D26"), shapes)

def make_toc_slide():
    shapes = []
    shapes.append(make_rect(0, 0, SW, emu(0.12), ORANGE))
    shapes.append(make_textbox(emu(1.5), emu(0.5), emu(30), emu(1.2), "答辩提纲", 2800, True, TEXT))
    shapes.append(make_textbox(emu(1.5), emu(1.7), emu(30), emu(0.6), "五大章节，重点聚焦问题与收获", 1200, False, MUTED))
    shapes.append(make_rect(emu(1.5), emu(2.3), emu(3), emu(0.04), ORANGE))

    items = [
        ("01", "项目介绍", '中小餐饮的\u201c数字店长\u201d', ORANGE),
        ("02", "功能与技术", "八大模块 + 全栈架构", GREEN),
        ("03", "问题与解决", "开发中的技术挑战（重点）", RED),
        ("04", "收获与成长", "从技术栈到工程思维（重点）", BROWN),
        ("05", "成果展望", "量化成果与未来方向", GREEN),
    ]
    for i, (num, title, desc, color) in enumerate(items):
        y = emu(3.2 + i * 2.8)
        shapes.append(make_round_rect(emu(1.5), y, emu(30.5), emu(2.2), CARD, BORDER, emu(0.04)))
        shapes.append(make_oval(emu(2), y + emu(0.3), emu(1.6), emu(1.6), color, 0))
        shapes.append(make_textbox(emu(2), y + emu(0.3), emu(1.6), emu(1.6), num, 2000, True, WHITE, "ctr", "ctr"))
        shapes.append(make_textbox(emu(4.2), y + emu(0.2), emu(8), emu(0.8), title, 1800, True, TEXT))
        shapes.append(make_textbox(emu(4.2), y + emu(1.1), emu(25), emu(0.6), desc, 1200, False, MUTED))
    set_ids(shapes)
    return build_slide(make_bg_solid(BG), shapes)

def make_content_slide(title, subtitle, cards):
    shapes = []
    shapes.append(make_rect(0, 0, SW, emu(0.12), ORANGE))
    shapes.append(make_textbox(emu(1.5), emu(0.5), emu(30), emu(1.2), title, 2800, True, TEXT))
    if subtitle:
        shapes.append(make_textbox(emu(1.5), emu(1.7), emu(30), emu(0.6), subtitle, 1200, False, MUTED))
    shapes.append(make_rect(emu(1.5), emu(2.3), emu(3), emu(0.04), ORANGE))

    n = len(cards)
    cols = 2 if n > 3 else n
    rows = (n + cols - 1) // cols
    card_w_cm = (31.5 - (cols - 1) * 0.5) / cols
    card_h_cm = (16.5 - (rows - 1) * 0.3) / rows

    for i, card in enumerate(cards):
        col = i % cols
        row = i // cols
        x = emu(1.5 + col * (card_w_cm + 0.5))
        y = emu(2.8 + row * (card_h_cm + 0.3))
        cw = emu(card_w_cm)
        ch = emu(card_h_cm)

        tag = card.get("tag", "")
        tag_color = card.get("tag_color", ORANGE)
        ctitle = card.get("title", "")
        content = card.get("content", [])

        shapes.append(make_round_rect(x, y, cw, ch, CARD, BORDER, emu(0.04)))
        if tag:
            tag_w = emu(len(tag) * 0.45 + 0.8)
            shapes.append(make_pill(x + emu(0.3), y + emu(0.3), tag_w, emu(0.6), tag, tag_color, 1000))
            title_y = y + emu(1.1)
        else:
            title_y = y + emu(0.3)
        shapes.append(make_textbox(x + emu(0.3), title_y, cw - emu(0.6), emu(0.6), ctitle, 1500, True, TEXT))
        if content:
            shapes.append(make_multiline(x + emu(0.3), y + emu(1.8), cw - emu(0.6), ch - emu(2.2), content, 1100, MUTED))
    set_ids(shapes)
    return build_slide(make_bg_solid(BG), shapes)

def make_transition_slide(title, subtitle):
    shapes = []
    shapes.append(make_oval(emu(22), emu(-2), emu(14), emu(10), "FF8C5A", 20000))
    shapes.append(make_oval(emu(-3), emu(12), emu(12), emu(8), "00C853", 25000))
    shapes.append(make_pill(emu(11), emu(4.5), emu(12), emu(0.9), "CORE SECTION", ORANGE, 1300))
    shapes.append(make_textbox(emu(2), emu(6.5), emu(30), emu(2.5), title, 4400, True, WHITE, "ctr"))
    shapes.append(make_rect(emu(10), emu(9.5), emu(14), emu(0.04), ORANGE))
    shapes.append(make_textbox(emu(2), emu(10), emu(30), emu(1), subtitle, 1600, False, "FFD0B8", "ctr"))
    set_ids(shapes)
    return build_slide(make_bg_gradient("5B361F", "3D2415"), shapes)

def make_ending_slide():
    shapes = []
    shapes.append(make_oval(emu(20), emu(-2), emu(15), emu(10), "FFB088", 25000))
    shapes.append(make_oval(emu(-2), emu(12), emu(12), emu(8), "A8D8A0", 30000))
    shapes.append(make_textbox(emu(2), emu(6), emu(30), emu(3), "感谢聆听", 5600, True, WHITE, "ctr"))
    shapes.append(make_rect(emu(10), emu(10), emu(14), emu(0.04), WHITE))
    shapes.append(make_textbox(emu(2), emu(11), emu(30), emu(1.5), "餐小助 \u00b7 让AI帮你盯店，你只管做好菜", 2000, False, "FFE0D0", "ctr"))
    set_ids(shapes)
    return build_slide(make_bg_gradient("FF8C5A", "E85D26"), shapes)

# ========== 序列化 ==========

def serialize_xml(element):
    """将ElementTree序列化为UTF-8 XML字符串"""
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + ET.tostring(element, encoding='unicode', xml_declaration=False)

# ========== 模板文件 ==========

def make_content_types(n):
    lines = ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>']
    lines.append('<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">')
    lines.append('<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>')
    lines.append('<Default Extension="xml" ContentType="application/xml"/>')
    lines.append('<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>')
    lines.append('<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>')
    lines.append('<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>')
    lines.append('<Override PartName="/ppt/presProps.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presProps+xml"/>')
    lines.append('<Override PartName="/ppt/tableStyles.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.tableStyles+xml"/>')
    lines.append('<Override PartName="/ppt/viewProps.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.viewProps+xml"/>')
    lines.append('<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>')
    lines.append('<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>')
    lines.append('<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>')
    for i in range(1, n + 1):
        lines.append(f'<Override PartName="/ppt/slides/slide{i}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>')
    lines.append('</Types>')
    return '\n'.join(lines)

def make_root_rels():
    return '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>'''

def make_pres_rels(n):
    lines = ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>']
    lines.append('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">')
    lines.append('<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>')
    lines.append('<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>')
    lines.append('<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="slideLayouts/slideLayout1.xml"/>')
    for i in range(1, n + 1):
        lines.append(f'<Relationship Id="rId{i+3}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide{i}.xml"/>')
    lines.append('</Relationships>')
    return '\n'.join(lines)

SLIDE_RELS = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>'''

MASTER_RELS = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="slideLayouts/slideLayout1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme1.xml"/>
</Relationships>'''

LAYOUT_RELS = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>'''

APP_PROPS = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
<Application>Microsoft Office PowerPoint</Application>
<PresentationFormat>Widescreen</PresentationFormat>
<Slides>15</Slides>
</Properties>'''

CORE_PROPS = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<dc:title>餐小助·项目答辩PPT</dc:title>
<dc:subject>项目答辩</dc:subject>
<dc:creator>餐小助团队</dc:creator>
<cp:lastModifiedBy>餐小助团队</cp:lastModifiedBy>
</cp:coreProperties>'''

TABLE_STYLES = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:tblStyleLst xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" def="{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}"/>'''

PRES_PROPS = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presProps xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
<p:showType val="pres"/>
</p:presProps>'''

VIEW_PROPS = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:viewPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
<p:normalViewPr/>
<p:slideViewPr/>
</p:viewPr>'''

THEME = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="餐小助主题">
<a:themeElements>
<a:clrScheme name="餐小助">
<a:dk1><a:srgbClr val="1A1A1A"/></a:dk1>
<a:lt1><a:srgbClr val="FFFFFF"/></a:lt1>
<a:dk2><a:srgbClr val="5B361F"/></a:dk2>
<a:lt2><a:srgbClr val="F7F8FA"/></a:lt2>
<a:accent1><a:srgbClr val="FF6B35"/></a:accent1>
<a:accent2><a:srgbClr val="00C853"/></a:accent2>
<a:accent3><a:srgbClr val="FF3D00"/></a:accent3>
<a:accent4><a:srgbClr val="5B361F"/></a:accent4>
<a:accent5><a:srgbClr val="FF6B35"/></a:accent5>
<a:accent6><a:srgbClr val="00C853"/></a:accent6>
<a:hlink><a:srgbClr val="FF6B35"/></a:hlink>
<a:folHlink><a:srgbClr val="00C853"/></a:folHlink>
</a:clrScheme>
<a:fontScheme name="餐小助字体">
<a:majorFont><a:latin typeface="Microsoft YaHei"/><a:ea typeface="Microsoft YaHei"/><a:cs typeface="Microsoft YaHei"/></a:majorFont>
<a:minorFont><a:latin typeface="Microsoft YaHei"/><a:ea typeface="Microsoft YaHei"/><a:cs typeface="Microsoft YaHei"/></a:minorFont>
</a:fontScheme>
<a:fmtScheme name="Office">
<a:lnStyleLst>
<a:ln w="6350"><a:solidFill><a:srgbClr val="666666"/></a:solidFill></a:ln>
<a:ln w="12700"><a:solidFill><a:srgbClr val="666666"/></a:solidFill></a:ln>
<a:ln w="19050"><a:solidFill><a:srgbClr val="666666"/></a:solidFill></a:ln>
</a:lnStyleLst>
<a:fillStyleLst>
<a:solidFill><a:srgbClr val="F7F8FA"/></a:solidFill>
<a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:srgbClr val="F7F8FA"/></a:gs><a:gs pos="100000"><a:srgbClr val="FFFFFF"/></a:gs></a:gsLst></a:gradFill>
<a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:srgbClr val="F7F8FA"/></a:gs><a:gs pos="100000"><a:srgbClr val="FFFFFF"/></a:gs></a:gsLst></a:gradFill>
</a:fillStyleLst>
<a:effectStyleLst>
<a:effectStyle><a:effectLst/></a:effectStyle>
<a:effectStyle><a:effectLst/></a:effectStyle>
<a:effectStyle><a:effectLst/></a:effectStyle>
</a:effectStyleLst>
<a:bgFillStyleLst>
<a:solidFill><a:srgbClr val="F7F8FA"/></a:solidFill>
<a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:srgbClr val="F7F8FA"/></a:gs><a:gs pos="100000"><a:srgbClr val="FFFFFF"/></a:gs></a:gsLst></a:gradFill>
<a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:srgbClr val="F7F8FA"/></a:gs><a:gs pos="100000"><a:srgbClr val="FFFFFF"/></a:gs></a:gsLst></a:gradFill>
</a:bgFillStyleLst>
</a:fmtScheme>
</a:themeElements>
<a:objectDefaults/>
<a:extraClrSchemeLst/>
</a:theme>'''

SLIDE_MASTER = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
<p:cSld name="自定义母版">
<p:bg><p:bgPr><a:solidFill><a:srgbClr val="F7F8FA"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>
<p:spTree>
<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
<p:grpSpPr/>
<p:sp><p:nvSpPr><p:cNvPr id="2" name="标题"/><p:cNvSpPr txBox="1"/><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr><p:spPr><a:xfrm><a:off x="360000" y="360000"/><a:ext cx="11472000" cy="900000"/></a:xfrm><a:prstGeom prst="rect"/><a:noFill/></p:spPr><p:txBody><a:bodyPr anchor="t"/><a:lstStyle/><a:p><a:endParaRPr lang="zh-CN"/></a:p></p:txBody></p:sp>
<p:sp><p:nvSpPr><p:cNvPr id="3" name="内容"/><p:cNvSpPr txBox="1"/><p:nvPr><p:ph type="body"/></p:nvPr></p:nvSpPr><p:spPr><a:xfrm><a:off x="360000" y="1440000"/><a:ext cx="11472000" cy="4680000"/></a:xfrm><a:prstGeom prst="rect"/><a:noFill/></p:spPr><p:txBody><a:bodyPr anchor="t"/><a:lstStyle/><a:p><a:endParaRPr lang="zh-CN"/></a:p></p:txBody></p:sp>
</p:spTree>
</p:cSld>
<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
<p:sldLayoutIdLst>
<p:sldLayoutId id="2147483649" r:id="rId1"/>
</p:sldLayoutIdLst>
</p:sldMaster>'''

SLIDE_LAYOUT = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" name="空白" preserve="1">
<p:cSld name="空白">
<p:spTree>
<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
<p:grpSpPr/>
<p:sp><p:nvSpPr><p:cNvPr id="2" name="标题"/><p:cNvSpPr txBox="1"/><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr><p:spPr><a:xfrm><a:off x="360000" y="360000"/><a:ext cx="11472000" cy="900000"/></a:xfrm><a:prstGeom prst="rect"/><a:noFill/></p:spPr><p:txBody><a:bodyPr anchor="t"/><a:lstStyle/><a:p><a:endParaRPr lang="zh-CN"/></a:p></p:txBody></p:sp>
<p:sp><p:nvSpPr><p:cNvPr id="3" name="内容"/><p:cNvSpPr txBox="1"/><p:nvPr><p:ph type="body"/></p:nvPr></p:nvSpPr><p:spPr><a:xfrm><a:off x="360000" y="1440000"/><a:ext cx="11472000" cy="4680000"/></a:xfrm><a:prstGeom prst="rect"/><a:noFill/></p:spPr><p:txBody><a:bodyPr anchor="t"/><a:lstStyle/><a:p><a:endParaRPr lang="zh-CN"/></a:p></p:txBody></p:sp>
</p:spTree>
</p:cSld>
</p:sldLayout>'''

def make_presentation_xml(n):
    sld_ids = "".join([f'<p:sldId id="{256 + i}" r:id="rId{i+3}"/>' for i in range(n)])
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" saveSubsetFonts="1" autoCompressPictures="0">
<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>
<p:sldIdLst>{sld_ids}</p:sldIdLst>
<p:sldSz cx="{SW}" cy="{SH}" type="screen16x9"/>
<p:notesSz cx="6858000" cy="9144000"/>
<p:defaultTextStyle><a:defPPr><a:defRPr lang="en-US"/></a:defPPr></p:defaultTextStyle>
</p:presentation>'''

# ========== 主函数 ==========

def main():
    global OUT
    N = 15
    slides = []

    # 1. 封面
    slides.append(make_cover_slide())
    # 2. 目录
    slides.append(make_toc_slide())
    # 3. 项目定位
    slides.append(make_content_slide(
        '项目定位：中小餐饮的\u201c数字店长\u201d',
        '中小餐饮平均寿命18个月，死因是\u201c不会算账、不会管客、不会控损耗\u201d',
        [
            {"tag": "痛点", "tag_color": RED, "title": "核心痛点", "content": ["中小餐饮平均寿命仅18个月", "不会算账、不会管客、不会控损耗", "多渠道数据孤岛，对账困难"]},
            {"tag": "方案", "tag_color": GREEN, "title": "解决方案", "content": ["AI经营助手，自动算账、管客、控损耗", "接入美团/饿了么/抖音等多渠道数据", "每日自动生成经营日报"]},
            {"tag": "价值", "tag_color": ORANGE, "title": "量化价值", "content": ["单店月均降本3000元", "单店月均增收5000元", "综合经营效率提升30%"]},
            {"tag": "形态", "tag_color": BROWN, "title": "产品形态", "content": ["PC商户后台：复杂配置与数据看板", "手机端商户页：移动查看关键数据", "顾客扫码点餐页：桌码进入点餐"]},
        ]
    ))
    # 4. 功能架构
    slides.append(make_content_slide(
        '八大模块覆盖经营全链路',
        '围绕PRD的8大模块，当前项目已覆盖核心可演示链路',
        [
            {"tag": "核心", "tag_color": ORANGE, "title": "AI经营驾驶舱", "content": ["日报自动生成、多渠道对账", "异常预警、语音问答"]},
            {"tag": "核心", "tag_color": ORANGE, "title": "客户资产管家", "content": ["OneID打通、38个自动标签", "RFM分层、流失预警与召回"]},
            {"tag": "核心", "tag_color": ORANGE, "title": "菜品盈利分析", "content": ["四象限分类、购物篮分析", "成本波动监控"]},
            {"tag": "核心", "tag_color": ORANGE, "title": "智能采购与库存", "content": ["销量预测、智能采购单", "效期预警"]},
            {"tag": "扩展", "tag_color": GREEN, "title": "智能定价与促销", "content": ["动态定价、AI促销方案", "分层发券"]},
            {"tag": "扩展", "tag_color": GREEN, "title": "员工/评价/系统", "content": ["员工排班、评价口碑", "系统管理"]},
        ]
    ))
    # 5. 技术架构
    slides.append(make_content_slide(
        '全栈技术架构',
        '前端三端 + 后端服务 + AI层 + 数据层 + 云部署',
        [
            {"tag": "前端", "tag_color": GREEN, "title": "前端展示层", "content": ["Vue3 + Pinia + Vue Router + ECharts", "PC商户后台 + 手机商户端 + 顾客扫码页"]},
            {"tag": "后端", "tag_color": ORANGE, "title": "业务接口层", "content": ["Fastify 5 + Prisma 6 + TypeBox", "Swagger文档、CORS、Helmet、RateLimit"]},
            {"tag": "AI", "tag_color": BROWN, "title": "AI能力层", "content": ["DeepSeek-V3（推理）、通义千问-Max（BI）", "豆包-Pro（创意）、文心一言-4.0（NLP）"]},
            {"tag": "部署", "tag_color": RED, "title": "云部署层", "content": ["Docker Compose + Nginx", "腾讯云公网IP、数据卷持久化"]},
        ]
    ))
    # 6. 业务闭环
    slides.append(make_content_slide(
        '业务闭环：从顾客下单到商户决策',
        '数据不再只是页面展示，而是可持续计算、追踪、复盘的经营资产',
        [
            {"tag": "顾客端", "tag_color": ORANGE, "title": "扫码点餐", "content": ["桌码token自动识别桌号", "菜品、数量、称呼、手机号、备注", "购物车、加菜、订单状态"]},
            {"tag": "商户端", "tag_color": GREEN, "title": "接单与分析", "content": ["订单队列、状态流转动画", "数据沉淀到客户/菜品/评价", "AI日报、采购建议、经营分析"]},
            {"tag": "数据", "tag_color": BROWN, "title": "数据模型", "content": ["OneID客户主数据、订单事实表", "菜品维度表、标签体系", "订单状态机白名单校验"]},
            {"tag": "AI", "tag_color": RED, "title": "智能辅助", "content": ["SSE流式AI问答", "多模型路由策略", "置信度标注、可解释输出"]},
        ]
    ))
    # 7. 核心模块
    slides.append(make_content_slide(
        '三大核心模块落地',
        '用具体数据和场景证明产品价值',
        [
            {"tag": "模块一", "tag_color": ORANGE, "title": "经营驾驶舱", "content": ["每日8点AI日报自动推送", "含营收/利润/TOP3/异常/建议", "生成时间 < 30秒"]},
            {"tag": "模块二", "tag_color": GREEN, "title": "客户资产", "content": ["OneID跨平台合并客户", "手机号匹配率 > 95%", "自动RFM重算 + 流失风险评分"]},
            {"tag": "模块三", "tag_color": BROWN, "title": "智能采购", "content": ["基于90天历史 + 天气预测销量", "自动生成采购单", "损耗率从12%降至5%"]},
        ]
    ))
    # 8. 过渡页 - 问题与解决
    slides.append(make_transition_slide(
        '遇到的问题及解决方案',
        '答辩要求第3条重点 \u00b7 真实开发不是一路顺风'
    ))
    # 9. 问题1
    slides.append(make_content_slide(
        '问题\u2460：AI回复\u201c卡死\u201d的假象',
        '用户体验优化：从\u201c等待\u201d到\u201c观看\u201d',
        [
            {"tag": "现象", "tag_color": RED, "title": "问题现象", "content": ["AI生成经营日报时，用户等待10秒以上无反馈", "用户以为系统卡死，反复点击"]},
            {"tag": "原因", "tag_color": BROWN, "title": "原因分析", "content": ["非流式返回，用户看不到\u201c思考中\u201d的状态", "缺少进度反馈机制"]},
            {"tag": "解决", "tag_color": GREEN, "title": "解决方案", "content": ["采用SSE流式输出（Server-Sent Events）", "reply.hijack() + X-Accel-Buffering:no", "AbortController控制停止生成"]},
            {"tag": "效果", "tag_color": ORANGE, "title": "最终效果", "content": ["用户实时看到AI逐字生成", "体验从\u201c等待\u201d变为\u201c观看\u201d", "支持停止生成和禁用重复发送"]},
        ]
    ))
    # 10. 问题2
    slides.append(make_content_slide(
        '问题\u2461：AI不能\u201c编\u201d数据',
        '经营系统的底线\u2014\u2014绝不误导用户',
        [
            {"tag": "现象", "tag_color": RED, "title": "问题现象", "content": ["AI模型未连接时，可能生成虚假经营分析", "LLM幻觉：模型会自信地编造数据"]},
            {"tag": "原因", "tag_color": BROWN, "title": "原因分析", "content": ["降级mock容易误导真实经营判断", "没有数据源标记和校验机制"]},
            {"tag": "解决", "tag_color": GREEN, "title": "解决方案", "content": ["dataSource标记（real_orders | insufficient）", "只统计served/completed订单", "AI输出标注置信度"]},
            {"tag": "效果", "tag_color": ORANGE, "title": "最终效果", "content": ["模型不可用时直接展示失败原因", "不伪造经营建议", "经营系统的底线：绝不误导用户"]},
        ]
    ))
    # 11. 问题3
    slides.append(make_content_slide(
        '问题\u2462：从开发到上线的最后一公里',
        '全链路交付能力和运维思维',
        [
            {"tag": "问题A", "tag_color": RED, "title": "二维码外网访问", "content": ["二维码使用localhost导致外网打不开", "解决：公网域名 + Nginx反向代理"]},
            {"tag": "问题B", "tag_color": RED, "title": "服务器显示旧页面", "content": ["Nginx缓存导致页面不更新", "解决：缓存清理 + Docker镜像版本化"]},
            {"tag": "问题C", "tag_color": RED, "title": "Docker部署冲突", "content": ["端口冲突、中文路径导致compose失败", "解决：固定project name、独立端口18080"]},
            {"tag": "问题D", "tag_color": RED, "title": "订单统计不准", "content": ["取消订单被错误计入销量", "解决：状态机白名单，只统计completed"]},
        ]
    ))
    # 12. 过渡页 - 收获与成长
    slides.append(make_transition_slide(
        '项目完成后的收获',
        '答辩要求第4条重点 \u00b7 从\u201c写页面\u201d到\u201c做系统\u201d'
    ))
    # 13. 技术收获
    slides.append(make_content_slide(
        '从技术栈到工程思维',
        '这次项目最大的价值，是从\u201c会写页面\u201d走向\u201c能交付系统\u201d',
        [
            {"tag": "前端", "tag_color": GREEN, "title": "前端能力", "content": ["Vue3多端页面开发", "Pinia状态管理、Vue Router路由", "移动端弹层滚动、响应式布局"]},
            {"tag": "后端", "tag_color": ORANGE, "title": "后端能力", "content": ["Fastify接口设计、Prisma数据建模", "注册登录、短信验证码、订单接口", "客户、菜品、采购、评价、天气接口"]},
            {"tag": "AI", "tag_color": BROWN, "title": "AI工程化", "content": ["SSE流式输出、多模型路由", "Prompt工程、Tool Schema设计", "置信度标注、可解释输出"]},
            {"tag": "运维", "tag_color": RED, "title": "部署运维", "content": ["Docker Compose三阶段构建", "Nginx反向代理、腾讯云服务器", "通过日志、curl定位问题"]},
        ]
    ))
    # 14. 成果展望
    slides.append(make_content_slide(
        '成果与未来方向',
        '已完成核心闭环，未来持续扩展',
        [
            {"tag": "已完成", "tag_color": GREEN, "title": "项目成果", "content": ["三端系统：PC后台 + 手机 + 顾客扫码", "8大模块、AI日报、客户OneID", "菜品四象限、智能采购、Docker部署"]},
            {"tag": "量化", "tag_color": ORANGE, "title": "量化目标", "content": ["每日节省对账时间1.5小时", "损耗率从12%降至5%", "复购率提升20%"]},
            {"tag": "未来", "tag_color": BROWN, "title": "未来扩展", "content": ["连锁多店看板、供应链比价", "AI外呼召回、行业垂直方案", "MySQL替换、HTTPS域名"]},
        ]
    ))
    # 15. 结尾
    slides.append(make_ending_slide())

    # 写入ZIP
    if OUT.exists():
        try:
            OUT.unlink()
        except:
            OUT = Path(r"D:\餐小助\餐小助_项目答辩PPT_v4_new.pptx")

    with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", make_content_types(N).encode('utf-8'))
        zf.writestr("_rels/.rels", make_root_rels().encode('utf-8'))
        zf.writestr("docProps/app.xml", APP_PROPS.encode('utf-8'))
        zf.writestr("docProps/core.xml", CORE_PROPS.encode('utf-8'))
        zf.writestr("ppt/presentation.xml", make_presentation_xml(N).encode('utf-8'))
        zf.writestr("ppt/_rels/presentation.xml.rels", make_pres_rels(N).encode('utf-8'))
        zf.writestr("ppt/theme/theme1.xml", THEME.encode('utf-8'))
        zf.writestr("ppt/slideMasters/slideMaster1.xml", SLIDE_MASTER.encode('utf-8'))
        zf.writestr("ppt/slideMasters/_rels/slideMaster1.xml.rels", MASTER_RELS.encode('utf-8'))
        zf.writestr("ppt/tableStyles.xml", TABLE_STYLES.encode('utf-8'))
        zf.writestr("ppt/presProps.xml", PRES_PROPS.encode('utf-8'))
        zf.writestr("ppt/viewProps.xml", VIEW_PROPS.encode('utf-8'))
        zf.writestr("ppt/slideLayouts/slideLayout1.xml", SLIDE_LAYOUT.encode('utf-8'))
        zf.writestr("ppt/slideLayouts/_rels/slideLayout1.xml.rels", LAYOUT_RELS.encode('utf-8'))

        for i, sld in enumerate(slides, 1):
            xml_str = serialize_xml(sld)
            zf.writestr(f"ppt/slides/slide{i}.xml", xml_str.encode('utf-8'))
            zf.writestr(f"ppt/slides/_rels/slide{i}.xml.rels", SLIDE_RELS.encode('utf-8'))

    print(f"OK: {OUT} ({OUT.stat().st_size} bytes, {N} slides)")

if __name__ == "__main__":
    main()
