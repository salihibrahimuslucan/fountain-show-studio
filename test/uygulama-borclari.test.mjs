// uygulama-borclari.test.mjs — 2026-07-18 denetiminin "AÇIK" bölümünde KASITLI
// ertelenen uygulama-katmanı borçlarını kilitler (render hattı borçları ayrı
// turda). Her başlık bir bulguya birebir karşılık gelir.
// DOM'a bağlı yollar (ana.js şerit ayracı, sahneKur) saf modüle çıkarılamıyor —
// onlar KAYNAK-METİN testiyle kilitli (denetim turunun kabul ettiği yöntem;
// bkz. isik-borusu.test.mjs GLSL kayma testi).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { katliOku, katliYaz, EN_FAZLA_PROJE } from '../studio/js/serit-duzen.js';
import { secimBuda } from '../studio/js/plan.js';
import { daire, ariKovani, cizgi, izgara } from '../studio/js/sablon.js';
import { urunCoz } from '../studio/data/katalog.js';

const oku = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
// Fonksiyon gövdesini kaynaktan kes: kapanış = sütun 0'daki '}' (CRLF toleranslı —
// depo Windows'ta CRLF ile checkout ediliyor, düz '\n}\n' araması ıskalıyordu).
const KAPANIS = new RegExp('\\r?\\n\\}\\r?\\n');
function govdeKes(kaynak, bas) {
  const s = kaynak.slice(kaynak.indexOf(bas));
  const m = KAPANIS.exec(s);
  return s.slice(0, m ? m.index : s.length);
}
const ANA = oku('../studio/js/ana.js');
const EDITOR = oku('../studio/js/editor.js');
const PLAN = oku('../studio/js/plan.js');

// --- Bulgu: katlanmış grup durumu projeler arası sızıyor ---------------------
test('katli: durum proje anahtarina bagli — baska projenin duz_jet_1i sizmaz', () => {
  const ham = katliYaz(null, 'sahil-gosteri', new Set(['duz_jet_1']), ['duz_jet_1', 'geyser_1']);
  assert.deepEqual([...katliOku(ham, 'sahil-gosteri')], ['duz_jet_1']);
  assert.equal(katliOku(ham, 'meydan-sovu').size, 0);      // ⇐ sızıntının kendisi
  assert.equal(katliOku(ham, 'adsiz').size, 0);
});

test('katli: yazarken var olmayan idler budanir (kume sinirsiz buyumez)', () => {
  // Kullanıcı 3 grubu katladı, sonra 2'sinin cihazını sildi.
  const ham = katliYaz(null, 'p', new Set(['a_1', 'b_1', 'c_1']), ['b_1']);
  assert.deepEqual([...katliOku(ham, 'p')], ['b_1']);
  // Hiçbiri kalmazsa proje anahtarı tamamen düşer (boş dizi bırakılmaz).
  const bos = katliYaz(ham, 'p', new Set(['b_1']), []);
  assert.equal(JSON.parse(bos).p, undefined);
});

test('katli: eski duz-dizi bicimi ATILIR (hangi projeye ait oldugu bilinemez)', () => {
  const eski = JSON.stringify(['duz_jet_1', 'geyser_1']);
  assert.equal(katliOku(eski, 'p').size, 0);
  assert.equal(katliOku('bozuk json', 'p').size, 0);
  assert.equal(katliOku(null, 'p').size, 0);
  // Yazma da eski biçimi taşımaz, temiz nesneden başlar.
  const yeni = JSON.parse(katliYaz(eski, 'p', new Set(['x_1']), ['x_1']));
  assert.deepEqual(yeni, { p: ['x_1'] });
});

test('katli: proje sayisi tavanli — en eski dusen LRU', () => {
  let ham = null;
  for (let i = 0; i < EN_FAZLA_PROJE + 5; i++)
    ham = katliYaz(ham, 'proje' + i, new Set(['a_1']), ['a_1']);
  const j = JSON.parse(ham);
  assert.equal(Object.keys(j).length, EN_FAZLA_PROJE);
  assert.equal(j.proje0, undefined);                        // en eskiler düştü
  assert.deepEqual(j['proje' + (EN_FAZLA_PROJE + 4)], ['a_1']);
  // Tekrar dokunulan proje anahtar sırasının SONUNA taşınır (LRU tazeleme)
  const t = JSON.parse(katliYaz(ham, 'proje' + (EN_FAZLA_PROJE + 1), new Set(['a_1']), ['a_1']));
  assert.equal(Object.keys(t).pop(), 'proje' + (EN_FAZLA_PROJE + 1));
});

test('editor.js: katli durumu artik duz dizi olarak YAZILMIYOR', () => {
  assert.ok(!EDITOR.includes('JSON.stringify([...katliler])'),
    'eski (proje-bagimsiz) yazma yolu geri gelmiş');
  assert.match(EDITOR, /katliYaz\(/);
  assert.match(EDITOR, /projeAnahtar/);
  assert.match(ANA, /projeAnahtar:\s*\(\)\s*=>\s*projeAd/);   // ana.js kancayı gerçekten veriyor
});

// --- Bulgu: sahneKur sarkiya bagli durumlari sifirlamiyor --------------------
test('ana.js sahneKur: sonAnaliz ve carpmaKuyruk sifirlanir', () => {
  // ⚠Çapa imzanın TAMAMI değil: sahneKur(d) → sahneKur(d, secenek = {})
  // değişinde (fon geçişsiz yükleme) bu test imza yüzünden kırıldı. Çapa artık
  // parametre listesinden bağımsız.
  const son = govdeKes(ANA, ANA.match(/function sahneKur\([^)]*\) \{/)[0]);
  assert.ok(son.length > 200 && son.length < 4000, 'gövde kesimi tutmadı: ' + son.length);
  assert.match(son, /sonAnaliz = null/, 'yeni projede chase ESKİ şarkının beatlerini kullanır');
  assert.match(son, /carpmaKuyruk\.length = 0/, 'eski showTye zamanlanmış çarpma sesleri taşınır');
  // Sıfırlama cihazlar kurulmadan ÖNCE olmalı (kurulum sırasında kuyruk dolar).
  assert.ok(son.indexOf('carpmaKuyruk.length = 0') < son.indexOf('yonetici.sil(c.id)'));
});

// --- Bulgu: plan.js secim setleri silinmis idleri tutuyor --------------------
test('secimBuda: silinmis idler coklu setinden ve seciliden dusurulur', () => {
  const coklu = new Set(['duz_jet_1', 'duz_jet_2', 'geyser_1']);
  const secili = secimBuda(['duz_jet_2', 'geyser_1'], 'duz_jet_1', coklu);
  assert.deepEqual([...coklu], ['duz_jet_2', 'geyser_1']);
  assert.ok(coklu.has(secili), 'secili hayatta kalan bir üyeye kayar');
});
test('secimBuda: hicbiri kalmazsa secili null olur (Delete no-op degil, pasif)', () => {
  const coklu = new Set(['a_1', 'b_1']);
  assert.equal(secimBuda([], 'a_1', coklu), null);
  assert.equal(coklu.size, 0);
});
test('secimBuda: gecerli secim DEGISMEZ (budama masum secimi bozmaz)', () => {
  const coklu = new Set(['a_1']);
  assert.equal(secimBuda(new Set(['a_1', 'b_1']), 'b_1', coklu), 'b_1');
  assert.deepEqual([...coklu], ['a_1']);
});
test('plan.js: budama ciz() icinde, cihaz listesini okuyan tek kapida', () => {
  assert.match(PLAN, /secili = secimBuda\(idler, secili, coklu\)/);
});

// --- Bulgu: sablon tur/urun cifti katalogla celisiyor ------------------------
test('sablon: her cihazin turu KATALOGDAN turetilmis arketiple ayni', () => {
  for (const [ad, uret] of Object.entries({ daire, ariKovani, cizgi, izgara })) {
    for (const c of uret()) {
      const arketip = urunCoz(c.urun);
      assert.ok(arketip, `${ad}: '${c.urun}' katalogda yok`);
      assert.equal(c.tur, arketip, `${ad}: ${c.urun} → tur '${c.tur}' ≠ katalog '${arketip}'`);
    }
  }
});
test('sablon: AquaVARIO artik vario (eski hatali duz_jet esleme geri gelmesin)', () => {
  assert.ok(daire().some(c => c.urun === 'AquaVARIO'));
  assert.ok(daire().every(c => c.urun !== 'AquaVARIO' || c.tur === 'vario'));
  assert.ok(izgara().every(c => c.urun !== 'AquaVARIO' || c.tur === 'vario'));
  // vario artık şablonlardan geldiği için uygulama tabloları onu TANIMALI
  assert.ok(PLAN.includes("vario: '#"), 'plan.js renk tablosunda vario yok');
  assert.match(ANA, /CARPMA_GECIKME = \{[^}]*vario:/);
  assert.match(ANA, /CARPMA_SIDDET = \{[^}]*vario:/);
});

// --- Bulgu (ŞÜPHE, doğrulandı): serit ayracinda dinleyici cogalmasi ----------
test('ana.js serit ayraci: dinleyiciler BIR KEZ baglanir, pointerdown icinde yok', () => {
  const blok = ANA.slice(ANA.indexOf("getElementById('serit-ayrac')"),
                         ANA.indexOf("if (hashAnahtar.has('mod=editor'))"));
  // yalnız pointerdown HANDLER'ının gövdesi (kancanın kendi adı sayılmasın)
  const basIdx = blok.indexOf("addEventListener('pointerdown'");
  const basisGovde = blok.slice(blok.indexOf('{', basIdx),
                                blok.indexOf("ayrac.addEventListener('pointermove'"));
  assert.ok(basisGovde.length > 20, 'blok kesimi tutmadı');
  assert.ok(!basisGovde.includes('addEventListener'),
    'pointerdown handlerı içinde dinleyici bağlanıyor — her basış yenisini ekler');
  assert.ok(!blok.includes('once: true'), 'kaldırma hâlâ tek {once:true} pointerupa asılı');
  // pointerId eşleşmesi: yakalanmamış ikinci pointer sürüklemeyi ele geçirmesin
  assert.match(blok, /e\.pointerId !== surukle\.id/);
  // bırakma yollarının üçü de bağlı olmalı (capture kaybı sessizce takılı bırakırdı)
  for (const olay of ['pointerup', 'pointercancel', 'lostpointercapture'])
    assert.ok(blok.includes(`ayrac.addEventListener('${olay}', ayracBirak)`), olay + ' bağlı değil');
});

// Modal kilit nöbeti: headless smoke'u asan confirm/alert yalnız KULLANICI
// jestiyle tetiklenen yollarda olabilir; otomatik koşan sahneKur hiç modal açmamalı.
test('sahneKur modal acmaz (headless smoke kilidi nobeti)', () => {
  // ⚠Çapa imzanın TAMAMI değil: sahneKur(d) → sahneKur(d, secenek = {})
  // değişinde (fon geçişsiz yükleme) bu test imza yüzünden kırıldı. Çapa artık
  // parametre listesinden bağımsız.
  const son = govdeKes(ANA, ANA.match(/function sahneKur\([^)]*\) \{/)[0]);
  assert.ok(!/\b(confirm|alert|prompt)\s*\(/.test(son));
});
