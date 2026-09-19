# 11. sınıf Lesson Player — Atölye, portfolyo ve yıllık eser/film rehberi

**Kapsam:** Yalnız öğretmen görünümündeki bilgi paneli; öğrenci projeksiyonu ve mevcut ders adımları değiştirilmez.

## Kanonik kaynak ve yorum ayrımı

- Resmî 11. sınıf TYMM temaları (4): [Tema 1](https://tymm.meb.gov.tr/turk-dili-ve-edebiyati-dersi/unite/267), [Tema 2](https://tymm.meb.gov.tr/turk-dili-ve-edebiyati-dersi/unite/276), [Tema 3](https://tymm.meb.gov.tr/turk-dili-ve-edebiyati-dersi/unite/322), [Tema 4](https://tymm.meb.gov.tr/turk-dili-ve-edebiyati-dersi/unite/332).
- 2026 11. sınıf ders kitabının basılı sayfa aralıkları: `data/grade-11/source/textbook-map.json` ve mevcut Lesson Player kaynak kayıtları.
- Yıllık dört eser/bir film ve Ek-1: [MEB TYMM genelge açıklaması](https://www.meb.gov.tr/turkiye-yuzyili-maarif-modeline-iliskin-genelge-yayimlandi/haber/34511/tr). Üçüncü kaynak katmanı genel uygulama hükmüdür; dört tema PDF'sinde yer almaması hükmü geçersiz kılmaz.
- **Pedagojik öneri** (resmî hüküm değil): dosya düzeni, kitap sunularını temaların sonunda dağıtma, filmi ikinci döneme yerleştirme, bazı taslakları portfolyoya seçerek ekleme.

## Edebiyat Atölyesi ve portfolyo

Her temada ayrı **konuşma** ve **yazma** görevi vardır; iki tema/dönem → dört atölye ürünü/dönem → sekiz atölye ürünü/yıl.

| Tema | Konuşma atölyesi | Yazma atölyesi | Yansıtma |
|---|---|---|---|
| T1 | s.53–58 İletişim engellerini canlandırma | s.74–78 E-posta | s.78, 3-2-1 çıkış kartı |
| T2 | s.130–135 Türk dünyası konuşması | s.150–153 Çevrim içi müze izlenim yazısı | s.154, öğrenme günlüğü |
| T3 | s.210–214 Roman kişisiyle hayalî mülakat | s.225–229 Radyo tiyatrosu diyaloğu dönüştürme | s.229, çıkış kartı |
| T4 | s.280–283 Tiyatro canlandırma | s.298–302 Belgesel afişi | s.302, öğrenme günlüğü |

Atölye çıktısı ve geri bildirim dosyalanır; grup konuşmasında bireysel rol/katkı belirtilir; yalnız gelişimi gösteren taslaklar seçilir. Her kısa yanıt ya da sınıf içi kontrol listesi otomatik olarak ayrı bir portfolyo ödevi değildir.

## Dört eser + bir film

- Dönem 1: eser 1 ve 2.
- Dönem 2: eser 3 ve 4; **film ikinci döneme yerleştirilebilir ama hüküm yalnızca yıl içinde bir film** ister.
- Her ayrı çalışma için öğrencinin Ek-1 değerlendirmesi ve buna bağlı sunusu takip edilir.
- Dört eser/film kanıtı, tema içi sekiz atölye ürününün yerine geçirilmez.

## Puanlama güvenlik sınırı

`teacher-workflow.json` yalnız görev ve belge **rehberidir**; öğrenci adları, notlar, puanlar veya teslim durumları saklanmaz. Derste değerlendirilen atölye görevlerinin sonuçları ve eser/film değerlendirmesi ayrı izlenir. **Dört atölyenin basit ortalaması = performans notu** diye kanonik bir formül kodlanmaz; zümrenin ve geçerli ölçme-değerlendirme hükümlerinin belirlediği yöntem uygulanır. Kitapta erişilemeyen QR rubriklerinin düzey betimleyicileri bu panelde uydurulmaz.

## Arayüz

Üst menüde **Öğretmen rehberi**: güncel dersin temasını ve basılı sayfasını kullanarak ilgili görevi öne çıkarır; iki tema ürünü, tema yansıtması, o dönemin eser/film takibi, değerlendirme ve portfolyo ayrımı gösterilir. **Projeksiyon ve bağımsız öğrenci ekranı** bu öğretmen panelini göstermez. Veri kaynağı: `apps/lesson-player/src/teacher-workflow.json`; kapsam regresyon testi: `npm run test:data`.
