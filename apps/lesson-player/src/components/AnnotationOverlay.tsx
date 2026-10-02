import { Fragment, useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import { normalizePoint, scalePoint } from "../annotation/geometry.js";
import type { AnnotationPoint, AnnotationRect, AnnotationStroke, AnnotationTool } from "../annotation/types";

interface AnnotationOverlayProps {
  stepId: string;
  surfaceRef: RefObject<HTMLDivElement | null>;
  strokes: AnnotationStroke[];
  enabled: boolean;
  tool: AnnotationTool;
  onStroke: (stroke: AnnotationStroke) => void;
  onErase: (strokeId: string) => void;
}

const penColor = "#d72f3f";
const highlightColor = "#f4d642";

function smoothPath(points: AnnotationPoint[], width: number, height: number) {
  if (!points.length) return "";
  const scaled = points.map((point) => scalePoint(point, width, height));
  if (scaled.length === 1) {
    const point = scaled[0];
    return `M ${point.x} ${point.y} l 0.01 0`;
  }
  let path = `M ${scaled[0].x} ${scaled[0].y}`;
  for (let index = 1; index < scaled.length - 1; index += 1) {
    const current = scaled[index];
    const next = scaled[index + 1];
    path += ` Q ${current.x} ${current.y} ${(current.x + next.x) / 2} ${(current.y + next.y) / 2}`;
  }
  const last = scaled[scaled.length - 1];
  path += ` L ${last.x} ${last.y}`;
  return path;
}

export function AnnotationOverlay({ stepId, surfaceRef, strokes, enabled, tool, onStroke, onErase }: AnnotationOverlayProps) {
  const overlayRef = useRef<SVGSVGElement>(null);
  const drawingRef = useRef<{ pointerId: number; points: AnnotationPoint[] } | null>(null);
  const draftFrameRef = useRef<number | null>(null);
  const [draft, setDraft] = useState<AnnotationPoint[] | null>(null);
  const [rect, setRect] = useState<AnnotationRect>({ left: 0, top: 0, width: 0, height: 0 });

  useLayoutEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;
    const measure = () => {
      const bounds = surface.getBoundingClientRect();
      setRect({ left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(surface);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    window.addEventListener("fullscreenchange", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("fullscreenchange", measure);
    };
  }, [surfaceRef]);

  useLayoutEffect(() => () => {
    if (draftFrameRef.current !== null) cancelAnimationFrame(draftFrameRef.current);
  }, []);

  const pointFrom = useCallback((event: ReactPointerEvent<HTMLElement>): AnnotationPoint => {
    const bounds = overlayRef.current?.getBoundingClientRect();
    return normalizePoint(event.clientX, event.clientY, bounds ?? rect);
  }, [rect]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (!enabled || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const bounds = overlayRef.current?.getBoundingClientRect() ?? rect;
    if (event.clientX < bounds.left || event.clientX > bounds.left + bounds.width || event.clientY < bounds.top || event.clientY > bounds.top + bounds.height) return;
    const point = pointFrom(event);
    if (tool === "eraser") {
      const nearest = strokes.find((stroke) => stroke.points.some((item) => {
        const dx = (item.x - point.x) * bounds.width;
        const dy = (item.y - point.y) * bounds.height;
        return Math.hypot(dx, dy) < 22;
      }));
      if (nearest) onErase(nearest.id);
      return;
    }
    drawingRef.current = { pointerId: event.pointerId, points: [point] };
    setDraft([point]);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const drawing = drawingRef.current;
    if (!enabled || !drawing || drawing.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    const coalesced = event.nativeEvent.getCoalescedEvents?.() ?? [event.nativeEvent];
    for (const sample of coalesced) {
      drawing.points.push(normalizePoint(sample.clientX, sample.clientY, overlayRef.current?.getBoundingClientRect() ?? rect));
    }
    if (draftFrameRef.current === null) {
      draftFrameRef.current = requestAnimationFrame(() => {
        draftFrameRef.current = null;
        const current = drawingRef.current;
        if (current) setDraft([...current.points]);
      });
    }
  };

  const finishStroke = (event: ReactPointerEvent<HTMLElement>) => {
    const drawing = drawingRef.current;
    if (!drawing || drawing.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    drawingRef.current = null;
    if (draftFrameRef.current !== null) cancelAnimationFrame(draftFrameRef.current);
    draftFrameRef.current = null;
    setDraft(null);
    onStroke({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      tool: tool === "highlighter" ? "highlighter" : "pen",
      points: drawing.points
    });
  };

  const completedPaths = useMemo(() => strokes.map((stroke) => (
    <path
      key={stroke.id}
      d={smoothPath(stroke.points, rect.width, rect.height)}
      fill="none"
      stroke={stroke.tool === "highlighter" ? highlightColor : penColor}
      strokeWidth={stroke.tool === "highlighter" ? 16 : 4}
      strokeOpacity={stroke.tool === "highlighter" ? 0.42 : 0.96}
      strokeLinecap="round"
      strokeLinejoin="round"
      vectorEffect="non-scaling-stroke"
    />
  )), [rect.height, rect.width, strokes]);
  const draftPath = draft && drawingRef.current
    ? <path
        key="draft"
        d={smoothPath(draft, rect.width, rect.height)}
        fill="none"
        stroke={tool === "highlighter" ? highlightColor : penColor}
        strokeWidth={tool === "highlighter" ? 16 : 4}
        strokeOpacity={tool === "highlighter" ? 0.42 : 0.96}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    : null;

  return (
    <Fragment>
      <svg
        ref={overlayRef}
        className="annotation-overlay"
        viewBox={`0 0 ${rect.width} ${rect.height}`}
        style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
        aria-label={`Slayt açıklamaları: ${stepId}`}
        aria-hidden="true"
      >
        {completedPaths}
        {draftPath}
      </svg>
      {enabled ? (
        <div
          className="annotation-input-shield"
          onWheel={(event) => event.preventDefault()}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishStroke}
          onPointerCancel={finishStroke}
        />
      ) : null}
    </Fragment>
  );
}
