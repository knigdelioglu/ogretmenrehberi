import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { AnnotationPoint, AnnotationStroke, AnnotationTool } from "../annotation/types";

interface AnnotationOverlayProps {
  stepId: string;
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
  const scaled = points.map(({ x, y }) => ({ x: x * width, y: y * height }));
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

export function AnnotationOverlay({ stepId, strokes, enabled, tool, onStroke, onErase }: AnnotationOverlayProps) {
  const drawingRef = useRef<{ pointerId: number; points: AnnotationPoint[] } | null>(null);
  const [draft, setDraft] = useState<AnnotationPoint[] | null>(null);
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const observer = new ResizeObserver(() => setSize({ width: window.innerWidth, height: window.innerHeight }));
    observer.observe(document.documentElement);
    return () => observer.disconnect();
  }, []);

  const pointFrom = useCallback((event: ReactPointerEvent<SVGSVGElement>): AnnotationPoint => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height))
    };
  }, []);

  const handlePointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!enabled || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointFrom(event);
    if (tool === "eraser") {
      const nearest = strokes.find((stroke) => stroke.points.some((item) => {
        const dx = (item.x - point.x) * size.width;
        const dy = (item.y - point.y) * size.height;
        return Math.hypot(dx, dy) < 22;
      }));
      if (nearest) onErase(nearest.id);
      return;
    }
    drawingRef.current = { pointerId: event.pointerId, points: [point] };
    setDraft([point]);
  };

  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const drawing = drawingRef.current;
    if (!enabled || !drawing || drawing.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    const coalesced = event.nativeEvent.getCoalescedEvents?.() ?? [event.nativeEvent];
    for (const sample of coalesced) {
      const rect = event.currentTarget.getBoundingClientRect();
      drawing.points.push({
        x: Math.max(0, Math.min(1, (sample.clientX - rect.left) / rect.width)),
        y: Math.max(0, Math.min(1, (sample.clientY - rect.top) / rect.height))
      });
    }
    setDraft([...drawing.points]);
  };

  const finishStroke = (event: ReactPointerEvent<SVGSVGElement>) => {
    const drawing = drawingRef.current;
    if (!drawing || drawing.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    drawingRef.current = null;
    setDraft(null);
    onStroke({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      tool: tool === "highlighter" ? "highlighter" : "pen",
      points: drawing.points
    });
  };

  const rendered = draft && drawingRef.current
    ? [...strokes, { id: "draft", tool: tool === "highlighter" ? "highlighter" : "pen", points: draft } as AnnotationStroke]
    : strokes;

  return (
    <svg
      className={`annotation-overlay${enabled ? " is-enabled" : ""}`}
      viewBox={`0 0 ${size.width} ${size.height}`}
      aria-label={`Slayt açıklamaları: ${stepId}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishStroke}
      onPointerCancel={finishStroke}
    >
      {rendered.map((stroke) => (
        <path
          key={stroke.id}
          d={smoothPath(stroke.points, size.width, size.height)}
          fill="none"
          stroke={stroke.tool === "highlighter" ? highlightColor : penColor}
          strokeWidth={stroke.tool === "highlighter" ? 16 : 4}
          strokeOpacity={stroke.tool === "highlighter" ? 0.42 : 0.96}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}
