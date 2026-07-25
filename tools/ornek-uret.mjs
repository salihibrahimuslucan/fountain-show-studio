// tools/ornek-uret.mjs — hazır örnek şovları üretir (v3 F5).
// Koş: node tools/ornek-uret.mjs  → studio/ornekler/*.aqshow yazar.
// Saf modüller: sablon + desen + aqshowYaz (three'siz — Node'da doğrudan).
// Cihaz id'leri cihazYonetici idUret formatıyla (tur_N) — projeAc zaten
// id'leri yeniden üretip haritalar, buradakiler yalnız kanal eşlemesi için.
import { writeFileSync, mkdirSync } from 'node:fs';
import { daire, ariKovani, cizgi } from '../studio/js/sablon.js';
import { chase, strobe, rainbow, SEMALAR } from '../studio/js/desen.js';
import { aqshowYaz } from '../studio/js/proje.js';

const idVer = (cihazlar) => {
  const sayac = {};
  return cihazlar.map(c => ({ ...c, aci: c.aci ?? 0, id: `${c.tur}_${sayac[c.tur] = (sayac[c.tur] || 0) + 1}` }));
};
const K = (hedef, tip, anahtarlar) => ({ hedef, tip, anahtarlar });
const secim = (c, tur) => c.filter(k => k.tur === tur).map(k => k.id);

// --- Şov 1: daire gösterisi (32s) — intro/build/drop/final tam ark ---
function daireGosteri() {
  const cihazlar = idVer(daire(8));
  const sure = 32;
  const kanallar = [];
  // 'vario': daire() artık AquaVARIO'yu katalog arketipiyle döşüyor (denetim
  // 2026-07-18 hizalaması) — eskiden 'duz_jet' idi, burada da eşleşmeli yoksa
  // VARIO'lara hiç kanal üretilmez.
  const geyser = secim(cihazlar, 'geyser'), vario = secim(cihazlar, 'vario');
  const anahtarli = secim(cihazlar, 'switch'), jet = secim(cihazlar, 'aquajet');
  const robo = secim(cihazlar, 'robo'), swing = secim(cihazlar, 'swing');
  const jump = secim(cihazlar, 'laminer'), halka = secim(cihazlar, 'rgb_spot');
  // intro: merkez geyser doğar, VARIO'lar yarım debide nefes alır
  for (const id of geyser) {
    kanallar.push(K(`${id}.master`, 'smooth', [[0, 0], [2, 1], [22, 1], [30, 0.4], [32, 0]]));
    kanallar.push(K(`${id}.hiz`, 'smooth', [[0, 0.6], [12, 1], [22, 1.2], [32, 0.6]]));
  }
  vario.forEach((id, i) => {
    kanallar.push(K(`${id}.master`, 'smooth', [[0, 0], [3 + i * 0.4, 1], [28, 1], [32, 0]]));
    kanallar.push(K(`${id}.hiz`, 'smooth', [[0, 0.4], [6, 0.5], [12, 1], [22, 1.1], [28, 0.6], [32, 0.4]]));
  });
  // build: SWITCH koşan nabız (6-12s), drop'ta hepsi açık
  anahtarli.forEach((id, i) => {
    const b = [[0, 0]];
    for (let t = 6 + i * 0.4; t + 0.5 < 11.8; t += 3.2) { b.push([+t.toFixed(2), 1], [+(t + 0.5).toFixed(2), 0]); }
    b.push([+(12 + i * 0.01).toFixed(2), 1], [26, 1], [27, 0]);
    kanallar.push(K(`${id}.master`, 'step', b));
  });
  // drop: dış halka AquaJET 12'de patlar
  jet.forEach((id, i) => {
    kanallar.push(K(`${id}.master`, 'smooth', [[0, 0], [11.9, 0], [12, 1], [24, 1], [28, 0]]));
    kanallar.push(K(`${id}.hiz`, 'smooth', [[0, 0.8], [12, 1.15], [22, 1.25], [28, 0.8]]));
  });
  // servolar: süpürme — drop'ta hızlanır
  for (const id of [...robo, ...swing]) {
    kanallar.push(K(`${id}.master`, 'smooth', [[0, 0], [8, 1], [28, 1], [31, 0]]));
    kanallar.push(K(`${id}.pan`, 'smooth', [[0, -50], [6, 50], [10, -50], [12, 60], [14, -60], [16, 60], [18, -60], [20, 60], [24, -40], [32, 0]]));
  }
  for (const id of robo) kanallar.push(K(`${id}.tilt`, 'smooth', [[0, 10], [12, 25], [22, 12]]));
  // laminer flaşları: build ve final vurguları
  for (const id of jump)
    kanallar.push(K(`${id}.master`, 'step', [[0, 0], [8, 1], [9.5, 0], [12, 1], [20, 0], [24, 1], [30, 0]]));
  // renkler: intro beyaz → drop'ta tricolor chase + strobe
  const suIdler = [...geyser, ...vario, ...anahtarli, ...jet, ...robo, ...swing, ...jump];
  const beatler = []; for (let t = 12; t < 22; t += 0.5) beatler.push(+t.toFixed(2));
  for (const p of chase(suIdler, beatler, SEMALAR.tricolor))
    if (p.hedef.endsWith('.hue')) kanallar.push(p);
  suIdler.forEach((id) => kanallar.push(K(`${id}.beyaz`, 'smooth', [[0, 1], [10, 1], [12, 0.2], [26, 0.2], [30, 1]])));
  halka.forEach((id, i) => {
    kanallar.push(K(`${id}.hue`, 'linear', [[0, i / halka.length], [32, 0.999]]));
    kanallar.push(K(`${id}.parlaklik`, 'smooth', [[0, 0.3], [12, 1.2], [28, 0.5]]));
  });
  return { ad: 'daire-gosteri', mekan: { fon: 'meydan', plan: null }, cihazlar,
    cizelge: { sure, kanallar }, muzikAdi: null };
}

// --- Şov 2: arı kovanı (24s) — drydeck halka dalgaları + 412C rainbow ---
function ariKovaniSov() {
  const cihazlar = idVer(ariKovani(2));
  const sure = 24;
  const kanallar = [];
  const dd = secim(cihazlar, 'drydeck'), halka = secim(cihazlar, 'rgb_spot');
  // merkezden dışa dalga: merkez → halka1 → (çeper 412C zaten susuz)
  dd.forEach((id, i) => {
    const gecikme = i === 0 ? 0 : 0.8;   // merkez önce, halka1 birlikte
    const b = [[0, 0]];
    for (let t = 1 + gecikme; t < 21; t += 4) b.push([+t.toFixed(2), 1], [+(t + 2).toFixed(2), 0.15]);
    b.push([22, 0]);
    kanallar.push(K(`${id}.master`, 'smooth', b));
    kanallar.push(K(`${id}.hiz`, 'smooth', [[0, 0.7], [10, 1.1], [20, 0.7]]));
  });
  for (const p of rainbow([...dd, ...halka].filter((x, i) => true), sure, 0.1))
    if (p.hedef.endsWith('.hue')) {
      // rainbow hue kanalını hem su hem halka için uyarları — halka'da hue kanalı setHue'ya gider
      kanallar.push(p);
    }
  dd.forEach(id => kanallar.push(K(`${id}.beyaz`, 'smooth', [[0, 0.3]])));
  halka.forEach(id => kanallar.push(K(`${id}.parlaklik`, 'smooth', [[0, 0.6], [12, 1.2], [22, 0.4]])));
  return { ad: 'ari-kovani', mekan: { fon: 'kuru', plan: null }, cihazlar,   // v3: kuru meydan (DryDECK sahnesi)
    cizelge: { sure, kanallar }, muzikAdi: null };
}

// --- Şov 3: çizgi koşan dalga (16s) — SWITCH ani kesme imzası ---
function cizgiDalga() {
  const cihazlar = idVer(cizgi(12, 9));
  const sure = 16;
  const kanallar = [];
  const sw = secim(cihazlar, 'switch'), jump = secim(cihazlar, 'laminer'), halka = secim(cihazlar, 'rgb_spot');
  sw.forEach((id, i) => {
    const b = [[0, 0]];
    for (let tur = 0; tur < 3; tur++) {
      const t0 = 1 + tur * 4.5 + i * 0.28;                 // soldan sağa koşan dalga
      b.push([+t0.toFixed(2), 1], [+(t0 + 0.45).toFixed(2), 0]);
    }
    b.push([14 + i * 0.1, 1], [15.5, 0]);                  // final: hepsi birlikte
    kanallar.push(K(`${id}.master`, 'step', b));
  });
  for (const id of jump)
    kanallar.push(K(`${id}.master`, 'step', [[0, 0], [4.4, 1], [5.6, 0], [8.9, 1], [10.1, 0], [13.4, 1], [15, 0]]));
  const beatler = []; for (let t = 1; t < 15; t += 0.56) beatler.push(+t.toFixed(2));
  for (const p of chase([...sw], beatler, SEMALAR.buz)) kanallar.push(p);
  halka.forEach((id, i) => {
    kanallar.push(K(`${id}.hue`, 'step', [[0, 0.55], [8, 0.62], [12, 0.5]]));
    kanallar.push(K(`${id}.parlaklik`, 'smooth', [[0, 0.5], [8, 1], [15, 0.3]]));
  });
  return { ad: 'cizgi-dalga', mekan: { fon: 'gol', plan: null }, cihazlar,
    cizelge: { sure, kanallar }, muzikAdi: null };
}

mkdirSync('studio/ornekler', { recursive: true });
for (const sov of [daireGosteri(), ariKovaniSov(), cizgiDalga()]) {
  // kesin-artan güvence denetimi: bozuk anahtar dizisi ornekle'yi kırar
  for (const k of sov.cizelge.kanallar)
    for (let i = 1; i < k.anahtarlar.length; i++)
      if (k.anahtarlar[i][0] <= k.anahtarlar[i - 1][0])
        throw new Error(`${sov.ad} ${k.hedef}: artan degil @${i} (${k.anahtarlar[i - 1][0]} -> ${k.anahtarlar[i][0]})`);
  writeFileSync(`studio/ornekler/${sov.ad}.aqshow`, aqshowYaz(sov));
  console.log(`yazildi: studio/ornekler/${sov.ad}.aqshow (${sov.cizelge.kanallar.length} kanal)`);
}
