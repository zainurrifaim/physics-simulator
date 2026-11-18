export default {
  id: 'angkat',
  interaction: { handles: ['height'], load: 'mass', increment: 5, hint: 'Tambahkan pelat dengan + atau −. Seret penanda tinggi untuk mengubah target.' },
  number: '01',
  short: 'Angkat besi',
  title: 'Atlet Angkat Besi',
  category: 'Usaha & Energi',
  tags: ['Energi potensial', 'Usaha'],
  minutes: 12,
  problem:
    'Seorang atlet angkat besi ingin mengangkat barbel seberat 20 kg di atas kepalanya. Jarak dari lantai ke atas kepalanya adalah 1,5 m. Jika atlet tersebut memiliki energi 500 Joule, dapatkah ia mengangkat barbel tersebut? (g = 10 m/s²)',
  preset: { mass: 20, height: 1.5, energy: 500 },
  fields: [
    { key: 'mass', label: 'Massa barbel', symbol: 'm', unit: 'kg', min: 5, max: 200, step: 1 },
    { key: 'height', label: 'Tinggi angkat', symbol: 'h', unit: 'm', min: 0.5, max: 1.6, step: 0.1 },
    { key: 'energy', label: 'Energi tersedia', symbol: 'E', unit: 'J', min: 50, max: 5000, step: 10 },
  ],
  formula: 'E<sub>p</sub> = m · g · h',
  assumptions:
    'Seluruh energi atlet digunakan untuk mengangkat barbel. Energi yang dibutuhkan adalah massa × gravitasi × tinggi angkat. Barbel mulai dan berhenti dengan lembut, sehingga gaya angkat berubah saat barbel mempercepat atau memperlambat. Tinggi diukur dari posisi awal barbel di lantai. Saat energi habis, barbel berhenti, dilepas, lalu jatuh. Menahan barbel diam menghasilkan usaha mekanik nol karena barbel tidak berpindah, meskipun otot tetap menggunakan energi. Model ini menghitung kecukupan energi dan menganggap atlet mampu menghasilkan gaya angkat yang diperlukan.',
  compare: {
    question: 'Barbel mana yang bisa diangkat sampai ke atas kepala?',
    sub: 'Tinggi tujuan 1,5 m. Setiap atlet memiliki energi 500 J.',
    experimentQuestion: () => 'Barbel mana yang mencapai tinggi tujuan?',
    context: (A, B, f) => A.height === B.height && A.energy === B.energy
      ? `Tinggi tujuan ${f(A.height)} m. Energi tersedia ${f(A.energy)} J pada setiap atlet.`
      : `A menuju ${f(A.height)} m dengan ${f(A.energy)} J. B menuju ${f(B.height)} m dengan ${f(B.energy)} J.`,
    options: ['Keduanya', 'Hanya A', 'Hanya B', 'Tidak ada'],
    correct: 1,
    key: 'mass',
    B: { mass: 40 },
    tag: (p, f) => `Barbel ${f(p.mass)} kg`,
    detail: (p, r, f) => (r.ok ? `Mencapai ${f(p.height)} m. Energi terpakai ${f(r.work)} J.` : `Energi habis di ${f(r.reachable, 2)} m. Barbel jatuh.`),
    equation: (A, rA, B, rB, f) =>
      `<span class="a">${f(rA.work)} J</span> &lt; ${f(A.energy)} J ${rB.work > B.energy ? '&lt;' : '≥'} <span class="b">${f(rB.work)} J</span>`,
    caption: (A, rA, B, rB, f) => `E<sub>p</sub> = m · g · h — massa ${f(B.mass / A.mass, 2)}×, energi yang dibutuhkan ${f(rB.work / rA.work, 2)}×`,
    verdict: (A, rA, B, rB, f) =>
      rA.ok && !rB.ok ? `Hanya A mencapai tujuan. Barbel B membutuhkan ${f(rB.work)} J, melebihi energi tersedia ${f(B.energy)} J. Pada tinggi yang sama, massa dua kali lipat membutuhkan energi dua kali lipat.` : rA.ok && rB.ok ? 'Kedua barbel mencapai tinggi tujuan.' : !rA.ok && !rB.ok ? 'Energi kedua atlet habis sebelum barbel mencapai tujuan.' : 'Hanya B mencapai tujuan.',
    diagram: 'Diagram gaya pada barbel (saat ditahan / kecepatan tetap)',
    forces: (p, r) => [
      { dx: 0, dy: -1, value: r.weight, label: 'F' },
      { dx: 0, dy: 1, value: r.weight, label: 'F<tspan class="sub" dy="4">g</tspan>' },
    ],
    graph: { label: 'energi yang sudah dipakai atlet', unit: 'J', fn: (s) => s.athleteWork, line: (p) => ({ value: p.energy, label: 'energi tersedia' }) },
  },
  worked: (p, r, f) => [
    `F<sub>g</sub> = m · g = ${f(p.mass)} × 10 = ${f(r.weight)} N`,
    `W = E<sub>p</sub> = m · g · h = ${f(p.mass)} × 10 × ${f(p.height)} = <b>${f(r.work)} J</b>`,
    r.ok
      ? `Energi tersedia ${f(p.energy)} J ≥ ${f(r.work)} J → atlet <b>bisa</b> mengangkat barbel (model ideal).`
      : `Energi tersedia ${f(p.energy)} J < ${f(r.work)} J → h<sub>maks</sub> = E / (m · g) = ${f(p.energy)} / (${f(p.mass)} × 10) = ${f(r.reachable, 2)} m < ${f(p.height)} m → atlet <b>tidak bisa</b> mengangkat barbel ke target.`,
  ],
  worksheet: {
    question: 'Berapa energi potensial (usaha) yang dibutuhkan untuk mengangkat barbel pada soal asli?',
    vectors: [
      { key: 'Fg', label: 'Gaya berat F<sub>g</sub>', correct: 'down', magnitude: 200 },
      { key: 'F', label: 'Gaya angkat F', correct: 'up', magnitude: 200 },
      { key: 's', label: 'Perpindahan s', correct: 'up' },
    ],
    directions: ['up', 'down', 'left', 'right'],
    rubric: [
      'Sketsa posisi awal: atlet membungkuk mengambil barbel dari lantai.',
      'Sketsa posisi akhir: atlet berdiri tegak dengan barbel di atas kepala.',
      'Diagram vektor: F<sub>g</sub> ke bawah (200 N), F ke atas (≥ 200 N), s ke atas (1,5 m).',
      'Perhitungan E<sub>p</sub> = mgh = 300 J dengan satuan, lalu dibandingkan dengan 500 J.',
    ],
    reflection: 'Jika massa barbel digandakan, apa yang terjadi pada energi yang dibutuhkan? Coba di simulasi, lalu jelaskan.',
  },
};
