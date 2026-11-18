export default {
  id: 'sepeda',
  number: '05',
  short: 'Sepeda',
  title: 'Sepeda Menuruni Bukit',
  category: 'Kekekalan Energi',
  tags: ['Energi kinetik', 'Kekekalan energi'],
  minutes: 15,
  color: 'sky',
  description: 'Meluncur tanpa mengayuh. Ke mana perginya energi potensial?',
  hook: 'Bukit 80 m, lintasan 160 m. Berapa lama sampai ke bawah?',
  problem:
    'Seorang pengendara sepeda menuruni bukit dari puncak bukit. Tinggi bukit 80 m dan massa pengendara dan sepedanya 80 kg. Jarak dari bawah bukit ke puncak bukit adalah 160 m. Berapa waktu yang dibutuhkan pengendara sepeda untuk mencapai dasar bukit? (g = 10 m/s², tanpa gesekan)',
  preset: { mass: 80, height: 80, length: 160 },
  fields: [
    { key: 'mass', label: 'Massa pengendara + sepeda', symbol: 'm', unit: 'kg', min: 30, max: 150, step: 1 },
    { key: 'height', label: 'Tinggi bukit', symbol: 'h', unit: 'm', min: 5, max: 150, step: 1 },
    { key: 'length', label: 'Panjang lintasan', symbol: 'L', unit: 'm', min: 20, max: 300, step: 5 },
  ],
  formula: 'mgh = ½mv² &nbsp;&nbsp; t = s / v̄',
  assumptions:
    'Mulai dari diam, lintasan lurus dengan kemiringan tetap, tanpa mengayuh, tanpa gesekan dan hambatan udara, dan sepeda dianggap titik (energi putar roda diabaikan). Karena kemiringan tetap, percepatan konstan sehingga kecepatan rata-rata = (0 + v)/2. Untuk bukit melengkung, tinggi dan panjang saja tidak cukup untuk menentukan waktu.',
  prediction: {
    question: 'Jika massa pengendara lebih besar, waktu sampai ke dasar bukit akan…',
    options: ['Lebih singkat', 'Sama saja', 'Lebih lama'],
    correct: 1,
  },
  story: (p, r, f) => [
    { caption: 'Meluncur tanpa mengayuh', sub: 'Seorang pesepeda berhenti di puncak bukit, lalu melepas rem.', layers: [], t: 'start' },
    { caption: `h = ${f(p.height)} m, L = ${f(p.length)} m`, sub: `Massa pengendara dan sepeda ${f(p.mass)} kg. Tanpa gesekan.`, layers: ['labels'], t: 'start' },
    { caption: 'Gaya dan gerak', sub: `Gaya berat F<sub>g</sub> = ${f(r.weight)} N ke bawah, gaya normal tegak lurus lereng. Perpindahan dan kecepatan sejajar lereng.`, layers: ['labels', 'forces', 'motion'], t: 'start' },
    { caption: 'Energi berubah wujud', sub: 'Energi potensial berkurang, energi kinetik bertambah. Jumlahnya tetap.', layers: ['labels', 'forces', 'motion'], t: 'play' },
    {
      caption: 'Kecepatan di dasar',
      layers: ['labels', 'motion'],
      t: 'end',
      equation: ['mgh = ½mv² → v = √(2gh)', `v = √(2 × 10 × ${f(p.height)})`, `v = <b>${f(r.speed, 2)} m/s</b>`],
    },
    {
      caption: 'Berapa lama?',
      layers: ['labels', 'motion'],
      t: 'end',
      equation: [`v̄ = (0 + ${f(r.speed, 2)}) / 2 = ${f(r.speed / 2, 2)} m/s`, `t = s / v̄ = ${f(p.length)} / ${f(r.speed / 2, 2)}`, `t = <b>${f(r.duration, 2)} s</b>`],
    },
    { caption: `${f(r.duration, 2)} detik!`, sub: 'Garis total energi tetap datar: energi mekanik kekal.', layers: ['labels'], t: 'end', chart: true },
  ],
  worked: (p, r, f) => [
    `E<sub>p</sub> awal = mgh = ${f(p.mass)} × 10 × ${f(p.height)} = ${f(r.energy)} J`,
    `mgh = ½mv² → v = √(2gh) = √(2 × 10 × ${f(p.height)}) = ${f(r.speed, 2)} m/s`,
    `v̄ = (0 + ${f(r.speed, 2)}) / 2 = ${f(r.speed / 2, 2)} m/s`,
    `t = s / v̄ = ${f(p.length)} / ${f(r.speed / 2, 2)} = <b>${f(r.duration, 2)} s</b>`,
    `Cek: a = g · h / L = ${f(r.acceleration, 2)} m/s², t = v / a = ${f(r.speed / r.acceleration, 2)} s. Massa saling menghilangkan.`,
  ],
  summary: (p, r, f) => ({
    message: 'Energi potensial seluruhnya berubah menjadi energi kinetik.',
    metrics: [
      ['Waktu sampai dasar', `${f(r.duration, 2)} s`],
      ['Kecepatan akhir', `${f(r.speed, 2)} m/s`],
      ['Energi mekanik', `${f(r.energy)} J`],
    ],
  }),
  chart: {
    yLabel: 'Energi',
    yUnit: 'J',
    series: (p, r) => [
      { label: 'Energi potensial E<sub>p</sub>', kind: 'energy', fn: (s) => s.potential },
      { label: 'Energi kinetik E<sub>k</sub>', kind: 'velocity', fn: (s) => s.kinetic },
      { label: 'Energi mekanik total', kind: 'total', fn: (s) => s.potential + s.kinetic },
    ],
    note: 'E<sub>p</sub> turun, E<sub>k</sub> naik, dan jumlahnya tetap sepanjang lintasan.',
  },
  worksheet: {
    question: 'Berapa waktu yang dibutuhkan pengendara untuk mencapai dasar bukit pada soal asli?',
    vectors: [
      { key: 'Fg', label: 'Gaya berat F<sub>g</sub>', correct: 'down', magnitude: 800 },
      { key: 's', label: 'Perpindahan s', correct: 'slope' },
      { key: 'v', label: 'Kecepatan v di dasar bukit', correct: 'slope' },
    ],
    directions: ['up', 'down', 'right', 'slope'],
    rubric: [
      'Sketsa: pengendara di puncak bukit (h = 80 m).',
      'Lintasan sepanjang 160 m menuju dasar bukit (h = 0).',
      'Diagram vektor: F<sub>g</sub> ke bawah (800 N), perpindahan sepanjang lereng (160 m), kecepatan di dasar lereng.',
      'Perhitungan v = 40 m/s dengan kekekalan energi, v̄ = 20 m/s, t = 8 s.',
    ],
    reflection: 'Prediksimu tentang pengaruh massa — benar atau tidak? Jelaskan mengapa massa tidak mengubah waktu meluncur dalam model ini.',
  },
};
