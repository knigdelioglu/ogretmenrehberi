import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildExportedStep,
  studentVisibleRevealKeys
} from "../src/runtime-contracts.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "..");
const lessons = JSON.parse(
  fs.readFileSync(path.join(appRoot, "src/generated/lessons.json"), "utf8")
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const studentKeys = studentVisibleRevealKeys([
  "guidance",
  "answer",
  "evidence",
  "explanation",
  "note"
]);
assert(
  JSON.stringify(studentKeys) ===
    JSON.stringify(["guidance", "answer", "evidence", "explanation"]),
  "Student projection must strip the teacher-only note reveal."
);

let stepCount = 0;
let teacherNoteCount = 0;

for (const lesson of lessons) {
  for (const step of lesson.steps) {
    stepCount += 1;
    if (step.content?.note) teacherNoteCount += 1;

    const exported = buildExportedStep(step, step);
    assert(
      exported.prompt === step.display_prompt,
      `Export must preserve display prompt: ${lesson.lesson_id}/${step.id}`
    );
    assert(
      exported.prompt_mode === step.display_prompt_mode,
      `Export must preserve prompt provenance: ${lesson.lesson_id}/${step.id}`
    );
    assert(
      exported.source_record_id === step.source.source_record_id,
      `Export must preserve source linkage: ${lesson.lesson_id}/${step.id}`
    );
    assert(
      exported.answer_id === step.answer?.question_id,
      `Export must preserve answer linkage: ${lesson.lesson_id}/${step.id}`
    );
  }
}

assert(stepCount === 906, `Expected 906 Lesson Player steps, got ${stepCount}.`);
assert(
  teacherNoteCount === 83,
  `Expected 83 teacher-note steps for projection regression coverage, got ${teacherNoteCount}.`
);

const sample = lessons
  .flatMap((lesson) => lesson.steps)
  .find((step) => step.display_prompt_mode === "VERIFIED_SUMMARY");
assert(sample, "A VERIFIED_SUMMARY sample is required for export regression coverage.");

const editedPrompt = "Öğretmen tarafından düzenlenmiş ekran başlığı";
const edited = {
  ...sample,
  display_prompt: editedPrompt
};
const editedExport = buildExportedStep(sample, edited, {
  display_prompt: editedPrompt
});
assert(
  editedExport.prompt === editedPrompt &&
    editedExport.prompt_mode === "FLOW_OVERRIDE",
  "Edited prompts must export as FLOW_OVERRIDE without losing the edited text."
);

const appSource = fs.readFileSync(path.join(appRoot, "src/App.tsx"), "utf8");
const stepViewSource = fs.readFileSync(
  path.join(appRoot, "src/components/StepView.tsx"),
  "utf8"
);

assert(
  appSource.includes("revealed: studentVisibleRevealKeys(revealed)"),
  "Projection state must be sanitized before publishing."
);
assert(
  appSource.includes(
    "setRevealed(new Set(studentVisibleRevealKeys(state.revealed)))"
  ),
  "Student projection must sanitize incoming reveal state defensively."
);
assert(
  appSource.includes("showTeacherNotes={!displayOnly}"),
  "Student display must disable teacher-note rendering."
);
assert(
  stepViewSource.includes(
    'showTeacherNotes && content?.note && revealed.has("note")'
  ),
  "StepView must gate teacher-note rendering explicitly."
);

console.log(
  `Runtime contract assertions passed: ${stepCount} steps, ` +
    `${teacherNoteCount} teacher-note steps protected.`
);
