async function getJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}`);
  }
  return response.json();
}

async function postJson(path, payload) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `${path} returned ${response.status}`);
  }
  return data;
}

async function patchJson(path, payload) {
  const response = await fetch(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `${path} returned ${response.status}`);
  }
  return data;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.onerror = () => reject(reader.error || new Error("File read failed"));
    reader.readAsDataURL(file);
  });
}

const canvasState = {
  scale: 1,
  x: 0,
  y: 0,
  opacity: 0.74,
  isPanning: false,
  startX: 0,
  startY: 0,
  originX: 0,
  originY: 0
};

const previewableImageTypes = new Set(["png", "svg", "manual"]);
const siteMetrics = { width: 22000, height: 9000 };
let currentProject = null;
let currentScheme = null;
let currentSchemes = [];
let currentCases = [];
let currentRetrieval = null;
let currentStrategyRun = null;
let selectedStrategyId = null;
let schemeHistory = [];
let schemeHistoryIndex = -1;
let schemeHistoryTimer = null;
let isApplyingSchemeHistory = false;

const annotationState = {
  activeTool: "pan",
  draftRect: null,
  dirty: false
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[character]);
}

function canLoadUploadedSource(source) {
  return /^file_[a-z0-9]{8,}_[a-z0-9]{6,}$/i.test(source?.fileId || "");
}

function uploadedSourceUrl(source) {
  return canLoadUploadedSource(source) ? `/api/uploads/${encodeURIComponent(source.fileId)}` : null;
}

function updateCanvasTransform() {
  const stage = document.querySelector("#canvasStage");
  stage.style.transform = `translate(${canvasState.x}px, ${canvasState.y}px) scale(${canvasState.scale})`;
  document.querySelector("#zoomValue").textContent = `${Math.round(canvasState.scale * 100)}%`;

  const opacity = String(canvasState.opacity);
  document.querySelector("#planImage").style.opacity = opacity;
  document.querySelector("#planFrame").style.opacity = opacity;
  document.querySelector("#planOpacity").value = String(Math.round(canvasState.opacity * 100));
}

function resetCanvasView() {
  canvasState.scale = 1;
  canvasState.x = 0;
  canvasState.y = 0;
  updateCanvasTransform();
}

function setCanvasZoom(nextScale) {
  canvasState.scale = clamp(nextScale, 0.55, 2.4);
  updateCanvasTransform();
}

function setCanvasStatus(text) {
  document.querySelector("#canvasStatus").textContent = text;
}

function showPlanPreview(mode, sourceUrl = "") {
  const image = document.querySelector("#planImage");
  const frame = document.querySelector("#planFrame");
  const fallback = document.querySelector("#planFallback");

  image.style.display = mode === "image" ? "block" : "none";
  frame.style.display = mode === "pdf" ? "block" : "none";
  fallback.style.display = mode === "fallback" ? "grid" : "none";

  if (mode === "image") image.src = sourceUrl;
  if (mode === "pdf") frame.src = sourceUrl;
  if (mode !== "pdf") frame.removeAttribute("src");
}

function applyPlanSource(project) {
  const source = project.source || {};
  const sourceType = source.type || "manual";
  const sourceUrl = uploadedSourceUrl(source);
  const fileName = source.fileName || "source-plan.png";

  resetCanvasView();

  if (sourceUrl && previewableImageTypes.has(sourceType)) {
    showPlanPreview("image", sourceUrl);
    setCanvasStatus(`底图层已锁定 / ${fileName}`);
    return;
  }

  if (sourceUrl && sourceType === "pdf") {
    showPlanPreview("pdf", sourceUrl);
    setCanvasStatus(`PDF 底图层已锁定 / ${fileName}`);
    return;
  }

  if (sourceType === "manual" || !sourceUrl) {
    showPlanPreview("image", "/assets/source-plan.png");
    setCanvasStatus("底图层已锁定 / demo source-plan.png");
    return;
  }

  document.querySelector("#planFallbackText").textContent =
    `${fileName} 已保存为项目 source，后续在 DXF/SVG/Revit JSON 解析阶段渲染为矢量底图。`;
  showPlanPreview("fallback");
  setCanvasStatus(`底图层已锁定 / ${fileName}`);
}

function cloneProject(project) {
  return JSON.parse(JSON.stringify(project));
}

function makeLocalId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function pointToCss(point) {
  return {
    left: `${(Number(point[0]) / siteMetrics.width) * 100}%`,
    top: `${(Number(point[1]) / siteMetrics.height) * 100}%`
  };
}

function polygonBounds(polygon) {
  const xs = polygon.map(point => Number(point[0]));
  const ys = polygon.map(point => Number(point[1]));
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { minX, maxX, minY, maxY };
}

function rectToPolygon(start, end) {
  const minX = Math.min(start[0], end[0]);
  const maxX = Math.max(start[0], end[0]);
  const minY = Math.min(start[1], end[1]);
  const maxY = Math.max(start[1], end[1]);
  return [[minX, minY], [maxX, minY], [maxX, maxY], [minX, maxY]];
}

function polygonArea(polygon) {
  let area = 0;
  for (let index = 0; index < polygon.length; index += 1) {
    const current = polygon[index];
    const next = polygon[(index + 1) % polygon.length];
    area += current[0] * next[1] - next[0] * current[1];
  }
  return Math.abs(area / 2);
}

function canvasPointFromEvent(event) {
  const rect = planCanvas.getBoundingClientRect();
  const localX = (event.clientX - rect.left - canvasState.x) / canvasState.scale;
  const localY = (event.clientY - rect.top - canvasState.y) / canvasState.scale;
  return [
    Math.round(clamp(localX / rect.width, 0, 1) * siteMetrics.width),
    Math.round(clamp(localY / rect.height, 0, 1) * siteMetrics.height)
  ];
}

function createRectElement(polygon, className, label) {
  const bounds = polygonBounds(polygon);
  const element = document.createElement("div");
  element.className = `annotation-rect ${className}`;
  element.textContent = label;
  element.style.left = `${(bounds.minX / siteMetrics.width) * 100}%`;
  element.style.top = `${(bounds.minY / siteMetrics.height) * 100}%`;
  element.style.width = `${((bounds.maxX - bounds.minX) / siteMetrics.width) * 100}%`;
  element.style.height = `${((bounds.maxY - bounds.minY) / siteMetrics.height) * 100}%`;
  return element;
}

function createPointElement(point, className, label, text) {
  const element = document.createElement("div");
  const css = pointToCss(point);
  element.className = `annotation-point ${className}`;
  element.textContent = text;
  element.dataset.label = label;
  element.style.left = css.left;
  element.style.top = css.top;
  return element;
}

function fixedElementPolygon(element) {
  return element.geometry?.kind === "polygon" && Array.isArray(element.geometry.coordinates)
    ? element.geometry.coordinates
    : null;
}

function fixedElementPoint(element) {
  if (element.geometry?.kind === "point" && Array.isArray(element.geometry.coordinates)) {
    return element.geometry.coordinates;
  }
  const polygon = fixedElementPolygon(element);
  if (!polygon) return null;
  const bounds = polygonBounds(polygon);
  return [(bounds.minX + bounds.maxX) / 2, (bounds.minY + bounds.maxY) / 2];
}

function renderAnnotations() {
  const layer = document.querySelector("#annotationLayer");
  layer.innerHTML = "";
  if (!currentProject?.site) return;

  if (currentProject.site.boundary?.length >= 3) {
    layer.append(createRectElement(currentProject.site.boundary, "boundary", "可设计边界"));
  }

  const fixedElements = currentProject.site.fixedElements || [];
  const backOfHouseElements = fixedElements.filter(element => element.type === "back_of_house");
  const fallbackBackOfHouse = backOfHouseElements.length
    ? []
    : currentProject.site.candidateBackOfHouse || [];

  for (const element of backOfHouseElements) {
    const polygon = fixedElementPolygon(element);
    if (polygon) layer.append(createRectElement(polygon, "back-of-house", element.label || "后场"));
  }

  for (const polygon of fallbackBackOfHouse) {
    layer.append(createRectElement(polygon, "back-of-house", "后场"));
  }

  for (const element of fixedElements.filter(item => item.type === "column")) {
    const point = fixedElementPoint(element);
    if (point) layer.append(createPointElement(point, "column", element.label || "柱子", "柱"));
  }

  for (const entrance of currentProject.site.entrances || []) {
    layer.append(createPointElement(
      entrance.position,
      "entrance",
      `${entrance.label || "入口"} / ${Math.round(Number(entrance.trafficWeight) * 100)}%`,
      "入"
    ));
  }

  if (annotationState.draftRect) {
    const polygon = rectToPolygon(annotationState.draftRect.start, annotationState.draftRect.end);
    const isBoundary = annotationState.draftRect.tool === "boundary";
    layer.append(createRectElement(
      polygon,
      isBoundary ? "boundary" : "back-of-house",
      isBoundary ? "新边界" : "新后场"
    ));
  }
}

function annotationCounts() {
  const fixedElements = currentProject?.site?.fixedElements || [];
  return {
    boundary: currentProject?.site?.boundary?.length >= 3 ? 1 : 0,
    entrances: currentProject?.site?.entrances?.length || 0,
    columns: fixedElements.filter(element => element.type === "column").length,
    backOfHouse: fixedElements.filter(element => element.type === "back_of_house").length
      || currentProject?.site?.candidateBackOfHouse?.length
      || 0
  };
}

function updateAnnotationSummary() {
  const summary = document.querySelector("#annotationSummary");
  const counts = annotationCounts();
  const saveState = annotationState.dirty ? "未保存" : "已同步";
  summary.textContent =
    `边界 ${counts.boundary} / 入口 ${counts.entrances} / 柱子 ${counts.columns} / 后场 ${counts.backOfHouse} · ${saveState}`;
}

function loadAnnotationsFromProject(project) {
  currentProject = cloneProject(project);
  annotationState.dirty = false;
  annotationState.draftRect = null;
  renderAnnotations();
  updateAnnotationSummary();
}

function setActiveMarkTool(tool) {
  annotationState.activeTool = tool;
  document.querySelectorAll("[data-mark-tool]").forEach(button => {
    button.classList.toggle("active", button.dataset.markTool === tool);
  });
  planCanvas.classList.toggle("is-marking", tool !== "pan");
}

function markAnnotationsDirty() {
  annotationState.dirty = true;
  renderAnnotations();
  updateAnnotationSummary();
}

function addEntrance(point) {
  const trafficWeight = clamp(Number(document.querySelector("#trafficWeightInput").value) || 0.5, 0, 1);
  const next = {
    id: makeLocalId("entry"),
    label: `入口 ${((currentProject.site.entrances || []).length + 1)}`,
    position: point,
    side: "manual",
    width: 1600,
    trafficWeight,
    direction: 0,
    confirmed: true,
    confidence: 1,
    source: "user"
  };
  currentProject.site.entrances = [...(currentProject.site.entrances || []), next];
  markAnnotationsDirty();
}

function addColumn(point) {
  const next = {
    id: makeLocalId("col"),
    type: "column",
    label: `柱子 ${((currentProject.site.fixedElements || []).filter(item => item.type === "column").length + 1)}`,
    geometry: {
      kind: "point",
      coordinates: point
    },
    locked: true,
    confirmed: true,
    confidence: 1,
    source: "user"
  };
  currentProject.site.fixedElements = [...(currentProject.site.fixedElements || []), next];
  markAnnotationsDirty();
}

function applyRectAnnotation(tool, polygon) {
  if (polygonArea(polygon) < 50000) return;

  if (tool === "boundary") {
    currentProject.site.boundary = polygon;
    currentProject.site.netDesignArea = Math.round(polygonArea(polygon));
    currentProject.site.grossArea = currentProject.site.grossArea || currentProject.site.netDesignArea;
  } else {
    const next = {
      id: makeLocalId("boh"),
      type: "back_of_house",
      label: `后场 ${((currentProject.site.fixedElements || []).filter(item => item.type === "back_of_house").length + 1)}`,
      geometry: {
        kind: "polygon",
        coordinates: polygon
      },
      locked: true,
      confirmed: true,
      confidence: 1,
      source: "user"
    };
    currentProject.site.fixedElements = [...(currentProject.site.fixedElements || []), next];
    currentProject.site.candidateBackOfHouse = [...(currentProject.site.candidateBackOfHouse || []), polygon];
  }

  markAnnotationsDirty();
}

function currentSitePatch() {
  return {
    boundary: currentProject.site.boundary,
    entrances: currentProject.site.entrances || [],
    fixedElements: currentProject.site.fixedElements || [],
    candidateBackOfHouse: currentProject.site.candidateBackOfHouse || []
  };
}

async function saveAnnotations() {
  if (!currentProject?.projectId || currentProject.projectId.startsWith("proj_demo")) {
    setResult("请先创建或选择一个项目，再保存图纸确认标注。");
    return;
  }

  try {
    const result = await patchJson(`/api/projects/${encodeURIComponent(currentProject.projectId)}`, {
      site: currentSitePatch()
    });
    applyProjectToUi(result.project);
    setResult({
      projectId: result.projectId,
      status: result.status,
      site: result.project.site
    });
    await refreshProjects();
  } catch (error) {
    setResult(`保存标注失败：${error.message}`);
  }
}

function setStatus(text, ok = true) {
  const status = document.querySelector("#apiStatus");
  status.textContent = text;
  status.style.color = ok ? "rgba(142, 223, 208, 0.9)" : "rgba(217, 109, 79, 0.92)";
}

function setUploadStatus(text, state = "") {
  const element = document.querySelector("#uploadStatus");
  element.textContent = text;
  element.className = `upload-status ${state}`.trim();
}

function setResult(payload) {
  document.querySelector("#resultBox").textContent =
    typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
}

function setSchemeStatus(text, ok = true) {
  const element = document.querySelector("#schemeStatus");
  element.textContent = text;
  element.style.color = ok ? "var(--muted)" : "var(--coral)";
}

function setCaseStatus(text, ok = true) {
  const element = document.querySelector("#caseStatus");
  element.textContent = text;
  element.style.color = ok ? "var(--muted)" : "var(--coral)";
}

function setStrategyStatus(text, ok = true) {
  const element = document.querySelector("#strategyStatus");
  element.textContent = text;
  element.style.color = ok ? "var(--muted)" : "var(--coral)";
}

function caseFeatureSummary(caseItem) {
  const site = caseItem.siteFeatures || {};
  const layout = caseItem.layoutPattern || {};
  return [
    caseItem.businessType,
    site.areaRange,
    site.shapeType,
    site.entrancePattern,
    layout.mainAisle
  ].filter(Boolean).join(" / ");
}

function renderCases(cases) {
  const list = document.querySelector("#caseList");
  if (!cases.length) {
    list.innerHTML = "<span>暂无案例，点击“导入种子案例”初始化本地案例库。</span>";
    return;
  }

  list.innerHTML = cases.slice(0, 10).map(caseItem => {
    const tags = (caseItem.tags || []).slice(0, 4).join(" · ");
    return `
      <button class="case-pill" type="button" data-case-id="${escapeHtml(caseItem.caseId)}">
        <strong>${escapeHtml(caseItem.title)}</strong>
        <small>${escapeHtml(caseFeatureSummary(caseItem))}</small>
        <span>${escapeHtml(tags || "未标记")}</span>
      </button>
    `;
  }).join("");
}

function renderRetrievalMatches(matches) {
  const list = document.querySelector("#retrievalList");
  if (!matches.length) {
    list.innerHTML = "<span>暂无相似案例结果。</span>";
    return;
  }

  list.innerHTML = matches.map(match => {
    const signals = (match.matchedSignals || []).slice(0, 3).map(signal => (
      `<span>${escapeHtml(signal)}</span>`
    )).join("");
    return `
      <button class="retrieval-card" type="button" data-case-id="${escapeHtml(match.caseId)}">
        <header>
          <strong>${escapeHtml(match.title)}</strong>
          <span class="match-score">${escapeHtml(match.score)}%</span>
        </header>
        <p class="match-reason">${escapeHtml(match.reason || "可作为探索参考。")}</p>
        <div class="match-signals">${signals}</div>
      </button>
    `;
  }).join("");
}

function scoreBiasLabel(scores = {}) {
  return [
    ["动线", scores.circulation],
    ["容量", scores.capacity],
    ["展示", scores.display],
    ["成本", scores.cost],
    ["落地", scores.feasibility]
  ].map(([label, value]) => `<span>${label} ${escapeHtml(value ?? "-")}</span>`).join("");
}

function renderStrategyDrafts(strategies) {
  const list = document.querySelector("#strategyList");
  if (!strategies.length) {
    list.innerHTML = "<span>策略草案会显示在这里。</span>";
    return;
  }

  list.innerHTML = strategies.map(strategy => {
    const tags = (strategy.conceptTags || []).slice(0, 4).map(tag => (
      `<span>${escapeHtml(tag)}</span>`
    )).join("");
    const refs = (strategy.referenceCaseIds || []).join(" · ");
    const selectedClass = selectedStrategyId === strategy.strategyId ? "selected" : "";
    return `
      <button class="strategy-draft-card ${selectedClass}" type="button" data-strategy-id="${escapeHtml(strategy.strategyId)}">
        <header>
          <strong>${escapeHtml(strategy.name)}</strong>
          <small>${escapeHtml(refs || "no refs")}</small>
        </header>
        <p>${escapeHtml(strategy.summary)}</p>
        <div class="strategy-meta">${tags}</div>
        <div class="score-strip">${scoreBiasLabel(strategy.scoreBias)}</div>
      </button>
    `;
  }).join("");
}

function selectedStrategy(strategyId) {
  return (currentStrategyRun?.strategies || []).find(strategy => strategy.strategyId === strategyId);
}

function showStrategyDetail(strategyId) {
  const strategy = selectedStrategy(strategyId);
  if (!strategy) return;
  selectedStrategyId = strategyId;
  renderStrategyDrafts(currentStrategyRun.strategies || []);
  setResult({
    runId: currentStrategyRun.runId,
    pipeline: currentStrategyRun.pipeline,
    strategy,
    promptReadyForProvider: true
  });
  setStrategyStatus(`已选择策略：${strategy.name}`);
}

async function refreshCases() {
  try {
    const store = await getJson("/api/cases?usableOnly=true");
    currentCases = store.cases || [];
    renderCases(currentCases);
    setCaseStatus(currentCases.length
      ? `已载入 ${currentCases.length} 个可用于生成参考的案例。`
      : "本地案例库为空，可先导入种子案例。");
  } catch (error) {
    renderCases([]);
    setCaseStatus(`读取案例库失败：${error.message}`, false);
  }
}

async function retrieveSimilarCases() {
  try {
    if (!currentProject) {
      setCaseStatus("请先创建或选择一个项目，再检索相似案例。", false);
      return;
    }

    setCaseStatus("正在检索相似案例...");
    const result = await postJson("/api/cases/retrieve", {
      project: currentProject,
      brief: document.querySelector("#briefInput").value.trim(),
      limit: 5
    });
    currentRetrieval = result;
    renderRetrievalMatches(result.matches || []);
    setCaseStatus((result.matches || []).length
      ? `已检索 ${result.matches.length} 个相似案例，后续 AI 生成可引用这些 referenceCaseIds。`
      : "没有检索到可用案例，请先导入种子案例或补充案例库。");
    setResult({
      retrievalMode: result.retrievalMode,
      embedding: result.embedding,
      query: result.query,
      referenceCaseIds: result.referenceCaseIds,
      matches: (result.matches || []).map(match => ({
        caseId: match.caseId,
        title: match.title,
        score: match.score,
        matchedSignals: match.matchedSignals,
        reason: match.reason
      }))
    });
  } catch (error) {
    renderRetrievalMatches([]);
    setCaseStatus(`检索失败：${error.message}`, false);
  }
}

async function generateStrategyDrafts() {
  try {
    if (!currentProject) {
      setStrategyStatus("请先创建或选择一个项目。", false);
      return;
    }

    setStrategyStatus("正在生成策略草案...");
    const result = await postJson("/api/strategies/generate", {
      project: currentProject,
      brief: document.querySelector("#briefInput").value.trim(),
      generateCount: Number(document.querySelector("#generateCount").value)
    });
    currentStrategyRun = result;
    selectedStrategyId = result.strategies?.[0]?.strategyId || null;
    currentRetrieval = result.retrieval;
    renderStrategyDrafts(result.strategies || []);
    renderRetrievalMatches(result.retrieval?.matches || []);
    setCaseStatus(`已引用 ${result.retrieval?.referenceCaseIds?.length || 0} 个参考案例。`);
    setStrategyStatus(`已生成 ${result.strategies.length} 个策略草案 / ${result.pipeline.model}`);
    setResult({
      runId: result.runId,
      pipeline: result.pipeline,
      projectId: result.projectId,
      generateCount: result.generateCount,
      referenceCaseIds: result.retrieval.referenceCaseIds,
      strategies: result.strategies.map(strategy => ({
        strategyId: strategy.strategyId,
        name: strategy.name,
        summary: strategy.summary,
        referenceCaseIds: strategy.referenceCaseIds,
        scoreBias: strategy.scoreBias
      }))
    });
  } catch (error) {
    renderStrategyDrafts([]);
    setStrategyStatus(`生成策略失败：${error.message}`, false);
  }
}

async function convertSelectedStrategyToScheme() {
  try {
    if (!currentProject) {
      setStrategyStatus("请先创建或选择一个项目。", false);
      return;
    }

    if (!currentStrategyRun?.strategies?.length) {
      setStrategyStatus("请先生成策略草案，再转换为 Scheme JSON。", false);
      return;
    }

    const strategy = selectedStrategyId
      ? selectedStrategy(selectedStrategyId)
      : currentStrategyRun.strategies[0];
    if (!strategy) {
      setStrategyStatus("当前没有可转换的策略。", false);
      return;
    }

    selectedStrategyId = strategy.strategyId;
    renderStrategyDrafts(currentStrategyRun.strategies || []);
    setStrategyStatus(`正在转换：${strategy.name} ...`);

    const result = await postJson("/api/schemes/from-strategy", {
      project: currentProject,
      run: currentStrategyRun,
      strategy
    });
    currentSchemes = [
      result.scheme,
      ...currentSchemes.filter(scheme => scheme.schemeId !== result.schemeId)
    ];
    selectScheme(result.scheme);
    setStrategyStatus(`已转换为 Scheme JSON：${result.scheme.name}`);
    setSchemeStatus(`已载入 ${result.scheme.schemeId}，可继续编辑并保存 JSON。`);
    setResult({
      status: result.status,
      runId: result.runId,
      strategyId: result.strategyId,
      schemeId: result.schemeId,
      origin: result.scheme.origin,
      zones: result.scheme.zones.map(zone => ({
        id: zone.id,
        type: zone.type,
        label: zone.label,
        area: zone.area,
        capacity: zone.capacity
      })),
      validation: result.scheme.validation
    });
  } catch (error) {
    setStrategyStatus(`转换失败：${error.message}`, false);
  }
}

function showStrategyPrompt() {
  if (!currentStrategyRun?.prompt) {
    setStrategyStatus("请先生成策略草案，再查看 Prompt。", false);
    return;
  }
  setResult({
    runId: currentStrategyRun.runId,
    pipeline: currentStrategyRun.pipeline,
    prompt: currentStrategyRun.prompt
  });
  setStrategyStatus(`Prompt 已准备：${currentStrategyRun.runId}`);
}

async function importSeedCases() {
  try {
    setCaseStatus("正在导入种子案例...");
    const result = await postJson("/api/cases/import-seed", {});
    currentCases = result.cases || [];
    renderCases(currentCases);
    setCaseStatus(`导入完成：新增 ${result.imported} 个，更新 ${result.updated} 个，总计 ${result.total} 个。`);
    setResult({
      status: result.status,
      imported: result.imported,
      updated: result.updated,
      total: result.total,
      businessTypes: result.businessTypes,
      tags: result.tags
    });
  } catch (error) {
    setCaseStatus(`导入失败：${error.message}`, false);
  }
}

async function showCaseDetail(caseId) {
  try {
    const caseItem = await getJson(`/api/cases/${encodeURIComponent(caseId)}`);
    setResult({
      caseId: caseItem.caseId,
      title: caseItem.title,
      businessType: caseItem.businessType,
      tags: caseItem.tags,
      siteFeatures: caseItem.siteFeatures,
      layoutPattern: caseItem.layoutPattern,
      strategySummary: caseItem.strategySummary,
      whyItWorked: caseItem.whyItWorked,
      quality: caseItem.quality
    });
    setCaseStatus(`已选择参考案例：${caseItem.title}`);
  } catch (error) {
    setCaseStatus(`读取案例详情失败：${error.message}`, false);
  }
}

function setSchemeEditor(scheme) {
  document.querySelector("#schemeJsonEditor").value = scheme
    ? JSON.stringify(scheme, null, 2)
    : "{}";
}

function updateSchemeHistoryButtons() {
  const undoButton = document.querySelector("#undoSchemeEdit");
  const redoButton = document.querySelector("#redoSchemeEdit");
  if (!undoButton || !redoButton) return;
  undoButton.disabled = schemeHistoryIndex <= 0;
  redoButton.disabled = schemeHistoryIndex < 0 || schemeHistoryIndex >= schemeHistory.length - 1;
}

function currentSchemeEditorValue() {
  return document.querySelector("#schemeJsonEditor").value;
}

function recordSchemeHistory(value = currentSchemeEditorValue()) {
  if (schemeHistory[schemeHistoryIndex] === value) {
    updateSchemeHistoryButtons();
    return;
  }
  schemeHistory = schemeHistory.slice(0, schemeHistoryIndex + 1);
  schemeHistory.push(value);
  if (schemeHistory.length > 50) schemeHistory = schemeHistory.slice(-50);
  schemeHistoryIndex = schemeHistory.length - 1;
  updateSchemeHistoryButtons();
}

function resetSchemeHistory(value = currentSchemeEditorValue()) {
  schemeHistory = [value];
  schemeHistoryIndex = 0;
  updateSchemeHistoryButtons();
}

function scheduleSchemeHistoryRecord() {
  if (isApplyingSchemeHistory) return;
  window.clearTimeout(schemeHistoryTimer);
  schemeHistoryTimer = window.setTimeout(() => recordSchemeHistory(), 350);
}

function flushSchemeHistory() {
  window.clearTimeout(schemeHistoryTimer);
  recordSchemeHistory();
}

function applySchemeHistory(index) {
  if (index < 0 || index >= schemeHistory.length) return;
  isApplyingSchemeHistory = true;
  document.querySelector("#schemeJsonEditor").value = schemeHistory[index];
  schemeHistoryIndex = index;
  isApplyingSchemeHistory = false;
  updateSchemeHistoryButtons();
}

function undoSchemeEdit() {
  flushSchemeHistory();
  if (schemeHistoryIndex > 0) applySchemeHistory(schemeHistoryIndex - 1);
}

function redoSchemeEdit() {
  if (schemeHistoryIndex < schemeHistory.length - 1) applySchemeHistory(schemeHistoryIndex + 1);
}

const schemeScoreLabels = [
  ["circulation", "动线"],
  ["capacity", "容量"],
  ["display", "展示"],
  ["cost", "成本"],
  ["feasibility", "落地"]
];

function numericScore(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? clamp(numeric, 0, 10) : 0;
}

function schemeOverallScore(scheme) {
  const scores = scheme.scores || {};
  const values = schemeScoreLabels.map(([key]) => numericScore(scores[key]));
  return values.length
    ? (values.reduce((total, value) => total + value, 0) / values.length).toFixed(1)
    : "0.0";
}

function schemeSourceLabel(scheme) {
  const sourceLabels = {
    ai_strategy: "AI 策略",
    geometry_engine: "几何引擎",
    user: "用户草案",
    imported_case: "案例导入"
  };
  return sourceLabels[scheme.origin?.source] || scheme.origin?.source || "未知来源";
}

function schemeValidationLabel(scheme) {
  const status = scheme.validation?.overallStatus || "warn";
  const labels = {
    pass: "校验通过",
    warn: "需复核",
    fail: "有阻塞"
  };
  return labels[status] || status;
}

function primarySchemeWarning(scheme) {
  return scheme.validation?.blockers?.[0]?.message
    || scheme.validation?.warnings?.[0]?.message
    || "";
}

function schemeExplanation(scheme) {
  return scheme.strategy?.rationale
    || scheme.strategy?.summary
    || "该方案尚未补充策略解释。";
}

function renderSchemeScoreBars(scheme) {
  const scores = scheme.scores || {};
  return schemeScoreLabels.map(([key, label]) => {
    const value = numericScore(scores[key]);
    return `
      <span class="scheme-score-item">
        <strong>${label}</strong>
        <i aria-hidden="true"><em style="--score-width: ${value * 10}%"></em></i>
        <b>${escapeHtml(scores[key] ?? "-")}</b>
      </span>
    `;
  }).join("");
}

function schemeMetaItems(scheme) {
  const refs = scheme.caseRefs || scheme.origin?.referenceCaseIds || [];
  return [
    `分区 ${scheme.zones?.length || 0}`,
    `家具 ${scheme.furniture?.length || 0}`,
    `参考 ${refs.length}`,
    schemeValidationLabel(scheme)
  ];
}

function renderSchemes(schemes) {
  const stack = document.querySelector("#schemeStack");
  if (!schemes.length) {
    stack.innerHTML = `
      <article class="scheme-card">
        <header class="scheme-card-header">
          <div class="scheme-card-title">
            <strong>暂无持久化方案</strong>
            <span>点击“新建草案”或先生成策略再转换</span>
          </div>
        </header>
        <p>方案 JSON 会保存在本地 .data/schemes.json；AI 策略转换后会在这里显示评分、解释和校验提示。</p>
      </article>
    `;
    return;
  }

  stack.innerHTML = schemes.map(scheme => {
    const warning = primarySchemeWarning(scheme);
    const tags = (scheme.strategy?.conceptTags || []).slice(0, 3).map(tag => (
      `<span>${escapeHtml(tag)}</span>`
    )).join("");
    const meta = schemeMetaItems(scheme).map(item => `<span>${escapeHtml(item)}</span>`).join("");
    return `
      <button class="scheme-card ${currentScheme?.schemeId === scheme.schemeId ? "selected" : ""}" type="button" data-scheme-id="${escapeHtml(scheme.schemeId)}">
        <header class="scheme-card-header">
          <div class="scheme-card-title">
            <strong>${escapeHtml(scheme.name)}</strong>
            <span>${escapeHtml(schemeSourceLabel(scheme))} / ${escapeHtml(scheme.status)} / ${escapeHtml(schemeValidationLabel(scheme))}</span>
          </div>
          <span class="scheme-overall-score">${escapeHtml(schemeOverallScore(scheme))}</span>
        </header>
        <p class="scheme-summary">${escapeHtml(scheme.strategy?.summary || "暂无策略摘要。")}</p>
        <p class="scheme-explanation">${escapeHtml(schemeExplanation(scheme))}</p>
        <div class="scheme-tag-row">${tags || "<span>未标记</span>"}</div>
        <div class="scheme-score-grid">${renderSchemeScoreBars(scheme)}</div>
        <div class="scheme-meta-row">${meta}</div>
        ${warning ? `<p class="scheme-warning">${escapeHtml(warning)}</p>` : ""}
      </button>
    `;
  }).join("");
}

function selectScheme(scheme) {
  currentScheme = scheme ? JSON.parse(JSON.stringify(scheme)) : null;
  setSchemeEditor(currentScheme);
  resetSchemeHistory();
  renderSchemes(currentSchemes);
  setSchemeStatus(currentScheme
    ? `正在编辑 ${currentScheme.schemeId} / 综合 ${schemeOverallScore(currentScheme)}`
    : "当前项目还没有方案 JSON。");
}

async function loadProjectSchemes(projectId) {
  currentScheme = null;
  currentSchemes = [];
  setSchemeEditor(null);
  resetSchemeHistory();

  if (!projectId || projectId.startsWith("proj_demo")) {
    renderSchemes([]);
    setSchemeStatus("请先创建或选择本地项目，再创建可编辑方案 JSON。");
    return;
  }

  try {
    const store = await getJson(`/api/projects/${encodeURIComponent(projectId)}/schemes`);
    currentSchemes = store.schemes || [];
    selectScheme(currentSchemes[0] || null);
  } catch (error) {
    renderSchemes([]);
    setSchemeStatus(`读取方案失败：${error.message}`, false);
  }
}

async function createScheme() {
  if (!currentProject?.projectId || currentProject.projectId.startsWith("proj_demo")) {
    setSchemeStatus("请先创建或选择一个本地项目。", false);
    return;
  }

  try {
    const result = await postJson(`/api/projects/${encodeURIComponent(currentProject.projectId)}/schemes`, {
      name: `${currentProject.name || "未命名项目"} - 草案 ${currentSchemes.length + 1}`
    });
    currentSchemes = [result.scheme, ...currentSchemes.filter(scheme => scheme.schemeId !== result.schemeId)];
    selectScheme(result.scheme);
    setResult({
      projectId: currentProject.projectId,
      status: result.status,
      scheme: result.scheme
    });
  } catch (error) {
    setSchemeStatus(`创建方案失败：${error.message}`, false);
  }
}

async function saveScheme() {
  if (!currentScheme?.schemeId) {
    setSchemeStatus("没有可保存的方案 JSON。", false);
    return;
  }

  try {
    const parsed = JSON.parse(document.querySelector("#schemeJsonEditor").value);
    const result = await patchJson(`/api/schemes/${encodeURIComponent(currentScheme.schemeId)}`, {
      scheme: parsed
    });
    currentSchemes = currentSchemes.map(scheme => (
      scheme.schemeId === result.schemeId ? result.scheme : scheme
    ));
    selectScheme(result.scheme);
    setResult({
      status: result.status,
      scheme: result.scheme
    });
  } catch (error) {
    setSchemeStatus(`保存方案失败：${error.message}`, false);
  }
}

async function saveSchemeVersion() {
  if (!currentScheme?.schemeId) {
    setSchemeStatus("没有可保存版本的方案 JSON。", false);
    return;
  }

  try {
    flushSchemeHistory();
    const parsed = JSON.parse(document.querySelector("#schemeJsonEditor").value);
    const result = await postJson(`/api/schemes/${encodeURIComponent(currentScheme.schemeId)}/versions`, {
      scheme: parsed,
      note: "Web JSON editor snapshot"
    });
    setSchemeStatus(`已保存版本 ${result.version.label} / ${result.versionId}`);
    setResult({
      status: result.status,
      versionId: result.versionId,
      schemeId: result.schemeId,
      createdAt: result.version.createdAt,
      note: result.version.note
    });
  } catch (error) {
    setSchemeStatus(`保存版本失败：${error.message}`, false);
  }
}

function triggerDownload(url, fileName) {
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
}

async function svgTextForCurrentScheme() {
  const response = await fetch(`/api/schemes/${encodeURIComponent(currentScheme.schemeId)}/export/svg`);
  if (!response.ok) throw new Error(`SVG export returned ${response.status}`);
  return response.text();
}

async function downloadPngFromSvg(svgText, fileName) {
  const svgBlob = new Blob([svgText], { type: "image/svg+xml" });
  const svgUrl = URL.createObjectURL(svgBlob);
  try {
    const image = new Image();
    const loaded = new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error("SVG rasterization failed"));
    });
    image.src = svgUrl;
    await loaded;

    const scale = Math.min(1, 2400 / image.naturalWidth, 1600 / image.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    context.fillStyle = "#fffdf8";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("PNG blob creation failed");
    const pngUrl = URL.createObjectURL(blob);
    triggerDownload(pngUrl, fileName);
    window.setTimeout(() => URL.revokeObjectURL(pngUrl), 1000);
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

async function exportCurrentScheme(format) {
  if (!currentScheme?.schemeId) {
    setSchemeStatus("请先生成或选择一个方案，再导出。", false);
    return;
  }

  try {
    if (format === "png") {
      const svgText = await svgTextForCurrentScheme();
      await downloadPngFromSvg(svgText, `${currentScheme.schemeId}.png`);
      setSchemeStatus(`已生成 PNG 下载：${currentScheme.schemeId}.png`);
      return;
    }

    const url = `/api/schemes/${encodeURIComponent(currentScheme.schemeId)}/export/${encodeURIComponent(format)}`;
    triggerDownload(url, `${currentScheme.schemeId}.${format}`);
    setSchemeStatus(`已触发 ${format.toUpperCase()} 导出：${currentScheme.schemeId}.${format}`);
  } catch (error) {
    setSchemeStatus(`导出失败：${error.message}`, false);
  }
}

function applyProjectToUi(project) {
  document.querySelector("#projectName").textContent = project.name || "未命名项目";
  document.querySelector("#projectTitle").value = project.name || "";
  document.querySelector("#businessType").value = project.brief.businessType;
  document.querySelector("#generateCount").value = project.brief.generateCount || 6;
  applyPlanSource(project);
  loadAnnotationsFromProject(project);
  loadProjectSchemes(project.projectId);
}

function renderProjects(projects) {
  const list = document.querySelector("#projectList");
  if (!projects.length) {
    list.innerHTML = "<span>暂无项目</span>";
    return;
  }

  list.innerHTML = projects.slice(0, 5).map(project => `
    <button class="project-pill" type="button" data-project-id="${project.projectId}">
      <strong>${project.name || "未命名项目"}</strong>
      <small>${project.projectId} / ${project.source.type}</small>
    </button>
  `).join("");
}

async function refreshProjects() {
  const store = await getJson("/api/projects");
  renderProjects(store.projects || []);
}

async function uploadSelectedFile() {
  const input = document.querySelector("#planFile");
  const file = input.files?.[0];
  if (!file) return null;

  setUploadStatus(`正在上传 ${file.name} ...`);
  const dataBase64 = await fileToBase64(file);
  const upload = await postJson("/api/uploads", {
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    dataBase64
  });
  setUploadStatus(`已上传 ${upload.fileName} (${Math.round(upload.size / 1024)} KB)`, "ready");
  return upload;
}

async function createProject() {
  try {
    const file = document.querySelector("#planFile").files?.[0] || null;
    const upload = await uploadSelectedFile();
    const importJson = upload?.sourceType === "revit_json" && file
      ? JSON.parse(await file.text())
      : null;
    const payload = {
      name: document.querySelector("#projectTitle").value.trim() || "未命名项目",
      businessType: document.querySelector("#businessType").value,
      generateCount: Number(document.querySelector("#generateCount").value),
      brief: document.querySelector("#briefInput").value.trim(),
      upload,
      ...(importJson ? { importJson } : {})
    };

    const result = await postJson(importJson ? "/api/projects/from-revit-import" : "/api/projects", payload);
    applyProjectToUi(result.project);
    setResult({
      projectId: result.projectId,
      status: result.status,
      next: result.next,
      source: result.project.source,
      site: importJson ? {
        boundaryPoints: result.project.site.boundary.length,
        entrances: result.project.site.entrances.length,
        fixedElements: result.project.site.fixedElements.length
      } : undefined
    });
    await refreshProjects();
  } catch (error) {
    setUploadStatus(error.message, "error");
    setResult(`创建失败：${error.message}`);
  }
}

async function boot() {
  try {
    const [health, project] = await Promise.all([
      getJson("/api/health"),
      getJson("/api/sample/project")
    ]);

    setStatus(`${health.version} / API ready`);
    applyProjectToUi(project);
    setResult("等待创建项目。上传文件可选；未上传时会创建 manual source 项目。");
    await refreshProjects();
    await refreshCases();
  } catch (error) {
    setStatus("API 未连接", false);
    console.error(error);
  }
}

document.querySelector("#focusUpload").addEventListener("click", () => {
  document.querySelector("#planFile").click();
});

document.querySelector("#planFile").addEventListener("change", event => {
  const file = event.target.files?.[0];
  if (!file) {
    setUploadStatus("等待上传 PNG / PDF / SVG / DXF / Revit JSON");
    return;
  }
  setUploadStatus(`已选择 ${file.name}，点击“创建项目”上传`, "ready");
});

document.querySelector("#createProject").addEventListener("click", createProject);
document.querySelector("#generateStrategiesTop").addEventListener("click", generateStrategyDrafts);

document.querySelector("#projectList").addEventListener("click", async event => {
  const button = event.target.closest("[data-project-id]");
  if (!button) return;
  const project = await getJson(`/api/projects/${button.dataset.projectId}`);
  applyProjectToUi(project);
  setResult({
    projectId: project.projectId,
    source: project.source,
    brief: project.brief
  });
});

document.querySelector("#schemeStack").addEventListener("click", async event => {
  const button = event.target.closest("[data-scheme-id]");
  if (!button) return;
  try {
    const scheme = await getJson(`/api/schemes/${encodeURIComponent(button.dataset.schemeId)}`);
    selectScheme(scheme);
  } catch (error) {
    setSchemeStatus(`读取方案失败：${error.message}`, false);
  }
});

document.querySelector("#createScheme").addEventListener("click", createScheme);
document.querySelector("#undoSchemeEdit").addEventListener("click", undoSchemeEdit);
document.querySelector("#redoSchemeEdit").addEventListener("click", redoSchemeEdit);
document.querySelector("#saveScheme").addEventListener("click", saveScheme);
document.querySelector("#saveSchemeVersion").addEventListener("click", saveSchemeVersion);
document.querySelector("#schemeJsonEditor").addEventListener("input", scheduleSchemeHistoryRecord);
document.querySelector(".scheme-export-actions").addEventListener("click", event => {
  const button = event.target.closest("[data-export-format]");
  if (!button) return;
  exportCurrentScheme(button.dataset.exportFormat);
});
document.querySelector("#generateStrategies").addEventListener("click", generateStrategyDrafts);
document.querySelector("#convertSelectedStrategy").addEventListener("click", convertSelectedStrategyToScheme);
document.querySelector("#showStrategyPrompt").addEventListener("click", showStrategyPrompt);
document.querySelector("#importSeedCases").addEventListener("click", importSeedCases);
document.querySelector("#retrieveSimilarCases").addEventListener("click", retrieveSimilarCases);
document.querySelector("#refreshCases").addEventListener("click", refreshCases);

document.querySelector("#caseList").addEventListener("click", event => {
  const button = event.target.closest("[data-case-id]");
  if (!button) return;
  showCaseDetail(button.dataset.caseId);
});

document.querySelector("#retrievalList").addEventListener("click", event => {
  const button = event.target.closest("[data-case-id]");
  if (!button) return;
  showCaseDetail(button.dataset.caseId);
});

document.querySelector("#strategyList").addEventListener("click", event => {
  const button = event.target.closest("[data-strategy-id]");
  if (!button) return;
  showStrategyDetail(button.dataset.strategyId);
});

document.querySelector("#zoomOut").addEventListener("click", () => {
  setCanvasZoom(canvasState.scale - 0.15);
});

document.querySelector("#zoomIn").addEventListener("click", () => {
  setCanvasZoom(canvasState.scale + 0.15);
});

document.querySelector("#resetCanvas").addEventListener("click", resetCanvasView);

document.querySelector("#planOpacity").addEventListener("input", event => {
  canvasState.opacity = Number(event.target.value) / 100;
  updateCanvasTransform();
});

document.querySelector("#planImage").addEventListener("error", () => {
  showPlanPreview("image", "/assets/source-plan.png");
  setCanvasStatus("底图层已锁定 / 上传预览失败，已显示 demo 底图");
});

const planCanvas = document.querySelector("#planCanvas");

function safelyCapturePointer(event) {
  try {
    planCanvas.setPointerCapture(event.pointerId);
  } catch {
    // Synthetic pointer events in browser tests may not have an active pointer.
  }
}

planCanvas.addEventListener("pointerdown", event => {
  if (event.button !== 0) return;
  if (!currentProject?.site) return;

  if (annotationState.activeTool === "entrance") {
    addEntrance(canvasPointFromEvent(event));
    return;
  }

  if (annotationState.activeTool === "column") {
    addColumn(canvasPointFromEvent(event));
    return;
  }

  if (annotationState.activeTool === "boundary" || annotationState.activeTool === "back_of_house") {
    const point = canvasPointFromEvent(event);
    annotationState.draftRect = {
      tool: annotationState.activeTool,
      start: point,
      end: point
    };
    safelyCapturePointer(event);
    renderAnnotations();
    return;
  }

  canvasState.isPanning = true;
  canvasState.startX = event.clientX;
  canvasState.startY = event.clientY;
  canvasState.originX = canvasState.x;
  canvasState.originY = canvasState.y;
  planCanvas.classList.add("is-panning");
  safelyCapturePointer(event);
});

planCanvas.addEventListener("pointermove", event => {
  if (annotationState.draftRect) {
    annotationState.draftRect.end = canvasPointFromEvent(event);
    renderAnnotations();
    return;
  }

  if (!canvasState.isPanning) return;
  canvasState.x = canvasState.originX + event.clientX - canvasState.startX;
  canvasState.y = canvasState.originY + event.clientY - canvasState.startY;
  updateCanvasTransform();
});

function stopPanning(event) {
  if (annotationState.draftRect) {
    const { tool, start, end } = annotationState.draftRect;
    annotationState.draftRect = null;
    applyRectAnnotation(tool, rectToPolygon(start, end));
    if (planCanvas.hasPointerCapture(event.pointerId)) {
      planCanvas.releasePointerCapture(event.pointerId);
    }
    return;
  }

  canvasState.isPanning = false;
  planCanvas.classList.remove("is-panning");
  if (planCanvas.hasPointerCapture(event.pointerId)) {
    planCanvas.releasePointerCapture(event.pointerId);
  }
}

planCanvas.addEventListener("pointerup", stopPanning);
planCanvas.addEventListener("pointercancel", stopPanning);

planCanvas.addEventListener("wheel", event => {
  event.preventDefault();
  const direction = event.deltaY > 0 ? -1 : 1;
  setCanvasZoom(canvasState.scale + direction * 0.08);
}, { passive: false });

document.querySelectorAll("[data-mark-tool]").forEach(button => {
  button.addEventListener("click", () => setActiveMarkTool(button.dataset.markTool));
});

document.querySelector("#saveAnnotations").addEventListener("click", saveAnnotations);

setActiveMarkTool("pan");
updateCanvasTransform();
boot();
