// "IŞIK KARESİ" HATASI (2026-07-22, Salih şikâyeti) — regresyon kilidi.
//
// ŞİKÂYET: "bir cihaz koydum, üzerinde de 412 ışığı olunca orada ışık karesi
// oluşuyor." Kök sebep: renderVertex içindeki halka döngüsünde `normalize(fark)`
// çağrısı. `fark = worldPos - uHalkaPos[i]` — kullanıcı 412C'yi su cihazının TAM
// ÜSTÜNE koyduğunda (gerçek üründe nozul, C-tipi ışığın merkez deliğinden geçer;
// yani en DOĞAL yerleşim) nozulda doğan parçacığın konumu halka konumuna birebir
// eşit olur → fark = (0,0,0) → normalize(0) = 0/0 = NaN.
//
// NaN parçacık rengine (vEkIsik), oradan HDR tamponuna yazılır; UnrealBloomPass'ın
// AYRILABİLİR bulanıklığı NaN'ı önce yatay sonra dikey yayar → ekranın büyük bir
// DİKDÖRTGENİ bozulur. Kullanıcı bunu "ışık karesi" diye tarif etti.
//
// ⚠BU HATA SESSİZDİ: WebGL hatası yok, exception yok, konsol tertemiz. 469 test
// yeşil, tools/smoke.sh "TEMIZ" diyordu — kare simsiyah olduğu halde. Smoke kapısı
// yalnız KONSOLU denetliyor, PİKSELİ değil. Bu testin varlık sebebi de bu: kaynak
// seviyesinde kilitlenmezse aynı desen sessizce geri gelir.
//
// REPRODÜKSİYON KANITI (studio/ornekler/_tani-*.aqshow ile ölçüldü):
//   vario + 412 TAM AYNI noktada .................. KARA (bozuk)
//   vario + 412, 1 mm (0.001) kaydırılmış ......... temiz
//   vario + 412, 1.4 m kaydırılmış (hâlâ örtüşür) .. temiz
//   vario tek başına / 412 tek başına ............. temiz
//   ikisi çakışık ama #tani-bloomsuz .............. temiz (bloom NaN'ı YAYAN, kaynak değil)
// → tetikleyici "üst üste binme" DEĞİL, TAM ÇAKIŞMA.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const oku = (p) => fs.readFileSync(path.join(KOK, p), 'utf8');
// Yorumları at: aşağıdaki yorum blokları yasak deseni ADIYLA anmak zorunda
// (neden yasak olduğunu anlatıyorlar) — kod taraması onlara takılmamalı.
const koduAyikla = (s) => s.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*(?!\s*glsl)[\s\S]*?\*\//g, '');

const motor = koduAyikla(oku('studio/js/motor.js'));

test('motor.js: halka isiginda korumasiz normalize(fark) YOK (sifir vektor = NaN)', () => {
  assert.ok(!/normalize\(\s*fark\s*\)/.test(motor),
    'normalize(fark) geri geldi: iki cihaz tam cakisinca NaN uretir ve bloom onu ' +
    'dikdortgen halinde tum ekrana yayar ("isik karesi" hatasi).');
});

test('motor.js: halka rim hesabi uzunluk esigiyle korunuyor', () => {
  // Koruma sozlesmesi: yon vektoru bolmeden ONCE uzunluk esikle kiyaslanir.
  assert.match(motor, /float\s+uzunluk\s*=\s*length\(\s*fark\s*\);/,
    'fark vektorunun uzunlugu ayri hesaplanmali (bolme oncesi esik kontrolu icin).');
  assert.match(motor, /uzunluk\s*>\s*1e-5/,
    'sifira yakin uzunlukta rim katkisi atlanmali — aksi halde 0/0 = NaN.');
});

test('motor.js: gorsel tani bayraklari duruyor (artefakt izolasyon protokolu)', () => {
  // Bu bayraklar hatanin nasil bulundugunu tekrar edilebilir kilar: katmanlari
  // tek tek kapatip artefaktin hangisinden geldigini izole etmek icin.
  for (const bayrak of ['glowsuz', 'golsuz', 'govdesiz', 'disksiz', 'halkaGolsuz']) {
    assert.ok(motor.includes(`TANI.${bayrak}`),
      `TANI.${bayrak} kayboldu — gorsel artefakt izolasyon protokolu bozulur.`);
  }
});
