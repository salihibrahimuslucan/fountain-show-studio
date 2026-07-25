# Büyük Animasyoncular Nasıl Yapıyor — Derin Araştırma Sentezi (2026-07-17)

Tetik: Salih — "web araştırmasını derinleştir, büyük animasyoncular nasıl yapıyorsa
uygulayalım". İki ajan: (A) Depence²/WYSIWYG/Capture + gerçek çeşme videografisi,
(B) Unreal Niagara / oyun motoru su VFX → WebGL2 taşınabilirlik. Clean-room: desen
düzeyi, kod kopyalanmadı. Kaynak linkleri ajan raporlarında (özde aşağıda).

## Kilit çıkarım

**Depence dahil kimse suyu gerçek akışkan çözmüyor.** Reçete: balistik parçacık +
katmanlı SAHTE ışık etkileşimi + agresif "gece kamerası" post zinciri. İnandırıcılık
render'da değil, POZLAMA ve IŞIK-SU BAĞINDA. (Depence R3 pazarlaması: raytraced
beam + Glow&Glare + Long Exposure + auto-exposure = kamera taklidi.)

## Profesyoneli amatörden ayıran 5 şey (kanıt: ajan A §5)

1. **HDR pozlama disiplini** — ışıksız su SİYAH kalır, sadece ışıklı su parlar;
   amatörde her şey gri/patlamış (Capture'ın "whiteout prevention" satış maddesi).
2. **Su malzemesi ayrışması** — aerated beyaz kolon ≠ laminer cam çubuk ≠ mist.
   Tek parçacık tipiyle her nozul = en büyük amatör teli. (Bizde `aeration` alanı
   ZATEN VAR — güçlendirilecek.)
3. **Işığın suda saçılması** — kabarcıklı suda süt-glow, laminerde uç glint (fiber
   optik TIR), arkadan aydınlatmada rim.
4. **Mist/haze katmanı** — Bellagio nozul dibinde fog halısı; yokluğu sahneyi
   "vakumda" gösterir.
5. **Kamera artefaktları** — bloom + star-burst glare + vinyet + hafif long-exposure.

## Profesyonel jet anatomisi (ajan B katman reçetesi)

| Katman | Pay | Doku | Bizde |
|---|---|---|---|
| Çekirdek jet | %40-50 | hıza-gerdirilmiş streak billboard | ❌ nokta sprite — EN BÜYÜK EKSİK |
| Damlacık | %25-30 | küçük nokta + drag | ✔ (balistik parçacık) |
| Mist | %5-10 az ama BÜYÜK | dev soft sprite, alfa 0.02-0.08, curl noise | ❌ yok |
| Tepe kırılması | %5 | noise-erosion sprite | ~ (tepeBuyume var, erosion yok) |
| Çarpma sıçraması | %10-15 | erosion taç + ikincil damla | ~ (KopukHalka var, taç yok) |
| Yüzey tepkisi | mesh/decal | ripple + köpük yaması | ~ (v4 su yüzeyi statik dalga) |

## UYGULAMA SIRASI (etki/maliyet, iki ajanın kesişimi)

- **v6 F1 — Velocity-stretched billboard**: çekirdek jeti "top top" görünümden
  "akan su"ya çeviren TEK en önemli hamle. GPGPU hız dokumuz hazır; vertex
  shader'da quad'ı hızın ekran izdüşümü boyunca gerdir. (KOLAY)
- **v6 F2 — Mist katmanı**: parçacıkların %5-10'u büyük/uzun ömür/düşük alfa
  "mist moduna"; velocity pass'e curl noise (divergence-free savrulma);
  SphereMask ışığa-dönük parlaklık → mist 412C rengini alır (Bellagio fog
  halısı hissi). (KOLAY-ORTA)
- **v6 F3 — SphereMask parçacık parlatma + rim**: her parçacığa en yakın halka
  ışığa mesafe + `pow(1-dot(V,L),n)` rim → ışık-su bağı; ışık dışı damla %70
  kararır (pro gözlem #1 ve #3'ün cevabı). (KOLAY)
- **v6 F4 — Noise-erosion splash**: çarpmada büyüyüp eriyen taç sprite (tek noise
  dokusu, yaşla eriyen alfa — flipbook'a temiz alternatif; hazır CC0 su flipbook'u
  YOK, gerekirse ileride Blender Mantaflow'dan kendimiz basarız). (KOLAY)
- **v6 F5 — Death→splash state**: su seviyesine inen parçacık ölmek yerine kısa
  ömürlü ikincil sıçrama moduna geçer (position dokusunun w kanalında bayrak) —
  bütçeden bedava ikincil sıçrama. (ORTA)
- **v6 F6 — Height-field ripple**: GPGPU ping-pong su yüksekliği (three resmi
  webgl_gpgpu_water DESENİ — MIT, desen düzeyi); çarpma noktaları sim'e damla
  yazılır, normal çıktısı v4 su shader'ının distorsiyonuna eklenir → jetin
  altında GERÇEK halka dalgalar. (ORTA)
- **v6 F7 — Kamera paketi**: ACESFilmic + auto-exposure (kare ortalamasına lerp)
  + bloom threshold'u yalnız çekirdek jet aşacak şekilde (mist threshold ALTINDA
  kalmalı — "additive mist + bloom = süt beyazı sahne" klasik hatası) + seçkin
  glint'lere 4-kollu star-burst. (ORTA)
- **(opsiyonel) Raymarch koni huzme**: 30 adım + blue-noise dither + FBM haze,
  yarım çözünürlük — ışık fikstürleri için; three.js'te kanıtlı desen. (PAHALI-ORTA)

## Ek: Depence² show-programming sayfası (Salih linki, 2026-07-17)

Kaynak: syncronorm.com/products/depence2/show-control/show-programming — editör
(P2+) backlog'una UX desenleri:
- **Multimedia timeline**: scene track (fade+delay), audio/video track, fixture
  GROUP track (toplu seçim+programlama) — bizde kanal şeridi düz liste; grup
  şeridi yok.
- **Parameter track filtreleme**: şerit, feature/parametre türüne göre
  filtrelenip timeline üzerinde doğrudan düzenleniyor.
- **Efekt motoru**: matematiksel + grafiksel fonksiyon kütüphanesi (sin/ramp
  vb. üreteç) → cue yazmadan dinamik efekt; özel eğri grafik editörle.
  (Bizim desen.js'in genelleşmiş hâli — üreteç fonksiyonu = kanal kaynağı.)
- **Ağaç yapısında track organizasyonu** + **iç içe gösteriler** (nested show =
  yeniden kullanılabilir alt-şov bloğu).
- Not: Salih'in verdiği github.com/profmitchell/Syncronome reposu boş bir Swift
  Xcode iskeleti çıktı (README yok, çeşme/DMX ilgisi görülmedi) — alınacak bir
  şey yok.

## Tuzak notları

- Additive mist + düşük bloom threshold = tüm sahne süt beyazı (ajan B §3).
- Flipbook kare sayısı 2'nin kuvveti olmalı (mip artefaktı).
- Laminer jette gövde neredeyse görünmez; parlaklık UÇTA ve kavis noktasında
  (yaş-tabanlı parlaklık eğrisi) — AquaJUMP'a birebir uygulanacak.
- Işık jeti TAKİP eder (WET: "lights follow the water stream") — ROBO/SWING
  süpürürken 412C göl merkezi de süpürmeli (motor kancası kontrol edilecek).
