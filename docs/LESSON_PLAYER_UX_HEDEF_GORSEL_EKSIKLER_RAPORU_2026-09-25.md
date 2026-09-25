# Lesson Player UX — hedef görsel eksik analizi

**Tarih:** 25 Eylül 2026  
**Karar:** `NEEDS_IMPROVEMENT`  
**Kapsam:** Görseldeki yatay tablet ders ekranının Android Compose karşılığı (`apps/lesson-player-android`).

## Kullanıcı hedefi

Öğretmen dersi kitap sırasıyla bulup yürütmeli; aktif adımı, sınıf/kitap bağlamını ve sonraki eylemi kolayca görmeli; öğretmen desteğini öğrenciye göstermeden açabilmeli ve ekrana rahatça dokunup okuyabilmeli.

Görseldeki kenar notları hedef arayüz özellikleri olarak değerlendirildi. Doğrudan kullanıcı isteği, bu hedefle mevcut uygulama arasındaki eksikleri raporlamaktı; bu nedenle kod değiştirilmedi. Alttaki beş küçük ekranı, ayrı gezinme şartı değil, farklı ders içeriklerinin görsel örnekleri olarak ele aldım.

## Kısa sonuç

Android uygulamasında hedefin ana iskeleti büyük ölçüde mevcut: yatay tablette üç sütun, ders adımı listesi, ilerleme göstergesi, ayrı öğretmen destek kartları, öğrenciye gösterme ve doğrudan önceki/sonraki kontrolleri var. En belirgin açık, kodun kullandığı sütun oranlarının hem görselden hem de kendi tasarım sözleşmesinden farklı olması. Hızlı erişim ve adım/kitap hiyerarşisi de hedefteki kadar görünür değil.

Tasarım brifi Android tablet kapsamını açıkça ayırıyor. Web oynatıcı (`apps/lesson-player`) farklı bir arayüzdür; bu rapor web sürümünün hedef görsele taşınmış olduğunu varsaymıyor. Web sürümü hedefleniyorsa ayrıca incelenmeli.

## Bulgular

### P1 — Tablet düzeninde çalışma alanı hedefe göre dar, öğretmen paneli fazla geniş

Geniş tablette kod sütunları `%22 sol / %45 orta / %33 sağ` oranlarını kullanıyor. Tasarım sözleşmesi `%22 / %56 / %22` tarif ediyor. Üç sütun yatay pencerede `1000 dp` genişlik ve `560 dp` yükseklik eşiğinde etkinleştiğinden, genişlik eşiğinin hemen üzerinde orta alan nominal olarak yaklaşık `450 dp` kalıyor; sistem inset'leri kullanılabilir genişliği daha da azaltabilir. Soru, uzun metin ve karşılaştırma/tablo içeriği ana görevken sağdaki ikincil öğretmen panelinin daha fazla alan alması hedef hiyerarşisini tersine çeviriyor.

Kanıt: [LessonPlayerApp.kt](../apps/lesson-player-android/app/src/main/java/io/github/knigdelioglu/lessonplayer/ui/LessonPlayerApp.kt#L297) ve [LessonWindowLayout.kt](../apps/lesson-player-android/app/src/main/java/io/github/knigdelioglu/lessonplayer/ui/LessonWindowLayout.kt#L22). Karşılaştırma hedefi: [android-ui-v2.md](android-ui-v2.md#L54).

**Öneri:** Orta çalışma alanını yaklaşık `%56`, öğretmen panelini yaklaşık `%22` yapın. Üç sütunu yalnızca kalan orta alan gerçek içerik için yeterli genişliğe ulaştığında açın; daha dar pencerelerde mevcut çekmece düzenini kullanın.

### P2 — Hızlı erişim hedefleri ders ekranında sürekli görünmüyor; “Notlarım” yok

Ders arama ve kaldığın derse devam etme var, ancak ikisi de `Ders kitaplığı` ekranında. Ders ekranındaki sabit sol menüde kitaplık, ders, öğretmen rehberi ve ayarlar bulunuyor; devam et/arama kısayolu yok. `AppScreen` içinde kişisel notlar ekranı da tanımlı değil. Kaynak içeriğindeki öğretmen notu veya rehber ekranındaki işaretlemeler, kullanıcının kendi notlarıyla aynı işlev değil.

Kanıt: [AppScreen.kt](../apps/lesson-player-android/app/src/main/java/io/github/knigdelioglu/lessonplayer/ui/AppScreen.kt#L4), [PhaseOneScreens.kt](../apps/lesson-player-android/app/src/main/java/io/github/knigdelioglu/lessonplayer/ui/PhaseOneScreens.kt#L369) ve [PhaseOneScreens.kt](../apps/lesson-player-android/app/src/main/java/io/github/knigdelioglu/lessonplayer/ui/PhaseOneScreens.kt#L446).

**Öneri:** Ders görünümünden kitaplık aramasına ve kaldığın derse tek dokunuşla erişim verin. “Notlarım” beklentisi gerçek bir özellikse öğretmen notlarının nerede oluşturulup saklanacağını ayrıca tanımlayın; yalnızca menü etiketi eklemek yeterli olmaz.

### P2 — Akış listesi düz; kitap sayfası/grup bağlamı ve tamamlanma durumu görünmüyor

Sol listede adımlar sırayla ve seçili adım vurgusuyla gösteriliyor; her satırda `displayPrompt` en fazla iki satırda kesiliyor ve altında görev tipi yer alıyor. Görseldeki gibi konu/metin/etkinlik/soru grupları, adım başına basılı sayfa ve tamamlanmış adım işareti listede görünmüyor. Uzun derslerde öğretmen, kitap içindeki konumunu ve hangi adımların işlendiğini tarayarak anlamakta zorlanabilir.

Kanıt: [LessonSidebar.kt](../apps/lesson-player-android/app/src/main/java/io/github/knigdelioglu/lessonplayer/ui/shell/LessonSidebar.kt#L162) ve [LessonSidebar.kt](../apps/lesson-player-android/app/src/main/java/io/github/knigdelioglu/lessonplayer/ui/shell/LessonSidebar.kt#L224).

**Öneri:** Mevcut kaynak verisinden basılı sayfa/grup bağlamını satırlara ekleyin; içerik başlıklarını görseldeki kısa taranabilir adlara yaklaştırın. Tamamlandı işaretini yalnızca uygulama gerçekten tamamlanmayı biliyorsa gösterin.

### P2 — Üst ilerleme göstergesi “tamamlandı” durumunu yalnızca konumdan çıkarıyor

Fazlar `taskType` ve yerleşim türünden türetiliyor; aynı kategoriye giren adımlar, aralarında başka adımlar olsa da tek grupta birleştiriliyor. Bu nedenle stepper kitap akışındaki gerçek sıralı durakların yerine geçmiyor. Ayrıca aktif adımın öncesindeki tüm adımlar bir fazdaysa, faz `COMPLETED` sayılıyor. Öğretmen listeden ileri bir adıma atlarsa, önceki fazlar öğrenciyle işlenmemiş olsalar da tamamlanmış görünür. Bu, görseldeki onay işaretlerinin gerçek ilerlemeyi yansıttığı izlenimini verebilir.

Kanıt: [LessonHeader.kt](../apps/lesson-player-android/app/src/main/java/io/github/knigdelioglu/lessonplayer/ui/shell/LessonHeader.kt#L61) ve [LessonHeader.kt](../apps/lesson-player-android/app/src/main/java/io/github/knigdelioglu/lessonplayer/ui/shell/LessonHeader.kt#L93).

**Öneri:** Stepper duraklarını kitap sırasındaki ardışık bölümlerden türetin veya gerçek adım adlarını kullanın; aynı görev türünün uzak adımlarını tek durağa toplamayın. Gerçek tamamlanma verisi yoksa durumu “önceki”/“geçildi” olarak adlandırın; onay işaretini yalnızca kaydedilmiş tamamlanma durumunda kullanın.

### Koşullu P2 — Sınıf seçimi yok; mevcut içerik yalnızca 11. sınıf

Sol başlıkta `11. SINIF` sabit metin olarak gösteriliyor. Ders kitaplığı tema ve ders seçtiriyor, ancak sınıf veya ders alanı seçtirmiyor. Mevcut katalog 11. sınıfla sınırlıysa bu doğru ve dürüst bir kapsam sınırıdır; birden fazla sınıf/ders hedefleniyorsa görseldeki seçim adımı eksiktir.

Kanıt: [LessonSidebar.kt](../apps/lesson-player-android/app/src/main/java/io/github/knigdelioglu/lessonplayer/ui/shell/LessonSidebar.kt#L90) ve [PhaseOneScreens.kt](../apps/lesson-player-android/app/src/main/java/io/github/knigdelioglu/lessonplayer/ui/PhaseOneScreens.kt#L480).

**Öneri:** Çok sınıflı katalog kapsamı kesinleşmeden işlevsiz sınıf seçici eklemeyin. Kapsam genişlediğinde sınıf/ders seçimini kitaplık girişine bağlayın.

### P3 — Dokunma alanı ve okunaklılık gerçek tablette henüz doğrulanmış değil

Birçok temel düğme ve satır için kodda en az `48 dp` hedef var; yatay geniş, orta ve dikey pencere düzenleri de ayrılmış. Ancak tasarım brifi gerçek tablet incelemesini ileriki faza bırakıyor. Kod sözleşmesi, gerçek cihazda metin ölçeği, Türkçe uzun satırlar, tablonun görünürlüğü ve sabit alt çubuğun aynı anda kullanılabilir olduğunu tek başına kanıtlamaz.

Kanıt: [LessonActionBar.kt](../apps/lesson-player-android/app/src/main/java/io/github/knigdelioglu/lessonplayer/ui/shell/LessonActionBar.kt#L99) ve [Faz 0 tasarım brifi](LESSON_PLAYER_ANDROID_PHASE_0_DESIGN_BRIEF.md#L101).

**Öneri:** Üç sütun oranı düzeltildikten sonra hedef tablete yakın bir cihazda/simülatörde uzun Türkçe metin, karşılaştırma tablosu, büyük yazı ölçeği ve dokunma hedefleriyle görsel kullanım kontrolü yapın.

## Görselle zaten örtüşenler

- Yatay geniş tablette sabit sol gezinme, orta içerik ve sağ öğretmen destek paneli var.
- Ders adımları doğrudan seçilebiliyor; aktif adım numarası ve seçili görünümü mevcut.
- Yönlendirme, cevap, açıklama ve metinsel kanıt ayrı öğretmen kartları ve ayrı reveal kontrolleri olarak sunuluyor; öğretmen notu öğrenciye açılan reveal akışından ayrı tutuluyor.
- Alt eylem çubuğunda “Önceki” ve doğrudan “Sonraki” var; reveal kontrolleri de ayrı.
- Görev tiplerine göre içerik düzenleri var; görselin altındaki küçük örnek ekranları ayrı bir sabit film şeridi olarak eklemek gerekmiyor.
- Orta/dar yatay ve dikey düzenlerde öğretmen araçları çekmece veya alt panel olarak açılabiliyor.

Kanıt: [TeacherAssistPane.kt](../apps/lesson-player-android/app/src/main/java/io/github/knigdelioglu/lessonplayer/ui/lesson/TeacherAssistPane.kt#L116), [LessonActionBar.kt](../apps/lesson-player-android/app/src/main/java/io/github/knigdelioglu/lessonplayer/ui/shell/LessonActionBar.kt#L120) ve [LessonPlayerApp.kt](../apps/lesson-player-android/app/src/main/java/io/github/knigdelioglu/lessonplayer/ui/LessonPlayerApp.kt#L590).

## Önerilen uygulama sırası

1. Üç sütun oranını ve breakpoint kararını içerik genişliği üzerinden düzeltin.
2. Sol akışta kitap sayfası/grup bağlamını ve adım durumlarını görünür kılın; tamamlandı işaretini gerçek duruma bağlayın.
3. Ders ekranında arama ve kaldığın yere dönme kısayollarını ele alın; kişisel notların kapsamını netleştirin.
4. Çok sınıflı katalog isteniyorsa sınıf/ders seçimini kitaplık akışına ekleyin.
5. Hedef tablette metin ölçeği, tablo, taşma ve dokunma alanlarını görsel olarak doğrulayın.

## Tamamlanma ölçütleri

- [ ] Geniş tablet düzeninde orta içerik alanı uzun metin ve tablo için yeterli minimum genişliği koruyor; dar pencerede öğretmen paneli çekmeceye geçiyor.
- [ ] Ders ekranından kaldığın yere ve ders aramasına tek dokunuşla erişiliyor.
- [ ] Akış, kitap sayfası ve içerik türü bağlamını adım listesinde gösteriyor.
- [ ] “Tamamlandı” işareti yalnızca gerçek tamamlanma verisine dayanıyor.
- [ ] Hedef tablette uzun Türkçe içerik, büyük metin ölçeği ve ana dokunma hedefleri görsel olarak kontrol edildi.

## Doğrulama kapsamı

Bu rapor kaynak kodu ve mevcut tasarım belgeleri üzerinden hazırlandı; uygulama emülatörde/gerçek tablette görsel olarak çalıştırılmadı ve test çalıştırılmadı. Dolayısıyla P3 cihaz maddesi uygulama hatası tespiti değil, tasarım kabulünün henüz kanıtlanmamış olmasıdır.
