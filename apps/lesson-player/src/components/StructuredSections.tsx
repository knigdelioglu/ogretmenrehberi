import type { ReactNode } from "react";
import type { LayoutKind } from "../types";

function renderValue(value: unknown): ReactNode {
  if (Array.isArray(value)) {
    return (
      <div className="structured-list">
        {value.map((item, index) => (
          <div className="structured-list__row" key={index}>
            <span className="structured-list__index">{index + 1}</span>
            <span>{renderValue(item)}</span>
          </div>
        ))}
      </div>
    );
  }

  if (value && typeof value === "object") {
    return (
      <div className="nested-sections">
        {Object.entries(value as Record<string, unknown>).map(([key, child]) => (
          <div className="nested-sections__row" key={key}>
            <strong>{key.replaceAll("_", " ")}</strong>
            {renderValue(child)}
          </div>
        ))}
      </div>
    );
  }

  return <p>{String(value ?? "")}</p>;
}

export function StructuredSections({
  sections,
  layout = "question"
}: {
  sections: Record<string, unknown> | string[];
  layout?: LayoutKind;
}) {
  const className = [
    "section-grid",
    `answer-sections--${layout}`,
    layout === "comparison" &&
    !Array.isArray(sections) &&
    Object.keys(sections).length === 2
      ? "answer-sections--paired"
      : ""
  ].filter(Boolean).join(" ");

  if (Array.isArray(sections)) {
    return <div className={className}>{renderValue(sections)}</div>;
  }
  return (
    <div className={className}>
      {Object.entries(sections).map(([key, value]) => (
        <article className="section-card" key={key}>
          <h3>{key.replaceAll("_", " ")}</h3>
          {renderValue(value)}
        </article>
      ))}
    </div>
  );
}
