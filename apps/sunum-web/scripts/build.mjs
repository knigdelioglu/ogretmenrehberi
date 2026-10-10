// Sunum Web build
// 1) Kanonik veriden ders kataloğunu üretir (lesson-player'ın veri üreticisi).
// 2) Yalnız sunumda gereken alanları ayıklar (öğretmen notları çıkarılır).
// 3) Veriyi sıkıştırıp SUNUM_SIFRE ile AES-256-GCM olarak şifreler.
// 4) dist/ klasörüne statik siteyi yazar. Harici bağımlılık yoktur.

import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import { insertThinkingReveal } from "../src/reveal-sequence.js";
import { collectThinkingRecords, thinkingRecordKey } from "./thinking-data.mjs";
import { discoverLocalModuleGraph } from "./offline-module-graph.mjs";
import { assessmentFormsForLessons } from "./assessment-forms.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "..");
const repoRoot = path.resolve(appRoot, "../..");
const srcDir = path.join(appRoot, "src");
const distDir = path.join(appRoot, "dist");
const lessonBuilder = path.join(repoRoot, "apps/lesson-player/scripts/build-lesson-data.mjs");
const lessonsPath = path.join(repoRoot, "apps/lesson-player/src/generated/lessons.json");

const PBKDF2_ITERATIONS = 250_000;

function fail(message) {
  console.error(`\n[sunum-web] HATA: ${message}\n`);
  process.exit(1);
}

// ---------- şifre ----------
function readLocalEnv() {
  const envPath = path.join(appRoot, ".env.local");
  if (!fs.existsSync(envPath)) return {};
  const out = {};
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

const isCi = Boolean(process.env.NETLIFY || process.env.CI);
let password = process.env.SUNUM_SIFRE || readLocalEnv().SUNUM_SIFRE || "";
if (!password) {
  if (isCi) {
    fail(
      "SUNUM_SIFRE ortam değişkeni tanımlı değil. GitHub Actions için repository secret, Netlify için Environment variables bölümünden SUNUM_SIFRE ekleyin."
    );
  }
  password = "sunum";
  console.warn('[sunum-web] UYARI: SUNUM_SIFRE yok; yerel deneme şifresi "sunum" kullanıldı.');
}
if (password.length < 4) fail("SUNUM_SIFRE en az 4 karakter olmalı.");

// ---------- veri ----------
console.log("[sunum-web] Ders verisi kanonik kaynaktan üretiliyor…");
execFileSync(process.execPath, [lessonBuilder], { stdio: ["ignore", "ignore", "inherit"] });
const lessons = JSON.parse(fs.readFileSync(lessonsPath, "utf8"));
const formIndex = JSON.parse(fs.readFileSync(path.join(repoRoot, "data/grade-11/source/textbook-forms-index.json"), "utf8"));
// Use the same current book URL as the preserved slide source links.
const bookSource = lessons.flatMap((lesson) => lesson.steps).flatMap((step) => step.content?.sources || [])
  .find((source) => source.url.startsWith("https://tymm.meb.gov.tr/assets/pdf/") && source.url.includes("11sinif-ders-kitabi"));
if (!bookSource) fail("Değerlendirme formları için güncel ders kitabı bağlantısı bulunamadı.");
const formsByLesson = assessmentFormsForLessons(formIndex, lessons, bookSource.url.split("#")[0]);

const thinkingRoot = path.join(repoRoot, "data/grade-11/presentation");
let thinkingData;
try {
  thinkingData = collectThinkingRecords(thinkingRoot, lessons);
} catch (error) {
  fail(error.message);
}
const thinkingByStep = thinkingData.records;
const matchedThinkingSteps = new Set();

const THEME_NAMES = {
  TEMA_01: "Bir Diyeceğim Var!",
  TEMA_02: "Kültür Yolculuğu",
  TEMA_03: "Yaşamın İzinde",
  TEMA_04: "Hayatın Aynası"
};

const nonEmpty = (v) =>
  v !== undefined && v !== null && !(typeof v === "string" && !v.trim()) && !(Array.isArray(v) && !v.length);

function pick(obj, keys) {
  const out = {};
  for (const k of keys) if (nonEmpty(obj?.[k])) out[k] = obj[k];
  return out;
}

function slimStep(step, themeId, thinking) {
  const includeTeacherSupport = themeId !== "TEMA_01" && themeId !== "TEMA_02";
  const answerFields = [
    "entry_type",
    "question_no",
    "answer",
    "answer_sections",
    ...(includeTeacherSupport ? ["guidance", "explanation"] : []),
    "evidence_quotes",
    "dictionary_terms"
  ];
  const answer = step.answer
    ? pick(step.answer, answerFields)
    : null;
  if (answer?.dictionary_terms) {
    answer.dictionary_terms = answer.dictionary_terms.map(({ term, meaning }) => ({ term, meaning }));
  }
  const content = step.content ? pick(step.content, ["lead", "items", "item_offset", "sections", "table", "options", "rubric", "scale", "images", "sources"]) : null;
  // Keep the Lesson Player fallbacks in the canonical flow, but avoid duplicate web output.
  if (content?.table) {
    delete content.items;
    delete content.sections;
  } else if (content?.options) {
    delete content.items;
  }

  // Kumandayla açılacak katmanlar: kanonik reveal_order sırası, öğretmen notu hariç,
  // yalnız gerçekten içeriği olan katmanlar.
  const has = {
    guidance: includeTeacherSupport && Boolean(answer?.guidance),
    answer: Boolean(answer?.answer || answer?.answer_sections),
    evidence: Boolean(answer?.evidence_quotes?.length && !step.presentation?.web),
    explanation: includeTeacherSupport && Boolean(answer?.explanation),
    dictionary: Boolean(answer?.dictionary_terms?.length)
  };
  const baseReveals = (step.reveal_order || []).filter((k) => has[k]);
  const reveals = insertThinkingReveal(baseReveals, Boolean(thinking));

  return {
    id: step.id,
    layout: step.layout,
    density: step.density,
    sections_layout: step.sections_layout,
    prompt: step.display_prompt,
    page: step.source?.printed_page_range ?? "",
    heading: step.source?.book_heading ?? "",
    task: step.source?.task_type ?? "",
    reveals,
    ...(thinking ? { thinking } : {}),
    presentation: step.presentation ?? undefined,
    answer: answer && Object.keys(answer).length ? answer : null,
    content: content && Object.keys(content).length ? content : null
  };
}

const catalog = {
  built_at: new Date().toISOString(),
  themes: THEME_NAMES,
  lessons: lessons.map((lesson) => ({
    id: lesson.lesson_id,
    slug: lesson.lesson_slug,
    theme: lesson.theme_id,
    title: lesson.title,
    subtitle: lesson.subtitle,
    pages: lesson.printed_page_range,
    forms: formsByLesson.get(lesson.lesson_id),
    steps: lesson.steps.map((step) => {
      const key = thinkingRecordKey(lesson.lesson_id, step.id);
      const thinking = thinkingByStep.get(key);
      if (thinking !== undefined) matchedThinkingSteps.add(key);
      return slimStep(step, lesson.theme_id, thinking?.text);
    })
  }))
};

if (matchedThinkingSteps.size !== thinkingByStep.size) {
  const unmatched = [...thinkingByStep.keys()].filter((key) => !matchedThinkingSteps.has(key));
  fail(`Sunum adımında karşılığı olmayan Düşünürken kayıtları: ${unmatched.join(", ")}`);
}

const stepCount = catalog.lessons.reduce((n, l) => n + l.steps.length, 0);

// ---------- şifreleme ----------
const plain = zlib.gzipSync(Buffer.from(JSON.stringify(catalog), "utf8"), { level: 9 });
const salt = crypto.randomBytes(16);
const iv = crypto.randomBytes(12);
const key = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, 32, "sha256");
const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
const encrypted = Buffer.concat([cipher.update(plain), cipher.final(), cipher.getAuthTag()]);

// Biçim: "SNM1" | iterasyon (uint32 BE) | salt(16) | iv(12) | şifreli veri + etiket
const header = Buffer.alloc(8);
header.write("SNM1", 0, "ascii");
header.writeUInt32BE(PBKDF2_ITERATIONS, 4);
const payload = Buffer.concat([header, salt, iv, encrypted]);

// ---------- dist ----------
fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });

const dataVersion = crypto.createHash("sha256").update(payload).digest("hex").slice(0, 10);
const sourceHash = crypto.createHash("sha256").update(payload);
function addSourceFiles(directory, prefix = "") {
  for (const name of fs.readdirSync(directory).sort()) {
    const fullPath = path.join(directory, name);
    const relativePath = path.posix.join(prefix, name);
    if (fs.statSync(fullPath).isDirectory()) addSourceFiles(fullPath, relativePath);
    else sourceHash.update(relativePath).update("\0").update(fs.readFileSync(fullPath));
  }
}
addSourceFiles(srcDir);
const appVersion = sourceHash.digest("hex").slice(0, 10);
const dataFile = `data.${dataVersion}.bin`;
const appModuleGraph = discoverLocalModuleGraph(srcDir, "app.js");
const offlineCore = [...new Set([
  "./",
  "index.html",
  `base.css?v=${appVersion}`,
  `presentation.css?v=${appVersion}`,
  `app.js?v=${appVersion}`,
  ...appModuleGraph.requests,
  dataFile,
  "icon.svg",
  "manifest.webmanifest",
  "assets/karagoz-types.png",
  "assets/ogulla-bulusma-tren.png",
  "assets/theme4-p305-option-1.png",
  "assets/theme4-p305-option-2.png",
  "assets/theme4-p305-option-3.png",
  "assets/theme4-p305-option-4.png",
  "assets/fonts/InterVariable.woff2"
])];
fs.writeFileSync(path.join(distDir, dataFile), payload);

function copyRuntimeFiles(directory, relativeDirectory = "") {
  for (const name of fs.readdirSync(directory).sort()) {
    const source = path.join(directory, name);
    const relative = path.posix.join(relativeDirectory, name);
    if (fs.statSync(source).isDirectory()) {
      if (relative === "assets") continue;
      copyRuntimeFiles(source, relative);
      continue;
    }
    let text = fs.readFileSync(source, "utf8");
    text = text.replaceAll("__DATA_FILE__", dataFile).replaceAll("__BUILD_VERSION__", appVersion);
    if (relative === "sw.js") text = text.replace("__CORE__", JSON.stringify(offlineCore));
    const target = path.join(distDir, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, text);
  }
}
copyRuntimeFiles(srcDir);
fs.cpSync(path.join(srcDir, "assets"), path.join(distDir, "assets"), { recursive: true });

fs.writeFileSync(path.join(distDir, "robots.txt"), "User-agent: *\nDisallow: /\n");

console.log(
  `[sunum-web] Tamam: ${catalog.lessons.length} ders, ${stepCount} adım → dist/ (${(payload.length / 1024).toFixed(0)} KB şifreli veri)`
);
