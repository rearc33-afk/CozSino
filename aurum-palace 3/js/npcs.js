/* Aurum Palace - the crowd: seated players, dealers, standing bettors and wandering guests.
   Every person is drawn with instanced meshes (7 draw calls total no matter how many people). */
(function (G) {
  var C = G.Casino = G.Casino || {}, E = C.E, T;
  var SHIRTS = ['#1b1b22', '#2a3550', '#b3262d', '#d9a441', '#e8e8ee', '#3a7d6b', '#6b3fa0', '#c9622b', '#2e4a7a', '#f0c75e', '#8b1d3a', '#1f6f78', '#e86a92'];
  var SKINS = ['#f1c9a5', '#e0ac85', '#c68642', '#8d5524', '#5c3a21', '#ffdbb4'];
  var PANTS = ['#15151a', '#262a3a', '#3a2a1d', '#1d2b3a'];
  var HAIR = ['#1b1210', '#3a2415', '#6b4423', '#b08a4a', '#c9c2b8', '#7a2b1b'];
  var mw, ml, mb, sv, pos;

  function Crowd(parent, defs, maze, rng) {
    T = THREE; mw = new T.Matrix4(); ml = new T.Matrix4(); mb = new T.Matrix4(); sv = new T.Vector3(); pos = new T.Vector3();
    var n = defs.length, mat = E.M.npc, self = this;
    this.maze = maze; this.rng = rng; this.people = []; this.group = parent;
    var mk = function (geo, count) { var m = new T.InstancedMesh(geo, mat, count); m.frustumCulled = false; m.instanceMatrix.setUsage(T.DynamicDrawUsage); parent.add(m); return m; };
    var arm = new T.BoxGeometry(0.1, 0.52, 0.1); arm.translate(0, -0.26, 0);
    var leg = new T.BoxGeometry(0.15, 0.8, 0.15); leg.translate(0, -0.4, 0);
    var hair = new T.SphereGeometry(0.135, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.55);
    this.geos = [arm, leg, hair];
    this.torso = mk(new T.BoxGeometry(0.4, 0.58, 0.24), n); this.head = mk(new T.SphereGeometry(0.12, 8, 6), n);
    this.hair = mk(hair, n); this.arms = mk(arm, n * 2); this.legs = mk(leg, n * 2);
    this.geos.push(this.torso.geometry, this.head.geometry);
    var col = new T.Color();
    var paint = function (mesh, i, hex) { mesh.setColorAt(i, col.set(hex)); };
    defs.forEach(function (d, i) {
      var shirt = d.pose === 'dealer' ? '#17121e' : C.pick(SHIRTS, rng), skin = C.pick(SKINS, rng), pants = d.pose === 'dealer' ? '#0d0d12' : C.pick(PANTS, rng);
      paint(self.torso, i, shirt); paint(self.head, i, skin); paint(self.hair, i, C.pick(HAIR, rng));
      paint(self.arms, i * 2, shirt); paint(self.arms, i * 2 + 1, shirt); paint(self.legs, i * 2, pants); paint(self.legs, i * 2 + 1, pants);
      var p = { i: i, x: d.x, z: d.z, yaw: d.yaw || 0, pose: d.pose, seat: d.pose === 'slot' || d.pose === 'card', phase: rng() * 20, cel: 0, next: 6 + rng() * 40,
        reach: 0, machine: d.machine || null, speed: 1.0 + rng() * 0.7, off: (rng() - 0.5) * 0.8, wait: 0, path: [], tx: 0, tz: 0, walking: false, scale: 0.94 + rng() * 0.12 };
      if (d.walker) { p.walker = true; p.pose = 'walk'; p.cell = maze.cellAt(d.x, d.z); p.wait = rng() * 4; }
      self.people.push(p);
    });
    [this.torso, this.head, this.hair, this.arms, this.legs].forEach(function (m) { if (m.instanceColor) m.instanceColor.needsUpdate = true; });
  }
  var P = Crowd.prototype;

  function part(mesh, idx, lx, ly, lz, rx, sx, sy, sz) {
    ml.makeRotationX(rx); if (sx !== 1 || sy !== 1 || sz !== 1) ml.scale(sv.set(sx, sy, sz));
    ml.setPosition(lx, ly, lz); mw.multiplyMatrices(mb, ml); mesh.setMatrixAt(idx, mw);
  }
  P.draw = function (p, t) {
    var seated = p.seat, y0 = seated ? -0.27 : 0, s = p.scale;
    var raiseL = 0, raiseR = 0, lean = 0, bob = 0, sway = 0, legA = 0, legB = 0, ph = t * 1.0 + p.phase;
    if (p.pose === 'slot') {
      var tap = Math.max(0, Math.sin(ph * 5.5)) * 0.18;
      raiseR = 0.95 + tap; raiseL = 0.55; lean = 0.12; sway = Math.sin(ph * 0.7) * 0.06;
      if (p.cel > 0) { raiseL = raiseR = 2.7 + Math.sin(t * 14 + p.phase) * 0.3; lean = -0.15; bob = Math.abs(Math.sin(t * 9 + p.phase)) * 0.08; }
    } else if (p.pose === 'card') {
      raiseL = 0.8; raiseR = 0.8 + (p.reach > 0 ? Math.sin(p.reach * Math.PI) * 0.5 : 0); lean = 0.1; sway = Math.sin(ph * 0.5) * 0.08;
    } else if (p.pose === 'stand') {
      raiseR = p.reach > 0 ? 0.6 + Math.sin(p.reach * Math.PI) * 0.9 : 0.1; raiseL = 0.1; sway = Math.sin(ph * 0.6) * 0.05;
    } else if (p.pose === 'dealer') {
      var k = Math.sin(ph * 1.8); raiseR = 0.9 + (k > 0.3 ? k * 0.7 : 0); raiseL = 0.75; sway = Math.sin(ph * 0.4) * 0.1;
    } else if (p.pose === 'walk') {
      var w = p.walking ? Math.sin(p.phase * 2.6) : 0; legA = w * 0.65; legB = -w * 0.65; raiseL = -w * 0.5; raiseR = w * 0.5; bob = p.walking ? Math.abs(w) * 0.03 : 0;
      sway = p.walking ? 0 : Math.sin(ph * 0.5) * 0.3;
    }
    pos.set(p.x, bob, p.z); mb.makeRotationY(p.yaw + sway); mb.setPosition(pos);
    if (s !== 1) { mb.scale(sv.set(s, s, s)); }
    var i = p.i, ty = 1.11 + y0;
    part(this.torso, i, 0, ty, 0, lean, 1, 1, 1);
    part(this.head, i, 0, 1.55 + y0 + 0.02, lean * 0.5 + 0.03 + (seated ? 0.04 : 0), 0, 1, 1, 1);
    part(this.hair, i, 0, 1.58 + y0, -0.01 + lean * 0.5, 0, 1, 1, 1);
    part(this.arms, i * 2, -0.26, 1.36 + y0, 0.0, -raiseL, 1, 1, 1);
    part(this.arms, i * 2 + 1, 0.26, 1.36 + y0, 0.0, -raiseR, 1, 1, 1);
    if (seated) { part(this.legs, i * 2, -0.1, 0.55, 0, -Math.PI / 2, 1, 0.5, 1); part(this.legs, i * 2 + 1, 0.1, 0.55, 0, -Math.PI / 2, 1, 0.5, 1); }
    else { part(this.legs, i * 2, -0.1, 0.82, 0, legA, 1, 1, 1); part(this.legs, i * 2 + 1, 0.1, 0.82, 0, legB, 1, 1, 1); }
  };

  function turn(a, b, k) { var d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return a + d * Math.min(1, k); }

  P.pickDest = function (p) {
    var m = this.maze, rng = this.rng, c, r, a = m.areas[Math.floor(rng() * m.areas.length)];
    if (rng() < 0.55) { c = a.c0 + Math.floor(rng() * 3); r = a.r0 + Math.floor(rng() * 3); }
    else { c = Math.floor(rng() * m.cols); r = Math.floor(rng() * m.rows); }
    if (m.isBlocked(c, r)) { p.wait = 0.5; return; }
    p.path = m.path(p.cell, { c: c, r: r }); if (!p.path.length) p.wait = 1 + rng() * 3;
  };
  P.update = function (dt, t, player, hooks) {
    var m = this.maze, rng = this.rng, cs = m.cell;
    for (var k = 0; k < this.people.length; k++) {
      var p = this.people[k];
      if (p.walker) {
        var dxp = player.x - p.x, dzp = player.z - p.z, near = dxp * dxp + dzp * dzp < 1.1;
        if (p.wait > 0) { p.wait -= dt; p.walking = false; if (p.wait <= 0 && !p.path.length) this.pickDest(p); }
        else if (!p.path.length) { p.wait = 1 + rng() * 5; p.walking = false; }
        else {
          var nx = p.path[0], cc = m.center(nx.c, nx.r), hx = cc.x, hz = cc.z;
          var ddx = hx - p.x, ddz = hz - p.z, len = Math.hypot(ddx, ddz);
          // sidestep so guests do not all walk the exact centre line
          var ox = -ddz / (len || 1) * p.off * Math.min(1, len / 2), oz = ddx / (len || 1) * p.off * Math.min(1, len / 2);
          if (len < 0.35) { p.cell = { c: nx.c, r: nx.r }; p.path.shift(); }
          else if (!near) {
            var sp = p.speed * dt; p.x += (ddx / len) * sp + ox * dt * 0.3; p.z += (ddz / len) * sp + oz * dt * 0.3; p.phase += dt * p.speed * 2.2; p.walking = true;
            p.yaw = turn(p.yaw, Math.atan2(ddx, ddz), dt * 7);
          } else p.walking = false;
        }
        if (!p.walking) p.phase += 0; 
      } else {
        if (p.cel > 0) p.cel -= dt;
        if (p.reach > 0) p.reach -= dt * 0.8;
        p.next -= dt;
        if (p.next <= 0) {
          if (p.pose === 'slot') { var d2 = (p.x - player.x) * (p.x - player.x) + (p.z - player.z) * (p.z - player.z); p.next = 15 + rng() * 45; if (rng() < 0.7) { p.cel = 3.2; if (hooks && hooks.onWin) hooks.onWin(p, Math.sqrt(d2)); } }
          else { p.next = 4 + rng() * 12; p.reach = 1; }
        }
      }
      this.draw(p, t);
    }
    this.torso.instanceMatrix.needsUpdate = true; this.head.instanceMatrix.needsUpdate = true; this.hair.instanceMatrix.needsUpdate = true;
    this.arms.instanceMatrix.needsUpdate = true; this.legs.instanceMatrix.needsUpdate = true;
  };
  P.dispose = function () {
    var g = this.group;
    [this.torso, this.head, this.hair, this.arms, this.legs].forEach(function (m) { g.remove(m); m.dispose(); });
    this.geos.forEach(function (x) { x.dispose(); });
  };
  C.Crowd = Crowd;
})(typeof globalThis !== 'undefined' ? globalThis : this);
