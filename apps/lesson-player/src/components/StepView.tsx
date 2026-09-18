import { useState } from "react";
import { RevealPanel } from "./RevealPanel";
import { StructuredSections } from "./StructuredSections";
import type { LessonStep, RevealKey } from "../types";

interface StepViewProps {
  step: LessonStep;
  revealed: Set<RevealKey>;
  toggle: (key: RevealKey) => void;
  presentationMode: boolean;
}

const buttonLabels: Record<RevealKey, string> = {
  guidance: "Yönlendirme",
  answer: "Cevap",
  evidence: "Metinden kanıt",
  explanation: "Açıklama",
  note: "Öğretmen notu"
};

function answerControls(step: LessonStep): RevealKey[] {
  const answer = step.answer;
  if (!answer) {
    return step.content?.note ? ["note"] : [];
  }

  const keys: RevealKey[] = [];
  if (answer.guidance) keys.push("guidance");
  keys.push("answer");
  if (answer.evidence_quotes?.length) keys.push("evidence");
  if (answer.explanation) keys.push("explanation");
  if (step.content?.note) keys.push("note");
  return keys;
}

function VocabularyBody({
  step,
  revealed
}: {
  step: LessonStep;
  revealed: Set<RevealKey>;
}) {
  const sections = step.answer?.answer_sections;
  const [visibleTerms, setVisibleTerms] = useState<Set<string>>(new Set());
  const allVisible = revealed.has("answer");

  if (!sections || Array.isArray(sections)) return null;

  const toggleTerm = (term: string) => {
    setVisibleTerms((current) => {
      const next = new Set(current);
      if (next.has(term)) next.delete(term);
      else next.add(term);
      return next;
    });
  };

  return (
    <div className="vocabulary-grid">
      {Object.entries(sections).map(([term, definition]) => {
        const visible = allVisible || visibleTerms.has(term);
        return (
          <article className="vocabulary-card" key={term}>
            <div className="vocabulary-card__term-row">
              <div className="vocabulary-card__term">{term}</div>
              <button
                className="vocabulary-card__toggle"
                type="button"
                onClick={() => toggleTerm(term)}
                disabled={allVisible}
              >
                {visible ? "Gizle" : "Anlamı göster"}
              </button>
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

export function StepView({ step, revealed, toggle, presentationMode }: StepViewProps) {
  const { answer, content, source } = step;
  const controls = answerControls(step);
  const isVocabulary = step.layout === "vocabulary";

  return (
    <main className="lesson-stage" aria-live="polite">
      <div className="stage-meta">
        <span className="page-pill">Basılı s. {source.printed_page_range}</span>
        <span>{source.book_heading}</span>
      </div>

      <section className="stage-card">
        {answer ? (
          <>
            <div className="stage-card__eyebrow">
              {answer.entry_type === "performance_support"
                ? "Uygulama / performans"
                : source.task_type}
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
            <div className="stage-card__eyebrow">{source.task_type}</div>
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
          <VocabularyBody step={step} revealed={revealed} />
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
          <RevealPanel label="Yönlendirme" tone="guidance">
            <p>{answer.guidance}</p>
          </RevealPanel>
        ) : null}

        {answer && revealed.has("answer") && !isVocabulary ? (
          <RevealPanel
            label={answer.entry_type === "performance_support" ? "Uygulama desteği" : "Cevap"}
            tone="answer"
          >
            <p>{answer.answer}</p>
            {answer.answer_sections &&
            !Array.isArray(answer.answer_sections) ? (
              <StructuredSections sections={answer.answer_sections} />
            ) : null}
          </RevealPanel>
        ) : null}

        {answer?.evidence_quotes?.length && revealed.has("evidence") ? (
          <RevealPanel label="Metinden kısa kanıt" tone="evidence">
            <div className="quote-list">
              {answer.evidence_quotes.map((quote) => (
                <strong key={quote}>“{quote}”</strong>
              ))}
            </div>
          </RevealPanel>
        ) : null}

        {answer?.explanation && revealed.has("explanation") ? (
          <RevealPanel label="Açıklama" tone="explanation">
            <p>{answer.explanation}</p>
          </RevealPanel>
        ) : null}

        {content?.note && revealed.has("note") ? (
          <RevealPanel label="Öğretmen notu" tone="note">
            <p>{content.note}</p>
          </RevealPanel>
        ) : null}
      </section>
    </main>
  );
}
