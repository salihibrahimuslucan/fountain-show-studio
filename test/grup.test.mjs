// test/grup.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { yeniGrup, gruplariDogrula, dizilimAlgila, uyeSirala, gruplarYenidenAdlandir, grupDerle, birlestirKoruyarak, grupElleKanallari } from '../studio/js/grup.js';

test('yeniGrup varsayilanlari', () => {
  const g = yeniGrup('g1', 'İç Halka', ['a', 'b', 'c']);
  assert.equal(g.dizilim, 'serbest');
  assert.equal(g.rol, 'melodi');
});

test('gruplariDogrula silinen uyeyi budar, bos grubu dusurur, cift uyeligi teke indirir', () => {
  const gruplar = [
    yeniGrup('g1', 'A', ['a', 'b', 'olu']),
    yeniGrup('g2', 'B', ['b']),          // b zaten g1'de → g2'den düşer → g2 boş → düşer
    yeniGrup('g3', 'C', ['yok']),
  ];
  const out = gruplariDogrula(gruplar, ['a', 'b']);
  assert.equal(out.length, 1);
  assert.deepEqual(out[0].uyeler, ['a', 'b']);
});

test('dizilimAlgila halka ve hat', () => {
  const halka = [[1,0],[0,1],[-1,0],[0,-1]].map(([x,z]) => ({ x, z }));
  assert.equal(dizilimAlgila(halka), 'halka');
  const hat = [0,1,2,3].map(x => ({ x, z: 0.01 * x }));
  assert.equal(dizilimAlgila(hat), 'hat');
  assert.equal(dizilimAlgila([{x:0,z:0},{x:3,z:1},{x:1,z:4}]), 'serbest');
});

// Task 3: sahneKur dosyadan yuklerken cihaz id'lerini yeniden adlandirir
// (ana.js:942 harita) — grup uyeleri de ayni haritadan gecmezse kaydet→ac
// sonrasi gruplar sessizce yok olur (baglanmasi Task 9'da).
test('gruplarYenidenAdlandir uyeleri haritadan gecirir, haritasiz uyeyi birakir, girdiyi bozmaz', () => {
  const gruplar = [yeniGrup('g1', 'A', ['eski1', 'eski2', 'haritasiz'])];
  const harita = new Map([['eski1', 'yeni1'], ['eski2', 'yeni2']]);
  const out = gruplarYenidenAdlandir(gruplar, harita);
  assert.deepEqual(out[0].uyeler, ['yeni1', 'yeni2', 'haritasiz']);
  assert.deepEqual(gruplar[0].uyeler, ['eski1', 'eski2', 'haritasiz']); // girdi bozulmadi
});

test('uyeSirala: halkada acisal, hatta eksen boyunca', () => {
  const konum = { a: {x:0,z:1}, b: {x:1,z:0}, c: {x:0,z:-1}, d: {x:-1,z:0} };
  const s = uyeSirala(['a','b','c','d'], konum, 'halka');
  // açısal komşuluk korunur (başlangıç serbest): a-b-c-d ya da tersi bir rotasyon
  const i = s.indexOf('a');
  const komsu = [s[(i+1)%4], s[(i+3)%4]];
  assert.ok(komsu.includes('b') && komsu.includes('d'));
});

test('grupDerle: uye master kanallarini kaynak=grup ile yazar, elle olani atlar', () => {
  const grup = yeniGrup('g1', 'H', ['a', 'b'], 'hat');
  const kanallar = [
    { hedef: 'a.master', tip: 'linear', kaynak: 'elle', anahtarlar: [[0, 0.7]] },
    { hedef: 'b.master', tip: 'linear', oto: true, anahtarlar: [[0, 1]] },
    { hedef: 'a.hue',    tip: 'linear', anahtarlar: [[0, 0.5]] },
  ];
  const konum = { a: {x:0,z:0}, b: {x:1,z:0} };
  const r = grupDerle(grup, 'dalga', { sure: 8, periyot: 2 }, kanallar, konum);
  assert.equal(r.korunan, 1);                             // a.master elle → dokunulmadı
  const aM = r.kanallar.find(k => k.hedef === 'a.master');
  assert.equal(aM.kaynak, 'elle');
  assert.deepEqual(aM.anahtarlar, [[0, 0.7]]);
  const bM = r.kanallar.find(k => k.hedef === 'b.master');
  assert.equal(bM.kaynak, 'grup');
  assert.ok(bM.anahtarlar.length > 2);
  assert.ok(r.kanallar.some(k => k.hedef === 'a.hue'));   // master dışı kanallara dokunmaz
});

test('grupDerle tekrar kosunca eski grup kanalini degistirir (birikme yok)', () => {
  const grup = yeniGrup('g1', 'H', ['a'], 'hat');
  // ⚠Tohum kanal ŞART: grupDerle artık YOKTAN master kanalı üretmiyor (aşağıdaki
  // hayalet-kanal testine bak). Gerçekte cihazYonetici.ekle su cihazına master'ı
  // zaten doğuruyor — boş liste gerçek bir durumu temsil etmiyordu.
  let kanallar = [{ hedef: 'a.master', tip: 'linear', anahtarlar: [[0, 1]] }];
  kanallar = grupDerle(grup, 'dalga', { sure: 8 }, kanallar, { a: {x:0,z:0} }).kanallar;
  kanallar = grupDerle(grup, 'karsilikli', { sure: 8 }, kanallar, { a: {x:0,z:0} }).kanallar;
  assert.equal(kanallar.filter(k => k.hedef === 'a.master').length, 1);
});

// HAYALET KANAL freni (kabul ölçümü bulgusu, danışman kararı): AquaLIGHT gibi
// ışık cihazlarının master kanalı YOKTUR (ana.js: "rgb_spot ışığın master'ı yok").
// grupDerle önceden onlara da `<id>.master` üretiyordu → motorun tüketmediği ölü
// şerit, editörde anlamsız lane, .aqshow'a sızan çöp veri. Işığın grupta olması
// MEŞRU (spec §3: ambiyans = ışık grupları) — sadece master desenini almamalı.
test('grupDerle master kanali OLMAYAN uyeye hayalet kanal uretmez', () => {
  const grup = yeniGrup('g1', 'H', ['su1', 'isik1'], 'hat');
  const kanallar = [
    { hedef: 'su1.master', tip: 'linear', anahtarlar: [[0, 1]] },
    { hedef: 'isik1.hue',  tip: 'linear', anahtarlar: [[0, 0.5]] },   // ışıkta master YOK
  ];
  const konum = { su1: {x:0,z:0}, isik1: {x:1,z:0} };
  const r = grupDerle(grup, 'dalga', { sure: 8, periyot: 2 }, kanallar, konum);
  assert.equal(r.kanallar.length, 2, 'kanal sayisi ARTMAMALI');
  assert.equal(r.kanallar.some(k => k.hedef === 'isik1.master'), false, 'hayalet master uretilmis');
  assert.equal(r.kanallar.find(k => k.hedef === 'su1.master').kaynak, 'grup');
  assert.equal(r.atlanan, 1);
});

// Task 9a: ana.js sahneKur köprüsünün sırayla yaptığı iki adımı (yeniden
// adlandır → doğrula) zincirleme kilitler — DOM'suz, saf. Üyeler haritadaki
// YENİ id'lere taşınmalı; haritada karşılığı olmayan (silinmiş) üye budanmalı.
test('sahneKur köprüsü: gruplarYenidenAdlandir + gruplariDogrula zinciri uyeleri yeni idlere tasir, haritasizi budar', () => {
  const gruplar = [yeniGrup('g1', 'A', ['eski1', 'eski2', 'silinmis'])];
  const harita = new Map([['eski1', 'yeni1'], ['eski2', 'yeni2']]);   // 'silinmis' dosyada vardı ama yüklemede düştü
  const mevcutIdler = ['yeni1', 'yeni2'];                             // yonetici.liste() sonrası gerçek id kümesi
  const out = gruplariDogrula(gruplarYenidenAdlandir(gruplar, harita), mevcutIdler);
  assert.equal(out.length, 1);
  assert.deepEqual(out[0].uyeler, ['yeni1', 'yeni2']);                // taşındı VE haritasız üye budandı
});

// Task 10: "gruba döndür" düğmesinin görünürlük kapısı + temizleme eylemi
// aynı listeden beslenir — üye OLMAYAN cihazın elle kanalı sızmamalı, üyenin
// elle-OLMAYAN kanalı (ör. 'grup'/'besteci' damgalı ya da damgasız) listeye girmemeli.
test('grupElleKanallari: yalniz grup uyesinin ELLE kanallarini doner', () => {
  const grup = yeniGrup('g1', 'H', ['a', 'b']);
  const kanallar = [
    { hedef: 'a.master', kaynak: 'elle', tip: 'linear', anahtarlar: [[0, 1]] },
    { hedef: 'a.hue',    kaynak: 'grup', tip: 'linear', anahtarlar: [[0, 0.5]] },
    { hedef: 'b.master', tip: 'linear', anahtarlar: [[0, 1]] },              // damgasiz — atlanir
    { hedef: 'c.master', kaynak: 'elle', tip: 'linear', anahtarlar: [[0, 1]] }, // uye degil — atlanir
  ];
  const out = grupElleKanallari(grup, kanallar);
  assert.equal(out.length, 1);
  assert.equal(out[0].hedef, 'a.master');
});

test('birlestirKoruyarak: elle kanal ezilmez, digerleri yeniyle degisir, yeni eklenir', () => {
  const mevcut = [
    { hedef: 'a.master', kaynak: 'elle', tip: 'linear', anahtarlar: [[0, 0.7]] },
    { hedef: 'a.hue',    oto: true,      tip: 'linear', anahtarlar: [[0, 0.5]] },
  ];
  const yeni = [
    { hedef: 'a.master', tip: 'smooth', anahtarlar: [[0, 0], [4, 1]] },
    { hedef: 'a.hue',    tip: 'linear', anahtarlar: [[0, 0.1], [4, 0.9]] },
    { hedef: 'a.beyaz',  tip: 'step',   anahtarlar: [[0, 1]] },
  ];
  const r = birlestirKoruyarak(mevcut, yeni, 'besteci');
  assert.equal(r.korunan, 1);
  assert.deepEqual(r.kanallar.find(k => k.hedef === 'a.master').anahtarlar, [[0, 0.7]]);
  assert.equal(r.kanallar.find(k => k.hedef === 'a.hue').kaynak, 'besteci');
  assert.equal(r.kanallar.length, 3);
});
