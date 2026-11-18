export default {
  id: 'angkat',
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
    { key: 'height', label: 'Tinggi angkat', symbol: 'h', unit: 'm', min: 0.5, max: 2.5, step: 0.1 },
    { key: 'energy', label: 'Energi mekanik tersedia', symbol: 'E', unit: 'J', min: 50, max: 5000, step: 10 },
  ],
  formula: 'E<sub>p</sub> = m · g · h',
  assumptions:
    'Energi atlet dianggap seluruhnya menjadi energi mekanik (efisiensi ideal). Barbel diangkat dengan kecepatan tetap sehingga gaya angkat sama dengan gaya berat; percepatan singkat di awal dan akhir diabaikan. Cukup energi belum tentu berarti cukup kuat — itu soal gaya, bukan energi.',
  compare: {
    question: 'Energi atlet 500 J. Barbel 20 kg atau 40 kg — mana yang sampai ke atas kepala?',
    sub: 'Atlet yang sama mengangkat barbel setinggi 1,5 m. Massa B dua kali massa A. g = 10 m/s².',
    options: ['Keduanya', 'Hanya A', 'Hanya B', 'Tidak ada'],
    correct: 1,
    key: 'mass',
    B: { mass: 40 },
    tag: (p, f) => `${f(p.mass)} kg`,
    detail: (p, r, f) => (r.ok ? `butuh ${f(r.work)} J ✓` : `butuh ${f(r.work)} J ✗ · berhenti di ${f(r.reachable, 2)} m`),
    equation: (A, rA, B, rB, f) =>
      `<span class="a">${f(rA.work)} J</span> &lt; ${f(A.energy)} J ${rB.work > B.energy ? '&lt;' : '≥'} <span class="b">${f(rB.work)} J</span>`,
    caption: (A, rA, B, rB, f) => `E<sub>p</sub> = m · g · h — massa ${f(B.mass / A.mass, 2)}×, energi yang dibutuhkan ${f(rB.work / rA.work, 2)}×`,
    verdict: (A, rA, B, rB, f) =>
      rA.ok && !rB.ok ? 'Hanya A. Massa dua kali lipat butuh energi dua kali lipat — 600 J melebihi 500 J.' : rA.ok && rB.ok ? 'Keduanya cukup.' : !rA.ok && !rB.ok ? 'Tidak ada yang cukup.' : 'Hanya B.',
    diagram: 'Diagram gaya pada barbel',
    forces: (p, r) => [
      { dx: 0, dy: -1, value: r.weight, label: 'F' },
      { dx: 0, dy: 1, value: r.weight, label: 'F<tspan class="sub" dy="4">g</tspan>' },
    ],
    graph: { label: 'energi potensial', unit: 'J', fn: (s) => s.potential, line: (p) => ({ value: p.energy, label: 'energi atlet' }) },
  },
  worked: (p, r, f) => [
    `F<sub>g</sub> = m · g = ${f(p.mass)} × 10 = ${f(r.weight)} N`,
    `W = E<sub>p</sub> = m · g · h = ${f(p.mass)} × 10 × ${f(p.height)} = <b>${f(r.work)} J</b>`,
    r.ok
      ? `Energi tersedia ${f(p.energy)} J ≥ ${f(r.work)} J → atlet <b>bisa</b> mengangkat barbel (model ideal).`
      : `Energi tersedia ${f(p.energy)} J < ${f(r.work)} J → barbel hanya mencapai h = E / (mg) = ${f(r.reachable, 2)} m.`,
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
