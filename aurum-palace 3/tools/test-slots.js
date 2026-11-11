// Monte Carlo check of the slot maths: return to player, hit rate, free-spin and jackpot frequency.
require('../js/util.js'); const S = require('../js/games/slotmath.js'); const C = globalThis.Casino;
const rng = C.mulberry32(12345), N = +process.argv[2] || 2000000;
let paid = 0, won = 0, hits = 0, bonus = 0, jp = 0, freeSpinsPlayed = 0, rtpBase = 0;
for (let i = 0; i < N; i++) {
  let s = S.spin(rng, false), u = s.lineUnits + s.scatterUnits; rtpBase += u;
  if (s.lineUnits + s.scatterUnits > 0) hits++;
  if (s.jackpot) jp++;
  let q = s.spinsWon; if (q) bonus++;
  while (q > 0) { q--; freeSpinsPlayed++; const f = S.spin(rng, true); u += f.lineUnits + f.scatterUnits; if (f.jackpot) jp++; q += f.spinsWon; }
  won += u; paid += 1;
}
console.log('spins', N, '| RTP (no jackpot) %', (won / paid * 100).toFixed(1), '| base-game only %', (rtpBase / N * 100).toFixed(1));
console.log('hit rate %', (hits / N * 100).toFixed(1), '| bonus every', Math.round(N / bonus), 'spins | jackpot every', jp ? Math.round(N / jp) : 'never', 'spins');
const jpShare = (jp / N) * 12500 / 100; console.log('jackpot adds about %', (jpShare * 100).toFixed(1), 'at $12.5k pool, max bet $100 only');
