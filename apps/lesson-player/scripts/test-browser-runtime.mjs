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

  // The guidance is teacher-only and must never leak into the student display.
  await teacher.evaluate(
    "Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Öğretmen rehberi').click()"
  );
  await until(
    () => teacher.evaluate(
      "document.querySelector('.teacher-guide')?.textContent?.includes('1. dönem · Eser ve film çalışmaları')"
    ),
    "Teacher annual reading and portfolio guidance"
  );
  const annualAndWorkshops = await teacher.evaluate(`(() => {
    const guide = document.querySelector('.teacher-guide')?.textContent ?? '';
    return guide.includes('İletişim engellerini canlandırma') &&
      guide.includes('E-posta yazma') &&
      guide.includes('Ek-1') &&
      guide.includes('23–27 Kasım 2026') &&
      guide.includes('11–15 Ocak 2027') &&
      guide.includes('Önerilen sunum haftası') &&
      guide.includes('performans puan');
  })()`);
  if (!annualAndWorkshops) throw new Error("Teacher workflow evidence incomplete.");

  await teacher.send("Page.navigate", { url: `${karagoz}&display=1` });
  await until(
    () => teacher.evaluate("document.querySelector('.stage-card h1')?.textContent?.includes('dikkatinizi')"),
    "Standalone student display for teacher guidance isolation"
  );
  const teacherGuideLeaked = await teacher.evaluate(`(() =>
    Boolean(document.querySelector('.teacher-guide')) ||
    [...document.querySelectorAll('button')].some(b => b.textContent.trim() === 'Öğretmen rehberi')
  )()`);
  if (teacherGuideLeaked) throw new Error("Teacher guidance leaked into student display.");

  await teacher.send("Page.navigate", { url: karagoz });
  await until(
    () => teacher.evaluate(`(() => {
      const params = new URLSearchParams(location.search);
      return params.get('display') !== '1' &&
        document.querySelector('.stage-card h1')?.textContent?.includes('dikkatinizi') &&
        Array.from(document.querySelectorAll('button')).some(
          b => b.textContent.trim() === 'Öğrenci ekranı'
        );
    })()`),
    "Teacher display and controls restored after guide isolation test"
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
    const stored = JSON.parse(localStorage.getItem(key + ".order") ?? "{}");
    return stored.schemaVersion === 1 && stored.order?.[2] === "s15-q1" &&
      localStorage.getItem(key + ".step-id") === "s15-q1" &&
      localStorage.getItem(key + ".index") === "2";
  })()`), "Reordered step ID persistence");
  await teacher.send("Page.reload");
  await until(() => teacher.evaluate(`(() => {
    const key = "ogretmenrehberi.lesson.T11-T01-KARAGOZ";
    return document.querySelector(".stage-card h1")?.textContent?.includes("dikkatinizi") &&
      localStorage.getItem(key + ".index") === "2";
  })()`), "Reordered deep link reload");

  await teacher.evaluate(
    "Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Düzenle').click()"
  );
  await until(
    () => teacher.evaluate("Array.from(document.querySelectorAll('button')).some(b => b.textContent.includes('Tüm sunum ayarlarını sıfırla'))"),
    "Reset editor action"
  );
  await teacher.evaluate(
    "Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Tüm sunum ayarlarını sıfırla')).click()"
  );
  await until(() => teacher.evaluate(`(() => {
    const key = "ogretmenrehberi.lesson.T11-T01-KARAGOZ";
    const stored = JSON.parse(localStorage.getItem(key + ".order") ?? "{}");
    return stored.schemaVersion === 1 && stored.order?.[0] === "s15-source-reminder" &&
      localStorage.getItem(key + ".step-id") === "s15-source-reminder" &&
      localStorage.getItem(key + ".index") === "0" &&
      new URLSearchParams(location.search).get("step") === "s15-source-reminder";
  })()`), "Reset restores the canonical step and deep link");

  const reference = `${root}/?lesson=T11-T01-KARAGOZ&step=s26-reference`;
  await teacher.send("Page.navigate", { url: reference });
  await until(
    () => teacher.evaluate("document.body.innerText.includes('Mukaddime')"),
    "Teacher-only reference step"
  );
  await teacher.evaluate(
    "Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Öğrenci ekranı').click()"
  );
  const student = await connectTarget(port, (target) => target.url.includes("display=1"));
  await until(
    () => student.evaluate("document.body.innerText.includes('Mukaddime')"),
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
  await until(
    () => teacher.evaluate(`(() => {
      const params = new URLSearchParams(location.search);
      return params.get('lesson') === 'T11-T01-MEKTUP' &&
        Array.from(document.querySelectorAll('button')).some(
          b => b.textContent.trim() === 'Öğrenci ekranı'
        );
    })()`),
    "Teacher controls ready after cross-lesson navigation"
  );
  await until(
    () => teacher.evaluate(`(() => {
      const button = Array.from(document.querySelectorAll('button')).find(
        b => b.textContent.trim() === 'Öğrenci ekranı'
      );
      if (!button) return false;
      button.click();
      return true;
    })()`),
    "Reusable student window control"
  );
  const studentTargets = await until(async () => {
    const response = await fetch(`http://127.0.0.1:${port}/json/list`);
    const matches = (await response.json()).filter(
      t => t.type === "page" && t.url.includes("display=1")
    );
    return matches.length === 1 ? matches : false;
  }, "Student window reuse");
  await sleep(200);
  const latestTargets = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json())
    .filter(t => t.type === "page" && t.url.includes("display=1"));
  if (studentTargets.length !== 1 || latestTargets.length !== 1) {
    throw new Error(`Expected one reusable projection popup, got ${latestTargets.length}.`);
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

  await teacher.evaluate(`(() => {
    const key = "ogretmenrehberi.lesson.T11-T01-MEKTUP.order";
    const current = JSON.parse(localStorage.getItem(key));
    const legacyCustom = [...current.order];
    [legacyCustom[0], legacyCustom[1]] = [legacyCustom[1], legacyCustom[0]];
    localStorage.setItem(key, JSON.stringify(legacyCustom));
  })()`);
  await teacher.send("Page.reload");
  await until(
    () => teacher.evaluate("document.body.innerText.includes('özel adım sırası yedeklendi')"),
    "Stale custom order recovery notice"
  );
  const safeOrder = await teacher.evaluate(`(() => {
    const key = "ogretmenrehberi.lesson.T11-T01-MEKTUP.order";
    const backup = Object.keys(localStorage).find(k => k.startsWith(key + ".backup."));
    const current = JSON.parse(localStorage.getItem(key));
    return Boolean(backup) &&
      current.schemaVersion === 1 &&
      current.order?.[0] === "s36-q1";
  })()`);
  if (!safeOrder) {
    throw new Error("Legacy custom order masked the canonical flow or was not backed up.");
  }

  // Verify that Chrome renders each layout, not merely that JSON contains its items.
  for (const check of [
    {
      lesson: "T11-T04-MERDIVEN-KARSILASTIRMA-271-273",
      step: "s273-q1",
      selector: '[data-content-layout="comparison"] .comparison-criterion',
      count: 4
    },
    {
      lesson: "T11-T04-MERDIVEN-KARSILASTIRMA-271-273",
      step: "s273-density",
      selector: '[data-content-layout="comparison"] .comparison-pair .reference-card',
      count: 2
    },
    {
      lesson: "T11-T04-MERDIVEN-KARSILASTIRMA-271-273",
      step: "s272-table",
      selector: '[data-content-layout="structure"] .structure-field',
      count: 7
    },
    {
      lesson: "T11-T04-MERDIVEN-COZUMLEME-274-279",
      step: "s275-work",
      selector: '[data-content-layout="structure"] .structure-field',
      count: 4
    },
    {
      lesson: "T11-T04-TIYATRO-CANLANDIRMA-280-283",
      step: "s281-plan",
      selector: '[data-content-layout="process"] .process-list__row',
      count: 6
    },
    {
      lesson: "T11-T04-TIYATRO-CANLANDIRMA-280-283",
      step: "s283-performance",
      selector: '[data-content-layout="assessment"] .assessment-criterion',
      count: 5
    }
  ]) {
    await teacher.send("Page.navigate", {
      url: `${root}/?lesson=${check.lesson}&step=${check.step}`
    });
    await until(
      () => teacher.evaluate(
        `document.querySelectorAll(${JSON.stringify(check.selector)}).length === ${check.count}`
      ),
      `Dedicated content layout: ${check.lesson}/${check.step}`
    );
    if (check.step === "s272-table" || check.step === "s273-q1") {
      await teacher.evaluate(
        "document.querySelector('.stage-icon-toggle--answer')?.click()"
      );
      const answerClass = check.step === "s272-table"
        ? ".answer-sections--structure .section-card"
        : ".answer-sections--comparison .section-card";
      await until(
        () => teacher.evaluate(
          `document.querySelectorAll(${JSON.stringify(answerClass)}).length === ${check.count}`
        ),
        `Dedicated revealed answer: ${check.lesson}/${check.step}`
      );
      await until(
        () => teacher.evaluate(
          `document.querySelectorAll(${JSON.stringify(check.selector)}).length === ${check.count}`
        ),
        `Structured task content remains visible with answer: ${check.lesson}/${check.step}`
      );
    }
  }

  console.log("Browser runtime assertions passed: reordered reload/reset, student note isolation, cross-lesson projection, stale edit backup, six dedicated layout views, teacher workflow visibility and student isolation.");
} finally {
  for (const client of clients) client.close();
  browser.kill();
  await sleep(350);
  try {
    fs.rmSync(profile, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 200
    });
  } catch (error) {
    // Cleanup must never mask a failed browser assertion.
    console.warn("Chrome test profile cleanup skipped:", error.message);
  }
}
