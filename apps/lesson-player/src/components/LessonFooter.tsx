import type { LessonStep } from "../types";

export function LessonFooter({
  index,
  totalSteps,
  step,
  presentationMode,
  goTo
}: {
  index: number;
  totalSteps: number;
  step: LessonStep;
  presentationMode: boolean;
  goTo: (next: number) => void;
}) {
  const pageProgress = Math.round(((index + 1) / totalSteps) * 100);
  return (
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
                {index + 1} / {totalSteps} · s. {step.source.printed_page_range}
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
            disabled={index === totalSteps - 1}
            onClick={() => goTo(index + 1)}
          >
            Sonraki →
          </button>
        </footer>
  );
}
