import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { answerEvidenceStages, attachVocabularyAnswerFragments, evidenceContinuationPages, insertThinkingReveal } from "../src/reveal-sequence.js";
import { splitAtSentences } from "../src/text-chunks.js";
import { resolveVocabularyAnswerText, resolveWebPresentation, validateWebPresentationIndex } from "../../lesson-player/scripts/web-presentation.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const lessons = JSON.parse(fs.readFileSync(path.join(repoRoot, "apps/lesson-player/src/generated/lessons.json"), "utf8"));
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
const segmentedEvidence = evidenceContinuationPages(
  { answerText: "Cevap" },
  { first: "Birinci kaynak", second: "İkinci kaynak" },
  [{ values: ["Alıntı"] }],
  [{ first: "Birinci kaynak" }, { second: "İkinci kaynak" }]
);
assert.deepEqual(segmentedEvidence, [
  { answerText: "Cevap", evidenceSections: { first: "Birinci kaynak" }, quotes: ["Alıntı"] },
  { evidenceSections: { second: "İkinci kaynak" } }
], "Long paired evidence continues in order without losing its answer or repeating the answer card");

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


const lessonSlugs = lessons.map((lesson) => lesson.lesson_slug);
assert.equal(new Set(lessonSlugs).size, lessonSlugs.length, "canonical lesson slugs are unique");
let answerSteps = 0;
let webPresentationSteps = 0;
let sourceLinks = 0;
for (const lesson of lessons) {
  const ids = lesson.steps.map((step) => step.id);
  assert.equal(new Set(ids).size, ids.length, `${lesson.lesson_slug} step IDs are unique`);
  for (const step of lesson.steps) {
    if (step.answer) {
      answerSteps += 1;
      assert.ok(step.answer.question_id && step.answer.entry_type,
        `${lesson.lesson_slug}/${step.id} has a typed canonical answer`);
      assert.ok(step.reveal_order.includes("answer"),
        `${lesson.lesson_slug}/${step.id} reveals its canonical answer through the authored sequence`);
    }
    for (const source of step.content?.sources ?? []) {
      sourceLinks += 1;
      if (source.download) {
        assert.match(source.url, /^assets\/assessment-documents\/[A-Za-z0-9._-]+\.(?:docx|xlsx)$/i,
          `${lesson.lesson_slug}/${step.id} local download uses a supported resource path`);
      } else {
        assert.equal(new URL(source.url).protocol, "https:",
          `${lesson.lesson_slug}/${step.id} external source link uses HTTPS`);
      }
    }
    const units = step.presentation?.web?.units;
    if (!units) continue;
    webPresentationSteps += 1;
    assert.ok(step.answer, `${lesson.lesson_slug}/${step.id} web presentation is attached to an answer`);
    assert.ok(units.length > 0, `${lesson.lesson_slug}/${step.id} has at least one web response unit`);
    assert.equal(new Set(units.map((unit) => unit.id)).size, units.length,
      `${lesson.lesson_slug}/${step.id} web response unit IDs are unique`);
    const stages = answerEvidenceStages(units);
    assert.ok(stages.length > 0, `${lesson.lesson_slug}/${step.id} creates an answer stage`);
    for (const unit of units) {
      for (const key of unit.section_keys ?? []) {
        assert.ok(Object.hasOwn(step.answer.answer_sections ?? {}, key),
          `${lesson.lesson_slug}/${step.id}/${unit.id} refers to a current canonical answer section`);
      }
      for (const evidence of unit.evidence_sections ?? []) {
        assert.ok(Object.hasOwn(step.answer.answer_sections ?? {}, evidence.section_key),
          `${lesson.lesson_slug}/${step.id}/${unit.id} refers to a current canonical evidence section`);
      }
      for (const quoteIndex of unit.quote_indexes ?? []) {
        assert.ok(quoteIndex >= 0 && quoteIndex < (step.answer.evidence_quotes?.length ?? 0),
          `${lesson.lesson_slug}/${step.id}/${unit.id} refers to a current evidence quote`);
      }
    }
  }
}
assert.ok(answerSteps > 0, "canonical catalog contains answer-bearing lesson steps");
console.log(`[sunum-web] Presentation flow contracts passed: ${lessons.length} lessons, ${answerSteps} answer steps, ${webPresentationSteps} web sidecars, ${sourceLinks} source links.`);
