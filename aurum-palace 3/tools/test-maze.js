// Checks that every generated maze is fully connected and prints one as ASCII.
require('../js/util.js'); const M = require('../js/maze.js');
let bad = 0;
for (let s = 1; s <= 300; s++) {
  const m = M.generate(s), start = m.entry;
  const seen = new Set([start.r * M.COLS + start.c]), q = [start];
  while (q.length) { const n = q.pop(); m.neighbors(n.c, n.r).forEach(x => { const k = x.r * M.COLS + x.c; if (!seen.has(k)) { seen.add(k); q.push(x); } }); }
  if (seen.size !== M.COLS * M.ROWS) { bad++; console.log('seed', s, 'unreachable cells', M.COLS * M.ROWS - seen.size); }
  m.areas.forEach(a => { if (m.doorCount(a) < 3) { bad++; console.log('seed', s, 'area', a.type, 'doors', m.doorCount(a)); } });
}
const m = M.generate(7); let out = '';
for (let r = 0; r <= M.ROWS; r++) {
  let l1 = '', l2 = '';
  for (let c = 0; c < M.COLS; c++) {
    l1 += '+' + (r === M.ROWS || m.h[r][c] === 0 ? '--' : m.h[r][c] === 1 ? '  ' : '  ');
    if (r < M.ROWS) { const a = m.areaAt(c, r); l2 += (m.v[r][c] === 0 ? '|' : ' ') + (a ? a.type[0].toUpperCase() : (m.neighbors(c, r).length === 1 ? 'x' : ' ')) + ' '; }
  }
  out += l1 + '+\n'; if (r < M.ROWS) out += l2 + (m.v[r][M.COLS] === 0 ? '|' : ' ') + '\n';
}
console.log(out); console.log(bad ? 'FAIL ' + bad : 'maze OK (300 seeds connected, rooms have 3+ doors)', '| dead ends seed 7:', m.deadEnds().length);
process.exit(bad ? 1 : 0);
