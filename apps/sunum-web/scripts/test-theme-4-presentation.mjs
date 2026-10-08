import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  resolveVocabularyAnswerText,
  resolveWebPresentation,
  validateWebPresentationIndex
} from "../../lesson-player/scripts/web-presentation.mjs";
import { answerEvidenceStages } from "../src/reveal-sequence.js";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(appRoot, "../..");
const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const themeRoot = path.join(repoRoot, "data/grade-11/source/teacher-book/theme-4");
const presentationRoot = path.join(repoRoot, "data/grade-11/presentation/theme-4");
const bookRoot = path.join(repoRoot, "data/book/grade-11/themes/theme-4");
const manifest = readJson(path.join(bookRoot, "manifest.json"));
const sourceIndex = readJson(path.join(themeRoot, "source-index.json"));
const answerIndex = readJson(path.join(themeRoot, "answer-bank.json"));
const webPresentation = readJson(path.join(presentationRoot, "web-presentation.json"));

assert.equal(manifest.printed_page_start, 236);
assert.equal(manifest.printed_page_end, 307);
assert.equal(manifest.pdf_page_offset, 1);
assert.equal(manifest.page_files.length, 72, "Theme 4 includes every printed page from 236 to 307");

const pages = manifest.page_files.map((name) => readJson(path.join(bookRoot, name)));
const pageByPrintedNumber = new Map(pages.map((page) => [page.printed_page, page]));
for (let printedPage = 236; printedPage <= 307; printedPage += 1) {
  const page = pageByPrintedNumber.get(printedPage);
  assert.ok(page, "book JSON exists for printed page " + printedPage);
  assert.equal(page.pdf_page, printedPage + 1, "PDF mapping for printed page " + printedPage);
}

const answers = answerIndex.parts.flatMap((part) =>
  readJson(path.join(themeRoot, part.path)).entries
);
const answerById = new Map(answers.map((answer) => [answer.question_id, answer]));
const themeData = { webPresentation };
const resolve = (answer, layout = "analysis") =>
  resolveWebPresentation({ layout }, answer, themeData);
const flows = fs.readdirSync(presentationRoot)
  .filter((name) => name.endsWith("-flow.json"))
  .sort()
  .map((name) => readJson(path.join(presentationRoot, name)));
const layoutByAnswerId = new Map(flows.flatMap((flow) => flow.steps
  .filter((step) => step.answer_id)
  .map((step) => [step.answer_id, step.layout])));
const flowSourceIds = new Set(flows.flatMap((flow) => flow.steps.map((step) => step.source_record_id)));
const flowAnswerIds = new Set(flows.flatMap((flow) => flow.steps.map((step) => step.answer_id).filter(Boolean)));

assert.equal(flows.length, 14, "Theme 4 has 14 presentation flows");
assert.equal(flows.reduce((count, flow) => count + flow.steps.length, 0), 237, "all Theme 4 lesson steps are present");
assert.equal(flowSourceIds.size, sourceIndex.records.length, "all 143 indexed source records are reached");
assert.deepEqual([...flowSourceIds].sort(), sourceIndex.records.map((record) => record.source_record_id).sort(),
  "the flows use exactly the indexed Theme 4 source records");
assert.equal(flowAnswerIds.size, answers.length, "all 164 answer-bank records are reached");
assert.deepEqual([...flowAnswerIds].sort(), [...answerById.keys()].sort());

assert.equal(webPresentation.schema_version, "1.1.0");
assert.equal(webPresentation.theme_id, sourceIndex.theme_id);
assert.deepEqual(webPresentation.defaults, {
  section_units: "one-per-section",
  structured_answer_text: "omit-summary",
  array_answer_units: "one-list"
});
validateWebPresentationIndex(webPresentation, {
  themeNumber: 4,
  themeId: sourceIndex.theme_id,
  answerById
});

const curatedAnswerTextIds = new Set([
  "T4-P239-Q03", "T4-P240-PERF01", "T4-P247-VOC01", "T4-P249-PERF01",
  "T4-P250-TABLE01", "T4-P251-Q02A", "T4-P252-Q03", "T4-P256-TABLE01",
  "T4-P257-Q01", "T4-P258-GRAM01", "T4-P261-Q01", "T4-P264-PERF01",
  "T4-P266-VOC01", "T4-P267-VOC02", "T4-P268-VOC03", "T4-P274-ANALYSIS01",
  "T4-P275-Q02A", "T4-P276-CONFLICT01", "T4-P277-PERF00", "T4-P278-TABLE01",
  "T4-P279-Q01", "T4-P280-PERF02", "T4-P286-PERF01", "T4-P287-VOC01",
  "T4-P288-Q02", "T4-P295-Q10", "T4-P299-Q03", "T4-P304-Q02",
  "T4-P304-Q03", "T4-P305-Q05", "T4-P306-Q08", "T4-P306-Q09",
  "T4-P307-Q10", "T4-P307-Q11"
]);
const isStructured = (answer) => Array.isArray(answer.answer_sections)
  ? answer.answer_sections.length > 0
  : Boolean(answer.answer_sections && typeof answer.answer_sections === "object");
const structuredAnswers = answers.filter(isStructured);
const structuredObjectAnswers = structuredAnswers.filter((answer) =>
  answer.answer_sections && !Array.isArray(answer.answer_sections)
);
assert.equal(structuredObjectAnswers.length, 93, "all 93 keyed structured answers were reviewed");
const includedAnswerTextIds = new Set();

for (const answer of structuredAnswers) {
  const layout = layoutByAnswerId.get(answer.question_id) ?? "analysis";
  let policy;
  if (layout === "vocabulary") {
    policy = resolveVocabularyAnswerText({ layout }, answer, themeData);
    assert.ok(policy, answer.question_id + ": vocabulary metadata resolves");
  } else {
    const presentation = resolve(answer, layout);
    assert.ok(presentation, answer.question_id + ": presentation metadata resolves");
    assert.ok(presentation.units.length, answer.question_id + ": has at least one response unit");
    policy = presentation.answer_text;
  }
  if (policy.mode === "include") {
    includedAnswerTextIds.add(answer.question_id);
    for (const fragment of policy.fragments) {
      assert.ok(answer.answer.includes(fragment.text),
        answer.question_id + ": included summary fragment is an exact source excerpt");
    }
  } else {
    assert.equal(policy.mode, "omit", answer.question_id + ": structured summary is omitted");
  }
}
assert.deepEqual([...includedAnswerTextIds].sort(), [...curatedAnswerTextIds].sort(),
  "only the 34 reviewed answer summaries with unique instructional content are included");

const collectStrings = (value, out = []) => {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((item) => collectStrings(item, out));
  else if (value && typeof value === "object") Object.values(value).forEach((item) => collectStrings(item, out));
  return out;
};
const normalizeText = (value) => String(value)
  .normalize("NFC")
  .toLocaleLowerCase("tr")
  .replace(/[^\p{L}\p{N}]/gu, "");
const pageText = collectStrings(pages).join("\n");
const normalizedBookText = normalizeText(pageText);

const quoteAnswerIds = answers
  .filter((answer) => answer.evidence_quotes?.length)
  .map((answer) => answer.question_id);
assert.equal(quoteAnswerIds.length, 20, "all quote-bearing answers are known");
assert.equal(quoteAnswerIds.reduce((count, id) => count + answerById.get(id).evidence_quotes.length, 0), 48,
  "all 48 evidence quotes are checked");

let evidenceSectionCount = 0;
let embeddedQuoteCount = 0;
const duplicateQuoteAnswerIds = new Set();
for (const answerId of quoteAnswerIds) {
  const answer = answerById.get(answerId);
  const override = webPresentation.answers[answerId];
  assert.ok(override, answerId + ": quote-bearing answer has presentation metadata");
  const presentation = resolve(answer, layoutByAnswerId.get(answerId) ?? "analysis");
  const linkedIndexes = new Set(presentation.units.flatMap((unit) => unit.quote_indexes));
  assert.deepEqual([...linkedIndexes].sort((a, b) => a - b),
    answer.evidence_quotes.map((_, index) => index),
    answerId + ": all evidence quotes are linked to response units");

  for (const [quoteIndex, quote] of answer.evidence_quotes.entries()) {
    if (normalizedBookText.includes(normalizeText(quote))) continue;

    // p.254 interleaves the info box with the Cimri dialogue in the page extraction;
    // verify this quote against the separately indexed drama-definition block.
    assert.equal(answerId + ":" + quoteIndex, "T4-P254-Q02:0",
      answerId + "[" + quoteIndex + "]: source quote exists in local book JSON");
    const sourcePage = pageByPrintedNumber.get(254);
    const infoBox = sourcePage.blocks.find((block) => block.id === "G11-T4-P254-INFO01");
    assert.ok(infoBox && infoBox.title === "Modern Tiyatro Türleri");
    const normalizedInfo = normalizeText(infoBox.text);
    assert.ok(normalizedInfo.includes(normalizeText("Hayatın acıklı ve gülünç")));
    assert.ok(normalizedInfo.includes(normalizeText("yönlerini bir arada yansıtan tiyatro")));
    assert.ok(normalizedInfo.includes(normalizeText("türüdür. Konusunu tarihten")));
  }

  const stages = answerEvidenceStages(presentation.units);
  for (const unit of presentation.units) {
    const answerStage = stages.findIndex((stage) => stage.type === "answer" && stage.unit.id === unit.id);
    const evidenceStage = stages.findIndex((stage) => stage.type === "evidence" && stage.unit.id === unit.id);
    if (unit.quote_indexes.length || unit.evidence_sections.length) {
      assert.ok(answerStage >= 0 && evidenceStage > answerStage,
        answerId + "/" + unit.id + ": answer precedes its evidence stage");
    }
    evidenceSectionCount += unit.evidence_sections.length;
    embeddedQuoteCount += unit.inline_quote_indexes.length;
  }

  const sections = answer.answer_sections;
  if (sections && !Array.isArray(sections)) {
    for (const [key, value] of Object.entries(sections)) {
      const sectionText = normalizeText(collectStrings(value).join("\n"));
      const matchingQuoteIndexes = answer.evidence_quotes
        .map((quote, index) => normalizeText(quote) && sectionText.includes(normalizeText(quote)) ? index : -1)
        .filter((index) => index >= 0);
      if (!matchingQuoteIndexes.length) continue;
      duplicateQuoteAnswerIds.add(answerId);
      const unit = presentation.units.find((candidate) =>
        candidate.evidence_sections.some((entry) => entry.section_key === key)
      );
      assert.ok(unit, answerId + "/" + key + ": quote-bearing section is moved to an evidence stage");
      const evidence = unit.evidence_sections.find((entry) => entry.section_key === key);
      assert.deepEqual(evidence.contains_quote_indexes, matchingQuoteIndexes,
        answerId + "/" + key + ": embedded evidence quotes are declared exactly once");
      assert.ok(matchingQuoteIndexes.every((index) => unit.inline_quote_indexes.includes(index)),
        answerId + "/" + key + ": inline evidence quotes are not repeated in the quote list");
    }
  }
}
assert.equal(duplicateQuoteAnswerIds.size, 10, "all ten quote-bearing answer pools are attached to response evidence");
assert.equal(evidenceSectionCount, 11, "all 11 overlapping answer-bank sections are shown in evidence stages");
assert.equal(embeddedQuoteCount, 25, "all 25 quote-in-section repeats are suppressed from the separate quote list");

for (const flow of flows) {
  for (const step of flow.steps.filter((candidate) => candidate.answer_id && candidate.layout !== "vocabulary")) {
    const answer = answerById.get(step.answer_id);
    assert.ok(answer, flow.lesson_slug + "/" + step.id + ": answer exists");
    const presentation = resolve(answer, step.layout);
    assert.ok(presentation.units.length, flow.lesson_slug + "/" + step.id + ": presentation has response units");
  }
}

const mindMap = answerById.get("T4-P288-Q02");
assert.equal(mindMap.entry_type, "source_limited");
const mindMapPresentation = resolve(mindMap);
const mindMapSectionUnit = (key) => mindMapPresentation.units.find((unit) =>
  unit.section_keys.includes(key)
);
assert.ok(mindMapSectionUnit("Tema"));
assert.ok(mindMapSectionUnit("Konu"));
assert.notEqual(mindMapSectionUnit("Tema").id, mindMapSectionUnit("Konu").id,
  "the mind map keeps theme and topic as separate responses");
assert.ok(mindMapSectionUnit("Ana düşünce"));
assert.ok(mindMapSectionUnit("Yardımcı düşünceler"));
assert.ok(mindMapSectionUnit("Bilgilerin Sunuluş Şekli"));
assert.match(pageByPrintedNumber.get(288).page_text, /Bilgiler, içeriği yansıtacak şekilde sunulmuştur\./u,
  "the prefilled presentation-method statement is source-grounded");

const sinanStructure = resolve(answerById.get("T4-P256-TABLE01"));
assert.deepEqual(sinanStructure.units.map((unit) => unit.section_keys), [
  ["Kişiler", "Yer/mekân", "Zaman", "Çatışmalar", "Dramatik örgü"],
  ["Kişiler ve mekân", "Mekân ve zaman", "Kişiler ve çatışmalar", "Çatışmalar ve dramatik örgü"]
], "dramatic structure reveals base elements and relationships as two coherent groups");

const comparison = resolve(answerById.get("T4-P272-Q01"));
assert.deepEqual(comparison.units.map((unit) => unit.section_keys), [
  ["İçerik", "Tür", "Şekil", "Dönem"],
  ["Yapı unsurları", "Dil ve üslup", "İleti"]
], "the seven comparison criteria reveal in two related groups");


const flowStepById = new Map(flows.flatMap((flow) => flow.steps.map((step) => [step.id, step])));
for (const [id, count] of Object.entries({
  "s247-vocab": 6, "s250-social-table": 7, "s250-social-table-rest": 6,
  "s258-grammar-apply": 6, "s272-table": 7, "s278-disciplines": 7,
  "s287-vocab": 5, "s294-q1": 5, "s294-q4": 5
})) {
  assert.equal(flowStepById.get(id)?.content?.items?.length, count,
    id + ": all required items appear in student task");
}
assert.equal(flowStepById.get("s250-social-table").content.items.length +
  flowStepById.get("s250-social-table-rest").content.items.length, 13);
assert.equal(flowStepById.get("s288-q2").content.items.length, 4,
  "mind map asks for only four unfilled areas");
assert.match(flowStepById.get("s288-q2").content.note, /Bilgilerin Sunuluş Şekli/u);
for (const id of ["s306-q8", "s306-q9", "s307-q10"]) {
  assert.ok(flowStepById.get(id)?.content?.lead && flowStepById.get(id)?.thinking,
    id + ": pre-answer guidance is available");
}
assert.doesNotMatch(flowStepById.get("s306-q8").content.lead, /diyalog\\/monolog/iu);
assert.doesNotMatch(flowStepById.get("s306-q9").content.lead, /tamamen/iu);
assert.doesNotMatch(flowStepById.get("s307-q10").content.lead, /korunup|kuşak|arşiv/iu);
assert.doesNotMatch(JSON.stringify(flowStepById.get("s264-stairs").content),
  /yaşam evresi|yükselme/iu);
assert.match(flowStepById.get("s265-check").content.sections[1].body, /metin kanıtıyla/u);
assert.match(flowStepById.get("s299-strategy").content.note, /hedef kitle uygunluğu/u);
for (const id of ["s283-performance", "s302-rubric"]) {
  const rubric = flowStepById.get(id).content;
  assert.equal(rubric.items.length, 6, id + ": six rubric criteria");
  assert.equal(rubric.sections.length, 7, id + ": six grouped criteria and total");
  for (const section of rubric.sections.slice(0, 6)) {
    for (const level of ["Başlangıç düzeyinde", "Kabul edilebilir", "İyi", "Çok iyi"]) {
      assert.ok(section.body.includes(level), id + "/" + section.title + ": " + level);
    }
  }
}

const p285 = pageByPrintedNumber.get(285);
assert.ok(p285.blocks.some((block) => block.type === "visual" && /raylarının yanında bir kaplumbağayı tutan eller/i.test(JSON.stringify(block))),
  "printed page 285 describes the turtle beside the railway tracks");
assert.match(answerById.get("T4-P285-Q02").answer, /izleme öncesi tahmindir/u);
assert.doesNotMatch(answerById.get("T4-P285-Q02").answer, /kaplumbağa|demir yolu/iu,
  "the pre-watch hypothesis does not invent visual details absent from printed page 285");
assert.equal(answerById.get("T4-P262-PERF01").evidence_quotes[3],
  "Benim adıma öyle bir bina yap ki, bir eşi daha bulunmaya!");
assert.ok(pageByPrintedNumber.get(257).page_text.includes("öyle bir bina yap ki, bir eşi daha bulunmaya!"),
  "the p.262 evidence quote matches the printed p.257 passage, including punctuation");

console.log("Theme 4 metadata/source QA passed: 72 pages, 14 flows, 237 steps, 143 source records, 164 answers, 93 structured answers, 34 curated summary inclusions, 48 source quotes, 11 evidence sections and 25 embedded-quote repeats.");
