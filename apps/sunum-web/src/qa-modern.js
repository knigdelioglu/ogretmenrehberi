export function usesModernQuestionLayout(step) {
  return typeof step?.prompt === "string" && step.prompt.trim().length > 0 &&
    Array.isArray(step.reveals) && step.reveals.includes("answer") &&
    typeof step.answer?.entry_type === "string" && step.answer.entry_type.trim().length > 0;
}
