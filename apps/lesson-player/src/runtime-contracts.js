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
