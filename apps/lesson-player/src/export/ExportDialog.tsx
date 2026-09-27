import { useEffect, useMemo, useRef, useState } from "react";
import { planExportSlides } from "./plan.js";
import type { ExportConfiguration, ExportLesson, ExportProgress } from "./types";
import type { LessonStep } from "../types";

interface ExportDialogProps {
  open: boolean;
  lesson: ExportLesson;
  lessons: ExportLesson[];
  currentStep: LessonStep;
  onClose: () => void;
  onExport: (
    configuration: ExportConfiguration,
    onProgress: (progress: ExportProgress) => void,
    signal: AbortSignal
  ) => Promise<string>;
}

export function ExportDialog({
  open,
  lesson,
  lessons,
  currentStep,
  onClose,
  onExport
}: ExportDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [scope, setScope] = useState<ExportConfiguration["scope"]>("current-lesson");
  const [view, setView] = useState<ExportConfiguration["view"]>("student");
  const [revealMode, setRevealMode] = useState<ExportConfiguration["revealMode"]>("final");
  const [quality, setQuality] = useState<ExportConfiguration["quality"]>("high");
  const [selectedStepIds, setSelectedStepIds] = useState<string[]>([currentStep.id]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState<ExportProgress | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      setError(null);
      setMessage(null);
      setSelectedStepIds([currentStep.id]);
      dialog.showModal();
      dialog.querySelector<HTMLElement>("input:checked")?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
      document.getElementById("pptx-export-trigger")?.focus();
    }
  }, [currentStep.id, open]);

  const configuration = useMemo<ExportConfiguration>(
    () => ({
      scope,
      currentLessonId: lesson.lesson_id,
      currentStepId: currentStep.id,
      selectedStepIds,
      view,
      revealMode,
      quality
    }),
    [currentStep.id, lesson.lesson_id, quality, revealMode, scope, selectedStepIds, view]
  );
  const plannedSlides = useMemo(
    () => planExportSlides(lessons, configuration),
    [configuration, lessons]
  );
  const themeLessons = lessons.filter((item) => item.theme_id === lesson.theme_id);
  const themeStepCount = themeLessons.reduce((count, item) => count + item.steps.length, 0);

  const changeSelectedStep = (stepId: string, checked: boolean) => {
    setSelectedStepIds((current) =>
      checked
        ? current.includes(stepId) ? current : [...current, stepId]
        : current.filter((id) => id !== stepId)
    );
  };

  const cancelOrClose = () => {
    abortRef.current?.abort();
    if (!busy) onClose();
  };

  const runExport = async () => {
    if (!plannedSlides.length) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setError(null);
    setMessage("Render yüzeyi hazırlanıyor…");
    setProgress(null);

    try {
      const fileName = await onExport(configuration, setProgress, controller.signal);
      setMessage(`${fileName} indirme listesine eklendi.`);
    } catch (caught) {
      const exportError = caught instanceof Error ? caught : new Error(String(caught));
      if (exportError.name === "AbortError") {
        setMessage("Dışa aktarma iptal edildi.");
      } else {
        setError(exportError.message);
        setMessage(null);
      }
    } finally {
      abortRef.current = null;
      setBusy(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="pptx-export-dialog"
      aria-labelledby="pptx-export-title"
      onCancel={(event) => {
        event.preventDefault();
        cancelOrClose();
      }}
      onClose={() => {
        if (open && !busy) onClose();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current && !busy) onClose();
      }}
    >
      <div className="pptx-export-dialog__header">
        <div>
          <p className="pptx-export-dialog__eyebrow">DIŞA AKTAR</p>
          <h2 id="pptx-export-title">PowerPoint (.pptx)</h2>
          <p>{lesson.title} · Basılı s. {lesson.printed_page_range}</p>
        </div>
        <button type="button" className="pptx-export-dialog__close" onClick={cancelOrClose} aria-label="Dışa aktarmayı kapat">
          ×
        </button>
      </div>

      <div className="pptx-export-dialog__body">
        <fieldset className="pptx-export-fieldset">
          <legend>Kapsam</legend>
          <label className="pptx-export-choice">
            <input type="radio" name="pptx-scope" value="current-lesson" checked={scope === "current-lesson"} onChange={() => setScope("current-lesson")} />
            <span><strong>Mevcut dersin tamamı</strong><small>{lesson.steps.length} adım</small></span>
          </label>
          <label className="pptx-export-choice">
            <input type="radio" name="pptx-scope" value="selected-steps" checked={scope === "selected-steps"} onChange={() => setScope("selected-steps")} />
            <span><strong>Seçili adımlar / sayfalar</strong><small>{selectedStepIds.length} adım seçili</small></span>
          </label>
          <label className="pptx-export-choice">
            <input type="radio" name="pptx-scope" value="theme" checked={scope === "theme"} onChange={() => setScope("theme")} />
            <span><strong>Temanın tüm dersleri</strong><small>{themeLessons.length} ders · {themeStepCount} adım</small></span>
          </label>
        </fieldset>

        {scope === "selected-steps" ? (
          <fieldset className="pptx-export-selected">
            <legend>Bu dersten alınacak adımlar</legend>
            <div className="pptx-export-selected__actions">
              <button type="button" onClick={() => setSelectedStepIds(lesson.steps.map((step) => step.id))}>Tümünü seç</button>
              <button type="button" onClick={() => setSelectedStepIds([currentStep.id])}>Yalnız mevcut adım</button>
            </div>
            <div className="pptx-export-selected__list">
              {lesson.steps.map((step, index) => (
                <label className="pptx-export-step" key={step.id}>
                  <input
                    type="checkbox"
                    checked={selectedStepIds.includes(step.id)}
                    onChange={(event) => changeSelectedStep(step.id, event.target.checked)}
                  />
                  <span className="pptx-export-step__page">s. {step.source.printed_page_range}</span>
                  <span className="pptx-export-step__label">{index + 1}. {step.display_prompt}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

        <fieldset className="pptx-export-fieldset pptx-export-fieldset--inline">
          <legend>Görünüm</legend>
          <label className="pptx-export-choice">
            <input type="radio" name="pptx-view" value="student" checked={view === "student"} onChange={() => setView("student")} />
            <span><strong>Öğrenci</strong><small>Öğretmen notu, yönlendirme ve açıklama dışarıda kalır.</small></span>
          </label>
          <label className="pptx-export-choice">
            <input type="radio" name="pptx-view" value="teacher" checked={view === "teacher"} onChange={() => setView("teacher")} />
            <span><strong>Öğretmen</strong><small>Öğretmen notu, yönlendirme ve açıklama dahil edilir.</small></span>
          </label>
        </fieldset>

        <fieldset className="pptx-export-fieldset pptx-export-fieldset--inline">
          <legend>Reveal davranışı</legend>
          <label className="pptx-export-choice">
            <input type="radio" name="pptx-reveal" value="final" checked={revealMode === "final"} onChange={() => setRevealMode("final")} />
            <span><strong>Yalnız son görünüm</strong><small>Her adım için tek slayt.</small></span>
          </label>
          <label className="pptx-export-choice">
            <input type="radio" name="pptx-reveal" value="stages" checked={revealMode === "stages"} onChange={() => setRevealMode("stages")} />
            <span><strong>Reveal aşamalarını ayrı slaytlar yap</strong><small>Soru ve her açılma sırası ayrı slayt olur; animasyon eklenmez.</small></span>
          </label>
        </fieldset>

        <label className="pptx-export-quality">
          <span>Görüntü kalitesi</span>
          <select value={quality} onChange={(event) => setQuality(event.target.value as ExportConfiguration["quality"])}>
            <option value="high">Yüksek · 3840 × 2160</option>
            <option value="standard">Standart · 1920 × 1080</option>
          </select>
        </label>

        <p className="pptx-export-estimate" aria-live="polite">
          {plannedSlides.length} slayt · 16:9 · {view === "teacher" ? "öğretmen" : "öğrenci"} görünümü
        </p>
        {error ? <p className="pptx-export-error" role="alert">Dışa aktarma tamamlanamadı. {error}</p> : null}
        {message ? <p className="pptx-export-status" role="status">{message}</p> : null}
        {progress ? (
          <p className="pptx-export-status" aria-live="polite">
            Görsel hazırlanıyor: {progress.completed}/{progress.total} · s. {progress.slide.printedPage} · {progress.slide.stepId} · {progress.slide.revealLabel}
          </p>
        ) : null}
      </div>

      <div className="pptx-export-dialog__footer">
        <button type="button" className="pptx-export-secondary" onClick={cancelOrClose}>
          {busy ? "İptal et" : "Kapat"}
        </button>
        <button type="button" className="pptx-export-primary" onClick={() => void runExport()} disabled={busy || plannedSlides.length === 0}>
          {busy ? "PowerPoint hazırlanıyor…" : "PowerPoint oluştur"}
        </button>
      </div>
    </dialog>
  );
}
