// tools/muzikli-ornek-uret.mjs — GERÇEK mp3 → müzik-senkron örnek .aqshow üretir.
// Zincir: mp3 --(ffmpeg)--> mono 22050 Hz wav --(elle parse)--> PCM Float32 -->
//         besteci.analizEt --> besteci.timelineUret --> aqshowYaz.
// ornek-uret.mjs (müziksiz şablon üreticisi) deseni model alındı; fark: kanallar
// artık sabit koreografi değil, ŞARKININ analizinden (beat/drop/bölüm) doğuyor.
//
// Saf modüller: sablon + besteci + aqshowYaz (three'siz — ornek-uret zaten böyle
// import ediyor, Node'da doğrudan yüklenir). ffmpeg PATH'te olmalı (execSync).
//
// Koş: node tools/muzikli-ornek-uret.mjs "<mp3 yolu>" <sablon> <fon> <cikti-ad>
//   sablon: daire | ariKovani | cizgi | izgara
//   fon:    meydan | gol | kuru | park | sade | kapali (mekan.fon)
// Çıktı: studio/ornekler/<cikti-ad>.aqshow  (loader ana.js fetch('ornekler/…'))
import { writeFileSync, mkdirSync, readFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';
import { daire, ariKovani, cizgi, izgara } from '../studio/js/sablon.js';
import { analizEt, timelineUret } from '../studio/js/besteci.js';
import { aqshowYaz } from '../studio/js/proje.js';

const SABLONLAR = {
  daire: () => daire(8),
  ariKovani: () => ariKovani(2),
  cizgi: () => cizgi(12, 9),
  izgara: () => izgara(4, 4),
};

// cihazYonetici.idUret formatı (tur_N) — ornek-uret.mjs ile birebir.
function idVer(cihazlar) {
  const sayac = {};
  return cihazlar.map(c => ({ ...c, aci: c.aci ?? 0, id: `${c.tur}_${sayac[c.tur] = (sayac[c.tur] || 0) + 1}` }));
}

// --- WAV → PCM: RIFF chunk'larını gez (ffmpeg fmt/data dışına extra chunk
// koyabilir; sabit 44-bayt ofset kırılgan). fmt ' den sampleRate/kanal/bit,
// 'data'dan 16-bit signed LE örnekler → Float32 (/32768). ------------------
function wavOku(yol) {
  const buf = readFileSync(yol);
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE')
    throw new Error('wav degil (RIFF/WAVE yok): ' + yol);
  let sampleRate = 22050, kanal = 1, bit = 16, dataOff = -1, dataLen = 0;
  let p = 12;
  while (p + 8 <= buf.length) {
    const id = buf.toString('ascii', p, p + 4);
    const boy = buf.readUInt32LE(p + 4);
    const govde = p + 8;
    if (id === 'fmt ') {
      kanal = buf.readUInt16LE(govde + 2);
      sampleRate = buf.readUInt32LE(govde + 4);
      bit = buf.readUInt16LE(govde + 14);
    } else if (id === 'data') {
      dataOff = govde;
      dataLen = Math.min(boy, buf.length - govde);   // bozuk boy alanına karşı kırp
      break;
    }
    p = govde + boy + (boy & 1);                      // chunk'lar çift hizalı
  }
  if (dataOff < 0) throw new Error('wav data chunk yok');
  if (bit !== 16) throw new Error('yalnız 16-bit PCM destekli (ffmpeg -f wav pcm_s16le), gelen: ' + bit);
  const n = Math.floor(dataLen / 2);                  // 16-bit → 2 bayt/örnek
  const f32 = new Float32Array(n);
  for (let i = 0; i < n; i++) f32[i] = buf.readInt16LE(dataOff + i * 2) / 32768;
  // ffmpeg -ac 1 verdiği için mono; yine de çok kanallıysa ilk kanalı süz.
  if (kanal > 1) {
    const m = new Float32Array(Math.floor(n / kanal));
    for (let i = 0; i < m.length; i++) m[i] = f32[i * kanal];
    return { sampleRate, veri: m };
  }
  return { sampleRate, veri: f32 };
}

function main() {
  const [mp3, sablonAd, fon, ciktiAd] = process.argv.slice(2);
  if (!mp3 || !sablonAd || !fon || !ciktiAd) {
    console.error('kullanım: node tools/muzikli-ornek-uret.mjs "<mp3>" <sablon> <fon> <cikti-ad>');
    console.error('  sablon:', Object.keys(SABLONLAR).join(' | '));
    process.exit(2);
  }
  if (!SABLONLAR[sablonAd]) throw new Error('bilinmeyen sablon: ' + sablonAd + ' (' + Object.keys(SABLONLAR).join('|') + ')');
  if (!existsSync(mp3)) throw new Error('mp3 yok: ' + mp3);

  // 1) mp3 → mono 22050 Hz wav (besteci analizi için yeterli, dosya küçük).
  const gecici = mkdtempSync(join(tmpdir(), 'aqmuzik-'));
  const wav = join(gecici, 'a.wav');
  try {
    execFileSync('ffmpeg', ['-y', '-i', mp3, '-ac', '1', '-ar', '22050', '-f', 'wav', wav], { stdio: 'ignore' });
    // 2) wav → PCM
    const { sampleRate, veri } = wavOku(wav);
    const pcm = {
      sampleRate,
      // süreyi TAM 3 ondalığa yuvarla: kanal üreticileri terminal anahtarı
      // `k.push([sure, …])` basıp artan() `+t.toFixed(3)` uyguluyor; ham süre
      // 4. ondalıkta ≥5 taşıyorsa bu anahtar süreyi 0.0005 sn AŞIYOR ve sevk
      // edilen şov denetimi "anahtar sure disinda" kırılıyordu. 3-ondalık süre
      // ile `+sure.toFixed(3) === sure` → terminal anahtar asla süreyi geçmez.
      duration: Math.round(veri.length / sampleRate * 1000) / 1000,
      numberOfChannels: 1,
      getChannelData: () => veri,
    };
    // 3) şablon → cihaz listesi (id'li)
    const cihazlar = idVer(SABLONLAR[sablonAd]());
    // 4) analiz + koreografi
    const analiz = analizEt(pcm);
    // v8: şablon adını GEÇİR → besteci konum-fazlı dalga için geometri modunu
    // (çizgi/daire/ızgara) doğrudan bilir; x,z çıkarımına bel bağlamaz.
    const { kanallar, sure } = timelineUret(analiz, cihazlar, sablonAd);
    // kesin-artan güvence (ornekle ikili arama varsayar) — bozuk dizi ornekle'yi kırar
    for (const k of kanallar)
      for (let i = 1; i < k.anahtarlar.length; i++)
        if (k.anahtarlar[i][0] <= k.anahtarlar[i - 1][0])
          throw new Error(`${k.hedef}: artan degil @${i} (${k.anahtarlar[i - 1][0]} -> ${k.anahtarlar[i][0]})`);
    // 5) aqshow yaz
    const json = aqshowYaz({
      ad: ciktiAd,
      mekan: { fon, plan: null },
      cihazlar,
      cizelge: { sure, kanallar },
      muzikAdi: basename(mp3),
    });
    mkdirSync('studio/ornekler', { recursive: true });
    const hedef = `studio/ornekler/${ciktiAd}.aqshow`;
    writeFileSync(hedef, json);
    console.log(`yazildi: ${hedef}`);
    console.log(`  müzik   : ${basename(mp3)}`);
    console.log(`  şablon  : ${sablonAd}  fon: ${fon}`);
    console.log(`  cihaz   : ${cihazlar.length}   kanal: ${kanallar.length}   süre: ${sure.toFixed(1)}s`);
    console.log(`  analiz  : BPM ${analiz.bpm.toFixed(1)}  beat ${analiz.beatler.length}  onset ${analiz.onsetler.length}  drop ${analiz.droplar.length}  bölüm ${analiz.bolumler.length}`);
    console.log(`  droplar : [${analiz.droplar.map(t => t.toFixed(1)).join(', ')}]`);
  } finally {
    rmSync(gecici, { recursive: true, force: true });
  }
}

main();
