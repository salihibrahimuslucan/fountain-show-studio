// katalog.test.mjs — T-E veri katmanı: ürün→arketip çözümü + katalog bütünlüğü.
// v5 F1: künye-birebir katalog — PN/grup alanları + eski-ad köprüsü testleri.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KATALOG, urunCoz, urunBul, REFERANS_LUMEN } from '../studio/data/katalog.js';

// Motorda var olanlar + v5 F2 ile inecek veri-katmanı arketipleri (perde/air/
// star/torch): veri ileriye dönük tam, palet MOTOR kapısıyla filtreler (ana.js).
const GECERLI_ARKETIPLER = ['duz_jet', 'vario', 'geyser', 'yelpaze', 'switch', 'robo',
  'swing', 'drydeck', 'aquajet', 'laminer', 'rgb_spot',
  'perde', 'air', 'star', 'torch',
  'pop'];   // v7 POP turu: AquaPOP JET switch'ten koptu (kolon değil su topu)
const GECERLI_GRUPLAR = ['animasyon', 'klasik', 'perde', 'isik', 'genel'];

test('katalogdaki her urun gecerli arketip + grup tasir', () => {
  assert.ok(KATALOG.length >= 30, 'kunye-birebir katalog en az 30 urun');
  for (const u of KATALOG) {
    assert.equal(typeof u.ad, 'string');
    assert.ok(GECERLI_ARKETIPLER.includes(u.arketip), u.ad + ' arketipi gecersiz: ' + u.arketip);
    assert.ok(GECERLI_GRUPLAR.includes(u.grup), u.ad + ' grubu gecersiz: ' + u.grup);
    assert.ok(u.etiket.length > 0);
    assert.ok('teknik' in u, u.ad + ' teknik alani eksik (bos obje de olur)');
  }
});
test('urun adlari benzersiz', () => {
  assert.equal(new Set(KATALOG.map(u => u.ad)).size, KATALOG.length);
});
test('PN tasiyan urunlerde PN benzersiz', () => {
  const pnler = KATALOG.filter(u => u.pn != null).map(u => u.pn);
  assert.equal(new Set(pnler).size, pnler.length);
});
test('urunCoz: bilinen ad arketip, bilinmeyen null', () => {
  assert.equal(urunCoz('AquaJUMP'), 'laminer');
  assert.equal(urunCoz('AquaVARIO 151'), 'vario');
  assert.equal(urunCoz('AquaTORCH'), 'torch');
  assert.equal(urunCoz('OlmayanUrun'), null);
});
test('eski-ad koprusu: v3 .aqshow adlari cozulur (geriye uyum)', () => {
  assert.equal(urunCoz('AquaVARIO'), 'vario');      // v3 tek-kelime ad
  assert.equal(urunCoz('AquaJET'), 'aquajet');
  assert.equal(urunCoz('DryDECK'), 'drydeck');
});
test('kunye omurgasi: kilit urunler katalogda', () => {
  // PN iddialari public surumde kaldirildi (parca numaralari ureticiye ait).
  // Omurga kontrolu ada gore yapilir.
  for (const ad of ['AquaROBO', 'AquaSWITCH', 'AquaJUMP', 'AquaLIGHT 412C',
                    'CLASSIC WATER CURTAIN']) {
    assert.ok(KATALOG.find(u => u.ad === ad), ad + ' katalogda yok');
  }
});

// --- v7 TUR 1 / KART v2: non-C kayıtları + gövde/optik alanları ---------------

test('KART v2 §1: 406/406C/412/412C dortlusu birebir kunye tasir', () => {
  // Optik parametreler (guc/lumen/LED sayisi) motorun ISIK MODELINI besler —
  // simulasyon bunlarla hesaplar, o yuzden dogrulanir. PN ticari kimliktir,
  // motorda karsiligi yok → public surumde tutulmaz.
  const bekle = [
    ['AquaLIGHT 406',  '24 W', 1746, 12, false],
    ['AquaLIGHT 406C', '24 W', 1746, 12, true],
    ['AquaLIGHT 412',  '48 W', 4620, 24, false],
    ['AquaLIGHT 412C', '48 W', 4620, 24, true],
  ];
  for (const [ad, guc, lumen, ledSayisi, merkezDelik] of bekle) {
    const u = urunBul(ad);
    assert.ok(u, ad + ' katalogda yok');
    assert.equal(u.teknik.guc, guc, ad + ' guc');
    assert.equal(u.teknik.lumen, lumen, ad + ' lumen');
    assert.equal(u.teknik.renk, 'RGB+WW/AA', ad + ' renk');
    assert.equal(u.ledSayisi, ledSayisi, ad + ' LED sayisi');
    assert.equal(u.merkezDelik, merkezDelik, ad + ' merkez delik');
    assert.equal(u.lens, 60, ad + ' varsayilan lens');
    assert.equal(u.grup, 'isik');
  }
});

test('non-C urunler deliksiz, C urunler delikli', () => {
  assert.equal(urunBul('AquaLIGHT 406').merkezDelik, false);
  assert.equal(urunBul('AquaLIGHT 412').merkezDelik, false);
  // C eki = merkezli-nozul versiyonu → delik VAR (KART v2 §1)
  for (const u of KATALOG.filter(k => k.grup === 'isik' && /C$/.test(k.ad))) {
    assert.equal(u.merkezDelik, true, u.ad + ' C tipi ama deliksiz isaretli');
  }
});

test('her isik urunu govde/optik alanlarini tasir', () => {
  for (const u of KATALOG.filter(k => k.grup === 'isik')) {
    assert.equal(typeof u.ledSayisi, 'number', u.ad + ' ledSayisi eksik');
    assert.ok(u.ledSayisi > 0);
    assert.equal(typeof u.merkezDelik, 'boolean', u.ad + ' merkezDelik eksik');
    assert.ok([10, 20, 60].includes(u.lens), u.ad + ' lens gecersiz: ' + u.lens);
  }
});

test('parlaklikOlcek lumenden TURETILIR, referans 412C = 1.0', () => {
  assert.equal(REFERANS_LUMEN, 4620);
  assert.equal(urunBul('AquaLIGHT 412C').parlaklikOlcek, 1);
  assert.equal(urunBul('AquaLIGHT 412').parlaklikOlcek, 1);
  // 406 = 1746/4620 = 0.3779 → 412 ile arasi 2.65× (KART v2 §7 lumen hiyerarsisi)
  const o406 = urunBul('AquaLIGHT 406').parlaklikOlcek;
  assert.ok(Math.abs(o406 - 1746 / 4620) < 1e-12);
  assert.ok(Math.abs(1 / o406 - 2.646) < 0.01, 'oran ~2.65x olmali');
  // her kayitta alan var; lumensizde 1.0 (uydurma yok)
  for (const u of KATALOG) {
    assert.equal(typeof u.parlaklikOlcek, 'number', u.ad + ' parlaklikOlcek eksik');
    assert.ok(u.parlaklikOlcek > 0 && u.parlaklikOlcek <= 1);
    if (typeof u.teknik?.lumen !== 'number') assert.equal(u.parlaklikOlcek, 1, u.ad);
    else assert.equal(u.parlaklikOlcek, u.teknik.lumen / REFERANS_LUMEN, u.ad);
  }
});

test('urunBul: tam kayit doner, eski-ad koprusu bozulmadi', () => {
  assert.equal(urunBul('AquaVARIO').ad, 'AquaVARIO 151');   // v3 .aqshow adi
  assert.equal(urunBul('DryDECK').ad, 'AquaVARIO DryDECK');
  assert.equal(urunBul('OlmayanUrun'), null);
});

test('non-C eklenmesi eski isik adlarini bozmadi (geriye uyum)', () => {
  assert.equal(urunCoz('AquaLIGHT 412C'), 'rgb_spot');
  assert.equal(urunCoz('AquaLIGHT 406C'), 'rgb_spot');
  assert.equal(urunCoz('AquaLIGHT 412'), 'rgb_spot');       // yeni non-C
});

// --- Faz 1 Task 3 (K2, F1-3): 412C takılabilir bileşen — künye alanı isikModul ---
test('Faz 1: kapsam ürünlerinde isikModul künye alanı', () => {
  const kapsam = ['AquaVARIO 151', 'AquaVARIO 241', 'AquaSWITCH',
    'AquaJUMP', 'AquaJUMP GIANT', 'AquaROBO'];
  for (const ad of kapsam) {
    assert.equal(urunBul(ad)?.isikModul, '412C', `${ad} 412C alabilmeli`);
  }
  // DryDECK'ler entegre ışıklı ürün — takılabilir modül DEĞİL, alan farklı:
  assert.equal(urunBul('AquaVARIO DryDECK')?.isikModul, 'entegre');
  assert.equal(urunBul('AquaSWITCH DryDECK')?.isikModul, 'entegre');
});
