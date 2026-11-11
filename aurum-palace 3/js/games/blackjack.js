/* Aurum Palace - blackjack: 6-deck shoe, split, double, insurance, Perfect Pairs side bet, optional Hi-Lo count. */
(function (G) {
  var C = G.Casino = G.Casino || {}, $ = C.$, fmt = C.fmt, U = C.ui;
  C.Games = C.Games || {};
  function val(cs) { var t = 0, a = 0; cs.forEach(function (c) { if (c.r === 12) { t += 11; a++; } else t += c.r >= 9 ? 10 : c.r + 2; }); while (t > 21 && a > 0) { t -= 10; a--; } return t; }
  function pts(c) { return c.r === 12 || c.r >= 8 ? 10 : c.r + 2; }
  function hilo(c) { return c.r <= 4 ? 1 : c.r <= 7 ? 0 : -1; }
  C.BJMath = { val: val };

  var BJ = C.Games.blackjack = {
    shoe: [], base: 0, bet: 0, pp: 0, last: { bet: 25, pp: 0 }, hands: [], ai: 0, dealer: [], phase: 'bet', hide: true, msg: '', win: false, busy: false, timers: [], count: false, session: 0, ins: 0, ppMsg: '',
    open: function () {
      $('#gtitle').textContent = 'Blackjack'; this.reset(); this.bet = 0; this.pp = 0; this.msg = 'Place your bet. Perfect Pairs is optional.'; this.render();
    },
    close: function () { this.timers.forEach(clearTimeout); this.timers = []; if (this.phase !== 'bet' && this.phase !== 'done') { this.hide = false; this.settle(true); } },
    reset: function () { this.phase = 'bet'; this.hands = []; this.dealer = []; this.hide = true; this.win = false; this.busy = false; this.ins = 0; this.ppMsg = ''; this.counted = false; if (this.shoe.length < 60) { this.shoe = U.shoe(6); this.base = 0; } },
    later: function (ms, fn) { this.timers.push(setTimeout(fn, ms)); },
    draw: function (to) { if (this.shoe.length < 12) { this.shoe = U.shoe(6); this.base = 0; C.toast('The dealer shuffles a new shoe'); } var c = this.shoe.pop(); c.fresh = true; to.push(c); C.Sfx.card(); return c; },
    runCount: function () {
      if (this.counted) return this.base;
      var n = this.base, self = this, add = function (cs, skip) { cs.forEach(function (c, i) { if (!(skip && i === 1)) n += hilo(c); }); };
      this.hands.forEach(function (h) { add(h.cards); }); add(this.dealer, this.hide); return n;
    },
    cardsH: function (cs, hideSecond) { return cs.map(function (c, i) { var f = c.fresh; c.fresh = false; return U.card(c, hideSecond && i === 1, { fresh: f }); }).join(''); },
    render: function () {
      var self = this, h = '', dtot = this.dealer.length ? (this.hide ? val([this.dealer[0]]) : val(this.dealer)) : '';
      h += '<div class="bjtop"><span>Shoe ' + this.shoe.length + ' cards</span><span class="sess ' + (this.session >= 0 ? 'up' : 'dn') + '">Session ' + (this.session >= 0 ? '+' : '-') + fmt(Math.abs(this.session)) + '</span><button class="mini" data-a="count">' + (this.count ? 'Count ' + (this.runCount() > 0 ? '+' : '') + this.runCount() : 'Show count') + '</button></div>';
      h += '<div class="hand"><h4>Dealer<b>' + dtot + '</b></h4><div class="cards">' + this.cardsH(this.dealer, this.hide) + '</div></div>';
      h += '<div class="hands">';
      this.hands.forEach(function (hd, i) {
        var v = val(hd.cards);
        h += '<div class="hand' + (self.phase === 'play' && i === self.ai ? ' act' : '') + '"><h4>' + (self.hands.length > 1 ? 'Hand ' + (i + 1) : 'You') + '<b>' + v + '</b><em>' + fmt(hd.bet) + (hd.dbl ? ' doubled' : '') + '</em></h4><div class="cards">' + self.cardsH(hd.cards, false) + '</div></div>';
      });
      h += '</div><div class="msg' + (this.win ? ' win' : '') + '">' + this.msg + (this.ppMsg ? ' ' + this.ppMsg : '') + '</div><div class="row c">';
      if (this.phase === 'bet') {
        h += U.chips([5, 25, 100, 500], 0, 'chip', C.bank.balance - this.bet - this.pp) + '<b>Bet ' + fmt(this.bet) + '</b><button class="btn" data-a="clear">Clear</button>'
          + '<button class="btn small' + (this.pp ? ' on' : '') + '" data-a="pp">Pairs ' + fmt(this.pp) + '</button><button class="btn pri" data-a="deal"' + (this.bet <= 0 ? ' disabled' : '') + '>Deal</button>';
      } else if (this.phase === 'insurance') {
        h += '<button class="btn pri" data-a="ins">Insurance ' + fmt(Math.floor(this.hands[0].bet / 2)) + '</button><button class="btn" data-a="noins">No thanks</button>';
      } else if (this.phase === 'play') {
        var hd = this.hands[this.ai], two = hd.cards.length === 2;
        h += '<button class="btn pri" data-a="hit">Hit</button><button class="btn ice" data-a="stand">Stand</button><button class="btn" data-a="double"' + (!two || C.bank.balance < hd.bet ? ' disabled' : '') + '>Double</button>'
          + '<button class="btn" data-a="split"' + (!(two && this.hands.length === 1 && pts(hd.cards[0]) === pts(hd.cards[1]) && C.bank.balance >= hd.bet) ? ' disabled' : '') + '>Split</button>';
      } else if (this.phase === 'dealer') h += '<b>Dealer plays...</b>';
      else h += '<button class="btn pri" data-a="same"' + (C.bank.balance < this.last.bet + this.last.pp ? ' disabled' : '') + '>Deal again ' + fmt(this.last.bet + this.last.pp) + '</button><button class="btn" data-a="change">Change bet</button>';
      $('#gbody').innerHTML = h + '</div>';
    },
    onKey: function (k) { if (this.phase === 'play') { if (k === 'h') this.onClick('hit'); else if (k === 's') this.onClick('stand'); } },
    atRisk: function () { return this.busy || (this.phase !== 'bet' && this.phase !== 'done'); },
    onClick: function (a, el) {
      var p = this.phase;
      if (a === 'count') { this.count = !this.count; this.render(); }
      else if (p === 'bet') {
        if (a === 'chip') { this.bet += +el.dataset.v; C.Sfx.chip(); }
        else if (a === 'clear') { this.bet = 0; this.pp = 0; }
        else if (a === 'pp') { var opts = [0, 5, 25, 100], i = (opts.indexOf(this.pp) + 1) % opts.length; this.pp = opts[i]; if (this.bet + this.pp > C.bank.balance) this.pp = 0; C.Sfx.chip(); }
        else if (a === 'deal' && this.bet > 0 && this.bet + this.pp <= C.bank.balance) return this.deal();
        this.render();
      }
      else if (a === 'same') { this.reset(); this.bet = this.last.bet; this.pp = this.last.pp; if (this.bet + this.pp <= C.bank.balance) this.deal(); else this.render(); }
      else if (a === 'change') { this.open(); }
      else if (p === 'insurance') { if (a === 'ins') { this.ins = Math.floor(this.hands[0].bet / 2); C.bank.add(-this.ins); C.Sfx.chip(); } if (a === 'ins' || a === 'noins') this.peek(); }
      else if (p === 'play') {
        var hd = this.hands[this.ai];
        if (a === 'hit') { this.draw(hd.cards); var v = val(hd.cards); if (v > 21) this.next(); else if (v === 21) this.next(); else this.render(); }
        else if (a === 'stand') this.next();
        else if (a === 'double' && hd.cards.length === 2 && C.bank.balance >= hd.bet) { C.bank.add(-hd.bet); hd.bet *= 2; hd.dbl = true; C.Sfx.chip(); this.draw(hd.cards); this.render(); this.later(500, function () { BJ.next(); }); this.busy = true; }
        else if (a === 'split') this.split();
      }
    },
    deal: function () {
      this.reset(); C.bank.add(-(this.bet + this.pp)); this.last = { bet: this.bet, pp: this.pp };
      var hd = { cards: [], bet: this.bet }, self = this; this.hands = [hd]; this.phase = 'dealing'; this.busy = true; this.msg = 'Dealing...'; this.render();
      this.later(250, function () { self.draw(hd.cards); self.render(); });
      this.later(550, function () { self.draw(self.dealer); self.render(); });
      this.later(850, function () { self.draw(hd.cards); self.render(); });
      this.later(1150, function () { self.draw(self.dealer); self.render(); self.afterDeal(); });
    },
    afterDeal: function () {
      var hd = this.hands[0], a = hd.cards[0], b = hd.cards[1];
      if (this.pp > 0) { // Perfect Pairs pays on the first two cards
        var m = 0, nm = '';
        if (a.r === b.r) { if (a.s === b.s) { m = 25; nm = 'Perfect pair'; } else if ((a.s === 1 || a.s === 2) === (b.s === 1 || b.s === 2)) { m = 12; nm = 'Coloured pair'; } else { m = 6; nm = 'Mixed pair'; } }
        if (m) { C.bank.add(this.pp * (m + 1)); this.ppMsg = nm + ' pays ' + fmt(this.pp * m) + '!'; C.Sfx.win(1); } else this.ppMsg = 'Pairs bet lost.';
      }
      if (this.dealer[0].r === 12) { this.phase = 'insurance'; this.msg = 'Dealer shows an ace. Insurance pays 2 to 1.'; this.busy = false; this.render(); }
      else this.peek();
    },
    peek: function () {
      var d = val(this.dealer), hd = this.hands[0], pbj = val(hd.cards) === 21;
      if (d === 21 || pbj) { this.hide = false; this.settle(false); return; }
      if (this.ins) { this.ins = 0; this.ppMsg += ' Insurance lost.'; }
      this.phase = 'play'; this.ai = 0; this.busy = true; this.msg = 'Hit, stand, double or split.'; this.render();
    },
    split: function () {
      var hd = this.hands[0], c2 = hd.cards.pop(); C.bank.add(-hd.bet); C.Sfx.chip();
      var h2 = { cards: [c2], bet: hd.bet }; this.hands = [hd, h2]; this.ai = 0; this.draw(hd.cards); this.draw(h2.cards); this.msg = 'Playing hand 1 of 2.'; this.render();
    },
    next: function () {
      if (this.ai < this.hands.length - 1) { this.ai++; this.msg = 'Playing hand ' + (this.ai + 1) + ' of ' + this.hands.length + '.'; this.render(); var hd = this.hands[this.ai]; if (val(hd.cards) === 21) { var s = this; this.later(500, function () { s.next(); }); } return; }
      var live = this.hands.some(function (h) { return val(h.cards) <= 21; });
      this.phase = 'dealer'; this.hide = false; this.render(); C.Sfx.flip(); this.step(live);
    },
    step: function (live) {
      var self = this;
      if (live && val(this.dealer) < 17) this.later(700, function () { self.draw(self.dealer); self.render(); self.step(live); });
      else this.later(500, function () { self.settle(false); });
    },
    settle: function (forced) {
      var d = val(this.dealer), dbj = this.dealer.length === 2 && d === 21, self = this, net = 0, txt = [], hands = this.hands;
      this.hide = false;
      if (this.ins) { if (dbj) { C.bank.add(this.ins * 3); net += this.ins * 2; txt.push('Insurance paid'); } else net -= this.ins; }
      hands.forEach(function (h) {
        var v = val(h.cards), nat = hands.length === 1 && h.cards.length === 2 && v === 21, mult = 0;
        if (v > 21) mult = 0; else if (nat && !dbj) mult = 2.5; else if (dbj && !nat) mult = 0; else if (nat && dbj) mult = 1; else if (d > 21 || v > d) mult = 2; else if (v === d) mult = 1;
        if (forced) mult = 1; // leaving mid-hand returns the stakes
        C.bank.add(h.bet * mult); net += h.bet * mult - h.bet;
        txt.push(forced ? 'Bets returned' : v > 21 ? 'Bust' : nat && !dbj ? 'Blackjack 3 to 2' : mult === 2 ? 'Win' : mult === 1 ? 'Push' : 'Dealer wins');
      });
      this.session += net; this.phase = 'done'; this.busy = false;
      if (!forced) {
        this.win = net > 0; this.msg = txt.join(' · ') + (net ? ' (' + (net > 0 ? '+' : '-') + fmt(Math.abs(net)) + ')' : '');
        if (net > 0) { C.Sfx.win(net >= this.last.bet * 1.4 && hands.length === 1 && hands[0].cards.length === 2 && val(hands[0].cards) === 21 ? 2 : 1); C.toast('+' + fmt(net)); } else if (net < 0) C.Sfx.lose();
        if (net >= 400) C.fx.celebrate(2.5);
      }
      this.hide = false; this.base = this.runCount(); this.counted = true; if (!forced) this.render();
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
