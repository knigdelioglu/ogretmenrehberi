import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), "utf8"));
const intake = read("data/grade-11/source/qr-media-intake-2026-10-08.json");
const canonical = read("data/grade-11/source/qr-sources.json");
const answerBank = read("data/grade-11/source/teacher-book/theme-1/answer-bank/part-13-pages-53-58.json");

assert.equal(intake.schema_version, "1.0.0");
assert.equal(intake.records.length, 18, "Expected 18 unique Drive video files");
assert.equal(new Set(intake.records.map((r) => r.file_name)).size, 18, "Duplicate video file entry");
const known = new Map(canonical.sources.map((s) => [s.source_id, s]));
let verified = 0, provisional = 0, unresolved = 0;
for (const r of intake.records) {
  assert.match(r.file_name, /^[A-Za-z0-9]+\.mp4$/);
  assert.match(r.sha256, /^[0-9a-f]{64}$/);
  assert.ok(Number.isInteger(r.printed_page) && r.printed_page > 0);
  assert.ok(r.duration_seconds > 0);
  assert.equal(r.spoken_audio_transcript, "not_done", "Never mark incomplete audio as transcribed");
  if (r.existing_source_id) {
    verified++;
    assert.equal(r.mapping_status, "verified_existing_eba_registry_and_sha256");
    const s = known.get(r.existing_source_id);
    assert.ok(s, `Unknown verified EBA source: ${r.existing_source_id}`);
    assert.equal(s.local_file.sha256, r.sha256, "File SHA-256 differs from verified EBA source");
    assert.ok(s.usage_locations.some((u) => u.printed_page === r.printed_page), "Wrong printed page for verified EBA source");
  } else if (r.mapping_status === "candidate_needs_original_qr_verification") {
    unresolved++;
  } else {
    provisional++;
    assert.equal(r.mapping_status, "provisional_png_and_visual_review");
  }
}
assert.deepEqual([verified, provisional, unresolved], [5, 12, 1]);
const communication = intake.records.find((r) => r.file_name === "19XU4CVR.mp4");
assert.equal(communication.printed_page, 67);
const festivalCandidate = intake.records.find((r) => r.file_name === "19XU49LO.mp4");
assert.equal(festivalCandidate.printed_page, 88);
assert.equal(festivalCandidate.mapping_status, "candidate_needs_original_qr_verification");
assert.ok(intake.known_conflicts.some((e) => e.printed_page === 88));

const sek = known.get("QR-EBA-254C08EA3501");
assert.equal(sek.review_notes_path, "data/grade-11/source/qr-review-notes/QR-EBA-254C08EA3501.md");
assert.equal(sek.dates.content_reviewed, null, "Partial review must not claim full video review");
assert.equal(sek.transcript_path, null, "No full audio transcript has been verified");
const note = fs.readFileSync(path.join(root, sek.review_notes_path), "utf8");
for (const token of ["televizyon", "Kuzen", "Kayınpeder", "diyalog"]) {
  assert.ok(note.includes(token), `Missing evidence note term: ${token}`);
}
for (const id of ["T1-P53-Q01", "T1-P53-Q02"]) {
  const entry = answerBank.entries.find((e) => e.question_id === id);
  assert.ok(entry, `Missing answer bank entry: ${id}`);
  assert.equal(entry.entry_type, id === "T1-P53-Q01" ? "source_limited" : "question_answer");
  assert.ok(entry.source_locator.includes(sek.review_notes_path), "Source evidence locator missing");
  assert.ok(entry.answer.includes("ön yarg"), "Expected scene-grounded communication barrier");
}
console.log("QR media intake PASS: 18 unique files; 5 verified EBA/SHA matches, 12 provisional, 1 unresolved; Seksenler Q1–Q2 grounded.");
