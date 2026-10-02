import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  appendAnnotation,
  clearAnnotations,
  removeAnnotation,
  undoAnnotation
} from "../src/annotation/state.js";
import { normalizePoint, scalePoint } from "../src/annotation/geometry.js";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appSource = fs.readFileSync(path.join(appRoot, "src/App.tsx"), "utf8");
const overlaySource = fs.readFileSync(path.join(appRoot, "src/components/AnnotationOverlay.tsx"), "utf8");
const toolbarSource = fs.readFileSync(path.join(appRoot, "src/components/AnnotationToolbar.tsx"), "utf8");
const exportSource = fs.readFileSync(path.join(appRoot, "src/export/ExportRenderPage.tsx"), "utf8");
const captureSource = fs.readFileSync(path.join(appRoot, "src/export/capture.ts"), "utf8");
const stylesSource = fs.readFileSync(path.join(appRoot, "src/styles.css"), "utf8");

const stroke = (id) => ({ id, tool: "pen", points: [{ x: 0.1, y: 0.2 }] });
let state = appendAnnotation({}, "step-a", stroke("a1"));
state = appendAnnotation(state, "step-a", stroke("a2"));
state = appendAnnotation(state, "step-b", stroke("b1"));
assert.equal(state["step-a"].length, 2, "Strokes are grouped by step ID.");
assert.equal(state["step-b"].length, 1, "A different step keeps an independent drawing list.");
assert.equal(undoAnnotation(state, "step-a")["step-a"][0].id, "a1", "Undo removes only the latest stroke on the current step.");
assert.equal(removeAnnotation(state, "step-a", "a1")["step-a"][0].id, "a2", "The eraser removes the selected stroke only.");
const cleared = clearAnnotations(state, "step-a");
assert.deepEqual(cleared["step-a"], [], "Clear empties the selected step.");
assert.deepEqual(cleared["step-b"], state["step-b"], "Clear preserves every other step.");

const tabletRect = { left: 80, top: 120, width: 960, height: 600 };
const tabletPoint = normalizePoint(320, 420, tabletRect);
assert.deepEqual(tabletPoint, { x: 0.25, y: 0.5 }, "Coordinates normalize against the annotation surface rect, including its offset.");
assert.deepEqual(scalePoint(tabletPoint, 1280, 720), { x: 320, y: 360 }, "Resize and a 16:10 to 16:9 surface map the stored point proportionally.");
const resizedRect = { left: 40, top: 32, width: 1280, height: 720 };
assert.deepEqual(normalizePoint(360, 392, resizedRect), tabletPoint, "The same relative point remains stable after surface resize and movement.");
assert.deepEqual(scalePoint(tabletPoint, 1280, 800), { x: 320, y: 400 }, "Rendering uses the current overlay width and height independently.");

assert.match(overlaySource, /onPointerDown/);
assert.match(overlaySource, /onPointerMove/);
assert.match(overlaySource, /onPointerUp/);
assert.match(overlaySource, /onPointerCancel/);
assert.match(overlaySource, /getCoalescedEvents/);
assert.match(overlaySource, /overlayRef\.current\?\.getBoundingClientRect\(\)/, "Pointer coordinates use the visible SVG surface rect.");
assert.match(overlaySource, /ResizeObserver\(measure\)/, "The annotation surface is remeasured after resize.");
assert.match(overlaySource, /onWheel=\{\(event\) => event\.preventDefault\(\)\}/, "Mouse and trackpad scrolling are blocked while drawing.");
assert.match(toolbarSource, /Fosforlu kalem/);
assert.match(toolbarSource, /Geri al/);
assert.match(appSource, /state\.annotations \?\? \{\}/, "The projection receives persisted-in-session annotation state.");
assert.match(appSource, /assessmentSelections, annotations/, "Annotation updates publish through the current lesson-state BroadcastChannel flow.");
assert.match(appSource, /enabled=\{annotationMode && !displayOnly\}/, "The displayOnly window renders annotations without drawing input.");
assert.match(appSource, /annotations: AnnotationState/, "Projection lesson-state contains runtime annotations.");
assert.match(appSource, /annotationSurfaceRef=\{annotationSurfaceRef\}/, "The overlay is anchored to StepView's rendered stage layout.");
assert.match(appSource, /strokes=\{annotations\[step\.id\] \?\? \[\]\}/, "Returning to a step renders that step's retained annotations.");
assert.match(appSource, /presentationMode && !displayOnly \? \(/, "Teacher annotation controls are limited to presentation mode.");
assert.match(stylesSource, /\.annotation-overlay \{[\s\S]*?pointer-events: none;/, "The visual overlay never intercepts normal lesson input.");
assert.match(stylesSource, /\.annotation-input-shield \{[\s\S]*?touch-action: none;/, "Drawing mode suppresses browser touch scrolling and panning.");
assert.match(overlaySource, /\{enabled \? \(/, "The input shield exists only while annotation mode is enabled.");
assert.doesNotMatch(exportSource, /AnnotationOverlay/, "PPTX capture remains free of temporary annotations.");
assert.doesNotMatch(captureSource, /annotation/i, "The capture pipeline does not consume annotation state.");

console.log("Annotation runtime tests passed.");
