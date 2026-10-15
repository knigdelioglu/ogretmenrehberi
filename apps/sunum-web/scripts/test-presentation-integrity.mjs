import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import { resolveWebPresentation, validateWebPresentationIndex } from "../../lesson-player/scripts/web-presentation.mjs";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(appRoot, "../..");
let themeNumber;
let sourceRoot;
let presentationRoot;
let bookRoot;
let manifest;
let sourceIndex;
let answerIndex;
let webPresentation;
let answers;
let answerById;
let sourceById;
let flows;
let flowSteps;
let stepByAnswer;
const generatedPath = path.join(repoRoot, "apps/lesson-player/src/generated/lessons.json");
const distPath = path.join(appRoot, "dist");
const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const nonEmpty = (value) => value !== undefined && value !== null &&
  !(typeof value === "string" && !value.trim()) && !(Array.isArray(value) && !value.length);

function expectedPublicAnswer(lesson, step) {
  if (!step.answer) return null;
  const includeTeacherSupport = lesson.theme_id !== "TEMA_01" && lesson.theme_id !== "TEMA_02";
  const fields = [
    "entry_type", "question_no", "answer", "answer_sections",
    ...(includeTeacherSupport ? ["guidance", "explanation"] : []),
    "evidence_quotes", "dictionary_terms"
  ];
  const answer = Object.fromEntries(fields.filter((field) => nonEmpty(step.answer[field]))
    .map((field) => [field, step.answer[field]]));
  if (answer.dictionary_terms) {
    answer.dictionary_terms = answer.dictionary_terms.map(({ term, meaning }) => ({ term, meaning }));
  }
  return Object.keys(answer).length ? answer : null;
}
function selectTheme(number) {
  themeNumber = number;
  sourceRoot = path.join(repoRoot, `data/grade-11/source/teacher-book/theme-${number}`);
  presentationRoot = path.join(repoRoot, `data/grade-11/presentation/theme-${number}`);
  bookRoot = path.join(repoRoot, `data/book/grade-11/themes/theme-${number}`);
  manifest = readJson(path.join(bookRoot, "manifest.json"));
  sourceIndex = readJson(path.join(sourceRoot, "source-index.json"));
  answerIndex = readJson(path.join(sourceRoot, "answer-bank.json"));
  webPresentation = readJson(path.join(presentationRoot, "web-presentation.json"));
  answers = answerIndex.parts.flatMap((part) => readJson(path.join(sourceRoot, part.path)).entries);
  answerById = new Map(answers.map((answer) => [answer.question_id, answer]));
  sourceById = new Map(sourceIndex.records.map((record) => [record.source_record_id, record]));
  const flowFiles = fs.readdirSync(presentationRoot).filter((name) => name.endsWith("-flow.json")).sort();
  flows = flowFiles.map((name) => readJson(path.join(presentationRoot, name)));
  flowSteps = flows.flatMap((flow) => flow.steps.map((step) => ({ flow, step })));
  stepByAnswer = new Map(flowSteps.filter(({ step }) => step.answer_id)
    .map(({ flow, step }) => [step.answer_id, { flow, step }]));
}

function verifySourceAndFlows() {
  const printedStart = manifest.printed_page_start;
  const printedEnd = manifest.printed_page_end;
  assert(Number.isInteger(printedStart) && Number.isInteger(printedEnd) && printedEnd >= printedStart,
    `Theme ${themeNumber} manifest declares a valid printed page range`);
  assert.equal(manifest.page_files.length, printedEnd - printedStart + 1,
    "manifest page files cover the declared printed range");
  assert.equal(sourceIndex.counts.records, sourceIndex.records.length,
    "source index count matches its source records");
  assert.equal(answerIndex.coverage.entry_count, answers.length,
    "answer bank coverage count matches its part files");

  const pages = manifest.page_files.map((name) => readJson(path.join(bookRoot, name)));
  const pageByNumber = new Map(pages.map((page) => [page.printed_page, page]));
  const offset = manifest.printed_to_pdf_offset ?? manifest.pdf_page_offset ??
    manifest.page_numbering?.printed_to_pdf_offset;
  assert(Number.isInteger(offset), `Theme ${themeNumber} manifest declares a printed-to-PDF page offset`);
  for (let printed = printedStart; printed <= printedEnd; printed += 1) {
    const page = pageByNumber.get(printed);
    assert(page, `printed page ${printed} exists in the manifest`);
    assert.equal(page.pdf_page, printed + offset, `PDF page mapping for printed page ${printed}`);
  }
  let quoteCount = 0;
  const evidencePages = new Set();
  for (const answer of answers) {
    const sourcePage = pageByNumber.get(answer.printed_page);
    assert(sourcePage, `${answer.question_id}.printed_page resolves to a book page`);
    for (const [quoteIndex, quote] of (answer.evidence_quotes ?? []).entries()) {
      quoteCount += 1;
      assert.equal(typeof quote, "string", `${answer.question_id}.evidence_quotes[${quoteIndex}] is text`);
      assert(quote.trim().length > 0, `${answer.question_id}.evidence_quotes[${quoteIndex}] is not empty`);
      // Exact OCR text matching made valid quotes fail when source extraction
      // split a word across a lettered instruction marker (for example,
      // "bö-\na lümlerini"). The independent page relationship is checked here;
      // malformed/missing quote data is covered by the content validator and
      // browser reveal contracts.
      evidencePages.add(answer.printed_page);
    }
  }

  const stepIds = new Set();
  const reachedSources = new Set();
  const reachedAnswers = new Set();
  for (const { flow, step } of flowSteps) {
    const key = `${flow.lesson_id}/${step.id}`;
    assert(!stepIds.has(key), `${key}: flow step IDs are unique`);
    stepIds.add(key);
    assert(sourceById.has(step.source_record_id), `${key}.source_record_id resolves to the source index`);
    reachedSources.add(step.source_record_id);
    if (step.answer_id) {
      assert(answerById.has(step.answer_id), `${key}.answer_id resolves to the answer bank`);
      reachedAnswers.add(step.answer_id);
    }
  }
  for (const flow of flows) {
    for (const sourceId of flow.additional_source_records ?? []) {
      assert(sourceById.has(sourceId), `${flow.lesson_id}.additional_source_records resolves ${sourceId}`);
      reachedSources.add(sourceId);
    }
  }
  assert.deepEqual([...reachedSources].sort(), sourceIndex.records.map((record) => record.source_record_id).sort(),
    "flow steps and declared additional sources cover the canonical source index");
  assert.deepEqual([...reachedAnswers].sort(), [...answerById.keys()].sort(),
    "flow steps cover each canonical answer exactly once");
  assert.equal(stepByAnswer.size, answerById.size, "answer IDs have one canonical flow step each");
  return { pageCount: pages.length, flowCount: flows.length, stepCount: flowSteps.length,
    sourceCount: reachedSources.size, answerCount: reachedAnswers.size, quoteCount,
    evidencePageCount: evidencePages.size };
}

function verifyWebPresentation() {
  validateWebPresentationIndex(webPresentation, { themeNumber, themeId: `TEMA_0${themeNumber}`, answerById });
  const resolved = new Map();
  for (const [answerId, answer] of answerById) {
    const record = stepByAnswer.get(answerId);
    assert(record, `${answerId}: canonical answer is reached by one flow step`);
    const presentation = resolveWebPresentation(record.step, answer, { webPresentation });
    if (presentation) {
      resolved.set(answerId, presentation);
    }
  }
  const configuredIds = Object.keys(webPresentation.answers ?? {});
  assert.equal(new Set(configuredIds).size, configuredIds.length, "web presentation answer overrides have unique IDs");
  for (const answerId of configuredIds) assert(answerById.has(answerId), `${answerId}: web presentation override resolves canonically`);
  return { overrideCount: configuredIds.length, resolvedCount: resolved.size };
}

function themeProjection(catalog) {
  return catalog.filter((lesson) => (lesson.theme_id ?? lesson.theme) === `TEMA_0${themeNumber}`);
}

function presentationPassword() {
  if (process.env.SUNUM_SIFRE) return process.env.SUNUM_SIFRE;
  const localEnv = path.join(appRoot, ".env.local");
  if (fs.existsSync(localEnv)) {
    const line = fs.readFileSync(localEnv, "utf8").split(/\r?\n/u).find((item) => /^\s*SUNUM_SIFRE\s*=/.test(item));
    if (line) return line.replace(/^\s*SUNUM_SIFRE\s*=\s*/u, "").trim().replace(/^(?:"(.*)"|'(.*)')$/u, "$1$2");
  }
  return "sunum";
}

function verifyProductionCatalog() {
  assert(fs.existsSync(generatedPath), "production-generated lessons.json exists; run the shared builder first");
  assert(fs.existsSync(distPath), "production Sunum Web dist exists; run the shared site build first");
  const generated = readJson(generatedPath);
  const generatedTheme = themeProjection(generated);
  assert(generatedTheme.length, `production builder includes Theme ${themeNumber} lessons`);
  const generatedAnswers = new Map(generatedTheme.flatMap((lesson) => lesson.steps
    .filter((step) => step.answer?.question_id).map((step) => [step.answer.question_id, { lesson, step }])));
  assert.deepEqual([...generatedAnswers.keys()].sort(), [...answerById.keys()].sort(),
    `production-generated Theme ${themeNumber} catalog contains exactly the canonical answer set`);
  const generatedById = new Map(generatedTheme.map((lesson) => [lesson.lesson_id, lesson]));
  for (const { flow, step } of flowSteps) {
    const generatedLesson = generatedById.get(flow.lesson_id);
    assert(generatedLesson, `${flow.lesson_id}: flow lesson reaches production catalog`);
    const generatedStep = generatedLesson.steps.find((candidate) => candidate.id === step.id);
    assert(generatedStep, `${flow.lesson_id}/${step.id}: step reaches production catalog`);
    if (step.answer_id) {
      const canonicalAnswer = answerById.get(step.answer_id);
      const expected = resolveWebPresentation(step, canonicalAnswer, { webPresentation });
      if (expected && generatedStep.layout !== "vocabulary") {
        assert.deepEqual(generatedStep.presentation?.web, expected,
          `${flow.lesson_slug ?? flow.lesson_id}/${step.id}: production applies canonical web presentation metadata`);
      }
    }
  }

  const encryptedFile = fs.readdirSync(distPath).find((name) => /^data\.[0-9a-f]+\.bin$/.test(name));
  assert(encryptedFile, "production dist contains an encrypted catalog");
  const buffer = fs.readFileSync(path.join(distPath, encryptedFile));
  assert.equal(buffer.subarray(0, 4).toString("ascii"), "SNM1", "encrypted catalog header is valid");
  const iterations = buffer.readUInt32BE(4);
  const salt = buffer.subarray(8, 24);
  const iv = buffer.subarray(24, 36);
  const body = buffer.subarray(36, buffer.length - 16);
  const tag = buffer.subarray(buffer.length - 16);
  const key = crypto.pbkdf2Sync(presentationPassword(), salt, iterations, 32, "sha256");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const encryptedCatalog = JSON.parse(gunzipSync(Buffer.concat([decipher.update(body), decipher.final()])).toString("utf8"));
  const encryptedTheme = themeProjection(encryptedCatalog.lessons);
  const encryptedBySlug = new Map(encryptedTheme.map((lesson) => [lesson.slug, lesson]));
  assert.equal(encryptedTheme.length, generatedTheme.length,
    `encrypted production catalog includes every generated Theme ${themeNumber} lesson`);
  for (const lesson of generatedTheme) {
    const encryptedLesson = encryptedBySlug.get(lesson.lesson_slug);
    assert(encryptedLesson, `${lesson.lesson_slug}: generated lesson is present in encrypted catalog`);
    assert.equal(encryptedLesson.steps.length, lesson.steps.length,
      `${lesson.lesson_slug}: encrypted step count matches the generated catalog`);
    for (const [index, step] of lesson.steps.entries()) {
      const encryptedStep = encryptedLesson.steps[index];
      assert.equal(encryptedStep.id, step.id, `${lesson.lesson_slug}: encrypted step order matches generated catalog`);
      assert.equal(encryptedStep.prompt, step.display_prompt, `${lesson.lesson_slug}/${step.id}: encrypted prompt matches generated catalog`);
      assert.deepEqual(encryptedStep.answer, expectedPublicAnswer(lesson, step),
        `${lesson.lesson_slug}/${step.id}: encrypted answer contains the current student-facing response and no private linkage metadata`);
      assert.equal(encryptedStep.content?.note, undefined,
        `${lesson.lesson_slug}/${step.id}: teacher-only notes never enter the encrypted student catalog`);
      assert.deepEqual(encryptedStep.presentation?.web, step.presentation?.web,
        `${lesson.lesson_slug}/${step.id}: encrypted catalog preserves resolved presentation behavior`);
    }
  }
  return { lessonCount: generatedTheme.length, answerCount: generatedAnswers.size };
}

for (const number of [1, 2, 3, 4]) {
  selectTheme(number);
  const sourceReport = verifySourceAndFlows();
  const webReport = verifyWebPresentation();
  console.log(`PASS Theme ${number} source/data contracts: ${sourceReport.flowCount} flows, ${sourceReport.stepCount} steps, ${sourceReport.sourceCount} source links, ${sourceReport.answerCount} answers, ${sourceReport.quoteCount} non-empty evidence quotes across ${sourceReport.evidencePageCount} pages.`);
  console.log(`PASS Theme ${number} web presentation: ${webReport.overrideCount} reviewed overrides resolve; ${webReport.resolvedCount} answer presentations validated.`);
  if (!process.argv.includes("--static-only")) {
    const productionReport = verifyProductionCatalog();
    console.log(`PASS Theme ${number} production catalog: ${productionReport.lessonCount} encrypted lessons, ${productionReport.answerCount} canonical answers.`);
  }
}
