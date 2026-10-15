function normalize(value) {
  return String(value ?? "").normalize("NFC").replace(/\s+/gu, " ").trim();
}

function collectStrings(value, out = []) {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((item) => collectStrings(item, out));
  else if (value && typeof value === "object") Object.values(value).forEach((item) => collectStrings(item, out));
  return out;
}

function layerValues(step, layer) {
  if (layer === "answer") {
    // Some presentation units deliberately omit the long-form answer and show
    // only curated sections. Choose markers from the content the UI renders.
    return step.presentation?.web?.answer_text?.mode === "omit"
      ? [step.answer?.answer_sections]
      : [step.answer?.answer, step.answer?.answer_sections];
  }
  if (layer === "evidence") return [step.answer?.evidence_quotes];
  if (layer === "guidance") return [step.answer?.guidance];
  if (layer === "explanation") return [step.answer?.explanation];
  if (layer === "dictionary") return [step.answer?.dictionary_terms];
  if (layer === "note") return [step.content?.note];
  return [];
}

export function answerLayerMarker(step, layer = "answer") {
  const taskText = normalize(JSON.stringify({
    prompt: step.prompt ?? step.display_prompt,
    content: step.content
  }));
  const otherLayerText = normalize(JSON.stringify(
    ["answer", "evidence", "guidance", "explanation", "dictionary", "note"]
      .filter((key) => key !== layer)
      .map((key) => layerValues(step, key))
  ));
  const candidates = layerValues(step, layer).flatMap((value) => collectStrings(value))
    .map(normalize)
    .filter((text) => text.length >= 18)
    .map((text) => text.slice(0, Math.min(text.length, 64)))
    .filter((marker) => !taskText.includes(marker) && !otherLayerText.includes(marker));
  candidates.sort((left, right) => right.length - left.length);
  return candidates[0] ?? null;
}

export function assertLayerHidden(step, visibleText, layer, context) {
  const marker = answerLayerMarker(step, layer);
  if (!marker) throw new Error(`${context}: no independent ${layer} text marker could be selected from canonical data`);
  if (normalize(visibleText).includes(marker)) {
    throw new Error(`${context}: ${layer} content is visible before its reveal action`);
  }
  return marker;
}

export function assertLayerVisible(visibleText, marker, layer, context) {
  if (!marker || !normalize(visibleText).includes(marker)) {
    throw new Error(`${context}: expected ${layer} content did not appear after its reveal action`);
  }
}
