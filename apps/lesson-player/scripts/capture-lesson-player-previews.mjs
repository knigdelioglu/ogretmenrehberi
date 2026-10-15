import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";

const here = path.dirname(fileURLToPath(import.meta.url));
const rootOrigin = "http://127.0.0.1:4173";

function option(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index < 0) return fallback;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} needs a value.`);
  return value;
}

const chrome = process.env.CHROME;
if (!chrome) throw new Error("CHROME must point to Chrome or Chromium.");

const baseUrl = new URL(option("--base-url", `${rootOrigin}/`));
if (!baseUrl.pathname.endsWith("/")) baseUrl.pathname += "/";
const outputDir = path.resolve(option("--output-dir", process.cwd()));
const lessons = JSON.parse(fs.readFileSync(path.join(here, "../src/generated/lessons.json"), "utf8"));
function buildCaptures() {
  const captures = [];
  const layouts = new Set(["question", "comparison", "structure", "process", "assessment", "reference", "vocabulary"]);
  const add = (lesson, step, name, display = true) => {
    captures.push({
      file: `lesson-player-${name}.png`,
      width: 1440,
      height: 900,
      url: new URL(`?${display ? "display=1&" : ""}lesson=${encodeURIComponent(lesson.lesson_id)}&step=${encodeURIComponent(step.id)}`, baseUrl).toString()
    });
  };
  for (const themeId of [...new Set(lessons.map((lesson) => lesson.theme_id))]) {
    const themeLessons = lessons.filter((lesson) => lesson.theme_id === themeId);
    const themeName = themeId.toLowerCase().replace(/[^a-z0-9-]+/gu, "-");
    for (const layout of layouts) {
      const lesson = themeLessons.find((candidate) => candidate.steps.some((step) => step.layout === layout));
      const step = lesson?.steps.find((candidate) => candidate.layout === layout);
      if (lesson && step) add(lesson, step, `${themeName}-${layout}`);
    }
    const teacherQuestion = themeLessons.flatMap((lesson) => lesson.steps.map((step) => ({ lesson, step })))
      .find(({ step }) => step.answer?.answer && step.reveal_order?.includes("answer"));
    if (teacherQuestion) add(teacherQuestion.lesson, teacherQuestion.step, `${themeName}-teacher-answer`, false);
    const guidanceQuestion = themeLessons.flatMap((lesson) => lesson.steps.map((step) => ({ lesson, step })))
      .find(({ step }) => step.answer?.guidance && step.reveal_order?.includes("guidance"));
    if (guidanceQuestion) add(guidanceQuestion.lesson, guidanceQuestion.step, `${themeName}-teacher-guidance`, false);
  }
  assert.ok(captures.length > 0, "current catalog provides at least one representative preview capture");
  return captures;
}
const captures = buildCaptures();

const profile = fs.mkdtempSync(path.join(os.tmpdir(), "lesson-player-preview-"));
const chromeProcess = spawn(chrome, [
  "--headless=new",
  "--no-sandbox",
  "--disable-gpu",
  "--disable-dev-shm-usage",
  "--no-first-run",
  "--disable-extensions",
  "--remote-allow-origins=*",
  "--remote-debugging-address=127.0.0.1",
  "--remote-debugging-port=0",
  `--user-data-dir=${profile}`,
  "about:blank"
], { stdio: ["ignore", "ignore", "pipe"] });

let chromeStderr = "";
chromeProcess.stderr.on("data", (chunk) => {
  chromeStderr = (chromeStderr + chunk.toString()).slice(-4000);
});

let socket;
let pageSession;
let nextCommandId = 0;
const pendingCommands = new Map();
const protocolListeners = new Set();

function onProtocolMessage(event) {
  const message = JSON.parse(String(event.data));
  if (message.id && pendingCommands.has(message.id)) {
    const pending = pendingCommands.get(message.id);
    pendingCommands.delete(message.id);
    clearTimeout(pending.timeout);
    if (message.error) pending.reject(new Error(message.error.message));
    else pending.resolve(message.result);
    return;
  }
  for (const listener of protocolListeners) listener(message);
}

function send(method, params = {}, sessionId) {
  const id = ++nextCommandId;
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingCommands.delete(id);
      reject(new Error(`Chrome DevTools command timed out: ${method}`));
    }, 30000);
    pendingCommands.set(id, { resolve, reject, timeout });
    socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
}

function waitForEvent(method, sessionId, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      protocolListeners.delete(listener);
      reject(new Error(`Chrome DevTools event timed out: ${method}`));
    }, timeoutMs);
    const listener = (message) => {
      if (message.method !== method || message.sessionId !== sessionId) return;
      clearTimeout(timeout);
      protocolListeners.delete(listener);
      resolve(message.params);
    };
    protocolListeners.add(listener);
  });
}

async function connectChrome() {
  const activePort = path.join(profile, "DevToolsActivePort");
  const deadline = Date.now() + 30000;
  let port;
  while (Date.now() < deadline) {
    if (chromeProcess.exitCode !== null) {
      throw new Error(`Chrome exited before DevTools started. ${chromeStderr}`);
    }
    if (fs.existsSync(activePort)) {
      port = Number(fs.readFileSync(activePort, "utf8").split("\n", 1)[0]);
      if (Number.isInteger(port) && port > 0) break;
    }
    await sleep(100);
  }
  if (!port) throw new Error(`Chrome DevTools did not start. ${chromeStderr}`);

  const response = await fetch(`http://127.0.0.1:${port}/json/version`);
  if (!response.ok) throw new Error(`Chrome DevTools returned HTTP ${response.status}.`);
  const { webSocketDebuggerUrl } = await response.json();
  socket = new WebSocket(webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Chrome DevTools WebSocket did not open.")), 15000);
    socket.addEventListener("open", () => {
      clearTimeout(timeout);
      resolve();
    }, { once: true });
    socket.addEventListener("error", () => {
      clearTimeout(timeout);
      reject(new Error(`Chrome DevTools WebSocket failed. ${chromeStderr}`));
    }, { once: true });
  });
  socket.addEventListener("message", onProtocolMessage);
  socket.addEventListener("error", () => {
    for (const pending of pendingCommands.values()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error("Chrome DevTools WebSocket closed unexpectedly."));
    }
    pendingCommands.clear();
  });
}

async function createPageSession() {
  const { browserContextId } = await send("Target.createBrowserContext", { disposeOnDetach: true });
  const { targetId } = await send("Target.createTarget", { url: "about:blank", browserContextId });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  await send("Page.enable", {}, sessionId);
  await send("Runtime.enable", {}, sessionId);
  let currentOrigin = null;
  try {
    return {
      sessionId,
      async navigate(url, width, height) {
        const nextOrigin = new URL(url).origin;
        if (currentOrigin === nextOrigin) {
          await send("Runtime.evaluate", {
            expression: "localStorage.clear(); sessionStorage.clear()"
          }, sessionId);
        }
        await send("Emulation.setDeviceMetricsOverride", {
          width,
          height,
          deviceScaleFactor: 1,
          mobile: false,
          screenWidth: width,
          screenHeight: height
        }, sessionId);
        const loaded = waitForEvent("Page.loadEventFired", sessionId);
        await send("Page.navigate", { url }, sessionId);
        await loaded;
        await send("Runtime.evaluate", {
          expression: "new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))",
          awaitPromise: true,
          returnByValue: true
        }, sessionId);
        await waitForAppShell(sessionId, url);
        currentOrigin = nextOrigin;
      },
      async close() {
        await send("Target.closeTarget", { targetId }).catch(() => {});
        await send("Target.disposeBrowserContext", { browserContextId }).catch(() => {});
      }
    };
  } catch (error) {
    await send("Target.closeTarget", { targetId }).catch(() => {});
    await send("Target.disposeBrowserContext", { browserContextId }).catch(() => {});
    throw error;
  }
}

async function evaluate(sessionId, expression) {
  const response = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true
  }, sessionId);
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.text);
  return response.result.value;
}

async function waitForAppShell(sessionId, url) {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    if (await evaluate(sessionId, "Boolean(document.querySelector('#root > .app-shell'))")) return;
    await sleep(50);
  }
  const html = await evaluate(sessionId, "document.documentElement.outerHTML");
  throw new Error(`Lesson Player did not render for ${url}: ${html.slice(0, 800)}`);
}

function captureUrl(manifestUrl) {
  const original = new URL(manifestUrl);
  return new URL(`${original.pathname}${original.search}${original.hash}`, baseUrl).toString();
}

async function verifyDom(page, url, width, height, verify) {
  await page.navigate(url, width, height);
  const html = await evaluate(page.sessionId, "document.documentElement.outerHTML");
  verify(html);
}

async function capture(page, entry) {
  const outputPath = path.join(outputDir, entry.file);
  const url = captureUrl(entry.url);
  await page.navigate(url, entry.width, entry.height);
  const response = await send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false
  }, page.sessionId);
  fs.writeFileSync(outputPath, Buffer.from(response.data, "base64"));
}

const startedAt = Date.now();
try {
  fs.mkdirSync(outputDir, { recursive: true });
  const preview = await fetch(baseUrl);
  if (!preview.ok) throw new Error(`Preview server returned HTTP ${preview.status}.`);
  await connectChrome();
  pageSession = await createPageSession();

  await verifyDom(pageSession, baseUrl.toString(), 1440, 900, (html) => {
    assert.ok(html.includes('id="pptx-export-trigger"'), "PPTX export control is present");
  });

  const answerCase = lessons.flatMap((lesson) => lesson.steps.map((step) => ({ lesson, step })))
    .find(({ step }) => step.answer?.answer && step.reveal_order?.includes("answer"));
  assert.ok(answerCase, "current catalog provides an answer-reveal interaction preview");
  const questionUrl = new URL(`?lesson=${encodeURIComponent(answerCase.lesson.lesson_id)}&step=${encodeURIComponent(answerCase.step.id)}`, baseUrl).toString();
  await verifyDom(pageSession, questionUrl, 1366, 768, (html) => {
    assert.ok(html.includes('aria-label="Cevabı göster"'), `${answerCase.step.id} answer reveal control is accessible`);
    assert.ok(!html.includes("Göster: Cevap"), "legacy answer control text is absent");
  });

  const guidanceCase = lessons.flatMap((lesson) => lesson.steps.map((step) => ({ lesson, step })))
    .find(({ step }) => step.answer?.guidance && step.reveal_order?.includes("guidance"));
  if (guidanceCase) {
    const guidanceUrl = new URL(`?lesson=${encodeURIComponent(guidanceCase.lesson.lesson_id)}&step=${encodeURIComponent(guidanceCase.step.id)}`, baseUrl).toString();
    await verifyDom(pageSession, guidanceUrl, 1366, 768, (html) => {
      assert.ok(html.includes('aria-label="Yönlendirmeyi göster"'), `${guidanceCase.step.id} guidance reveal control is accessible`);
      assert.ok(!html.includes("Göster: Yönlendirme"), "legacy guidance control text is absent");
    });
  }

  for (let index = 0; index < captures.length; index += 1) {
    const entry = captures[index];
    assert.equal(path.basename(entry.file), entry.file, `capture filename must stay in output directory: ${entry.file}`);
    assert.ok(Number.isInteger(entry.width) && Number.isInteger(entry.height), `capture size is invalid: ${entry.file}`);
    await capture(pageSession, entry);
    if ((index + 1) % 25 === 0 || index === captures.length - 1) {
      console.log(`[lesson-player] captured ${index + 1}/${captures.length} previews`);
    }
  }

  for (const entry of captures) {
    assert.ok(fs.statSync(path.join(outputDir, entry.file)).size > 0, `screenshot is empty: ${entry.file}`);
  }
  console.log(`[lesson-player] DOM smoke checks passed; ${captures.length} previews captured in ${((Date.now() - startedAt) / 1000).toFixed(1)}s.`);
} finally {
  await pageSession?.close();
  socket?.close();
  if (chromeProcess.exitCode === null) {
    const exited = new Promise((resolve) => chromeProcess.once("exit", resolve));
    chromeProcess.kill("SIGTERM");
    await Promise.race([exited, sleep(5000)]);
    if (chromeProcess.exitCode === null) chromeProcess.kill("SIGKILL");
  }
  fs.rmSync(profile, { recursive: true, force: true });
}
