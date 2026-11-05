#!/usr/bin/env python3
"""
餐小助项目答辩PPT生成器 V6 - 基于模板基础设施
复用模板的theme/master/layout，只替换slides内容
"""
import zipfile
import shutil
from pathlib import Path

TEMPLATE_DIR = Path(r"D:\餐小助\pptx_template")
OUT = Path(r"D:\餐小助\餐小助_项目答辩PPT_模板版.pptx")

# 颜色系统 - 与模板一致
ORANGE = "FF6B35"
GREEN = "00C853"
RED = "FF3D00"
BROWN = "5B361F"
BG = "F7F8FA"
CARD = "FFFFFF"
TEXT = "1A1A1A"
MUTED = "666666"
WHITE = "FFFFFF"
BORDER = "E0E1E6"
PURPLE = "8E24AA"
BLUE = "2196F3"

def emu(cm):
    return str(int(cm * 360000))

def emui(cm):
    return int(cm * 360000)

SW = emu(33.867)
SH = emu(19.05)

# ========== 形状构建函数 ==========

def xml_escape(s):
    return str(s).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;').replace("'", '&apos;')

def rect(sid, name, x, y, cx, cy, fill=None):
    fill_xml = f'<a:solidFill><a:srgbClr val="{fill}"/></a:solidFill>' if fill else '<a:noFill/>'
    return f'''<p:sp><p:nvSpPr><p:cNvPr id="{sid}" name="{xml_escape(name)}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="{cx}" cy="{cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom>{fill_xml}<a:ln><a:noFill/></a:ln><a:effectLst/></p:spPr><p:txBody><a:bodyPr rtlCol="0" anchor="ctr"/><a:lstStyle/><a:p><a:pPr algn="ctr"/></a:p></p:txBody></p:sp>'''

def round_rect(sid, name, x, y, cx, cy, fill, line_color=None, line_w="0"):
    ln_xml = f'<a:ln w="{line_w}"><a:solidFill><a:srgbClr val="{line_color}"/></a:solidFill></a:ln>' if line_color else '<a:ln w="0"/>'
    return f'''<p:sp><p:nvSpPr><p:cNvPr id="{sid}" name="{xml_escape(name)}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="{cx}" cy="{cy}"/></a:xfrm><a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val 5000"/></a:avLst></a:prstGeom><a:solidFill><a:srgbClr val="{fill}"/></a:solidFill>{ln_xml}<a:effectLst/></p:spPr><p:txBody><a:bodyPr rtlCol="0" anchor="ctr"/><a:lstStyle/><a:p><a:pPr algn="ctr"/></a:p></p:txBody></p:sp>'''

def oval(sid, name, x, y, cx, cy, fill, alpha=25000):
    return f'''<p:sp><p:nvSpPr><p:cNvPr id="{sid}" name="{xml_escape(name)}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="{cx}" cy="{cy}"/></a:xfrm><a:prstGeom prst="ellipse"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="{fill}"><a:alpha val="{alpha}"/></a:srgbClr></a:solidFill><a:ln><a:noFill/></a:ln><a:effectLst/></p:spPr><p:txBody><a:bodyPr rtlCol="0" anchor="ctr"/><a:lstStyle/><a:p><a:pPr algn="ctr"/></a:p></p:txBody></p:sp>'''

def textbox(sid, name, x, y, cx, cy, text, sz=1800, bold=False, color=TEXT, align="l", anchor="t"):
    b = ' b="1"' if bold else ""
    text_escaped = xml_escape(text)
    return f'''<p:sp><p:nvSpPr><p:cNvPr id="{sid}" name="{xml_escape(name)}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="{cx}" cy="{cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr><p:txBody><a:bodyPr anchor="{anchor}" wrap="square"/><a:lstStyle/><a:p><a:pPr algn="{align}"/><a:r><a:rPr lang="zh-CN" sz="{sz}"{b} dirty="0"><a:solidFill><a:srgbClr val="{color}"/></a:solidFill><a:latin typeface="Microsoft YaHei"/><a:ea typeface="Microsoft YaHei"/></a:rPr><a:t>{text_escaped}</a:t></a:r></a:p></p:txBody></p:sp>'''

def multiline(sid, name, x, y, cx, cy, lines, sz=1200, color=MUTED):
    paras = ""
    for line in lines:
        line_escaped = xml_escape(line)
        paras += f'<a:p><a:pPr algn="l" marL="228600"/><a:r><a:rPr lang="zh-CN" sz="{sz}" dirty="0"><a:solidFill><a:srgbClr val="{color}"/></a:solidFill><a:latin typeface="Microsoft YaHei"/><a:ea typeface="Microsoft YaHei"/></a:rPr><a:t>\u2022 {line_escaped}</a:t></a:r></a:p>'
    return f'''<p:sp><p:nvSpPr><p:cNvPr id="{sid}" name="{xml_escape(name)}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="{cx}" cy="{cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr><p:txBody><a:bodyPr anchor="t" wrap="square"/><a:lstStyle/>{paras}</p:txBody></p:sp>'''

def pill(sid, name, x, y, cx, cy, text, fill=ORANGE, sz=1100):
    text_escaped = xml_escape(text)
    return f'''<p:sp><p:nvSpPr><p:cNvPr id="{sid}" name="{xml_escape(name)}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="{cx}" cy="{cy}"/></a:xfrm><a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val 16000"/></a:avLst></a:prstGeom><a:solidFill><a:srgbClr val="{fill}"/></a:solidFill><a:ln><a:noFill/></a:ln><a:effectLst/></p:spPr><p:txBody><a:bodyPr rtlCol="0" anchor="ctr"/><a:lstStyle/><a:p><a:pPr algn="ctr"/><a:r><a:rPr lang="zh-CN" sz="{sz}" b="1" dirty="0"><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:latin typeface="Microsoft YaHei"/><a:ea typeface="Microsoft YaHei"/></a:rPr><a:t>{text_escaped}</a:t></a:r></a:p></p:txBody></p:sp>'''

# ========== 幻灯片构建 ==========

def slide_start():
    return '<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:cSld name="Slide">'

def slide_end():
    return '</p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>'

def sp_tree_start():
    return '<p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>'

def sp_tree_end():
    return '</p:spTree>'

def make_cover():
    s = slide_start()
    s += '<p:bg><p:bgPr><a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:solidFill><a:srgbClr val="FF8C5A"/></a:solidFill></a:gs><a:gs pos="100000"><a:solidFill><a:srgbClr val="E85D26"/></a:solidFill></a:gs></a:gsLst></a:gradFill><a:effectLst/></p:bgPr></p:bg>'
    s += sp_tree_start()
    sid = 2
    s += oval(sid, "B1", emu(22), emu(-2), emu(12), emu(8), "FFB088", 30000); sid += 1
    s += oval(sid, "B2", emu(-2), emu(13), emu(10), emu(6), "A8D8A0", 35000); sid += 1
    s += pill(sid, "Tech", emu(2.5), emu(4.5), emu(14), emu(0.8), "Vue3 + Fastify + Prisma + AI + Docker", GREEN, 1100); sid += 1
    s += textbox(sid, "MT", emu(2.5), emu(6.5), emu(28), emu(2.5), "餐小助", 5200, True, WHITE); sid += 1
    s += textbox(sid, "ST", emu(2.5), emu(9.5), emu(28), emu(1.2), "商户智能经营助手", 2800, True, WHITE); sid += 1
    s += textbox(sid, "Desc", emu(2.5), emu(11.2), emu(28), emu(0.8), '项目答辩——从"会写页面"到"能交付系统"', 1400, False, "FFD0B8"); sid += 1
    s += rect(sid, "Line", emu(8), emu(12.5), emu(18), emu(0.04), fill=WHITE); sid += 1
    s += textbox(sid, "Footer", emu(2.5), emu(13), emu(28), emu(0.6), "答辩人：餐小助团队    2026年8月", 1200, False, "FFD0B8"); sid += 1
    s += sp_tree_end()
    s += slide_end()
    return s

def make_toc():
    s = slide_start()
    s += f'<p:bg><p:bgPr><a:solidFill><a:srgbClr val="{BG}"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>'
    s += sp_tree_start()
    sid = 2
    s += rect(sid, "TopBar", "0", "0", SW, emu(0.12), fill=ORANGE); sid += 1
    s += textbox(sid, "Title", emu(1.5), emu(0.5), emu(30), emu(1.2), "答辩提纲", 2800, True, TEXT); sid += 1
    s += textbox(sid, "Sub", emu(1.5), emu(1.7), emu(30), emu(0.6), "五大章节，重点聚焦问题与收获", 1200, False, MUTED); sid += 1
    s += rect(sid, "Sep", emu(1.5), emu(2.3), emu(3), emu(0.04), fill=ORANGE); sid += 1

    items = [
        ("01", "项目介绍", '中小餐饮的"数字店长"', ORANGE),
        ("02", "功能与技术", "八大模块 + 全栈架构", GREEN),
        ("03", "问题与解决", "开发中的技术挑战（重点）", RED),
        ("04", "收获与成长", "从技术栈到工程思维（重点）", BROWN),
        ("05", "成果展望", "量化成果与未来方向", GREEN),
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
    s += '<p:bg><p:bgPr><a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:solidFill><a:srgbClr val="FF8C5A"/></a:solidFill></a:gs><a:gs pos="100000"><a:solidFill><a:srgbClr val="E85D26"/></a:solidFill></a:gs></a:gradFill><a:effectLst/></p:bgPr></p:bg>'
    s += sp_tree_start()
    sid = 2
    s += oval(sid, "B1", emu(20), emu(-2), emu(15), emu(10), "FFB088", 25000); sid += 1
    s += oval(sid, "B2", emu(-2), emu(12), emu(12), emu(8), "A8D8A0", 30000); sid += 1
    s += textbox(sid, "Thanks", emu(2), emu(6), emu(30), emu(3), "感谢聆听", 5600, True, WHITE, "ctr"); sid += 1
    s += rect(sid, "Line", emu(10), emu(10), emu(14), emu(0.04), fill=WHITE); sid += 1
    s += textbox(sid, "Slogan", emu(2), emu(11), emu(30), emu(1.5), "餐小助 · 让AI帮你盯店，你只管做好菜", 2000, False, "FFE0D0", "ctr"); sid += 1
    s += sp_tree_end()
    s += slide_end()
    return s

# ========== 主函数 ==========

def main():
    N = 15

    slides = []
    slides.append(make_cover())
    slides.append(make_toc())

    # 3. 项目定位
    slides.append(make_content_page(
        '项目定位：中小餐饮的"数字店长"',
        '中小餐饮平均寿命18个月，死因是"不会算账、不会管客、不会控损耗"',
        [
            {"tag": "痛点", "tag_color": RED, "title": "核心痛点", "content": ["中小餐饮平均寿命仅18个月", "不会算账、不会管客、不会控损耗", "多渠道数据孤岛，对账困难"]},
            {"tag": "方案", "tag_color": GREEN, "title": "解决方案", "content": ["AI经营助手，自动算账、管客、控损耗", "接入美团/饿了么/抖音等多渠道数据", "每日自动生成经营日报"]},
            {"tag": "价值", "tag_color": ORANGE, "title": "量化价值", "content": ["单店月均降本3000元", "单店月均增收5000元", "综合经营效率提升30%"]},
            {"tag": "形态", "tag_color": BROWN, "title": "产品形态", "content": ["PC商户后台：复杂配置与数据看板", "手机端商户页：移动查看关键数据", "顾客扫码点餐页：桌码进入点餐"]},
        ]
    ))

    # 4. 功能架构
    slides.append(make_content_page(
        '八大模块覆盖经营全链路',
        '围绕PRD的8大模块，当前项目已覆盖核心可演示链路',
        [
            {"tag": "核心", "tag_color": ORANGE, "title": "AI经营驾驶舱", "content": ["日报自动生成、多渠道对账", "异常预警、语音问答"]},
            {"tag": "核心", "tag_color": ORANGE, "title": "客户资产管理家", "content": ["OneID打通、38个自动标签", "RFM分层、流失预警与召回"]},
            {"tag": "核心", "tag_color": ORANGE, "title": "菜品盈利分析", "content": ["四象限分类、购物篮分析", "成本波动监控"]},
            {"tag": "核心", "tag_color": ORANGE, "title": "智能采购与库存", "content": ["销量预测、智能采购单", "效期预警"]},
            {"tag": "扩展", "tag_color": GREEN, "title": "智能定价与促销", "content": ["动态定价、AI促销方案", "分层发券"]},
            {"tag": "扩展", "tag_color": GREEN, "title": "员工/评价/系统", "content": ["员工排班、评价口碑", "系统管理"]},
        ]
    ))

    # 5. 技术架构
    slides.append(make_content_page(
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
    slides.append(make_content_page(
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
    slides.append(make_content_page(
        '三大核心模块落地',
        '用具体数据和场景证明产品价值',
        [
            {"tag": "模块一", "tag_color": ORANGE, "title": "经营驾驶舱", "content": ["每日8点AI日报自动推送", "含营收/利润/TOP3/异常/建议", "生成时间 < 30秒"]},
            {"tag": "模块二", "tag_color": GREEN, "title": "客户资产", "content": ["OneID跨平台合并客户", "手机号匹配率 > 95%", "自动RFM重算 + 流失风险评分"]},
            {"tag": "模块三", "tag_color": BROWN, "title": "智能采购", "content": ["基于90天历史 + 天气预测销量", "自动生成采购单", "损耗率从12%降至5%"]},
        ]
    ))

    # 8. 过渡页 - 问题与解决
    slides.append(make_transition(
        '遇到的问题及解决方案',
        '答辩要求第3条重点 · 真实开发不是一路顺风'
    ))

    # 9. 问题1
    slides.append(make_content_page(
        '问题①：AI回复"卡死"的假象',
        '用户体验优化：从"等待"到"观看"',
        [
            {"tag": "现象", "tag_color": RED, "title": "问题现象", "content": ["AI生成经营日报时，用户等待10秒以上无反馈", "用户以为系统卡死，反复点击"]},
            {"tag": "原因", "tag_color": BROWN, "title": "原因分析", "content": ['非流式返回，用户看不到"思考中"的状态', "缺少进度反馈机制"]},
            {"tag": "解决", "tag_color": GREEN, "title": "解决方案", "content": ["采用SSE流式输出（Server-Sent Events）", "reply.hijack() + X-Accel-Buffering:no", "AbortController控制停止生成"]},
            {"tag": "效果", "tag_color": ORANGE, "title": "最终效果", "content": ["用户实时看到AI逐字生成", '体验从"等待"变为"观看"', "支持停止生成和禁用重复发送"]},
        ]
    ))

    # 10. 问题2
    slides.append(make_content_page(
        '问题②：AI不能"编"数据',
        '经营系统的底线——绝不误导用户',
        [
            {"tag": "现象", "tag_color": RED, "title": "问题现象", "content": ["AI模型未连接时，可能生成虚假经营分析", "LLM幻觉：模型会自信地编造数据"]},
            {"tag": "原因", "tag_color": BROWN, "title": "原因分析", "content": ["降级mock容易误导真实经营判断", "没有数据源标记和校验机制"]},
            {"tag": "解决", "tag_color": GREEN, "title": "解决方案", "content": ["dataSource标记（real_orders | insufficient）", "只统计served/completed订单", "AI输出标注置信度"]},
            {"tag": "效果", "tag_color": ORANGE, "title": "最终效果", "content": ["模型不可用时直接展示失败原因", "不伪造经营建议", "经营系统的底线：绝不误导用户"]},
        ]
    ))

    # 11. 问题3
    slides.append(make_content_page(
        '问题③：从开发到上线的最后一公里',
        '全链路交付能力和运维思维',
        [
            {"tag": "问题A", "tag_color": RED, "title": "二维码外网访问", "content": ["二维码使用localhost导致外网打不开", "解决：公网域名 + Nginx反向代理"]},
            {"tag": "问题B", "tag_color": RED, "title": "服务器显示旧页面", "content": ["Nginx缓存导致页面不更新", "解决：缓存清理 + Docker镜像版本化"]},
            {"tag": "问题C", "tag_color": RED, "title": "Docker部署冲突", "content": ["端口冲突、中文路径导致compose失败", "解决：固定project name、独立端口18080"]},
            {"tag": "问题D", "tag_color": RED, "title": "订单统计不准", "content": ["取消订单被错误计入销量", "解决：状态机白名单，只统计completed"]},
        ]
    ))

    # 12. 过渡页 - 收获与成长
    slides.append(make_transition(
        '项目完成后的收获',
        '答辩要求第4条重点 · 从"写页面"到"做系统"'
    ))

    # 13. 技术收获
    slides.append(make_content_page(
        '从技术栈到工程思维',
        '这次项目最大的价值，是从"会写页面"走向"能交付系统"',
        [
            {"tag": "前端", "tag_color": GREEN, "title": "前端能力", "content": ["Vue3多端页面开发", "Pinia状态管理、Vue Router路由", "移动端弹层滚动、响应式布局"]},
            {"tag": "后端", "tag_color": ORANGE, "title": "后端能力", "content": ["Fastify接口设计、Prisma数据建模", "注册登录、短信验证码、订单接口", "客户、菜品、采购、评价、天气接口"]},
            {"tag": "AI", "tag_color": BROWN, "title": "AI工程化", "content": ["SSE流式输出、多模型路由", "Prompt工程、Tool Schema设计", "置信度标注、可解释输出"]},
            {"tag": "运维", "tag_color": RED, "title": "部署运维", "content": ["Docker Compose三阶段构建", "Nginx反向代理、腾讯云服务器", "通过日志、curl定位问题"]},
        ]
    ))

    # 14. 成果展望
    slides.append(make_content_page(
        '成果与未来方向',
        '已完成核心闭环，未来持续扩展',
        [
            {"tag": "已完成", "tag_color": GREEN, "title": "项目成果", "content": ["三端系统：PC后台 + 手机 + 顾客扫码", "8大模块、AI日报、客户OneID", "菜品四象限、智能采购、Docker部署"]},
            {"tag": "量化", "tag_color": ORANGE, "title": "量化目标", "content": ["每日节省对账时间1.5小时", "损耗率从12%降至5%", "复购率提升20%"]},
            {"tag": "未来", "tag_color": BROWN, "title": "未来扩展", "content": ["连锁多店看板、供应链比价", "AI外呼召回、行业垂直方案", "MySQL替换、HTTPS域名"]},
        ]
    ))

    # 15. 结尾
    slides.append(make_ending())

    # ========== 基于模板构建PPTX ==========
    if OUT.exists():
        OUT.unlink()

    # 复制模板作为基础
    shutil.copy(TEMPLATE_DIR / "餐小助_项目答辩PPT_完整版_V3.pptx", OUT)

    # 打开并替换slides
    with zipfile.ZipFile(OUT, "a") as zf:
        # 删除旧的slides
        for i in range(1, 36):
            try:
                zf.remove(f"ppt/slides/slide{i}.xml")
                zf.remove(f"ppt/slides/_rels/slide{i}.xml.rels")
            except KeyError:
                pass

        # 写入新的slides
        for i, sxml in enumerate(slides, 1):
            zf.writestr(f"ppt/slides/slide{i}.xml", sxml.encode('utf-8'))
            zf.writestr(f"ppt/slides/_rels/slide{i}.xml.rels", SLIDE_RELS.encode('utf-8'))

    print(f"OK: {OUT} ({OUT.stat().st_size} bytes, {N} slides)")

if __name__ == "__main__":
    main()
