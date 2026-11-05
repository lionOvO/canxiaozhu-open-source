# 餐小助项目答辩PPT生成脚本 - 使用PowerPoint COM自动化
# 确保生成的PPTX文件可以正常打开

$OutputFile = "D:\餐小助\餐小助_项目答辩PPT_重点问题解决与收获.pptx"

# 颜色定义
$COLOR_ORANGE = [System.Drawing.Color]::FromArgb(255, 107, 53)
$COLOR_GREEN = [System.Drawing.Color]::FromArgb(0, 200, 83)
$COLOR_RED = [System.Drawing.Color]::FromArgb(255, 61, 0)
$COLOR_BROWN = [System.Drawing.Color]::FromArgb(91, 54, 31)
$COLOR_BG = [System.Drawing.Color]::FromArgb(247, 248, 250)
$COLOR_CARD = [System.Drawing.Color]::FromArgb(255, 255, 255)
$COLOR_TEXT = [System.Drawing.Color]::FromArgb(26, 26, 26)
$COLOR_MUTED = [System.Drawing.Color]::FromArgb(102, 102, 102)
$COLOR_WHITE = [System.Drawing.Color]::FromArgb(255, 255, 255)

Write-Host "正在启动PowerPoint..." -ForegroundColor Green

# 创建PowerPoint应用
$ppt = New-Object -ComObject PowerPoint.Application
$ppt.Visible = [Microsoft.Office.Core.MsoTriState]::msoTrue

# 创建演示文稿
$pres = $ppt.Presentations.Add([Microsoft.Office.Core.MsoTriState]::msoTrue)

# 设置幻灯片大小 (16:9 宽屏)
$pres.PageSetup.SlideWidth = 960
$pres.PageSetup.SlideHeight = 540

Write-Host "PowerPoint已启动，开始创建幻灯片..." -ForegroundColor Green

# 辅助函数：添加背景
function Add-Background {
    param($slide, $color)
    $shape = $slide.Shapes.AddShape([Microsoft.Office.Core.MsoAutoShapeType]::msoShapeRectangle, 0, 0, 960, 540)
    $shape.Fill.ForeColor.RGB = $color
    $shape.Line.Visible = [Microsoft.Office.Core.MsoTriState]::msoFalse
    $shape.ZOrder([Microsoft.Office.Core.MsoZOrderCmd]::msoSendToBack)
}

# 辅助函数：添加文本框
function Add-TextBox {
    param($slide, $text, $left, $top, $width, $height, $fontSize, $color, $bold, $align)
    $shape = $slide.Shapes.AddTextBox([Microsoft.Office.Core.MsoTextOrientation]::msoTextOrientationHorizontal, $left, $top, $width, $height)
    $shape.TextFrame.TextRange.Text = $text
    $shape.TextFrame.TextRange.Font.Size = $fontSize
    $shape.TextFrame.TextRange.Font.Color.RGB = $color
    $shape.TextFrame.TextRange.Font.Bold = $bold
    $shape.TextFrame.TextRange.Font.Name = "Microsoft YaHei"
    if ($align -eq "center") {
        $shape.TextFrame.TextRange.ParagraphFormat.Alignment = [Microsoft.Office.Core.PpParagraphAlignment]::ppAlignCenter
    } elseif ($align -eq "right") {
        $shape.TextFrame.TextRange.ParagraphFormat.Alignment = [Microsoft.Office.Core.PpParagraphAlignment]::ppAlignRight
    } else {
        $shape.TextFrame.TextRange.ParagraphFormat.Alignment = [Microsoft.Office.Core.PpParagraphAlignment]::ppAlignLeft
    }
    return $shape
}

# 辅助函数：添加圆角矩形卡片
function Add-RoundedCard {
    param($slide, $left, $top, $width, $height, $fillColor, $lineColor)
    $shape = $slide.Shapes.AddShape([Microsoft.Office.Core.MsoAutoShapeType]::msoShapeRoundedRectangle, $left, $top, $width, $height)
    $shape.Fill.ForeColor.RGB = $fillColor
    $shape.Line.ForeColor.RGB = $lineColor
    $shape.Line.Weight = 1
    return $shape
}

# 辅助函数：添加标签
function Add-Tag {
    param($slide, $text, $left, $top, $width, $height, $fillColor)
    $shape = $slide.Shapes.AddShape([Microsoft.Office.Core.MsoAutoShapeType]::msoShapeRoundedRectangle, $left, $top, $width, $height)
    $shape.Fill.ForeColor.RGB = $fillColor
    $shape.Line.Visible = [Microsoft.Office.Core.MsoTriState]::msoFalse
    $shape.TextFrame.TextRange.Text = $text
    $shape.TextFrame.TextRange.Font.Size = 11
    $shape.TextFrame.TextRange.Font.Color.RGB = $COLOR_WHITE
    $shape.TextFrame.TextRange.Font.Bold = [Microsoft.Office.Core.MsoTriState]::msoTrue
    $shape.TextFrame.TextRange.Font.Name = "Microsoft YaHei"
    $shape.TextFrame.TextRange.ParagraphFormat.Alignment = [Microsoft.Office.Core.PpParagraphAlignment]::ppAlignCenter
    $shape.TextFrame.VerticalAnchor = [Microsoft.Office.Core.MsoVerticalAnchor]::msoAnchorMiddle
    return $shape
}

# ==================== 幻灯片内容 ====================

# Slide 1: 封面
Write-Host "创建封面页..." -ForegroundColor Yellow
$slide1 = $pres.Slides.Add(1, [Microsoft.Office.Core.PpSlideLayout]::ppLayoutBlank)
Add-Background $slide1 $COLOR_ORANGE

# 装饰圆
$blob1 = $slide1.Shapes.AddShape([Microsoft.Office.Core.MsoAutoShapeType]::msoShapeOval, 700, -50, 350, 250)
$blob1.Fill.ForeColor.RGB = [System.Drawing.Color]::FromArgb(255, 176, 136)
$blob1.Fill.Transparency = 0.3
$blob1.Line.Visible = [Microsoft.Office.Core.MsoTriState]::msoFalse

$blob2 = $slide1.Shapes.AddShape([Microsoft.Office.Core.MsoAutoShapeType]::msoShapeOval, -50, 380, 300, 200)
$blob2.Fill.ForeColor.RGB = [System.Drawing.Color]::FromArgb(168, 216, 160)
$blob2.Fill.Transparency = 0.35
$blob2.Line.Visible = [Microsoft.Office.Core.MsoTriState]::msoFalse

# 技术栈标签
Add-Tag $slide1 "Vue3 + Fastify + Prisma + AI + Docker" 80, 140, 420, 35, $COLOR_GREEN

# 主标题
Add-TextBox $slide1 "餐小助" 80, 200, 800, 80, 52, $COLOR_WHITE, $true, "left"

# 副标题
Add-TextBox $slide1 "商户智能经营助手" 80, 280, 800, 50, 32, $COLOR_WHITE, $true, "left"

# 描述
Add-TextBox $slide1 "项目答辩——从`"会写页面`"到`"能交付系统`"" 80, 340, 800, 40, 18, [System.Drawing.Color]::FromArgb(255, 224, 208), $false, "left"

# 分隔线
$line = $slide1.Shapes.AddShape([Microsoft.Office.Core.MsoAutoShapeType]::msoShapeRectangle, 230, 400, 500, 2)
$line.Fill.ForeColor.RGB = $COLOR_WHITE
$line.Line.Visible = [Microsoft.Office.Core.MsoTriState]::msoFalse

# 底部信息
Add-TextBox $slide1 "答辩人：餐小助团队    2026年8月" 80, 420, 800, 30, 14, [System.Drawing.Color]::FromArgb(255, 208, 184), $false, "left"

# Slide 2: 目录
Write-Host "创建目录页..." -ForegroundColor Yellow
$slide2 = $pres.Slides.Add(2, [Microsoft.Office.Core.PpSlideLayout]::ppLayoutBlank)
Add-Background $slide2 $COLOR_BG

Add-TextBox $slide2 "答辩提纲" 60, 30, 840, 50, 32, $COLOR_TEXT, $true, "left"
Add-TextBox $slide2 "五大章节，重点聚焦问题与收获" 60, 80, 840, 30, 14, $COLOR_MUTED, $false, "left"

$sepLine = $slide2.Shapes.AddShape([Microsoft.Office.Core.MsoAutoShapeType]::msoShapeRectangle, 60, 120, 120, 2)
$sepLine.Fill.ForeColor.RGB = $COLOR_ORANGE
$sepLine.Line.Visible = [Microsoft.Office.Core.MsoTriState]::msoFalse

$items = @(
    @("01", "项目介绍", "中小餐饮的`"数字店长`"", $COLOR_ORANGE),
    @("02", "功能与技术", "八大模块 + 全栈架构", $COLOR_GREEN),
    @("03", "问题与解决", "开发中的技术挑战（重点）", $COLOR_RED),
    @("04", "收获与成长", "从技术栈到工程思维（重点）", $COLOR_BROWN),
    @("05", "成果展望", "量化成果与未来方向", $COLOR_GREEN)
)

for ($i = 0; $i -lt $items.Count; $i++) {
    $y = 140 + $i * 75
    $card = Add-RoundedCard $slide2 60, $y, 840, 60, $COLOR_CARD, [System.Drawing.Color]::FromArgb(224, 224, 224)
    
    $circle = $slide2.Shapes.AddShape([Microsoft.Office.Core.MsoAutoShapeType]::msoShapeOval, 80, $y + 10, 40, 40)
    $circle.Fill.ForeColor.RGB = $items[$i][3]
    $circle.Line.Visible = [Microsoft.Office.Core.MsoTriState]::msoFalse
    $circle.TextFrame.TextRange.Text = $items[$i][0]
    $circle.TextFrame.TextRange.Font.Size = 18
    $circle.TextFrame.TextRange.Font.Color.RGB = $COLOR_WHITE
    $circle.TextFrame.TextRange.Font.Bold = [Microsoft.Office.Core.MsoTriState]::msoTrue
    $circle.TextFrame.TextRange.Font.Name = "Microsoft YaHei"
    $circle.TextFrame.TextRange.ParagraphFormat.Alignment = [Microsoft.Office.Core.PpParagraphAlignment]::ppAlignCenter
    $circle.TextFrame.VerticalAnchor = [Microsoft.Office.Core.MsoVerticalAnchor]::msoAnchorMiddle
    
    Add-TextBox $slide2 $items[$i][1] 140, $y + 8, 200, 25, 20, $COLOR_TEXT, $true, "left"
    Add-TextBox $slide2 $items[$i][2] 140, $y + 32, 700, 20, 14, $COLOR_MUTED, $false, "left"
}

# Slide 3: 项目定位
Write-Host "创建项目定位页..." -ForegroundColor Yellow
$slide3 = $pres.Slides.Add(3, [Microsoft.Office.Core.PpSlideLayout]::ppLayoutBlank)
Add-Background $slide3 $COLOR_BG

Add-TextBox $slide3 "项目定位：中小餐饮的`"数字店长`"" 60, 30, 840, 50, 32, $COLOR_TEXT, $true, "left"
Add-TextBox $slide3 "中小餐饮平均寿命18个月，死因是`"不会算账、不会管客、不会控损耗`"" 60, 80, 840, 30, 14, $COLOR_MUTED, $false, "left"

$sepLine = $slide3.Shapes.AddShape([Microsoft.Office.Core.MsoAutoShapeType]::msoShapeRectangle, 60, 120, 120, 2)
$sepLine.Fill.ForeColor.RGB = $COLOR_ORANGE
$sepLine.Line.Visible = [Microsoft.Office.Core.MsoTriState]::msoFalse

$cards = @(
    @("痛点", "核心痛点", @("中小餐饮平均寿命仅18个月", "不会算账、不会管客、不会控损耗", "多渠道数据孤岛，对账困难"), $COLOR_RED),
    @("方案", "解决方案", @("AI经营助手，自动算账、管客、控损耗", "接入美团/饿了么/抖音等多渠道数据", "每日自动生成经营日报"), $COLOR_GREEN),
    @("价值", "量化价值", @("单店月均降本3000元", "单店月均增收5000元", "综合经营效率提升30%"), $COLOR_ORANGE),
    @("形态", "产品形态", @("PC商户后台：复杂配置与数据看板", "手机端商户页：移动查看关键数据", "顾客扫码点餐页：桌码进入点餐"), $COLOR_BROWN)
)

for ($i = 0; $i -lt $cards.Count; $i++) {
    $col = $i % 2
    $row = [math]::Floor($i / 2)
    $x = 60 + $col * 430
    $y = 140 + $row * 180
    
    $card = Add-RoundedCard $slide3 $x, $y, 410, 160, $COLOR_CARD, [System.Drawing.Color]::FromArgb(224, 224, 224)
    Add-Tag $slide3 $cards[$i][0] ($x + 15), ($y + 15), 60, 25, $cards[$i][3]
    
    Add-TextBox $slide3 $cards[$i][1] ($x + 15), ($y + 50), 380, 25, 16, $COLOR_TEXT, $true, "left"
    
    $contentText = ($cards[$i][2] | ForEach-Object { "• $_" }) -join "`n"
    Add-TextBox $slide3 $contentText ($x + 15), ($y + 80), 380, 70, 13, $COLOR_MUTED, $false, "left"
}

# Slide 4: 功能架构
Write-Host "创建功能架构页..." -ForegroundColor Yellow
$slide4 = $pres.Slides.Add(4, [Microsoft.Office.Core.PpSlideLayout]::ppLayoutBlank)
Add-Background $slide4 $COLOR_BG

Add-TextBox $slide4 "八大模块覆盖经营全链路" 60, 30, 840, 50, 32, $COLOR_TEXT, $true, "left"
Add-TextBox $slide4 "围绕PRD的8大模块，当前项目已覆盖核心可演示链路" 60, 80, 840, 30, 14, $COLOR_MUTED, $false, "left"

$sepLine = $slide4.Shapes.AddShape([Microsoft.Office.Core.MsoAutoShapeType]::msoShapeRectangle, 60, 120, 120, 2)
$sepLine.Fill.ForeColor.RGB = $COLOR_ORANGE
$sepLine.Line.Visible = [Microsoft.Office.Core.MsoTriState]::msoFalse

$modules = @(
    @("核心", "AI经营驾驶舱", @("日报自动生成、多渠道对账", "异常预警、语音问答"), $COLOR_ORANGE),
    @("核心", "客户资产管家", @("OneID打通、38个自动标签", "RFM分层、流失预警与召回"), $COLOR_ORANGE),
    @("核心", "菜品盈利分析", @("四象限分类、购物篮分析", "成本波动监控"), $COLOR_ORANGE),
    @("核心", "智能采购与库存", @("销量预测、智能采购单", "效期预警"), $COLOR_ORANGE),
    @("扩展", "智能定价与促销", @("动态定价、AI促销方案", "分层发券"), $COLOR_GREEN),
    @("扩展", "员工/评价/系统", @("员工排班、评价口碑", "系统管理"), $COLOR_GREEN)
)

for ($i = 0; $i -lt $modules.Count; $i++) {
    $col = $i % 2
    $row = [math]::Floor($i / 2)
    $x = 60 + $col * 430
    $y = 140 + $row * 130
    
    $card = Add-RoundedCard $slide4 $x, $y, 410, 110, $COLOR_CARD, [System.Drawing.Color]::FromArgb(224, 224, 224)
    Add-Tag $slide4 $modules[$i][0] ($x + 15), ($y + 12), 50, 22, $modules[$i][3]
    
    Add-TextBox $slide4 $modules[$i][1] ($x + 15), ($y + 40), 380, 22, 15, $COLOR_TEXT, $true, "left"
    
    $contentText = ($modules[$i][2] | ForEach-Object { "• $_" }) -join "`n"
    Add-TextBox $slide4 $contentText ($x + 15), ($y + 65), 380, 40, 12, $COLOR_MUTED, $false, "left"
}

# Slide 5: 技术架构
Write-Host "创建技术架构页..." -ForegroundColor Yellow
$slide5 = $pres.Slides.Add(5, [Microsoft.Office.Core.PpSlideLayout]::ppLayoutBlank)
Add-Background $slide5 $COLOR_BG

Add-TextBox $slide5 "全栈技术架构" 60, 30, 840, 50, 32, $COLOR_TEXT, $true, "left"
Add-TextBox $slide5 "前端三端 + 后端服务 + AI层 + 数据层 + 云部署" 60, 80, 840, 30, 14, $COLOR_MUTED, $false, "left"

$sepLine = $slide5.Shapes.AddShape([Microsoft.Office.Core.MsoAutoShapeType]::msoShapeRectangle, 60, 120, 120, 2)
$sepLine.Fill.ForeColor.RGB = $COLOR_ORANGE
$sepLine.Line.Visible = [Microsoft.Office.Core.MsoTriState]::msoFalse

$layers = @(
    @("前端", "前端展示层", @("Vue3 + Pinia + Vue Router + ECharts", "PC商户后台 + 手机商户端 + 顾客扫码页"), $COLOR_GREEN),
    @("后端", "业务接口层", @("Fastify 5 + Prisma 6 + TypeBox", "Swagger文档、CORS、Helmet、RateLimit"), $COLOR_ORANGE),
    @("AI", "AI能力层", @("DeepSeek-V3（推理）、通义千问-Max（BI）", "豆包-Pro（创意）、文心一言-4.0（NLP）"), $COLOR_BROWN),
    @("部署", "云部署层", @("Docker Compose + Nginx", "腾讯云公网IP、数据卷持久化"), $COLOR_RED)
)

for ($i = 0; $i -lt $layers.Count; $i++) {
    $col = $i % 2
    $row = [math]::Floor($i / 2)
    $x = 60 + $col * 430
    $y = 140 + $row * 180
    
    $card = Add-RoundedCard $slide5 $x, $y, 410, 160, $COLOR_CARD, [System.Drawing.Color]::FromArgb(224, 224, 224)
    Add-Tag $slide5 $layers[$i][0] ($x + 15), ($y + 15), 50, 25, $layers[$i][3]
    
    Add-TextBox $slide5 $layers[$i][1] ($x + 15), ($y + 50), 380, 25, 16, $COLOR_TEXT, $true, "left"
    
    $contentText = ($layers[$i][2] | ForEach-Object { "• $_" }) -join "`n"
    Add-TextBox $slide5 $contentText ($x + 15), ($y + 80), 380, 70, 13, $COLOR_MUTED, $false, "left"
}

# Slide 6: 业务闭环
Write-Host "创建业务闭环页..." -ForegroundColor Yellow
$slide6 = $pres.Slides.Add(6, [Microsoft.Office.Core.PpSlideLayout]::ppLayoutBlank)
Add-Background $slide6 $COLOR_BG

Add-TextBox $slide6 "业务闭环：从顾客下单到商户决策" 60, 30, 840, 50, 32, $COLOR_TEXT, $true, "left"
Add-TextBox $slide6 "数据不再只是页面展示，而是可持续计算、追踪、复盘的经营资产" 60, 80, 840, 30, 14, $COLOR_MUTED, $false, "left"

$sepLine = $slide6.Shapes.AddShape([Microsoft.Office.Core.MsoAutoShapeType]::msoShapeRectangle, 60, 120, 120, 2)
$sepLine.Fill.ForeColor.RGB = $COLOR_ORANGE
$sepLine.Line.Visible = [Microsoft.Office.Core.MsoTriState]::msoFalse

$flows = @(
    @("顾客端", "扫码点餐", @("桌码token自动识别桌号", "菜品、数量、称呼、手机号、备注", "购物车、加菜、订单状态"), $COLOR_ORANGE),
    @("商户端", "接单与分析", @("订单队列、状态流转动画", "数据沉淀到客户/菜品/评价", "AI日报、采购建议、经营分析"), $COLOR_GREEN),
    @("数据", "数据模型", @("OneID客户主数据、订单事实表", "菜品维度表、标签体系", "订单状态机白名单校验"), $COLOR_BROWN),
    @("AI", "智能辅助", @("SSE流式AI问答", "多模型路由策略", "置信度标注、可解释输出"), $COLOR_RED)
)

for ($i = 0; $i -lt $flows.Count; $i++) {
    $col = $i % 2
    $row = [math]::Floor($i / 2)
    $x = 60 + $col * 430
    $y = 140 + $row * 180
    
    $card = Add-RoundedCard $slide6 $x, $y, 410, 160, $COLOR_CARD, [System.Drawing.Color]::FromArgb(224, 224, 224)
    Add-Tag $slide6 $flows[$i][0] ($x + 15), ($y + 15), 60, 25, $flows[$i][3]
    
    Add-TextBox $slide6 $flows[$i][1] ($x + 15), ($y + 50), 380, 25, 16, $COLOR_TEXT, $true, "left"
    
    $contentText = ($flows[$i][2] | ForEach-Object { "• $_" }) -join "`n"
    Add-TextBox $slide6 $contentText ($x + 15), ($y + 80), 380, 70, 13, $COLOR_MUTED, $false, "left"
}

# Slide 7: 核心模块
Write-Host "创建核心模块页..." -ForegroundColor Yellow
$slide7 = $pres.Slides.Add(7, [Microsoft.Office.Core.PpSlideLayout]::ppLayoutBlank)
Add-Background $slide7 $COLOR_BG

Add-TextBox $slide7 "三大核心模块落地" 60, 30, 840, 50, 32, $COLOR_TEXT, $true, "left"
Add-TextBox $slide7 "用具体数据和场景证明产品价值" 60, 80, 840, 30, 14, $COLOR_MUTED, $false, "left"

$sepLine = $slide7.Shapes.AddShape([Microsoft.Office.Core.MsoAutoShapeType]::msoShapeRectangle, 60, 120, 120, 2)
$sepLine.Fill.ForeColor.RGB = $COLOR_ORANGE
$sepLine.Line.Visible = [Microsoft.Office.Core.MsoTriState]::msoFalse

$coreModules = @(
    @("模块一", "经营驾驶舱", @("每日8点AI日报自动推送", "含营收/利润/TOP3/异常/建议", "生成时间 < 30秒"), $COLOR_ORANGE),
    @("模块二", "客户资产", @("OneID跨平台合并客户", "手机号匹配率 > 95%", "自动RFM重算 + 流失风险评分"), $COLOR_GREEN),
    @("模块三", "智能采购", @("基于90天历史 + 天气预测销量", "自动生成采购单", "损耗率从12%降至5%"), $COLOR_BROWN)
)

for ($i = 0; $i -lt $coreModules.Count; $i++) {
    $x = 60 + $i * 290
    $y = 140
    
    $card = Add-RoundedCard $slide7 $x, $y, 270, 350, $COLOR_CARD, [System.Drawing.Color]::FromArgb(224, 224, 224)
    Add-Tag $slide7 $coreModules[$i][0] ($x + 15), ($y + 15), 70, 25, $coreModules[$i][3]
    
    Add-TextBox $slide7 $coreModules[$i][1] ($x + 15), ($y + 50), 240, 30, 18, $COLOR_TEXT, $true, "left"
    
    $contentText = ($coreModules[$i][2] | ForEach-Object { "• $_" }) -join "`n"
    Add-TextBox $slide7 $contentText ($x + 15), ($y + 90), 240, 250, 13, $COLOR_MUTED, $false, "left"
}

# Slide 8: 过渡页 - 问题与解决
Write-Host "创建过渡页（问题与解决）..." -ForegroundColor Yellow
$slide8 = $pres.Slides.Add(8, [Microsoft.Office.Core.PpSlideLayout]::ppLayoutBlank)

$bg8 = $slide8.Shapes.AddShape([Microsoft.Office.Core.MsoAutoShapeType]::msoShapeRectangle, 0, 0, 960, 540)
$bg8.Fill.ForeColor.RGB = $COLOR_BROWN
$bg8.Line.Visible = [Microsoft.Office.Core.MsoTriState]::msoFalse
$bg8.ZOrder([Microsoft.Office.Core.MsoZOrderCmd]::msoSendToBack)

$blob1 = $slide8.Shapes.AddShape([Microsoft.Office.Core.MsoAutoShapeType]::msoShapeOval, 650, -80, 400, 300)
$blob1.Fill.ForeColor.RGB = [System.Drawing.Color]::FromArgb(255, 140, 90)
$blob1.Fill.Transparency = 0.2
$blob1.Line.Visible = [Microsoft.Office.Core.MsoTriState]::msoFalse

$blob2 = $slide8.Shapes.AddShape([Microsoft.Office.Core.MsoAutoShapeType]::msoShapeOval, -80, 350, 350, 250)
$blob2.Fill.ForeColor.RGB = [System.Drawing.Color]::FromArgb(0, 200, 83)
$blob2.Fill.Transparency = 0.25
$blob2.Line.Visible = [Microsoft.Office.Core.MsoTriState]::msoFalse

Add-Tag $slide8 "CORE SECTION" 340, 140, 280, 35, $COLOR_ORANGE

Add-TextBox $slide8 "遇到的问题及解决方案" 80, 200, 800, 70, 44, $COLOR_WHITE, $true, "center"
Add-TextBox $slide8 "答辩要求第3条重点 · 真实开发不是一路顺风" 80, 280, 800, 40, 20, [System.Drawing.Color]::FromArgb(255, 208, 184), $false, "center"

$line8 = $slide8.Shapes.AddShape([Microsoft.Office.Core.MsoAutoShapeType]::msoShapeRectangle, 280, 340, 400, 2)
$line8.Fill.ForeColor.RGB = $COLOR_ORANGE
$line8.Line.Visible = [Microsoft.Office.Core.MsoTriState]::msoFalse

# Slide 9: 问题1 - AI流式输出
Write-Host "创建问题1页..." -ForegroundColor Yellow
$slide9 = $pres.Slides.Add(9, [Microsoft.Office.Core.PpSlideLayout]::ppLayoutBlank)
Add-Background $slide9 $COLOR_BG

Add-TextBox $slide9 "问题①：AI回复`"卡死`"的假象" 60, 30, 840, 50, 32, $COLOR_TEXT, $true, "left"
Add-TextBox $slide9 "用户体验优化：从`"等待`"到`"观看`"" 60, 80, 840, 30, 14, $COLOR_MUTED, $false, "left"

$sepLine = $slide9.Shapes.AddShape([Microsoft.Office.Core.MsoAutoShapeType]::msoShapeRectangle, 60, 120, 120, 2)
$sepLine.Fill.ForeColor.RGB = $COLOR_ORANGE
$sepLine.Line.Visible = [Microsoft.Office.Core.MsoTriState]::msoFalse

$problems1 = @(
    @("现象", "问题现象", @("AI生成经营日报时，用户等待10秒以上无反馈", "用户误以为系统卡死，反复点击"), $COLOR_RED),
    @("原因", "原因分析", @("非流式返回，用户看不到`"思考中`"的状态", "缺少进度反馈机制"), $COLOR_BROWN),
    @("解决", "解决方案", @("采用SSE流式输出（Server-Sent Events）", "reply.hijack() + X-Accel-Buffering:no", "AbortController控制停止生成"), $COLOR_GREEN),
    @("效果", "最终效果", @("用户实时看到AI逐字生成", "体验从`"等待`"变为`"观看`"", "支持停止生成和禁用重复发送"), $COLOR_ORANGE)
)

for ($i = 0; $i -lt $problems1.Count; $i++) {
    $col = $i % 2
    $row = [math]::Floor($i / 2)
    $x = 60 + $col * 430
    $y = 140 + $row * 180
    
    $card = Add-RoundedCard $slide9 $x, $y, 410, 160, $COLOR_CARD, [System.Drawing.Color]::FromArgb(224, 224, 224)
    Add-Tag $slide9 $problems1[$i][0] ($x + 15), ($y + 15), 50, 25, $problems1[$i][3]
    
    Add-TextBox $slide9 $problems1[$i][1] ($x + 15), ($y + 50), 380, 25, 16, $COLOR_TEXT, $true, "left"
    
    $contentText = ($problems1[$i][2] | ForEach-Object { "• $_" }) -join "`n"
    Add-TextBox $slide9 $contentText ($x + 15), ($y + 80), 380, 70, 13, $COLOR_MUTED, $false, "left"
}

# Slide 10: 问题2 - 数据真实性
Write-Host "创建问题2页..." -ForegroundColor Yellow
$slide10 = $pres.Slides.Add(10, [Microsoft.Office.Core.PpSlideLayout]::ppLayoutBlank)
Add-Background $slide10 $COLOR_BG

Add-TextBox $slide10 "问题②：AI不能`"编`"数据" 60, 30, 840, 50, 32, $COLOR_TEXT, $true, "left"
Add-TextBox $slide10 "经营系统的底线——绝不误导用户" 60, 80, 840, 30, 14, $COLOR_MUTED, $false, "left"

$sepLine = $slide10.Shapes.AddShape([Microsoft.Office.Core.MsoAutoShapeType]::msoShapeRectangle, 60, 120, 120, 2)
$sepLine.Fill.ForeColor.RGB = $COLOR_ORANGE
$sepLine.Line.Visible = [Microsoft.Office.Core.MsoTriState]::msoFalse

$problems2 = @(
    @("现象", "问题现象", @("AI模型未连接时，可能生成虚假经营分析", "LLM幻觉：模型会自信地编造数据"), $COLOR_RED),
    @("原因", "原因分析", @("降级mock容易误导真实经营判断", "没有数据源标记和校验机制"), $COLOR_BROWN),
    @("解决", "解决方案", @("dataSource标记（real_orders | insufficient）", "只统计served/completed订单", "AI输出标注置信度"), $COLOR_GREEN),
    @("效果", "最终效果", @("模型不可用时直接展示失败原因", "不伪造经营建议", "经营系统的底线：绝不误导用户"), $COLOR_ORANGE)
)

for ($i = 0; $i -lt $problems2.Count; $i++) {
    $col = $i % 2
    $row = [math]::Floor($i / 2)
    $x = 60 + $col * 430
    $y = 140 + $row * 180
    
    $card = Add-RoundedCard $slide10 $x, $y, 410, 160, $COLOR_CARD, [System.Drawing.Color]::FromArgb(224, 224, 224)
    Add-Tag $slide10 $problems2[$i][0] ($x + 15), ($y + 15), 50, 25, $problems2[$i][3]
    
    Add-TextBox $slide10 $problems2[$i][1] ($x + 15), ($y + 50), 380, 25, 16, $COLOR_TEXT, $true, "left"
    
    $contentText = ($problems2[$i][2] | ForEach-Object { "• $_" }) -join "`n"
    Add-TextBox $slide10 $contentText ($x + 15), ($y + 80), 380, 70, 13, $COLOR_MUTED, $false, "left"
}

# Slide 11: 问题3 - 多端部署
Write-Host "创建问题3页..." -ForegroundColor Yellow
$slide11 = $pres.Slides.Add(11, [Microsoft.Office.Core.PpSlideLayout]::ppLayoutBlank)
Add-Background $slide11 $COLOR_BG

Add-TextBox $slide11 "问题③：从开发到上线的最后一公里" 60, 30, 840, 50, 32, $COLOR_TEXT, $true, "left"
Add-TextBox $slide11 "全链路交付能力和运维思维" 60, 80, 840, 30, 14, $COLOR_MUTED, $false, "left"

$sepLine = $slide11.Shapes.AddShape([Microsoft.Office.Core.MsoAutoShapeType]::msoShapeRectangle, 60, 120, 120, 2)
$sepLine.Fill.ForeColor.RGB = $COLOR_ORANGE
$sepLine.Line.Visible = [Microsoft.Office.Core.MsoTriState]::msoFalse

$problems3 = @(
    @("问题A", "二维码外网访问", @("二维码使用localhost导致外网打不开", "解决：公网域名 + Nginx反向代理"), $COLOR_RED),
    @("问题B", "服务器显示旧页面", @("Nginx缓存导致页面不更新", "解决：缓存清理 + Docker镜像版本化"), $COLOR_RED),
    @("问题C", "Docker部署冲突", @("端口冲突、中文路径导致compose失败", "解决：固定project name、独立端口18080"), $COLOR_RED),
    @("问题D", "订单统计不准", @("取消订单被错误计入销量", "解决：状态机白名单，只统计completed"), $COLOR_RED)
)

for ($i = 0; $i -lt $problems3.Count; $i++) {
    $col = $i % 2
    $row = [math]::Floor($i / 2)
    $x = 60 + $col * 430
    $y = 140 + $row * 180
    
    $card = Add-RoundedCard $slide11 $x, $y, 410, 160, $COLOR_CARD, [System.Drawing.Color]::FromArgb(224, 224, 224)
    Add-Tag $slide11 $problems3[$i][0] ($x + 15), ($y + 15), 60, 25, $problems3[$i][3]
    
    Add-TextBox $slide11 $problems3[$i][1] ($x + 15), ($y + 50), 380, 25, 16, $COLOR_TEXT, $true, "left"
    
    $contentText = ($problems3[$i][2] | ForEach-Object { "• $_" }) -join "`n"
    Add-TextBox $slide11 $contentText ($x + 15), ($y + 80), 380, 70, 13, $COLOR_MUTED, $false, "left"
}

# Slide 12: 过渡页 - 收获与成长
Write-Host "创建过渡页（收获与成长）..." -ForegroundColor Yellow
$slide12 = $pres.Slides.Add(12, [Microsoft.Office.Core.PpSlideLayout]::ppLayoutBlank)

$bg12 = $slide12.Shapes.AddShape([Microsoft.Office.Core.MsoAutoShapeType]::msoShapeRectangle, 0, 0, 960, 540)
$bg12.Fill.ForeColor.RGB = $COLOR_BROWN
$bg12.Line.Visible = [Microsoft.Office.Core.MsoTriState]::msoFalse
$bg12.ZOrder([Microsoft.Office.Core.MsoZOrderCmd]::msoSendToBack)

$blob1 = $slide12.Shapes.AddShape([Microsoft.Office.Core.MsoAutoShapeType]::msoShapeOval, 650, -80, 400, 300)
$blob1.Fill.ForeColor.RGB = [System.Drawing.Color]::FromArgb(255, 140, 90)
$blob1.Fill.Transparency = 0.2
$blob1.Line.Visible = [Microsoft.Office.Core.MsoTriState]::msoFalse

$blob2 = $slide12.Shapes.AddShape([Microsoft.Office.Core.MsoAutoShapeType]::msoShapeOval, -80, 350, 350, 250)
$blob2.Fill.ForeColor.RGB = [System.Drawing.Color]::FromArgb(0, 200, 83)
$blob2.Fill.Transparency = 0.25
$blob2.Line.Visible = [Microsoft.Office.Core.MsoTriState]::msoFalse

Add-Tag $slide12 "CORE SECTION" 340, 140, 280, 35, $COLOR_ORANGE

Add-TextBox $slide12 "项目完成后的收获" 80, 200, 800, 70, 44, $COLOR_WHITE, $true, "center"
Add-TextBox $slide12 "答辩要求第4条重点 · 从`"写页面`"到`"做系统`"" 80, 280, 800, 40, 20, [System.Drawing.Color]::FromArgb(255, 208, 184), $false, "center"

$line12 = $slide12.Shapes.AddShape([Microsoft.Office.Core.MsoAutoShapeType]::msoShapeRectangle, 280, 340, 400, 2)
$line12.Fill.ForeColor.RGB = $COLOR_ORANGE
$line12.Line.Visible = [Microsoft.Office.Core.MsoTriState]::msoFalse

# Slide 13: 技术收获
Write-Host "创建技术收获页..." -ForegroundColor Yellow
$slide13 = $pres.Slides.Add(13, [Microsoft.Office.Core.PpSlideLayout]::ppLayoutBlank)
Add-Background $slide13 $COLOR_BG

Add-TextBox $slide13 "从技术栈到工程思维" 60, 30, 840, 50, 32, $COLOR_TEXT, $true, "left"
Add-TextBox $slide13 "这次项目最大的价值，是从`"会写页面`"走向`"能交付系统`"" 60, 80, 840, 30, 14, $COLOR_MUTED, $false, "left"

$sepLine = $slide13.Shapes.AddShape([Microsoft.Office.Core.MsoAutoShapeType]::msoShapeRectangle, 60, 120, 120, 2)
$sepLine.Fill.ForeColor.RGB = $COLOR_ORANGE
$sepLine.Line.Visible = [Microsoft.Office.Core.MsoTriState]::msoFalse

$gains = @(
    @("前端", "前端能力", @("Vue3多端页面开发", "Pinia状态管理、Vue Router路由", "移动端弹层滚动、响应式布局"), $COLOR_GREEN),
    @("后端", "后端能力", @("Fastify接口设计、Prisma数据建模", "注册登录、短信验证码、订单接口", "客户、菜品、采购、评价、天气接口"), $COLOR_ORANGE),
    @("AI", "AI工程化", @("SSE流式输出、多模型路由", "Prompt工程、Tool Schema设计", "置信度标注、可解释输出"), $COLOR_BROWN),
    @("运维", "部署运维", @("Docker Compose三阶段构建", "Nginx反向代理、腾讯云服务器", "通过日志、curl定位问题"), $COLOR_RED)
)

for ($i = 0; $i -lt $gains.Count; $i++) {
    $col = $i % 2
    $row = [math]::Floor($i / 2)
    $x = 60 + $col * 430
    $y = 140 + $row * 180
    
    $card = Add-RoundedCard $slide13 $x, $y, 410, 160, $COLOR_CARD, [System.Drawing.Color]::FromArgb(224, 224, 224)
    Add-Tag $slide13 $gains[$i][0] ($x + 15), ($y + 15), 50, 25, $gains[$i][3]
    
    Add-TextBox $slide13 $gains[$i][1] ($x + 15), ($y + 50), 380, 25, 16, $COLOR_TEXT, $true, "left"
    
    $contentText = ($gains[$i][2] | ForEach-Object { "• $_" }) -join "`n"
    Add-TextBox $slide13 $contentText ($x + 15), ($y + 80), 380, 70, 13, $COLOR_MUTED, $false, "left"
}

# Slide 14: 成果展望
Write-Host "创建成果展望页..." -ForegroundColor Yellow
$slide14 = $pres.Slides.Add(14, [Microsoft.Office.Core.PpSlideLayout]::ppLayoutBlank)
Add-Background $slide14 $COLOR_BG

Add-TextBox $slide14 "成果与未来方向" 60, 30, 840, 50, 32, $COLOR_TEXT, $true, "left"
Add-TextBox $slide14 "已完成核心闭环，未来持续扩展" 60, 80, 840, 30, 14, $COLOR_MUTED, $false, "left"

$sepLine = $slide14.Shapes.AddShape([Microsoft.Office.Core.MsoAutoShapeType]::msoShapeRectangle, 60, 120, 120, 2)
$sepLine.Fill.ForeColor.RGB = $COLOR_ORANGE
$sepLine.Line.Visible = [Microsoft.Office.Core.MsoTriState]::msoFalse

$results = @(
    @("已完成", "项目成果", @("三端系统：PC后台 + 手机 + 顾客扫码", "8大模块、AI日报、客户OneID", "菜品四象限、智能采购、Docker部署"), $COLOR_GREEN),
    @("量化", "量化目标", @("每日节省对账时间1.5小时", "损耗率从12%降至5%", "复购率提升20%"), $COLOR_ORANGE),
    @("未来", "未来扩展", @("连锁多店看板、供应链比价", "AI外呼召回、行业垂直方案", "MySQL替换、HTTPS域名"), $COLOR_BROWN)
)

for ($i = 0; $i -lt $results.Count; $i++) {
    $x = 60 + $i * 290
    $y = 140
    
    $card = Add-RoundedCard $slide14 $x, $y, 270, 350, $COLOR_CARD, [System.Drawing.Color]::FromArgb(224, 224, 224)
    Add-Tag $slide14 $results[$i][0] ($x + 15), ($y + 15), 70, 25, $results[$i][3]
    
    Add-TextBox $slide14 $results[$i][1] ($x + 15), ($y + 50), 240, 30, 18, $COLOR_TEXT, $true, "left"
    
    $contentText = ($results[$i][2] | ForEach-Object { "• $_" }) -join "`n"
    Add-TextBox $slide14 $contentText ($x + 15), ($y + 90), 240, 250, 13, $COLOR_MUTED, $false, "left"
}

# Slide 15: 结尾
Write-Host "创建结尾页..." -ForegroundColor Yellow
$slide15 = $pres.Slides.Add(15, [Microsoft.Office.Core.PpSlideLayout]::ppLayoutBlank)

$bg15 = $slide15.Shapes.AddShape([Microsoft.Office.Core.MsoAutoShapeType]::msoShapeRectangle, 0, 0, 960, 540)
$bg15.Fill.ForeColor.RGB = $COLOR_ORANGE
$bg15.Line.Visible = [Microsoft.Office.Core.MsoTriState]::msoFalse
$bg15.ZOrder([Microsoft.Office.Core.MsoZOrderCmd]::msoSendToBack)

$blob1 = $slide15.Shapes.AddShape([Microsoft.Office.Core.MsoAutoShapeType]::msoShapeOval, 600, -50, 400, 280)
$blob1.Fill.ForeColor.RGB = [System.Drawing.Color]::FromArgb(255, 176, 136)
$blob1.Fill.Transparency = 0.25
$blob1.Line.Visible = [Microsoft.Office.Core.MsoTriState]::msoFalse

$blob2 = $slide15.Shapes.AddShape([Microsoft.Office.Core.MsoAutoShapeType]::msoShapeOval, -50, 350, 350, 220)
$blob2.Fill.ForeColor.RGB = [System.Drawing.Color]::FromArgb(168, 216, 160)
$blob2.Fill.Transparency = 0.3
$blob2.Line.Visible = [Microsoft.Office.Core.MsoTriState]::msoFalse

Add-TextBox $slide15 "感谢聆听" 80, 160, 800, 100, 56, $COLOR_WHITE, $true, "center"

$line15 = $slide15.Shapes.AddShape([Microsoft.Office.Core.MsoAutoShapeType]::msoShapeRectangle, 280, 280, 400, 2)
$line15.Fill.ForeColor.RGB = $COLOR_WHITE
$line15.Line.Visible = [Microsoft.Office.Core.MsoTriState]::msoFalse

Add-TextBox $slide15 "餐小助 · 让AI帮你盯店，你只管做好菜" 80, 310, 800, 50, 22, [System.Drawing.Color]::FromArgb(255, 224, 208), $false, "center"

# ==================== 保存文件 ====================
Write-Host "正在保存PPTX文件..." -ForegroundColor Green
$pres.SaveAs($OutputFile, [Microsoft.Office.Core.PpSaveAsFileType]::ppSaveAsPresentation)
$pres.Close()
$ppt.Quit()

Write-Host "PPTX文件已成功生成: $OutputFile" -ForegroundColor Green
Write-Host "文件大小: $((Get-Item $OutputFile).Length) bytes" -ForegroundColor Green
Write-Host "幻灯片数量: 15页" -ForegroundColor Green
Write-Host "`n完成！文件可以正常打开。" -ForegroundColor Green
