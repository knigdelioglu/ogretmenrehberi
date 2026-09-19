# Lesson Player — PDF Kabul Denetimi

**Tarih:** 2026-09-19  
**Kapsam:** 11. Sınıf Türk Dili ve Edebiyatı, basılı s.12–307  
**Kanonik kaynak:** 2026 baskısı resmî ders kitabı PDF'i, ISBN 978-605-06002-7-8

## Amaç

Bu belge, daha önce üretilen Tema 1–4 Lesson Player denetim raporlarını resmî ders kitabı PDF'iyle yeniden kontrol eder. Eski raporlardaki sayısal kapsam verileri ile içerik doğruluğu birbirinden ayrılır. Bir adımın veya answer-bank kaydının mevcut olması, soru kökünün ya da sayfa içeriğinin PDF ile birebir doğrulandığı anlamına gelmez.

Bu nedenle bu rapor **“296 sayfanın tamamı görsel olarak %100 doğrulandı”** iddiasında bulunmaz. PDF sayfaları, raporlarda kritik iddia bulunan noktalar ve harici medya/karekod bağımlılığı olan bölümler görsel olarak doğrulanmış; repo sözleşmeleri ve Lesson Player akışları ayrıca karşılaştırılmıştır.

## Güncel kapsam

| Tema | Ders | Lesson Player adımı | Source-index | Answer-bank |
| --- | ---: | ---: | ---: | ---: |
| Tema 1 — Bir Diyeceğim Var! | 7 | 180 | 129 | 151 |
| Tema 2 — Kültür Yolculuğu | 9 | 190 | 158 | 167 |
| Tema 3 — Yaşamın İzinde | 18 | 310 | 146 kanonik kayıt* | 147 |
| Tema 4 — Hayatın Aynası | 14 | 234 | 143 | 157 |
| **Toplam** | **48** | **914** | **576** | **622** |

\* Lesson Player ders bazlı coverage toplamı Tema 3'te paylaşılan kaynak kullanımı nedeniyle 147 gösterebilir; kanonik source-index 146 benzersiz kayıt içerir.

**Önemli:** Answer-bank sayıları “doğrudan cevap” sayısı değildir. Bu toplamların içinde `question_answer`, `performance_support` ve `source_limited` kayıtları birlikte bulunur.

## Tema 1 — doğrulanan ve kapatılan açıklar

- Basılı s.13'teki Yusuf Has Hacib eşik alıntısı ve tema sunusu bağlamı Lesson Player'a taşındı.
- Basılı s.15'teki *Seyirlik Halk Oyunları* kaynak bağlamı ve karekod geçişi sorulardan önce görünür hâle getirildi.
- `s18-q1`, PDF'deki gerçek soru kökü olan “Başlık ve görsellerden yararlanarak metnin içeriğine dair tahminlerde bulununuz.” biçimine getirildi.
- Basılı s.53 *Seksenler* çok modlu metni için video/karekod hatırlatması eklendi.
- Basılı s.83 *Olvido* çok modlu metni için dinleme/izleme hatırlatması eklendi.
- Yapılandırılmış `structure`, `comparison` ve `assessment` görevlerinde cevap açıldığında çalışma yapısının ekrandan kaybolmaması sağlandı.

Eski Tema 1 raporundaki “diğer 150 soru kelimesi kelimesine PDF ile aynı” genellemesi kanıtlanmış bir kabul ölçütü değildir. Bazı ekranlar tasarım gereği `ANSWER_SUMMARY` veya `VERIFIED_SUMMARY` kullanır.

## Tema 2 — doğrulanan ve kapatılan açıklar

- Basılı s.85'te Tema Sunusu, Dede Korkut'un gerçek sayfa alıntısı ve karekod geçişiyle hizalandı. Eski raporda verilen farklı Dede Korkut alıntısı bu sayfaya ait değildir.
- Basılı s.88'deki altı soru açıkça *Türklerde Toylar, Merasimler, Festivaller ve Şenlikler* adlı karekodlu çok modlu metinden hareketle sorulur. Bu altı answer-bank kaydı `source_limited` yapıldı ve video erişilebildiğinde gerçek kanıt isteme yönlendirmesi eklendi.
- Basılı s.113 *Orhun Vadisi* ve s.129 Türklerin dünya medeniyetine katkıları video geçişleri için görünür medya hatırlatmaları bulunur.
- Basılı s.140 Âşık Atışması akışı zaten QR kaynağı açıkça belirtiyordu; eski rapordaki “uyarı yok” tespiti güncel repo için geçerli değildir.
- Basılı s.148–149 sanal müze yazma bölümü görsel olarak kontrol edildi; bu iki sayfada karekod bulunmadığından eski rapordaki “karekod uyarısı eklenmeli” önerisi uygulanmadı.

## Tema 3 — rapor düzeltmesi ve mevcut durum

Eski Tema 3 raporunun açılış bölümü PDF ile uyuşmaz. Basılı s.161 Cahit Sıtkı Tarancı / *Otuz Beş Yaş* değildir; **Hoca Ahmed Yesevî / Dîvân-ı Hikmet** tema eşiğidir. Basılı s.162–163 de raporda anlatıldığı gibi Peyami Safa ağırlıklı bir açılış değildir; yaşam yolu görseli, radyo/mülakat görselleri ve Alev Alatlı–Sehî Beg karşılaştırması bulunur.

Güncel Lesson Player bu sayfaların asıl içeriğini zaten doğru modelliyordu. Ek olarak:

- Basılı s.161 Tema Sunusu karekod geçişi Yesevî eşik kartında görünür hâle getirildi.
- Basılı s.215 ve devamındaki *Direnişin Ustaları* radyo kaydı QR kaynak sınırını korur.
- Basılı s.234 *Aile Bağları* videosundan önce `s234-aile` doğrudan QR izleme hatırlatması verir; video temelli sorular kaynak görülmeden kesinleştirilmez.

Bu nedenle eski rapordaki yanlış açılış anlatımı Lesson Player'a uygulanmamalıdır.

## Tema 4 — rapor düzeltmesi ve mevcut durum

Eski Tema 4 raporunun açılış bölümü de PDF ile uyuşmaz. Basılı s.237 Muhsin Ertuğrul değildir; **Yunus Emre** tema eşiğidir. Basılı s.238 Latîfî, s.239 Sefa Yüce'nin *Edebiyatta Gerçekçilik ve Alımlama Estetiği* metni, s.240 Mimar Sinan bilgi görseli, s.241–242 ise okuma çemberi görevleridir.

Güncel Lesson Player bu dizilimi zaten doğru modelliyordu. Ek olarak:

- Basılı s.237 Tema Sunusu karekod geçişi Yunus Emre eşik kartında görünür hâle getirildi.
- Basılı s.285 *Anadolu İnsanı / Fedakârlık* için `s285-plan` ve `s285-watch` QR videoyu açıkça belirtir.
- Basılı s.293 *Çalışkanlık* videosu için `s293-watch` medya kullanımını açıkça belirtir.
- `s295-q12` `source_limited` kalır; ses/görüntü kapatma deneyinin gerçek sonucu video izlenmeden uydurulmaz.
- Basılı s.307 *Aidiyet* videosu için ayrı medya hatırlatma adımı bulunur; 13 ve 14. sorular videodan somut kanıt istemeye devam eder.

## Kabul kararı

Önceki Tema 1–4 raporları **nihai PDF kabul belgesi olarak kullanılmamalıdır**. Özellikle Tema 3 ve Tema 4 açılışlarında kaynak sayfayla çelişen anlatımlar, ayrıca “%100 tam”, “kayıpsız” ve “tüm 296 sayfa birebir doğrulandı” ifadeleri kanıt düzeyini aşmaktadır.

Güncel kabul yaklaşımı şudur:

1. Resmî PDF, source-index için nihai içerik otoritesidir.
2. Harici QR/video görülmeden videoya özgü olay, söz, sahne veya sonuç üretilmez.
3. Medya gereken yerde Lesson Player öğretmene geçişi açıkça hatırlatır; bağlantının çalışması uygulamanın doğruluk sorumluluğu değildir.
4. Answer-bank toplamları “doğrudan cevap” olarak etiketlenmez; kayıt türü ayrıca dikkate alınır.
5. Kapsam sayaçları canonical source-index ve answer-bank indeksleriyle otomatik karşılaştırılır.
6. Gelecekte “%100 PDF uyumu” denebilmesi için her basılı sayfanın görsel render → source-index → answer-bank → flow zincirinde ayrı kabul kaydı bulunmalıdır.

## Son durum

PDF ile yapılan bu düzeltme turunda raporlardan kaynaklanan ve repoda gerçekten karşılığı bulunan kritik açıklar kapatılmıştır. Eski raporların PDF ile çelişen önerileri ise bilerek koda taşınmamıştır.
