/* Aurum Palace - accounts, your night, the leaderboard and getting kicked out at zero.
   There is no server: an account is a profile saved in this browser, and the leaderboard lists the accounts on this browser. */
(function (G) {
  var C = G.Casino = G.Casino || {}, $ = C.$, fmt = C.fmt;
  var START = 5000;
  var accts = {}, me = null, s = null, zeroT = 0, boardOpen = false, busted = false, lastRank = 0, rankT = 0;

  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function freshAcct(user) { return { user: user, nights: [{ n: 1, started: Date.now(), peak: START, chips: START, status: 'playing' }] }; }
  function cur() { return s.nights[s.nights.length - 1]; }
  function save() { if (!me) return; accts[me] = s; C.store.set('accts', accts); C.store.set('me', me); }
  function pull() { var a = C.store.get('accts', {}); accts = a && typeof a === 'object' ? a : {}; if (me && s) accts[me] = s; }
  function validEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e); }

  function standings() {
    pull();
    var rows = Object.keys(accts).map(function (k) {
      var a = accts[k], n = a.nights[a.nights.length - 1];
      return { name: a.user, chips: n.chips, out: n.status === 'out', you: k === me };
    });
    rows.sort(function (a, b) { return (a.out - b.out) || (b.chips - a.chips) || (a.you ? -1 : 1); });
    return rows;
  }
  function rank() { var r = standings(); for (var i = 0; i < r.length; i++) if (r[i].you) return i + 1; return r.length; }
  function rowH(rk, name, chips, status, you, out) {
    return '<div class="lbrow' + (you ? ' you' : '') + (out ? ' out' : '') + '"><span class="rk">' + rk + '</span><span class="nm">' + name + '</span><span class="ch">' + fmt(chips) + '</span><span class="st">' + status + '</span></div>';
  }

  C.Run = {
    START: START,
    // called by bank.load at startup: restore the signed-in account, if any
    load: function () {
      pull(); var m = C.store.get('me', null);
      if (m && accts[m]) { me = m; s = accts[m]; busted = cur().status === 'out'; lastRank = rank(); return cur().chips; }
      me = null; s = null; busted = false; return START;
    },
    signedIn: function () { return !!me; },
    username: function () { return me ? s.user : ''; },
    email: function () { return me || ''; },
    // returns an error string, or '' on success
    signIn: function (email, user) {
      email = String(email || '').trim().toLowerCase(); user = String(user || '').trim().replace(/\s+/g, ' ');
      if (!validEmail(email)) return 'Enter a valid email address.';
      pull(); var a = accts[email];
      if (!user && a) user = a.user;
      if (user.length < 2 || user.length > 16) return 'Pick a username of 2 to 16 characters.';
      var taken = Object.keys(accts).some(function (k) { return k !== email && accts[k].user.toLowerCase() === user.toLowerCase(); });
      if (taken) return 'That username is taken on this device.';
      if (!a) a = accts[email] = freshAcct(user); else a.user = user;
      me = email; s = a; save(); busted = cur().status === 'out'; lastRank = rank(); C.bank.set(cur().chips);
      return '';
    },
    signOut: function () { if (me) save(); me = null; s = null; busted = false; zeroT = 0; C.store.set('me', null); },
    isBusted: function () { return busted; },
    blocking: function () { return boardOpen || busted; },
    boardOpen: function () { return boardOpen; },
    onBalance: function (b) { if (!s) return; var n = cur(); n.chips = b; if (b > n.peak) n.peak = b; save(); },
    tick: function (dt, ctx) {
      if (!s) return;
      if (!busted && C.bank.balance === 0 && !(ctx && ctx.atRisk > 0)) { zeroT += dt; if (zeroT > 1.3) { zeroT = 0; this.bust(); } } else zeroT = 0;
      rankT += dt; if (rankT > 1.5) { rankT = 0; var r = rank(); if (r < lastRank && !busted) C.toast('Leaderboard: you moved up to #' + r); lastRank = r; if (boardOpen) this.render(); }
    },
    bust: function () {
      var n = cur(); n.status = 'out'; n.chips = 0; busted = true; save();
      this.showBust(); C.Sfx.lose();
    },
    showBust: function () { var p = $('#bustpeak'); if (p) p.textContent = fmt(cur().peak); var b = $('#bust'); if (b) b.hidden = false; if (C.World.kickOut) C.World.kickOut(); },
    newNight: function () {
      s.nights.push({ n: cur().n + 1, started: Date.now(), peak: START, chips: START, status: 'playing' }); busted = false; zeroT = 0;
      C.bank.set(START); save(); var b = $('#bust'); if (b) b.hidden = true; lastRank = rank();
      if (C.World && C.World.restart) C.World.restart(); C.toast('New night. $5,000 in your pocket.');
    },
    open: function () {
      var d = $('#board'); if (!d || !s) return; boardOpen = true; this.render(); d.hidden = false; var b = $('#bust'); if (b) b.style.visibility = 'hidden';
      if (document.exitPointerLock) document.exitPointerLock();
    },
    close: function () { var d = $('#board'); if (d) d.hidden = true; boardOpen = false; var b = $('#bust'); if (b) b.style.visibility = ''; },
    toggle: function () { if (boardOpen) this.close(); else this.open(); },
    render: function () {
      if (!s) return;
      var rows = standings(), me1 = rank(), n = cur(), html = '', i, el;
      for (i = 0; i < rows.length; i++) { var r = rows[i]; html += rowH(r.out ? '–' : '#' + (i + 1), esc(r.name) + (r.you ? ' (you)' : ''), r.chips, r.out ? 'Kicked out' : 'Playing', r.you, r.out); }
      el = $('#lbrows'); if (el) el.innerHTML = html;
      el = $('#lbsub'); if (el) el.textContent = n.status === 'out' ? s.user + ', night ' + n.n + ': you were kicked out with a peak of ' + fmt(n.peak) + '.' : s.user + ', night ' + n.n + ': you are #' + me1 + ' of ' + rows.length + ' with ' + fmt(n.chips) + ' (peak ' + fmt(n.peak) + '). Players on this device only.';
      html = ''; for (i = s.nights.length - 1; i >= Math.max(0, s.nights.length - 8); i--) {
        var x = s.nights[i], d = new Date(x.started), when = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
        html += rowH('N' + x.n, when + ' · peak ' + fmt(x.peak), x.chips, x.status === 'out' ? 'Kicked out' : 'Playing', false, x.status === 'out');
      }
      el = $('#lbmine'); if (el) el.innerHTML = html;
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
