// dayaniklilik.test.mjs — saldirgan girdilerle sinir davranisi (2026-07-18 denetim).
// Gerekce: bu modullerin girdileri KULLANICIDAN gelir (desen menusu, muzik suresi,
// disaridan DXF). Sessiz NaN / bozuk sira / sonsuz dongü buradan sizar.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rainbow, chase, fade, strobe } from '../studio/js/desen.js';
import { ornekle } from '../studio/js/timeline.js';
import { dxfAyristir } from '../studio/js/dxf.js';

const IDLER = ['duz_jet_1', 'geyser_2'];
const desenler = {
  rainbow: (s) => rainbow(IDLER, s),
  fade:    (s) => fade(IDLER, s),
  strobe:  (s) => strobe(IDLER, 0, Math.min(4, s), 8),
  chase:   (s) => chase(IDLER, [0, 0.5, 1, 1.5].filter(t => t <= s))
};

for (const [ad, uret] of Object.entries(desenler)) {
  test(`desen ${ad}: kisa/uzun/kesirli surede anahtarlar ARTAN ve sonlu`, () => {
    for (const sure of [0.5, 1, 16, 345, 3600, 7.3333]) {
      let parcalar;
      try { parcalar = uret(sure); } catch (e) { assert.fail(`${ad} sure=${sure} firlatti: ${e.message}`); }
      assert.ok(Array.isArray(parcalar), `${ad}: dizi donmedi`);
      for (const k of parcalar) {
        assert.ok(k.anahtarlar.length > 0, `${ad}/${k.hedef}: bos kanal (cihaz sessizce olur)`);
        let onceki = -Infinity;
        for (const [t, v] of k.anahtarlar) {
          assert.ok(Number.isFinite(t) && Number.isFinite(v), `${ad}/${k.hedef}: NaN @${t}`);
          assert.ok(t >= onceki, `${ad}/${k.hedef}: sira bozuk @${t} (ornekle ikili aramasi bozulur)`);
          assert.ok(t >= 0 && t <= sure + 1e-6, `${ad}/${k.hedef}: zaman sure disinda @${t} (sure=${sure})`);
          onceki = t;
        }
      }
    }
  });

  test(`desen ${ad}: hue/beyaz degerleri 0-1 sozlesmesinde`, () => {
    for (const k of uret(24)) {
      const p = k.hedef.split('.').pop();
      if (p !== 'hue' && p !== 'beyaz') continue;
      for (const [t, v] of k.anahtarlar) {
        assert.ok(v >= 0 && v <= 1, `${ad}/${k.hedef} @${t} = ${v} (serit araligi 0-1)`);
      }
    }
  });
}

test('desen chase: BOS beat listesiyle cokmez', () => {
  const p = chase(IDLER, []);
  assert.ok(Array.isArray(p));
  for (const k of p) for (const [t, v] of k.anahtarlar) assert.ok(Number.isFinite(t) && Number.isFinite(v));
});

test('desen: cihaz listesi bos ise bos sonuc (cagiran zaten engelliyor ama cokmemeli)', () => {
  for (const uret of [() => rainbow([], 16), () => fade([], 16), () => strobe([], 0, 4, 8), () => chase([], [0, 1])]) {
    assert.doesNotThrow(uret);
  }
});

// --- timeline.ornekle sinir davranisi ------------------------------------------
test('ornekle: tek anahtarli kanal her t icin o degeri dondurur', () => {
  const k = { hedef: 'x.master', tip: 'linear', anahtarlar: [[5, 0.7]] };
  for (const t of [-10, 0, 5, 999]) assert.equal(ornekle(k, t), 0.7);
});

test('ornekle: anahtar araliginin DISINDA uc degerlere kelepcelenir', () => {
  const k = { hedef: 'x.master', tip: 'linear', anahtarlar: [[2, 0.2], [8, 0.9]] };
  assert.equal(ornekle(k, 0), 0.2);
  assert.equal(ornekle(k, 100), 0.9);
});

test('ornekle: AYNI zamanda iki anahtar (sarma cifti) sonlu deger verir', () => {
  const k = { hedef: 'x.hue', tip: 'linear', anahtarlar: [[4, 1], [4, 0], [8, 0.5]] };
  for (const t of [3.9, 4, 4.0001, 6]) assert.ok(Number.isFinite(ornekle(k, t)), `t=${t}`);
});

test('ornekle: step/linear/smooth ucu de anahtar degerlerini BIREBIR verir', () => {
  for (const tip of ['step', 'linear', 'smooth']) {
    const k = { hedef: 'x.master', tip, anahtarlar: [[0, 0], [10, 1]] };
    assert.equal(ornekle(k, 0), 0, tip);
    assert.equal(ornekle(k, 10), 1, tip);
    const orta = ornekle(k, 5);
    assert.ok(orta >= 0 && orta <= 1, `${tip} orta=${orta}`);
  }
});

// --- dxf: disaridan gelen dosya --------------------------------------------------
// SOZLESME: DXF olmayan girdi FIRLATIR (plan.js dxfYukle yakalayip
// "DXF okunamadi — PNG olarak dene" mesajini gosterir); GECERLI ama bos DXF
// firlatmaz, bos parca listesi doner.
test('dxfAyristir: DXF olmayan girdi anlamli hata firlatir (sessizce yutmaz)', () => {
  for (const metin of ['', 'merhaba']) {
    assert.throws(() => dxfAyristir(metin), /bicim|DXF/i, `girdi: "${metin.slice(0, 12)}"`);
  }
});

test('dxfAyristir: gecerli ama BOS DXF firlatmaz, bos parca listesi doner', () => {
  const r = dxfAyristir('0\nSECTION\n2\nENTITIES\n0\nENDSEC\n0\nEOF\n');
  assert.ok(Array.isArray(r.parcalar));
  assert.equal(r.parcalar.length, 0);
});

test('dxfAyristir: bozuk sayilar NaN parca olarak SIZMAZ', () => {
  const bozuk = ['0', 'SECTION', '2', 'ENTITIES',
    '0', 'LINE', '10', 'abc', '20', '0', '11', '5', '21', 'xyz',
    '0', 'LINE', '10', '0', '20', '0', '11', '3', '21', '4',
    '0', 'ENDSEC', '0', 'EOF'].join('\n');
  const r = dxfAyristir(bozuk);
  const nanli = r.parcalar.filter(s => !s.every(Number.isFinite));
  assert.deepEqual(nanli, [], 'NaN koordinat plan tuvaline ve .aqshow dosyasina sizar');
});
