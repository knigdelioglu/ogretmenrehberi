import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "..");
const repoRoot = path.resolve(appRoot, "../..");

const teacherBookRoot = path.join(
  repoRoot,
  "data/grade-11/source/teacher-book"
);
const presentationRoot = path.join(
  repoRoot,
  "data/grade-11/presentation"
);
const outputPath = path.join(appRoot, "src/generated/lessons.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function fail(message) {
  throw new Error(`Lesson data build failed: ${message}`);
}

function sourceParts(id) {
  const match = /^T(\d{2})-S(\d+)$/.exec(id);
  if (!match) fail(`Invalid source_record_id: ${id}`);
  return {
    theme: match[1],
    ordinal: Number(match[2])
  };
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

const themeDataCache = new Map();

function loadThemeData(themeCode) {
  if (themeDataCache.has(themeCode)) {
    return themeDataCache.get(themeCode);
  }

  const themeNumber = Number(themeCode);
  if (!Number.isInteger(themeNumber) || themeNumber < 1) {
    fail(`Invalid theme code: ${themeCode}`);
  }

  const themeBase = path.join(teacherBookRoot, `theme-${themeNumber}`);
  const sourceIndexPath = path.join(themeBase, "source-index.json");
  const answerIndexPath = path.join(themeBase, "answer-bank.json");

  if (!fs.existsSync(sourceIndexPath) || !fs.existsSync(answerIndexPath)) {
    fail(`Missing canonical teacher-book data for theme ${themeNumber}`);
  }

  const sourceIndex = readJson(sourceIndexPath);
  const answerIndex = readJson(answerIndexPath);
  const answers = [];

  for (const part of answerIndex.parts ?? []) {
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
    fail(`Duplicate source_record_id detected in theme ${themeNumber}`);
  }
  if (answerById.size !== answers.length) {
    fail(`Duplicate question_id detected in theme ${themeNumber}`);
  }
  if (
    Number(answerIndex.coverage?.entry_count) !== answers.length
  ) {
    fail(
      `Answer index count mismatch in theme ${themeNumber}: ` +
      `${answerIndex.coverage?.entry_count} != ${answers.length}`
    );
  }

  const data = {
    themeCode,
    themeNumber,
    sourceIndex,
    answerIndex,
    answers,
    sourceById,
    answerById
  };
  themeDataCache.set(themeCode, data);
  return data;
}

const allowedDensities = new Set(["large", "comfortable", "compact"]);

function availableRevealKeys(answer, content) {
  const keys = [];
  if (answer?.guidance) keys.push("guidance");
  if (answer) keys.push("answer");
  if (answer?.evidence_quotes?.length) keys.push("evidence");
  if (answer?.explanation) keys.push("explanation");
  if (content?.note) keys.push("note");
  return keys;
}

function resolveRevealOrder(step, answer) {
  const available = availableRevealKeys(answer, step.content);
  if (!step.reveal) return available;

  if (!Array.isArray(step.reveal)) {
    fail(`Reveal order must be an array: ${step.id}`);
  }

  if (new Set(step.reveal).size !== step.reveal.length) {
    fail(`Reveal order contains duplicates: ${step.id}`);
  }

  const availableSet = new Set(available);
  const configuredSet = new Set(step.reveal);
  const unsupported = step.reveal.filter((key) => !availableSet.has(key));
  const missing = available.filter((key) => !configuredSet.has(key));

  if (unsupported.length || missing.length) {
    fail(
      `Reveal order must contain each available layer exactly once for ${step.id}. ` +
      `Unsupported: ${unsupported.join(", ") || "none"}; missing: ${missing.join(", ") || "none"}`
    );
  }

  return [...step.reveal];
}

function resolveDensity(step) {
  const density = step.density ?? "comfortable";
  if (!allowedDensities.has(density)) {
    fail(`Unsupported density "${density}" for ${step.id}`);
  }
  return density;
}

function resolveDisplayPrompt(step, source, answer, answerStepCountBySource) {
  if (step.prompt?.trim()) {
    return {
      text: step.prompt.trim(),
      mode: step.prompt_mode ?? "FLOW_OVERRIDE"
    };
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

function buildLesson(flowPath) {
  const flow = readJson(flowPath);
  const flowName = path.basename(flowPath);
  const lessonSlug =
    flow.lesson_slug ??
    flowName.replace(/-flow\.json$/i, "").replace(/\.json$/i, "");

  if (!flow.lesson_id?.trim()) {
    fail(`Missing lesson_id in ${flowName}`);
  }
  if (!flow.title?.trim()) {
    fail(`Missing title in ${flowName}`);
  }
  if (!flow.printed_page_range) {
    fail(`Missing printed_page_range in ${flowName}`);
  }
  if (!flow.required_source_range?.from || !flow.required_source_range?.to) {
    fail(`Missing required_source_range in ${flowName}`);
  }

  const fromParts = sourceParts(flow.required_source_range.from);
  const toParts = sourceParts(flow.required_source_range.to);
  if (fromParts.theme !== toParts.theme) {
    fail(`Source range crosses themes in ${flow.lesson_id}`);
  }

  const themeData = loadThemeData(fromParts.theme);
  const {
    sourceIndex,
    answers,
    sourceById,
    answerById
  } = themeData;

  if (
    flow.theme_id &&
    flow.theme_id !== sourceIndex.theme_id
  ) {
    fail(
      `theme_id mismatch in ${flow.lesson_id}: ${flow.theme_id} != ${sourceIndex.theme_id}`
    );
  }

  const seenStepIds = new Set();
  const seenAnswerIds = new Map();
  const seenSourceIds = new Set();

  const answerStepCountBySource = new Map();
  for (const step of flow.steps ?? []) {
    if (!step.answer_id) continue;
    answerStepCountBySource.set(
      step.source_record_id,
      (answerStepCountBySource.get(step.source_record_id) ?? 0) + 1
    );
  }

  const steps = (flow.steps ?? []).map((step) => {
    if (seenStepIds.has(step.id)) {
      fail(`Duplicate lesson step id in ${flow.lesson_id}: ${step.id}`);
    }
    seenStepIds.add(step.id);

    const source = sourceById.get(step.source_record_id);
    if (!source) {
      fail(`Unknown source_record_id in ${flow.lesson_id}: ${step.source_record_id}`);
    }
    seenSourceIds.add(step.source_record_id);

    let answer = null;
    if (step.answer_id) {
      answer = answerById.get(step.answer_id);
      if (!answer) {
        fail(`Unknown answer_id in ${flow.lesson_id}: ${step.answer_id}`);
      }

      const questionNoMatch = /-Q(\d+)$/i.exec(answer.question_id);
      if (!answer.question_no && questionNoMatch) {
        answer = {
          ...answer,
          question_no: String(Number(questionNoMatch[1]))
        };
      }

      const count = (seenAnswerIds.get(step.answer_id) ?? 0) + 1;
      seenAnswerIds.set(step.answer_id, count);
      if (count > 1) {
        fail(`Answer entry used more than once in ${flow.lesson_id}: ${step.answer_id}`);
      }

      const sourcePages = pageBounds(source.printed_page_range);
      if (
        answer.printed_page < sourcePages.from ||
        answer.printed_page > sourcePages.to
      ) {
        fail(
          `Page mismatch in ${flow.lesson_id}: ${step.answer_id} is s.${answer.printed_page} but ` +
          `${step.source_record_id} covers ${source.printed_page_range}`
        );
      }

      if (
        step.layout === "vocabulary" &&
        (!answer.answer_sections ||
          Array.isArray(answer.answer_sections) ||
          Object.keys(answer.answer_sections).length === 0)
      ) {
        fail(`Vocabulary step has no structured definitions: ${flow.lesson_id}/${step.id}`);
      }

      if (!answer.prompt_summary?.trim()) {
        fail(`Empty prompt_summary: ${step.answer_id}`);
      }

      if (!answer.answer?.trim()) {
        fail(`Empty answer: ${step.answer_id}`);
      }
    } else if (!step.content) {
      fail(`Step has neither answer_id nor content: ${flow.lesson_id}/${step.id}`);
    }

    const displayPrompt = resolveDisplayPrompt(
      step,
      source,
      answer,
      answerStepCountBySource
    );
    const revealOrder = resolveRevealOrder(step, answer);
    const density = resolveDensity(step);

    return {
      id: step.id,
      layout: step.layout,
      density,
      reveal_order: revealOrder,
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
        `Answer-bank entry in ${flow.lesson_id} range is not represented: ${entry.question_id}`
      );
    }
  }

  if (seenAnswerIds.size !== expectedAnswers.length) {
    fail(
      `Answer coverage mismatch for ${flow.lesson_id}: expected ${expectedAnswers.length}, got ${seenAnswerIds.size}`
    );
  }

  const requiredSources = sourceIndex.records.filter((record) => {
    const parts = sourceParts(record.source_record_id);
    return (
      parts.theme === fromParts.theme &&
      parts.ordinal >= fromParts.ordinal &&
      parts.ordinal <= toParts.ordinal
    );
  });

  for (const record of requiredSources) {
    if (!seenSourceIds.has(record.source_record_id)) {
      fail(
        `Source-index record in ${flow.lesson_id} range is not represented: ${record.source_record_id}`
      );
    }
    if (record.source_status !== "VERIFIED") {
      fail(
        `Source-index record is not VERIFIED in ${flow.lesson_id}: ${record.source_record_id} (${record.source_status})`
      );
    }
  }

  for (const step of steps) {
    const answer = step.answer;
    if (!answer) continue;

    if (answer.evidence_quotes?.length && !Array.isArray(answer.evidence_quotes)) {
      fail(`Evidence quotes malformed for ${answer.question_id}`);
    }
  }

  return {
    schema_version: flow.schema_version,
    lesson_id: flow.lesson_id,
    lesson_slug: lessonSlug,
    theme_id: sourceIndex.theme_id,
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
}

const presentationThemeDirs = fs
  .readdirSync(presentationRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && /^theme-\d+$/.test(entry.name))
  .sort((a, b) => {
    const left = Number(a.name.replace("theme-", ""));
    const right = Number(b.name.replace("theme-", ""));
    return left - right;
  });

const flowPaths = [];
for (const themeDir of presentationThemeDirs) {
  const dirPath = path.join(presentationRoot, themeDir.name);
  const files = fs
    .readdirSync(dirPath)
    .filter((name) => name.endsWith("-flow.json"))
    .sort();

  for (const fileName of files) {
    flowPaths.push(path.join(dirPath, fileName));
  }
}

if (!flowPaths.length) {
  fail(`No lesson flow files found in ${presentationRoot}`);
}

const lessons = flowPaths.map((flowPath) => buildLesson(flowPath));

const lessonIds = new Set();
const lessonSlugs = new Set();
for (const lesson of lessons) {
  if (lessonIds.has(lesson.lesson_id)) {
    fail(`Duplicate lesson_id: ${lesson.lesson_id}`);
  }
  if (lessonSlugs.has(lesson.lesson_slug)) {
    fail(`Duplicate lesson_slug: ${lesson.lesson_slug}`);
  }
  lessonIds.add(lesson.lesson_id);
  lessonSlugs.add(lesson.lesson_slug);
}

lessons.sort((a, b) => {
  const pageDelta =
    pageBounds(a.printed_page_range).from -
    pageBounds(b.printed_page_range).from;
  if (pageDelta !== 0) return pageDelta;
  return a.lesson_id.localeCompare(b.lesson_id, "tr");
});

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(lessons, null, 2) + "\n", "utf8");

for (const lesson of lessons) {
  console.log(
    `Built ${lesson.lesson_id}: ${lesson.coverage.steps} steps, ` +
    `${lesson.coverage.source_records} source records, ` +
    `${lesson.coverage.answer_entries} answer entries.`
  );
}
console.log(`Built lesson catalog: ${lessons.length} lessons.`);
