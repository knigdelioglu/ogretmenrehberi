import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { resolveWebPresentation, validateWebPresentationIndex } from "../../lesson-player/scripts/web-presentation.mjs";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(appRoot, "../..");
const themeRoot = path.join(repoRoot, "data/grade-11/presentation/theme-2");
const sourceRoot = path.join(repoRoot, "data/grade-11/source/teacher-book/theme-2");
const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const answerFiles = fs.readdirSync(path.join(sourceRoot, "answer-bank"))
  .filter((name) => /^part-.*\.json$/.test(name));
const answerEntries = answerFiles.flatMap((name) =>
  readJson(path.join(sourceRoot, "answer-bank", name)).entries
);
const answers = new Map(answerEntries.map((entry) => [entry.question_id, entry]));
const config = readJson(path.join(themeRoot, "web-presentation.json"));
const flowFiles = fs.readdirSync(themeRoot).filter((name) => /-flow\.json$/.test(name)).sort();
const flows = flowFiles.map((name) => readJson(path.join(themeRoot, name)));
const flowSteps = flows.flatMap((flow) => flow.steps.map((step) => ({ flow, step })));
const stepByAnswer = new Map(flowSteps.filter(({ step }) => step.answer_id)
  .map(({ flow, step }) => [step.answer_id, { flow, step }]));
const sourceIndex = readJson(path.join(sourceRoot, "source-index.json"));
const sourceRecords = new Map(sourceIndex.records.map((record) => [record.source_record_id, record]));

function effectiveUnits(entry, override = {}) {
  if (override.units) return override.units;
  const sections = entry.answer_sections;
  if (sections && !Array.isArray(sections)) {
    return Object.keys(sections).map((key) => ({ id: key, sections: [key] }));
  }
  if (Array.isArray(sections) && sections.length) {
    return [{ id: "answer", items: sections.map((_, index) => index) }];
  }
  return [{ id: "answer" }];
}

function effectiveAnswerText(entry, override, units) {
  if (override.answer_text) return override.answer_text;
  return entry.answer_sections && (Array.isArray(entry.answer_sections)
    ? entry.answer_sections.length
    : Object.keys(entry.answer_sections).length)
    ? {
        mode: "omit",
        reason: "Bölümlü cevap, bağımsız yanıt birimlerinin sırasını korumak için özet yerine kullanılır."
      }
    : { mode: "include", unit: units[0].id };
}

function normalize(value) {
  return String(value).normalize("NFKC").toLocaleLowerCase("tr")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

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

function stringsDeep(value, result = []) {
  if (typeof value === "string") result.push(value);
  else if (Array.isArray(value)) value.forEach((item) => stringsDeep(item, result));
  else if (value && typeof value === "object") Object.values(value).forEach((item) => stringsDeep(item, result));
  return result;
}

function verifySourceCoverage() {
  assert.equal(sourceIndex.counts.records, sourceIndex.records.length, "source record count matches index");
  assert.equal(sourceIndex.counts.verified_records,
    sourceIndex.records.filter((record) => record.source_status === "VERIFIED").length,
    "verified record count matches index");
  assert.equal(sourceIndex.records.length, 159, "complete Theme 2 source index");
  assert.equal(sourceRecords.size, sourceIndex.records.length, "source record IDs are unique");
  assert.ok(sourceIndex.records.every((record) => record.source_status === "VERIFIED"));

  const bookPageDir = path.join(repoRoot, "data/book/grade-11/themes/theme-2/pages");
  const pageFiles = fs.readdirSync(bookPageDir).filter((name) => /^p\d+\.json$/.test(name)).sort();
  const pages = pageFiles.map((name) => readJson(path.join(bookPageDir, name)));
  assert.equal(pages.length, 76, "book source has printed pages 84–159");
  const pageTexts = pages.map((page) => ({
    printed: page.printed_page,
    pdf: page.pdf_page,
    text: normalize(stringsDeep(page.blocks).join(" "))
  }));
  assert.deepEqual(pageTexts.map((page) => page.printed).sort((a, b) => a - b),
    Array.from({ length: 76 }, (_, index) => index + 84));
  for (const page of pageTexts) assert.equal(page.pdf, page.printed + 1, `PDF page mapping for printed ${page.printed}`);

  const matchedPrintedPages = new Set();
  let quoteCount = 0;
  for (const entry of answerEntries) {
    for (const quote of entry.evidence_quotes || []) {
      quoteCount += 1;
      const needle = normalize(quote);
      const matches = pageTexts.filter((page) => page.text.includes(needle));
      assert.ok(matches.length, `evidence quote has source text: ${entry.question_id}: ${quote}`);
      matches.forEach((page) => matchedPrintedPages.add(page.printed));
    }
  }
  assert.equal(quoteCount, 67, "all 67 Theme 2 evidence quotes are checked");
  assert.deepEqual([...matchedPrintedPages].sort((a, b) => a - b),
    [86, 87, 90, 91, 92, 94, 95, 107, 114, 115, 116, 117, 120, 124, 125, 126, 127, 128, 132, 136, 138, 141, 143, 144, 150, 155]);

  assert.equal(answers.get("T2-P143-Q04").evidence_quotes[2], "tütmesi gereken ocak nerde?");
  assert.equal(answers.get("T2-P144-Q02").evidence_quotes[1],
    "gelenekle ilgili tüm bildiklerini sakınmadan çıraklarına öğretmeli");
  assert.equal(answers.get("T2-P155-Q01").evidence_quotes[0], "Yufka kalın olsa delmesi zormuş.");
  return { pageCount: pages.length, quoteCount, matchedPrintedPages: [...matchedPrintedPages].sort((a, b) => a - b) };
}

function verifyFlowCoverage() {
  assert.equal(flowFiles.length, 9, "all nine Theme 2 flows are present");
  assert.equal(flowSteps.length, 201, "all Theme 2 flow steps are present");
  assert.ok(flows.every((flow) => flow.theme_id === "TEMA_02"));
  const stepIds = new Set();
  const linkedSourceIds = new Set();
  const linkedAnswerIds = new Set();
  for (const { flow, step } of flowSteps) {
    const stepKey = `${flow.lesson_id}/${step.id}`;
    assert.ok(!stepIds.has(stepKey), `unique flow step ${stepKey}`);
    stepIds.add(stepKey);
    assert.ok(sourceRecords.has(step.source_record_id), `known source record ${step.source_record_id}`);
    linkedSourceIds.add(step.source_record_id);
    if (step.answer_id) {
      assert.ok(answers.has(step.answer_id), `known answer entry ${step.answer_id}`);
      linkedAnswerIds.add(step.answer_id);
    }
  }
  assert.equal(linkedSourceIds.size, 159, "every source record is referenced by a flow");
  assert.equal(linkedAnswerIds.size, 177, "every answer bank entry is referenced by a flow");
  assert.equal(answers.size, 177, "complete Theme 2 answer bank");
  assert.deepEqual([...answers.keys()].filter((id) => !linkedAnswerIds.has(id)), []);
}

function verifyPresentationConfig() {
  validateWebPresentationIndex(config, {
    themeNumber: 2,
    themeId: config.theme_id,
    answerById: answers
  });
  assert.equal(config.schema_version, "1.1.0");
  assert.equal(config.theme_id, "TEMA_02");
  assert.deepEqual(config.defaults, {
    section_units: "one-per-section",
    structured_answer_text: "omit-summary",
    array_answer_units: "one-list"
  });
  for (const answerId of Object.keys(config.answers)) assert.ok(answers.has(answerId), `known override ${answerId}`);

  const answerTextAudit = {
    structured: 0,
    omitted: 0,
    included: 0,
    fragments: 0,
    stagedAnswers: 0,
    evidenceSections: 0
  };
  for (const [answerId, entry] of answers) {
    const override = config.answers[answerId] || {};
    const units = effectiveUnits(entry, override);
    const unitIds = new Set();
    const referencedSections = [];
    const referencedItems = [];
    const evidenceSectionRecords = [];
    for (const unit of units) {
      assert.ok(typeof unit.id === "string" && unit.id.trim(), `non-empty unit ID for ${answerId}`);
      assert.ok(!unitIds.has(unit.id), `unique unit ID for ${answerId}`);
      unitIds.add(unit.id);
      if (unit.sections) {
        assert.ok(unit.sections.length && !unit.items, `section-only unit for ${answerId}`);
        for (const key of unit.sections) {
          assert.ok(entry.answer_sections && !Array.isArray(entry.answer_sections) &&
            Object.hasOwn(entry.answer_sections, key), `valid answer section ${answerId}/${key}`);
          referencedSections.push(key);
        }
      }
      if (unit.evidence_sections) {
        assert.ok(Array.isArray(unit.evidence_sections) && unit.evidence_sections.length,
          `non-empty evidence sections for ${answerId}/${unit.id}`);
        for (const section of unit.evidence_sections) {
          assert.ok(entry.answer_sections && !Array.isArray(entry.answer_sections) &&
            Object.hasOwn(entry.answer_sections, section.key),
          `valid evidence section ${answerId}/${section.key}`);
          assert.ok(!section.sections && !section.items, `evidence section is not answer content: ${answerId}/${section.key}`);
          const quoteIndexes = section.contains_quote_indexes || [];
          assert.ok(Array.isArray(quoteIndexes), `evidence quote index list for ${answerId}/${section.key}`);
          assert.equal(new Set(quoteIndexes).size, quoteIndexes.length,
            `unique inline quote indexes for ${answerId}/${section.key}`);
          for (const quoteIndex of quoteIndexes) {
            assert.ok(Number.isInteger(quoteIndex) && quoteIndex >= 0 &&
              quoteIndex < (entry.evidence_quotes || []).length,
            `valid inline evidence index ${answerId}/${section.key}/${quoteIndex}`);
          }
          referencedSections.push(section.key);
          evidenceSectionRecords.push({ unit, section });
        }
      }
      if (unit.items) {
        assert.ok(Array.isArray(entry.answer_sections), `array unit for ${answerId}`);
        unit.items.forEach((index) => {
          assert.ok(Number.isInteger(index) && index >= 0 && index < entry.answer_sections.length,
            `valid answer item ${answerId}/${index}`);
          referencedItems.push(index);
        });
      }
    }
    const sections = entry.answer_sections;
    if (sections && !Array.isArray(sections)) {
      assert.deepEqual([...referencedSections].sort(), Object.keys(sections).sort(), `all keyed answer sections assigned once: ${answerId}`);
    } else if (Array.isArray(sections) && sections.length) {
      assert.deepEqual([...referencedItems].sort((a, b) => a - b), sections.map((_, index) => index),
        `all answer list items assigned once: ${answerId}`);
    } else assert.equal(units.length, 1, `one text-only response unit: ${answerId}`);

    const answerText = effectiveAnswerText(entry, override, units);
    const hasStructuredSections = Array.isArray(entry.answer_sections)
      ? entry.answer_sections.length > 0
      : Boolean(entry.answer_sections && Object.keys(entry.answer_sections).length);
    assert.ok(["omit", "include"].includes(answerText.mode), `valid answer summary policy: ${answerId}`);
    if (hasStructuredSections) {
      answerTextAudit.structured += 1;
      answerTextAudit[answerText.mode === "omit" ? "omitted" : "included"] += 1;
    }
    if (answerText.fragments) answerTextAudit.fragments += answerText.fragments.length;
    if (evidenceSectionRecords.length) {
      answerTextAudit.stagedAnswers += 1;
      answerTextAudit.evidenceSections += evidenceSectionRecords.length;
    }
    if (answerText.mode === "include") {
      if (answerText.fragments) {
        assert.ok(!answerText.unit && Array.isArray(answerText.fragments) && answerText.fragments.length,
          `included answer fragments are explicit: ${answerId}`);
        for (const fragment of answerText.fragments) {
          assert.ok(unitIds.has(fragment.unit), `answer fragment belongs to a response unit: ${answerId}/${fragment.unit}`);
          assert.ok(fragment.text.trim() && entry.answer.includes(fragment.text),
            `answer fragment is an exact source excerpt: ${answerId}`);
          assert.ok(["start", "end"].includes(fragment.position || "start"),
            `answer fragment position is valid: ${answerId}`);
        }
      } else {
        assert.ok(unitIds.has(answerText.unit), `answer text belongs to a response unit: ${answerId}`);
        assert.ok(units.length === 1, `multi-unit summaries use exact fragments: ${answerId}`);
      }
    }
    if (answerText.mode === "omit" && override.answer_text) assert.ok(override.answer_text.reason?.trim());
    const flowTarget = stepByAnswer.get(answerId);
    assert.ok(flowTarget, `answer has a canonical flow step: ${answerId}`);
    const resolved = resolveWebPresentation(flowTarget.step, entry, { webPresentation: config });
    if (flowTarget.step.layout === "vocabulary") assert.equal(resolved, undefined);
    else assert.equal(resolved.units.length, units.length, `shared resolver preserves units: ${answerId}`);

    const quotes = entry.evidence_quotes || [];
    const links = override.quote_links || [];
    const linkPairs = new Set();
    const linkedIndexes = new Set();
    for (const link of links) {
      assert.ok(Number.isInteger(link.index) && link.index >= 0 && link.index < quotes.length,
        `valid evidence index ${answerId}/${link.index}`);
      assert.ok(unitIds.has(link.unit), `evidence links to an answer unit ${answerId}/${link.unit}`);
      const pair = `${link.index}\u0000${link.unit}`;
      assert.ok(!linkPairs.has(pair), `unique evidence quote/unit pair: ${answerId}/${link.index}/${link.unit}`);
      linkPairs.add(pair);
      linkedIndexes.add(link.index);
    }
    assert.equal(linkedIndexes.size, quotes.length, `every evidence quote has at least one target: ${answerId}`);
    assert.deepEqual([...linkedIndexes].sort((a, b) => a - b), quotes.map((_, index) => index),
      `all evidence indexes are linked: ${answerId}`);
    for (const { unit, section } of evidenceSectionRecords) {
      for (const quoteIndex of section.contains_quote_indexes || []) {
        assert.ok(linkPairs.has(`${quoteIndex}\u0000${unit.id}`),
          `inline quote belongs to the same evidence unit: ${answerId}/${quoteIndex}/${unit.id}`);
      }
    }
    if (entry.entry_type === "source_limited") assert.equal(quotes.length, 0, `source-limited item has no invented evidence: ${answerId}`);
  }
  assert.deepEqual(answerTextAudit, {
    structured: 164,
    omitted: 139,
    included: 25,
    fragments: 28,
    stagedAnswers: 16,
    evidenceSections: 23
  }, "answer-summary review and evidence staging remain complete");

  const expectedMediaLimited = [
    "T2-P113-Q01", "T2-P129-Q01", "T2-P140-VOC01", "T2-P142-Q02", "T2-P143-Q02",
    "T2-P143-Q03", "T2-P144-MAP01", "T2-P145-PERF01", "T2-P147-Q01", "T2-P159-Q08"
  ];
  assert.deepEqual(answerEntries.filter((entry) => entry.entry_type === "source_limited")
    .map((entry) => entry.question_id).sort(), [...expectedMediaLimited].sort());

  const unitsFor = (id) => effectiveUnits(answers.get(id), config.answers[id] || {});
  for (const answerId of new Set(flowSteps.filter(({ step }) => step.layout === "comparison")
    .map(({ step }) => step.answer_id).filter(Boolean))) {
    assert.equal(unitsFor(answerId).length, 1, `comparison product remains one response group: ${answerId}`);
  }
  assert.deepEqual(unitsFor("T2-P100-Q08").map((unit) => unit.id), ["topic", "writing-purpose"]);
  assert.deepEqual(unitsFor("T2-P101-Q10").map((unit) => unit.sections[0]),
    Object.keys(answers.get("T2-P101-Q10").answer_sections), "narration and message categories remain distinct");
  assert.deepEqual(unitsFor("T2-P121-Q03").map((unit) => unit.id), ["narrator-features", "narrative-purposes"]);
  assert.deepEqual(unitsFor("T2-P136-Q01").map((unit) => unit.sections), [
    ["Sanatsal İcra", "Metindeki Deney"], ["Günlük Hayat / Sanatçıyla İlişki"]
  ]);
  assert.deepEqual(unitsFor("T2-P155-Q01").map((unit) => unit.sections), [
    ["Emek ve çalışma", "Devlet ve düzen", "Güç ve mücadele"],
    ["Günümüzle ilişki — örnek yorum"]
  ]);
  assert.deepEqual(unitsFor("T2-P155-Q01")[0].evidence_sections.map((section) => section.key),
    ["Birlik ve dayanışma"], "the shared-purpose quote follows the classification answer");
  assert.deepEqual(unitsFor("T2-P159-Q07").map((unit) => unit.sections), [
    ["a) Yanlış değerlendirme", "Diğer tespitler"], ["b) Örnek değerlendirme cümlesi"]
  ]);
  for (const answerId of ["T2-P155-Q02", "T2-P157-Q05", "T2-P158-Q06"]) {
    const policy = config.answers[answerId].answer_text;
    assert.equal(policy.mode, "include", `direct multiple-choice answer included with its analysis: ${answerId}`);
    assert.equal(policy.fragments[0].unit, unitsFor(answerId)[0].id);
    assert.ok(policy.fragments[0].text.trim() !== answers.get(answerId).answer.trim(),
      `only the direct choice fragment precedes its analysis: ${answerId}`);
  }

  const evidenceDecision = (answerId, unitId) => {
    const unit = unitsFor(answerId).find((candidate) => candidate.id === unitId);
    assert.ok(unit, `evidence-bearing answer unit exists: ${answerId}/${unitId}`);
    return unit.evidence_sections || [];
  };
  for (const [answerId, unitId, keys] of [
    ["T2-P100-Q01", "decision", ["Gerekçeler"]],
    ["T2-P100-Q02", "caydirma", ["Öz annesi olmaması"]],
    ["T2-P117-Q01", "bilge-intents", ["Sözü kalıcılaştırma"]],
    ["T2-P127-Q02", "fieldwork-and-comparison", ["Saha ve Dil Derlemesi"]],
    ["T2-P127-Q03", "social-advice", ["Yakınları Ağırlama", "Hediyeleşmede Karşılıklılık"]],
    ["T2-P128-FARK03", "cause-and-effect", ["Metinde Verilen Neden"]],
    ["T2-P128-Q01", "rhetorical-features", ["Hitabet Gücü"]],
    ["T2-P136-Q02", "saz-as-companion", ["Birlikte Üretim", "Sırdaşlık ve Vefa"]],
    ["T2-P143-Q04", "comparison", ["Münacaat'ın Dilinden Gözlenebilenler"]],
    ["T2-P144-Q01", "respect-and-transmission", ["Çırağın Ustaya Yaklaşımı", "Ahlak ve Dürüstlük", "Bilgiyi Paylaşma"]],
    ["T2-P144-Q03", "training-to-wordplay", ["Metindeki Dayanak 1", "Metindeki Dayanak 2"]],
    ["T2-P155-Q01", "society-classification", ["Birlik ve dayanışma"]]
  ]) {
    assert.deepEqual(evidenceDecision(answerId, unitId).map((section) => section.key), keys,
      `source evidence is intentionally staged after its related answer: ${answerId}`);
  }
  const sharedQuoteTargets = config.answers["T2-P127-Q02"].quote_links
    .filter((link) => link.index === 1).map((link) => link.unit);
  assert.deepEqual(sharedQuoteTargets, ["fieldwork-and-comparison", "language-history"],
    "the same language-sample quote supports both comparison and language-history units");
  assert.deepEqual(config.answers["T2-P144-Q02"].quote_links.filter((link) => link.index === 0)
    .map((link) => link.unit), ["Eser ve İsimlerin Yaşaması", "Geleneğin Devamı"],
  "the same master-apprentice quote supports both continuity and legacy units");
  assert.equal(config.answers["T2-P107-Q1B"].answer_text.mode, "omit",
    "the compound internal-conflict summary stays hidden before its separate units");
  assert.ok(config.answers["T2-P107-Q1B"].answer_text.reason);
}

async function runBrowserChecks() {
  const candidates = [
    process.env.CHROME,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium"
  ].filter(Boolean);
  const chrome = candidates.find((candidate) => fs.existsSync(candidate));
  assert.ok(chrome, "Set CHROME to an installed Chrome/Chromium executable for real-browser checks.");
  const lessonsFile = path.join(repoRoot, "apps/lesson-player/src/generated/lessons.json");
  const lessons = readJson(lessonsFile);
  const port = Number(process.env.PORT || 5184);
  const root = `http://127.0.0.1:${port}`;
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "sunum-theme2-cdp-"));
  const server = spawn(process.execPath, [path.join(appRoot, "scripts/serve.mjs")], {
    env: { ...process.env, PORT: String(port) }, stdio: "ignore"
  });
  const browser = spawn(chrome, [
    "--headless=new", "--no-sandbox", "--disable-gpu", "--disable-popup-blocking", "--no-first-run",
    "--remote-allow-origins=*", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank"
  ], { stdio: "ignore" });
  let client;

  async function until(check, label, timeout = 15000) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      try {
        const result = await check();
        if (result) return result;
      } catch { /* navigation briefly destroys the execution context */ }
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
    let sequence = 0;
    const pending = new Map();
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (!message.id || !pending.has(message.id)) return;
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    });
    client = {
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
    await client.send("Page.enable");
    return client;
  }

  async function bodyText() {
    return client.evaluate("document.querySelector('#canvas .slide__body')?.innerText ?? ''");
  }

  async function visibleTerms() {
    return client.evaluate("Array.from(document.querySelectorAll('#canvas .vocab__term, #canvas .dict dt')).map((node) => node.textContent.trim())");
  }

  async function state() {
    return client.evaluate(`(() => {
      const answer = document.querySelector('#canvas .panel--answer');
      const evidence = document.querySelector('#canvas .panel--evidence');
      const sections = answer?.querySelector('.sections');
      const rect = (element) => element ? element.getBoundingClientRect().toJSON() : null;
      return {
        text: document.querySelector('#canvas .slide__body')?.innerText ?? '',
        answerText: answer?.innerText ?? '', evidenceText: evidence?.innerText ?? '',
        answerHeadings: Array.from(answer?.querySelectorAll('.sec h3') ?? []).map((node) => node.textContent.trim()),
        columns: sections ? getComputedStyle(sections).gridTemplateColumns.trim().split(/\\s+/).length : 0,
        panelRect: rect(answer), sectionsRect: rect(sections),
        hasEvidence: Boolean(evidence)
      };
    })()`);
  }

  async function next() {
    await client.evaluate(`(() => {
      const body = document.querySelector('#canvas .slide__body');
      if (body) body.scrollTop = body.scrollHeight;
      document.querySelector('#dock [data-action=next]').click();
    })()`);
    await sleep(100);
    return state();
  }

  async function advanceUntil(predicate, label, max = 16) {
    let current = await state();
    for (let count = 0; count <= max; count += 1) {
      if (predicate(current)) return current;
      current = await next();
    }
    assert.fail(`Could not reach ${label}; last slide text: ${current.text.slice(0, 320)}`);
  }

  async function setViewport(width) {
    await client.send("Emulation.setDeviceMetricsOverride", {
      width, height: 900, deviceScaleFactor: 1, mobile: width < 600
    });
    await sleep(100);
  }

  async function openAnswer(answerId, width) {
    const target = stepByAnswer.get(answerId);
    assert.ok(target, `flow step exists for ${answerId}`);
    const lesson = lessons.find((item) => item.lesson_slug === target.flow.lesson_slug);
    assert.ok(lesson, `generated lesson exists for ${target.flow.lesson_slug}`);
    const index = lesson.steps.findIndex((step) => step.id === target.step.id);
    assert.ok(index >= 0, `generated step exists for ${answerId}`);
    const step = lesson.steps[index];
    assert.equal(step.answer?.question_id, answerId, `generated answer matches ${answerId}`);
    if (step.layout !== "vocabulary") assert.ok(step.presentation?.web, `web presentation exists for ${answerId}`);
    await client.send("Page.navigate", { url: `${root}/#/${lesson.lesson_slug}/${index + 1}` });
    await until(async () => (await bodyText()).includes(step.display_prompt), `open ${answerId}`);
    return step;
  }

  try {
    await until(async () => (await fetch(root)).ok, "Sunum Web local server");
    const portFile = path.join(profile, "DevToolsActivePort");
    const debugPort = await until(() => fs.existsSync(portFile)
      ? Number(fs.readFileSync(portFile, "utf8").split("\n")[0]) : null, "Chrome debugging endpoint");
    await connectTarget(debugPort);
    await setViewport(1440);
    await client.send("Page.navigate", { url: `${root}/#/karagoz/0` });
    await until(() => client.evaluate("!document.querySelector('#gate').hidden"), "password screen");
    const password = process.env.SUNUM_SIFRE || "sunum";
    await client.evaluate(`document.querySelector('#gate-password').value = ${JSON.stringify(password)}; document.querySelector('#gate-submit').click()`);
    await until(() => client.evaluate("Boolean(document.querySelector('#canvas .slide'))"), "unlocked presentation");

    // The six Theme 2 glossary terms retain their authored three-term groups at every viewport.
    for (const width of [1440, 1100, 390]) {
      await setViewport(width);
      await openAnswer("T2-P116-VOC01", width);
      let vocabulary = await state();
      assert.deepEqual(await visibleTerms(), ["ecdat", "il", "yağız"], `first vocabulary group at ${width}px`);
      assert.ok(!vocabulary.text.includes("Geçmişteki büyükler, atalar"), `first meanings stay hidden at ${width}px`);
      vocabulary = await next();
      assert.ok(vocabulary.text.includes("Geçmişteki büyükler, atalar"), `first group meaning opens at ${width}px`);
      assert.deepEqual(await visibleTerms(), ["ecdat", "il", "yağız"]);
      vocabulary = await next();
      assert.deepEqual(await visibleTerms(), ["kılmak", "töre", "şad"], `second vocabulary group at ${width}px`);
      assert.ok(!vocabulary.text.includes("Etmek, yapmak"), `second meanings stay hidden at ${width}px`);
      vocabulary = await next();
      assert.ok(vocabulary.text.includes("Etmek, yapmak"), `second group meaning opens at ${width}px`);
      await client.evaluate("document.querySelector('#dock [data-action=prev]').click()");
      await sleep(100);
      assert.ok(!(await bodyText()).includes("Etmek, yapmak"), `previous navigation returns to the second prompt at ${width}px`);
    }

    // One response fills one column at desktop and mobile widths; its evidence stays with it.
    const oneAnswerStep = await openAnswer("T2-P86-Q02", 1440);
    const oneAnswer = await advanceUntil((value) => value.answerHeadings.includes("Fikrî Boyut"), "single Fikrî Boyut response");
    assert.deepEqual(oneAnswer.answerHeadings, ["Fikrî Boyut"]);
    const pairedEvidence = await advanceUntil((value) => value.hasEvidence, "paired source evidence");
    assert.deepEqual(pairedEvidence.answerHeadings, ["Fikrî Boyut"]);
    assert.ok(pairedEvidence.evidenceText.includes(oneAnswerStep.answer.evidence_quotes[0]));
    for (const width of [1440, 1100, 390]) {
      await setViewport(width);
      const measured = await state();
      assert.deepEqual(measured.answerHeadings, ["Fikrî Boyut"], `answer grouping at ${width}px`);
      assert.equal(measured.columns, 1, `one-answer column at ${width}px`);
      assert.ok(measured.sectionsRect.width >= measured.panelRect.width * 0.85,
        `answer content uses the panel width at ${width}px`);
      assert.ok(measured.hasEvidence && measured.evidenceText.includes(oneAnswerStep.answer.evidence_quotes[0]),
        `evidence remains beside its answer at ${width}px`);
    }
    const nextUnit = await next();
    assert.ok(nextUnit.answerHeadings.includes("Eylem Boyutu"), "forward navigation advances to the next answer unit");
    await client.evaluate("document.querySelector('#dock [data-action=prev]').click()");
    await sleep(100);
    const returnedEvidence = await state();
    assert.ok(returnedEvidence.hasEvidence && returnedEvidence.answerHeadings.includes("Fikrî Boyut"),
      "previous navigation returns to the answer/evidence pair");

    // Independent topic and writing-purpose units stay separate at all tested widths.
    for (const width of [1440, 1100, 390]) {
      await setViewport(width);
      const topicStep = await openAnswer("T2-P100-Q08", width);
      const topic = await advanceUntil((value) => value.answerHeadings.includes("konu"), `topic unit at ${width}px`);
      assert.deepEqual(topic.answerHeadings, ["konu"]);
      assert.ok(!topic.answerText.toLocaleLowerCase("tr").includes("yazilma amaci"));
      const purpose = await advanceUntil((value) => value.answerHeadings.includes("yazilma amaci"), `writing-purpose unit at ${width}px`);
      assert.deepEqual(purpose.answerHeadings, ["yazilma amaci"]);
      assert.ok(!purpose.answerText.toLocaleLowerCase("tr").includes("konu"));
      assert.equal(topicStep.presentation.web.units.length, 2, `two stable independent units at ${width}px`);
    }

    // The video-bound answer remains an observation scaffold and creates no empty evidence page.
    await setViewport(1440);
    const mediaStep = await openAnswer("T2-P142-Q02", 1440);
    const mediaPrompt = await advanceUntil((value) => value.answerHeadings.includes("Benzetmeli İfade"), "source-limited video scaffold");
    assert.ok(mediaPrompt.answerText.includes("[Videoda gerçekten duyulan dize/ifade]"));
    assert.ok(!mediaPrompt.hasEvidence, "no evidence panel is fabricated for an unseen video");
    assert.equal(mediaStep.answer.evidence_quotes?.length || 0, 0);
    console.log("PASS browser: forward/back navigation, answer/evidence pairing, full-width single answer at 1440/1100/390px, stable independent units, and source-limited media handling.");
  } finally {
    client?.close();
    await Promise.all([stopChild(server), stopChild(browser)]);
    fs.rmSync(profile, { recursive: true, force: true });
  }
}

verifyFlowCoverage();
const sourceReport = verifySourceCoverage();
verifyPresentationConfig();
console.log(`PASS static: 9 flows / ${flowSteps.length} steps / 159 source records / ${answers.size} answers / ${sourceReport.quoteCount} quotes.`);
console.log(`PASS source pages: ${sourceReport.pageCount} printed pages; quote text found on ${sourceReport.matchedPrintedPages.join(", ")}.`);
if (process.argv.includes("--static-only")) {
  console.log("SKIP browser: --static-only requested.");
} else {
  await runBrowserChecks();
}
