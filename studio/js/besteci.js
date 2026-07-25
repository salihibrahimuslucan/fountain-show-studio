// besteci.js — müzik → koreografi (plan Task 13, TDD: test/besteci.test.mjs).
// Kaynak: ders/10-video/index.html BLOK 12 (commit 312dcc5 satır referansları).
// SAF modül: three/DOM/AudioContext yok — node --test doğrudan koşar; tarayıcıda
// ana.js sentetikPCM çıktısını AudioBuffer'a sarar.

// --- FFT: radix-2, yerinde, elle (spec T-D — vendor-yerel/CDN-yok, AGPL yasak) ---
// re/im uzunluğu 2'nin kuvveti olmalı; gerçek giriş için im sıfırlanarak çağrılır.
function fftYerinde(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {                 // bit-tersleme permütasyonu
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i]; re[i] = re[j]; re[j] = tr;
      const ti = im[i]; im[i] = im[j]; im[j] = ti;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {             // kelebek aşamaları
    const ang = -2 * Math.PI / len;
    const wr = Math.cos(ang), wi = Math.sin(ang);
    const yarim = len >> 1;
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let j = 0; j < yarim; j++) {
        const a = i + j, b = a + yarim;
        const vr = re[b] * cr - im[b] * ci;
        const vi = re[b] * ci + im[b] * cr;
        re[b] = re[a] - vr; im[b] = im[a] - vi;
        re[a] += vr; im[a] += vi;
        const ncr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = ncr;
      }
    }
  }
}

const FFT_N = 1024, FFT_HOP = 512;                     // çerçeve 1024, hop 512 (spec T-D)
const HANN = (() => {
  const w = new Float32Array(FFT_N);
  for (let i = 0; i < FFT_N; i++) w[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (FFT_N - 1));
  return w;
})();

// --- v7 GERÇEK MÜZİK yardımcıları -------------------------------------------
// Sorun (Salih tarayıcı ölçümü, Veridis Quo + TERRITORY): tüm eşikler MUTLAK
// değerdi ve sentetik parçaya kalibreliydi. Gerçek şarkının tepe-normalize
// zarfı 0.1-0.6 bandında yaşadığı için drop eşiği (0.72) hiç tetiklenmedi,
// bölüm sınıflandırması (0.35/0.68) tüm parçayı tek sınıfa attı. Çözüm: her
// eşik parçanın KENDİ dağılımına göre (yüzdelik) ölçeklensin.

// p ∈ [0,1] yüzdeliği (lineer ara-değerli, diziyi bozmaz)
export function yuzdelik(d, p) {
  const n = d.length;
  if (!n) return 0;
  const s = Array.prototype.slice.call(d).sort((a, b) => a - b);
  const x = p * (n - 1), i = Math.floor(x), f = x - i;
  return i + 1 < n ? s[i] * (1 - f) + s[i + 1] * f : s[i];
}
// [p5..p98] aralığını 0..1'e esnet (kırparak) — tek transient maksimumu tüm
// bandı ezmesin; sessiz yer gerçekten 0'a insin, doruk gerçekten 1'e çıksın.
function esnetNormalize(d, pLo = 0.05, pHi = 0.98) {
  const lo = yuzdelik(d, pLo), hi = yuzdelik(d, pHi);
  const a = Math.max(1e-9, hi - lo);
  for (let i = 0; i < d.length; i++) d[i] = Math.min(1, Math.max(0, (d[i] - lo) / a));
}
// zarfın sağlam (robust) 0..1 ölçeği: eşikleri bunun üzerinde kur.
function sagalamOlcek(d) {
  const lo = yuzdelik(d, 0.10), hi = yuzdelik(d, 0.95);
  const a = Math.max(1e-9, hi - lo);
  return (v) => Math.min(1, Math.max(0, (v - lo) / a));
}

// mono PCM → çerçeve başına: spektral akı, bas/orta/tiz enerjisi, spektral merkez.
function spektralAnaliz(mono, sr) {
  const F = Math.max(1, Math.floor((mono.length - FFT_N) / FFT_HOP) + 1);
  const hopDt = FFT_HOP / sr;
  const akis = new Float32Array(F);        // tam spektrum akı → BPM otokorelasyonu
  const akisDusuk = new Float32Array(F);   // <2kHz akı → beat seçimi (hi-hat/gürültü
  // patlamaları tiz bantta sahte onset üretir; kick/bas vuruşu su şovunun beat'idir)
  const bas = new Float32Array(F), orta = new Float32Array(F), tiz = new Float32Array(F);
  const merkez = new Float32Array(F);
  const kBas = Math.max(1, Math.floor(150 * FFT_N / sr));    // <150 Hz sınır bin'i
  const kOrta = Math.floor(2000 * FFT_N / sr);               // 150-2000 Hz sınır bin'i
  const yarim = FFT_N / 2;
  const re = new Float64Array(FFT_N), im = new Float64Array(FFT_N);
  const mag = new Float64Array(yarim + 1);
  const onceki = new Float64Array(yarim + 1);
  for (let f = 0; f < F; f++) {
    const b = f * FFT_HOP;
    for (let i = 0; i < FFT_N; i++) { re[i] = (mono[b + i] || 0) * HANN[i]; im[i] = 0; }
    fftYerinde(re, im);
    let mT = 0, mAgirlikli = 0;
    for (let k = 0; k <= yarim; k++) {
      mag[k] = Math.hypot(re[k], im[k]);
      if (k >= 1) { mT += mag[k]; mAgirlikli += k * mag[k]; }
    }
    let fx = 0, fxD = 0, eB = 0, eO = 0, eT = 0;
    for (let k = 1; k <= yarim; k++) {
      const d = mag[k] - onceki[k];
      if (d > 0) { fx += d; if (k <= kOrta) fxD += d; }
      if (k <= kBas) eB += mag[k] * mag[k];
      else if (k <= kOrta) eO += mag[k] * mag[k];
      else eT += mag[k] * mag[k];
    }
    akis[f] = f === 0 ? 0 : fx;                        // ilk çerçevede fark yok
    akisDusuk[f] = f === 0 ? 0 : fxD;
    bas[f] = Math.sqrt(eB); orta[f] = Math.sqrt(eO); tiz[f] = Math.sqrt(eT);
    merkez[f] = mT > 1e-9 ? (mAgirlikli / mT) * (sr / FFT_N) : 0;
    onceki.set(mag);
  }
  // normalize: akı tepe-normalize (onset eşiği bu ölçekte kalibreli), bantlar
  // YÜZDELİK-normalize (gerçek müzikte tek bir transient maksimumu belirleyip
  // tüm bandı 0.1-0.3 aralığına sıkıştırıyordu → şov düz/cansız görünüyordu).
  const normalize = (d) => { let m = 1e-9; for (const v of d) if (v > m) m = v; for (let i = 0; i < d.length; i++) d[i] /= m; };
  normalize(akis); normalize(akisDusuk);
  for (const d of [bas, orta, tiz]) esnetNormalize(d);
  // bantları hafif yumuşat (~3 çerçeve) — timeline zarfı olarak titremesin
  for (const d of [bas, orta, tiz]) {
    let onc = d[0];
    for (let i = 1; i < F - 1; i++) { const y = (onc + d[i] + d[i + 1]) / 3; onc = d[i]; d[i] = y; }
  }
  return { akis, akisDusuk, bas, orta, tiz, merkez, hopDt, F };
}

// spektral akı → adaptif eşikle tepe seçimi = onset/beat zamanları
function akiOnsetleri(akis, hopDt) {
  const F = akis.length;
  const beatler = [];
  const w2 = Math.max(1, Math.round(0.22 / hopDt));
  let sonBeat = -1;
  for (let i = 1; i < F - 1; i++) {
    let m = 0, c = 0;
    for (let j = Math.max(0, i - w2); j <= Math.min(F - 1, i + w2); j++) { m += akis[j]; c++; }
    m /= c;
    if (akis[i] > m * 1.4 && akis[i] >= akis[i - 1] && akis[i] > akis[i + 1] && akis[i] > 0.05) {
      const t = i * hopDt;
      if (sonBeat < 0 || t - sonBeat > 0.14) { beatler.push(t); sonBeat = t; }
    }
  }
  return beatler;
}

// onset zarfının otokorelasyonu → tempo (60-180 BPM) + faz → beat ızgarası
//
// v7 OKTAV DÜZELTMESİ (TERRITORY 120 BPM parçada 59.8 ölçüldü): eski kural
// "tepenin %85'ine ulaşan EN KÜÇÜK gecikme" gerçek müzikte yarım tempoya
// kilitleniyordu — backbeat (2 ve 4) kick'ten güçlü olduğunda otokorelasyonun
// GLOBAL tepesi 2L'de oluşur ve %85 taraması onu ilk aday olarak yakalar.
// Yeni yöntem: her aday periyot için HARMONİK TARAK skoru (L, 2L, 3L, 4L
// gecikmelerinin ağırlıklı toplamı). Yarım tempo adayının tarağı gerçek
// beat gecikmesi L'yi ISKALAR; çift tempo adayının tarağı L/2, 3L/2 çukurlarına
// düşer. Üstüne 120 BPM merkezli log-normal önsel (Parncutt tercih eğrisi).
const BPM_ALT = 60, BPM_UST = 180;
// BPM'i [60,180) oktavına indirger (59.8 → 119.6, 200 → 100)
export function bpmOktav(bpm) {
  if (!(bpm > 0) || !isFinite(bpm)) return 120;
  while (bpm < BPM_ALT) bpm *= 2;
  while (bpm >= BPM_UST) bpm /= 2;
  return bpm;
}
// Aday periyot için EN İYİ FAZ + oturma skoru (ham onset'lere karşı).
//  kapsam  = ızgara noktalarının kaçında gerçekten onset var
//  aciklar = onset'lerin kaçı ızgaraya düşüyor
// YARIM tempoda kapsam yüksek ama aciklar ~0.5 (onset'lerin yarısı ızgara dışı);
// ÇİFT tempoda aciklar yüksek ama kapsam ~0.5 (ızgaranın yarısı boş).
// Çarpım yalnız GERÇEK tempoda tepe yapar — oktav belirsizliğinin asıl çözücüsü.
function izgaraOturma(P, onsetler, sure) {
  if (!onsetler.length || !(P > 0)) return { skor: 0, faz: 0 };
  const tol = Math.min(0.07, P * 0.15);
  let enIyi = { skor: -1, faz: 0 };
  const ADIM = 24;
  for (let q = 0; q < ADIM; q++) {
    const faz = q * P / ADIM;
    let kapsamN = 0, izgaraN = 0, j = 0;
    const isaretli = new Uint8Array(onsetler.length);
    for (let t = faz; t <= sure; t += P) {
      izgaraN++;
      while (j < onsetler.length && onsetler[j] < t - tol) j++;
      let bulundu = false;
      for (let m = j; m < onsetler.length && onsetler[m] <= t + tol; m++) { isaretli[m] = 1; bulundu = true; }
      if (bulundu) kapsamN++;
    }
    if (!izgaraN) continue;
    let ac = 0; for (const v of isaretli) ac += v;
    const skor = (kapsamN / izgaraN) * (ac / onsetler.length);
    if (skor > enIyi.skor) enIyi = { skor, faz };
  }
  return enIyi;
}
function bpmIzgara(akis, hopDt, sure, onsetler = []) {
  const F = akis.length;
  // otokorelasyonu geniş tut (40-300 BPM): tarak üst harmonikleri okuyabilsin
  const Lmin = Math.max(1, Math.round(60 / 300 / hopDt));
  const Lmax = Math.min(F - 2, Math.round(60 / 40 / hopDt));
  if (Lmax <= Lmin) return { bpm: 120, beatIzgara: [] };  // parça çok kısa
  const r = new Float64Array(Lmax + 1);
  for (let L = Lmin; L <= Lmax; L++) {
    let s = 0;
    for (let i = 0; i + L < F; i++) s += akis[i] * akis[i + L];
    r[L] = s / (F - L);
  }
  const rAt = (L) => (L >= Lmin && L <= Lmax) ? r[L] : 0;
  // aday tempolar yalnız [60,180) oktavında aranır — sonuç zaten normalize doğar
  const aLmin = Math.max(Lmin, Math.round(60 / BPM_UST / hopDt));
  const aLmax = Math.min(Lmax, Math.round(60 / BPM_ALT / hopDt));
  const TARAK = [1, 0.55, 0.35, 0.25];                 // L, 2L, 3L, 4L ağırlıkları
  let enIyiL = aLmin, enIyiSkor = -Infinity;
  for (let L = aLmin; L <= aLmax; L++) {
    let s = 0;
    for (let h = 0; h < TARAK.length; h++) {
      const Lh = Math.round(L * (h + 1));
      // komşu bin'e serpilen tepeyi kaçırmamak için 3'lü pencere maksimumu
      s += TARAK[h] * Math.max(rAt(Lh - 1), rAt(Lh), rAt(Lh + 1));
    }
    const bpmA = 60 / (L * hopDt);
    const onsel = Math.exp(-0.5 * Math.pow(Math.log(bpmA / 120) / 0.9, 2));  // ~120 tercihi
    const skor = s * (0.75 + 0.25 * onsel);
    if (skor > enIyiSkor) { enIyiSkor = skor; enIyiL = L; }
  }
  let periyot = enIyiL * hopDt;
  // --- OKTAV HAKEMİ: tarak skoru yarım tempoyu hâlâ seçebilir (backbeat 2/4
  // kick'ten güçlüyse otokorelasyonun HER harmoniği 2L'de güçlüdür). Karar
  // ham onset'lere bakarak verilir: T/2, T, 2T adaylarından ızgaraya OTURMA
  // skoru (kapsam × açıklama) en yüksek olan kazanır.
  let faz = 0;
  if (onsetler.length >= 8) {
    const adaylar = [periyot / 2, periyot, periyot * 2]
      .map(p => ({ p, bpm: 60 / p }))
      .filter(c => c.bpm >= BPM_ALT && c.bpm < BPM_UST);
    let enIyi = null;
    for (const c of adaylar) {
      const o = izgaraOturma(c.p, onsetler, sure);
      // eşitlikte HIZLI adayı tercih et (yarım tempoya kayma daha zararlı)
      if (!enIyi || o.skor > enIyi.skor * 1.04) enIyi = { ...o, p: c.p };
    }
    if (enIyi && enIyi.skor > 0) { periyot = enIyi.p; faz = enIyi.faz; }
  }
  const bpm = bpmOktav(60 / periyot);
  if (!faz) {   // onset yoksa: akıyı ızgara üzerinde maksimize eden ofset (v2 yolu)
    const L = Math.max(1, Math.round(periyot / hopDt));
    let enIyiOff = 0, enIyiS = -1;
    for (let off = 0; off < L; off++) {
      let s = 0, c = 0;
      for (let i = off; i < F; i += L) { s += akis[i]; c++; }
      s /= Math.max(1, c);
      if (s > enIyiS) { enIyiS = s; enIyiOff = off; }
    }
    faz = enIyiOff * hopDt;
  }
  const beatIzgara = [];
  for (let t = faz; t <= sure; t += periyot) beatIzgara.push(+t.toFixed(4));
  return { bpm, beatIzgara };
}

// --- v7.1 KABA SERİ: zarfı sabit adımlı (varsayılan 0.5 sn) diziye indirger.
// Drop/bölüm kararları 23 ms'lik çerçevede değil, MÜZİKAL ölçekte verilmeli.
const KABA_ADIM = 0.5;
function kabaSeri(zarf, dt, adim = KABA_ADIM) {
  const n = Math.max(1, Math.floor(zarf.length * dt / adim));
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const a = Math.floor(i * adim / dt), b = Math.min(zarf.length, Math.floor((i + 1) * adim / dt));
    let s = 0, c = 0;
    for (let j = a; j < b; j++) { s += zarf[j]; c++; }
    out[i] = c ? s / c : (out[i - 1] || 0);
  }
  return out;
}
// dizi ortalaması [a,b) — sınır dışı kırpılır, boşsa 0
function pencOrt(d, a, b) {
  a = Math.max(0, a); b = Math.min(d.length, b);
  let s = 0, c = 0;
  for (let i = a; i < b; i++) { s += d[i]; c++; }
  return c ? s / c : 0;
}

// --- v7.1 DROP: "eşik geçişi" DEĞİL, "belirgin enerji SIÇRAMASI" -------------
// v7 hatası (Salih tarayıcı ölçümü): arm/fire eşik çifti (0.30/0.68) gerçek
// müzikte sürekli tetikleniyordu — Veridis Quo'da 57 drop / 345 sn (her 6 sn'de
// bir renk patlaması, koreografi olarak anlamsız). Sebep: eşikler p10..p95'e
// ölçeklenince DÜZ bir parça bile 0.30-0.68 bandında salınıyor.
// Yeni kriter (dördü BİRDEN):
//   1. YÜKSELİŞ: sonraki 2.5 sn ortalaması − önceki 6 sn ortalaması (1 sn boşlukla)
//   2. BELİRGİNLİK: bu yükseliş ±7.5 sn içindeki tepe olmalı
//   3. MUTLAK ALT SINIR: sıçrama HAM (tepe-normalize) zarfta ≥ 0.10 — yüzdelik
//      esnetmesinin düz parçayı dinamik göstermesine karşı bağışıklık
//   4. MESAFE + KOTA: droplar arası ≥ 15 sn, toplam ≤ süre/50 (maks 8)
// Hiçbir aday mutlak sınırı geçmezse (gerçekten düz parça) yalnız EN GÜÇLÜ 2
// aday alınır — şov ünlemsiz kalmasın ama drop enflasyonu da olmasın.
const DROP_MIN_ARA = 15, DROP_MUTLAK_YUK = 0.10, DROP_NORM_YUK = 0.15;
export function droplariBul(zarf, dt, sure) {
  const ham = kabaSeri(zarf, dt);
  const n = ham.length;
  if (n < 8) return [];
  const sev = sagalamOlcek(ham);
  const nrm = Float64Array.from(ham, sev);
  const ONCE = Math.max(2, Math.round(6 / KABA_ADIM));
  const BOSLUK = Math.max(1, Math.round(1 / KABA_ADIM));
  const SONRA = Math.max(2, Math.round(2.5 / KABA_ADIM));
  const BELIRGIN = Math.max(2, Math.round(7.5 / KABA_ADIM));
  const N_UST = Math.min(8, Math.max(1, Math.round(sure / 50)));
  const yuk = new Float64Array(n), yukHam = new Float64Array(n), sonraN = new Float64Array(n);
  for (let i = 0; i < n; i++) {                          // 1. yükseliş eğrisi
    sonraN[i] = pencOrt(nrm, i, i + SONRA);
    yuk[i] = sonraN[i] - pencOrt(nrm, i - BOSLUK - ONCE, i - BOSLUK);
    yukHam[i] = pencOrt(ham, i, i + SONRA) - pencOrt(ham, i - BOSLUK - ONCE, i - BOSLUK);
  }
  const adaylar = [], gevsek = [];
  for (let i = 1; i < n - 1; i++) {
    const t = i * KABA_ADIM;
    if (t < 5 || t > sure - 3 || yuk[i] <= 0) continue;
    let tepe = true;                                    // 2. belirginlik
    for (let j = Math.max(0, i - BELIRGIN); j <= Math.min(n - 1, i + BELIRGIN); j++)
      if (j !== i && yuk[j] > yuk[i]) { tepe = false; break; }
    if (!tepe) continue;
    const c = { t, g: yuk[i], ham: yukHam[i] };
    gevsek.push(c);
    if (sonraN[i] >= 0.5) adaylar.push(c);              // sıçramanın VARDIĞI yer de yüksek
  }
  let havuz = adaylar.filter(c => c.ham >= DROP_MUTLAK_YUK && c.g >= DROP_NORM_YUK);
  if (!havuz.length) havuz = (adaylar.length ? adaylar : gevsek)
    .slice().sort((a, b) => b.g - a.g).slice(0, 2);     // düz parça: en güçlü 2
  havuz = havuz.slice().sort((a, b) => b.g - a.g);
  const enG = havuz.length ? havuz[0].g : 0;
  const sec = [];
  for (const c of havuz) {
    if (sec.length >= N_UST) break;
    if (c.g < enG * 0.45) break;                        // zayıf kuyruğu kes
    if (sec.some(t => Math.abs(t - c.t) < DROP_MIN_ARA)) continue;
    sec.push(c.t);
  }
  return sec.sort((a, b) => a - b).map(t => +t.toFixed(3));
}

// --- v7.1 BÖLÜM: sınıf eşiği DEĞİL, YENİLİK (novelty) sınırı ----------------
// v7 hatası: 3 sınıflı eşikleme + "kısa segmenti öncekine yut" zinciri her iki
// gerçek şarkıda da 2 bölüm üretiyordu (["giris","verse"]) — 5.5 dakikanın 5
// dakikası tek blok. Üstelik drop tespitiyle hiç konuşmuyordu.
// Yeni yöntem: 0.5 sn'lik seride yenilik eğrisi |sonraki pencere − önceki
// pencere|; tepeleri bölüm sınırı adayı. DROP ZAMANLARI ZORUNLU SINIR (tespit
// ile bölüm artık aynı şeyi söyler); kalan kota en güçlü yenilik tepelerinden
// doldurulur. Hedef sınır sayısı ≈ süre/45 → 5 dakikalık parçada ~8-9 bölüm.
function bolumleriBul(zarf, dt, sure, droplar = []) {
  const ham = kabaSeri(zarf, dt);
  const n = ham.length;
  if (n < 6) return [{ t0: 0, t1: +sure.toFixed(3), tip: 'giris' }];
  const sev = sagalamOlcek(ham);
  const nrm = Float64Array.from(ham, sev);
  const K = Math.max(2, Math.round(Math.min(8, Math.max(2, sure / 25)) / KABA_ADIM));
  const yenilik = new Float64Array(n);
  for (let i = 0; i < n; i++) yenilik[i] = Math.abs(pencOrt(nrm, i, i + K) - pencOrt(nrm, i - K, i));
  const minAra = Math.min(DROP_MIN_ARA, Math.max(3, sure / 14));
  const hedef = Math.min(9, Math.max(3, Math.round(sure / 40)));
  const sinirlar = [];
  // drop = KOŞULSUZ sınır (drop tespiti ile bölüm tespiti aynı şeyi söylemeli);
  // droplar zaten ≥15 sn aralıklı olduğu için mikro-bölüm riski yok.
  for (const t of droplar) if (t > 0.5 && t < sure - 1) sinirlar.push({ t, drop: true });
  const uygun = (t) => t > minAra * 0.5 && t < sure - minAra * 0.5
    && !sinirlar.some(s => Math.abs(s.t - t) < minAra);
  const tepeler = [];
  for (let i = 1; i < n - 1; i++) {
    const w = Math.max(1, Math.round(minAra / KABA_ADIM));
    let tepe = true;
    for (let j = Math.max(0, i - w); j <= Math.min(n - 1, i + w); j++)
      if (j !== i && yenilik[j] > yenilik[i]) { tepe = false; break; }
    if (tepe) tepeler.push({ t: i * KABA_ADIM, g: yenilik[i] });
  }
  tepeler.sort((a, b) => b.g - a.g);
  for (const c of tepeler) {
    if (sinirlar.length >= hedef) break;
    if (uygun(c.t)) sinirlar.push({ t: c.t, drop: false });
  }
  sinirlar.sort((a, b) => a.t - b.t);
  // sınırlar → segmentler
  const segs = [];
  let t0 = 0, dropBasi = false;
  for (const s of sinirlar) { segs.push({ t0, t1: s.t, drop: dropBasi }); t0 = s.t; dropBasi = s.drop; }
  segs.push({ t0, t1: sure, drop: dropBasi });
  // sınıflandırma: bölüm ORTALAMALARI arasındaki sıralamaya göre (parça-içi göreli)
  const ortS = segs.map(s => pencOrt(nrm, Math.round(s.t0 / KABA_ADIM), Math.round(s.t1 / KABA_ADIM)));
  const hi = Math.max(yuzdelik(ortS, 0.78), 0.55);
  const out = segs.map((s, i) => {
    let tip;
    if (i === 0) tip = 'giris';
    else if (s.drop || ortS[i] >= hi) tip = 'drop';
    else if (segs[i + 1] && (segs[i + 1].drop || ortS[i + 1] >= hi)) tip = 'build';
    else if (i === segs.length - 1) tip = 'final';
    else tip = 'verse';
    return { t0: +s.t0.toFixed(3), t1: +Math.min(s.t1, sure).toFixed(3), tip };
  });
  // v7 GİRİŞ TAVANI: giriş tanımı gereği KISADIR. Gerçek şarkıda ilk düşük-enerji
  // bölüm 103 sn sürebiliyordu (345 sn'lik şovun %30'u) ve 'giris' kapılı roller
  // (AquaSWITCH, perde) o boyunca tamamen susuyordu. Tavanı aşan kısım 'verse'e
  // devredilir — sahne erken canlanır, giriş yine de imzasını korur.
  if (out.length && out[0].tip === 'giris') {
    const tavan = Math.min(30, sure * 0.12);
    // v7.1: artık bölüm sınırları yenilikten geliyor; giriş zaten kısaysa
    // bölme 4 sn'lik sliver üretiyordu — kalan parça anlamlıysa böl.
    if (out[0].t1 - out[0].t0 > tavan + 10) {
      const kes = +(out[0].t0 + tavan).toFixed(3);
      out.splice(1, 0, { t0: kes, t1: out[0].t1, tip: 'verse' });
      out[0] = { ...out[0], t1: kes };
    }
  }
  return out;
}

// --- ANALİZ: PCM → enerji zarfı + beat (onset) + drop (ders 794-839 tabanı) ---
// v2 (spec T-D): beat tespiti FFT tabanlı spektral akıya taşındı; RMS zarfı
// drop/bölüm/seviye için sürer. buf: AudioBuffer YA DA {sampleRate, duration,
// numberOfChannels, getChannelData} biçimli nesne (test fake'i bu arayüzü kullanır).
export function analizEt(buf) {
  const sr = buf.sampleRate;
  const ch0 = buf.getChannelData(0);
  const ch1 = buf.numberOfChannels > 1 ? buf.getChannelData(1) : null;
  const N = ch0.length;
  const mono = ch1 ? new Float32Array(N) : ch0;        // tek kanalda kopyasız
  if (ch1) for (let i = 0; i < N; i++) mono[i] = 0.5 * (ch0[i] + ch1[i]);
  const hop = 1024;                       // ~23ms çerçeve @44.1k (RMS zarfı için)
  const dt = hop / sr;
  // ⚠F EN AZ 1: 1024 örnekten (~23 ms) kısa dosyada F=0 çıkıyor, zarf boş kalıyor
  // ve zAt() undefined okuyup TÜM anahtarları NaN yapıyordu (setMaster(NaN) →
  // cihazlar sessizce ölür). Kök neden sessizlik değil, F=0. Denetim 2026-07-18.
  const F = Math.max(1, Math.floor(N / hop));
  // çerçeve enerjisi (RMS)
  const enerji = new Float32Array(F);
  for (let f = 0; f < F; f++) {
    let s = 0; const b = f * hop;
    for (let i = 0; i < hop; i++) { const x = mono[b + i]; s += x * x; }
    enerji[f] = Math.sqrt(s / hop);
  }
  let emax = 1e-6; for (const e of enerji) if (e > emax) emax = e;
  for (let i = 0; i < F; i++) enerji[i] /= emax;   // 0..1 normalize
  // yumuşatılmış zarf (hareketli ortalama ~0.18s) → seviye/master için
  const zarf = new Float32Array(F);
  const win = Math.max(1, Math.round(0.18 / dt));
  let acc = 0;
  for (let i = 0; i < F; i++) { acc += enerji[i]; if (i >= win) acc -= enerji[i - win]; zarf[i] = acc / Math.min(i + 1, win); }
  // spektral analiz (FFT): akı → beat; bantlar → jet/ışık zarfları; merkez → bölüm
  const sp = spektralAnaliz(mono, sr);
  const onsetler = akiOnsetleri(sp.akisDusuk, sp.hopDt);      // v7: HAM onset'ler
  const { bpm, beatIzgara } = bpmIzgara(sp.akis, sp.hopDt, buf.duration, onsetler);
  // v7 BEAT IZGARASI: `beatler` artık ham onset listesi DEĞİL. Gerçek şarkıda
  // ham onset'ler 6 sn boşluk / 0.18 sn çift vuruş üretiyordu (Veridis Quo) ve
  // BPM'in ima ettiği aralıkla 4× uyuşmuyordu (TERRITORY). Beat = tempo
  // ızgarası; en yakın ham onset ±%18 periyot içindeyse ona hafif çekilir
  // (müzikal çapa) — aralıklar yine düzenli kalır. Ham liste `onsetler`de.
  const beatler = izgarayaOturt(beatIzgara, onsetler, bpm);
  // v7.1 DROP: eşik geçişi değil belirgin sıçrama (droplariBul üstündeki nota bak).
  const sevZ = sagalamOlcek(zarf);
  const droplar = droplariBul(zarf, dt, buf.duration);
  // v7.1: bölümler drop'ları ZORUNLU sınır olarak alır — iki tespit aynı şeyi söyler.
  const bolumler = bolumleriBul(zarf, dt, buf.duration, droplar);
  // v7 DİNAMİK ARALIK: master/parlaklık kanalları ham `zarf`ı kullanınca gerçek
  // müzikte 0.25-0.65 gibi sıkışık bir bantta kalıyordu (şov düz görünüyor).
  // `zarfN` = yüzdelik-esnetilmiş zarf; timelineUret bunu kullanır.
  const zarfN = new Float32Array(F);
  for (let i = 0; i < F; i++) zarfN[i] = sevZ(zarf[i]);
  return {
    sure: buf.duration, dt, enerji, zarf, beatler, droplar,   // v1 alanları (geriye uyumlu)
    onsetler,                                                 // v7: ham spektral akı onset'leri
    zarfN,                                                    // v7: sağlam 0..1 zarf
    bpm, beatIzgara,                                          // v2: tempo ızgarası
    bantlar: { bas: sp.bas, orta: sp.orta, tiz: sp.tiz },     // v2: bant zarfları (0..1)
    bantHop: sp.hopDt,                                        // v2: bant çerçeve aralığı (s)
    bolumler,                                                 // v2: [{t0,t1,tip}]
  };
}

// beat ızgarası + ham onset'ler → müzikal çapalı DÜZENLİ beat listesi.
// Her ızgara noktası en yakın onset'e ±%18 periyot içindeyse %50 yolu çekilir;
// böylece aralık asla periyodun %82-%118'i dışına çıkmaz (ham onset'in 6 sn
// boşluk / 0.18 sn çift vuruş patolojisi imkansızlaşır).
function izgarayaOturt(izgara, onsetler, bpm) {
  if (!izgara || !izgara.length) return onsetler.slice();
  const periyot = 60 / (bpm || 120), tol = periyot * 0.18;
  const out = []; let j = 0;
  for (const t of izgara) {
    while (j + 1 < onsetler.length && Math.abs(onsetler[j + 1] - t) <= Math.abs(onsetler[j] - t)) j++;
    const yakin = onsetler.length ? onsetler[j] : null;
    const t2 = (yakin !== null && Math.abs(yakin - t) <= tol) ? t + 0.5 * (yakin - t) : t;
    out.push(+t2.toFixed(3));
  }
  return out;
}

// zamanları kesin ARTAN yap (eşit/çakışan zaman ornekle'yi bozar) — ders 842-847
export function artan(arr) {
  arr.sort((p, q) => p[0] - q[0]);
  const out = []; let son = -1;
  for (let [t, v] of arr) { if (t <= son) t = son + 0.001; out.push([+t.toFixed(3), +v.toFixed(3)]); son = t; }
  return out;
}

// --- SENTETİK ÜRETEÇ (ders 901-924 tabanı, AudioContext'siz) ---
// {veri: Float32Array, sr} döner; tarayıcı tarafı AudioBuffer'a sarar.
//
// KALİBRASYON (T12 devir notu — ders sentetiğinde drop tespiti 0 dönüyordu):
// analizEt DEĞİŞMEDİ (0.72 drop eşiği dahil); sinyal gerçekçileştirildi:
//  1. bed: lv²'yle büyüyen sürekli bas — ders sentetiği yalnız kick darbeleriydi,
//     kare-RMS normalizasyonunda emax'ı kick transientleri belirleyince drop
//     platosunun zarfı ~0.17'de kalıyordu (gerçek mikste drop = yoğun sürekli
//     enerji). Bas frekansı 2·(44100/1024)=86.133 Hz = analiz çerçevesi başına
//     TAM 2 periyot: kare RMS'i titremez → build rampasında sahte onset üretmez
//     (hizasız sinüs/gürültü denendi: flux jitter'ı beat sayısını 37-48'e şişirdi).
//  2. tanh(2.2·x) yumuşak sınırlayıcı — mastering kompresyonu modeli; kick
//     tepelerini kırparak sürekli/tepe oranını gerçekçi yapar (drop zarfı ~0.9).
//  3. hat 0.35→0.10 + tohumlu LCG (Math.random değil) — test fikstürü
//     DETERMİNİSTİK olmalı; yüksek hat sahte onset katıyordu.
// Sonuç (16s/120bpm): beat=31 (test bandı 25-40), drop=[8.06] (bant 6-11).
// v3 F5: stil parametresi — 'enerjik' (varsayılan, eski davranış birebir),
// 'ambient' (yavaş dalga, yumuşak vuruş), 'mars' (güçlü vuruş + kontra darbe).
// Örnek müzikler telifsiz: hepsi buradan sentezlenir (spec cihaz-gerçekçiliği §6).
export function sentetikPCM(saniye = 16, bpm = 120, stil = 'enerjik') {
  const sr = 44100, Nn = Math.floor(saniye * sr);
  const veri = new Float32Array(Nn);
  if (stil === 'ambient') bpm = Math.min(bpm, 76);
  if (stil === 'mars') bpm = 104;
  const beatAralik = 60 / bpm;
  let tohum = 1;                                   // deterministik gürültü (LCG)
  const rasgele = () => { tohum = (tohum * 1103515245 + 12345) & 0x7fffffff; return tohum / 0x40000000 - 1; };
  const seviye = (t) => {
    if (stil === 'ambient') return 0.35 + 0.25 * Math.sin(2 * Math.PI * t / saniye - Math.PI / 2); // tek yavaş dalga
    if (t < 4) return 0.22;                       // giriş
    if (t < 8) return 0.22 + (t - 4) / 4 * 0.6;   // build
    if (t < 14) return 0.92;                      // drop + sürdür
    return Math.max(0, 0.92 - (t - 14) / 2 * 0.92); // outro
  };
  const basF = 2 * (sr / 1024);                    // 86.133 Hz — çerçeve-hizalı (üstteki not 1)
  for (let i = 0; i < Nn; i++) {
    const t = i / sr;
    const lv = seviye(t);
    const ph = t % beatAralik;
    let kick = 0;
    const kickAmp = stil === 'ambient' ? 0.35 : stil === 'mars' ? 1.15 : 0.95;
    if (ph < 0.12) { const env = Math.exp(-ph * 42); kick = Math.sin(2 * Math.PI * 58 * ph) * env * (kickAmp / 0.95); }
    let hat = 0;
    if (stil === 'mars') {                         // kontra darbe: her beat ortası trampet-vari gürültü
      const hp = (t + beatAralik / 2) % beatAralik;
      if (hp < 0.05) hat = rasgele() * Math.exp(-hp * 160) * 0.35;
    } else if (stil !== 'ambient' && lv > 0.45) {
      const hp = (t + beatAralik / 2) % beatAralik;
      if (hp < 0.02) hat = rasgele() * Math.exp(-hp * 400) * 0.1;
    }
    const padF = stil === 'ambient' ? 110 : 165;
    const padAmp = stil === 'ambient' ? 0.2 : 0.07;
    const pad = padAmp * (Math.sin(2 * Math.PI * padF * t) + (stil === 'ambient' ? 0.5 * Math.sin(2 * Math.PI * padF * 1.5 * t) : 0)) * lv;
    const bed = lv * lv * 0.7 * Math.sin(2 * Math.PI * basF * t);
    veri[i] = Math.tanh(2.2 * (kick * 0.95 + hat + pad + bed) * (0.3 + 0.7 * lv));
  }
  return { veri, sr };
}

// --- TIMELINE ÜRETEÇ: analiz + cihaz listesi → kanallar (ders 850-898 desen
// kütüphanesi, cihaz-listesine genelleştirilmiş — plan T13 Step 3). Her çağrı
// cihaz başına TAZE anahtar dizisi üretir (paylaşılan dizi = editörde birini
// sürükleyince ötekini de oynatma hatası — T12 devir notu).
export const HUE_OFSET = [0.0, 0.4, 0.7, 0.15];   // spot sırası → hue ofseti (tek kaynak; proje.js buradan alır)

// --- v8 KONUM-FAZLI DALGA (Salih ana şikayeti: "tüm cihazlar aynı anda yükselip
// alçalıyor" — tekdüze). Bellagio/Dubai klasiği: cihazlar KONUMA göre fazlı →
// biri yükselirken komşusu alçalır, dalga sahneye yayılır. `timelineUret` cihaz
// {x,z} konumundan her cihaza uzaysal koordinat u_i ∈ [0,1] atar; master zarfı
// bu u ile faz kaydırılır. Geometri: çizgi (soldan sağa), daire (merkezden dışa
// radyal), ızgara (diagonal). Şablon adı biliniyorsa (üretici geçirir) o kullanılır,
// yoksa x,z dağılımından çıkarılır. Tek cihaz / yayılım 0 → u=0 (dalga yok, eski
// tekdüze davranış — geriye uyumlu).
const DALGA_TABAN = 0.30;         // dalga çukurunda zarfın kalan oranı (kapanmaz)
const DALGA_GENLIK = 0.70;        // TABAN+GENLIK=1 → dalga tepesinde TAM zarf (eski doruk korunur)
const DALGA_N_BEAT = 4;           // dalga periyodu = N beat (yüksek BPM → kısa dalga)
const DALGA_T_MIN = 1.5, DALGA_T_MAX = 4.0;   // dalga periyodu müzikal banda kelepçelenir (s)
const HUE_UZAYSAL = 0.4;          // sahneye yayılan gökkuşağı gradyanı (k, tur başına ofset)

// şablon adı → geometri modu (üretici bu ipucunu geçirir; live app geçirmez)
const SABLON_MOD = { cizgi: 'cizgi', daire: 'daire', ariKovani: 'daire', izgara: 'izgara' };

// cihaz listesi → { id → u_i ∈ [0,1] } uzaysal koordinat. sablonTipi verilirse
// geometri ondan; yoksa x,z dağılımından çıkarılır. Güvenilmezse/tekse hepsi 0.
function uzaysalKoordinat(cihazlar, sablonTipi) {
  const u = new Map();
  const pts = cihazlar.filter(c => Number.isFinite(c.x) && Number.isFinite(c.z));
  if (pts.length < 2) { for (const c of cihazlar) u.set(c.id, 0); return u; }
  const xs = pts.map(c => c.x), zs = pts.map(c => c.z);
  const xmin = Math.min(...xs), xmax = Math.max(...xs);
  const zmin = Math.min(...zs), zmax = Math.max(...zs);
  const dx = xmax - xmin, dz = zmax - zmin, yayilim = dx + dz;
  if (yayilim < 1e-6) { for (const c of cihazlar) u.set(c.id, 0); return u; }  // yığılı → dalga yok
  let mod = sablonTipi ? SABLON_MOD[sablonTipi] : null;
  // merkez (ortalama) + merkeze uzaklıklar (radyal ayrım için)
  const cx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const cz = zs.reduce((a, b) => a + b, 0) / zs.length;
  const rler = pts.map(c => Math.hypot(c.x - cx, c.z - cz));
  const Rmax = Math.max(...rler, 1e-9), Rmin = Math.min(...rler);
  if (!mod) {
    // eşdoğrusal (tek eksende yayılım) → çizgi
    if (Math.min(dx, dz) < 0.18 * Math.max(dx, dz)) mod = 'cizgi';
    // merkezde cihaz var (daire/kovan: geyser/drydeck ortada) → radyal
    else if (Rmin < 0.12 * Rmax) mod = 'daire';
    else mod = 'izgara';                                // iki eksende yayılım → ızgara diagonal
  }
  for (const c of cihazlar) {
    let ui = 0;
    if (Number.isFinite(c.x) && Number.isFinite(c.z)) {
      if (mod === 'cizgi') {
        ui = dx >= dz ? (c.x - xmin) / Math.max(1e-9, dx) : (c.z - zmin) / Math.max(1e-9, dz);
      } else if (mod === 'daire') {
        ui = Math.hypot(c.x - cx, c.z - cz) / Rmax;     // merkezden dışa
      } else {                                          // ızgara diagonal
        ui = ((c.x - xmin) + (c.z - zmin)) / yayilim;
      }
    }
    u.set(c.id, Math.min(1, Math.max(0, ui)));
  }
  return u;
}

// uzaysal frekans: u∈[0,1] boyunca kaç TAM dalga → komşu cihazlar antifaz.
// Dalga boyu ~3 cihaz aralığı olsun diye N/3 (1.5..4 arası kelepçe).
function dalgaFrekans(nCihaz) {
  return Math.min(4, Math.max(1.5, nCihaz / 3));
}

// bant zarfı okuyucu: a.bantlar yoksa (v1 analiz nesnesi) null döner — çağıran
// eski davranışa düşer (geriye uyumluluk).
function bantAt(a, ad) {
  if (!a.bantlar || !a.bantlar[ad] || !a.bantlar[ad].length) return null;
  const d = a.bantlar[ad], hp = a.bantHop;
  return (t) => d[Math.max(0, Math.min(d.length - 1, Math.round(t / hp)))];
}
// desen: jet master = enerji zarfı × KONUM-FAZLI gezici dalga (v8, ders 858 tabanı).
// master_i(t) = env(t) · (TABAN + GENLIK·½(1+sin(2π t/T − 2π·k·u_i)))
//   env(t)  = şarkı enerji zarfı (orn) — şarkının dinamiği KORUNUR
//   dalga   = uzaysal faz: bir cihaz tepedeyken komşusu çukurda ("biri yükselir
//             biri alçalır"). u_i cihazın konumu, k uzaysal frekans (komşu antifaz).
//   ⚠dalga env'i ÇARPAR (eklemez): env=0 (sessizlik) → master=0, kapalı cihaz açılmaz.
//   Tepe (dalga=1) → TAM env → eski doruk (0.9..1.0) korunur; çukur → TABAN·env.
// VARYANT SEÇİMİ: sinüs-faz (bu) ↔ gecikme env(t−τ). Sinüs-faz SEÇİLDİ çünkü
// gecikme varyantı DÜZ enerji platosunda çöker (env(t−τ)≈env(t) → tüm cihazlar
// aynı yükseklik = mevcut tekdüze şikayeti geri gelir). Sinüs-faz sabit enerjide
// bile sürekli uzaysal salınım verir → dalga HER ZAMAN görünür (Bellagio).
// lead: ilk `lead` sn boyunca küçük taban akış GARANTİ (ramp 0'a) — sessiz girişli
// parçalarda (env≈0) sahne BOŞ açılmasın (ornek-sovlar "sov bos baslamiyor" guard;
// laminer lead-in ile aynı gerekçe). Lead sonrası salt env·dalga → sessizlikte 0.
function masterDalgaUret(orn, u, Tdalga, kFrek, lead = 0) {
  const faz = 2 * Math.PI * kFrek * u;
  return artan(orn.map(([t, e]) => {
    const dalga = DALGA_TABAN + DALGA_GENLIK * 0.5 * (1 + Math.sin(2 * Math.PI * t / Tdalga - faz));
    const v = e * dalga;                                        // dalga env'i ÇARPAR
    const taban = lead > 0 ? Math.max(0, 0.18 * (1 - t / lead)) : 0;   // yalnız giriş leadi
    return [t, Math.min(1, Math.max(0, Math.max(v, taban)))];
  }));
}
// desen: jet hız = 0.7 taban + her beat'te nabız (beat <=56'ya inceltilir) — ders 866-871
// v2: nabız tepesi BAS zarfını takip eder (bas güçlüyken nabız sert, sakinken hafif).
function beatNabziUret(a, sure) {
  let bts = a.beatler.filter(t => t > 0.1 && t < sure - 0.1);
  if (bts.length > 56) { const st = Math.ceil(bts.length / 56); bts = bts.filter((_, i) => i % st === 0); }
  const basAt = bantAt(a, 'bas');
  const hk = [[0, 0.7]];
  for (const t of bts) {
    const tepe = basAt ? 0.9 + 0.6 * basAt(t) : 1.3;
    hk.push([t - 0.05, 0.75], [t, tepe], [t + 0.12, 0.8]);
  }
  hk.push([sure, 0.7]);
  return artan(hk);
}
// desen: step aç/kapa — enerji > eşik iken açık — ders 860-862
// v7: (a) zAt artık SAĞLAM ölçekli zarf (zarfN) — geyser/star eşiği gerçek
// müzikte hiç tetiklenmiyordu, cihaz tüm şov boyunca görünmezdi;
// (b) HİSTEREZİS (kapanma eşiği 0.14 aşağıda) + MİNİMUM SÜRE — laminer gerçek
// şarkıda 498 anahtar üretiyordu (strobe riski); artık her durum en az `minSure`
// (varsayılan 0.6 sn) korunur.
// v7.1: histerezis 0.08 → 0.14. DÜZ parçada (Veridis Quo) zarf eşiğin hemen
// çevresinde salınıyor ve 0.08'lik bant yetmiyordu: 300 sn'de 87 aç/kapa
// (~3.4 sn'de bir) — strobe değil ama huzursuz. Geniş bant kararı "yapışkan"
// yapar; gerçek enerji değişimi yine geçer.
// v8 faz: kesme anları τ (sn) geciktirilir → aynı-tür cihazlar konuma göre SIRAYLA
// kesilir (aynı beat'te değil). τ kanal başına SABİT → sıra bozulmaz; çarpma sesleri
// karelere yayılır ("pat pat" → akıcı chase). τ=0 → eski davranış.
function enerjiKapisiUret(zAt, sure, esik, minSure = 0.6, faz = 0) {
  // v7.1: karar YUMUŞATILMIŞ zarfla verilir (±1.5 sn). Kapı bar-seviyesi
  // dalgalanmayı değil, MÜZİKAL enerji değişimini izlemeli.
  const nAdim = Math.max(1, Math.floor(sure / 0.25) + 1);
  const kum = new Float64Array(nAdim + 1);              // önek toplamı (O(n) yumuşatma)
  for (let i = 0; i < nAdim; i++) kum[i + 1] = kum[i] + zAt(i * 0.25);
  const W = 6;                                          // ±1.5 sn = ±6 adım
  const yumusak = (i) => {
    const a = Math.max(0, i - W), b = Math.min(nAdim, i + W + 1);
    return (kum[b] - kum[a]) / (b - a);
  };
  const ham = []; let durum = 0;
  for (let i = 0; i < nAdim; i++) {
    const t = i * 0.25;
    const v = yumusak(i);
    const on = durum ? (v > esik - 0.14 ? 1 : 0) : (v > esik ? 1 : 0);
    // faz: geçiş anı τ geciktirilir (kanal sabiti → sıra korunur); son ~0.3 sn'de
    // taşmayı önlemek için kelepçe.
    if (on !== durum) { ham.push([+Math.min(sure - 0.05, t + faz).toFixed(2), on]); durum = on; }
  }
  const k = [[0, 0]]; let sonT = -Infinity, sonV = 0;
  for (const [t, v] of ham) {
    if (v === sonV) continue;
    if (t - sonT < minSure) continue;          // çok erken flip → yut (durum korunur)
    k.push([t, v]); sonT = t; sonV = v;
  }
  k.push([sure, 0]);
  return artan(k);
}
// desen: ışık hue — v5.6 (Salih: "RGBW sürekli döner ama dönmüyor"): SÜREKLİ
// LINEAR DÖNÜŞ (~22 sn'de tam tur) + drop'ta +0.28 sıçrama. Değer 1'i aşar,
// sarma setter'da (setHue/hueRgb mod 1) — linear ara-değer bu yüzden bozulmaz.
// v7 SARMA: eski sürüm hue'yu SARMADAN yazıyordu (5.5 dk şovda 0 → 15.531!).
// Sözleşme 0-1; editörün y-aralığı 0-1 olduğu için eğri skalanın dışına taşıyor,
// düzenlenemiyordu. Artık 1'i geçtiği ANDA [t,1] + [t+0.001,0] çifti basılır:
// sürekli dönüş korunur (Salih v5.6 isteği), değer 0-1'de kalır, 1 ms'lik geri
// sıçrama görünmez. Ek olarak her BÖLÜM sınırında +0.13 basamak — 5 dakikalık
// şovda tek yavaş rampa yerine gerçek renk koreografisi.
// v8: dönüş 0.045 → 0.12 (tur ~8 sn, Salih "sürekli döner ama dönmüyor") ve
// BÖLÜM ENERJİSİNE bağlı: drop'ta hızlı (renk uçuşur), girişte yavaş (sakin).
const HUE_DONUS_HIZI = 0.12;
const HUE_HIZ_CARPAN = { giris: 0.55, verse: 1.0, build: 1.35, drop: 1.8, final: 0.9 };
const HUE_DROP_SICRAMA = 0.28, HUE_BOLUM_SICRAMA = 0.13;
const hueSar = (h) => ((h % 1) + 1) % 1;
// (t0,h0) → (t1,h1) lineer segmenti; arada tam tur geçişleri varsa sarma çifti basar.
function hueSegment(k, t0, h0, t1, h1) {
  for (let n = Math.floor(h0) + 1; n <= Math.floor(h1); n++) {
    if (h1 - h0 < 1e-9 || t1 - t0 < 0.004) break;
    let tc = t0 + (n - h0) / (h1 - h0) * (t1 - t0);
    tc = Math.min(Math.max(tc, t0 + 0.002), t1 - 0.002);
    k.push([+tc.toFixed(3), 1], [+(tc + 0.001).toFixed(3), 0]);
  }
  k.push([+t1.toFixed(3), +hueSar(h1).toFixed(3)]);
}
// v8: bölüm enerjisine bağlı dönüş hızı — [t0,t1] aralığında dönüşün ne kadar
// ilerlediği (tur cinsinden). Bölüm tipine göre çarpanla; aralık birkaç saniye
// olduğu için başlangıç tipini örneklemek yeterli, monotonluk korunur.
function hueDonus(bAt, t0, t1) {
  const tip = bAt ? bAt((t0 + t1) / 2) : 'verse';
  return (t1 - t0) * HUE_DONUS_HIZI * (HUE_HIZ_CARPAN[tip] ?? 1.0);
}
// v8 uzaysalOf: cihaz konumuna göre başlangıç hue kayması (k·u_i) — sahneye
// yayılan gökkuşağı; tüm cihazlar aynı hızda döndüğü için gradyan zamanla korunur.
function hueKanal(hedef, off, a, sure, uzaysalOf = 0) {
  const bAt = bolumAtUret(a);
  // sıçrama noktaları: her drop (büyük) + her bölüm başlangıcı (küçük)
  const olaylar = [];
  for (const t of a.droplar) if (t > 0.1 && t < sure - 0.1) olaylar.push({ t, d: HUE_DROP_SICRAMA });
  for (const b of (a.bolumler || [])) if (b.t0 > 0.1 && b.t0 < sure - 0.1) olaylar.push({ t: b.t0, d: HUE_BOLUM_SICRAMA });
  olaylar.sort((p, q) => p.t - q.t);
  let h = hueSar(off + uzaysalOf), son = 0;
  const k = [[0, +h.toFixed(3)]];
  for (const ol of olaylar) {
    if (ol.t - son < 0.2) continue;                       // çakışan olayları atla
    const tA = ol.t - 0.05;
    const hA = h + hueDonus(bAt, son, tA);                // sıçramaya kadar sürekli dönüş (bölüm-hızlı)
    hueSegment(k, son, h, tA, hA);
    hueSegment(k, tA, hueSar(hA), ol.t, hueSar(hA) + ol.d);  // sıçrama
    h = hueSar(hueSar(hA) + ol.d); son = ol.t;
  }
  hueSegment(k, son, h, sure, h + hueDonus(bAt, son, sure));
  return { hedef, tip: 'linear', anahtarlar: artan(k) };
}
// desen: ışık parlaklık = enerji + drop'ta patlama — ders 881-885
// v2: taban TİZ zarfını takip eder (hi-hat/parlaklık eşlemesi); v1 analizde enerji.
function parlakKanal(hedef, orn, a) {
  const tizAt = bantAt(a, 'tiz');
  const k = orn.map(([t, e]) => [t, tizAt ? 0.15 + 0.9 * tizAt(t) : 0.15 + 0.85 * e]);  // v7
  for (const dtp of a.droplar) k.push([dtp - 0.05, 0.5], [dtp, 1.4], [dtp + 0.4, 0.9]);
  return { hedef, tip: 'smooth', anahtarlar: artan(k) };
}
// desen: su cihazı renk doygunluğu — v5.6: kolonlar şov boyunca RENKLİ (Salih
// referans fotoğrafları + katalog geceleri: RGBW kolonu sürekli boyar; beyaz=1
// tabanı ışıksız görünüyordu). Taban 0.55 = yarı doygun; drop'ta 0.15'e dalar
// (tam doygun patlama), girişte 1 (doğal) başlar.
function beyazKanal(hedef, a, sure) {
  // v8 taban 0.55 → 0.30: renkler canlansın (beyaz kısılınca RGBW doygunluğu artar);
  // drop'ta 0.15'e dalar (tam doygun patlama), girişte 1 (doğal) başlar.
  const k = [[0, 1], [Math.min(2, sure * 0.1), 0.30]];
  for (const dtp of a.droplar) k.push([dtp - 0.05, 0.30], [dtp, 0.15], [dtp + 1.2, 0.30]);
  k.push([sure, 0.30]);
  return { hedef, tip: 'smooth', anahtarlar: artan(k) };
}

// --- v3 F6 rol yardımcıları (spec cihaz-gerçekçiliği §5): bölüm → rol → desen ---
// bolumAt: t anındaki bölüm tipi ('giris'|'verse'|'build'|'drop'); bolumler yoksa null.
function bolumAtUret(a) {
  if (!a.bolumler || !a.bolumler.length) return null;
  return (t) => a.bolumler.find(b => t >= b.t0 && t < b.t1)?.tip ?? 'verse';
}
// AquaSWITCH rolü: KESKİN VURUŞ — beat ızgarasında koşan ani aç/kes; drop'ta
// hepsi açık kalır (solenoid imzası bestenin ritim iskeleti olur).
// v8 faz τ: kesme anları konuma göre τ (sn) geciktirilir → cihazlar aynı beat'te
// değil SIRAYLA keser (fazlı chase). τ kanal başına SABİT olduğu için beat sırası
// bozulmaz; "pat pat" (aynı anda çarpma) yerine akıcı dalga. τ=0 → eski davranış.
function switchKanal(id, i, n, a, sure, bolumAt, faz = 0) {
  const bts = (a.beatIzgara?.length ? a.beatIzgara : a.beatler).filter(t => t > 0.2 && t < sure - 0.3);
  const D = (t) => +Math.min(sure - 0.05, t + faz).toFixed(2);   // faz kaydırma + taşma kelepçesi
  const k = [[0, 0]]; let acik = false;
  for (const t of bts) {
    const b = bolumAt ? bolumAt(t) : null;
    if (b === 'giris') continue;                        // intro'da susar
    if (b === 'drop') {
      if (!acik) { k.push([D(t), 1]); acik = true; }    // drop: sürekli açık
      continue;
    }
    if (acik) { k.push([D(t), 0]); acik = false; continue; }
    if (Math.round(t / ((bts[1] ?? 0.5) - (bts[0] ?? 0))) % n !== i && bolumAt) continue;  // koşan dalga (kaba sıra)
    k.push([D(t), 1], [D(t + 0.3), 0]);
  }
  k.push([sure, 0]);
  return { hedef: `${id}.master`, tip: 'step', anahtarlar: artan(k) };
}
// AquaROBO/SWING rolü: MELODİK SÜPÜRME — pan sinüsü, genlik orta banda,
// tempo bölüme bağlı (drop'ta hızlı ve geniş).
function panKanal(id, a, sure, bolumAt, faz = 0) {
  const ortaAt = bantAt(a, 'orta');
  const k = [];
  for (let t = 0; t <= sure + 1e-3; t += 0.5) {
    const tt = Math.min(t, sure);
    const b = bolumAt ? bolumAt(tt) : null;
    const periyot = b === 'drop' ? 3.2 : b === 'build' ? 5 : 8;
    const genlik = 35 + 35 * (ortaAt ? ortaAt(tt) : 0.5) + (b === 'drop' ? 15 : 0);
    k.push([tt, +(Math.sin(2 * Math.PI * tt / periyot + faz) * genlik).toFixed(1)]);
  }
  return { hedef: `${id}.pan`, tip: 'smooth', anahtarlar: artan(k) };
}
// v5 F3 — AquaAIR rolü: DROP PATLATMASI — her drop anında kısa solenoid salvosu
// (künye: basınçlı hava 30-40m; sürekli akmaz, şovun ünlem işareti). Drop yoksa
// nadir enerji zirvesi kapısı (0.82) devreye girer — parça boyu susmasın.
function airKanal(id, a, sure, zAt) {
  const k = [[0, 0]];
  if (a.droplar.length) {
    // Karakter kartı kısıtı: AIR atışlar arası 4-32 sn DOLUM ister (kompresör
    // reload) — 6 sn'den sık salvo fiziksel olarak imkansız, yakın droplar atlanır.
    let son = -Infinity;
    for (const dtp of a.droplar) {
      if (dtp - son < 6) continue;
      son = dtp;
      k.push([+Math.max(0.01, dtp - 0.05).toFixed(2), 0], [+dtp.toFixed(2), 1],
             [+(dtp + 1.1).toFixed(2), 0]);
    }
  } else {
    for (let t = 0.5; t < sure; t += 0.5) {
      const acik = zAt(t) > 0.82 ? 1 : 0;
      k.push([+t.toFixed(2), acik]);
    }
  }
  k.push([sure, 0]);
  return { hedef: `${id}.master`, tip: 'step', anahtarlar: artan(k) };
}

// v5 F3 — WATER CURTAIN rolü: BÖLÜM GEÇİŞİ — perde fon dokusudur (giris kapalı,
// sonrası açık), her bölüm sınırında 0.6s göz kırpar (kapan-aç = sahne değişti
// imzası); drop boyunca kesintisiz açık kalır.
function perdeKanal(id, a, sure, bolumAt) {
  const k = [];
  let onceki = null, acik = null;
  for (let t = 0; t < sure; t += 0.25) {
    const b = bolumAt ? bolumAt(t) : 'verse';
    const hedefDurum = b === 'giris' ? 0 : 1;
    if (onceki !== null && b !== onceki && hedefDurum === 1 && b !== 'drop' && acik === 1) {
      k.push([+t.toFixed(2), 0], [+(t + 0.6).toFixed(2), 1]);   // göz kırpma
      onceki = b; continue;
    }
    if (hedefDurum !== acik) { k.push([+t.toFixed(2), hedefDurum]); acik = hedefDurum; }
    onceki = b;
  }
  if (!k.length) k.push([0, 1]);
  k.push([sure, acik ?? 1]);
  return { hedef: `${id}.master`, tip: 'step', anahtarlar: artan(k) };
}

// AquaJET rolü: DORUK — yalnız build sonu + drop'ta açılır (en yüksek kolon
// en değerli anda gelir); bolumler yoksa enerji kapısı yüksek eşikle.
function aquajetMaster(id, a, zAt, sure, bolumAt) {
  if (!bolumAt) return { hedef: `${id}.master`, tip: 'step', anahtarlar: enerjiKapisiUret(zAt, sure, 0.7) };
  const k = [[0, 0]]; let acik = false;
  for (let t = 0; t <= sure; t += 0.25) {
    const on = bolumAt(t) === 'drop' ? 1 : 0;
    if (on !== (acik ? 1 : 0)) { k.push([+t.toFixed(2), on]); acik = !!on; }
  }
  k.push([sure, 0]);
  return { hedef: `${id}.master`, tip: 'smooth', anahtarlar: artan(k) };
}

// sablonTipi (ops.): üretici şablon adını ('daire'|'ariKovani'|'cizgi'|'izgara')
// geçirirse geometri ondan; live app geçirmez → x,z'den çıkarılır (uzaysalKoordinat).
export function timelineUret(a, cihazlar, sablonTipi = null) {
  const sure = a.sure, dt = a.dt;
  // v8 KONUM-FAZLI DALGA: her cihaza u_i ∈ [0,1] uzaysal koordinat + faz gecikmesi.
  const uMap = uzaysalKoordinat(cihazlar, sablonTipi);
  const uOf = (id) => uMap.get(id) ?? 0;
  const nPoz = cihazlar.filter(c => Number.isFinite(c.x) && Number.isFinite(c.z)).length;
  const kFrek = dalgaFrekans(nPoz);
  const beatPeriyot = 60 / (a.bpm || 120);
  const Tdalga = Math.min(DALGA_T_MAX, Math.max(DALGA_T_MIN, beatPeriyot * DALGA_N_BEAT));
  const tauOf = (id) => uOf(id) * beatPeriyot;         // fazlı kesme gecikmesi (≤ 1 beat)
  const dalgaLead = Math.min(4, sure * 0.5);           // giriş taban akışı (sessiz intro guard)
  // v7 DİNAMİK ARALIK: zarfN (yüzdelik-esnetilmiş) varsa onu kullan — ham zarf
  // gerçek müzikte 0.25-0.65 bandında sıkışıp şovu düz/cansız yapıyordu.
  const zarf = (a.zarfN && a.zarfN.length) ? a.zarfN : a.zarf;
  // son savunma: boş/bozuk zarf gelse bile NaN anahtar ÜRETİLMEZ (NaN timeline'a
  // sızarsa cihaz setter'ları sessizce ölür ve dosyaya da yazılır).
  const zAt = (t) => {
    const v = zarf[Math.max(0, Math.min(zarf.length - 1, Math.round(t / dt)))];
    return Number.isFinite(v) ? v : 0;
  };
  // 0.5s örnekli zarf (master/parlaklik/geyser.hiz için) — ders 853-855
  const orn = [];
  for (let t = 0; t <= sure + 1e-3; t += 0.5) orn.push([Math.min(t, sure), zAt(t)]);
  const kanallar = [];
  const bolumAt = bolumAtUret(a);                     // v3 F6: bölüm → rol kapıları
  const nSwitch = cihazlar.filter(c => c.tur === 'switch').length;
  let spotSira = 0, suSira = 0, switchSira = 0, servoSira = 0;
  // v2: su cihazlarında `${id}.hue` (0..1 step) + `${id}.beyaz` (0..1 smooth) — T-C
  // entegrasyonu; drop'ta hue basamağı + beyaz renk patlaması.
  const suRenk = (id) => {
    kanallar.push(hueKanal(`${id}.hue`, HUE_OFSET[suSira % 4], a, sure, HUE_UZAYSAL * uOf(id)));
    kanallar.push(beyazKanal(`${id}.beyaz`, a, sure));
    suSira++;
  };
  for (const c of cihazlar) {
    if (c.tur === 'duz_jet' || c.tur === 'vario') {   // v5: vario = bas→debi rolü (duz_jet ile aynı)
      kanallar.push({ hedef: `${c.id}.master`, tip: 'smooth', anahtarlar: masterDalgaUret(orn, uOf(c.id), Tdalga, kFrek, dalgaLead) });
      kanallar.push({ hedef: `${c.id}.hiz`, tip: 'smooth', anahtarlar: beatNabziUret(a, sure) });
      suRenk(c.id);
    } else if (c.tur === 'geyser') {
      kanallar.push({ hedef: `${c.id}.master`, tip: 'step', anahtarlar: enerjiKapisiUret(zAt, sure, 0.55, 0.6, tauOf(c.id)) });
      kanallar.push({ hedef: `${c.id}.hiz`, tip: 'smooth', anahtarlar: artan(orn.map(([t, e]) => [t, 0.9 + 0.5 * e])) });  // ders 864
      suRenk(c.id);
    } else if (c.tur === 'laminer') {
      // v7 minSure 0.8s: 498 anahtar -> strobe riski; geyser'den erken açılır.
      // v7.2 LEAD-IN: laminer gerçekte SÜREKLİ akan cam-çubuk. Şov BOŞ açılmasın
      // diye ilk lead-in boyunca taban akış GARANTİ. Gerekçe: çizgi şablonu yalnız
      // switch (giriş'te susar) + laminer içeriyor; sakin girişli parçada laminer
      // enerji kapısı da t=2'de kapalıysa sahne boş görünüyordu (ornek-sovlar:
      // "sov bos baslamiyor"). Enerji kapısı lead sonrası koreografiyi yine sürer.
      const lead = Math.min(4, sure * 0.5);
      const lamK = enerjiKapisiUret(zAt, sure, 0.40, 0.8, tauOf(c.id))
        .filter(([t]) => t <= 0 || t >= lead);        // lead içindeki kapanmaları at
      lamK[0] = [0, 1];                                // baştan açık (taban akış)
      kanallar.push({ hedef: `${c.id}.master`, tip: 'step', anahtarlar: artan(lamK) });
      suRenk(c.id);
    } else if (c.tur === 'rgb_spot') {
      kanallar.push(hueKanal(`${c.id}.hue`, HUE_OFSET[spotSira % 4], a, sure, HUE_UZAYSAL * uOf(c.id)));
      kanallar.push(parlakKanal(`${c.id}.parlaklik`, orn, a));
      spotSira++;
    } else if (c.tur === 'switch') {
      // v3 F6: keskin vuruş rolü — beat kilitli ani aç/kes; v8: konuma göre fazlı kesme
      kanallar.push(switchKanal(c.id, switchSira++, Math.max(1, nSwitch), a, sure, bolumAt, tauOf(c.id)));
      suRenk(c.id);
    } else if (c.tur === 'robo' || c.tur === 'swing') {
      // v3 F6: melodik süpürme rolü — pan orta-bant genlikli, bölüm tempolu
      kanallar.push({ hedef: `${c.id}.master`, tip: 'smooth', anahtarlar: masterDalgaUret(orn, uOf(c.id), Tdalga, kFrek, dalgaLead) });
      kanallar.push({ hedef: `${c.id}.hiz`, tip: 'smooth', anahtarlar: artan(orn.map(([t, e]) => [t, 0.8 + 0.4 * e])) });
      kanallar.push(panKanal(c.id, a, sure, bolumAt, (servoSira++ % 2) * Math.PI));  // karşılıklı faz
      if (c.tur === 'robo')
        kanallar.push({ hedef: `${c.id}.tilt`, tip: 'smooth',
          anahtarlar: artan(orn.map(([t, e]) => [t, 8 + 20 * e])) });
      suRenk(c.id);
    } else if (c.tur === 'drydeck') {
      // v3 F6: interaktif zemin — beat nabızlı kısa fıskiye; v8: konum-fazlı dalga
      kanallar.push({ hedef: `${c.id}.master`, tip: 'smooth', anahtarlar: masterDalgaUret(orn, uOf(c.id), Tdalga, kFrek, dalgaLead) });
      kanallar.push({ hedef: `${c.id}.hiz`, tip: 'smooth', anahtarlar: beatNabziUret(a, sure) });
      suRenk(c.id);
    } else if (c.tur === 'aquajet') {
      // v3 F6: doruk rolü — yalnız drop bölümlerinde açılır
      kanallar.push(aquajetMaster(c.id, a, zAt, sure, bolumAt));
      kanallar.push({ hedef: `${c.id}.hiz`, tip: 'smooth', anahtarlar: artan(orn.map(([t, e]) => [t, 0.9 + 0.4 * e])) });
      suRenk(c.id);
    } else if (c.tur === 'yelpaze') {
      kanallar.push({ hedef: `${c.id}.master`, tip: 'step', anahtarlar: enerjiKapisiUret(zAt, sure, 0.5, 0.6, tauOf(c.id)) });
      kanallar.push({ hedef: `${c.id}.hiz`, tip: 'smooth', anahtarlar: artan(orn.map(([t, e]) => [t, 0.85 + 0.45 * e])) });
      suRenk(c.id);
    } else if (c.tur === 'air') {
      // v5 F3: drop patlatması — solenoid salvo (hiz kanalı yok, STEP_TURLERI)
      kanallar.push(airKanal(c.id, a, sure, zAt));
      suRenk(c.id);
    } else if (c.tur === 'star') {
      // v5 F3: taç — enerji kapılı solenoid (geyser eşiği, ani aç/kes); v8: fazlı
      kanallar.push({ hedef: `${c.id}.master`, tip: 'step', anahtarlar: enerjiKapisiUret(zAt, sure, 0.55, 0.6, tauOf(c.id)) });
      suRenk(c.id);
    } else if (c.tur === 'torch') {
      // v5 F3: doruk ALEVİ — aquajet gibi yalnız drop'ta; suRenk BİLEREK YOK
      // (beyaz kanalı drop'ta 0.35'e düşer → alev maviye dönerdi; alev turuncu
      // kalır, hue/beyaz varsayılanları proje.js'te 1'de durur).
      kanallar.push(aquajetMaster(c.id, a, zAt, sure, bolumAt));
      kanallar.push({ hedef: `${c.id}.hiz`, tip: 'smooth',
        anahtarlar: artan(orn.map(([t, e]) => [t, 0.8 + 0.5 * e])) });    // alev boyu = enerji
    } else if (c.tur === 'perde') {
      // v5 F3: bölüm geçişi imzası — fon dokusu + sınırda göz kırpma
      kanallar.push(perdeKanal(c.id, a, sure, bolumAt));
      suRenk(c.id);
    }
  }
  return { sure, kanallar };
}
