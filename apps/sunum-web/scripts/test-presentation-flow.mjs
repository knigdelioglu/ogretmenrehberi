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
assert.doesNotMatch(JSON.stringify(karagozQ1.content.images[0]), /Beberuhi|Çelebi|Zenne/, "ISSUE-002: type names do not leak on the question slide");
assert.match(karagozQ1.answer.answer, /Beberuhi.*Çelebi.*Zenne/, "ISSUE-002: type names remain in the answer reveal");
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

const theme4Step = (slug, id) => getStep(slug, id);
const theme4VocabCases = [
  ["ben-mimar-sinan-okuma-243-250", "s247-vocab", 3, ["çağdaş", "özge", "görkemli", "şevk", "avaze", "sadr-ı âzam"]],
  ["merdiven-anlama-266-270", "s266-vocabulary", 3, ["daire", "yeni yetme", "kanı(mca)", "yol vermek", "gereksinme", "duralamak"]],
  ["anadolu-insani-284-290", "s287-vocab", 3, ["fedakârlık", "hemzemin geçit", "mesai", "aksaklık", "tahammül"]]
];
for (const [slug, id, size, expectedTerms] of theme4VocabCases) {
  const step = theme4Step(slug, id);
  const terms = Object.keys(step.answer.answer_sections);
  assert.equal(step.layout, "vocabulary", `${id}: vocabulary layout is used for grouped reveal`);
  assert.equal(step.presentation.interleave.group_size, size, `${id}: configured group size is preserved`);
  assert.deepEqual(terms, expectedTerms, `${id}: task and answer term order match`);
  assert.deepEqual(stageNames(terms, size), [
    `answer:${terms[0]}`,
    `prompt:${terms[size]}`,
    `answer:${terms[size]}`
  ], `${id}: each word group is followed by its meanings`);
}

for (const [id, size] of [["s256-elements", 5], ["s278-disciplines", 4], ["s279-q1", 4]]) {
  const slug = id === "s256-elements" ? "ben-mimar-sinan-cozumleme-256-259" : "merdiven-cozumleme-274-279";
  const step = theme4Step(slug, id);
  const keys = Object.keys(step.answer.answer_sections);
  assert.equal(step.presentation.interleave.group_size, size, `${id}: grouped answer size is configured`);
  assert.deepEqual(stageNames(keys, size), [
    `answer:${keys[0]}`,
    `prompt:${keys[size]}`,
    `answer:${keys[size]}`
  ], `${id}: group 1 answer precedes group 2 task`);
}

const noLeak = (slug, id, leaked, label, answerPattern = leaked) => {
  const step = theme4Step(slug, id);
  assert.doesNotMatch(JSON.stringify(step.content), leaked, `${id}: answer content does not leak into the first view`);
  if (answerPattern) assert.match(JSON.stringify(step.answer), answerPattern, `${id}: answer remains available after the reveal`);
};
noLeak("tema-girisi-236-242", "s236-map", /Ben, Mimar Sinan|Anadolu İnsanı|Tiyatro canlandırması/, "ISSUE-074");
noLeak("tema-girisi-236-242", "s240-fact-fiction", /Kaynağın verdiği tarihî|Kurduğunuz hayalî/, "ISSUE-076");
noLeak("ben-mimar-sinan-cozumleme-256-259", "s258-q2", /Sinan'ın düşünce|Görev, beklenti/, "ISSUE-080");
noLeak("merdiven-cozumleme-274-279", "s275-q2a", /Merdivenin yerini|Acil haber/, "ISSUE-083");
noLeak("merdiven-cozumleme-274-279", "s276-conflicts", /Yükselme\/acele|İhtiyarın deneyimi/, "ISSUE-084", /Anlatıcının iş telaşı|örtük gerilim/);
noLeak("tiyatro-canlandirma-280-283", "s280-q2", /Karakterin amacı ve ilişkileri|Ses tonu, vurgu/, "ISSUE-089");
noLeak("tiyatro-canlandirma-280-283", "s280-subtext", /Metinde doğrudan duyulan|gizlediği düşünce/, "ISSUE-090");
noLeak("anadolu-insani-cozumleme-291-297", "s295-q7", /Göndergesel|Heyecana bağlı|Kanalı kontrol/, "ISSUE-092");
noLeak("anadolu-insani-cozumleme-291-297", "s297-next", /olgu ile yorumu|İlk izleyiş bütünlük/, "ISSUE-093", /kendi hedefinizi|gözlenebilir ölçüt/);
noLeak("afis-atolyesi-298-302", "s302-next", /ana iletiyi tasarımdan|3 kısa mesaj/, "ISSUE-094", /kendi öğrenme ihtiyacınıza|gözlenebilir hedef/);
noLeak("degerlendirme-303-307", "s303-reading", /Hitap, dinî söyleyiş|şehitlik/, "ISSUE-096", null);
noLeak("degerlendirme-303-307", "s304-q4", /Umut, sevgi, güven, merhamet/, "ISSUE-097", /Umut/);
noLeak("degerlendirme-303-307", "s307-q12", /Dijital üretim|teknolojinin tek başına/, "ISSUE-100", /kamera ve ses teknolojisinin dijitalleşmesi|bilgisayar teknolojisinin kurgu/);
noLeak("degerlendirme-303-307", "s307-q14", /Yer, ilişki, kültür, emek, anı/, "ISSUE-101", /hazır bir liste|video kanıtı/);

const grammarPrompt = theme4Step("ben-mimar-sinan-cozumleme-256-259", "s258-grammar");
const grammarApply = theme4Step("ben-mimar-sinan-cozumleme-256-259", "s258-grammar-apply");
assert.equal(grammarPrompt.answer, null, "ISSUE-081: classification prompt has no answer before the task");
assert.equal(grammarApply.answer.question_id, "T4-P258-GRAM01", "ISSUE-081: the six sentences own the reveal");

const socialFirst = theme4Step("ben-mimar-sinan-okuma-243-250", "s250-social-table");
const socialRest = theme4Step("ben-mimar-sinan-okuma-243-250", "s250-social-table-rest");
assert.equal(Object.keys(socialFirst.answer.answer_sections).length, 7, "ISSUE-078: first social-expression group has seven answers");
assert.equal(Object.keys(socialRest.answer.answer_sections).length, 6, "ISSUE-078: remaining social-expression group has six answers");
const whatIf = theme4Step("merdiven-cozumleme-274-279", "s277-whatif");
assert.deepEqual(Object.keys(whatIf.answer.answer_sections), [
  "Anlatıcı ihtiyar memurla karşılaşmasaydı",
  "İhtiyar memur ölmemiş olsaydı",
  "Anlatıcı genç memurla karşılaşmasaydı"
], "ISSUE-085: counterfactual answers follow the question order in one reveal");
assert.equal(theme4Step("merdiven-cozumleme-274-279", "s276-conflicts").answer.answer_sections["Anlatıcı ihtiyarla karşılaşmasaydı"], undefined, "ISSUE-085: counterfactual answers are not duplicated in the conflict answer");

const posterImages = theme4Step("degerlendirme-303-307", "s305-q5").content.images;
assert.equal(posterImages.length, 4, "ISSUE-098: four PDF-sourced poster images are in the presentation data");
for (const image of posterImages) assert.ok(fs.existsSync(path.join(appRoot, "dist", image.src)), `ISSUE-098: built asset exists: ${image.src}`);

const q11 = theme4Step("degerlendirme-303-307", "s307-q11");
assert.match(q11.display_prompt, /Elif, yaptığı araştırmalar/);
assert.match(JSON.stringify(q11.content), /A\) Televizyon/);
assert.match(JSON.stringify(q11.content), /E\) İnternet platformlarının etkisi/);
assert.match(q11.answer.answer, /Doğru seçenek: B/);

const p301Model = theme4Step("afis-atolyesi-298-302", "s301-model");
assert.match(JSON.stringify(p301Model.answer), /3–5 sözcük/);
assert.doesNotMatch(JSON.stringify(theme4Step("afis-atolyesi-298-302", "s299-strategy").content), /3–6 sözcük/);
const threshold = theme4Step("tema-girisi-236-242", "s237-threshold");
assert.doesNotMatch(JSON.stringify({ ...threshold.content, note: undefined }), /bu aşamada açın/);

console.log("[sunum-web] Presentation flow reveal and source regression tests passed.");
