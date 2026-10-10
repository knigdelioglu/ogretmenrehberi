import assert from "node:assert/strict";
import crypto from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";
import { usesModernQuestionLayout } from "../src/qa-modern.js";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(appRoot, "../..");
const chrome = process.env.CHROME;
if (!chrome) throw new Error("Set CHROME to a Chrome/Chromium executable to run this real-browser test.");
const port = Number(process.env.PORT || 5181);
const root = `http://127.0.0.1:${port}`;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "sunum-web-cdp-"));
const rasterAudit = process.env.PPTX_RASTER_AUDIT === "1";
const qaVisualAudit = process.env.QA_VISUAL_AUDIT === "1";
const paginationGeometryAudit = process.env.PAGINATION_GEOMETRY_AUDIT === "1";
const server = rasterAudit ? http.createServer((request, response) => {
  const distDir = path.join(appRoot, "dist");
  const urlPath = decodeURIComponent(new URL(request.url, root).pathname);
  const file = path.resolve(distDir, urlPath === "/" ? "index.html" : `.${urlPath}`);
  if (!file.startsWith(`${distDir}${path.sep}`) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    response.writeHead(404).end("Not found");
    return;
  }
  let content = fs.readFileSync(file);
  if (urlPath === "/app.js") {
    content = Buffer.concat([content, Buffer.from(`\nwindow.__testCaptureSlideImage = async () => {
      const bytes = await captureSlideImage();
      let binary = "";
      for (let offset = 0; offset < bytes.length; offset += 32768) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
      }
      return btoa(binary);
    };\n`)]);
  }
  const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".bin": "application/octet-stream", ".svg": "image/svg+xml" };
  response.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-cache" });
  response.end(content);
}).listen(port, "127.0.0.1") : spawn(process.execPath, [path.join(appRoot, "scripts/serve.mjs")], {
  env: { ...process.env, PORT: String(port) }, stdio: "ignore"
});
const browser = spawn(chrome, [
  "--headless=new", "--no-sandbox", "--disable-gpu", "--disable-popup-blocking", "--no-first-run",
  "--remote-allow-origins=*", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank"
], { stdio: "ignore" });
const clients = [];

async function until(check, label, timeout = 15000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      const result = await check();
      if (result) return result;
    } catch { /* navigation temporarily destroys the execution context */ }
    await sleep(80);
  }
  throw new Error(`Timed out: ${label}`);
}

async function connectTarget(debugPort, predicate) {
  const target = await until(async () => {
    const response = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
    return (await response.json()).find((item) => item.type === "page" && predicate(item));
  }, "Chrome page target");
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  const pending = new Map();
  let sequence = 0;
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  });
  const client = {
    send(method, params = {}) {
      const id = ++sequence;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
    async evaluate(expression) {
      const result = await this.send("Runtime.evaluate", {
        expression, awaitPromise: true, returnByValue: true, userGesture: true
      });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
      return result.result.value;
    },
    close() { socket.close(); }
  };
  clients.push(client);
  await client.send("Page.enable");
  return client;
}

const lessons = JSON.parse(fs.readFileSync(path.join(repoRoot, "apps/lesson-player/src/generated/lessons.json"), "utf8"));
function readBuiltCatalog() {
  const dist = path.join(appRoot, "dist");
  const dataFile = fs.readdirSync(dist).find((name) => name.startsWith("data.") && name.endsWith(".bin"));
  assert.ok(dataFile, "built encrypted lesson catalog exists");
  const payload = fs.readFileSync(path.join(dist, dataFile));
  assert.equal(payload.toString("ascii", 0, 4), "SNM1", "built catalog uses the supported envelope");
  const iterations = payload.readUInt32BE(4);
  const salt = payload.subarray(8, 24);
  const iv = payload.subarray(24, 36);
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    crypto.pbkdf2Sync(process.env.SUNUM_SIFRE || "sunum", salt, iterations, 32, "sha256"),
    iv
  );
  decipher.setAuthTag(payload.subarray(-16));
  const compressed = Buffer.concat([decipher.update(payload.subarray(36, -16)), decipher.final()]);
  return JSON.parse(zlib.gunzipSync(compressed).toString("utf8"));
}
const builtCatalog = readBuiltCatalog();
const catalogAnswerRevealSteps = builtCatalog.lessons.flatMap((lesson) => lesson.steps)
  .filter((step) => step.prompt?.trim() && step.reveals?.includes("answer") && step.answer?.entry_type?.trim());
const qaModernCountsByLayout = new Map();
const qaModernCountsByEntryType = new Map();
for (const step of catalogAnswerRevealSteps) {
  assert.equal(usesModernQuestionLayout(step), true,
    `${step.answer.question_id || step.id} with ${step.answer.entry_type} meets QA-modern eligibility regardless of ${step.layout} layout`);
  const layout = step.layout || "(none)";
  qaModernCountsByLayout.set(layout, (qaModernCountsByLayout.get(layout) || 0) + 1);
  qaModernCountsByEntryType.set(step.answer.entry_type, (qaModernCountsByEntryType.get(step.answer.entry_type) || 0) + 1);
}
for (const step of builtCatalog.lessons.flatMap((lesson) => lesson.steps)) {
  if (!step.prompt?.trim() || !step.reveals?.includes("answer") || !step.answer?.entry_type?.trim()) {
    assert.equal(usesModernQuestionLayout(step), false,
      `${step.answer?.question_id || step.id} without a prompt, answer reveal, or typed answer stays outside QA-modern`);
  }
}
const qaModernCoverage = Object.fromEntries([...qaModernCountsByLayout.entries()].sort(([a], [b]) => a.localeCompare(b)));
const qaModernEntryTypes = Object.fromEntries([...qaModernCountsByEntryType.entries()].sort(([a], [b]) => a.localeCompare(b)));
assert.equal(qaModernEntryTypes.question_answer, 387, "all 387 question_answer steps remain QA-modern eligible");
assert.equal(Object.values(qaModernEntryTypes).reduce((sum, count) => sum + count, 0), 718,
  "all prompt-bearing steps with an answer reveal and typed canonical answer enter QA-modern");
console.log(`[sunum-web] QA-modern eligible catalog steps by layout: ${JSON.stringify(qaModernCoverage)}; by entry type: ${JSON.stringify(qaModernEntryTypes)} (total ${catalogAnswerRevealSteps.length}).`);
const multiPageContentQa = builtCatalog.lessons.flatMap((lesson) => lesson.steps.map((step) => ({ lesson, step })))
  .find(({ step }) => step.layout === "question" && step.reveals.includes("answer") &&
    ((step.content?.items?.length || 0) > 4 || (step.content?.sections?.length || 0) > 2));
assert.ok(multiPageContentQa, "production catalog has a question with answer reveal and potentially multi-page content");
const evidencePresentationCases = new Map();
for (const lesson of lessons) {
  for (const step of lesson.steps) {
    const unit = step.presentation?.web?.units?.find((entry) => entry.evidence_sections?.length);
    if (unit && !evidencePresentationCases.has(lesson.theme_id)) {
      evidencePresentationCases.set(lesson.theme_id, { lesson, step, unit });
    }
  }
}
const findStep = (slug, id) => {
  const lesson = lessons.find((entry) => entry.lesson_slug === slug);
  const index = lesson?.steps.findIndex((step) => step.id === id) ?? -1;
  assert.ok(index >= 0, `fixture exists: ${slug}/${id}`);
  return { lesson, step: lesson.steps[index], slide: index + 1 };
};
let page;

async function bodyText() { return page.evaluate("document.querySelector('#canvas .slide__body')?.innerText ?? ''"); }
async function headerMetrics() {
  return page.evaluate(`(() => {
    const top = document.querySelector('#canvas .slide__top');
    const where = top?.querySelector('.where');
    const style = where && getComputedStyle(where);
    return {
      height: top?.getBoundingClientRect().height,
      bodyTop: top?.nextElementSibling?.getBoundingClientRect().top,
      whiteSpace: style?.whiteSpace,
      title: where?.title
    };
  })()`);
}
async function answerPanelText() { return page.evaluate("document.querySelector('#canvas .panel--answer')?.innerText ?? ''"); }
async function evidencePanelText() { return page.evaluate("document.querySelector('#canvas .panel--evidence')?.innerText ?? ''"); }
async function qaState() {
  return page.evaluate(`(() => {
    const slide = document.querySelector('#canvas .slide');
    const context = slide?.querySelector('.qa-context');
    const focus = slide?.querySelector('.qa-focus');
    const where = slide?.querySelector('.slide__top .where');
    return {
      modern: slide?.classList.contains('slide--qa-modern') ?? false,
      comparison: slide?.classList.contains('slide--qa-comparison') ?? false,
      slidePrompt: slide?.querySelector('.slide__body .prompt')?.innerText ?? '',
      prompt: context?.querySelector('.prompt')?.innerText ?? '',
      context: context?.innerText ?? '',
      focus: focus?.innerText ?? '',
      badge: slide?.querySelector('.slide__top .qa-question')?.innerText.trim() ?? '',
      stageLabels: [...(focus?.querySelectorAll('.panel__label') ?? [])].map((label) => label.innerText.trim()),
      qaStageLabels: focus?.querySelectorAll('.qa-stage-label').length ?? 0,
      whereText: where?.innerText ?? '',
      whereTitle: where?.title ?? '',
      counter: slide?.querySelector('.slide__foot .counter')?.innerText ?? ''
    };
  })()`);
}
async function qaVocabularyStage(stage) {
  return page.evaluate(`(() => {
    const root = document.querySelector(${JSON.stringify(stage)});
    const prompt = document.querySelector("#canvas .slide--qa-modern .qa-context > .prompt");
    return {
      terms: [...(root?.querySelectorAll(".vocab__term") || [])].map((node) => node.textContent.trim()),
      termColors: [...(root?.querySelectorAll(".vocab__term") || [])].map((node) => getComputedStyle(node).color),
      hiddenMeanings: [...(root?.querySelectorAll(".vocab__meaning.is-hidden") || [])].length,
      promptFontSize: prompt ? Number.parseFloat(getComputedStyle(prompt).fontSize) : null,
      vocabCount: root?.querySelectorAll(".vocab").length ?? 0
    };
  })()`);
}
async function visualLayoutState() {
  return page.evaluate(`(() => {
    const slide = document.querySelector('#canvas .slide');
    const body = slide?.querySelector('.slide__body');
    return {
      prompt: slide?.querySelector('.prompt')?.innerText ?? '',
      visualClasses: [...(slide?.classList ?? [])].filter((name) => name.startsWith('slide--visual-')),
      qaModern: slide?.classList.contains('slide--qa-modern') ?? false,
      qaComparison: slide?.classList.contains('slide--qa-comparison') ?? false,
      children: [...(slide?.children ?? [])].map((child) => child.tagName),
      bodyClasses: [...(body?.querySelector('.body-grid > .stack')?.classList ?? [])],
      stepLists: body?.querySelectorAll('.steps-list').length ?? 0,
      sections: body?.querySelectorAll('.sections').length ?? 0,
      sources: body?.querySelectorAll('.source-links a').length ?? 0,
      revealDots: slide?.querySelectorAll('.dots i').length ?? 0,
      revealedDots: slide?.querySelectorAll('.dots i.on').length ?? 0
    };
  })()`);
}
async function qaPromptMetrics() {
  return page.evaluate(`(() => {
    const prompt = document.querySelector('#canvas .slide--qa-modern .qa-context > .prompt');
    if (!prompt) return null;
    const measure = () => {
      const style = getComputedStyle(prompt);
      const range = document.createRange();
      range.selectNodeContents(prompt);
      const lineTops = [...range.getClientRects()]
        .map((rect) => rect.top)
        .sort((a, b) => a - b)
        .filter((top, index, tops) => index === 0 || top - tops[index - 1] > 1);
      return {
        lineCount: lineTops.length,
        textAlign: style.textAlign,
        fontCheck: document.fonts.check('16px "Inter"', prompt.textContent),
        interFaces: [...document.fonts]
          .filter((face) => face.family.replace(/[\"']/g, "").trim() === "Inter")
          .map((face) => ({ status: face.status, weight: face.weight, style: face.style })),
        inputs: {
          width: style.width,
          maxWidth: style.maxWidth,
          fontSize: style.fontSize,
          lineHeight: style.lineHeight,
          letterSpacing: style.letterSpacing,
          fontFamily: style.fontFamily
        }
      };
    };
    const appliedTextAlign = prompt.style.textAlign;
    const afterAlignment = measure();
    prompt.style.removeProperty('text-align');
    const beforeAlignment = measure();
    if (appliedTextAlign) prompt.style.setProperty('text-align', appliedTextAlign);
    const restored = measure();
    return { appliedTextAlign, beforeAlignment, afterAlignment, restored };
  })()`);
}
async function qaContentAlignmentState() {
  return page.evaluate(`(() => {
    const slide = document.querySelector('#canvas .slide--qa-modern');
    const context = slide?.querySelector('.qa-context');
    const prompt = context?.querySelector(':scope > .prompt');
    const list = context?.querySelector('.steps-list');
    const item = list?.querySelector('li');
    const number = item?.querySelector('.n');
    const text = number?.nextElementSibling;
    const align = (node) => node ? getComputedStyle(node).textAlign : null;
    const rect = (node) => { const box = node?.getBoundingClientRect(); return box && {left:box.left,right:box.right}; };
    return {
      prompt: align(prompt), context: align(context),
      content: [...(context?.querySelectorAll(':scope > :not(.prompt), .lead, .steps-list, .steps-list li, .steps-list li > :not(.n), .sections, .sec, .criteria, .fields, .vocab__item, .vocab__meaning') || [])]
        .map((node) => ({selector:node.className || node.tagName, align:align(node)})),
      listDisplay: item ? getComputedStyle(item).display : null,
      number: rect(number), itemText: rect(text)
    };
  })()`);
}
async function waitForPromptFonts() {
  await page.evaluate("document.fonts.ready.then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))");
}
async function qaVisualState() {
  return page.evaluate(`(() => {
    const slide = document.querySelector('#canvas .slide--qa-modern');
    const context = slide?.querySelector('.qa-context');
    const focus = slide?.querySelector('.qa-focus');
    const prompt = context?.querySelector(':scope > .prompt');
    const body = slide?.querySelector('.slide__body');
    const style = prompt && getComputedStyle(prompt);
    return {
      prompt: prompt?.innerText ?? '',
      context: context?.innerText ?? '',
      focus: focus?.innerText ?? '',
      answer: focus?.querySelector('.panel--answer')?.innerText ?? '',
      evidence: focus?.querySelector('.panel--evidence')?.innerText ?? '',
      fontFamily: style?.fontFamily ?? '',
      fontCheck: Boolean(prompt && document.fonts.check('16px "Inter"', prompt.textContent)),
      bodyScrollTop: body?.scrollTop ?? -1,
      bodyOverflowing: body?.classList.contains('is-overflowing') ?? false
    };
  })()`);
}
async function captureQaScreenshot(label) {
  await waitForPromptFonts();
  await page.evaluate(`(() => {
    for (const animation of document.querySelector('#canvas .slide')?.getAnimations() ?? []) {
      try { animation.finish(); } catch { /* canceled entry animations are already stable */ }
    }
  })()`);
  await page.evaluate("new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))");
  const state = await qaVisualState();
  assert.ok(state.prompt, `${label} renders a QA prompt`);
  assert.match(state.fontFamily, /^\s*["']?Inter["']?(?:\s*,|$)/i, `${label} uses Inter`);
  assert.equal(state.fontCheck, true, `${label} screenshot is captured after Inter loads`);
  assert.equal(state.bodyScrollTop, 0, `${label} screenshot starts at the top of its QA body`);
  assert.equal(state.bodyOverflowing, false, `${label} QA body fits without extra scroll captures`);
  const rect = await page.evaluate(`(() => {
    const bounds = document.querySelector('#canvas .slide--qa-modern')?.getBoundingClientRect();
    return bounds && { x: bounds.left, y: bounds.top, width: bounds.width, height: bounds.height,
      viewportWidth: innerWidth, viewportHeight: innerHeight };
  })()`);
  assert.deepEqual([rect?.viewportWidth, rect?.viewportHeight, rect?.width, rect?.height], [1920, 1080, 1920, 1080],
    `${label} web view and screenshot clip use the 1920×1080 canvas`);
  const screenshot = await page.send("Page.captureScreenshot", {
    format: "png", fromSurface: true, captureBeyondViewport: true,
    clip: { x: rect.x, y: rect.y, width: rect.width, height: rect.height, scale: 1 }
  });
  const bytes = Buffer.from(screenshot.data, "base64");
  assert.equal(bytes.toString("hex", 0, 8), "89504e470d0a1a0a", `${label} browser screenshot is PNG`);
  assert.deepEqual([bytes.readUInt32BE(16), bytes.readUInt32BE(20)], [1920, 1080],
    `${label} browser screenshot clip is 1920×1080`);
  return { label, state, bytes };
}
async function comparePngPixels(browserPng, pptxPng) {
  return page.evaluate(`(async () => {
    const decode = async (base64) => {
      const binary = atob(base64);
      const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
      const image = new Image();
      image.src = URL.createObjectURL(new Blob([bytes], { type: 'image/png' }));
      try { await image.decode(); } finally { URL.revokeObjectURL(image.src); }
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(image, 0, 0);
      return { width: canvas.width, height: canvas.height, pixels: context.getImageData(0, 0, canvas.width, canvas.height).data };
    };
    const [browser, pptx] = await Promise.all([decode(${JSON.stringify(browserPng.toString("base64"))}), decode(${JSON.stringify(pptxPng.toString("base64"))})]);
    if (browser.width !== pptx.width || browser.height !== pptx.height) return { dimensionsMatch: false, browser: [browser.width, browser.height], pptx: [pptx.width, pptx.height] };
    let differentPixels = 0;
    let changedChannels = 0;
    let totalChannelDelta = 0;
    let maxChannelDelta = 0;
    for (let pixel = 0; pixel < browser.width * browser.height; pixel += 1) {
      let pixelDiffers = false;
      for (let channel = 0; channel < 4; channel += 1) {
        const delta = Math.abs(browser.pixels[pixel * 4 + channel] - pptx.pixels[pixel * 4 + channel]);
        if (delta) { pixelDiffers = true; changedChannels += 1; totalChannelDelta += delta; maxChannelDelta = Math.max(maxChannelDelta, delta); }
      }
      if (pixelDiffers) differentPixels += 1;
    }
    return {
      dimensionsMatch: true,
      width: browser.width,
      height: browser.height,
      differentPixels,
      changedChannels,
      meanChangedChannelDelta: changedChannels ? totalChannelDelta / changedChannels : 0,
      maxChannelDelta
    };
  })()`);
}
async function installQaTransitionProbe() {
  await page.evaluate(`(() => {
    const probe = window.__qaTransitionProbe = { calls: [] };
    const promptSnapshot = () => {
      const prompts = [...document.querySelectorAll('#canvas .slide--qa-modern .qa-context > .prompt')];
      const prompt = prompts[0];
      return prompt ? {
        count: prompts.length,
        text: prompt.textContent,
        viewTransitionName: getComputedStyle(prompt).viewTransitionName
      } : null;
    };
    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      writable: true,
      value(callback) {
        const before = promptSnapshot();
        callback();
        const after = promptSnapshot();
        probe.calls.push({
          before,
          after,
          exportBusy: document.querySelector('#menu')?.getAttribute('aria-busy') === 'true'
        });
        const settled = Promise.resolve();
        return { ready: settled, finished: settled, updateCallbackDone: settled, skipTransition() {} };
      }
    });
  })()`);
}
async function qaTransitionCalls() {
  return page.evaluate("window.__qaTransitionProbe?.calls ?? []");
}
async function clearQaTransitionCalls() {
  await page.evaluate("if (window.__qaTransitionProbe) window.__qaTransitionProbe.calls = []");
}
async function qaViewportMetrics() {
  return page.evaluate(`(() => {
    const body = document.querySelector('#canvas .slide__body');
    const focus = document.querySelector('#canvas .qa-focus');
    const stage = focus?.querySelector('.panel, .qa-stage-label');
    const bodyRect = body?.getBoundingClientRect();
    const stageRect = stage?.getBoundingClientRect();
    const visibleIntersection = Boolean(bodyRect && stageRect &&
      Math.min(bodyRect.bottom, stageRect.bottom) > Math.max(bodyRect.top, stageRect.top) &&
      Math.min(bodyRect.right, stageRect.right) > Math.max(bodyRect.left, stageRect.left));
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      horizontalOverflow: Boolean(body && body.scrollWidth > body.clientWidth + 1),
      bodyCanScrollVertically: Boolean(body?.classList.contains('is-overflowing')),
      focusText: focus?.innerText.trim() ?? '',
      focusStageVisible: visibleIntersection
    };
  })()`);
}
async function next() {
  await page.evaluate(`(() => {
    const body = document.querySelector('#canvas .slide__body');
    if (body) body.scrollTop = body.scrollHeight;
    document.querySelector('#dock [data-action=next]').click();
  })()`);
  await sleep(150);
  return bodyText();
}
async function nextImmediately() {
  await page.evaluate(`(() => {
    const body = document.querySelector('#canvas .slide__body');
    if (body) body.scrollTop = body.scrollHeight;
    document.querySelector('#dock [data-action=next]').click();
  })()`);
}
async function previous() {
  await page.evaluate("document.querySelector('#dock [data-action=prev]').click()");
  await sleep(150);
  return bodyText();
}
async function openStep(slug, id) {
  const entry = findStep(slug, id);
  await page.send("Page.navigate", { url: `${root}/#/${entry.lesson.lesson_slug}/${entry.slide}` });
  await until(async () => (await bodyText()).includes(entry.step.display_prompt), `open ${id}`);
  await until(() => page.evaluate("Array.from(document.querySelectorAll('#canvas .content-images img')).every(image => image.complete && image.naturalWidth > 0)"), `images ${id}`);
  await waitForPromptFonts();
  return { ...entry, text: await bodyText() };
}
function terms(text) {
  return page.evaluate("Array.from(document.querySelectorAll('#canvas .vocab__term, #canvas .dict dt')).map(el => el.textContent.trim())");
}
const includesText = (text, fragment) => text.toLocaleLowerCase("tr").includes(fragment.toLocaleLowerCase("tr"));
async function revealDictionaryGroup(firstTerms, nextTerms, firstMeaning, nextMeaning, inspectFirstAnswer) {
  const initial = await bodyText();
  const initialTerms = await terms(initial);
  assert.ok(firstTerms.every((term) => includesText(initial, term)), "first term group is visible initially");
  assert.ok(!includesText(initial, firstMeaning), "first group's meaning is initially hidden");
  assert.ok(!nextTerms.some((term) => initialTerms.some((visible) => visible.toLocaleLowerCase("tr") === term.toLocaleLowerCase("tr"))), "later group is initially hidden");
  const firstAnswer = await next();
  inspectFirstAnswer?.(firstAnswer);
  const firstAnswerTerms = await terms(firstAnswer);
  assert.ok(includesText(firstAnswer, firstMeaning), "first group's meaning opens on the first click");
  assert.ok(!nextTerms.some((term) => firstAnswerTerms.some((visible) => visible.toLocaleLowerCase("tr") === term.toLocaleLowerCase("tr"))), "later group waits for the first group's answer");
  const nextPrompt = await next();
  const nextPromptTerms = await terms(nextPrompt);
  assert.ok(nextTerms.every((term) => nextPromptTerms.some((visible) => visible.toLocaleLowerCase("tr") === term.toLocaleLowerCase("tr"))), "next term group opens after the first answer");
  assert.ok(!includesText(nextPrompt, nextMeaning), "next group's meaning remains hidden until another click");
  const nextAnswer = await next();
  assert.ok(includesText(nextAnswer, nextMeaning), "next group's meaning opens on the following click");
}

async function advanceUntil(predicate, label, max = 12) {
  let current = await bodyText();
  for (let index = 0; index < max; index += 1) {
    if (predicate(current)) return current;
    current = await next();
  }
  assert.fail(`Could not reach ${label}`);
}

function firstSourceString(value) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(firstSourceString).find(Boolean) || "";
  if (value && typeof value === "object") return Object.values(value).map(firstSourceString).find(Boolean) || "";
  return "";
}

async function advanceUntilEvidenceSection(sectionKey, label) {
  for (let index = 0; index < 36; index += 1) {
    const panelText = await evidencePanelText();
    if (includesText(panelText, sectionKey)) return await bodyText();
    await next();
  }
  assert.fail(`Could not reach evidence section ${label}`);
}

try {
  await until(async () => (await fetch(root)).ok, "Sunum Web local server");
  const portFile = path.join(profile, "DevToolsActivePort");
  const debugPort = await until(() => fs.existsSync(portFile)
    ? Number(fs.readFileSync(portFile, "utf8").split("\n")[0]) : null, "Chrome debugging endpoint");
  page = await connectTarget(debugPort, (target) => target.url === "about:blank");
  await page.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await page.send("Page.navigate", { url: `${root}/#/karagoz/0` });
  await until(() => page.evaluate("!document.querySelector('#gate').hidden"), "password screen");
  const password = JSON.stringify(process.env.SUNUM_SIFRE || "sunum");
  await page.evaluate(`document.querySelector('#gate-password').value = ${password}; document.querySelector('#gate-submit').click()`);
  try {
    await until(() => page.evaluate("Boolean(document.querySelector('#canvas .slide'))"), "unlocked presentation");
  } catch (error) {
    const diagnostics = await page.evaluate("JSON.stringify({gateError: document.querySelector('#gate-error')?.textContent, visible: !document.querySelector('#gate').hidden, canvas: document.querySelector('#canvas')?.innerText, ready: document.readyState})");
    console.error(`[sunum-web] Chrome unlock diagnostics: ${diagnostics}`);
    throw error;
  }

presentationBrowserSuite: {
  if (paginationGeometryAudit) {
    await page.send("Emulation.setDeviceMetricsOverride", { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
    await page.evaluate('document.fonts.load(\'400 16px "Inter"\')');
    const targetLayouts = new Set(["process", "assessment", "reference", "structure", "comparison"]);
    const candidates = lessons.flatMap((lesson) => lesson.steps.map((step, index) => {
      const content = step.content || {};
      const items = Array.isArray(content.items) ? content.items : [];
      const sections = Array.isArray(content.sections) ? content.sections : [];
      const contentWeight = items.reduce((total, item) => total + String(item).length, 0) +
        sections.reduce((total, section) => total + String(section.title || "").length + String(section.body || "").length, 0);
      const answer = step.answer || {};
      const answerSections = answer.answer_sections || {};
      const answerWeight = String(answer.answer || "").length + JSON.stringify(answerSections).length +
        (answer.evidence_quotes || []).reduce((total, quote) => total + String(quote).length, 0);
      const contentMayPaginate = items.length > (content.scale?.length ? 6 : 4) || sections.length > 2 || contentWeight > 850;
      const answerMayPaginate = (step.presentation?.web?.units?.length || 0) > 1 ||
        Object.keys(answerSections).length > 2 || answerWeight > 760 ||
        (answer.evidence_quotes?.length || 0) > 4 || String(answer.guidance || "").length > 900 ||
        String(answer.explanation || "").length > 900 || (answer.dictionary_terms?.length || 0) > 4;
      const qaModern = usesModernQuestionLayout(step);
      const knownQaMultiPageAnswer = lesson.lesson_slug === "ogulla-bulusma" && step.id === "s100-q1";
      if (!targetLayouts.has(step.layout) && !qaModern && !knownQaMultiPageAnswer) return null;
      if (!contentMayPaginate && !answerMayPaginate && !knownQaMultiPageAnswer) return null;
      return { lesson, step, slide: index + 1, contentMayPaginate, answerMayPaginate, qaModern };
    })).filter(Boolean);
    const groups = new Map();
    const unstable = [];
    const pageCountByLayout = new Map();
    let scannedSteps = 0;
    let measuredPages = 0;
    let roundTripChecked = false;

    async function readPromptGeometry() {
      return page.evaluate(`(() => {
        for (const animation of document.getAnimations({subtree:true})) {
          try { animation.finish(); } catch { /* a completed or canceled transition is already stable */ }
        }
        const slide=document.querySelector('#canvas .slide');
        const body=slide?.querySelector('.slide__body');
        const prompt=slide?.querySelector('.qa-context > .prompt') || slide?.querySelector('.prompt');
        const where=slide?.querySelector('.slide__top .where')?.innerText || '';
        const counter=slide?.querySelector('.slide__foot .counter')?.innerText || '';
        const focus=slide?.querySelector('.qa-focus');
        const label=focus?.querySelector('.panel__label,.qa-stage-label')?.innerText.trim() || 'İçerik';
        const qa=slide?.classList.contains('slide--qa-modern') || false;
        const marker=qa ? counter.match(/sayfa\\s+(\\d+)\\/(\\d+)/i) : where.match(/ · (\\d+)\\/(\\d+)$/);
        const style=prompt && getComputedStyle(prompt);
        const range=prompt && document.createRange();
        if(range) range.selectNodeContents(prompt);
        const lineCount=range ? [...range.getClientRects()].map((line)=>line.top).sort((a,b)=>a-b)
          .filter((top,index,tops)=>index===0||top-tops[index-1]>1).length : 0;
        const box=prompt?.getBoundingClientRect();
        return {
          prompt:prompt?.innerText || '', top:box?.top ?? null, left:box?.left ?? null, width:box?.width ?? null,
          fontSize:style ? Number.parseFloat(style.fontSize) : null, lineCount,
          scale:body ? Number.parseFloat(getComputedStyle(body).getPropertyValue('--k')) || 1 : 1,
          qa, view:qa ? label : where.replace(/ · \\d+\\/\\d+$/, ''),
          revealIndex:Number(location.hash.split('/')[3] || 0),
          pageIndex:marker ? Number(marker[1]) : null, pageTotal:marker ? Number(marker[2]) : null,
          slideIndex:Number(counter.match(/^(\\d+)\\s*\\//)?.[1] || 0),
          scrollWidth:body?.scrollWidth ?? 0, clientWidth:body?.clientWidth ?? 0,
          bodyText:body?.innerText || ''
        };
      })()`);
    }
    async function changePart(action) {
      await page.evaluate(`(() => {
        const direction=${JSON.stringify(action)};
        const body=document.querySelector('#canvas .slide__body');
        if(body) body.scrollTop=direction==='next' ? body.scrollHeight : 0;
        document.querySelector('#dock [data-action=${JSON.stringify(action === "next" ? "next" : "prev")}]').click();
      })()`);
      await page.evaluate("new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))");
      return readPromptGeometry();
    }
    const round = (value) => Math.round(value * 100) / 100;
    await page.evaluate("document.querySelector('#dock [data-action=menu]').click()");
    await until(() => page.evaluate("!document.querySelector('#menu').hidden"), "enable full reveal pagination audit");
    if (!(await page.evaluate("document.querySelector('#menu-guide')?.checked"))) {
      await page.evaluate("document.querySelector('#menu-guide').click()");
    }
    await page.evaluate("document.querySelector('#menu [data-action=close-menu]').click()");
    await until(() => page.evaluate("document.querySelector('#menu').hidden"), "close pagination audit menu");

    async function openPosition(lesson, step, slide, reveal, part) {
      const path = `/${lesson.lesson_slug}/${slide}${reveal || part ? `/${reveal}` : ""}${part ? `/${part}` : ""}`;
      const expectedHash = `#${path}`;
      await page.evaluate(`location.hash=${JSON.stringify(path)}`);
      const opened = await until(() => page.evaluate(`(() => {
        const prompt=document.querySelector('#canvas .prompt')?.innerText || '';
        const counter=Number(document.querySelector('#canvas .slide__foot .counter')?.innerText.match(/^(\\d+)\\s*\\//)?.[1] || 0);
        return location.hash === ${JSON.stringify(expectedHash)} && prompt === ${JSON.stringify(step.display_prompt)} && counter === ${slide};
      })()`), `pagination geometry open ${step.id} ${reveal}/${part}`).catch(() => false);
      if (!opened) {
        await page.send("Page.navigate", { url: `${root}/${expectedHash}` });
        const reloaded = await until(() => page.evaluate(`(() => {
          const prompt=document.querySelector('#canvas .prompt')?.innerText || '';
          const counter=Number(document.querySelector('#canvas .slide__foot .counter')?.innerText.match(/^(\\d+)\\s*\\//)?.[1] || 0);
          return location.hash === ${JSON.stringify(expectedHash)} && prompt === ${JSON.stringify(step.display_prompt)} && counter === ${slide};
        })()`), `pagination geometry reload ${step.id} ${reveal}/${part}`).catch(() => false);
        if (reloaded) return readPromptGeometry();
        const actual = await page.evaluate(`(() => ({hash:location.hash,prompt:document.querySelector('#canvas .prompt')?.innerText || '',counter:document.querySelector('#canvas .slide__foot .counter')?.innerText || '',where:document.querySelector('#canvas .where')?.innerText || ''}))()`);
        assert.fail(`pagination geometry could not open ${step.id} at ${lesson.lesson_slug}/${slide}/${reveal}/${part}: ${JSON.stringify(actual)}`);
      }
      return readPromptGeometry();
    }

    for (const candidate of candidates) {
      const { lesson, step, slide } = candidate;
      scannedSteps += 1;
      for (const reveal of [0]) {
        const first = await openPosition(lesson, step, slide, reveal, 0);
        const total = first.pageTotal || 1;
        if (total < 2) continue;
        for (let part = 0; part < total; part += 1) {
          const current = part === 0 ? first : await openPosition(lesson, step, slide, reveal, part);
          assert.equal(current.pageIndex, part + 1, `${step.id} restores ${current.pageIndex}/${total} from URL`);
          assert.equal(current.pageTotal, total, `${step.id} keeps the ${total}-page view count during URL restore`);
          measuredPages += 1;
          const key = `${step.id}|${current.revealIndex}|${total}`;
          if (!groups.has(key)) groups.set(key, { stepId:step.id, layout:step.layout, qa:current.qa, revealIndex:current.revealIndex, view:current.view, total, pages:[] });
          groups.get(key).pages.push(current);
          if (part === 0 && total === 2 && !roundTripChecked) {
            const second = await changePart("next");
            assert.equal(second.pageIndex, 2, `${step.id} advances from page 1/2 to 2/2`);
            const back = await changePart("prev");
            assert.equal(back.pageIndex, 1, `${step.id} returns from page 2/2 to 1/2`);
            assert.ok(Math.abs(back.top - current.top) <= 2 && Math.abs(back.left - current.left) <= 2,
              `${step.id} keeps prompt geometry on 1/2 → 2/2 → 1/2 navigation`);
            const forward = await changePart("next");
            assert.equal(forward.pageIndex, 2, `${step.id} advances again to page 2/2 after reverse navigation`);
            roundTripChecked = true;
          }
        }
      }
    }

    const qaAnswerCandidate = candidates.find((candidate) => candidate.lesson.lesson_slug === "ogulla-bulusma" && candidate.step.id === "s100-q1");
    await openPosition(qaAnswerCandidate.lesson, qaAnswerCandidate.step, qaAnswerCandidate.slide, 0, 0);
    let qaAnswerPage = await readPromptGeometry();
    for (let advance = 0; advance < 8 && !await page.evaluate("(document.querySelector('#canvas .qa-focus')?.innerText || '').includes('Çordon, yaklaşık yirmi yıl önce')"); advance += 1) {
      await page.evaluate("document.querySelector('#dock [data-action=next]').click()");
      await page.evaluate("new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))");
      qaAnswerPage = await readPromptGeometry();
    }
    assert.ok(qaAnswerPage.qa && qaAnswerPage.revealIndex > 0 && qaAnswerPage.pageTotal >= 2 &&
      qaAnswerPage.bodyText.includes("Çordon, yaklaşık yirmi yıl önce"),
      `s100-q1 opens a multi-page QA-modern answer: ${JSON.stringify(qaAnswerPage)}`);
    const qaAnswerKey = `s100-q1|${qaAnswerPage.revealIndex}|${qaAnswerPage.pageTotal}`;
    groups.set(qaAnswerKey, { stepId:"s100-q1", layout:"question", qa:true, revealIndex:qaAnswerPage.revealIndex,
      view:"Cevap", total:qaAnswerPage.pageTotal, pages:[qaAnswerPage] });
    for (let part = 1; part < qaAnswerPage.pageTotal; part += 1) {
      const answerPart = await openPosition(qaAnswerCandidate.lesson, qaAnswerCandidate.step, qaAnswerCandidate.slide,
        qaAnswerPage.revealIndex, part);
      assert.equal(answerPart.pageIndex, part + 1, `s100-q1 restores QA answer page ${part + 1}/${qaAnswerPage.pageTotal}`);
      groups.get(qaAnswerKey).pages.push(answerPart);
      measuredPages += 1;
    }

    const multipageSteps = new Set();
    const multipageViews = [];
    for (const group of groups.values()) {
      const pageByIndex = new Map(group.pages.map((item) => [item.pageIndex, item]));
      if (pageByIndex.size < 2) continue;
      multipageSteps.add(group.stepId);
      multipageViews.push(group);
      const sequence = Array.from({ length:group.total }, (_, index) => pageByIndex.get(index + 1)).filter(Boolean);
      assert.equal(sequence.length, group.total, `${group.stepId} ${group.view} captures every page in ${group.total}-page view`);
      const baseline = sequence[0];
      const maxTopDelta = Math.max(...sequence.map((item) => Math.abs(item.top - baseline.top)));
      const maxLeftDelta = Math.max(...sequence.map((item) => Math.abs(item.left - baseline.left)));
      const maxWidthDelta = Math.max(...sequence.map((item) => Math.abs(item.width - baseline.width)));
      const maxFontDelta = Math.max(...sequence.map((item) => Math.abs(item.fontSize - baseline.fontSize)));
      const maxScaleDelta = Math.max(...sequence.map((item) => Math.abs(item.scale - baseline.scale)));
      const lineCounts = new Set(sequence.map((item) => item.lineCount));
      const metrics = { stepId:group.stepId, layout:group.layout, view:group.view, total:group.total,
        maxTopDelta:round(maxTopDelta), maxLeftDelta:round(maxLeftDelta), maxWidthDelta:round(maxWidthDelta),
        maxFontDelta:round(maxFontDelta), maxScaleDelta:round(maxScaleDelta), lineCounts:[...lineCounts] };
      if (maxTopDelta > 2 || maxLeftDelta > 2 || maxWidthDelta > 2 || maxFontDelta > 1 || lineCounts.size !== 1) unstable.push(metrics);
      assert.ok(maxTopDelta <= 2, `${group.stepId} ${group.view} prompt top differs by at most 2px across pages: ${JSON.stringify(metrics)}`);
      assert.ok(maxLeftDelta <= 2, `${group.stepId} ${group.view} prompt left stays fixed across pages: ${JSON.stringify(metrics)}`);
      assert.ok(maxWidthDelta <= 2, `${group.stepId} ${group.view} prompt width stays fixed across pages: ${JSON.stringify(metrics)}`);
      assert.ok(maxFontDelta <= 1 && lineCounts.size === 1,
        `${group.stepId} ${group.view} keeps prompt size and wrapping stable when fitBody scale changes: ${JSON.stringify(metrics)}`);
      assert.ok(sequence.every((item) => item.scrollWidth <= item.clientWidth + 1), `${group.stepId} ${group.view} has no horizontal overflow across pages`);
      pageCountByLayout.set(group.layout, (pageCountByLayout.get(group.layout) || 0) + 1);
    }

    const getExample = (predicate) => multipageViews.find(predicate);
    const processGroups = multipageViews.filter((group) => group.layout === "process" && group.total === 2 && group.pages.length >= 2);
    const processDenseShort = processGroups.find((group) => group.pages.find((page) => page.pageIndex === 1)?.bodyText.length > group.pages.find((page) => page.pageIndex === 2)?.bodyText.length);
    const processShortDense = processGroups.find((group) => group.pages.find((page) => page.pageIndex === 1)?.bodyText.length < group.pages.find((page) => page.pageIndex === 2)?.bodyText.length);
    const threePage = getExample((group) => group.total >= 3);
    const qaAnswer = getExample((group) => group.qa && group.revealIndex > 0);
    assert.ok(processDenseShort, "catalog scan includes a two-page process with a denser first page and shorter second page");
    let syntheticShortDense = null;
    if (!processShortDense) {
      const processCandidate = candidates.find((candidate) => candidate.step.id === processDenseShort.stepId);
      await openPosition(processCandidate.lesson, processCandidate.step, processCandidate.slide, 0, 0);
      syntheticShortDense = await page.evaluate(`(() => {
        const source=document.querySelector('#canvas .slide--visual-process');
        if(!source) return null;
        const fixture=source.cloneNode(true);
        fixture.style.cssText='position:fixed;left:-4000px;top:0;width:1920px;height:1080px;transform:none;visibility:hidden;pointer-events:none';
        fixture.classList.remove('is-entering','from-back');
        document.body.append(fixture);
        const body=fixture.querySelector('.slide__body');
        const prompt=fixture.querySelector('.prompt');
        const stack=fixture.querySelector('.stack');
        if(!body||!prompt||!stack) return null;
        [...stack.children].filter((child)=>child!==prompt).forEach((child)=>child.remove());
        const measure=()=>{
          const range=document.createRange();range.selectNodeContents(prompt);
          const tops=[...range.getClientRects()].map((rect)=>rect.top).sort((a,b)=>a-b)
            .filter((top,index,all)=>index===0||top-all[index-1]>1);
          const rect=prompt.getBoundingClientRect();
          return {top:rect.top,left:rect.left,width:rect.width,fontSize:Number.parseFloat(getComputedStyle(prompt).fontSize),lineCount:tops.length};
        };
        const lead=document.createElement('p');lead.className='lead';lead.textContent='Kısa içerik.';stack.append(lead);
        body.style.setProperty('--k','1');const shortPage=measure();lead.remove();
        const denseLead=document.createElement('p');denseLead.className='lead';denseLead.textContent='Yoğun sayfadaki açıklama alanı.';stack.append(denseLead);
        const list=document.createElement('ol');list.className='steps-list';
        for(let index=0;index<8;index+=1){const item=document.createElement('li');item.textContent=(index+1)+'. Ayrıntılı yönerge '+(index+1)+', ikinci sayfadaki yoğun içeriği temsil eder.';list.append(item)}
        stack.append(list);body.style.setProperty('--k','0.65');const densePage=measure();
        fixture.remove();
        return {shortPage,densePage,topDelta:Math.abs(shortPage.top-densePage.top),leftDelta:Math.abs(shortPage.left-densePage.left),widthDelta:Math.abs(shortPage.width-densePage.width),fontDelta:Math.abs(shortPage.fontSize-densePage.fontSize),lineCounts:[shortPage.lineCount,densePage.lineCount]};
      })()`);
      assert.ok(syntheticShortDense && syntheticShortDense.shortPage.width > 0 &&
        Number.isFinite(syntheticShortDense.shortPage.fontSize) && syntheticShortDense.densePage.width > 0 &&
        syntheticShortDense.topDelta <= 2 && syntheticShortDense.leftDelta <= 2 &&
        syntheticShortDense.widthDelta <= 2 && syntheticShortDense.fontDelta <= 1 &&
        syntheticShortDense.lineCounts[0] === syntheticShortDense.lineCounts[1],
        `process shell keeps prompt geometry when a short first page is followed by dense content: ${JSON.stringify(syntheticShortDense)}`);
    }
    assert.ok(threePage, "catalog scan includes a 3+ page presentation");
    for (const layout of ["process", "assessment", "reference", "structure", "comparison"]) {
      assert.ok(multipageViews.some((group) => group.layout === layout), `catalog scan includes a multipage ${layout} example`);
    }
    assert.ok(qaAnswer, "catalog scan includes a multipage QA-modern answer example");
    assert.equal(roundTripChecked, true, "browser regression checks 1/2 → 2/2 → 1/2 and back through next/previous");
    console.log(`[pagination-geometry-audit] ${JSON.stringify({
      candidateSteps:candidates.length, scannedSteps, multipageSteps:multipageSteps.size,
      multipageViews:multipageViews.length, measuredPages, layoutViews:Object.fromEntries(pageCountByLayout),
      scaleVariedViews:multipageViews.filter((group) => new Set(group.pages.map((item) => round(item.scale))).size > 1).length,
      examples:{processDenseShort:processDenseShort.stepId,processShortDense:processShortDense?.stepId || "synthetic process-modern shell",
        syntheticShortDense,
        threePage:{stepId:threePage.stepId,total:threePage.total},qaAnswer:{stepId:qaAnswer.stepId,total:qaAnswer.total}},
      unstable:unstable.length, unstableExamples:unstable.slice(0,10)
    })}`);
    break presentationBrowserSuite;
  }

  if (qaVisualAudit) {
    await page.send("Emulation.setDeviceMetricsOverride", { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
    await page.evaluate('document.fonts.load(\'400 16px "Inter"\')');
    const outputDir = process.env.QA_VISUAL_AUDIT_DIR || path.join(os.tmpdir(), "sunum-web-qa-visual-audit");
    fs.mkdirSync(outputDir, { recursive: true });
    const fixtures = [
      { slug: "tema-girisi", id: "s14-q1", layout: "question", maxStages: 2 },
      { slug: "karagoz", id: "s28-q1", layout: "comparison", maxStages: 4 },
      { slug: "karagoz", id: "s29-q1", layout: "question", maxStages: 4 },
      { slug: "asik-atismasi", id: "s143-q4", layout: "comparison", maxStages: 3 },
      { slug: "karagoz", id: "s32-q3", layout: "structure", maxStages: 7 },
      { slug: "mektup", id: "s40-q5", layout: "structure", maxStages: 7 },
      { slug: "tema-2-degerlendirme", id: "s159-q7", layout: "structure", maxStages: 5 },
      { slug: "ben-mimar-sinan-cozumleme-256-259", id: "s256-elements", layout: "structure", maxStages: 5 },
      { slug: "mektup", id: "s50-q1", layout: "structure", maxStages: 7 },
      { slug: "ogulla-bulusma", id: "s106-discussion", layout: "process", maxStages: 1, expectedItems: 4, qaModern: false },
      { slug: "eski-istanbul", id: "s111-card-technique", layout: "process", maxStages: 2, qaModern: false },
      { slug: "yazma", id: "s77-feedback", layout: "process", maxStages: 3, expectedItems: 3, qaModern: false },
      { slug: "karagoz", id: "s17-process", layout: "process", maxStages: 0, expectedItems: 3, shortTitle: true, qaModern: false },
      { slug: "tema-2-yazma", id: "s153-feedback", layout: "process", maxStages: 3, wrappedItem: true, qaModern: false },
      { slug: "karagoz", id: "s35-q1", layout: "assessment", maxStages: 5, qaModern: false },
      { slug: "kemal-tahir-mulakat-210-214", id: "s214-eval", layout: "assessment", maxStages: 0, qaModern: false },
      { slug: "kemal-tahir-mulakat-210-214", id: "s214-rubric", layout: "reference", maxStages: 0, qaModern: false },
      { slug: "yazma", id: "s78-self", layout: "assessment", maxStages: 3, qaModern: false },
      { slug: "asik-atismasi", id: "s139-checklist", layout: "assessment", maxStages: 2, qaModern: false },
      { slug: "tema-2-girisi", id: "s84-overview", layout: "reference", maxStages: 2, qaModern: false },
      { slug: "tema-2-girisi", id: "s85-theme-presentation", layout: "reference", maxStages: 0, qaModern: false },
      { slug: "karagoz", id: "s26-reference", layout: "reference", maxStages: 2, qaModern: false },
      { slug: "tema-3-girisi", id: "s160-overview", layout: "reference", maxStages: 2, qaModern: false },
      { slug: "tema-girisi-236-242", id: "s237-threshold", layout: "reference", maxStages: 2, qaModern: false },
      { slug: "yazma", id: "s78-rubric", layout: "reference", maxStages: 2, qaModern: false },
      { slug: "huzur-okuma-cemberi-179-181", id: "s181-game-qr", layout: "reference", maxStages: 0, qaModern: false },
      { slug: "mektup", id: "s39-q3", layout: "vocabulary", maxStages: 6 },
      { slug: "huzur-okuma", id: "s172-vocabulary", layout: "vocabulary", maxStages: 7 },
      { slug: "anadolu-insani-284-290", id: "s287-vocab", layout: "vocabulary", maxStages: 5 },
      { slug: "ben-mimar-sinan-cozumleme-256-259", id: "s258-grammar-apply", layout: "process", maxStages: 7, qaModern: false },
      { slug: "konusma", id: "s53-q1", layout: "question", maxStages: 4 },
      { slug: "konusma", id: "s54-plan", layout: "structure", maxStages: 5 },
      { slug: "konusma", id: "s55-content", layout: "structure", maxStages: 5 },
      { slug: "konusma", id: "s57-performance-2", layout: "process", maxStages: 5, qaModern: false },
      { slug: "konusma", id: "s58-self-assessment-2", layout: "assessment", maxStages: 4, qaModern: false },
      { slug: "konusma", id: "s58-feedback", layout: "assessment", maxStages: 4, qaModern: false }
    ];
    const requestedIds = process.env.QA_VISUAL_AUDIT_ONLY?.split(",").map((id) => id.trim()).filter(Boolean);
    const selectedCases = requestedIds ? fixtures.filter((fixture) => requestedIds.includes(fixture.id)) : fixtures;
    assert.ok(selectedCases.length > 0, "QA_VISUAL_AUDIT_ONLY selects at least one known fixture");
    const inspect = () => page.evaluate(`(() => {
      const slide = document.querySelector('#canvas .slide');
      const body = slide?.querySelector('.slide__body');
      const context = slide?.querySelector('.qa-context');
      const prompt = context?.querySelector(':scope > .prompt') || slide?.querySelector('.prompt');
      const focus = slide?.querySelector('.qa-focus');
      const rect = (node) => { const b = node?.getBoundingClientRect(); return b && {x:b.x,y:b.y,width:b.width,height:b.height,right:b.right,bottom:b.bottom}; };
      const stack = slide?.querySelector('.body-grid > .stack');
      const lead = stack?.querySelector(':scope > .lead');
      const list = stack?.querySelector('.steps-list');
      const processCategory = slide?.querySelector('.process-tag__category');
      const processType = slide?.querySelector('.process-tag__type');
      const range = prompt && document.createRange();
      if (range) range.selectNodeContents(prompt);
      const lineTops = [...(range?.getClientRects() || [])].map((line) => line.top).sort((a,b) => a-b)
        .filter((top,index,tops) => index === 0 || top - tops[index-1] > 1);
      const promptStyle = prompt && getComputedStyle(prompt);
      const sizing = (style) => style && ({width:style.width,maxWidth:style.maxWidth,fontSize:style.fontSize,lineHeight:style.lineHeight,letterSpacing:style.letterSpacing,fontFamily:style.fontFamily});
      const alignmentInputs = sizing(promptStyle);
      let alternateAlignmentInputs = null;
      let alternateLineCount = null;
      if (prompt) {
        const inlineAlignment = prompt.style.textAlign;
        prompt.style.textAlign = promptStyle.textAlign === 'left' ? 'center' : 'left';
        alternateAlignmentInputs = sizing(getComputedStyle(prompt));
        const alternateRange = document.createRange();
        alternateRange.selectNodeContents(prompt);
        alternateLineCount = [...alternateRange.getClientRects()].map((line) => line.top).sort((a,b) => a-b)
          .filter((top,index,tops) => index === 0 || top - tops[index-1] > 1).length;
        if (inlineAlignment) prompt.style.textAlign = inlineAlignment;
        else prompt.style.removeProperty('text-align');
      }
      const listRows = [...(list?.querySelectorAll(':scope > li') || [])].map((item) => ({
        number:rect(item.querySelector(':scope > .n')),
        text:rect(item.querySelector(':scope > span:not(.n)')),
        align:getComputedStyle(item.querySelector(':scope > span:not(.n)')).textAlign,
        lines:(() => { const text=item.querySelector(':scope > span:not(.n)'); const r=document.createRange(); r.selectNodeContents(text); return [...r.getClientRects()].map((line) => line.top).sort((a,b) => a-b).filter((top,index,tops) => index === 0 || top-tops[index-1] > 1).length; })()
      }));
      const contentAlignment = [...(context?.querySelectorAll(':scope > :not(.prompt), .lead, .steps-list, .steps-list li, .steps-list li > :not(.n), .criteria, .fields, .sections, .sec, .vocab__item, .vocab__meaning') || [])]
        .map((node) => ({cls:node.className || node.tagName,align:getComputedStyle(node).textAlign}));
      const nodes = [...(focus?.querySelectorAll('.sections,.sec,.criteria,.criteria li,.scale-form,.scale-form__row,.vocab__item,.vocab__meaning,.panel--answer,.panel--evidence,.steps-list,.steps-list li') || [])];
      return {
        classes: [...(slide?.classList || [])], prompt: prompt?.innerText || '', compact: Boolean(context?.matches(':has(+ .qa-focus:not(:empty))')),
        promptFontSize: prompt ? getComputedStyle(prompt).fontSize : '', body: rect(body), context: rect(context), focus: rect(focus),
        promptAlignment: prompt ? getComputedStyle(prompt).textAlign : '', contentAlignment,
        process: slide?.classList.contains('slide--visual-process') ? {
          lineCount:lineTops.length, promptAlign:promptStyle?.textAlign, fontFamily:promptStyle?.fontFamily,
          fontCheck:document.fonts.check('16px "Inter"', prompt?.textContent || ''), promptRect:rect(prompt), leadRect:rect(lead),
          leadAlign:lead ? getComputedStyle(lead).textAlign : null, listRect:rect(list), listAlign:list ? getComputedStyle(list).textAlign : null,
          listItems:list?.querySelectorAll(':scope > li').length || 0, listRows, alignmentInputs, alternateAlignmentInputs, alternateLineCount,
          category:{rect:rect(processCategory),fontSize:processCategory ? getComputedStyle(processCategory).fontSize : null,fontWeight:processCategory ? getComputedStyle(processCategory).fontWeight : null},
          type:{rect:rect(processType),fontSize:processType ? getComputedStyle(processType).fontSize : null,fontWeight:processType ? getComputedStyle(processType).fontWeight : null},
          where:slide?.querySelector('.slide__top .where')?.innerText || '', bodyText:body?.innerText || ''
        } : null,
        focusText: focus?.innerText || '', bodyMetrics: body && {clientWidth:body.clientWidth,scrollWidth:body.scrollWidth,clientHeight:body.clientHeight,scrollHeight:body.scrollHeight,overflowing:body.classList.contains('is-overflowing')},
        rendererNodes: nodes.map((node) => ({cls:node.className,tag:node.tagName,text:(node.innerText||'').slice(0,180),rect:rect(node),scrollWidth:node.scrollWidth,clientWidth:node.clientWidth,scrollHeight:node.scrollHeight,clientHeight:node.clientHeight,columns:getComputedStyle(node).gridTemplateColumns})),
        columns: focus?.querySelector('.sections') ? getComputedStyle(focus.querySelector('.sections')).gridTemplateColumns : '',
        fontsReady: document.fonts.check('16px "Inter"')
      };
    })()`);
    function assertProcessMetrics(state, fixture, stage) {
      const process = state.process;
      assert.ok(process, `${fixture.id} ${stage} uses the process visual shell`);
      assert.equal(process.fontCheck, true, `${fixture.id} ${stage} measures the title after Inter loads`);
      assert.match(process.fontFamily, /^\s*["']?Inter["']?(?:\s*,|$)/i, `${fixture.id} ${stage} keeps Inter on the process title`);
      assert.equal(process.promptAlign, process.lineCount >= 3 ? "left" : "center",
        `${fixture.id} ${stage} aligns by its ${process.lineCount} rendered title lines`);
      assert.deepEqual(process.alignmentInputs, process.alternateAlignmentInputs,
        `${fixture.id} ${stage} changes only title text alignment`);
      assert.equal(process.lineCount, process.alternateLineCount,
        `${fixture.id} ${stage} keeps line wrapping unchanged when alignment changes`);
      if (process.leadRect) {
        assert.equal(process.leadAlign, "left", `${fixture.id} ${stage} keeps its lead left aligned`);
        assert.ok(Math.abs(process.promptRect.x - process.leadRect.x) <= 1,
          `${fixture.id} ${stage} title and lead share a left axis`);
      }
      if (process.listRect) {
        assert.equal(process.listAlign, "left", `${fixture.id} ${stage} keeps its steps list left aligned`);
        assert.ok(Math.abs(process.promptRect.x - process.listRect.x) <= 1,
          `${fixture.id} ${stage} title and steps list share a left axis`);
        assert.ok(process.listRows.every((row) => row.align === "left"), `${fixture.id} ${stage} keeps each step left aligned`);
        assert.ok(process.listRows.every((row) => Math.abs(row.number.x - process.listRows[0].number.x) <= 1),
          `${fixture.id} ${stage} aligns all number bubbles on one vertical axis`);
        assert.ok(process.listRows.every((row) => Math.abs(row.text.x - process.listRows[0].text.x) <= 1),
          `${fixture.id} ${stage} aligns all item text starts on one vertical axis`);
      }
      if (process.type.rect) {
        const badgeGap = process.type.rect.x - process.category.rect.right;
        assert.ok(badgeGap >= 12 && badgeGap <= 18, `${fixture.id} ${stage} separates its badges by ${badgeGap}px`);
        assert.ok(process.category.rect.height > process.type.rect.height,
          `${fixture.id} ${stage} gives the main category badge more height than its subtype`);
        assert.ok(Number.parseFloat(process.category.fontSize) > Number.parseFloat(process.type.fontSize),
          `${fixture.id} ${stage} gives the main category badge more type weight in size`);
      }
      if (stage === "opening" && fixture.expectedItems !== undefined) {
        assert.equal(process.listItems, fixture.expectedItems, `${fixture.id} ${stage} keeps its expected authored item count`);
      }
      if (stage === "opening" && fixture.shortTitle) {
        assert.ok(process.lineCount <= 2, `${fixture.id} ${stage} remains a genuinely short rendered title`);
      }
      if (stage === "opening" && fixture.wrappedItem) {
        assert.ok(process.listRows.some((row) => row.lines >= 2), `${fixture.id} ${stage} exercises a long wrapped list item`);
      }
      assert.ok(process.bodyText.length > 0, `${fixture.id} ${stage} retains visible process content`);
      assert.ok(state.bodyMetrics?.scrollWidth <= state.bodyMetrics?.clientWidth + 1,
        `${fixture.id} ${stage} has no horizontal process-body overflow`);
      if (fixture.id === "s106-discussion") {
        assert.ok(process.where.includes("s. 106") && process.where.includes("Düşünelim Paylaşalım"),
          `${fixture.id} ${stage} preserves its top-right page and context information`);
      }
      return process;
    }
    async function capture(fixture, stage) {
      await waitForPromptFonts();
      await page.evaluate(`(() => {
        for (const animation of document.querySelector('#canvas .slide')?.getAnimations() ?? []) {
          try { animation.finish(); } catch { /* canceled entry animations are already stable */ }
        }
      })()`);
      await page.evaluate("new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))");
      const metrics = await inspect();
      const png = await page.send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: true });
      const imagePath = path.join(outputDir, `${fixture.id}-${stage}.png`);
      fs.writeFileSync(imagePath, Buffer.from(png.data, "base64"));
      console.log(`[qa-visual-audit] ${fixture.id} ${stage}: ${JSON.stringify({imagePath, ...metrics})}`);
    }
    async function captureProductUi(label) {
      await waitForPromptFonts();
      await page.evaluate(`(() => {
        for (const animation of document.querySelector('#canvas .slide')?.getAnimations() ?? []) {
          try { animation.finish(); } catch { /* canceled entry animations are already stable */ }
        }
      })()`);
      await page.evaluate("new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))");
      const metrics = await page.evaluate(`(() => {
        const rect = (node) => { const box=node?.getBoundingClientRect(); return box && {x:box.x,y:box.y,width:box.width,height:box.height,right:box.right,bottom:box.bottom}; };
        const slide = document.querySelector('#canvas .slide');
        const cover = slide?.classList.contains('slide--lesson-cover');
        const title = slide?.querySelector('.cover__title');
        const menu = document.querySelector('#menu');
        const panel = document.querySelector('.menu__panel');
        const link = slide?.querySelector('.source-link');
        const body = slide?.querySelector('.slide__body');
        return {
          viewport:[innerWidth,innerHeight], slide:rect(slide), cover,
          coverTitle:title?.innerText || '', coverFont:title ? getComputedStyle(title).fontFamily : '',
          coverMeta:[...slide?.querySelectorAll('.cover__meta-item') || []].map((node) => node.innerText),
          sourceLinks:[...slide?.querySelectorAll('.source-link') || []].map((node) => {
            const style = getComputedStyle(node);
            const icon = node.querySelector('.source-link__icon');
            return {
              text:node.innerText, href:node.href, target:node.target, rect:rect(node),
              scrollWidth:node.scrollWidth, clientWidth:node.clientWidth,
              fontFamily:style.fontFamily, textDecoration:style.textDecorationLine,
              borderRadius:style.borderRadius, iconDisplay:icon ? getComputedStyle(icon).display : ''
            };
          }),
          body:body && {scrollWidth:body.scrollWidth,clientWidth:body.clientWidth,scrollHeight:body.scrollHeight,clientHeight:body.clientHeight,overflowing:body.classList.contains('is-overflowing')},
          menuOpen:menu ? !menu.hidden : false, menuPanel:rect(panel),
          selectedTheme:document.querySelector('#menu-tabs [aria-selected="true"]')?.innerText || '',
          currentLessons:document.querySelectorAll('#menu-lessons .is-current').length,
          currentSteps:document.querySelectorAll('#menu-steps .is-current').length,
          lessonCards:document.querySelectorAll('#menu-lessons button').length,
          stepRows:document.querySelectorAll('#menu-steps button').length,
          stepTypes:document.querySelectorAll('#menu-steps .menu__step-type').length,
          menuScroll:[...document.querySelectorAll('.menu__lessons,.menu__steps')].map((node) => ({scrollWidth:node.scrollWidth,clientWidth:node.clientWidth,scrollHeight:node.scrollHeight,clientHeight:node.clientHeight}))
        };
      })()`);
      if (label.startsWith("cover-")) {
        assert.equal(metrics.cover, true, `${label} shows a lesson cover`);
        assert.ok(metrics.coverTitle, `${label} retains its lesson title`);
        assert.match(metrics.coverFont, /^\s*["']?Inter["']?(?:\s*,|$)/i, `${label} uses modern Inter typography`);
        assert.equal(metrics.coverMeta.length, 2, `${label} retains book page and slide count metadata`);
      } else if (label.startsWith("book-link-")) {
        assert.equal(metrics.sourceLinks.length, 1, `${label} shows one book action`);
        assert.ok(metrics.sourceLinks[0].text.includes("Ders kitabı") && metrics.sourceLinks[0].text.includes("aç"), `${label} separates source context and action copy`);
        assert.equal(metrics.sourceLinks[0].target, "_blank", `${label} keeps the existing external-link behavior`);
        assert.ok(metrics.sourceLinks[0].href.includes("#page="), `${label} preserves the book page destination`);
        assert.ok(metrics.sourceLinks[0].rect.width > 0 && metrics.sourceLinks[0].scrollWidth <= metrics.sourceLinks[0].clientWidth + 1, `${label} CTA fits without horizontal text overflow`);
        assert.match(metrics.sourceLinks[0].fontFamily, /Inter/i, `${label} uses the shared modern typography`);
        assert.equal(metrics.sourceLinks[0].textDecoration, "none", `${label} uses the modern card treatment instead of legacy underlining`);
        assert.notEqual(metrics.sourceLinks[0].borderRadius, "0px", `${label} keeps the modern rounded source card`);
        assert.equal(metrics.sourceLinks[0].iconDisplay, "grid", `${label} keeps the modern source icon treatment`);
      } else {
        assert.equal(metrics.menuOpen, true, `${label} opens the lesson browser`);
        assert.ok(metrics.menuPanel?.width > 1000 && metrics.menuPanel?.height > 700, `${label} menu panel fits desktop layout`);
        assert.ok(metrics.selectedTheme, `${label} has an active theme tab`);
        assert.ok(metrics.lessonCards > 0 && metrics.stepRows > 0 && metrics.stepTypes > 0, `${label} renders selectable lesson cards and typed slide rows`);
        assert.ok(metrics.menuScroll.every((area) => area.scrollWidth <= area.clientWidth + 1), `${label} list columns do not overflow horizontally`);
      }
      const screenshot = await page.send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: true });
      const imagePath = path.join(outputDir, `${label}.png`);
      fs.writeFileSync(imagePath, Buffer.from(screenshot.data, "base64"));
      console.log(`[qa-visual-audit] ${label}: ${JSON.stringify({imagePath,...metrics})}`);
    }

    for (const slug of ["orhun-abideleri", "tema-2-girisi"]) {
      await page.send("Page.navigate", { url: `${root}/#/${slug}/0` });
      await until(() => page.evaluate("document.querySelector('#canvas .slide--lesson-cover')?.innerText || ''"), `${slug} lesson cover`);
      await captureProductUi(`cover-${slug}`);
    }

    for (const [slug,id] of [
      ["orhun-abideleri","s113-media-reminder"],
      ["tema-2-girisi","s85-theme-presentation"],
      ["ogulla-bulusma","s95-q1"]
    ]) {
      await openStep(slug,id);
      await captureProductUi(`book-link-${id}`);
    }

    await page.send("Page.navigate", { url: `${root}/#/orhun-abideleri/0` });
    await until(() => page.evaluate("Boolean(document.querySelector('#canvas .slide--lesson-cover'))"), "Orhun lesson before menu capture");
    await page.evaluate("document.querySelector('#dock [data-action=menu]').click()");
    await until(() => page.evaluate("!document.querySelector('#menu').hidden"), "Orhun lesson browser");
    await captureProductUi("lesson-browser-orhun-theme-2");

    await page.evaluate("document.querySelector('#menu [data-action=close-menu]').click()");
    await until(() => page.evaluate("document.querySelector('#menu').hidden"), "close Orhun lesson browser");
    await page.send("Page.navigate", { url: `${root}/#/karagoz/0` });
    await until(() => page.evaluate("Boolean(document.querySelector('#canvas .slide--lesson-cover'))"), "Karagöz lesson before menu capture");
    await page.evaluate("document.querySelector('#dock [data-action=menu]').click()");
    await until(() => page.evaluate("!document.querySelector('#menu').hidden"), "Karagöz lesson browser");
    await captureProductUi("lesson-browser-karagoz-theme-1");

    for (const fixture of selectedCases) {
      const entry = await openStep(fixture.slug, fixture.id);
      assert.equal(entry.step.layout, fixture.layout, `${fixture.id} canonical layout`);
      const qa = await inspect();
      assert.equal(qa.classes.includes("slide--qa-modern"), fixture.qaModern !== false, `${fixture.id} QA-modern shell eligibility`);
      if (fixture.layout === "process") assertProcessMetrics(qa, fixture, "opening");
      if (fixture.qaModern !== false) {
        assert.ok(qa.contentAlignment.every((node) => node.align === "left"),
          `${fixture.id} opening renderer content stays left aligned: ${JSON.stringify(qa.contentAlignment)}`);
      }
      await capture(fixture, "opening");
      if (fixture.maxStages) {
        let traversed = 0;
        let supportCardsCaptured = false;
        for (let i = 1; i <= fixture.maxStages; i++) {
          await next();
          const stage = await inspect();
          if (!stage.prompt || stage.prompt !== entry.step.display_prompt) break;
          if (fixture.layout === "process") assertProcessMetrics(stage, fixture, `page ${i + 1}`);
          if (fixture.id === "s111-card-technique" && stage.process?.bodyText.includes("Kart Renkleri ve Değerlendirme Ölçütleri")) {
            const supportCards = await page.evaluate(`(() => {
              const items = [...document.querySelectorAll('.process-card-item')];
              const rect = (node) => { const box = node.getBoundingClientRect(); return {x:box.x,y:box.y,width:box.width,height:box.height,right:box.right,bottom:box.bottom}; };
              return {
                items: items.map((item) => ({title:item.querySelector('h4')?.innerText || '', text:item.innerText, rect:rect(item)})),
                notes: [...document.querySelectorAll('.process-card-item__note')].map((node) => node.innerText),
                section: rect(document.querySelector('.sec--process-card-criteria')),
                panel: rect(document.querySelector('.panel--answer')),
                body: (() => { const node=document.querySelector('.slide__body'); return {clientWidth:node.clientWidth,scrollWidth:node.scrollWidth,clientHeight:node.clientHeight,scrollHeight:node.scrollHeight,overflowing:node.classList.contains('is-overflowing')}; })()
              };
            })()`);
            assert.equal(supportCards.items.length, 3, "s111 support renders three separate card-type blocks");
            assert.match(supportCards.items[0].title, /Mavi Kart \(Katılıyorum\)/, "s111 first block identifies the blue card in text");
            assert.match(supportCards.items[1].title, /Kırmızı Kart \(Katılmıyorum\)/, "s111 second block identifies the red card in text");
            assert.match(supportCards.items[2].title, /Kahverengi Kart \(Kararsızım \/ Dolaylı İlişki\)/, "s111 third block identifies the brown card in text");
            assert.equal(supportCards.items[0].rect.x, supportCards.items[1].rect.x, "s111 card blocks share a left axis");
            assert.equal(supportCards.items[1].rect.x, supportCards.items[2].rect.x, "s111 card blocks share a left axis");
            assert.ok(supportCards.items[0].rect.y < supportCards.items[1].rect.y && supportCards.items[1].rect.y < supportCards.items[2].rect.y,
              "s111 card blocks stack as distinct rows");
            assert.ok(supportCards.notes.length >= 2, "s111 examples and added detail appear as secondary notes");
            assert.ok(supportCards.panel && supportCards.section && supportCards.panel.y < supportCards.section.y,
              "s111 support panel and inner card hierarchy are visible");
            assert.ok(supportCards.body.scrollWidth <= supportCards.body.clientWidth + 1, "s111 support has no horizontal overflow");
            assert.equal(supportCards.body.overflowing, false, "s111 support fits vertically at 1920×1080 without overflow scrolling");
            supportCardsCaptured = true;
          }
          if (fixture.qaModern !== false && stage.focusText.trim()) {
            assert.equal(stage.compact, true, `${fixture.id} compacts the prompt when focus content opens`);
            assert.ok(stage.bodyMetrics?.scrollWidth <= stage.bodyMetrics?.clientWidth + 1, `${fixture.id} focus content has no horizontal body overflow`);
            assert.ok(stage.rendererNodes.filter((node) => node.cls === "sec" || node.cls === "vocab__item")
              .every((node) => node.scrollWidth <= node.clientWidth + 1), `${fixture.id} renderer cards do not clip horizontally`);
          }
          await capture(fixture, `reveal-${i}`);
          traversed++;
        }
        if (fixture.id === "s111-card-technique") assert.equal(supportCardsCaptured, true, "s111 audit reaches the card-criteria support panel");
        for (let i = traversed; i > 0; i--) await previous();
        await capture(fixture, "back-to-opening");
      }
      console.log(`[qa-visual-audit] ${fixture.id}: layout=${fixture.layout}, maxStages=${fixture.maxStages ?? 0}`);
    }
    console.log(`[qa-visual-audit] Captured ${selectedCases.length} catalog fixtures in Chrome at 1920×1080.`);
    break presentationBrowserSuite;
  }
  if (rasterAudit) {
    await page.send("Emulation.setDeviceMetricsOverride", { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
    await page.evaluate('document.fonts.load(\'400 16px "Inter"\')');
    await until(() => page.evaluate("typeof window.__testCaptureSlideImage === 'function'"), "test-only direct slide capture hook");
    const outputDir = process.env.PPTX_RASTER_AUDIT_DIR || path.join(os.tmpdir(), "sunum-web-raster-audit");
    fs.mkdirSync(outputDir, { recursive: true });
    const auditCases = [
      { slug: "asik-atismasi", id: "s143-q4", name: "asik-atismasi-s143-q4-paired", text: ["Münacaat", "Âşık Şiirinin Dili"], pairedEvidence: true },
      { slug: "mektup", id: "s40-q5", name: "mektup-s40-q5-structure", text: ["Konu", "Çalışma kâğıdı"], answerPanel: true },
      { slug: "huzur-okuma", id: "s172-vocabulary", name: "huzur-okuma-s172-vocabulary", text: ["mahzen", "cevher"] },
      { slug: "kemal-tahir-mulakat-210-214", id: "s214-eval", name: "kemal-tahir-s214-eval-scale", text: ["Evet", "Kısmen", "Hayır"] },
      { slug: "tiyatro-canlandirma-280-283", id: "s283-performance", name: "tiyatro-s283-performance", text: ["İçeriğe uygunluk", "Çok iyi", "puan"], advanceTo: "Çok iyi" }
    ];
    const requestedIds = process.env.PPTX_RASTER_AUDIT_ONLY?.split(",").map((id) => id.trim()).filter(Boolean);
    const selectedCases = requestedIds ? auditCases.filter((fixture) => requestedIds.includes(fixture.id)) : auditCases;
    assert.ok(selectedCases.length > 0, "PPTX_RASTER_AUDIT_ONLY selects at least one known fixture");
    for (const fixture of selectedCases) {
      const entry = await openStep(fixture.slug, fixture.id);
      if (fixture.pairedEvidence) {
        const unit = entry.step.presentation?.web?.units?.find((candidate) => candidate.evidence_sections?.length);
        assert.ok(unit, `${fixture.name} has a paired evidence unit`);
        await advanceUntilEvidenceSection(unit.evidence_sections[0].section_key, fixture.name);
        assert.ok((await answerPanelText()).trim(), `${fixture.name} shows its answer panel`);
        assert.ok((await evidencePanelText()).trim(), `${fixture.name} shows its evidence panel`);
      }
      if (fixture.advanceTo) {
        await advanceUntil((text) => includesText(text, fixture.advanceTo), `${fixture.name} ${fixture.advanceTo} level`, 36);
      }
      if (fixture.answerPanel) {
        for (let index = 0; index < 12 && !(await answerPanelText()).trim(); index += 1) await next();
        assert.ok((await answerPanelText()).trim(), `${fixture.name} captures its first visible structure answer`);
      }
      await waitForPromptFonts();
      await page.evaluate(`(() => {
        for (const animation of document.querySelector('#canvas .slide')?.getAnimations() ?? []) {
          try { animation.finish(); } catch { /* canceled entry animations are already stable */ }
        }
      })()`);
      await page.evaluate("new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))");
      const visual = await page.evaluate(`(() => {
        const slide = document.querySelector('#canvas .slide');
        const body = slide?.querySelector('.slide__body');
        const rect = (node) => {
          const box = node?.getBoundingClientRect();
          return box && { x: box.x, y: box.y, width: box.width, height: box.height, right: box.right, bottom: box.bottom };
        };
        const fontTarget = slide?.querySelector('.vocab__meaning, .panel, .sec, .slide__body');
        return {
          text: slide?.innerText ?? '', fontReady: document.fonts.check('16px "Inter"'),
          fontFamily: fontTarget ? getComputedStyle(fontTarget).fontFamily : '',
          interFaces: [...document.fonts].filter((face) => face.family.replace(/["']/g, '').trim() === 'Inter').map((face) => face.status),
          slide: rect(slide), body: rect(body),
          header: rect(slide?.querySelector('.slide__top')),
          footer: rect(slide?.querySelector('.slide__foot')),
          decorations: slide?.querySelectorAll('.slide__top, .slide__foot, .progress, .qa-badge, .panel__label, .sec h3').length ?? 0,
          overflow: body ? { horizontal: body.scrollWidth > body.clientWidth + 1, vertical: body.classList.contains('is-overflowing') } : null
        };
      })()`);
      assert.equal(visual.fontReady, true, `${fixture.name} has loaded Inter before capture`);
      assert.ok(visual.interFaces.length > 0 && visual.interFaces.every((status) => status === 'loaded'), `${fixture.name} has loaded Inter font faces before capture`);
      assert.deepEqual([visual.slide?.x, visual.slide?.y, visual.slide?.width, visual.slide?.height], [0, 0, 1920, 1080], `${fixture.name} slide fills the 1920×1080 viewport`);
      assert.ok(visual.body?.width > 0 && visual.body?.height > 0 && visual.body.x >= 0 && visual.body.right <= 1920 && visual.body.y >= 0 && visual.body.bottom <= 1080, `${fixture.name} body stays within slide bounds`);
      assert.ok(visual.decorations >= 2, `${fixture.name} retains slide decorations and visible labels`);
      assert.ok(visual.header?.width > 0 && visual.footer?.width > 0, `${fixture.name} header and footer are present within the captured slide`);
      assert.equal(visual.overflow.horizontal, false, `${fixture.name} has no horizontal body overflow`);
      for (const fragment of fixture.text) assert.ok(includesText(visual.text, fragment), `${fixture.name} shows label/text “${fragment}”`);
      const base64 = await page.evaluate("window.__testCaptureSlideImage()" );
      const bytes = Buffer.from(base64, "base64");
      assert.equal(bytes.toString("hex", 0, 8), "89504e470d0a1a0a", `${fixture.name} direct capture returns PNG`);
      assert.deepEqual([bytes.readUInt32BE(16), bytes.readUInt32BE(20)], [1920, 1080], `${fixture.name} direct capture is 1920×1080`);
      const imagePath = path.join(outputDir, `${fixture.name}.png`);
      fs.writeFileSync(imagePath, bytes);
      console.log(`[sunum-web] Raster audit ${fixture.name}: ${JSON.stringify({ imagePath, dimensions: [1920, 1080], font: visual.fontFamily, decorations: visual.decorations, bounds: visual.body, visibleText: fixture.text, bytes: bytes.length })}`);
    }
    console.log(`[sunum-web] Captured ${selectedCases.length} representative slide states directly; PPTX export was not invoked.`);
  } else {
  if (process.env.STRUCTURE_VISUAL_SMOKE === "1") {
    const sourceStructureCount = lessons.reduce((count, lesson) => count + lesson.steps.filter((step) => step.layout === "structure").length, 0);
    const builtStructureCount = builtCatalog.lessons.reduce((count, lesson) => count + lesson.steps.filter((step) => step.layout === "structure").length, 0);
    assert.equal(sourceStructureCount, 155, "the source catalog has 155 structure-layout steps for the visual modifier");
    assert.equal(builtStructureCount, 155, "the built catalog retains all 155 structure-layout steps");
    await page.send("Emulation.setDeviceMetricsOverride", { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
    await page.evaluate('document.fonts.load(\'400 16px "Inter"\')');

    const captureStructureState = () => page.evaluate(`(() => {
      const slide = document.querySelector('#canvas .slide');
      const body = slide?.querySelector('.slide__body');
      const answer = slide?.querySelector('.panel--answer');
      const firstSection = answer?.querySelector('.sec h3');
      const bodyRect = body?.getBoundingClientRect();
      return {
        visualStructure: slide?.classList.contains('slide--visual-structure') ?? false,
        qaModern: slide?.classList.contains('slide--qa-modern') ?? false,
        qaComparison: slide?.classList.contains('slide--qa-comparison') ?? false,
        qaAccent: getComputedStyle(slide).getPropertyValue('--qa-accent').trim(),
        structureInk: getComputedStyle(slide).getPropertyValue('--structure-ink').trim(),
        structureTeal: getComputedStyle(slide).getPropertyValue('--structure-teal').trim(),
        slideBackground: getComputedStyle(slide).backgroundColor,
        bodyFont: body ? getComputedStyle(body).fontFamily : '',
        firstSectionColor: firstSection ? getComputedStyle(firstSection).color : '',
        answerLabels: [...(answer?.querySelectorAll('.sec h3') || [])].map((node) => node.textContent.trim()),
        answerText: answer?.innerText ?? '',
        bodyText: body?.innerText ?? '',
        bodyRect: bodyRect && { x: bodyRect.x, y: bodyRect.y, right: bodyRect.right, bottom: bodyRect.bottom },
        fits: Boolean(body && body.scrollHeight <= body.clientHeight + 1 && body.scrollWidth <= body.clientWidth + 1 &&
          !body.classList.contains('is-overflowing'))
      };
    })()`);

    async function waitForStructureAnswer(key, label) {
      let state = await captureStructureState();
      for (let index = 0; index < 24; index += 1) {
        if (state.answerLabels.includes(key)) return state;
        await next();
        state = await captureStructureState();
      }
      assert.fail(`Could not reach structure answer ${label}: ${JSON.stringify(state.answerLabels)}`);
    }

    for (const fixture of [
      { slug: "mektup", id: "s40-q5" },
      { slug: "karagoz", id: "s32-q3" }
    ]) {
      const entry = findStep(fixture.slug, fixture.id);
      assert.equal(entry.step.layout, "structure", `${fixture.id} uses the canonical structure layout`);
      const expectedKeys = entry.step.presentation.web.units.flatMap((unit) => unit.section_keys);
      assert.ok(expectedKeys.length >= 4, `${fixture.id} has a multi-unit structured answer`);
      const opened = await openStep(fixture.slug, fixture.id);
      assert.ok(opened.text.includes(entry.step.display_prompt), `${fixture.id} opens its real route prompt`);
      let state = await captureStructureState();
      assert.equal(state.visualStructure, true, `${fixture.id} receives the visual-structure modifier`);
      assert.equal(state.qaModern, false, `${fixture.id} does not receive the QA modifier`);
      assert.equal(state.qaComparison, false, `${fixture.id} does not receive the comparison modifier`);
      assert.equal(state.qaAccent, "", `${fixture.id} has no inherited QA accent modifier`);
      assert.equal(state.structureInk, "#182a35", `${fixture.id} receives the structure ink palette`);
      assert.equal(state.structureTeal, "#176d68", `${fixture.id} receives the structure teal palette`);
      assert.equal(state.slideBackground, "rgb(247, 248, 245)", `${fixture.id} uses the structure paper surface`);
      assert.match(state.bodyFont, /^Inter(?:,|$)/, `${fixture.id} structure body uses Inter at 1920x1080`);
      assert.ok(state.fits, `${fixture.id} initial structure page fits at 1920x1080`);

      const seenKeys = [];
      for (const [index, key] of expectedKeys.entries()) {
        state = await waitForStructureAnswer(key, `${fixture.id}/${key}`);
        assert.ok(state.answerLabels.includes(key), `${fixture.id} renders the expected answer unit: ${key}`);
        assert.equal(state.visualStructure, true, `${fixture.id}/${key} retains the structure modifier`);
        assert.equal(state.qaModern, false, `${fixture.id}/${key} does not gain the QA modifier`);
        assert.equal(state.qaComparison, false, `${fixture.id}/${key} does not gain the comparison modifier`);
        assert.ok(state.fits, `${fixture.id}/${key} answer page fits at 1920x1080`);
        if (index === 0) {
          assert.equal(state.firstSectionColor, "rgb(23, 109, 104)", `${fixture.id} first structure section uses the teal accent`);
          const firstAnswerText = state.answerText;
          await previous();
          const backwardState = await captureStructureState();
          assert.ok(!backwardState.answerLabels.includes(key), `${fixture.id} backward navigation restores the preceding non-answer page`);
          assert.equal(backwardState.visualStructure, true, `${fixture.id} backward navigation keeps its structure modifier`);
          assert.equal(backwardState.qaModern, false, `${fixture.id} backward navigation does not leak into QA`);
          await next();
          state = await waitForStructureAnswer(key, `${fixture.id}/${key} restored`);
          assert.equal(state.answerText, firstAnswerText, `${fixture.id} forward navigation restores the first answer page`);
          assert.ok(state.fits, `${fixture.id} restored answer page fits at 1920x1080`);
        }
        seenKeys.push(key);
      }
      assert.deepEqual(seenKeys, expectedKeys, `${fixture.id} answer pagination follows its authored unit order`);
      console.log(`[sunum-web] Structure smoke ${fixture.slug}/${fixture.id}: ${seenKeys.length} answer units in order at 1920x1080.`);
    }
    console.log("[sunum-web] Focused Chrome structure visual smoke passed: 155 source/built layouts, pagination order, reverse/forward, overflow, and QA/comparison isolation.");
    break presentationBrowserSuite;
  }

  if (process.env.VISUAL_LAYOUT_CLASS_SMOKE === "1") {
    // The dock must be visible and its icons legible *before* pointer hover
    // in both presentation themes, including the prominent prev/next actions.
    const restingDock = await page.evaluate(`(() => {
      const viewport=document.querySelector('#viewport');
      const originalUi=viewport.classList.contains('show-ui');
      const originalTheme=document.documentElement.getAttribute('data-theme');
      viewport.classList.remove('show-ui');
      const rgb=(value)=>(value.match(/[\\d.]+/g)||[]).slice(0,3).map(Number);
      const luminance=(value)=>{
        const c=rgb(value).map(channel=>{
          const s=channel/255;return s<=0.04045?s/12.92:Math.pow((s+0.055)/1.055,2.4);
        });
        return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2];
      };
      const contrast=(a,b)=>{
        const x=luminance(a),y=luminance(b);
        return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);
      };
      const result=[];
      for(const theme of ['light','dark']){
        document.documentElement.setAttribute('data-theme',theme);
        const dock=document.querySelector('#dock'),dockStyle=getComputedStyle(dock);
        const entries=[...dock.querySelectorAll('button')].map(button=>{
          const style=getComputedStyle(button),svg=getComputedStyle(button.querySelector('svg'));
          return {
            action:button.dataset.action,buttonColor:style.color,buttonBackground:style.backgroundColor,
            contrast:contrast(style.color,style.backgroundColor),
            iconStroke:svg.stroke,iconWidth:button.querySelector('svg').getBoundingClientRect().width,
            size:[button.getBoundingClientRect().width,button.getBoundingClientRect().height]
          };
        });
        const counterStyle=getComputedStyle(dock.querySelector('.dock__counter'));
        result.push({theme,opacity:Number(dockStyle.opacity),pointerEvents:dockStyle.pointerEvents,
          background:dockStyle.backgroundColor,counterContrast:contrast(counterStyle.color,dockStyle.backgroundColor),entries});
      }
      if(originalTheme===null) document.documentElement.removeAttribute('data-theme');
      else document.documentElement.setAttribute('data-theme',originalTheme);
      if(originalUi) viewport.classList.add('show-ui');
      return result;
    })()`);
    for (const variant of restingDock) {
      assert.ok(variant.opacity >= 0.95, variant.theme + " dock stays visible before mouse movement");
      assert.notEqual(variant.pointerEvents, "none", variant.theme + " resting dock remains clickable");
      assert.ok(variant.counterContrast >= 4.5, variant.theme + " dock counter has readable contrast");
      assert.deepEqual(variant.entries.map(button => button.action),
        ["prev", "next", "menu", "theme", "fullscreen", "help"],
        variant.theme + " dock exposes all six navigational controls");
      for (const button of variant.entries) {
        assert.ok(button.contrast >= 4.5, variant.theme + " " + button.action +
          " icon has contrast before hover: " + button.contrast.toFixed(2));
        assert.ok(button.size[0] >= 44 && button.size[1] >= 44,
          variant.theme + " " + button.action + " touch target remains at least 44px");
        assert.ok(button.iconWidth >= 20, variant.theme + " " + button.action + " icon remains distinct");
        assert.equal(button.iconStroke, button.buttonColor,
          variant.theme + " " + button.action + " icon stroke follows accessible foreground");
      }
    }
    console.log("[sunum-web] Dock idle legibility passed in both themes: visible bar, six high-contrast buttons, touch targets.");

    // Native Arc Floating Button Group: shared highlight follows pointer and
    // focus without stealing the real slide-navigation keyboard bindings.
    const arcDock = await page.evaluate(`(() => {
      const dock=document.querySelector('#dock'),buttons=[...dock.querySelectorAll('button[data-action]')];
      const highlight=dock.querySelector('.dock__highlight');
      const prev=buttons.find(button=>button.dataset.action==='prev');
      const help=buttons.find(button=>button.dataset.action==='help');
      const theme=buttons.find(button=>button.dataset.action==='theme');
      const pointer=(node,type)=>node.dispatchEvent(new PointerEvent(type,{bubbles:type!=='pointerleave',pointerType:'mouse'}));
      const state=()=>({
        shown:dock.dataset.highlight==='true',
        x:Number.parseFloat(dock.style.getPropertyValue('--dock-highlight-x')),
        width:Number.parseFloat(dock.style.getPropertyValue('--dock-highlight-width'))
      });
      const initial={highlightCount:dock.querySelectorAll('.dock__highlight').length,
        tip: getComputedStyle(prev,'::after').content,
        accessible:buttons.every(button=>button.getAttribute('aria-label') && button.dataset.hint)};
      pointer(prev,'pointermove');
      const hovered=state(),prevWidth=prev.getBoundingClientRect().width;
      pointer(help,'pointermove');
      const moved=state();
      pointer(dock,'pointerleave');
      const cleared=state();
      help.focus();
      const focused=state();
      help.blur();
      const before=document.documentElement.dataset.theme,pressedBefore=theme.getAttribute('aria-pressed');
      theme.click();
      const pressedAfter=theme.getAttribute('aria-pressed');
      const toggled=document.documentElement.dataset.theme;
      theme.click();
      return {initial,hovered,prevWidth,moved,cleared,focused,
        theme:{before,toggled,pressedBefore,pressedAfter,restored:document.documentElement.dataset.theme}};
    })()`);
    assert.equal(arcDock.initial.highlightCount, 1, "Arc dock has exactly one shared highlight surface");
    assert.equal(arcDock.initial.accessible, true, "Arc dock keeps labels and shortcut hints on all actions");
    assert.match(arcDock.initial.tip, /Geri/, "Arc dock displays accessible hint copy instead of a native title tooltip");
    assert.equal(arcDock.hovered.shown, true, "Arc highlight appears when hovering back");
    assert.ok(Math.abs(arcDock.hovered.width-arcDock.prevWidth)<=1, "Arc highlight matches the hovered button width");
    assert.ok(Math.abs(arcDock.moved.x-arcDock.hovered.x)>=30, "Arc highlight tracks another action");
    assert.equal(arcDock.cleared.shown, false, "Arc highlight disappears after pointer leaves");
    assert.equal(arcDock.focused.shown, true, "Arc highlight follows keyboard focus");
    assert.notEqual(arcDock.theme.before, arcDock.theme.toggled, "Arc mode button still switches theme");
    assert.equal(arcDock.theme.restored, arcDock.theme.before, "Arc mode button restores theme without losing context");
    assert.notEqual(arcDock.theme.pressedBefore, arcDock.theme.pressedAfter, "Arc mode announces pressed state");
    console.log("[sunum-web] Arc Floating Button Group passed: pointer/focus highlight, action hints, theme pressed state.");

    // Cover and end are real presentation layouts, not incidental decorations.
    // Exercise distinct theme headings, long titles, and the terminal catalog item.
    const byTheme = new Map();
    for (const lesson of builtCatalog.lessons) {
      if (!byTheme.has(lesson.theme) ||
          lesson.title.length > byTheme.get(lesson.theme).title.length) {
        byTheme.set(lesson.theme, lesson);
      }
    }
    assert.equal(byTheme.size, 4, "all four themes have Arc bookend examples");
    const bookendSamples = [...byTheme.values()];
    const lastCatalogLesson = builtCatalog.lessons.at(-1);
    if (!bookendSamples.includes(lastCatalogLesson)) bookendSamples.push(lastCatalogLesson);

    for (const lesson of bookendSamples) {
      for (const [slideIndex, kind] of [[0, "cover"], [lesson.steps.length + 1, "end"]]) {
        await page.send("Page.navigate", { url: root + "/#/" + lesson.slug + "/" + slideIndex });
        await until(() => page.evaluate(
          "Boolean(document.querySelector('#canvas .slide--arc-" + kind + "'))"
        ), "Arc " + kind + " for " + lesson.slug);
        await page.evaluate("document.fonts.ready");
        const geometry = await page.evaluate(`(() => {
          const slide=document.querySelector('#canvas .slide');
          const canvas=slide?.querySelector('.arc-cover__canvas,.arc-end__canvas');
          const title=slide?.querySelector('.cover__title');
          const subtitle=slide?.querySelector('.cover__subtitle');
          const meta=slide?.querySelector('.cover__meta');
          const next=slide?.querySelector('.cover__hint');
          const visual=slide?.querySelector('.arc-cover__visual,.arc-end__visual');
          const rect=(node)=>{const r=node?.getBoundingClientRect();return r&&{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}};
          return {titleText:title?.textContent||'', title:rect(title),surface:rect(canvas),
            subtitle:rect(subtitle),meta:rect(meta),visual:rect(visual),
            metaCount:meta?.querySelectorAll('.cover__meta-item').length||0,
            next:Boolean(next),nextText:next?.textContent||'',
            scrollWidth:slide.scrollWidth,clientWidth:slide.clientWidth,
            scrollHeight:slide.scrollHeight,clientHeight:slide.clientHeight,
            font:title?getComputedStyle(title).fontFamily:''};
        })()`);
        assert.equal(geometry.titleText, lesson.title, lesson.slug + " " + kind + " retains lesson title");
        assert.match(geometry.font, /Inter/i, lesson.slug + " " + kind + " uses Inter");
        assert.ok(geometry.surface?.width > 1100 && geometry.visual?.width > 250,
          lesson.slug + " " + kind + " has a visible Arc layout");
        assert.ok(geometry.scrollWidth <= geometry.clientWidth + 1 && geometry.scrollHeight <= geometry.clientHeight + 1,
          lesson.slug + " " + kind + " does not overflow the stage");
        for (const [name, box] of [["title", geometry.title], ["subtitle", geometry.subtitle], ["meta", geometry.meta]]) {
          if (!box) continue;
          assert.ok(box.left >= geometry.surface.left - 2 &&
            box.right <= geometry.surface.right + 2 &&
            box.top >= geometry.surface.top - 2 &&
            box.bottom <= geometry.surface.bottom + 2,
            lesson.slug + " " + kind + " keeps " + name + " inside its card: " + JSON.stringify(box));
        }
        if (kind === "cover") {
          assert.equal(geometry.metaCount, 2, lesson.slug + " cover retains book and slide metadata");
        } else {
          const hasNext = builtCatalog.lessons.indexOf(lesson) < builtCatalog.lessons.length - 1;
          assert.equal(geometry.next, hasNext, lesson.slug + " end shows navigation hint only when a next lesson exists");
          if (hasNext) assert.match(geometry.nextText, /İleri/, lesson.slug + " end preserves next-lesson instruction");
        }
      }
    }
    console.log("[sunum-web] Arc cover/end visual shell smoke passed: " +
      bookendSamples.length + " representative lessons, both layouts and terminal navigation.");

    const expectVisualClasses = (state, expected, label) => {
      assert.deepEqual(state.visualClasses, expected, `${label} has only its expected visual-layout modifier`);
    };
    const setTeacherRevealMode = async (enabled) => {
      await page.evaluate("document.querySelector('#dock [data-action=menu]').click()");
      await until(() => page.evaluate("document.querySelector('#menu')?.hidden === false"), "open presentation menu");
      const checked = await page.evaluate("document.querySelector('#menu-guide')?.checked ?? false");
      if (checked !== enabled) await page.evaluate("document.querySelector('#menu-guide').click()");
      assert.equal(
        await page.evaluate("localStorage.getItem('sunum.guideOnRemote') === '1'"),
        enabled,
        `teacher reveal mode persists as ${enabled ? "enabled" : "disabled"}`
      );
      await page.evaluate("document.querySelector('#menu [data-action=close-menu]').click()");
      await until(() => page.evaluate("document.querySelector('#menu')?.hidden === true"), "close presentation menu");
    };
    const processEntry = findStep("karagoz", "s16-process");
    assert.equal(processEntry.step.layout, "process", "s16-process is the process fixture");
    assert.deepEqual(processEntry.step.reveal_order, [], "s16-process has no authored reveal layers");
    const processOpened = await openStep("karagoz", "s16-process");
    let visual = await visualLayoutState();
    expectVisualClasses(visual, ["slide--visual-process"], "karagoz/s16-process");
    assert.deepEqual(visual.children, ["HEADER", "DIV", "FOOTER"], "process modifier preserves the slide's direct DOM children");
    assert.ok(visual.bodyClasses.includes("stack"), "process modifier preserves the existing body stack");
    assert.equal(visual.stepLists, 1, "s16-process remains an ordered step list");
    const nextProcessEntry = processEntry.lesson.steps[processEntry.slide];
    await next();
    visual = await until(async () => {
      const state = await visualLayoutState();
      return state.prompt === nextProcessEntry.display_prompt ? state : null;
    }, "s16-process next step");
    expectVisualClasses(visual, [], "s16-process next-step boundary");
    await previous();
    visual = await until(async () => {
      const state = await visualLayoutState();
      return state.prompt === processEntry.step.display_prompt ? state : null;
    }, "s16-process previous step restore");
    expectVisualClasses(visual, ["slide--visual-process"], "s16-process previous-step restore");
    assert.ok(processOpened.text.includes(processEntry.step.display_prompt), "s16-process opens its canonical prompt");

    const sourceReference = findStep("dinleme-izleme", "s67-qr-communication");
    assert.equal(sourceReference.step.layout, "reference", "s67-qr-communication is a reference-layout fixture");
    assert.deepEqual(sourceReference.step.reveal_order, [], "s67-qr-communication has no authored reveal layers");
    const referenceOpened = await openStep("dinleme-izleme", "s67-qr-communication");
    visual = await visualLayoutState();
    expectVisualClasses(visual, ["slide--visual-reference"], "dinleme-izleme/s67-qr-communication");
    assert.ok(referenceOpened.text.includes(sourceReference.step.display_prompt), "source reference keeps its prompt");
    assert.ok(visual.sources > 0, "source reference keeps its existing source-link list");
    const nextReferenceEntry = sourceReference.lesson.steps[sourceReference.slide];
    await next();
    visual = await until(async () => {
      const state = await visualLayoutState();
      return state.prompt === nextReferenceEntry.display_prompt ? state : null;
    }, "s67-qr-communication next step");
    await previous();
    visual = await until(async () => {
      const state = await visualLayoutState();
      return state.prompt === sourceReference.step.display_prompt ? state : null;
    }, "s67-qr-communication previous step restore");
    expectVisualClasses(visual, ["slide--visual-reference"], "s67-qr-communication previous-step restore");

    const noteReference = findStep("karagoz", "s26-reference");
    assert.equal(noteReference.step.layout, "reference", "s26-reference is a reference-layout fixture");
    assert.deepEqual(noteReference.step.reveal_order, ["note"], "s26-reference retains its authored note reveal");
    const runtimeNoteReference = builtCatalog.lessons
      .find((lesson) => lesson.slug === "karagoz")?.steps.find((step) => step.id === "s26-reference");
    assert.ok(runtimeNoteReference, "built catalog contains the s26-reference runtime fixture");
    assert.ok(!runtimeNoteReference.reveals.includes("note"), "built runtime excludes note from the reveal sequence");
    assert.equal(runtimeNoteReference.content.note, undefined, "built runtime excludes teacher note from rendered content");
    await setTeacherRevealMode(true);
    await openStep("karagoz", "s26-reference");
    visual = await visualLayoutState();
    expectVisualClasses(visual, ["slide--visual-reference"], "karagoz/s26-reference");
    assert.equal(visual.revealDots, 0, "s26-reference retains its current no-reveal runtime behavior");
    await page.evaluate("document.querySelector('#dock [data-action=menu]').click()");
    await until(() => page.evaluate("document.querySelector('#menu')?.hidden === false"), "verify persisted teacher mode");
    assert.equal(await page.evaluate("document.querySelector('#menu-guide')?.checked"), true,
      "teacher reveal mode is active after navigating to s26-reference");
    await page.evaluate("document.querySelector('#menu [data-action=close-menu]').click()");
    const nextNoteStep = noteReference.lesson.steps[noteReference.slide];
    let contentPageAdvances = 0;
    for (let index = 0; index < 8 && visual.prompt === noteReference.step.display_prompt; index += 1) {
      await next();
      visual = await visualLayoutState();
      if (visual.prompt === noteReference.step.display_prompt) {
        contentPageAdvances += 1;
        assert.equal(visual.revealDots, 0, "s26-reference content pages do not create a note reveal");
      }
    }
    assert.ok(contentPageAdvances > 0, "s26-reference advances through its paginated content before the next step");
    visual = await until(async () => {
      const state = await visualLayoutState();
      return state.prompt === nextNoteStep.display_prompt ? state : null;
    }, "s26-reference next-step boundary after content pages");
    assert.ok(!(await bodyText()).includes(noteReference.step.content.note), "s26-reference teacher note is not rendered by the current runtime catalog");
    expectVisualClasses(visual, [], "s26-reference next-step boundary");
    await previous();
    visual = await until(async () => {
      const state = await visualLayoutState();
      return state.prompt === noteReference.step.display_prompt ? state : null;
    }, "s26-reference previous-step restore after content pages");
    assert.equal(visual.revealDots, 0, "s26-reference reverse navigation keeps the current no-reveal runtime behavior");
    expectVisualClasses(visual, ["slide--visual-reference"], "s26-reference previous-step restore after content pages");
    await setTeacherRevealMode(false);

    const selfAssessment = findStep("yazma", "s78-self");
    assert.equal(selfAssessment.step.layout, "assessment", "s78-self remains an assessment layout");
    assert.equal(selfAssessment.step.answer, null, "s78-self does not acquire answer data");
    const selfAssessmentOpened = await openStep("yazma", "s78-self");
    visual = await visualLayoutState();
    expectVisualClasses(visual, ["slide--visual-assessment"], "yazma/s78-self");
    const assessmentMarkup = await page.evaluate(`(() => ({
      qa: Boolean(document.querySelector('#canvas .slide--qa-modern')),
      focus: Boolean(document.querySelector('#canvas .qa-focus')),
      checklistRows: document.querySelectorAll('#canvas .criteria li').length,
      scaleRows: document.querySelectorAll('#canvas .scale-form__row').length,
      label: document.querySelector('#canvas .slide__top .tag')?.childNodes[0]?.textContent.trim(),
      titleAlign: getComputedStyle(document.querySelector('#canvas .prompt')).textAlign,
      titleFont: getComputedStyle(document.querySelector('#canvas .prompt')).fontFamily
    }))()`);
    assert.equal(assessmentMarkup.qa, false, "assessment stays outside the QA-modern shell");
    assert.equal(assessmentMarkup.focus, false, "assessment does not gain a QA answer-focus region");
    assert.ok(assessmentMarkup.checklistRows + assessmentMarkup.scaleRows > 0, "s78-self keeps its original assessment rows");
    assert.ok(assessmentMarkup.scaleRows > 0, "s78-self retains its Evet/Kısmen/Hayır scale rows");
    assert.equal(assessmentMarkup.label, "Değerlendirme", "assessment uses its semantic badge label");
    assert.equal(assessmentMarkup.titleAlign, "left", "assessment title remains left aligned");
    assert.match(assessmentMarkup.titleFont, /^\s*["']?Inter["']?(?:\s*,|$)/i, "assessment title uses Inter");
    assert.ok(selfAssessmentOpened.text.includes(selfAssessment.step.display_prompt), "s78-self keeps its existing prompt content");

    for (const fixture of [
      { slug: "dinleme-izleme", id: "s64-listen", layout: "process", key: "answer" },
      { slug: "huzur-okuma", id: "s170-reading", layout: "reference", key: "answer" }
    ]) {
      const entry = findStep(fixture.slug, fixture.id);
      assert.equal(entry.step.layout, fixture.layout, `${fixture.slug}/${fixture.id} reveal fixture has its expected layout`);
      assert.ok(entry.step.reveal_order.includes(fixture.key), `${fixture.slug}/${fixture.id} authors the expected ${fixture.key} reveal`);
      await openStep(fixture.slug, fixture.id);
      visual = await visualLayoutState();
      expectVisualClasses(visual, [`slide--visual-${fixture.layout}`], `${fixture.slug}/${fixture.id} opening`);
      assert.equal(visual.revealDots, 1, `${fixture.slug}/${fixture.id} has one active student reveal`);
      assert.equal(visual.revealedDots, 0, `${fixture.slug}/${fixture.id} starts before its answer reveal`);
      await next();
      visual = await visualLayoutState();
      assert.equal(visual.prompt, entry.step.display_prompt, `${fixture.slug}/${fixture.id} answer stays on the same step`);
      assert.equal(visual.revealedDots, 1, `${fixture.slug}/${fixture.id} next opens the authored answer reveal`);
      assert.ok(await answerPanelText(), `${fixture.slug}/${fixture.id} renders its answer content`);
      expectVisualClasses(visual, [`slide--visual-${fixture.layout}`], `${fixture.slug}/${fixture.id} answer reveal`);
      await previous();
      visual = await visualLayoutState();
      assert.equal(visual.prompt, entry.step.display_prompt, `${fixture.slug}/${fixture.id} previous returns to its task`);
      assert.equal(visual.revealedDots, 0, `${fixture.slug}/${fixture.id} previous closes the answer reveal`);
      expectVisualClasses(visual, [`slide--visual-${fixture.layout}`], `${fixture.slug}/${fixture.id} reverse navigation`);
    }

    for (const fixture of [
      { slug: "mektup", id: "s40-q5", layout: "structure", classes: ["slide--visual-structure"] },
      { slug: "asik-atismasi", id: "s143-q4", layout: "comparison", classes: [] },
      { slug: "huzur-okuma", id: "s172-vocabulary", layout: "vocabulary", classes: [] },
      { slug: "konusma", id: "s58-feedback", layout: "assessment", classes: ["slide--visual-assessment"] }
    ]) {
      const entry = await openStep(fixture.slug, fixture.id);
      assert.equal(entry.step.layout, fixture.layout, `${fixture.slug}/${fixture.id} control fixture has its expected layout`);
      visual = await visualLayoutState();
      expectVisualClasses(visual, fixture.classes, `${fixture.slug}/${fixture.id} control fixture`);
    }
    // Every internal companion heading must stay on the same vertical baseline,
    // even when adjacent slides contain substantially different amounts of content.
    const titleAnchorByLayout = new Map();
    for (const [slug, id, layout] of [
      ["karagoz", "s16-process", "process"],
      ["dinleme-izleme", "s67-qr-communication", "reference"],
      ["karagoz", "s26-reference", "reference"],
      ["yazma", "s78-self", "assessment"],
      ["konusma", "s58-feedback", "assessment"],
      ["tema-2-konusma", "s130-stations", "process"],
      ["huzur-177-178", "s178-circle-plan", "process"],
      ["tiyatro-canlandirma-280-283", "s281-plan", "process"]
    ]) {
      await openStep(slug, id);
      const appearance = await page.evaluate("(() => { const slide = document.querySelector('#canvas .slide'); const context = slide?.querySelector('.companion-context'); const focus = slide?.querySelector('.companion-focus'); const prompt = context?.querySelector(':scope > .prompt'); return { classes: slide?.className ?? '', prompt: prompt?.textContent ?? '', align: prompt ? getComputedStyle(prompt).textAlign : '', children: context?.children.length ?? 0, focusEmpty: focus?.childElementCount === 0, hasQaFocus: Boolean(slide?.querySelector('.qa-focus')), titleOffset: prompt ? prompt.getBoundingClientRect().top - slide.querySelector('.slide__body').getBoundingClientRect().top : null }; })()");
      assert.ok(appearance.classes.includes("slide--modern-companion"), slug + "/" + id + " has shared shell");
      assert.ok(appearance.classes.includes("slide--visual-" + layout), slug + "/" + id + " preserves its layout");
      assert.ok(appearance.prompt.trim().length > 0 && appearance.children > 1, slug + "/" + id + " preserves content");
      assert.ok(appearance.focusEmpty && !appearance.hasQaFocus, slug + "/" + id + " is not QA");
      assert.ok(layout === "process" ? ["center", "left"].includes(appearance.align) : appearance.align === "left",
        slug + "/" + id + " keeps its readable semantic title alignment");
      assert.ok(Number.isFinite(appearance.titleOffset), slug + "/" + id + " has a measurable heading position");
      if (titleAnchorByLayout.has(layout)) {
        const delta = Math.abs(appearance.titleOffset - titleAnchorByLayout.get(layout));
        assert.ok(delta <= 2, slug + "/" + id + " keeps a stable heading baseline when content density changes: " + delta.toFixed(2) + "px");
      } else {
        titleAnchorByLayout.set(layout, appearance.titleOffset);
      }
    }

    await openStep("dinleme-izleme", "s68-69-paydos-q1");
    const originalPromptSize = await page.evaluate("parseFloat(getComputedStyle(document.querySelector('#canvas .companion-context > .prompt')).fontSize)");
    assert.equal(await page.evaluate("document.querySelector('#canvas .companion-focus').childElementCount"), 0, "Paydos starts as a reading instruction");
    await next();
    const revealed = await page.evaluate("(() => { const prompt = document.querySelector('#canvas .companion-context > .prompt'); return { size: parseFloat(getComputedStyle(prompt).fontSize), title: prompt.textContent, answer: Boolean(document.querySelector('#canvas .companion-focus .panel--answer')), qa: Boolean(document.querySelector('#canvas .slide--qa-modern')) }; })()");
    assert.ok(revealed.size < originalPromptSize, "Paydos heading contracts when support opens");
    assert.equal(revealed.title, "Paydos parçasını okuyun", "Paydos title is preserved");
    assert.equal(revealed.answer, true, "Paydos support is in the shared focus area");
    assert.equal(revealed.qa, false, "Paydos stays a process, not a QA question");
    await previous();
    assert.equal(await page.evaluate("document.querySelector('#canvas .companion-focus').childElementCount"), 0, "Paydos reverse navigation restores its instruction");
    console.log("[sunum-web] Companion visual smoke passed in four themes.");
    console.log("[sunum-web] Focused visual-layout class smoke passed: process, assessment and reference shell isolation, pagination/reveal order, and existing content structures.");
    break presentationBrowserSuite;
  }

  if (process.env.VOCAB_DICT_SMOKE === "1") {
    const { step: dictionaryStep } = await openStep("orhun-abideleri", "s116-vocabulary");
    assert.equal(dictionaryStep.layout, "vocabulary", "s116-vocabulary is the canonical dictionary card fixture");
    let dictionaryVisible = await page.evaluate("Boolean(document.querySelector('#canvas .dict'))");
    for (let index = 0; index < 12 && !dictionaryVisible; index += 1) {
      await next();
      dictionaryVisible = await page.evaluate("Boolean(document.querySelector('#canvas .dict'))");
    }
    assert.equal(dictionaryVisible, true, "s116-vocabulary reaches its rendered dictionary card on the real route");
    const dictionaryStyle = await page.evaluate(`(async () => {
      await document.fonts.ready;
      const interFaces = await document.fonts.load('400 16px "Inter"');
      const slide = document.querySelector('#canvas .slide');
      const body = slide.querySelector('.slide__body');
      const card = slide.querySelector('.dict');
      const heading = card?.querySelector('h2');
      const dl = card?.querySelector('dl');
      const definitions = [...(dl?.querySelectorAll(':scope > dd:not(.src)') || [])];
      const termNodes = [...(dl?.querySelectorAll(':scope > dt') || [])];
      const cardRect = card?.getBoundingClientRect();
      const bodyRect = body?.getBoundingClientRect();
      const cardStyle = card && getComputedStyle(card);
      const headingStyle = heading && getComputedStyle(heading);
      const termStyles = termNodes.map((node) => getComputedStyle(node));
      const definitionStyles = definitions.map((node) => getComputedStyle(node));
      const bodyStyle = body && getComputedStyle(body);
      return {
        cardCount: slide.querySelectorAll('.dict').length,
        headingCount: [...slide.querySelectorAll('.dict h2')].filter((node) => node.textContent.trim() === 'Sözlük').length,
        headingText: heading?.textContent.trim() ?? '',
        headingFont: headingStyle?.fontFamily ?? '',
        cardBackground: cardStyle?.backgroundColor ?? '',
        dictInk: getComputedStyle(slide).getPropertyValue('--dict-ink').trim(),
        dictAccent: getComputedStyle(slide).getPropertyValue('--dict-accent').trim(),
        vocabInk: getComputedStyle(slide).getPropertyValue('--vocab-ink').trim(),
        assessmentTeal: getComputedStyle(slide).getPropertyValue('--assessment-teal').trim(),
        termEntries: termNodes.map((term, index) => ({
          term: term.textContent.trim(),
          tag: term.tagName,
          definitionTag: term.nextElementSibling?.tagName ?? '',
          definition: definitions[index]?.textContent.trim() ?? '',
          termFont: termStyles[index]?.fontFamily ?? '',
          termWeight: termStyles[index]?.fontWeight ?? '',
          definitionFont: definitionStyles[index]?.fontFamily ?? ''
        })),
        dlChildTags: [...(dl?.children || [])].map((node) => node.tagName),
        cardRect: cardRect && { x: cardRect.x, y: cardRect.y, right: cardRect.right, bottom: cardRect.bottom },
        bodyRect: bodyRect && { x: bodyRect.x, y: bodyRect.y, right: bodyRect.right, bottom: bodyRect.bottom },
        cardWithinBody: Boolean(cardRect && bodyRect && cardRect.left >= bodyRect.left - 1 && cardRect.right <= bodyRect.right + 1 &&
          cardRect.top >= bodyRect.top - 1 && cardRect.bottom <= bodyRect.top + body.scrollHeight + 1),
        cardNoScrollOverflow: Boolean(card && card.scrollWidth <= card.clientWidth + 1 && card.scrollHeight <= card.clientHeight + 1),
        bodyNoHorizontalOverflow: Boolean(body && body.scrollWidth <= body.clientWidth + 1),
        verticalScrollMode: bodyStyle?.overflowY ?? '',
        interLoaded: interFaces.some((face) => face.family.replaceAll('"', '') === 'Inter' && face.status === 'loaded')
      };
    })()`);
    assert.equal(dictionaryStyle.cardCount, 1, "s116-vocabulary renders one visible .dict card");
    assert.equal(dictionaryStyle.headingCount, 1, "the dictionary card has one Sözlük heading");
    assert.equal(dictionaryStyle.headingText, "Sözlük", "the heading is the Sözlük label");
    assert.match(dictionaryStyle.headingFont, /^Inter(?:,|$)/, "the dictionary heading uses Inter");
    assert.match(dictionaryStyle.termEntries[0]?.definitionFont ?? "", /^Inter(?:,|$)/, "dictionary definitions use Inter");
    assert.ok(dictionaryStyle.interLoaded, "the local Inter font is loaded for dictionary text");
    assert.ok(dictionaryStyle.termEntries.length > 0 && dictionaryStyle.termEntries.every((entry) =>
      entry.tag === "DT" && entry.definitionTag === "DD" && entry.definition && !entry.termFont.startsWith("Inter") && Number(entry.termWeight) >= 700),
    `dictionary terms retain bold DT/definition DD hierarchy: ${JSON.stringify(dictionaryStyle.termEntries)}`);
    assert.ok(dictionaryStyle.dlChildTags.every((tag) => tag === "DT" || tag === "DD"), "dictionary terms and definitions remain direct DL children");
    assert.equal(dictionaryStyle.dictInk, "#182a35", "dictionary palette is scoped to the dictionary-bearing slide");
    assert.equal(dictionaryStyle.dictAccent, "#176d68", "dictionary accent palette is applied to the card");
    assert.equal(dictionaryStyle.vocabInk, "", "dictionary styling does not activate the .vocab palette");
    assert.equal(dictionaryStyle.assessmentTeal, "", "dictionary styling does not activate the assessment palette");
    assert.equal(dictionaryStyle.cardBackground, "rgb(255, 255, 255)", "the dictionary card uses its intended white surface");
    assert.ok(dictionaryStyle.cardWithinBody, `dictionary card remains within the slide body bounds: ${JSON.stringify(dictionaryStyle.cardRect)}`);
    assert.ok(dictionaryStyle.cardNoScrollOverflow, "dictionary card has no internal scroll overflow");
    assert.ok(dictionaryStyle.bodyNoHorizontalOverflow, "dictionary page has no horizontal body overflow");

    await openStep("huzur-okuma", "s172-vocabulary");
    const vocabularyStyle = await page.evaluate(`(() => {
      const slide = document.querySelector('#canvas .slide');
      const terms = [...slide.querySelectorAll('.vocab__term')];
      return {
        dictInk: getComputedStyle(slide).getPropertyValue('--dict-ink').trim(),
        dictAccent: getComputedStyle(slide).getPropertyValue('--dict-accent').trim(),
        vocabInk: getComputedStyle(slide).getPropertyValue('--vocab-ink').trim(),
        termColors: terms.map((node) => getComputedStyle(node).color),
        termFonts: terms.map((node) => getComputedStyle(node).fontFamily)
      };
    })()`);
    assert.equal(vocabularyStyle.dictInk, "", "dictionary ink does not leak onto .vocab slides");
    assert.equal(vocabularyStyle.dictAccent, "", "dictionary accent does not leak onto .vocab slides");
    assert.notEqual(vocabularyStyle.vocabInk, "", "the .vocab palette remains active on vocabulary cards");
    assert.ok(vocabularyStyle.termColors.includes("rgb(83, 99, 167)"), "vocabulary term accent hierarchy remains intact");
    assert.ok(vocabularyStyle.termFonts.every((font) => !font.startsWith("Inter")), "vocabulary terms keep their serif hierarchy");

    await openStep("asik-atismasi", "s139-checklist");
    const criteriaStyle = await page.evaluate(`(() => {
      const slide = document.querySelector('#canvas .slide');
      const marker = getComputedStyle(slide.querySelector('.criteria li'), '::before').borderTopColor;
      const accentProbe = document.createElement('span');
      accentProbe.style.color = getComputedStyle(slide).getPropertyValue('--accent').trim();
      slide.append(accentProbe);
      const accent = getComputedStyle(accentProbe).color;
      accentProbe.remove();
      return {
        dictInk: getComputedStyle(slide).getPropertyValue('--dict-ink').trim(),
        dictAccent: getComputedStyle(slide).getPropertyValue('--dict-accent').trim(),
        marker,
        accent
      };
    })()`);
    assert.equal(criteriaStyle.dictInk, "", "dictionary ink does not leak onto .criteria slides");
    assert.equal(criteriaStyle.dictAccent, "", "dictionary accent does not leak onto .criteria slides");
    assert.equal(criteriaStyle.marker, criteriaStyle.accent, "criteria markers keep the lesson accent");

    await openStep("kemal-tahir-mulakat-210-214", "s214-eval");
    const scaleStyle = await page.evaluate(`(() => {
      const slide = document.querySelector('#canvas .slide');
      const head = slide.querySelector('.scale-form__head');
      return {
        dictInk: getComputedStyle(slide).getPropertyValue('--dict-ink').trim(),
        dictAccent: getComputedStyle(slide).getPropertyValue('--dict-accent').trim(),
        assessmentTeal: getComputedStyle(slide).getPropertyValue('--assessment-teal').trim(),
        headBackground: getComputedStyle(head).backgroundColor,
        rowCount: slide.querySelectorAll('.scale-form__row').length
      };
    })()`);
    assert.equal(scaleStyle.dictInk, "", "dictionary ink does not leak onto .scale-form slides");
    assert.equal(scaleStyle.dictAccent, "", "dictionary accent does not leak onto .scale-form slides");
    assert.notEqual(scaleStyle.assessmentTeal, "", "the assessment palette remains active on scale forms");
    assert.equal(scaleStyle.headBackground, "rgb(226, 239, 235)", "scale-form header keeps its own background style");
    assert.equal(scaleStyle.rowCount, 6, "the scale form retains all six rows");
    console.log("[sunum-web] Focused Chrome dictionary smoke passed: card, heading, Inter definitions, term hierarchy, bounds, and vocabulary/criteria/scale-form style isolation.");
    break presentationBrowserSuite;
  }
  // Long location metadata must never add header rows as answer/reveal labels change.
  await openStep("mektup", "s44-q2");
  const initialHeader = await headerMetrics();
  const fixedHeaderHeight = initialHeader.height;
  const fixedBodyTop = initialHeader.bodyTop;
  let answerReached = false;
  for (let index = 0; index < 12; index += 1) {
    const metrics = await headerMetrics();
    assert.equal(metrics.whiteSpace, "nowrap", "s.44 metadata stays on one line");
    assert.equal(metrics.height, fixedHeaderHeight, "s.44 header height stays fixed across reveal layers");
    assert.equal(metrics.bodyTop, fixedBodyTop, "s.44 body position stays fixed across reveal layers");
    assert.ok(metrics.title.includes("Çözümleyebilme"), "full s.44 metadata remains available in the title");
    assert.ok(!metrics.title.includes(" · Cevap"), "s.44 QA header title never receives the reveal label");
    if ((await answerPanelText()).trim()) {
      answerReached = true;
      break;
    }
    await next();
  }
  assert.ok(answerReached, "s.44 regression case reaches its answer reveal without adding it to .where");
  assert.ok(!(await headerMetrics()).title.includes(" · Cevap"), "s.44 answer view keeps the view label out of .where");
  await openStep("konusma", "s53-q1");
  const longHeadingMetrics = await headerMetrics();
  assert.equal(longHeadingMetrics.whiteSpace, "nowrap", "s.53 long heading stays on one line");
  assert.equal(longHeadingMetrics.height, fixedHeaderHeight, "s.53 long heading does not change header height");
  assert.ok(longHeadingMetrics.title.includes("Drama hazırlığı"), "full s.53 heading remains available in the title");
  for (let index = 0; index < 5; index += 1) {
    await next();
    const metrics = await headerMetrics();
    assert.equal(metrics.height, fixedHeaderHeight, "s.53 header height stays fixed across reveal layers");
    assert.equal(metrics.bodyTop, fixedBodyTop, "s.53 body position stays fixed across reveal layers");
  }

  const promptFixtures = [
    { slug: "tema-girisi", id: "s14-q1", expected: "short" },
    { slug: "karagoz", id: "s28-q1", expected: "long" },
    { slug: "mektup", id: "s39-q1" },
    { slug: "tema-2-degerlendirme", id: "s155-q2" },
    { slug: "tema-2-degerlendirme", id: "s157-q3" },
    { slug: "tema-2-girisi", id: "s88-q4", expected: "long" }
  ];
  const promptAlignmentResults = [];
  for (const fixture of promptFixtures) {
    const source = findStep(fixture.slug, fixture.id);
    const runtimeLesson = builtCatalog.lessons.find((lesson) => lesson.slug === fixture.slug);
    const runtimeStep = runtimeLesson?.steps.find((step) => step.id === fixture.id);
    assert.ok(source.step.display_prompt.trim(), `${fixture.id} has a prompt in the canonical source`);
    assert.ok(runtimeStep?.prompt.trim(), `${fixture.id} runtime catalog has a non-empty prompt`);
    assert.ok(runtimeStep?.reveals.includes("answer"), `${fixture.id} canonical runtime reveals include answer`);
    assert.equal(runtimeStep?.answer?.entry_type, "question_answer", `${fixture.id} is a canonical question_answer`);
    assert.equal(usesModernQuestionLayout(runtimeStep), true, `${fixture.id} enters QA-modern by semantic eligibility`);
    await openStep(fixture.slug, fixture.id);
    await waitForPromptFonts();
    const metrics = await qaPromptMetrics();
    assert.ok(metrics, `${fixture.id} renders a QA prompt for measurement`);
    const lines = metrics.afterAlignment.lineCount;
    assert.match(metrics.afterAlignment.inputs.fontFamily, /^\s*["']?Inter["']?(?:\s*,|$)/i,
      `${fixture.id} computed QA prompt font-family starts with Inter (${metrics.afterAlignment.inputs.fontFamily})`);
    assert.equal(metrics.afterAlignment.fontCheck, true,
      `${fixture.id} document.fonts.check confirms Inter is loaded for the prompt text`);
    assert.ok(metrics.afterAlignment.interFaces.some((face) => face.status === "loaded"),
      `${fixture.id} has a loaded Inter FontFace (${JSON.stringify(metrics.afterAlignment.interFaces)})`);
    assert.ok(lines > 0, `${fixture.id} has measurable rendered text lines`);
    assert.equal(metrics.appliedTextAlign, lines >= 3 ? "left" : "center",
      `${fixture.id} text-align follows its actual rendered line count (${lines})`);
    assert.equal(metrics.afterAlignment.textAlign, metrics.appliedTextAlign,
      `${fixture.id} computed alignment reflects the applied measurement decision`);
    assert.deepEqual(metrics.beforeAlignment.inputs, metrics.afterAlignment.inputs,
      `${fixture.id} alignment does not change width/font measurement inputs`);
    assert.equal(metrics.beforeAlignment.lineCount, metrics.afterAlignment.lineCount,
      `${fixture.id} alignment does not change the measured line count`);
    assert.deepEqual(metrics.restored, metrics.afterAlignment,
      `${fixture.id} restoring the tested alignment returns the same measured layout`);
    if (fixture.expected === "short") assert.ok(lines >= 1 && lines <= 2, `${fixture.id} is a real 1–2 line QA prompt`);
    if (fixture.expected === "long") assert.ok(lines >= 3, `${fixture.id} is a real 3+ line QA prompt`);
    promptAlignmentResults.push({
      id: fixture.id,
      lines,
      textAlign: metrics.afterAlignment.textAlign,
      fontFamily: metrics.afterAlignment.inputs.fontFamily,
      fontCheck: metrics.afterAlignment.fontCheck
    });
  }
  console.log(`[sunum-web] Inter-loaded QA prompt alignment: ${JSON.stringify(promptAlignmentResults)}`);

  const longOpening = await openStep("karagoz", "s28-q1");
  assert.equal(longOpening.step.answer.question_id, "T1-P28-Q01", "s.28 target prompt has its expected canonical identity");
  let s28PromptMetrics = await qaPromptMetrics();
  assert.ok(s28PromptMetrics.afterAlignment.lineCount >= 3, "s.28 long opening prompt occupies at least three rendered lines");
  assert.equal(s28PromptMetrics.afterAlignment.textAlign, "left", "s.28 long prompt is left aligned");
  let s28ContentAlignment = await qaContentAlignmentState();
  assert.equal(s28ContentAlignment.prompt, "left", "long prompt alignment stays on the prompt element");
  assert.equal(s28ContentAlignment.context, "start", "QA context does not inherit centered text alignment");
  assert.ok(s28ContentAlignment.content.length > 0 && s28ContentAlignment.content.every((node) => node.align === "left"),
    `s.28 opening content blocks are left aligned: ${JSON.stringify(s28ContentAlignment.content)}`);
  assert.equal(s28ContentAlignment.listDisplay, "grid", "s.28 numbered items retain the existing grid layout");
  assert.ok(s28ContentAlignment.number?.left < s28ContentAlignment.itemText?.left,
    "s.28 number bubbles remain to the left of each item text");
  await next();
  await waitForPromptFonts();
  s28PromptMetrics = await qaPromptMetrics();
  assert.equal(s28PromptMetrics.appliedTextAlign, s28PromptMetrics.afterAlignment.lineCount >= 3 ? "left" : "center",
    "s.28 compact reveal prompt follows its actual rendered line count");
  assert.deepEqual(s28PromptMetrics.beforeAlignment.inputs, s28PromptMetrics.afterAlignment.inputs,
    "s.28 compact reveal alignment leaves prompt sizing and wrapping inputs unchanged");
  const longCompact = await openStep("karagoz", "s29-q1");
  assert.equal(longCompact.step.answer.question_id, "T1-P29-Q01", "s.29 compact-prompt fixture has its expected identity");
  await next();
  await waitForPromptFonts();
  const longCompactMetrics = await qaPromptMetrics();
  assert.ok(longCompactMetrics.afterAlignment.lineCount >= 3, "s.29 reveal prompt remains a long compact prompt after fitBody");
  assert.equal(longCompactMetrics.afterAlignment.textAlign, "left", "long compact reveal prompt is left aligned");
  assert.deepEqual(longCompactMetrics.beforeAlignment.inputs, longCompactMetrics.afterAlignment.inputs,
    "long compact alignment changes no width, font, or wrapping inputs");

  // Non-question answer types keep their specialized answer renderer inside the
  // QA shell whenever their canonical step has a prompt and answer reveal.
  const qaEntry = findStep("huzur-metni-anlayalim-175-176", "s175-q1");
  const qaRuntimeEntry = builtCatalog.lessons.find((lesson) => lesson.slug === qaEntry.lesson.lesson_slug)
    ?.steps.find((step) => step.id === qaEntry.step.id);
  assert.equal(qaEntry.step.layout, "question", "s175-q1 keeps its canonical content layout");
  assert.equal(qaRuntimeEntry?.answer?.entry_type, "performance_support", "s175-q1 is performance support");
  assert.equal(usesModernQuestionLayout(qaRuntimeEntry), true, "s175-q1 performance support enters QA-modern by its prompt and answer reveal");
  assert.equal(qaEntry.step.answer.question_no, "1", "s175-q1 production fixture has question number 1");
  assert.ok(qaEntry.step.answer.answer_sections, "s175-q1 has structured production answers");
  await openStep("huzur-metni-anlayalim-175-176", "s175-q1");
  let qa = await qaState();
  assert.equal(qa.modern, true, `s175-q1 performance support uses the QA-modern shell: ${JSON.stringify(qa)}`);
  assert.equal(qa.badge, "SORU · 1. soru", "s175-q1 keeps its canonical question number in the QA SORU badge");
  assert.ok((await bodyText()).includes(qaEntry.step.display_prompt), "s175-q1 still renders its task prompt");
  const s175AnswerSnippet = firstSourceString(qaEntry.step.answer.answer_sections).trim().slice(0, 36);
  const s175Answer = await advanceUntil((text) => text.includes(s175AnswerSnippet), "s175 performance-support answer", 12);
  assert.ok(s175Answer.includes(s175AnswerSnippet), "s175-q1 answer remains available through its existing renderer");
  qa = await qaState();
  assert.equal(qa.modern, true, "s175-q1 remains in QA-modern during answer navigation");
  assert.ok(qa.focus.includes(s175AnswerSnippet), "s175-q1 specialized performance-support answer stays in the focus stage");

  const pairedQaEntry = findStep("ogulla-bulusma", "s100-q1");
  assert.equal(pairedQaEntry.step.layout, "question", "s100-q1 production fixture is QA eligible");
  assert.equal(pairedQaEntry.step.answer.question_no, "1", "s100-q1 production fixture has question number 1");
  const pairedUnit = pairedQaEntry.step.presentation?.web?.units?.find((unit) => unit.evidence_sections?.length);
  assert.ok(pairedUnit, "s100-q1 production fixture pairs answer and evidence");
  await openStep("ogulla-bulusma", "s100-q1");
  qa = await qaState();
  assert.equal(qa.modern, true, "s100-q1 uses the modern QA layout");
  assert.equal(qa.badge, "SORU · 1. soru", "s100-q1 shows the SORU badge and question_no");
  const s100Answer = await advanceUntil((text) => text.includes("Çordon, yaklaşık yirmi yıl önce"), "s100-q1 paired answer");
  qa = await qaState();
  assert.equal(qa.prompt, pairedQaEntry.step.display_prompt, "s100-q1 prompt stays in qa-context through its answer reveal");
  assert.ok(qa.focus.includes("Çordon, yaklaşık yirmi yıl önce"), "s100-q1 answer opens in qa-focus");
  assert.ok(s100Answer.includes("Çordon, yaklaşık yirmi yıl önce"), "s100-q1 answer page shows production answer text");
  assert.ok(qa.counter.includes("sayfa 1/"), "s100-q1 multi-page answer count is shown in the footer");
  assert.ok((await answerPanelText()).trim(), "s100-q1 paired answer is visible before its evidence page");
  assert.equal((await evidencePanelText()).trim(), "", "s100-q1 evidence waits for its authored follow-up page");
  assert.equal(qa.qaStageLabels, 0, "s100-q1 does not add a duplicate stage label beside answer/evidence panels");
  await next();
  qa = await qaState();
  assert.equal(qa.prompt, pairedQaEntry.step.display_prompt, "s100-q1 prompt remains in context on the next answer page");
  assert.ok(qa.counter.includes("sayfa 2/"), "s100-q1 forward navigation increments the footer page count");
  assert.ok(qa.focus.includes("Alınan Karar"), "s100-q1 evidence page keeps its linked answer in qa-focus");
  assert.equal(qa.stageLabels.length, new Set(qa.stageLabels).size, "s100-q1 answer/evidence stage labels do not repeat");
  assert.ok((await answerPanelText()).trim(), "s100-q1 linked answer remains paired with its evidence");
  assert.ok((await evidencePanelText()).includes("Henüz gözlerim kapanmadan"), "s100-q1 linked evidence opens on its paired page");
  await previous();
  qa = await qaState();
  assert.ok(qa.counter.includes("sayfa 1/"), "s100-q1 backward navigation restores the answer page count");
  assert.ok((await answerPanelText()).trim(), "s100-q1 backward navigation restores the answer page");
  assert.equal((await evidencePanelText()).trim(), "", "s100-q1 backward navigation closes its evidence page");
  const s58QaCandidate = findStep("konusma", "s58-feedback");
  assert.equal(s58QaCandidate.step.layout, "assessment", "s58-feedback keeps its canonical assessment renderer");
  assert.equal(usesModernQuestionLayout(s58QaCandidate.step), false,
    "s58-feedback source fixture does not synthesize QA answer eligibility");
  await openStep("konusma", "s58-feedback");
  assert.equal((await qaState()).modern, false, "s58-feedback stays outside the QA-modern shell by layout policy");

  // The encrypted runtime catalog is the source of truth for reveal eligibility.
  // s155-q2 has five answer-choice items, so its actual content view spans two parts.
  const multiPageQa = multiPageContentQa;
  const multiPageEntry = findStep(multiPageQa.lesson.slug, multiPageQa.step.id);
  assert.equal(multiPageQa.step.layout, "question", `${multiPageEntry.step.id} production layout is question`);
  assert.ok(multiPageQa.step.reveals.includes("answer"), `${multiPageEntry.step.id} canonical reveals include answer`);
  assert.ok(multiPageEntry.step.reveal_order.includes("answer"), `${multiPageEntry.step.id} source reveal order includes answer`);
  assert.equal(multiPageEntry.step.content.items.length, 5, `${multiPageEntry.step.id} has five production answer choices`);
  const firstContentPage = await openStep(multiPageQa.lesson.slug, multiPageEntry.step.id);
  qa = await qaState();
  assert.equal(qa.modern, true, `${multiPageEntry.step.id} opens in the QA layout`);
  assert.equal(qa.counter.split("· sayfa ")[1], "1/2", `${multiPageEntry.step.id} content starts at part 1/2`);
  assert.ok(qa.focus.trim() === "", `${multiPageEntry.step.id} content starts with an empty qa-focus`);
  const firstContentItems = multiPageEntry.step.content.items.filter((item) => qa.context.includes(item));
  const secondContentItems = multiPageEntry.step.content.items.filter((item) => !firstContentItems.includes(item));
  assert.ok(firstContentItems.length > 0 && secondContentItems.length > 0,
    `${multiPageEntry.step.id} first content part shows a proper subset of its choices`);
  assert.ok(firstContentPage.text.includes(firstContentItems[0]));
  const secondContentPage = await next();
  qa = await qaState();
  assert.equal(qa.counter.split("· sayfa ")[1], "2/2", `${multiPageEntry.step.id} advances to content part 2/2`);
  assert.equal(qa.focus.trim(), "", `${multiPageEntry.step.id} second content part remains in qa-context`);
  assert.ok(secondContentItems.every((item) => qa.context.includes(item)),
    `${multiPageEntry.step.id} second content part shows the remaining choices`);
  assert.ok(secondContentPage.includes(secondContentItems[0]));
  await next();
  qa = await qaState();
  assert.equal(qa.prompt, multiPageEntry.step.display_prompt, `${multiPageEntry.step.id} prompt remains in qa-context after content`);
  assert.ok(qa.focus.includes("Düşünürken"), `${multiPageEntry.step.id} thinking follows both content parts`);
  await next();
  qa = await qaState();
  assert.ok(qa.focus.includes("Devletin temel değerlerini aktarmak"), `${multiPageEntry.step.id} answer follows thinking`);
  assert.equal(qa.prompt, multiPageEntry.step.display_prompt, `${multiPageEntry.step.id} prompt remains in qa-context during answer`);
  await previous();
  qa = await qaState();
  assert.ok(qa.focus.includes("Düşünürken"), `${multiPageEntry.step.id} first reverse step returns to thinking`);
  await previous();
  qa = await qaState();
  assert.equal(qa.counter.split("· sayfa ")[1], "2/2", `${multiPageEntry.step.id} reverse navigation returns to content part 2/2`);
  assert.ok(secondContentItems.every((item) => qa.context.includes(item)), `${multiPageEntry.step.id} reverse part 2 restores its choices`);
  assert.equal(qa.focus.trim(), "", `${multiPageEntry.step.id} reverse part 2 clears qa-focus`);
  await previous();
  qa = await qaState();
  assert.equal(qa.counter.split("· sayfa ")[1], "1/2", `${multiPageEntry.step.id} reverse navigation returns to content part 1/2`);
  assert.ok(firstContentItems.every((item) => qa.context.includes(item)),
    `${multiPageEntry.step.id} reverse part 1 restores its choices`);

  // Intercept the native View Transition API in this harness so the boundary
  // policy is deterministic across Chrome versions and headless environments.
  await installQaTransitionProbe();
  await clearQaTransitionCalls();
  await next(); // Content part 1 -> content part 2 must not animate the prompt.
  assert.equal((await qaTransitionCalls()).length, 0,
    `${multiPageEntry.step.id} content pagination does not start a QA prompt transition`);
  await next(); // Last content part -> first reveal.
  let transitionCalls = await qaTransitionCalls();
  assert.equal(transitionCalls.length, 1,
    `${multiPageEntry.step.id} last content part to first reveal starts exactly one transition`);
  assert.equal(transitionCalls[0].before.count, 1, "QA transition starts with one named prompt");
  assert.equal(transitionCalls[0].after.count, 1, "QA transition ends with one named prompt");
  assert.equal(transitionCalls[0].before.viewTransitionName, "qa-question",
    "the outgoing QA prompt has the shared view-transition name");
  assert.equal(transitionCalls[0].after.viewTransitionName, "qa-question",
    "the incoming QA prompt has the shared view-transition name");
  assert.equal(transitionCalls[0].after.text, transitionCalls[0].before.text,
    "the transition carries the same question prompt into its first reveal");
  await next(); // First reveal -> next reveal must not animate.
  assert.equal((await qaTransitionCalls()).length, 1,
    `${multiPageEntry.step.id} reveal-to-reveal navigation does not start a transition`);
  await previous(); // Return to the first reveal.
  assert.equal((await qaTransitionCalls()).length, 1,
    `${multiPageEntry.step.id} reverse reveal-to-reveal navigation does not start a transition`);
  await previous(); // First reveal -> last content part.
  transitionCalls = await qaTransitionCalls();
  assert.equal(transitionCalls.length, 2,
    `${multiPageEntry.step.id} first reveal to content starts one reverse transition`);
  assert.equal(transitionCalls[1].before.viewTransitionName, "qa-question",
    "reverse transition starts with the shared prompt name");
  assert.equal(transitionCalls[1].after.viewTransitionName, "qa-question",
    "reverse transition returns to the shared prompt name");
  await previous(); // Content part 2 -> content part 1.
  assert.equal((await qaTransitionCalls()).length, 2,
    `${multiPageEntry.step.id} reverse content pagination does not start a transition`);

  // Walk every prompt-bearing answer-reveal step through its real URL entry
  // point, independent of entry type and renderer selected by layout.
  const allQuestionCases = builtCatalog.lessons.flatMap((lesson) => lesson.steps
    .map((step, index) => ({ lesson, step, slide: index + 1 }))
    .filter(({ step }) => usesModernQuestionLayout(step)));
  const sourceQuestionCount = lessons.reduce((count, lesson) =>
    count + lesson.steps.filter((step) => typeof step.display_prompt === "string" && step.display_prompt.trim() &&
      step.reveal_order?.includes("answer") && step.answer?.entry_type?.trim()).length, 0);
  assert.equal(allQuestionCases.length, sourceQuestionCount,
    "built and source catalogs contain the same number of prompt-bearing answer-reveal steps");
  const questionSweep = [];
  for (const { lesson, step, slide } of allQuestionCases) {
    const qaShellEligible = usesModernQuestionLayout(step) &&
      !["process", "assessment", "reference"].includes(step.layout);
    const hash = `#/${lesson.slug}/${slide}`;
    await page.send("Page.navigate", { url: `${root}/${hash}` });
    let opened;
    try {
      opened = await until(async () => {
        const state = await qaState();
        const isReady = qaShellEligible
          ? state.prompt === step.prompt
          : !state.modern && (await bodyText()).includes(step.prompt);
        return isReady ? state : null;
      }, `question URL restore ${lesson.slug}/${step.id}`);
    } catch (error) {
      const diagnostics = await page.evaluate(`JSON.stringify({hash: location.hash, body: document.querySelector('#canvas .slide__body')?.innerText,
        title: document.querySelector('#canvas .where')?.title, modern: document.querySelector('#canvas .slide')?.classList.contains('slide--qa-modern')})`);
      console.error(`[sunum-web] QA question URL sweep diagnostics ${lesson.slug}/${step.id}: ${diagnostics}`);
      throw error;
    }
    assert.ok((await bodyText()).includes(step.prompt), `${lesson.slug}/${step.id} opens its authored prompt`);
    assert.ok((await page.evaluate("document.querySelector('#canvas .slide') !== null")),
      `${lesson.slug}/${step.id} renders a slide from its URL`);
    assert.equal(opened.modern, qaShellEligible,
      `${lesson.slug}/${step.id} (layout ${step.layout ?? "default"}) shell policy keeps process, assessment and reference layouts out of QA-modern`);
    if (qaShellEligible) {
      assert.equal(opened.modern, true, `${lesson.slug}/${step.id} opens in modern QA layout`);
      assert.equal(opened.prompt, step.prompt, `${lesson.slug}/${step.id} keeps its prompt in QA context`);
      assert.equal(opened.focus.trim(), "", `${lesson.slug}/${step.id} starts with an empty QA focus`);
    }
    const contentPageCount = opened.counter.match(/sayfa 1\/(\d+)/)?.[1];
    if (contentPageCount && Number(contentPageCount) > 1) {
      await nextImmediately();
      const nextContentPage = await qaState();
      assert.ok(nextContentPage.counter.includes(`sayfa 2/${contentPageCount}`),
        `${lesson.slug}/${step.id} advances its opening content page`);
      assert.equal(nextContentPage.focus.trim(), "", `${lesson.slug}/${step.id} keeps paginated content in QA context`);
      await previous();
      const restoredContentPage = await qaState();
      assert.ok(restoredContentPage.counter.includes(`sayfa 1/${contentPageCount}`),
        `${lesson.slug}/${step.id} backward navigation restores its opening content page`);
    }
    questionSweep.push({ slug: lesson.slug, id: step.id, modern: opened.modern });
    if (questionSweep.length % 50 === 0) {
      console.log(`[sunum-web] Production question opening-state sweep progress: ${questionSweep.length}/${allQuestionCases.length}`);
    }
  }
  assert.equal(questionSweep.length, 718, "all semantically eligible production answer-reveal URLs completed the opening-state sweep");
  console.log(`[sunum-web] Production question opening-state sweep: ${JSON.stringify({
    questionSteps: questionSweep.length,
    modernQaSteps: questionSweep.filter((step) => step.modern).length
  })}`);

  // The comparison renderer remains layout-driven; QA shell eligibility follows
  // the same semantic contract as every other layout.
  const allComparisonCases = builtCatalog.lessons.flatMap((lesson) => lesson.steps
    .map((step, index) => ({ lesson, step, slide: index + 1 }))
    .filter(({ step }) => step.layout === "comparison"));
  const sourceComparisonCount = lessons.reduce((count, lesson) =>
    count + lesson.steps.filter((step) => step.layout === "comparison").length, 0);
  assert.equal(allComparisonCases.length, sourceComparisonCount,
    "built and source catalogs contain the same number of comparison steps");
  const eligibleComparisonCases = allComparisonCases.filter(({ step }) =>
    usesModernQuestionLayout(step));
  const excludedComparisonCases = allComparisonCases.filter(({ step }) =>
    !usesModernQuestionLayout(step));
  assert.equal(allComparisonCases.length, 88, "production catalog contains 88 comparison steps");
  assert.equal(eligibleComparisonCases.length, 75, "75 comparisons with answer reveals meet semantic QA shell eligibility");
  assert.equal(excludedComparisonCases.length, 13, "13 comparisons without answer reveals remain outside QA shell eligibility");
  for (const { lesson, step, slide } of allComparisonCases) {
    const eligible = usesModernQuestionLayout(step);
    await page.send("Page.navigate", { url: `${root}/#/${lesson.slug}/${slide}` });
    const state = await until(async () => {
      const current = await qaState();
      return current.slidePrompt === step.prompt ? current : null;
    }, `comparison QA eligibility ${lesson.slug}/${step.id}`);
    assert.equal(state.modern, eligible, `${lesson.slug}/${step.id} QA shell eligibility matches its answer/prompt contract`);
    assert.equal(state.comparison, eligible, `${lesson.slug}/${step.id} comparison shell class matches eligibility`);
    if (eligible) {
      assert.equal(state.prompt, step.prompt, `${lesson.slug}/${step.id} prompt stays in QA context`);
      assert.equal(state.focus.trim(), "", `${lesson.slug}/${step.id} opens with an empty QA focus`);
    }
  }
  console.log(`[sunum-web] Comparison QA eligibility: ${JSON.stringify({
    comparisons: allComparisonCases.length,
    eligible: eligibleComparisonCases.length,
    excluded: excludedComparisonCases.length
  })}`);

  // s143-q4 exercises comparison response order, a distinct paired-evidence
  // page, reverse navigation, and restoring the bookmarked question URL.
  const comparisonPairEntry = findStep("asik-atismasi", "s143-q4");
  const comparisonPairUnit = comparisonPairEntry.step.presentation?.web?.units?.find((unit) => unit.evidence_sections?.length);
  assert.ok(comparisonPairUnit, "s143-q4 has a production paired-evidence unit");
  assert.equal(comparisonPairEntry.step.layout, "comparison", "s143-q4 is a comparison fixture");
  const comparisonAnswerOrder = comparisonPairUnit.section_keys;
  const comparisonEvidenceOrder = comparisonPairUnit.evidence_sections.map((section) => section.section_key);
  await openStep("asik-atismasi", "s143-q4");
  let comparisonQa = await qaState();
  assert.equal(comparisonQa.modern, true, "s143-q4 opens in the QA shell");
  assert.equal(comparisonQa.comparison, true, "s143-q4 receives the comparison QA class");
  assert.equal(comparisonQa.focus.trim(), "", "s143-q4 bookmark starts at its task page");
  const comparisonBookmark = await page.evaluate("location.href");
  const renderedComparisonAnswerOrder = [];
  let foundComparisonEvidencePage = false;
  for (let pageIndex = 0; pageIndex < 12; pageIndex += 1) {
    if ((await evidencePanelText()).trim()) {
      foundComparisonEvidencePage = true;
      break;
    }
    renderedComparisonAnswerOrder.push(...await page.evaluate(`Array.from(document.querySelectorAll('#canvas .qa-focus .panel--answer .sec h3'))
      .map((heading) => heading.innerText.trim())`));
    await next();
  }
  assert.deepEqual(renderedComparisonAnswerOrder, comparisonAnswerOrder,
    "s143-q4 answer sections render in canonical order across their answer pages");
  assert.equal(foundComparisonEvidencePage, true, "s143-q4 paired evidence follows the answer pages on its own page");
  comparisonQa = await qaState();
  assert.ok((await answerPanelText()).trim(), "s143-q4 paired evidence page retains its linked answer");
  assert.deepEqual(await page.evaluate(`Array.from(document.querySelectorAll('#canvas .qa-focus .panel--evidence .sec h3'))
    .map((heading) => heading.innerText.trim())`), comparisonEvidenceOrder,
  "s143-q4 evidence sections render on their own paired page");
  await previous();
  assert.equal((await evidencePanelText()).trim(), "", "s143-q4 backward navigation closes the evidence page");
  assert.deepEqual(await page.evaluate(`Array.from(document.querySelectorAll('#canvas .qa-focus .panel--answer .sec h3'))
    .map((heading) => heading.innerText.trim())`), [comparisonAnswerOrder.at(-1)],
  "s143-q4 backward navigation restores the answer page before its evidence");
  await page.send("Page.navigate", { url: comparisonBookmark });
  comparisonQa = await until(async () => {
    const state = await qaState();
    return state.comparison && state.prompt === comparisonPairEntry.step.display_prompt && state.focus.trim() === "" ? state : null;
  }, "s143-q4 bookmarked question URL restore");
  assert.equal(comparisonQa.comparison, true, "s143-q4 bookmark restores the comparison shell");
  assert.ok(comparisonQa.context.includes(comparisonPairEntry.step.display_prompt),
    "s143-q4 bookmark restores the prompt in QA context");

  // Canonical comparison with seven task items spans content pages. Exercise
  // both directions in its QA shell without exporting the lesson deck here.
  const longComparisonEntry = findStep("biyografi-akif-cozumleme-202-205", "s204-q1");
  assert.equal(longComparisonEntry.step.layout, "comparison", "s204-q1 is a comparison layout");
  assert.equal(longComparisonEntry.step.content.items.length, 7, "s204-q1 is the seven-item long comparison fixture");
  await openStep("biyografi-akif-cozumleme-202-205", "s204-q1");
  comparisonQa = await qaState();
  assert.equal(comparisonQa.comparison, true, "s204-q1 opens in the comparison QA shell");
  const longComparisonPages = comparisonQa.counter.match(/sayfa 1\/(\d+)/);
  assert.ok(longComparisonPages && Number(longComparisonPages[1]) > 1,
    "s204-q1 opening content is split across multiple pages");
  await next();
  comparisonQa = await qaState();
  assert.ok(comparisonQa.counter.includes(`sayfa 2/${longComparisonPages[1]}`),
    "s204-q1 advances to its second content page");
  assert.equal(comparisonQa.focus.trim(), "", "s204-q1 keeps paginated task content in QA context");
  await previous();
  assert.ok((await qaState()).counter.includes(`sayfa 1/${longComparisonPages[1]}`),
    "s204-q1 backward navigation restores its first content page");

  // Exercise paired answer/evidence sequencing and reverse navigation for all
  // production questions that author evidence alongside an answer.
  const pairedQuestionCases = allQuestionCases.filter(({ step }) =>
    step.presentation?.web?.units?.some((unit) => unit.evidence_sections?.length));
  const sourcePairedQuestionCount = lessons.reduce((count, lesson) => count + lesson.steps.filter((step) =>
    typeof step.display_prompt === "string" && step.display_prompt.trim() &&
    step.reveal_order?.includes("answer") && step.answer?.entry_type?.trim() &&
    step.presentation?.web?.units?.some((unit) => unit.evidence_sections?.length)).length, 0);
  assert.equal(pairedQuestionCases.length, sourcePairedQuestionCount,
    "built and source catalogs contain the same number of paired-evidence answer-reveal steps");
  for (const [pairedIndex, { lesson, step, slide }] of pairedQuestionCases.entries()) {
    const qaShellEligible = usesModernQuestionLayout(step) &&
      !["process", "assessment", "reference"].includes(step.layout);
    await page.send("Page.navigate", { url: `${root}/#/${lesson.slug}/${slide}` });
    await until(async () => {
      const state = await qaState();
      return qaShellEligible ? state.prompt === step.prompt : !state.modern && (await bodyText()).includes(step.prompt);
    }, `paired answer URL ${lesson.slug}/${step.id}`);
    if (!qaShellEligible) {
      const openingState = await qaState();
      assert.equal(openingState.modern, false,
        `${lesson.slug}/${step.id} keeps its authored ${step.layout} layout outside QA-modern`);
    }
    let evidence = "";
    for (let index = 0; index < 48; index += 1) {
      evidence = await evidencePanelText();
      if (evidence.trim()) break;
      await nextImmediately();
    }
    assert.ok(evidence.trim(), `${lesson.slug}/${step.id} advances from its question to paired evidence`);
    assert.ok((await answerPanelText()).trim(), `${lesson.slug}/${step.id} keeps the linked answer beside evidence`);
    await previous();
    assert.equal((await evidencePanelText()).trim(), "",
      `${lesson.slug}/${step.id} backward navigation closes the paired evidence page`);
    assert.ok((await answerPanelText()).trim(), `${lesson.slug}/${step.id} backward navigation restores its answer`);
    if ((pairedIndex + 1) % 5 === 0) {
      console.log(`[sunum-web] Paired evidence sweep progress: ${pairedIndex + 1}/${pairedQuestionCases.length}`);
    }
  }

  await openStep("mektup", "s39-q1");
  await page.evaluate("document.startViewTransition = undefined");
  const fallbackPrompt = await page.evaluate(`(() => {
    document.querySelector('#dock [data-action=next]').click();
    const prompt = document.querySelector('#canvas .slide--qa-modern .qa-context > .prompt');
    return {
      apiUnavailable: typeof document.startViewTransition !== 'function',
      hasEnterClass: prompt?.classList.contains('qa-prompt-enter') ?? false,
      animationName: prompt ? getComputedStyle(prompt).animationName : null
    };
  })()`);
  assert.equal(fallbackPrompt.apiUnavailable, true, "fallback case disables the native API in the harness");
  assert.equal(fallbackPrompt.hasEnterClass, true, "API fallback adds the QA prompt enter class");
  assert.equal(fallbackPrompt.animationName, "qa-prompt-enter", "API fallback runs the prompt enter animation");

  await page.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await openStep("mektup", "s39-q1");
  await installQaTransitionProbe();
  await clearQaTransitionCalls();
  const reducedMotionPrompt = await page.evaluate(`(() => {
    document.querySelector('#dock [data-action=next]').click();
    const prompt = document.querySelector('#canvas .slide--qa-modern .qa-context > .prompt');
    return {
      matches: matchMedia('(prefers-reduced-motion: reduce)').matches,
      hasEnterClass: prompt?.classList.contains('qa-prompt-enter') ?? false,
      animationName: prompt ? getComputedStyle(prompt).animationName : null
    };
  })()`);
  assert.equal(reducedMotionPrompt.matches, true, "harness emulates prefers-reduced-motion: reduce");
  assert.equal(reducedMotionPrompt.hasEnterClass, false, "reduced motion does not add the fallback class");
  assert.equal(reducedMotionPrompt.animationName, "none", "reduced motion disables prompt animation");
  assert.equal((await qaTransitionCalls()).length, 0, "reduced motion does not start a view transition");
  await page.send("Emulation.setEmulatedMedia", { features: [] });

  // Verify visible focus stages at the three classroom viewport sizes. Vertical
  // scrolling is a supported long-content state, so only horizontal clipping and
  // a completely clipped stage are treated as failures.
  for (const [width, height] of [[1920, 1080], [1280, 800], [1366, 768]]) {
    await page.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
    await openStep("mektup", "s39-q1");
    await next(); // Vocabulary answer group
    const metrics = await qaViewportMetrics();
    assert.equal(metrics.width, width, `QA viewport width is ${width}`);
    assert.equal(metrics.height, height, `QA viewport height is ${height}`);
    assert.equal(metrics.horizontalOverflow, false, `QA stage has no horizontal clipping at ${width}×${height}`);
    assert.ok(metrics.focusText, `QA focus stage is populated at ${width}×${height}`);
    assert.equal(metrics.focusStageVisible, true, `QA focus stage intersects the visible body at ${width}×${height}`);
  }
  await page.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

  let screen = await openStep("mektup", "s40-q5");
  assert.ok(screen.text.includes("Çalışma kâğıdı 1/2"), "ISSUE-105: worksheet question remains on the same slide");
  await next(); // Düşünürken
  const topicAnswer = await next();
  assert.ok(topicAnswer.includes("Mehmet Kaplan'ın Âli'ye günlük hayatını"), "ISSUE-105: topic is the first structured response");
  assert.ok(!topicAnswer.includes("Yazar, dostuyla duygu ve düşüncelerini paylaşırken"), "ISSUE-105: main idea waits for its own advance");
  assert.equal(await page.evaluate("getComputedStyle(document.querySelector('#canvas .sections')).gridTemplateColumns.split(' ').length"), 1,
    "ISSUE-105: one response fills one column without an empty second column");
  const topicEvidence = await next();
  assert.ok(topicEvidence.includes("Mehmet Kaplan'ın Âli'ye günlük hayatını"), "ISSUE-105: answer remains visible beside its evidence");
  assert.ok(topicEvidence.includes("Bu roman bende yine roman yazmak arzusunu canlandırdı"), "ISSUE-105: topic evidence follows the topic");
  assert.ok(!topicEvidence.includes("Yazar, dostuyla duygu ve düşüncelerini paylaşırken"), "ISSUE-105: unrelated answer is not shown beside topic evidence");
  const mainIdeaAnswer = await next();
  assert.ok(mainIdeaAnswer.includes("Yazar, dostuyla duygu ve düşüncelerini paylaşırken"), "ISSUE-105: main idea opens after topic evidence");

  await page.send("Emulation.setDeviceMetricsOverride", { width: 800, height: 900, deviceScaleFactor: 1, mobile: false });
  const responsiveColumns = await page.evaluate(`(() => {
    const grid = document.createElement("div");
    grid.className = "sections";
    grid.style.setProperty("--cols", "2");
    for (const title of ["Benzerlikler", "Farklılıklar"]) {
      const card = document.createElement("article");
      card.className = "sec";
      card.textContent = title;
      grid.append(card);
    }
    document.body.append(grid);
    const columns = getComputedStyle(grid).gridTemplateColumns.split(" ").length;
    grid.remove();
    return columns;
  })()`);
  assert.equal(responsiveColumns, 1, "Related response cards stack into one column on narrow screens");
  await page.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

  const worksheet = findStep("mektup", "s40-q5");
  await page.send("Page.navigate", { url: `${root}/#/${worksheet.lesson.lesson_slug}/${worksheet.slide}/2/8` });
  const restoredQuestion = await until(async () => {
    const text = await bodyText();
    return text.includes("Çalışma kâğıdı 1/2") ? text : null;
  }, "ISSUE-105 legacy answer subpart restores to its question");
  assert.ok(!restoredQuestion.includes("Mehmet Kaplan'ın Âli'ye günlük hayatını"),
    "ISSUE-105: an old numeric subpart cannot restore to a different answer unit");

  const mektupLesson = lessons.find((entry) => entry.lesson_slug === "mektup");
  for (const fixture of [
    { id: "s39-q1", questionId: "T1-P39-Q01" },
    { id: "s39-q3", questionId: "T1-P39-Q03" }
  ]) {
    const entry = findStep("mektup", fixture.id);
    const catalogStep = builtCatalog.lessons.find((lesson) => lesson.slug === "mektup")
      ?.steps.find((step) => step.id === fixture.id);
    assert.ok(mektupLesson, "Mektup lesson is present in the canonical catalog");
    assert.ok(catalogStep, `${fixture.questionId} is present in the built presentation catalog`);
    assert.equal(catalogStep.layout, "vocabulary", `${fixture.questionId} keeps its canonical vocabulary layout`);
    assert.equal(usesModernQuestionLayout(catalogStep), true, `${fixture.questionId} enters QA-modern by semantic eligibility`);

    const opened = await openStep("mektup", fixture.id);
    assert.ok(opened.text.includes(entry.step.display_prompt), `${fixture.questionId} starts with its authored prompt`);
    let state = await qaState();
    assert.equal(state.modern, true, `${fixture.questionId} initial view uses the QA-modern shell`);
    assert.ok(state.badge.includes("SORU") && state.badge.includes(entry.step.answer.question_no),
      `${fixture.questionId} shows the large question design and numbered SORU badge`);
    assert.equal(state.focus.trim(), "", `${fixture.questionId} starts without answer content in the focus stage`);

    const sections = Object.entries(entry.step.answer.answer_sections);
    const expectedGroups = [];
    for (let index = 0; index < sections.length; index += 3) {
      expectedGroups.push(sections.slice(index, index + 3).map(([term]) => term));
    }
    assert.ok(expectedGroups.length >= 2, `${fixture.questionId} has multiple interleaved vocabulary groups`);
    const initialStage = await qaVocabularyStage("#canvas .slide--qa-modern .qa-context");
    assert.deepEqual(initialStage.terms, expectedGroups[0], `${fixture.questionId} first prompt group keeps its authored order`);
    assert.deepEqual(initialStage.termColors, ["rgb(23, 109, 104)", "rgb(83, 99, 167)", "rgb(154, 101, 15)"],
      `${fixture.questionId} keeps the existing teal/blue/gold vocabulary hierarchy inside QA-modern`);
    assert.equal(initialStage.hiddenMeanings, expectedGroups[0].length,
      `${fixture.questionId} first prompt group keeps meanings hidden`);
    assert.equal(initialStage.vocabCount, 1, `${fixture.questionId} uses the existing vocabulary card renderer`);
    const largePromptSize = initialStage.promptFontSize;

    await next();
    state = await qaState();
    assert.equal(state.modern, true, `${fixture.questionId} remains in QA-modern after advancing`);
    assert.ok(state.focus.trim(), `${fixture.questionId} answer appears in the focus stage`);
    const compactAnswerStage = await qaVocabularyStage("#canvas .slide--qa-modern .qa-focus");
    assert.deepEqual(compactAnswerStage.terms, expectedGroups[0],
      `${fixture.questionId} answer card group matches the initial vocabulary group`);
    assert.equal(compactAnswerStage.vocabCount, 1, `${fixture.questionId} answer stays in the vocabulary renderer`);
    assert.equal(compactAnswerStage.hiddenMeanings, 0,
      `${fixture.questionId} first answer group reveals its meanings`);
    assert.ok(compactAnswerStage.promptFontSize < largePromptSize,
      `${fixture.questionId} prompt compacts when the answer focus stage opens`);

    await previous();
    state = await qaState();
    assert.equal(state.modern, true, `${fixture.questionId} backward navigation restores the QA-modern shell`);
    assert.equal(state.focus.trim(), "", `${fixture.questionId} backward navigation restores the question-only stage`);
    const restoredPromptStage = await qaVocabularyStage("#canvas .slide--qa-modern .qa-context");
    assert.deepEqual(restoredPromptStage.terms, expectedGroups[0],
      `${fixture.questionId} backward navigation restores the first vocabulary group in order`);

    await next();
    for (let groupIndex = 1; groupIndex < expectedGroups.length; groupIndex += 1) {
      await next();
      state = await qaState();
      assert.equal(state.modern, true, `${fixture.questionId} group ${groupIndex + 1} stays in QA-modern`);
      assert.ok(state.focus.trim(), `${fixture.questionId} next interleave prompt remains in the focus stage`);
      const shownGroup = await qaVocabularyStage("#canvas .slide--qa-modern .qa-focus");
      assert.deepEqual(shownGroup.terms, expectedGroups[groupIndex],
        `${fixture.questionId} next prompt group ${groupIndex + 1} keeps its term order in focus`);
      assert.equal(shownGroup.hiddenMeanings, expectedGroups[groupIndex].length,
        `${fixture.questionId} next prompt group ${groupIndex + 1} keeps meanings hidden`);
      await next();
      state = await qaState();
      assert.ok(state.focus.trim(), `${fixture.questionId} next group answers remain in focus stage`);
      const answerGroup = await qaVocabularyStage("#canvas .slide--qa-modern .qa-focus");
      assert.deepEqual(answerGroup.terms, expectedGroups[groupIndex],
        `${fixture.questionId} answer group ${groupIndex + 1} keeps its interleaved order`);
      assert.equal(answerGroup.hiddenMeanings, 0,
        `${fixture.questionId} answer group ${groupIndex + 1} shows its meanings`);
    }
  }

  for (const fixture of [
    { slug: "mektup", id: "s42-reference", titles: ["Özel mektup", "Edebî mektup", "İş mektubu", "Resmî mektup"] },
    { slug: "mektup", id: "s46-q1", titles: ["Kitaptaki örnek ölçüt", "Yalınlık"] },
    { slug: "mektup", id: "s51-reference", titles: ["İşlevi", "Metnin düzeni", "Dil ve biçim"] },
    { slug: "biyografi-akif-194-198", id: "s194-two-biographies", titles: ["Tarık Buğra", "Âşık Veysel"] }
  ]) {
    screen = await openStep(fixture.slug, fixture.id);
    const seenTitles = new Set();
    for (let pageIndex = 0; pageIndex < fixture.titles.length + 1; pageIndex += 1) {
      for (const title of fixture.titles) if (screen.text.includes(title)) seenTitles.add(title);
      const renderedSections = await page.evaluate(`Array.from(document.querySelectorAll('#canvas .sections .sec')).map((section) => {
        const rect = section.getBoundingClientRect();
        return { text: section.innerText, width: rect.width, height: rect.height };
      })`);
      assert.ok(renderedSections.length > 0 && renderedSections.every((section) => section.width > 0 && section.height > 0),
        `${fixture.id} source sections are visible in Chrome page ${pageIndex + 1}`);
      assert.equal(await page.evaluate("document.querySelector('#canvas .slide__body')?.classList.contains('is-overflowing')"), false,
        `${fixture.id} source sections fit the slide body on page ${pageIndex + 1}`);
      if (fixture.titles.every((title) => seenTitles.has(title))) break;
      screen = { ...screen, text: await next() };
    }
    for (const title of fixture.titles) {
      assert.ok(seenTitles.has(title), `${fixture.id} renders its source-grounded ${title} section`);
    }
  }

  if (process.env.THEME1_ONLY !== "1") {
  screen = await openStep("karagoz", "s16-q1");
  assert.ok(screen.text.includes("tiplerin adlarını"));
  assert.equal(await page.evaluate("document.querySelector('#canvas .content-images img')?.naturalWidth > 100"), true, "ISSUE-002 source illustration renders in Chrome");
  assert.ok(screen.text.includes("Ders kitabı, basılı s.16"));
  assert.ok(!screen.text.includes("Beberuhi") && !screen.text.includes("Çelebi") && !screen.text.includes("Zenne"), "ISSUE-002 type names are hidden on the question slide");
  const karagozAnswer = await next();
  assert.ok(["Beberuhi", "Çelebi", "Zenne"].every((name) => karagozAnswer.includes(name)), "ISSUE-002 type names appear on the next answer slide");

  screen = await openStep("mektup", "s46-q4");
  let poemExcerptSeen = screen.text.includes("Hasret sana ey yirmi yılın");
  let poemSourceSeen = await page.evaluate("Array.from(document.querySelectorAll('#canvas .source-links a')).some(a => a.href.includes('#page=46'))");
  for (let i = 0; i < 6 && !(poemExcerptSeen && poemSourceSeen); i += 1) {
    const text = await next();
    poemExcerptSeen ||= text.includes("Hasret sana ey yirmi yılın");
    poemSourceSeen ||= await page.evaluate("Array.from(document.querySelectorAll('#canvas .source-links a')).some(a => a.href.includes('#page=46'))");
  }
  assert.ok(poemExcerptSeen, "ISSUE-013 poem excerpt is visible across the paginated writing task");
  assert.ok(poemSourceSeen, "ISSUE-013 textbook PDF link remains available across the paginated writing task");

  for (const id of ["s48-q1", "s48-q2", "s48-q3"]) {
    screen = await openStep("mektup", id);
    assert.ok(screen.text.includes("Ders kitabı s.48"), `ISSUE-015 ${id} has a usable source link`);
    if (id === "s48-q1") assert.ok(screen.text.includes("103 yıl sonra"), "both article contexts are visible");
  }
  for (const id of ["s50-q1", "s50-q2", "s50-q3", "s50-q4"]) {
    screen = await openStep("mektup", id);
    assert.ok(screen.text.includes("beş kaynak metnin tam sayfalarını aç"), `ISSUE-017 ${id} exposes all five source texts`);
  }

  screen = await openStep("tema-2-girisi", "s88-q4");
  assert.ok(screen.text.includes("doğuştan beri geçen ve yıl birimiyle ölçülen zaman"), "ISSUE-027 meaning is on the question screen");

  for (const id of ["s90-q1", "s90-q2"]) {
    screen = await openStep("ogulla-bulusma", id);
    assert.equal(await page.evaluate("document.querySelector('#canvas .content-images img')?.naturalWidth > 100"), true, `ISSUE-028 ${id} shows the verified train image`);
    assert.ok(screen.text.includes("s.93’deki tren ve manzara"));
    const answer = (await next()).toLocaleLowerCase("tr");
    assert.ok(!answer.includes("görseldeki atlı yaşlı kişi"));
  }

  screen = await openStep("ogulla-bulusma", "s90-strategy");
  assert.ok(!screen.text.includes("Göz Gezdirme") && !screen.text.includes("işaretleyerek okuma"), "ISSUE-029 strategy does not leak into first view");
  assert.ok((await next()).includes("Göz Gezdirme"), "strategy is available after a click");

  screen = await openStep("ogulla-bulusma", "s95-q1");
  assert.deepEqual(await terms(screen.text), ["Yular", "Üzengi", "Katar"], "ISSUE-030 starts with the first three terms only");
  await revealDictionaryGroup(["Yular", "Üzengi", "Katar"], ["Kampana", "Hat", "Toynak"], "başlarına takılan ipli veya kayışlı başlık", "istasyonun çaldığı çan");

  screen = await openStep("eski-istanbul", "s111-q1");
  await revealDictionaryGroup(["hilye", "rahle"], ["cüz kesesi", "sebilci"], "Hz. Muhammed’in fiziksel özelliklerini", "Âmin alayında cüzü taşımak");

  screen = await openStep("eski-istanbul", "s111-q3");
  const oldIstanbulFirstGroup = await terms(screen.text);
  assert.ok(["sebilci", "saka"].every((term) => oldIstanbulFirstGroup.includes(term)),
    "Theme 2 vocabulary prompt starts with the authored first group");
  assert.ok(!includesText(screen.text, "meşin tulumbalar içindeki suyu"),
    "Theme 2 vocabulary meanings remain hidden on the initial question");
  const oldIstanbulThinking = await next();
  assert.ok(oldIstanbulThinking.includes("Düşünürken"),
    "Theme 2's authored thinking layer precedes dictionary reveals");
  assert.ok(!includesText(oldIstanbulThinking, "meşin tulumbalar içindeki suyu"),
    "The thinking reveal does not open dictionary meanings early");
  const oldIstanbulFirstAnswer = await next();
  assert.ok(includesText(oldIstanbulFirstAnswer, "meşin tulumbalar içindeki suyu"),
    "The first vocabulary group meaning opens after the thinking layer");
  const oldIstanbulAnswerTerms = await terms(oldIstanbulFirstAnswer);
  assert.ok(!["lîka", "rîh"].some((term) => oldIstanbulAnswerTerms.includes(term)),
    "The second vocabulary group remains separate");
  const oldIstanbulNextPrompt = await next();
  const oldIstanbulNextPromptTerms = await terms(oldIstanbulNextPrompt);
  assert.ok(["lîka", "rîh"].every((term) => oldIstanbulNextPromptTerms.includes(term)),
    "The next vocabulary prompt appears after the first group answer");
  assert.ok(!includesText(oldIstanbulNextPrompt, "ham ipek"),
    "The next vocabulary meaning stays hidden until its answer reveal");
  assert.ok(includesText(await next(), "ham ipek"),
    "The next vocabulary meaning opens on its own answer reveal");

  screen = await openStep("orhun-abideleri", "s116-vocabulary");
  assert.deepEqual(await terms(screen.text), ["ecdat", "il", "yağız"], "ISSUE-033 starts with the first three terms only");
  await revealDictionaryGroup(["ecdat", "il", "yağız"], ["kılmak", "töre", "şad"], "Geçmişteki büyükler, atalar", "Etmek, yapmak");

  screen = await openStep("divanu-lugatit-turk", "s127-q7");
  assert.ok(!screen.text.includes("Kapsamı Belirleme") && !screen.text.includes("Veri Toplama"), "ISSUE-034 research plan is hidden on first view");
  assert.ok((await next()).includes("Kapsamı Belirleme"), "research plan opens after a click");

  screen = await openStep("asik-atismasi", "s140-vocabulary");
  await revealDictionaryGroup(["çağ", "kahır"], ["canan", "saban"], "Zaman dilimlerinden her biri", "Gönülden sevilen");

  screen = await openStep("tema-2-degerlendirme", "s155-q1");
  assert.ok(screen.text.includes("yuyka / kalın; yinçge / yoğun"));
  assert.ok(!screen.text.includes("Birlik ve dayanışma") && !screen.text.includes("Emek ve çalışma"), "ISSUE-036 comments are absent on first view");
  const answer = await next();
  assert.ok(answer.includes("Emek ve çalışma") && !answer.includes("Birlik ve dayanışma"),
    "ISSUE-036 response categories open before their source evidence");
  const answerEvidence = await advanceUntilEvidenceSection("Birlik ve dayanışma", "ISSUE-036 source evidence");
  assert.ok(answerEvidence.includes("Birlik ve dayanışma") && includesText(answerEvidence, "yufka kalın olsa delmesi zormuş"),
    "ISSUE-036 source-backed comments open after all linked response pages");
  assert.ok((await answerPanelText()).trim(), "ISSUE-036 paired response remains visible with its evidence");

  screen = await openStep("tema-3-girisi", "s161-theme-presentation");
  assert.ok(screen.text.includes("Nerde görsen gönlü kırık"), "ISSUE-037 Yesevî source remains visible");
  assert.ok(!/karekodunu.*açın|erişilemiyorsa|üzerinden devam edin/i.test(screen.text), "ISSUE-037 operator directions stay out of student view");
  screen = await openStep("tema-3-girisi", "s163-q5");
  assert.ok(!screen.text.includes("Sesli yayın, dinleme") && !screen.text.includes("Sorular, yanıtlar"), "ISSUE-039 answer is hidden initially");
  assert.ok((await next()).includes("Sesli yayın, dinleme"), "ISSUE-039 answer opens after advance");
  screen = await openStep("tema-3-girisi", "s163-q6");
  assert.ok(!screen.text.includes("edebiyatçı hakkında bilgi verir"), "ISSUE-040 comparison is hidden initially");
  const comparisonThinking = await next();
  assert.ok(comparisonThinking.includes("Düşünürken") && !comparisonThinking.includes("edebiyatçı hakkında bilgi verir"),
    "ISSUE-040 thinking prompt precedes the comparison answer");
  const comparisonAnswer = await next();
  assert.ok(comparisonAnswer.includes("edebiyatçı hakkında bilgi verir"), "ISSUE-040 comparison opens after thinking");

  screen = await openStep("huzur-okuma", "s166-meaning");
  assert.ok(!screen.text.includes("bedendeki bölgeyi"), "ISSUE-042 word example is hidden initially");
  assert.ok((await next()).includes("UYGULAMA DESTEĞİ"), "ISSUE-042 answer opens after advance");
  screen = await openStep("huzur-177-178", "s177-q14");
  assert.ok(!screen.text.includes("Açık iletiler"), "ISSUE-043 message examples are hidden initially");
  const messageThinking = await next();
  assert.ok(messageThinking.includes("Düşünürken") && !messageThinking.includes("Açık iletiler"),
    "ISSUE-043 authored thinking prompt precedes the message answer");
  assert.ok((await next()).includes("CEVAP"), "ISSUE-043 answer opens after thinking");
  screen = await openStep("huzur-177-178", "s178-huzur-content");
  assert.ok(!screen.text.includes("Mümtaz ve Nuran üzerinden İstanbul"), "ISSUE-043 comparison model is hidden initially");
  assert.ok((await next()).includes("UYGULAMA DESTEĞİ"), "ISSUE-043 comparison answer opens after advance");
  screen = await openStep("huzur-okuma-cemberi-179-181", "s180-mumtaz-nuran");
  assert.ok(!screen.text.includes("Yeni hayatı kültür ve kimlik"), "ISSUE-044 person comparison is hidden initially");
  assert.ok((await next()).includes("UYGULAMA DESTEĞİ"), "ISSUE-044 answer opens after advance");
  screen = await openStep("huzur-hayat-kurmaca-182-185", "s184-halk");
  assert.ok(!screen.text.includes("düşünce konusu değil"), "ISSUE-045 analysis is hidden initially");
  assert.ok((await next()).includes("UYGULAMA DESTEĞİ"), "ISSUE-045 answer opens after advance");

  screen = await openStep("huzur-okuma", "s165-166-fark");
  assert.ok(screen.text.includes("huzur") && screen.text.includes("rüya") && !screen.text.includes("saz"), "ISSUE-041 starts with the first group only");
  let t3Reveal = await next();
  assert.ok(t3Reveal.includes("Yoğun bir günün ardından") && !t3Reveal.includes("boğaz"), "ISSUE-041 first group answer precedes later terms");
  t3Reveal = await next();
  assert.ok(t3Reveal.includes("saz") && t3Reveal.includes("boğaz"), "ISSUE-041 second group follows first answer");

  const captureVocabularyGroups = async (width) => {
    await page.send("Emulation.setDeviceMetricsOverride", {
      width, height: 900, deviceScaleFactor: 1, mobile: width <= 600
    });
    screen = await openStep("huzur-okuma", "s172-vocabulary");
    const initial = await terms(screen.text);
    await next();
    const firstAnswerText = await bodyText();
    const firstAnswer = await terms(firstAnswerText);
    const nextPromptText = await advanceUntil(
      (text) => ["yeis", "zarafet", "neşretmek"].every((term) => includesText(text, term)),
      "s172 next vocabulary group"
    );
    const nextPrompt = await terms(nextPromptText);
    return { initial, firstAnswer, nextPrompt };
  };
  const wideVocabularyGroups = await captureVocabularyGroups(1440);
  const narrowVocabularyGroups = await captureVocabularyGroups(390);
  assert.deepEqual(narrowVocabularyGroups, wideVocabularyGroups,
    "Vocabulary group membership is stable between desktop and narrow viewports");
  await page.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  screen = await openStep("huzur-okuma", "s172-vocabulary");
  await revealDictionaryGroup(["mustarip (muzdarip)", "mahzen", "cevher"], ["yeis", "zarafet", "neşretmek"], "acı/sıkıntı çeken", "umutsuzluk");
  await next();
  const thirdGroupPrompt = await bodyText();
  assert.ok(["hulâsa (hülasa)", "muazzam", "cins"].every(term => includesText(thirdGroupPrompt, term)), "ISSUE-068 third group opens after second group's answer");
  await next();
  assert.ok(includesText(await bodyText(), "özetle"), "ISSUE-068 third group meanings follow its prompt");

  screen = await openStep("direnisin-ustalari-215-220", "s217-vocabulary");
  assert.ok(!screen.text.includes("Öğretmen için kaynak ve değerlendirme notu"), "Teacher-only content.note is absent from student projection");
  await revealDictionaryGroup(["direniş", "ihbar", "torna"], ["kafa yormak", "haber uçurmak"], "QR medya gerekli", "QR medya gerekli");

  screen = await openStep("huzur-hayat-kurmaca-182-185", "s184-185-value-q2");
  assert.ok(!screen.text.includes("Halkı sevdiğini söylemek ile"), "ISSUE-046 answers stay out of the task view");
  const valueThinking = await next();
  assert.ok(valueThinking.includes("Düşünürken") && !valueThinking.includes("insanı yalnız bir fikir"),
    "ISSUE-046 thinking prompt precedes the four-part answer");
  t3Reveal = await next();
  assert.ok(t3Reveal.includes("insanı yalnız bir fikir") && !t3Reveal.includes("tarihî-kültürel köklerden") && !t3Reveal.includes("serçelere"),
    `ISSUE-046 first answer does not summarize later parts: ${t3Reveal}`);

  screen = await openStep("huzur-catisma-dil-189-191", "s189-one");
  assert.ok(!screen.text.includes("Gündelik hayatın ortasında"), "ISSUE-048 conflict model is hidden initially");
  assert.ok((await next()).includes("UYGULAMA DESTEĞİ"), "ISSUE-048 answer opens after advance");
  screen = await openStep("huzur-catisma-dil-189-191", "s190-words");
  assert.ok(!screen.text.includes("Bugün de kullanılan"), "ISSUE-049 language examples are hidden initially");
  assert.ok((await next()).includes("UYGULAMA DESTEĞİ"), "ISSUE-049 answer opens after advance");
  screen = await openStep("huzur-catisma-dil-189-191", "s190-gram-a");
  assert.ok(!screen.text.includes("Yüklem isim soyludur"), "ISSUE-050 grammar analysis is hidden initially");
  assert.ok((await next()).includes("UYGULAMA DESTEĞİ"), "ISSUE-050 answer opens after advance");
  screen = await openStep("huzur-degerlendirme-192-193", "s192-values");
  assert.ok(!screen.text.includes("Millî: tarihî şehir"), "ISSUE-051 worksheet answer is hidden initially");
  assert.ok((await next()).includes("UYGULAMA DESTEĞİ"), "ISSUE-051 answer opens after advance");
  screen = await openStep("huzur-degerlendirme-192-193", "s192-structure");
  assert.ok(!screen.text.includes("Tarihî İstanbul semtleri kültürel hafızayı"), "ISSUE-051 structure example is hidden initially");
  assert.ok((await next()).includes("UYGULAMA DESTEĞİ"), "ISSUE-051 structure example opens after advance");
  screen = await openStep("biyografi-akif-194-198", "s194-tarik");
  assert.ok(!screen.text.includes("meslek yaşamında somut sonuç"), "ISSUE-052 biography inference is hidden initially");
  assert.ok((await next()).includes("UYGULAMA DESTEĞİ"), "ISSUE-052 answer opens after advance");
  screen = await openStep("biyografi-akif-194-198", "s196-anthem");
  assert.ok(!screen.text.includes("Yarışma ilanı →"), "ISSUE-053 chronology is hidden initially");
  assert.ok((await next()).includes("UYGULAMA DESTEĞİ"), "ISSUE-053 answer opens after advance");
  screen = await openStep("biyografi-akif-anlama-199-201", "s201-content");
  assert.ok(!screen.text.includes("Sanatçının hayatı ve eserleri"), "ISSUE-054 worksheet solution is hidden initially");
  const worksheetThinking = await next();
  assert.ok(worksheetThinking.includes("Düşünürken") && !worksheetThinking.includes("Sanatçının hayatı ve eserleri"),
    "ISSUE-054 thinking prompt precedes the worksheet solution");
  assert.ok((await next()).includes("UYGULAMA DESTEĞİ"), "ISSUE-054 answer opens after thinking");
  screen = await openStep("biyografi-akif-cozumleme-202-205", "s204-q1-second");
  assert.ok(!screen.text.includes("Kişi, olay, mekân ve zaman kurmaca"), "ISSUE-055 comparison groups are hidden initially");
  assert.ok((await next()).includes("UYGULAMA DESTEĞİ"), "ISSUE-055 answer opens after advance");
  screen = await openStep("biyografi-akif-cozumleme-202-205", "s205-q1-chronology");
  assert.ok(!screen.text.includes("Millî Mücadele ve İstiklâl Marşı"), "ISSUE-055 chronology is hidden initially");
  assert.ok((await next()).includes("UYGULAMA DESTEĞİ"), "ISSUE-055 chronology answer opens after advance");
  screen = await openStep("biyografi-akif-cozumleme-202-205", "s205-asim-q1");
  assert.ok(screen.text.includes("KAAN ve TCG Anadolu") && screen.text.includes("Göktürk-1 ve BİLSAT"), "ISSUE-056 source captions remain visible");
  assert.ok(!screen.text.includes("Güven güçlenerek sürüyor") && !screen.text.includes("çalışma ve sorumluluk"), "ISSUE-056 conclusion stays out of the task view");
  const modelThinking = await next();
  assert.ok(modelThinking.includes("Düşünürken") && !modelThinking.includes("Güven güçlenerek sürüyor"),
    "ISSUE-056 authored thinking prompt precedes the interpretation");
  assert.ok((await next()).includes("UYGULAMA DESTEĞİ"), "ISSUE-056 model interpretation opens after thinking");

  screen = await openStep("kemal-tahir-mulakat-210-214", "s214-q1");
  assert.ok(!screen.text.includes("İstanbul’u, musikiyi") && !screen.text.includes("Yeni bir hayat kurmak"), "ISSUE-057 both model messages are hidden initially");
  t3Reveal = await next();
  assert.ok(t3Reveal.includes("Düşünürken") && !t3Reveal.includes("İstanbul’u, musikiyi"),
    "ISSUE-057 thinking prompt precedes the explicit-message answer");
  t3Reveal = await next();
  assert.ok(t3Reveal.includes("İstanbul") && !t3Reveal.includes("Yeni bir hayat kurmak"), "ISSUE-057 explicit message opens first");
  t3Reveal = await next();
  assert.ok(t3Reveal.includes("Açık iletinin dayanağı") && (await answerPanelText()).trim(),
    "ISSUE-057 the explicit answer remains paired with its later evidence");
  t3Reveal = await next();
  assert.ok(t3Reveal.includes("Örtük ileti") && !t3Reveal.includes("Yeni bir hayat kurmak"), "ISSUE-057 implicit-message prompt precedes its answer");
  assert.ok((await next()).includes("Yeni bir hayat kurmak"), "ISSUE-057 implicit message opens after its prompt");
  screen = await openStep("kemal-tahir-mulakat-210-214", "s214-eval");
  assert.ok(["Evet", "Kısmen", "Hayır"].every(label => screen.text.includes(label)), "ISSUE-058 three labels render");
  const peerScaleRows = await page.evaluate("[...document.querySelectorAll('#canvas .scale-form__row')].map(row => row.querySelectorAll('.scale-form__box').length)");
  assert.ok(peerScaleRows.length > 0 && peerScaleRows.every((count) => count === 3),
    "ISSUE-058 each visible peer-review row contains all three empty choices (content may span presentation pages)");

  screen = await openStep("radyo-diyalog-yazma-225-229", "s225-reference");
  assert.ok(!screen.text.includes("Kişiler ve çatışmalar") && !screen.text.includes("Müzik ve efekt"), "ISSUE-061 type answers hidden initially");
  t3Reveal = await next();
  assert.ok(t3Reveal.includes("Kişiler ve çatışmalar") && !t3Reveal.includes("Müzik ve efekt"),
    "ISSUE-061 the first type answer opens independently");
  assert.ok((await next()).includes("Müzik ve efekt"), "ISSUE-061 the second type answer opens on its own advance");
  screen = await openStep("degerlendirme-230-235", "s233-q11");
  assert.ok(!screen.text.includes("özellikle Tarafsızlık ve Kronoloji") && !screen.text.includes("hataları düzeltin"), "ISSUE-062 avoids naming the answer in the task");
  screen = await openStep("degerlendirme-230-235", "s235-q16");
  assert.ok(!screen.text.includes("Doğru cevap: C"), "ISSUE-064 answer stays hidden initially");
  const classificationThinking = await next();
  assert.ok(classificationThinking.includes("Düşünürken") && !classificationThinking.includes("Uygun."),
    "ISSUE-064 the authored thinking prompt precedes source classifications");
  const classificationResults = [];
  for (let index = 0; index < 5; index += 1) classificationResults.push(await next());
  const classificationMarkers = ["Şem’î’nin mahlası", "Kurmaca bir roman kişisinin yaşantısı",
    "Kurmaca bir roman kişisinin iç dünyasını", "Anlatıcı kendi Ankara hayatından", "Çakerî’nin mahlası"];
  classificationResults.forEach((text, index) => {
    assert.ok(text.includes(classificationMarkers[index]), `ISSUE-064 classification ${index + 1} opens in order`);
    assert.ok(classificationMarkers.every((marker, markerIndex) => markerIndex === index || !text.includes(marker)),
      `ISSUE-064 classification ${index + 1} opens independently`);
  });

  for (const [stepId, phrase] of [["s169-reading", "Musiki, tarih ve şehir mirasını"], ["s170-reading", "Mümtaz’ın geçmiş ve kültür bağında"], ["s171-author", "Yahya Kemal–Ahmet Haşim"], ["s173-types-1", "Başkasının yaşamı"], ["s173-types-2", "Hareket ve merak"], ["s174-types-1", "Dönemini yansıtan"], ["s174-types-2", "Bireyin iç dünyası"]]) {
    screen = await openStep("huzur-okuma", stepId);
    assert.ok(!screen.text.includes(phrase), `ISSUE-065–073 ${stepId} answer hidden initially`);
    assert.ok((await next()).includes(phrase), `ISSUE-065–073 ${stepId} answer opens after advance`);
  }
  screen = await openStep("huzur-okuma", "s174-style");
  assert.ok(!screen.text.includes("betimleyici"), "ISSUE-073 style examples hidden initially");
  assert.ok((await next()).includes("betimleyici"), "ISSUE-073 style examples open after advance");

  screen = await openStep("tema-girisi-236-242", "s236-map");
  assert.ok(!screen.text.includes("Ben, Mimar Sinan") && !screen.text.includes("Anadolu İnsanı") &&
    !screen.text.includes("Okuma") && !screen.text.includes("Dinleme / İzleme") && !screen.text.includes("Konuşma ve yazma"),
  "ISSUE-074 answer map and skill labels are hidden initially");
  assert.ok((await advanceUntil((text) => text.includes("Ben, Mimar Sinan"), "s236 answer map")).includes("Ben, Mimar Sinan"), "ISSUE-074 skill map opens after the task");
  screen = await openStep("tema-girisi-236-242", "s240-fact-fiction");
  assert.ok(!screen.text.includes("Kaynağın verdiği tarihî") && !screen.text.includes("Kurduğunuz hayalî metin"), "ISSUE-076 classification result is hidden initially");
  assert.ok((await advanceUntil((text) => text.includes("Kaynağın verdiği tarihî"), "s240 classification answer")).includes("Kaynağın verdiği tarihî"), "ISSUE-076 classification result opens after the task");
  screen = await openStep("tema-girisi-236-242", "s237-threshold");
  assert.ok(!/karekodunu.*bu aşamada açın/i.test(screen.text), "ISSUE-075 QR operation stays out of the student view");

  screen = await openStep("ben-mimar-sinan-okuma-243-250", "s247-vocab");
  await revealDictionaryGroup(
    ["çağdaş", "özge", "görkemli"], ["şevk", "avaze", "sadr-ı âzam"],
    "Aynı dönemde yaşayan", "Bir işi yapma isteği",
    (text) => {
      assert.ok(text.includes("Karekodla sözlükten doğrulama yapılırken sözcüğün bu bağlamdaki anlamı esas alınabilir."),
        "T4-P247-VOC01 keeps its exact context fragment with the first vocabulary group");
      assert.ok(!text.includes("Aşağıdaki karşılıklar metindeki kullanıma göre verilmiştir."),
        "T4-P247-VOC01 does not repeat the complete answer summary");
    }
  );
  screen = await openStep("ben-mimar-sinan-okuma-243-250", "s250-social-table");
  assert.ok(!screen.text.includes("Osmanlı dönemindeki askerî eğitim"), "ISSUE-078 first social-expression answer is hidden initially");
  assert.ok((await advanceUntil((text) => text.includes("Osmanlı dönemindeki askerî eğitim"), "s250 first answer")).includes("Osmanlı dönemindeki askerî eğitim"), "ISSUE-078 first social-expression group opens after the task");
  screen = await openStep("ben-mimar-sinan-okuma-243-250", "s250-social-table-rest");
  assert.ok(!screen.text.includes("Dönemin aydınlatma koşulları"), "ISSUE-078 remaining social-expression answer is hidden initially");
  assert.ok((await advanceUntil((text) => text.includes("Dönemin aydınlatma koşulları"), "s250 remaining answer")).includes("Dönemin aydınlatma koşulları"), "ISSUE-078 remaining social-expression group opens after the task");

  screen = await openStep("ben-mimar-sinan-cozumleme-256-259", "s256-elements");
  assert.ok(screen.text.includes("Kişiler") && screen.text.includes("Dramatik örgü"), "ISSUE-079 first structure group is visible");
  assert.ok(!screen.text.includes("Sinan merkezî kişidir"), "ISSUE-079 first structure answers stay hidden initially");
  let structureAnswer = await next();
  assert.ok(structureAnswer.includes("Sinan merkezî kişidir"));
  structureAnswer = await advanceUntil((text) => text.includes("Mekân ve zaman"), "s256 relation prompt");
  assert.ok(structureAnswer.includes("Mekân ve zaman"), "ISSUE-079 relation group follows the first answer group");
  screen = await openStep("ben-mimar-sinan-cozumleme-256-259", "s258-q2");
  assert.ok(!screen.text.includes("Sinan'ın düşünce") && !screen.text.includes("Görev, beklenti") &&
    !screen.text.includes("Monoloğun işlevi") && !screen.text.includes("Diyaloğun işlevi"),
  "ISSUE-080 monologue/dialogue answers are hidden initially");
  assert.ok((await next()).includes("Monolog"), "ISSUE-080 answer opens after the task");
  screen = await openStep("ben-mimar-sinan-cozumleme-256-259", "s258-grammar");
  assert.ok(!screen.text.includes("Kendisini ... bilmiyordu"), "ISSUE-081 classification task is not reversed");
  screen = await openStep("ben-mimar-sinan-cozumleme-256-259", "s258-grammar-apply");
  assert.ok(screen.text.includes("Kendisini ... bilmiyordu") && !screen.text.includes("isim"), "ISSUE-081 classification task starts before the answer");
  assert.ok((await advanceUntil((text) => text.includes("Ama nasıl?"), "s258 six-sentence task")).includes("Ama nasıl?"), "ISSUE-081 all six sentences are shown before the answer");
  assert.ok((await advanceUntil((text) => text.includes("Fiil cümlesi"), "s258 sentence classifications")).includes("Fiil cümlesi"),
    "ISSUE-081 classifications open after the six-sentence task");

  screen = await openStep("merdiven-anlama-266-270", "s266-vocabulary");
  await revealDictionaryGroup(
    ["daire", "yeni yetme", "kanı(mca)"], ["yol vermek", "gereksinme", "duralamak"],
    "büro veya kurum birimi", "geçebilmesi için yol açmak",
    (text) => {
      assert.ok(text.includes("Önerilen karşılıklar anlamı koruyabilse de özellikle “yeni yetme” gibi ifadelerde anlatımın tonunu değiştirebilir."),
        "T4-P266-VOC01 appends its source fragment to the matching answer group");
      assert.ok(!text.includes("Öyküdeki altı kelime/kelime grubunun bağlamsal anlamları"),
        "T4-P266-VOC01 keeps the aggregate summary out of the first group");
    }
  );
  screen = await openStep("merdiven-cozumleme-274-279", "s275-q2a");
  assert.ok(!screen.text.includes("Merdivenin yerini") && !screen.text.includes("Mimari") &&
    !screen.text.includes("Teknoloji") && !screen.text.includes("Korunabilecek tema"),
  "ISSUE-083 comparison examples and answer directions are hidden initially");
  assert.ok((await advanceUntil((text) => text.includes("asansör"), "s275 comparison answer")).includes("asansör"), "ISSUE-083 comparison answer opens after the task");
  screen = await openStep("merdiven-cozumleme-274-279", "s276-conflicts");
  assert.ok(!screen.text.includes("Yükselme/acele") && !screen.text.includes("İhtiyarın deneyimi"), "ISSUE-084 conflict answers are hidden initially");
  assert.ok((await next()).includes("Anlatıcının iş telaşı"), "ISSUE-084 conflict answer opens after the task");
  screen = await openStep("merdiven-cozumleme-274-279", "s277-whatif");
  assert.ok(!screen.text.includes("Yaşlı adamın iyi dileğini"), "ISSUE-085 counterfactual answers are not shown before the question");
  assert.ok((await next()).includes("Yaşlı adamın iyi dileğini"), "ISSUE-085 counterfactual answers open once in the follow-up task");
  screen = await openStep("anadolu-insani-284-290", "s287-vocab");
  await revealDictionaryGroup(
    ["fedakârlık", "hemzemin geçit", "mesai"], ["aksaklık", "tahammül"],
    "kendi çıkarından", "olağan biçimde ilerlemesini bozan",
    (text) => {
      assert.ok(text.includes("videodaki kesin bağlamı kontrol etmek için karekod içeriği ve sözlük adımı birlikte kullanılmalıdır."),
        "T4-P287-VOC01 retains the context warning with its linked term group");
      assert.ok(!text.includes("Aşağıdaki anlamlar sözcüklerin genel kullanımına göredir"),
        "T4-P287-VOC01 does not reveal the full summary early");
    }
  );
  screen = await openStep("merdiven-cozumleme-274-279", "s278-disciplines");
  assert.ok(screen.text.includes("Kurumda yaş/konum ilişkileri") && !screen.text.includes("Kuşak değişimi") &&
    !screen.text.includes("Sosyoloji, psikoloji"), "ISSUE-086 group 1 task is visible without group 2 or answers");
  assert.ok((await advanceUntil((text) => text.includes("Sosyoloji, psikoloji"), "s278 group 1 answer")).includes("Sosyoloji, psikoloji"), "ISSUE-086 group 1 answers open before group 2");
  const disciplineGroup2 = await advanceUntil((text) => text.includes("Anlatıcının kuşak değişimiyle yüzleşmesi"), "s278 group 2 prompt");
  assert.ok(disciplineGroup2.includes("Anlatıcının kuşak değişimiyle yüzleşmesi"));
  screen = await openStep("merdiven-cozumleme-274-279", "s279-q1");
  assert.ok(screen.text.includes("Varoluşçu tema") && !screen.text.includes("Simgeler") &&
    !screen.text.includes("Anlatıcının aceleyle işini görme alışkanlığı"), "ISSUE-087 group 1 task is visible without group 2 or answers");
  assert.ok((await advanceUntil((text) => text.includes("Anlatıcının aceleyle işini görme alışkanlığı"), "s279 group 1 answer")).includes("Anlatıcının aceleyle işini görme alışkanlığı"), "ISSUE-087 group 1 answers open before group 2");

  screen = await openStep("tiyatro-canlandirma-280-283", "s280-q2");
  assert.ok(!screen.text.includes("Karakterin amacı ve ilişkileri") && !screen.text.includes("Ses tonu, vurgu"), "ISSUE-089 role dimensions are hidden initially");
  assert.ok((await next()).includes("Karakterin amacı ve ilişkileri"), "ISSUE-089 role dimensions open after the task");
  screen = await openStep("tiyatro-canlandirma-280-283", "s280-subtext");
  assert.ok(!screen.text.includes("Metinde doğrudan duyulan"), "ISSUE-090 definitions are hidden initially");
  assert.ok((await advanceUntil((text) => text.includes("Metinde doğrudan duyulan"), "s280 definitions answer")).includes("Metinde doğrudan duyulan"), "ISSUE-090 definitions open after the task");
  screen = await openStep("anadolu-insani-cozumleme-291-297", "s295-q7");
  assert.ok(!screen.text.includes("göndergesel") && !screen.text.includes("heyecana bağlı"), "ISSUE-092 textbook function terms are hidden initially");
  assert.ok((await next()).includes("Göndergesel"), "ISSUE-092 textbook function terms open after the task");
  screen = await openStep("anadolu-insani-cozumleme-291-297", "s297-next");
  assert.ok(!screen.text.includes("olgu ile yorumu"), "ISSUE-093 example target is hidden initially");
  assert.ok((await advanceUntil((text) => text.toLocaleLowerCase("tr").includes("uygulanabilir hedef"), "s297 target support", 24)).includes("uygulanabilir hedef"), "ISSUE-093 target support opens after the task");
  screen = await openStep("afis-atolyesi-298-302", "s302-next");
  assert.ok(!screen.text.includes("ana iletiyi tasarımdan") && !screen.text.includes("3 kısa mesaj"), "ISSUE-094 example target is hidden initially");
  assert.ok((await advanceUntil((text) => text.toLocaleLowerCase("tr").includes("gözlenebilir hedef"), "s302 target support", 24)).includes("gözlenebilir hedef"), "ISSUE-094 target support opens after the task");

  screen = await openStep("degerlendirme-303-307", "s303-reading");
  assert.ok(!screen.text.includes("Hitap, dinî söyleyiş") && !screen.text.includes("şehitlik"), "ISSUE-096 answer examples are absent from the reading card");
  screen = await openStep("degerlendirme-303-307", "s304-q4");
  assert.ok(!screen.text.includes("Umut, sevgi, güven, merhamet"), "ISSUE-097 answer candidates are hidden initially");
  assert.ok((await advanceUntil((text) => text.includes("Örnek duygu"), "s304 example emotion")).includes("Örnek duygu"),
    "ISSUE-097 example emotion opens after the task");
  screen = await openStep("degerlendirme-303-307", "s305-q5");
  assert.equal(await page.evaluate("document.querySelectorAll('#canvas .content-images img').length"), 4, "ISSUE-098 four source images render");
  assert.equal(await page.evaluate("Array.from(document.querySelectorAll('#canvas .content-images img')).every(image => image.naturalWidth > 100)"), true, "ISSUE-098 all source images load");
  screen = await openStep("degerlendirme-303-307", "s307-q11");
  screen = await advanceUntil((text) => text.includes("A) Televizyon") && text.includes("E) İnternet"), "ISSUE-099 answer choices before answer", 4);
  assert.ok(screen.includes("Elif, yaptığı araştırmalar") && screen.includes("A) Televizyon") && screen.includes("E) İnternet"), "ISSUE-099 full question and choices are visible before the answer");
  assert.ok(!screen.includes("Doğru seçenek: B"), "ISSUE-099 correct option is hidden initially");
  assert.ok((await advanceUntil((text) => text.includes("Doğru seçenek: B"), "s307 correct option")).includes("Doğru seçenek: B"),
    "ISSUE-099 correct option opens after the task");
  screen = await openStep("degerlendirme-303-307", "s307-q12");
  assert.ok(!screen.text.includes("Dijital üretim") && !screen.text.includes("teknolojinin tek başına"), "ISSUE-100 argument skeleton is hidden initially");
  screen = await openStep("degerlendirme-303-307", "s307-q14");
  assert.ok(!screen.text.includes("Yer, ilişki, kültür, emek, anı"), "ISSUE-101 answer categories are hidden initially");
  assert.ok((await advanceUntil((text) => text.includes("Video kanıtı"), "s307 source-limited guidance")).includes("Video kanıtı"),
    "ISSUE-101 source-limited answer guidance opens after the task");

  for (const themeId of ["TEMA_01", "TEMA_02", "TEMA_03", "TEMA_04"]) {
    const candidate = evidencePresentationCases.get(themeId);
    assert.ok(candidate, `${themeId} production catalog has an explicitly paired evidence section`);
    const { lesson, step, unit } = candidate;
    screen = await openStep(lesson.lesson_slug, step.id);
    const sourceSection = step.answer.answer_sections[unit.evidence_sections[0].section_key];
    const sourceSnippet = firstSourceString(sourceSection).trim().slice(0, 44);
    assert.ok(sourceSnippet.length > 10, `${themeId}/${step.id} paired evidence section has source text`);
    assert.ok(!screen.text.includes(sourceSnippet), `${themeId}/${step.id} paired evidence is hidden on the task view`);
    const responseKey = unit.section_keys?.[0];
    const responseValue = responseKey ? step.answer.answer_sections[responseKey] : step.answer.answer;
    const responseSnippet = firstSourceString(responseValue).trim().slice(0, 34);
    assert.ok(responseSnippet.length > 10, `${themeId}/${step.id} linked response has source text`);
    const responseText = await advanceUntil((text) => text.includes(responseSnippet), `${themeId} linked answer` , 36);
    assert.ok(responseText.includes(responseSnippet), `${themeId}/${step.id} opens the linked response before evidence`);
    const evidenceText = await advanceUntilEvidenceSection(unit.evidence_sections[0].section_key, `${themeId}/${step.id}`);
    assert.ok(evidenceText.includes(sourceSnippet), `${themeId}/${step.id} source evidence section opens after its answer`);
    assert.ok((await answerPanelText()).trim(), `${themeId}/${step.id} keeps the linked answer visible with evidence`);
    const quotePanel = await page.evaluate("document.querySelector('#canvas .panel--evidence .quotes')?.innerText ?? ''");
    for (const quoteIndex of unit.inline_quote_indexes ?? []) {
      const quote = step.answer.evidence_quotes[quoteIndex];
      assert.ok(!quotePanel.includes(quote), `${themeId}/${step.id} quote ${quoteIndex} is not duplicated as a separate evidence card`);
    }
  }

  await page.send("Page.setDownloadBehavior", { behavior: "allow", downloadPath: profile });
  screen = await openStep("konusma", "s59-rubric");
  let rubricCriteriaSeen = false;
  let rubricResourcesSeen = false;
  let rubricDownload = null;
  for (let i = 0; i < 16; i += 1) {
    const currentText = i === 0 ? screen.text : await next();
    rubricCriteriaSeen ||= currentText.includes("Konu seçimi") && currentText.includes("Başlangıç düzeyinde");
    rubricResourcesSeen ||= currentText.includes("Öğretmen anahtarı") && currentText.includes("Puanlama Exceli");
    rubricDownload ||= await page.evaluate("(() => { const a = document.querySelector('#canvas .source-links a[download]'); return a && {href:a.href, label:a.textContent.trim(), target:a.getAttribute('target'), download:a.hasAttribute('download')}; })()");
    if (rubricCriteriaSeen && rubricResourcesSeen && rubricDownload) break;
  }
  assert.ok(rubricCriteriaSeen, "s.59 authored rubric shows criteria and levels across its paginated content");
  assert.ok(rubricResourcesSeen, "s.59 authored rubric links its teacher rubric and scoring workbook");
  assert.ok(rubricDownload?.href.endsWith("/assets/assessment-documents/iletisim-engelleri-drama-rubrik.docx"),
    "s.59 rubric has a same-origin Word download link");
  assert.equal(rubricDownload.download, true, "rubric resource is exposed as a browser download");
  assert.equal(rubricDownload.target, null, "Word download stays in the current presentation tab");
  screen = await openStep("karagoz", "s35-peer-form");
  assert.ok(screen.text.includes("Evet") && screen.text.includes("Kısmen") && screen.text.includes("Hayır"),
    "s.35 peer-assessment response scale is visible to students");
  await page.evaluate("document.querySelector('#canvas .source-links a[download]')?.click()");
  const downloadedPeerForm = await until(() => {
    const file = fs.readdirSync(profile).find((name) => name === "OGM2025TDE11135akran.docx");
    return file ? path.join(profile, file) : null;
  }, "peer-assessment DOCX download");
  const peerBytes = fs.readFileSync(downloadedPeerForm);
  assert.deepEqual([...peerBytes.subarray(0, 4)], [0x50, 0x4b, 0x03, 0x04], "peer-form download is a real DOCX ZIP package");
  assert.ok(peerBytes.length > 5000, "peer-form download has complete document content");

  await page.send("Emulation.setDeviceMetricsOverride", { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
  const qaContentEntry = findStep("mektup", "s39-q1");
  assert.equal(qaContentEntry.step.layout, "vocabulary", "s39-q1 keeps its production vocabulary layout");
  await openStep("mektup", "s39-q1");
  let visualQa = await qaState();
  assert.equal(visualQa.modern, true, "s39-q1 browser screenshot uses the semantic QA shell");
  assert.equal(visualQa.focus.trim(), "", "s39-q1 browser screenshot shows its vocabulary prompt");
  const pairedVisualEntry = findStep("huzur-metni-anlayalim-175-176", "s176-q4");
  const pairedVisualUnit = pairedVisualEntry.step.presentation?.web?.units?.find((unit) => unit.evidence_sections?.length);
  assert.ok(pairedVisualUnit, "s176-q4 has a production answer/evidence unit for visual comparison");
  await openStep("huzur-metni-anlayalim-175-176", "s176-q4");
  const qaLessonPromptScreenshot = await captureQaScreenshot("s176-q4 QA prompt");
  await advanceUntilEvidenceSection(pairedVisualUnit.evidence_sections[0].section_key, "s176-q4 visual evidence");
  visualQa = await qaState();
  assert.equal(visualQa.modern, true, "s176-q4 browser screenshot uses the modern QA layout");
  assert.ok((await answerPanelText()).trim(), "s176-q4 browser screenshot includes its paired answer");
  assert.ok((await evidencePanelText()).trim(), "s176-q4 browser screenshot includes paired evidence");
  const qaPairScreenshot = await captureQaScreenshot("s176-q4 paired answer/evidence");
  // PPTX export is scoped to the currently selected lesson. Keep the visual
  // targets in that lesson so each browser state can be matched to an exported
  // slide; s39-q1 belongs to a different lesson and cannot appear in this file.
  const webQaScreenshots = [qaLessonPromptScreenshot, qaPairScreenshot];
  const visualPptxTargets = webQaScreenshots.map(({ label, state }) => ({
    label,
    prompt: state.prompt,
    context: state.context,
    focus: state.focus,
    answer: state.answer,
    evidence: state.evidence,
    bodyScrollTop: state.bodyScrollTop
  }));

  await page.evaluate("document.querySelector('#dock [data-action=menu]').click()");
  await until(() => page.evaluate("!document.querySelector('#menu').hidden && Boolean(document.querySelector('#menu-export-pptx'))"), "PPTX export control in lesson menu");
  await installQaTransitionProbe();
  await clearQaTransitionCalls();
  await page.evaluate(`(() => {
    const probe = window.__qaPptxCaptureProbe = { qaCaptures: [], enterClassAttempts: [], visualCaptureCount: 0, visualMatches: [] };
    const canvas = document.querySelector('#canvas');
    const menu = document.querySelector('#menu');
    probe.visualTargets = ${JSON.stringify(visualPptxTargets)};
    const inspectCapture = (target) => {
      if (menu?.getAttribute('aria-busy') !== 'true') return;
      const prompt = target?.querySelector('.slide--qa-modern .qa-context > .prompt');
      if (!prompt) return;
      probe.qaCaptures.push({
        text: prompt.textContent,
        hasEnterClass: prompt.classList.contains('qa-prompt-enter'),
        animationName: getComputedStyle(prompt).animationName,
        viewTransitionName: getComputedStyle(prompt).viewTransitionName
      });
    };
    const originalReplaceChildren = Element.prototype.replaceChildren;
    Element.prototype.replaceChildren = function(...nodes) {
      const result = originalReplaceChildren.apply(this, nodes);
      if (this === canvas) inspectCapture(canvas);
      return result;
    };
    const originalAdd = DOMTokenList.prototype.add;
    DOMTokenList.prototype.add = function(...tokens) {
      if (tokens.includes('qa-prompt-enter') && menu?.getAttribute('aria-busy') === 'true') {
        probe.enterClassAttempts.push(true);
      }
      return originalAdd.apply(this, tokens);
    };
    const originalToBlob = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function(callback, ...args) {
      if (this.width === 1920 && this.height === 1080 && menu?.getAttribute('aria-busy') === 'true') {
        probe.visualCaptureCount += 1;
        const prompt = canvas?.querySelector('.slide--qa-modern .qa-context > .prompt');
        if (prompt) {
          const context = canvas.querySelector('.slide--qa-modern .qa-context');
          const focus = canvas.querySelector('.slide--qa-modern .qa-focus');
          const state = {
            prompt: prompt.innerText,
            context: context?.innerText ?? '',
            focus: focus?.innerText ?? '',
            answer: focus?.querySelector('.panel--answer')?.innerText ?? '',
            evidence: focus?.querySelector('.panel--evidence')?.innerText ?? '',
            bodyScrollTop: canvas.querySelector('.slide__body')?.scrollTop ?? -1
          };
          // A prompt appears in multiple export layers for the same question.
          // Select the visual target by its full rendered state, not the first
          // target with the same prompt (for example, prompt-only vs. answer/evidence).
          const target = probe.visualTargets.find((item) => item.prompt === state.prompt &&
            Object.keys(state).every((key) => state[key] === item[key]));
          if (target) {
            probe.visualMatches.push({ label: target.label, slideNumber: probe.visualCaptureCount, state });
          }
        }
      }
      return originalToBlob.call(this, callback, ...args);
    };
    probe.stop = () => {
      Element.prototype.replaceChildren = originalReplaceChildren;
      DOMTokenList.prototype.add = originalAdd;
      HTMLCanvasElement.prototype.toBlob = originalToBlob;
    };
  })()`);
  await page.evaluate("document.querySelector('#menu-export-pptx').click()");
  const downloadedPptx = await until(() => {
    const file = fs.readdirSync(profile).find((name) => name.endsWith(".pptx"));
    return file ? path.join(profile, file) : null;
  }, "visual PPTX download", 480000);
  await until(() => page.evaluate("document.querySelector('#menu').getAttribute('aria-busy') !== 'true'"), "PPTX capture completion");
  const pptxCaptureTransitions = await page.evaluate(`(() => {
    const probe = window.__qaPptxCaptureProbe;
    probe.stop();
    return probe;
  })()`);
  assert.ok(pptxCaptureTransitions.qaCaptures.length > 0,
    "PPTX export captured at least one QA prompt while its menu busy guard was active");
  assert.ok(pptxCaptureTransitions.qaCaptures.every((capture) =>
    !capture.hasEnterClass && capture.animationName === "none"),
  "PPTX capture keeps QA prompt transition classes and CSS animation off");
  assert.deepEqual(pptxCaptureTransitions.enterClassAttempts, [],
    "PPTX capture never attempts to add the QA prompt fallback class");
  assert.deepEqual(await qaTransitionCalls(), [],
    "PPTX capture never starts a view transition");
  assert.ok(pptxCaptureTransitions.visualCaptureCount > 10, "PPTX mapping counts each rendered slide PNG in capture order");
  for (const webScreenshot of webQaScreenshots) {
    const matches = pptxCaptureTransitions.visualMatches.filter((item) => item.label === webScreenshot.label);
    assert.equal(matches.length, 1, `${webScreenshot.label} maps to exactly one PPTX PNG by its rendered QA content`);
    const pptxPng = execFileSync("unzip", ["-p", downloadedPptx, `ppt/media/slide${matches[0].slideNumber}.png`], {
      maxBuffer: 20 * 1024 * 1024
    });
    const pixelComparison = await comparePngPixels(webScreenshot.bytes, pptxPng);
    // Report decoded-pixel differences without inventing a tolerance between the
    // browser compositor and the exporter's separate SVG rasterization path.
    console.log(`[sunum-web] Web/PPTX QA image comparison: ${JSON.stringify({
      label: webScreenshot.label,
      slideNumber: matches[0].slideNumber,
      exactPixels: pixelComparison.differentPixels === 0,
      ...pixelComparison
    })}`);
    assert.equal(pixelComparison.dimensionsMatch, true, `${webScreenshot.label} browser and PPTX PNG dimensions match`);
  }
  const pptxBytes = fs.readFileSync(downloadedPptx);
  assert.deepEqual([...pptxBytes.subarray(0, 4)], [0x50, 0x4b, 0x03, 0x04], "download is a PPTX ZIP package");
  assert.ok(pptxBytes.length > 50000, "download contains rendered slide images, not plain text only");
  const pptxEntries = execFileSync("unzip", ["-Z1", downloadedPptx], { encoding: "utf8" });
  assert.ok((pptxEntries.match(/ppt\/media\/slide\d+\.png/g) || []).length > 10, "PPTX embeds the lesson slide renderings");
  if (process.env.PPTX_TEST_OUTPUT) fs.copyFileSync(downloadedPptx, process.env.PPTX_TEST_OUTPUT);

  console.log("[sunum-web] Headless Chrome verified presentation flow and visual PPTX export.");
  } else {
    console.log("[sunum-web] Headless Chrome verified Theme 1 answer units, paired evidence, layout, and safe restore.");
  }
  }
}
} finally {
  for (const client of clients) client.close();
  if (browser.exitCode === null) {
    browser.kill("SIGTERM");
    await Promise.race([new Promise((resolve) => browser.once("exit", resolve)), sleep(3000)]);
  }
  if (rasterAudit) {
    await new Promise((resolve) => server.close(resolve));
  } else if (server.exitCode === null) {
    server.kill("SIGTERM");
    await Promise.race([new Promise((resolve) => server.once("exit", resolve)), sleep(1000)]);
  }
  fs.rmSync(profile, { recursive: true, force: true });
}
