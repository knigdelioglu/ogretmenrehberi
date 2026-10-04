// Ders Sunumu — bağımlılıksız sunum oynatıcı
// Veri: şifreli ders kataloğu (__DATA_FILE__), build sırasında kanonik veriden üretilir.
import { answerEvidenceStages, attachVocabularyAnswerFragments, evidenceContinuationPages, groupItems, interleaveStages } from "./reveal-sequence.js";
import { splitAtSentences } from "./text-chunks.js";
import { createLessonPptx, pptxFilename } from "./pptx-export.js";

const DATA_FILE = "__DATA_FILE__";
const BUILD = "__BUILD_VERSION__";
const LS = {
  password: "sunum.pw",
  position: "sunum.position",
  theme: "sunum.theme",
  guideOnRemote: "sunum.guideOnRemote"
};

const $ = (sel) => document.querySelector(sel);

const storage = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* özel pencere vb. */
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* yok say */
    }
  }
};

// ============================================================
// Veri çözme
// ============================================================

let encryptedPayload = null;

async function fetchPayload() {
  if (encryptedPayload) return encryptedPayload;
  const res = await fetch(DATA_FILE, { cache: "no-cache" });
  if (!res.ok) throw new Error(`Veri indirilemedi (${res.status})`);
  encryptedPayload = new Uint8Array(await res.arrayBuffer());
  return encryptedPayload;
}

class WrongPassword extends Error {}

async function decryptCatalog(password) {
  if (!window.crypto?.subtle) {
    throw new Error("Bu tarayıcı şifre çözmeyi desteklemiyor (HTTPS gerekir).");
  }
  const bytes = await fetchPayload();
  const magic = new TextDecoder().decode(bytes.slice(0, 4));
  if (magic !== "SNM1") throw new Error("Veri dosyası tanınmadı.");
  const iterations = new DataView(bytes.buffer, bytes.byteOffset + 4, 4).getUint32(0);
  const salt = bytes.slice(8, 24);
  const iv = bytes.slice(24, 36);
  const body = bytes.slice(36);

  const baseKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );

  let gz;
  try {
    gz = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, body);
  } catch {
    throw new WrongPassword("Şifre yanlış.");
  }

  if (!("DecompressionStream" in window)) {
    throw new Error("Tarayıcı çok eski: DecompressionStream desteklenmiyor.");
  }
  const stream = new Blob([gz]).stream().pipeThrough(new DecompressionStream("gzip"));
  const text = await new Response(stream).text();
  return JSON.parse(text);
}

// ============================================================
// Durum
// ============================================================

const state = {
  catalog: null,
  lesson: 0, // ders indeksi
  slide: 0, // 0 = kapak, 1..n = adımlar, n+1 = bitiş
  reveal: 0, // açılmış katman sayısı
  part: 0, // geçerli içerik/cevap parçası
  direction: 1,
  fresh: null, // son açılan katman (animasyon için)
  blank: null, // null | "black" | "white"
  menuTheme: null,
  extras: new Set(), // kumanda sırası dışında elle açılan katmanlar (yönlendirme / açıklama)
  extraReturn: null,
  revealedVocabularyTerms: new Set(),
  guideOnRemote: false // true: kumanda yönlendirme ve açıklamayı da sırayla açar
};
let exportingPptx = false;
let exportStatusTimer = 0;

// Yönlendirme ve açıklama öğretmene dönük olduğundan varsayılan olarak kumanda sırasına girmez;
// Y / A tuşlarıyla elle açılır. Menüdeki ayarla kumanda sırasına eklenebilir.
const STUDENT_LAYERS = new Set(["thinking", "answer", "evidence", "dictionary"]);
function activeReveals(step) {
  if (!step) return [];
  if (isWordWallStep(step)) return [];
  return state.guideOnRemote ? step.reveals : step.reveals.filter((k) => STUDENT_LAYERS.has(k));
}

function isWordWallStep(step) {
  return currentLesson().slug === "karagoz" && step?.id === "s25-q1";
}

const lessons = () => state.catalog.lessons;
const currentLesson = () => lessons()[state.lesson];
const stepCount = (lesson = currentLesson()) => lesson.steps.length;
const currentStep = () => {
  const n = state.slide;
  const lesson = currentLesson();
  return n >= 1 && n <= lesson.steps.length ? lesson.steps[n - 1] : null;
};

function clampPosition() {
  state.lesson = Math.min(Math.max(0, state.lesson), lessons().length - 1);
  state.slide = Math.min(Math.max(0, state.slide), stepCount() + 1);
  const step = currentStep();
  state.reveal = step ? Math.min(Math.max(0, state.reveal), activeReveals(step).length) : 0;
  const key = state.extras.size
    ? [...state.extras].at(-1)
    : state.reveal > 0
      ? activeReveals(step)[state.reveal - 1]
      : "content";
  state.part = step
    ? Math.min(Math.max(0, state.part), Math.max(0, layerPages(step, key).length - 1))
    : 0;
}

// ============================================================
// Gezinme
// ============================================================

// Taşan uzun içerikte kumanda önce sayfayı kaydırır
function scrollBody(direction) {
  const body = $("#canvas .slide__body");
  if (!body || !body.classList.contains("is-overflowing")) return false;
  const max = body.scrollHeight - body.clientHeight;
  if (direction > 0 && body.scrollTop < max - 4) {
    body.scrollBy({ top: body.clientHeight * 0.8, behavior: "smooth" });
    return true;
  }
  if (direction < 0 && body.scrollTop > 4) {
    body.scrollBy({ top: -body.clientHeight * 0.8, behavior: "smooth" });
    return true;
  }
  return false;
}

function next({ skipReveals = false } = {}) {
  const step = currentStep();
  const reveals = activeReveals(step);
  if (!skipReveals && scrollBody(1)) return;
  if (step && !skipReveals) {
    if (state.extras.size) {
      state.extras.clear();
      state.part = state.extraReturn ?? 0;
      state.extraReturn = null;
    }
    const key = state.reveal > 0 ? reveals[state.reveal - 1] : "content";
    if (state.part < layerPages(step, key).length - 1) {
      state.part += 1;
      state.fresh = null;
      render({ newSlide: false });
      return;
    }
    if (state.reveal < reveals.length) {
      state.reveal += 1;
      state.part = 0;
      state.fresh = reveals[state.reveal - 1];
      render({ newSlide: false });
      return;
    }
  }
  if (state.slide <= stepCount()) {
    goto(state.lesson, state.slide + 1, 0, 1);
  } else if (state.lesson < lessons().length - 1) {
    goto(state.lesson + 1, 0, 0, 1);
  } else {
    bump();
  }
}

function prev({ skipReveals = false } = {}) {
  const step = currentStep();
  if (!skipReveals && scrollBody(-1)) return;
  if (step && !skipReveals) {
    if (state.extras.size) {
      state.extras.clear();
      state.part = state.extraReturn ?? 0;
      state.extraReturn = null;
      render({ newSlide: false });
      return;
    }
    if (state.part > 0) {
      state.part -= 1;
      state.fresh = null;
      render({ newSlide: false });
      return;
    }
    if (state.reveal > 0) {
      state.reveal -= 1;
      const previousKey = state.reveal > 0 ? activeReveals(step)[state.reveal - 1] : "content";
      state.part = layerPages(step, previousKey).length - 1;
      state.fresh = null;
      render({ newSlide: false });
      return;
    }
  }
  if (state.slide > 0) {
    const target = state.slide - 1;
    const lesson = currentLesson();
    const previousStep = target >= 1 ? lesson.steps[target - 1] : null;
    const reveals = !skipReveals && previousStep ? activeReveals(previousStep).length : 0;
    const previousKey = reveals > 0 ? activeReveals(previousStep)[reveals - 1] : "content";
    const part = previousStep ? layerPages(previousStep, previousKey).length - 1 : 0;
    goto(state.lesson, target, reveals, -1, part);
  } else if (state.lesson > 0) {
    const prevLesson = lessons()[state.lesson - 1];
    goto(state.lesson - 1, prevLesson.steps.length + 1, 0, -1);
  } else {
    bump();
  }
}

function goto(lesson, slide, reveal = 0, direction = 1, part = 0) {
  state.lesson = lesson;
  state.slide = slide;
  state.reveal = reveal;
  state.part = part;
  state.direction = direction;
  state.fresh = null;
  state.extras = new Set();
  state.extraReturn = null;
  state.revealedVocabularyTerms = new Set();
  clampPosition();
  render({ newSlide: true });
}

function toggleExtra(key) {
  const step = currentStep();
  if (!step || !step.reveals.includes(key)) {
    bump();
    return;
  }
  if (state.extras.has(key)) {
    state.extras.clear();
    state.part = state.extraReturn ?? 0;
    state.extraReturn = null;
    state.fresh = null;
  } else {
    state.extraReturn = state.extras.size ? state.extraReturn : state.part;
    state.extras = new Set([key]);
    state.part = 0;
    state.fresh = key;
  }
  clampPosition();
  render({ newSlide: false });
}

function bump() {
  const canvas = $("#canvas");
  canvas.animate(
    [{ transform: canvas.style.transform }, { transform: canvas.style.transform + " translateX(-10px)" }, { transform: canvas.style.transform }],
    { duration: 180 }
  );
}

// ============================================================
// Konum kaydı (URL + localStorage)
// ============================================================

function savePosition() {
  const lesson = currentLesson();
  const savedPart = state.extras.size ? (state.extraReturn ?? 0) : state.part;
  const position = `${state.slide}${state.reveal || savedPart ? `/${state.reveal}` : ""}${savedPart ? `/${savedPart}` : ""}`;
  const hash = `#/${lesson.slug}/${position}`;
  if (location.hash !== hash) history.replaceState(null, "", hash);
  storage.set(
    LS.position,
    JSON.stringify({ slug: lesson.slug, slide: state.slide, reveal: state.reveal, part: savedPart })
  );
}

function restorePosition() {
  state.revealedVocabularyTerms = new Set();
  const fromHash = /^#\/([^/]+)(?:\/(\d+))?(?:\/(\d+))?(?:\/(\d+))?/.exec(location.hash);
  let saved = null;
  if (fromHash) {
    saved = {
      slug: decodeURIComponent(fromHash[1]),
      slide: Number(fromHash[2] || 0),
      reveal: Number(fromHash[3] || 0),
      part: Number(fromHash[4] || 0)
    };
  } else {
    try {
      saved = JSON.parse(storage.get(LS.position) || "null");
    } catch {
      saved = null;
    }
  }
  if (saved) {
    const idx = lessons().findIndex((l) => l.slug === saved.slug || l.id === saved.slug);
    if (idx >= 0) {
      state.lesson = idx;
      state.slide = saved.slide || 0;
      state.reveal = 0;
      state.part = 0;
    }
  }
  clampPosition();
}

// ============================================================
// Görünüm yardımcıları
// ============================================================

function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v === null || v === undefined) continue;
    if (k === "class") el.className = v;
    else if (k === "html") el.innerHTML = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

const ICONS = {
  guidance:
    '<svg viewBox="0 0 24 24"><path d="M9 18h6M10 21h4"/><path d="M8.3 14.8A6 6 0 1 1 15.7 14.8c-.9.7-1.4 1.4-1.5 2.2h-4.4c-.1-.8-.6-1.5-1.5-2.2Z"/></svg>',
  thinking:
    '<svg viewBox="0 0 24 24"><path d="M9 18h6M10 21h4"/><path d="M8.3 14.8A6 6 0 1 1 15.7 14.8c-.9.7-1.4 1.4-1.5 2.2h-4.4c-.1-.8-.6-1.5-1.5-2.2Z"/></svg>',
  answer: '<svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>',
  evidence:
    '<svg viewBox="0 0 24 24"><path d="M7 7h4v4c0 3-1.5 5-4 6M15 7h4v4c0 3-1.5 5-4 6"/></svg>',
  explanation:
    '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/></svg>'
};

const TASK_LABELS = {
  QUESTION: "Soru",
  TABLE: "Çalışma",
  PROCESS: "Süreç",
  REFERENCE: "Bilgi",
  ACTIVITY: "Etkinlik",
  PERFORMANCE: "Uygulama",
  ASSESSMENT: "Değerlendirme",
  VOCABULARY: "Söz varlığı",
  COMPARISON: "Karşılaştırma"
};

function taskLabel(step, themeId) {
  const base = TASK_LABELS[step.task] ?? step.task.replaceAll("_", " ").toLocaleLowerCase("tr");
  if (step.answer?.entry_type === "performance_support") return "Uygulama";
  if (step.answer?.entry_type === "source_limited" && themeId !== "TEMA_04" && themeId !== "TEMA_02") return `${base} · kaynak sınırlı`;
  return base;
}

function answerLabel(step, themeId) {
  if (step.answer?.entry_type === "performance_support") return "Uygulama desteği";
  if (step.answer?.entry_type === "source_limited") {
    if (themeId === "TEMA_04") return "Yönerge";
    if (themeId === "TEMA_02") return "Cevap";
    return "Doğrulanabilen çerçeve";
  }
  return "Cevap";
}

function questionNo(no) {
  if (!no) return null;
  const label = String(no).trim();
  return /^\d/.test(label) ? `${label}. soru` : label;
}

const humanKey = (key) => key.replaceAll("_", " ");

function renderValue(value) {
  if (Array.isArray(value)) {
    if (value.every((v) => typeof v !== "object" || v === null)) {
      return h("ul", { class: "list" }, value.map((v) => h("li", {}, String(v))));
    }
    return h("div", { class: "stack" }, value.map(renderValue));
  }
  if (value && typeof value === "object") {
    return h(
      "dl",
      { class: "kv" },
      Object.entries(value).map(([k, v]) => [h("dt", {}, humanKey(k)), h("dd", {}, renderValue(v))])
    );
  }
  return h("p", {}, String(value ?? ""));
}

const HIDDEN_VALUE = () => h("p", { class: "is-hidden-value" }, "• • •");

function renderSections(sections, sectionsLayout = "grid", { hideValues = false } = {}) {
  if (!sections) return null;
  if (Array.isArray(sections)) {
    return h("div", { class: "sections", style: "--cols:1" }, h("div", { class: "sec" }, hideValues ? HIDDEN_VALUE() : renderValue(sections)));
  }
  const entries = Object.entries(sections);
  if (!entries.length) return null;
  const isLetter = sectionsLayout === "letter";
  const renderLetter = (value) => {
    const paragraphs = String(value ?? "").split(/\n\s*\n/).filter(Boolean);
    return h("div", { class: "letter" }, paragraphs.map((paragraph, index) => {
      let kind = "letter__body";
      if (index === 0) kind = "letter__date";
      else if (index === 1) kind = "letter__salutation";
      else if (index === paragraphs.length - 2) kind = "letter__closing";
      else if (index === paragraphs.length - 1) kind = "letter__signature";
      return h("p", { class: kind }, paragraph);
    }));
  };
  return h(
    "div",
    {
      class: `sections${sectionsLayout === "stacked" || isLetter ? " sections--stacked" : ""}`,
      style: `--cols:${sectionsLayout === "stacked" || isLetter ? 1 : Math.min(sectionsLayout === "two-column" ? 2 : columnsFor(entries.length), entries.length)}`
    },
    entries.map(([k, v]) => h(
      "article",
      { class: `sec${isLetter && k === "Örnek Mektup" ? " sec--letter" : ""}` },
      h("h3", {}, humanKey(k)),
      hideValues ? HIDDEN_VALUE() : isLetter && k === "Örnek Mektup" ? renderLetter(v) : renderValue(v)
    ))
  );
}

function textWeight(value) {
  if (typeof value === "string") return value.length;
  if (Array.isArray(value)) return value.reduce((total, item) => total + textWeight(item), 0);
  if (value && typeof value === "object") {
    return Object.entries(value).reduce((total, [key, item]) => total + key.length + textWeight(item), 0);
  }
  return String(value ?? "").length;
}

// Sunum parçalarının karakter bütçesi. Ölçeklendirme sonucu ekranda gerçekten
// sığıp sığmadığı ölçülür (calibrate); sığmayan katman daha küçük bütçeyle yeniden bölünür.
const BUDGET_STEPS = [1, 0.8, 0.64, 0.5, 0.4, 0.32, 0.25, 0.2];
const PPTX_LAYOUT_BUDGET = 0.8;
const budgetCache = new Map();
let calibrating = false;
let viewOverride = null;

function budgetKey(step, key) {
  return `${state.lesson}:${step.id}:${key}`;
}

function resetBudgets() {
  budgetCache.clear();
}

function scaledItems(maxItems, b) {
  return Math.max(1, Math.ceil(maxItems * b));
}

function chunkByBudget(values, { maxItems = 3, maxChars = 950 } = {}) {
  const pages = [];
  let current = [];
  let currentChars = 0;
  let start = 0;
  values.forEach((value, index) => {
    const weight = textWeight(value);
    if (current.length && (current.length >= maxItems || currentChars + weight > maxChars)) {
      pages.push({ values: current, start });
      current = [];
      currentChars = 0;
      start = index;
    }
    current.push(value);
    currentChars += weight;
  });
  if (current.length) pages.push({ values: current, start });
  return pages;
}

// Aynı sayıda sayfayı koruyarak maddeleri sayfalara dengeli dağıtır (ör. 4+1 yerine 3+2).
function balancedChunks(values, options) {
  const groups = chunkByBudget(values, options);
  if (groups.length < 2) return groups;
  const size = Math.ceil(values.length / groups.length);
  const balanced = [];
  for (let start = 0; start < values.length; start += size) {
    balanced.push({ values: values.slice(start, start + size), start });
  }
  const fits = balanced.length === groups.length &&
    balanced.every((group) => textWeight(group.values) <= options.maxChars);
  return fits ? balanced : groups;
}

// Tek başına bütçeyi aşan bir başlığı (uzun liste / alt başlıklar / uzun metin) parçalara böler.
function splitEntry([key, value], maxChars) {
  if (key.length + textWeight(value) <= maxChars) return [[key, value]];
  const label = (index) => (index === 0 ? key : index === 1 ? `${key} (devam)` : `${key} (devam ${index})`);
  if (Array.isArray(value)) {
    const groups = chunkByBudget(value, { maxItems: Infinity, maxChars });
    if (groups.length > 1) return groups.map((group, index) => [label(index), group.values]);
  } else if (value && typeof value === "object") {
    const groups = chunkByBudget(Object.entries(value), { maxItems: Infinity, maxChars });
    if (groups.length > 1) return groups.map((group, index) => [label(index), Object.fromEntries(group.values)]);
  } else if (typeof value === "string") {
    const parts = splitAtSentences(value, maxChars);
    if (parts.length > 1) return parts.map((part, index) => [label(index), part]);
  }
  return [[key, value]];
}

function sectionPages(sections, step, b = 1) {
  if (!sections) return [];
  if (Array.isArray(sections)) {
    return chunkByBudget(sections, { maxItems: scaledItems(5, b), maxChars: 900 * b }).map((group) => ({
      sections: group.values
    }));
  }
  const omit = new Set(step.presentation?.omit_sections || []);
  const maxChars = 1050 * b;
  const entries = Object.entries(sections)
    .filter(([key]) => !omit.has(key))
    .flatMap((entry) => splitEntry(entry, maxChars));
  return sectionPagesFromEntries(entries, step, b);
}

function sectionPagesFromEntries(entries, step, b = 1) {
  const maxChars = 1050 * b;
  const single = step.sections_layout === "stacked" || step.sections_layout === "letter";
  const groups = chunkByBudget(entries, {
    maxItems: single ? 1 : scaledItems(2, b),
    maxChars
  });
  return groups.map((group) => ({ sections: Object.fromEntries(group.values) }));
}

function vocabularyPages(step, b = 1) {
  const entries = orderedAnswerEntries(step);
  if (!entries.length) return [{ terms: [] }];
  const groupSize = interleaveConfig(step)?.source === "answer_sections"
    ? interleaveConfig(step).group_size
    : 3;
  return chunkByBudget(entries, { maxItems: groupSize, maxChars: Infinity }).map((group) => ({
    terms: group.values,
    title: "Söz varlığı"
  }));
}

const presentationOf = (step) => step.presentation || {};
const interleaveConfig = (step) => {
  const value = presentationOf(step).interleave;
  if (value === true) return { source: "answer_sections", group_size: step.layout === "vocabulary" ? 3 : 2 };
  return value && typeof value === "object" ? value : null;
};
const interleaves = (step) => interleaveConfig(step)?.source === "answer_sections" && Boolean(step.answer?.answer_sections);

function orderedAnswerEntries(step) {
  const sections = step.answer?.answer_sections;
  if (!sections || Array.isArray(sections)) return [];
  const omit = new Set(step.presentation?.omit_sections || []);
  const webUnits = step.presentation?.web?.units;
  const responseKeys = webUnits
    ? new Set(webUnits.flatMap((unit) => unit.section_keys ?? []))
    : null;
  const evidenceKeys = new Set(webUnits?.flatMap((unit) =>
    (unit.evidence_sections ?? []).map((entry) => entry.section_key)
  ) ?? []);
  const entries = Object.entries(sections).filter(([key]) =>
    !omit.has(key) && !evidenceKeys.has(key) && (!responseKeys || responseKeys.has(key))
  );
  const order = interleaveConfig(step)?.order;
  if (!Array.isArray(order) || !order.length) return entries;
  const byKey = new Map(entries);
  const selected = order.filter((key) => byKey.has(key)).map((key) => [key, byKey.get(key)]);
  const selectedKeys = new Set(selected.map(([key]) => key));
  return [...selected, ...entries.filter(([key]) => !selectedKeys.has(key))];
}

function webAnswerLayerPages(step, b = 1) {
  const answer = step.answer || {};
  const web = step.presentation.web;
  const sections = answer.answer_sections;
  const pagesByUnit = new Map();
  const pages = [];
  const maxChars = 1050 * b;
  const fragmentsByUnit = new Map(web.units.map((unit) => [unit.id, { start: [], end: [] }]));
  for (const fragment of web.answer_text.fragments ?? []) {
    fragmentsByUnit.get(fragment.unit)?.[fragment.position ?? "start"].push(fragment.text);
  }

  for (const unit of web.units) {
    let unitPages = [];
    const unitFragments = fragmentsByUnit.get(unit.id) ?? { start: [], end: [] };
    const selectedFragments = [...unitFragments.start, ...unitFragments.end];
    if (unit.section_keys?.length && sections && !Array.isArray(sections)) {
      const entries = unit.section_keys.flatMap((key) => splitEntry([key, sections[key]], maxChars));
      unitPages = chunkByBudget(entries, {
        maxItems: Math.max(1, entries.length),
        maxChars
      }).map((group) => ({ sections: Object.fromEntries(group.values) }));
    } else if (unit.array_indices?.length && Array.isArray(sections)) {
      unitPages = [{ sections: unit.array_indices.map((index) => sections[index]) }];
    } else if (selectedFragments.length || unit.id === "answer") {
      const text = selectedFragments.length ? selectedFragments.join("\n") : String(answer.answer || "");
      unitPages = splitAtSentences(text, 760 * b).map((answerText) => ({ sections: null, answerText }));
    }

    if (!unitPages.length) unitPages = [{ sections: null }];
    if (unit.section_keys?.length || unit.array_indices?.length) {
      const fragments = unitFragments;
      if (fragments.start.length) {
        unitPages[0].answerText = [fragments.start.join("\n"), unitPages[0].answerText].filter(Boolean).join("\n");
      }
      if (fragments.end.length) {
        const last = unitPages.length - 1;
        unitPages[last].answerText = [unitPages[last].answerText, fragments.end.join("\n")].filter(Boolean).join("\n");
      }
    }
    unitPages = unitPages.map((page, index) => ({
      ...page,
      title: "Cevap",
      unitId: unit.id,
      pageId: `${unit.id}:answer:${index + 1}`
    }));
    pagesByUnit.set(unit.id, unitPages);
  }

  const appendEvidenceStage = (unit) => {
    const answerPages = pagesByUnit.get(unit.id) || [];
    const inlineQuoteIndexes = new Set(unit.inline_quote_indexes ?? []);
    const quoteValues = unit.quote_indexes
      .filter((index) => !inlineQuoteIndexes.has(index))
      .map((index) => answer.evidence_quotes[index]);
    const evidenceSections = Object.fromEntries((unit.evidence_sections ?? []).map(({ section_key }) =>
      [section_key, sections[section_key]]
    ));
    if (!quoteValues.length && !Object.keys(evidenceSections).length) return;

    const pairedAnswer = answerPages.at(-1) || { sections: null, title: "Cevap", unitId: unit.id };
    const quotePages = chunkByBudget(quoteValues, {
      maxItems: scaledItems(4, b),
      maxChars: 700 * b
    });
    if (!quotePages.length) quotePages.push({ values: [] });
    evidenceContinuationPages(pairedAnswer, evidenceSections, quotePages).forEach((page, index) => pages.push({
      ...page,
      title: "Cevap ve metinden kanıt",
      pageId: `${unit.id}:evidence:${index + 1}`
    }));
  };
  const appendUnitStages = (unit) => {
    pages.push(...(pagesByUnit.get(unit.id) || []));
    appendEvidenceStage(unit);
  };

  const interleave = interleaveConfig(step);
  const interleavesAnswers = interleave?.source === "answer_sections" &&
    sections && !Array.isArray(sections) && web.units.some((unit) => unit.section_keys?.length);
  if (interleavesAnswers) {
    const orderedKeys = orderedAnswerEntries(step).map(([key]) => key);
    const groups = groupItems(orderedKeys, scaledItems(interleave.group_size, b));
    const answerUnits = web.units.filter((unit) => unit.section_keys?.length);
    let merged = true;
    while (merged) {
      merged = false;
      const groupByKey = new Map(groups.flatMap((keys, index) => keys.map((key) => [key, index])));
      for (const unit of answerUnits) {
        const indexes = unit.section_keys.map((key) => groupByKey.get(key)).filter(Number.isInteger);
        if (indexes.length < 2) continue;
        const first = Math.min(...indexes);
        const last = Math.max(...indexes);
        if (first === last) continue;
        groups.splice(first, last - first + 1, groups.slice(first, last + 1).flat());
        merged = true;
        break;
      }
    }
    const unitsByGroup = groups.map((keys) => ({
      keys,
      units: web.units.filter((unit) => unit.section_keys?.some((key) => keys.includes(key)))
    }));
    const assigned = unitsByGroup.flatMap((group) => group.units.map((unit) => unit.id));
    if (assigned.length !== answerUnits.length || new Set(assigned).size !== answerUnits.length ||
      answerUnits.some((unit) => !assigned.includes(unit.id))) {
      throw new Error(`Web answer units do not align with interleave groups: ${step.id}`);
    }
    for (const [index, group] of unitsByGroup.entries()) {
      if (index > 0 && group.keys.length) {
        pages.push({
          preview: Object.fromEntries(group.keys.map((key) => [key, sections[key]])),
          hideValues: true,
          sections: Object.fromEntries(group.keys.map((key) => [key, sections[key]])),
          title: "Görev",
          pageId: `interleave-prompt:${index + 1}`
        });
      }
      group.units.forEach(appendUnitStages);
    }
    web.units.filter((unit) => !unit.section_keys?.length).forEach(appendUnitStages);
  } else {
    for (const { type, unit } of answerEvidenceStages(web.units)) {
      if (type === "answer") pages.push(...(pagesByUnit.get(unit.id) || []));
      else appendEvidenceStage(unit);
    }
  }

  return pages.length ? pages : [{ answerText: String(answer.answer || ""), sections: null, title: "Cevap" }];
}

function answerSectionGroups(step, b = 1) {
  const config = interleaveConfig(step);
  if (config?.source !== "answer_sections") return [];
  // Tema 1–3'te group_size:1, eski answer sayfa bütçesinin (iki bölüm/sayfa)
  // semantiğini temsil eder. Bu uyumluluk yolu, mevcut sunumların tıklama
  // sırasını korurken Tema 4'ün açıkça istenen 2/3/4/5'li gruplarını exact tutar.
  if (config.group_size === 1) {
    const entries = orderedAnswerEntries(step).flatMap((entry) => splitEntry(entry, 1050 * b));
    return sectionPagesFromEntries(entries, step, b).map((page) => Object.entries(page.sections));
  }
  return groupItems(orderedAnswerEntries(step), scaledItems(config.group_size, b));
}

function interleavedAnswerSectionPages(step, b = 1) {
  return interleaveStages(answerSectionGroups(step, b)).flatMap(({ group, stage }) =>
    sectionPagesFromEntries(group, step, b).map((page) => ({
      answerText: "",
      title: stage === "prompt" ? "Görev" : "Cevap",
      hideValues: stage === "prompt",
      ...page
    }))
  );
}

function interleavedDictionaryGroups(step, b = 1) {
  const config = interleaveConfig(step);
  let terms = dictionaryTerms(step);
  if (config?.source !== "dictionary_terms") return dictionaryPages(step, b);
  if (config.order) {
    const byTerm = new Map(terms.map((entry) => [entry.term, entry]));
    terms = config.order.map((term) => byTerm.get(term)).filter(Boolean);
  }
  return groupItems(terms, config.group_size)
    .map((group) => ({ dictionary: group, title: "Sözlük" }));
}

function contentSources(content) {
  return content.sources?.length ? h("nav", { class: "source-links", "aria-label": "Kaynaklar" },
    content.sources.map((source) => {
      const isDownload = source.download === true &&
        /^assets\/assessment-documents\/[A-Za-z0-9._-]+\.docx$/i.test(source.url ?? "");
      return h("a", isDownload
        ? { href: source.url, download: "", class: "source-download" }
        : { href: source.url, target: "_blank", rel: "noopener noreferrer" }, source.label);
    })
  ) : null;
}

function contentLayerPages(step, b = 1) {
  const content = step.content || {};
  const lead = content.lead && content.lead !== step.prompt ? content.lead : "";
  const meta = (page, index) => ({
    ...page,
    lead: index === 0 ? lead : "",
    images: content.images,
    sources: index === 0 ? content.sources : undefined
  });
  if (interleaveConfig(step)?.source === "dictionary_terms") {
    const first = interleavedDictionaryGroups(step, b)[0];
    return [meta(first ? { ...first, hideMeanings: true } : { content: {} })];
  }
  if (step.layout === "vocabulary") {
    const groups = vocabularyPages(step, b);
    // Aşamalı açılmada yalnız ilk kelime grubu görev ekranında görünür.
    return (interleaves(step) ? groups.slice(0, 1) : groups).map(meta);
  }
  const pages = [];
  const maxChars = (step.density === "compact" ? 850 : 1050) * b;
  const interleaveGroupSize = interleaveConfig(step)?.source === "answer_sections"
    ? scaledItems(interleaveConfig(step).group_size, b)
    : null;
  if (content.items?.length) {
    const items = interleaveGroupSize ? content.items.slice(0, interleaveGroupSize) : content.items;
    for (const group of balancedChunks(items, {
      maxItems: interleaveGroupSize ?? scaledItems(content.scale ? 6 : 4, b),
      maxChars
    })) {
      pages.push({ content: { items: group.values, scale: content.scale }, itemOffset: (content.item_offset || 0) + group.start });
    }
  }
  if (content.sections?.length) {
    const sections = interleaveGroupSize ? content.sections.slice(0, interleaveGroupSize) : content.sections;
    for (const group of chunkByBudget(sections, {
      maxItems: interleaveGroupSize ?? scaledItems(2, b),
      maxChars
    })) {
      pages.push({ content: { sections: group.values }, title: "Görev" });
    }
  }
  if (interleaves(step) && !content.items?.length && !content.sections?.length) {
    // Değerlendirilecek ilk madde grubu cevapsız olarak görev ekranında gösterilir.
    const first = answerSectionGroups(step, b)[0];
    if (first?.length) pages.push({ content: {}, preview: Object.fromEntries(first) });
  }
  if (!step.reveals.includes("dictionary")) pages.push(...dictionaryPages(step, b));
  if (!pages.length) pages.push({ content: {} });
  return pages.map(meta);
}

function answerLayerPages(step, b = 1) {
  const answer = step.answer || {};
  const pres = presentationOf(step);
  if (pres.web) return webAnswerLayerPages(step, b);
  const textAtEnd = pres.answer_text === "end";
  const answerText = String(answer.answer || "");
  const vocabularyAnswerText = pres.web_answer_text;
  const textPages = !vocabularyAnswerText && answerText
    ? splitAtSentences(answerText, 760 * b).map((text) => ({ answerText: text, sections: null, title: "Cevap" }))
    : [];
  if (step.layout === "vocabulary") {
    const groups = vocabularyPages(step, b);
    const termPages = attachVocabularyAnswerFragments(interleaves(step)
      ? interleaveStages(groups).map(({ group, stage }) => ({ ...group, hidden: stage === "prompt" }))
      : groups, vocabularyAnswerText);
    return [
      ...(!vocabularyAnswerText && !textAtEnd ? textPages : []),
      ...termPages,
      ...(!vocabularyAnswerText && textAtEnd ? textPages : []),
      ...dictionaryPages(step, b)
    ];
  }
  const sections = sectionPagesFromEntries(orderedAnswerEntries(step), step, b);
  let pages;
  if (interleaves(step) || (textAtEnd && sections.length)) {
    const sectionViews = interleaves(step)
      ? interleavedAnswerSectionPages(step, b)
      : sections.map((group) => ({ answerText: "", title: "Cevap", ...group }));
    pages = textAtEnd ? [...sectionViews, ...textPages] : [...textPages, ...sectionViews];
  } else {
    // Küçük bütçede (dar ekran) özet metin ilk bölümle aynı parçaya sıkıştırılmaz.
    const separateText = sections.length > 0 && (b <= 0.64 || answerText.length > 600 * b);
    if (separateText) {
      pages = [...textPages, ...sections.map((page) => ({ answerText: "", title: "Cevap", ...page }))];
    } else if (sections.length) {
      pages = sections.map((page, index) => ({
        answerText: index === 0 ? answerText : "",
        title: "Cevap",
        ...page
      }));
    } else {
      pages = textPages.length ? textPages : [{ answerText: "", sections: null, title: "Cevap" }];
    }
  }
  if (!pages.length) pages = [{ answerText: "", sections: null, title: "Cevap" }];
  if (step.task === "VOCABULARY") pages.push(...dictionaryPages(step, b));
  return pages;
}

function buildLayerPages(step, key, b) {
  if (!key || key === "content") return contentLayerPages(step, b);
  if (key === "answer") return answerLayerPages(step, b);
  if (key === "dictionary") {
    const groups = interleavedDictionaryGroups(step, b);
    if (interleaveConfig(step)?.source === "dictionary_terms") {
      return interleaveStages(groups).map(({ group, stage }) => ({
        ...group,
        hideMeanings: stage === "prompt"
      }));
    }
    return dictionaryPages(step, b);
  }
  if (key === "evidence") {
    const quotes = step.answer?.evidence_quotes || [];
    return chunkByBudget(quotes, { maxItems: scaledItems(2, b), maxChars: 650 * b }).map((group) => ({
      quotes: group.values,
      title: "Metinden kanıt"
    }));
  }
  if (key === "thinking" && step.thinking) {
    return [{ text: step.thinking, title: "Düşünürken…" }];
  }
  if (key === "guidance" || key === "explanation") {
    const value = String(step.answer?.[key] || "");
    return splitAtSentences(value, 900 * b).map((text) => ({
      text,
      title: key === "guidance" ? "Yönlendirme" : "Açıklama"
    }));
  }
  return [{}];
}

// Gizli bir ölçüm tuvalinde her parçayı çizer; en az yazı ölçeğinde bile taşan
// parça kalmayana kadar bütçeyi küçültür. Sonuç ders/adım/katman için önbelleğe alınır.
function measureHost() {
  let host = document.getElementById("measure-canvas");
  if (!host) {
    host = h("div", {
      id: "measure-canvas",
      class: "canvas",
      "aria-hidden": "true",
      style: "position:fixed;left:-40000px;top:0;transform:none;visibility:hidden;pointer-events:none"
    });
    document.body.append(host);
  }
  return host;
}

function pageFits(step, key, pages, index) {
  const host = measureHost();
  viewOverride = { key, pages, page: pages[index] || {}, index };
  try {
    const slide = stepSlide(currentLesson(), step);
    host.replaceChildren(slide);
    const body = slide.querySelector(".slide__body");
    fitBody(body, step.density);
    return !body.classList.contains("is-overflowing");
  } finally {
    viewOverride = null;
    host.replaceChildren();
  }
}

function calibrate(step, key) {
  const cacheKey = budgetKey(step, key);
  if (budgetCache.has(cacheKey) || !document.body) return;
  calibrating = true;
  try {
    for (const b of BUDGET_STEPS) {
      budgetCache.set(cacheKey, b);
      const pages = buildLayerPages(step, key, b);
      if (pages.every((_, index) => pageFits(step, key, pages, index))) break;
    }
  } finally {
    calibrating = false;
  }
}

function layerPages(step, key) {
  if (!step) return [];
  const layer = key || "content";
  // Export visits every step and reveal layer. Use one readable layout budget
  // instead of repeating the interactive viewport's multi-pass fit calibration.
  if (exportingPptx) return buildLayerPages(step, layer, PPTX_LAYOUT_BUDGET);
  if (!calibrating) calibrate(step, layer);
  return buildLayerPages(step, layer, budgetCache.get(budgetKey(step, layer)) ?? 1);
}

function currentView(step) {
  if (viewOverride) return viewOverride;
  const active = activeReveals(step);
  const key = state.extras.size
    ? [...state.extras].at(-1)
    : state.reveal > 0
      ? active[state.reveal - 1]
      : "content";
  const pages = layerPages(step, key);
  return { key, pages, page: pages[state.part] || pages[0] || {}, index: state.part };
}

function renderContent(step, content = step.content, itemOffset = 0) {
  if (!content || step.layout === "vocabulary") return null;
  const items = content.items || [];
  const sections = content.sections || [];
  const sectionCards = sections.length
    ? h(
        "div",
        { class: "sections", style: `--cols:${columnsFor(sections.length)}` },
        sections.map((s) => h("article", { class: "sec" }, h("h3", {}, s.title), h("p", {}, s.body)))
      )
    : null;

  let itemsEl = null;
  if (items.length) {
    if (step.layout === "structure") {
      itemsEl = h(
        "div",
        { class: "fields", style: `--cols:${items.length > 6 ? 3 : 2}` },
        items.map((it, i) =>
          h("div", { class: "field" }, h("span", { class: "n" }, String(itemOffset + i + 1).padStart(2, "0")), h("span", {}, it))
        )
      );
    } else if (step.layout === "assessment" && content.scale?.length) {
      // Kitaptaki form düzeni: ölçüt + Evet / Kısmen / Hayır sütunları
      itemsEl = h(
        "div",
        { class: "scale-form", style: `--scale:${content.scale.length}` },
        h("div", { class: "scale-form__head" }, h("span", {}, "Değerlendirme ölçütleri"), content.scale.map((option) => h("span", {}, option))),
        items.map((it, i) =>
          h(
            "div",
            { class: "scale-form__row" },
            h("span", { class: "scale-form__text" }, h("span", { class: "n" }, String(itemOffset + i + 1)), h("span", {}, it)),
            content.scale.map(() => h("span", { class: "scale-form__box", "aria-hidden": "true" }))
          )
        )
      );
    } else if (step.layout === "assessment") {
      itemsEl = h("ul", { class: "criteria" }, items.map((it) => h("li", {}, h("span", {}, it))));
    } else if (step.layout === "comparison" && items.every((it) => it.length <= 48)) {
      itemsEl = h("div", { class: "chips" }, items.map((it) => h("span", {}, it)));
    } else {
      itemsEl = h(
        "ol",
        { class: "steps-list" },
        items.map((it, i) =>
          h("li", {}, h("span", { class: "n" }, String(itemOffset + i + 1)), h("span", {}, it))
        )
      );
    }
  }
  if (!itemsEl && !sectionCards) return null;
  return h("div", { class: "stack" }, itemsEl, sectionCards);
}

function dictionaryTerms(step) {
  const a = step.answer;
  if (!a) return [];
  if (Array.isArray(a.dictionary_terms)) return a.dictionary_terms;
  return [];
}

function dictionaryPages(step, b = 1) {
  return chunkByBudget(dictionaryTerms(step), { maxItems: 4, maxChars: Infinity }).map((group) => ({
    dictionary: group.values,
    title: "Sözlük"
  }));
}

function dictionaryCard(terms, { hideMeanings = false } = {}) {
  return h(
    "aside",
    { class: "dict" },
    h("h2", {}, "Sözlük"),
    h(
      "dl",
      {},
      terms.map((term) => [
        h("dt", {}, term.term),
        h("dd", {}, hideMeanings ? "• • •" : term.meaning),
        term.source && !hideMeanings ? h("dd", { class: "src" }, term.source) : null
      ])
    )
  );
}

function columnsFor(count) {
  if (count <= 1) return 1;
  if (count === 2 || count === 4) return 2;
  return 3;
}

function panel(kind, label, body, fresh) {
  return h(
    "section",
    { class: `panel panel--${kind}${fresh ? " fresh" : ""}` },
    h("div", { class: "panel__label", html: `${ICONS[kind] || ""}<span>${label}</span>` }),
    body
  );
}

// ============================================================
// Slaytlar
// ============================================================

function coverSlide(lesson) {
  const themeName = state.catalog.themes[lesson.theme] || "";
  const themeNo = Number(String(lesson.theme).replace(/\D/g, "")) || "";
  return h(
    "div",
    { class: "slide slide--cover" },
    h("div", { class: "cover__theme" }, `${themeNo}. Tema${themeName ? " · " + themeName : ""}`),
    h("h1", { class: "cover__title" }, lesson.title),
    lesson.subtitle ? h("p", { class: "cover__subtitle" }, lesson.subtitle) : null,
    h(
      "div",
      { class: "cover__meta" },
      h("span", {}, `Ders kitabı s. ${lesson.pages.replace("-", "–")}`),
      h("span", {}, `${lesson.steps.length} slayt`)
    )
  );
}

function endSlide(lesson) {
  const nextLesson = lessons()[state.lesson + 1];
  return h(
    "div",
    { class: "slide slide--cover" },
    h("div", { class: "cover__theme" }, "Ders sonu"),
    h("h1", { class: "cover__title" }, lesson.title),
    nextLesson
      ? h("p", { class: "cover__subtitle" }, `Sıradaki: ${nextLesson.title}`)
      : h("p", { class: "cover__subtitle" }, "Kataloğun son dersi."),
    nextLesson ? h("div", { class: "cover__hint" }, "İleri → sıradaki ders") : null
  );
}

function stepSlide(lesson, step) {
  const active = activeReveals(step);
  const view = currentView(step);
  const viewKey = view.key;
  const page = view.page;
  const a = step.answer;
  const isVocab = step.layout === "vocabulary";
  const fresh = (k) => state.fresh === k;
  const viewNames = {
    content: isVocab ? "Söz varlığı" : "Görev",
    thinking: "Düşünürken…",
    answer: answerLabel(step, lesson.theme),
    evidence: "Metinden kanıt",
    guidance: "Yönlendirme",
    explanation: "Açıklama"
  };
  const pageMarker = view.pages.length > 1 ? ` · ${view.index + 1}/${view.pages.length}` : "";

  // Üst şerit
  const no = questionNo(a?.question_no);
  const top = h(
    "header",
    { class: "slide__top" },
    h("span", { class: "tag" }, taskLabel(step, lesson.theme), no ? h("span", { class: "tag__no" }, no) : null),
    h(
      "span",
      { class: "where", title: `s. ${String(step.page).replace("-", "–")}${step.heading ? ` · ${step.heading}` : ""}${viewKey !== "content" || view.pages.length > 1 ? ` · ${page.title || viewNames[viewKey]}${pageMarker}` : ""}` },
      h("b", {}, `s. ${String(step.page).replace("-", "–")}`),
      step.heading ? `  ·  ${step.heading}` : "",
      viewKey !== "content" || view.pages.length > 1 ? `  ·  ${page.title || viewNames[viewKey]}${pageMarker}` : ""
    )
  );

  // Ana sütun
  const main = h("div", { class: "stack" });
  main.append(h("h1", { class: `prompt${viewKey !== "content" && !isVocab ? " is-small" : ""}` }, step.prompt));

  if (viewKey === "content") {
    if (page.lead) main.append(h("p", { class: "lead" }, page.lead));
    if (isVocab) {
      main.append(
        h(
          "div",
          { class: "vocab" },
          (page.terms || []).map(([term, meaning]) => {
            if (isWordWallStep(step)) {
              const isRevealed = state.revealedVocabularyTerms.has(term);
              return h(
                "button",
                {
                  type: "button",
                  class: "vocab__item vocab__item--interactive",
                  "aria-expanded": String(isRevealed),
                  onclick: () => {
                    if (isRevealed) state.revealedVocabularyTerms.delete(term);
                    else state.revealedVocabularyTerms.add(term);
                    render({ newSlide: false });
                  }
                },
                h("span", { class: "vocab__term" }, term),
                h(
                  "span",
                  { class: `vocab__meaning${isRevealed ? "" : " is-hidden"}` },
                  isRevealed ? String(meaning) : "• • •"
                )
              );
            }
            return h(
              "div",
              { class: "vocab__item" },
              h("div", { class: "vocab__term" }, term),
              h("div", { class: "vocab__meaning is-hidden" }, "• • •")
            );
          })
        )
      );
    } else {
      const content = renderContent(step, page.content || {}, page.itemOffset || 0);
      if (content) main.append(content);
      if (page.preview) main.append(renderSections(page.preview, step.sections_layout, { hideValues: true }));
    }
    if (page.images?.length) main.append(h("div", { class: "content-images" }, page.images.map((image) => h("figure", {},
      h("img", { src: image.src, alt: image.alt, loading: "eager" }),
      image.caption ? h("figcaption", {}, image.caption) : null
    ))));
    if (page.dictionary?.length) main.append(dictionaryCard(page.dictionary, { hideMeanings: page.hideMeanings }));
    const sources = contentSources({ sources: page.sources });
    if (sources) main.append(sources);
  }

  if (viewKey === "answer" && isVocab && page.answerTextBefore) {
    main.append(panel("answer", answerLabel(step, lesson.theme), h("p", {}, page.answerTextBefore), fresh("answer")));
  }
  if (viewKey === "answer" && isVocab && page.terms?.length) {
    main.append(
      h(
        "div",
        { class: `vocab${fresh("answer") ? " fresh" : ""}` },
        (page.terms || []).map(([term, meaning]) =>
          h(
            "div",
            { class: "vocab__item" },
            h("div", { class: "vocab__term" }, term),
            page.hidden
              ? h("div", { class: "vocab__meaning is-hidden" }, "• • •")
              : h("div", { class: "vocab__meaning" }, String(typeof meaning === "string" ? meaning : JSON.stringify(meaning)))
          )
        )
      )
    );
  }
  if (viewKey === "answer" && isVocab && page.answerText) {
    main.append(panel("answer", answerLabel(step, lesson.theme), h("p", {}, page.answerText), fresh("answer")));
  }
  if (viewKey === "answer" && isVocab && page.answerTextAfter) {
    main.append(panel("answer", answerLabel(step, lesson.theme), h("p", {}, page.answerTextAfter), fresh("answer")));
  }
  if (viewKey === "answer" && isVocab && page.dictionary?.length) {
    main.append(dictionaryCard(page.dictionary, { hideMeanings: page.hideMeanings }));
  }

  if (viewKey === "dictionary" && page.dictionary?.length) {
    main.append(dictionaryCard(page.dictionary, { hideMeanings: page.hideMeanings }));
  }

  if (viewKey === "answer" && !isVocab) {
    if (page.hideValues) {
      main.append(renderSections(page.sections, step.sections_layout, { hideValues: true }));
    } else if (page.answerText || page.sections) {
      main.append(
        panel(
          "answer",
          answerLabel(step, lesson.theme),
          [page.answerText ? h("p", {}, page.answerText) : null, renderSections(page.sections, step.sections_layout)],
          fresh("answer")
        )
      );
    }
    if (page.quotes?.length || Object.keys(page.evidenceSections || {}).length) {
      const evidenceBody = [
        Object.keys(page.evidenceSections || {}).length ? renderSections(page.evidenceSections, "stacked") : null,
        page.quotes?.length ? h("div", { class: "quotes" }, page.quotes.map((quote) => h("p", {}, quote))) : null
      ];
      main.append(
        panel("evidence", "Metinden kanıt", evidenceBody)
      );
    }
    if (page.dictionary?.length) main.append(dictionaryCard(page.dictionary));
  } else if (viewKey === "evidence") {
    main.append(
      panel("evidence", "Metinden kanıt", h("div", { class: "quotes" }, (page.quotes || []).map((q) => h("p", {}, q))), fresh(viewKey))
    );
  } else if (viewKey === "thinking") {
    main.append(panel("thinking", "Düşünürken…", h("p", {}, page.text || step.thinking), fresh(viewKey)));
  } else if (viewKey === "guidance") {
    main.append(panel("guidance", "Yönlendirme", h("p", {}, page.text || a.guidance), fresh(viewKey)));
  } else if (viewKey === "explanation") {
    main.append(panel("explanation", "Açıklama", h("p", {}, page.text || a.explanation), fresh(viewKey)));
  }

  const bodyInner = h("div", { class: "body-grid" }, main);

  // Alt şerit
  const dots = active.length
    ? h("span", { class: "dots", title: "Açılacak katmanlar" }, active.map((_, i) => h("i", { class: i < state.reveal ? "on" : "" })))
    : null;
  const foot = h(
    "footer",
    { class: "slide__foot" },
    h("span", { class: "lesson-name" }, lesson.title),
    dots,
    h("span", { class: "counter" }, `${state.slide} / ${lesson.steps.length}`)
  );

  return h("div", { class: "slide" }, top, h("div", { class: "slide__body" }, bodyInner), foot);
}

// ============================================================
// Çizim
// ============================================================

function render({ newSlide }) {
  const lesson = currentLesson();
  const step = currentStep();
  const view = step ? currentView(step) : null;
  const canvas = $("#canvas");

  let slide;
  if (state.slide === 0) slide = coverSlide(lesson);
  else if (step) slide = stepSlide(lesson, step);
  else slide = endSlide(lesson);

  if (newSlide) {
    slide.classList.add("is-entering");
    if (state.direction < 0) slide.classList.add("from-back");
  }

  const progress = h("div", {
    class: "progress",
    style: `width:${((state.slide / (lesson.steps.length + 1)) * 100).toFixed(2)}%`
  });

  canvas.replaceChildren(slide, progress);
  if (newSlide) {
    // Önceki slaytta yapılmış bir kaydırma yeni slaydın açılış konumunu bozmasın.
    canvas.scrollTop = 0;
    const viewportEl = $("#viewport");
    if (viewportEl) viewportEl.scrollTop = 0;
    if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
  }
  const body = slide.querySelector(".slide__body");
  fitBody(body, step?.density);
  revealIntoView(body);

  $("#dock-counter").textContent =
    state.slide === 0
      ? "Kapak"
      : step
        ? `${state.slide} / ${lesson.steps.length}${view.pages.length > 1 ? ` · ${view.index + 1}/${view.pages.length}` : ""}`
        : "Son";
  document.title = `${lesson.title} · Ders Sunumu`;
  savePosition();
  if (!exportingPptx && !$("#menu").hidden) renderMenu();
}

// Gövde yazı ölçeğini, içerik taşmayacak en büyük değere ayarla
function fitBody(body, density = "comfortable") {
  if (!body) return;
  body.classList.remove("is-overflowing");
  body.scrollTop = 0;
  const fits = (k) => {
    body.style.setProperty("--k", k);
    return body.scrollHeight <= body.clientHeight + 1 && body.scrollWidth <= body.clientWidth + 1;
  };
  const scale = canvasScaleFactor();
  const MIN = Math.max(0.6, 24 / (40 * scale));
  const MAX = Math.max(density === "large" ? 1.15 : 1, MIN);
  if (fits(MAX)) return;
  let lo = MIN;
  let hi = MAX;
  if (!fits(lo)) {
    body.classList.add("is-overflowing");
    return;
  }
  for (let i = 0; i < 9; i += 1) {
    const mid = (lo + hi) / 2;
    if (fits(mid)) lo = mid;
    else hi = mid;
  }
  fits(lo);
}

// Yeni açılan katman ekran dışında kaldıysa ona kaydır
function revealIntoView(body) {
  if (!body || !body.classList.contains("is-overflowing")) return;
  const el = body.querySelector(".fresh");
  if (!el) return;
  const bodyRect = body.getBoundingClientRect();
  const scale = bodyRect.height / body.offsetHeight || 1;
  const top = (el.getBoundingClientRect().top - bodyRect.top) / scale;
  body.scrollTop = Math.max(0, body.scrollTop + top - 24);
}

function scaleCanvas() {
  const canvas = $("#canvas");
  const s = canvasScaleFactor();
  document.documentElement.style.setProperty("--canvas-scale", String(s));
  canvas.style.transform = `scale(${s}) translate(-50%, -50%)`;
}

function canvasScaleFactor() {
  if (exportingPptx) return 1;
  return Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
}

// ============================================================
// Menü
// ============================================================

function themeKeys() {
  return [...new Set(lessons().map((l) => l.theme))];
}

function renderMenu() {
  const themes = themeKeys();
  if (!state.menuTheme) state.menuTheme = currentLesson().theme;

  $("#menu-tabs").replaceChildren(
    ...themes.map((t) => {
      const no = Number(t.replace(/\D/g, ""));
      return h(
        "button",
        {
          type: "button",
          role: "tab",
          "aria-selected": String(t === state.menuTheme),
          onclick: () => {
            if (exportingPptx) return;
            state.menuTheme = t;
            renderMenu();
          }
        },
        `${no}. Tema · ${state.catalog.themes[t] || ""}`
      );
    })
  );

  $("#menu-lessons").replaceChildren(
    ...lessons()
      .map((l, i) => [l, i])
      .filter(([l]) => l.theme === state.menuTheme)
      .map(([l, i]) =>
        h(
          "li",
          {},
          h(
            "button",
            {
              type: "button",
              class: i === state.lesson ? "is-current" : "",
              onclick: () => {
                if (exportingPptx) return;
                closeMenu();
                goto(i, 0, 0, 1);
              }
            },
            h("span", { class: "t" }, l.title),
            h("span", { class: "s" }, `s. ${l.pages.replace("-", "–")} · ${l.steps.length} slayt`)
          )
        )
      )
  );

  const lesson = currentLesson();
  const stepItems = [
    h(
      "li",
      {},
      h(
        "button",
        { type: "button", class: state.slide === 0 ? "is-current" : "", onclick: () => { if (exportingPptx) return; closeMenu(); goto(state.lesson, 0, 0, 1); } },
        h("span", { class: "n" }, "0"),
        h("span", { class: "t" }, `Kapak — ${lesson.title}`)
      )
    ),
    ...lesson.steps.map((s, i) =>
      h(
        "li",
        {},
        h(
          "button",
          {
            type: "button",
            class: state.slide === i + 1 ? "is-current" : "",
            onclick: () => { if (exportingPptx) return; closeMenu(); goto(state.lesson, i + 1, 0, 1); }
          },
          h("span", { class: "n" }, String(i + 1)),
          h("span", { class: "t" }, s.prompt),
          h("span", { class: "s" }, `s. ${s.page} · ${taskLabel(s, lesson.theme)}`)
        )
      )
    )
  ];
  $("#menu-steps").replaceChildren(...stepItems);
  $("#menu-guide").checked = state.guideOnRemote;
  $("#menu-build").textContent = `Sürüm ${BUILD} · ${new Date(state.catalog.built_at).toLocaleDateString("tr-TR")}`;
}

function openMenu() {
  state.menuTheme = currentLesson().theme;
  $("#menu").hidden = false;
  renderMenu();
  requestAnimationFrame(() => {
    $("#menu-steps .is-current")?.scrollIntoView({ block: "center" });
    $("#menu-lessons .is-current")?.scrollIntoView({ block: "nearest" });
  });
}

function closeMenu() {
  $("#menu").hidden = true;
}

async function exportCurrentLesson() {
  const button = $("#menu-export-pptx");
  const lesson = currentLesson();
  const status = $("#menu-export-status");
  const saved = {
    state: { ...state, extras: new Set(state.extras), revealedVocabularyTerms: new Set(state.revealedVocabularyTerms) },
    hash: location.href,
    position: storage.get(LS.position),
    title: document.title,
    canvasScale: document.documentElement.style.getPropertyValue("--canvas-scale"),
    bodyScroll: $("#canvas .slide__body")?.scrollTop || 0,
    canvasScroll: $("#canvas").scrollTop
  };
  window.clearTimeout(exportStatusTimer);
  button.disabled = true;
  button.setAttribute("aria-busy", "true");
  button.title = "PowerPoint hazırlanıyor…";
  exportingPptx = true;
  $("#menu").setAttribute("aria-busy", "true");
  status.classList.remove("visually-hidden");
  status.textContent = "PowerPoint slaytları hazırlanıyor…";
  document.documentElement.style.setProperty("--canvas-scale", "1");
  try {
    const slideImages = [];
    state.lesson = saved.state.lesson;
    state.guideOnRemote = true;
    state.extras = new Set();
    state.fresh = null;
    state.direction = 1;

    const captureState = async () => {
      render({ newSlide: false });
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
      const body = $("#canvas .slide__body");
      const pageHeight = body?.clientHeight || 1;
      const maxScroll = Math.max(0, (body?.scrollHeight || 0) - pageHeight);
      const scrollPositions = [0];
      for (let top = pageHeight; top < maxScroll; top += pageHeight) scrollPositions.push(top);
      if (maxScroll > 0) scrollPositions.push(maxScroll);
      for (const top of scrollPositions) {
        if (body) body.scrollTop = top;
        await new Promise(requestAnimationFrame);
        slideImages.push(await captureSlideImage());
        if (slideImages.length % 5 === 0) status.textContent = `${slideImages.length} slayt hazırlanıyor…`;
      }
    };

    state.slide = 0;
    state.reveal = 0;
    state.part = 0;
    state.revealedVocabularyTerms.clear();
    await captureState();

    for (let index = 0; index < lesson.steps.length; index += 1) {
      const step = lesson.steps[index];
      state.slide = index + 1;
      state.extras = new Set();
      state.revealedVocabularyTerms.clear();
      const layerCount = isWordWallStep(step) ? 0 : activeReveals(step).length;
      status.textContent = `${index + 1}/${lesson.steps.length} adım hazırlanıyor…`;
      await new Promise(requestAnimationFrame);
      for (let reveal = 0; reveal <= layerCount; reveal += 1) {
        state.reveal = reveal;
        status.textContent = `${index + 1}/${lesson.steps.length} · ${reveal + 1}/${layerCount + 1} katman hazırlanıyor…`;
        await new Promise(requestAnimationFrame);
        const view = currentView(step);
        const parts = Math.max(1, view.pages.length);
        for (let part = 0; part < parts; part += 1) {
          state.part = part;
          await captureState();
        }
      }
      if (isWordWallStep(step)) {
        const hiddenTerms = [...$("#canvas").querySelectorAll(".vocab__item--interactive .vocab__term")].map((term) => term.textContent);
        state.revealedVocabularyTerms = new Set(hiddenTerms);
        await captureState();
      }
    }

    state.slide = lesson.steps.length + 1;
    state.reveal = 0;
    state.part = 0;
    state.revealedVocabularyTerms.clear();
    await captureState();

    const blob = createLessonPptx(slideImages);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = pptxFilename(lesson);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    status.textContent = `${slideImages.length} slaytlı PowerPoint indirildi.`;
    exportStatusTimer = window.setTimeout(() => {
      status.textContent = "";
      status.classList.add("visually-hidden");
    }, 6000);
  } catch (error) {
    console.error("PowerPoint dışa aktarılamadı", error);
    status.textContent = "PowerPoint oluşturulamadı. Yeniden deneyin.";
    window.alert("PowerPoint dosyası oluşturulamadı. Lütfen yeniden deneyin.");
  } finally {
    Object.assign(state, saved.state);
    exportingPptx = false;
    render({ newSlide: false });
    document.documentElement.style.setProperty("--canvas-scale", saved.canvasScale || "");
    $("#menu").removeAttribute("aria-busy");
    history.replaceState(null, "", saved.hash);
    if (saved.position !== null) storage.set(LS.position, saved.position);
    else storage.remove(LS.position);
    document.title = saved.title;
    $("#canvas").scrollTop = saved.canvasScroll;
    const restoredBody = $("#canvas .slide__body");
    if (restoredBody) restoredBody.scrollTop = saved.bodyScroll;
    button.disabled = false;
    button.removeAttribute("aria-busy");
    button.title = "Seçili dersi PowerPoint (.pptx) olarak indir";
    if (!$("#menu").hidden) button.focus();
  }
}

function xmlText(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&apos;"
  })[character]);
}
function svgBox(rect, slideRect, style) {
  const x=rect.left-slideRect.left,y=rect.top-slideRect.top,width=rect.width,height=rect.height;
  if(width<=0||height<=0)return "";
  const opacity=Number(style.opacity||1),fill=style.backgroundColor;
  const hasFill=fill&&fill!=="transparent"&&!/^rgba\([^)]*,\s*0\s*\)$/.test(fill);
  const borderWidth=Math.max(...[style.borderTopWidth,style.borderRightWidth,style.borderBottomWidth,style.borderLeftWidth].map(v=>Number.parseFloat(v)||0));
  const hasBorder=borderWidth>0&&style.borderStyle!=="none"&&style.borderColor!=="transparent";
  if(!hasFill&&!hasBorder)return "";
  const radius=Math.max(0,Number.parseFloat(style.borderTopLeftRadius)||0);
  return "<rect x=\""+x+"\" y=\""+y+"\" width=\""+width+"\" height=\""+height+"\""+(radius?" rx=\""+radius+"\"":"")+
    (hasFill?" fill=\""+xmlText(fill)+"\"":" fill=\"none\"")+(hasBorder?" stroke=\""+xmlText(style.borderColor)+"\" stroke-width=\""+borderWidth+"\"":"")+
    (opacity<1?" opacity=\""+opacity+"\"":"")+"/>";
}
function svgText(textNode,slideRect) {
  const text=textNode.textContent,parent=textNode.parentElement;
  if(!text||!text.trim()||!parent)return "";
  const style=getComputedStyle(parent);
  if(style.display==="none"||style.visibility==="hidden"||style.fontSize==="0px")return "";
  const fontSize=Number.parseFloat(style.fontSize)||16,pieces=[],range=document.createRange();
  for(const match of text.matchAll(/\S+/gu)){
    range.setStart(textNode,match.index);range.setEnd(textNode,match.index+match[0].length);
    const rect=range.getBoundingClientRect();if(!rect.width||!rect.height)continue;
    let value=match[0];if(style.textTransform==="uppercase")value=value.toLocaleUpperCase("tr-TR");else if(style.textTransform==="lowercase")value=value.toLocaleLowerCase("tr-TR");
    const x=rect.left-slideRect.left,y=rect.top-slideRect.top;
    pieces.push("<text x=\""+x+"\" y=\""+y+"\" dominant-baseline=\"hanging\" textLength=\""+rect.width+"\" lengthAdjust=\"spacingAndGlyphs\""+
      " font-family=\""+xmlText(style.fontFamily)+"\" font-size=\""+fontSize+"\" font-weight=\""+xmlText(style.fontWeight)+"\""+
      " font-style=\""+xmlText(style.fontStyle)+"\" fill=\""+xmlText(style.color)+"\""+
      (style.letterSpacing!=="normal"?" letter-spacing=\""+xmlText(style.letterSpacing)+"\"":"")+
      (style.textDecorationLine!=="none"?" text-decoration=\""+xmlText(style.textDecorationLine)+"\"":"")+
      (Number(style.opacity)<1?" opacity=\""+style.opacity+"\"":"")+">"+xmlText(value)+"</text>");
  }
  return pieces.join("");
}
function svgSlideMarkup(source) {
  const slideRect=source.getBoundingClientRect(),base=getComputedStyle($("#canvas")).backgroundColor;
  const pieces=["<rect width=\"1920\" height=\"1080\" fill=\""+xmlText(base)+"\"/>"];
  const visit=(element)=>{
    const style=getComputedStyle(element);if(style.display==="none"||style.visibility==="hidden")return;
    const rect=element.getBoundingClientRect();pieces.push(svgBox(rect,slideRect,style));
    if(element instanceof HTMLImageElement&&element.currentSrc&&rect.width&&rect.height){
      const x=rect.left-slideRect.left,y=rect.top-slideRect.top,fit=style.objectFit==="contain"?"xMidYMid meet":"none";
      pieces.push("<image x=\""+x+"\" y=\""+y+"\" width=\""+rect.width+"\" height=\""+rect.height+"\" href=\""+xmlText(element.currentSrc)+"\" preserveAspectRatio=\""+fit+"\"/>");
    }
    if(element instanceof SVGElement&&element.tagName.toLowerCase()==="svg"){
      const serialized=new XMLSerializer().serializeToString(element),x=rect.left-slideRect.left,y=rect.top-slideRect.top;
      pieces.push("<svg x=\""+x+"\" y=\""+y+"\" width=\""+rect.width+"\" height=\""+rect.height+"\">"+serialized.replace(/^<svg\b[^>]*>/,"").replace(/<\/svg>$/,"")+"</svg>");return;
    }
    for(const child of element.childNodes){if(child.nodeType===Node.TEXT_NODE)pieces.push(svgText(child,slideRect));else if(child instanceof Element)visit(child);}
  };
  visit(source);return pieces.join("");
}
async function captureSlideImage() {
  await document.fonts?.ready;
  const source=$("#canvas .slide");if(!source)throw new Error("Sunum slaytı bulunamadı.");
  await Promise.all([...source.querySelectorAll("img")].map(image=>image.decode().catch(()=>{})));
  const svg="<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1920\" height=\"1080\" viewBox=\"0 0 1920 1080\">"+svgSlideMarkup(source)+"</svg>";
  const imageUrl=URL.createObjectURL(new Blob([svg],{type:"image/svg+xml;charset=utf-8"})),image=new Image();image.src=imageUrl;
  try{await image.decode();}finally{URL.revokeObjectURL(imageUrl);}
  const canvas=document.createElement("canvas");canvas.width=1920;canvas.height=1080;
  const context=canvas.getContext("2d");if(!context)throw new Error("Sunum görüntüsü çizilemedi.");
  context.drawImage(image,0,0,canvas.width,canvas.height);
  const png=await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("Slayt PNG görüntüsüne dönüştürülemedi.")),"image/png"));
  return new Uint8Array(await png.arrayBuffer());
}
// ============================================================
// Tam ekran, tema, boş ekran
// ============================================================

function toggleFullscreen() {
  const el = document.documentElement;
  if (document.fullscreenElement || document.webkitFullscreenElement) {
    (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
  } else {
    (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el)?.catch?.(() => {});
  }
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]').content = theme === "dark" ? "#14181e" : "#f5f2ea";
}

function toggleTheme() {
  const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(nextTheme);
  storage.set(LS.theme, nextTheme);
  render({ newSlide: false });
}

function setBlank(kind) {
  state.blank = state.blank === kind ? null : kind;
  const el = $("#blank");
  el.hidden = !state.blank;
  el.classList.toggle("is-white", state.blank === "white");
}

// ============================================================
// Girdi: kumanda, klavye, dokunma
// ============================================================

let jumpBuffer = "";
let jumpTimer = null;

function showJump() {
  const el = $("#jump");
  el.hidden = !jumpBuffer;
  el.textContent = `Slayt: ${jumpBuffer}`;
  clearTimeout(jumpTimer);
  if (jumpBuffer) {
    jumpTimer = setTimeout(() => {
      jumpBuffer = "";
      showJump();
    }, 2500);
  }
}

const NEXT_KEYS = new Set(["ArrowRight", "ArrowDown", "PageDown", " ", "Spacebar", "Enter", "n", "N", "MediaTrackNext"]);
const PREV_KEYS = new Set(["ArrowLeft", "ArrowUp", "PageUp", "Backspace", "p", "P", "MediaTrackPrevious"]);

function onKeyDown(event) {
  if (exportingPptx) {
    event.preventDefault();
    return;
  }
  if (!state.catalog) return;
  const target = event.target;
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
  if (event.metaKey || event.ctrlKey || event.altKey) return;

  const key = event.key;

  // Açık pencereler
  if (!$("#help").hidden) {
    if (key === "Escape" || key === "?" || NEXT_KEYS.has(key) || PREV_KEYS.has(key)) {
      $("#help").hidden = true;
      event.preventDefault();
    }
    return;
  }
  if (!$("#menu").hidden) {
    if (key === "Escape" || key === "m" || key === "M") {
      closeMenu();
      event.preventDefault();
    }
    return;
  }

  // Boş ekrandayken herhangi bir ileri/geri tuşu önce ekranı geri getirir
  if (state.blank && (NEXT_KEYS.has(key) || PREV_KEYS.has(key) || key === "Escape")) {
    setBlank(state.blank);
    event.preventDefault();
    return;
  }

  // Rakamla slayta atlama
  if (/^[0-9]$/.test(key)) {
    jumpBuffer = (jumpBuffer + key).slice(-3);
    showJump();
    event.preventDefault();
    return;
  }
  if (key === "Enter" && jumpBuffer) {
    const n = Number(jumpBuffer);
    jumpBuffer = "";
    showJump();
    goto(state.lesson, Math.min(n, stepCount() + 1), 0, n >= state.slide ? 1 : -1);
    event.preventDefault();
    return;
  }
  if (key === "Escape" && jumpBuffer) {
    jumpBuffer = "";
    showJump();
    return;
  }

  if (NEXT_KEYS.has(key)) {
    event.preventDefault();
    if (event.repeat && key !== "ArrowRight" && key !== "PageDown") return;
    next({ skipReveals: event.shiftKey });
  } else if (PREV_KEYS.has(key)) {
    event.preventDefault();
    prev({ skipReveals: event.shiftKey });
  } else if (key === "Home") {
    event.preventDefault();
    goto(state.lesson, 0, 0, -1);
  } else if (key === "End") {
    event.preventDefault();
    goto(state.lesson, stepCount() + 1, 0, 1);
  } else if (key === "F5" || key === "f" || key === "F") {
    // Kumandaların "sunumu başlat" tuşu F5 / Shift+F5 gönderir: sayfayı yenilemek yerine tam ekran
    event.preventDefault();
    toggleFullscreen();
  } else if (key === "b" || key === "B" || key === ".") {
    event.preventDefault();
    setBlank("black");
  } else if (key === "w" || key === "W" || key === ",") {
    event.preventDefault();
    setBlank("white");
  } else if (key === "y" || key === "Y") {
    event.preventDefault();
    toggleExtra("guidance");
  } else if (key === "a" || key === "A") {
    event.preventDefault();
    toggleExtra("explanation");
  } else if (key === "m" || key === "M") {
    event.preventDefault();
    openMenu();
  } else if (key === "t" || key === "T") {
    event.preventDefault();
    toggleTheme();
  } else if (key === "?" || key === "h" || key === "H") {
    event.preventDefault();
    $("#help").hidden = false;
  }
}

function onAction(action) {
  if (exportingPptx) return;
  switch (action) {
    case "next":
      next();
      break;
    case "prev":
      prev();
      break;
    case "menu":
      openMenu();
      break;
    case "close-menu":
      closeMenu();
      break;
    case "export-pptx":
      void exportCurrentLesson();
      break;
    case "fullscreen":
      toggleFullscreen();
      break;
    case "theme":
      toggleTheme();
      break;
    case "help":
      $("#help").hidden = false;
      break;
    case "toggle-guide-remote":
      state.guideOnRemote = !state.guideOnRemote;
      storage.set(LS.guideOnRemote, state.guideOnRemote ? "1" : "0");
      clampPosition();
      render({ newSlide: false });
      break;
    case "logout":
      storage.remove(LS.password);
      location.reload();
      break;
    default:
      break;
  }
}

function setupInput() {
  window.addEventListener("keydown", onKeyDown);

  document.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-action]");
    if (btn) {
      event.preventDefault();
      onAction(btn.dataset.action);
      if (btn.dataset.action !== "export-pptx") btn.blur();
    }
  });

  $("#menu").addEventListener("click", (event) => {
    if (!exportingPptx && event.target === $("#menu")) closeMenu();
  });
  $("#help").addEventListener("click", () => ($("#help").hidden = true));
  $("#blank").addEventListener("click", () => setBlank(state.blank));

  // Kaydırma (akıllı tahta / tablet)
  const viewport = $("#viewport");
  let touch = null;
  viewport.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches.length === 1) touch = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() };
    },
    { passive: true }
  );
  viewport.addEventListener(
    "touchend",
    (e) => {
      if (exportingPptx) {
        touch = null;
        return;
      }
      if (!touch) return;
      const dx = e.changedTouches[0].clientX - touch.x;
      const dy = e.changedTouches[0].clientY - touch.y;
      const quick = Date.now() - touch.t < 700;
      touch = null;
      if (quick && Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        if (dx < 0) next();
        else prev();
      }
    },
    { passive: true }
  );

  // Fare hareketinde kontrol çubuğu görünür, sonra gizlenir
  let idle = null;
  const wake = () => {
    viewport.classList.add("show-ui");
    viewport.classList.remove("hide-cursor");
    clearTimeout(idle);
    idle = setTimeout(() => {
      viewport.classList.remove("show-ui");
      viewport.classList.add("hide-cursor");
    }, 2600);
  };
  viewport.addEventListener("mousemove", wake);
  viewport.addEventListener("pointerdown", wake);

  let resizeTimer = null;
  window.addEventListener("resize", () => {
    scaleCanvas();
    fitBody($("#canvas .slide__body"));
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(remeasure, 200);
  });
  window.addEventListener("hashchange", () => {
    const before = `${state.lesson}/${state.slide}/${state.reveal}`;
    restorePosition();
    if (`${state.lesson}/${state.slide}/${state.reveal}` !== before) render({ newSlide: true });
  });
}

// Ekranın ders sırasında kararmasını engelle
let wakeLock = null;
async function keepAwake() {
  try {
    if ("wakeLock" in navigator && document.visibilityState === "visible" && !wakeLock) {
      wakeLock = await navigator.wakeLock.request("screen");
      wakeLock.addEventListener("release", () => (wakeLock = null));
    }
  } catch {
    wakeLock = null;
  }
}

// ============================================================
// Başlatma
// ============================================================

// Ekran boyutu veya yazı tipi değişince sunum parçalarını yeniden ölç.
function remeasure() {
  if (!state.catalog) return;
  resetBudgets();
  state.fresh = null;
  clampPosition();
  render({ newSlide: false });
}

function start(catalog) {
  state.catalog = catalog;
  state.guideOnRemote = storage.get(LS.guideOnRemote) === "1";
  $("#gate").hidden = true;
  $("#viewport").hidden = false;
  restorePosition();
  scaleCanvas();
  setupInput();
  render({ newSlide: true });
  keepAwake();
  document.addEventListener("visibilitychange", keepAwake);
  document.fonts?.ready?.then(remeasure);
}

function showGate(message = "") {
  $("#gate").hidden = false;
  $("#gate-error").textContent = message;
  const input = $("#gate-password");
  input.value = "";
  setTimeout(() => input.focus(), 50);
}

async function unlock(password, remember) {
  const catalog = await decryptCatalog(password);
  if (remember) storage.set(LS.password, password);
  else storage.remove(LS.password);
  start(catalog);
}

async function boot() {
  applyTheme(storage.get(LS.theme) === "dark" ? "dark" : "light");

  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }

  $("#gate-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const btn = $("#gate-submit");
    btn.disabled = true;
    btn.textContent = "Açılıyor…";
    $("#gate-error").textContent = "";
    try {
      await unlock($("#gate-password").value, $("#gate-remember").checked);
    } catch (err) {
      $("#gate-error").textContent = err instanceof WrongPassword ? "Şifre yanlış." : err.message;
      $("#gate-password").select();
    } finally {
      btn.disabled = false;
      btn.textContent = "Aç";
    }
  });

  const saved = storage.get(LS.password);
  if (saved) {
    try {
      await unlock(saved, true);
      return;
    } catch (err) {
      if (err instanceof WrongPassword) storage.remove(LS.password);
      showGate(err instanceof WrongPassword ? "Şifre değişmiş; yeniden girin." : err.message);
      return;
    }
  }
  showGate();
}

boot();
