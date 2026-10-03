// dist/ içindeki şifreli veriyi çözüp kanonik ders kataloğuyla karşılaştırır.
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { collectThinkingRecords, thinkingRecordKey } from "./thinking-data.mjs";

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
      assert.deepEqual(s.reveals, ["dictionary", "answer", "evidence"]);
      assert.ok(s.answer.dictionary_terms.length > 0, "s.17/2 sözlük desteği bulunmalı");
    }
    if (step.id === "s25-q1" && lesson.lesson_slug === "karagoz") {
      assert.deepEqual(Object.keys(s.answer.answer_sections), ["Dadı", "Esbab", "Murad", "Bendeniz", "Silsile", "İspir"]);
      assert.equal(s.prompt, "Bağlamdan hareketle altı çizili kelimelerin anlamlarını tahmin ediniz; ardından sözlükten kontrol ediniz.");
    }
    if (step.answer?.answer) assert.equal(s.answer.answer, step.answer.answer, `${s.id} cevap`);
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
assert.ok(studentFacingThemeSteps > 0, "TEMA_01 ve TEMA_02 sunum adımları kapsanmalı");
assert.ok(otherThemeSupportLayers > 0, "Diğer temaların mevcut destek katmanları korunmalı");
assert.ok(!JSON.stringify(catalog).includes('"note"'), "note alanı sunum verisinde olmamalı");

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
