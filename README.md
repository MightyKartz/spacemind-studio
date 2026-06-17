# 商业空间 AI 头脑风暴工具

一个面向商业空间早期方案阶段的 Web/API MVP：导入图纸或 Revit JSON，确认边界/入口/柱子/后场，检索参考案例，生成 AI 策略草案，再转换为可编辑、可评分、可导出的 Scheme JSON。

## 快速运行

```bash
npm run dev
```

默认地址：

```text
http://127.0.0.1:4173
```

## 当前能力

- Web 工作台：项目创建、图纸上传、锁定底图、手动标注边界/入口/柱子/后场
- 案例库：导入 20 个 seed cases，本地特征/RAG 检索相似案例
- AI 头脑风暴：基于 Project JSON、brief、参考案例生成 3-8 个策略草案
- Scheme 生成：把策略草案转换成 schema-valid Scheme JSON
- 几何校验：边界裁剪、家具基础碰撞、门洞净空、柱子避让
- 编辑版本：JSON 编辑器支持撤销、重做、保存版本快照
- 导出：JSON、SVG、DXF、PNG、摘要 PDF
- Revit：Windows C# Add-in 脚手架、Revit 2025 manifest、安装脚本、Revit Import JSON 转 Project JSON

## 关键目录

```text
apps/api/server.mjs        # 原生 Node API 和静态服务
apps/web/                  # Web 工作台
schemas/                   # Project / Scheme / Case / Revit Import JSON Schema
samples/                   # 示例 JSON 和 seed cases
samples/demo-briefs.json   # 演示 brief
revit-addin/               # Windows Revit Exporter Add-in scaffold
docs/                      # 产品、schema、导出包说明
.data/                     # 本地开发数据 store
```

## 验证

```bash
node --check apps/api/server.mjs
node --check apps/web/app.js
python3 scripts/validate_schemas.py
```

完整 UI 验证使用 Playwright/Codex browser against `http://127.0.0.1:4173`。

## 重要限制

- 当前 AI 管线是本地 deterministic prompt pipeline，没有调用外部付费 LLM。
- 本地 `.data` 是开发 store，不是生产数据库。
- Revit Add-in 需要 Windows + Revit 2025 + dotnet SDK 才能编译/运行验证。
- PDF 是 MVP 摘要 PDF，不是最终出图排版。
