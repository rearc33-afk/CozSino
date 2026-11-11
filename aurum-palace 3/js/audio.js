/* Aurum Palace - everything you hear is synthesized live with the Web Audio API (no audio files). */
(function (G) {
  var C = G.Casino = G.Casino || {}, clamp = C.clamp, rnd = C.rnd;
  var ctx = null, master, bus, lp, gbus, noiseBuf, timer = null, muted = false, dd = null;
  var S = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
  var PENT = [784, 880, 1046.5, 1174.7, 1318.5, 1568, 1760, 2093, 2349];

  function mkNoise(sec) { var b = ctx.createBuffer(1, ctx.sampleRate * sec, ctx.sampleRate), d = b.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; }
  function mkImpulse(sec, dec) { var len = ctx.sampleRate * sec, b = ctx.createBuffer(2, len, ctx.sampleRate); for (var c = 0; c < 2; c++) { var d = b.getChannelData(c); for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, dec); } return b; }
  function out(node, pan, dest) {
    var n = node;
    if (pan !== undefined && ctx.createStereoPanner) { var p = ctx.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); node.connect(p); n = p; }
    n.connect(dest || dd || bus);
  }
  function tone(f, t, d, v, type, pan, dest) {
    var o = ctx.createOscillator(), g = ctx.createGain(); o.type = type || 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); out(g, pan, dest); o.start(t); o.stop(t + d + 0.05);
  }
  function burst(t, d, v, type, freq, q, pan, dest) {
    var s = ctx.createBufferSource(); s.buffer = noiseBuf; var f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q || 1;
    var g = ctx.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); s.connect(f); f.connect(g); out(g, pan, dest); s.start(t, Math.random() * 1.5, d + 0.05);
  }
  function bell(f, t, v, pan) { [[1, 1], [2.76, 0.5], [5.4, 0.22], [8.93, 0.1]].forEach(function (p) { tone(f * p[0], t, 1.2 / Math.sqrt(p[0]), v * p[1], 'sine', pan); }); }
  function roll(t, pan) {
    var n = Math.floor(rnd(8, 20)), tt = t, gap = 0.028;
    for (var i = 0; i < n; i++) { burst(tt, 0.014, 0.16, 'highpass', 3200, 0.7, pan); tone(1400 + rnd(0, 500), tt, 0.02, 0.02, 'square', pan); tt += gap; gap *= 1.1; }
    burst(tt, 0.06, 0.18, 'lowpass', 500, 0.8, pan); tone(95, tt, 0.12, 0.12, 'sine', pan);
  }
  function jingle(t, pan) {
    var tt = t, idx = Math.floor(rnd(0, 4)), n = Math.floor(rnd(3, 7));
    for (var i = 0; i < n; i++) { var f = PENT[idx]; tone(f, tt, 0.35, 0.05, 'triangle', pan); tone(f * 2.005, tt, 0.2, 0.02, 'sine', pan); tt += rnd(0.05, 0.09); idx = clamp(idx + (Math.random() < 0.7 ? 1 : -1), 0, 8); }
  }
  function cascade(t, pan, dur) {
    var n = Math.floor(dur * 18);
    for (var i = 0; i < n; i++) { var tt = t + rnd(0, dur); burst(tt, 0.06, 0.09, 'bandpass', rnd(4500, 9000), 6, pan + rnd(-0.1, 0.1)); tone(rnd(2400, 5200), tt, 0.09, 0.025, 'sine', pan); }
  }
  function jackpot(t, pan) {
    var tt = t, i;
    for (i = 0; i < 11; i++) { tone(523.25 * Math.pow(2, S[i] / 12), tt, 0.3, 0.06, 'triangle', pan); tt += 0.065; }
    bell(1046.5, tt, 0.07, pan); bell(1318.5, tt, 0.06, pan); bell(1568, tt, 0.05, pan); cascade(tt - 0.2, pan, 2.2);
    for (var k = 0; k < 8; k++) bell(1480 + (k % 2) * 220, t + 0.3 + k * 0.17, 0.04, pan);
  }
  function siren(t, pan) {
    var o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 720; var l = ctx.createOscillator(); l.frequency.value = 3.2;
    var lg = ctx.createGain(); lg.gain.value = 180; l.connect(lg); lg.connect(o.frequency);
    var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1700; var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.03, t + 0.15); g.gain.setValueAtTime(0.03, t + 1.4); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
    o.connect(f); f.connect(g); out(g, pan); o.start(t); l.start(t); o.stop(t + 1.9); l.stop(t + 1.9);
  }
  function pulse() {
    if (!ctx || ctx.state === 'suspended') return;
    var t = ctx.currentTime + 0.03, r = Math.random(), pan = rnd(-0.9, 0.9);
    if (r < 0.26) roll(t, pan); else if (r < 0.46) jingle(t, pan); else if (r < 0.56) cascade(t, pan, rnd(0.8, 1.8));
    else if (r < 0.63) bell(rnd(1100, 2000), t, 0.05, pan); else if (r < 0.645) jackpot(t, pan); else if (r < 0.655) siren(t, pan);
    if (Math.random() < 0.25) roll(t + rnd(0.02, 0.2), rnd(-1, 1));
  }
  function game(fn) { dd = gbus; try { fn(ctx.currentTime + 0.02); } finally { dd = null; } }

  C.Sfx = {
    start: function () {
      if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
      var AC = G.AudioContext || G.webkitAudioContext; if (!AC) return;
      ctx = new AC(); noiseBuf = mkNoise(2);
      var comp = ctx.createDynamicsCompressor(); master = ctx.createGain(); master.gain.value = muted ? 0 : 0.9; master.connect(comp); comp.connect(ctx.destination);
      bus = ctx.createGain(); bus.gain.value = 0.8; lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 6000; bus.connect(lp); lp.connect(master);
      gbus = ctx.createGain(); gbus.gain.value = 1; gbus.connect(master);
      var conv = ctx.createConvolver(); conv.buffer = mkImpulse(2.2, 3); var send = ctx.createGain(); send.gain.value = 0.3; bus.connect(send); send.connect(conv); conv.connect(master);
      var crowd = ctx.createBufferSource(); crowd.buffer = mkNoise(4); crowd.loop = true;
      var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 420; bp.Q.value = 0.5; var cg = ctx.createGain(); cg.gain.value = 0.09;
      var lfo = ctx.createOscillator(); lfo.frequency.value = 0.13; var lg = ctx.createGain(); lg.gain.value = 0.03; lfo.connect(lg); lg.connect(cg.gain);
      crowd.connect(bp); bp.connect(cg); cg.connect(master); crowd.start(); lfo.start();
      var hum = ctx.createOscillator(); hum.type = 'sine'; hum.frequency.value = 55; var hg = ctx.createGain(); hg.gain.value = 0.02; hum.connect(hg); hg.connect(master); hum.start();
      timer = setInterval(pulse, 105);
      for (var i = 0; i < 8; i++) setTimeout(pulse, i * 80);
    },
    toggle: function () { muted = !muted; if (master) master.gain.setTargetAtTime(muted ? 0 : 0.9, ctx.currentTime, 0.05); return muted; },
    isMuted: function () { return muted; },
    // loud = how near the slot floor you are, open = how open the space around you is (walls muffle the highs)
    ambience: function (loud, open, seated) { if (!ctx) return; bus.gain.setTargetAtTime(seated ? 0.5 : 0.4 + 0.6 * loud, ctx.currentTime, 0.4); lp.frequency.setTargetAtTime(seated ? 5000 : 1500 + 7000 * open, ctx.currentTime, 0.3); },
    // a sound at a place in the room: someone wins nearby
    spot: function (kind, dist, pan) {
      if (!ctx) return; var v = Math.pow(clamp(1 - dist / 26, 0, 1), 1.4); if (v < 0.03) return;
      var g = ctx.createGain(); g.gain.value = v * 1.4; var p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      if (p) { p.pan.value = clamp(pan, -1, 1); g.connect(p); p.connect(master); } else g.connect(master);
      dd = g; try { var t = ctx.currentTime + 0.02; if (kind === 'jackpot') jackpot(t); else { jingle(t); cascade(t + 0.25, 0, 0.8); bell(1568, t + 0.1, 0.05); } } finally { dd = null; }
    },
    chip: function () { if (!ctx) return; game(function (t) { burst(t, 0.05, 0.25, 'bandpass', 3200, 3); tone(1500, t, 0.06, 0.05, 'triangle'); }); },
    coin: function () { if (!ctx) return; game(function (t) { tone(988, t, 0.1, 0.08, 'square'); tone(1319, t + 0.08, 0.35, 0.08, 'square'); bell(1976, t + 0.08, 0.04); }); },
    card: function () { if (!ctx) return; game(function (t) { burst(t, 0.07, 0.2, 'highpass', 2500, 0.6); }); },
    flip: function () { if (!ctx) return; game(function (t) { burst(t, 0.05, 0.16, 'bandpass', 4200, 2); tone(660, t + 0.03, 0.08, 0.04, 'triangle'); }); },
    reelStop: function () { if (!ctx) return; game(function (t) { burst(t, 0.06, 0.2, 'lowpass', 500, 0.8); tone(95, t, 0.14, 0.16, 'sine'); }); },
    reels: function (stops) {
      if (!ctx) return;
      game(function (t) {
        var end = stops[stops.length - 1];
        for (var tt = 0; tt < end; tt += 0.055) burst(t + tt, 0.012, 0.14, 'highpass', 3200, 0.7);
        stops.forEach(function (s) { burst(t + s, 0.06, 0.2, 'lowpass', 500, 0.8); tone(95, t + s, 0.14, 0.16, 'sine'); });
      });
    },
    rattle: function (D) {
      if (!ctx) return;
      game(function (t) {
        var tt = 0; while (tt < D) { var u = tt / D; burst(t + tt, 0.012, 0.12 * (1 - u * 0.5), 'highpass', 2600, 0.8); tone(2200 + rnd(0, 600), t + tt, 0.02, 0.02, 'square'); tt += 0.04 + u * u * 0.4; }
        burst(t + D, 0.08, 0.2, 'lowpass', 700, 0.8);
      });
    },
    win: function (level) {
      if (!ctx) return;
      game(function (t) { if (level >= 2) jackpot(t, 0); else { for (var i = 0; i < 5; i++) tone(523.25 * Math.pow(2, S[i] / 12), t + i * 0.08, 0.35, 0.08, 'triangle'); cascade(t + 0.3, 0, 0.9); } });
    },
    lose: function () { if (!ctx) return; game(function (t) { tone(196, t, 0.4, 0.08, 'triangle'); tone(147, t + 0.18, 0.5, 0.08, 'triangle'); }); }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
