// Live readouts under each experiment scene: the numbers come from the same sampled state
// that is drawn, so the text changes frame by frame with the animation.
// (p: parameters, r: solve result, s: sample at the current time, f: number formatter)

export const live = {
  angkat: (p, r, s, f) =>
    `Tinggi barbel ${f(s.position, 2)} m${{ struggle: ' · Energi habis', drop: ' · Barbel jatuh', dropped: ' · Barbel kembali ke lantai', hold: ' · Tinggi tujuan tercapai' }[s.phase] ?? ''}`,
  derek: (p, r, s, f) =>
    `Tinggi peti ${f(s.position, 2)} m${{ stall: ' · Melebihi batas massa derek', timeout: ' · Waktu habis', arrived: ' · Sampai ke tujuan' }[s.phase] ?? ''}`,
  lift: (p, r, s, f) =>
    `Ketinggian lift ${f(s.position, 2)} m${s.t <= 0 ? '' : { overspeed: ' · Rem mesin kurang kuat', braking: ' · Rem darurat aktif', stopped: ' · Lift berhenti', buffer: ' · Mengenai peredam di dasar', arrived: ' · Sampai ke tujuan' }[s.phase] ?? ''}`,
  sabuk: (p, r, s, f) =>
    `Kecepatan mobil ${f(s.speed * 3.6, 1)} km/jam${{ torn: ' · Sabuk robek', impact: ' · Boneka membentur dasbor', stopped: ' · Sabuk menahan boneka', braking: ' · Mobil melambat' }[s.phase] ?? ''}`,
  sepeda: (p, r, s, f) =>
    `Kecepatan ${f(s.speed, 1)} m/s${s.phase === 'arrived' ? ` · Sampai dalam ${f(r.duration, 2)} detik` : ''}`,
};
