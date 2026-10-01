import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { groupItems, interleaveStages } from "../src/reveal-sequence.js";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(appRoot, "../..");
const lessons = JSON.parse(fs.readFileSync(path.join(repoRoot, "apps/lesson-player/src/generated/lessons.json"), "utf8"));
const getStep = (slug, id) => {
  const step = lessons.find((lesson) => lesson.lesson_slug === slug)?.steps.find((entry) => entry.id === id);
  assert.ok(step, `lesson step exists: ${slug}/${id}`);
  return step;
};
const stageNames = (items, size) => interleaveStages(groupItems(items, size)).map(({ group, stage }) => `${stage}:${group[0]}`);
const sources = (step) => step.content?.sources ?? [];

const karagozQ1 = getStep("karagoz", "s16-q1");
assert.equal(karagozQ1.content.images?.length, 1, "ISSUE-002: source illustration is part of the first view data");
assert.match(karagozQ1.content.images[0].alt, /Beberuhi.*Çelebi.*Zenne/);
assert.ok(fs.existsSync(path.join(appRoot, "dist", karagozQ1.content.images[0].src)), "source image is copied into the built presentation");
assert.equal(getStep("karagoz", "s16-q2").content.images?.length, 1, "source illustration remains visible for the follow-up question");

const mektup = lessons.find((lesson) => lesson.lesson_slug === "mektup");
const poem = mektup.steps.find((step) => step.id === "s46-q4");
assert.match(JSON.stringify(poem.content), /Hasret sana ey yirmi yılın/);
assert.ok(sources(poem).some((source) => source.url.includes("#page=47")), "ISSUE-013: full poem source can be opened");
const newsSteps = ["s48-q1", "s48-q2", "s48-q3"].map((id) => mektup.steps.find((step) => step.id === id));
assert.ok(newsSteps.every((step) => sources(step).some((source) => source.url.includes("#page=49"))), "ISSUE-015: source article page remains accessible through every related question");
assert.match(JSON.stringify(newsSteps[0].content.sections), /103 yıl sonra/);
const letterSteps = ["s50-q1", "s50-q2", "s50-q3", "s50-q4"].map((id) => mektup.steps.find((step) => step.id === id));
assert.ok(letterSteps.every((step) => sources(step).some((source) => source.url.includes("#page=50"))), "ISSUE-017: all five texts remain accessible from every related question");
assert.equal(letterSteps[0].content.sections.length, 5, "five source texts have readable context on the question screen");

const age = getStep("tema-2-girisi", "s88-q4");
assert.match(age.display_prompt, /doğuştan beri geçen ve yıl birimiyle ölçülen zaman/);
const q90a = getStep("ogulla-bulusma", "s90-q1");
const q90b = getStep("ogulla-bulusma", "s90-q2");
for (const step of [q90a, q90b]) {
  const answerText = JSON.stringify({ answer: step.answer.answer, sections: step.answer.answer_sections });
  assert.doesNotMatch(answerText, /görseldeki atlı yaşlı kişi|at, yol, dağ\/bozkır/);
  assert.equal(step.content.images?.[0]?.src, "assets/ogulla-bulusma-tren.png", "ISSUE-028: first view includes the verified source image");
  assert.ok(sources(step).some((source) => source.url.includes("#page=94")));
}

for (const [slug, id, requiredAnswer] of [
  ["ogulla-bulusma", "s90-strategy", /Göz Gezdirme/],
  ["divanu-lugatit-turk", "s127-q7", /Kapsamı Belirleme/]
]) {
  const step = getStep(slug, id);
  assert.equal(step.content, null, `${id}: answer/support does not exist in the initial content layer`);
  assert.match(JSON.stringify(step.answer), requiredAnswer, `${id}: support remains available in the answer layer`);
}

const vocabularyCases = [
  ["ogulla-bulusma", "s95-q1", 3, ["Yular", "Üzengi", "Katar", "Kampana", "Hat", "Toynak"]],
  ["orhun-abideleri", "s116-vocabulary", 3, ["ecdat", "il", "yağız", "kılmak", "töre", "şad"]]
];
for (const [slug, id, size, expectedTerms] of vocabularyCases) {
  const step = getStep(slug, id);
  assert.equal(step.presentation.interleave, true);
  assert.equal(step.presentation.answer_text, "end");
  const terms = Object.keys(step.answer.answer_sections);
  assert.deepEqual(terms.map((term) => term.toLocaleLowerCase("tr")), expectedTerms.map((term) => term.toLocaleLowerCase("tr")));
  assert.deepEqual(stageNames(terms, size), [
    `answer:${terms[0]}`, `prompt:${terms[size]}`, `answer:${terms[size]}`
  ], `${id}: first group's answer precedes the next group's prompt`);
}

for (const [id, order, size] of [
  ["s111-q1", ["hilye", "rahle", "cüz kesesi", "sebilci", "saka", "lîka", "rîh", "ebruculuk", "maktâcılık", "âmin alayı", "semâî kahvesi"], 2],
  ["s111-q3", ["sebilci", "saka", "lîka", "rîh", "ebruculuk", "maktâcılık", "maktâ"], 2],
  ["s140-vocabulary", ["çağ", "kahır", "canan", "saban", "sine"], 2]
]) {
  const slug = id.startsWith("s140") ? "asik-atismasi" : "eski-istanbul";
  const step = getStep(slug, id);
  assert.deepEqual(step.presentation.interleave.order, order);
  assert.equal(step.presentation.interleave.group_size, size);
  assert.deepEqual(step.reveal_order.slice(0, 2), ["dictionary", "answer"]);
  const termMap = new Map(step.answer.dictionary_terms.map((entry) => [entry.term, entry]));
  const sequence = stageNames(order, size);
  assert.equal(sequence[0], `answer:${order[0]}`);
  assert.equal(sequence[1], `prompt:${order[size]}`);
  assert.equal(sequence[2], `answer:${order[size]}`);
  assert.ok(order.every((term) => termMap.has(term)), `${id}: each presented term has a verified definition`);
}

const assessment = getStep("tema-2-degerlendirme", "s155-q1");
assert.ok(assessment.content.items?.length, "ISSUE-036: primary source phrases remain visible in the prompt layer");
assert.doesNotMatch(JSON.stringify(assessment.content), /dayanıklılık ve güç|emek|dayanışma|özveri|sebat/);
assert.match(JSON.stringify(assessment.answer.answer_sections), /Birlik ve dayanışma/);

console.log("[sunum-web] Presentation flow reveal and source regression tests passed.");
