// isik-borusu.js — saf (THREE'siz, Node testli) laminer ışık borusu modeli.
//
// v7 TUR 1 IŞIK / ŞİKÂYET 2. Kaynak: docs/2026-07-18-su-alti-isik-referansi.md §3.1, §5.5.
// KİLİT BULGU: laminer su ışığı BOYANMAZ, İLETİR. Temiz jetin cam-çubuk yüzeyi
// tam iç yansıma (TIR, su/hava kritik açısı 48.6°) yapar → ışık fiber optik gibi
// gövde boyunca taşınır, gövde KARANLIK kalır, ışık KOPMA NOKTASINDA ölür/patlar.
// Salih'in "laminer iniş su değil ışık hüzmesi gibi" şikâyeti bu yüzden yarı doğru
// gözlemdi: düzeltme ışığı söndürmek değil, ışığı gövdeden alıp UCA taşımak.
//
// Bu modül shader'ın ihtiyaç duyduğu SKALERLERİ üretir (JS tarafında bir kez, uniform
// olarak yüklenir); GLSL kopyası laminer.js içinde aynı formülü yol boyunca uygular.

// Görsel tavan: LED ışığı kopma noktasına kadar taşınır ve orada ölür — pompayı
// zorlamak tavanı YÜKSELTMEZ (Firgelli). Referansta ~5 m veriliyor.
export const GORSEL_TAVAN_M = 5.0;

// Yüzey kalitesi → yol boyu sızıntı katsayısı (m^-1). 1=cam gibi temiz jet (kayıp ~0),
// 0=kirli/çizik nozul, kabarcıklı akış ("jet yarı yüksekliğinde donuklaşır").
//
// ⚠BİRİM DÜZELTMESİ: referans §5.5 `mix(2.5, 0.08, q)` veriyor ama örnek hesabında
// (`exp(-2.5 × 0.5) ≈ 0.29`) üsse NORMALİZE s'i koyuyor — yani o katsayılar m^-1
// değil, "jet boyu başına". Metre tabanına geçirdik (uzun jet daha çok söndürmeli;
// aynı nozul 1 m'de kayıpsız, 8 m'de yarıda ölmeli) ve katsayıları referansın
// SONUÇLARINI koruyacak şekilde 5 m'lik tipik jete kalibre ettik:
//   kirli, yarı yükseklik (2.5 m): exp(-0.50 × 2.5) = 0.29  ✓ ("yarıda donuklaşır")
//   temiz, uç (5.0 m):             exp(-0.016 × 5)  = 0.92  ✓ ("kayıp ~0")
export function sizintiKatsayisi(yuzeyKalitesi) {
  const q = Math.min(1, Math.max(0, yuzeyKalitesi));
  return 0.50 * (1 - q) + 0.016 * q;
}

// Kopma noktasının normalize yol konumu (0=nozul, 1=jetin ucu).
// Jet görsel tavandan kısaysa kopma = uç (1.0); uzunsa üst kısmı KARANLIK kalır.
export function kopmaS(yolUzunluguM, tavan = GORSEL_TAVAN_M) {
  if (!(yolUzunluguM > 0)) return 0;
  return Math.min(1, tavan / yolUzunluguM);
}

// İletim: T(s) = exp(-leak · s · L) · [s ≤ kopma]   (s birimsiz, L metre)
// Üstel yolun METRE cinsinden olması şart — aynı yüzey kalitesi 1 m'lik jette
// neredeyse kayıpsız, 8 m'lik jette yarıda sönmeli.
export function iletim(s, opt = {}) {
  const { yolUzunluguM = GORSEL_TAVAN_M, yuzeyKalitesi = 1, tavan = GORSEL_TAVAN_M } = opt;
  const sk = kopmaS(yolUzunluguM, tavan);
  if (!(s >= 0) || s > sk) return 0;
  return Math.exp(-sizintiKatsayisi(yuzeyKalitesi) * s * yolUzunluguM);
}

// Üç çıktı (referans §5.5 katsayıları): gövde SADECE kenar parıltısı (düşük),
// uç patlaması fiber optiğin ucu gibi, çarpma noktası su yüzeyinde ışık havuzu.
export const KATSAYI = { govde: 0.25, uc: 3.0, carpma: 1.5 };

// GEOMETRİK TABAN — referans §5.5'te YOK, gerçek tarayıcı turunda eklendi:
// salt `0.25·T·fresnel` cam çubuğu streak dokusunun karanlık boşluklarında
// sıfıra indiriyor, jet "kesikli boncuk dizisi" (lazer izi) gibi okunuyordu.
// Su KENDİSİ görünür bir cisimdir; bu taban onun geometrik varlığı, ışık DEĞİL.
// ⚠Bu yüzden taban da kopma noktasında ölmeli: ötesinde artık cam çubuk yok,
// dağılmış damla var (o hattı parçacık sistemi çiziyor).
export const GOVDE_TABAN = 0.06;

// Kopma bandı: s kopmaS'ı geçerken hem iletim hem gövde varlığı söner.
// GLSL kopyası smoothstep(kopmaS, kopmaS+0.02, s) kullanır — birebir aynı.
export function canlilik(s, opt = {}) {
  const sk = kopmaS(opt.yolUzunluguM ?? GORSEL_TAVAN_M, opt.tavan ?? GORSEL_TAVAN_M);
  const t = Math.min(1, Math.max(0, (s - sk) / 0.02));
  return 1 - t * t * (3 - 2 * t);
}

// Gövdenin toplam görünürlük kazancı — GLSL `govdeKat` ile BİREBİR aynı olmalı.
export function govdeKazanci(s, opt = {}) {
  return KATSAYI.govde * iletim(s, opt) + GOVDE_TABAN * canlilik(s, opt);
}

export function isikBorusu(s, fresnel, opt = {}) {
  const T = iletim(s, opt);
  return {
    govdeRim:   T * fresnel * KATSAYI.govde,
    ucPatlama:  T * KATSAYI.uc,
    carpmaGolu: T * KATSAYI.carpma
  };
}

// Kopma noktasındaki iletim = uç patlamasının ve çarpma havuzunun gücü.
// Jet tavandan uzunsa kopma yolun ortasında olur; patlama da ORADA olmalı.
export function ucGucu(opt = {}) {
  const sk = kopmaS(opt.yolUzunluguM ?? GORSEL_TAVAN_M, opt.tavan ?? GORSEL_TAVAN_M);
  return { s: sk, T: iletim(sk, opt) };
}

// İki hattın çapraz geçişi (referans §5.6) — TEK anahtar: aeration.
// Köpüklü su boyanır (paintGain), cam su iletir (pipeGain). Yarı-havalandırılmış
// jette ikisi de kısmen aktif; toplam ~1 civarında kalır.
export function hatKazanclari(aeration) {
  const a = Math.min(1, Math.max(0, aeration));
  const sstep = (e0, e1, x) => {
    const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
    return t * t * (3 - 2 * t);
  };
  return { boyama: sstep(0.15, 0.60, a), boru: 1 - sstep(0.05, 0.35, a) };
}
