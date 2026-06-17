# Revit MCP + DWG 导入项目可行性分析

日期：2026-04-27

## 结论

开发一个 Revit MCP，并接入 Hermes 或 OpenClaw，让 agent 正确操作 Revit 导入或链接 DWG 文件，是可行的。

但建议不要定位成“全能 Revit agent”。更好的切入点是做一个窄而硬的垂直工具：

> 把一个 DWG 安全、可追踪、可回滚地链接或导入到指定 Revit 视图，并自动校验结果。

原因是通用 Revit MCP 已经有社区项目，Autodesk 也开始推进官方 MCP server；但“DWG 正确导入 Revit”这件事仍然有明确痛点，且需要较强工程化能力。

## 是否已经有类似项目

已经有类似项目，但还没有看到一个足够成熟、专门解决 DWG 导入正确性的产品化方案。

现有方向包括：

- 社区 Revit MCP 项目：`revit-mcp` 已经采用 MCP server + Revit plugin + commandset 的架构，支持 AI 查询、创建、修改 Revit 元素。
- pyRevit 路线：适合快速做 Revit 内部自动化原型，也有 pyRevit-oriented MCP 项目。
- Autodesk 官方方向：Autodesk 已经有 Autodesk MCP Servers 页面，并明确提到 Autodesk Revit MCP Server。

这些说明“AI 通过 MCP 操作 Revit”方向是成立的。但如果只是再做一个泛用 Revit MCP，差异化不强。

## 官方 API 可行性

Revit 官方 API 支持 DWG/DXF 导入。

关键 API：

```csharp
Document.Import(
    string file,
    DWGImportOptions options,
    View pDBView,
    out ElementId elementId
)
```

`DWGImportOptions` 支持与 DWG 导入相关的参数，例如：

- 单位
- 放置方式
- 是否仅当前视图可见
- 颜色模式
- 是否仅导入可见图层
- 图层选择
- 自定义比例
- 参考点

如果要做“链接”而非“导入”，可使用 `ImportInstance.Create(...)` 创建 DWG/DXF link。实际产品中应优先支持 link，因为它更适合外部 DWG 后续更新，也更不容易把 Revit 文件污染得过重。

## 推荐架构

```text
Hermes / OpenClaw
  -> Revit MCP Server
  -> localhost WebSocket / Named Pipe / HTTP bridge
  -> Revit C# Add-in
  -> ExternalEvent queue
  -> Revit API Transaction
  -> Document.Import / ImportInstance.Create
```

关键设计点：

- 不建议让 agent 点击 Revit UI。
- 不建议开放任意 C# 代码执行作为主要能力。
- 应把 DWG 导入/链接封装成强 schema 的确定性 MCP tools。
- Revit API 调用必须发生在 Revit 合法 API context 内，建议用 `ExternalEvent` 队列。
- 每次导入/链接操作都应有事务、日志、结果校验和回滚能力。

## 建议的 MCP Tools

第一版不要做太多工具，先做 5-6 个高价值工具：

```text
get_revit_status
list_candidate_views
preflight_dwg_import
link_dwg_to_view
import_dwg_to_view
rollback_last_dwg_operation
```

示例 tool input：

```json
{
  "file_path": "D:/cad/site.dwg",
  "mode": "link",
  "view_name": "Level 1",
  "this_view_only": true,
  "placement": "origin_to_origin",
  "unit": "millimeters",
  "visible_layers_only": true,
  "layers": ["A-WALL", "A-DOOR"],
  "color_mode": "black_and_white"
}
```

## 开发难度

### POC 难度：低到中

预计 1-2 周可以完成一个能跑的 demo：

- C# Revit Add-in
- MCP server
- 本地通信 bridge
- 调用 `Document.Import` 或 `ImportInstance.Create`
- 返回 ElementId 和基础结果

### MVP 难度：中

预计 4-8 周可以完成一个有实际试用价值的 MVP：

- View 选择
- 单位、placement、ThisViewOnly、颜色、图层参数
- DWG preflight
- Revit transaction
- 错误结构化返回
- 基础日志
- 用户确认机制
- 导入后检查

### 生产级难度：中高

真正难点不在 API 调用，而在可靠性：

- Revit API 只能在合法 API context 中执行。
- 要支持 Revit 2024/2025/2026 等版本差异。
- Revit 2025 之后为 .NET 8，旧插件需要重新编译或多目标支持。
- DWG 文件可能有单位、坐标、外部参照、图层、线型、字体、范围过大等问题。
- 导入失败后不能污染模型。
- 要避免 agent 执行高风险或不可逆操作。
- 企业环境中还要考虑安装、权限、审计、安全和 BIM 标准。

## 开发意义

如果只是做“又一个通用 Revit MCP”，意义一般。

如果做成“AI 驱动的 DWG Intake / CAD-to-Revit 导入校验助手”，意义较大。

真实 BIM 工作里，DWG 导入常见痛点包括：

- 单位错
- 坐标飞远
- 导入到错误视图
- Link 和 Import 选错
- 图层和线宽混乱
- DWG 外部参照丢失
- CAD 文件污染 Revit 模型
- 导入后看不见，用户不知道问题在哪
- 没有审计记录和回滚点

有价值的不是“agent 能操作 Revit”，而是“agent 操作 Revit 时不会搞坏模型”。

## 项目前景

中短期有机会，尤其适合以下场景：

- BIM 团队
- 建筑事务所
- 施工图协同
- CAD 历史资料迁移
- Revit 标准化导入流程
- 企业内部 BIM 自动化工具链

长期看，通用 Revit MCP 会被官方和社区逐步商品化；但垂直工作流仍有空间。

更有前景的方向是：

- DWG 预检
- 导入参数推荐
- 执行导入/链接
- 导入后可见性和坐标校验
- 自动生成导入报告
- 回滚和审计
- 团队 BIM 标准 enforcement

## 产品定位建议

推荐定位：

> AI-assisted DWG Intake for Revit

或中文：

> Revit DWG 智能导入与校验助手

不要一开始做：

- 自动建全模型
- 全能 Revit agent
- 让 agent 任意执行 C# 代码
- 复杂 BIM 设计决策

优先做：

- 安全导入
- 正确导入
- 可解释导入
- 可回滚导入
- 符合团队标准的导入

## 推荐路线

1. 先做 C# Revit Add-in 骨架。
2. 用 `ExternalEvent` 实现 Revit API 请求队列。
3. 做本地 bridge，优先 WebSocket 或 Named Pipe。
4. MCP server 只暴露强 schema tools。
5. 第一批只支持 DWG link/import。
6. 做 preflight 和 postflight 校验。
7. 接入 Hermes/OpenClaw。
8. 找真实 DWG 样本做测试集。
9. 再考虑扩展到 DXF、PDF、IFC、family 导入等。

## 风险

- Autodesk 官方 Revit MCP Server 后续可能覆盖部分通用能力。
- Revit API 版本兼容成本较高。
- 企业用户对模型安全要求高，需要审计和权限控制。
- DWG 质量不可控，很多问题来自 CAD 文件本身。
- 如果没有真实 BIM 工作流样本，容易做成 demo 而非产品。

## 总体建议

值得做，但要避开“泛用 Revit MCP”的拥挤方向。

最有价值的切入点是：

> 用 agent 帮 BIM 用户安全地完成 DWG 导入/链接决策、执行和校验。

这个方向既有明确痛点，也能利用 MCP/agent 的自然语言优势，同时又能通过强 schema 和 Revit Add-in 控制风险。

## 参考资料

- Autodesk Revit Platform API: https://help.autodesk.com/cloudhelp/2024/ENU/Revit-API/files/Revit_API_Developers_Guide/Introduction/Getting_Started/Welcome_to_the_Revit_Platform_API/Revit_API_Revit_API_Developers_Guide_Introduction_Getting_Started_Welcome_to_the_Revit_Platform_API_What_Can_You_Do_with_the_Revit_Platform_API_html.html
- Autodesk Document.Import DWG API: https://help.autodesk.com/view/RVT/2025/ENU/?guid=1b1413fd-1358-709b-77a8-e383d6c1301e
- Autodesk DWGImportOptions: https://help.autodesk.com/view/RVT/2025/ENU/?guid=6c0ea32b-6c2b-d096-08b7-365a3362020a
- Autodesk External Events: https://help.autodesk.com/cloudhelp/2024/ENU/Revit-API/files/Revit_API_Developers_Guide/Advanced_Topics/Revit_API_Revit_API_Developers_Guide_Advanced_Topics_External_Events_html.html
- Autodesk Revit SDK: https://help.autodesk.com/cloudhelp/2026/CHS/Revit-Customize/files/GUID-D7E8694D-7DB3-41CA-A0F3-AF64DC2DA015.htm
- Autodesk MCP Servers: https://www.autodesk.com/solutions/autodesk-ai/autodesk-mcp-servers
- revit-mcp GitHub organization: https://github.com/revit-mcp
- pyRevit: https://github.com/pyrevitlabs/pyRevit
- CAD and BIM Interoperability Guide: https://damassets.autodesk.net/content/dam/autodesk/www/products/autodesk-autocad/docs/pdf/CAD-and-BIM-Interoperability-Guide.pdf
