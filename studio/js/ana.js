import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { HueSaturationShader } from 'three/addons/shaders/HueSaturationShader.js';
import { BrightnessContrastShader } from 'three/addons/shaders/BrightnessContrastShader.js';
import { motorKur, PRESETLER } from './motor.js';
import { mekanKur } from './mekan.js';
import { RippleSim } from './ripple.js';
import { kameraKur, KAMERA_CEKIMLER } from './kamera.js';
import { sahneCercevesi } from './geometri.js';   // kamera dili v2 otomatik çerçeveleme
import { planKur } from './plan.js';
import { dxfAyristir } from './dxf.js';
import { cihazYonetici, aqshowYaz, aqshowOku, hueRgb, elleDamgala, isikModulAlirMi } from './proje.js';   // hueRgb: İŞ3 panel renk karesi; isikModulAlirMi: 412C ışık modülü kutusu (Faz 1 Task 3, künye-tabanlı)
import { LaminerJet } from './laminer.js';   // proje.js'e enjekte edilir (proje.js Node-saf kalsın — T15)
import { yeniCizelge, Zamanlayici, ornekle } from './timeline.js';   // ornekle: İŞ3 playhead'de kanal örnekleme
import { editorKur } from './editor.js';
import { analizEt, timelineUret, sentetikPCM } from './besteci.js';
import { rainbow, chase, fade, strobe } from './desen.js';
import { kayitKur } from './kayit.js';
import { suSesiKur } from './ses.js';
import { KATALOG, urunCoz, urunBul } from '../data/katalog.js';
import { vitrinKur, kadrajHesapla, cetvelYap } from './vitrin.js';
import { SABLONLAR } from './sablon.js';
import { birlestirKoruyarak, gruplariDogrula, gruplarYenidenAdlandir, yeniGrup, dizilimAlgila, grupDerle, grupElleKanallari } from './grup.js';

// hash anahtarları — includes('demo') KULLANMA: '#plandemo' da 'demo' içerir,
// demo kancasını yanlışlıkla ateşlerdi. '&' ile ayrılmış tam parçalar esas.
const hashAnahtar = new Set(location.hash.slice(1).split('&'));

// WebGL2 kapısı (spec §10)
const testCanvas = document.createElement('canvas');
if (!testCanvas.getContext('webgl2')) {
  document.getElementById('webgl-uyari').hidden = false;
  throw new Error('WebGL2 yok');
}

export const scene = new THREE.Scene();
// v7 M5: sis erimi 55 → 130. Eski değerde 55 m ötesi TAMAMEN sis rengine
// gömülüyordu, bu yüzden şehir 19 m'ye kadar sokulmak zorundaydı ve kadrajı
// eziyordu ("arka plan boş" şikâyetinin diğer yüzü: derinlik yoktu). Geniş
// erim = çok katmanlı şehir uzakta durup atmosferik perspektifle soluyor.
scene.fog = new THREE.Fog(0x050810, 40, 260);
// v7 G13: far düzlemi 100 m idi — M5'te şehir halkaları 78/125/180 m'ye
// taşınınca dış iki katman TAMAMEN kırpılıyordu (silüet tek katman gibi
// görünüyordu, derinlik kayboluyordu). 400 m: en uzak halka + sis erimi (260)
// rahat sığar. logarithmicDepthBuffer KAPALI (renderer'da açılmıyor), o yüzden
// aralığı büyütürken yakın düzlem de 0.1→0.3 çıkarıldı: derinlik hassasiyetini
// belirleyen far/near ORANI ve asıl bedeli near ödüyor. 0.3 m kamera
// yörüngesinden çok daha yakın, kırpma riski yok.
export const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.3, 400);
camera.position.set(7, 4, 11);
export const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
// v6 F7 kamera paketi (rapor: inandırıcılık POZLAMADA): ACES filmik eğri —
// parlak çekirdek yumuşak omuzla doyar (alev turuncu kalır, linear kırpma
// beyazlatıyordu), karanlık su karanlık kalır. Pozlama auto-exposure'la oynar.
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.prepend(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 2.5, 0);
controls.enableDamping = true;

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
// Keskinlik mini-paketi: ucuz FXAA — kenar tırtıklarını RenderPass'tan hemen
// sonra (bloom/star/grading'den ÖNCE) temizler. FPS laptopta düşerse bu pass
// çıkarılır (spec: "ucuzsa ekle, FPS düşerse çıkar") — GÖRSEL KAPI'da karar.
const fxaaPass = new ShaderPass(FXAAShader);
{
  const dpr = renderer.getPixelRatio();
  fxaaPass.material.uniforms.resolution.value.set(1 / (innerWidth * dpr), 1 / (innerHeight * dpr));
}
composer.addPass(fxaaPass);
// Envanter #1 HDR disiplini (vario cila turu): eşik yükseldi ki glow yalnız
// gerçek parlak öğelerde (nozul glow, köpük tepe, ışık gölü) toplansın; sahne
// geneli süt-beyazı yıkanmasın (Depence monokrom blok hissinin temeli).
// 0.45 → 0.62 kalibrasyonu vario-hedef-1 kıyasıyla yapıldı; strength/radius aynı.
// Keskinlik mini-paketi (2026-07-22): UnrealBloomPass'ın KENDİ mip render
// target'ları yalnız kurucudaki resolution'dan gelir (composer.setSize
// pixelRatio'yu otomatik uygular ama İLK resize olayına kadar DEĞİL) — bu
// yüzden inşa anında renderer'ın gerçek pixel ratio'suyla ÇARPILIR, yoksa
// ilk kare (resize olmadan) bloom zincirinde 1×'te bulanık kalır.
// #tani-bloomsuz: görsel teşhis — bloom'u zincirden tamamen çıkarır. "Işık
// karesi" gibi artefaktlarda tetikleyicinin bloom mu yoksa altındaki additive
// katman mı olduğunu ayırmak için (motor.js TANI bayraklarıyla aynı protokol).
const dpr = renderer.getPixelRatio();
if (!hashAnahtar.has('tani-bloomsuz'))
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth * dpr, innerHeight * dpr), 0.75, 0.55, 0.62));
// v6 F7 star-burst: SEÇKİN parlaklıklara (eşik 0.85 — yalnız glint/çekirdek
// tepesi) 4-kollu yatay-dikey yıldız; gece kamerası mercek artefaktı. Bloom
// SONRASI, OutputPass (tonemap) ÖNCESİ — linear HDR'da eşik anlamlı.
const yildizPass = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uOran: { value: innerHeight / innerWidth } },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uOran;
    varying vec2 vUv;
    void main() {
      vec4 taban = texture2D(tDiffuse, vUv);
      vec3 yildiz = vec3(0.0);
      const float BOY = 0.055;           // kol boyu (uv, dikey referans)
      for (int i = 1; i <= 6; i++) {
        float f = float(i) / 6.0;
        float w = pow(1.0 - f, 2.4);
        vec2 dx = vec2(BOY * uOran, 0.0) * f;
        vec2 dy = vec2(0.0, BOY) * f;
        yildiz += (max(texture2D(tDiffuse, vUv + dx).rgb - 0.85, 0.0)
                 + max(texture2D(tDiffuse, vUv - dx).rgb - 0.85, 0.0)
                 + max(texture2D(tDiffuse, vUv + dy).rgb - 0.85, 0.0)
                 + max(texture2D(tDiffuse, vUv - dy).rgb - 0.85, 0.0)) * w;
      }
      gl_FragColor = vec4(taban.rgb + yildiz * 0.14, taban.a);
    }`
});
// v7 IŞIK turu — KART v2 K2: star-burst artık VARSAYILAN KAPALI. Kırınım
// çivileri yalnız KISIK diyaframda (f/11+) oluşur; gerçek gece çeşme çekimi
// f/1.8-2.8'de yapılır ve orada yumuşak hale + bloom vardır, çivi YOKTUR
// (docs/2026-07-18-su-alti-isik-referansi.md §4.2). Konulduğunda göz onu
// "sahte/render" diye okuyor — Salih'in kamaşma şikâyetinin bir parçası.
// Silmedim: `#starburst` hash'i ile geri açılır (kıyas turu için).
if (hashAnahtar.has('starburst')) composer.addPass(yildizPass);
composer.addPass(new OutputPass());
// Renk canlılığı mini-paketi (2026-07-22): OutputPass (ACES tonemap +
// colorspace) SONRASI tek global doygunluk/kontrast dokunuşu — Depence
// demo karelerindeki doygun monokrom blok hissine yaklaşmak için (defter
// cila satırları). Değerler modest başlar; GÖRSEL KAPI'da Salih ayarıyla
// kilitlenir (abartı guard'ı: cihaz kalibrasyonlarını bozmasın).
const canliPass = new ShaderPass(HueSaturationShader);
canliPass.uniforms.saturation.value = 0.12;
composer.addPass(canliPass);
const kontrastPass = new ShaderPass(BrightnessContrastShader);
kontrastPass.uniforms.contrast.value = 0.06;
composer.addPass(kontrastPass);

const motor = motorKur(renderer, scene, camera, {
  glowsuz:  hashAnahtar.has('tani-glowsuz'),       // nozul kaynak parlaması kapalı
  golsuz:   hashAnahtar.has('tani-golsuz'),        // su cihazının ışık gölü kapalı
  govdesiz: hashAnahtar.has('tani-govdesiz'),      // su cihazının gövdesi gizli
  disksiz:  hashAnahtar.has('tani-disksiz'),       // 412 halka diski gizli
  halkaGolsuz: hashAnahtar.has('tani-halkagolsuz') // 412'nin KENDİ ışık gölü gizli
});
const ripple = new RippleSim(renderer);      // v6 F6: çarpma halkası sim'i
motor.cozunurlukGuncelle();

// kamera: sinematik oto-orbit (şov modunda akar; kullanıcı dokununca 20 sn serbest)
const kam = kameraKur(camera, controls);

// mekan: havuz + ıslak zemin (Reflector) + fon galerisi; kabuk boş sahneyle
// geldi, kaldırılacak eski ground yok — sadece ekle.
const mekan = mekanKur(scene);
const fonSecim = document.getElementById('fon');
for (const ad of mekan.fonAdlari) {
  const o = document.createElement('option'); o.value = ad; o.textContent = 'fon: ' + ad;
  fonSecim.appendChild(o);
}
fonSecim.value = mekan.aktifFon;
fonSecim.onchange = () => mekan.fonSec(fonSecim.value);
// M1 smoke kancası: #fon=<ad> → açılışta o fon (headless kare kıyası; anlık geçiş)
const fonHash = [...hashAnahtar].find((s) => s.startsWith('fon='));
if (fonHash && mekan.fonAdlari.includes(fonHash.slice(4))) {
  mekan.fonSec(fonHash.slice(4), 0);   // headless kare: geçişsiz, deterministik
  fonSecim.value = fonHash.slice(4);
}

// --- mod geçişi ---
let mod = 'sov';                       // 'sov' | 'editor'
export function modAyarla(m) {
  mod = m;
  document.body.classList.remove('mod-sov', 'mod-editor');
  document.body.classList.add('mod-' + m);
  document.getElementById('sov-ui').hidden = (m !== 'sov');
  document.getElementById('editor-ui').hidden = (m !== 'editor');
  // şova klavyeyle (Tab) dönüşte UI görünür başlasın — pointermove beklemesin
  document.getElementById('sov-ui').classList.remove('gizli');
}
addEventListener('keydown', (e) => {
  if (e.target.matches('input,textarea,select') || e.target.isContentEditable) return;
  if (e.key === 'Tab') { e.preventDefault(); modAyarla(mod === 'sov' ? 'editor' : 'sov'); }
});
// Kamera dili v2: yalnız şov modunda, 1-4 tuşu ÇEKİM başlatır (poz atlamaz —
// kamera yumuşakça gider ve varınca hareketine devam eder, bkz. kamera.js).
// Aynı input-odak koruması Tab handler'ıyla (yukarı) tutarlı.
addEventListener('keydown', (e) => {
  if (e.target.matches('input,textarea,select') || e.target.isContentEditable) return;
  if (mod !== 'sov') return;
  const n = Number(e.key);
  if (Number.isInteger(n) && n >= 1 && n <= kam.cekimSayisi) {
    kam.cekimBaslat(n - 1);
    mesajGoster('kamera: ' + KAMERA_CEKIMLER[n - 1].ad);
  }
});
document.getElementById('mod-sov-btn').onclick = () => modAyarla('sov');
// E3: şerit yüksekliği — ayraç sürükleme, localStorage kalıcı
{
  const seritKap = document.getElementById('serit-kap');
  seritKap.style.height = (localStorage.getItem('ss-serit-h') ?? 240) + 'px';
  const ayrac = document.getElementById('serit-ayrac');
  // ⚠DİNLEYİCİ SIZINTISI (denetim 2026-07-18): eskiden her `pointerdown` YENİ bir
  // `pointermove` bağlıyor, kaldırma tek bir `{once:true}` `pointerup`'a asılıydı.
  // İkinci bir pointer (dokunmatik) veya ikinci tuş basımı ikinci bir çift
  // doğuruyor, ilk `pointerup` iki kaldırıcıyı birden tüketiyordu → hem askıda
  // dinleyici hem de sürüklemenin yarıda ölmesi. Artık editor.js/plan.js ile aynı
  // desen: dinleyiciler BİR KEZ bağlı, durum tek `surukle` nesnesinde ve yalnız
  // yakalanan pointerId işleniyor (pointercancel/lostpointercapture de bırakır).
  let surukle = null;
  ayrac.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    ayrac.setPointerCapture(e.pointerId);
    surukle = { id: e.pointerId, bas: e.clientY, basH: seritKap.offsetHeight };
  });
  ayrac.addEventListener('pointermove', (e) => {
    if (!surukle || e.pointerId !== surukle.id) return;
    const h = Math.max(120, Math.min(innerHeight * 0.6, surukle.basH + (surukle.bas - e.clientY)));
    seritKap.style.height = h + 'px';
    localStorage.setItem('ss-serit-h', h);
  });
  const ayracBirak = (e) => { if (surukle && e.pointerId === surukle.id) surukle = null; };
  ayrac.addEventListener('pointerup', ayracBirak);
  ayrac.addEventListener('pointercancel', ayracBirak);
  ayrac.addEventListener('lostpointercapture', ayracBirak);
}
if (hashAnahtar.has('mod=editor')) modAyarla('editor');

// --- şov modu oto-gizlenen UI (Task 7) ---
// pointermove'da #sov-ui görünür + 4 sn hareketsizlikte 'gizli' sınıfı geri eklenir;
// oynatma duruyorsa (transport.oynuyor=false) hiç gizlenmez — zamanlayıcı ateşlense
// bile kontrol ateşleme anında yapılır, böylece duraklatma sırasında zaten bekleyen
// bir zamanlayıcı da UI'ı gizleyemez. (transport aşağıda tanımlı — callback yalnız
// kullanıcı hareketinden sonra koşar, TDZ riski yok.)
const sovUi = document.getElementById('sov-ui');
let gizleZamanlayici = null;
addEventListener('pointermove', () => {
  if (mod !== 'sov') return;           // editörde gizleme döngüsü boşa çalışmasın
  sovUi.classList.remove('gizli');
  clearTimeout(gizleZamanlayici);
  gizleZamanlayici = setTimeout(() => { if (transport.oynuyor) sovUi.classList.add('gizli'); }, 4000);
});

export function mesajGoster(m) {
  const el = document.getElementById('mesaj');
  el.textContent = m; el.style.opacity = '1';
  clearTimeout(mesajGoster._t);
  mesajGoster._t = setTimeout(() => { el.style.opacity = '0'; }, 2600);
}

// --- proje: cihaz yöneticisi + çizelge + zamanlayıcı (Task 10) ---
// cizelge: boş iskelet — cihaz ekledikçe cihazYonetici varsayılan kanalları
// doğurur, T11 editörü / T12 transport dolduracak.
const cizelge = yeniCizelge();
let gruplar = [];        // F1: cihaz grupları — yazım katmanı (grup.js), .aqshow'a serileşir
// F1 Task 9b: grup id sayacı — cihazYonetici'nin id sayacı gibi HİÇ sıfırlanmaz.
// sahneKur dosyadan gruplar yüklerken (aşağıda) yüklenen "gN" id'lerine göre
// yukarı çekilir — yoksa yeni grup, dosyadaki bir grupla AYNI id'yi doğurabilir
// (gruplarYenidenAdlandir yalnız ÜYELERİ remap eder, grubun kendi id'sine dokunmaz).
let grupSayac = 0;
// F1 Task 9b: panelde DÜZENLENEN grup — yalnız #grupla tıklamasıyla dolar (spec:
// şerit grup başlığına tık ile seçim İSTEĞE BAĞLI, bu turda uygulanmadı).
// panelSonId ile birlikte çalışır: plan.seciliId() DEĞİŞİRSE (kullanıcı planda
// başka bir seçim yaptı) grup modu sessizce biter — aksi halde panel eski
// grubu göstermeye devam eder, cihaz seçilmiş gibi görünüp "SEÇİLİ CİHAZ" ile
// "GRUP" panelleri çelişirdi.
let secilGrupId = null;
let panelSonId = null;
function grupSayacGuncelle(liste) {                  // bkz. grupSayac tanımı — id çakışması önlenir
  for (const g of liste) { const m = /^g(\d+)$/.exec(g.id); if (m) grupSayac = Math.max(grupSayac, +m[1]); }
}
// kirlet: geç-bağlama sarmalayıcı — cihazYonetici editorKur'dan ÖNCE kurulur;
// kanca aşağıda editor.kanallariYenile'ye bağlanır (T10 kalite notu: düz
// editor.kirlet DEĞİL — cihaz ekle/sil kanal SAYISINI değiştirir, lane düzeni
// kurLayout ile yeniden kurulmazsa yeni/silinen şerit yanlış görünür).
let editorKanca = () => {};
// F1 Task 9a: cihaz silme/ekleme yonetici.ekle/sil'in HER çağrısında kirlet()'i
// tetikler (proje.js: ekle/sil sonunda ctx.kirlet()) — bu, grup üyesi budamasının
// TEK boğaz noktası. `yonetici` burada henüz tanımlı değil (aşağıda kurulur) ama
// bu ok fonksiyonunun gövdesi yalnız ÇAĞRILDIĞINDA koşar; kirlet fiilen ilk kez
// ancak yonetici.ekle/sil çağrılınca (yani yonetici tanımlandıktan SONRA) tetiklenir
// — cihazYonetici(ctx) çağrısının kendisi ekle/sil'i senkron çağırmaz, yalnız
// tanımlar. TDZ riski yok (doğrulandı: proje.js'te ekle/sil'in ctx.kirlet() çağrısı
// yalnız fonksiyon gövdesinde, kurulum sırasında değil).
const kirlet = () => {
  gruplar = gruplariDogrula(gruplar, yonetici.liste().map(c => c.id));
  editorKanca();
};
// v3 F4 çarpma kuyruğu: akış kesilince su kütlesi ~balistik uçuş süresi sonra
// yüzeye döner — çarpma sesi showT ile SENKRON çalınır (rAF boşaltır; duraklamada
// showT durur → kuyruk bekler; scrub ileri atlarsa bayat girdiler çalınmaz).
// vario: şablonlar AquaVARIO'yu artık katalog arketipiyle döşüyor (denetim
// 2026-07-18) — tabloda yoktu, jenerik varsayılana (0.8/0.6) düşüyordu; duz_jet
// ile aynı kolon karakteri olduğundan onun değerleri verildi.
const CARPMA_GECIKME = { duz_jet: 1.1, vario: 1.1, geyser: 0.7, yelpaze: 0.8, switch: 0.7,
  robo: 1.0, swing: 0.9, drydeck: 0.5, aquajet: 1.5, laminer: 0.6 };
const CARPMA_SIDDET = { geyser: 1.0, aquajet: 1.0, duz_jet: 0.8, vario: 0.8, yelpaze: 0.7,
  switch: 0.6, robo: 0.5, swing: 0.5, drydeck: 0.4, laminer: 0.4 };
const carpmaKuyruk = [];
const yonetici = cihazYonetici({ motor, scene, cizelge, kirlet, mesaj: mesajGoster, LaminerJet,
  carpma: (tur) => carpmaKuyruk.push({ t: transport.showT + (CARPMA_GECIKME[tur] ?? 0.8),
                                       siddet: CARPMA_SIDDET[tur] ?? 0.6 }) });
const zamanlayici = new Zamanlayici(cizelge, yonetici.kayitTablosu);

// #demo kancası: kabuğu cihazlarla doldurup motoru gözle test etmek için —
// artık yalnız yonetici.ekle üzerinden (T10 öncesi doğrudan motor çağrılarıyla
// aynı yerleşim; laminer 30° mutlak açı dondur ile verilir, ekle 0° başlatır).
if (hashAnahtar.has('demo')) {
  yonetici.ekle('duz_jet', -2, 0);
  yonetici.ekle('geyser', 2, 0);
  yonetici.ekle('rgb_spot', -4, 3);
  yonetici.ekle('rgb_spot', 4, 3);
  yonetici.ekle('rgb_spot', 0, -4);
  yonetici.dondur(yonetici.ekle('laminer', 0, -2), 30);
}

// #vitrin=<urun ad> — cihaz denetim tezgahi (tools/vitrin.sh bunu kullanir).
// Tek cihaz, sade fon, cihazin KENDI montaj sinifi, metre cetveli. Kadraj
// cihazin beklenen tepesinden hesaplanir → 20 m AquaAIR ile 0.4 m POP ayni
// tezgahta okunur. mekanizma 26/28 urunde null; vitrinKur optional chaining
// ile korur, buradaki yol TypeError'a hic dokunmaz.
const vitrinHash = [...hashAnahtar].find((s) => s.startsWith('vitrin='));
if (vitrinHash) {
  const urunAd = decodeURIComponent(vitrinHash.slice('vitrin='.length));
  const v = vitrinKur(urunAd);
  const kunye = urunBul(urunAd);
  if (v && kunye) {
    mekan.fonSec(v.zemin?.fon ?? 'sade', 0);   // cihazin montaj sinifi fonunu SEC (vitrin.js TEZGAH_ZEMIN);
                                          // kuru_meydan → 'kuru' (su gizli), yoksa 'sade'. ikinci arg SANIYE, 0=aninda
    // laminer 40° eğik atış: dikey tepe ~1.2 m ama yatayda ~5 m gider → tepeye
    // göre kadraj inişi (ve kopma-uç patlamasını) çerçeve dışında bırakıyordu.
    // Yatay menzili kapsayan efektif çerçeve kullan + kamerayı atış ortasına
    // kaydır. Cetvel AYNI efektif tepeyle türer → metre ölçeği tutarlı kalır.
    const laminerMi = kunye.arketip === 'laminer';
    const kadrajTepe = laminerMi ? 5.5 : v.zarf.su.tepeM;
    const yatayKay = laminerMi ? 2.4 : 0;   // arkı çerçeveye ortalayan yatay pan
    const k = kadrajHesapla(kadrajTepe, camera);
    camera.position.set(k.konum.x + yatayKay, k.konum.y, k.konum.z);
    controls.target.set(k.bakis.x + yatayKay, k.bakis.y, k.bakis.z);
    controls.update();
    kam.sabitle();                        // oto-orbit kadraji kaydirmasin
    scene.add(cetvelYap(kadrajTepe));
    yonetici.ekle(kunye.arketip, 0, 0, urunAd);   // KONUMSAL, urun adi 4. arg
    // Sorun A — RENKSIZLIK: vitrin cihazi TEK BASINA kuruluyordu, dibinde halka
    // yok → motor.js isikBesle beslemiyor (uHalkaSayi=0, vEkIsik=0) → su yalniz
    // soluk tabanla cikiyor, "renksiz" gorunuyordu. Gercek sovda su dipteki
    // AquaLIGHT'tan renk alir. Cihazin DIBINE (0,0) sabit renkli bir halka koy ki
    // su boyansin. Kimlik ATAMIYORUZ — sabit tek TEAL yeter, amac "renk aliyor mu".
    // Halkanin varsayilan .hue kanali DONEN rampadir (hueKanalEkle); tek denetim
    // karesinde renk ne dustuyse o cikar → belirsiz. Kanali sabit teal'a kelepcele.
    if (kunye.arketip !== 'rgb_spot') {            // isik urunu zaten halka; ikinciyi ekleme
      const isikId = yonetici.ekle('rgb_spot', 0, 0, 'AquaLIGHT 412C');
      const hueKanal = cizelge.kanallar.find((k) => k.hedef === isikId + '.hue');
      if (hueKanal) { hueKanal.anahtarlar = [[0, 0.5]]; hueKanal.oto = false; }  // 0.5 = teal
    }
    window.VITRIN = v;
  } else {
    mesajGoster('vitrin: bilinmeyen urun — ' + urunAd);
  }
}

// #efektdemo (T-B [ELLE] kapısı): sabit yerleşim + sabit kamera → canlı v1
// (pages.dev) ile yan yana efekt kıyası. Kamera sinematiği kapalı ki iki
// pencere aynı açıdan baksın.
if (hashAnahtar.has('efektdemo')) {
  yonetici.ekle('duz_jet', -3, 0);
  yonetici.ekle('duz_jet', 3, 0);
  yonetici.ekle('geyser', 0, 0);
  yonetici.dondur(yonetici.ekle('laminer', -5, -3), 25);
  // v6 F3: 412C gerçekte su cihazının DİBİNE konur (4m öteye ışık anlamsızdı) —
  // halka jet diplerinde, kolonun alt bölgesi halka rengine boyanır (ışık-su bağı).
  yonetici.ekle('rgb_spot', -3, 0.6);
  yonetici.ekle('rgb_spot', 3, 0.6);
  camera.position.set(8, 3.5, 10);
  controls.target.set(0, 2.5, 0);
  kam.sabitle();
  // T-C vitrini: varsayılan kanallar v1 görünümünde başlar (beyaz=1) —
  // t=2..4'te renkler açılır, jetler kademeli tonlarda (per-jet RGBW kanıtı).
  let hueSira = 0;
  for (const k of cizelge.kanallar) {
    if (k.hedef.endsWith('.hue')) {
      const h = (0.55 + 0.19 * hueSira++) % 1;
      k.anahtarlar = [[0, h], [10, (h + 0.35) % 1]];
    } else if (k.hedef.endsWith('.beyaz')) {
      k.anahtarlar = [[0, 1], [2, 1], [4, 0.15]];
    }
  }
}

// #katalogdemo (v3 F3, v5 F2'de 12'li): katalog seti bir arada — [ELLE] + smoke.
// ROBO/SWING pan süpürmesi + SWITCH ani kesmeleri timeline'a elle yazılır.
if (hashAnahtar.has('katalogdemo')) {
  yonetici.ekle('vario', -4, 0, 'AquaVARIO 151');   // v5: Salih karakter tarifi — yoğun yarı-berrak kolon
  yonetici.ekle('switch', -2, -2, 'AquaSWITCH');
  yonetici.dondur(yonetici.ekle('laminer', -6, -3, 'AquaJUMP'), 20);
  yonetici.ekle('robo', 4, 0, 'AquaROBO');
  yonetici.ekle('swing', 2, -2, 'AquaSWING');
  yonetici.ekle('drydeck', 0, 3, 'AquaVARIO DryDECK');
  yonetici.ekle('aquajet', 0, 0, 'AquaJET I');
  yonetici.ekle('rgb_spot', -3, 3, 'AquaLIGHT 412C');
  yonetici.ekle('rgb_spot', 3, 3, 'AquaLIGHT 412C');
  // v5 F2 dörtlüsü: perde arkada (döndürülmüş), AIR sahne dışına yakın (yüksek
  // kolon kadrajı bozmasın), STAR/TORCH önde
  yonetici.ekle('air', -7, 2, 'AquaAIR');
  yonetici.ekle('star', 6, -3, 'AquaSTAR');
  yonetici.ekle('torch', 7, 2, 'AquaTORCH');
  yonetici.dondur(yonetici.ekle('perde', 0, -5, 'CLASSIC WATER CURTAIN'), 15);
  camera.position.set(9, 4, 11);
  controls.target.set(0, 2.5, 0);
  kam.sabitle();
  for (const k of cizelge.kanallar) {
    if (k.hedef.endsWith('.pan'))
      k.anahtarlar = [[0, -60], [4, 60], [8, -60], [12, 60], [16, -60]];   // servo süpürme
    else if (k.hedef.startsWith('switch') && k.hedef.endsWith('.master'))
      k.anahtarlar = [[0, 1], [2, 0], [2.5, 1], [4, 0], [4.5, 1], [8, 1]]; // ani kesmeler
    else if (k.hedef.endsWith('.beyaz'))
      k.anahtarlar = [[0, 1], [3, 1], [5, 0.2]];                           // renkler açılır
  }
}

// #faz2demo (Faz 2 cihaz turu, 2026-07-25) — SALİH'İN LİSTESİ YAN YANA, tek
// kadrajda: VARIO 151 → 241 → VARIO DryDECK → SWITCH → SWITCH DryDECK → JUMP →
// JUMP GIANT → ROBO. Amaç toplu görsel kapı: her turda künyeye giren dört alanın
// (kontrol karakteri / yön / DMX / 412 montaj) ekrandaki karşılığı burada bir
// arada okunur. Kamera BİLEREK alçak ve yakın — DryDECK üst plakası (kare
// 300×300 vs yuvarlak Ø280) ancak bu mesafede seçilir.
// Kanal kurgusu: hepsi açık; hız kanalı olanlar YAVAŞ nefes alır (Faz 1.5'in
// düşük-hız ışık davranışı da aynı karede görünsün).
if (hashAnahtar.has('faz2demo')) {
  yonetici.ekle('vario', -6, 0, 'AquaVARIO 151');
  yonetici.ekle('vario', -4, 0, 'AquaVARIO 241');
  yonetici.ekle('drydeck', -2, 0, 'AquaVARIO DryDECK');
  yonetici.ekle('switch', 0, 0, 'AquaSWITCH');
  yonetici.ekle('drydeck', 2, 0, 'AquaSWITCH DryDECK');
  yonetici.dondur(yonetici.ekle('laminer', 4, 0, 'AquaJUMP'), 20);
  yonetici.dondur(yonetici.ekle('laminer', 6, 0, 'AquaJUMP GIANT'), 20);
  yonetici.ekle('robo', 8, 0, 'AquaROBO');
  camera.position.set(1, 2.0, 10);
  controls.target.set(1, 1.1, 0);
  kam.sabitle();
  for (const k of cizelge.kanallar) {
    if (k.hedef.endsWith('.hiz'))
      k.anahtarlar = [[0, 0.25], [6, 1.0], [12, 0.25], [18, 1.0], [24, 0.25]];   // yavaş nefes
    else if (k.hedef.endsWith('.beyaz')) k.anahtarlar = [[0, 0.35]];
  }
}

// #kimlikdemo (v7 CIHAZ turu): servo ailesini YAN YANA — Salih "roll-robo-swing-
// hydra-pulse hepsi birbirine benziyor" dedi. Aynı ışık/zeminde altı cihaz:
// ROBO (ince berrak jet + süpürme trail'i), ROBO-ROLL (geniş iplik yelpazesi),
// HYDRA (kalın yarı-köpüklü kolon), SWING (tek eksen sarkaç), PULSE (jet yok,
// ripple halkaları), CROWN (taç). Süpürme + trail proje.js VARSAYILANINDAN gelir.
if (hashAnahtar.has('kimlikdemo')) {
  yonetici.ekle('robo',  -7, 0, 'AquaROBO');
  yonetici.ekle('robo',  -4, 0, 'AquaROBO-ROLL');
  yonetici.ekle('robo',  -1, 0, 'AquaHYDRA');
  yonetici.ekle('swing',  2, 0, 'AquaSWING');
  yonetici.ekle('swing',  5, 0, 'AquaPULSE');
  yonetici.ekle('star',   8, 0, 'AquaCROWN I');
  // dipte renk halkaları (isikBesle su kütlesini boyasın — yoksa "renksiz")
  for (let i = -7; i <= 8; i += 3) yonetici.ekle('rgb_spot', i, 0.6, 'AquaLIGHT 412C');
  camera.position.set(0, 4, 15);
  controls.target.set(0.5, 2.2, 0);
  kam.sabitle();
}

// #ornek=<ad> (v3 polish): hazır şovu açılışta yükle — headless kıyas/smoke
// sahnesi (UI select'i headless tıklanamaz; kabul turunda insan UI'dan açar).
const ornekHash = [...hashAnahtar].find(h => h.startsWith('ornek='));
if (ornekHash) {
  const ad = ornekHash.slice(6);
  fetch('ornekler/' + ad + '.aqshow')
    .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
    .then(t => {
      // gecissiz:true — ⚠fon ÇAPRAZ GEÇİŞİ headless'ta İLERLEMEZ (crossfade
      // gerçek karelere bağlı, virtual-time onu sürmez) → smoke kareleri şovun
      // KAYITLI fonunu değil, açılış fonunu (meydan) gösteriyordu; altı ayrı fon
      // için çekilen kareler birbirinin aynı çıkıyordu. #fon= hash'i bu tuzağı
      // zaten biliyordu (fonSec(ad, 0)), .aqshow yolu bilmiyordu.
      sahneKur(aqshowOku(t), { gecissiz: true });
      kam.sabitle(); camera.position.set(11, 6, 13); controls.target.set(0, 2, 0);
      // sahneKur scrubla(0) yapar — #t kancası (headless kare seçimi) yeniden uygulanır
      const tH = [...hashAnahtar].find(h => h.startsWith('t='));
      if (tH) transport.scrubla(+tH.slice(2) || 0);
    })
    .catch(e => mesajGoster('örnek açılamadı: ' + e.message));
}

// #sablondemo (v3 F5): daire şablonu döşeli açılış — smoke + [ELLE] sahnesi.
if (hashAnahtar.has('sablondemo')) {
  for (const c of SABLONLAR.daire()) {
    const id = yonetici.ekle(c.tur, c.x, c.z, c.urun ?? null, { yogunluk: 0.55 });
    if (id && c.aci) yonetici.dondur(id, c.aci);
  }
  camera.position.set(11, 6, 13);
  controls.target.set(0, 2, 0);
  kam.sabitle();
}

// --- PLAN görünümü (Task 9) ---
const planTuval = document.getElementById('plan-tuval');
const plan = planKur({ tuval: planTuval, yonetici, mesaj: mesajGoster });

// PLAN⇄SAHNE: PLAN'da 2D tuval görünür; SAHNE'de gizlenir (style.display —
// studio.css'teki #plan-tuval{display:block} [hidden]'ı ezerdi) ve #editor-ui
// pointer-events:none (css) sayesinde boş alan sürüklemesi 3D orbite düşer.
function gorunumAyarla(plan2d) {
  document.getElementById('gorunum-plan').classList.toggle('aktif', plan2d);
  document.getElementById('gorunum-sahne').classList.toggle('aktif', !plan2d);
  planTuval.style.display = plan2d ? 'block' : 'none';
  if (plan2d) plan.ciz();
}
document.getElementById('gorunum-plan').onclick = () => gorunumAyarla(true);
document.getElementById('gorunum-sahne').onclick = () => gorunumAyarla(false);

// plan dosyası: .dxf → metin → dxfYukle; görsel → createImageBitmap → pngYukle
document.getElementById('planDosya').onchange = async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  if (/\.dxf$/i.test(f.name)) {
    if (f.size > 500 * 1024 * 1024)
      mesajGoster('DXF çok büyük (>500MB) — AutoCAD\'de gereksiz katman/hatch temizleyip tekrar dene');
    else if (f.size > 2 * 1024 * 1024) dxfWorkerlaYukle(f);       // büyük → worker + ilerleme
    else plan.dxfYukle(await f.text(), f.name, dxfAyristir);      // küçük → mevcut senkron yol
  }
  else {
    try { plan.pngYukle(await createImageBitmap(f), f.name); }
    catch { mesajGoster('görsel okunamadı: ' + f.name); }
  }
  e.target.value = '';                       // aynı dosya tekrar seçilebilsin
};

// T-0 worker köprüsü: büyük DXF ana thread'i kilitlemeden dxf.worker.js'te
// ayrıştırılır; sonuç Float32Array transferiyle gelir, parçalara açılıp
// plan.dxfSonucYukle'ye verilir (metin saklanmaz → .aqshow 'dxf-parcalar').
let dxfWorker = null, dxfWorkerAd = '';
function dxfWorkerlaYukle(f) {
  if (!dxfWorker) {
    dxfWorker = new Worker(new URL('./dxf.worker.js', import.meta.url), { type: 'module' });
    dxfWorker.onmessage = (e) => {
      const m = e.data;
      if (m.tip === 'ilerleme') mesajGoster(`DXF okunuyor… %${m.yuzde}`);
      else if (m.tip === 'hata') mesajGoster('DXF okunamadı: ' + m.mesaj + ' — PNG olarak dene');
      else {
        const p = new Array(m.duz.length / 4);
        for (let i = 0; i < p.length; i++) p[i] = [m.duz[i * 4], m.duz[i * 4 + 1], m.duz[i * 4 + 2], m.duz[i * 4 + 3]];
        plan.dxfSonucYukle({ parcalar: p, birimOlcek: m.birimOlcek, atlanan: m.atlanan, dusen: m.dusen, toplam: m.toplam }, dxfWorkerAd);
      }
    };
    dxfWorker.onerror = (e) => mesajGoster('DXF worker hatası: ' + e.message);
  }
  dxfWorkerAd = f.name; dxfWorker.postMessage(f);
}

// palet: katalogdan üretilir (T-E — kod cihaz tipini, katalog ürünü tanımlar);
// tür seç → tuvalde ilk tıklama cihazı ekler, cihaz ürün adını taşır.
// v5 F1: katalog künye-birebir büyüdü → gruplu palet + MOTOR kapısı (motorda
// henüz olmayan arketiple gelen ürün paletten düşer, veri katmanında kalır —
// F2 arketipi ekleyince ürün kendiliğinden belirir; spec §T-E ileri uyum).
const paletKapsayici = document.getElementById('palet');
const MOTORDA = new Set([...Object.keys(PRESETLER), 'laminer', 'rgb_spot', 'torch']);   // torch=bileşik (proje.js)
const GRUP_SIRA = [['animasyon', 'ANİMASYON'], ['klasik', 'KLASİK'],
                   ['perde', 'PERDE'], ['isik', 'IŞIK'], ['genel', 'GENEL']];
for (const [grup, baslik] of GRUP_SIRA) {
  const urunler = KATALOG.filter(u => u.grup === grup && MOTORDA.has(u.arketip));
  if (!urunler.length) continue;
  const h = document.createElement('div');
  h.className = 'baslik palet-grup';
  h.textContent = baslik;
  paletKapsayici.appendChild(h);
  for (const u of urunler) {
    const b = document.createElement('button');
    b.className = 'urun';
    b.dataset.tur = u.arketip; b.dataset.urun = u.ad;
    b.textContent = u.etiket;
    b.title = [u.pn ? 'PN ' + u.pn : '', u.not || ''].filter(Boolean).join(' — ');
    // v7 G12: title accessible name'i EZİYOR — erişilebilirlik ağacında düğme
    // "VARIO 151" değil "PN 1050 — 24VDC DMX sub-pump…" diye okunuyordu, yani
    // ekran okuyucu ÜRÜN ADINI hiç söylemiyordu. aria-label görünen adı geri verir.
    b.setAttribute('aria-label', u.ad || u.etiket);
    paletKapsayici.appendChild(b);
  }
}
const paletDugmeler = [...document.querySelectorAll('#palet .urun')];
for (const b of paletDugmeler) {
  b.onclick = () => {
    for (const o of paletDugmeler) o.classList.remove('aktif');
    b.classList.add('aktif');
    plan.turSec(b.dataset.tur, b.dataset.urun);
  };
}

document.getElementById('kalibre').onclick = () => plan.kalibreBaslat();

// ⌂ şablon (v3 F5): hazır yerleşim döşer — satış-hazır kompozisyon, rastgele değil.
// Kalabalık sahnede parçacık bütçesi: yogunluk 0.55 (motor.suEkle kenar ölçeği).
document.getElementById('sablon').onchange = (e) => {
  const ad = e.target.value; e.target.value = '';
  if (!ad || !SABLONLAR[ad]) return;
  if (kayitKilidi('şablon döşemek')) return;
  if (yonetici.liste().length &&
      !confirm('Şablon, mevcut cihazları silip yeni yerleşimi döşer. Devam?')) return;
  for (const c of yonetici.liste()) yonetici.sil(c.id);
  for (const c of SABLONLAR[ad]()) {
    const id = yonetici.ekle(c.tur, c.x, c.z, c.urun ?? null, { yogunluk: 0.55 });
    if (id && c.aci) yonetici.dondur(id, c.aci);
  }
  editor.kanallariYenile();
  plan.kadrajaOturt();          // v7 G11: yerleşim kenardan kırpık açılıyordu
  mesajGoster(`şablon döşendi: ${ad} (${yonetici.liste().length} cihaz)`);
};

// seçili cihaz paneli: plan etkileşimlerinden SONRA tazelenir (listener sırası:
// planKur kendi pointer/keydown'larını önce bağladı, bunlar sonra koşar)
const panelRenkEl = document.getElementById('panel-renk');
const panelSwatchEl = document.getElementById('panel-swatch');
const panelRenkYaziEl = document.getElementById('panel-renk-yazi');
const cihazGucBtn = document.getElementById('cihaz-guc');
const cihazGucNokta = document.getElementById('cihaz-guc-nokta');
const cihazGucYazi = document.getElementById('cihaz-guc-yazi');
// Çıplak cihaz (spec 2026-07-21 §3): öz ışık (ops. AquaLIGHT-C) onay kutusu
const panelOzIsikEl = document.getElementById('panel-ozisik');
const ozIsikKutu = document.getElementById('ozisik-kutu');
// F1 Task 9b: grup paneli elemanları — "SEÇİLİ CİHAZ" panelinin altına eklendi.
const gruplaBtn = document.getElementById('grupla');
const grupPanelEl = document.getElementById('grup-panel');
const grupAdEl = document.getElementById('grup-ad');
const grupRolEl = document.getElementById('grup-rol');
const grupDizilimEl = document.getElementById('grup-dizilim');
const grupDesenEl = document.getElementById('grup-desen');
const grupPeriyotEl = document.getElementById('grup-periyot');
const grupPeriyotYaziEl = document.getElementById('grup-periyot-yazi');
const desenUygulaBtn = document.getElementById('desen-uygula');
const grubaDondurBtn = document.getElementById('gruba-dondur');   // F1 Task 10

// düzenlenen grubu döndürür; dosyaya kaydedilmeden silinmiş/budanmışsa (kirlet()
// → gruplariDogrula) secilGrupId'yi de sessizce temizler — panel bir sonraki
// panelGuncelle()'de "SEÇİLİ CİHAZ" hâline geri düşer.
function grupSecili() {
  if (!secilGrupId) return null;
  const g = gruplar.find(x => x.id === secilGrupId);
  if (!g) secilGrupId = null;
  return g;
}
// grup alanlarını forma yazar — metin girişindeyken (odaklıyken) ÜZERİNE YAZMAZ,
// yoksa planTuval pointermove'un tetiklediği panelGuncelle her karede imleci sıfırlardı.
function grupPanelDoldur(g) {
  if (document.activeElement !== grupAdEl) grupAdEl.value = g.ad;
  grupRolEl.value = g.rol;
  grupDizilimEl.value = g.dizilim;
}

// İŞ3 tık.2: cihazın playhead'deki rengi (hue + beyaz kanalları örneklenir).
// beyaz=1 → doğal/beyazımsı görünüm, beyaz=0 → tam doygun hue (proje.js RGBW
// modelinin görsel proxy'si). ⚠transport'u SADECE burada okur → panelGuncelle
// bunu yalnız seçili cihaz varken çağırır (transport const'u editorKur'dan sonra
// tanımlı; açılış panelGuncelle'sinde seçim yok → TDZ'ye girilmez).
function cihazRengi(id) {
  const hueK = cizelge.kanallar.find(k => k.hedef === id + '.hue');
  if (!hueK) return null;
  const beyazK = cizelge.kanallar.find(k => k.hedef === id + '.beyaz');
  const h = ornekle(hueK, transport.showT);
  const b = beyazK ? ornekle(beyazK, transport.showT) : 0;
  const [r, g, bl] = hueRgb(h);
  const mix = (c) => Math.round((c + (1 - c) * b) * 255);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(bl)})`;
}
const cihazMasterKanal = (id) => cizelge.kanallar.find(k => k.hedef === id + '.master');

// playhead'e bağlı kısım — seçim değişmese de her karede tazelenebilir (render
// döngüsü editör modunda çağırır → şerit oynatılırken renk/güç durumu canlı akar).
function panelCanliGuncelle(id = plan.seciliId()) {
  if (!id) return;
  const renk = cihazRengi(id);
  if (renk) { panelSwatchEl.style.background = renk; panelRenkYaziEl.textContent = renk; }
  const mK = cihazMasterKanal(id);
  if (mK) {
    const acik = ornekle(mK, transport.showT) > 0.5;
    cihazGucNokta.textContent = acik ? '●' : '○';
    cihazGucYazi.textContent = acik ? 'AÇIK' : 'KAPALI';
    cihazGucBtn.setAttribute('aria-pressed', acik ? 'true' : 'false');
    cihazGucBtn.dataset.durum = acik ? 'acik' : 'kapali';
  }
}

function panelGuncelle() {
  const id = plan.seciliId();
  // F1 Task 9b: plandaki tekil seçim DEĞİŞTİYSE grup düzenleme modundan çık —
  // aksi halde kullanıcı başka bir cihaza tıkladığında panel eski grubu
  // göstermeye devam eder (bkz. secilGrupId tanımının yanındaki not).
  if (id !== panelSonId) { secilGrupId = null; panelSonId = id; }
  const c = id && yonetici.liste().find(k => k.id === id);
  document.getElementById('panel-icerik').textContent =
    c ? `${c.id} · ${c.urun ?? c.tur} · (${c.x.toFixed(1)}, ${c.z.toFixed(1)}) m · ${c.aci}°` : '—';
  document.getElementById('cihaz-sil').hidden = !c;
  // İŞ3: renk karesi her seçili cihazda; güç düğmesi yalnız master'lı cihazda
  // (rgb_spot ışığın master'ı yok → düğme gizli). c falsy iken transport okunmaz.
  panelRenkEl.hidden = !c;
  cihazGucBtn.hidden = !(c && cihazMasterKanal(id));
  // Faz 1 Task 3 (K2 künye-tabanlı, F1-3): öz ışık kutusu yalnız 412C
  // TAKILABİLEN cihazda görünür (künye isikModul:'412C' ya da künyesiz
  // jenerik yedek — isikModulAlirMi). DryDECK gibi isikModul:'entegre'
  // ürünlerde ışık modül DEĞİL, üründe gömülü — kutu GÖRÜNMEZ (sökülemez).
  // Kutu durumu kayıttan okunur (liste() ozIsik taşır); pointermove her karede
  // panelGuncelle çağırır ama checkbox'ta imleç yok → üzerine yazmak zararsız.
  const modulTakilabilirMi = !!(c && isikModulAlirMi(c.tur, c.urun));
  panelOzIsikEl.hidden = !modulTakilabilirMi;
  if (modulTakilabilirMi) ozIsikKutu.checked = c.ozIsik !== false;
  if (c) panelCanliGuncelle(id);

  // F1 Task 9b: gruplandır düğmesi (çoklu seçim ≥2, grup modunda DEĞİLKEN) +
  // grup paneli (bir grup düzenleniyorken).
  const g = grupSecili();
  gruplaBtn.hidden = !(plan.cokluIdler().length >= 2 && !g);
  grupPanelEl.hidden = !g;
  if (g) grupPanelDoldur(g);
  // F1 Task 10: "gruba döndür" yalnız grubun üyelerinde ≥1 elle-damgalı kanal
  // VARKEN görünür — aksi halde tıklamanın yapacağı bir şey yok.
  grubaDondurBtn.hidden = !(g && grupElleKanallari(g, cizelge.kanallar).length > 0);
}
document.getElementById('cihaz-sil').onclick = () => { plan.seciliSil(); panelGuncelle(); };
// İŞ3 tık.3: güç düğmesi — master kanalına playhead t'de anahtar yazar (STEP
// cihazda ani, smooth'ta yumuşak; ornekle kanal.tip'e göre yorumlar). Anahtar
// yazma yolu editörünkiyle aynı (mekanizmaya dokunulmadı, yalnız UI'dan tetik).
cihazGucBtn.onclick = () => {
  const id = plan.seciliId(); if (!id) return;
  const k = cihazMasterKanal(id); if (!k) return;
  const t = transport.showT;
  const yeni = ornekle(k, t) > 0.5 ? 0 : 1;
  elleDamgala(k);                                       // elle dokunuldu — varsayılan bayrağı düşür
  const mev = k.anahtarlar.find(a => Math.abs(a[0] - t) < 1e-4);
  if (mev) mev[1] = yeni;                              // aynı anda anahtar varsa üzerine yaz
  else { k.anahtarlar.push([t, yeni]); k.anahtarlar.sort((a, b) => a[0] - b[0]); }
  editor.kirlet();                                     // şerit eğrisi/noktası tazelensin
  panelCanliGuncelle(id);
  mesajGoster(`${id} · master ${yeni ? 'açık' : 'kapalı'} (t=${t.toFixed(1)}s)`);
};
// Çıplak cihaz (spec 2026-07-21 §3): öz ışık anahtarı — kayıt + motor tek
// kapıdan (yonetici.ozIsikAyarla: k.ozIsik + nesne.setOzIsik + kirlet).
// Timeline kanalı DEĞİL: ışık modülü donanım konfigürasyonudur, şov sırasında
// takılıp sökülmez — o yüzden anahtar yazmaz, kayda işler (.aqshow alanı).
ozIsikKutu.onchange = () => {
  const id = plan.seciliId(); if (!id) return;
  yonetici.ozIsikAyarla(id, ozIsikKutu.checked);
  mesajGoster(`${id} · öz ışık ${ozIsikKutu.checked ? 'takıldı' : 'söküldü'} (AquaLIGHT-C)`);
};
planTuval.addEventListener('pointerup', () => {
  panelGuncelle();
  if (!plan.aktifTur()) for (const o of paletDugmeler) o.classList.remove('aktif');
});
planTuval.addEventListener('pointermove', () => panelGuncelle());
addEventListener('keydown', (e) => {
  if (e.key === 'r' || e.key === 'R' || e.key === 'Delete' || e.key === 'Backspace') panelGuncelle();
});
// açılış: panel içeriği ve #cihaz-sil görünürlüğü daha ilk karede doğru olsun
// (ilk fare hareketini beklemesin)
panelGuncelle();

// #plandemo smoke kancası: örnek DXF + 3 cihaz → plan çizgileri ve cihaz
// noktaları ekran görüntüsünde görünmeli (tools/smoke.sh "...#plandemo")
if (hashAnahtar.has('plandemo')) {
  modAyarla('editor');
  gorunumAyarla(true);
  yonetici.ekle('duz_jet', -4, 2);
  yonetici.ekle('laminer', 0, -2);
  yonetici.ekle('rgb_spot', 5, 3);
  plan.ciz();
  fetch('../test/veri/ornek-plan.dxf')
    .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
    .then(t => plan.dxfYukle(t, 'ornek-plan.dxf', dxfAyristir))
    .catch(e => mesajGoster('plandemo: ' + e.message));
}
// editöre girişte/dönüşte plan tazelenir: Tab dinleyicisi mod-geçiş
// dinleyicisinden SONRA bağlı → modAyarla koşmuş, tuval yerleşmiş olur.
// ciz() gizli tuvalde (clientWidth 0) kendini korur — sov modunda no-op.
if (document.body.classList.contains('mod-editor')) plan.ciz();
addEventListener('keydown', (e) => { if (e.key === 'Tab') plan.ciz(); });
// --- PLAN görünümü sonu ---

const clock = new THREE.Clock();

// --- transport (Task 12) — ders/10-video BLOK 10 portu ---
// Ses = zaman OTORİTESİ: buffer varsa ve AudioContext çalışıyorsa showT = audio
// saati, değilse iç saat. AudioContext TEMBEL kurulur (ilk müzik yüklemede, yani
// bir kullanıcı jesti içinde) — kaynaktan sapma: sayfa açılışında kurmak Chrome'un
// autoplay uyarısını konsola yazar, smoke politikası (her konsol satırı hata) bunu
// kırardı. sesHedef T14 video kaydının ses track köprüsü (BLOK 14 deseni).
let actx = null, sesHedef = null, sonMuzikAdi = '';   // sonMuzikAdi: T15 .aqshow kaydına girer (muzikAdi alanı)
// --- SES SÖZLEŞMESİ (2026-07-23) ------------------------------------------
// `.aqshow` müzik TAŞIMAZ (taşıyamaz da: örnek şovlar gerçek parçalara
// bestelendi, parçalar telif nedeniyle pakete giremez). Eskiden şov müziksiz
// açılıyor, kullanıcı sadece su çarpma SFX'ini duyuyor ve bunu ürünün sesi
// sanıyordu. Sözleşme üç maddeli:
//   1. Müzik yoksa su sesi de çalmaz (rAF döngüsündeki kapı).
//   2. Durum SÜREKLİ görünür (rozet) — geçici mesaj kaçırılıyordu.
//   3. Kullanıcıya ne yapacağı SÖYLENİR (parça yükle ya da ♪ örnek parça).
const muzikDurumEl = document.getElementById('muzik-durum');
const muzikVar = () => !!transport.buffer;
// Şov müziksiz açıldığında kullanıcıya SEBEBİ söyleyen not. Eski metin ("müziği
// tekrar yükle: X") neden sessiz açıldığını ve su sesinin neden kapandığını
// anlatmıyordu. ⚠sahneKur'un gövdesi kısa kalsın diye burada — o gövdenin
// uzunluğu test/uygulama-borclari.test.mjs tarafından denetleniyor.
function muziksizNotlar(muzikAdi) {
  if (!muzikAdi || muzikVar()) return [];
  return [`♪ müziksiz açıldı — bu şov "${muzikAdi}" parçasına bestelendi `
    + '(telif nedeniyle pakete girmiyor). Parçayı yükle ya da ♪ örnek parça seç; '
    + 'müzik gelene kadar su sesi de kapalı.'];
}
function muzikDurumTazele() {
  if (!muzikDurumEl) return;
  if (muzikVar()) { muzikDurumEl.hidden = true; return; }
  muzikDurumEl.hidden = false;
  // Şov bir parçaya bestelendiyse ADINI söyle — kullanıcı neyi arayacağını bilsin.
  // Uzantı atılır (".mp3" gürültü) ve rozet transport barı taşırmasın diye kısaltılır;
  // TAM ad title'da zaten var.
  const kisa = sonMuzikAdi.replace(/\.[a-z0-9]{2,4}$/i, '');
  muzikDurumEl.textContent = kisa
    ? '♪ müzik yok — ' + (kisa.length > 28 ? kisa.slice(0, 27) + '…' : kisa)
    : '♪ müzik yok';
  muzikDurumEl.title = sonMuzikAdi
    ? `Bu şov "${sonMuzikAdi}" parçasına bestelendi. Parça telif nedeniyle pakete `
      + 'girmiyor — aynı dosyayı kendin yükle, ya da ♪ örnek parça seç. '
      + 'Müzik yokken su sesi de kapalıdır.'
    : 'Müzik yüklenmedi. Müzik dosyası yükle ya da ♪ örnek parça seç. '
      + 'Müzik yokken su sesi de kapalıdır.';
}
function sesBaglam() {
  if (!actx) {
    actx = new (window.AudioContext || window.webkitAudioContext)();
    sesHedef = actx.createMediaStreamDestination();
  }
  return actx;
}
const oynatBtn = document.getElementById('oynat');

// Kaynaktan iki bilinçli sapma daha:
//  (a) oynuyor=true başlar (ders false başlıyordu): stüdyoda şov açılışta akar,
//      #demo&sim=N ön-adımlaması da ilerleyen saat ister.
//  (b) sure kendi alanı değil cizelge.sure üstüne accessor çifti — tek gerçek
//      kaynak cizelge kalır + T11 notu (1): min 1s kelepçe, editor.js'in tX/xT
//      bölmeleri hiçbir yoldan (bozuk proje dosyası dahil) 0/NaN göremez.
// Scrub-sonrası davranış (T11 notu (2), bilinçli seçim): cetvel scrub'ı
// oynat(false) ile duraklatır ve DURAKTA KALIR — pointerup'ta otomatik devam
// YOK, kullanıcı ▶ ile sürdürür. Scrub kare incelemek içindir; bırakınca
// sürpriz oynatma/ses patlaması istenmez (DAW konvansiyonu).
const transport = {
  showT: 0, oynuyor: true, dongu: true,
  buffer: null, src: null, t0: 0,
  // Number.isFinite: Math.max(1, NaN) = NaN — bozuk dosyadan gelen sayı-olmayan
  // sure editörün tX/xT bölmelerine NaN sızdırmasın (T15 kalite bulgusu).
  get sure() { return Number.isFinite(cizelge.sure) ? Math.max(1, cizelge.sure) : 1; },
  set sure(v) { cizelge.sure = Number.isFinite(v) ? Math.max(1, v) : 1; },
  sesAktif() { return !!(this.buffer && actx && actx.state === 'running'); },
  tik(dt) {
    if (this.sesAktif() && this.oynuyor) {
      let t = actx.currentTime - this.t0;
      if (t >= this.sure) {
        if (this.dongu) { this.baslatKaynak(0); t = 0; } else { this.oynat(false); t = this.sure; }
      }
      this.showT = t;
    } else if (this.oynuyor) {
      this.showT += dt;
      if (this.showT >= this.sure) { this.showT = this.dongu ? this.showT % this.sure : this.sure; if (!this.dongu) this.oynat(false); }
    }
    return this.showT;
  },
  baslatKaynak(offset) {
    if (this.src) { try { this.src.stop(); } catch (e) {} this.src.disconnect(); this.src = null; }
    if (!this.buffer) return;
    // t0 kaynak başlasın-başlamasın yazılır: aşağıdaki sessizlik dalında da
    // showT = actx.currentTime - t0 doğru konumdan akmalı (saat ≠ ses kaynağı).
    this.t0 = actx.currentTime - offset;
    // T12 devir notu (T14'te kapatıldı): müzik timeline'dan KISAYSA müzik-sonrası
    // bölge SESSİZDİR — dersin `offset % duration` sarması sesi baştan alıp yanlış
    // konumdan çalardı (scrub/döngüde VE kayıt ses track'inde). offset buffer'ı
    // aşıyorsa kaynak hiç başlatılmaz; saat yine akar, ses kayda da girmez.
    if (offset >= this.buffer.duration) return;
    const s = actx.createBufferSource();
    s.buffer = this.buffer;
    s.connect(actx.destination);   // hoparlör
    s.connect(sesHedef);           // kayıt akışı (T14)
    s.start(0, Math.max(0, offset));
    this.src = s;
  },
  oynat(ac = true) {
    this.oynuyor = ac;
    // actx kapısı: #demo'nun sentetik buffer'ı ses bağlamı OLMADAN gelir (T13) —
    // actx null iken resume() patlardı; bufferlı-bağlamsız durumda iç saat sürer.
    if (this.buffer && actx) {
      if (ac) { actx.resume().then(() => this.baslatKaynak(this.showT)); }
      else if (this.src) { try { this.src.stop(); } catch (e) {} this.src = null; }
    }
    // ⚠textContent YAZMA: düğmenin içinde iki inline SVG duruyor, metin yazmak
    // ikisini de siler (eski hata — glifler "Segoe UI Symbol" yamasına muhtaçtı).
    // Durumu dataset'e yaz, hangi ikonun görüneceğini CSS seçsin.
    oynatBtn.dataset.durum = ac ? 'oynuyor' : 'duraklatildi';
  },
  scrubla(t) {
    this.showT = Math.max(0, Math.min(this.sure, t));
    if (this.sesAktif() && this.oynuyor) this.baslatKaynak(this.showT);
  }
};
oynatBtn.dataset.durum = 'oynuyor';   // oynuyor=true başlar — düğme durumu eşlensin
// T-F su sesi: prosedürel (ses.js), AudioContext gibi TEMBEL — ilk kullanıcı
// jestinde kurulur (autoplay politikası + smoke konsol-sessizlik). Kayıt köprüsü
// sesHedef'e de bağlanır → webm'e su sesi girer. Seviye rAF'ta sürülür.
let suSesi = null;
function suSesiSaglat() {
  sesBaglam();
  if (!suSesi) suSesi = suSesiKur(actx, [actx.destination, sesHedef]);
}
oynatBtn.onclick = () => { suSesiSaglat(); transport.oynat(!transport.oynuyor); };
// döngü düğmesi metni TEK fonksiyondan: tık da, T14 kayıt kapat/geri-koy da
// bunu çağırır — metin transport.dongu'dan hiç kopmaz.
const donguBtn = document.getElementById('dongu');
const donguDurum = document.getElementById('dongu-durum');
function dongubtnGuncelle() {
  // yalnız durum span'ı yazılır — düğmenin içindeki SVG ikon korunur
  donguDurum.textContent = transport.dongu ? 'açık' : 'kapalı';
  donguBtn.setAttribute('aria-pressed', transport.dongu ? 'true' : 'false');
}
donguBtn.onclick = () => { transport.dongu = !transport.dongu; dongubtnGuncelle(); };

// --- T-A: sarma — şov modunda oynatma SÜRER (editör scrub'ının durakta-kal
// kuralı editöre özgü; izleyici sararken akış kesilmez) ---
const sar = (dt) => transport.scrubla(transport.showT + dt);
document.getElementById('geri10').onclick = () => sar(-10);
document.getElementById('ileri10').onclick = () => sar(+10);
addEventListener('keydown', (e) => {
  if (mod !== 'sov') return;                            // editör kısayollarıyla (R/Delete) çakışma yok
  if (e.target.matches('input,textarea')) return;
  if (e.key === 'ArrowLeft') { e.preventDefault(); sar(e.shiftKey ? -30 : -5); }
  else if (e.key === 'ArrowRight') { e.preventDefault(); sar(e.shiftKey ? 30 : 5); }
  else if (e.key === ' ') { e.preventDefault(); transport.oynat(!transport.oynuyor); }
});

// T-A ince cetvel: rAF döngüsü saatle birlikte cetvelGuncelle'yi çağırır;
// tıkla/sürükle scrubla'ya gider (şov konvansiyonu: oynatma sürer).
const cetvel = document.getElementById('sov-cetvel');
const cetvelDolu = document.getElementById('sov-cetvel-dolu');
function cetvelGuncelle() { cetvelDolu.style.width = (100 * transport.showT / transport.sure) + '%'; }
const cetvelSar = (e) => {
  const r = cetvel.getBoundingClientRect();
  transport.scrubla(transport.sure * Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)));
};
cetvel.addEventListener('pointerdown', (e) => { cetvel.setPointerCapture(e.pointerId); cetvelSar(e); });
cetvel.addEventListener('pointermove', (e) => { if (e.buttons) cetvelSar(e); });

// --- video kaydı (Task 14) — ders/10-video BLOK 14 portu ---
// sesHedef getter: actx TEMBEL kurulur (üstteki sesBaglam notu) — kayıt anındaki
// güncel MediaStreamDestination'ı (ya da müzik yüklenmediyse null'ı) verir.
const kayit = kayitKur({
  renderer, transport,
  sesHedef: () => sesHedef,
  mesaj: mesajGoster,
  dongubtnGuncelle,
});
// MediaRecorder yoksa kayıt düğmesi baştan devre dışı + sebep title'da (spec §10) —
// kayit.js'in çalışma-anı mesajı yedek kalır; disabled düğme tık üretmediği için
// kullanıcı "neden olmuyor" belirsizliğine hiç düşmez.
if (!('MediaRecorder' in window)) {
  const kayitBtn = document.getElementById('kayit');
  kayitBtn.disabled = true;
  kayitBtn.title = 'bu tarayıcı MediaRecorder desteklemiyor — video kaydı kapalı';
}
// #kayit hash kancası (headless kayıt-yolu smoke'u) — hashAnahtar disipliniyle
// (dosya başı notu: includes değil, '&'-parçalı tam anahtar).
if (hashAnahtar.has('kayit')) setTimeout(kayit.baslat, 500);
// disari: timeline JSON'unu panoya + konsola (kaynak 651-657; ZAMAN_CIZELGESI→cizelge)
// KAYIT KİLİDİ (denetim 2026-07-18): kayıt sürerken sahneyi/çizelgeyi değiştiren
// her yol yarım-şov + yeni-sahne karışımı bozuk bir webm üretir. "proje aç" yolu
// bu gerekçeyle zaten kilitliydi ama şablon/örnek/bestele/desen/müzik AÇIKTI —
// aynı hasarı verirler. Müzik ayrıca `transport.sure`yi değiştirdiği için kaydın
// otomatik durdurma zamanlayıcısını (eski süreye göre kurulmuş) da bozuyordu.
function kayitKilidi(ne) {
  if (!kayit.kaydediyor()) return false;
  mesajGoster(`kayıt sürüyor — ${ne} için önce ⏹ ile durdur`);
  return true;
}

document.getElementById('disari').onclick = async () => {
  const yuvarla = (o) => JSON.parse(JSON.stringify(o, (k, v) => typeof v === 'number' ? Math.round(v * 1000) / 1000 : v));
  const metin = JSON.stringify(yuvarla(cizelge), null, 2);
  console.log('=== CIZELGE ===\n' + metin);
  try { await navigator.clipboard.writeText(metin); mesajGoster('JSON panoya kopyalandı (+ konsol)'); }
  catch (e) { mesajGoster('JSON konsola yazıldı (pano izni yok)'); }
};

// --- şerit editörü (Task 11) ---
// editor.js transport'tan yalnız sure/oynat/scrubla tüketir (showT parametreyle akar).
const editor = editorKur({
  tuval: document.getElementById('serit-tuval'),
  bar: document.getElementById('serit-bar'),     // E2: filtre çipleri + zoom bilgisi
  cizelge, transport, kirlet, mesaj: mesajGoster,
  // Katlanmış grup durumu PROJE BAŞINA saklanır (denetim 2026-07-18): cihaz
  // id'leri (`duz_jet_1`) her projede tekrar ettiği için tek küme projeler arası
  // sızıyordu. projeAd `let` ve bu çağrıdan sonra tanımlı → fonksiyonla verilir.
  projeAnahtar: () => projeAd,
  gruplar: () => gruplar,   // F1 Task 9a: serit-duzen.js grup lanelerini gerçek listeden çizsin
  // F1 Task 10 (danışman kararı): şeritte grup başlığına tık = o grubu panelde
  // seç. #grupla'dan sonra bir kez düzenlenip başka yere tıklanınca grup paneli
  // erişilemez kalıyordu (#gruba-dondur o panelde) — bu, geri dönüş yolu.
  grupSec: (grupId) => { secilGrupId = grupId; panelGuncelle(); },
  panelTazele: () => panelGuncelle(),   // F1: elle damgası şeritte doğar → #gruba-dondur görünürlüğü tazelensin (tek yönlü)
});
editorKanca = editor.kanallariYenile;  // yönetici ctx'indeki kirlet artık gerçek (T10 kalite notu)

// --- müzik yükle / bestele ayrımı (Task 12 Step 2) ---
// Ders 9-10'daki muzikIsle (buffer + BESTELE tek yolda) bilinçli bölündü:
// müzik yüklemek elle çizilen timeline'ı EZMEZ; bestele ayrı, onay soran adım.
// bufferYukle (v3 F5): AudioBuffer'ı transport'a bağlayan ortak gövde —
// dosya (muzikYukle) ve sentetik parça (♪ örnek) aynı yoldan geçer.
function bufferYukle(buf, ad) {
  transport.buffer = buf; sonMuzikAdi = ad;
  if (buf.duration > cizelge.sure) {
    transport.sure = Math.ceil(buf.duration);   // sağa boşlukla uzar — setter cizelge.sure'yi yazar (tek kaynak)
    mesajGoster(`süre ${cizelge.sure}s'e uzatıldı (${ad})`);
  } else if (buf.duration < cizelge.sure - 0.5) {
    mesajGoster(`⚠ müzik (${buf.duration.toFixed(0)}s) timeline'dan (${cizelge.sure}s) kısa — bestele veya süreyi elle kısalt`);
  }
  editor.kirlet();                     // cetvel/eğri katmanı yeni süreye göre (editor.js T12 notu)
  // ders 10'da sesi başlatan, muzikIsle sonundaki oynat(true) idi; ayrımda buraya
  // taşındı — oynuyorsa kaynak showT'den çalmaya başlar, duraktaysa ▶ bekler.
  if (transport.oynuyor) transport.oynat(true);
  muzikDurumTazele();                  // ses sözleşmesi: rozet + su sesi kapısı
}
async function muzikYukle(file) {
  // ⚠müzik sure'yi değiştirir → kaydın otomatik durdurma zamanlayıcısı bayatlar
  if (kayitKilidi('müzik yüklemek')) return;
  suSesiSaglat();                      // müzik jesti su sesini de kurar (T-F)
  const buf = await sesBaglam().decodeAudioData(await file.arrayBuffer());
  bufferYukle(buf, file.name);
}
// ♪ örnek parça (v3 F5): sentetik PCM → AudioBuffer — telifsiz, dosyasız.
document.getElementById('sentetik').onchange = (e) => {
  const stil = e.target.value; e.target.value = '';
  if (!stil) return;
  suSesiSaglat();                      // kullanıcı jesti — actx burada doğar
  const { veri, sr } = sentetikPCM(24, 120, stil);
  const buf = actx.createBuffer(1, veri.length, sr);
  buf.copyToChannel(veri, 0);
  bufferYukle(buf, 'sentetik-' + stil);
  mesajGoster('örnek parça yüklendi: ' + stil + ' — 🎼 bestele ile koreografi üret');
};
let sonAnaliz = null;                  // bestele çıktısı — desen (chase) beat listesini buradan alır
function besteleTikla() {
  if (kayitKilidi('bestelemek')) return;
  if (!transport.buffer) { mesajGoster('önce müzik yükle (veya sentetik demo)'); return; }
  const a = analizEt(transport.buffer);
  sonAnaliz = a;
  const yeni = timelineUret(a, yonetici.liste());
  transport.sure = yeni.sure;                  // setter cizelge.sure'yi yazar (tek kaynak)
  // F1: bestele artık timeline'ı TAM DEĞİŞTİRMEZ — kaynak:'elle' damgalı kanallar
  // korunur, gerisi 'besteci' damgasıyla yenilenir (grup.js birlestirKoruyarak,
  // grupDerle'nin aynı mantığının bestele tarafındaki eşi). confirm() kalktı:
  // koruma artık damgada — ayrıca confirm() headless oluşturucuyu süresiz
  // kilitliyordu (ecb41de dersi).
  const { kanallar, korunan } = birlestirKoruyarak(cizelge.kanallar, yeni.kanallar, 'besteci');
  cizelge.kanallar = kanallar; editor.kanallariYenile();
  // v3 F6: bölüm özeti — kullanıcı bestenin yapısını tek satırda görür
  const bolumOzet = a.bolumler?.map(b => `${b.tip} ${b.t0.toFixed(0)}-${b.t1.toFixed(0)}s`).join(' · ');
  mesajGoster(`${a.bpm ? Math.round(a.bpm) + ' BPM · ' : ''}${a.beatler.length} beat · ${a.droplar.length} drop → koreografi üretildi${bolumOzet ? ' | ' + bolumOzet : ''}${korunan > 0 ? ' — ' + korunan + ' elle kanal korundu' : ''}`);
}
async function muzikSec(e) {
  const f = e.target.files[0]; if (!f) return;
  mesajGoster('çözülüyor: ' + f.name + ' …');
  try { await muzikYukle(f); }
  catch (err) { mesajGoster('çözülemedi: ' + err.message); }
  e.target.value = '';                 // aynı dosya tekrar seçilebilsin
}
document.getElementById('muzikDosya').onchange = muzikSec;   // şov modu girişi
document.getElementById('muzikDosya2').onchange = muzikSec;  // editör ustbar girişi
document.getElementById('bestele').onclick = besteleTikla;

// ▶ örnek şov (v3 F5): hazır .aqshow'lar (tools/ornek-uret.mjs üretir) — tek tık
// dolu koreografi; sahneKur normal dosya yolundan geçer (id haritalama dahil).
document.getElementById('ornek').onchange = async (e) => {
  const ad = e.target.value; e.target.value = '';
  if (!ad) return;
  if (kayitKilidi('örnek şov açmak')) return;
  if (yonetici.liste().length &&
      !confirm('Örnek şov mevcut sahneyi değiştirir. Devam?')) return;
  try {
    const r = await fetch('ornekler/' + ad + '.aqshow');
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const d = aqshowOku(await r.text());
    projeAd = d.ad || ad;
    projeAdEl.textContent = projeAd + '.aqshow';
    sahneKur(d);   // müzik uyarısını sahneKur'un ses sözleşmesi bloğu basar
  } catch (err) { mesajGoster('örnek açılamadı: ' + err.message); }
};

// --- renk desen kütüphanesi → editör bağlantısı (T-C kapanışı) ---
// desen.js SAF üretici; burada seçilen desen, renk taşıyan cihazların
// hue/beyaz kanallarını YENİDEN yazar (diğer kanallara dokunmaz).
const desenSec = document.getElementById('desen');
desenSec.onchange = () => {
  const ad = desenSec.value; if (!ad) return;
  desenSec.value = '';                               // select her durumda başa döner
  if (kayitKilidi('desen uygulamak')) return;
  const idler = yonetici.liste().filter(c => c.tur !== 'rgb_spot').map(c => c.id);
  if (!idler.length) { mesajGoster('önce cihaz ekle'); return; }
  if (!confirm('Desen mevcut renk kanallarını (hue/beyaz) yeniden yazar. Devam?')) return;
  // chase beat listesi: bestele koştuysa gerçek beatler, yoksa 0.5s sentetik
  const beatler = sonAnaliz?.beatler?.length ? sonAnaliz.beatler
    : Array.from({ length: Math.max(1, Math.floor(transport.sure / 0.5)) }, (_, i) => i * 0.5);
  let parcalar;
  if (ad === 'rainbow')     parcalar = rainbow(idler, transport.sure);
  else if (ad === 'chase')  parcalar = chase(idler, beatler);
  else if (ad === 'fade')   parcalar = fade(idler, transport.sure);
  else                      parcalar = strobe(idler, 0, Math.min(4, transport.sure), 8);
  // ⚠YALNIZ desenin GERÇEKTEN ürettiği hedefler silinir. Eskiden hue+beyaz'ın
  // ikisi birden siliniyordu; `strobe` sadece .beyaz üretiyor → tüm cihazların
  // .hue kanalı kalıcı olarak yok oluyordu (şeritten kaybolur, renk son değerde
  // donar, 💾 bu haliyle kaydeder). Denetim turu 2026-07-18 bulgusu.
  // Kanal SIRASI korunmalı: mevcut hedefin yerine yenisi geçer, yenileri sona
  // eklenir. Sona push etmek aynı cihazı iki ayrı ardışık koşuya bölüyordu →
  // serit-duzen.js MÜKERRER grup başlığı çiziyordu (aynı denetim, 3. bulgu).
  const yeni = new Map(parcalar.map(k => [k.hedef, k]));
  cizelge.kanallar = cizelge.kanallar.map(k => yeni.get(k.hedef) ?? k);
  const mevcut = new Set(cizelge.kanallar.map(k => k.hedef));
  cizelge.kanallar.push(...parcalar.filter(k => !mevcut.has(k.hedef)));
  editor.kanallariYenile();                          // kanal sayısı değişti → lane düzeni yeniden
  mesajGoster('desen uygulandı: ' + ad);
};

// --- F1 Task 9b: plan tuvalinde "Grupla" + grup paneli + desen uygula ---
// grup.js'in "üye TEK grupta kalır" sözleşmesi (gruplariDogrula: ilk görülen
// kazanır) burada YAZMA anında da korunur: zaten gruplu bir cihaz yeni gruba
// KATILMAZ (sessizce iki gruba düşüp sonra budanmak yerine, en baştan dışlanır
// ve kullanıcıya söylenir).
gruplaBtn.onclick = () => {
  const idler = plan.cokluIdler();
  if (idler.length < 2) return;                       // buton zaten gizli — savunma
  const zatenGruplu = new Set(gruplar.flatMap(g => g.uyeler));
  const temizIdler = idler.filter(id => !zatenGruplu.has(id));
  if (temizIdler.length < 2) {
    mesajGoster('grup kurulamadı — seçilenlerin en az ikisi başka bir grupta olmamalı');
    return;
  }
  const kayitlar = yonetici.liste().filter(c => temizIdler.includes(c.id));
  const dizilim = dizilimAlgila(kayitlar.map(c => ({ x: c.x, z: c.z })));
  const ilk = kayitlar[0];
  const ad = (ilk?.urun ?? ilk?.tur ?? 'cihaz') + ' ×' + temizIdler.length;
  const grup = yeniGrup('g' + (++grupSayac), ad, temizIdler, dizilim);
  gruplar.push(grup);
  secilGrupId = grup.id;
  editor.kanallariYenile();                            // şerit grup başlığını çizsin (kirlet() layout kurmaz)
  const atlanan = idler.length - temizIdler.length;
  mesajGoster(`grup kuruldu: ${ad} (${dizilim})` + (atlanan ? ` — ${atlanan} cihaz zaten grupta, atlandı` : ''));
  panelGuncelle();
};

// grup alanları: değişiklik doğrudan grup nesnesine yazılır + şerit başlığı
// (ad/rol) tazelenir. dizilim yalnız gelecekteki desen uygulamasını etkiler
// (faz sırası) ama tutarlılık için o da tazeler — ucuz, zararsız.
grupAdEl.oninput = () => { const g = grupSecili(); if (g) { g.ad = grupAdEl.value; editor.kanallariYenile(); } };
grupRolEl.onchange = () => { const g = grupSecili(); if (g) { g.rol = grupRolEl.value; editor.kanallariYenile(); } };
grupDizilimEl.onchange = () => { const g = grupSecili(); if (g) { g.dizilim = grupDizilimEl.value; editor.kanallariYenile(); } };
grupPeriyotEl.oninput = () => { grupPeriyotYaziEl.textContent = Number(grupPeriyotEl.value).toFixed(1) + 's'; };

// desen uygula: grup.js grupDerle SAF derleyicisine devredilir — motor grupla
// hiç konuşmaz, desen üye cihazların kanallarına YAZILIR (spec §1). Grup
// genelinde TEK 'tip' (step/smooth): karma-grup üye-başına tip çözme kapsam
// DIŞI (YAGNI, spec §karar) — grubun ilk üyesinin arketipine bakılır.
desenUygulaBtn.onclick = () => {
  if (kayitKilidi('desen uygulamak')) return;
  const g = grupSecili();
  if (!g) { mesajGoster('önce bir grup seç/oluştur'); return; }
  const desenAdi = grupDesenEl.value;
  if (!desenAdi) { mesajGoster('önce desen seç'); return; }
  const ilkUye = yonetici.liste().find(c => c.id === g.uyeler[0]);
  // urunCoz(c.urun) katalog künyesinden arketip çözer; künye yoksa (elle
  // döşenmiş jenerik tür) c.tur zaten arketiptir (palet döşemesi dataset.tur'u
  // arketiple dolduruyor — bkz. katalog.js urunCoz) — fallback güvenli.
  const arketip = ilkUye && (urunCoz(ilkUye.urun) ?? ilkUye.tur);
  const tip = (arketip === 'switch' || arketip === 'pop') ? 'step' : 'smooth';
  const konumMap = Object.fromEntries(yonetici.liste().map(c => [c.id, { x: c.x, z: c.z }]));
  const params = { sure: transport.sure, periyot: Number(grupPeriyotEl.value),
                    beatler: sonAnaliz?.beatler ?? [], tip };
  const { kanallar, korunan } = grupDerle(g, desenAdi, params, cizelge.kanallar, konumMap);
  cizelge.kanallar = kanallar;
  g.sonDesen = { ad: desenAdi, params };   // Task 10 "gruba döndür" bunu okuyacak
  editor.kanallariYenile();
  mesajGoster('desen uygulandı' + (korunan ? ' — ' + korunan + ' elle kanal korundu' : ''));
  panelGuncelle();                       // korunan/elle durumu değişmiş olabilir → #gruba-dondur tazelensin
};

// F1 Task 10: "gruba döndür" — grup üyelerinin ELLE damgalı kanallarındaki
// damgayı temizler (delete k.kaynak — grupElleKanallari zaten yalnız o grubun
// üyelerini + kaynak==='elle' olanları döner) ve varsa son uygulanan deseni
// yeniden derler. confirm() BİLEREK KULLANILMAZ: bu repoda headless oluşturucuyu
// süresiz kilitliyor (iki kez yaşandı — ecb41de + tools/etkilesim.html dersi) ve
// bu düğme Task 11 etkileşim koşucusunda TIKLANACAK. Onay yerine eylem doğrudan
// uygulanır + mesajGoster ile net bildirilir — veri kaybı geri alınabilir
// (kullanıcı isterse deseni yeniden uygular), modal riski buna değmez.
grubaDondurBtn.onclick = () => {
  if (kayitKilidi('gruba döndürmek')) return;
  const g = grupSecili();
  if (!g) return;
  const elleKanallar = grupElleKanallari(g, cizelge.kanallar);
  for (const k of elleKanallar) delete k.kaynak;
  if (g.sonDesen) {
    const konumMap = Object.fromEntries(yonetici.liste().map(c => [c.id, { x: c.x, z: c.z }]));
    const { kanallar } = grupDerle(g, g.sonDesen.ad, g.sonDesen.params, cizelge.kanallar, konumMap);
    cizelge.kanallar = kanallar;
    mesajGoster(`gruba döndürüldü — ${elleKanallar.length} kanal, desen (${g.sonDesen.ad}) yeniden uygulandı`);
  } else {
    // Henüz desen uygulanmamış (g.sonDesen yok) — damgayı temizlemekle yetin,
    // yeniden derleyecek bir şey yok. Durumu kullanıcıya net söyle.
    mesajGoster(`gruba döndürüldü — ${elleKanallar.length} kanal, elle damgası temizlendi (henüz desen uygulanmamış)`);
  }
  editor.kanallariYenile();
  panelGuncelle();
};

// --- proje: .aqshow kaydet/aç + localStorage taslak (Task 15) ---
let projeAd = 'adsiz';                                  // #proje-ad span'ıyla eşleşir
const projeAdEl = document.getElementById('proje-ad');

function durumTopla() {
  return {
    ad: projeAd,
    // fon dropdown'dan okunur: mekan.aktifFon STATİK başlangıç değeridir,
    // fonSec onu güncellemez (plan T15 uyarısı) — tek güncel kaynak #fon.
    mekan: { fon: fonSecim.value, plan: plan.durum() },
    cihazlar: yonetici.liste(),
    cizelge,
    gruplar,
    muzikAdi: sonMuzikAdi || null,
  };
}

// Dosyadan gelen cihaz kaydı → ekle() seceneği. yogunluk: parçacık bütçesi
// (yoksa 1 = tam bütçe; eski dosyada 3× parçacık bulgusu — denetim 2026-07-18).
// ozIsik: çıplak cihaz bayrağı (spec 2026-07-21 §3) — aqshowOku çıplak türde
// alanı hep doldurur (eski dosya → true); aktarmazsak ekle() vario'yu false'a
// düşürür, kayıtlı "ışıklı vario" sessizce sönerdi.
const yukSecenek = (c) => ({
  ...(Number.isFinite(c.yogunluk) ? { yogunluk: c.yogunluk } : {}),
  ...(typeof c.ozIsik === 'boolean' ? { ozIsik: c.ozIsik } : {}) });

// sahneyi sıfırla + dosyadaki durumdan yeniden kur. Cihaz id'leri dosyadakiyle
// AYNI DOĞMAZ (cihazYonetici sayacı hiç sıfırlanmaz — kayıt yolu/smoke bunu
// varsayar), o yüzden eski→yeni id haritasıyla kanal hedefleri yeniden yazılır.
// secenek.gecissiz: fon çapraz geçişini ATLA (süre 0). Headless kare çekimi
// için ŞART — geçiş gerçek karelere bağlı, virtual-time onu ilerletmez.
function sahneKur(d, secenek = {}) {
  // ⚠ŞARKIYA BAĞLI DURUMLAR SIFIRLANIR (denetim 2026-07-18): `sonAnaliz` bestele
  // çıktısıydı; sıfırlanmayınca yeni projede `chase` deseni ESKİ şarkının beat
  // listesiyle çiziliyordu (yeni müzik hiç yüklenmemişse bile). `carpmaKuyruk`
  // ise eski showT'ye göre zamanlanmış çarpma seslerini taşır → yeni şovun ilk
  // saniyelerinde alakasız su sesi patlıyordu.
  sonAnaliz = null;
  carpmaKuyruk.length = 0;
  for (const c of yonetici.liste()) yonetici.sil(c.id); // sil+ekle her adımda kirlet() çağırır (T10 konvansiyonu)
  const harita = new Map();                             // dosyadaki id → yeni id
  for (const c of d.cihazlar) {
    // T-E: ürün adı dosyadan geri gelir; katalogda karşılığı olmayan ad da
    // taşınır (tur alanı arketipi zaten belirler — ileriye uyumluluk).
    // yogunluk/ozIsik: yukSecenek (yukarıda) — bütçe + çıplak cihaz bayrağı.
    const yeni = yonetici.ekle(c.tur, c.x, c.z, c.urun ?? null, yukSecenek(c));
    if (!yeni) continue;                                // spot slotu dolu vb. — yonetici mesajı zaten verdi
    if (c.aci) yonetici.dondur(yeni, c.aci);            // taze cihaz 0°'den başlar → delta = mutlak açı
    harita.set(c.id, yeni);
  }
  // süre ÖNCE, tek kaynak transport.sure setter'ı üzerinden (min-1s kelepçe) —
  // bozuk dosyadan gelen 0/NaN editörün tX/xT bölmelerine ulaşamaz.
  transport.sure = d.cizelge.sure;
  // ekle'nin doğurduğu varsayılan kanallar dosyadakilerle DEĞİŞTİRİLİR;
  // haritada karşılığı olmayan hedefler (aqshowOku'nun ayıkladığı cihazlar) düşer.
  cizelge.kanallar = (d.cizelge.kanallar ?? []).flatMap(k => {
    const eski = k.hedef.split('.')[0];
    const yeni = harita.get(eski);
    return yeni ? [{ ...k, hedef: yeni + k.hedef.slice(eski.length) }] : [];
  });
  // F1 Task 9a: grup üyeleri de eski→yeni id haritasından geçmeli — geçmezse
  // kaydet→aç sonrası gruplar sessizce yok olur (üyeler artık var olmayan eski
  // id'lere işaret eder, gruplariDogrula onları ölü sanıp buda). Sırasıyla:
  // önce yeniden adlandır (haritada olmayan üye olduğu gibi kalır), sonra
  // doğrula (haritasız/ölü üye budanır, boş grup düşer) — grup.js sözleşmesi.
  gruplar = gruplariDogrula(gruplarYenidenAdlandir(d.gruplar ?? [], harita),
                            yonetici.liste().map(c => c.id));
  grupSayacGuncelle(gruplar); secilGrupId = null;       // id çakışması + eski grup seçimi temizlenir
  editor.kanallariYenile();                             // kanal SAYISI değişti → lane düzeni yeniden (T10/T11 konvansiyonu)
  if (d.mekan?.plan?.tip === 'dxf') {
    plan.dxfYukle(d.mekan.plan.veri, d.mekan.plan.dosyaAdi, dxfAyristir);
    if (d.mekan.plan.olcek && d.mekan.plan.olcek !== 1) plan.olcekle(d.mekan.plan.olcek); // kayıtlı kalibrasyon geri gelsin
  } else if (d.mekan?.plan?.tip === 'dxf-parcalar') {
    plan.dxfSonucYukle({ parcalar: d.mekan.plan.parcalar, birimOlcek: 1,   // parçalar zaten metre+kalibre
      atlanan: 0, dusen: 0, toplam: d.mekan.plan.parcalar.length }, d.mekan.plan.dosyaAdi);
  } else plan.temizle();          // plansız dosya = zeminsiz sahne — eski PNG/DXF kalmasın (T16 kalite bulgusu)
  if (mekan.fonAdlari.includes(d.mekan?.fon)) {
    mekan.fonSec(d.mekan.fon, secenek.gecissiz ? 0 : undefined);
    fonSecim.value = d.mekan.fon;   // ELLE senkron: fonSec dropdown'ı güncellemez (plan T15 uyarısı)
  }
  sonMuzikAdi = d.muzikAdi || '';   // ad korunur ki müzik yüklenmeden kaydedilirse kaybolmasın
  transport.scrubla(0);             // yeni şov baştan (showT eski süreyi aşmış olabilir)
  muzikDurumTazele();                 // ses sözleşmesi: yeni şovun müzik durumu rozete yazılır
  const notlar = [...(d.uyarilar ?? []), ...muziksizNotlar(d.muzikAdi)];
  if (notlar.length) mesajGoster(notlar.join(' · '));
}

document.getElementById('proje-kaydet').onclick = () => {  // 💾
  const u = URL.createObjectURL(new Blob([aqshowYaz(durumTopla())], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = u; a.download = projeAd + '.aqshow'; a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
  // T15 devir notu (1): PNG bitmap'i .aqshow'a serileşmez (plan.durum() null döner) —
  // sessiz veri kaybı yerine kayıt ANINDA söylenir. Mesaj balonu tek-slot olduğundan
  // uyarı "kaydedildi"nin üzerine ayrı mesajla değil aynı satırda eklenir.
  const pngNotu = plan.zeminTipi() === 'png' ? ' · ⚠ PNG zemin dosyaya girmez (yalnız DXF kaydedilir)' : '';
  mesajGoster('kaydedildi: ' + projeAd + '.aqshow' + pngNotu);
};
document.getElementById('projeDosya').onchange = async (e) => {  // 📁
  const f = e.target.files[0]; if (!f) return;
  // T15 devir notu (2), bilinçli seçim: kayıt aktifken proje yüklemesi REDDEDİLİR
  // (kaydı durdurup yüklemek değil). Gerekçe: en az sürpriz — 🔴'ye basan kullanıcı
  // "bir tam şovun webm'ini" bekliyor; 📁 kazara tıklandıysa sahneyi sıfırlamak hem
  // kaydı yarıda keser hem yarım-şov + yeni-sahne karışımı bozuk video indirir.
  // Reddetmek mevcut işi korur; kullanıcı isterse ⏹ ile durdurup tekrar dener.
  if (kayit.kaydediyor()) {
    mesajGoster('kayıt sürüyor — proje açmak için önce ⏹ ile durdur');
    e.target.value = '';
    return;
  }
  try {
    const d = aqshowOku(await f.text());
    projeAd = d.ad || f.name.replace(/\.(aqshow|json)$/i, '') || 'adsiz';
    projeAdEl.textContent = projeAd + '.aqshow';
    sahneKur(d);
  } catch (err) { mesajGoster('.aqshow açılamadı: ' + err.message); }
  e.target.value = '';                 // aynı dosya tekrar seçilebilsin
};

// #projedemo smoke kancası (plan T15 Step 4): #demo&projedemo ile koş —
// yaz → hepsini sil → oku ile yeniden kur → cihaz sayısı aynı kalmalı.
// Başarı mesaj balonuna, hata console.error'a (smoke politikası onu yakalar).
if (hashAnahtar.has('projedemo')) {
  const once = yonetici.liste().length;
  const metin = aqshowYaz(durumTopla());
  sahneKur(aqshowOku(metin));          // sahneKur zaten önce hepsini siler
  const sonra = yonetici.liste().length;
  if (sonra !== once) console.error(`projedemo: cihaz sayisi degisti ${once}→${sonra}`);
  else mesajGoster(`projedemo TEMIZ: ${once} cihaz gidiş-dönüş`);
}

// localStorage taslak — SMOKE/confirm kilidine karşı İKİ katmanlı guard:
// (1) hashAnahtar'da HERHANGİ bir anahtar varken (demo/plandemo/sim/kayit/
//     mod=editor/projedemo…) taslak NE YAZILIR NE SORULUR — headless smoke
//     sim= sanal-zaman bütçesiyle 5sn interval'ini ateşleyip taslak yazar,
//     bir SONRAKİ açılışta confirm() browser dialog'u sayfayı kilitler ve
//     tüm smoke setini bozardı.
// (2) hash'siz düz açılışta bile yazım ancak İLK gerçek kullanıcı jestinden
//     (pointerdown/keydown) sonra başlar — headless'ta jest yok, boş sayfa
//     bakışı asla taslak üretmez; gerçek kullanıcının işi ise korunur.
const otomasyon = [...hashAnahtar].some(Boolean);       // boş hash → Set{''} → false
let etkilesimOldu = false, taslakUyarildi = false;
const ilkJest = () => { etkilesimOldu = true; };
addEventListener('pointerdown', ilkJest, { once: true });
addEventListener('keydown', ilkJest, { once: true });
if (!otomasyon) {
  setInterval(() => {
    if (!etkilesimOldu) return;
    try { localStorage.setItem('aqshow-taslak', aqshowYaz(durumTopla())); }
    catch (e) {                                          // quota vb. — bir kez uyar, spam yok
      if (!taslakUyarildi) { taslakUyarildi = true; mesajGoster('taslak kaydedilemiyor: ' + e.message); }
    }
  }, 5000);
  const taslak = localStorage.getItem('aqshow-taslak');
  if (taslak) {
    if (confirm('Kaydedilmemiş taslak bulundu — taslağı geri yükle?')) {
      // önce genel mesaj, sonra sahneKur — sahneKur'un notları ("müziği tekrar
      // yükle" / uyarilar) daha önemli, tek-slot mesaj balonunda onlar kalsın.
      try { mesajGoster('taslak geri yüklendi'); sahneKur(aqshowOku(taslak)); }
      catch (e) { mesajGoster('taslak bozuk: ' + e.message); localStorage.removeItem('aqshow-taslak'); }
    } else localStorage.removeItem('aqshow-taslak');    // reddedilen taslak silinir — her açılışta sormasın
  } else if (!yonetici.liste().length) {
    // ⚠KOŞUL NOTU: burada ayrıca hash kontrolü YAPILMAZ — zaten `!otomasyon`
    // bloğundayız (boş hash → Set{''} → otomasyon=false). `hashAnahtar.size`
    // boş hash'te 1'dir, onunla kontrol etmek karşılamayı hiç açmıyordu.
    // ⭐KARŞILAMA ŞOVU (denetim 2026-07-18): hash'siz ilk açılışta ekranda BOŞ bir
    // havuz vardı — siteye ilk giren "çalışmıyor mu?" diye bakıyordu. Vitrin
    // ürününde ilk kare çalışan bir şov olmalı. Yalnızca gerçekten boş girişte:
    // taslak varsa o kazanır, herhangi bir hash varsa (demo/örnek/editör/smoke)
    // o yol kazanır — deterministik kare çekimi etkilenmez.
    fetch('ornekler/mozart-daire.aqshow')
      .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
      .then(t => {
        sahneKur(aqshowOku(t), { gecissiz: true });
        projeAd = 'mozart-daire'; projeAdEl.textContent = projeAd + '.aqshow';
        // Kadraj + CANLI AN: varsayılan kamera havuza çok yakın ve alçaktı,
        // t=0'da da şov henüz açılmamış oluyor → ilk kare boş havuz gibi
        // görünüyordu. Şovun aktığı bir ana atlayıp seyir açısına geçiyoruz
        // (#ornek= yolunun kullandığı kadrajın aynısı).
        kam.sabitle(); camera.position.set(11, 6, 13); controls.target.set(0, 2, 0);
        transport.scrubla(6);
        transport.oynat(true);
        mesajGoster('karşılama şovu — kendi sahneni kurmak için [TAB] editör');
      })
      .catch(() => {});                                  // karşılama başarısızsa sessiz: boş sahne yine çalışır
  }
}
// --- proje kaydet/aç sonu ---

// Döngü gövdesi TEK yerde: rAF de #demo&sim ön-sürücüsü de bunu koşar (kopya yok).
// derinlikOnGecisi + composer.render BİLEREK dışarıda — ön-adımlamada her adımda
// tam render israf (Reflector sahneyi bir kez daha çizer), motor'un GPU compute'u
// (adim) ise her adımda şart; render'ı normal döngü son durumdan üretir.
// Duraklatma TEK noktada (T7 kalite notu): transport.tik duraklatmada saati
// ilerletmez + dtSim=0'lanır — su parçacıkları donar (uDt=0) ama zamanlayici.uygula,
// motor.adim(0,·) içindeki spot guncelle ve render AKMAYA DEVAM eder: ekran donmaz,
// scrub'da timeline değerleri sahneye anında işler. "Tek nokta" saati/simülasyonu
// durdurur, render'ı değil. (kamera.js serbest-pencere erimesi kendi tik'inde
// !oynuyor kapısıyla çözüldü — T7 notunun ikinci yarısı.)
function adimla(dt) {
  const showT = transport.tik(dt);           // saat: duraklatmada donuk kalır
  const dtSim = transport.oynuyor ? dt : 0;  // simülasyon dt'si (ders 10 dtFizik deseni)
  zamanlayici.uygula(showT);                 // kanallar → kayitTablosu setter'ları (motor.adim'den ÖNCE: spot guncelle taze değeri okusun)
  motor.adim(dtSim, showT);
  // v6 F6: çarpma halkaları — duraklatmada su donmasın diye mekan.tik gibi
  // akar ama KAYNAKLAR dtSim'e bağlı (duraklatmada yeni tümsek yazılmaz,
  // mevcut halkalar dışarı yayılıp söner — doğal).
  ripple.adim(dtSim > 0 ? motor.carpmaNoktalari() : []);
  mekan.setRipple(ripple.doku());
  mekan.tik(dt);                             // v4 su yüzeyi saati (duraklatmada da akar — su doğa)
  yonetici.tik(showT);                       // laminer streak saatleri (showT donuksa onlar da donuk)
  controls.update();
  kameraCerceveTazele();                     // kadraj gerçek yerleşime otursun (seyrek)
  kam.tik(dt, transport.oynuyor && mod === 'sov');  // editörde mod!=='sov' → tik no-op, OrbitControls serbest
}
// Kamera dili v2 — otomatik çerçeveleme beslemesi. Cihazların yayılımını
// kameraya bildirir; çekimler oraya taşınıp ölçeklenir (kamera.js sahneCercevele).
// ⚠Her karede DEĞİL: cihaz listesi nadiren değişir, 30 karede bir yeter
// (37 cihazlık sahnede bile maliyet yok ama gereksiz iş de yapılmasın).
// Cihaz yoksa dokunulmaz — boş sayfada kamera referans çerçevesini korur.
let cerceveSayac = 0;
function kameraCerceveTazele() {
  if (++cerceveSayac % 30 !== 0) return;
  const c = sahneCercevesi(yonetici.liste());     // geometri.js — SAF, node testli
  if (c) kam.sahneCercevele(c.merkez, c.yariCap);
}

// #demo&sim=<saniye>: deterministik ön-adımlama (smoke kanıtı) — ilk kare
// çizilmeden sahne sabit 1/60 sn adımlarla senkron ilerletilir. rAF/clock
// saatine yaslanmaz: headless'ta --virtual-time-budget sıçramalı ilerliyor ve
// dt kelepçesi farkı siliyor (plan Task 7 notu). Demo dışı hash'te etkisiz.
if (hashAnahtar.has('demo')) {
  // T13 Step 5: demo sahnesi sentetik parçayla BESTELENİR — şeritler dolu,
  // sahne koreografili açılır (sim= ön-adımlaması da koreografiyi oynatır).
  // AudioBuffer DOĞRUDAN kurulur (new AudioBuffer, AudioContext'siz): açılışta
  // AudioContext kurmak Chrome'un autoplay uyarısını konsola yazar, smoke
  // politikası bozulurdu (üstteki tembel sesBaglam notu). actx yok → sesAktif
  // false → iç saat sürer, ses çalmaz; gerçek müzik yüklenince buffer değişir.
  const { veri, sr } = sentetikPCM(16, 120);
  const sentetikBuf = new AudioBuffer({ length: veri.length, numberOfChannels: 1, sampleRate: sr });
  sentetikBuf.copyToChannel(veri, 0);
  transport.buffer = sentetikBuf;
  besteleTikla();      // confirm yok (F1) — demo elle kanal içermediği için birlestirKoruyarak'ın hepsini yeniden yazar
}

// TEŞHİS KANCASI (Faz 1.5, 2026-07-25) — `#...&hiz=0.25`: tüm debi kanallarını
// TEK sabite kilitler. Gerekçe: "hız düşükken ışık göz alıyor / kare gibi"
// şikâyeti YALNIZ düşük pompa hızında görülüyor; headless kare çekicisinin
// (tools/smoke.sh) o duruma girmesinin başka yolu yoktu — besteci her karede
// hız kanalını yeniden sürüyor, setHiz'i elle çağırmak bir sonraki karede
// eziliyordu. Kanalın kendisini sabitlemek tek dayanıklı yol.
// sim= ön-adımlamasından ÖNCE koşar ki çekilen kare de kilitli hızda olsun.
// Ürün yüzeyi DEĞİL: hash yoksa tek satır bile çalışmaz.
const ehiz = location.hash.match(/hiz=([\d.]+)/);
if (ehiz) {
  const v = parseFloat(ehiz[1]);
  for (const k of cizelge.kanallar) if (k.hedef.endsWith('.hiz')) k.anahtarlar = [[0, v]];
}

// v5.6: sim= ön-adımlama ARTIK HERHANGİ senkron sahne hash'i için (demo/
// katalogdemo/sablondemo...) — tools/kareler.sh hareket şeritleri bununla
// çekilir (ışık dönüşü/süpürme/salvo headless'ta görünür olsun). #ornek async
// yüklenir, orada t= kancası kullanılır (sim etkisiz kalır, zararsız).
const es = location.hash.match(/sim=([\d.]+)/);
if (es) {
  for (let i = Math.round(parseFloat(es[1]) * 60); i > 0; i--) adimla(1 / 60);
  clock.getDelta();  // ön-adımlamada geçen duvar-saatini yut — ilk kare kelepçeye çarpan dev dt ile başlamasın
}

const saatEl = document.getElementById('saat');
renderer.setAnimationLoop(() => {
  adimla(Math.min(clock.getDelta(), 1 / 20));
  // şerit tuvali rAF disiplininde (playhead her kare akar); PLAN tuvali olay-
  // güdümlü kalır — iki ayrı öğe, bilinçli ayrım (spec: plan vs şerit çizimi).
  if (mod === 'editor') { editor.ciz(transport.showT); panelCanliGuncelle(); }  // İŞ3: renk/güç playhead ile canlı
  saatEl.textContent = transport.showT.toFixed(1) + ' / ' + transport.sure.toFixed(1) + ' s';
  cetvelGuncelle();
  // v3 F4: kısık taban fısıltısı + showT-senkron çarpma kuyruğu. Bayat girdi
  // (0.6s'den eski — scrub/duraklatma artığı) çalınmadan atılır; döngü sarımında
  // (showT başa dönünce) gelecek-zamanlı girdiler de temizlenir.
  // SES SÖZLEŞMESİ (2026-07-23): müzik YOKKEN su sesi de ÇALMAZ. Gerekçe:
  // `.aqshow` müzik taşımaz; örnek şov açılınca sahne sessiz kalıyor ve geriye
  // yalnız çarpma SFX'i kalıyordu. Ritme kilitli şovda bunlar arka arkaya
  // patlayınca kullanıcı "pat pat pat aptal bir ses" duyuyor (Salih, 2026-07-22).
  // Su sesi müziğin ALTINDA bir doku katmanıdır — tek başına ürünü ucuzlatıyor.
  // ⚠Karar müziğe bağlı, cihaz sayısına değil: müzik varsa v3 F4 davranışı aynen.
  if (suSesi && muzikVar()) {
    suSesi.seviye(transport.oynuyor && motor.toplamParcacik() > 0 ? 1 : 0);
    // ⚠AYNI KAREDE ÇOK ÇARPMA (denetim 2026-07-18): kuyruk sınırsız boşalıyordu.
    // Beat'e kilitli kalabalık şovda (37 cihazlı daire, SWITCH'ler her vuruşta
    // kesiyor) tek karede onlarca çarpma çakışıyor: her biri 3 Web Audio düğümü
    // doğurur (kare başına ~100 düğüm) ve üst üste binen patlamalar tek bir
    // bozuk "şak" sesine dönüşüp kırpılır. Artık kare başına EN FAZLA 4 çalınır;
    // çakışanların enerjisi kalanlara aktarılır (√n, 1'e kelepçeli) — ses
    // "kalabalık" duyulur ama distorsiyona girmez, kalanlar DÜŞÜRÜLÜR (kuyrukta
    // bekletmek onları geç ve yanlış anda çalardı).
    const KARE_BASINA_CARPMA = 4;
    const olgun = [];
    for (let i = carpmaKuyruk.length - 1; i >= 0; i--) {
      const c = carpmaKuyruk[i];
      if (c.t <= transport.showT) {
        if (transport.showT - c.t < 0.6 && transport.oynuyor) olgun.push(c);
        carpmaKuyruk.splice(i, 1);
      } else if (c.t > transport.showT + 3) carpmaKuyruk.splice(i, 1);
    }
    if (olgun.length) {
      olgun.sort((a, b) => b.siddet - a.siddet);          // en güçlüler duyulsun
      const calinan = Math.min(KARE_BASINA_CARPMA, olgun.length);
      const kazanc = Math.min(1, Math.sqrt(olgun.length / calinan));
      for (let i = 0; i < calinan; i++) suSesi.carpma(Math.min(1, olgun[i].siddet * kazanc));
    }
  } else {
    if (suSesi) suSesi.seviye(0);      // müziksizken taban fısıltısı da sussun
    carpmaKuyruk.length = 0;
  }
  motor.derinlikOnGecisi();
  composer.render();
  otoPozlama();                              // v6 F7: kare parlaklığına lerp'li pozlama
  if (kayit.kaydediyor()) kayit.kareCiz();   // kompozit kayıt karesi — render SONRASI (taze kare)
});

// v6 F7 auto-exposure: ekran merkezinden 48×48 blok oku (spot metering — konu
// çeşme, merkezde), ortalama lumaya doğru pozlamayı yumuşak lerp'le. readPixels
// preserveDrawingBuffer:true sayesinde render sonrası geçerli; 8 karede bir
// (GPU→CPU senkron stall'ı seyrelt). Kelepçe 0.55..1.7: gece hissi kaybolmasın.
const pozBlok = 48;
const pozBuf = new Uint8Array(pozBlok * pozBlok * 4);
let pozSayac = 0;
function otoPozlama() {
  if ((pozSayac++ & 7) !== 0) return;
  const gl = renderer.getContext();
  const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
  gl.readPixels((w - pozBlok) / 2 | 0, (h - pozBlok) / 2 | 0, pozBlok, pozBlok,
    gl.RGBA, gl.UNSIGNED_BYTE, pozBuf);
  let top = 0;
  for (let i = 0; i < pozBuf.length; i += 4)
    top += pozBuf[i] * 0.2126 + pozBuf[i + 1] * 0.7152 + pozBuf[i + 2] * 0.0722;
  const luma = top / (pozBlok * pozBlok * 255);
  // hedef 0.16: gece çeşmesi — merkez konu aydınlık ama sahne karanlık kalır
  const hedef = Math.min(1.7, Math.max(0.55, renderer.toneMappingExposure * (0.16 / Math.max(luma, 0.02))));
  renderer.toneMappingExposure += (hedef - renderer.toneMappingExposure) * 0.06;
}
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
  yildizPass.uniforms.uOran.value = innerHeight / innerWidth;   // v6 F7 kol oranı
  {
    const dpr = renderer.getPixelRatio();
    fxaaPass.material.uniforms.resolution.value.set(1 / (innerWidth * dpr), 1 / (innerHeight * dpr));
  }
  motor.cozunurlukGuncelle();
  plan.ciz();                              // plan tuvali yeni yerleşim boyutuna uysun (gizliyse no-op)
});

// hata ayıklama köprüsü (plan T12 Step 3 — derslerdeki window.DERS10 deseni)
window.STUDIO = {
  transport, cizelge, yonetici, zamanlayici, analizEt, timelineUret, sentetikPCM,
  // Task 11 (etkilesim.sh grup senaryosu): debug yüzeyi — `gruplar` bir `let`
  // (kirlet() içinde yeniden atanır), düz referans veren nesne alanı bayatlar.
  // Fonksiyon her çağrıda GÜNCEL diziyi döner. Ürün davranışı değişmiyor.
  gruplar: () => gruplar,
  // Kamera dili v2 teşhisi: kadraj/çekim iddialarını GÖZLE değil SAYIYLA
  // doğrulayabilmek için (gece turunda otomatik çerçeveleme böyle ölçüldü).
  kamera: () => ({
    konum: camera.position.toArray().map((n) => +n.toFixed(2)),
    hedef: controls.target.toArray().map((n) => +n.toFixed(2)),
    mesafe: +camera.position.distanceTo(controls.target).toFixed(2),
    kam: kam.durum(), mod
  }),
};

// Ses sözleşmesi: rozet AÇILIŞTA da doğru olsun. Boş sayfada cihaz koyup ▶'e
// basan kullanıcı da hiç ses duymayacak (su sesi müziğe bağlı) — sebebini
// söylemeden susmak, sessizliği ürünün hatası gibi gösterir.
muzikDurumTazele();
