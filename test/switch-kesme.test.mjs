// KART v2 AquaSWITCH turu — envanter #38 ("kesilen jetin BÜTÜN kütle halinde
// havada kalması"). Kare kanıtı (before-t2.03.png, bu turun kayıt klasörü
// dışında/scratchpad'te): switch_1.master 1→0 kesiminden 30 ms sonra ekranda
// TEK bir parçacık bile kalmıyordu — kesim anında havada olan su da anında
// yok oluyordu (uAlfa = baseAlfa * master TEK bir global çarpandı, parçacık
// yaşından bağımsız). Gerçek cihazda taban anında temiz ama önceden fırlamış
// kütle 1-2 sn havada kalıp balistik düşer (kart §3, switch-hedef-2 gözlemi).
//
// Çözüm AIR'in salvo "reload sessizliği" deseninin yeniden kullanımı: kapanış
// anında YENİ doğum durur (uKapali kapısı, salvoKapali ile AYNI park dalı),
// ama HALİHAZIRDA HAVADA olan parçacıklar uAlfa'nın master'la SIFIRLANMAMASI
// sayesinde kendi ömür/balistik/sıçrama zincirini normalce tamamlar. Bu
// yaklaşım zaten çalışan splash (v6 F5) mekanizmasına DOKUNMAZ — yalnız YENİ
// spawn'ı kapatır, var olanı hiç maskelemez (yaş sıfırlanan sıçrama parçacığı
// da dahil, ekstra edge-case doğmaz).
//
// motor.js modül düzeyinde document.createElement kullanıyor → Node'da normal
// import edilemez, air-salvo.test.mjs'teki gibi kaynak metinden okunur.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const kaynak = fs.readFileSync(path.join(KOK, 'studio/js/motor.js'), 'utf8');

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

test('switch preseti aniKesme:true tasir — diger cihazlarda YOK (sizinti kontrolu)', () => {
  assert.match(presetBlok('switch'), /aniKesme:\s*true/, 'switch preseti aniKesme isaretlemiyor');
  for (const ad of ['vario', 'aquajet', 'geyser', 'duz_jet', 'perde', 'air', 'robo', 'swing',
    'drydeck', 'star', 'yelpaze'])
    assert.ok(!/aniKesme:/.test(presetBlok(ad)), ad + ' presetine aniKesme sizmis');
});

test('konumShader uKapali kapisini salvoKapali ile AYNI park dalina baglar', () => {
  const konum = kaynak.slice(kaynak.indexOf('const konumShader'), kaynak.indexOf('const hizShader'));
  assert.match(konum, /uniform float uKapali;/, 'konumShader uKapali uniformu deklare etmiyor');
  assert.match(konum,
    /if \(salvoKapali\(uTime, uSalvoT0, uSalvoAtim, uSalvoPeriyot\) \|\| uKapali > 0\.5\)/,
    'dogum kapisi uKapali ile OR baglanmamis (salvo park dalindan ayri kalmis olabilir)');
});

test('uKapali TÜM cihazlarda varsayilan 0 (no-op) — yalniz aniKesme onu surer', () => {
  assert.match(kaynak, /uKapali:\s*\{\s*value:\s*0\s*\}/,
    'posVar uniformlarinda uKapali varsayilani 0 degil (diger cihazlari etkiler)');
});

test('setMaster: aniKesme cihazinda uAlfa master ile SIFIRLANMAZ, uKapali kapanma kenarini surer', () => {
  const sm = kaynak.match(/setMaster\(v\) \{([\s\S]*?)\n  \}/);
  assert.ok(sm, 'setMaster bulunamadi');
  const govde = sm[1];
  // uAlfa artik kosullu: aniKesme ise sabit baseAlfa, degilse eski master*alfa.
  assert.match(govde, /uAlfa\.value = this\.aniKesme \? this\.baseAlfa : this\.baseAlfa \* this\.master/,
    'uAlfa hala kosulsuz master ile carpiliyor — kesimde havadaki su da aninda gizlenir');
  assert.match(govde, /this\.aniKesme[\s\S]*uKapali\.value/,
    'setMaster uKapali uniformunu surmuyor');
});
