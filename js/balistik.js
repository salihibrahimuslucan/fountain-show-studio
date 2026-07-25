// balistik.js — saf (THREE'siz, Node testli) balistik iniş hesabı.
//
// v6 F6 ripple sim kaynaklarını nozul konumundan ÇARPMA noktasına taşır.
// Dik jetlerde ikisi aynıdır; eğik cihazlarda (AquaROBO pan/tilt, SWING
// süpürmesi, yelpaze) su nozuldan METRELERCE ötede iner — ripple'ın halkayı
// nozulda açması gözle yanlış görünüyordu (v6 F6 backlog notu).
//
// Fizik eşliği: motor.js fizikAdim() mist OLMAYAN parçacığa yalnız yerçekimi
// uygular (drag/savrulma mist'e özel, mix(1.0, ...) ile kapalı) → ana su için
// kapalı-form parabol shader'ın semplektik Euler'iyle aynı yörüngeyi verir.
// Bu yüzden burada iterasyon yok, analitik çözüm yeterli.

export const G_VARSAYILAN = 9.81;

// Nozuldan v hızıyla yon yönünde atılan parçacığın y=0 düzlemine iniş noktası.
// nozul: {x, y, z} (y = kaynakY, doğum yüksekliği)
// yon:   {x, y, z} birim vektör (normalize edilmemişse normalize edilir)
// hiz:   m/s skaler (uHizA..uHizB ortalaması × uHizScale)
// Dönüş: {x, z, t, inisHizi} veya y=0'a HİÇ inmiyorsa null.
export function inisNoktasi(nozul, yon, hiz, g = G_VARSAYILAN) {
  const n = Math.hypot(yon.x, yon.y, yon.z);
  if (!(n > 0) || !(hiz > 0) || !(g > 0)) return null;
  const vx = (yon.x / n) * hiz, vy = (yon.y / n) * hiz, vz = (yon.z / n) * hiz;
  const y0 = nozul.y;
  // y0 + vy·t − ½g·t² = 0 → t = (vy + √(vy² + 2g·y0)) / g   (pozitif kök)
  const disk = vy * vy + 2 * g * y0;
  if (disk < 0) return null;                     // zaten yüzeyin altında, iniş yok
  const kok = Math.sqrt(disk);
  const t = (vy + kok) / g;
  if (!(t > 0)) return { x: nozul.x, z: nozul.z, t: 0, inisHizi: Math.abs(vy) };
  return { x: nozul.x + vx * t, z: nozul.z + vz * t, t, inisHizi: kok };
}

// Çizgi kaynaklı cihaz (v5 perde: CLASSIC/LACE/DIGITAL) tek noktaya değil
// BİR HATTA iner. Hattı örnekler; her örneğin gücü toplamda 1'e bölünür ki
// perde, aynı debideki tek jetten daha güçlü ripple atmasın.
export function inisHatti(nozul, yon, hiz, cizgiBoy, yonAci, adet = 3, g = G_VARSAYILAN) {
  const merkez = inisNoktasi(nozul, yon, hiz, g);
  if (!merkez) return [];
  if (!(cizgiBoy > 0) || adet < 2) return [merkez];
  const ex = Math.cos(yonAci), ez = Math.sin(yonAci);   // konum shader'ıyla aynı eksen
  const cikti = [];
  for (let i = 0; i < adet; i++) {
    const s = (i / (adet - 1) - 0.5) * cizgiBoy;
    cikti.push({ x: merkez.x + ex * s, z: merkez.z + ez * s, t: merkez.t, inisHizi: merkez.inisHizi });
  }
  return cikti;
}

// İniş hızını ripple gücüne çevirir (motor.carpmaGuc ile aynı ölçek: /14 kelepçe).
export function guc(inisHizi) {
  return Math.min(1, Math.max(0, inisHizi) / 14);
}
