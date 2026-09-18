# Lesson Player

Öğretmen Rehberi kanonik verisini sınıfta tam ekran yürütmek için React/Vite tabanlı ders oynatıcı.

İlk pilot:

- 11. sınıf
- 1. Tema — Bir Diyeceğim Var!
- Karagöz / Yazıcı
- basılı s.15–35

## Çalıştırma

```bash
cd apps/lesson-player
npm install
npm run dev
```

`npm run dev` önce `scripts/build-lesson-data.mjs` çalıştırır. Böylece UI içine elle cevap kopyalanmaz; generated veri mevcut `source-index.json`, `answer-bank` ve `karagoz-flow.json` dosyalarından üretilir.

## Klavye

- ← / →: önceki / sonraki
- Space: sıradaki gizli öğretmen katmanını aç, hepsi açıksa sonraki adıma geç
- C: cevap
- G: yönlendirme
- E: açıklama
- F: tam ekran
- Home / End: ilk / son adım

## Mimari

Ayrıntılı plan: `docs/LESSON_PLAYER_PLAN.md`.
