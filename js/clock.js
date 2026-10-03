// The parts of a pendulum clock, shared by ClockClear's chapters: gears that really mesh,
// the escape wheel and pallets (drawn from the same shapes escapement.js collides), the
// going train between its plates, the motion work, the dial and hands, weight and pendulum.
// Lengths are in centimetres; the dial faces +z, so "clockwise" is a negative rotation about z.
import { THREE, M, canvasTexture } from './kit.js';
import { escapementModel, DEG, TAU } from './escapement.js';

export { DEG, TAU };

// ---------------------------------------------------------------- the numbers
// The classic English eight-day train for a seconds pendulum: great wheel 96 driving a centre
// pinion of 8, centre wheel 60 into a third pinion of 8, third wheel 56 into an escape pinion of 7,
// escape wheel 30. These are the counts usually quoted for the 'standard' English longcase train
// (Britten's Watch & Clock Maker's Handbook); makers varied them, e.g. a British Museum eight-day
// movement (1958,1006.2100) has 96, 70/8, 48/7, 30. Either way the ratios must multiply out the same:
//   centre arbor: once an hour.  escape wheel: 60/8 × 56/7 = 60 turns an hour, once a minute.
//   30 teeth × 2 beats each = 60 beats a minute: a one-second pendulum.
//   great wheel: 96/8 = 12 hours a turn, so 16 turns of the drum run the clock for 8 days.
// Motion work (the usual English layout): cannon wheel 36 → minute wheel 36, whose pinion of 6
// drives the hour wheel of 72: 36/36 × 72/6 = 12.
export const TEETH = { great: 96, centreP: 8, centre: 60, thirdP: 8, third: 56, escP: 7, esc: 30, cannon: 36, minuteW: 36, minuteP: 6, hour: 72 };
export const trainRatios = (t = TEETH) => {
  const g = t.great / t.centreP, c = t.centre / t.thirdP, th = t.third / t.escP;
  return { g, c, th, escPerHour: c * th, beatsPerHour: c * th * t.esc * 2, total: g * c * th, motion: (t.minuteW / t.cannon) * (t.hour / t.minuteP) };
};
// Standard gravity and the seconds pendulum: T = 2π√(L/g) = 2 s gives L = g/π² = 0.9936 m.
export const G0 = 9.80665;
export const SECONDS_PENDULUM = G0 / (Math.PI * Math.PI);
// Period of a real pendulum at any swing: 2π√(L/g) ÷ AGM(1, cos(θ₀/2)) (exact for a point mass).
export function period(L, g, amp = 0) {
  let a = 1, b = Math.cos(amp / 2);
  for (let i = 0; i < 6; i++) { const t = (a + b) / 2; b = Math.sqrt(a * b); a = t; }
  return (TAU * Math.sqrt(L / g)) / a;
}
// The weight and drum of this clock: a 12 lb (5.4 kg) weight on a doubled line (one pulley),
// a 44 mm drum, about 1.1 m of fall in eight days. Typical longcase figures.
export const DRIVE = { massKg: 5.4, dropM: 1.1, drumMm: 44 };

// Where each arbor sits, seen from the front. C: centre (the hands), G: great wheel and drum,
// T3: third wheel, E: escape wheel, A: pallet arbor, MW: minute wheel stud.
const MOD = { great: 0.085, centre: 0.08, third: 0.07, motionA: 0.065, motionB: 0.06 };
const RE = 2.0;                                               // escape wheel radius, to the tooth tips
const E = [0, 4.0], C = [0, 0];
const dCG = (MOD.great * (TEETH.great + TEETH.centreP)) / 2;  // 4.42
const dCT = (MOD.centre * (TEETH.centre + TEETH.thirdP)) / 2; // 2.72
const dTE = (MOD.third * (TEETH.third + TEETH.escP)) / 2;     // 2.205
const t3y = (dCT * dCT - dTE * dTE + E[1] * E[1]) / (2 * E[1]);
export const POS = {
  C, E, RE, G: [0, -dCG], T3: [Math.sqrt(dCT * dCT - t3y * t3y), t3y], A: [0, E[1] + Math.SQRT2 * RE],
  MW: [-2.34 * Math.cos(35 * DEG), -2.34 * Math.sin(35 * DEG)],
  drumR: DRIVE.drumMm / 20,
};
const dir = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]);

export const COL = { brass: 0xd9b25a, brassDark: 0xa98538, steel: 0xb4bcc8, blue: 0x4f6fb5, pallet: 0x8ef0ff, wood: 0x6b4226, woodDark: 0x4a2c17, lead: 0x8d8f96, cream: 0xf3ead6 };

// ---------------------------------------------------------------- small shapes
// A cylinder whose axis runs along z, from z0 to z1.
export function zcyl(r, z0, z1, mat, seg = 28) {
  const g = new THREE.CylinderGeometry(r, r, Math.abs(z1 - z0), seg);
  g.rotateX(Math.PI / 2);
  const m = new THREE.Mesh(g, mat); m.position.z = (z0 + z1) / 2; m.castShadow = true;
  return m;
}
function ringHoles(shape, rIn, rOut, n, sw, phase = 0) {
  if (rOut - rIn < 0.06 || n < 2) return;
  const dO = sw / 2 / rOut, dI = sw / 2 / rIn;
  if (TAU / n - 2 * dI < 0.15) return;
  for (let i = 0; i < n; i++) {
    const a0 = phase + (i * TAU) / n, a1 = a0 + TAU / n, h = new THREE.Path();
    h.absarc(0, 0, rOut, a0 + dO, a1 - dO, false);
    h.absarc(0, 0, rIn, a1 - dI, a0 + dI, true);
    h.closePath();
    shape.holes.push(h);
  }
}
const extrude = (shape, thick) => { const g = new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: false, curveSegments: 10 }); g.translate(0, 0, -thick / 2); return g; };

// A spur gear in the XY plane with N teeth of module m (pitch radius m·N/2). Tooth 0 points along +x.
export function gearGeo(N, m, { thick = 0.22, spokes = 0, hub = 0, rim = 0, sw = 0, add = 1, ded = 1.25 } = {}) {
  const rp = (m * N) / 2, ra = rp + m * add, rf = rp - m * ded, p = TAU / N, sh = new THREE.Shape();
  const prof = [[rf, -0.3], [rp, -0.25], [ra, -0.11], [ra, 0.11], [rp, 0.25], [rf, 0.3]];
  for (let i = 0; i < N; i++) prof.forEach(([r, k], j) => { const a = (i + k) * p, x = r * Math.cos(a), y = r * Math.sin(a); i + j ? sh.lineTo(x, y) : sh.moveTo(x, y); });
  sh.closePath();
  if (spokes) ringHoles(sh, hub || rp * 0.22, rf - (rim || rp * 0.1), spokes, sw || rp * 0.11, p * 0.5);
  return extrude(sh, thick);
}
export function gear(N, m, mat, o = {}) { const g = new THREE.Mesh(gearGeo(N, m, o), mat); g.castShadow = true; g.userData = { N, m, rp: (m * N) / 2 }; return g; }
// The angle gear B must take so its teeth sit in gear A's gaps. A (NA teeth) is at angle thA;
// B (NB teeth) lies in direction `d` from A and turns the other way, NA/NB times as fast.
export const meshAngle = (thA, NA, NB, d) => d + Math.PI + Math.PI / NB - ((thA - d) * NA) / NB;

// ---------------------------------------------------------------- escapement, drawn from the model
export function escapeWheelGeo(model, thick = 0.2) {
  const { R, N, pitch } = model, h = 0.21 * R, sh = new THREE.Shape();
  // Deadbeat teeth lean forward (undercut) so only the tip touches a pallet; recoil teeth lean back.
  const [uf, tw, ub] = model.type === 'recoil' ? [-4.5 * DEG, 0.5 * DEG, 2.2 * DEG] : [2.6 * DEG, 0.5 * DEG, 7.6 * DEG];
  for (let i = 0; i < N; i++) {
    const a = i * pitch;
    [[R - h, a + uf], [R, a], [R, a + tw], [R - h, a + ub]].forEach(([r, t], j) => { const x = r * Math.cos(t), y = r * Math.sin(t); i + j ? sh.lineTo(x, y) : sh.moveTo(x, y); });
  }
  sh.closePath();
  ringHoles(sh, 0.2 * R, R - h - 0.1 * R, 5, 0.1 * R);
  return extrude(sh, thick);
}
function palletShape(model, which) {
  const f = which === 1 ? model.pe : model.px, rr = which === 1 ? model.entry : model.exit, band = model.cfg.band * (which === 1 ? -1 : 1);
  const sh = new THREE.Shape(), n = 14, pts = [];
  for (let i = 0; i <= n; i++) { const r = rr.r0 + ((rr.r1 - rr.r0) * i) / n; pts.push([r, f(r)]); }
  for (let i = n; i >= 0; i--) { const r = rr.r0 + ((rr.r1 - rr.r0) * i) / n; pts.push([r, f(r) + band]); }
  // The curved locking faces need more points than the straight ends.
  const out = [];
  pts.forEach(([r, a], i) => {
    const [r2, a2] = pts[(i + 1) % pts.length]; out.push([r, a]);
    if (Math.abs(a2 - a) > 4 * DEG) for (let k = 1; k < 8; k++) out.push([r + ((r2 - r) * k) / 8, a + ((a2 - a) * k) / 8]);
  });
  out.forEach(([r, a], i) => { const x = r * Math.cos(a), y = r * Math.sin(a); i ? sh.lineTo(x, y) : sh.moveTo(x, y); });
  sh.closePath();
  return sh;
}
// An escape wheel and its anchor. group's origin is the wheel centre; apply() poses both from the model's state.
export function makeEscapementView(type, R = RE, { thick = 0.22, wheelMat, palletMat, armMat } = {}) {
  const model = escapementModel(type, R), group = new THREE.Group();
  const wheel = new THREE.Mesh(escapeWheelGeo(model, thick), wheelMat || M.metal(COL.brass, { roughness: 0.35 })); wheel.castShadow = true;
  const anchor = new THREE.Group(); anchor.position.set(0, model.d, 0);
  const pm = palletMat || M.metal(COL.pallet, { metalness: 0.6, roughness: 0.3 });
  const entry = new THREE.Mesh(extrude(palletShape(model, 1), thick * 1.15), pm), exit = new THREE.Mesh(extrude(palletShape(model, 2), thick * 1.15), pm);
  entry.castShadow = exit.castShadow = true;
  const am = armMat || M.metal(COL.steel, { roughness: 0.4 });
  // The arms run from the arbor to the far end of each pallet.
  const arm = (which) => {
    const rr = which === 1 ? model.entry : model.exit, f = which === 1 ? model.pe : model.px, rm = (rr.r0 + rr.r1) / 2;
    const a = f(rm) + model.cfg.band * (which === 1 ? -1 : 1) * 0.86, hw = 0.06 * R, len = rm + (rr.r1 - rm) * 0.6;
    const sh = new THREE.Shape(); sh.moveTo(0, -hw * 1.4); sh.lineTo(len, -hw); sh.lineTo(len, hw); sh.lineTo(0, hw * 1.4); sh.closePath();
    const m = new THREE.Mesh(extrude(sh, thick * 0.9), am); m.rotation.z = a; m.castShadow = true; return m;
  };
  anchor.add(entry, exit, arm(1), arm(2), zcyl(0.15 * R, -thick * 0.7, thick * 0.7, am));
  group.add(wheel, anchor);
  const apply = () => { wheel.rotation.z = model.base - model.state.phi; anchor.rotation.z = model.state.alpha; };
  model.settle(model.cfg.amp); apply();
  return { group, wheel, anchor, entry, exit, model, apply, type };
}

// ---------------------------------------------------------------- dial and hands
// A plain painted dial: Arabic numerals, a minute track, a small seconds ring below the 12
// and a winding hole above the 6. No maker's name.
export function dialTexture({ seconds = true, wind = true, R = 14 } = {}) {
  return canvasTexture(1024, 1024, (g, w) => {
    const c = w / 2, k = (w / 2) / R;
    g.fillStyle = '#f3ead6'; g.beginPath(); g.arc(c, c, c, 0, TAU); g.fill();
    g.strokeStyle = '#1b1d22'; g.lineWidth = 5; g.beginPath(); g.arc(c, c, c * 0.955, 0, TAU); g.stroke(); g.lineWidth = 3; g.beginPath(); g.arc(c, c, c * 0.885, 0, TAU); g.stroke();
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * TAU, r0 = c * 0.885, r1 = c * 0.955;
      g.lineWidth = i % 5 ? 3 : 9; g.beginPath(); g.moveTo(c + Math.sin(a) * r0, c - Math.cos(a) * r0); g.lineTo(c + Math.sin(a) * r1, c - Math.cos(a) * r1); g.stroke();
    }
    g.fillStyle = '#1b1d22'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '600 96px Georgia, serif';
    for (let i = 1; i <= 12; i++) { const a = (i / 12) * TAU; g.fillText(String(i), c + Math.sin(a) * c * 0.74, c - Math.cos(a) * c * 0.74 + 4); }
    if (seconds) {
      const sy = c - 4.0 * k, sr = 2.45 * k;
      g.fillStyle = '#efe4cb'; g.beginPath(); g.arc(c, sy, sr, 0, TAU); g.fill(); g.lineWidth = 2.5; g.stroke();
      for (let i = 0; i < 60; i++) { const a = (i / 60) * TAU, r0 = sr * (i % 5 ? 0.86 : 0.76); g.lineWidth = i % 5 ? 1.5 : 3; g.beginPath(); g.moveTo(c + Math.sin(a) * r0, sy - Math.cos(a) * r0); g.lineTo(c + Math.sin(a) * sr, sy - Math.cos(a) * sr); g.stroke(); }
      g.fillStyle = '#1b1d22'; g.font = '600 20px Georgia, serif';
      [[60, 0], [15, 1], [30, 2], [45, 3]].forEach(([n, q]) => { const a = (q / 4) * TAU; g.fillText(String(n), c + Math.sin(a) * sr * 0.56, sy - Math.cos(a) * sr * 0.56 + 1); });
    }
    if (wind) { g.fillStyle = '#1b1d22'; g.beginPath(); g.arc(c, c + 4.42 * k, 0.5 * k, 0, TAU); g.fill(); }
  });
}
export function makeDial(R = 14, o = {}) {
  const g = new THREE.Group(), t = dialTexture({ R, ...o });
  const faceMat = new THREE.MeshStandardMaterial({ map: t.tex, roughness: 0.7, transparent: true });
  const face = new THREE.Mesh(new THREE.CircleGeometry(R, 72), faceMat);
  const backMat = M.metal(COL.brassDark, { roughness: 0.6, transparent: true });
  const back = new THREE.Mesh(new THREE.CircleGeometry(R, 72), backMat); back.rotation.y = Math.PI; back.position.z = -0.06;
  const rimMat = M.metal(COL.brass, { transparent: true });
  const rim = new THREE.Mesh(new THREE.TorusGeometry(R, 0.25, 10, 72), rimMat);
  g.add(face, back, rim);
  g.userData.setOpacity = (k) => { [faceMat, backMat, rimMat].forEach((m) => { m.opacity = k; m.depthWrite = k > 0.9; }); };
  return g;
}
// A hand pointing up (+y) from the origin.
export function hand(len, w, mat, { tail = 0.18, thick = 0.08, boss = 0.5 } = {}) {
  const sh = new THREE.Shape();
  sh.moveTo(-w / 2, -tail * len); sh.lineTo(w / 2, -tail * len); sh.lineTo(w * 0.42, len * 0.8); sh.lineTo(0, len); sh.lineTo(-w * 0.42, len * 0.8); sh.closePath();
  const g = new THREE.Group(), m = new THREE.Mesh(extrude(sh, thick), mat); m.castShadow = true;
  g.add(m, zcyl(boss, -thick, thick, mat, 20));
  return g;
}
// Time of day (seconds after 12:00) to hand angles.
export const handAngles = (t) => ({ sec: (-TAU * (t % 60)) / 60, min: (-TAU * (t % 3600)) / 3600, hour: (-TAU * (t % 43200)) / 43200 });
export function clockText(t, withSec = true) {
  t = ((t % 43200) + 43200) % 43200;
  const h = Math.floor(t / 3600) || 12, m = Math.floor((t % 3600) / 60), s = Math.floor(t % 60), p = (n) => String(n).padStart(2, '0');
  return withSec ? `${h}:${p(m)}:${p(s)}` : `${h}:${p(m)}`;
}

// ---------------------------------------------------------------- pendulum
// Origin at the top of the suspension spring; the bob's centre hangs L below it.
export function makePendulum(L, { bobR = 5.5, rodR = 0.28, rodMat, bobMat, z = 0 } = {}) {
  const g = new THREE.Group(), rm = rodMat || M.metal(COL.steel, { roughness: 0.4 }), bm = bobMat || M.metal(COL.brass, { roughness: 0.3 });
  const springM = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.2, 0.05), M.metal(0x9fb3d8)); springM.position.y = -1.1;
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(rodR, rodR, 1, 16), rm); rod.castShadow = true;
  const bob = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 20), bm); bob.castShadow = true;
  const nut = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.7, 12), M.metal(COL.brassDark)); nut.castShadow = true;
  g.add(springM, rod, bob, nut);
  g.position.z = z;
  g.userData.set = (len, r = bobR) => {
    const end = len + r + 2.2;
    rod.scale.y = end - 2; rod.position.y = -(2 + end) / 2;
    bob.scale.set(r, r, r * 0.26); bob.position.y = -len;
    nut.position.y = -len - r - 0.5;
  };
  g.userData.set(L);
  g.userData.bob = bob; g.userData.nut = nut; g.userData.rod = rod;
  return g;
}

// ---------------------------------------------------------------- the whole movement
// The going train between two plates, the motion work and hands in front, the drum, line and
// weight, the anchor, crutch and pendulum behind. Everything turns from one number: phi, how far
// the escape wheel has advanced.
export function makeMovement({ type = 'deadbeat', start = 10 * 3600 + 9 * 60, withPendulum = true, weight = true, dial = true } = {}) {
  const group = new THREE.Group(), teeth = { ...TEETH };
  const brass = M.metal(COL.brass, { roughness: 0.35 }), steel = M.metal(COL.steel, { roughness: 0.35 });
  const Z = { great: 1.2, centre: 2.0, third: 0.5, esc: -1.2, front: 2.6, back: -2.6, motA: 3.05, motB: 3.5, dial: 4.3, pend: -5.6 };
  const arbor = (p, z0, z1, r = 0.16) => { const g = new THREE.Group(); g.position.set(p[0], p[1], 0); g.add(zcyl(r, z0, z1, steel, 16)); return g; };
  const at = (mesh, z) => { mesh.position.z = z; return mesh; };

  // --- going train
  const going = new THREE.Group(); group.add(going);
  const aG = arbor(POS.G, Z.back - 0.3, Z.dial + 0.5, 0.28), aC = arbor(C, Z.back - 0.2, Z.dial + 1.0, 0.17), aT = arbor(POS.T3, Z.back - 0.2, Z.front + 0.2, 0.13), aE = arbor(E, Z.back - 0.2, Z.dial + 0.45, 0.1);
  const great = at(gear(teeth.great, MOD.great, brass, { spokes: 5, hub: 1.0 }), Z.great);
  const drumMat = M.metal(COL.brassDark, { roughness: 0.5 });
  const drum = zcyl(POS.drumR, -2.0, 0.85, drumMat, 40);
  const drumGroup = new THREE.Group(); drumGroup.add(drum);
  for (let i = 0; i < 9; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(POS.drumR + 0.03, 0.07, 6, 40), M.matte(0xe9e2cf)); t.position.z = -1.8 + i * 0.16; drumGroup.add(t); }
  [-2.05, 0.9].forEach((z) => drumGroup.add(zcyl(POS.drumR + 0.3, z - 0.06, z + 0.06, drumMat, 40)));
  const ratchet = at(gear(24, 0.13, steel, { thick: 0.16, add: 1.2, ded: 0.6 }), Z.great + 0.25);
  const winder = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.8), steel); winder.position.z = Z.dial + 0.3;
  aG.add(great, drumGroup, ratchet, winder);
  const centreP = at(gear(teeth.centreP, MOD.great, steel, { thick: 0.5, ded: 1.3 }), Z.great), centreW = at(gear(teeth.centre, MOD.centre, brass, { spokes: 4, hub: 0.45 }), Z.centre);
  aC.add(centreP, centreW);
  const thirdP = at(gear(teeth.thirdP, MOD.centre, steel, { thick: 0.5, ded: 1.3 }), Z.centre);
  let thirdW = at(gear(teeth.third, MOD.third, brass, { spokes: 4, hub: 0.4 }), Z.third);
  aT.add(thirdP, thirdW);
  const escP = at(gear(teeth.escP, MOD.third, steel, { thick: 0.5, ded: 1.3 }), Z.third);
  const escGroup = new THREE.Group(); aE.add(escP);
  let esc = makeEscapementView(type, RE); esc.group.position.set(E[0], E[1], Z.esc); escGroup.add(esc.group);
  going.add(aG, aC, aT, aE, escGroup);
  const anchorArbor = zcyl(0.13, Z.back - 1.6, Z.front + 0.2, steel, 16); anchorArbor.position.x = POS.A[0]; anchorArbor.position.y = POS.A[1]; going.add(anchorArbor);

  // --- plates and pillars
  const plateMat = M.clear(COL.brass, 0.16, { metalness: 0.4, roughness: 0.3 });
  const plateGeo = new THREE.BoxGeometry(11.6, 18.2, 0.28);
  const front = new THREE.Group(), back = new THREE.Group();
  const fp = new THREE.Mesh(plateGeo, plateMat), bp = new THREE.Mesh(plateGeo, plateMat);
  fp.position.set(0, -0.9, Z.front); bp.position.set(0, -0.9, Z.back); front.add(fp); back.add(bp);
  [[-5.1, -9.3], [5.1, -9.3], [-5.1, 7.5], [5.1, 7.5]].forEach(([x, y]) => { const p = zcyl(0.38, Z.back, Z.front, brass, 16); p.position.x = x; p.position.y = y; back.add(p); });
  const cock = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.0, 2.6), brass); cock.position.set(0, POS.A[1] + 1.55, Z.back - 1.5); back.add(cock);
  group.add(front, back);

  // --- motion work, in front of the front plate
  const motion = new THREE.Group(); group.add(motion);
  const mC = new THREE.Group(), mM = new THREE.Group(), mH = new THREE.Group();
  mM.position.set(POS.MW[0], POS.MW[1], 0);
  const cannon = at(gear(teeth.cannon, MOD.motionA, brass, { thick: 0.2, spokes: 3, hub: 0.4 }), Z.motA); mC.add(cannon, zcyl(0.27, Z.motA, Z.dial + 0.8, brass, 16));
  mM.add(at(gear(teeth.minuteW, MOD.motionA, brass, { thick: 0.2, spokes: 3, hub: 0.4 }), Z.motA), at(gear(teeth.minuteP, MOD.motionB, steel, { thick: 0.42, ded: 1.3 }), Z.motB), zcyl(0.1, Z.front, Z.motB + 0.3, steel, 12));
  mH.add(at(gear(teeth.hour, MOD.motionB, brass, { thick: 0.2, spokes: 4, hub: 0.6 }), Z.motB), zcyl(0.4, Z.motB, Z.dial + 0.55, brass, 20));
  motion.add(mC, mM, mH);

  // --- dial and hands
  const dialG = new THREE.Group(), hands = new THREE.Group(); group.add(dialG, hands);
  const dialMesh = makeDial(14); dialMesh.position.z = Z.dial; if (dial) dialG.add(dialMesh);
  const blued = M.metal(0x2a3b6b, { roughness: 0.3 });
  const hHour = hand(8.2, 1.25, blued, { boss: 0.75 }), hMin = hand(12.3, 0.85, blued, { boss: 0.55 }), hSec = hand(2.0, 0.22, blued, { thick: 0.05, boss: 0.2, tail: 0.3 });
  hHour.position.z = Z.dial + 0.5; hMin.position.z = Z.dial + 0.8; hSec.position.set(E[0], E[1], Z.dial + 0.35);
  hands.add(hHour, hMin, hSec);

  // --- anchor arbor's crutch and the pendulum, behind the back plate
  const pend = new THREE.Group(); group.add(pend);
  const crutch = new THREE.Group(); crutch.position.set(POS.A[0], POS.A[1], Z.back - 1.4);
  const cr = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 11, 10), steel); cr.position.y = -5.5; crutch.add(cr);
  const fork = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.5, 1.9), steel); fork.position.set(0, -11, -0.8); crutch.add(fork);
  const SUS = [0, POS.A[1] + 1.2, Z.pend];
  const pendulum = makePendulum(SECONDS_PENDULUM * 100); pendulum.position.set(...SUS);
  pend.add(crutch); if (withPendulum) pend.add(pendulum);

  // --- line, pulley and weight. The line leaves the left of the drum, so the weight turns the great wheel anticlockwise.
  const wg = new THREE.Group(); group.add(wg); wg.visible = weight;
  const lineMat = M.matte(0xe9e2cf), xa = POS.G[0] - POS.drumR, xb = xa - 4.2, yFix = -10.4, zl = -0.6;
  const mkLine = () => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1, 8), lineMat); wg.add(m); return m; };
  const lineA = mkLine(), lineB = mkLine();
  const seat = new THREE.Mesh(new THREE.BoxGeometry(15, 0.8, 9), M.matte(COL.wood)); seat.position.set(0, yFix, 0); back.add(seat);
  const hang = new THREE.Group(); wg.add(hang);
  const pulley = zcyl(2.1, -0.25, 0.25, brass, 32); pulley.position.z = zl; hang.add(pulley);
  const stirrup = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.4, 0.9), steel); stirrup.position.set(0, -1.7, zl); hang.add(stirrup);
  const wt = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.8, 16, 36), M.metal(COL.brass, { roughness: 0.25 })); wt.position.set(0, -11.4, zl); wt.castShadow = true; hang.add(wt);
  hang.position.x = (xa + xb) / 2;
  const TOP = yFix - 4;                                       // the pulley's height when fully wound
  function setWeight(dropCm) {
    const y = TOP - dropCm; hang.position.y = y;
    lineA.scale.y = POS.G[1] - y; lineA.position.set(xa, (POS.G[1] + y) / 2, zl);
    lineB.scale.y = yFix - y; lineB.position.set(xb, (yFix + y) / 2, zl);
  }
  setWeight(20);

  // --- turning everything from the escape wheel's advance
  const ang = (phi) => {
    const e = esc.model.base - phi;
    const t = meshAngle(e, teeth.escP, teeth.third, dir(E, POS.T3));
    const c = meshAngle(t, teeth.thirdP, teeth.centre, dir(POS.T3, C));
    const g = meshAngle(c, teeth.centreP, teeth.great, dir(C, POS.G));
    const mw = meshAngle(c, teeth.cannon, teeth.minuteW, dir(C, POS.MW));
    const h = meshAngle(mw, teeth.minuteP, teeth.hour, dir(POS.MW, C));
    return { e, t, c, g, mw, h };
  };
  let ref = ang(esc.model.state.phi), h0 = handAngles(start);
  function pose() {
    const st = esc.model.state, a = ang(st.phi);
    esc.apply();
    aE.rotation.z = a.e; aT.rotation.z = a.t; aC.rotation.z = a.c; aG.rotation.z = a.g;
    mC.rotation.z = a.c; mM.rotation.z = a.mw; mH.rotation.z = a.h;
    hSec.rotation.z = h0.sec + (a.e - ref.e); hMin.rotation.z = h0.min + (a.c - ref.c); hHour.rotation.z = h0.hour + (a.h - ref.h);
    crutch.rotation.z = st.alpha; pendulum.rotation.z = st.alpha;
  }
  // The time the hands show, in seconds after 12:00, worked out from the centre arbor like the real hands.
  const shown = () => start - ((ang(esc.model.state.phi).c - ref.c) / TAU) * 3600;
  pose();

  return {
    group, going, front, back, motion, dialG, dialMesh, hands, pend, pendulum, crutch, wg, hang, plateMat, drumGroup, teeth, Z, SUS,
    arbors: { G: aG, C: aC, T3: aT, E: aE }, handsOf: { hour: hHour, min: hMin, sec: hSec }, motionOf: { C: mC, M: mM, H: mH },
    get esc() { return esc; }, pose, shown, setWeight,
    // Swap the escapement (anchor or deadbeat) without disturbing the hands.
    setType(t) {
      if (t === esc.type) return;
      const keep = shown(); escGroup.remove(esc.group); esc.group.traverse((o) => { o.geometry?.dispose(); });
      esc = makeEscapementView(t, RE); esc.group.position.set(E[0], E[1], Z.esc); escGroup.add(esc.group);
      ref = ang(esc.model.state.phi); h0 = handAngles(keep); pose();
    },
    // What if the third wheel had a different number of teeth? Same size, finer or coarser teeth.
    setThird(n) {
      if (n === teeth.third) return;
      const keep = shown(); teeth.third = n; aT.remove(thirdW); thirdW.geometry.dispose();
      // Keep the centre distance: the module changes so the pitch circles still touch.
      const m = (2 * dTE) / (n + teeth.escP);
      thirdW = at(gear(n, m, brass, { spokes: 4, hub: 0.4 }), Z.third); aT.add(thirdW);
      aE.remove(escP); escP.geometry.dispose(); escP.geometry = gearGeo(teeth.escP, m, { thick: 0.5, ded: 1.3 }); aE.add(escP);
      ref = ang(esc.model.state.phi); h0 = handAngles(keep); pose();
    },
  };
}

// Drive an escapement in step with a pendulum. `beats` counts half-swings of the pendulum; the
// anchor angle is amp·sin(π·beats). Small steps go through the real contact model; a big jump
// (fast-forward) just adds the wheel's average advance, one tooth for every two beats.
export function driveEscapement(model, beats0, beats1, amp = model.cfg.amp) {
  const db = beats1 - beats0;
  if (db <= 0) return;
  if (db > 0.9) {
    model.state.phi += model.pitch * 0.5 * Math.floor(db);
    model.settle(amp * Math.sin(Math.PI * beats1));
    return;
  }
  const n = Math.max(1, Math.ceil(db / 0.004));
  for (let i = 1; i <= n; i++) model.step(amp * Math.sin(Math.PI * (beats0 + (db * i) / n)), db / n);
}

// ---------------------------------------------------------------- framing
// A camera view that fits a w × h box of the scene centred on c, whatever shape the stage is.
// On a phone the readout covers the top of the stage, so the box goes into the lower 58%.
// On a wide page the box can be nudged right (shiftX) to clear the readout at the upper left.
// stage.setView backs the camera off on narrow stages by itself, so that factor is divided out.
export const isNarrow = () => { const el = document.getElementById('stage'); return !!el && el.clientWidth < 560 && !document.body.classList.contains('gb-reel'); };
export function fit(c, dir, w, h, { shiftX = 0, top = 0, pad = 1.2 } = {}) {
  const TAN = Math.tan(21 * DEG), n = Math.hypot(...dir);
  const calc = () => {
    const el = document.getElementById('stage'), a = el && el.clientHeight ? el.clientWidth / el.clientHeight : 1.4;
    const reel = document.body.classList.contains('gb-reel'), phone = !reel && isNarrow();
    const r = reel ? 0 : phone ? 0.42 : top;
    const p = reel ? 1.04 : pad;                              // a video frame has no page furniture to clear
    const D = (p * Math.max(h / (1 - r), w / a)) / (2 * TAN), k = Math.min(2.5, Math.max(1, 1.45 / Math.max(0.3, a)));
    const tg = [c[0] - (reel || phone ? 0 : shiftX), c[1] + r * D * TAN, c[2] || 0];
    return { tg, pos: tg.map((t, i) => t + ((dir[i] / n) * D) / k) };
  };
  return { get target() { return calc().tg; }, get pos() { return calc().pos; } };
}
