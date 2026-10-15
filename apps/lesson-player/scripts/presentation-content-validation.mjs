import fs from "node:fs";
import path from "node:path";

const SUPPORTED_LAYOUTS = new Set([
  "assessment", "comparison", "process", "question", "reference", "structure", "vocabulary"
]);
const SUPPORTED_DENSITIES = new Set(["large", "comfortable", "compact"]);
const SUPPORTED_REVEALS = new Set(["answer", "dictionary", "evidence", "explanation", "guidance", "note"]);
const SUPPORTED_ANSWER_TYPES = new Set(["question_answer", "reference_answer", "performance_support", "source_limited"]);
const SUPPORTED_FLOW_KEYS = new Set([
  "additional_source_records", "lesson_id", "lesson_slug", "printed_page_range", "required_source_range",
  "schema_version", "steps", "subtitle", "theme_id", "title"
]);
const SUPPORTED_STEP_KEYS = new Set([
  "answer_id", "content", "density", "id", "layout", "presentation", "prompt", "prompt_mode", "reveal",
  "reveal_order", "sections_layout", "source_record_id", "thinking"
]);
const SUPPORTED_CONTENT_KEYS = new Set([
  "claims", "excerpts", "images", "item_offset", "items", "lead", "note", "options",
  "options_on_next_click", "rubric", "scale", "sections", "sources", "table", "table_review", "tables", "venn"
]);
const SUPPORTED_ANSWER_KEYS = new Set([
  "activity_name", "answer", "answer_sections", "derived_from", "dictionary_terms", "entry_type",
  "evidence_quotes", "explanation", "guidance", "in_textbook_sequence", "printed_page", "prompt_summary",
  "question_id", "question_no", "source_locator", "source_order_item", "teacher_support"
]);

function fail(filePath, location, field, expected) {
  const file = filePath ? path.relative(process.cwd(), filePath) || filePath : "presentation data";
  throw new Error(`[presentation-data] ${file} :: ${location}.${field}: ${expected}`);
}

export function readPresentationJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    fail(filePath, "JSON", "document", error.message);
  }
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requireRecord(value, filePath, location, field) {
  if (!isRecord(value)) fail(filePath, location, field, "expected an object");
}

function requireString(value, filePath, location, field, { nonEmpty = true } = {}) {
  if (typeof value !== "string" || (nonEmpty && !value.trim())) {
    fail(filePath, location, field, nonEmpty ? "expected a non-empty string" : "expected a string");
  }
}

function requireArray(value, filePath, location, field, { nonEmpty = false } = {}) {
  if (!Array.isArray(value) || (nonEmpty && value.length === 0)) {
    fail(filePath, location, field, nonEmpty ? "expected a non-empty array" : "expected an array");
  }
}

function rejectUnknownKeys(value, allowed, filePath, location) {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) fail(filePath, location, key, "unsupported field");
  }
}

function validatePageRange(value, filePath, location, field) {
  requireString(value, filePath, location, field);
  const match = /^\s*(\d+)\s*(?:[-–—]\s*(\d+)\s*)?$/.exec(value);
  if (!match || Number(match[2] ?? match[1]) < Number(match[1])) {
    fail(filePath, location, field, "expected a printed page or ascending page range");
  }
}

function validateStringArray(value, filePath, location, field, { nonEmpty = false } = {}) {
  requireArray(value, filePath, location, field, { nonEmpty });
  for (const [index, item] of value.entries()) requireString(item, filePath, `${location}.${field}[${index}]`, "value");
}

function validateLinkSource(source, filePath, location) {
  requireRecord(source, filePath, location, "source");
  requireString(source.label, filePath, location, "label");
  requireString(source.url, filePath, location, "url");
  if (source.download !== undefined && source.download !== true) {
    fail(filePath, location, "download", "only true is supported for local assessment downloads");
  }
  const localDownload = source.download === true &&
    /^assets\/assessment-documents\/[A-Za-z0-9._-]+\.(?:docx|xlsx)$/i.test(source.url);
  if (!localDownload) {
    let url;
    try { url = new URL(source.url); } catch { /* reported below with the field path */ }
    if (!url || url.protocol !== "https:") {
      fail(filePath, location, "url", "expected a valid HTTPS URL or a supported local download path");
    }
  }
  rejectUnknownKeys(source, new Set(["download", "label", "url"]), filePath, location);
}

function validateTable(table, filePath, location) {
  requireRecord(table, filePath, location, "table");
  requireArray(table.columns, filePath, location, "columns", { nonEmpty: true });
  requireArray(table.rows, filePath, location, "rows", { nonEmpty: true });
  if (table.title !== undefined) requireString(table.title, filePath, location, "title");
  if (table.review !== undefined && !["checks", "criteria"].includes(table.review)) {
    fail(filePath, location, "review", "expected a supported table review mode");
  }
  if (table.reveal_by_row !== undefined && typeof table.reveal_by_row !== "boolean") {
    fail(filePath, location, "reveal_by_row", "expected a boolean");
  }
  if (table.review_reasons !== undefined) validateStringArray(table.review_reasons, filePath, location, "review_reasons");
  rejectUnknownKeys(table, new Set(["columns", "review", "review_reasons", "reveal_by_row", "rows", "title"]), filePath, location);
}

function validateContent(content, filePath, location) {
  const contentLocation = `${location}.content`;
  requireRecord(content, filePath, location, "content");
  rejectUnknownKeys(content, SUPPORTED_CONTENT_KEYS, filePath, contentLocation);
  for (const field of ["lead", "note"]) {
    if (content[field] !== undefined) requireString(content[field], filePath, contentLocation, field, { nonEmpty: false });
  }
  for (const field of ["items", "scale"]) {
    if (content[field] !== undefined) validateStringArray(content[field], filePath, contentLocation, field);
  }
  if (content.item_offset !== undefined && (!Number.isInteger(content.item_offset) || content.item_offset < 0)) {
    fail(filePath, contentLocation, "item_offset", "expected a non-negative integer");
  }
  if (content.options_on_next_click !== undefined && typeof content.options_on_next_click !== "boolean") {
    fail(filePath, contentLocation, "options_on_next_click", "expected a boolean");
  }
  if (content.sections !== undefined) {
    requireArray(content.sections, filePath, contentLocation, "sections");
    for (const [index, section] of content.sections.entries()) {
      const where = `${location}.content.sections[${index}]`;
      requireRecord(section, filePath, where, "value");
      requireString(section.title, filePath, where, "title");
      requireString(section.body, filePath, where, "body", { nonEmpty: false });
      rejectUnknownKeys(section, new Set(["body", "title"]), filePath, where);
    }
  }
  if (content.sources !== undefined) {
    requireArray(content.sources, filePath, contentLocation, "sources");
    content.sources.forEach((source, index) => validateLinkSource(source, filePath, `${location}.content.sources[${index}]`));
  }
  if (content.images !== undefined) {
    requireArray(content.images, filePath, contentLocation, "images");
    for (const [index, image] of content.images.entries()) {
      const where = `${location}.content.images[${index}]`;
      requireRecord(image, filePath, where, "value");
      requireString(image.src, filePath, where, "src");
      requireString(image.alt, filePath, where, "alt");
      if (!/^assets\/[A-Za-z0-9._-]+$/.test(image.src)) fail(filePath, where, "src", "expected a local presentation asset path");
      if (image.caption !== undefined) requireString(image.caption, filePath, where, "caption", { nonEmpty: false });
      rejectUnknownKeys(image, new Set(["alt", "caption", "src"]), filePath, where);
    }
  }
  if (content.options !== undefined) {
    requireArray(content.options, filePath, contentLocation, "options", { nonEmpty: true });
    for (const [index, option] of content.options.entries()) {
      const where = `${location}.content.options[${index}]`;
      requireRecord(option, filePath, where, "value");
      requireString(option.label, filePath, where, "label");
      requireString(option.text, filePath, where, "text");
      rejectUnknownKeys(option, new Set(["label", "text"]), filePath, where);
    }
  }
  if (content.tables !== undefined) {
    requireArray(content.tables, filePath, contentLocation, "tables", { nonEmpty: true });
    content.tables.forEach((table, index) => validateTable(table, filePath, `${location}.content.tables[${index}]`));
  }
  if (content.table !== undefined) validateTable(content.table, filePath, `${location}.content.table`);
  if (content.table_review !== undefined) {
    requireRecord(content.table_review, filePath, contentLocation, "table_review");
    requireString(content.table_review.mode, filePath, `${location}.content.table_review`, "mode");
    requireString(content.table_review.target, filePath, `${location}.content.table_review`, "target");
    rejectUnknownKeys(content.table_review, new Set(["mode", "target"]), filePath, `${location}.content.table_review`);
  }
  if (content.claims !== undefined) {
    requireRecord(content.claims, filePath, contentLocation, "claims");
    requireString(content.claims.thesis, filePath, `${location}.content.claims`, "thesis");
    requireString(content.claims.antithesis, filePath, `${location}.content.claims`, "antithesis");
    rejectUnknownKeys(content.claims, new Set(["antithesis", "thesis"]), filePath, `${location}.content.claims`);
  }
  if (content.excerpts !== undefined) {
    requireArray(content.excerpts, filePath, contentLocation, "excerpts", { nonEmpty: true });
    for (const [index, excerpt] of content.excerpts.entries()) {
      const where = `${location}.content.excerpts[${index}]`;
      requireRecord(excerpt, filePath, where, "value");
      requireString(excerpt.label, filePath, where, "label");
      requireString(excerpt.text, filePath, where, "text");
      rejectUnknownKeys(excerpt, new Set(["label", "text"]), filePath, where);
    }
  }
  if (content.venn !== undefined) {
    requireRecord(content.venn, filePath, contentLocation, "venn");
    requireString(content.venn.thesis, filePath, `${location}.content.venn`, "thesis");
    requireString(content.venn.antithesis, filePath, `${location}.content.venn`, "antithesis");
    validateStringArray(content.venn.labels, filePath, `${location}.content.venn`, "labels", { nonEmpty: true });
    if (content.venn.labels.length !== 3) fail(filePath, `${location}.content.venn`, "labels", "expected the three Venn regions");
    rejectUnknownKeys(content.venn, new Set(["antithesis", "labels", "thesis"]), filePath, `${location}.content.venn`);
  }
  if (content.rubric !== undefined) {
    requireRecord(content.rubric, filePath, contentLocation, "rubric");
    requireArray(content.rubric.columns, filePath, `${location}.content.rubric`, "columns", { nonEmpty: true });
    requireArray(content.rubric.rows, filePath, `${location}.content.rubric`, "rows", { nonEmpty: true });
    for (const field of ["min_points", "total_points"]) {
      if (content.rubric[field] !== undefined && (!Number.isFinite(content.rubric[field]) || content.rubric[field] < 0)) {
        fail(filePath, `${location}.content.rubric`, field, "expected a non-negative number");
      }
    }
    rejectUnknownKeys(content.rubric, new Set(["columns", "min_points", "rows", "total_points"]), filePath, `${location}.content.rubric`);
  }
}

export function validatePresentationFlowSchema(flow, { filePath = "presentation flow", themeNumber } = {}) {
  requireRecord(flow, filePath, "flow", "value");
  rejectUnknownKeys(flow, SUPPORTED_FLOW_KEYS, filePath, "flow");
  if (flow.schema_version !== undefined && !["0.1.0", "0.2.0"].includes(flow.schema_version)) {
    fail(filePath, "flow", "schema_version", "expected a supported flow schema version");
  }
  if (flow.theme_id !== undefined) {
    requireString(flow.theme_id, filePath, "flow", "theme_id");
    if (themeNumber && flow.theme_id !== `TEMA_0${themeNumber}`) fail(filePath, "flow", "theme_id", `expected TEMA_0${themeNumber}`);
  }
  for (const field of ["lesson_id", "title", "subtitle"]) requireString(flow[field], filePath, "flow", field);
  if (flow.lesson_slug !== undefined) requireString(flow.lesson_slug, filePath, "flow", "lesson_slug");
  validatePageRange(flow.printed_page_range, filePath, "flow", "printed_page_range");
  requireRecord(flow.required_source_range, filePath, "flow", "required_source_range");
  requireString(flow.required_source_range.from, filePath, "flow.required_source_range", "from");
  requireString(flow.required_source_range.to, filePath, "flow.required_source_range", "to");
  if (!/^T\d{2}-S\d+$/.test(flow.required_source_range.from) || !/^T\d{2}-S\d+$/.test(flow.required_source_range.to)) {
    fail(filePath, "flow.required_source_range", "from/to", "expected source record IDs");
  }
  if (flow.required_source_range.from.slice(0, 3) !== flow.required_source_range.to.slice(0, 3)) {
    fail(filePath, "flow.required_source_range", "from/to", "source range must stay within one theme");
  }
  rejectUnknownKeys(flow.required_source_range, new Set(["from", "to"]), filePath, "flow.required_source_range");
  requireArray(flow.steps, filePath, "flow", "steps", { nonEmpty: true });
  const stepIds = new Set();
  for (const [index, step] of flow.steps.entries()) {
    const location = `flow.steps[${index}]${step?.id ? ` (${step.id})` : ""}`;
    requireRecord(step, filePath, location, "value");
    rejectUnknownKeys(step, SUPPORTED_STEP_KEYS, filePath, location);
    requireString(step.id, filePath, location, "id");
    if (stepIds.has(step.id)) fail(filePath, location, "id", `duplicate step ID ${step.id}`);
    stepIds.add(step.id);
    requireString(step.source_record_id, filePath, location, "source_record_id");
    if (!/^T\d{2}-S\d+$/.test(step.source_record_id)) fail(filePath, location, "source_record_id", "expected a source record ID");
    if (step.answer_id !== undefined) requireString(step.answer_id, filePath, location, "answer_id");
    if (step.layout !== undefined && !SUPPORTED_LAYOUTS.has(step.layout)) {
      fail(filePath, location, "layout", `unsupported presentation type ${JSON.stringify(step.layout)}`);
    }
    if (step.layout === undefined) fail(filePath, location, "layout", "required supported presentation type is missing");
    if (step.density !== undefined && !SUPPORTED_DENSITIES.has(step.density)) fail(filePath, location, "density", "unsupported density");
    if (step.sections_layout !== undefined && !["grid", "two-column", "stacked", "letter"].includes(step.sections_layout)) {
      fail(filePath, location, "sections_layout", "unsupported sections layout");
    }
    for (const field of ["prompt", "thinking", "prompt_mode"]) {
      if (step[field] !== undefined) requireString(step[field], filePath, location, field, { nonEmpty: field !== "prompt" });
    }
    for (const field of ["reveal", "reveal_order"]) {
      if (step[field] === undefined) continue;
      validateStringArray(step[field], filePath, location, field);
      if (new Set(step[field]).size !== step[field].length) fail(filePath, location, field, "reveal layers must be unique");
      for (const [revealIndex, layer] of step[field].entries()) {
        if (!SUPPORTED_REVEALS.has(layer)) fail(filePath, `${location}.${field}[${revealIndex}]`, "value", `unsupported reveal layer ${layer}`);
      }
    }
    if (step.content !== undefined) validateContent(step.content, filePath, location);
    if (step.presentation !== undefined) requireRecord(step.presentation, filePath, location, "presentation");
    if (!step.answer_id && !step.content) fail(filePath, location, "answer_id/content", "at least one answer link or authored content block is required");
  }
  if (flow.additional_source_records !== undefined) {
    validateStringArray(flow.additional_source_records, filePath, "flow", "additional_source_records");
    if (new Set(flow.additional_source_records).size !== flow.additional_source_records.length) {
      fail(filePath, "flow", "additional_source_records", "source record IDs must be unique");
    }
  }
}

export function validateAnswerBankEntry(entry, { filePath = "answer bank", index = 0, themeNumber } = {}) {
  const location = `entries[${index}]${entry?.question_id ? ` (${entry.question_id})` : ""}`;
  requireRecord(entry, filePath, location, "value");
  rejectUnknownKeys(entry, SUPPORTED_ANSWER_KEYS, filePath, location);
  requireString(entry.question_id, filePath, location, "question_id");
  if (themeNumber && !entry.question_id.startsWith(`T${themeNumber}-`)) fail(filePath, location, "question_id", `expected a Theme ${themeNumber} answer ID`);
  if (!SUPPORTED_ANSWER_TYPES.has(entry.entry_type)) fail(filePath, location, "entry_type", "unsupported answer type");
  if (!Number.isInteger(entry.printed_page) || entry.printed_page < 1) fail(filePath, location, "printed_page", "expected a positive integer");
  requireString(entry.prompt_summary, filePath, location, "prompt_summary");
  if (entry.answer !== undefined) requireString(entry.answer, filePath, location, "answer", { nonEmpty: false });
  if (entry.question_no !== undefined) requireString(entry.question_no, filePath, location, "question_no");
  for (const field of ["activity_name", "derived_from", "source_locator", "guidance", "explanation"]) {
    if (entry[field] !== undefined) requireString(entry[field], filePath, location, field, { nonEmpty: field !== "explanation" });
  }
  for (const field of ["source_order_item", "teacher_support", "in_textbook_sequence"]) {
    if (entry[field] !== undefined && typeof entry[field] !== "boolean") fail(filePath, location, field, "expected a boolean");
  }
  if (entry.answer_sections !== undefined) {
    const sections = entry.answer_sections;
    if (!isRecord(sections) && !Array.isArray(sections)) fail(filePath, location, "answer_sections", "expected an object or array");
    const values = Array.isArray(sections) ? sections : Object.values(sections);
    if (!values.length) fail(filePath, location, "answer_sections", "expected at least one response section");
    const validNestedText = (value) => typeof value === "string" || (Array.isArray(value) && value.every(validNestedText)) ||
      (isRecord(value) && Object.values(value).every(validNestedText));
    if (!values.every(validNestedText)) fail(filePath, location, "answer_sections", "sections must contain text, arrays, or keyed text groups");
  }
  if (entry.evidence_quotes !== undefined) validateStringArray(entry.evidence_quotes, filePath, location, "evidence_quotes");
  if (entry.dictionary_terms !== undefined) {
    requireArray(entry.dictionary_terms, filePath, location, "dictionary_terms");
    for (const [termIndex, term] of entry.dictionary_terms.entries()) {
      const where = `${location}.dictionary_terms[${termIndex}]`;
      requireRecord(term, filePath, where, "value");
      requireString(term.term, filePath, where, "term");
      requireString(term.meaning, filePath, where, "meaning");
      if (term.source !== undefined) requireString(term.source, filePath, where, "source");
      rejectUnknownKeys(term, new Set(["meaning", "source", "term"]), filePath, where);
    }
  }
  if (!entry.answer?.trim() && !entry.answer_sections) fail(filePath, location, "answer/answer_sections", "a response or structured answer is required");
}

export function validateAnswerBankPart(part, { filePath = "answer-bank part", themeNumber, themeTitle } = {}) {
  requireRecord(part, filePath, "answer-bank-part", "value");
  rejectUnknownKeys(part, new Set(["entries", "part_id", "printed_page_range", "schema_version", "theme_id", "theme_title"]), filePath, "answer-bank-part");
  if (part.schema_version !== "2.0.0") fail(filePath, "answer-bank-part", "schema_version", "expected supported version 2.0.0");
  if (part.theme_id !== `TEMA_0${themeNumber}`) fail(filePath, "answer-bank-part", "theme_id", `expected TEMA_0${themeNumber}`);
  if (part.theme_title !== undefined) {
    requireString(part.theme_title, filePath, "answer-bank-part", "theme_title");
    if (themeTitle && part.theme_title !== themeTitle) fail(filePath, "answer-bank-part", "theme_title", "must match answer-bank theme_title");
  }
  if (typeof part.part_id !== "string" || !/^PART_\d+[A-Z]?$/.test(part.part_id)) fail(filePath, "answer-bank-part", "part_id", "expected a PART_n or PART_nA identifier");
  validatePageRange(part.printed_page_range, filePath, "answer-bank-part", "printed_page_range");
  requireArray(part.entries, filePath, "answer-bank-part", "entries", { nonEmpty: true });
  const match = /^\s*(\d+)\s*(?:[-–—]\s*(\d+)\s*)?$/.exec(part.printed_page_range);
  const pageFrom = Number(match[1]);
  const pageTo = Number(match[2] ?? match[1]);
  for (const [index, entry] of part.entries.entries()) {
    if (!Number.isInteger(entry?.printed_page) || entry.printed_page < pageFrom || entry.printed_page > pageTo) {
      fail(filePath, `entries[${index}]${entry?.question_id ? ` (${entry.question_id})` : ""}`, "printed_page", `expected a page within part range ${part.printed_page_range}`);
    }
  }
}

export function validateAnswerBankIndex(index, { filePath = "answer-bank.json", themeNumber } = {}) {
  requireRecord(index, filePath, "answer-bank", "value");
  rejectUnknownKeys(index, new Set([
    "block_standard", "course_id", "coverage", "document_type", "grade", "parts", "quality_standard",
    "rendering_contract", "schema_version", "source_policy", "status", "theme_id", "theme_title"
  ]), filePath, "answer-bank");
  if (index.schema_version !== "2.0.0") fail(filePath, "answer-bank", "schema_version", "expected supported version 2.0.0");
  if (index.document_type !== "OGRETMEN_REHBERI_ANSWER_BANK_INDEX") fail(filePath, "answer-bank", "document_type", "unsupported answer-bank document type");
  if (index.theme_id !== `TEMA_0${themeNumber}`) fail(filePath, "answer-bank", "theme_id", `expected TEMA_0${themeNumber}`);
  if (index.course_id !== "TDE_11") fail(filePath, "answer-bank", "course_id", "expected TDE_11");
  if (index.grade !== 11) fail(filePath, "answer-bank", "grade", "expected grade 11");
  requireString(index.theme_title, filePath, "answer-bank", "theme_title");
  requireString(index.status, filePath, "answer-bank", "status");
  requireString(index.quality_standard, filePath, "answer-bank", "quality_standard");
  if (index.block_standard !== undefined) requireString(index.block_standard, filePath, "answer-bank", "block_standard");
  requireRecord(index.source_policy, filePath, "answer-bank", "source_policy");
  rejectUnknownKeys(index.source_policy, new Set([
    "imported_question_inventory_used_as_completeness_source", "legacy_answer_bank_reused", "note", "primary_source"
  ]), filePath, "answer-bank.source_policy");
  for (const field of ["imported_question_inventory_used_as_completeness_source", "legacy_answer_bank_reused"]) {
    if (typeof index.source_policy[field] !== "boolean") fail(filePath, "answer-bank.source_policy", field, "expected a boolean");
  }
  requireString(index.source_policy.primary_source, filePath, "answer-bank.source_policy", "primary_source");
  if (index.source_policy.note !== undefined) requireString(index.source_policy.note, filePath, "answer-bank.source_policy", "note");
  requireRecord(index.coverage, filePath, "answer-bank", "coverage");
  rejectUnknownKeys(index.coverage, new Set([
    "entry_count", "next_printed_page", "next_scope", "printed_page_range", "scope", "source_limited_entries"
  ]), filePath, "answer-bank.coverage");
  if (!Number.isInteger(index.coverage.entry_count) || index.coverage.entry_count < 0) fail(filePath, "answer-bank.coverage", "entry_count", "expected a non-negative integer");
  if (!Number.isInteger(index.coverage.source_limited_entries) || index.coverage.source_limited_entries < 0) fail(filePath, "answer-bank.coverage", "source_limited_entries", "expected a non-negative integer");
  if (index.coverage.printed_page_range !== undefined) validatePageRange(index.coverage.printed_page_range, filePath, "answer-bank.coverage", "printed_page_range");
  for (const field of ["scope", "next_scope"]) {
    if (index.coverage[field] !== undefined) requireString(index.coverage[field], filePath, "answer-bank.coverage", field);
  }
  if (index.coverage.next_printed_page !== undefined && index.coverage.next_printed_page !== null &&
    (!Number.isInteger(index.coverage.next_printed_page) || index.coverage.next_printed_page < 1)) {
    fail(filePath, "answer-bank.coverage", "next_printed_page", "expected a positive integer");
  }
  requireRecord(index.rendering_contract, filePath, "answer-bank", "rendering_contract");
  rejectUnknownKeys(index.rendering_contract, new Set(["answer_sections", "evidence_quotes", "explanation", "guidance"]), filePath, "answer-bank.rendering_contract");
  for (const [field, value] of Object.entries(index.rendering_contract)) requireString(value, filePath, "answer-bank.rendering_contract", field);
  requireArray(index.parts, filePath, "answer-bank", "parts", { nonEmpty: true });
  const paths = new Set();
  for (const [partIndex, part] of index.parts.entries()) {
    const location = `answer-bank.parts[${partIndex}]`;
    requireRecord(part, filePath, location, "value");
    requireString(part.path, filePath, location, "path");
    if (path.isAbsolute(part.path) || part.path.split(/[\\/]/).includes("..")) fail(filePath, location, "path", "must stay inside the theme answer-bank directory");
    if (paths.has(part.path)) fail(filePath, location, "path", "duplicate answer-bank part path");
    paths.add(part.path);
    if (!Number.isInteger(part.entries) || part.entries < 0) fail(filePath, location, "entries", "expected a non-negative integer");
    rejectUnknownKeys(part, new Set(["entries", "path"]), filePath, location);
  }
}

export function validateSourceIndex(index, { filePath = "source-index.json", themeNumber } = {}) {
  requireRecord(index, filePath, "source-index", "value");
  rejectUnknownKeys(index, new Set([
    "answer_bank_status", "answer_linkage_policy", "authority", "course_id", "counts", "document_type",
    "legacy_answer_refs_removed", "policy", "records", "schema_version", "theme_id"
  ]), filePath, "source-index");
  if (index.schema_version !== "1.0.0") fail(filePath, "source-index", "schema_version", "expected supported version 1.0.0");
  if (index.document_type !== "TYMM_TEACHER_BOOK_SOURCE_INDEX") fail(filePath, "source-index", "document_type", "unsupported source index document type");
  if (index.theme_id !== `TEMA_0${themeNumber}`) fail(filePath, "source-index", "theme_id", `expected TEMA_0${themeNumber}`);
  if (index.course_id !== "TDE_11") fail(filePath, "source-index", "course_id", "expected TDE_11");
  requireString(index.authority, filePath, "source-index", "authority");
  requireString(index.policy, filePath, "source-index", "policy");
  if (index.answer_linkage_policy !== undefined) requireString(index.answer_linkage_policy, filePath, "source-index", "answer_linkage_policy");
  if (typeof index.legacy_answer_refs_removed !== "boolean") fail(filePath, "source-index", "legacy_answer_refs_removed", "expected a boolean");
  requireString(index.answer_bank_status, filePath, "source-index", "answer_bank_status");
  requireRecord(index.counts, filePath, "source-index", "counts");
  rejectUnknownKeys(index.counts, new Set(["linked_answers", "records", "verified_records"]), filePath, "source-index.counts");
  requireArray(index.records, filePath, "source-index", "records", { nonEmpty: true });
  const sourceIds = new Set();
  for (const [recordIndex, record] of index.records.entries()) {
    const location = `source-index.records[${recordIndex}]${record?.source_record_id ? ` (${record.source_record_id})` : ""}`;
    requireRecord(record, filePath, location, "value");
    requireString(record.source_record_id, filePath, location, "source_record_id");
    if (sourceIds.has(record.source_record_id)) fail(filePath, location, "source_record_id", `duplicate source record ${record.source_record_id}`);
    sourceIds.add(record.source_record_id);
    if (!new RegExp(`^T0${themeNumber}-S\\d+$`).test(record.source_record_id)) fail(filePath, location, "source_record_id", `expected a Theme ${themeNumber} source ID`);
    if (record.theme_id !== index.theme_id) fail(filePath, location, "theme_id", "must match the source index theme");
    validatePageRange(record.printed_page_range, filePath, location, "printed_page_range");
    for (const field of ["book_heading", "task_type", "rights_mode", "source_locator", "source_status"]) requireString(record[field], filePath, location, field);
    for (const field of ["prompt", "prompt_mode"]) {
      if (record[field] !== undefined) requireString(record[field], filePath, location, field);
    }
    if (!new Set(["VERIFIED", "LIMITED", "UNVERIFIED"]).has(record.source_status)) fail(filePath, location, "source_status", "unsupported source status");
    rejectUnknownKeys(record, new Set(["book_heading", "printed_page_range", "prompt", "prompt_mode", "rights_mode", "source_locator", "source_record_id", "source_status", "task_type", "theme_id"]), filePath, location);
  }
  if (!Number.isInteger(index.counts.records) || index.counts.records < 0) fail(filePath, "source-index.counts", "records", "expected a non-negative integer");
  for (const field of ["linked_answers", "verified_records"]) {
    if (index.counts[field] !== undefined && (!Number.isInteger(index.counts[field]) || index.counts[field] < 0)) {
      fail(filePath, "source-index.counts", field, "expected a non-negative integer");
    }
  }
}

export function validateFlowStepReferences(step, { sourceById, answerById, filePath = "presentation flow", stepIndex = 0 } = {}) {
  const location = `flow.steps[${stepIndex}] (${step.id})`;
  const source = sourceById.get(step.source_record_id);
  if (!source) fail(filePath, location, "source_record_id", `unknown source record ${step.source_record_id}`);
  let answer = null;
  if (step.answer_id !== undefined) {
    answer = answerById.get(step.answer_id);
    if (!answer) fail(filePath, location, "answer_id", `unknown answer record ${step.answer_id}`);
    const stepQuestion = /^s(\d+)-q0*(\d+)$/i.exec(step.id);
    const answerQuestion = /-P(\d+)-Q0*(\d+)$/i.exec(step.answer_id);
    if (stepQuestion && answerQuestion &&
      (stepQuestion[1] !== answerQuestion[1] || stepQuestion[2] !== answerQuestion[2])) {
      fail(filePath, location, "answer_id", `${step.id} must map to the same printed page and question number; got ${step.answer_id}`);
    }
    const match = /^\s*(\d+)\s*(?:[-–—]\s*(\d+)\s*)?$/.exec(source.printed_page_range);
    const pageFrom = Number(match?.[1]);
    const pageTo = Number(match?.[2] ?? match?.[1]);
    if (answer.printed_page < pageFrom || answer.printed_page > pageTo) {
      fail(filePath, location, "answer_id", `${step.answer_id} is on printed page ${answer.printed_page}, outside source record ${step.source_record_id} range ${source.printed_page_range}`);
    }
  }
  return { source, answer };
}
