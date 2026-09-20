import { useEffect, useState } from "react";
import workflow from "../teacher-workflow.json";
import type { LessonData, LessonStep } from "../types";

interface TeacherGuidePanelProps {
  lesson: LessonData;
  step: LessonStep;
  onClose: () => void;
}

type Track = "workshop" | "annual" | "portfolio";
type PlanMarks = Record<Track, string[]>;
const planKey = "ogretmenrehberi.teacher-workflow.2026-2027.v1";

const allowedMarks: Record<Track, Set<string>> = {
  workshop: new Set(workflow.themes.flatMap((theme) => theme.tasks.map((task) => task.id))),
  annual: new Set(workflow.annual.items.map((item) => item.id)),
  portfolio: new Set([
    ...workflow.themes.flatMap((theme) => [
      ...theme.tasks.map((task) => `task:${task.id}`),
      `reflection:${theme.id}`
    ]),
    ...workflow.annual.items.map((item) => `annual:${item.id}`)
  ])
};

function restorePlan(): PlanMarks {
  const empty: PlanMarks = { workshop: [], annual: [], portfolio: [] };
  try {
    const raw = window.localStorage.getItem(planKey);
    if (!raw) return empty;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return empty;
    const record = parsed as Record<string, unknown>;
    const result = { ...empty };
    for (const track of ["workshop", "annual", "portfolio"] as const) {
      const values = record[track];
      result[track] = Array.isArray(values)
        ? [...new Set(values.filter(
          (id): id is string => typeof id === "string" && allowedMarks[track].has(id)
        ))]
        : [];
    }
    return result;
  } catch {
    return empty;
  }
}

export function TeacherGuidePanel({ lesson, step, onClose }: TeacherGuidePanelProps) {
  const [selectedThemeId, setSelectedThemeId] = useState(lesson.theme_id);
  const [marks, setMarks] = useState<PlanMarks>(restorePlan);
  const [saveWarning, setSaveWarning] = useState(false);

  useEffect(() => {
    setSelectedThemeId(lesson.theme_id);
  }, [lesson.theme_id]);

  useEffect(() => {
    try {
      window.localStorage.setItem(planKey, JSON.stringify(marks));
      setSaveWarning(false);
    } catch {
      setSaveWarning(true);
    }
  }, [marks]);

  const theme = workflow.themes.find((item) => item.id === selectedThemeId);
  if (!theme) return null;

  const isCurrentTheme = theme.id === lesson.theme_id;
  const currentPage = isCurrentTheme
    ? Number.parseInt(step.source.printed_page_range, 10)
    : null;
  const currentTasks = currentPage === null ? [] : theme.tasks.filter(
    (task) => currentPage >= task.from && currentPage <= task.to
  );
  const termThemes = workflow.themes.filter((item) => item.term === theme.term);
  const termItems = workflow.annual.items.filter((item) => item.term === theme.term);
  const linkedItems = termItems.filter((item) => item.recommended_theme_id === theme.id);

  function toggleMark(track: Track, id: string) {
    if (!allowedMarks[track].has(id)) return;
    setMarks((previous) => ({
      ...previous,
      [track]: previous[track].includes(id)
        ? previous[track].filter((value) => value !== id)
        : [...previous[track], id]
    }));
  }

  function marked(track: Track, id: string) {
    return marks[track].includes(id);
  }

  const workshopDone = theme.tasks.filter((task) => marked("workshop", task.id)).length;
  const annualDone = linkedItems.filter((item) => marked("annual", item.id)).length;
  const portfolioKeys = [
    ...theme.tasks.map((task) => `task:${task.id}`),
    `reflection:${theme.id}`,
    ...linkedItems.map((item) => `annual:${item.id}`)
  ];
  const portfolioDone = portfolioKeys.filter((key) => marked("portfolio", key)).length;

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
        <nav className="teacher-guide__theme-tabs" aria-label="Rehber teması seçimi">
          {workflow.themes.map((item, index) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={theme.id === item.id}
              onClick={() => setSelectedThemeId(item.id)}
            >
              {index + 1}. Tema
              {lesson.theme_id === item.id ? " · Ders" : ""}
            </button>
          ))}
        </nav>
        <p className="teacher-guide__context">
          Dört temanın üç hattını yukarıdan inceleyebilirsin. İşaretler yalnız bu
          cihazdaki öğretmen planına aittir; öğrenci bazlı teslim, sınıf yoklaması
          veya puan kaydı değildir.
        </p>
        {saveWarning ? (
          <p role="status" className="teacher-guide__context">
            Plan işaretleri bu tarayıcıda kaydedilemedi; sayfa yenilenince korunmayabilir.
          </p>
        ) : null}

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
            {isCurrentTheme
              ? "Bu sayfada atölye teslimi yok. Aşağıdaki tema ürünlerini izleyebilirsiniz."
              : "Seçili tema, açık dersten farklı. Ders sayfası hatırlatması yerine temanın bütün görevleri gösteriliyor."}
          </p>
        )}

        <section aria-labelledby="teacher-guide-workshop">
          <h3 id="teacher-guide-workshop">
            1 · Edebiyat Atölyesi <span className="teacher-guide__count">{workshopDone}/2 plan işareti</span>
          </h3>
          <p className="teacher-guide__context">
            {theme.term}. dönem: {termThemes.length} tema × 2 atölye = 4 konuşma/yazma
            ürünü. Bu temada konuşma ve yazma görevi ayrı değerlendirilir.
          </p>
          {theme.tasks.map((task) => (
            <div className="teacher-guide__entry" key={task.id}>
              <details>
                <summary>{task.skill} · s. {task.from}–{task.to} · {task.title}</summary>
                <p><b>Uygulama:</b> {task.timing}</p>
                <p><b>Ölçme:</b> {task.assessment}</p>
              </details>
              <label className="teacher-guide__check">
                <input
                  type="checkbox"
                  checked={marked("workshop", task.id)}
                  onChange={() => toggleMark("workshop", task.id)}
                />
                Bu atölye için uygulama ve değerlendirme hatırlatmasını işledim
              </label>
            </div>
          ))}
          <p className="teacher-guide__context">
            Aynı dönemdeki diğer tema: {termThemes
              .filter((item) => item.id !== theme.id)
              .map((item) => item.title).join(", ")}.
          </p>
          <a href={theme.source} target="_blank" rel="noreferrer">
            Resmî {theme.title} tema programını aç ↗
          </a>
        </section>

        <section aria-labelledby="teacher-guide-annual">
          <h3 id="teacher-guide-annual">
            2 · Dört eser + bir film sunumları{" "}
            <span className="teacher-guide__count">
              {annualDone}/{linkedItems.length} bu temayla ilişkili plan işareti
            </span>
          </h3>
          <p className="teacher-guide__context">{workflow.annual.note}</p>
          {termItems.map((item) => (
            <div className="teacher-guide__entry" key={item.id}>
              <details>
                <summary>
                  {item.recommended_theme_id === theme.id ? "Bu tema · " : ""}
                  {item.title} · Önerilen sunum haftası: {item.suggested_presentation.label}
                </summary>
                <p><b>Zamanlama gerekçesi:</b> {item.window}</p>
                <p><b>Öğrenciden alınacak:</b> {item.portfolio}</p>
                <p><b>Form:</b> {workflow.annual.form}</p>
              </details>
              <label className="teacher-guide__check">
                <input
                  type="checkbox"
                  checked={marked("annual", item.id)}
                  onChange={() => toggleMark("annual", item.id)}
                />
                Bu eser/film için sunum planını işledim
              </label>
            </div>
          ))}
          <p className="teacher-guide__context">{workflow.annual.preparation_note}</p>
          <p className="teacher-guide__context">{workflow.annual.exam_fallback}</p>
          <p className="teacher-guide__context">
            Film için 2. dönem yalnız öneridir; resmî yıllık hüküm filmin dönemini sabitlemez.
          </p>
        </section>

        <section aria-labelledby="teacher-guide-portfolio">
          <h3 id="teacher-guide-portfolio">
            3 · Portfolyo ve değerlendirme kayıtları{" "}
            <span className="teacher-guide__count">
              {portfolioDone}/{portfolioKeys.length} bu temanın kanıt işareti
            </span>
          </h3>
          <p className="teacher-guide__context">
            Bu tema için iki atölye ürünü ve bir tema sonu yansıtması; ayrıca bu
            temayla ilişkilendirilen önerilen eser/film çalışmaları:
          </p>
          {theme.tasks.map((task) => (
            <div className="teacher-guide__entry" key={task.id}>
              <details>
                <summary>{task.skill} portfolyosu · {task.title}</summary>
                <p><b>Saklanacak kanıt:</b> {task.portfolio}</p>
                <p><b>Değerlendirme:</b> {task.assessment}</p>
              </details>
              <label className="teacher-guide__check">
                <input
                  type="checkbox"
                  checked={marked("portfolio", `task:${task.id}`)}
                  onChange={() => toggleMark("portfolio", `task:${task.id}`)}
                />
                Bu ürünün portfolyo ve geri bildirim kanıtlarını kontrol etmeyi işaretledim
              </label>
            </div>
          ))}
          <div className="teacher-guide__entry">
            <details>
              <summary>Öz değerlendirme · s. {theme.reflection.page} · {theme.reflection.title}</summary>
              <p><b>Portfolyo:</b> {theme.reflection.portfolio}</p>
            </details>
            <label className="teacher-guide__check">
              <input
                type="checkbox"
                checked={marked("portfolio", `reflection:${theme.id}`)}
                onChange={() => toggleMark("portfolio", `reflection:${theme.id}`)}
              />
              Tema sonu yansıtma kanıtını kontrol etmeyi işaretledim
            </label>
          </div>
          {linkedItems.map((item) => (
            <div className="teacher-guide__entry" key={item.id}>
              <details>
                <summary>{item.title} · Ek-1 ve sunu dosyası</summary>
                <p><b>Portfolyo:</b> {item.portfolio}</p>
                <p><b>Önerilen sunum:</b> {item.suggested_presentation.label}</p>
              </details>
              <label className="teacher-guide__check">
                <input
                  type="checkbox"
                  checked={marked("portfolio", `annual:${item.id}`)}
                  onChange={() => toggleMark("portfolio", `annual:${item.id}`)}
                />
                Ek-1 ve sunu için portfolyo kontrolünü işaretledim
              </label>
            </div>
          ))}
          <p><b>Yıllık eser/film dosyası:</b> {workflow.annual.portfolio}</p>
          <p><b>Puanlama ayrımı:</b> {workflow.annual.assessment}</p>
          <p className="teacher-guide__context">
            Öğrencinin ürünü ve geri bildirimi portfolyosunda; öğretmenin puan kaydı
            öğretmen tarafında tutulabilir. İşaretler öğrenci bazlı teslim veya not değildir.
          </p>
          <a href={workflow.sources.general} target="_blank" rel="noreferrer">
            MEB'in yıllık eser ve film açıklaması ↗
          </a>
        </section>
      </div>
    </aside>
  );
}
