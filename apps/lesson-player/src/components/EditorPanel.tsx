import type { LayoutKind, LessonStep } from "../types";

interface EditorPanelProps {
  step: LessonStep;
  hasOverride: boolean;
  onPromptChange: (value: string) => void;
  onLayoutChange: (value: LayoutKind) => void;
  onReset: () => void;
  onExport: () => void;
  onClose: () => void;
}

const layouts: Array<{ value: LayoutKind; label: string }> = [
  { value: "question", label: "Soru" },
  { value: "vocabulary", label: "Kelime / söz varlığı" },
  { value: "process", label: "Süreç / uygulama" },
  { value: "reference", label: "Bilgi / referans" },
  { value: "comparison", label: "Karşılaştırma" },
  { value: "structure", label: "Yapılandırılmış cevap" },
  { value: "assessment", label: "Değerlendirme" }
];

export function EditorPanel({
  step,
  hasOverride,
  onPromptChange,
  onLayoutChange,
  onReset,
  onExport,
  onClose
}: EditorPanelProps) {
  return (
    <aside className="editor-panel" aria-label="Sunum düzenleme paneli">
      <div className="editor-panel__header">
        <div>
          <div className="editor-panel__eyebrow">DÜZENLEME MODU</div>
          <h2>Sunum katmanı</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Düzenleyiciyi kapat">
          ×
        </button>
      </div>

      <div className="editor-panel__source">
        <span>Basılı s. {step.source.printed_page_range}</span>
        <strong>{step.source.book_heading}</strong>
        <code>{step.source.source_record_id}</code>
        {step.answer ? <code>{step.answer.question_id}</code> : null}
      </div>

      <label className="editor-field">
        <span>Ekranda gösterilecek soru / başlık</span>
        <textarea
          rows={5}
          value={step.display_prompt}
          onChange={(event) => onPromptChange(event.target.value)}
        />
        <small>
          Buradaki değişiklik kanonik answer-bank içeriğini değiştirmez; yalnız
          lesson-flow sunum başlığını değiştirir.
        </small>
      </label>

      <label className="editor-field">
        <span>Görünüm tipi</span>
        <select
          value={step.layout}
          onChange={(event) => onLayoutChange(event.target.value as LayoutKind)}
        >
          {layouts.map((layout) => (
            <option value={layout.value} key={layout.value}>
              {layout.label}
            </option>
          ))}
        </select>
      </label>

      <div className="editor-panel__status">
        {hasOverride
          ? "Bu adımda yerel sunum değişikliği var."
          : "Bu adım lesson-flow varsayılanını kullanıyor."}
      </div>

      <div className="editor-panel__actions">
        <button type="button" onClick={onReset} disabled={!hasOverride}>
          Bu adımı sıfırla
        </button>
        <button type="button" className="primary" onClick={onExport}>
          lesson-flow JSON dışa aktar
        </button>
      </div>
    </aside>
  );
}
