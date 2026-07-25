import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ornekle, Zamanlayici, yeniCizelge } from '../studio/js/timeline.js';

const K = (tip, anahtarlar) => ({ hedef: 'x.y', tip, anahtarlar });

test('bos kanal 0 doner', () => assert.equal(ornekle(K('linear', []), 5), 0));
test('sinir disi kenetlenir', () => {
  const k = K('linear', [[2, 10], [4, 20]]);
  assert.equal(ornekle(k, 0), 10);
  assert.equal(ornekle(k, 9), 20);
});
test('linear ara deger', () => assert.equal(ornekle(K('linear', [[0, 0], [10, 100]]), 2.5), 25));
test('step onceki anahtari tutar', () => {
  const k = K('step', [[0, 1], [5, 2], [8, 3]]);
  assert.equal(ornekle(k, 4.99), 1);
  assert.equal(ornekle(k, 5), 2);
});
test('smooth uclarda yumusak', () => {
  const k = K('smooth', [[0, 0], [10, 1]]);
  assert.equal(ornekle(k, 5), 0.5);
  assert.ok(ornekle(k, 1) < 0.1);        // smoothstep başta yavaş
});
test('binary search lineer taramayla ayni (rastgele 500 anahtar)', () => {
  const a = []; let t = 0;
  for (let i = 0; i < 500; i++) { t += 0.01 + (i % 7) * 0.03; a.push([+t.toFixed(3), Math.sin(i)]); }
  const k = K('linear', a);
  const lineer = (kanal, t) => {           // referans: Ders 7'nin O(n) hali
    const arr = kanal.anahtarlar;
    if (t <= arr[0][0]) return arr[0][1];
    if (t >= arr[arr.length - 1][0]) return arr[arr.length - 1][1];
    for (let i = 0; i < arr.length - 1; i++) {
      const [t0, v0] = arr[i], [t1, v1] = arr[i + 1];
      if (t >= t0 && t <= t1) return v0 + (v1 - v0) * ((t - t0) / (t1 - t0));
    }
  };
  for (let q = 0; q < 200; q++) {
    const tt = (q / 200) * t * 1.1;
    assert.ok(Math.abs(ornekle(k, tt) - lineer(k, tt)) < 1e-9, 't=' + tt);
  }
});
test('Zamanlayici kayit tablosunu cagirir', () => {
  const ciz = yeniCizelge();
  ciz.kanallar.push(K('linear', [[0, 0], [10, 1]]));
  const gelen = [];
  new Zamanlayici(ciz, { 'x.y': v => gelen.push(v) }).uygula(5);
  assert.deepEqual(gelen, [0.5]);
});
