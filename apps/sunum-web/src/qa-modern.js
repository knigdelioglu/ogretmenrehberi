export function usesModernQuestionLayout(step) {
  return typeof step?.prompt === "string" && step.prompt.trim().length > 0 &&
    Array.isArray(step.reveals) && step.reveals.includes("answer") &&
    step.answer?.entry_type === "question_answer";
}
