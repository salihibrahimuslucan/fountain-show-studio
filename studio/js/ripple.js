// ripple.js — v6 F6: GPGPU height-field su dalgası (three resmi webgl_gpgpu_water
// DESENİ, MIT; desen düzeyi — kod kopyalanmadı). Havuz 20×20m alanı 128² ızgara:
// R=yükseklik, G=dikey hız; klasik dalga denklemi (komşu ortalaması çeker) +
// sönüm. Cihaz çarpma noktaları her karede küçük tümsek yazar → jetin altında
// GERÇEK halka dalgalar doğar, dışa yayılır, söner. Çıktı dokusu mekan.js su
// shader'ının normal distorsiyonuna eklenir (sonlu fark orada).
// Bilinen sınır: kaynak = nozul konumu (dik jetlerde doğru); robo/swing YAYININ
// gerçek çarpma noktası balistikten hesaplanmıyor (backlog). MAX 16 kaynak —
// fazlası sessizce düşer (kalabalık şablonda ilk 16 cihaz).
import * as THREE from 'three';
import { GPUComputationRenderer } from 'three/addons/misc/GPUComputationRenderer.js';

const SIM = 128;
export const RIPPLE_ALAN = 20;     // metre (havuz 10m yarıçap diskini örter)
export const RIPPLE_IZGARA = SIM;  // sim ızgara kenarı — TÜKETİCİ shader'lar bunu okur
const MAX_KAYNAK = 16;
// Sağlık taraması periyodu (kare). Tek teksel GPU okuması ucuz ama BEDAVA değil
// (readPixels boru hattını durdurur), bu yüzden kare başına değil ~2 saniyede bir.
const SAGLIK_PERIYOT = 120;

// GPUComputationRenderer program sızıntısı — ortak çözüm.
//
// SORUN: sınıf her örnekte bir `passThruShader` (ShaderMaterial) + bir
// FullScreenQuad kurar; ikisi de constructor closure'ında GİZLİ, `this` üstünde
// yok. Elle döküm (renderTargets + initialValueTexture + variable.material)
// bunu ATLAR → her cihaz siliminde bir derlenmiş WebGL programı sızar.
//
// ⚠NAİF `gpu.dispose()` YANLIŞTIR: içinde `quad.dispose()` var, o da
// `FullScreenQuad.dispose()` → `this._mesh.geometry.dispose()`. O geometri
// three'nin Pass.js'inde MODÜL-DÜZEYİ tek bir `_geometry` — aynı örneği
// EffectComposer'ın TÜM pass'leri paylaşır. Disposelayınca canlı post-process
// zinciri kırılır (sahne bozulur). Yani yalnız shader'ı hedeflemeliyiz.
//
// ÇÖZÜM: `init()` zaten her değişken için `renderTexture()` koşturur; o çağrı
// `doRenderTarget(passThruShader, …)` ile quad'ın malzemesini passThruShader
// YAPAR ve `quad.render(renderer)` → `renderer.render(mesh, kamera)` der. Yani
// init sırasında renderer.render'ı bir kereliğine dinlersek malzemeyi ELE
// GEÇİRİRİZ. Ekstra GPU işi yok — zaten koşan çağrıyı dinliyoruz.
export function gpuBaslat(gpu, renderer) {
  let passThru = null;
  const asilRender = renderer.render;
  renderer.render = function (nesne, kamera) {
    // İlk render tam-ekran quad'dır ve malzemesi passThruShader'dır; kimliği
    // isimle değil KAYNAK METNİYLE doğrula (compute malzemeleri de aynı adı taşır).
    if (!passThru && nesne && nesne.isMesh
        && nesne.material && typeof nesne.material.fragmentShader === 'string'
        && nesne.material.fragmentShader.includes('passThruTexture')) {
      passThru = nesne.material;
    }
    return asilRender.call(this, nesne, kamera);
  };
  let hata;
  try { hata = gpu.init(); } finally { renderer.render = asilRender; }
  return { hata, passThru };
}

// gpuBaslat ile eşleşen döküm: değişken kaynakları + YAKALANAN passThru shader.
// FullScreenQuad'a DOKUNULMAZ (paylaşımlı _geometry — yukarıdaki nota bak).
export function gpuDok(degiskenler, passThru) {
  for (const v of degiskenler) {
    for (const rt of v.renderTargets) rt.dispose();
    if (v.initialValueTexture) v.initialValueTexture.dispose();
    v.material.dispose();
  }
  if (passThru) passThru.dispose();
}

const simShader = /* glsl */`
  uniform vec4 uKaynak[${MAX_KAYNAK}];   // xy=sim UV, z=güç, w=yarıçap (uv)
  uniform int  uKaynakSayi;
  void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec2 px = 1.0 / resolution.xy;
    vec4 K = texture2D(yukseklik, uv);
    float ort = ( texture2D(yukseklik, uv + vec2(px.x, 0.0)).r
                + texture2D(yukseklik, uv - vec2(px.x, 0.0)).r
                + texture2D(yukseklik, uv + vec2(0.0, px.y)).r
                + texture2D(yukseklik, uv - vec2(0.0, px.y)).r ) * 0.25;
    // dalga: hız komşu ortalamasına çekilir, sönümlenir (0.977 = ~1.5s'de yiter)
    float hiz = (K.g + (ort - K.r) * 0.55) * 0.977;
    float h = (K.r + hiz) * 0.998;
    for (int i = 0; i < ${MAX_KAYNAK}; i++) {
      if (i >= uKaynakSayi) break;
      float d = length(uv - uKaynak[i].xy);
      h += uKaynak[i].z * exp(-d * d / (uKaynak[i].w * uKaynak[i].w));
    }
    gl_FragColor = vec4(h, hiz, 0.0, 1.0);
  }
`;

export class RippleSim {
  constructor(renderer) {
    this.gpu = new GPUComputationRenderer(SIM, SIM, renderer);
    this.gpu.setDataType(THREE.FloatType);
    const t0 = this.gpu.createTexture();          // sıfır alan (durgun su)
    this.deg = this.gpu.addVariable('yukseklik', simShader, t0);
    this.gpu.setVariableDependencies(this.deg, [this.deg]);
    Object.assign(this.deg.material.uniforms, {
      uKaynak: { value: Array.from({ length: MAX_KAYNAK }, () => new THREE.Vector4()) },
      uKaynakSayi: { value: 0 }
    });
    const { hata, passThru } = gpuBaslat(this.gpu, renderer);
    if (hata) throw new Error('RippleSim: ' + hata);
    this.passThru = passThru;
    this.renderer = renderer;
    this.kare = 0;
    this.saglikAcik = true;     // readPixels bir kez patlarsa kalıcı kapanır
    this.pikselTampon = new Float32Array(4);
  }
  // kaynaklar: [{x, z, guc}] dünya metre; guc ~0..1 (master) — tümsek yüksekliği
  adim(kaynaklar) {
    const u = this.deg.material.uniforms;
    // ⚠NaN KARANTİNASI. Alan FloatType ping-pong'dur ve KENDİNİ BESLER: shader
    // komşu ortalamasını okur, sonuç bir sonraki karenin girdisidir. Tek bir
    // teksele NaN yazılırsa her karede komşularına bulaşır, birkaç yüz karede
    // 128²'nin tamamını yer ve GERİ DÖNÜŞÜ YOKTUR — sönüm (×0.977) NaN'ı
    // söndürmez, NaN*herhangi = NaN. Eski `pay < 0.01` süzgeci NaN'ı GEÇİRİRDİ
    // (NaN ile her karşılaştırma false). O yüzden burada koşul pozitif kurulur:
    // sonlu OLDUĞU doğrulanmayan hiçbir sayı uniform'a giremez.
    let n = 0;
    for (let i = 0; i < kaynaklar.length && n < MAX_KAYNAK; i++) {
      const k = kaynaklar[i];
      if (!k) continue;
      if (!Number.isFinite(k.x) || !Number.isFinite(k.z) || !Number.isFinite(k.guc)) continue;
      u.uKaynak.value[n++].set(
        (k.x + RIPPLE_ALAN / 2) / RIPPLE_ALAN,
        (k.z + RIPPLE_ALAN / 2) / RIPPLE_ALAN,
        k.guc * 0.011,
        1.5 / SIM * (1.0 + 1.2 * k.guc));         // güçlü çarpma geniş tümsek
    }
    u.uKaynakSayi.value = n;
    this.gpu.compute();
    // İkinci savunma hattı: girdiler temiz olsa bile sürücü/donanım kaynaklı
    // taşma alanı bozabilir. Kendi kendini besleyen bir sistemde ONARIM YOLU
    // OLMADAN bırakmak kabul edilemez — periyodik tara, bulursan sıfırla.
    if (++this.kare % SAGLIK_PERIYOT === 0 && !this.saglikli()) this.sifirla();
  }
  // Alanı durgun suya döndürür (tek kurtarma yolu). Ping-pong'un HER İKİ hedefi
  // de yazılmalı: yalnız birini sıfırlamak NaN'ı bir kare sonra geri getirir.
  sifirla() {
    for (const rt of this.deg.renderTargets) {
      this.gpu.renderTexture(this.deg.initialValueTexture, rt);
    }
  }
  // NaN 128² alana YAYILDIĞI için hasar asla yerel kalmaz → merkezden tek
  // teksel örneklemek yeterli, tam alan okumaya gerek yok.
  saglikli() {
    if (!this.saglikAcik) return true;
    try {
      const rt = this.gpu.getCurrentRenderTarget(this.deg);
      this.renderer.readRenderTargetPixels(rt, SIM >> 1, SIM >> 1, 1, 1, this.pikselTampon);
    } catch (e) {
      // Bazı sürücüler float hedeften readPixels desteklemez; taramayı kalıcı
      // kapat (kontrol yoksunluğu, sahneyi kilitlemekten iyidir).
      this.saglikAcik = false;
      return true;
    }
    return Number.isFinite(this.pikselTampon[0]) && Number.isFinite(this.pikselTampon[1]);
  }
  doku() { return this.gpu.getCurrentRenderTarget(this.deg).texture; }
  sil() { gpuDok([this.deg], this.passThru); }
}
