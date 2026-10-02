import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import lessonsJson from "./generated/lessons.json";
import { EditorPanel } from "./components/EditorPanel";
import { StepView } from "./components/StepView";
import { TeacherGuidePanel } from "./components/TeacherGuidePanel";
import { LessonOutline } from "./components/LessonOutline";
import { LessonFooter } from "./components/LessonFooter";
import { LessonToolbar } from "./components/LessonToolbar";
import { AnnotationOverlay } from "./components/AnnotationOverlay";
import { AnnotationToolbar } from "./components/AnnotationToolbar";
import type { AnnotationState, AnnotationStroke, AnnotationTool } from "./annotation/types";
import { appendAnnotation, clearAnnotations as clearStepAnnotations, removeAnnotation as removeStepAnnotation, undoAnnotation as undoStepAnnotation } from "./annotation/state.js";
import { ExportDialog } from "./export/ExportDialog";
import { capturePlannedSlide } from "./export/capture";
import { planExportSlides } from "./export/plan.js";
import type {
  ExportConfiguration,
  ExportLesson,
  ExportProgress,
  PlannedSlide
} from "./export/types";
import {
  buildExportedStep,
  canonicalLessonSignature,
  orderEnvelope,
  overrideEnvelope,
  projectionLessonUrl,
  restoredStepIndex,
  restoreOrderEnvelope,
  restoreOverrideEnvelope,
  studentVisibleOverrides,
  studentVisibleRevealKeys
} from "./runtime-contracts.js";
import type {
  DensityKind,
  LayoutKind,
  LessonData,
  LessonStep,
  RevealKey,
  StepContent
} from "./types";

const lessonCatalog = lessonsJson as LessonData[];
if (!lessonCatalog.length) {
  throw new Error("Lesson catalog is empty.");
}

const lessonSelectionKey = "ogretmenrehberi.lesson.last-selected";
const initialParams = new URLSearchParams(window.location.search);
const requestedLesson =
  initialParams.get("lesson") ??
  window.localStorage.getItem(lessonSelectionKey);

const lesson =
  lessonCatalog.find(
    (item) =>
      item.lesson_id === requestedLesson ||
      item.lesson_slug === requestedLesson
  ) ?? lessonCatalog[0];

const displayOnly = initialParams.get("display") === "1";
if (!displayOnly) {
  window.localStorage.setItem(lessonSelectionKey, lesson.lesson_id);
}

const progressKey = `ogretmenrehberi.lesson.${lesson.lesson_id}.index`;
const progressStepKey = `ogretmenrehberi.lesson.${lesson.lesson_id}.step-id`;
const modeKey = `ogretmenrehberi.lesson.${lesson.lesson_id}.projection`;
const overridesKey = `ogretmenrehberi.lesson.${lesson.lesson_id}.overrides`;
const orderKey = `ogretmenrehberi.lesson.${lesson.lesson_id}.order`;
const assessmentKey = `ogretmenrehberi.lesson.${lesson.lesson_id}.assessments`;
const originalStepById = new Map(lesson.steps.map((step) => [step.id, step]));
const overrideSignature = canonicalLessonSignature(lesson);
const projectionChannelName = "ogretmenrehberi.lesson-player.projection-channel";
const projectionWindowName = "ogretmenrehberi-lesson-player-projection";

type StepOverride = {
  display_prompt?: string;
  layout?: LayoutKind;
  density?: DensityKind;
  reveal_order?: RevealKey[];
  content?: StepContent | null;
};

type StepOverrides = Record<string, StepOverride>;

type ProjectionSyncState = {
  lessonId: string;
  stepId: string;
  index: number;
  stepOrder: string[];
  overrides: StepOverrides;
  revealed: RevealKey[];
  vocabularyTerms: Record<string, string[]>;
  assessmentSelections: Record<string, Record<number, string>>;
  annotations: AnnotationState;
};

function restoredIndex() {
  const raw = displayOnly ? null : window.localStorage.getItem(progressKey);
  const legacyIndex = raw ? Number(raw) : 0;
  const orderedIds = displayOnly
    ? lesson.steps.map((step) => step.id)
    : initialOrderRestore.order;
  return restoredStepIndex(
    orderedIds,
    initialParams.get("step"),
    displayOnly ? null : window.localStorage.getItem(progressStepKey),
    legacyIndex
  );
}

function restoredOverrides(): {
  overrides: StepOverrides;
  warning: string | null;
  backupKey: string | null;
  canPersist: boolean;
} {
  if (displayOnly) return { overrides: {}, warning: null, backupKey: null, canPersist: false };
  const raw = window.localStorage.getItem(overridesKey);
  const restored = restoreOverrideEnvelope<StepOverrides>(
    raw,
    overrideSignature,
    lesson.steps.map((step) => step.id)
  );
  if (!restored.needsBackup) {
    return { overrides: restored.overrides, warning: null, backupKey: null, canPersist: true };
  }

  try {
    // Archive legacy and stale edits before writing the new canonical revision.
    const backupKey = `${overridesKey}.backup.${Date.now()}`;
    window.localStorage.setItem(backupKey, raw ?? "");
    return {
      overrides: {},
      warning: "Önceki sürüme ait yerel düzenlemeler yedeklendi; güncel ders içeriği yüklendi.",
      backupKey,
      canPersist: true
    };
  } catch {
    return {
      overrides: {},
      warning: "Eski düzenlemeler yedeklenemedi; eski veri korunuyor, yeni değişiklikler kaydedilmeyecek.",
      backupKey: null,
      canPersist: false
    };
  }
}

function restoredOrder(): {
  order: string[];
  warning: string | null;
  backupKey: string | null;
  canPersist: boolean;
} {
  const canonical = lesson.steps.map((step) => step.id);
  if (displayOnly) {
    return { order: canonical, warning: null, backupKey: null, canPersist: false };
  }

  const raw = window.localStorage.getItem(orderKey);
  const restored = restoreOrderEnvelope(raw, overrideSignature, canonical);
  if (!restored.needsBackup) {
    return {
      order: restored.order,
      warning: null,
      backupKey: null,
      canPersist: true
    };
  }

  try {
    const backupKey = `${orderKey}.backup.${Date.now()}`;
    window.localStorage.setItem(backupKey, raw ?? "");
    return {
      order: canonical,
      warning: "Önceki sürüme ait özel adım sırası yedeklendi; güncel kanonik sıra yüklendi.",
      backupKey,
      canPersist: true
    };
  } catch {
    return {
      order: canonical,
      warning: "Eski adım sırası yedeklenemedi; kanonik sıra gösteriliyor ve sıra kaydı korunuyor.",
      backupKey: null,
      canPersist: false
    };
  }
}

const initialOrderRestore = restoredOrder();

function revealOrder(step: LessonStep): RevealKey[] {
  return step.reveal_order;
}

function applyOverride(step: LessonStep, override?: StepOverride): LessonStep {
  if (!override) return step;

  return {
    ...step,
    display_prompt: override.display_prompt ?? step.display_prompt,
    layout: override.layout ?? step.layout,
    density: override.density ?? step.density,
    reveal_order: override.reveal_order ?? step.reveal_order,
    content: override.content !== undefined ? override.content : step.content
  };
}

function restoredAssessmentSelections(): Record<string, Record<number, string>> {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(assessmentKey) ?? "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const restored: Record<string, Record<number, string>> = {};
    for (const step of lesson.steps) {
      const raw = (parsed as Record<string, unknown>)[step.id];
      const scale = step.content?.scale ?? [];
      if (!raw || typeof raw !== "object" || Array.isArray(raw) || !step.content?.items?.length) continue;
      const valid: Record<number, string> = {};
      for (const [index, value] of Object.entries(raw as Record<string, unknown>)) {
        const itemIndex = Number(index);
        if (
          Number.isInteger(itemIndex) && itemIndex >= 0 &&
          itemIndex < (step.content?.items?.length ?? 0) &&
          typeof value === "string" && (scale.length ? scale.includes(value) : value === "checked")
        ) valid[itemIndex] = value;
      }
      if (Object.keys(valid).length) restored[step.id] = valid;
    }
    return restored;
  } catch {
    return {};
  }
}

export default function App() {
  const [index, setIndex] = useState(restoredIndex);
  const [overrideRestore] = useState(restoredOverrides);
  const [orderRestore] = useState(() => initialOrderRestore);
  const [overrideWarning, setOverrideWarning] = useState(
    () =>
      [overrideRestore.warning, orderRestore.warning]
        .filter(Boolean)
        .join(" ") || null
  );
  const [outlineOpen, setOutlineOpen] = useState(true);
  const [presentationMode, setPresentationMode] = useState(
    () => window.localStorage.getItem(modeKey) === "true"
  );
  const [editorOpen, setEditorOpen] = useState(false);
  const [teacherGuideOpen, setTeacherGuideOpen] = useState(false);
  const [pptxExportOpen, setPptxExportOpen] = useState(false);
  const [overrides, setOverrides] = useState<StepOverrides>(overrideRestore.overrides);
  const [stepOrder, setStepOrder] = useState<string[]>(
    () => displayOnly ? lesson.steps.map((item) => item.id) : orderRestore.order
  );
  const [revealed, setRevealed] = useState<Set<RevealKey>>(new Set());
  const [vocabularyTerms, setVocabularyTerms] = useState<Record<string, string[]>>({});
  const [assessmentSelections, setAssessmentSelections] = useState(restoredAssessmentSelections);
  const [annotations, setAnnotations] = useState<AnnotationState>({});
  const [annotationMode, setAnnotationMode] = useState(false);
  const [annotationTool, setAnnotationTool] = useState<AnnotationTool>("pen");
  const projectionChannelRef = useRef<BroadcastChannel | null>(null);
  const projectionStateRef = useRef<ProjectionSyncState>({
    lessonId: lesson.lesson_id,
    stepId: lesson.steps[0].id,
    index,
    stepOrder,
    overrides: {},
    revealed: [],
    vocabularyTerms: {},
    assessmentSelections: {},
    annotations: {}
  });

  const effectiveSteps = useMemo(
    () =>
      stepOrder.map((id) => {
        const original = originalStepById.get(id);
        if (!original) throw new Error(`Unknown lesson step in order: ${id}`);
        return applyOverride(original, overrides[id]);
      }),
    [overrides, stepOrder]
  );
  const step = effectiveSteps[index];
  const exportLessons = useMemo<ExportLesson[]>(
    () => lessonCatalog.map((item) =>
      item.lesson_id === lesson.lesson_id ? { ...item, steps: effectiveSteps } : item
    ),
    [effectiveSteps]
  );
  const exportFrameRef = useRef<HTMLIFrameElement>(null);

  projectionStateRef.current = {
    lessonId: lesson.lesson_id,
    stepId: step.id,
    index,
    stepOrder,
    overrides: studentVisibleOverrides(overrides, lesson.theme_id),
    revealed: studentVisibleRevealKeys(revealed, lesson.theme_id),
    vocabularyTerms,
    assessmentSelections,
    annotations
  };

  const goTo = useCallback((next: number) => {
    const clamped = Math.max(0, Math.min(lesson.steps.length - 1, next));
    setIndex(clamped);
    setRevealed(new Set());

    if (!displayOnly) {
      const currentStepId = effectiveSteps[clamped]?.id;
      if (currentStepId) {
        const url = new URL(window.location.href);
        url.searchParams.set("lesson", lesson.lesson_id);
        url.searchParams.set("step", currentStepId);
        url.searchParams.delete("display");
        window.history.replaceState(null, "", url);
      }
    }
  }, [effectiveSteps]);

  const toggle = useCallback((key: RevealKey) => {
    setRevealed((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const toggleVocabularyTerm = useCallback((stepId: string, term: string) => {
    setVocabularyTerms((current) => {
      const existing = new Set(current[stepId] ?? []);
      if (existing.has(term)) existing.delete(term);
      else existing.add(term);

      return {
        ...current,
        [stepId]: [...existing]
      };
    });
  }, []);

  const selectAssessment = useCallback((stepId: string, itemIndex: number, value: string) => {
    const assessmentStep = originalStepById.get(stepId);
    if (
      !assessmentStep?.content?.items?.length ||
      !Number.isInteger(itemIndex) || itemIndex < 0 ||
      itemIndex >= assessmentStep.content.items.length ||
      (assessmentStep.content.scale?.length
        ? !assessmentStep.content.scale.includes(value)
        : value !== "checked" && value !== "")
    ) return;

    setAssessmentSelections((current) => {
      const stepSelections = { ...current[stepId] };
      if (value) stepSelections[itemIndex] = value;
      else delete stepSelections[itemIndex];
      const next = { ...current };
      if (Object.keys(stepSelections).length) next[stepId] = stepSelections;
      else delete next[stepId];
      return next;
    });
    if (displayOnly) {
      projectionChannelRef.current?.postMessage({
        type: "assessment-update",
        lessonId: lesson.lesson_id,
        stepId,
        itemIndex,
        value
      });
    }
  }, []);

  const revealNext = useCallback(() => {
    const order = revealOrder(step);
    const nextKey = order.find((key) => !revealed.has(key));
    if (nextKey) toggle(nextKey);
    else if (index < lesson.steps.length - 1) goTo(index + 1);
  }, [goTo, index, revealed, step, toggle]);

  const switchLesson = useCallback((lessonId: string) => {
    const target = lessonCatalog.find((item) => item.lesson_id === lessonId);
    if (!target || target.lesson_id === lesson.lesson_id) return;

    window.localStorage.setItem(lessonSelectionKey, target.lesson_id);
    projectionChannelRef.current?.postMessage({
      type: "lesson-switch",
      lessonId: target.lesson_id
    });
    const url = new URL(window.location.href);
    url.searchParams.set("lesson", target.lesson_id);
    url.searchParams.delete("step");
    url.searchParams.delete("display");
    window.location.assign(url.toString());
  }, []);

  const togglePresentationMode = useCallback(() => {
    setPresentationMode((current) => {
      const next = !current;
      if (!next) setAnnotationMode(false);
      if (next) {
        setOutlineOpen(false);
        setEditorOpen(false);
      }
      return next;
    });
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await document.documentElement.requestFullscreen();
    }
  }, []);

  const addAnnotation = useCallback((stroke: AnnotationStroke) => {
    setAnnotations((current) => appendAnnotation(current, step.id, stroke));
  }, [step.id]);

  const removeAnnotation = useCallback((strokeId: string) => {
    setAnnotations((current) => removeStepAnnotation(current, step.id, strokeId));
  }, [step.id]);

  const undoAnnotation = useCallback(() => {
    setAnnotations((current) => undoStepAnnotation(current, step.id));
  }, [step.id]);

  const clearAnnotations = useCallback(() => {
    setAnnotations((current) => clearStepAnnotations(current, step.id));
  }, [step.id]);

  const openProjectionWindow = useCallback(() => {
    const displayWindow = window.open(
      projectionLessonUrl(window.location.href, lesson.lesson_id, step.id),
      projectionWindowName,
      "popup=yes,width=1280,height=720"
    );

    if (!displayWindow) return;

    const publish = () => {
      projectionChannelRef.current?.postMessage({
        type: "lesson-state",
        state: projectionStateRef.current
      });
    };

    window.setTimeout(publish, 250);
    window.setTimeout(publish, 900);
  }, [step.id]);

  const updateStepOverride = useCallback(
    (stepId: string, patch: StepOverride) => {
      setOverrides((current) => ({
        ...current,
        [stepId]: {
          ...current[stepId],
          ...patch
        }
      }));
    },
    []
  );

  const moveCurrentStep = useCallback(
    (delta: -1 | 1) => {
      const target = index + delta;
      if (target < 0 || target >= stepOrder.length) return;

      setStepOrder((current) => {
        const next = [...current];
        [next[index], next[target]] = [next[target], next[index]];
        return next;
      });
      setIndex(target);
    },
    [index, stepOrder.length]
  );

  const moveRevealLayer = useCallback(
    (stepId: string, key: RevealKey, delta: -1 | 1) => {
      const currentStep = effectiveSteps.find((item) => item.id === stepId);
      if (!currentStep) return;

      const currentIndex = currentStep.reveal_order.indexOf(key);
      const targetIndex = currentIndex + delta;
      if (
        currentIndex < 0 ||
        targetIndex < 0 ||
        targetIndex >= currentStep.reveal_order.length
      ) {
        return;
      }

      const nextOrder = [...currentStep.reveal_order];
      [nextOrder[currentIndex], nextOrder[targetIndex]] = [
        nextOrder[targetIndex],
        nextOrder[currentIndex]
      ];

      updateStepOverride(stepId, { reveal_order: nextOrder });
    },
    [effectiveSteps, updateStepOverride]
  );

  const resetStepOverride = useCallback((stepId: string) => {
    setOverrides((current) => {
      const next = { ...current };
      delete next[stepId];
      return next;
    });
  }, []);

  const resetAllPresentationChanges = useCallback(() => {
    setOverrides({});
    setStepOrder(lesson.steps.map((item) => item.id));
    setIndex(0);
    setRevealed(new Set());
    setVocabularyTerms({});
    if (!displayOnly) {
      const url = new URL(window.location.href);
      url.searchParams.set("lesson", lesson.lesson_id);
      url.searchParams.set("step", lesson.steps[0].id);
      window.history.replaceState(null, "", url);
    }
  }, []);

  const exportLessonFlow = useCallback(() => {
    const steps = effectiveSteps.map((effective) => {
      const original = originalStepById.get(effective.id);
      if (!original) {
        throw new Error(`Unknown lesson step during export: ${effective.id}`);
      }

      return buildExportedStep(original, effective, overrides[original.id]);
    });

    const payload = {
      schema_version: lesson.schema_version,
      theme_id: lesson.theme_id,
      lesson_id: lesson.lesson_id,
      lesson_slug: lesson.lesson_slug,
      title: lesson.title,
      subtitle: lesson.subtitle,
      printed_page_range: lesson.printed_page_range,
      required_source_range: lesson.required_source_range,
      steps
    };

    const blob = new Blob([JSON.stringify(payload, null, 2) + "\n"], {
      type: "application/json"
    });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `${lesson.lesson_slug}-flow.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(href);
  }, [effectiveSteps, overrides]);

  const exportPowerPoint = useCallback(
    async (
      configuration: ExportConfiguration,
      onProgress: (progress: ExportProgress) => void,
      signal: AbortSignal
    ) => {
      const slides = planExportSlides(exportLessons, configuration);
      const { createAndDownloadPresentation } = await import("./export/service");
      return createAndDownloadPresentation(
        slides,
        configuration,
        (plannedSlide: PlannedSlide, pixelRatio: number, renderSignal: AbortSignal) => {
          const frame = exportFrameRef.current;
          if (!frame) throw new Error("İzole dışa aktarma yüzeyi oluşturulamadı.");
          return capturePlannedSlide(frame, plannedSlide, pixelRatio, renderSignal);
        },
        onProgress,
        signal
      );
    },
    [exportLessons]
  );

  useEffect(() => {
    if (displayOnly) return;
    window.localStorage.setItem(progressKey, String(index));
    window.localStorage.setItem(progressStepKey, step.id);
  }, [index, step.id]);

  useEffect(() => {
    if (displayOnly) return;
    window.localStorage.setItem(modeKey, String(presentationMode));
  }, [presentationMode]);

  useEffect(() => {
    if (displayOnly || !overrideRestore.canPersist) return;
    window.localStorage.setItem(
      overridesKey,
      JSON.stringify(overrideEnvelope(overrideSignature, overrides))
    );
  }, [overrides, overrideRestore.canPersist]);

  useEffect(() => {
    if (displayOnly || !orderRestore.canPersist) return;
    window.localStorage.setItem(
      orderKey,
      JSON.stringify(orderEnvelope(overrideSignature, stepOrder))
    );
  }, [stepOrder, orderRestore.canPersist]);

  useEffect(() => {
    if (!("BroadcastChannel" in window)) return;

    const channel = new BroadcastChannel(projectionChannelName);
    projectionChannelRef.current = channel;

    const navigateDisplay = (lessonId: string, stepId?: string) => {
      const target = lessonCatalog.find((item) => item.lesson_id === lessonId);
      if (!target || target.lesson_id === lesson.lesson_id) return;
      window.location.replace(
        projectionLessonUrl(window.location.href, target.lesson_id, stepId)
      );
    };

    channel.onmessage = (event: MessageEvent) => {
      const message = event.data as
        | { type: "request-state" }
        | { type: "lesson-switch"; lessonId: string }
        | { type: "lesson-state"; state: ProjectionSyncState }
        | { type: "assessment-update"; lessonId: string; stepId: string; itemIndex: number; value: string }
        | undefined;
      if (!message) return;

      if (message.type === "request-state" && !displayOnly) {
        channel.postMessage({
          type: "lesson-state",
          state: projectionStateRef.current
        });
        return;
      }

      if (message.type === "lesson-switch" && displayOnly) {
        navigateDisplay(message.lessonId);
        return;
      }

      if (message.type === "lesson-state" && displayOnly) {
        const state = message.state;
        if (state.lessonId !== lesson.lesson_id) {
          navigateDisplay(state.lessonId, state.stepId);
          return;
        }
        const canonical = lesson.steps.map((item) => item.id);
        const orderedIds = Array.isArray(state.stepOrder) &&
          state.stepOrder.length === canonical.length &&
          new Set(state.stepOrder).size === canonical.length &&
          state.stepOrder.every((id) => canonical.includes(id))
            ? state.stepOrder
            : canonical;
        setStepOrder(orderedIds);
        setOverrides(studentVisibleOverrides(state.overrides ?? {}, lesson.theme_id));
        setIndex(restoredStepIndex(orderedIds, state.stepId, null, state.index));
        setRevealed(new Set(studentVisibleRevealKeys(state.revealed ?? [], lesson.theme_id)));
        setVocabularyTerms(state.vocabularyTerms ?? {});
        setAssessmentSelections(state.assessmentSelections ?? {});
        setAnnotations(state.annotations ?? {});
        return;
      }

      if (message.type === "assessment-update" && !displayOnly && message.lessonId === lesson.lesson_id) {
        const assessmentStep = originalStepById.get(message.stepId);
        if (
          !assessmentStep?.content?.items?.length ||
          !Number.isInteger(message.itemIndex) || message.itemIndex < 0 ||
          message.itemIndex >= assessmentStep.content.items.length ||
          (assessmentStep.content.scale?.length
            ? !assessmentStep.content.scale.includes(message.value)
            : message.value !== "checked" && message.value !== "")
        ) return;
        setAssessmentSelections((current) => ({
          ...current,
          [message.stepId]: message.value
            ? { ...current[message.stepId], [message.itemIndex]: message.value }
            : Object.fromEntries(Object.entries(current[message.stepId] ?? {}).filter(([index]) => Number(index) !== message.itemIndex))
        }));
      }
    };

    if (displayOnly) {
      channel.postMessage({ type: "request-state" });
    }

    return () => {
      channel.close();
      if (projectionChannelRef.current === channel) {
        projectionChannelRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (displayOnly) return;
    projectionChannelRef.current?.postMessage({
      type: "lesson-state",
      state: projectionStateRef.current
    });
  }, [index, overrides, revealed, stepOrder, vocabularyTerms, assessmentSelections, annotations]);

  useEffect(() => {
    try {
      window.localStorage.setItem(assessmentKey, JSON.stringify(assessmentSelections));
    } catch {
      // Keep the current page usable when browser storage is unavailable.
    }
  }, [assessmentSelections]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLElement &&
        event.target.closest("dialog[open]")
      ) {
        return;
      }

      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (displayOnly) {
        if (event.key.toLowerCase() === "f") {
          void toggleFullscreen();
        }
        return;
      }

      if (annotationMode) {
        event.preventDefault();
        if (event.key === "Escape") setAnnotationMode(false);
        return;
      }

      if (event.key === "ArrowRight") goTo(index + 1);
      else if (event.key === "ArrowLeft") goTo(index - 1);
      else if (event.key === " ") {
        event.preventDefault();
        revealNext();
      } else if (event.key.toLowerCase() === "c" && step.answer) {
        toggle("answer");
      } else if (event.key.toLowerCase() === "g" && step.answer?.guidance) {
        toggle("guidance");
      } else if (event.key.toLowerCase() === "e" && step.answer?.explanation) {
        toggle("explanation");
      } else if (event.key.toLowerCase() === "d" && !presentationMode) {
        setEditorOpen((current) => !current);
      } else if (event.key.toLowerCase() === "p") {
        togglePresentationMode();
      } else if (event.key.toLowerCase() === "f") {
        void toggleFullscreen();
      } else if (event.key === "Home") {
        goTo(0);
      } else if (event.key === "End") {
        goTo(lesson.steps.length - 1);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    goTo,
    index,
    annotationMode,
    presentationMode,
    revealNext,
    step,
    toggle,
    toggleFullscreen,
    togglePresentationMode
  ]);

  return (
    <div
      className={[
        "app-shell",
        outlineOpen && !presentationMode && !displayOnly ? "outline-open" : "",
        presentationMode ? "presentation-mode" : "",
        displayOnly ? "external-display" : "",
        editorOpen && !displayOnly ? "editor-open" : ""
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <LessonToolbar
        lesson={lesson}
        lessons={lessonCatalog}
        displayOnly={displayOnly}
        overrideWarning={overrideWarning}
        backupKey={overrideRestore.backupKey ?? orderRestore.backupKey}
        outlineOpen={outlineOpen}
        editorOpen={editorOpen}
        teacherGuideOpen={teacherGuideOpen}
        onWarningDismiss={() => setOverrideWarning(null)}
        onLessonChange={switchLesson}
        onOutlineToggle={() => setOutlineOpen((value) => !value)}
        onEditorToggle={() => setEditorOpen((value) => !value)}
        onTeacherGuideToggle={() => setTeacherGuideOpen((value) => !value)}
        onOpenStudentDisplay={openProjectionWindow}
        onPresentationToggle={togglePresentationMode}
        onFullscreen={() => void toggleFullscreen()}
        onExportPptx={() => setPptxExportOpen(true)}
      />

      {presentationMode && !displayOnly ? (
        <button
          id="presentation-pptx-export-trigger"
          className="presentation-pptx-export-trigger"
          type="button"
          onClick={() => setPptxExportOpen(true)}
        >
          Dışa aktar · PPTX
        </button>
      ) : null}

      {presentationMode && !displayOnly ? (
        <AnnotationToolbar
          active={annotationMode}
          tool={annotationTool}
          canUndo={Boolean(annotations[step.id]?.length)}
          onToggle={() => setAnnotationMode(true)}
          onToolChange={setAnnotationTool}
          onUndo={undoAnnotation}
          onClear={clearAnnotations}
          onClose={() => setAnnotationMode(false)}
        />
      ) : null}

      {teacherGuideOpen && !presentationMode && !displayOnly ? (
        <div id="teacher-guide-panel">
          <TeacherGuidePanel
            lesson={lesson}
            step={step}
            onClose={() => setTeacherGuideOpen(false)}
          />
        </div>
      ) : null}

      <LessonOutline
        lesson={lesson}
        steps={effectiveSteps}
        index={index}
        goTo={goTo}
      />

      <div className="content-column">
        <StepView
          step={step}
          themeId={lesson.theme_id}
          revealed={revealed}
          toggle={toggle}
          presentationMode={presentationMode || displayOnly}
          showInlineControls={!displayOnly}
          showTeacherNotes={!displayOnly && (lesson.theme_id !== "TEMA_01" || !presentationMode)}
          showTeacherSupport={lesson.theme_id !== "TEMA_01" || (!displayOnly && !presentationMode)}
          visibleVocabularyTerms={
            new Set(vocabularyTerms[step.id] ?? [])
          }
          toggleVocabularyTerm={(term) => toggleVocabularyTerm(step.id, term)}
          assessmentSelections={assessmentSelections[step.id] ?? {}}
          onAssessmentSelect={selectAssessment}
        />

        <LessonFooter
          index={index}
          totalSteps={lesson.steps.length}
          step={step}
          presentationMode={presentationMode}
          goTo={goTo}
        />
      </div>

      {(displayOnly || presentationMode) && (annotationMode || Boolean(annotations[step.id]?.length)) ? (
        <AnnotationOverlay
          stepId={step.id}
          strokes={annotations[step.id] ?? []}
          enabled={annotationMode && !displayOnly}
          tool={annotationTool}
          onStroke={addAnnotation}
          onErase={removeAnnotation}
        />
      ) : null}

      {editorOpen && !presentationMode && !displayOnly ? (
        <EditorPanel
          step={step}
          hasOverride={Boolean(overrides[step.id])}
          onPromptChange={(value) =>
            updateStepOverride(step.id, { display_prompt: value })
          }
          onLayoutChange={(value) => updateStepOverride(step.id, { layout: value })}
          onDensityChange={(value) => updateStepOverride(step.id, { density: value })}
          onRevealMove={(key, delta) => moveRevealLayer(step.id, key, delta)}
          onContentChange={(content) => {
            let revealOrder = step.reveal_order;
            const noteExists = Boolean(content.note?.trim());
            const hasNoteReveal = revealOrder.includes("note");

            if (!noteExists && hasNoteReveal) {
              revealOrder = revealOrder.filter((key) => key !== "note");
            } else if (noteExists && !hasNoteReveal) {
              revealOrder = [...revealOrder, "note"];
            }

            updateStepOverride(step.id, {
              content,
              reveal_order: revealOrder
            });
          }}
          canMoveUp={index > 0}
          canMoveDown={index < effectiveSteps.length - 1}
          onMoveUp={() => moveCurrentStep(-1)}
          onMoveDown={() => moveCurrentStep(1)}
          hasAnyPresentationChanges={
            Object.keys(overrides).length > 0 ||
            stepOrder.some((id, itemIndex) => id !== lesson.steps[itemIndex]?.id)
          }
          onReset={() => resetStepOverride(step.id)}
          onResetAll={resetAllPresentationChanges}
          onExport={exportLessonFlow}
          onClose={() => setEditorOpen(false)}
        />
      ) : null}

      {!displayOnly ? (
        <>
          <ExportDialog
            open={pptxExportOpen}
            lesson={exportLessons.find((item) => item.lesson_id === lesson.lesson_id)!}
            lessons={exportLessons}
            currentStep={step}
            onClose={() => setPptxExportOpen(false)}
            onExport={exportPowerPoint}
          />
          {pptxExportOpen ? (
            <iframe
              ref={exportFrameRef}
              className="pptx-export-render-frame"
              title="PowerPoint dışa aktarma render yüzeyi"
              src={`${import.meta.env.BASE_URL}?export-render=1`}
              aria-hidden="true"
              tabIndex={-1}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
