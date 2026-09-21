import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(here, "..");
const androidRoot = path.resolve(webRoot, "../lesson-player-android");
const assets = path.join(androidRoot, "app/src/main/assets/lesson-player");
const generated = path.join(webRoot, "src/generated/lessons.json");
const workflowSource = path.join(webRoot, "src/teacher-workflow.json");
const checkOnly = process.argv.includes("--check");

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function stableBytes(value) {
  return JSON.stringify(value, null, 2) + "\n";
}

export function withoutVolatileBuildTime(lessons) {
  return lessons.map(({ generated_at: _generatedAt, ...lesson }) => lesson);
}

function checkedRun(script) {
  const child = spawnSync(process.execPath, [path.join(here, script)], {
    stdio: "inherit", cwd: webRoot
  });
  if (child.status !== 0) throw new Error(`Canonical validation failed: ${script}`);
}

if (!checkOnly) {
  checkedRun("build-lesson-data.mjs");
  checkedRun("test-lesson-data.mjs");
  checkedRun("test-teacher-workflow.mjs");
  checkedRun("test-runtime-contract.mjs");
}
if (!fs.existsSync(generated)) {
  throw new Error("Generate lessons.json with npm run data before --check");
}
const lessons = withoutVolatileBuildTime(JSON.parse(fs.readFileSync(generated, "utf8")));
const workflow = JSON.parse(fs.readFileSync(workflowSource, "utf8"));
const lessonBytes = stableBytes(lessons);
const workflowBytes = fs.readFileSync(workflowSource);
const countByTheme = Object.fromEntries(["TEMA_01", "TEMA_02", "TEMA_03", "TEMA_04"]
  .map(id => [id, lessons.filter(lesson => lesson.theme_id === id).length]));
const manifest = {
  schemaVersion: 1,
  grade: 11,
  contentSha256: sha256(lessonBytes),
  workflowSha256: sha256(workflowBytes),
  counts: {
    themes: 4,
    lessons: lessons.length,
    steps: lessons.reduce((total, lesson) => total + lesson.steps.length, 0),
    teacherWorkshops: workflow.themes.reduce((total, theme) => total + theme.tasks.length, 0),
    annualItems: workflow.annual.items.length
  },
  themes: countByTheme,
  lessons: lessons.map(lesson => ({
    lessonId: lesson.lesson_id,
    themeId: lesson.theme_id,
    steps: lesson.steps.length,
    sha256: sha256(stableBytes(lesson))
  }))
};
assert.deepEqual(manifest.themes, { TEMA_01: 7, TEMA_02: 9, TEMA_03: 18, TEMA_04: 14 });
assert.equal(manifest.counts.lessons, 48);
assert.equal(manifest.counts.steps, 914);
assert.equal(manifest.counts.teacherWorkshops, 8);
assert.equal(manifest.counts.annualItems, 5);
const outputs = {
  "lessons.json": lessonBytes,
  "teacher-workflow.json": workflowBytes,
  "content-manifest.json": stableBytes(manifest)
};
if (checkOnly) {
  for (const [name, bytes] of Object.entries(outputs)) {
    assert.deepEqual(fs.readFileSync(path.join(assets, name)), Buffer.from(bytes),
      `Stale/missing Android asset: ${name}`);
  }
} else {
  fs.mkdirSync(assets, { recursive: true });
  for (const [name, bytes] of Object.entries(outputs)) {
    fs.writeFileSync(path.join(assets, name), bytes);
  }
}
console.log(`Android lesson assets ${checkOnly ? "verified" : "generated"}: ${manifest.counts.lessons} lessons / ${manifest.counts.steps} steps / ${manifest.contentSha256}`);
