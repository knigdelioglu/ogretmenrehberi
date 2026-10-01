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
const port = Number(process.env.PORT || 5181);
const root = `http://127.0.0.1:${port}`;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "sunum-web-cdp-"));
const server = spawn(process.execPath, [path.join(appRoot, "scripts/serve.mjs")], {
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
const findStep = (slug, id) => {
  const lesson = lessons.find((entry) => entry.lesson_slug === slug);
  const index = lesson?.steps.findIndex((step) => step.id === id) ?? -1;
  assert.ok(index >= 0, `fixture exists: ${slug}/${id}`);
  return { lesson, step: lesson.steps[index], slide: index + 1 };
};
let page;

async function bodyText() { return page.evaluate("document.querySelector('#canvas .slide__body')?.innerText ?? ''"); }
async function next() {
  await page.evaluate("document.querySelector('#dock [data-action=next]').click()");
  await sleep(120);
  return bodyText();
}
async function openStep(slug, id) {
  const entry = findStep(slug, id);
  await page.send("Page.navigate", { url: `${root}/#/${entry.lesson.lesson_slug}/${entry.slide}` });
  await until(async () => (await bodyText()).includes(entry.step.display_prompt), `open ${id}`);
  return { ...entry, text: await bodyText() };
}
function terms(text) {
  return page.evaluate("Array.from(document.querySelectorAll('#canvas .vocab__term, #canvas .dict dt')).map(el => el.textContent.trim())");
}
const includesText = (text, fragment) => text.toLocaleLowerCase("tr").includes(fragment.toLocaleLowerCase("tr"));
async function revealDictionaryGroup(firstTerms, nextTerms, firstMeaning, nextMeaning) {
  const initial = await bodyText();
  const initialTerms = await terms(initial);
  assert.ok(firstTerms.every((term) => includesText(initial, term)), "first term group is visible initially");
  assert.ok(!includesText(initial, firstMeaning), "first group's meaning is initially hidden");
  assert.ok(!nextTerms.some((term) => initialTerms.some((visible) => visible.toLocaleLowerCase("tr") === term.toLocaleLowerCase("tr"))), "later group is initially hidden");
  const firstAnswer = await next();
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

try {
  await until(async () => (await fetch(root)).ok, "Sunum Web local server");
  const portFile = path.join(profile, "DevToolsActivePort");
  const debugPort = await until(() => fs.existsSync(portFile)
    ? Number(fs.readFileSync(portFile, "utf8").split("\n")[0]) : null, "Chrome debugging endpoint");
  page = await connectTarget(debugPort, (target) => target.url === "about:blank");
  await page.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await page.send("Page.navigate", { url: `${root}/#/karagoz/0` });
  await until(() => page.evaluate("!document.querySelector('#gate').hidden"), "password screen");
  await page.evaluate("document.querySelector('#gate-password').value = 'sunum'; document.querySelector('#gate-submit').click()");
  try {
    await until(() => page.evaluate("Boolean(document.querySelector('#canvas .slide'))"), "unlocked presentation");
  } catch (error) {
    const diagnostics = await page.evaluate("JSON.stringify({gateError: document.querySelector('#gate-error')?.textContent, visible: !document.querySelector('#gate').hidden, canvas: document.querySelector('#canvas')?.innerText, ready: document.readyState})");
    console.error(`[sunum-web] Chrome unlock diagnostics: ${diagnostics}`);
    throw error;
  }

  let screen = await openStep("karagoz", "s16-q1");
  assert.ok(screen.text.includes("tiplerin adlarını"));
  assert.equal(await page.evaluate("document.querySelector('#canvas .content-images img')?.naturalWidth > 100"), true, "ISSUE-002 source illustration renders in Chrome");
  assert.ok(screen.text.includes("Ders kitabı, basılı s.16"));

  screen = await openStep("mektup", "s46-q4");
  assert.ok(screen.text.includes("Hasret sana ey yirmi yılın"), "ISSUE-013 poem excerpt is visible");
  assert.equal(await page.evaluate("Array.from(document.querySelectorAll('#canvas .source-links a')).some(a => a.href.includes('#page=47'))"), true);

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
  await revealDictionaryGroup(["sebilci", "saka"], ["lîka", "rîh"], "meşin tulumbalar içindeki suyu", "ham ipek");

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
  assert.ok(answer.includes("Birlik ve dayanışma"), "comments open after a click");

  console.log("[sunum-web] Headless Chrome verified the initial/reveal views for all 14 audit issues.");
} finally {
  for (const client of clients) client.close();
  if (browser.exitCode === null) {
    browser.kill("SIGTERM");
    await Promise.race([new Promise((resolve) => browser.once("exit", resolve)), sleep(3000)]);
  }
  if (server.exitCode === null) {
    server.kill("SIGTERM");
    await Promise.race([new Promise((resolve) => server.once("exit", resolve)), sleep(1000)]);
  }
  fs.rmSync(profile, { recursive: true, force: true });
}
