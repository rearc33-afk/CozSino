/* Aurum Palace - furniture builders. Static geometry goes into a Batch; K is the build context. */
(function (G) {
  var C = G.Casino = G.Casino || {}, E = C.E, P = C.Props = {};
  var RH = 4.6;

  P.loc = function (x, z, rot, lx, lz) {
    return { x: x + lx * Math.cos(rot) + lz * Math.sin(rot), z: z - lx * Math.sin(rot) + lz * Math.cos(rot) };
  };
  // axis-aligned collider covering a rotated local rectangle
  P.rect = function (K, x, z, rot, lx0, lx1, lz0, lz1) {
    var cs = [[lx0, lz0], [lx1, lz0], [lx0, lz1], [lx1, lz1]].map(function (p) { return P.loc(x, z, rot, p[0], p[1]); });
    var xs = cs.map(function (p) { return p.x; }), zs = cs.map(function (p) { return p.z; });
    K.colliders.push({ x0: Math.min.apply(null, xs), x1: Math.max.apply(null, xs), z0: Math.min.apply(null, zs), z1: Math.max.apply(null, zs) });
  };
  function cam(x, z, rot, plx, plz, py, llx, llz, ly) {
    var p = P.loc(x, z, rot, plx, plz), l = P.loc(x, z, rot, llx, llz);
    return { p: [p.x, py, p.z], l: [l.x, ly, l.z] };
  }
  // part placed at a local offset of a rotated prop
  function part(K, kind, mat, x, z, rot, lx, ly, lz, a, b2, c, d) {
    var w = P.loc(x, z, rot, lx, lz), B = K.b;
    if (kind === 'box') B.box(mat, a, b2, c, w.x, ly, w.z, rot);
    else if (kind === 'cyl') B.cyl(mat, a, b2, c, d || 14, w.x, ly, w.z, false, rot);
    else if (kind === 'plane') B.plane(mat, a, b2, w.x, ly, w.z, rot);
  }
  P.lightCone = lightCone;
  function lightCone(K, x, z, radius) {
    K.b.cyl(E.M.cone, 0.35, radius, RH - 0.95, 20, x, 0.95 + (RH - 0.95) / 2, z, true);
    K.b.plane(E.M.pool, radius * 2.5, radius * 2.5, x, 0.03, z, 0, -Math.PI / 2);
  }

  /* ---- slot machine ---- */
  P.THEMES = ['LUCKY 7s', 'GOLD RUSH', 'INFERNO', 'HIGH VOLTAGE', 'RED DRAGON', 'DIAMOND DUST', 'FORTUNE', 'WILD STAR'];
  P.machine = function (K, x, z, rot, idx) {
    var M = E.M, B = K.b;
    part(K, 'box', M.body, x, z, rot, 0, 0.78, 0, 0.9, 1.55, 0.72);
    part(K, 'box', M.gold, x, z, rot, 0, 1.28, 0.37, 0.76, 0.5, 0.05);
    part(K, 'plane', M.screens[idx % 6], x, z, rot, 0, 1.28, 0.4, 0.66, 0.41);
    part(K, 'box', M.bodyDark, x, z, rot, 0, 1.7, 0, 0.92, 0.3, 0.5);
    part(K, 'plane', M.marq[idx % 3], x, z, rot, 0, 1.7, 0.26, 0.8, 0.18);
    part(K, 'box', M.gold, x, z, rot, 0, 0.86, 0.42, 0.9, 0.08, 0.34);
    for (var i = 0; i < 3; i++) part(K, 'box', M.btn[i], x, z, rot, -0.22 + i * 0.22, 0.915, 0.45, 0.12, 0.03, 0.08);
    part(K, 'box', M.gold, x, z, rot, -0.46, 0.78, 0, 0.04, 1.5, 0.74);
    part(K, 'box', M.gold, x, z, rot, 0.46, 0.78, 0, 0.04, 1.5, 0.74);
    part(K, 'box', M.gold, x, z, rot, 0.52, 1.0, 0.1, 0.04, 0.5, 0.04);
    part(K, 'box', M.btn[0], x, z, rot, 0.52, 1.28, 0.1, 0.1, 0.1, 0.1);
    part(K, 'box', M.strobe[idx % 4], x, z, rot, 0, 1.92, 0, 0.14, 0.12, 0.14);
    part(K, 'cyl', M.chair, x, z, rot, 0, 0.5, 1.05, 0.22, 0.22, 0.08, 12);
    part(K, 'cyl', M.gold, x, z, rot, 0, 0.25, 1.05, 0.03, 0.03, 0.5, 6);
    P.rect(K, x, z, rot, -0.5, 0.5, -0.4, 0.62);
    var seat = P.loc(x, z, rot, 0, 1.05), st = P.loc(x, z, rot, 0, 1.6), c = cam(x, z, rot, 0, 1.6, 1.5, 0, 0, 1.25);
    var m = { kind: 'slot', x: x, z: z, rot: rot, idx: idx, theme: P.THEMES[idx % P.THEMES.length], seat: { x: seat.x, z: seat.z, yaw: rot + Math.PI, pose: 'slot', machine: null }, top: { x: x, z: z } };
    m.seat.machine = m;
    m.station = { type: 'slots', label: 'Play ' + m.theme, x: st.x, z: st.z, r: 0.95, cam: c, theme: m.theme };
    K.machines.push(m); K.stations.push(m.station); K.seats.push(m.seat);
    return m;
  };

  /* ---- blackjack table (half moon, dealer on the flat side) ---- */
  var bjHalf, bjFelt, pkFelt, hdFelt, rlFelt, backMat;
  function feltBJ() {
    return E.ctex(1024, 512, function (g) {
      var s = 512 / 1.5; g.strokeStyle = '#5a7a96'; g.fillStyle = '#3b5a78'; g.lineWidth = 3; g.textAlign = 'center'; g.textBaseline = 'middle';
      var arc = function (txt, R, a0, a1, size) { g.font = '700 ' + size + 'px Arial'; for (var i = 0; i < txt.length; i++) { var th = a0 + (a1 - a0) * (i / (txt.length - 1)); g.save(); g.translate(512 + R * s * Math.sin(th), R * s * Math.cos(th)); g.rotate(-th); g.fillText(txt[i], 0, 0); g.restore(); } };
      arc('BLACKJACK PAYS 3 TO 2', 0.66, -0.55, 0.55, 28); arc('INSURANCE PAYS 2 TO 1', 0.9, -0.5, 0.5, 18);
      for (var i = 0; i < 5; i++) { var th = -0.95 + i * 0.475; g.beginPath(); g.arc(512 + 1.2 * s * Math.sin(th), 1.2 * s * Math.cos(th), 0.16 * s, 0, 7); g.stroke(); }
    });
  }
  P.blackjack = function (K, x, z, rot) {
    var M = E.M, B = K.b, r = 1.5, seatR = 2.15;
    if (!bjHalf) { bjHalf = [new THREE.CylinderGeometry(r + 0.12, r + 0.12, 0.1, 40, 1, false, -Math.PI / 2, Math.PI), new THREE.CylinderGeometry(r, r, 0.12, 40, 1, false, -Math.PI / 2, Math.PI)]; bjFelt = new THREE.MeshBasicMaterial({ map: feltBJ(), transparent: true }); K.shared.push(bjHalf[0], bjHalf[1], bjFelt); }
    B.add(bjHalf[0], M.rim, B.xf(x, 0.86, z, rot)); B.add(bjHalf[1], M.felt, B.xf(x, 0.9, z, rot));
    part(K, 'box', M.rim, x, z, rot, 0, 0.88, 0, 2 * r + 0.24, 0.12, 0.12);
    part(K, 'cyl', M.dark, x, z, rot, 0, 0.4, 0.2, 0.3, 0.5, 0.8, 16);
    var o = P.loc(x, z, rot, 0, r / 2); B.plane(bjFelt, 2 * r, r, o.x, 0.962, o.z, rot, -Math.PI / 2);
    part(K, 'box', M.gold, x, z, rot, 0, 0.985, 0.22, 1.0, 0.05, 0.26);
    lightCone(K, P.loc(x, z, rot, 0, 0.9).x, P.loc(x, z, rot, 0, 0.9).z, 2.1);
    var seats = [];
    for (var i = 0; i < 5; i++) {
      var th = -0.95 + i * 0.475, sx = seatR * Math.sin(th), sz = seatR * Math.cos(th);
      part(K, 'cyl', M.chair, x, z, rot, sx, 0.7, sz, 0.2, 0.2, 0.1, 12); part(K, 'cyl', M.gold, x, z, rot, sx, 0.35, sz, 0.03, 0.03, 0.7, 6);
      var w = P.loc(x, z, rot, sx, sz);
      if (i === 2) { var st = P.loc(x, z, rot, 0, seatR + 0.5); K.stations.push({ type: 'blackjack', label: 'Sit at blackjack', x: st.x, z: st.z, r: 1.3, cam: cam(x, z, rot, 0, 3.1, 2.5, 0, 0.4, 0.95) }); }
      else K.seats.push({ x: w.x, z: w.z, yaw: rot + th + Math.PI, pose: 'card' });
    }
    var d = P.loc(x, z, rot, 0, -0.7); K.seats.push({ x: d.x, z: d.z, yaw: rot, pose: 'dealer', always: true });
    P.rect(K, x, z, rot, -1.7, 1.7, -0.9, 1.55); P.rect(K, x, z, rot, -2.0, 2.0, 1.6, 2.35);
  };

  /* ---- poker table (oval, eight seats) ---- */
  P.poker = function (K, x, z, rot, variant) {
    var hold = variant === 'holdem';
    var M = E.M, B = K.b, ax = 1.45, az = 0.95;
    if (!pkFelt) {
      pkFelt = new THREE.MeshBasicMaterial({ transparent: true, map: E.ctex(1024, 660, function (g, w, h) {
        g.strokeStyle = '#5a7a96'; g.fillStyle = '#3b5a78'; g.lineWidth = 4; g.beginPath(); g.ellipse(w / 2, h / 2, w * 0.42, h * 0.4, 0, 0, 7); g.stroke();
        g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '700 46px Arial'; g.fillText('FIVE CARD DRAW', w / 2, h / 2);
        g.font = '700 22px Arial'; g.fillText('ANTE  ·  DRAW  ·  BET OR FOLD', w / 2, h / 2 + 44);
      }) });
      backMat = new THREE.MeshBasicMaterial({ map: E.ctex(64, 92, function (g) { g.fillStyle = '#8f1018'; g.fillRect(0, 0, 64, 92); g.strokeStyle = '#f2b84b'; g.lineWidth = 5; g.strokeRect(4, 4, 56, 84); E.dia(g, 32, 46, 18, null, '#f2b84b', 3); }) });
      hdFelt = new THREE.MeshBasicMaterial({ transparent: true, map: E.ctex(1024, 660, function (g, w, h) {
        g.strokeStyle = '#5a7a96'; g.fillStyle = '#3b5a78'; g.lineWidth = 4; g.beginPath(); g.ellipse(w / 2, h / 2, w * 0.42, h * 0.4, 0, 0, 7); g.stroke();
        g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '700 46px Arial'; g.fillText("TEXAS HOLD'EM", w / 2, h / 2 - 70);
        g.font = '700 22px Arial'; g.fillText('TWO HOLE CARDS  ·  FIVE SHARED', w / 2, h / 2 - 28);
        for (var q = 0; q < 5; q++) g.strokeRect(w / 2 - 205 + q * 84, h / 2 + 10, 70, 98);
      }) });
      K.shared.push(pkFelt, hdFelt, backMat);
    }
    var cyl = new THREE.CylinderGeometry(1, 1, 0.1, 48), top = new THREE.CylinderGeometry(1, 1, 0.12, 48);
    var q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rot, 0)), one = new THREE.Vector3(ax + 0.12, 1, az + 0.12), two = new THREE.Vector3(ax, 1, az);
    B.add(cyl, M.rim, new THREE.Matrix4().compose(new THREE.Vector3(x, 0.86, z), q, one));
    B.add(top, M.felt, new THREE.Matrix4().compose(new THREE.Vector3(x, 0.9, z), q, two));
    cyl.dispose(); top.dispose();
    part(K, 'cyl', M.dark, x, z, rot, 0, 0.4, 0, 0.3, 0.55, 0.8, 16);
    B.plane(hold ? hdFelt : pkFelt, 2.9, 1.87, x, 0.962, z, rot, -Math.PI / 2);
    for (var i = 0; i < 5; i++) [1, -1].forEach(function (s) { var w = P.loc(x, z, rot, (i - 2) * 0.17 * s, 0.6 * s); B.plane(backMat, 0.15, 0.21, w.x, 0.966, w.z, rot + (i - 2) * 0.12, -Math.PI / 2); });
    for (i = 0; i < 4; i++) part(K, 'cyl', [M.btn[1], M.felt, M.gold, M.btn[0]][i], x, z, rot, -0.3 + i * 0.2, 0.98 + i * 0.01, 0.1, 0.06, 0.06, 0.03, 10);
    lightCone(K, x, z, 2.3);
    for (i = 0; i < 8; i++) {
      var a = i / 8 * Math.PI * 2, sx = Math.sin(a) * 1.85, sz = Math.cos(a) * 1.35, w = P.loc(x, z, rot, sx, sz);
      if (i === 4) { K.seats.push({ x: w.x, z: w.z, yaw: rot, pose: 'dealer', always: true }); continue; }
      part(K, 'cyl', M.chair, x, z, rot, sx, 0.55, sz, 0.22, 0.22, 0.1, 12); part(K, 'cyl', M.gold, x, z, rot, sx, 0.27, sz, 0.03, 0.03, 0.55, 6);
      if (i === 0) { var st = P.loc(x, z, rot, 0, 2.15); K.stations.push({ type: hold ? 'holdem' : 'poker', label: hold ? "Sit at Hold'em" : 'Sit at poker', x: st.x, z: st.z, r: 1.3, cam: cam(x, z, rot, 0, 3.0, 2.6, 0, 0.1, 0.95) }); }
      else K.seats.push({ x: w.x, z: w.z, yaw: rot + Math.atan2(-sx, -sz), pose: 'card' });
    }
    P.rect(K, x, z, rot, -2.1, 2.1, -1.6, 1.6);
  };

  /* ---- roulette table with a spinning wheel ---- */
  P.roulette = function (K, x, z, rot) {
    var M = E.M, B = K.b, wx = -2.0, T = THREE;
    if (!rlFelt) { rlFelt = new T.MeshPhongMaterial({ map: layoutTex(), emissive: 0x8aa2b8, emissiveIntensity: 0.3 }); K.shared.push(rlFelt); }
    part(K, 'box', M.rim, x, z, rot, 0, 0.85, 0, 2.6, 0.1, 1.3);
    part(K, 'box', M.dark, x, z, rot, -0.95, 0.4, 0, 0.45, 0.8, 1.0); part(K, 'box', M.dark, x, z, rot, 0.95, 0.4, 0, 0.45, 0.8, 1.0);
    var o = P.loc(x, z, rot, 0.05, 0); B.plane(rlFelt, 2.45, 0.95, o.x, 0.905, o.z, rot, -Math.PI / 2);
    part(K, 'cyl', M.dark, x, z, rot, wx, 0.45, 0, 0.72, 0.72, 0.9, 28); part(K, 'cyl', M.wood, x, z, rot, wx, 0.95, 0, 0.7, 0.7, 0.1, 32);
    var tor = new T.TorusGeometry(0.69, 0.03, 6, 40), w2 = P.loc(x, z, rot, wx, 0); B.add(tor, M.gold, B.xf(w2.x, 1.0, w2.z, rot, Math.PI / 2)); tor.dispose();
    var ring = new T.RingGeometry(0.43, 0.64, 40); B.add(ring, M.rim, B.xf(w2.x, 1.005, w2.z, rot, -Math.PI / 2)); ring.dispose();
    lightCone(K, P.loc(x, z, rot, -0.8, 0.3).x, P.loc(x, z, rot, -0.8, 0.3).z, 2.2);
    // dynamic parts: wheel disc, cone, ball
    var g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = rot; K.dyn.add(g);
    var pivot = new T.Group(); pivot.position.set(wx, 1.02, 0); g.add(pivot);
    var disc = new T.Mesh(new T.CircleGeometry(0.43, 64), new T.MeshPhongMaterial({ map: P.wheelTex(), emissive: 0x222222, shininess: 60 })); disc.rotation.x = -Math.PI / 2; pivot.add(disc);
    var tip = new T.Mesh(new T.ConeGeometry(0.1, 0.14, 12), M.gold); tip.position.y = 0.07; pivot.add(tip);
    var ball = new T.Mesh(new T.SphereGeometry(0.026, 10, 8), new T.MeshBasicMaterial({ color: 0xffffff })); g.add(ball);
    K.disposables.push(disc.geometry, disc.material, tip.geometry, ball.geometry, ball.material);
    var wheel = { pivot: pivot, ball: ball, cx: wx, theta: Math.random() * 6, omega0: 0.35, spin: null, p: 0, phiLock: Math.random() * 6, num: 0, auto: 4 + Math.random() * 20, world: w2 };
    K.wheels.push(wheel);
    var st = P.loc(x, z, rot, -0.7, 1.9);
    K.stations.push({ type: 'roulette', label: 'Play roulette', x: st.x, z: st.z, r: 1.4, wheel: wheel, cam: cam(x, z, rot, -0.8, 2.9, 2.4, -0.8, 0.1, 0.95) });
    [-1.2, -0.45, 0.8, 1.2].forEach(function (lx) { var s = P.loc(x, z, rot, lx, 1.15); K.seats.push({ x: s.x, z: s.z, yaw: rot + Math.PI, pose: 'stand' }); });
    var c1 = P.loc(x, z, rot, 0.3, -0.95); K.seats.push({ x: c1.x, z: c1.z, yaw: rot, pose: 'dealer', always: true });
    var c2 = P.loc(x, z, rot, wx, -1.1); K.seats.push({ x: c2.x, z: c2.z, yaw: rot, pose: 'dealer', always: true });
    P.rect(K, x, z, rot, -2.85, 1.4, -0.75, 0.75);
  };

  var RED = {}; [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36].forEach(function (n) { RED[n] = 1; });
  C.RED = RED;
  C.ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
  var PS = Math.PI * 2 / 37; C.PS = PS;
  P.wheelTex = function () {
    return E.ctex(512, 512, function (g) {
      var c = 256, R = 250; g.fillStyle = '#1b0d0a'; g.fillRect(0, 0, 512, 512);
      for (var i = 0; i < 37; i++) {
        var n = C.ORDER[i], ph = i * PS; g.beginPath(); g.moveTo(c, c); g.arc(c, c, R, -(ph + PS / 2), -(ph - PS / 2), false); g.closePath();
        g.fillStyle = n === 0 ? '#1f8a5a' : RED[n] ? '#c8323c' : '#161c26'; g.fill(); g.strokeStyle = '#d9e3ec'; g.lineWidth = 1.5; g.stroke();
      }
      g.fillStyle = '#c9d3dc'; g.beginPath(); g.arc(c, c, R * 0.7, 0, 7); g.fill(); g.fillStyle = '#e9b34a'; g.beginPath(); g.arc(c, c, R * 0.3, 0, 7); g.fill();
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.font = '700 17px Arial';
      for (i = 0; i < 37; i++) { var p2 = i * PS; g.save(); g.translate(c + R * 0.87 * Math.cos(p2), c - R * 0.87 * Math.sin(p2)); g.rotate(Math.PI / 2 - p2); g.fillText(String(C.ORDER[i]), 0, 0); g.restore(); }
    });
  };
  function layoutTex() {
    return E.ctex(1500, 560, function (g) {
      g.fillStyle = '#e9f2fb'; g.fillRect(0, 0, 1500, 560); g.textAlign = 'center'; g.textBaseline = 'middle';
      var cell = function (c, r, w, h, txt, fill, col) { var x = 50 + c * 100, y = 30 + r * 100; g.fillStyle = fill; g.fillRect(x + 2, y + 2, w * 100 - 4, h * 100 - 4); g.strokeStyle = '#8aa2b8'; g.lineWidth = 3; g.strokeRect(x + 2, y + 2, w * 100 - 4, h * 100 - 4); g.fillStyle = col; g.font = '700 ' + (txt.length > 3 ? 38 : 52) + 'px Arial'; g.fillText(txt, x + w * 50, y + h * 50); };
      cell(0, 0, 1, 3, '0', '#1f8a5a', '#fff');
      for (var r = 0; r < 3; r++) for (var c = 0; c < 12; c++) { var n = (c + 1) * 3 - r; cell(c + 1, r, 1, 1, String(n), RED[n] ? '#c8323c' : '#1d2430', '#fff'); }
      for (r = 0; r < 3; r++) cell(13, r, 1, 1, '2:1', '#e9f2fb', '#3b5a78');
      ['1st 12', '2nd 12', '3rd 12'].forEach(function (t, i) { cell(1 + i * 4, 3, 4, 1, t, '#e9f2fb', '#3b5a78'); });
      [['1-18', '#e9f2fb', '#3b5a78'], ['EVEN', '#e9f2fb', '#3b5a78'], ['', '#c8323c', '#fff'], ['', '#1d2430', '#fff'], ['ODD', '#e9f2fb', '#3b5a78'], ['19-36', '#e9f2fb', '#3b5a78']].forEach(function (a, i) { cell(1 + i * 2, 4, 2, 1, a[0], a[1], a[2]); });
    });
  }

  /* ---- atrium cocktail table ---- */
  P.cocktail = function (K, x, z) {
    var M = E.M;
    K.b.cyl(M.gold, 0.5, 0.5, 0.06, 20, x, 1.08, z); K.b.cyl(M.rim, 0.06, 0.06, 1.05, 8, x, 0.52, z); K.b.cyl(M.gold, 0.32, 0.4, 0.06, 16, x, 0.03, z);
    K.b.cyl(M.felt, 0.09, 0.07, 0.16, 8, x + 0.15, 1.19, z + 0.05);
    K.colliders.push({ x0: x - 0.5, x1: x + 0.5, z0: z - 0.5, z1: z + 0.5 });
    [[0.95, 0], [-0.95, 0]].forEach(function (o, i) { K.seats.push({ x: x + o[0], z: z + o[1], yaw: i ? -Math.PI / 2 : Math.PI / 2, pose: 'stand' }); });
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
