# Tema 1 JSON denetimi: uygulanan düzeltmeler (2026-09-27)

Dış denetim raporu ders kitabı PDF'iyle (basılı s.14-83) tek tek karşılaştırıldı. Raporun önerileri doğrudan uygulanmadı; her madde kitap metnine göre ayrıca doğrulandı.

## Raporla ayrışılan noktalar

| Kayıt | Rapor önerisi | Karar | Gerekçe |
|---|---|---|---|
| T1-P43-Q01/Q02 | Birincil tür "özel mektup" olsun | **Edebî mektup (özel mektup biçiminde)** | Kitabın s.38 biyografisi Kaplan'ı "edebî mektuplarıyla" anar; tanımdaki "sanatçılar, düşünürler arasında", "dönemin sanat ve düşünce hayatına ışık tutar" ölçütleri karşılanır. "Herkese anlatma" ölçütüne dayanan "edebî değer taşıyan özel mektup" cevabı `explanation`/`guidance` içinde kabul edilebilir cevap olarak tutuldu. |
| T1-P29-Q01 | Hacivat'ın arabuluculuğu metin kanıtı değil, çıkarılsın | **Korundu, kaynağı düzeltildi** | Soru aynı sayfadaki Metin And metnine dayanır; And, Hacivat'ı açıkça "arabulucu, kavgaları yatıştıran" diye tanımlar. Cevap artık bu metne ve Yazıcı'daki dükkân/ortaklık sahnesine dayanıyor. |
| Şema (student_visible_answer vb.) | Yeni alanlar eklensin | **Uygulanmadı** | Sunum zaten `answer` + `answer_sections` + `evidence_quotes` gösteriyor; `guidance` ve `explanation` varsayılan olarak gizli. Aynı ayrım bu alanlarla sağlandı; kalite standardı yapay katman eklemeyi yasaklıyor. |

## İçerik düzeltmeleri

- **T1-P47-Q02:** "Gerçek Hayattan Örnekler" satırlarına kaynak etiketi eklendi (kitaptaki biyografi / dış kaynak / çıkarım). "Hamdi Bey = Tanpınar" ve "Behice" kesin bilgi değil, çıkarım olarak işaretlendi. Dış bilgiler TDV İslâm Ansiklopedisi ve TEİS "Kaplan, Mehmet" maddelerinden doğrulandı.
- **T1-P59-Q01/Q02/Q03:** Mutlak ifadeler yumuşatıldı ("ortadan kaldırır" yerine "azaltır"). İmge yorumu, dizelerden doğrudan çıkan anlam ile ileri yorum ayrılarak yeniden yazıldı. "Empati" tanımı düzeltildi.
- **T1-P68-Q02:** Dil kaynaklı aksaklıklar (Hasan, "tez", Ömer) söz kesme davranışından ayrıldı. "Ad hominem" ifadesi kaldırıldı, Hatice'nin tepkisi kanıt olarak eklendi.
- **T1-P70-Q04:** "Benmerkezci" etiketi ve "ad hominem" kaldırıldı; çözümler somut davranışlarla anlatıldı.
- **T1-P83-Q11:** "Kitle iletişiminin doğuşu" yerine "güçlenmesi" yazıldı; bölümler kitap metnine yaklaştırıldı.
- **T1-P25-Q01:** "Silsile" için metindeki bağlam anlamı eklendi: "soy, sülale" ("Sinsileni sansar boğsun!").
- **T1-P30-Q04:** Bölümler kitaptaki "Açık İletiler / Örtük İletiler" alanlarına göre yeniden kuruldu ("Ben rakam bilmem, okumam yazmam yok.").
- **T1-P33-Q07:** "üstten" yerine "öğretici" yazıldı. **T1-P34-Q08:** "derken" notu eklendi.
- **T1-P40-Q04:** "son derece başarılı bulur" abartısı düzeltildi; tekniğin diğer türlere uyarlanması açıklandı. **T1-P40-Q05:** Alternatif ana düşünceler rehberliğe eklendi.
- **T1-P52-Q01:** Öğrenci cevabı kitaptaki dilekçe kurallarına göre yazıldı; 3071 sayılı Kanun ayrımı `explanation` alanına taşındı.
- **T1-P66-Q02:** Cevap kısaltıldı; resmîlik ve delil niteliği uyarısı `explanation` alanına taşındı.
- **T1-P76-Q02:** Teknik ek dosya notu isteğe bağlı yapıldı. **T1-P80-Q03:** Tanım kitaptaki "âşıklık geleneğinde manzum bilmece" açıklamasına bağlandı; divan muamması `explanation` alanına alındı.
- **T1-P39-Q02:** Eksik zorunlu `answer` alanı eklendi.
- `mektup-flow.json` s43-q1 sorusu kitaptaki soruya yaklaştırıldı.

## Sayım ve dondurma

Önceki commit'lerden kalan sayım uyumsuzlukları giderildi (155 answer, 14 source_limited, 183 adım). Bu kapsam test ve dondurma manifestine işlendi. Tema 1 kalite dondurması yeniden PASS verdi; yeni fingerprint `quality-freeze.json` dosyasında.
