# 导出包 v0

日期：2026-06-17  
任务：Confirm output package: PDF, PNG, SVG, DXF, JSON

## 导出目标

导出包需要同时满足三类使用场景：

- 客户汇报：PDF、PNG
- 视觉编辑：SVG
- 专业设计工作流：DXF
- 系统继续编辑：JSON

## 标准导出包结构

```text
project_export/
  manifest.json
  report.pdf
  preview.png
  plan.svg
  plan.dxf
  scheme.json
  project.json
  assets/
    preview-thumb.png
```

## 文件用途

### PDF

用途：

- 客户汇报
- 方案评审
- 微信或邮件发送

要求：

- A3 或 A2 版式可选。
- 包含图例、方案说明、评分、日期和项目名称。
- 字体嵌入或转曲，避免中文缺字。

### PNG

用途：

- 快速预览
- 微信沟通
- 缩略图

要求：

- 默认导出 2x 分辨率。
- 背景和半透明色块应正确渲染。
- 文件名包含方案名和版本。

### SVG

用途：

- Figma
- Adobe Illustrator
- Inkscape
- 网页展示

要求：

- 图层分组清晰。
- 避免复杂滤镜。
- 尽量保留文字为 text，同时提供可选文字转轮廓版本。
- 功能区色块、动线、标注、家具符号都应可编辑。

### DXF

用途：

- AutoCAD
- Revit link/import
- Rhino
- SketchUp Pro
- Vectorworks/Archicad
- QCAD/LibreCAD

要求：

- 单位为 `mm`。
- 使用尽量通用的 DXF 实体：`LINE`、`LWPOLYLINE`、`TEXT/MTEXT`、`HATCH`、`INSERT`。
- 图层命名稳定。
- 家具尽量使用 block。
- 中文文字提供字体说明或转轮廓/线版本。

建议图层：

```text
CSAI-WALL
CSAI-FIXED
CSAI-ZONE
CSAI-FURNITURE
CSAI-FLOW
CSAI-TEXT
CSAI-DIM
CSAI-LEGEND
```

### JSON

用途：

- 回到系统继续编辑
- 案例库沉淀
- AI 再生成
- 版本追踪

要求：

- `project.json` 通过 `schemas/project.schema.json`。
- `scheme.json` 通过 `schemas/scheme.schema.json`。
- manifest 记录导出时间、版本、文件清单。
- JSON 是唯一真源，PDF/PNG/SVG/DXF 必须从同一份 `scheme.json` 生成。

## manifest 示例

```json
{
  "schemaVersion": "0.1.0",
  "projectId": "proj_001",
  "schemeId": "scheme_001",
  "exportedAt": "2026-06-17T12:00:00+08:00",
  "files": [
    "report.pdf",
    "preview.png",
    "plan.svg",
    "plan.dxf",
    "scheme.json",
    "project.json"
  ]
}
```

## 导出验收

- PDF 可以打开且中文正常。
- PNG 与画布预览一致。
- SVG 可以被浏览器和 Figma/Illustrator 读取。
- DXF 可以被 AutoCAD/QCAD 打开并保持图层。
- JSON 可以被系统重新导入。
- JSON/SVG/DXF 中同一元素保持 stable id。
- 坐标、单位、原点、比例尺写入 `manifest.json`。
- 导出前跑几何校验；硬错误阻止导出，软错误写入 warnings。
- PDF/PNG/SVG/DXF 的边界、入口、柱子、功能区必须通过 overlay 对齐测试。
