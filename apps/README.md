# Web MVP Scaffold

这是“商业空间 AI 头脑风暴工具”的第一版 Web/API 骨架。

## 运行

```text
npm run dev
```

默认地址：

```text
http://127.0.0.1:4173
```

## 当前包含

- 原生 Node HTTP API
- 静态 Web 工作台
- schema 示例读取
- 健康检查接口
- 项目创建、图纸上传、本地持久化
- 锁定图纸底图画布：上传图片/PDF 后可缩放、平移、复位和调整透明度
- 手动图纸确认：绘制可设计边界，标记入口、人流权重、柱子和后场，并写回 Project JSON
- 可编辑方案 JSON：按项目创建、读取、编辑和保存 Scheme JSON
- 案例库种子导入：将 `samples/seed-cases.json` 导入本地案例库并在 AI 面板中查看参考案例
- 相似案例检索：用本地特征向量/规则 RAG 为当前项目检索 Top N reference cases，不调用外部付费 embedding API
- 策略生成管线：基于 Project JSON、brief 和相似案例生成 3-8 个策略草案，并输出可替换为真实 LLM 的 prompt messages
- 策略转 Scheme JSON：将选中的 AI 策略草案转换为 schema-valid 方案 JSON，写入 `.data/schemes.json` 并载入编辑器
- 方案评分卡：展示综合分、五项评分条、策略解释、概念标签、引用数量和校验风险
- 基础边界裁剪：策略生成的功能区会先按项目可设计边界进行多边形裁剪，再写入 Scheme JSON
- 家具基础校验：生成家具尺寸盒并检查同区重叠、净距不足和家具越出所属功能区
- 门洞与柱子约束：检查家具是否占用入口净空或与结构柱范围冲突
- JSON 编辑版本流：方案编辑器支持撤销、重做、保存 JSON 和保存版本快照
- 导出包：支持 Scheme JSON、SVG、DXF、PNG 和摘要 PDF 导出
- Revit JSON 导入：上传 `.json` 时可将 Revit Import JSON 转换为待确认的 Project JSON
- 功能区、AI 方案侧栏的可运行 UI 骨架

## API

- `GET /api/health`
- `GET /api/schemas`
- `GET /api/sample/project`
- `GET /api/sample/scheme`
- `GET /api/cases`
- `GET /api/cases/:caseId`
- `GET /api/strategy-runs/:runId`
- `GET /api/projects`
- `GET /api/projects/:projectId`
- `GET /api/projects/:projectId/retrieve-cases`
- `GET /api/projects/:projectId/schemes`
- `GET /api/uploads/:uploadId`
- `GET /api/schemes/:schemeId`
- `GET /api/schemes/:schemeId/versions`
- `GET /api/schemes/:schemeId/export/:format` (`json`, `svg`, `dxf`, `pdf`)
- `POST /api/uploads`
- `POST /api/cases`
- `POST /api/cases/import-seed`
- `POST /api/cases/retrieve`
- `POST /api/strategies/generate`
- `POST /api/strategies/:runId/schemes`
- `POST /api/schemes/from-strategy`
- `POST /api/geometry/validate-furniture`
- `POST /api/geometry/validate-constraints`
- `POST /api/schemes/:schemeId/versions`
- `POST /api/projects`
- `POST /api/projects/from-revit-import`
- `POST /api/projects/:projectId/generate-strategies`
- `POST /api/projects/:projectId/retrieve-cases`
- `POST /api/projects/:projectId/schemes`
- `PATCH /api/projects/:projectId`
- `PATCH /api/schemes/:schemeId`

## 本地数据

开发环境会写入：

```text
.data/
  cases.json
  projects.json
  schemes.json
  strategy-runs.json
  uploads/
```

`.data` 是本地开发持久化目录，后续可替换为数据库和对象存储。
