import type { LessonData } from "../types";

interface LessonToolbarProps {
  lesson: LessonData;
  lessons: LessonData[];
  displayOnly: boolean;
  overrideWarning: string | null;
  backupKey: string | null;
  outlineOpen: boolean;
  editorOpen: boolean;
  onWarningDismiss: () => void;
  onLessonChange: (lessonId: string) => void;
  onOutlineToggle: () => void;
  onEditorToggle: () => void;
  onOpenStudentDisplay: () => void;
  onPresentationToggle: () => void;
  onFullscreen: () => void;
}

export function LessonToolbar({
  lesson,
  lessons,
  displayOnly,
  overrideWarning,
  backupKey,
  outlineOpen,
  editorOpen,
  onWarningDismiss,
  onLessonChange,
  onOutlineToggle,
  onEditorToggle,
  onOpenStudentDisplay,
  onPresentationToggle,
  onFullscreen
}: LessonToolbarProps) {
  const lessonCatalog = lessons;
  return (
      <header className="topbar">
        <div>
          <div className="topbar__kicker">ÖĞRETMEN REHBERİ · DERS MODU</div>
          <div className="topbar__title">{lesson.title}</div>
          {!displayOnly && overrideWarning ? (
            <div className="override-warning" role="status">
              <span>{overrideWarning}</span>
              {backupKey ? (
                <button type="button" onClick={() => {
                  const raw = window.localStorage.getItem(backupKey!);
                  if (raw === null) return;
                  const blob = new Blob([raw], { type: "application/json" });
                  const href = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.href = href;
                  link.download = `${lesson.lesson_slug}-old-edits-backup.json`;
                  document.body.appendChild(link);
                  link.click();
                  link.remove();
                  URL.revokeObjectURL(href);
                }}>
                  Eski düzenlemeleri indir
                </button>
              ) : null}
              <button type="button" onClick={() => onWarningDismiss()}>
                Kapat
              </button>
            </div>
          ) : null}
        </div>
        <div className="topbar__actions">
          {lessonCatalog.length > 1 ? (
            <label className="lesson-select">
              <span>Ders</span>
              <select
                value={lesson.lesson_id}
                onChange={(event) => onLessonChange(event.target.value)}
              >
                {lessonCatalog.map((item) => (
                  <option value={item.lesson_id} key={item.lesson_id}>
                    {item.title} · s. {item.printed_page_range}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <button type="button" onClick={onOutlineToggle}>
            {outlineOpen ? "Akış" : "Akış"}
          </button>
          <button type="button" onClick={onEditorToggle}>
            {editorOpen ? "Düzenlemeyi kapat" : "Düzenle"}
          </button>
          <button type="button" onClick={onOpenStudentDisplay}>
            Öğrenci ekranı
          </button>
          <button type="button" onClick={onPresentationToggle}>
            Projeksiyon
          </button>
          <button type="button" onClick={onFullscreen}>
            Tam ekran
          </button>
        </div>
      </header>

  );
}
