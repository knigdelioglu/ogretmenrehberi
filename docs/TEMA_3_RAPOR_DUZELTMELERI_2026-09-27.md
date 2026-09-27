# Tema 3 — Dış Rapor Değerlendirmesi ve Yapılan Düzeltmeler (2026-09-27)

Dış karşılaştırma raporu ders kitabı PDF'i (basılı s.162–235) ile yeniden karşılaştırıldı. Rapordaki bulgular olduğu gibi uygulanmadı; her biri sayfa metnine (gerektiğinde sayfa görüntüsüne) karşı doğrulandı.

## Düzeltilen kayıtlar

| Kayıt | Değişiklik |
|---|---|
| T3-P177-COMP01 | Önceki doğrulama notu yanlıştı. Verilen PDF'nin basılı s.177 / PDF s.178 görüntüsünde Mescid-i Aksa fotoğrafı var, şiir dizeleri görünmüyor. Kayıt yeniden `source_limited` yapıldı; Huzur sütunu kitapta okunan kesitle sınırlı tutuldu, şiire bağlı ölçütler doğrulanmış tam metin gelene kadar açık bırakıldı. Şiirin biçimi, içeriği ve dizeleri kitaba atfedilmedi. |
| T3-P176-Q10 | Konuşmacı düzeltmesi ana cevaba taşındı: söz Nuran'ındır, kitap sorusu Mümtaz'a atfeder. “Metin camileri kimin yaptırdığını belirtmez” ifadesi düzeltildi (metin “Üçüncü Ahmed'in annesinin camii”, Atik/Orta Valde adlarını verir). |
| T3-P201-WORK01 | Açık iletiler tarih/olgu yerine metnin doğrudan yargılarıyla değiştirildi. **Rapordan farklı olarak** “Akif'in şiiri hayatla iç içedir” cümlesi kullanılmadı; bu cümle s.198 Söz Varlığımız parçasındandır, çalışma kâğıdı s.195–197 metnine dayanır. “Tarih ve özel adlarla somutlaştırma” → “sayısal verilerden yararlanma”. Ana düşünce ve yardımcı düşünceler metne yaklaştırıldı; `answer` alanındaki yönerge özet cümleye çevrildi. |
| T3-P184-Q02 | Serçe-köpek ve İhsan parçalarında metindeki davranış kanıtı (ekmek ufakları, camı kapatma, komşudan telefon) ile “olası yorum” ayrıldı; kanıt alıntıları eklendi. |
| T3-P204-Q01 | TDV URL'si ve 1949 bilgisi cevap hücresinden çıkarıldı, `explanation`'a “kitap dışı” notuyla taşındı. Dönem hücresi kitaptaki verilerle (Tanpınar 1901-1962) gerekçelendirildi. |
| T3-P190-GRAM01 | **Raporda yoktu.** d cümlesinde “ara sıra” ayrı sıklık zarfı gösterilmişti; “içinde kabaran” sıfat-fiilini niteler, nesne grubunun içindedir. “Biraz ötede” için terminoloji notu eklendi. |
| T3-P234-Q13 | **Raporda yoktu.** s.234 parçasının altında kaynak adı yok; “biyografik roman” bilgisinin s.173/s.203'ten geldiği ve “Bilgi yok” cevabının gerekçesinin dinlenmesi gerektiği not edildi. 5. madde gerekçesi netleştirildi. |
| T3-P175-Q02, T3-P176-Q07, T3-P180-TABLE01 | **Raporda yoktu.** `answer` alanında öğrenciye yönerge vardı; gerçek özet cevaba çevrildi, yönergeler `guidance`'a alındı. |

Akış dosyaları: `huzur-177-178`, `huzur-metni-anlayalim-175-176`, `huzur-catisma-dil-189-191`, `biyografi-akif-anlama-199-201` aynı düzeltmelere göre güncellendi. Testler (`lesson-data/theme-3.mjs`, `test-lesson-data.mjs`) yeni duruma göre değiştirildi; Tema 3 kontrolleri geçiyor.

İlk rapor düzeltmesinde kayıt sayıları `source_limited` 18 → 17, `question_answer` 85 → 86 olmuştu. Bu güncellemeyle T3-P177-COMP01 yeniden `source_limited` yapıldı; güncel sayılar 18 ve 85’tir. Toplam 149 kayıt değişmedi.

## Rapordaki hatalı veya uygulanmayan noktalar

- Önceki “şiir s.177’de tam basılı” notu verilen PDF görüntüsüyle doğrulanmıyordu; basılı s.177 / PDF s.178’de fotoğraf görünürken şiir dizeleri görünmüyor. Metin bulunana kadar kayıt `source_limited` kalmalıdır.
- Önerilen yeni alanlar (`kısa_cevap`, `yanlis_anlama_riski`, `slide_answer`, `student_hidden`, `external_sources`, `textbook_issue`) uygulanmadı: `ANSWER_BANK_QUALITY_STANDARD.md` madde 2 yapay katmanları yasaklar; sunum katmanı zaten `presentation/theme-3/*-flow.json` dosyalarında ayrı (lead/note) tutuluyor. Dış kaynak ve kitap hatası notları mevcut `explanation` alanıyla ayrıldı.
- `COMPLETE_WITH_SOURCE_LIMITED` durum etiketi değiştirilmedi; tüm temalarda ortak, `BLOCK_AUTHORING_STANDARD.md` ile tanımlı bir sözleşme.
- T3-P176-PERF12'ye tarihî türkü bağlamı eklenmedi; kitapta eser adı verilmediği için akıştaki “kanonik metin gibi sunma” kararı korundu.
- Kapalı uçlu cevaplar (s.230 2/1/3, s.231 E/C, s.233 C, Tablo A=13, Tarafsızlık+Kronoloji, s.234 dizi, s.235 C) bağımsız olarak yeniden çözüldü; rapor ve JSON ile uyumlu.

## Açık kalan

- 18 `source_limited` kaydın 17’si Direnişin Ustaları, Osmancık ve Aile Bağları QR/EBA medyasına bağlıdır; T3-P177-COMP01 ise verilen PDF görüntüsünde şiir metni görünmediği için sınırlıdır.
- Tema 3 doğrulaması ayrı çalıştırıldığında geçiyor ve `apps/lesson-player/src/generated/lessons.json` yeniden üretildi. Genel `test-lesson-data.mjs`, Tema 1 için beklenen toplam adım sayısı (183) ile üretilen sayı uyuşmadığından orada duruyor. Android paket çıktıları, EPUB ve ÖğretmenOS projection bu düzeltmeyle yeniden üretilmedi.
