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

// A local copy and the official web PDF have different page counts and offsets.
// CURRENT_TEXTBOOK_PDF_PATH accepts either *verified* PDF, without rewriting
// links to the official web version or weakening their SHA-256 pin.
const currentPdfPath = process.env.CURRENT_TEXTBOOK_PDF_PATH;
if (currentPdfPath) {
  const localManifest = JSON.parse(fs.readFileSync(path.join(
    repoRoot, "data/book/grade-11/themes/theme-1/manifest.json"
  ), "utf8"));
  const localPdf = {
    sha256: localManifest.source.pdf_sha256,
    page_count: localManifest.source.pdf_page_count,
    printed_to_pdf_offset: localManifest.printed_to_pdf_offset
  };
  assert.equal(localPdf.printed_to_pdf_offset, 1,
    "local textbook PDF printed-to-physical-page offset remains +1");
  assert.equal(localPdf.page_count, 313, "local source PDF has 313 pages");
  const digest = createHash("sha256").update(fs.readFileSync(currentPdfPath)).digest("hex");
  const matchesRemote = digest === remotePdf.sha256;
  const matchesLocal = digest === localPdf.sha256;
  assert.ok(matchesRemote || matchesLocal,
    "PDF fingerprint must match either the verified 312-page MEB web PDF or the canonical 313-page local textbook");
  const selected = matchesRemote
    ? { name: "MEB web", count: remotePdf.page_count, offset: 0 }
    : { name: "canonical local", count: localPdf.page_count, offset: localPdf.printed_to_pdf_offset };
  const extracted = execFileSync("pdftotext", ["-q", "-layout", currentPdfPath, "-"], {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024
  });
  const pages = extracted.split("\f");
  if (!pages.at(-1)?.trim()) pages.pop();
  assert.equal(pages.length, selected.count, `${selected.name} PDF page count`);
  const checkedPages = [...new Set([
    ...links.map(({ printedPage }) => printedPage),
    ...formsIndex.forms.filter((form) => form.location_scope === "EXTERNAL_OFFICIAL_QR")
      .map((form) => form.remote_pdf_page)
  ])];
  for (const printedPage of checkedPages) {
    const pdfPage = printedPage + selected.offset;
    assert.ok(pdfPage > 0 && pdfPage <= pages.length,
      `${selected.name} printed page ${printedPage} maps to valid PDF page ${pdfPage}`);
    const lines = pages[pdfPage - 1].trim().split(/\r?\n/).filter((line) => line.trim());
    assert.equal(lines.at(-1)?.trim(), String(printedPage),
      `${selected.name} PDF page ${pdfPage} must visibly carry printed page number ${printedPage}`);
  }
  console.log(`[sunum-web] ${selected.name} PDF source passed: SHA256, ${pages.length} pages, ${checkedPages.length} printed-page targets checked (offset ${selected.offset}). Official web links still use printed-page numbering.`);
} else {
  console.log("[sunum-web] Current MEB PDF mapping metadata and all 93 printed-page links passed (set CURRENT_TEXTBOOK_PDF_PATH to verify either pinned textbook PDF).");
}
