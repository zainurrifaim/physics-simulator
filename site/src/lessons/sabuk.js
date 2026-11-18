export default {
  id: 'sabuk',
  interaction: { handles: ['speed', 'distance'], hint: 'Seret penanda kecepatan awal atau jarak berhenti untuk mengubah percobaan.' },
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
    { key: 'distance', label: 'Jarak berhenti (zona remuk)', symbol: 's', unit: 'm', min: 0.1, max: 1, step: 0.05 },
    { key: 'mass', label: 'Massa boneka uji tabrak', symbol: 'm', unit: 'kg', min: 20, max: 120, step: 1 },
    { key: 'limit', label: 'Kekuatan sabuk', symbol: 'F<sub>maks</sub>', unit: 'N', min: 1000, max: 30000, step: 500 },
    { key: 'carMass', label: 'Massa mobil', symbol: 'M', unit: 'kg', min: 500, max: 3000, step: 50 },
  ],
  formula: 'v² = v<sub>0</sub>² + 2as &nbsp;&nbsp; F = m · a',
  assumptions:
    'Boneka uji tabrak disebut dummy pada soal asli. Mobil mulai menabrak pada waktu nol dan melambat secara tetap selama jarak berhenti. Sabuk menarik boneka ke belakang, sedangkan kursi menopangnya ke atas. Kebutuhan gaya dihitung dari massa boneka, kecepatan awal dan jarak berhenti. Massa mobil tidak masuk ke perhitungan gaya pada boneka. Jika kebutuhan gaya mencapai batas kekuatan sabuk, sabuk langsung robek. Boneka kemudian terus maju hingga mengenai dasbor 0,45 m di depannya. Gesekan kursi diabaikan. Gaya yang dihitung adalah gaya rata-rata selama perlambatan.',
  compare: {
    question: 'Kecepatan dua kali lipat. Berapa kali lipat gaya yang dibutuhkan sabuk?',
    sub: 'Jarak berhenti kedua mobil 0,5 m. Boneka uji tabrak (dummy) bermassa 60 kg.',
    experimentQuestion: () => 'Cukup kuatkah sabuk menahan boneka uji tabrak?',
    context: (A, B, f) => A.distance === B.distance && A.mass === B.mass && A.limit === B.limit
      ? `Jarak berhenti ${f(A.distance)} m. Massa boneka ${f(A.mass)} kg. Batas gaya sabuk ${f(A.limit)} N.`
      : `A berhenti dalam ${f(A.distance)} m, boneka ${f(A.mass)} kg, batas sabuk ${f(A.limit)} N. B berhenti dalam ${f(B.distance)} m, boneka ${f(B.mass)} kg, batas sabuk ${f(B.limit)} N.`,
    options: ['Dua kali lipat', 'Empat kali lipat', 'Tetap sama'],
    correct: 1,
    key: 'speed',
    B: { speed: 72 },
    tag: (p, f) => `Kecepatan awal ${f(p.speed)} km/jam`,
    detail: (p, r, f) => (r.fails ? `Sabuk robek. Gaya yang dibutuhkan ${f(r.force, 0)} N.` : `Sabuk menahan boneka. Gaya yang dibutuhkan ${f(r.force, 0)} N.`),
    equation: (A, rA, B, rB, f) =>
      `F<sub>butuh</sub>: <span class="a">${f(rA.force, 0)} N</span> × ${f(rB.force / rA.force, 2)} = <span class="b">${f(rB.force, 0)} N</span>`,
    caption: (A, rA, B, rB, f) => `F<sub>butuh</sub> = ½mv² / s — kecepatan ${f(rB.v0 / rA.v0, 2)}×, gaya yang dibutuhkan ${f(rB.force / rA.force, 2)}×. Sabuk hanya kuat sampai ${f(A.limit)} N.`,
    verdict: (A, rA, B, rB, f) =>
      `Pada massa dan jarak berhenti yang sama, kecepatan dua kali lipat membutuhkan gaya empat kali lipat. Sabuk A ${rA.fails ? 'robek' : 'tetap utuh'}. Sabuk B ${rB.fails ? `robek karena kebutuhan gaya ${f(rB.force)} N melebihi batas ${f(B.limit)} N. Setelah robek, sabuk berhenti menarik boneka` : 'tetap utuh'}.`,
    diagram: 'Diagram gaya pada boneka uji tabrak',
    // while braking; a torn belt exerts no force (the dummy slides freely until the dashboard)
    forces: (p, r) => [
      { dx: -1, dy: 0, value: r.fails ? 0 : r.force, label: r.fails ? 'F<tspan class="sub" dy="4">sabuk</tspan> (robek)' : 'F<tspan class="sub" dy="4">sabuk</tspan>' },
      { dx: 0, dy: -1, value: p.mass * 10, label: 'N' },
      { dx: 0, dy: 1, value: p.mass * 10, label: 'F<tspan class="sub" dy="4">g</tspan>' },
    ],
    graph: { label: 'gaya yang dibutuhkan untuk menahan dummy', unit: 'N', fn: (s, p, r, t) => (t > 0 && t < r.carStop ? r.force : 0), line: (p) => ({ value: p.limit, label: 'sabuk robek' }) },
  },
  worked: (p, r, f) => {
    const signed = (v, d) => f(v, d).replace('-', '−');
    return [
      `v<sub>0</sub> = ${f(p.speed)} × 1000 / 3600 = ${f(r.v0, 3)} m/s`,
      `v² = v<sub>0</sub>² + 2as → 0 = ${f(r.v0 ** 2, 2)} + 2 · a · ${f(p.distance)} → a = ${signed(r.acceleration, 2)} m/s²`,
      `F<sub>butuh</sub> = m · |a| = ${f(p.mass)} × ${f(Math.abs(r.acceleration), 2)} = <b>${f(r.force, 0)} N</b>`,
      `Lewat energi: usaha yang harus dilakukan sabuk = −½mv<sub>0</sub>² = −${f(r.kinetic, 0)} J, F<sub>butuh</sub> = ${f(r.kinetic, 0)} / ${f(p.distance)} = ${f(r.force, 0)} N.`,
      r.fails
        ? `${f(r.force, 0)} N ≥ ${f(p.limit)} N → sabuk <b>robek</b> seketika. Dummy tetap bergerak ${f(r.v0, 1)} m/s dan membentur dasbor setelah ${f(r.hitTime * 1000, 0)} ms dengan kecepatan relatif ${f(r.impactSpeed, 1)} m/s.`
        : `${f(r.force, 0)} N < ${f(p.limit)} N → sabuk <b>tidak robek</b>.`,
    ];
  },
  worksheet: {
    question: 'Berapa gaya yang bekerja pada dummy (dan sabuk) pada soal asli?',
    vectors: [
      { key: 'v', label: 'Kecepatan awal v<sub>0</sub>', correct: 'right' },
      { key: 'F', label: 'Gaya sabuk/pengereman F pada dummy', correct: 'left', magnitude: 6000 },
      { key: 'Fg', label: 'Gaya berat dummy F<sub>g</sub>', correct: 'down', magnitude: 600 },
      { key: 'N', label: 'Gaya normal kursi N', correct: 'up', magnitude: 600 },
    ],
    directions: ['up', 'down', 'left', 'right'],
    rubric: [
      'Sketsa: mobil bergerak ke kanan (v = 10 m/s) menuju dinding, berhenti dalam 0,5 m.',
      'Dummy di dalam mobil memakai sabuk pengaman.',
      'Diagram vektor: v<sub>0</sub> ke kanan, gaya sabuk ke kiri, gaya berat ke bawah, gaya normal kursi ke atas.',
      'Perhitungan v<sub>0</sub> = 10 m/s, a = −100 m/s², F = 6.000 N, dibandingkan dengan 7.000 N.',
    ],
    reflection: 'Mengapa zona remuk (crumple zone) yang memperpanjang jarak berhenti membuat penumpang lebih aman? Ubah jarak berhenti untuk menguji jawabanmu.',
  },
};
