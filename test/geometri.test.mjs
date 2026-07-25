import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kalinlikCarpanlari, tupKalinlikUygula } from '../studio/js/geometri.js';

test('kalinlikCarpanlari: enerji korunumu — tepe kalin, hizli uclar 1e yakin', () => {
  // v0=7, y0=0.2: yükseldikçe yavaşlar → yarıçap çarpanı artar
  const merkezler = [[0, 0.2, 0], [1, 1.2, 0], [2, 1.23, 0]];
  const c = kalinlikCarpanlari(merkezler, 7);
  assert.ok(Math.abs(c[0] - 1) < 1e-9);                 // başlangıç: v=v0 → çarpan 1
  assert.ok(c[2] > c[1] && c[1] > c[0]);                // yükseldikçe kalınlaşır
  assert.ok(c[2] < 2.0);                                // patlama yok (üst sınır)
});

test('tupKalinlikUygula: halka vertexleri merkeze gore carpanla olceklenir', () => {
  // 2 halka × 3 vertex, halka merkezleri (0,0,0) ve (2,0,0), yarıçap 1
  const poz = new Float32Array([
    0, 1, 0,   0, -1, 0,   0, 0, 1,      // halka 0
    2, 1, 0,   2, -1, 0,   2, 0, 1       // halka 1
  ]);
  tupKalinlikUygula(poz, [[0, 0, 0], [2, 0, 0]], 3, [1, 2]);
  assert.deepEqual([...poz.slice(0, 3)], [0, 1, 0]);    // çarpan 1 → dokunulmaz
  assert.deepEqual([...poz.slice(9, 12)], [2, 2, 0]);   // çarpan 2 → yarıçap 2×
  assert.deepEqual([...poz.slice(15, 18)], [2, 0, 2]);
});
