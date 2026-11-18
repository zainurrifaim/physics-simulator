export default {
  id: 'sabuk',
  number: '04',
  short: 'Sabuk pengaman',
  title: 'Uji Sabuk Pengaman',
  category: 'Usaha & Energi Kinetik',
  tags: ['Energi kinetik', 'Gaya'],
  minutes: 15,
  problem:
    'Mobil bermassa 1.500 kg bergerak dengan kecepatan 36 km/jam dan menabrak dinding. Mobil melambat dari 36 km/jam hingga diam dalam jarak 0,5 m. Jika massa dummy adalah 60 kg dan sabuk pengaman robek pada gaya sebesar 7.000 N, tentukan apakah sabuk pengaman robek atau tidak. (g = 10 m/s²)',
  preset: { speed: 36, distance: 0.5, mass: 60, limit: 7000, carMass: 1500 },
  fields: [
    { key: 'speed', label: 'Kecepatan awal', symbol: 'v<sub>0</sub>', unit: 'km/jam', min: 10, max: 120, step: 1 },
    { key: 'distance', label: 'Jarak pengereman', symbol: 's', unit: 'm', min: 0.1, max: 2, step: 0.05 },
    { key: 'mass', label: 'Massa dummy', symbol: 'm', unit: 'kg', min: 20, max: 120, step: 1 },
    { key: 'limit', label: 'Kekuatan sabuk', symbol: 'F<sub>maks</sub>', unit: 'N', min: 1000, max: 30000, step: 500 },
    { key: 'carMass', label: 'Massa mobil', symbol: 'M', unit: 'kg', min: 500, max: 3000, step: 50 },
  ],
  formula: 'v² = v<sub>0</sub>² + 2as &nbsp;&nbsp; F = m · a',
  assumptions:
    'Perlambatan dianggap konstan selama 0,5 m, dan sabuk memberikan seluruh gaya horizontal yang menghentikan dummy. Gaya 6.000 N adalah gaya rata-rata model, bukan puncak gaya tabrakan sungguhan. Massa mobil hanya konteks — gaya pada sabuk ditentukan massa dummy. Sabuk dianggap robek bila F ≥ kekuatan sabuk.',
  compare: {
    question: 'Kecepatan 2× lipat. Gaya pada sabuk 2× atau 4×?',
    sub: 'Mobil yang sama menabrak dinding dan berhenti dalam 0,5 m. Dummy 60 kg, sabuk robek pada 7.000 N.',
    options: ['2×', '4×', 'Sama saja'],
    correct: 1,
    key: 'speed',
    B: { speed: 72 },
    tag: (p, f) => `${f(p.speed)} km/jam`,
    detail: (p, r, f) => `${f(r.force)} N ${r.fails ? '✗ robek' : '✓ aman'}`,
    equation: (A, rA, B, rB, f) =>
      `<span class="a">${f(rA.force)} N</span> × ${f(rB.force / rA.force, 2)} = <span class="b">${f(rB.force)} N</span>`,
    caption: (A, rA, B, rB, f) => `F = ½mv² / s — kecepatan ${f(rB.v0 / rA.v0, 2)}×, gaya ${f(rB.force / rA.force, 2)}×. Sabuk robek pada ${f(A.limit)} N.`,
    verdict: (A, rA, B, rB, f) =>
      `${f(rB.force / rA.force, 2)}×! Gaya sebanding dengan kuadrat kecepatan. A ${rA.fails ? 'robek' : 'aman'}, B ${rB.fails ? 'robek' : 'aman'}.`,
    diagram: 'Diagram gaya pada dummy',
    forces: (p, r) => [
      { dx: -1, dy: 0, value: r.force, label: 'F' },
      { dx: 0, dy: 1, value: p.mass * 10, label: 'F<tspan class="sub" dy="4">g</tspan>' },
    ],
    graph: { label: 'gaya sabuk', unit: 'N', fn: (s, p, r, t) => (t <= r.duration ? r.force : 0), line: (p) => ({ value: p.limit, label: 'sabuk robek' }) },
  },
  worked: (p, r, f) => [
    `v<sub>0</sub> = ${f(p.speed)} × 1000 / 3600 = ${f(r.v0, 3)} m/s`,
    `v² = v<sub>0</sub>² + 2as → 0 = ${f(r.v0 ** 2, 2)} + 2 · a · ${f(p.distance)} → a = ${f(r.acceleration, 2)} m/s²`,
    `F = m · |a| = ${f(p.mass)} × ${f(Math.abs(r.acceleration), 2)} = <b>${f(r.force)} N</b>`,
    r.fails
      ? `${f(r.force)} N ≥ ${f(p.limit)} N → sabuk <b>robek</b> dalam model ini.`
      : `${f(r.force)} N < ${f(p.limit)} N → sabuk <b>tidak robek</b>.`,
    `Lewat energi: usaha sabuk = −½mv<sub>0</sub>² = −${f(r.kinetic)} J, F = ${f(r.kinetic)} / ${f(p.distance)} = ${f(r.force)} N.`,
  ],
  worksheet: {
    question: 'Berapa gaya yang bekerja pada dummy (dan sabuk) pada soal asli?',
    vectors: [
      { key: 'v', label: 'Kecepatan awal v<sub>0</sub>', correct: 'right' },
      { key: 'F', label: 'Gaya sabuk/pengereman F pada dummy', correct: 'left', magnitude: 6000 },
      { key: 'Fg', label: 'Gaya berat dummy F<sub>g</sub>', correct: 'down', magnitude: 600 },
    ],
    directions: ['up', 'down', 'left', 'right'],
    rubric: [
      'Sketsa: mobil bergerak ke kanan (v = 10 m/s) menuju dinding, berhenti dalam 0,5 m.',
      'Dummy di dalam mobil memakai sabuk pengaman.',
      'Diagram vektor: v<sub>0</sub> ke kanan, gaya pengereman ke kiri, gaya berat ke bawah.',
      'Perhitungan v<sub>0</sub> = 10 m/s, a = −100 m/s², F = 6.000 N, dibandingkan dengan 7.000 N.',
    ],
    reflection: 'Mengapa zona remuk (crumple zone) yang memperpanjang jarak berhenti membuat penumpang lebih aman? Ubah jarak pengereman untuk menguji jawabanmu.',
  },
};
