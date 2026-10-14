import { checkTheme1 } from "./lesson-data/theme-1.mjs";
import { checkTheme2 } from "./lesson-data/theme-2.mjs";
import { checkTheme3 } from "./lesson-data/theme-3.mjs";
import { checkTheme4 } from "./lesson-data/theme-4.mjs";

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

const repoRoot = path.resolve(here, "../../..");
const teacherBookRoot = path.join(repoRoot, "data/grade-11/source/teacher-book");
const teacherBookManifest = JSON.parse(
  fs.readFileSync(path.join(teacherBookRoot, "manifest.json"), "utf8")
);
let manifestAnswerTotal = 0;
let manifestSourceTotal = 0;
for (const themeNo of [1, 2, 3, 4]) {
  const themeId = `TEMA_0${themeNo}`;
  const manifestTheme = teacherBookManifest.themes.find(
    (theme) => theme.theme_id === themeId
  );
  const themeRoot = path.join(teacherBookRoot, `theme-${themeNo}`);
  const answerIndex = JSON.parse(
    fs.readFileSync(path.join(themeRoot, "answer-bank.json"), "utf8")
  );
  const sourceIndex = JSON.parse(
    fs.readFileSync(path.join(themeRoot, "source-index.json"), "utf8")
  );
  assert(manifestTheme, `Teacher-book manifest tema kaydı eksik: ${themeId}`);
  assert(
    manifestTheme.answer_bank_entries === answerIndex.coverage.entry_count,
    `Teacher-book manifest answer sayısı güncel değil: ${themeId}`
  );
  assert(
    manifestTheme.source_records === sourceIndex.counts.records,
    `Teacher-book manifest source sayısı güncel değil: ${themeId}`
  );
  assert(
    manifestTheme.source_limited_entries === answerIndex.coverage.source_limited_entries,
    `Teacher-book manifest source-limited sayısı güncel değil: ${themeId}`
  );
  manifestAnswerTotal += manifestTheme.answer_bank_entries;
  manifestSourceTotal += manifestTheme.source_records;
}
const theme3Index = JSON.parse(fs.readFileSync(
  path.join(teacherBookRoot, "theme-3/answer-bank.json"), "utf8"
));
const theme3Entries = theme3Index.parts.flatMap((part) => {
  const sourcePath = path.join(teacherBookRoot, "theme-3", part.path);
  return JSON.parse(fs.readFileSync(sourcePath, "utf8")).entries;
});
const theme3Types = theme3Entries.reduce((counts, entry) => {
  counts[entry.entry_type] = (counts[entry.entry_type] ?? 0) + 1;
  return counts;
}, {});
assert(theme3Entries.length === 220 &&
  theme3Types.question_answer === 81 &&
  theme3Types.performance_support === 114 &&
  theme3Types.source_limited === 25,
  "Tema 3 parça kayıtları güncel kanonik dağılımı ve source-limited sayısını vermeli.");
const theme3Compare = theme3Entries.find((entry) => entry.question_id === "T3-P177-COMP01");
assert(theme3Compare?.entry_type === "source_limited" &&
  theme3Compare.source_locator.includes("görsel olarak yeniden doğrulanmalı") &&
  theme3Compare.answer_sections?.Huzur?.İçerik &&
  theme3Compare.answer_sections?.["Mescid-i Aksa"]?.includes("doğrulanmadan") &&
  !theme3Compare.evidence_quotes,
  "T3-P177-COMP01 yalnız PDF’de görünen Huzur bilgisini içermeli; şiir metni ve dizeleri kaynak sınırlı olmalı.");
assert(
  teacherBookManifest.totals.answer_bank_entries === manifestAnswerTotal &&
    teacherBookManifest.totals.source_records === manifestSourceTotal,
  "Teacher-book manifest Tema 1-4 toplamları tema sayaçlarıyla eşleşmeli."
);


const theme1Lessons = lessons.filter((lesson) => lesson.theme_id === "TEMA_01");
const theme2Lessons = lessons.filter((lesson) => lesson.theme_id === "TEMA_02");
const theme3Lessons = lessons.filter((lesson) => lesson.theme_id === "TEMA_03");
const theme4Lessons = lessons.filter((lesson) => lesson.theme_id === "TEMA_04");

assert(
  theme1Lessons.length === 7,
  "1. Tema freeze kapsamı tam olarak yedi ders içermeli."
);
assert(
  theme2Lessons.length === 9,
  "Tema 2 üretiminde değerlendirme dâhil dokuz doğal blok bulunmalı."
);

assert(theme3Lessons.length === 18, "Tema 3 ölçme ve değerlendirme s.230–235 ile on sekiz doğal blok içermeli.");

const byLessonId = new Map(lessons.map((lesson) => [lesson.lesson_id, lesson]));
assert(
  byLessonId.size === lessons.length,
  "Lesson catalog içinde yinelenen lesson_id olmamalı."
);
assert(
  new Set(lessons.map((lesson) => lesson.lesson_slug)).size === lessons.length,
  "Lesson catalog içinde yinelenen lesson_slug olmamalı."
);


checkTheme1({ lessons, byLessonId, assert, theme1Lessons });
checkTheme2({ lessons, byLessonId, assert, theme2Lessons });
checkTheme3({ lessons, byLessonId, assert, theme3Lessons });
checkTheme4({ lessons, byLessonId, assert, theme4Lessons });

console.log(
  `Lesson data assertions passed: ${lessons.length} lessons, ` +
  `${lessons.reduce((sum, lesson) => sum + lesson.coverage.steps, 0)} total steps.`
);


const theme1PagesRoot = path.resolve(repoRoot, "data/book/grade-11/themes/theme-1/pages");
const readPage = (page) => JSON.parse(fs.readFileSync(path.join(theme1PagesRoot, `p${String(page).padStart(3, "0")}.json`), "utf8"));
const pageBlock = (page, id) => readPage(page).blocks.find((block) => block.id === id);
const theme1PageBlocks = Array.from({ length: 15 }, (_, index) => readPage(index + 59).blocks).flat();
const theme1BlockById = new Map(theme1PageBlocks.map((block) => [block.id, block]));
assert(theme1BlockById.size === theme1PageBlocks.length,
  "P59-P73 page block IDs must be unique.");
const blockReferenceTargets = {
  activity_ids: "activity", question_ids: "question", table_ids: "table",
  instruction_ids: "instruction", visual_ids: "visual", related_text_ids: null,
  related_question_ids: "question", related_instruction_ids: "instruction",
  related_activity_ids: "activity"
};
for (const source of theme1PageBlocks) {
  for (const [field, expectedType] of Object.entries(blockReferenceTargets)) {
    for (const id of source[field] ?? []) {
      const target = theme1BlockById.get(id);
      assert(target, `${source.id}.${field} must resolve to ${id}.`);
      if (expectedType) assert(target.type === expectedType,
        `${source.id}.${field} must reference a ${expectedType} block (${id}).`);
    }
  }
  for (const [field, expectedType] of [["activity_id", "activity"], ["instruction_id", "instruction"]]) {
    const id = source[field];
    if (id) assert(theme1BlockById.get(id)?.type === expectedType,
      `${source.id}.${field} must reference a ${expectedType} block (${id}).`);
  }
  if (source.continuation?.related_activity_ids) {
    for (const id of source.continuation.related_activity_ids) {
      assert(theme1BlockById.get(id)?.type === "activity",
        `${source.id}.continuation must reference an activity (${id}).`);
    }
  }
}
const p60Text = pageBlock(60, "G11-T1-P60-TEXT01");
assert(p60Text.text.includes("Orhan Seyfi Orhon, Maarif Vekili Hasan Âli Yücel’e Açık Mektup") &&
  p60Text.continuation.to_next_page === false,
  "P60 Orhan Seyfi Orhon künyesi tamamlanmalı ve metin gerçek sayfa sınırında bitmeli.");
assert(pageBlock(62, "G11-T1-P62-EX01").text.endsWith("Saygı ve selam ile..."),
  "P62 e-posta örneği basılı kapanış ifadesini içermeli.");
const p63q4 = pageBlock(63, "G11-T1-P63-Q04");
assert(!p63q4.text.includes("Ders Dışı Etkinlik") &&
  pageBlock(63, "G11-T1-P63-SH01")?.text === "Ders Dışı Etkinlik" &&
  pageBlock(63, "G11-T1-P63-ACT01").table_ids.includes("G11-T1-P63-TABLE01"),
  "P63 Q04 ve Ders Dışı Etkinlik blok sınırları ayrı ve tablo etkinliğe bağlı olmalı.");
const p66q4 = pageBlock(66, "G11-T1-P66-Q04");
const p66q5 = pageBlock(66, "G11-T1-P66-Q05");
assert(p66q4.table_ids?.includes("G11-T1-P66-TABLE01") &&
  pageBlock(66, "G11-T1-P66-TABLE01").related_question_ids.includes("G11-T1-P66-Q04") &&
  p66q5.table_ids?.includes("G11-T1-P66-TABLE02") &&
  pageBlock(66, "G11-T1-P66-TABLE02").related_question_ids.includes("G11-T1-P66-Q05"),
  "P66 konu/tema ve ana/yardımcı düşünce tabloları karşılıklı doğru sorulara bağlanmalı.");
const p65Answer = JSON.parse(fs.readFileSync(path.join(teacherBookRoot, "theme-1/answer-bank/part-15-pages-64-67.json"), "utf8"))
  .entries.find((entry) => entry.question_id === "T1-P65-Q01");
assert(Object.keys(p65Answer.answer_sections).length === 6 &&
  ["Tasavvur", "Nörolojik", "Sosyal", "Güdü", "Medeni"].every((term) => p65Answer.answer_sections[term]) &&
  p65Answer.answer_sections.Muhabbet.includes("eşleşmeyen"),
  "P65 altı sözcüğü korumalı; beş eşleşen anlam ve eşleşmeyen Muhabbet ayrı kalmalı.");
const p67 = readPage(67);
assert(!p67.blocks.some((block) => ["G11-T1-P67-SH01", "G11-T1-P67-SH02"].includes(block.id)) &&
  p67.blocks.find((block) => block.id === "G11-T1-P67-ACT01").continuation?.related_activity_ids?.includes("G11-T1-P66-ACT01"),
  "P67 basılı olmayan başlıkları taşımamalı ve P66 Metni Anlayalım etkinliğini sürdürmeli.");
const paydosIds = ["G11-T1-P68-DLG01", "G11-T1-P69-DLG01"];
for (const [page, id] of [[68, "G11-T1-P68-Q02"], [70, "G11-T1-P70-Q03"], [70, "G11-T1-P70-Q04"]]) {
  const refs = pageBlock(page, id).related_text_ids;
  assert(paydosIds.every((textId) => refs.includes(textId)), `${id} Paydos'un 68-69. sayfa metninin tamamına bağlanmalı.`);
}
assert(!readPage(68).blocks.some((block) => block.id === "G11-T1-P68-VIS01"),
  "P68'de kaynağa dayanmayan stüdyo görseli kaydı bulunmamalı.");
assert(pageBlock(71, "G11-T1-P71-Q02").related_activity_ids?.includes("G11-T1-P64-ACT01") &&
  !pageBlock(71, "G11-T1-P71-Q02").related_activity_ids.includes("G11-T1-P61-ACT01"),
  "P71 Q02 ilgili dinleme/izleme hazırlığına bağlanmalı, mektup etkinliğine değil.");
