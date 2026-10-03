import assert from "node:assert/strict";
import fs from "node:fs";
import { assessmentFormsForLessons } from "./assessment-forms.mjs";

const index = JSON.parse(fs.readFileSync(new URL("../../../data/grade-11/source/textbook-forms-index.json", import.meta.url)));
const lessons = JSON.parse(fs.readFileSync(new URL("../../lesson-player/src/generated/lessons.json", import.meta.url)));
const book = "https://tymm.meb.gov.tr/assets/pdf/turk-dili-ve-edebiyati-11sinif-ders-kitabi_20260930_091040_422.pdf";
const forms = assessmentFormsForLessons(index, lessons, book);
const resolvedForms = [...forms.values()].flat();
assert.equal(resolvedForms.length, 13);
assert.equal(index.current_remote_pdf_target.sha256, "536a7c12c8116ea1eeddacd7d5a1d132e02fd771f11315947c4eb05ea5f065c0");
assert.equal(index.current_remote_pdf_target.page_count, 312);
for (const metadata of index.forms.filter((form) => form.location_scope === "EXTERNAL_OFFICIAL_QR")) {
  const resolved = resolvedForms.find((form) => form.id === metadata.form_id);
  assert.ok(resolved, `${metadata.form_id}: resolved form exists`);
  assert.equal(resolved.page, metadata.printed_page);
  assert.equal(resolved.source_url, metadata.target_url || `${book}#page=${metadata.remote_pdf_page}`,
    `${metadata.form_id}: use its official EBA destination or verified current-PDF fallback`);
}
const bySlug = (slug) => forms.get(lessons.find((lesson) => lesson.lesson_slug === slug).lesson_id);
assert.equal(bySlug("karagoz")[0].page, 35);
assert.equal(bySlug("konusma").length, 2);
assert.ok(bySlug("konusma").every((form) => form.source_url === `${book}#page=58`), "ambiguous EBA targets fall back to the verified current PDF page");
assert.equal(bySlug("tema-2-yazma").length, 2);
assert.ok(bySlug("tema-2-yazma").every((form) => form.source_url === `${book}#page=153`));
assert.equal(bySlug("kemal-tahir-mulakat-210-214").length, 2);
assert.ok(bySlug("kemal-tahir-mulakat-210-214").every((form) => form.source_url === `${book}#page=214`));
assert.equal(bySlug("afis-atolyesi-298-302").length, 1);
assert.equal(bySlug("tema-girisi").length, 0);
const linked = index.forms.filter((form) => form.location_scope === "EXTERNAL_OFFICIAL_QR");
const fixtureLesson = lessons.find((lesson) => lesson.lesson_slug === "karagoz");
assert.throws(() => assessmentFormsForLessons({ ...index, forms: [linked[0], linked[0]] }, [fixtureLesson], book), /Geçersiz değerlendirme formu/);
assert.throws(() => assessmentFormsForLessons({ ...index, forms: [{ ...linked[0], target_url: "javascript:alert(1)" }] }, [fixtureLesson], book), /Geçersiz EBA/);
assert.throws(() => assessmentFormsForLessons({ ...index, forms: [linked[0]] }, [], book), /Derse bağlanamayan/);
assert.throws(() => assessmentFormsForLessons(index, lessons, "https://tymm.meb.gov.tr/assets/pdf/book.pdf"), /güncel ders kitabı PDF'sini/);
console.log("[sunum-web] Assessment forms passed: 13 resources use the hash-pinned current PDF page mapping; legacy local PDF page metadata is preserved.");
