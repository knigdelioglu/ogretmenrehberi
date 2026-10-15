import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assessmentDownloads } from "../src/menu-files.js";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(appRoot, "../..");
const distRoot = path.join(appRoot, "dist");
const presentationRoot = path.join(repoRoot, "data/grade-11/presentation");
const flowFiles = [1, 2, 3, 4].flatMap((theme) => {
  const directory = path.join(presentationRoot, `theme-${theme}`);
  return fs.readdirSync(directory).filter((name) => name.endsWith("-flow.json"))
    .map((name) => path.join(directory, name));
});
const downloadableDocs = flowFiles.flatMap((flowFile) => {
  const flow = JSON.parse(fs.readFileSync(flowFile, "utf8"));
  return flow.steps.flatMap((step) => (step.content?.sources ?? [])
    .filter((source) => source.download === true && /^assets\/assessment-documents\/[A-Za-z0-9._-]+\.docx$/iu.test(source.url))
    .map((source) => ({ flowFile, flow, step, source, filename: path.basename(source.url) })));
});
assert.ok(downloadableDocs.length > 0, "canonical presentation flows declare assessment DOCX downloads");
assert.equal(new Set(downloadableDocs.map(({ filename }) => filename)).size, downloadableDocs.length,
  "assessment DOCX filenames are unique across canonical flow sources");

for (const { flowFile, flow, step, source, filename } of downloadableDocs) {
  const location = `${path.relative(repoRoot, flowFile)}/${step.id}`;
  assert.ok(source.label?.trim(), `${location}: DOCX download has a student-facing or teacher-facing label`);
  assert.ok(Array.isArray(step.content.items) || Array.isArray(step.content.sections) || step.content.rubric,
    `${location}: downloadable assessment material has structured authored content`);
  if (step.content.items) assert.ok(step.content.items.every((item) => typeof item === "string"),
    `${location}: assessment criteria stay as text items`);
  if (step.content.scale) assert.ok(step.content.scale.every((choice) => typeof choice === "string" && choice.trim()),
    `${location}: assessment choices stay as non-empty text`);
  if (step.content.rubric?.rows) assert.ok(step.content.rubric.rows.every((row) =>
    typeof row.criterion === "string" && Array.isArray(row.levels) && row.levels.length > 0),
  `${location}: rubric rows keep criterion and level structure`);
  assert.ok(flow.lesson_id && flow.steps.includes(step), `${location}: assessment step belongs to its canonical flow`);

  const sourceFile = path.join(appRoot, "src", source.url);
  const builtFile = path.join(distRoot, source.url);
  for (const file of [sourceFile, builtFile]) {
    assert.ok(fs.existsSync(file), `${location}: DOCX asset exists: ${file}`);
    const bytes = fs.readFileSync(file);
    assert.deepEqual([...bytes.subarray(0, 4)], [0x50, 0x4b, 0x03, 0x04], `${filename} is a DOCX ZIP package`);
    execFileSync("unzip", ["-t", file], { stdio: "ignore" });
  }
}

const classScorer = "assets/assessment-documents/35-ogrenci-rubrik-puanlama.xlsx";
for (const file of [path.join(appRoot, "src", classScorer), path.join(distRoot, classScorer)]) {
  assert.ok(fs.existsSync(file), `assessment workbook exists: ${file}`);
  execFileSync("unzip", ["-t", file], { stdio: "ignore" });
  const workbookXml = execFileSync("unzip", ["-p", file, "xl/workbook.xml"], { encoding: "utf8" });
  assert.match(workbookXml, /<x:sheet\b/u, "assessment workbook contains worksheets");
  assert.match(workbookXml, /Sınıf Listesi/u, "assessment workbook contains its class list");
  const firstRubricXml = execFileSync("unzip", ["-p", file, "xl/worksheets/sheet2.xml"], { encoding: "utf8" });
  assert.match(firstRubricXml, /<x:f>/u, "assessment workbook has a calculated scoring cell");
  assert.match(firstRubricXml, /<x:dataValidations\b/u, "assessment workbook preserves input validation");
}

const packagedNames = [...downloadableDocs.map(({ filename }) => filename), path.basename(classScorer)].sort();
const builtNames = fs.readdirSync(path.join(distRoot, "assets/assessment-documents")).sort();
assert.deepEqual(builtNames, packagedNames, "the build packages exactly the current canonical assessment downloads");
const generatedLessons = JSON.parse(fs.readFileSync(path.join(repoRoot, "apps/lesson-player/src/generated/lessons.json"), "utf8"));
const menuFiles = assessmentDownloads({ lessons: generatedLessons });
assert.deepEqual(menuFiles.map((file) => path.basename(file.url)).sort(), packagedNames,
  "the menu exposes every packaged assessment resource exactly once");
console.log(`[sunum-web] Assessment materials passed: ${downloadableDocs.length} canonical DOCX links, workbook and ${menuFiles.length} menu resources.`);
