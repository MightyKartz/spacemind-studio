# Revit 转 JSON Windows Add-in 开发方案

日期：2026-05-12  
项目：商业空间 AI 头脑风暴工具  
目标平台：Windows + Autodesk Revit  
目标产物：可安装的 C# Revit Add-in，用于将 `.rvt` 项目中的空间要素导出为标准 JSON，供网页端 AI 方案生成、案例库检索和后续编辑使用。

## 1. 项目目标

开发一个 Windows 环境可安装的 Revit Add-in，让用户在 Revit 中打开项目后，通过插件按钮将当前项目或指定平面视图导出为“商业空间 AI 头脑风暴工具”的标准空间 JSON。

插件第一阶段不负责 AI 生成，也不负责网页编辑，只负责稳定、可追溯地把 Revit 数据转换为产品可用的结构化 JSON。

核心目标：

- 能在 Revit 插件菜单中看到“商业空间 AI”工具入口。
- 能选择当前视图或指定平面视图导出。
- 能提取墙、柱、门、窗、房间、面积、家具、文字、填充区域、标注线等要素。
- 能统一单位为 `mm`。
- 能输出符合产品 schema 的 JSON 文件。
- 能保留 Revit 元素 ID、UniqueId、类别、族、类型、参数，方便追溯。
- 能在导出后生成日志和错误报告。
- 后期同一套导出逻辑可迁移到 Autodesk APS Design Automation for Revit。

## 2. 为什么需要定制开发

现成工具如 Speckle、IFC 导出、Dynamo 脚本可以作为参考，但不能直接满足本项目需求。

原因：

- 本项目需要的是“商业空间方案生成 JSON”，不是通用 BIM 数据。
- AI 生成需要明确的建筑边界、入口、人流、后场、可设计区域、家具和功能表达。
- Revit 原生元素与产品业务概念之间需要转换规则。
- 需要为网页编辑器输出稳定的坐标、图层、样式和语义标签。
- 后续还要记录用户选择、修改和案例复用，JSON schema 必须由产品控制。

因此建议编写专用 C# Revit Add-in。

## 3. 版本兼容策略

Revit 插件通常需要针对不同 Revit 主版本分别编译，因为 `RevitAPI.dll`、`RevitAPIUI.dll` 和运行时存在版本差异。

建议支持版本：

| Revit 版本 | .NET 目标 | 备注 |
| --- | --- | --- |
| Revit 2024 | .NET Framework 4.8 | 旧版企业项目仍常见 |
| Revit 2025 | .NET 8 | Autodesk 官方说明 Revit 2025 已迁移到 .NET 8 |
| Revit 2026 | .NET 8 目标优先，按本机 SDK 验证 | 构建时以对应版本 RevitAPI 为准 |

工程建议：

```text
CommercialSpaceAI.RevitExporter/
  src/
    CommercialSpaceAI.RevitExporter.Core/       # 与 Revit 无关的 JSON schema、几何、序列化逻辑
    CommercialSpaceAI.RevitExporter.Revit2024/  # net48，引用 Revit 2024 API
    CommercialSpaceAI.RevitExporter.Revit2025/  # net8.0-windows，引用 Revit 2025 API
    CommercialSpaceAI.RevitExporter.Revit2026/  # net8.0-windows，引用 Revit 2026 API
  installer/
  samples/
  docs/
```

核心导出逻辑尽量放在 `Core`，各 Revit 版本项目只做 API 适配，减少重复开发。

## 4. 安装方式

Revit Add-in 通过 `.addin` manifest 注册。Autodesk 官方文档说明，Revit 会在启动时自动读取放在 ProgramData 或用户 AppData Addins 目录下的 `.addin` 文件。

推荐安装到全局目录：

```text
C:\Program Files\CommercialSpaceAI\RevitExporter\
  CommercialSpaceAI.RevitExporter.dll
  CommercialSpaceAI.RevitExporter.Core.dll
  Newtonsoft.Json.dll 或 System.Text.Json 依赖
  assets\
  config\

C:\ProgramData\Autodesk\Revit\Addins\2025\
  CommercialSpaceAI.RevitExporter.addin
```

也支持仅当前用户安装：

```text
%AppData%\Autodesk\Revit\Addins\2025\
  CommercialSpaceAI.RevitExporter.addin
```

实际路径需要按 Revit 版本生成：

```text
C:\ProgramData\Autodesk\Revit\Addins\2024\
C:\ProgramData\Autodesk\Revit\Addins\2025\
C:\ProgramData\Autodesk\Revit\Addins\2026\
```

## 5. `.addin` manifest 示例

```xml
<?xml version="1.0" encoding="utf-8" standalone="no"?>
<RevitAddIns>
  <AddIn Type="Application">
    <Name>CommercialSpaceAI</Name>
    <Assembly>C:\Program Files\CommercialSpaceAI\RevitExporter\CommercialSpaceAI.RevitExporter.Revit2025.dll</Assembly>
    <AddInId>8F71B263-2B5D-4B09-9B2E-4F11C7FA2A10</AddInId>
    <FullClassName>CommercialSpaceAI.RevitExporter.App</FullClassName>
    <VendorId>CSAI</VendorId>
    <VendorDescription>Commercial Space AI</VendorDescription>
  </AddIn>
</RevitAddIns>
```

插件启动后由 `IExternalApplication` 创建 Ribbon 面板和按钮，按钮调用 `IExternalCommand`。

## 6. 用户使用流程

```text
用户安装插件
  ↓
打开 Revit 项目
  ↓
进入“商业空间 AI”Ribbon 面板
  ↓
点击“导出空间 JSON”
  ↓
选择导出范围：当前视图 / 指定平面视图 / 整个项目
  ↓
选择导出内容：建筑骨架 / 家具 / 标注 / 填充区域 / 房间 / 全部
  ↓
选择输出位置
  ↓
插件执行导出
  ↓
生成 .json、preview.png、export-log.txt
  ↓
用户上传 JSON 到网页端，或插件直接调用 API 上传
```

第一版建议先做本地文件导出；第二版再做“导出后自动上传到云端项目库”。

## 7. 插件功能模块

### 7.1 Ribbon UI

Ribbon Tab：

```text
商业空间 AI
```

Panel：

```text
图纸导出
```

按钮：

- 导出空间 JSON
- 导出当前视图
- 打开导出设置
- 查看导出日志

### 7.2 导出设置窗口

建议用 WPF 实现。

设置项：

- Revit 视图选择
- 导出单位：默认 `mm`
- 是否只导出当前视图可见元素
- 是否导出 2D 标注
- 是否导出房间/面积
- 是否导出家具族
- 是否导出填充区域
- 是否导出预览图
- 输出目录
- 是否脱敏项目路径和用户名
- 是否自动上传到 API

### 7.3 数据提取模块

通过 `FilteredElementCollector` 按类别提取。

优先类别：

```text
OST_Walls
OST_Doors
OST_Windows
OST_Columns
OST_StructuralColumns
OST_Rooms
OST_Areas
OST_Furniture
OST_GenericModel
OST_Casework
OST_PlumbingFixtures
OST_LightingFixtures
OST_TextNotes
OST_Dimensions
OST_Lines
OST_FilledRegion
```

第一版重点：

- 墙体中心线和厚度
- 柱子位置和包围盒
- 门窗位置、宽度、朝向
- 房间边界和面积
- 家具族实例位置、旋转、族名、类型名
- 文字标注内容和位置
- 填充区域边界和样式
- 当前视图比例、裁剪框、方向

### 7.4 几何转换模块

Revit 内部长度单位为英尺，导出时统一转换为毫米。

需要处理：

- `XYZ` 转二维坐标 `[x, y]`
- `Curve` 转 line/arc/polyline
- `BoundingBoxXYZ` 转矩形或多边形
- `Room.GetBoundarySegments()` 转房间 polygon
- 门窗 host wall 和 opening 关系
- 族实例 transform、rotation、symbol 信息
- 当前视图坐标系到网页画布坐标系的转换

坐标建议：

- 原始 Revit 坐标保留为 `revitCoordinates`
- 网页编辑坐标输出为 `canvasCoordinates`
- 默认以导出视图 crop box 左下角作为 `(0, 0)`
- 单位统一为 `mm`

### 7.5 语义识别模块

Revit 元素本身不会知道“沿街入口”“后场”“社交区”。插件只能做初步推断，最终仍需用户在网页端确认。

可初步推断：

- 门宽较大且靠外轮廓的门：候选入口
- 名称包含“后场 / 储藏 / 设备 / 厨房 / BOH”的房间：候选后场
- 黑色结构柱或结构类别：固定障碍物
- Room/Area 名称：功能区初始标签
- TextNote 中包含“入口 / 人流 / 后场 / 商场 / 沿街”等关键词：语义提示

输出中应标记 `confidence`，不要直接当成最终事实。

## 8. JSON 输出 schema 草案

```json
{
  "schemaVersion": "0.1.0",
  "source": {
    "application": "Autodesk Revit",
    "revitVersion": "2025",
    "documentTitle": "sample.rvt",
    "exportedAt": "2026-05-12T12:00:00+08:00",
    "exporterVersion": "0.1.0"
  },
  "units": "mm",
  "view": {
    "id": 12345,
    "name": "Level 1 - Floor Plan",
    "scale": 50,
    "origin": [0, 0],
    "cropBox": [[0, 0], [22000, 9000]]
  },
  "site": {
    "boundary": [],
    "grossArea": null,
    "candidateEntrances": []
  },
  "elements": {
    "walls": [],
    "columns": [],
    "doors": [],
    "windows": [],
    "rooms": [],
    "areas": [],
    "furniture": [],
    "fixtures": [],
    "filledRegions": [],
    "textNotes": [],
    "detailLines": [],
    "dimensions": []
  },
  "semanticHints": [],
  "warnings": [],
  "rawRefs": {
    "elementIds": [],
    "uniqueIds": []
  }
}
```

### 8.1 墙体示例

```json
{
  "id": "wall_123",
  "revitElementId": 123,
  "uniqueId": "abcd-...",
  "category": "Walls",
  "typeName": "Basic Wall 200mm",
  "centerline": [[1000, 2000], [8000, 2000]],
  "thickness": 200,
  "height": 3000,
  "isStructural": false,
  "sourceViewVisible": true
}
```

### 8.2 门示例

```json
{
  "id": "door_456",
  "revitElementId": 456,
  "familyName": "Single-Flush",
  "typeName": "900 x 2100",
  "location": [3200, 2000],
  "width": 900,
  "height": 2100,
  "rotation": 90,
  "hostWallId": "wall_123",
  "fromRoom": "room_sales",
  "toRoom": null,
  "semantic": {
    "candidateEntrance": true,
    "confidence": 0.64
  }
}
```

### 8.3 房间示例

```json
{
  "id": "room_789",
  "revitElementId": 789,
  "name": "营业区",
  "number": "101",
  "area": 200000000,
  "polygon": [[0, 0], [22000, 0], [22000, 9000], [0, 9000]],
  "boundarySource": "Room.GetBoundarySegments",
  "semanticTags": ["sales_area"]
}
```

## 9. C# 工程技术选型

### 9.1 语言和框架

- C#
- Revit API
- WPF
- `System.Text.Json` 或 `Newtonsoft.Json`
- Serilog 或简单文件日志

### 9.2 项目结构

```text
CommercialSpaceAI.RevitExporter.Core
  Models/
  Serialization/
  Geometry/
  Schema/

CommercialSpaceAI.RevitExporter.Revit2025
  App.cs
  Commands/
    ExportSpaceJsonCommand.cs
  Services/
    RevitElementCollector.cs
    RevitGeometryConverter.cs
    ViewExportService.cs
    RoomBoundaryExtractor.cs
  UI/
    ExportSettingsWindow.xaml
  Resources/
    icon32.png
    icon16.png
```

### 9.3 事务策略

导出原则上只读，不应修改 Revit 文档。

命令标记：

```csharp
[Transaction(TransactionMode.ReadOnly)]
public class ExportSpaceJsonCommand : IExternalCommand
{
    public Result Execute(
        ExternalCommandData commandData,
        ref string message,
        ElementSet elements)
    {
        // Export logic
    }
}
```

如果后续加入“给元素写回参数”“标记已导出”等能力，再使用 `TransactionMode.Manual` 并严格控制事务。

## 10. 安装包方案

### 10.1 早期开发安装

使用 PowerShell 脚本：

```text
install-dev.ps1
```

功能：

- 检测已安装 Revit 版本。
- 复制 DLL 到 Program Files 或本地开发目录。
- 生成对应版本 `.addin` 文件。
- 写入 `%ProgramData%\Autodesk\Revit\Addins\{version}`。

### 10.2 对外安装包

推荐：

- Inno Setup：轻量，适合早期交付。
- WiX Toolset：更适合企业级 MSI。

安装包功能：

- 检测 Revit 2024/2025/2026。
- 让用户选择安装到哪些 Revit 版本。
- 复制对应版本 DLL。
- 写入 `.addin` manifest。
- 创建卸载项。
- 卸载时删除 manifest 和插件目录。

### 10.3 安装目录建议

```text
C:\Program Files\CommercialSpaceAI\RevitExporter\
  2024\
  2025\
  2026\
  shared\
  logs\
```

manifest 中的 Assembly 路径指向对应版本 DLL。

## 11. 错误处理与日志

导出时常见问题：

- 当前没有打开项目文档。
- 当前视图不是平面视图。
- 房间没有闭合边界。
- 某些族没有可解析几何。
- 项目单位或坐标异常。
- 中文字体或文字编码问题。
- 元素数量过大导致导出很慢。

日志文件：

```text
%LocalAppData%\CommercialSpaceAI\RevitExporter\logs\
  export-2026-05-12-120000.log
```

JSON 中也应包含 `warnings`：

```json
{
  "warnings": [
    {
      "code": "ROOM_BOUNDARY_MISSING",
      "message": "Room 101 has no closed boundary.",
      "revitElementId": 789
    }
  ]
}
```

## 12. 性能目标

第一版目标：

- 200-500㎡ 商业空间：10 秒内导出。
- 500-2000㎡ 空间：30 秒内导出。
- 大型项目：允许 1-3 分钟，但需要进度条和可取消。

优化策略：

- 默认只导出当前视图可见元素。
- 避免导出完整 3D mesh。
- 家具优先导出包围盒和符号信息，而不是复杂三角网。
- 使用 ElementId/UniqueId 做引用，减少重复数据。
- 对族类型信息去重。

## 13. 安全与隐私

需要支持：

- 本地导出，不强制联网。
- 自动上传开关默认关闭。
- 可脱敏项目路径、用户名、机器名。
- 可配置只导出几何和业务字段，不导出完整参数。
- 日志不记录敏感模型路径或客户名称，除非用户打开 debug 模式。

## 14. 与云端系统的接口

第一版本地导出：

```text
Revit Add-in -> local JSON file -> Web App upload
```

第二版自动上传：

```text
Revit Add-in -> HTTPS API -> Object Storage + Database
```

API 示例：

```http
POST /api/revit/imports
Authorization: Bearer <token>
Content-Type: multipart/form-data

files:
  modelJson: export.json
  previewImage: preview.png
fields:
  projectName
  revitVersion
  exporterVersion
```

后端返回：

```json
{
  "importId": "imp_001",
  "projectId": "proj_001",
  "status": "processed",
  "webUrl": "https://app.example.com/projects/proj_001"
}
```

## 15. 与 APS 云端转换的关系

本地 Revit Add-in 和 APS 云端转换应复用同一套核心导出逻辑。

阶段路线：

1. 先做本地 Revit Add-in，便于开发、调试和验证 schema。
2. 稳定后把导出命令封装为可由 `RevitCoreConsole` 调用的入口。
3. 打包为 APS Design Automation AppBundle。
4. 后端创建 WorkItem，让云端 Revit 打开 RVT 并运行同一导出逻辑。

这样可以避免本地插件和云端转换结果不一致。

## 16. 开发里程碑

### 第 1 周：工程骨架

- 建立 solution 和多版本项目结构。
- 配置 Revit API 引用。
- 创建 Ribbon 和按钮。
- 完成 `.addin` manifest。
- 实现 Hello Export 命令。

### 第 2 周：基础元素导出

- 导出墙、柱、门、窗。
- 单位转换为 mm。
- 输出基础 JSON。
- 保存日志。

### 第 3 周：房间和视图导出

- 导出 Room/Area 边界。
- 导出当前视图信息、裁剪框、比例。
- 建立画布坐标系。
- 输出 preview metadata。

### 第 4 周：家具、标注和填充区域

- 导出家具族实例。
- 导出 TextNote、DetailLine、FilledRegion。
- 输出语义 hints。
- 加入 warnings。

### 第 5 周：UI 和设置

- WPF 导出设置窗口。
- 视图选择。
- 导出内容勾选。
- 输出目录选择。
- 进度和错误提示。

### 第 6 周：安装包和测试

- PowerShell 开发安装脚本。
- Inno Setup 或 WiX 安装包。
- 测试 Revit 2024/2025/2026。
- 准备样例 RVT 和导出 JSON。
- 编写用户安装说明。

## 17. 测试计划

测试文件类型：

- 简单矩形铺位。
- 长条双入口商业空间。
- 有柱网空间。
- 有后场和设备间空间。
- 含复杂家具族空间。
- 含中文文字标注和填充区域空间。
- Room 未闭合或缺失空间。

测试指标：

- 插件能被 Revit 正确加载。
- Ribbon 按钮正常显示。
- 当前视图导出不报错。
- JSON 能被网页端 schema validator 通过。
- 单位正确。
- 房间边界方向一致。
- 门窗位置与墙体关系正确。
- 中文内容不乱码。
- 卸载后 Revit 不再加载插件。

## 18. 交付物

开发交付：

- C# source code
- Visual Studio solution
- Revit 2024/2025/2026 构建产物
- `.addin` manifest 模板
- PowerShell 安装脚本
- Windows 安装包
- JSON schema 文档
- 示例 RVT 导出 JSON
- 用户安装说明
- 开发者维护说明

## 19. 风险与应对

风险：不同 Revit 版本 API 差异  
应对：按版本分别编译，核心逻辑抽到共享项目。

风险：房间边界不闭合  
应对：输出 warning，网页端允许用户手动补边界。

风险：家具族形态复杂  
应对：第一版只导出位置、旋转、包围盒、族名和类型名。

风险：2D 视图表达和 BIM 元素不一致  
应对：同时导出模型元素和视图元素，并标记来源。

风险：用户希望自动识别“入口/后场/功能区”  
应对：插件只输出候选语义和置信度，最终在网页端确认。

风险：安装权限不足  
应对：支持 ProgramData 全局安装和 AppData 当前用户安装两种模式。

## 20. 官方参考

- Autodesk Revit API Add-in Registration: https://help.autodesk.com/cloudhelp/2024/ENU/Revit-API/files/Revit_API_Developers_Guide/Introduction/Add_In_Integration/Revit_API_Revit_API_Developers_Guide_Introduction_Add_In_Integration_Add_in_Registration_html.html
- Autodesk Revit 2025 .NET 8 Upgrade: https://help.autodesk.com/cloudhelp/2025/ENU/Revit-WhatsNew/files/GUID-50024FD2-16BE-40BE-96E6-550294D9537D.htm
- Speckle Revit Connector 参考: https://docs.speckle.systems/connectors/revit/revit
- Revit JSON geometry export 示例: https://github.com/jeremytammik/ExportSymbolInstanceGeo

