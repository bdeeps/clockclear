// Chapter 4: the going train. Tooth counts, ratios, and how long one winding lasts.
import { THREE } from '../kit.js';
import { fit, isNarrow, makeMovement, driveEscapement, clockText, trainRatios, G0, TAU, POS } from '../clock.js';

const S = 0.36;                                    // scene units per centimetre
const BASE = 12.2;                                // height of the centre arbor
const SHOW_DROP = 4.5;                           // the full fall of the weight is drawn this long (cm): the real line is far longer
const fmtDur = (h) => (h >= 48 ? `${(h / 24).toFixed(1)} days` : `${h.toFixed(1)} hours`);
const calc = (s) => {
  const r = trainRatios({ great: 96, centreP: 8, centre: 60, thirdP: 8, third: s.third, escP: 7, esc: 30, cannon: 36, minuteW: 36, minuteP: 6, hour: 72 });
  const turns = (2 * s.drop) / (Math.PI * s.drum / 1000);        // the line is doubled over a pulley: 2 m of line per metre of fall
  const hours = turns * r.g;                                     // the great wheel turns once in r.g hours
  const E = s.mass * G0 * s.drop, P = E / (hours * 3600);
  const torque = (s.mass * G0 / 2) * (s.drum / 2000);            // half the weight hangs on the drum's line
  const beat = 3600 / r.beatsPerHour;                            // seconds per beat the hands expect
  return { r, turns, hours, E, P, torque, beat, L: G0 * (beat / Math.PI) ** 2 };
};

export default {
  id: 'train',
  short: 'The gear train',
  title: 'The gear train does the counting',
  subtitle: 'Big wheels drive small pinions, so each arbor turns faster than the last.',
  view: fit([0, 7.6, 0], [0.42, 0.1, 1], 8.5, 15.4, { shiftX: 2.9 }),
  learn: `<p>The <b>going train</b> is a chain of gear pairs, each a big brass <b>wheel</b> driving a small steel <b>pinion</b>. When a wheel with 96 teeth drives a pinion with 8, the pinion turns 96 ÷ 8 = 12 times as fast, with 12 times less twisting force. (Gears and ratios are the heart of <a href="https://glassbox.how/cycleclear/" target="_blank" rel="noopener">CycleClear</a> too.)</p>
    <p>This is the classic eight-day train. The <b>great wheel</b> (96) on the drum turns once in 12 hours. It drives the <b>centre wheel</b>, which turns once an hour and carries the minute hand. The centre wheel (60) drives the third pinion (8), and the <b>third wheel</b> (56) drives the escape pinion (7): 7.5 × 8 = 60. So the <b>escape wheel</b> turns 60 times an hour, once a minute.</p>
    <p>Multiply it all: 12 × 7.5 × 8 = <b>720</b>. The escape wheel turns 720 times for each turn of the drum, and gets only 1/720 of its twist. That is why a 5 kg weight ends up pressing on the pallets as gently as a feather.</p>
    <p>The tooth counts and the pendulum must <b>agree</b>. The escape wheel's 30 teeth pass two beats each, so the hands expect 3,600 beats an hour: a one-second pendulum. Change a wheel and the clock needs a different pendulum.</p>
    <p>The weight only stores energy. A heavier one does not make the clock run faster: it just makes the pendulum swing a little wider.</p>
    <p class="tip"><b>Try it:</b> speed up time and watch the weight sink. Then give the third wheel 63 teeth and see what pendulum the clock would need.</p>`,
  terms: [
    { t: 'Wheel and pinion', d: 'In a clock, the big brass gear is a wheel and the small steel gear it drives is a pinion. Pinion teeth are called leaves.' },
    { t: 'Gear ratio', d: 'Teeth on the driving wheel divided by teeth on the pinion: how many times faster the pinion turns.' },
    { t: 'Great wheel', d: 'The first and biggest wheel, fixed to the drum that the weight turns.' },
    { t: 'Centre wheel', d: 'The wheel in the middle of the movement. It turns once an hour and carries the minute hand.' },
    { t: 'Torque', d: 'Twisting force. Each step up in speed cuts the torque by the same ratio.' },
    { t: 'Eight-day clock', d: 'A clock that runs for just over a week on one winding, so it can be wound on the same day every week.' },
  ],
  defaults: { speed: 1, mass: 5.4, drop: 1.1, drum: 44, third: 56, run: 0 },
  controls: [
    { key: 'speed', type: 'log', label: 'Speed up time', min: 1, max: 7200, ends: ['real time', '2 hours a second'], fmt: (v) => (v < 1.05 ? 'real time' : v < 90 ? `${v.toFixed(0)}× faster` : v < 5400 ? `${(v / 60).toFixed(0)} min a second` : `${(v / 3600).toFixed(1)} h a second`) },
    { key: 'third', type: 'seg', label: 'Teeth on the third wheel', options: [{ v: 49, label: '49' }, { v: 56, label: '56' }, { v: 63, label: '63' }], fmt: (v) => `60 ÷ 8 × ${v} ÷ 7` },
    { key: 'mass', type: 'range', label: 'Weight', min: 2, max: 8, step: 0.1, fmt: (v) => v.toFixed(1) + ' kg' },
    { key: 'drop', type: 'range', label: 'Room for the weight to fall', min: 0.5, max: 1.6, step: 0.05, fmt: (v) => v.toFixed(2) + ' m' },
    { key: 'drum', type: 'range', label: 'Drum diameter', min: 30, max: 60, step: 1, fmt: (v) => v + ' mm' },
    { type: 'buttons', label: 'Winding', items: [{ label: 'Wind it up', act: (s) => { s.run = (s.run || 0) + 1; } }] },
  ],
  quiz: [
    { q: 'A 60-tooth wheel drives an 8-leaf pinion. How fast does the pinion turn?', options: ['7.5 times slower', 'At the same speed', '7.5 times faster', '52 times faster'], answer: 2, why: '60 teeth must pass for one turn of the wheel, and every 8 of them turn the pinion once: 60 ÷ 8 = 7.5.' },
    { q: 'You hang a heavier weight on a pendulum clock. What happens to its timekeeping?', options: ['It runs much faster', 'It hardly changes: the pendulum still sets the pace', 'It runs backwards', 'It stops'], answer: 1, why: 'The escapement only lets the train move when the pendulum allows. More weight gives a harder push and a slightly wider swing, not a faster clock.' },
    { q: 'The great wheel turns once every 12 hours. How many turns of line must the drum hold for an eight-day clock?', options: ['8', '12', '16', '96'], answer: 2, why: 'Eight days is 192 hours, and 192 ÷ 12 = 16 turns.' },
  ],
  reel: [
    { ms: 5800, caption: 'Gears multiply the speed 720 times, from a drum that turns twice a day to a wheel that turns once a minute.', set: { third: 56, mass: 5.4, drop: 1.1, drum: 44 }, anim: { speed: [1, 240, true] }, view: fit([0, 10.4, 0], [0.35, 0.08, 1], 5.4, 9.6), spin: 0.25 },
  ],

  build({ stage }) {
    const mv = makeMovement({ type: 'deadbeat', dial: false, withPendulum: false });
    const g = new THREE.Group(); g.scale.setScalar(S); g.position.y = BASE; stage.root.add(g); g.add(mv.group);
    mv.plateMat.opacity = 0.1;
    mv.motion.visible = false;                                      // the next chapter's story
    mv.hands.visible = false; mv.hang.scale.setScalar(0.65); mv.hang.children[0].scale.setScalar(1 / 0.65);
    const L = (t, p, cls) => stage.label(t, p, mv.group, cls);
    const lG = L('', [6.4, -6.6, 1.2]), lC = L('', [7.2, -1.3, 2], 'hot'), lT = L('', [7.4, 2.9, 0.5]), lE = L('', [6.6, 6.4, -1.2]);
    const lD = L('Drum', [-4.4, -3.2, -1]), lA = L('Front plate (see-through here)', [-3, -11.2, 2.6]);
    const lW = stage.label('', [-15, -8, 0], mv.hang, 'hot');
    
    const lP = L('Crutch, to the pendulum', [6.5, 9.6, -4]);

    let beats = 0.5, hoursRun = 0, run = 0, third = 56;
    return {
      update(dt, s) {
        dt = Math.max(0, dt);
        if (s.third !== third) { third = s.third; mv.setThird(third); }
        if (s.run !== run) { run = s.run; hoursRun = 0; }
        const c = calc(s), down = hoursRun >= c.hours;
        if (!down) {
          const db = (dt * s.speed) / c.beat, b1 = beats + db; driveEscapement(mv.esc.model, beats, b1); beats = b1;
          hoursRun += db / c.r.beatsPerHour;
        }
        mv.pose();
        mv.setWeight(2 + SHOW_DROP * Math.min(1, hoursRun / c.hours));
        lG.element.textContent = `Great wheel 96: once in ${c.r.g} h`;
        lC.element.textContent = 'Centre wheel 60: once an hour';
        lT.element.textContent = `Third wheel ${s.third}: ${c.r.c} turns an hour`;
        lE.element.textContent = `Escape wheel 30: ${c.r.escPerHour} turns an hour`;
        [lG, lT, lE, lD, lA, lP].forEach((l) => { l.visible = !isNarrow(); });
        lW.element.textContent = down ? 'Run down: wind it up' : `${s.mass.toFixed(1)} kg, ${(s.drop * (1 - hoursRun / c.hours)).toFixed(2)} m left to fall`;
      },
      readout: (s) => {
        const c = calc(s), left = Math.max(0, c.hours - hoursRun);
        const pend = s.third === 56 ? `${(c.L * 100).toFixed(1)} cm: one beat a second` : `${(c.L * 100).toFixed(1)} cm: a ${c.beat.toFixed(3)} s beat`;
        return `<div class="big">Runs ${fmtDur(c.hours)} per winding</div>
          <div class="row"><span>Train</span><b>96/8 × 60/8 × ${s.third}/7 = ${c.r.total}</b></div>
          <div class="row"><span>Beats an hour</span><b>${c.r.beatsPerHour.toLocaleString('en')}</b></div>
          <div class="row"><span>Pendulum it needs</span><b>${pend}</b></div>
          <div class="row"><span>Drum turns, energy</span><b>${c.turns.toFixed(1)} turns, ${c.E.toFixed(0)} J</b></div>
          <div class="row"><span>Power used</span><b>${(c.P * 1e6).toFixed(0)} millionths of a watt</b></div>
          <div class="row"><span>Twist at drum, at escape wheel</span><b>${c.torque.toFixed(2)} N·m, ${(c.torque / c.r.total * 1000).toFixed(2)} mN·m</b></div>
          <div class="row"><span>Left to run</span><b>${left > 0 ? fmtDur(left) : 'none'} (${clockText(mv.shown(), false)})</b></div>`;
      },
    };
  },
};
