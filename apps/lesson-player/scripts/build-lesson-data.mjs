import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "..");
const repoRoot = path.resolve(appRoot, "../..");

const themeBase = path.join(
  repoRoot,
  "data/grade-11/source/teacher-book/theme-1"
);
const flowPath = path.join(
  repoRoot,
  "data/grade-11/presentation/theme-1/karagoz-flow.json"
);
const outputPath = path.join(appRoot, "src/generated/karagoz.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function fail(message) {
  throw new Error(`Lesson data build failed: ${message}`);
}

function sourceOrdinal(id) {
  const match = /^T01-S(\d+)$/.exec(id);
  if (!match) fail(`Invalid source_record_id: ${id}`);
  return Number(match[1]);
}

function pageBounds(value) {
  const normalized = String(value).replace(/[–—]/g, "-").trim();
  const parts = normalized.split("-").map((part) => Number(part.trim()));
  if (!parts.length || parts.some(Number.isNaN)) {
    fail(`Invalid page range: ${value}`);
  }
  return {
    from: parts[0],
    to: parts.length > 1 ? parts[1] : parts[0]
  };
}

const flow = readJson(flowPath);
const sourceIndex = readJson(path.join(themeBase, "source-index.json"));
const answerIndex = readJson(path.join(themeBase, "answer-bank.json"));

const answers = [];
for (const part of answerIndex.parts) {
  const payload = readJson(path.join(themeBase, part.path));
  answers.push(...(payload.entries ?? []));
}

const sourceById = new Map(
  sourceIndex.records.map((record) => [record.source_record_id, record])
);
const answerById = new Map(
  answers.map((entry) => [entry.question_id, entry])
);

if (sourceById.size !== sourceIndex.records.length) {
  fail("Duplicate source_record_id detected");
}
if (answerById.size !== answers.length) {
  fail("Duplicate question_id detected");
}

const seenStepIds = new Set();
const seenAnswerIds = new Map();
const seenSourceIds = new Set();

const answerStepCountBySource = new Map();
for (const step of flow.steps) {
  if (!step.answer_id) continue;
  answerStepCountBySource.set(
    step.source_record_id,
    (answerStepCountBySource.get(step.source_record_id) ?? 0) + 1
  );
}

function resolveDisplayPrompt(step, source, answer) {
  if (step.prompt?.trim()) {
    return { text: step.prompt.trim(), mode: "FLOW_OVERRIDE" };
  }

  const sourceIsUnambiguous =
    source.prompt?.trim() &&
    (answerStepCountBySource.get(source.source_record_id) ?? 0) === 1;

  if (sourceIsUnambiguous) {
    return {
      text: source.prompt.trim().replace(/^Soru\s+\d+\s+[—-]\s+/i, ""),
      mode: source.prompt_mode ?? "SOURCE_PROMPT"
    };
  }

  if (answer?.prompt_summary?.trim()) {
    return { text: answer.prompt_summary.trim(), mode: "ANSWER_SUMMARY" };
  }

  return {
    text: step.content?.lead ?? source.prompt ?? source.book_heading,
    mode: "SOURCE_OR_CONTENT"
  };
}

const steps = flow.steps.map((step) => {
  if (seenStepIds.has(step.id)) {
    fail(`Duplicate lesson step id: ${step.id}`);
  }
  seenStepIds.add(step.id);

  const source = sourceById.get(step.source_record_id);
  if (!source) {
    fail(`Unknown source_record_id in flow: ${step.source_record_id}`);
  }
  seenSourceIds.add(step.source_record_id);

  let answer = null;
  if (step.answer_id) {
    answer = answerById.get(step.answer_id);
    if (!answer) {
      fail(`Unknown answer_id in flow: ${step.answer_id}`);
    }

    const count = (seenAnswerIds.get(step.answer_id) ?? 0) + 1;
    seenAnswerIds.set(step.answer_id, count);
    if (count > 1) {
      fail(`Answer entry used more than once: ${step.answer_id}`);
    }

    const sourcePages = pageBounds(source.printed_page_range);
    if (
      answer.printed_page < sourcePages.from ||
      answer.printed_page > sourcePages.to
    ) {
      fail(
        `Page mismatch: ${step.answer_id} is s.${answer.printed_page} but ` +
        `${step.source_record_id} covers ${source.printed_page_range}`
      );
    }

    if (
      step.layout === "vocabulary" &&
      (!answer.answer_sections ||
        Array.isArray(answer.answer_sections) ||
        Object.keys(answer.answer_sections).length === 0)
    ) {
      fail(`Vocabulary step has no structured definitions: ${step.id}`);
    }

    if (!answer.prompt_summary?.trim()) {
      fail(`Empty prompt_summary: ${step.answer_id}`);
    }

    if (!answer.answer?.trim()) {
      fail(`Empty answer: ${step.answer_id}`);
    }
  } else if (!step.content) {
    fail(`Step has neither answer_id nor content: ${step.id}`);
  }

  const displayPrompt = resolveDisplayPrompt(step, source, answer);

  return {
    id: step.id,
    layout: step.layout,
    display_prompt: displayPrompt.text,
    display_prompt_mode: displayPrompt.mode,
    source,
    answer,
    content: step.content ?? null
  };
});

const lessonPages = pageBounds(flow.printed_page_range);
const expectedAnswers = answers.filter(
  (entry) =>
    entry.printed_page >= lessonPages.from &&
    entry.printed_page <= lessonPages.to
);

for (const entry of expectedAnswers) {
  if (!seenAnswerIds.has(entry.question_id)) {
    fail(
      `Answer-bank entry in lesson range is not represented: ${entry.question_id}`
    );
  }
}

if (seenAnswerIds.size !== expectedAnswers.length) {
  fail(
    `Answer coverage mismatch: expected ${expectedAnswers.length}, got ${seenAnswerIds.size}`
  );
}

const fromOrdinal = sourceOrdinal(flow.required_source_range.from);
const toOrdinal = sourceOrdinal(flow.required_source_range.to);
const requiredSources = sourceIndex.records.filter((record) => {
  const ordinal = sourceOrdinal(record.source_record_id);
  return ordinal >= fromOrdinal && ordinal <= toOrdinal;
});

for (const record of requiredSources) {
  if (!seenSourceIds.has(record.source_record_id)) {
    fail(
      `Source-index record in Karagöz range is not represented: ${record.source_record_id}`
    );
  }
}

for (const step of steps) {
  const answer = step.answer;
  if (!answer) continue;

  if (answer.guidance && !("guidance" in answer)) {
    fail(`Guidance lost while building ${answer.question_id}`);
  }
  if (answer.explanation && !("explanation" in answer)) {
    fail(`Explanation lost while building ${answer.question_id}`);
  }
  if (answer.evidence_quotes?.length && !Array.isArray(answer.evidence_quotes)) {
    fail(`Evidence quotes malformed for ${answer.question_id}`);
  }
}

const output = {
  schema_version: flow.schema_version,
  lesson_id: flow.lesson_id,
  title: flow.title,
  subtitle: flow.subtitle,
  printed_page_range: flow.printed_page_range,
  required_source_range: flow.required_source_range,
  generated_at: new Date().toISOString(),
  coverage: {
    source_records: requiredSources.length,
    answer_entries: expectedAnswers.length,
    steps: steps.length
  },
  steps
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + "\n", "utf8");

console.log(
  `Built ${flow.lesson_id}: ${steps.length} steps, ` +
  `${requiredSources.length} source records, ${expectedAnswers.length} answer entries.`
);
