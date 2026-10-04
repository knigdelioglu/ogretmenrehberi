import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(appRoot, "../..");
const distRoot = path.join(appRoot, "dist");
const catalogPath = path.join(repoRoot, "apps/lesson-player/src/generated/lessons.json");
const chrome = process.env.CHROME;
if (!chrome) throw new Error("Set CHROME to a Chrome/Chromium executable to run this real-browser test.");
if (!fs.existsSync(path.join(distRoot, "index.html"))) {
  throw new Error("Production sunum-web/dist/index.html is missing; run the common production build first.");
}
if (!fs.existsSync(catalogPath)) throw new Error("Production lesson catalog is missing.");
const port = Number(process.env.PORT || 5184);
const root = "http://127.0.0.1:" + port;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "sunum-theme4-cdp-"));
const server = spawn(process.execPath, [path.join(appRoot, "scripts/serve.mjs")], {
  env: { ...process.env, PORT: String(port) }, stdio: "ignore"
});
const browser = spawn(chrome, [
  "--headless=new", "--no-sandbox", "--disable-gpu", "--disable-popup-blocking", "--no-first-run",
  "--remote-allow-origins=*", "--remote-debugging-port=0", "--user-data-dir=" + profile, "about:blank"
], { stdio: "ignore" });
const clients = [];

async function stopChild(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  const exited = new Promise((resolve) => child.once("exit", resolve));
  child.kill("SIGTERM");
  await Promise.race([exited, sleep(3000)]);
  if (child.exitCode === null && child.signalCode === null) {
    const stopped = new Promise((resolve) => child.once("exit", resolve));
    child.kill("SIGKILL");
    await Promise.race([stopped, sleep(1000)]);
  }
}

async function until(check, label, timeout = 15000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      const result = await check();
      if (result) return result;
    } catch { /* a navigation can briefly replace the execution context */ }
    await sleep(80);
  }
  throw new Error("Timed out: " + label);
}

async function connectTarget(debugPort) {
  const target = await until(async () => {
    const response = await fetch("http://127.0.0.1:" + debugPort + "/json/list");
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
    const pair = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) pair.reject(new Error(message.error.message));
    else pair.resolve(message.result);
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

const lessons = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
function findStep(slug, id) {
  const lesson = lessons.find((entry) => entry.lesson_slug === slug);
  const index = lesson?.steps.findIndex((step) => step.id === id) ?? -1;
  assert.ok(index >= 0, "production catalog contains " + slug + "/" + id);
  return { lesson, step: lesson.steps[index], slide: index + 1 };
}

let page;
async function bodyText() {
  return page.evaluate("document.querySelector('#canvas .slide__body')?.innerText ?? ''");
}
async function clickAction(action) {
  await page.evaluate("document.querySelector('#dock [data-action=" + action + "]').click()");
  await sleep(400);
  return bodyText();
}
const next = () => clickAction("next");
const previous = () => clickAction("prev");

async function openStep(slug, id) {
  const entry = findStep(slug, id);
  await page.send("Page.navigate", { url: root + "#/" + entry.lesson.lesson_slug + "/" + entry.slide });
  await until(async () => (await bodyText()).includes(entry.step.display_prompt), "open " + id);
  await until(() => page.evaluate(
    "Array.from(document.querySelectorAll('#canvas .content-images img')).every(image => image.complete && image.naturalWidth > 0)"
  ), "source images for " + id);
  return { ...entry, text: await bodyText() };
}

async function advanceUntil(predicate, label, max = 16) {
  let current = await bodyText();
  const summarize = (text) => text.split("\n").filter(Boolean).slice(0, 4).join(" / ").slice(0, 180);
  const trail = [summarize(current)];
  for (let index = 0; index < max; index += 1) {
    if (predicate(current)) return current;
    current = await next();
    trail.push(summarize(current));
    if (trail.length > 8) trail.shift();
  }
  assert.fail("Could not reach " + label + "; recent reveal trail: " + trail.join(" → "));
}

async function answerHeadings() {
  return page.evaluate(
    "Array.from(document.querySelectorAll('#canvas .panel--answer .sec h3')).map((heading) => heading.textContent.trim())"
  );
}

async function advanceUntilAnswerHeading(name, max = 16) {
  for (let index = 0; index < max; index += 1) {
    const headings = await answerHeadings();
    if (headings.includes(name)) return { headings, text: await bodyText() };
    await next();
  }
  assert.fail("Could not reach answer heading " + name);
}

function normalized(value) {
  return String(value).normalize("NFC").toLocaleLowerCase("tr").replace(/[^\p{L}\p{N}]/gu, "");
}
function occurrences(text, excerpt) {
  const haystack = normalized(text);
  const needle = normalized(excerpt);
  if (!needle) return 0;
  let count = 0;
  let offset = 0;
  while ((offset = haystack.indexOf(needle, offset)) >= 0) {
    count += 1;
    offset += needle.length;
  }
  return count;
}

try {
  await until(async () => (await fetch(root)).ok, "static server for production dist");
  const portFile = path.join(profile, "DevToolsActivePort");
  const debugPort = await until(() => fs.existsSync(portFile)
    ? Number(fs.readFileSync(portFile, "utf8").split("\n")[0]) : null, "Chrome debugging endpoint");
  page = await connectTarget(debugPort);
  await page.send("Emulation.setDeviceMetricsOverride", {
    width: 1440, height: 900, deviceScaleFactor: 1, mobile: false
  });
  await page.send("Page.navigate", { url: root + "#/degerlendirme-303-307/0" });
  await until(() => page.evaluate("!document.querySelector('#gate').hidden"), "password screen");
  const password = process.env.SUNUM_SIFRE || "sunum";
  await page.evaluate(`(() => {
    const field = document.querySelector('#gate-password');
    field.value = ${JSON.stringify(password)};
    document.querySelector('#gate-form').requestSubmit();
  })()`);
  await until(() => page.evaluate("Boolean(document.querySelector('#canvas .slide'))"), "unlocked production site");

  // A single structured response takes the full content column and keeps its
  // evidence on a following reveal.
  let screen = await openStep("degerlendirme-303-307", "s304-q2");
  assert.ok(!screen.text.includes("Doğru seçenek: A"), "objective answer is hidden on the task view");
  let answer = await advanceUntil((text) => text.includes("Doğru seçenek: A"), "single response answer");
  assert.ok(answer.includes("Gerekçe"), "the rationale has its own heading");
  assert.equal(await page.evaluate(
    "getComputedStyle(document.querySelector('#canvas .sections')).gridTemplateColumns.split(' ').length"
  ), 1, "one answer card fills one column");
  assert.equal(await page.evaluate("document.querySelectorAll('#canvas .panel--evidence').length"), 0,
    "answer opens before its source evidence");
  const cardWidth = await page.evaluate(
    "document.querySelector('#canvas .sections > .sec').getBoundingClientRect().width / document.querySelector('#canvas .sections').getBoundingClientRect().width"
  );
  assert.ok(cardWidth > 0.9, "the single response uses the full available width");
  const singleEvidence = await advanceUntil(
    (text) => text.toLocaleLowerCase("tr").includes("metinden kanıt"), "linked evidence after all response pages", 32
  );
  assert.ok(singleEvidence.toLocaleLowerCase("tr").includes("metinden kanıt"),
    "linked evidence opens after the answer; actual next reveal: " + singleEvidence);
  assert.equal(await page.evaluate("document.querySelectorAll('#canvas .panel--evidence').length"), 1,
    "linked source evidence has its own visible panel");
  await page.send("Emulation.setDeviceMetricsOverride", {
    width: 390, height: 844, deviceScaleFactor: 1, mobile: true
  });
  await sleep(250);
  const narrowMetrics = await page.evaluate("(() => ({viewport:window.innerWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth,columns:getComputedStyle(document.querySelector('#canvas .sections')).gridTemplateColumns.split(' ').length}))()");
  assert.ok(narrowMetrics.document <= narrowMetrics.viewport + 1, "narrow layout has no horizontal page overflow");
  assert.equal(narrowMetrics.columns, 1, "single response remains one column on a narrow screen");
  await page.send("Emulation.setDeviceMetricsOverride", {
    width: 1440, height: 900, deviceScaleFactor: 1, mobile: false
  });

  // Linked evidence text and quote cards must not repeat a quote that is
  // already embedded in the preserved evidence-pool commentary.
  screen = await openStep("ben-mimar-sinan-anlama-251-255", "s252-q2bc");
  answer = await advanceUntil((text) => text.includes("2b. Beni etkileyen özellik"), "feature-choice answer");
  assert.ok(!answer.includes("Metinden seçilebilecek kanıtlar"),
    "evidence pool is not shown as a standalone answer");
  const beforeEvidence = await next();
  assert.ok(beforeEvidence.includes("Metinden seçilebilecek kanıtlar"), "commentary moves into the evidence stage");
  assert.ok(beforeEvidence.includes("Beni etkileyen özellik"), "the related answer remains visible with evidence");
  const answerDataRoot = path.join(repoRoot, "data/grade-11/source/teacher-book/theme-4");
  const answerIndex = JSON.parse(fs.readFileSync(path.join(answerDataRoot, "answer-bank.json"), "utf8"));
  const p252 = answerIndex.parts.flatMap((part) =>
    JSON.parse(fs.readFileSync(path.join(answerDataRoot, part.path), "utf8")).entries
  ).find((entry) => entry.question_id === "T4-P252-PERF02BC");
  assert.equal(p252.evidence_quotes.length, 4);
  for (const quote of p252.evidence_quotes) {
    assert.equal(occurrences(beforeEvidence, quote), 1, "embedded quote appears once in the answer/evidence view");
  }
  const back = await previous();
  assert.ok(back.includes("Beni etkileyen özellik"), "back returns to the answer while preserving its unit");
  assert.ok(!back.includes("Metinden seçilebilecek kanıtlar"), "back hides the later evidence stage");
  const forward = await next();
  assert.ok(forward.includes("Metinden seçilebilecek kanıtlar"), "forward restores the evidence stage");

  // The two deliberate table groups remain separate and open in sequence.
  screen = await openStep("ben-mimar-sinan-cozumleme-256-259", "s256-elements");
  assert.ok(screen.text.includes("Kişiler") && screen.text.includes("Dramatik örgü"));
  assert.ok(!screen.text.includes("Sinan merkezî kişidir"));
  let structure = await advanceUntil((text) => text.includes("Sinan merkezî kişidir"), "base structure group");
  const baseStructureMarkers = ["Ağırnas ve İstanbul’daki Acemi Ocağı", "Sinan’ın gençliğinden mimarbaşılık dönemine",
    "Dış çatışma:", "Sinan’ın eğitim ve gözlem dönemiyle başlayan anlatı"];
  for (const marker of baseStructureMarkers) {
    structure = await advanceUntil((text) => text.includes(marker), "base structure section " + marker);
  }
  assert.ok(!structure.includes("Sinan’ın farklı şehirlerde gözlem yapması"),
    "relationship group waits for all base structure answers");
  const relationMarkers = ["Sinan’ın farklı şehir ve yapılarda gözlem yapması", "Mekânlar yaşamının farklı evreleriyle",
    "Sinan’ın asıl çatışmaları", "Her yeni görev"];
  for (const marker of relationMarkers) {
    structure = await advanceUntil((text) => text.includes(marker), "structure relationship section " + marker);
  }

  screen = await openStep("merdiven-cozumleme-274-279", "s278-disciplines");
  assert.ok(screen.text.includes("Kurumda yaş/konum ilişkileri"));
  structure = await advanceUntil((text) => text.includes("Sosyoloji, psikoloji"), "discipline group one");
  assert.ok(structure.includes("Meslek yaşamında roller"));
  assert.ok(!structure.includes("Yaşlılık, sağlık durumu"), "group two waits for group one's answer");
  structure = await advanceUntil((text) => text.includes("Yaşlılık, sağlık durumu"), "discipline group two");
  assert.ok(structure.includes("Ölüm karşısında yaşamı sorgulama"));

  // Theme-specific vocabulary context notes must survive beside dictionary
  // reveals without opening meanings on the task view.
  for (const [slug, id, context, firstTerm] of [
    ["ben-mimar-sinan-okuma-243-250", "s247-vocab",
      "Karekodla sözlükten doğrulama yapılırken sözcüğün bu bağlamdaki anlamı esas alınabilir.", "çağdaş"],
    ["merdiven-anlama-266-270", "s266-vocabulary",
      "Önerilen karşılıklar anlamı koruyabilse de özellikle “yeni yetme” gibi ifadelerde anlatımın tonunu değiştirebilir.", "daire"],
    ["anadolu-insani-284-290", "s287-vocab",
      "videodaki kesin bağlamı kontrol etmek için karekod içeriği ve sözlük adımı birlikte kullanılmalıdır.", "fedakârlık"]
  ]) {
    screen = await openStep(slug, id);
    assert.ok(!screen.text.includes(context), id + ": context note waits for the answer reveal");
    const vocabularyAnswer = await advanceUntil((text) => text.includes(context), id + " context note");
    assert.ok(vocabularyAnswer.toLocaleLowerCase("tr").includes(firstTerm),
      id + ": context note appears with its first dictionary group");
  }

  // Theme, topic and main idea stay independent, and the unseen video remains
  // an explicit source boundary rather than invented content.
  screen = await openStep("anadolu-insani-284-290", "s288-q2");
  assert.equal(screen.step.answer.entry_type, "source_limited");
  const themeAnswer = await advanceUntilAnswerHeading("Tema");
  assert.deepEqual(themeAnswer.headings, ["Tema"], "theme is its own source-limited response");
  assert.ok(themeAnswer.text.includes("videonun gerçek içeriği izlenerek belirlenmelidir"));
  const topicAnswer = await advanceUntilAnswerHeading("Konu");
  assert.deepEqual(topicAnswer.headings, ["Konu"], "topic stays separate from theme and main idea");
  const mainIdeaAnswer = await advanceUntilAnswerHeading("Ana düşünce");
  assert.deepEqual(mainIdeaAnswer.headings, ["Ana düşünce"]);
  const supportingIdeasAnswer = await advanceUntilAnswerHeading("Yardımcı düşünceler");
  assert.deepEqual(supportingIdeasAnswer.headings, ["Yardımcı düşünceler"]);
  for (const response of [themeAnswer, topicAnswer, mainIdeaAnswer, supportingIdeasAnswer]) {
    assert.ok(response.text.includes("Fedakârlık videosu izlenerek belirlenir."),
      "unavailable video-dependent response remains source-limited");
  }
  const presentationMethodAnswer = await advanceUntilAnswerHeading("Bilgilerin Sunuluş Şekli");
  assert.deepEqual(presentationMethodAnswer.headings, ["Bilgilerin Sunuluş Şekli"]);
  assert.ok(presentationMethodAnswer.text.includes("Bilgiler, içeriği yansıtacak şekilde sunulmuştur."));

  // Verify actual production UI metrics at both desktop and phone widths.
  const wide = await page.evaluate("(() => ({viewport:window.innerWidth,document:document.documentElement.scrollWidth,canvas:document.querySelector('#canvas').getBoundingClientRect().width}))()");
  assert.ok(wide.document <= wide.viewport + 1, "wide layout has no horizontal page overflow");
  assert.ok(wide.canvas > 900, "wide production canvas uses the desktop viewport");
  await page.send("Emulation.setDeviceMetricsOverride", {
    width: 390, height: 844, deviceScaleFactor: 1, mobile: true
  });
  await sleep(250);
  const narrow = await page.evaluate("(() => ({viewport:window.innerWidth,document:document.documentElement.scrollWidth,canvas:document.querySelector('#canvas').getBoundingClientRect().width}))()");
  assert.ok(narrow.document <= narrow.viewport + 1, "narrow layout has no horizontal page overflow");
  assert.ok(narrow.canvas <= narrow.viewport + 1, "canvas fits the narrow viewport");

  console.log("Theme 4 production-dist browser QA passed: single response width, linked evidence and quote deduplication, grouped responses, vocabulary context, source_limited answers, and wide/narrow viewports.");
} finally {
  clients.forEach((client) => client.close());
  await Promise.all([stopChild(browser), stopChild(server)]);
  fs.rmSync(profile, { recursive: true, force: true, maxRetries: 8, retryDelay: 150 });
}
