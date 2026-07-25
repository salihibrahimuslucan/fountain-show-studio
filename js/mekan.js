// Mekan — fon galerisi (prosedürel gökyüzü + ortam katmanları) + havuz diski +
// CANLI SU YÜZEYİ (v4 F1: Reflector + özel su shader'ı). Boş kabuğa "sahne yeri"
// verir; cihazlar bu zemine karşı soft-fade yapsın diye havuz/su meshleri
// derinlik ön-geçişinde KALIR (motor.gizleEkle'ye kaydedilmez).
// v2 T-F: fonlar veri-zengin preset oldu — siluet + ağaç + pencere/aplik ışık
// lekeleri + taş kıyı rengi + ambiyans ışığı + sis rengi preset'ten gelir.
// v4 F1 (referans: docs/referans/mesela*.png — Salih: "her yer siyah"): %72
// karartı diski SÖKÜLDÜ; Reflector artık özel shader'la canlı su — iki zıt
// akışlı normal katmanı yansıma UV'sini bozar, Fresnel alçak kamerada aynayı
// güçlendirir, yükseklik-çakışması glint'i bloom'u besler. Sahnenin ışığını
// (jet + 412C halka) geniş renkli göllere yayan şey BU distorsiyonlu yansıma.
// Her katman PROSEDÜREL (dış asset yok); su normal haritası DataTexture —
// canvas KULLANILMAZ (premultiply alpha normalleri bozar), yükseklik alpha'da.
// Bilinen sınır: yansımadaki parçacık soft-fade'i ANA kameranın derinlik
// dokusuna göre örnekleniyor — hata ama dalga distorsiyonu altında görünmüyor.
// Reflector derinlik ön-geçişinde de çiziyor: +2 tam-sahne/kare (plan +1 sayar).
// FPS düşerse: YANSIMA_PX 1024→512 + preset kirpisma=0.
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { gokPiksel, yildizNoktalari, haleAlfa, siluetPiksel, agacPiksel, sehirUret,
         tasPiksel, tohumluRastgele } from './fon-doku.js';
// v7 M6: preset TABLOSU + presete bağlı saf hesaplar artık THREE'siz modülde
// (Node testli). Burası yalnız "veriyi sahneye kur" işini yapar.
import { FONLAR, VARSAYILAN_FON, sisAralik, sisRengi, zeminSonum,
         tepePiksel, duvarPiksel } from './fon-preset.js';
import { gecisYarat, lerp } from './gecis.js';
import { KATMAN } from './katman.js';
import { RIPPLE_ALAN, RIPPLE_IZGARA } from './ripple.js';

// --- v4 F1: canlı su yüzeyi ---
const YANSIMA_PX = 1024;

// Prosedürel su normal haritası: tohumlu LCG (deterministik — her açılışta aynı
// su) → 2 oktav sarmalı bilinear değer-gürültüsü yükseklik alanı → sonlu fark
// normalleri. RGB=normal, A=yükseklik (shader'da glint eşiği).
function suNormalDoku(S = 256, IZ = 32, tohum = 1453) {
  const rnd = tohumluRastgele(tohum);
  const g = Float32Array.from({ length: IZ * IZ }, () => rnd());
  const orn = (x, y) => g[(((y % IZ) + IZ) % IZ) * IZ + (((x % IZ) + IZ) % IZ)];
  const h = new Float32Array(S * S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    let v = 0, gen = 0.68, olcek = IZ / S;          // oktav1 kaba dalga, oktav2 ince kırpışma
    for (let o = 0; o < 2; o++) {
      const fx = x * olcek, fy = y * olcek;
      const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
      const a = orn(x0, y0), b = orn(x0 + 1, y0), c = orn(x0, y0 + 1), d = orn(x0 + 1, y0 + 1);
      v += gen * ((a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty);
      gen *= 0.5; olcek *= 3.1;
    }
    h[y * S + x] = v;
  }
  const px = new Uint8Array(S * S * 4);
  const K = 3.0;                                     // kabartma (normal eğim kazancı)
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = (h[y * S + (x + 1) % S] - h[y * S + (x - 1 + S) % S]) * K;
    const dy = (h[((y + 1) % S) * S + x] - h[((y - 1 + S) % S) * S + x]) * K;
    const l = Math.hypot(dx, dy, 1);
    const i = (y * S + x) * 4;
    px[i] = (-dx / l * 0.5 + 0.5) * 255;
    px[i + 1] = (-dy / l * 0.5 + 0.5) * 255;
    px[i + 2] = (1 / l * 0.5 + 0.5) * 255;
    px[i + 3] = Math.min(255, h[y * S + x] * 255);
  }
  const t = new THREE.DataTexture(px, S, S);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}

// Reflector'ın options.shader kancasına verilen su malzemesi. Sözleşme uniformları
// (color/tDiffuse/textureMatrix) Reflector kurucusu doldurur; gerisi fonSec/tik.
const SU_SHADER = {
  name: 'SuShader',
  uniforms: {
    color: { value: null },            // derin su tonu (preset su.derin)
    tDiffuse: { value: null },
    textureMatrix: { value: null },
    tNormal: { value: null },
    tRipple: { value: null },          // v6 F6: height-field sim çıktısı (R=yükseklik)
    uRipple: { value: 0.0 },           // ripple normal kazancı (0=kapalı, setRipple açar)
    uTime: { value: 0 },
    uDalga: { value: 0.05 },           // yansıma UV sapma genliği
    uParlaklik: { value: 0.85 },       // yansıma kazancı
    uKirpisma: { value: 0.6 }          // glint kazancı
  },
  vertexShader: /* glsl */`
    uniform mat4 textureMatrix;
    varying vec4 vUv;
    varying vec3 vDunya;
    varying vec2 vYerel;
    #include <common>
    #include <logdepthbuf_pars_vertex>
    void main() {
      vUv = textureMatrix * vec4(position, 1.0);
      vYerel = position.xy;                       // CircleGeometry düzlem-yerel (metre)
      vec4 dp = modelMatrix * vec4(position, 1.0);
      vDunya = dp.xyz;
      gl_Position = projectionMatrix * viewMatrix * dp;
      #include <logdepthbuf_vertex>
    }`,
  fragmentShader: /* glsl */`
    uniform vec3 color;
    uniform sampler2D tDiffuse;
    uniform sampler2D tNormal;
    uniform sampler2D tRipple;
    uniform float uRipple;
    uniform float uTime;
    uniform float uDalga;
    uniform float uParlaklik;
    uniform float uKirpisma;
    varying vec4 vUv;
    varying vec3 vDunya;
    varying vec2 vYerel;
    #include <logdepthbuf_pars_fragment>
    void main() {
      #include <logdepthbuf_fragment>
      // iki zıt akışlı katman: kaba dalga (yavaş) + ince kırpışma (hızlı, çapraz)
      vec4 n1 = texture2D(tNormal, vYerel * 0.055 + vec2(uTime * 0.020,  uTime * 0.012));
      vec4 n2 = texture2D(tNormal, vYerel * 0.170 + vec2(-uTime * 0.031, uTime * 0.043));
      vec2 nk = (n1.xy * 2.0 - 1.0) + (n2.xy * 2.0 - 1.0) * 0.6;
      // v6 F6: çarpma halkaları — height-field sim'inden sonlu-fark normali.
      // Sim alanı ripple.js'ten GELİR (RIPPLE_ALAN metre kare, RIPPLE_IZGARA
      // teksel kenar); dünya xz → sim uv. Sabitler elle kopyalanmaz: ızgara
      // 128'den değişirse teksel adımı burada sessizce yanlış kalırdı.
      // v7 G5: tek 1-teksel sonlu fark + kazanç 9.0, 128² sim'de (0.156 m/teksel)
      // dalgayı SU değil kazınmış tel kafes gibi gösteriyordu (gerçek tarayıcı
      // bulgusu: "çizik gibi"). Düzeltme: iki ölçekli gradyan ortalaması =
      // alçak geçiren süzgeç (teksel merdiveni erir), kazanç buna göre kısıldı.
      if (uRipple > 0.0) {
        vec2 ruv = (vDunya.xz + ${(RIPPLE_ALAN / 2).toFixed(1)}) / ${RIPPLE_ALAN.toFixed(1)};
        float px = 1.0 / ${RIPPLE_IZGARA.toFixed(1)};
        vec2 g1 = vec2(
          texture2D(tRipple, ruv - vec2(px, 0.0)).r - texture2D(tRipple, ruv + vec2(px, 0.0)).r,
          texture2D(tRipple, ruv - vec2(0.0, px)).r - texture2D(tRipple, ruv + vec2(0.0, px)).r);
        vec2 g2 = vec2(
          texture2D(tRipple, ruv - vec2(px * 2.5, 0.0)).r - texture2D(tRipple, ruv + vec2(px * 2.5, 0.0)).r,
          texture2D(tRipple, ruv - vec2(0.0, px * 2.5)).r - texture2D(tRipple, ruv + vec2(0.0, px * 2.5)).r);
        nk += mix(g1, g2 * 0.4, 0.6) * uRipple;
      }
      // yansıma: perspektif bölme SONRASI dalga sapması (texture2DProj offset alamaz)
      vec3 yansima = texture2D(tDiffuse, vUv.xy / vUv.w + nk * uDalga).rgb;
      // Fresnel: tepeden derin renk, alçak/yatay bakışta ayna (fotoğraf kanıtı:
      // ışık gölü hissini yatay kameradaki güçlü yansıma verir)
      vec3 nrm = normalize(vec3(nk.x, 2.4, nk.y));
      vec3 bakis = normalize(cameraPosition - vDunya);
      float fres = pow(1.0 - max(dot(bakis, nrm), 0.0), 3.0);
      vec3 renk = color + yansima * uParlaklik * (0.30 + 0.70 * fres);
      // glint: iki katmanın yüksekliği çakışınca seyrek beyaz kırpışma → bloom besini.
      // Yansıma parlaklığıyla ağırlıklı: kırpışma ışığın vurduğu suda yoğunlaşır
      // (fotoğraf kanıtı), karanlık su ölü kalır (0.15 taban = ay kırpışması).
      float isik = dot(yansima, vec3(0.9));
      renk += vec3(1.0, 0.97, 0.88)
            * (smoothstep(0.58, 0.75, n1.a * n2.a) * uKirpisma * (0.15 + min(isik, 1.2)));
      gl_FragColor = vec4(renk, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`
};

// M1: fonlar prosedürel — piksel üreticileri fon-doku.js'te (saf, Node testli).
// Buradaki sarmalayıcı SAF pikseli THREE dokusuna çevirir. sRGB işareti ŞART
// (v4 dersi: işaretlenmezse OutputPass çifte parlatır, gece göğü yıkanır);
// DataTexture flipY=false → üreticiler alt-orijin yazar, ekstra çevirme YOK.
function veriDoku({ px, w, h }) {
  const t = new THREE.DataTexture(px, w, h);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}

// Fon adı → deterministik tohum (yıldız/pencere serpiştirmesi fonSec'te sabit).
function fonTohum(ad) {
  let t = 0; for (const ch of ad) t = t * 31 + ch.charCodeAt(0);
  return t >>> 0;
}

// Preset TABLOSU fon-preset.js'te (alan sözleşmesi de orada belgeli).

// v7 M6: agacPiksel gövde rengini SABİT yazar (rgb 5,16,12 — fon-doku.js). Basic
// malzemede son renk = doku × color, o yüzden istenen tonu elde etmek için
// çarpanı bu tabandan TÜRETİYORUZ (elle "gözüne göre" katsayı yazmak, doku
// tabanı değişirse sessizce yanlış kalırdı).
const AGAC_TABAN = [5 / 255, 16 / 255, 12 / 255];
function agacKazanci(hedefHex) {
  if (!hedefHex) return new THREE.Color(0xffffff);
  const h = new THREE.Color(hedefHex);
  return new THREE.Color(h.r / AGAC_TABAN[0], h.g / AGAC_TABAN[1], h.b / AGAC_TABAN[2]);
}

// İç mekân dokuları: fon her seçildiğinde yeniden üretilmesin diye MODÜL
// düzeyinde tembel önbellek (gereksinim: prosedürel üretim TEK SEFERLİK).
// Bu dokuları kullanan mesh'ler userData.ortakDoku=true taşır — katmanSil
// onları disposelamaz, yoksa ikinci `kapali` seçiminde ölü doku bağlanırdı.
const ODA_DOKU = new Map();
function odaDokusu(tur) {
  if (ODA_DOKU.has(tur)) return ODA_DOKU.get(tur);
  let t;
  if (tur === 'duvar') {
    t = veriDoku(duvarPiksel({ renk: '#8f96a2', tohum: 11 }));
    t.repeat.set(6, 1);
  } else if (tur === 'zemin') {
    t = veriDoku(tasPiksel({ renk: '#9a958a', tohum: 23 }));
    t.repeat.set(14, 14);
  } else {
    t = veriDoku(duvarPiksel({ renk: '#7d828c', tohum: 37 }));
    t.repeat.set(8, 8);
  }
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  ODA_DOKU.set(tur, t);
  return t;
}

export function mekanKur(scene) {
  // havuz: 10m disk su karanlığı + kenar halkası (rengi preset'ten güncellenir).
  // v7 M6: bu üç kalıcı mesh Standard malzemedeydi; sahnede yalnız zayıf
  // AmbientLight olduğu için renkleri ambiyansla ÇARPILIP siyaha düşüyordu —
  // `kuru` presetinde havuz diski GÖRÜNEN zemin olduğu halde kapkaraydı
  // (kanıt karesi E0_kuru.png). M5'te büyük zemin için öğrenilen ders burada da
  // uygulanır: ışıksız Basic + fog.
  const havuzTx = veriDoku(tasPiksel({ renk: '#8a8d94', tohum: 19 }));
  havuzTx.wrapS = havuzTx.wrapT = THREE.RepeatWrapping; havuzTx.repeat.set(6, 6);
  const havuz = new THREE.Mesh(new THREE.CircleGeometry(10, 64),
    new THREE.MeshBasicMaterial({ map: havuzTx, color: 0x0a1622 }));
  havuz.rotation.x = -Math.PI / 2; scene.add(havuz);
  const kenar = new THREE.Mesh(new THREE.TorusGeometry(10, 0.18, 8, 64),
    new THREE.MeshBasicMaterial({ color: 0x16283a }));
  kenar.rotation.x = Math.PI / 2; kenar.position.y = 0.05; scene.add(kenar);
  // M3: kaldırım halkası — havuz çevresi taş döşeme (kalıcı mesh, preset yalnız
  // tonlar: doku orta-gri, color çarpanı preset kenar/zemin renginden).
  const tasTx = veriDoku(tasPiksel({ renk: '#8a8d94', tohum: 31 }));
  tasTx.wrapS = tasTx.wrapT = THREE.RepeatWrapping; tasTx.repeat.set(10, 2);
  const kaldirim = new THREE.Mesh(new THREE.RingGeometry(10.2, 14, 64),
    new THREE.MeshBasicMaterial({ map: tasTx }));
  kaldirim.rotation.x = -Math.PI / 2; kaldirim.position.y = 0.02; scene.add(kaldirim);
  // v7 M5: MEYDAN ZEMİNİ — kaldırım 14 m'de bitiyor, şehir halkası 78 m'de
  // başlıyordu; arada kocaman SİYAH BOŞLUK vardı ve şehir havada duruyor gibi
  // görünüyordu (gerçek GPU karesi). Geniş zemin diski o boşluğu kapatır ve
  // sise girerek şehri yere oturtur. Aynı taş dokusu, çok seyrek tekrar
  // (yakın plandaki derzler uzakta desen tekrarı olarak okunmasın) + koyu ton.
  const zeminTx = veriDoku(tasPiksel({ renk: '#8a8d94', tohum: 47 }));
  zeminTx.wrapS = zeminTx.wrapT = THREE.RepeatWrapping; zeminTx.repeat.set(90, 90);
  // Işıksız (Basic) malzeme: sahnede yalnız zayıf AmbientLight var, Standard
  // malzemede renk ambiyansla ÇARPILIP siyaha düşüyordu (0x434b5c bile ~0x080c14
  // çıkıyordu). Basic + fog = istenen ton birebir, uzakta sise karışıyor.
  // v7 M6: disk TEK DÜZE bir levha gibi duruyordu. Yarıçapa bağlı parlaklık
  // sönümü (zeminSonum, saf ve testli) vertex rengine PİŞİRİLİR — kare başına
  // maliyet SIFIR, disk bir kez kurulur. Havuz çevresi aydınlık, ufka doğru
  // sisin içine söner = "yer" hissi.
  const ZEMIN_R = 230;
  const zeminGeo = new THREE.CircleGeometry(ZEMIN_R, 96);
  const zpoz = zeminGeo.attributes.position;
  const zrenk = new Float32Array(zpoz.count * 3);
  for (let i = 0; i < zpoz.count; i++) {
    const k = zeminSonum(Math.hypot(zpoz.getX(i), zpoz.getY(i)), ZEMIN_R);
    zrenk[i * 3] = zrenk[i * 3 + 1] = zrenk[i * 3 + 2] = k;
  }
  zeminGeo.setAttribute('color', new THREE.BufferAttribute(zrenk, 3));
  const meydanZemin = new THREE.Mesh(zeminGeo,
    new THREE.MeshBasicMaterial({ map: zeminTx, color: 0x1a1f2b, vertexColors: true }));
  meydanZemin.rotation.x = -Math.PI / 2; meydanZemin.position.y = -0.02;
  scene.add(meydanZemin);
  // canlı su yüzeyi (v4 F1): Reflector + SU_SHADER — karartı diski yok artık,
  // parlaklık/ton kontrolü shader uniformlarında (preset su.*)
  const yansima = new Reflector(new THREE.CircleGeometry(9.8, 64), {
    textureWidth: YANSIMA_PX, textureHeight: YANSIMA_PX,
    color: 0x061524, shader: SU_SHADER
  });
  yansima.material.uniforms.tNormal.value = suNormalDoku();
  yansima.rotation.x = -Math.PI / 2; yansima.position.y = 0.005; scene.add(yansima);

  const ambiyans = new THREE.AmbientLight(0x2b2926, 0.4); // renk/şiddet preset'ten; v7: soğuk mavi 0x223344 -> nötr-hafif sıcak (Salih), su kendi mavisini korur
  scene.add(ambiyans);

  // M4: gök kubbesi — scene.background YERİNE çift-doku shader küresi:
  // crossfade'de eski/yeni gök uMix ile karışır. sRGB dokular WebGL2'de
  // donanımda çözülür → shader linear çıktı verir, tonemapping/encode
  // OutputPass'te (v4 dersi ihlal edilmez). ShaderMaterial fog'suz (gök sise
  // girmez — eski scene.background davranışıyla aynı).
  const kubbeMat = new THREE.ShaderMaterial({
    uniforms: { tEski: { value: null }, tYeni: { value: null }, uMix: { value: 1 } },
    vertexShader: /* glsl */`varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`uniform sampler2D tEski, tYeni; uniform float uMix; varying vec2 vUv;
      void main() { gl_FragColor = vec4(mix(texture2D(tEski, vUv).rgb, texture2D(tYeni, vUv).rgb, uMix), 1.0); }`,
    side: THREE.BackSide, depthWrite: false
  });
  const kubbe = new THREE.Mesh(new THREE.SphereGeometry(70, 32, 16), kubbeMat);
  // Bant katman.js'ten okunur — elle yazılı -1, bantlar yeniden numaralanırsa
  // sessizce kayardı (G2 bug'ının doğduğu sınıf).
  kubbe.renderOrder = KATMAN.GOK; scene.add(kubbe);

  let katmanlar = [];      // etkin preset katmanları
  let eskiKatmanlar = [];  // geçiş sürerken sönen önceki katman grubu
  const gecis = gecisYarat(1.5);
  let hedefF = null;       // geçişin vardığı preset (tamamla görünürlük anahtarları)
  // sayısal lerp çiftleri: [uygula(oran) ...] — fonSec doldurur, tik koşar
  let lerpler = [];

  // Katman materyalleri geçişte solabilsin: hepsi transparent + taban opacity
  // userData'da (additive glow'ların 0.5/0.35 tabanı korunur).
  function katmanEkle(mesh) {
    mesh.material.transparent = true;
    mesh.userData.tabanOpacity = mesh.material.opacity;
    mesh.material.opacity = gecis.bitti() ? mesh.userData.tabanOpacity : 0;
    scene.add(mesh); katmanlar.push(mesh); return mesh;
  }

  function katmanSil(liste) {
    for (const m of liste) {
      scene.remove(m);
      // ⚠Sprite'ın geometrisi DISPOSE EDİLMEZ. Eski "Sprite'ta geometry yok"
      // yorumu bayattı: three r166'da TÜM sprite'lar Sprite.js'teki modül
      // düzeyinde tek bir BufferGeometry'yi paylaşır. Onu disposelamak sahnedeki
      // her sprite'ın buffer'ını düşürür — three yeniden yüklediği için kalıcı
      // hasar yok ama her fon geçişinde gereksiz GPU trafiği doğuyordu.
      if (!m.isSprite) m.geometry?.dispose();
      if (m.material.map && !m.userData.ortakDoku) m.material.map.dispose();
      m.material.dispose();
    }
  }

  // M2: ağaç silüeti — tohumlu gürültü-kenarlı doku düzlemi (tohum konumdan
  // türetilir: her ağaç farklı ama deterministik).
  // v7 M6: agacPiksel doku rengi SABİT (rgb 5,16,12) — park karesinde ağaçlar
  // siyah gök önünde siyahtı, siluet hiç okunmuyordu. Renk artık preset'ten
  // (agacRenk) çarpan olarak geliyor; doku aynı, ton fondan ayrışıyor.
  function agacEkle(x, z, s, renk) {
    const tx = veriDoku(agacPiksel({ tohum: (Math.round(x * 31 + z * 7) + 997) >>> 0 }));
    const m = new THREE.Mesh(new THREE.PlaneGeometry(3.4 * s, 3.4 * s),
      new THREE.MeshBasicMaterial({ map: tx, transparent: true, depthWrite: false,
        color: agacKazanci(renk) }));
    m.position.set(x, 1.7 * s, z);
    katmanEkle(m);
  }

  // v7 M6: uzak TEPE/KIYI silueti — göl kıyısında bina kutusu dizisi yanlıştı
  // (kanıt karesi E0_gol.png: ufukta dişli bir duvar). Yumuşak fraktal sırt
  // profili (tepePiksel, saf+testli) aynı silindir kabuğuna sarılır.
  function tepeHalka({ r, yTavan, taban, genlik, renk }, tohum) {
    const tx = veriDoku(tepePiksel({ w: 1024, h: 128, tohum, renk, taban, genlik }));
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r, yTavan, 96, 1, true),
      new THREE.MeshBasicMaterial({ map: tx, transparent: true, depthWrite: false,
        side: THREE.BackSide }));
    m.position.y = yTavan / 2;
    katmanEkle(m);
  }

  // v7 M6: İÇ MEKÂN KABUĞU — zemin + 4 duvar + tavan + tavan aydınlatması.
  // Öncesi (fon2_kapali.png): üç duvar paneli havada, zemin/tavan yok, üstelik
  // yıldızlı gece göğü görünüyordu. Dokular MODÜL DÜZEYİNDE önbellekli
  // (odaDokusu) — preset her seçildiğinde yeniden üretilmez, katmanSil de
  // ortakDoku işaretiyle atlar.
  function odaEkle(oda) {
    const { en, boy, yukseklik } = oda;
    const dTx = odaDokusu('duvar'), zTx = odaDokusu('zemin'), tTx = odaDokusu('tavan');
    const yuzey = (geo, tx, renk, poz, don) => {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tx, color: renk }));
      m.position.set(...poz); m.rotation.set(...don);
      m.userData.ortakDoku = true; katmanEkle(m);
    };
    // Zemin: büyük dış disk 230 m'de duruyor ama oda içinde AYRI ton istiyoruz.
    // ⚠y, su aynasının (Reflector, y=0.005) ALTINDA olmak ZORUNDA. Üstünde
    // kalınca aynanın kırpma düzlemine giriyor ve yansıma baştan sona zemin
    // karosuyla doluyordu — havuz İÇİ ıslak değil KURU okunuyordu (E1_kapali).
    // Dış disk -0.02'de, o yüzden aralık dar: -0.004.
    yuzey(new THREE.PlaneGeometry(en, boy), zTx, oda.zemin, [0, -0.004, 0], [-Math.PI / 2, 0, 0]);
    yuzey(new THREE.PlaneGeometry(en, boy), tTx, oda.tavan, [0, yukseklik, 0], [Math.PI / 2, 0, 0]);
    yuzey(new THREE.PlaneGeometry(en, yukseklik), dTx, oda.duvar, [0, yukseklik / 2, -boy / 2], [0, 0, 0]);
    yuzey(new THREE.PlaneGeometry(en, yukseklik), dTx, oda.duvar, [0, yukseklik / 2, boy / 2], [0, Math.PI, 0]);
    yuzey(new THREE.PlaneGeometry(boy, yukseklik), dTx, oda.duvar, [-en / 2, yukseklik / 2, 0], [0, Math.PI / 2, 0]);
    yuzey(new THREE.PlaneGeometry(boy, yukseklik), dTx, oda.duvar, [en / 2, yukseklik / 2, 0], [0, -Math.PI / 2, 0]);
    // tavan armatürleri: parlak panel + additive hale (bloom besini) — iç mekânı
    // aydınlatan ŞEY görünmezse oda yine "karanlık bir kutu" gibi okunuyor.
    for (const [x, z] of oda.tavanIsik ?? []) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.5),
        new THREE.MeshBasicMaterial({ color: 0xffe6bc }));
      p.rotation.x = Math.PI / 2; p.position.set(x, yukseklik - 0.06, z); katmanEkle(p);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: haleTx, color: 0xffcf95,
        blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.4 }));
      glow.position.set(x, yukseklik - 0.3, z); glow.scale.setScalar(5.5);
      glow.userData.ortakDoku = true; katmanEkle(glow);
    }
  }

  // M2: çatı hatlı siluet düzlemi — pencereler DOKUDA (mesh kalabalığı gitti).
  // v7 M5: dünya penceresi artık parametre — uzak katman GENİŞ (kamera dönünce
  // kenarda boşluk kalmasın), yakın katman dar. Eskisi bu çağrının varsayılanı.
  function siluetDuzlem(binalar, renkHex, pencereRenk, tohum, z, olcek = 1,
                        genislik = 44, yTavan = 12, dokuW = 512) {
    const tx = veriDoku(siluetPiksel({ w: dokuW, binalar, renk: renkHex,
      pencere: pencereRenk, tohum, xAralik: [-genislik / 2, genislik / 2], yTavan }));
    const m = new THREE.Mesh(new THREE.PlaneGeometry(genislik * olcek, yTavan * olcek),
      new THREE.MeshBasicMaterial({ map: tx, transparent: true, depthWrite: false }));
    m.position.set(0, yTavan * olcek / 2, z);
    katmanEkle(m);
  }

  // v7 M5: şehir HALKASI — düz levha yerine içten bakılan silindir. Levha,
  // kamera azıcık dönünce kenarda boşluk bırakıyordu (kare kanıtı: sahnenin
  // sol yarısı bomboş ufuk, sağ yarısı bina duvarı). Silindirde bina hattı
  // 360° sarar, nereye bakılırsa bakılsın ufuk dolu. Doku çevre boyunca
  // sarmalı: xAralik = tam çevre (2πR).
  function siluetHalka(binalar, renkHex, pencereRenk, tohum, R, yTavan, dokuW) {
    const cevre = 2 * Math.PI * R;
    const tx = veriDoku(siluetPiksel({ w: dokuW, h: 192, binalar, renk: renkHex,
      pencere: pencereRenk, tohum, xAralik: [-cevre / 2, cevre / 2], yTavan }));
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(R, R, yTavan, 96, 1, true),
      new THREE.MeshBasicMaterial({ map: tx, transparent: true, depthWrite: false,
        side: THREE.BackSide }));
    m.position.y = yTavan / 2;
    katmanEkle(m);
  }

  // Duvar aplikleri: panel başına iki geniş sıcak leke + M3 glow sprite eşliği.
  // v7 M6: aplikler artık siluet KUTULARINA değil GERÇEK duvarlara asılıyor —
  // preset `aplikYer` [x, y, z, dönüşY] verir (yan duvarlar döndürülmeli, yoksa
  // levha duvarın içinden kenarıyla görünüyor).
  function aplikEkle(yerler, renk) {
    for (const [x, y, z, ry = 0] of yerler) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.4),
        new THREE.MeshBasicMaterial({ color: renk }));
      m.position.set(x, y, z); m.rotation.y = ry;
      // duvardan 6 cm içeri: z-fighting olmasın
      m.translateZ(0.06); katmanEkle(m);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: haleTx, color: renk,
        blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.4 }));
      glow.position.copy(m.position); glow.scale.setScalar(2.6);
      glow.userData.ortakDoku = true; katmanEkle(glow);
    }
  }

  // M3: sokak lambası — direk + sıcak başlık + additive glow + zeminde leke.
  // Reflector sahneyi yansıttığından lamba suya bedava yansır.
  function lambaEkle(x, z) {
    const direk = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 3.4, 6),
      new THREE.MeshBasicMaterial({ color: 0x10151c }));
    direk.position.set(x, 1.7, z); katmanEkle(direk);
    const kafa = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xffd9a0 }));
    kafa.position.set(x, 3.4, z); katmanEkle(kafa);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: haleTx, color: 0xffc070,
      blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.5 }));
    glow.position.set(x, 3.4, z); glow.scale.setScalar(1.8);
    glow.userData.ortakDoku = true; katmanEkle(glow);
    const leke = new THREE.Mesh(new THREE.CircleGeometry(1.5, 24),
      new THREE.MeshBasicMaterial({ color: 0x2a2013, blending: THREE.AdditiveBlending,
        transparent: true, opacity: 0.8, depthWrite: false }));
    leke.rotation.x = -Math.PI / 2; leke.position.set(x, 0.035, z); katmanEkle(leke);
  }

  // Ortak radyal hale dokusu (ay + M3 lamba glow) — bir kez üretilir, katman
  // dispose döngüsü userData.ortakDoku işaretiyle bunu ATLAR.
  const haleTx = veriDoku(haleAlfa(64));

  // M4: geçişi kapat — sayısal kancalar hedefe, eski grup dispose, kubbe tek
  // doku, görünürlük anahtarları (kuru/su) UYGULANIR. Sözleşme: geçiş sürerken
  // yeni fonSec gelirse önce bu çağrılır (kuyruk yok).
  function tamamla() {
    for (const fn of lerpler) fn(1);
    lerpler = [];
    katmanSil(eskiKatmanlar); eskiKatmanlar = [];
    for (const m of katmanlar) m.material.opacity = m.userData.tabanOpacity;
    const u = kubbeMat.uniforms;
    if (u.tEski.value && u.tEski.value !== u.tYeni.value) u.tEski.value.dispose();
    u.tEski.value = u.tYeni.value;
    u.uMix.value = 1;
    if (hedefF) {
      yansima.visible = !hedefF.kuru;
      // v7 M6: iç mekânda gök kubbesi GİZLENİR — duvarların ardında yıldızlı
      // gece göğü görünmesi mantıksızdı (kanıt karesi fon2_kapali.png).
      kubbe.visible = !hedefF.icMekan;
    }
    gecis.baslat(0);                       // durum makinesini "bitti"ye zorla
  }

  // M4: fonSec YUMUŞAK geçişli (sure sn; 0=anında — açılış/headless kancası).
  function fonSec(ad, sure = 1.5) {
    const f = FONLAR[ad]; if (!f) return;
    if (!gecis.bitti()) tamamla();
    hedefF = f;
    // gök: mevcut tYeni tEski'ye kayar, yeni doku tYeni'ye — uMix 0'dan 1'e
    const u = kubbeMat.uniforms;
    // v7 M5: samanyolu/bulut açıksa doku yatayda değişir → w 64 yetmez (64'te
    // bant merdiven basamağı gibi görünüyordu).
    const zenginGok = !!(f.samanyolu || f.bulut);
    const yeniGok = veriDoku(gokPiksel({
      w: zenginGok ? 256 : 64, ust: f.gok[0], alt: f.gok[1], ufuk: f.ufuk ?? null,
      ufukGuc: f.ufukGuc ?? 0.30,
      samanyolu: f.samanyolu ?? null, bulut: f.bulut ?? null, tohum: fonTohum(ad) }));
    if (u.tEski.value && u.tEski.value !== u.tYeni.value) u.tEski.value.dispose();
    u.tEski.value = u.tYeni.value ?? yeniGok;
    u.tYeni.value = yeniGok;
    u.uMix.value = 0;
    // sayısal kancalar: mevcut değer → preset hedefi (tik oranla koşar)
    const renkKancasi = (renkObj, hedef) => {
      const a = renkObj.clone(), b = new THREE.Color(hedef);
      lerpler.push((o) => renkObj.copy(a).lerp(b, o));
    };
    const sayiKancasi = (baslangic, yaz, hedef) =>
      lerpler.push((o) => yaz(lerp(baslangic, hedef, o)));
    lerpler = [];
    // v7 M6: sis artık RENK + ERİM olarak preset'ten. ana.js 40-260 kuruyor;
    // o erim 230 m'lik açık meydan için doğru, 46 m'lik iç mekânda YANLIŞ (sis
    // hiç başlamadan duvar bitiyor → oda düz karton). Erim de lerp'lenir ki
    // crossfade sırasında mekân kabuğu sıçramasın.
    if (scene.fog) {
      renkKancasi(scene.fog.color, sisRengi(f));
      const [yakin, uzak] = sisAralik(f);
      sayiKancasi(scene.fog.near, (v) => { scene.fog.near = v; }, yakin);
      sayiKancasi(scene.fog.far, (v) => { scene.fog.far = v; }, uzak);
    }
    // v7 M6: kenar halkası Basic'e geçince tam parlaklıkta çiziliyor ve havuzun
    // çevresinde IŞIKLI BİR HORTUM gibi duruyordu (E1 karesi). Taş harpuşta
    // kaldırımdan koyu olmalı — aynı preset tonunun kısılmışı.
    renkKancasi(kenar.material.color, new THREE.Color(f.kenarRenk).multiplyScalar(0.45));
    renkKancasi(havuz.material.color, f.havuzTon ?? f.zeminRenk ?? 0x0a1622);
    renkKancasi(kaldirim.material.color, f.zeminRenk ?? f.kenarRenk);
    renkKancasi(meydanZemin.material.color, f.zeminTon ?? 0x1a1f2b);
    renkKancasi(ambiyans.color, f.ambiyans[0]);
    sayiKancasi(ambiyans.intensity, (v) => { ambiyans.intensity = v; }, f.ambiyans[1]);
    if (f.su) {                                     // v4: su karakteri preset'ten
      const su = yansima.material.uniforms;
      renkKancasi(su.color.value, f.su.derin);
      sayiKancasi(su.uParlaklik.value, (v) => { su.uParlaklik.value = v; }, f.su.parlaklik);
      sayiKancasi(su.uDalga.value, (v) => { su.uDalga.value = v; }, f.su.dalga);
      sayiKancasi(su.uKirpisma.value, (v) => { su.uKirpisma.value = v; }, f.su.kirpisma);
    }
    // kuru'ya girerken su SONDA kapanır (tamamla); kuru'dan çıkarken hemen açılır
    if (!f.kuru) yansima.visible = true;
    // dış mekâna dönerken gök HEMEN açılır (iç mekândan çıkışta duvarlar solarken
    // arkada boşluk kalmasın); iç mekâna girerken tamamla() kapatır.
    if (!f.icMekan) kubbe.visible = true;
    eskiKatmanlar = katmanlar; katmanlar = [];
    gecis.baslat(sure);
    const tohum = fonTohum(ad);
    // v7 M6: iç mekân kabuğu ÖNCE kurulur (diğer katmanlar odanın içine düşsün)
    if (f.oda) odaEkle(f.oda);
    // v7 M6: uzak tepe/kıyı hattı (gol) — şehir halkasının yumuşak karşılığı
    for (let i = 0; i < (f.tepe?.length ?? 0); i++) tepeHalka(f.tepe[i], tohum + i * 53);
    // M2: iki derinlik katmanlı siluet — arka katman sise yakın renkte %60
    // ölçekle (atmosferik derinlik), ön katman preset binaları + pencereler.
    // v7 M5: `sehir` verilirse siluet PROSEDÜREL ve ÇOK KATMANLI üretilir
    // (Salih: "arka plan çok boş"). Her katman kendi z'sinde, uzaklaştıkça gök
    // rengine karışır = atmosferik perspektif; pencereler yalnız yakın katmanda
    // (uzak binada tek tek pencere görünmesi sahte durur, sisin içinde erir).
    if (f.sehir) {
      const kat = f.sehir.katmanlar;
      for (let i = kat.length - 1; i >= 0; i--) {           // uzaktan yakına çiz
        const k = kat[i];
        const uzaklik = i / Math.max(1, kat.length - 1);    // 0=yakın, 1=uzak
        const renk = '#' + new THREE.Color(f.siluetRenk)
          .clone().lerp(new THREE.Color(f.gok[1]), 0.25 + uzaklik * 0.5).getHexString();
        const R = k.r;
        const cevre = 2 * Math.PI * R;
        const binalar = sehirUret({ adet: k.adet, xAralik: [-cevre / 2, cevre / 2],
          yAralik: k.yAralik, z: 0, tohum: tohum + i * 17, kuleOran: k.kuleOran ?? 0.12 });
        siluetHalka(binalar, renk, i === 0 ? (f.pencere ?? null) : null,
          tohum + i * 31, R, k.yTavan ?? 26, k.dokuW ?? 2048);
      }
    } else if (f.siluet.length) {
      const onRenk = '#' + new THREE.Color(f.siluetRenk).getHexString();
      const arkaRenk = '#' + new THREE.Color(f.siluetRenk)
        .lerp(new THREE.Color(f.gok[1]), 0.5).getHexString();
      siluetDuzlem(f.siluet, arkaRenk, null, tohum + 1, -26, 0.6);
      siluetDuzlem(f.siluet, onRenk, f.pencere ?? null, tohum, -16, 1);
    }
    // M1: yıldızlar ayrı Points katmanı (equirect dokuda leke oluyordu —
    // sizeAttenuation:false ile ekranda gerçek nokta; parlaklık vertex rengi)
    // v7 M6: iç mekânda yıldız YOK (icMekan preset'te yildiz de tanımlı değil,
    // ama kapı burada açıkça duruyor: tavanın üstünde yıldız görünmesin).
    if (f.yildiz && !f.icMekan) {
      // v7 M5: yıldız RENGİ (sıcak↔mavi) parlaklıkla çarpılır — tek tip beyaz
      // nokta tarlası cansızdı. `kume` samanyolu bandıyla AYNI eğriyi alır ki
      // yıldız yığını ışıklı bandın üstüne otursun.
      const { poz, parlak, renk } = yildizNoktalari({ adet: f.yildiz, tohum,
        kume: f.samanyolu ? { oran: 0.5, genislik: f.samanyolu.genislik ?? 0.16,
          egim: f.samanyolu.egim ?? 0.26, faz: f.samanyolu.faz ?? 0.15 } : null });
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(poz, 3));
      const renkler = new Float32Array(f.yildiz * 3);
      for (let i = 0; i < f.yildiz; i++) for (let k = 0; k < 3; k++)
        renkler[i * 3 + k] = parlak[i] * renk[i * 3 + k];
      g.setAttribute('color', new THREE.BufferAttribute(renkler, 3));
      const m = new THREE.Points(g, new THREE.PointsMaterial({
        size: 2, sizeAttenuation: false, vertexColors: true,
        transparent: true, opacity: 0.9, depthWrite: false, fog: false }));
      katmanEkle(m);
    }
    if (f.aplikYer) aplikEkle(f.aplikYer, f.aplikRenk);
    for (const [x, z, s] of f.agac) agacEkle(x, z, s, f.agacRenk);
    for (const [x, z] of f.lamba ?? []) lambaEkle(x, z);
    if (f.ay) {
      const m = new THREE.Mesh(new THREE.CircleGeometry(f.ay.yaricap, 24),
        new THREE.MeshBasicMaterial({ color: f.ay.renk, fog: false })); // sisten muaf: ay solmasın
      m.position.set(...f.ay.poz); katmanEkle(m);
      // M1: ay halesi — additive yumuşak glow, bloom'a doğal besin
      const hale = new THREE.Sprite(new THREE.SpriteMaterial({
        map: haleTx, color: f.ay.renk, blending: THREE.AdditiveBlending,
        depthWrite: false, opacity: 0.35, fog: false }));
      hale.position.set(...f.ay.poz); hale.scale.setScalar(f.ay.yaricap * 5);
      hale.userData.ortakDoku = true;
      katmanEkle(hale);
    }
    if (gecis.bitti()) tamamla();          // sure=0: anında hedef durum
  }
  fonSec(VARSAYILAN_FON, 0);
  // v4: su saati — şov saatinden BİLEREK bağımsız (su doğa: duraklatmada da
  // kıpırdar; #demo&sim ön-adımlaması 1/60 sabit dt verdiğinden deterministik).
  // M4: fon geçişi de burada akar (duraklatmada bile tamamlanır — su gibi doğa).
  let suT = 0;
  function tik(dt) {
    suT += dt; yansima.material.uniforms.uTime.value = suT;
    if (!gecis.bitti()) {
      gecis.tik(dt);
      if (gecis.bitti()) { tamamla(); return; }
      const o = gecis.oran();
      kubbeMat.uniforms.uMix.value = o;
      for (const fn of lerpler) fn(o);
      for (const m of eskiKatmanlar) m.material.opacity = m.userData.tabanOpacity * (1 - o);
      for (const m of katmanlar) m.material.opacity = m.userData.tabanOpacity * o;
    }
  }
  // v6 F6: ripple sim dokusunu bağla (ana.js her kare çağırır — ping-pong
  // hedefi değişir, referans tazelenmeli). Kazanç ekran kıyasıyla ayarlandı.
  function setRipple(tex) {
    yansima.material.uniforms.tRipple.value = tex;
    yansima.material.uniforms.uRipple.value = tex ? 5.0 : 0.0;   // v7 G5: 9.0 cizik yapiyordu
  }
  return { fonSec, tik, setRipple, fonAdlari: Object.keys(FONLAR), aktifFon: VARSAYILAN_FON };
}
