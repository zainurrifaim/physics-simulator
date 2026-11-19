import { sig } from '../format.js';

/** Height reached on a failed run: 3 significant figures, and never printed as the target itself. */
const reachedText = (p, r, f) => (sig(r.reached) >= p.height ? `< ${f(p.height)}` : f(sig(r.reached), 3));

export default {
  id: 'derek',
  interaction: { handles: ['height'], load: 'mass', increment: 50, hint: 'Tambahkan balok dengan + atau −. Seret penanda untuk mengatur tinggi angkat.' },
  number: '02',
  short: 'Derek',
  title: 'Derek Pengangkat',
  category: 'Usaha & Daya',
  tags: ['Daya', 'Usaha'],
  minutes: 15,
  problem:
    'Kekuatan derek (crane) adalah 20 kW. Derek digunakan untuk mengangkat kotak bermassa 200 kg dalam 50 detik. Jarak benda dari lantai adalah 15 m. Apakah derek mampu mengangkat kotak tersebut? (g = 10 m/s²)',
  preset: { mass: 200, height: 15, time: 50, power: 20000, capacity: 12000 },
  fields: [
    { key: 'mass', label: 'Massa kotak', symbol: 'm', unit: 'kg', min: 50, max: 10000, step: 50 },
    { key: 'height', label: 'Tinggi angkat', symbol: 'h', unit: 'm', min: 2, max: 30, step: 1 },
    { key: 'time', label: 'Waktu yang diminta', symbol: 't', unit: 's', min: 5, max: 120, step: 1 },
    { key: 'power', label: 'Daya derek', symbol: 'P', unit: 'W', min: 500, max: 50000, step: 500 },
    { key: 'capacity', label: 'Batas massa yang bisa diangkat', symbol: 'm<sub>maks</sub>', unit: 'kg', min: 500, max: 20000, step: 500 },
  ],
  formula: 'W = F · s &nbsp;&nbsp; P = W / t',
  assumptions:
    'Derek menggunakan seluruh dayanya untuk mengangkat peti. Peti naik dengan kecepatan tetap, sehingga gaya tarik tali sama dengan gaya berat. Usaha bergantung pada massa dan tinggi. Daya menentukan seberapa cepat usaha itu dilakukan. Jika daya kurang, peti tetap naik tetapi belum mencapai tujuan saat waktu habis. Batas massa adalah pengaturan tambahan pada simulasi. Peti yang melebihi batas ini tetap di lantai. Percepatan singkat ketika mulai dan berhenti diabaikan.',
  compare: {
    question: 'Peti mana yang sampai ke atas dalam 50 detik?',
    sub: 'Kedua derek memiliki daya 20 kW. Tinggi tujuan 15 m.',
    experimentQuestion: () => 'Peti mana yang mencapai tinggi tujuan tepat waktu?',
    context: (A, B, f) => A.height === B.height && A.time === B.time && A.power === B.power
      ? `Tinggi tujuan ${f(A.height)} m dalam ${f(A.time)} detik. Daya tiap derek ${f(A.power / 1000)} kW.`
      : `A menuju ${f(A.height)} m dalam ${f(A.time)} detik dengan daya ${f(A.power / 1000)} kW. B menuju ${f(B.height)} m dalam ${f(B.time)} detik dengan daya ${f(B.power / 1000)} kW.`,
    options: ['Keduanya mampu', 'Hanya A', 'Hanya B', 'Tidak ada'],
    correct: 1,
    key: 'mass',
    B: { mass: 10000 },
    tag: (p, f) => `Peti ${f(p.mass)} kg`,
    detail: (p, r, f) => (r.overload ? `Peti melebihi batas ${f(p.capacity)} kg. Tidak terangkat.` : r.ok ? `Mencapai ${f(p.height)} m dalam ${f(p.time)} detik.` : `Waktu habis. Peti baru mencapai ${reachedText(p, r, f)} m.`),
    equation: (A, rA, B, rB, f) =>
      `<span class="a">${f(rA.required)} W</span> ≤ ${f(A.power)} W ${rB.ok ? '≥' : '&lt;'} <span class="b">${f(rB.required)} W</span>`,
    caption: (A, rA, B, rB, f) => `P = W / t = m · g · h / t — dengan waktu yang sama, massa ${f(B.mass / A.mass)}× butuh daya ${f(rB.required / rA.required)}×`,
    verdict: (A, rA, B, rB, f) =>
      rA.ok && !rB.ok ? `Hanya A sampai tepat waktu. Peti B membutuhkan daya ${f(rB.required)} W. Dengan daya ${f(B.power)} W, peti B baru mencapai ${reachedText(B, rB, f)} m ketika waktu habis.` : rA.ok && rB.ok ? 'Kedua peti sampai tepat waktu.' : 'Bandingkan daya yang dibutuhkan dengan daya tersedia dan batas massa tiap derek.',
    diagram: 'Diagram gaya pada peti',
    // overload: the hoist pulls with its maximum force and the ground supplies the rest (crate stays put)
    forces: (p, r) => r.overload
      ? [
          { dx: 0, dy: -1, value: r.maxForce, label: 'T<tspan class="sub" dy="4">maks</tspan>' },
          { dx: 0, dy: -1, value: r.weight - r.maxForce, label: 'N', ox: 22, oy: 9 },
          { dx: 0, dy: 1, value: r.weight, label: 'F<tspan class="sub" dy="4">g</tspan>' },
        ]
      : [
          { dx: 0, dy: -1, value: r.weight, label: 'T' },
          { dx: 0, dy: 1, value: r.weight, label: 'F<tspan class="sub" dy="4">g</tspan>' },
        ],
    graph: { label: 'usaha oleh derek', unit: 'J', fn: (s) => s.potential, line: (p) => ({ value: p.mass * 10 * p.height, label: 'usaha sampai atas' }) },
  },
  worked: (p, r, f) => [
    `F<sub>g</sub> = m · g = ${f(p.mass)} × 10 = ${f(r.weight)} N`,
    `W<sub>butuh</sub> = F · s = ${f(r.weight)} × ${f(p.height)} = ${f(r.work)} J`,
    `P<sub>butuh</sub> = W / t = ${f(r.work)} / ${f(p.time)} = <b>${f(r.required)} W</b>`,
    r.ok
      ? `P<sub>derek</sub> = ${f(p.power)} W ≥ ${f(r.required)} W → derek <b>mampu</b>.`
      : r.overload
        ? `F<sub>maks</sub> = m<sub>maks</sub> · g = ${f(p.capacity)} × 10 = ${f(r.maxForce)} N < berat ${f(r.weight)} N → kotak <b>tidak terangkat</b>; usaha yang benar-benar dilakukan = 0 J (s = 0).`
        : `P<sub>derek</sub> = ${f(p.power)} W < ${f(r.required)} W → v maks = P / (m g) = ${f(sig(r.speed), 3)} m/s, dalam ${f(p.time)} s hanya naik ${reachedText(p, r, f)} m (butuh ${f(r.minTime, 2)} s).`,
  ],
  worksheet: {
    question: 'Berapa daya yang dibutuhkan untuk mengangkat kotak pada soal asli?',
    vectors: [
      { key: 'Fg', label: 'Gaya berat F<sub>g</sub>', correct: 'down', magnitude: 2000 },
      { key: 'T', label: 'Gaya angkat (tegangan tali) T', correct: 'up', magnitude: 2000, magnitudeMin: true, minHint: 'gaya angkat harus sama atau lebih besar dari berat kotak (2.000 N) agar kotak naik' },
      { key: 's', label: 'Perpindahan s', correct: 'up' },
    ],
    directions: ['up', 'down', 'left', 'right'],
    rubric: [
      'Sketsa: derek di atas, kotak di bawah, ketinggian 15 m.',
      'Label: P = 20 kW = 20.000 W, m = 200 kg, t = 50 s, h = 15 m.',
      'Diagram vektor: F<sub>g</sub> ke bawah (2.000 N), gaya angkat ke atas (≥ 2.000 N; tepat 2.000 N jika kecepatan tetap), s ke atas (15 m).',
      'Perhitungan W = 30.000 J, P = 600 W, lalu dibandingkan dengan 20.000 W.',
    ],
    reflection: 'Usaha dan daya sama-sama berhubungan dengan energi. Apa bedanya? Gunakan hasil eksperimenmu saat mengubah waktu angkat.',
  },
};
