const DOWNLOAD_URL = /^assets\/assessment-documents\/[A-Za-z0-9._-]+\.(docx|xlsx)$/i;

export function assessmentDownloads(catalog) {
  const files = new Map();
  for (const lesson of catalog?.lessons ?? []) {
    for (const step of lesson.steps ?? []) {
      for (const source of step.content?.sources ?? []) {
        const match = DOWNLOAD_URL.exec(source.url ?? "");
        if (source.download !== true || !match || files.has(source.url)) continue;
        const isWorkbook = match[1].toLowerCase() === "xlsx";
        files.set(source.url, {
          url: source.url,
          label: isWorkbook ? "Puanlama Exceli" : source.label,
          type: isWorkbook ? "XLSX" : "DOCX"
        });
      }
    }
  }
  return [...files.values()].sort((a, b) => {
    if (a.type !== b.type) return a.type === "XLSX" ? -1 : 1;
    return a.label.localeCompare(b.label, "tr");
  });
}
