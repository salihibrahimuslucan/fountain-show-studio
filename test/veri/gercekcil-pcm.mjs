// gercekcil-pcm.mjs — GERÇEK MÜZİĞİ TAKLİT EDEN sentetik test fikstürü (v7).
//
// Neden ayrı bir üreteç: besteci.js'teki sentetikPCM test parçası TEMİZ —
// tam ızgarada vuruş, geniş dinamik, mutlak eşiklere birebir kalibre. Gerçek
// şarkılarda (Salih tarayıcı ölçümü: Veridis Quo, TERRITORY) besteci sistematik
// çöküyordu çünkü gerçek mikste:
//   1. mastering limiter zarfı sıkıştırır — tepe-normalize sonrası zarf
//      0.1-0.6 bandında yaşar, 0.72 gibi mutlak drop eşiği ASLA tetiklenmez;
//   2. tek bir crash/transient tüm parçanın maksimumunu belirler (aynı sıkışma);
//   3. vuruşlar ızgarada değil — insan/swing mikro-zamanlaması ±10-25 ms;
//   4. backbeat (trampet 2 ve 4) kick'ten güçlüyse otokorelasyonun global
//      tepesi YARIM tempoda oluşur → 120 BPM parça 59.8 ölçülür.
// Bu üreteç 1-4'ü bilerek üretir; testler besteci'nin bunlara dayanmasını arar.
//
// Deterministik (tohumlu LCG) — Math.random YOK.
export function gercekcilPCM({ saniye = 200, bpm = 120, stil = 'house', tohum = 7 } = {}) {
  const sr = 22050;                      // test hızı için yarı oran (analiz sr-bağımsız)
  const N = Math.floor(saniye * sr);
  const veri = new Float32Array(N);
  let s = tohum >>> 0;
  const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x40000000 - 1; };

  const beatAralik = 60 / bpm;
  const nBeat = Math.ceil(saniye / beatAralik);

  // --- düzenleme (arrangement): bölüm başına 0..1 yoğunluk ---
  // Gerçek şarkı yapısı: giris → verse → build → drop → breakdown → drop → outro
  const bolumOran = [
    [0.00, 0.10, 0.18], [0.10, 0.30, 0.45], [0.30, 0.38, 0.62],
    [0.38, 0.58, 1.00], [0.58, 0.70, 0.30], [0.70, 0.90, 1.00], [0.90, 1.00, 0.22],
  ];
  // stil 'duz' (Veridis Quo vakası): DÜZ ev müziği — sabit tempo, sabit yoğunluk,
  // kayda değer sıçrama YOK. v7'nin drop tespiti burada 57 drop / 345 sn üretti
  // (her 6 sn'de bir renk patlaması). Fikstürün varlık sebebi: "drop'u AZ olan
  // uzun, limiter'lı gerçek parça" — düzenlenmiş drop içeren öteki stiller bu
  // patolojiyi yakalamıyordu.
  const yogunluk = (t) => {
    if (stil === 'duz') {
      // 0.62-0.78 arasında yavaş nefes + 8 barlık hafif katman değişimi; hiçbir
      // geçiş "drop" büyüklüğünde değil (en büyük fark ~0.10).
      const nefes = 0.70 + 0.05 * Math.sin(2 * Math.PI * t / 32);
      const katman = 0.03 * Math.sin(2 * Math.PI * t / (beatAralik * 32));
      return nefes + katman;
    }
    const x = t / saniye;
    for (const [a, b, v] of bolumOran) {
      if (x >= a && x < b) {
        const ic = (x - a) / (b - a);
        if (v > 0.9 && ic < 0.03) return 0.35 + 0.65 * (ic / 0.03);   // drop'a ani giriş
        return v * (0.92 + 0.08 * Math.sin(2 * Math.PI * ic * 4));    // hafif dalgalanma
      }
    }
    return 0.2;
  };

  // --- vuruş olayları: mikro-zamanlama jitter'lı ---
  const olaylar = [];   // {t, tip, amp}
  for (let b = 0; b < nBeat; b++) {
    const tIdeal = b * beatAralik;
    const jit = rnd() * 0.018;                       // ±18 ms insan/swing kayması
    const y = yogunluk(tIdeal);
    if (y < 0.25 && b % 4 !== 0) continue;           // seyrek bölümde vuruşlar düşer
    if (stil === 'backbeat') {
      // trampet 2 ve 4'te ve kick'ten GÜÇLÜ → otokorelasyon 2·beat'te tepe yapar
      const vurgu = (b % 2 === 1) ? 1.0 : 0.34;
      olaylar.push({ t: tIdeal + jit, tip: (b % 2 === 1) ? 'snare' : 'kick', amp: vurgu * y });
    } else {
      olaylar.push({ t: tIdeal + jit, tip: 'kick', amp: (b % 4 === 0 ? 1 : 0.75) * y });
      if (y > 0.5 && b % 2 === 1) olaylar.push({ t: tIdeal + jit + 0.004, tip: 'snare', amp: 0.55 * y });
    }
    if (y > 0.4) {                                   // offbeat hat
      olaylar.push({ t: tIdeal + beatAralik / 2 + rnd() * 0.012, tip: 'hat', amp: 0.3 * y });
    }
  }
  // gerçek mikste tek bir crash tüm parçanın tepe genliğini belirler (madde 2)
  olaylar.push({ t: saniye * 0.38, tip: 'crash', amp: 3.2 });

  const ekle = (t0, uzunluk, f) => {
    const i0 = Math.max(0, Math.floor(t0 * sr)), i1 = Math.min(N, i0 + Math.floor(uzunluk * sr));
    for (let i = i0; i < i1; i++) veri[i] += f((i - i0) / sr);
  };
  for (const o of olaylar) {
    if (o.tip === 'kick') ekle(o.t, 0.18, (x) => Math.sin(2 * Math.PI * (110 - 60 * Math.min(1, x * 14)) * x) * Math.exp(-x * 26) * o.amp);
    else if (o.tip === 'snare') ekle(o.t, 0.14, (x) => (rnd() * 0.8 + 0.5 * Math.sin(2 * Math.PI * 190 * x)) * Math.exp(-x * 32) * o.amp);
    else if (o.tip === 'hat') ekle(o.t, 0.05, (x) => rnd() * Math.exp(-x * 120) * o.amp);
    else ekle(o.t, 1.2, (x) => rnd() * Math.exp(-x * 3.5) * o.amp);
  }
  // sürekli katmanlar: bas + pad, yoğunlukla ölçekli
  for (let i = 0; i < N; i++) {
    const t = i / sr, y = yogunluk(t);
    const bas = 0.55 * y * Math.sin(2 * Math.PI * 55 * t + 0.6 * Math.sin(2 * Math.PI * t / beatAralik));
    const pad = 0.22 * y * (Math.sin(2 * Math.PI * 220 * t) + 0.6 * Math.sin(2 * Math.PI * 331 * t));
    veri[i] += bas + pad;
  }
  // mastering limiter (madde 1): sert sıkıştırma → zarf dar bir bantta yaşar.
  const surus = stil === 'sikisik' ? 6.5 : 2.6;
  for (let i = 0; i < N; i++) veri[i] = Math.tanh(surus * veri[i] * 0.42) * 0.9;
  return { veri, sr };
}
