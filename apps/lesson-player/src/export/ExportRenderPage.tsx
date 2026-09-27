import { useEffect, useLayoutEffect, useState } from "react";
import { toJpeg } from "html-to-image";
import { StepView } from "../components/StepView";
import type { PlannedSlide } from "./types";

interface RenderRequest {
  requestId: string;
  slide: PlannedSlide;
  pixelRatio: number;
}

const captureWidth = 1920;
const captureHeight = 1080;
const noOp = () => undefined;

export function ExportRenderPage() {
  const [request, setRequest] = useState<RenderRequest | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== window.parent) {
        return;
      }

      if (event.data?.type !== "lesson-player-export-render") return;
      const next = event.data as RenderRequest & { type: string };
      if (!next.requestId || !next.slide?.step || ![1, 2].includes(next.pixelRatio)) {
        return;
      }
      setRequest(next);
    };

    window.addEventListener("message", onMessage);
    setReady(true);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useLayoutEffect(() => {
    if (!request) return;
    let cancelled = false;

    const render = async () => {
      try {
        await document.fonts.ready;
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        if (cancelled) return;

        const captureRoot = document.getElementById("export-slide-capture");
        const stage = captureRoot?.querySelector<HTMLElement>(".lesson-stage");
        if (!captureRoot || !stage) throw new Error("Lesson Player adım alanı bulunamadı.");
        stage.scrollTop = 0;
        stage.scrollLeft = 0;

        const vertical = Math.max(0, stage.scrollHeight - stage.clientHeight);
        const horizontal = Math.max(0, stage.scrollWidth - stage.clientWidth);
        if (vertical > 1 || horizontal > 1) {
          window.parent.postMessage(
            {
              type: "lesson-player-export-render-error",
              requestId: request.requestId,
              overflow: { vertical, horizontal }
            },
            window.location.origin
          );
          return;
        }

        const dataUrl = await toJpeg(captureRoot, {
          width: captureWidth,
          height: captureHeight,
          pixelRatio: request.pixelRatio,
          quality: 0.96,
          backgroundColor: "#f3efe5",
          cacheBust: true
        });
        if (cancelled) return;

        window.parent.postMessage(
          {
            type: "lesson-player-export-rendered",
            requestId: request.requestId,
            dataUrl
          },
          window.location.origin
        );
      } catch (error) {
        if (cancelled) return;
        window.parent.postMessage(
          {
            type: "lesson-player-export-render-error",
            requestId: request.requestId,
            error: error instanceof Error ? error.message : String(error)
          },
          window.location.origin
        );
      }
    };

    void render();
    return () => {
      cancelled = true;
    };
  }, [request]);

  const slide = request?.slide;

  return (
    <div
      id="export-slide-capture"
      className="export-slide-capture"
      data-export-render-ready={ready ? "true" : "false"}
      data-export-slide-id={slide ? `${slide.lessonId}:${slide.stepId}:${slide.slideNumber}` : undefined}
      data-lesson-id={slide?.lessonId}
      data-step-id={slide?.stepId}
      data-printed-page={slide?.printedPage}
      data-reveal-stage={slide?.revealStage.join(",")}
      data-view={slide?.view}
    >
      {slide ? (
        <div className="app-shell presentation-mode external-display export-render-app">
          <div className="content-column">
            <StepView
              step={slide.step}
              themeId={slide.themeId}
              revealed={new Set(slide.revealStage)}
              toggle={noOp}
              presentationMode
              showInlineControls={false}
              showTeacherNotes={slide.view === "teacher"}
              showTeacherSupport={slide.view === "teacher"}
              visibleVocabularyTerms={new Set()}
              toggleVocabularyTerm={noOp}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
