const THEMES = new Set([1, 2, 3, 4]);

function fail(message) {
  throw new Error(`Web presentation metadata: ${message}`);
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function assertOnlyKeys(value, allowed, label) {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) fail(`unsupported ${label} key "${key}"`);
  }
}

export function validateWebPresentationIndex(index, { themeNumber, themeId, answerById }) {
  const expectedThemeId = Number.isInteger(themeNumber) && THEMES.has(themeNumber)
    ? `TEMA_0${themeNumber}`
    : null;
  if (!expectedThemeId || themeId !== expectedThemeId || !isRecord(index) ||
    !["1.0.0", "1.1.0"].includes(index.schema_version) || index.theme_id !== expectedThemeId ||
    !isRecord(index.defaults) ||
    index.defaults.section_units !== "one-per-section" ||
    index.defaults.structured_answer_text !== "omit-summary" ||
    index.defaults.array_answer_units !== "one-list" ||
    !isRecord(index.answers)) {
    fail(`malformed theme ${themeNumber} index or theme_id`);
  }
  assertOnlyKeys(index, new Set(["schema_version", "theme_id", "defaults", "answers"]), "index");
  assertOnlyKeys(index.defaults,
    new Set(["section_units", "structured_answer_text", "array_answer_units"]), "defaults");
  for (const answerId of Object.keys(index.answers)) {
    if (!answerById.has(answerId)) fail(`unknown answer_id in ${expectedThemeId}: ${answerId}`);
  }
}

function resolveAnswerText(raw, answer, units, structured, schemaVersion) {
  const answerValue = String(answer.answer ?? "");
  const policy = raw ?? (structured
    ? { mode: "omit", reason: "Yapılandırılmış cevap bölümleri toplu cevabın yerine açılır." }
    : { mode: "include", unit: units[0].id });
  if (!isRecord(policy) || !["include", "omit"].includes(policy.mode)) {
    fail(`malformed answer_text policy for ${answer.question_id}`);
  }
  assertOnlyKeys(policy, new Set(["mode", "unit", "reason", "fragments"]), "answer_text");
  if (policy.mode === "omit") {
    if (typeof policy.reason !== "string" || !policy.reason.trim() ||
      policy.unit !== undefined || policy.fragments !== undefined) {
      fail(`omitted answer_text needs a reason for ${answer.question_id}`);
    }
    if (!structured) fail(`text-only answer cannot omit its response text: ${answer.question_id}`);
    return { mode: "omit", reason: policy.reason };
  }

  if (policy.reason !== undefined) fail(`included answer_text cannot have a reason for ${answer.question_id}`);
  if (policy.fragments !== undefined) {
    if (schemaVersion !== "1.1.0") {
      fail(`answer_text.fragments needs schema_version 1.1.0 for ${answer.question_id}`);
    }
    if (policy.unit !== undefined || !Array.isArray(policy.fragments) || !policy.fragments.length) {
      fail(`answer_text fragments need a non-empty list and cannot use unit for ${answer.question_id}`);
    }
    const fragments = policy.fragments.map((fragment, index) => {
      if (!isRecord(fragment)) fail(`malformed answer_text fragment ${index} for ${answer.question_id}`);
      assertOnlyKeys(fragment, new Set(["unit", "text", "position"]), "answer_text fragment");
      const position = fragment.position ?? "start";
      if (typeof fragment.unit !== "string" || !units.some((unit) => unit.id === fragment.unit) ||
        typeof fragment.text !== "string" || !fragment.text.trim() ||
        !["start", "end"].includes(position) || !answerValue.includes(fragment.text)) {
        fail(`answer_text fragment must be an exact source excerpt assigned to a unit for ${answer.question_id}`);
      }
      if (units.length > 1 && fragment.text.trim() === answerValue.trim()) {
        fail(`a multi-unit answer cannot copy its full summary into one unit: ${answer.question_id}`);
      }
      if (structured && fragment.text.trim() === answerValue.trim()) {
        fail(`a structured answer cannot copy its full summary into a response unit: ${answer.question_id}`);
      }
      if (structured && JSON.stringify(answer.answer_sections ?? "").includes(fragment.text)) {
        fail(`answer_text fragment repeats a structured response section: ${answer.question_id}`);
      }
      return { unit: fragment.unit, text: fragment.text, position };
    });
    return { mode: "include", fragments };
  }

  if (typeof policy.unit !== "string" || !units.some((unit) => unit.id === policy.unit)) {
    fail(`included answer_text must name an existing unit for ${answer.question_id}`);
  }
  if (structured) {
    fail(`structured answer_text must use explicit source fragments for ${answer.question_id}`);
  }
  if (units.length > 1) {
    fail(`multi-unit answer_text must use explicit source fragments for ${answer.question_id}`);
  }
  return {
    mode: "include",
    fragments: answerValue ? [{ unit: policy.unit, text: answerValue, position: "start" }] : []
  };
}

export function resolveWebPresentation(step, answer, themeData) {
  const index = themeData.webPresentation;
  if (!index || !answer || step.layout === "vocabulary") return undefined;

  const sectionData = answer.answer_sections;
  const sectionArray = Array.isArray(sectionData) ? sectionData : null;
  const sectionKeys = isRecord(sectionData) ? Object.keys(sectionData) : [];
  const structured = sectionKeys.length > 0 || Boolean(sectionArray?.length);
  const override = index.answers[answer.question_id] ?? {};
  if (!isRecord(override)) fail(`malformed answer override for ${answer.question_id}`);
  assertOnlyKeys(override, new Set(["units", "answer_text", "quote_links"]), "answer override");

  const rawUnits = override.units ?? (
    sectionKeys.length
      ? sectionKeys.map((key) => ({ id: key, sections: [key] }))
      : sectionArray?.length
        ? [{ id: "answer", items: sectionArray.map((_, item) => item) }]
        : [{ id: "answer" }]
  );
  if (!Array.isArray(rawUnits) || !rawUnits.length) fail(`units must be a non-empty array for ${answer.question_id}`);

  const units = [];
  const unitIds = new Set();
  const coveredSectionKeys = [];
  const coveredArrayItems = [];
  for (const [unitIndex, rawUnit] of rawUnits.entries()) {
    if (!isRecord(rawUnit) || typeof rawUnit.id !== "string" || !rawUnit.id.trim()) {
      fail(`malformed unit ${unitIndex} for ${answer.question_id}`);
    }
    assertOnlyKeys(rawUnit, new Set(["id", "sections", "items", "evidence_sections"]), "unit");
    if (unitIds.has(rawUnit.id)) fail(`duplicate unit id ${rawUnit.id} for ${answer.question_id}`);
    unitIds.add(rawUnit.id);

    const unit = { id: rawUnit.id, section_keys: [], array_indices: [], evidence_sections: [] };
    if (rawUnit.sections !== undefined) {
      if (rawUnit.items !== undefined || !sectionKeys.length || !Array.isArray(rawUnit.sections) ||
        !rawUnit.sections.length || rawUnit.sections.some((key) => typeof key !== "string" || !sectionKeys.includes(key))) {
        fail(`sections must reference keyed answer_sections for ${answer.question_id}`);
      }
      unit.section_keys = [...rawUnit.sections];
      coveredSectionKeys.push(...rawUnit.sections);
    }
    if (rawUnit.items !== undefined) {
      if (rawUnit.sections !== undefined || !sectionArray?.length || !Array.isArray(rawUnit.items) ||
        !rawUnit.items.length || rawUnit.items.some((item) => !Number.isInteger(item) || item < 0 || item >= sectionArray.length)) {
        fail(`items must reference answer_sections indexes for ${answer.question_id}`);
      }
      unit.array_indices = [...rawUnit.items];
      coveredArrayItems.push(...rawUnit.items);
    }
    if (rawUnit.evidence_sections !== undefined) {
      if (index.schema_version !== "1.1.0") {
        fail(`evidence_sections needs schema_version 1.1.0 for ${answer.question_id}`);
      }
      if (!sectionKeys.length || !Array.isArray(rawUnit.evidence_sections) || !rawUnit.evidence_sections.length) {
        fail(`evidence_sections need keyed answer_sections for ${answer.question_id}`);
      }
      unit.evidence_sections = rawUnit.evidence_sections.map((entry, entryIndex) => {
        if (!isRecord(entry) || typeof entry.key !== "string" || !sectionKeys.includes(entry.key)) {
          fail(`malformed evidence section ${entryIndex} for ${answer.question_id}`);
        }
        assertOnlyKeys(entry, new Set(["key", "contains_quote_indexes"]), "evidence section");
        const contains = entry.contains_quote_indexes ?? [];
        if (!Array.isArray(contains) || contains.some((quoteIndex) => !Number.isInteger(quoteIndex) || quoteIndex < 0)) {
          fail(`evidence section quote indexes must be non-negative integers for ${answer.question_id}`);
        }
        coveredSectionKeys.push(entry.key);
        return { section_key: entry.key, contains_quote_indexes: [...contains] };
      });
    }
    if (!unit.section_keys.length && !unit.array_indices.length && !unit.evidence_sections.length &&
      !(rawUnit.id === "answer" && !structured)) {
      fail(`each response unit needs answer content or a linked evidence section for ${answer.question_id}`);
    }
    units.push(unit);
  }

  if (sectionKeys.length && (coveredSectionKeys.length !== sectionKeys.length ||
    new Set(coveredSectionKeys).size !== coveredSectionKeys.length ||
    sectionKeys.some((key) => !coveredSectionKeys.includes(key)))) {
    fail(`units must cover each answer_sections key exactly once, including evidence sections, for ${answer.question_id}`);
  }
  if (sectionArray?.length && (coveredArrayItems.length !== sectionArray.length ||
    new Set(coveredArrayItems).size !== coveredArrayItems.length ||
    sectionArray.some((_, item) => !coveredArrayItems.includes(item)))) {
    fail(`units must cover each answer_sections item exactly once for ${answer.question_id}`);
  }
  if (!structured && units.length !== 1) fail(`text-only answer must use one response unit for ${answer.question_id}`);

  const quotes = answer.evidence_quotes ?? [];
  if (!Array.isArray(quotes)) fail(`evidence_quotes must be an array for ${answer.question_id}`);
  const quoteLinks = override.quote_links ?? [];
  if (!Array.isArray(quoteLinks)) fail(`quote_links must be an array for ${answer.question_id}`);
  const linkedIndexes = new Set();
  const pairs = new Set();
  const linksByUnit = new Map(units.map((unit) => [unit.id, []]));
  for (const link of quoteLinks) {
    if (!isRecord(link) || !Number.isInteger(link.index) || link.index < 0 || link.index >= quotes.length ||
      typeof link.unit !== "string" || !unitIds.has(link.unit)) {
      fail(`malformed quote link for ${answer.question_id}`);
    }
    assertOnlyKeys(link, new Set(["index", "unit"]), "quote link");
    const pair = `${link.index}\u0000${link.unit}`;
    if (pairs.has(pair)) fail(`duplicate quote link (${link.index}, ${link.unit}) for ${answer.question_id}`);
    pairs.add(pair);
    linkedIndexes.add(link.index);
    linksByUnit.get(link.unit).push(link.index);
  }
  if (linkedIndexes.size !== quotes.length) fail(`every evidence quote needs at least one response unit for ${answer.question_id}`);

  const inlineByUnit = new Map(units.map((unit) => [unit.id, new Set()]));
  for (const unit of units) {
    for (const section of unit.evidence_sections) {
      for (const quoteIndex of section.contains_quote_indexes) {
        const pair = `${quoteIndex}\u0000${unit.id}`;
        if (quoteIndex >= quotes.length || !pairs.has(pair)) {
          fail(`embedded quote ${quoteIndex} must be linked to evidence section unit ${unit.id} for ${answer.question_id}`);
        }
        const inline = inlineByUnit.get(unit.id);
        if (inline.has(quoteIndex)) fail(`quote ${quoteIndex} is embedded by multiple sections in ${unit.id} for ${answer.question_id}`);
        inline.add(quoteIndex);
      }
    }
  }

  const answerText = resolveAnswerText(override.answer_text, answer, units, structured, index.schema_version);
  const visibleResponseUnits = new Set([
    ...units.filter((unit) => unit.section_keys.length || unit.array_indices.length).map((unit) => unit.id),
    ...(answerText.fragments ?? []).map((fragment) => fragment.unit)
  ]);
  if (units.some((unit) => !visibleResponseUnits.has(unit.id))) {
    fail(`each evidence-only response unit needs an answer_text fragment: ${answer.question_id}`);
  }
  return {
    units: units.map((unit) => ({
      ...unit,
      quote_indexes: linksByUnit.get(unit.id),
      inline_quote_indexes: [...inlineByUnit.get(unit.id)]
    })),
    answer_text: answerText
  };
}

export function resolveVocabularyAnswerText(step, answer, themeData) {
  const index = themeData.webPresentation;
  if (!index || !answer || step.layout !== "vocabulary") return undefined;
  const override = index.answers[answer.question_id];
  if (override === undefined) return undefined;
  if (!isRecord(override) || !Object.hasOwn(override, "answer_text")) {
    fail(`vocabulary override must provide answer_text for ${answer.question_id}`);
  }
  assertOnlyKeys(override, new Set(["answer_text"]), "vocabulary answer override");

  const sections = answer.answer_sections;
  if (!isRecord(sections) || !Object.keys(sections).length) {
    fail(`vocabulary answer_text needs keyed answer_sections for ${answer.question_id}`);
  }
  const units = Object.keys(sections).map((id) => ({ id }));
  return resolveAnswerText(override.answer_text, answer, units, true, index.schema_version);
}
