// Headless smoke test: runs the whole game against stubbed THREE/DOM objects to catch typos and logic errors.
// It cannot judge visuals; open index.html in a browser for that.
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const stub = () => { const f = function () {}; const p = new Proxy(f, { get(t, k) { if (k === Symbol.toPrimitive) return () => 0; if (k === 'then') return undefined; if (k in t && k !== 'name' && k !== 'length') return t[k]; return p; }, set(t, k, v) { t[k] = v; return true; }, apply() { return p; }, construct() { return p; } }); return p; };
const el = () => { const e = stub(); e.dataset = {}; e.classList = { toggle() {}, add() {}, contains() { return false; } }; e.style = {}; e.innerHTML = ''; e.textContent = ''; e.hidden = false; e.offsetHeight = 300; return e; };
const timers = []; let now = 0;
const g = globalThis;
g.THREE = stub();
g.window = g; g.devicePixelRatio = 1; g.innerWidth = 1280; g.innerHeight = 720;
g.addEventListener = () => {}; g.matchMedia = () => ({ matches: false });
g.document = { querySelector: () => el(), createElement: () => { const c = el(); c.getContext = () => stub(); return c; }, addEventListener() {}, fonts: { load: () => Promise.resolve(), ready: Promise.resolve() }, body: { classList: { add() {} } } };
g.localStorage = { getItem: () => null, setItem() {} };
g.performance = { now: () => now };
let rafCb = null; g.requestAnimationFrame = cb => { rafCb = cb; };
g.setTimeout = (fn, ms) => { timers.push({ t: now + (ms || 0), fn }); return timers.length; }; g.clearTimeout = () => {}; g.setInterval = () => 0; g.clearInterval = () => {};
const flush = ms => { const end = now + ms; for (;;) { timers.sort((a, b) => a.t - b.t); if (!timers.length || timers[0].t > end) break; const x = timers.shift(); now = Math.max(now, x.t); x.fn(); } now = end; };
const files = ['util', 'maze', 'ui', 'run', 'audio', 'engine', 'carpet', 'props', 'npcs', 'build', 'anim', 'games/slotmath', 'games/pokermath', 'games/slots', 'games/blackjack', 'games/poker', 'games/holdem', 'games/roulette', 'world'];
files.forEach(f => vm.runInThisContext(fs.readFileSync(path.join(root, 'js', f + '.js'), 'utf8'), { filename: f }));
const C = g.Casino; let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } };

// boot a few different mazes
for (const seed of [1, 7, 42, 999, 31337]) {
  C.World.newMaze ? 0 : C.World.init();
}
ok(C.World.init(), 'init');
const lv = (seed) => { C.World.newMaze(seed); };
for (const s of [1, 7, 42, 999, 31337, 5, 6, 8, 9]) lv(s);
for (let i = 0; i < 400; i++) { now += 16; rafCb(now); }
ok(true, 'ran 400 frames');

// play every game through its main flows
const B = C.bank, G2 = C.Games, fake = (o) => ({ dataset: o || {} });
B.set(100000);
const st = { theme: 'TEST', cam: { p: [0, 1, 0], l: [0, 1, 0] }, wheel: { world: { x: 0, z: 0 }, spin: null, pivot: stub(), ball: stub(), cx: -2, theta: 0, omega0: .35, p: 0, phiLock: 0, auto: 5 } };
let S = G2.slots; S.open(st); for (let i = 0; i < 60; i++) { S.onClick('bet', fake({ v: [5, 10, 25, 50, 100][i % 5] })); S.onClick('spin'); flush(4000); if (S.gamble === null && S.lastWin > 0 && i % 3 === 0) { S.onClick('gamble'); S.onClick('gr'); flush(2000); S.onClick('collect'); } } S.close(); ok(S.timers.length === 0, 'slots timers');
let BJ = G2.blackjack; BJ.open(st);
for (let i = 0; i < 80; i++) {
  BJ.onClick('chip', fake({ v: 25 })); if (i % 4 === 0) BJ.onClick('pp'); BJ.onClick('deal'); flush(3000);
  let guard = 0; while (guard++ < 12 && ['insurance', 'play'].includes(BJ.phase)) { if (BJ.phase === 'insurance') BJ.onClick(i % 2 ? 'ins' : 'noins'); else { const r = (i + guard) % 4; BJ.onClick(r === 0 ? 'split' : r === 1 ? 'double' : r === 2 ? 'hit' : 'stand'); } flush(3000); }
  flush(5000); ok(BJ.phase === 'done' || BJ.phase === 'bet', 'bj phase ' + BJ.phase); BJ.onClick('change');
}
BJ.close();
let PK = G2.poker; PK.open(st);
for (let i = 0; i < 80; i++) {
  PK.onClick('chip', fake({ v: 25 })); PK.onClick('deal'); PK.onClick('hold', fake({ i: '0' })); PK.onClick('hold', fake({ i: '2' })); PK.onClick('draw');
  const r = i % 4; PK.onClick(r === 0 ? 'bet' : r === 1 ? 'check' : r === 2 ? 'fold' : 'check'); if (PK.phase === 'respond') PK.onClick(i % 8 < 4 ? 'call' : 'fold');
  ok(PK.phase === 'done', 'poker phase ' + PK.phase); PK.onClick('change');
}
PK.close();
let HE = G2.holdem; HE.open(st);
for (let i = 0; i < 120; i++) {
  HE.onClick('chip', fake({ v: 25 })); HE.onClick('deal');
  let g = 0; while (g++ < 12 && (HE.phase === 'act' || HE.phase === 'respond' || HE.phase === 'wait')) {
    if (HE.phase === 'act') HE.onClick((i + g) % 5 === 0 ? 'fold' : (i + g) % 2 ? 'check' : 'bet'); else if (HE.phase === 'respond') HE.onClick((i + g) % 4 === 0 ? 'fold' : 'call'); flush(1000);
  }
  ok(HE.phase === 'done', 'holdem phase ' + HE.phase); ok(!HE.busy && HE.put === 0, 'holdem settled'); HE.onClick('change');
}
HE.close();
let RL = G2.roulette; RL.open(st);
for (let i = 0; i < 40; i++) {
  RL.onClick('chip', fake({ v: 25 })); ['n17', 'red', 'dozen2', 'col1', 'n0', 'odd'].forEach(k => RL.onClick('bet', fake({ k }))); RL.onClick('spin');
  for (let k = 0; k < 600 && RL.busy; k++) { C.Level.updateWheel(st.wheel, 0.05); now += 50; flush(50); }
  ok(!RL.busy, 'roulette finished'); RL.onClick('repeat');
}
RL.close();
const L0 = C.World.level(); console.log('balance after play-throughs', B.balance, '| machines', L0.machines.length, '| stations', L0.stations.length, '| people', L0.crowdSize, '| colliders', L0.colliders.length, '| chips', L0.chips.length);
console.log(fails ? 'SMOKE FAIL ' + fails : 'smoke OK');
process.exit(fails ? 1 : 0);
