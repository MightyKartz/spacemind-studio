# JSON Schema v0

日期：2026-06-17  
任务：Freeze JSON schema v0 for project, scheme, case, and Revit import

## Schema 文件

- `schemas/project.schema.json`
- `schemas/scheme.schema.json`
- `schemas/case.schema.json`
- `schemas/revit-import.schema.json`

## 设计原则

- 所有长度单位默认 `mm`。
- 坐标采用二维画布坐标 `[x, y]`。
- 坐标必须是有限数字。
- polygon 必须至少 3 个点。
- polygon 不应自交，不应使用重复闭合点。
- 业务对象必须有稳定 `id`。
- 建议 ID 前缀：`proj_`、`scheme_`、`case_`、`imp_`、`zone_`、`furn_`、`wall_`、`door_`。
- Revit 导入对象必须保留 `revitElementId` 或 `uniqueId`，便于回溯。
- 关键对象应保留 `source`：`user`、`revit`、`dxf`、`svg`、`ai_strategy`、`geometry_engine`、`imported_case`。
- `confidence` 只用于导入和语义推断，不能替代用户确认。
- AI 输出必须是结构化 JSON，不允许只输出自然语言。
- LLM 可以生成 `strategy`、`intent`、`rationale`、`placementHints`，最终 geometry 必须由几何引擎或用户编辑产生并经过校验。

## 四类核心 JSON

### Project JSON

Project JSON 是项目事实源，保存图纸来源、场地边界、入口、人流、固定元素和用户 brief。

核心用途：

- 图纸确认页
- AI 生成入参
- 方案版本挂载
- 案例入库基础信息

### Scheme JSON

Scheme JSON 是一个可编辑方案，保存分区、家具、动线、文字、评分和校验结果。

核心用途：

- 方案卡片渲染
- 2D 编辑器
- 导出 PDF/PNG/SVG/DXF
- 最终方案入库

### Case JSON

Case JSON 是历史案例或最终方案沉淀后的检索对象。

核心用途：

- RAG 相似案例检索
- 模板复用
- 用户偏好学习
- 方案生成参考

### Revit Import JSON

Revit Import JSON 是 Revit Add-in 或 APS 转换后的输入。

核心用途：

- RVT 转项目 JSON
- 保留 BIM 元素追溯信息
- 支持人工确认边界与语义

## 验证规则

- `schemaVersion` 必须存在。
- `unit` 必须为 `mm`。
- `boundary` 和 `polygon` 坐标必须是数值数组。
- `entrances.trafficWeight` 范围为 `0-1`。
- `scores` 范围为 `0-10`。
- `scheme.validation.blockers` 为空时，方案才可标记为可导出。
- `source.type` 必须在允许枚举中。
- Revit 导入如果元素无法识别，应进入 `warnings`，不能静默丢弃。
- `generateCount` 范围为 `3-8`，MVP 默认 `3-6`。
- 入口 `trafficWeight` 总和应为 `1.0 ± 0.01`。
- `validation.overallStatus = fail` 时禁止导出或入库为高质量案例。
- 导入 Revit 后，边界、入口、人流、后场、柱子/不可动区域必须经用户确认。

## 版本策略

当前版本为 `0.1.0`。后续 schema 变更必须：

- 保持向后读取兼容，或提供 migration。
- 在 `schemaVersion` 中升级。
- 记录变更原因。
