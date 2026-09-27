import PptxGenJS from "pptxgenjs";
import type { ExportFitAdjustment, PlannedSlide } from "./types";

const slideWidth = 13.333;
const slideHeight = 7.5;

export function createPresentationAssembler() {
  const presentation = new PptxGenJS();
  presentation.defineLayout({
    name: "LESSON_PLAYER_WIDE",
    width: slideWidth,
    height: slideHeight
  });
  presentation.layout = "LESSON_PLAYER_WIDE";
  presentation.author = "Öğretmen Rehberi";
  presentation.subject = "Lesson Player web renderer görselleri";
  presentation.title = "Ders sunumu";
  presentation.company = "Öğretmen Rehberi";

  return {
    add(slide: PlannedSlide, dataUrl: string, fitAdjustment: ExportFitAdjustment) {
      const pptSlide = presentation.addSlide();
      pptSlide.background = { color: "F3EFE5" };
      pptSlide.addImage({
        data: dataUrl,
        x: 0,
        y: 0,
        w: slideWidth,
        h: slideHeight,
        altText: `${slide.lessonTitle}; adım ${slide.stepId}; basılı s. ${slide.printedPage}; ${slide.revealLabel}; ${slide.view} görünümü`
      });
      pptSlide.addNotes([
        `lesson_id: ${slide.lessonId}`,
        `step_id: ${slide.stepId}`,
        `printed_page: ${slide.printedPage}`,
        `reveal_stage: ${slide.revealLabel}`,
        `reveal_keys: ${slide.revealStage.join(" → ") || "başlangıç"}`,
        `view: ${slide.view}`,
        `source_density: ${slide.step.density}`,
        `fit_adjustment: ${fitAdjustment}`,
        `slide_number: ${slide.slideNumber}`
      ].join("\n"));
    },
    async write(): Promise<Blob> {
      const result = await presentation.write({ outputType: "blob" });
      if (result instanceof Blob) return result;
      if (result instanceof ArrayBuffer) {
        return new Blob([result], {
          type: "application/vnd.openxmlformats-officedocument.presentationml.presentation"
        });
      }
      throw new Error("PowerPoint dosyası Blob olarak üretilemedi.");
    }
  };
}
