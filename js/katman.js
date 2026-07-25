// Çizim katmanları (renderOrder) — THREE'siz, Node testli.
//
// NEDEN: three.js saydam kuyruğu nesneleri renderOrder'a, eşitse nesne
// ORİJİNİNİN görüş-uzayı derinliğine göre (uzak→yakın) sıralar. Tek nokta olan
// bu orijin, geniş gövdeli nesnede kütlenin nerede olduğunu temsil ETMEZ:
// şehir siluet silindiri (merkez y≈yTavan/2 ≈ 23 m, R=78..180) hafif aşağı
// bakan kamerada su kolonundan (orijin y=0) DAHA YAKIN çıkar. Silindir de
// depthWrite:false olduğu için derinlik testi araya giremez → siluet, önündeki
// suyun üstüne boyanır. Sonuç G2: kolon bina hattında kesilir (gövde silinir,
// yalnız çatı üstünde kalan tepe kütlesi görünür = "kopuk kolon" + bina
// silüetinden gelen KESKİN DİKDÖRTGEN kenar).
//
// ÇÖZÜM: additive su/ışık katmanları kendi bandına alınır. Additive harman
// kendi içinde sıra-bağımsızdır ve hiçbir şeyi karartamaz; alfa-harmanlı sahne
// içeriğinden SONRA çizilmesi doğru olandır. Opak gövdelerin suyu örtmesi
// derinlik testi + softFade ile sürer, bu banttan etkilenmez.
export const KATMAN = {
  GOK: -1,        // kubbe (mekan.js)
  SAHNE: 0,       // varsayılan sahne içeriği: zemin, gövdeler, ağaç, şehir silueti
  SU_ZEMIN: 5,    // zemin imzaları: köpük halkası, ışık gölü, sıçrama tacı
  SU_HACIM: 6     // hacimli su: GPU parçacık spreyi, laminer yaylar
};

// three.js saydam kuyruk sıralamasının saf eşleniği (painterSortStable'ın
// saydam dalı): önce renderOrder artan, sonra derinlik AZALAN (uzak önce).
// derinlik = nesne orijininin görüş-uzayı uzaklığı; büyük = uzak.
// Dönen dizinin SONU en üste boyanan nesnedir.
export function saydamSirala(nesneler) {
  return [...nesneler].sort((a, b) => {
    const ra = a.renderOrder ?? 0, rb = b.renderOrder ?? 0;
    if (ra !== rb) return ra - rb;
    return (b.derinlik ?? 0) - (a.derinlik ?? 0);
  });
}

// Bir nesne orijininin kameraya göre görüş-uzayı derinliği (ileri eksene
// izdüşüm). Öklid uzaklığı DEĞİL — three.js de perspektif z kullanır, ve G2'de
// ikisi ters işaret veriyordu (şehir merkezi öklidde uzak, görüş-z'de yakın).
export function gorusDerinligi(nokta, kameraPos, kameraHedef) {
  const f = [kameraHedef[0] - kameraPos[0], kameraHedef[1] - kameraPos[1],
             kameraHedef[2] - kameraPos[2]];
  const n = Math.hypot(f[0], f[1], f[2]) || 1;
  const d = [nokta[0] - kameraPos[0], nokta[1] - kameraPos[1], nokta[2] - kameraPos[2]];
  return (d[0] * f[0] + d[1] * f[1] + d[2] * f[2]) / n;
}
