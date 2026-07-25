// Kamera dili v2 — otomatik çerçeveleme (geometri.sahneCercevesi) kilidi.
//
// NEDEN VAR: Salih'in GÖRSEL KAPI reddi "kamera presetleri kötü ... profesyonel
// kadraj gerekli" idi. Kadrajın ölçülebilir kısmı şu: çekim dünyanın orijinine
// değil, cihazların GERÇEK yayılımına oturmalı. 37 cihazlık 10 m'lik daire ile
// tek cihazlık sahne aynı kadrajı alamaz.
//
// ⚠Bu dosyanın ikinci bir görevi var: çerçeveleme matematiği bilerek kamera.js'ten
// ÇIKARILIP geometri.js'e (THREE'siz, saf) kondu ki node'da test edilebilsin.
// Gece turunda canlı tarayıcı ölçümü sekme arka plana düşünce (rAF durur)
// tıkanmıştı; görsel iddiaların sayısal bir dayanağı olsun diye buraya alındı.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sahneCercevesi, CERCEVE_PAY_M } from '../studio/js/geometri.js';

const c = (x, z) => ({ id: `c_${x}_${z}`, tur: 'vario', x, z });

test('cihaz yoksa null doner (cagiran kadraja DOKUNMAZ)', () => {
  assert.equal(sahneCercevesi([]), null);
  assert.equal(sahneCercevesi(null), null);
  assert.equal(sahneCercevesi(undefined), null);
});

test('tek cihaz: merkez cihazin kendisi, yaricap = yalnizca pay', () => {
  const r = sahneCercevesi([c(3, -4)]);
  assert.deepEqual(r.merkez, [3, -4]);
  // Tek noktada kosegen 0 → yaricap tamamen paydan gelir. Pay OLMASAYDI yaricap
  // 0 olurdu ve kamera jetin icine girerdi.
  assert.equal(r.yariCap, CERCEVE_PAY_M);
});

test('simetrik yerlesim: merkez orijinde, yaricap kosegenin yarisi + pay', () => {
  const r = sahneCercevesi([c(-6, -6), c(6, -6), c(-6, 6), c(6, 6)]);
  assert.deepEqual(r.merkez, [0, 0]);
  // kosegen = hypot(12,12) = 16.97 → yarisi 8.485
  assert.ok(Math.abs(r.yariCap - (Math.hypot(12, 12) / 2 + CERCEVE_PAY_M)) < 1e-9);
});

test('kaydirilmis yerlesim: merkez ORIJIN DEGIL, kutlenin ortasi', () => {
  // Gercek musteri plani orijinde olmak zorunda degil — v1'in sabit kodlu
  // (0,2,0) hedefi bu yuzden yanlis kadraj veriyordu.
  const r = sahneCercevesi([c(20, 10), c(30, 10), c(20, 20), c(30, 20)]);
  assert.deepEqual(r.merkez, [25, 15]);
});

test('cizgi yerlesim (tek eksende yayilim) dogru olculur', () => {
  const r = sahneCercevesi([c(-5, 0), c(0, 0), c(5, 0)]);
  assert.deepEqual(r.merkez, [0, 0]);
  assert.ok(Math.abs(r.yariCap - (5 + CERCEVE_PAY_M)) < 1e-9);
});

test('bozuk kayit (NaN/eksik koordinat) sahneyi BOZMAZ, atlanir', () => {
  // .aqshow elle duzenlenmis ya da eski surumden gelmis olabilir; tek bozuk
  // kayit tum kadraji NaN'a cevirmemeli (bugun NaN'in ne yaptigini gorduk).
  const r = sahneCercevesi([c(-4, 0), { id: 'bozuk', x: NaN, z: 0 },
    { id: 'eksik' }, c(4, 0)]);
  assert.deepEqual(r.merkez, [0, 0]);
  assert.ok(Number.isFinite(r.yariCap));
});

test('TUM kayitlar bozuksa null doner (sahte kadraj uretilmez)', () => {
  assert.equal(sahneCercevesi([{ x: NaN, z: NaN }, { id: 'yok' }]), null);
});

test('buyuk yerlesim kucukten BUYUK yaricap verir (olcek monoton)', () => {
  const kucuk = sahneCercevesi([c(-1, -1), c(1, 1)]);
  const buyuk = sahneCercevesi([c(-15, -15), c(15, 15)]);
  assert.ok(buyuk.yariCap > kucuk.yariCap * 3,
    'yerlesim buyudukce kadraj da acilmali');
});
