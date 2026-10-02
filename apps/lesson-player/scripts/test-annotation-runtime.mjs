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

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appSource = fs.readFileSync(path.join(appRoot, "src/App.tsx"), "utf8");
const overlaySource = fs.readFileSync(path.join(appRoot, "src/components/AnnotationOverlay.tsx"), "utf8");
const toolbarSource = fs.readFileSync(path.join(appRoot, "src/components/AnnotationToolbar.tsx"), "utf8");
const exportSource = fs.readFileSync(path.join(appRoot, "src/export/ExportRenderPage.tsx"), "utf8");
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

assert.match(overlaySource, /onPointerDown/);
assert.match(overlaySource, /onPointerMove/);
assert.match(overlaySource, /onPointerUp/);
assert.match(overlaySource, /onPointerCancel/);
assert.match(overlaySource, /getCoalescedEvents/);
assert.match(toolbarSource, /Fosforlu kalem/);
assert.match(toolbarSource, /Geri al/);
assert.match(appSource, /state\.annotations \?\? \{\}/, "The projection receives persisted-in-session annotation state.");
assert.match(appSource, /assessmentSelections, annotations/, "Annotation updates publish through the current lesson-state BroadcastChannel flow.");
assert.match(appSource, /enabled=\{annotationMode && !displayOnly\}/, "The displayOnly window renders annotations without drawing input.");
assert.match(appSource, /presentationMode && !displayOnly \? \(/, "Teacher annotation controls are limited to presentation mode.");
assert.match(stylesSource, /\.annotation-overlay \{[\s\S]*?pointer-events: none;/, "The inactive overlay cannot intercept normal lesson input.");
assert.match(stylesSource, /\.annotation-overlay\.is-enabled \{[\s\S]*?touch-action: none;/, "Drawing mode suppresses browser touch scrolling and panning.");
assert.doesNotMatch(exportSource, /AnnotationOverlay/, "PPTX capture remains free of temporary annotations.");

console.log("Annotation runtime tests passed.");
