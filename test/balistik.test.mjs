import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inisNoktasi, inisHatti, guc, G_VARSAYILAN } from '../studio/js/balistik.js';

test('inisNoktasi: dik jet nozula geri duser (x/z degismez)', () => {
  const r = inisNoktasi({ x: 3, y: 0, z: -2 }, { x: 0, y: 1, z: 0 }, 10);
  assert.ok(Math.abs(r.x - 3) < 1e-9);
  assert.ok(Math.abs(r.z + 2) < 1e-9);
  assert.ok(Math.abs(r.t - 2 * 10 / G_VARSAYILAN) < 1e-9);   // ucus suresi 2v/g
  assert.ok(Math.abs(r.inisHizi - 10) < 1e-9);               // enerji korunumu
});

test('inisNoktasi: 45 derece egik jet menzil = v^2/g (ROBO yayi)', () => {
  const k = Math.SQRT1_2;
  const r = inisNoktasi({ x: 0, y: 0, z: 0 }, { x: k, y: k, z: 0 }, 12);
  const menzil = 12 * 12 / G_VARSAYILAN;                     // sin(2*45)=1
  assert.ok(Math.abs(r.x - menzil) < 1e-6, `x=${r.x} beklenen ${menzil}`);
  assert.ok(Math.abs(r.z) < 1e-9);
});

test('inisNoktasi: pan azimutu x/z duzlemine dogru dagilir', () => {
  const tilt = 40 * Math.PI / 180, pan = 90 * Math.PI / 180;
  // motor.setPanTilt ile ayni yon formulu
  const yon = { x: Math.cos(pan) * Math.sin(tilt), y: Math.cos(tilt), z: Math.sin(pan) * Math.sin(tilt) };
  const r = inisNoktasi({ x: 0, y: 0, z: 0 }, yon, 9);
  assert.ok(Math.abs(r.x) < 1e-9);        // pan=90 → tamamen +z
  assert.ok(r.z > 1);
});

test('inisNoktasi: yukseklikten asagi dokulen perde nozulun ALTINA iner', () => {
  const r = inisNoktasi({ x: 1, y: 3, z: 1 }, { x: 0, y: -1, z: 0 }, 2);
  assert.ok(Math.abs(r.x - 1) < 1e-9 && Math.abs(r.z - 1) < 1e-9);
  // v=2 asagi + 3m dususten: inis hizi sqrt(4 + 2*9.81*3)
  assert.ok(Math.abs(r.inisHizi - Math.sqrt(4 + 2 * G_VARSAYILAN * 3)) < 1e-9);
});

test('inisNoktasi: kaynakY yuksekse egik jet DAHA UZAGA iner', () => {
  const k = Math.SQRT1_2, yon = { x: k, y: k, z: 0 };
  const yerde = inisNoktasi({ x: 0, y: 0, z: 0 }, yon, 10);
  const yukarda = inisNoktasi({ x: 0, y: 2, z: 0 }, yon, 10);
  assert.ok(yukarda.x > yerde.x);
  assert.ok(yukarda.inisHizi > yerde.inisHizi);
});

test('inisNoktasi: gecersiz girdi null / normalize edilmemis yon calisir', () => {
  assert.equal(inisNoktasi({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 5), null);
  assert.equal(inisNoktasi({ x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, 0), null);
  const a = inisNoktasi({ x: 0, y: 0, z: 0 }, { x: 0, y: 5, z: 0 }, 8);   // |yon|=5
  const b = inisNoktasi({ x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, 8);
  assert.ok(Math.abs(a.t - b.t) < 1e-9);
});

test('inisHatti: perde hatti yonAci ekseninde ve boyu kadar yayilir', () => {
  const h = inisHatti({ x: 0, y: 3, z: 0 }, { x: 0, y: -1, z: 0 }, 1, 4, 0, 3);
  assert.equal(h.length, 3);
  assert.ok(Math.abs(h[0].x + 2) < 1e-9);      // -boy/2
  assert.ok(Math.abs(h[2].x - 2) < 1e-9);      // +boy/2
  assert.ok(Math.abs(h[1].x) < 1e-9);
  const d = inisHatti({ x: 0, y: 3, z: 0 }, { x: 0, y: -1, z: 0 }, 1, 4, Math.PI / 2, 3);
  assert.ok(Math.abs(d[2].z - 2) < 1e-9);      // 90 derece dondurulmus hat z ekseninde
});

test('inisHatti: cizgi yoksa tek nokta', () => {
  assert.equal(inisHatti({ x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, 5, 0, 0).length, 1);
});

test('guc: kelepceli ve monoton', () => {
  assert.equal(guc(0), 0);
  assert.equal(guc(-3), 0);
  assert.equal(guc(28), 1);
  assert.ok(guc(7) > guc(3));
});
