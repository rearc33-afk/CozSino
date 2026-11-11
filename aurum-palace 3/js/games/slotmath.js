/* Aurum Palace - slot machine maths (pure, no DOM). 3 reels x 3 rows, 5 paylines, wild, scatter free spins. */
(function (G) {
  var C = G.Casino = G.Casino || {};
  var SYMS = [
    { id: 'seven', g: '7', c: '#d6291a', pay: 100, w: 2 },
    { id: 'bar', g: 'BAR', c: '#b8791a', pay: 38, w: 4 },
    { id: 'bell', g: '🔔', c: '#e0a010', pay: 22, w: 6 },
    { id: 'diamond', g: '♦︎', c: '#c4202b', pay: 13, w: 8 },
    { id: 'cherry', g: '🍒', c: '#d0173a', pay: 7, w: 11 },
    { id: 'club', g: '♣︎', c: '#2a3a4a', pay: 5, w: 13 },
    { id: 'wild', g: 'W', c: '#7a3cff', pay: 0, w: 3 },
    { id: 'scatter', g: '✪', c: '#e8b020', pay: 0, w: 2 }
  ];
  var SEVEN = 0, CHERRY = 4, WILD = 6, SCAT = 7;
  var LINES = [[[0, 0], [0, 1], [0, 2]], [[1, 0], [1, 1], [1, 2]], [[2, 0], [2, 1], [2, 2]], [[0, 0], [1, 1], [2, 2]], [[2, 0], [1, 1], [0, 2]]];
  var SCAT_PAY = { 3: 2, 4: 5, 5: 15, 6: 50 }; // times the total bet
  var total = SYMS.reduce(function (a, s) { return a + s.w; }, 0);

  function pickSym(rng) { var r = rng() * total; for (var i = 0; i < SYMS.length; i++) { r -= SYMS[i].w; if (r < 0) return i; } return 5; }
  function evalLine(a, b, c) {
    var s = [a, b, c];
    if (s.indexOf(SCAT) >= 0) return null;
    var target = -1; for (var i = 0; i < 3; i++) if (s[i] !== WILD) { target = s[i]; break; }
    if (target < 0) target = SEVEN;
    var all = s.every(function (x) { return x === target || x === WILD; });
    if (all) return { sym: target, mult: SYMS[target].pay, n: 3, pure: s.every(function (x) { return x === SEVEN; }) };
    if ((a === CHERRY || a === WILD) && (b === CHERRY || b === WILD) && (a === CHERRY || b === CHERRY)) return { sym: CHERRY, mult: 1, n: 2, pure: false };
    return null;
  }
  // one spin. returns the grid, winning lines and totals in units of the total bet
  function spin(rng, free) {
    var grid = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], r, c;
    for (r = 0; r < 3; r++) for (c = 0; c < 3; c++) grid[r][c] = pickSym(rng);
    var lines = [], sum = 0, jackpot = false;
    LINES.forEach(function (ln, idx) {
      var w = evalLine(grid[ln[0][0]][ln[0][1]], grid[ln[1][0]][ln[1][1]], grid[ln[2][0]][ln[2][1]]);
      if (w) { w.line = idx; w.cells = ln; lines.push(w); sum += w.mult; if (w.pure) jackpot = true; }
    });
    var scat = 0; for (r = 0; r < 3; r++) for (c = 0; c < 3; c++) if (grid[r][c] === SCAT) scat++;
    var mult = free ? 2 : 1;
    return { grid: grid, lines: lines, lineUnits: sum / 5 * mult, scatter: scat, scatterUnits: SCAT_PAY[Math.min(scat, 6)] || 0, spinsWon: scat >= 3 ? (free ? 4 : 8) : 0, jackpot: jackpot, free: !!free };
  }
  C.SlotMath = { SYMS: SYMS, LINES: LINES, spin: spin, pickSym: pickSym, evalLine: evalLine };
  if (typeof module !== 'undefined') module.exports = C.SlotMath;
})(typeof globalThis !== 'undefined' ? globalThis : this);
