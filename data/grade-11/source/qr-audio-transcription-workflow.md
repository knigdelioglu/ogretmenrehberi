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
