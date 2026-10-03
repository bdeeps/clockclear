// Chapter 3: the escapement, tick by tick. Nothing here is scripted: the wheel is pushed by the
// train and stopped by the pallets' real shapes (see ../escapement.js).
import { THREE, M, canvasTexture, sphere } from '../kit.js';
import { fit, isNarrow, makeEscapementView, gear, zcyl, meshAngle, TEETH, POS, COL, DEG } from '../clock.js';
import { sfx } from '../ui.js';

const WY = 3.2, WX = 1.7;                                   // height of the escape wheel's centre (cm units)
const R = POS.RE;
const PHASE = {
  lock: ['Locked', 'A tooth rests on a pallet.'],
  impulse: ['Impulse', 'The tooth pushes the pallet aside.'],
  drop: ['Drop', 'The wheel jumps free: tick.'],
  recoil: ['Recoil', 'The pallet shoves the wheel back.'],
};

export default {
  id: 'escapement',
  short: 'The escapement',
  title: 'The escapement: tick, tock',
  subtitle: 'It lets the train go one tooth at a time, and gives the pendulum a push.',
  view: fit([-0.4, 4.0, 0], [0.03, 0.07, 1], 11.4, 7.8, { top: 0.1 }),
  learn: `<p>The <b>escapement</b> does two jobs at once. It <b>holds back</b> the gear train, letting the <b>escape wheel</b> advance one step per swing. And it passes a tiny <b>push</b> to the pendulum on every swing, to make up for friction. The pendulum sets the pace. The weight pays for it.</p>
    <p>The rocking piece is the <b>anchor</b>, with a hard <b>pallet</b> at each end. It is joined to the pendulum, so the two rock together. Watch one tooth. It is <b>locked</b> against the left pallet (the entry pallet). The pendulum swings back, the pallet lifts, and the tooth slides down the pallet's slanted tip, shoving it aside: that is the <b>impulse</b>. The tooth <b>drops</b> free, and the wheel jumps until another tooth lands on the right pallet (the exit pallet) with a <b>tick</b>. On the way back the same happens there: <b>tock</b>.</p>
    <p>Each tooth is caught twice, so a 30-tooth wheel takes 60 beats to go round. With a one-second beat it turns once a minute, and can carry the seconds hand.</p>
    <p>In the old <b>anchor</b> escapement the pallets are simple slopes. After a tooth lands, the pendulum keeps swinging and pushes the whole train <b>backwards</b> a little: you can see the seconds hand of an old clock twitch back. The <b>deadbeat</b> escapement, made famous by George Graham around 1715, gave each pallet a curved face centred on the anchor's pivot. The tooth rests on that curve and the wheel stands dead still, which disturbs the pendulum less.</p>
    <p class="tip"><b>Try it:</b> slow it right down and follow one tooth through lock, impulse and drop. Then switch to the anchor and spot the recoil.</p>`,
  terms: [
    { t: 'Escape wheel', d: 'The last and fastest wheel of the train, with pointed teeth that the pallets catch and release.' },
    { t: 'Pallet', d: 'One of the two hard faces on the anchor that the escape wheel’s teeth land on.' },
    { t: 'Impulse', d: 'The small push a tooth gives the pallet, and through it the pendulum, on each swing.' },
    { t: 'Drop', d: 'The short free jump of the wheel between leaving one pallet and landing on the other. It makes the tick.' },
    { t: 'Recoil', d: 'The backward push on the wheel in an anchor escapement, after a tooth has landed.' },
    { t: 'Deadbeat', d: 'An escapement with no recoil: the wheel stands still while it is locked.' },
  ],
  defaults: { type: 'deadbeat', slow: 0.2, sound: false },
  controls: [
    { key: 'type', type: 'seg', label: 'Escapement', options: [{ v: 'recoil', label: 'Anchor (recoil)' }, { v: 'deadbeat', label: 'Deadbeat' }] },
    { key: 'slow', type: 'log', label: 'Speed', min: 0.03, max: 1, ends: ['very slow', 'real time'], fmt: (v) => (v > 0.97 ? 'real time' : `${Math.round(1 / v)}× slower`) },
    { key: 'sound', type: 'toggle', label: 'Tick sound' },
  ],
  quiz: [
    { q: 'What two jobs does the escapement do?', options: ['Shows the time and strikes the hours', 'Holds the train back one tooth at a time, and gives the pendulum a push', 'Winds the weight and oils the gears', 'Makes the pendulum heavier and longer'], answer: 1, why: 'It releases the train step by step, and each release hands a little of the weight’s energy to the pendulum.' },
    { q: 'What makes the ticking sound?', options: ['The pendulum hitting the case', 'A tooth of the escape wheel landing on a pallet', 'The weight bumping the drum', 'The hands rubbing the dial'], answer: 1, why: 'After each drop a tooth lands on a pallet with a small click. Two landings per swing: tick, tock.' },
    { q: 'How is a deadbeat escapement different from a plain anchor?', options: ['It has no pallets', 'The wheel does not get pushed backwards while it is locked', 'It needs no pendulum', 'Its wheel turns the other way'], answer: 1, why: 'Its locking faces are curved around the anchor’s pivot, so the swinging pallet slides along the tooth without moving it.' },
  ],
  reel: [
    { ms: 6000, caption: 'The escapement lets the gears move one tooth per swing: lock, push, drop, tick.', set: { type: 'deadbeat', slow: 0.3, sound: false }, view: fit([1.9, 3.9, 0], [0, 0.03, 1], 5.2, 7.6), spin: 0 },
    { ms: 5600, caption: 'Each tooth also slides down a slanted pallet and gives the pendulum a tiny push.', set: { type: 'deadbeat', slow: 0.12, sound: false }, view: fit([1.7, 5.15, 0], [0, 0.02, 1], 4.0, 3.4), spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); root.position.set(WX, WY, 0); stage.root.add(root);
    const steel = M.metal(COL.steel, { roughness: 0.35 }), ghost = M.clear(COL.brass, 0.3, { metalness: 0.5 });
    // Behind the wheel: its pinion, driven by the third wheel (shown faintly), brings the weight's push.
    const T3 = [POS.T3[0] - POS.E[0], POS.T3[1] - POS.E[1]], dirET = Math.atan2(T3[1], T3[0]);
    const escP = gear(TEETH.escP, 0.07, steel, { thick: 0.5, ded: 1.3 }); escP.position.z = -1.5; root.add(escP);
    const third = gear(TEETH.third, 0.07, ghost, { spokes: 4, hub: 0.4 }); third.position.set(T3[0], T3[1], -1.5); root.add(third);
    root.add(zcyl(0.1, -2.2, 0.6, steel, 12));

    let view = null, type = null;
    const A = new THREE.Group(); root.add(A);         // the anchor arbor, crutch and pendulum rod
    const arbor = zcyl(0.12, -3.6, 0.5, steel, 12);
    const crutch = new THREE.Group(); crutch.position.z = -3.0;
    const cr = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 6.4, 10), steel); cr.position.y = -3.2; crutch.add(cr);
    const fork = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.4, 1.3), steel); fork.position.set(0, -6.4, -0.5); crutch.add(fork);
    const rod = new THREE.Group(); rod.position.set(0, 1.1, -3.6);
    const rodM = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 6.2, 12), M.metal(0x7d8696, { roughness: 0.4 })); rodM.position.y = -4.0; rod.add(rodM);
    const susp = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.0, 0.04), M.metal(0x9fb3d8)); susp.position.y = -0.45; rod.add(susp);
    const cock = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.7, 1.6), M.metal(COL.brass)); cock.position.set(0, 1.4, -3.0);
    A.add(arbor, crutch, rod, cock);
    function setType(t) {
      if (view) { root.remove(view.group); view.group.traverse((o) => o.geometry?.dispose()); }
      view = makeEscapementView(t, R); type = t; root.add(view.group);
      A.position.y = view.model.d;
    }
    setType('deadbeat');

    // A dot on the tooth that is touching, and an arrow for the train's steady push.
    const dot = sphere(0.05, M.glow(0xffffff), 12); root.add(dot);
    const L = (t, p, cls) => stage.label(t, p, root, cls);
    L('Escape wheel: 30 teeth, pushed clockwise ↻', [0.9, -2.55, 0.3]); L('Entry pallet', [-2.6, 1.15, 0.3]); L('Exit pallet', [2.6, 1.15, 0.3]);
    const lAnchor = L('Anchor', [0.0, 3.45, 0.3]);
    const minor = [L('Third wheel brings the push', [3.0, -3.6, -1.5]), L('Pendulum rod: bob 1 m below', [-2.3, 0.15, -3.6])];
    const lPhase = L('', [0, 4.6, 0.3], 'hot');
    

    // A trace of the pendulum's angle and the wheel's advance over the last few seconds.
    const N = 300, SPAN = 6, hist = { a: new Float32Array(N), w: new Float32Array(N), i: 0, acc: 0 };
    const chart = canvasTexture(640, 420, (g, w, h) => {
      g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(7,8,12,.84)'; g.fillRect(0, 0, w, h);
      const x0 = 30, cw = w - 60;
      g.strokeStyle = 'rgba(255,255,255,.16)'; g.lineWidth = 2;
      for (let i = 0; i <= SPAN; i++) { const x = x0 + (cw * i) / SPAN; g.beginPath(); g.moveTo(x, 70); g.lineTo(x, h - 50); g.stroke(); }
      const line = (arr, col, mid, amp) => { g.strokeStyle = col; g.lineWidth = 5; g.beginPath(); for (let k = 0; k < N; k++) { const v = arr[(hist.i + k) % N], x = x0 + (cw * k) / (N - 1), y = mid - amp * v; k ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); };
      line(hist.a, '#8ef0ff', 135, 50);
      const last = hist.w[(hist.i + N - 1) % N];
      g.strokeStyle = '#ff7a59'; g.lineWidth = 5; g.beginPath();
      for (let k = 0; k < N; k++) { const v = hist.w[(hist.i + k) % N] - last, x = x0 + (cw * k) / (N - 1), y = 235 - v * 3.4; k ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke();
      g.font = '600 28px sans-serif'; g.fillStyle = '#8ef0ff'; g.fillText('Pendulum', x0, 44);
      g.fillStyle = '#ff7a59'; g.fillText('Escape wheel: 6° a tick', x0 + 250, 44);
      g.fillStyle = 'rgba(255,255,255,.6)'; g.font = '26px sans-serif'; g.fillText('one square = 1 second', x0, h - 16);
    });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(4.9, 3.22), new THREE.MeshBasicMaterial({ map: chart.tex, transparent: true, toneMapped: false }));
    board.position.set(-3.5, 1.9, 0.4); stage.root.add(board);

    let beats = 0.5, ticks = 0, thirdA = 0;
    return {
      update(dt, s) {
        dt = Math.max(0, dt);
        if (s.type !== type) { setType(s.type); ticks = 0; }
        const m = view.model, st = m.state, db = dt * s.slow;
        const n = Math.max(1, Math.ceil(db / 0.004));
        for (let i = 1; i <= n; i++) {
          const b = beats + (db * i) / n; m.step(m.cfg.amp * Math.sin(Math.PI * b), db / n);
          hist.acc += db / n;
          if (hist.acc > SPAN / N) { hist.acc = 0; hist.a[hist.i] = st.alpha / m.cfg.amp; hist.w[hist.i] = st.phi / DEG; hist.i = (hist.i + 1) % N; }
        }
        beats += db;
        if (st.ticks !== ticks) { ticks = st.ticks; if (s.sound) sfx('click'); }
        view.apply();
        const e = m.base - st.phi; escP.rotation.z = e;
        thirdA = meshAngle(e, TEETH.escP, TEETH.third, dirET); third.rotation.z = thirdA;
        crutch.rotation.z = rod.rotation.z = st.alpha;
        dot.visible = !!st.contact; dot.position.set(m.tip[0], m.tip[1], 0.2);
        dot.material.color.set(st.phase === 'impulse' ? 0xffb547 : st.phase === 'recoil' ? 0xff5a4a : 0xffffff);
        lPhase.element.textContent = PHASE[st.phase][0] + (st.contact ? (st.contact === 1 ? ' · entry pallet' : ' · exit pallet') : '');
        lAnchor.element.textContent = s.type === 'recoil' ? 'Anchor' : 'Deadbeat anchor';
        minor.forEach((l) => { l.visible = !isNarrow(); });
        chart.redraw();
      },
      readout: (s) => {
        const m = view.model, st = m.state, [name, what] = PHASE[st.phase];
        return `<div class="big">${name}</div>${what}
          <div class="row"><span>Ticks so far</span><b>${st.ticks}</b></div>
          <div class="row"><span>Wheel has turned</span><b>${(st.phi / DEG).toFixed(1)}°, 6° a tick</b></div>
          <div class="row"><span>Pendulum now</span><b>${(st.alpha / DEG >= 0 ? '+' : '−') + Math.abs(st.alpha / DEG).toFixed(1)}° of ±${(m.cfg.amp / DEG).toFixed(1)}°</b></div>
          <div class="row"><span>Recoil this beat</span><b ${s.type === 'recoil' ? 'class="no"' : 'class="ok"'}>${s.type === 'recoil' ? (st.recoil / DEG).toFixed(1) + '° backwards' : 'none: dead still'}</b></div>`;
      },
    };
  },
};
