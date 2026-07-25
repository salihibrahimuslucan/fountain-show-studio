// fon-doku saf piksel üreticileri — determinizm + yerleşim testleri.
// Üreticiler ALT-ORİJİN yazar (DataTexture flipY=false): satır 0 = doku ALTI.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hexRgb, gokPiksel, yildizNoktalari, haleAlfa, siluetPiksel, agacPiksel,
         tasPiksel, sehirUret } from '../studio/js/fon-doku.js';

const ozet = (px) => px.reduce((a, b) => (a * 31 + b) >>> 0, 7); // determinizm parmak izi

test('hexRgb: #rrggbb → [r,g,b]', () => {
  assert.deepEqual(hexRgb('#0a1220'), [10, 18, 32]);
  assert.deepEqual(hexRgb('#ffffff'), [255, 255, 255]);
});

test('gokPiksel: boyut + alt-orijin degrade (alt satır = alt renk tarafı)', () => {
  const { px, w, h } = gokPiksel({ ust: '#000040', alt: '#202020' });
  assert.equal(px.length, w * h * 4);
  // satır 0 = nadir: mavi kanal alt renge (0x20=32) yakın; en üst satır üst renge (0x40=64)
  assert.ok(Math.abs(px[2] - 32) <= 3);
  assert.ok(Math.abs(px[(h - 1) * w * 4 + 2] - 64) <= 3);
});

test('gokPiksel: ufuk ışıması v=0.5 bandında — nadir ve zenit etkilenmez', () => {
  const a = gokPiksel({ ust: '#000000', alt: '#000000', ufuk: '#ff8040' });
  const satir = (v) => Math.round(v * (a.h - 1)) * a.w * 4;
  assert.ok(a.px[satir(0.5)] > 40);              // ufukta kızarma var
  assert.ok(a.px[satir(0.52)] > a.px[satir(0.62)]); // yukarı doğru sönüyor
  assert.equal(a.px[satir(0)], 0);               // nadir temiz
  assert.equal(a.px[satir(1)], 0);               // zenit temiz
  assert.equal(a.px[satir(0.45)], 0);            // ufuk ALTI (zemin) temiz
});

test('yildizNoktalari: deterministik, üst yarıkürede, parlaklık aralıklı', () => {
  const a = yildizNoktalari({ adet: 150, tohum: 42 });
  const b = yildizNoktalari({ adet: 150, tohum: 42 });
  const c = yildizNoktalari({ adet: 150, tohum: 43 });
  assert.deepEqual([...a.poz], [...b.poz]);
  assert.notDeepEqual([...a.poz], [...c.poz]);
  assert.equal(a.poz.length, 450);
  for (let i = 0; i < 150; i++) {
    assert.ok(a.poz[i * 3 + 1] > 66 * 0.09);     // hepsi ufkun üstünde (minYOran)
    const r = Math.hypot(a.poz[i * 3], a.poz[i * 3 + 1], a.poz[i * 3 + 2]);
    assert.ok(Math.abs(r - 66) < 1e-3);          // kabuk yarıçapı
    assert.ok(a.parlak[i] >= 0.35 && a.parlak[i] <= 1);
  }
});

test('siluetPiksel: bina kolonları dolu, gök şeffaf, pencere pikselli', () => {
  const s = siluetPiksel({ binalar: [[-14, 5, -16, 6], [8, 6, -17, 5]],
                           renk: '#080d16', pencere: '#ffb35c', tohum: 3 });
  assert.equal(s.px.length, s.w * s.h * 4);
  const orta = (x01, y01) => { const x = Math.floor(x01 * (s.w - 1)), y = Math.floor(y01 * (s.h - 1));
    return s.px.slice((y * s.w + x) * 4, (y * s.w + x) * 4 + 4); };
  assert.equal(orta(0.5, 0.95)[3], 0);           // üst-orta: bina yok → şeffaf
  assert.equal(orta(0.18, 0.05)[3], 255);        // x=-14 civarı, zemin → dolu
  // pencere: bina gövdesinde en az bir sıcak piksel (r baskın)
  let sicak = 0;
  for (let i = 0; i < s.px.length; i += 4)
    if (s.px[i + 3] === 255 && s.px[i] > 120 && s.px[i] > s.px[i + 2]) sicak++;
  assert.ok(sicak > 10);
});

test('siluetPiksel: deterministik', () => {
  const g = { binalar: [[0, 6, -15, 4]], renk: '#080d16', pencere: '#ffb35c', tohum: 11 };
  assert.equal(ozet(siluetPiksel(g).px), ozet(siluetPiksel(g).px));
});

test('agacPiksel: alfa silueti — merkez dolu, köşe boş, gövde sütunu var, deterministik', () => {
  const a = agacPiksel({ tohum: 5 });
  const A = (x, y) => a.px[(y * a.w + x) * 4 + 3];        // y alt-orijin
  assert.ok(A(64, 70) > 200);                             // taç ortası dolu
  assert.equal(A(2, 125), 0);                             // üst köşe boş
  assert.ok(A(64, 4) > 200);                              // gövde (alt-orta) dolu
  assert.equal(ozet(a.px), ozet(agacPiksel({ tohum: 5 }).px));
  assert.notEqual(ozet(a.px), ozet(agacPiksel({ tohum: 6 }).px));
});

test('tasPiksel: derz çizgileri koyu, taşlar ton-varyantlı, deterministik', () => {
  const a = tasPiksel({ renk: '#3c3f45', tohum: 2 });
  assert.equal(ozet(a.px), ozet(tasPiksel({ renk: '#3c3f45', tohum: 2 }).px));
  const p = (x, y) => a.px[(y * a.w + x) * 4];
  assert.ok(p(0, 0) < p(8, 8));            // (0,0) derz çizgisi < taş içi
  let min = 255, max = 0;
  for (let i = 0; i < a.px.length; i += 4) { min = Math.min(min, a.px[i]); max = Math.max(max, a.px[i]); }
  assert.ok(max - min > 15);               // taş başına ton farkı var
});

test('haleAlfa: merkez opak, kenar sıfır, tekdüşen', () => {
  const { px, w } = haleAlfa(32);
  const A = (x, y) => px[(y * w + x) * 4 + 3];
  assert.ok(A(16, 16) > 200);
  assert.equal(A(0, 0), 0);
  assert.ok(A(16, 16) > A(24, 16) && A(24, 16) > A(30, 16));
});

// --- v7 M5: samanyolu + bulut + prosedurel sehir ---

test('gokPiksel: samanyolu/bulut verilmezse cikti x ekseninde DUZ (geriye uyum)', () => {
  const { px, w } = gokPiksel({ w: 8, h: 32, ust: '#141a2e', alt: '#0a0e18' });
  for (let y = 0; y < 32; y++) {
    const i0 = (y * w) * 4;
    for (let x = 1; x < w; x++) {
      const i = (y * w + x) * 4;
      assert.equal(px[i], px[i0], `satir ${y} x=${x} kaymis`);
    }
  }
});

test('gokPiksel: samanyolu bandi ufkun USTUNU aydinlatir, altini DEGISTIRMEZ', () => {
  const ortak = { w: 64, h: 128, ust: '#141a2e', alt: '#0a0e18' };
  const sade = gokPiksel(ortak);
  const sy = gokPiksel({ ...ortak, samanyolu: { guc: 0.6 } });
  let ustFark = 0, altFark = 0;
  for (let y = 0; y < 128; y++) {
    const v = y / 127;
    for (let x = 0; x < 64; x++) {
      const i = (y * 64 + x) * 4;
      const d = Math.abs(sy.px[i] - sade.px[i]) + Math.abs(sy.px[i + 2] - sade.px[i + 2]);
      if (v > 0.5) ustFark += d; else altFark += d;
    }
  }
  assert.equal(altFark, 0, 'ufuk altinda samanyolu olmamali');
  assert.ok(ustFark > 0, 'ufuk ustunde bant gorunmeli');
});

test('gokPiksel: samanyolu x ekseninde DEGISIR (duz serit degil)', () => {
  const { px, w, h } = gokPiksel({ w: 64, h: 128, ust: '#141a2e', alt: '#0a0e18',
                                   samanyolu: { guc: 0.7 } });
  const y = Math.floor(h * 0.72);
  let enAz = 255, enCok = 0;
  for (let x = 0; x < w; x++) {
    const val = px[(y * w + x) * 4 + 2];
    enAz = Math.min(enAz, val); enCok = Math.max(enCok, val);
  }
  assert.ok(enCok - enAz > 8, `bant yatayda degismiyor (${enAz}..${enCok})`);
});

test('gokPiksel: ayni tohum ayni cikti (deterministik)', () => {
  const p = { w: 32, h: 64, ust: '#141a2e', alt: '#0a0e18', samanyolu: {}, bulut: {}, tohum: 99 };
  assert.deepEqual(gokPiksel(p).px, gokPiksel(p).px);
});

test('sehirUret: adet kadar bina, hepsi x araliginda ve pozitif boyutlu', () => {
  const b = sehirUret({ adet: 20, xAralik: [-30, 30], yAralik: [3, 9], z: -16, tohum: 3 });
  assert.equal(b.length, 20);
  for (const [x, h, , w] of b) {
    assert.ok(x >= -32 && x <= 32, `x tasti: ${x}`);
    assert.ok(h > 0 && w > 0);
  }
});

test('sehirUret: yuvalar sirali — buyuk bosluk/ust uste yigilma yok', () => {
  const b = sehirUret({ adet: 24, xAralik: [-30, 30], tohum: 8 });
  const xs = b.map(v => v[0]);
  for (let i = 1; i < xs.length; i++) assert.ok(xs[i] > xs[i - 1], 'x sirasi bozuk');
  const yuva = 60 / 24;
  for (let i = 1; i < xs.length; i++) assert.ok(xs[i] - xs[i - 1] < yuva * 2, 'buyuk bosluk');
});

test('sehirUret: kuleOran=1 hepsini yuksek yapar, 0 hicbirini', () => {
  const kule = sehirUret({ adet: 10, yAralik: [3, 9], tohum: 4, kuleOran: 1 });
  const duz  = sehirUret({ adet: 10, yAralik: [3, 9], tohum: 4, kuleOran: 0 });
  assert.ok(Math.min(...kule.map(b => b[1])) > 9, 'kule 9m ustu olmali');
  assert.ok(Math.max(...duz.map(b => b[1])) <= 9, 'duz bina 9m alti olmali');
});

test('yildizNoktalari: renk alani gelir ve makul aralikta', () => {
  const { renk, poz, parlak } = yildizNoktalari({ adet: 50, tohum: 2 });
  assert.equal(renk.length, 150);
  assert.equal(poz.length, 150);
  assert.equal(parlak.length, 50);
  for (const c of renk) assert.ok(c > 0.6 && c <= 1.05, `renk aralik disi: ${c}`);
});

test('yildizNoktalari: kume verilince yildizlar banda toplanir', () => {
  const p = { adet: 400, tohum: 6 };
  const duz = yildizNoktalari(p);
  const kumeli = yildizNoktalari({ ...p, kume: { oran: 0.9, genislik: 0.08 } });
  // banda toplanma = y dagiliminin standart sapmasi DUSER mi degil, bant
  // egrisine uzakligin ortalamasi duser mi diye bakilir
  const uzaklik = (s) => {
    let t = 0;
    for (let i = 0; i < p.adet; i++) {
      const x = s.poz[i * 3], y = s.poz[i * 3 + 1], z = s.poz[i * 3 + 2];
      const a = Math.atan2(z, x), u = ((a / (2 * Math.PI)) + 1) % 1;
      const merkez = 0.5 + 0.26 * Math.sin(2 * Math.PI * (u - 0.15));
      t += Math.abs((y / 66 + 1) / 2 - merkez);
    }
    return t / p.adet;
  };
  assert.ok(uzaklik(kumeli) < uzaklik(duz), 'kumeli set banda daha yakin olmali');
});
