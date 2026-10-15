import assert from "node:assert/strict";
import fs from "node:fs";
import { assessmentFormsForLessons } from "./assessment-forms.mjs";

const index = JSON.parse(fs.readFileSync(new URL("../../../data/grade-11/source/textbook-forms-index.json", import.meta.url)));
const lessons = JSON.parse(fs.readFileSync(new URL("../../lesson-player/src/generated/lessons.json", import.meta.url)));
const book = index.current_remote_pdf_target.url;
const forms = assessmentFormsForLessons(index, lessons, book);
const resolvedForms = [...forms.values()].flat();
const linkedFormMetadata = index.forms.filter((form) => form.location_scope === "EXTERNAL_OFFICIAL_QR");
assert.equal(resolvedForms.length, linkedFormMetadata.length,
  "every current external assessment-form record resolves into the presentation catalog");
assert.equal(forms.size, lessons.length, "every current lesson gets an assessment-form lookup entry");
for (const metadata of index.forms.filter((form) => form.location_scope === "EXTERNAL_OFFICIAL_QR")) {
  const resolved = resolvedForms.find((form) => form.id === metadata.form_id);
  assert.ok(resolved, `${metadata.form_id}: resolved form exists`);
  assert.equal(resolved.page, metadata.printed_page);
  assert.equal(resolved.source_url, metadata.target_url || `${book}#page=${metadata.remote_pdf_page}`,
    `${metadata.form_id}: use its official EBA destination or verified current-PDF fallback`);
}
const linked = index.forms.filter((form) => form.location_scope === "EXTERNAL_OFFICIAL_QR");
const fixtureLesson = lessons[0];
assert.throws(() => assessmentFormsForLessons({ ...index, forms: [linked[0], linked[0]] }, [fixtureLesson], book), /Geçersiz değerlendirme formu/);
assert.throws(() => assessmentFormsForLessons({ ...index, forms: [{ ...linked[0], target_url: "javascript:alert(1)" }] }, [fixtureLesson], book), /Geçersiz EBA/);
assert.throws(() => assessmentFormsForLessons({ ...index, forms: [linked[0]] }, [], book), /Derse bağlanamayan/);
assert.throws(() => assessmentFormsForLessons(index, lessons, "https://tymm.meb.gov.tr/assets/pdf/book.pdf"), /güncel ders kitabı PDF'sini/);
console.log(`[sunum-web] Assessment forms passed: ${resolvedForms.length} current resources use the verified PDF page mapping; legacy local PDF page metadata is preserved.`);
