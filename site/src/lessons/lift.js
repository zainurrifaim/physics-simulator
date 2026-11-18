export default {
  id: 'lift',
  interaction: { handles: ['top', 'bottom'], load: 'payload', increment: 50, hint: 'Tambahkan muatan dengan + atau −. Seret penanda lantai awal dan akhir.' },
  number: '03',
  short: 'Lift',
  title: 'Lift dan Muatan',
  category: 'Daya & Energi',
  tags: ['Daya', 'Energi potensial'],
  minutes: 18,
  problem:
    'Lift bergerak turun dari ketinggian 30 m ke 5 m di atas lantai dalam waktu 100 s. Jika daya lift adalah 10.000 W dan massa lift adalah 2.500 kg, berapakah berat maksimum yang dapat dimuat oleh lift? (g = 10 m/s²)',
  preset: { cabin: 2500, payload: 1500, top: 30, bottom: 5, time: 100, power: 10000 },
  fields: [
    { key: 'cabin', label: 'Massa kabin', symbol: 'm<sub>lift</sub>', unit: 'kg', min: 500, max: 5000, step: 100 },
    { key: 'payload', label: 'Massa muatan', symbol: 'm<sub>muatan</sub>', unit: 'kg', min: 0, max: 5000, step: 50 },
    { key: 'top', label: 'Ketinggian awal', symbol: 'h<sub>1</sub>', unit: 'm', min: 10, max: 40, step: 1 },
    { key: 'bottom', label: 'Ketinggian akhir', symbol: 'h<sub>2</sub>', unit: 'm', min: 0, max: 9, step: 1 },
    { key: 'time', label: 'Waktu turun', symbol: 't', unit: 's', min: 20, max: 200, step: 5 },
    { key: 'power', label: 'Daya maksimum lift', symbol: 'P', unit: 'W', min: 2000, max: 30000, step: 500 },
  ],
  formula: 'P = F · v &nbsp;&nbsp; v = s / t',
  assumptions:
    'Model pengajaran: lift tanpa beban penyeimbang turun dengan kecepatan tetap. Gaya penahan (tali/motor) ke atas sama dengan berat total dan melakukan usaha negatif. Daya P (soal asli: 10.000 W) dianggap sebagai laju maksimum mesin menyerap energi yang dilepaskan gravitasi. Pengendali memaksa kecepatan normal v = s / t sejak awal; lift berat yang turun lebih lambat (v ≤ P / (m g)) sebenarnya tetap aman, tetapi tidak tiba dalam waktu t. Bila muatan terlalu berat, rem hanya mampu memberi gaya P / v sehingga lift makin cepat; pembatas kecepatan memicu rem darurat pada 115% kecepatan normal dan kabin berhenti. Batas struktur lain diabaikan — hasilnya bukan kapasitas resmi lift sungguhan.',
  compare: {
    question: 'Lift turun 25 m dalam 100 s, daya maksimum 10 kW. Muatan 1.500 kg atau 2.500 kg?',
    sub: 'Kabin 2.500 kg turun dengan kecepatan tetap; mesin menyerap energi yang dilepaskan gravitasi. g = 10 m/s².',
    options: ['Keduanya aman', 'Hanya A', 'Hanya B', 'Tidak ada'],
    correct: 1,
    key: 'payload',
    B: { payload: 2500 },
    tag: (p, f) => `muatan ${f(p.payload)} kg`,
    detail: (p, r, f) => (r.ok ? `${f(r.absorbed)} W ✓` : `${f(r.absorbed)} W ✗ · ${r.outcome === 'safety' ? `rem darurat di ${f(r.stopHeight, 1)} m` : 'menghantam peredam'}`),
    equation: (A, rA, B, rB, f) =>
      `<span class="a">${f(rA.absorbed)} W</span> ${rA.ok ? '≤' : '&gt;'} ${f(A.power)} W ${rB.ok ? '≥' : '&lt;'} <span class="b">${f(rB.absorbed)} W</span>`,
    caption: (A, rA, B, rB, f) => `P = m<sub>total</sub> · g · v, v = ${f(rA.speed, 2)} m/s — muatan maksimum ${f(Math.max(0, rA.maxPayload))} kg = ${f(rA.maxPayloadWeight)} N`,
    verdict: (A, rA, B, rB, f) =>
      rA.ok && !rB.ok ? `Hanya A. Muatan maksimum tepat ${f(rA.maxPayload)} kg (${f(rA.maxPayloadWeight)} N); B butuh ${f(rB.absorbed)} W.` : rA.ok && rB.ok ? 'Keduanya aman.' : 'Daya lift terlampaui.',
    diagram: 'Diagram gaya pada kabin',
    // the brake can supply at most P / v: an overloaded cabin is NOT in equilibrium
    forces: (p, r) => [
      { dx: 0, dy: -1, value: Math.min(r.weight, p.power / r.speed), label: r.ok ? 'T' : 'T = P/v' },
      { dx: 0, dy: 1, value: r.weight, label: 'F<tspan class="sub" dy="4">g</tspan>' },
    ],
    graph: { label: 'laju turun', unit: 'm/s', fn: (s) => s.speed, line: (p) => ({ value: (p.top - p.bottom) / p.time, label: 'kecepatan normal' }) },
  },
  worked: (p, r, f) => [
    `s = ${f(p.top)} − ${f(p.bottom)} = ${f(r.drop)} m (ke bawah), v = s / t = ${f(r.drop)} / ${f(p.time)} = ${f(r.speed, 4)} m/s`,
    `Cara kunci jawaban: energi yang boleh diserap mesin selama t adalah W = P · t = ${f(p.power * p.time)} J. Energi itu sama dengan energi potensial yang dilepas, F · s, jadi F = W / s = ${f(p.power * p.time)} / ${f(r.drop)} = ${f(r.maxTotalMass * 10)} N`,
    `Cara setara: P = F · v → F = P / (s / t) = ${f(p.power)} × ${f(p.time)} / ${f(r.drop)} = ${f(r.maxTotalMass * 10)} N. Usaha gaya penahan bernilai negatif (gaya ke atas, gerak ke bawah).`,
    `m<sub>total</sub> = F / g = ${f(r.maxTotalMass)} kg → m<sub>muatan</sub> = ${f(r.maxTotalMass)} − ${f(p.cabin)} = ${f(r.maxPayload)} kg`,
    r.maxPayload >= 0
      ? `Berat muatan maksimum = ${f(Math.max(0, r.maxPayload))} × 10 = <b>${f(r.maxPayloadWeight)} N</b>`
      : 'Bahkan kabin kosong sudah melampaui daya maksimum dalam model ini.',
    `Muatan sekarang ${f(p.payload)} kg: daya yang harus diserap ${f(r.absorbed)} W → ${r.ok ? 'masih aman' : '<b>melebihi batas</b>'}.`,
  ],
  worksheet: {
    question: 'Berapa berat (gaya berat) maksimum muatan lift pada soal asli?',
    vectors: [
      { key: 'Fg', label: 'Gaya berat total F<sub>g</sub> (kabin + muatan maks.)', correct: 'down', magnitude: 40000 },
      { key: 's', label: 'Perpindahan s', correct: 'down' },
    ],
    directions: ['up', 'down', 'left', 'right'],
    rubric: [
      'Sketsa posisi awal: lift di ketinggian 30 m; posisi akhir: 5 m.',
      'Perpindahan s = 30 − 5 = 25 m ke bawah.',
      'Diagram vektor: gaya berat total ke bawah, perpindahan ke bawah (25 m), label P, t, m<sub>lift</sub>.',
      'Perhitungan W = 1.000.000 J, F = 40.000 N, m<sub>total</sub> = 4.000 kg, muatan 1.500 kg = 15.000 N.',
    ],
    reflection: 'Mengapa lift yang turun lebih lambat dapat membawa muatan lebih besar dalam model ini? Uji dengan mengubah waktu turun.',
  },
};
