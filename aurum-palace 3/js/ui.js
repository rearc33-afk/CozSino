/* Aurum Palace - chips, jackpot, toasts and small HTML helpers shared by the games. */
(function (G) {
  var C = G.Casino = G.Casino || {}, $ = C.$;

  C.bank = {
    balance: 5000,
    set: function (n) {
      this.balance = Math.max(0, Math.round(n));
      var b = $('#bal'); if (b) b.textContent = C.fmt(this.balance);
      if (C.Run) C.Run.onBalance(this.balance);
    },
    add: function (n) { this.set(this.balance + n); },
    load: function () { this.set(C.Run ? C.Run.load() : 5000); }
  };

  // the progressive jackpot shown on the atrium pillar; slot bets feed it and it also creeps up on its own
  C.Jackpot = {
    value: 12500, base: 12500, saveT: 0,
    load: function () { var v = C.store.get('jackpot', 12500); this.value = typeof v === 'number' && v >= this.base ? v : this.base; },
    tick: function (dt) { this.value += dt * (0.4 + Math.random() * 1.1); this.saveT += dt; if (this.saveT > 5) { this.saveT = 0; C.store.set('jackpot', Math.round(this.value)); } },
    feed: function (bet) { this.value += bet * 0.04; },
    take: function () { var v = Math.round(this.value); this.value = this.base; C.store.set('jackpot', this.value); return v; }
  };

  var toastT = null;
  C.toast = function (msg, bad) {
    var t = $('#toast'); if (!t) return;
    t.textContent = msg; t.className = 'on' + (bad ? ' bad' : '');
    clearTimeout(toastT); toastT = setTimeout(function () { t.className = ''; }, 2800);
  };

  var SUITS = ['♠︎', '♥︎', '♦︎', '♣︎'], RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  C.ui = {
    SUITS: SUITS, RANKS: RANKS,
    card: function (c, hidden, o) {
      o = o || {};
      if (hidden) return '<div class="card back' + (o.fresh ? ' fresh' : '') + '"></div>';
      var red = c.s === 1 || c.s === 2, tag = o.act ? 'button' : 'div';
      return '<' + tag + ' class="card' + (red ? ' red' : '') + (o.held ? ' held' : '') + (o.fresh ? ' fresh' : '') + '"' + (o.act ? ' data-a="' + o.act + '" data-i="' + o.i + '"' : '') + '><span>' + RANKS[c.r] + '</span><i>' + SUITS[c.s] + '</i></' + tag + '>';
    },
    chips: function (vals, sel, act, cap) {
      return vals.map(function (v) { return '<button class="chip' + (sel === v ? ' on' : '') + '" data-v="' + v + '" data-a="' + act + '"' + (cap !== undefined && v > cap ? ' disabled' : '') + '>' + v + '</button>'; }).join('');
    },
    shoe: function (n) {
      var d = [], k, s, r;
      for (k = 0; k < n; k++) for (s = 0; s < 4; s++) for (r = 0; r < 13; r++) d.push({ r: r, s: s });
      return C.shuffle(d);
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
