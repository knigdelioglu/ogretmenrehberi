// Ders Sunumu — bağımlılıksız sunum oynatıcı
// Veri: şifreli ders kataloğu (__DATA_FILE__), build sırasında kanonik veriden üretilir.

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
  direction: 1,
  fresh: null, // son açılan katman (animasyon için)
  blank: null, // null | "black" | "white"
  menuTheme: null,
  extras: new Set(), // kumanda sırası dışında elle açılan katmanlar (yönlendirme / açıklama)
  guideOnRemote: false // true: kumanda yönlendirme ve açıklamayı da sırayla açar
};

// Yönlendirme ve açıklama öğretmene dönük olduğundan varsayılan olarak kumanda sırasına girmez;
// Y / A tuşlarıyla elle açılır. Menüdeki ayarla kumanda sırasına eklenebilir.
const STUDENT_LAYERS = new Set(["answer", "evidence"]);
function activeReveals(step) {
  if (!step) return [];
  return state.guideOnRemote ? step.reveals : step.reveals.filter((k) => STUDENT_LAYERS.has(k));
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
  if (step && !skipReveals && state.reveal < reveals.length) {
    state.reveal += 1;
    state.fresh = reveals[state.reveal - 1];
    render({ newSlide: false });
    return;
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
  if (step && !skipReveals && state.reveal > 0) {
    state.reveal -= 1;
    state.fresh = null;
    render({ newSlide: false });
    return;
  }
  if (state.slide > 0) {
    const target = state.slide - 1;
    const lesson = currentLesson();
    const reveals = target >= 1 ? activeReveals(lesson.steps[target - 1]).length : 0;
    goto(state.lesson, target, skipReveals ? 0 : reveals, -1);
  } else if (state.lesson > 0) {
    const prevLesson = lessons()[state.lesson - 1];
    goto(state.lesson - 1, prevLesson.steps.length + 1, 0, -1);
  } else {
    bump();
  }
}

function goto(lesson, slide, reveal = 0, direction = 1) {
  state.lesson = lesson;
  state.slide = slide;
  state.reveal = reveal;
  state.direction = direction;
  state.fresh = null;
  state.extras = new Set();
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
    state.extras.delete(key);
    state.fresh = null;
  } else {
    state.extras.add(key);
    state.fresh = key;
  }
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
  const hash = `#/${lesson.slug}/${state.slide}${state.reveal ? "/" + state.reveal : ""}`;
  if (location.hash !== hash) history.replaceState(null, "", hash);
  storage.set(
    LS.position,
    JSON.stringify({ slug: lesson.slug, slide: state.slide, reveal: state.reveal })
  );
}

function restorePosition() {
  const fromHash = /^#\/([^/]+)\/?(\d+)?\/?(\d+)?/.exec(location.hash);
  let saved = null;
  if (fromHash) {
    saved = { slug: decodeURIComponent(fromHash[1]), slide: Number(fromHash[2] || 0), reveal: Number(fromHash[3] || 0) };
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
      state.reveal = saved.reveal || 0;
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

function taskLabel(step) {
  const base = TASK_LABELS[step.task] ?? step.task.replaceAll("_", " ").toLocaleLowerCase("tr");
  if (step.answer?.entry_type === "performance_support") return "Uygulama";
  if (step.answer?.entry_type === "source_limited") return `${base} · kaynak sınırlı`;
  return base;
}

function answerLabel(step) {
  if (step.answer?.entry_type === "performance_support") return "Uygulama desteği";
  if (step.answer?.entry_type === "source_limited") return "Doğrulanabilen çerçeve";
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

function renderSections(sections) {
  if (!sections) return null;
  if (Array.isArray(sections)) {
    return h("div", { class: "sections", style: "--cols:1" }, h("div", { class: "sec" }, renderValue(sections)));
  }
  const entries = Object.entries(sections);
  if (!entries.length) return null;
  return h(
    "div",
    { class: "sections", style: `--cols:${columnsFor(entries.length)}` },
    entries.map(([k, v]) => h("article", { class: "sec" }, h("h3", {}, humanKey(k)), renderValue(v)))
  );
}

function renderContent(step) {
  const content = step.content;
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
        items.map((it, i) => h("div", { class: "field" }, h("span", { class: "n" }, String(i + 1).padStart(2, "0")), h("span", {}, it)))
      );
    } else if (step.layout === "assessment") {
      itemsEl = h("ul", { class: "criteria" }, items.map((it) => h("li", {}, h("span", {}, it))));
    } else if (step.layout === "comparison" && items.every((it) => it.length <= 48)) {
      itemsEl = h("div", { class: "chips" }, items.map((it) => h("span", {}, it)));
    } else {
      itemsEl = h(
        "ol",
        { class: "steps-list" },
        items.map((it, i) => h("li", {}, h("span", { class: "n" }, String(i + 1)), h("span", {}, it)))
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

function shortSource(source) {
  if (!source) return "";
  return String(source)
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[\s:;,(]+$/g, "")
    .trim();
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
  const shown = new Set([...active.slice(0, state.reveal), ...state.extras]);
  const a = step.answer;
  const isVocab = step.layout === "vocabulary";
  const answerShown = Boolean(a && shown.has("answer"));
  const keepContent =
    !answerShown || ["structure", "comparison", "assessment"].includes(step.layout);
  const fresh = (k) => state.fresh === k;

  // Üst şerit
  const no = questionNo(a?.question_no);
  const top = h(
    "header",
    { class: "slide__top" },
    h("span", { class: "tag" }, taskLabel(step), no ? h("span", { class: "tag__no" }, no) : null),
    h("span", { class: "where" }, h("b", {}, `s. ${String(step.page).replace("-", "–")}`), step.heading ? `  ·  ${step.heading}` : "")
  );

  // Ana sütun
  const main = h("div", { class: "stack" });
  main.append(h("h1", { class: `prompt${answerShown && !isVocab ? " is-small" : ""}` }, step.prompt));

  if (!answerShown && step.content?.lead && step.content.lead !== step.prompt) {
    main.append(h("p", { class: "lead" }, step.content.lead));
  }

  if (keepContent) {
    const c = renderContent(step);
    if (c) main.append(c);
  }

  if (isVocab && a?.answer_sections && !Array.isArray(a.answer_sections)) {
    main.append(
      h(
        "div",
        { class: `vocab${fresh("answer") ? " fresh" : ""}` },
        Object.entries(a.answer_sections).map(([term, meaning]) =>
          h(
            "div",
            { class: "vocab__item" },
            h("div", { class: "vocab__term" }, term),
            h(
              "div",
              { class: `vocab__meaning${answerShown ? "" : " is-hidden"}` },
              answerShown ? String(typeof meaning === "string" ? meaning : JSON.stringify(meaning)) : "• • •"
            )
          )
        )
      )
    );
  }

  // Katmanlar kanonik sırayla
  for (const key of step.reveals) {
    if (!shown.has(key)) continue;
    if (key === "guidance") {
      main.append(panel("guidance", "Yönlendirme", h("p", {}, a.guidance), fresh(key)));
    } else if (key === "answer" && !isVocab) {
      main.append(
        panel(
          "answer",
          answerLabel(step),
          [a.answer ? h("p", {}, a.answer) : null, renderSections(a.answer_sections)],
          fresh(key)
        )
      );
    } else if (key === "evidence") {
      main.append(
        panel("evidence", "Metinden kanıt", h("div", { class: "quotes" }, a.evidence_quotes.map((q) => h("p", {}, q))), fresh(key))
      );
    } else if (key === "explanation") {
      main.append(panel("explanation", "Açıklama", h("p", {}, a.explanation), fresh(key)));
    }
  }

  // Sözlük kartı
  // Söz varlığı görevlerinde sözlük cevabı önceden vermesin
  const vocabTask = isVocab || step.task === "VOCABULARY";
  const terms = vocabTask && !answerShown ? [] : dictionaryTerms(step);
  let bodyInner;
  if (terms.length) {
    const dict = h(
      "aside",
      { class: "dict" },
      h("h2", {}, "Sözlük"),
      h(
        "dl",
        {},
        terms.map((t) => [
          h("dt", {}, t.term),
          h("dd", {}, t.meaning),
          shortSource(t.source) ? h("dd", { class: "src" }, shortSource(t.source)) : null
        ])
      )
    );
    bodyInner = h("div", { class: "body-grid body-grid--aside" }, main, dict);
  } else {
    bodyInner = h("div", { class: "body-grid" }, main);
  }

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
  const body = slide.querySelector(".slide__body");
  fitBody(body);
  revealIntoView(body);

  $("#dock-counter").textContent =
    state.slide === 0 ? "Kapak" : step ? `${state.slide} / ${lesson.steps.length}` : "Son";
  document.title = `${lesson.title} · Ders Sunumu`;
  savePosition();
  if (!$("#menu").hidden) renderMenu();
}

// Gövde yazı ölçeğini, içerik taşmayacak en büyük değere ayarla
function fitBody(body) {
  if (!body) return;
  body.classList.remove("is-overflowing");
  body.scrollTop = 0;
  const fits = (k) => {
    body.style.setProperty("--k", k);
    return body.scrollHeight <= body.clientHeight + 1 && body.scrollWidth <= body.clientWidth + 1;
  };
  const MAX = 1;
  const MIN = 0.55;
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
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const s = Math.min(vw / 1920, vh / 1080);
  canvas.style.transform = `scale(${s}) translate(-50%, -50%)`;
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
        { type: "button", class: state.slide === 0 ? "is-current" : "", onclick: () => (closeMenu(), goto(state.lesson, 0, 0, 1)) },
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
            onclick: () => (closeMenu(), goto(state.lesson, i + 1, 0, 1))
          },
          h("span", { class: "n" }, String(i + 1)),
          h("span", { class: "t" }, s.prompt),
          h("span", { class: "s" }, `s. ${s.page} · ${taskLabel(s)}`)
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
      btn.blur();
    }
  });

  $("#menu").addEventListener("click", (event) => {
    if (event.target === $("#menu")) closeMenu();
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

  window.addEventListener("resize", () => {
    scaleCanvas();
    fitBody($("#canvas .slide__body"));
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
  document.fonts?.ready?.then(() => fitBody($("#canvas .slide__body")));
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
