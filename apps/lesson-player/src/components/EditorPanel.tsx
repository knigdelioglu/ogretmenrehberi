import type {
  LayoutKind,
  LessonStep,
  RevealKey,
  StepContent
} from "../types";

interface EditorPanelProps {
  step: LessonStep;
  hasOverride: boolean;
  onPromptChange: (value: string) => void;
  onLayoutChange: (value: LayoutKind) => void;
  onRevealMove: (key: RevealKey, delta: -1 | 1) => void;
  onContentChange: (content: StepContent) => void;
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
  onContentChange,
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

      {step.content ? (
        <div className="editor-content-block">
          <div className="editor-content-block__title">Ekran içeriği</div>

          <label className="editor-field">
            <span>Giriş / ana yönerge</span>
            <textarea
              rows={4}
              value={step.content.lead ?? ""}
              onChange={(event) =>
                onContentChange({
                  ...step.content!,
                  lead: event.target.value
                })
              }
            />
          </label>

          {step.content.items ? (
            <div className="editor-field">
              <span>Adımlar / maddeler</span>
              <div className="editor-content-list">
                {step.content.items.map((item, itemIndex) => (
                  <div className="editor-content-list__row" key={itemIndex}>
                    <textarea
                      rows={2}
                      value={item}
                      onChange={(event) => {
                        const items = [...(step.content?.items ?? [])];
                        items[itemIndex] = event.target.value;
                        onContentChange({ ...step.content!, items });
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const items = (step.content?.items ?? []).filter(
                          (_, index) => index !== itemIndex
                        );
                        onContentChange({ ...step.content!, items });
                      }}
                      aria-label="Maddeyi kaldır"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <button
                className="editor-inline-add"
                type="button"
                onClick={() =>
                  onContentChange({
                    ...step.content!,
                    items: [...(step.content?.items ?? []), "Yeni adım"]
                  })
                }
              >
                + Madde ekle
              </button>
            </div>
          ) : null}

          {step.content.sections ? (
            <div className="editor-field">
              <span>Bilgi kartları</span>
              <div className="editor-section-list">
                {step.content.sections.map((section, sectionIndex) => (
                  <div className="editor-section-card" key={sectionIndex}>
                    <input
                      value={section.title}
                      onChange={(event) => {
                        const sections = [...(step.content?.sections ?? [])];
                        sections[sectionIndex] = {
                          ...sections[sectionIndex],
                          title: event.target.value
                        };
                        onContentChange({ ...step.content!, sections });
                      }}
                      aria-label="Kart başlığı"
                    />
                    <textarea
                      rows={3}
                      value={section.body}
                      onChange={(event) => {
                        const sections = [...(step.content?.sections ?? [])];
                        sections[sectionIndex] = {
                          ...sections[sectionIndex],
                          body: event.target.value
                        };
                        onContentChange({ ...step.content!, sections });
                      }}
                      aria-label="Kart açıklaması"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const sections = (step.content?.sections ?? []).filter(
                          (_, index) => index !== sectionIndex
                        );
                        onContentChange({ ...step.content!, sections });
                      }}
                    >
                      Kartı kaldır
                    </button>
                  </div>
                ))}
              </div>
              <button
                className="editor-inline-add"
                type="button"
                onClick={() =>
                  onContentChange({
                    ...step.content!,
                    sections: [
                      ...(step.content?.sections ?? []),
                      { title: "Yeni kart", body: "Açıklama" }
                    ]
                  })
                }
              >
                + Kart ekle
              </button>
            </div>
          ) : null}

          {"note" in step.content ? (
            <label className="editor-field">
              <span>Öğretmen notu</span>
              <textarea
                rows={4}
                value={step.content.note ?? ""}
                onChange={(event) =>
                  onContentChange({
                    ...step.content!,
                    note: event.target.value
                  })
                }
              />
            </label>
          ) : null}
        </div>
      ) : null}

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
