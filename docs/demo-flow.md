# Demo Flow

Use this flow to show the Commercial Space AI brainstorming MVP end to end.

## 0. Start

```bash
npm run dev
```

Open:

```text
http://127.0.0.1:4173
```

## 1. Initialize References

1. In the Case Library panel, click `导入种子案例`.
2. Confirm the case count shows 20 usable cases.
3. Click `相似案例` after project conditions are visible.

## 2. Manual Plan Flow

1. Use the default sample plan.
2. Confirm boundary, entrances, columns, and back-of-house annotations are visible.
3. Click `生成策略`.
4. Select any strategy card.
5. Click `转为 Scheme JSON`.
6. Review the generated scheme card:
   - overall score
   - five score bars
   - tags and references
   - validation warning
7. Edit the Scheme JSON name.
8. Use `撤销` and `重做`.
9. Click `保存版本`.
10. Export JSON, SVG, DXF, PNG, and PDF.

## 3. Revit JSON Flow

Use:

```text
samples/schema-examples/revit-import.example.json
```

1. Click `导入图纸`.
2. Select the Revit Import JSON sample.
3. Click `创建项目`.
4. Confirm the latest project source is `revit_json`.
5. Continue with case retrieval, strategy generation, scheme conversion, and export.

## 4. Talking Points

- The MVP does not call paid LLM or Autodesk cloud services.
- Strategy generation is deterministic and provider-ready.
- Revit JSON import is schema-first and still requires user confirmation.
- Generated geometry is useful for brainstorming, not construction documentation.
- Revit Add-in build/runtime validation must happen on Windows with Revit 2025.
