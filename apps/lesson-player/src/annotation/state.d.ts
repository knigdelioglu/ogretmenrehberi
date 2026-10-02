import type { AnnotationState, AnnotationStroke } from "./types";

export function appendAnnotation(state: AnnotationState, stepId: string, stroke: AnnotationStroke): AnnotationState;
export function removeAnnotation(state: AnnotationState, stepId: string, strokeId: string): AnnotationState;
export function undoAnnotation(state: AnnotationState, stepId: string): AnnotationState;
export function clearAnnotations(state: AnnotationState, stepId: string): AnnotationState;
