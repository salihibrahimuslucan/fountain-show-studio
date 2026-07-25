// test/isik-hiz-olcek.test.mjs — motor.js Node'da import edilemez (document);
// emsal: switch-kesme.test.mjs kaynak-regex deseni.
//
// Faz 1.5 (2026-07-25): F1-1 kapısı Salih'te DÜŞTÜ ("hız düşükken ışık çok göz
// alıyor, kare gibi"). Faz 1 yalnız ışığı kısıyordu; kök sebep sabit parçacık
// sayısıydı (kolon k² kısalırken yoğunluk 1/k² artıyor → additive doyma).
// Bu dosya artık ÜÇ sözleşmeyi birlikte korur: debi kapısı, kütle payı, ayak izi.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const kaynak = readFileSync(new URL('../studio/js/motor.js', import.meta.url), 'utf8');
const zemin = readFileSync(new URL('../studio/js/zemin-efekt.js', import.meta.url), 'utf8');

test('kutlePayi: hız kanalı olan cihazda uHizScale, aniKesme (switch) cihazda master', () => {
  const m = kaynak.match(/kutlePayi\(\)\s*\{[\s\S]*?\n  \}/);
  assert.ok(m, 'kutlePayi tanımlı olmalı');
  assert.match(m[0], /aniKesme/);
  assert.match(m[0], /this\.master/);
  assert.match(m[0], /uHizScale/);
});

test('isikOlcek: taban 0.15 + üstel eğri (lineer 0.35 tabanı kapıda düştü)', () => {
  const m = kaynak.match(/isikOlcek\(\)\s*\{[\s\S]*?\n  \}/);
  assert.ok(m, 'isikOlcek tanımlı olmalı');
  assert.match(m[0], /0\.15/, 'taban 0.15');
  assert.match(m[0], /Math\.pow\(this\.kutlePayi\(\),\s*1\.5\)/, 'kütle payının üstel eğrisi');
  assert.doesNotMatch(m[0], /0\.35\s*\+\s*0\.65/, 'eski lineer eğri kalmamalı');
});

test('isikTazele: glow + göl + menzil + DEBİ KAPISI + dış ton TEK merkezden', () => {
  const m = kaynak.match(/isikTazele\(\)\s*\{[\s\S]*?\n  \}/);
  assert.ok(m, 'isikTazele tanımlı olmalı');
  assert.match(m[0], /nozulGlow/); assert.match(m[0], /goller/);
  assert.match(m[0], /uIsikMenzil/);
  assert.match(m[0], /uAkisPayi/, 'debi kapısı payı buradan sürülür');
  assert.match(m[0], /uIsikOlcek/, 'menzil-üstü doğal ton payı buradan sürülür');
});

test('ayak izi kütleyle büzülür: glow ölçeği TABAN boydan, göl setOlcek ile', () => {
  const m = kaynak.match(/isikTazele\(\)\s*\{[\s\S]*?\n  \}/)[0];
  assert.match(m, /nozulGlow\.scale\.setScalar\(this\.nozulGlowBoy/,
    'ölçek her seferinde taban boydan hesaplanmalı (sürüklenme olmaz)');
  assert.match(m, /g\.setOlcek\(/, 'ışık gölü yarıçapı da kütleyi takip eder');
  assert.match(kaynak, /this\.nozulGlowBoy\s*=/, 'taban boy saklanır');
});

test('debi kapısı: renderVertex başında, STABİL per-parçacık hash (aRef), zaman DEĞİL', () => {
  const gate = kaynak.match(/if \(fract\(sin\(dot\(aRef[\s\S]{0,220}?\}/);
  assert.ok(gate, 'debi kapısı renderVertex içinde olmalı');
  assert.match(gate[0], /> uAkisPayi/);
  assert.match(gate[0], /gl_PointSize = 0\.0/);
  assert.doesNotMatch(gate[0], /uTime|vAge/, 'kapı zamana bağlanamaz — kaynama olur');
});

test('debi payı POMPA hızından beslenir (switch aniKesme su sözleşmesi bozulmaz)', () => {
  const m = kaynak.match(/isikTazele\(\)\s*\{[\s\S]*?\n  \}/)[0];
  const satir = m.match(/uAkisPayi\.value\s*=.*/)[0];
  assert.match(satir, /hizPayi/, 'master değil hız payı');
  assert.match(satir, /0\.12/, 'kısık pompada görünür sızıntı tabanı');
});

test('dip kenarı ORANSAL: sabit 0.15 m menzilin üstüne çıkamaz (GLSL tanımsızlığı)', () => {
  assert.match(kaynak, /smoothstep\(uIsikMenzil \* 0\.09, uIsikMenzil, mesafe\)/);
  assert.doesNotMatch(kaynak, /smoothstep\(0\.15, uIsikMenzil/, 'sabit kenar kalmamalı');
});

test('menzil üstü doğal ton kütleyle kararır (parlak pastel plaka kalmaz)', () => {
  assert.match(kaynak, /disTon\s*=\s*vec3\(0\.72, 0\.78, 0\.85\)\s*\*\s*mix\([^)]*uIsikOlcek\)/);
});

test('setHiz ve rampa adımı ışığı tazeler', () => {
  assert.match(kaynak, /setHiz\(k\)\s*\{[\s\S]*?isikTazele/);
  assert.match(kaynak, /hizRampaSn > 0\)\s*\{[\s\S]*?isikTazele[\s\S]*?\n    \}/);
});

test('eski glowTazele gövdesi kalmadı (çift kaynak yok)', () => {
  assert.doesNotMatch(kaynak, /glowTazele\(\)\s*\{\s*if \(this\.nozulGlow\)/);
});

test('teşhis kancası hiz= HASH KAPILI ve sim= ön-adımlamasından ÖNCE koşar', () => {
  const ana = readFileSync(new URL('../studio/js/ana.js', import.meta.url), 'utf8');
  const kanca = ana.indexOf("location.hash.match(/hiz=");
  const simOn = ana.indexOf("location.hash.match(/sim=");
  assert.ok(kanca > 0, 'hiz= kancası olmalı');
  assert.ok(kanca < simOn, 'kanca sim= ön-adımlamasından önce olmalı (kare kilitli hızda çekilsin)');
  const govde = ana.slice(kanca, kanca + 420);
  assert.match(govde, /if \(ehiz\)/, 'hash yoksa tek satır bile çalışmamalı');
  assert.match(govde, /endsWith\('\.hiz'\)/);
});

test('IsikGolu.setOlcek mesh ölçeğini sürer (falloff yerel koordinatta bozulmaz)', () => {
  const m = zemin.match(/setOlcek\(k\)\s*\{[^}]*\}/);
  assert.ok(m, 'IsikGolu.setOlcek tanımlı olmalı');
  assert.match(m[0], /this\.mesh\.scale\.set\(/);
  assert.doesNotMatch(m[0], /uYariCap/, 'uYariCap DEĞİŞMEZ — desen büzülür, kenar korunur');
});
