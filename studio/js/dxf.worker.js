// dxf.worker.js — devasa DXF'i ana thread'i kilitlemeden ayrıştırır (T-0).
// Girdi: File. Çıktı mesajları: {tip:'ilerleme',yuzde} · {tip:'hata',mesaj} ·
// {tip:'sonuc', duz:Float32Array(transfer), birimOlcek, atlanan, dusen, toplam}.
// Satır tamponu: chunk sonundaki yarım satır `kalan`da bekler; sondaki '\r'
// doğal olarak kalan'a düşer (split \r?\n onu tek başına bölmez) — CRLF sınırı güvenli.
import { dxfAkisiYarat, sadelestir } from './dxf.js';

self.onmessage = async (e) => {
  const dosya = e.data;
  try {
    const akis = dxfAkisiYarat();
    const okuyucu = dosya.stream().getReader();
    const dec = new TextDecoder();
    let kalan = '', okunan = 0, sonYuzde = -1;
    for (;;) {
      const { done, value } = await okuyucu.read();
      if (done) break;
      okunan += value.byteLength;
      const satirlar = (kalan + dec.decode(value, { stream: true })).split(/\r?\n/);
      kalan = satirlar.pop();
      for (const s of satirlar) akis.satirBesle(s);
      const yuzde = Math.floor(100 * okunan / dosya.size);
      if (yuzde !== sonYuzde) { self.postMessage({ tip: 'ilerleme', yuzde }); sonYuzde = yuzde; }
    }
    kalan += dec.decode();                       // decoder kuyruğu (çok baytlı karakter sınırı)
    if (kalan) akis.satirBesle(kalan);
    const r = akis.bitir();
    const s = sadelestir(r.parcalar);
    const duz = new Float32Array(s.parcalar.length * 4);
    s.parcalar.forEach((p, i) => duz.set(p, i * 4));
    self.postMessage({ tip: 'sonuc', duz, birimOlcek: r.birimOlcek, atlanan: r.atlanan,
      dusen: s.dusen, toplam: r.parcalar.length }, [duz.buffer]);
  } catch (h) { self.postMessage({ tip: 'hata', mesaj: h.message }); }
};
