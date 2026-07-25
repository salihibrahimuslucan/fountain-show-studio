// sablon.test.mjs — v3 F5 yerleşim şablonları: geçerli türler, çakışma yok, sınır içi.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { daire, ariKovani, cizgi, izgara } from '../studio/js/sablon.js';

// 'vario': AquaVARIO'nun katalog arketipi (denetim 2026-07-18 hizalaması)
const GECERLI = ['duz_jet', 'vario', 'geyser', 'yelpaze', 'switch', 'robo', 'swing', 'drydeck', 'aquajet', 'laminer', 'rgb_spot'];
const cakismaYok = (c) => new Set(c.map(k => `${k.x.toFixed(2)},${k.z.toFixed(2)}`)).size === c.length;

test('daire: 8li setin tamami kullanilir, cakisma yok, yaricap ici', () => {
  const c = daire(8);
  const turler = new Set(c.map(k => k.tur));
  for (const t of ['geyser', 'vario', 'switch', 'aquajet', 'robo', 'swing', 'laminer', 'rgb_spot'])
    assert.ok(turler.has(t), t + ' eksik');
  assert.ok(c.every(k => GECERLI.includes(k.tur) && typeof k.urun === 'string'));
  assert.ok(cakismaYok(c));
  assert.ok(c.every(k => Math.hypot(k.x, k.z) <= 8 * 1.2));
});
test('ariKovani: merkez + hex halkalar, dis ceper 412C', () => {
  const c = ariKovani(2);
  assert.equal(c.length, 1 + 6 + 12);                     // merkez + halka1(6) + halka2(12)
  assert.ok(c.slice(0, 7).every(k => k.tur === 'drydeck'));
  assert.ok(c.slice(7).every(k => k.tur === 'rgb_spot'));
  assert.ok(cakismaYok(c));
});
test('cizgi: switch dizisi + iki uc jump', () => {
  const c = cizgi(12, 9);
  assert.equal(c.filter(k => k.tur === 'switch').length, 9);
  assert.equal(c.filter(k => k.tur === 'laminer').length, 2);
  assert.ok(cakismaYok(c));
});
test('izgara: nx*nz vario + 2 robo', () => {
  const c = izgara(4, 4);
  assert.equal(c.filter(k => k.tur === 'vario').length, 16);   // katalog arketipi (eskiden yanlislikla duz_jet)
  assert.equal(c.filter(k => k.tur === 'robo').length, 2);
  assert.ok(cakismaYok(c));
});
