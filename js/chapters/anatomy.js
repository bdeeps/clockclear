// Chapter 1: take a weight-driven pendulum wall clock apart.
import { THREE, M, exploder, tube } from '../kit.js';
import { fit, isNarrow, makeMovement, driveEscapement, clockText, zcyl, POS, COL, DRIVE, TEETH, trainRatios, SECONDS_PENDULUM } from '../clock.js';

const S = 0.06;                                  // scene units per centimetre: the case is 1.7 m tall
const LIFT = 9.6;                                // height of the dial centre above the floor, in scene units
const VIEWS = {
  whole: fit([0, 5.5, 0], [0.5, 0.07, 1], 6.5, 11.4, { shiftX: 1.9 }),
  works: fit([0, 9.5, 0.2], [1.7, 0.4, 1], 3.0, 2.3, { shiftX: 0.2, top: 0.1 }),
};
const inReel = () => document.body.classList.contains('gb-reel');
// Energy stored by winding: m·g·h, and the average power as it runs down over eight days.
const E_J = DRIVE.massKg * 9.81 * DRIVE.dropM, P_UW = (E_J / (8 * 86400)) * 1e6;

export default {
  id: 'anatomy',
  short: 'Inside the clock',
  title: 'Inside a pendulum clock',
  subtitle: 'A falling weight, a train of gears, an escapement, a pendulum, and hands.',
  view: VIEWS.whole,
  learn: `<p>A mechanical clock is five things in a row. First, <b>power</b>: a heavy <b>weight</b> on a line wound round a <b>drum</b>. As it sinks, it tries to spin the drum. Smaller clocks use a coiled <b>mainspring</b> instead (springs are the story of <a href="https://glassbox.how/hookeclear/" target="_blank" rel="noopener">HookeClear</a>).</p>
    <p>Second, the <b>gear train</b>: brass wheels between two plates that pass the push along and speed it up. Third, the <b>escapement</b>: a toothed <b>escape wheel</b> and a rocking <b>anchor</b> that let the train move one tooth at a time. Without it, the weight would crash to the floor in seconds.</p>
    <p>Fourth, the <b>pendulum</b>, the clock's timekeeper. Each swing takes the same time, and each swing lets one tooth go. Fifth, the <b>dial and hands</b>, which simply count the swings.</p>
    <p>So a clock does not measure time directly. It <b>counts swings</b>. This one counts 3,600 an hour.</p>
    <p class="tip"><b>Try it:</b> pick <b>The works</b>, then slide <b>Take it apart</b> and find the five parts. Swap the weight for a spring.</p>`,
  terms: [
    { t: 'Movement', d: 'The working mechanism of a clock: everything except the case, dial and hands.' },
    { t: 'Going train', d: 'The set of gears that carries power from the weight or spring to the escapement.' },
    { t: 'Escapement', d: 'The part that releases the gear train one small step for each swing of the pendulum.' },
    { t: 'Pendulum', d: 'A weight on a rod that swings to and fro at a steady rate.' },
    { t: 'Arbor', d: 'A clockmaker’s word for an axle.' },
  ],
  defaults: { explode: 0, look: 'whole', power: 'weight' },
  controls: [
    { key: 'look', type: 'seg', label: 'Look at', options: [{ v: 'whole', label: 'Whole clock' }, { v: 'works', label: 'The works' }] },
    { key: 'explode', type: 'range', label: 'Take it apart', min: 0, max: 1, step: 0.01, ends: ['together', 'exploded'], fmt: (v) => Math.round(v * 100) + '%' },
    { key: 'power', type: 'seg', label: 'Driven by', options: [{ v: 'weight', label: 'Falling weight' }, { v: 'spring', label: 'Mainspring' }] },
  ],
  quiz: [
    { q: 'What actually keeps the time in a pendulum clock?', options: ['The weight', 'The hands', 'The steady swing of the pendulum', 'The dial'], answer: 2, why: 'The pendulum swings at a steady rate. Everything else either powers it or counts its swings.' },
    { q: 'What would happen if you removed the escapement?', options: ['The clock would stop at once', 'The gears would spin freely and the weight would drop fast', 'The clock would run a little slow', 'Nothing'], answer: 1, why: 'The escapement holds the train back and lets it move one tooth per swing. Without it nothing stops the weight.' },
    { q: 'What is the weight for?', options: ['To keep the case steady', 'To store the energy that drives the clock', 'To set the time', 'To make the pendulum heavier'], answer: 1, why: 'Winding lifts the weight. As it falls it gives that energy back, a little with every tick.' },
  ],
  reel: [
    { ms: 5200, caption: 'A pendulum clock does not measure time. It counts swings.', set: { look: 'whole', explode: 0, power: 'weight' }, view: fit([0, 5.5, 0], [0.45, 0.07, 1], 4.4, 11.2), spin: 0.5 },
    { ms: 5600, caption: 'Inside: a falling weight, a train of gears, an escapement and a pendulum.', set: { look: 'works', power: 'weight' }, anim: { explode: [0, 1] }, view: fit([0, 9.5, 0.45], [1.15, 0.3, 1], 2.6, 2.6), spin: 0.5 },
  ],

  build({ stage }) {
    const mv = makeMovement({ type: 'deadbeat' });
    const clock = new THREE.Group(); clock.scale.setScalar(S); clock.position.y = LIFT; stage.root.add(clock);
    clock.add(mv.group);
    mv.setWeight(34);

    // The case: back board, sides, top and bottom, and a glass front.
    const wood = M.matte(COL.wood), dark = M.matte(COL.woodDark);
    const mk = (w, h, d, x, y, z, mat = wood) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; return m; };
    const caseG = new THREE.Group(); clock.add(caseG);
    const TOP = 21, BOT = -150, H = TOP - BOT, MID = (TOP + BOT) / 2;
    caseG.add(mk(38, H, 1.5, 0, MID, -9.5, dark), mk(1.6, H, 17, -19, MID, -1.5), mk(1.6, H, 17, 19, MID, -1.5), mk(42, 3, 20, 0, TOP + 1.5, -1.5), mk(42, 3, 20, 0, BOT - 1.5, -1.5), mk(30, 6, 14, 0, TOP + 6, -3, dark));
    const glassMat = M.clear(0xcfe8ff, 0.1); const glass = new THREE.Mesh(new THREE.BoxGeometry(36.4, H, 0.3), glassMat); glass.position.set(0, MID, 7); caseG.add(glass);
    const wall = new THREE.Mesh(new THREE.BoxGeometry(260, 215, 2), M.matte(0x1a1f2b)); wall.position.set(0, -52, -11.5); wall.receiveShadow = true; clock.add(wall);

    // The other way to store energy: a mainspring coiled inside a barrel, in place of drum and weight.
    const spring = new THREE.Group(); spring.position.set(POS.G[0], POS.G[1], 0); clock.add(spring);
    const pts = []; for (let i = 0; i <= 300; i++) { const a = (i / 300) * 11 * Math.PI * 2, r = 0.5 + (i / 300) * 2.9; pts.push([r * Math.cos(a), r * Math.sin(a), 0]); }
    const coil = tube(pts, 0.07, M.metal(0x6f8fd0, { roughness: 0.3 }), false, 900); coil.scale.z = 9; coil.position.z = -0.6;
    spring.add(coil, zcyl(3.6, -2.0, 0.85, M.clear(COL.brass, 0.25, { metalness: 0.4 }), 48));

    const setExplode = exploder([
      { obj: mv.hands, off: [0, 0, 19] }, { obj: mv.dialG, off: [0, 0, 15] }, { obj: mv.motion, off: [0, 0, 9] },
      { obj: mv.front, off: [0, 0, 5] }, { obj: mv.back, off: [0, 0, -4] }, { obj: mv.pend, off: [0, 0, -8] },
    ]);

    const L = (text, obj, pos, cls) => stage.label(text, pos, obj, cls);
    const outer = [
      L('Dial and hands', mv.dialG, [11, 13, 5], 'hot'), L('Pendulum rod', mv.pend, [3, POS.A[1] - 45, -5.6]),
      L('Bob', mv.pend, [9, POS.A[1] + 1.2 - SECONDS_PENDULUM * 100, -5.6]), L('Rating nut', mv.pend, [-7, POS.A[1] - SECONDS_PENDULUM * 100 - 6.5, -5.6]),
      L('Case with a glass door', caseG, [21, -128, 8]),
    ];
    const lWeight = L('Weight: 5.4 kg', mv.hang, [-7, -12, 0], 'hot'), lPulley = L('Pulley', mv.hang, [-9, 3, 0]);
    const inner = [
      L('Escape wheel', mv.going, [3.2, 4.4, -1.2], 'hot'), L('Anchor', mv.going, [-3.4, 7.4, -1.2]), L('Third wheel', mv.going, [4.6, 2.0, 0.5]),
      L('Centre wheel: once an hour', mv.going, [-7.5, -1.6, 2]), L('Great wheel and drum', mv.going, [5.4, -5.6, 1.2]),
      L('Front plate', mv.front, [-5.2, -8.6, 2.6]), L('Back plate', mv.back, [5.6, 6.6, -2.6]), L('Motion work: 12 to 1', mv.motion, [-4.2, -2.6, 3.4]),
      L('Crutch', mv.pend, [1.6, -1.5, -4.0]),
    ];
    const lSpring = L('Mainspring in its barrel', spring, [6.5, -3.4, 1.2], 'hot');

    let beats = 0.5, look = 'whole', first = true;
    return {
      update(dt, s) {
        dt = Math.max(0, dt);
        const b1 = beats + dt; driveEscapement(mv.esc.model, beats, b1); beats = b1; mv.pose();
        setExplode(s.explode);
        if (s.look !== look) { look = s.look; if (!inReel() && !first) stage.setView(VIEWS[look].pos, VIEWS[look].target, 1.1); }
        first = false;
        const works = s.look === 'works', open = s.explode > 0.25, sp = s.power === 'spring';
        mv.dialMesh.userData.setOpacity(works && !open ? 0.1 : 1);
        glassMat.opacity = works ? 0.02 : 0.1;
        mv.plateMat.opacity = open ? 0.3 : 0.16;
        mv.wg.visible = !sp; mv.drumGroup.visible = !sp; spring.visible = sp; spring.rotation.z = mv.arbors.G.rotation.z;
        const narrow = isNarrow();
        outer.forEach((l) => { l.visible = !works; }); outer[1].visible = outer[4].visible = !works && !narrow;
        lWeight.visible = !works && !sp; lPulley.visible = !works && !sp && !narrow;
        inner.forEach((l) => { l.visible = works; });
        inner[4].visible = works && !sp; lSpring.visible = works && sp;
        inner[5].visible = inner[6].visible = inner[7].visible = works && open;
      },
      readout: (s) => {
        const r = trainRatios(TEETH);
        const power = s.power === 'spring'
          ? '<div class="row"><span>Energy store</span><b>a wound steel spring</b></div><div class="row"><span>Its push</span><b>fades as it unwinds</b></div>'
          : `<div class="row"><span>Energy in the wound weight</span><b>${E_J.toFixed(0)} J</b></div><div class="row"><span>Spent over 8 days</span><b>${P_UW.toFixed(0)} millionths of a watt</b></div>`;
        return `<div class="big">${clockText(mv.shown())}</div>
          <div class="row"><span>Pendulum</span><b>${(SECONDS_PENDULUM * 100).toFixed(1)} cm, one swing a second</b></div>
          <div class="row"><span>Swings counted</span><b>${r.beatsPerHour.toLocaleString('en')} an hour</b></div>${power}`;
      },
    };
  },
};
