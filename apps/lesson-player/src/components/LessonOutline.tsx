import { Fragment } from "react";
import type { LessonData, LessonStep } from "../types";

function stepLabel(step: LessonStep) {
  return step.display_prompt ?? step.answer?.prompt_summary ?? step.source.book_heading;
}

function outlineQuestionLabel(questionNo: string) {
  const label = questionNo.trim();
  return /^\d/.test(label) ? `S.${label}` : label;
}

export function LessonOutline({
  lesson,
  steps,
  index,
  goTo
}: {
  lesson: LessonData;
  steps: LessonStep[];
  index: number;
  goTo: (next: number) => void;
}) {
  const effectiveSteps = steps;
  return (
      <aside className="outline" aria-label="Ders akışı">
        <div className="outline__header">
          <strong>{lesson.subtitle}</strong>
          <span>
            s. {lesson.printed_page_range} · {lesson.steps.length} adım
          </span>
        </div>
        <div className="outline__steps">
          {effectiveSteps.map((item, itemIndex) => {
            const previous = effectiveSteps[itemIndex - 1];
            const pageChanged =
              !previous ||
              previous.source.printed_page_range !== item.source.printed_page_range;

            return (
              <Fragment key={item.id}>
                {pageChanged ? (
                  <div className="outline-page-group">
                    Basılı s. {item.source.printed_page_range}
                  </div>
                ) : null}
                <button
                  className={
                    itemIndex === index ? "outline-step is-active" : "outline-step"
                  }
                  onClick={() => goTo(itemIndex)}
                  type="button"
                >
                  <span className="outline-step__number">
                    {item.answer?.question_no
                      ? outlineQuestionLabel(item.answer.question_no)
                      : String(itemIndex + 1).padStart(2, "0")}
                  </span>
                  <span className="outline-step__label">{stepLabel(item)}</span>
                </button>
              </Fragment>
            );
          })}
        </div>
      </aside>

  );
}
