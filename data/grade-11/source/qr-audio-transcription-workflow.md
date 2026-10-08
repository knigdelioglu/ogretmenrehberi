# Karekod videoları: Mac'te yerel ses transkripsiyonu

**Amaç:** Ders kitabındaki 18 MP4'ün Türkçe konuşmasını yerel olarak *taslak* metne dönüştürmek ve sesli ifadeleri kitap sorularına aktarmadan önce doğrulamak. MP4'lerin sayfa, EBA ve SHA-256 bilgileri qr-media-intake-2026-10-08.json dosyasından okunur.

**Önemli sınır:** Bu otomasyon tam ve doğru transkript sözü vermez. Otomatik konuşma tanıma şiir dizelerini, halk ağzını, isimleri veya sessiz bölümleri yanlış çözebilir. Öğretmen cevap bankalarına otomatik kayıt yapılmaz.

## M4 MacBook kurulum

Projenin kök dizininde:

~~~bash
brew install ffmpeg
python3 -m venv .venv
.venv/bin/python -m pip install --upgrade pip
.venv/bin/python -m pip install mlx-whisper
~~~

Apple Silicon üzerinde varsayılan model mlx-community/whisper-large-v3-turbo kullanılır. Bu modelin ilk indirmesi internet bağlantısı ister (model ağırlıkları yaklaşık 1,6 GB). Yerel ASR kullanımı için [MLX Whisper](https://github.com/ml-explore/mlx-examples/tree/main/whisper), [model kartı](https://huggingface.co/mlx-community/whisper-large-v3-turbo) ve başka bir modeli seçmek için --model parametresine bakın.

Videoları varsayılan sources/local/qr-media/ içine *envanterdeki dosya adlarıyla* koyabilir veya komutlara örneğin --media-dir "$HOME/Downloads/Karekod Videoları" ekleyebilirsiniz. Doğrulanmış beş EBA dosyası QR-EBA-...mp4 adıyla da aranır. Kaynak dosyalarının SHA-256 değeri envanterdeki değerle **birebir eşleşmek zorundadır**. Video yeniden kodlanmış veya farklı sürümse işlem durur; yanlış video sessizce kabul edilmez.

## İlk üç pilot: Olvido, âşık atışması ve mektup

~~~bash
# 18 kaynak dosyasını listele (MLX modeli yüklenmez)
.venv/bin/python scripts/qr_audio_transcribe.py --list

# Önce SHA-256 kontrolü; gerçek ses tanıma yapılmaz
.venv/bin/python scripts/qr_audio_transcribe.py \
  --file OGM2025TDE118312.mp4 --file 19XU49JV.mp4 \
  --file 19XU49ME.mp4 --dry-run

# Yerel otomatik ses dökümünün TASLAĞINI hazırla
.venv/bin/python scripts/qr_audio_transcribe.py \
  --file OGM2025TDE118312.mp4 --file 19XU49JV.mp4 \
  --file 19XU49ME.mp4

# Diğerleriyle devam et; önceki çıktı varsa SHA/model/durum eşleşirse atla
.venv/bin/python scripts/qr_audio_transcribe.py --all --resume
~~~

Var olan taslağı değiştirmek için --overwrite seçeneği açıkça istenmelidir; --resume ve --overwrite birlikte kullanılamaz. --all tüm videoların dosyalarını kontrol eder, eksik bir dosyada işleme başlamadan durur. Çoklu kullanım için --file parametresi tekrarlanabilir.

## Mahremiyet, çıktı ve güvenlik

Çıktılar **yalnızca** sources/local/qr-transcripts/ altında JSON + zamanlı SRT taslağı olarak kalır. Burası .gitignore tarafından dışlanmıştır. Kök repoda izlenen başka bir konuma yazmaya çalışılırsa script hata verir. Repo dışındaki özel klasör --output-dir ile seçilebilir. Kaynak MP4'ler ve dökümler bir ASR servisine yüklenmez; model indirildikten sonra işleme yereldir.

Örnek özel dosyalar:

- sources/local/qr-transcripts/OGM2025TDE118312.asr-draft.json
- sources/local/qr-transcripts/OGM2025TDE118312.asr-draft.srt

JSON içinde kaynak SHA-256, sayfa, EBA QR kimliği, dosya kökeni doğrulama düzeyi, model, zaman damgaları, belirsizlik uyarıları bulunur. Durum **her zaman** ASR_DRAFT_UNREVIEWED ve transcript_verified=false olarak çıkar; satırlar da human_verified=false ile başlar. Taslaklar tam şiir veya söyleşi metni içerebilir: **kamusal GitHub'a yüklemeyin**.

## Yerel taslaklardan dinleme kontrol kuyruğu oluşturma

ASR taslakları üretildiğinde, aynı özel klasörde her ses parçasının zaman aralığını ve kontrol önceliğini gösteren bir **inceleme kuyruğu** oluşturabilirsiniz:

~~~bash
# 18 kaydın hangisinin transkript taslağı var? Yalnız durum, yazma yok.
.venv/bin/python scripts/qr_audio_review_queue.py --all --status

# Üç öncelikli kayıt için zaman damgalı kontrol listesi oluştur.
.venv/bin/python scripts/qr_audio_review_queue.py \
  --file OGM2025TDE118312.mp4 \
  --file 19XU49JV.mp4 \
  --file 19XU49ME.mp4

# Tüm video taslakları mevcut olmalıysa strict kontrol kullan.
.venv/bin/python scripts/qr_audio_review_queue.py --all --strict

# Önceden hazırlanmış özel kontrol listesini bilinçli yenile.
.venv/bin/python scripts/qr_audio_review_queue.py --all --overwrite
~~~

Varsayılan özel çıktı sources/local/qr-transcripts/_qr-audio-manual-review-queue.md dosyasıdır. Dosyanın içinde konuşma/şiir metinleri **yeniden kopyalanmaz**; yalnız bölüm numaraları, yaklaşık dakika/saniye ve dinleme uyarıları vardır. Gerçek taslak satırlarını aynı özel klasördeki asr-draft.srt ile karşılaştırın.

Araç, JSON'un beklenen **SHA-256, EBA hedefi, sayfa, model ve doğrulama bayrağına** uyup uymadığını sınar. Yanlış kaynak veya bozulan satır bulunduğunda INVALID_DRAFT, henüz üretilmeyen kayıt için MISSING_DRAFT yazar. Düşük olasılık, sessizlik, tekrarlanan cümle, tarih/sayı, çakışan zaman gibi şüpheli bölümleri **öncelikli** listeler. Şiir ve âşık atışmasındaki **her satır** ayrıca önceliklidir.

**Bu araç otomatik onay mekanizması değildir:** Liste üzerindeki bir kutunun işaretlenmesi, gerçek dinleyenin kimliğini veya doğruladığı sözcükleri kanıtlamaz; sesli kanıtı cevaba taşımak için ayrıca orijinal MP4'le insan kontrolü yapılmalıdır. Kişilerin sözlerini şiire/mısraya atfetme, şairin sesi iddiası veya tarihî olgu kontrolü uygulama tarafından otomatik doğrulanamaz.

## Whisper zaman damgası video süresini aşarsa

Bazı ASR taslakları, özellikle sessizlik veya klibin sonundaki boşluklar sırasında, **video bitiminden sonraya taşan bölüm zamanları** üretebilir. Bu bir konuşma kanıtı değildir. Daha önce bu durum `INVALID_DRAFT, 0 segments` olarak görünüyordu ve inceleme sırasını gizliyordu.

Güncel `qr_audio_review_queue.py`, **kaynağın SHA, EBA kimliği ve ASR taslak durumu doğruysa** bu tür bölümleri silmeden `ASR_DRAFT_TIMING_REVIEW` durumuna alır. İlgili zaman aralıkları `beyond_media_end_check_audio` etiketiyle **HIGH** öncelikli görünür. Bölüm video bittikten *sonra başlıyorsa* ayrıca `segment_starts_after_media_end_possible_hallucination` işareti çıkar. Ekranda gerçek taşma miktarı da gösterilir. Negatif, ters veya sonlu olmayan zamanlar hâlâ `INVALID_DRAFT` olarak reddedilir.

Güncellemeyi çektikten sonra **videoları yeniden transkribe etmeden** raporu yeniden oluşturun:

~~~bash
git pull --ff-only
sources/local/qr-media/.venv/bin/python scripts/qr_audio_review_queue.py --all --overwrite
~~~

İncelenecek beş dosya: `19XU3SUD.mp4`, `19XU4CVR.mp4`, `19XU49JV.mp4`, `19XU49LQ.mp4`, `19XU3SW3.mp4`. Önce orijinal MP4'lerin son 30–45 saniyesini dinleyin. Taslakta süre aşan cümleler gerçekten duyulmuyorsa **uydurulmuş içerik** olabilecekleri için hiçbir ders cevabına aktarılmamalıdır. Sesli içerik transkriptinin tam doğrulandığı iddia edilemez.

`--strict` kipinde bu tür zaman-taşması bulunan kayıtlar **başarısız** sayılır; böylece zaman taşması sessizce başarıya dönüşmez. Normal rapor kipinde ise bölüm listesi korunur ve kullanıcıya hangi kısmın inceleneceği açıkça gösterilir.

## Gerçek MP4 süresi ölçümü: son 30 saniye uyarısının açıklaması

Beş videonun orijinal MP4 süresi `ffprobe` ile kontrol edildi; envanterle **tam eşleşiyor**. Her sorunlu ASR bölümünün ham uzunluğu yaklaşık **29,98 saniye**: bu, modelin son 30 saniyelik çalışma penceresinin zamanlarını gerçek video bitişine uyarlayamamasıyla **uyumludur**; kendi başına bütün sözlerin hayal ürünü olduğunu kanıtlamaz.

| Video | MP4 süresi (sn) | Ham son ASR bölümü | Taşma (sn) |
| --- | ---: | --- | ---: |
| `19XU3SUD.mp4` | 143,88 | 120,00–149,98 | +6,10 |
| `19XU4CVR.mp4` | 98,60 | 90,00–119,98 | +21,38 |
| `19XU49JV.mp4` | 207,07 | 179,10–209,08 | +2,01 |
| `19XU49LQ.mp4` | 429,00 | 423,68–453,66 | +24,66 |
| `19XU3SW3.mp4` | 146,16 | 120,00–149,98 | +3,82 |

Kontrol listesinin yeni gösterimi **Dinleme** aralığını MP4'ün gerçek bitişinde durdurur. **Ham ASR** aralığı ve toplam taşma süresi **ayrıca ve aynen** görünür. Taslak JSON/SRT zamanları, ses metinleri ve kaynak dosyaları değiştirilmez. Bölüm bütünüyle videonun sonrasına düşerse **Oynatılabilir ses yok** uyarısı gösterilir; o ifadeler işitsel kanıt kabul edilmez.

```bash
git pull --ff-only
sources/local/qr-media/.venv/bin/python scripts/qr_audio_review_queue.py --all --overwrite
```

Bu beş videoda gerçek kayıt içindeki son bölümleri orijinal MP4 ile dinleyerek doğrulayın. Gerçek video sonrasındaki saniyelerden hiçbir konuşma/alıntı çıkarılamaz; videonun içinde başlayan 30 saniyelik bir ASR bölümünün **tamamı** ise otomatik olarak sahte kabul edilmez. `--strict` süre taşmalarını uyarı olarak değil, **tam doğrulama için engel** olarak saymaya devam eder.

## Öğretmen tarafından dinleyerek doğrulama

1. **83. sayfa — Olvido:** Gerçek şiir okuyuşunu dinleyerek dize sınırları, ses tonu, vurgu, tempo, duraklama ve varsa müziği ayrı ayrı doğrulayın. Video girişindeki “Şairin Sesinden” yazısı sesin arşiv kökeninin bağımsız kanıtı değildir. Yanıt Q13'te görsel gözlemi ve işitsel kanıtı ayrı gösterin.
2. **140. sayfa — âşık atışması:** İcracıların hangi sırayla konuştuğunu ve çağ, canan, sine, kahır, saban sözcüklerinin gerçekten hangi mısralarda kullanıldığını dinleyerek işaretleyin. Tam şiir dizeleri ve konuşmacı kimlikleri modelden varsayılmaz.
3. **43. sayfa — Mektup Türünün Serüveni:** Videodaki farklı mektup koleksiyonuyla Mehmet Kaplan'ın *kitapta basılı* özel/edebî mektup özelliklerini karıştırmayın. Sınıflandırma yine basılı metinden kanıtlanır.
4. **Diğer videolar:** Özellikle özel ad, tarih, halk ağzı, doğrudan alıntı ve konuşmacı atfını tek tek sesle karşılaştırın. Düşük log olasılığı veya olası sessizlik uyarıları bulunan segmentleri öncelikli denetleyin.
5. **Kaynak terfisi:** Ancak doğrulandıktan sonra kısa zaman damgalı paraphrase'leri kaynak notlarına aktarın; ayrı PR'de ilgili soru, kaynak status ve sunum değişikliklerini test edin. Tam ses dökümünü repoya eklemeyin.

## Geliştirici kontrolleri

~~~bash
python3 -m unittest discover -s scripts/tests -p 'test_qr_audio_transcribe.py' -v
python3 -m unittest discover -s scripts/tests -p 'test_qr_audio_review_queue.py' -v
node scripts/validate-qr-media-intake.mjs
~~~

Bunlar sahte ASR motoru üzerinden **yazılımın** SHA korumasını, özel çıktı biçimini, zaman damgasını ve kaldığı yerden devam etme davranışını sınar. **Gerçek modelin konuşma doğruluğunu sınamaz.**

**2026-10-08 itibarıyla:** 18/18 kitap QR hedefi, 18/18 kanıt notu; 5/18 MP4 için EBA/SHA kesin eşleşmesi; **0/18 doğrulanmış tam ses transkripti**. Bu dosyadaki komutların çalışabilir olması, herhangi bir videonun sesinin çözümlendiği anlamına gelmez.
