import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.resolve(here, "../src/generated/karagoz.json");
const lesson = JSON.parse(fs.readFileSync(dataPath, "utf8"));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(lesson.coverage.steps === 43, "Karagöz pilotu 43 adım olmalı.");
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
  s15q2.display_prompt === "Günlük hayatın tiyatroya yansıması",
  "Paylaşılan source kaydında yanlış kaynak sorusu gösterilmemeli."
);
assert(
  s15q2.display_prompt_mode === "ANSWER_SUMMARY",
  "s15-q2 güvenli biçimde answer summary kullanmalı."
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

const s30q1 = byId.get("s30-q1");
assert(s30q1?.answer?.question_no === "1", "Eksik question_no Q01'den türetilmeli.");

const s35q3 = byId.get("s35-q3");
assert(s35q3?.answer?.question_no === "3", "Eksik question_no Q03'ten türetilmeli.");

console.log("Lesson data assertions passed.");
