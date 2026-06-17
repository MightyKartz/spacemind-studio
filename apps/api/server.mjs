import http from "node:http";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { createReadStream, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");
const webDir = path.join(rootDir, "apps/web");
const dataDir = path.join(rootDir, ".data");
const uploadDir = path.join(dataDir, "uploads");
const projectsPath = path.join(dataDir, "projects.json");
const schemesPath = path.join(dataDir, "schemes.json");
const schemeVersionsPath = path.join(dataDir, "scheme-versions.json");
const casesPath = path.join(dataDir, "cases.json");
const strategyRunsPath = path.join(dataDir, "strategy-runs.json");
const port = Number(process.env.PORT || 4173);
const maxUploadBytes = 15 * 1024 * 1024;
const allowedUploadTypes = new Set(["png", "pdf", "svg", "dxf", "revit_json"]);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml; charset=utf-8",
  ".pdf": "application/pdf"
};

function sendJson(response, status, payload) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload, null, 2));
}

function sendDownload(response, status, contentType, fileName, body) {
  response.writeHead(status, {
    "Content-Type": contentType,
    "Content-Disposition": `attachment; filename="${fileName}"`,
    "Cache-Control": "no-store"
  });
  response.end(body);
}

async function readJson(relativePath) {
  const content = await readFile(path.join(rootDir, relativePath), "utf8");
  return JSON.parse(content);
}

async function ensureDataStore() {
  await mkdir(uploadDir, { recursive: true });
  if (!existsSync(projectsPath)) {
    await writeFile(projectsPath, JSON.stringify({ projects: [] }, null, 2));
  }
  if (!existsSync(schemesPath)) {
    await writeFile(schemesPath, JSON.stringify({ schemes: [] }, null, 2));
  }
  if (!existsSync(schemeVersionsPath)) {
    await writeFile(schemeVersionsPath, JSON.stringify({ versions: [] }, null, 2));
  }
  if (!existsSync(casesPath)) {
    await writeFile(casesPath, JSON.stringify({ cases: [] }, null, 2));
  }
  if (!existsSync(strategyRunsPath)) {
    await writeFile(strategyRunsPath, JSON.stringify({ strategyRuns: [] }, null, 2));
  }
}

async function readRequestJson(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > maxUploadBytes * 1.5) {
      throw new Error("Request body is too large");
    }
  }
  return body ? JSON.parse(body) : {};
}

async function readProjectsStore() {
  await ensureDataStore();
  return JSON.parse(await readFile(projectsPath, "utf8"));
}

async function writeProjectsStore(store) {
  await ensureDataStore();
  await writeFile(projectsPath, JSON.stringify(store, null, 2));
}

async function readSchemesStore() {
  await ensureDataStore();
  return JSON.parse(await readFile(schemesPath, "utf8"));
}

async function writeSchemesStore(store) {
  await ensureDataStore();
  await writeFile(schemesPath, JSON.stringify(store, null, 2));
}

async function readSchemeVersionsStore() {
  await ensureDataStore();
  return JSON.parse(await readFile(schemeVersionsPath, "utf8"));
}

async function writeSchemeVersionsStore(store) {
  await ensureDataStore();
  await writeFile(schemeVersionsPath, JSON.stringify(store, null, 2));
}

async function readCasesStore() {
  await ensureDataStore();
  return JSON.parse(await readFile(casesPath, "utf8"));
}

async function writeCasesStore(store) {
  await ensureDataStore();
  await writeFile(casesPath, JSON.stringify(store, null, 2));
}

async function readStrategyRunsStore() {
  await ensureDataStore();
  return JSON.parse(await readFile(strategyRunsPath, "utf8"));
}

async function writeStrategyRunsStore(store) {
  await ensureDataStore();
  await writeFile(strategyRunsPath, JSON.stringify(store, null, 2));
}

async function findStoredUpload(uploadId) {
  await ensureDataStore();
  const safeUploadId = String(uploadId || "").replace(/[^a-zA-Z0-9_-]/g, "");
  if (!safeUploadId) return null;

  const files = await readdir(uploadDir);
  const storedName = files.find(fileName => fileName.startsWith(`${safeUploadId}-`));
  return storedName ? path.join(uploadDir, storedName) : null;
}

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function sanitizeFileName(fileName = "upload.bin") {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "upload.bin";
}

function sourceTypeFromFile(fileName, explicitType) {
  if (explicitType && allowedUploadTypes.has(explicitType)) return explicitType;
  const ext = path.extname(fileName).toLowerCase().replace(".", "");
  if (ext === "json") return "revit_json";
  if (allowedUploadTypes.has(ext)) return ext;
  return null;
}

function isPoint(value) {
  return Array.isArray(value)
    && value.length === 2
    && value.every(item => Number.isFinite(Number(item)));
}

function isPolygon(value) {
  return Array.isArray(value) && value.length >= 3 && value.every(isPoint);
}

function validateSitePatch(site) {
  if (!site || typeof site !== "object") {
    throw new Error("Missing site patch");
  }

  if (site.boundary !== undefined && !isPolygon(site.boundary)) {
    throw new Error("site.boundary must be a polygon with at least 3 points");
  }

  if (site.candidateBackOfHouse !== undefined) {
    if (!Array.isArray(site.candidateBackOfHouse) || !site.candidateBackOfHouse.every(isPolygon)) {
      throw new Error("site.candidateBackOfHouse must be an array of polygons");
    }
  }

  if (site.entrances !== undefined) {
    if (!Array.isArray(site.entrances)) throw new Error("site.entrances must be an array");
    for (const entrance of site.entrances) {
      if (!entrance.id || !isPoint(entrance.position)) {
        throw new Error("Each entrance must include id and position");
      }
      if (!Number.isFinite(Number(entrance.trafficWeight))
        || Number(entrance.trafficWeight) < 0
        || Number(entrance.trafficWeight) > 1) {
        throw new Error("entrance.trafficWeight must be between 0 and 1");
      }
    }
  }

  if (site.fixedElements !== undefined) {
    if (!Array.isArray(site.fixedElements)) throw new Error("site.fixedElements must be an array");
    for (const element of site.fixedElements) {
      if (!element.id || !element.type || !element.geometry?.kind) {
        throw new Error("Each fixed element must include id, type, and geometry.kind");
      }
    }
  }
}

function validateSchemeInput(scheme) {
  if (!scheme || typeof scheme !== "object") throw new Error("Missing scheme JSON");
  if (scheme.schemaVersion !== "0.1.0") throw new Error("scheme.schemaVersion must be 0.1.0");
  if (!scheme.schemeId || !scheme.projectId || !scheme.name) {
    throw new Error("schemeId, projectId, and name are required");
  }
  if (!["draft", "valid", "blocked", "exported", "archived"].includes(scheme.status)) {
    throw new Error("scheme.status is invalid");
  }
  if (!scheme.origin?.source) throw new Error("scheme.origin.source is required");
  if (!scheme.strategy?.summary || !scheme.strategy?.rationale) {
    throw new Error("scheme.strategy.summary and rationale are required");
  }
  if (!Array.isArray(scheme.zones)
    || !Array.isArray(scheme.furniture)
    || !Array.isArray(scheme.annotations)) {
    throw new Error("scheme zones, furniture, and annotations must be arrays");
  }
  const scoreKeys = ["circulation", "capacity", "display", "cost", "feasibility"];
  for (const key of scoreKeys) {
    if (!Number.isFinite(Number(scheme.scores?.[key]))
      || Number(scheme.scores[key]) < 0
      || Number(scheme.scores[key]) > 10) {
      throw new Error(`scheme.scores.${key} must be between 0 and 10`);
    }
  }
  if (!Array.isArray(scheme.validation?.blockers) || !Array.isArray(scheme.validation?.warnings)) {
    throw new Error("scheme.validation blockers and warnings must be arrays");
  }
}

function validateCaseInput(caseItem) {
  if (!caseItem || typeof caseItem !== "object") throw new Error("Missing case JSON");
  if (caseItem.schemaVersion !== "0.1.0") throw new Error("case.schemaVersion must be 0.1.0");
  if (!caseItem.caseId || !caseItem.title || !caseItem.businessType) {
    throw new Error("caseId, title, and businessType are required");
  }
  if (!Array.isArray(caseItem.tags) || !caseItem.tags.length) {
    throw new Error("case.tags must include at least one tag");
  }
  if (!caseItem.siteFeatures?.areaRange
    || !caseItem.siteFeatures?.shapeType
    || !caseItem.siteFeatures?.entrancePattern) {
    throw new Error("case.siteFeatures must include areaRange, shapeType, and entrancePattern");
  }
  if (!caseItem.layoutPattern?.mainAisle || !caseItem.layoutPattern?.primaryZonePlacement) {
    throw new Error("case.layoutPattern must include mainAisle and primaryZonePlacement");
  }
  if (!caseItem.finalScheme?.schemeId) {
    throw new Error("case.finalScheme.schemeId is required");
  }
  if (typeof caseItem.quality?.humanReviewed !== "boolean"
    || typeof caseItem.quality?.usableForGeneration !== "boolean") {
    throw new Error("case.quality must include humanReviewed and usableForGeneration booleans");
  }
}

function uniqueSorted(items) {
  return [...new Set(items.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function summarizeCaseStore(cases) {
  return {
    cases,
    count: cases.length,
    businessTypes: uniqueSorted(cases.map(caseItem => caseItem.businessType)),
    tags: uniqueSorted(cases.flatMap(caseItem => caseItem.tags || []))
  };
}

function filterCases(cases, searchParams) {
  const businessType = searchParams.get("businessType");
  const tag = searchParams.get("tag");
  const usableOnly = searchParams.get("usableOnly") === "true";

  return cases.filter(caseItem => {
    if (businessType && caseItem.businessType !== businessType) return false;
    if (tag && !(caseItem.tags || []).includes(tag)) return false;
    if (usableOnly && caseItem.quality?.usableForGeneration !== true) return false;
    return true;
  });
}

function tokenize(value) {
  return String(value || "")
    .toLowerCase()
    .match(/[\p{Letter}\p{Number}_:-]+/gu) || [];
}

function areaOfPolygon(polygon = []) {
  if (!Array.isArray(polygon) || polygon.length < 3) return 0;
  let area = 0;
  for (let index = 0; index < polygon.length; index += 1) {
    const current = polygon[index];
    const next = polygon[(index + 1) % polygon.length];
    area += Number(current[0]) * Number(next[1]) - Number(next[0]) * Number(current[1]);
  }
  return Math.abs(area / 2);
}

function boundsOfPolygon(polygon = []) {
  if (!Array.isArray(polygon) || !polygon.length) return null;
  const xs = polygon.map(point => Number(point[0])).filter(Number.isFinite);
  const ys = polygon.map(point => Number(point[1])).filter(Number.isFinite);
  if (!xs.length || !ys.length) return null;
  return {
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys)
  };
}

function inferShapeType(project) {
  if (project?.site?.shapeType) return project.site.shapeType;
  const bounds = boundsOfPolygon(project?.site?.boundary);
  if (!bounds || !bounds.width || !bounds.height) return "";
  const ratio = Math.max(bounds.width, bounds.height) / Math.min(bounds.width, bounds.height);
  if (ratio >= 2) return "long_rectangle";
  return "rectangle";
}

function inferAreaSqm(project) {
  const explicitArea = Number(project?.site?.netDesignArea || project?.site?.grossArea || project?.site?.area);
  if (Number.isFinite(explicitArea) && explicitArea > 0) return explicitArea / 1000000;
  const boundaryArea = areaOfPolygon(project?.site?.boundary);
  return boundaryArea ? boundaryArea / 1000000 : 0;
}

function inferEntrancePattern(project) {
  const entrances = project?.site?.entrances || [];
  if (entrances.length >= 2) {
    const sides = new Set(entrances.map(entrance => entrance.side).filter(Boolean));
    if ((sides.has("west") && sides.has("east")) || (sides.has("north") && sides.has("south"))) {
      return "dual_opposite";
    }
    return "dual_front";
  }
  if (entrances.length === 1) return "single_front";
  return "";
}

function inferTrafficPattern(project) {
  const entrances = project?.site?.entrances || [];
  const strongest = [...entrances].sort((a, b) => Number(b.trafficWeight || 0) - Number(a.trafficWeight || 0))[0];
  const label = `${strongest?.label || ""} ${strongest?.side || ""}`.toLowerCase();
  if (!strongest) return "";
  if (label.includes("街") || label.includes("street")) return "street_high";
  if (label.includes("商场") || label.includes("mall")) return "mall_high";
  return Number(strongest.trafficWeight || 0) >= 0.55 ? "front_high" : "balanced";
}

function inferBackOfHouseRatio(project) {
  const site = project?.site || {};
  const netArea = Number(site.netDesignArea || site.grossArea || site.area || areaOfPolygon(site.boundary));
  const regions = site.candidateBackOfHouse || [];
  const area = regions.reduce((total, polygon) => total + areaOfPolygon(polygon), 0);
  return netArea > 0 ? area / netArea : 0;
}

function inferColumnPattern(project) {
  const count = (project?.site?.fixedElements || []).filter(element => element.type === "column").length;
  if (count >= 4) return "dense";
  if (count > 0) return "sparse";
  return "none";
}

function buildProjectRetrievalProfile(project = {}, extraBrief = "") {
  const brief = project.brief || {};
  const textParts = [
    project.name,
    brief.businessType,
    brief.style,
    ...(brief.goals || []),
    ...(brief.requiredZones || []),
    ...(brief.constraints || []),
    extraBrief
  ];

  return {
    businessType: brief.businessType || "",
    goals: brief.goals || [],
    requiredZones: brief.requiredZones || [],
    shapeType: inferShapeType(project),
    areaSqm: inferAreaSqm(project),
    entrancePattern: inferEntrancePattern(project),
    trafficPattern: inferTrafficPattern(project),
    backOfHouseRatio: inferBackOfHouseRatio(project),
    columnPattern: inferColumnPattern(project),
    tokens: tokenize(textParts.join(" "))
  };
}

function buildCaseRetrievalProfile(caseItem) {
  const site = caseItem.siteFeatures || {};
  const layout = caseItem.layoutPattern || {};
  return {
    businessType: caseItem.businessType || "",
    shapeType: site.shapeType || "",
    areaMin: Number(site.areaMin || 0),
    areaMax: Number(site.areaMax || 0),
    areaRange: site.areaRange || "",
    entrancePattern: site.entrancePattern || "",
    trafficPattern: site.trafficPattern || "",
    backOfHouseRatio: Number(site.backOfHouseRatio || 0),
    columnPattern: site.columnPattern || "",
    mainAisle: layout.mainAisle || "",
    primaryZonePlacement: layout.primaryZonePlacement || "",
    tokens: tokenize([
      caseItem.title,
      caseItem.businessType,
      ...(caseItem.tags || []),
      site.shapeType,
      site.entrancePattern,
      site.trafficPattern,
      layout.mainAisle,
      layout.primaryZonePlacement,
      layout.backOfHouseStrategy,
      layout.displayStrategy,
      caseItem.strategySummary,
      caseItem.whyItWorked
    ].join(" "))
  };
}

function tokenSimilarity(sourceTokens, targetTokens) {
  const source = new Set(sourceTokens);
  const target = new Set(targetTokens);
  if (!source.size || !target.size) return 0;
  const overlap = [...source].filter(token => target.has(token)).length;
  return overlap / Math.sqrt(source.size * target.size);
}

function relatedBusinessGroup(type) {
  if (["coffee", "bakery", "tea", "restaurant"].includes(type)) return "fnb";
  if (["retail", "popup", "shop_in_shop"].includes(type)) return "retail";
  if (["office", "office_showroom"].includes(type)) return "workplace";
  if (["exhibition", "hybrid"].includes(type)) return "display";
  return type || "";
}

function shapeFamily(shapeType) {
  if (String(shapeType).includes("long") || String(shapeType).includes("deep")) return "elongated";
  if (String(shapeType).includes("corner")) return "corner";
  if (String(shapeType).includes("kiosk")) return "kiosk";
  if (String(shapeType).includes("wide") || String(shapeType).includes("rectangle")) return "rectangle";
  return shapeType || "";
}

function entranceFamily(pattern) {
  if (String(pattern).startsWith("dual")) return "dual";
  if (String(pattern).startsWith("single")) return "single";
  if (String(pattern).includes("open")) return "open";
  return pattern || "";
}

function addScore(match, points, signal) {
  if (points <= 0) return;
  match.rawScore += points;
  if (signal) match.matchedSignals.push(signal);
}

function scoreCaseAgainstProject(caseItem, projectProfile) {
  const caseProfile = buildCaseRetrievalProfile(caseItem);
  const match = {
    rawScore: 0,
    matchedSignals: []
  };

  if (caseProfile.businessType === projectProfile.businessType) {
    addScore(match, 24, `业态一致：${caseProfile.businessType}`);
  } else if (relatedBusinessGroup(caseProfile.businessType) === relatedBusinessGroup(projectProfile.businessType)) {
    addScore(match, 10, `业态相邻：${caseProfile.businessType}`);
  }

  if (caseProfile.shapeType && caseProfile.shapeType === projectProfile.shapeType) {
    addScore(match, 16, `空间形态一致：${caseProfile.shapeType}`);
  } else if (shapeFamily(caseProfile.shapeType) === shapeFamily(projectProfile.shapeType)) {
    addScore(match, 8, `空间形态同类：${caseProfile.shapeType}`);
  }

  if (projectProfile.areaSqm && caseProfile.areaMin && caseProfile.areaMax) {
    if (projectProfile.areaSqm >= caseProfile.areaMin && projectProfile.areaSqm <= caseProfile.areaMax) {
      addScore(match, 14, `面积落入 ${caseProfile.areaRange}㎡`);
    } else {
      const nearest = projectProfile.areaSqm < caseProfile.areaMin ? caseProfile.areaMin : caseProfile.areaMax;
      const distanceRatio = Math.abs(projectProfile.areaSqm - nearest) / Math.max(projectProfile.areaSqm, nearest);
      addScore(match, Math.max(0, Math.round((1 - distanceRatio) * 7)), `面积接近 ${caseProfile.areaRange}㎡`);
    }
  }

  if (caseProfile.entrancePattern && caseProfile.entrancePattern === projectProfile.entrancePattern) {
    addScore(match, 14, `入口模式一致：${caseProfile.entrancePattern}`);
  } else if (entranceFamily(caseProfile.entrancePattern) === entranceFamily(projectProfile.entrancePattern)) {
    addScore(match, 7, `入口数量同类：${caseProfile.entrancePattern}`);
  }

  if (caseProfile.trafficPattern && caseProfile.trafficPattern === projectProfile.trafficPattern) {
    addScore(match, 8, `人流模式一致：${caseProfile.trafficPattern}`);
  }

  if (caseProfile.columnPattern && caseProfile.columnPattern === projectProfile.columnPattern) {
    addScore(match, 4, `柱网复杂度接近：${caseProfile.columnPattern}`);
  }

  const bohDelta = Math.abs(caseProfile.backOfHouseRatio - projectProfile.backOfHouseRatio);
  if (caseProfile.backOfHouseRatio && projectProfile.backOfHouseRatio && bohDelta <= 0.08) {
    addScore(match, 5, "后场比例接近");
  }

  const tokenScore = tokenSimilarity(projectProfile.tokens, caseProfile.tokens);
  addScore(match, Math.round(tokenScore * 12), tokenScore > 0 ? "brief/tag 词项相似" : "");

  const qualityScore = Number(caseItem.quality?.qualityScore || 0);
  addScore(match, Math.round(Math.min(qualityScore, 10) * 0.3), qualityScore ? `案例质量 ${qualityScore}/10` : "");

  const score = Math.min(100, Math.round(match.rawScore));
  const strongestSignals = match.matchedSignals.slice(0, 4);
  return {
    caseId: caseItem.caseId,
    title: caseItem.title,
    businessType: caseItem.businessType,
    score,
    matchedSignals: strongestSignals,
    reason: strongestSignals.length
      ? strongestSignals.join("；")
      : "作为低相似度备选案例，可补充扩大探索范围。",
    retrievalText: [
      caseItem.title,
      caseItem.strategySummary,
      caseItem.whyItWorked,
      ...(caseItem.tags || [])
    ].filter(Boolean).join(" "),
    case: caseItem
  };
}

function retrieveSimilarCases(project, cases, options = {}) {
  const limit = Math.min(8, Math.max(1, Number(options.limit || 5)));
  const projectProfile = buildProjectRetrievalProfile(project, options.brief || "");
  const usableCases = cases.filter(caseItem => caseItem.quality?.usableForGeneration !== false);
  const matches = usableCases
    .map(caseItem => scoreCaseAgainstProject(caseItem, projectProfile))
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, limit);

  return {
    retrievalMode: "local_feature_rag_v0",
    embedding: {
      provider: "local",
      model: "weighted-feature-token-vector-v0",
      externalCost: false
    },
    query: {
      projectId: project?.projectId || "ad_hoc_project",
      businessType: projectProfile.businessType,
      shapeType: projectProfile.shapeType,
      areaSqm: Number(projectProfile.areaSqm.toFixed(1)),
      entrancePattern: projectProfile.entrancePattern,
      trafficPattern: projectProfile.trafficPattern,
      limit
    },
    matches,
    referenceCaseIds: matches.map(match => match.caseId)
  };
}

function strategyCount(value, fallback = 6) {
  const numeric = Number(value || fallback);
  return Math.min(8, Math.max(3, Number.isFinite(numeric) ? Math.round(numeric) : fallback));
}

function projectConstraintSummary(project) {
  const site = project?.site || {};
  const constraints = project?.constraints || {};
  const entrances = (site.entrances || []).map(entrance => (
    `${entrance.label || entrance.id}:${Math.round(Number(entrance.trafficWeight || 0) * 100)}%`
  ));
  return [
    `面积约 ${Math.round(inferAreaSqm(project))}㎡`,
    `形态 ${inferShapeType(project) || "unknown"}`,
    `入口 ${inferEntrancePattern(project) || "unknown"} ${entrances.join(" / ")}`,
    `后场比例 ${Math.round(inferBackOfHouseRatio(project) * 100)}%`,
    `主通道 >= ${constraints.minAisleWidth || 1200}mm`,
    constraints.keepDoorClearance ? "保留门洞净空" : "",
    constraints.avoidColumns ? "避让结构柱" : ""
  ].filter(Boolean).join("；");
}

function referenceCaseBrief(match) {
  const caseItem = match.case || {};
  return {
    caseId: match.caseId,
    title: match.title,
    score: match.score,
    strategySummary: caseItem.strategySummary || "",
    whyItWorked: caseItem.whyItWorked || "",
    layoutPattern: caseItem.layoutPattern || {},
    matchedSignals: match.matchedSignals || []
  };
}

function buildStrategyPromptMessages(project, retrieval, options) {
  const count = strategyCount(options.count, project?.brief?.generateCount || 6);
  const briefText = options.brief || (project?.brief?.constraints || []).join("；");
  const referenceCases = (retrieval.matches || []).slice(0, 5).map(referenceCaseBrief);

  return [
    {
      role: "system",
      content: [
        "你是商业空间早期方案阶段的 AI 策略助手。",
        "你只生成可解释的功能落位策略、优缺点、placementHints 和评分倾向。",
        "不要生成最终施工图，不要承诺规范合规，不要直接输出不可校验的最终坐标。",
        "后续几何引擎会负责边界裁剪、门洞避让、柱子避让和家具坐标。"
      ].join("\n")
    },
    {
      role: "user",
      content: JSON.stringify({
        task: `生成 ${count} 个差异明确的商业空间策略草案`,
        project: {
          projectId: project?.projectId,
          name: project?.name,
          businessType: project?.brief?.businessType,
          goals: project?.brief?.goals || [],
          requiredZones: project?.brief?.requiredZones || [],
          generateCount: count,
          constraints: projectConstraintSummary(project),
          brief: briefText
        },
        referenceCases,
        outputContract: {
          strategies: [
            {
              strategyId: "strategy_001",
              name: "短标题",
              summary: "一句话策略",
              rationale: "为什么适合当前项目",
              referenceCaseIds: ["case_id"],
              conceptTags: ["tag"],
              tradeoffs: ["代价"],
              placementHints: ["供几何引擎使用的方向性提示"],
              scoreBias: {
                circulation: "0-10",
                capacity: "0-10",
                display: "0-10",
                cost: "0-10",
                feasibility: "0-10"
              }
            }
          ]
        }
      }, null, 2)
    }
  ];
}

const strategyPatterns = [
  {
    key: "street_social_front",
    name: "沿街社交强化",
    tags: ["social_front", "entry_activation", "linear_aisle"],
    scoreBias: { circulation: 8, capacity: 7, display: 8, cost: 6, feasibility: 8 }
  },
  {
    key: "central_clear_spine",
    name: "中央长动线",
    tags: ["central_spine", "dual_entry", "clear_circulation"],
    scoreBias: { circulation: 9, capacity: 7, display: 7, cost: 7, feasibility: 8 }
  },
  {
    key: "mall_display_frontage",
    name: "入口展示面",
    tags: ["display_frontage", "brand_wall", "mall_entry"],
    scoreBias: { circulation: 7, capacity: 6, display: 9, cost: 6, feasibility: 7 }
  },
  {
    key: "compressed_service_back",
    name: "后场压缩效率",
    tags: ["compact_back_of_house", "service_efficiency", "capacity_gain"],
    scoreBias: { circulation: 7, capacity: 8, display: 7, cost: 7, feasibility: 7 }
  },
  {
    key: "quiet_work_lounge",
    name: "安静复合停留",
    tags: ["quiet_zone", "soft_seating", "work_lounge"],
    scoreBias: { circulation: 7, capacity: 7, display: 6, cost: 6, feasibility: 8 }
  },
  {
    key: "retail_loop_story",
    name: "环形叙事浏览",
    tags: ["retail_loop", "storytelling", "display_sequence"],
    scoreBias: { circulation: 8, capacity: 6, display: 9, cost: 5, feasibility: 7 }
  },
  {
    key: "low_cost_fast_fit",
    name: "低成本快改",
    tags: ["low_cost", "loose_furniture", "minimal_partition"],
    scoreBias: { circulation: 7, capacity: 7, display: 6, cost: 9, feasibility: 8 }
  },
  {
    key: "event_flexible_core",
    name: "活动弹性核心",
    tags: ["flexible_core", "event_mode", "movable_furniture"],
    scoreBias: { circulation: 8, capacity: 6, display: 8, cost: 6, feasibility: 7 }
  }
];

function strategyCopy(pattern, project, retrieval, index) {
  const businessType = project?.brief?.businessType || "commercial";
  const requiredZones = project?.brief?.requiredZones || [];
  const goals = project?.brief?.goals || [];
  const references = (retrieval.matches || []).slice(index % 2, index % 2 + 2);
  const referenceCaseIds = references.length
    ? references.map(match => match.caseId)
    : (retrieval.referenceCaseIds || []).slice(0, 2);
  const topReference = references[0] || retrieval.matches?.[0];
  const entrancePattern = retrieval.query?.entrancePattern || inferEntrancePattern(project);
  const shapeType = retrieval.query?.shapeType || inferShapeType(project);

  const summaryByKey = {
    street_social_front: `把 ${businessType} 的高互动区前置到主客流入口，中央保留清晰通道。`,
    central_clear_spine: `用一条连续主通道串联 ${entrancePattern || "入口"}，两侧按停留强度分区。`,
    mall_display_frontage: "强化商场/次入口展示界面，让低权重入口也承担品牌引导。",
    compressed_service_back: "压缩并顺直后场服务边界，把更多净面积释放给客座和展示。",
    quiet_work_lounge: "将安静停留区布置在远离强入口的位置，形成社交与工作复合层次。",
    retail_loop_story: `围绕 ${shapeType || "当前边界"} 组织浏览回路，形成连续展示和转化节奏。`,
    low_cost_fast_fit: "尽量使用松动家具和轻隔断，保留未来运营调整弹性。",
    event_flexible_core: "把中部留成可切换活动核心，日常是座席，高峰可变成发布或社群活动区。"
  };

  const rationale = [
    topReference ? `参考 ${topReference.title} 的策略：${topReference.case?.strategySummary || topReference.reason}` : "",
    goals.length ? `当前目标强调 ${goals.join("、")}，该策略优先响应其中的关键目标。` : "",
    requiredZones.length ? `必须出现的 ${requiredZones.join("、")} 会作为几何阶段的分区约束。` : ""
  ].filter(Boolean).join(" ");

  return {
    strategyId: `strategy_${String(index + 1).padStart(3, "0")}`,
    name: `${String(index + 1).padStart(2, "0")} ${pattern.name}`,
    summary: summaryByKey[pattern.key] || pattern.name,
    rationale: rationale || "基于当前项目条件和相似案例生成的策略方向。",
    referenceCaseIds,
    conceptTags: pattern.tags,
    tradeoffs: [
      pattern.key.includes("display") ? "展示面增强会压缩部分可坐面积。" : "",
      pattern.key.includes("low_cost") ? "快速落地的视觉完整度需要后续设计补强。" : "",
      pattern.key.includes("central") ? "主通道更清晰，但边角空间需要家具细化消化。" : "",
      pattern.key.includes("service") ? "后场压缩需要确认设备和运营净尺寸。" : ""
    ].filter(Boolean),
    assumptions: [
      "边界、入口、柱子和后场已经由用户确认。",
      "LLM 只输出策略，坐标和碰撞检查交由后续几何引擎。"
    ],
    placementHints: [
      pattern.key.includes("street") ? "高互动区靠近最高人流入口。" : "",
      pattern.key.includes("central") ? "主通道贯穿长边方向，避免被家具切断。" : "",
      pattern.key.includes("display") ? "展示面靠近商场入口和可见边界。" : "",
      pattern.key.includes("service") ? "后场沿现有不可动区域压缩布置。" : "",
      pattern.key.includes("quiet") ? "安静停留区远离高权重入口与排队点。" : "",
      pattern.key.includes("loop") ? "展示/浏览动线形成闭环，收银或咨询点放在回路末端。" : "",
      pattern.key.includes("low_cost") ? "优先使用可移动家具，减少新增隔墙。" : "",
      pattern.key.includes("flexible") ? "中部预留无固定家具的活动核心。" : ""
    ].filter(Boolean),
    scoreBias: pattern.scoreBias
  };
}

function createStrategyRun(project, cases, options = {}) {
  const count = strategyCount(options.count, project?.brief?.generateCount || 6);
  const retrieval = retrieveSimilarCases(project, cases, {
    brief: options.brief || "",
    limit: Math.max(5, Math.min(8, count))
  });
  const messages = buildStrategyPromptMessages(project, retrieval, {
    count,
    brief: options.brief || ""
  });
  const selectedPatterns = strategyPatterns.slice(0, count);
  const strategies = selectedPatterns.map((pattern, index) => (
    strategyCopy(pattern, project, retrieval, index)
  ));
  const createdAt = nowIso();

  return {
    runId: makeId("llmrun"),
    createdAt,
    status: "completed",
    pipeline: {
      mode: "local_prompt_pipeline_v0",
      provider: "local",
      model: "strategy-prompt-pipeline-v0",
      externalCost: false,
      note: "No external LLM call is made in this MVP stage; messages are ready for a future provider adapter."
    },
    projectId: project?.projectId || "ad_hoc_project",
    generateCount: count,
    prompt: {
      messages,
      responseFormat: "commercial_space_strategy_list_v0"
    },
    retrieval,
    strategies
  };
}

async function persistStrategyRun(run) {
  const store = await readStrategyRunsStore();
  store.strategyRuns = [
    run,
    ...(store.strategyRuns || []).filter(item => item.runId !== run.runId)
  ].slice(0, 50);
  await writeStrategyRunsStore(store);
}

async function createProjectFromInput(input) {
  const sample = await readJson("samples/schema-examples/project.example.json");
  const createdAt = nowIso();
  const projectId = input.projectId || makeId("proj");
  const sourceType = input.upload?.sourceType || "manual";
  const fileId = input.upload?.uploadId || "manual_source";

  return {
    ...sample,
    projectId,
    name: input.name || sample.name,
    createdAt,
    updatedAt: createdAt,
    source: {
      ...sample.source,
      type: sourceType,
      fileId,
      fileName: input.upload?.fileName || sample.source.fileName
    },
    brief: {
      ...sample.brief,
      businessType: input.businessType || sample.brief.businessType,
      generateCount: Number(input.generateCount || sample.brief.generateCount),
      goals: Array.isArray(input.goals) && input.goals.length ? input.goals : sample.brief.goals,
      constraints: input.brief ? [input.brief] : sample.brief.constraints
    }
  };
}

function validateRevitImportInput(importJson) {
  if (!importJson || typeof importJson !== "object") throw new Error("Missing Revit import JSON");
  if (importJson.schemaVersion !== "0.1.0") throw new Error("revit import schemaVersion must be 0.1.0");
  if (!importJson.importId || importJson.unit !== "mm") throw new Error("Revit import must include importId and unit=mm");
  if (!importJson.source?.application || !importJson.view?.id || !importJson.elements) {
    throw new Error("Revit import must include source, view, and elements");
  }
}

function geometryCoordinates(element) {
  return element?.geometry?.coordinates;
}

function centerOfCoordinates(coordinates) {
  if (isPoint(coordinates)) return coordinates.map(Number);
  if (Array.isArray(coordinates) && coordinates.length) {
    const points = coordinates.filter(isPoint);
    if (points.length) return centerOfPolygon(points);
  }
  return [0, 0];
}

function polygonFromRevitElement(element) {
  const coordinates = geometryCoordinates(element);
  if (isPolygon(coordinates)) return coordinates;
  if (Array.isArray(coordinates) && coordinates.length && coordinates.every(isPoint)) {
    const box = boundingBoxOfPolygon(coordinates);
    return [[box.minX, box.minY], [box.maxX, box.minY], [box.maxX, box.maxY], [box.minX, box.maxY]];
  }
  return null;
}

function fixedElementsFromRevitImport(importJson) {
  const columns = importJson.elements?.columns || [];
  return columns.map((element, index) => {
    const polygon = polygonFromRevitElement(element);
    const point = centerOfCoordinates(geometryCoordinates(element));
    return {
      id: `col_revit_${element.revitElementId || index + 1}`,
      type: "column",
      label: element.typeName || element.familyName || "Revit 结构柱",
      geometry: polygon
        ? { kind: "polygon", coordinates: polygon }
        : { kind: "point", coordinates: point },
      locked: true,
      confirmed: false,
      confidence: 0.82,
      source: "revit"
    };
  });
}

function entrancesFromRevitImport(importJson) {
  const candidateIds = new Set([
    ...(importJson.site?.candidateEntrances || []),
    ...(importJson.semanticHints || [])
      .filter(hint => String(hint.type || "").includes("entrance"))
      .map(hint => hint.targetId)
  ]);
  const doors = importJson.elements?.doors || [];
  const candidates = doors.filter(door => candidateIds.size ? candidateIds.has(door.id) : true);
  const count = Math.max(1, candidates.length);
  return candidates.map((door, index) => ({
    id: `entry_revit_${door.revitElementId || index + 1}`,
    label: door.typeName || door.familyName || `Revit 入口 ${index + 1}`,
    position: centerOfCoordinates(geometryCoordinates(door)),
    side: "revit",
    width: Number(door.parameters?.width || door.parameters?.Width || 1600),
    trafficWeight: Number((1 / count).toFixed(2)),
    direction: 0,
    confirmed: false,
    confidence: candidateIds.has(door.id) ? 0.72 : 0.5,
    source: "revit"
  }));
}

async function createProjectFromRevitImport(input) {
  const sample = await readJson("samples/schema-examples/project.example.json");
  const importJson = input.importJson;
  validateRevitImportInput(importJson);

  const createdAt = nowIso();
  const projectId = input.projectId || makeId("proj");
  const boundary = importJson.site?.candidateBoundary || importJson.view?.cropBox || sample.site.boundary;
  const grossArea = Number(importJson.site?.grossArea || areaOfPolygon(boundary));
  const fixedElements = fixedElementsFromRevitImport(importJson);
  const entrances = entrancesFromRevitImport(importJson);

  return {
    ...sample,
    projectId,
    name: input.name || importJson.source?.documentTitle || sample.name,
    createdAt,
    updatedAt: createdAt,
    source: {
      ...sample.source,
      type: "revit_json",
      fileId: input.upload?.uploadId || importJson.importId,
      fileName: input.upload?.fileName || `${importJson.source?.documentTitle || importJson.importId}.json`,
      page: 1
    },
    site: {
      ...sample.site,
      boundary,
      grossArea,
      netDesignArea: grossArea,
      shapeType: inferShapeType({ site: { boundary } }),
      entrances,
      fixedElements,
      candidateBackOfHouse: []
    },
    brief: {
      ...sample.brief,
      businessType: input.businessType || sample.brief.businessType,
      generateCount: Number(input.generateCount || sample.brief.generateCount),
      constraints: [
        ...(Array.isArray(sample.brief.constraints) ? sample.brief.constraints : []),
        "Revit JSON 导入后需人工确认边界、入口、人流和固定元素。"
      ]
    }
  };
}

async function createSchemeFromInput(project, input = {}) {
  const sample = await readJson("samples/schema-examples/scheme.example.json");
  const schemeId = input.schemeId || makeId("scheme");
  const name = input.name || `${project.name || "未命名项目"} - 草案方案`;

  return {
    ...sample,
    schemeId,
    projectId: project.projectId,
    projectRevision: project.updatedAt || project.createdAt || nowIso(),
    name,
    status: input.status || "draft",
    origin: {
      source: "user",
      referenceCaseIds: Array.isArray(project.brief?.referenceCaseIds)
        ? project.brief.referenceCaseIds
        : []
    },
    strategy: {
      ...sample.strategy,
      summary: input.summary || "基于当前项目约束创建的可编辑草案方案。",
      rationale: input.rationale || "作为前端编辑和 AI 生成前的结构化方案 JSON 起点。",
      assumptions: [
        ...(sample.strategy.assumptions || []),
        "当前方案由用户创建，可继续编辑 JSON。"
      ]
    },
    caseRefs: Array.isArray(project.brief?.referenceCaseIds) ? project.brief.referenceCaseIds : [],
    zones: Array.isArray(input.zones) ? input.zones : sample.zones,
    furniture: Array.isArray(input.furniture) ? input.furniture : sample.furniture,
    arrows: Array.isArray(input.arrows) ? input.arrows : sample.arrows,
    annotations: Array.isArray(input.annotations) ? input.annotations : sample.annotations,
    scores: input.scores || {
      ...sample.scores,
      feasibility: 6
    },
    validation: input.validation || {
      overallStatus: "warn",
      blockers: [],
      warnings: [
        {
          code: "manual_draft",
          status: "warn",
          severity: "warning",
          message: "手动草案尚未经过几何校验。"
        }
      ]
    }
  };
}

function boundingBoxOfPolygon(polygon = []) {
  if (!Array.isArray(polygon) || !polygon.length) {
    return { minX: 0, minY: 0, maxX: 22000, maxY: 9000, width: 22000, height: 9000 };
  }
  const xs = polygon.map(point => Number(point[0])).filter(Number.isFinite);
  const ys = polygon.map(point => Number(point[1])).filter(Number.isFinite);
  if (!xs.length || !ys.length) {
    return { minX: 0, minY: 0, maxX: 22000, maxY: 9000, width: 22000, height: 9000 };
  }
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY)
  };
}

function clampNumber(value, min, max, fallback) {
  const numeric = Number(value);
  const safe = Number.isFinite(numeric) ? numeric : fallback;
  return Math.min(max, Math.max(min, safe));
}

function rectPolygon(x, y, width, height, box) {
  const x1 = clampNumber(x, box.minX, box.maxX, box.minX);
  const y1 = clampNumber(y, box.minY, box.maxY, box.minY);
  const x2 = clampNumber(x + width, box.minX, box.maxX, box.maxX);
  const y2 = clampNumber(y + height, box.minY, box.maxY, box.maxY);
  return [[x1, y1], [x2, y1], [x2, y2], [x1, y2]];
}

function centerOfPolygon(polygon) {
  const box = boundingBoxOfPolygon(polygon);
  return [Math.round(box.minX + box.width / 2), Math.round(box.minY + box.height / 2)];
}

function signedPolygonArea(polygon = []) {
  if (!Array.isArray(polygon) || polygon.length < 3) return 0;
  let area = 0;
  for (let index = 0; index < polygon.length; index += 1) {
    const current = polygon[index];
    const next = polygon[(index + 1) % polygon.length];
    area += Number(current[0]) * Number(next[1]) - Number(next[0]) * Number(current[1]);
  }
  return area / 2;
}

function normalizePoint(point) {
  return [
    Math.round(Number(point[0]) * 1000) / 1000,
    Math.round(Number(point[1]) * 1000) / 1000
  ];
}

function samePoint(a, b) {
  return Math.abs(Number(a[0]) - Number(b[0])) < 0.001
    && Math.abs(Number(a[1]) - Number(b[1])) < 0.001;
}

function cleanPolygon(polygon = []) {
  const cleaned = [];
  for (const point of polygon.map(normalizePoint)) {
    if (!cleaned.length || !samePoint(cleaned[cleaned.length - 1], point)) {
      cleaned.push(point);
    }
  }
  if (cleaned.length > 1 && samePoint(cleaned[0], cleaned[cleaned.length - 1])) {
    cleaned.pop();
  }
  return cleaned.length >= 3 && areaOfPolygon(cleaned) > 1 ? cleaned : [];
}

function isInsideClipEdge(point, edgeStart, edgeEnd, clockwise) {
  const cross = (Number(edgeEnd[0]) - Number(edgeStart[0])) * (Number(point[1]) - Number(edgeStart[1]))
    - (Number(edgeEnd[1]) - Number(edgeStart[1])) * (Number(point[0]) - Number(edgeStart[0]));
  return clockwise ? cross <= 0.001 : cross >= -0.001;
}

function lineIntersection(lineStart, lineEnd, edgeStart, edgeEnd) {
  const x1 = Number(lineStart[0]);
  const y1 = Number(lineStart[1]);
  const x2 = Number(lineEnd[0]);
  const y2 = Number(lineEnd[1]);
  const x3 = Number(edgeStart[0]);
  const y3 = Number(edgeStart[1]);
  const x4 = Number(edgeEnd[0]);
  const y4 = Number(edgeEnd[1]);
  const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denominator) < 0.001) return normalizePoint(lineEnd);
  const px = ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / denominator;
  const py = ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / denominator;
  return normalizePoint([px, py]);
}

function clipPolygonToBoundary(subjectPolygon, boundary) {
  const clipPolygon = cleanPolygon(boundary);
  let output = cleanPolygon(subjectPolygon);
  if (clipPolygon.length < 3 || output.length < 3) return output;

  const clockwise = signedPolygonArea(clipPolygon) < 0;
  for (let index = 0; index < clipPolygon.length; index += 1) {
    const edgeStart = clipPolygon[index];
    const edgeEnd = clipPolygon[(index + 1) % clipPolygon.length];
    const input = output;
    output = [];
    if (!input.length) break;

    let previous = input[input.length - 1];
    for (const current of input) {
      const currentInside = isInsideClipEdge(current, edgeStart, edgeEnd, clockwise);
      const previousInside = isInsideClipEdge(previous, edgeStart, edgeEnd, clockwise);
      if (currentInside) {
        if (!previousInside) output.push(lineIntersection(previous, current, edgeStart, edgeEnd));
        output.push(current);
      } else if (previousInside) {
        output.push(lineIntersection(previous, current, edgeStart, edgeEnd));
      }
      previous = current;
    }
    output = cleanPolygon(output);
  }

  return cleanPolygon(output);
}

function polygonChangedByClipping(original, clipped) {
  const source = cleanPolygon(original);
  const next = cleanPolygon(clipped);
  if (source.length !== next.length) return true;
  return source.some((point, index) => !samePoint(point, next[index]));
}

function pointOnSegment(point, start, end, tolerance = 0.5) {
  const px = Number(point[0]);
  const py = Number(point[1]);
  const x1 = Number(start[0]);
  const y1 = Number(start[1]);
  const x2 = Number(end[0]);
  const y2 = Number(end[1]);
  const cross = Math.abs((py - y1) * (x2 - x1) - (px - x1) * (y2 - y1));
  const length = Math.hypot(x2 - x1, y2 - y1) || 1;
  if (cross / length > tolerance) return false;
  return px >= Math.min(x1, x2) - tolerance
    && px <= Math.max(x1, x2) + tolerance
    && py >= Math.min(y1, y2) - tolerance
    && py <= Math.max(y1, y2) + tolerance;
}

function pointInPolygon(point, polygon = []) {
  if (!Array.isArray(polygon) || polygon.length < 3) return false;
  for (let index = 0; index < polygon.length; index += 1) {
    if (pointOnSegment(point, polygon[index], polygon[(index + 1) % polygon.length])) return true;
  }

  const x = Number(point[0]);
  const y = Number(point[1]);
  let inside = false;
  for (let index = 0, previousIndex = polygon.length - 1; index < polygon.length; previousIndex = index, index += 1) {
    const xi = Number(polygon[index][0]);
    const yi = Number(polygon[index][1]);
    const xj = Number(polygon[previousIndex][0]);
    const yj = Number(polygon[previousIndex][1]);
    const intersects = ((yi > y) !== (yj > y))
      && (x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1) + xi);
    if (intersects) inside = !inside;
  }
  return inside;
}

function furnitureBox(furniture) {
  const width = Math.max(1, Number(furniture?.size?.width || 0));
  const depth = Math.max(1, Number(furniture?.size?.depth || 0));
  const x = Number(furniture?.position?.[0] || 0);
  const y = Number(furniture?.position?.[1] || 0);
  return {
    minX: x - width / 2,
    minY: y - depth / 2,
    maxX: x + width / 2,
    maxY: y + depth / 2,
    width,
    depth
  };
}

function furnitureBoxCorners(box) {
  return [
    [box.minX, box.minY],
    [box.maxX, box.minY],
    [box.maxX, box.maxY],
    [box.minX, box.maxY]
  ];
}

function furnitureBoxInsidePolygon(furniture, polygon) {
  const box = furnitureBox(furniture);
  return furnitureBoxCorners(box).every(point => pointInPolygon(point, polygon));
}

function boxesOverlap(a, b, padding = 120) {
  return a.minX < b.maxX + padding
    && a.maxX + padding > b.minX
    && a.minY < b.maxY + padding
    && a.maxY + padding > b.minY;
}

function validateFurniturePlacement(furniture = [], zones = []) {
  const issues = [];
  const zoneById = new Map(zones.map(zone => [zone.id, zone]));

  for (const item of furniture) {
    const zone = zoneById.get(item.zoneId);
    if (!zone) {
      issues.push({
        code: "furniture_missing_zone",
        status: "warn",
        severity: "warning",
        message: `${item.label || item.id} 未关联有效功能区。`,
        elementIds: [item.id]
      });
      continue;
    }

    if (!furnitureBoxInsidePolygon(item, zone.polygon)) {
      issues.push({
        code: "furniture_outside_zone",
        status: "warn",
        severity: "warning",
        message: `${item.label || item.id} 的尺寸盒超出所属功能区边界。`,
        targetId: zone.id,
        elementIds: [item.id]
      });
    }
  }

  for (let index = 0; index < furniture.length; index += 1) {
    const first = furniture[index];
    const firstBox = furnitureBox(first);
    for (let nextIndex = index + 1; nextIndex < furniture.length; nextIndex += 1) {
      const second = furniture[nextIndex];
      if (first.zoneId !== second.zoneId) continue;
      if (boxesOverlap(firstBox, furnitureBox(second))) {
        issues.push({
          code: "furniture_overlap",
          status: "warn",
          severity: "warning",
          message: `${first.label || first.id} 与 ${second.label || second.id} 的尺寸盒存在重叠或净距不足。`,
          targetId: first.zoneId,
          elementIds: [first.id, second.id]
        });
      }
    }
  }

  return issues;
}

function boxFromPolygon(polygon) {
  const box = boundingBoxOfPolygon(polygon);
  return {
    minX: box.minX,
    minY: box.minY,
    maxX: box.maxX,
    maxY: box.maxY,
    width: box.width,
    height: box.height
  };
}

function boxFromFixedElement(element) {
  const geometry = element?.geometry || {};
  if (geometry.kind === "polygon" && Array.isArray(geometry.coordinates)) {
    return boxFromPolygon(geometry.coordinates);
  }
  if (geometry.kind === "point" && Array.isArray(geometry.coordinates)) {
    const size = Number(element.size || element.width || 700);
    const x = Number(geometry.coordinates[0]);
    const y = Number(geometry.coordinates[1]);
    return {
      minX: x - size / 2,
      minY: y - size / 2,
      maxX: x + size / 2,
      maxY: y + size / 2,
      width: size,
      height: size
    };
  }
  return null;
}

function entranceClearanceBox(entrance, constraints = {}) {
  const depth = Number(constraints.doorClearanceDepth || 1200);
  const width = Number(entrance.width || 1600);
  const [x, y] = entrance.position || [0, 0];
  const side = entrance.side || "";
  if (side === "west") {
    return { minX: x, minY: y - width / 2, maxX: x + depth, maxY: y + width / 2, width: depth, height: width };
  }
  if (side === "east") {
    return { minX: x - depth, minY: y - width / 2, maxX: x, maxY: y + width / 2, width: depth, height: width };
  }
  if (side === "north") {
    return { minX: x - width / 2, minY: y, maxX: x + width / 2, maxY: y + depth, width, height: depth };
  }
  if (side === "south") {
    return { minX: x - width / 2, minY: y - depth, maxX: x + width / 2, maxY: y, width, height: depth };
  }
  return {
    minX: x - depth / 2,
    minY: y - depth / 2,
    maxX: x + depth / 2,
    maxY: y + depth / 2,
    width: depth,
    height: depth
  };
}

function boxesIntersect(a, b) {
  return a.minX < b.maxX
    && a.maxX > b.minX
    && a.minY < b.maxY
    && a.maxY > b.minY;
}

function validateDoorAndColumnAvoidance(scheme = {}, project = {}) {
  const issues = [];
  const furniture = scheme.furniture || [];
  const constraints = project.constraints || {};
  const entrances = project.site?.entrances || [];
  const columnElements = (project.site?.fixedElements || []).filter(element => element.type === "column");

  if (constraints.keepDoorClearance !== false) {
    for (const entrance of entrances) {
      const clearance = entranceClearanceBox(entrance, constraints);
      for (const item of furniture) {
        if (boxesIntersect(furnitureBox(item), clearance)) {
          issues.push({
            code: "door_clearance_conflict",
            status: "warn",
            severity: "warning",
            message: `${item.label || item.id} 占用了 ${entrance.label || entrance.id} 的门洞净空。`,
            targetId: entrance.id,
            elementIds: [item.id]
          });
        }
      }
    }
  }

  if (constraints.avoidColumns !== false) {
    for (const column of columnElements) {
      const columnBox = boxFromFixedElement(column);
      if (!columnBox) continue;
      for (const item of furniture) {
        if (boxesIntersect(furnitureBox(item), columnBox)) {
          issues.push({
            code: "column_collision",
            status: "warn",
            severity: "warning",
            message: `${item.label || item.id} 与 ${column.label || column.id} 的结构柱范围冲突。`,
            targetId: column.id,
            elementIds: [item.id]
          });
        }
      }
    }
  }

  return issues;
}

function highestTrafficEntrance(project) {
  return [...(project?.site?.entrances || [])]
    .sort((a, b) => Number(b.trafficWeight || 0) - Number(a.trafficWeight || 0))[0] || null;
}

const schemeZoneColors = {
  social: "#bff4ee",
  soft_seating: "#f7dce9",
  work_lounge: "#dcdcff",
  bar: "#eadfce",
  service: "#e4e4e4",
  display: "#ffe3ba",
  retail_loop: "#d9ecff",
  event_core: "#f3edc7",
  flexible: "#e3f5d7",
  loose_seating: "#f6dfe7"
};

function zoneBlueprintsForStrategy(strategy = {}) {
  const tags = new Set(strategy.conceptTags || []);
  if (tags.has("quiet_zone") || tags.has("work_lounge")) {
    return [
      ["social", "轻社交区"],
      ["work_lounge", "安静工作卡座"],
      ["soft_seating", "舒适软座区"]
    ];
  }
  if (tags.has("display_frontage") || tags.has("brand_wall")) {
    return [
      ["display", "入口展示面"],
      ["bar", "吧台/服务区"],
      ["soft_seating", "停留软座区"]
    ];
  }
  if (tags.has("retail_loop") || tags.has("storytelling")) {
    return [
      ["display", "序列展示区"],
      ["retail_loop", "浏览回路区"],
      ["social", "转化停留区"]
    ];
  }
  if (tags.has("flexible_core") || tags.has("event_mode")) {
    return [
      ["social", "入口社交区"],
      ["event_core", "弹性活动核心"],
      ["bar", "运营服务区"]
    ];
  }
  if (tags.has("compact_back_of_house") || tags.has("service_efficiency")) {
    return [
      ["social", "前场停留区"],
      ["bar", "压缩服务吧台"],
      ["soft_seating", "高效客座区"]
    ];
  }
  if (tags.has("low_cost") || tags.has("loose_furniture")) {
    return [
      ["loose_seating", "松动家具区"],
      ["social", "低成本社交区"],
      ["bar", "轻量服务点"]
    ];
  }
  return [
    ["social", "阳光 social 区"],
    ["bar", "吧台服务区"],
    ["soft_seating", "舒适软座区"]
  ];
}

function orderedZoneBlueprints(strategy, project) {
  const blueprints = zoneBlueprintsForStrategy(strategy);
  const tags = new Set(strategy?.conceptTags || []);
  const entrance = highestTrafficEntrance(project);
  const strongestSide = entrance?.side || "";
  if ((tags.has("social_front") || tags.has("entry_activation")) && strongestSide === "east") {
    return [...blueprints].reverse();
  }
  if (tags.has("mall_entry")) {
    const displayIndex = blueprints.findIndex(([type]) => type === "display");
    if (displayIndex >= 0 && strongestSide === "east") {
      const next = [...blueprints];
      const [display] = next.splice(displayIndex, 1);
      next.push(display);
      return next;
    }
  }
  return blueprints;
}

function capacityForZone(type, area) {
  const sqm = area / 1000000;
  if (["social", "soft_seating", "loose_seating"].includes(type)) return Math.max(4, Math.round(sqm / 1.6));
  if (type === "work_lounge") return Math.max(4, Math.round(sqm / 2.2));
  if (type === "event_core") return Math.max(8, Math.round(sqm / 2.5));
  if (type === "bar") return 4;
  return 0;
}

function zonesForStrategy(project, strategy) {
  const box = boundingBoxOfPolygon(project?.site?.boundary);
  const boundary = project?.site?.boundary;
  const margin = clampNumber(Math.min(box.width, box.height) * 0.08, 600, 1100, 800);
  const gap = clampNumber(box.width * 0.025, 320, 680, 520);
  const usableWidth = Math.max(1800, box.width - margin * 2 - gap * 2);
  const y = box.minY + Math.max(margin, box.height * 0.58);
  const height = Math.max(1200, Math.min(box.height * 0.32, box.maxY - y - margin));
  const widths = [0.28, 0.32, 0.32].map(ratio => usableWidth * ratio);
  const blueprints = orderedZoneBlueprints(strategy, project);
  const starts = [
    box.minX + margin,
    box.minX + margin + widths[0] + gap,
    box.minX + margin + widths[0] + widths[1] + gap * 2
  ];

  return blueprints.map(([type, label], index) => {
    const polygon = rectPolygon(starts[index], y, widths[index], height, box);
    const clippedPolygon = clipPolygonToBoundary(polygon, boundary);
    const hasClipping = polygonChangedByClipping(polygon, clippedPolygon);
    const finalPolygon = clippedPolygon.length >= 3 ? clippedPolygon : polygon;
    const area = Math.round(areaOfPolygon(finalPolygon));
    const hint = (strategy.placementHints || [])[index] || strategy.summary || "由策略草案生成的功能区。";
    return {
      id: `zone_${type}_${index + 1}`,
      type,
      label,
      polygon: finalPolygon,
      color: schemeZoneColors[type] || "#e8efe9",
      area,
      capacity: capacityForZone(type, area),
      rationale: hasClipping ? `${hint} 已按可设计边界裁剪。` : hint,
      locked: false,
      source: hasClipping ? "geometry_engine" : "ai_strategy"
    };
  }).filter(zone => zone.polygon.length >= 3 && zone.area > 0);
}

function furnitureTypeForZone(type) {
  return {
    social: ["round_table", "shared_table"],
    soft_seating: ["sofa", "low_table"],
    loose_seating: ["movable_table", "loose_chair"],
    work_lounge: ["work_table", "task_chair"],
    bar: ["service_counter", "back_bar"],
    service: ["service_counter"],
    display: ["display_shelf", "brand_wall"],
    retail_loop: ["display_shelf", "feature_table"],
    event_core: ["movable_table", "stackable_chair"],
    flexible: ["movable_table"]
  }[type] || ["loose_table"];
}

function fittedFurnitureForZone(candidate, zone) {
  if (furnitureBoxInsidePolygon(candidate, zone.polygon)) return candidate;

  const zoneBox = boundingBoxOfPolygon(zone.polygon);
  const centered = {
    ...candidate,
    position: centerOfPolygon(zone.polygon),
    size: {
      width: Math.min(candidate.size.width, Math.max(300, zoneBox.width * 0.28)),
      depth: Math.min(candidate.size.depth, Math.max(300, zoneBox.height * 0.28))
    }
  };
  if (furnitureBoxInsidePolygon(centered, zone.polygon)) return centered;

  return {
    ...centered,
    size: {
      width: Math.min(centered.size.width, 420),
      depth: Math.min(centered.size.depth, 420)
    }
  };
}

function furnitureForZones(zones) {
  return zones.flatMap((zone, zoneIndex) => {
    const box = boundingBoxOfPolygon(zone.polygon);
    const types = furnitureTypeForZone(zone.type).slice(0, 2);
    return types.map((type, index) => {
      const slot = (index + 1) / (types.length + 1);
      const position = [
        Math.round(clampNumber(box.minX + box.width * slot, box.minX + 300, box.maxX - 300, box.minX + box.width * 0.5)),
        Math.round(clampNumber(box.minY + box.height * 0.5, box.minY + 300, box.maxY - 300, box.minY + box.height * 0.5))
      ];
      const isCounter = type.includes("counter") || type.includes("bar") || type.includes("wall");
      const candidate = {
        id: `furn_${zoneIndex + 1}_${index + 1}`,
        type,
        label: isCounter ? "服务/展示构件" : "可移动家具",
        position,
        size: isCounter
          ? { width: Math.round(Math.min(1800, box.width * 0.34)), depth: 600 }
          : { width: Math.round(Math.min(820, box.width * 0.24)), depth: Math.round(Math.min(820, box.height * 0.34)) },
        rotation: isCounter ? 0 : 15 * index,
        zoneId: zone.id,
        capacity: isCounter ? 0 : Math.max(2, Math.min(6, Math.round((zone.capacity || 4) / 3))),
        source: "ai_strategy"
      };
      return fittedFurnitureForZone(candidate, zone);
    });
  });
}

function arrowsForStrategy(project) {
  const box = boundingBoxOfPolygon(project?.site?.boundary);
  const entrances = project?.site?.entrances || [];
  if (entrances.length >= 2) {
    return [{
      id: "flow_main",
      type: "circulation",
      points: entrances.slice(0, 2).map(entrance => entrance.position),
      label: "主客流动线"
    }];
  }
  return [{
    id: "flow_main",
    type: "circulation",
    points: [
      [Math.round(box.minX + box.width * 0.06), Math.round(box.minY + box.height * 0.5)],
      [Math.round(box.maxX - box.width * 0.06), Math.round(box.minY + box.height * 0.5)]
    ],
    label: "主通道"
  }];
}

function annotationsForStrategy(strategy, zones, project) {
  const box = boundingBoxOfPolygon(project?.site?.boundary);
  const primaryZone = zones[0];
  const primaryCenter = primaryZone ? centerOfPolygon(primaryZone.polygon) : [box.minX, box.minY];
  return [
    {
      id: "note_strategy",
      text: strategy.summary || "AI 策略草案已转为可编辑方案 JSON。",
      position: [primaryCenter[0], Math.round(primaryCenter[1] + box.height * 0.18)],
      targetId: primaryZone?.id,
      style: "red-note"
    },
    {
      id: "note_validation",
      text: "当前为 MVP 模板几何，后续需进行边界裁剪、碰撞和门柱避让校验。",
      position: [Math.round(box.minX + box.width * 0.5), Math.round(box.minY + box.height * 0.12)],
      style: "warning-note"
    }
  ];
}

function sanitizedScores(scores = {}) {
  return {
    circulation: clampNumber(scores.circulation, 0, 10, 7),
    capacity: clampNumber(scores.capacity, 0, 10, 7),
    display: clampNumber(scores.display, 0, 10, 7),
    cost: clampNumber(scores.cost, 0, 10, 6),
    feasibility: clampNumber(scores.feasibility, 0, 10, 7)
  };
}

function schemeFromStrategy(project, strategy, run = null, options = {}) {
  const zones = zonesForStrategy(project, strategy);
  const furniture = furnitureForZones(zones);
  const furnitureIssues = validateFurniturePlacement(furniture, zones);
  const constraintIssues = validateDoorAndColumnAvoidance({ furniture }, project);
  const hasBoundaryClipping = zones.some(zone => zone.source === "geometry_engine");
  const referenceCaseIds = Array.isArray(strategy?.referenceCaseIds) && strategy.referenceCaseIds.length
    ? strategy.referenceCaseIds
    : run?.retrieval?.referenceCaseIds || [];

  return {
    schemaVersion: "0.1.0",
    schemeId: options.schemeId || makeId("scheme"),
    projectId: project.projectId || "ad_hoc_project",
    projectRevision: project.updatedAt || project.createdAt || nowIso(),
    name: options.name || strategy.name || `${project.name || "未命名项目"} - AI 策略方案`,
    status: "draft",
    origin: {
      source: "ai_strategy",
      ...(run?.runId ? { llmRunId: run.runId } : {}),
      referenceCaseIds
    },
    strategy: {
      summary: strategy.summary || "由 AI 策略草案生成的方案 JSON。",
      conceptTags: strategy.conceptTags || [],
      rationale: strategy.rationale || "基于当前项目条件、用户 brief 和参考案例生成。",
      tradeoffs: strategy.tradeoffs || [],
      assumptions: strategy.assumptions || ["边界、入口、柱子和后场需要用户确认。"],
      placementHints: strategy.placementHints || []
    },
    caseRefs: referenceCaseIds,
    zones,
    furniture,
    arrows: arrowsForStrategy(project),
    annotations: annotationsForStrategy(strategy, zones, project),
    scores: sanitizedScores(strategy.scoreBias),
    validation: {
      overallStatus: "warn",
      blockers: [],
      warnings: [
        {
          code: "mvp_geometry_placeholder",
          status: "warn",
          severity: "warning",
          message: "该方案由策略草案转换而来，当前为基础边界裁剪后的模板几何；正式输出前仍需要碰撞、门洞净空和柱子避让校验。"
        },
        ...(hasBoundaryClipping ? [{
          code: "boundary_clipping_applied",
          status: "warn",
          severity: "info",
          message: "部分功能区已按项目可设计边界进行多边形裁剪。"
        }] : []),
        ...furnitureIssues,
        ...constraintIssues
      ]
    }
  };
}

async function persistScheme(scheme) {
  const schemesStore = await readSchemesStore();
  schemesStore.schemes = [
    scheme,
    ...(schemesStore.schemes || []).filter(item => item.schemeId !== scheme.schemeId)
  ];
  await writeSchemesStore(schemesStore);
}

async function persistSchemeVersion(scheme, input = {}) {
  const store = await readSchemeVersionsStore();
  const createdAt = nowIso();
  const existingCount = (store.versions || []).filter(version => version.schemeId === scheme.schemeId).length;
  const version = {
    versionId: makeId("version"),
    schemeId: scheme.schemeId,
    projectId: scheme.projectId,
    createdAt,
    label: input.label || `v${existingCount + 1}`,
    note: input.note || "",
    scheme
  };
  store.versions = [
    version,
    ...(store.versions || [])
  ].slice(0, 200);
  await writeSchemeVersionsStore(store);
  return version;
}

function findStrategy(run, strategyId) {
  const strategies = run?.strategies || [];
  if (!strategies.length) return null;
  if (!strategyId) return strategies[0];
  return strategies.find(strategy => strategy.strategyId === strategyId) || null;
}

async function projectForStrategyRun(run, fallbackProject = null) {
  if (fallbackProject) return fallbackProject;
  const store = await readProjectsStore();
  const project = (store.projects || []).find(item => item.projectId === run?.projectId);
  if (project) return project;
  const sample = await readJson("samples/schema-examples/project.example.json");
  if (!run?.projectId || run.projectId === sample.projectId || run.projectId === "ad_hoc_project") return sample;
  return null;
}

function escapeXml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&apos;"
  })[character]);
}

function exportBoundsForScheme(scheme) {
  const points = [
    ...(scheme.zones || []).flatMap(zone => zone.polygon || []),
    ...(scheme.arrows || []).flatMap(arrow => arrow.points || []),
    ...(scheme.furniture || []).map(item => item.position),
    ...(scheme.annotations || []).map(item => item.position)
  ].filter(isPoint);
  const box = boundingBoxOfPolygon(points.length ? points : [[0, 0], [22000, 0], [22000, 9000], [0, 9000]]);
  const pad = Math.max(600, Math.min(box.width, box.height) * 0.08);
  return {
    minX: Math.floor(box.minX - pad),
    minY: Math.floor(box.minY - pad),
    width: Math.ceil(box.width + pad * 2),
    height: Math.ceil(box.height + pad * 2)
  };
}

function polygonPointsAttribute(polygon = []) {
  return polygon.map(point => `${Number(point[0]).toFixed(1)},${Number(point[1]).toFixed(1)}`).join(" ");
}

function schemeToSvg(scheme) {
  const bounds = exportBoundsForScheme(scheme);
  const zoneSvg = (scheme.zones || []).map(zone => `
    <polygon points="${polygonPointsAttribute(zone.polygon)}" fill="${escapeXml(zone.color || "#dfeee8")}" fill-opacity="0.55" stroke="#17211d" stroke-width="36" stroke-dasharray="140 90"/>
    <text x="${centerOfPolygon(zone.polygon)[0]}" y="${centerOfPolygon(zone.polygon)[1]}" text-anchor="middle" dominant-baseline="middle" font-size="260" fill="#17211d">${escapeXml(zone.label)}</text>
  `).join("");
  const furnitureSvg = (scheme.furniture || []).map(item => {
    const box = furnitureBox(item);
    return `
      <rect x="${box.minX.toFixed(1)}" y="${box.minY.toFixed(1)}" width="${box.width.toFixed(1)}" height="${box.depth.toFixed(1)}" fill="#fffdf8" stroke="#5877a6" stroke-width="28"/>
      <text x="${item.position[0]}" y="${item.position[1]}" text-anchor="middle" dominant-baseline="middle" font-size="180" fill="#5877a6">${escapeXml(item.label || item.type)}</text>
    `;
  }).join("");
  const arrowSvg = (scheme.arrows || []).map(arrow => `
    <polyline points="${polygonPointsAttribute(arrow.points)}" fill="none" stroke="#d96d4f" stroke-width="42" stroke-dasharray="180 120"/>
    <text x="${arrow.points?.[0]?.[0] || bounds.minX}" y="${(arrow.points?.[0]?.[1] || bounds.minY) - 180}" font-size="220" fill="#d96d4f">${escapeXml(arrow.label || arrow.type)}</text>
  `).join("");
  const annotationSvg = (scheme.annotations || []).map(note => `
    <text x="${note.position[0]}" y="${note.position[1]}" font-size="210" fill="#d96d4f">${escapeXml(note.text)}</text>
  `).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${bounds.width}" height="${bounds.height}" viewBox="${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}">
  <rect x="${bounds.minX}" y="${bounds.minY}" width="${bounds.width}" height="${bounds.height}" fill="#fffdf8"/>
  <text x="${bounds.minX + 400}" y="${bounds.minY + 520}" font-size="320" fill="#17211d">${escapeXml(scheme.name)}</text>
  <g id="zones">${zoneSvg}</g>
  <g id="furniture">${furnitureSvg}</g>
  <g id="arrows">${arrowSvg}</g>
  <g id="annotations">${annotationSvg}</g>
</svg>`;
}

function dxfPolyline(points = [], closed = false, layer = "0") {
  const flags = closed ? 1 : 0;
  return [
    "0", "LWPOLYLINE",
    "8", layer,
    "90", String(points.length),
    "70", String(flags),
    ...points.flatMap(point => ["10", String(Number(point[0]).toFixed(3)), "20", String(Number(point[1]).toFixed(3))])
  ].join("\n");
}

function dxfText(text, position, layer = "TEXT", height = 260) {
  return [
    "0", "TEXT",
    "8", layer,
    "10", String(Number(position[0]).toFixed(3)),
    "20", String(Number(position[1]).toFixed(3)),
    "40", String(height),
    "1", String(text || "").replace(/\n/g, " ")
  ].join("\n");
}

function schemeToDxf(scheme) {
  const entities = [];
  for (const zone of scheme.zones || []) {
    entities.push(dxfPolyline(zone.polygon || [], true, "ZONES"));
    entities.push(dxfText(zone.label, centerOfPolygon(zone.polygon), "ZONE_LABELS", 260));
  }
  for (const item of scheme.furniture || []) {
    const box = furnitureBox(item);
    entities.push(dxfPolyline([
      [box.minX, box.minY],
      [box.maxX, box.minY],
      [box.maxX, box.maxY],
      [box.minX, box.maxY]
    ], true, "FURNITURE"));
    entities.push(dxfText(item.label || item.type, item.position, "FURNITURE_LABELS", 180));
  }
  for (const arrow of scheme.arrows || []) entities.push(dxfPolyline(arrow.points || [], false, "FLOW"));
  for (const note of scheme.annotations || []) entities.push(dxfText(note.text, note.position, "NOTES", 180));
  return ["0", "SECTION", "2", "ENTITIES", ...entities, "0", "ENDSEC", "0", "EOF"].join("\n");
}

function escapePdfText(value) {
  return String(value ?? "").replace(/[\\()]/g, "\\$&");
}

function schemeToPdf(scheme) {
  const lines = [
    scheme.name,
    `Scheme ID: ${scheme.schemeId}`,
    `Status: ${scheme.status}`,
    `Scores: circulation ${scheme.scores?.circulation}, capacity ${scheme.scores?.capacity}, display ${scheme.scores?.display}, cost ${scheme.scores?.cost}, feasibility ${scheme.scores?.feasibility}`,
    `Zones: ${(scheme.zones || []).map(zone => zone.label).join(", ")}`,
    `Furniture: ${(scheme.furniture || []).length}`,
    `Validation: ${scheme.validation?.overallStatus || "warn"}`,
    scheme.strategy?.summary || ""
  ].filter(Boolean).slice(0, 9);
  const textOps = lines.map((line, index) => `BT /F1 ${index === 0 ? 18 : 11} Tf 54 ${760 - index * 32} Td (${escapePdfText(line)}) Tj ET`).join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(textOps)} >>\nstream\n${textOps}\nendstream`
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Root 1 0 R /Size ${objects.length + 1} >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "utf8");
}

function safeStaticPath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  if (decoded.includes("..")) return null;

  if (decoded === "/" || decoded === "/index.html") {
    return path.join(webDir, "index.html");
  }

  if (decoded.startsWith("/assets/")) {
    return path.join(rootDir, decoded.slice(1));
  }

  if (decoded.startsWith("/schemas/") || decoded.startsWith("/samples/")) {
    return path.join(rootDir, decoded.slice(1));
  }

  return path.join(webDir, decoded.replace(/^\//, ""));
}

async function handleApi(request, response, url) {
  if (request.method === "GET" && url.pathname === "/api/health") {
    sendJson(response, 200, {
      ok: true,
      app: "commercial-space-ai",
      version: "0.1.0"
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/schemas") {
    sendJson(response, 200, {
      project: "/schemas/project.schema.json",
      scheme: "/schemas/scheme.schema.json",
      case: "/schemas/case.schema.json",
      revitImport: "/schemas/revit-import.schema.json"
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/sample/project") {
    sendJson(response, 200, await readJson("samples/schema-examples/project.example.json"));
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/sample/scheme") {
    sendJson(response, 200, await readJson("samples/schema-examples/scheme.example.json"));
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/strategies/generate") {
    const input = await readRequestJson(request);
    const project = input.project || await readJson("samples/schema-examples/project.example.json");
    const casesStore = await readCasesStore();
    const run = createStrategyRun(project, casesStore.cases || [], {
      brief: input.brief,
      count: input.generateCount || input.count || project?.brief?.generateCount
    });
    if (input.persist !== false) await persistStrategyRun(run);
    sendJson(response, 201, run);
    return;
  }

  const strategyRunMatch = url.pathname.match(/^\/api\/strategy-runs\/([^/]+)$/);
  if (request.method === "GET" && strategyRunMatch) {
    const store = await readStrategyRunsStore();
    const run = (store.strategyRuns || []).find(item => item.runId === strategyRunMatch[1]);
    if (!run) {
      sendJson(response, 404, { error: "Strategy run not found" });
      return;
    }
    sendJson(response, 200, run);
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/schemes/from-strategy") {
    const input = await readRequestJson(request);
    const project = input.project || await readJson("samples/schema-examples/project.example.json");
    const strategy = input.strategy;
    if (!strategy?.strategyId) {
      sendJson(response, 400, { error: "strategy.strategyId is required" });
      return;
    }

    const scheme = schemeFromStrategy(project, strategy, input.run || null, {
      name: input.name
    });
    try {
      validateSchemeInput(scheme);
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Invalid generated scheme JSON"
      });
      return;
    }

    await persistScheme(scheme);
    sendJson(response, 201, {
      status: "scheme_created_from_strategy",
      schemeId: scheme.schemeId,
      runId: input.run?.runId,
      strategyId: strategy.strategyId,
      scheme
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/geometry/validate-furniture") {
    const input = await readRequestJson(request);
    const scheme = input.scheme;
    if (!scheme) {
      sendJson(response, 400, { error: "scheme is required" });
      return;
    }
    try {
      validateSchemeInput(scheme);
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Invalid scheme JSON"
      });
      return;
    }
    const issues = validateFurniturePlacement(scheme.furniture || [], scheme.zones || []);
    sendJson(response, 200, {
      status: issues.length ? "warn" : "pass",
      issueCount: issues.length,
      issues
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/geometry/validate-constraints") {
    const input = await readRequestJson(request);
    const scheme = input.scheme;
    const project = input.project || await readJson("samples/schema-examples/project.example.json");
    if (!scheme) {
      sendJson(response, 400, { error: "scheme is required" });
      return;
    }
    try {
      validateSchemeInput(scheme);
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Invalid scheme JSON"
      });
      return;
    }
    const issues = validateDoorAndColumnAvoidance(scheme, project);
    sendJson(response, 200, {
      status: issues.length ? "warn" : "pass",
      issueCount: issues.length,
      issues
    });
    return;
  }

  const strategySchemeMatch = url.pathname.match(/^\/api\/strategies\/([^/]+)\/schemes$/);
  if (request.method === "POST" && strategySchemeMatch) {
    const input = await readRequestJson(request);
    const store = await readStrategyRunsStore();
    const run = (store.strategyRuns || []).find(item => item.runId === strategySchemeMatch[1]);
    if (!run) {
      sendJson(response, 404, { error: "Strategy run not found" });
      return;
    }

    const strategy = findStrategy(run, input.strategyId);
    if (!strategy) {
      sendJson(response, 404, { error: "Strategy not found in run" });
      return;
    }

    const project = await projectForStrategyRun(run, input.project || null);
    if (!project) {
      sendJson(response, 404, {
        error: "Project not found for strategy run; include project in request body for ad-hoc conversion."
      });
      return;
    }

    const scheme = schemeFromStrategy(project, strategy, run, {
      name: input.name
    });
    try {
      validateSchemeInput(scheme);
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Invalid generated scheme JSON"
      });
      return;
    }

    await persistScheme(scheme);
    sendJson(response, 201, {
      status: "scheme_created_from_strategy",
      schemeId: scheme.schemeId,
      runId: run.runId,
      strategyId: strategy.strategyId,
      scheme
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/cases") {
    const store = await readCasesStore();
    const cases = filterCases(store.cases || [], url.searchParams);
    sendJson(response, 200, summarizeCaseStore(cases));
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/cases/import-seed") {
    const seed = await readJson("samples/seed-cases.json");
    const seedCases = Array.isArray(seed.cases) ? seed.cases : [];
    try {
      for (const caseItem of seedCases) validateCaseInput(caseItem);
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Invalid seed case JSON"
      });
      return;
    }

    const store = await readCasesStore();
    const previousIds = new Set((store.cases || []).map(caseItem => caseItem.caseId));
    const seedIds = new Set(seedCases.map(caseItem => caseItem.caseId));
    const remainingCases = (store.cases || []).filter(caseItem => !seedIds.has(caseItem.caseId));
    const imported = seedCases.filter(caseItem => !previousIds.has(caseItem.caseId)).length;
    store.cases = [...seedCases, ...remainingCases];
    await writeCasesStore(store);
    sendJson(response, 201, {
      status: "seed_cases_imported",
      imported,
      updated: seedCases.length - imported,
      total: store.cases.length,
      ...summarizeCaseStore(store.cases)
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/cases") {
    const input = await readRequestJson(request);
    const caseItem = input.case || input;
    try {
      validateCaseInput(caseItem);
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Invalid case JSON"
      });
      return;
    }

    const store = await readCasesStore();
    const exists = (store.cases || []).some(item => item.caseId === caseItem.caseId);
    store.cases = [
      caseItem,
      ...(store.cases || []).filter(item => item.caseId !== caseItem.caseId)
    ];
    await writeCasesStore(store);
    sendJson(response, exists ? 200 : 201, {
      status: exists ? "case_updated" : "case_created",
      caseId: caseItem.caseId,
      case: caseItem
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/cases/retrieve") {
    const input = await readRequestJson(request);
    const project = input.project || await readJson("samples/schema-examples/project.example.json");
    const store = await readCasesStore();
    const result = retrieveSimilarCases(project, store.cases || [], {
      brief: input.brief,
      limit: input.limit
    });
    sendJson(response, 200, result);
    return;
  }

  const caseMatch = url.pathname.match(/^\/api\/cases\/([^/]+)$/);
  if (request.method === "GET" && caseMatch) {
    const store = await readCasesStore();
    const caseItem = (store.cases || []).find(item => item.caseId === caseMatch[1]);
    if (!caseItem) {
      sendJson(response, 404, { error: "Case not found" });
      return;
    }
    sendJson(response, 200, caseItem);
    return;
  }

  const projectRetrievalMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/retrieve-cases$/);
  if (request.method === "GET" && projectRetrievalMatch) {
    const projectsStore = await readProjectsStore();
    const project = projectsStore.projects.find(item => item.projectId === projectRetrievalMatch[1]);
    if (!project) {
      sendJson(response, 404, { error: "Project not found" });
      return;
    }

    const casesStore = await readCasesStore();
    const result = retrieveSimilarCases(project, casesStore.cases || [], {
      brief: url.searchParams.get("brief") || "",
      limit: url.searchParams.get("limit") || 5
    });
    sendJson(response, 200, result);
    return;
  }

  if (request.method === "POST" && projectRetrievalMatch) {
    const input = await readRequestJson(request);
    const projectsStore = await readProjectsStore();
    const project = projectsStore.projects.find(item => item.projectId === projectRetrievalMatch[1]);
    if (!project) {
      sendJson(response, 404, { error: "Project not found" });
      return;
    }

    const casesStore = await readCasesStore();
    const result = retrieveSimilarCases(project, casesStore.cases || [], {
      brief: input.brief,
      limit: input.limit
    });
    sendJson(response, 200, result);
    return;
  }

  const projectStrategyMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/generate-strategies$/);
  if (request.method === "POST" && projectStrategyMatch) {
    const input = await readRequestJson(request);
    const projectsStore = await readProjectsStore();
    const project = projectsStore.projects.find(item => item.projectId === projectStrategyMatch[1]);
    if (!project) {
      sendJson(response, 404, { error: "Project not found" });
      return;
    }

    const casesStore = await readCasesStore();
    const run = createStrategyRun(project, casesStore.cases || [], {
      brief: input.brief,
      count: input.generateCount || input.count || project.brief?.generateCount
    });
    if (input.persist !== false) await persistStrategyRun(run);
    sendJson(response, 201, run);
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/projects/from-revit-import") {
    const input = await readRequestJson(request);
    let project;
    try {
      project = await createProjectFromRevitImport(input);
      validateSitePatch(project.site);
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Invalid Revit import JSON"
      });
      return;
    }
    const store = await readProjectsStore();
    store.projects = [project, ...store.projects.filter(item => item.projectId !== project.projectId)];
    await writeProjectsStore(store);
    sendJson(response, 201, {
      projectId: project.projectId,
      status: "created_from_revit_json",
      next: "confirm_revit_import_constraints",
      project
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/projects") {
    const store = await readProjectsStore();
    sendJson(response, 200, store);
    return;
  }

  const projectSchemesMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/schemes$/);
  if (request.method === "GET" && projectSchemesMatch) {
    const schemesStore = await readSchemesStore();
    sendJson(response, 200, {
      schemes: schemesStore.schemes.filter(scheme => scheme.projectId === projectSchemesMatch[1])
    });
    return;
  }

  if (request.method === "POST" && projectSchemesMatch) {
    const projectsStore = await readProjectsStore();
    const project = projectsStore.projects.find(item => item.projectId === projectSchemesMatch[1]);
    if (!project) {
      sendJson(response, 404, { error: "Project not found" });
      return;
    }

    const input = await readRequestJson(request);
    const scheme = await createSchemeFromInput(project, input);
    try {
      validateSchemeInput(scheme);
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Invalid scheme JSON"
      });
      return;
    }

    const schemesStore = await readSchemesStore();
    schemesStore.schemes = [
      scheme,
      ...schemesStore.schemes.filter(item => item.schemeId !== scheme.schemeId)
    ];
    await writeSchemesStore(schemesStore);
    sendJson(response, 201, {
      schemeId: scheme.schemeId,
      status: "scheme_created",
      scheme
    });
    return;
  }

  const schemeVersionsMatch = url.pathname.match(/^\/api\/schemes\/([^/]+)\/versions$/);
  if (request.method === "GET" && schemeVersionsMatch) {
    const store = await readSchemeVersionsStore();
    const versions = (store.versions || []).filter(version => version.schemeId === schemeVersionsMatch[1]);
    sendJson(response, 200, { versions });
    return;
  }

  if (request.method === "POST" && schemeVersionsMatch) {
    const input = await readRequestJson(request);
    const scheme = input.scheme;
    if (!scheme) {
      sendJson(response, 400, { error: "scheme is required" });
      return;
    }
    if (scheme.schemeId !== schemeVersionsMatch[1]) {
      sendJson(response, 400, { error: "Scheme id cannot change" });
      return;
    }
    try {
      validateSchemeInput(scheme);
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Invalid scheme JSON"
      });
      return;
    }
    const version = await persistSchemeVersion(scheme, {
      label: input.label,
      note: input.note
    });
    sendJson(response, 201, {
      status: "scheme_version_saved",
      versionId: version.versionId,
      schemeId: version.schemeId,
      version
    });
    return;
  }

  const schemeExportMatch = url.pathname.match(/^\/api\/schemes\/([^/]+)\/export\/(json|svg|dxf|pdf)$/);
  if (request.method === "GET" && schemeExportMatch) {
    const schemesStore = await readSchemesStore();
    const scheme = schemesStore.schemes.find(item => item.schemeId === schemeExportMatch[1]);
    if (!scheme) {
      sendJson(response, 404, { error: "Scheme not found" });
      return;
    }
    const format = schemeExportMatch[2];
    const safeName = sanitizeFileName(`${scheme.schemeId}.${format}`);
    if (format === "json") {
      sendDownload(response, 200, "application/json; charset=utf-8", safeName, JSON.stringify(scheme, null, 2));
      return;
    }
    if (format === "svg") {
      sendDownload(response, 200, "image/svg+xml; charset=utf-8", safeName, schemeToSvg(scheme));
      return;
    }
    if (format === "dxf") {
      sendDownload(response, 200, "application/dxf; charset=utf-8", safeName, schemeToDxf(scheme));
      return;
    }
    if (format === "pdf") {
      sendDownload(response, 200, "application/pdf", safeName, schemeToPdf(scheme));
      return;
    }
  }

  const schemeMatch = url.pathname.match(/^\/api\/schemes\/([^/]+)$/);
  if (request.method === "GET" && schemeMatch) {
    const schemesStore = await readSchemesStore();
    const scheme = schemesStore.schemes.find(item => item.schemeId === schemeMatch[1]);
    if (!scheme) {
      sendJson(response, 404, { error: "Scheme not found" });
      return;
    }
    sendJson(response, 200, scheme);
    return;
  }

  if (request.method === "PATCH" && schemeMatch) {
    const input = await readRequestJson(request);
    try {
      validateSchemeInput(input.scheme);
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Invalid scheme JSON"
      });
      return;
    }

    const schemesStore = await readSchemesStore();
    const index = schemesStore.schemes.findIndex(item => item.schemeId === schemeMatch[1]);
    if (index === -1) {
      sendJson(response, 404, { error: "Scheme not found" });
      return;
    }

    if (input.scheme.schemeId !== schemeMatch[1]) {
      sendJson(response, 400, { error: "Scheme id cannot change" });
      return;
    }

    schemesStore.schemes[index] = input.scheme;
    await writeSchemesStore(schemesStore);
    sendJson(response, 200, {
      schemeId: input.scheme.schemeId,
      status: "scheme_updated",
      scheme: input.scheme
    });
    return;
  }

  const uploadMatch = url.pathname.match(/^\/api\/uploads\/([^/]+)$/);
  if (request.method === "GET" && uploadMatch) {
    const storedPath = await findStoredUpload(uploadMatch[1]);
    if (!storedPath || !existsSync(storedPath)) {
      sendJson(response, 404, { error: "Upload not found" });
      return;
    }

    const ext = path.extname(storedPath).toLowerCase();
    response.writeHead(200, {
      "Content-Type": mimeTypes[ext] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    createReadStream(storedPath).pipe(response);
    return;
  }

  const projectMatch = url.pathname.match(/^\/api\/projects\/([^/]+)$/);
  if (request.method === "GET" && projectMatch) {
    const store = await readProjectsStore();
    const project = store.projects.find(item => item.projectId === projectMatch[1]);
    if (!project) {
      sendJson(response, 404, { error: "Project not found" });
      return;
    }
    sendJson(response, 200, project);
    return;
  }

  if (request.method === "PATCH" && projectMatch) {
    const input = await readRequestJson(request);
    try {
      validateSitePatch(input.site);
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Invalid site patch"
      });
      return;
    }

    const store = await readProjectsStore();
    const index = store.projects.findIndex(item => item.projectId === projectMatch[1]);
    if (index === -1) {
      sendJson(response, 404, { error: "Project not found" });
      return;
    }

    const project = store.projects[index];
    const nextSite = {
      ...project.site,
      ...(input.site.boundary !== undefined ? { boundary: input.site.boundary } : {}),
      ...(input.site.entrances !== undefined ? { entrances: input.site.entrances } : {}),
      ...(input.site.fixedElements !== undefined ? { fixedElements: input.site.fixedElements } : {}),
      ...(input.site.candidateBackOfHouse !== undefined ? { candidateBackOfHouse: input.site.candidateBackOfHouse } : {})
    };

    const updated = {
      ...project,
      updatedAt: nowIso(),
      site: nextSite
    };

    store.projects[index] = updated;
    await writeProjectsStore(store);
    sendJson(response, 200, {
      projectId: updated.projectId,
      status: "site_updated",
      project: updated
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/uploads") {
    const input = await readRequestJson(request);
    const fileName = sanitizeFileName(input.fileName);
    const sourceType = sourceTypeFromFile(fileName, input.sourceType);
    const dataBase64 = String(input.dataBase64 || "");
    const mimeType = String(input.mimeType || "application/octet-stream");

    if (!sourceType) {
      sendJson(response, 400, { error: "Unsupported file type", allowed: [...allowedUploadTypes] });
      return;
    }

    if (!dataBase64) {
      sendJson(response, 400, { error: "Missing dataBase64" });
      return;
    }

    const bytes = Buffer.from(dataBase64, "base64");
    if (bytes.length > maxUploadBytes) {
      sendJson(response, 413, { error: "File too large", maxUploadBytes });
      return;
    }

    await ensureDataStore();
    const uploadId = makeId("file");
    const storedName = `${uploadId}-${fileName}`;
    const storedPath = path.join(uploadDir, storedName);
    await writeFile(storedPath, bytes);

    sendJson(response, 201, {
      uploadId,
      fileName,
      sourceType,
      mimeType,
      size: bytes.length,
      storedPath: `.data/uploads/${storedName}`
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/projects") {
    const input = await readRequestJson(request);
    const project = await createProjectFromInput(input);
    const store = await readProjectsStore();
    store.projects = [project, ...store.projects.filter(item => item.projectId !== project.projectId)];
    await writeProjectsStore(store);
    sendJson(response, 201, {
      projectId: project.projectId,
      status: "created",
      next: "confirm_site_constraints",
      project
    });
    return;
  }

  sendJson(response, 404, { error: "API route not found" });
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${request.headers.host}`);

    if (url.pathname.startsWith("/api/")) {
      await handleApi(request, response, url);
      return;
    }

    const staticPath = safeStaticPath(url.pathname);
    if (!staticPath || !existsSync(staticPath)) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    const ext = path.extname(staticPath).toLowerCase();
    response.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
    createReadStream(staticPath).pipe(response);
  } catch (error) {
    sendJson(response, 500, {
      error: "Internal server error",
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

server.listen(port, () => {
  console.log(`Commercial Space AI dev server running at http://127.0.0.1:${port}`);
});
