import assert from "node:assert/strict";
import { planExportSlides } from "../src/export/plan.js";

// This deliberately small synthetic fixture keeps the export-planner contract
// independent from lesson wording, IDs, and the current catalog's reveal order.
const step = {
  id: "fixture-step",
  layout: "comparison",
  reveal_order: ["guidance", "answer", "evidence", "explanation", "note"],
  source: { printed_page_range: "10–11" },
  answer: {
    answer: "A sample answer.",
    guidance: "Teacher guidance.",
    evidence_quotes: ["An evidence sample."],
    explanation: "Teacher explanation."
  },
  content: { note: "Teacher-only note." }
};
const lesson = {
  lesson_id: "FIXTURE-LESSON",
  lesson_slug: "fixture-lesson",
  title: "Export planner fixture",
  theme_id: "FIXTURE-THEME",
  steps: [step]
};
const baseConfiguration = {
  scope: "selected-steps",
  currentLessonId: lesson.lesson_id,
  currentStepId: step.id,
  selectedStepIds: [step.id],
  revealMode: "stages",
  quality: "high"
};

const teacherSlides = planExportSlides([lesson], {
  ...baseConfiguration,
  view: "teacher"
});
assert.deepEqual(
  teacherSlides.map((slide) => slide.revealStage),
  [
    [],
    ["guidance"],
    ["guidance", "answer"],
    ["guidance", "answer", "evidence"],
    ["guidance", "answer", "evidence", "explanation"],
    ["guidance", "answer", "evidence", "explanation", "note"]
  ],
  "teacher export emits initial and cumulative stages for available reveal content"
);
assert.deepEqual(
  teacherSlides.map(({ lessonId, stepId, printedPage }) => [lessonId, stepId, printedPage]),
  Array.from({ length: teacherSlides.length }, () => [lesson.lesson_id, step.id, "10–11"])
);

const studentSlides = planExportSlides([lesson], {
  ...baseConfiguration,
  view: "student"
});
assert.deepEqual(
  studentSlides.map((slide) => slide.revealStage),
  [[], ["answer"], ["answer", "evidence"]],
  "student export omits teacher-only reveal stages"
);
assert.equal("guidance" in studentSlides.at(-1).step.answer, false);
assert.equal("explanation" in studentSlides.at(-1).step.answer, false);
assert.equal("note" in studentSlides.at(-1).step.content, false);

const finalStudent = planExportSlides([lesson], {
  ...baseConfiguration,
  view: "student",
  revealMode: "final"
});
assert.equal(finalStudent.length, 1, "final state creates one slide per selected step");
assert.deepEqual(finalStudent[0].revealStage, ["answer", "evidence"]);

const secondLesson = {
  ...lesson,
  lesson_id: "FIXTURE-SECOND-LESSON",
  lesson_slug: "fixture-second-lesson",
  title: "Second fixture lesson",
  steps: [{ ...step, id: "fixture-second-step" }]
};
const themeSlides = planExportSlides([lesson, secondLesson], {
  ...baseConfiguration,
  scope: "theme",
  selectedStepIds: [],
  view: "student",
  revealMode: "final"
});
assert.deepEqual(themeSlides.map((slide) => slide.lessonId), [lesson.lesson_id, secondLesson.lesson_id]);
assert.deepEqual(themeSlides.map((slide) => slide.slideNumber), [1, 2]);

const emptySelection = planExportSlides([lesson], {
  ...baseConfiguration,
  selectedStepIds: []
});
assert.equal(emptySelection.length, 0, "empty selected-step scope stays empty");

console.log("PPTX export planner checks passed (synthetic reveal, privacy, theme and selection contracts).");
