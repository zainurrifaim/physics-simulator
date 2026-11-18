export default {
  id: 'sepeda',
  interaction: { handles: ['height', 'length'], load: 'mass', increment: 10, hint: 'Seret h untuk tinggi bukit dan L untuk panjang lintasan. + atau − mengubah massa.' },
  number: '05',
  short: 'Sepeda',
  title: 'Sepeda Menuruni Bukit',
  category: 'Kekekalan Energi',
  tags: ['Energi kinetik', 'Kekekalan energi'],
  minutes: 15,
  problem:
    'Seorang pengendara sepeda menuruni bukit dari puncak bukit. Tinggi bukit 80 m dan massa pengendara dan sepedanya 80 kg. Jarak dari bawah bukit ke puncak bukit adalah 160 m. Berapa waktu yang dibutuhkan pengendara sepeda untuk mencapai dasar bukit? (g = 10 m/s², tanpa gesekan)',
  preset: { mass: 80, height: 80, length: 160 },
  fields: [
    { key: 'mass', label: 'Massa pengendara + sepeda', symbol: 'm', unit: 'kg', min: 30, max: 200, step: 1 },
    { key: 'height', label: 'Tinggi bukit', symbol: 'h', unit: 'm', min: 5, max: 150, step: 1 },
    { key: 'length', label: 'Panjang lintasan', symbol: 'L', unit: 'm', min: 20, max: 300, step: 5 },
  ],
  formula: 'mgh = ½mv² &nbsp;&nbsp; t = s / v̄',
  assumptions:
    'Mulai dari diam, lintasan lurus dengan kemiringan tetap, tanpa mengayuh, tanpa gesekan dan hambatan udara, dan sepeda dianggap titik (energi putar roda diabaikan). Karena kemiringan tetap, percepatan konstan sehingga kecepatan rata-rata = (0 + v)/2. Untuk bukit melengkung, tinggi dan panjang saja tidak cukup untuk menentukan waktu.',
  compare: {
    question: 'Pengendara 2× lebih berat. Sampai di dasar bukit lebih cepat?',
    sub: 'Bukit 80 m, lintasan lurus 160 m, mulai dari diam, tanpa gesekan. g = 10 m/s².',
    options: ['B lebih cepat', 'Sama saja', 'B lebih lambat'],
    correct: 1,
    key: 'mass',
    B: { mass: 160 },
    tag: (p, f) => `${f(p.mass)} kg`,
    detail: (p, r, f) => `${f(r.duration, 2)} s · ${f(r.energy)} J`,
    equation: (A, rA, B, rB, f) =>
      `<span class="a">${f(rA.duration, 2)} s</span> = <span class="b">${f(rB.duration, 2)} s</span>`,
    caption: (A, rA, B, rB, f) => `mgh = ½mv² → v = √(2gh) = ${f(rA.speed, 2)} m/s; massa saling menghilangkan. Energinya ${f(rB.energy / rA.energy, 2)}× lebih besar.`,
    verdict: (A, rA, B, rB, f) =>
      Math.abs(rA.duration - rB.duration) < 1e-9 ? 'Sama saja! Tanpa gesekan, massa tidak mengubah waktu — hanya mengubah energinya.' : 'Waktunya berbeda karena bukitnya berbeda.',
    diagram: 'Diagram gaya pada pengendara',
    forces: (p, r) => [
      { dx: 0, dy: 1, value: r.weight, label: 'F<tspan class="sub" dy="4">g</tspan>' },
      { dx: Math.sin(r.angle), dy: -Math.cos(r.angle), value: r.normal, label: 'N' },
    ],
    graph: { label: 'kecepatan', unit: 'm/s', fn: (s) => s.speed },
  },
  worked: (p, r, f) => [
    `E<sub>p</sub> awal = mgh = ${f(p.mass)} × 10 × ${f(p.height)} = ${f(r.energy)} J`,
    `mgh = ½mv² → v = √(2gh) = √(2 × 10 × ${f(p.height)}) = ${f(r.speed, 2)} m/s`,
    `v̄ = (0 + ${f(r.speed, 2)}) / 2 = ${f(r.speed / 2, 2)} m/s`,
    `t = s / v̄ = ${f(p.length)} / ${f(r.speed / 2, 2)} = <b>${f(r.duration, 2)} s</b>`,
    `Cek: a = g · h / L = ${f(r.acceleration, 2)} m/s², t = v / a = ${f(r.speed / r.acceleration, 2)} s. Massa saling menghilangkan.`,
  ],
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
