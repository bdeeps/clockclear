// Chapter 6: the clock most walls actually have: a quartz movement on one AA cell.
// Kept short on purpose. The crystal, the divider and the stepper motor are QuartzClear's subject.
import { THREE, M, box, canvasTexture, exploder, clamp, smooth } from '../kit.js';
import { fit, isNarrow, gear, zcyl, meshAngle, hand, handAngles, clockText, TAU, DEG } from '../clock.js';

const S = 1.0, BASE = 3.5;
// The reductions are fixed by arithmetic: the rotor makes half a turn a second (30 turns a minute),
// so rotor → seconds hand must be 30 to 1, seconds → minutes 60 to 1, minutes → hours 12 to 1.
// The tooth counts below are this model's own way of getting those ratios; makers differ.
const G = [
  { n: [8, 48], m: 0.05 }, { n: [12, 60], m: 0.04 },          // 6 × 5 = 30
  { n: [8, 64], m: 0.04 }, { n: [8, 60], m: 1.44 / 34 },      // 8 × 7.5 = 60
  { n: [10, 30], m: 0.05 }, { n: [8, 32], m: 0.05 },          // 3 × 4 = 12
];
const pol = (r, deg) => [r * Math.cos(deg * DEG), r * Math.sin(deg * DEG)];
const C = [0, 0], I1 = pol(1.44, 150), ROT = [I1[0] + pol(1.4, 200)[0], I1[1] + pol(1.4, 200)[1]], I2 = pol(1.44, 30), I3 = pol(1.0, 270);
const dir = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]);
// A watch-type tuning-fork crystal: 32,768 Hz, trimmed to within about ±20 parts per million at 25 °C,
// and slowing by about 0.034 ppm for each °C² away from that (typical crystal data sheets; see QuartzClear).
const F = 32768, K_T = -0.034, SPD = 0.0864;                  // 1 ppm = 0.0864 s a day
const ROOMS = [['Kitchen', 9], ['Hall', -6], ['Bedroom', 16]];
const ppm = (i, T) => ROOMS[i][1] + K_T * (T - 25) ** 2;

export default {
  id: 'quartz',
  short: 'The clock on your wall',
  title: 'The clock on your wall',
  subtitle: 'No pendulum, no weight: a sliver of quartz, a chip, and a motor that steps once a second.',
  view: fit([0.2, 5.6, 0.6], [0.2, 0.16, 1], 10.4, 10.8),
  learn: `<p>Most wall clocks today, from a Morbi-made kitchen clock to a station clock, hide a plastic box the size of a matchbox with one <b>AA cell</b>. It does the same three jobs as the pendulum clock, with different parts.</p>
    <p>The <b>timekeeper</b> is a tiny fork of <b>quartz crystal</b> that vibrates 32,768 times a second. A <b>chip</b> halves that count fifteen times to get exactly one pulse a second. Each pulse goes through a <b>coil</b>, turning an iron frame into a magnet for an instant, and flips a little magnet <b>rotor</b> half a turn. That flip is the <b>tick</b> you hear. Plastic gears then slow it down: 30 to 1 for the seconds hand, 60 to 1 for the minutes, and the same 12 to 1 for the hours. The full story of the crystal and the motor is in <a href="https://glassbox.how/quartzclear/" target="_blank" rel="noopener">QuartzClear</a>, and the kind with digits instead of hands is <a href="https://glassbox.how/digitalwatchclear/" target="_blank" rel="noopener">DigitalWatchClear</a>.</p>
    <p>A silent <b>sweep</b> clock uses the same crystal but sends the motor many small pulses each second (16 in a common design), so the hand glides.</p>
    <p>Why do the clocks in one house <b>disagree</b>? No two crystals are cut exactly alike, and each runs a touch slower when the room is hot or cold. A few millionths fast or slow adds up to seconds a week.</p>
    <p>And why <b>clockwise</b>? Early clockmakers in the northern hemisphere copied the sundial, whose shadow creeps round that way. India had its own count long before: the day of 60 <b>ghatis</b>, timed by a bowl sinking in water. Today all of India keeps one time, <b>IST</b>, five and a half hours ahead of Greenwich and kept by atomic clocks at the National Physical Laboratory in New Delhi.</p>
    <p class="tip"><b>Try it:</b> open the box, switch between tick and sweep, then let 30 days pass and see how far three clocks drift apart.</p>`,
  terms: [
    { t: 'Quartz crystal', d: 'A tiny piece of quartz that vibrates at a very steady rate when a chip drives it electrically.' },
    { t: 'Stepper motor', d: 'A motor that turns in fixed steps. In a clock, one pulse flips the rotor half a turn.' },
    { t: 'Parts per million (ppm)', d: 'One ppm fast is one second gained in a million seconds, which is about 11.6 days.' },
    { t: 'Sweep movement', d: 'A quartz movement that steps the motor many times a second so the hand moves smoothly and quietly.' },
    { t: 'IST', d: 'Indian Standard Time: 5 hours 30 minutes ahead of Coordinated Universal Time.' },
  ],
  defaults: { open: 0.35, mode: 'tick', temp: 25, days: 7 },
  controls: [
    { key: 'open', type: 'range', label: 'Open the box', min: 0, max: 1, step: 0.01, ends: ['closed', 'apart'], fmt: (v) => Math.round(v * 100) + '%' },
    { key: 'mode', type: 'seg', label: 'Seconds hand', options: [{ v: 'tick', label: 'Tick' }, { v: 'sweep', label: 'Sweep' }] },
    { key: 'days', type: 'range', label: 'Days since you set them', min: 0, max: 90, step: 1, fmt: (v) => v + (v === 1 ? ' day' : ' days') },
    { key: 'temp', type: 'range', label: 'Room temperature', min: 5, max: 45, step: 1, fmt: (v) => v + ' °C' },
  ],
  quiz: [
    { q: 'What replaces the pendulum in a quartz wall clock?', options: ['The AA cell', 'A vibrating quartz crystal', 'The plastic gears', 'The coil'], answer: 1, why: 'The crystal’s steady vibration is the timekeeper. A chip counts it down to one pulse a second.' },
    { q: 'Why does an ordinary quartz clock tick once a second?', options: ['A spring snaps every second', 'The motor’s rotor flips half a turn on each one-second pulse', 'The crystal clicks', 'The battery pulses on its own'], answer: 1, why: 'Each pulse through the coil flips the magnet rotor half a turn, and the gears pass that jump to the seconds hand.' },
    { q: 'Two new quartz clocks are set together. A month later they differ by 20 seconds. Why?', options: ['One battery is stronger', 'Their crystals are not exactly the same frequency', 'One has heavier hands', 'Gravity differs between rooms'], answer: 1, why: 'Crystals are trimmed to within a few parts per million, not perfectly. Small differences add up day after day.' },
  ],
  reel: [
    { ms: 5800, caption: 'Most wall clocks now swap the pendulum for a quartz crystal and a motor that steps once a second.', set: { mode: 'tick', temp: 25, days: 7 }, anim: { open: [0, 0.9] }, view: fit([-1.0, 3.5, 1.5], [0.45, 0.3, 1], 10.4, 7), spin: 0.4 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); root.scale.setScalar(S); root.position.set(-0.4, BASE, 0); stage.root.add(root);
    const parts = [];
    const add = (obj, z, layer) => { obj.position.z = z; root.add(obj); parts.push({ obj, off: [0, 0, layer * 0.62] }); return obj; };
    const black = M.plastic(0x16181d), white = M.plastic(0xf2efe6), blue = M.plastic(0xa9c7ff), steel = M.metal(0xb4bcc8);
    // Case: a generic black box, front cover drawn clear.
    const tray = new THREE.Group();
    const back = box(8.3, 6.0, 0.12, black); back.position.set(0.45, 0, -0.06);
    [[0.45, 3.0, 8.3, 0.12], [0.45, -3.0, 8.3, 0.12]].forEach(([x, y, w, h]) => { const b = box(w, h, 2.0, black); b.position.set(x, y, 0.95); tray.add(b); });
    [[-3.7, 0], [4.6, 0]].forEach(([x, y]) => { const b = box(0.12, 6.0, 2.0, black); b.position.set(x, y, 0.95); tray.add(b); });
    tray.add(back); add(tray, 0, -1);
    const cover = box(8.3, 6.0, 0.1, M.clear(0xcfe8ff, 0.1)); cover.castShadow = false; add(cover, 1.95, 8);

    // The cell, the board with crystal and chip, the coil and its iron stator.
    const cell = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 4.85, 28), M.metal(0xc7a24a, { roughness: 0.35 })); cell.add(body);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.2, 16), steel); cap.position.y = 2.52; cell.add(cap);
    cell.position.set(3.75, 0, 0); add(cell, 0.85, 0);
    const pcb = new THREE.Group(); pcb.add(box(1.9, 1.4, 0.1, M.plastic(0x1f7a4d)));
    const chip = new THREE.Mesh(new THREE.SphereGeometry(0.34, 20, 10, 0, TAU, 0, Math.PI / 2), black); chip.rotation.x = Math.PI / 2; chip.position.set(0.45, 0.1, 0.05); pcb.add(chip);
    const xtal = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.8, 16), steel); xtal.rotation.z = Math.PI / 2; xtal.position.set(-0.35, -0.3, 0.2); pcb.add(xtal);
    pcb.position.set(1.85, -2.05, 0); add(pcb, 0.3, 0);
    const stS = new THREE.Shape(); stS.moveTo(-3.45, -2.5); stS.lineTo(-1.75, -2.5); stS.lineTo(-1.75, 0.9); stS.lineTo(-3.45, 0.9); stS.closePath();
    const hole = new THREE.Path(); hole.absarc(ROT[0], ROT[1], 0.36, 0, TAU, true); stS.holes.push(hole);
    const win = new THREE.Path(); win.moveTo(-3.1, -2.2); win.lineTo(-3.1, -0.5); win.lineTo(-2.1, -0.5); win.lineTo(-2.1, -2.2); win.closePath(); stS.holes.push(win);
    const stator = new THREE.Mesh(new THREE.ExtrudeGeometry(stS, { depth: 0.1, bevelEnabled: false }), M.metal(0x8a93a3, { roughness: 0.5 })); add(stator, 0.22, 0);
    const coilMat = new THREE.MeshStandardMaterial({ color: 0xc8733a, metalness: 0.5, roughness: 0.4, emissive: 0xff7a59, emissiveIntensity: 0 });
    const coil = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 1.5, 24), coilMat); coil.position.set(-1.92, -1.35, 0); add(coil, 0.3, 0);
    const rotor = new THREE.Group();
    const half = (c, a) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.22, 24, 1, false, a, Math.PI), M.plastic(c)); m.rotation.x = Math.PI / 2; return m; };
    rotor.add(half(0xff5a4a, 0), half(0x4f7bff, Math.PI)); rotor.position.set(ROT[0], ROT[1], 0);
    const rotorPin = gear(G[0].n[0], G[0].m, white, { thick: 0.16, ded: 1.3 }); rotorPin.position.z = 0.2; rotor.add(rotorPin, zcyl(0.05, -0.25, 0.4, steel, 8));
    add(rotor, 0.33, 1);

    // The plastic train. Seconds, minutes and hours all turn about the same centre.
    const arb = (p, z, layer, ...meshes) => { const g = new THREE.Group(); g.position.set(p[0], p[1], 0); meshes.forEach((m) => g.add(m)); return add(g, z, layer); };
    const gz = (N, m, mat, z, o = {}) => { const g = gear(N, m, mat, { thick: 0.13, ...o }); g.position.z = z; return g; };
    const aI1 = arb(I1, 0.53, 2, gz(48, G[0].m, white, 0, { spokes: 4, hub: 0.3 }), gz(12, G[1].m, white, 0.2, { thick: 0.22, ded: 1.3 }));
    const aS = arb(C, 0.73, 3, gz(60, G[1].m, blue, 0, { spokes: 4, hub: 0.3 }), gz(8, G[2].m, blue, 0.2, { thick: 0.22, ded: 1.3 }), zcyl(0.05, 0, 2.4, steel, 8));
    const aI2 = arb(I2, 0.93, 4, gz(64, G[2].m, white, 0, { spokes: 4, hub: 0.3 }), gz(8, G[3].m, white, 0.2, { thick: 0.22, ded: 1.3 }));
    const aM = arb(C, 1.13, 5, gz(60, G[3].m, blue, 0, { spokes: 4, hub: 0.35 }), gz(10, G[4].m, blue, 0.2, { thick: 0.22, ded: 1.3 }), zcyl(0.11, 0, 1.75, white, 12));
    const aI3 = arb(I3, 1.33, 6, gz(30, G[4].m, white, 0, { hub: 0.2 }), gz(8, G[5].m, white, 0.2, { thick: 0.22, ded: 1.3 }));
    const aH = arb(C, 1.53, 7, gz(32, G[5].m, blue, 0, { hub: 0.3 }), zcyl(0.18, 0, 1.1, white, 14));
    const hm = M.plastic(0x16181d), red = M.plastic(0xff5a4a);
    const hH = hand(2.5, 0.34, hm, { thick: 0.04, boss: 0.26 }), hM = hand(3.6, 0.24, hm, { thick: 0.04, boss: 0.2 }), hS = hand(3.8, 0.07, red, { thick: 0.03, boss: 0.12, tail: 0.25 });
    const hands = new THREE.Group(); hands.add(hH, hM, hS); hH.position.z = 0; hM.position.z = 0.25; hS.position.z = 0.5; add(hands, 2.75, 10);
    const setOpen = exploder(parts);

    const L = (t, o, p, cls) => stage.label(t, p, o, cls);
    L('AA cell: 1.5 V', cell, [1.6, 1.2, 0.8]); L('Quartz crystal', pcb, [-0.5, -1.15, 0.3], 'hot'); L('Chip', pcb, [1.5, 0.75, 0.3]);
    const lCoil = L('Coil', coil, [-1.7, -1.0, 0.3]); L('Rotor: a tiny magnet', stator, [ROT[0] - 1.4, ROT[1] + 1.1, 0.4], 'hot');
    const lShare = L('Seconds, minute and hour wheels share one centre', cover, [0.3, 3.5, 0]);

    // Three clocks around the house and one true time.
    const now = { err: [0, 0, 0], t: 0 };
    const chart = canvasTexture(640, 520, (g, w, h) => {
      g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(7,8,12,.84)'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#fff'; g.font = '600 28px sans-serif'; g.textAlign = 'left'; g.fillText('Three clocks, set together', 26, 44);
      const face = (cx, cy, r, t, name, note, col) => {
        g.fillStyle = '#f3ead6'; g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill();
        g.strokeStyle = '#1b1d22'; for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; g.lineWidth = 3; g.beginPath(); g.moveTo(cx + Math.sin(a) * r * 0.82, cy - Math.cos(a) * r * 0.82); g.lineTo(cx + Math.sin(a) * r * 0.94, cy - Math.cos(a) * r * 0.94); g.stroke(); }
        const hd = (frac, len, lw, c) => { const a = frac * TAU; g.strokeStyle = c; g.lineWidth = lw; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.sin(a) * r * len, cy - Math.cos(a) * r * len); g.stroke(); };
        hd((t % 43200) / 43200, 0.5, 7, '#1b1d22'); hd((t % 3600) / 3600, 0.75, 5, '#1b1d22'); hd((t % 60) / 60, 0.85, 2.5, '#ff5a4a');
        g.textAlign = 'center'; g.fillStyle = '#fff'; g.font = '600 24px sans-serif'; g.fillText(name, cx, cy + r + 32);
        g.fillStyle = col; g.font = '24px sans-serif'; g.fillText(note, cx, cy + r + 62);
      };
      const fmt = (e) => (Math.abs(e) < 0.05 ? 'spot on' : `${e > 0 ? '+' : '−'}${Math.abs(e) < 100 ? Math.abs(e).toFixed(1) + ' s' : (Math.abs(e) / 60).toFixed(1) + ' min'}`);
      ROOMS.forEach(([name], i) => face(118 + i * 202, 170, 82, now.t + now.err[i], name, fmt(now.err[i]), now.err[i] >= 0 ? '#ffb547' : '#8ef0ff'));
      face(320, 380, 62, now.t, 'True time (IST)', '', '#fff');
    });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 3.9), new THREE.MeshBasicMaterial({ map: chart.tex, transparent: true, toneMapped: false }));
    board.position.set(3.3, 8.55, -0.5); stage.root.add(board);

    const T0 = 10 * 3600 + 9 * 60 + 30;
    const ang = (rot) => {
      const i1 = meshAngle(rot, 8, 48, dir(ROT, I1)), s = meshAngle(i1, 12, 60, dir(I1, C)), i2 = meshAngle(s, 8, 64, dir(C, I2));
      const m = meshAngle(i2, 8, 60, dir(I2, C)), i3 = meshAngle(m, 10, 30, dir(C, I3)), h = meshAngle(i3, 8, 32, dir(I3, C));
      return { i1, s, i2, m, i3, h };
    };
    const ref = ang(0), h0 = handAngles(T0);
    let t = 0, pulse = 0, lastStep = 0;
    return {
      update(dt, s) {
        dt = Math.max(0, dt);
        t += dt;
        const steps = Math.floor(t), fr = t - steps, tick = s.mode === 'tick';
        // Tick: half a turn per second, done in about a tenth of a second. Sweep: many small steps, drawn as a glide.
        const turns = tick ? steps + smooth(clamp(fr / 0.12, 0, 1)) : t;
        const rot = -Math.PI * turns, a = ang(rot);
        if (steps !== lastStep) { lastStep = steps; pulse = 1; }
        pulse = tick ? Math.max(0, pulse - dt * 6) : 0.35;
        coilMat.emissive.set(tick && steps % 2 ? 0x4f7bff : 0xff7a59); coilMat.emissiveIntensity = pulse * 1.4;
        lCoil.element.textContent = tick ? `Coil: pulse ${steps % 2 ? '−' : '+'}` : 'Coil: many small pulses';
        rotor.rotation.z = rot; aI1.rotation.z = a.i1; aS.rotation.z = a.s; aI2.rotation.z = a.i2; aM.rotation.z = a.m; aI3.rotation.z = a.i3; aH.rotation.z = a.h;
        hS.rotation.z = h0.sec + (a.s - ref.s); hM.rotation.z = h0.min + (a.m - ref.m); hH.rotation.z = h0.hour + (a.h - ref.h);
        setOpen(s.open);
        // On a phone the readout covers the top, so the three clocks move below the box.
        const narrow = isNarrow(); lShare.visible = !narrow; root.position.y = narrow ? BASE + 5.4 : BASE; board.position.set(narrow ? 0.2 : 3.3, narrow ? 2.5 : 8.55, -0.5); board.scale.setScalar(narrow ? 1.5 : 1);
        now.t = T0 + (tick ? steps : t);
        now.err = ROOMS.map((_, i) => ppm(i, s.temp) * SPD * s.days);
        chart.redraw();
      },
      readout: (s) => {
        const e = ROOMS.map((_, i) => ppm(i, s.temp) * SPD * s.days), spread = Math.max(...e) - Math.min(...e), tp = K_T * (s.temp - 25) ** 2;
        return `<div class="big">${s.days} days on: ${spread.toFixed(1)} s apart</div>
          <div class="row"><span>Crystal</span><b>${F.toLocaleString('en')} Hz ÷ 2¹⁵ = 1 pulse a second</b></div>
          <div class="row"><span>Rotor</span><b>${s.mode === 'tick' ? 'half a turn a second' : 'small steps: a smooth glide'}</b></div>
          <div class="row"><span>Gears</span><b>30 to 1, then 60 to 1, then 12 to 1</b></div>
          <div class="row"><span>At ${s.temp} °C every crystal runs</span><b>${tp === 0 ? 'at its best' : Math.abs(tp).toFixed(1) + ' ppm slow'}</b></div>
          <div class="row"><span>Fastest clock gains</span><b>${(ppm(2, s.temp) * SPD * 7).toFixed(1)} s a week</b></div>`;
      },
    };
  },
};
