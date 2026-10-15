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
import { answerLayerMarker, assertLayerHidden, assertLayerVisible } from "../../lesson-player/scripts/presentation-behavior-contracts.mjs";

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
assert.equal(Object.values(qaModernEntryTypes).reduce((sum, count) => sum + count, 0), catalogAnswerRevealSteps.length,
  "every prompt-bearing step with an answer reveal and typed answer is counted from the current catalog");
assert.equal(catalogAnswerRevealSteps.length, builtCatalog.lessons.flatMap((lesson) => lesson.steps)
  .filter((step) => usesModernQuestionLayout(step)).length,
"QA-modern eligibility is derived from the current answer/reveal contract, without a pinned content total");
console.log(`[sunum-web] QA-modern eligible catalog steps by layout: ${JSON.stringify(qaModernCoverage)}; by entry type: ${JSON.stringify(qaModernEntryTypes)} (total ${catalogAnswerRevealSteps.length}).`);
const multiPageContentCandidates = builtCatalog.lessons.flatMap((lesson) => lesson.steps
  .map((step) => ({ lesson, step }))
  .filter(({ step }) => step.layout === "question" && step.reveals?.includes("answer") &&
    (step.content?.items?.length ?? 0) > 1))
  .sort((left, right) => right.step.content.items.length - left.step.content.items.length);
const interleavedAnswerCandidates = builtCatalog.lessons.flatMap((lesson) => lesson.steps
  .map((step) => ({ lesson, step }))
  .filter(({ step }) => {
    const sections = step.answer?.answer_sections;
    const interleave = step.presentation?.interleave;
    const groupSize = typeof interleave === "object" ? interleave.group_size : 3;
    return step.layout === "vocabulary" && usesModernQuestionLayout(step) &&
      (interleave === true || interleave?.source === "answer_sections") && !step.presentation?.web?.units?.length &&
      sections && !Array.isArray(sections) && Object.keys(sections).length > groupSize;
  }))
  .sort((left, right) => Object.keys(right.step.answer.answer_sections).length -
    Object.keys(left.step.answer.answer_sections).length);
const multiUnitEvidenceCases = builtCatalog.lessons.flatMap((lesson) => lesson.steps
  .map((step) => ({ lesson, step }))
  .filter(({ step }) => step.prompt?.trim() && step.reveals?.includes("answer") && step.answer?.entry_type?.trim() &&
    usesModernQuestionLayout(step) && !["process", "assessment", "reference"].includes(step.layout) &&
    (step.presentation?.web?.units ?? []).filter((unit) => unit.section_keys?.length && unit.evidence_sections?.length).length > 1));
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
  assert.ok(index >= 0, `canonical fixture exists: ${slug}/${id}`);
  const webLesson = builtCatalog.lessons.find((entry) => entry.slug === slug);
  const webIndex = webLesson?.steps.findIndex((step) => step.id === id) ?? -1;
  assert.ok(webIndex >= 0, `Web Sunum fixture exists: ${slug}/${id}`);
  return { lesson, step: lesson.steps[index], webStep: webLesson.steps[webIndex], slide: webIndex + 1 };
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
  await until(async () => (await bodyText()).includes(entry.webStep.prompt), `open ${id}`);
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

// A teacher's video filename must remain legible to the LEFT of the floating
// controls, including at browser zoom levels that previously covered it.
const videoFileCase = builtCatalog.lessons.flatMap((lesson) =>
  lesson.steps.map((step) => ({ lesson, step })))
  .find(({ step }) => step.video_file?.includes("19XU4CVR.mp4"));
assert.ok(videoFileCase, "the video filename positioning fixture exists");
for (const [width, height, zoom] of [[1920, 1080, 1], [1228, 700, 1], [1228, 412, 1.75]]) {
  await page.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
  await page.evaluate(`document.documentElement.style.zoom = ${JSON.stringify(zoom)}`);
  await openStep(videoFileCase.lesson.slug, videoFileCase.step.id);
  const placement = await page.evaluate(`(() => {
    for (const animation of document.querySelector('#canvas .slide')?.getAnimations() ?? []) {
      try { animation.finish(); } catch { /* no active animation */ }
    }
    const label = document.querySelector('#canvas .slide-video-file');
    const title = document.querySelector('#canvas .slide__foot .lesson-name');
    const dock = document.querySelector('#dock');
    const rect = (node) => {
      const box = node?.getBoundingClientRect();
      return box && { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width };
    };
    return {
      label: label?.textContent?.trim(),
      labelRect: rect(label),
      titleRect: rect(title),
      dockRect: rect(dock),
      scrollWidth: label?.scrollWidth,
      clientWidth: label?.clientWidth
    };
  })()`);
  assert.equal(placement.label, "19XU4CVR.mp4", "video filename displays without technical prefix");
  const adjacentGap = placement.labelRect?.left - placement.titleRect?.right;
  assert.ok(adjacentGap >= 0 && adjacentGap <= 36,
    `video filename is immediately after lesson title at ${width}×${height}, zoom ${zoom}: ${JSON.stringify(placement)}`);
  const overlapsDock = placement.labelRect?.right > placement.dockRect?.left &&
    placement.labelRect?.left < placement.dockRect?.right &&
    placement.labelRect?.bottom > placement.dockRect?.top &&
    placement.labelRect?.top < placement.dockRect?.bottom;
  assert.ok(placement.labelRect?.left >= 0 && !overlapsDock,
    `video filename must not be covered by navigation at ${width}×${height}, zoom ${zoom}: ${JSON.stringify(placement)}`);
  assert.ok(placement.scrollWidth <= placement.clientWidth + 1,
    `video filename is fully readable at ${width}×${height}, zoom ${zoom}: ${JSON.stringify(placement)}`);
}
await page.evaluate("document.documentElement.style.removeProperty('zoom')");
await page.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

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
      const qaModern = usesModernQuestionLayout(step) && !["process", "assessment", "reference"].includes(step.layout);
      if (!targetLayouts.has(step.layout) && !qaModern) return null;
      if (!contentMayPaginate && !answerMayPaginate) return null;
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

    let qaMultiPageAnswer = null;
    for (const candidate of candidates.filter(({ qaModern, answerMayPaginate, step }) =>
      qaModern && answerMayPaginate && step.reveals?.includes("answer"))) {
      await openPosition(candidate.lesson, candidate.step, candidate.slide, 0, 0);
      const marker = answerLayerMarker(candidate.step, "answer");
      if (!marker) continue;
      let answerPage = await readPromptGeometry();
      for (let advance = 0; advance < 64; advance += 1) {
        const normalizedBody = answerPage.bodyText.normalize("NFC").replace(/\s+/gu, " ");
        if (answerPage.qa && answerPage.revealIndex > 0 && answerPage.pageTotal >= 2 && normalizedBody.includes(marker)) break;
        await page.evaluate("document.querySelector('#dock [data-action=next]').click()");
        await page.evaluate("new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))");
        answerPage = await readPromptGeometry();
      }
      if (!answerPage.qa || answerPage.revealIndex === 0 || answerPage.pageTotal < 2 ||
        !answerPage.bodyText.normalize("NFC").replace(/\s+/gu, " ").includes(marker)) continue;

      qaMultiPageAnswer = `${candidate.lesson.lesson_slug}/${candidate.step.id}`;
      const answerKey = `${candidate.step.id}|${answerPage.revealIndex}|${answerPage.pageTotal}`;
      groups.set(answerKey, { stepId:candidate.step.id, layout:candidate.step.layout, qa:true,
        revealIndex:answerPage.revealIndex, view:"Cevap", total:answerPage.pageTotal, pages:[answerPage] });
      for (let part = 1; part < answerPage.pageTotal; part += 1) {
        const answerPart = await openPosition(candidate.lesson, candidate.step, candidate.slide,
          answerPage.revealIndex, part);
        assert.equal(answerPart.pageIndex, part + 1,
          `${candidate.step.id} restores QA answer page ${part + 1}/${answerPage.pageTotal}`);
        groups.get(answerKey).pages.push(answerPart);
        measuredPages += 1;
      }
      break;
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
    let syntheticShortDense = null;
    if (!processShortDense) {
      const processCandidate = candidates.find((candidate) => candidate.step.id === processDenseShort?.stepId) ??
        candidates.find((candidate) => candidate.step.layout === "process");
      if (processCandidate) {
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
    }
    if ([...groups.values()].some((group) => group.total === 2)) {
      assert.equal(roundTripChecked, true, "browser regression checks 1/2 → 2/2 → 1/2 and back through next/previous");
    }
    console.log(`[pagination-geometry-audit] ${JSON.stringify({
      candidateSteps:candidates.length, scannedSteps, multipageSteps:multipageSteps.size,
      multipageViews:multipageViews.length, measuredPages, layoutViews:Object.fromEntries(pageCountByLayout),
      scaleVariedViews:multipageViews.filter((group) => new Set(group.pages.map((item) => round(item.scale))).size > 1).length,
      examples:{processDenseShort:processDenseShort?.stepId || null,processShortDense:processShortDense?.stepId || "synthetic process-modern shell",
        syntheticShortDense,
        threePage:threePage ? {stepId:threePage.stepId,total:threePage.total} : null,qaAnswer:qaMultiPageAnswer},
      unstable:unstable.length, unstableExamples:unstable.slice(0,10)
    })}`);
    break presentationBrowserSuite;
  }

  if (qaVisualAudit) {
    await page.send("Emulation.setDeviceMetricsOverride", { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
    await page.evaluate('document.fonts.load(\'400 16px "Inter"\')');
    const outputDir = process.env.QA_VISUAL_AUDIT_DIR || path.join(os.tmpdir(), "sunum-web-qa-visual-audit");
    fs.mkdirSync(outputDir, { recursive: true });
    const fixturesByLayout = new Map();
    for (const lesson of builtCatalog.lessons) {
      for (const step of lesson.steps) {
        if (!step.prompt?.trim() || fixturesByLayout.has(step.layout)) continue;
        fixturesByLayout.set(step.layout, { lesson, step });
      }
    }
    const fixtures = [...fixturesByLayout].map(([layout, { lesson, step }]) => ({
      slug: lesson.slug,
      id: step.id,
      layout,
      maxStages: step.reveals?.length ? 16 : 0,
      qaModern: usesModernQuestionLayout(step)
    }));
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
      assert.ok(process.bodyText.length > 0, `${fixture.id} ${stage} retains visible process content`);
      assert.ok(state.bodyMetrics?.scrollWidth <= state.bodyMetrics?.clientWidth + 1,
        `${fixture.id} ${stage} has no horizontal process-body overflow`);
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
        assert.ok(metrics.sourceLinks.length > 0, `${label} shows a current book action`);
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

    const coverLessons = [...new Map(builtCatalog.lessons.map((lesson) => [lesson.theme, lesson])).values()];
    for (const { slug } of coverLessons) {
      await page.send("Page.navigate", { url: `${root}/#/${slug}/0` });
      await until(() => page.evaluate("document.querySelector('#canvas .slide--lesson-cover')?.innerText || ''"), `${slug} lesson cover`);
      await captureProductUi(`cover-${slug}`);
    }

    const bookLinkCases = new Map();
    for (const lesson of builtCatalog.lessons) {
      for (const step of lesson.steps) {
        if (!bookLinkCases.has(lesson.theme) && step.content?.sources?.some((source) => source.url?.includes("#page="))) {
          bookLinkCases.set(lesson.theme, { lesson, step });
        }
      }
    }
    for (const { lesson, step } of bookLinkCases.values()) {
      await openStep(lesson.slug, step.id);
      await captureProductUi(`book-link-${step.id}`);
    }

    for (const lesson of [builtCatalog.lessons[0], builtCatalog.lessons.at(-1)]) {
      await page.send("Page.navigate", { url: `${root}/#/${lesson.slug}/0` });
      await until(() => page.evaluate("Boolean(document.querySelector('#canvas .slide--lesson-cover'))"), `${lesson.slug} lesson before menu capture`);
      await page.evaluate("document.querySelector('#dock [data-action=menu]').click()");
      await until(() => page.evaluate("!document.querySelector('#menu').hidden"), `${lesson.slug} lesson browser`);
      await captureProductUi(`lesson-browser-${lesson.theme}`);
      await page.evaluate("document.querySelector('#menu [data-action=close-menu]').click()");
      await until(() => page.evaluate("document.querySelector('#menu').hidden"), `${lesson.slug} close lesson browser`);
    }

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
        for (let i = 1; i <= fixture.maxStages; i++) {
          await next();
          const stage = await inspect();
          if (!stage.prompt || stage.prompt !== entry.step.display_prompt) break;
          if (fixture.layout === "process") assertProcessMetrics(stage, fixture, `page ${i + 1}`);
          if (fixture.qaModern !== false && stage.focusText.trim()) {
            assert.equal(stage.compact, true, `${fixture.id} compacts the prompt when focus content opens`);
            assert.ok(stage.bodyMetrics?.scrollWidth <= stage.bodyMetrics?.clientWidth + 1, `${fixture.id} focus content has no horizontal body overflow`);
            assert.ok(stage.rendererNodes.filter((node) => node.cls === "sec" || node.cls === "vocab__item")
              .every((node) => node.scrollWidth <= node.clientWidth + 1), `${fixture.id} renderer cards do not clip horizontally`);
          }
          await capture(fixture, `reveal-${i}`);
          traversed++;
        }
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
    const rasterSteps = builtCatalog.lessons.flatMap((lesson) => lesson.steps.map((step) => ({ lesson, step })));
    const rasterCase = (name, predicate, mode) => {
      const entry = rasterSteps.find(({ step }) => predicate(step));
      return entry && { slug: entry.lesson.slug, id: entry.step.id, name: `${name}-${entry.step.id}`, mode };
    };
    const auditCases = [
      rasterCase("paired-evidence", (step) => !["process", "assessment", "reference"].includes(step.layout) &&
        step.presentation?.web?.units?.some((unit) => unit.evidence_sections?.length), "pairedEvidence"),
      rasterCase("structured-answer", (step) => step.layout === "structure" &&
        step.presentation?.web?.units?.some((unit) => unit.section_keys?.length), "answer"),
      rasterCase("vocabulary", (step) => step.layout === "vocabulary" &&
        Object.keys(step.answer?.answer_sections ?? {}).length > 0, "answer"),
      rasterCase("assessment-scale", (step) => step.layout === "assessment" && step.content?.scale?.length, "scale"),
      rasterCase("process", (step) => step.layout === "process" && step.content?.items?.length, "process")
    ].filter(Boolean);
    const requestedIds = process.env.PPTX_RASTER_AUDIT_ONLY?.split(",").map((id) => id.trim()).filter(Boolean);
    const selectedCases = requestedIds ? auditCases.filter((fixture) => requestedIds.includes(fixture.id)) : auditCases;
    assert.ok(selectedCases.length > 0, "PPTX_RASTER_AUDIT_ONLY selects at least one known fixture");
    for (const fixture of selectedCases) {
      const entry = await openStep(fixture.slug, fixture.id);
      if (fixture.mode === "pairedEvidence") {
        const unit = entry.step.presentation?.web?.units?.find((candidate) => candidate.evidence_sections?.length);
        assert.ok(unit, `${fixture.name} has a paired evidence unit`);
        await advanceUntilEvidenceSection(unit.evidence_sections[0].section_key, fixture.name);
        assert.ok((await answerPanelText()).trim(), `${fixture.name} shows its answer panel`);
        assert.ok((await evidencePanelText()).trim(), `${fixture.name} shows its evidence panel`);
      }
      if (fixture.mode === "answer") {
        const answerMarker = answerLayerMarker(entry.step, "answer");
        assert.ok(answerMarker, `${fixture.name} has a current answer marker`);
        await advanceUntil((text) => includesText(text, answerMarker), `${fixture.name} answer reveal`, 64);
        assert.ok((await answerPanelText()).trim(), `${fixture.name} shows its current answer`);
      }
      if (fixture.mode === "scale") {
        assert.ok(await page.evaluate("Boolean(document.querySelector('#canvas .scale-form'))"),
          `${fixture.name} renders the current assessment scale`);
      }
      if (fixture.mode === "process") {
        assert.ok(await page.evaluate("Boolean(document.querySelector('#canvas .steps-list, #canvas .process-card-item'))"),
          `${fixture.name} renders its current process content`);
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
      assert.ok(includesText(visual.text, entry.step.display_prompt), `${fixture.name} renders its current prompt`);
      const base64 = await page.evaluate("window.__testCaptureSlideImage()" );
      const bytes = Buffer.from(base64, "base64");
      assert.equal(bytes.toString("hex", 0, 8), "89504e470d0a1a0a", `${fixture.name} direct capture returns PNG`);
      assert.deepEqual([bytes.readUInt32BE(16), bytes.readUInt32BE(20)], [1920, 1080], `${fixture.name} direct capture is 1920×1080`);
      const imagePath = path.join(outputDir, `${fixture.name}.png`);
      fs.writeFileSync(imagePath, bytes);
      console.log(`[sunum-web] Raster audit ${fixture.name}: ${JSON.stringify({ imagePath, dimensions: [1920, 1080], font: visual.fontFamily, decorations: visual.decorations, bounds: visual.body, bytes: bytes.length })}`);
    }
    console.log(`[sunum-web] Captured ${selectedCases.length} representative slide states directly; PPTX export was not invoked.`);
  } else {
  if (process.env.STRUCTURE_VISUAL_SMOKE === "1") {
    const sourceStructureIds = lessons.flatMap((lesson) => lesson.steps
      .filter((step) => step.layout === "structure")
      .map((step) => `${lesson.lesson_slug}/${step.id}`)).sort();
    const builtStructureIds = builtCatalog.lessons.flatMap((lesson) => lesson.steps
      .filter((step) => step.layout === "structure")
      .map((step) => `${lesson.slug}/${step.id}`)).sort();
    assert.deepEqual(builtStructureIds, sourceStructureIds,
      "the built catalog preserves every current structure-layout step from the source");
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

    const structureCandidates = lessons.flatMap((lesson) => lesson.steps
      .filter((step) => step.layout === "structure")
      .map((step) => ({ lesson, step, keys: step.presentation?.web?.units?.flatMap((unit) => unit.section_keys) ?? [] })))
      .filter(({ keys }) => keys.length > 0)
      .sort((left, right) => left.keys.length - right.keys.length);
    assert.ok(structureCandidates.length > 0, "current structure content provides an answer unit for interaction checks");
    const structureExamples = [...new Map([structureCandidates[0], structureCandidates.at(-1)]
      .map(({ lesson, step }) => [`${lesson.lesson_slug}/${step.id}`, { slug: lesson.lesson_slug, id: step.id }])).values()];
    for (const fixture of structureExamples) {
      const entry = findStep(fixture.slug, fixture.id);
      assert.equal(entry.step.layout, "structure", `${fixture.id} uses the canonical structure layout`);
      const expectedKeys = entry.step.presentation.web.units.flatMap((unit) => unit.section_keys);
      assert.ok(expectedKeys.length > 0, `${fixture.id} has current structured answer units`);
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
    console.log(`[sunum-web] Focused Chrome structure visual smoke passed: ${sourceStructureIds.length} source/built layouts, pagination order, reverse/forward, overflow, and QA/comparison isolation.`);
    break presentationBrowserSuite;
  }

  if (process.env.VISUAL_LAYOUT_CLASS_SMOKE === "1") {
    // Arc-inspired book reference cards must be shared across themes without
    // mutating original PDF page anchors or other source/download actions.
    const bookCardCases = new Map();
    for (const lesson of builtCatalog.lessons) {
      for (const step of lesson.steps) {
        if (!bookCardCases.has(lesson.theme) &&
          step.content?.sources?.some((source) => source.url?.includes("#page="))) {
          bookCardCases.set(lesson.theme, { lesson, step });
        }
      }
    }
    assert.ok(bookCardCases.size > 0, "canonical catalog contains a page-linked textbook source");
    for (const { lesson, step } of bookCardCases.values()) {
      const slug = lesson.slug;
      const id = step.id;
      await openStep(slug, id);
      await waitForPromptFonts();
      const bookCards = await page.evaluate(`(() => {
        const originalTheme = document.documentElement.dataset.theme;
        const card = document.querySelector('#canvas a.source-link--book');
        if (!card) return null;
        const icon = card.querySelector('.source-link__icon--book');
        const caption = card.querySelector('.source-link__context');
        const helper = card.querySelector('.source-link__action');
        const action = card.querySelector('.source-link__trailing');
        const check = (theme) => {
          document.documentElement.dataset.theme = theme;
          const cardCss=getComputedStyle(card);
          const actionCss=getComputedStyle(action);
          return {
            theme,background:cardCss.backgroundColor,borderRadius:cardCss.borderRadius,
            actionBackground:actionCss.backgroundColor,actionColor:actionCss.color,
            horizontalOverflow:card.scrollWidth > card.clientWidth+1,
            cardHeight:card.getBoundingClientRect().height
          };
        };
        const themes=['light','dark'].map(check);
        document.documentElement.dataset.theme=originalTheme;
        card.focus();
        const focusable=document.activeElement===card;
        card.blur();
        return {href:card.href,target:card.target,rel:card.rel,
          label:card.innerText,icon:!!icon?.querySelector('svg'),
          iconDisplay:icon&&getComputedStyle(icon).display,
          caption:caption?.innerText,helper:helper?.innerText,
          actionText:action?.innerText,focusable,themes};
      })()`);
      assert.ok(bookCards, slug + "/" + id + " renders a textbook action card");
      assert.match(bookCards.caption, /^Ders kitabı/, slug + "/" + id + " preserves textbook source context");
      assert.ok(bookCards.helper.includes("aç"), slug + "/" + id + " preserves authored source action");
      assert.ok(bookCards.actionText.includes("Aç") && bookCards.actionText.includes("↗"), slug + "/" + id + " displays the action affordance");
      assert.ok(bookCards.icon && bookCards.iconDisplay==="grid", slug + "/" + id + " has the readable book icon");
      assert.equal(bookCards.target,"_blank",slug + "/" + id + " opens the textbook externally");
      assert.ok(bookCards.rel.includes("noopener") && bookCards.rel.includes("noreferrer"),
        slug + "/" + id + " preserves safe external-link attributes");
      assert.ok(bookCards.href.includes("#page="), slug + "/" + id + " preserves exact PDF page URL");
      assert.equal(bookCards.focusable,true,slug + "/" + id + " remains keyboard focusable");
      for (const theme of bookCards.themes) {
        assert.notEqual(theme.background, "rgba(0, 0, 0, 0)", slug + "/" + id + " " + theme.theme + " card stays distinct");
        assert.equal(theme.horizontalOverflow, false, slug + "/" + id + " " + theme.theme + " card content fits");
        assert.ok(theme.cardHeight >= 44, slug + "/" + id + " " + theme.theme + " has a finger-sized card: " + theme.cardHeight.toFixed(1) + "px");
      }
    }
    console.log(`[sunum-web] Arc textbook cards passed: ${bookCardCases.size} canonical PDF links, light/dark, icon, focus and geometry.`);

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
    const arcDock = await page.evaluate(`(async () => {
      const dock=document.querySelector('#dock'),buttons=[...dock.querySelectorAll('button[data-action]')];
      const highlight=dock.querySelector('.dock__highlight');
      const prev=buttons.find(button=>button.dataset.action==='prev');
      const help=buttons.find(button=>button.dataset.action==='help');
      const theme=buttons.find(button=>button.dataset.action==='theme');
      // The preceding browser checks may have left an action focused.
      // Clear that state so hover-leave and keyboard-focus are tested separately.
      if (dock.contains(document.activeElement)) document.activeElement.blur();
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
      // Keyboard focus is deliberately moved to a DIFFERENT button than
      // the last hovered one: a stale highlight position would fail.
      prev.focus();
      // CDP programmatic focus does not always emit the real focusin event;
      // dispatch it explicitly while the button is genuinely active, then
      // verify the same handler used by keyboard navigation.
      prev.dispatchEvent(new FocusEvent('focusin',{bubbles:true}));
      await new Promise(resolve=>setTimeout(resolve,180));
      const focused={...state(),visible:Number.parseFloat(getComputedStyle(highlight).opacity)>0.5,
        focusWithin:dock.matches(':focus-within'),
        active:document.activeElement?.getAttribute('data-action')||document.activeElement?.tagName,
        focusedMatches:document.activeElement===prev};
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
    assert.equal(arcDock.focused.focusWithin, true, "Arc dock registers keyboard focus");
    assert.equal(arcDock.focused.visible, true, "Arc highlight is visibly rendered on focus: " + JSON.stringify(arcDock.focused));
    assert.ok(Math.abs(arcDock.focused.x-arcDock.hovered.x)<=2,
      "Arc highlight moves back to the keyboard-focused control, not the last hover: " + JSON.stringify(arcDock.focused));
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
    const processCase = builtCatalog.lessons.flatMap((lesson) => lesson.steps.map((step, index) => ({ lesson, step, index })))
      .find(({ lesson, step, index }) => step.layout === "process" && step.content?.items?.length &&
        !step.reveals?.length && lesson.steps[index + 1] && lesson.steps[index + 1].layout !== "process");
    assert.ok(processCase, "canonical catalog contains a standalone process slide with a following step");
    const processEntry = findStep(processCase.lesson.slug, processCase.step.id);
    const processOpened = await openStep(processCase.lesson.slug, processCase.step.id);
    let visual = await visualLayoutState();
    expectVisualClasses(visual, ["slide--visual-process"], `${processCase.lesson.slug}/${processCase.step.id}`);
    assert.deepEqual(visual.children, ["HEADER", "DIV", "FOOTER"], "process modifier preserves the slide's direct DOM children");
    assert.ok(visual.bodyClasses.includes("stack"), "process modifier preserves the existing body stack");
    assert.equal(visual.stepLists, 1, `${processCase.lesson.slug}/${processCase.step.id} remains an ordered step list`);
    const nextProcessEntry = processEntry.lesson.steps[processEntry.slide];
    await next();
    visual = await until(async () => {
      const state = await visualLayoutState();
      return state.prompt === nextProcessEntry.display_prompt ? state : null;
    }, `${processCase.lesson.slug}/${processCase.step.id} next step`);
    const nextVisualClasses = ["process", "reference", "assessment", "structure"].includes(nextProcessEntry.layout)
      ? [`slide--visual-${nextProcessEntry.layout}`]
      : [];
    expectVisualClasses(visual, nextVisualClasses, `${processCase.lesson.slug}/${processCase.step.id} next-step boundary`);
    await previous();
    visual = await until(async () => {
      const state = await visualLayoutState();
      return state.prompt === processEntry.step.display_prompt ? state : null;
    }, `${processCase.lesson.slug}/${processCase.step.id} previous step restore`);
    expectVisualClasses(visual, ["slide--visual-process"], `${processCase.lesson.slug}/${processCase.step.id} previous-step restore`);
    assert.ok(processOpened.text.includes(processEntry.step.display_prompt), `${processCase.lesson.slug}/${processCase.step.id} opens its canonical prompt`);

    const referenceCase = builtCatalog.lessons.flatMap((lesson) => lesson.steps.map((step, index) => ({ lesson, step, index })))
      .find(({ lesson, step, index }) => step.layout === "reference" && !step.reveals?.length &&
        step.content?.sources?.length && lesson.steps[index + 1]);
    assert.ok(referenceCase, "canonical catalog contains a source-linked reference slide with a following step");
    const sourceReference = findStep(referenceCase.lesson.slug, referenceCase.step.id);
    const referenceOpened = await openStep(referenceCase.lesson.slug, referenceCase.step.id);
    visual = await visualLayoutState();
    expectVisualClasses(visual, ["slide--visual-reference"], `${referenceCase.lesson.slug}/${referenceCase.step.id}`);
    assert.ok(referenceOpened.text.includes(sourceReference.step.display_prompt), "source reference keeps its canonical prompt");
    assert.ok(visual.sources > 0, "source reference keeps its existing source-link list");
    await next();
    await previous();
    visual = await until(async () => {
      const state = await visualLayoutState();
      return state.prompt === sourceReference.step.display_prompt ? state : null;
    }, `${referenceCase.lesson.slug}/${referenceCase.step.id} previous step restore`);
    expectVisualClasses(visual, ["slide--visual-reference"], `${referenceCase.lesson.slug}/${referenceCase.step.id} previous-step restore`);

    const noteReferenceCase = lessons.flatMap((lesson) => lesson.steps.map((step, index) => ({ lesson, step, index })))
      .find(({ lesson, step, index }) => {
        if (step.layout !== "reference" || !step.content?.note || !lesson.steps[index + 1]) return false;
        const runtimeStep = builtCatalog.lessons.find((entry) => entry.slug === lesson.lesson_slug)
          ?.steps.find((entry) => entry.id === step.id);
        return runtimeStep && !runtimeStep.reveals?.includes("note") && runtimeStep.content?.note === undefined;
      });
    assert.ok(noteReferenceCase, "a source reference with a teacher note is excluded from the student runtime");
    const noteReference = findStep(noteReferenceCase.lesson.lesson_slug, noteReferenceCase.step.id);
    const runtimeNoteReference = builtCatalog.lessons.find((lesson) => lesson.slug === noteReferenceCase.lesson.lesson_slug)
      ?.steps.find((step) => step.id === noteReferenceCase.step.id);
    const noteMarker = noteReference.step.content.note.normalize("NFC").replace(/\s+/gu, " ").trim().slice(0, 48);
    assert.ok(!runtimeNoteReference.reveals?.includes("note"), `${noteReferenceCase.lesson.lesson_slug}/${noteReferenceCase.step.id} runtime excludes the note reveal`);
    assert.equal(runtimeNoteReference.content.note, undefined, `${noteReferenceCase.lesson.lesson_slug}/${noteReferenceCase.step.id} runtime excludes teacher note text`);
    await setTeacherRevealMode(true);
    await openStep(noteReferenceCase.lesson.lesson_slug, noteReferenceCase.step.id);
    visual = await visualLayoutState();
    expectVisualClasses(visual, ["slide--visual-reference"], `${noteReferenceCase.lesson.lesson_slug}/${noteReferenceCase.step.id}`);
    assert.equal(visual.revealDots, 0, "teacher-only notes do not enter the student reveal sequence");
    await page.evaluate("document.querySelector('#dock [data-action=menu]').click()");
    await until(() => page.evaluate("document.querySelector('#menu')?.hidden === false"), "verify persisted teacher mode");
    assert.equal(await page.evaluate("document.querySelector('#menu-guide')?.checked"), true,
      "teacher reveal mode stays active while a reference slide is open");
    await page.evaluate("document.querySelector('#menu [data-action=close-menu]').click()");
    const nextNoteStep = noteReference.lesson.steps[noteReference.slide];
    for (let index = 0; index < 64 && visual.prompt === noteReference.step.display_prompt; index += 1) {
      await next();
      visual = await visualLayoutState();
      assert.equal(visual.revealDots, 0, "teacher-only note content does not create a student reveal");
      assert.ok(!(await bodyText()).includes(noteMarker), "teacher-only note text stays out of the student slide");
    }
    visual = await until(async () => {
      const state = await visualLayoutState();
      return state.prompt === nextNoteStep.display_prompt ? state : null;
    }, `${noteReferenceCase.lesson.lesson_slug}/${noteReferenceCase.step.id} next-step boundary`);
    const nextNoteVisualClasses = ["process", "reference", "assessment", "structure"].includes(nextNoteStep.layout)
      ? [`slide--visual-${nextNoteStep.layout}`]
      : [];
    expectVisualClasses(visual, nextNoteVisualClasses,
      `${noteReferenceCase.lesson.lesson_slug}/${noteReferenceCase.step.id} next-step boundary`);
    await previous();
    visual = await until(async () => {
      const state = await visualLayoutState();
      return state.prompt === noteReference.step.display_prompt ? state : null;
    }, `${noteReferenceCase.lesson.lesson_slug}/${noteReferenceCase.step.id} previous-step restore`);
    assert.equal(visual.revealDots, 0, "back navigation does not make teacher notes student reveals");
    expectVisualClasses(visual, ["slide--visual-reference"], `${noteReferenceCase.lesson.lesson_slug}/${noteReferenceCase.step.id} previous-step restore`);
    await setTeacherRevealMode(false);

    const assessmentCase = builtCatalog.lessons.flatMap((lesson) => lesson.steps.map((step) => ({ lesson, step })))
      .find(({ step }) => step.layout === "assessment" && step.content?.scale?.length && !step.answer?.question_id);
    assert.ok(assessmentCase, "canonical catalog contains an independent assessment scale");
    const selfAssessment = findStep(assessmentCase.lesson.slug, assessmentCase.step.id);
    const selfAssessmentOpened = await openStep(assessmentCase.lesson.slug, assessmentCase.step.id);
    visual = await visualLayoutState();
    expectVisualClasses(visual, ["slide--visual-assessment"], `${assessmentCase.lesson.slug}/${assessmentCase.step.id}`);
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
    assert.ok(assessmentMarkup.checklistRows + assessmentMarkup.scaleRows > 0, "the assessment renders its authored criteria rows");
    assert.ok(assessmentMarkup.scaleRows > 0, "the assessment renders its current response scale");
    assert.equal(assessmentMarkup.label, "Değerlendirme", "assessment uses its semantic badge label");
    assert.equal(assessmentMarkup.titleAlign, "left", "assessment title remains left aligned");
    assert.match(assessmentMarkup.titleFont, /^\s*["']?Inter["']?(?:\s*,|$)/i, "assessment title uses Inter");
    assert.ok(selfAssessmentOpened.text.includes(selfAssessment.step.display_prompt), "assessment keeps its canonical prompt content");

    for (const layout of ["process", "reference"]) {
      const fixture = builtCatalog.lessons.flatMap((lesson) => lesson.steps.map((step) => ({ lesson, step })))
        .find(({ step }) => step.layout === layout && step.reveals?.includes("answer") && answerLayerMarker(step, "answer"));
      assert.ok(fixture, `canonical catalog contains an answer-bearing ${layout} companion slide`);
      const entry = findStep(fixture.lesson.slug, fixture.step.id);
      await openStep(fixture.lesson.slug, fixture.step.id);
      visual = await visualLayoutState();
      expectVisualClasses(visual, [`slide--visual-${layout}`], `${fixture.lesson.slug}/${fixture.step.id} opening`);
      const initialRevealDots = visual.revealDots;
      assert.ok(initialRevealDots > 0, `${fixture.lesson.slug}/${fixture.step.id} exposes its current answer reveal sequence`);
      assert.equal(visual.revealedDots, 0, `${fixture.lesson.slug}/${fixture.step.id} starts before its answer reveal`);
      const answerMarker = answerLayerMarker(entry.step, "answer");
      assertLayerHidden(entry.step, await bodyText(), "answer", `${fixture.lesson.slug}/${fixture.step.id} task view`);
      for (let attempt = 0; attempt < 64 && !(await answerPanelText()).trim(); attempt += 1) {
        await next();
        const answerState = await visualLayoutState();
        assert.equal(answerState.prompt, entry.step.display_prompt,
          `${fixture.lesson.slug}/${fixture.step.id} advances within its current step`);
      }
      visual = await visualLayoutState();
      assert.equal(visual.prompt, entry.step.display_prompt, `${fixture.lesson.slug}/${fixture.step.id} answer stays on the same step`);
      assert.ok(visual.revealedDots > 0 && visual.revealedDots <= initialRevealDots,
        `${fixture.lesson.slug}/${fixture.step.id} advances within its authored reveal sequence`);
      assertLayerVisible(await bodyText(), answerMarker, "answer", `${fixture.lesson.slug}/${fixture.step.id} answer reveal`);
      assert.ok((await answerPanelText()).trim(), `${fixture.lesson.slug}/${fixture.step.id} renders its answer content`);
      expectVisualClasses(visual, [`slide--visual-${layout}`], `${fixture.lesson.slug}/${fixture.step.id} answer reveal`);
      for (let attempt = 0; attempt < 128 && visual.revealedDots > 0; attempt += 1) {
        await previous();
        visual = await visualLayoutState();
      }
      assert.equal(visual.prompt, entry.step.display_prompt, `${fixture.lesson.slug}/${fixture.step.id} previous returns to its task`);
      assert.equal(visual.revealedDots, 0, `${fixture.lesson.slug}/${fixture.step.id} previous closes the answer reveal`);
      assertLayerHidden(entry.step, await bodyText(), "answer", `${fixture.lesson.slug}/${fixture.step.id} after backward navigation`);
      expectVisualClasses(visual, [`slide--visual-${layout}`], `${fixture.lesson.slug}/${fixture.step.id} reverse navigation`);
    }

    const visualControlCases = new Map([
      ["process", processCase],
      ["reference", referenceCase],
      ["assessment", assessmentCase],
      ...["structure", "comparison", "vocabulary"].map((layout) => [layout,
        builtCatalog.lessons.flatMap((lesson) => lesson.steps.map((step) => ({ lesson, step })))
          .find(({ step }) => step.layout === layout)])
    ]);
    for (const [layout, fixture] of visualControlCases) {
      assert.ok(fixture, `canonical catalog contains a ${layout} visual-layout control`);
      const entry = await openStep(fixture.lesson.slug, fixture.step.id);
      assert.equal(entry.step.layout, layout, `${fixture.lesson.slug}/${fixture.step.id} retains its canonical ${layout} layout`);
      visual = await visualLayoutState();
      const expectedClasses = ["process", "reference", "assessment", "structure"].includes(layout)
        ? [`slide--visual-${layout}`]
        : [];
      expectVisualClasses(visual, expectedClasses, `${fixture.lesson.slug}/${fixture.step.id} control fixture`);
    }
    // Every internal companion heading must stay on the same vertical baseline,
    // even when adjacent slides contain substantially different amounts of content.
    const titleAnchorByLayout = new Map();
    const anchorCases = [];
    for (const layout of ["process", "reference", "assessment"]) {
      const candidates = builtCatalog.lessons.flatMap((lesson) => lesson.steps
        .filter((step) => step.layout === layout && step.prompt?.trim())
        .map((step) => ({ lesson, step })))
        .sort((left, right) => left.step.prompt.length - right.step.prompt.length);
      assert.ok(candidates.length > 0, `canonical catalog contains a ${layout} heading example`);
      anchorCases.push(candidates[0]);
      if (candidates.length > 1) anchorCases.push(candidates.at(-1));
    }
    for (const { lesson, step } of anchorCases) {
      const layout = step.layout;
      const { slug, id } = { slug: lesson.slug, id: step.id };
      await openStep(slug, id);
      const appearance = await page.evaluate("(() => { const slide = document.querySelector('#canvas .slide'); const context = slide?.querySelector('.companion-context'); const focus = slide?.querySelector('.companion-focus'); const prompt = context?.querySelector(':scope > .prompt'); return { classes: slide?.className ?? '', prompt: prompt?.textContent ?? '', align: prompt ? getComputedStyle(prompt).textAlign : '', children: context?.children.length ?? 0, focusEmpty: focus?.childElementCount === 0, hasQaFocus: Boolean(slide?.querySelector('.qa-focus')), titleOffset: prompt ? prompt.getBoundingClientRect().top - slide.querySelector('.slide__body').getBoundingClientRect().top : null }; })()");
      assert.ok(appearance.classes.includes("slide--modern-companion"), slug + "/" + id + " has shared shell");
      assert.ok(appearance.classes.includes("slide--visual-" + layout), slug + "/" + id + " preserves its layout");
      assert.ok(appearance.prompt.trim().length > 0 && appearance.children > 0, slug + "/" + id + " preserves its visible prompt context");
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

    const companionAnswerCase = builtCatalog.lessons.flatMap((lesson) => lesson.steps.map((step) => ({ lesson, step })))
      .find(({ step }) => step.layout === "process" && step.reveals?.includes("answer") && answerLayerMarker(step, "answer"));
    assert.ok(companionAnswerCase, "canonical catalog contains an answer-bearing process companion");
    await openStep(companionAnswerCase.lesson.slug, companionAnswerCase.step.id);
    const originalPromptSize = await page.evaluate("parseFloat(getComputedStyle(document.querySelector('#canvas .companion-context > .prompt')).fontSize)");
    assert.equal(await page.evaluate("document.querySelector('#canvas .companion-focus').childElementCount"), 0,
      `${companionAnswerCase.lesson.slug}/${companionAnswerCase.step.id} starts without support in focus`);
    for (let attempt = 0; attempt < 64 && !(await page.evaluate("Boolean(document.querySelector('#canvas .companion-focus .panel--answer'))")); attempt += 1) {
      await next();
    }
    const revealed = await page.evaluate("(() => { const prompt = document.querySelector('#canvas .companion-context > .prompt'); return { size: parseFloat(getComputedStyle(prompt).fontSize), title: prompt.textContent, answer: Boolean(document.querySelector('#canvas .companion-focus .panel--answer')), qa: Boolean(document.querySelector('#canvas .slide--qa-modern')) }; })()");
    assert.ok(revealed.size < originalPromptSize, "process heading contracts when support opens");
    assert.ok(revealed.title.includes(companionAnswerCase.step.prompt), "the canonical process prompt stays in context");
    assert.equal(revealed.answer, true, "process answer support appears in the shared focus area");
    assert.equal(revealed.qa, false, "process companion stays outside the QA question shell");
    for (let attempt = 0; attempt < 128 && await page.evaluate("document.querySelector('#canvas .companion-focus').childElementCount > 0"); attempt += 1) {
      await previous();
    }
    assert.equal(await page.evaluate("document.querySelector('#canvas .companion-focus').childElementCount"), 0,
      "reverse navigation restores the process instruction without support");
    console.log("[sunum-web] Companion visual smoke passed in four themes.");
    console.log("[sunum-web] Focused visual-layout class smoke passed: process, assessment and reference shell isolation, pagination/reveal order, and existing content structures.");
    break presentationBrowserSuite;
  }

  if (process.env.VOCAB_DICT_SMOKE === "1") {
    const dictionaryCase = builtCatalog.lessons.flatMap((lesson) => lesson.steps.map((step) => ({ lesson, step })))
      .find(({ step }) => step.layout === "vocabulary" && step.answer?.dictionary_terms?.length);
    assert.ok(dictionaryCase, "current catalog provides a vocabulary answer with dictionary terms");
    const { step: dictionaryStep } = await openStep(dictionaryCase.lesson.slug, dictionaryCase.step.id);
    assert.equal(dictionaryStep.layout, "vocabulary", `${dictionaryCase.step.id} uses the vocabulary layout`);
    let dictionaryVisible = await page.evaluate("Boolean(document.querySelector('#canvas .dict'))");
    for (let index = 0; index < 12 && !dictionaryVisible; index += 1) {
      await next();
      dictionaryVisible = await page.evaluate("Boolean(document.querySelector('#canvas .dict'))");
    }
    assert.equal(dictionaryVisible, true, `${dictionaryCase.lesson.slug}/${dictionaryCase.step.id} reaches its rendered dictionary card on the real route`);
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
    assert.equal(dictionaryStyle.cardCount, 1, `${dictionaryCase.lesson.slug}/${dictionaryCase.step.id} renders one visible .dict card`);
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

    const vocabularyCase = builtCatalog.lessons.flatMap((lesson) => lesson.steps.map((step) => ({ lesson, step })))
      .find(({ step }) => step.layout === "vocabulary" && Object.keys(step.answer?.answer_sections ?? {}).length > 0 &&
        !step.answer?.dictionary_terms?.length);
    assert.ok(vocabularyCase, "current catalog provides a vocabulary-card answer");
    await openStep(vocabularyCase.lesson.slug, vocabularyCase.step.id);
    let vocabularyVisible = await page.evaluate("Boolean(document.querySelector('#canvas .vocab__item'))");
    for (let index = 0; index < 64 && !vocabularyVisible; index += 1) {
      await next();
      vocabularyVisible = await page.evaluate("Boolean(document.querySelector('#canvas .vocab__item'))");
    }
    assert.equal(vocabularyVisible, true, `${vocabularyCase.step.id} reaches its vocabulary cards`);
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

    const criteriaCase = lessons.flatMap((lesson) => lesson.steps.map((step) => ({ lesson, step })))
      .find(({ step }) => step.layout === "assessment" && step.content?.items?.length && !step.content.scale?.length);
    assert.ok(criteriaCase, "current catalog provides an assessment criteria list");
    await openStep(criteriaCase.lesson.lesson_slug, criteriaCase.step.id);
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

    const scaleCase = lessons.flatMap((lesson) => lesson.steps.map((step) => ({ lesson, step })))
      .find(({ step }) => step.layout === "assessment" && step.content?.scale?.length && step.content?.items?.length);
    assert.ok(scaleCase, "current catalog provides an assessment scale form");
    await openStep(scaleCase.lesson.lesson_slug, scaleCase.step.id);
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
    assert.ok(scaleStyle.rowCount > 0 && scaleStyle.rowCount <= scaleCase.step.content.items.length,
      `${scaleCase.step.id} renders a non-empty page from its current assessment criteria`);
    console.log("[sunum-web] Focused Chrome dictionary smoke passed: card, heading, Inter definitions, term hierarchy, bounds, and vocabulary/criteria/scale-form style isolation.");
    break presentationBrowserSuite;
  }
  // Select current prompts by their canonical text length. The UI contract
  // follows rendered geometry, so editorial wording can change freely.
  const promptCandidates = builtCatalog.lessons.flatMap((lesson) => lesson.steps
    .map((step) => ({ lesson, step }))
    .filter(({ step }) => usesModernQuestionLayout(step) && step.prompt?.trim() &&
      !["process", "assessment", "reference"].includes(step.layout)));
  assert.ok(promptCandidates.length > 0, "catalog has a prompt-bearing answer-reveal step");
  const byPromptLength = [...promptCandidates].sort((left, right) => left.step.prompt.length - right.step.prompt.length);
  const promptFixtures = [...new Map([byPromptLength[0], byPromptLength.at(-1)]
    .map((entry) => [`${entry.lesson.slug}/${entry.step.id}`, entry])).values()];
  const promptAlignmentResults = [];
  for (const fixture of promptFixtures) {
    const label = `${fixture.lesson.slug}/${fixture.step.id}`;
    await openStep(fixture.lesson.slug, fixture.step.id);
    await waitForPromptFonts();
    const metrics = await qaPromptMetrics();
    assert.ok(metrics, `${label} renders a QA prompt for measurement`);
    const lines = metrics.afterAlignment.lineCount;
    assert.match(metrics.afterAlignment.inputs.fontFamily, /^\s*["']?Inter["']?(?:\s*,|$)/i,
      `${label} computed QA prompt font-family starts with Inter (${metrics.afterAlignment.inputs.fontFamily})`);
    assert.equal(metrics.afterAlignment.fontCheck, true,
      `${label} document.fonts.check confirms Inter is loaded for the prompt text`);
    assert.ok(metrics.afterAlignment.interFaces.some((face) => face.status === "loaded"),
      `${label} has a loaded Inter FontFace (${JSON.stringify(metrics.afterAlignment.interFaces)})`);
    assert.ok(lines > 0, `${label} has measurable rendered text lines`);
    assert.equal(metrics.appliedTextAlign, lines >= 3 ? "left" : "center",
      `${label} text-align follows its actual rendered line count (${lines})`);
    assert.equal(metrics.afterAlignment.textAlign, metrics.appliedTextAlign,
      `${label} computed alignment reflects the applied measurement decision`);
    assert.deepEqual(metrics.beforeAlignment.inputs, metrics.afterAlignment.inputs,
      `${label} alignment does not change width/font measurement inputs`);
    assert.equal(metrics.beforeAlignment.lineCount, metrics.afterAlignment.lineCount,
      `${label} alignment does not change the measured line count`);
    assert.deepEqual(metrics.restored, metrics.afterAlignment,
      `${label} restoring the tested alignment returns the same measured layout`);
    promptAlignmentResults.push({
      id: fixture.step.id,
      lines,
      textAlign: metrics.afterAlignment.textAlign,
      fontFamily: metrics.afterAlignment.inputs.fontFamily,
      fontCheck: metrics.afterAlignment.fontCheck
    });
  }
  console.log(`[sunum-web] Inter-loaded QA prompt alignment: ${JSON.stringify(promptAlignmentResults)}`);

  const headerCase = promptCandidates.reduce((shortest, candidate) => {
    const candidateText = candidate.step.answer?.answer ?? JSON.stringify(candidate.step.answer?.answer_sections ?? "");
    const shortestText = shortest.step.answer?.answer ?? JSON.stringify(shortest.step.answer?.answer_sections ?? "");
    return candidateText.length < shortestText.length ? candidate : shortest;
  });
  await openStep(headerCase.lesson.slug, headerCase.step.id);
  const initialHeader = await headerMetrics();
  const fixedHeaderHeight = initialHeader.height;
  const fixedBodyTop = initialHeader.bodyTop;
  const stableHeaderMetadata = (title) => title?.replace(/ · \d+\/\d+$/, "");
  let answerReached = false;
  for (let index = 0; index < 64; index += 1) {
    const metrics = await headerMetrics();
    assert.equal(metrics.whiteSpace, "nowrap", `${headerCase.step.id} metadata stays on one line`);
    assert.equal(metrics.height, fixedHeaderHeight, `${headerCase.step.id} header height stays fixed across reveal layers`);
    assert.equal(metrics.bodyTop, fixedBodyTop, `${headerCase.step.id} body position stays fixed across reveal layers`);
    assert.equal(stableHeaderMetadata(metrics.title), stableHeaderMetadata(initialHeader.title),
      `${headerCase.step.id} lesson metadata stays stable while its page counter advances`);
    assert.ok(!metrics.title.includes(" · Cevap"), `${headerCase.step.id} header does not gain a reveal label`);
    if ((await answerPanelText()).trim()) {
      answerReached = true;
      break;
    }
    await next();
  }
  assert.ok(answerReached, `${headerCase.step.id} reaches its authored answer reveal`);

  // Renderer eligibility follows the current entry type and layout. Select a
  // non-question answer category from canonical data instead of pinning an ID.
  const specializedAnswerCase = promptCandidates.find(({ step }) =>
    step.answer?.entry_type && step.answer.entry_type !== "question_answer");
  if (specializedAnswerCase) {
    const entry = await openStep(specializedAnswerCase.lesson.slug, specializedAnswerCase.step.id);
    const marker = answerLayerMarker(entry.step, "answer");
    const initialState = await qaState();
    assert.equal(initialState.modern, usesModernQuestionLayout(specializedAnswerCase.step),
      `${specializedAnswerCase.step.id} follows the semantic answer/reveal shell policy`);
    assert.ok((await bodyText()).includes(entry.step.display_prompt),
      `${specializedAnswerCase.step.id} renders its canonical prompt`);
    assertLayerHidden(entry.step, await bodyText(), "answer", `${specializedAnswerCase.step.id} task view`);
    const revealed = await advanceUntil((text) => text.includes(marker),
      `${specializedAnswerCase.step.id} ${entry.step.answer.entry_type} answer`, 64);
    assertLayerVisible(revealed, marker, "answer", `${specializedAnswerCase.step.id} answer reveal`);
    const revealedState = await qaState();
    assert.ok(revealedState.focus.includes(marker), `${specializedAnswerCase.step.id} answer appears in its focus stage`);
  }
  let qa;

  // Find a currently paginated multi-choice question from runtime geometry.
  // Neither a particular ID nor a fixed number of content items is required.
  let multiPageQa = null;
  let multiPageEntry = null;
  let contentPageCount = 0;
  for (const candidate of multiPageContentCandidates) {
    const opened = await openStep(candidate.lesson.slug, candidate.step.id);
    const state = await qaState();
    const total = Number(state.counter.match(/sayfa 1\/(\d+)/)?.[1] ?? 0);
    if (total > 1) {
      multiPageQa = candidate;
      multiPageEntry = opened;
      contentPageCount = total;
      qa = state;
      break;
    }
  }
  if (multiPageQa) {
    const label = `${multiPageEntry.lesson.lesson_slug}/${multiPageEntry.step.id}`;
    const answerMarker = answerLayerMarker(multiPageEntry.step, "answer");
    const itemPages = [qa.context];
    assert.equal(qa.modern, true, `${label} opens in the semantic QA shell`);
    assert.equal(qa.focus.trim(), "", `${label} starts with an empty answer focus`);
    assertLayerHidden(multiPageEntry.step, qa.context, "answer", `${label} first content page`);
    for (let part = 2; part <= contentPageCount; part += 1) {
      await next();
      qa = await qaState();
      assert.ok(qa.counter.includes(`sayfa ${part}/${contentPageCount}`), `${label} advances to content part ${part}`);
      assert.equal(qa.focus.trim(), "", `${label} content part ${part} keeps the answer hidden`);
      assertLayerHidden(multiPageEntry.step, qa.context, "answer", `${label} content part ${part}`);
      itemPages.push(qa.context);
    }
    for (const item of multiPageEntry.step.content.items) {
      assert.ok(itemPages.some((text) => text.includes(item)), `${label} shows each authored item on a content page`);
    }

    for (let part = contentPageCount; part > 1; part -= 1) await previous();
    qa = await qaState();
    assert.ok(qa.counter.includes(`sayfa 1/${contentPageCount}`), `${label} restores the first content page`);

    // Content-to-content pagination stays still; crossing into a reveal gets
    // one named-prompt transition, and reversing that boundary gets one more.
    await installQaTransitionProbe();
    await clearQaTransitionCalls();
    for (let part = 2; part <= contentPageCount; part += 1) {
      await next();
      assert.equal((await qaTransitionCalls()).length, 0, `${label} content pagination does not animate the prompt`);
    }
    await next();
    let transitionCalls = await qaTransitionCalls();
    assert.equal(transitionCalls.length, 1, `${label} content-to-reveal navigation starts one transition`);
    assert.equal(transitionCalls[0].before.viewTransitionName, "qa-question", "outgoing QA prompt has its shared transition name");
    assert.equal(transitionCalls[0].after.viewTransitionName, "qa-question", "incoming QA prompt has its shared transition name");
    assert.equal(transitionCalls[0].after.text, transitionCalls[0].before.text, "transition preserves the current prompt");
    if ((multiPageEntry.step.reveals?.length ?? 0) > 1) {
      await next();
      assert.equal((await qaTransitionCalls()).length, 1, `${label} reveal-to-reveal navigation does not animate`);
      await previous();
      assert.equal((await qaTransitionCalls()).length, 1, `${label} reverse reveal navigation does not animate`);
    }
    qa = await qaState();
    let reversePages = 0;
    while (qa.focus.trim() && reversePages < 64) {
      await previous();
      qa = await qaState();
      reversePages += 1;
    }
    assert.equal(qa.focus.trim(), "", `${label} reverse navigation returns to the last content page`);
    assert.ok(qa.counter.includes(`sayfa ${contentPageCount}/${contentPageCount}`), `${label} restores the last content part`);
    transitionCalls = await qaTransitionCalls();
    assert.equal(transitionCalls.length, 2, `${label} reveal-to-content reverse navigation starts one transition`);
    assert.equal(transitionCalls[1].before.viewTransitionName, "qa-question", "reverse transition starts with the QA prompt name");
    assert.equal(transitionCalls[1].after.viewTransitionName, "qa-question", "reverse transition returns to the QA prompt name");
    for (let part = contentPageCount - 1; part > 0; part -= 1) await previous();
    assert.equal((await qaTransitionCalls()).length, 2, `${label} reverse content pagination does not animate`);
  } else {
    console.log("[sunum-web] Current catalog has no paginated multi-choice opening; the full prompt sweep still checks every current step.");
  }

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
      if (step.content?.options_on_next_click) {
        // Staged multiple-choice questions intentionally move the complete option
        // set into QA focus after the first advance (instead of the answer panel).
        assert.ok(step.content.options?.length > 0,
          `${lesson.slug}/${step.id} has authored staged options`);
        assert.ok(step.content.options.every((option) =>
          nextContentPage.focus.includes(option.text)),
        `${lesson.slug}/${step.id} shows every option together in QA focus after one advance`);
        assert.ok(!nextContentPage.stageLabels.includes("CEVAP") &&
          !nextContentPage.focus.includes("Doğru cevap:"),
        `${lesson.slug}/${step.id} staged options do not reveal the answer`);
      } else {
        assert.equal(nextContentPage.focus.trim(), "",
          `${lesson.slug}/${step.id} keeps ordinary paginated content in QA context`);
      }
      await previous();
      const restoredContentPage = await qaState();
      assert.ok(restoredContentPage.counter.includes(`sayfa 1/${contentPageCount}`),
        `${lesson.slug}/${step.id} backward navigation restores its opening content page`);
      assert.equal(restoredContentPage.focus.trim(), "",
        `${lesson.slug}/${step.id} restores the question-only opening on back navigation`);
    }
    questionSweep.push({ slug: lesson.slug, id: step.id, modern: opened.modern });
    if (questionSweep.length % 50 === 0) {
      console.log(`[sunum-web] Production question opening-state sweep progress: ${questionSweep.length}/${allQuestionCases.length}`);
    }
  }
  assert.equal(questionSweep.length, allQuestionCases.length,
    "every semantically eligible production answer-reveal URL completed the opening-state sweep");
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
  // Total comparison count is already checked against the source catalog above.
  // Do not pin it a second time: authoring may legitimately change a layout.
  assert.equal(excludedComparisonCases.length + eligibleComparisonCases.length, sourceComparisonCount,
    "all source comparisons are either QA-eligible or explicitly excluded");
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

  const animationQuestion = allQuestionCases.find(({ step }) => usesModernQuestionLayout(step) &&
    !["process", "assessment", "reference"].includes(step.layout));
  assert.ok(animationQuestion, "canonical catalog contains a question eligible for the QA prompt transition");
  await openStep(animationQuestion.lesson.slug, animationQuestion.step.id);
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
  await openStep(animationQuestion.lesson.slug, animationQuestion.step.id);
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
    await openStep(animationQuestion.lesson.slug, animationQuestion.step.id);
    await next(); // Vocabulary answer group
    const metrics = await qaViewportMetrics();
    assert.equal(metrics.width, width, `QA viewport width is ${width}`);
    assert.equal(metrics.height, height, `QA viewport height is ${height}`);
    assert.equal(metrics.horizontalOverflow, false, `QA stage has no horizontal clipping at ${width}×${height}`);
    assert.ok(metrics.focusText, `QA focus stage is populated at ${width}×${height}`);
    assert.equal(metrics.focusStageVisible, true, `QA focus stage intersects the visible body at ${width}×${height}`);
  }
  await page.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

  if (interleavedAnswerCandidates.length) {
    const { lesson, step } = interleavedAnswerCandidates[0];
    const entry = findStep(lesson.slug, step.id);
    const interleave = step.presentation.interleave;
    const groupSize = typeof interleave === "object" ? interleave.group_size : 3;
    const omitted = new Set(step.presentation.omit_sections ?? []);
    const expectedEntries = Object.entries(step.answer.answer_sections).filter(([key]) => !omitted.has(key));
    const expectedGroups = [];
    for (let index = 0; index < expectedEntries.length; index += groupSize) {
      expectedGroups.push(expectedEntries.slice(index, index + groupSize).map(([term]) => term));
    }
    assert.ok(expectedGroups.length > 1, `${lesson.slug}/${step.id} has multiple current interleave groups`);
    const opened = await openStep(lesson.slug, step.id);
    assert.ok(opened.text.includes(step.prompt), `${lesson.slug}/${step.id} opens with its current prompt`);
    const initialState = await qaState();
    assert.equal(initialState.modern, true, `${lesson.slug}/${step.id} uses the QA question shell`);
    assert.equal(initialState.focus.trim(), "", `${lesson.slug}/${step.id} starts with an empty answer stage`);
    const initialGroup = await qaVocabularyStage("#canvas .slide--qa-modern .qa-context");
    assert.deepEqual(initialGroup.terms, expectedGroups[0], `${lesson.slug}/${step.id} starts with the first authored term group`);
    assert.equal(initialGroup.hiddenMeanings, expectedGroups[0].length,
      `${lesson.slug}/${step.id} hides the current group's meanings until the answer action`);

    for (let groupIndex = 0; groupIndex < expectedGroups.length; groupIndex += 1) {
      if (groupIndex > 0) {
        await next();
        const promptGroup = await qaVocabularyStage("#canvas .slide--qa-modern .qa-focus");
        assert.deepEqual(promptGroup.terms, expectedGroups[groupIndex],
          `${lesson.slug}/${step.id} advances to authored group ${groupIndex + 1}`);
        assert.equal(promptGroup.hiddenMeanings, expectedGroups[groupIndex].length,
          `${lesson.slug}/${step.id} keeps group ${groupIndex + 1} meanings hidden before reveal`);
      }
      await next();
      const answerGroup = await qaVocabularyStage("#canvas .slide--qa-modern .qa-focus");
      assert.deepEqual(answerGroup.terms, expectedGroups[groupIndex],
        `${lesson.slug}/${step.id} reveals group ${groupIndex + 1} in authored order`);
      assert.equal(answerGroup.hiddenMeanings, 0,
        `${lesson.slug}/${step.id} reveals every meaning in group ${groupIndex + 1}`);
      if (groupIndex === 0) {
        await previous();
        assert.equal((await qaState()).focus.trim(), "",
          `${lesson.slug}/${step.id} backward navigation hides the first answer group again`);
        await next();
        const restoredAnswerGroup = await qaVocabularyStage("#canvas .slide--qa-modern .qa-focus");
        assert.deepEqual(restoredAnswerGroup.terms, expectedGroups[0],
          `${lesson.slug}/${step.id} forward navigation restores the first authored group`);
        assert.equal(restoredAnswerGroup.hiddenMeanings, 0,
          `${lesson.slug}/${step.id} restores the revealed meanings after forward navigation`);
      }
    }
  }

  if (multiUnitEvidenceCases.length) {
    const { lesson, step } = multiUnitEvidenceCases[0];
    const responseUnits = step.presentation.web.units.filter((unit) => unit.section_keys?.length && unit.evidence_sections?.length);
    const firstUnit = responseUnits[0];
    const secondUnit = responseUnits[1];
    const answerTextFor = (unit) => unit.section_keys
      .map((key) => firstSourceString(step.answer.answer_sections?.[key]))
      .filter(Boolean).join(" ");
    const evidenceTextFor = (unit) => unit.evidence_sections
      .map(({ section_key }) => firstSourceString(step.answer.answer_sections?.[section_key]))
      .filter(Boolean).join(" ");
    const firstAnswerMarker = answerTextFor(firstUnit).trim().slice(0, 30);
    const secondAnswerMarker = answerTextFor(secondUnit).trim().slice(0, 30);
    const firstEvidenceMarker = evidenceTextFor(firstUnit).trim().slice(0, 30);
    assert.ok(firstAnswerMarker.length > 10 && secondAnswerMarker.length > 10 && firstEvidenceMarker.length > 10,
      `${lesson.slug}/${step.id} has independent answer and evidence markers for multiple authored units`);
    await openStep(lesson.slug, step.id);
    const firstAnswer = await advanceUntil((text) => text.includes(firstAnswerMarker), `${lesson.slug}/${step.id} first answer unit`, 64);
    assert.ok(!firstAnswer.includes(secondAnswerMarker), `${lesson.slug}/${step.id} keeps the next answer unit closed`);
    const firstEvidence = await advanceUntil((text) => text.includes(firstEvidenceMarker), `${lesson.slug}/${step.id} first evidence unit`, 32);
    assert.ok(firstEvidence.includes(firstAnswerMarker), `${lesson.slug}/${step.id} keeps the related answer beside its evidence`);
    assert.ok(!firstEvidence.includes(secondAnswerMarker), `${lesson.slug}/${step.id} does not leak the following unit into first evidence`);
    const secondAnswer = await advanceUntil((text) => text.includes(secondAnswerMarker), `${lesson.slug}/${step.id} next answer unit`, 48);
    assert.ok(secondAnswer.includes(secondAnswerMarker), `${lesson.slug}/${step.id} advances to the next authored answer unit`);
  }

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

  if (process.env.THEME1_ONLY !== "1") {
  let screen;
  const answerBehaviorCase = allQuestionCases.find(({ step }) => answerLayerMarker(step, "answer"));
  assert.ok(answerBehaviorCase, "canonical catalog contains an answer independent from its question prompt");
  const { lesson: answerLesson, step: answerStep } = answerBehaviorCase;
  screen = await openStep(answerLesson.slug, answerStep.id);
  let visible = await bodyText();
  const answerMarker = assertLayerHidden(answerStep, visible, "answer", `${answerLesson.slug}/${answerStep.id}`);
  assert.equal((await qaState()).focus.trim(), "", `${answerLesson.slug}/${answerStep.id} opens without a response layer`);
  let answerOpened = false;
  for (let attempt = 0; attempt < 64; attempt += 1) {
    await next();
    visible = await bodyText();
    if (visible.normalize("NFC").replace(/\s+/gu, " ").includes(answerMarker)) {
      answerOpened = true;
      break;
    }
    assertLayerHidden(answerStep, visible, "answer", `${answerLesson.slug}/${answerStep.id} before reveal`);
  }
  assert.equal(answerOpened, true, `${answerLesson.slug}/${answerStep.id} reveals the canonical answer after navigation`);
  assertLayerVisible(visible, answerMarker, "answer", `${answerLesson.slug}/${answerStep.id}`);
  assert.ok((await answerPanelText()).trim(), `${answerLesson.slug}/${answerStep.id} renders the response panel`);

  const explanationBehaviorCase = allQuestionCases.find(({ step }) =>
    step.answer?.explanation && step.reveals?.includes("explanation") && answerLayerMarker(step, "explanation"));
  if (explanationBehaviorCase) {
    const { lesson, step } = explanationBehaviorCase;
    await openStep(lesson.slug, step.id);
    const explanationText = await bodyText();
    const explanationMarker = assertLayerHidden(step, explanationText, "explanation", `${lesson.slug}/${step.id}`);
    await page.send("Input.dispatchKeyEvent", { type: "keyDown", key: "a", code: "KeyA", windowsVirtualKeyCode: 65 });
    await page.send("Input.dispatchKeyEvent", { type: "keyUp", key: "a", code: "KeyA", windowsVirtualKeyCode: 65 });
    const revealedExplanation = await until(async () => {
      const text = await bodyText();
      return await page.evaluate("Boolean(document.querySelector('#canvas .panel--explanation'))") ? text : null;
    }, `${lesson.slug}/${step.id} teacher explanation shortcut`);
    assertLayerVisible(revealedExplanation, explanationMarker, "explanation", `${lesson.slug}/${step.id}`);
    await page.send("Input.dispatchKeyEvent", { type: "keyDown", key: "a", code: "KeyA", windowsVirtualKeyCode: 65 });
    await page.send("Input.dispatchKeyEvent", { type: "keyUp", key: "a", code: "KeyA", windowsVirtualKeyCode: 65 });
    const closedExplanation = await until(async () => {
      const text = await bodyText();
      return !(await page.evaluate("Boolean(document.querySelector('#canvas .panel--explanation'))")) ? text : null;
    }, `${lesson.slug}/${step.id} teacher explanation shortcut close`);
    assertLayerHidden(step, closedExplanation, "explanation", `${lesson.slug}/${step.id} after closing explanation`);
  }

  const videoReferenceCase = lessons.flatMap((lesson) => lesson.steps.map((step) => ({ lesson, step })))
    .map((entry) => ({ ...entry, source: (entry.step.content?.sources ?? []).find((source) => /(?:\.mp4|video|eba)/iu.test(source.url)) }))
    .find((entry) => entry.source);
  assert.ok(videoReferenceCase, "canonical catalog contains a source-backed video reference");
  await openStep(videoReferenceCase.lesson.lesson_slug, videoReferenceCase.step.id);
  const videoLinkState = await page.evaluate(`(() => Array.from(document.querySelectorAll('#canvas .source-links a'))
    .map((anchor) => ({ href: anchor.href, label: anchor.innerText.trim() }))
    .find((anchor) => /(?:\.mp4|video|eba)/iu.test(anchor.href)) ?? null)()`);
  assert.ok(videoLinkState, `${videoReferenceCase.lesson.lesson_slug}/${videoReferenceCase.step.id} renders its video link`);
  assert.equal(videoLinkState.href, new URL(videoReferenceCase.source.url).href,
    "rendered video link targets the canonical source URL");
  assert.match(videoLinkState.href, /^https:\/\//u, "video source opens over HTTPS");
  assert.ok(videoLinkState.label, "video source link has a readable student-facing label");

  for (const [themeId, candidate] of evidencePresentationCases) {
    assert.ok(candidate, `${themeId} has a canonical answer/evidence presentation`);
    const { lesson, step, unit } = candidate;
    screen = await openStep(lesson.lesson_slug, step.id);
    const evidenceValue = step.answer.answer_sections?.[unit.evidence_sections[0].section_key];
    const sourceSnippet = firstSourceString(evidenceValue).trim().slice(0, 44);
    assert.ok(sourceSnippet.length > 10, `${themeId}/${step.id} has authored evidence text`);
    assert.ok(!screen.text.includes(sourceSnippet), `${themeId}/${step.id} keeps evidence hidden on the task view`);
    const responseKey = unit.section_keys?.[0];
    const responseValue = responseKey ? step.answer.answer_sections?.[responseKey] : step.answer.answer;
    const responseSnippet = firstSourceString(responseValue).trim().slice(0, 34);
    assert.ok(responseSnippet.length > 10, `${themeId}/${step.id} has an authored answer marker`);
    const responseText = await advanceUntil((text) => text.includes(responseSnippet), `${themeId} linked answer`, 48);
    assert.ok(responseText.includes(responseSnippet), `${themeId}/${step.id} reveals its answer before evidence`);
    const evidenceText = await advanceUntilEvidenceSection(unit.evidence_sections[0].section_key, `${themeId}/${step.id}`);
    assert.ok(evidenceText.includes(sourceSnippet), `${themeId}/${step.id} reveals its linked evidence`);
    assert.ok((await answerPanelText()).trim(), `${themeId}/${step.id} keeps the answer visible with evidence`);
    const quotePanel = await page.evaluate("document.querySelector('#canvas .panel--evidence .quotes')?.innerText ?? ''");
    for (const quoteIndex of unit.inline_quote_indexes ?? []) {
      const quote = step.answer.evidence_quotes[quoteIndex];
      assert.ok(!quotePanel.includes(quote), `${themeId}/${step.id} does not duplicate inline quote ${quoteIndex} as a card`);
    }
  }

  await page.send("Page.setDownloadBehavior", { behavior: "allow", downloadPath: profile });
  const downloadCase = lessons.flatMap((lesson) => lesson.steps.map((step) => ({ lesson, step })))
    .find(({ step }) => (step.content?.sources ?? []).some((source) => source.download === true));
  assert.ok(downloadCase, "canonical presentation data declares a downloadable resource");
  await openStep(downloadCase.lesson.lesson_slug, downloadCase.step.id);
  let downloadLink = await page.evaluate("(() => { const a = document.querySelector('#canvas .source-links a[download]'); return a && {href:a.href, label:a.textContent.trim(), target:a.getAttribute('target'), download:a.hasAttribute('download')}; })()");
  for (let attempt = 0; attempt < 24 && !downloadLink; attempt += 1) {
    await next();
    downloadLink = await page.evaluate("(() => { const a = document.querySelector('#canvas .source-links a[download]'); return a && {href:a.href, label:a.textContent.trim(), target:a.getAttribute('target'), download:a.hasAttribute('download')}; })()");
  }
  assert.ok(downloadLink?.label, `${downloadCase.lesson.lesson_slug}/${downloadCase.step.id} exposes its download label`);
  assert.equal(downloadLink.download, true, "downloadable resources use the download interaction");
  assert.equal(downloadLink.target, null, "local downloads stay in the presentation tab");
  const authoredDownload = downloadCase.step.content.sources.find((source) => source.download === true);
  assert.ok(downloadLink.href.includes(authoredDownload.url), "rendered download URL matches the canonical resource");
  const downloadFilename = decodeURIComponent(path.basename(new URL(downloadLink.href).pathname));
  await page.evaluate("document.querySelector('#canvas .source-links a[download]')?.click()");
  const downloadedFile = await until(() => {
    const file = fs.readdirSync(profile).find((name) => name === downloadFilename);
    return file ? path.join(profile, file) : null;
  }, "authored assessment document download");
  const downloadedBytes = fs.readFileSync(downloadedFile);
  assert.deepEqual([...downloadedBytes.subarray(0, 4)], [0x50, 0x4b, 0x03, 0x04],
    "declared assessment document downloads as a valid ZIP package");
  assert.ok(downloadedBytes.length > 0, "downloaded document is non-empty");

  await page.send("Emulation.setDeviceMetricsOverride", { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
  const pairedVisualCase = builtCatalog.lessons.flatMap((lesson) => lesson.steps.map((step) => ({
    lesson,
    step,
    unit: step.presentation?.web?.units?.find((candidate) => candidate.evidence_sections?.length)
  }))).filter(({ step, unit }) => unit && usesModernQuestionLayout(step) &&
    !["process", "assessment", "reference"].includes(step.layout))
    .sort((left, right) => left.lesson.steps.length - right.lesson.steps.length)[0];
  assert.ok(pairedVisualCase, "catalog has a QA-modern answer/evidence pair for export comparison");
  await openStep(pairedVisualCase.lesson.slug, pairedVisualCase.step.id);
  const qaLessonPromptScreenshot = await captureQaScreenshot(`${pairedVisualCase.step.id} QA prompt`);
  const pairedVisualUnit = pairedVisualCase.unit;
  await advanceUntilEvidenceSection(pairedVisualUnit.evidence_sections[0].section_key,
    `${pairedVisualCase.step.id} visual evidence`);
  const visualQa = await qaState();
  assert.equal(visualQa.modern, true, `${pairedVisualCase.step.id} uses the QA shell`);
  assert.ok((await answerPanelText()).trim(), `${pairedVisualCase.step.id} keeps its answer visible`);
  assert.ok((await evidencePanelText()).trim(), `${pairedVisualCase.step.id} shows its authored evidence`);
  const qaPairScreenshot = await captureQaScreenshot(`${pairedVisualCase.step.id} paired answer/evidence`);
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
  assert.ok(pptxCaptureTransitions.visualCaptureCount > 0, "PPTX capture renders slide PNGs in presentation order");
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
  assert.ok(pptxBytes.length > 0, "downloaded PPTX is non-empty");
  const pptxEntries = execFileSync("unzip", ["-Z1", downloadedPptx], { encoding: "utf8" });
  const embeddedSlideCount = (pptxEntries.match(/ppt\/media\/slide\d+\.png/g) || []).length;
  assert.equal(embeddedSlideCount, pptxCaptureTransitions.visualCaptureCount,
    "PPTX embeds every slide image captured by the browser export");
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
