/* Aurum Palace - per-frame life: strobing lights, flashes, the roulette wheels, the crowd, pickups. */
(function (G) {
  var C = G.Casino = G.Casino || {}, E = C.E, L = C.Level, tmpA, tmpB;

  L.spinWheel = function (w, num, D, done) {
    w.spin = { t: 0, D: D, th0: w.theta, wMax: 5.2, phi: C.ORDER.indexOf(num) * C.PS, N: 5 + Math.random() * 2, done: done }; w.num = num;
  };
  L.updateWheel = function (w, dt) {
    var s = w.spin, rr = 0.36, y = 1.05;
    if (s) {
      s.t += dt; var u = Math.min(1, s.t / s.D), k = 1 - u;
      w.theta = s.th0 + w.omega0 * s.t + (s.wMax - w.omega0) * s.D / 3 * (1 - k * k * k);
      w.p = s.phi + w.theta + k * k * k * s.N * Math.PI * 2;
      if (u < 0.72) rr = 0.55; else {
        var q = (u - 0.72) / 0.28; rr = 0.55 - 0.19 * q * q * (3 - 2 * q);
        if (u > 0.8) y += Math.abs(Math.sin((u - 0.8) * 60)) * 0.025 * (1 - u) * 5;
      }
      if (u >= 1) { w.spin = null; w.phiLock = s.phi; if (s.done) s.done(); }
    } else { w.theta += w.omega0 * dt; w.p = w.phiLock + w.theta; }
    w.pivot.rotation.y = w.theta;
    w.ball.position.set(w.cx + rr * Math.cos(w.p), y, -rr * Math.sin(w.p));
  };

  /* cool strobe from a lamp or a person's lucky moment; three lights are reused */
  L.flashAt = function (x, y, z, big) {
    var best = null, i, f;
    for (i = 0; i < E.flash.length; i++) { f = E.flash[i]; if (f.t >= f.dur) { best = f; break; } if (!best || f.t / f.dur > best.t / best.dur) best = f; }
    best.light.position.set(x, y, z); best.light.color.setHex(big ? 0xffffff : (Math.random() < 0.5 ? 0x8fd0ff : 0xd6ecff));
    best.t = 0; best.dur = big ? 1.3 : 0.45 + Math.random() * 0.3; best.peak = big ? 4.4 : 2.7 + Math.random() * 0.8;
  };
  L.celebrate = function (level, secs) { level.celebrate = Math.max(level.celebrate || 0, secs); };

  function drawJack(level) {
    var g = level.jackCanvas.getContext('2d');
    g.fillStyle = '#16050a'; g.fillRect(0, 0, 512, 128); g.strokeStyle = '#f2b84b'; g.lineWidth = 4; g.strokeRect(4, 4, 504, 120);
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ff7a3a'; g.font = '34px Limelight, Georgia, serif'; g.fillText('JACKPOT', 256, 34);
    g.fillStyle = '#ffd88a'; g.font = '56px Limelight, Georgia, serif'; g.fillText(C.fmt(C.Jackpot.value), 256, 86);
    level.jackTex.needsUpdate = true;
  }

  L.update = function (level, dt, t, player, hooks) {
    var M = E.M, i, k, T = THREE;
    tmpA = tmpA || new T.Color(); tmpB = tmpB || new T.Color(0xe6f6ff);
    level.t = t;
    var cel = level.celebrate > 0; if (cel) level.celebrate -= dt;
    // warm marquees chase; jackpot makes everything strobe
    var ph = Math.floor(t * 5) % 3;
    for (i = 0; i < 3; i++) M.marq[i].color.setHex(cel ? (Math.floor(t * 14) % 2 ? 0xfff0b0 : 0x6a3a10) : (i === ph ? 0xffe08a : 0x6a3a10));
    for (i = 0; i < 4; i++) M.strobe[i].color.setHex(cel || Math.sin(t * (9 + i * 4.3) + i * 1.7) > 0.55 ? 0xcfeaff : 0x15233a);
    // ceiling chasers: warm and cool bulbs run across the whole floor in waves, and all blink together on a jackpot
    var CH = [0xffb347, 0xcfeaff, 0xff5a2a, 0x8fd0ff, 0xffd24a, 0xffffff, 0xff7a1f, 0x7fc4ff];
    for (i = 0; i < 8; i++) {
      var wave = ((t * 6 - i * 1.0) % 8 + 8) % 8, tw = Math.sin(t * (5 + i * 1.3) + i * 2.1) > 0.82;
      M.chase[i].color.setHex(cel ? (Math.floor(t * 12) % 2 ? CH[i] : 0x20150f) : (wave < 1.6 || tw ? CH[i] : (i % 2 ? 0x1a2a40 : 0x3a1c0c)));
    }
    M.coolNeon.color.setHex(0x4a86c0).lerp(tmpB, 0.5 + 0.5 * Math.sin(t * 2.2));
    // machine screens flicker through their frames
    level.scr = level.scr || [];
    for (i = 0; i < E.screenTex.length; i++) {
      if (!(t > (level.scr[i] || 0))) continue;
      level.scr[i] = t + 0.12 + Math.random() * 0.9;
      E.screenTex[i].offset.x = (cel ? 6 + Math.floor(Math.random() * 2) : Math.floor(Math.random() * 6)) / 8;
    }
    // ambient cool flashes near the player
    level.flashNext = (level.flashNext || 0) - dt;
    if (level.flashNext <= 0) {
      level.flashNext = cel ? 0.08 : 0.08 + Math.random() * 0.3;
      var ms = level.machines;
      for (k = 0; k < 20; k++) {
        var mc = ms[Math.floor(Math.random() * ms.length)], d = Math.hypot(mc.x - player.x, mc.z - player.z);
        if (d > 3 && d < 24) { L.flashAt(mc.x, 1.9, mc.z, false); break; }
      }
    }
    for (i = 0; i < E.flash.length; i++) {
      var f = E.flash[i];
      if (f.t < f.dur) { f.t += dt; var u = f.t / f.dur, on = u < 0.15 || Math.floor(f.t * 14) % 2 === 0; f.light.intensity = f.peak * (1 - u) * (on ? 1 : 0.15); }
      else f.light.intensity = 0;
    }
    // roulette wheels spin on their own unless someone is playing them
    for (i = 0; i < level.wheels.length; i++) {
      var w = level.wheels[i];
      if (!w.owned && !w.spin) { w.auto -= dt; if (w.auto <= 0) { L.spinWheel(w, Math.floor(Math.random() * 37), 7.5, null); w.auto = 18 + Math.random() * 25; } }
      L.updateWheel(w, dt);
    }
    // jackpot pillar
    if (level.jackRing) { level.jackRing.rotation.y += dt * 0.25; level.jackDraw = (level.jackDraw || 0) - dt; if (level.jackDraw <= 0) { level.jackDraw = 0.25; C.Jackpot.tick(0.25); drawJack(level); } }
    // gold chips to collect
    for (i = 0; i < level.chips.length; i++) {
      var ch = level.chips[i]; if (ch.got) continue;
      ch.obj.rotation.y += dt * 2.6; ch.obj.position.y = 1.0 + Math.sin(t * 2 + i) * 0.08;
      if (Math.hypot(ch.x - player.x, ch.z - player.z) < 0.9) { ch.got = true; level.group.remove(ch.obj); if (hooks.chip) hooks.chip(ch); }
    }
    level.crowd.update(dt, t, player, {
      onWin: function (p, dist) { L.flashAt(p.x, 1.9, p.z, false); if (hooks.npcWin) hooks.npcWin(p, dist); }
    });
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
