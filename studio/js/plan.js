// plan.js — PLAN görünümü: 2D tuval (DXF/PNG zemin + cihaz yerleşimi).
// three yok — saf canvas 2D. Dünya birimi metre; dünya↔piksel dönüşümü tek
// gorunum={cx,cz,olcek} nesnesi (Ders 8 timeline tX/xT deseninin 2D hali;
// fareYer/cihazBul = ders/10-video fareYer/cueBul deseni).
// yonetici arayüzü: liste()/ekle(tur,x,z)/tasi(id,x,z)/dondur(id,delta)/sil(id)
// — proje.js cihazYonetici (Task 10) takılı.
// DXF (x,y) düzlemi dünya (x,z) düzlemine birebir eşlenir (y→z).

// PALET — UI kimlik turu (2026-07-19). ⚠Canvas CSS değişkeni OKUYAMAZ: her karede
// getComputedStyle('--zemin') çağırmak pahalı, o yüzden değerler burada sayı olarak
// tekrarlanır. Tek otorite `docs/2026-07-19-ui-kimlik.md` "2D tuval karşılıkları"
// tablosu — kayarsa oradan ELLE hizalanır (studio.css ile aynı sayılar).
const PALET = {
  zemin:       '#15171a',   // --zemin      tuval zemini
  izgaraInce:  '#232830',   // ızgara ince çizgi
  izgaraAna:   '#333a43',   // --cizgi-2    ızgara ana çizgi (her 5.)
  etiket:      '#6d747c',   // --metin-3    metre etiketi
  dxfCizgi:    '#5a626c',   // DXF zemin çizgisi
  bosDurum:    '#6d747c',   // --metin-3    boş durum metni
  seciliHalka: '#f0a94a',   // --vurgu-2    seçili cihaz halkası
  lastikDolgu: 'rgba(217,142,51,.10)',
  lastikKenar: '#d98e33',   // --vurgu
  kalibre:     '#d98e33',   // --vurgu
  cihazVars:   '#949aa2',   // --metin-2    tablo dışı tür (nötr gri)
};
// Tipografi: docs'taki --yazi / --yazi-sayi yığınlarının canvas string hâli.
const MONO = '"Cascadia Mono", Consolas, ui-monospace, SFMono-Regular, Menlo, monospace';
const SANS = 'system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

// vario: şablonlar artık AquaVARIO'yu katalog arketipi `vario` ile döşüyor
// (denetim 2026-07-18) — renk tablosunda karşılığı yoktu, gri varsayılana düşüyordu.
//
// ⚠ESKİ SORUN 1: tüm türler mavi-cyan tonlarındaydı (#8fd3ff / #8fc6ff / #a8c8f0…);
// duz_jet, vario ve geyser ÜÇÜ DE birebir #8fd3ff idi — planda ayırt edilemiyorlardı.
// Üstelik bu ton ailesi sahnenin (gece çeşmesi = mavi/cyan) tam ortasıydı, arayüz
// şovla yarışıyordu.
//
// ⚠ESKİ SORUN 2 (bu turun ilk denemesi, düzeltildi): doygunluk %38'e indirilip
// 11 tür 144°–305° arasına SABİT açıklıkla sıkıştırılmıştı. Bitişik türler arası
// yalnız 13–14° ton farkı kalıyordu (drydeck/laminer, vario/duz_jet/geyser) ve
// %38 doygunlukta 13° fark ekranda FİİLEN AYNI RENK — "türler ayrışsın" hedefi
// yarım kalıyordu.
//
// NEDEN BÖYLE: ayrım artık ÜÇ bağımsız kaldıraca dağıtıldı, tek başına tona
// yüklenmiyor —
//   1) TON tüm çembere yayıldı (100°–318°, ışık 38°). Bitişik su türleri arası
//      fark 13° değil ~20–28°.
//   2) AÇIKLIK dönüşümlü: 72 / 58 / 66 kaydırması, bitişik hiçbir tür aynı L'de
//      değil. Değer farkı ton körlüğünde ve gri tonlamada bile okunur —
//      yalnız renge bağlı ayrım erişilebilir değil.
//   3) BİÇİM (ciz() içinde): su = dolu daire · ışık = içi boş halka ·
//      servolu = dolu daire + yön çizgisi. Renkten TAMAMEN bağımsız işaret.
// Doygunluk %38'de SABİT kalıyor — sakinliği veren o, ona dokunulmadı.
//
// Ton bölgeleri: su cihazları soğuk-geniş (100°–265°), ışık kehribar-nötr (38°,
// tek sıcak ton), servolu cihazlar (robo/swing) mor-magenta (288°/318°).
// ⚠HEX yazılıyor, hsl() DEĞİL: test/uygulama-borclari.test.mjs tabloyu kaynak
// metninde `vario: '#` deseniyle arıyor (şablon eşlemesi borcu). Yorumdaki HSL
// değerleri üretim formülü — ton değiştirmek gerekirse oradan yeniden türetilir.
const CIHAZ_RENK = {
  drydeck:  '#AFD39C',   // hsl(100 38% 72%) su — fıstık yeşili (açık)
  laminer:  '#6BBD76',   // hsl(128 38% 58%) su — yeşil (koyu)
  yelpaze:  '#87C9AE',   // hsl(155 38% 66%) su — yeşil-turkuaz (orta)
  vario:    '#9CD3D3',   // hsl(180 38% 72%) su — camgöbeği (açık)
  duz_jet:  '#6B9BBD',   // hsl(205 38% 58%) su — mavi (koyu)
  geyser:   '#8795C9',   // hsl(228 38% 66%) su — indigo (orta)
  switch:   '#A49CD3',   // hsl(248 38% 72%) su — menekşe-mavi (açık)
  aquajet:  '#8D6BBD',   // hsl(265 38% 58%) su — mor-mavi (koyu)
  rgb_spot: '#C9B187',   // hsl(38  38% 66%) ışık — kehribar (tek sıcak ton)
  robo:     '#BC87C9',   // hsl(288 38% 66%) servo — mor (orta)
  swing:    '#BD6BA4',   // hsl(318 38% 58%) servo — magenta (koyu)
  // ⚠v7 POP turu: AquaPOP JET `switch` arketipinden koptu (kolon değil ~20-40 cm
  // su topu) → tabloda karşılığı yoktu ve planda nötr griye (cihazVars) düşüyordu.
  // Bu, hemen yukarıdaki `vario` yorumunun uyardığı regresyonun aynısı: arketip
  // eklenir, renk tablosu unutulur, cihaz planda kimliksiz kalır.
  // 75° seçildi çünkü tablodaki TEK geniş boşluk orası (38° ışık ile 100° drydeck
  // arası); su ailesinin soğuk bandına girmiyor, ışığın kehribarından 37° uzak.
  pop:      '#A8BD6B',   // hsl(75  38% 58%) su — limon-zeytin (koyu)
};
// Işık ailesi: renkten BAĞIMSIZ biçim işareti (içi boş halka) alan türler.
// Küme olarak duruyor ki yeni ışık arketipi (ör. rgbw_spot) eklenince tek satır olsun.
const HALKA_TURLERI = new Set(['rgb_spot']);
const CIHAZ_R = 7;                                     // cihaz noktası yarıçapı (px)

// SAF seçim budaması (Node testli): şablon/proje yüklemesi tüm cihazları silip
// yeniden doğurur, id'ler DEĞİŞİR — `secili`/`coklu` eski id'leri tutuyordu.
// Sonuç: sağdaki "SEÇİLİ CİHAZ" paneli "—" gösteriyor ama seçim varmış gibi
// davranıyor, Delete/R hiçbir şeye denk gelmediği için sessiz no-op oluyordu.
// Denetim 2026-07-18 bulgusu. `coklu` yerinde budanır, yeni `secili` döner.
export function secimBuda(mevcutIdler, secili, coklu) {
  const mevcut = mevcutIdler instanceof Set ? mevcutIdler : new Set(mevcutIdler);
  for (const id of [...coklu]) if (!mevcut.has(id)) coklu.delete(id);
  if (secili !== null && !mevcut.has(secili)) return [...coklu].pop() ?? null;
  return secili;
}

export function planKur({ tuval, yonetici, mesaj }) {
  const g = tuval.getContext('2d');
  const gorunum = { cx: 0, cz: 0, olcek: 30 };         // 30 px/metre başlangıç
  let planVeri = null;     // {tip:'dxf', parcalar, ad} | {tip:'png', img, ad, genislikM}
  let secili = null, tasima = null, aktifTur = null, aktifUrun = null;   // paletten seçilen tür + katalog ürünü (T-E)
  const coklu = new Set();   // Ctrl/Shift+tık VEYA kare seçim; Delete/R/sürükle TOPLUCA işler
  let secim = null;          // AutoCAD tarzı kare seçim: {x0,y0,x1,y1,ekle} (px)
  let kalibre = null;                                  // {p1:[x,z]|null} iki-nokta modu
  let pan = null;                                      // {px,py,cx,cz} sürükleme başlangıcı
  let fareSon = null;                                  // kalibre lastik-çizgisi için dünya [x,z]

  const pxX = (x) => tuval.clientWidth / 2 + (x - gorunum.cx) * gorunum.olcek;
  const pxZ = (z) => tuval.clientHeight / 2 + (z - gorunum.cz) * gorunum.olcek;
  const dunyaX = (px) => (px - tuval.clientWidth / 2) / gorunum.olcek + gorunum.cx;
  const dunyaZ = (py) => (py - tuval.clientHeight / 2) / gorunum.olcek + gorunum.cz;

  // metin+kumulatifOlcek: .aqshow kaydı için (T15 durum()) — ham DXF saklanır,
  // kalibrasyon çarpanları ayrı birikir (birimOlcek her yüklemede dosyadan gelir).
  // T-0: büyük-dosya yolunda ham metin YOK (worker Float32Array döndürür) → metin=null,
  // durum() o zaman işlenmiş parçaları gömer ('dxf-parcalar' varyantı).
  function dxfKur(r, ad, metin) {                        // ortak gövde: metin=null → büyük-dosya yolu
    let olcek = r.birimOlcek;
    if (olcek === null) { mesaj('DXF birimi bilinmiyor — 📏 ölçek ile kalibre et (şimdilik 1 birim = 1 m)'); olcek = 1; }
    if (planVeri?.tip === 'png') planVeri.img.close();   // eski bitmap'i deterministik bırak
    const parcalar = r.parcalar.filter(s => s.length === 4 && s.every(Number.isFinite))   // dosyadan gelen bozuk parça NaN sızdırmasın
                               .map(s => s.map(v => v * olcek));
    planVeri = { tip: 'dxf', ad, metin, kumulatifOlcek: 1, parcalar };
    const not = [];
    if (r.atlanan) not.push(`${r.atlanan} desteklenmeyen entity atlandı`);
    if (r.dusen) not.push(`${r.toplam} parça → ${parcalar.length}'e sadeleştirildi`);
    if (not.length) mesaj(not.join(' · '));
    ciz();
  }
  function dxfYukle(metin, ad, dxfAyristir) {            // küçük-dosya yolu (mevcut imza)
    try { dxfKur(dxfAyristir(metin), ad, metin); }
    catch (e) { mesaj('DXF okunamadı: ' + e.message + ' — PNG olarak dene'); }
  }
  function dxfSonucYukle(r, ad) { dxfKur(r, ad, null); } // worker/aqshow-parçalar yolu
  function pngYukle(img, ad) {
    if (planVeri?.tip === 'png') planVeri.img.close();     // eski bitmap'i deterministik bırak
    planVeri = { tip: 'png', img, ad, genislikM: 20 }; ciz();
  }

  function olcekle(carpan) {                           // iki-nokta kalibrasyonundan
    if (planVeri?.tip === 'dxf') { planVeri.parcalar = planVeri.parcalar.map(s => s.map(v => v * carpan)); planVeri.kumulatifOlcek *= carpan; }
    if (planVeri?.tip === 'png') planVeri.genislikM *= carpan;
    ciz();
  }

  function ciz() {
    const w = tuval.clientWidth, h = tuval.clientHeight;
    if (!w || !h) return;                              // PLAN gizliyken (layout 0) çizme
    // ⚠DPR: şerit tuvali (editor.js) bitmap'i devicePixelRatio ile ölçekliyordu,
    // plan tuvali ölçeklemiyordu → 1.25x/2x ekranda plan görünümü şeritlerin
    // yanında bulanık kalıyordu (gerçek tarayıcı turu 2026-07-18). Bitmap DPR'lı,
    // çizim koordinatları CSS px'te kalsın diye g.setTransform ile ölçekliyoruz —
    // böylece pxX/dunyaX ve tüm fare hesapları (clientWidth tabanlı) DEĞİŞMEDEN çalışır.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);   // 2 üstü bellek/hız kaybı
    const bw = Math.round(w * dpr), bh = Math.round(h * dpr);
    if (tuval.width !== bw) tuval.width = bw;
    if (tuval.height !== bh) tuval.height = bh;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Zemin eskiden lacivertti (#0f141c) — sahnenin mavisinden ayrışmıyordu;
    // NEDEN: nötr koyu gri (--zemin) şovla aynı renk ailesinde değil, sınır geri geldi.
    g.fillStyle = PALET.zemin;
    g.fillRect(0, 0, w, h);

    // v7 G11: METRE IZGARASI — planda hiçbir ölçek referansı yoktu, cihazların
    // kaç metre arayla durduğu okunmuyordu. Adım zoom'a göre merdivenden seçilir
    // (çizgiler arası en az 26px), her 5. çizgi vurgulu + metre etiketi.
    const merdiven = [0.25, 0.5, 1, 2, 5, 10, 20, 50, 100];
    const adim = merdiven.find(a => a * gorunum.olcek >= 26) ?? merdiven[merdiven.length - 1];
    const x0 = Math.floor(dunyaX(0) / adim) * adim, x1 = dunyaX(w);
    const z0 = Math.floor(dunyaZ(0) / adim) * adim, z1 = dunyaZ(h);
    g.lineWidth = 1;
    // Etiket 9px'te okunmuyordu (mavi-gri #38506a + minik punto) → 10px + --metin-3.
    // Font mono kalıyor: metre değeri kayan sayı, monospace sütunu hizalı tutar.
    g.font = `10px ${MONO}`; g.textBaseline = 'top';
    for (let x = x0; x <= x1; x += adim) {
      const vurgu = Math.abs(x / adim % 5) < 1e-6;
      g.strokeStyle = vurgu ? PALET.izgaraAna : PALET.izgaraInce;
      const px = Math.round(pxX(x)) + 0.5;
      g.beginPath(); g.moveTo(px, 0); g.lineTo(px, h); g.stroke();
      if (vurgu) { g.fillStyle = PALET.etiket; g.fillText(x.toFixed(adim < 1 ? 2 : 0) + 'm', px + 2, 2); }
    }
    for (let z = z0; z <= z1; z += adim) {
      const vurgu = Math.abs(z / adim % 5) < 1e-6;
      g.strokeStyle = vurgu ? PALET.izgaraAna : PALET.izgaraInce;
      const py = Math.round(pxZ(z)) + 0.5;
      g.beginPath(); g.moveTo(0, py); g.lineTo(w, py); g.stroke();
      if (vurgu) { g.fillStyle = PALET.etiket; g.fillText(z.toFixed(adim < 1 ? 2 : 0) + 'm', 2, py + 2); }
    }

    // zemin: PNG (merkezli, genislikM ölçekli, yarı saydam)
    if (planVeri?.tip === 'png') {
      const img = planVeri.img;
      const wM = planVeri.genislikM, hM = wM * img.height / img.width;
      g.globalAlpha = 0.5;
      g.drawImage(img, pxX(-wM / 2), pxZ(-hM / 2), wM * gorunum.olcek, hM * gorunum.olcek);
      g.globalAlpha = 1;
    }
    // zemin: DXF çizgileri
    if (planVeri?.tip === 'dxf') {
      // DXF zemini mavi-griydi (#3a5068) ve cihaz noktalarıyla aynı aileye
      // düşüyordu; NEDEN nötr gri: zemin "arka plan", cihaz "içerik" diye ayrışsın.
      g.strokeStyle = PALET.dxfCizgi;
      g.lineWidth = 1;
      g.beginPath();
      for (const [x1, z1, x2, z2] of planVeri.parcalar) {
        g.moveTo(pxX(x1), pxZ(z1));
        g.lineTo(pxX(x2), pxZ(z2));
      }
      g.stroke();
    }

    // Seçim budaması ciz()'in içinde: cihaz listesini değiştiren HER yol (ekle/
    // sil/şablon/proje aç) zaten ciz() ile bitiyor → tek kapı, çağıranın ayrıca
    // bir "seçimi tazele" çağırmasını beklemeye gerek kalmıyor.
    const idler = new Set(yonetici.liste().map(c => c.id));
    secili = secimBuda(idler, secili, coklu);

    // BOŞ DURUM (denetim 2026-07-18): editör ilk açıldığında plan bomboş bir
    // ızgara, şeritler boş — kullanıcıya "şimdi ne yapayım" diye tek bir işaret
    // verilmiyordu. Vitrin sitesinde ilk ekran budur; yönlendirme şart.
    // Palette bir ürün seçilmişse metin "tıkla" adımına geçer (döşeme modundayız).
    if (!yonetici.liste().length && !planVeri) {
      g.textAlign = 'center';
      // Yönlendirme metni düz cümledir, hizalanan sayı değil → mono yığın yerine
      // sans yığın (mono "terminal teması" klişesini üretiyordu, kimlik turu kararı).
      g.fillStyle = PALET.bosDurum;
      g.font = `13px ${SANS}`;
      const satirlar = aktifTur
        ? [`${aktifUrun || aktifTur} seçili — plana TIKLA`, 'sağ tık / ESC döşemeyi bitirir']
        // ⚠ASCII kalsın: font artık sans (①②③ çoğu sistem sans'ında VAR) ama glif
        // varlığı platforma göre değişiyor ve yedek fonta düşünce satır hizası
        // kayıyor — sayıyı "1)" biçiminde yazmak her yerde AYNI çiziliyor.
        : ['1) soldaki paletten bir ürün seç, plana tıkla',
           '2) şeritlerden koreografi yaz  ·  şablon menüsü hazır yerleşim döşer',
           '3) örnek şov dolu bir koreografi açar  ·  DXF/PNG müşteri planını zemine koyar'];
      satirlar.forEach((s, i) => g.fillText(s, w / 2, h / 2 - 12 + i * 20));
      g.textAlign = 'start';
    }

    // cihazlar: renkli daireler; laminer'e yön çizgisi; seçili olana kehribar halka.
    // Yön: three rotation.y=θ → +x ekseni dünya (cosθ, -sinθ) yönüne döner.
    for (const c of yonetici.liste()) {
      const x = pxX(c.x), y = pxZ(c.z);
      if (['laminer', 'yelpaze', 'robo', 'swing'].includes(c.tur)) {   // yönü olan cihazlar (laminer/yelpaze azimut, robo/swing servo tabanı)
        const a = (c.aci || 0) * Math.PI / 180, L = CIHAZ_R * 2.6;
        g.strokeStyle = CIHAZ_RENK[c.tur];
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + Math.cos(a) * L, y - Math.sin(a) * L);
        g.stroke();
        g.lineWidth = 1;
      }
      // AİLE BİÇİMİ (renkten bağımsız ayrım): renk tek başına yeterli değil —
      // ton körlüğünde, düşük parlaklıkta ekranda ve gri baskıda kayboluyor.
      // su = dolu daire · ışık = içi boş halka · servolu = dolu daire + yön çizgisi
      // (yön çizgisi zaten yukarıda çiziliyor, üçüncü aile işareti bedava geldi).
      // ⚠YARIÇAP VE İSABET DOKUNULMADI: halka da CIHAZ_R'yi doldurur (dış kenar
      // CIHAZ_R'de biter), cihazBul mesafe hesabı ve isabet testi aynen geçerli.
      const renk = CIHAZ_RENK[c.tur] || PALET.cihazVars;
      if (HALKA_TURLERI.has(c.tur)) {
        g.strokeStyle = renk;
        g.lineWidth = 2.5;
        g.beginPath(); g.arc(x, y, CIHAZ_R - 1.25, 0, 2 * Math.PI); g.stroke();
        g.lineWidth = 1;
      } else {
        g.fillStyle = renk;
        g.beginPath(); g.arc(x, y, CIHAZ_R, 0, 2 * Math.PI); g.fill();
      }
      if (c.id === secili || coklu.has(c.id)) {
        // Beyaz halka parlak su/ışık cihazlarının üstünde kayboluyordu (ikisi de
        // açık ton) → kehribar: paletteki tek sıcak renk, hiçbir cihaz tonuyla karışmaz.
        g.strokeStyle = PALET.seciliHalka;
        g.lineWidth = 2;
        g.beginPath(); g.arc(x, y, CIHAZ_R + 3, 0, 2 * Math.PI); g.stroke();
        g.lineWidth = 1;
      }
    }

    // kare seçim lastiği (AutoCAD tarzı)
    if (secim) {
      const x = Math.min(secim.x0, secim.x1), y = Math.min(secim.y0, secim.y1);
      const sw = Math.abs(secim.x1 - secim.x0), sh = Math.abs(secim.y1 - secim.y0);
      // Lastik cyan'dı, cihaz noktalarıyla aynı ton → seçim çerçevesi cihaz sanılıyordu.
      g.fillStyle = PALET.lastikDolgu;
      g.fillRect(x, y, sw, sh);
      g.strokeStyle = PALET.lastikKenar;
      g.setLineDash([5, 4]);
      g.strokeRect(x, y, sw, sh);
      g.setLineDash([]);
    }

    // kalibre modu: p1 noktası + fareye lastik çizgi
    if (kalibre?.p1) {
      const x = pxX(kalibre.p1[0]), y = pxZ(kalibre.p1[1]);
      // Eski #ffd27f neon-kehribardı (çok açık+doygun); NEDEN --vurgu: aynı marka
      // rengi ama kısılmış, üst bardaki birincil eylemle AYNI kehribar okunuyor.
      g.fillStyle = PALET.kalibre;
      g.beginPath(); g.arc(x, y, 4, 0, 2 * Math.PI); g.fill();
      if (fareSon) {
        g.strokeStyle = PALET.kalibre;
        g.setLineDash([4, 4]);
        g.beginPath(); g.moveTo(x, y); g.lineTo(pxX(fareSon[0]), pxZ(fareSon[1])); g.stroke();
        g.setLineDash([]);
      }
    }
  }

  // --- etkileşimler (Ders 8 fareYer/cueBul deseni) ---
  function fareYer(e) {
    const r = tuval.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function cihazBul(px, py) {
    const l = yonetici.liste();
    for (let i = l.length - 1; i >= 0; i--) {          // üstte çizilen önce yakalanır
      const dx = pxX(l[i].x) - px, dy = pxZ(l[i].z) - py;
      if (dx * dx + dy * dy <= (CIHAZ_R + 3) * (CIHAZ_R + 3)) return l[i];
    }
    return null;
  }

  // v3 F7: sağ tık döşeme modunu bırakır (tarayıcı menüsü bastırılır)
  tuval.addEventListener('contextmenu', (e) => {
    if (aktifTur) { e.preventDefault(); aktifTur = null; aktifUrun = null; mesaj('döşeme bitti'); ciz(); }
  });

  tuval.addEventListener('pointerdown', (e) => {
    const { x: px, y: py } = fareYer(e);
    const wx = dunyaX(px), wz = dunyaZ(py);
    if (e.button === 2 && aktifTur) return;            // sağ tık: contextmenu'de bırakıldı, cihaz ekleme
    if (e.button === 1) {                              // orta tuş → pan (her yerde)
      e.preventDefault();
      pan = { px, py, cx: gorunum.cx, cz: gorunum.cz };
      tuval.setPointerCapture(e.pointerId);
      return;
    }
    if (kalibre) {                                     // iki-nokta kalibrasyonu
      if (!kalibre.p1) { kalibre.p1 = [wx, wz]; mesaj('ikinci noktayı tıkla'); ciz(); return; }
      const olculen = Math.hypot(wx - kalibre.p1[0], wz - kalibre.p1[1]);
      kalibre = null;
      if (olculen < 1e-6) { mesaj('iki nokta çakışık — kalibrasyon iptal'); ciz(); return; }
      const gercek = parseFloat(prompt('İki nokta arasındaki gerçek mesafe (m)?'));
      if (!Number.isFinite(gercek) || gercek <= 0) { mesaj('kalibrasyon iptal'); ciz(); return; }
      olcekle(gercek / olculen);
      mesaj(`ölçek ×${(gercek / olculen).toFixed(3)} uygulandı`);
      return;
    }
    if (aktifTur) {                                    // paletten tür seçiliyken tıkla → ekle
      // v3 F7 SÜREKLİ DÖŞEME (Salih: "döşerken tekrar basmam gerekmesin"):
      // mod AÇIK KALIR — her tıklama yeni cihaz; sağ tık veya ESC bırakır.
      const id = yonetici.ekle(aktifTur, wx, wz, aktifUrun);   // sözleşme: string id (T10) + katalog ürünü (T-E)
      if (id) { secili = id; mesaj((aktifUrun || aktifTur) + ' eklendi — sağ tık/ESC döşemeyi bitirir'); }
      ciz();
      return;
    }
    const c = cihazBul(px, py);
    if (c) {                                           // cihaz üstünde → seç + sürükle-taşı
      if (e.shiftKey || e.ctrlKey) {                   // Ctrl/Shift+tık → seçime ekle/çıkar (sürükleme başlatmaz)
        if (secili) coklu.add(secili);
        if (coklu.has(c.id)) { coklu.delete(c.id); if (secili === c.id) secili = [...coklu].pop() ?? null; }
        else { coklu.add(c.id); secili = c.id; }
        mesaj(`${coklu.size} cihaz seçili — sürükle=taşı · R=döndür · Delete=sil`);
        ciz();
        return;
      }
      if (coklu.has(c.id)) {                           // seçili grubun üyesinden tut → TOPLU taşıma
        secili = c.id;
        tasima = { ids: [...coklu], sonX: wx, sonZ: wz };
        tuval.setPointerCapture(e.pointerId);
        ciz();
        return;
      }
      secili = c.id;
      coklu.clear();
      tasima = { id: c.id };
      tuval.setPointerCapture(e.pointerId);
      ciz();
      return;
    }
    // boşlukta sol sürükle → KARE SEÇİM (AutoCAD tarzı; pan ORTA tuşta).
    // Ctrl/Shift basılıysa mevcut seçime EKLER, değilse temiz başlar.
    secim = { x0: px, y0: py, x1: px, y1: py, ekle: e.shiftKey || e.ctrlKey };
    if (!secim.ekle) { secili = null; coklu.clear(); }
    tuval.setPointerCapture(e.pointerId);
    ciz();
  });

  tuval.addEventListener('pointermove', (e) => {
    const { x: px, y: py } = fareYer(e);
    fareSon = [dunyaX(px), dunyaZ(py)];
    if (secim) { secim.x1 = px; secim.y1 = py; ciz(); return; }
    if (pan) {
      gorunum.cx = pan.cx - (px - pan.px) / gorunum.olcek;
      gorunum.cz = pan.cz - (py - pan.py) / gorunum.olcek;
      ciz();
      return;
    }
    if (tasima) {
      if (tasima.ids) {                                // toplu taşıma: artımlı delta hepsine
        const dx = dunyaX(px) - tasima.sonX, dz = dunyaZ(py) - tasima.sonZ;
        const l = yonetici.liste();
        for (const id of tasima.ids) {
          const c = l.find((v) => v.id === id);
          if (c) yonetici.tasi(id, c.x + dx, c.z + dz);
        }
        tasima.sonX = dunyaX(px); tasima.sonZ = dunyaZ(py);
      } else {
        yonetici.tasi(tasima.id, dunyaX(px), dunyaZ(py));
      }
      ciz();
      return;
    }
    if (kalibre?.p1) ciz();                            // lastik çizgiyi tazele
  });

  tuval.addEventListener('pointerup', (e) => {
    if (secim) {                                       // kare seçimi sonuçlandır
      const { x: px, y: py } = fareYer(e);
      const x0 = Math.min(secim.x0, px), x1 = Math.max(secim.x0, px);
      const y0 = Math.min(secim.y0, py), y1 = Math.max(secim.y0, py);
      if (x1 - x0 > 4 || y1 - y0 > 4) {                // 4px altı = boş tık (seçim temizleme)
        for (const c of yonetici.liste()) {
          const cx = pxX(c.x), cy = pxZ(c.z);
          if (cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1) coklu.add(c.id);
        }
        secili = [...coklu].pop() ?? null;
        if (coklu.size) mesaj(coklu.size + ' cihaz seçili — sürükle=taşı · R=döndür · Delete=sil');
      }
      secim = null;
      ciz();
    }
    pan = null; tasima = null;
  });

  tuval.addEventListener('wheel', (e) => {             // imleç-merkezli zoom
    e.preventDefault();
    const { x: px, y: py } = fareYer(e);
    const wx = dunyaX(px), wz = dunyaZ(py);
    gorunum.olcek = Math.min(400, Math.max(2, gorunum.olcek * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
    gorunum.cx = wx - (px - tuval.clientWidth / 2) / gorunum.olcek;   // imleç altındaki
    gorunum.cz = wz - (py - tuval.clientHeight / 2) / gorunum.olcek;  // dünya noktası sabit
    ciz();
  }, { passive: false });

  addEventListener('keydown', (e) => {
    if (e.target.matches('input,textarea,select') || e.target.isContentEditable) return;
    if (tuval.offsetParent === null) return;           // PLAN görünür değilken pasif
    if (e.key === 'Escape' && aktifTur) {              // v3 F7: ESC döşemeyi bitirir
      aktifTur = null; aktifUrun = null; mesaj('döşeme bitti'); ciz(); return;
    }
    if (!secili && !coklu.size) return;
    if (e.key === 'r' || e.key === 'R') {              // toplu döndürme: seçimin hepsine
      if (coklu.size) for (const id of coklu) yonetici.dondur(id, 15);
      else if (secili) yonetici.dondur(secili, 15);
      ciz();
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (coklu.size) {                                // v3: toplu silme
        for (const id of coklu) yonetici.sil(id);
        mesaj(coklu.size + ' cihaz silindi');
        coklu.clear();
      } else if (secili) yonetici.sil(secili);
      secili = null;
      ciz();
    }
  });

  function seciliSil() {                               // panel × düğmesi buradan gelir
    if (coklu.size) { for (const id of coklu) yonetici.sil(id); coklu.clear(); secili = null; ciz(); return; }
    if (!secili) return;
    yonetici.sil(secili);
    secili = null;
    ciz();
  }

  // .aqshow'a giren plan durumu (T15): yalnız DXF serileşir (ham metin JSON'a
  // sığar); PNG bitmap'i serileşmez → null döner, kayıtta plan alanı boş kalır.
  function durum() {
    if (planVeri?.tip !== 'dxf') return null;
    return planVeri.metin
      ? { tip: 'dxf', dosyaAdi: planVeri.ad, olcek: planVeri.kumulatifOlcek, veri: planVeri.metin }
      : { tip: 'dxf-parcalar', dosyaAdi: planVeri.ad,          // ham metin yok: ölçek İŞLENMİŞ parçalar gömülür
          parcalar: planVeri.parcalar.map(s => s.map(v => +v.toFixed(3))) };
  }

  // T16 küçük API dokunuşu (durum() deseninin yanına): zeminin ham tipi —
  // 💾 anında "PNG zemin kaydedilmez" uyarısı planVeri'yi dışarı sızdırmadan
  // buradan sorar (durum() PNG'de null döner, "PNG var" ile "zemin yok" ayrımı yapamaz).
  function zeminTipi() { return planVeri?.tip ?? null; }

  // Zemini kaldır (T16 kalite bulgusu): plansız .aqshow açılırken çağrılır —
  // eski PNG/DXF kalırsa sonraki 💾 yanlış "PNG zemin" uyarısı verirdi.
  function temizle() {
    if (planVeri?.tip === 'png') planVeri.img.close();   // bitmap'i deterministik bırak
    planVeri = null; ciz();
  }

  // v7 G11: içeriği kadraja oturt. Şablon 30+ cihaz döşüyordu ama görünüm
  // ölçeği/merkezi sabit kalıyordu → yerleşimin bir kısmı üst/alt kenardan
  // KIRPIK açılıyordu (gerçek tarayıcı bulgusu). Cihazlar + varsa zemin
  // sınırları kapsanır, kenarda `dolgu` payı bırakılır.
  function kadrajaOturt(dolgu = 0.12) {
    const w = tuval.clientWidth, h = tuval.clientHeight;
    if (!w || !h) return;
    const noktalar = yonetici.liste().map(c => [c.x, c.z]);
    if (planVeri?.tip === 'png') {
      const wM = planVeri.genislikM, hM = wM * planVeri.img.height / planVeri.img.width;
      noktalar.push([-wM / 2, -hM / 2], [wM / 2, hM / 2]);
    } else if (planVeri?.tip === 'dxf') {
      for (const s of planVeri.parcalar)
        for (let i = 0; i + 1 < s.length; i += 2) noktalar.push([s[i], s[i + 1]]);
    }
    if (!noktalar.length) return;                      // boş sahnede kadraj değişmez
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const [x, z] of noktalar) {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
    }
    gorunum.cx = (minX + maxX) / 2;
    gorunum.cz = (minZ + maxZ) / 2;
    // Tek cihazda genişlik 0 olur → sıfıra bölme yerine 4 m'lik makul pencere.
    const gX = Math.max(maxX - minX, 4), gZ = Math.max(maxZ - minZ, 4);
    const olcek = Math.min(w / gX, h / gZ) * (1 - dolgu);
    gorunum.olcek = Math.max(3, Math.min(200, olcek));
    ciz();
  }

  return {
    dxfYukle, dxfSonucYukle, pngYukle, olcekle, ciz, seciliSil, durum, zeminTipi, temizle,
    kadrajaOturt,
    // turSec ↔ kalibreBaslat birbirini iptal eder: ikisi de pointerdown'ı tükettiği
    // için bir arada kalırlarsa kalibrasyon bitince askıdaki tür beklenmedik cihaz eklerdi
    turSec: (t, urun = null) => { aktifTur = t; aktifUrun = urun; kalibre = null; },
    aktifTur: () => aktifTur,
    seciliId: () => secili,
    cokluIdler: () => [...coklu],
    kalibreBaslat: () => { kalibre = { p1: null }; aktifTur = null; mesaj('bilinen mesafenin iki ucunu tıkla'); ciz(); },
  };
}
