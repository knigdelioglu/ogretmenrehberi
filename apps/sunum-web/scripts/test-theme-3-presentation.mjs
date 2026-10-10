import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import { resolveWebPresentation, validateWebPresentationIndex } from "../../lesson-player/scripts/web-presentation.mjs";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(appRoot, "../..");
const sourceRoot = path.join(repoRoot, "data/grade-11/source/teacher-book/theme-3");
const presentationRoot = path.join(repoRoot, "data/grade-11/presentation/theme-3");
const bookRoot = path.join(repoRoot, "data/book/grade-11/themes/theme-3");
const generatedPath = path.join(repoRoot, "apps/lesson-player/src/generated/lessons.json");
const distPath = path.join(appRoot, "dist");
const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const manifest = readJson(path.join(bookRoot, "manifest.json"));
const sourceIndex = readJson(path.join(sourceRoot, "source-index.json"));
const answerIndex = readJson(path.join(sourceRoot, "answer-bank.json"));
const webPresentation = readJson(path.join(presentationRoot, "web-presentation.json"));
const answers = answerIndex.parts.flatMap((part) => readJson(path.join(sourceRoot, part.path)).entries);
const answerById = new Map(answers.map((answer) => [answer.question_id, answer]));
const sourceById = new Map(sourceIndex.records.map((record) => [record.source_record_id, record]));
const flowFiles = fs.readdirSync(presentationRoot).filter((name) => name.endsWith("-flow.json")).sort();
const flows = flowFiles.map((name) => readJson(path.join(presentationRoot, name)));
const flowSteps = flows.flatMap((flow) => flow.steps.map((step) => ({ flow, step })));
const stepByAnswer = new Map(flowSteps.filter(({ step }) => step.answer_id)
  .map(({ flow, step }) => [step.answer_id, { flow, step }]));

function normalizeText(value, reflow = false) {
  let text = String(value).normalize("NFC").toLocaleLowerCase("tr")
    .replace(/[\u00ad\u200b]/gu, "");
  if (reflow) text = text.replace(/-\s*\r?\n\s*/gu, "");
  return text.replace(/\s+/gu, " ").replace(/[^\p{L}\p{N}]/gu, "");
}

function stringsDeep(value, result = []) {
  if (typeof value === "string") result.push(value);
  else if (Array.isArray(value)) value.forEach((item) => stringsDeep(item, result));
  else if (value && typeof value === "object") Object.values(value).forEach((item) => stringsDeep(item, result));
  return result;
}

function verifySource() {
  assert.equal(manifest.printed_page_start, 160);
  assert.equal(manifest.printed_page_end, 235);
  assert.equal(manifest.page_numbering.printed_to_pdf_offset, 1);
  assert.equal(manifest.page_files.length, 76, "Theme 3 has every printed page 160–235");
  const pages = manifest.page_files.map((name) => readJson(path.join(bookRoot, name)));
  const pageByNumber = new Map(pages.map((page) => [page.printed_page, page]));
  for (let printed = 160; printed <= 235; printed += 1) {
    const page = pageByNumber.get(printed);
    assert.ok(page, "printed page " + printed + " exists");
    assert.equal(page.pdf_page, printed + 1, "PDF page mapping for printed page " + printed);
  }
  const normalizedPages = pages.map((page) => ({
    printed: page.printed_page,
    text: normalizeText(stringsDeep([page.transcription, page.blocks, page.visual_descriptions]).join(" "), true)
  }));
  let quoteCount = 0;
  const matchedPages = new Set();
  for (const answer of answers) {
    for (const quote of answer.evidence_quotes ?? []) {
      quoteCount += 1;
      const needle = normalizeText(quote);
      const matches = normalizedPages.filter((page) => page.text.includes(needle));
      assert.ok(matches.length, answer.question_id + ": source quote is present in the Theme 3 book JSON: " + quote);
      matches.forEach((page) => matchedPages.add(page.printed));
    }
  }
  assert.equal(quoteCount, 52, "all 52 evidence quotes are checked against printed pages");
  return { pages: pages.length, quoteCount, matchedPages: [...matchedPages].sort((a, b) => a - b) };
}

function verifyFlows() {
  assert.equal(flowFiles.length, 18, "all Theme 3 flows are present");
  assert.equal(flowSteps.length, 315, "all Theme 3 lesson steps are present");
  assert.ok(flows.every((flow) => flow.theme_id === "TEMA_03"));
  const stepIds = new Set();
  const reachedSources = new Set();
  const reachedAnswers = new Set();
  for (const { flow, step } of flowSteps) {
    const key = flow.lesson_id + "/" + step.id;
    assert.ok(!stepIds.has(key), "unique flow step " + key);
    stepIds.add(key);
    assert.ok(sourceById.has(step.source_record_id), key + ": source record exists");
    reachedSources.add(step.source_record_id);
    if (step.answer_id) {
      assert.ok(answerById.has(step.answer_id), key + ": answer record exists");
      reachedAnswers.add(step.answer_id);
    }
  }
  assert.equal(reachedSources.size, 146, "all 146 Theme 3 source records are reached");
  assert.deepEqual([...reachedSources].sort(), sourceIndex.records.map((record) => record.source_record_id).sort());
  assert.equal(reachedAnswers.size, 220, "all 220 Theme 3 answer entries are reached");
  assert.deepEqual([...reachedAnswers].sort(), [...answerById.keys()].sort());
  assert.equal(answers.length, 220, "complete Theme 3 answer bank");
  return { flowCount: flows.length, stepCount: flowSteps.length, answerCount: answers.length };
}

function resolvedAnswer(answerId) {
  const answer = answerById.get(answerId);
  assert.ok(answer, "known answer " + answerId);
  const record = stepByAnswer.get(answerId);
  assert.ok(record, "answer is reached by a Theme 3 flow: " + answerId);
  return resolveWebPresentation(record.step, answer, { webPresentation });
}

function verifyQuoteBodyPlacement(answerId, resolved) {
  const answer = answerById.get(answerId);
  const sections = answer.answer_sections;
  if (!sections || Array.isArray(sections)) return;
  const embedded = new Set(resolved.units.flatMap((unit) =>
    (unit.evidence_sections ?? []).flatMap((entry) => entry.contains_quote_indexes.map((index) => `${entry.section_key}\u0000${index}`))
  ));
  for (const [index, quote] of (answer.evidence_quotes ?? []).entries()) {
    const normalizedQuote = normalizeText(quote);
    const visibleSummaryHits = (resolved.answer_text.fragments ?? [])
      .filter((fragment) => normalizeText(fragment.text).includes(normalizedQuote));
    for (const fragment of visibleSummaryHits) {
      const unit = resolved.units.find((entry) => entry.id === fragment.unit);
      assert.ok(unit?.inline_quote_indexes.includes(index),
        `${answerId}: quote ${index} in an answer summary is not repeated as separate evidence`);
    }
    const hits = Object.entries(sections)
      .filter(([, value]) => stringsDeep(value).some((text) => normalizeText(text).includes(normalizedQuote)))
      .map(([key]) => key);
    for (const key of hits) assert.ok(embedded.has(`${key}\u0000${index}`),
      `${answerId}: quote ${index} shown in ${key} is marked as inline evidence, not repeated as a response`);
  }
}

function verifyMetadata() {
  assert.equal(webPresentation.schema_version, "1.1.0");
  assert.equal(webPresentation.theme_id, "TEMA_03");
  assert.deepEqual(webPresentation.defaults, {
    section_units: "one-per-section",
    structured_answer_text: "omit-summary",
    array_answer_units: "one-list"
  });
  validateWebPresentationIndex(webPresentation, { themeNumber: 3, themeId: "TEMA_03", answerById });

  const resolved = new Map();
  for (const [answerId, answer] of answerById) {
    assert.ok(stepByAnswer.has(answerId), answerId + ": answer is reached by a flow");
    const presentation = resolvedAnswer(answerId);
    if (presentation) {
      resolved.set(answerId, presentation);
      verifyQuoteBodyPlacement(answerId, presentation);
    }
    if (answer.entry_type === "source_limited") assert.equal(answer.evidence_quotes?.length ?? 0, 0,
      answerId + ": source-limited answer does not invent quoted evidence");
  }
  const quoteAnswers = answers.filter((answer) => answer.evidence_quotes?.length);
  assert.equal(quoteAnswers.reduce((sum, answer) => sum + answer.evidence_quotes.length, 0), 52);
  assert.ok(quoteAnswers.every((answer) => webPresentation.answers[answer.question_id]?.quote_links),
    "each quote-bearing answer has explicit quote-to-unit links");

  const included = [
    "T3-P177-Q14", "T3-P183-Q01", "T3-P187-Q02", "T3-P188-Q03B",
    "T3-P200-PERF01", "T3-P202-Q01", "T3-P210-Q01", "T3-P222-PERF01"
  ].sort();
  assert.deepEqual(Object.keys(webPresentation.answers)
    .filter((id) => webPresentation.answers[id].answer_text?.mode === "include").sort(), included,
  "all eight structured answer summaries use reviewed, explicit excerpts");
  for (const id of included) {
    const sourceAnswer = answerById.get(id);
    const policy = webPresentation.answers[id].answer_text;
    assert.ok(Array.isArray(policy.fragments) && policy.fragments.length, id + ": included summary is split into exact excerpts");
    assert.ok(policy.fragments.every((fragment) => sourceAnswer.answer.includes(fragment.text) &&
      fragment.text.trim() !== sourceAnswer.answer.trim()), id + ": no full summary is copied into one answer unit");
  }

  const p175 = resolved.get("T3-P175-Q02");
  assert.deepEqual(p175.units.map((unit) => unit.id), ["konu", "tema", "yazilis_amaci"]);
  assert.deepEqual(p175.units.find((unit) => unit.id === "konu").quote_indexes, [],
    "the two excerpts are not presented as evidence for the novel's topic");
  assert.deepEqual(p175.units.find((unit) => unit.id === "tema").inline_quote_indexes, [0]);
  assert.deepEqual(p175.units.find((unit) => unit.id === "yazilis_amaci").inline_quote_indexes, [1]);

  const p176 = resolved.get("T3-P176-Q04");
  assert.deepEqual(p176.units.map((unit) => unit.id), ["İşlev"]);
  assert.deepEqual(p176.units[0].evidence_sections.map((section) => section.section_key), ["Dayanak 1", "Dayanak 2", "Dayanak 3"]);
  assert.deepEqual(p176.units[0].inline_quote_indexes, [0, 1]);

  const p178 = resolved.get("T3-P178-PERF01");
  assert.deepEqual(webPresentation.answers["T3-P178-PERF01"].quote_links.map(({ index, unit }) => [index, unit]), [
    [0, "Bağ Kurucu"], [1, "Okuma Aydınlatıcısı"], [2, "Karakter Çözümleyici"]
  ]);
  assert.deepEqual(p178.units.map((unit) => unit.id).filter((id) => p178.units.find((unit) => unit.id === id).evidence_sections.length),
    ["Bağ Kurucu", "Okuma Aydınlatıcısı", "Karakter Çözümleyici"]);

  const p184Links = webPresentation.answers["T3-P184-Q02"].quote_links;
  assert.equal(p184Links.find((link) => link.index === 2).unit, "3 · Nuran, serçeler ve köpek");
  assert.equal(p184Links.find((link) => link.index === 3).unit, "4 · İhsan'ın hastalığı");

  const p187 = resolved.get("T3-P187-Q02");
  assert.deepEqual(webPresentation.answers["T3-P187-Q02"].quote_links.map(({ index, unit }) => [index, unit]), [
    [0, "kisi_dil_uslup"], [1, "mekan_dil_uslup"], [2, "kisi_dil_uslup"]
  ]);
  assert.deepEqual(p187.units.find((unit) => unit.id === "kisi_dil_uslup").inline_quote_indexes, [0, 2]);

  const p193 = webPresentation.answers["T3-P193-PERF01"].quote_links;
  assert.deepEqual(p193.map(({ index, unit }) => [index, unit]), [
    [0, "Dil ve söz varlığı (örnek)"],
    [1, "Mekânın işlevi (örnek)"],
    [2, "Kişilerin bakış açıları ve ilişkileri (örnek)"]
  ]);

  const p193Repeat = webPresentation.answers["T3-P193-PERF03"].quote_links;
  assert.deepEqual(p193Repeat.map(({ index, unit }) => [index, unit]), [
    [0, "Üç Yaz · kimlik"], [0, "İki Sor · kimlik"],
    [1, "Üç Yaz · şehir"], [1, "Bir Paylaş · şehir"],
    [2, "Üç Yaz · hüzün"]
  ], "a repeated quotation follows each answer it supports");
  assert.deepEqual(resolved.get("T3-P193-PERF03").units.map((unit) => unit.inline_quote_indexes), [[0], [1], [2], [0], [], [1]]);

  assert.deepEqual(resolved.get("T3-P201-WORK01").units.find((unit) => unit.id === "Ana düşünce").inline_quote_indexes, [1]);
  assert.deepEqual(resolved.get("T3-P202-Q01").units.map((unit) => [unit.id, unit.inline_quote_indexes]), [
    ["nesnel", []], ["oznel", [0, 1, 2]]
  ]);
  const interview = resolved.get("T3-P210-Q01");
  assert.deepEqual(interview.units.map((unit) => [unit.id, unit.evidence_sections.map((section) => section.section_key)]), [[
    "Mülakatın amacı", ["Romanın hazırlanışı", "Roman kişisinin canlanması", "Yazarlık emeği", "Türkçe hakkında görüş"]
  ]]);
  const p222Fragments = webPresentation.answers["T3-P222-PERF01"].answer_text.fragments;
  assert.ok(p222Fragments.every((fragment) => !/Saygı|Vatanseverlik|Duyarlılık|Hoşgörü|Aile bütünlüğü/u.test(fragment.text)),
    "the p.222 lead-in does not reveal later value-map examples");

  const groupedAudio = resolved.get("T3-P218-QH02");
  assert.deepEqual(groupedAudio.units.map((unit) => unit.section_keys), [["müzik", "ses_efekti", "seslendirme", "tonlama"]]);

  const expectedInterleaves = [
    ["huzur-okuma", "s165-166-fark", 2],
    ["huzur-hayat-kurmaca-182-185", "s184-185-value-q2", 1],
    ["kemal-tahir-mulakat-210-214", "s214-q1", 1]
  ];
  for (const [lessonSlug, stepId, groupSize] of expectedInterleaves) {
    const record = flowSteps.find(({ flow, step }) => flow.lesson_slug === lessonSlug && step.id === stepId);
    assert.ok(record, "authored grouped presentation exists for " + lessonSlug + "/" + stepId);
    assert.equal(record.step.presentation?.interleave?.group_size, groupSize, "authored group size remains unchanged for " + stepId);
  }
  assert.deepEqual(resolved.get("T3-P165-PERF02").units.map((unit) => unit.section_keys), [
    ["huzur", "rüya"], ["saz", "boğaz"], ["tarih", "garp"]
  ]);
  assert.deepEqual(resolved.get("T3-P184-Q02").units.map((unit) => unit.id), [
    "1 · Halkı sevmek ve insanı kavramlaştırmak", "2 · Yeni hayat ve tarihî kökler",
    "3 · Nuran, serçeler ve köpek", "4 · İhsan'ın hastalığı"
  ]);
  assert.deepEqual(resolved.get("T3-P214-Q01").units.map((unit) => [unit.id, unit.evidence_sections.map((section) => section.section_key)]), [
    ["Açık ileti", ["Açık iletinin dayanağı"]], ["Örtük ileti", ["Örtük iletinin dayanağı"]]
  ]);
  return { overrideCount: Object.keys(webPresentation.answers).length, quoteCount: 52 };
}

function themeThreeProjection(catalog) {
  return catalog.filter((lesson) => (lesson.theme_id ?? lesson.theme) === "TEMA_03");
}

function verifyProductionCatalog() {
  assert.ok(fs.existsSync(generatedPath), "production-generated lessons.json exists; run the shared builder first");
  assert.ok(fs.existsSync(distPath), "production Sunum Web dist exists; run the shared site build first");
  const generated = readJson(generatedPath);
  const generatedTheme = themeThreeProjection(generated);
  assert.ok(generatedTheme.length, "production builder includes Theme 3 lessons");
  const generatedAnswers = new Map(generatedTheme.flatMap((lesson) => lesson.steps
    .filter((step) => step.answer?.question_id).map((step) => [step.answer.question_id, { lesson, step }])));
  assert.equal(generatedAnswers.size, 220, "the real generated Theme 3 catalog includes all 220 answer steps");
  for (const answer of answers) {
    const generatedStep = generatedAnswers.get(answer.question_id)?.step;
    assert.ok(generatedStep, answer.question_id + ": answer exists in the production-generated catalog");
    if (generatedStep.layout === "vocabulary") continue;
    assert.deepEqual(generatedStep.presentation?.web, resolvedAnswer(answer.question_id),
      answer.question_id + ": production builder applies Theme 3 metadata");
  }

  const encryptedFile = fs.readdirSync(distPath).find((name) => /^data\.[0-9a-f]+\.bin$/.test(name));
  assert.ok(encryptedFile, "production dist contains its encrypted catalog");
  const buffer = fs.readFileSync(path.join(distPath, encryptedFile));
  assert.equal(buffer.subarray(0, 4).toString("ascii"), "SNM1", "encrypted catalog header is valid");
  const iterations = buffer.readUInt32BE(4);
  const salt = buffer.subarray(8, 24);
  const iv = buffer.subarray(24, 36);
  const body = buffer.subarray(36, buffer.length - 16);
  const tag = buffer.subarray(buffer.length - 16);
  const password = getPresentationPassword();
  const key = crypto.pbkdf2Sync(password, salt, iterations, 32, "sha256");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const encryptedCatalog = JSON.parse(gunzipSync(Buffer.concat([decipher.update(body), decipher.final()])).toString("utf8"));
  const encryptedTheme = themeThreeProjection(encryptedCatalog.lessons);
  assert.equal(encryptedTheme.length, generatedTheme.length, "encrypted production catalog includes every generated Theme 3 lesson");
  const encryptedBySlug = new Map(encryptedTheme.map((lesson) => [lesson.slug, lesson]));
  for (const lesson of generatedTheme) {
    const encryptedLesson = encryptedBySlug.get(lesson.lesson_slug);
    assert.ok(encryptedLesson, lesson.lesson_slug + ": lesson is present in encrypted production catalog");
    assert.equal(encryptedLesson.steps.length, lesson.steps.length, lesson.lesson_slug + ": encrypted step count matches generated catalog");
    for (const [index, step] of lesson.steps.entries()) {
      assert.equal(encryptedLesson.steps[index].id, step.id, lesson.lesson_slug + ": encrypted step order matches generated catalog");
      assert.deepEqual(encryptedLesson.steps[index].presentation?.web, step.presentation?.web,
        lesson.lesson_slug + "/" + step.id + ": encrypted catalog preserves resolved Theme 3 metadata");
    }
  }
  const assessment = encryptedBySlug.get("degerlendirme-230-235");
  assert.ok(assessment, "published assessment lesson exists");
  const publishedSteps = new Map(assessment.steps.map((step) => [step.id, step]));
  assert.deepEqual(publishedSteps.get("s230-venn-reading")?.content?.excerpts?.map(e => e.label),
    ["1", "2", "3"], "encrypted production catalog retains all three source passages");
  assert.ok(publishedSteps.get("s230-venn-reading")?.content?.claims?.thesis &&
    publishedSteps.get("s230-venn-reading")?.content?.claims?.antithesis,
    "encrypted catalog retains source claims next to each excerpt");
  assert.ok(publishedSteps.get("s230-q1")?.content?.venn?.thesis &&
    publishedSteps.get("s230-q1")?.content?.venn?.antithesis,
    "encrypted catalog retains both Venn claims");
  assert.equal(publishedSteps.get("s230-q1")?.content?.items, undefined,
    "published Venn replaces duplicate numbered-card fallback");
  assert.equal(publishedSteps.get("s235-q16")?.content?.options_on_next_click, true,
    "p.235 q16 staging flag survives production catalog build and encryption");
  assert.equal(publishedSteps.get("s235-q16")?.content?.options?.length, 5,
    "p.235 q16 all five options survive publication");
  assert.equal(publishedSteps.get("s231-q3")?.content?.table?.rows.length, 5,
    "production catalog preserves the complete concept table");
  assert.equal(publishedSteps.get("s232-veli-chart")?.content?.table?.rows.length, 5,
    "production catalog preserves the complete Orhan Veli table");
  for (const id of ["s231-q5", "s231-q6"]) {
    assert.equal(publishedSteps.get(id)?.content?.options?.length, 5,
      id + ": published multiple-choice screen retains all options");
    assert.equal(publishedSteps.get(id)?.content?.items, undefined,
      id + ": duplicated Lesson Player fallback items are not published");
  }
  return { generatedTheme, generatedAnswers, encryptedCatalog };
}

function getPresentationPassword() {
  if (process.env.SUNUM_SIFRE) return process.env.SUNUM_SIFRE;
  const localEnv = path.join(appRoot, ".env.local");
  if (fs.existsSync(localEnv)) {
    const line = fs.readFileSync(localEnv, "utf8").split(/\r?\n/u).find((item) => /^\s*SUNUM_SIFRE\s*=/.test(item));
    if (line) return line.replace(/^\s*SUNUM_SIFRE\s*=\s*/u, "").trim().replace(/^(?:"(.*)"|'(.*)')$/u, "$1$2");
  }
  return "sunum";
}

async function reservePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => server.listen(0, "127.0.0.1", resolve).once("error", reject));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function runProductionBrowserChecks(production) {
  const chrome = process.env.CHROME;
  assert.ok(chrome, "set CHROME to a Chrome/Chromium executable for production browser checks");
  const port = await reservePort();
  const root = `http://127.0.0.1:${port}`;
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "theme-3-production-cdp-"));
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
      try { const value = await check(); if (value) return value; } catch { /* navigation may replace the execution context */ }
      await sleep(80);
    }
    throw new Error("Timed out: " + label);
  }

  async function connect(debugPort) {
    const target = await until(async () => (await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json())
      .find((entry) => entry.type === "page" && entry.url === "about:blank"), "Chrome page target");
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
      const operation = pending.get(message.id); pending.delete(message.id);
      if (message.error) operation.reject(new Error(message.error.message)); else operation.resolve(message.result);
    });
    client = {
      send(method, params = {}) {
        const id = ++sequence;
        return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
      },
      async evaluate(expression) {
        const result = await this.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, userGesture: true });
        if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
        return result.result.value;
      },
      close() { socket.close(); }
    };
    await client.send("Page.enable");
  }

  async function state() {
    return client.evaluate("(() => {const a=document.querySelector('#canvas .panel--answer');const e=document.querySelector('#canvas .panel--evidence');const b=document.querySelector('#canvas .slide__body');return {body:b?.innerText??'',answer:a?.innerText??'',evidence:e?.innerText??'',hasEvidence:Boolean(e),overflow:document.documentElement.scrollWidth>innerWidth+1,scroll:[b?.scrollTop??0,b?.scrollHeight??0,b?.clientHeight??0],where:document.querySelector('#canvas .where')?.innerText??'',answerHeadings:Array.from(a?.querySelectorAll('.sec h3')??[]).map(x=>x.textContent.trim()),evidenceHeadings:Array.from(e?.querySelectorAll('.sec h3')??[]).map(x=>x.textContent.trim()),quotes:e?.querySelector('.quotes')?.innerText??''}})()");
  }
  async function next() { await client.evaluate("document.querySelector('#dock [data-action=next]').click()"); await sleep(100); return state(); }
  async function openAnswer(answerId) {
    const target = production.generatedAnswers.get(answerId);
    assert.ok(target, "production catalog has answer " + answerId);
    const index = target.lesson.steps.findIndex((step) => step.id === target.step.id);
    await client.send("Page.navigate", { url: `${root}/#/${target.lesson.lesson_slug}/${index + 1}` });
    await until(async () => (await state()).body.includes(target.step.display_prompt), "open " + answerId);
    return target;
  }
  async function advanceUntil(predicate, label, max = 18) {
    let current = await state();
    for (let i = 0; i <= max; i += 1) { if (predicate(current)) return current; current = await next(); }
    assert.fail("Could not reach " + label + "; last headings: " + JSON.stringify(current.answerHeadings) +
      "; answer: " + current.answer.slice(0, 280) + "; last view: " + current.body.slice(0, 180));
  }

  try {
    await until(async () => (await fetch(root)).ok, "production Sunum Web server");
    const portFile = path.join(profile, "DevToolsActivePort");
    const debugPort = await until(() => fs.existsSync(portFile) ? Number(fs.readFileSync(portFile, "utf8").split("\n")[0]) : null,
      "Chrome debugging endpoint");
    await connect(debugPort);
    await client.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await client.send("Page.navigate", { url: `${root}/#/tema-3-girisi/0` });
    await until(() => client.evaluate("!document.querySelector('#gate').hidden"), "production password screen");
    const password = getPresentationPassword();
    await client.evaluate("document.querySelector('#gate-password').value=" + JSON.stringify(password) + ";document.querySelector('#gate-submit').click()");
    await until(() => client.evaluate("Boolean(document.querySelector('#canvas .slide'))"), "unlock production Theme 3 catalog");

    await openAnswer("T3-P184-Q02");
    let view = await advanceUntil((value) => value.answerHeadings.includes("1 · Halkı sevmek ve insanı kavramlaştırmak"), "first p.184 answer");
    assert.ok(!view.answerHeadings.includes("2 · Yeni hayat ve tarihî kökler"), "p.184 second response waits for its group");
    view = await advanceUntil((value) => value.evidence.includes("Hayatı mı, halkı mı?"), "first p.184 evidence");
    assert.ok(view.answer.includes("Halkı sevmek"), "first p.184 answer remains paired with its evidence");
    assert.ok(!view.evidence.includes("Mümtaz, ekmek ufaklarını"), "animal-care evidence does not appear in the illness section");
    view = await advanceUntil((value) => value.body.includes("Yeni hayat") && !value.answerHeadings.includes("2 · Yeni hayat ve tarihî kökler"), "next p.184 prompt");
    view = await advanceUntil((value) => value.answerHeadings.includes("2 · Yeni hayat ve tarihî kökler"), "second p.184 response");
    assert.ok(!view.answerHeadings.includes("3 · Nuran, serçeler ve köpek"), "p.184 response ordering stays interleaved");
    view = await advanceUntil((value) => value.evidence.includes("Tarihimize bütünlüğünü iade etmek"), "second p.184 evidence");
    assert.ok(view.answer.includes("Yeni hayat"), "p.184 second response remains beside its own evidence");
    view = await advanceUntil((value) => value.body.includes("Nuran, serçeler") && !value.answerHeadings.includes("3 · Nuran, serçeler ve köpek"), "third p.184 prompt");
    view = await advanceUntil((value) => value.answerHeadings.includes("3 · Nuran, serçeler ve köpek"), "third p.184 response");
    view = await advanceUntil((value) => value.evidence.includes("Mümtaz, ekmek ufaklarını"), "third p.184 evidence");
    assert.ok(!view.evidence.includes("komşunun evinden telefon etmek"), "p.184 illness evidence stays out of the animal-care response");
    assert.ok(view.hasEvidence && !view.overflow, "p.184 response/evidence pair fits at 1440px");
    await client.send("Emulation.setDeviceMetricsOverride", { width: 800, height: 900, deviceScaleFactor: 1, mobile: false });
    view = await state();
    assert.ok(view.hasEvidence && view.answer && !view.overflow, "p.184 response/evidence pair remains usable at 800px");
    await client.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    view = await advanceUntil((value) => value.body.includes("İhsan'ın hastalığı") && !value.answerHeadings.includes("4 · İhsan'ın hastalığı"), "fourth p.184 prompt");
    view = await advanceUntil((value) => value.answerHeadings.includes("4 · İhsan'ın hastalığı"), "fourth p.184 response");
    view = await advanceUntil((value) => value.evidence.includes("komşunun evinden telefon etmek"), "fourth p.184 evidence");
    assert.ok(view.answer.includes("İhsan'ın hastalığı"), "the phone-call excerpt follows the illness response");

    await openAnswer("T3-P165-PERF02");
    view = await state();
    assert.ok(view.body.includes("huzur") && view.body.includes("rüya") && !view.body.includes("saz"),
      "p.165 starts with the first two-word group");
    view = await next();
    assert.ok(view.body.includes("Yoğun bir günün ardından") && !view.body.includes("boğaz"),
      "p.165 first answer group opens before later terms");
    view = await next();
    assert.ok(view.body.includes("saz") && view.body.includes("boğaz") && !view.body.includes("garp"),
      "p.165 second prompt follows the first answer");
    view = await next();
    assert.ok(view.body.includes("telli çalgı") && !view.body.includes("güneşin garptan"),
      "p.165 second answer group precedes the last group");
    view = await next();
    assert.ok(view.body.includes("tarih") && view.body.includes("garp"), "p.165 final prompt opens in authored order");
    view = await next();
    assert.ok(view.body.includes("gün, ay ve yılı") && view.body.includes("Batı dünyası"), "p.165 final pair is revealed together");

    await openAnswer("T3-P218-QH02");
    const audioHeadings = new Set();
    view = await state();
    for (let index = 0; index < 24 && !view.hasEvidence; index += 1) {
      view.answerHeadings.forEach((heading) => audioHeadings.add(normalizeText(heading)));
      view = await next();
    }
    view.answerHeadings.forEach((heading) => audioHeadings.add(normalizeText(heading)));
    for (const heading of ["Müzik", "Ses Efekti", "Seslendirme", "Tonlama"]) {
      assert.ok(audioHeadings.has(normalizeText(heading)), "grouped audio answer reveals " + heading);
    }
    assert.ok(view.hasEvidence, "all grouped audio response parts are followed by one evidence stage");
    let audioEvidence = view.evidence;
    let audioQuotes = view.quotes;
    for (let index = 0; index < 8 && !audioQuotes.includes("kapı gıcırtısı"); index += 1) {
      view = await next();
      if (view.hasEvidence) { audioEvidence += "\n" + view.evidence; audioQuotes += "\n" + view.quotes; }
    }
    assert.ok(audioEvidence.includes("İki aynı renkteki sese") && audioEvidence.includes("kapı gıcırtısı"),
      "all relevant radio-play quotations appear in the grouped evidence stage");
    assert.ok(audioQuotes.includes("İki aynı renkteki sese") && audioQuotes.includes("kapı gıcırtısı"),
      "the audio quotations remain distinct evidence cards because they are not repeated in answer text");
    for (const quote of production.generatedAnswers.get("T3-P218-QH02").step.answer.evidence_quotes) {
      assert.ok(audioQuotes.includes(quote), "all three audio quotations appear in the browser: " + quote);
    }
    assert.ok(view.hasEvidence && !view.overflow, "grouped audio answer/evidence fits at 1440px");
    await client.send("Emulation.setDeviceMetricsOverride", { width: 800, height: 900, deviceScaleFactor: 1, mobile: false });
    view = await state();
    assert.ok(view.hasEvidence && view.answer && !view.overflow, "grouped audio answer/evidence pair remains usable at 800px");
    await client.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

    await openAnswer("T3-P177-Q14");
    view = await advanceUntil((value) => value.answer.includes("Açık ileti"), "open-message response");
    assert.ok(!view.answer.includes("Örtük ileti"), "implicit-message definition waits for its response unit");
    view = await advanceUntil((value) => value.evidence.includes("İstanbul’u tanımadıkça"), "open-message evidence");
    assert.ok(view.answer.includes("Açık ileti") && !view.answer.includes("Örtük ileti"), "open evidence stays paired without revealing the later response");
    assert.ok(!view.quotes.includes("İstanbul’u tanımadıkça") && !view.quotes.includes("Bir hüviyet"),
      "p.177 inline source excerpts are not duplicated as separate quote cards");

    await openAnswer("T3-P214-Q01");
    view = await advanceUntil((value) => value.answer.includes("İstanbul’u, musikiyi"), "p.214 open response");
    assert.ok(!view.answer.includes("Yeni bir hayat kurmak için geçmişten kopmak gerekmez"),
      "the p.214 implicit response does not open with the explicit response");
    view = await advanceUntil((value) => value.evidence.includes("Açık iletinin dayanağı"), "p.214 open evidence");
    assert.ok(view.answer.includes("İstanbul’u, musikiyi") && !view.answer.includes("Yeni bir hayat kurmak"),
      "p.214 open answer stays with its rationale");
    view = await advanceUntil((value) => value.body.includes("Örtük ileti") && !value.answer.includes("Yeni bir hayat kurmak"),
      "p.214 next hidden prompt");
    view = await advanceUntil((value) => value.answer.includes("Yeni bir hayat kurmak için geçmişten kopmak gerekmez"),
      "p.214 implicit response");
    assert.ok(!view.evidence.includes("Örtük iletinin dayanağı"), "p.214 implicit rationale follows its response");
    view = await advanceUntil((value) => value.evidence.includes("Örtük iletinin dayanağı"), "p.214 implicit evidence");
    assert.ok(view.answer.includes("Yeni bir hayat kurmak için geçmişten kopmak gerekmez"),
      "p.214 implicit answer remains visible with its rationale");

    const recordingLimited = [...production.generatedAnswers.values()].find(({ step }) =>
      step.layout !== "vocabulary" && step.answer?.entry_type === "source_limited" &&
      step.answer.printed_page >= 215 && step.answer.printed_page <= 224);
    assert.ok(recordingLimited, "production catalog includes a non-vocabulary recording-limited answer");
    await client.send("Page.navigate", { url: `${root}/#/${recordingLimited.lesson.lesson_slug}/${recordingLimited.lesson.steps.findIndex((step) => step.id === recordingLimited.step.id) + 1}` });
    view = await advanceUntil((value) => Boolean(value.answer), "source-limited recording response");
    assert.ok(!view.hasEvidence && !(recordingLimited.step.answer.evidence_quotes?.length),
      "the missing recording does not create a fabricated evidence stage");

    // Verify geometry as well as reveal order. Text is present for layout but
    // hidden from the student and accessibility tree until its turn.
    const conceptTableMetrics = () => client.evaluate(`(() => {
      const panel = document.querySelector('#canvas .panel--answer');
      const table = panel?.querySelector('.presentation-table');
      const cells = [...(table?.querySelectorAll('tbody td') || [])];
      return {
        panelHeight: panel?.offsetHeight,
        tableHeight: table?.offsetHeight,
        tableWidth: table?.offsetWidth,
        rowHeights: [...(table?.querySelectorAll('tbody tr') || [])].map(row => row.offsetHeight),
        filled: cells.filter(cell => !cell.classList.contains('presentation-table__empty')).length,
        reserved: cells.filter(cell => {
          const ghost = cell.querySelector('.presentation-table__measure');
          return ghost?.getAttribute('aria-hidden') === 'true' &&
            getComputedStyle(ghost).visibility === 'hidden' &&
            ghost.textContent.trim().length > 0;
        }).length,
        visibleValues: cells.map(cell => cell.querySelector('.presentation-table__value')?.innerText ?? cell.innerText)
      };
    })()`);
    await openAnswer("T3-P231-Q03");
    const conceptRows = await client.evaluate("document.querySelectorAll('#canvas .presentation-table tbody tr').length");
    assert.equal(conceptRows, 5, "the five concepts are visible together on one slide");
    view = await advanceUntil((value) => value.answer.includes("Kurmaca"), "initial blank concept answer table");
    const baseline = await conceptTableMetrics();
    assert.equal(baseline.filled, 0, "opening the answer table does not reveal Kurmaca");
    assert.equal(baseline.reserved, 5, "every future definition reserves its final layout height");
    assert.deepEqual(baseline.visibleValues, Array(5).fill("—"), "all explanations remain visually hidden");
    for (let revealed = 1; revealed <= 5; revealed += 1) {
      view = await next();
      const current = await conceptTableMetrics();
      assert.equal(current.filled, revealed,
        "each subsequent click reveals exactly one additional concept, in table order");
      assert.equal(current.reserved, 5, "all five definitions keep their layout reservations");
      for (const key of ["panelHeight", "tableHeight", "tableWidth"]) {
        assert.ok(Math.abs(current[key] - baseline[key]) <= 1,
          `page 231 ${key} must not move after reveal ${revealed}: ${current[key]} vs ${baseline[key]}`);
      }
      assert.deepEqual(current.rowHeights, baseline.rowHeights,
        `page 231 row heights must stay fixed after reveal ${revealed}`);
    }
    assert.ok(view.answer.includes("Dış dünyanın benzerlerinden"),
      "Kurmaca definition stays visible after subsequent reveals");
    for (const [answerId, expected] of [["T3-P231-Q05", "E"], ["T3-P231-Q06", "C"]]) {
      await openAnswer(answerId);
      const choiceLabels = await client.evaluate("Array.from(document.querySelectorAll('#canvas .presentation-choice__letter')).map((el) => el.textContent.trim())");
      assert.deepEqual(choiceLabels, ["A", "B", "C", "D", "E"], answerId + ": choices are visible together before answer reveal");
      assert.ok(!(await state()).answer, answerId + ": correct answer remains hidden on first view");
    }
    const assessmentLesson = production.generatedTheme.find((lesson) => lesson.lesson_slug === "degerlendirme-230-235");
    const chartIndex = assessmentLesson.steps.findIndex((step) => step.id === "s232-veli-chart");
    await client.send("Page.navigate", { url: `${root}/#/${assessmentLesson.lesson_slug}/${chartIndex + 1}` });
    await until(() => client.evaluate("document.querySelectorAll('#canvas .presentation-table tbody tr').length === 5"),
      "Orhan Veli table visible with all five ratios");
    // Page 230: three original readings and exact thesis/antithesis precede the blank Venn.
    const assessment230 = production.generatedTheme.find(l => l.lesson_slug === "degerlendirme-230-235");
    const reading230Index = assessment230.steps.findIndex(s => s.id === "s230-venn-reading");
    await client.send("Page.navigate", { url: `${root}/#/${assessment230.lesson_slug}/${reading230Index + 1}` });
    await until(() => client.evaluate("Boolean(document.querySelector('#canvas .presentation-excerpt'))"),
      "p.230 original passage one visible");
    for (const label of ["1", "2", "3"]) {
      assert.equal(await client.evaluate("document.querySelector('#canvas .presentation-excerpt h2')?.innerText"),
        `Parça ${label}`, "p.230 correctly numbers each original reading");
      assert.equal(await client.evaluate("document.querySelectorAll('#canvas .presentation-claim').length"), 2,
        "p.230 retains both complete thesis claims alongside each passage");
      if (label !== "3") await next();
    }
    await openAnswer("T3-P230-Q01");
    assert.equal(await client.evaluate("document.querySelectorAll('#canvas .presentation-venn__circle').length"), 2,
      "p.230 has an actual overlapping two-circle Venn instead of numbered cards");
    view = await advanceUntil(v => v.answer.includes("ANTİTEZ") &&
      v.answer.includes("Kesişim"), "p.230 initial blank Venn answer");
    const vennState = () => client.evaluate(`(() => {
      const panel = document.querySelector('#canvas .panel--answer');
      const diagram = panel?.querySelector('.presentation-venn');
      const values = Object.fromEntries([...diagram?.querySelectorAll('[data-region]') || []]
        .map(el => [el.dataset.region, el.querySelector('b')?.textContent.trim()]));
      return { values, panelHeight: panel?.offsetHeight,
        width: diagram?.offsetWidth, height: diagram?.offsetHeight };
    })()`);
    const blankVenn = await vennState();
    assert.deepEqual(blankVenn.values, { tez:"—", kesisim:"—", antitez:"—" },
      "the first answer view is completely blank");
    for (const expected of [
      { tez:"2", kesisim:"—", antitez:"—" },
      { tez:"2", kesisim:"—", antitez:"1" },
      { tez:"2", kesisim:"3", antitez:"1" }
    ]) {
      await next();
      const shown = await vennState();
      assert.deepEqual(shown.values, expected, "one additional Venn placement opens with each click");
      assert.equal(shown.panelHeight, blankVenn.panelHeight,
        "Venn answer panel height stays fixed while entries appear");
      assert.equal(shown.width, blankVenn.width, "Venn width stays fixed");
      assert.equal(shown.height, blankVenn.height, "Venn height stays fixed");
    }

    // Biographical contest: both original tables are visible before answering.
    await openAnswer("T3-P233-Q10");
    assert.equal(await client.evaluate("document.querySelectorAll('#canvas .presentation-table-grid .presentation-table').length"), 2,
      "p.233 question 10 starts with both source tables");
    view = await advanceUntil(v => v.answer.includes("Biyografinin amacı"), "p.233 answer-scoring table");
    const scoringGeometry = await client.evaluate("(() => { const t=document.querySelector('#canvas .panel--answer .presentation-table');return {width:t.offsetWidth,height:t.offsetHeight,rows:[...t.querySelectorAll('tbody tr')].map(x=>x.offsetHeight)};})()");
    assert.ok(!view.answer.includes("+5 puan"), "first score is hidden until next click");
    view = await next();
    assert.ok(view.answer.includes("+5 puan"), "the first biography row score appears on the next click");
    assert.deepEqual(await client.evaluate("(() => { const t=document.querySelector('#canvas .panel--answer .presentation-table');return {width:t.offsetWidth,height:t.offsetHeight,rows:[...t.querySelectorAll('tbody tr')].map(x=>x.offsetHeight)};})()"),
      scoringGeometry, "scoring rows retain final heights during reveal");

    await openAnswer("T3-P233-Q11");
    assert.equal(await client.evaluate("document.querySelectorAll('#canvas .presentation-table-grid .presentation-table').length"), 2,
      "p.233 question 11 also keeps both source tables visible");
    view = await advanceUntil(v => v.answer.includes("Tarafsızlık"), "p.233 correction table");
    assert.ok(!view.answer.includes("Düzeltme:"), "corrections must initially remain hidden");
    view = await next();
    assert.ok(view.answer.includes("Doğru açıklama"), "first biography definition is assessed before corrections");

    await openAnswer("T3-P233-Q09");
    assert.deepEqual(await client.evaluate("Array.from(document.querySelectorAll('#canvas .presentation-choice__letter')).map(el=>el.innerText)"),
      ["A","B","C","D","E"], "p.233 multiple-choice options display in full");

    await openAnswer("T3-P234-Q13");
    view = await advanceUntil(v => v.answer.includes("Bilgi vermek amaçlanmıştır."), "p.234 empty decision matrix");
    const matrix = () => client.evaluate(`(() => {
      const p=document.querySelector('#canvas .panel--answer');
      const t=p.querySelector('.presentation-table');
      return {panelHeight:p.offsetHeight,tableHeight:t.offsetHeight,
        rowHeights:[...t.querySelectorAll('tbody tr')].map(row=>row.offsetHeight),
        checkmarks:[...t.querySelectorAll('tbody td')].filter(cell=>cell.innerText.includes('✓')).length,
        reserve:[...t.querySelectorAll('tbody th .presentation-table__measure')].length};
    })()`);
    const zero = await matrix();
    assert.equal(zero.checkmarks, 0, "assessment starts with no revealed decisions");
    assert.equal(zero.reserve, 8, "eight eventual explanations reserve their final row heights");
    for (let count = 1; count <= 8; count += 1) {
      view = await next();
      const measured = await matrix();
      assert.equal(measured.checkmarks, count, `decision ${count} is revealed only after its click`);
      for (const key of ["panelHeight", "tableHeight"]) {
        assert.ok(Math.abs(measured[key] - zero[key]) <= 1, `decision ${count} keeps ${key} stable`);
      }
      assert.deepEqual(measured.rowHeights, zero.rowHeights,
        `decision ${count} preserves every table-row height`);
    }

    const assessment = production.generatedTheme.find(l => l.lesson_slug === "degerlendirme-230-235");
    const readingIndex = assessment.steps.findIndex(s => s.id === "s235-source");
    await client.send("Page.navigate", {url: `${root}/#/${assessment.lesson_slug}/${readingIndex+1}`});
    await until(() => client.evaluate("Boolean(document.querySelector('#canvas .presentation-excerpt'))"),
      "p.235 passage I visible");
    for (const label of ["I","II","III","IV","V"]) {
      assert.equal(await client.evaluate("document.querySelector('#canvas .presentation-excerpt h2')?.innerText"),
        `Parça ${label}`, "full original passage " + label + " appears before choices");
      if (label !== "V") await next();
    }
    await openAnswer("T3-P235-Q16");
    const q16Phase = () => client.evaluate(`(() => ({
      choices: [...document.querySelectorAll('#canvas .presentation-choice__letter')].map(el => el.innerText.trim()),
      promptCompact: Boolean(document.querySelector('#canvas .qa-context > .prompt.is-small')),
      promptInContext: Boolean(document.querySelector('#canvas .qa-context > .prompt')),
      choicesInFocus: document.querySelectorAll('#canvas .qa-focus .presentation-choice').length,
      question: document.querySelector('#canvas .qa-context > .prompt')?.innerText ?? "",
      sourceLinks: document.querySelectorAll('#canvas .source-link').length
    }))()`);
    const q16First = await q16Phase();
    assert.deepEqual(q16First.choices, [], "p.235 q16 first slide shows only the question");
    assert.equal(q16First.promptCompact, false, "p.235 q16 question starts at the usual large size");
    assert.ok(q16First.promptInContext && q16First.question.includes("Esra") &&
      q16First.question.includes("tezkire"), "full original question is preserved");
    view = await next();
    const q16Second = await q16Phase();
    assert.deepEqual(q16Second.choices, ["A", "B", "C", "D", "E"],
      "p.235 q16 choices appear together after exactly one click");
    assert.equal(q16Second.promptCompact, true, "p.235 q16 prompt moves up and shrinks with choices");
    assert.equal(q16Second.choicesInFocus, 5,
      "p.235 q16 choices render in the modern QA focus region, below the compact prompt");
    assert.ok(!view.answer, "p.235 q16 correct answer stays hidden when options first appear");
    console.log("PASS production browser: p.231–235 tables, choices, progressive decisions, stable assessment geometry and five passages.");
  } finally {
    client?.close();
    if (browser.exitCode === null) { browser.kill("SIGTERM"); await Promise.race([new Promise((resolve) => browser.once("exit", resolve)), sleep(2500)]); }
    if (server.exitCode === null) { server.kill("SIGTERM"); await Promise.race([new Promise((resolve) => server.once("exit", resolve)), sleep(1000)]); }
    fs.rmSync(profile, { recursive: true, force: true, maxRetries: 4, retryDelay: 100 });
  }
}

function verifyPedagogicalEdits() {
  const step = (id) => {
    const result = flowSteps.find(({ step }) => step.id === id)?.step;
    assert.ok(result, "Theme 3 step " + id + " exists");
    return result;
  };
  assert.ok(answers.filter((item) => item.guidance?.trim()).length >= 125,
    "contextual teacher guidance has been recovered for answer records");
  // Kaynak kitaptaki tabloların ve çoktan seçmeli seçeneklerin içeriği korunur.
  const page230 = readJson(path.join(bookRoot, "pages/p230.json"));
  const reading230 = step("s230-venn-reading").content;
  const thesis = page230.blocks.find(b => b.id === "G11-T3-P230-TEXT01").text.replace(/^TEZ\s+/u, "");
  const antithesis = page230.blocks.find(b => b.id === "G11-T3-P230-TEXT02").text.replace(/^ANTİTEZ\s+/u, "");
  assert.deepEqual(reading230.claims, { thesis, antithesis },
    "p.230 textbook thesis/antithesis remain complete before the classification");
  assert.deepEqual(reading230.excerpts.map(e => e.label), ["1", "2", "3"],
    "p.230 presents three source texts separately without assigning Venn answers");
  for (const [index, phrase] of ["Yeşillikler bir anda sarardı", "Babam Havranlıydı", "İlk gözüme çarpan şey"].entries()) {
    assert.ok(reading230.excerpts[index].text.startsWith(phrase),
      "p.230 numbered text has the correct source opening: " + (index + 1));
  }
  assert.ok(reading230.excerpts.every(e => e.text.length > 240),
    "p.230 source passages are complete enough for independent reading");
  assert.deepEqual(step("s230-q1").content.venn, {
    thesis, antithesis, labels: ["Tez", "Kesişim", "Antitez"]
  }, "p.230 Venn task uses both printed claims without a prefilled answer");
  const distribution = answerById.get("T3-P230-Q01").answer_sections;
  assert.deepEqual([distribution.tez, distribution.antitez, distribution.kesisim], ["2", "1", "3"]);
  const preparation = JSON.stringify(step("s230-distinction").content);
  assert.ok(!/otobiyografi|Dönüştürülmüş gerçeklik|Doğrudan hayat bilgisi/iu.test(preparation),
    "p.230 synthesis preparation does not reveal the intended conclusion");
  assert.ok(!/birebir kopya|otobiyografi/iu.test(step("s230-q2").content.lead),
    "p.230 synthesis is student-produced before the model answer");
  const page231 = readJson(path.join(bookRoot, "pages/p231.json"));
  const page232 = readJson(path.join(bookRoot, "pages/p232.json"));
  const table231 = step("s231-q3").content.table;
  assert.deepEqual(table231.columns, ["İfade", "Açıklama"]);
  assert.deepEqual(table231.rows, page231.blocks.find((block) => block.type === "table").rows,
    "five source concepts retain their blank explanation cells in one table");
  assert.equal(table231.reveal_by_row, true, "concept definitions reveal inside the original five-row table");
  const termAnswers = answerById.get("T3-P231-Q03").answer_sections;
  assert.ok(table231.rows.every(([term]) => Object.keys(termAnswers).some((name) =>
    name.toLocaleLowerCase("tr") === term.toLocaleLowerCase("tr"))),
  "every table row has a matching independent definition");
  for (const [id, questionNo] of [["s231-q5", "5"], ["s231-q6", "6"]]) {
    const actual = step(id).content.options;
    const source = page231.blocks.find((block) => block.type === "question" && block.question_number === questionNo);
    assert.deepEqual(actual, source.options, id + ": all five multiple-choice options match the textbook");
    assert.ok(!/birikim, ilgi ve değerleri|ne tamamen gerçekliğin kopyası/u.test(step(id).content.lead),
      id + ": the initial guidance must not reveal option elimination or correct choice");
  }
  const themeChart = step("s232-veli-chart");
  assert.deepEqual(themeChart.content.table.rows,
    page232.blocks.find((block) => block.type === "table").rows,
    "Orhan Veli theme ratios must remain together as a comparison table");
  assert.match(themeChart.content.lead, /metnini okuyun/u,
    "questions 7–9 refer to the textbook source reading");
  assert.ok(!/Garip anlayışı|sıradan insanın ve gündelik hayatın şiire/u.test(
    step("s232-q7").prompt + " " + step("s232-q7").content.lead + " " + step("s232-q7").thinking),
    "the student must infer the main connection before the answer opens");
  assert.match(step("s231-q4").prompt, /sözlü olarak ifade ediniz/u);
  assert.match(answerById.get("T3-P231-Q03").answer_sections.Nesnellik, /gözlemlenebilir ve doğrulanabilir/u);
  const p233 = readJson(path.join(bookRoot, "pages/p233.json"));
  const p234 = readJson(path.join(bookRoot, "pages/p234.json"));
  const p235 = readJson(path.join(bookRoot, "pages/p235.json"));
  const sourceTable = (page, id) => {
    const table = page.blocks.find(block => block.id === id);
    return { columns: table.columns, rows: table.rows };
  };
  for (const id of ["s233-scoring", "s233-q10", "s233-q11"]) {
    const tables = step(id).content.tables;
    assert.deepEqual(tables.map(({ title, columns, rows }) => ({ title, columns, rows })), [
      { title: "Tablo A", ...sourceTable(p233, "G11-T3-P233-TABLE01") },
      { title: "Tablo B", ...sourceTable(p233, "G11-T3-P233-TABLE02") }
    ], id + ": textbook biography statements are complete and unmodified");
  }
  assert.equal(step("s233-q10").content.table_review.mode, "score");
  assert.equal(step("s233-q11").content.table_review.mode, "correction");
  assert.ok(!/Tablo A/u.test(step("s233-q10").content.lead), "question 10 must not leak correct table");
  assert.ok(!/Tablo B/u.test(step("s233-q11").content.lead), "question 11 must not leak group matching");
  assert.equal(step("s235-q16").content.options_on_next_click, true,
    "p.235 q16 requires a question-only first slide and a separate choices slide");
  for (const [id, page, number] of [
    ["s233-q9", p233, "9"],
    ["s235-q16", p235, "16"]
  ]) {
    const original = page.blocks.find(block => block.type === "question" && block.question_number === number);
    assert.deepEqual(step(id).content.options, original.options,
      id + ": all five original A–E options are projected");
  }
  assert.deepEqual(step("s234-q13").content.table.columns, ["Cümleler", "Evet", "Hayır", "Bilgi yok"]);
  assert.deepEqual(step("s234-q13").content.table.rows,
    sourceTable(p234, "G11-T3-P234-TABLE01").rows,
    "all eight original assessment statements and blank response cells are retained");
  assert.equal(step("s234-q13").content.table.review, "checks");
  assert.equal(step("s234-q13").content.table.review_reasons.length, 8);
  assert.equal(step("s235-source").content.excerpts.length, 5,
    "source reading retains five independent Roman-numeral excerpts");
  assert.deepEqual(step("s235-source").content.excerpts,
    p235.blocks.filter(block => block.type === "quote").map(({ label, text }) => ({ label, text })),
    "all source excerpts match the printed textbook exactly");
  assert.ok(!/hayat bilgisi|kurmaca anlatım/iu.test(step("s235-source").content.lead),
    "reading screen does not preclassify the passages");
  for (const [id, page] of [["s234-aile", 234], ["s235-q16", 235]]) {
    const source = step(id).content.sources[0];
    assert.equal(Number(source.url.match(/#page=(\d+)$/u)[1]), page,
      "remote verified MEB PDF opens its printed page, without local PDF offset");
  }
  assert.ok(step("s234-q14").prompt.includes("sözlü olarak açıklayınız"),
    "original oral-response instruction is retained");
  assert.ok(!/yalnızlık ilişkisi/iu.test(JSON.stringify(step("s234-mustafa").content.items)),
    "Fuzuli interpretation waits until after the student reads the passage");
  const words = step("s191-spell").content.items;
  assert.deepEqual(words, ["zatürree", "fevkalâdelik", "ilân", "telâştan", "eksilmiyen"],
    "five printed spellings are presented without treating correct circumflex forms as errors");
  assert.ok(!step("s230-q2").content.lead.includes("birebir kopya"),
    "synthesis answer is not shown before student work");
  assert.ok(!step("s233-q9").content.lead.includes("kronolojik"),
    "multiple-choice hint does not announce the correct option");
  assert.ok(step("s230-venn-reading").content.excerpts.every(({ text }) =>
    !/tez alanı|antitez alanı|kesişim alanı/iu.test(text)),
    "p.230 reading never inserts Venn answer labels into the source passages");
  const biographicalPreview = JSON.stringify(step("s194-two-biographies").content);
  assert.ok(!biographicalPreview.includes("Arayan Bulur") && !biographicalPreview.includes("1931"),
    "biographical turning points follow reading rather than precede it");
  const localAnswer = answerById.get("T3-P176-Q06");
  assert.ok(localAnswer.answer_sections["Kendi şehrimden örnek üretme"]);
  assert.ok(localAnswer.answer_sections["Eskişehir için örnek"]);
  const opinion = answerById.get("T3-P215-Q01");
  assert.ok(opinion.answer.startsWith("Örnek görüş:"));
  assert.ok(opinion.answer_sections["Gerekçelendirilebilecek başka yaklaşımlar"].length >= 2);
  assert.equal(answerById.get("T3-P177-COMP01").entry_type, "source_limited");
  for (const [stepId, count] of [["s214-rubric", 7], ["s228-rubric", 6]]) {
    const content = step(stepId).content;
    const rubric = content.rubric;
    assert.deepEqual(rubric.columns, ["Başlangıç düzeyinde", "Kabul edilebilir", "İyi", "Çok iyi"]);
    assert.equal(rubric.rows.length, count);
    assert.equal(rubric.min_points, count);
    assert.equal(rubric.rows.reduce((sum, row) => sum + row.max_points, 0), 100);
    assert.equal(rubric.total_points, 100);
    assert.ok(content.sources.some((source) => source.url.endsWith(".docx")),
      "official rubric source link is retained");
    for (const row of rubric.rows) {
      assert.equal(row.levels.length, 4);
      assert.ok(row.levels.every((level, i) => level.label === rubric.columns[i] &&
        /^\d+[–-]\d+$/.test(level.points) && level.description.trim().length > 12));
      assert.equal(+row.levels[3].points.split(/[–-]/)[1], row.max_points);
    }
  }
}

verifyPedagogicalEdits();
const sourceReport = verifySource();
const flowReport = verifyFlows();
const metadataReport = verifyMetadata();
console.log(`PASS static: ${flowReport.flowCount} flows / ${flowReport.stepCount} steps / ${sourceIndex.records.length} source records / ${flowReport.answerCount} answers / ${sourceReport.quoteCount} quotes / ${metadataReport.overrideCount} overrides.`);
console.log(`PASS source pages: ${sourceReport.pages} printed pages (160–235), PDF offset +1; quotes found on ${sourceReport.matchedPages.join(", ")}.`);
if (process.argv.includes("--static-only")) {
  console.log("SKIP production integration/browser: --static-only requested; no generated catalog or dist data read.");
} else {
  const production = verifyProductionCatalog();
  console.log(`PASS production catalog: ${production.generatedAnswers.size} Theme 3 answers in generated lessons and encrypted dist.`);
  if (process.argv.includes("--catalog-only")) console.log("SKIP browser: --catalog-only requested.");
  else await runProductionBrowserChecks(production);
}
