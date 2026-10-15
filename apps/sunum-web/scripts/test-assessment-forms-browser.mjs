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
  "--headless=new", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage", "--disable-popup-blocking", "--no-first-run",
  "--remote-allow-origins=*", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank"
], { stdio: "ignore" });
const clients = [];

// CI runners may need more time to start headless Chrome and finish heavy slide reflows.
async function until(check, label, timeout = 30000) {
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
const files = lessons.flatMap((lesson) => lesson.steps.flatMap((step) =>
  (step.content?.sources ?? []).filter((source) => source.download === true && /\.docx$/iu.test(source.url))
    .map((source) => [lesson.lesson_slug, step.id, path.basename(source.url)])));
assert.ok(files.length > 0, "canonical data declares downloadable assessment DOCX resources");
assert.equal(new Set(files.map(([, , filename]) => filename)).size, files.length,
  "downloadable assessment resources have unique filenames");
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
  let performanceCriteriaChecked = false;
  for (const [lessonSlug, stepId, filename] of files) {
    const { step } = await openStep(lessonSlug, stepId);
    const performanceRubric = !performanceCriteriaChecked && step.layout === "assessment" &&
      step.content.items?.length && !step.content.scale?.length;
    if (performanceRubric) {
      performanceCriteriaChecked = true;
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
      assert.ok(performanceCriteria.items.length > 0 &&
        JSON.stringify(performanceCriteria.items) === JSON.stringify(step.content.items.slice(0, performanceCriteria.items.length)),
      `${lessonSlug}/${stepId} starts its paginated criteria list in canonical source order`);
      assert.match(performanceCriteria.listFont, /^Inter(?:,|$)/, `${lessonSlug}/${stepId} criteria use Inter at 1920x1080`);
      assert.equal(performanceCriteria.criteriaInk, "#182a35", `${lessonSlug}/${stepId} uses the criteria palette`);
      assert.equal(performanceCriteria.criteriaTeal, "#176d68", `${lessonSlug}/${stepId} uses the criteria teal accent`);
      const expectedMarkerColors = ["rgb(23, 109, 104)", "rgb(83, 99, 167)", "rgb(154, 101, 15)", "rgb(23, 109, 104)", "rgb(83, 99, 167)", "rgb(154, 101, 15)"];
      assert.deepEqual(performanceCriteria.markerColors,
        performanceCriteria.items.map((_, index) => expectedMarkerColors[index % expectedMarkerColors.length]),
        `${lessonSlug}/${stepId} visible criteria markers retain the accent sequence`);
      assert.deepEqual(performanceCriteria.rowColumns, [2], `${lessonSlug}/${stepId} criteria retain the two-column checkbox row geometry`);
      assert.equal(performanceCriteria.listDisplay, "grid", `${lessonSlug}/${stepId} criteria retain the shared grid list layout`);
      assert.ok(performanceCriteria.fits, `${lessonSlug}/${stepId} criteria fit within the 1920x1080 body bounds: ${JSON.stringify(performanceCriteria.listRect)}`);
    }
    const download = await page.evaluate(`(() => {
      const a = document.querySelector('#canvas .source-links a[download]');
      return a && { href: a.href, name: a.download, label: a.textContent.trim() };
    })()`);
    assert.ok(download?.href.endsWith(`/assets/assessment-documents/${filename}`), `${stepId} links the correct DOCX asset`);
    assert.ok(download.label, `${stepId} has a named teacher download`);
    const expected = fs.readFileSync(path.join(appRoot, "dist/assets/assessment-documents", filename));
    await page.evaluate("document.querySelector('#canvas .source-links a[download]').click()");
    const downloadedPath = await until(() => {
      const path = profile + "/" + filename;
      if (!fs.existsSync(path) || fs.existsSync(`${path}.crdownload`)) return null;
      return fs.statSync(path).size === expected.length ? path : null;
    }, `${filename} browser download`);
    const actual = fs.readFileSync(downloadedPath);
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
    if (step.content.rubric?.rows?.length) {
      for (const row of step.content.rubric.rows) {
        assert.ok(allText.includes(row.criterion),
          `${stepId} retains rubric criterion ${row.criterion}`);
        for (const level of row.levels) {
          assert.ok(allText.includes(level.points),
            `${stepId} retains score range ${level.points} for ${row.criterion}`);
          assert.ok(normalizedText.includes(level.description.replace(/\s+/g, " ").trim()),
            `${stepId} retains full rubric descriptor for ${row.criterion} / ${level.label}`);
        }
      }
    } else {
      for (const section of step.content.sections || []) {
        assert.ok(allText.includes(section.title), `${stepId} retains rubric level ${section.title}`);
        if (section.body) assert.ok(normalizedText.includes(section.body.replace(/\s+/g, " ").trim()),
          `${stepId} retains full rubric descriptor for ${section.title}`);
      }
    }
    if (performanceRubric) {
      let previousCriterionIndex = -1;
      for (const criterion of step.content.items) {
        const criterionIndex = allText.indexOf(criterion, previousCriterionIndex + 1);
        assert.ok(criterionIndex > previousCriterionIndex, `${lessonSlug}/${stepId} retains each criterion in source order: ${criterion}`);
        previousCriterionIndex = criterionIndex;
      }
      let previousTitleIndex = -1;
      for (const section of step.content.sections ?? []) {
        const titleIndex = allText.indexOf(section.title, previousTitleIndex + 1);
        assert.ok(titleIndex > previousTitleIndex, `${lessonSlug}/${stepId} keeps rubric level order: ${section.title}`);
        previousTitleIndex = titleIndex;
      }
      if (totalPages > 1) {
        const beforeBack = await inspectPage();
        await page.evaluate("document.querySelector('#dock [data-action=prev]').click()");
        const previousPage = await until(async () => {
          const result = await inspectPage();
          return result.counter !== beforeBack.counter ? result : null;
        }, `${stepId} previous rubric page`);
        assert.equal(previousPage.counter, pageCounters.at(-2), `${stepId} previous returns to the preceding rubric page`);
        assert.equal(previousPage.text, pagesText.at(-2), `${stepId} previous restores the preceding rubric content`);
        assert.equal(previousPage.overflow, false, `${stepId} previous page remains overflow-free`);
        assert.ok(previousPage.scrollHeight <= previousPage.clientHeight + 1 && previousPage.scrollWidth <= previousPage.clientWidth + 1,
          `${stepId} previous page preserves its 1920x1080 fit`);
        await page.evaluate("document.querySelector('#dock [data-action=next]').click()");
        const restoredLastPage = await until(async () => {
          const result = await inspectPage();
          return result.counter !== previousPage.counter ? result : null;
        }, `${stepId} next rubric page`);
        assert.equal(restoredLastPage.counter, pageCounters.at(-1), `${stepId} next returns to the last rubric page`);
        assert.equal(restoredLastPage.text, pagesText.at(-1), `${stepId} next restores the last rubric content`);
        assert.equal(restoredLastPage.overflow, false, `${stepId} forward page remains overflow-free`);
      }
      await page.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    }
  }

  const scaleCase = lessons.flatMap((lesson) => lesson.steps.map((step) => ({ lesson, step })))
    .find(({ step }) => step.layout === "assessment" && step.content?.items?.length && step.content.scale?.length);
  assert.ok(scaleCase, "canonical data contains a scale-form assessment");
  const { step: selfAssessment } = await openStep(scaleCase.lesson.lesson_slug, scaleCase.step.id);
  const expectedColumnCount = selfAssessment.content.scale.length + 1;
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
        modernAssessment: slide.classList.contains('slide--visual-assessment'),
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
  assert.equal(scaleStyle.columns, expectedColumnCount, "scale-form header has one criterion column plus current response choices");
  assert.deepEqual(scaleStyle.rowColumns, [expectedColumnCount], "scale-form rows keep the same columns as their header");
  assert.equal(scaleStyle.headerCells, expectedColumnCount, "scale-form header matches current criterion and response choices");
  assert.ok(scaleStyle.rowCount > 0 && scaleStyle.rowCount <= selfAssessment.content.items.length,
    `${selfAssessment.id} renders a non-empty, paginated set of current criteria rows`);
  assert.deepEqual(scaleStyle.rowCellCounts, [expectedColumnCount], "each scale-form row matches its current response choices");
  assert.match(scaleStyle.headerFont, /^Inter(?:,|$)/, "scale-form header uses the local Inter font");
  assert.ok(scaleStyle.interLoaded, "the local Inter font face is loaded for the scale form");
  assert.equal(scaleStyle.choiceColors.length, selfAssessment.content.scale.length,
    "every current scale response has a header accent");
  assert.ok(scaleStyle.choiceColors.every((color) => color && color !== "rgb(0, 0, 0)"),
    "every current scale response has a visible header accent");
  assert.equal(scaleStyle.headerBackground, "rgb(226, 239, 235)", "scale-form header uses the soft teal background");
  assert.deepEqual(scaleStyle.boxBorders, scaleStyle.choiceColors,
    "response cell borders match the current scale header accents");
  assert.ok(scaleStyle.removedModifierRules > 0, "the scale-only modifier rules can be isolated for the baseline geometry comparison");
  if (scaleStyle.modernQa || scaleStyle.modernAssessment) {
    assert.match(scaleStyle.withoutModifier.headerFont, /^Inter(?:,|$)/,
      "the shared modern shell keeps Inter when scale-form modifiers are removed");
  } else {
    assert.doesNotMatch(scaleStyle.withoutModifier.headerFont, /^Inter(?:,|$)/,
      "baseline geometry capture disables the scale-only font modifier");
  }
  assert.ok(scaleStyle.aligned, `scale-form response cells align horizontally with their headers. `
    + `Styled header=${JSON.stringify(scaleStyle.expectedHeaderRects)}, first row=${JSON.stringify(scaleStyle.actualFirstRowCellRects)}, `
    + `deltas=${JSON.stringify(scaleStyle.firstRowDeltas)}; without modifier header=${JSON.stringify(scaleStyle.withoutModifier.expectedHeaderRects)}, `
    + `first row=${JSON.stringify(scaleStyle.withoutModifier.actualFirstRowCellRects)}, deltas=${JSON.stringify(scaleStyle.withoutModifier.firstRowDeltas)}`);
  assert.ok(scaleStyle.bodyFits, "scale form fits without horizontal or vertical overflow at 1440x900");

  const visibleCriteria = [];
  for (let pageIndex = 0; pageIndex < selfAssessment.content.items.length; pageIndex += 1) {
    const pageCriteria = await page.evaluate(`Array.from(document.querySelectorAll('#canvas .scale-form__text > span:last-child')).map((node) => node.textContent.trim())`);
    visibleCriteria.push(...pageCriteria);
    if (visibleCriteria.length >= selfAssessment.content.items.length) break;
    const previousPage = JSON.stringify(pageCriteria);
    await page.evaluate("document.querySelector('#dock [data-action=next]').click()");
    await until(async () => JSON.stringify(await page.evaluate(
      `Array.from(document.querySelectorAll('#canvas .scale-form__text > span:last-child')).map((node) => node.textContent.trim())`
    )) !== previousPage, `scale-form criteria page ${pageIndex + 2}`);
  }
  assert.deepEqual(visibleCriteria, selfAssessment.content.items,
    "scale form preserves each current criterion in source order across its visible content pages");

  const checklistCase = lessons.flatMap((lesson) => lesson.steps.map((step) => ({ lesson, step })))
    .find(({ step }) => step.layout === "assessment" && step.content?.items?.length && !step.content.scale?.length);
  assert.ok(checklistCase, "canonical data contains an assessment criteria list");
  await openStep(checklistCase.lesson.lesson_slug, checklistCase.step.id);
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
  assert.equal(criteriaStyle.hasScaleForm, false, `${checklistCase.step.id} remains a criteria list`);
  assert.equal(criteriaStyle.assessmentTeal, "", "scale-form palette does not leak onto criteria slides");
  assert.equal(criteriaStyle.markerColor, criteriaStyle.accent, "criteria markers retain the regular lesson accent");

  const vocabularyCase = lessons.flatMap((lesson) => lesson.steps.map((step) => ({ lesson, step })))
    .find(({ step }) => step.layout === "vocabulary" && Object.keys(step.answer?.answer_sections ?? {}).length > 1);
  assert.ok(vocabularyCase, "canonical data contains a vocabulary card set");
  await openStep(vocabularyCase.lesson.lesson_slug, vocabularyCase.step.id);
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
  assert.equal(vocabularyStyle.hasScaleForm, false, `${vocabularyCase.step.id} remains a vocabulary layout`);
  assert.equal(vocabularyStyle.hasCriteriaList, false,
    `${vocabularyCase.step.id} has no criteria list for the criteria modifier to match`);
  assert.equal(vocabularyStyle.criteriaSelectorMatches, false, "the .criteria slide selector does not match vocabulary slides");
  assert.equal(vocabularyStyle.criteriaTeal, "", "the .criteria palette does not leak onto vocabulary slides");
  assert.equal(vocabularyStyle.assessmentTeal, "", "scale-form palette does not leak onto vocabulary slides");
  assert.equal(vocabularyStyle.dictInk, "", "dictionary palette does not leak onto vocabulary slides");
  assert.equal(vocabularyStyle.dictAccent, "", "dictionary accent does not leak onto vocabulary slides");
  assert.notEqual(vocabularyStyle.vocabInk, "", "the vocabulary palette remains active on vocabulary cards");
  assert.equal(vocabularyStyle.itemBackground, "rgb(255, 255, 255)", "vocabulary cards retain their white surface");
  assert.equal(vocabularyStyle.itemColor, "rgb(24, 42, 53)", "vocabulary card text retains its ink color");
  assert.notEqual(vocabularyStyle.vocabTeal, "", "vocabulary cards configure a term accent");
  assert.notEqual(vocabularyStyle.vocabTermAccent, "", "the first term resolves from the vocabulary palette");
  assert.equal(vocabularyStyle.termColor, vocabularyStyle.vocabTermAccent, "vocabulary term color comes from its card palette");
  assert.ok(vocabularyStyle.lessonAccent, "the vocabulary slide resolves its lesson accent");
  assert.doesNotMatch(vocabularyStyle.termFont, /^Inter(?:,|$)/, "vocabulary terms retain their serif font");
  assert.match(vocabularyStyle.definitionFont, /^Inter(?:,|$)/, "vocabulary definitions retain the Inter font");

  await page.evaluate("document.querySelector('#dock [data-action=menu]').click()");
  const menuWidgets = await page.evaluate("document.querySelectorAll('#menu .assessment-resources, #menu input[type=file]').length");
  assert.equal(menuWidgets, 0, "lesson menu does not expose an upload flow for already prepared resources");
  console.log(`[sunum-web] Chrome assessment check passed: ${files.length} DOCX downloads; ${pageParts} content pages fit at 1440x900 with each current criterion and level rendered.`);
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
