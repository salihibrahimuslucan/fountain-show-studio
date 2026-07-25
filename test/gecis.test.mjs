// gecis.js — fon crossfade saf durum makinesi testleri.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gecisYarat, lerp, renkLerp } from '../studio/js/gecis.js';

test('gecisYarat: baslat→tik ilerler, smoothstep oran, bitti', () => {
  const g = gecisYarat(2);
  assert.ok(g.bitti());                    // başlangıç: geçiş yok
  g.baslat();
  assert.ok(!g.bitti());
  assert.equal(g.oran(), 0);
  g.tik(1);                                // yarı yol
  assert.ok(Math.abs(g.oran() - 0.5) < 1e-9);   // smoothstep(0.5)=0.5
  g.tik(1.5);                              // aşım → kelepçe
  assert.ok(g.bitti());
  assert.equal(g.oran(), 1);
});

test('gecisYarat: sure=0 anında biter (headless/ilk kurulum)', () => {
  const g = gecisYarat(1.5);
  g.baslat(0);
  assert.ok(g.bitti());
  assert.equal(g.oran(), 1);
});

test('gecisYarat: yeniden baslat sıfırlar', () => {
  const g = gecisYarat(1);
  g.baslat(); g.tik(0.6);
  g.baslat();                              // yarıda yeni geçiş
  assert.equal(g.oran(), 0);
  g.tik(0.5);
  assert.ok(Math.abs(g.oran() - 0.5) < 1e-9);
});

test('lerp + renkLerp', () => {
  assert.equal(lerp(2, 4, 0.5), 3);
  assert.deepEqual(renkLerp([0, 0, 0], [255, 128, 0], 0.5), [127.5, 64, 0]);
});
