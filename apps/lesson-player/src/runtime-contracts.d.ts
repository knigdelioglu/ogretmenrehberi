import type { LessonStep, RevealKey } from "./types";

export function studentVisibleRevealKeys(
  keys: Iterable<RevealKey>
): RevealKey[];

export function buildExportedStep(
  original: LessonStep,
  effective: LessonStep,
  override?: { display_prompt?: string }
): Record<string, unknown>;
