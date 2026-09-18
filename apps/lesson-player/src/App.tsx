import { useCallback, useEffect, useMemo, useState } from "react";
import lessonJson from "./generated/karagoz.json";
import { StepView } from "./components/StepView";
import type { LessonData, RevealKey } from "./types";

const lesson = lessonJson as LessonData;

function stepLabel(step: LessonData["steps"][number]) {
  return step.answer?.prompt_summary ?? step.content?.lead ?? step.source.book_heading;
}

function revealOrder(step: LessonData["steps"][number]): RevealKey[] {
  const keys: RevealKey[] = [];
  if (step.answer?.guidance) keys.push("guidance");
  if (step.answer) keys.push("answer");
  if (step.answer?.evidence_quotes?.length) keys.push("evidence");
  if (step.answer?.explanation) keys.push("explanation");
  if (step.content?.note) keys.push("note");
  return keys;
}

export default function App() {
  const [index, setIndex] = useState(0);
  const [outlineOpen, setOutlineOpen] = useState(true);
  const [revealed, setRevealed] = useState<Set<RevealKey>>(new Set());

  const step = lesson.steps[index];

  const goTo = useCallback((next: number) => {
    const clamped = Math.max(0, Math.min(lesson.steps.length - 1, next));
    setIndex(clamped);
    setRevealed(new Set());
  }, []);

  const toggle = useCallback((key: RevealKey) => {
    setRevealed((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const revealNext = useCallback(() => {
    const order = revealOrder(step);
    const nextKey = order.find((key) => !revealed.has(key));
    if (nextKey) toggle(nextKey);
    else if (index < lesson.steps.length - 1) goTo(index + 1);
  }, [goTo, index, revealed, step, toggle]);

  const toggleFullscreen = useCallback(async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await document.documentElement.requestFullscreen();
    }
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;

      if (event.key === "ArrowRight") goTo(index + 1);
      else if (event.key === "ArrowLeft") goTo(index - 1);
      else if (event.key === " ") {
        event.preventDefault();
        revealNext();
      } else if (event.key.toLowerCase() === "c" && step.answer) toggle("answer");
      else if (event.key.toLowerCase() === "g" && step.answer?.guidance) toggle("guidance");
      else if (event.key.toLowerCase() === "e" && step.answer?.explanation) toggle("explanation");
      else if (event.key.toLowerCase() === "f") void toggleFullscreen();
      else if (event.key === "Home") goTo(0);
      else if (event.key === "End") goTo(lesson.steps.length - 1);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goTo, index, revealNext, step, toggle, toggleFullscreen]);

  const pageProgress = useMemo(
    () => Math.round(((index + 1) / lesson.steps.length) * 100),
    [index]
  );

  return (
    <div className={`app-shell ${outlineOpen ? "outline-open" : ""}`}>
      <header className="topbar">
        <div>
          <div className="topbar__kicker">ÖĞRETMEN REHBERİ · DERS MODU</div>
          <div className="topbar__title">{lesson.title}</div>
        </div>
        <div className="topbar__actions">
          <button type="button" onClick={() => setOutlineOpen((value) => !value)}>
            {outlineOpen ? "Akışı kapat" : "Ders akışı"}
          </button>
          <button type="button" onClick={() => void toggleFullscreen()}>
            Tam ekran
          </button>
        </div>
      </header>

      <aside className="outline" aria-label="Ders akışı">
        <div className="outline__header">
          <strong>{lesson.subtitle}</strong>
          <span>s. {lesson.printed_page_range}</span>
        </div>
        <div className="outline__steps">
          {lesson.steps.map((item, itemIndex) => (
            <button
              className={itemIndex === index ? "outline-step is-active" : "outline-step"}
              key={item.id}
              onClick={() => goTo(itemIndex)}
              type="button"
            >
              <span className="outline-step__page">s. {item.source.printed_page_range}</span>
              <span className="outline-step__label">{stepLabel(item)}</span>
            </button>
          ))}
        </div>
      </aside>

      <div className="content-column">
        <StepView step={step} revealed={revealed} toggle={toggle} />

        <footer className="lesson-footer">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => goTo(index - 1)}
          >
            ← Önceki
          </button>

          <div className="progress-area">
            <div className="progress-area__text">
              <span>{index + 1} / {lesson.steps.length}</span>
              <span>%{pageProgress}</span>
            </div>
            <div className="progress-track" aria-hidden="true">
              <div className="progress-fill" style={{ width: `${pageProgress}%` }} />
            </div>
            <div className="shortcut-hint">
              ←/→ adım · Space aç/ilerle · C cevap · G yönlendirme · E açıklama · F tam ekran
            </div>
          </div>

          <button
            type="button"
            disabled={index === lesson.steps.length - 1}
            onClick={() => goTo(index + 1)}
          >
            Sonraki →
          </button>
        </footer>
      </div>
    </div>
  );
}
