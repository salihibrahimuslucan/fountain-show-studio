import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  GORSEL_TAVAN_M, sizintiKatsayisi, kopmaS, iletim, isikBorusu, ucGucu, hatKazanclari
} from '../studio/js/isik-borusu.js';

test('kopmaS: tavandan kisa jette kopma = uc (1.0)', () => {
  assert.equal(kopmaS(3), 1);
  assert.equal(kopmaS(GORSEL_TAVAN_M), 1);
});

test('kopmaS: tavandan uzun jette ust kisim karanlik kalir', () => {
  assert.ok(Math.abs(kopmaS(10) - 0.5) < 1e-12);   // 5m tavan / 10m yol
});

test('iletim: kopma noktasinin OTESI tamamen olu', () => {
  const opt = { yolUzunluguM: 10, yuzeyKalitesi: 1 };
  assert.ok(iletim(0.49, opt) > 0);
  assert.equal(iletim(0.51, opt), 0);            // s > kopmaS=0.5
});

test('iletim: cam gibi temiz yuzeyde kayip kucuk, kirli yuzeyde yarida soner', () => {
  const temiz = iletim(1, { yolUzunluguM: 5, yuzeyKalitesi: 1 });
  const kirli = iletim(1, { yolUzunluguM: 5, yuzeyKalitesi: 0 });
  assert.ok(temiz > 0.9, `temiz=${temiz}`);       // exp(-0.016*5)=0.92 — "kayip ~0"
  assert.ok(kirli < 0.1, `kirli=${kirli}`);       // exp(-0.50*5)=0.082
  // referans: kirli yuzey "jetin yari yuksekliginde donuklasir" -> exp(-0.5*2.5)=0.29
  const yari = iletim(0.5, { yolUzunluguM: 5, yuzeyKalitesi: 0 });
  assert.ok(yari > 0.1 && yari < 0.3, `yari=${yari}`);
});

test('iletim: nozulda (s=0) kayip yok', () => {
  assert.equal(iletim(0, { yolUzunluguM: 8, yuzeyKalitesi: 0.3 }), 1);
});

test('sizintiKatsayisi: kalite arttikca dusiyor, sinirlar kelepcelenir', () => {
  assert.ok(sizintiKatsayisi(0) > sizintiKatsayisi(0.5));
  assert.ok(sizintiKatsayisi(0.5) > sizintiKatsayisi(1));
  assert.equal(sizintiKatsayisi(-3), sizintiKatsayisi(0));
  assert.equal(sizintiKatsayisi(9), sizintiKatsayisi(1));
});

test('isikBorusu: govde UCTAN cok daha sonuk (boyanmaz, iletir)', () => {
  const opt = { yolUzunluguM: 4, yuzeyKalitesi: 1 };
  const orta = isikBorusu(0.5, 0.5, opt);
  assert.ok(orta.ucPatlama > orta.govdeRim * 10, 'uc govdeden mertebe farkli olmali');
});

test('isikBorusu: govde rim fresnel ile orantili (dik bakista sonuk)', () => {
  const opt = { yolUzunluguM: 4 };
  assert.ok(isikBorusu(0.3, 0.0, opt).govdeRim === 0);
  assert.ok(isikBorusu(0.3, 1.0, opt).govdeRim > isikBorusu(0.3, 0.2, opt).govdeRim);
});

test('ucGucu: uzun jette patlama yolun ORTASINDA olur', () => {
  const r = ucGucu({ yolUzunluguM: 10, yuzeyKalitesi: 1 });
  assert.ok(Math.abs(r.s - 0.5) < 1e-12);
  assert.ok(r.T > 0 && r.T < 1);
});

test('ucGucu: pompayi zorlamak tavani yukseltmez — uzun jette patlama daha sonuk', () => {
  const kisa = ucGucu({ yolUzunluguM: 4, yuzeyKalitesi: 1 });
  const uzun = ucGucu({ yolUzunluguM: 12, yuzeyKalitesi: 1 });
  assert.ok(uzun.T < kisa.T, `uzun=${uzun.T} kisa=${kisa.T}`);
});

test('hatKazanclari: laminer=boru, kopuk=boyama, arada ikisi de kismi', () => {
  const laminer = hatKazanclari(0.0);
  assert.equal(laminer.boyama, 0);
  assert.equal(laminer.boru, 1);
  const geyser = hatKazanclari(0.9);
  assert.equal(geyser.boyama, 1);
  assert.equal(geyser.boru, 0);
  const ara = hatKazanclari(0.3);
  assert.ok(ara.boyama > 0 && ara.boyama < 1);
  assert.ok(ara.boru > 0 && ara.boru < 1);
});

// --- GLSL <-> saf modul esligi -------------------------------------------------
// laminer.js fragment shader'i ayni formulun kopyasini kosuyor. Kopya kaymasi
// (denetim 2026-07-18'de yakalandi: shader'da sabit +0.06 tabani vardi, kopma
// noktasindan sonra jet sonmuyordu) bu testle kilitlenir: shader satirini
// dosyadan okuyup katsayilarini modulunkiyle karsilastiririz.
import { readFileSync } from 'node:fs';
import { govdeKazanci, canlilik, GOVDE_TABAN, KATSAYI } from '../studio/js/isik-borusu.js';

test('GLSL govdeKat satiri saf modulun katsayilarini kullaniyor', () => {
  const src = readFileSync(new URL('../studio/js/laminer.js', import.meta.url), 'utf8');
  const satir = src.split('\n').find(l => l.includes('float govdeKat'));
  assert.ok(satir, 'govdeKat satiri bulunamadi');
  assert.ok(satir.includes(`${KATSAYI.govde} * T`), `GLSL govde katsayisi kaymis: ${satir}`);
  assert.ok(satir.includes(`${GOVDE_TABAN} * canli`),
    `GLSL taban ya kaymis ya da canli ile carpilmiyor (kopmadan sonra sonmez): ${satir}`);
});

test('govdeKazanci: kopmadan SONRA sifir (hayalet kuyruk yok)', () => {
  const opt = { yolUzunluguM: 5.75, yuzeyKalitesi: 0.92 };   // sahnedeki LANCE
  assert.ok(govdeKazanci(0.5, opt) > 0.15);
  assert.equal(canlilik(1.0, opt), 0);
  assert.equal(govdeKazanci(1.0, opt), 0);
});

test('govdeKazanci: kopma bandinda sureklidir (sicrama yok)', () => {
  const opt = { yolUzunluguM: 5.75, yuzeyKalitesi: 0.92 };
  const sk = 5.0 / 5.75;
  const once = govdeKazanci(sk - 0.001, opt), sonra = govdeKazanci(sk + 0.021, opt);
  assert.ok(once > sonra);
  assert.ok(Math.abs(govdeKazanci(sk + 0.010, opt) - (once + sonra) / 2) < 0.14);
});
