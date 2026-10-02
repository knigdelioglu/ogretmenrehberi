export type AnnotationTool = "pen" | "highlighter" | "eraser";

export interface AnnotationPoint {
  x: number;
  y: number;
}

export interface AnnotationRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface AnnotationStroke {
  id: string;
  tool: Exclude<AnnotationTool, "eraser">;
  points: AnnotationPoint[];
}

export type AnnotationState = Record<string, AnnotationStroke[]>;
