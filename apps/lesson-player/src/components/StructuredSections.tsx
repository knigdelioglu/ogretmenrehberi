function renderValue(value: unknown): JSX.Element {
  if (Array.isArray(value)) {
    return (
      <div className="structured-list">
        {value.map((item, index) => (
          <div className="structured-list__row" key={index}>
            <span className="structured-list__index">{index + 1}</span>
            <span>{String(item)}</span>
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
  sections
}: {
  sections: Record<string, unknown>;
}) {
  return (
    <div className="section-grid">
      {Object.entries(sections).map(([key, value]) => (
        <article className="section-card" key={key}>
          <h3>{key.replaceAll("_", " ")}</h3>
          {renderValue(value)}
        </article>
      ))}
    </div>
  );
}
