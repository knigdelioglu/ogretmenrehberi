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
