import type { AnnotationPoint, AnnotationRect } from "./types";

export function normalizePoint(clientX: number, clientY: number, rect: AnnotationRect): AnnotationPoint;
export function scalePoint(point: AnnotationPoint, width: number, height: number): AnnotationPoint;
