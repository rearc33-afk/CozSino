/* Aurum Palace - player, camera, input, interaction, minimap and the main loop. */
(function (G) {
  var C = G.Casino = G.Casino || {}, E = C.E, L = C.Level, $ = C.$, clamp = C.clamp, W = C.World = {};
  var player = { x: 0, z: 0, yaw: 0, pitch: 0 }, keys = {}, mode = 'intro', level = null, current = null, curSt = null, nearest = null;
  var fly = null, bob = 0, bobT = 0, vw = 1, vh = 1, viewShift = 0, last = 0, clockT = 0, ptr = {}, stickV = { x: 0, y: 0 }, isTouch = false, ambT = 0, mapT = 0;
  var visited, panel, cv, cell = { c: -1, r: -1 }, found = 0;
  C.fx = { celebrate: function () {}, jackpot: function () {} };
  C.panelOpen = function () { return panel && !panel.hidden; };

  function applyCam() { E.camera.position.set(player.x, 1.65 + bob, player.z); E.camera.rotation.set(player.pitch, player.yaw, 0, 'YXZ'); }
  function resize() { vw = window.innerWidth; vh = window.innerHeight; E.renderer.setSize(vw, vh, false); E.camera.aspect = vw / vh; E.camera.updateProjectionMatrix(); }
  function camFor(st) {
    var m = clamp(1.3 / E.camera.aspect, 1, 2), l = new THREE.Vector3(st.cam.l[0], st.cam.l[1], st.cam.l[2]), p = new THREE.Vector3(st.cam.p[0], st.cam.p[1], st.cam.p[2]);
    if (st.type !== 'slots') { p.sub(l).multiplyScalar(m).add(l); p.y = Math.min(p.y, 4.2); }
    return { p: p, l: l };
  }
  var tmpCam;
  function lookQuat(pos, look) { tmpCam = tmpCam || new THREE.PerspectiveCamera(); tmpCam.position.copy(pos); tmpCam.lookAt(look); return tmpCam.quaternion.clone(); }
  function freeQuat() { return new THREE.Quaternion().setFromEuler(new THREE.Euler(player.pitch, player.yaw, 0, 'YXZ')); }
  function flyTo(pos, quat, dur, done) { fly = { t: 0, dur: dur, p0: E.camera.position.clone(), q0: E.camera.quaternion.clone(), p1: pos, q1: quat, done: done }; }
  W.level = function () { return level; };
  W.camTo = function (p, l, dur) { if (mode !== 'game') return; var P = new THREE.Vector3(p[0], p[1], p[2]); flyTo(P, lookQuat(P, new THREE.Vector3(l[0], l[1], l[2])), dur); };
  W.camBack = function () { if (mode !== 'game' || !curSt) return; var c = camFor(curSt); flyTo(c.p, lookQuat(c.p, c.l), 1.0); };

  function enterGame(st) {
    if (mode !== 'free' || st.taken) return;
    current = C.Games[st.type]; curSt = st; current.open(st); mode = 'entering'; panel.hidden = false; document.body.classList.add('seated');
    if (document.exitPointerLock) document.exitPointerLock();
    $('#prompt').hidden = true; $('#cross').hidden = true;
    var c = camFor(st); flyTo(c.p, lookQuat(c.p, c.l), 0.9, function () { mode = 'game'; });
  }
  function leaveGame() {
    if (mode !== 'game' && mode !== 'entering') return;
    if (current && current.busy) { C.toast('Finish the round first', true); return; }
    if (current) current.close(); current = null; curSt = null; panel.hidden = true; document.body.classList.remove('seated'); mode = 'leaving'; $('#cross').hidden = false;
    flyTo(new THREE.Vector3(player.x, 1.65, player.z), freeQuat(), 0.7, function () { mode = 'free'; });
  }

  function look(dx, dy) { player.yaw -= dx * 0.0024; player.pitch = clamp(player.pitch - dy * 0.0024, -1.2, 1.2); }
  function on(sel, evt, fn) { var el = $(sel); if (el) el.addEventListener(evt, fn); }
  W.atRisk = function () { if (!current) return 0; return (current.busy || (current.atRisk && current.atRisk())) ? 1 : 0; };
  W.kickOut = function () {
    if (current) { try { current.busy = false; current.close(); } catch (e) {} current = null; curSt = null; }
    panel.hidden = true; document.body.classList.remove('seated'); $('#cross').hidden = false; fly = null;
    mode = 'free'; applyCam(); if (document.exitPointerLock) document.exitPointerLock();
  };
  W.restart = function () { W.newMaze(7); mode = 'free'; };
  function bindInput() {
    window.addEventListener('keydown', function (e) {
      var k = e.key.toLowerCase(); keys[k] = true;
      if (mode === 'intro') return;
      if (k === 'l') { if (!C.Run.isBusted()) C.Run.toggle(); }
      else if (k === 'escape' && C.Run.boardOpen()) C.Run.close();
      else if (C.Run.blocking()) return;
      else if (k === 'e' && mode === 'free' && nearest) enterGame(nearest);
      else if (k === 'escape' && (mode === 'game' || mode === 'entering')) leaveGame();
      else if (k === 'm') { C.Sfx.start(); $('#snd').click(); }
      else if (k === 'tab' && mode !== 'intro') { e.preventDefault(); $('#map').classList.toggle('big'); }
      else if (mode === 'game' && current && current.onKey && !e.repeat) current.onKey(k);
      if ((k === 'arrowup' || k === 'arrowdown' || k === ' ') && mode !== 'intro') e.preventDefault();
    });
    window.addEventListener('keyup', function (e) { keys[e.key.toLowerCase()] = false; });
    window.addEventListener('blur', function () { for (var k in keys) keys[k] = false; });
    cv.addEventListener('pointerdown', function (e) {
      if (mode !== 'free') return;
      if (e.pointerType === 'mouse') { ptr[e.pointerId] = { kind: 'look' }; if (!document.pointerLockElement && cv.requestPointerLock) { try { var r = cv.requestPointerLock(); if (r && r.catch) r.catch(function () {}); } catch (err) {} } }
      else {
        var left = e.clientX < vw * 0.45; ptr[e.pointerId] = { kind: left ? 'stick' : 'look', x0: e.clientX, y0: e.clientY, lx: e.clientX, ly: e.clientY };
        if (left) { var s = $('#stick'); s.hidden = false; s.style.left = e.clientX + 'px'; s.style.top = e.clientY + 'px'; }
      }
      try { cv.setPointerCapture(e.pointerId); } catch (err) {}
    });
    cv.addEventListener('pointermove', function (e) {
      var p = ptr[e.pointerId]; if (!p || mode !== 'free' || e.pointerType === 'mouse') return;
      if (p.kind === 'look') { look((e.clientX - p.lx) * 1.4, (e.clientY - p.ly) * 1.4); p.lx = e.clientX; p.ly = e.clientY; }
      else { var dx = (e.clientX - p.x0) / 50, dy = (e.clientY - p.y0) / 50, l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; } stickV = { x: dx, y: dy }; $('#knob').style.transform = 'translate(' + dx * 35 + 'px,' + dy * 35 + 'px)'; }
    });
    var endPtr = function (e) { var p = ptr[e.pointerId]; if (p && p.kind === 'stick') { stickV = { x: 0, y: 0 }; $('#stick').hidden = true; $('#knob').style.transform = ''; } delete ptr[e.pointerId]; };
    cv.addEventListener('pointerup', endPtr); cv.addEventListener('pointercancel', endPtr);
    document.addEventListener('mousemove', function (e) { if (mode === 'free' && (document.pointerLockElement === cv || (e.buttons & 1))) look(e.movementX, e.movementY); });
    on('#leave', 'click', leaveGame);
    on('#lbbtn', 'click', function () { C.Run.toggle(); });
    on('#lbclose', 'click', function () { C.Run.close(); });
    on('#bustboard', 'click', function () { C.Run.open(); });
    on('#bustnew', 'click', function () { C.Run.newNight(); });
    $('#gbody').addEventListener('click', function (e) { var el = e.target.closest('[data-a]'); if (el && current && !el.disabled) current.onClick(el.dataset.a, el); });
    $('#pbtn').addEventListener('click', function () { if (nearest) enterGame(nearest); });
    $('#snd').addEventListener('click', function () { C.Sfx.start(); $('#snd').textContent = C.Sfx.toggle() ? 'Sound off' : 'Sound on'; });
    $('#map').addEventListener('click', function () { $('#map').classList.toggle('big'); });
    var showLogin = function () {
      var si = C.Run.signedIn(); $('#welcome').hidden = !si; $('#fields').hidden = si; $('#lerr').hidden = true;
      if (si) $('#wname').textContent = 'Welcome back, ' + C.Run.username();
    };
    showLogin();
    on('#switch', 'click', function () { C.Run.signOut(); showLogin(); });
    on('#login', 'submit', function (e) {
      e.preventDefault();
      if (!C.Run.signedIn()) {
        var err = C.Run.signIn($('#lemail').value, $('#luser').value);
        if (err) { var le = $('#lerr'); le.textContent = err; le.hidden = false; return; }
      }
      $('#intro').hidden = true; mode = 'free'; C.Sfx.start(); if (C.Run.isBusted()) C.Run.showBust();
      if (!isTouch && !C.Run.isBusted() && cv.requestPointerLock) { try { var r = cv.requestPointerLock(); if (r && r.catch) r.catch(function () {}); } catch (e2) {} }
      setTimeout(function () { $('#hint').style.opacity = 0; }, 16000);
    });
  }

  function move(dt) {
    var f = 0, s = 0, m = level.maze;
    if (keys.w || keys.arrowup) f += 1; if (keys.s || keys.arrowdown) f -= 1; if (keys.d) s += 1; if (keys.a) s -= 1;
    if (keys.arrowleft) player.yaw += dt * 1.8; if (keys.arrowright) player.yaw -= dt * 1.8;
    f -= stickV.y; s += stickV.x; var len = Math.hypot(f, s); if (len > 1) { f /= len; s /= len; }
    var sp = (keys.shift ? 6.5 : 4) * dt, fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw), rx = Math.cos(player.yaw), rz = -Math.sin(player.yaw);
    var nx = player.x + (fx * f + rx * s) * sp, nz = player.z + (fz * f + rz * s) * sp, R = 0.35;
    nx = clamp(nx, -m.w / 2 + 0.6, m.w / 2 - 0.6); nz = clamp(nz, -m.d / 2 + 0.6, m.d / 2 - 0.6);
    var cs = level.colliders;
    for (var it = 0; it < 2; it++) for (var i = 0; i < cs.length; i++) {
      var b = cs[i]; if (nx < b.x0 - R || nx > b.x1 + R || nz < b.z0 - R || nz > b.z1 + R) continue;
      var cx = clamp(nx, b.x0, b.x1), cz = clamp(nz, b.z0, b.z1), dx = nx - cx, dz = nz - cz, d = Math.hypot(dx, dz);
      if (d < R) { if (d > 1e-4) { nx = cx + dx / d * R; nz = cz + dz / d * R; } else { nx = player.x; nz = player.z; } }
    }
    var moved = Math.hypot(nx - player.x, nz - player.z); player.x = nx; player.z = nz; bobT += moved * 2.4; bob = moved > 0.0005 ? Math.sin(bobT) * 0.025 : bob * 0.9;
  }
  function findNearest() {
    var best = null, bd = 1e9, st = level.stations;
    for (var i = 0; i < st.length; i++) { var s = st[i]; if (s.taken) continue; var d = Math.hypot(player.x - s.x, player.z - s.z); if (d < s.r + 0.5 && d < bd) { bd = d; best = s; } }
    nearest = best; var p = $('#prompt');
    if (best && mode === 'free') { p.hidden = false; $('#ptxt').textContent = best.label; } else p.hidden = true;
  }

  /* ---- minimap with fog of war ---- */
  function reveal() {
    var m = level.maze, c = m.cellAt(player.x, player.z);
    if (!m.inside(c.c, c.r) || (c.c === cell.c && c.r === cell.r)) return; cell = c;
    for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) {
      var rr = c.r + dr, cc = c.c + dc; if (m.inside(cc, rr) && !visited[rr][cc]) visited[rr][cc] = 1;
    }
    visited[c.r][c.c] = 2;
    var a = m.areaAt(c.c, c.r); if (a) for (var r = a.r0; r <= a.r1; r++) for (var c2 = a.c0; c2 <= a.c1; c2++) visited[r][c2] = 2;
  }
  function drawMap() {
    var cvs = $('#map canvas'), g = cvs.getContext('2d'), m = level.maze, big = $('#map').classList.contains('big'), px = big ? 30 : 15, dpr = 2;
    cvs.width = m.cols * px * dpr + 8; cvs.height = m.rows * px * dpr + 8; cvs.style.width = (cvs.width / dpr) + 'px'; cvs.style.height = (cvs.height / dpr) + 'px';
    g.setTransform(dpr, 0, 0, dpr, 4, 4); g.clearRect(-4, -4, cvs.width, cvs.height);
    var r, c, v;
    for (r = 0; r < m.rows; r++) for (c = 0; c < m.cols; c++) {
      v = visited[r][c]; if (!v) continue;
      var a = m.areaAt(c, r);
      g.fillStyle = a ? (v === 2 ? '#8a2a14' : '#4a1812') : (v === 2 ? '#5e1a16' : '#35110f'); g.fillRect(c * px, r * px, px, px);
    }
    g.strokeStyle = '#f2b84b'; g.lineWidth = px * 0.28; g.lineCap = 'round'; g.beginPath(); // carpet ribbons
    for (r = 0; r < m.rows; r++) for (c = 0; c < m.cols; c++) {
      if (!visited[r][c]) continue;
      if (c < m.cols - 1 && visited[r][c + 1] && m.edge(c, r, 1) > 0) { g.moveTo((c + 0.5) * px, (r + 0.5) * px); g.lineTo((c + 1.5) * px, (r + 0.5) * px); }
      if (r < m.rows - 1 && visited[r + 1][c] && m.edge(c, r, 2) > 0) { g.moveTo((c + 0.5) * px, (r + 0.5) * px); g.lineTo((c + 0.5) * px, (r + 1.5) * px); }
    }
    g.stroke();
    g.font = '700 ' + (px * 0.7) + 'px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    m.areas.forEach(function (a) { if (visited[a.r0 + 1][a.c0 + 1] === 2) { g.fillStyle = '#e8f4ff'; g.fillText({ slots: 'S', blackjack: 'B', poker: 'P', holdem: 'H', roulette: 'R', hub: '\u2605' }[a.type], (a.c0 + 1.5) * px, (a.r0 + 1.5) * px); } });
    g.fillStyle = '#fff0b0'; level.chips.forEach(function (ch) { if (!ch.got && visited[ch.r][ch.c]) { g.beginPath(); g.arc((ch.c + 0.5) * px, (ch.r + 0.5) * px, px * 0.2, 0, 7); g.fill(); } });
    var ux = (player.x + m.w / 2) / m.cell * px, uz = (player.z + m.d / 2) / m.cell * px;
    g.save(); g.translate(ux, uz); g.rotate(-player.yaw); g.fillStyle = '#bfe6ff'; g.beginPath(); g.moveTo(0, -px * 0.36); g.lineTo(px * 0.24, px * 0.26); g.lineTo(-px * 0.24, px * 0.26); g.closePath(); g.fill(); g.restore();
  }

  W.newMaze = function (seed) {
    if (level) L.dispose(level);
    level = L.build(seed); found = 0;
    visited = []; for (var r = 0; r < level.maze.rows; r++) visited.push(new Array(level.maze.cols).fill(0));
    cell = { c: -1, r: -1 }; player.x = level.start.x; player.z = level.start.z; player.yaw = 0; player.pitch = 0; applyCam();
    $('#found').textContent = '0/' + level.chips.length; reveal(); drawMap();
    if (document.fonts && document.fonts.load) document.fonts.load('60px Limelight').then(function () { L.redrawSigns(level); }).catch(function () {});
  };

  var hooks = {
    chip: function (ch) { found++; C.bank.add(ch.value); C.Sfx.coin(); C.toast('Gold chip +' + C.fmt(ch.value)); $('#found').textContent = found + '/' + level.chips.length; },
    npcWin: function (p, dist) {
      var rx = Math.cos(player.yaw), rz = -Math.sin(player.yaw), pan = ((p.x - player.x) * rx + (p.z - player.z) * rz) / Math.max(dist, 1);
      C.Sfx.spot('win', dist, pan);
    }
  };
  C.fx.celebrate = function (s) { if (level) L.celebrate(level, s); };
  C.fx.jackpot = function () { if (level) { L.flashAt(player.x, 2.6, player.z, true); } };

  function frame(now) {
    requestAnimationFrame(frame);
    var dt = Math.min(0.05, (now - last) / 1000); last = now; clockT += dt;
    if (C.Run) { C.Run.tick(dt, { atRisk: W.atRisk() }); if (C.Run.blocking() && document.pointerLockElement && document.exitPointerLock) document.exitPointerLock(); }
    if (mode === 'free' && !C.Run.blocking()) { move(dt); applyCam(); findNearest(); reveal(); }
    else if (fly) {
      fly.t += dt; var u = Math.min(1, fly.t / fly.dur), s = u * u * (3 - 2 * u);
      E.camera.position.copy(fly.p0).lerp(fly.p1, s); E.camera.quaternion.copy(fly.q0).slerp(fly.q1, s);
      if (u >= 1) { var d = fly.done; fly = null; if (d) d(); if (mode === 'free') applyCam(); }
    }
    var tgt = (mode === 'game' || mode === 'entering') ? clamp(panel.offsetHeight / (2 * vh), 0, 0.4) : 0; viewShift += (tgt - viewShift) * Math.min(1, dt * 6);
    if (viewShift > 0.002) E.camera.setViewOffset(vw, vh, 0, Math.round(vh * viewShift), vw, vh); else if (E.camera.view && E.camera.view.enabled) E.camera.clearViewOffset();
    var px = mode === 'free' || !curSt ? player : { x: E.camera.position.x, z: E.camera.position.z, yaw: player.yaw };
    E.light.position.set(E.camera.position.x, 2.6, E.camera.position.z);
    L.update(level, dt, clockT, px, hooks);
    ambT -= dt; if (ambT <= 0) { ambT = 0.3; var slotA = level.maze.areas.filter(function (a) { return a.type === 'slots'; })[0], d2 = Math.hypot(px.x - slotA.x, px.z - slotA.z), cc = level.maze.cellAt(px.x, px.z); C.Sfx.ambience(clamp(1 - (d2 - 8) / 34, 0, 1), 1, mode === 'game'); }
    mapT -= dt; if (mapT <= 0 && mode !== 'game') { mapT = 0.2; drawMap(); }
    var jv = $('#jpv'); if (jv && C.panelOpen()) jv.textContent = C.fmt(C.Jackpot.value);
    E.renderer.render(E.scene, E.camera);
  }

  W.init = function () {
    cv = $('#gl'); panel = $('#panel'); isTouch = window.matchMedia && matchMedia('(pointer: coarse)').matches;
    if (isTouch) { document.body.classList.add('touch'); $('#keys').innerHTML = '<span>Left thumb</span><span>Walk</span><span>Right thumb</span><span>Look around</span><span>Sit down</span><span>Appears near a table or machine</span>'; $('#hint').hidden = true; }
    if (typeof THREE === 'undefined') { $('#intro').innerHTML = '<p>The 3D engine could not load. Check your connection, or put three.min.js in the vendor folder, then reload.</p>'; return false; }
    if (!E.init(cv)) { $('#intro').innerHTML = '<p>WebGL is not available in this browser, so the 3D casino cannot start.</p>'; return false; }
    C.Jackpot.load(); C.bank.load(); resize(); window.addEventListener('resize', resize); bindInput();
    W.newMaze(7);
    last = performance.now(); requestAnimationFrame(frame); return true;
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
