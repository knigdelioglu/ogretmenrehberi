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
assert(
  teacherBookManifest.totals.answer_bank_entries === manifestAnswerTotal &&
    teacherBookManifest.totals.source_records === manifestSourceTotal,
  "Teacher-book manifest Tema 1-4 toplamları tema sayaçlarıyla eşleşmeli."
);


const theme1Lessons = lessons.filter((lesson) => lesson.theme_id === "TEMA_01");
const theme2Lessons = lessons.filter((lesson) => lesson.theme_id === "TEMA_02");
const theme3Lessons = lessons.filter((lesson) => lesson.theme_id === "TEMA_03");
const theme4Lessons = lessons.filter((lesson) => lesson.theme_id === "TEMA_04");

for (const [themeNumber, themeLessons] of [theme1Lessons, theme2Lessons, theme3Lessons, theme4Lessons].entries()) {
  const flowRoot = path.join(repoRoot, `data/grade-11/presentation/theme-${themeNumber + 1}`);
  const flowCount = fs.readdirSync(flowRoot).filter((name) => name.endsWith("-flow.json")).length;
  assert(themeLessons.length === flowCount,
    `TEMA_0${themeNumber + 1} generated lesson count must match its canonical flow files.`);
}

const byLessonId = new Map(lessons.map((lesson) => [lesson.lesson_id, lesson]));
assert(
  byLessonId.size === lessons.length,
  "Lesson catalog içinde yinelenen lesson_id olmamalı."
);
assert(
  new Set(lessons.map((lesson) => lesson.lesson_slug)).size === lessons.length,
  "Lesson catalog içinde yinelenen lesson_slug olmamalı."
);


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
