/**
 * ÖğretmenRehberi Tasarım Sistemi (ORDS) - Sakin Hareket Tokenları
 * Arc Library'nin calm motion felsefesi ve yay modelleri referans alınarak tasarlanmıştır.
 */

export const ordsMotion = {
  /** Geçiş süreleri (saniye cinsinden) */
  duration: {
    /** 120ms - Buton basma, toggle tik, anlık tıklama */
    instant: 0.12,
    /** 160ms - Hover, tooltip, mikro bildirim */
    fast: 0.16,
    /** 240ms - Standart panel açılma, akordiyon, sekme değişimi */
    standard: 0.24,
    /** 480ms - Sayfa geçişleri, diyaloglar, modallar */
    considered: 0.48,
  },

  /** Cubic-bezier yumuşatma eğrileri */
  ease: {
    /** Sakin, fiziksel yavaşlamayla sahneye giriş */
    enter: [0.16, 1.0, 0.30, 1.0] as const,
    /** Sürüklenmeden hızlıca sahneden çıkış */
    exit: [0.70, 0.0, 0.84, 0.0] as const,
    /** Standart dengeli yer değiştirme */
    standard: [0.22, 1.0, 0.36, 1.0] as const,
    /** Ekranda zaten var olan elemanların konum değiştirmesi */
    inOut: [0.65, 0.0, 0.35, 1.0] as const,
  },

  /** Fiziksel yay (spring) konfigürasyonları (React / Motion / Compose uyumlu) */
  spring: {
    /** Tepkisel: Menü ve dropdown açılışları */
    responsive: { type: "spring", stiffness: 520, damping: 38 } as const,
    /** Sakin ve yumuşak: Kart genişleme, panel kayma */
    gentle: { type: "spring", stiffness: 340, damping: 34 } as const,
    /** Canlı ve hızlı oturan: Düğmeler, seçim halkaları */
    snappy: { type: "spring", stiffness: 400, damping: 30 } as const,
  },
} as const;

export type OrdsMotion = typeof ordsMotion;
