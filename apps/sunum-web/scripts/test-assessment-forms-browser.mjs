import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(appRoot, "../..");
const chrome = process.env.CHROME;
if (!chrome) throw new Error("Set CHROME to a Chrome/Chromium executable to run this real-browser test.");
const port = Number(process.env.PORT || 5185);
const root = `http://127.0.0.1:${port}`;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "sunum-assessment-cdp-"));
const server = spawn(process.execPath, [path.join(appRoot, "scripts/serve.mjs")], {
  env: { ...process.env, PORT: String(port) }, stdio: "ignore"
});
const browser = spawn(chrome, [
  "--headless=new", "--no-sandbox", "--disable-gpu", "--disable-popup-blocking", "--no-first-run",
  "--remote-allow-origins=*", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank"
], { stdio: "ignore" });
const clients = [];
const files = [
  ["karagoz", "s35-peer-form", "OGM2025TDE11135akran.docx"],
  ["konusma", "s58-feedback", "19XU4J2J.docx"],
  ["konusma", "s59-rubric", "iletisim-engelleri-drama-rubrik.docx"],
  ["yazma", "s78-rubric", "19XU4J2K.docx"],
  ["tema-2-konusma", "s135-reference", "19XU4J2L.docx"],
  ["tema-2-konusma", "s135-peer-form", "19XU4J2M.docx"],
  ["tema-2-yazma", "s153-rubric", "19XU4J2N.docx"],
  ["tema-2-yazma", "s153-peer-form", "OGM2025TDE11153akran.docx"],
  ["kemal-tahir-mulakat-210-214", "s214-rubric", "19XU4J2O.docx"],
  ["kemal-tahir-mulakat-210-214", "s214-peer-form", "OGM2025TDE11214akran1.docx"],
  ["radyo-diyalog-yazma-225-229", "s228-rubric", "19XU4J2P.docx"],
  ["tiyatro-canlandirma-280-283", "s283-performance", "19XU4J2Q.docx"],
  ["afis-atolyesi-298-302", "s302-rubric", "19XU4J2R.docx"]
];

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

async function connectTarget(debugPort) {
  const target = await until(async () => {
    const response = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
    return (await response.json()).find((item) => item.type === "page" && item.url === "about:blank");
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
let page;

async function openStep(lessonSlug, stepId) {
  const lesson = lessons.find((entry) => entry.lesson_slug === lessonSlug);
  assert.ok(lesson, `lesson exists: ${lessonSlug}`);
  const index = lesson.steps.findIndex((step) => step.id === stepId);
  assert.ok(index >= 0, `step exists: ${lessonSlug}/${stepId}`);
  const step = lesson.steps[index];
  await page.send("Page.navigate", { url: `${root}/#/${lessonSlug}/${index + 1}` });
  await until(() => page.evaluate("document.querySelector('#canvas .slide__body')?.innerText.includes(" + JSON.stringify(step.display_prompt) + ")"), `open ${stepId}`);
  return { lesson, step };
}

async function inspectPage() {
  return page.evaluate(`(() => {
    const body = document.querySelector('#canvas .slide__body');
    return {
      text: body?.innerText ?? '',
      overflow: body?.classList.contains('is-overflowing') ?? false,
      scrollHeight: body?.scrollHeight ?? 0,
      clientHeight: body?.clientHeight ?? 0,
      scrollWidth: body?.scrollWidth ?? 0,
      clientWidth: body?.clientWidth ?? 0,
      counter: document.querySelector('#dock-counter')?.textContent ?? '',
      formWidgets: document.querySelectorAll('#canvas .assessment-resources, #menu .assessment-resources').length
    };
  })()`);
}

try {
  await until(async () => (await fetch(root)).ok, "Sunum Web local server");
  const portFile = path.join(profile, "DevToolsActivePort");
  const debugPort = await until(() => fs.existsSync(portFile)
    ? Number(fs.readFileSync(portFile, "utf8").split("\n")[0]) : null, "Chrome debugging endpoint");
  page = await connectTarget(debugPort);
  await page.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await page.send("Page.setDownloadBehavior", { behavior: "allow", downloadPath: profile });
  await page.send("Page.navigate", { url: `${root}/#/karagoz/0` });
  await until(() => page.evaluate("!document.querySelector('#gate').hidden"), "password screen");
  await page.evaluate("document.querySelector('#gate-password').value='sunum'; document.querySelector('#gate-submit').click()");
  await until(() => page.evaluate("Boolean(document.querySelector('#canvas .slide'))"), "unlocked presentation");

  let pageParts = 0;
  for (const [lessonSlug, stepId, filename] of files) {
    const { step } = await openStep(lessonSlug, stepId);
    const pagesText = [];
    let pageState = await inspectPage();
    assert.equal(pageState.formWidgets, 0, `${stepId} has no duplicate form-upload panel`);
    let marker = /·\s*(\d+)\/(\d+)/.exec(pageState.counter);
    const totalPages = marker ? Number(marker[2]) : 1;
    for (let currentPage = 1; currentPage <= totalPages; currentPage += 1) {
      assert.equal(pageState.overflow, false,
        `${lessonSlug}/${stepId} content page ${currentPage}/${totalPages} fits at 1440x900 (${pageState.scrollWidth}/${pageState.clientWidth} x ${pageState.scrollHeight}/${pageState.clientHeight})`);
      assert.ok(pageState.scrollHeight <= pageState.clientHeight + 1, `${stepId} page ${currentPage} requires no vertical scrolling`);
      assert.ok(pageState.scrollWidth <= pageState.clientWidth + 1, `${stepId} page ${currentPage} requires no horizontal scrolling`);
      pagesText.push(pageState.text);
      if (currentPage < totalPages) {
        const previous = pageState.counter;
        await page.evaluate("document.querySelector('#dock [data-action=next]').click()");
        pageState = await until(async () => {
          const result = await inspectPage();
          return result.counter !== previous ? result : null;
        }, `${stepId} content page ${currentPage + 1}`);
      }
      pageParts += 1;
    }
    const allText = pagesText.join("\n");
    const normalizedText = allText.replace(/\s+/g, " ");
    if (step.content.items?.length) {
      for (const item of step.content.items) assert.ok(allText.includes(item), `${stepId} retains the full criterion: ${item}`);
      if (step.content.scale) {
        for (const option of step.content.scale) assert.ok(allText.includes(option), `${stepId} shows scale option ${option}`);
      }
    }
    for (const section of step.content.sections || []) {
      assert.ok(allText.includes(section.title), `${stepId} retains rubric level ${section.title}`);
      if (section.body) assert.ok(normalizedText.includes(section.body.replace(/\s+/g, " ").trim()),
        `${stepId} retains full rubric descriptor for ${section.title}`);
    }
    if (stepId === "s59-rubric") assert.match(allText, /resmî MEB\/kitap anahtarı değildir/i);

    const download = await page.evaluate(`(() => {
      const a = document.querySelector('#canvas .source-links a[download]');
      return a && { href: a.href, name: a.download, label: a.textContent.trim() };
    })()`);
    assert.ok(download?.href.endsWith(`/assets/assessment-documents/${filename}`), `${stepId} links the correct DOCX asset`);
    assert.ok(download.label, `${stepId} has a named teacher download`);
    await page.evaluate("document.querySelector('#canvas .source-links a[download]').click()");
    const downloadedPath = await until(() => {
      const path = profile + "/" + filename;
      return fs.existsSync(path) ? path : null;
    }, `${filename} browser download`);
    const actual = fs.readFileSync(downloadedPath);
    const expected = fs.readFileSync(path.join(appRoot, "dist/assets/assessment-documents", filename));
    assert.deepEqual(actual, expected, `${filename} browser download matches the packaged DOCX byte-for-byte`);
    assert.deepEqual([...actual.subarray(0, 4)], [0x50, 0x4b, 0x03, 0x04], `${filename} is a real DOCX ZIP`);
    fs.rmSync(downloadedPath);
  }

  await page.evaluate("document.querySelector('#dock [data-action=menu]').click()");
  const menuWidgets = await page.evaluate("document.querySelectorAll('#menu .assessment-resources, #menu input[type=file]').length");
  assert.equal(menuWidgets, 0, "lesson menu does not expose an upload flow for already prepared resources");
  console.log(`[sunum-web] Chrome assessment check passed: ${files.length} DOCX downloads; ${pageParts} content pages fit at 1440x900 with every criterion and level rendered.`);
} finally {
  for (const client of clients) client.close();
  for (const child of [browser, server]) {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill("SIGTERM");
      await Promise.race([new Promise((resolve) => child.once("exit", resolve)), sleep(3000)]);
    }
  }
  fs.rmSync(profile, { recursive: true, force: true });
}
