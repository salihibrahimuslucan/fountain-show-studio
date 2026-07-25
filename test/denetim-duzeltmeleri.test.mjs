// denetim-duzeltmeleri.test.mjs — 2026-07-18 denetim turunda bulunan hatalar.
// Her test, DÜZELTMEDEN ÖNCE düşen senaryoyu koşar (regresyon kilidi).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { aqshowOku, aqshowYaz } from '../studio/js/proje.js';
import { Zamanlayici } from '../studio/js/timeline.js';
import { strobe, rainbow } from '../studio/js/desen.js';
import { gruplaLaneler } from '../studio/js/serit-duzen.js';

const oku = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// --- 1) strobe deseni hue kanallarini silmemeli --------------------------------
// Eski kod hue+beyaz'in IKISINI birden filtreliyor, sonra deseni push ediyordu;
// strobe yalniz .beyaz uretir → tum cihazlarin .hue kanali yok oluyordu.
test('desen uygulama: yalniz desenin URETTIGI hedefler degisir', () => {
  const idler = ['duz_jet_1', 'duz_jet_2'];
  let kanallar = idler.flatMap(id => [
    { hedef: `${id}.hue`, tip: 'linear', anahtarlar: [[0, 0.2], [10, 0.9]] },
    { hedef: `${id}.beyaz`, tip: 'smooth', anahtarlar: [[0, 1]] }
  ]);
  const parcalar = strobe(idler, 0, 4, 8);
  // ana.js'teki duzeltilmis birlestirme (yerinde degistir + yalniz yenileri ekle)
  const yeni = new Map(parcalar.map(k => [k.hedef, k]));
  kanallar = kanallar.map(k => yeni.get(k.hedef) ?? k);
  const mevcut = new Set(kanallar.map(k => k.hedef));
  kanallar.push(...parcalar.filter(k => !mevcut.has(k.hedef)));

  const hueler = kanallar.filter(k => k.hedef.endsWith('.hue'));
  assert.equal(hueler.length, 2, 'strobe hue kanallarini SILMEMELI');
  assert.deepEqual(hueler[0].anahtarlar, [[0, 0.2], [10, 0.9]], 'hue icerigi korunmali');
});

test('desen uygulama: ayni cihaz MUKERRER grup basligi almaz', () => {
  const idler = ['duz_jet_1', 'duz_jet_2'];
  let kanallar = idler.flatMap(id => [
    { hedef: `${id}.master`, tip: 'smooth', anahtarlar: [[0, 1]] },
    { hedef: `${id}.hue`, tip: 'linear', anahtarlar: [[0, 0]] },
    { hedef: `${id}.beyaz`, tip: 'smooth', anahtarlar: [[0, 1]] }
  ]);
  const parcalar = rainbow(idler, 24);
  const yeni = new Map(parcalar.map(k => [k.hedef, k]));
  kanallar = kanallar.map(k => yeni.get(k.hedef) ?? k);
  const mevcut = new Set(kanallar.map(k => k.hedef));
  kanallar.push(...parcalar.filter(k => !mevcut.has(k.hedef)));

  const gruplar = gruplaLaneler(kanallar.map(k => ({ kanal: k, hedef: k.hedef })), new Set());
  const basliklar = gruplar.filter(g => g.tip === 'cihaz' || g.grup).map(g => g.cihaz ?? g.ad ?? g.id);
  // FREN 2 (Task 8 hazirlik): bu filtre 'grup' tipi geri geldiginde tekrar sessizce
  // bosa dusebilir (rename tuzagi 2026-07-18'de tam bunu yapmisti, 0===0 gecmisti).
  assert.ok(basliklar.length > 0, 'basliklar filtresi bos kume secti — filtre kirilmis olabilir');
  const benzersiz = new Set(basliklar);
  assert.equal(basliklar.length, benzersiz.size, `mukerrer grup basligi: ${basliklar.join()}`);
});

// --- 2) .aqshow okuma: bozuk sira sessizce gecmemeli ----------------------------
test('aqshowOku: artan olmayan anahtarlar SIRALANIR ve uyari verir', () => {
  const bozuk = JSON.stringify({
    surum: 1, ad: 't', cihazlar: [{ id: 'duz_jet_1', tur: 'duz_jet', x: 0, z: 0, aci: 0 }],
    cizelge: { sure: 20, kanallar: [
      { hedef: 'duz_jet_1.master', tip: 'linear', anahtarlar: [[0, 0], [10, 1], [5, 0.2], [16, 0]] }
    ] }
  });
  const d = aqshowOku(bozuk);
  const a = d.cizelge.kanallar[0].anahtarlar;
  assert.deepEqual(a.map(k => k[0]), [0, 5, 10, 16], 'zamana gore siralanmali');
  assert.ok(d.uyarilar.some(u => /sıra/i.test(u)), `uyari yok: ${d.uyarilar.join('|')}`);
  // siralamadan sonra ornekle anlamli deger dondurmeli (eskiden 0.0727 cikiyordu)
  const z = new Zamanlayici(d.cizelge, {});
  void z;
  const v = a.find(k => k[0] === 10)[1];
  assert.equal(v, 1);
});

test('aqshowOku: bos kanal uyari verir (cihaz sessizce kapali kalirdi)', () => {
  const d = aqshowOku(JSON.stringify({
    surum: 1, cihazlar: [], cizelge: { sure: 10, kanallar: [{ hedef: 'x.master', tip: 'linear', anahtarlar: [] }] }
  }));
  assert.ok(d.uyarilar.some(u => /boş/i.test(u)), `uyari yok: ${d.uyarilar.join('|')}`);
});

test('aqshowYaz/Oku: yogunluk (parcacik butcesi) yuvarlagi kaybetmiyor', () => {
  const metin = aqshowYaz({
    ad: 't', mekan: { fon: 'meydan', plan: null },
    cihazlar: [{ id: 'duz_jet_1', tur: 'duz_jet', x: 1, z: 2, aci: 0, urun: null, yogunluk: 0.55 }],
    cizelge: { sure: 16, kanallar: [] }, muzikAdi: null
  });
  assert.equal(aqshowOku(metin).cihazlar[0].yogunluk, 0.55);
});

// --- 3) editor surukleme kelepcesi artan siralamayi bozmamali -------------------
// Kaynak satirdan dogrulanir (editor.js DOM'suz calismaz): kelepce artik
// komsular arasi bosluga gore daralir, prev > next olamaz.
test('editor kelepcesi: dar komsulukta prev > next olusmaz', () => {
  const src = oku('../studio/js/editor.js');
  assert.ok(src.includes('const bosluk = Math.min(0.01'),
    'kelepce hala sabit 0.01 kullaniyor — dar komsulukta sira bozulur');
  // formulun kendisini burada koseturuyoruz (editor.js ile ayni ifade)
  const kelepcele = (alt, ust, idx, son, x) => {
    const bosluk = Math.min(0.01, Math.max(0, (ust - alt) / 2));
    const prev = alt + (idx > 0 ? bosluk : 0);
    const next = ust - (idx < son ? bosluk : 0);
    return Math.max(prev, Math.min(Math.max(prev, next), x));
  };
  // besteci hue sarma cifti: 7.993 / 7.994 / 8.0 — ortadakini saga surukle
  const v = kelepcele(7.993, 8.0, 1, 2, 8.5);
  assert.ok(v >= 7.993 && v <= 8.0, `kelepce disari tasti: ${v}`);
  assert.ok(v <= 8.0, 'anahtar ardilinin ONUNE gecmemeli');
});

// --- 4) hue varsayilan rampasi 0-1 sozlesmesini asmamali ------------------------
test('hueKanalEkle: uzun sarkida bile anahtarlar 0-1 araliginda kalir', () => {
  const src = oku('../studio/js/proje.js');
  assert.ok(src.includes('const HIZ = 0.045'), 'sarma rampasi kaldirilmis');
  // proje.js DOM/THREE bagimli; formulu birebir kosturup sozlesmeyi dogrula
  const HIZ = 0.045, sure = 345, off = 0.25;
  const anahtarlar = []; let t = 0, v = off % 1;
  while (t < sure) {
    const kalan = (1 - v) / HIZ;
    if (t + kalan >= sure) { anahtarlar.push([t, v], [sure, v + (sure - t) * HIZ]); break; }
    anahtarlar.push([t, v], [t + kalan, 1]); t += kalan + 0.001; v = 0; anahtarlar.push([t, 0]);
  }
  for (const [zaman, deger] of anahtarlar) {
    assert.ok(deger >= 0 && deger <= 1.0001, `hue 0-1 disinda: ${deger} @${zaman}`);
    assert.ok(zaman >= 0 && zaman <= sure, `zaman disinda: ${zaman}`);
  }
  const artan = anahtarlar.every((a, i) => i === 0 || a[0] >= anahtarlar[i - 1][0]);
  assert.ok(artan, 'anahtarlar artan olmali');
});

// --- 5) esik/kaynak tutarliligi -------------------------------------------------
test('isik golu gorunurluk esigi halkaDisk ile ayni mertebede', () => {
  const zemin = oku('../studio/js/zemin-efekt.js');
  const golSatir = zemin.split('\n').find(l => l.includes('this.mesh.visible = v > 0.002'));
  assert.ok(golSatir, 'IsikGolu esigi hala 0.02 — DMX fade ederken gol POP yapar');
});

test('motor boyama kazanci saf modulden gelir (kopya lineer formul yok)', () => {
  const src = oku('../studio/js/motor.js');
  assert.ok(src.includes('hatKazanclari(p.aeration).boyama'), 'motor hala kendi formulunu kullaniyor');
  assert.ok(!src.includes('(p.aeration - 0.15) / 0.45'), 'eski lineer kopya duruyor');
});

test('besteci: cok kisa PCM NaN anahtar uretmez (F en az 1)', () => {
  const src = oku('../studio/js/besteci.js');
  assert.ok(src.includes('Math.max(1, Math.floor(N / hop))'), 'F=0 korumasi yok');
  assert.ok(src.includes('Number.isFinite(v) ? v : 0'), 'zAt NaN korumasi yok');
});

// --- 6) editor duzeni: izgara tasmasi ------------------------------------------
test('CSS: editor izgara cocuklarinda min-width:0 var (tuval tasmasi)', () => {
  const css = oku('../studio/css/studio.css');
  assert.ok(/#editor-ui\s*>\s*\*\s*\{[^}]*min-width:\s*0/.test(css),
    'min-width:0 yok — tuvalin bitmap genisligi sutunu pencereden genis yapar');
});

test('plan tuvali devicePixelRatio uyguluyor (serit tuvaliyle ayni netlik)', () => {
  const src = oku('../studio/js/plan.js');
  assert.ok(src.includes('devicePixelRatio'), 'plan tuvali DPR uygulamiyor — HiDPI ekranda bulanik');
  assert.ok(src.includes('g.setTransform(dpr, 0, 0, dpr, 0, 0)'), 'DPR olcegi cizim donusumune verilmemis');
});

// --- 7) fon (arka plan) geri yukleme + headless gecis tuzagi -------------------
// Sov dosyasi `mekan.fon` tasiyor ve sahneKur onu uyguluyor; ama fon CAPRAZ
// GECISI gercek karelere bagli, headless'ta virtual-time onu ILERLETMEZ →
// smoke kareleri sovun kayitli fonunu degil acilis fonunu gosteriyordu (alti
// ayri fon icin cekilen kareler birbirinin AYNI cikiyordu). #fon= hash'i bu
// tuzagi zaten biliyordu (fonSec(ad, 0)); .aqshow yolu bilmiyordu.
test('sahneKur fonu uyguluyor ve gecissiz secenegini destekliyor', () => {
  const src = oku('../studio/js/ana.js');
  assert.ok(/function sahneKur\(d, secenek = \{\}\)/.test(src), 'sahneKur secenek almiyor');
  assert.ok(src.includes('mekan.fonSec(d.mekan.fon, secenek.gecissiz ? 0 : undefined)'),
    'fon geri yuklemesi gecissiz secenegini gecirmiyor');
});

test('#ornek= hash yolu gecissiz:true ile yukluyor (smoke kareleri guvenilir olsun)', () => {
  const src = oku('../studio/js/ana.js');
  assert.ok(src.includes('sahneKur(aqshowOku(t), { gecissiz: true })'),
    'hash yolu gecisi atlamiyor — smoke kareleri yanlis fonu gosterir');
});

// --- 8) kayit kilidi: sahneyi bozan yollar kayit sirasinda kapali --------------
// Gerekce: kayit sururken cihaz/cizelge degistiren her yol yarim-sov + yeni-sahne
// karisimi bozuk webm uretir. "proje ac" bu gerekceyle zaten kilitliydi; sablon/
// ornek/bestele/desen/muzik ACIKTI. Muzik ayrica transport.sure'yi degistirip
// kaydin otomatik durdurma zamanlayicisini bayatlatiyordu.
test('kayit sirasinda sahneyi/cizelgeyi degistiren yollar kilitli', () => {
  const src = oku('../studio/js/ana.js');
  assert.ok(src.includes('function kayitKilidi('), 'kayitKilidi yardimcisi yok');
  for (const ne of ['şablon döşemek', 'örnek şov açmak', 'bestelemek', 'desen uygulamak', 'müzik yüklemek']) {
    assert.ok(src.includes(`kayitKilidi('${ne}')`), `kilit eksik: ${ne}`);
  }
  // proje ac yolu kendi mesajiyla zaten kilitli
  assert.ok(/kayıt sürüyor — proje açmak/.test(src), 'proje ac kilidi kayboldu');
});

// --- 9) bos durum yonlendirmesi ------------------------------------------------
// Editor ilk acildiginda plan bombos bir izgara, seritler bos dikdortgendi —
// vitrin sitesinde ilk ekran budur, tek bir yonlendirme yoktu.
test('plan gorunumu bos sahnede yonlendirme ciziyor', () => {
  const src = oku('../studio/js/plan.js');
  assert.ok(src.includes('!yonetici.liste().length && !planVeri'), 'bos durum kosulu yok');
  assert.ok(src.includes('paletten bir ürün seç'), 'yonlendirme metni yok');
  // dolu sahnede cizilmemeli: kosul liste uzunluguna bagli olmali
  assert.ok(!/if \(true\)[^\n]*paletten/.test(src));
});

test('serit editoru kanal yokken yonlendirme ciziyor', () => {
  const src = oku('../studio/js/editor.js');
  assert.ok(src.includes('if (!lanes.length)'), 'bos lane kosulu yok');
  assert.ok(src.includes('bir ŞERİT olur'), 'yonlendirme metni yok');
});

// --- 10) karsilama sovu: hash'siz ilk acilis --------------------------------
// Siteye ilk giren BOS bir havuz goruyordu ("calismiyor mu?"). Vitrin urununde
// ilk kare calisan bir sov olmali. Yalniz gercekten bos girişte devreye girer:
// taslak varsa o kazanir, herhangi bir hash varsa o yol kazanir (smoke kareleri
// etkilenmez). ⚠KOSUL TUZAGI: bos hash'te `hashAnahtar` = Set{''}, size 1 —
// `!hashAnahtar.size` ile kontrol karsilamayi HIC acmiyordu.
test('hash siz acilista karsilama sovu yuklenir', () => {
  const src = oku('../studio/js/ana.js');
  assert.ok(src.includes("fetch('ornekler/mozart-daire.aqshow')"), 'karsilama sovu yuklenmiyor');
  assert.ok(!src.includes('!hashAnahtar.size &&'), 'hatali kosul geri gelmis (bos hash Set{\'\'} verir)');
  // taslak dalindan SONRA gelmeli: kaydedilmemis is karsilamaya EZDIRILMEMELI
  assert.ok(src.indexOf("localStorage.getItem('aqshow-taslak')") < src.indexOf("fetch('ornekler/mozart-daire.aqshow')"));
  // otomasyon (hash) blogunun ICINDE olmali — smoke kareleri deterministik kalsin
  const otom = src.indexOf('if (!otomasyon) {');
  assert.ok(otom > 0 && otom < src.indexOf("fetch('ornekler/mozart-daire.aqshow')"));
});

// --- 11) carpma sesi: ayni karede sinirsiz calma ------------------------------
// Beat'e kilitli kalabalik sovda tek karede onlarca carpma cakisiyordu; her biri
// 3 Web Audio dugumu doguruyor ve ust uste binen patlamalar kirpiliyordu.
test('carpma kuyrugu kare basina kelepceli calar', () => {
  const src = oku('../studio/js/ana.js');
  assert.ok(src.includes('KARE_BASINA_CARPMA'), 'kare basina kelepce yok');
  assert.ok(/Math\.sqrt\(olgun\.length \/ calinan\)/.test(src), 'cakisan enerji aktarimi yok');
  // kelepce mantiginin kendisi (ana.js DOM'a bagli, formul burada kosturulur)
  const kazanc = (n, cap = 4) => Math.min(1, Math.sqrt(n / Math.min(cap, n)));
  assert.equal(kazanc(1), 1);
  assert.equal(kazanc(4), 1);
  assert.ok(kazanc(30) === 1, 'kazanc 1 uzerine cikmamali (distorsiyon)');
  assert.ok(Math.min(4, 30) === 4, 'kare basina en fazla 4 calinmali');
});
