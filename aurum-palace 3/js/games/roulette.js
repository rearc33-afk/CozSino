/* Aurum Palace - lightning roulette: single zero, every spin 3 lucky numbers pay 50x to 500x, other straight-ups pay 29 to 1. */
(function (G) {
  var C = G.Casino = G.Casino || {}, $ = C.$, fmt = C.fmt, U = C.ui, RED = null;
  C.Games = C.Games || {};
  var MULTS = [[50, 0.5], [100, 0.3], [200, 0.12], [300, 0.06], [500, 0.02]];
  function pickMult() { var r = Math.random(); for (var i = 0; i < MULTS.length; i++) { r -= MULTS[i][1]; if (r < 0) return MULTS[i][0]; } return 50; }
  function pay(k, n, lucky) {
    if (k[0] === 'n') { var v = +k.slice(1); if (v !== n) return 0; for (var i = 0; i < lucky.length; i++) if (lucky[i].n === n) return lucky[i].m; return 30; }
    if (n === 0) return 0;
    switch (k) {
      case 'dozen1': return n <= 12 ? 3 : 0; case 'dozen2': return n > 12 && n <= 24 ? 3 : 0; case 'dozen3': return n > 24 ? 3 : 0;
      case 'col1': return n % 3 === 1 ? 3 : 0; case 'col2': return n % 3 === 2 ? 3 : 0; case 'col3': return n % 3 === 0 ? 3 : 0;
      case 'low': return n <= 18 ? 2 : 0; case 'high': return n >= 19 ? 2 : 0; case 'even': return n % 2 === 0 ? 2 : 0; case 'odd': return n % 2 === 1 ? 2 : 0;
      case 'red': return C.RED[n] ? 2 : 0; case 'black': return !C.RED[n] ? 2 : 0;
    }
    return 0;
  }
  C.RoulettePay = pay;

  var RL = C.Games.roulette = {
    bets: {}, prev: null, chip: 5, hist: [], counts: [], lucky: [], msg: '', win: false, busy: false, st: null,
    open: function (st) {
      $('#gtitle').textContent = 'Lightning Roulette'; this.st = st; st.wheel.owned = true; this.bets = {}; this.busy = false; this.win = false;
      if (!this.counts.length) for (var i = 0; i < 37; i++) this.counts.push(0);
      this.rollLucky(); this.msg = 'Lucky numbers pay up to 500 to 1. Tap the board to bet, then spin.'; this.render();
    },
    close: function () { if (this.st) this.st.wheel.owned = false; this.clear(true); },
    rollLucky: function () { var s = {}, out = []; while (out.length < 3) { var n = 1 + Math.floor(Math.random() * 36); if (!s[n]) { s[n] = 1; out.push({ n: n, m: pickMult() }); } } this.lucky = out; },
    total: function () { var t = 0; for (var k in this.bets) t += this.bets[k]; return t; },
    clear: function (silent) { C.bank.add(this.total()); this.bets = {}; if (!silent) this.render(); },
    luckyOf: function (n) { for (var i = 0; i < this.lucky.length; i++) if (this.lucky[i].n === n) return this.lucky[i]; return null; },
    cell: function (k, label, cls, style) {
      var a = this.bets[k], lk = k[0] === 'n' ? this.luckyOf(+k.slice(1)) : null;
      return '<button class="cell ' + cls + (lk ? ' lucky' : '') + '" data-a="bet" data-k="' + k + '" style="' + style + '">' + label + (lk ? '<sup>⚡' + lk.m + '</sup>' : '') + (a ? '<em>' + a + '</em>' : '') + '</button>';
    },
    render: function () {
      var b = '<div class="board">' + this.cell('n0', '0', 'zero', 'grid-row:1/4;grid-column:1'), r, c, self = this;
      for (r = 0; r < 3; r++) for (c = 0; c < 12; c++) { var n = (c + 1) * 3 - r; b += this.cell('n' + n, n, C.RED[n] ? 'red' : 'blk', 'grid-row:' + (r + 1) + ';grid-column:' + (c + 2)); }
      b += this.cell('col3', '2:1', 'out', 'grid-row:1;grid-column:14') + this.cell('col2', '2:1', 'out', 'grid-row:2;grid-column:14') + this.cell('col1', '2:1', 'out', 'grid-row:3;grid-column:14');
      b += this.cell('dozen1', '1st 12', 'out', 'grid-row:4;grid-column:2/6') + this.cell('dozen2', '2nd 12', 'out', 'grid-row:4;grid-column:6/10') + this.cell('dozen3', '3rd 12', 'out', 'grid-row:4;grid-column:10/14');
      [['low', '1-18', 'out', 2], ['even', 'Even', 'out', 4], ['red', 'Red', 'red', 6], ['black', 'Black', 'blk', 8], ['odd', 'Odd', 'out', 10], ['high', '19-36', 'out', 12]].forEach(function (a) { b += self.cell(a[0], a[2] === 'out' ? a[1] : '', a[2], 'grid-row:5;grid-column:' + a[3] + '/' + (a[3] + 2)); });
      b += '</div>';
      var hist = this.hist.map(function (n) { return '<span class="pip ' + (n === 0 ? 'zero' : C.RED[n] ? 'red' : 'blk') + '">' + n + '</span>'; }).join(''), hot = 0, hn = -1;
      this.counts.forEach(function (v, i) { if (v > hot) { hot = v; hn = i; } });
      $('#gbody').innerHTML = '<div class="row">' + U.chips([1, 5, 25, 100], this.chip, 'chip') + '<b>On the table ' + fmt(this.total()) + '</b><div class="hist">' + hist + '</div>' + (hot >= 2 ? '<span class="hot">Hot ' + hn + ' (' + hot + 'x)</span>' : '') + '</div>'
        + '<div class="lightning">' + this.lucky.map(function (l) { return '<span>⚡ ' + l.n + ' <b>' + l.m + 'x</b></span>'; }).join('') + '</div>'
        + '<div class="board-wrap">' + b + '</div><div class="msg' + (this.win ? ' win' : '') + '">' + this.msg + '</div>'
        + '<div class="row c"><button class="btn" data-a="clear"' + (this.busy ? ' disabled' : '') + '>Clear bets</button><button class="btn" data-a="repeat"' + (this.busy || !this.prev ? ' disabled' : '') + '>Repeat last</button><button class="btn pri" data-a="spin"' + (this.busy || this.total() <= 0 ? ' disabled' : '') + '>Spin</button></div>';
    },
    onKey: function (k) { if (k === ' ' && !this.busy && this.total() > 0) this.spin(); },
    atRisk: function () { return this.busy || this.total() > 0; },
    onClick: function (a, el) {
      if (this.busy) return;
      if (a === 'chip') { this.chip = +el.dataset.v; C.Sfx.chip(); this.render(); }
      else if (a === 'bet') { if (C.bank.balance < this.chip) { this.msg = 'Not enough chips for that bet.'; this.win = false; this.render(); return; } C.bank.add(-this.chip); var k = el.dataset.k; this.bets[k] = (this.bets[k] || 0) + this.chip; C.Sfx.chip(); this.render(); }
      else if (a === 'clear') this.clear();
      else if (a === 'repeat' && this.prev) { this.clear(true); var t = 0; for (var k2 in this.prev) t += this.prev[k2]; if (t > C.bank.balance) { this.msg = 'Not enough chips to repeat.'; this.win = false; this.render(); return; } C.bank.add(-t); this.bets = Object.assign({}, this.prev); C.Sfx.chip(); this.render(); }
      else if (a === 'spin' && this.total() > 0) this.spin();
    },
    spin: function () {
      var self = this, n = Math.floor(Math.random() * 37), D = 7.2, bets = this.bets, total = this.total(), lucky = this.lucky, st = this.st, w = st.wheel;
      this.busy = true; this.win = false; this.msg = 'No more bets...'; this.render(); this.prev = Object.assign({}, bets); this.bets = {};
      C.Sfx.rattle(D - 0.5);
      C.World.camTo([w.world.x + 0.6, 2.0, w.world.z + 1.5], [w.world.x, 1.0, w.world.z], 1.2);
      C.Level.spinWheel(w, n, D, function () {
        self.hist.unshift(n); self.hist = self.hist.slice(0, 10); self.counts[n]++;
        var ret = 0, k; for (k in bets) ret += bets[k] * pay(k, n, lucky);
        C.bank.add(ret); self.busy = false;
        var col = n === 0 ? 'green' : C.RED[n] ? 'red' : 'black', lk = self.luckyOf(n), straight = bets['n' + n] || 0;
        if (ret > total) { self.msg = n + ' ' + col + '. You win ' + fmt(ret) + '!' + (lk && straight ? ' Lightning x' + lk.m + '!' : ''); self.win = true; C.Sfx.win(ret >= total * 10 ? 2 : 1); C.toast('+' + fmt(ret - total)); if (ret >= total * 10) C.fx.celebrate(4); }
        else if (ret > 0) self.msg = n + ' ' + col + '. You get back ' + fmt(ret) + '.';
        else { self.msg = n + ' ' + col + '. No win this spin.' + (lk ? ' Lucky number x' + lk.m + ' hit, nobody had it.' : ''); C.Sfx.lose(); }
        self.rollLucky(); C.World.camBack(); if (C.panelOpen()) self.render();
      });
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
