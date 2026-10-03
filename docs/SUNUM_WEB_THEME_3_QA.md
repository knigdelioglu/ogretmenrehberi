# Theme 3 presentation QA

## Scope and source

This audit covers only Grade 11 Theme 3, printed pages 160–235. The primary local source is `data/book/grade-11/themes/theme-3/manifest.json` and its 76 page JSON files (`p160.json`–`p235.json`). The manifest records SHA-256 `87248cb5f6940c29b7d152fab5cb1f7b800e4d5ddc46ac4cdeb5542f0361a1ba`; printed page *n* corresponds to PDF page *n* + 1 (PDF pages 161–236). Source checks used page transcriptions, question/table blocks, visual descriptions, and source-index records; the PDF text layer alone was not treated as the complete source.

## Flow coverage

All 18 Theme 3 flows use canonical answer-bank entries. The 76 pages contain 809 blocks, including 176 question blocks. The flows contain 312 steps, of which 220 have answers; all 220 answer references resolve. The canonical answer bank has 81 `question_answer`, 114 `performance_support`, and 25 `source_limited` entries. All 146 Theme 3 source-index records are referenced by the flow set.

| Printed pages | Flow | Steps | Answer steps |
|---:|---|---:|---:|
| 160-163 | `tema-3-girisi` | 8 | 6 |
| 164-174 | `huzur-okuma` | 23 | 18 |
| 175-176 | `huzur-metni-anlayalim-175-176` | 13 | 13 |
| 177-178 | `huzur-177-178` | 11 | 10 |
| 179-181 | `huzur-okuma-cemberi-179-181` | 17 | 11 |
| 182-185 | `huzur-hayat-kurmaca-182-185` | 19 | 18 |
| 186-188 | `huzur-yapi-uslup-186-188` | 20 | 7 |
| 189-191 | `huzur-catisma-dil-189-191` | 22 | 18 |
| 192-193 | `huzur-degerlendirme-192-193` | 14 | 10 |
| 194-198 | `biyografi-akif-194-198` | 18 | 8 |
| 199-201 | `biyografi-akif-anlama-199-201` | 16 | 15 |
| 202-205 | `biyografi-akif-cozumleme-202-205` | 17 | 16 |
| 206-209 | `usuli-tezkire-206-209` | 15 | 10 |
| 210-214 | `kemal-tahir-mulakat-210-214` | 20 | 9 |
| 215-220 | `direnisin-ustalari-215-220` | 21 | 15 |
| 221-224 | `direnisin-ustalari-221-224` | 17 | 12 |
| 225-229 | `radyo-diyalog-yazma-225-229` | 17 | 8 |
| 230-235 | `degerlendirme-230-235` | 24 | 16 |

## Evidence quote links

The 52 canonical `evidence_quotes` were matched against the local printed-page transcriptions after joining word-break hyphens and normalizing line breaks. A quote link names the response unit it supports. When an exact quotation also appears in an answer section, that section is configured as evidence for the same unit and marks the quote as inline, so the renderer does not repeat it as a separate quote card. If one quotation supports more than one response, its index links to each relevant unit (as on p.193).

| Answer ID | Quote index | Response unit | Matching printed page(s) | Excerpt |
|---|---:|---|---|---|
| `T3-P164-Q03` | 0 | `Safa'nın görüşü` | p164 | romanda yaşanmamış kısımlar, yaşanmışlardan daha gerçek… |
| `T3-P164-Q03` | 1 | `Safa'nın görüşü` | p164 | roman olağanı olmuş göstermek sanatıdır |
| `T3-P175-Q02` | 0 | `tema` (evidence: `Dayanak: tema`) | p169, p190 | İstanbul’u tanımadıkça kendimizi bulamayız. |
| `T3-P175-Q02` | 1 | `yazilis_amaci` (evidence: `Dayanak: yazılış amacı`) | p169, p180 | Bir hüviyet lâzım. |
| `T3-P176-Q03` | 0 | `Psikolojik yönün metin dayanağı` | p169 | Mümtaz da, kendisinde muzlim bir tarafın bulunduğundan… |
| `T3-P176-Q03` | 1 | `Modernist yönün metin dayanağı` | p169, p190 | İstanbul’u tanımadıkça kendimizi bulamayız. |
| `T3-P176-Q04` | 0 | `İşlev` (evidence: `Dayanak 1`) | p167, p176 | her şey insanı kendisine çağırır, kendi derinliğine ind… |
| `T3-P176-Q04` | 1 | `İşlev` (evidence: `Dayanak 2`) | p167, p176 | hepsi bizimdi |
| `T3-P176-Q05` | 0 | `metinle_bag` | p169 | Bir hüviyet lâzım. Bu hüviyeti her millet mazisinden al… |
| `T3-P176-Q10` | 0 | `metindeki_neden` | p168 | Üsküdar’ın bu dört büyük camii aşka, güzelliğe, yahut h… |
| `T3-P176-Q10` | 1 | `konusan_kisi` | p168 | — Mümtaz, Üsküdar’da hakikî kadın saltanatı var... |
| `T3-P176-Q13` | 0 | `ortak_hatira` | p168 | İstanbul manzaralarıyla eski musıkîmiz birleşiyor, sest… |
| `T3-P177-Q14` | 0 | `acik_iletiler` | p169, p190 | İstanbul’u tanımadıkça kendimizi bulamayız. |
| `T3-P177-Q14` | 1 | `acik_iletiler` | p169, p180 | Bir hüviyet lâzım. |
| `T3-P178-PERF01` | 0 | `Bağ Kurucu` | p169, p190 | İstanbul’u tanımadıkça kendimizi bulamayız. |
| `T3-P178-PERF01` | 1 | `Okuma Aydınlatıcısı` | p169, p180 | Bir hüviyet lâzım. |
| `T3-P178-PERF01` | 2 | `Karakter Çözümleyici` | p170 | Bende İhsan’ın tesiri büyüktür. Asıl hocam odur. |
| `T3-P182-Q02` | 0 | `Gerçek hayatla bağ` | p182 | Tanpınar, kendisinin bir projeksiyonu olan Mümtaz |
| `T3-P182-Q02` | 1 | `Kurmaca dönüşüm` | p182 | hayattan almış olduğu bütün şahısları az çok değiştirmiş |
| `T3-P184-Q02` | 0 | `1 · Halkı sevmek ve insanı kavramlaştırmak` | p184 | Hayatı mı, halkı mı? . . Bana öyle geliyor ki, hayatı d… |
| `T3-P184-Q02` | 1 | `2 · Yeni hayat ve tarihî kökler` | p184 | Tarihimize bütünlüğünü iade etmek zarureti. |
| `T3-P184-Q02` | 2 | `3 · Nuran, serçeler ve köpek` | p185 | Mümtaz, ekmek ufaklarını pencerenin kenarına koydu, cam… |
| `T3-P184-Q02` | 3 | `4 · İhsan'ın hastalığı` | p185 | komşunun evinden telefon etmek |
| `T3-P187-Q02` | 0 | `kisi_dil_uslup` (evidence: `Dayanak: kişi ve kimlik`) | p169, p180 | Bir hüviyet lâzım. |
| `T3-P187-Q02` | 1 | `mekan_dil_uslup` (evidence: `Dayanak: mekân`) | p169, p190 | İstanbul’u tanımadıkça kendimizi bulamayız. |
| `T3-P187-Q02` | 2 | `kisi_dil_uslup` (evidence: `Dayanak: kişi diyaloğu`) | p169 | Niçin eskiye bu kadar bağlıyız? |
| `T3-P188-Q03CC` | 0 | `kultur_ve_gecmis` | p169, p180 | Bir hüviyet lâzım. |
| `T3-P188-Q03CC` | 1 | `mimari_ve_sehir` | p169, p190 | İstanbul’u tanımadıkça kendimizi bulamayız. |
| `T3-P193-PERF01` | 0 | `Dil ve söz varlığı (örnek)` | p169, p180 | Bir hüviyet lâzım. |
| `T3-P193-PERF01` | 1 | `Mekânın işlevi (örnek)` | p169, p190 | İstanbul’u tanımadıkça kendimizi bulamayız. |
| `T3-P193-PERF01` | 2 | `Kişilerin bakış açıları ve ilişkileri (örnek)` | p182 | İhsan, onun hem babası, hem hocası idi. |
| `T3-P193-PERF03` | 0 | `Üç Yaz · kimlik`; also `İki Sor · kimlik` | p169, p180 | Bir hüviyet lâzım. |
| `T3-P193-PERF03` | 1 | `Üç Yaz · şehir`; also `Bir Paylaş · şehir` | p169, p190 | İstanbul’u tanımadıkça kendimizi bulamayız. |
| `T3-P193-PERF03` | 2 | `Üç Yaz · hüzün` | p167, p189, p190 | hüznün şifasızlığı |
| `T3-P199-Q01` | 0 | `Değerlendirme` | p197 | duyarlı ve vicdanlı bir aydındır |
| `T3-P201-WORK01` | 0 | `Ana düşünce` | p197 | O kalemini millet ve memleket meselelerine hasretmiş bi… |
| `T3-P201-WORK01` | 1 | `Ana düşünce` | p197 | sanat ve estetikten ödün vermemiştir |
| `T3-P202-Q01` | 0 | `oznel` (evidence section under the `oznel` response) | p197 | duyarlı ve vicdanlı bir aydındır |
| `T3-P202-Q01` | 1 | `oznel` (evidence section under the `oznel` response) | p197 | Türk edebiyatında önemli bir boşluğu doldurmuştur |
| `T3-P202-Q01` | 2 | `oznel` (evidence section under the `oznel` response) | p197 | sanat ve estetikten ödün vermemiştir |
| `T3-P208-Q02` | 0 | `Nükteli yön` | p206 | Kırk yıldır ben kendüme gelemedüm size nîce varayın. |
| `T3-P208-Q02` | 1 | `Tasavvufî yön` | p207 | Bu yalancı dünyede sen de bir iki gün oyalan |
| `T3-P210-Q01` | 0 | `Mülakatın amacı` (evidence: `Romanın hazırlanışı`) | p210 | Bu ilk hazırlığa ben “romanının maddî temeli” diyorum. |
| `T3-P210-Q01` | 1 | `Mülakatın amacı` (evidence: `Roman kişisinin canlanması`) | p210 | Bu canlanışı ben Mikelanj’ın “İnsanın Yaratılışı” tablo… |
| `T3-P210-Q01` | 2 | `Mülakatın amacı` (evidence: `Yazarlık emeği`) | p210 | Benzeri o zamana kadar dünyada bulunmayan bir kişiyi, k… |
| `T3-P210-Q01` | 3 | `Mülakatın amacı` (evidence: `Türkçe hakkında görüş`) | p210 | Türkçemiz, bugünkü haliyle, sanat yapmakta, düşünceleri… |
| `T3-P215-Q01` | 0 | `Metinde belirtilen nedenler` | p215 | Televizyonun Türkiye’de yaygınlaşması ve popüler kültür… |
| `T3-P215-Q01` | 1 | `Metinde belirtilen nedenler` | p215 | 1980’lerden sonra Türkiye’de ticari radyo ve televizyon… |
| `T3-P215-Q01` | 2 | `Metinde belirtilen nedenler` | p215 | Kapitalizmin daha çok tüketmek üzerine kurulu sistemi,… |
| `T3-P218-QH02` | 0 | `audio-elements` | p218 | görüntüden yoksun olduğundan ister istemez bu boşluğu s… |
| `T3-P218-QH02` | 1 | `audio-elements` | p218 | İki aynı renkteki sese bir radyo oyununda rol verilmez. |
| `T3-P218-QH02` | 2 | `audio-elements` | p218 | Bir kapı gıcırtısı verirken, o kapının fiziki yapısı, n… |

## Source boundaries

- The p.177 comparison uses a Mescid-i Aksa photograph; the poem text needed for the second column is not present in the supplied source pages. The flow leaves that column incomplete until the verified poem text is available.
- The `Direnişin Ustaları` recording is not included in the textbook PDF. Claims about its people, actions, dialogue, language, structure, or message remain marked as source-limited; the p.217 vocabulary task also depends on listening to that recording for contextual meanings.
- The p.221 `Osmancık` video QR content is unavailable in the source set, so the comparison with `Direnişin Ustaları` is not filled from assumptions.
- The p.235 `Aile Bağları` video QR content is unavailable in the source set, so the questions about its dialogue and dramatic structure remain source-limited.
- The p.180–181 Macide helper answers previously cited information from p.182 ahead of the reading point. They now reflect the p.167–171 reading cut: Macide does not speak there; Nuran only says she expects to like her. No character, feeling, or language judgment is made from that statement.

## Presentation decisions

Answer sections that explain or quote support are assigned to the answer they justify and open in its evidence stage. This keeps direct answers and their source support together while preventing a quoted excerpt from appearing once in the response body and again as a quote card. P.175 question 2 links the Istanbul quotation to theme and the identity quotation to purpose; neither is presented as evidence for the novel's topic. P.176 question 4 keeps the three supporting passages under the single function answer. P.184 question 2 maps the feeding-birds excerpt to section 3 and the phone-call excerpt to section 4.

The p.193 creative response now separates the six authored outputs into response units. The identity quotation follows both its short interpretation and its related question; the Istanbul quotation follows its interpretation and sharing response; the melancholy quotation follows its interpretation. The biography task similarly keeps the four interview excerpts in the evidence stage of its single purpose answer. P.202's three subjective quotations are evidence under the subjective-response unit, after the objective examples.

The authored interleaves remain unchanged. `s165-166-fark` reveals the six words in three two-word groups (`huzur/rüya`, `saz/boğaz`, `tarih/garp`). `s184-185-value-q2` keeps each of its four answer sections as a separate unit, with its own evidence stage before the next prompt. `s214-q1` presents the open response and its rationale before the hidden prompt for the implicit response, then shows that response with its rationale. The p.218 audio task keeps music, sound effect, performance, and intonation in one response group.

Eight structured summaries remain included through exact excerpts assigned to their relevant response units: `T3-P177-Q14`, `T3-P183-Q01`, `T3-P187-Q02`, `T3-P188-Q03B`, `T3-P200-PERF01`, `T3-P202-Q01`, `T3-P210-Q01`, and `T3-P222-PERF01`. The excerpts are not copied wholesale into one unit. P.177's open and implicit definitions stay with their respective responses; p.200's summary appears with the memorial/dedication response, not the later personal reflection; p.222's lead-in does not expose the value-map examples.

## Verification

- `node apps/sunum-web/scripts/test-theme-3-presentation.mjs --static-only`: **passed** — 18 flows, 312 steps, 146 source records, 220 answers, all 52 source-matched quotations, and 28 validated metadata overrides. The static test resolves metadata with the shared production contract, audits exact quote duplication, checks answer-stage excerpts and source-section coverage, and asserts the three interleave groupings.
- Theme 1 owner ran Sunum Web `npm test`: **passed** — the common builder/test pipeline completed and all four theme sidecars reached the encrypted catalog.
- `node apps/sunum-web/scripts/test-theme-3-presentation.mjs --catalog-only`: **passed** — verified all 220 Theme 3 answers in the actual generated catalog and authenticated encrypted `dist` payload.
- `CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' node apps/sunum-web/scripts/test-theme-3-presentation.mjs`: **passed** — headless Chrome opened the built production site and checked p.165, p.184, and p.214 interleave ordering; p.177 answer/evidence sequencing without duplicate quote cards; all three p.218 audio quotations; and the no-invented-evidence boundary for the unavailable recording. The p.184 and p.218 answer/evidence layouts were checked at 1440px and 800px.
- `node --check apps/sunum-web/scripts/test-theme-3-presentation.mjs` and `git diff --check`: **passed**.

The browser test uses the real generated lesson catalog, the actual encrypted `dist`, and the local production server. It does not construct an isolated fixture or rebuild either artifact.
