// editor.js — katmanlı timeline şerit editörü (plan Task 11).
// Ders 10 BLOK 11'in portu, iki değişiklikle:
//  (a) pahalı kısım (cetvel + lane zeminleri + etiketler + ornekle ile eğri
//      poligonları) offscreen `egriKatman` tuvaline, yalnız `kirli` iken çizilir;
//      her kare yalnız katman-kopya + cue noktaları + playhead (ucuz) koşar.
//  (b) kanallariYenile(): cihaz ekle/sil kanal SAYISINI değiştirir — lane
//      düzeni (kurLayout) yeniden kurulur + kirlet (T10 kalite notu).
// transport'tan yalnız sure/oynat/scrubla tüketilir (showT parametreyle gelir) —
// T12 gerçek transport'u aynı arayüzden takar.
// KONVANSİYON: cizelge.kanallar yerel değişkende CACHE'lenmez — sil()/bestele
// diziyi yeniden atar; kurLayout her çağrıda taze okur.
import { ornekle } from './timeline.js';
import { gruplaLaneler, laneYerlestir, gorunumYarat, zoomla, kaydir,
         katliOku, katliYaz, kanalCihazi } from './serit-duzen.js';
import { elleDamgala } from './proje.js';

// PALET — UI kimlik turu (2026-07-19). ⚠Canvas CSS değişkeni OKUYAMAZ (her karede
// getComputedStyle pahalı), o yüzden değerler burada sayı olarak tekrarlanır.
// Tek otorite `docs/2026-07-19-ui-kimlik.md` "2D tuval karşılıkları" tablosu —
// kayarsa oradan ELLE hizalanır (plan.js ve studio.css ile aynı sayılar).
// ESKİ SORUN: tüm şerit yüzeyleri lacivertti (#0c1420 · #101c2c · #0a121c) ve
// vurgular cyan'dı (#8fd3ff) — arayüz, sahnedeki mavi çeşmeyle aynı renk ailesiydi.
// NEDEN nötr gri + kehribar: yüzey "kontrol paneli", vurgu "burada ben varım" desin.
const PALET = {
  zemin:       '#15171a',            // --zemin    oluk (gutter) + cue nokta kenarı
  yuzey:       '#1b1e22',            // --yuzey    cetvel zemini + grup şeridi zemini
  cizgi:       '#31363d',            // --cizgi    cetvel dikey çizgisi
  metin:       '#d7dade',            // --metin    grup başlığı
  metin3:      '#6d747c',            // --metin-3  cetvel etiketi · tip rozeti · boş durum
  vurgu2:      '#f0a94a',            // --vurgu-2  playhead
  ozetZarf:    'rgba(217,142,51,0.22)', // --vurgu düşük alfa: katlı grup özet zarfı
  seritA:      'rgba(255,255,255,0.02)',   // alternatif şeritleme (nötr, tonsuz)
  seritB:      'rgba(255,255,255,0.045)',
};
// Tipografi: docs'taki --yazi / --yazi-sayi yığınlarının canvas string hâli.
// Mono YALNIZ teknik veride (kanal adı `cihaz.param`, tip rozeti, zaman etiketi);
// düz cümle (boş durum yönlendirmesi) sans — "her şey Consolas" terminal klişesiydi.
const MONO = '"Cascadia Mono", Consolas, ui-monospace, SFMono-Regular, Menlo, monospace';
const SANS = 'system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export function editorKur(ctx) {                 // ctx={tuval, cizelge, transport, kirlet, mesaj}
  // ctx.kirlet burada KULLANILMAZ: cue düzenleme kanal SAYISINI değiştirmez,
  // yerel kirlet yeter. ana.js'in kirlet kancası proje.js→kanallariYenile içindir.
  const { tuval, transport, mesaj } = ctx;       // kanallar hep ctx.cizelge.kanallar'dan taze okunur
  const g2 = tuval.getContext('2d');
  const GUTTER = 138, RULER = 18, KEN_R = 5;
  let layout = null;
  // E1: cihaz grup katlama — kalıcı (localStorage; PROJE BAŞINA cihaz id kümesi).
  // ⚠Eskiden düz id dizisiydi ve id sayacı her yüklemede sıfırlandığı için
  // durum projeler arası sızıyordu (başka şovun `duz_jet_1`'i katlı açılıyordu),
  // üstelik küme hiç budanmadığından sınırsız büyüyordu. Artık anahtar
  // ctx.projeAnahtar() (proje adı) + yazarken var olmayan id'ler budanıyor.
  // Denetim 2026-07-18 bulgusu; saf biçim mantığı serit-duzen.js'te (Node testli).
  const KATLI_LS = 'ss-grup-katli';
  const projeAnahtar = () => ctx.projeAnahtar?.() || 'adsiz';
  // TDZ notu: ana.js'in `projeAd`'i editorKur çağrısından SONRA tanımlanıyor →
  // ilk okuma kurulumda değil, ilk kurLayout'ta (rAF içinde) yapılır.
  let katliProje = null, katliler = new Set();
  // Task 8: ctx.gruplar henüz ana.js durumunda YOK (Task 9'da doğacak) — opsiyonel
  // erişim, bugün boş dizi döner ve hiçbir şey bozulmaz.
  const gruplariAl = () => ctx.gruplar?.() ?? [];
  // ⚠TEK YÖNLÜ kanca: elle damgası BURADA doğuyor ama #gruba-dondur'un görünürlüğü
  // ana.js'in panelGuncelle'sinde hesaplanıyordu ve o yalnız PLAN tuvali olaylarına
  // bağlıydı → şeridi elle düzenleyen kullanıcıda düğme, fare plan tuvaline uğrayana
  // dek gizli kalıyordu (etkileşim koşucusu bulgusu). ana.js paneli tazeler, editörü
  // yeniden ÇİZMEZ — geri çağrı döngüsü yok.
  function katliSenkron() {                      // proje değiştiyse (📁 aç / örnek şov) durumu tazele
    const p = projeAnahtar();
    if (p === katliProje) return;
    katliProje = p;
    katliler = katliOku(localStorage.getItem(KATLI_LS), p);
    // Aynı ADLA kaydedilmiş eski bir şovdan kalan id'ler bugünkü çizelgede
    // olmayabilir — kurLayout kanallar TAZE iken koştuğu için burada budanır.
    // ⚠Grup anahtarları ('g:'+grupId) hiçbir kanal hedefiyle eşleşmez — bu döngü
    // onları cihaz sanıp silerse grup katlama durumu HER proje değişiminde kaybolur
    // (Task 8 tuzağı). Grup anahtarları mevcut grup id'lerine karşı doğrulanır.
    const gecerliGrupAnahtarlari = new Set(gruplariAl().map(g => 'g:' + g.id));
    for (const id of [...katliler]) {
      if (id.startsWith('g:')) { if (!gecerliGrupAnahtarlari.has(id)) katliler.delete(id); continue; }
      if (!ctx.cizelge.kanallar.some(k => kanalCihazi(k.hedef) === id)) katliler.delete(id);
    }
  }
  function katliKaydet() {
    // Grup anahtarları da mevcut sayılmalı, yoksa katliYaz'ın budaması
    // ('g:'+grupId hiçbir kanal cihazıyla eşleşmediği için) onları siler.
    const mevcutCihazlar = [...ctx.cizelge.kanallar.map(k => kanalCihazi(k.hedef)),
                             ...gruplariAl().map(g => 'g:' + g.id)];
    localStorage.setItem(KATLI_LS, katliYaz(localStorage.getItem(KATLI_LS), katliProje, katliler,
      mevcutCihazlar));
  }
  let filtre = null;                             // E2: parametre filtre çipi (null=tümü)
  let gorunum = null, sonSure = 0;               // E2: zaman görünüm penceresi (zoom/pan)

  // --- eğri katmanı (değişiklik a) ---
  let kirli = true;
  const egriKatman = document.createElement('canvas');
  const gK = egriKatman.getContext('2d');
  function kirlet() { kirli = true; }

  function kanalAralik(hedef) {
    if (hedef.endsWith('.hue')) return [0, 1];
    if (hedef.endsWith('.beyaz')) return [0, 1];    // T-C: RGBW beyaz kanalı
    if (hedef.endsWith('.master')) return [0, 1];
    if (hedef.endsWith('.parlaklik')) return [0, 1.5];
    // ⚠1.4 → 1.6: besteci.beatNabziUret 0.9 + 0.6·bas üretiyor, ölçülen tepe
    // 1.471 idi → o cue'lar şeridin DIŞINA düşüyor, tutulup bırakılınca değer
    // sessizce 1.4'e yazılıyordu (kullanıcı taşımak isterken veriyi bozuyordu).
    // Denetim 2026-07-18 bulgusu.
    if (hedef.endsWith('.hiz')) return [0, 1.6];
    if (hedef.endsWith('.pan')) return [-90, 90];   // v3 F3: AquaROBO/SWING servo (derece)
    if (hedef.endsWith('.tilt')) return [0, 45];    // v3 F3: AquaROBO dikey eğim
    return [0, 1];
  }
  // İŞ3 tık.1 — "kör sürükleme" bitti: bir anahtar sürüklenirken değeri GERÇEK
  // BİRİMDE göster. master özel: sayı değil "açık/kapalı" (Salih "master ne?"
  // diyordu). Açı kanalları derece, gerisi yüzde.
  function birimYazi(hedef, v) {
    if (hedef.endsWith('.master'))
      return v >= 0.995 ? 'açık' : v <= 0.005 ? 'kapalı' : '%' + Math.round(v * 100);
    if (hedef.endsWith('.hue')) return Math.round((((v % 1) + 1) % 1) * 360) + '°';
    if (hedef.endsWith('.pan') || hedef.endsWith('.tilt')) return Math.round(v) + '°';
    return '%' + Math.round(v * 100);              // hiz · parlaklik · beyaz
  }
  // Gutter'a kanalın erimini yaz (kör sürüklemede referans). master için sayı
  // değil "kapalı/açık", açıda derece işareti.
  function aralikYazi(hedef) {
    if (hedef.endsWith('.master')) return 'kapalı / açık';
    const [mn, mx] = kanalAralik(hedef);
    const ek = (hedef.endsWith('.pan') || hedef.endsWith('.tilt')) ? '°' : '';
    return `${mn}–${mx}${ek}`;
  }
  // hue lane'i kanalın GERÇEK hue değerinden boya (idx-rengi değil). Ton kaydırınca
  // şerit o rengi gösterir (İŞ3 tık.2). Diğer kanallar idx-renginde kalır.
  const hueRenk = (v) => `hsl(${(((v % 1) + 1) % 1) * 360} 70% 60%)`;
  let suruEtiket = null;                            // {x, y, yazi} — sürükleme sırasında canlı değer etiketi

  function boyutla() {
    const w = tuval.clientWidth, h = tuval.clientHeight;
    const dpr = Math.min(devicePixelRatio, 2);
    tuval.width = w * dpr; tuval.height = h * dpr;
    g2.setTransform(dpr, 0, 0, dpr, 0, 0);
    egriKatman.width = tuval.width; egriKatman.height = tuval.height;
    gK.setTransform(dpr, 0, 0, dpr, 0, 0);
    layout = kurLayout(w, h);
  }
  function kurLayout(w, h) {
    katliSenkron();                              // proje değiştiyse katlı kümesi o projeninki olsun
    const x0 = GUTTER, x1 = w - 12, W = x1 - x0;
    // E1: cihaz grupları + açık kanallar (taze oku, cache yok); kanal rengi
    // GLOBAL kanal indeksinden — katla/aç/filtre renkleri kaydırmaz.
    const lanes = laneYerlestir(
      gruplaLaneler(ctx.cizelge.kanallar, katliler, filtre, gruplariAl()), h, RULER
    ).map((l) => {
      if (l.tip === 'cihaz' || l.tip === 'grup') return l;
      const [min, max] = kanalAralik(l.kanal.hedef);
      // Kanal rengi %70 doygunluktaydı: 20+ neon şerit yan yana gelince arayüzün
      // geri kalanını BASTIRIYORDU (göz nereye bakacağını bilmiyordu). NEDEN %42:
      // ton adımı (47°) aynı kaldığı için kanal ayrımı korunuyor, yalnız şiddeti düşüyor.
      return { ...l, min, max, renk: `hsl(${(l.idx * 47) % 360} 42% 64%)` };
    });
    return { x0, x1, W, RULER, lanes, w, h };
  }
  // (değişiklik b) cihaz ekle/sil sonrası: lane düzeni yeniden + katman kirli
  function kanallariYenile() {
    if (layout) layout = kurLayout(layout.w, layout.h);
    kirlet();
  }

  // E2: eksen eşlemesi görünüm penceresi üzerinden — zoom/pan bedava işler
  const tX = (t) => layout.x0 + ((t - gorunum.t0) / (gorunum.t1 - gorunum.t0)) * layout.W;
  const xT = (px) => gorunum.t0 + ((px - layout.x0) / layout.W) * (gorunum.t1 - gorunum.t0);
  const vY = (lane, v) => lane.yTop + (1 - (v - lane.min) / (lane.max - lane.min)) * lane.laneH;
  const yV = (lane, py) => lane.min + (1 - (py - lane.yTop) / lane.laneH) * (lane.max - lane.min);

  // eski ciz()'in şerit-zemin + eğri kısmı — offscreen katmana, yalnız kirli iken.
  // NOT (T12): cizelge.sure değişirse cetvel/eğriler bayatlar — sure'yi değiştiren
  // yol (müzik yükle) kirlet() çağırmalı.
  function egrileriCiz() {
    const { w, h, lanes } = layout;
    gK.clearRect(0, 0, w, h);
    gK.fillStyle = PALET.yuzey; gK.fillRect(0, 0, w, layout.RULER);
    gK.strokeStyle = PALET.cizgi; gK.fillStyle = PALET.metin3;
    // Zaman etiketi mono kalır: kayan sayı/sütun hizası (docs tipografi kuralı).
    gK.font = `10px ${MONO}`; gK.textBaseline = 'middle';
    // E2: cetvel adımı GÖRÜNÜR aralıktan (zoom'da incelir)
    // v7 G10: adım 5 s'de TAVAN yapıyordu — 5 dakikalık gerçek şarkı yüklenince
    // 69 etiket ~20px arayla basılıp okunmaz bir bulamaca dönüyordu (gerçek
    // tarayıcı bulgusu). Artık merdivenden, etiketler arası EN AZ 58px kalacak
    // şekilde seçilir; 60 s üstünde biçim d:ss (345s yerine 5:45).
    const span = gorunum.t1 - gorunum.t0;
    const pxBasina = (tX(gorunum.t0 + 1) - tX(gorunum.t0)) || 1;   // 1 sn kaç piksel
    const merdiven = [0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900];
    const adim = merdiven.find(a => a * pxBasina >= 58) ?? merdiven[merdiven.length - 1];
    const bicim = (s) => {
      if (adim < 1) return s.toFixed(1) + 's';
      if (span <= 90) return s.toFixed(0) + 's';
      const d = Math.floor(s / 60), sn = Math.round(s - d * 60);
      return d + ':' + String(sn).padStart(2, '0');
    };
    for (let s = Math.ceil(gorunum.t0 / adim) * adim; s <= gorunum.t1 + 0.001; s += adim) {
      const x = tX(s);
      gK.beginPath(); gK.moveTo(x, 0); gK.lineTo(x, h); gK.globalAlpha = 0.25; gK.stroke(); gK.globalAlpha = 1;
      gK.fillText(bicim(s), x + 2, layout.RULER / 2);
    }
    // BOŞ DURUM (denetim 2026-07-18): cihaz yokken şerit alanı bomboş bir
    // dikdörtgendi — kullanıcı burada bir şey olması gerektiğini bile anlamıyordu.
    if (!lanes.length) {
      gK.textAlign = 'center';
      // Yönlendirme düz cümle → sans (mono buradaydı ve "terminal" hissi veriyordu).
      // Emoji (🎼) kaldırıldı: her platformda farklı çizilir, taban çizgisine oturmaz
      // ve renkli olduğu için tek-vurgu (kehribar) disiplinini deliyordu.
      gK.fillStyle = PALET.metin3;
      gK.font = `12px ${SANS}`;
      gK.fillText('cihaz ekleyince her parametre burada bir ŞERİT olur',
        w / 2, layout.RULER + (h - layout.RULER) / 2 - 9);
      gK.fillText('şeride tıkla=anahtar ekle · sürükle=taşı · çift tık=sil · Bestele düğmesi otomatik yazar',
        w / 2, layout.RULER + (h - layout.RULER) / 2 + 11);
      gK.textAlign = 'start';
    }
    for (const lane of lanes) {
      if (lane.tip === 'cihaz' || lane.tip === 'grup') {
        // E1: cihaz başlık şeridi — tık=katla/aç; katlıda mini özet zarfı.
        // Task 8: gerçek grup başlığı (lane.tip==='grup') aynı kalıp + sol kenarda
        // rol etiketi (ritim/melodi/vurgu/ambiyans), SESSİZ tonda.
        gK.fillStyle = PALET.yuzey; gK.fillRect(0, lane.yTop, w, lane.laneH);
        gK.fillStyle = PALET.zemin; gK.fillRect(0, lane.yTop, GUTTER - 2, lane.laneH);
        // Başlık cyan'dı → birincil metin grisi: grup adı bir VURGU değil, etikettir;
        // kehribar bu tuvalde yalnız playhead'e ve katlı özet zarfına ayrıldı.
        gK.fillStyle = PALET.metin; gK.font = `10px ${MONO}`; gK.textBaseline = 'middle';
        if (lane.tip === 'cihaz') {
          gK.fillText((lane.katli ? '▸ ' : '▾ ') + lane.cihaz + ' · ' + lane.kanalSayisi,
            6, lane.yTop + lane.laneH / 2, GUTTER - 12);
        } else {
          gK.fillText((lane.katli ? '▸ ' : '▾ ') + lane.ad + ' · ' + lane.uyeSayisi,
            6, lane.yTop + lane.laneH / 2, GUTTER - 54);
          // Rol etiketi kanal lane'lerindeki tip rozetiyle AYNI konum/ton kalıbı
          // (--metin-3, 9px) — vurgu rengi (kehribar) ALMAZ, tek vurgu playhead +
          // katlı özet zarfına ayrılmış (UI kimlik disiplini).
          gK.fillStyle = PALET.metin3; gK.font = `9px ${MONO}`;
          gK.fillText(lane.rol, GUTTER - 42, lane.yTop + lane.laneH / 2, 36);
        }
        if (lane.katli) {
          // özet zarfı: grubun tüm kanallarının normalize MAKSİMUMU
          // Zarf cyan'dı ve altındaki eğrilerle aynı renk ailesindeydi (katlı mı açık
          // mı belirsizdi) → düşük alfalı kehribar: "bu bir özet, ham veri değil".
          gK.fillStyle = PALET.ozetZarf;
          gK.beginPath(); gK.moveTo(layout.x0, lane.yTop + lane.laneH - 1);
          const N = Math.max(2, Math.round(layout.W / 6));
          for (let s = 0; s <= N; s++) {
            const t = gorunum.t0 + (s / N) * span;
            let mx = 0;
            for (const ki of lane.kanalIdx) {
              const kanal = ctx.cizelge.kanallar[ki];
              const [mn, mxv] = kanalAralik(kanal.hedef);
              if (kanal.anahtarlar.length) mx = Math.max(mx, (ornekle(kanal, t) - mn) / (mxv - mn));
            }
            gK.lineTo(tX(t), lane.yTop + lane.laneH - 1 - Math.min(1, mx) * (lane.laneH - 3));
          }
          gK.lineTo(layout.x1, lane.yTop + lane.laneH - 1); gK.closePath(); gK.fill();
        }
        continue;
      }
      // Şeritleme nötr beyaz alfada kalıyor (tonsuz) — zemin grisi değiştiği için
      // aynı alfa artık lacivert değil gri okunuyor, ayrıca palet jetonu oldu.
      gK.fillStyle = lane.idx % 2 ? PALET.seritA : PALET.seritB;
      gK.fillRect(0, lane.yTop, w, lane.laneH);
      gK.fillStyle = PALET.zemin; gK.fillRect(0, lane.yTop, GUTTER - 2, lane.laneH);
      // Kanal adı (`cihaz.param`) ve tip rozeti mono: sütun hâlinde hizalanan
      // teknik veri — docs tipografi kuralında mono'nun izinli olduğu yerler.
      const hueLane = lane.kanal.hedef.endsWith('.hue');
      gK.fillStyle = lane.renk; gK.font = `11px ${MONO}`; gK.textBaseline = 'middle';
      gK.fillText(lane.kanal.hedef, 8, lane.yTop + lane.laneH / 2, GUTTER - 54); // maxWidth: tip etiketiyle örtüşmez
      // Rozet mavi-griydi (#3a5068), oluk zemininde neredeyse okunmuyordu → --metin-3.
      gK.fillStyle = PALET.metin3; gK.font = `9px ${MONO}`;
      gK.fillText(lane.kanal.tip, GUTTER - 42, lane.yTop + 8);
      // Task 10 elle rozeti: kullanıcı bu kanala doğrudan dokunmuş (elleDamgala).
      // Şeridin SOL ucunda (hedef-adı sütunuyla aynı x, tip rozetiyle simetrik
      // "üst satır") — aynı font boyu + sessiz ton (PALET.metin3, fillStyle zaten
      // tip rozetinden miras). Vurgu (kehribar) ALMAZ: tek vurgu playhead + katlı
      // özet zarfına ayrılmış (UI kimlik disiplini, dosya başı PALET notu).
      if (lane.kanal.kaynak === 'elle') gK.fillText('elle', 8, lane.yTop + 8);
      // İŞ3 tık.1 — lane erimi gutter'ın alt kenarında (yeterli yükseklik varsa):
      // kör sürüklemede "bu şerit nereye kadar gider" referansı.
      if (lane.laneH >= 26) {
        gK.fillStyle = PALET.metin3; gK.font = `9px ${MONO}`; gK.textBaseline = 'bottom';
        gK.fillText(aralikYazi(lane.kanal.hedef), 8, lane.yTop + lane.laneH - 3, GUTTER - 14);
        gK.textBaseline = 'middle';
      }
      if (lane.kanal.anahtarlar.length) {
        gK.lineWidth = 1.5; gK.globalAlpha = 0.9;
        const N = Math.max(2, Math.round(layout.W / 3));
        if (hueLane) {
          // İŞ3 tık.2 — hue eğrisi GERÇEK renkte: her segment kendi hue değeriyle
          // çizilir → ton kaydırınca şerit o rengi gösterir (egriKatman cache'li,
          // maliyet yalnız kirli iken). Segment-segment stroke.
          let px, py;
          for (let s = 0; s <= N; s++) {
            const t = gorunum.t0 + (s / N) * span;
            const v = ornekle(lane.kanal, t);
            const x = tX(t), y = vY(lane, v);
            if (s > 0) { gK.strokeStyle = hueRenk(v); gK.beginPath(); gK.moveTo(px, py); gK.lineTo(x, y); gK.stroke(); }
            px = x; py = y;
          }
        } else {
          gK.strokeStyle = lane.renk; gK.beginPath();
          for (let s = 0; s <= N; s++) {
            const t = gorunum.t0 + (s / N) * span;
            const v = ornekle(lane.kanal, t);
            const x = tX(t), y = vY(lane, v);
            s === 0 ? gK.moveTo(x, y) : gK.lineTo(x, y);
          }
          gK.stroke();
        }
        gK.globalAlpha = 1; gK.lineWidth = 1;
      }
    }
    kirli = false;
  }

  function cueNoktalariCiz() {                    // N nokta — ucuz, her kare
    for (const lane of layout.lanes) {
      if (lane.tip !== 'kanal') continue;
      const hueLane = lane.kanal.hedef.endsWith('.hue');   // İŞ3 tık.2: nokta da gerçek renkte
      for (const [t, v] of lane.kanal.anahtarlar) {
        g2.fillStyle = hueLane ? hueRenk(v) : lane.renk;
        g2.beginPath(); g2.arc(tX(t), vY(lane, v), KEN_R, 0, 7); g2.fill();
        g2.strokeStyle = PALET.zemin; g2.stroke();   // kenar = zemin rengi: nokta şeritten kopuk dursun
      }
    }
  }
  // İŞ3 tık.1 — sürüklenen anahtarın yanında canlı değer etiketi (fareye yakın,
  // gerçek birimde). Headless karede görünmez (etkileşim gerekir); etkilesim.sh
  // + kod incelemesiyle doğrulanır.
  function suruEtiketCiz() {
    if (!suruEtiket) return;
    g2.font = `11px ${MONO}`; g2.textBaseline = 'middle';
    const yazi = suruEtiket.yazi;
    const gen = g2.measureText(yazi).width + 12;
    // noktanın sağ-üstünde; kenardan taşarsa sola/aşağı sığdır
    let x = suruEtiket.x + 10, y = suruEtiket.y - 14;
    if (x + gen > layout.x1) x = suruEtiket.x - 10 - gen;
    if (y < layout.RULER + 8) y = suruEtiket.y + 14;
    g2.fillStyle = PALET.zemin; g2.globalAlpha = 0.92;
    g2.beginPath(); g2.roundRect ? g2.roundRect(x, y - 9, gen, 18, 4) : g2.rect(x, y - 9, gen, 18); g2.fill();
    g2.globalAlpha = 1;
    g2.strokeStyle = PALET.vurgu2; g2.lineWidth = 1; g2.stroke();
    g2.fillStyle = PALET.vurgu2; g2.fillText(yazi, x + 6, y);
  }
  function playheadCiz(showT) {
    const { h } = layout;
    if (showT < gorunum.t0 || showT > gorunum.t1) return;   // görünüm dışı
    const px = tX(showT);
    // Playhead eski neon-kehribardı (#ffd27f); NEDEN --vurgu-2: aynı işlev, kısılmış
    // doygunluk — üst bardaki birincil eylem rengiyle birebir aynı kehribar okunuyor.
    g2.strokeStyle = PALET.vurgu2; g2.lineWidth = 1.5;
    g2.beginPath(); g2.moveTo(px, 0); g2.lineTo(px, h); g2.stroke(); g2.lineWidth = 1;
    g2.fillStyle = PALET.vurgu2;
    g2.beginPath(); g2.moveTo(px - 5, 0); g2.lineTo(px + 5, 0); g2.lineTo(px, 7); g2.fill();
  }

  function ciz(showT) {                           // her kare: ucuz kısım
    const cw = tuval.clientWidth, ch = tuval.clientHeight;
    if (!cw || !ch) return;                       // gizli tuvalde no-op (plan.ciz deseni)
    // E2: görünüm penceresi — süre değişince (müzik yükle) tam genişliğe döner
    if (!gorunum || sonSure !== transport.sure) {
      gorunum = gorunumYarat(transport.sure); sonSure = transport.sure;
      zoomBilgi(); kirli = true;
    }
    // oto-takip: zoom'luyken playhead pencere dışına çıkarsa pencere kayar
    const span = gorunum.t1 - gorunum.t0;
    if (span < transport.sure && (showT < gorunum.t0 || showT > gorunum.t1)) {
      gorunum = kaydir(gorunum, showT - gorunum.t0 - span * 0.15, transport.sure);
      kirli = true;
    }
    if (!layout || layout.w !== cw || layout.h !== ch) { boyutla(); kirli = true; }
    if (kirli) egrileriCiz();
    g2.clearRect(0, 0, layout.w, layout.h);
    g2.drawImage(egriKatman, 0, 0, layout.w, layout.h);
    cueNoktalariCiz();
    playheadCiz(showT);
    suruEtiketCiz();
  }

  // --- etkileşimler (kaynak 755-787, birebir) — anahtar değiştiren her yol kirlet() ---
  let suru = null;
  function fareYer(e) { const r = tuval.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  function laneBul(py) { return layout.lanes.find(l => l.tip === 'kanal' && py >= l.yTop && py < l.yTop + l.laneH); }
  // Task 8: cihaz başlığı (E1) ve gerçek grup başlığı (grup.js) AYRI lane tipleri —
  // tek bulucu ikisini karıştırırsa grup başlığına tık cihaz-katlama koduna düşer
  // (yanlış anahtar: cihaz id yerine grup id, ya da tam tersi).
  function cihazBaslikBul(py) { return layout.lanes.find(l => l.tip === 'cihaz' && py >= l.yTop && py < l.yTop + l.laneH); }
  function grupBaslikBul(py) { return layout.lanes.find(l => l.tip === 'grup' && py >= l.yTop && py < l.yTop + l.laneH); }
  function cueBul(px, py) {
    for (const lane of layout.lanes) {
      if (lane.tip !== 'kanal') continue;
      const a = lane.kanal.anahtarlar;
      for (let i = 0; i < a.length; i++) {
        const dx = tX(a[i][0]) - px, dy = vY(lane, a[i][1]) - py;
        if (dx * dx + dy * dy <= (KEN_R + 3) * (KEN_R + 3)) return { lane, idx: i };
      }
    }
    return null;
  }
  tuval.addEventListener('pointerdown', (e) => {
    if (!layout || !gorunum) return;
    const { x, y } = fareYer(e);
    if (e.button === 1) {                        // E2: orta tuş = pan
      e.preventDefault();
      suru = { pan: true, sonX: x };
      tuval.setPointerCapture(e.pointerId);
      return;
    }
    if (y < layout.RULER) { transport.oynat(false); transport.scrubla(xT(x)); suru = { scrub: true }; tuval.setPointerCapture(e.pointerId); return; }
    // Task 8: gerçek grup başlığına tık = katla/aç ('g:'+grupId), cihaz başlığına
    // tık = katla/aç (düz cihaz id) — AYRI yollar (bkz. cihazBaslikBul/grupBaslikBul notu).
    const grupBaslik = grupBaslikBul(y);
    if (grupBaslik) {
      const anahtar = 'g:' + grupBaslik.grupId;
      grupBaslik.katli ? katliler.delete(anahtar) : katliler.add(anahtar);
      katliKaydet();
      kanallariYenile();
      // ⭐Grup yeniden-seçim yolu (danışman kararı, Task 10 ön şartı): grup
      // başlığına tık AYNI ZAMANDA o grubu panelde seçer — tek jest, iki etki.
      // Katla/aç davranışı yukarıda değişmedi; bu yalnız EK bir yan etki.
      // Opsiyonel çağrı: ctx.grupSec sağlanmazsa (eski kurulum/test) sessizce geçilir.
      ctx.grupSec?.(grupBaslik.grupId);
      return;
    }
    // E1: cihaz başlığına tık = katla/aç (kalıcı)
    const grup = cihazBaslikBul(y);
    if (grup) {
      grup.katli ? katliler.delete(grup.cihaz) : katliler.add(grup.cihaz);
      katliKaydet();
      kanallariYenile();
      return;
    }
    const hit = cueBul(x, y);
    if (hit) {
      suru = hit;                                  // İŞ3 tık.1: yakalar yakalamaz değeri göster (fareyi kımıldatmadan)
      const [ht, hv] = hit.lane.kanal.anahtarlar[hit.idx];
      suruEtiket = { x: tX(ht), y: vY(hit.lane, hv), yazi: birimYazi(hit.lane.kanal.hedef, hv) };
      tuval.setPointerCapture(e.pointerId);
      return;
    }
    const lane = laneBul(y);
    if (lane && x > layout.x0) {
      const t = Math.max(0, Math.min(transport.sure, xT(x)));
      const v = Math.max(lane.min, Math.min(lane.max, yV(lane, y)));
      const yeni = [t, v];
      elleDamgala(lane.kanal); ctx.panelTazele?.();   // elle dokunuldu — varsayılan bayrağı düşür
      lane.kanal.anahtarlar.push(yeni);
      lane.kanal.anahtarlar.sort((p, q) => p[0] - q[0]);
      suru = { lane, idx: lane.kanal.anahtarlar.indexOf(yeni) };  // referans kimliği — eş [t,v] ikizini kapmaz
      suruEtiket = { x: tX(t), y: vY(lane, v), yazi: birimYazi(lane.kanal.hedef, v) };  // İŞ3 tık.1
      tuval.setPointerCapture(e.pointerId);
      kirlet();
    }
  });
  tuval.addEventListener('pointermove', (e) => {
    if (!suru) return;
    const { x, y } = fareYer(e);
    if (suru.pan) {                              // E2: orta tuş sürükle — pencereyi kaydır
      const span = gorunum.t1 - gorunum.t0;
      gorunum = kaydir(gorunum, ((suru.sonX - x) / layout.W) * span, transport.sure);
      suru.sonX = x;
      kirlet();
      return;
    }
    if (suru.scrub) { transport.scrubla(xT(x)); return; }
    const { lane } = suru;
    elleDamgala(lane.kanal); ctx.panelTazele?.();     // elle dokunuldu
    const a = lane.kanal.anahtarlar;
    // ⚠KELEPÇE SIRASI: komşular arası boşluk 0.02 sn'den DARSA prev > next olur
    // ve max(prev, ...) kazanıp anahtarı ardılının ÖNÜNE geçirirdi → dizi artan
    // olmaktan çıkar, Zamanlayici.ornekle ikili araması (artan varsayar) o
    // bölgede kalıcı yanlış değer döndürürdü. Besteci'nin hue sarma çifti
    // ([t,1],[t+0.001,0]) tam bu deseni üretiyor. Denetim 2026-07-18 bulgusu.
    const altSinir = suru.idx > 0 ? a[suru.idx - 1][0] : 0;
    const ustSinir = suru.idx < a.length - 1 ? a[suru.idx + 1][0] : transport.sure;
    const bosluk = Math.min(0.01, Math.max(0, (ustSinir - altSinir) / 2));
    const prev = altSinir + (suru.idx > 0 ? bosluk : 0);
    const next = ustSinir - (suru.idx < a.length - 1 ? bosluk : 0);
    a[suru.idx][0] = Math.max(prev, Math.min(Math.max(prev, next), xT(x)));
    a[suru.idx][1] = Math.max(lane.min, Math.min(lane.max, yV(lane, y)));
    // İŞ3 tık.1: canlı değer etiketi — anahtarın (kelepçelenmiş) konumundan
    suruEtiket = { x: tX(a[suru.idx][0]), y: vY(lane, a[suru.idx][1]),
                   yazi: birimYazi(lane.kanal.hedef, a[suru.idx][1]) };
    kirlet();
  });
  tuval.addEventListener('pointerup', () => { suru = null; suruEtiket = null; });
  tuval.addEventListener('pointercancel', () => { suru = null; suruEtiket = null; });
  function cueSil(x, y) {
    if (!layout) return;
    const hit = cueBul(x, y);
    if (hit && hit.lane.kanal.anahtarlar.length > 1) {
      elleDamgala(hit.lane.kanal); ctx.panelTazele?.();  // elle dokunuldu
      hit.lane.kanal.anahtarlar.splice(hit.idx, 1);
      kirlet();
      mesaj('cue silindi: ' + hit.lane.kanal.hedef);
    }
  }
  tuval.addEventListener('dblclick', (e) => { const p = fareYer(e); cueSil(p.x, p.y); });
  tuval.addEventListener('contextmenu', (e) => { e.preventDefault(); const p = fareYer(e); cueSil(p.x, p.y); });

  // --- E2: zoom (ctrl+tekerlek, imleç-merkezli) + pan (shift+tekerlek) ---
  tuval.addEventListener('wheel', (e) => {
    if (!layout || !gorunum) return;
    if (!e.ctrlKey && !e.shiftKey) return;       // düz tekerlek sayfaya kalsın
    e.preventDefault();
    const { x } = fareYer(e);
    if (e.ctrlKey) {
      gorunum = zoomla(gorunum, xT(x), e.deltaY < 0 ? 1.25 : 0.8, transport.sure);
    } else {
      const span = gorunum.t1 - gorunum.t0;
      gorunum = kaydir(gorunum, Math.sign(e.deltaY) * span * 0.15, transport.sure);
    }
    zoomBilgi();
    kirlet();
  }, { passive: false });

  // E2: parametre filtre çipleri (bar ana.js'ten gelir; yoksa sessiz geç)
  const bar = ctx.bar ?? null;
  if (bar) {
    bar.querySelectorAll('.cip').forEach((cip) => cip.addEventListener('click', () => {
      filtre = cip.dataset.filtre || null;
      bar.querySelectorAll('.cip').forEach((c) => c.classList.toggle('aktif', c === cip));
      kanallariYenile();
    }));
  }
  function zoomBilgi() {
    const el = bar?.querySelector('#zoom-bilgi');
    if (el && gorunum) el.textContent = (transport.sure / (gorunum.t1 - gorunum.t0)).toFixed(1) + '×';
  }

  return { ciz, kirlet, kanallariYenile };
}
