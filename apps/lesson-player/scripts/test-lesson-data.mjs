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

const s52q1 = mektupById.get("s52-q1");
assert(s52q1, "s52 Dilekçe yazma adımı eksik.");
assert(
  s52q1.answer?.entry_type === "performance_support",
  "s52 Dilekçe yazma performans desteği olarak korunmalı."
);

const speaking = byLessonId.get("T11-T01-KONUSMA");
assert(speaking, "Konuşma dersi catalog içinde bulunamadı.");
assert(speaking.lesson_slug === "konusma", "Konuşma lesson_slug doğru olmalı.");
assert(speaking.coverage.steps === 13, "Konuşma dersi 13 adım olmalı.");
assert(
  speaking.coverage.source_records === 7,
  "Konuşma dersi 7 doğrulanmış source-index kaydını kapsamalı."
);
assert(
  speaking.coverage.answer_entries === 9,
  "Konuşma dersi 9 answer-bank kaydını kapsamalı."
);

const speakingById = new Map(speaking.steps.map((step) => [step.id, step]));

const s53q1 = speakingById.get("s53-q1");
assert(s53q1, "Konuşma s53-q1 bulunamadı.");
assert(
  s53q1.answer?.entry_type === "source_limited",
  "Video bağımlı s53-q1 source_limited kalmalı."
);
assert(
  s53q1.display_prompt_mode === "VERBATIM_SHORT",
  "s53-q1 kitap soru metniyle gösterilmeli."
);

const s54Plan = speakingById.get("s54-plan");
assert(s54Plan, "Konuşma s54 planlama adımı eksik.");
assert(
  s54Plan.answer?.entry_type === "performance_support",
  "s54 planlama performans desteğine bağlı olmalı."
);
assert(
  s54Plan.content?.items?.length === 6,
  "s54 planlama altı zorunlu hazırlık adımını taşımalı."
);

const s57Performance1 = speakingById.get("s57-performance-1");
const s57Performance2 = speakingById.get("s57-performance-2");
assert(s57Performance1 && s57Performance2, "Konuşma s57 iki ekranı da bulunmalı.");
assert(
  (s57Performance1.content?.items?.length ?? 0) +
    (s57Performance2.content?.items?.length ?? 0) === 14,
  "s57 canlı canlandırma 14 uygulama ölçütünü iki ekranda korumalı."
);
assert(
  s57Performance2.answer?.question_id === "T1-P57-PERF01",
  "s57 performans desteği ikinci uygulama ekranında erişilebilir olmalı."
);

const s58Assessment1 = speakingById.get("s58-self-assessment-1");
const s58Assessment2 = speakingById.get("s58-self-assessment-2");
assert(
  s58Assessment1 && s58Assessment2,
  "Konuşma s58 öz değerlendirme iki ekranı da bulunmalı."
);
assert(
  (s58Assessment1.content?.items?.length ?? 0) +
    (s58Assessment2.content?.items?.length ?? 0) === 10,
  "s58 öz değerlendirme 10 görünür ölçütü iki ekranda korumalı."
);

const s58Feedback = speakingById.get("s58-feedback");
assert(s58Feedback, "Konuşma s58 geri bildirim adımı eksik.");
assert(
  s58Feedback.source.source_record_id === "T01-S0063",
  "s58 geri bildirim dış QR sınırını doğru source kaydıyla korumalı."
);
assert(
  JSON.stringify(s58Feedback.reveal_order) === JSON.stringify(["note"]),
  "s58 QR kaynak sınırı öğretmen notu reveal'i olarak erişilebilir olmalı."
);

console.log(
  `Lesson data assertions passed: ${lessons.length} lessons, ` +
  `${lessons.reduce((sum, lesson) => sum + lesson.coverage.steps, 0)} total steps.`
);
