import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assessmentDownloads } from "../src/menu-files.js";

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
    if (relativeFlow.includes("/theme-4/")) {
      assert.equal(levels.length, count, `${stepId} groups all rubric levels under six criteria`);
      for (const section of levels) {
        for (const level of ["Başlangıç düzeyinde", "Kabul edilebilir", "İyi", "Çok iyi"]) {
          assert.ok(section.body.includes(level), `${stepId}/${section.title}: missing ${level}`);
        }
      }
    } else {
      assert.equal(levels.length, count * 4, `${stepId} preserves four point-bearing levels for every criterion`);
    }
    assert.ok(step.content.sections.some((section) => section.title === "Toplam puan ve hesaplama"),
      `${stepId} explains the total-score calculation`);
    assert.ok(step.content.sources.some((source) => source.url.startsWith("https://") && /#page=/.test(source.url)),
      `${stepId} retains the verified book-page reference`);
  }
}
const speakingFlow = byFlow.get("data/grade-11/presentation/theme-1/konusma-flow.json");
const preparation = speakingFlow.steps.find((step) => step.id === "s54-plan");
assert.equal(preparation.content.lead, "Sözlü iletişim engellerini konu alan canlandırmayı uygulamadan önce planlama kararlarını tamamlayın. Bu aşama hazırlık sürecidir; nihai drama performans puanından ayrıdır.");
assert.deepEqual(preparation.content.scale, ["Evet", "Hayır"], "page 54 preparation checklist keeps the textbook scale");
assert.equal(preparation.content.sections.length, 7, "page 54 keeps all seven preparation checklist criteria");
assert.deepEqual(preparation.content.sections.map((section) => section.body), [
  "Konuşmanın konusunu ve amacını belirledi.",
  "Konuşmanın konusuyla ilgili gerekli gözlem, inceleme ve araştırmalar yaptı.",
  "Konuşmaya uygun yöntem ve stratejiyi belirledi.",
  "Konuşmanın süresini ve hedef kitlenin özelliklerini belirledi.",
  "Konuşmayı nasıl ve hangi araçları kullanarak gerçekleştireceğine karar verdi.",
  "Mekânın, teknik altyapının, görüntü ve sesin uygunluğunu kontrol etti.",
  "Konuşmada iletişimin önündeki engelleri ortadan kaldırdı."
]);
const authored = speakingFlow.steps.find((step) => step.id === "s59-rubric");
assert.match(authored.content.lead, /örnek puanlama rubriği/);
assert.match(authored.content.lead, /birebir aktarımı olduğu doğrulanmamıştır/);
assert.equal(authored.content.sources.find((source) => source.download === true)?.label, "Öğretmen anahtarı");
assert.match(JSON.stringify(authored.content.sections), /Konu seçimi|İçeriğin uygunluğu|Canlandırma becerisi/);
assert.equal(authored.content.sources[0]?.label, "Ders kitabı basılı s.58 — PDF sayfasını aç");
assert.match(authored.content.sources[0]?.url ?? "", /#page=58$/);
const rubricPages = [
  ["data/grade-11/presentation/theme-1/konusma-flow.json", "s59-rubric"],
  ["data/grade-11/presentation/theme-1/yazma-flow.json", "s78-rubric"],
  ["data/grade-11/presentation/theme-2/konusma-flow.json", "s135-reference"],
  ["data/grade-11/presentation/theme-2/yazma-flow.json", "s153-rubric"],
  ["data/grade-11/presentation/theme-3/kemal-tahir-mulakat-210-214-flow.json", "s214-rubric"],
  ["data/grade-11/presentation/theme-3/radyo-diyalog-yazma-225-229-flow.json", "s228-rubric"],
  ["data/grade-11/presentation/theme-4/tiyatro-canlandirma-280-283-flow.json", "s283-performance"],
  ["data/grade-11/presentation/theme-4/afis-atolyesi-298-302-flow.json", "s302-rubric"]
];
const classScorer = "assets/assessment-documents/35-ogrenci-rubrik-puanlama.xlsx";
const rubricDocuments = [
  ["data/grade-11/presentation/theme-1/yazma-flow.json", "s78-rubric", "19XU4J2K.docx"],
  ["data/grade-11/presentation/theme-2/konusma-flow.json", "s135-reference", "19XU4J2L.docx"],
  ["data/grade-11/presentation/theme-2/yazma-flow.json", "s153-rubric", "19XU4J2N.docx"],
  ["data/grade-11/presentation/theme-3/kemal-tahir-mulakat-210-214-flow.json", "s214-rubric", "19XU4J2O.docx"],
  ["data/grade-11/presentation/theme-3/radyo-diyalog-yazma-225-229-flow.json", "s228-rubric", "19XU4J2P.docx"],
  ["data/grade-11/presentation/theme-4/tiyatro-canlandirma-280-283-flow.json", "s283-performance", "19XU4J2Q.docx"],
  ["data/grade-11/presentation/theme-4/afis-atolyesi-298-302-flow.json", "s302-rubric", "19XU4J2R.docx"]
];
for (const [relativeFlow, stepId, filename] of rubricDocuments) {
  const flow = byFlow.get(relativeFlow) ?? JSON.parse(fs.readFileSync(path.join(repoRoot, relativeFlow), "utf8"));
  const source = flow.steps.find((entry) => entry.id === stepId).content.sources.find((entry) => entry.url.endsWith(`/${filename}`));
  assert.equal(source?.label, `Kaynak: ${filename}`, `${stepId} identifies its DOCX source`);
}
for (const [relativeFlow, stepId] of rubricPages) {
  const flow = byFlow.get(relativeFlow) ?? JSON.parse(fs.readFileSync(path.join(repoRoot, relativeFlow), "utf8"));
  const step = flow.steps.find((entry) => entry.id === stepId);
  assert.ok(step, `${relativeFlow}/${stepId} exists`);
  const workbookLink = step.content.sources.find((source) => source.url === classScorer && source.download === true);
  assert.equal(workbookLink?.label, "Puanlama Exceli", `${stepId} uses the concise workbook label`);
}
const xlsxSource = path.join(appRoot, "src", classScorer);
const xlsxBuilt = path.join(distRoot, classScorer);
for (const file of [xlsxSource, xlsxBuilt]) {
  assert.ok(fs.existsSync(file), `35-student workbook exists: ${file}`);
  execFileSync("unzip", ["-t", file], { stdio: "ignore" });
  const workbookXml = execFileSync("unzip", ["-p", file, "xl/workbook.xml"], { encoding: "utf8" });
  assert.equal((workbookXml.match(/<x:sheet\b/g) ?? []).length, 9, "workbook contains a class list and eight rubric sheets");
  assert.match(workbookXml, /Sınıf Listesi/);
  const firstRubricXml = execFileSync("unzip", ["-p", file, "xl/worksheets/sheet2.xml"], { encoding: "utf8" });
  assert.match(firstRubricXml, /COUNTIF\(B6:H6,"Evet"\)/, "the supplied group checklist counts its seven criteria");
  assert.match(firstRubricXml, /SUM\(D19:J19\)/, "the supplied individual performance table calculates totals");
  assert.match(firstRubricXml, /<x:dataValidations\b/, "checklist and scoring cells retain their validations");
  assert.match(firstRubricXml, /#page=55/, "the communication workbook cites the printed page 54 checklist");
  assert.match(firstRubricXml, /iletisim-engelleri-drama-rubrik\.docx/, "the communication sheet cites its teacher key");
}
for (const [sheetNumber, filename] of [
  ["sheet3.xml", "19XU4J2K.docx"],
  ["sheet4.xml", "19XU4J2L.docx"],
  ["sheet5.xml", "19XU4J2N.docx"],
  ["sheet6.xml", "19XU4J2O.docx"],
  ["sheet7.xml", "19XU4J2P.docx"],
  ["sheet8.xml", "19XU4J2Q.docx"],
  ["sheet9.xml", "19XU4J2R.docx"]
]) {
  const sheetXml = execFileSync("unzip", ["-p", xlsxBuilt, `xl/worksheets/${sheetNumber}`], { encoding: "utf8" });
  assert.ok(sheetXml.includes(`Kaynak: ${filename}`), `${filename} is cited on its matching worksheet`);
}
const downloadedNames = [...files.map(([name]) => name), path.basename(classScorer)].sort();
const builtNames = fs.readdirSync(path.join(distRoot, "assets/assessment-documents")).sort();
assert.deepEqual(builtNames, downloadedNames, "only the requested rubric/peer-form documents and class scorer are packaged");
const generatedLessons = JSON.parse(fs.readFileSync(path.join(repoRoot, "apps/lesson-player/src/generated/lessons.json"), "utf8"));
const menuFiles = assessmentDownloads({ lessons: generatedLessons });
assert.equal(menuFiles.length, downloadedNames.length, "the Files tab exposes every packaged assessment file once");
assert.equal(menuFiles[0]?.label, "Puanlama Exceli", "the workbook is first in the Files tab without a student count");
assert.equal(menuFiles[0]?.type, "XLSX");
assert.deepEqual(menuFiles.map((file) => path.basename(file.url)).sort(), downloadedNames);
console.log(`[sunum-web] Assessment materials passed: ${files.length} DOCX links, Puanlama Exceli and ${menuFiles.length} files in the menu catalog.`);
