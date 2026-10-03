// The geometry and the tick-by-tick behaviour of a clock escapement, with no drawing in it.
// Nothing here is scripted: the escape wheel is pushed forward by the gear train and is stopped
// only when one of its tooth tips meets a pallet. Locking, impulse, drop and recoil all fall out
// of the shapes below, so the 3D model (built from the same shapes) can't get the order wrong.
//
// Layout (seen from the dial side): the 30-tooth escape wheel turns clockwise, its centre at the
// origin. The pallet arbor sits straight above it at a distance of R·√2, so the two pallets span
// 7.5 tooth spaces (90°) and a line from the arbor to each pallet is tangent to the wheel: the
// classic Graham layout for a seconds pendulum (Britten, Watch and Clock Makers' Handbook;
// Rawlings, The Science of Clocks and Watches). Teeth meet the ENTRY pallet on the left first and
// leave by the EXIT pallet on the right.
//
// Pallets are described in polar coordinates (r, psi) about the pallet arbor, psi measured
// anticlockwise from +x, in the anchor's own frame:
//   entry pallet body: psi <= pe(r)    (it reaches down into the wheel as the anchor turns anticlockwise)
//   exit pallet body:  psi >= px(r)
// Deadbeat (Towneley c. 1675, perfected and popularised by Graham c. 1715): each pallet is a slice of a ring centred on the arbor. Its curved
//   faces are the locking faces: the tooth rests on them and, because they are concentric with the
//   arbor, the wheel stands dead still while the pendulum finishes its swing. The slanted end is
//   the impulse face.
// Anchor (recoil, c. 1657-70): the slanted face carries on outward and there is no concentric
//   locking face, so the tooth lands on the slope and the pendulum, still swinging, shoves the
//   wheel backwards a little: the recoil.
export const DEG = Math.PI / 180, TAU = Math.PI * 2;
export const ESC_TEETH = 30;

export function escapementModel(type = 'deadbeat', R = 1) {
  const N = ESC_TEETH, pitch = TAU / N;
  const d = Math.SQRT2 * R;                       // wheel centre to pallet arbor
  const w = R * 5 * DEG;                          // pallet thickness: half a tooth space (6°) less 1° of drop
  const ri = R - w / 2, ro = R + w / 2;
  // lift: how far the anchor turns while a tooth slides across one impulse face.
  // Real regulators use about 2° of lift and 1° of lock (Britten); drawn a little larger here to be seen.
  const c = type === 'recoil'
    ? { lift: 5 * DEG, psi1: 222.5 * DEG, psi2: 317.5 * DEG, ext: 0.075 * R, band: 9 * DEG, amp: 4.5 * DEG }
    : { lift: 3 * DEG, psi1: 223.8 * DEG, psi2: 316.2 * DEG, ext: 0, band: 22 * DEG, amp: 4 * DEG };
  const entry = { r0: ri, r1: ro + c.ext }, exit = { r0: ri - c.ext, r1: ro };
  const pe = (r) => c.psi1 + (c.lift * (ro - r)) / w;      // end face of the entry pallet
  const px = (r) => c.psi2 - (c.lift * (r - ri)) / w;      // end face of the exit pallet
  const base = 135 * DEG + 0.02;                           // tooth 0 starts just short of the entry pallet

  // Is the point (x, y), given from the wheel centre, inside a pallet when the anchor is at alpha?
  // Returns 0 (no), 1 (entry pallet) or 2 (exit pallet).
  function inside(x, y, alpha) {
    const dx = x, dy = y - d, r = Math.hypot(dx, dy);
    let psi = Math.atan2(dy, dx) - alpha; if (psi < 0) psi += TAU;
    if (r >= entry.r0 && r <= entry.r1) { const e = pe(r); if (psi <= e && psi >= e - c.band) return 1; }
    if (r >= exit.r0 && r <= exit.r1) { const e = px(r); if (psi >= e && psi <= e + c.band) return 2; }
    return 0;
  }
  // Does any tooth tip sit inside a pallet when the wheel has advanced phi and the anchor is at alpha?
  const tip = [0, 0];                              // the tooth tip that last touched a pallet
  function hit(phi, alpha) {
    for (const near of [135 * DEG, 45 * DEG]) {
      const i0 = Math.round((near - base + phi) / pitch);
      for (let i = i0 - 1; i <= i0 + 1; i++) {
        const a = base - phi + i * pitch, h = inside(R * Math.cos(a), R * Math.sin(a), alpha);
        if (h) { tip[0] = R * Math.cos(a); tip[1] = R * Math.sin(a); return h; }
      }
    }
    return 0;
  }

  const STEP = 0.01 * DEG, VMAX = 250 * DEG;     // the freed wheel is drawn turning at 250° a second
  const st = { phi: 0, alpha: 0, v: 0, contact: 0, phase: 'drop', ticks: 0, recoil: 0, lastTick: 0, landed: 0 };
  // Move the anchor to alpha and let dt seconds pass. The train always pushes the wheel forward.
  function step(alpha, dt) {
    const phi0 = st.phi;
    st.alpha = alpha;
    let n = 0, h = hit(st.phi, alpha);
    if (h) {                                      // a pallet has moved into a tooth: the wheel is pushed back
      while (h && n++ < 2000) { st.phi -= STEP; const g = hit(st.phi, alpha); if (g) h = g; else break; }
      st.contact = h;
    } else {
      const steps = Math.floor((VMAX * dt) / STEP);
      st.contact = 0;
      for (let k = 0; k < steps; k++) {
        const g = hit(st.phi + STEP, alpha);
        if (g) { st.contact = g; break; }
        st.phi += STEP;
      }
    }
    // Smooth the wheel's speed over about 20 ms so the phase name doesn't flicker between steps.
    const landed = st.contact && st.contact !== st.lastTick;
    if (landed) { st.ticks++; st.lastTick = st.contact; st.landed = st.phi; st.recoil = 0; st.v = 0; }
    else if (dt > 0) st.v += ((st.phi - phi0) / dt - st.v) * (1 - Math.exp(-dt / 0.02));
    const fast = Math.abs(st.v) > (st.phase === 'lock' ? 3 : 1) * DEG;       // a little hysteresis
    st.phase = !st.contact ? 'drop' : !fast ? 'lock' : st.v > 0 ? 'impulse' : 'recoil';
    if (st.contact) st.recoil = Math.max(st.recoil, st.landed - st.phi);
    return st;
  }
  // Put the wheel somewhere sensible after a jump in time: back it out of the pallets.
  function settle(alpha) {
    let n = 0; while (hit(st.phi, alpha) && n++ < 4000) st.phi -= STEP;
    n = 0; while (!hit(st.phi + STEP, alpha) && n++ < 4000) st.phi += STEP;
    st.alpha = alpha; st.v = 0; st.contact = st.lastTick = hit(st.phi + STEP, alpha); st.landed = st.phi; st.phase = 'lock';
  }

  return { type, N, R, d, w, ri, ro, pitch, base, cfg: c, entry, exit, pe, px, inside, hit, step, settle, tip, state: st };
}
