import workflow from "../teacher-workflow.json";
import type { LessonData, LessonStep } from "../types";

interface TeacherGuidePanelProps {
  lesson: LessonData;
  step: LessonStep;
  onClose: () => void;
}

export function TeacherGuidePanel({ lesson, step, onClose }: TeacherGuidePanelProps) {
  const theme = workflow.themes.find((item) => item.id === lesson.theme_id);
  if (!theme) return null;

  const currentPage = Number.parseInt(step.source.printed_page_range, 10);
  const currentTasks = theme.tasks.filter(
    (task) => currentPage >= task.from && currentPage <= task.to
  );
  const termItems = workflow.annual.items.filter((item) => item.term === theme.term);

  return (
    <aside
      className="teacher-guide"
      role="dialog"
      aria-label="Öğretmen çalışma ve portfolyo rehberi"
      aria-modal="false"
    >
      <header className="teacher-guide__header">
        <div>
          <span className="teacher-guide__kicker">ÖĞRETMENE ÖZEL · {theme.term}. DÖNEM</span>
          <h2>Atölye, portfolyo ve eser takibi</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Öğretmen rehberini kapat">
          Kapat
        </button>
      </header>

      <div className="teacher-guide__body">
        {currentTasks.length ? (
          <section className="teacher-guide__current" aria-label="Şu anki ders görevi">
            <h3>Şu anki sayfayla ilgili görev · s. {currentPage}</h3>
            {currentTasks.map((task) => (
              <div key={task.id}>
                <strong>{task.skill}: {task.title}</strong>
                <p>{task.timing}</p>
                <p><b>Portfolyo:</b> {task.portfolio}</p>
                <p><b>Değerlendirme:</b> {task.assessment}</p>
              </div>
            ))}
          </section>
        ) : (
          <p className="teacher-guide__context">
            Bu sayfada atölye teslimi yok. Temanın yaklaşan ürünleri aşağıda; her alıştırmayı
            portfolyoya ekletmek zorunda değilsiniz.
          </p>
        )}

        <section aria-labelledby="teacher-guide-theme">
          <h3 id="teacher-guide-theme">{theme.title} · Tema ürünleri</h3>
          <p className="teacher-guide__context">
            Her temada iki ayrı atölye performansı vardır: konuşma ve yazma.
            İki tema bir dönemi oluşturur; bunları tek bir görev saymayın.
          </p>
          {theme.tasks.map((task) => (
            <details key={task.id} open={currentTasks.some((item) => item.id === task.id)}>
              <summary>{task.skill} · s. {task.from}–{task.to} · {task.title}</summary>
              <p><b>Portfolyoya:</b> {task.portfolio}</p>
              <p><b>Ölçme:</b> {task.assessment}</p>
              <p><b>Zaman:</b> {task.timing}</p>
            </details>
          ))}
          <details>
            <summary>Öz değerlendirme · s. {theme.reflection.page} · {theme.reflection.title}</summary>
            <p>{theme.reflection.portfolio}</p>
          </details>
          <a href={theme.source} target="_blank" rel="noreferrer">
            Resmî {theme.title} tema programını aç ↗
          </a>
        </section>

        <section aria-labelledby="teacher-guide-annual">
          <h3 id="teacher-guide-annual">{theme.term}. dönem · Eser ve film çalışmaları</h3>
          <p className="teacher-guide__context">{workflow.annual.note}</p>
          {termItems.map((item) => (
            <details key={item.id}>
              <summary>{item.title} · Önerilen sunum haftası: {item.suggested_presentation.label}</summary>
              <p><b>Zamanlama gerekçesi:</b> {item.window}</p>
              <p><b>Öğrenciden alınacak:</b> {item.portfolio}</p>
              <p><b>Form:</b> {workflow.annual.form}</p>
            </details>
          ))}
          <p className="teacher-guide__context">{workflow.annual.preparation_note}</p>
          <p className="teacher-guide__context">{workflow.annual.exam_fallback}</p>
          <p className="teacher-guide__context">
            Film için 2. dönem yalnız öneridir; resmî yıllık hüküm filmin dönemini sabitlemez.
          </p>
        </section>

        <section aria-labelledby="teacher-guide-records">
          <h3 id="teacher-guide-records">Değerlendirme ve dosyalama ayrımı</h3>
          <p>{workflow.annual.assessment}</p>
          <p>{workflow.annual.portfolio}</p>
          <p className="teacher-guide__context">
            Öğrencinin ürünü ve geri bildirimi portfolyosunda; öğretmenin puan kaydı
            öğretmen tarafında tutulabilir. Bu ekran öğrenci/puan verisi saklamaz.
          </p>
          <a href={workflow.sources.general} target="_blank" rel="noreferrer">
            MEB'in yıllık eser ve film açıklaması ↗
          </a>
        </section>
      </div>
    </aside>
  );
}
