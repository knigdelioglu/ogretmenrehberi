import type { PlannedSlide } from "./types";

const renderTimeoutMs = 120_000;

function waitForRenderSurface(
  frame: HTMLIFrameElement,
  signal: AbortSignal
): Promise<void> {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const check = () => {
      if (signal.aborted) {
        reject(new DOMException("Dışa aktarma iptal edildi.", "AbortError"));
        return;
      }

      if (
        frame.contentDocument?.querySelector(
          '[data-export-render-ready="true"]'
        )
      ) {
        resolve();
        return;
      }

      if (Date.now() - startedAt >= renderTimeoutMs) {
        reject(new Error("İzole dışa aktarma yüzeyi zamanında hazır olmadı."));
        return;
      }

      window.setTimeout(check, 100);
    };

    check();
  });
}

export async function capturePlannedSlide(
  frame: HTMLIFrameElement,
  slide: PlannedSlide,
  pixelRatio: number,
  signal: AbortSignal
): Promise<string> {
  await waitForRenderSurface(frame, signal);

  const requestId = crypto.randomUUID();
  const target = frame.contentWindow;
  if (!target) throw new Error("Dışa aktarma render penceresi açılamadı.");

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error(`Slayt ${slide.slideNumber} render zaman aşımına uğradı.`));
    }, renderTimeoutMs);

    const cleanup = () => {
      window.clearTimeout(timeout);
      window.removeEventListener("message", onMessage);
      signal.removeEventListener("abort", onAbort);
    };

    const onAbort = () => {
      cleanup();
      reject(new DOMException("Dışa aktarma iptal edildi.", "AbortError"));
    };

    const onMessage = (event: MessageEvent) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== target ||
        event.data?.requestId !== requestId
      ) {
        return;
      }

      if (event.data.type === "lesson-player-export-rendered") {
        cleanup();
        resolve(event.data.dataUrl as string);
      } else if (event.data.type === "lesson-player-export-render-error") {
        cleanup();
        const issue = event.data.overflow
          ? `Taşma algılandı: ${slide.lessonId} / ${slide.stepId} / ${slide.revealLabel} (${event.data.overflow.vertical}px dikey, ${event.data.overflow.horizontal}px yatay). İçerik slayta sığmıyor.`
          : `Slayt ${slide.slideNumber} görsele dönüştürülemedi: ${event.data.error}`;
        reject(new Error(issue));
      }
    };

    window.addEventListener("message", onMessage);
    signal.addEventListener("abort", onAbort, { once: true });
    target.postMessage(
      {
        type: "lesson-player-export-render",
        requestId,
        slide,
        pixelRatio
      },
      window.location.origin
    );
  });
}
