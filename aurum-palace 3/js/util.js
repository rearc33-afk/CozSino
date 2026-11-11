/* Aurum Palace - shared helpers. Plain scripts share one global: Casino. */
(function (G) {
  var C = G.Casino = G.Casino || {};
  C.clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  C.fmt = function (n) { return '$' + Math.round(n).toLocaleString('en-US'); };
  C.mulberry32 = function (a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  };
  C.rnd = function (a, b, r) { return a + (r || Math.random)() * (b - a); };
  C.pick = function (arr, r) { return arr[Math.floor((r || Math.random)() * arr.length)]; };
  C.shuffle = function (arr, r) {
    r = r || Math.random;
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(r() * (i + 1)), t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  };
  C.$ = function (s) { return typeof document !== 'undefined' ? document.querySelector(s) : null; };
  C.store = {
    get: function (k, d) { try { var v = localStorage.getItem('aurum_' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('aurum_' + k, JSON.stringify(v)); } catch (e) { /* storage may be blocked */ } }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
