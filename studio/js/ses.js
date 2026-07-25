// ses.js — çarpma-senkron su sesi (v3 F4, spec cihaz-gerçekçiliği §4).
// Salih düzeltmesi: dış mekanda baskın ses SÜREKLİ şelale değil, suyun suya
// GERİ ÇARPMASIDIR. Model: (a) çok kısık süreklilik tabanı (akan su fısıltısı),
// (b) carpma(siddet) tek-atımlık splash — akış kesilince balistik gecikmeyle
// çağıran tetikler (ana.js kuyruk showT ile senkron). Prosedürel, dış asset yok.
export function suSesiKur(actx, hedefler) {
  const sr = actx.sampleRate, n = sr * 2;                // 2 sn gürültü döngüsü
  const buf = actx.createBuffer(1, n, sr);
  const d = buf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < n; i++) {                          // pembe-ish (Paul Kellett yaklaşımı)
    const w = Math.random() * 2 - 1;
    b0 = 0.997 * b0 + 0.029591 * w;
    b1 = 0.985 * b1 + 0.032534 * w;
    b2 = 0.950 * b2 + 0.048056 * w;
    d[i] = (b0 + b1 + b2 + w * 0.05) * 3.5;
  }
  const f = Math.floor(sr * 0.05);                       // döngü dikişi çapraz-fade
  for (let i = 0; i < f; i++) { const k = i / f; d[i] = d[i] * k + d[n - f + i] * (1 - k); }

  // taban: kısık fısıltı (v3'te tavan 0.18→0.045 — çarpmalar öne çıksın)
  const src = actx.createBufferSource();
  src.buffer = buf; src.loop = true;
  const filtre = actx.createBiquadFilter();
  filtre.type = 'lowpass'; filtre.frequency.value = 900; filtre.Q.value = 0.4;
  const gain = actx.createGain();
  gain.gain.value = 0;
  src.connect(filtre); filtre.connect(gain);
  for (const h of hedefler) if (h) gain.connect(h);
  src.start();

  return {
    // v 0..1: akış etkinliği — taban fısıltısı (jet varken hafif duyulur)
    seviye(v) { gain.gain.setTargetAtTime(Math.max(0, Math.min(1, v)) * 0.045, actx.currentTime, 0.25); },
    // tek-atımlık çarpma: hızlı atak + üstel sönüm, bandpass'li gürültü patlaması.
    // siddet 0..1 hem genliği hem kuyruğu büyütür (büyük kolon = uzun şlap).
    carpma(siddet = 1) {
      const sd = Math.max(0.1, Math.min(1, siddet));
      const s = actx.createBufferSource();
      s.buffer = buf;
      s.playbackRate.value = 0.85 + Math.random() * 0.3;   // her çarpma az farklı
      const bp = actx.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = 450 + Math.random() * 350; bp.Q.value = 0.7;
      const g = actx.createGain();
      const t = actx.currentTime;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.5 * sd, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45 + 0.35 * sd);
      s.connect(bp); bp.connect(g);
      for (const h of hedefler) if (h) g.connect(h);
      s.start(t, Math.random() * (buf.duration - 1.1), 1.0);
      s.stop(t + 1.0);                                     // düğümler GC'ye (onended dispose otomatik)
    },
    sil() { try { src.stop(); } catch (e) {} src.disconnect(); filtre.disconnect(); gain.disconnect(); }
  };
}
