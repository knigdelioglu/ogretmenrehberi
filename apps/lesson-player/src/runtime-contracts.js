export function studentVisibleRevealKeys(keys) {
  return [...keys].filter((key) => key !== "note");
}

export function buildExportedStep(original, effective, override) {
  const editedPrompt =
    typeof override?.display_prompt === "string"
      ? override.display_prompt.trim()
      : "";
  const promptWasEdited =
    Boolean(editedPrompt) && editedPrompt !== original.display_prompt;

  const exported = {
    id: original.id,
    source_record_id: original.source.source_record_id,
    layout: effective.layout,
    density: effective.density,
    prompt: effective.display_prompt,
    prompt_mode: promptWasEdited
      ? "FLOW_OVERRIDE"
      : effective.display_prompt_mode
  };

  if (original.answer) {
    exported.answer_id = original.answer.question_id;
  }

  if (effective.reveal_order.length) {
    exported.reveal = effective.reveal_order;
  }

  if (effective.content) {
    exported.content = effective.content;
  }

  return exported;
}

const overrideSchemaVersion = 1;

export function canonicalLessonSignature(lesson) {
  const canonical = JSON.stringify([
    lesson.schema_version,
    lesson.lesson_id,
    lesson.title,
    lesson.subtitle,
    lesson.steps.map((step) => [
      step.id,
      step.display_prompt,
      step.display_prompt_mode,
      step.layout,
      step.density,
      step.reveal_order,
      step.content,
      step.source.source_record_id,
      step.answer?.question_id ?? null
    ])
  ]);
  let hash = 2166136261;
  for (let index = 0; index < canonical.length; index += 1) {
    hash = Math.imul(hash ^ canonical.charCodeAt(index), 16777619);
  }
  return `v1:${(hash >>> 0).toString(16)}:${canonical.length}`;
}

export function overrideEnvelope(signature, overrides) {
  return {
    schemaVersion: overrideSchemaVersion,
    canonicalSignature: signature,
    overrides
  };
}

export function restoreOverrideEnvelope(raw, signature, validStepIds) {
  if (!raw) return { overrides: {}, needsBackup: false };
  try {
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      !Array.isArray(parsed) &&
      parsed.schemaVersion === overrideSchemaVersion &&
      parsed.canonicalSignature === signature &&
      parsed.overrides &&
      typeof parsed.overrides === "object" &&
      !Array.isArray(parsed.overrides) &&
      Object.entries(parsed.overrides).every(
        ([id, value]) =>
          validStepIds.includes(id) &&
          value &&
          typeof value === "object" &&
          !Array.isArray(value)
      )
    ) {
      return { overrides: parsed.overrides, needsBackup: false };
    }
    // Empty legacy/stale preferences carry no user edits and need no warning.
    if (parsed && !Array.isArray(parsed) && typeof parsed === "object") {
      const values = parsed.overrides && typeof parsed.overrides === "object" &&
        !Array.isArray(parsed.overrides) ? parsed.overrides : parsed;
      if (Object.keys(values).length === 0) {
        return { overrides: {}, needsBackup: false };
      }
    }
    // Never silently reapply unversioned, stale, or malformed edits over updated data.
    return { overrides: {}, needsBackup: true };
  } catch {
    return { overrides: {}, needsBackup: true };
  }
}

const orderSchemaVersion = 1;

export function orderEnvelope(signature, order) {
  return {
    schemaVersion: orderSchemaVersion,
    canonicalSignature: signature,
    order
  };
}

export function restoreOrderEnvelope(raw, signature, canonicalIds) {
  const canonical = [...canonicalIds];
  if (!raw) return { order: canonical, needsBackup: false };

  try {
    const parsed = JSON.parse(raw);
    const isValidOrder = (value) =>
      Array.isArray(value) &&
      value.length === canonical.length &&
      new Set(value).size === canonical.length &&
      value.every((id) => typeof id === "string" && canonical.includes(id));

    if (
      parsed &&
      !Array.isArray(parsed) &&
      parsed.schemaVersion === orderSchemaVersion &&
      parsed.canonicalSignature === signature &&
      isValidOrder(parsed.order)
    ) {
      return { order: parsed.order, needsBackup: false };
    }

    // A legacy canonical array carries no customization; migrate it silently.
    if (
      Array.isArray(parsed) &&
      isValidOrder(parsed) &&
      parsed.every((id, index) => id === canonical[index])
    ) {
      return { order: canonical, needsBackup: false };
    }

    // Any custom legacy/stale/malformed order must not override a new canonical flow.
    return { order: canonical, needsBackup: true };
  } catch {
    return { order: canonical, needsBackup: true };
  }
}

export function restoredStepIndex(orderedIds, requestedStepId, savedStepId, legacyIndex) {
  for (const id of [requestedStepId, savedStepId]) {
    if (id) {
      const index = orderedIds.indexOf(id);
      if (index >= 0) return index;
    }
  }
  return Number.isInteger(legacyIndex)
    ? Math.max(0, Math.min(orderedIds.length - 1, legacyIndex))
    : 0;
}

export function studentVisibleOverrides(overrides) {
  return Object.fromEntries(
    Object.entries(overrides).map(([id, override]) => {
      const visible = { ...override };
      if (visible.reveal_order) {
        visible.reveal_order = studentVisibleRevealKeys(visible.reveal_order);
      }
      if (visible.content?.note !== undefined) {
        const { note: _teacherOnly, ...content } = visible.content;
        visible.content = content;
      }
      return [id, visible];
    })
  );
}

export function projectionLessonUrl(href, lessonId, stepId) {
  const url = new URL(href);
  url.searchParams.set("display", "1");
  url.searchParams.set("lesson", lessonId);
  if (stepId) url.searchParams.set("step", stepId);
  else url.searchParams.delete("step");
  return url.toString();
}
