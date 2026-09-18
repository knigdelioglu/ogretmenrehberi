import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.resolve(here, "../src/generated/lessons.json");
const lessons = JSON.parse(fs.readFileSync(dataPath, "utf8"));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(Array.isArray(lessons), "Lesson catalog bir dizi olmalı.");
assert(lessons.length >= 3, "Lesson catalog en az üç ders içermeli.");

const byLessonId = new Map(lessons.map((lesson) => [lesson.lesson_id, lesson]));
assert(
  byLessonId.size === lessons.length,
  "Lesson catalog içinde yinelenen lesson_id olmamalı."
);
assert(
  new Set(lessons.map((lesson) => lesson.lesson_slug)).size === lessons.length,
  "Lesson catalog içinde yinelenen lesson_slug olmamalı."
);

const karagoz = byLessonId.get("T11-T01-KARAGOZ");
assert(karagoz, "Karagöz dersi catalog içinde bulunamadı.");
assert(karagoz.coverage.steps === 49, "Karagöz pilotu 49 adım olmalı.");
assert(
  karagoz.coverage.source_records === 17,
  "Karagöz pilotu 17 source-index kaydını kapsamalı."
);
assert(
  karagoz.coverage.answer_entries === 39,
  "Karagöz pilotu 39 answer-bank kaydını kapsamalı."
);

const karagozById = new Map(karagoz.steps.map((step) => [step.id, step]));

const s15q2 = karagozById.get("s15-q2");
assert(s15q2, "s15-q2 bulunamadı.");
assert(
  s15q2.display_prompt ===
    "Günlük hayatın tiyatroya nasıl yansıdığını düşünüyorsunuz? Görüşlerinizi açıklayınız.",
  "s15-q2 doğrulanmış soru metnini göstermeli."
);
assert(
  s15q2.display_prompt_mode === "VERBATIM_SHORT",
  "s15-q2 kısa doğrulanmış soru olarak işaretlenmeli."
);

const s28q1 = karagozById.get("s28-q1");
assert(s28q1, "s28-q1 bulunamadı.");
assert(
  s28q1.display_prompt.includes("sosyal statülerine ve eğitim durumlarına"),
  "Tekil doğrulanmış kaynak sorusu ekrana taşınmalı."
);
assert(
  s28q1.display_prompt_mode === "VERBATIM_SHORT",
  "s28-q1 verbatim kısa soru olarak işaretlenmeli."
);

const vocabulary = karagozById.get("s25-q1");
assert(vocabulary, "s25-q1 bulunamadı.");
for (const term of ["Dadı", "Esbab", "Murat", "Bendeniz", "Silsile", "İspir"]) {
  assert(
    vocabulary.answer.answer_sections?.[term],
    `Karagöz söz varlığı tanımı eksik: ${term}`
  );
}

const s15q4 = karagozById.get("s15-q4");
assert(s15q4, "s15-q4 bulunamadı.");
assert(
  JSON.stringify(s15q4.reveal_order) ===
    JSON.stringify(["guidance", "answer", "explanation"]),
  "s15-q4 reveal sırası guidance → answer → explanation olmalı."
);

const s27q1 = karagozById.get("s27-q1");
assert(s27q1, "s27-q1 bulunamadı.");
assert(
  JSON.stringify(s27q1.reveal_order) ===
    JSON.stringify(["answer", "evidence"]),
  "s27-q1 cevap ve kanıt katmanlarını sırayla taşımalı."
);

const s26 = karagozById.get("s26-reference");
assert(s26, "s26-reference bulunamadı.");
assert(
  JSON.stringify(s26.reveal_order) === JSON.stringify(["note"]),
  "s26 öğretmen notu reveal katmanı olarak korunmalı."
);

const karagozOrderedIds = karagoz.steps.map((step) => step.id);
assert(
  karagozOrderedIds.indexOf("s34-perf") < karagozOrderedIds.indexOf("s34-q9"),
  "s34 araştırma görevi değerlendirme sorusundan önce gelmeli."
);
assert(
  karagozOrderedIds.indexOf("s32-group-start") <
    karagozOrderedIds.indexOf("s32-q3"),
  "s32 grup hazırlığı yapı unsurları çözümünden önce gelmeli."
);
assert(
  karagozOrderedIds.indexOf("s32-q5") <
    karagozOrderedIds.indexOf("s32-share"),
  "s32 sonuç paylaşımı çözümleme sorularından sonra gelmeli."
);
assert(
  karagozOrderedIds.indexOf("s35-q3") <
    karagozOrderedIds.indexOf("s35-self-peer-review"),
  "s35 öz/akran değerlendirme içerik sorularından sonra gelmeli."
);

const conflictReference = karagozById.get("s32-conflict-reference");
assert(conflictReference, "s32 çatışma Bilgi Köşesi eksik.");
assert(
  conflictReference.layout === "reference",
  "Çatışma Bilgi Köşesi reference görünümünde olmalı."
);

const wordWall = karagozById.get("s25-word-wall");
assert(wordWall, "s25 kelime duvarı adımı eksik.");
assert(
  wordWall.density === "large",
  "Kelime duvarı adımı geniş görünüm kullanmalı."
);

const s30q1 = karagozById.get("s30-q1");
assert(
  s30q1?.answer?.question_no === "1",
  "Eksik question_no Q01'den türetilmeli."
);

const s35q1 = karagozById.get("s35-q1");
assert(
  s35q1?.density === "compact",
  "Yoğun s35-q1 projeksiyonda kompakt olmalı."
);

const s35q3 = karagozById.get("s35-q3");
assert(
  s35q3?.answer?.question_no === "3",
  "Eksik question_no Q03'ten türetilmeli."
);

const mektup = byLessonId.get("T11-T01-MEKTUP");
assert(mektup, "Mektup dersi catalog içinde bulunamadı.");
assert(mektup.lesson_slug === "mektup", "Mektup lesson_slug doğru olmalı.");
assert(mektup.coverage.steps === 43, "Mektup dersi 43 adım olmalı.");
assert(
  mektup.coverage.source_records === 36,
  "Mektup dersi 36 source-index kaydını kapsamalı."
);
assert(
  mektup.coverage.answer_entries === 39,
  "Mektup dersi 39 answer-bank kaydını kapsamalı."
);

const mektupById = new Map(mektup.steps.map((step) => [step.id, step]));
const mektupOrderedIds = mektup.steps.map((step) => step.id);

const s36q1 = mektupById.get("s36-q1");
assert(s36q1, "Mektup s36-q1 bulunamadı.");
assert(
  s36q1.display_prompt ===
    "Metinden hareketle “mektup” kelimesinin size neler ifade ettiğini hayatınızdan örnekler vererek açıklayınız.",
  "Mektup s36-q1 kitap soru metnini kullanmalı."
);
assert(
  s36q1.display_prompt_mode === "VERBATIM_SHORT",
  "Mektup s36-q1 kitap soru metni olarak işaretlenmeli."
);

const s37q1 = mektupById.get("s37-q1");
assert(s37q1, "Mektup s37-q1 bulunamadı.");
assert(
  s37q1.display_prompt_mode === "ANSWER_SUMMARY",
  "Paylaşılan s.37-38 source kaydında answer summary kullanılmalı."
);
assert(
  mektupOrderedIds.indexOf("s37-38-process") <
    mektupOrderedIds.indexOf("s37-q1"),
  "Mektup okuma süreci sorulardan önce gelmeli."
);

const mektupVocabulary = mektupById.get("s39-q1");
assert(mektupVocabulary, "Mektup s39-q1 söz varlığı adımı eksik.");
assert(
  mektupVocabulary.layout === "vocabulary",
  "Mektup s39-q1 vocabulary görünümünde olmalı."
);
assert(
  mektupVocabulary.density === "compact",
  "Mektup söz varlığı projeksiyonda kompakt olmalı."
);
for (const term of [
  "Umumiyetle",
  "Mücerretlik",
  "Tahlil",
  "Mamafih",
  "İdealizm",
  "Vaka"
]) {
  assert(
    mektupVocabulary.answer.answer_sections?.[term],
    `Mektup söz varlığı tanımı eksik: ${term}`
  );
}

const s42Reference = mektupById.get("s42-reference");
assert(s42Reference, "s42 mektup türleri referans adımı eksik.");
assert(
  s42Reference.answer === null && s42Reference.layout === "reference",
  "s42 referans adımı answer-bank cevabına bağlı olmamalı."
);

const s51Reference = mektupById.get("s51-reference");
assert(s51Reference, "s51 Dilekçe referans adımı eksik.");
assert(
  s51Reference.source.source_record_id === "T01-S0055",
  "s51 Dilekçe doğru source-index kaydına bağlı olmalı."
);

const konusma = byLessonId.get("T11-T01-KONUSMA");
assert(konusma, "Konuşma dersi catalog içinde bulunamadı.");
assert(konusma.lesson_slug === "konusma", "Konuşma lesson_slug doğru olmalı.");
assert(konusma.coverage.steps === 13, "Konuşma dersi 13 adım olmalı.");
assert(
  konusma.coverage.source_records === 6,
  "Konuşma dersi 6 source-index kaydını kapsamalı."
);
assert(
  konusma.coverage.answer_entries === 9,
  "Konuşma dersi 9 answer-bank kaydını kapsamalı."
);

const konusmaById = new Map(konusma.steps.map((step) => [step.id, step]));
const konusmaOrderedIds = konusma.steps.map((step) => step.id);

const k53q1 = konusmaById.get("s53-q1");
assert(k53q1, "Konuşma s53-q1 bulunamadı.");
assert(
  k53q1.answer?.entry_type === "source_limited",
  "QR videoya bağlı s53-q1 source_limited olarak korunmalı."
);
assert(
  k53q1.display_prompt_mode === "VERBATIM_SHORT",
  "s53-q1 doğrulanmış kitap sorusunu kullanmalı."
);

const k54Process = konusmaById.get("s54-process");
assert(k54Process, "Konuşma s54 planlama süreci eksik.");
assert(
  k54Process.layout === "process" && k54Process.answer === null,
  "s54 planlama adımı cevaba bağlı olmayan süreç ekranı olmalı."
);
assert(
  konusmaOrderedIds.indexOf("s54-process") <
    konusmaOrderedIds.indexOf("s54-perf"),
  "s54 planlama süreci örnek plandan önce gelmeli."
);

const k55Perf = konusmaById.get("s55-perf");
assert(k55Perf, "Konuşma s55 canlandırma metni desteği eksik.");
assert(
  k55Perf.answer?.entry_type === "performance_support",
  "s55 canlandırma metni performans desteği olmalı."
);

const k56q2 = konusmaById.get("s56-q2");
assert(k56q2, "Konuşma s56-q2 bulunamadı.");
assert(
  k56q2.layout === "structure" && k56q2.density === "compact",
  "s56 sınıflandırma ekranı kompakt yapı görünümünde olmalı."
);

const k57Rules = konusmaById.get("s57-rules");
assert(k57Rules, "Konuşma s57 uygulama kuralları eksik.");
assert(
  konusmaOrderedIds.indexOf("s57-rules") <
    konusmaOrderedIds.indexOf("s57-perf"),
  "s57 uygulama kuralları performans kontrolünden önce gelmeli."
);

const k58 = konusmaById.get("s58-assessment");
assert(k58, "Konuşma s58 öz/akran değerlendirme adımı eksik.");
assert(
  k58.source.source_record_id === "T01-S0062" &&
    k58.layout === "assessment",
  "s58 değerlendirme doğru kaynak ve layout ile bağlı olmalı."
);

const s52q1 = mektupById.get("s52-q1");
assert(s52q1, "s52 Dilekçe yazma adımı eksik.");
assert(
  s52q1.answer?.entry_type === "performance_support",
  "s52 Dilekçe yazma performans desteği olarak korunmalı."
);

console.log(
  `Lesson data assertions passed: ${lessons.length} lessons, ` +
  `${lessons.reduce((sum, lesson) => sum + lesson.coverage.steps, 0)} total steps.`
);
