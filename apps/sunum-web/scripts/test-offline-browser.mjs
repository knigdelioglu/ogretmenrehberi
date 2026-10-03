import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import https from "node:https";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { discoverLocalModuleGraph } from "./offline-module-graph.mjs";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(appRoot, "../..");
const distRoot = path.join(appRoot, "dist");
const chrome = process.env.CHROME;
if (!chrome) throw new Error("Set CHROME to a Chrome/Chromium executable for offline browser checks.");
if (!fs.existsSync(path.join(distRoot, "index.html"))) {
  throw new Error("Production sunum-web/dist/index.html is missing; run the production build first.");
}

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sunum-offline-cdp-"));
const profile = path.join(tempRoot, "profile");
fs.mkdirSync(profile);
const keyFile = path.join(tempRoot, "localhost-key.pem");
const certFile = path.join(tempRoot, "localhost-cert.pem");
execFileSync("openssl", [
  "req", "-x509", "-newkey", "rsa:2048", "-sha256", "-nodes", "-days", "1",
  "-keyout", keyFile, "-out", certFile, "-subj", "/CN=127.0.0.1",
  "-addext", "subjectAltName=IP:127.0.0.1"
], { stdio: "ignore" });

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".bin": "application/octet-stream",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml"
};
const netlifyToml = fs.readFileSync(path.join(repoRoot, "netlify.toml"), "utf8");
const csp = /Content-Security-Policy = "([^"]+)"/.exec(netlifyToml)?.[1] ?? "";
const server = https.createServer({
  key: fs.readFileSync(keyFile),
  cert: fs.readFileSync(certFile)
}, (req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, "https://localhost").pathname);
  const file = path.resolve(distRoot, urlPath === "/" ? "index.html" : urlPath.slice(1));
  if (!file.startsWith(distRoot + path.sep) && file !== path.join(distRoot, "index.html")) {
    res.writeHead(403, { "Cache-Control": "no-cache" });
    res.end("Forbidden");
    return;
  }
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404, { "Cache-Control": "no-cache" });
    res.end("Dosya bulunamadı.");
    return;
  }
  res.writeHead(200, {
    "Content-Type": types[path.extname(file)] || "application/octet-stream",
    "Cache-Control": "no-cache",
    "Content-Security-Policy": csp
  });
  fs.createReadStream(file).pipe(res);
});

const browser = spawn(chrome, [
  "--headless=new", "--no-sandbox", "--disable-gpu", "--disable-popup-blocking", "--no-first-run",
  "--ignore-certificate-errors", "--allow-insecure-localhost", "--remote-allow-origins=*",
  "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank"
], { stdio: "ignore" });
const clients = [];

async function stopChild(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  const exited = new Promise((resolve) => child.once("exit", resolve));
  child.kill("SIGTERM");
  await Promise.race([exited, sleep(3000)]);
  if (child.exitCode === null && child.signalCode === null) {
    const killed = new Promise((resolve) => child.once("exit", resolve));
    child.kill("SIGKILL");
    await Promise.race([killed, sleep(1000)]);
  }
}

async function until(check, label, timeout = 15000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      const result = await check();
      if (result) return result;
    } catch { /* navigation can temporarily replace the execution context */ }
    await sleep(80);
  }
  throw new Error(`Timed out: ${label}`);
}

async function connectTarget(debugPort) {
  const target = await until(async () => {
    const response = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
    return (await response.json()).find((item) => item.type === "page" && item.url === "about:blank");
  }, "Chrome page target");
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  const pending = new Map();
  const handlers = new Map();
  let sequence = 0;
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const pair = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) pair.reject(new Error(message.error.message));
      else pair.resolve(message.result);
    }
    if (message.method) {
      for (const handler of handlers.get(message.method) ?? []) handler(message.params);
    }
  });
  const client = {
    send(method, params = {}) {
      const id = ++sequence;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
    on(method, handler) {
      if (!handlers.has(method)) handlers.set(method, []);
      handlers.get(method).push(handler);
    },
    async evaluate(expression) {
      const result = await this.send("Runtime.evaluate", {
        expression, awaitPromise: true, returnByValue: true, userGesture: true
      });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
      return result.result.value;
    },
    close() { socket.close(); }
  };
  clients.push(client);
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await client.send("Network.enable");
  return client;
}

function localPassword() {
  if (process.env.SUNUM_SIFRE) return process.env.SUNUM_SIFRE;
  const envPath = path.join(appRoot, ".env.local");
  if (!fs.existsSync(envPath)) return "sunum";
  const match = /^\s*SUNUM_SIFRE\s*=\s*(.*?)\s*$/m.exec(fs.readFileSync(envPath, "utf8"));
  return match ? match[1].replace(/^["']|["']$/g, "") : "sunum";
}

let offlinePhase = false;
const serviceWorkerResponses = new Set();
let page;
try {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const root = `https://127.0.0.1:${server.address().port}/`;
  const portFile = path.join(profile, "DevToolsActivePort");
  const debugPort = await until(() => fs.existsSync(portFile)
    ? Number(fs.readFileSync(portFile, "utf8").split("\n")[0]) : null, "Chrome debugging endpoint");
  page = await connectTarget(debugPort);
  page.on("Network.responseReceived", ({ response }) => {
    if (!offlinePhase || !response.fromServiceWorker) return;
    const url = new URL(response.url);
    serviceWorkerResponses.add(`${url.pathname.replace(/^\//, "")}${url.search}`);
  });

  await page.send("Page.navigate", { url: root });
  await until(() => page.evaluate("location.protocol === 'https:' && window.isSecureContext"),
    "temporary HTTPS secure context");
  await until(() => page.evaluate("Boolean(document.querySelector('#gate') && !document.querySelector('#gate').hidden)"),
    "app module shows the password gate");
  await until(() => page.evaluate("navigator.serviceWorker.ready.then(registration => Boolean(registration.active && registration.active.state === 'activated'))"),
    "service worker install and activation");
  await until(() => page.evaluate("Boolean(navigator.serviceWorker.controller)"),
    "service worker controls the first page");

  const graph = discoverLocalModuleGraph(distRoot, "app.js");
  const appSource = fs.readFileSync(path.join(distRoot, "app.js"), "utf8");
  const dataFile = /const DATA_FILE = "([^"]+)"/.exec(appSource)?.[1];
  assert.ok(dataFile, "built app points at its encrypted lesson catalog");
  const indexHtml = fs.readFileSync(path.join(distRoot, "index.html"), "utf8");
  const appUrl = /<script\s+type="module"\s+src="([^"]+)"/.exec(indexHtml)?.[1];
  assert.ok(appUrl, "built page has a module entry point");
  const expectedCacheEntries = JSON.stringify(graph.requests);
  const cachedModules = await page.evaluate(`(async () => {
    const expected = ${expectedCacheEntries};
    const cachesList = await caches.keys();
    const keys = [];
    for (const name of cachesList) {
      const cache = await caches.open(name);
      for (const request of await cache.keys()) keys.push(new URL(request.url).pathname.replace(/^\\//, "") + new URL(request.url).search);
    }
    return expected.filter((request) => keys.includes(request));
  })()`);
  assert.deepEqual(cachedModules, graph.requests,
    "the real service worker precaches every discovered app module dependency before offline reload");

  offlinePhase = true;
  await page.send("Network.emulateNetworkConditions", {
    offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0, connectionType: "none"
  });
  await until(() => page.evaluate("navigator.onLine === false"), "network disabled in Chrome");
  const firstDocumentTime = await page.evaluate("performance.timeOrigin");
  await page.send("Page.reload", {});
  await until(() => page.evaluate(`performance.timeOrigin > ${firstDocumentTime} && document.readyState === 'complete' && Boolean(document.querySelector('#gate') && !document.querySelector('#gate').hidden)`),
    "app module loads after offline reload");

  await page.evaluate(`(() => {
    const field = document.querySelector('#gate-password');
    field.value = ${JSON.stringify(localPassword())};
    document.querySelector('#gate-form').requestSubmit();
  })()`);
  await until(() => page.evaluate("document.querySelector('#gate').hidden && Boolean(document.querySelector('#canvas .slide'))"),
    "cached encrypted lesson catalog opens while offline", 30000);

  const loadedByWorker = [...serviceWorkerResponses].sort();
  assert.ok(loadedByWorker.includes(""), "offline navigation is served by the service worker");
  const appEntryUrl = new URL(appUrl, root);
  const appEntryRequest = `${appEntryUrl.pathname.replace(/^\//, "")}${appEntryUrl.search}`;
  assert.ok(loadedByWorker.includes(appEntryRequest), "offline app entry is served by the service worker");
  for (const request of graph.requests) {
    assert.ok(loadedByWorker.includes(request), `offline module response came from the service worker: ${request}`);
  }
  assert.ok(loadedByWorker.includes(dataFile), "encrypted catalog is served by the service worker while offline");
  assert.equal(await page.evaluate("navigator.serviceWorker.controller !== null"), true,
    "the presentation remains controlled by the active worker after offline reload");

  console.log(`[sunum-web] Offline Chrome regression passed: secure HTTPS worker precached ${graph.files.length} modules; offline reload opened the encrypted lesson catalog.`);
} finally {
  for (const client of clients) client.close();
  await stopChild(browser);
  if (server.listening) await new Promise((resolve) => server.close(resolve));
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
