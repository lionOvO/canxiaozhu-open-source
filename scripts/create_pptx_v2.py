#!/usr/bin/env python3
"""
生成完整的餐小助项目答辩PPTX文件
使用Python内置库构建符合OOXML标准的PPTX
"""

import zipfile
import os
from pathlib import Path
from xml.etree.ElementTree import Element, SubElement, tostring

OUTPUT_FILE = Path(__file__).parent.parent / "餐小助_项目答辩PPT_重点问题解决与收获.pptx"

# 颜色
C = {
    'orange': 'FF6B35', 'green': '00C853', 'red': 'FF3D00',
    'bg': 'F7F8FA', 'card': 'FFFFFF', 'text': '1A1A1A',
    'muted': '666666', 'brown': '5B361F', 'white': 'FFFFFF',
    'light_orange': 'FFF0E8', 'light_green': 'E8F8F0',
    'border': 'E0E0E0', 'dark_bg': '2C2C2C',
}

# EMU单位转换
def emu(cm_val):
    return str(int(cm_val * 360000))

def set_attrs(elem, **kwargs):
    """Set multiple attributes on an element"""
    for k, v in kwargs.items():
        elem.set(k, str(v))
    return elem

# 幻灯片尺寸 33.87cm x 19.05cm (16:9)
SLIDE_W = emu(33.87)
SLIDE_H = emu(19.05)

def xml_str(elem):
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + tostring(elem, encoding='unicode')

def add_ns(elem, prefixes):
    """添加命名空间声明"""
    for prefix, uri in prefixes.items():
        elem.set(f'xmlns:{prefix}', uri)

# ==================== 内容类型 ====================
def make_content_types():
    root = Element('Types')
    root.set('xmlns', 'http://schemas.openxmlformats.org/package/2006/content-types')

    defaults = [
        ('rels', 'application/vnd.openxmlformats-package.relationships+xml'),
        ('xml', 'application/xml'),
    ]
    for ext, ct in defaults:
        e = SubElement(root, 'Default')
        e.set('Extension', ext)
        e.set('ContentType', ct)

    overrides = [
        ('/docProps/app.xml', 'application/vnd.openxmlformats-officedocument.extended-properties+xml'),
        ('/docProps/core.xml', 'application/vnd.openxmlformats-package.core-properties+xml'),
        ('/ppt/presentation.xml', 'application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml'),
        ('/ppt/theme/theme1.xml', 'application/vnd.openxmlformats-officedocument.theme+xml'),
        ('/ppt/slideMasters/slideMaster1.xml', 'application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml'),
        ('/ppt/slideLayouts/slideLayout1.xml', 'application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml'),
        ('/ppt/slideLayouts/slideLayout2.xml', 'application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml'),
        ('/ppt/tableStyles/tableStyle1.xml', 'application/vnd.openxmlformats-officedocument.presentationml.tableStyles+xml'),
    ]
    for i in range(1, 16):
        overrides.append((f'/ppt/slides/slide{i}.xml', 'application/vnd.openxmlformats-officedocument.presentationml.slide+xml'))

    for pn, ct in overrides:
        e = SubElement(root, 'Override')
        e.set('PartName', pn)
        e.set('ContentType', ct)

    return xml_str(root)

# ==================== 关系文件 ====================
def make_root_rels():
    root = Element('Relationships')
    root.set('xmlns', 'http://schemas.openxmlformats.org/package/2006/relationships')
    items = [
        ('rId1', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument', 'ppt/presentation.xml'),
        ('rId2', 'http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties', 'docProps/core.xml'),
        ('rId3', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties', 'docProps/app.xml'),
    ]
    for rid, rt, target in items:
        e = SubElement(root, 'Relationship')
        e.set('Id', rid)
        e.set('Type', rt)
        e.set('Target', target)
    return xml_str(root)

def make_presentation_rels():
    root = Element('Relationships')
    root.set('xmlns', 'http://schemas.openxmlformats.org/package/2006/relationships')
    items = [
        ('rId1', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster', 'slideMasters/slideMaster1.xml'),
        ('rId2', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme', 'theme/theme1.xml'),
        ('rId3', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/tableStyles', 'tableStyles/tableStyle1.xml'),
    ]
    for i in range(1, 16):
        items.append((f'rId{i+3}', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide', f'slides/slide{i}.xml'))
    for rid, rt, target in items:
        e = SubElement(root, 'Relationship')
        e.set('Id', rid)
        e.set('Type', rt)
        e.set('Target', target)
    return xml_str(root)

def make_slide_rels(slide_num):
    root = Element('Relationships')
    root.set('xmlns', 'http://schemas.openxmlformats.org/package/2006/relationships')
    e = SubElement(root, 'Relationship')
    e.set('Id', 'rId1')
    e.set('Type', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout')
    e.set('Target', '../slideLayouts/slideLayout1.xml')
    return xml_str(root)

def make_master_rels():
    root = Element('Relationships')
    root.set('xmlns', 'http://schemas.openxmlformats.org/package/2006/relationships')
    items = [
        ('rId1', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout', 'slideLayouts/slideLayout1.xml'),
        ('rId2', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout', 'slideLayouts/slideLayout2.xml'),
        ('rId3', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme', 'theme/theme1.xml'),
    ]
    for rid, rt, target in items:
        e = SubElement(root, 'Relationship')
        e.set('Id', rid)
        e.set('Type', rt)
        e.set('Target', target)
    return xml_str(root)

def make_layout_rels():
    root = Element('Relationships')
    root.set('xmlns', 'http://schemas.openxmlformats.org/package/2006/relationships')
    e = SubElement(root, 'Relationship')
    e.set('Id', 'rId1')
    e.set('Type', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster')
    e.set('Target', '../slideMasters/slideMaster1.xml')
    return xml_str(root)

# ==================== 文档属性 ====================
def make_app_props():
    root = Element('Properties')
    root.set('xmlns', 'http://schemas.openxmlformats.org/officeDocument/2006/extended-properties')
    root.set('xmlns:vt', 'http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes')
    e = SubElement(root, 'Application')
    e.text = 'Microsoft Office PowerPoint'
    e = SubElement(root, 'PresentationFormat')
    e.text = 'Widescreen'
    e = SubElement(root, 'Slides')
    e.text = '15'
    return xml_str(root)

def make_core_props():
    root = Element('cp:coreProperties')
    root.set('xmlns:cp', 'http://schemas.openxmlformats.org/package/2006/metadata/core-properties')
    root.set('xmlns:dc', 'http://purl.org/dc/elements/1.1/')
    root.set('xmlns:dcterms', 'http://purl.org/dc/terms/')
    root.set('xmlns:dcmitype', 'http://purl.org/dc/dcmitype/')
    root.set('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance')
    e = SubElement(root, 'dc:title')
    e.text = '餐小助·项目答辩PPT'
    e = SubElement(root, 'dc:subject')
    e.text = '项目答辩'
    e = SubElement(root, 'dc:creator')
    e.text = '餐小助团队'
    e = SubElement(root, 'cp:lastModifiedBy')
    e.text = '餐小助团队'
    return xml_str(root)

# ==================== 演示文稿 ====================
def make_presentation():
    root = Element('p:presentation')
    ns = {
        'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
        'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
        'p': 'http://schemas.openxmlformats.org/presentationml/2006/main',
    }
    for p, u in ns.items():
        root.set(f'xmlns:{p}', u)

    sldSz = SubElement(root, 'p:sldSz')
    sldSz.set('cx', SLIDE_W)
    sldSz.set('cy', SLIDE_H)
    sldSz.set('type', 'screen16x9')

    notesSz = SubElement(root, 'p:notesSz')
    notesSz.set('cx', '6858000')
    notesSz.set('cy', '9144000')

    sldIdLst = SubElement(root, 'p:sldIdLst')
    for i in range(1, 16):
        sldId = SubElement(sldIdLst, 'p:sldId')
        sldId.set('id', str(256 + i))
        sldId.set('r:id', f'rId{i+3}')

    sldMasterIdLst = SubElement(root, 'p:sldMasterIdLst')
    sldMasterId = SubElement(sldMasterIdLst, 'p:sldMasterId')
    sldMasterId.set('id', '2147483648')
    sldMasterId.set('r:id', 'rId1')

    return xml_str(root)

# ==================== 主题 ====================
def make_theme():
    root = Element('a:theme')
    root.set('name', '餐小助主题')
    root.set('xmlns:a', 'http://schemas.openxmlformats.org/drawingml/2006/main')

    themeElements = SubElement(root, 'a:themeElements')

    # 配色方案
    clrScheme = SubElement(themeElements, 'a:clrScheme')
    clrScheme.set('name', '餐小助')
    colors = [
        ('dk1', C['text']), ('lt1', C['white']),
        ('dk2', C['brown']), ('lt2', C['bg']),
        ('accent1', C['orange']), ('accent2', C['green']),
        ('accent3', C['red']), ('accent4', C['brown']),
        ('accent5', C['orange']), ('accent6', C['green']),
        ('hlink', C['orange']), ('folHlink', C['green']),
    ]
    for name, val in colors:
        e = SubElement(clrScheme, f'a:{name}')
        s = SubElement(e, 'a:srgbClr')
        s.set('val', val)

    # 字体方案
    fontScheme = SubElement(themeElements, 'a:fontScheme')
    fontScheme.set('name', '餐小助字体')
    majorFont = SubElement(fontScheme, 'a:majorFont')
    SubElement(majorFont, 'a:latin').set('typeface', 'Microsoft YaHei')
    SubElement(majorFont, 'a:ea').set('typeface', 'Microsoft YaHei')
    SubElement(majorFont, 'a:cs').set('typeface', 'Microsoft YaHei')
    minorFont = SubElement(fontScheme, 'a:minorFont')
    SubElement(minorFont, 'a:latin').set('typeface', 'Microsoft YaHei')
    SubElement(minorFont, 'a:ea').set('typeface', 'Microsoft YaHei')
    SubElement(minorFont, 'a:cs').set('typeface', 'Microsoft YaHei')

    # 格式方案
    fmtScheme = SubElement(themeElements, 'a:fmtScheme')
    lnStyleLst = SubElement(fmtScheme, 'a:lnStyleLst')
    for sz in ['6350', '12700', '19050']:
        ln = SubElement(lnStyleLst, 'a:ln')
        ln.set('w', sz)
        SubElement(ln, 'a:solidFill').append(_srgb(C['muted']))
        SubElement(ln, 'a:prstDash').set('val', 'solid')
        SubElement(ln, 'a:round')

    fillStyleLst = SubElement(fmtScheme, 'a:fillStyleLst')
    solidFill = SubElement(fillStyleLst, 'a:solidFill')
    solidFill.append(_srgb(C['bg']))
    for _ in range(2):
        gsLst = SubElement(fillStyleLst, 'a:gradFill')
        gsLst.append(_make_grad_stop('0', C['orange'], '0'))
        gsLst.append(_make_grad_stop('100000', C['green'], '0'))

    effectStyleLst = SubElement(fmtScheme, 'a:effectStyleLst')
    for _ in range(3):
        es = SubElement(effectStyleLst, 'a:effectStyle')
        SubElement(es, 'a:effectLst')

    bgFillStyleLst = SubElement(fmtScheme, 'a:bgFillStyleLst')
    SubElement(bgFillStyleLst, 'a:solidFill').append(_srgb(C['bg']))
    for _ in range(2):
        gsLst = SubElement(bgFillStyleLst, 'a:gradFill')
        gsLst.append(_make_grad_stop('0', C['bg'], '0'))
        gsLst.append(_make_grad_stop('100000', C['card'], '0'))

    return xml_str(root)

def _srgb(color):
    e = Element('a:srgbClr')
    e.set('val', color)
    return e

def _make_grad_stop(pos, color, alpha):
    gs = Element('a:gs')
    gs.set('pos', pos)
    srgb = SubElement(gs, 'a:srgbClr')
    srgb.set('val', color)
    if alpha != '0':
        SubElement(srgb, 'a:alpha').set('val', alpha)
    return gs

# ==================== 幻灯片母版 ====================
def make_slide_master():
    root = Element('p:sldMaster')
    ns = {
        'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
        'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
        'p': 'http://schemas.openxmlformats.org/presentationml/2006/main',
    }
    for p, u in ns.items():
        root.set(f'xmlns:{p}', u)

    cSld = SubElement(root, 'p:cSld')
    cSld.set('name', '自定义母版')

    bg = SubElement(cSld, 'p:bg')
    bgPr = SubElement(bg, 'p:bgPr')
    SubElement(bgPr, 'a:solidFill').append(_srgb(C['bg']))
    SubElement(bgPr, 'a:effectLst')

    spTree = SubElement(cSld, 'p:spTree')
    nvGrpSpPr = SubElement(spTree, 'p:nvGrpSpPr')
    cNvPr = SubElement(nvGrpSpPr, 'p:cNvPr')
    cNvPr.set('id', '1')
    cNvPr.set('name', '')
    SubElement(nvGrpSpPr, 'p:cNvGrpSpPr')
    SubElement(nvGrpSpPr, 'p:nvPr')

    grpSpPr = SubElement(spTree, 'p:grpSpPr')
    xfrm = SubElement(grpSpPr, 'a:xfrm')
    SubElement(xfrm, 'a:off').set('x', '0').set('y', '0')
    SubElement(xfrm, 'a:ext').set('cx', '0').set('cy', '0')
    SubElement(xfrm, 'a:chOff').set('x', '0').set('y', '0')
    SubElement(xfrm, 'a:chExt').set('cx', '0').set('cy', '0')

    # 占位符：标题
    _add_placeholder(spTree, 2, 'ctrTitle', '标题', '0', '0', SLIDE_W, emu(3.5))
    # 占位符：内容
    _add_placeholder(spTree, 3, 'body', '内容占位符', '0', emu(4), SLIDE_W, emu(14))

    clrMap = SubElement(root, 'p:clrMap')
    clrMap.set('bg1', 'lt1')
    clrMap.set('tx1', 'dk1')
    clrMap.set('bg2', 'lt2')
    clrMap.set('tx2', 'dk2')
    clrMap.set('accent1', 'accent1')
    clrMap.set('accent2', 'accent2')
    clrMap.set('accent3', 'accent3')
    clrMap.set('accent4', 'accent4')
    clrMap.set('accent5', 'accent5')
    clrMap.set('accent6', 'accent6')
    clrMap.set('hlink', 'hlink')
    clrMap.set('folHlink', 'folHlink')

    sldLayoutIdLst = SubElement(root, 'p:sldLayoutIdLst')
    for i, lid in enumerate([2147483649, 2147483650]):
        sldLayoutId = SubElement(sldLayoutIdLst, 'p:sldLayoutId')
        sldLayoutId.set('id', str(lid))
        sldLayoutId.set('r:id', f'rId{i+1}')

    return xml_str(root)

def _add_placeholder(spTree, shape_id, ph_type, name, x, y, cx, cy):
    sp = SubElement(spTree, 'p:sp')
    nvSpPr = SubElement(sp, 'p:nvSpPr')
    cNvPr = SubElement(nvSpPr, 'p:cNvPr')
    cNvPr.set('id', str(shape_id))
    cNvPr.set('name', name)
    cNvSpPr = SubElement(nvSpPr, 'p:cNvSpPr')
    cNvSpPr.set('txBox', '1')
    nvPr = SubElement(nvSpPr, 'p:nvPr')
    ph = SubElement(nvPr, 'p:ph')
    ph.set('type', ph_type)

    spPr = SubElement(sp, 'p:spPr')
    xfrm = SubElement(spPr, 'a:xfrm')
    SubElement(xfrm, 'a:off').set('x', x).set('y', y)
    SubElement(xfrm, 'a:ext').set('cx', cx).set('cy', cy)
    SubElement(spPr, 'a:prstGeom').set('prst', 'rect')
    SubElement(spPr, 'a:noFill')

    txBody = SubElement(sp, 'p:txBody')
    SubElement(txBody, 'a:bodyPr').set('anchor', 't')
    SubElement(txBody, 'a:lstStyle')
    p = SubElement(txBody, 'a:p')
    SubElement(p, 'a:endParaRPr').set('lang', 'zh-CN')

# ==================== 幻灯片布局 ====================
def make_slide_layout(layout_id, name):
    root = Element('p:sldLayout')
    ns = {
        'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
        'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
        'p': 'http://schemas.openxmlformats.org/presentationml/2006/main',
    }
    for p, u in ns.items():
        root.set(f'xmlns:{p}', u)
    root.set('type', 'blank')
    root.set('name', name)
    root.set('preserve', '1')

    cSld = SubElement(root, 'p:cSld')
    cSld.set('name', name)

    spTree = SubElement(cSld, 'p:spTree')
    nvGrpSpPr = SubElement(spTree, 'p:nvGrpSpPr')
    cNvPr = SubElement(nvGrpSpPr, 'p:cNvPr')
    cNvPr.set('id', '1')
    cNvPr.set('name', '')
    SubElement(nvGrpSpPr, 'p:cNvGrpSpPr')
    SubElement(nvGrpSpPr, 'p:nvPr')

    grpSpPr = SubElement(spTree, 'p:grpSpPr')
    xfrm = SubElement(grpSpPr, 'a:xfrm')
    SubElement(xfrm, 'a:off').set('x', '0').set('y', '0')
    SubElement(xfrm, 'a:ext').set('cx', '0').set('cy', '0')
    SubElement(xfrm, 'a:chOff').set('x', '0').set('y', '0')
    SubElement(xfrm, 'a:chExt').set('cx', '0').set('cy', '0')

    if layout_id == 1:
        _add_placeholder(spTree, 2, 'title', '标题占位符', emu(1), emu(1), emu(31.87), emu(2.5))
        _add_placeholder(spTree, 3, 'body', '内容占位符', emu(1), emu(4), emu(31.87), emu(13))

    return xml_str(root)

# ==================== 表格样式 ====================
def make_table_styles():
    root = Element('a:tblStyleLst')
    root.set('xmlns:a', 'http://schemas.openxmlformats.org/drawingml/2006/main')
    root.set('def', '{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}')
    return xml_str(root)

# ==================== 幻灯片构建 ====================
def _make_text_run(text, size_pt, color, bold=False, lang='zh-CN'):
    r = Element('a:r')
    rPr = SubElement(r, 'a:rPr')
    rPr.set('lang', lang)
    rPr.set('sz', str(size_pt * 100))
    rPr.set('dirty', '0')
    if bold:
        rPr.set('b', '1')
    sf = SubElement(rPr, 'a:solidFill')
    srgb = SubElement(sf, 'a:srgbClr')
    srgb.set('val', color)
    t = SubElement(r, 'a:t')
    t.text = text
    return r

def _make_paragraph(text, size_pt, color, bold=False, align='l', lang='zh-CN'):
    p = Element('a:p')
    pPr = SubElement(p, 'a:pPr')
    pPr.set('algn', align)
    pPr.set('rtl', '0')
    if text:
        p.append(_make_text_run(text, size_pt, color, bold, lang))
    else:
        SubElement(p, 'a:endParaRPr').set('lang', lang)
    return p

def _make_shape(shape_id, name, x, y, cx, cy, fill_color=None, line_color=None, line_width=None):
    sp = Element('p:sp')
    nvSpPr = SubElement(sp, 'p:nvSpPr')
    cNvPr = SubElement(nvSpPr, 'p:cNvPr')
    cNvPr.set('id', str(shape_id))
    cNvPr.set('name', name)
    SubElement(nvSpPr, 'p:cNvSpPr')
    SubElement(nvSpPr, 'p:nvPr')

    spPr = SubElement(sp, 'p:spPr')
    xfrm = SubElement(spPr, 'a:xfrm')
    SubElement(xfrm, 'a:off').set('x', str(x)).set('y', str(y))
    SubElement(xfrm, 'a:ext').set('cx', str(cx)).set('cy', str(cy))
    SubElement(spPr, 'a:prstGeom').set('prst', 'rect')

    if fill_color:
        sf = SubElement(spPr, 'a:solidFill')
        srgb = SubElement(sf, 'a:srgbClr')
        srgb.set('val', fill_color)
    else:
        SubElement(spPr, 'a:noFill')

    if line_color:
        ln = SubElement(spPr, 'a:ln')
        if line_width:
            ln.set('w', str(line_width))
        sf = SubElement(ln, 'a:solidFill')
        srgb = SubElement(sf, 'a:srgbClr')
        srgb.set('val', line_color)
    else:
        SubElement(spPr, 'a:ln').set('w', '0')

    return sp

def _make_rounded_rect(shape_id, name, x, y, cx, cy, fill_color, line_color=None):
    sp = Element('p:sp')
    nvSpPr = SubElement(sp, 'p:nvSpPr')
    cNvPr = SubElement(nvSpPr, 'p:cNvPr')
    cNvPr.set('id', str(shape_id))
    cNvPr.set('name', name)
    SubElement(nvSpPr, 'p:cNvSpPr')
    SubElement(nvSpPr, 'p:nvPr')

    spPr = SubElement(sp, 'p:spPr')
    xfrm = SubElement(spPr, 'a:xfrm')
    SubElement(xfrm, 'a:off').set('x', str(x)).set('y', str(y))
    SubElement(xfrm, 'a:ext').set('cx', str(cx)).set('cy', str(cy))
    SubElement(spPr, 'a:prstGeom').set('prst', 'roundRect')
    SubElement(spPr, 'a:prstGeom').find('..')  # fix
    # replace prstGeom
    spPr.remove(spPr.find('{http://schemas.openxmlformats.org/drawingml/2006/main}prstGeom'))
    pg = SubElement(spPr, 'a:prstGeom')
    pg.set('prst', 'roundRect')
    avLst = SubElement(pg, 'a:avLst')
    gd = SubElement(avLst, 'a:gd')
    gd.set('name', 'adj')
    gd.set('fmla', 'val 5000')

    sf = SubElement(spPr, 'a:solidFill')
    srgb = SubElement(sf, 'a:srgbClr')
    srgb.set('val', fill_color)

    if line_color:
        ln = SubElement(spPr, 'a:ln')
        ln.set('w', '9525')
        sf2 = SubElement(ln, 'a:solidFill')
        srgb2 = SubElement(sf2, 'a:srgbClr')
        srgb2.set('val', line_color)

    return sp

def _make_textbox(shape_id, name, x, y, cx, cy, paragraphs, anchor='t'):
    sp = Element('p:sp')
    nvSpPr = SubElement(sp, 'p:nvSpPr')
    cNvPr = SubElement(nvSpPr, 'p:cNvPr')
    cNvPr.set('id', str(shape_id))
    cNvPr.set('name', name)
    cNvSpPr = SubElement(nvSpPr, 'p:cNvSpPr')
    cNvSpPr.set('txBox', '1')
    SubElement(nvSpPr, 'p:nvPr')

    spPr = SubElement(sp, 'p:spPr')
    xfrm = SubElement(spPr, 'a:xfrm')
    SubElement(xfrm, 'a:off').set('x', str(x)).set('y', str(y))
    SubElement(xfrm, 'a:ext').set('cx', str(cx)).set('cy', str(cy))
    SubElement(spPr, 'a:prstGeom').set('prst', 'rect')
    SubElement(spPr, 'a:noFill')
    SubElement(spPr, 'a:ln').set('w', '0')

    txBody = SubElement(sp, 'p:txBody')
    bodyPr = SubElement(txBody, 'a:bodyPr')
    bodyPr.set('anchor', anchor)
    bodyPr.set('wrap', 'square')
    SubElement(txBody, 'a:lstStyle')
    for p in paragraphs:
        txBody.append(p)

    return sp

def _make_oval(shape_id, name, x, y, cx, cy, fill_color, transparency=0):
    sp = Element('p:sp')
    nvSpPr = SubElement(sp, 'p:nvSpPr')
    cNvPr = SubElement(nvSpPr, 'p:cNvPr')
    cNvPr.set('id', str(shape_id))
    cNvPr.set('name', name)
    SubElement(nvSpPr, 'p:cNvSpPr')
    SubElement(nvSpPr, 'p:nvPr')

    spPr = SubElement(sp, 'p:spPr')
    xfrm = SubElement(spPr, 'a:xfrm')
    SubElement(xfrm, 'a:off').set('x', str(x)).set('y', str(y))
    SubElement(xfrm, 'a:ext').set('cx', str(cx)).set('cy', str(cy))
    SubElement(spPr, 'a:prstGeom').set('prst', 'ellipse')

    sf = SubElement(spPr, 'a:solidFill')
    srgb = SubElement(sf, 'a:srgbClr')
    srgb.set('val', fill_color)
    if transparency > 0:
        SubElement(srgb, 'a:alpha').set('val', str(100000 - transparency * 1000))

    SubElement(spPr, 'a:ln').set('w', '0')

    return sp

def _make_pill(shape_id, text, x, y, cx, cy, fill_color, text_color=C['white'], font_size=11):
    """制作圆角标签"""
    sp = _make_rounded_rect(shape_id, f'Pill_{text}', x, y, cx, cy, fill_color)
    txBody = SubElement(sp, 'p:txBody')
    bodyPr = SubElement(txBody, 'a:bodyPr')
    bodyPr.set('anchor', 'ctr')
    bodyPr.set('wrap', 'square')
    SubElement(txBody, 'a:lstStyle')
    p = SubElement(txBody, 'a:p')
    pPr = SubElement(p, 'a:pPr')
    pPr.set('algn', 'ctr')
    r = SubElement(p, 'a:r')
    rPr = SubElement(r, 'a:rPr')
    rPr.set('lang', 'zh-CN')
    rPr.set('sz', str(font_size * 100))
    rPr.set('b', '1')
    sf = SubElement(rPr, 'a:solidFill')
    srgb = SubElement(sf, 'a:srgbClr')
    srgb.set('val', text_color)
    t = SubElement(r, 'a:t')
    t.text = text
    return sp

# ==================== 幻灯片内容 ====================
def make_slide_cover():
    """封面页"""
    root = _make_slide_root()
    cSld = root.find('{http://schemas.openxmlformats.org/presentationml/2006/main}cSld')
    spTree = cSld.find('{http://schemas.openxmlformats.org/presentationml/2006/main}spTree')
    sid = 10

    # 背景 - 深橙色渐变
    bg = SubElement(cSld, 'p:bg')
    bgPr = SubElement(bg, 'p:bgPr')
    gf = SubElement(bgPr, 'a:gradFill')
    gsLst = SubElement(gf, 'a:gsLst')
    gsLst.append(_make_grad_stop('0', 'FF8C5A', '0'))
    gsLst.append(_make_grad_stop('100000', 'E85D26', '0'))
    SubElement(bgPr, 'a:effectLst')

    # 装饰圆
    spTree.append(_make_oval(sid, 'blob1', emu(24), emu(-2), emu(12), emu(8), 'FFB088', 30))
    sid += 1
    spTree.append(_make_oval(sid, 'blob2', emu(-2), emu(14), emu(10), emu(7), 'A8D8A0', 35))
    sid += 1

    # 技术栈标签
    spTree.append(_make_pill(sid, 'Vue3 + Fastify + Prisma + AI + Docker', emu(3), emu(5), emu(14), emu(1.2), C['green'], font_size=12))
    sid += 1

    # 主标题
    spTree.append(_make_textbox(sid, 'MainTitle', emu(3), emu(7.5), emu(28), emu(3), [
        _make_paragraph('餐小助', 52, C['white'], True, 'ctr'),
    ], 'ctr'))
    sid += 1

    # 副标题
    spTree.append(_make_textbox(sid, 'SubTitle', emu(3), emu(10.5), emu(28), emu(2), [
        _make_paragraph('商户智能经营助手', 32, C['white'], True, 'ctr'),
    ], 'ctr'))
    sid += 1

    # 描述
    spTree.append(_make_textbox(sid, 'Desc', emu(3), emu(13), emu(28), emu(1.5), [
        _make_paragraph('项目答辩——从"会写页面"到"能交付系统"', 18, 'FFE0D0', False, 'ctr'),
    ], 'ctr'))
    sid += 1

    # 底部装饰线
    line = SubElement(spTree, 'p:sp')
    nvSpPr = SubElement(line, 'p:nvSpPr')
    SubElement(nvSpPr, 'p:cNvPr').set('id', str(sid)).set('name', 'Line')
    SubElement(nvSpPr, 'p:cNvSpPr')
    SubElement(nvSpPr, 'p:nvPr')
    spPr = SubElement(line, 'p:spPr')
    xfrm = SubElement(spPr, 'a:xfrm')
    SubElement(xfrm, 'a:off').set('x', emu(8)).set('y', emu(15.5))
    SubElement(xfrm, 'a:ext').set('cx', emu(18)).set('cy', emu(0.08))
    SubElement(spPr, 'a:prstGeom').set('prst', 'rect')
    SubElement(spPr, 'a:noFill')
    ln = SubElement(spPr, 'a:ln')
    ln.set('w', '12700')
    SubElement(ln, 'a:solidFill').append(_srgb(C['white']))
    sid += 1

    # 底部信息
    spTree.append(_make_textbox(sid, 'Footer', emu(3), emu(16), emu(28), emu(2), [
        _make_paragraph('答辩人：餐小助团队    2026年8月', 14, 'FFD0B8', False, 'ctr'),
    ], 'ctr'))

    return root

def make_slide_toc():
    """目录页"""
    root = _make_slide_root()
    cSld = root.find('{http://schemas.openxmlformats.org/presentationml/2006/main}cSld')
    spTree = cSld.find('{http://schemas.openxmlformats.org/presentationml/2006/main}spTree')
    _add_bg(spTree, C['bg'])
    _add_header(spTree, '答辩提纲', '五大章节，重点聚焦问题与收获', 10)
    sid = 20

    items = [
        ('01', '项目介绍', '中小餐饮的"数字店长"', C['orange']),
        ('02', '功能与技术', '八大模块 + 全栈架构', C['green']),
        ('03', '问题与解决', '开发中的技术挑战（重点）', C['red']),
        ('04', '收获与成长', '从技术栈到工程思维（重点）', C['brown']),
        ('05', '成果展望', '量化成果与未来方向', C['green']),
    ]

    for i, (num, title, desc, color) in enumerate(items):
        y = emu(5.5 + i * 2.5)
        # 卡片
        card = _make_rounded_rect(sid, f'Card{i}', emu(2), y, emu(30), emu(2), C['white'], C['border'])
        spTree.append(card)
        sid += 1

        # 编号圆
        circle = _make_oval(sid, f'Num{i}', emu(2.8), emu(5.5 + i * 2.5 + 0.3), emu(1.5), emu(1.5), color)
        spTree.append(circle)
        sid += 1

        # 编号文字
        spTree.append(_make_textbox(sid, f'NumText{i}', emu(2.8), emu(5.5 + i * 2.5 + 0.3), emu(1.5), emu(1.5), [
            _make_paragraph(num, 22, C['white'], True, 'ctr'),
        ], 'ctr'))
        sid += 1

        # 标题
        spTree.append(_make_textbox(sid, f'Title{i}', emu(5), emu(5.5 + i * 2.5 + 0.2), emu(8), emu(1), [
            _make_paragraph(title, 20, C['text'], True),
        ]))
        sid += 1

        # 描述
        spTree.append(_make_textbox(sid, f'Desc{i}', emu(5), emu(5.5 + i * 2.5 + 1.1), emu(25), emu(0.8), [
            _make_paragraph(desc, 14, C['muted']),
        ]))
        sid += 1

    return root

def make_slide_content(title, subtitle, cards, bg_color=C['bg']):
    """通用内容页"""
    root = _make_slide_root()
    cSld = root.find('{http://schemas.openxmlformats.org/presentationml/2006/main}cSld')
    spTree = cSld.find('{http://schemas.openxmlformats.org/presentationml/2006/main}spTree')
    _add_bg(spTree, bg_color)
    _add_header(spTree, title, subtitle, 10)
    sid = 20

    for i, card in enumerate(cards):
        col = i % 2
        row = i // 2
        x = emu(2 + col * 15.5)
        y = emu(5.5 + row * 4.2)
        w = emu(14.5)
        h = emu(3.5)

        # 卡片背景
        card_shape = _make_rounded_rect(sid, f'Card{i}', x, y, w, h, C['white'], C['border'])
        spTree.append(card_shape)
        sid += 1

        # 标签
        if card.get('tag'):
            tag_color = card.get('tag_color', C['orange'])
            spTree.append(_make_pill(sid, card['tag'], x + emu(0.5), y + emu(0.4), emu(len(card['tag']) * 0.6 + 1), emu(0.8), tag_color, font_size=11))
            sid += 1

        # 标题
        if card.get('title'):
            title_y = y + emu(0.4) if not card.get('tag') else y + emu(1.4)
            spTree.append(_make_textbox(sid, f'CTitle{i}', x + emu(0.5), title_y, w - emu(1), emu(1), [
                _make_paragraph(card['title'], 16, C['text'], True),
            ]))
            sid += 1

        # 内容
        if card.get('content'):
            content_y = y + emu(1.4) if not card.get('tag') else y + emu(2.4)
            content_h = h - emu(1.6) if not card.get('tag') else h - emu(2.6)
            paras = []
            for line in card['content']:
                paras.append(_make_paragraph(f'• {line}', 13, C['muted']))
            spTree.append(_make_textbox(sid, f'CContent{i}', x + emu(0.5), content_y, w - emu(1), content_h, paras))
            sid += 1

    return root

def make_slide_transition(title, subtitle):
    """过渡页"""
    root = _make_slide_root()
    cSld = root.find('{http://schemas.openxmlformats.org/presentationml/2006/main}cSld')
    spTree = cSld.find('{http://schemas.openxmlformats.org/presentationml/2006/main}spTree')

    # 深色背景
    bg = SubElement(cSld, 'p:bg')
    bgPr = SubElement(bg, 'p:bgPr')
    gf = SubElement(bgPr, 'a:gradFill')
    gsLst = SubElement(gf, 'a:gsLst')
    gsLst.append(_make_grad_stop('0', '5B361F', '0'))
    gsLst.append(_make_grad_stop('100000', '3D2415', '0'))
    SubElement(bgPr, 'a:effectLst')

    # 装饰
    spTree.append(_make_oval(10, 'blob1', emu(22), emu(-3), emu(14), emu(10), 'FF8C5A', 20))
    spTree.append(_make_oval(11, 'blob2', emu(-3), emu(12), emu(12), emu(8), '00C853', 25))

    # 章节标记
    spTree.append(_make_pill(12, 'CORE SECTION', emu(12), emu(5), emu(10), emu(1.2), C['orange'], font_size=14))

    # 标题
    spTree.append(_make_textbox(13, 'TransTitle', emu(3), emu(7.5), emu(28), emu(3), [
        _make_paragraph(title, 44, C['white'], True, 'ctr'),
    ], 'ctr'))

    # 副标题
    spTree.append(_make_textbox(14, 'TransSub', emu(3), emu(11), emu(28), emu(2), [
        _make_paragraph(subtitle, 20, 'FFD0B8', False, 'ctr'),
    ], 'ctr'))

    # 装饰线
    line = SubElement(spTree, 'p:sp')
    nvSpPr = SubElement(line, 'p:nvSpPr')
    SubElement(nvSpPr, 'p:cNvPr').set('id', '15').set('name', 'Line')
    SubElement(nvSpPr, 'p:cNvSpPr')
    SubElement(nvSpPr, 'p:nvPr')
    spPr = SubElement(line, 'p:spPr')
    xfrm = SubElement(spPr, 'a:xfrm')
    SubElement(xfrm, 'a:off').set('x', emu(10)).set('y', emu(14))
    SubElement(xfrm, 'a:ext').set('cx', emu(14)).set('cy', emu(0.06))
    SubElement(spPr, 'a:prstGeom').set('prst', 'rect')
    SubElement(spPr, 'a:noFill')
    ln = SubElement(spPr, 'a:ln')
    ln.set('w', '9525')
    SubElement(ln, 'a:solidFill').append(_srgb(C['orange']))

    return root

def make_slide_ending():
    """结尾页"""
    root = _make_slide_root()
    cSld = root.find('{http://schemas.openxmlformats.org/presentationml/2006/main}cSld')
    spTree = cSld.find('{http://schemas.openxmlformats.org/presentationml/2006/main}spTree')

    # 背景
    bg = SubElement(cSld, 'p:bg')
    bgPr = SubElement(bg, 'p:bgPr')
    gf = SubElement(bgPr, 'a:gradFill')
    gsLst = SubElement(gf, 'a:gsLst')
    gsLst.append(_make_grad_stop('0', 'FF8C5A', '0'))
    gsLst.append(_make_grad_stop('100000', 'E85D26', '0'))
    SubElement(bgPr, 'a:effectLst')

    # 装饰
    spTree.append(_make_oval(10, 'blob1', emu(20), emu(-2), emu(15), emu(10), 'FFB088', 25))
    spTree.append(_make_oval(11, 'blob2', emu(-2), emu(12), emu(12), emu(8), 'A8D8A0', 30))

    # 感谢
    spTree.append(_make_textbox(12, 'Thanks', emu(3), emu(6), emu(28), emu(3), [
        _make_paragraph('感谢聆听', 56, C['white'], True, 'ctr'),
    ], 'ctr'))

    # 装饰线
    line = SubElement(spTree, 'p:sp')
    nvSpPr = SubElement(line, 'p:nvSpPr')
    SubElement(nvSpPr, 'p:cNvPr').set('id', '13').set('name', 'Line')
    SubElement(nvSpPr, 'p:cNvSpPr')
    SubElement(nvSpPr, 'p:nvPr')
    spPr = SubElement(line, 'p:spPr')
    xfrm = SubElement(spPr, 'a:xfrm')
    SubElement(xfrm, 'a:off').set('x', emu(10)).set('y', emu(10))
    SubElement(xfrm, 'a:ext').set('cx', emu(14)).set('cy', emu(0.06))
    SubElement(spPr, 'a:prstGeom').set('prst', 'rect')
    SubElement(spPr, 'a:noFill')
    ln = SubElement(spPr, 'a:ln')
    ln.set('w', '12700')
    SubElement(ln, 'a:solidFill').append(_srgb(C['white']))

    # Slogan
    spTree.append(_make_textbox(14, 'Slogan', emu(3), emu(11), emu(28), emu(2), [
        _make_paragraph('餐小助 · 让AI帮你盯店，你只管做好菜', 22, 'FFE0D0', False, 'ctr'),
    ], 'ctr'))

    return root

# ==================== 辅助函数 ====================
def _make_slide_root():
    root = Element('p:sld')
    ns = {
        'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
        'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
        'p': 'http://schemas.openxmlformats.org/presentationml/2006/main',
    }
    for p, u in ns.items():
        root.set(f'xmlns:{p}', u)
    cSld = SubElement(root, 'p:cSld')
    cSld.set('name', 'Slide')
    spTree = SubElement(cSld, 'p:spTree')
    nvGrpSpPr = SubElement(spTree, 'p:nvGrpSpPr')
    cNvPr = SubElement(nvGrpSpPr, 'p:cNvPr')
    cNvPr.set('id', '1')
    cNvPr.set('name', '')
    SubElement(nvGrpSpPr, 'p:cNvGrpSpPr')
    SubElement(nvGrpSpPr, 'p:nvPr')
    grpSpPr = SubElement(spTree, 'p:grpSpPr')
    xfrm = SubElement(grpSpPr, 'a:xfrm')
    SubElement(xfrm, 'a:off').set('x', '0').set('y', '0')
    SubElement(xfrm, 'a:ext').set('cx', '0').set('cy', '0')
    SubElement(xfrm, 'a:chOff').set('x', '0').set('y', '0')
    SubElement(xfrm, 'a:chExt').set('cx', '0').set('cy', '0')
    return root

def _add_bg(spTree, color):
    bg_shape = _make_shape(2, 'Background', 0, 0, int(SLIDE_W), int(SLIDE_H), fill_color=color)
    spTree.append(bg_shape)

def _add_header(spTree, title, subtitle, start_id):
    sid = start_id
    # 顶部色条
    bar = _make_shape(sid, 'TopBar', 0, 0, int(SLIDE_W), emu(0.15), fill_color=C['orange'])
    spTree.append(bar)
    sid += 1

    # 标题
    spTree.append(_make_textbox(sid, 'HeaderTitle', emu(2), emu(0.8), emu(30), emu(1.5), [
        _make_paragraph(title, 32, C['text'], True),
    ]))
    sid += 1

    # 副标题
    if subtitle:
        spTree.append(_make_textbox(sid, 'HeaderSub', emu(2), emu(2.3), emu(30), emu(1), [
            _make_paragraph(subtitle, 14, C['muted']),
        ]))
        sid += 1

    # 分隔线
    line = SubElement(spTree, 'p:sp')
    nvSpPr = SubElement(line, 'p:nvSpPr')
    SubElement(nvSpPr, 'p:cNvPr').set('id', str(sid)).set('name', 'SepLine')
    SubElement(nvSpPr, 'p:cNvSpPr')
    SubElement(nvSpPr, 'p:nvPr')
    spPr = SubElement(line, 'p:spPr')
    xfrm = SubElement(spPr, 'a:xfrm')
    SubElement(xfrm, 'a:off').set('x', emu(2)).set('y', emu(3.8))
    SubElement(xfrm, 'a:ext').set('cx', emu(4)).set('cy', emu(0.06))
    SubElement(spPr, 'a:prstGeom').set('prst', 'rect')
    SubElement(spPr, 'a:noFill')
    ln = SubElement(spPr, 'a:ln')
    ln.set('w', '12700')
    SubElement(ln, 'a:solidFill').append(_srgb(C['orange']))

# ==================== 主函数 ====================
def build_pptx():
    slides = []

    # 1. 封面
    slides.append(make_slide_cover())

    # 2. 目录
    slides.append(make_slide_toc())

    # 3. 项目定位
    slides.append(make_slide_content(
        '项目定位：中小餐饮的"数字店长"',
        '中小餐饮平均寿命18个月，死因是"不会算账、不会管客、不会控损耗"',
        [
            {'tag': '痛点', 'tag_color': C['red'], 'title': '核心痛点', 'content': [
                '中小餐饮平均寿命仅18个月',
                '不会算账、不会管客、不会控损耗',
                '多渠道数据孤岛，对账困难',
            ]},
            {'tag': '方案', 'tag_color': C['green'], 'title': '解决方案', 'content': [
                'AI经营助手，自动算账、管客、控损耗',
                '接入美团/饿了么/抖音等多渠道数据',
                '每日自动生成经营日报',
            ]},
            {'tag': '价值', 'tag_color': C['orange'], 'title': '量化价值', 'content': [
                '单店月均降本3000元',
                '单店月均增收5000元',
                '综合经营效率提升30%',
            ]},
            {'tag': '形态', 'tag_color': C['brown'], 'title': '产品形态', 'content': [
                'PC商户后台：复杂配置与数据看板',
                '手机端商户页：移动查看关键数据',
                '顾客扫码点餐页：桌码进入点餐',
            ]},
        ]
    ))

    # 4. 功能架构
    slides.append(make_slide_content(
        '八大模块覆盖经营全链路',
        '围绕PRD的8大模块，当前项目已覆盖核心可演示链路',
        [
            {'tag': '核心', 'tag_color': C['orange'], 'title': 'AI经营驾驶舱', 'content': [
                '日报自动生成、多渠道对账',
                '异常预警、语音问答',
            ]},
            {'tag': '核心', 'tag_color': C['orange'], 'title': '客户资产管家', 'content': [
                'OneID打通、38个自动标签',
                'RFM分层、流失预警与召回',
            ]},
            {'tag': '核心', 'tag_color': C['orange'], 'title': '菜品盈利分析', 'content': [
                '四象限分类、购物篮分析',
                '成本波动监控',
            ]},
            {'tag': '核心', 'tag_color': C['orange'], 'title': '智能采购与库存', 'content': [
                '销量预测、智能采购单',
                '效期预警',
            ]},
            {'tag': '扩展', 'tag_color': C['green'], 'title': '智能定价与促销', 'content': [
                '动态定价、AI促销方案',
                '分层发券',
            ]},
            {'tag': '扩展', 'tag_color': C['green'], 'title': '员工/评价/系统', 'content': [
                '员工排班、评价口碑',
                '系统管理',
            ]},
        ]
    ))

    # 5. 技术架构
    slides.append(make_slide_content(
        '全栈技术架构',
        '前端三端 + 后端服务 + AI层 + 数据层 + 云部署',
        [
            {'tag': '前端', 'tag_color': C['green'], 'title': '前端展示层', 'content': [
                'Vue3 + Pinia + Vue Router + ECharts',
                'PC商户后台 + 手机商户端 + 顾客扫码页',
            ]},
            {'tag': '后端', 'tag_color': C['orange'], 'title': '业务接口层', 'content': [
                'Fastify 5 + Prisma 6 + TypeBox',
                'Swagger文档、CORS、Helmet、RateLimit',
            ]},
            {'tag': 'AI', 'tag_color': C['brown'], 'title': 'AI能力层', 'content': [
                'DeepSeek-V3（推理）、通义千问-Max（BI）',
                '豆包-Pro（创意）、文心一言-4.0（NLP）',
            ]},
            {'tag': '部署', 'tag_color': C['red'], 'title': '云部署层', 'content': [
                'Docker Compose + Nginx',
                '腾讯云公网IP、数据卷持久化',
            ]},
        ]
    ))

    # 6. 业务闭环
    slides.append(make_slide_content(
        '业务闭环：从顾客下单到商户决策',
        '数据不再只是页面展示，而是可持续计算、追踪、复盘的经营资产',
        [
            {'tag': '顾客端', 'tag_color': C['orange'], 'title': '扫码点餐', 'content': [
                '桌码token自动识别桌号',
                '菜品、数量、称呼、手机号、备注',
                '购物车、加菜、订单状态',
            ]},
            {'tag': '商户端', 'tag_color': C['green'], 'title': '接单与分析', 'content': [
                '订单队列、状态流转动画',
                '数据沉淀到客户/菜品/评价',
                'AI日报、采购建议、经营分析',
            ]},
            {'tag': '数据', 'tag_color': C['brown'], 'title': '数据模型', 'content': [
                'OneID客户主数据、订单事实表',
                '菜品维度表、标签体系',
                '订单状态机白名单校验',
            ]},
            {'tag': 'AI', 'tag_color': C['red'], 'title': '智能辅助', 'content': [
                'SSE流式AI问答',
                '多模型路由策略',
                '置信度标注、可解释输出',
            ]},
        ]
    ))

    # 7. 核心模块
    slides.append(make_slide_content(
        '三大核心模块落地',
        '用具体数据和场景证明产品价值',
        [
            {'tag': '模块一', 'tag_color': C['orange'], 'title': '经营驾驶舱', 'content': [
                '每日8点AI日报自动推送',
                '含营收/利润/TOP3/异常/建议',
                '生成时间 < 30秒',
            ]},
            {'tag': '模块二', 'tag_color': C['green'], 'title': '客户资产', 'content': [
                'OneID跨平台合并客户',
                '手机号匹配率 > 95%',
                '自动RFM重算 + 流失风险评分',
            ]},
            {'tag': '模块三', 'tag_color': C['brown'], 'title': '智能采购', 'content': [
                '基于90天历史 + 天气预测销量',
                '自动生成采购单',
                '损耗率从12%降至5%',
            ]},
        ]
    ))

    # 8. 过渡页 - 问题与解决
    slides.append(make_slide_transition(
        '遇到的问题及解决方案',
        '答辩要求第3条重点 · 真实开发不是一路顺风'
    ))

    # 9. 问题1 - AI流式输出
    slides.append(make_slide_content(
        '问题①：AI回复"卡死"的假象',
        '用户体验优化：从"等待"到"观看"',
        [
            {'tag': '现象', 'tag_color': C['red'], 'title': '问题现象', 'content': [
                'AI生成经营日报时，用户等待10秒以上无反馈',
                '用户误以为系统卡死，反复点击',
            ]},
            {'tag': '原因', 'tag_color': C['brown'], 'title': '原因分析', 'content': [
                '非流式返回，用户看不到"思考中"的状态',
                '缺少进度反馈机制',
            ]},
            {'tag': '解决', 'tag_color': C['green'], 'title': '解决方案', 'content': [
                '采用SSE流式输出（Server-Sent Events）',
                'reply.hijack() + X-Accel-Buffering:no',
                'AbortController控制停止生成',
            ]},
            {'tag': '效果', 'tag_color': C['orange'], 'title': '最终效果', 'content': [
                '用户实时看到AI逐字生成',
                '体验从"等待"变为"观看"',
                '支持停止生成和禁用重复发送',
            ]},
        ]
    ))

    # 10. 问题2 - 数据真实性
    slides.append(make_slide_content(
        '问题②：AI不能"编"数据',
        '经营系统的底线——绝不误导用户',
        [
            {'tag': '现象', 'tag_color': C['red'], 'title': '问题现象', 'content': [
                'AI模型未连接时，可能生成虚假经营分析',
                'LLM幻觉：模型会自信地编造数据',
            ]},
            {'tag': '原因', 'tag_color': C['brown'], 'title': '原因分析', 'content': [
                '降级mock容易误导真实经营判断',
                '没有数据源标记和校验机制',
            ]},
            {'tag': '解决', 'tag_color': C['green'], 'title': '解决方案', 'content': [
                'dataSource标记（real_orders | insufficient）',
                '只统计served/completed订单',
                'AI输出标注置信度',
            ]},
            {'tag': '效果', 'tag_color': C['orange'], 'title': '最终效果', 'content': [
                '模型不可用时直接展示失败原因',
                '不伪造经营建议',
                '经营系统的底线：绝不误导用户',
            ]},
        ]
    ))

    # 11. 问题3 - 多端部署
    slides.append(make_slide_content(
        '问题③：从开发到上线的最后一公里',
        '全链路交付能力和运维思维',
        [
            {'tag': '问题A', 'tag_color': C['red'], 'title': '二维码外网访问', 'content': [
                '二维码使用localhost导致外网打不开',
                '解决：公网域名 + Nginx反向代理',
            ]},
            {'tag': '问题B', 'tag_color': C['red'], 'title': '服务器显示旧页面', 'content': [
                'Nginx缓存导致页面不更新',
                '解决：缓存清理 + Docker镜像版本化',
            ]},
            {'tag': '问题C', 'tag_color': C['red'], 'title': 'Docker部署冲突', 'content': [
                '端口冲突、中文路径导致compose失败',
                '解决：固定project name、独立端口18080',
            ]},
            {'tag': '问题D', 'tag_color': C['red'], 'title': '订单统计不准', 'content': [
                '取消订单被错误计入销量',
                '解决：状态机白名单，只统计completed',
            ]},
        ]
    ))

    # 12. 过渡页 - 收获与成长
    slides.append(make_slide_transition(
        '项目完成后的收获',
        '答辩要求第4条重点 · 从"写页面"到"做系统"'
    ))

    # 13. 技术收获
    slides.append(make_slide_content(
        '从技术栈到工程思维',
        '这次项目最大的价值，是从"会写页面"走向"能交付系统"',
        [
            {'tag': '前端', 'tag_color': C['green'], 'title': '前端能力', 'content': [
                'Vue3多端页面开发',
                'Pinia状态管理、Vue Router路由',
                '移动端弹层滚动、响应式布局',
            ]},
            {'tag': '后端', 'tag_color': C['orange'], 'title': '后端能力', 'content': [
                'Fastify接口设计、Prisma数据建模',
                '注册登录、短信验证码、订单接口',
                '客户、菜品、采购、评价、天气接口',
            ]},
            {'tag': 'AI', 'tag_color': C['brown'], 'title': 'AI工程化', 'content': [
                'SSE流式输出、多模型路由',
                'Prompt工程、Tool Schema设计',
                '置信度标注、可解释输出',
            ]},
            {'tag': '运维', 'tag_color': C['red'], 'title': '部署运维', 'content': [
                'Docker Compose三阶段构建',
                'Nginx反向代理、腾讯云服务器',
                '通过日志、curl定位问题',
            ]},
        ]
    ))

    # 14. 成果展望
    slides.append(make_slide_content(
        '成果与未来方向',
        '已完成核心闭环，未来持续扩展',
        [
            {'tag': '已完成', 'tag_color': C['green'], 'title': '项目成果', 'content': [
                '三端系统：PC后台 + 手机 + 顾客扫码',
                '8大模块、AI日报、客户OneID',
                '菜品四象限、智能采购、Docker部署',
            ]},
            {'tag': '量化', 'tag_color': C['orange'], 'title': '量化目标', 'content': [
                '每日节省对账时间1.5小时',
                '损耗率从12%降至5%',
                '复购率提升20%',
            ]},
            {'tag': '未来', 'tag_color': C['brown'], 'title': '未来扩展', 'content': [
                '连锁多店看板、供应链比价',
                'AI外呼召回、行业垂直方案',
                'MySQL替换、HTTPS域名',
            ]},
        ]
    ))

    # 15. 结尾
    slides.append(make_slide_ending())

    return slides

# ==================== 打包PPTX ====================
def create_pptx():
    slides = build_pptx()

    with zipfile.ZipFile(OUTPUT_FILE, 'w', zipfile.ZIP_DEFLATED) as zf:
        # [Content_Types].xml
        zf.writestr('[Content_Types].xml', make_content_types())

        # _rels/.rels
        zf.writestr('_rels/.rels', make_root_rels())

        # docProps
        zf.writestr('docProps/app.xml', make_app_props())
        zf.writestr('docProps/core.xml', make_core_props())

        # ppt/presentation.xml
        zf.writestr('ppt/presentation.xml', make_presentation())

        # ppt/_rels/presentation.xml.rels
        zf.writestr('ppt/_rels/presentation.xml.rels', make_presentation_rels())

        # ppt/theme/theme1.xml
        zf.writestr('ppt/theme/theme1.xml', make_theme())

        # ppt/slideMasters/slideMaster1.xml
        zf.writestr('ppt/slideMasters/slideMaster1.xml', make_slide_master())

        # ppt/slideMasters/_rels/slideMaster1.xml.rels
        zf.writestr('ppt/slideMasters/_rels/slideMaster1.xml.rels', make_master_rels())

        # ppt/slideLayouts
        zf.writestr('ppt/slideLayouts/slideLayout1.xml', make_slide_layout(1, '标题和内容'))
        zf.writestr('ppt/slideLayouts/slideLayout2.xml', make_slide_layout(2, '空白'))
        zf.writestr('ppt/slideLayouts/_rels/slideLayout1.xml.rels', make_layout_rels())
        zf.writestr('ppt/slideLayouts/_rels/slideLayout2.xml.rels', make_layout_rels())

        # ppt/tableStyles/tableStyle1.xml
        zf.writestr('ppt/tableStyles/tableStyle1.xml', make_table_styles())

        # 幻灯片
        for i, slide in enumerate(slides, 1):
            zf.writestr(f'ppt/slides/slide{i}.xml', xml_str(slide))
            zf.writestr(f'ppt/slides/_rels/slide{i}.xml.rels', make_slide_rels(i))

    print(f"PPTX文件已生成: {OUTPUT_FILE}")
    print(f"文件大小: {OUTPUT_FILE.stat().st_size} bytes")
    print(f"幻灯片数量: {len(slides)}")

if __name__ == '__main__':
    create_pptx()
