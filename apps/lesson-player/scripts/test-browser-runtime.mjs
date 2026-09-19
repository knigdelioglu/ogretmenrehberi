import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const chrome = process.env.CHROME;
if (!chrome) throw new Error("CHROME must point to Chrome/Chromium.");
const root = process.env.LESSON_PLAYER_URL ?? "http://127.0.0.1:4173";
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "lesson-player-cdp-"));
const browser = spawn(chrome, [
  "--headless=new",
  "--no-sandbox",
  "--disable-gpu",
  "--disable-popup-blocking",
  "--no-first-run",
  "--remote-allow-origins=*",
  "--remote-debugging-port=0",
  `--user-data-dir=${profile}`,
  "about:blank"
], { stdio: "ignore" });
const clients = [];

async function until(check, label, timeout = 12000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      const result = await check();
      if (result) return result;
    } catch {
      // Navigation temporarily destroys the JavaScript execution context.
    }
    await sleep(75);
  }
  throw new Error(`Timed out: ${label}`);
}

async function connectTarget(port, predicate) {
  const target = await until(async () => {
    const response = await fetch(`http://127.0.0.1:${port}/json/list`);
    const targets = await response.json();
    return targets.find((item) => item.type === "page" && predicate(item));
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
    async send(method, params = {}) {
      const id = ++sequence;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
    async evaluate(expression) {
      const result = await this.send("Runtime.evaluate", {
        expression,
        awaitPromise: true,
        returnByValue: true,
        userGesture: true
      });
      if (result.exceptionDetails) {
        throw new Error(result.exceptionDetails.text);
      }
      return result.result.value;
    },
    close() {
      socket.close();
    }
  };
  clients.push(client);
  await client.send("Page.enable");
  return client;
}

try {
  const portFile = path.join(profile, "DevToolsActivePort");
  const port = await until(
    () => fs.existsSync(portFile)
      ? Number(fs.readFileSync(portFile, "utf8").split("\n")[0])
      : null,
    "Chrome debugging endpoint"
  );
  const teacher = await connectTarget(port, (target) => target.url === "about:blank");
  const karagoz = `${root}/?lesson=T11-T01-KARAGOZ&step=s15-q1`;
  await teacher.send("Page.navigate", { url: karagoz });
  await until(
    () => teacher.evaluate("document.querySelector('.stage-card h1')?.textContent?.includes('dikkatinizi')"),
    "Karagöz initial step"
  );

  await teacher.evaluate(
    "Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Düzenle').click()"
  );
  await until(
    () => teacher.evaluate("Array.from(document.querySelectorAll('button')).some(b => b.textContent.includes('Aşağı taşı'))"),
    "Presentation editor"
  );
  await teacher.evaluate(
    "Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Aşağı taşı')).click()"
  );
  await until(() => teacher.evaluate(`(() => {
    const key = "ogretmenrehberi.lesson.T11-T01-KARAGOZ";
    const order = JSON.parse(localStorage.getItem(key + ".order") ?? "[]");
    return order[1] === "s15-q1" &&
      localStorage.getItem(key + ".step-id") === "s15-q1" &&
      localStorage.getItem(key + ".index") === "1";
  })()`), "Reordered step ID persistence");
  await teacher.send("Page.reload");
  await until(() => teacher.evaluate(`(() => {
    const key = "ogretmenrehberi.lesson.T11-T01-KARAGOZ";
    return document.querySelector(".stage-card h1")?.textContent?.includes("dikkatinizi") &&
      localStorage.getItem(key + ".index") === "1";
  })()`), "Reordered deep link reload");

  const reference = `${root}/?lesson=T11-T01-KARAGOZ&step=s26-reference`;
  await teacher.send("Page.navigate", { url: reference });
  await until(
    () => teacher.evaluate("document.querySelector('.stage-card h1')?.textContent?.includes('bölümleri')"),
    "Teacher-only reference step"
  );
  await teacher.evaluate(
    "Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Öğrenci ekranı').click()"
  );
  const student = await connectTarget(port, (target) => target.url.includes("display=1"));
  await until(
    () => student.evaluate("document.querySelector('.stage-card h1')?.textContent?.includes('bölümleri')"),
    "Student projection opens"
  );
  await teacher.evaluate("window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))");
  const secret = "Bu şemayı öğrenciler kitap örneklerini";
  await until(
    () => teacher.evaluate(`document.body.innerText.includes(${JSON.stringify(secret)})`),
    "Teacher note reveal"
  );
  if (await student.evaluate(`document.body.innerText.includes(${JSON.stringify(secret)})`)) {
    throw new Error("Teacher-only note leaked to student projection.");
  }

  await teacher.evaluate(`(() => {
    const select = document.querySelector(".lesson-select select");
    select.value = "T11-T01-MEKTUP";
    select.dispatchEvent(new Event("change", { bubbles: true }));
  })()`);
  await until(
    () => teacher.evaluate("new URLSearchParams(location.search).get('lesson') === 'T11-T01-MEKTUP'"),
    "Teacher lesson switch"
  );
  await until(
    () => student.evaluate("new URLSearchParams(location.search).get('lesson') === 'T11-T01-MEKTUP'"),
    "Student follows new lesson"
  );
  await teacher.evaluate(
    "Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Öğrenci ekranı').click()"
  );
  const studentTargets = await until(async () => {
    const response = await fetch(`http://127.0.0.1:${port}/json/list`);
    return (await response.json()).filter(t => t.type === "page" && t.url.includes("display=1"));
  }, "Student window reuse");
  if (studentTargets.length !== 1) {
    throw new Error(`Expected one reusable projection popup, got ${studentTargets.length}.`);
  }

  await teacher.evaluate(`(() => {
    const key = "ogretmenrehberi.lesson.T11-T01-MEKTUP.overrides";
    localStorage.setItem(key, JSON.stringify({ "s36-q1": { display_prompt: "STALE PROMPT" } }));
  })()`);
  await teacher.send("Page.reload");
  await until(
    () => teacher.evaluate("document.body.innerText.includes('Eski düzenlemeleri indir')"),
    "Stale override recovery notice"
  );
  const safe = await teacher.evaluate(`(() => {
    const key = "ogretmenrehberi.lesson.T11-T01-MEKTUP.overrides";
    const backup = Object.keys(localStorage).find(k => k.startsWith(key + ".backup."));
    const current = JSON.parse(localStorage.getItem(key));
    return Boolean(backup) && current.schemaVersion === 1 &&
      Object.keys(current.overrides).length === 0 &&
      !document.querySelector(".stage-card h1")?.textContent?.includes("STALE PROMPT");
  })()`);
  if (!safe) throw new Error("Legacy overrides masked current content or were not backed up.");

  console.log("Browser runtime assertions passed: reordered reload, student note isolation, cross-lesson projection, stale edit backup.");
} finally {
  for (const client of clients) client.close();
  browser.kill();
  fs.rmSync(profile, { recursive: true, force: true });
}
