import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../../..");
const presentationRoot = path.join(repoRoot, "data/grade-11/presentation");
const formsIndex = JSON.parse(fs.readFileSync(path.join(repoRoot, "data/grade-11/source/textbook-forms-index.json"), "utf8"));
const remotePdf = formsIndex.current_remote_pdf_target;
const expectedUrl = "https://tymm.meb.gov.tr/assets/pdf/turk-dili-ve-edebiyati-11sinif-ders-kitabi_20260930_091040_422.pdf";
const expectedSha256 = "536a7c12c8116ea1eeddacd7d5a1d132e02fd771f11315947c4eb05ea5f065c0";

assert.deepEqual(remotePdf, {
  id: "tde11-current-meb-20260930",
  url: expectedUrl,
  sha256: expectedSha256,
  page_count: 312,
  page_numbering: "printed_page"
}, "current online page mapping must stay tied to the verified MEB PDF asset");

const links = [];
const verifySource = (source, location) => {
  if (!source.url?.startsWith(`${expectedUrl}#page=`)) return false;
  const printedPage = Number(source.label?.match(/\bs\.\s*(\d+)/i)?.[1]);
  assert.ok(Number.isInteger(printedPage), `${location}: PDF source label must name its printed page`);
  const targetPage = Number(source.url.match(/#page=(\d+)$/)?.[1]);
  assert.equal(targetPage, printedPage,
    `${location}: ${source.label} must open PDF page ${printedPage}, got ${targetPage}`);
  assert.ok(targetPage <= remotePdf.page_count, `${location}: PDF page ${targetPage} exceeds the verified PDF page count`);
  return { printedPage, location };
};
for (const theme of fs.readdirSync(presentationRoot)) {
  const themeDir = path.join(presentationRoot, theme);
  if (!fs.statSync(themeDir).isDirectory()) continue;
  for (const file of fs.readdirSync(themeDir).filter((name) => name.endsWith("-flow.json"))) {
    const flowPath = path.join(themeDir, file);
    const flow = JSON.parse(fs.readFileSync(flowPath, "utf8"));
    for (const step of flow.steps || []) {
      for (const source of step.content?.sources || []) {
        const result = verifySource(source, `${theme}/${file}/${step.id}`);
        if (result) links.push(result);
      }
    }
  }
}
assert.equal(links.length, 93, "the reviewed official book-source links must remain present");

const generatedLessons = JSON.parse(fs.readFileSync(path.join(repoRoot, "apps/lesson-player/src/generated/lessons.json"), "utf8"));
const generatedLinks = generatedLessons.flatMap((lesson) => lesson.steps || []).flatMap((step) =>
  (step.content?.sources || []).map((source) => verifySource(source, `${step.id} (generated lesson)`)).filter(Boolean));
assert.equal(generatedLinks.length, links.length, "generated lessons must retain all reviewed book-source links");

for (const form of formsIndex.forms.filter((entry) => entry.location_scope === "EXTERNAL_OFFICIAL_QR")) {
  assert.equal(form.remote_pdf_asset_id, remotePdf.id, `${form.form_id}: remote PDF asset id`);
  assert.equal(form.remote_pdf_page, form.printed_page, `${form.form_id}: current remote page mapping`);
  assert.ok(form.remote_pdf_page <= remotePdf.page_count, `${form.form_id}: current remote page range`);
}

const currentPdfPath = process.env.CURRENT_TEXTBOOK_PDF_PATH;
if (currentPdfPath) {
  const digest = createHash("sha256").update(fs.readFileSync(currentPdfPath)).digest("hex");
  assert.equal(digest, remotePdf.sha256, "downloaded PDF must match the pinned current MEB source");
  const extracted = execFileSync("pdftotext", ["-q", "-layout", currentPdfPath, "-"], {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024
  });
  const pages = extracted.split("\f");
  if (!pages.at(-1)?.trim()) pages.pop();
  assert.equal(pages.length, remotePdf.page_count, "current PDF page count");
  const checkedPages = [...new Set([
    ...links.map(({ printedPage }) => printedPage),
    ...formsIndex.forms.filter((form) => form.location_scope === "EXTERNAL_OFFICIAL_QR")
      .map((form) => form.remote_pdf_page)
  ])];
  for (const pageNumber of checkedPages) {
    const lines = pages[pageNumber - 1].trim().split(/\r?\n/).filter((line) => line.trim());
    assert.equal(lines.at(-1)?.trim(), String(pageNumber),
      `current PDF page ${pageNumber} must visibly carry printed page number ${pageNumber}`);
  }
  console.log(`[sunum-web] Current MEB PDF source passed: SHA256, ${pages.length} pages and ${checkedPages.length} printed-page targets checked.`);
} else {
  console.log("[sunum-web] Current MEB PDF mapping metadata and all 93 printed-page links passed (set CURRENT_TEXTBOOK_PDF_PATH to verify against a downloaded PDF).");
}
