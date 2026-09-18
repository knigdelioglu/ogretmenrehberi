import type { LayoutKind, LessonStep, RevealKey } from "../types";

interface EditorPanelProps {
  step: LessonStep;
  hasOverride: boolean;
  onPromptChange: (value: string) => void;
  onLayoutChange: (value: LayoutKind) => void;
  onRevealMove: (key: RevealKey, delta: -1 | 1) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onReset: () => void;
  onExport: () => void;
  onClose: () => void;
}

const revealLabels: Record<RevealKey, string> = {
  guidance: "Yönlendirme",
  answer: "Cevap",
  evidence: "Metinden kanıt",
  explanation: "Açıklama",
  note: "Öğretmen notu"
};

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
  onRevealMove,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
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

      {step.reveal_order.length > 1 ? (
        <div className="editor-field">
          <span>Açılma sırası</span>
          <div className="editor-reveal-order">
            {step.reveal_order.map((key, index) => (
              <div className="editor-reveal-row" key={key}>
                <span className="editor-reveal-row__index">{index + 1}</span>
                <span>{revealLabels[key]}</span>
                <div className="editor-reveal-row__actions">
                  <button
                    type="button"
                    onClick={() => onRevealMove(key, -1)}
                    disabled={index === 0}
                    aria-label={`${revealLabels[key]} katmanını yukarı taşı`}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => onRevealMove(key, 1)}
                    disabled={index === step.reveal_order.length - 1}
                    aria-label={`${revealLabels[key]} katmanını aşağı taşı`}
                  >
                    ↓
                  </button>
                </div>
              </div>
            ))}
          </div>
          <small>
            Space tuşuyla açılacak öğretmen katmanlarının sırasını belirler.
            Katman silinmez; yalnız sırası değişir.
          </small>
        </div>
      ) : null}

      <div className="editor-field">
        <span>Adım sırası</span>
        <div className="editor-order-actions">
          <button type="button" onClick={onMoveUp} disabled={!canMoveUp}>
            ↑ Yukarı taşı
          </button>
          <button type="button" onClick={onMoveDown} disabled={!canMoveDown}>
            ↓ Aşağı taşı
          </button>
        </div>
        <small>
          Yalnız presentation sırasını değiştirir; source-index ve answer-bank
          kayıtları değişmez.
        </small>
      </div>

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
