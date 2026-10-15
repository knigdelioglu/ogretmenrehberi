import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { answerLayerMarker } from "./presentation-behavior-contracts.mjs";

const chrome = process.env.CHROME;
if (!chrome) throw new Error("CHROME must point to Chrome/Chromium.");
const root = process.env.LESSON_PLAYER_URL ?? "http://127.0.0.1:4173";
const lessons = JSON.parse(fs.readFileSync(new URL("../src/generated/lessons.json", import.meta.url), "utf8"));
const answerCase = lessons.flatMap((lesson) => lesson.steps.map((step, index) => ({ lesson, step, index })))
  .find(({ lesson, step, index }) => step.answer?.answer && step.reveal_order?.includes("answer") && index > 0 && index < lesson.steps.length - 1);
const assessmentCase = lessons.flatMap((lesson) => lesson.steps.map((step) => ({ lesson, step })))
  .find(({ step }) => step.layout === "assessment" && step.content?.items?.length && step.content.scale?.length);
const checklistCase = lessons.flatMap((lesson) => lesson.steps.map((step) => ({ lesson, step })))
  .find(({ step }) => step.layout === "assessment" && step.content?.items?.length && !step.content.scale?.length);
const noteCase = lessons.flatMap((lesson) => lesson.steps.map((step) => ({ lesson, step })))
  .find(({ step }) => step.layout === "reference" && step.content?.note?.trim());
const layoutCases = [
  ["comparison", ({ step }) => step.layout === "comparison" && (step.content?.items?.length || step.content?.sections?.length), '[data-content-layout="comparison"] .comparison-criterion, [data-content-layout="comparison"] .reference-card'],
  ["structure", ({ step }) => step.layout === "structure" && (step.content?.items?.length || step.content?.sections?.length), '[data-content-layout="structure"] .structure-field, [data-content-layout="structure"] .reference-card'],
  ["process", ({ step }) => step.layout === "process" && (step.content?.items?.length || step.content?.sections?.length), '[data-content-layout="process"] .process-list__row, [data-content-layout="process"] .reference-card'],
  ["assessment", ({ step }) => step.layout === "assessment" && (step.content?.items?.length || step.content?.rubric?.rows?.length), '[data-content-layout="assessment"] .assessment-criterion, [data-content-layout="assessment"] .assessment-table tbody tr'],
  ["reference", ({ step }) => step.layout === "reference" && (step.content?.items?.length || step.content?.sections?.length), '[data-content-layout="reference"] .process-list__row, [data-content-layout="reference"] .reference-card'],
  ["vocabulary", ({ step }) => step.layout === "vocabulary" && step.answer?.answer_sections && !Array.isArray(step.answer.answer_sections), '.vocabulary-card']
].map(([layout, predicate, selector]) => {
  const fixture = lessons.flatMap((lesson) => lesson.steps.map((step) => ({ lesson, step }))).find(predicate);
  return { layout, selector, ...fixture };
});
for (const [name, value] of [["answer-reveal", answerCase], ["assessment table", assessmentCase], ["checklist", checklistCase], ["teacher note", noteCase], ...layoutCases.map((item) => [`${item.layout} layout`, item.lesson && item.step ? item : null])]) {
  if (!value) throw new Error(`Current lesson catalog does not provide a ${name} browser fixture.`);
}
const { lesson: answerLesson, step: answerStep, index: answerIndex } = answerCase;
const answerMarker = answerLayerMarker(answerStep);
if (!answerMarker) throw new Error(`Current answer-reveal fixture has no independent answer marker: ${answerLesson.lesson_id}/${answerStep.id}`);
const firstStep = answerLesson.steps[0];
const targetLesson = lessons.find((lesson) => lesson.lesson_id !== noteCase.lesson.lesson_id);
if (!targetLesson) throw new Error("Current lesson catalog does not provide a second lesson for projection sync.");
const answerUrl = `${root}/?lesson=${encodeURIComponent(answerLesson.lesson_id)}&step=${encodeURIComponent(answerStep.id)}`;
const assessmentChoice = assessmentCase.step.content.scale[0];
const assessmentInput = `.assessment-table input[name="${assessmentCase.step.id}-assessment-0"]`;
const assessmentStorageKey = `ogretmenrehberi.lesson.${assessmentCase.lesson.lesson_id}.assessments`;
const checklistStorageKey = `ogretmenrehberi.lesson.${checklistCase.lesson.lesson_id}.assessments`;
const editorLessonKey = `ogretmenrehberi.lesson.${answerLesson.lesson_id}`;
const expectedEditorOrder = answerLesson.steps.map((step) => step.id);
[expectedEditorOrder[answerIndex], expectedEditorOrder[answerIndex + 1]] =
  [expectedEditorOrder[answerIndex + 1], expectedEditorOrder[answerIndex]];
const noteMarker = noteCase.step.content.note.trim().slice(0, Math.min(80, noteCase.step.content.note.trim().length));
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "lesson-player-cdp-"));
const browser = spawn(chrome, [
  "--headless=new",
  "--no-sandbox",
  "--disable-gpu",
  "--disable-dev-shm-usage",
  "--disable-popup-blocking",
  "--no-first-run",
  "--remote-allow-origins=*",
  "--remote-debugging-port=0",
  `--user-data-dir=${profile}`,
  "about:blank"
], { stdio: "ignore" });
const clients = [];

// Allow CI headless Chrome and large lesson views sufficient startup/render time.
async function until(check, label, timeout = 30000) {
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
  await teacher.send("Page.navigate", { url: answerUrl });
  await until(
    () => teacher.evaluate(`document.querySelector('.stage-card h1')?.textContent?.includes(${JSON.stringify(answerStep.display_prompt)})`),
    "Current answer-reveal step"
  );
  if (!await teacher.evaluate(`!document.body.innerText.includes(${JSON.stringify(answerMarker)})`)) {
    throw new Error(`Answer was visible before user action: ${answerLesson.lesson_id}/${answerStep.id}`);
  }
  const answerButtonReady = await teacher.evaluate(`Boolean(document.querySelector('.stage-icon-toggle--answer'))`);
  if (!answerButtonReady) throw new Error(`Answer action is missing: ${answerLesson.lesson_id}/${answerStep.id}`);
  await teacher.evaluate("document.querySelector('.stage-icon-toggle--answer').click()");
  await until(() => teacher.evaluate(`document.body.innerText.includes(${JSON.stringify(answerMarker)})`),
    "Answer appears after teacher opens it");
  await teacher.evaluate("document.querySelector('.stage-icon-toggle--answer').click()");
  await until(() => teacher.evaluate(`!document.body.innerText.includes(${JSON.stringify(answerMarker)})`),
    "Answer hides after teacher closes it");

  await teacher.send("Page.navigate", {
    url: `${root}/?lesson=${encodeURIComponent(assessmentCase.lesson.lesson_id)}&step=${encodeURIComponent(assessmentCase.step.id)}`
  });
  await until(
    () => teacher.evaluate('document.querySelectorAll(".assessment-table tbody tr").length > 0'),
    "Interactive self-assessment table"
  );
  await teacher.evaluate(`document.querySelector(${JSON.stringify(assessmentInput)})?.click()`);
  await until(() => teacher.evaluate(`(() => {
    const input = document.querySelector(${JSON.stringify(assessmentInput)});
    const saved = JSON.parse(localStorage.getItem(${JSON.stringify(assessmentStorageKey)}) ?? '{}');
    return input?.checked && saved[${JSON.stringify(assessmentCase.step.id)}]?.[0] === ${JSON.stringify(assessmentChoice)};
  })()`), "Assessment choice persistence");
  await teacher.send("Page.reload");
  await until(
    () => teacher.evaluate(`document.querySelector(${JSON.stringify(assessmentInput)})?.checked`),
    "Assessment selection restored after reload"
  );

  await teacher.send("Page.navigate", {
    url: `${root}/?lesson=${encodeURIComponent(checklistCase.lesson.lesson_id)}&step=${encodeURIComponent(checklistCase.step.id)}`
  });
  await until(
    () => teacher.evaluate('document.querySelectorAll(".assessment-criterion input[type=checkbox]").length > 0'),
    "Interactive checklist without a rating scale"
  );
  await teacher.evaluate('document.querySelector(".assessment-criterion input[type=checkbox]")?.click()');
  await until(() => teacher.evaluate(`(() => {
    const input = document.querySelector('.assessment-criterion input[type="checkbox"]');
    const saved = JSON.parse(localStorage.getItem(${JSON.stringify(checklistStorageKey)}) ?? '{}');
    return input?.checked && saved[${JSON.stringify(checklistCase.step.id)}]?.[0] === 'checked';
  })()`), "Checklist selection persistence");
  await teacher.send("Page.navigate", { url: answerUrl });
  await until(
    () => teacher.evaluate(`document.querySelector('.stage-card h1')?.textContent?.includes(${JSON.stringify(answerStep.display_prompt)})`),
    "Current answer-reveal step after assessment check"
  );

  // The guidance is teacher-only and must never leak into the student display.
  await teacher.evaluate(
    "Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Öğretmen rehberi').click()"
  );
  await until(
    () => teacher.evaluate(
      "document.querySelector('.teacher-guide')?.textContent?.includes('2 · Dört eser + bir film sunumları')"
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

  // All four themes must have the three independent tracks, with no yearly
  // presentation duplicated in the recommended theme allocation.
  for (const [themeNumber, title, workshop, annualDate] of [
    [1, "Bir Diyeceğim Var!", "E-posta yazma", "23–27 Kasım 2026"],
    [2, "Kültür Yolculuğu", "Çevrim içi müze gezisi izlenim yazısı", "11–15 Ocak 2027"],
    [3, "Yaşamın İzinde", "Roman kişisiyle hayalî mülakat", "22–26 Mart 2027"],
    [4, "Hayatın Aynası", "Belgesel için afiş hazırlama", "3–7 Mayıs 2027"]
  ]) {
    await teacher.evaluate(
      `document.querySelectorAll('.teacher-guide__theme-tabs button')[${themeNumber - 1}]?.click()`
    );
    await until(
      () => teacher.evaluate(`(() => {
        const guide = document.querySelector('.teacher-guide');
        const text = guide?.textContent ?? '';
        return text.includes(${JSON.stringify(title)}) &&
          text.includes(${JSON.stringify(workshop)}) &&
          text.includes(${JSON.stringify(annualDate)}) &&
          text.includes('1 · Edebiyat Atölyesi') &&
          text.includes('2 · Dört eser + bir film sunumları') &&
          text.includes('3 · Portfolyo ve değerlendirme kayıtları');
      })()`),
      `Teacher's three tracking streams for theme ${themeNumber}`
    );
  }
  const expectedTrackControls = [
    ['workshop', 't4-speaking'],
    ['annual', 'film'],
    ['portfolio', 'task:t4-speaking'],
    ['portfolio', 'reflection:TEMA_04'],
    ['portfolio', 'annual:film']
  ];
  for (const [track, itemId] of expectedTrackControls) {
    const selector = `input[data-track=${JSON.stringify(track)}][data-item-id=${JSON.stringify(itemId)}]`;
    await teacher.evaluate(`document.querySelector(${JSON.stringify(selector)})?.click()`);
  }
  await until(() => teacher.evaluate(`(() => {
    const saved = JSON.parse(localStorage.getItem('ogretmenrehberi.teacher-workflow.2026-2027.v1') ?? '{}');
    return saved.workshop?.includes('t4-speaking') &&
      saved.annual?.includes('film') &&
      saved.portfolio?.includes('task:t4-speaking') &&
      saved.portfolio?.includes('reflection:TEMA_04') &&
      saved.portfolio?.includes('annual:film');
  })()`), "Three independent local teacher plan marks persisted");
  await teacher.send("Page.reload");
  await until(
    () => teacher.evaluate(`document.querySelector('.stage-card h1')?.textContent?.includes(${JSON.stringify(answerStep.display_prompt)})`),
    "Teacher lesson after plan reload"
  );
  await until(
    () => teacher.evaluate("Array.from(document.querySelectorAll('button')).some(b => b.textContent.trim() === 'Öğretmen rehberi')"),
    "Teacher guide control after plan reload"
  );
  await teacher.evaluate(
    "Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Öğretmen rehberi').click()"
  );
  await teacher.evaluate("document.querySelectorAll('.teacher-guide__theme-tabs button')[3]?.click()");
  await until(() => teacher.evaluate(`(() => {
    const inputs = [
      ['workshop','t4-speaking'],['annual','film'],
      ['portfolio','task:t4-speaking'],['portfolio','reflection:TEMA_04'],
      ['portfolio','annual:film']
    ];
    return document.querySelector('.teacher-guide')?.textContent?.includes('Hayatın Aynası') &&
      inputs.every(([track,id]) => [...document.querySelectorAll('input[data-track]')]
        .some(input => input.dataset.track === track && input.dataset.itemId === id && input.checked));
  })()`), "Three teacher plan tracks survive reload in theme four");


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
    const key = ${JSON.stringify(editorLessonKey)};
    const stored = JSON.parse(localStorage.getItem(key + ".order") ?? "{}");
    return stored.schemaVersion === 1 && JSON.stringify(stored.order) === ${JSON.stringify(JSON.stringify(expectedEditorOrder))} &&
      localStorage.getItem(key + ".step-id") === ${JSON.stringify(answerStep.id)} &&
      localStorage.getItem(key + ".index") === ${JSON.stringify(String(answerIndex + 1))};
  })()`), "Reordered step ID persistence");
  await teacher.send("Page.reload");
  await until(() => teacher.evaluate(`(() => {
    const key = ${JSON.stringify(editorLessonKey)};
    return document.querySelector(".stage-card h1")?.textContent?.includes(${JSON.stringify(answerStep.display_prompt)}) &&
      localStorage.getItem(key + ".index") === ${JSON.stringify(String(answerIndex + 1))};
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
    const key = ${JSON.stringify(editorLessonKey)};
    const stored = JSON.parse(localStorage.getItem(key + ".order") ?? "{}");
    return stored.schemaVersion === 1 && stored.order?.[0] === ${JSON.stringify(firstStep.id)} &&
      localStorage.getItem(key + ".step-id") === ${JSON.stringify(firstStep.id)} &&
      localStorage.getItem(key + ".index") === "0" &&
      new URLSearchParams(location.search).get("step") === ${JSON.stringify(firstStep.id)};
  })()`), "Reset restores the canonical step and deep link");

  const reference = `${root}/?lesson=${encodeURIComponent(noteCase.lesson.lesson_id)}&step=${encodeURIComponent(noteCase.step.id)}`;
  await teacher.send("Page.navigate", { url: reference });
  await until(
    () => teacher.evaluate(`document.querySelector('.stage-card h1')?.textContent?.includes(${JSON.stringify(noteCase.step.display_prompt)})`),
    "Teacher-only reference step"
  );
  if (await teacher.evaluate(`document.body.innerText.includes(${JSON.stringify(noteMarker)})`)) {
    throw new Error("Teacher-only note was visible before the reveal action.");
  }
  await teacher.evaluate(
    "Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Öğrenci ekranı').click()"
  );
  const student = await connectTarget(port, (target) => target.url.includes("display=1"));
  await until(
    () => student.evaluate(`document.querySelector('.stage-card h1')?.textContent?.includes(${JSON.stringify(noteCase.step.display_prompt)})`),
    "Student projection opens"
  );
  const teacherGuideLeaked = await student.evaluate(`(() =>
    Boolean(document.querySelector('.teacher-guide')) ||
    [...document.querySelectorAll('button')].some(
      b => b.textContent.trim() === 'Öğretmen rehberi'
    )
  )()`);
  if (teacherGuideLeaked) throw new Error("Teacher guidance leaked into student display.");
  await teacher.evaluate("window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))");
  const secret = noteMarker;
  await until(
    () => teacher.evaluate(`document.body.innerText.includes(${JSON.stringify(secret)})`),
    "Teacher note reveal"
  );
  if (await student.evaluate(`document.body.innerText.includes(${JSON.stringify(secret)})`)) {
    throw new Error("Teacher-only note leaked to student projection.");
  }

  await teacher.evaluate(`(() => {
    const select = document.querySelector(".lesson-select select");
    select.value = ${JSON.stringify(targetLesson.lesson_id)};
    select.dispatchEvent(new Event("change", { bubbles: true }));
  })()`);
  await until(
    () => teacher.evaluate(`new URLSearchParams(location.search).get('lesson') === ${JSON.stringify(targetLesson.lesson_id)}`),
    "Teacher lesson switch"
  );
  await until(
    () => student.evaluate(`new URLSearchParams(location.search).get('lesson') === ${JSON.stringify(targetLesson.lesson_id)}`),
    "Student follows new lesson"
  );
  await until(
    () => teacher.evaluate(`(() => {
      const params = new URLSearchParams(location.search);
      return params.get('lesson') === ${JSON.stringify(targetLesson.lesson_id)} &&
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
    const key = ${JSON.stringify(`ogretmenrehberi.lesson.${targetLesson.lesson_id}.overrides`)};
    localStorage.setItem(key, JSON.stringify({ ${JSON.stringify(targetLesson.steps.at(-1).id)}: { display_prompt: "STALE PROMPT" } }));
  })()`);
  await teacher.send("Page.reload");
  await until(
    () => teacher.evaluate("document.body.innerText.includes('Eski düzenlemeleri indir')"),
    "Stale override recovery notice"
  );
  const safe = await teacher.evaluate(`(() => {
    const key = ${JSON.stringify(`ogretmenrehberi.lesson.${targetLesson.lesson_id}.overrides`)};
    const backup = Object.keys(localStorage).find(k => k.startsWith(key + ".backup."));
    const current = JSON.parse(localStorage.getItem(key));
    return Boolean(backup) && current.schemaVersion === 1 &&
      Object.keys(current.overrides).length === 0 &&
      !document.querySelector(".stage-card h1")?.textContent?.includes("STALE PROMPT");
  })()`);
  if (!safe) throw new Error("Legacy overrides masked current content or were not backed up.");

  await teacher.evaluate(`(() => {
    const key = ${JSON.stringify(`ogretmenrehberi.lesson.${targetLesson.lesson_id}.order`)};
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
    const key = ${JSON.stringify(`ogretmenrehberi.lesson.${targetLesson.lesson_id}.order`)};
    const backup = Object.keys(localStorage).find(k => k.startsWith(key + ".backup."));
    const current = JSON.parse(localStorage.getItem(key));
    return Boolean(backup) &&
      current.schemaVersion === 1 &&
      current.order?.[0] === ${JSON.stringify(targetLesson.steps[0].id)};
  })()`);
  if (!safeOrder) {
    throw new Error("Legacy custom order masked the canonical flow or was not backed up.");
  }

  // Select one current catalog example per supported layout and assert the rendered structure.
  for (const check of layoutCases) {
    await teacher.send("Page.navigate", {
      url: `${root}/?lesson=${encodeURIComponent(check.lesson.lesson_id)}&step=${encodeURIComponent(check.step.id)}`
    });
    await until(
      () => teacher.evaluate(
        `document.querySelectorAll(${JSON.stringify(check.selector)}).length > 0`
      ),
      `Dedicated content layout: ${check.lesson.lesson_id}/${check.step.id}`
    );
    if (check.layout === "structure" || check.layout === "comparison") {
      await teacher.evaluate(
        "document.querySelector('.stage-icon-toggle--answer')?.click()"
      );
      const answerClass = check.layout === "structure"
        ? ".answer-sections--structure .section-card"
        : ".answer-sections--comparison .section-card";
      await until(
        () => teacher.evaluate(
          `document.querySelectorAll(${JSON.stringify(answerClass)}).length > 0`
        ),
        `Dedicated revealed answer: ${check.lesson.lesson_id}/${check.step.id}`
      );
      await until(
        () => teacher.evaluate(
          `document.querySelectorAll(${JSON.stringify(check.selector)}).length > 0`
        ),
        `Structured task content remains visible with answer: ${check.lesson.lesson_id}/${check.step.id}`
      );
    }
  }

  console.log("Browser runtime assertions passed: reordered reload/reset, student note isolation, cross-lesson projection, stale edit backup, dedicated layout views, scaled and checklist assessment persistence, teacher workflow visibility and student isolation.");
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
