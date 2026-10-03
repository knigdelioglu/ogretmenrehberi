import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { discoverLocalModuleGraph } from "./offline-module-graph.mjs";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(appRoot, "src");
const distRoot = path.join(appRoot, "dist");
const sourceGraph = discoverLocalModuleGraph(sourceRoot, "app.js");
const builtGraph = discoverLocalModuleGraph(distRoot, "app.js");

assert.deepEqual(builtGraph.files, sourceGraph.files,
  "every app.js module dependency must be copied to the production build");
assert.deepEqual(builtGraph.requests, sourceGraph.requests,
  "the production build must preserve every local module import URL");

for (const relative of builtGraph.files) {
  assert.ok(fs.existsSync(path.join(sourceRoot, relative)), `source module exists: ${relative}`);
  assert.ok(fs.existsSync(path.join(distRoot, relative)), `built module exists: ${relative}`);
}

const worker = fs.readFileSync(path.join(distRoot, "sw.js"), "utf8");
const coreMatch = /^const CORE = (\[[^\n]*\]);$/m.exec(worker);
assert.ok(coreMatch, "built service worker exposes its generated precache list");
const core = JSON.parse(coreMatch[1]);
assert.equal(new Set(core).size, core.length, "precache URLs are unique");
assert.ok(worker.includes(".addAll(CORE)"), "service worker installs the full precache list");

const indexHtml = fs.readFileSync(path.join(distRoot, "index.html"), "utf8");
const scriptMatch = /<script\s+type="module"\s+src="([^"]+)"/.exec(indexHtml);
assert.ok(scriptMatch, "built page has a module entry point");
const appUrl = scriptMatch[1];
const buildVersion = new URL(appUrl, "https://offline.test/").searchParams.get("v");
assert.ok(buildVersion, "app entry URL carries its build version");
assert.ok(core.includes(appUrl), "the versioned app entry is precached");
assert.ok(worker.includes(`sunum-${buildVersion}`), "service worker cache version matches the app build");

for (const request of builtGraph.requests) {
  assert.ok(core.includes(request), `local module dependency is precached: ${request}`);
}
for (const request of core) {
  const url = new URL(request, "https://offline.test/");
  assert.equal(url.origin, "https://offline.test", `precache entry stays local: ${request}`);
  const relative = decodeURIComponent(url.pathname.replace(/^\//, "")) || "index.html";
  const file = path.join(distRoot, relative);
  assert.ok(fs.existsSync(file), `precache entry exists in dist: ${request}`);
}

console.log(`[sunum-web] Offline assets passed: ${builtGraph.files.length} app modules and ${core.length} precache entries; all local import dependencies are present and cached.`);
