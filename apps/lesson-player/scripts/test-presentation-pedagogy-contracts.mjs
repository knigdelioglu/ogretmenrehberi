import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertFactFictionBoundaries } from "./presentation-pedagogy-contracts.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
const answer = (relativePath, id) => readJson(relativePath).entries.find((entry) => entry.question_id === id);

const huzurAnswer = answer("data/grade-11/source/teacher-book/theme-3/answer-bank/part-04-pages-177-185.json", "T3-P182-Q01");
const mimarFactAnswer = answer("data/grade-11/source/teacher-book/theme-4/answer-bank/part-01-pages-236-242.json", "T4-P240-FACT01");
const mimarRoleplayAnswer = answer("data/grade-11/source/teacher-book/theme-4/answer-bank/part-01-pages-236-242.json", "T4-P240-PERF01");
const mimarScenarioAnswer = answer("data/grade-11/source/teacher-book/theme-4/answer-bank/part-05-pages-260-262.json", "T4-P262-PERFQ02");
const boundary = { huzurAnswer, mimarFactAnswer, mimarRoleplayAnswer, mimarScenarioAnswer };

assertFactFictionBoundaries(boundary);

const mixedCategories = structuredClone(boundary);
mixedCategories.huzurAnswer.answer_sections.gercek_hayattan_alinanlar.push(
  structuredClone(mixedCategories.huzurAnswer.answer_sections.kurgusal_unsurlar[2])
);
assert.throws(() => assertFactFictionBoundaries(mixedCategories), /fictional relationships as real-life facts/,
  "fact/fiction category inversion is rejected");

const inventedHistoricalQuote = structuredClone(boundary);
inventedHistoricalQuote.mimarRoleplayAnswer.answer = "Bu kurmaca konuşma Mimar Sinan'dan alınmış tarihî sözlerdir.";
inventedHistoricalQuote.mimarRoleplayAnswer.guidance = "Sözleri tarihî alıntı olarak aktarın.";
inventedHistoricalQuote.mimarRoleplayAnswer.answer_sections = { "Kurmaca diyalog": "Tarihî alıntıdır." };
assert.throws(() => assertFactFictionBoundaries(inventedHistoricalQuote), /not be presented as a historical quotation/,
  "invented role-play must not become a historical quotation");

const historicalScenario = structuredClone(boundary);
historicalScenario.mimarScenarioAnswer.explanation = "Bu, Mimar Sinan'ın yaşadığı tarihî bir olaydır.";
assert.throws(() => assertFactFictionBoundaries(historicalScenario), /not be presented as a historical event/,
  "student-created scenario cannot be labeled a historical event");

const wordingUpdates = structuredClone(boundary);
wordingUpdates.huzurAnswer.answer = "Güncellenmiş, eşdeğer açıklama.";
wordingUpdates.mimarScenarioAnswer.explanation = "Yeni ifade: tarihî bir olay sayılmaz; öğrencinin kurmaca senaryosudur.";
assert.doesNotThrow(() => assertFactFictionBoundaries(wordingUpdates),
  "answer wording updates that retain the pedagogical boundary remain valid");

console.log("[presentation-pedagogy] Fact/fiction boundaries and 3 fault injections passed; wording update remains valid.");
