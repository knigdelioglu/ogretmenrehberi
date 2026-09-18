# 11. Sınıf Öğretmen Rehberi Answer-Bank — PDF Sayfa Bazlı Kalite Kontrol Raporu

**Tarih:** 18.09.2026  
**Repo:** `knigdelioglu/ogretmenrehberi`  
**Ana kaynak:** Resmî 11. sınıf Türk Dili ve Edebiyatı ders kitabı PDF'si  
**Denetlenen basılı sayfalar:** Tema 1 s.14–83, Tema 2 s.86–159, Tema 3 s.162–235, Tema 4 s.238–307 (**288 sayfa**)  
**Denetlenen canonical answer-bank kaydı:** **618**

## Denetim yöntemi

Her tema için master `answer-bank.json` dosyasının indekslediği canonical part dosyaları, `source-index.json` ve gerçek ders kitabı PDF'si karşılaştırıldı. Metin çıkarımı bütün sayfa aralıklarında tarandı; görsel/biçim bağımlı şüpheli sayfalar ayrıca render edilerek kontrol edildi. QR ile açılan dış video/ses içerikleri PDF'nin içinde bulunmadığı için bu içeriklerin gerçek sahne/söz ayrıntıları doğrulanmadı; yalnız `source_limited` sınırının doğru kurulup kurulmadığı denetlendi.

## Yönetici özeti

| Tema | Kayıt | Sonuç | Ana bulgular |
|---|---:|---|---|
| Tema 1 | 151 | **Düzeltildi / yeniden doğrulandı** | 79 `entry_type` ve 17 `source_locator` eksiği giderildi; s.34 araştırma desteği ve s.64 adım 3 eklendi; performans görevleri yeniden sınıflandırıldı |
| Tema 2 | 167 | **Düzeltme gerekli** | s.96 ve s.99 gerçek PDF görseli incelenmeden `source_limited`; s.88 gereksiz sınırlama; s.116 kaynak/provenans sorunu |
| Tema 3 | 146 | **Geçti** | Zorunlu alanlar temiz; doğrulanabilir sorularda belirgin yanlış/eksik bulunmadı; medya bağımlı `source_limited` kayıtlar yerinde |
| Tema 4 | 156 | **Düzeltme gerekli** | s.268 görev alt maddesi kısmi eksik; s.304/2 eksik çoktan seçmeli sonuç; s.305 yanlış `source_limited`; iki orphan/legacy part dosyası |

Genel `ALL_THEMES_COMPLETE_WITH_SOURCE_LIMITED` durumu içerik üretiminin tamamlandığını gösterir. **Tema 1 bulguları 18.09.2026 tarihinde giderilmiş ve yeniden doğrulanmıştır.** Tema 2 ve Tema 4 için bu raporda açık kalan bulgular giderilmeden tüm sınıf için `QA_PASSED` benzeri bir durum verilmemelidir.

## Kesin bulgular

### Kritik — Tema 1 şema bütünlüğü — **GİDERİLDİ**

- **79/149** Tema 1 kaydında zorunlu `entry_type` alanı yok.
- **17/149** Tema 1 kaydında zorunlu `source_locator` alanı yok. Bunlar s.30–35 arasındaki kayıtlarda yoğunlaşıyor.
- Tema 1 master dosyası `schema_version: 2.0.0` ve `COMPLETE_WITH_SOURCE_LIMITED` görünmesine rağmen kayıtların önemli bölümü güncel kalite standardının zorunlu şemasını karşılamıyor.
- Yasaklanan eski katmanlar (`expected_answer`, `wrong_answer`, `misconception`, `teacher_moves`, `why_it_matters`) answer-bank içinde bulunmadı; bu kısım temiz.

### Yüksek — PDF'de görünür olduğu hâlde `source_limited` bırakılan kayıtlar

1. **T2-P96-Q04A (s.96)** — Altı çizili sözcükler sayfa render'ında açıkça görünüyor. Kayıt “metin çıkarımında alt çizgi korunmadı” gerekçesiyle cevap vermiyor. Standart gereği gerçek PDF sayfası incelenmeliydi.
2. **T2-P99-Q02 (s.99)** — Altı görsel PDF'de açıkça görünür: geleneksel kıyafetli atlılar, halı/kilim, bezeme/desen, kahve takımı, yurt/çadırlar ve okçuluk. Kayıt görselleri göremediğini söyleyerek `source_limited` kalmış.
3. **T4-P305-Q05 (s.305)** — Çiçekli ağaç, apartmanlar, açık havada mutlu aile/çocuklar ve orman yangını görselleri görünür. “Bir çadır çiz, çocuk!” metniyle örnek seçim ve gerekçe verilebilir. Mevcut `source_limited` sınıflaması hatalı.

### Yüksek — Tema 4 s.268 kısmi içerik eksikliği

- Kitap s.268'de Söz Varlığımız **5/a** bölümünde “merdiven” kavramının çağrışımları tabloya yazdırılıyor; **5/b** bölümünde bu çağrışımlarla merdiven kavramı arasında kurulan ilişkiler açıklatılıyor.
- `T4-P267-VOC02` bu görevi `Söz Varlığımız 4-5` diye topluyor ve çağrışım örnekleri veriyor, fakat **5/b ilişki açıklamasını karşılamıyor**.
- Ayrıca kayıt `printed_page: 267` iken `source_locator` s.267–268; s.268'deki alt görevin sayfa eşlemesi görünmez kalıyor. Ayrı kayıt veya `printed_page: "267-268"` tercih edilmeli.

### Orta — Tema 1 süreç görevlerinde eksik öğretmen desteği — **GİDERİLDİ**

- **s.34:** “Gölge Oyununun Sosyal Bilimlerle İlişkisi” başlıklı 1 haftalık tarih/sosyoloji/psikoloji araştırması var. Veritabanı yalnız fiilimsi çalışmasını ve araştırma sonu değerlendirme sorusunu içeriyor; araştırmanın nasıl yürütüleceğine yönelik `performance_support` yok. Mevcut standartta araştırma görevlerine yöntem/model desteği verilmesi gerekiyor.
- **s.64:** Dinleme/izleme adım 3, metin ve ortam kaynaklı iletişim engellerini azaltmayı açıkça istiyor. Q1, Q2 ve dinleme stratejisi var; bu adım için ayrı/açık destek bulunmuyor. Küçük fakat gerçek bir kapsam boşluğu.

### Orta — Tema 2 gereksiz sınırlama ve kaynak provenansı

- **T2-P88-Q03:** “Gönül coğrafyamız” ifadesinin çağrıştırdığı coğrafyalara örnek isteniyor. Bu kişisel/yorumlayıcı soru, videoya özgü olay bilgisi gerektirmeden örnek cevap alabilir. `source_limited` fazla katı.
- **T2-P116-VOC01:** Kitap sayfası altı kelime (`yağız, ecdat, il, töre, şad, kılmak`) verir fakat yalnız beş anlam kutusu gösterir; `şad` için tanım sayfada yoktur. Veritabanındaki “eski Türklerde yönetim görevi olan yüksek rütbeli kişi” bilgisi içerik olarak makul olsa da kitap dışı tamamlamadır. Bu bilgi ya dış kaynağa bağlanmalı ya da “kitapta tanım eksik” şeklinde açık kaynak sınırıyla sunulmalıdır.

### Orta — Tema 4 ölçme-değerlendirme ve repo hijyeni

- **T4-P304-Q02:** Mevcut açıklama anlam bakımından doğru; fakat gerçek sayfadaki seçenekler render edildiğinde doğru şık **A**'dır. Kayıt “seçenekler görünmedi” diyerek harf vermiyor. Bu açıklama silinmeli ve cevap `A` olarak tamamlanmalı.
- Tema 4 answer-bank klasöründe master indeksine girmeyen iki eski/örtüşen dosya bulunuyor: `part-06-pages-263-268.json` ve `part-07-pages-269-273.json`. Canonical dosyalar sırasıyla `part-06-pages-263-270.json` ve `part-07-pages-271-273.json`. Dosyaları glob ile okuyan tüketicilerde çifte/çelişkili veri riski var.

## Tema bazlı değerlendirme

### Tema 1 — Bir Diyeceğim Var! (s.14–83)

**Remediation tamamlandı.** İçerik cevaplarının büyük kısmı ders kitabı bağlamıyla uyumluydu; eski şema kayıtları güncel standarda taşındı. 79 kayda `entry_type`, 17 kayda `source_locator` eklendi; s.34 araştırma görevi ve s.64 dinleme/izleme adım 3 için yeni `performance_support` kayıtları oluşturuldu. Dilekçe, şiirden mektuba dönüşüm ve okuma stratejisi gibi üretim görevleri de uygun `performance_support` türüne geçirildi. Tema 1 artık 151 canonical kayıttan oluşuyor ve yeniden doğrulamada zorunlu alan hatası bulunmadı.

### Tema 2 — Kültür Yolculuğu (s.86–159)

Şema tutarlı ve ölçme-değerlendirme cevapları s.155–159 ile uyumlu (2:C, 3:A, 5:B, 6:D). Sorunlar ağırlıkla PDF'nin görsel/biçim bilgisinin kullanılmamasından kaynaklanıyor. Özellikle s.96 ve s.99 doğrudan düzeltilebilir.

### Tema 3 — Yaşamın İzinde (s.162–235)

Bu turda **kritik/yüksek/orta düzey doğrulanmış hata bulunmadı**. Huzur bölümündeki Suat/Fâhir gibi kitapta verilen parçalarla yeterince desteklenmeyen alanların `source_limited` bırakılması doğru. Direnişin Ustaları ve Aile Bağları gibi QR medyaya bağlı sorularda da sınır korunmuş. s.230–235 ölçme-değerlendirme cevapları seçenekler ve tablolarla uyumlu.

Küçük kullanılabilirlik notu: `T3-P230-Q01` doğru mantığı veriyor fakat Venn şemasına doğrudan `TEZ: 2 / ANTİTEZ: 1 / KESİŞİM: 3` biçiminde sonuç eklenirse öğretmen kullanımında daha hızlı olur; bu bir doğruluk hatası değildir.

### Tema 4 — Hayatın Aynası (s.238–307)

Yeni üretilen blokların şeması güçlü ve QR/video sınırı genel olarak doğru. Ancak s.268'de bir alt görev kısmen kaybolmuş, s.305 görsel sorusu gereksiz `source_limited`, s.304/2 ise gerçek seçenek incelenmeden eksik bırakılmış. Ayrıca klasörde iki orphan eski part dosyası var. Bu nedenle Tema 4 şu hâliyle içerik olarak büyük ölçüde tamam olsa da QA'dan geçmiş kabul edilmemeli.

## Sayfa bazlı denetim matrisi

`OK`: PDF sayfası ile canonical answer-bank arasında doğrulanmış eksik/yanlış bulunmadı veya sayfa yalnız kaynak metin/öz değerlendirme formu olduğundan ayrı hazır cevap beklenmiyor. `UYARI`: düzeltme/iyileştirme gereken bulgu var.

### Tema 1 — s.14–83

| Sayfa | Durum | Not |
|---:|---|---|
| 14 | OK | Düzeltildi: Şema: entry_type eksik |
| 15 | OK | Düzeltildi: Şema: entry_type eksik |
| 16 | OK | Düzeltildi: Şema: entry_type eksik |
| 17 | OK | Düzeltildi: Şema: entry_type eksik |
| 18 | OK | Düzeltildi: Şema: entry_type eksik |
| 19 | OK | — |
| 20 | OK | — |
| 21 | OK | — |
| 22 | OK | — |
| 23 | OK | — |
| 24 | OK | — |
| 25 | OK | Düzeltildi: Şema: entry_type eksik |
| 26 | OK | — |
| 27 | OK | Düzeltildi: Şema: entry_type eksik |
| 28 | OK | Düzeltildi: Şema: entry_type eksik |
| 29 | OK | Düzeltildi: Şema: entry_type eksik |
| 30 | OK | Düzeltildi: Şema: entry_type + source_locator eksik |
| 31 | OK | Düzeltildi: Şema: entry_type + source_locator eksik |
| 32 | OK | Düzeltildi: Şema: entry_type + source_locator eksik |
| 33 | OK | Düzeltildi: Şema: entry_type + source_locator eksik |
| 34 | OK | Düzeltildi: Şema: entry_type + source_locator eksik; 1 haftalık sosyal bilimler araştırması için performance_support yok |
| 35 | OK | Düzeltildi: Şema: entry_type + source_locator eksik |
| 36 | OK | Düzeltildi: Şema: entry_type eksik |
| 37 | OK | Düzeltildi: Şema: entry_type eksik |
| 38 | OK | — |
| 39 | OK | Düzeltildi: Şema: entry_type eksik |
| 40 | OK | Düzeltildi: Şema: entry_type eksik |
| 41 | OK | Düzeltildi: Şema: entry_type eksik |
| 42 | OK | — |
| 43 | OK | Düzeltildi: Şema: entry_type eksik |
| 44 | OK | Düzeltildi: Şema: entry_type eksik |
| 45 | OK | Düzeltildi: Şema: entry_type eksik |
| 46 | OK | Düzeltildi: Şema: entry_type eksik |
| 47 | OK | Düzeltildi: Şema: entry_type eksik |
| 48 | OK | Düzeltildi: Şema: entry_type eksik |
| 49 | OK | — |
| 50 | OK | Düzeltildi: Şema: entry_type eksik |
| 51 | OK | — |
| 52 | OK | Düzeltildi: Şema: entry_type eksik |
| 53 | OK | — |
| 54 | OK | — |
| 55 | OK | — |
| 56 | OK | — |
| 57 | OK | — |
| 58 | OK | — |
| 59 | OK | — |
| 60 | OK | — |
| 61 | OK | — |
| 62 | OK | — |
| 63 | OK | — |
| 64 | OK | Düzeltildi: Kapsam kısmi: dinleme/izleme adım 3 (metin/ortam kaynaklı engelleri azaltma) için açık performance_support kaydı yok |
| 65 | OK | — |
| 66 | OK | — |
| 67 | OK | — |
| 68 | OK | — |
| 69 | OK | — |
| 70 | OK | — |
| 71 | OK | — |
| 72 | OK | — |
| 73 | OK | — |
| 74 | OK | — |
| 75 | OK | — |
| 76 | OK | — |
| 77 | OK | — |
| 78 | OK | — |
| 79 | OK | — |
| 80 | OK | — |
| 81 | OK | — |
| 82 | OK | — |
| 83 | OK | — |

### Tema 2 — s.86–159

| Sayfa | Durum | Not |
|---:|---|---|
| 86 | OK | — |
| 87 | OK | — |
| 88 | **UYARI** | T2-P88-Q03 gereksiz source_limited; soru örnek coğrafya çağrışımı istemekte ve örnek cevap verilebilir |
| 89 | OK | — |
| 90 | OK | — |
| 91 | OK | — |
| 92 | OK | — |
| 93 | OK | — |
| 94 | OK | — |
| 95 | OK | — |
| 96 | **UYARI** | T2-P96-Q04A yanlış source_limited; altı çizili sözcükler gerçek PDF sayfasında görünür |
| 97 | OK | — |
| 98 | OK | — |
| 99 | **UYARI** | T2-P99-Q02 yanlış source_limited; altı görsel gerçek PDF sayfasında açıkça görünür |
| 100 | OK | — |
| 101 | OK | — |
| 102 | OK | — |
| 103 | OK | — |
| 104 | OK | — |
| 105 | OK | — |
| 106 | OK | — |
| 107 | OK | — |
| 108 | OK | — |
| 109 | OK | — |
| 110 | OK | — |
| 111 | OK | — |
| 112 | OK | — |
| 113 | OK | — |
| 114 | OK | — |
| 115 | OK | — |
| 116 | **UYARI** | T2-P116-VOC01: kitap 6 sözcük için 5 tanım veriyor; 'şad' cevabı dış bilgiden tamamlanmış ancak kaynak/provenans ayrı gösterilmiyor |
| 117 | OK | — |
| 118 | OK | — |
| 119 | OK | — |
| 120 | OK | — |
| 121 | OK | — |
| 122 | OK | — |
| 123 | OK | — |
| 124 | OK | — |
| 125 | OK | — |
| 126 | OK | — |
| 127 | OK | — |
| 128 | OK | — |
| 129 | OK | — |
| 130 | OK | — |
| 131 | OK | — |
| 132 | OK | — |
| 133 | OK | — |
| 134 | OK | — |
| 135 | OK | — |
| 136 | OK | — |
| 137 | OK | — |
| 138 | OK | — |
| 139 | OK | — |
| 140 | OK | — |
| 141 | OK | — |
| 142 | OK | — |
| 143 | OK | — |
| 144 | OK | — |
| 145 | OK | — |
| 146 | OK | — |
| 147 | OK | — |
| 148 | OK | — |
| 149 | OK | — |
| 150 | OK | — |
| 151 | OK | — |
| 152 | OK | — |
| 153 | OK | — |
| 154 | OK | — |
| 155 | OK | — |
| 156 | OK | — |
| 157 | OK | — |
| 158 | OK | — |
| 159 | OK | — |

### Tema 3 — s.162–235

| Sayfa | Durum | Not |
|---:|---|---|
| 162 | OK | — |
| 163 | OK | — |
| 164 | OK | — |
| 165 | OK | — |
| 166 | OK | — |
| 167 | OK | — |
| 168 | OK | — |
| 169 | OK | — |
| 170 | OK | — |
| 171 | OK | — |
| 172 | OK | — |
| 173 | OK | — |
| 174 | OK | — |
| 175 | OK | — |
| 176 | OK | — |
| 177 | OK | — |
| 178 | OK | — |
| 179 | OK | — |
| 180 | OK | — |
| 181 | OK | — |
| 182 | OK | — |
| 183 | OK | — |
| 184 | OK | — |
| 185 | OK | — |
| 186 | OK | — |
| 187 | OK | — |
| 188 | OK | — |
| 189 | OK | — |
| 190 | OK | — |
| 191 | OK | — |
| 192 | OK | — |
| 193 | OK | — |
| 194 | OK | — |
| 195 | OK | — |
| 196 | OK | — |
| 197 | OK | — |
| 198 | OK | — |
| 199 | OK | — |
| 200 | OK | — |
| 201 | OK | — |
| 202 | OK | — |
| 203 | OK | — |
| 204 | OK | — |
| 205 | OK | — |
| 206 | OK | — |
| 207 | OK | — |
| 208 | OK | — |
| 209 | OK | — |
| 210 | OK | — |
| 211 | OK | — |
| 212 | OK | — |
| 213 | OK | — |
| 214 | OK | — |
| 215 | OK | — |
| 216 | OK | — |
| 217 | OK | — |
| 218 | OK | — |
| 219 | OK | — |
| 220 | OK | — |
| 221 | OK | — |
| 222 | OK | — |
| 223 | OK | — |
| 224 | OK | — |
| 225 | OK | — |
| 226 | OK | — |
| 227 | OK | — |
| 228 | OK | — |
| 229 | OK | — |
| 230 | OK | — |
| 231 | OK | — |
| 232 | OK | — |
| 233 | OK | — |
| 234 | OK | — |
| 235 | OK | — |

### Tema 4 — s.238–307

| Sayfa | Durum | Not |
|---:|---|---|
| 238 | OK | — |
| 239 | OK | — |
| 240 | OK | — |
| 241 | OK | — |
| 242 | OK | — |
| 243 | OK | — |
| 244 | OK | — |
| 245 | OK | — |
| 246 | OK | — |
| 247 | OK | — |
| 248 | OK | — |
| 249 | OK | — |
| 250 | OK | — |
| 251 | OK | — |
| 252 | OK | — |
| 253 | OK | — |
| 254 | OK | — |
| 255 | OK | — |
| 256 | OK | — |
| 257 | OK | — |
| 258 | OK | — |
| 259 | OK | — |
| 260 | OK | — |
| 261 | OK | — |
| 262 | OK | — |
| 263 | OK | — |
| 264 | OK | — |
| 265 | OK | — |
| 266 | OK | — |
| 267 | OK | — |
| 268 | **UYARI** | T4-P267-VOC02 p.267-268 görevini tek kayda bağlıyor; printed_page=267. S.268/5a çağrışım listesi kısmen var, 5b çağrışım ilişkilerinin açıklaması eksik |
| 269 | OK | — |
| 270 | OK | — |
| 271 | OK | — |
| 272 | OK | — |
| 273 | OK | — |
| 274 | OK | — |
| 275 | OK | — |
| 276 | OK | — |
| 277 | OK | — |
| 278 | OK | — |
| 279 | OK | — |
| 280 | OK | — |
| 281 | OK | — |
| 282 | OK | — |
| 283 | OK | — |
| 284 | OK | — |
| 285 | OK | — |
| 286 | OK | — |
| 287 | OK | — |
| 288 | OK | — |
| 289 | OK | — |
| 290 | OK | — |
| 291 | OK | — |
| 292 | OK | — |
| 293 | OK | — |
| 294 | OK | — |
| 295 | OK | — |
| 296 | OK | — |
| 297 | OK | — |
| 298 | OK | — |
| 299 | OK | — |
| 300 | OK | — |
| 301 | OK | — |
| 302 | OK | — |
| 303 | OK | — |
| 304 | **UYARI** | T4-P304-Q02 anlam ilişkisini doğru açıklıyor fakat gerçek sayfadaki çoktan seçmeli cevap A olduğu hâlde şık verilmemiş; “seçenekler görünmedi” açıklaması artık geçersiz |
| 305 | **UYARI** | T4-P305-Q05 yanlış source_limited; dört görsel PDF'de görünür ve örnek seçim/gerekçe üretilebilir |
| 306 | OK | — |
| 307 | OK | — |

## Düzeltme önceliği

1. Tema 1'de 79 kayda `entry_type`, 17 kayda `source_locator` eklenerek şema normalize edilmeli.
2. `T2-P96-Q04A`, `T2-P99-Q02`, `T4-P305-Q05` gerçek PDF görüntülerine göre yeniden yazılmalı ve `source_limited` kaldırılmalı.
3. Tema 4 s.268/5b için eksik cevap desteği eklenmeli; `T4-P267-VOC02` sayfa kapsamı düzeltilmeli.
4. `T4-P304-Q02` doğru şık **A** ile tamamlanmalı ve extraction gerekçesi kaldırılmalı.
5. Tema 1 s.34 araştırması ve s.64 adım 3 için `performance_support` eklenmeli.
6. Tema 2 s.88 Q3 normal `question_answer` olarak örnek cevapla yeniden sınıflandırılmalı; s.116 `şad` için kaynak sınırı açıklaştırılmalı.
7. Tema 4'te iki orphan eski part dosyası kaldırılmalı veya arşivlenmeli; tüketicilerin yalnız master indeksini izlemesi güvenceye alınmalı.
8. Bu düzeltmelerden sonra 4 tema için tekrar schema/duplicate/blank/source-limited QA çalıştırılmalı ve ancak sonra genel durum QA-passed yapılmalı.

## Tema 1 remediation doğrulaması — 18.09.2026

- Uygulama commit'i: `6aaa33d895955bfca13a08fa6d7507cabaade450`
- Canonical Tema 1 kayıt sayısı: **151**
- Zorunlu alan eksiği: **0**
- Geçersiz `entry_type`: **0**
- Boş `answer`: **0**
- `source_limited`: **12** (değişmedi)
- Master part toplamı: **151**
- Genel manifest answer-bank toplamı: **620**

## Sonuç

Veritabanı genel olarak kullanılabilir ve Tema 2–4'ün yeni üretimlerinde kalite belirgin biçimde yükselmiş. Bununla birlikte mevcut manifestteki “tüm temalar tamamlandı” ifadesi **üretim tamamlandı** anlamında doğru olsa da **kalite kontrolünden geçti** anlamında doğru değildir. Tema 1'in eski şema borcu bu rapordan sonra giderilmiştir. Açık kalan en belirgin içerik hataları Tema 2 ve Tema 4'te görsel sayfaların render edilmeden `source_limited` bırakıldığı kayıtlardır.
