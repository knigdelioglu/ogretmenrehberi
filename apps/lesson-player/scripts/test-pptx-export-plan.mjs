import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { planExportSlides } from "../src/export/plan.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lessons = JSON.parse(
  fs.readFileSync(path.join(root, "src/generated/lessons.json"), "utf8")
);
const lesson = lessons.find((item) => item.lesson_id === "T11-T01-KARAGOZ");
const step = lesson.steps.find((item) => item.id === "s28-q1");

assert.ok(step, "real Karagöz lesson fixture exists");
assert.equal(step.layout, "comparison", "fixture exercises comparison rendering");
assert.deepEqual(step.reveal_order, ["guidance", "answer", "evidence", "explanation", "note"]);
assert.ok(step.answer.answer_sections, "fixture has structured answer sections");
assert.ok(step.content.note, "fixture has a teacher note");

const exportLesson = { ...lesson, steps: [step] };
const baseConfiguration = {
  scope: "selected-steps",
  currentLessonId: lesson.lesson_id,
  currentStepId: step.id,
  selectedStepIds: [step.id],
  revealMode: "stages",
  quality: "high"
};

const teacherSlides = planExportSlides([exportLesson], {
  ...baseConfiguration,
  view: "teacher"
});
assert.equal(teacherSlides.length, 6, "teacher gets initial plus five cumulative reveal slides");
assert.deepEqual(
  teacherSlides.map((slide) => slide.revealStage),
  [
    [],
    ["guidance"],
    ["guidance", "answer"],
    ["guidance", "answer", "evidence"],
    ["guidance", "answer", "evidence", "explanation"],
    ["guidance", "answer", "evidence", "explanation", "note"]
  ]
);
assert.deepEqual(
  teacherSlides.map(({ lessonId, stepId, printedPage }) => [lessonId, stepId, printedPage]),
  Array.from({ length: 6 }, () => [lesson.lesson_id, step.id, "28"])
);

const studentSlides = planExportSlides([exportLesson], {
  ...baseConfiguration,
  view: "student"
});
assert.equal(studentSlides.length, 3, "student reveal plan omits teacher-only stages");
assert.deepEqual(studentSlides.map((slide) => slide.revealStage), [[], ["answer"], ["answer", "evidence"]]);
assert.equal("guidance" in studentSlides.at(-1).step.answer, false);
assert.equal("explanation" in studentSlides.at(-1).step.answer, false);
assert.equal("note" in studentSlides.at(-1).step.content, false);

const finalStudent = planExportSlides([exportLesson], {
  ...baseConfiguration,
  view: "student",
  revealMode: "final"
});
assert.equal(finalStudent.length, 1, "final state creates one slide per selected step");
assert.deepEqual(finalStudent[0].revealStage, ["answer", "evidence"]);

const secondLesson = {
  ...lesson,
  lesson_id: "T11-T01-SECOND",
  lesson_slug: "second-lesson",
  title: "İkinci ders",
  steps: [{ ...step, id: "other-step" }]
};
const themeSlides = planExportSlides([exportLesson, secondLesson], {
  ...baseConfiguration,
  scope: "theme",
  selectedStepIds: [],
  view: "student",
  revealMode: "final"
});
assert.deepEqual(themeSlides.map((slide) => slide.lessonId), [lesson.lesson_id, secondLesson.lesson_id]);
assert.deepEqual(themeSlides.map((slide) => slide.slideNumber), [1, 2]);

const emptySelection = planExportSlides([exportLesson], {
  ...baseConfiguration,
  selectedStepIds: []
});
assert.equal(emptySelection.length, 0, "empty selected-step scope stays empty");

console.log("PPTX export planner checks passed (real comparison lesson, reveal sequence, privacy redaction, theme and selection scopes).");
