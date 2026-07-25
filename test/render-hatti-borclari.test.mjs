// 2026-07-18 denetiminin "AÇIK" bölümünde KASITLI ertelenen render-hattı
// borçları. Dört kalem: (1) GPUComputationRenderer program sızıntısı,
// (2) mekan.js'in paylaşımlı Sprite geometrisini disposelaması, (3) ripple
// height-field'da NaN karantinasının olmayışı, (4) mekan.js'in katman.js'i ve
// ripple sabitlerini import etmeyip elle kopyalaması.
//
// ripple.js three'ye bağlı olduğu için Node'da doğrudan import EDİLEMEZ; kaynağı
// okuyup import satırlarını sahte modüllerle değiştirip data: URL'den yüklüyoruz.
// Böylece testler GERÇEK fonksiyonları koşturur, kopyasını değil.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const oku = (p) => fs.readFileSync(path.join(KOK, p), 'utf8');
// "su desen kodda YOK" iddialarini kurarken yorumlari at: aciklama satirlari
// yasak deseni ADIYLA anmak zorunda (neden yasak oldugunu yaziyorlar).
const koduAyikla = (s) => s.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

// --- ripple.js'i sahte three ile yükle ---------------------------------------
const SAHTE_THREE = `const THREE = {
  FloatType: 'float',
  Vector4: class { constructor(){ this.x=0;this.y=0;this.z=0;this.w=0; }
    set(x,y,z,w){ this.x=x;this.y=y;this.z=z;this.w=w; return this; } }
};`;
const rippleKaynak = oku('studio/js/ripple.js')
  .replace(/^import \* as THREE from 'three';$/m, SAHTE_THREE)
  .replace(/^import \{ GPUComputationRenderer \}.*$/m,
    'const GPUComputationRenderer = globalThis.__SahteGCR;');

// --- vendor GPUComputationRenderer'ın sadık taklidi ---------------------------
// Kritik nokta: gerçekteki gibi passThruShader ve quad CLOSURE'DA gizli, `this`
// üstünde YOK; init() her hedef için renderTexture koşturur ve o çağrı quad'ın
// malzemesini passThruShader yapıp renderer.render(mesh, kamera) der.
function sahteGCRYap(izle) {
  return class SahteGCR {
    constructor(sx, sy, renderer) {
      this.variables = [];
      this.currentTextureIndex = 0;
      const passThruShader = {
        name: 'GPUComputationShader',
        fragmentShader: 'uniform sampler2D passThruTexture;\nvoid main(){}',
        dispose: () => { izle.passThruDispose++; }
      };
      // three'nin Pass.js'indeki MODÜL-DÜZEYİ PAYLAŞIMLI geometri
      const quad = {
        _mesh: { isMesh: true, material: passThruShader },
        dispose: () => { izle.quadDispose++; izle.ortakGeometriDispose++; }
      };
      this.setDataType = () => this;
      this.createTexture = () => ({ dispose: () => { izle.dokuDispose++; } });
      this.addVariable = (ad, shader, t0) => {
        const v = { name: ad, initialValueTexture: t0, renderTargets: [],
          material: { uniforms: {}, fragmentShader: shader,
            dispose: () => { izle.materialDispose++; } } };
        this.variables.push(v);
        return v;
      };
      this.setVariableDependencies = () => {};
      this.renderTexture = (girdi, hedef) => {
        izle.renderTexture.push(hedef);
        quad._mesh.material = passThruShader;
        renderer.render(quad._mesh, {});
      };
      this.init = () => {
        if (izle.initHata) return izle.initHata;
        if (izle.initFirlat) throw new Error('init patladi');
        for (const v of this.variables) {
          v.renderTargets[0] = { ad: v.name + '0', dispose: () => { izle.rtDispose++; } };
          v.renderTargets[1] = { ad: v.name + '1', dispose: () => { izle.rtDispose++; } };
          this.renderTexture(v.initialValueTexture, v.renderTargets[0]);
          this.renderTexture(v.initialValueTexture, v.renderTargets[1]);
        }
        return null;
      };
      this.compute = () => { izle.compute++; };
      this.getCurrentRenderTarget = (v) => v.renderTargets[this.currentTextureIndex];
      this.dispose = () => { quad.dispose(); };   // NAİF yol — kullanılmamalı
    }
  };
}

function izleyiciYap() {
  return { passThruDispose: 0, quadDispose: 0, ortakGeometriDispose: 0, dokuDispose: 0,
    materialDispose: 0, rtDispose: 0, compute: 0, renderTexture: [],
    initHata: null, initFirlat: false };
}

function rendererYap(piksel = [0, 0, 0, 1]) {
  return {
    render() {},
    okumaSayisi: 0,
    okumaFirlat: false,
    piksel,
    readRenderTargetPixels(rt, x, y, w, h, tampon) {
      this.okumaSayisi++;
      if (this.okumaFirlat) throw new Error('float readback yok');
      tampon.set(this.piksel);
    }
  };
}

async function rippleYukle(izle) {
  globalThis.__SahteGCR = sahteGCRYap(izle);
  // her yüklemede taze modül örneği (sahte sınıf izleyiciye bağlı)
  return import('data:text/javascript;base64,' +
    Buffer.from(rippleKaynak + `\n//${Math.random()}`, 'utf8').toString('base64'));
}

// =============================================================================
// 1) GPUComputationRenderer program sızıntısı
// =============================================================================

test('gpuBaslat gizli passThruShader materyalini YAKALAR', async () => {
  const izle = izleyiciYap();
  const M = await rippleYukle(izle);
  const renderer = rendererYap();
  const gpu = new globalThis.__SahteGCR(8, 8, renderer);
  gpu.addVariable('a', 'void main(){}', gpu.createTexture());
  const { hata, passThru } = M.gpuBaslat(gpu, renderer);
  assert.equal(hata, null);
  assert.ok(passThru, 'passThru yakalanmali');
  assert.ok(passThru.fragmentShader.includes('passThruTexture'));
});

test('gpuBaslat renderer.render kancasini GERI TAKAR (init patlasa bile)', async () => {
  const izle = izleyiciYap();
  const M = await rippleYukle(izle);
  const renderer = rendererYap();
  const asil = renderer.render;

  const gpu = new globalThis.__SahteGCR(8, 8, renderer);
  gpu.addVariable('a', 'void main(){}', gpu.createTexture());
  M.gpuBaslat(gpu, renderer);
  assert.equal(renderer.render, asil, 'basarili initten sonra geri takilmali');

  izle.initFirlat = true;
  const gpu2 = new globalThis.__SahteGCR(8, 8, renderer);
  gpu2.addVariable('a', 'void main(){}', gpu2.createTexture());
  assert.throws(() => M.gpuBaslat(gpu2, renderer));
  assert.equal(renderer.render, asil, 'init firlatsa da geri takilmali');
});

test('gpuBaslat init hatasini yutmadan dondurur', async () => {
  const izle = izleyiciYap();
  izle.initHata = 'No support for vertex shader textures.';
  const M = await rippleYukle(izle);
  const renderer = rendererYap();
  const gpu = new globalThis.__SahteGCR(8, 8, renderer);
  const { hata, passThru } = M.gpuBaslat(gpu, renderer);
  assert.equal(hata, izle.initHata);
  assert.equal(passThru, null);
});

test('gpuDok programi doker ama PAYLASIMLI quad geometrisine DOKUNMAZ', async () => {
  const izle = izleyiciYap();
  const M = await rippleYukle(izle);
  const renderer = rendererYap();
  const gpu = new globalThis.__SahteGCR(8, 8, renderer);
  const v = gpu.addVariable('a', 'void main(){}', gpu.createTexture());
  const { passThru } = M.gpuBaslat(gpu, renderer);

  M.gpuDok([v], passThru);
  assert.equal(izle.rtDispose, 2, 'iki ping-pong hedefi');
  assert.equal(izle.dokuDispose, 1, 'seed DataTexture');
  assert.equal(izle.materialDispose, 1, 'compute programi');
  assert.equal(izle.passThruDispose, 1, 'SIZAN passThru programi — asil borc');
  // ⚠naif gpu.dispose() burayi 1 yapardi ve EffectComposer pass'lerini kirardi
  assert.equal(izle.quadDispose, 0);
  assert.equal(izle.ortakGeometriDispose, 0);
});

test('naif gpu.dispose() gercekten paylasimli geometriyi oldururdu (regresyon capasi)', async () => {
  const izle = izleyiciYap();
  await rippleYukle(izle);
  const gpu = new globalThis.__SahteGCR(8, 8, rendererYap());
  gpu.dispose();
  assert.equal(izle.ortakGeometriDispose, 1, 'taklit dogru: naif yol tehlikeli');
});

test('vendor kaynagi: quad.dispose paylasimli _geometry disposeler', () => {
  const gcr = oku('studio/vendor/three/jsm/misc/GPUComputationRenderer.js');
  assert.match(gcr, /this\.dispose = function[\s\S]{0,80}quad\.dispose\(\)/,
    'gpu.dispose hala quad.dispose cagiriyor — naif yol yasak kalmali');
  assert.match(gcr, /const passThruShader = createShaderMaterial\(/);
  const pass = oku('studio/vendor/three/jsm/postprocessing/Pass.js');
  assert.match(pass, /^const _geometry = new FullscreenTriangleGeometry\(\);$/m,
    'MODUL-DUZEYI paylasimli geometri — dokunulmazligin sebebi');
  assert.match(pass, /dispose\(\)\s*\{[\s\S]{0,120}geometry\.dispose\(\)/);
});

test('motor.js ve ripple.js ortak dokum yolunu kullanir, naif dispose YOK', () => {
  for (const dosya of ['studio/js/motor.js', 'studio/js/ripple.js']) {
    const s = koduAyikla(oku(dosya));
    assert.ok(!/\bgpu\.dispose\(\)/.test(s), `${dosya}: naif gpu.dispose() yasak`);
    assert.ok(!/FullScreenQuad/.test(s), `${dosya}: quad'a dokunulmaz`);
  }
  const motor = koduAyikla(oku('studio/js/motor.js'));
  assert.match(motor, /import \{ gpuBaslat, gpuDok \} from '\.\/ripple\.js'/);
  assert.match(motor, /gpuBaslat\(this\.gpu, renderer\)/);
  assert.match(motor, /gpuDok\(\[this\.posVar, this\.velVar\], this\.passThru\)/);
  // elle dokum kalintisi kalmamali (cift dispose kaynagi)
  assert.ok(!/initialValueTexture\.dispose\(\)/.test(motor));
});

// =============================================================================
// 2) mekan.js — paylasimli Sprite geometrisi
// =============================================================================

test('katmanSil Sprite geometrisini DISPOSELEMEZ, bayat yorum gitti', () => {
  const s = oku('studio/js/mekan.js');
  assert.match(s, /if \(!m\.isSprite\) m\.geometry\?\.dispose\(\);/);
  // bayat yorum ("Sprite'ta geometry yok") artik BIR IDDIA olarak degil, neden
  // yanlis oldugunu anlatan aciklamanin icinde geciyor
  assert.ok(!/dispose\(\);\s*\/\/ Sprite'ta geometry yok/.test(s), 'bayat iddia kalmamali');
  assert.match(s, /tek bir BufferGeometry'yi paylaşır/);
  // gecmis: korumasiz dispose satiri
  assert.ok(!/^\s*m\.geometry\?\.dispose\(\);/m.test(koduAyikla(s)));
});

// =============================================================================
// 3) ripple NaN karantinasi
// =============================================================================

async function simYap(izle, renderer) {
  const M = await rippleYukle(izle);
  return { M, sim: new M.RippleSim(renderer) };
}

test('adim: NaN/Infinity kaynaklar uniforma HIC girmez', async () => {
  const izle = izleyiciYap();
  const renderer = rendererYap();
  const { sim } = await simYap(izle, renderer);
  sim.adim([
    { x: 1, z: 2, guc: 0.5 },
    { x: NaN, z: 0, guc: 0.5 },
    { x: 0, z: NaN, guc: 0.5 },
    { x: 0, z: 0, guc: NaN },
    { x: Infinity, z: 0, guc: 0.5 },
    { x: 0, z: 0, guc: -Infinity },
    null,
    { x: -3, z: 4, guc: 0.25 }
  ]);
  const u = sim.deg.material.uniforms;
  assert.equal(u.uKaynakSayi.value, 2, 'yalnizca iki saglam kaynak');
  // saglamlar SIKISTIRILMIS olmali (bosluk birakmadan 0 ve 1'e yazilir)
  assert.equal(u.uKaynak.value[0].x, (1 + 10) / 20);
  assert.equal(u.uKaynak.value[1].x, (-3 + 10) / 20);
  for (let i = 0; i < 2; i++) {
    for (const k of ['x', 'y', 'z', 'w']) {
      assert.ok(Number.isFinite(u.uKaynak.value[i][k]), `slot${i}.${k} sonlu olmali`);
    }
  }
});

test('adim: eski `pay < 0.01` mantigi NaN gecirirdi (borcun kanit testi)', () => {
  // NaN ile HER karsilastirma false -> `if (NaN < 0.01) continue` atlamaz.
  assert.equal(NaN < 0.01, false);
  // pozitif kurulan esik NaN'i eler:
  assert.equal(!(NaN >= 0.01), true);
  const motor = oku('studio/js/motor.js');
  assert.match(motor, /if \(!\(pay >= 0\.01\)\) continue;/);
  assert.ok(!/if \(pay < 0\.01\)/.test(motor), 'eski sizdiran esik kalmamali');
  assert.match(motor, /Number\.isFinite\(n\.x\) \|\| !Number\.isFinite\(n\.z\)/);
});

test('adim: MAX_KAYNAK asilirsa saglamlarla doldurulur (NaN slot calmaz)', async () => {
  const izle = izleyiciYap();
  const { sim } = await simYap(izle, rendererYap());
  const liste = [];
  for (let i = 0; i < 30; i++) liste.push({ x: NaN, z: 0, guc: 1 });
  for (let i = 0; i < 5; i++) liste.push({ x: i, z: 0, guc: 0.5 });
  sim.adim(liste);
  assert.equal(sim.deg.material.uniforms.uKaynakSayi.value, 5,
    'NaN dolgusu saglam kaynaklarin slotunu yememeli');
});

test('sifirla: ping-pong hedeflerinin IKISINI birden durgun suya doner', async () => {
  const izle = izleyiciYap();
  const { sim } = await simYap(izle, rendererYap());
  izle.renderTexture.length = 0;
  sim.sifirla();
  assert.equal(izle.renderTexture.length, 2, 'tek hedef yetmez — NaN bir kare sonra geri gelir');
  assert.deepEqual(izle.renderTexture, sim.deg.renderTargets);
});

test('alan NaN\'a duserse periyodik tarama SIFIRLAR (geri donus yolu)', async () => {
  const izle = izleyiciYap();
  const renderer = rendererYap([NaN, 0, 0, 1]);
  const { sim } = await simYap(izle, renderer);
  izle.renderTexture.length = 0;
  for (let i = 0; i < 119; i++) sim.adim([]);
  assert.equal(izle.renderTexture.length, 0, 'kare basina okuma YAPILMAZ (readPixels pahali)');
  sim.adim([]);                                  // 120. kare
  assert.equal(renderer.okumaSayisi, 1);
  assert.equal(izle.renderTexture.length, 2, 'NaN gorulunce alan sifirlanir');
});

test('saglikli alan bosuna sifirlanmaz', async () => {
  const izle = izleyiciYap();
  const renderer = rendererYap([0.02, -0.01, 0, 1]);
  const { sim } = await simYap(izle, renderer);
  izle.renderTexture.length = 0;
  for (let i = 0; i < 240; i++) sim.adim([{ x: 0, z: 0, guc: 1 }]);
  assert.equal(renderer.okumaSayisi, 2);
  assert.equal(izle.renderTexture.length, 0);
  assert.equal(izle.compute, 240);
});

test('float readback desteklenmiyorsa tarama KALICI kapanir, sahne yasar', async () => {
  const izle = izleyiciYap();
  const renderer = rendererYap();
  renderer.okumaFirlat = true;
  const { sim } = await simYap(izle, renderer);
  for (let i = 0; i < 360; i++) sim.adim([]);    // firlatma disari sizmamali
  assert.equal(renderer.okumaSayisi, 1, 'bir kez denenir, sonra bir daha denenmez');
  assert.equal(sim.saglikAcik, false);
  assert.equal(izle.compute, 360);
});

test('RippleSim.sil ortak dokum yolunu kullanir', async () => {
  const izle = izleyiciYap();
  const { sim } = await simYap(izle, rendererYap());
  sim.sil();
  assert.equal(izle.rtDispose, 2);
  assert.equal(izle.dokuDispose, 1);
  assert.equal(izle.materialDispose, 1);
  assert.equal(izle.passThruDispose, 1);
  assert.equal(izle.ortakGeometriDispose, 0);
});

// =============================================================================
// 4) mekan.js tek kaynaga baglanir (katman.js + ripple sabitleri)
// =============================================================================

test('mekan.js kubbeyi KATMAN.GOK bandina koyar, elle -1 yazmaz', () => {
  const s = oku('studio/js/mekan.js');
  assert.match(s, /import \{ KATMAN \} from '\.\/katman\.js'/);
  assert.match(s, /kubbe\.renderOrder = KATMAN\.GOK;/);
  assert.ok(!/renderOrder = -1/.test(s), 'elle yazili bant kalmamali');
});

test('render hattinin TUM modulleri katman.js\'i import eder', async () => {
  const { KATMAN } = await import('../studio/js/katman.js');
  for (const dosya of ['studio/js/motor.js', 'studio/js/mekan.js',
                       'studio/js/laminer.js', 'studio/js/zemin-efekt.js']) {
    assert.match(oku(dosya), /from '\.\/katman\.js'/, `${dosya} katman.js import etmeli`);
  }
  assert.equal(KATMAN.GOK, -1);   // kubbenin eski elle degeriyle ayni bant
});

test('su shader\'i ripple sabitlerini ripple.js\'ten TURETIR', async () => {
  const izle = izleyiciYap();
  const M = await rippleYukle(izle);
  const s = oku('studio/js/mekan.js');
  assert.match(s, /import \{ RIPPLE_ALAN, RIPPLE_IZGARA \} from '\.\/ripple\.js'/);
  // elle kopyalanmis sabitler gitti
  assert.ok(!/\(vDunya\.xz \+ 10\.0\) \/ 20\.0/.test(s));
  assert.ok(!/float px = 1\.0 \/ 128\.0;/.test(s));
  // ve turetilen metin bugunku degerlerle BIREBIR ayni GLSL'i uretir
  assert.match(s, /\(vDunya\.xz \+ \$\{\(RIPPLE_ALAN \/ 2\)\.toFixed\(1\)\}\) \/ \$\{RIPPLE_ALAN\.toFixed\(1\)\}/);
  assert.match(s, /float px = 1\.0 \/ \$\{RIPPLE_IZGARA\.toFixed\(1\)\};/);
  assert.equal((M.RIPPLE_ALAN / 2).toFixed(1), '10.0');
  assert.equal(M.RIPPLE_ALAN.toFixed(1), '20.0');
  assert.equal(M.RIPPLE_IZGARA.toFixed(1), '128.0');
});

test('RIPPLE_ALAN artik olu export degil — sim ile shader ayni alani konusur', async () => {
  const izle = izleyiciYap();
  const { sim } = await simYap(izle, rendererYap());
  // shader: uv = (xz + ALAN/2)/ALAN — sim tarafiyla ayni formul olmali
  sim.adim([{ x: 0, z: 0, guc: 1 }, { x: -10, z: -10, guc: 1 }, { x: 10, z: 10, guc: 1 }]);
  const k = sim.deg.material.uniforms.uKaynak.value;
  assert.equal(k[0].x, 0.5);  assert.equal(k[0].y, 0.5);   // merkez
  assert.equal(k[1].x, 0);    assert.equal(k[1].y, 0);     // alan kosesi
  assert.equal(k[2].x, 1);    assert.equal(k[2].y, 1);
});

// GLSL bloklari JS template literal'idir: shader yorumunda backtick string'i
// erken kapatir (2026-07-18 dersi). Dokundugumuz dosyalarda tekrar etmeyelim.
test('shader bloklarinda backtick yok, template literal kapanmiyor', () => {
  for (const dosya of ['studio/js/mekan.js', 'studio/js/ripple.js', 'studio/js/motor.js',
                       'studio/js/zemin-efekt.js']) {
    const s = oku(dosya);
    const tik = (s.match(/`/g) || []).length;
    assert.equal(tik % 2, 0, `${dosya}: backtick sayisi TEK — literal kapanmamis`);
  }
});
