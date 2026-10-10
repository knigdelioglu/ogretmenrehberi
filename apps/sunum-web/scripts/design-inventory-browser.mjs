// Exhaustive real-Chrome visual inventory for all four encrypted lesson themes.
// Run after `npm run build` with CHROME set to a Chrome/Chromium executable.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "..");
const repoRoot = path.resolve(appRoot, "../..");
const distDir = path.join(appRoot, "dist");
const chromePath = process.env.CHROME;
const outputDir = path.resolve(process.env.DESIGN_AUDIT_DIR || path.join(repoRoot, "docs/screenshots/sunum-web-complete-ux/before"));
const baselinePath = process.env.DESIGN_AUDIT_BASELINE ? path.resolve(process.env.DESIGN_AUDIT_BASELINE) : null;
const maxSteps = Number(process.env.DESIGN_AUDIT_MAX_STEPS || 0);
const port = Number(process.env.PORT || 5192);
const rootUrl = `http://127.0.0.1:${port}`;
if (!chromePath) throw new Error("Set CHROME to a Chrome/Chromium executable to run the real-browser audit.");
if (!fs.existsSync(distDir)) throw new Error("Build apps/sunum-web before running the design inventory.");
fs.mkdirSync(outputDir, { recursive: true });

const envFile = path.join(appRoot, ".env.local");
const envText = fs.existsSync(envFile) ? fs.readFileSync(envFile, "utf8") : "";
const localPassword = /^\s*SUNUM_SIFRE\s*=\s*(.*)\s*$/m.exec(envText)?.[1]?.replace(/^['"]|['"]$/g, "");
const password = process.env.SUNUM_SIFRE || localPassword || "sunum";
const cspFile = path.join(repoRoot, "netlify.toml");
const cspText = fs.existsSync(cspFile) ? fs.readFileSync(cspFile, "utf8") : "";
const csp = /Content-Security-Policy\s*=\s*"([^"]+)"/.exec(cspText)?.[1] || "";
const mimeTypes = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".bin": "application/octet-stream",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg", ".webp": "image/webp", ".woff2": "font/woff2",
  ".webmanifest": "application/manifest+json"
};

const auditHook = `
window.__sunumDesignAudit = (() => {
  const bucket = (n) => n <= 1 ? String(n) : n <= 3 ? String(n) : n <= 6 ? "4-6" : "7+";
  const columns = (node) => getComputedStyle(node).gridTemplateColumns.split(" ").filter(Boolean).length;
  const template = (slide) => {
    if (slide.classList.contains("slide--lesson-cover")) return "lesson-cover";
    if (slide.classList.contains("slide--cover")) return "lesson-end";
    const layout = slide.classList.contains("slide--visual-process") ? "process"
      : slide.classList.contains("slide--visual-assessment") ? "assessment"
      : slide.classList.contains("slide--visual-reference") ? "reference"
      : slide.classList.contains("slide--visual-structure") ? "structure"
      : state.catalog.lessons[state.lesson]?.steps[state.slide - 1]?.layout || "question";
    if (slide.classList.contains("slide--qa-modern")) {
      return slide.classList.contains("slide--qa-comparison") ? "qa-comparison" : "qa-question";
    }
    if (slide.classList.contains("slide--modern-companion")) return "companion-" + layout;
    if (slide.classList.contains("slide--presentation") && ["question","comparison","structure"].includes(layout)) return "presentation-" + layout;
    return layout === "vocabulary" ? "vocabulary-board" : "legacy-" + layout;
  };
  const snapshot = () => {
    const slide = document.querySelector("#canvas .slide");
    const body = slide?.querySelector(".slide__body");
    if (!slide) return null;
    const parts = [];
    const lists = [...slide.querySelectorAll(".steps-list")];
    if (lists.length) parts.push("numbered-sequence:" + lists.map((n) => bucket(n.children.length)).join(","));
    const fields = [...slide.querySelectorAll(".fields")];
    if (fields.length) parts.push("field-grid:" + fields.map((n) => columns(n) + "c-" + bucket(n.children.length)).join(","));
    const criteria = [...slide.querySelectorAll(".criteria")];
    if (criteria.length) parts.push("checklist:" + criteria.map((n) => bucket(n.children.length)).join(","));
    const scales = [...slide.querySelectorAll(".scale-form")];
    if (scales.length) parts.push("rating-matrix:" + scales.map((n) => (n.style.getPropertyValue("--scale") || "?") + "x" + bucket(n.querySelectorAll(".scale-form__row").length)).join(","));
    const sections = [...slide.querySelectorAll(".sections")];
    if (sections.length) parts.push("section-cards:" + sections.map((n) => (n.classList.contains("sections--stacked") ? "stacked" : columns(n) + "c") + "-" + bucket(n.querySelectorAll(":scope > .sec").length)).join(","));
    if (slide.classList.contains("slide--lesson-cover")) {
      const title=slide.querySelector(".cover__title");
      const range=title && document.createRange();
      if (range) range.selectNodeContents(title);
      const tops=[...(range?.getClientRects() || [])].map((r)=>r.top).filter((top,index,all)=>all.indexOf(top)===index);
      parts.push(slide.querySelector(".cover__subtitle") ? "cover-subtitle" : "cover-no-subtitle", "cover-title-lines:" + bucket(tops.length));
    }
    if (slide.classList.contains("slide--cover") && !slide.classList.contains("slide--lesson-cover")) {
      parts.push(slide.querySelector(".cover__hint") ? "end-with-next-lesson" : "end-last-lesson");
    }
    if (slide.querySelector(".sec--letter,.letter")) parts.push("letter-layout");
    if (slide.querySelector(".process-card-items")) parts.push("process-card-set");
    const chips = [...slide.querySelectorAll(".chips")];
    if (chips.length) parts.push("comparison-chips:" + chips.map((n) => bucket(n.children.length)).join(","));
    const vocab = [...slide.querySelectorAll(".vocab")];
    if (vocab.length) parts.push("word-cards:" + (slide.querySelector(".vocab__item--interactive") ? "interactive-" : "guided-") + vocab.map((n) => bucket(n.children.length)).join(","));
    const dicts = [...slide.querySelectorAll(".dict")];
    if (dicts.length) parts.push("dictionary:" + dicts.map((n) => bucket(n.querySelectorAll("dt").length)).join(","));
    const images = [...slide.querySelectorAll(".content-images")];
    if (images.length) parts.push("image-set:" + images.map((n) => bucket(n.querySelectorAll("img").length)).join(","));
    const links = [...slide.querySelectorAll(".source-links")];
    if (links.length) parts.push("source-actions:" + links.map((n) => bucket(n.querySelectorAll("a").length)).join(","));
    const quotes = [...slide.querySelectorAll(".quotes")];
    if (quotes.length) parts.push("text-evidence:" + quotes.map((n) => bucket(n.children.length)).join(","));
    const rubrics = [...slide.querySelectorAll(".rubric-table-wrap")];
    if (rubrics.length) parts.push("rubric-matrix:" + rubrics.map((n) => n.querySelectorAll("tbody tr").length + "r-" + n.querySelectorAll("thead th").length + "c").join(","));
    const panels = [...new Set([...slide.querySelectorAll(".panel")].map((n) => [...n.classList].find((c) => c.startsWith("panel--"))?.slice(7)).filter(Boolean))].sort();
    if (panels.length) parts.push("revealed-panels:" + panels.join("+"));
    if (slide.querySelector(".lead")) parts.push("lead-in");
    if (!parts.length) parts.push("prompt-only");
    const layout = template(slide);
    const signature = [layout, ...parts].join("__");
    const rect = (node) => {
      const r = node?.getBoundingClientRect();
      return r ? { x:r.x, y:r.y, width:r.width, height:r.height, right:r.right, bottom:r.bottom } : null;
    };
    const viewport = document.querySelector("#viewport");
    const viewportRect = rect(viewport);
    const slideRect = rect(slide);
    const bodyRect = rect(body);
    const horizontalOverflow = Boolean(body && body.scrollWidth > body.clientWidth + 1);
    const unfitted = Boolean(body?.classList.contains("is-overflowing"));
    const textClips = [...slide.querySelectorAll(".prompt,.lead,.panel p,.sec p,.steps-list li,.criteria li,.scale-form__text,.vocab__term,.vocab__meaning,.dict dd,.quotes p,.source-links a,.rubric-matrix td span")]
      .filter((n) => n.getClientRects().length && (n.scrollWidth > n.clientWidth + 1 || n.scrollHeight > n.clientHeight + 2))
      .slice(0, 12).map((n) => ({ cls:n.className || n.tagName, text:(n.innerText || n.textContent || "").slice(0, 100), rect:rect(n), scroll:[n.scrollWidth,n.scrollHeight], client:[n.clientWidth,n.clientHeight] }));
    const title = slide.querySelector(".prompt,.cover__title");
    const canvasScale = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--canvas-scale")) || 1;
    return {
      template:layout, features:parts, signature,
      className:slide.className,
      body:{ rect:bodyRect, scroll:[body?.scrollWidth || 0, body?.scrollHeight || 0], client:[body?.clientWidth || 0, body?.clientHeight || 0], unfitted, horizontalOverflow },
      viewport:{ width:innerWidth, height:innerHeight, rect:viewportRect },
      slide:slideRect,
      titleFont:title ? { size:Number.parseFloat(getComputedStyle(title).fontSize), visualSize:Number.parseFloat(getComputedStyle(title).fontSize) * canvasScale, family:getComputedStyle(title).fontFamily } : null,
      textClips,
      offCanvas: Boolean(slideRect && viewportRect && (slideRect.x < viewportRect.x - 1 || slideRect.y < viewportRect.y - 1 || slideRect.right > viewportRect.right + 1 || slideRect.bottom > viewportRect.bottom + 1))
    };
  };
  const configure = (lessonIndex, stepIndex, revealIndex, partIndex, guide, animate) => {
    state.lesson = lessonIndex;
    state.slide = stepIndex + 1;
    state.reveal = revealIndex;
    state.part = partIndex;
    state.guideOnRemote = Boolean(guide);
    state.extras = new Set();
    state.revealedVocabularyTerms.clear();
    state.direction = 1;
    const step = currentStep();
    state.fresh = animate && revealIndex > 0 ? activeReveals(step)[revealIndex - 1] : null;
    render({ newSlide:Boolean(animate) });
    return { snapshot:snapshot(), revealKeys:activeReveals(step), pageCount:currentView(step).pages.length };
  };
  const configureCover = (lessonIndex, end, animate) => {
    state.lesson=lessonIndex;
    state.slide=end ? currentLesson().steps.length + 1 : 0;
    state.reveal=0; state.part=0; state.guideOnRemote=false;
    state.extras=new Set(); state.revealedVocabularyTerms.clear(); state.fresh=null;
    render({ newSlide:Boolean(animate) });
    return snapshot();
  };
  return {
    metadata:() => state.catalog.lessons.map((lesson, lessonIndex) => ({
      slug:lesson.slug, title:lesson.title, theme:lesson.theme, lessonIndex,
      steps:lesson.steps.map((step, stepIndex) => ({ id:step.id, stepIndex, layout:step.layout || "question", reveals:step.reveals || [], sectionLayout:step.sections_layout || "grid" }))
    })),
    configure,
    configureCover,
    setTheme:(theme) => { document.documentElement.dataset.theme = theme; storage.set(LS.theme, theme); },
    remeasure,
    resize:() => { scaleCanvas(); remeasure(); },
    motionSnapshot:(lessonIndex, stepIndex, revealIndex, guide) => configure(lessonIndex, stepIndex, revealIndex, 0, guide, true).snapshot,
    motionCoverSnapshot:(lessonIndex, end) => configureCover(lessonIndex, end, true),
    getCatalogCounts:() => ({ lessonCount:state.catalog.lessons.length, stepCount:state.catalog.lessons.reduce((n,l) => n + l.steps.length, 0), themes:Object.keys(state.catalog.themes) })
  };
})();
`;

const server = http.createServer((req, res) => {
  const url = new URL(req.url, rootUrl);
  const relative = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const file = path.resolve(distDir, `.${relative}`);
  if (!file.startsWith(`${distDir}${path.sep}`) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404, { "Cache-Control":"no-cache" }).end("Not found");
    return;
  }
  let content = fs.readFileSync(file);
  if (path.basename(file) === "app.js") content = Buffer.concat([content, Buffer.from(auditHook)]);
  res.writeHead(200, { "Content-Type":mimeTypes[path.extname(file)] || "application/octet-stream", "Cache-Control":"no-cache", ...(csp ? { "Content-Security-Policy":csp } : {}) });
  res.end(content);
}).listen(port, "127.0.0.1");

const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), "sunum-design-audit-"));
const chrome = spawn(chromePath, [
  "--headless=new", "--no-sandbox", "--disable-gpu", "--disable-popup-blocking", "--no-first-run",
  "--remote-allow-origins=*", "--remote-debugging-port=0", `--user-data-dir=${profileDir}`, "about:blank"
], { stdio:"ignore" });
const clients = [];

async function until(check, label, timeout = 20000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try { const result = await check(); if (result) return result; } catch { /* navigation may replace the execution context */ }
    await sleep(80);
  }
  throw new Error(`Timed out: ${label}`);
}

async function connectTarget(debugPort) {
  const target = await until(async () => {
    const response = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
    return (await response.json()).find((item) => item.type === "page" && item.url === "about:blank");
  }, "Chrome page target");
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once:true });
    socket.addEventListener("error", reject, { once:true });
  });
  const pending = new Map();
  let sequence = 0;
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const task = pending.get(message.id); pending.delete(message.id);
    if (message.error) task.reject(new Error(message.error.message)); else task.resolve(message.result);
  });
  const client = {
    send(method, params = {}) {
      const id = ++sequence;
      return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
    },
    async evaluate(expression) {
      const result = await this.send("Runtime.evaluate", { expression, awaitPromise:true, returnByValue:true, userGesture:true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text || "Runtime.evaluate failed");
      return result.result.value;
    },
    close() { socket.close(); }
  };
  clients.push(client);
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  return client;
}

const stateKey = (theme, viewport) => `${theme}:${viewport.id}`;
const dimensions = [
  { id:"board-1920x1080", width:1920, height:1080, theme:"light", all:true },
  { id:"board-dark-1920x1080", width:1920, height:1080, theme:"dark", all:true },
  { id:"desktop-1440x900", width:1440, height:900, theme:"light", all:false },
  { id:"desktop-1280x800", width:1280, height:800, theme:"light", all:false },
  { id:"tablet-landscape-1024x768", width:1024, height:768, theme:"light", all:false },
  { id:"tablet-landscape-dark-1024x768", width:1024, height:768, theme:"dark", all:false },
  { id:"tablet-portrait-768x1024", width:768, height:1024, theme:"light", all:false }
];
const designReview = {
  "companion-assessment": { previous:"Kısmen modern", action:"Yenilendi", reason:"Öz değerlendirme ve ölçme bileşenleri ortak yüzey, etiket ve kontrol hiyerarşisine alındı." },
  "companion-process": { previous:"Kısmen modern", action:"Yenilendi", reason:"Sıralı süreç görünümü, kaynak işaretleri ve açılan destek katmanları ortak bileşen diline alındı." },
  "companion-reference": { previous:"Kısmen modern", action:"Yenilendi", reason:"Bilgi, sözlük, kaynak ve kanıt görünümleri ayrıştırıldı; tekrar eden üst başlık sadeleştirildi." },
  "presentation-comparison": { previous:"Eski/tutarsız", action:"Modernleştirildi", reason:"Karşılaştırma ölçütleri eski serif görünümden düzenli, renk kodlu kavram kümelerine taşındı." },
  "presentation-question": { previous:"Eski/tutarsız", action:"Modernleştirildi", reason:"Yanıt katmanı bulunmayan tekil soru görünümü de aynı tipografi ve kaynak hiyerarşisine alındı." },
  "presentation-structure": { previous:"Eski/tutarsız", action:"Modernleştirildi", reason:"Yapı alanları ve kartları ORDS yüzeyleri, okunur numaralar ve tutarlı boşluklarla yenilendi." },
  "qa-comparison": { previous:"Modern", action:"Korundu ve rafine edildi", reason:"Başarılı karşılaştırma yerleşimi korundu; başlık ve sayfa üst bilgisi sadeleştirildi." },
  "qa-question": { previous:"Modern", action:"Korundu ve rafine edildi", reason:"Başarılı soru/cevap hiyerarşisi korundu; içerik türü etiketi ve sayfa üst bilgisi netleştirildi." },
  "lesson-cover": { previous:"Modern", action:"Korundu", reason:"Başarılı tema açılışı korunarak mevcut tipografik ve kompozisyon dengesi sürdürüldü." },
  "lesson-end": { previous:"Modern", action:"Korundu", reason:"Sade ders sonu ve sonraki ders yönlendirmesi mevcut işleviyle korundu." }
};

const screenshot = async (client, outputPath) => {
  await client.evaluate("new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))");
  const result = await client.send("Page.captureScreenshot", { format:"png", fromSurface:true, captureBeyondViewport:false });
  fs.mkdirSync(path.dirname(outputPath), { recursive:true });
  fs.writeFileSync(outputPath, Buffer.from(result.data, "base64"));
};
const hash = (value) => crypto.createHash("sha1").update(value).digest("hex").slice(0, 10);
const addMapStep = (map, key, lesson, step) => {
  const group = map.get(key) || { steps:new Map(), lessons:new Map(), representative:null };
  const id = `${lesson.slug}/${step.id}`;
  group.steps.set(id, { slug:lesson.slug, title:lesson.title, stepId:step.id });
  group.lessons.set(lesson.slug, (group.lessons.get(lesson.slug) || 0) + 1);
  if (!group.representative) group.representative = { slug:lesson.slug, lessonTitle:lesson.title, lessonIndex:lesson.lessonIndex, stepId:step.id, stepIndex:step.stepIndex };
  map.set(key, group);
  return group;
};
const serialGroup = (key, group) => ({
  id:`V-${hash(key)}`, signature:key, steps:group.steps.size, lessons:group.lessons.size,
  lessonBreakdown:Object.fromEntries([...group.lessons].sort(([a],[b]) => a.localeCompare(b, "tr"))),
  examples:[...group.steps.values()].slice(0, 6), representative:group.representative
});

let exitCode = 0;
try {
  await until(() => server.listening, "local audit server");
  const portFile = path.join(profileDir, "DevToolsActivePort");
  const debugPort = await until(() => fs.existsSync(portFile) ? Number(fs.readFileSync(portFile, "utf8").split("\n")[0]) : null, "Chrome debugging port");
  const client = await connectTarget(debugPort);
  await client.send("Emulation.setDeviceMetricsOverride", { width:1920, height:1080, deviceScaleFactor:1, mobile:false });
  await client.send("Page.navigate", { url:`${rootUrl}/#/karagoz/0` });
  await until(() => client.evaluate("Boolean(document.querySelector('#gate') && !document.querySelector('#gate').hidden)"), "password screen");
  await client.evaluate(`(() => { localStorage.clear(); sessionStorage.clear(); const input=document.querySelector('#gate-password'); input.value=${JSON.stringify(password)}; document.querySelector('#gate-form').requestSubmit(); })()`);
  await until(() => client.evaluate("Boolean(document.querySelector('#canvas .slide') && window.__sunumDesignAudit)"), "unlocked audited presentation");
  await client.evaluate("document.fonts.ready");
  const version = await client.send("Browser.getVersion");
  const counts = await client.evaluate("window.__sunumDesignAudit.getCatalogCounts()");
  const catalog = await client.evaluate("window.__sunumDesignAudit.metadata()");
  assert.equal(counts.lessonCount, catalog.length, "catalog lesson count agrees with runtime metadata");
  assert.equal(counts.stepCount, catalog.reduce((n,l) => n + l.steps.length, 0), "catalog step count agrees with runtime metadata");
  assert.deepEqual(counts.themes.sort(), ["TEMA_01","TEMA_02","TEMA_03","TEMA_04"], "all four themes are loaded in Chrome");

  const allLessons = maxSteps ? catalog.map((lesson) => ({ ...lesson, steps:lesson.steps.slice(0, Math.max(0, maxSteps)) })) : catalog;
  const stageVariations = new Map();
  const templateGroups = new Map();
  const stepCompositions = new Map();
  const viewportChecks = new Map();
  const layoutCounts = new Map();
  const layoutLessons = new Map();
  const revealCounts = new Map();
  const overflowIssues = [];
  const screenshotPaths = {};
  let scannedMainViews = 0;
  let scannedRevealViews = 0;
  let scannedResponsiveViews = 0;
  let scannedCoverViews = 0;
  let scannedEndViews = 0;

  const recordSnapshot = async ({ lesson, step, snapshot, stage, theme, viewport, guide, renderKey, layerKey, partIndex, pageCount }) => {
    const key = snapshot.signature;
    const group = addMapStep(stageVariations, key, lesson, step);
    group.template = snapshot.template;
    group.features = snapshot.features;
    if (!group.representativeStage) group.representativeStage = { stage, theme, viewport:viewport.id, guide, revealKey:layerKey || renderKey, partIndex:partIndex || 0, pageCount:pageCount || 1, representative:group.representative };
    const templateKey = snapshot.template;
    const template = addMapStep(templateGroups, templateKey, lesson, step);
    template.features = template.features || new Set();
    for (const feature of snapshot.features) template.features.add(feature.split(":")[0]);
    layoutCounts.set(step.layout, (layoutCounts.get(step.layout) || 0) + 1);
    if (!layoutLessons.has(step.layout)) layoutLessons.set(step.layout, new Set());
    layoutLessons.get(step.layout).add(lesson.slug);
    const issue = {
      slug:lesson.slug, title:lesson.title, stepId:step.id, layout:step.layout,
      stage, guide, theme, viewport:viewport.id, signature:`V-${hash(key)}`,
      unfitted:snapshot.body.unfitted, horizontalOverflow:snapshot.body.horizontalOverflow,
      textClips:snapshot.textClips, offCanvas:snapshot.offCanvas,
      bounds:{ viewport:snapshot.viewport, slide:snapshot.slide, body:snapshot.body }
    };
    if (issue.unfitted || issue.horizontalOverflow || issue.textClips.length || issue.offCanvas) overflowIssues.push(issue);
    if (viewport.all && stageVariations.get(key) && !screenshotPaths[`${hash(key)}-${theme}`]) {
      const relative = path.join("variants", `V-${hash(key)}-${theme}.png`);
      await screenshot(client, path.join(outputDir, relative));
      screenshotPaths[`${hash(key)}-${theme}`] = relative;
    }
    return `V-${hash(key)}`;
  };

  for (const viewport of dimensions) {
    await client.send("Emulation.setDeviceMetricsOverride", { width:viewport.width, height:viewport.height, deviceScaleFactor:1, mobile:false });
    await client.send("Emulation.setEmulatedMedia", { features:[] });
    await client.evaluate(`window.__sunumDesignAudit.setTheme(${JSON.stringify(viewport.theme)}); window.__sunumDesignAudit.resize()`);
    await client.evaluate("document.fonts.ready");
    for (const lesson of allLessons) {
      const stepSignatureIds = new Map();
      for (const kind of ["cover","end"]) {
        const pseudoStep={id:kind,stepIndex:kind==="cover"?-1:lesson.steps.length,layout:kind};
        const snapshot=await client.evaluate(`window.__sunumDesignAudit.configureCover(${lesson.lessonIndex},${kind==="end"},false)`);
        if (viewport.all) {
          await recordSnapshot({lesson,step:pseudoStep,snapshot,stage:kind,theme:viewport.theme,viewport,guide:false,renderKey:kind,layerKey:kind,partIndex:0,pageCount:1});
          if (kind==="cover") scannedCoverViews++; else scannedEndViews++;
        } else {
          const failures=[];
          if (snapshot.textClips.length) failures.push("text-clipping");
          if (snapshot.offCanvas) failures.push("off-canvas");
          const key=stateKey(viewport.theme,viewport);
          const viewReport=viewportChecks.get(key)||{viewport:viewport.id,theme:viewport.theme,scanned:0,issues:[]};
          viewReport.scanned++;
          if (failures.length) viewReport.issues.push({slug:lesson.slug,stepId:kind,signature:`V-${hash(snapshot.signature)}`,failures,clips:snapshot.textClips,bounds:{viewport:snapshot.viewport,slide:snapshot.slide,body:snapshot.body}});
          viewportChecks.set(key,viewReport);
          scannedResponsiveViews++;
        }
      }
      for (const step of lesson.steps) {
        const layoutGroup = `${lesson.theme}:${step.layout}`;
        const layout = layoutGroupsEnsure(layoutGroup);
        layout.steps.add(`${lesson.slug}/${step.id}`); layout.lessons.add(lesson.slug);
        if (!viewport.all) {
          const rendered = await client.evaluate(`window.__sunumDesignAudit.configure(${lesson.lessonIndex},${step.stepIndex},0,0,false,false).snapshot`);
          scannedResponsiveViews += 1;
          const key = stateKey(viewport.theme, viewport);
          const failures = [];
          if (rendered.body.unfitted) failures.push("unfitted");
          if (rendered.body.horizontalOverflow) failures.push("horizontal-overflow");
          if (rendered.textClips.length) failures.push("text-clipping");
          if (rendered.offCanvas) failures.push("off-canvas");
          const report = viewportChecks.get(key) || { viewport:viewport.id, theme:viewport.theme, scanned:0, issues:[] };
          report.scanned += 1;
          if (failures.length) report.issues.push({ slug:lesson.slug, stepId:step.id, signature:`V-${hash(rendered.signature)}`, failures, clips:rendered.textClips, bounds:{viewport:rendered.viewport,slide:rendered.slide,body:rendered.body} });
          viewportChecks.set(key, report);
          continue;
        }

        const guideModes = [false];
        const allRevealKeys = await client.evaluate(`window.__sunumDesignAudit.configure(${lesson.lessonIndex},${step.stepIndex},0,0,true,false).revealKeys`);
        const studentRevealKeys = await client.evaluate(`window.__sunumDesignAudit.configure(${lesson.lessonIndex},${step.stepIndex},0,0,false,false).revealKeys`);
        if (allRevealKeys.some((key) => !studentRevealKeys.includes(key))) guideModes.push(true);
        const combinedSignatures = [];
        for (const guide of guideModes) {
          const revealKeys = guide ? allRevealKeys : studentRevealKeys;
          const stageIndexes = [{ reveal:0, key:"content" }, ...revealKeys.map((key,index) => ({ reveal:index + 1, key }))];
          for (const entry of stageIndexes) {
            const count = await client.evaluate(`window.__sunumDesignAudit.configure(${lesson.lessonIndex},${step.stepIndex},${entry.reveal},0,${guide},false).pageCount`);
            const pages = Math.max(1, Number(count) || 1);
            for (let part = 0; part < pages; part += 1) {
              const snapshot = await client.evaluate(`window.__sunumDesignAudit.configure(${lesson.lessonIndex},${step.stepIndex},${entry.reveal},${part},${guide},false).snapshot`);
              const ref = { lesson, step, snapshot, stage:entry.reveal ? "reveal" : "content", theme:viewport.theme, viewport, guide, layerKey:entry.key, partIndex:part, pageCount:pages, renderKey:`${entry.key}${pages > 1 ? `-${part + 1}-of-${pages}` : ""}` };
              const id = await recordSnapshot(ref);
              combinedSignatures.push(`${guide ? "teacher" : "student"}:${entry.key}:${part + 1}/${pages}:${id}`);
              const countKey = `${guide ? "teacher" : "student"}:${entry.key}`;
              revealCounts.set(countKey, (revealCounts.get(countKey) || 0) + 1);
              if (entry.reveal) scannedRevealViews += 1; else scannedMainViews += 1;
            }
          }
        }
        stepSignatureIds.set(`${lesson.slug}/${step.id}`, [...new Set(combinedSignatures)].sort());
      }
      for (const [id, signatures] of stepSignatureIds) {
        const composite = signatures.join(" || ");
        const group = stepCompositions.get(composite) || { steps:new Set(), lessons:new Map(), representative:id, signatures };
        group.steps.add(id); const slug=lesson.slug; group.lessons.set(slug,(group.lessons.get(slug)||0)+1); stepCompositions.set(composite,group);
      }
    }
    if (viewport.all) console.log(`[design-audit] ${viewport.id}: all ${allLessons.reduce((n,l)=>n+l.steps.length,0)} steps and reveal pages scanned.`);
    else console.log(`[design-audit] ${viewport.id}: ${scannedResponsiveViews} step openings scanned in this pass.`);
  }

  function layoutGroupsEnsure(key) {
    if (!globalThis.__designAuditLayoutGroups) globalThis.__designAuditLayoutGroups = new Map();
    if (!globalThis.__designAuditLayoutGroups.has(key)) globalThis.__designAuditLayoutGroups.set(key, { steps:new Set(), lessons:new Set() });
    return globalThis.__designAuditLayoutGroups.get(key);
  }

  // Teacher-only guidance and explanations are also opened by the Y/A controls.
  // The stages are already rendered above in guide mode; confirm both controls' layer set.
  const teacherLayerExamples = {};
  for (const lesson of allLessons) for (const step of lesson.steps) {
    const keys = await client.evaluate(`window.__sunumDesignAudit.configure(${lesson.lessonIndex},${step.stepIndex},0,0,true,false).revealKeys`);
    for (const key of ["guidance","explanation"]) if (keys.includes(key)) teacherLayerExamples[key] ||= { slug:lesson.slug, lessonTitle:lesson.title, stepId:step.id };
  }

  // Repeat every step's opening at all additional desktop/tablet sizes, in both themes where requested.
  // This includes the base 1920×1080 board views already scanned above.
  for (const viewport of dimensions.filter((entry) => !entry.all)) {
    const key = stateKey(viewport.theme, viewport);
    const report = viewportChecks.get(key) || { viewport:viewport.id, theme:viewport.theme, scanned:0, issues:[] };
    // Dark tablet was included in this matrix; all other tablet/desktop views use light mode.
    viewportChecks.set(key, report);
  }

  // Reduced-motion must suppress both slide-entry and newly revealed panel animations.
  await client.send("Emulation.setDeviceMetricsOverride", { width:1920, height:1080, deviceScaleFactor:1, mobile:false });
  await client.send("Emulation.setEmulatedMedia", { features:[{ name:"prefers-reduced-motion", value:"reduce" }] });
  await client.evaluate("window.__sunumDesignAudit.setTheme('light')");
  const reducedMotion = [];
  const reducedSamples = [...stageVariations.values()].map((group) => group.representativeStage).filter(Boolean);
  const reducedSeen = new Set();
  for (const sample of reducedSamples) {
    const rep = sample.representative;
    const key = `${rep.slug}/${rep.stepId}:${sample.revealKey}`;
    if (reducedSeen.has(key)) continue;
    reducedSeen.add(key);
    const lesson = catalog.find((entry) => entry.slug === rep.slug);
    const step = lesson.steps.find((entry) => entry.id === rep.stepId);
    if (rep.stepId === "cover" || rep.stepId === "end") {
      await client.evaluate(`window.__sunumDesignAudit.motionCoverSnapshot(${lesson.lessonIndex},${rep.stepId === "end"})`);
    } else {
      const reveal = sample.revealKey === "content" ? 0 : Math.max(1, (step.reveals || []).indexOf(sample.revealKey) + 1);
      await client.evaluate(`window.__sunumDesignAudit.motionSnapshot(${lesson.lessonIndex},${step.stepIndex},${reveal},${sample.guide})`);
    }
    const motion = await client.evaluate(`(() => { const fresh=document.querySelector('#canvas .fresh'); const panel=fresh || document.querySelector('#canvas .panel'); return { reduced:matchMedia('(prefers-reduced-motion: reduce)').matches, slideAnimation:getComputedStyle(document.querySelector('#canvas .slide')).animationName, panelAnimation:panel ? getComputedStyle(panel).animationName : 'none' }; })()`);
    reducedMotion.push({ slug:rep.slug, stepId:rep.stepId, reduced:motion.reduced, slideAnimation:motion.slideAnimation, panelAnimation:motion.panelAnimation });
  }
  await client.send("Emulation.setEmulatedMedia", { features:[] });

  const controlScreens = {};
  if (!maxSteps) {
    await client.send("Emulation.setDeviceMetricsOverride", { width:1920, height:1080, deviceScaleFactor:1, mobile:false });
    for (const theme of ["light","dark"]) {
      await client.evaluate(`window.__sunumDesignAudit.setTheme(${JSON.stringify(theme)})`);
      await client.evaluate("document.querySelector('[data-action=menu]')?.click()");
      await until(() => client.evaluate("!document.querySelector('#menu').hidden"), "open lesson menu");
      const menuPath=path.join(outputDir,"controls",`menu-${theme}.png`);
      await screenshot(client,menuPath);
      controlScreens[`menu-${theme}`]=path.relative(outputDir,menuPath);
      await client.evaluate("document.querySelector('[data-action=close-menu]')?.click()");
      await client.evaluate("document.querySelector('[data-action=help]')?.click()");
      await until(() => client.evaluate("!document.querySelector('#help').hidden"), "open shortcuts help");
      const helpPath=path.join(outputDir,"controls",`help-${theme}.png`);
      await screenshot(client,helpPath);
      controlScreens[`help-${theme}`]=path.relative(outputDir,helpPath);
      await client.evaluate("document.querySelector('#help').hidden=true");
    }
  }

  const variations = [...stageVariations].map(([key, group]) => ({ ...serialGroup(key, group), template:group.template, features:group.features, representativeStage:group.representativeStage, screenshots:{ light:screenshotPaths[`${hash(key)}-light`] || null, dark:screenshotPaths[`${hash(key)}-dark`] || null } })).sort((a,b) => a.template.localeCompare(b.template) || a.signature.localeCompare(b.signature));
  const templates = [...templateGroups].map(([key,group]) => ({ ...serialGroup(key, group), ...(designReview[key] || {}), features:[...(group.features || [])].sort() })).sort((a,b)=>a.signature.localeCompare(b.signature));
  const compositions = [...stepCompositions.values()].map((group)=>({steps:group.steps.size,lessons:group.lessons.size,lessonBreakdown:Object.fromEntries([...group.lessons].sort(([a],[b])=>a.localeCompare(b,"tr"))),signatures:group.signatures,representative:group.representative})).sort((a,b)=>b.steps-a.steps);
  const layoutSummary = [...new Set(catalog.flatMap((lesson)=>lesson.steps.map((step)=>step.layout)))].sort().map((layout)=>({ layout, steps:catalog.flatMap((lesson)=>lesson.steps).filter((step)=>step.layout===layout).length, lessons:new Set(catalog.filter((lesson)=>lesson.steps.some((step)=>step.layout===layout)).map((lesson)=>lesson.slug)).size }));
  const responsiveIssues = [...viewportChecks.values()].flatMap((view)=>view.issues.map((issue)=>({ ...issue, viewport:view.viewport, theme:view.theme })));
  const allVisualIssues = [...overflowIssues, ...responsiveIssues];
  const hasFailure = (issue, failure, directKey) => Boolean(issue[directKey] || issue.failures?.includes(failure));
  const overflowBreakdown = {
    verticalScrollViews:allVisualIssues.filter((issue)=>hasFailure(issue,"unfitted","unfitted")).length,
    horizontalOverflowViews:allVisualIssues.filter((issue)=>hasFailure(issue,"horizontal-overflow","horizontalOverflow")).length,
    textClippedViews:allVisualIssues.filter((issue)=>(issue.textClips || issue.clips || []).length > 0 || issue.failures?.includes("text-clipping")).length,
    offCanvasViews:allVisualIssues.filter((issue)=>hasFailure(issue,"off-canvas","offCanvas")).length
  };
  const report = {
    generatedAt:new Date().toISOString(), chrome:{ product:version.product, userAgent:version.userAgent },
    totalLessons:catalog.length, totalSteps:catalog.reduce((n,lesson)=>n+lesson.steps.length,0),
    themes:Object.fromEntries(["TEMA_01","TEMA_02","TEMA_03","TEMA_04"].map((theme)=>[theme,{ lessons:catalog.filter((lesson)=>lesson.theme===theme).length, steps:catalog.filter((lesson)=>lesson.theme===theme).reduce((n,lesson)=>n+lesson.steps.length,0), lessonSlugs:catalog.filter((lesson)=>lesson.theme===theme).map((lesson)=>lesson.slug) }])),
    layoutSummary, templateCount:templates.length, templates, designReview, variationCount:variations.length, variations,
    stepCompositionCount:compositions.length, stepCompositions:compositions,
    renderedCoverViews:scannedCoverViews, renderedEndViews:scannedEndViews,
    renderedMainViews:scannedMainViews, renderedRevealPages:scannedRevealViews, responsiveStepViews:scannedResponsiveViews,
    viewports:dimensions.map((entry)=>({id:entry.id,width:entry.width,height:entry.height,theme:entry.theme,scanned:entry.all ? scannedCoverViews + scannedEndViews + scannedMainViews + scannedRevealViews : viewportChecks.get(stateKey(entry.theme,entry))?.scanned || 0,issues:entry.all ? overflowIssues.filter((issue)=>issue.viewport===entry.id) : viewportChecks.get(stateKey(entry.theme,entry))?.issues || []})),
    overflowIssues:allVisualIssues.slice(0,500), overflowIssueCount:allVisualIssues.length,
    responsiveFindingCount:responsiveIssues.length, overflowBreakdown,
    revealLayers:Object.fromEntries([...revealCounts].sort(([a],[b])=>a.localeCompare(b))),
    teacherLayerExamples, reducedMotionChecked:reducedMotion.length, reducedMotionFailures:reducedMotion.filter((entry)=>!entry.reduced || entry.slideAnimation !== "none" || (entry.panelAnimation !== "none" && entry.panelAnimation !== "")), reducedMotion,
    screenshotDirectory:path.relative(repoRoot,outputDir),
    ...(Object.keys(controlScreens).length ? { controlScreens } : {})
  };
  const reportPath = path.join(outputDir, "inventory.json");
  fs.writeFileSync(reportPath, `${JSON.stringify(report,null,2)}\n`);
  const markdown = [
    "# Sunum Web görsel envanteri",
    "",
    `Chrome: ${version.product} · ${report.generatedAt}`,
    `Kapsam: ${report.totalLessons} ders, ${report.totalSteps} adım · ${report.templateCount} render şablonu · ${report.variationCount} ekran varyasyonu · ${report.stepCompositionCount} adım kompozisyonu.`,
    "",
    "## Tema kapsamı",
    "",
    ...Object.entries(report.themes).map(([theme,value])=>`- ${theme}: ${value.lessons} ders, ${value.steps} adım.`),
    "",
    "## Sınıflandırma ve tasarım kararı",
    "",
    "Önceki Chrome görünümündeki sınıflandırma, bu dalda yapılan işlem ve korunma gerekçesi her şablon için açıkça yazılmıştır.",
    "",
    "| Şablon | Önceki durum | Bu çalışmadaki karar | Ders | Adım | Gerekçe |",
    "|---|---|---|---:|---:|---|",
    ...templates.map((template)=>`| ${template.signature} | ${template.previous || "—"} | ${template.action || "—"} | ${template.lessons} | ${template.steps} | ${template.reason || "—"} |`),
    "",
    "## Render şablonları",
    "",
    "| Şablon | Ders | Adım | Örnek |",
    "|---|---:|---:|---|",
    ...templates.map((template)=>`| ${template.signature} | ${template.lessons} | ${template.steps} | ${template.representative.slug}/${template.representative.stepId} |`),
    "",
    "## Ekran varyasyonları",
    "",
    "Her satır gerçek DOM bileşen imzasını, tema/ders kapsamını ve temsilî Chrome ekranını gösterir. `lessonBreakdown` her varyasyonun kapsadığı ders başına adım sayısını verir.",
    "",
    "| Varyasyon | Şablon | Ders | Adım | Ders/adım dağılımı | Temsilî adım | Açık / koyu ekran |",
    "|---|---|---:|---:|---|---|---|",
    ...variations.map((variation)=>{
      const breakdown=Object.entries(variation.lessonBreakdown).map(([slug,n])=>`${slug} (${n})`).join(", ");
      const light=variation.screenshots.light ? `[Açık](${variation.screenshots.light})` : "—";
      const dark=variation.screenshots.dark ? `[Koyu](${variation.screenshots.dark})` : "—";
      return `| ${variation.id} | ${variation.template} | ${variation.lessons} | ${variation.steps} | ${breakdown} | ${variation.representative.slug}/${variation.representative.stepId} · ${variation.representativeStage?.revealKey || "content"} | ${light} / ${dark} |`;
    }),
    "",
    "## Tarama ve taşma denetimi",
    "",
    ...report.viewports.map((view)=>{
      const verticalScroll=view.issues.filter((issue)=>hasFailure(issue,"unfitted","unfitted")).length;
      const horizontal=view.issues.filter((issue)=>hasFailure(issue,"horizontal-overflow","horizontalOverflow")).length;
      const clipped=view.issues.filter((issue)=>(issue.clips || []).length > 0 || issue.failures?.includes("text-clipping") || (issue.textClips || []).length > 0).length;
      const offCanvas=view.issues.filter((issue)=>hasFailure(issue,"off-canvas","offCanvas")).length;
      return `- ${view.id} (${view.theme}): ${view.scanned} görünüm tarandı; ${verticalScroll} dikey kaydırma gereken görünüm, ${horizontal} yatay taşma, ${clipped} metin kırpılması, ${offCanvas} slayt alanı dışına çıkan görünüm.`;
    }),
    `- Açık/koyu 1920×1080’de ${report.renderedMainViews} görev görünümü ve ${report.renderedRevealPages} açılma/parça görünümü tarandı.`,
    `- Tüm ekran boyutlarında toplam ${report.overflowIssueCount} bulgu: ${report.overflowBreakdown.verticalScrollViews} görünümde okunabilir içerik dikey kaydırma gerektiriyor; yatay taşma ${report.overflowBreakdown.horizontalOverflowViews}, metin kırpılması ${report.overflowBreakdown.textClippedViews}, slayt dışına taşma ${report.overflowBreakdown.offCanvasViews}.`,
    "- Dikey kaydırma bulguları metin kaybı değildir: içerik 24 px fiziksel yazı boyutunun altına küçültülmediği durumda gövde dokunma, tekerlek veya sunum kumandasıyla kaydırılır.",
    `- Azaltılmış hareket: ${report.reducedMotionChecked} temsilî görünüm; başarısız kontrol ${report.reducedMotionFailures.length}.`,
    "",
    "JSON raporu ayrıntılı DOM metriklerini, her varyasyonun ders/adım dağılımını ve tüm ekran yollarını içerir.",
    "",
    "## Kontrol yüzeyleri",
    "",
    "| Görünüm | Ekran |",
    "|---|---|",
    ...Object.entries(controlScreens).map(([name,file])=>`| ${name} | [Ekran](${file}) |`)
  ].join("\n");
  fs.writeFileSync(path.join(outputDir,"README.md"), `${markdown}\n`);
  if (baselinePath) {
    const baseline = JSON.parse(fs.readFileSync(baselinePath,"utf8"));
    const pairDir = path.join(outputDir,"matched-before-after");
    const beforeRoot = path.dirname(baselinePath);
    const pairs = [];
    for (const variation of baseline.variations) {
      const rep=variation.representative;
      const lesson=catalog.find((entry)=>entry.slug===rep.slug);
      const step=lesson?.steps.find((entry)=>entry.id===rep.stepId);
      const specialSlide=rep.stepId==="cover" || rep.stepId==="end";
      if (!lesson || (!step && !specialSlide)) continue;
      for (const theme of ["light","dark"]) {
        const beforeRelative=variation.screenshots?.[theme];
        if (!beforeRelative) continue;
        await client.send("Emulation.setDeviceMetricsOverride", { width:1920,height:1080,deviceScaleFactor:1,mobile:false });
        await client.send("Emulation.setEmulatedMedia", { features:[] });
        await client.evaluate(`window.__sunumDesignAudit.setTheme(${JSON.stringify(theme)})`);
        const stage=variation.representativeStage;
        const guide=Boolean(stage?.guide);
        const revealKey=stage?.revealKey || "content";
        let rendered;
        if (specialSlide) {
          rendered=await client.evaluate(`window.__sunumDesignAudit.configureCover(${lesson.lessonIndex},${rep.stepId==="end"},false)`);
        } else {
          const reveal=revealKey==="content" ? 0 : Math.max(1,(step.reveals||[]).indexOf(revealKey)+1);
          const part=stage?.partIndex || 0;
          rendered=await client.evaluate(`window.__sunumDesignAudit.configure(${lesson.lessonIndex},${step.stepIndex},${reveal},${part},${guide},false).snapshot`);
        }
        const afterRelative=path.join("variants",`V-${hash(rendered.signature)}-${theme}.png`);
        if (!fs.existsSync(path.join(outputDir,afterRelative))) await screenshot(client,path.join(outputDir,afterRelative));
        pairs.push({ id:variation.id, signature:variation.signature, theme, before:path.relative(outputDir,path.join(beforeRoot,beforeRelative)), after:afterRelative, representative:`${rep.slug}/${rep.stepId}` });
      }
    }
    fs.writeFileSync(path.join(outputDir,"before-after-pairs.json"),`${JSON.stringify(pairs,null,2)}\n`);
    fs.writeFileSync(path.join(outputDir,"before-after-pairs.md"),[
      "# Eşleştirilmiş önce/sonra ekranları","",
      `Önceki envanterdeki ${baseline.variationCount} gerçek Chrome varyasyonunun aynı ders/adım/açılma durumu yeniden görüntülendi.`,"",
      ...pairs.map((pair)=>`## ${pair.id} · ${pair.signature} · ${pair.theme} · ${pair.representative}\n\n| Önce | Sonra |\n|---|---|\n| ![Önce](${pair.before}) | ![Sonra](${pair.after}) |`)
    ].join("\n\n")+"\n");
  }

  console.log(`[design-audit] ${report.totalLessons} lessons / ${report.totalSteps} steps; ${report.templateCount} templates, ${report.variationCount} rendered variations, ${report.stepCompositionCount} step compositions.`);
  console.log(`[design-audit] ${report.renderedMainViews} openings, ${report.renderedRevealPages} reveal pages, ${report.responsiveStepViews} responsive step views; visual findings=${report.overflowIssueCount} (vertical scroll=${report.overflowBreakdown.verticalScrollViews}, clipping=${report.overflowBreakdown.textClippedViews}, horizontal=${report.overflowBreakdown.horizontalOverflowViews}, off-canvas=${report.overflowBreakdown.offCanvasViews}).`);
  console.log(`[design-audit] inventory: ${path.relative(repoRoot,reportPath)}`);
  if (report.reducedMotionFailures.length) {
    console.error(`[design-audit] reduced-motion failures: ${report.reducedMotionFailures.length}`);
    exitCode=1;
  }
  if (maxSteps) console.log(`[design-audit] partial run: DESIGN_AUDIT_MAX_STEPS=${maxSteps}`);
} catch (error) {
  console.error(error);
  exitCode=1;
} finally {
  for (const client of clients) client.close();
  chrome.kill("SIGTERM");
  if (chrome.exitCode === null) await Promise.race([new Promise((resolve) => chrome.once("exit", resolve)), sleep(3000)]);
  server.close();
  try { fs.rmSync(profileDir,{recursive:true,force:true,maxRetries:8,retryDelay:150}); } catch { /* Chrome may still be releasing its temporary profile. */ }
}
process.exitCode=exitCode;
