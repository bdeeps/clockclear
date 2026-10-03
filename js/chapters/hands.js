// Chapter 5: the motion work behind the dial (12 to 1), and how a clock counts out the hours on a bell.
import { THREE, M, clamp, smooth } from '../kit.js';
import { fit, isNarrow, gear, zcyl, meshAngle, makeDial, hand, handAngles, clockText, TEETH, POS, COL, DEG, TAU } from '../clock.js';
import { sfx } from '../ui.js';

const S = 0.42, BASE = 6.4;
const C = [0, 0], MW = POS.MW;
const dirCM = Math.atan2(MW[1], MW[0]), dirMC = dirCM + Math.PI;
// Rack-and-snail striking. The rack is an arm pivoted at P. Its tail carries a pin that drops onto
// the snail, a stepped cam on the hour wheel. Each step lets the rack fall one more tooth, and the
// gathering pallet lifts it back one tooth per hammer blow, so the snail's step sets the count.
const P = [-1.6, -3.6], TAIL = 3.6, BETA0 = 99 * DEG, TOOTH = 1.9 * DEG, PIN = 0.14;
const RACK_R = 6.2, GATHER = 118 * DEG;
const tailPin = (rho) => [P[0] + TAIL * Math.cos(BETA0 - rho), P[1] + TAIL * Math.sin(BETA0 - rho)];
// The snail's radius for each hour is simply where the pin ends up after falling that many teeth.
const snailR = (h) => Math.hypot(...tailPin(h * TOOTH)) - PIN;
const BLOW = 1.0, FALL = 0.5;                     // seconds per hammer blow, and for the rack to fall

export default {
  id: 'hands',
  short: 'Hands and chimes',
  title: 'Two hands from one arbor, and a bell',
  subtitle: 'Four small wheels behind the dial turn the hour hand 12 times slower.',
  view: fit([0, 6.4, 0], [0.16, 0.05, 1], 12.2, 12.2, { shiftX: 1.2, top: 0.04 }),
  learn: `<p>The <b>minute hand</b> rides on the centre arbor, which turns once an hour. The <b>hour hand</b> must turn once in twelve hours, around the very same centre. The <b>motion work</b>, hidden between the front plate and the dial, does it with four wheels.</p>
    <p>A wheel on the centre arbor (the <b>cannon wheel</b>, 36 teeth) drives the <b>minute wheel</b> (36) beside it at the same speed. On the minute wheel sits a tiny <b>pinion</b> of 6 leaves, which drives the <b>hour wheel</b> of 72 teeth: 72 ÷ 6 = 12. The hour wheel is a hollow tube that slips over the centre arbor, so both hands share one centre. The cannon wheel is only held by friction, which is why you can push the minute hand round to set the time without hurting the train.</p>
    <p><b>Striking</b> uses a second train with its own weight, waiting to be let go. On the hour wheel is the <b>snail</b>, a cam with twelve steps. At the hour a toothed arm, the <b>rack</b>, is released and its tail drops onto the snail. The deeper the step, the further it falls: one tooth at one o'clock, twelve at twelve. Then a spinning <b>gathering pallet</b> lifts the rack back one tooth for each blow of the hammer. When the rack is home, the striking stops. A <b>cuckoo clock</b> counts the same way, and adds two little bellows and pipes for the call.</p>
    <p class="tip"><b>Try it:</b> press <b>Go to the hour</b>, then watch the rack fall and count the blows. Hide the dial to see the wheels.</p>`,
  terms: [
    { t: 'Motion work', d: 'The four wheels behind the dial that make the hour hand turn 12 times slower than the minute hand.' },
    { t: 'Cannon wheel', d: 'The wheel pushed onto the centre arbor that carries the minute hand. It grips by friction so the hands can be set.' },
    { t: 'Hour wheel', d: 'A 72-tooth wheel on a tube around the centre arbor. It carries the hour hand.' },
    { t: 'Snail', d: 'A cam with twelve steps on the hour wheel. Its shape tells the striking how many blows to give.' },
    { t: 'Rack', d: 'A toothed arm that falls onto the snail and is lifted back one tooth per blow.' },
  ],
  defaults: { speed: 300, dial: false, sound: false, jump: 0 },
  controls: [
    { key: 'speed', type: 'log', label: 'Speed up time', min: 1, max: 3600, ends: ['real time', '1 hour a second'], fmt: (v) => (v < 1.05 ? 'real time' : v < 90 ? `${v.toFixed(0)}× faster` : `${(v / 60).toFixed(0)} min a second`) },
    { type: 'buttons', label: 'Jump', items: [{ label: 'Go to the hour', act: (s) => { s.jump = (s.jump || 0) + 1; } }] },
    { key: 'dial', type: 'toggle', label: 'Show the dial' },
    { key: 'sound', type: 'toggle', label: 'Bell sound' },
  ],
  quiz: [
    { q: 'The minute wheel’s 6-leaf pinion drives the 72-tooth hour wheel. What ratio is that?', options: ['6 to 1', '12 to 1', '60 to 1', '72 to 1'], answer: 1, why: '72 ÷ 6 = 12. The hour hand makes one turn while the minute hand makes twelve.' },
    { q: 'Why can you turn the minute hand to set the time without forcing the gear train?', options: ['The hands are not connected to anything', 'The cannon wheel is held on the centre arbor only by friction, so it can slip', 'The pendulum stops first', 'The weight lifts off'], answer: 1, why: 'A friction fit carries the hands along in normal running but slips when you push them.' },
    { q: 'What tells a rack-striking clock how many times to strike?', options: ['The length of the pendulum', 'How deep a step of the snail the rack falls onto', 'How heavy the weight is', 'The size of the bell'], answer: 1, why: 'Each step of the snail is one tooth deeper than the last, and each blow gathers one tooth back.' },
  ],
  reel: [
    { ms: 5800, caption: 'Behind the dial, four small wheels turn the hour hand exactly 12 times slower than the minute hand.', set: { dial: false, sound: false }, anim: { speed: [200, 3000, true] }, view: fit([-0.1, 7.0, 0], [0.12, 0.04, 1], 7.8, 10.4), spin: 0.25 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); root.scale.setScalar(S); root.position.y = BASE; stage.root.add(root);
    const brass = M.metal(COL.brass, { roughness: 0.35 }), steel = M.metal(COL.steel, { roughness: 0.35 }), blued = M.metal(0x2a3b6b, { roughness: 0.3 });
    const Z = { plate: 2.6, a: 3.05, b: 3.5, snail: 3.95, rack: 4.25, dial: 5.4 };
    const plate = new THREE.Mesh(new THREE.BoxGeometry(14.5, 18.2, 0.3), M.metal(0x5c4a26, { roughness: 0.7, metalness: 0.4 })); plate.position.set(0, 0.2, Z.plate - 0.3); plate.receiveShadow = true; root.add(plate);

    // --- motion work
    const gC = new THREE.Group(), gM = new THREE.Group(), gH = new THREE.Group(); gM.position.set(MW[0], MW[1], 0);
    const put = (m, z) => { m.position.z = z; return m; };
    gC.add(put(gear(TEETH.cannon, 0.065, brass, { thick: 0.22, spokes: 3, hub: 0.42 }), Z.a), zcyl(0.2, Z.plate, Z.dial + 1.3, steel, 16));
    gM.add(put(gear(TEETH.minuteW, 0.065, brass, { thick: 0.22, spokes: 3, hub: 0.4 }), Z.a), put(gear(TEETH.minuteP, 0.06, steel, { thick: 0.5, ded: 1.3 }), Z.b), zcyl(0.1, Z.plate, Z.b + 0.4, steel, 12));
    const hourSet = new THREE.Group(); gH.add(put(gear(TEETH.hour, 0.06, brass, { thick: 0.22, spokes: 4, hub: 0.62 }), Z.b), hourSet);
    // The snail: twelve steps, each drawn where the rack's pin will meet it.
    const sh = new THREE.Shape();
    for (let h = 1; h <= 12; h++) {
      const r = snailR(h), a0 = Math.PI + (h - 0.6) * 30 * DEG, a1 = Math.PI + (h + 0.4) * 30 * DEG;
      for (let k = 0; k <= 6; k++) { const a = a0 + ((a1 - a0) * k) / 6, x = r * Math.cos(a), y = r * Math.sin(a); h === 1 && k === 0 ? sh.moveTo(x, y) : sh.lineTo(x, y); }
    }
    sh.closePath();
    const snail = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.22, bevelEnabled: false }), M.metal(0xff9c6e, { metalness: 0.5, roughness: 0.4 })); snail.position.z = Z.snail - 0.11; snail.castShadow = true;
    const pipe = zcyl(0.42, Z.b, Z.dial + 0.75, brass, 20);
    const hHour = hand(8.2, 0.8, blued, { boss: 0.7 }); hHour.position.z = Z.dial + 0.7;
    hourSet.add(snail, pipe, hHour);
    const hMin = hand(12.3, 0.55, blued, { boss: 0.5 }); hMin.position.z = Z.dial + 1.1;
    const minSet = new THREE.Group(); minSet.add(hMin); gC.add(minSet);
    root.add(gC, gM, gH);
    const dial = makeDial(14, { seconds: false, wind: false }); dial.position.z = Z.dial; root.add(dial);

    // --- rack, gathering pallet, hammer and bell
    const rack = new THREE.Group(); rack.position.set(P[0], P[1], Z.rack); root.add(rack);
    const rs = new THREE.Shape(), a0 = GATHER - TOOTH * 0.5, NT = 14;
    rs.moveTo(RACK_R * Math.cos(a0), RACK_R * Math.sin(a0));
    for (let j = 0; j < NT; j++) { const a = a0 + j * TOOTH; rs.lineTo((RACK_R + 0.32) * Math.cos(a + TOOTH * 0.15), (RACK_R + 0.32) * Math.sin(a + TOOTH * 0.15)); rs.lineTo(RACK_R * Math.cos(a + TOOTH), RACK_R * Math.sin(a + TOOTH)); }
    for (let j = NT; j >= 0; j--) { const a = a0 + j * TOOTH; rs.lineTo((RACK_R - 0.5) * Math.cos(a), (RACK_R - 0.5) * Math.sin(a)); }
    rs.closePath();
    const rackMat = M.metal(0x8ef0ff, { metalness: 0.6, roughness: 0.35 });
    const ext = (shape) => { const m = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.2, bevelEnabled: false }), rackMat); m.position.z = -0.1; m.castShadow = true; return m; };
    const bar = (ang, len, w = 0.42) => { const b = new THREE.Shape(); b.moveTo(0, -w / 2); b.lineTo(len, -w / 2); b.lineTo(len, w / 2); b.lineTo(0, w / 2); b.closePath(); const m = ext(b); m.rotation.z = ang; return m; };
    rack.add(ext(rs), bar(a0 + 1.5 * TOOTH, RACK_R - 0.3), bar(a0 + (NT - 1.5) * TOOTH, RACK_R - 0.3), bar(BETA0, TAIL), zcyl(0.3, -0.3, 0.3, steel, 16));
    const pin = zcyl(PIN, -0.6, 0.15, steel, 12); pin.position.set(TAIL * Math.cos(BETA0), TAIL * Math.sin(BETA0), 0); rack.add(pin);
    const GP = [P[0] + (RACK_R + 0.75) * Math.cos(GATHER), P[1] + (RACK_R + 0.75) * Math.sin(GATHER)];
    const gather = new THREE.Group(); gather.position.set(GP[0], GP[1], Z.rack); root.add(gather);
    gather.add(zcyl(0.28, -0.25, 0.25, steel, 16)); const finger = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.16, 0.2), steel); finger.position.x = 0.36; gather.add(finger);
    const bell = new THREE.Mesh(new THREE.SphereGeometry(2.7, 40, 20, 0, TAU, 0, Math.PI / 2), M.metal(0xe3c26a, { roughness: 0.25, side: THREE.DoubleSide, emissive: 0xffb547, emissiveIntensity: 0 }));
    bell.position.set(0, 9.9, 0.8); bell.castShadow = true; root.add(bell);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 3.4, 10), steel); post.position.set(0, 10.9, 0.8); root.add(post);
    const HP = [4.6, 3.6], HEAD = [3.25, 10.3], hl = Math.hypot(HEAD[0] - HP[0], HEAD[1] - HP[1]), ha = Math.atan2(HEAD[1] - HP[1], HEAD[0] - HP[0]);
    const hammer = new THREE.Group(); hammer.position.set(HP[0], HP[1], 0.8); root.add(hammer);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, hl, 10), steel); stem.rotation.z = ha - Math.PI / 2; stem.position.set((Math.cos(ha) * hl) / 2, (Math.sin(ha) * hl) / 2, 0); hammer.add(stem);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 12), brass); head.position.set(Math.cos(ha) * hl, Math.sin(ha) * hl, 0); head.castShadow = true; hammer.add(head, zcyl(0.3, -0.3, 0.3, steel, 12));

    const L = (t, p, cls) => stage.label(t, p, root, cls);
    const labels = [
      L('Cannon wheel: 36', [2.6, -1.6, Z.a]), L('Minute wheel: 36, pinion: 6', [-6.6, -2.6, Z.a]), L('Hour wheel: 72', [3.6, 1.8, Z.b], 'hot'),
      L('Snail: 12 steps', [1.9, -0.3, Z.snail]), L('Rack', [-6.6, 1.2, Z.rack]), L('Gathering pallet', [-6.4, 3.9, Z.rack]),
    ];
    L('Bell', [-3.7, 11.6, 0.8]); L('Hammer', [6.2, 7.2, 0.8]);
    const lCount = L('', [0, 13.6, 0.8], 'hot');

    const T0 = 2 * 3600 + 50 * 60;
    let t = T0, strike = null, jump = 0, rho = 0, flash = 0, blows = 0;
    const cAng = (time) => (-TAU * time) / 3600;
    const ref = (() => { const c = cAng(T0), mw = meshAngle(c, TEETH.cannon, TEETH.minuteW, dirCM), h = meshAngle(mw, TEETH.minuteP, TEETH.hour, dirMC); return { c, h }; })();
    const h0 = handAngles(T0);
    hourSet.rotation.z = h0.hour - ref.h; minSet.rotation.z = h0.min - ref.c;
    const hourAt = (time) => Math.round(time / 3600 - 1) % 12 + 1;
    return {
      update(dt, s) {
        dt = Math.max(0, dt);
        if (s.jump !== jump) { jump = s.jump; if (!strike) t = Math.ceil((t + 1) / 3600) * 3600 - 8 * Math.max(1, s.speed); }
        if (strike) {
          strike.u += dt;
          const n = strike.n, u = strike.u - FALL;
          if (u < 0) rho = n * TOOTH * smooth(strike.u / FALL);
          else {
            const k = Math.floor(u / BLOW), f = u / BLOW - k;
            if (k >= n) { strike = null; rho = 0; hammer.rotation.z = 0; gather.rotation.z = 0; }
            else {
              rho = (n - k - smooth(clamp((f - 0.15) / 0.5, 0, 1))) * TOOTH;                    // the pallet gathers one tooth
              gather.rotation.z = TAU * (k + smooth(clamp(f / 0.8, 0, 1)));
              hammer.rotation.z = f < 0.72 ? -0.2 * smooth(f / 0.72) : -0.2 * (1 - smooth((f - 0.72) / 0.1));  // lifted, then let fall
              if (f >= 0.82 && strike.done < k + 1) { strike.done = k + 1; flash = 1; blows++; if (s.sound) sfx('ding'); }
            }
          }
        } else {
          const t1 = t + dt * s.speed;
          if (Math.floor(t1 / 3600) > Math.floor(t / 3600)) { t = Math.floor(t1 / 3600) * 3600; strike = { n: hourAt(t), u: 0, done: 0 }; }
          else t = t1;
        }
        const c = cAng(t), mw = meshAngle(c, TEETH.cannon, TEETH.minuteW, dirCM), h = meshAngle(mw, TEETH.minuteP, TEETH.hour, dirMC);
        gC.rotation.z = c; gM.rotation.z = mw; gH.rotation.z = h;
        rack.rotation.z = -rho;
        flash = Math.max(0, flash - dt * 3); bell.material.emissiveIntensity = flash * 0.9;
        dial.userData.setOpacity(s.dial ? 1 : 0.1);
        labels.forEach((l) => { l.visible = !s.dial && !isNarrow(); });
        lCount.element.textContent = strike ? `Striking ${Math.min(strike.done + (strike.u > FALL ? 1 : 0), strike.n)} of ${strike.n}` : 'Waiting for the hour';
      },
      readout: () => {
        const mTurns = (t - T0) / 3600, r = (TEETH.minuteW / TEETH.cannon) * (TEETH.hour / TEETH.minuteP);
        return `<div class="big">${clockText(t, false)}</div>
          <div class="row"><span>Motion work</span><b>36/36 × 72/6 = ${r} to 1</b></div>
          <div class="row"><span>Minute hand has turned</span><b>${(mTurns * 360).toFixed(0)}°</b></div>
          <div class="row"><span>Hour hand has turned</span><b>${((mTurns * 360) / r).toFixed(1)}°</b></div>
          <div class="row"><span>Striking</span><b>${strike ? `${strike.n} o’clock: ${strike.n} teeth, ${strike.n} blows` : 'rack held up'}</b></div>
          <div class="row"><span>Blows in a full day</span><b>156</b></div>`;
      },
    };
  },
};
