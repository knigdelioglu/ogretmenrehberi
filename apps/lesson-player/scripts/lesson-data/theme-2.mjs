// Theme-specific assertions extracted without changing their order or conditions.
export function checkTheme2({ lessons, byLessonId, assert, theme2Lessons }) {
const theme2Intro = byLessonId.get("T11-T02-GIRIS");
assert(theme2Intro, "2. Tema giriş dersi catalog içinde bulunamadı.");
assert(
  theme2Intro.lesson_slug === "tema-2-girisi",
  "2. Tema giriş lesson_slug benzersiz ve doğru olmalı."
);
assert(
  theme2Intro.printed_page_range === "84-88",
  "2. Tema giriş bloğu kitapta s.84–88 aralığını kapsamalı."
);
assert(
  theme2Intro.coverage.steps === 15 &&
    theme2Intro.coverage.source_records === 14 &&
    theme2Intro.coverage.answer_entries === 12,
  "2. Tema giriş bloğu 15 adım / 14 source / 12 answer olmalı."
);

const theme2IntroById = new Map(
  theme2Intro.steps.map((step) => [step.id, step])
);
assert(
  theme2IntroById.get("s84-overview")?.answer === null &&
    theme2IntroById.get("s84-overview")?.layout === "reference" &&
    theme2IntroById.get("s85-theme-presentation")?.answer === null,
  "s.84–85 tema açılışı cevapsız referans ekranları olarak korunmalı."
);
const s85Theme = theme2IntroById.get("s85-theme-presentation");
assert(
  s85Theme?.display_prompt.includes("Tema Sunusu") &&
    s85Theme?.content?.sections?.some((section) =>
      section.body.includes("Onlar da bu dünyadan geldi geçti")
    ) &&
    s85Theme?.content?.sections?.some((section) =>
      section.body.includes("karekod")
    ),
  "s.85 Dede Korkut alıntısı ve Tema Sunusu karekod hatırlatması görünür olmalı."
);
assert(
  theme2IntroById.get("s86-q1")?.answer?.question_id === "T2-P86-Q01" &&
    theme2IntroById.get("s86-q3")?.answer?.guidance,
  "s.86 Vatan yahut Silistre soruları ve gerekli yönlendirme erişilebilir olmalı."
);
assert(
  theme2IntroById.get("s87-q1")?.answer?.explanation?.includes("Alfabe") &&
    theme2IntroById.get("s87-q2")?.answer?.evidence_quotes?.length === 1,
  "s.87 alfabe-yazı dili ayrımı ve metin kanıtı korunmalı."
);
const s88Questions = ["s88-q1", "s88-q2", "s88-q3", "s88-q4", "s88-q5", "s88-q6"]
  .map((id) => theme2IntroById.get(id)?.answer);
assert(
  s88Questions.every((answer) => answer?.entry_type === "question_answer") &&
    s88Questions.every((answer) => answer?.source_locator?.includes("QR video")),
  "s.88 soruları soru kökünden cevaplanabilir kalmalı; QR kaynak izi korunmalı."
);
assert(
  /gördüğü|duyduğu/i.test(s88Questions[0]?.guidance ?? "") &&
    !/videoda.*(kesin|gerçek).*(tören|imece|sahne)/i.test(
      s88Questions.map((answer) => answer.answer).join(" ")
    ) &&
    !/ülke.*şehir.*bölge/i.test(s88Questions[2]?.answer_sections?.["Örnek Cevap Çerçevesi"] ?? ""),
  "s.88 videoya ait ayrıntı uydurulmamalı; kişisel coğrafya çağrışımına liste dayatılmamalı."
);
assert(
  theme2IntroById.get("s88-q1")?.answer?.guidance &&
    theme2IntroById.get("s88-q5")?.answer?.guidance,
  "s.88 video kanıtı yalnız gözlenmiş örneklerden kurulmalı."
);
for (const step of theme2Intro.steps) {
  assert(
    step.source.source_status === "VERIFIED",
    `2. Tema giriş source kaydı VERIFIED olmalı: ${step.source.source_record_id}`
  );
}

const ogullaBulusma = byLessonId.get("T11-T02-OGULLA-BULUSMA");
assert(ogullaBulusma, "2. Tema Oğulla Buluşma dersi catalog içinde bulunamadı.");
assert(
  ogullaBulusma.printed_page_range === "89-107",
  "Oğulla Buluşma doğal bloğu s.89–107 aralığını kapsamalı."
);
assert(
  ogullaBulusma.coverage.steps === 37 &&
    ogullaBulusma.coverage.source_records === 32 &&
    ogullaBulusma.coverage.answer_entries === 36,
  "Oğulla Buluşma 37 adım / 32 source / 36 answer olmalı."
);

const ogullaById = new Map(ogullaBulusma.steps.map((step) => [step.id, step]));
assert(
  ogullaById.get("s89-common-words")?.answer?.question_id === "T2-P89-PERF01" &&
    ogullaById.get("s89-common-words")?.layout === "process",
  "s.89 Türk Dilleri araştırması performance/process olarak korunmalı."
);
assert(
  ogullaById.get("s90-95-reading")?.answer === null &&
    ogullaById.get("s90-95-reading")?.source?.printed_page_range === "90-95",
  "Oğulla Buluşma ana metni yeniden yayımlanmadan s.90–95 okuma süreci olarak temsil edilmeli."
);
assert(
  ogullaById.get("s95-q1")?.layout === "vocabulary" &&
    Object.keys(ogullaById.get("s95-q1")?.answer?.answer_sections ?? {}).length === 6,
  "s.95 söz varlığı altı yapılandırılmış kelime tanımını taşımalı."
);
assert(
  ogullaById.get("s96-q4a")?.layout === "structure" &&
    ogullaById.get("s98-q4c")?.layout === "comparison",
  "Türk şiveleri çalışması yapı ve karşılaştırma görünümlerini kullanmalı."
);
assert(
  ogullaById.get("s100-q3")?.answer?.answer_sections?.["Eşinin metinde verdiği tepki"] &&
    Object.keys(ogullaById.get("s100-q3")?.answer?.answer_sections ?? {}).length === 3 &&
    !/insanlar.*genellikle/i.test(ogullaById.get("s100-q3")?.answer?.answer ?? "") &&
    ogullaById.get("s100-q3")?.answer?.guidance &&
    ogullaById.get("s101-q10")?.answer?.guidance &&
    Object.keys(ogullaById.get("s101-q10")?.answer?.answer_sections ?? {}).includes("ortuk_iletiler"),
  "s.100 tepki/yorum/öğrenci değerlendirmesi ayrılmalı; s.101 örtük ileti için kanıt ve alternatifler korunmalı."
);
assert(
  ogullaById.get("s102-103-gram1")?.source?.printed_page_range === "102-103" &&
    ogullaById.get("s103-gram2")?.answer?.question_id === "T2-P103-GRAM02" &&
    ogullaById.get("s104-gram3")?.answer?.question_id === "T2-P104-GRAM03" &&
    ogullaById.get("s104-gram4")?.answer?.question_id === "T2-P104-GRAM04",
  "s.102–104 dört dil bilgisi görevi doğru sayfa ve answer kayıtlarıyla korunmalı."
);
assert(
  ogullaById.get("s105-q1")?.layout === "structure" &&
    ogullaById.get("s105-q2")?.layout === "structure",
  "s.105 hikâye haritası ve ilişkiler yapılandırılmış görünümde olmalı."
);
assert(
  ogullaById.get("s106-discussion")?.answer?.entry_type === "performance_support" &&
    ogullaById.get("s107-conflict-group")?.answer?.entry_type === "performance_support" &&
    ogullaById.get("s107-values")?.answer?.entry_type === "performance_support",
  "s.106–107 tartışma/grup/değer çalışmaları klasik cevap anahtarına zorlanmamalı."
);
assert(
  ogullaById.get("s107-aytmatov")?.answer?.question_id === "T2-P107-AYTMATOV",
  "s.107 Aytmatov Fark Edelim cevabı erişilebilir olmalı."
);

for (const lesson of theme2Lessons) {
  for (const step of lesson.steps) {
    assert(
      step.source.source_status === "VERIFIED",
      `Tema 2 kullanılan source kaydı VERIFIED olmalı: ${step.source.source_record_id}`
    );
  }
}

const eskiIstanbul = byLessonId.get("T11-T02-ESKI-ISTANBUL");
assert(eskiIstanbul, "2. Tema Eski İstanbul dersi catalog içinde bulunamadı.");
assert(
  eskiIstanbul.printed_page_range === "108-112",
  "Eski İstanbul doğal bloğu s.108–112 aralığını kapsamalı."
);
assert(
  eskiIstanbul.coverage.steps === 15 &&
    eskiIstanbul.coverage.source_records === 11 &&
    eskiIstanbul.coverage.answer_entries === 14,
  "Eski İstanbul bloğu 15 adım / 11 source / 14 answer olmalı."
);

const eskiById = new Map(eskiIstanbul.steps.map((step) => [step.id, step]));
assert(
  eskiById.get("s108-social-sciences")?.answer?.entry_type === "performance_support" &&
    eskiById.get("s108-social-sciences")?.layout === "process",
  "s.108 Oğulla Buluşma sosyal bilimler görevi performance/process olmalı."
);
assert(
  eskiById.get("s108-110-reading")?.answer === null &&
    eskiById.get("s108-110-reading")?.source?.printed_page_range === "108-110",
  "Eski İstanbul ana metni kopyalanmadan s.108–110 yönlendirilmiş okuma olarak temsil edilmeli."
);
assert(
  eskiById.get("s111-q1")?.layout === "comparison" &&
    eskiById.get("s111-card-technique")?.answer?.entry_type === "performance_support" &&
    eskiById.get("s111-social-sciences")?.answer?.explanation?.includes("Anı"),
  "s.111 karşılaştırma, kart gösterme ve anı-sosyal bilimler rehberliği korunmalı."
);
assert(
  eskiById.get("s112-q5")?.answer?.evidence_quotes?.length === 3 &&
    eskiById.get("s112-exit")?.answer?.entry_type === "performance_support" &&
    eskiById.get("s112-exit")?.layout === "assessment",
  "s.112 ifade seçimi ve 3-2-1 çıkış kartı doğru katmanlarla korunmalı."
);

assert(
  theme2Lessons.reduce((sum, lesson) => sum + lesson.coverage.steps, 0) === 190 &&
    theme2Lessons.reduce((sum, lesson) => sum + lesson.coverage.source_records, 0) === 158 &&
    theme2Lessons.reduce((sum, lesson) => sum + lesson.coverage.answer_entries, 0) === 167,
  "Tema 2 tam kapsam 190 adım / 158 source / 167 answer olmalı."
);

const orhun = byLessonId.get("T11-T02-ORHUN");
assert(orhun, "2. Tema Orhun Abideleri dersi catalog içinde bulunamadı.");
assert(
  orhun.printed_page_range === "113-124",
  "Orhun Abideleri doğal bloğu s.113–124 aralığını kapsamalı."
);
assert(
  orhun.coverage.steps === 34 &&
    orhun.coverage.source_records === 30 &&
    orhun.coverage.answer_entries === 32,
  "Orhun Abideleri 34 adım / 30 source / 32 answer olmalı."
);

const orhunById = new Map(orhun.steps.map((step) => [step.id, step]));
const orhunOrderedIds = orhun.steps.map((step) => step.id);
assert(
  orhunById.get("s113-media-reminder")?.layout === "process" &&
    orhunOrderedIds.indexOf("s113-media-reminder") <
      orhunOrderedIds.indexOf("s113-q1"),
  "s.113 Orhun Vadisi video hatırlatması ilk sorudan önce gelmeli."
);
assert(
  orhunById.get("s113-q1")?.answer?.entry_type === "source_limited" &&
    orhunById.get("s113-q1")?.answer?.guidance,
  "s.113 QR video sorusu source_limited ve yönlendirmeli kalmalı."
);
assert(
  orhunById.get("s114-115-reading")?.answer === null &&
    orhunById.get("s114-115-reading")?.layout === "process",
  "Kül Tigin ana metni kopyalanmadan yönlendirilmiş okuma olarak temsil edilmeli."
);
assert(
  orhunById.get("s116-vocabulary")?.layout === "vocabulary" &&
    Object.keys(orhunById.get("s116-vocabulary")?.answer?.answer_sections ?? {}).length === 6 &&
    orhunById.get("s116-vocabulary")?.answer?.answer_sections?.["şad"]?.includes("bulunmuyor"),
  "s.116 söz varlığı altı sözcüğü ve kitaptaki şad tanım eksikliğini dürüstçe korumalı."
);
assert(
  orhunById.get("s118-rhetoric")?.layout === "structure" &&
    orhunById.get("s119-compare")?.layout === "comparison" &&
    Object.keys(orhunById.get("s119-compare")?.answer?.answer_sections ?? {}).length === 6,
  "s.118 söz sanatları ve s.119 metin karşılaştırması yapılandırılmış görünüm kullanmalı."
);
assert(
  orhunById.get("s121-q3")?.layout === "structure" &&
    orhunById.get("s122-q2")?.layout === "structure" &&
    orhunById.get("s122-q4")?.layout === "structure" &&
    orhunById.get("s123-q5")?.layout === "structure",
  "s.121–123 çözümleme tabloları yapılandırılmış görünümde olmalı."
);
assert(
  orhunById.get("s124-values")?.answer?.entry_type === "performance_support" &&
    orhunById.get("s124-social-sciences")?.answer?.entry_type === "performance_support" &&
    orhunById.get("s124-social-sciences")?.source?.printed_page_range === "124-125",
  "s.124 değerler ve s.124-125 sosyal bilimler çalışmaları performance olarak korunmalı."
);
const p117Answer = orhunById.get("s117-q2")?.answer;
const p119Reality = orhunById.get("s119-q1")?.answer;
assert(
  p117Answer?.answer &&
    !/granit|şeffaflık|hesap verebilirlik|kutsal bir sözleşme/i.test(p117Answer.answer) &&
    p117Answer.answer.includes("gelecek kuşak") &&
    p119Reality?.answer.includes("tarihî tanıklık") &&
    p119Reality.answer.includes("bakış açısı") &&
    /kendiliğinden tarafsız|otomatik.*nesnel/i.test(p119Reality.answer),
  "s.117 taşa ilişkin kanıtsız ayrıntı içermemeli; s.119 belge niteliği bakış açısından ayrılmalı."
);
const p117Advice = orhunById.get("s117-q3")?.answer?.answer_sections;
assert(
  Array.isArray(p117Advice?.["Metindeki öğüt ve dayanak"]) &&
    p117Advice?.["Günümüzle gerekçeli bağlantı"] &&
    !/refah devleti|jeopolitik çıkar|modern hukukun üstünlüğü/i.test(
      JSON.stringify(p117Advice["Metindeki öğüt ve dayanak"])
    ),
  "s.117 öğütlerin metinsel dayanağı ile güncel benzetmeler ayrı tutulmalı."
);

const divan = byLessonId.get("T11-T02-DIVANU-LUGATIT-TURK");
assert(divan, "2. Tema Dîvânu Lugâti’t-Türk dersi catalog içinde bulunamadı.");
assert(
  divan.printed_page_range === "125-128",
  "Dîvânu Lugâti’t-Türk doğal bloğu s.125–128 aralığını kapsamalı."
);
assert(
  divan.coverage.steps === 15 &&
    divan.coverage.source_records === 15 &&
    divan.coverage.answer_entries === 14,
  "Dîvânu Lugâti’t-Türk 15 adım / 15 source / 14 answer olmalı."
);

const divanById = new Map(divan.steps.map((step) => [step.id, step]));
assert(
  divanById.get("s125-126-reading")?.answer === null &&
    divanById.get("s125-126-reading")?.source?.printed_page_range === "125-126",
  "Dîvânu Lugâti’t-Türk ara metni kopyalanmadan yönlendirilmiş okuma olarak temsil edilmeli."
);
assert(
  divanById.get("s127-q2")?.answer?.evidence_quotes?.length === 2 &&
    divanById.get("s127-q3")?.answer?.evidence_quotes?.length === 2,
  "s.127 dil bilimi ve kültür sorularındaki metin kanıtları korunmalı."
);
assert(
  divanById.get("s127-q6")?.layout === "comparison" &&
    divanById.get("s127-q6")?.answer?.answer_sections?.kul_tigin,
  "Kül Tigin / Dîvânu karşılaştırması yapılandırılmış comparison görünümünde olmalı."
);
assert(
  divanById.get("s127-q7")?.answer?.entry_type === "performance_support" &&
    divanById.get("s127-q7")?.layout === "process",
  "Türk dilleri sözlüğü hazırlama görevi performance/process olarak korunmalı."
);
assert(
  divanById.get("s127-fark2")?.answer?.guidance &&
    divanById.get("s128-q2")?.answer?.explanation,
  "Açık uçlu değerlendirmelerde guidance ve gerçeklik açıklaması korunmalı."
);

const speaking2 = byLessonId.get("T11-T02-KONUSMA");
assert(speaking2, "2. Tema Konuşma dersi catalog içinde bulunamadı.");
assert(
  speaking2.printed_page_range === "129-135",
  "2. Tema Konuşma doğal bloğu s.129–135 aralığını kapsamalı."
);
assert(
  speaking2.coverage.steps === 19 &&
    speaking2.coverage.source_records === 13 &&
    speaking2.coverage.answer_entries === 14,
  "2. Tema Konuşma 19 adım / 13 source / 14 answer olmalı."
);

const speaking2ById = new Map(speaking2.steps.map((step) => [step.id, step]));
const speaking2OrderedIds = speaking2.steps.map((step) => step.id);
assert(
  speaking2ById.get("s129-media-reminder")?.layout === "process" &&
    speaking2OrderedIds.indexOf("s129-media-reminder") <
      speaking2OrderedIds.indexOf("s129-q1"),
  "s.129 video hatırlatması kaynak sınırlı sorudan önce gelmeli."
);
assert(
  speaking2ById.get("s129-q1")?.answer?.entry_type === "source_limited" &&
    speaking2ById.get("s129-q1")?.answer?.guidance,
  "s.129 QR-video sorusu source_limited ve yönlendirmeli kalmalı."
);
assert(
  speaking2ById.get("s130-plan")?.answer?.entry_type === "performance_support" &&
    speaking2ById.get("s130-stations")?.content?.items?.length === 6,
  "s.130 planlama ve altı istasyonlu performans görevi korunmalı."
);
assert(
  speaking2ById.get("s132-133-comparison")?.layout === "comparison" &&
    speaking2ById.get("s132-133-comparison")?.answer?.guidance,
  "s.132–133 ülke kültürü araştırması hazır kalıplara zorlanmadan comparison olmalı."
);
assert(
  speaking2ById.get("s133-production-1")?.answer === null &&
    speaking2ById.get("s133-production-2")?.answer?.question_id === "T2-P133-PERF01" &&
    speaking2ById.get("s133-speech")?.answer?.question_id === "T2-P133-PERF02",
  "s.133 üretim zinciri yoğunluğu iki süreç ekranına bölünmeli ve örnek konuşma ayrı kalmalı."
);
assert(
  (speaking2ById.get("s134-rules-1")?.content?.items?.length ?? 0) +
    (speaking2ById.get("s134-rules-2")?.content?.items?.length ?? 0) === 12 &&
    speaking2ById.get("s134-rules-2")?.answer?.question_id === "T2-P134-PERF01",
  "s.134 konuşma uygulama ölçütleri iki ekranda toplam 12 görünür ölçüt olarak korunmalı."
);
assert(
  (speaking2ById.get("s135-self-1")?.content?.items?.length ?? 0) +
    (speaking2ById.get("s135-self-2")?.content?.items?.length ?? 0) === 10 &&
    speaking2ById.get("s135-self-2")?.answer?.question_id === "T2-P135-PERF01",
  "s.135 öz değerlendirme formundaki 10 ölçüt iki ekranda korunmalı."
);
assert(
  speaking2ById.get("s135-reference")?.answer === null &&
    speaking2ById.get("s135-reference")?.source?.source_record_id === "T02-S0115" &&
    speaking2ById.get("s135-reference")?.content?.sections?.some(
      (section) => section.title === "Kaynak sınırı"
    ),
  "s.135 QR dereceli/akran formları görünmeyen ayrıntılar uydurulmadan referans ekranında kalmalı."
);

const asik = byLessonId.get("T11-T02-ASIK-ATISMASI");
assert(asik, "2. Tema Âşık Atışması dersi catalog içinde bulunamadı.");
assert(
  asik.printed_page_range === "136-147",
  "Âşık Atışması doğal bloğu s.136–147 aralığını kapsamalı."
);
assert(
  asik.coverage.steps === 27 &&
    asik.coverage.source_records === 22 &&
    asik.coverage.answer_entries === 25,
  "Âşık Atışması 27 adım / 22 source / 25 answer olmalı."
);

const asikById = new Map(asik.steps.map((step) => [step.id, step]));
assert(
  asikById.get("s137-plan")?.answer?.entry_type === "performance_support" &&
    asikById.get("s139-checklist")?.content?.items?.length === 6 &&
    asikById.get("s139-observation")?.answer === null,
  "Dinleme planı, altı maddelik kontrol listesi ve öğretmen gözlemi ayrı süreçler olarak korunmalı."
);
assert(
  asikById.get("s140-listen")?.answer === null &&
    asikById.get("s140-vocabulary")?.answer?.entry_type === "source_limited" &&
    asikById.get("s140-vocabulary")?.content?.items?.length === 5,
  "Gerçek video dinleme adımı ile bağlama bağımlı beş sözcük ayrılmalı."
);
assert(
  asikById.get("s142-q2")?.answer?.entry_type === "source_limited" &&
    asikById.get("s143-language")?.answer?.entry_type === "source_limited" &&
    asikById.get("s144-map")?.answer?.entry_type === "source_limited",
  "Benzetme, video dili ve çok modlu unsur çözümlemeleri kaynak-sınırlı kalmalı."
);
assert(
  asikById.get("s145-hats")?.answer?.entry_type === "source_limited" &&
    Object.keys(asikById.get("s145-hats")?.answer?.answer_sections ?? {}).length === 6,
  "Altı şapka çerçevesi korunmalı ancak gerçek video içeriği uydurulmamalı."
);
assert(
  asikById.get("s146-viewpoints")?.answer?.entry_type === "performance_support" &&
    asikById.get("s146-viewpoints")?.content?.items?.length === 4,
  "s.146 görüş geliştirme dört kitap yargısını görünür tutmalı."
);
assert(
  asikById.get("s147-q1")?.answer?.entry_type === "source_limited" &&
    asikById.get("s147-reflection")?.answer?.entry_type === "performance_support" &&
    asikById.get("s147-reflection")?.content?.items?.length === 5,
  "s.147 performans değerlendirmesi kaynak-sınırlı; yansıtıcı yazı beş soruluk yapı olmalı."
);

const museumWriting = byLessonId.get("T11-T02-YAZMA");
assert(museumWriting, "2. Tema çevrim içi müze yazma dersi bulunamadı.");
assert(
  museumWriting.printed_page_range === "148-154" &&
    museumWriting.coverage.steps === 18 &&
    museumWriting.coverage.source_records === 12 &&
    museumWriting.coverage.answer_entries === 11,
  "Tema 2 Yazma s.148–154, 18 adım / 12 source / 11 answer olmalı."
);
const museumById = new Map(museumWriting.steps.map((step) => [step.id, step]));
assert(
  museumById.get("s148-reference")?.answer === null &&
    museumById.get("s148-reference")?.layout === "reference" &&
    museumById.get("s150-task")?.answer === null,
  "Sanal Müzecilik ve Müzeler ve Toplum metinleri yeniden yayımlanmadan süreç olarak temsil edilmeli."
);
assert(
  museumById.get("s149-research")?.answer?.question_id === "T2-P149-PERF01" &&
    Array.isArray(museumById.get("s149-research")?.answer?.answer_sections) &&
    museumById.get("s149-research")?.answer?.answer_sections?.length === 4 &&
    museumById.get("s149-select")?.answer?.entry_type === "performance_support",
  "s.149 müze araştırmasının liste biçimli desteği ve gerçek seçim yönlendirmesi korunmalı."
);
assert(
  museumById.get("s151-compare")?.layout === "comparison" &&
    museumById.get("s151-carriers")?.layout === "structure" &&
    museumById.get("s151-enrich")?.answer?.entry_type === "performance_support",
  "s.151 karşılaştırma, kültür taşıyıcıları ve yazı zenginleştirme ayrı adımlar olmalı."
);
assert(
  (museumById.get("s152-rules-1")?.content?.items?.length ?? 0) +
    (museumById.get("s152-rules-2")?.content?.items?.length ?? 0) === 13 &&
    museumById.get("s152-draft")?.answer?.entry_type === "performance_support" &&
    museumById.get("s152-check")?.content?.items?.length === 10,
  "s.152 on üç yazma ölçütü, kişisel izlenim iskeleti ve on maddelik kontrol ayrı korunmalı."
);
assert(
  (museumById.get("s153-self-1")?.content?.items?.length ?? 0) +
    (museumById.get("s153-self-2")?.content?.items?.length ?? 0) === 10 &&
    museumById.get("s153-rubric")?.answer === null &&
    museumById.get("s153-rubric")?.content?.sections?.some(
      (section) => section.title === "Kaynak sınırı"
    ),
  "s.153 öz değerlendirme 10 ölçüt içermeli; QR formları kaynak görülmeden uydurulmamalı."
);
const s153Order = museumWriting.steps.map((step) => step.id);
const s153Feedback = museumById.get("s153-feedback");
assert(
  s153Order.indexOf("s152-draft") < s153Order.indexOf("s153-self-1") &&
    s153Order.indexOf("s153-self-2") < s153Order.indexOf("s153-feedback") &&
    s153Feedback?.content?.items?.some((item) => /ilk taslak.*kanıt/i.test(item)) &&
    s153Feedback?.content?.items?.some((item) => /geri dön.*aynı ölçüt/i.test(item)),
  "s.153 taslak → öz değerlendirme → kanıta dayalı düzeltme → aynı ölçüte dönüş döngüsü erişilebilir olmalı."
);
assert(
  Object.keys(museumById.get("s154-journal")?.answer?.answer_sections ?? {}).length === 5 &&
    museumById.get("s154-journal")?.answer?.entry_type === "performance_support",
  "s.154 öğrenme günlüğünün beş gerçek başlığı model olarak korunmalı."
);
for (const step of museumWriting.steps) {
  assert(step.source.source_status === "VERIFIED",
    `Yazma source kaydı VERIFIED olmalı: ${step.source.source_record_id}`);
}


const theme2Assessment = byLessonId.get("T11-T02-DEGERLENDIRME");
assert(theme2Assessment, "Tema 2 değerlendirme dersi bulunamadı.");
assert(
  theme2Assessment.printed_page_range === "155-159" &&
    theme2Assessment.coverage.steps === 10 &&
    theme2Assessment.coverage.source_records === 9 &&
    theme2Assessment.coverage.answer_entries === 9,
  "Tema 2 değerlendirme 10 adım / 9 source / 9 answer olmalı."
);
const assessment2ById = new Map(theme2Assessment.steps.map(step => [step.id, step]));
assert(
  assessment2ById.get("s156-source")?.answer === null &&
    assessment2ById.get("s156-source")?.content?.sections?.length === 3,
  "s.156 üç eser bilgi kartı cevap uydurulmadan referans ekranında bulunmalı."
);
for (const [id, qid] of [["s155-q1", "T2-P155-Q01"], ["s155-q2", "T2-P155-Q02"], ["s157-q3", "T2-P157-Q03"], ["s157-q4", "T2-P157-Q04"], ["s157-q5", "T2-P157-Q05"], ["s158-q6", "T2-P158-Q06"], ["s159-q7", "T2-P159-Q07"], ["s159-q8", "T2-P159-Q08"], ["s159-q9", "T2-P159-PERF01"]]) {
  assert(assessment2ById.get(id)?.answer?.question_id === qid, `Tema 2 değerlendirme cevap bağlantısı eksik: ${id}`);
}
assert(
  assessment2ById.get("s157-q3")?.answer?.answer.startsWith("Doğru cevap: A.") &&
    assessment2ById.get("s157-q5")?.answer?.answer.startsWith("Doğru cevap: B") &&
    assessment2ById.get("s158-q6")?.answer?.answer.startsWith("Doğru cevap: D."),
  "s.157–158 çoktan seçmeli cevaplar kitap ve atışma ile eşleşmeli."
);
assert(
  assessment2ById.get("s159-q7")?.answer?.answer.includes("Ahmet") &&
    assessment2ById.get("s159-q7")?.display_prompt.includes("7/b"),
  "s.159 soru 7 yanlış değerlendirme ve kişisel yanıtı birlikte kapsamalı."
);
assert(
  assessment2ById.get("s159-q8")?.answer?.entry_type === "source_limited" &&
    assessment2ById.get("s159-q9")?.answer?.entry_type === "performance_support",
  "QR ayrıntıları uydurulmamalı, slogan tek doğru gibi sunulmamalı."
);
for (const step of theme2Assessment.steps) {
  assert(step.source.source_status === "VERIFIED", `Tema 2 assessment source VERIFIED olmalı: ${step.source.source_record_id}`);
}

}
