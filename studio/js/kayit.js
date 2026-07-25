// kayit.js — ⭐ VIDEO KAYIT (MediaRecorder + kompozit marka overlay)
// ders/10-video BLOK 14 portu. İki bilinçli değişiklik (plan T14 Step 1):
//  (a) Döngü düzeltmesi (denetim bulgusu): ders kaydı başlatırken döngüyü
//      kapatıp ÖYLE bırakıyordu — kullanıcı ayarı kayboluyordu. Burada kayıt
//      başlarken oncekiDongu saklanır, kayitDurdur döngüyü GERİ KOYAR ve
//      dongubtnGuncelle ile düğme metnini senkron tutar.
//  (b) Marka overlay metinleri parametre (marka.baslik/altBaslik) — varsayılan
//      Aquatronic; clean-room: müşteri/proje adı YOK.
// Kaynaktan iki uyarlama daha (ana.js bağlamı):
//  - sesHedef GEÇ-BAĞLAMA getter'dır (() => MediaStreamDestination | null):
//    ana.js AudioContext'i TEMBEL kurar — modül kurulurken null olabilir.
//    Müzik yüklenmemişse (getter null döner) kayıt yalnız görüntü track'iyle
//    sürer; dersteki doğrudan actx.resume() da buradan çıktı — ses bağlamını
//    aşağıdaki transport.oynat(true) zaten uyandırıyor (ana.js oynat gövdesi).
//  - Düğme metni stüdyonun kompakt transport'una uyar: '🔴' ⇄ '⏹'
//    (ders '🔴 video kaydet' / '⏹ durdur' yazıyordu).
// SINIRLAMA: stream kayıt başında BİR KEZ kurulur — kayıt sürerken yüklenen
// müzik O kayda girmez (bir sonraki kayıtta girer).

export function kayitKur({ renderer, transport, sesHedef, mesaj, dongubtnGuncelle,
                           marka = { baslik: 'AQUATRONIC', altBaslik: 'Show Studio — çeşme şovu önizlemesi' } }) {
  const kayitTuval = document.createElement('canvas');   // WebGL karesi + marka burada birleşir
  const kctx = kayitTuval.getContext('2d');
  let kaydediyor = false, recorder = null, kayitBitTimer = null, oncekiDongu = true, vstream = null;
  const btn = document.getElementById('kayit');

  // Her kayıt karesinde: WebGL canvas'ını kopyala + marka overlay çiz.
  function kareCiz() {
    const c = renderer.domElement;
    if (kayitTuval.width !== c.width || kayitTuval.height !== c.height) {
      kayitTuval.width = c.width; kayitTuval.height = c.height;
    }
    const W = kayitTuval.width, H = kayitTuval.height;
    kctx.drawImage(c, 0, 0, W, H);                       // sahne (preserveDrawingBuffer sayesinde dolu)
    const s = Math.round(H * 0.026);
    kctx.font = `600 ${s}px Consolas, monospace`;
    kctx.textBaseline = 'top';
    kctx.fillStyle = 'rgba(255,255,255,0.9)';
    kctx.fillText(marka.baslik, s, s);
    kctx.font = `${Math.round(s * 0.7)}px Consolas, monospace`;
    kctx.fillStyle = 'rgba(143,211,255,0.75)';
    kctx.fillText(marka.altBaslik, s, s * 2.1);
    // alt bilgi + şov saati
    kctx.textBaseline = 'bottom';
    kctx.fillStyle = 'rgba(143,211,255,0.6)';
    kctx.fillText(`${transport.showT.toFixed(1)} / ${transport.sure.toFixed(1)} s`, s, H - s);
  }

  function kayitBaslat() {
    if (kaydediyor) { kayitDurdur(); return; }
    if (!('MediaRecorder' in window)) { mesaj('bu tarayıcı MediaRecorder desteklemiyor'); return; }
    // ilk kompozit kareyi hazırla (captureStream boyutu doğru okusun)
    kareCiz();
    vstream = kayitTuval.captureStream(30);              // 30 fps video
    const parcalar = [...vstream.getVideoTracks()];
    // ses varsa ekle — hedef null ise (müzik hiç yüklenmedi, actx tembel) yalnız
    // görüntü. Müzik timeline'dan kısaysa müzik-sonrası bölge zaten sessizdir:
    // transport.baslatKaynak offset >= buffer.duration'da kaynağı hiç başlatmaz
    // (T12 devir notu — % sarması sesi yanlış konumdan çalardı).
    const hedef = sesHedef();
    if (transport.buffer && hedef) parcalar.push(...hedef.stream.getAudioTracks());
    const stream = new MediaStream(parcalar);

    const tipler = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
    const mime = tipler.find(t => MediaRecorder.isTypeSupported(t)) || 'video/webm';
    const chunks = [];
    recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8e6 });
    recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    recorder.onstop = () => {
      if (!chunks.length) { mesaj('kayıt boş — indirme yok'); return; }
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'aquatronic-show.webm';
      a.click();                                         // kullanıcının kendi tıkının sonucu = indir
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      mesaj(`video hazır (${(blob.size / 1e6).toFixed(1)} MB) — indiriliyor`);
    };

    // şovu baştan, tek tur, döngüsüz oynat → kaydı bir tam şovla sınırla;
    // kullanıcı ayarı saklanır, kayitDurdur geri koyar (değişiklik (a)).
    oncekiDongu = transport.dongu;
    transport.dongu = false;
    dongubtnGuncelle();
    transport.scrubla(0);
    transport.oynat(true);
    recorder.start(200);
    kaydediyor = true;
    // ⚠textContent YAZMA: düğmede iki inline SVG var, metin ikisini de siler.
    btn.classList.add('kaydediyor'); btn.dataset.durum = 'kaydediyor';
    mesaj(`kayıt başladı (${mime.split(';')[0]}, ${transport.sure.toFixed(0)}s)…`);
    // bir tam şov + küçük pay sonra otomatik dur
    kayitBitTimer = setTimeout(kayitDurdur, transport.sure * 1000 + 300);
  }

  function kayitDurdur() {
    if (!kaydediyor) return;
    clearTimeout(kayitBitTimer);
    kaydediyor = false;
    try { recorder.stop(); } catch (e) {}
    // captureStream'in video track'i durdurulmazsa canvas'ı 30fps yakalamayı
    // sürdürür, tekrarlı kayıtlarda birikir (ders kaynağından miras sızıntı).
    // Ses track'lerine DOKUNMA — sesHedef.stream hoparlörle paylaşılan hedef.
    if (vstream) { vstream.getVideoTracks().forEach(t => t.stop()); vstream = null; }
    transport.dongu = oncekiDongu;                       // döngü durumu GERİ konur (değişiklik (a))
    dongubtnGuncelle();
    btn.classList.remove('kaydediyor'); btn.dataset.durum = 'bekliyor';
  }

  btn.onclick = kayitBaslat;
  // baslat dışarı: ana.js #kayit hash kancası (headless kayıt-yolu smoke'u)
  // hashAnahtar disipliniyle buradan tetikler (dersteki location.hash.includes
  // ana.js'in '&'-parçalı kuralına aykırıydı).
  return { kaydediyor: () => kaydediyor, kareCiz, baslat: kayitBaslat };
}
