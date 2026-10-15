import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadSourceEvidenceDataset,
  validateAnswerEvidence,
  validateMediaEvidenceLink,
  validatePresentationSourceEvidence
} from "./presentation-source-evidence.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const dataset = loadSourceEvidenceDataset(repoRoot);
const canonicalErrors = validatePresentationSourceEvidence(dataset);
assert.deepEqual(canonicalErrors, [], `Canonical answer-bank evidence errors:\n${canonicalErrors.join("\n")}`);

const page = { theme: 1, printedPage: 3, text: "Bu kitapta doğrulanmış alıntı vardır. Yükseköğretim örneği." };
const fixtureMedia = [
  {
    record: { file_name: "video-a.mp4", printed_page: 8, linked_question_ids: ["T1-P08-Q01"], book_qr: { eba_content_id: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" } },
    source: null,
    note: "# Ekran kanıtı\n| Yaklaşık zaman | Ekranda birebir görülen ifade | Kullanım |\n| --- | --- | --- |\n| 00:10 | “Doğrulanmış ekran ifadesi.” | test |\n"
  },
  {
    record: { file_name: "video-b.mp4", printed_page: 8, linked_question_ids: ["T1-P08-Q02"], book_qr: { eba_content_id: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" } },
    source: null,
    note: "# Ekran kanıtı\n| Yaklaşık zaman | Ekranda birebir görülen ifade | Kullanım |\n| --- | --- | --- |\n| 00:10 | “Başka bir ekran ifadesi.” | test |\n"
  }
];
const fixture = (overrides = {}) => ({
  question_id: "T1-P08-Q01",
  entry_type: "question_answer",
  printed_page: 8,
  source_locator: "basılı s.8",
  evidence_quotes: [],
  ...overrides
});

const fakeQuote = validateAnswerEvidence(fixture({ evidence_quotes: ["Uydurulmuş kitap cümlesi."] }), { pages: [page], media: fixtureMedia, filePath: "injected-answer.json" });
assert.ok(fakeQuote.some((error) => /evidence_quotes\[0\].*absent/u.test(error)), "invented book quote is rejected");

const wrongPage = validateAnswerEvidence(fixture({
  source_locator: "basılı s.4",
  evidence_quotes: ["Bu kitapta doğrulanmış alıntı vardır."]
}), { pages: [page], media: fixtureMedia, filePath: "injected-answer.json" });
assert.ok(wrongPage.some((error) => /printed page\(s\) 3 but not in the cited location/u.test(error)), "valid quote linked to the wrong printed page is rejected");

const wrongVideo = validateAnswerEvidence(fixture({
  source_locator: "basılı s.8 — QR-EBA-bbbbbbbbbbbb / video-b.mp4",
  evidence_quotes: ["Doğrulanmış ekran ifadesi."]
}), { pages: [], media: fixtureMedia, filePath: "injected-answer.json" });
assert.ok(wrongVideo.some((error) => /no verified media evidence matches/u.test(error)), "a verified quote linked to the wrong video is rejected");

const unverifiedAudio = validateAnswerEvidence(fixture({
  source_locator: "basılı s.8 — video-b.mp4, kullanıcı tarafından sağlanan ses dökümü",
  evidence_quotes: ["Duyulmamış sözlü cümle."]
}), { pages: [], media: fixtureMedia, filePath: "injected-answer.json" });
assert.ok(unverifiedAudio.some((error) => /no verified media evidence matches/u.test(error)), "an audio claim without a verified transcript is rejected");

const promotedUnverifiedMedia = validateAnswerEvidence(fixture({
  source_locator: "basılı s.8 — QR-EBA-bbbbbbbbbbbb / video-b.mp4",
  answer: "Videoda doğrulandığı iddia edilen sözlü yanıt."
}), { pages: [], media: fixtureMedia, filePath: "injected-answer.json" });
assert.ok(promotedUnverifiedMedia.some((error) => /untranscribed media.*cannot support a verified question_answer/u.test(error)),
  "untranscribed media cannot be promoted to a verified answer without exact screen evidence");

const brokenMediaPair = validateMediaEvidenceLink(fixture({
  source_locator: "basılı s.8 — QR-EBA-aaaaaaaaaaaa / video-b.mp4"
}), fixtureMedia);
assert.ok(brokenMediaPair.some((error) => /different EBA identity/u.test(error)), "mismatched EBA and filename pairing is rejected");

const wrongVideoRelationship = validateAnswerEvidence(fixture({
  source_locator: "basılı s.8 — QR-EBA-bbbbbbbbbbbb / video-b.mp4"
}), { pages: [], media: fixtureMedia, filePath: "injected-answer.json" });
assert.ok(wrongVideoRelationship.some((error) => /does not list this question in linked_question_ids/u.test(error)),
  "a same-page video linked to another question is rejected even without a quote");

const verifiedTranscriptMedia = [{
  record: { file_name: "verified-audio.mp4", printed_page: 8, spoken_audio_transcript: "verified", linked_question_ids: ["T1-P08-Q01"] },
  source: null,
  note: "",
  transcriptText: "Doğrulanmış konuşma cümlesi.",
  transcriptError: ""
}];
const transcriptQuote = validateAnswerEvidence(fixture({
  source_locator: "basılı s.8 — verified-audio.mp4",
  evidence_quotes: ["Doğrulanmış konuşma cümlesi."]
}), { pages: [], media: verifiedTranscriptMedia, filePath: "injected-answer.json" });
assert.deepEqual(transcriptQuote, [], "verified transcript file can support an exact matching quote");

const falseTranscriptClaim = validateAnswerEvidence(fixture({
  source_locator: "basılı s.8 — verified-audio.mp4",
  evidence_quotes: ["Transkriptte bulunmayan söz."]
}), { pages: [], media: verifiedTranscriptMedia, filePath: "injected-answer.json" });
assert.ok(falseTranscriptClaim.some((error) => /no verified media evidence matches/u.test(error)),
  "a verified transcript status does not make an absent quote valid");

const missingTranscript = validateAnswerEvidence(fixture({
  source_locator: "basılı s.8 — verified-audio.mp4",
  answer: "Transkript dosyasının var olduğu iddia ediliyor."
}), { pages: [], media: [{ ...verifiedTranscriptMedia[0], transcriptText: "", transcriptError: "verified transcript file is missing: missing.txt" }], filePath: "injected-answer.json" });
assert.ok(missingTranscript.some((error) => /verified transcript file is missing/u.test(error)),
  "verified transcript status with a missing file is rejected");

const validMediaQuote = validateAnswerEvidence(fixture({
  source_locator: "basılı s.8 — QR-EBA-aaaaaaaaaaaa / video-a.mp4",
  evidence_quotes: ["Doğrulanmış ekran ifadesi."]
}), { pages: [], media: fixtureMedia, filePath: "injected-answer.json" });
assert.deepEqual(validMediaQuote, [], "quote from the linked verified on-screen evidence remains accepted");

const lineWrapQuote = validateAnswerEvidence(fixture({
  source_locator: "basılı s.3",
  evidence_quotes: ["Yükseköğretim örneği."]
}), { pages: [{ ...page, text: "Bu kitapta doğrulanmış alıntı vardır. Yükseköğ-\n retim örneği." }], media: [], filePath: "injected-answer.json" });
assert.deepEqual(lineWrapQuote, [], "controlled OCR line-wrap normalization joins a split word");

const crossColumnQuote = validateAnswerEvidence(fixture({
  source_locator: "basılı s.3",
  evidence_quotes: ["İlk sütun burada biter. İkinci sütun buradan başlar."]
}), { pages: [{ ...page, text: "İlk sütun burada biter.     İkinci sütun buradan başlar." }], media: [], filePath: "injected-answer.json" });
assert.ok(crossColumnQuote.some((error) => /absent from cited printed pages/u.test(error)),
  "wide OCR column gaps must not be collapsed into a false cross-column quote");

const changedText = fixture({
  source_locator: "basılı s.3",
  prompt_summary: "Güncellenmiş, geçerli soru metni.",
  explanation: "Güncellenmiş açıklama.",
  evidence_quotes: ["Bu kitapta doğrulanmış alıntı vardır."]
});
assert.deepEqual(validateAnswerEvidence(changedText, { pages: [page], media: [], filePath: "injected-answer.json" }), [],
  "valid prompt and explanation edits do not disturb evidence validation");

console.log("[presentation-source-evidence] Canonical citations and 14 source, pairing, transcript and tolerant-normalization fault-injection fixtures passed.");
