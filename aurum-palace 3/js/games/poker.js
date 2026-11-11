/* Aurum Palace - five card draw against two table bots: ante, draw, then check/bet/call/fold. */
(function (G) {
  var C = G.Casino = G.Casino || {}, $ = C.$, fmt = C.fmt, U = C.ui, PM = C.PokerMath;
  C.Games = C.Games || {};
  var NAMES = ['Marcus', 'Dee', 'Priya', 'Tomas', 'Lucia', 'Hank', 'Mei', 'Otis', 'Rosa', 'Jules'];

  var PK = C.Games.poker = {
    deck: [], bet: 0, last: 25, p: [], bots: [], hold: [], phase: 'bet', pot: 0, put: 0, msg: '', win: false, busy: false, show: false, bettor: -1, timers: [],
    open: function () { $('#gtitle').textContent = 'Five Card Draw'; this.reset(); this.bet = 0; this.msg = 'Choose an ante. You and both players at the table each put it in.'; this.render(); },
    close: function () { this.timers.forEach(clearTimeout); this.timers = []; if (this.phase !== 'bet' && this.phase !== 'done') { C.bank.add(this.put); this.put = 0; } },
    reset: function () { this.phase = 'bet'; this.p = []; this.bots = []; this.show = false; this.win = false; this.busy = false; this.pot = 0; this.put = 0; this.bettor = -1; },
    later: function (ms, fn) { this.timers.push(setTimeout(fn, ms)); },
    render: function () {
      var self = this, ph = this.phase, h = '<div class="bots">';
      this.bots.forEach(function (b) {
        h += '<div class="hand bot' + (b.fold ? ' folded' : '') + '"><h4>' + b.name + '<b>' + (self.show && !b.fold ? PM.name(PM.eval5(b.cards)) : '') + '</b><em>' + b.status + '</em></h4><div class="cards sm">'
          + b.cards.map(function (c) { return U.card(c, !self.show || b.fold, {}); }).join('') + '</div></div>';
      });
      h += '</div>';
      if (this.p.length) h += '<div class="hand"><h4>You' + ((ph === 'act' || ph === 'respond' || ph === 'done') ? '<b>' + PM.name(PM.eval5(this.p)) + '</b>' : '') + '<em>Pot ' + fmt(this.pot) + '</em></h4><div class="cards">'
        + this.p.map(function (c, i) { return ph === 'draw' ? U.card(c, false, { act: 'hold', i: i, held: self.hold[i] }) : U.card(c, false, {}); }).join('') + '</div></div>';
      h += '<div class="msg' + (this.win ? ' win' : '') + '">' + this.msg + '</div><div class="row c">';
      var A = this.bet;
      if (ph === 'bet') h += U.chips([5, 25, 100, 500], 0, 'chip', C.bank.balance - A) + '<b>Ante ' + fmt(A) + '</b><button class="btn" data-a="clear">Clear</button><button class="btn pri" data-a="deal"' + (A <= 0 ? ' disabled' : '') + '>Deal</button>';
      else if (ph === 'draw') h += '<button class="btn pri" data-a="draw">Draw ' + (5 - this.hold.filter(Boolean).length) + '</button>';
      else if (ph === 'act') h += '<button class="btn ice" data-a="check">Check</button><button class="btn pri" data-a="bet"' + (C.bank.balance < 2 * A ? ' disabled' : '') + '>Bet ' + fmt(2 * A) + '</button><button class="btn" data-a="fold">Fold</button>';
      else if (ph === 'respond') h += '<button class="btn pri" data-a="call"' + (C.bank.balance < 2 * A ? ' disabled' : '') + '>Call ' + fmt(2 * A) + '</button><button class="btn" data-a="fold">Fold</button>';
      else if (ph === 'done') h += '<button class="btn pri" data-a="same"' + (C.bank.balance < this.last ? ' disabled' : '') + '>Deal again ' + fmt(this.last) + '</button><button class="btn" data-a="change">Change ante</button>';
      else h += '<b>Dealing...</b>';
      $('#gbody').innerHTML = h + '</div>';
    },
    atRisk: function () { return this.busy || (this.phase !== 'bet' && this.phase !== 'done'); },
    onClick: function (a, el) {
      var ph = this.phase;
      if (ph === 'bet') {
        if (a === 'chip') { this.bet += +el.dataset.v; C.Sfx.chip(); } else if (a === 'clear') this.bet = 0;
        else if (a === 'deal' && this.bet > 0 && this.bet <= C.bank.balance) return this.deal();
        this.render();
      }
      else if (a === 'same') { this.reset(); this.bet = this.last; if (this.bet <= C.bank.balance) this.deal(); else this.render(); }
      else if (a === 'change') this.open();
      else if (ph === 'draw') { if (a === 'hold') { var i = +el.dataset.i; this.hold[i] = !this.hold[i]; C.Sfx.card(); this.render(); } else if (a === 'draw') this.draw(); }
      else if (ph === 'act') {
        if (a === 'fold') this.fold(); else if (a === 'check') this.check(); else if (a === 'bet' && C.bank.balance >= 2 * this.bet) this.playerBet();
      }
      else if (ph === 'respond') { if (a === 'fold') this.fold(); else if (a === 'call' && C.bank.balance >= 2 * this.bet) { C.bank.add(-2 * this.bet); this.put += 2 * this.bet; this.pot += 2 * this.bet; C.Sfx.chip(); this.showdown(); } }
    },
    deal: function () {
      var A = this.bet; this.reset(); this.bet = A; this.last = A; C.bank.add(-A); this.put = A; this.pot = 3 * A; this.deck = U.shoe(1);
      var names = C.shuffle(NAMES.slice()), i; this.p = []; this.bots = [{ name: names[0], cards: [], status: 'ante in', fold: false }, { name: names[1], cards: [], status: 'ante in', fold: false }];
      for (i = 0; i < 5; i++) { this.p.push(this.deck.pop()); this.bots[0].cards.push(this.deck.pop()); this.bots[1].cards.push(this.deck.pop()); }
      this.hold = [false, false, false, false, false]; this.phase = 'draw'; this.busy = true; C.Sfx.card(); this.msg = 'Tap the cards to keep, then draw the rest.'; this.render();
    },
    draw: function () {
      var self = this; this.p = this.p.map(function (c, i) { return self.hold[i] ? c : self.deck.pop(); }); C.Sfx.card();
      this.bots.forEach(function (b) { var k = PM.keep(b.cards), n = 0; b.cards = b.cards.map(function (c, i) { if (k[i]) return c; n++; return self.deck.pop(); }); b.status = n ? 'drew ' + n : 'stands pat'; });
      this.phase = 'act'; this.msg = 'Check to see what the table does, or bet to push them out.'; this.render();
    },
    cat: function (b) { return PM.eval5(b.cards)[0]; },
    playerBet: function () {
      var A = this.bet, self = this; C.bank.add(-2 * A); this.put += 2 * A; this.pot += 2 * A; C.Sfx.chip();
      this.bots.forEach(function (b) { var c = self.cat(b), call = c >= 2 || Math.random() < (c === 1 ? 0.65 : 0.12); if (call) { self.pot += 2 * A; b.status = 'calls'; } else { b.fold = true; b.status = 'folds'; } });
      this.showdown();
    },
    check: function () {
      var A = this.bet, self = this, any = false;
      this.bots.forEach(function (b, i) {
        var c = self.cat(b);
        if (!any) { var go = Math.random() < (c >= 3 ? 0.85 : c === 2 ? 0.55 : c === 1 ? 0.18 : 0.07); if (go) { any = true; b.status = 'bets ' + fmt(2 * A); self.pot += 2 * A; self.bettor = i; } else b.status = 'checks'; }
        else { var call = c >= 2 || Math.random() < (c === 1 ? 0.65 : 0.12); if (call) { self.pot += 2 * A; b.status = 'calls'; } else { b.fold = true; b.status = 'folds'; } }
      });
      if (any) { this.phase = 'respond'; this.msg = this.bots[this.bettor].name + ' bets ' + fmt(2 * A) + '. Call or fold?'; this.render(); } else this.showdown();
    },
    fold: function () {
      this.phase = 'done'; this.busy = false; this.show = true; this.put = 0; this.msg = 'You fold and lose your ante.'; this.win = false; C.Sfx.lose(); this.render();
    },
    showdown: function () {
      var live = this.bots.filter(function (b) { return !b.fold; }), best = PM.eval5(this.p), winners = [{ you: true }], self = this;
      this.show = true; this.phase = 'done'; this.busy = false;
      live.forEach(function (b) { var e = PM.eval5(b.cards), c = PM.cmp(e, best); if (c > 0) { best = e; winners = [b]; } else if (c === 0) winners.push(b); });
      var youWin = winners.some(function (w) { return w.you; }), share = this.pot / winners.length, net;
      if (youWin) { C.bank.add(share); net = share - this.put; } else net = -this.put;
      this.put = 0; this.win = net > 0;
      var who = winners.map(function (w) { return w.you ? 'You' : w.name; }).join(' and ');
      if (!live.length) this.msg = 'Everyone folds. You take the pot, +' + fmt(net) + '.';
      else this.msg = who + (winners.length > 1 ? ' split the pot with ' : ' win with ') + PM.name(best) + (youWin ? '. +' + fmt(net) : '. ' + fmt(net));
      if (net > 0) { C.Sfx.win(PM.eval5(this.p)[0] >= 5 ? 2 : 1); C.toast('+' + fmt(net)); if (PM.eval5(this.p)[0] >= 6) C.fx.celebrate(3); } else C.Sfx.lose();
      this.render();
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
