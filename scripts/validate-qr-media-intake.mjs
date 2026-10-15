import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), "utf8"));
const intake = read("data/grade-11/source/qr-media-intake-2026-10-08.json");
const canonical = read("data/grade-11/source/qr-sources.json");
const answerBank = read("data/grade-11/source/teacher-book/theme-1/answer-bank/part-13-pages-53-58.json");
const allAnswers = [];
for (let theme = 1; theme <= 4; theme += 1) {
  const root = `data/grade-11/source/teacher-book/theme-${theme}`;
  const index = read(`${root}/answer-bank.json`);
  for (const part of index.parts) allAnswers.push(...read(`${root}/${part.path}`).entries ?? []);
}
const answerById = new Map(allAnswers.map((entry) => [entry.question_id, entry]));

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
  // Content-owner attestation is a separate provenance dimension from an
  // archived word-for-word transcript or independently matched EBA binary.
  assert.equal(r.content_review?.status, "owner_confirmed",
    `${r.file_name}: content owner review confirmation is missing`);
  assert.deepEqual(r.content_review?.modalities, ["audio", "video"],
    `${r.file_name}: owner review scope must include both audio and video`);
  assert.equal(r.content_review?.basis, "content_owner_attestation",
    `${r.file_name}: review provenance must be explicit`);
  assert.match(r.content_review?.declaration_recorded_on ?? "", /^\d{4}-\d{2}-\d{2}$/,
    `${r.file_name}: missing recorded review date`);
  assert.equal(r.spoken_audio_transcript, "not_done", "Never mark incomplete audio as transcribed");
  if (r.existing_source_id) {
    verified++;
    assert.equal(r.mapping_status, "verified_existing_eba_registry_and_sha256");
    const s = known.get(r.existing_source_id);
    assert.ok(s, `Unknown verified EBA source: ${r.existing_source_id}`);
    assert.equal(s.local_file.sha256, r.sha256, "File SHA-256 differs from verified EBA source");
    assert.ok(s.usage_locations.some((u) => u.printed_page === r.printed_page), "Wrong printed page for verified EBA source");
  } else if (r.mapping_status === "book_pdf_qr_verified_media_file_candidate_unconfirmed") {
    unresolved++;
  } else {
    provisional++;
    assert.equal(r.mapping_status, "provisional_png_and_visual_review");
  }
}
assert.deepEqual([verified, provisional, unresolved], [5, 12, 1]);

// A provisional MP4 needs an explicit question link because it has no
// canonical registry usage_locations. Check both directions so an unrelated
// same-page video cannot be substituted silently.
for (const r of intake.records.filter((record) => !record.existing_source_id)) {
  const mediaTokens = [r.file_name, r.book_qr.eba_content_id].map((token) => token.toLocaleLowerCase("en-US"));
  const citations = allAnswers.filter((entry) => mediaTokens.some((token) => entry.source_locator?.toLocaleLowerCase("en-US").includes(token)));
  const citedIds = citations.map((entry) => entry.question_id).sort();
  const linkedIds = [...(r.linked_question_ids ?? [])].sort();
  assert.deepEqual(linkedIds, citedIds, `${r.file_name} question links must match answer-bank citations`);
  for (const questionId of linkedIds) {
    const answer = answerById.get(questionId);
    assert.ok(answer, `${r.file_name} links an unknown answer ${questionId}`);
    assert.ok(mediaTokens.some((token) => answer.source_locator?.toLocaleLowerCase("en-US").includes(token)),
      `${r.file_name} question link ${questionId} is not reflected in its source_locator`);
  }
}
// The actual PDF page-QR hyperlinks were extracted from the 313-page
// textbook whose SHA-256 is the source-page PDF fingerprint.
const pdfFingerprint = "87248cb5f6940c29b7d152fab5cb1f7b800e4d5ddc46ac4cdeb5542f0361a1ba";
const pdfLinkIds = new Set();
for (const r of intake.records) {
  const qr = r.book_qr;
  assert.ok(qr, `Missing verified textbook QR target: ${r.file_name}`);
  assert.equal(qr.printed_page, r.printed_page);
  assert.equal(qr.pdf_page, r.printed_page + 1);
  assert.equal(qr.pdf_sha256, pdfFingerprint);
  assert.equal(qr.destination_verification, "verified_from_original_textbook_pdf_link_annotation");
  assert.match(qr.eba_content_id, /^[0-9a-f]{32}$/);
  assert.equal(qr.eba_url,
    `https://ders.eba.gov.tr/ders//redirectContent.jsp?resourceId=${qr.eba_content_id}&resourceType=1&resourceLocation=2`);
  assert.ok(!pdfLinkIds.has(qr.eba_content_id), "Duplicate QR link assigned to two videos");
  pdfLinkIds.add(qr.eba_content_id);
  if (r.existing_source_id) {
    const source = known.get(r.existing_source_id);
    assert.equal(source.eba_content_id, qr.eba_content_id,
      "Verified EBA source registry mismatches original printed QR link");
    assert.equal(qr.media_binary_identity, "sha256_matches_earlier_eba_verified_source");
  } else {
    assert.equal(qr.media_binary_identity, "not_verified_from_eba_download",
      "PDF QR destination proves a link, not the Drive MP4's EBA binary identity");
  }
}
assert.equal(pdfLinkIds.size, 18);
const importantIds = new Map([
  ["19XU3SUD.mp4", "551442fb39efe8a8438247ae6c0e03d0"],
  ["19XU49LO.mp4", "382543f8f403f67200b286af84e71b40"],
  ["19XU49JV.mp4", "85ae59be9852fb990c8de54f7cb313ce"],
  ["19XU4GDV.mp4", "bc54a785fede521619c982332455dc72"],
  ["19XU49LQ.mp4", "5fd2b97cb78fabe367aa3fcde8f9718d"],
  ["19XU3SW3.mp4", "5a6b3d654679891e8dfbafcd74a32bd7"],
]);
for (const [fileName, ebaId] of importantIds) {
  assert.equal(intake.records.find(r => r.file_name === fileName)?.book_qr?.eba_content_id,
    ebaId, `Ambiguous textbook page QR target changed: ${fileName}`);
}
assert.equal(intake.excluded_nearby_qr_links.length, 4);
for (const excluded of intake.excluded_nearby_qr_links) {
  assert.ok(!pdfLinkIds.has(excluded.eba_content_id),
    "Dictionary / other questions must not be classified as a video QR");
}

const communication = intake.records.find((r) => r.file_name === "19XU4CVR.mp4");
assert.equal(communication.printed_page, 67);
const festivalCandidate = intake.records.find((r) => r.file_name === "19XU49LO.mp4");
assert.equal(festivalCandidate.printed_page, 88);
assert.equal(festivalCandidate.mapping_status, "book_pdf_qr_verified_media_file_candidate_unconfirmed");
assert.ok(intake.known_conflicts.some((e) => e.printed_page === 88));
const festivalBank = read("data/grade-11/source/teacher-book/theme-2/answer-bank/part-01-pages-86-89.json");
for (const id of ["T2-P88-Q01", "T2-P88-Q02", "T2-P88-Q03", "T2-P88-Q04", "T2-P88-Q05"]) {
  const entry = festivalBank.entries.find((candidate) => candidate.question_id === id);
  assert.equal(entry?.entry_type, "source_limited", `${id} cannot treat the unconfirmed MP4 as the QR video`);
}

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
  assert.equal(entry.entry_type, "source_limited", `${id} depends on sampled scenes without a verified dialogue transcript`);
  assert.ok(entry.source_locator.includes(sek.review_notes_path), "Source evidence locator missing");
  assert.ok(entry.answer.includes("ön yarg"), "Expected scene-grounded communication barrier");
  assert.ok(!Array.isArray(entry.evidence_quotes), "Unverified scene dialogue must not be stored as a verified quote");
}
for (const [fileName, notePath] of [
  ["19XU3SUD.mp4", "data/grade-11/source/qr-review-notes/UNVERIFIED-19XU3SUD.md"],
  ["19XU3SW3.mp4", "data/grade-11/source/qr-review-notes/UNVERIFIED-19XU3SW3.md"],
]) {
  const record = intake.records.find((r) => r.file_name === fileName);
  assert.ok(record, `Provisional media entry missing: ${fileName}`);
  assert.equal(record.mapping_status, "provisional_png_and_visual_review");
  assert.equal(record.existing_source_id, null, "Do not invent verified EBA identities");
  assert.equal(record.review_notes_path, notePath);
  assert.equal(record.spoken_audio_transcript, "not_done");
  assert.ok(fs.readFileSync(path.join(root, notePath), "utf8").includes("ekran"));
}

const communicationBank = read("data/grade-11/source/teacher-book/theme-1/answer-bank/part-15-pages-64-67.json");
const communicationLaterBank = read("data/grade-11/source/teacher-book/theme-1/answer-bank/part-17-pages-72-73.json");
for (const [sourceId, reviewFile] of [
  ["QR-EBA-29BF4F293D53", "data/grade-11/source/qr-review-notes/QR-EBA-29BF4F293D53.md"],
  ["QR-EBA-BFB2729458DF", "data/grade-11/source/qr-review-notes/QR-EBA-BFB2729458DF.md"],
]) {
  const s = known.get(sourceId);
  assert.ok(s, `Missing screen-reviewed EBA source: ${sourceId}`);
  assert.equal(s.review_notes_path, reviewFile);
  assert.equal(s.transcript_path, null, "Screen review must not claim an audio transcript");
  assert.equal(s.dates.content_reviewed, null, "Partial review must not claim complete review");
  assert.ok(fs.readFileSync(path.join(root, reviewFile), "utf8").includes("ekran"), "Screen evidence note missing");
}
const q8 = communicationBank.entries.find((e) => e.question_id === "T1-P67-Q08");
assert.ok(q8, "Video dependent question 8 missing");
assert.equal(q8.entry_type, "source_limited");
assert.ok(q8.answer.includes("1971"), "Missing verified on-screen objective example");
assert.ok(q8.answer.includes("kanatlanmış"), "Missing verified on-screen subjective example");
assert.ok(q8.source_locator.includes("QR-EBA-29BF4F293D53.md"), "Quote provenance missing");
for (const id of ["T1-P66-Q01", "T1-P66-Q04", "T1-P66-Q05", "T1-P67-Q06", "T1-P67-Q07", "T1-P67-Q09", "T1-P72-Q01", "T1-P73-Q01", "T1-P73-Q02"]) {
  const entry = [...communicationBank.entries, ...communicationLaterBank.entries].find((candidate) => candidate.question_id === id);
  assert.equal(entry?.entry_type, "source_limited",
    `${id} depends on speech not covered by the screen-only review`);
}
const communicationLaterAnswers = new Map(communicationLaterBank.entries.map((entry) => [entry.question_id, entry]));
const p72 = communicationLaterAnswers.get("T1-P72-Q01");
const p73q1 = communicationLaterAnswers.get("T1-P73-Q01");
const p73q2 = communicationLaterAnswers.get("T1-P73-Q02");
assert.ok(!JSON.stringify(p72.answer_sections).includes("Hoş geldiniz"),
  "Untranscribed speech must not remain as a verified dialogue example");
assert.deepEqual(p73q1.evidence_quotes, ["Mektup, sevginin kanatlanmış hâlidir."],
  "Page 73 may use the exact screen caption verified in its review note");
assert.ok(p73q1.source_locator.includes("QR-EBA-29BF4F293D53.md"));
assert.ok(p73q1.answer.includes("konuşmacının sözü olarak doğrulanmamıştır"));
assert.ok(p73q2.answer.includes("olumsuz dil özelliği belirlenmemiştir"));
assert.ok(!JSON.stringify(p73q2.answer_sections).includes("benzer düşüncelerin tekrarı dinlemeyi zorlaştırabilir"),
  "Do not invent an audio-derived language flaw");

for (const [fileName, page, notePath] of [
  ["19XU49LO.mp4", 88, "data/grade-11/source/qr-review-notes/UNVERIFIED-19XU49LO.md"],
  ["19XU49LT.mp4", 113, "data/grade-11/source/qr-review-notes/UNVERIFIED-19XU49LT.md"],
]) {
  const record = intake.records.find((r) => r.file_name === fileName);
  assert.ok(record, `Theme 2 record missing: ${fileName}`);
  assert.equal(record.printed_page, page);
  assert.equal(record.review_notes_path, notePath);
  assert.equal(record.visual_review, "time_stamped_sampled_frames");
  assert.equal(record.book_qr.media_binary_identity, "not_verified_from_eba_download");
  assert.equal(record.spoken_audio_transcript, "not_done");
  const note = fs.readFileSync(path.join(root, notePath), "utf8");
  assert.ok(note.includes("görüntü") && note.includes("doğrula"),
    "Theme 2 visual notes must distinguish observation from source validation");
}
const t2AnswerBank = read("data/grade-11/source/teacher-book/theme-2/answer-bank/part-05-pages-113-120.json");
const orhunQ1 = t2AnswerBank.entries.find((e) => e.question_id === "T2-P113-Q01");
assert.ok(orhunQ1 && orhunQ1.entry_type === "source_limited",
  "Unverified video transcript must remain source_limited");
assert.ok(orhunQ1.source_locator.includes("UNVERIFIED-19XU49LT.md"));
assert.ok(orhunQ1.answer.includes("KÜL TİGİN ABİDESİ"), "Observed image evidence missing");

// Theme 2 oral-culture videos are sampled visually, not transcribed.
// Guard against accidentally treating a book QR URL as proof of Drive MP4 provenance.
for (const [fileName, page, qrId, notePath] of [
  ["19XU49LP.mp4", 129, "2d18e79ed46861b363ef8affbfefcecb", "data/grade-11/source/qr-review-notes/UNVERIFIED-19XU49LP.md"],
  ["19XU49JV.mp4", 140, "85ae59be9852fb990c8de54f7cb313ce", "data/grade-11/source/qr-review-notes/UNVERIFIED-19XU49JV.md"],
  ["19XU49MG.mp4", 141, "79b9d858a98472d2c1c9c773b715c6a2", "data/grade-11/source/qr-review-notes/UNVERIFIED-19XU49MG.md"],
]) {
  const record = intake.records.find((r) => r.file_name === fileName);
  assert.ok(record, `Missing Theme 2 cultural video ${fileName}`);
  assert.equal(record.printed_page, page);
  assert.equal(record.book_qr.eba_content_id, qrId);
  assert.equal(record.book_qr.media_binary_identity, "not_verified_from_eba_download");
  assert.equal(record.mapping_status, "provisional_png_and_visual_review");
  assert.equal(record.review_notes_path, notePath);
  assert.equal(record.visual_review, "time_stamped_sampled_frames");
  assert.equal(record.spoken_audio_transcript, "not_done");
  const review = fs.readFileSync(path.join(root, notePath), "utf8");
  const normalizedReview = review.toLocaleLowerCase("tr-TR");
  assert.ok(normalizedReview.includes("ses") && normalizedReview.includes("eba"),
    "Notes must explain why sampled frames do not prove complete audio or download provenance");
}
const t2Part8 = read("data/grade-11/source/teacher-book/theme-2/answer-bank/part-08-pages-129-135.json");
const q129 = t2Part8.entries.find(e => e.question_id === "T2-P129-Q01");
assert.equal(q129?.entry_type, "source_limited");
assert.ok(q129.source_locator.includes("UNVERIFIED-19XU49LP.md"));
assert.ok(q129.answer.includes("taş yazıt"), "Observation in bounded Q129 answer missing");
for (const id of ["T2-P129-Q02", "T2-P129-Q03"]) {
  const entry = t2Part8.entries.find((candidate) => candidate.question_id === id);
  assert.equal(entry?.entry_type, "source_limited", `${id} must not present the unreviewed narration as verified`);
  assert.ok(entry.source_locator.includes("UNVERIFIED-19XU49LP.md"));
}
const t2Part9 = read("data/grade-11/source/teacher-book/theme-2/answer-bank/part-09-pages-136-141.json");
for (const id of ["T2-P141-Q01", "T2-P141-Q02"]) {
  const entry = t2Part9.entries.find((candidate) => candidate.question_id === id);
  assert.equal(entry?.entry_type, "source_limited", `${id} cannot treat an untranscribed interview as verified speech`);
  assert.ok(entry.source_locator.includes("UNVERIFIED-19XU49MG.md"));
  assert.match(`${entry.guidance ?? ""} ${entry.explanation ?? ""}`, /transkript|ses dökümü/iu,
    `${id}: teacher-facing provenance must document the missing transcript`);
}
for (const forbidden of ["Tengri Dağları", "Buhara", "Tebriz", "Kerkük", "Bağdat", "Mehmet Oktay Ergani"]) {
  const unsupportedInterviewClaims = t2Part9.entries
    .filter((entry) => ["T2-P141-Q01", "T2-P141-Q02"].includes(entry.question_id))
    .map((entry) => `${entry.answer} ${entry.explanation ?? ""} ${entry.guidance ?? ""} ${JSON.stringify(entry.answer_sections ?? {})}`)
    .join(" ");
  assert.ok(!unsupportedInterviewClaims.includes(forbidden), `Untranscribed interview claim must not be asserted: ${forbidden}`);
}
const voc = t2Part9.entries.find(e => e.question_id === "T2-P140-VOC01");
assert.equal(voc?.entry_type, "source_limited");
assert.ok(voc.source_locator.includes("UNVERIFIED-19XU49JV.md"));
assert.equal(voc.dictionary_terms.length, 5);
for (const entry of Object.values(voc.answer_sections)) {
  assert.ok(entry.videodaki_dize.includes("Doğrulanmış transkript yok"),
    "Do not attribute a lyric or word occurrence to an untranscribed recording");
}

const gokturk = intake.records.find(r => r.file_name === "19XU49MB.mp4");
assert.ok(gokturk && gokturk.printed_page === 159);
assert.equal(gokturk.book_qr.eba_content_id, "b557411639a9c10b3b7c33b91819cd42");
assert.equal(gokturk.book_qr.media_binary_identity, "not_verified_from_eba_download");
assert.equal(gokturk.spoken_audio_transcript, "not_done");
assert.equal(gokturk.visual_review, "time_stamped_sampled_frames_and_on_screen_labels");
assert.equal(gokturk.review_notes_path, "data/grade-11/source/qr-review-notes/UNVERIFIED-19XU49MB.md");
const gokturkNote = fs.readFileSync(path.join(root, gokturk.review_notes_path), "utf8");
for (const label of ["İLTERİŞ KUTLUĞ KAĞAN", "KÜL TİGİN", "BİLGE KAĞAN", "TONYUKUK"]) {
  assert.ok(gokturkNote.includes(label), `Missing visual screen label: ${label}`);
}
const t2Part12 = read("data/grade-11/source/teacher-book/theme-2/answer-bank/part-12-pages-155-159.json");
const bridge = t2Part12.entries.find(e => e.question_id === "T2-P159-Q08");
assert.equal(bridge?.entry_type, "source_limited");
assert.ok(bridge.source_locator.includes(gokturk.review_notes_path));
assert.ok(bridge.answer.includes("Kül Tigin") && bridge.answer.includes("Tonyukuk"));
assert.ok(bridge.answer.includes("videoda anıldığına dair ses kanıtı değildir"),
  "Do not attribute selected literary works to untranscribed narration");
assert.ok(bridge.source_locator.includes(gokturk.review_notes_path));

const performanceBank = read("data/grade-11/source/teacher-book/theme-2/answer-bank/part-10-pages-142-147.json");
for (const id of ["T2-P142-Q02", "T2-P143-Q02", "T2-P143-Q03", "T2-P143-Q04", "T2-P147-Q01"]) {
  const entry = performanceBank.entries.find((candidate) => candidate.question_id === id);
  assert.equal(entry?.entry_type, "source_limited", `${id} depends on the untranscribed p.140 performance`);
  assert.ok(entry.source_locator.includes("UNVERIFIED-19XU49JV.md"));
}
for (const id of ["T2-P144-MAP01", "T2-P145-PERF01"]) {
  const entry = performanceBank.entries.find((candidate) => candidate.question_id === id);
  assert.equal(entry?.entry_type, "performance_support");
  assert.ok(entry.answer.includes("Görüntü notunda") || entry.answer.includes("doğrulanmış"));
}

// Theme 4: distinguish the 58-second title sequence from the main film,
// and keep visual-only observations explicitly separate from spoken transcripts.
const t4Files = [
  ["19XU4GDV.mp4", 285, "bc54a785fede521619c982332455dc72", "UNVERIFIED-19XU4GDV.md"],
  ["19XU49LQ.mp4", 285, "5fd2b97cb78fabe367aa3fcde8f9718d", "UNVERIFIED-19XU49LQ.md"],
  ["19XU49KB.mp4", 293, "cc654606d608113ea65f523584ab801b", "UNVERIFIED-19XU49KB.md"],
  ["19XU49LS.mp4", 307, "6e0ca79cee422408b5dcfaf3ad7a1459", "UNVERIFIED-19XU49LS.md"],
];
for (const [file, page, qrId, noteFile] of t4Files) {
  const record = intake.records.find(r => r.file_name === file);
  assert.ok(record, `Missing Theme 4 video: ${file}`);
  assert.equal(record.printed_page, page);
  assert.equal(record.book_qr.eba_content_id, qrId);
  assert.equal(record.book_qr.media_binary_identity, "not_verified_from_eba_download");
  assert.equal(record.mapping_status, "provisional_png_and_visual_review");
  assert.equal(record.spoken_audio_transcript, "not_done");
  assert.equal(record.visual_review, "time_stamped_sampled_frames");
  const notePath = "data/grade-11/source/qr-review-notes/" + noteFile;
  assert.equal(record.review_notes_path, notePath);
  const note = fs.readFileSync(path.join(root, notePath), "utf8");
  assert.ok(note.toLocaleLowerCase("tr-TR").includes("qr") && note.toLocaleLowerCase("tr-TR").includes("ses"),
    "Every Theme 4 review must disclose QR/MP4 and sound-transcript uncertainty");
}
const theme4Part10 = read("data/grade-11/source/teacher-book/theme-4/answer-bank/part-10-pages-284-297.json");
const theme4Part12 = read("data/grade-11/source/teacher-book/theme-4/answer-bank/part-12-pages-303-307.json");
const q4 = new Map([...theme4Part10.entries, ...theme4Part12.entries].map(q => [q.question_id,q]));
for (const [id,kind,refs] of [
  ["T4-P285-Q02", "performance_support", ["UNVERIFIED-19XU4GDV.md"]],
  ["T4-P286-Q03", "source_limited", ["UNVERIFIED-19XU49LQ.md"]],
  ["T4-P293-Q02", "source_limited", ["UNVERIFIED-19XU49KB.md"]],
  ["T4-P293-Q03", "source_limited", ["UNVERIFIED-19XU49KB.md","UNVERIFIED-19XU49LQ.md"]],
  ["T4-P307-Q13", "source_limited", ["UNVERIFIED-19XU49LS.md"]],
  ["T4-P307-Q14", "source_limited", ["UNVERIFIED-19XU49LS.md"]],
]) {
  const answer = q4.get(id);
  assert.equal(answer?.entry_type, kind, `Source verification level changed for ${id}`);
  for (const ref of refs) assert.ok(answer.source_locator.includes(ref), `Evidence missing in ${id}`);
}
const comparison = q4.get("T4-P293-Q03");
assert.deepEqual(Object.keys(comparison.answer_sections), ["Dil ve Üslup","İleti","Tür","İçerik"]);
assert.ok(comparison.answer_sections["Dil ve Üslup"].includes("transkript"),"Cannot certify style without audio");
for(const id of ["T4-P307-Q13","T4-P307-Q14"])
  assert.ok(q4.get(id).answer.includes("ses") || q4.get(id).answer.includes("transkript"),
    "Aidiyet answer must not assign unverified motives to people");

// Pages 43 and 83 are confirmed EBA/SHA videos with visual frame evidence.
// A verified binary is NOT a verified narration, a precise time-aligned poem,
// or evidence that the page-43 Kaplan letter was discussed in the documentary.
for (const [fileName, page, sourceId, qrId, noteName, visible] of [
  ["19XU49ME.mp4", 43, "QR-EBA-E43890DFD82A",
    "e43890dfd82a3b5c7823d3b0fba2b627", "QR-EBA-E43890DFD82A.md",
    "Abdülhak Hâmid'in Mektupları"],
  ["OGM2025TDE118312.mp4", 83, "QR-EBA-2952F505E3A7",
    "2952f505e3a7923fe38ce31c2bd92871", "QR-EBA-2952F505E3A7.md",
    "ŞAİRİN SESİNDEN"],
]) {
  const record = intake.records.find(r => r.file_name === fileName);
  const canonicalSource = known.get(sourceId);
  assert.ok(record && canonicalSource, `QR EBA source absent: ${fileName}`);
  assert.equal(record.printed_page, page);
  assert.equal(record.existing_source_id, sourceId);
  assert.equal(record.book_qr.eba_content_id, qrId);
  assert.equal(record.book_qr.media_binary_identity, "sha256_matches_earlier_eba_verified_source");
  assert.equal(record.sha256, canonicalSource.local_file.sha256);
  assert.equal(record.spoken_audio_transcript, "not_done");
  assert.equal(canonicalSource.transcript_path, null);
  assert.equal(canonicalSource.work_status,
    "partially_reviewed_verified_media_visual_only_audio_not_transcribed");
  assert.equal(canonicalSource.content_review_basis,
    "sampled_video_frames_with_timecodes_not_audio");
  assert.equal(record.visual_review, "time_stamped_sampled_frames");
  const notePath = "data/grade-11/source/qr-review-notes/" + noteName;
  assert.equal(record.review_notes_path, notePath);
  assert.equal(canonicalSource.review_notes_path, notePath);
  const note = fs.readFileSync(path.join(root, notePath), "utf8");
  assert.ok(note.includes(visible), `Specific visual evidence missing: ${visible}`);
  assert.ok(note.includes("Ses") || note.includes("ses"), "Audio uncertainty must be explicit");
  assert.ok(note.includes("s." + page), "Printed page context must be explicit");
}
const t1Page43 = read("data/grade-11/source/teacher-book/theme-1/answer-bank/part-09-pages-43-44.json");
const t1Page83 = read("data/grade-11/source/teacher-book/theme-1/answer-bank/part-20-pages-79-83.json");
assert.equal(t1Page43.entries.find(e => e.question_id === "T1-P43-Q01")?.entry_type,
  "question_answer", "Mektup type must remain based on Kaplan's printed text");
assert.equal(t1Page83.entries.find(e => e.question_id === "T1-P83-Q13")?.entry_type,
  "source_limited", "Olvido audio-sensitive question must stay source_limited");

// Cross-reference audit: all 18 page-video records must open their own
// existing evidence note, without conflating URL identity with MP4 provenance.
const notePaths = new Set();
for (const r of intake.records) {
  assert.ok(r.review_notes_path?.startsWith("data/grade-11/source/qr-review-notes/"),
    `Video has no accessible evidence note: ${r.file_name}`);
  assert.ok(!notePaths.has(r.review_notes_path),
    `Two distinct page videos share a review note: ${r.file_name}`);
  notePaths.add(r.review_notes_path);
  const noteFile = path.join(root, r.review_notes_path);
  assert.ok(fs.existsSync(noteFile), `Linked evidence note missing: ${r.review_notes_path}`);
  assert.ok(fs.readFileSync(noteFile,"utf8").length > 140, `Empty video note: ${r.file_name}`);
  assert.equal(r.spoken_audio_transcript, "not_done",
    `Visual notes must never masquerade as a complete audio transcript: ${r.file_name}`);
  if (r.existing_source_id) {
    const canonicalSource = known.get(r.existing_source_id);
    assert.equal(canonicalSource.review_notes_path, r.review_notes_path,
      `Registry and intake disagree on EBA evidence note: ${r.file_name}`);
  }
}
assert.equal(notePaths.size, 18, "Every textbook video must have its own note");

console.log("QR media intake PASS: all 18 printed QR destinations verified; 5 EBA/SHA-confirmed MP4, 12 provisional and 1 page-88 MP4 candidate; multimedia evidence boundaries enforced.");
