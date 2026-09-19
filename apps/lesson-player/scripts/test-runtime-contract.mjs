import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildExportedStep,
  canonicalLessonSignature,
  overrideEnvelope,
  projectionLessonUrl,
  restoredStepIndex,
  restoreOverrideEnvelope,
  studentVisibleOverrides,
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
  teacherNoteCount === 88,
  `Expected 88 teacher-note steps for projection regression coverage, got ${teacherNoteCount}.`
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
    "setRevealed(new Set(studentVisibleRevealKeys(state.revealed ?? [])))"
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

const reorderedIds = ["first", "third", "second"];
assert(
  restoredStepIndex(reorderedIds, "second", "first", 0) === 2,
  "Deep link must resolve the step ID in the reordered presentation."
);
assert(
  restoredStepIndex(reorderedIds, "missing", "third", 0) === 1,
  "Saved step ID must restore progress when URL step is stale."
);
assert(
  restoredStepIndex(reorderedIds, null, null, 99) === 2,
  "Legacy numeric progress must be clamped to the current order."
);

const sampleLesson = lessons[0];
const signature = canonicalLessonSignature(sampleLesson);
const userEdits = { [sampleLesson.steps[0].id]: { density: "compact" } };
const currentEnvelope = JSON.stringify(overrideEnvelope(signature, userEdits));
assert(
  JSON.stringify(restoreOverrideEnvelope(
    currentEnvelope, signature, sampleLesson.steps.map((step) => step.id)
  ).overrides) === JSON.stringify(userEdits),
  "Edits must survive reload against the same canonical lesson."
);
const changedLesson = structuredClone(sampleLesson);
changedLesson.steps[0].display_prompt += " [new edition]";
const changedSignature = canonicalLessonSignature(changedLesson);
assert(changedSignature !== signature, "Canonical content changes must invalidate old edits.");
assert(
  restoreOverrideEnvelope(
    currentEnvelope, changedSignature, sampleLesson.steps.map((step) => step.id)
  ).needsBackup,
  "Stale overrides must be archived instead of silently masking new content."
);
assert(
  restoreOverrideEnvelope(
    JSON.stringify(userEdits), signature, sampleLesson.steps.map((step) => step.id
  )).needsBackup,
  "Unversioned legacy edits must not be silently applied."
);
assert(
  !restoreOverrideEnvelope("{}", signature, sampleLesson.steps.map((step) => step.id
  )).needsBackup,
  "An empty legacy preference object should not create a backup warning."
);
assert(
  restoreOverrideEnvelope(
    "{broken", signature, sampleLesson.steps.map((step) => step.id
  )).needsBackup,
  "Malformed stored edits must not crash the player or be reapplied."
);
assert(
  restoreOverrideEnvelope(
    JSON.stringify(overrideEnvelope(signature, { unknownStep: { density: "large" } })),
    signature, sampleLesson.steps.map((step) => step.id)
  ).needsBackup,
  "Overrides for unknown step IDs must not silently apply."
);

const teacherOverrides = {
  "step-one": {
    reveal_order: ["answer", "note"],
    content: { lead: "Visible", note: "Teacher-only" }
  }
};
const studentOverrides = studentVisibleOverrides(teacherOverrides);
assert(
  !JSON.stringify(studentOverrides).includes("Teacher-only") &&
    !studentOverrides["step-one"].reveal_order.includes("note"),
  "Projection overrides must never carry teacher-only notes or reveal layers."
);
assert(
  teacherOverrides["step-one"].content.note === "Teacher-only",
  "Projection sanitization must not mutate teacher overrides."
);
const nextUrl = new URL(projectionLessonUrl(
  "https://example.test/lesson?lesson=old&step=old-step&display=1",
  "new-lesson", "new-step"
));
assert(
  nextUrl.searchParams.get("lesson") === "new-lesson" &&
    nextUrl.searchParams.get("step") === "new-step" &&
    nextUrl.searchParams.get("display") === "1",
  "An existing student screen must navigate to a new lesson and step."
);
assert(
  !new URL(projectionLessonUrl(nextUrl.toString(), "another-lesson")).searchParams.has("step"),
  "Switching lessons without an explicit step must drop stale step deep links."
);
assert(
  appSource.includes('const projectionWindowName = "ogretmenrehberi-lesson-player-projection"') &&
    appSource.includes('type: "lesson-switch"') &&
    appSource.includes("navigateDisplay(message.lessonId)") &&
    appSource.includes("projectionLessonUrl(window.location.href, target.lesson_id, stepId)"),
  "The student popup must be reusable and follow cross-lesson navigation."
);
assert(
  appSource.includes("window.localStorage.setItem(progressStepKey, step.id)") &&
    appSource.includes("restoredStepIndex("),
  "Progress and reordered deep links must use the stable step identity."
);
assert(
  appSource.includes("overrideEnvelope(overrideSignature, overrides)") &&
    appSource.includes("window.localStorage.setItem(backupKey, raw ?? \"\")") &&
    appSource.includes("Eski düzenlemeleri indir"),
  "Stale local edits must be archived before storing the new revision."
);

console.log(
  `Runtime contract assertions passed: ${stepCount} steps, ` +
    `${teacherNoteCount} teacher-note steps protected.`
);
