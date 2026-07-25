// proje.test.mjs — .aqshow yaz/oku (plan Task 15, TDD).
// proje.js SAF import edilir (three yok): LaminerJet ctx üzerinden enjekte
// edildiğinden (ana.js) modül Node'da doğrudan yüklenir.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aqshowYaz, aqshowOku, cihazYonetici, elleDamgala } from '../studio/js/proje.js';

const ORNEK = {
  ad: 'test', mekan: { fon: 'meydan', plan: { tip: 'dxf', dosyaAdi: 'm.dxf', olcek: 1, veri: '0\nEOF' } },
  cihazlar: [{ id: 'duz_jet_1', tur: 'duz_jet', x: -2, z: 0, aci: 0 }],
  cizelge: { sure: 16, kanallar: [{ hedef: 'duz_jet_1.master', tip: 'smooth', anahtarlar: [[0, 1]] }] },
  muzikAdi: 'parca.mp3'
};
test('yaz→oku gidis-donus kayipsiz', () => {
  const d = aqshowOku(aqshowYaz(ORNEK));
  assert.deepEqual(d.cihazlar, ORNEK.cihazlar);
  assert.deepEqual(d.cizelge, ORNEK.cizelge);
  assert.equal(d.muzikAdi, 'parca.mp3');
});
test('surum alani yazilir ve dogrulanir', () => {
  assert.equal(JSON.parse(aqshowYaz(ORNEK)).surum, 1);
  assert.throws(() => aqshowOku(JSON.stringify({ surum: 99 })), /surum/);
});
test('bozuk json firlatir', () => assert.throws(() => aqshowOku('{{'), /bicim/));
test('bilinmeyen cihaz turu ayiklanir + raporlanir', () => {
  const d = aqshowOku(aqshowYaz({ ...ORNEK, cihazlar: [...ORNEK.cihazlar, { id: 'x_1', tur: 'lazer', x: 0, z: 0, aci: 0 }] }));
  assert.equal(d.cihazlar.length, 1);
  assert.deepEqual(d.uyarilar, ["bilinmeyen tur atlandı: lazer (x_1)"]);
});
test('aqshow: dxf-parcalar zemini yaz/oku turunda korunur', () => {
  const d = { ad: 'x', cihazlar: [], cizelge: { sure: 16, kanallar: [] }, muzikAdi: null,
    mekan: { fon: 'meydan', plan: { tip: 'dxf-parcalar', dosyaAdi: 'buyuk.dxf', parcalar: [[0, 0, 1.5, 2.25]] } } };
  const g = aqshowOku(aqshowYaz(d));
  assert.deepEqual(g.mekan.plan, d.mekan.plan);
  assert.equal(g.uyarilar.length, 0);
});
// T-C per-jet RGBW: hue/beyaz skaler kanallar mevcut formata sığar —
// yaz/oku turunda korunmalı, uyarı üretmemeli.
test('hue/beyaz kanallari yaz/oku turunda korunur (T-C)', () => {
  const d = { ...ORNEK, cizelge: { sure: 16, kanallar: [
    { hedef: 'duz_jet_1.master', tip: 'smooth', anahtarlar: [[0, 1]] },
    { hedef: 'duz_jet_1.hue', tip: 'step', anahtarlar: [[0, 0.4], [4, 0.7]] },
    { hedef: 'duz_jet_1.beyaz', tip: 'smooth', anahtarlar: [[0, 1], [8, 0]] }] } };
  const g = aqshowOku(aqshowYaz(d));
  assert.deepEqual(g.cizelge, d.cizelge);
  assert.equal(g.uyarilar.length, 0);
});
// Geriye uyum: v1 dosyasi (hue/beyaz kanalsiz) uyarisiz acilir —
// beyaz varsayilani 1 oldugu icin sahne birebir v1 gorunumunde kalir.
test('eski kanalsiz dosya uyarisiz acilir (geriye uyum)', () => {
  const g = aqshowOku(aqshowYaz(ORNEK));
  assert.equal(g.uyarilar.length, 0);
  assert.deepEqual(g.cizelge.kanallar.map(k => k.hedef), ['duz_jet_1.master']);
});
// T-E: cihazın katalog ürün adı .aqshow turunda korunur (katalogda olmayan ad
// dahil — tur alanı arketipi belirlediği için ileriye uyumlu taşınır).
test('urun alani yaz/oku turunda korunur (T-E)', () => {
  const d = { ...ORNEK, cihazlar: [{ id: 'laminer_1', tur: 'laminer', x: 0, z: 0, aci: 0, urun: 'AquaJUMP' },
                                   { id: 'duz_jet_1', tur: 'duz_jet', x: 1, z: 1, aci: 0, urun: 'GelecekUrun9000' }] };
  const g = aqshowOku(aqshowYaz(d));
  assert.equal(g.cihazlar[0].urun, 'AquaJUMP');
  assert.equal(g.cihazlar[1].urun, 'GelecekUrun9000');
  assert.equal(g.uyarilar.length, 0);
});
// T-E yelpaze: yeni su turu GECERLI_TURLER'de — yaz/oku turu uyarisiz,
// cihaz ve kanallari (master/hiz/hue/beyaz) kayipsiz doner.
test('yelpaze cihazi yaz/oku turunda uyarisiz korunur (T-E)', () => {
  const d = { ...ORNEK,
    cihazlar: [{ id: 'yelpaze_1', tur: 'yelpaze', x: 3, z: -1, aci: 45, urun: 'Yelpaze Jet' }],
    cizelge: { sure: 16, kanallar: [
      { hedef: 'yelpaze_1.master', tip: 'smooth', anahtarlar: [[0, 1]] },
      { hedef: 'yelpaze_1.hiz', tip: 'smooth', anahtarlar: [[0, 1]] },
      { hedef: 'yelpaze_1.hue', tip: 'step', anahtarlar: [[0, 0.25]] },
      { hedef: 'yelpaze_1.beyaz', tip: 'smooth', anahtarlar: [[0, 1]] }] } };
  const g = aqshowOku(aqshowYaz(d));
  assert.deepEqual(g.cihazlar, d.cihazlar);
  assert.deepEqual(g.cizelge, d.cizelge);
  assert.equal(g.uyarilar.length, 0);
});
// v3 F1: isik sayisi SINIRSIZ — eski 4/8 kapisi kalkti (halka modeli per-device).
// Mock motor: spotEkle hep nesne doner (gercek motor da v3'te sinirsiz).
test('rgb_spot sinirsiz: 12 isik da eklenir (v3)', () => {
  const sahte = { setHue() {}, setParlaklik() {}, setMaster() {}, setHiz() {}, setRenk() {},
    konumla() {}, dondur() {}, sil() {}, dogalRenk: { r: 1, g: 1, b: 1 } };
  const y = cihazYonetici({
    motor: { suEkle: () => sahte, suSil() {}, spotEkle: () => ({ ...sahte }), spotSil() {} },
    scene: {}, cizelge: { sure: 16, kanallar: [] }, kirlet() {}, mesaj() {}, LaminerJet: class {}
  });
  const idler = [];
  for (let i = 0; i < 12; i++) idler.push(y.ekle('rgb_spot', i, 0));
  assert.equal(idler.filter(Boolean).length, 12);
  assert.equal(y.liste().filter(c => c.tur === 'rgb_spot').length, 12);
});
// v3 F3: katalog arketiplerinin kanal dogumu — robo pan+tilt, swing yalniz pan,
// switch master STEP + hiz kanali YOK (solenoid), digerleri master+hiz.
test('robo/swing/switch kanal dogumlari katalog karakterine uyar (v3)', () => {
  const sahte = () => ({ setHue() {}, setParlaklik() {}, setMaster() {}, setHiz() {}, setRenk() {},
    setPanTilt() {}, konumla() {}, dondur() {}, sil() {}, dogalRenk: { r: 1, g: 1, b: 1 } });
  const cizelge = { sure: 16, kanallar: [] };
  const y = cihazYonetici({
    motor: { suEkle: sahte, suSil() {}, spotEkle: sahte, spotSil() {} },
    scene: {}, cizelge, kirlet() {}, mesaj() {}, LaminerJet: class {}
  });
  const r = y.ekle('robo', 0, 0), s = y.ekle('swing', 1, 0), w = y.ekle('switch', 2, 0);
  const hedefler = (id) => cizelge.kanallar.filter(k => k.hedef.startsWith(id + '.'))
    .map(k => k.hedef.split('.')[1]).sort();
  assert.deepEqual(hedefler(r), ['beyaz', 'hiz', 'hue', 'master', 'pan', 'tilt']);
  assert.deepEqual(hedefler(s), ['beyaz', 'hiz', 'hue', 'master', 'pan']);
  assert.deepEqual(hedefler(w), ['beyaz', 'hue', 'master']);           // hiz YOK
  assert.equal(cizelge.kanallar.find(k => k.hedef === w + '.master').tip, 'step');
});
// Task 3: .aqshow gruplar serilestirme + geri uyum (grup.js gruplariDogrula ile budama).
test('aqshow gruplari round-trip tasir ve olu uyeyi budar', () => {
  const d = { ...ORNEK, gruplar: [{ id: 'g1', ad: 'Halka', uyeler: ['duz_jet_1', 'olu'],
    dizilim: 'halka', rol: 'ritim' }] };
  const g = aqshowOku(aqshowYaz(d));
  assert.equal(g.gruplar.length, 1);
  assert.deepEqual(g.gruplar[0].uyeler, ['duz_jet_1']);
  assert.equal(g.gruplar[0].rol, 'ritim');
  assert.equal(g.gruplar[0].dizilim, 'halka');
});
// Kanal kaynak damgasi (elle/grup/besteci) yaz/oku turunda kaybolmamali —
// editörün elle-emek korumasi bu alana dayanir (danisman karari, [SAPMA]).
test('kanal kaynak damgasi round-trip korunur', () => {
  const d = { ...ORNEK, cizelge: { sure: 16, kanallar: [
    { hedef: 'duz_jet_1.master', tip: 'smooth', kaynak: 'elle', anahtarlar: [[0, 1], [4, 0.5]] }] } };
  const g = aqshowOku(aqshowYaz(d));
  assert.equal(g.cizelge.kanallar[0].kaynak, 'elle');
});
test('sayisal olmayan konum/sure ve bozuk kanal ayiklanir (NaN sahneye sizamaz)', () => {
  const d = aqshowOku(JSON.stringify({ surum: 1,
    cihazlar: [{ id: 'j1', tur: 'duz_jet', x: 'BAD', z: 0, aci: 0 },
               { id: 'j2', tur: 'duz_jet', x: 1, z: 2 }],          // aci eksik → 0 varsayılır
    cizelge: { sure: 'yok', kanallar: [
      { hedef: 'j1.master', tip: 'step', anahtarlar: 'BOZUK' },
      { hedef: 'j2.master', tip: 'smooth', anahtarlar: [[0, 1], ['x', 2]] },
      { hedef: 'j2.hiz', tip: 'smooth', anahtarlar: [[0, 1]] }] } }));
  assert.deepEqual(d.cihazlar, [{ id: 'j2', tur: 'duz_jet', x: 1, z: 2, aci: 0 }]);
  assert.equal(d.cizelge.sure, 16);
  assert.deepEqual(d.cizelge.kanallar.map(k => k.hedef), ['j2.hiz']);
  assert.equal(d.uyarilar.length, 3);
});
// Task 4: elleDamgala — kaynak damgasi icin TEK KAPI. Eski `delete oto` cagrilarinin
// halefi; ana.js/editor.js mutasyon noktalari artik burayi cagirir.
test('elleDamgala oto dusurur, kaynak elle yazar', () => {
  const k = { hedef: 'a.master', tip: 'linear', oto: true, anahtarlar: [[0, 1]] };
  elleDamgala(k);
  assert.equal(k.kaynak, 'elle');
  assert.equal('oto' in k, false);
});
// Danisman kilidi: kullanici grup-derlenmis (veya besteci-derlenmis) bir kanali
// elle bozarsa damga sessizce eskisinde KALMAMALI, 'elle'e DONMELI — Task 10'un
// "elle rozeti" ve "gruba dondur" akisinin temeli budur; damga eskisinde kalirsa
// koruma zinciri (grup/besteci derlemesi bu kanala DOKUNAMAZ kurali) kopar.
test('elleDamgala grup/besteci damgasinin uzerine yazar', () => {
  const kGrup = { hedef: 'a.master', tip: 'linear', kaynak: 'grup', anahtarlar: [[0, 1]] };
  elleDamgala(kGrup);
  assert.equal(kGrup.kaynak, 'elle');
  const kBesteci = { hedef: 'a.master', tip: 'linear', kaynak: 'besteci', anahtarlar: [[0, 1]] };
  elleDamgala(kBesteci);
  assert.equal(kBesteci.kaynak, 'elle');
});
