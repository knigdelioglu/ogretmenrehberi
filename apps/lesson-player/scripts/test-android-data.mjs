import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const app = path.resolve(here, "..");
const assets = path.resolve(app, "../lesson-player-android/app/src/main/assets/lesson-player");
const expected = JSON.parse(fs.readFileSync(path.join(app, "src/generated/lessons.json"), "utf8"))
  .map(({ generated_at: _volatile, ...lesson }) => lesson);
const actualBytes = fs.readFileSync(path.join(assets, "lessons.json"));
const lessons = JSON.parse(actualBytes.toString("utf8"));
const manifest = JSON.parse(fs.readFileSync(path.join(assets, "content-manifest.json"), "utf8"));
const workflowBytes = fs.readFileSync(path.join(assets, "teacher-workflow.json"));
const hash = value => createHash("sha256").update(value).digest("hex");
const serialize = value => JSON.stringify(value, null, 2) + "\n";

assert.deepEqual(lessons, expected, "All content including answers/guidance/nested structures must match web");
assert.equal(manifest.contentSha256, hash(actualBytes));
assert.equal(manifest.workflowSha256, hash(workflowBytes));
assert.equal(manifest.schemaVersion, 1);
assert.deepEqual(manifest.themes, {TEMA_01: 7,TEMA_02: 9,TEMA_03: 18,TEMA_04: 14});
assert.equal(manifest.counts.lessons, 48);
assert.equal(manifest.counts.steps, 914);
assert.equal(manifest.counts.themes, 4);
assert.equal(manifest.counts.teacherWorkshops, 8);
assert.equal(manifest.counts.annualItems, 5);
assert.deepEqual(manifest.lessons.map(x => x.lessonId), lessons.map(x => x.lesson_id));
for (const [index, lesson] of lessons.entries()) {
  assert.equal(manifest.lessons[index].sha256, hash(serialize(lesson)));
  assert.equal(manifest.lessons[index].steps, lesson.steps.length);
  assert.equal(manifest.lessons[index].themeId, lesson.theme_id);
  assert.equal(lesson.coverage.steps, lesson.steps.length);
  for(const step of lesson.steps) {
    assert.match(step.source.source_record_id, /^T\d{2}-S\d+$/);
    assert.equal(step.source.source_status, "VERIFIED");
    assert.ok(step.display_prompt.trim());
    if(step.answer) {
      assert.ok(step.answer.question_id && step.answer.answer.trim());
      assert.ok(step.source.printed_page_range);
    } else {
      assert.ok(step.content, `Missing content: ${lesson.lesson_id}/${step.id}`);
    }
  }
}
const witness = lessons.find(x => x.lesson_id === "T11-T01-KARAGOZ").steps
  .find(x => x.id === "s26-reference");
assert.ok(witness.content.note, "Teacher note was lost");
assert.equal(lessons.find(x => x.lesson_id === "T11-T04-MERDIVEN-ANLAMA-266-270")
  .steps.find(x => x.id === "s266-vocabulary").layout, "structure");
const modified = structuredClone(lessons);
const answered = modified.flatMap(x => x.steps).find(x => x.answer?.answer);
answered.answer.answer += " İçerik değişti.";
assert.notEqual(hash(serialize(modified)), manifest.contentSha256,
  "Answer text edits must change the content identity");
const volatile = JSON.parse(fs.readFileSync(path.join(app, "src/generated/lessons.json"), "utf8"));
assert.ok(volatile.every(x => typeof x.generated_at === "string"));
assert.deepEqual(volatile.map(({generated_at, ...lesson}) => lesson), expected,
  "Only the volatile generation timestamp may be omitted");
console.log("Android canonical parity: 48 lessons / 914 steps / 4 themes / answer SHA-256 PASS");
