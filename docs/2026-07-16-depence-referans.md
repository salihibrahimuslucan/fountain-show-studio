# Depence² referans analizi (v2 efekt çıtası)

Kaynak: Salih'in verdiği "Depence 2 Demo GM.mp4" (3840×2160 60fps, 167 sn, 840MB —
**repoya girmez**, `.gitignore`'da; yerel kopya `D:\üretici\show-studio\`).
Analiz: 12 sn arayla 14 kare, 2026-07-16. Telifli görüntü — kare repoya gömülmez,
gözlemler metin olarak burada.

## Kare gözlemleri → v2 iş kalemlerine eşleme

1. **Renk NOZULDAN gelir (T-C mimari kararını değiştirdi).** Aynı jetin gövdesi
   cyan, tepe saçılması pembe olabiliyor (t≈120sn karesi) — renk modeli global
   spot ışığı değil, cihaza bağlı su-altı RGBW halka LED. v2'de her su cihazı
   kendi `renk` (RGBW) kanalını taşır; partikül shader'ında per-jet attribute —
   ışık-dizisi döngüsü gerekmez, "16 ışık × 100k partikül" performans riski
   kökten kalkar. Ayrı `rgb_spot` cihazı mimari/çevre aydınlatması olarak kalır.

2. **Su altı ışık gölü (T-B'ye yeni madde).** Nozul tarlası çevresinde havuz
   zemininde renkli, benekli (caustic hissi) parlama — Depence sahnesinin görsel
   ağırlığının yarısı bu. Uygulama adayı: zemine additive, nozul konumlarında
   yoğunlaşan, cihaz renk kanalına bağlı ışıma dokusu.

3. **Damla görünümü.** Jet gövdesi parlak çekirdek + iri damla salkımları
   (blob sprite kümeleri); tepe noktasında belirgin dağılma, düşüş kolonları
   ayrık salkımlar halinde; jet dibinde köpük halkası. Bizim v1 partikül
   dağılımı fazla ince/dumansı — sprite boyut/yoğunluk profili buna çekilecek.

4. **Ortam inandırıcılığın yarısı (T-F'nin önceliği arttı).** Gece + sıcak
   mimari aydınlatma + ağaç/kaya/şelale + insan silüetleri + taş kıyı. Su
   yüzeyinde renkli dalgacık yansımaları güçlü. Preset'ler bu katmanları
   (arka plan ışık lekeleri, kıyı dokusu, siluet sprite'ları) içermeli.

5. **Yelpaze (fan) nozul — katalog adayı (T-E).** V-şekilli renkli yelpaze
   matrisi ayrı cihaz tipi olarak sahnede (t≈84sn karesi). üretici
   karşılığıyla (fan jet) kataloğa eklenebilir.

6. **Desen dili (T-C/T-D).** Tüm matris üzerinde rainbow gradyan süpürmesi,
   ikili renk bölgeleri (yarı cyan / yarı magenta), bölüm geçişlerinde topyekûn
   palet değişimi — desen kütüphanesinin hedef sözlüğü tam bu.

## Çıta cümlesi

v2 [ELLE] karşılaştırmalarında soru şu: "Bu kare, Depence demosunun yanına
konduğunda aynı ligde mi?" — fotorealizm değil, **sahne dolgunluğu** ligi:
renk nozuldan, zemin ışık gölü, dolu ortam, iri damla salkımları.
