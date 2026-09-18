import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";
import lessonJson from "./generated/karagoz.json";
import { EditorPanel } from "./components/EditorPanel";
import { StepView } from "./components/StepView";
import type {
  LayoutKind,
  LessonData,
  LessonStep,
  RevealKey
} from "./types";

const lesson = lessonJson as LessonData;
const progressKey = `ogretmenrehberi.lesson.${lesson.lesson_id}.index`;
const modeKey = `ogretmenrehberi.lesson.${lesson.lesson_id}.projection`;
const overridesKey = `ogretmenrehberi.lesson.${lesson.lesson_id}.overrides`;
const orderKey = `ogretmenrehberi.lesson.${lesson.lesson_id}.order`;
const originalStepById = new Map(lesson.steps.map((step) => [step.id, step]));

type StepOverride = {
  display_prompt?: string;
  layout?: LayoutKind;
};

type StepOverrides = Record<string, StepOverride>;

function restoredIndex() {
  const raw = window.localStorage.getItem(progressKey);
  const parsed = raw ? Number(raw) : 0;
  if (!Number.isInteger(parsed)) return 0;
  return Math.max(0, Math.min(lesson.steps.length - 1, parsed));
}

function restoredOverrides(): StepOverrides {
  const raw = window.localStorage.getItem(overridesKey);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function restoredOrder(): string[] {
  const canonical = lesson.steps.map((step) => step.id);
  const raw = window.localStorage.getItem(orderKey);
  if (!raw) return canonical;

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length !== canonical.length) return canonical;

    const canonicalSet = new Set(canonical);
    if (parsed.some((id) => typeof id !== "string" || !canonicalSet.has(id))) {
      return canonical;
    }

    if (new Set(parsed).size !== canonical.length) return canonical;
    return parsed;
  } catch {
    return canonical;
  }
}

function stepLabel(step: LessonStep) {
  return step.display_prompt ?? step.answer?.prompt_summary ?? step.source.book_heading;
}

function revealOrder(step: LessonStep): RevealKey[] {
  const keys: RevealKey[] = [];
  if (step.answer?.guidance) keys.push("guidance");
  if (step.answer) keys.push("answer");
  if (step.answer?.evidence_quotes?.length) keys.push("evidence");
  if (step.answer?.explanation) keys.push("explanation");
  if (step.content?.note) keys.push("note");
  return keys;
}

function applyOverride(step: LessonStep, override?: StepOverride): LessonStep {
  if (!override) return step;

  return {
    ...step,
    display_prompt: override.display_prompt ?? step.display_prompt,
    layout: override.layout ?? step.layout
  };
}

export default function App() {
  const [index, setIndex] = useState(restoredIndex);
  const [outlineOpen, setOutlineOpen] = useState(true);
  const [presentationMode, setPresentationMode] = useState(
    () => window.localStorage.getItem(modeKey) === "true"
  );
  const [editorOpen, setEditorOpen] = useState(false);
  const [overrides, setOverrides] = useState<StepOverrides>(restoredOverrides);
  const [stepOrder, setStepOrder] = useState<string[]>(restoredOrder);
  const [revealed, setRevealed] = useState<Set<RevealKey>>(new Set());

  const effectiveSteps = useMemo(
    () =>
      stepOrder.map((id) => {
        const original = originalStepById.get(id);
        if (!original) throw new Error(`Unknown lesson step in order: ${id}`);
        return applyOverride(original, overrides[id]);
      }),
    [overrides, stepOrder]
  );
  const step = effectiveSteps[index];

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

  const togglePresentationMode = useCallback(() => {
    setPresentationMode((current) => {
      const next = !current;
      if (next) {
        setOutlineOpen(false);
        setEditorOpen(false);
      }
      return next;
    });
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await document.documentElement.requestFullscreen();
    }
  }, []);

  const updateStepOverride = useCallback(
    (stepId: string, patch: StepOverride) => {
      setOverrides((current) => ({
        ...current,
        [stepId]: {
          ...current[stepId],
          ...patch
        }
      }));
    },
    []
  );

  const moveCurrentStep = useCallback(
    (delta: -1 | 1) => {
      const target = index + delta;
      if (target < 0 || target >= stepOrder.length) return;

      setStepOrder((current) => {
        const next = [...current];
        [next[index], next[target]] = [next[target], next[index]];
        return next;
      });
      setIndex(target);
    },
    [index, stepOrder.length]
  );

  const resetStepOverride = useCallback((stepId: string) => {
    setOverrides((current) => {
      const next = { ...current };
      delete next[stepId];
      return next;
    });
  }, []);

  const exportLessonFlow = useCallback(() => {
    const steps = effectiveSteps.map((effective) => {
      const original = originalStepById.get(effective.id);
      if (!original) {
        throw new Error(`Unknown lesson step during export: ${effective.id}`);
      }
      const override = overrides[original.id];
      const exported: Record<string, unknown> = {
        id: original.id,
        source_record_id: original.source.source_record_id,
        layout: effective.layout
      };

      if (original.answer) {
        exported.answer_id = original.answer.question_id;
      }

      if (
        override?.display_prompt?.trim() &&
        override.display_prompt.trim() !== original.display_prompt
      ) {
        exported.prompt = override.display_prompt.trim();
      }

      if (original.content) {
        exported.content = original.content;
      }

      return exported;
    });

    const payload = {
      schema_version: lesson.schema_version,
      lesson_id: lesson.lesson_id,
      title: lesson.title,
      subtitle: lesson.subtitle,
      printed_page_range: lesson.printed_page_range,
      required_source_range: lesson.required_source_range,
      steps
    };

    const blob = new Blob([JSON.stringify(payload, null, 2) + "\n"], {
      type: "application/json"
    });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = "karagoz-flow.json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(href);
  }, [effectiveSteps, overrides]);

  useEffect(() => {
    window.localStorage.setItem(progressKey, String(index));
  }, [index]);

  useEffect(() => {
    window.localStorage.setItem(modeKey, String(presentationMode));
  }, [presentationMode]);

  useEffect(() => {
    window.localStorage.setItem(overridesKey, JSON.stringify(overrides));
  }, [overrides]);

  useEffect(() => {
    window.localStorage.setItem(orderKey, JSON.stringify(stepOrder));
  }, [stepOrder]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (event.key === "ArrowRight") goTo(index + 1);
      else if (event.key === "ArrowLeft") goTo(index - 1);
      else if (event.key === " ") {
        event.preventDefault();
        revealNext();
      } else if (event.key.toLowerCase() === "c" && step.answer) {
        toggle("answer");
      } else if (event.key.toLowerCase() === "g" && step.answer?.guidance) {
        toggle("guidance");
      } else if (event.key.toLowerCase() === "e" && step.answer?.explanation) {
        toggle("explanation");
      } else if (event.key.toLowerCase() === "d" && !presentationMode) {
        setEditorOpen((current) => !current);
      } else if (event.key.toLowerCase() === "p") {
        togglePresentationMode();
      } else if (event.key.toLowerCase() === "f") {
        void toggleFullscreen();
      } else if (event.key === "Home") {
        goTo(0);
      } else if (event.key === "End") {
        goTo(lesson.steps.length - 1);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    goTo,
    index,
    presentationMode,
    revealNext,
    step,
    toggle,
    toggleFullscreen,
    togglePresentationMode
  ]);

  const pageProgress = useMemo(
    () => Math.round(((index + 1) / lesson.steps.length) * 100),
    [index]
  );

  return (
    <div
      className={[
        "app-shell",
        outlineOpen && !presentationMode ? "outline-open" : "",
        presentationMode ? "presentation-mode" : "",
        editorOpen ? "editor-open" : ""
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <header className="topbar">
        <div>
          <div className="topbar__kicker">ÖĞRETMEN REHBERİ · DERS MODU</div>
          <div className="topbar__title">{lesson.title}</div>
        </div>
        <div className="topbar__actions">
          <button type="button" onClick={() => setOutlineOpen((value) => !value)}>
            {outlineOpen ? "Akışı kapat" : "Ders akışı"}
          </button>
          <button type="button" onClick={() => setEditorOpen((value) => !value)}>
            {editorOpen ? "Düzenlemeyi kapat" : "Düzenle"}
          </button>
          <button type="button" onClick={togglePresentationMode}>
            Projeksiyon modu
          </button>
          <button type="button" onClick={() => void toggleFullscreen()}>
            Tam ekran
          </button>
        </div>
      </header>

      <aside className="outline" aria-label="Ders akışı">
        <div className="outline__header">
          <strong>{lesson.subtitle}</strong>
          <span>
            s. {lesson.printed_page_range} · {lesson.steps.length} adım
          </span>
        </div>
        <div className="outline__steps">
          {effectiveSteps.map((item, itemIndex) => {
            const previous = effectiveSteps[itemIndex - 1];
            const pageChanged =
              !previous ||
              previous.source.printed_page_range !== item.source.printed_page_range;

            return (
              <Fragment key={item.id}>
                {pageChanged ? (
                  <div className="outline-page-group">
                    Basılı s. {item.source.printed_page_range}
                  </div>
                ) : null}
                <button
                  className={
                    itemIndex === index ? "outline-step is-active" : "outline-step"
                  }
                  onClick={() => goTo(itemIndex)}
                  type="button"
                >
                  <span className="outline-step__number">
                    {item.answer?.question_no
                      ? `S.${item.answer.question_no}`
                      : String(itemIndex + 1).padStart(2, "0")}
                  </span>
                  <span className="outline-step__label">{stepLabel(item)}</span>
                </button>
              </Fragment>
            );
          })}
        </div>
      </aside>

      <div className="content-column">
        <StepView
          step={step}
          revealed={revealed}
          toggle={toggle}
          presentationMode={presentationMode}
        />

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
              <span>
                {index + 1} / {lesson.steps.length} · s. {step.source.printed_page_range}
              </span>
              <span>%{pageProgress}</span>
            </div>
            <div className="progress-track" aria-hidden="true">
              <div className="progress-fill" style={{ width: `${pageProgress}%` }} />
            </div>
            {!presentationMode ? (
              <div className="shortcut-hint">
                ←/→ adım · Space aç/ilerle · C cevap · G yönlendirme · E açıklama ·
                D düzenle · P projeksiyon · F tam ekran
              </div>
            ) : (
              <div className="shortcut-hint shortcut-hint--projection">
                P: öğretmen görünümüne dön
              </div>
            )}
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

      {editorOpen && !presentationMode ? (
        <EditorPanel
          step={step}
          hasOverride={Boolean(overrides[step.id])}
          onPromptChange={(value) =>
            updateStepOverride(step.id, { display_prompt: value })
          }
          onLayoutChange={(value) => updateStepOverride(step.id, { layout: value })}
          canMoveUp={index > 0}
          canMoveDown={index < effectiveSteps.length - 1}
          onMoveUp={() => moveCurrentStep(-1)}
          onMoveDown={() => moveCurrentStep(1)}
          onReset={() => resetStepOverride(step.id)}
          onExport={exportLessonFlow}
          onClose={() => setEditorOpen(false)}
        />
      ) : null}
    </div>
  );
}
