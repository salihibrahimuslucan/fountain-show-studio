// faz2-kunye.test.mjs — Faz 2 cihaz turu: künye alanları (kontrol karakteri,
// yön yetenekleri, DMX kanal haritası, 412 montaj) + KODUN onları okuması.
// Sözleşme: künye varsa künye konuşur, yoksa eski tür listesi YEDEK kalır.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { KATALOG, urunBul } from '../studio/data/katalog.js';
import { solenoidMi, yonYetenekleri } from '../studio/js/proje.js';

// Faz 2 kapsamı (spec 2026-07-24 §Faz 2, Salih listesi)
const KAPSAM = ['AquaVARIO 151', 'AquaVARIO 241', 'AquaVARIO DryDECK', 'AquaSWITCH',
  'AquaSWITCH DryDECK', 'AquaJUMP', 'AquaJUMP GIANT', 'AquaROBO'];

test('kapsamdaki her cihazda kontrol karakteri + DMX haritası var', () => {
  for (const ad of KAPSAM) {
    const k = urunBul(ad);
    assert.ok(k, ad + ' katalogda yok');
    assert.ok(['surekli', 'solenoid'].includes(k.kontrol), ad + ' kontrol alanı eksik/geçersiz');
    assert.ok(k.dmx && Array.isArray(k.dmx.mantiksal) && k.dmx.mantiksal.length,
      ad + ' dmx.mantiksal eksik');
    assert.ok(k.dmx.mantiksal.includes('master'), ad + ' master kanalı olmalı');
  }
});

test('resmi DMX kanal sırası UYDURULMAZ — hepsi null (eksik listesinde)', () => {
  for (const u of KATALOG) if (u.dmx) assert.equal(u.dmx.resmi, null, u.ad);
});

test('solenoid cihazda hız kanalı YOK, sürekli cihazda VAR (iki alan tutarlı)', () => {
  for (const u of KATALOG) {
    if (!u.dmx || !u.kontrol) continue;
    const hizVar = u.dmx.mantiksal.includes('hiz');
    if (u.kontrol === 'solenoid') assert.equal(hizVar, false, u.ad + ': solenoidde ara debi yok');
    else assert.equal(hizVar, true, u.ad + ': sürekli cihazda debi kanalı olmalı');
  }
});

test('412 takılabilen üründe montaj bilgisi var; entegre olan entegre der', () => {
  for (const u of KATALOG) {
    if (u.isikModul === '412C' && KAPSAM.includes(u.ad)) {
      assert.ok(['nozul-ici-halka', 'govde-flansi'].includes(u.montaj412),
        u.ad + ' montaj412 eksik/geçersiz');
    }
    if (u.isikModul === 'entegre') assert.equal(u.montaj412, 'entegre', u.ad);
  }
});

test('solenoidMi künyeden okur — AYNI arketipten iki farklı karakter', () => {
  // İkisi de arketip 'drydeck': tür adına bakan eski kod ikisini AYNI sanıyordu.
  assert.equal(solenoidMi('drydeck', 'AquaSWITCH DryDECK'), true);
  assert.equal(solenoidMi('drydeck', 'AquaVARIO DryDECK'), false);
  assert.equal(solenoidMi('switch', 'AquaSWITCH'), true);
  assert.equal(solenoidMi('vario', 'AquaVARIO 151'), false);
});

test('solenoidMi künyesiz cihazda tür yedeğine düşer (eski davranış)', () => {
  assert.equal(solenoidMi('air', null), true);
  assert.equal(solenoidMi('star', null), true);
  assert.equal(solenoidMi('perde', null), true);
  assert.equal(solenoidMi('vario', null), false);
  assert.equal(solenoidMi('drydeck', null), false);   // jenerik drydeck: eski hâl
});

test('yonYetenekleri: HYDRA eğimi 15° tavanlı, ROBO 45°, SWING tilt YOK', () => {
  assert.deepEqual(yonYetenekleri('robo', 'AquaHYDRA').tilt, [0, 15]);
  assert.deepEqual(yonYetenekleri('robo', 'AquaROBO').tilt, [0, 45]);
  assert.equal(yonYetenekleri('swing', 'AquaSWING').tilt, undefined);
  assert.deepEqual(yonYetenekleri('swing', 'AquaSWING').pan, [-90, 90]);
  assert.deepEqual(yonYetenekleri('robo', 'AquaHYDRA').pan, [-180, 180]);   // 360° yön
});

test('yonYetenekleri: eksensiz cihazda boş (VARIO nozul seçeneği pan değildir)', () => {
  assert.equal(yonYetenekleri('vario', 'AquaVARIO 151').pan, undefined);
  assert.deepEqual(yonYetenekleri('vario', 'AquaVARIO 151').nozulMm, [12, 14, 16]);
  assert.deepEqual(yonYetenekleri('duz_jet', null), {});
});

test('yonYetenekleri künyesiz robo/swing yedeği (eski tür davranışı)', () => {
  assert.deepEqual(yonYetenekleri('robo', null), { pan: [-90, 90], tilt: [0, 45] });
  assert.deepEqual(yonYetenekleri('swing', null), { pan: [-90, 90] });
});

test('kanal doğurma künyeyi okuyor (proje.js tür listesi yalnız yedek)', () => {
  const kaynak = readFileSync(new URL('../studio/js/proje.js', import.meta.url), 'utf8');
  assert.match(kaynak, /if \(solenoidMi\(tur, urun\)\)/, 'STEP kararı solenoidMi ile');
  assert.match(kaynak, /const yon = yonYetenekleri\(tur, urun\)/, 'eksenler künyeden');
  assert.doesNotMatch(kaynak, /if \(tur === 'robo' \|\| tur === 'swing'\)/,
    'pan/tilt tür adına bağlı kalmamalı');
});
