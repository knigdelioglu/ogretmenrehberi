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
  const termThemes = workflow.themes.filter((item) => item.term === theme.term);
  const termItems = workflow.annual.items.filter((item) => item.term === theme.term);

  return (
    <aside
      className="teacher-guide"
      role="dialog"
      aria-label="Öğretmen atölye, sunum ve portfolyo rehberi"
      aria-modal="false"
    >
      <header className="teacher-guide__header">
        <div>
          <span className="teacher-guide__kicker">ÖĞRETMENE ÖZEL · {theme.term}. DÖNEM</span>
          <h2>Üç takip hattı · {theme.title}</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Öğretmen rehberini kapat">
          Kapat
        </button>
      </header>

      <div className="teacher-guide__body">
        <p className="teacher-guide__context">
          Bu üç hat dört temanın tamamında ayrı gösterilir. Dersin sayfasına bağlı atölye
          hatırlatmasıyla birlikte dönemlik eser/film ve portfolyo rehberi kullanılır.
          Bu panel öğrenci veya puan verisi kaydetmez.
        </p>

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
            Bu sayfada atölye teslimi yok. İlgili ürünler aşağıda;
            her sınıf içi alıştırma otomatik olarak portfolyo ödevi değildir.
          </p>
        )}

        <section aria-labelledby="teacher-guide-workshop">
          <h3 id="teacher-guide-workshop">1 · Edebiyat Atölyesi</h3>
          <p className="teacher-guide__context">
            {theme.term}. dönemde {termThemes.length} tema × 2 atölye = 4 ayrı
            konuşma/yazma ürünü. Bu temanın görevleri:
          </p>
          {theme.tasks.map((task) => (
            <details key={task.id} open={currentTasks.some((item) => item.id === task.id)}>
              <summary>{task.skill} · s. {task.from}–{task.to} · {task.title}</summary>
              <p><b>Uygulama:</b> {task.timing}</p>
              <p><b>Ölçme:</b> {task.assessment}</p>
            </details>
          ))}
          <p className="teacher-guide__context">
            Aynı dönemdeki diğer tema:{" "}
            {termThemes.filter((item) => item.id !== theme.id)
              .map((item) => item.title).join(", ")}.
          </p>
          <a href={theme.source} target="_blank" rel="noreferrer">
            Resmî {theme.title} tema programını aç ↗
          </a>
        </section>

        <section aria-labelledby="teacher-guide-annual">
          <h3 id="teacher-guide-annual">2 · Dört eser + bir film sunumları</h3>
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

        <section aria-labelledby="teacher-guide-portfolio">
          <h3 id="teacher-guide-portfolio">3 · Portfolyo ve değerlendirme kayıtları</h3>
          <p className="teacher-guide__context">
            Bu tema için iki atölye ürünü ve bir tema sonu yansıtması:
          </p>
          {theme.tasks.map((task) => (
            <details key={task.id}>
              <summary>{task.skill} portfolyosu · {task.title}</summary>
              <p><b>Saklanacak kanıt:</b> {task.portfolio}</p>
              <p><b>Değerlendirme:</b> {task.assessment}</p>
            </details>
          ))}
          <details>
            <summary>Öz değerlendirme · s. {theme.reflection.page} · {theme.reflection.title}</summary>
            <p><b>Portfolyo:</b> {theme.reflection.portfolio}</p>
          </details>
          <p><b>Yıllık eser/film dosyası:</b> {workflow.annual.portfolio}</p>
          <p><b>Puanlama ayrımı:</b> {workflow.annual.assessment}</p>
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
