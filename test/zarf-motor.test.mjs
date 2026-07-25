// zarf-motor.test.mjs — motor.js ↔ zarf.js BAĞLANTISININ testi.
//
// NEDEN VAR: preset hızları elle uydurulmuş sabitlerdi (SWITCH 5.5-6.8 m/s →
// balistik tepe 2.36 m, katalog maks 6 m). zarf.js sayıyı üretiyordu ama motor
// onu OKUMUYORDU; iki katman yan yana duruyor, ekranda hâlâ eski sabit
// kazanıyordu. Bu dosya bağlantının KURULDUĞUNU ve elle sabitin GERİ DÖNMEDİĞİNİ
// bekler.
//
// ⚠motor.js THREE import ettiği için Node'da IMPORT EDİLEMEZ → kaynağı METİN
// olarak okuyoruz (repo deseni: shader kayma testleri aynısını yapıyor).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { urunZarfi } from '../studio/data/zarf.js';
import { SU_URETMEYEN } from '../studio/data/zarf-urunler.js';
import { KATALOG } from '../studio/data/katalog.js';

const motorKaynak = readFileSync(new URL('../studio/js/motor.js', import.meta.url), 'utf8');

test('motor.js zarf.js-i import ediyor', () => {
  assert.match(motorKaynak, /import\s*\{[^}]*urunZarfi[^}]*\}\s*from\s*'\.\.\/data\/zarf\.js'/,
    'motor.js urunZarfi import etmiyor → preset hizlari hala elle sabit demektir');
});

// ⭐Salih'in sikayet ettigi cihaz. Bu iki sayi motorda BIR DAHA gorunmemeli.
test('SWITCH preseti elle yazili 5.5-6.8 m/s sabitini TASIMIYOR', () => {
  const blok = motorKaynak.slice(motorKaynak.indexOf('\n  switch: {'));
  const govde = blok.slice(0, blok.indexOf('govdeTip'));
  assert.doesNotMatch(govde, /speed:\s*\{\s*a:\s*5\.5\s*,\s*b:\s*6\.8\s*\}/,
    'SWITCH preseti hala elle hiz sabiti tasiyor');
  assert.match(govde, /zarfParca\('AquaSWITCH'/,
    'SWITCH preseti hizini zarftan almiyor');
});

test('AquaSWITCH zarfi katalog maks 6 m ile makul (tepe > 4 m)', () => {
  const z = urunZarfi('AquaSWITCH');
  assert.ok(z, 'AquaSWITCH zarf tablosunda yok');
  assert.ok(z.su.tepeM > 4.0, `AquaSWITCH tepe ${z.su.tepeM} — 4 m'nin altinda kalmamali`);
  assert.ok(z.su.tepeM <= 6.0, `AquaSWITCH tepe ${z.su.tepeM} — katalog maksimumunu asamaz`);
});

// --- BAGLI ARKETIPLERIN BUTUNLUGU -------------------------------------------
// Kaynaktaki listeyi ve referans urun adlarini METINDEN cikariyoruz: kod
// degisince test de degisir, elle tutulan ikinci bir liste olusmaz.
const arketipBlok = motorKaynak.match(/const ZARF_ARKETIPLERI = new Set\(\[([\s\S]*?)\]\)/);
const BAGLI = new Set([...(arketipBlok?.[1] ?? '').matchAll(/'([^']+)'/g)].map(m => m[1]));
const REFERANSLAR = [...motorKaynak.matchAll(/zarfParca\('([^']+)'/g)].map(m => m[1]);

test('ZARF_ARKETIPLERI listesi kaynaktan okunabildi ve bos degil', () => {
  assert.ok(BAGLI.size >= 1, 'ZARF_ARKETIPLERI bulunamadi — testin kapisi cokmus olur');
  assert.ok(BAGLI.has('switch'), 'switch arketipi bagli degil');
});

// ⭐Modul yukunde geri dusus YOK: zarfParca cozemedigi referansta PATLAR. O
// yuzden referans adlari commit aninda dogrulanmali, yoksa sayfa hic acilmaz.
test('zarfParca cagrilarindaki her referans urunun zarfi cozuluyor', () => {
  assert.ok(REFERANSLAR.length >= BAGLI.size,
    'bagli arketip sayisi kadar referans yok');
  for (const ad of REFERANSLAR) {
    const z = urunZarfi(ad);
    assert.ok(z, `zarfParca('${ad}') — bu ad zarf tablosunda YOK, modul yukte patlar`);
    assert.ok(z.su.hizMs > 0, `${ad}: hizMs ${z.su.hizMs} — sifir hiz preset uretemez`);
  }
});

// ⭐SESSIZ GERI DUSUSUN PANZEHIRI: motor calisma aninda zarfi cozulemeyen urunu
// sessizce aile referansina dusurur (console.warn repo politikasi geregi YASAK —
// sayfa konsolu SESSIZ olmali). Gurultu yerine BU KAPI: bagli bir arketibe
// dusen her katalog urunu ya zarfini cozebilmeli ya da su uretmedigini ILAN
// etmis olmali. Aksi halde ekranda sessizce yanlis hiz kosar.
test('bagli arketipteki her katalog urunu ya zarfini cozer ya su-uretmeyen ilanlidir', () => {
  const sessizYanlis = KATALOG
    .filter(u => BAGLI.has(u.arketip))
    .filter(u => !(u.ad in SU_URETMEYEN))
    .filter(u => !(urunZarfi(u.ad)?.su.hizMs > 0))
    .map(u => `${u.ad} (${u.arketip})`);
  assert.deepEqual(sessizYanlis, [],
    `zarfi cozulemeyen SU urunleri sessizce aile referansina duser: ${sessizYanlis.join(', ')}`);
});

// Ayni arketibi paylasan urunler EKRANDA AYRISMALI — bu turun asil sebebi.
// AquaJET I/II/III tek preseti paylasiyordu ve birebir ayni goruntuyordu.
test('ayni arketibi paylasan urunlerin zarf hizlari FARKLI', () => {
  const jet = ['AquaJET I', 'AquaJET II', 'AquaJET III'].map(a => urunZarfi(a).su.hizMs);
  assert.equal(new Set(jet.map(v => v.toFixed(3))).size, 3,
    `uc AquaJET ayni hizda: ${jet.join(', ')}`);
  const dd = ['AquaVARIO DryDECK', 'AquaSWITCH DryDECK'].map(a => urunZarfi(a).su.hizMs);
  assert.notEqual(dd[0].toFixed(3), dd[1].toFixed(3), 'iki DryDECK ayni hizda');
});

test('suEkle urun-bazli zarf turetimini cagiriyor', () => {
  const govde = motorKaynak.slice(motorKaynak.indexOf('function suEkle(tur, id, konum'));
  assert.match(govde.slice(0, 1500), /zarfPresetTuret\(tur, p, kunye\)/,
    'suEkle zarfPresetTuret cagirmiyor → kunyedeki urun adi ekrana hic dusmez');
});

// Kendi turetimini yapan arketipler BILEREK disarida: perde duvar_perde oldugu
// icin hizMs=0 doner (baglanirsa perde DONAR), vario/pop kendi kunye
// turetecilerine sahip. Bunlarin listeye sizmasi sessiz bir regresyon olurdu.
test('kendi turetimi olan arketipler zarfa BAGLANMADI', () => {
  for (const tur of ['perde', 'vario', 'pop']) {
    assert.ok(!BAGLI.has(tur),
      `${tur} zarfa baglandi — kendi kunye tureticisi var, cift turetim olur`);
  }
  assert.equal(urunZarfi('CLASSIC WATER CURTAIN').su.hizMs, 0,
    'perde hizMs 0 olmali (dokulur, atmaz) — baglanmama gerekcesinin dayanagi');
});
