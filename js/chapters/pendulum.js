// Chapter 2: the pendulum. Its period depends on its length and on gravity, and on almost nothing else.
import { THREE, M, box, canvasTexture, clamp } from '../kit.js';
import { fit, makePendulum, period, G0, SECONDS_PENDULUM, DEG, TAU, COL } from '../clock.js';

const S = 0.05;                                   // scene units per centimetre
const PIVOT = 10.9;
// Surface gravity, m/s² (NASA planetary fact sheets; Earth's sea-level values at the equator and poles
// from the WGS 84 gravity formula; 9.80665 is the standard value).
const PLACES = { moon: ['the Moon', 1.62], mars: ['Mars', 3.72], equator: ['the equator', 9.780], earth: ['Earth (standard)', G0], pole: ['the poles', 9.832], jupiter: ['Jupiter', 24.79] };
// Linear expansion per °C (engineering handbook values; wood is along the grain and also moves with damp).
const RODS = { steel: ['Steel', 12e-6], brass: ['Brass', 19e-6], wood: ['Wood', 4e-6], invar: ['Invar', 1.2e-6] };
const BOBS = { 0.5: 3.0, 2: 4.8, 6: 6.9 };       // bob mass (kg) to drawn radius (cm)
const NUT_MM = 1;                                 // this clock's rating nut lifts the bob 1 mm a turn
const T_REF = 20, AMP_REF = 2 * DEG;

// Effective length in metres once the rod has warmed up and the nut has been turned.
const lengthNow = (s) => s.len * (1 + RODS[s.rod][1] * (s.temp - T_REF)) - (s.nut * NUT_MM) / 1000;
const periodNow = (s) => period(lengthNow(s), PLACES[s.place][1], s.amp * DEG);
// The clock was set right at 20 °C, nut untouched, a 2° swing, on standard Earth gravity.
const rateSecPerDay = (s) => 86400 * (period(s.len, G0, AMP_REF) / periodNow(s) - 1);
const fmtRate = (r) => {
  const a = Math.abs(r);
  if (a < 0.05) return 'keeps time';
  const how = r > 0 ? 'gains' : 'loses';
  if (a < 120) return `${how} ${a.toFixed(a < 10 ? 1 : 0)} s a day`;
  if (a < 7200) return `${how} ${(a / 60).toFixed(a < 600 ? 1 : 0)} min a day`;
  return `${how} ${(a / 3600).toFixed(1)} h a day`;
};

export default {
  id: 'pendulum',
  short: 'The pendulum',
  title: 'The pendulum keeps the beat',
  subtitle: 'Its timing depends on its length and on gravity. Not on its weight.',
  view: fit([-0.2, 5.6, 0], [0, 0.07, 1], 11.6, 11.4),
  learn: `<p>Pull a pendulum aside and let go. Gravity pulls it back, it overshoots, and it swings to and fro. The time for one full swing out and back is its <b>period</b>, and it follows a simple rule: <b>T = 2π √(L ÷ g)</b>. <b>L</b> is the length from the pivot to the middle of the bob, and <b>g</b> is the strength of gravity (<a href="https://glassbox.how/gravityclear/" target="_blank" rel="noopener">GravityClear</a>).</p>
    <p>Look at what is <b>missing</b> from the rule. The bob's mass is not in it: a heavy bob and a light one keep the same time. The size of the swing is hardly in it either, as long as the swing is small. That steadiness is what makes a pendulum a good timekeeper.</p>
    <p>A pendulum <b>99.4 cm</b> long swings one way in exactly one second. Clockmakers call it the <b>seconds pendulum</b>. To make a clock tick twice as fast you need a pendulum only a quarter as long.</p>
    <p>A clock is tuned with the <b>rating nut</b> under the bob. Screw it up and the bob rises, the pendulum gets shorter and the clock runs faster. Heat does the opposite: on a hot day a steel rod grows a little longer and the clock loses a few seconds. Makers fought this with wooden rods, the <b>gridiron</b> of brass and steel, and later <b>invar</b>, a nickel steel that barely grows at all.</p>
    <p class="tip"><b>Try it:</b> change the bob's mass and watch the period stay put. Then take the clock to the Moon, or warm the room by 20 °C.</p>`,
  terms: [
    { t: 'Period', d: 'The time for one complete swing, there and back.' },
    { t: 'Beat', d: 'One swing in one direction: half a period. Each beat makes one tick.' },
    { t: 'Seconds pendulum', d: 'A pendulum about 99.4 cm long whose beat lasts exactly one second.' },
    { t: 'Rating nut', d: 'The nut under the bob. Turning it raises or lowers the bob to make the clock run faster or slower.' },
    { t: 'Thermal expansion', d: 'Most materials grow slightly when they warm up. A longer pendulum swings more slowly.' },
    { t: 'Invar', d: 'A steel with 36% nickel that hardly expands with heat, used for the best pendulum rods.' },
  ],
  defaults: { len: 0.9936, place: 'earth', amp: 2, mass: 2, rod: 'steel', temp: 20, nut: 0 },
  controls: [
    { key: 'len', type: 'range', label: 'Length', min: 0.2, max: 2, step: 0.0002, fmt: (v) => (v * 100).toFixed(1) + ' cm' },
    { key: 'place', type: 'seg', label: 'Gravity', options: Object.entries(PLACES).map(([v, [n]]) => ({ v, label: n.replace('the ', '').replace(' (standard)', '').replace(/^./, (c) => c.toUpperCase()) })), fmt: (v) => PLACES[v][1].toFixed(2) + ' m/s²' },
    { key: 'amp', type: 'range', label: 'Size of swing', min: 1, max: 60, step: 0.5, fmt: (v) => '±' + v.toFixed(1) + '°' },
    { key: 'mass', type: 'seg', label: 'Bob', options: [{ v: 0.5, label: '0.5 kg' }, { v: 2, label: '2 kg' }, { v: 6, label: '6 kg' }] },
    { key: 'rod', type: 'seg', label: 'Rod made of', options: Object.entries(RODS).map(([v, [n]]) => ({ v, label: n })) },
    { key: 'temp', type: 'range', label: 'Room temperature', min: 0, max: 45, step: 1, ends: ['winter', 'summer'], fmt: (v) => v + ' °C' },
    { key: 'nut', type: 'range', label: 'Rating nut', min: -5, max: 5, step: 0.25, ends: ['bob down', 'bob up'], fmt: (v) => (v === 0 ? 'untouched' : `${Math.abs(v)} turn${Math.abs(v) === 1 ? '' : 's'} ${v > 0 ? 'up' : 'down'}`) },
  ],
  quiz: [
    { q: 'You swap a pendulum’s bob for one three times heavier, at the same length. The period…', options: ['Gets three times longer', 'Gets shorter', 'Stays the same', 'Doubles'], answer: 2, why: 'Mass is not in T = 2π√(L/g). Gravity pulls harder on a heavier bob, but a heavier bob is also harder to move, and the two cancel.' },
    { q: 'To make a pendulum swing twice as fast, its length must be…', options: ['Half as long', 'A quarter as long', 'Twice as long', 'Four times as long'], answer: 1, why: 'The period goes with the square root of the length, so a quarter of the length gives half the period.' },
    { q: 'Why does a clock with a steel pendulum lose time in summer?', options: ['The oil gets thin', 'The rod expands, and a longer pendulum swings more slowly', 'Gravity is weaker in summer', 'The weight gets lighter'], answer: 1, why: 'Steel grows about 12 millionths of its length per °C. A 20 °C rise costs about 10 seconds a day.' },
  ],
  reel: [
    { ms: 5600, caption: 'A pendulum 99.4 cm long takes exactly one second per swing, whatever its bob weighs.', set: { len: 0.994, place: 'earth', amp: 6, mass: 2, temp: 20, nut: 0, rod: 'steel' }, view: fit([2.6, 7.8, 0], [0, 0.03, 1], 4.2, 7.2), spin: 0.2 },
    { ms: 5600, caption: 'Its timing depends only on length and gravity: make it a quarter as long and it ticks twice as fast.', set: { place: 'earth', amp: 6, mass: 2 }, anim: { len: [0.994, 0.2485] }, view: fit([2.6, 7.8, 0], [0, 0.03, 1], 4.2, 7.2), spin: 0.2 },
  ],

  build({ stage }) {
    // A wall bracket holding the pendulum, and a pale twin behind it: the seconds pendulum on Earth, for comparison.
    const rig = new THREE.Group(); rig.position.set(2.6, PIVOT, 0); rig.scale.setScalar(S); stage.root.add(rig);
    const wall = box(260, 240, 3, M.matte(0x1a1f2b)); wall.position.set(-45, -100, -14); wall.castShadow = false; rig.add(wall);
    const bracket = box(14, 3, 12, M.matte(COL.wood)); bracket.position.set(0, 2.5, -7); rig.add(bracket);
    const pend = makePendulum(99.4, { z: 0 }); rig.add(pend);
    const ghostMat = M.ghost(0x8ef0ff, 0.22);
    const twin = makePendulum(SECONDS_PENDULUM * 100, { z: -7, rodMat: ghostMat, bobMat: ghostMat }); rig.add(twin);
    twin.children.forEach((c) => { c.material = ghostMat; c.castShadow = false; });
    // A scale on the wall, marked every 20 cm.
    for (let i = 1; i <= 10; i++) { const t = box(i % 5 ? 5 : 9, 0.5, 0.4, M.glow(0x5b6578)); t.position.set(-34, -i * 20, -12); t.castShadow = false; rig.add(t); if (i % 5 === 0) stage.label(`${i / 5} m`, [-45, -i * 20, -12], rig); }

    const lLen = stage.label('', [0, 0, 0], rig, 'hot'), lTwin = stage.label('Seconds pendulum on Earth', [0, 0, -7], rig);
    const lNut = stage.label('Rating nut', [0, 0, 0], rig);
    stage.label('Pivot', [9, 2.5, 0], rig);

    // A scrolling trace of both swings.
    const N = 240, SPAN = 8, hist = { a: new Float32Array(N), b: new Float32Array(N), i: 0, acc: 0 };
    const info = { T: 2 };
    for (let k = 0; k < N; k++) { hist.a[k] = hist.b[k] = Math.sin(Math.PI / 2 + (k / N) * SPAN * Math.PI); }
    const chart = canvasTexture(640, 400, (g, w, h) => {
      g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(7,8,12,.84)'; g.fillRect(0, 0, w, h);
      const x0 = 30, cw = w - 60, mid = 215, amp = 110;
      g.strokeStyle = 'rgba(255,255,255,.16)'; g.lineWidth = 2;
      for (let i = 0; i <= SPAN; i++) { const x = x0 + (cw * i) / SPAN; g.beginPath(); g.moveTo(x, mid - amp - 12); g.lineTo(x, mid + amp + 12); g.stroke(); }
      g.beginPath(); g.moveTo(x0, mid); g.lineTo(x0 + cw, mid); g.stroke();
      const line = (arr, col, lw) => { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); for (let k = 0; k < N; k++) { const v = arr[(hist.i + k) % N], x = x0 + (cw * k) / (N - 1), y = mid - amp * v; k ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); };
      line(hist.b, 'rgba(142,240,255,.55)', 4); line(hist.a, '#ff7a59', 6);
      g.fillStyle = '#fff'; g.font = '600 34px sans-serif'; g.fillText('T = 2π √(L ÷ g)', x0, 44);
      g.font = '600 27px sans-serif'; g.fillStyle = '#ff7a59'; g.fillText(`this one: ${info.T.toFixed(3)} s`, x0, 84);
      g.fillStyle = 'rgba(142,240,255,.85)'; g.fillText('pale twin: 2.000 s', x0 + 300, 84);
      g.fillStyle = 'rgba(255,255,255,.6)'; g.font = '26px sans-serif'; g.fillText('one square = 1 second', x0, h - 20);
    });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(5.9, 3.69), new THREE.MeshBasicMaterial({ map: chart.tex, transparent: true, toneMapped: false }));
    board.position.set(-2.9, 2.6, 0.6); stage.root.add(board);

    let ph = Math.PI / 2, ph0 = Math.PI / 2;
    return {
      update(dt, s) {
        dt = Math.max(0, dt);
        const T = periodNow(s), a = s.amp * DEG, L = lengthNow(s) * 100, r = BOBS[s.mass];
        info.T = T;
        ph += (dt * TAU) / T; ph0 += (dt * TAU) / 2;
        const th = a * Math.sin(ph), th0 = clamp(a, 0, 8 * DEG) * Math.sin(ph0);
        pend.userData.set(L, r); pend.rotation.z = th; twin.rotation.z = th0;
        lLen.element.textContent = `Length ${L.toFixed(1)} cm`;
        lLen.position.set(Math.sin(th) * L * 0.5 + 16, -Math.cos(th) * L * 0.5, 0);
        lNut.position.set(Math.sin(th) * (L + r + 2) + 9, -Math.cos(th) * (L + r + 2) - 3, 0);
        lTwin.position.set(-30, -62, -7);
        hist.acc += dt;
        while (hist.acc > SPAN / N) { hist.acc -= SPAN / N; hist.a[hist.i] = Math.sin(ph); hist.b[hist.i] = Math.sin(ph0); hist.i = (hist.i + 1) % N; }
        chart.redraw();
      },
      readout: (s) => {
        const T = periodNow(s), g = PLACES[s.place][1], r = rateSecPerDay(s), grow = (lengthNow(s) - s.len) * 1000;
        return `<div class="big">Period ${T.toFixed(T < 10 ? 3 : 2)} s</div>
          <div class="row"><span>One beat</span><b>${(T / 2).toFixed(3)} s, ${Math.round(7200 / T).toLocaleString('en')} an hour</b></div>
          <div class="row"><span>Gravity on ${PLACES[s.place][0]}</span><b>${g.toFixed(2)} m/s²</b></div>
          <div class="row"><span>Rod is now</span><b>${grow >= 0 ? '+' : '−'}${Math.abs(grow).toFixed(2)} mm</b></div>
          <div class="row"><span>A clock set right at 20 °C</span><b ${Math.abs(r) < 0.05 ? 'class="ok"' : ''}>${fmtRate(r)}</b></div>`;
      },
    };
  },
};
