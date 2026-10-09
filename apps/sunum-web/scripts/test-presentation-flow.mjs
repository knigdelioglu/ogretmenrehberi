import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { answerEvidenceStages, attachVocabularyAnswerFragments, evidenceContinuationPages, groupItems, interleaveStages, insertThinkingReveal } from "../src/reveal-sequence.js";
import { splitAtSentences } from "../src/text-chunks.js";
import { resolveVocabularyAnswerText, resolveWebPresentation, validateWebPresentationIndex } from "../../lesson-player/scripts/web-presentation.mjs";

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

assert.deepEqual(
  insertThinkingReveal(["answer", "evidence"], true),
  ["thinking", "answer", "evidence"],
  "Düşünürken katmanı cevap ve kanıttan önce açılmalı"
);
assert.deepEqual(
  insertThinkingReveal(["answer", "evidence"], false),
  ["answer", "evidence"],
  "Düşünürken verisi olmayan soruların reveal sırası korunmalı"
);
assert.throws(
  () => insertThinkingReveal(["evidence"], true),
  /requires an answer reveal/,
  "Cevap katmanı olmayan bir adıma Düşünürken eklenememeli"
);
assert.deepEqual(answerEvidenceStages([
  { id: "topic", quote_indexes: [0], evidence_sections: [] },
  { id: "main-idea", quote_indexes: [], evidence_sections: [{ section_key: "Dayanaklar" }] }
]).map(({ type, unit }) => `${type}:${unit.id}`), [
  "answer:topic", "evidence:topic", "answer:main-idea", "evidence:main-idea"
], "Evidence sections and linked quotations follow their answer unit");
const continuedEvidence = evidenceContinuationPages(
  { sections: { conclusion: "Sonuç" }, answerText: "Gerekçe" },
  { source: "Kaynak bağlamı" },
  [{ values: ["Alıntı 1"] }, { values: ["Alıntı 2"] }, { values: ["Alıntı 3"] }, { values: ["Alıntı 4"] }]
);
assert.deepEqual(continuedEvidence[0], {
  sections: { conclusion: "Sonuç" }, answerText: "Gerekçe",
  evidenceSections: { source: "Kaynak bağlamı" }, quotes: ["Alıntı 1"]
}, "The first evidence page keeps its answer and source context");
assert.deepEqual(continuedEvidence.slice(1), [
  { quotes: ["Alıntı 2"] }, { quotes: ["Alıntı 3"] }, { quotes: ["Alıntı 4"] }
], "Evidence continuation pages do not repeat the same answer and source cards");

const vocabularyGroups = attachVocabularyAnswerFragments([
  { terms: [["çağdaş", "Aynı dönemde yaşayan."], ["özge", "Başka."]] },
  { terms: [["görkemli", "Gösterişli."]], hidden: true }
], {
  mode: "include",
  fragments: [
    { unit: "çağdaş", text: "Bağlamı sözlükten doğrulayın.", position: "start" },
    { unit: "özge", text: "Bu not sonraki gruba taşınmamalı.", position: "end" },
    { unit: "görkemli", text: "Gizli promptta gösterilmemeli.", position: "start" }
  ]
});
assert.equal(vocabularyGroups[0].answerTextBefore, "Bağlamı sözlükten doğrulayın.",
  "Vocabulary context can appear before its matched term group");
assert.equal(vocabularyGroups[0].answerTextAfter, "Bu not sonraki gruba taşınmamalı.",
  "Vocabulary context can appear after its matched term group");
assert.equal(vocabularyGroups[1].answerTextBefore, undefined,
  "Vocabulary context is not leaked into a hidden prompt group");
const longTextOnlyAnswer = Array.from({ length: 16 }, (_, index) =>
  `Parça ${index + 1} kısa cümle olarak kendi devam bağlamını korur.`
).join(" ");
const continuedAnswer = splitAtSentences(longTextOnlyAnswer, 72);
assert.ok(continuedAnswer.length > 1, "Long text-only answers split into meaningful continuation pages");
assert.ok(continuedAnswer.every((part) => part.length <= 72), "Sentence continuation pages respect the requested budget");
assert.ok(continuedAnswer.every((part) => /[.!?]$/u.test(part.trimEnd())),
  "Readable answers continue at sentence boundaries when possible");
assert.equal(continuedAnswer.join(""), longTextOnlyAnswer, "Text continuation does not drop source characters");
const longSingleSentence = "kelime ".repeat(80).trim();
const continuedSingleSentence = splitAtSentences(longSingleSentence, 72);
assert.ok(continuedSingleSentence.length > 1 && continuedSingleSentence.every((part) => part.length <= 72),
  "An unusually long sentence also receives readable word-boundary continuations");
assert.equal(continuedSingleSentence.join(""), longSingleSentence, "Word-boundary continuation preserves its source");

const webFixtureAnswer = {
  question_id: "FIXTURE-Q01",
  answer: "Giriş cümlesi. Konu cevabı. Ana düşünce cevabı. Sonuç cümlesi.",
  answer_sections: {
    topic: "Konu cevabı.",
    main_idea: "Ana düşünce cevabı.",
    support: ["‘Şehir insanı kendine çağırır.’ — Bu örnek ana düşünceyi destekler."]
  },
  evidence_quotes: ["Şehir insanı kendine çağırır.", "Kimlik için bir hüviyet gerekir."]
};
const webFixtureIndex = {
  schema_version: "1.1.0",
  theme_id: "TEMA_03",
  defaults: {
    section_units: "one-per-section",
    structured_answer_text: "omit-summary",
    array_answer_units: "one-list"
  },
  answers: {
    "FIXTURE-Q01": {
      units: [
        { id: "topic", sections: ["topic"] },
        {
          id: "main-idea",
          sections: ["main_idea"],
          evidence_sections: [{ key: "support", contains_quote_indexes: [0] }]
        }
      ],
      answer_text: {
        mode: "include",
        fragments: [
          { unit: "topic", text: "Giriş cümlesi.", position: "start" },
          { unit: "main-idea", text: "Sonuç cümlesi.", position: "end" }
        ]
      },
      quote_links: [
        { index: 0, unit: "topic" },
        { index: 0, unit: "main-idea" },
        { index: 1, unit: "main-idea" }
      ]
    }
  }
};

const vocabularyFixture = {
  layout: "vocabulary",
  answer: {
    question_id: "VOCABULARY-Q01",
    answer: "Tam cevap. Bağlam uyarısı.",
    answer_sections: { ilk: "Anlam 1", ikinci: "Anlam 2" }
  }
};
const vocabularyThemeData = {
  webPresentation: {
    schema_version: "1.1.0",
    answers: {
      "VOCABULARY-Q01": {
        answer_text: {
          mode: "include",
          fragments: [{ unit: "ikinci", text: "Bağlam uyarısı.", position: "end" }]
        }
      }
    }
  }
};
assert.deepEqual(
  resolveVocabularyAnswerText(vocabularyFixture, vocabularyFixture.answer, vocabularyThemeData),
  { mode: "include", fragments: [{ unit: "ikinci", text: "Bağlam uyarısı.", position: "end" }] },
  "Vocabulary answer text resolves to a specific term without replacing vocabulary grouping"
);
const fixtureThemeData = { webPresentation: webFixtureIndex };
validateWebPresentationIndex(webFixtureIndex, {
  themeNumber: 3,
  themeId: "TEMA_03",
  answerById: new Map([[webFixtureAnswer.question_id, webFixtureAnswer]])
});
const fixtureWeb = resolveWebPresentation({ layout: "question" }, webFixtureAnswer, fixtureThemeData);
assert.deepEqual(fixtureWeb.units.map((unit) => unit.section_keys), [["topic"], ["main_idea"]]);
assert.deepEqual(fixtureWeb.units[1].evidence_sections, [
  { section_key: "support", contains_quote_indexes: [0] }
], "Evidence-only source sections stay attached to a response unit");
assert.deepEqual(fixtureWeb.units.map((unit) => unit.quote_indexes), [[0], [0, 1]],
  "The same source quotation may explicitly support more than one response unit");
assert.deepEqual(fixtureWeb.units[1].inline_quote_indexes, [0],
  "A quote already embedded in a moved evidence section is not opened again for that unit");
assert.deepEqual(fixtureWeb.answer_text.fragments.map(({ unit, text }) => [unit, text]), [
  ["topic", "Giriş cümlesi."], ["main-idea", "Sonuç cümlesi."]
], "Only explicitly selected aggregate-summary fragments are retained");

const evidenceOnlyAnswer = {
  question_id: "EVIDENCE-ONLY-Q01",
  answer: "Bu yorum metinden çıkarılabilir. İlgili ayrıntı dayanak oluşturur.",
  answer_sections: {
    meaning: "Bu yorum metinden çıkarılabilir.",
    support: ["‘Ortak anlam kurulamamıştır.’ — Bu ayrıntı yorumu destekler."]
  },
  evidence_quotes: ["Ortak anlam kurulamamıştır."]
};
const evidenceOnlyIndex = {
  ...webFixtureIndex,
  answers: {
    "EVIDENCE-ONLY-Q01": {
      units: [
        { id: "meaning", sections: ["meaning"] },
        { id: "support", evidence_sections: [{ key: "support", contains_quote_indexes: [0] }] }
      ],
      answer_text: {
        mode: "include",
        fragments: [{ unit: "support", text: "İlgili ayrıntı dayanak oluşturur.", position: "start" }]
      },
      quote_links: [{ index: 0, unit: "support" }]
    }
  }
};
const evidenceOnlyWeb = resolveWebPresentation({ layout: "question" }, evidenceOnlyAnswer, {
  webPresentation: evidenceOnlyIndex
});
assert.deepEqual(evidenceOnlyWeb.units[1].section_keys, [],
  "A source-only section can have its own later evidence stage");
assert.deepEqual(evidenceOnlyWeb.units[1].evidence_sections, [
  { section_key: "support", contains_quote_indexes: [0] }
]);
assert.equal(evidenceOnlyWeb.answer_text.fragments[0].unit, "support",
  "An evidence-only unit must retain an authored answer excerpt before evidence");
const evidenceWithoutResponse = structuredClone(evidenceOnlyIndex);
evidenceWithoutResponse.answers["EVIDENCE-ONLY-Q01"].answer_text = {
  mode: "omit",
  reason: "No separate response excerpt"
};
assert.throws(() => resolveWebPresentation({ layout: "question" }, evidenceOnlyAnswer, {
  webPresentation: evidenceWithoutResponse
}), /evidence-only response unit needs an answer_text fragment/);

const unlinkedVocabularyOverride = structuredClone(vocabularyThemeData);
unlinkedVocabularyOverride.webPresentation.answers["VOCABULARY-Q01"].answer_text.fragments[0].unit = "missing";
assert.throws(() => resolveVocabularyAnswerText(vocabularyFixture, vocabularyFixture.answer, unlinkedVocabularyOverride),
  /answer_text fragment must be an exact source excerpt assigned to a unit/);
assert.throws(() => validateWebPresentationIndex(webFixtureIndex, {
  themeNumber: 2,
  themeId: "TEMA_03",
  answerById: new Map([[webFixtureAnswer.question_id, webFixtureAnswer]])
}), /theme_id/);
const unknownAnswerIndex = structuredClone(webFixtureIndex);
unknownAnswerIndex.answers["MISSING-Q01"] = {};
assert.throws(() => validateWebPresentationIndex(unknownAnswerIndex, {
  themeNumber: 3,
  themeId: "TEMA_03",
  answerById: new Map([[webFixtureAnswer.question_id, webFixtureAnswer]])
}), /unknown answer_id/);

const duplicatePairIndex = structuredClone(webFixtureIndex);
duplicatePairIndex.answers["FIXTURE-Q01"].quote_links.push({ index: 0, unit: "topic" });
assert.throws(() => resolveWebPresentation({ layout: "question" }, webFixtureAnswer, {
  webPresentation: duplicatePairIndex
}), /duplicate quote link/);
const fullSummaryIndex = structuredClone(webFixtureIndex);
fullSummaryIndex.answers["FIXTURE-Q01"].answer_text = { mode: "include", unit: "topic" };
assert.throws(() => resolveWebPresentation({ layout: "question" }, webFixtureAnswer, {
  webPresentation: fullSummaryIndex
}), /structured answer_text must use explicit source fragments/);
const structuredFullFragmentIndex = structuredClone(webFixtureIndex);
structuredFullFragmentIndex.answers["FIXTURE-Q01"].units = [
  { id: "whole-answer", sections: ["topic", "main_idea", "support"] }
];
structuredFullFragmentIndex.answers["FIXTURE-Q01"].answer_text = {
  mode: "include",
  fragments: [{ unit: "whole-answer", text: webFixtureAnswer.answer }]
};
structuredFullFragmentIndex.answers["FIXTURE-Q01"].quote_links = [
  { index: 0, unit: "whole-answer" }, { index: 1, unit: "whole-answer" }
];
assert.throws(() => resolveWebPresentation({ layout: "question" }, webFixtureAnswer, {
  webPresentation: structuredFullFragmentIndex
}), /structured answer cannot copy its full summary/);
const repeatedSectionFragmentIndex = structuredClone(webFixtureIndex);
repeatedSectionFragmentIndex.answers["FIXTURE-Q01"].answer_text.fragments[0].text = "Konu cevabı.";
assert.throws(() => resolveWebPresentation({ layout: "question" }, webFixtureAnswer, {
  webPresentation: repeatedSectionFragmentIndex
}), /fragment repeats a structured response section/);
const incompleteCoverageIndex = structuredClone(webFixtureIndex);
delete incompleteCoverageIndex.answers["FIXTURE-Q01"].units[1].evidence_sections;
assert.throws(() => resolveWebPresentation({ layout: "question" }, webFixtureAnswer, {
  webPresentation: incompleteCoverageIndex
}), /cover each answer_sections key exactly once/);

const worksheet = getStep("mektup", "s40-q5");
assert.deepEqual(worksheet.presentation.web.units.map((unit) => unit.id), [
  "topic", "main-idea", "supporting-thoughts", "messages"
], "ISSUE-105: topic and main idea reveal as separate response units in task order");
assert.equal(worksheet.presentation.web.answer_text.mode, "omit", "ISSUE-105: aggregate worksheet summary is not repeated");
assert.deepEqual(answerEvidenceStages(worksheet.presentation.web.units).slice(0, 3).map(({ type, unit }) => `${type}:${unit.id}`), [
  "answer:topic", "evidence:topic", "answer:main-idea"
], "ISSUE-105: each response opens before its own linked evidence");
assert.deepEqual(worksheet.presentation.web.units.flatMap((unit) => unit.quote_indexes).sort((a, b) => a - b), [0, 1, 2, 3, 4]);
const worksheetTwo = getStep("mektup", "s40-q5b");
assert.deepEqual(worksheetTwo.presentation.web.units.map((unit) => unit.section_keys[0]), [
  "Anlatım Biçimleri", "Anlatım Özellikleri", "Düşünceyi Geliştirme Yolları"
], "ISSUE-105: each worksheet 2 response is separate despite its two-column source layout");
const comparative = getStep("yazma", "s76-q3");
assert.deepEqual(comparative.presentation.web.units.map((unit) => unit.section_keys), [["benzerlikler", "farkliliklar"]],
  "A deliberate comparison remains one response unit");

const themeOneBookPages = fs.readdirSync(path.join(repoRoot, "data/book/grade-11/themes/theme-1/pages"))
  .filter((name) => /^p\d+\.json$/.test(name))
  .map((name) => JSON.parse(fs.readFileSync(path.join(repoRoot, "data/book/grade-11/themes/theme-1/pages", name), "utf8")));
const normalizeBookText = (value, repairLineWrap = false) => {
  let text = String(value).normalize("NFC").replace(/\s*\(basılı s\.\d+\)\s*$/iu, "");
  text = text.replace(/[•●]/gu, " ").replace(/[\u00ad\u200b]/gu, "");
  if (repairLineWrap) {
    text = text
      .replace(/-\s*\n\s*[a-h]\s+(?=\p{L})/giu, "")
      .replace(/-\s*\n\s*/gu, "");
  }
  return text.replace(/\s+/gu, " ").trim().toLocaleLowerCase("tr");
};
const themeOneBookText = themeOneBookPages.map((entry) => entry.text_layer || "").join("\n");
const directBookText = normalizeBookText(themeOneBookText);
const reflowedBookText = normalizeBookText(themeOneBookText, true);
let verifiedDirectQuotes = 0;
let verifiedLineWrappedQuotes = 0;
for (const lesson of lessons.filter((entry) => entry.theme_id === "TEMA_01")) {
  for (const step of lesson.steps) {
    for (const quote of step.answer?.evidence_quotes ?? []) {
      const normalizedQuote = normalizeBookText(quote);
      if (directBookText.includes(normalizedQuote)) verifiedDirectQuotes += 1;
      else if (reflowedBookText.includes(normalizeBookText(quote, true))) verifiedLineWrappedQuotes += 1;
      else assert.fail(`${lesson.lesson_slug}/${step.id}: evidence quote not found in Theme 1 book JSON: ${quote}`);
    }
  }
}
assert.equal(verifiedDirectQuotes, 172, "Theme 1 source quotes match the book JSON after whitespace and list-marker normalization");
assert.equal(verifiedLineWrappedQuotes, 9, "Remaining quotes match after printed line-wrap repair");

const karagozQ1 = getStep("karagoz", "s16-q1");
assert.equal(karagozQ1.content.images?.length, 1, "ISSUE-002: source illustration is part of the first view data");
assert.doesNotMatch(JSON.stringify(karagozQ1.content.images[0]), /Beberuhi|Çelebi|Zenne/, "ISSUE-002: type names do not leak on the question slide");
assert.match(karagozQ1.answer.answer, /Beberuhi.*Çelebi.*Zenne/, "ISSUE-002: type names remain in the answer reveal");
assert.ok(fs.existsSync(path.join(appRoot, "dist", karagozQ1.content.images[0].src)), "source image is copied into the built presentation");
assert.equal(getStep("karagoz", "s16-q2").content.images?.length, 1, "source illustration remains visible for the follow-up question");

const mektup = lessons.find((lesson) => lesson.lesson_slug === "mektup");
const poem = mektup.steps.find((step) => step.id === "s46-q4");
assert.match(JSON.stringify(poem.content), /Hasret sana ey yirmi yılın/);
assert.ok(sources(poem).some((source) => source.url.includes("#page=46")), "ISSUE-013: full poem source can be opened");
const newsSteps = ["s48-q1", "s48-q2", "s48-q3"].map((id) => mektup.steps.find((step) => step.id === id));
assert.ok(newsSteps.every((step) => sources(step).some((source) => source.url.includes("#page=48"))), "ISSUE-015: source article page remains accessible through every related question");
assert.match(JSON.stringify(newsSteps[0].content.sections), /103 yıl sonra/);
const letterSteps = ["s50-q1", "s50-q2", "s50-q3", "s50-q4"].map((id) => mektup.steps.find((step) => step.id === id));
assert.ok(letterSteps.every((step) => sources(step).some((source) => source.url.includes("#page=49"))), "ISSUE-017: all five texts remain accessible from every related question");
assert.equal(letterSteps[0].content.sections.length, 5, "five source texts have readable context on the question screen");

const age = getStep("tema-2-girisi", "s88-q4");
assert.match(age.display_prompt, /doğuştan beri geçen ve yıl birimiyle ölçülen zaman/);
const q90a = getStep("ogulla-bulusma", "s90-q1");
const q90b = getStep("ogulla-bulusma", "s90-q2");
for (const step of [q90a, q90b]) {
  const answerText = JSON.stringify({ answer: step.answer.answer, sections: step.answer.answer_sections });
  assert.doesNotMatch(answerText, /görseldeki atlı yaşlı kişi|at, yol, dağ\/bozkır/);
  assert.equal(step.content.images?.[0]?.src, "assets/ogulla-bulusma-tren.png", "ISSUE-028: first view includes the verified source image");
  assert.ok(sources(step).some((source) => source.url.includes("#page=93")));
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
