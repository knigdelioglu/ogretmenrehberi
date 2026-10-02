import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(appRoot, "../..");
const chrome = process.env.CHROME;
if (!chrome) throw new Error("Set CHROME to a Chrome/Chromium executable to run this real-browser test.");
const port = Number(process.env.PORT || 5181);
const root = `http://127.0.0.1:${port}`;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "sunum-web-cdp-"));
const server = spawn(process.execPath, [path.join(appRoot, "scripts/serve.mjs")], {
  env: { ...process.env, PORT: String(port) }, stdio: "ignore"
});
const browser = spawn(chrome, [
  "--headless=new", "--no-sandbox", "--disable-gpu", "--disable-popup-blocking", "--no-first-run",
  "--remote-allow-origins=*", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank"
], { stdio: "ignore" });
const clients = [];

async function until(check, label, timeout = 15000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      const result = await check();
      if (result) return result;
    } catch { /* navigation temporarily destroys the execution context */ }
    await sleep(80);
  }
  throw new Error(`Timed out: ${label}`);
}

async function connectTarget(debugPort, predicate) {
  const target = await until(async () => {
    const response = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
    return (await response.json()).find((item) => item.type === "page" && predicate(item));
  }, "Chrome page target");
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  const pending = new Map();
  let sequence = 0;
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  });
  const client = {
    send(method, params = {}) {
      const id = ++sequence;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
      });
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
  return client;
}

const lessons = JSON.parse(fs.readFileSync(path.join(repoRoot, "apps/lesson-player/src/generated/lessons.json"), "utf8"));
const findStep = (slug, id) => {
  const lesson = lessons.find((entry) => entry.lesson_slug === slug);
  const index = lesson?.steps.findIndex((step) => step.id === id) ?? -1;
  assert.ok(index >= 0, `fixture exists: ${slug}/${id}`);
  return { lesson, step: lesson.steps[index], slide: index + 1 };
};
let page;

async function bodyText() { return page.evaluate("document.querySelector('#canvas .slide__body')?.innerText ?? ''"); }
async function next() {
  await page.evaluate("document.querySelector('#dock [data-action=next]').click()");
  await sleep(120);
  return bodyText();
}
async function openStep(slug, id) {
  const entry = findStep(slug, id);
  await page.send("Page.navigate", { url: `${root}/#/${entry.lesson.lesson_slug}/${entry.slide}` });
  await until(async () => (await bodyText()).includes(entry.step.display_prompt), `open ${id}`);
  await until(() => page.evaluate("Array.from(document.querySelectorAll('#canvas .content-images img')).every(image => image.complete && image.naturalWidth > 0)"), `images ${id}`);
  return { ...entry, text: await bodyText() };
}
function terms(text) {
  return page.evaluate("Array.from(document.querySelectorAll('#canvas .vocab__term, #canvas .dict dt')).map(el => el.textContent.trim())");
}
const includesText = (text, fragment) => text.toLocaleLowerCase("tr").includes(fragment.toLocaleLowerCase("tr"));
async function revealDictionaryGroup(firstTerms, nextTerms, firstMeaning, nextMeaning) {
  const initial = await bodyText();
  const initialTerms = await terms(initial);
  assert.ok(firstTerms.every((term) => includesText(initial, term)), "first term group is visible initially");
  assert.ok(!includesText(initial, firstMeaning), "first group's meaning is initially hidden");
  assert.ok(!nextTerms.some((term) => initialTerms.some((visible) => visible.toLocaleLowerCase("tr") === term.toLocaleLowerCase("tr"))), "later group is initially hidden");
  const firstAnswer = await next();
  const firstAnswerTerms = await terms(firstAnswer);
  assert.ok(includesText(firstAnswer, firstMeaning), "first group's meaning opens on the first click");
  assert.ok(!nextTerms.some((term) => firstAnswerTerms.some((visible) => visible.toLocaleLowerCase("tr") === term.toLocaleLowerCase("tr"))), "later group waits for the first group's answer");
  const nextPrompt = await next();
  const nextPromptTerms = await terms(nextPrompt);
  assert.ok(nextTerms.every((term) => nextPromptTerms.some((visible) => visible.toLocaleLowerCase("tr") === term.toLocaleLowerCase("tr"))), "next term group opens after the first answer");
  assert.ok(!includesText(nextPrompt, nextMeaning), "next group's meaning remains hidden until another click");
  const nextAnswer = await next();
  assert.ok(includesText(nextAnswer, nextMeaning), "next group's meaning opens on the following click");
}

async function advanceUntil(predicate, label, max = 12) {
  let current = await bodyText();
  for (let index = 0; index < max; index += 1) {
    if (predicate(current)) return current;
    current = await next();
  }
  assert.fail(`Could not reach ${label}`);
}

try {
  await until(async () => (await fetch(root)).ok, "Sunum Web local server");
  const portFile = path.join(profile, "DevToolsActivePort");
  const debugPort = await until(() => fs.existsSync(portFile)
    ? Number(fs.readFileSync(portFile, "utf8").split("\n")[0]) : null, "Chrome debugging endpoint");
  page = await connectTarget(debugPort, (target) => target.url === "about:blank");
  await page.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await page.send("Page.navigate", { url: `${root}/#/karagoz/0` });
  await until(() => page.evaluate("!document.querySelector('#gate').hidden"), "password screen");
  await page.evaluate("document.querySelector('#gate-password').value = 'sunum'; document.querySelector('#gate-submit').click()");
  try {
    await until(() => page.evaluate("Boolean(document.querySelector('#canvas .slide'))"), "unlocked presentation");
  } catch (error) {
    const diagnostics = await page.evaluate("JSON.stringify({gateError: document.querySelector('#gate-error')?.textContent, visible: !document.querySelector('#gate').hidden, canvas: document.querySelector('#canvas')?.innerText, ready: document.readyState})");
    console.error(`[sunum-web] Chrome unlock diagnostics: ${diagnostics}`);
    throw error;
  }

  let screen = await openStep("karagoz", "s16-q1");
  assert.ok(screen.text.includes("tiplerin adlarını"));
  assert.equal(await page.evaluate("document.querySelector('#canvas .content-images img')?.naturalWidth > 100"), true, "ISSUE-002 source illustration renders in Chrome");
  assert.ok(screen.text.includes("Ders kitabı, basılı s.16"));
  assert.ok(!screen.text.includes("Beberuhi") && !screen.text.includes("Çelebi") && !screen.text.includes("Zenne"), "ISSUE-002 type names are hidden on the question slide");
  const karagozAnswer = await next();
  assert.ok(["Beberuhi", "Çelebi", "Zenne"].every((name) => karagozAnswer.includes(name)), "ISSUE-002 type names appear on the next answer slide");

  screen = await openStep("mektup", "s46-q4");
  assert.ok(screen.text.includes("Hasret sana ey yirmi yılın"), "ISSUE-013 poem excerpt is visible");
  assert.equal(await page.evaluate("Array.from(document.querySelectorAll('#canvas .source-links a')).some(a => a.href.includes('#page=46'))"), true);

  for (const id of ["s48-q1", "s48-q2", "s48-q3"]) {
    screen = await openStep("mektup", id);
    assert.ok(screen.text.includes("Ders kitabı s.48"), `ISSUE-015 ${id} has a usable source link`);
    if (id === "s48-q1") assert.ok(screen.text.includes("103 yıl sonra"), "both article contexts are visible");
  }
  for (const id of ["s50-q1", "s50-q2", "s50-q3", "s50-q4"]) {
    screen = await openStep("mektup", id);
    assert.ok(screen.text.includes("beş kaynak metnin tam sayfalarını aç"), `ISSUE-017 ${id} exposes all five source texts`);
  }

  screen = await openStep("tema-2-girisi", "s88-q4");
  assert.ok(screen.text.includes("doğuştan beri geçen ve yıl birimiyle ölçülen zaman"), "ISSUE-027 meaning is on the question screen");

  for (const id of ["s90-q1", "s90-q2"]) {
    screen = await openStep("ogulla-bulusma", id);
    assert.equal(await page.evaluate("document.querySelector('#canvas .content-images img')?.naturalWidth > 100"), true, `ISSUE-028 ${id} shows the verified train image`);
    assert.ok(screen.text.includes("s.93’deki tren ve manzara"));
    const answer = (await next()).toLocaleLowerCase("tr");
    assert.ok(!answer.includes("görseldeki atlı yaşlı kişi"));
  }

  screen = await openStep("ogulla-bulusma", "s90-strategy");
  assert.ok(!screen.text.includes("Göz Gezdirme") && !screen.text.includes("işaretleyerek okuma"), "ISSUE-029 strategy does not leak into first view");
  assert.ok((await next()).includes("Göz Gezdirme"), "strategy is available after a click");

  screen = await openStep("ogulla-bulusma", "s95-q1");
  assert.deepEqual(await terms(screen.text), ["Yular", "Üzengi", "Katar"], "ISSUE-030 starts with the first three terms only");
  await revealDictionaryGroup(["Yular", "Üzengi", "Katar"], ["Kampana", "Hat", "Toynak"], "başlarına takılan ipli veya kayışlı başlık", "istasyonun çaldığı çan");

  screen = await openStep("eski-istanbul", "s111-q1");
  await revealDictionaryGroup(["hilye", "rahle"], ["cüz kesesi", "sebilci"], "Hz. Muhammed’in fiziksel özelliklerini", "Âmin alayında cüzü taşımak");

  screen = await openStep("eski-istanbul", "s111-q3");
  await revealDictionaryGroup(["sebilci", "saka"], ["lîka", "rîh"], "meşin tulumbalar içindeki suyu", "ham ipek");

  screen = await openStep("orhun-abideleri", "s116-vocabulary");
  assert.deepEqual(await terms(screen.text), ["ecdat", "il", "yağız"], "ISSUE-033 starts with the first three terms only");
  await revealDictionaryGroup(["ecdat", "il", "yağız"], ["kılmak", "töre", "şad"], "Geçmişteki büyükler, atalar", "Etmek, yapmak");

  screen = await openStep("divanu-lugatit-turk", "s127-q7");
  assert.ok(!screen.text.includes("Kapsamı Belirleme") && !screen.text.includes("Veri Toplama"), "ISSUE-034 research plan is hidden on first view");
  assert.ok((await next()).includes("Kapsamı Belirleme"), "research plan opens after a click");

  screen = await openStep("asik-atismasi", "s140-vocabulary");
  await revealDictionaryGroup(["çağ", "kahır"], ["canan", "saban"], "Zaman dilimlerinden her biri", "Gönülden sevilen");

  screen = await openStep("tema-2-degerlendirme", "s155-q1");
  assert.ok(screen.text.includes("yuyka / kalın; yinçge / yoğun"));
  assert.ok(!screen.text.includes("Birlik ve dayanışma") && !screen.text.includes("Emek ve çalışma"), "ISSUE-036 comments are absent on first view");
  const answer = await next();
  assert.ok(answer.includes("Birlik ve dayanışma"), "comments open after a click");

  screen = await openStep("tema-3-girisi", "s161-theme-presentation");
  assert.ok(screen.text.includes("Nerde görsen gönlü kırık"), "ISSUE-037 Yesevî source remains visible");
  assert.ok(!/karekodunu.*açın|erişilemiyorsa|üzerinden devam edin/i.test(screen.text), "ISSUE-037 operator directions stay out of student view");
  screen = await openStep("tema-3-girisi", "s163-q5");
  assert.ok(!screen.text.includes("Sesli yayın, dinleme") && !screen.text.includes("Sorular, yanıtlar"), "ISSUE-039 answer is hidden initially");
  assert.ok((await next()).includes("Sesli yayın, dinleme"), "ISSUE-039 answer opens after advance");
  screen = await openStep("tema-3-girisi", "s163-q6");
  assert.ok(!screen.text.includes("edebiyatçı hakkında bilgi verir"), "ISSUE-040 comparison is hidden initially");
  assert.ok((await next()).includes("edebiyatçı hakkında bilgi verir"), "ISSUE-040 comparison opens after advance");

  screen = await openStep("huzur-okuma", "s166-meaning");
  assert.ok(!screen.text.includes("bedendeki bölgeyi"), "ISSUE-042 word example is hidden initially");
  assert.ok((await next()).includes("UYGULAMA DESTEĞİ"), "ISSUE-042 answer opens after advance");
  screen = await openStep("huzur-177-178", "s177-q14");
  assert.ok(!screen.text.includes("Açık iletiler"), "ISSUE-043 message examples are hidden initially");
  assert.ok((await next()).includes("CEVAP"), "ISSUE-043 answer opens after advance");
  screen = await openStep("huzur-177-178", "s178-huzur-content");
  assert.ok(!screen.text.includes("Mümtaz ve Nuran üzerinden İstanbul"), "ISSUE-043 comparison model is hidden initially");
  assert.ok((await next()).includes("UYGULAMA DESTEĞİ"), "ISSUE-043 comparison answer opens after advance");
  screen = await openStep("huzur-okuma-cemberi-179-181", "s180-mumtaz-nuran");
  assert.ok(!screen.text.includes("Yeni hayatı kültür ve kimlik"), "ISSUE-044 person comparison is hidden initially");
  assert.ok((await next()).includes("UYGULAMA DESTEĞİ"), "ISSUE-044 answer opens after advance");
  screen = await openStep("huzur-hayat-kurmaca-182-185", "s184-halk");
  assert.ok(!screen.text.includes("düşünce konusu değil"), "ISSUE-045 analysis is hidden initially");
  assert.ok((await next()).includes("UYGULAMA DESTEĞİ"), "ISSUE-045 answer opens after advance");

  screen = await openStep("huzur-okuma", "s165-166-fark");
  assert.ok(screen.text.includes("huzur") && screen.text.includes("rüya") && !screen.text.includes("saz"), "ISSUE-041 starts with the first group only");
  let t3Reveal = await next();
  assert.ok(t3Reveal.includes("Yoğun bir günün ardından") && !t3Reveal.includes("boğaz"), "ISSUE-041 first group answer precedes later terms");
  t3Reveal = await next();
  assert.ok(t3Reveal.includes("saz") && t3Reveal.includes("boğaz"), "ISSUE-041 second group follows first answer");

  screen = await openStep("huzur-okuma", "s172-vocabulary");
  await revealDictionaryGroup(["mustarip (muzdarip)", "mahzen", "cevher"], ["yeis", "zarafet", "neşretmek"], "acı/sıkıntı çeken", "umutsuzluk");
  await next();
  const thirdGroupPrompt = await bodyText();
  assert.ok(["hulâsa (hülasa)", "muazzam", "cins"].every(term => includesText(thirdGroupPrompt, term)), "ISSUE-068 third group opens after second group's answer");
  await next();
  assert.ok(includesText(await bodyText(), "özetle"), "ISSUE-068 third group meanings follow its prompt");

  screen = await openStep("direnisin-ustalari-215-220", "s217-vocabulary");
  assert.ok(!screen.text.includes("Öğretmen için kaynak ve değerlendirme notu"), "Teacher-only content.note is absent from student projection");
  await revealDictionaryGroup(["direniş", "ihbar", "torna"], ["kafa yormak", "haber uçurmak"], "QR medya gerekli", "QR medya gerekli");

  screen = await openStep("huzur-hayat-kurmaca-182-185", "s184-185-value-q2");
  assert.ok(!screen.text.includes("Halkı sevdiğini söylemek ile"), "ISSUE-046 answers stay out of the task view");
  t3Reveal = await next();
  assert.ok(t3Reveal.includes("insanı yalnız bir fikir") && !t3Reveal.includes("tarihî-kültürel köklerden") && !t3Reveal.includes("serçelere"), "ISSUE-046 first answer does not summarize later parts");

  screen = await openStep("huzur-catisma-dil-189-191", "s189-one");
  assert.ok(!screen.text.includes("Gündelik hayatın ortasında"), "ISSUE-048 conflict model is hidden initially");
  assert.ok((await next()).includes("UYGULAMA DESTEĞİ"), "ISSUE-048 answer opens after advance");
  screen = await openStep("huzur-catisma-dil-189-191", "s190-words");
  assert.ok(!screen.text.includes("Bugün de kullanılan"), "ISSUE-049 language examples are hidden initially");
  assert.ok((await next()).includes("UYGULAMA DESTEĞİ"), "ISSUE-049 answer opens after advance");
  screen = await openStep("huzur-catisma-dil-189-191", "s190-gram-a");
  assert.ok(!screen.text.includes("Yüklem isim soyludur"), "ISSUE-050 grammar analysis is hidden initially");
  assert.ok((await next()).includes("UYGULAMA DESTEĞİ"), "ISSUE-050 answer opens after advance");
  screen = await openStep("huzur-degerlendirme-192-193", "s192-values");
  assert.ok(!screen.text.includes("Millî: tarihî şehir"), "ISSUE-051 worksheet answer is hidden initially");
  assert.ok((await next()).includes("UYGULAMA DESTEĞİ"), "ISSUE-051 answer opens after advance");
  screen = await openStep("huzur-degerlendirme-192-193", "s192-structure");
  assert.ok(!screen.text.includes("Tarihî İstanbul semtleri kültürel hafızayı"), "ISSUE-051 structure example is hidden initially");
  assert.ok((await next()).includes("UYGULAMA DESTEĞİ"), "ISSUE-051 structure example opens after advance");
  screen = await openStep("biyografi-akif-194-198", "s194-tarik");
  assert.ok(!screen.text.includes("meslek yaşamında somut sonuç"), "ISSUE-052 biography inference is hidden initially");
  assert.ok((await next()).includes("UYGULAMA DESTEĞİ"), "ISSUE-052 answer opens after advance");
  screen = await openStep("biyografi-akif-194-198", "s196-anthem");
  assert.ok(!screen.text.includes("Yarışma ilanı →"), "ISSUE-053 chronology is hidden initially");
  assert.ok((await next()).includes("UYGULAMA DESTEĞİ"), "ISSUE-053 answer opens after advance");
  screen = await openStep("biyografi-akif-anlama-199-201", "s201-content");
  assert.ok(!screen.text.includes("Sanatçının hayatı ve eserleri"), "ISSUE-054 worksheet solution is hidden initially");
  assert.ok((await next()).includes("UYGULAMA DESTEĞİ"), "ISSUE-054 answer opens after advance");
  screen = await openStep("biyografi-akif-cozumleme-202-205", "s204-q1-second");
  assert.ok(!screen.text.includes("Kişi, olay, mekân ve zaman kurmaca"), "ISSUE-055 comparison groups are hidden initially");
  assert.ok((await next()).includes("UYGULAMA DESTEĞİ"), "ISSUE-055 answer opens after advance");
  screen = await openStep("biyografi-akif-cozumleme-202-205", "s205-q1-chronology");
  assert.ok(!screen.text.includes("Millî Mücadele ve İstiklâl Marşı"), "ISSUE-055 chronology is hidden initially");
  assert.ok((await next()).includes("UYGULAMA DESTEĞİ"), "ISSUE-055 chronology answer opens after advance");
  screen = await openStep("biyografi-akif-cozumleme-202-205", "s205-asim-q1");
  assert.ok(screen.text.includes("KAAN ve TCG Anadolu") && screen.text.includes("Göktürk-1 ve BİLSAT"), "ISSUE-056 source captions remain visible");
  assert.ok(!screen.text.includes("Güven güçlenerek sürüyor") && !screen.text.includes("çalışma ve sorumluluk"), "ISSUE-056 conclusion stays out of the task view");
  assert.ok((await next()).includes("UYGULAMA DESTEĞİ"), "ISSUE-056 model interpretation opens after advance");

  screen = await openStep("kemal-tahir-mulakat-210-214", "s214-q1");
  assert.ok(!screen.text.includes("İstanbul’u, musikiyi") && !screen.text.includes("Yeni bir hayat kurmak"), "ISSUE-057 both model messages are hidden initially");
  t3Reveal = await next();
  assert.ok(t3Reveal.includes("İstanbul") && !t3Reveal.includes("Yeni bir hayat kurmak"), "ISSUE-057 explicit message opens first");
  t3Reveal = await next();
  assert.ok(t3Reveal.includes("Örtük ileti") && !t3Reveal.includes("Yeni bir hayat kurmak"), "ISSUE-057 implicit-message prompt precedes its answer");
  assert.ok((await next()).includes("Yeni bir hayat kurmak"), "ISSUE-057 implicit message opens after its prompt");
  screen = await openStep("kemal-tahir-mulakat-210-214", "s214-eval");
  assert.ok(["Evet", "Kısmen", "Hayır"].every(label => screen.text.includes(label)), "ISSUE-058 three labels render");
  assert.equal(await page.evaluate("document.querySelectorAll('#canvas .scale-form__box').length"), 18, "ISSUE-058 six rows contain three empty choices");

  screen = await openStep("radyo-diyalog-yazma-225-229", "s225-reference");
  assert.ok(!screen.text.includes("Kişiler ve çatışmalar") && !screen.text.includes("Müzik ve efekt"), "ISSUE-061 type answers hidden initially");
  t3Reveal = await next();
  assert.ok(t3Reveal.includes("Kişiler ve çatışmalar") && t3Reveal.includes("Müzik ve efekt"), "ISSUE-061 type answers open after advance");
  screen = await openStep("degerlendirme-230-235", "s233-q11");
  assert.ok(!screen.text.includes("özellikle Tarafsızlık ve Kronoloji") && !screen.text.includes("hataları düzeltin"), "ISSUE-062 avoids naming the answer in the task");
  screen = await openStep("degerlendirme-230-235", "s235-q16");
  assert.ok(!screen.text.includes("Doğru cevap: C"), "ISSUE-064 answer stays hidden initially");
  assert.ok((await next()).includes("Doğru cevap: C — I, IV ve V."), "ISSUE-064 existing answer-bank answer opens in Chrome");

  for (const [stepId, phrase] of [["s169-reading", "Musiki, tarih ve şehir mirasını"], ["s170-reading", "Mümtaz’ın geçmiş ve kültür bağında"], ["s171-author", "Yahya Kemal–Ahmet Haşim"], ["s173-types-1", "Başkasının yaşamı"], ["s173-types-2", "Hareket ve merak"], ["s174-types-1", "Dönemini yansıtan"], ["s174-types-2", "Bireyin iç dünyası"]]) {
    screen = await openStep("huzur-okuma", stepId);
    assert.ok(!screen.text.includes(phrase), `ISSUE-065–073 ${stepId} answer hidden initially`);
    assert.ok((await next()).includes(phrase), `ISSUE-065–073 ${stepId} answer opens after advance`);
  }
  screen = await openStep("huzur-okuma", "s174-style");
  assert.ok(!screen.text.includes("betimleyici"), "ISSUE-073 style examples hidden initially");
  assert.ok((await next()).includes("betimleyici"), "ISSUE-073 style examples open after advance");

  screen = await openStep("tema-girisi-236-242", "s236-map");
  assert.ok(!screen.text.includes("Ben, Mimar Sinan") && !screen.text.includes("Anadolu İnsanı") &&
    !screen.text.includes("Okuma") && !screen.text.includes("Dinleme / İzleme") && !screen.text.includes("Konuşma ve yazma"),
  "ISSUE-074 answer map and skill labels are hidden initially");
  assert.ok((await advanceUntil((text) => text.includes("Ben, Mimar Sinan"), "s236 answer map")).includes("Ben, Mimar Sinan"), "ISSUE-074 skill map opens after the task");
  screen = await openStep("tema-girisi-236-242", "s240-fact-fiction");
  assert.ok(!screen.text.includes("Kaynağın verdiği tarihî") && !screen.text.includes("Kurduğunuz hayalî metin"), "ISSUE-076 classification result is hidden initially");
  assert.ok((await advanceUntil((text) => text.includes("Kaynağın verdiği tarihî"), "s240 classification answer")).includes("Kaynağın verdiği tarihî"), "ISSUE-076 classification result opens after the task");
  screen = await openStep("tema-girisi-236-242", "s237-threshold");
  assert.ok(!/karekodunu.*bu aşamada açın/i.test(screen.text), "ISSUE-075 QR operation stays out of the student view");

  screen = await openStep("ben-mimar-sinan-okuma-243-250", "s247-vocab");
  await revealDictionaryGroup(["çağdaş", "özge", "görkemli"], ["şevk", "avaze", "sadr-ı âzam"], "Aynı dönemde yaşayan", "Bir işi yapma isteği");
  screen = await openStep("ben-mimar-sinan-okuma-243-250", "s250-social-table");
  assert.ok(!screen.text.includes("Osmanlı dönemindeki askerî eğitim"), "ISSUE-078 first social-expression answer is hidden initially");
  assert.ok((await advanceUntil((text) => text.includes("Osmanlı dönemindeki askerî eğitim"), "s250 first answer")).includes("Osmanlı dönemindeki askerî eğitim"), "ISSUE-078 first social-expression group opens after the task");
  screen = await openStep("ben-mimar-sinan-okuma-243-250", "s250-social-table-rest");
  assert.ok(!screen.text.includes("Dönemin aydınlatma koşulları"), "ISSUE-078 remaining social-expression answer is hidden initially");
  assert.ok((await advanceUntil((text) => text.includes("Dönemin aydınlatma koşulları"), "s250 remaining answer")).includes("Dönemin aydınlatma koşulları"), "ISSUE-078 remaining social-expression group opens after the task");

  screen = await openStep("ben-mimar-sinan-cozumleme-256-259", "s256-elements");
  assert.ok(screen.text.includes("Kişiler") && screen.text.includes("Dramatik örgü"), "ISSUE-079 first structure group is visible");
  assert.ok(!screen.text.includes("Sinan merkezî kişidir"), "ISSUE-079 first structure answers stay hidden initially");
  let structureAnswer = await next();
  assert.ok(structureAnswer.includes("Sinan merkezî kişidir"));
  structureAnswer = await advanceUntil((text) => text.includes("Mekân ve zaman"), "s256 relation prompt");
  assert.ok(structureAnswer.includes("Mekân ve zaman"), "ISSUE-079 relation group follows the first answer group");
  screen = await openStep("ben-mimar-sinan-cozumleme-256-259", "s258-q2");
  assert.ok(!screen.text.includes("Sinan'ın düşünce") && !screen.text.includes("Görev, beklenti") &&
    !screen.text.includes("Monoloğun işlevi") && !screen.text.includes("Diyaloğun işlevi"),
  "ISSUE-080 monologue/dialogue answers are hidden initially");
  assert.ok((await next()).includes("Monolog"), "ISSUE-080 answer opens after the task");
  screen = await openStep("ben-mimar-sinan-cozumleme-256-259", "s258-grammar");
  assert.ok(!screen.text.includes("Kendisini ... bilmiyordu"), "ISSUE-081 classification task is not reversed");
  screen = await openStep("ben-mimar-sinan-cozumleme-256-259", "s258-grammar-apply");
  assert.ok(screen.text.includes("Kendisini ... bilmiyordu") && !screen.text.includes("isim"), "ISSUE-081 classification task starts before the answer");
  assert.ok((await advanceUntil((text) => text.includes("Ama nasıl?"), "s258 six-sentence task")).includes("Ama nasıl?"), "ISSUE-081 all six sentences are shown before the answer");
  assert.ok((await next()).includes("Fiil cümlesi"), "ISSUE-081 classifications open after the six-sentence task");

  screen = await openStep("merdiven-anlama-266-270", "s266-vocabulary");
  await revealDictionaryGroup(["daire", "yeni yetme", "kanı(mca)"], ["yol vermek", "gereksinme", "duralamak"], "büro veya kurum birimi", "geçebilmesi için yol açmak");
  screen = await openStep("merdiven-cozumleme-274-279", "s275-q2a");
  assert.ok(!screen.text.includes("Merdivenin yerini") && !screen.text.includes("Mimari") &&
    !screen.text.includes("Teknoloji") && !screen.text.includes("Korunabilecek tema"),
  "ISSUE-083 comparison examples and answer directions are hidden initially");
  assert.ok((await advanceUntil((text) => text.includes("asansör"), "s275 comparison answer")).includes("asansör"), "ISSUE-083 comparison answer opens after the task");
  screen = await openStep("merdiven-cozumleme-274-279", "s276-conflicts");
  assert.ok(!screen.text.includes("Yükselme/acele") && !screen.text.includes("İhtiyarın deneyimi"), "ISSUE-084 conflict answers are hidden initially");
  assert.ok((await next()).includes("Anlatıcının iş telaşı"), "ISSUE-084 conflict answer opens after the task");
  screen = await openStep("merdiven-cozumleme-274-279", "s277-whatif");
  assert.ok(!screen.text.includes("Yaşlı adamın iyi dileğini"), "ISSUE-085 counterfactual answers are not shown before the question");
  assert.ok((await next()).includes("Yaşlı adamın iyi dileğini"), "ISSUE-085 counterfactual answers open once in the follow-up task");
  screen = await openStep("anadolu-insani-284-290", "s287-vocab");
  await revealDictionaryGroup(["fedakârlık", "hemzemin geçit", "mesai"], ["aksaklık", "tahammül"], "kendi çıkarından", "olağan biçimde ilerlemesini bozan");
  screen = await openStep("merdiven-cozumleme-274-279", "s278-disciplines");
  assert.ok(screen.text.includes("Kurumda yaş/konum ilişkileri") && !screen.text.includes("Kuşak değişimi") &&
    !screen.text.includes("Sosyoloji, psikoloji"), "ISSUE-086 group 1 task is visible without group 2 or answers");
  assert.ok((await advanceUntil((text) => text.includes("Sosyoloji, psikoloji"), "s278 group 1 answer")).includes("Sosyoloji, psikoloji"), "ISSUE-086 group 1 answers open before group 2");
  const disciplineGroup2 = await advanceUntil((text) => text.includes("Anlatıcının kuşak değişimiyle yüzleşmesi"), "s278 group 2 prompt");
  assert.ok(disciplineGroup2.includes("Anlatıcının kuşak değişimiyle yüzleşmesi"));
  screen = await openStep("merdiven-cozumleme-274-279", "s279-q1");
  assert.ok(screen.text.includes("Varoluşçu tema") && !screen.text.includes("Simgeler") &&
    !screen.text.includes("Anlatıcının aceleyle işini görme alışkanlığı"), "ISSUE-087 group 1 task is visible without group 2 or answers");
  assert.ok((await advanceUntil((text) => text.includes("Anlatıcının aceleyle işini görme alışkanlığı"), "s279 group 1 answer")).includes("Anlatıcının aceleyle işini görme alışkanlığı"), "ISSUE-087 group 1 answers open before group 2");

  screen = await openStep("tiyatro-canlandirma-280-283", "s280-q2");
  assert.ok(!screen.text.includes("Karakterin amacı ve ilişkileri") && !screen.text.includes("Ses tonu, vurgu"), "ISSUE-089 role dimensions are hidden initially");
  assert.ok((await next()).includes("Karakterin amacı ve ilişkileri"), "ISSUE-089 role dimensions open after the task");
  screen = await openStep("tiyatro-canlandirma-280-283", "s280-subtext");
  assert.ok(!screen.text.includes("Metinde doğrudan duyulan"), "ISSUE-090 definitions are hidden initially");
  assert.ok((await advanceUntil((text) => text.includes("Metinde doğrudan duyulan"), "s280 definitions answer")).includes("Metinde doğrudan duyulan"), "ISSUE-090 definitions open after the task");
  screen = await openStep("anadolu-insani-cozumleme-291-297", "s295-q7");
  assert.ok(!screen.text.includes("göndergesel") && !screen.text.includes("heyecana bağlı"), "ISSUE-092 textbook function terms are hidden initially");
  assert.ok((await next()).includes("Göndergesel"), "ISSUE-092 textbook function terms open after the task");
  screen = await openStep("anadolu-insani-cozumleme-291-297", "s297-next");
  assert.ok(!screen.text.includes("olgu ile yorumu"), "ISSUE-093 example target is hidden initially");
  assert.ok((await advanceUntil((text) => text.toLocaleLowerCase("tr").includes("uygulanabilir hedef"), "s297 target support", 24)).includes("uygulanabilir hedef"), "ISSUE-093 target support opens after the task");
  screen = await openStep("afis-atolyesi-298-302", "s302-next");
  assert.ok(!screen.text.includes("ana iletiyi tasarımdan") && !screen.text.includes("3 kısa mesaj"), "ISSUE-094 example target is hidden initially");
  assert.ok((await advanceUntil((text) => text.toLocaleLowerCase("tr").includes("gözlenebilir hedef"), "s302 target support", 24)).includes("gözlenebilir hedef"), "ISSUE-094 target support opens after the task");

  screen = await openStep("degerlendirme-303-307", "s303-reading");
  assert.ok(!screen.text.includes("Hitap, dinî söyleyiş") && !screen.text.includes("şehitlik"), "ISSUE-096 answer examples are absent from the reading card");
  screen = await openStep("degerlendirme-303-307", "s304-q4");
  assert.ok(!screen.text.includes("Umut, sevgi, güven, merhamet"), "ISSUE-097 answer candidates are hidden initially");
  assert.ok((await next()).includes("Örnek duygu"), "ISSUE-097 example emotion opens after the task");
  screen = await openStep("degerlendirme-303-307", "s305-q5");
  assert.equal(await page.evaluate("document.querySelectorAll('#canvas .content-images img').length"), 4, "ISSUE-098 four source images render");
  assert.equal(await page.evaluate("Array.from(document.querySelectorAll('#canvas .content-images img')).every(image => image.naturalWidth > 100)"), true, "ISSUE-098 all source images load");
  screen = await openStep("degerlendirme-303-307", "s307-q11");
  assert.ok(screen.text.includes("Elif, yaptığı araştırmalar") && screen.text.includes("A) Televizyon") && screen.text.includes("E) İnternet"), "ISSUE-099 full question and choices are visible before the answer");
  assert.ok(!screen.text.includes("Doğru seçenek: B"), "ISSUE-099 correct option is hidden initially");
  assert.ok((await next()).includes("Doğru seçenek: B"), "ISSUE-099 correct option opens after the task");
  screen = await openStep("degerlendirme-303-307", "s307-q12");
  assert.ok(!screen.text.includes("Dijital üretim") && !screen.text.includes("teknolojinin tek başına"), "ISSUE-100 argument skeleton is hidden initially");
  screen = await openStep("degerlendirme-303-307", "s307-q14");
  assert.ok(!screen.text.includes("Yer, ilişki, kültür, emek, anı"), "ISSUE-101 answer categories are hidden initially");
  assert.ok((await next()).includes("Video kanıtı"), "ISSUE-101 source-limited answer guidance opens after the task");

  console.log("[sunum-web] Headless Chrome verified Theme 3 regressions and Theme 4 initial/reveal views.");
} finally {
  for (const client of clients) client.close();
  if (browser.exitCode === null) {
    browser.kill("SIGTERM");
    await Promise.race([new Promise((resolve) => browser.once("exit", resolve)), sleep(3000)]);
  }
  if (server.exitCode === null) {
    server.kill("SIGTERM");
    await Promise.race([new Promise((resolve) => server.once("exit", resolve)), sleep(1000)]);
  }
  fs.rmSync(profile, { recursive: true, force: true });
}
