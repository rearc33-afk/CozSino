/* Aurum Palace - the floor. The maze is printed on the carpet: golden ribbons wind between the gaming rooms. */
(function (G) {
  var C = G.Casino = G.Casino || {}, E = C.E;
  var ROOM = { slots: '#c2410c', blackjack: '#6e0b14', poker: '#a3151c', holdem: '#8a1030', roulette: '#52080e', hub: '#3a0508' };

  C.Carpet = {
    make: function (m) {
      var S = 2048, w = m.w, d = m.d, cell = m.cell;
      return E.ctex(S, S, function (g) {
        g.setTransform(S / w, 0, 0, S / d, S / 2, S / 2); // draw in world units: x right, z down
        var hw = w / 2, hd = d / 2, x, z;
        g.fillStyle = '#85101a'; g.fillRect(-hw, -hd, w, d);
        g.fillStyle = 'rgba(240,184,78,0.10)';
        for (z = -hd; z < hd; z += 1) for (x = -hw + (Math.round(z) % 2 ? 0.5 : 0); x < hw; x += 1) { g.beginPath(); g.moveTo(x, z - 0.22); g.lineTo(x + 0.22, z); g.lineTo(x, z + 0.22); g.lineTo(x - 0.22, z); g.fill(); }
        // gaming rooms
        m.areas.forEach(function (a) {
          var cx = a.x, cz = a.z, h = cell * 1.5;
          g.fillStyle = ROOM[a.type]; g.fillRect(cx - h, cz - h, h * 2, h * 2);
          g.fillStyle = 'rgba(255,200,90,0.13)';
          for (z = cz - h + 1.5; z < cz + h; z += 3) for (x = cx - h + 1.5; x < cx + h; x += 3) { g.beginPath(); g.moveTo(x, z - 1.2); g.lineTo(x + 1.2, z); g.lineTo(x, z + 1.2); g.lineTo(x - 1.2, z); g.fill(); }
          g.strokeStyle = '#f0b84e'; g.lineWidth = 0.22; g.strokeRect(cx - h + 0.3, cz - h + 0.3, h * 2 - 0.6, h * 2 - 0.6); g.lineWidth = 0.08; g.strokeRect(cx - h + 0.75, cz - h + 0.75, h * 2 - 1.5, h * 2 - 1.5);
          if (a.type === 'hub') {
            for (var k = 0; k < 4; k++) { g.beginPath(); g.arc(cx, cz, 2.2 + k * 1.7, 0, 7); g.lineWidth = k % 2 ? 0.1 : 0.25; g.strokeStyle = k % 2 ? '#e8651e' : '#f0b84e'; g.stroke(); }
            for (k = 0; k < 8; k++) { var an = k * Math.PI / 4; g.beginPath(); g.moveTo(cx + Math.cos(an) * 2.2, cz + Math.sin(an) * 2.2); g.lineTo(cx + Math.cos(an) * 7.9, cz + Math.sin(an) * 7.9); g.lineWidth = 0.1; g.strokeStyle = '#f0b84e'; g.stroke(); }
          }
        });
        // the maze: ribbons run along every passage, centre to centre
        var segs = [], r, c, nodes = [];
        for (r = 0; r < m.rows; r++) for (c = 0; c < m.cols; c++) {
          var p = m.center(c, r); if (m.area[r][c] < 0) nodes.push(p);
          if (c < m.cols - 1 && m.edge(c, r, 1) > 0 && !(m.area[r][c] >= 0 && m.area[r][c] === m.area[r][c + 1])) segs.push([p, m.center(c + 1, r)]);
          if (r < m.rows - 1 && m.edge(c, r, 2) > 0 && !(m.area[r][c] >= 0 && m.area[r][c] === m.area[r + 1][c])) segs.push([p, m.center(c, r + 1)]);
        }
        g.lineCap = 'round'; g.lineJoin = 'round';
        var pass = function (width, style, dash) {
          g.lineWidth = width; g.strokeStyle = style; g.fillStyle = style; g.setLineDash(dash || []);
          g.beginPath(); segs.forEach(function (s) { g.moveTo(s[0].x, s[0].z); g.lineTo(s[1].x, s[1].z); }); g.stroke();
          if (!dash) nodes.forEach(function (n) { g.beginPath(); g.arc(n.x, n.z, width / 2, 0, 7); g.fill(); });
        };
        pass(3.1, '#f0b84e'); pass(2.65, '#e8651e'); pass(2.0, '#f59e0b'); pass(0.22, '#fff0b0', [0.5, 0.5]);
        // arrows at dead ends mark where a gold chip may be hiding
        m.deadEnds().forEach(function (n) { var p = m.center(n.c, n.r); g.fillStyle = '#fff0b0'; g.beginPath(); g.moveTo(p.x, p.z - 0.8); g.lineTo(p.x + 0.8, p.z); g.lineTo(p.x, p.z + 0.8); g.lineTo(p.x - 0.8, p.z); g.fill(); });
        // welcome mat at the entrance
        var e = m.center(m.entry.c, m.entry.r); g.fillStyle = '#3a0509'; g.fillRect(e.x - 2.2, e.z + 0.6, 4.4, 2.4); g.strokeStyle = '#f0b84e'; g.lineWidth = 0.14; g.strokeRect(e.x - 2.2, e.z + 0.6, 4.4, 2.4);
      });
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
