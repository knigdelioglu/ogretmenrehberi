import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";
import { planExportSlides } from "../src/export/plan.js";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const chrome = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const port = Number(process.env.PPTX_TEST_PORT ?? 4179);
const appUrl = process.env.LESSON_PLAYER_TEST_URL ?? `http://127.0.0.1:${port}`;
const snapshotPath = path.join(packageRoot, "scripts/fixtures/pptx-export-comparison-visual.json");
const lessons = JSON.parse(fs.readFileSync(path.join(packageRoot, "src/generated/lessons.json"), "utf8"));
const profilePath = fs.mkdtempSync(path.join(os.tmpdir(), "lesson-player-pptx-cdp-"));
const downloadPath = fs.mkdtempSync(path.join(os.tmpdir(), "lesson-player-pptx-download-"));
const vite = spawn(process.execPath, [
  path.join(packageRoot, "node_modules/vite/bin/vite.js"),
  "preview",
  "--host",
  "127.0.0.1",
  "--port",
  String(port),
  "--strictPort"
], { cwd: packageRoot, stdio: "ignore" });
const browserClients = [];
let browser;

async function until(check, label, timeout = 20_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      const result = await check();
      if (result) return result;
    } catch {
      // Navigation and Vite startup briefly replace the execution context.
    }
    await sleep(75);
  }
  throw new Error(`Timed out: ${label}`);
}

async function connectTarget(debugPort, predicate) {
  const target = await until(async () => {
    const response = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
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
    const entry = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) entry.reject(new Error(message.error.message));
    else entry.resolve(message.result);
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
        throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
      }
      return result.result.value;
    },
    close() {
      socket.close();
    }
  };
  browserClients.push(client);
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  return client;
}

function runUnzip(args) {
  const result = spawnSync("unzip", args, { encoding: "utf8", maxBuffer: 5_000_000 });
  if (result.status !== 0) throw new Error(result.stderr || `unzip ${args[0]} failed`);
  return result.stdout;
}

async function stopProcess(child) {
  if (!child || child.exitCode !== null) return;
  child.kill("SIGTERM");
  await Promise.race([once(child, "exit"), sleep(5_000)]);
  if (child.exitCode === null) {
    child.kill("SIGKILL");
    await Promise.race([once(child, "exit"), sleep(1_000)]);
  }
}

function makeFixture() {
  return {
    lessonId: "EXPORT-FIXTURE",
    lessonTitle: "Karşılaştırma, tablo ve sözlük örneği",
    lessonSlug: "export-fixture",
    themeId: "TEMA_03",
    stepId: "fixture-comparison",
    stepNumber: 1,
    stepCount: 1,
    printedPage: "177–178",
    revealStage: ["answer", "evidence"],
    revealLabel: "Metinden kanıt açıldı",
    view: "student",
    slideNumber: 1,
    step: {
      id: "fixture-comparison",
      layout: "comparison",
      density: "comfortable",
      reveal_order: ["guidance", "answer", "evidence", "explanation", "note"],
      display_prompt: "Metin ile uyarlamayı karşılaştırın.",
      display_prompt_mode: "VERIFIED_SUMMARY",
      source: {
        source_record_id: "fixture-source",
        printed_page_range: "177–178",
        book_heading: "Tablo ve karşılaştırma fixture'ı",
        task_type: "QUESTION",
        source_locator: "fixture",
        source_status: "VERIFIED"
      },
      answer: {
        question_id: "fixture-answer",
        entry_type: "question_answer",
        printed_page: 177,
        question_no: "1",
        prompt_summary: "Metin ile uyarlamayı karşılaştırın.",
        answer: "İki anlatım biçimi ortak çatışmayı farklı ayrıntılarla sunar.",
        guidance: "Yalnız öğretmen için: önce anlatıcı bakışını sorun.",
        explanation: "Yalnız öğretmen açıklaması: uyarlama görsel anlatıma dayanır.",
        evidence_quotes: ["Öğrenciye açık kanıt alıntısı."],
        answer_sections: {
          "Metin": ["İç monolog", "Betimleyici anlatım"],
          "Uyarlama": ["Görüntü ve ses", "Sahne geçişleri"]
        },
        dictionary_terms: [
          { term: "bakış açısı", meaning: "Olayların anlatıldığı konum.", source: "Ders sözlüğü" }
        ],
        source_locator: "fixture-answer"
      },
      content: {
        lead: "Önce iki kaynağın ortak ve ayrışan yönlerini bulun.",
        items: ["Anlatım biçimi", "Karakterlerin sunuluşu"],
        sections: [
          { title: "Metin", body: "İç konuşma ve betimlemeler kullanılır." },
          { title: "Uyarlama", body: "Görüntü ve ses anlatıyı taşır." }
        ],
        note: "Yalnız öğretmen notu: bu metin öğrenci görünümünde yer almamalı."
      }
    }
  };
}

function renderInPage(client, slide, pixelRatio = 1) {
  const request = {
    type: "lesson-player-export-render",
    requestId: `browser-test-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    slide,
    pixelRatio
  };
  return client.evaluate(`(() => {
    const request = ${JSON.stringify(request)};
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        window.removeEventListener("message", onMessage);
        reject(new Error("render route timed out"));
      }, 120000);
      const onMessage = (event) => {
        if (event.source !== window || event.data?.requestId !== request.requestId) return;
        if (event.data.type !== "lesson-player-export-rendered" && event.data.type !== "lesson-player-export-render-error") return;
        clearTimeout(timeout);
        window.removeEventListener("message", onMessage);
        resolve(event.data);
      };
      window.addEventListener("message", onMessage);
      window.postMessage(request, location.origin);
    });
  })()`);
}

function makeStudentSlide(fixture) {
  const step = structuredClone(fixture.step);
  delete step.answer.guidance;
  delete step.answer.explanation;
  delete step.content.note;
  step.reveal_order = step.reveal_order.filter((key) => !["guidance", "explanation", "note"].includes(key));
  return { ...fixture, step, view: "student", revealStage: ["answer", "evidence"] };
}

async function imageSignature(client, dataUrl) {
  return client.evaluate(`(async () => {
    const image = new Image();
    image.src = ${JSON.stringify(dataUrl)};
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 18;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let fingerprint = "";
    for (let index = 0; index < pixels.length; index += 4) {
      fingerprint += [pixels[index], pixels[index + 1], pixels[index + 2]]
        .map((value) => Math.min(15, Math.floor(value / 16)).toString(16))
        .join("");
    }
    return { width: image.naturalWidth, height: image.naturalHeight, fingerprint };
  })()`);
}

try {
  assert.ok(fs.existsSync(chrome), `CHROME executable not found: ${chrome}`);
  await until(async () => (await fetch(appUrl)).ok, "Vite preview server");

  browser = spawn(chrome, [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--disable-popup-blocking",
    "--no-first-run",
    "--remote-allow-origins=*",
    "--remote-debugging-port=0",
    `--user-data-dir=${profilePath}`,
    "about:blank"
  ], { stdio: "ignore" });

  const portFile = path.join(profilePath, "DevToolsActivePort");
  const debugPort = await until(
    () => fs.existsSync(portFile) ? Number(fs.readFileSync(portFile, "utf8").split("\n")[0]) : null,
    "Chrome debugging endpoint"
  );
  const page = await connectTarget(debugPort, (target) => target.url === "about:blank");
  await page.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath });
  await page.send("Emulation.setDeviceMetricsOverride", {
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
    mobile: false
  });

  await page.send("Page.navigate", { url: `${appUrl}/?export-render=1` });
  await until(
    () => page.evaluate(`Boolean(document.querySelector('[data-export-render-ready="true"]'))`),
    "isolated export renderer ready"
  );

  const fixture = makeFixture();
  const studentSlide = makeStudentSlide(fixture);
  const studentImage = await renderInPage(page, studentSlide, 1);
  assert.equal(studentImage.type, "lesson-player-export-rendered", "fixture screenshot succeeds");
  const studentDom = await page.evaluate(`(() => {
    const stage = document.querySelector(".lesson-stage");
    const text = stage?.innerText ?? "";
    const compare = document.querySelector(".layout-content--comparison");
    const tableLike = document.querySelector(".answer-sections--comparison.answer-sections--paired");
    const dictionary = document.querySelector(".dictionary-card");
    const evidence = document.querySelector(".reveal-panel--evidence");
    return {
      hasGuidance: text.includes("Yalnız öğretmen için"),
      hasExplanation: text.includes("Yalnız öğretmen açıklaması"),
      hasTeacherNote: text.includes("Yalnız öğretmen notu"),
      hasAnswer: text.includes("İki anlatım biçimi"),
      hasComparison: Boolean(compare),
      hasPairedAnswerSections: Boolean(tableLike),
      hasDictionary: Boolean(dictionary),
      hasEvidence: Boolean(evidence),
      horizontalOverflow: stage ? stage.scrollWidth - stage.clientWidth : -1,
      verticalOverflow: stage ? stage.scrollHeight - stage.clientHeight : -1,
      geometry: compare ? (() => {
        const rect = document.querySelector(".stage-card").getBoundingClientRect();
        const dictionaryRect = dictionary.getBoundingClientRect();
        return { card: [rect.x, rect.y, rect.width, rect.height], dictionary: [dictionaryRect.x, dictionaryRect.y, dictionaryRect.width, dictionaryRect.height] };
      })() : null
    };
  })()`);
  assert.equal(studentDom.hasGuidance, false, "student render omits teacher guidance");
  assert.equal(studentDom.hasExplanation, false, "student render omits teacher explanation");
  assert.equal(studentDom.hasTeacherNote, false, "student render omits teacher note");
  assert.equal(studentDom.hasAnswer, true, "student render includes student-facing answer");
  assert.equal(studentDom.hasComparison, true, "comparison content layout uses shared renderer");
  assert.equal(studentDom.hasPairedAnswerSections, true, "structured/table-like answer sections use shared renderer");
  assert.equal(studentDom.hasDictionary, true, "dictionary layout uses shared renderer");
  assert.equal(studentDom.hasEvidence, true, "evidence reveal uses shared renderer");
  assert.equal(studentDom.horizontalOverflow, 0, "comparison screenshot has no horizontal clipping");
  assert.equal(studentDom.verticalOverflow, 0, "comparison screenshot has no vertical clipping");

  const signature = await imageSignature(page, studentImage.dataUrl);
  assert.deepEqual([signature.width, signature.height], [1920, 1080], "standard screenshot has fixed 16:9 dimensions");
  const highResolutionImage = await renderInPage(page, studentSlide, 2);
  assert.equal(highResolutionImage.type, "lesson-player-export-rendered", "high-resolution screenshot succeeds");
  assert.equal(highResolutionImage.fitAdjustment, "none", "normal comparison fixture keeps its source density");
  const highResolutionSignature = await imageSignature(page, highResolutionImage.dataUrl);
  assert.deepEqual([highResolutionSignature.width, highResolutionSignature.height], [3840, 2160], "high-quality screenshot is 4K 16:9");

  const mektup = lessons.find((item) => item.lesson_id === "T11-T01-MEKTUP");
  const longPromptSlides = planExportSlides([mektup], {
    scope: "selected-steps",
    currentLessonId: mektup.lesson_id,
    currentStepId: "s36-q3",
    selectedStepIds: ["s36-q3"],
    view: "student",
    revealMode: "stages",
    quality: "high"
  });
  const longPromptRender = await renderInPage(page, longPromptSlides[0], 2);
  assert.equal(longPromptRender.type, "lesson-player-export-rendered", "real long-prompt slide fits the export viewport");
  assert.equal(longPromptRender.fitAdjustment, "compact", "only an overflowing slide retries at the renderer's compact density");
  const compactLayout = await page.evaluate(`(() => {
    const stage = document.querySelector(".lesson-stage");
    const card = document.querySelector(".stage-card");
    return {
      verticalOverflow: stage ? stage.scrollHeight - stage.clientHeight : -1,
      horizontalOverflow: stage ? stage.scrollWidth - stage.clientWidth : -1,
      density: [...(card?.classList ?? [])].find((value) => value.startsWith("density-"))
    };
  })()`);
  assert.equal(compactLayout.density, "density-compact", "fallback uses StepView's existing compact density preset");
  assert.ok(compactLayout.verticalOverflow <= 1 && compactLayout.horizontalOverflow <= 1, "compact retry has no clipped content");

  const expectedSnapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
  if (process.env.UPDATE_PPTX_VISUAL_SNAPSHOT === "1") {
    fs.writeFileSync(snapshotPath, `${JSON.stringify({
      width: signature.width,
      height: signature.height,
      sampleWidth: 32,
      sampleHeight: 18,
      geometry: studentDom.geometry,
      pixels: signature.fingerprint
    }, null, 2)}\n`);
  } else {
    assert.equal(expectedSnapshot.width, signature.width, "visual snapshot width");
    assert.equal(expectedSnapshot.height, signature.height, "visual snapshot height");
    assert.deepEqual(expectedSnapshot.geometry, studentDom.geometry, "comparison and dictionary geometry matches visual baseline");
    const expected = expectedSnapshot.pixels;
    assert.equal(expected.length, signature.fingerprint.length, "visual fingerprint size");
    let mismatchedPixels = 0;
    let totalChannelDelta = 0;
    for (let index = 0; index < expected.length; index += 3) {
      let pixelDelta = 0;
      for (let channel = 0; channel < 3; channel += 1) {
        const delta = Math.abs(parseInt(expected[index + channel], 16) - parseInt(signature.fingerprint[index + channel], 16));
        pixelDelta += delta;
        totalChannelDelta += delta;
      }
      if (pixelDelta > 3) mismatchedPixels += 1;
    }
    const totalPixels = expected.length / 3;
    assert.ok(mismatchedPixels / totalPixels <= 0.10, "comparison screenshot stays within 10% sampled-pixel drift");
    const averageChannelDrift = totalChannelDelta / expected.length;
    assert.ok(
      averageChannelDrift <= 1.0,
      `comparison screenshot average sampled color drift stays low (${averageChannelDrift.toFixed(3)})`
    );
  }

  const teacherStep = structuredClone(fixture.step);
  teacherStep.layout = "question";
  teacherStep.density = "compact";
  teacherStep.content = { note: fixture.step.content.note };
  delete teacherStep.answer.answer_sections;
  delete teacherStep.answer.dictionary_terms;
  const teacherImage = await renderInPage(page, {
    ...fixture,
    step: teacherStep,
    view: "teacher",
    revealStage: ["guidance", "answer", "evidence", "explanation", "note"]
  }, 1);
  assert.equal(teacherImage.type, "lesson-player-export-rendered", `teacher fixture screenshot succeeds: ${JSON.stringify(teacherImage)}`);
  const teacherText = await page.evaluate("document.querySelector('.lesson-stage')?.innerText ?? ''");
  assert.ok(teacherText.includes("Yalnız öğretmen için"), "teacher render includes guidance");
  assert.ok(teacherText.includes("Yalnız öğretmen açıklaması"), "teacher render includes explanation");
  assert.ok(teacherText.includes("Yalnız öğretmen notu"), "teacher render includes teacher note");

  const overflowStep = structuredClone(fixture.step);
  overflowStep.id = "fixture-overflow";
  overflowStep.layout = "process";
  overflowStep.content.items = Array.from({ length: 70 }, (_, index) => `${index + 1}. Uzun içerik taşıma denetimi için tekrar eden metin. ` .repeat(5));
  const overflowResult = await renderInPage(page, {
    ...fixture,
    stepId: overflowStep.id,
    step: overflowStep,
    view: "teacher",
    revealStage: []
  }, 1);
  assert.equal(overflowResult.type, "lesson-player-export-render-error", "overflow is a visible export error");
  assert.ok(overflowResult.overflow?.vertical > 0, "overflow error reports measured vertical overflow");

  await page.evaluate(`localStorage.setItem("ogretmenrehberi.lesson.T11-T01-KARAGOZ.projection", "true")`);
  await page.send("Page.navigate", {
    url: `${appUrl}/?lesson=T11-T01-KARAGOZ&step=s28-q1`
  });
  await until(
    () => page.evaluate("document.getElementById('presentation-pptx-export-trigger')?.textContent?.includes('Dışa aktar')"),
    "PowerPoint action in the direct presentation view"
  );
  assert.equal(
    await page.evaluate("getComputedStyle(document.querySelector('.topbar')).display"),
    "none",
    "presentation-mode keeps the normal toolbar hidden"
  );
  await page.evaluate("document.getElementById('presentation-pptx-export-trigger').click()");
  await until(() => page.evaluate("document.querySelector('.pptx-export-dialog')?.open"), "presentation-view PowerPoint options");
  await page.evaluate("document.querySelector('.pptx-export-dialog__close').click()");

  await page.send("Page.navigate", {
    url: `${appUrl}/?display=1&lesson=T11-T01-KARAGOZ&step=s28-q1`
  });
  await until(
    () => page.evaluate("Boolean(document.querySelector('.app-shell.external-display'))"),
    "isolated student projection view"
  );
  assert.equal(
    await page.evaluate("Boolean(document.getElementById('presentation-pptx-export-trigger'))"),
    false,
    "the synchronized external student projection does not show an export control"
  );

  await page.evaluate(`localStorage.removeItem("ogretmenrehberi.lesson.T11-T01-KARAGOZ.projection")`);
  await page.send("Page.navigate", {
    url: `${appUrl}/?lesson=T11-T01-KARAGOZ&step=s28-q1`
  });
  await until(
    () => page.evaluate("document.getElementById('pptx-export-trigger')?.textContent?.includes('Dışa aktar')"),
    "lesson toolbar export action"
  );
  const storageBefore = await page.evaluate(`JSON.stringify(Object.keys(localStorage)
    .filter(key => key.startsWith("ogretmenrehberi.lesson."))
    .sort().map(key => [key, localStorage.getItem(key)]))`);
  await page.evaluate("document.getElementById('pptx-export-trigger').click()");
  await until(() => page.evaluate("document.querySelector('.pptx-export-dialog')?.open"), "PowerPoint export options");
  await page.evaluate(`(() => {
    document.querySelector('input[name="pptx-scope"][value="selected-steps"]').click();
    document.querySelector('input[name="pptx-reveal"][value="stages"]').click();
    return true;
  })()`);
  const options = await page.evaluate(`({
    quality: document.querySelector('.pptx-export-quality select')?.value,
    selectedSteps: [...document.querySelectorAll('.pptx-export-step input:checked')].length,
    estimatedSlides: document.querySelector('.pptx-export-estimate')?.textContent
  })`);
  assert.equal(options.quality, "high", "high quality is the default export resolution");
  assert.equal(options.selectedSteps, 1, "selected-step scope starts at the current step");
  assert.ok(options.estimatedSlides?.includes("3 slayt"), "student UI estimate excludes teacher-only reveal stages");

  await page.evaluate("document.querySelector('.pptx-export-primary').click()");
  const downloadResult = await until(async () => {
    const files = fs.readdirSync(downloadPath).filter((name) => name.endsWith(".pptx"));
    if (files.length) {
      const target = path.join(downloadPath, files[0]);
      if (fs.existsSync(target) && fs.statSync(target).size > 0) return { file: target };
    }
    const exportError = await page.evaluate("document.querySelector('.pptx-export-error')?.textContent ?? ''");
    return exportError ? { error: exportError } : null;
  }, "real lesson PowerPoint download", 180_000);
  if (downloadResult.error) throw new Error(`Real lesson export failed: ${downloadResult.error}`);
  const downloadedPath = downloadResult.file;
  if (process.env.PPTX_TEST_OUTPUT) {
    const requestedOutput = path.resolve(process.env.PPTX_TEST_OUTPUT);
    fs.mkdirSync(path.dirname(requestedOutput), { recursive: true });
    fs.copyFileSync(downloadedPath, requestedOutput);
  }
  await until(
    () => page.evaluate("document.querySelector('.pptx-export-status')?.textContent?.includes('indirme listesine eklendi')"),
    "PowerPoint export success state"
  );
  const storageAfter = await page.evaluate(`JSON.stringify(Object.keys(localStorage)
    .filter(key => key.startsWith("ogretmenrehberi.lesson."))
    .sort().map(key => [key, localStorage.getItem(key)]))`);
  assert.equal(storageAfter, storageBefore, "PPTX export leaves existing localStorage progress and edits unchanged");

  const archiveEntries = runUnzip(["-Z1", downloadedPath]).split(/\r?\n/).filter(Boolean);
  const slidePaths = archiveEntries
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((left, right) => Number(left.match(/slide(\d+)/)[1]) - Number(right.match(/slide(\d+)/)[1]));
  assert.equal(slidePaths.length, 3, "real Karagöz student comparison exports initial, answer and evidence states");
  assert.ok(archiveEntries.includes("ppt/notesSlides/notesSlide1.xml"), "speaker notes carry slide trace metadata");

  const noteStages = [];
  for (let index = 1; index <= slidePaths.length; index += 1) {
    const slideXml = runUnzip(["-p", downloadedPath, `ppt/slides/slide${index}.xml`]);
    assert.ok(slideXml.includes("<a:blip"), `slide ${index} contains a full-page raster image`);
    const imageTransform = [...slideXml.matchAll(/<a:xfrm>\s*<a:off x="(\d+)" y="(\d+)"\/>\s*<a:ext cx="(\d+)" cy="(\d+)"\/>/g)]
      .find((match) => Number(match[3]) > 0 && Number(match[4]) > 0);
    assert.ok(imageTransform, `slide ${index} image has a complete slide transform`);
    assert.deepEqual(imageTransform.slice(1, 3), ["0", "0"], `slide ${index} image starts at the slide origin`);
    assert.ok(Math.abs(Number(imageTransform[3]) / Number(imageTransform[4]) - 16 / 9) < 0.001, `slide ${index} image fills a 16:9 slide`);
    assert.ok(!slideXml.includes("<p:timing"), `slide ${index} has no PowerPoint animation`);
    const notesXml = runUnzip(["-p", downloadedPath, `ppt/notesSlides/notesSlide${index}.xml`]);
    assert.ok(notesXml.includes("T11-T01-KARAGOZ"), `slide ${index} notes include lesson_id`);
    assert.ok(notesXml.includes("s28-q1"), `slide ${index} notes include step_id`);
    assert.ok(notesXml.includes("printed_page: 28"), `slide ${index} notes include printed page`);
    const stage = notesXml.match(/reveal_stage: ([^<\r\n]+)/)?.[1] ?? "";
    noteStages.push(stage);
  }
  assert.deepEqual(noteStages, [
    "Başlangıç görünümü",
    "Cevap açıldı",
    "Metinden kanıt açıldı"
  ], "student PPTX speaker notes preserve the public reveal order and omit teacher-only stages");

  const presentationXml = runUnzip(["-p", downloadedPath, "ppt/presentation.xml"]);
  const size = presentationXml.match(/<p:sldSz cx="(\d+)" cy="(\d+)"/);
  assert.ok(size, "PowerPoint declares a custom 16:9 slide size");
  const ratio = Number(size[1]) / Number(size[2]);
  assert.ok(Math.abs(ratio - 16 / 9) < 0.001, "PowerPoint page size is 16:9");

  if (process.env.PPTX_TEST_FULL_LESSON === "1") {
    const previousFiles = new Set(fs.readdirSync(downloadPath).filter((name) => name.endsWith(".pptx")));
    await page.send("Page.navigate", {
      url: `${appUrl}/?lesson=T11-T01-MEKTUP&step=s36-q3`
    });
    await until(
      () => page.evaluate("document.getElementById('pptx-export-trigger')?.textContent?.includes('Dışa aktar')"),
      "full Mektup lesson toolbar"
    );
    await page.evaluate("document.getElementById('pptx-export-trigger').click()");
    await until(() => page.evaluate("document.querySelector('.pptx-export-dialog')?.open"), "full Mektup export options");
    await page.evaluate("document.querySelector('input[name=\"pptx-reveal\"][value=\"stages\"]').click()");
    assert.ok(
      await page.evaluate("document.querySelector('.pptx-export-estimate')?.textContent?.includes('103 slayt')"),
      "Mektup lesson reveal plan matches the user's 103-slide export"
    );
    await page.evaluate("document.querySelector('.pptx-export-primary').click()");

    const fullLessonDownload = await until(async () => {
      const file = fs.readdirSync(downloadPath)
        .find((name) => name.endsWith(".pptx") && !previousFiles.has(name));
      if (file) {
        const target = path.join(downloadPath, file);
        if (fs.existsSync(target) && fs.statSync(target).size > 0) return { file: target };
      }
      const exportError = await page.evaluate("document.querySelector('.pptx-export-error')?.textContent ?? ''");
      return exportError ? { error: exportError } : null;
    }, "full 103-slide Mektup export", 300_000);
    if (fullLessonDownload.error) throw new Error(`Full Mektup export failed: ${fullLessonDownload.error}`);
    await until(
      () => page.evaluate("document.querySelector('.pptx-export-status')?.textContent?.includes('indirme listesine eklendi')"),
      "full Mektup export success state",
      300_000
    );

    const fullLessonEntries = runUnzip(["-Z1", fullLessonDownload.file]).split(/\r?\n/).filter(Boolean);
    const fullLessonSlides = fullLessonEntries.filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name));
    assert.equal(fullLessonSlides.length, 103, "full Mektup PPTX contains all planned reveal states");
    let compactFitNotes = 0;
    for (let index = 1; index <= fullLessonSlides.length; index += 1) {
      const slideXml = runUnzip(["-p", fullLessonDownload.file, `ppt/slides/slide${index}.xml`]);
      assert.ok(!slideXml.includes("<p:timing"), `Mektup slide ${index} has no PowerPoint animation`);
      const notePath = `ppt/notesSlides/notesSlide${index}.xml`;
      if (fullLessonEntries.includes(notePath)) {
        const notesXml = runUnzip(["-p", fullLessonDownload.file, notePath]);
        if (notesXml.includes("step_id: s36-q3") && notesXml.includes("fit_adjustment: compact")) {
          compactFitNotes += 1;
        }
      }
    }
    assert.ok(compactFitNotes > 0, "speaker notes identify the compact retry for the overflowing source step");
    if (process.env.PPTX_FULL_LESSON_OUTPUT) {
      const requestedOutput = path.resolve(process.env.PPTX_FULL_LESSON_OUTPUT);
      fs.mkdirSync(path.dirname(requestedOutput), { recursive: true });
      fs.copyFileSync(fullLessonDownload.file, requestedOutput);
    }
    console.log(`Full Mektup export passed: ${fullLessonSlides.length} reveal slides; compact-fit trace on ${compactFitNotes} s36-q3 slide(s).`);
  }

  console.log(`PPTX export browser checks passed: ${slidePaths.length} real slides, reveal order and metadata verified; download: ${path.basename(downloadedPath)}${process.env.PPTX_TEST_OUTPUT ? `; sample: ${path.resolve(process.env.PPTX_TEST_OUTPUT)}` : ""}`);
} finally {
  for (const client of browserClients) client.close();
  await Promise.all([stopProcess(browser), stopProcess(vite)]);
  fs.rmSync(profilePath, { recursive: true, force: true, maxRetries: 12, retryDelay: 150 });
  fs.rmSync(downloadPath, { recursive: true, force: true, maxRetries: 12, retryDelay: 150 });
}
