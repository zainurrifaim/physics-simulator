// Live readouts under each experiment scene: the numbers come from the same sampled state
// that is drawn, so the text changes frame by frame with the animation.
// (p: parameters, r: solve result, s: sample at the current time, f: number formatter)

export const live = {
  angkat: (p, r, s, f) =>
    `h = ${f(s.position, 2)} m · Eₚ = ${f(s.potential, 0)} J${s.phase === 'drop' ? ` · Eₖ = ${f(s.kinetic, 0)} J (jatuh)` : ''} · energi terpakai ${f(s.athleteWork, 0)} / ${f(p.energy)} J`,
  derek: (p, r, s, f) =>
    `t = ${f(s.t, 1)} s · h = ${f(s.position, 1)} m · P = ${f(s.power, 0)} / ${f(p.power)} W`,
  lift: (p, r, s, f) =>
    `h = ${f(s.position, 2)} m · v = ${f(s.speed, 3)} m/s · daya rem mesin ${f(s.drivePower, 0)} / ${f(p.power)} W${{ overspeed: ' · rem mesin kurang kuat, makin cepat', braking: ' · rem darurat menahan', stopped: ' · rem darurat aktif, kabin berhenti', buffer: ' · menghantam peredam' }[s.phase] ?? ''}`,
  sabuk: (p, r, s, f) =>
    `t = ${f(s.t * 1000, 0)} ms · v mobil ${f(s.speed, 1)} m/s · v dummy ${f(s.dummySpeed, 1)} m/s${s.beltIntact ? ` · F sabuk ${f(s.beltForce, 0)} N` : ' · sabuk robek'}`,
  sepeda: (p, r, s, f) =>
    `t = ${f(s.t, 1)} s · v = ${f(s.speed, 1)} m/s · E${'ₚ'} + E${'ₖ'} = ${f(s.potential, 0)} + ${f(s.kinetic, 0)} = ${f(s.potential + s.kinetic, 0)} J`,
};
