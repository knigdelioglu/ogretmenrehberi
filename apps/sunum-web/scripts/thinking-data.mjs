import fs from "node:fs";
import path from "node:path";

const themeDirectoryPattern = /^theme-(\d+)$/;

export function thinkingRecordKey(lessonId, stepId) {
  if (typeof lessonId !== "string" || !lessonId || typeof stepId !== "string" || !stepId) {
    throw new Error("Düşünürken eşleştirmesi lesson_id ve step.id gerektirir.");
  }
  return JSON.stringify([lessonId, stepId]);
}

export function registerThinkingRecord(records, key, record) {
  if (records.has(key)) throw new Error(`Tekrarlanan Düşünürken eşleştirmesi: ${key}`);
  records.set(key, record);
}

export function collectThinkingRecords(presentationRoot, lessons) {
  const lessonsById = new Map();
  for (const lesson of lessons) {
    if (!lesson.lesson_id || lessonsById.has(lesson.lesson_id)) {
      throw new Error(`Eksik veya yinelenen kanonik lesson_id: ${lesson.lesson_id ?? "(boş)"}`);
    }
    lessonsById.set(lesson.lesson_id, lesson);
  }

  const themeDirectories = fs
    .readdirSync(presentationRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && themeDirectoryPattern.test(entry.name))
    .map((entry) => entry.name)
    .sort();
  if (!themeDirectories.length) throw new Error("Presentation altında theme-N klasörü bulunamadı.");

  const records = new Map();
  const stats = new Map();

  for (const directoryName of themeDirectories) {
    const [, ordinal] = themeDirectoryPattern.exec(directoryName);
    const expectedThemeId = `TEMA_${ordinal.padStart(2, "0")}`;
    const directory = path.join(presentationRoot, directoryName);
    const filenames = fs.readdirSync(directory).filter((name) => name.endsWith("-flow.json")).sort();
    const themeStats = { flowSteps: 0, sourceRecordIds: new Set() };
    stats.set(expectedThemeId, themeStats);

    for (const filename of filenames) {
      const filePath = path.join(directory, filename);
      const flow = JSON.parse(fs.readFileSync(filePath, "utf8"));
      const lesson = lessonsById.get(flow.lesson_id);
      if (!lesson) throw new Error(`${directoryName}/${filename}: kanonik ders bulunamadı (${flow.lesson_id}).`);
      if (lesson.theme_id !== expectedThemeId || (flow.theme_id && flow.theme_id !== expectedThemeId)) {
        throw new Error(
          `${directoryName}/${filename}: klasör, akış ve kanonik tema eşleşmiyor (${expectedThemeId}, ${flow.theme_id ?? lesson.theme_id}, ${lesson.theme_id}).`
        );
      }

      for (const step of flow.steps ?? []) {
        if (!Object.prototype.hasOwnProperty.call(step, "thinking")) continue;
        const location = `${directoryName}/${filename}/${step.id ?? "(adım yok)"}`;
        if (typeof step.thinking !== "string" || !step.thinking.trim()) {
          throw new Error(`${location}: Düşünürken metni boş veya geçersiz.`);
        }
        if (typeof step.source_record_id !== "string" || !step.source_record_id.trim()) {
          throw new Error(`${location}: source_record_id eksik.`);
        }

        const canonicalSteps = lesson.steps.filter((entry) => entry.id === step.id);
        if (canonicalSteps.length !== 1) {
          throw new Error(`${location}: kanonik derste aynı step.id ile tam bir eşleşme bulunamadı.`);
        }
        if (canonicalSteps[0].source?.source_record_id !== step.source_record_id) {
          throw new Error(`${location}: source_record_id kanonik sunum adımıyla eşleşmiyor.`);
        }
        const answer = canonicalSteps[0].answer;
        const hasAnswerSections = Boolean(
          answer?.answer_sections && Object.keys(answer.answer_sections).length > 0
        );
        if (!answer?.answer && !hasAnswerSections) {
          throw new Error(`${location}: Düşünürken katmanının ardından açılacak cevap bulunamadı.`);
        }

        const key = thinkingRecordKey(flow.lesson_id, step.id);
        registerThinkingRecord(records, key, {
          text: step.thinking,
          themeId: expectedThemeId,
          lessonId: flow.lesson_id,
          stepId: step.id,
          sourceRecordId: step.source_record_id,
          answerId: step.answer_id,
          filePath
        });
        themeStats.flowSteps += 1;
        themeStats.sourceRecordIds.add(step.source_record_id);
      }
    }
  }

  return { records, stats };
}
