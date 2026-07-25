// serit-duzen — şerit editörünün saf düzen hesabı (grup/filtre/zoom) testleri.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gruplaLaneler, laneYerlestir, filtreGecer,
         gorunumYarat, zoomla, kaydir } from '../studio/js/serit-duzen.js';

const K = (hedef) => ({ hedef, tip: 'linear', anahtarlar: [[0, 0]] });
const kanallar = [K('jet1.master'), K('jet1.hiz'), K('jet1.hue'), K('gey1.master'), K('gey1.hue')];

test('gruplaLaneler: cihaz sırası korunur, grup başlığı + açık kanallar', () => {
  const L = gruplaLaneler(kanallar, new Set(), null);
  assert.deepEqual(L.map(l => l.tip + ':' + (l.cihaz ?? l.idx)),
    ['cihaz:jet1', 'kanal:0', 'kanal:1', 'kanal:2', 'cihaz:gey1', 'kanal:3', 'kanal:4']);
  assert.equal(L[0].kanalSayisi, 3);
});

test('gruplaLaneler: katlı grup kanalları gizler, kanal indeksleri başlıkta kalır', () => {
  const L = gruplaLaneler(kanallar, new Set(['jet1']), null);
  assert.deepEqual(L.map(l => l.tip + ':' + (l.cihaz ?? l.idx)),
    ['cihaz:jet1', 'cihaz:gey1', 'kanal:3', 'kanal:4']);
  assert.equal(L[0].katli, true);
  assert.deepEqual(L[0].kanalIdx, [0, 1, 2]);        // özet zarfı bu indekslerden
});

test('gruplaLaneler: filtre kanal lane sayısını kısar, grup başlıkları kalır', () => {
  const L = gruplaLaneler(kanallar, new Set(), 'hue');
  assert.deepEqual(L.map(l => l.tip + ':' + (l.cihaz ?? l.idx)),
    ['cihaz:jet1', 'kanal:2', 'cihaz:gey1', 'kanal:4']);
});

test('laneYerlestir: grup başlığı sabit yükseklik, kalan kanal lanelerine eşit bölünür', () => {
  const L = gruplaLaneler(kanallar, new Set(['jet1']), null);
  const Y = laneYerlestir(L, 200, 18, 16);           // H=200, RULER=18, GRUP_H=16
  assert.equal(Y[0].yTop, 18); assert.equal(Y[0].laneH, 16);
  assert.equal(Y[1].yTop, 34); assert.equal(Y[1].laneH, 16);
  const kanalH = (200 - 18 - 2 * 16) / 2;
  assert.equal(Y[2].laneH, kanalH);
  assert.equal(Y[3].yTop, 50 + kanalH);
});

test('filtreGecer: hue filtresi beyaz kanalını da geçirir, master geçirmez', () => {
  assert.ok(filtreGecer('jet1.hue', 'hue') && filtreGecer('jet1.beyaz', 'hue'));
  assert.ok(!filtreGecer('jet1.master', 'hue'));
  assert.ok(filtreGecer('jet1.master', null));
});

test('zoomla: imleç-merkezli — merkez zaman sabit kalır', () => {
  let g = gorunumYarat(60);                          // {t0:0, t1:60}
  g = zoomla(g, 30, 2, 60);                          // 2× yakınlaş, merkez t=30
  assert.equal(g.t1 - g.t0, 30);
  assert.ok(Math.abs((30 - g.t0) / (g.t1 - g.t0) - 0.5) < 1e-9);
  g = zoomla(g, g.t0, 2, 60);                        // sol kenardan yakınlaş → t0 sabit
  assert.ok(Math.abs(g.t0 - 15) < 1e-9);
});

test('zoomla: kelepçeler — sure dışına taşmaz, min aralık 1s, uzaklaşma tam genişliğe döner', () => {
  let g = zoomla(gorunumYarat(60), 1, 100, 60);      // aşırı zoom
  assert.ok(g.t1 - g.t0 >= 1);
  g = zoomla(g, 30, 0.01, 60);                       // aşırı uzaklaş
  assert.deepEqual([g.t0, g.t1], [0, 60]);
});

test('kaydir: kelepçeli pan', () => {
  let g = zoomla(gorunumYarat(60), 30, 2, 60);       // [15,45]
  g = kaydir(g, 10, 60);  assert.deepEqual([g.t0, g.t1], [25, 55]);
  g = kaydir(g, 100, 60); assert.deepEqual([g.t0, g.t1], [30, 60]);   // sağ kelepçe
});

// --- v7 G7: grup sayaci filtreyi yansitir ---
test('gruplaLaneler: kanalSayisi FILTREDEN GECEN kanali sayar, toplamKanal toplami', () => {
  const kanallar = [
    { hedef: 'duz_jet_1.master' }, { hedef: 'duz_jet_1.hiz' },
    { hedef: 'duz_jet_1.hue' },    { hedef: 'duz_jet_1.beyaz' },
    { hedef: 'rgb_spot_1.hue' },   { hedef: 'rgb_spot_1.parlaklik' }
  ];
  const hepsi = gruplaLaneler(kanallar, new Set(), null);
  const jetHepsi = hepsi.find(l => l.tip === 'cihaz' && l.cihaz === 'duz_jet_1');
  assert.equal(jetHepsi.kanalSayisi, 4);
  assert.equal(jetHepsi.toplamKanal, 4);

  const renk = gruplaLaneler(kanallar, new Set(), 'hue');
  const jetRenk = renk.find(l => l.tip === 'cihaz' && l.cihaz === 'duz_jet_1');
  const spotRenk = renk.find(l => l.tip === 'cihaz' && l.cihaz === 'rgb_spot_1');
  // hue filtresi hue+beyaz kapsar → jet 2, spot 1
  assert.equal(jetRenk.kanalSayisi, 2, 'baslik sayaci gorunen serit sayisi olmali');
  assert.equal(jetRenk.toplamKanal, 4, 'toplam korunmali');
  assert.equal(spotRenk.kanalSayisi, 1);
  // gosterilen kanal lane sayisi baslik sayaclariyla TUTMALI
  const jetLane = renk.filter(l => l.tip === 'kanal' && l.kanal.hedef.startsWith('duz_jet_1')).length;
  assert.equal(jetLane, jetRenk.kanalSayisi);
});

test('gruplaLaneler: katli grupta kanalIdx TAM kalir (ozet zarfi icin)', () => {
  const kanallar = [{ hedef: 'a.master' }, { hedef: 'a.hue' }, { hedef: 'a.hiz' }];
  const g = gruplaLaneler(kanallar, new Set(['a']), 'hue')[0];
  assert.equal(g.kanalIdx.length, 3, 'ozet zarfi tum kanallari gormeli');
  assert.equal(g.toplamKanal, 3);
});

// --- Task 8: gercek cihaz gruplari serit-editorunde -----------------------------

test('gruplaLaneler: grup basligi uye cihazlarin ustunde, uyeler varsayilan katli', () => {
  const kanallar = [
    { hedef: 'a.master', anahtarlar: [[0,1]] }, { hedef: 'b.master', anahtarlar: [[0,1]] },
    { hedef: 'c.master', anahtarlar: [[0,1]] },
  ];
  const gruplar = [{ id: 'g1', ad: 'Halka', uyeler: ['a', 'b'], dizilim: 'halka', rol: 'ritim' }];
  const L = gruplaLaneler(kanallar, new Set(), null, gruplar);
  assert.equal(L[0].tip, 'grup');
  assert.equal(L[0].ad, 'Halka');
  // grupsuz c cihazı grubun ARKASINDAN normal gelir
  assert.ok(L.some(l => l.tip === 'cihaz' && l.cihaz === 'c'));
  // grup üyeleri: cihaz başlıkları grup altında, kanal laneleri grup KATLIYSA gizli
  const Lkatli = gruplaLaneler(kanallar, new Set(['g:g1']), null, gruplar);
  assert.ok(!Lkatli.some(l => l.tip === 'kanal' && l.kanal.hedef.startsWith('a.')));
});

// FREN 1 — geriye uyum (ZORUNLU): gruplar boş/verilmemişken çıktı BİREBİR AYNI.
// Etkileşim koşucusu piksel koordinatlarına dayanıyor; sıra/yükseklik kayarsa
// sessizce kırılır.
test('FREN 1: gruplar boş/verilmemiş iken gruplaLaneler cikti BIREBIR AYNI', () => {
  const set1 = new Set(), set2 = new Set(['jet1']);
  for (const [set, filtre] of [[set1, null], [set2, null], [set1, 'hue']]) {
    const A = gruplaLaneler(kanallar, set, filtre);
    const B = gruplaLaneler(kanallar, set, filtre, []);
    assert.deepEqual(A, B);
  }
  // açıkça beklenen dizilim de değişmemeli (mevcut test ile aynı beklenti)
  const L = gruplaLaneler(kanallar, new Set(), null, []);
  assert.deepEqual(L.map(l => l.tip + ':' + (l.cihaz ?? l.idx)),
    ['cihaz:jet1', 'kanal:0', 'kanal:1', 'kanal:2', 'cihaz:gey1', 'kanal:3', 'kanal:4']);
});

test('gruplaLaneler: grup katliyken kanalIdx UYELERIN TUM kanal indekslerini birlesik tasir', () => {
  const kanallar = [
    { hedef: 'a.master' }, { hedef: 'a.hue' },
    { hedef: 'b.master' }, { hedef: 'b.hiz' },
    { hedef: 'c.master' },
  ];
  const gruplar = [{ id: 'g1', ad: 'G', uyeler: ['a', 'b'], dizilim: 'serbest', rol: 'melodi' }];
  const L = gruplaLaneler(kanallar, new Set(['g:g1']), null, gruplar);
  const grupLane = L.find(l => l.tip === 'grup');
  assert.deepEqual(grupLane.kanalIdx, [0, 1, 2, 3]);   // a'nin 0,1 + b'nin 2,3 birlesik
  assert.equal(grupLane.katli, true);
  assert.equal(grupLane.uyeSayisi, 2);
});

test('gruplaLaneler: grup acikken uye basliklari+kanallari gorunur, sira grup->a->b->grupsuz-c', () => {
  const kanallar = [
    { hedef: 'a.master', anahtarlar: [[0,1]] }, { hedef: 'a.hue', anahtarlar: [[0,0]] },
    { hedef: 'b.master', anahtarlar: [[0,1]] },
    { hedef: 'c.master', anahtarlar: [[0,1]] },
  ];
  const gruplar = [{ id: 'g1', ad: 'G', uyeler: ['a', 'b'], dizilim: 'serbest', rol: 'melodi' }];
  const L = gruplaLaneler(kanallar, new Set(), null, gruplar);
  assert.deepEqual(L.map(l => l.tip + ':' + (l.cihaz ?? l.idx)),
    ['grup:undefined', 'cihaz:a', 'kanal:0', 'kanal:1', 'cihaz:b', 'kanal:2', 'cihaz:c', 'kanal:3']);
});

test('gruplaLaneler: iki grup + uyesiz grup (savunma: patlamamali)', () => {
  const kanallar = [
    { hedef: 'a.master' }, { hedef: 'b.master' }, { hedef: 'c.master' }, { hedef: 'd.master' },
  ];
  const gruplar = [
    { id: 'g1', ad: 'Bir', uyeler: ['a'], dizilim: 'serbest', rol: 'ritim' },
    { id: 'g2', ad: 'Bos', uyeler: [], dizilim: 'serbest', rol: 'vurgu' },
    { id: 'g3', ad: 'Iki', uyeler: ['c', 'd'], dizilim: 'serbest', rol: 'ambiyans' },
  ];
  assert.doesNotThrow(() => gruplaLaneler(kanallar, new Set(), null, gruplar));
  const L = gruplaLaneler(kanallar, new Set(), null, gruplar);
  const grupTipleri = L.filter(l => l.tip === 'grup').map(l => l.ad);
  assert.deepEqual(grupTipleri, ['Bir', 'Bos', 'Iki']);
  // b hicbir grupta degil → grupsuz cihaz olarak sonda gorunur
  assert.ok(L.some(l => l.tip === 'cihaz' && l.cihaz === 'b'));
});

test('laneYerlestir: grup lane tipi de GRUP_H sabit yukseklik alir (l.tip !== "kanal")', () => {
  const laneler = [
    { tip: 'grup', grupId: 'g1', ad: 'G', uyeSayisi: 1, rol: 'ritim', katli: false, kanalIdx: [0] },
    { tip: 'kanal', idx: 0, kanal: {} },
  ];
  const Y = laneYerlestir(laneler, 200, 18, 16);
  assert.equal(Y[0].laneH, 16);
});
