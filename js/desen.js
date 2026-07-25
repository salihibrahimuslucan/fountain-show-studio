// desen.js — renk desen kütüphanesi (T-C ikinci yarı, spec §T-C): beat listesine
// kilitli hazır renk desenleri. SAF modül (three/DOM yok, node --test yükler).
// Girdi: cihaz id listesi + beat zamanları → çıktı: kanal parçaları
// [{hedef, tip, anahtarlar}] — çağıran (editör düğmesi / T-D besteci) cizelgeye
// birleştirir. Kanal adları T-C sözleşmesi: `${id}.hue` (0..1) + `${id}.beyaz`
// (0..1, 1=doğal renk). Tüm anahtar zamanları KESİN ARTAN üretilir.
export const SEMALAR = {
  klasik:     { adlar: 'klasik beyaz',  hueler: [0.55], beyaz: 1 },      // v1 görünümü
  tricolor:   { adlar: 'tricolor',      hueler: [0.0, 0.33, 0.66], beyaz: 0.15 },
  gunBatimi:  { adlar: 'gün batımı',    hueler: [0.02, 0.07, 0.12], beyaz: 0.25 },
  buz:        { adlar: 'buz',           hueler: [0.5, 0.58, 0.63], beyaz: 0.35 }
};

const sar = (h) => ((h % 1) + 1) % 1;

// rainbow: hue süpürmesi — cihaz sırasına faz ofseti, süre boyunca tam tur.
export function rainbow(idler, sure, hueTaban = 0) {
  return idler.flatMap((id, i) => [
    { hedef: `${id}.hue`, tip: 'linear',
      anahtarlar: [[0, sar(hueTaban + i / idler.length)], [sure, sar(hueTaban + i / idler.length + 1 - 1e-4)]] },
    { hedef: `${id}.beyaz`, tip: 'smooth', anahtarlar: [[0, 0.15]] }
  ]);
}

// chase: her beat'te sıradaki cihaz renge "yanar" (beyaz düşer), diğerleri doğal.
export function chase(idler, beatler, sema = SEMALAR.tricolor) {
  return idler.map((id, i) => {
    const b = [];
    beatler.forEach((t, k) => {
      const aktif = k % idler.length === i;
      const son = b[b.length - 1];
      const v = aktif ? sema.beyaz : 1;
      if (!son || son[1] !== v) b.push([t, v]);
    });
    if (!b.length || b[0][0] > 0) b.unshift([0, 1]);
    return [
      { hedef: `${id}.hue`, tip: 'step', anahtarlar: [[0, sema.hueler[i % sema.hueler.length]]] },
      { hedef: `${id}.beyaz`, tip: 'step', anahtarlar: b }
    ];
  }).flat();
}

// fade: tüm cihazlar birlikte şema renkleri arasında yumuşak gezinir.
export function fade(idler, sure, sema = SEMALAR.gunBatimi) {
  const n = Math.max(2, sema.hueler.length);
  const anahtarlar = [];
  for (let k = 0; k < n; k++) anahtarlar.push([(sure * k) / (n - 1), sema.hueler[k % sema.hueler.length]]);
  // kesin artan güvencesi: son zaman sure'yi aşmaz, ardışık eşitlik olamaz (k artan)
  return idler.flatMap((id) => [
    { hedef: `${id}.hue`, tip: 'smooth', anahtarlar: anahtarlar.map(a => [...a]) },
    { hedef: `${id}.beyaz`, tip: 'smooth', anahtarlar: [[0, sema.beyaz]] }
  ]);
}

// strobe: drop bölgesinde beyaz 1↔dip hızlı step nabzı (aralik: [t0,t1], hiz Hz).
export function strobe(idler, t0, t1, hiz = 8, dip = 0.05) {
  const b = [];
  for (let t = t0, k = 0; t < t1; t += 1 / hiz, k++) b.push([t, k % 2 ? 1 : dip]);
  b.push([t1, 1]);                                     // çıkışta doğala dön
  return idler.map((id) => ({ hedef: `${id}.beyaz`, tip: 'step', anahtarlar: b.map(a => [...a]) }));
}

// --- MASTER desenleri (F1 grup turu, spec 2026-07-20 §2-3) -------------------
// Aynı sözleşme: id listesi → kanal parçaları [{hedef:`${id}.master`, tip, anahtarlar}].
// KESİN ARTAN anahtar; değerler 0..1. `kaynak` damgasını ÇAĞIRAN basar (grupDerle).
const EPS = 1e-4;

// dalga: faz-kaydırmalı sinüs — "sırayla iner kalkar" sürekli hali.
export function masterDalga(idler, sure, periyot = 2, taban = 0.3, tip = 'smooth') {
  const adim = Math.max(0.1, periyot / 8);
  return idler.map((id, i) => {
    const faz = (i / idler.length) * 2 * Math.PI, a = [];
    for (let t = 0; t <= sure + EPS; t += adim)
      a.push([Math.min(t, sure - EPS * (t > sure - EPS ? 1 : 0)),
              taban + (1 - taban) * 0.5 * (1 + Math.sin(2 * Math.PI * t / periyot - faz))]);
    return { hedef: `${id}.master`, tip, anahtarlar: tekillestir(a) };
  });
}

// karşılıklı: tek/çift üyeler zıt fazda — "biri kalkar biri iner".
export function masterKarsilikli(idler, sure, periyot = 2, tip = 'smooth') {
  return idler.map((id, i) => {
    const faz = (i % 2) * Math.PI, a = [];
    const adim = Math.max(0.1, periyot / 8);
    for (let t = 0; t <= sure + EPS; t += adim)
      a.push([t, 0.5 * (1 + Math.cos(2 * Math.PI * t / periyot + faz))]);
    return { hedef: `${id}.master`, tip, anahtarlar: tekillestir(a) };
  });
}

// chase: her beat sıradaki üye açık, diğerleri kapalı (renk chase'inin master ikizi).
export function masterChase(idler, beatler, tip = 'step') {
  return idler.map((id, i) => {
    // ⚠t=0 tohumu: aşağıdaki `t > b.at(-1)[0]` koşulu sıfırıncı beat'i (0 > 0 false)
    // hiçbir kanala işleyemiyordu → beat ızgarası 0'dan başlayan şovda AÇILIŞ vuruşu
    // sessizce düşüyordu. Tohum k=0'ın değerini taşır (0 % n === i, yani ilk üye).
    const b = [[0, beatler[0] === 0 && i === 0 ? 1 : 0]];
    beatler.forEach((t, k) => {
      const v = k % idler.length === i ? 1 : 0;
      if (b.at(-1)[1] !== v && t > b.at(-1)[0]) b.push([t, v]);
    });
    return { hedef: `${id}.master`, tip, anahtarlar: b };
  });
}

// merdiven: [t0,t1] içinde üyeler sırayla katılır, katılan AÇIK kalır (build).
export function masterMerdiven(idler, t0, t1, tip = 'smooth') {
  const n = idler.length;
  return idler.map((id, i) => {
    const tg = t0 + ((t1 - t0) * i) / n;
    const a = i === 0 ? [[t0, 1]] : [[t0, 0], [Math.max(tg - 0.15, t0 + EPS), 0], [tg, 1]];
    return { hedef: `${id}.master`, tip, anahtarlar: tekillestir(a) };
  });
}

// unison: [t0,t1] içinde HERKES beat'lerde birlikte vurur (drop).
export function masterUnison(idler, t0, t1, beatler, tip = 'step') {
  const b = [[t0, 1]];
  for (const t of beatler) {
    if (t <= t0 || t >= t1) continue;
    b.push([t, 0.35], [Math.min(t + 0.12, t1 - EPS), 1]);
  }
  const a = tekillestir(b);
  return idler.map(id => ({ hedef: `${id}.master`, tip, anahtarlar: a.map(x => [...x]) }));
}

// kesin-artan güvencesi: eşit/geri giden zaman damgası düşer.
function tekillestir(a) {
  const out = [];
  for (const [t, v] of a) if (!out.length || t > out.at(-1)[0]) out.push([t, v]);
  return out;
}
export const MASTER_DESENLER = { dalga: masterDalga, karsilikli: masterKarsilikli,
                                 chase: masterChase, merdiven: masterMerdiven, unison: masterUnison };
