export function appendAnnotation(state, stepId, stroke) {
  return { ...state, [stepId]: [...(state[stepId] ?? []), stroke] };
}

export function removeAnnotation(state, stepId, strokeId) {
  return {
    ...state,
    [stepId]: (state[stepId] ?? []).filter((stroke) => stroke.id !== strokeId)
  };
}

export function undoAnnotation(state, stepId) {
  return { ...state, [stepId]: (state[stepId] ?? []).slice(0, -1) };
}

export function clearAnnotations(state, stepId) {
  return { ...state, [stepId]: [] };
}
