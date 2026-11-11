/* Aurum Palace - renderer, lights, canvas textures, shared materials, geometry batching. */
(function (G) {
  var C = G.Casino = G.Casino || {}, E = C.E = {};
  E.RH = 4.6; // ceiling height

  E.ctex = function (w, h, fn, rx, ry) {
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    fn(c.getContext('2d'), w, h);
    var t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding; t.anisotropy = E.aniso || 1;
    if (rx) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); }
    return t;
  };
  E.dia = function (g, cx, cy, r, f, s, lw) {
    g.beginPath(); g.moveTo(cx, cy - r); g.lineTo(cx + r, cy); g.lineTo(cx, cy + r); g.lineTo(cx - r, cy); g.closePath();
    if (f) { g.fillStyle = f; g.fill(); } if (s) { g.strokeStyle = s; g.lineWidth = lw; g.stroke(); }
  };
  E.glowTex = function () {
    return E.ctex(128, 128, function (g) {
      var gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    });
  };

  function carpet(pal, rx, ry) {
    return E.ctex(256, 256, function (g) {
      g.fillStyle = pal[0]; g.fillRect(0, 0, 256, 256);
      E.dia(g, 128, 128, 120, pal[1], pal[3], 5); E.dia(g, 128, 128, 84, pal[0], pal[3], 3); E.dia(g, 128, 128, 40, pal[3]);
      [[0, 0], [256, 0], [0, 256], [256, 256]].forEach(function (p) { E.dia(g, p[0], p[1], 120, pal[2], pal[3], 5); E.dia(g, p[0], p[1], 80, pal[1]); });
      g.fillStyle = pal[3]; [[128, 0], [0, 128], [256, 128], [128, 256]].forEach(function (p) { g.beginPath(); g.arc(p[0], p[1], 9, 0, 7); g.fill(); });
    }, rx, ry);
  }
  function wallTexture() {
    return E.ctex(256, 512, function (g) {
      var gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, '#7a0c12'); gr.addColorStop(1, '#a3141a');
      g.fillStyle = gr; g.fillRect(0, 0, 256, 512);
      g.strokeStyle = '#f0b84e'; g.lineWidth = 4; g.strokeRect(14, 14, 228, 370);
      g.lineWidth = 1.5; g.globalAlpha = 0.6; g.strokeRect(28, 28, 200, 342); g.globalAlpha = 1;
      E.dia(g, 128, 200, 64, null, '#f0b84e', 3); E.dia(g, 128, 200, 34, '#f0b84e');
      g.fillStyle = '#4a070c'; g.fillRect(0, 410, 256, 102); g.fillStyle = '#f0b84e'; g.fillRect(0, 408, 256, 4);
    }, 1, 1);
  }
  function screenAtlas() {
    var syms = [['7', '#d6291a'], ['BAR', '#b8791a'], ['★', '#e09a10'], ['♦', '#c4202b'], ['♥', '#e0455a'], ['♣', '#2a3a4a']];
    return E.ctex(2048, 160, function (g) {
      for (var k = 0; k < 8; k++) {
        var ox = k * 256, hot = k >= 6;
        g.fillStyle = '#1a0709'; g.fillRect(ox, 0, 256, 160);
        g.fillStyle = hot ? '#bfe4ff' : '#ee9a2e';
        for (var i = 0; i < 16; i++) { g.beginPath(); g.arc(ox + 10 + i * 15.5, 8, 3.5, 0, 7); g.fill(); }
        for (i = 0; i < 3; i++) {
          g.fillStyle = '#fff3d6'; g.fillRect(ox + 14 + i * 80, 24, 70, 100);
          var s = k === 6 ? syms[0] : k === 7 ? syms[1] : syms[Math.floor(Math.random() * 6)];
          g.fillStyle = s[1]; g.font = (s[0] === 'BAR' ? '900 30px' : '900 56px') + ' Arial, sans-serif';
          g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s[0], ox + 49 + i * 80, 76);
        }
        g.fillStyle = hot ? '#7ad0ff' : '#c98a2a'; g.font = '700 14px Arial'; g.fillText(hot ? 'JACKPOT' : 'SPIN TO WIN', ox + 128, 144);
      }
    });
  }

  E.init = function (canvas) {
    try { E.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: 'high-performance' }); }
    catch (e) { return false; }
    var r = E.renderer;
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    r.outputEncoding = THREE.sRGBEncoding; r.setClearColor(0x260a05);
    E.aniso = r.capabilities.getMaxAnisotropy();
    E.scene = new THREE.Scene(); E.scene.fog = new THREE.FogExp2(0x260a05, 0.021);
    E.camera = new THREE.PerspectiveCamera(68, 1, 0.1, 90);
    // warm base light, a warm glow that follows the player, and cool flash lights that strobe
    E.scene.add(new THREE.HemisphereLight(0xffa466, 0x4a0e08, 0.62));
    E.light = new THREE.PointLight(0xff9a4a, 1.35, 16, 1.3); E.scene.add(E.light);
    E.flash = [];
    for (var i = 0; i < 5; i++) { var l = new THREE.PointLight(0x9fd8ff, 0, 13, 1.5); E.scene.add(l); E.flash.push({ light: l, t: 9, dur: 1, peak: 0, seq: 0 }); }
    var M = E.M = {};
    var wt = wallTexture(), RH = E.RH;
    M.wall = new THREE.MeshLambertMaterial({ map: wt, emissiveMap: wt, emissive: 0xffffff, emissiveIntensity: 0.42 });
    var pals = {
      main: ['#a1121a', '#e8651e', '#c71e22', '#f4bf4f'],
      gold: ['#c2410c', '#f59e0b', '#e8651e', '#ffd36a'],
      deep: ['#7a0d14', '#c2410c', '#a1121a', '#f0b84e']
    };
    M.carpet = {};
    for (var k in pals) {
      var ct = carpet(pals[k], 1, 1);
      M.carpet[k] = new THREE.MeshLambertMaterial({ map: ct, emissiveMap: ct, emissive: 0xffffff, emissiveIntensity: 0.5 });
    }
    var cl = E.ctex(256, 256, function (g) {
      g.fillStyle = '#2a0b08'; g.fillRect(0, 0, 256, 256);
      g.strokeStyle = '#f0b84e'; g.lineWidth = 9; g.beginPath(); g.arc(128, 128, 76, 0, 7); g.stroke();
      g.fillStyle = '#ffd98a'; g.beginPath(); g.arc(128, 128, 54, 0, 7); g.fill();
      g.fillStyle = '#f0b84e'; [[0, 0], [256, 0], [0, 256], [256, 256]].forEach(function (p) { g.beginPath(); g.arc(p[0], p[1], 12, 0, 7); g.fill(); });
    }, 1, 1);
    M.ceil = new THREE.MeshLambertMaterial({ map: cl, emissiveMap: cl, emissive: 0xffffff, emissiveIntensity: 1.0 });
    M.gold = new THREE.MeshPhongMaterial({ color: 0xe8ae3c, emissive: 0x6a4608, shininess: 60, specular: 0xffe9a0 });
    M.body = new THREE.MeshLambertMaterial({ color: 0x9a1119, emissive: 0x38050a });
    M.bodyDark = new THREE.MeshLambertMaterial({ color: 0x4a0a10, emissive: 0x1a0308 });
    M.felt = new THREE.MeshPhongMaterial({ color: 0xeef6ff, emissive: 0xbad0e8, emissiveIntensity: 0.5, shininess: 14 });
    M.rim = new THREE.MeshPhongMaterial({ color: 0x3a0d10, emissive: 0x140304, shininess: 30 });
    M.chair = new THREE.MeshLambertMaterial({ color: 0x7a0f17, emissive: 0x240408 });
    M.dark = new THREE.MeshLambertMaterial({ color: 0x24100f });
    M.wood = new THREE.MeshPhongMaterial({ color: 0x5a160e, emissive: 0x200603, shininess: 70, specular: 0xaa6644 });
    M.btn = [0xff3b2f, 0xff8a1f, 0xffd24a].map(function (c) { return new THREE.MeshBasicMaterial({ color: c }); });
    M.marq = [0, 1, 2].map(function () { return new THREE.MeshBasicMaterial({ color: 0x6a3a10 }); });
    M.strobe = [0, 1, 2, 3].map(function () { return new THREE.MeshBasicMaterial({ color: 0x1a2a3a }); });
    M.chase = [0, 1, 2, 3, 4, 5, 6, 7].map(function () { return new THREE.MeshBasicMaterial({ color: 0x20150f }); }); // ceiling chasers
    M.sconce = new THREE.MeshBasicMaterial({ color: 0xffb347 });
    M.neon = new THREE.MeshBasicMaterial({ color: 0xff7a1f });
    M.coolNeon = new THREE.MeshBasicMaterial({ color: 0xbfe6ff });
    M.chipGold = new THREE.MeshBasicMaterial({ color: 0xffcf5a });
    M.cone = new THREE.MeshBasicMaterial({ color: 0xd2e8ff, transparent: true, opacity: 0.075, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    var gt = E.glowTex();
    M.pool = new THREE.MeshBasicMaterial({ map: gt, color: 0xcfe6ff, transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending, depthWrite: false });
    M.halo = new THREE.SpriteMaterial({ map: gt, color: 0xffd25a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    var atlas = screenAtlas();
    M.screens = []; E.screenTex = [];
    for (i = 0; i < 6; i++) {
      var t = atlas.clone(); t.needsUpdate = true; t.wrapS = THREE.RepeatWrapping; t.repeat.set(1 / 8, 1); t.offset.set(0, 0);
      E.screenTex.push(t); M.screens.push(new THREE.MeshBasicMaterial({ map: t }));
    }
    M.npc = new THREE.MeshLambertMaterial({ color: 0xffffff });
    return true;
  };

  /* Batch: merge many static boxes/cylinders into one mesh per material (keeps draw calls low). */
  function Batch() { this.m = new Map(); this.cache = {}; this.tmp = new THREE.Matrix4(); this.rot = new THREE.Matrix4(); }
  Batch.prototype.add = function (geo, mat, mx, su, sv) {
    var e = this.m.get(mat); if (!e) { e = { p: [], n: [], u: [] }; this.m.set(mat, e); }
    var g = geo.index ? geo.toNonIndexed() : geo, P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv;
    var v = new THREE.Vector3(), nm = new THREE.Matrix3().getNormalMatrix(mx);
    for (var i = 0; i < P.count; i++) {
      v.fromBufferAttribute(P, i).applyMatrix4(mx); e.p.push(v.x, v.y, v.z);
      if (N) { v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); e.n.push(v.x, v.y, v.z); } else e.n.push(0, 1, 0);
      e.u.push(U ? U.getX(i) * (su || 1) : 0, U ? U.getY(i) * (sv || 1) : 0);
    }
    if (g !== geo) g.dispose();
  };
  Batch.prototype.xf = function (x, y, z, ry, rx) {
    var m = this.tmp.makeRotationY(ry || 0);
    if (rx) { this.rot.makeRotationX(rx); m.multiply(this.rot); }
    return m.setPosition(x, y, z);
  };
  Batch.prototype.box = function (mat, w, h, d, x, y, z, ry, su, sv) {
    var k = w + 'x' + h + 'x' + d, g = this.cache[k] || (this.cache[k] = new THREE.BoxGeometry(w, h, d));
    this.add(g, mat, this.xf(x, y, z, ry), su, sv);
  };
  Batch.prototype.cyl = function (mat, rt, rb, h, seg, x, y, z, open, ry) {
    var k = 'c' + [rt, rb, h, seg, open].join(','), g = this.cache[k] || (this.cache[k] = new THREE.CylinderGeometry(rt, rb, h, seg, 1, !!open));
    this.add(g, mat, this.xf(x, y, z, ry));
  };
  Batch.prototype.plane = function (mat, w, h, x, y, z, ry, rx) {
    var k = 'p' + w + 'x' + h, g = this.cache[k] || (this.cache[k] = new THREE.PlaneGeometry(w, h));
    this.add(g, mat, this.xf(x, y, z, ry, rx));
  };
  Batch.prototype.build = function (parent, disposables) {
    this.m.forEach(function (e, mat) {
      var g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(e.p), 3));
      g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(e.n), 3));
      g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(e.u), 2));
      g.computeBoundingSphere();
      parent.add(new THREE.Mesh(g, mat)); if (disposables) disposables.push(g);
    });
    for (var k in this.cache) this.cache[k].dispose();
    this.m.clear(); this.cache = {};
  };
  E.Batch = Batch;
})(typeof globalThis !== 'undefined' ? globalThis : this);
