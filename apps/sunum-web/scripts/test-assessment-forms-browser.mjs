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
  const password = JSON.stringify(process.env.SUNUM_SIFRE || "sunum");
  await page.evaluate(`document.querySelector('#gate-password').value=${password}; document.querySelector('#gate-submit').click()`);
  await until(() => page.evaluate("Boolean(document.querySelector('#canvas .slide'))"), "unlocked presentation");

  let pageParts = 0;
  for (const [lessonSlug, stepId, filename] of files) {
    const { step } = await openStep(lessonSlug, stepId);
    const performanceRubric = lessonSlug === "tiyatro-canlandirma-280-283" && stepId === "s283-performance";
    if (performanceRubric) {
      await page.send("Emulation.setDeviceMetricsOverride", { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
      const performanceCriteria = await page.evaluate(`(() => {
        const slide = document.querySelector('#canvas .slide');
        const body = slide.querySelector('.slide__body');
        const list = slide.querySelector('ul.criteria');
        const rows = [...(list?.querySelectorAll(':scope > li') || [])];
        const listStyle = list && getComputedStyle(list);
        const rowStyles = rows.map((row) => getComputedStyle(row));
        const bodyRect = body?.getBoundingClientRect();
        const listRect = list?.getBoundingClientRect();
        return {
          items: rows.map((row) => row.innerText.trim()),
          listFont: listStyle?.fontFamily ?? '',
          listColor: listStyle?.color ?? '',
          criteriaInk: getComputedStyle(slide).getPropertyValue('--criteria-ink').trim(),
          criteriaTeal: getComputedStyle(slide).getPropertyValue('--criteria-teal').trim(),
          markerColors: rows.map((row) => getComputedStyle(row, '::before').borderTopColor),
          rowColumns: [...new Set(rowStyles.map((style) => style.gridTemplateColumns.split(' ').length))],
          listDisplay: listStyle?.display ?? '',
          listRect: listRect && { x: listRect.x, y: listRect.y, right: listRect.right, bottom: listRect.bottom },
          bodyRect: bodyRect && { x: bodyRect.x, y: bodyRect.y, right: bodyRect.right, bottom: bodyRect.bottom },
          fits: Boolean(body && body.scrollHeight <= body.clientHeight + 1 && body.scrollWidth <= body.clientWidth + 1 &&
            listRect && bodyRect && listRect.left >= bodyRect.left - 1 && listRect.right <= bodyRect.right + 1 &&
            listRect.top >= bodyRect.top - 1 && listRect.bottom <= bodyRect.bottom + 1)
        };
      })()`);
      assert.equal(step.content.items.length, 5, "s283-performance has five canonical performance criteria");
      assert.ok(performanceCriteria.items.length > 0 &&
        JSON.stringify(performanceCriteria.items) === JSON.stringify(step.content.items.slice(0, performanceCriteria.items.length)),
      "s283-performance starts its paginated criteria list in canonical source order");
      assert.match(performanceCriteria.listFont, /^Inter(?:,|$)/, "s283-performance criteria use Inter at 1920x1080");
      assert.equal(performanceCriteria.criteriaInk, "#182a35", "s283-performance uses the criteria palette");
      assert.equal(performanceCriteria.criteriaTeal, "#176d68", "s283-performance uses the criteria teal accent");
      const expectedMarkerColors = ["rgb(23, 109, 104)", "rgb(83, 99, 167)", "rgb(154, 101, 15)", "rgb(23, 109, 104)", "rgb(83, 99, 167)"];
      assert.deepEqual(performanceCriteria.markerColors, expectedMarkerColors.slice(0, performanceCriteria.items.length),
        "s283-performance visible criteria markers retain the teal-blue-gold sequence");
      assert.deepEqual(performanceCriteria.rowColumns, [2], "s283-performance criteria retain the two-column checkbox row geometry");
      assert.equal(performanceCriteria.listDisplay, "grid", "s283-performance criteria retain the shared grid list layout");
      assert.ok(performanceCriteria.fits, `s283-performance criteria fit within the 1920x1080 body bounds: ${JSON.stringify(performanceCriteria.listRect)}`);
    }
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

    const pagesText = [];
    const pageCounters = [];
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
      pageCounters.push(pageState.counter);
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
    if (performanceRubric) {
      assert.ok(totalPages > 1, "s283-performance rubric remains a multi-page flow at 1920x1080");
      let previousCriterionIndex = -1;
      for (const criterion of step.content.items) {
        const criterionIndex = allText.indexOf(criterion, previousCriterionIndex + 1);
        assert.ok(criterionIndex > previousCriterionIndex, `s283-performance retains each criterion in source order: ${criterion}`);
        previousCriterionIndex = criterionIndex;
      }
      let previousTitleIndex = -1;
      for (const section of step.content.sections) {
        const titleIndex = allText.indexOf(section.title, previousTitleIndex + 1);
        assert.ok(titleIndex > previousTitleIndex, `s283-performance keeps rubric level order: ${section.title}`);
        previousTitleIndex = titleIndex;
      }
      const beforeBack = await inspectPage();
      await page.evaluate("document.querySelector('#dock [data-action=prev]').click()");
      const previousPage = await until(async () => {
        const result = await inspectPage();
        return result.counter !== beforeBack.counter ? result : null;
      }, "s283-performance previous rubric page");
      assert.equal(previousPage.counter, pageCounters.at(-2), "s283-performance previous returns to the preceding rubric page");
      assert.equal(previousPage.text, pagesText.at(-2), "s283-performance previous restores the preceding rubric content");
      assert.equal(previousPage.overflow, false, "s283-performance previous page remains overflow-free");
      assert.ok(previousPage.scrollHeight <= previousPage.clientHeight + 1 && previousPage.scrollWidth <= previousPage.clientWidth + 1,
        "s283-performance previous page preserves its 1920x1080 fit");
      await page.evaluate("document.querySelector('#dock [data-action=next]').click()");
      const restoredLastPage = await until(async () => {
        const result = await inspectPage();
        return result.counter !== previousPage.counter ? result : null;
      }, "s283-performance next rubric page");
      assert.equal(restoredLastPage.counter, pageCounters.at(-1), "s283-performance next returns to the last rubric page");
      assert.equal(restoredLastPage.text, pagesText.at(-1), "s283-performance next restores the last rubric content");
      assert.equal(restoredLastPage.overflow, false, "s283-performance forward page remains overflow-free");
      await page.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    }
    if (stepId === "s59-rubric") {
      assert.ok(allText.includes("Öğretmen anahtarı") && allText.includes("Puanlama Exceli"),
        "s59-rubric links its teacher rubric and scoring workbook");
    }

  }

  const { step: selfAssessment } = await openStep("kemal-tahir-mulakat-210-214", "s214-eval");
  assert.equal(selfAssessment.layout, "assessment", "s214-eval is the canonical scale-form assessment fixture");
  assert.equal(selfAssessment.content.items.length, 6, "s214-eval contains six self-assessment criteria");
  assert.equal(selfAssessment.content.scale.length, 3, "s214-eval contains three response choices");
  const scaleStyle = await page.evaluate(`(async () => {
    await document.fonts.ready;
    const interFaces = await document.fonts.load('700 12px "Inter"');
    const capture = () => {
      const slide = document.querySelector('#canvas .slide');
      const form = slide.querySelector('.scale-form');
      const head = form.querySelector('.scale-form__head');
      const rows = [...form.querySelectorAll('.scale-form__row')];
      const headColumns = [...head.children];
      const headerRects = headColumns.slice(1).map((node) => node.getBoundingClientRect());
      const rowRects = rows.map((row) => [...row.children].slice(1).map((node) => node.getBoundingClientRect()));
      const rectData = (rect) => ({
        x: Number(rect.x.toFixed(2)), y: Number(rect.y.toFixed(2)),
        width: Number(rect.width.toFixed(2)), height: Number(rect.height.toFixed(2))
      });
      const headStyle = getComputedStyle(head);
      const headerStyles = headColumns.slice(1).map((node) => getComputedStyle(node));
      const firstRowBoxStyles = [...rows[0].querySelectorAll('.scale-form__box')].map((node) => getComputedStyle(node));
      const body = document.querySelector('#canvas .slide__body');
      const cellDeltas = rowRects.map((cells) => cells.map((rect, index) => ({
        centerX: Number((rect.left + rect.width / 2 - (headerRects[index].left + headerRects[index].width / 2)).toFixed(2)),
        left: Number((rect.left - headerRects[index].left).toFixed(2)),
        width: Number((rect.width - headerRects[index].width).toFixed(2))
      })));
      return {
        modernQa: slide.classList.contains('slide--qa-modern'),
        columns: headStyle.gridTemplateColumns.split(' ').length,
        rowColumns: [...new Set(rows.map((row) => getComputedStyle(row).gridTemplateColumns.split(' ').length))],
        headerCells: headColumns.length,
        rowCount: rows.length,
        rowCellCounts: [...new Set(rows.map((row) => row.children.length))],
        headerFont: headStyle.fontFamily,
        headerBackground: headStyle.backgroundColor,
        choiceColors: headerStyles.map((style) => style.color),
        choiceBackgrounds: headerStyles.map((style) => style.backgroundColor),
        boxBorders: firstRowBoxStyles.map((style) => style.borderTopColor),
        expectedHeaderRects: headerRects.map(rectData),
        actualFirstRowCellRects: rowRects[0].map(rectData),
        firstRowDeltas: cellDeltas[0],
        allRowDeltas: cellDeltas,
        aligned: cellDeltas.every((cells) => cells.every((delta) => Math.abs(delta.centerX) <= 1)),
        bodyFits: body.scrollHeight <= body.clientHeight + 1 && body.scrollWidth <= body.clientWidth + 1
      };
    };
    const styled = capture();
    const removedRules = [];
    for (const sheet of [...document.styleSheets]) {
      for (let index = sheet.cssRules.length - 1; index >= 0; index -= 1) {
        const rule = sheet.cssRules[index];
        if (rule.selectorText?.includes(':has(.scale-form)')) {
          removedRules.push({ sheet, index, cssText: rule.cssText });
          sheet.deleteRule(index);
        }
      }
    }
    const withoutModifier = capture();
    for (const rule of removedRules.sort((left, right) => left.index - right.index)) {
      rule.sheet.insertRule(rule.cssText, rule.index);
    }
    return {
      ...styled,
      interLoaded: interFaces.some((face) => face.family.replaceAll('"', '') === 'Inter' && face.status === 'loaded'),
      removedModifierRules: removedRules.length,
      withoutModifier
    };
  })()`);
  assert.equal(scaleStyle.columns, 4, "s214-eval scale form keeps four aligned grid columns");
  assert.deepEqual(scaleStyle.rowColumns, [4], "s214-eval rows keep the same four columns as the header");
  assert.equal(scaleStyle.headerCells, 4, "s214-eval shows one criterion header and three scale headers");
  assert.ok(scaleStyle.rowCount > 0 && scaleStyle.rowCount <= selfAssessment.content.items.length,
    "s214-eval renders a non-empty, paginated set of criteria rows");
  assert.deepEqual(scaleStyle.rowCellCounts, [4], "each s214-eval row contains a criterion and three response cells");
  assert.match(scaleStyle.headerFont, /^Inter(?:,|$)/, "s214-eval scale header uses the local Inter font");
  assert.ok(scaleStyle.interLoaded, "the local Inter font face is loaded for s214-eval");
  assert.deepEqual(scaleStyle.choiceColors, ["rgb(23, 109, 104)", "rgb(83, 99, 167)", "rgb(154, 101, 15)"],
    "s214-eval scale headers use the teal, blue, and gold accents");
  assert.equal(scaleStyle.headerBackground, "rgb(226, 239, 235)", "s214-eval header uses the soft teal background");
  assert.deepEqual(scaleStyle.choiceBackgrounds, ["rgba(0, 0, 0, 0)", "rgb(236, 238, 250)", "rgb(248, 239, 217)"],
    "s214-eval blue and gold headers use matching soft accent backgrounds");
  assert.deepEqual(scaleStyle.boxBorders, ["rgb(23, 109, 104)", "rgb(83, 99, 167)", "rgb(154, 101, 15)"],
    "s214-eval response cells use the matching scale accents");
  assert.ok(scaleStyle.removedModifierRules > 0, "the scale-only modifier rules can be isolated for the baseline geometry comparison");
  if (scaleStyle.modernQa) {
    assert.match(scaleStyle.withoutModifier.headerFont, /^Inter(?:,|$)/,
      "QA typography remains active when scale-form modifiers are removed");
  } else {
    assert.doesNotMatch(scaleStyle.withoutModifier.headerFont, /^Inter(?:,|$)/,
      "baseline geometry capture disables the scale-only font modifier");
  }
  assert.ok(scaleStyle.aligned, `s214-eval response cells align horizontally with their scale headers. `
    + `Styled header=${JSON.stringify(scaleStyle.expectedHeaderRects)}, first row=${JSON.stringify(scaleStyle.actualFirstRowCellRects)}, `
    + `deltas=${JSON.stringify(scaleStyle.firstRowDeltas)}; without modifier header=${JSON.stringify(scaleStyle.withoutModifier.expectedHeaderRects)}, `
    + `first row=${JSON.stringify(scaleStyle.withoutModifier.actualFirstRowCellRects)}, deltas=${JSON.stringify(scaleStyle.withoutModifier.firstRowDeltas)}`);
  assert.ok(scaleStyle.bodyFits, "s214-eval fits without horizontal or vertical overflow at 1440x900");

  const visibleCriteria = [];
  for (let pageIndex = 0; pageIndex < selfAssessment.content.items.length; pageIndex += 1) {
    const pageCriteria = await page.evaluate(`Array.from(document.querySelectorAll('#canvas .scale-form__text > span:last-child')).map((node) => node.textContent.trim())`);
    visibleCriteria.push(...pageCriteria);
    if (visibleCriteria.length >= selfAssessment.content.items.length) break;
    const previousPage = JSON.stringify(pageCriteria);
    await page.evaluate("document.querySelector('#dock [data-action=next]').click()");
    await until(async () => JSON.stringify(await page.evaluate(
      `Array.from(document.querySelectorAll('#canvas .scale-form__text > span:last-child')).map((node) => node.textContent.trim())`
    )) !== previousPage, `s214-eval criteria page ${pageIndex + 2}`);
  }
  assert.deepEqual(visibleCriteria, selfAssessment.content.items,
    "s214-eval preserves all six criteria in source order across its visible content pages");

  await openStep("asik-atismasi", "s139-checklist");
  const criteriaStyle = await page.evaluate(`(() => {
    const slide = document.querySelector('#canvas .slide');
    const marker = getComputedStyle(slide.querySelector('.criteria li'), '::before');
    const accentProbe = document.createElement('span');
    accentProbe.style.color = getComputedStyle(slide).getPropertyValue('--accent').trim();
    slide.append(accentProbe);
    const accent = getComputedStyle(accentProbe).color;
    accentProbe.remove();
    return {
      hasScaleForm: Boolean(slide.querySelector('.scale-form')),
      assessmentTeal: getComputedStyle(slide).getPropertyValue('--assessment-teal').trim(),
      markerColor: marker.borderTopColor,
      accent
    };
  })()`);
  assert.equal(criteriaStyle.hasScaleForm, false, "s139-checklist remains a criteria list");
  assert.equal(criteriaStyle.assessmentTeal, "", "scale-form palette does not leak onto criteria slides");
  assert.equal(criteriaStyle.markerColor, criteriaStyle.accent, "criteria markers retain the regular lesson accent");

  await openStep("huzur-okuma", "s172-vocabulary");
  const vocabularyStyle = await page.evaluate(`(() => {
    const slide = document.querySelector('#canvas .slide');
    const slideStyle = getComputedStyle(slide);
    const vocab = slide.querySelector('.vocab');
    const item = vocab?.querySelector('.vocab__item');
    const term = item?.querySelector('.vocab__term');
    const meaning = item?.querySelector('.vocab__meaning');
    const style = getComputedStyle(term);
    const itemStyle = getComputedStyle(item);
    const resolveColor = (value) => {
      const probe = document.createElement('span');
      probe.style.cssText = 'position:fixed;visibility:hidden';
      probe.style.color = value.trim();
      document.body.append(probe);
      const color = getComputedStyle(probe).color;
      probe.remove();
      return color;
    };
    return {
      hasScaleForm: Boolean(slide.querySelector('.scale-form')),
      hasCriteriaList: Boolean(slide.querySelector('ul.criteria')),
      criteriaSelectorMatches: slide.matches(':not(.slide--qa-modern):has(ul.criteria):not(:has(.scale-form))'),
      criteriaTeal: slideStyle.getPropertyValue('--criteria-teal').trim(),
      assessmentTeal: slideStyle.getPropertyValue('--assessment-teal').trim(),
      dictInk: slideStyle.getPropertyValue('--dict-ink').trim(),
      dictAccent: slideStyle.getPropertyValue('--dict-accent').trim(),
      vocabInk: slideStyle.getPropertyValue('--vocab-ink').trim(),
      vocabTeal: slideStyle.getPropertyValue('--vocab-teal').trim(),
      itemBackground: itemStyle.backgroundColor,
      itemColor: itemStyle.color,
      termColor: style.color,
      lessonAccent: resolveColor(slideStyle.getPropertyValue('--accent')),
      vocabTermAccent: resolveColor(itemStyle.getPropertyValue('--vocab-term-accent')),
      termFont: style.fontFamily,
      definitionColor: getComputedStyle(meaning).color,
      definitionFont: getComputedStyle(meaning).fontFamily
    };
  })()`);
  console.log(`[sunum-web] Assessment vocabulary computed styles: ${JSON.stringify(vocabularyStyle)}`);
  assert.equal(vocabularyStyle.hasScaleForm, false, "s172-vocabulary remains a vocabulary layout");
  assert.equal(vocabularyStyle.hasCriteriaList, false, "s172-vocabulary has no criteria list for the criteria modifier to match");
  assert.equal(vocabularyStyle.criteriaSelectorMatches, false, "the .criteria slide selector does not match vocabulary slides");
  assert.equal(vocabularyStyle.criteriaTeal, "", "the .criteria palette does not leak onto vocabulary slides");
  assert.equal(vocabularyStyle.assessmentTeal, "", "scale-form palette does not leak onto vocabulary slides");
  assert.equal(vocabularyStyle.dictInk, "", "dictionary palette does not leak onto vocabulary slides");
  assert.equal(vocabularyStyle.dictAccent, "", "dictionary accent does not leak onto vocabulary slides");
  assert.notEqual(vocabularyStyle.vocabInk, "", "the vocabulary palette remains active on vocabulary cards");
  assert.equal(vocabularyStyle.itemBackground, "rgb(255, 255, 255)", "vocabulary cards retain their white surface");
  assert.equal(vocabularyStyle.itemColor, "rgb(24, 42, 53)", "vocabulary card text retains its ink color");
  assert.equal(vocabularyStyle.vocabTeal, "#176d68", "the first vocabulary card uses its intentional teal term accent");
  assert.equal(vocabularyStyle.vocabTermAccent, "rgb(23, 109, 104)", "the first card term resolves from the vocabulary teal palette");
  assert.equal(vocabularyStyle.termColor, vocabularyStyle.vocabTermAccent, "vocabulary term color comes from its card palette");
  assert.equal(vocabularyStyle.lessonAccent, "rgb(23, 109, 104)", "QA-modern keeps its teal shell accent aligned with the vocabulary palette");
  assert.doesNotMatch(vocabularyStyle.termFont, /^Inter(?:,|$)/, "vocabulary terms retain their serif font");
  assert.match(vocabularyStyle.definitionFont, /^Inter(?:,|$)/, "vocabulary definitions retain the Inter font");

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
