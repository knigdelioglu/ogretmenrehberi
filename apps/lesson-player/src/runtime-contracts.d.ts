import type { LessonData, LessonStep, RevealKey, StepContent } from "./types";

export function studentVisibleRevealKeys(
  keys: Iterable<RevealKey>
): RevealKey[];

export function buildExportedStep(
  original: LessonStep,
  effective: LessonStep,
  override?: { display_prompt?: string }
): Record<string, unknown>;

export function canonicalLessonSignature(lesson: LessonData): string;

export function overrideEnvelope<T>(signature: string, overrides: T): {
  schemaVersion: number;
  canonicalSignature: string;
  overrides: T;
};

export function restoreOverrideEnvelope<T extends Record<string, object>>(
  raw: string | null,
  signature: string,
  validStepIds: string[]
): { overrides: T; needsBackup: boolean };

export function restoredStepIndex(
  orderedIds: string[],
  requestedStepId: string | null,
  savedStepId: string | null,
  legacyIndex: number
): number;

export function studentVisibleOverrides<T extends Record<string, {
  content?: StepContent | null;
  reveal_order?: RevealKey[];
}>>(overrides: T): T;

export function projectionLessonUrl(
  href: string,
  lessonId: string,
  stepId?: string
): string;
