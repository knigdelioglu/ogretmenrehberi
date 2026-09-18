import { useEffect, useRef } from "react";
import { RevealPanel } from "./RevealPanel";
import { StructuredSections } from "./StructuredSections";
import type { LessonStep, RevealKey } from "../types";

interface StepViewProps {
  step: LessonStep;
  revealed: Set<RevealKey>;
  toggle: (key: RevealKey) => void;
  presentationMode: boolean;
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
  return step.reveal_order;
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
  visibleVocabularyTerms,
  toggleVocabularyTerm
}: StepViewProps) {
  const { answer, content, source } = step;
  const controls = answerControls(step);
  const isVocabulary = step.layout === "vocabulary";
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
                : taskTypeLabel(source.task_type)}
            </div>
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
        ) : (
          <>
            <div className="stage-card__eyebrow">{taskTypeLabel(source.task_type)}</div>
            <h1>{step.display_prompt}</h1>
          </>
        )}

        {content?.lead && answer && content.lead !== step.display_prompt ? (
          <p className="lead">{content.lead}</p>
        ) : null}

        {content?.items?.length ? (
          <div className="process-list">
            {content.items.map((item, index) => (
              <div className="process-list__row" key={item}>
                <span className="process-list__index">{index + 1}</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        ) : null}

        {content?.sections?.length ? (
          <div className="reference-grid">
            {content.sections.map((section) => (
              <article className="reference-card" key={section.title}>
                <h3>{section.title}</h3>
                <p>{section.body}</p>
              </article>
            ))}
          </div>
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
                {buttonLabels[key]}
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

        {answer && revealed.has("answer") && !isVocabulary ? (
          <div data-reveal-key="answer">
            <RevealPanel
              label={
                answer.entry_type === "performance_support"
                  ? "Uygulama desteği"
                  : "Cevap"
              }
              tone="answer"
            >
              <p>{answer.answer}</p>
              {answer.answer_sections &&
              !Array.isArray(answer.answer_sections) ? (
                <StructuredSections sections={answer.answer_sections} />
              ) : null}
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

        {content?.note && revealed.has("note") ? (
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
