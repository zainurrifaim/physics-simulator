export default {
  id: 'angkat',
  number: '01',
  short: 'Angkat besi',
  title: 'Atlet Angkat Besi',
  category: 'Usaha & Energi',
  tags: ['Energi potensial', 'Usaha'],
  minutes: 12,
  color: 'mint',
  description: 'Satu barbel, satu pertanyaan. Temukan hubungan massa, tinggi, dan energi.',
  hook: 'Cukupkah 500 joule untuk mengangkat barbel ke atas kepala?',
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
  prediction: {
    question: 'Menurutmu, apakah energi 500 J cukup untuk mengangkat barbel 20 kg setinggi 1,5 m?',
    options: ['Cukup', 'Tidak cukup', 'Pas sekali, tidak lebih'],
    correct: 0,
  },
  story: (p, r, f) => [
    { caption: 'Cukupkah 500 joule?', sub: 'Seorang atlet akan mengangkat barbel dari lantai ke atas kepala.', layers: [], t: 'start' },
    { caption: `Barbel ${f(p.mass)} kg, tinggi ${f(p.height)} m`, sub: 'Kita catat besaran yang diketahui langsung pada gambar.', layers: ['labels'], t: 'start' },
    { caption: 'Dua gaya, satu perpindahan', sub: `Gaya berat F<sub>g</sub> = mg = ${f(r.weight)} N ke bawah. Gaya angkat F ke atas. Perpindahan s ke atas.`, layers: ['labels', 'forces', 'motion'], t: 'start' },
    { caption: 'Angkat!', sub: 'Saat barbel naik, usaha atlet tersimpan sebagai energi potensial.', layers: ['labels', 'forces', 'motion'], t: 'play' },
    {
      caption: 'Hitung energinya',
      layers: ['labels'],
      t: 'end',
      equation: ['E<sub>p</sub> = m · g · h', `E<sub>p</sub> = ${f(p.mass)} kg × 10 m/s² × ${f(p.height)} m`, `E<sub>p</sub> = <b>${f(r.work)} J</b>`],
    },
    { caption: r.ok ? `${f(p.energy)} J > ${f(r.work)} J → BISA!` : `${f(p.energy)} J < ${f(r.work)} J → belum bisa`, sub: 'Grafik energi potensial naik seiring ketinggian, sampai menyentuh kebutuhan energi.', layers: ['labels'], t: 'end', chart: true },
  ],
  worked: (p, r, f) => [
    `F<sub>g</sub> = m · g = ${f(p.mass)} × 10 = ${f(r.weight)} N`,
    `W = E<sub>p</sub> = m · g · h = ${f(p.mass)} × 10 × ${f(p.height)} = <b>${f(r.work)} J</b>`,
    r.ok
      ? `Energi tersedia ${f(p.energy)} J ≥ ${f(r.work)} J → atlet <b>bisa</b> mengangkat barbel (model ideal).`
      : `Energi tersedia ${f(p.energy)} J < ${f(r.work)} J → barbel hanya mencapai h = E / (mg) = ${f(r.reachable, 2)} m.`,
  ],
  summary: (p, r, f) => ({
    message: r.ok ? 'Energi cukup untuk mencapai tinggi target.' : 'Energi belum cukup untuk mencapai tinggi target.',
    metrics: [
      ['Energi yang dibutuhkan', `${f(r.work)} J`],
      ['Energi tersedia', `${f(p.energy)} J`],
      ['Tinggi yang tercapai', `${f(r.reachable, 2)} m`],
    ],
  }),
  chart: {
    yLabel: 'Energi',
    yUnit: 'J',
    series: (p, r) => [{ label: 'Energi potensial E<sub>p</sub>', kind: 'energy', fn: (s) => s.potential }],
    lines: (p, r) => [{ label: 'Energi tersedia', value: p.energy }],
    note: 'Energi potensial bertambah sebanding dengan ketinggian. Garis putus-putus menunjukkan energi yang dimiliki atlet.',
  },
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
