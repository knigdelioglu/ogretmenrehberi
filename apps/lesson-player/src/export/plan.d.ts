import type { ExportConfiguration, ExportLesson, PlannedSlide } from "./types";

export function planExportSlides(
  lessons: ExportLesson[],
  configuration: ExportConfiguration
): PlannedSlide[];
