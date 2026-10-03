export function groupItems(items, groupSize) {
  if (!Number.isInteger(groupSize) || groupSize < 1) throw new RangeError("groupSize must be a positive integer");
  const groups = [];
  for (let start = 0; start < items.length; start += groupSize) {
    groups.push(items.slice(start, start + groupSize));
  }
  return groups;
}

// Complete one group's answer before revealing the next group's prompt.
export function interleaveStages(groups) {
  return groups.flatMap((group, index) => index === 0
    ? [{ group, stage: "answer" }]
    : [{ group, stage: "prompt" }, { group, stage: "answer" }]);
}

export function insertThinkingReveal(reveals, hasThinking) {
  if (!hasThinking) return [...reveals];
  if (!reveals.includes("answer")) {
    throw new Error("A thinking reveal requires an answer reveal");
  }
  return ["thinking", ...reveals.filter((key) => key !== "thinking")];
}

// Reveal each response unit first, then its linked evidence while retaining
// the unit on screen. This order is shared by the web UI and export capture.
export function answerEvidenceStages(units) {
  return units.flatMap((unit) => [
    { type: "answer", unit },
    ...(unit.quote_indexes?.length || unit.evidence_sections?.length ? [{ type: "evidence", unit }] : [])
  ]);
}

export function attachVocabularyAnswerFragments(pages, answerText) {
  if (answerText?.mode !== "include" || !answerText.fragments?.length) return pages;
  return pages.map((page) => {
    if (page.hidden || !page.terms?.length) return page;
    const before = [];
    const after = [];
    for (const [term] of page.terms) {
      for (const fragment of answerText.fragments) {
        if (fragment.unit !== term) continue;
        (fragment.position === "end" ? after : before).push(fragment.text);
      }
    }
    if (!before.length && !after.length) return page;
    return {
      ...page,
      ...(before.length ? { answerTextBefore: before.join("\n") } : {}),
      ...(after.length ? { answerTextAfter: after.join("\n") } : {})
    };
  });
}
