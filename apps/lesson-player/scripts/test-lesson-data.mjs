import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.resolve(here, "../src/generated/karagoz.json");
const lesson = JSON.parse(fs.readFileSync(dataPath, "utf8"));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(lesson.coverage.steps === 49, "Karagöz pilotu 49 adım olmalı.");
assert(
  lesson.coverage.source_records === 17,
  "Karagöz pilotu 17 source-index kaydını kapsamalı."
);
assert(
  lesson.coverage.answer_entries === 39,
  "Karagöz pilotu 39 answer-bank kaydını kapsamalı."
);

const byId = new Map(lesson.steps.map((step) => [step.id, step]));

const s15q2 = byId.get("s15-q2");
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

const s28q1 = byId.get("s28-q1");
assert(s28q1, "s28-q1 bulunamadı.");
assert(
  s28q1.display_prompt.includes("sosyal statülerine ve eğitim durumlarına"),
  "Tekil doğrulanmış kaynak sorusu ekrana taşınmalı."
);
assert(
  s28q1.display_prompt_mode === "VERBATIM_SHORT",
  "s28-q1 verbatim kısa soru olarak işaretlenmeli."
);

const vocabulary = byId.get("s25-q1");
assert(vocabulary, "s25-q1 bulunamadı.");
for (const term of ["Dadı", "Esbab", "Murat", "Bendeniz", "Silsile", "İspir"]) {
  assert(
    vocabulary.answer.answer_sections?.[term],
    `Söz varlığı tanımı eksik: ${term}`
  );
}

const s15q4 = byId.get("s15-q4");
assert(s15q4, "s15-q4 bulunamadı.");
assert(
  JSON.stringify(s15q4.reveal_order) ===
    JSON.stringify(["guidance", "answer", "explanation"]),
  "s15-q4 reveal sırası guidance → answer → explanation olmalı."
);

const s27q1 = byId.get("s27-q1");
assert(s27q1, "s27-q1 bulunamadı.");
assert(
  JSON.stringify(s27q1.reveal_order) ===
    JSON.stringify(["answer", "evidence"]),
  "s27-q1 cevap ve kanıt katmanlarını sırayla taşımalı."
);

const s26 = byId.get("s26-reference");
assert(s26, "s26-reference bulunamadı.");
assert(
  JSON.stringify(s26.reveal_order) === JSON.stringify(["note"]),
  "s26 öğretmen notu reveal katmanı olarak korunmalı."
);

const orderedIds = lesson.steps.map((step) => step.id);
assert(
  orderedIds.indexOf("s34-perf") < orderedIds.indexOf("s34-q9"),
  "s34 araştırma görevi değerlendirme sorusundan önce gelmeli."
);
assert(
  orderedIds.indexOf("s32-group-start") < orderedIds.indexOf("s32-q3"),
  "s32 grup hazırlığı yapı unsurları çözümünden önce gelmeli."
);
assert(
  orderedIds.indexOf("s32-q5") < orderedIds.indexOf("s32-share"),
  "s32 sonuç paylaşımı çözümleme sorularından sonra gelmeli."
);
assert(
  orderedIds.indexOf("s35-q3") < orderedIds.indexOf("s35-self-peer-review"),
  "s35 öz/akran değerlendirme içerik sorularından sonra gelmeli."
);

const conflictReference = byId.get("s32-conflict-reference");
assert(conflictReference, "s32 çatışma Bilgi Köşesi eksik.");
assert(
  conflictReference.layout === "reference",
  "Çatışma Bilgi Köşesi reference görünümünde olmalı."
);

const wordWall = byId.get("s25-word-wall");
assert(wordWall, "s25 kelime duvarı adımı eksik.");
assert(wordWall.density === "large", "Kelime duvarı adımı geniş görünüm kullanmalı.");

const s30q1 = byId.get("s30-q1");
assert(s30q1?.answer?.question_no === "1", "Eksik question_no Q01'den türetilmeli.");

const s35q1 = byId.get("s35-q1");
assert(s35q1?.density === "compact", "Yoğun s35-q1 projeksiyonda kompakt olmalı.");

const s35q3 = byId.get("s35-q3");
assert(s35q3?.answer?.question_no === "3", "Eksik question_no Q03'ten türetilmeli.");

console.log("Lesson data assertions passed.");
