import type { ReactNode } from "react";

interface RevealPanelProps {
  label: string;
  tone?: "answer" | "guidance" | "evidence" | "explanation" | "note";
  children: ReactNode;
}

export function RevealPanel({
  label,
  tone = "answer",
  children
}: RevealPanelProps) {
  return (
    <section className={`reveal-panel reveal-panel--${tone}`}>
      <div className="reveal-panel__label">{label}</div>
      <div className="reveal-panel__body">{children}</div>
    </section>
  );
}
