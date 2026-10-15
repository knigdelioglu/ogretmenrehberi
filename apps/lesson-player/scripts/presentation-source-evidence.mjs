import fs from "node:fs";
import path from "node:path";

const asString = (value) => typeof value === "string" ? value : "";

export function normalizeEvidenceText(value) {
  return asString(value)
    .normalize("NFC")
    .replace(/[\u00ad\u200b\u200c\u200d\ufeff]/g, "")
    .replace(/[\u00a0\u202f]/g, " ")
    .replace(/[“”„‟]/g, '"')
    .replace(/[‘’‚‛´`]/g, "'")
    .replace(/[‐‑‒–—―]/g, "-")
    // Preserve wide horizontal gaps as boundaries so text from adjacent PDF
    // columns cannot be fused into a quote.
    .replace(/[ \t]{2,}/g, "\u0000")
    // Rejoin ordinary OCR line-wrap hyphenation after page text is cleaned of
    // the book's one-letter list markers below.
    .replace(/([\p{L}])-(?:\r?\n[ \t]{0,12}){1,2}([\p{L}])/gu, "$1$2")
    .replace(/(^|\n)[ \t]*[•●▪◦][ \t]*/g, "$1")
    .replace(/[ \t]*\r?\n[ \t]*/g, " ")
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("tr-TR")
    .trim();
}

function cleanOcrListMarkers(value) {
  // Some book-page OCR inserts a printed substep marker (a, b, c, ç, d, e,
  // f, g, ğ) between a hyphenated word and its continuation, e.g. "bö-\na
  // lümlerini". Remove only that single-letter layout artifact.
  return asString(value)
    // A large line-start offset marks a separate PDF column; keep it as a
    // boundary. Ordinary paragraph indentation is discarded for matching.
    .replace(/(^|\n)[ \t]{50,}/gu, "$1\u0000")
    .replace(/(^|\n)[ \t]+/gu, "$1")
    .replace(/([\p{L}])-(?:\r?\n[ \t]{0,12}){1,2}[a-gçğ][ \t]+(?=[\p{Ll}])/giu, "$1");
}

export function stripQuoteCitation(value) {
  return asString(value)
    .replace(/\s*\(\s*basılı\s+s\.\s*\d+(?:\s*[-–—]\s*\d+)?\s*\)\s*$/iu, "")
    .trim();
}

export function parsePrintedPageReferences(locator) {
  const pages = new Set();
  const text = asString(locator);
  const re = /\bs\.\s*(\d+)(?:\s*[-–—]\s*(\d+))?/giu;
  for (const match of text.matchAll(re)) {
    const prefix = text.slice(Math.max(0, match.index - 6), match.index);
    if (/PDF\s*$/iu.test(prefix)) continue;
    const start = Number(match[1]);
    const end = Number(match[2] ?? match[1]);
    if (!Number.isInteger(start) || !Number.isInteger(end) || end < start || end - start > 40) continue;
    for (let page = start; page <= end; page += 1) pages.add(page);
  }
  return [...pages].sort((a, b) => a - b);
}

function collectPageText(page) {
  const chunks = [];
  for (const key of ["text_layer", "transcription", "page_text"]) {
    if (typeof page[key] === "string") chunks.push(page[key]);
  }
  const visit = (value) => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }
    if (typeof value.text === "string") chunks.push(value.text);
    for (const [key, child] of Object.entries(value)) {
      if (key !== "text" && typeof child === "object") visit(child);
    }
  };
  visit(page.blocks);
  return chunks.join("\n");
}

export function loadSourceEvidenceDataset(repoRoot) {
  const pages = [];
  const answers = [];
  for (let theme = 1; theme <= 4; theme += 1) {
    const bookRoot = path.join(repoRoot, "data/book/grade-11/themes", `theme-${theme}`, "pages");
    for (const name of fs.readdirSync(bookRoot).filter((item) => /^p\d+\.json$/u.test(item))) {
      const page = JSON.parse(fs.readFileSync(path.join(bookRoot, name), "utf8"));
      pages.push({ theme, printedPage: page.printed_page, text: cleanOcrListMarkers(collectPageText(page)), page });
    }
    const answerRoot = path.join(repoRoot, "data/grade-11/source/teacher-book", `theme-${theme}`);
    const index = JSON.parse(fs.readFileSync(path.join(answerRoot, "answer-bank.json"), "utf8"));
    for (const part of index.parts) {
      const sourcePath = path.join(answerRoot, part.path);
      const data = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
      for (const answer of data.entries ?? []) answers.push({ ...answer, __sourcePath: path.relative(repoRoot, sourcePath), __theme: theme });
    }
  }
  const intake = JSON.parse(fs.readFileSync(path.join(repoRoot, "data/grade-11/source/qr-media-intake-2026-10-08.json"), "utf8"));
  const registry = JSON.parse(fs.readFileSync(path.join(repoRoot, "data/grade-11/source/qr-sources.json"), "utf8"));
  const media = intake.records.map((record) => {
    const source = record.existing_source_id ? registry.sources.find((item) => item.source_id === record.existing_source_id) : null;
    const transcriptPath = record.transcript_path ?? source?.transcript_path;
    const item = {
      record,
      source,
      note: fs.readFileSync(path.join(repoRoot, record.review_notes_path), "utf8"),
      transcriptText: "",
      transcriptError: ""
    };
    if (record.spoken_audio_transcript === "verified") {
      if (!transcriptPath) {
        item.transcriptError = "verified transcript status has no transcript_path";
      } else {
        const absoluteTranscriptPath = path.resolve(repoRoot, transcriptPath);
        const repoPrefix = `${path.resolve(repoRoot)}${path.sep}`;
        if (!absoluteTranscriptPath.startsWith(repoPrefix)) {
          item.transcriptError = `transcript_path escapes repository: ${transcriptPath}`;
        } else if (!fs.existsSync(absoluteTranscriptPath) || !fs.statSync(absoluteTranscriptPath).isFile()) {
          item.transcriptError = `verified transcript file is missing: ${transcriptPath}`;
        } else {
          item.transcriptText = fs.readFileSync(absoluteTranscriptPath, "utf8");
          if (!item.transcriptText.trim()) item.transcriptError = `verified transcript file is empty: ${transcriptPath}`;
        }
      }
    }
    return item;
  });
  return { pages, answers, media };
}

function findBookQuote(quote, candidatePages) {
  const normalizedQuote = normalizeEvidenceText(stripQuoteCitation(quote));
  if (!normalizedQuote) return [];
  const matches = candidatePages.filter((page) => normalizeEvidenceText(page.text).includes(normalizedQuote));
  const sorted = [...candidatePages].sort((a, b) => a.printedPage - b.printedPage);
  for (let start = 0; start < sorted.length; start += 1) {
    for (let length = 2; length <= 4 && start + length <= sorted.length; length += 1) {
      const window = sorted.slice(start, start + length);
      if (window.some((page, index) => index > 0 && (page.theme !== window[0].theme || page.printedPage !== window[index - 1].printedPage + 1))) continue;
      if (normalizeEvidenceText(window.map((page) => page.text).join(" ")).includes(normalizedQuote)) {
        matches.push({ ...window[0], matchedPages: window.map((page) => page.printedPage) });
      }
    }
  }
  return matches;
}

const interleavedBookQuoteOverrides = new Map([
  ["T4-P254-Q02:0", {
    page: 254,
    fragments: [
      "Hayatın acıklı ve gülünç",
      "yönlerini bir arada yansıtan tiyatro",
      "türüdür. Konusunu tarihten"
    ],
    blockId: "G11-T4-P254-INFO01"
  }]
]);

function matchesInterleavedBookQuote(answer, quoteIndex, pages) {
  const rule = interleavedBookQuoteOverrides.get(`${answer.question_id}:${quoteIndex}`);
  if (!rule) return false;
  const page = pages.find((item) => item.printedPage === rule.page && item.theme === 4);
  const block = page?.page.blocks?.find((item) => item.id === rule.blockId);
  return Boolean(block && rule.fragments.every((fragment) => normalizeEvidenceText(block.text).includes(normalizeEvidenceText(fragment))));
}

function mediaEvidenceTexts(note) {
  const lines = asString(note).split(/\r?\n/u);
  const exactScreenHeader = lines.some((line) => /ekranda\s+birebir\s+görülen\s+ifade/iu.test(line));
  if (!exactScreenHeader) return [];
  const evidence = [];
  let inTable = false;
  for (const line of lines) {
    if (/^\s*\|/u.test(line)) {
      inTable = true;
      if (/---|yaklaşık\s+zaman/iu.test(line)) continue;
      const cells = line.split("|").map((cell) => cell.trim()).filter(Boolean);
      if (cells.length >= 2 && cells[0] !== "Yaklaşık zaman") evidence.push(cells[1]);
      continue;
    }
    if (inTable) break;
  }
  return evidence;
}

function verifiedMediaEvidenceTexts(item) {
  const screenText = mediaEvidenceTexts(item.note);
  if (item.record.spoken_audio_transcript !== "verified" || item.transcriptError || !item.transcriptText.trim()) return screenText;
  return [...screenText, item.transcriptText];
}

function resolveMediaReferences(locator, media) {
  const references = [];
  const filenameMatches = [...asString(locator).matchAll(/\b[A-Za-z0-9-]+\.mp4\b/giu)];
  for (const match of filenameMatches) {
    const name = match[0].toLocaleLowerCase("en-US");
    const candidates = media.filter((item) => item.record.file_name.toLocaleLowerCase("en-US") === name ||
      path.basename(item.source?.local_file?.path ?? "").toLocaleLowerCase("en-US") === name);
    references.push({ raw: match[0], index: match.index, candidates });
  }
  const ids = [...asString(locator).matchAll(/QR-EBA-([0-9a-f]{12,32})/giu)];
  for (const match of ids) {
    const prefix = match[1].toLocaleLowerCase("en-US");
    const candidates = media.filter((item) => {
      const qrId = item.record.book_qr?.eba_content_id?.toLocaleLowerCase("en-US") ?? "";
      const sourceId = item.source?.source_id?.replace(/^QR-EBA-/iu, "").toLocaleLowerCase("en-US") ?? "";
      return qrId.startsWith(prefix) || sourceId.startsWith(prefix);
    });
    references.push({ raw: match[0], index: match.index, candidates });
  }
  const fullIds = [...asString(locator).matchAll(/(?<![0-9a-f])([0-9a-f]{32})(?![0-9a-f])/giu)];
  for (const match of fullIds) {
    if (ids.some((id) => id[1].toLocaleLowerCase("en-US") === match[1].toLocaleLowerCase("en-US"))) continue;
    const id = match[1].toLocaleLowerCase("en-US");
    const candidates = media.filter((item) => item.record.book_qr?.eba_content_id?.toLocaleLowerCase("en-US") === id);
    references.push({ raw: match[1], index: match.index, candidates });
  }
  return references.sort((a, b) => a.index - b.index);
}

export function validateMediaEvidenceLink(answer, media) {
  const locator = asString(answer.source_locator);
  const citedPages = parsePrintedPageReferences(locator);
  const refs = resolveMediaReferences(locator, media);
  if (!refs.length) return [];
  const errors = [];
  const resolved = [];
  for (const ref of refs) {
    if (ref.candidates.length !== 1) {
      errors.push(`${answer.question_id}: media reference ${ref.raw} resolves to ${ref.candidates.length} intake records`);
      continue;
    }
    resolved.push({ ...ref, media: ref.candidates[0] });
  }
  if (errors.length) return errors;
  for (const ref of resolved) {
    const current = ref.media;
    if (current.source) {
      const used = current.source.usage_locations?.some((location) => location.question_ids?.includes(answer.question_id));
      const citedAsAuxiliary = /yardımcı/iu.test(locator) && current.source.usage_locations?.some((location) =>
        citedPages.includes(location.printed_page));
      if (!used && !citedAsAuxiliary) errors.push(`${answer.question_id}: ${current.source.source_id} does not list this question in its usage locations`);
      if (current.source.eba_content_id !== current.record.book_qr?.eba_content_id) {
        errors.push(`${answer.question_id}: registry EBA ID disagrees with the book QR ID`);
      }
      if (current.source.local_file?.sha256 !== current.record.sha256) {
        errors.push(`${answer.question_id}: registered media SHA-256 disagrees with intake file ${current.record.file_name}`);
      }
      if (!path.basename(current.source.local_file?.path ?? "")) {
        errors.push(`${answer.question_id}: ${current.source.source_id} has no registered media file`);
      }
    } else if (current.record.printed_page !== answer.printed_page && !citedPages.includes(current.record.printed_page)) {
      errors.push(`${answer.question_id}: provisional ${current.record.file_name} belongs to printed page ${current.record.printed_page}; cite that QR page when using it from page ${answer.printed_page}`);
    }
    if (!current.source && !current.record.linked_question_ids?.includes(answer.question_id)) {
      errors.push(`${answer.question_id}: provisional media ${current.record.file_name} does not list this question in linked_question_ids`);
    }
  }
  let segmentStart = 0;
  for (const segment of locator.split(/;/u)) {
    const start = locator.indexOf(segment, segmentStart);
    const end = start + segment.length;
    const segmentRefs = resolved.filter((ref) => ref.index >= start && ref.index < end);
    const filenames = segmentRefs.filter((ref) => /\.mp4$/iu.test(ref.raw));
    const identifiers = segmentRefs.filter((ref) => /QR-EBA-/iu.test(ref.raw) || /^[0-9a-f]{32}$/iu.test(ref.raw));
    for (const ref of filenames) {
      if (identifiers.length && !identifiers.some((candidate) => candidate.media === ref.media)) {
        errors.push(`${answer.question_id}: ${ref.raw} is paired with a different EBA identity`);
      }
    }
    segmentStart = end + 1;
  }
  return [...new Set(errors)];
}

export function validateAnswerEvidence(answer, { pages, media, filePath = answer.__sourcePath ?? "answer bank" }) {
  const errors = [];
  const locator = asString(answer.source_locator);
  const citedPageNumbers = parsePrintedPageReferences(locator);
  const theme = answer.__theme ?? Number(answer.question_id?.match(/^T(\d)/u)?.[1]);
  const themePages = pages.filter((page) => page.theme === theme);
  const citedPages = themePages.filter((page) => citedPageNumbers.includes(page.printedPage));
  for (let index = 0; index < (answer.evidence_quotes ?? []).length; index += 1) {
    const quote = answer.evidence_quotes[index];
    const matched = findBookQuote(quote, citedPages);
    if (matched.length || matchesInterleavedBookQuote(answer, index, citedPages)) continue;
    const allBookMatches = findBookQuote(quote, themePages);
    const refs = resolveMediaReferences(locator, media);
    const verifiedMediaMatches = refs.some((ref) => ref.candidates.length === 1 &&
      verifiedMediaEvidenceTexts(ref.candidates[0]).some((line) => normalizeEvidenceText(line).includes(normalizeEvidenceText(stripQuoteCitation(quote)))));
    if (verifiedMediaMatches) continue;
    const where = citedPageNumbers.length ? `cited printed pages ${citedPageNumbers.join(", ")}` : "a printed page in source_locator";
    const elsewherePages = [...new Set(allBookMatches.flatMap((page) => page.matchedPages ?? [page.printedPage]))];
    const elsewhere = allBookMatches.length ? `; text exists on printed page(s) ${elsewherePages.join(", ")} but not in the cited location` : "";
    errors.push(`${filePath}:${answer.question_id}: evidence_quotes[${index}] is absent from ${where}${elsewhere}; no verified media evidence matches it`);
  }
  const mediaRefs = resolveMediaReferences(locator, media);
  for (const ref of mediaRefs) {
    if (ref.candidates.length !== 1 || answer.entry_type !== "question_answer") continue;
    const item = ref.candidates[0];
    if (item.record.spoken_audio_transcript === "verified") {
      if (item.transcriptError) errors.push(`${filePath}:${answer.question_id}: ${ref.raw}: ${item.transcriptError}`);
      continue;
    }
    const hasExactScreenQuote = (answer.evidence_quotes ?? []).some((quote) =>
      verifiedMediaEvidenceTexts(item).some((line) => normalizeEvidenceText(line).includes(normalizeEvidenceText(stripQuoteCitation(quote)))));
    if (!hasExactScreenQuote) {
      errors.push(`${filePath}:${answer.question_id}: untranscribed media ${ref.raw} cannot support a verified question_answer without an exact, reviewed on-screen quote`);
    }
  }
  return [...errors, ...validateMediaEvidenceLink(answer, media)];
}

export function validatePresentationSourceEvidence(dataset) {
  const errors = dataset.answers.flatMap((answer) => validateAnswerEvidence(answer, dataset));
  const answersById = new Map(dataset.answers.map((answer) => [answer.question_id, answer]));
  for (const item of dataset.media) {
    for (const questionId of item.record.linked_question_ids ?? []) {
      const answer = answersById.get(questionId);
      if (!answer) {
        errors.push(`${item.record.file_name}: linked_question_ids contains unknown question ${questionId}`);
        continue;
      }
      const references = resolveMediaReferences(answer.source_locator, dataset.media);
      if (!references.some((ref) => ref.candidates.length === 1 && ref.candidates[0] === item)) {
        errors.push(`${item.record.file_name}: linked_question_ids contains ${questionId}, but its source_locator does not cite this media`);
      }
    }
  }
  return errors;
}
