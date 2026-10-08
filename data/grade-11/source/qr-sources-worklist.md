# Grade 11 QR source worklist

Bu liste EBA kimliği ve orijinal QR hedefi doğrulanmış kaynakları izler. Kullanıcının Drive klasöründeki **18 MP4 dosyasının tamamının** geçici/dogrulanmış eşleştirmeleri ayrı dosyada tutulur: [qr-media-intake-2026-10-08.json](qr-media-intake-2026-10-08.json). 5 kaynak bu kayıtla SHA-256 düzeyinde eşleşmektedir.

**Durum ayrımı:** Dosya indirilmiş olması video içeriğinin dinlendiği anlamına gelmez. Kısmi sahne incelemesi tam diyalog transkripti sayılmaz. Ekranda yazı görülen videolarda yazılı veri ayrıca incelenir; ses, sahne ve ekran yazısı birbirine karıştırılmaz.

| Kaynak | Basılı sayfa / PDF sayfası | İnceleme durumu | Kalan iş |
|---|---|---|---|
| QR-EBA-E43890DFD82A — Mektup Türünün Serüveni | 43 / 44 | EBA kimliği, indirme ve SHA-256 doğrulandı; örnek görüntüler incelendi | Sesli anlatım/transkript, kitap cevabı kanıtı |
| QR-EBA-254C08EA3501 — Seksenler | 53 / 54 | EBA ve SHA-256 doğrulandı; kullanıcının üç sahne açıklaması [kanıt notuna](qr-review-notes/QR-EBA-254C08EA3501.md) kaydedildi; Q01–Q02 gerçek sahnelere göre düzenlendi | Birebir diyalog, konuşmacılar ve sahne zamanları doğrulanacak |
| QR-EBA-29BF4F293D53 — Değişen İletişim Araçlarının Hayatımızdaki Yeri | 64 / 65; sorular s.66–67 | EBA ve SHA-256 doğrulandı; ekranda görülen bazı ifadeler belirlendi | Tüm sözlü anlatım, alıntıların zamana göre doğrulanması, s.66–67 cevapları |
| QR-EBA-BFB2729458DF — Geçmişten Günümüze İletişim Araçları | 67 / 68 | EBA ve SHA-256 doğrulandı; on iletişim aracı görünen zaman çizelgesinde tespit edildi | Ekran yazılarının tüm akışını gözden geçir; ayrı ders dışı kaynak olarak tut |
| QR-EBA-2952F505E3A7 — Olvido | 83 / 84 | EBA ve SHA-256 doğrulandı; görsel akış örneklendi | Sesli şiir okunuşunu ve vurgu/durakları kontrol et |

## Bilinen eşleştirme hatası

PNG'de **s.88** için de `19XU4CVR.mp4` belirtilmiş; bu dosya s.67'deki *Geçmişten Günümüze İletişim Araçları* videosudur. `19XU49LO.mp4` şenlikler videosu için **adaydır**, fakat s.88'deki basılı QR hedefiyle eşleştirilmeden doğrulanmış kaynak sayılmamalı veya s.88 cevaplarına kanıt yapılmamalıdır.

## Kaynak güvenliği

- `qr-sources.json` yalnız EBA kimliği/QR hedefi doğrulanmış kaynakların kanonik kaydıdır.
- `qr-media-intake-2026-10-08.json` eksik/onay bekleyen videoları saklayan envanterdir; oradaki geçici eşleştirmeler kanonik QR kimliği değildir.
- Orijinal MP4'ler ve uzun üçüncü taraf transkriptleri herkese açık GitHub reposuna yüklenmez.
- Ses çözümlemesi bitmeden hiçbir kaynak `full_transcript_verified` kabul edilmez.
