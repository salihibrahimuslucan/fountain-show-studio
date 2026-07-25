// v7 AIR turu — AquaAIR ekranda HİÇ görünmüyordu (kare kanıtı _kiyas.local/
// ajanH_base.png). Kök sebep gerdirme değil SEYRELMEYDİ: kolon boyu v²/2g ≈
// 20 m ve koni 0.07 rad, yani ekranda ~58 m²'lik alan; bütçe ise vario'nun
// 0.5 m²'lik kolonuyla neredeyse aynı parçacık sayısıydı.
//
// Bu dosya iki şeyi bekçiler:
//  (1) YOĞUNLUK — AIR'in ekran parlaklık yoğunluğu, görünür cihazların en
//      sönüğü olan aquajet'in ALTINA düşmemeli. Hata tam olarak buradan
//      dönebilir: birinin hızı/koniyi büyütüp bütçeyi unutması yeter.
//  (2) SALVO NO-OP — solenoid dalı YALNIZ AIR'de açık. Diğer tüm cihazlarda
//      uSalvoAtim=0 → shader dalı ilk satırda false döner; jet/geyser/vario/
//      perde/laminer davranışı bit düzeyinde eskisiyle aynı kalır.
//
// motor.js modül düzeyinde document.createElement kullanıyor (sprite dokuları),
// bu yüzden Node'da import EDİLEMEZ — kaynak metinden okuyoruz.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { urunZarfi } from '../studio/data/zarf.js';   // v7 ZARF: hizlar zarftan turuyor

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const kaynak = fs.readFileSync(path.join(KOK, 'studio/js/motor.js'), 'utf8');

// PRESETLER içinden tek bir arketip bloğunu metinsel çıkar (yorumlar dahil
// olabilir; yalnız sayı okuyoruz, süslü parantez sayarak sınırı buluyoruz).
function presetBlok(ad) {
  const bas = kaynak.indexOf(`\n  ${ad}: {`);
  assert.ok(bas > 0, `${ad} preseti bulunamadi`);
  let i = kaynak.indexOf('{', bas), derinlik = 0;
  for (let j = i; j < kaynak.length; j++) {
    if (kaynak[j] === '{') derinlik++;
    else if (kaynak[j] === '}' && --derinlik === 0) return kaynak.slice(i, j + 1);
  }
  throw new Error(ad + ' blogu kapanmadi');
}
const sayi = (blok, anahtar) => {
  const m = blok.match(new RegExp(anahtar + '\\s*:\\s*([\\d.]+)'));
  assert.ok(m, anahtar + ' okunamadi');
  return parseFloat(m[1]);
};
// ⚠v7 ZARF turu: bagli arketiplerde `speed` artik metinde SAYI olarak yazmiyor,
// `zarfParca('<urun>', ...)` cagrisindan turuyor. Bu okuyucu ikisini de coz:
// once literal, yoksa referans urunun zarfindaki cikis hizi. Metin testi ancak
// GERCEK hizi okursa bir sey dogrular; literal bulamayinca patlamasi, testin
// olctugu seyi kaybettigini gizlerdi.
function hizUst(blok) {
  const lit = blok.match(/speed:\s*\{\s*a:\s*[\d.]+,\s*b:\s*([\d.]+)/);
  if (lit) return parseFloat(lit[1]);
  const ref = blok.match(/zarfParca\('([^']+)'/);
  assert.ok(ref, 'preset ne literal hiz ne zarfParca referansi tasiyor');
  const z = urunZarfi(ref[1]);
  assert.ok(z && z.su.hizMs > 0, `${ref[1]}: zarf cozulemedi`);
  return z.su.hizMs;
}
function olcut(ad) {
  const b = presetBlok(ad);
  const hizB = hizUst(b);
  const kenar = sayi(b, 'kenar'), alfa = sayi(b, 'alpha'), boyut = sayi(b, 'size');
  const aci = parseFloat(b.match(/angle:\s*([\d.]+)/)[1]);
  const ger = sayi(b, 'gerdirme');
  const h = hizB * hizB / (2 * 9.81);            // balistik tepe
  const alan = h * 2 * aci * h;                  // kolonun ekrandaki kaba alanı
  // vGer = clamp(1 + gerdirme*izBoy/tabanPx, 1, 7); oranda z ve çözünürlük sadeleşir
  const vGer = Math.min(7, 1 + ger * (hizB * (1 / 60) / Math.tan(55 * Math.PI / 360) / (boyut * 1.1)));
  return kenar * kenar * alfa * boyut * boyut / alan / vGer;
}

test('AquaAIR kolonu ekranda GÖRÜNÜR yoğunlukta (seyrelme hatası geri gelmesin)', () => {
  const air = olcut('air'), aquajet = olcut('aquajet');
  // Hatalı hâlde bu oran 0.32 idi (air, aquajet'in üçte biri) ve cihaz kaybolmuştu.
  assert.ok(air >= aquajet,
    `AIR yogunlugu aquajet'in altinda: ${air.toExponential(2)} < ${aquajet.toExponential(2)}`);
});

test('gerdirme AIR-e özgü bir ceza DEĞİL — hipotez çürütmesi kayıt altında', () => {
  // Kök sebep avında ilk şüpheli hız-gerdirmesiydi. Ölçüm bunu ÇÜRÜTTÜ: AIR'in
  // vGer'i tavanın altında kalırken vario/aquajet 7.0 TAVANINDA oturuyor ve
  // ikisi de ekranda sorunsuz okunuyor. Yani gerdirme AIR'i diğerlerinden AZ
  // cezalandırıyor; genel katsayıya dokunmak yanlış düzeltme olurdu.
  const vg = (ad) => {
    const b = presetBlok(ad);
    const hizB = hizUst(b);
    return Math.min(7, 1 + sayi(b, 'gerdirme')
      * (hizB * (1 / 60) / Math.tan(55 * Math.PI / 360) / (sayi(b, 'size') * 1.1)));
  };
  assert.ok(vg('air') < vg('vario'), 'AIR gerdirmesi vario-dan buyuk cikti');
  assert.ok(vg('air') < vg('aquajet'), 'AIR gerdirmesi aquajet-ten buyuk cikti');
});

test('salvo YALNIZ solenoid cihazlarında tanımlı (diğer cihazlar no-op)', () => {
  // v7 POP turu: bu test "tam olarak 1 salvo" sayardı. AquaPOP JET de bir
  // SOLENOİD atım cihazı (Ø3mm orifisten su topu) ve aynı mekanizmayı yeniden
  // kullanıyor → beklenen sayı 2. Testin ASIL amacı sayı değil SIZINTI: salvo,
  // sürekli akan cihazlardan (jet/vario/perde/laminer...) uzak durmalı; o kısım
  // aşağıda aynen duruyor.
  const kaclari = [...kaynak.matchAll(/^\s{4}salvo:\s*\{/gm)];
  assert.equal(kaclari.length, 2, 'salvo beklenmeyen sayida presette tanimli (air + pop)');
  assert.match(presetBlok('air'), /salvo:\s*\{\s*atimSn:/);
  // POP'un salvosu literal degil TURETILMIS (popTuret icinde, kunye + fizik).
  assert.match(kaynak, /function popTuret[\s\S]*?salvo:\s*\{\s*atimSn: atim, reloadSn: reload \}/);
  for (const ad of ['vario', 'aquajet', 'geyser', 'duz_jet', 'perde', 'switch'])
    assert.ok(!/salvo:/.test(presetBlok(ad)), ad + ' presetine salvo sizmis');
});

test('salvo kapısı atim<=0 iken ERKEN döner — salvosuz cihazda dal ölü', () => {
  const fn = kaynak.match(/bool salvoKapali\([^)]*\)\{([\s\S]*?)\n  \}/);
  assert.ok(fn, 'salvoKapali GLSL fonksiyonu bulunamadi');
  // İlk satır koşulsuz erken çıkış olmalı; yoksa mod(f, 0.0) = NaN riski doğar.
  assert.match(fn[1], /^\s*if \(atim <= 0\.0\) return false;/);
});

test('her iki compute shader da salvo uniformlarını görür (ölüm kararı eşliği)', () => {
  // Konum ve hız shaderlari ayni dogum/olum kararini vermek zorunda (motor.js
  // sozlesmesi). Salvo karari uTime tabanli oldugu icin ikisinde de tanimli olmali.
  const konum = kaynak.slice(kaynak.indexOf('const konumShader'), kaynak.indexOf('const hizShader'));
  const hiz = kaynak.slice(kaynak.indexOf('const hizShader'), kaynak.indexOf('const _t1 ='));
  for (const [ad, s] of [['konumShader', konum], ['hizShader', hiz]])
    for (const u of ['uSalvoAtim', 'uSalvoPeriyot', 'uSalvoT0'])
      assert.match(s, new RegExp('uniform float ' + u + ';'), `${ad} icinde ${u} yok`);
});

test('reload kilidi: tetik, önceki atımın periyodu dolmadan kabul edilmez', () => {
  const sm = kaynak.match(/setMaster\(v\) \{([\s\S]*?)\n  \}/);
  assert.ok(sm, 'setMaster bulunamadi');
  assert.match(sm[1], /this\.sonT - this\.salvoT0 >= this\.salvoPeriyot/);
  // Kilit yalnız salvolu cihazda çalışmalı — koşul salvoAtim>0 ile kapılı.
  assert.match(sm[1], /this\.salvoAtim > 0/);
});

test('ömür reload’dan KISA — bütçenin tamamı bir sonraki atıma yetişir', () => {
  const b = presetBlok('air');
  const omurB = parseFloat(b.match(/life:\s*\{\s*a:\s*[\d.]+,\s*b:\s*([\d.]+)/)[1]);
  const reload = sayi(b, 'reloadSn');
  // Aksi halde pencere acilirken bir kisim parcacik hala ucuyor olur ve slug
  // bolunur (yogunluk duser, kok sebep geri gelir).
  assert.ok(omurB < reload, `omur ${omurB} >= reload ${reload}`);
});
