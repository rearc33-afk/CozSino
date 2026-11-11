/* Aurum Palace - slots: 3x3 reels, 5 paylines, wilds, scatter free spins (x2), progressive jackpot, red/black gamble. */
(function (G) {
  var C = G.Casino = G.Casino || {}, $ = C.$, S = C.SlotMath, SYMS = S.SYMS, fmt = C.fmt;
  var H = 58; // symbol height in px (keep in sync with css .sym)
  C.Games = C.Games || {};
  var SL = C.Games.slots = {
    bet: 10, grid: [[0, 1, 2], [3, 4, 5], [1, 2, 3]], spinning: false, busy: false, free: 0, freeWon: 0, msg: '', win: false, hit: [], gamble: null, theme: '', timers: [],
    open: function (st) {
      $('#gtitle').textContent = st.theme || 'Slots'; this.theme = st.theme; this.spinning = false; this.busy = false; this.hit = [];
      this.msg = this.free ? 'Free spins are still waiting. Every win pays double.' : 'Three in a row on any of five lines wins. Wilds fill in, three coins give free spins.'; this.win = false; this.render(false);
    },
    close: function () { this.timers.forEach(clearTimeout); this.timers = []; if (this.gamble) this.collect(true); },
    sym: function (i, cls) { var s = SYMS[i]; return '<div class="sym ' + (cls || '') + (s.g.length > 2 && s.id === 'bar' ? ' bar' : '') + '" style="color:' + s.c + '">' + s.g + '</div>'; },
    render: function () {
      var g = this.grid, self = this, h = '';
      h += '<div class="slotbar"><span>Jackpot <b id="jpv">' + fmt(C.Jackpot.value) + '</b></span><span>' + (this.free ? 'FREE SPINS <b>' + this.free + '</b> · wins x2' : 'Bet ' + fmt(this.bet)) + '</span></div>';
      h += '<div class="reels3">';
      for (var c = 0; c < 3; c++) {
        h += '<div class="reel3"><div class="strip" id="st' + c + '">';
        for (var r = 0; r < 3; r++) h += this.sym(g[r][c], this.hit.indexOf(r * 3 + c) >= 0 ? 'hit' : '');
        h += '</div></div>';
      }
      h += '</div><div class="msg' + (this.win ? ' win' : '') + '">' + this.msg + '</div>';
      if (this.gamble) {
        h += '<div class="row c"><div class="gcard ' + (this.gamble.last || 'q') + '">' + (this.gamble.last ? (this.gamble.last === 'r' ? '♥' : '♠') : '?') + '</div><b>Pot ' + fmt(this.gamble.pot) + '</b></div>'
          + '<div class="row c"><button class="btn red" data-a="gr">Red</button><button class="btn blk" data-a="gb">Black</button><button class="btn pri" data-a="collect">Collect</button></div>';
      } else {
        h += '<div class="row c">' + C.ui.chips([5, 10, 25, 50, 100], this.bet, 'bet') + '<button class="btn pri" data-a="spin"' + (this.spinning ? ' disabled' : '') + '>' + (this.free ? 'Free spin' : 'Spin ' + fmt(this.bet)) + '</button>'
          + (this.lastWin > 0 && this.lastWin <= 1000 && !this.spinning && !this.free ? '<button class="btn" data-a="gamble">Gamble ' + fmt(this.lastWin) + '</button>' : '') + '</div>';
      }
      h += '<div class="pay">' + SYMS.slice(0, 6).map(function (s) { return '<span style="color:' + s.c + '">' + s.g + '</span> ×' + s.pay; }).join(' · ') + ' · W wild · ✪ ✪ ✪ free spins<br>Max bet with three real 7s on a line wins the jackpot.</div>';
      $('#gbody').innerHTML = h;
    },
    onKey: function (k) { if ((k === ' ' || k === 'enter') && !this.spinning && !this.gamble) this.onClick('spin'); },
    atRisk: function () { return this.busy || this.free > 0 || !!this.gamble; },
    onClick: function (a, el) {
      if (this.spinning) return;
      if (a === 'bet') { this.bet = +el.dataset.v; C.Sfx.chip(); this.render(); }
      else if (a === 'spin') this.spin();
      else if (a === 'gamble') this.startGamble();
      else if (a === 'gr' || a === 'gb') this.pick(a === 'gr' ? 'r' : 'b');
      else if (a === 'collect') this.collect(false);
    },
    spin: function () {
      var self = this, free = this.free > 0;
      if (!free) {
        if (C.bank.balance < this.bet) { this.msg = 'Not enough chips. Lower the bet.'; this.win = false; this.render(); return; }
        C.bank.add(-this.bet); C.Jackpot.feed(this.bet);
      } else this.free--;
      this.spinning = true; this.busy = true; this.win = false; this.hit = []; this.lastWin = 0; this.msg = free ? 'Free spin...' : 'Good luck...';
      var res = S.spin(Math.random, free), old = this.grid, fast = matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches, stops = fast ? [200, 300, 400] : [900, 1300, 1700];
      this.render();
      C.Sfx.reels(stops.map(function (x) { return x / 1000; }));
      for (var c = 0; c < 3; c++) {
        var strip = $('#st' + c), html = '', n = 16 + c * 5, r;
        for (r = 0; r < 3; r++) html += this.sym(old[r][c]);
        for (r = 0; r < n; r++) html += this.sym(S.pickSym(Math.random));
        for (r = 0; r < 3; r++) html += this.sym(res.grid[r][c]);
        strip.innerHTML = html; strip.style.transition = 'none'; strip.style.transform = 'translateY(0)'; strip.getBoundingClientRect();
        strip.style.transition = 'transform ' + stops[c] + 'ms cubic-bezier(.15,.7,.25,1)'; strip.style.transform = 'translateY(-' + ((n + 3) * H) + 'px)';
      }
      this.timers.push(setTimeout(function () { self.settle(res, free); }, stops[2] + 120));
    },
    settle: function (res, free) {
      this.grid = res.grid; this.spinning = false; this.busy = false;
      var bet = this.bet, total = (res.lineUnits + res.scatterUnits) * bet, jack = 0, parts = [];
      res.lines.forEach(function (l) { l.cells.forEach(function (p) { SL.hit.push(p[0] * 3 + p[1]); }); });
      if (res.scatter >= 3) { res.grid.forEach(function (row, r) { row.forEach(function (s, c) { if (s === 7) SL.hit.push(r * 3 + c); }); }); }
      if (res.lines.length) parts.push(res.lines.length + ' line' + (res.lines.length > 1 ? 's' : ''));
      if (res.scatterUnits) parts.push('coins x' + res.scatterUnits);
      if (res.jackpot && bet === 100) { jack = C.Jackpot.take(); parts.push('JACKPOT'); }
      if (res.spinsWon) { this.free += res.spinsWon; parts.push(res.spinsWon + ' free spins'); }
      total = Math.round(total) + jack;
      if (total > 0) {
        C.bank.add(total); this.win = true; this.lastWin = total; this.msg = (jack ? 'JACKPOT! ' : total >= bet * 10 ? 'BIG WIN ' : 'Win ') + fmt(total) + ' (' + parts.join(', ') + ')';
        C.Sfx.win(jack || total >= bet * 25 ? 2 : 1); C.toast('+' + fmt(total));
        if (jack || total >= bet * 25) C.fx.celebrate(jack ? 6 : 3);
        if (jack) C.fx.jackpot();
      } else { this.msg = this.free ? 'No win. ' + this.free + ' free spins left.' : 'No win. Spin again.'; C.Sfx.lose(); }
      if (res.spinsWon && !jack) C.toast(res.spinsWon + ' FREE SPINS');
      this.render();
      if (this.free > 0 && !this.gamble) { var self = this; this.timers.push(setTimeout(function () { if (self.free > 0 && C.panelOpen()) self.spin(); }, 1400)); }
    },
    startGamble: function () { C.bank.add(-this.lastWin); this.gamble = { pot: this.lastWin, n: 0, last: null }; this.msg = 'Pick the colour of the next card. A right call doubles the pot.'; this.win = false; this.busy = false; this.render(); },
    pick: function (side) {
      var g = this.gamble, card = Math.random() < 0.5 ? 'r' : 'b'; g.last = card; C.Sfx.flip();
      if (card === side) { g.pot *= 2; g.n++; this.msg = 'Correct! Pot is ' + fmt(g.pot) + '.'; this.win = true; if (g.n >= 4) return this.collect(false); }
      else { this.msg = 'Wrong colour. The pot is gone.'; this.win = false; g.pot = 0; C.Sfx.lose(); this.render(); var self = this; setTimeout(function () { self.collect(false); }, 900); return; }
      this.render();
    },
    collect: function (silent) {
      var g = this.gamble; if (!g) return; this.gamble = null; this.busy = false;
      if (g.pot > 0) { C.bank.add(g.pot); if (!silent) { this.msg = 'Collected ' + fmt(g.pot) + '.'; this.win = true; C.Sfx.win(1); } this.lastWin = 0; }
      else { this.msg = 'Better luck next spin.'; this.win = false; this.lastWin = 0; }
      if (!silent) this.render();
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
