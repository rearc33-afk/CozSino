/* Aurum Palace - turns a Maze into a 3D level: walls, floors, rooms, props, collectibles, crowd. */
(function (G) {
  var C = G.Casino = G.Casino || {}, E = C.E, P = C.Props, MZ = C.Maze, L = C.Level = {};
  var RH = 4.6, TH = 0.4;

  function drawSign(g, text, w, h, size) {
    g.fillStyle = '#1a0608'; g.fillRect(0, 0, w, h); g.strokeStyle = '#f2b84b'; g.lineWidth = 6; g.strokeRect(10, 10, w - 20, h - 20);
    g.lineWidth = 2; g.strokeRect(24, 24, w - 48, h - 48); g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = size + 'px Limelight, Georgia, serif'; g.shadowColor = '#ff8a1f'; g.shadowBlur = 24; g.fillStyle = '#ffd88a'; g.fillText(text, w / 2, h / 2 + 4);
  }

  L.build = function (seed) {
    var m = MZ.generate(seed), M = E.M, T = THREE, CELL = m.cell, rng = C.mulberry32(seed * 7 + 13);
    var group = new T.Group(); E.scene.add(group);
    var K = { b: new E.Batch(), dyn: group, colliders: [], stations: [], seats: [], machines: [], wheels: [], shared: [], disposables: [], signs: [], mi: 0 };
    var B = K.b, xl = function (c) { return (c - m.cols / 2) * CELL; }, zl = function (r) { return (r - m.rows / 2) * CELL; };
    var level = { maze: m, group: group, K: K, seed: seed, colliders: K.colliders, stations: K.stations, machines: K.machines, wheels: K.wheels, chips: [], jackRing: null, flashT: 0, t: 0 };

    /* floors and ceiling (uv scaled so every carpet tile is 3 units wide) */
    var ft = C.Carpet.make(m), fmat = new T.MeshLambertMaterial({ map: ft, emissiveMap: ft, emissive: 0xffffff, emissiveIntensity: 0.55 });
    var floor = new T.Mesh(new T.PlaneGeometry(m.w, m.d), fmat); floor.rotation.x = -Math.PI / 2; group.add(floor);
    K.disposables.push(ft, fmat, floor.geometry);
    var cg = new T.PlaneGeometry(m.w, m.d); B.add(cg, M.ceil, B.xf(0, RH, 0, 0, Math.PI / 2), m.cols, m.rows); cg.dispose();

    /* outer walls only; the floor is open */
    var wall = function (x, z, ry, val) {
      var horiz = ry === 0, hl = CELL;
      var add = function (len, off, y, hgt, mat, thick) {
        var px = horiz ? x + off : x, pz = horiz ? z : z + off;
        B.box(mat, len, hgt, thick || TH, px, y, pz, ry, mat === M.wall ? len / 2.4 : 1, 1);
      };
      var coll = function (len, off) {
        var px = horiz ? x + off : x, pz = horiz ? z : z + off;
        K.colliders.push(horiz ? { x0: px - len / 2, x1: px + len / 2, z0: pz - TH / 2, z1: pz + TH / 2 } : { x0: px - TH / 2, x1: px + TH / 2, z0: pz - len / 2, z1: pz + len / 2 });
      };
      if (val === 0) {
        add(hl, 0, RH / 2, RH, M.wall); coll(hl, 0);
        add(hl, 0, RH - 0.22, 0.07, M.neon, TH + 0.06);
        [-1, 1].forEach(function (s) { // sconces on both faces
          var sx = horiz ? x : x + s * (TH / 2 + 0.05), sz = horiz ? z + s * (TH / 2 + 0.05) : z;
          B.box(M.sconce, horiz ? 0.24 : 0.1, 0.42, horiz ? 0.1 : 0.24, sx, 2.9, sz, 0);
        });
      } else if (val === 1) {
        var side = (hl - MZ.DOOR) / 2, o = MZ.DOOR / 2 + side / 2;
        add(side, -o, RH / 2, RH, M.wall); add(side, o, RH / 2, RH, M.wall); coll(side, -o); coll(side, o);
        add(MZ.DOOR, 0, 2.9 + (RH - 2.9) / 2, RH - 2.9, M.wall);
        add(hl, 0, RH - 0.22, 0.07, M.neon, TH + 0.06);
        add(MZ.DOOR + 0.3, 0, 2.93, 0.14, M.gold, 0.55);
        add(MZ.DOOR + 0.2, 0, 3.12, 0.05, M.coolNeon, 0.58);
        add(0.14, -MZ.DOOR / 2, 1.45, 2.9, M.gold, 0.55); add(0.14, MZ.DOOR / 2, 1.45, 2.9, M.gold, 0.55);
      }
    };
    var r, c, d;
    for (r = 0; r <= m.rows; r++) for (c = 0; c < m.cols; c++) { var hv = m.h[r][c]; if (hv < 2 && (r === 0 || r === m.rows)) wall(m.center(c, 0).x, zl(r), 0, hv); }
    for (r = 0; r < m.rows; r++) for (c = 0; c <= m.cols; c++) { var vv = m.v[r][c]; if (vv < 2 && (c === 0 || c === m.cols)) wall(xl(c), m.center(0, r).z, Math.PI / 2, vv); }
    // gold corner posts wherever walls meet
    for (r = 0; r <= m.rows; r++) for (c = 0; c <= m.cols; c++) {
      var hit = (c > 0 && m.h[r][c - 1] < 2) || (c < m.cols && m.h[r][c] < 2) || (r > 0 && m.v[r - 1][c] < 2) || (r < m.rows && m.v[r][c] < 2);
      if (!hit || !(r === 0 || r === m.rows || c === 0 || c === m.cols)) continue;
      var px = xl(c), pz = zl(r);
      B.box(M.bodyDark, 0.56, RH, 0.56, px, RH / 2, pz, 0); B.box(M.gold, 0.64, 0.14, 0.64, px, 0.3, pz, 0); B.box(M.gold, 0.64, 0.14, 0.64, px, RH - 0.45, pz, 0);
      K.colliders.push({ x0: px - 0.28, x1: px + 0.28, z0: pz - 0.28, z1: pz + 0.28 });
    }
    // entrance doors on the south wall (closed)
    var ec = m.center(m.entry.c, m.entry.r), ez = zl(m.rows) - 0.3;
    B.box(M.gold, 3.6, 3.3, 0.1, ec.x, 1.65, ez, 0); B.box(M.wood, 1.5, 3.0, 0.08, ec.x - 0.78, 1.55, ez - 0.07, 0); B.box(M.wood, 1.5, 3.0, 0.08, ec.x + 0.78, 1.55, ez - 0.07, 0);
    B.box(M.gold, 0.08, 0.5, 0.08, ec.x - 0.12, 1.4, ez - 0.14, 0); B.box(M.gold, 0.08, 0.5, 0.08, ec.x + 0.12, 1.4, ez - 0.14, 0);

    /* machines along a wall of one cell (3 machines, inward facing) */
    var wallMachines = function (cc, rr, dd, p) {
      var ctr = m.center(cc, rr), fx = -MZ.DX[dd], fz = -MZ.DZ[dd], rot = Math.atan2(fx, fz), back = CELL / 2 - (m.inside(cc + MZ.DX[dd], rr + MZ.DZ[dd]) ? 0 : TH / 2) - 0.4;
      [-1.1, 0, 1.1].forEach(function (lat) {
        var x = ctr.x - fx * back + Math.abs(fz) * lat, z = ctr.z - fz * back + Math.abs(fx) * lat;
        var mc = P.machine(K, x, z, rot, K.mi++); mc.seat.p = p;
      });
    };
    /* rooms */
    var theme = { slots: 'SLOTS', blackjack: 'BLACKJACK', poker: 'POKER', holdem: 'TEXAS HOLD\'EM', roulette: 'ROULETTE', hub: 'THE ATRIUM' };
    m.areas.forEach(function (a) {
      var sy = [[-3, -3], [3, -3], [-3, 3], [3, 3]];
      sy.forEach(function (o, k) {
        var bx = a.x + o[0], bz = a.z + o[1], alongX = (o[0] * o[1]) > 0;
        var rot = alongX ? -o[0] / 3 * Math.PI / 2 : (o[1] > 0 ? Math.PI : 0);
        if (a.type === 'slots') {
          [-1.575, -0.525, 0.525, 1.575].forEach(function (lz) {
            P.machine(K, bx - 0.4, bz + lz, -Math.PI / 2, K.mi++).seat.p = 0.62; P.machine(K, bx + 0.4, bz + lz, Math.PI / 2, K.mi++).seat.p = 0.62;
          });
        } else if (a.type === 'blackjack') P.blackjack(K, bx, bz, rot);
        else if (a.type === 'poker') P.poker(K, bx, bz, rot);
        else if (a.type === 'holdem') P.poker(K, bx, bz, rot, 'holdem');
        else if (a.type === 'roulette') { var ro = P.loc(bx, bz, rot, 0.725, 0); P.roulette(K, ro.x, ro.z, rot); }
        else if (a.type === 'hub') P.cocktail(K, bx, bz);
      });
      if (a.type === 'slots') for (var rr = a.r0; rr <= a.r1; rr++) for (var cc = a.c0; cc <= a.c1; cc++) for (var dd = 0; dd < 4; dd++) {
        var nc = cc + MZ.DX[dd], nr = rr + MZ.DZ[dd];
        if (m.edge(cc, rr, dd) === 0 && (!m.inside(nc, nr) || m.area[nr][nc] !== a.id)) wallMachines(cc, rr, dd, 0.55);
      }
      // hanging signs, readable from every side
      var sg = function (ry) {
        var w = 1024, h = 210, size = theme[a.type].length > 9 ? 78 : 92, cv = E.ctex(w, h, function (g) { drawSign(g, theme[a.type], w, h, size); });
        K.signs.push({ tex: cv, text: theme[a.type], w: w, h: h, size: size });
        var mesh = new T.Mesh(new T.PlaneGeometry(4.4, 0.9), new T.MeshBasicMaterial({ map: cv })); mesh.position.set(a.x, 3.4, a.z); mesh.rotation.y = ry; group.add(mesh);
        K.disposables.push(mesh.geometry, mesh.material, cv);
      };
      if (a.type !== 'hub') { [0, Math.PI, Math.PI / 2, -Math.PI / 2].forEach(function (ry) { sg(ry); }); B.box(M.gold, 0.06, RH - 3.85, 0.06, a.x, (3.85 + RH) / 2, a.z, 0); }
      if (a.type === 'hub') {
        B.cyl(M.body, 0.8, 0.8, RH, 24, a.x, RH / 2, a.z); B.cyl(M.gold, 1.25, 1.35, 0.4, 24, a.x, 0.2, a.z); B.cyl(M.gold, 1.25, 1.0, 0.3, 24, a.x, RH - 0.15, a.z);
        var tg = new T.TorusGeometry(0.86, 0.04, 6, 32); B.add(tg, M.gold, B.xf(a.x, 3.72, a.z, 0, Math.PI / 2)); B.add(tg, M.gold, B.xf(a.x, 2.88, a.z, 0, Math.PI / 2)); tg.dispose();
        P.lightCone(K, a.x, a.z, 3.0);
        K.colliders.push({ x0: a.x - 1.35, x1: a.x + 1.35, z0: a.z - 1.35, z1: a.z + 1.35 });
        var cv = document.createElement('canvas'); cv.width = 512; cv.height = 128; var tex = new T.CanvasTexture(cv); tex.encoding = T.sRGBEncoding; tex.wrapS = T.RepeatWrapping; tex.repeat.set(2, 1);
        var ring = new T.Mesh(new T.CylinderGeometry(0.84, 0.84, 0.8, 32, 1, true), new T.MeshBasicMaterial({ map: tex, side: T.DoubleSide })); ring.position.set(a.x, 3.3, a.z); group.add(ring);
        level.jackRing = ring; level.jackCanvas = cv; level.jackTex = tex; K.disposables.push(ring.geometry, ring.material, tex);
      }
    });

    /* ceiling chasers over every cell, bulb strings along the walls and bulbs ringing each room sign */
    for (r = 0; r < m.rows; r++) for (c = 0; c < m.cols; c++) {
      var cc3 = m.center(c, r);
      [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6], [0, 0]].forEach(function (o, k) {
        B.box(M.chase[(c * 3 + r * 5 + k * 2) % 8], k === 4 ? 0.7 : 0.45, 0.05, k === 4 ? 0.7 : 0.45, cc3.x + o[0], RH - 0.04, cc3.z + o[1], 0);
      });
    }
    for (c = 0; c < m.cols * 4; c++) { // bulb strings along the north and south walls, just under the neon
      var bx2 = -m.w / 2 + 0.75 + c * (m.w / (m.cols * 4)), mt = M.chase[(c * 3) % 8], mt2 = M.chase[(c * 3 + 4) % 8];
      B.box(mt, 0.16, 0.16, 0.16, bx2, RH - 0.55, -m.d / 2 + 0.3, 0); B.box(mt2, 0.16, 0.16, 0.16, bx2, RH - 0.55, m.d / 2 - 0.3, 0);
    }
    for (r = 0; r < m.rows * 4; r++) {
      var bz2 = -m.d / 2 + 0.75 + r * (m.d / (m.rows * 4)), mw = M.chase[(r * 3 + 2) % 8], mw2 = M.chase[(r * 3 + 6) % 8];
      B.box(mw, 0.16, 0.16, 0.16, -m.w / 2 + 0.3, RH - 0.55, bz2, 0); B.box(mw2, 0.16, 0.16, 0.16, m.w / 2 - 0.3, RH - 0.55, bz2, 0);
    }
    m.areas.forEach(function (a) {
      if (a.type === 'hub') return;
      for (var k = 0; k < 12; k++) { var an = k / 12 * Math.PI * 2; B.box(M.chase[(k * 3) % 8], 0.2, 0.2, 0.2, a.x + Math.cos(an) * 2.6, 3.4 + Math.sin(an) * 0.0, a.z + Math.sin(an) * 2.6, 0); }
    });

    /* open floor: banks of machines stand back to back along the old maze lines */
    for (r = 0; r < m.rows; r++) for (c = 0; c < m.cols; c++) {
      if (m.area[r][c] >= 0) continue;
      for (d = 0; d < 4; d++) {
        if (m.edge(c, r, d) !== 0 || (r === m.entry.r && c === m.entry.c && d === 2)) continue;
        if (rng() < 0.7) wallMachines(c, r, d, 0.4);
      }
    }

    /* gold chips hidden in dead ends */
    var spots = m.deadEnds(); var extra = 0;
    while (spots.length < 9 && extra++ < 60) { var cc2 = Math.floor(rng() * m.cols), rr2 = Math.floor(rng() * m.rows); if (m.area[rr2][cc2] < 0 && !spots.some(function (s) { return s.c === cc2 && s.r === rr2; })) spots.push({ c: cc2, r: rr2 }); }
    spots.slice(0, 16).forEach(function (s) {
      var ct = m.center(s.c, s.r), mesh = new T.Mesh(new T.CylinderGeometry(0.3, 0.3, 0.07, 20), M.chipGold), halo = new T.Sprite(M.halo.clone());
      mesh.rotation.x = Math.PI / 2; var g = new T.Group(); g.add(mesh); halo.scale.set(1.5, 1.5, 1); halo.material.opacity = 0.8; g.add(halo); g.position.set(ct.x, 1.0, ct.z); group.add(g);
      K.disposables.push(mesh.geometry, halo.material);
      level.chips.push({ x: ct.x, z: ct.z, obj: g, value: 50 * (1 + Math.floor(rng() * 5)), got: false, c: s.c, r: s.r });
    });

    /* people */
    var defs = [];
    K.seats.forEach(function (s) {
      var p = s.always ? 1 : (s.p !== undefined ? s.p : (s.pose === 'stand' ? 0.8 : 0.7));
      if (rng() > p) return;
      defs.push({ x: s.x, z: s.z, yaw: s.yaw, pose: s.pose, machine: s.machine || null });
      if (s.pose !== 'dealer') K.colliders.push({ x0: s.x - 0.3, x1: s.x + 0.3, z0: s.z - 0.3, z1: s.z + 0.3 });
      if (s.machine) s.machine.station.taken = true;
    });
    var walkers = 46;
    for (var i = 0; i < walkers; i++) {
      var wc = Math.floor(rng() * m.cols), wr = Math.floor(rng() * m.rows);
      if (m.isBlocked(wc, wr)) { wc = m.entry.c; wr = m.entry.r; }
      var ct2 = m.center(wc, wr);
      defs.push({ x: ct2.x, z: ct2.z, yaw: rng() * 6.28, pose: 'walk', walker: true });
    }
    B.build(group, K.disposables);
    level.crowd = new C.Crowd(group, defs, m, rng);
    level.crowdSize = defs.length;
    level.start = { x: ec.x, z: zl(m.rows) - 1.6 };
    return level;
  };

  L.dispose = function (level) {
    if (!level) return;
    E.scene.remove(level.group);
    level.crowd.dispose();
    level.K.disposables.forEach(function (o) { if (o && o.dispose) o.dispose(); });
  };
  L.redrawSigns = function (level) {
    level.K.signs.forEach(function (s) { drawSign(s.tex.image.getContext('2d'), s.text, s.w, s.h, s.size); s.tex.needsUpdate = true; });
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
