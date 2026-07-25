// zarf-tablo.test.mjs — 39 ürünlük zarf TABLOSUNUN bütünlüğü (formül katmanının
// testi zarf-balistik.test.mjs'te). Bu dosyanın işi: zarf.js dosya başındaki
// "gerçek koruma tablo katmanında" vaadini nakde çevirmek — eksik ürün, geçersiz
// montaj sınıfı, gerekçesiz sayı veya ÇÖZÜLDÜĞÜNDE sıfır çıkan bir zarf commit
// anında kırmızı olsun.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MONTAJ_SINIFLARI, urunZarfi, salvoZarfi } from '../studio/data/zarf.js';
import { URUN_ZARFLARI, SU_URETMEYEN } from '../studio/data/zarf-urunler.js';
import { KATALOG } from '../studio/data/katalog.js';

const KAYNAKLAR = new Set(['katalog', 'fizik', 'standart', 'elle']);
const adlar = Object.keys(URUN_ZARFLARI);

test('MONTAJ_SINIFLARI tam olarak uc sinif', () => {
  assert.deepEqual([...MONTAJ_SINIFLARI].sort(),
    ['duvar_perde', 'islak_havuz', 'kuru_meydan']);
});

// ⭐Butunluk: katalogdaki her urun ya zarf tablosunda ya SU_URETMEYEN ilaninda
// olmali. Sessizce dusen urun = ekranda uydurma preset.
test('katalogdaki her urunun zarf kaydi VAR (yoksa su uretmedigi ilan edilmis)', () => {
  const eksik = KATALOG.map(u => u.ad)
    .filter(ad => !(ad in URUN_ZARFLARI) && !(ad in SU_URETMEYEN));
  assert.deepEqual(eksik, [], `zarf kaydi eksik urunler: ${eksik.join(', ')}`);
});

test('zarf tablosundaki her ad katalogda BIREBIR var (yazim hatasi kapisi)', () => {
  const katalogAdlari = new Set(KATALOG.map(u => u.ad));
  const yabanci = [...adlar, ...Object.keys(SU_URETMEYEN)]
    .filter(ad => !katalogAdlari.has(ad));
  assert.deepEqual(yabanci, [], `katalogda olmayan adlar: ${yabanci.join(', ')}`);
});

test('bir urun HEM tabloda HEM su-uretmeyen listesinde olamaz', () => {
  const cift = adlar.filter(ad => ad in SU_URETMEYEN);
  assert.deepEqual(cift, [], `iki listede birden: ${cift.join(', ')}`);
});

test('her kaydin gecerli montaj sinifi var', () => {
  for (const ad of adlar) {
    assert.ok(MONTAJ_SINIFLARI.has(URUN_ZARFLARI[ad].montaj),
      `${ad}: gecersiz montaj "${URUN_ZARFLARI[ad].montaj}"`);
  }
});

// Gerekcesiz sayi yasak: VARIO turunda "0.1 s" sanilan degerin aslinda motor
// sinyali oldugu ancak gerekce yazildigi icin yakalanmisti.
test('her kaydin kaynagi gecerli ve gerekcesi >= 10 karakter', () => {
  for (const ad of adlar) {
    const k = URUN_ZARFLARI[ad];
    assert.ok(KAYNAKLAR.has(k.kaynak), `${ad}: gecersiz kaynak "${k.kaynak}"`);
    assert.ok(typeof k.gerekce === 'string' && k.gerekce.length >= 10,
      `${ad}: gerekce eksik/kisa`);
  }
});

test('su-uretmeyen ilanlarinin da gerekcesi var', () => {
  for (const [ad, sebep] of Object.entries(SU_URETMEYEN)) {
    assert.ok(typeof sebep === 'string' && sebep.length >= 10, `${ad}: sebep kisa`);
  }
});

// ⭐ASIL KAPI: kayit gecerli gorunup COZULDUGUNDE 0 verebilir (maksTepeM 0,
// kelepce 0'a indirir, montaj yanlis dala sokar...). Turetilmis sayiyi dogrula.
test('her urunun TURETILMIS su zarfi sifirdan buyuk', () => {
  for (const ad of adlar) {
    const z = urunZarfi(ad);
    assert.ok(z.su.tepeM > 0, `${ad}: turetilmis tepeM ${z.su.tepeM}`);
    if (z.montaj === 'duvar_perde') {
      // Perde yukari ATMAZ, DOKULUR: tYukselis fiziken 0'dir (zarf.js perde
      // dali). Onun yerine dusus suresi kanit olur — 0 ise dokulme yuksekligi
      // hic gelmemis demektir.
      assert.equal(z.su.tYukselis, 0, `${ad}: perde yukselmemeli`);
      assert.ok(z.su.tDusus > 0, `${ad}: turetilmis tDusus ${z.su.tDusus}`);
    } else {
      assert.ok(z.su.tYukselis > 0, `${ad}: turetilmis tYukselis ${z.su.tYukselis}`);
      assert.ok(z.su.hizMs > 0, `${ad}: turetilmis hizMs ${z.su.hizMs}`);
    }
  }
});

test('gomme kuru_meydan cihazlarinda ust plaka dolu ve kalinligi var', () => {
  for (const ad of adlar) {
    const k = URUN_ZARFLARI[ad];
    if (!(k.gomme && k.montaj === 'kuru_meydan')) continue;
    assert.ok(k.ustPlaka, `${ad}: gomme ama ustPlaka yok`);
    assert.ok(['daire', 'kare'].includes(k.ustPlaka.bicim), `${ad}: plaka bicimi`);
    assert.ok(k.ustPlaka.kalinlikMm > 0, `${ad}: plaka kalinligi ${k.ustPlaka.kalinlikMm}`);
    const olcu = k.ustPlaka.bicim === 'daire' ? k.ustPlaka.capMm : k.ustPlaka.kenarMm;
    assert.ok(olcu > 0, `${ad}: plaka olcusu yok`);
  }
});

// Salih'in gozle verdigi pencere (tasarim dosyasi, SWITCH satiri): tepeye
// 0.8-1.0 s'de ulasmali. Kod 0.69 s'teydi = cihaz splash-pad tavaninda.
test('AquaSWITCH tepeye 0.8-1.0 s araliginda cikiyor', () => {
  const t = urunZarfi('AquaSWITCH').su.tYukselis;
  assert.ok(t >= 0.8 && t <= 1.0, `SWITCH tYukselis ${t.toFixed(3)} s`);
});

test('bilinmeyen urun null doner, patlamaz', () => {
  assert.equal(urunZarfi('AquaYOK 999'), null);
  assert.equal(urunZarfi(''), null);
  assert.equal(urunZarfi(undefined), null);
});

// AIR dersi (93186c1): omur reload'dan KISA olmali, yoksa slug bolunur ve cihaz
// ekranda gorunmez olur. Tabloya giren her salvo bunu saglamali.
test('salvo tasiyan her kaydin salvo zarfi GECERLI', () => {
  const salvolu = adlar.filter(ad => URUN_ZARFLARI[ad].salvo);
  assert.ok(salvolu.length > 0, 'hic salvo kaydi yok — tablo bozulmus olabilir');
  for (const ad of salvolu) {
    const s = salvoZarfi(URUN_ZARFLARI[ad].salvo);
    assert.ok(s.gecerli, `${ad}: salvo gecersiz (omur ${s.omurSn} >= reload ${s.reloadSn})`);
    assert.equal(urunZarfi(ad).mekanizma.gecerli, true, `${ad}: cozucu salvoyu tasimali`);
  }
});

test('salvosuz kayitta mekanizma null (sahte gecerlilik uretilmiyor)', () => {
  assert.equal(urunZarfi('AquaVARIO 151').mekanizma, null);
});
