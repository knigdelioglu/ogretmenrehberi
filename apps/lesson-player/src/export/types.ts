import type { LessonData, LessonStep, RevealKey } from "../types";

export type ExportScope = "current-lesson" | "selected-steps" | "theme";
export type ExportView = "student" | "teacher";
export type ExportRevealMode = "final" | "stages";
export type ExportQuality = "high" | "standard";
export type ExportFitAdjustment = "none" | "compact" | "compact-tight" | "compact-ultra";

export interface CapturedSlide {
  dataUrl: string;
  fitAdjustment: ExportFitAdjustment;
}

export type ExportLesson = Omit<LessonData, "steps"> & {
  steps: LessonStep[];
};

export interface ExportConfiguration {
  scope: ExportScope;
  currentLessonId: string;
  currentStepId: string;
  selectedStepIds: string[];
  view: ExportView;
  revealMode: ExportRevealMode;
  quality: ExportQuality;
}

export interface PlannedSlide {
  slideNumber: number;
  lessonId: string;
  lessonTitle: string;
  lessonSlug: string;
  themeId: string;
  stepId: string;
  stepNumber: number;
  stepCount: number;
  printedPage: string;
  revealStage: RevealKey[];
  revealLabel: string;
  view: ExportView;
  step: LessonStep;
}

export interface ExportProgress {
  completed: number;
  total: number;
  slide: PlannedSlide;
}
