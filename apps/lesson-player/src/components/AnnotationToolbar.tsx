import type { AnnotationTool } from "../annotation/types";

interface AnnotationToolbarProps {
  active: boolean;
  tool: AnnotationTool;
  canUndo: boolean;
  onToggle: () => void;
  onToolChange: (tool: AnnotationTool) => void;
  onUndo: () => void;
  onClear: () => void;
  onClose: () => void;
}

export function AnnotationToolbar({
  active,
  tool,
  canUndo,
  onToggle,
  onToolChange,
  onUndo,
  onClear,
  onClose
}: AnnotationToolbarProps) {
  if (!active) {
    return <button className="annotation-launch" type="button" onClick={onToggle}>Kalem</button>;
  }

  return (
    <div className="annotation-toolbar" role="toolbar" aria-label="Kalem araçları">
      <button type="button" aria-pressed={tool === "pen"} onClick={() => onToolChange("pen")}>Kalem</button>
      <button type="button" aria-pressed={tool === "highlighter"} onClick={() => onToolChange("highlighter")}>Fosforlu kalem</button>
      <button type="button" aria-pressed={tool === "eraser"} onClick={() => onToolChange("eraser")}>Silgi</button>
      <button type="button" onClick={onUndo} disabled={!canUndo}>Geri al</button>
      <button type="button" onClick={onClear} disabled={!canUndo}>Temizle</button>
      <button type="button" onClick={onClose}>Kapat</button>
    </div>
  );
}
