# Grade 11 QR source worklist

Bu liste EBA indirme/SHA kaydıyla doğrulanmış kaynakları izler. **Ders kitabının PDF bağlantı katmanından 18 video kullanım yerinin tamamının QR hedef kimliği ayrıca kesin olarak çıkarılmıştır.** Ayrıntılı tablo için [kitap QR bağlantı denetimi](qr-book-link-audit-2026-10-08.md). Ancak QR hedefinin kesinleşmesi, her Drive MP4'ünün aynı EBA indirmesi olduğunu kanıtlamaz. Kullanıcının Drive klasöründeki **18 MP4 dosyasının tamamının** geçici/dogrulanmış eşleştirmeleri ayrı dosyada tutulur: [qr-media-intake-2026-10-08.json](qr-media-intake-2026-10-08.json). 5 kaynak bu kayıtla SHA-256 düzeyinde eşleşmektedir.

**Durum ayrımı:** Dosya indirilmiş olması video içeriğinin dinlendiği anlamına gelmez. Kısmi sahne incelemesi tam diyalog transkripti sayılmaz. Ekranda yazı görülen videolarda yazılı veri ayrıca incelenir; ses, sahne ve ekran yazısı birbirine karıştırılmaz.

| Kaynak | Basılı sayfa / PDF sayfası | İnceleme durumu | Kalan iş |
|---|---|---|---|
| QR-EBA-E43890DFD82A — Mektup Türünün Serüveni | 43 / 44 | EBA kimliği, indirme ve SHA-256 doğrulandı; örnek görüntüler incelendi | Sesli anlatım/transkript, kitap cevabı kanıtı |
| QR-EBA-254C08EA3501 — Seksenler | 53 / 54 | EBA ve SHA-256 doğrulandı; kullanıcının üç sahne açıklaması [kanıt notuna](qr-review-notes/QR-EBA-254C08EA3501.md) kaydedildi; Q01–Q02 gerçek sahnelere göre düzenlendi | Birebir diyalog, konuşmacılar ve sahne zamanları doğrulanacak |
| QR-EBA-29BF4F293D53 — Değişen İletişim Araçlarının Hayatımızdaki Yeri | 64 / 65; sorular s.66–67 | EBA ve SHA-256 doğrulandı; [01:14–04:08 arasında dört ekran yazısı](qr-review-notes/QR-EBA-29BF4F293D53.md) zaman damgasıyla denetlendi; s.67 Q08 gerçek örneklerle güncellendi | Tüm sözlü anlatım, ana-yardımcı düşünceler ve tam video özeti |
| QR-EBA-BFB2729458DF — Geçmişten Günümüze İletişim Araçları | 67 / 68 | EBA ve SHA-256 doğrulandı; [on iletişim aracı etiketi](qr-review-notes/QR-EBA-BFB2729458DF.md) ayrı video kaynağı olarak kaydedildi ve sunum açıklaması düzeltildi | Ekrandaki tanımların ve olası sesli açıklamaların tamamını doğrula |
| QR-EBA-2952F505E3A7 — Olvido | 83 / 84 | EBA ve SHA-256 doğrulandı; görsel akış örneklendi | Sesli şiir okunuşunu ve vurgu/durakları kontrol et |

## Bilinen eşleştirme hatası

PNG'de **s.88** için yanlışlıkla `19XU4CVR.mp4` yazılmıştır. Bu dosyanın s.67'deki *Geçmişten Günümüze İletişim Araçları* kaydı olduğu kesin. **s.88'in özgün basılı QR hedefi**, kitap PDF'sindeki bağlantıdan `382543f8f403f67200b286af84e71b40` olarak **doğrulandı**. `19XU49LO.mp4` görüntüleri şenlikler/ortak kültür konusuyla örtüştüğünden dosya **adayıdır**; EBA URL'sinden indirilmiş aynı MP4 olduğunun bağımsız teyidi hâlâ bulunmuyor. Bu nedenle s.88 videoya dayalı yeni olgular henüz kesin cevap yapılmamalıdır.


## Tema 2 — yeni görsel kaynak incelemeleri

Aşağıdaki üç kaynak için **kitapta bulunan özgün EBA QR hedefi doğrulanmıştır**; ancak Drive'daki MP4 dosyalarının doğrudan o hedeflerden indirildiği kanıtlanmamıştır. Bu nedenle kayıtlar kanonik EBA indirme envanterine eklenmez:

| Basılı sayfa | Aday video | Doğrulanan içerik | Eksik |
| --- | --- | --- | --- |
| 129 | `19XU49LP.mp4` — Dünyadaki Türkiye | [TRT programından zaman damgalı yazıt, bozkır ve kültür görüntüleri](qr-review-notes/UNVERIFIED-19XU49LP.md); Q01 gözlem/çıkarım ayrımıyla düzeltildi | Konuşma transkripti, katkıların tarihî doğrulaması, MP4 kökeni |
| 140 | `19XU49JV.mp4` — Âşık Atışması | [İki saz icracısının nöbetleşe icrası, seyirci tepkisi](qr-review-notes/UNVERIFIED-19XU49JV.md); kelime sorusu ses dökümü bekler | Şiir dizeleri, kelimelerin işitsel bağlamı, MP4 kökeni |
| 141 | `19XU49MG.mp4` — Âşıklık Geleneği | [Söyleşi, saz ve arşiv görüntüleri](qr-review-notes/UNVERIFIED-19XU49MG.md); s.141 metin soruları video görüşüyle karıştırılmadı | Konuşulan fikirlerin tam dökümü, MP4 kökeni |

## Kaynak güvenliği

- `qr-sources.json` yalnız EBA kimliği/QR hedefi doğrulanmış kaynakların kanonik kaydıdır.
- `qr-media-intake-2026-10-08.json` 18 **basılı QR hedefini kesin**, yalnız 5 **MP4 EBA indirme kimliğini/SHA'sını kesin** olarak tutar. Diğer Drive dosyaları için ilgili URL ve video dosyası arasındaki bağ hâlâ geçicidir.
- Orijinal MP4'ler ve uzun üçüncü taraf transkriptleri herkese açık GitHub reposuna yüklenmez.
- Ses çözümlemesi bitmeden hiçbir kaynak `full_transcript_verified` kabul edilmez.
