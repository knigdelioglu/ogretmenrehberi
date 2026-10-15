import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  validateAnswerBankEntry,
  validateAnswerBankPart,
  validateFlowStepReferences,
  validatePresentationFlowSchema,
  readPresentationJson
} from "./presentation-content-validation.mjs";
import { answerLayerMarker, assertLayerHidden, assertLayerVisible } from "./presentation-behavior-contracts.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const flowPath = path.join(repoRoot, "data/grade-11/presentation/theme-4/degerlendirme-303-307-flow.json");
const themeRoot = path.join(repoRoot, "data/grade-11/source/teacher-book/theme-4");
const sourceIndex = readPresentationJson(path.join(themeRoot, "source-index.json"));
const answerIndex = readPresentationJson(path.join(themeRoot, "answer-bank.json"));
const flow = readPresentationJson(flowPath);
const generatedLessons = readPresentationJson(path.join(repoRoot, "apps/lesson-player/src/generated/lessons.json"));
const answers = answerIndex.parts.flatMap((part) =>
  readPresentationJson(path.join(themeRoot, part.path)).entries
);
const answerById = new Map(answers.map((answer) => [answer.question_id, answer]));
const sourceById = new Map(sourceIndex.records.map((source) => [source.source_record_id, source]));
const sampleStepIndex = flow.steps.findIndex((step) => {
  if (!step.answer_id || !/^s\d+-q\d+$/i.test(step.id)) return false;
  const answer = answerById.get(step.answer_id);
  return answer && answers.some((candidate) => candidate.printed_page === answer.printed_page &&
    candidate.question_id !== answer.question_id && /-P\d+-Q0*\d+$/i.test(candidate.question_id));
});
assert.ok(sampleStepIndex >= 0, "fixture flow provides a numbered question-answer link");
const sampleStep = flow.steps[sampleStepIndex];
const sampleAnswer = answerById.get(sampleStep.answer_id);
assert.ok(sampleAnswer, "canonical answer fixture exists");

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "presentation-content-validation-"));
const tempFlowPath = path.join(tempRoot, "degerlendirme-303-307-flow.json");
function writeFlow(value) {
  fs.writeFileSync(tempFlowPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return JSON.parse(fs.readFileSync(tempFlowPath, "utf8"));
}
function checkSchema(value) {
  validatePresentationFlowSchema(value, { filePath: tempFlowPath, themeNumber: 4 });
}

try {
  const malformedJsonPath = path.join(tempRoot, "malformed-flow.json");
  fs.writeFileSync(malformedJsonPath, '{"steps":', "utf8");
  assert.throws(() => readPresentationJson(malformedJsonPath),
    /malformed-flow\.json.*JSON\.document/, "malformed JSON reports its source file and parse location");

  checkSchema(flow);
  validateFlowStepReferences(sampleStep, { sourceById, answerById, filePath: tempFlowPath, stepIndex: sampleStepIndex });

  const updatedCopy = structuredClone(flow);
  updatedCopy.steps[sampleStepIndex].prompt = "Güncel soru metni; yapısal sözleşme metin içeriğini sabitlemez.";
  updatedCopy.steps[sampleStepIndex].content.lead = "Güncel açıklama metni.";
  checkSchema(writeFlow(updatedCopy));
  validateAnswerBankEntry({
    ...sampleAnswer,
    prompt_summary: "Güncel cevap bankası soru özeti.",
    explanation: `${sampleAnswer.explanation ?? ""} Güncel açıklama eki.`
  }, { filePath: path.join(tempRoot, "updated-answer-part.json"), index: 0, themeNumber: 4 });

  const missingField = structuredClone(flow);
  delete missingField.title;
  assert.throws(() => checkSchema(writeFlow(missingField)), /degerlendirme-303-307-flow\.json.*flow\.title/,
    "missing required field is attributed to the flow file and field");

  const wrongType = structuredClone(flow);
  wrongType.steps = "not-an-array";
  assert.throws(() => checkSchema(writeFlow(wrongType)), /flow\.steps.*expected a non-empty array/,
    "wrong JSON value type is rejected");

  const duplicateId = structuredClone(flow);
  duplicateId.steps[sampleStepIndex + 1].id = duplicateId.steps[sampleStepIndex].id;
  assert.throws(() => checkSchema(writeFlow(duplicateId)), /duplicate step ID/,
    "duplicate step IDs are rejected");

  const unsupportedType = structuredClone(flow);
  unsupportedType.steps[sampleStepIndex].layout = "video-card";
  assert.throws(() => checkSchema(writeFlow(unsupportedType)), /unsupported presentation type/,
    "unsupported presentation types are rejected");

  const badItemsType = structuredClone(flow);
  badItemsType.steps[sampleStepIndex].content.items = { one: "not a list" };
  assert.throws(() => checkSchema(writeFlow(badItemsType)), /content\.items.*expected an array/,
    "supported content fields reject the wrong type");

  const badSource = structuredClone(sampleStep);
  badSource.source_record_id = "T04-S9999";
  assert.throws(() => validateFlowStepReferences(badSource, { sourceById, answerById, filePath: tempFlowPath, stepIndex: sampleStepIndex }),
    /degerlendirme-303-307-flow\.json.*source_record_id.*unknown source record/,
    "unknown source references are rejected with the step context");

  const alternateSamePageQuestion = answers.find((answer) => answer.printed_page === sampleAnswer.printed_page &&
    answer.question_id !== sampleAnswer.question_id && /-P\d+-Q0*\d+$/i.test(answer.question_id));
  assert.ok(alternateSamePageQuestion, "fixture has another same-page question to exercise a broken pair");
  const brokenPair = { ...sampleStep, answer_id: alternateSamePageQuestion.question_id };
  assert.throws(() => validateFlowStepReferences(brokenPair, { sourceById, answerById, filePath: tempFlowPath, stepIndex: sampleStepIndex }),
    /answer_id.*same printed page and question number/,
    "a known but incorrectly paired same-page answer is rejected");

  const missingAnswerField = { ...sampleAnswer };
  delete missingAnswerField.question_id;
  assert.throws(() => validateAnswerBankEntry(missingAnswerField, { filePath: path.join(tempRoot, "bad-answer.json"), index: 0, themeNumber: 4 }),
    /bad-answer\.json.*question_id/,
    "answer-bank errors name the source file and field");
  assert.throws(() => validateAnswerBankEntry({ ...sampleAnswer, printed_page: "303" }, {
    filePath: path.join(tempRoot, "bad-answer-type.json"), index: 0, themeNumber: 4
  }), /printed_page.*positive integer/, "answer-bank data types are checked independently");
  assert.throws(() => validateAnswerBankEntry({ ...sampleAnswer, entry_type: "video_quiz" }, {
    filePath: path.join(tempRoot, "bad-answer-category.json"), index: 0, themeNumber: 4
  }), /entry_type.*unsupported answer type/, "unsupported answer content categories are rejected");
  assert.throws(() => validateAnswerBankPart({
    schema_version: "2.0.0", theme_id: "TEMA_04", part_id: "PART_12", printed_page_range: "303-307",
    entries: [{ ...sampleAnswer, printed_page: 308 }]
  }, { filePath: path.join(tempRoot, "bad-part-page.json"), themeNumber: 4 }),
  /bad-part-page\.json.*printed_page.*within part range/, "answer entries must lie inside their part's declared page range");

  const behaviorStep = generatedLessons.flatMap((lesson) => lesson.steps)
    .find((step) => answerLayerMarker(step));
  assert.ok(behaviorStep, "production catalog contains a canonical answer marker fixture");
  const answerMarker = answerLayerMarker(behaviorStep);
  assert.ok(answerMarker, "behavior fixture has independent answer text");
  assert.doesNotThrow(() => assertLayerHidden(behaviorStep, behaviorStep.display_prompt, "answer", "fixture task screen"));
  assert.throws(() => assertLayerHidden(behaviorStep, `${behaviorStep.display_prompt} ${answerMarker}`, "answer", "injected leak"),
    /answer content is visible before its reveal action/,
    "the behavior contract catches an answer made visible before user action");
  assert.doesNotThrow(() => assertLayerVisible(answerMarker, answerMarker, "answer", "fixture revealed screen"));
  assert.throws(() => assertLayerVisible("unrelated content", answerMarker, "answer", "injected missing reveal"),
    /expected answer content did not appear/,
    "the behavior contract catches an unexpected answer-stage output");

  const explanationStep = generatedLessons.flatMap((lesson) => lesson.steps)
    .find((step) => answerLayerMarker(step, "explanation"));
  assert.ok(explanationStep, "production catalog contains an independent explanation marker fixture");
  const explanationMarker = answerLayerMarker(explanationStep, "explanation");
  assert.doesNotThrow(() => assertLayerHidden(explanationStep, explanationStep.display_prompt, "explanation", "fixture task screen"));
  assert.throws(() => assertLayerHidden(explanationStep, `${explanationStep.display_prompt} ${explanationMarker}`, "explanation", "injected early explanation"),
    /explanation content is visible before its reveal action/,
    "the behavior contract catches an explanation shown at the wrong stage");
  assert.throws(() => assertLayerVisible("unexpected student-facing panel", explanationMarker, "explanation", "injected unexpected display"),
    /expected explanation content did not appear/,
    "the behavior contract catches a missing or unexpected reveal output");

  console.log("[presentation-data] Schema, linkage and reveal fault-injection fixtures passed; text-only updates remain valid.");
  await import("./test-presentation-source-evidence.mjs");
  await import("./test-presentation-pedagogy-contracts.mjs");
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
