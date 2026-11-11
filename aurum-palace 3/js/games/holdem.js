/* Aurum Palace - Texas Hold'em, fixed limit, against three table bots.
   Everyone antes. Four betting rounds (pre-flop, flop, turn, river): check or bet, others call or fold, no raising. */
(function (G) {
  var C = G.Casino = G.Casino || {}, $ = C.$, fmt = C.fmt, U = C.ui, PM = C.PokerMath;
  C.Games = C.Games || {};
  var NAMES = ['Marcus', 'Dee', 'Priya', 'Tomas', 'Lucia', 'Hank', 'Mei', 'Otis', 'Rosa', 'Jules'];
  var STREETS = ['Pre-flop', 'Flop', 'Turn', 'River'];

  var HE = C.Games.holdem = {
    deck: [], bet: 0, last: 25, p: [], bots: [], board: [], street: 0, phase: 'bet', pot: 0, put: 0, msg: '', win: false, busy: false, show: false, bettor: -1, timers: [],
    open: function () { $('#gtitle').textContent = "Texas Hold'em"; this.reset(); this.bet = 0; this.msg = 'Choose a bet unit. Everyone antes one unit. Bets are one unit pre-flop and on the flop, two on the turn and river.'; this.render(); },
    close: function () { this.timers.forEach(clearTimeout); this.timers = []; if (this.phase !== 'bet' && this.phase !== 'done') { C.bank.add(this.put); this.put = 0; } },
    reset: function () { this.phase = 'bet'; this.p = []; this.bots = []; this.board = []; this.street = 0; this.show = false; this.win = false; this.busy = false; this.pot = 0; this.put = 0; this.bettor = -1; },
    later: function (ms, fn) { this.timers.push(setTimeout(fn, ms)); },
    size: function () { return this.street < 2 ? this.bet : 2 * this.bet; },
    hn: function (hole) { return this.board.length >= 3 ? PM.name(PM.best(hole.concat(this.board))) : ''; },
    atRisk: function () { return this.busy || (this.phase !== 'bet' && this.phase !== 'done'); },
    render: function () {
      var self = this, ph = this.phase, h = '<div class="bots">';
      this.bots.forEach(function (b) {
        h += '<div class="hand bot' + (b.fold ? ' folded' : '') + '"><h4>' + b.name + '<b>' + (self.show && !b.fold ? self.hn(b.cards) : '') + '</b><em>' + b.status + '</em></h4><div class="cards sm">'
          + b.cards.map(function (c) { return U.card(c, !self.show || b.fold, {}); }).join('') + '</div></div>';
      });
      h += '</div>';
      if (this.p.length) {
        h += '<div class="hand"><h4>Board<b>' + STREETS[Math.min(this.street, 3)] + '</b><em>Pot ' + fmt(this.pot) + '</em></h4><div class="cards">'
          + [0, 1, 2, 3, 4].map(function (i) { return self.board[i] ? U.card(self.board[i], false, {}) : '<div class="card back" style="opacity:.25"></div>'; }).join('') + '</div></div>';
        h += '<div class="hand"><h4>You' + '<b>' + this.hn(this.p) + '</b>' + '</h4><div class="cards">' + this.p.map(function (c) { return U.card(c, false, {}); }).join('') + '</div></div>';
      }
      h += '<div class="msg' + (this.win ? ' win' : '') + '">' + this.msg + '</div><div class="row c">';
      var A = this.bet, z = this.size(), bal = C.bank.balance;
      if (ph === 'bet') h += U.chips([5, 25, 100, 250], 0, 'chip', bal - A) + '<b>Unit ' + fmt(A) + '</b><button class="btn" data-a="clear">Clear</button><button class="btn pri" data-a="deal"' + (A <= 0 ? ' disabled' : '') + '>Deal</button>';
      else if (ph === 'act') h += '<button class="btn ice" data-a="check">Check</button><button class="btn pri" data-a="bet"' + (bal < z ? ' disabled' : '') + '>Bet ' + fmt(z) + '</button><button class="btn" data-a="fold">Fold</button>';
      else if (ph === 'respond') h += '<button class="btn pri" data-a="call"' + (bal < z ? ' disabled' : '') + '>Call ' + fmt(z) + '</button><button class="btn" data-a="fold">Fold</button>';
      else if (ph === 'done') h += '<button class="btn pri" data-a="same"' + (bal < this.last ? ' disabled' : '') + '>Deal again ' + fmt(this.last) + '</button><button class="btn" data-a="change">Change unit</button>';
      else h += '<b>Dealing...</b>';
      $('#gbody').innerHTML = h + '</div>';
    },
    onClick: function (a, el) {
      var ph = this.phase;
      if (ph === 'bet') {
        if (a === 'chip') { this.bet += +el.dataset.v; C.Sfx.chip(); } else if (a === 'clear') this.bet = 0;
        else if (a === 'deal' && this.bet > 0 && this.bet <= C.bank.balance) return this.deal();
        this.render();
      }
      else if (a === 'same') { this.reset(); this.bet = this.last; if (this.bet <= C.bank.balance) this.deal(); else this.render(); }
      else if (a === 'change') this.open();
      else if (ph === 'act') { if (a === 'fold') this.fold(); else if (a === 'check') this.check(); else if (a === 'bet' && C.bank.balance >= this.size()) this.playerBet(); }
      else if (ph === 'respond') { if (a === 'fold') this.fold(); else if (a === 'call' && C.bank.balance >= this.size()) { this.pay(this.size()); this.later(350, function () { HE.advance(); }); this.phase = 'wait'; this.render(); } }
    },
    pay: function (n) { C.bank.add(-n); this.put += n; this.pot += n; C.Sfx.chip(); },
    deal: function () {
      var A = this.bet, i; this.reset(); this.bet = A; this.last = A; C.bank.add(-A); this.put = A; this.pot = 4 * A; this.deck = U.shoe(1);
      var names = C.shuffle(NAMES.slice()); this.bots = [0, 1, 2].map(function (k) { return { name: names[k], cards: [], status: 'ante in', fold: false }; });
      for (i = 0; i < 2; i++) { this.p.push(this.deck.pop()); this.bots.forEach(function (b) { b.cards.push(HE.deck.pop()); }); }
      C.Sfx.card(); this.busy = true; this.phase = 'act'; this.msg = 'Pre-flop. Check, or bet ' + fmt(this.size()) + ' to push the table.'; this.render();
    },
    // does this bot want to call a bet?
    wantsCall: function (b) { var s = PM.strength(b.cards, this.board); return s > 0.3 + Math.random() * 0.18 + this.street * 0.03; },
    wantsBet: function (b) { var s = PM.strength(b.cards, this.board); return (s > 0.66 && Math.random() < 0.7) || Math.random() < 0.06; },
    botsReact: function (z, except) {
      var any = false;
      this.bots.forEach(function (b, i) { if (b.fold || i === except) return; if (HE.wantsCall(b)) { HE.pot += z; b.status = 'calls'; any = true; } else { b.fold = true; b.status = 'folds'; } });
      return any;
    },
    playerBet: function () {
      var z = this.size(); this.pay(z); this.botsReact(z, -1);
      this.phase = 'wait'; this.render(); this.later(500, function () { HE.advance(); });
    },
    check: function () {
      var z = this.size(), self = this, bettor = -1;
      this.bots.forEach(function (b, i) { if (bettor < 0 && !b.fold && self.wantsBet(b)) bettor = i; });
      if (bettor < 0) { this.bots.forEach(function (b) { if (!b.fold) b.status = 'checks'; }); this.phase = 'wait'; this.render(); this.later(450, function () { HE.advance(); }); return; }
      var bb = this.bots[bettor]; bb.status = 'bets ' + fmt(z); this.pot += z; this.bettor = bettor; this.botsReact(z, bettor);
      this.phase = 'respond'; this.msg = bb.name + ' bets ' + fmt(z) + '. Call or fold?'; this.render(); C.Sfx.chip();
    },
    fold: function () {
      this.phase = 'done'; this.busy = false; this.show = true; this.put = 0; this.msg = 'You fold and lose what you put in.'; this.win = false; C.Sfx.lose(); this.render();
    },
    advance: function () {
      var live = this.bots.filter(function (b) { return !b.fold; });
      if (!live.length) return this.finish([{ you: true }], null);
      if (this.street === 3) return this.finish(null, null);
      this.street++; C.Sfx.card();
      var n = this.street === 1 ? 3 : 1, i; this.deck.pop(); for (i = 0; i < n; i++) this.board.push(this.deck.pop());
      this.bots.forEach(function (b) { if (!b.fold) b.status = ''; });
      this.phase = 'act'; this.msg = STREETS[this.street] + '. Check, or bet ' + fmt(this.size()) + '.'; this.render();
    },
    finish: function (forced) {
      var self = this, live = this.bots.filter(function (b) { return !b.fold; }), winners, top, ye, net, label;
      this.show = true; this.phase = 'done'; this.busy = false;
      if (forced) { winners = forced; label = null; }
      else {
        ye = PM.best(this.p.concat(this.board)); top = ye; winners = [{ you: true }];
        live.forEach(function (b) { var e = PM.best(b.cards.concat(self.board)), c = PM.cmp(e, top); if (c > 0) { top = e; winners = [b]; } else if (c === 0) winners.push(b); });
        label = PM.name(top);
      }
      var youWin = winners.some(function (w) { return w.you; }), share = this.pot / winners.length;
      if (youWin) { C.bank.add(share); net = share - this.put; } else net = -this.put;
      this.put = 0; this.win = net > 0;
      var who = winners.map(function (w) { return w.you ? 'You' : w.name; }).join(' and ');
      if (forced) this.msg = 'Everyone folds. You take the pot, +' + fmt(net) + '.';
      else this.msg = who + (winners.length > 1 ? ' split the pot with ' : ' win with ') + label + (youWin ? '. +' + fmt(net) : '. ' + fmt(net));
      if (net > 0) { C.Sfx.win(top && top[0] >= 5 ? 2 : 1); C.toast('+' + fmt(net)); if (top && top[0] >= 6) C.fx.celebrate(3); } else C.Sfx.lose();
      this.render();
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
