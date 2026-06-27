# 代码库现状分析

日期：2026-06-27
范围：当前 `main` 分支代码、文档、Schema、Revit Add-in scaffold 和 Phase 6 任务看板。

## 结论

这是一个可演示的商业空间早期方案 MVP。它已经完成端到端闭环：导入图纸或 Revit Import JSON、确认空间约束、检索案例、生成策略草案、转换 Scheme JSON、基础几何校验、编辑版本、导出多种格式。

当前代码适合继续做 beta 验证，不适合直接作为生产 SaaS 上线。关键原因是：AI 生成仍是本地 deterministic pipeline，本地 `.data` JSON store 不是生产数据库，Revit Add-in 还没有 Windows/Revit 运行验证，几何和导出能力仍是 MVP 级。

## 项目身份

- 项目名称：商业空间 AI 头脑风暴工具 / SpaceMind Studio。
- 目标用户：商业空间设计团队、室内设计工作室、连锁品牌门店设计团队、商场招商/资产运营团队、办公 test-fit 团队。
- 主要价值：把铺位图和历史案例转化为多个可讨论、可编辑、可导出的功能落位方案。
- 明确不做：施工图自动生成、消防/审图/规范合规承诺、浏览器直接解析 `.rvt`、完整 BIM 生成、生产级多人协作。

## 技术栈

- 后端：原生 Node.js HTTP server，入口为 `apps/api/server.mjs`。
- 前端：无框架单页应用，入口为 `apps/web/index.html` 和 `apps/web/app.js`。
- 数据：本地 `.data/*.json` 文件和 `.data/uploads/` 文件夹。
- Schema：JSON Schema draft 2020-12。
- Revit：Windows C# Add-in，目标 Revit 2025，`net8.0-windows`。
- 验证：Node 语法检查和 Python `jsonschema` 校验脚本。

## 模块地图

| 区域 | 关键路径 | 职责 | 当前风险 |
| --- | --- | --- | --- |
| Web UI | `apps/web/index.html`, `apps/web/app.js`, `apps/web/styles.css` | 项目创建、底图显示、手动标注、案例/策略/Scheme UI、导出触发 | 单文件状态管理，后续复杂编辑会难维护 |
| API | `apps/api/server.mjs` | 静态服务、API 路由、本地存储、检索、策略、几何、导出 | 超过 2500 行，多个领域耦合在一个文件 |
| 数据合同 | `schemas/*.schema.json` | Project、Scheme、Case、Revit Import 四类 JSON 合同 | Schema 与运行时校验不是完全同一套机制 |
| 样例数据 | `samples/seed-cases.json`, `samples/schema-examples/*` | 20 个 seed cases 和 schema 示例 | seed cases 是演示质量，不能代表真实案例库 |
| Beta fixture | `docs/beta-validation-plan.md`, `samples/beta-fixtures/README.md` | 10 类真实/匿名 fixture 验证计划 | 还没有真实 fixture evidence |
| Revit Add-in | `revit-addin/**` | Revit 当前视图导出为 Revit Import JSON | 需要 Windows/Revit 2025 编译和运行验证 |
| 导出说明 | `docs/export-package-v0.md` | PDF/PNG/SVG/DXF/JSON 输出目标 | 代码中的 PDF/DXF 仍是 MVP 简化实现 |
| 多 agent 流程 | `AGENTS.md`, `TASK_BOARD.md`, `docs/multi-agent-goal-runbook.md` | 开发流程、阶段任务、PR 协议 | 依赖人工/agent 严格执行 |

## 主流程跟踪

### 1. 创建项目

前端读取上传文件并转 base64，然后调用 `/api/uploads`。成功后调用：

- 普通图纸：`POST /api/projects`
- Revit JSON：`POST /api/projects/from-revit-import`

后端会创建 Project JSON，写入 `.data/projects.json`。如果是 Revit Import JSON，会从元素中提取候选边界、入口和固定元素，然后要求用户继续确认。

### 2. 图纸确认

前端画布支持：

- 浏览和平移缩放。
- 绘制矩形边界。
- 点击添加入口和人流权重。
- 点击添加柱子。
- 拖拽矩形后场。

保存时调用 `PATCH /api/projects/:id`，更新 Project JSON 的 `site`。

当前限制：边界和后场是矩形优先的 MVP 行为，复杂多边形、吸附、撤销、图层管理还没有完整实现。

### 3. 案例检索

案例库通过 `POST /api/cases/import-seed` 导入 `samples/seed-cases.json`。检索调用 `/api/cases/retrieve`。

实现方式不是向量数据库，而是本地加权特征检索：

- 业态匹配。
- 面积区间。
- 空间形态。
- 入口模式。
- 人流模式。
- 后场比例。
- 柱网复杂度。
- brief/tag token 相似度。
- 案例质量分。

返回结果包含 score、matchedSignals、reason 和 referenceCaseIds。

### 4. 策略生成

`POST /api/strategies/generate` 会先检索相似案例，再构造 provider-ready prompt messages，然后使用内置策略模板生成 3-8 个策略。

当前 `pipeline` 明确标记为：

```json
{
  "provider": "local",
  "model": "strategy-prompt-pipeline-v0",
  "externalCost": false
}
```

这意味着当前没有任何外部 LLM API 调用。接入真实 LLM 前，需要保留当前 strategy-to-scheme 输出合同，并增加 provider adapter、输出校验、失败回退和成本确认。

### 5. Scheme JSON 生成

前端选择一个策略后调用 `/api/schemes/from-strategy`。后端会生成：

- zones
- furniture
- arrows
- annotations
- scores
- validation warnings

几何生成基于模板区块和项目边界。它会做基础边界裁剪、家具 zone containment、家具重叠检查、门洞净空检查、柱子碰撞检查。

当前限制：不支持复杂布局优化，不处理真实旋转家具碰撞，不承诺规范合规。

### 6. 编辑和版本

Web 端提供 JSON 编辑器，支持本地撤销/重做。保存调用 `PATCH /api/schemes/:id`。保存版本调用 `POST /api/schemes/:id/versions`，写入 `.data/scheme-versions.json`。

当前限制：没有版本恢复、diff 对比、多人协作，也没有视觉拖拽编辑 Scheme 元素。

### 7. 导出

后端支持：

- `GET /api/schemes/:id/export/json`
- `GET /api/schemes/:id/export/svg`
- `GET /api/schemes/:id/export/dxf`
- `GET /api/schemes/:id/export/pdf`

前端 PNG 导出是先请求 SVG，再在浏览器 canvas 中栅格化。

当前限制：PDF 是摘要 PDF，不是完整汇报版式；DXF 使用基础实体，需要 AutoCAD/QCAD/Rhino/Revit 等真实软件兼容性验证。

## API 清单

| API | 方法 | 作用 |
| --- | --- | --- |
| `/api/health` | GET | 健康检查 |
| `/api/schemas` | GET | 返回 Schema 路径 |
| `/api/sample/project` | GET | 示例 Project JSON |
| `/api/sample/scheme` | GET | 示例 Scheme JSON |
| `/api/uploads` | POST | 保存上传文件到 `.data/uploads` |
| `/api/uploads/:id` | GET | 读取已上传文件 |
| `/api/projects` | GET/POST | 列出或创建项目 |
| `/api/projects/:id` | GET/PATCH | 读取项目或更新 site 标注 |
| `/api/projects/from-revit-import` | POST | Revit Import JSON 转 Project JSON |
| `/api/projects/:id/schemes` | GET/POST | 读取或创建项目方案 |
| `/api/schemes/:id` | GET/PATCH | 读取或更新 Scheme JSON |
| `/api/schemes/:id/versions` | GET/POST | 读取或保存版本快照 |
| `/api/schemes/:id/export/:format` | GET | 导出 JSON/SVG/DXF/PDF |
| `/api/cases` | GET/POST | 列出或 upsert 案例 |
| `/api/cases/import-seed` | POST | 导入 20 个 seed cases |
| `/api/cases/retrieve` | POST | 检索相似案例 |
| `/api/cases/:id` | GET | 读取案例详情 |
| `/api/strategies/generate` | POST | 生成策略草案 |
| `/api/strategy-runs/:id` | GET | 读取策略生成记录 |
| `/api/schemes/from-strategy` | POST | 策略转 Scheme JSON |
| `/api/geometry/validate-furniture` | POST | 家具 zone/碰撞校验 |
| `/api/geometry/validate-constraints` | POST | 门洞净空和柱子避让校验 |

## 数据模型

### Project

Project 是项目级输入真源，包含：

- 图纸 source。
- 坐标系。
- site boundary、entrances、fixedElements、candidateBackOfHouse。
- constraints。
- business brief。

Schema：`schemas/project.schema.json`

### Scheme

Scheme 是方案级输出真源，包含：

- strategy 摘要和解释。
- zones。
- furniture。
- arrows。
- annotations。
- scores。
- validation。

Schema：`schemas/scheme.schema.json`

### Case

Case 是案例库资产，包含：

- siteFeatures。
- layoutPattern。
- strategySummary。
- whyItWorked。
- quality。
- finalScheme 引用。

Schema：`schemas/case.schema.json`

### Revit Import

Revit Import 是 Revit Add-in 和 Web 导入之间的交换格式，包含：

- source 元数据。
- view 元数据。
- walls、columns、doors、windows、rooms、areas、furniture、fixtures、textNotes、filledRegions、detailLines、dimensions。
- semanticHints。
- warnings。

Schema：`schemas/revit-import.schema.json`

## Revit 路径

当前 Revit 路径是本地 Windows Add-in，不是 Autodesk APS 云端转换，也不是网页直接打开 `.rvt`。

流程：

1. 用户在 Windows + Revit 2025 中安装 Add-in。
2. 在 Revit ribbon 中点击“导出空间 JSON”。
3. Add-in 读取当前视图元素，输出 Revit Import JSON。
4. Web 端导入 JSON，转换为 Project JSON。
5. 用户确认边界、入口、固定元素后继续生成方案。

当前 Add-in 能采集墙、柱、门、窗、房间、区域、家具、设备、文字、填充区域、详图线和尺寸。坐标单位会从 Revit feet 转成 mm，并以当前视图 crop box minimum point 作为画布原点。

未完成项：

- Windows/Revit 2025 编译验证。
- 实际 RVT fixture 运行验证。
- Revit 2026 路径。
- 旋转视图和复杂 crop transform。
- APS 云端 Design Automation 路线。

## 文档状态

| 文档 | 状态 |
| --- | --- |
| `README.md` | 当前项目首页，应保持简洁 |
| `docs/codebase-analysis.md` | 当前代码库技术分析 |
| `docs/mvp-scope.md` | 当前仍有效，定义产品边界 |
| `docs/json-schema-v0.md` | 当前仍有效，解释 Schema 设计 |
| `docs/demo-flow.md` | 当前仍有效，可用于本地演示 |
| `docs/export-package-v0.md` | 目标方向有效，部分能力仍高于代码实现 |
| `docs/beta-validation-plan.md` | Phase 6 当前执行依据 |
| `TASK_BOARD.md` | 当前任务看板，Phase 6 Active |

## 当前风险

### P1

- `apps/api/server.mjs` 同时承担 API、存储、检索、策略、几何、导出，职责过重。
- 本地 `.data` 没有并发控制、用户隔离、权限、备份、迁移。
- 真实 LLM 接入后，如果没有严格输出校验，会破坏 Scheme JSON 合同。
- Revit Add-in 尚未通过 Windows/Revit 运行验证。

### P2

- 前端 `apps/web/app.js` 是单文件状态机，后续复杂编辑和协作会难维护。
- 几何算法是模板式，不能处理复杂动线、规范、疏散、真实施工约束。
- DXF/PDF/PNG 导出还需要真实软件兼容性测试。
- Python 校验依赖 `jsonschema`，但仓库没有 `requirements.txt` 或等价依赖说明。
- 缺少 CI、自动 API smoke、Playwright regression。

### P3

- 项目英文名、包名、展示名尚未完全统一。
- `agnet.md` 是 typo-compatible pointer，长期应考虑保留还是迁移。
- 部分计划文档描述的是目标状态，读者需要区分“已实现”和“计划中”。

## 下一步建议

1. 完成 Phase 6 的 Windows/Revit 2025 验证任务。
2. 用 8-10 个真实或匿名 fixture 跑完整 beta 流程。
3. 输出 retrieval、geometry、export 三类质量报告。
4. 新增 provider adapter decision 文档，明确真实 LLM 接入前的成本、隐私、输出合同和评估门槛。
5. 拆分 `apps/api/server.mjs`：
   - `routes/`
   - `stores/`
   - `retrieval/`
   - `strategy/`
   - `geometry/`
   - `exporters/`
6. 增加 CI：
   - Node syntax check。
   - Schema validation。
   - API smoke。
   - Export smoke。
   - 前端 Playwright basic flow。

## 当前验证命令

```bash
node --check apps/api/server.mjs
node --check apps/web/app.js
python3 scripts/validate_schemas.py
```

截至本文件创建时，上述验证通过。
