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
      "SUNUM_SIFRE ortam değişkeni tanımlı değil. Netlify > Site configuration > Environment variables bölümünden SUNUM_SIFRE ekleyin."
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

function slimStep(step) {
  const answer = step.answer
    ? pick(step.answer, [
        "entry_type",
        "question_no",
        "answer",
        "answer_sections",
        "guidance",
        "explanation",
        "evidence_quotes",
        "dictionary_terms"
      ])
    : null;
  const content = step.content ? pick(step.content, ["lead", "items", "sections"]) : null;

  // Kumandayla açılacak katmanlar: kanonik reveal_order sırası, öğretmen notu hariç,
  // yalnız gerçekten içeriği olan katmanlar.
  const has = {
    guidance: Boolean(answer?.guidance),
    answer: Boolean(answer?.answer || answer?.answer_sections),
    evidence: Boolean(answer?.evidence_quotes?.length),
    explanation: Boolean(answer?.explanation)
  };
  const reveals = (step.reveal_order || []).filter((k) => has[k]);

  return {
    id: step.id,
    layout: step.layout,
    prompt: step.display_prompt,
    page: step.source?.printed_page_range ?? "",
    heading: step.source?.book_heading ?? "",
    task: step.source?.task_type ?? "",
    reveals,
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
    steps: lesson.steps.map(slimStep)
  }))
};

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

const version = crypto.createHash("sha256").update(payload).digest("hex").slice(0, 10);
const dataFile = `data.${version}.bin`;
fs.writeFileSync(path.join(distDir, dataFile), payload);

for (const name of fs.readdirSync(srcDir)) {
  let text = fs.readFileSync(path.join(srcDir, name), "utf8");
  text = text.replaceAll("__DATA_FILE__", dataFile).replaceAll("__BUILD_VERSION__", version);
  fs.writeFileSync(path.join(distDir, name), text);
}

fs.writeFileSync(path.join(distDir, "robots.txt"), "User-agent: *\nDisallow: /\n");

console.log(
  `[sunum-web] Tamam: ${catalog.lessons.length} ders, ${stepCount} adım → dist/ (${(payload.length / 1024).toFixed(0)} KB şifreli veri)`
);
