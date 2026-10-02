import type { ReactNode } from "react";
import type { LayoutKind, StepContent } from "../types";

type VisibleContent = Pick<StepContent, "items" | "sections">;

function ContentSections({
  sections,
  className
}: {
  sections: NonNullable<StepContent["sections"]>;
  className: string;
}) {
  return (
    <div className={className}>
      {sections.map((section, index) => (
        <article className="reference-card" key={index}>
          <h3>{section.title}</h3>
          <p>{section.body}</p>
        </article>
      ))}
    </div>
  );
}

function NumberedItems({ items }: { items: string[] }) {
  return (
    <div className="process-list">
      {items.map((item, index) => (
        <div className="process-list__row" key={index}>
          <span className="process-list__index" aria-hidden="true">
            {index + 1}
          </span>
          <span>{item}</span>
        </div>
      ))}
    </div>
  );
}

function ComparisonContent({ content }: { content: VisibleContent }) {
  const sections = content.sections;
  return (
    <div className="layout-content layout-content--comparison" data-content-layout="comparison">
      {content.items?.length ? (
        <div className="comparison-criteria" aria-label="Karşılaştırma ölçütleri">
          {content.items.map((item, index) => (
            <div className="comparison-criterion" key={index}>{item}</div>
          ))}
        </div>
      ) : null}
      {sections?.length ? (
        <ContentSections
          sections={sections}
          className={
            sections.length === 2
              ? "reference-grid comparison-pair"
              : "reference-grid comparison-grid"
          }
        />
      ) : null}
    </div>
  );
}

function StructureContent({ content }: { content: VisibleContent }) {
  return (
    <div className="layout-content layout-content--structure" data-content-layout="structure">
      {content.items?.length ? (
        <div className="structure-fields" aria-label="Çalışma başlıkları">
          {content.items.map((item, index) => (
            <div className="structure-field" key={index}>
              <span className="structure-field__number" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      ) : null}
      {content.sections?.length ? (
        <ContentSections sections={content.sections} className="reference-grid structure-sections" />
      ) : null}
    </div>
  );
}

function AssessmentContent({
  content,
  stepId,
  selections,
  onSelect,
  readOnly
}: {
  content: StepContent;
  stepId: string;
  selections: Record<number, string>;
  onSelect: (stepId: string, itemIndex: number, value: string) => void;
  readOnly: boolean;
}) {
  if (content.scale?.length) {
    return (
      <div className="layout-content layout-content--assessment" data-content-layout="assessment">
        <div className="assessment-table-wrap">
          <table className="assessment-table">
            <thead>
              <tr>
                <th scope="col">Değerlendirme ölçütleri</th>
                {content.scale.map((value) => <th scope="col" key={value}>{value}</th>)}
              </tr>
            </thead>
            <tbody>
              {content.items?.map((item, index) => (
                <tr key={`${stepId}-${index}`}>
                  <th scope="row">
                    <span className="assessment-table__number" aria-hidden="true">{index + 1}</span>
                    {item}
                  </th>
                  {content.scale?.map((value) => (
                    <td key={value}>
                      <input
                        type="radio"
                        name={`${stepId}-assessment-${index}`}
                        value={value}
                        checked={selections[index] === value}
                        disabled={readOnly}
                        onChange={() => onSelect(stepId, index, value)}
                        aria-label={`${item}: ${value}`}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {content.sections?.length ? (
          <ContentSections sections={content.sections} className="reference-grid assessment-sections" />
        ) : null}
      </div>
    );
  }

  return (
    <div className="layout-content layout-content--assessment" data-content-layout="assessment">
      {content.items?.length ? (
        <div className="assessment-criteria" aria-label="Değerlendirme ölçütleri">
          {content.items.map((item, index) => (
            <div className="assessment-criterion" key={index}>
              <input
                type="checkbox"
                checked={selections[index] === "checked"}
                disabled={readOnly}
                onChange={(event) => onSelect(stepId, index, event.target.checked ? "checked" : "")}
                aria-label={item}
              />
              <span>{item}</span>
            </div>
          ))}
        </div>
      ) : null}
      {content.sections?.length ? (
        <ContentSections sections={content.sections} className="reference-grid assessment-sections" />
      ) : null}
    </div>
  );
}

function ProcessContent({ content }: { content: VisibleContent }) {
  return (
    <div className="layout-content layout-content--process" data-content-layout="process">
      {content.items?.length ? <NumberedItems items={content.items} /> : null}
      {content.sections?.length ? (
        <ContentSections sections={content.sections} className="reference-grid process-sections" />
      ) : null}
    </div>
  );
}

function ReferenceContent({ content }: { content: VisibleContent }) {
  return (
    <div className="layout-content layout-content--reference" data-content-layout="reference">
      {content.items?.length ? <NumberedItems items={content.items} /> : null}
      {content.sections?.length ? (
        <ContentSections sections={content.sections} className="reference-grid" />
      ) : null}
    </div>
  );
}

const renderers: Record<
  Exclude<LayoutKind, "vocabulary" | "assessment">,
  (content: VisibleContent) => ReactNode
> = {
  comparison: (content) => <ComparisonContent content={content} />,
  structure: (content) => <StructureContent content={content} />,
  process: (content) => <ProcessContent content={content} />,
  reference: (content) => <ReferenceContent content={content} />,
  question: (content) => <ReferenceContent content={content} />
};

export function StepContentLayout({
  layout,
  content,
  stepId,
  assessmentSelections,
  onAssessmentSelect,
  assessmentReadOnly = false
}: {
  layout: LayoutKind;
  content: StepContent | null;
  stepId: string;
  assessmentSelections: Record<number, string>;
  onAssessmentSelect: (stepId: string, itemIndex: number, value: string) => void;
  assessmentReadOnly?: boolean;
}) {
  if (!content?.items?.length && !content?.sections?.length) return null;
  if (layout === "vocabulary") return null;
  if (layout === "assessment") {
    return (
      <AssessmentContent
        content={content}
        stepId={stepId}
        selections={assessmentSelections}
        onSelect={onAssessmentSelect}
        readOnly={assessmentReadOnly}
      />
    );
  }
  return <>{renderers[layout](content)}</>;
}
