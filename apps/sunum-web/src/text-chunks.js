export function splitAtSentences(text, maxChars = 760) {
  const value = String(text ?? "");
  if (value.length <= maxChars) return [value];

  const sentences = typeof Intl.Segmenter === "function"
    ? [...new Intl.Segmenter("tr", { granularity: "sentence" }).segment(value)].map((part) => part.segment)
    : [value];
  const pieces = [];
  for (const sentence of sentences) {
    if (sentence.length <= maxChars) {
      pieces.push(sentence);
      continue;
    }
    let current = "";
    for (const token of sentence.match(/\s+|\S+/gu) ?? [sentence]) {
      if (current && current.length + token.length > maxChars) {
        pieces.push(current);
        current = "";
      }
      if (token.length <= maxChars) {
        current += token;
        continue;
      }
      const points = [...token];
      while (points.length) {
        const part = points.splice(0, maxChars).join("");
        if (current) {
          pieces.push(current);
          current = "";
        }
        pieces.push(part);
      }
    }
    if (current) pieces.push(current);
  }

  const pages = [];
  let current = "";
  for (const piece of pieces) {
    if (current && current.length + piece.length > maxChars) {
      pages.push(current);
      current = "";
    }
    current += piece;
  }
  if (current) pages.push(current);
  return pages.length ? pages : [value];
}
