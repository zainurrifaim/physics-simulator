export default {
  id: 'sepeda',
  interaction: { handles: ['height', 'length'], load: 'mass', increment: 10, hint: 'Seret penanda tinggi bukit atau panjang lintasan. Tombol + dan − mengubah massa sepeda dan pengendara.' },
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
    'Sepeda mulai dari diam, tanpa mengayuh. Lintasan lurus dengan kemiringan tetap. Gesekan dan hambatan udara diabaikan. Energi potensial berubah menjadi energi gerak saat sepeda turun. Massa dan energi putar roda diabaikan. Panjang lintasan diukur sepanjang lereng. Karena percepatannya tetap, kecepatan rata-rata sama dengan setengah kecepatan di dasar bukit. Pada lintasan melengkung, tinggi dan panjang saja belum cukup untuk menentukan waktu tempuh.',
  compare: {
    question: 'Massa sepeda dan pengendara dua kali lipat. Siapa yang sampai duluan?',
    sub: 'Keduanya mulai dari diam pada bukit yang sama, tanpa mengayuh atau gesekan.',
    experimentQuestion: () => 'Siapa yang sampai di dasar bukit lebih dulu?',
    context: (A, B, f) => A.height === B.height && A.length === B.length
      ? `Bukit ${f(A.height)} m dengan lintasan ${f(A.length)} m. Mulai dari diam, tanpa mengayuh atau gesekan.`
      : `A di bukit ${f(A.height)} m, lintasan ${f(A.length)} m. B di bukit ${f(B.height)} m, lintasan ${f(B.length)} m. Mulai dari diam, tanpa gesekan.`,
    options: ['B lebih dulu', 'Bersamaan', 'A lebih dulu'],
    correct: 1,
    key: 'mass',
    B: { mass: 160 },
    tag: (p, f) => `Sepeda dan pengendara ${f(p.mass)} kg`,
    detail: (p, r, f) => `Sampai dalam ${f(r.duration, 2)} detik.`,
    equation: (A, rA, B, rB, f) =>
      `<span class="a">${f(rA.duration, 2)} s</span> = <span class="b">${f(rB.duration, 2)} s</span>`,
    caption: (A, rA, B, rB, f) => `mgh = ½mv² → v = √(2gh) = ${f(rA.speed, 2)} m/s; massa saling menghilangkan. Energinya ${f(rB.energy / rA.energy, 2)}× lebih besar.`,
    verdict: (A, rA, B, rB, f) =>
      Math.abs(rA.duration - rB.duration) < 1e-9 ? 'Keduanya sampai bersamaan. Pada bukit yang sama dan tanpa gesekan, massa tidak mengubah waktu tempuh. Gaya berat dan massa bertambah dengan perbandingan yang sama, sehingga percepatannya tetap sama.' : 'Waktu tempuh berbeda karena bentuk bukitnya berbeda.',
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
    `v̄ = (0 + ${f(r.speed, 3)}) / 2 = ${f(r.speed / 2, 3)} m/s`,
    `t = s / v̄ = ${f(p.length)} / ${f(r.speed / 2, 3)} = <b>${f(r.duration, 2)} s</b>`,
    `Cek: a = g · h / L = 10 × ${f(p.height)} / ${f(p.length)} = ${f(r.acceleration, 3)} m/s², t = v / a = ${f(r.speed / r.acceleration, 2)} s. Massa saling menghilangkan.`,
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
