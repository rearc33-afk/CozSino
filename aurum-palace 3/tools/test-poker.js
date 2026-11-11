// Sanity checks for hand ranking.
require('../js/util.js'); const P = require('../js/games/pokermath.js');
const h = s => s.split(' ').map(x => ({ r: '23456789TJQKA'.indexOf(x[0]), s: 'shdc'.indexOf(x[1]) }));
const cases = [['As Ks Qs Js Ts', 'Royal Flush'], ['9h 8h 7h 6h 5h', 'Straight Flush'], ['9s 9h 9d 9c 2s', 'Four of a Kind'], ['3s 3h 3d 2c 2s', 'Full House'],
  ['As 9s 7s 4s 2s', 'Flush'], ['As 2h 3d 4c 5s', 'Straight'], ['7s 7h 7d 4c 2s', 'Three of a Kind'], ['7s 7h 4d 4c 2s', 'Two Pair'], ['7s 7h 5d 4c 2s', 'One Pair'], ['As 9h 7d 4c 2s', 'High Card']];
let bad = 0; cases.forEach(c => { const n = P.name(P.eval5(h(c[0]))); if (n !== c[1]) { bad++; console.log('FAIL', c[0], n, 'expected', c[1]); } });
if (P.cmp(P.eval5(h('As 2h 3d 4c 5s')), P.eval5(h('2s 3h 4d 5c 6s'))) >= 0) { bad++; console.log('wheel should lose to six-high straight'); }
if (P.cmp(P.eval5(h('Ks Kh 5d 4c 2s')), P.eval5(h('Qs Qh As 4c 2d'))) <= 0) { bad++; console.log('kings beat queens'); }
// best hand out of seven cards
const b7 = [['As Ks 2s 7s 9s Qd Jc', 'Flush'], ['9s 9h 4d 4c 4s Kd 2c', 'Full House'], ['2s 3h 4d 5c 6s 9d Kd', 'Straight'], ['Ts Js Qs Ks As 2d 3c', 'Royal Flush'], ['As Ad 2c 7h 9d Ks 4c', 'One Pair'], ['As 2d 3c 4h 8d 9s Kc', 'High Card'], ['As 2s 3s 4s 9s 5h 5d', 'Flush']];
b7.forEach(c => { const n = P.name(P.best(h(c[0]))); if (n !== c[1]) { bad++; console.log('FAIL best7', c[0], n, 'expected', c[1]); } });
if (P.strength(h('As Ad'), []) <= P.strength(h('7s 2d'), [])) { bad++; console.log('aces beat seven-deuce'); }
console.log(bad ? 'FAIL' : 'poker ranking OK'); process.exit(bad ? 1 : 0);
