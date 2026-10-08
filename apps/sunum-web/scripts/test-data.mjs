// dist/ içindeki şifreli veriyi çözüp kanonik ders kataloğuyla karşılaştırır.
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { collectThinkingRecords, thinkingRecordKey } from "./thinking-data.mjs";
import { assessmentFormsForLessons } from "./assessment-forms.mjs";
import {
  resolveVocabularyAnswerText,
  resolveWebPresentation
} from "../../lesson-player/scripts/web-presentation.mjs";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(appRoot, "../..");
const dist = path.join(appRoot, "dist");
const password = process.env.SUNUM_SIFRE || "sunum";

const file = fs.readdirSync(dist).find((n) => /^data\.[0-9a-f]+\.bin$/.test(n));
assert.ok(file, "dist/data.*.bin yok");
const buf = fs.readFileSync(path.join(dist, file));
assert.equal(buf.subarray(0, 4).toString("ascii"), "SNM1");
const iterations = buf.readUInt32BE(4);
const salt = buf.subarray(8, 24);
const iv = buf.subarray(24, 36);
const body = buf.subarray(36, buf.length - 16);
const tag = buf.subarray(buf.length - 16);
const key = crypto.pbkdf2Sync(password, salt, iterations, 32, "sha256");
const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
decipher.setAuthTag(tag);
const catalog = JSON.parse(zlib.gunzipSync(Buffer.concat([decipher.update(body), decipher.final()])).toString("utf8"));

const canonical = JSON.parse(fs.readFileSync(path.join(repoRoot, "apps/lesson-player/src/generated/lessons.json"), "utf8"));
const formIndex = JSON.parse(fs.readFileSync(path.join(repoRoot, "data/grade-11/source/textbook-forms-index.json"), "utf8"));
const bookSource = canonical.flatMap((lesson) => lesson.steps).flatMap((step) => step.content?.sources || [])
  .find((source) => source.url.startsWith("https://tymm.meb.gov.tr/assets/pdf/") && source.url.includes("11sinif-ders-kitabi"));
const expectedForms = assessmentFormsForLessons(formIndex, canonical, bookSource.url.split("#")[0]);
for (const lesson of catalog.lessons) assert.deepEqual(lesson.forms, expectedForms.get(lesson.id), `${lesson.id} form kaynakları şifreli üretim kataloğunda korunmalı`);
const sourceThinking = collectThinkingRecords(path.join(repoRoot, "data/grade-11/presentation"), canonical);
const actualThinking = new Map();
const actualThinkingByTheme = new Map();

function collectPresentationText(value, out = []) {
  if (typeof value === "string") {
    out.push(value);
    return out;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectPresentationText(item, out);
    return out;
  }
  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      out.push(key);
      collectPresentationText(item, out);
    }
  }
  return out;
}


/* Tema 1 içerik/pedagoji koruma kontrolleri (2026-10-08). */
const theme1FlowRoot = path.join(repoRoot, "data/grade-11/presentation/theme-1");
const theme1AnswerRoot = path.join(repoRoot, "data/grade-11/source/teacher-book/theme-1/answer-bank");
const readTheme1Json = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const theme1Mektup = readTheme1Json(path.join(theme1FlowRoot, "mektup-flow.json")).steps;
const theme1Karagoz = readTheme1Json(path.join(theme1FlowRoot, "karagoz-flow.json")).steps;
const theme1Speaking = readTheme1Json(path.join(theme1FlowRoot, "konusma-flow.json")).steps;
const theme1Writing = readTheme1Json(path.join(theme1FlowRoot, "yazma-flow.json")).steps;
const theme1Get = (steps, id) => steps.find((step) => step.id === id);
assert.equal(theme1Get(theme1Mektup, "s46-q1").content.sections[0].body, "Yalınlık");
assert.ok(theme1Get(theme1Mektup, "s46-q1").content.lead.includes("Yalınlık"));
assert.ok(theme1Get(theme1Karagoz, "s17-process").content.items.join(" ").includes("göz gezdirin"));
assert.ok(theme1Get(theme1Karagoz, "s28-q1").content.lead.includes("söz varlığını"));
assert.ok(theme1Mektup.findIndex((step) => step.id === "s43-q1") < theme1Mektup.findIndex((step) => step.id === "s43-private-letter"));
assert.ok(theme1Mektup.findIndex((step) => step.id === "s43-q1") < theme1Mektup.findIndex((step) => step.id === "s43-literary-letter"));
assert.ok(theme1Get(theme1Mektup, "s46-q4").content.items.some((item) => item.includes("beğeni ölçütlerinizle")));
const theme1Vocab = readTheme1Json(path.join(theme1AnswerRoot, "part-02-pages-25-29.json")).entries;
assert.ok(theme1Vocab.find((e) => e.question_id === "T1-P25-Q02").answer_sections.Silsile.includes("soy / sülale"));
const theme1Bottle = readTheme1Json(path.join(theme1AnswerRoot, "part-11-pages-48-50.json")).entries.find((e) => e.question_id === "T1-P48-Q01");
assert.ok(theme1Bottle.answer_sections["Kitap haberinin doğrudan belirttikleri"]);
assert.ok(theme1Bottle.answer_sections["Bu etkinlikte benimsenen yorum"]);
for (const step of [theme1Get(theme1Speaking, "s59-rubric"), theme1Get(theme1Writing, "s78-rubric")]) {
  assert.match(step.content.lead, /QR|resmî/);
  assert.match(step.content.lead, /örnek/);
}
assert.ok(!JSON.stringify(theme1Get(theme1Writing, "s78-rubric")).includes("başarılır"));

const forbiddenPresentationMeta = [
  /öğrencinin[^\n]*(?:cevap|yanıt|görüş|kabul|tamamlam)/i,
  /öğrenci(?:ler)?[^\n]*(?:kabul edilir|kabul edilebilir|beklenir|tamamlamalıdır)/i,
  /öğretmen rehberi/i,
  /öğretmen değerlendirme rubriği/i,
  /kabul edilebilir alternatifler/i,
  /bu soru kişisel tercihe açıktır/i,
];
assert.equal(catalog.lessons.length, canonical.length, "ders sayısı");
let studentFacingThemeSteps = 0;
let otherThemeSupportLayers = 0;
let themeOneWebUnits = 0;
let themeOneEvidenceQuotes = 0;
const webThemes = new Set();
const webUnitCounts = new Map();
const webQuoteCounts = new Map();
const mappedSidecarOverrides = new Map();
const webSidecars = new Map([1, 2, 3, 4].map((themeNumber) => {
  const themeId = `TEMA_0${themeNumber}`;
  const file = path.join(repoRoot, `data/grade-11/presentation/theme-${themeNumber}/web-presentation.json`);
  const index = JSON.parse(fs.readFileSync(file, "utf8"));
  assert.equal(index.theme_id, themeId, `${themeId} web sidecar is scoped to its theme`);
  return [themeId, { index, overrideIds: new Set(Object.keys(index.answers)) }];
}));
for (const [i, lesson] of canonical.entries()) {
  const out = catalog.lessons[i];
  assert.equal(out.slug, lesson.lesson_slug);
  assert.equal(out.steps.length, lesson.steps.length, `${lesson.lesson_slug} adım sayısı`);
  for (const [j, step] of lesson.steps.entries()) {
    const s = out.steps[j];
    assert.equal(s.id, step.id);
    assert.equal(s.prompt, step.display_prompt);
    assert.ok(!s.reveals.includes("note"), "öğretmen notu sunuma sızmamalı");
    const thinkingKey = thinkingRecordKey(lesson.lesson_id, step.id);
    const expectedThinking = sourceThinking.records.get(thinkingKey);
    if (expectedThinking) {
      assert.equal(expectedThinking.themeId, lesson.theme_id, `${s.id} kaynak teması kanonik temayla eşleşmeli`);
      assert.equal(s.thinking, expectedThinking.text, `${lesson.lesson_id}/${s.id} Düşünürken metni kaynaktan aynen taşınmalı`);
      assert.ok(s.thinking.trim().length > 0, `${s.id} Düşünürken metni boş olmamalı`);
      assert.equal(s.reveals[0], "thinking", `${s.id} ilk öğrenci katmanı Düşünürken olmalı`);
      assert.ok(
        s.reveals.indexOf("thinking") < s.reveals.indexOf("answer"),
        `${s.id} Düşünürken katmanı cevap katmanından önce açılmalı`
      );
      assert.ok(
        s.answer?.answer || Object.keys(s.answer?.answer_sections ?? {}).length > 0,
        `${s.id} Düşünürken katmanından sonra cevap bulunmalı`
      );
      assert.ok(!actualThinking.has(thinkingKey), `${lesson.lesson_id}/${s.id} build çıktısında yinelenmemeli`);
      actualThinking.set(thinkingKey, s.thinking);
      actualThinkingByTheme.set(lesson.theme_id, (actualThinkingByTheme.get(lesson.theme_id) ?? 0) + 1);
    } else {
      assert.equal(s.thinking, undefined, `${lesson.lesson_id}/${s.id} kaynakta olmayan Düşünürken metni build'e eklenmemeli`);
      assert.ok(!s.reveals.includes("thinking"), `${lesson.lesson_id}/${s.id} kaynakta olmayan Düşünürken katmanı açılmamalı`);
    }
    if (step.id === "s17-q2" && lesson.lesson_slug === "karagoz") {
      assert.deepEqual(s.reveals, ["dictionary", "answer"]);
      assert.ok(s.answer.dictionary_terms.length > 0, "s.17/2 sözlük desteği bulunmalı");
      assert.equal(s.presentation.web.units.reduce((count, unit) => count + unit.quote_indexes.length, 0), 6,
        "ISSUE-105: six s.17/2 quotations are linked to their response units");
    }
    if (step.id === "s25-q1" && lesson.lesson_slug === "karagoz") {
      assert.deepEqual(Object.keys(s.answer.answer_sections), ["Dadı", "Esbab", "Murad", "Bendeniz", "Silsile", "İspir"]);
      assert.equal(s.prompt, "Bağlamdan hareketle altı çizili kelimelerin anlamlarını tahmin ediniz; ardından sözlükten kontrol ediniz.");
    }
    if (step.answer?.answer) assert.equal(s.answer.answer, step.answer.answer, `${s.id} cevap`);
    if (webSidecars.has(lesson.theme_id) && step.answer && step.layout === "vocabulary") {
      const sidecar = webSidecars.get(lesson.theme_id);
      const webAnswerText = s.presentation?.web_answer_text;
      const expectedAnswerText = resolveVocabularyAnswerText(step, step.answer, {
        webPresentation: sidecar.index
      });
      assert.deepEqual(webAnswerText, step.presentation?.web_answer_text,
        `${lesson.theme_id}/${s.id}: vocabulary text metadata reaches the encrypted catalog`);
      assert.deepEqual(webAnswerText, expectedAnswerText,
        `${lesson.theme_id}/${s.id}: vocabulary text metadata matches its sidecar`);
      if (sidecar.overrideIds.has(step.answer.question_id)) {
        if (!mappedSidecarOverrides.has(lesson.theme_id)) mappedSidecarOverrides.set(lesson.theme_id, new Set());
        mappedSidecarOverrides.get(lesson.theme_id).add(step.answer.question_id);
      }
      if (webAnswerText) webThemes.add(lesson.theme_id);
    }
    if (webSidecars.has(lesson.theme_id) && step.answer && step.layout !== "vocabulary") {
      const web = s.presentation?.web;
      assert.ok(web, `${lesson.theme_id}/${s.id}: web response units reach the encrypted site catalog`);
      assert.deepEqual(web, step.presentation?.web,
        `${lesson.theme_id}/${s.id}: encrypted web metadata matches the canonical production catalog`);
      const expectedWeb = resolveWebPresentation(step, step.answer, {
        webPresentation: webSidecars.get(lesson.theme_id).index
      });
      assert.deepEqual(web, expectedWeb,
        `${lesson.theme_id}/${s.id}: production catalog contains its normalized sidecar settings`);
      assert.ok(!s.reveals.includes("evidence"), `${s.id}: linked evidence stays inside the answer sequence`);
      webThemes.add(lesson.theme_id);
      webUnitCounts.set(lesson.theme_id, (webUnitCounts.get(lesson.theme_id) ?? 0) + web.units.length);
      webQuoteCounts.set(lesson.theme_id, (webQuoteCounts.get(lesson.theme_id) ?? 0) + (step.answer.evidence_quotes?.length ?? 0));
      const quotePairs = web.units.flatMap((unit) => unit.quote_indexes.map((index) => `${index}\u0000${unit.id}`));
      assert.equal(new Set(quotePairs).size, quotePairs.length,
        `${lesson.theme_id}/${s.id}: a quote-to-unit pair is not duplicated`);
      const linkedQuoteIndexes = new Set(web.units.flatMap((unit) => unit.quote_indexes));
      assert.deepEqual([...linkedQuoteIndexes].sort((a, b) => a - b),
        (step.answer.evidence_quotes ?? []).map((_, index) => index),
        `${lesson.theme_id}/${s.id}: every source quote reaches at least one response unit`);
      for (const unit of web.units) {
        const linked = new Set(unit.quote_indexes);
        for (const index of unit.inline_quote_indexes ?? []) {
          assert.ok(linked.has(index), `${lesson.theme_id}/${s.id}: inline evidence was linked to its unit`);
        }
        for (const section of unit.evidence_sections ?? []) {
          assert.ok(!unit.section_keys.includes(section.section_key),
            `${lesson.theme_id}/${s.id}: evidence section does not also appear as a response section`);
        }
      }
      const overrideIds = webSidecars.get(lesson.theme_id).overrideIds;
      if (overrideIds.has(step.answer.question_id)) {
        if (!mappedSidecarOverrides.has(lesson.theme_id)) mappedSidecarOverrides.set(lesson.theme_id, new Set());
        mappedSidecarOverrides.get(lesson.theme_id).add(step.answer.question_id);
      }
      if (lesson.theme_id === "TEMA_01") {
        themeOneWebUnits += web.units.length;
        themeOneEvidenceQuotes += step.answer.evidence_quotes?.length ?? 0;
      }
      const sections = step.answer.answer_sections;
      if (sections && !Array.isArray(sections)) {
        const configured = web.units.flatMap((unit) => [
          ...unit.section_keys,
          ...(unit.evidence_sections ?? []).map((entry) => entry.section_key)
        ]);
        assert.equal(new Set(configured).size, Object.keys(sections).length, `${s.id}: each structured response or evidence section appears once`);
        assert.deepEqual([...configured].sort(), Object.keys(sections).sort(), `${s.id}: no structured response is missing`);
        if (web.answer_text.mode === "include" && web.units.length > 1) {
          assert.ok(web.answer_text.fragments?.length, `${s.id}: multi-unit summaries include only explicit excerpts`);
          assert.ok(web.answer_text.fragments.every((fragment) => fragment.text !== step.answer.answer),
            `${s.id}: the complete summary is not copied into an early unit`);
        }
      }
    }
    if (lesson.theme_id === "TEMA_01" || lesson.theme_id === "TEMA_02") {
      studentFacingThemeSteps += 1;
      assert.ok(!s.reveals.includes("guidance"), `${s.id} öğretmen yönlendirmesi sunuma sızmamalı`);
      assert.ok(!s.reveals.includes("explanation"), `${s.id} öğretmen açıklaması sunuma sızmamalı`);
      assert.equal(s.answer?.guidance, undefined, `${s.id} öğretmen yönlendirmesi veriden çıkarılmalı`);
      assert.equal(s.answer?.explanation, undefined, `${s.id} öğretmen açıklaması veriden çıkarılmalı`);

      const presentationAnswerText = collectPresentationText({
        answer: s.answer?.answer,
        answer_sections: s.answer?.answer_sections,
      }).join("\n");
      for (const pattern of forbiddenPresentationMeta) {
        assert.ok(
          !pattern.test(presentationAnswerText),
          `${s.id} cevap alanında sunuma uygun olmayan öğretmen/değerlendirme dili var: ${pattern}`
        );
      }
    } else if (s.answer?.guidance || s.answer?.explanation) {
      otherThemeSupportLayers += 1;
    }
  }
}
assert.deepEqual([...webThemes].sort(), [...webSidecars.keys()].sort(),
  "all four theme sidecars contribute settings to the encrypted production catalog");
for (const [themeId, overrideIds] of webSidecars) {
  assert.deepEqual([...(mappedSidecarOverrides.get(themeId) ?? new Set())].sort(), [...overrideIds.overrideIds].sort(),
    `${themeId}: each sidecar override resolves to an answer used by a production lesson`);
  console.log(`[sunum-web] ${themeId}: ${webUnitCounts.get(themeId)} answer units and ${webQuoteCounts.get(themeId)} evidence quotes reached encrypted catalog.`);
}
assert.ok(studentFacingThemeSteps > 0, "TEMA_01 ve TEMA_02 sunum adımları kapsanmalı");
assert.ok(otherThemeSupportLayers > 0, "Diğer temaların mevcut destek katmanları korunmalı");
assert.ok(!JSON.stringify(catalog).includes('"note"'), "note alanı sunum verisinde olmamalı");
assert.equal(themeOneWebUnits, 495, "Theme 1 structured answers are revealed as individual response units");
assert.equal(themeOneEvidenceQuotes, 187, "Theme 1 evidence quotations are all linked to response units");

assert.deepEqual(
  [...actualThinking.keys()].sort(),
  [...sourceThinking.records.keys()].sort(),
  "Kaynakta bulunan her Düşünürken kaydı yalnız doğru kanonik sunum adımına taşınmalı"
);
for (const [themeId, stats] of sourceThinking.stats) {
  assert.equal(
    actualThinkingByTheme.get(themeId) ?? 0,
    stats.flowSteps,
    `${themeId} kaynak akış adımı sayısı build çıktısıyla eşleşmeli`
  );
  if (stats.flowSteps) {
    const [key, sample] = [...sourceThinking.records].find(([, record]) => record.themeId === themeId);
    assert.equal(actualThinking.get(key), sample.text, `${themeId} örnek kayıt build'de bulunmalı`);
    console.log(
      `[sunum-web] ${themeId}: ${stats.sourceRecordIds.size} kaynak kayıt / ${stats.flowSteps} akış adımı → ${actualThinkingByTheme.get(themeId)} build katmanı (${sample.answerId ?? sample.stepId}).`
    );
  }
}

const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sunum-thinking-data-"));
const fixtureLessons = ["T11-T01-TEST", "T11-T02-TEST"].map((lessonId, index) => ({
  lesson_id: lessonId,
  theme_id: `TEMA_0${index + 1}`,
  steps: [{ id: "s88-q1", source: { source_record_id: `T0${index + 1}-SOURCE-1` }, answer: { answer: "Test yanıtı" } }]
}));
const writeFixture = (themeNumber, filename, lessonId, sourceRecordId, thinking) => {
  const directory = path.join(fixtureRoot, `theme-${themeNumber}`);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, filename), JSON.stringify({
    lesson_id: lessonId,
    theme_id: `TEMA_0${themeNumber}`,
    steps: [{ id: "s88-q1", source_record_id: sourceRecordId, answer_id: `T${themeNumber}-P88-Q01`, thinking }]
  }));
};

try {
  writeFixture(1, "one-flow.json", fixtureLessons[0].lesson_id, "T01-SOURCE-1", "Tema bir ipucu.");
  writeFixture(2, "two-flow.json", fixtureLessons[1].lesson_id, "T02-SOURCE-1", "Tema iki ipucu.");
  const scopedFixture = collectThinkingRecords(fixtureRoot, fixtureLessons);
  assert.equal(scopedFixture.records.size, 2, "Aynı yerel step.id farklı temalarda ayrı eşleşmeli");
  assert.notEqual(
    thinkingRecordKey(fixtureLessons[0].lesson_id, "s88-q1"),
    thinkingRecordKey(fixtureLessons[1].lesson_id, "s88-q1"),
    "Eşleştirme anahtarı lesson_id kapsamını içermeli"
  );

  writeFixture(1, "one-flow.json", fixtureLessons[0].lesson_id, "T01-SOURCE-1", "   ");
  assert.throws(
    () => collectThinkingRecords(fixtureRoot, fixtureLessons),
    /boş veya geçersiz/,
    "Boş thinking reddedilmeli"
  );
  writeFixture(1, "one-flow.json", fixtureLessons[0].lesson_id, "T01-SOURCE-1", "Tema bir ipucu.");
  writeFixture(1, "duplicate-flow.json", fixtureLessons[0].lesson_id, "T01-SOURCE-1", "Tema bir ipucu.");
  assert.throws(
    () => collectThinkingRecords(fixtureRoot, fixtureLessons),
    /Tekrarlanan Düşünürken eşleştirmesi/,
    "Aynı lesson/step kaydı sessizce üzerine yazılmamalı"
  );
} finally {
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
}

console.log(`[sunum-web] Veri testi geçti: ${catalog.lessons.length} ders, ${actualThinking.size} thinking adımı kaynakla eşleşti.`);
