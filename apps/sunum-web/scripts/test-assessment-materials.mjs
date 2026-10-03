import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(appRoot, "../..");
const distRoot = path.join(appRoot, "dist");
const files = [
  ["19XU4J2J.docx", "data/grade-11/presentation/theme-1/konusma-flow.json", "s58-feedback", 10],
  ["OGM2025TDE11135akran.docx", "data/grade-11/presentation/theme-1/karagoz-flow.json", "s35-peer-form", 6],
  ["19XU4J2K.docx", "data/grade-11/presentation/theme-1/yazma-flow.json", "s78-rubric", 6],
  ["19XU4J2L.docx", "data/grade-11/presentation/theme-2/konusma-flow.json", "s135-reference", 5],
  ["19XU4J2M.docx", "data/grade-11/presentation/theme-2/konusma-flow.json", "s135-peer-form", 8],
  ["19XU4J2N.docx", "data/grade-11/presentation/theme-2/yazma-flow.json", "s153-rubric", 5],
  ["OGM2025TDE11153akran.docx", "data/grade-11/presentation/theme-2/yazma-flow.json", "s153-peer-form", 8],
  ["19XU4J2O.docx", "data/grade-11/presentation/theme-3/kemal-tahir-mulakat-210-214-flow.json", "s214-rubric", 7],
  ["OGM2025TDE11214akran1.docx", "data/grade-11/presentation/theme-3/kemal-tahir-mulakat-210-214-flow.json", "s214-peer-form", 5],
  ["19XU4J2P.docx", "data/grade-11/presentation/theme-3/radyo-diyalog-yazma-225-229-flow.json", "s228-rubric", 6],
  ["19XU4J2Q.docx", "data/grade-11/presentation/theme-4/tiyatro-canlandirma-280-283-flow.json", "s283-performance", 6],
  ["19XU4J2R.docx", "data/grade-11/presentation/theme-4/afis-atolyesi-298-302-flow.json", "s302-rubric", 6],
  ["iletisim-engelleri-drama-rubrik.docx", "data/grade-11/presentation/theme-1/konusma-flow.json", "s59-rubric", 6]
];
const byFlow = new Map();
for (const [filename, relativeFlow, stepId, count] of files) {
  const flow = byFlow.get(relativeFlow) ?? JSON.parse(fs.readFileSync(path.join(repoRoot, relativeFlow), "utf8"));
  byFlow.set(relativeFlow, flow);
  const step = flow.steps.find((entry) => entry.id === stepId);
  assert.ok(step, `${relativeFlow}/${stepId} exists`);
  const url = `assets/assessment-documents/${filename}`;
  const download = step.content?.sources?.find((source) => source.url === url && source.download === true);
  assert.ok(download?.label?.trim(), `${stepId} has a labeled same-origin download for ${filename}`);
  const sourceFile = path.join(appRoot, "src", url);
  const builtFile = path.join(distRoot, url);
  for (const file of [sourceFile, builtFile]) {
    assert.ok(fs.existsSync(file), `DOCX asset exists: ${file}`);
    const bytes = fs.readFileSync(file);
    assert.deepEqual([...bytes.subarray(0, 4)], [0x50, 0x4b, 0x03, 0x04], `${filename} is a DOCX ZIP package`);
    execFileSync("unzip", ["-t", file], { stdio: "ignore" });
  }
  if (/peer-form$/.test(stepId) || stepId === "s58-feedback") {
    assert.equal(step.content.items.length, count, `${stepId} exposes every peer-form criterion`);
    assert.deepEqual(step.content.scale, ["Evet", "Kısmen", "Hayır"], `${stepId} displays the original peer scale`);
  } else {
    const levels = step.content.sections.filter((section) => section.title !== "Toplam puan ve hesaplama" && /puan/.test(section.title));
    assert.equal(levels.length, count * 4, `${stepId} preserves four point-bearing levels for every criterion`);
    assert.ok(step.content.sections.some((section) => section.title === "Toplam puan ve hesaplama"),
      `${stepId} explains the total-score calculation`);
    assert.ok(step.content.sources.some((source) => source.url.startsWith("https://") && /#page=/.test(source.url)),
      `${stepId} retains the verified book-page reference`);
  }
}
const authored = byFlow.get("data/grade-11/presentation/theme-1/konusma-flow.json").steps.find((step) => step.id === "s59-rubric");
assert.match(authored.content.lead, /resmî MEB\/kitap anahtarı değildir/i);
assert.match(JSON.stringify(authored.content.sections), /Konu seçimi|İçeriğin uygunluğu|Canlandırma becerisi/);
const downloadedNames = files.map(([name]) => name).sort();
const builtNames = fs.readdirSync(path.join(distRoot, "assets/assessment-documents")).sort();
assert.deepEqual(builtNames, downloadedNames, "only the requested rubric/peer-form documents are packaged");
console.log(`[sunum-web] Assessment materials passed: ${files.length} DOCX links, peer criteria, rubric levels and totals.`);
