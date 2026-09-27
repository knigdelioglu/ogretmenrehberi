import { createPresentationAssembler } from "./assembler";
import { downloadBlob, pptxFileName } from "./download";
import type {
  CapturedSlide,
  ExportConfiguration,
  ExportProgress,
  PlannedSlide
} from "./types";

export async function createAndDownloadPresentation(
  slides: PlannedSlide[],
  configuration: ExportConfiguration,
  renderSlide: (
    slide: PlannedSlide,
    pixelRatio: number,
    signal: AbortSignal
  ) => Promise<CapturedSlide>,
  onProgress: (progress: ExportProgress) => void,
  signal: AbortSignal
): Promise<string> {
  if (!slides.length) throw new Error("Dışa aktarılacak adım seçilmedi.");
  const assembler = createPresentationAssembler();
  const pixelRatio = configuration.quality === "high" ? 2 : 1;

  for (const slide of slides) {
    if (signal.aborted) {
      throw new DOMException("Dışa aktarma iptal edildi.", "AbortError");
    }
    const image = await renderSlide(slide, pixelRatio, signal);
    if (signal.aborted) {
      throw new DOMException("Dışa aktarma iptal edildi.", "AbortError");
    }
    assembler.add(slide, image.dataUrl, image.fitAdjustment);
    onProgress({ completed: slide.slideNumber, total: slides.length, slide });
  }

  const blob = await assembler.write();
  if (signal.aborted) {
    throw new DOMException("Dışa aktarma iptal edildi.", "AbortError");
  }

  const scope = configuration.scope === "theme" ? "tema" : configuration.scope === "selected-steps" ? "secili-adimlar" : "ders";
  const fileName = pptxFileName(slides[0].lessonSlug, scope, configuration.view);
  downloadBlob(blob, fileName);
  return fileName;
}
