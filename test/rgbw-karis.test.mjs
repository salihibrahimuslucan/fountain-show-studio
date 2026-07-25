// Faz 1 Task 1 (spec 2026-07-24 K3/G4): RGBW+ karışım fonksiyonu — beyaz AYRI
// LED kanalı, hue rengini lerp ile SİLMEZ, screen karışımıyla üstüne biner.
// emsal desen: proje.js saf modül, doğrudan import edilir (test/proje.test.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hueRgb, rgbwKaris } from '../studio/js/proje.js';

const dogal = { r: 0.72, g: 0.86, b: 0.95 };   // tipik su doğal rengi

test('beyaz=0 → saf doygun hue (eski uçla birebir)', () => {
  const hue = hueRgb(0.0);                      // kırmızı
  assert.deepEqual(rgbwKaris(hue, 0, dogal), hue);
});

test('RGBW+: beyaz açıkken hue SİLİNMEZ — kırmızı kanal hâlâ baskın', () => {
  const hue = hueRgb(0.0);                      // kırmızı: r≈1, g/b≈0.1
  const [r, g, b] = rgbwKaris(hue, 1, dogal);
  assert.ok(r >= hue[0], 'beyaz katkısı kanal DÜŞÜRMEZ');
  assert.ok(g > hue[1] && b > hue[2], 'beyaz LED g/b kanallarını yükseltir');
  assert.ok(r > g && r > b, 'hue kimliği (kırmızı baskınlık) korunur');
});

test('monoton: beyaz arttıkça hiçbir kanal düşmez', () => {
  const hue = hueRgb(0.55);
  const a = rgbwKaris(hue, 0.3, dogal), c = rgbwKaris(hue, 0.9, dogal);
  for (let i = 0; i < 3; i++) assert.ok(c[i] >= a[i]);
});

test('kanallar [0,1] içinde kalır (clip yok)', () => {
  const out = rgbwKaris([1, 1, 1], 1, { r: 1, g: 1, b: 1 });
  for (const v of out) assert.ok(v >= 0 && v <= 1);
});
