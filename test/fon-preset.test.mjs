// v7 M6 — fon presetleri: HER preset yaşanabilir mi? Kanıt kareleri
// (_kiyas.local/v7-isik-borusu/fon2_*.png) M5 ortam çalışmasının yalnız
// `meydan`a uygulandığını, diğerlerinde havuzun siyah boşlukta yüzdüğünü
// gösterdi. Bu dosya o regresyonun geri gelmesini VERİ düzeyinde engeller:
// zemin tonu, sis erimi ve preset karakteri artık sözleşme.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FONLAR, VARSAYILAN_FON, SIS_VARSAYILAN, sisAralik, sisRengi,
         zeminSonum, tepePiksel, duvarPiksel } from '../studio/js/fon-preset.js';
import { hexRgb } from '../studio/js/fon-doku.js';

const oku = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const adlar = Object.keys(FONLAR);

// --- 1) her preset yaşanabilir: zemin + sis + ambiyans ---------------------

test('TUM presetlerde okunur bir zemin tonu var (siyah void yok)', () => {
  for (const ad of adlar) {
    const f = FONLAR[ad];
    assert.equal(typeof f.zeminTon, 'number', `${ad}: zeminTon yok`);
    // ic mekanda 230 m'lik dis disk duvarlarin ARDINDA kalir — orada gorunen
    // zemin oda.zemin'dir, esik ona uygulanir
    const ton = f.icMekan ? f.oda.zemin : f.zeminTon;
    // luma esigi: 0x1a1f2b (meydan, gorsel olarak onaylanan taban) ~ 31
    const [r, g, b] = hexRgb('#' + ton.toString(16).padStart(6, '0'));
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    assert.ok(luma >= 28, `${ad}: zemin tonu fazla karanlik (luma ${luma.toFixed(1)})`);
    assert.equal(typeof f.havuzTon, 'number', `${ad}: havuzTon yok`);
  }
});

test('TUM presetlerde sis erimi ACIKCA tanimli ve tutarli', () => {
  for (const ad of adlar) {
    const [yakin, uzak] = sisAralik(FONLAR[ad]);
    assert.ok(yakin > 0 && uzak > yakin, `${ad}: bozuk sis erimi ${yakin}-${uzak}`);
    // kamera yorungesi r<=13.5 — sis kameranin oturdugu yerde BASLAMAMALI
    assert.ok(yakin >= 8, `${ad}: sis kameranin dibinde basliyor (${yakin} m)`);
    // ana.js kamera far duzlemi 400 — sis ondan once bitmeli, yoksa uzakta
    // kirpilmis (sise karismamis) geometri kenari gorunur
    assert.ok(uzak <= 400, `${ad}: sis erimi kamera far duzlemini asiyor`);
  }
});

test('ic mekanin sis erimi odaya oturur, acik mekanin meydana', () => {
  const [, kapaliUzak] = sisAralik(FONLAR.kapali);
  const oda = FONLAR.kapali.oda;
  // oda kosegeni: sis bundan once bitmemeli (yoksa duvar tamamen sise gomulur),
  // ama iki katindan da uzun olmamali (yoksa sis hic okunmaz = duz karton)
  const kosegen = Math.hypot(oda.en, oda.boy);
  assert.ok(kapaliUzak > kosegen * 0.6 && kapaliUzak < kosegen * 1.6,
    `kapali sis erimi ${kapaliUzak}, oda kosegeni ${kosegen.toFixed(1)}`);
  assert.ok(sisAralik(FONLAR.meydan)[1] >= 240, 'meydan M5 erimini korumali');
});

test('sisRengi: preset override yoksa gok alt rengine duser', () => {
  assert.equal(sisRengi(FONLAR.meydan), FONLAR.meydan.gok[1]);
  assert.equal(sisRengi(FONLAR.kapali), '#1b1f26');   // siyah sis odayi void yapiyordu
  assert.notEqual(sisRengi(FONLAR.kapali), FONLAR.kapali.gok[1]);
});

test('sisAralik preset vermezse M5 varsayilanini dondurur', () => {
  assert.deepEqual(sisAralik({}), SIS_VARSAYILAN);
  assert.deepEqual(sisAralik(null), SIS_VARSAYILAN);
});

// --- 2) her presetin KENDI karakteri var (hepsi meydanin kopyasi degil) ----

test('her presetin ayirt edici bir ufuk olayi var', () => {
  const karakter = {
    sade:   (f) => f.samanyolu && !f.sehir && !f.tepe && f.yildiz >= 150,
    meydan: (f) => f.sehir?.katmanlar.length === 3 && f.pencere,
    park:   (f) => f.agac.length >= 10 && f.lamba?.length >= 5,
    gol:    (f) => f.tepe?.length >= 2 && f.ay && !f.sehir,
    kapali: (f) => f.icMekan && f.oda && !f.yildiz,
    kuru:   (f) => f.kuru && f.sehir && !f.su
  };
  assert.deepEqual(Object.keys(karakter).sort(), adlar.slice().sort(),
    'preset listesi degisti — karakter sozlesmesi de guncellenmeli');
  for (const [ad, kontrol] of Object.entries(karakter))
    assert.ok(kontrol(FONLAR[ad]), `${ad}: kendi karakterini kaybetmis`);
});

test('sade BOS degil ama sus da toplamamis', () => {
  const f = FONLAR.sade;
  assert.equal(f.siluet.length, 0);
  assert.equal(f.agac.length, 0);
  assert.ok(!f.lamba, 'sade sokak lambasi biriktirmemeli');
  assert.ok(f.yildiz >= 150 && f.samanyolu, 'sade: gok bos kalmamali');
  assert.ok(sisAralik(f)[1] <= 200, 'sade: zemin ufka DOGRU sonmeli (kisa erim)');
});

test('kapali gercek bir oda: 4 duvar + tavan + zemin + tavan isigi', () => {
  const o = FONLAR.kapali.oda;
  for (const alan of ['en', 'boy', 'yukseklik', 'duvar', 'tavan', 'zemin'])
    assert.ok(o[alan] !== undefined, `oda.${alan} yok`);
  // kamera yorungesi r<=13.5, y<=4.6 — oda kamerayi ICINE almali
  assert.ok(Math.min(o.en, o.boy) / 2 > 14, 'kamera oda duvarindan disari cikiyor');
  assert.ok(o.yukseklik > 6, 'tavan kameranin tepesine biniyor');
  assert.ok(o.tavanIsik.length >= 3, 'ic mekani aydinlatan SEY gorunmeli');
  assert.ok(FONLAR.kapali.aplikYer.length >= 4);
  // aplikler duvar yuzeyinde mi (kutu icinde havada degil)
  for (const [x, y, z] of FONLAR.kapali.aplikYer) {
    assert.ok(y > 0 && y < o.yukseklik, `aplik y=${y} oda disinda`);
    const yakinlik = Math.min(Math.abs(Math.abs(x) - o.en / 2), Math.abs(Math.abs(z) - o.boy / 2));
    assert.ok(yakinlik < 1, `aplik (${x},${z}) hicbir duvara degmiyor`);
  }
});

test('kuru presetinde su YOK ama zemin okunur', () => {
  const f = FONLAR.kuru;
  assert.equal(f.kuru, true);
  assert.equal(f.su, undefined, 'kuru meydanda su shaderi anlamsiz');
  // havuz diski kuruda GORUNEN zemin — kaldirimla ayni ailede olmali
  const [r, g, b] = hexRgb('#' + f.havuzTon.toString(16).padStart(6, '0'));
  assert.ok(0.2126 * r + 0.7152 * g + 0.0722 * b >= 80, 'kuru zemin dokusu okunmuyor');
});

// --- 3) zeminSonum (saf gradyan) ------------------------------------------

test('zeminSonum: havuz cevresi aydinlik, ufka dogru soner, monoton', () => {
  assert.ok(zeminSonum(0) > 1, 'havuz dibi taban tonun uzerinde olmali');
  let onceki = Infinity;
  for (let r = 0; r <= 230; r += 5) {
    const k = zeminSonum(r);
    assert.ok(k > 0 && k <= 1.3, `r=${r} carpan araligin disinda: ${k}`);
    assert.ok(k <= onceki + 1e-9, `r=${r}: sonum monoton degil`);
    onceki = k;
  }
  assert.ok(zeminSonum(230) < zeminSonum(0) * 0.45, 'ufukta yeterince sonmuyor');
});

test('zeminSonum yakin planda DUZ: kaldirim sinirinda basamak yok', () => {
  // 8 m'ye kadar sabit — 14 m'lik kaldirim halkasiyla disk arasinda
  // gorunur bir parlaklik basamagi olusmasin
  assert.equal(zeminSonum(0), zeminSonum(8));
  assert.ok(Math.abs(zeminSonum(14) - zeminSonum(8)) < 0.1);
});

// --- 4) prosedurel dokular ------------------------------------------------

test('tepePiksel: sarmali profil (silindirde dikis yok)', () => {
  const w = 256, h = 64;
  const { px } = tepePiksel({ w, h, tohum: 5 });
  const tepeYuk = (x) => {
    let y = h - 1; while (y >= 0 && px[(y * w + x) * 4 + 3] === 0) y--;
    return y;
  };
  // ilk ve son sutun komsu olmali (dolanma noktasi)
  assert.ok(Math.abs(tepeYuk(0) - tepeYuk(w - 1)) <= 3, 'dikis yerinde ucurum var');
  // profil DEGISKEN olmali (duz bant = tepe degil)
  const hepsi = Array.from({ length: w }, (_, x) => tepeYuk(x));
  assert.ok(Math.max(...hepsi) - Math.min(...hepsi) > h * 0.15, 'sirt hatti duz');
  // ve altta bosluk kalmamali (tepe havada durmasin)
  for (let x = 0; x < w; x += 17) assert.equal(px[(0 * w + x) * 4 + 3], 255);
});

test('tepePiksel deterministik: ayni tohum ayni piksel', () => {
  const a = tepePiksel({ w: 128, h: 32, tohum: 9 }).px;
  const b = tepePiksel({ w: 128, h: 32, tohum: 9 }).px;
  const c = tepePiksel({ w: 128, h: 32, tohum: 10 }).px;
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
});

test('duvarPiksel: dosenebilir, derzli, tam opak', () => {
  const S = 64;
  const { px, w, h } = duvarPiksel({ S, renk: '#8f96a2', tohum: 11 });
  assert.equal(w, S); assert.equal(h, S);
  for (let i = 3; i < px.length; i += 4) assert.equal(px[i], 255, 'duvar opak olmali');
  // panel derzi: x=0 sutunu komsusundan koyu
  const orta = Math.floor(S / 2) * S;
  assert.ok(px[(orta + 0) * 4] < px[(orta + 4) * 4], 'derz gorunmuyor');
  // supurgelik: alt bant (ALT-ORIJIN) ustten koyu
  assert.ok(px[(2 * S + 20) * 4] < px[((S - 3) * S + 20) * 4], 'supurgelik yok');
});

// --- 5) mekan.js sozlesmeye BAGLI kaliyor mu ------------------------------

test('mekan.js preset tablosunu KOPYALAMAZ, fon-preset.js\'ten alir', () => {
  const s = oku('studio/js/mekan.js');
  assert.match(s, /from '\.\/fon-preset\.js'/);
  assert.ok(!/^const FONLAR = \{/m.test(s), 'preset tablosu ikiye ayrilmis');
  // sis erimi ELLE yazilmaz — presetten turetilir
  assert.match(s, /sisAralik\(f\)/);
  assert.match(s, /scene\.fog\.near = v/);
  assert.match(s, /scene\.fog\.far = v/);
});

test('mekan.js isiksiz malzeme dersini koruyor (zemin/havuz/kaldirim)', () => {
  const s = oku('studio/js/mekan.js');
  // M5 dersi: zayif AmbientLight altinda Standard malzeme siyaha duser
  assert.ok(!/kaldirim = new THREE\.Mesh\([\s\S]{0,120}MeshStandardMaterial/.test(s),
    'kaldirim yeniden Standard olmus');
  assert.ok(!/havuz = new THREE\.Mesh\([\s\S]{0,160}MeshStandardMaterial/.test(s),
    'havuz yeniden Standard olmus');
  assert.match(s, /vertexColors: true/);           // zemin sonum gradyani
  assert.match(s, /zeminSonum\(/);
});

test('ic mekanda gok kubbesi ve yildiz KAPANIR', () => {
  const s = oku('studio/js/mekan.js');
  assert.match(s, /kubbe\.visible = !hedefF\.icMekan/);
  assert.match(s, /if \(f\.yildiz && !f\.icMekan\)/);
});

test('oda dokulari TEK SEFER uretilir (kare basina prosedurel maliyet yok)', () => {
  const s = oku('studio/js/mekan.js');
  assert.match(s, /const ODA_DOKU = new Map\(\)/);
  assert.match(s, /if \(ODA_DOKU\.has\(tur\)\) return ODA_DOKU\.get\(tur\)/);
  // onbellekli doku katmanSil'de disposelanmamali
  assert.match(s, /const dTx = odaDokusu\('duvar'\)/);
  assert.match(s, /m\.userData\.ortakDoku = true; katmanEkle\(m\)/);
});

test('VARSAYILAN_FON gercekten tabloda', () => {
  assert.ok(FONLAR[VARSAYILAN_FON]);
});
