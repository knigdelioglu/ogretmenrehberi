const teacherOnlyKeys = new Set(["guidance", "explanation", "note"]);

const revealLabels = {
  guidance: "Yönlendirme",
  answer: "Cevap",
  evidence: "Metinden kanıt",
  explanation: "Açıklama",
  note: "Öğretmen notu"
};

function hasRevealContent(step, key) {
  if (key === "answer") return Boolean(step.answer);
  if (key === "guidance") return Boolean(step.answer?.guidance);
  if (key === "evidence") return Boolean(step.answer?.evidence_quotes?.length);
  if (key === "explanation") return Boolean(step.answer?.explanation);
  if (key === "note") return Boolean(step.content?.note);
  return false;
}

function studentVisibleStep(step) {
  const { guidance: _guidance, explanation: _explanation, ...studentAnswer } = step.answer ?? {};
  const { note: _note, ...studentContent } = step.content ?? {};

  return {
    ...step,
    reveal_order: step.reveal_order.filter((key) => !teacherOnlyKeys.has(key)),
    answer: step.answer ? studentAnswer : null,
    content: step.content ? studentContent : null
  };
}

function stagesFor(step, view, revealMode) {
  const keys = step.reveal_order.filter(
    (key) =>
      (view === "teacher" || !teacherOnlyKeys.has(key)) &&
      hasRevealContent(step, key)
  );

  if (revealMode === "final") return [keys];

  return [[], ...keys.map((_, index) => keys.slice(0, index + 1))];
}

function stageLabel(stage) {
  if (!stage.length) return "Başlangıç görünümü";
  return `${revealLabels[stage[stage.length - 1]]} açıldı`;
}

/** Build a deterministic, animation-free sequence of web-rendered slide states. */
export function planExportSlides(lessons, configuration) {
  const currentLesson = lessons.find(
    (item) => item.lesson_id === configuration.currentLessonId
  );
  if (!currentLesson) throw new Error(`Unknown lesson: ${configuration.currentLessonId}`);

  const scopedLessons =
    configuration.scope === "theme"
      ? lessons.filter((item) => item.theme_id === currentLesson.theme_id)
      : [currentLesson];
  const selectedIds = new Set(configuration.selectedStepIds);
  const slides = [];

  for (const lesson of scopedLessons) {
    const selectedSteps = lesson.steps.filter((step) => {
      if (configuration.scope !== "selected-steps") return true;
      return lesson.lesson_id === currentLesson.lesson_id && selectedIds.has(step.id);
    });

    selectedSteps.forEach((step) => {
      const stages = stagesFor(step, configuration.view, configuration.revealMode);
      stages.forEach((revealStage) => {
        slides.push({
          slideNumber: slides.length + 1,
          lessonId: lesson.lesson_id,
          lessonTitle: lesson.title,
          lessonSlug: lesson.lesson_slug,
          themeId: lesson.theme_id,
          stepId: step.id,
          stepNumber: lesson.steps.indexOf(step) + 1,
          stepCount: lesson.steps.length,
          printedPage: step.source.printed_page_range,
          revealStage,
          revealLabel:
            configuration.revealMode === "final"
              ? "Son görünüm"
              : stageLabel(revealStage),
          view: configuration.view,
          step: configuration.view === "student" ? studentVisibleStep(step) : step
        });
      });
    });
  }

  return slides;
}
