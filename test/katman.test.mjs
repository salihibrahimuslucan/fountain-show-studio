import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KATMAN, saydamSirala, gorusDerinligi } from '../studio/js/katman.js';

// G2 sahnesinin gercek sayilari: #efektdemo kamerasi ve `meydan` fonunun en
// yakin sehir halkasi (R=78, yTavan=46 -> merkez y=23).
const KAM = [8, 3.5, 10];
const HEDEF = [0, 2.5, 0];
const SEHIR_MERKEZ = [0, 23, 0];     // silindir orijini
const SU_MERKEZ = [0, 0, 0];         // Points orijini (dummy position hepsi 0)

test('G2 koku: sehir silueti gorus-uzayinda sudan YAKIN cikar', () => {
  const dSehir = gorusDerinligi(SEHIR_MERKEZ, KAM, HEDEF);
  const dSu = gorusDerinligi(SU_MERKEZ, KAM, HEDEF);
  assert.ok(dSehir < dSu, `sehir ${dSehir} su ${dSu} — yakin cikmali`);
  // Oklid uzakligi TERS soyler; hatanin gizlendigi yer tam burasi.
  const oklid = (p) => Math.hypot(p[0] - KAM[0], p[1] - KAM[1], p[2] - KAM[2]);
  assert.ok(oklid(SEHIR_MERKEZ) > oklid(SU_MERKEZ));
});

test('G2 hatasi: renderOrder esitken siluet suyun USTUNE boyanir', () => {
  const s = saydamSirala([
    { ad: 'su', renderOrder: KATMAN.SAHNE, derinlik: gorusDerinligi(SU_MERKEZ, KAM, HEDEF) },
    { ad: 'sehir', renderOrder: KATMAN.SAHNE, derinlik: gorusDerinligi(SEHIR_MERKEZ, KAM, HEDEF) }
  ]);
  assert.equal(s.at(-1).ad, 'sehir');   // en son cizilen = en ustte
});

test('G2 duzeltmesi: su SU_HACIM bandinda siluetin ustunde kalir', () => {
  const s = saydamSirala([
    { ad: 'su', renderOrder: KATMAN.SU_HACIM, derinlik: gorusDerinligi(SU_MERKEZ, KAM, HEDEF) },
    { ad: 'sehir', renderOrder: KATMAN.SAHNE, derinlik: gorusDerinligi(SEHIR_MERKEZ, KAM, HEDEF) }
  ]);
  assert.equal(s.at(-1).ad, 'su');
});

test('duzeltme kameradan BAGIMSIZ: her acidan su ustte', () => {
  const acilar = [0, 0.7, 1.6, 2.4, 3.14, 4.0, 4.9, 5.7];
  for (const a of acilar) {
    for (const yuk of [1.5, 3.5, 8, 16]) {
      const kam = [Math.cos(a) * 13, yuk, Math.sin(a) * 13];
      const s = saydamSirala([
        { ad: 'su', renderOrder: KATMAN.SU_HACIM, derinlik: gorusDerinligi(SU_MERKEZ, kam, HEDEF) },
        { ad: 'sehir', renderOrder: KATMAN.SAHNE, derinlik: gorusDerinligi(SEHIR_MERKEZ, kam, HEDEF) },
        { ad: 'agac', renderOrder: KATMAN.SAHNE, derinlik: gorusDerinligi([-12, 1.7, -15], kam, HEDEF) }
      ]);
      assert.equal(s.at(-1).ad, 'su', `aci=${a} yuk=${yuk}`);
    }
  }
});

test('band sirasi: gok < sahne < su-zemin < su-hacim', () => {
  assert.ok(KATMAN.GOK < KATMAN.SAHNE);
  assert.ok(KATMAN.SAHNE < KATMAN.SU_ZEMIN);
  assert.ok(KATMAN.SU_ZEMIN < KATMAN.SU_HACIM);
  const s = saydamSirala([
    { ad: 'hacim', renderOrder: KATMAN.SU_HACIM, derinlik: 5 },
    { ad: 'gok', renderOrder: KATMAN.GOK, derinlik: 5 },
    { ad: 'zemin', renderOrder: KATMAN.SU_ZEMIN, derinlik: 5 },
    { ad: 'sahne', renderOrder: KATMAN.SAHNE, derinlik: 5 }
  ]);
  assert.deepEqual(s.map(o => o.ad), ['gok', 'sahne', 'zemin', 'hacim']);
});

test('band icinde derinlik sirasi korunur (uzak once)', () => {
  const s = saydamSirala([
    { ad: 'yakin', renderOrder: KATMAN.SU_HACIM, derinlik: 4 },
    { ad: 'uzak', renderOrder: KATMAN.SU_HACIM, derinlik: 40 }
  ]);
  assert.deepEqual(s.map(o => o.ad), ['uzak', 'yakin']);
});
