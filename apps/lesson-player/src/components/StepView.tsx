import { useEffect, useRef } from "react";
import { RevealPanel } from "./RevealPanel";
import { StructuredSections } from "./StructuredSections";
import { StepContentLayout } from "./StepContentLayout";
import type { LessonStep, RevealKey } from "../types";

interface StepViewProps {
  step: LessonStep;
  revealed: Set<RevealKey>;
  toggle: (key: RevealKey) => void;
  presentationMode: boolean;
  showInlineControls: boolean;
  showTeacherNotes: boolean;
  visibleVocabularyTerms: ReadonlySet<string>;
  toggleVocabularyTerm: (term: string) => void;
}

const taskTypeLabels: Record<string, string> = {
  QUESTION: "SORU",
  TABLE: "ÇALIŞMA",
  PROCESS: "SÜREÇ",
  REFERENCE: "BİLGİ",
  ACTIVITY: "ETKİNLİK",
  PERFORMANCE: "UYGULAMA",
  ASSESSMENT: "DEĞERLENDİRME",
  VOCABULARY: "SÖZ VARLIĞI"
};

function taskTypeLabel(taskType: string) {
  return taskTypeLabels[taskType] ?? taskType.replaceAll("_", " ");
}

const buttonLabels: Record<RevealKey, string> = {
  guidance: "Yönlendirme",
  answer: "Cevap",
  evidence: "Metinden kanıt",
  explanation: "Açıklama",
  note: "Öğretmen notu"
};

function answerControls(step: LessonStep): RevealKey[] {
  return step.reveal_order.filter(
    (key) => key !== "answer" && key !== "guidance"
  );
}

function revealButtonLabel(_step: LessonStep, key: RevealKey) {
  return buttonLabels[key];
}

function answerLabel(step: LessonStep) {
  if (step.answer?.entry_type === "performance_support") return "Uygulama desteği";
  if (step.answer?.entry_type === "source_limited") {
    return "Kaynak sınırı / doğrulanabilen çerçeve";
  }
  return "Cevap";
}

function AnswerToggleIcon({ active }: { active: boolean }) {
  if (active) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9.4 7.4 4.8 12l4.6 4.6" />
        <path d="M5.2 12h8.1c3.6 0 5.7-1.7 5.7-5" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m4 20 4.2-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z" />
      <path d="m13.8 7.4 3 3" />
      <path d="M8.2 19 5 15.8" />
    </svg>
  );
}

function GuidanceToggleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 18h6" />
      <path d="M10 21h4" />
      <path d="M8.3 14.8A6 6 0 1 1 15.7 14.8c-.9.7-1.4 1.4-1.5 2.2h-4.4c-.1-.8-.6-1.5-1.5-2.2Z" />
      <path d="M12 3v2" />
    </svg>
  );
}

function VocabularyBody({
  step,
  revealed,
  visibleTerms,
  toggleTerm,
  presentationMode
}: {
  step: LessonStep;
  revealed: Set<RevealKey>;
  visibleTerms: ReadonlySet<string>;
  toggleTerm: (term: string) => void;
  presentationMode: boolean;
}) {
  const sections = step.answer?.answer_sections;
  const allVisible = revealed.has("answer");

  if (!sections || Array.isArray(sections)) return null;

  return (
    <div className="vocabulary-grid">
      {Object.entries(sections).map(([term, definition]) => {
        const visible = allVisible || visibleTerms.has(term);
        return (
          <article className="vocabulary-card" key={term}>
            <div className="vocabulary-card__term-row">
              <div className="vocabulary-card__term">{term}</div>
              {!presentationMode ? (
                <button
                  className="vocabulary-card__toggle"
                  type="button"
                  onClick={() => toggleTerm(term)}
                  disabled={allVisible}
                >
                  {visible ? "Gizle" : "Anlamı göster"}
                </button>
              ) : null}
            </div>
            <div
              className={`vocabulary-card__definition ${visible ? "is-visible" : ""}`}
            >
              {visible
                ? String(definition)
                : "Önce bağlamdan anlamını tahmin ettirin."}
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function StepView({
  step,
  revealed,
  toggle,
  presentationMode,
  showInlineControls,
  showTeacherNotes,
  visibleVocabularyTerms,
  toggleVocabularyTerm
}: StepViewProps) {
  const { answer, content, source } = step;
  const controls = answerControls(step);
  const isVocabulary = step.layout === "vocabulary";
  const answerVisible = Boolean(answer && revealed.has("answer") && !isVocabulary);
  const guidanceVisible = Boolean(answer?.guidance && revealed.has("guidance"));
  const preserveStructuredContentWithAnswer =
    answerVisible &&
    (step.layout === "structure" ||
      step.layout === "comparison" ||
      step.layout === "assessment");
  const stageRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!presentationMode) return;

    const lastRevealedKey = [...step.reveal_order]
      .reverse()
      .find((key) => revealed.has(key));

    if (!lastRevealedKey) {
      stageRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const target = stageRef.current?.querySelector(
      `[data-reveal-key="${lastRevealedKey}"]`
    );

    target?.scrollIntoView({
      block: "nearest",
      behavior: "smooth"
    });
  }, [presentationMode, revealed, step.id, step.reveal_order]);

  return (
    <main ref={stageRef} className="lesson-stage" aria-live="polite">
      <div className="stage-meta">
        <span className="page-pill">Basılı s. {source.printed_page_range}</span>
        <span>{source.book_heading}</span>
      </div>

      <section
        className={[
          "stage-card",
          `density-${step.density}`,
          isVocabulary ? "vocabulary-stage" : ""
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {answer ? (
          <>
            <div className="stage-card__eyebrow">
              {answer.entry_type === "performance_support"
                ? "Uygulama / performans"
                : answer.entry_type === "source_limited"
                  ? "Kaynak sınırlı · " + taskTypeLabel(source.task_type)
                  : taskTypeLabel(source.task_type)}
            </div>

            <div className="question-swap">
              <div className="question-swap__content">
                {answerVisible ? (
                  <div
                    className="inline-answer"
                    data-reveal-key="answer"
                    aria-label={answerLabel(step)}
                  >
                    <div className="inline-answer__label">{answerLabel(step)}</div>
                    <p className="inline-answer__text">{answer.answer}</p>
                    {answer.answer_sections ? (
                      <StructuredSections sections={answer.answer_sections} layout={step.layout} />
                    ) : null}
                  </div>
                ) : (
                  <>
                    {answer.question_no ? (
                      <div className="question-number">Soru {answer.question_no}</div>
                    ) : null}
                    <h1>{step.display_prompt}</h1>
                    {!presentationMode ? (
                      <div className="prompt-origin">
                        {step.display_prompt_mode === "VERBATIM_SHORT"
                          ? "Kitaptaki kısa soru metni"
                          : step.display_prompt_mode === "ANSWER_SUMMARY"
                            ? "Rehber soru özeti"
                            : "Kaynak temelli soru"}
                      </div>
                    ) : null}
                  </>
                )}
              </div>

              {!isVocabulary && showInlineControls ? (
                <div className="stage-icon-controls" role="group" aria-label="Soru kontrolleri">
                  <button
                    className={
                      answerVisible
                        ? "stage-icon-toggle stage-icon-toggle--answer is-active"
                        : "stage-icon-toggle stage-icon-toggle--answer"
                    }
                    type="button"
                    onClick={() => toggle("answer")}
                    aria-label={answerVisible ? "Soruyu göster" : "Cevabı göster"}
                    aria-pressed={answerVisible}
                    title={answerVisible ? "Soruyu göster" : "Cevabı göster"}
                  >
                    <AnswerToggleIcon active={answerVisible} />
                  </button>

                  {answer.guidance ? (
                    <button
                      className={
                        guidanceVisible
                          ? "stage-icon-toggle stage-icon-toggle--guidance is-active"
                          : "stage-icon-toggle stage-icon-toggle--guidance"
                      }
                      type="button"
                      onClick={() => toggle("guidance")}
                      aria-label={
                        guidanceVisible
                          ? "Yönlendirmeyi gizle"
                          : "Yönlendirmeyi göster"
                      }
                      aria-pressed={guidanceVisible}
                      title={
                        guidanceVisible
                          ? "Yönlendirmeyi gizle"
                          : "Yönlendirmeyi göster"
                      }
                    >
                      <GuidanceToggleIcon />
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <div className="stage-card__eyebrow">{taskTypeLabel(source.task_type)}</div>
            <h1>{step.display_prompt}</h1>
          </>
        )}

        {!answerVisible && content?.lead && content.lead !== step.display_prompt ? (
          <p className="lead">{content.lead}</p>
        ) : null}

        {!answerVisible || preserveStructuredContentWithAnswer ? (
          <StepContentLayout layout={step.layout} content={content} />
        ) : null}

        {isVocabulary && answer ? (
          <VocabularyBody
            step={step}
            revealed={revealed}
            visibleTerms={visibleVocabularyTerms}
            toggleTerm={toggleVocabularyTerm}
            presentationMode={presentationMode}
          />
        ) : null}

        {controls.length && !presentationMode ? (
          <div className="reveal-actions" role="group" aria-label="Öğretmen kontrolleri">
            {controls.map((key) => (
              <button
                key={key}
                className={revealed.has(key) ? "is-active" : ""}
                onClick={() => toggle(key)}
                type="button"
              >
                {revealed.has(key) ? "Gizle: " : "Göster: "}
                {revealButtonLabel(step, key)}
              </button>
            ))}
          </div>
        ) : null}

        {answer?.guidance && revealed.has("guidance") ? (
          <div data-reveal-key="guidance">
            <RevealPanel label="Yönlendirme" tone="guidance">
              <p>{answer.guidance}</p>
            </RevealPanel>
          </div>
        ) : null}

        {answer?.evidence_quotes?.length && revealed.has("evidence") ? (
          <div data-reveal-key="evidence">
            <RevealPanel label="Metinden kısa kanıt" tone="evidence">
              <div className="quote-list">
                {answer.evidence_quotes.map((quote) => (
                  <strong key={quote}>“{quote}”</strong>
                ))}
              </div>
            </RevealPanel>
          </div>
        ) : null}

        {answer?.explanation && revealed.has("explanation") ? (
          <div data-reveal-key="explanation">
            <RevealPanel label="Açıklama" tone="explanation">
              <p>{answer.explanation}</p>
            </RevealPanel>
          </div>
        ) : null}

        {showTeacherNotes && content?.note && revealed.has("note") ? (
          <div data-reveal-key="note">
            <RevealPanel label="Öğretmen notu" tone="note">
              <p>{content.note}</p>
            </RevealPanel>
          </div>
        ) : null}
      </section>
    </main>
  );
}
