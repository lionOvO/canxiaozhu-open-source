#!/usr/bin/env python3
"""
使用纯Python标准库生成PPTX文件
PPTX本质上是ZIP包含XML文件
"""
import zipfile
import os
from pathlib import Path

# 颜色定义
ORANGE = "FF6B35"
GREEN = "00C853"
RED = "FF3D00"
BROWN = "5B361F"
BG = "F7F8FA"
CARD = "FFFFFF"
TEXT = "1A1A1A"
MUTED = "666666"
WHITE = "FFFFFF"

def create_pptx():
    """创建PPTX文件"""
    output_path = Path(r"D:\餐小助\餐小助_项目答辩PPT_完整版.pptx")
    
    # PPTX文件结构
    files = {}
    
    # [Content_Types].xml
    files["[Content_Types].xml"] = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
<Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
<Override PartName="/ppt/slides/slide2.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
<Override PartName="/ppt/slides/slide3.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
<Override PartName="/ppt/slides/slide4.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
<Override PartName="/ppt/slides/slide5.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
<Override PartName="/ppt/slides/slide6.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
<Override PartName="/ppt/slides/slide7.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
<Override PartName="/ppt/slides/slide8.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
<Override PartName="/ppt/slides/slide9.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
<Override PartName="/ppt/slides/slide10.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
<Override PartName="/ppt/slides/slide11.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
<Override PartName="/ppt/slides/slide12.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
<Override PartName="/ppt/slides/slide13.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
<Override PartName="/ppt/slides/slide14.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
<Override PartName="/ppt/slides/slide15.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
</Types>'''
    
    # _rels/.rels
    files["_rels/.rels"] = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>'''
    
    # ppt/_rels/presentation.xml.rels
    files["ppt/_rels/presentation.xml.rels"] = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>
<Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide2.xml"/>
<Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide3.xml"/>
<Relationship Id="rId6" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide4.xml"/>
<Relationship Id="rId7" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide5.xml"/>
<Relationship Id="rId8" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide6.xml"/>
<Relationship Id="rId9" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide7.xml"/>
<Relationship Id="rId10" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide8.xml"/>
<Relationship Id="rId11" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide9.xml"/>
<Relationship Id="rId12" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide10.xml"/>
<Relationship Id="rId13" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide11.xml"/>
<Relationship Id="rId14" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide12.xml"/>
<Relationship Id="rId15" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide13.xml"/>
<Relationship Id="rId16" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide14.xml"/>
<Relationship Id="rId17" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide15.xml"/>
</Relationships>'''
    
    # ppt/presentation.xml
    files["ppt/presentation.xml"] = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
<p:sldMasterIdLst>
<p:sldMasterId id="2147483648" r:id="rId1"/>
</p:sldMasterIdLst>
<p:sldIdLst>
<p:sldId id="256" r:id="rId3"/>
<p:sldId id="257" r:id="rId4"/>
<p:sldId id="258" r:id="rId5"/>
<p:sldId id="259" r:id="rId6"/>
<p:sldId id="260" r:id="rId7"/>
<p:sldId id="261" r:id="rId8"/>
<p:sldId id="262" r:id="rId9"/>
<p:sldId id="263" r:id="rId10"/>
<p:sldId id="264" r:id="rId11"/>
<p:sldId id="265" r:id="rId12"/>
<p:sldId id="266" r:id="rId13"/>
<p:sldId id="267" r:id="rId14"/>
<p:sldId id="268" r:id="rId15"/>
<p:sldId id="269" r:id="rId16"/>
<p:sldId id="270" r:id="rId17"/>
</p:sldIdLst>
<p:sldSz cx="12192000" cy="6858000" type="screen16x9"/>
<p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>'''
    
    # ppt/theme/theme1.xml
    files["ppt/theme/theme1.xml"] = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
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
<a:majorFont><a:latin typeface="Microsoft YaHei"/><a:ea typeface="Microsoft YaHei"/></a:majorFont>
<a:minorFont><a:latin typeface="Microsoft YaHei"/><a:ea typeface="Microsoft YaHei"/></a:minorFont>
</a:fontScheme>
<a:fmtScheme name="Office">
<a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst>
<a:lnStyleLst><a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst>
<a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst>
<a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst>
</a:fmtScheme>
</a:themeElements>
</a:theme>'''
    
    # ppt/slideMasters/slideMaster1.xml
    files["ppt/slideMasters/slideMaster1.xml"] = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
<p:cSld>
<p:bg><p:bgPr><a:solidFill><a:srgbClr val="F7F8FA"/></a:solidFill></p:bgPr></p:bg>
<p:spTree>
<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
<p:grpSpPr/>
</p:spTree>
</p:cSld>
<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
<p:sldLayoutIdLst>
<p:sldLayoutId id="2147483649" r:id="rId1"/>
</p:sldLayoutIdLst>
</p:sldMaster>'''
    
    # ppt/slideMasters/_rels/slideMaster1.xml.rels
    files["ppt/slideMasters/_rels/slideMaster1.xml.rels"] = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
</Relationships>'''
    
    # ppt/slideLayouts/slideLayout1.xml
    files["ppt/slideLayouts/slideLayout1.xml"] = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" name="空白">
<p:cSld>
<p:spTree>
<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
<p:grpSpPr/>
</p:spTree>
</p:cSld>
</p:sldLayout>'''
    
    # ppt/slideLayouts/_rels/slideLayout1.xml.rels
    files["ppt/slideLayouts/_rels/slideLayout1.xml.rels"] = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>'''
    
    # 生成15个幻灯片
    for i in range(1, 16):
        files[f"ppt/slides/_rels/slide{i}.xml.rels"] = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>'''
    
    # 创建幻灯片内容
    files["ppt/slides/slide1.xml"] = create_slide1()
    files["ppt/slides/slide2.xml"] = create_slide2()
    files["ppt/slides/slide3.xml"] = create_slide3()
    files["ppt/slides/slide4.xml"] = create_slide4()
    files["ppt/slides/slide5.xml"] = create_slide5()
    files["ppt/slides/slide6.xml"] = create_slide6()
    files["ppt/slides/slide7.xml"] = create_slide7()
    files["ppt/slides/slide8.xml"] = create_slide8()
    files["ppt/slides/slide9.xml"] = create_slide9()
    files["ppt/slides/slide10.xml"] = create_slide10()
    files["ppt/slides/slide11.xml"] = create_slide11()
    files["ppt/slides/slide12.xml"] = create_slide12()
    files["ppt/slides/slide13.xml"] = create_slide13()
    files["ppt/slides/slide14.xml"] = create_slide14()
    files["ppt/slides/slide15.xml"] = create_slide15()
    
    # 写入ZIP文件
    with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        for path, content in files.items():
            zf.writestr(path, content.encode('utf-8'))
    
    print(f"✓ PPT已生成：{output_path}")
    print(f"✓ 共15页")
    print("✓ 重点内容：第6-9页（问题与解决）、第10-12页（收获与成长）")

def create_textbox(id, x, y, cx, cy, text, font_size=1800, bold=False, color=TEXT, align="l"):
    """创建文本框XML"""
    bold_attr = ' b="1"' if bold else ''
    return f'''<p:sp>
<p:nvSpPr><p:cNvPr id="{id}" name="TextBox{id}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>
<p:spPr>
<a:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="{cx}" cy="{cy}"/></a:xfrm>
<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
<a:noFill/>
</p:spPr>
<p:txBody>
<a:bodyPr wrap="square" lIns="91440" tIns="45720" rIns="91440" bIns="45720" anchor="t"/>
<a:lstStyle/>
<a:p>
<a:pPr algn="{align}"/>
<a:r>
<a:rPr lang="zh-CN" sz="{font_size}"{bold_attr} dirty="0">
<a:solidFill><a:srgbClr val="{color}"/></a:solidFill>
<a:latin typeface="Microsoft YaHei"/>
<a:ea typeface="Microsoft YaHei"/>
</a:rPr>
<a:t>{text}</a:t>
</a:r>
</a:p>
</p:txBody>
</p:sp>'''

def create_shape(id, x, y, cx, cy, fill_color, shape="rect"):
    """创建形状XML"""
    return f'''<p:sp>
<p:nvSpPr><p:cNvPr id="{id}" name="Shape{id}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
<p:spPr>
<a:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="{cx}" cy="{cy}"/></a:xfrm>
<a:prstGeom prst="{shape}"><a:avLst/></a:prstGeom>
<a:solidFill><a:srgbClr val="{fill_color}"/></a:solidFill>
<a:ln><a:noFill/></a:ln>
</p:spPr>
<p:txBody>
<a:bodyPr/>
<a:lstStyle/>
<a:p><a:endParaRPr lang="zh-CN"/></a:p>
</p:txBody>
</p:sp>'''

def create_slide1():
    """第1页：封面"""
    shapes = []
    shapes.append(create_shape(2, 0, 0, 12192000, 6858000, "FF8C5A"))
    shapes.append(create_textbox(3, 914400, 2743200, 10363200, 914400, "餐小助", 5200, True, WHITE, "ctr"))
    shapes.append(create_textbox(4, 914400, 3657600, 10363200, 457200, "商户智能经营助手", 2800, True, WHITE, "ctr"))
    shapes.append(create_textbox(5, 914400, 4114800, 10363200, 274320, '项目答辩——从"会写页面"到"能交付系统"', 1400, False, "FFD0B8", "ctr"))
    shapes.append(create_textbox(6, 914400, 4800600, 10363200, 228600, "答辩人：餐小助团队    2026年8月", 1200, False, "FFD0B8", "ctr"))
    
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
<p:cSld>
<p:bg><p:bgPr><a:solidFill><a:srgbClr val="FF8C5A"/></a:solidFill></p:bgPr></p:bg>
<p:spTree>
<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
<p:grpSpPr/>
{"".join(shapes)}
</p:spTree>
</p:cSld>
</p:sld>'''

def create_slide2():
    """第2页：目录"""
    shapes = []
    shapes.append(create_shape(2, 0, 0, 12192000, 45720, ORANGE))
    shapes.append(create_textbox(3, 548640, 182880, 10971840, 457200, "答辩提纲", 2800, True, TEXT, "l"))
    shapes.append(create_textbox(4, 548640, 640080, 10971840, 228600, "五大章节，重点聚焦问题与收获", 1200, False, MUTED, "l"))
    
    items = [
        ("01", "项目介绍", '中小餐饮的"数字店长"', ORANGE),
        ("02", "功能与技术", "八大模块 + 全栈架构", GREEN),
        ("03", "问题与解决", "开发中的技术挑战（重点）", RED),
        ("04", "收获与成长", "从技术栈到工程思维（重点）", BROWN),
        ("05", "成果展望", "量化成果与未来方向", GREEN),
    ]
    
    sid = 5
    for i, (num, title, desc, color) in enumerate(items):
        y = 1143000 + i * 1005840
        shapes.append(create_shape(sid, 548640, y, 11088960, 822960, CARD))
        sid += 1
        shapes.append(create_shape(sid, 731520, y + 114300, 548640, 548640, color, "ellipse"))
        sid += 1
        shapes.append(create_textbox(sid, 731520, y + 114300, 548640, 548640, num, 2000, True, WHITE, "ctr"))
        sid += 1
        shapes.append(create_textbox(sid, 1508760, y + 73152, 2926080, 274320, title, 1800, True, TEXT, "l"))
        sid += 1
        shapes.append(create_textbox(sid, 1508760, y + 388620, 9144000, 228600, desc, 1200, False, MUTED, "l"))
        sid += 1
    
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
<p:cSld>
<p:bg><p:bgPr><a:solidFill><a:srgbClr val="{BG}"/></a:solidFill></p:bgPr></p:bg>
<p:spTree>
<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
<p:grpSpPr/>
{"".join(shapes)}
</p:spTree>
</p:cSld>
</p:sld>'''

def create_content_slide(title, subtitle, cards_data):
    """创建内容页通用函数"""
    shapes = []
    shapes.append(create_shape(2, 0, 0, 12192000, 45720, ORANGE))
    shapes.append(create_textbox(3, 548640, 182880, 10971840, 457200, title, 2800, True, TEXT, "l"))
    shapes.append(create_textbox(4, 548640, 640080, 10971840, 228600, subtitle, 1200, False, MUTED, "l"))
    
    sid = 5
    n = len(cards_data)
    cols = 2 if n > 3 else n
    
    for i, (tag, tag_color, card_title, content) in enumerate(cards_data):
        col = i % cols
        row = i // cols
        x = 548640 + col * 5670000
        y = 1005840 + row * 2743200
        
        shapes.append(create_shape(sid, x, y, 5486400, 2560320, CARD))
        sid += 1
        shapes.append(create_shape(sid, x + 114300, y + 114300, 731520, 228600, tag_color, "roundRect"))
        sid += 1
        shapes.append(create_textbox(sid, x + 114300, y + 114300, 731520, 228600, tag, 1000, True, WHITE, "ctr"))
        sid += 1
        shapes.append(create_textbox(sid, x + 114300, y + 411480, 5257800, 228600, card_title, 1500, True, TEXT, "l"))
        sid += 1
        
        content_text = "\n".join([f"• {line}" for line in content])
        shapes.append(create_textbox(sid, x + 114300, y + 685800, 5257800, 1714500, content_text, 1100, False, MUTED, "l"))
        sid += 1
    
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
<p:cSld>
<p:bg><p:bgPr><a:solidFill><a:srgbClr val="{BG}"/></a:solidFill></p:bgPr></p:bg>
<p:spTree>
<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
<p:grpSpPr/>
{"".join(shapes)}
</p:spTree>
</p:cSld>
</p:sld>'''

def create_slide3():
    """第3页：项目定位"""
    cards = [
        ("痛点", RED, "核心痛点", ["中小餐饮平均寿命仅18个月", "不会算账、不会管客、不会控损耗", "多渠道数据孤岛，对账困难"]),
        ("方案", GREEN, "解决方案", ["AI经营助手，自动算账、管客、控损耗", "接入美团/饿了么/抖音等多渠道数据", "每日自动生成经营日报"]),
        ("价值", ORANGE, "量化价值", ["单店月均降本3000元", "单店月均增收5000元", "综合经营效率提升30%"]),
        ("形态", BROWN, "产品形态", ["PC商户后台：复杂配置与数据看板", "手机端商户页：移动查看关键数据", "顾客扫码点餐页：桌码进入点餐"]),
    ]
    return create_content_slide('项目定位：中小餐饮的"数字店长"', '中小餐饮平均寿命18个月，死因是"不会算账、不会管客、不会控损耗"', cards)

def create_slide4():
    """第4页：功能架构"""
    cards = [
        ("核心", ORANGE, "AI经营驾驶舱", ["日报自动生成、多渠道对账", "异常预警、语音问答"]),
        ("核心", ORANGE, "客户资产管家", ["OneID打通、38个自动标签", "RFM分层、流失预警与召回"]),
        ("核心", ORANGE, "菜品盈利分析", ["四象限分类、购物篮分析", "成本波动监控"]),
        ("核心", ORANGE, "智能采购与库存", ["销量预测、智能采购单", "效期预警"]),
        ("扩展", GREEN, "智能定价与促销", ["动态定价、AI促销方案", "分层发券"]),
        ("扩展", GREEN, "员工/评价/系统", ["员工排班、评价口碑", "系统管理"]),
    ]
    return create_content_slide("八大模块覆盖经营全链路", "围绕PRD的8大模块，当前项目已覆盖核心可演示链路", cards)

def create_slide5():
    """第5页：技术架构"""
    cards = [
        ("前端", GREEN, "前端展示层", ["Vue3 + Pinia + Vue Router + ECharts", "PC商户后台 + 手机商户端 + 顾客扫码页"]),
        ("后端", ORANGE, "业务接口层", ["Fastify 5 + Prisma 6 + TypeBox", "Swagger文档、CORS、Helmet、RateLimit"]),
        ("AI", BROWN, "AI能力层", ["DeepSeek-V3（推理）、通义千问-Max（BI）", "豆包-Pro（创意）、文心一言-4.0（NLP）"]),
        ("部署", RED, "云部署层", ["Docker Compose + Nginx", "腾讯云公网IP、数据卷持久化"]),
    ]
    return create_content_slide("全栈技术架构", "前端三端 + 后端服务 + AI层 + 数据层 + 云部署", cards)

def create_slide6():
    """第6页：过渡页 - 问题与解决"""
    shapes = []
    shapes.append(create_shape(2, 0, 0, 12192000, 6858000, BROWN))
    shapes.append(create_textbox(3, 914400, 1828800, 10363200, 457200, "CORE SECTION", 1300, True, WHITE, "ctr"))
    shapes.append(create_textbox(4, 914400, 2743200, 10363200, 914400, "遇到的问题及解决方案", 4400, True, WHITE, "ctr"))
    shapes.append(create_textbox(5, 914400, 3886200, 10363200, 365760, "答辩要求第3条重点 · 真实开发不是一路顺风", 1600, False, "FFD0B8", "ctr"))
    
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
<p:cSld>
<p:bg><p:bgPr><a:solidFill><a:srgbClr val="{BROWN}"/></a:solidFill></p:bgPr></p:bg>
<p:spTree>
<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
<p:grpSpPr/>
{"".join(shapes)}
</p:spTree>
</p:cSld>
</p:sld>'''

def create_slide7():
    """第7页：问题① - AI回复卡死"""
    cards = [
        ("现象", RED, "问题现象", ["AI生成经营日报时，用户等待10秒以上无反馈", "用户误以为系统卡死，反复点击"]),
        ("原因", BROWN, "原因分析", ['非流式返回，用户看不到"思考中"的状态', "缺少进度反馈机制"]),
        ("解决", GREEN, "解决方案", ["采用SSE流式输出（Server-Sent Events）", "reply.hijack() + X-Accel-Buffering:no", "AbortController控制停止生成"]),
        ("效果", ORANGE, "最终效果", ["用户实时看到AI逐字生成", '体验从"等待"变为"观看"', "支持停止生成和禁用重复发送"]),
    ]
    return create_content_slide('问题①：AI回复"卡死"的假象', '用户体验优化：从"等待"到"观看"', cards)

def create_slide8():
    """第8页：问题② - 数据真实性"""
    cards = [
        ("现象", RED, "问题现象", ["AI模型未连接时，可能生成虚假经营分析", "LLM幻觉：模型会自信地编造数据"]),
        ("原因", BROWN, "原因分析", ["降级mock容易误导真实经营判断", "没有数据源标记和校验机制"]),
        ("解决", GREEN, "解决方案", ["dataSource标记（real_orders | insufficient）", "只统计served/completed订单", "AI输出标注置信度"]),
        ("效果", ORANGE, "最终效果", ["模型不可用时直接展示失败原因", "不伪造经营建议", "经营系统的底线：绝不误导用户"]),
    ]
    return create_content_slide('问题②：AI不能"编"数据', '经营系统的底线——绝不误导用户', cards)

def create_slide9():
    """第9页：问题③ - 部署上线"""
    cards = [
        ("问题A", RED, "二维码外网访问", ["二维码使用localhost导致外网打不开", "解决：公网域名 + Nginx反向代理"]),
        ("问题B", RED, "服务器显示旧页面", ["Nginx缓存导致页面不更新", "解决：缓存清理 + Docker镜像版本化"]),
        ("问题C", RED, "Docker部署冲突", ["端口冲突、中文路径导致compose失败", "解决：固定project name、独立端口18080"]),
        ("问题D", RED, "订单统计不准", ["取消订单被错误计入销量", "解决：状态机白名单，只统计completed"]),
    ]
    return create_content_slide("问题③：从开发到上线的最后一公里", "全链路交付能力和运维思维", cards)

def create_slide10():
    """第10页：过渡页 - 收获与成长"""
    shapes = []
    shapes.append(create_shape(2, 0, 0, 12192000, 6858000, BROWN))
    shapes.append(create_textbox(3, 914400, 1828800, 10363200, 457200, "CORE SECTION", 1300, True, WHITE, "ctr"))
    shapes.append(create_textbox(4, 914400, 2743200, 10363200, 914400, "项目完成后的收获", 4400, True, WHITE, "ctr"))
    shapes.append(create_textbox(5, 914400, 3886200, 10363200, 365760, '答辩要求第4条重点 · 从"写页面"到"做系统"', 1600, False, "FFD0B8", "ctr"))
    
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
<p:cSld>
<p:bg><p:bgPr><a:solidFill><a:srgbClr val="{BROWN}"/></a:solidFill></p:bgPr></p:bg>
<p:spTree>
<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
<p:grpSpPr/>
{"".join(shapes)}
</p:spTree>
</p:cSld>
</p:sld>'''

def create_slide11():
    """第11页：技术收获"""
    cards = [
        ("前端", GREEN, "前端能力", ["Vue3多端页面开发", "Pinia状态管理、Vue Router路由", "移动端弹层滚动、响应式布局"]),
        ("后端", ORANGE, "后端能力", ["Fastify接口设计、Prisma数据建模", "注册登录、短信验证码、订单接口", "客户、菜品、采购、评价、天气接口"]),
        ("AI", BROWN, "AI工程化", ["SSE流式输出、多模型路由", "Prompt工程、Tool Schema设计", "置信度标注、可解释输出"]),
        ("运维", RED, "部署运维", ["Docker Compose三阶段构建", "Nginx反向代理、腾讯云服务器", "通过日志、curl定位问题"]),
    ]
    return create_content_slide("从技术栈到工程思维", '这次项目最大的价值，是从"会写页面"走向"能交付系统"', cards)

def create_slide12():
    """第12页：工程思维收获"""
    cards = [
        ("思维1", ORANGE, "数据真实性优先", ["不为页面好看而伪造数据", "dataSource标记、状态机白名单", "经营系统的底线思维"]),
        ("思维2", GREEN, "用户体验闭环", ["从'能用'到'好用'", "SSE流式输出、进度反馈", "异常提示、错误处理"]),
        ("思维3", BROWN, "全链路交付", ["从本地开发到云端部署", "Docker容器化、Nginx配置", "域名、HTTPS、缓存管理"]),
        ("思维4", RED, "可维护性", ["代码结构清晰、模块解耦", "TypeBox类型安全、Prisma ORM", "日志记录、问题定位能力"]),
    ]
    return create_content_slide("工程思维的转变", "从功能实现到系统交付的全局视角", cards)

def create_slide13():
    """第13页：成果展示"""
    cards = [
        ("已完成", GREEN, "系统交付", ["三端系统：PC后台 + 手机 + 顾客扫码", "8大模块、AI日报、客户OneID", "菜品四象限、智能采购、Docker部署"]),
        ("量化", ORANGE, "量化目标", ["每日节省对账时间1.5小时", "损耗率从12%降至5%", "复购率提升20%"]),
        ("演示", BROWN, "演示截图位", ["[此处插入系统截图]", "经营驾驶舱、客户详情页", "采购单确认页、AI问答界面"]),
    ]
    return create_content_slide("成果展示", "核心功能演示与量化指标", cards)

def create_slide14():
    """第14页：未来展望"""
    cards = [
        ("短期", ORANGE, "功能完善", ["MySQL替换SQLite", "HTTPS域名配置", "更多AI模型接入"]),
        ("中期", GREEN, "业务扩展", ["连锁多店看板", "供应链比价", "AI外呼召回"]),
        ("长期", BROWN, "行业深耕", ["行业垂直方案", "数据中台建设", "SaaS化服务"]),
    ]
    return create_content_slide("未来展望", "持续迭代与扩展方向", cards)

def create_slide15():
    """第15页：致谢"""
    shapes = []
    shapes.append(create_shape(2, 0, 0, 12192000, 6858000, "FF8C5A"))
    shapes.append(create_textbox(3, 914400, 2286000, 10363200, 1143000, "感谢聆听", 5600, True, WHITE, "ctr"))
    shapes.append(create_textbox(4, 914400, 4114800, 10363200, 548640, "餐小助 · 让AI帮你盯店，你只管做好菜", 2000, False, "FFE0D0", "ctr"))
    
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
<p:cSld>
<p:bg><p:bgPr><a:solidFill><a:srgbClr val="FF8C5A"/></a:solidFill></p:bgPr></p:bg>
<p:spTree>
<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
<p:grpSpPr/>
{"".join(shapes)}
</p:spTree>
</p:cSld>
</p:sld>'''

if __name__ == "__main__":
    create_pptx()
