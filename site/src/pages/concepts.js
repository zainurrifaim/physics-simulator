import { icon } from '../components/icons.js';

const concepts = [
  {
    title: 'Usaha',
    formula: 'W = F · s · cos θ',
    unit: 'joule (J) = N · m',
    text: 'Usaha mengukur energi yang dipindahkan oleh gaya saat benda bergerak. Gaya searah gerak menghasilkan usaha positif. Gaya berlawanan arah gerak menghasilkan usaha negatif, seperti sabuk yang menghentikan boneka uji tabrak. Gaya tegak lurus gerak menghasilkan usaha nol.',
    links: [['derek', 'Derek'], ['lift', 'Lift']],
  },
  {
    title: 'Energi potensial gravitasi',
    formula: 'E<sub>p</sub> = m · g · h',
    unit: 'joule (J)',
    text: 'Energi yang dimiliki benda karena ketinggiannya. Mengangkat benda setinggi h dengan kecepatan tetap membutuhkan usaha sebesar mgh.',
    links: [['angkat', 'Angkat besi'], ['derek', 'Derek']],
  },
  {
    title: 'Energi kinetik',
    formula: 'E<sub>k</sub> = ½ · m · v²',
    unit: 'joule (J)',
    text: 'Energi yang dimiliki benda karena bergerak. Pada massa yang sama, kecepatan dua kali lipat menghasilkan energi kinetik empat kali lipat. Menghentikannya dalam jarak yang sama membutuhkan gaya rata-rata empat kali lipat.',
    links: [['sabuk', 'Sabuk pengaman'], ['sepeda', 'Sepeda']],
  },
  {
    title: 'Teorema usaha–energi',
    formula: 'W<sub>total</sub> = ΔE<sub>k</sub>',
    unit: 'joule (J)',
    text: 'Jumlah usaha semua gaya sama dengan perubahan energi gerak benda. Untuk menghentikan boneka uji tabrak, sabuk perlu mengurangi energi kinetiknya hingga nol. Besar gaya rata-rata yang dibutuhkan adalah energi kinetik awal dibagi jarak berhenti.',
    links: [['sabuk', 'Sabuk pengaman']],
  },
  {
    title: 'Kekekalan energi mekanik',
    formula: 'E<sub>p1</sub> + E<sub>k1</sub> = E<sub>p2</sub> + E<sub>k2</sub>',
    unit: 'tanpa gesekan',
    text: 'Jika hanya gaya berat yang melakukan usaha, energi mekanik tetap. Energi potensial di puncak bukit berubah seluruhnya menjadi energi kinetik di dasar.',
    links: [['sepeda', 'Sepeda']],
  },
  {
    title: 'Daya',
    formula: 'P = W / t = F · v',
    unit: 'watt (W) = J/s',
    text: 'Daya menyatakan banyaknya energi yang dipindahkan setiap detik. Mengangkat peti ke tinggi yang sama membutuhkan usaha yang sama. Menyelesaikannya lebih cepat membutuhkan daya lebih besar. Hubungan P = F · v berlaku ketika gaya searah gerak.',
    links: [['derek', 'Derek'], ['lift', 'Lift']],
  },
];

const conventions = [
  ['F<sub>g</sub>', 'gaya berat = m · g (newton). Ditulis F<sub>g</sub> agar tidak tertukar dengan W untuk usaha.'],
  ['g', '10 m/s² di semua soal, sesuai materi.'],
  ['Tanda', 'Arah positif dipilih sesuai perhitungan. Benda melambat jika arah percepatannya berlawanan dengan arah kecepatan.'],
  ['Warna', 'jingga = gaya, biru = kecepatan, ungu putus-putus = perpindahan.'],
  ['Konversi', '1 kW = 1.000 W · 1 km/jam = 1/3,6 m/s · 36 km/jam = 10 m/s.'],
];

export function renderConcepts(main) {
  main.innerHTML = `
    <div class="page-heading">
      <h1>Usaha, energi, dan daya</h1>
    </div>
    <div class="concept-grid">
      ${concepts
        .map(
          (c) => `<article class="panel concept-card">
            <h2>${c.title}</h2>
            <div class="formula">${c.formula}</div>
            <p class="unit-line">Satuan: ${c.unit}</p>
            <p>${c.text}</p>
            <div class="concept-links">${c.links.map(([id, label]) => `<a href="#sim/${id}">${label} ${icon('arrow')}</a>`).join('')}</div>
          </article>`
        )
        .join('')}
    </div>
    <section class="panel conventions">
      <h2>Notasi dan kesepakatan</h2>
      <dl>${conventions.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
    </section>`;
}
