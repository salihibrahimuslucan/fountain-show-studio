import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dxfAyristir } from '../studio/js/dxf.js';

const D = (...satirlar) => satirlar.join('\n');
const SARMAL = (icerik, insunits = '6') => D(
  '0','SECTION','2','HEADER','9','$INSUNITS','70',insunits,'0','ENDSEC',
  '0','SECTION','2','ENTITIES', icerik, '0','ENDSEC','0','EOF');

test('LINE tek segment', () => {
  const r = dxfAyristir(SARMAL(D('0','LINE','10','1.5','20','2.5','11','4.0','21','6.0')));
  assert.deepEqual(r.parcalar, [[1.5, 2.5, 4.0, 6.0]]);
  assert.equal(r.birimOlcek, 1);          // 6 = metre
});
test('INSUNITS mm=0.001, bilinmeyen=null', () => {
  assert.equal(dxfAyristir(SARMAL('', '4')).birimOlcek, 0.001);
  assert.equal(dxfAyristir(SARMAL('', '99')).birimOlcek, null);
});
test('LWPOLYLINE kapali 3 kose = 3 segment', () => {
  const r = dxfAyristir(SARMAL(D('0','LWPOLYLINE','90','3','70','1',
    '10','0','20','0','10','4','20','0','10','4','20','3')));
  assert.equal(r.parcalar.length, 3);
  assert.deepEqual(r.parcalar[2], [4, 3, 0, 0]);   // kapanış kenarı
});
test('CIRCLE 48 segmente bolunur ve kapanir', () => {
  const r = dxfAyristir(SARMAL(D('0','CIRCLE','10','5','20','5','40','2')));
  assert.equal(r.parcalar.length, 48);
  const ilk = r.parcalar[0], son = r.parcalar[47];
  assert.ok(Math.abs(son[2] - ilk[0]) < 1e-9 && Math.abs(son[3] - ilk[1]) < 1e-9);
});
test('ARC 90 derece yay dogru uclarda', () => {
  const r = dxfAyristir(SARMAL(D('0','ARC','10','0','20','0','40','1','50','0','51','90')));
  const ilk = r.parcalar[0], son = r.parcalar[r.parcalar.length - 1];
  assert.ok(Math.abs(ilk[0] - 1) < 1e-6 && Math.abs(ilk[1]) < 1e-6);       // (1,0)'dan
  assert.ok(Math.abs(son[2]) < 1e-6 && Math.abs(son[3] - 1) < 1e-6);       // (0,1)'e
});
test('ARC sarmali (a1<=a0): 270->90 sifiri asarak gider', () => {
  const r = dxfAyristir(SARMAL(D('0','ARC','10','0','20','0','40','1','50','270','51','90')));
  const ilk = r.parcalar[0], son = r.parcalar[r.parcalar.length - 1];
  assert.ok(Math.abs(ilk[0]) < 1e-6 && Math.abs(ilk[1] + 1) < 1e-6);       // (0,-1)'den
  assert.ok(Math.abs(son[2]) < 1e-6 && Math.abs(son[3] - 1) < 1e-6);       // (0,1)'e
  // uçlar tek başına sarmayı kanıtlamaz: dal olmadan da (0,-1)→(0,1) çıkar, ama
  // 180° üzerinden ters yönde gider — yol (1,0)'dan GEÇMELİ ki sıfır aşımı kanıtlansın
  assert.ok(r.parcalar.some(p => Math.abs(p[0] - 1) < 0.05 && Math.abs(p[1]) < 0.3));
});
test('POLYLINE/VERTEX zinciri', () => {
  const r = dxfAyristir(SARMAL(D('0','POLYLINE','66','1',
    '0','VERTEX','10','0','20','0','0','VERTEX','10','2','20','2',
    '0','VERTEX','10','5','20','2','0','SEQEND')));
  assert.equal(r.parcalar.length, 2);
});
test('taninmayan entity atlanir + sayilir', () => {
  const r = dxfAyristir(SARMAL(D('0','SPLINE','10','0','20','0','0','LINE','10','0','20','0','11','1','21','1')));
  assert.equal(r.parcalar.length, 1);
  assert.equal(r.atlanan, 1);
});
test('bozuk metin firlatir', () => assert.throws(() => dxfAyristir('bu bir dxf degil')));
test('eksik alanli entity NaN sizdirmaz (40siz CIRCLE = 0 segment)', () => {
  const r = dxfAyristir(SARMAL(D('0','CIRCLE','10','5','20','5')));
  assert.equal(r.parcalar.length, 0);
});

import { dxfAkisiYarat } from '../studio/js/dxf.js';

test('dxfAkisiYarat: satir-satir besleme, dxfAyristir ile birebir ayni sonuc', () => {
  const ornek = SARMAL(D('0','LINE','10','1.5','20','2.5','11','4.0','21','6.0',
    '0','CIRCLE','10','5','20','5','40','2',
    '0','LWPOLYLINE','90','3','70','1','10','0','20','0','10','2','20','0','10','2','20','2'));
  const beklenen = dxfAyristir(ornek);
  const a = dxfAkisiYarat();
  for (const s of ornek.split(/\r?\n/)) a.satirBesle(s);
  const r = a.bitir();
  assert.deepEqual(r, beklenen);
});

test('dxfAkisiYarat: ENTITIES yoksa bitir() firlatir', () => {
  const a = dxfAkisiYarat();
  for (const s of '0\nSECTION\n2\nHEADER\n0\nENDSEC'.split('\n')) a.satirBesle(s);
  assert.throws(() => a.bitir(), /ENTITIES yok/);
});

import { sadelestir } from '../studio/js/dxf.js';

test('sadelestir: butce altinda dokunmaz', () => {
  const p = [[0, 0, 1, 1], [1, 1, 2, 2]];
  assert.deepEqual(sadelestir(p, 10), { parcalar: p, dusen: 0 });
});
test('sadelestir: sifir-uzunluk ve tekrarlari eler (yon bagimsiz)', () => {
  const p = [[0, 0, 1, 0], [1, 0, 0, 0], [5, 5, 5, 5], [0, 0, 1, 0]];
  const r = sadelestir(p, 1);
  assert.equal(r.parcalar.length, 1); assert.equal(r.dusen, 3);
});
test('sadelestir: butce asiminda en uzunlar kalir', () => {
  const p = [[0, 0, 10, 0], [0, 0, 1, 0], [0, 0, 5, 0]];
  const r = sadelestir(p, 2);
  assert.deepEqual(r.parcalar.map(s => s[2]).sort((a, b) => a - b), [5, 10]);
  assert.equal(r.dusen, 1);
});
