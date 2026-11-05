#!/usr/bin/env python3
"""
餐小助项目答辩PPT生成器 V2 - 全新版本
重点突出第3、4条：问题与解决、收获与成长
"""
import zipfile
from pathlib import Path

OUT = Path(r"D:\餐小助\餐小助_项目答辩PPT_全新版.pptx")

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

def emu(cm):
    return str(int(cm * 360000))

SW = emu(33.867)
SH = emu(19.05)

# ========== XML模板 ==========

CONTENT_TYPES = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
<Override PartName="/ppt/presProps.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presProps+xml"/>
<Override PartName="/ppt/tableStyles.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.tableStyles+xml"/>
<Override PartName="/ppt/viewProps.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.viewProps+xml"/>
<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
{layout_overrides}
{slide_overrides}
</Types>'''

ROOT_RELS = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>'''

PRES_RELS = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>
{layout_rels}
{slide_rels}
</Relationships>'''

SLIDE_RELS = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>'''

MASTER_RELS = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="slideLayouts/slideLayout1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>
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

# ========== 形状XML ==========

def rect(sid, name, x, y, cx, cy, fill=None):
    fill_xml = f'<a:solidFill><a:srgbClr val="{fill}"/></a:solidFill>' if fill else '<a:noFill/>'
    return f'''<p:sp><p:nvSpPr><p:cNvPr id="{sid}" name="{name}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="{cx}" cy="{cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom>{fill_xml}<a:ln w="0"/></p:spPr><p:txBody><a:bodyPr rtlCol="0" anchor="ctr"/><a:lstStyle/><a:p><a:pPr algn="ctr"/></a:p></p:txBody></p:sp>'''

def round_rect(sid, name, x, y, cx, cy, fill, line_color=None, line_w="0"):
    ln_xml = f'<a:ln w="{line_w}"><a:solidFill><a:srgbClr val="{line_color}"/></a:solidFill></a:ln>' if line_color else '<a:ln w="0"/>'
    return f'''<p:sp><p:nvSpPr><p:cNvPr id="{sid}" name="{name}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="{cx}" cy="{cy}"/></a:xfrm><a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val 5000"/></a:avLst></a:prstGeom><a:solidFill><a:srgbClr val="{fill}"/></a:solidFill>{ln_xml}<a:effectLst/></p:spPr><p:txBody><a:bodyPr rtlCol="0" anchor="ctr"/><a:lstStyle/><a:p><a:pPr algn="ctr"/></a:p></p:txBody></p:sp>'''

def oval(sid, name, x, y, cx, cy, fill, alpha=25000):
    return f'''<p:sp><p:nvSpPr><p:cNvPr id="{sid}" name="{name}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="{cx}" cy="{cy}"/></a:xfrm><a:prstGeom prst="ellipse"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="{fill}"><a:alpha val="{alpha}"/></a:srgbClr></a:solidFill><a:ln><a:noFill/></a:ln><a:effectLst/></p:spPr><p:txBody><a:bodyPr rtlCol="0" anchor="ctr"/><a:lstStyle/><a:p><a:pPr algn="ctr"/></a:p></p:txBody></p:sp>'''

def textbox(sid, name, x, y, cx, cy, text, sz=1800, bold=False, color=TEXT, align="l", anchor="t"):
    b = ' b="1"' if bold else ""
    return f'''<p:sp><p:nvSpPr><p:cNvPr id="{sid}" name="{name}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="{cx}" cy="{cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr><p:txBody><a:bodyPr anchor="{anchor}" wrap="square"/><a:lstStyle/><a:p><a:pPr algn="{align}"/><a:r><a:rPr lang="zh-CN" sz="{sz}"{b} dirty="0"><a:solidFill><a:srgbClr val="{color}"/></a:solidFill><a:latin typeface="Microsoft YaHei"/><a:ea typeface="Microsoft YaHei"/></a:rPr><a:t>{text}</a:t></a:r></a:p></p:txBody></p:sp>'''

def multiline(sid, name, x, y, cx, cy, lines, sz=1200, color=MUTED):
    paras = ""
    for line in lines:
        paras += f'<a:p><a:pPr algn="l" marL="228600"/><a:r><a:rPr lang="zh-CN" sz="{sz}" dirty="0"><a:solidFill><a:srgbClr val="{color}"/></a:solidFill><a:latin typeface="Microsoft YaHei"/><a:ea typeface="Microsoft YaHei"/></a:rPr><a:t>\u2022 {line}</a:t></a:r></a:p>'
    return f'''<p:sp><p:nvSpPr><p:cNvPr id="{sid}" name="{name}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="{cx}" cy="{cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr><p:txBody><a:bodyPr anchor="t" wrap="square"/><a:lstStyle/>{paras}</p:txBody></p:sp>'''

def pill(sid, name, x, y, cx, cy, text, fill=ORANGE, sz=1100):
    return f'''<p:sp><p:nvSpPr><p:cNvPr id="{sid}" name="{name}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="{cx}" cy="{cy}"/></a:xfrm><a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val 16000"/></a:avLst></a:prstGeom><a:solidFill><a:srgbClr val="{fill}"/></a:solidFill><a:ln><a:noFill/></a:ln><a:effectLst/></p:spPr><p:txBody><a:bodyPr rtlCol="0" anchor="ctr"/><a:lstStyle/><a:p><a:pPr algn="ctr"/><a:r><a:rPr lang="zh-CN" sz="{sz}" b="1" dirty="0"><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:latin typeface="Microsoft YaHei"/><a:ea typeface="Microsoft YaHei"/></a:rPr><a:t>{text}</a:t></a:r></a:p></p:txBody></p:sp>'''

# ========== 幻灯片构建 ==========

def slide_start():
    return '<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:cSld name="Slide">'

def slide_end():
    return '</p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>'

def sp_tree_start():
    return '<p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>'

def sp_tree_end():
    return '</p:spTree>'

def emui(cm):
    return int(cm * 360000)

def make_cover():
    s = slide_start()
    s += '<p:bg><p:bgPr><a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:solidFill><a:srgbClr val="FF8C5A"/></a:solidFill></a:gs><a:gs pos="100000"><a:solidFill><a:srgbClr val="E85D26"/></a:solidFill></a:gs></a:gsLst></a:gradFill><a:effectLst/></p:bgPr></p:bg>'
    s += sp_tree_start()
    sid = 2
    s += oval(sid, "B1", emu(22), emu(-2), emu(12), emu(8), "FFB088", 30000); sid += 1
    s += oval(sid, "B2", emu(-2), emu(13), emu(10), emu(6), "A8D8A0", 35000); sid += 1
    s += pill(sid, "Tech", emu(2.5), emu(4.5), emu(14), emu(0.8), "Vue3 + Fastify + Prisma + AI + Docker", GREEN, 1100); sid += 1
    s += textbox(sid, "MT", emu(2.5), emu(6.5), emu(28), emu(2.5), "\u9910\u5c0f\u52a9", 5200, True, WHITE); sid += 1
    s += textbox(sid, "ST", emu(2.5), emu(9.5), emu(28), emu(1.2), "\u5546\u6237\u667a\u80fd\u7ecf\u8425\u52a9\u624b", 2800, True, WHITE); sid += 1
    s += textbox(sid, "Desc", emu(2.5), emu(11.2), emu(28), emu(0.8), '\u9879\u76ee\u7b54\u8fa9\u2014\u2014\u4ece\u201c\u4f1a\u5199\u9875\u9762\u201d\u5230\u201c\u80fd\u4ea4\u4ed8\u7cfb\u7edf\u201d', 1400, False, "FFD0B8"); sid += 1
    s += rect(sid, "Line", emu(8), emu(12.5), emu(18), emu(0.04), fill=WHITE); sid += 1
    s += textbox(sid, "Footer", emu(2.5), emu(13), emu(28), emu(0.6), "\u7b54\u8fa9\u4eba\uff1a\u9910\u5c0f\u52a9\u56e2\u961f    2026\u5e748\u6708", 1200, False, "FFD0B8"); sid += 1
    s += sp_tree_end()
    s += slide_end()
    return s

def make_toc():
    s = slide_start()
    s += f'<p:bg><p:bgPr><a:solidFill><a:srgbClr val="{BG}"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>'
    s += sp_tree_start()
    sid = 2
    s += rect(sid, "TopBar", "0", "0", SW, emu(0.12), fill=ORANGE); sid += 1
    s += textbox(sid, "Title", emu(1.5), emu(0.5), emu(30), emu(1.2), "\u7b54\u8fa9\u63d0\u7eb2", 2800, True, TEXT); sid += 1
    s += textbox(sid, "Sub", emu(1.5), emu(1.7), emu(30), emu(0.6), "\u4e94\u5927\u7ae0\u8282\uff0c\u91cd\u70b9\u805a\u7126\u95ee\u9898\u4e0e\u6536\u83b7", 1200, False, MUTED); sid += 1
    s += rect(sid, "Sep", emu(1.5), emu(2.3), emu(3), emu(0.04), fill=ORANGE); sid += 1

    items = [
        ("01", "\u9879\u76ee\u4ecb\u7ecd", '\u4e2d\u5c0f\u9910\u996e\u7684\u201c\u6570\u5b57\u5e97\u957f\u201d', ORANGE),
        ("02", "\u529f\u80fd\u4e0e\u6280\u672f", "\u516b\u5927\u6a21\u5757 + \u5168\u6808\u67b6\u6784", GREEN),
        ("03", "\u95ee\u9898\u4e0e\u89e3\u51b3", "\u5f00\u53d1\u4e2d\u7684\u6280\u672f\u6311\u6218\uff08\u91cd\u70b9\uff09", RED),
        ("04", "\u6536\u83b7\u4e0e\u6210\u957f", "\u4ece\u6280\u672f\u6808\u5230\u5de5\u7a0b\u601d\u7ef4\uff08\u91cd\u70b9\uff09", BROWN),
        ("05", "\u6210\u679c\u5c55\u671b", "\u91cf\u5316\u6210\u679c\u4e0e\u672a\u6765\u65b9\u5411", GREEN),
    ]
    for i, (num, title, desc, color) in enumerate(items):
        y = emu(3.2 + i * 2.8)
        s += round_rect(sid, f"TC{i}", emu(1.5), y, emu(30.5), emu(2.2), CARD, BORDER, emu(0.04)); sid += 1
        s += oval(sid, f"N{i}", emu(2), emu(3.2 + i * 2.8 + 0.3), emu(1.6), emu(1.6), color, 0); sid += 1
        s += textbox(sid, f"NT{i}", emu(2), emu(3.2 + i * 2.8 + 0.3), emu(1.6), emu(1.6), num, 2000, True, WHITE, "ctr", "ctr"); sid += 1
        s += textbox(sid, f"TT{i}", emu(4.2), emu(3.2 + i * 2.8 + 0.2), emu(8), emu(0.8), title, 1800, True, TEXT); sid += 1
        s += textbox(sid, f"TD{i}", emu(4.2), emu(3.2 + i * 2.8 + 1.1), emu(25), emu(0.6), desc, 1200, False, MUTED); sid += 1

    s += sp_tree_end()
    s += slide_end()
    return s

def make_content_page(title, subtitle, cards):
    s = slide_start()
    s += f'<p:bg><p:bgPr><a:solidFill><a:srgbClr val="{BG}"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>'
    s += sp_tree_start()
    sid = 2
    s += rect(sid, "TopBar", "0", "0", SW, emu(0.12), fill=ORANGE); sid += 1
    s += textbox(sid, "Title", emu(1.5), emu(0.5), emu(30), emu(1.2), title, 2800, True, TEXT); sid += 1
    if subtitle:
        s += textbox(sid, "Sub", emu(1.5), emu(1.7), emu(30), emu(0.6), subtitle, 1200, False, MUTED); sid += 1
    s += rect(sid, "Sep", emu(1.5), emu(2.3), emu(3), emu(0.04), fill=ORANGE); sid += 1

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

        s += round_rect(sid, f"Card{i}", x, y, cw, ch, CARD, BORDER, emu(0.04)); sid += 1
        if tag:
            tag_w = emu(len(tag) * 0.45 + 0.8)
            s += pill(sid, f"Tag{i}", str(int(x) + emui(0.3)), str(int(y) + emui(0.3)), tag_w, emu(0.6), tag, tag_color, 1000); sid += 1
            title_y = str(int(y) + emui(1.1))
        else:
            title_y = str(int(y) + emui(0.3))
        s += textbox(sid, f"CT{i}", str(int(x) + emui(0.3)), title_y, str(int(cw) - emui(0.6)), emu(0.6), ctitle, 1500, True, TEXT); sid += 1
        if content:
            content_y = str(int(y) + emui(1.8))
            content_h = str(int(ch) - emui(2.2))
            s += multiline(sid, f"CC{i}", str(int(x) + emui(0.3)), content_y, str(int(cw) - emui(0.6)), content_h, content, 1100, MUTED); sid += 1

    s += sp_tree_end()
    s += slide_end()
    return s

def make_transition(title, subtitle):
    s = slide_start()
    s += '<p:bg><p:bgPr><a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:solidFill><a:srgbClr val="5B361F"/></a:solidFill></a:gs><a:gs pos="100000"><a:solidFill><a:srgbClr val="3D2415"/></a:solidFill></a:gs></a:gsLst></a:gradFill><a:effectLst/></p:bgPr></p:bg>'
    s += sp_tree_start()
    sid = 2
    s += oval(sid, "B1", emu(22), emu(-2), emu(14), emu(10), "FF8C5A", 20000); sid += 1
    s += oval(sid, "B2", emu(-3), emu(12), emu(12), emu(8), "00C853", 25000); sid += 1
    s += pill(sid, "Core", emu(11), emu(4.5), emu(12), emu(0.9), "CORE SECTION", ORANGE, 1300); sid += 1
    s += textbox(sid, "TT", emu(2), emu(6.5), emu(30), emu(2.5), title, 4400, True, WHITE, "ctr"); sid += 1
    s += rect(sid, "Line", emu(10), emu(9.5), emu(14), emu(0.04), fill=ORANGE); sid += 1
    s += textbox(sid, "ST", emu(2), emu(10), emu(30), emu(1), subtitle, 1600, False, "FFD0B8", "ctr"); sid += 1
    s += sp_tree_end()
    s += slide_end()
    return s

def make_ending():
    s = slide_start()
    s += '<p:bg><p:bgPr><a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:solidFill><a:srgbClr val="FF8C5A"/></a:solidFill></a:gs><a:gs pos="100000"><a:solidFill><a:srgbClr val="E85D26"/></a:solidFill></a:gs></a:gsLst></a:gradFill><a:effectLst/></p:bgPr></p:bg>'
    s += sp_tree_start()
    sid = 2
    s += oval(sid, "B1", emu(20), emu(-2), emu(15), emu(10), "FFB088", 25000); sid += 1
    s += oval(sid, "B2", emu(-2), emu(12), emu(12), emu(8), "A8D8A0", 30000); sid += 1
    s += textbox(sid, "Thanks", emu(2), emu(6), emu(30), emu(3), "\u611f\u8c22\u804a\u542c", 5600, True, WHITE, "ctr"); sid += 1
    s += rect(sid, "Line", emu(10), emu(10), emu(14), emu(0.04), fill=WHITE); sid += 1
    s += textbox(sid, "Slogan", emu(2), emu(11), emu(30), emu(1.5), "\u9910\u5c0f\u52a9 \u00b7 \u8ba9AI\u5e2e\u4f60\u76ef\u5e97\uff0c\u4f60\u53ea\u7ba1\u505a\u597d\u83dc", 2000, False, "FFE0D0", "ctr"); sid += 1
    s += sp_tree_end()
    s += slide_end()
    return s

# ========== 主题/母版/布局 ==========

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

def make_presentation(n):
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
    N = 15

    slides = []
    slides.append(make_cover())
    slides.append(make_toc())

    # 3. 项目定位
    slides.append(make_content_page(
        '\u9879\u76ee\u5b9a\u4f4d\uff1a\u4e2d\u5c0f\u9910\u996e\u7684\u201c\u6570\u5b57\u5e97\u957f\u201d',
        '\u4e2d\u5c0f\u9910\u996e\u5e73\u5747\u5bff\u547d18\u4e2a\u6708\uff0c\u6b7b\u56e0\u662f\u201c\u4e0d\u4f1a\u7b97\u8d26\u3001\u4e0d\u4f1a\u7ba1\u5ba2\u3001\u4e0d\u4f1a\u63a7\u635f\u8017\u201d',
        [
            {"tag": "\u75db\u70b9", "tag_color": RED, "title": "\u6838\u5fc3\u75db\u70b9", "content": ["\u4e2d\u5c0f\u9910\u996e\u5e73\u5747\u5bff\u547d\u4ec518\u4e2a\u6708", "\u4e0d\u4f1a\u7b97\u8d26\u3001\u4e0d\u4f1a\u7ba1\u5ba2\u3001\u4e0d\u4f1a\u63a7\u635f\u8017", "\u591a\u6e20\u9053\u6570\u636e\u5b64\u5c9b\uff0c\u5bf9\u8d26\u56f0\u96be"]},
            {"tag": "\u65b9\u6848", "tag_color": GREEN, "title": "\u89e3\u51b3\u65b9\u6848", "content": ["AI\u7ecf\u8425\u52a9\u624b\uff0c\u81ea\u52a8\u7b97\u8d26\u3001\u7ba1\u5ba2\u3001\u63a7\u635f\u8017", "\u63a5\u5165\u7f8e\u56e2/\u997f\u4e86\u4e48/\u6296\u97f3\u7b49\u591a\u6e20\u9053\u6570\u636e", "\u6bcf\u65e5\u81ea\u52a8\u751f\u6210\u7ecf\u8425\u65e5\u62a5"]},
            {"tag": "\u4ef7\u503c", "tag_color": ORANGE, "title": "\u91cf\u5316\u4ef7\u503c", "content": ["\u5355\u5e97\u6708\u5747\u964d\u672c3000\u5143", "\u5355\u5e97\u6708\u5747\u589e\u65365000\u5143", "\u7efc\u5408\u7ecf\u8425\u6548\u7387\u63d0\u534730%"]},
            {"tag": "\u5f62\u6001", "tag_color": BROWN, "title": "\u4ea7\u54c1\u5f62\u6001", "content": ["PC\u5546\u6237\u540e\u53f0\uff1a\u590d\u6742\u914d\u7f6e\u4e0e\u6570\u636e\u770b\u677f", "\u624b\u673a\u7aef\u5546\u6237\u9875\uff1a\u79fb\u52a8\u67e5\u770b\u5173\u952e\u6570\u636e", "\u987e\u5ba2\u626b\u7801\u70b9\u9910\u9875\uff1a\u684c\u7801\u8fdb\u5165\u70b9\u9910"]},
        ]
    ))

    # 4. 功能架构
    slides.append(make_content_page(
        '\u516b\u5927\u6a21\u5757\u8986\u76d6\u7ecf\u8425\u5168\u94fe\u8def',
        '\u56f4\u7ed5PRD\u76848\u5927\u6a21\u5757\uff0c\u5f53\u524d\u9879\u76ee\u5df2\u8986\u76d6\u6838\u5fc3\u53ef\u6f14\u793a\u94fe\u8def',
        [
            {"tag": "\u6838\u5fc3", "tag_color": ORANGE, "title": "AI\u7ecf\u8425\u9a7e\u9a76\u8231", "content": ["\u65e5\u62a5\u81ea\u52a8\u751f\u6210\u3001\u591a\u6e20\u9053\u5bf9\u8d26", "\u5f02\u5e38\u9884\u8b66\u3001\u8bed\u97f3\u95ee\u7b54"]},
            {"tag": "\u6838\u5fc3", "tag_color": ORANGE, "title": "\u5ba2\u6237\u8d44\u4ea7\u7ba1\u5bb6", "content": ["OneID\u6253\u901a\u300138\u4e2a\u81ea\u52a8\u6807\u7b7e", "RFM\u5206\u5c42\u3001\u6d41\u5931\u9884\u8b66\u4e0e\u53ec\u56de"]},
            {"tag": "\u6838\u5fc3", "tag_color": ORANGE, "title": "\u83dc\u54c1\u76c8\u5229\u5206\u6790", "content": ["\u56db\u8c61\u9650\u5206\u7c7b\u3001\u8d2d\u7269\u7bee\u5206\u6790", "\u6210\u672c\u6ce2\u52a8\u76d1\u63a7"]},
            {"tag": "\u6838\u5fc3", "tag_color": ORANGE, "title": "\u667a\u80fd\u91c7\u8d2d\u4e0e\u5e93\u5b58", "content": ["\u9500\u91cf\u9884\u6d4b\u3001\u667a\u80fd\u91c7\u8d2d\u5355", "\u6548\u671f\u9884\u8b66"]},
            {"tag": "\u6269\u5c55", "tag_color": GREEN, "title": "\u667a\u80fd\u5b9a\u4ef7\u4e0e\u4fc3\u9500", "content": ["\u52a8\u6001\u5b9a\u4ef7\u3001AI\u4fc3\u9500\u65b9\u6848", "\u5206\u5c42\u53d1\u5238"]},
            {"tag": "\u6269\u5c55", "tag_color": GREEN, "title": "\u5458\u5de5/\u8bc4\u4ef7/\u7cfb\u7edf", "content": ["\u5458\u5de5\u6392\u73ed\u3001\u8bc4\u4ef7\u53e3\u7891", "\u7cfb\u7edf\u7ba1\u7406"]},
        ]
    ))

    # 5. 技术架构
    slides.append(make_content_page(
        '\u5168\u6808\u6280\u672f\u67b6\u6784',
        '\u524d\u7aef\u4e09\u7aef + \u540e\u7aef\u670d\u52a1 + AI\u5c42 + \u6570\u636e\u5c42 + \u4e91\u90e8\u7f72',
        [
            {"tag": "\u524d\u7aef", "tag_color": GREEN, "title": "\u524d\u7aef\u5c55\u793a\u5c42", "content": ["Vue3 + Pinia + Vue Router + ECharts", "PC\u5546\u6237\u540e\u53f0 + \u624b\u673a\u5546\u6237\u7aef + \u987e\u5ba2\u626b\u7801\u9875"]},
            {"tag": "\u540e\u7aef", "tag_color": ORANGE, "title": "\u4e1a\u52a1\u63a5\u53e3\u5c42", "content": ["Fastify 5 + Prisma 6 + TypeBox", "Swagger\u6587\u6863\u3001CORS\u3001Helmet\u3001RateLimit"]},
            {"tag": "AI", "tag_color": BROWN, "title": "AI\u80fd\u529b\u5c42", "content": ["DeepSeek-V3\uff08\u63a8\u7406\uff09\u3001\u901a\u4e49\u5343\u95ee-Max\uff08BI\uff09", "\u8c46\u5305-Pro\uff08\u521b\u610f\uff09\u3001\u6587\u5fc3\u4e00\u8a00-4.0\uff08NLP\uff09"]},
            {"tag": "\u90e8\u7f72", "tag_color": RED, "title": "\u4e91\u90e8\u7f72\u5c42", "content": ["Docker Compose + Nginx", "\u817e\u8baf\u4e91\u516c\u7f51IP\u3001\u6570\u636e\u5377\u6301\u4e45\u5316"]},
        ]
    ))

    # 6. 业务闭环
    slides.append(make_content_page(
        '\u4e1a\u52a1\u95ed\u73af\uff1a\u4ece\u987e\u5ba2\u4e0b\u5355\u5230\u5546\u6237\u51b3\u7b56',
        '\u6570\u636e\u4e0d\u518d\u53ea\u662f\u9875\u9762\u5c55\u793a\uff0c\u800c\u662f\u53ef\u6301\u7eed\u8ba1\u7b97\u3001\u8ffd\u8e2a\u3001\u590d\u76d8\u7684\u7ecf\u8425\u8d44\u4ea7',
        [
            {"tag": "\u987e\u5ba2\u7aef", "tag_color": ORANGE, "title": "\u626b\u7801\u70b9\u9910", "content": ["\u684c\u7801token\u81ea\u52a8\u8bc6\u522b\u684c\u53f7", "\u83dc\u54c1\u3001\u6570\u91cf\u3001\u79f0\u547c\u3001\u624b\u673a\u53f7\u3001\u5907\u6ce8", "\u8d2d\u7269\u8f66\u3001\u52a0\u83dc\u3001\u8ba2\u5355\u72b6\u6001"]},
            {"tag": "\u5546\u6237\u7aef", "tag_color": GREEN, "title": "\u63a5\u5355\u4e0e\u5206\u6790", "content": ["\u8ba2\u5355\u961f\u5217\u3001\u72b6\u6001\u6d41\u8f6c\u52a8\u753b", "\u6570\u636e\u6c89\u6dc0\u5230\u5ba2\u6237/\u83dc\u54c1/\u8bc4\u4ef7", "AI\u65e5\u62a5\u3001\u91c7\u8d2d\u5efa\u8bae\u3001\u7ecf\u8425\u5206\u6790"]},
            {"tag": "\u6570\u636e", "tag_color": BROWN, "title": "\u6570\u636e\u6a21\u578b", "content": ["OneID\u5ba2\u6237\u4e3b\u6570\u636e\u3001\u8ba2\u5355\u4e8b\u5b9e\u8868", "\u83dc\u54c1\u7ef4\u5ea6\u8868\u3001\u6807\u7b7e\u4f53\u7cfb", "\u8ba2\u5355\u72b6\u6001\u673a\u767d\u540d\u5355\u6821\u9a8c"]},
            {"tag": "AI", "tag_color": RED, "title": "\u667a\u80fd\u8f85\u52a9", "content": ["SSE\u6d41\u5f0fAI\u95ee\u7b54", "\u591a\u6a21\u578b\u8def\u7531\u7b56\u7565", "\u7f6e\u4fe1\u5ea6\u6807\u6ce8\u3001\u53ef\u89e3\u91ca\u8f93\u51fa"]},
        ]
    ))

    # 7. 核心模块
    slides.append(make_content_page(
        '\u4e09\u5927\u6838\u5fc3\u6a21\u5757\u843d\u5730',
        '\u7528\u5177\u4f53\u6570\u636e\u548c\u573a\u666f\u8bc1\u660e\u4ea7\u54c1\u4ef7\u503c',
        [
            {"tag": "\u6a21\u5757\u4e00", "tag_color": ORANGE, "title": "\u7ecf\u8425\u9a7e\u9a76\u8231", "content": ["\u6bcf\u65e58\u70b9AI\u65e5\u62a5\u81ea\u52a8\u63a8\u9001", "\u542b\u8425\u6536/\u5229\u6da6/TOP3/\u5f02\u5e38/\u5efa\u8bae", "\u751f\u6210\u65f6\u95f4 < 30\u79d2"]},
            {"tag": "\u6a21\u5757\u4e8c", "tag_color": GREEN, "title": "\u5ba2\u6237\u8d44\u4ea7", "content": ["OneID\u8de8\u5e73\u53f0\u5408\u5e76\u5ba2\u6237", "\u624b\u673a\u53f7\u5339\u914d\u7387 > 95%", "\u81ea\u52a8RFM\u91cd\u7b97 + \u6d41\u5931\u98ce\u9669\u8bc4\u5206"]},
            {"tag": "\u6a21\u5757\u4e09", "tag_color": BROWN, "title": "\u667a\u80fd\u91c7\u8d2d", "content": ["\u57fa\u4e8e90\u5929\u5386\u53f2 + \u5929\u6c14\u9884\u6d4b\u9500\u91cf", "\u81ea\u52a8\u751f\u6210\u91c7\u8d2d\u5355", "\u635f\u8017\u7387\u4ece12%\u964d\u81f35%"]},
        ]
    ))

    # 8. 过渡页 - 问题与解决
    slides.append(make_transition(
        '\u9047\u5230\u7684\u95ee\u9898\u53ca\u89e3\u51b3\u65b9\u6848',
        '\u7b54\u8fa9\u8981\u6c42\u7b2c3\u6761\u91cd\u70b9 \u00b7 \u771f\u5b9e\u5f00\u53d1\u4e0d\u662f\u4e00\u8def\u987a\u98ce'
    ))

    # 9. 问题1
    slides.append(make_content_page(
        '\u95ee\u9898\u2460\uff1aAI\u56de\u590d\u201c\u5361\u6b7b\u201d\u7684\u5047\u8c61',
        '\u7528\u6237\u4f53\u9a8c\u4f18\u5316\uff1a\u4ece\u201c\u7b49\u5f85\u201d\u5230\u201c\u89c2\u770b\u201d',
        [
            {"tag": "\u73b0\u8c61", "tag_color": RED, "title": "\u95ee\u9898\u73b0\u8c61", "content": ["AI\u751f\u6210\u7ecf\u8425\u65e5\u62a5\u65f6\uff0c\u7528\u6237\u7b49\u5f8510\u79d2\u4ee5\u4e0a\u65e0\u53cd\u9988", "\u7528\u6237\u8bef\u4ee5\u4e3a\u7cfb\u7edf\u5361\u6b7b\uff0c\u53cd\u590d\u70b9\u51fb"]},
            {"tag": "\u539f\u56e0", "tag_color": BROWN, "title": "\u539f\u56e0\u5206\u6790", "content": ['\u975e\u6d41\u5f0f\u8fd4\u56de\uff0c\u7528\u6237\u770b\u4e0d\u5230\u201c\u601d\u8003\u4e2d\u201d\u7684\u72b6\u6001', "\u7f3a\u5c11\u8fdb\u5ea6\u53cd\u9988\u673a\u5236"]},
            {"tag": "\u89e3\u51b3", "tag_color": GREEN, "title": "\u89e3\u51b3\u65b9\u6848", "content": ["\u91c7\u7528SSE\u6d41\u5f0f\u8f93\u51fa\uff08Server-Sent Events\uff09", "reply.hijack() + X-Accel-Buffering:no", "AbortController\u63a7\u5236\u505c\u6b62\u751f\u6210"]},
            {"tag": "\u6548\u679c", "tag_color": ORANGE, "title": "\u6700\u7ec8\u6548\u679c", "content": ["\u7528\u6237\u5b9e\u65f6\u770b\u5230AI\u9010\u5b57\u751f\u6210", '\u4f53\u9a8c\u4ece\u201c\u7b49\u5f85\u201d\u53d8\u4e3a\u201c\u89c2\u770b\u201d', "\u652f\u6301\u505c\u6b62\u751f\u6210\u548c\u7981\u7528\u91cd\u590d\u53d1\u9001"]},
        ]
    ))

    # 10. 问题2
    slides.append(make_content_page(
        '\u95ee\u9898\u2461\uff1aAI\u4e0d\u80fd\u201c\u7f16\u201d\u6570\u636e',
        '\u7ecf\u8425\u7cfb\u7edf\u7684\u5e95\u7ebf\u2014\u2014\u7edd\u4e0d\u8bef\u5bfc\u7528\u6237',
        [
            {"tag": "\u73b0\u8c61", "tag_color": RED, "title": "\u95ee\u9898\u73b0\u8c61", "content": ["AI\u6a21\u578b\u672a\u8fde\u63a5\u65f6\uff0c\u53ef\u80fd\u751f\u6210\u865a\u5047\u7ecf\u8425\u5206\u6790", "LLM\u5e7b\u89c9\uff1a\u6a21\u578b\u4f1a\u81ea\u4fe1\u5730\u7f16\u9020\u6570\u636e"]},
            {"tag": "\u539f\u56e0", "tag_color": BROWN, "title": "\u539f\u56e0\u5206\u6790", "content": ["\u964d\u7ea7mock\u5bb9\u6613\u8bef\u5bfc\u771f\u5b9e\u7ecf\u8425\u5224\u65ad", "\u6ca1\u6709\u6570\u636e\u6e90\u6807\u8bb0\u548c\u6821\u9a8c\u673a\u5236"]},
            {"tag": "\u89e3\u51b3", "tag_color": GREEN, "title": "\u89e3\u51b3\u65b9\u6848", "content": ["dataSource\u6807\u8bb0\uff08real_orders | insufficient\uff09", "\u53ea\u7edf\u8ba1served/completed\u8ba2\u5355", "AI\u8f93\u51fa\u6807\u6ce8\u7f6e\u4fe1\u5ea6"]},
            {"tag": "\u6548\u679c", "tag_color": ORANGE, "title": "\u6700\u7ec8\u6548\u679c", "content": ["\u6a21\u578b\u4e0d\u53ef\u7528\u65f6\u76f4\u63a5\u5c55\u793a\u5931\u8d25\u539f\u56e0", "\u4e0d\u4f2a\u9020\u7ecf\u8425\u5efa\u8bae", "\u7ecf\u8425\u7cfb\u7edf\u7684\u5e95\u7ebf\uff1a\u7edd\u4e0d\u8bef\u5bfc\u7528\u6237"]},
        ]
    ))

    # 11. 问题3
    slides.append(make_content_page(
        '\u95ee\u9898\u2462\uff1a\u4ece\u5f00\u53d1\u5230\u4e0a\u7ebf\u7684\u6700\u540e\u4e00\u516c\u91cc',
        '\u5168\u94fe\u8def\u4ea4\u4ed8\u80fd\u529b\u548c\u8fd0\u7ef4\u601d\u7ef4',
        [
            {"tag": "\u95ee\u9898A", "tag_color": RED, "title": "\u4e8c\u7ef4\u7801\u5916\u7f51\u8bbf\u95ee", "content": ["\u4e8c\u7ef4\u7801\u4f7f\u7528localhost\u5bfc\u81f4\u5916\u7f51\u6253\u4e0d\u5f00", "\u89e3\u51b3\uff1a\u516c\u7f51\u57df\u540d + Nginx\u53cd\u5411\u4ee3\u7406"]},
            {"tag": "\u95ee\u9898B", "tag_color": RED, "title": "\u670d\u52a1\u5668\u663e\u793a\u65e7\u9875\u9762", "content": ["Nginx\u7f13\u5b58\u5bfc\u81f4\u9875\u9762\u4e0d\u66f4\u65b0", "\u89e3\u51b3\uff1a\u7f13\u5b58\u6e05\u7406 + Docker\u955c\u50cf\u7248\u672c\u5316"]},
            {"tag": "\u95ee\u9898C", "tag_color": RED, "title": "Docker\u90e8\u7f72\u51b2\u7a81", "content": ["\u7aef\u53e3\u51b2\u7a81\u3001\u4e2d\u6587\u8def\u5f84\u5bfc\u81f4compose\u5931\u8d25", "\u89e3\u51b3\uff1a\u56fa\u5b9aproject name\u3001\u72ec\u7acb\u7aef\u53e318080"]},
            {"tag": "\u95ee\u9898D", "tag_color": RED, "title": "\u8ba2\u5355\u7edf\u8ba1\u4e0d\u51c6", "content": ["\u53d6\u6d88\u8ba2\u5355\u88ab\u9519\u8bef\u8ba1\u5165\u9500\u91cf", "\u89e3\u51b3\uff1a\u72b6\u6001\u673a\u767d\u540d\u5355\uff0c\u53ea\u7edf\u8ba1completed"]},
        ]
    ))

    # 12. 过渡页 - 收获与成长
    slides.append(make_transition(
        '\u9879\u76ee\u5b8c\u6210\u540e\u7684\u6536\u83b7',
        '\u7b54\u8fa9\u8981\u6c42\u7b2c4\u6761\u91cd\u70b9 \u00b7 \u4ece\u201c\u5199\u9875\u9762\u201d\u5230\u201c\u505a\u7cfb\u7edf\u201d'
    ))

    # 13. 技术收获
    slides.append(make_content_page(
        '\u4ece\u6280\u672f\u6808\u5230\u5de5\u7a0b\u601d\u7ef4',
        '\u8fd9\u6b21\u9879\u76ee\u6700\u5927\u7684\u4ef7\u503c\uff0c\u662f\u4ece\u201c\u4f1a\u5199\u9875\u9762\u201d\u8d70\u5411\u201c\u80fd\u4ea4\u4ed8\u7cfb\u7edf\u201d',
        [
            {"tag": "\u524d\u7aef", "tag_color": GREEN, "title": "\u524d\u7aef\u80fd\u529b", "content": ["Vue3\u591a\u7aef\u9875\u9762\u5f00\u53d1", "Pinia\u72b6\u6001\u7ba1\u7406\u3001Vue Router\u8def\u7531", "\u79fb\u52a8\u7aef\u5f39\u5c42\u6eda\u52a8\u3001\u54cd\u5e94\u5f0f\u5e03\u5c40"]},
            {"tag": "\u540e\u7aef", "tag_color": ORANGE, "title": "\u540e\u7aef\u80fd\u529b", "content": ["Fastify\u63a5\u53e3\u8bbe\u8ba1\u3001Prisma\u6570\u636e\u5efa\u6a21", "\u6ce8\u518c\u767b\u5f55\u3001\u77ed\u4fe1\u9a8c\u8bc1\u7801\u3001\u8ba2\u5355\u63a5\u53e3", "\u5ba2\u6237\u3001\u83dc\u54c1\u3001\u91c7\u8d2d\u3001\u8bc4\u4ef7\u3001\u5929\u6c14\u63a5\u53e3"]},
            {"tag": "AI", "tag_color": BROWN, "title": "AI\u5de5\u7a0b\u5316", "content": ["SSE\u6d41\u5f0f\u8f93\u51fa\u3001\u591a\u6a21\u578b\u8def\u7531", "Prompt\u5de5\u7a0b\u3001Tool Schema\u8bbe\u8ba1", "\u7f6e\u4fe1\u5ea6\u6807\u6ce8\u3001\u53ef\u89e3\u91ca\u8f93\u51fa"]},
            {"tag": "\u8fd0\u7ef4", "tag_color": RED, "title": "\u90e8\u7f72\u8fd0\u7ef4", "content": ["Docker Compose\u4e09\u9636\u6bb5\u6784\u5efa", "Nginx\u53cd\u5411\u4ee3\u7406\u3001\u817e\u8baf\u4e91\u670d\u52a1\u5668", "\u901a\u8fc7\u65e5\u5fd7\u3001curl\u5b9a\u4f4d\u95ee\u9898"]},
        ]
    ))

    # 14. 成果展望
    slides.append(make_content_page(
        '\u6210\u679c\u4e0e\u672a\u6765\u65b9\u5411',
        '\u5df2\u5b8c\u6210\u6838\u5fc3\u95ed\u73af\uff0c\u672a\u6765\u6301\u7eed\u6269\u5c55',
        [
            {"tag": "\u5df2\u5b8c\u6210", "tag_color": GREEN, "title": "\u9879\u76ee\u6210\u679c", "content": ["\u4e09\u7aef\u7cfb\u7edf\uff1aPC\u540e\u53f0 + \u624b\u673a + \u987e\u5ba2\u626b\u7801", "8\u5927\u6a21\u5757\u3001AI\u65e5\u62a5\u3001\u5ba2\u6237OneID", "\u83dc\u54c1\u56db\u8c61\u9650\u3001\u667a\u80fd\u91c7\u8d2d\u3001Docker\u90e8\u7f72"]},
            {"tag": "\u91cf\u5316", "tag_color": ORANGE, "title": "\u91cf\u5316\u76ee\u6807", "content": ["\u6bcf\u65e5\u8282\u7701\u5bf9\u8d26\u65f6\u95f41.5\u5c0f\u65f6", "\u635f\u8017\u7387\u4ece12%\u964d\u81f35%", "\u590d\u8d2d\u7387\u63d0\u534720%"]},
            {"tag": "\u672a\u6765", "tag_color": BROWN, "title": "\u672a\u6765\u6269\u5c55", "content": ["\u8fde\u9501\u591a\u5e97\u770b\u677f\u3001\u4f9b\u5e94\u94fe\u6bd4\u4ef7", "AI\u5916\u547c\u53ec\u56de\u3001\u884c\u4e1a\u5782\u76f4\u65b9\u6848", "MySQL\u66ff\u6362\u3001HTTPS\u57df\u540d"]},
        ]
    ))

    # 15. 结尾
    slides.append(make_ending())

    # 构建布局和幻灯片rel
    layout_overrides = "".join([f'<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>' for _ in range(1)])
    slide_overrides = "".join([f'<Override PartName="/ppt/slides/slide{i}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>' for i in range(1, N + 1)])
    layout_rels = "".join([f'<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="slideLayouts/slideLayout1.xml"/>' for _ in range(1)])
    slide_rels = "".join([f'<Relationship Id="rId{i+3}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide{i}.xml"/>' for i in range(1, N + 1)])

    if OUT.exists():
        OUT.unlink()

    with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", CONTENT_TYPES.format(layout_overrides=layout_overrides, slide_overrides=slide_overrides))
        zf.writestr("_rels/.rels", ROOT_RELS)
        zf.writestr("docProps/app.xml", APP_PROPS)
        zf.writestr("docProps/core.xml", CORE_PROPS)
        zf.writestr("ppt/presentation.xml", make_presentation(N))
        zf.writestr("ppt/_rels/presentation.xml.rels", PRES_RELS.format(layout_rels=layout_rels, slide_rels=slide_rels))
        zf.writestr("ppt/theme/theme1.xml", THEME)
        zf.writestr("ppt/slideMasters/slideMaster1.xml", SLIDE_MASTER)
        zf.writestr("ppt/slideMasters/_rels/slideMaster1.xml.rels", MASTER_RELS)
        zf.writestr("ppt/tableStyles.xml", TABLE_STYLES)
        zf.writestr("ppt/presProps.xml", PRES_PROPS)
        zf.writestr("ppt/viewProps.xml", VIEW_PROPS)

        zf.writestr("ppt/slideLayouts/slideLayout1.xml", SLIDE_LAYOUT)
        zf.writestr("ppt/slideLayouts/_rels/slideLayout1.xml.rels", LAYOUT_RELS)

        for i, sxml in enumerate(slides, 1):
            zf.writestr(f"ppt/slides/slide{i}.xml", sxml)
            zf.writestr(f"ppt/slides/_rels/slide{i}.xml.rels", SLIDE_RELS)

    print(f"OK: {OUT} ({OUT.stat().st_size} bytes, {N} slides)")

if __name__ == "__main__":
    main()
