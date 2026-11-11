/* Aurum Palace - seeded maze generator (pure logic, no THREE). */
(function (G) {
  var C = G.Casino = G.Casino || {};
  var COLS = 11, ROWS = 11, CELL = 6, DOOR = 3.4;
  var TYPES = ['slots', 'blackjack', 'poker', 'holdem', 'roulette'];
  var DX = [0, 1, 0, -1], DZ = [-1, 0, 1, 0]; // N E S W

  function Maze() {
    this.cols = COLS; this.rows = ROWS; this.cell = CELL;
    this.w = COLS * CELL; this.d = ROWS * CELL;
    this.h = []; this.v = []; this.area = []; this.areas = [];
    for (var r = 0; r <= ROWS; r++) { this.h.push(new Array(COLS).fill(0)); }
    for (r = 0; r < ROWS; r++) { this.v.push(new Array(COLS + 1).fill(0)); }
    for (r = 0; r < ROWS; r++) this.area.push(new Array(COLS).fill(-1));
  }
  var P = Maze.prototype;
  // edge value: 0 wall, 1 doorway, 2 open floor
  P.edge = function (c, r, d) {
    if (d === 0) return this.h[r][c];
    if (d === 2) return this.h[r + 1][c];
    if (d === 3) return this.v[r][c];
    return this.v[r][c + 1];
  };
  P.setEdge = function (c, r, d, val) {
    if (d === 0) this.h[r][c] = val; else if (d === 2) this.h[r + 1][c] = val;
    else if (d === 3) this.v[r][c] = val; else this.v[r][c + 1] = val;
  };
  P.inside = function (c, r) { return c >= 0 && r >= 0 && c < COLS && r < ROWS; };
  P.center = function (c, r) { return { x: (c - (COLS - 1) / 2) * CELL, z: (r - (ROWS - 1) / 2) * CELL }; };
  P.cellAt = function (x, z) {
    return { c: Math.floor((x + this.w / 2) / CELL), r: Math.floor((z + this.d / 2) / CELL) };
  };
  P.areaAt = function (c, r) { var a = this.inside(c, r) ? this.area[r][c] : -1; return a < 0 ? null : this.areas[a]; };
  P.neighbors = function (c, r) {
    var out = [];
    for (var d = 0; d < 4; d++) {
      if (this.edge(c, r, d) > 0) { var nc = c + DX[d], nr = r + DZ[d]; if (this.inside(nc, nr)) out.push({ c: nc, r: nr, d: d }); }
    }
    return out;
  };
  // the atrium's centre cell holds the jackpot pillar, so crowd pathing treats it as solid
  P.isBlocked = function (c, r) { return this.block === r * COLS + c; };
  P.path = function (a, b) {
    var key = function (c, r) { return r * COLS + c; }, prev = {}, q = [a], seen = {}, self = this;
    seen[key(a.c, a.r)] = true;
    for (var i = 0; i < q.length; i++) {
      var cur = q[i];
      if (cur.c === b.c && cur.r === b.r) break;
      var ns = this.neighbors(cur.c, cur.r);
      for (var k = 0; k < ns.length; k++) {
        var n = ns[k], kk = key(n.c, n.r);
        if (!seen[kk] && !self.isBlocked(n.c, n.r)) { seen[kk] = true; prev[kk] = cur; q.push({ c: n.c, r: n.r }); }
      }
    }
    var out = [], cur2 = { c: b.c, r: b.r };
    while (cur2 && !(cur2.c === a.c && cur2.r === a.r)) { out.push(cur2); cur2 = prev[key(cur2.c, cur2.r)]; }
    out.reverse();
    return out;
  };
  P.doorCount = function (area) {
    var n = 0;
    for (var r = area.r0; r <= area.r1; r++) for (var c = area.c0; c <= area.c1; c++)
      for (var d = 0; d < 4; d++) {
        var nc = c + DX[d], nr = r + DZ[d];
        if (this.inside(nc, nr) && this.area[nr][nc] !== area.id && this.edge(c, r, d) === 1) n++;
      }
    return n;
  };
  P.deadEnds = function () {
    var out = [];
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      if (this.area[r][c] >= 0 || (c === this.entry.c && r === this.entry.r)) continue;
      if (this.neighbors(c, r).length === 1) out.push({ c: c, r: r });
    }
    return out;
  };

  function generate(seed) {
    var rng = C.mulberry32(seed), m = new Maze();
    m.seed = seed;
    m.entry = { c: (COLS - 1) / 2, r: ROWS - 1 };
    m.block = ((ROWS - 1) / 2) * COLS + (COLS - 1) / 2;
    var order = C.shuffle(TYPES.slice(), rng).concat(C.shuffle(TYPES.slice(), rng).slice(0, 2)); // every game appears, two repeat
    var corners = [[0, 0], [COLS - 3, 0], [0, ROWS - 3], [COLS - 3, ROWS - 3], [(COLS - 3) / 2, 0], [0, (ROWS - 3) / 2], [COLS - 3, (ROWS - 3) / 2]];
    var defs = corners.map(function (p, i) { return { type: order[i], c0: p[0], r0: p[1] }; });
    defs.push({ type: 'hub', c0: (COLS - 3) / 2, r0: (ROWS - 3) / 2 });
    defs.forEach(function (a, i) {
      a.id = i; a.c1 = a.c0 + 2; a.r1 = a.r0 + 2;
      var ctr = m.center(a.c0 + 1, a.r0 + 1); a.x = ctr.x; a.z = ctr.z;
      m.areas.push(a);
      for (var r = a.r0; r <= a.r1; r++) for (var c = a.c0; c <= a.c1; c++) {
        m.area[r][c] = i;
        if (c < a.c1) m.setEdge(c, r, 1, 2);
        if (r < a.r1) m.setEdge(c, r, 2, 2);
      }
    });
    // union-find over cells, areas pre-merged
    var parent = []; for (var i = 0; i < COLS * ROWS; i++) parent.push(i);
    var find = function (x) { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
    var key = function (c, r) { return r * COLS + c; };
    m.areas.forEach(function (a) {
      var root = key(a.c0, a.r0);
      for (var r = a.r0; r <= a.r1; r++) for (var c = a.c0; c <= a.c1; c++) parent[find(key(c, r))] = find(root);
    });
    var edges = [];
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      if (c < COLS - 1 && !(m.area[r][c] >= 0 && m.area[r][c] === m.area[r][c + 1])) edges.push([c, r, 1]);
      if (r < ROWS - 1 && !(m.area[r][c] >= 0 && m.area[r][c] === m.area[r + 1][c])) edges.push([c, r, 2]);
    }
    C.shuffle(edges, rng);
    var rest = [];
    edges.forEach(function (e) {
      var a = find(key(e[0], e[1])), b = find(key(e[0] + DX[e[2]], e[1] + DZ[e[2]]));
      if (a !== b) { parent[a] = b; m.setEdge(e[0], e[1], e[2], 1); } else rest.push(e);
    });
    // braid: open some extra walls so the maze has loops, not only one route
    var extra = Math.floor(rest.length * 0.12);
    for (i = 0; i < extra; i++) m.setEdge(rest[i][0], rest[i][1], rest[i][2], 1);
    // every game room gets 3+ doorways, the atrium 4+
    m.areas.forEach(function (a) {
      var need = a.type === 'hub' ? 4 : 3, cand = [];
      for (var r = a.r0; r <= a.r1; r++) for (var c = a.c0; c <= a.c1; c++) for (var d = 0; d < 4; d++) {
        var nc = c + DX[d], nr = r + DZ[d];
        if (m.inside(nc, nr) && m.area[nr][nc] !== a.id && m.edge(c, r, d) === 0) cand.push([c, r, d]);
      }
      C.shuffle(cand, rng);
      while (m.doorCount(a) < need && cand.length) { var e = cand.pop(); m.setEdge(e[0], e[1], e[2], 1); }
    });
    return m;
  }

  C.Maze = { COLS: COLS, ROWS: ROWS, CELL: CELL, DOOR: DOOR, DX: DX, DZ: DZ, generate: generate };
  if (typeof module !== 'undefined') module.exports = C.Maze;
})(typeof globalThis !== 'undefined' ? globalThis : this);
