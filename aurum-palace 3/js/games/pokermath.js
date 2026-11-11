/* Aurum Palace - five card draw hand ranking and bot decisions (pure, no DOM). */
(function (G) {
  var C = G.Casino = G.Casino || {};
  var HN = ['High Card', 'One Pair', 'Two Pair', 'Three of a Kind', 'Straight', 'Flush', 'Full House', 'Four of a Kind', 'Straight Flush'];
  // returns [category, ...tiebreakers]; ranks are 0 (two) to 12 (ace)
  function eval5(h) {
    var rs = h.map(function (c) { return c.r; }).sort(function (a, b) { return b - a; });
    var flush = h.every(function (c) { return c.s === h[0].s; }), cnt = {};
    rs.forEach(function (r) { cnt[r] = (cnt[r] || 0) + 1; });
    var gr = Object.keys(cnt).map(function (r) { return [cnt[r], +r]; }).sort(function (a, b) { return b[0] - a[0] || b[1] - a[1]; });
    var st = false, high = rs[0];
    if (gr.length === 5) { if (rs[0] - rs[4] === 4) st = true; else if (rs[0] === 12 && rs[1] === 3 && rs[4] === 0) { st = true; high = 3; } }
    var cat;
    if (st && flush) cat = 8; else if (gr[0][0] === 4) cat = 7; else if (gr[0][0] === 3 && gr[1][0] === 2) cat = 6; else if (flush) cat = 5; else if (st) cat = 4;
    else if (gr[0][0] === 3) cat = 3; else if (gr[0][0] === 2 && gr[1][0] === 2) cat = 2; else if (gr[0][0] === 2) cat = 1; else cat = 0;
    return [cat].concat(st ? [high] : gr.map(function (g) { return g[1]; }));
  }
  function cmp(a, b) { for (var i = 0; i < Math.max(a.length, b.length); i++) { var d = (a[i] || 0) - (b[i] || 0); if (d) return d > 0 ? 1 : -1; } return 0; }
  function name(e) { return e[0] === 8 && e[1] === 12 ? 'Royal Flush' : HN[e[0]]; }
  // which cards a computer player keeps
  function keep(h) {
    var e = eval5(h), cnt = {}; h.forEach(function (c) { cnt[c.r] = (cnt[c.r] || 0) + 1; });
    if (e[0] >= 4) return h.map(function () { return true; });
    if (e[0] === 0) { var s = h.slice().sort(function (a, b) { return b.r - a.r; }); return h.map(function (c) { return c === s[0] || c === s[1]; }); }
    return h.map(function (c) { return cnt[c.r] >= 2; });
  }
  // best five-card hand out of five to seven cards
  function best(cards) {
    var n = cards.length, top = null, a, b, c, d, e;
    if (n === 5) return eval5(cards);
    for (a = 0; a < n - 4; a++) for (b = a + 1; b < n - 3; b++) for (c = b + 1; c < n - 2; c++) for (d = c + 1; d < n - 1; d++) for (e = d + 1; e < n; e++) {
      var v = eval5([cards[a], cards[b], cards[c], cards[d], cards[e]]); if (!top || cmp(v, top) > 0) top = v;
    }
    return top;
  }
  // rough 0..1 strength of a hold'em hand for computer players
  function strength(hole, board) {
    var hi = Math.max(hole[0].r, hole[1].r), lo = Math.min(hole[0].r, hole[1].r), s;
    if (!board.length) {
      if (hi === lo) return 0.55 + hi / 12 * 0.4;
      s = 0.12 + (hi + lo) / 24 * 0.36 + (hole[0].s === hole[1].s ? 0.06 : 0) + (hi - lo <= 2 ? 0.05 : 0);
      return Math.min(0.9, s);
    }
    var e = best(hole.concat(board)), cat = e[0];
    if (cat === 0) return 0.12 + hi / 12 * 0.12;
    if (cat === 1) { var pr = e[1]; return (pr === hole[0].r || pr === hole[1].r) ? 0.42 + pr / 12 * 0.16 : 0.26; }
    if (cat === 2) return 0.7;
    if (cat === 3) return 0.8;
    return 0.92;
  }
  C.PokerMath = { best: best, strength: strength, eval5: eval5, cmp: cmp, name: name, keep: keep, HN: HN };
  if (typeof module !== 'undefined') module.exports = C.PokerMath;
})(typeof globalThis !== 'undefined' ? globalThis : this);
