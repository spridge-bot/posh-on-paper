/* Posh On Paper — "Where they played": zone control + player/team heatmaps.
   Data (#heat-data): players [{n, t:'p'|'o', pos, mins, pts:[[x,y]]}] already in the story frame
   (Posh attack right, opponents attack left; y=0 is Posh's left), grid[3][6] = [posh, opp]. */
(function () {
  var el = document.getElementById('heat-data');
  if (!el) return;
  var H = JSON.parse(el.textContent), OPP = el.getAttribute('data-opp');
  var NS = 'http://www.w3.org/2000/svg', S = 6, W = 105 * S, HH = 68 * S;
  var wrap = document.getElementById('hp'), cap = document.getElementById('hcap'), info = document.getElementById('hinfo');
  function svg(tag, a, p) { var n = document.createElementNS(NS, tag); for (var k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; }

  /* canvas heat layer + svg (lines, zones) on top */
  var cv = document.createElement('canvas'); cv.width = W; cv.height = HH; cv.className = 'heat-cv'; wrap.appendChild(cv);
  var ctx = cv.getContext('2d');
  var off = document.createElement('canvas'); off.width = W; off.height = HH; var octx = off.getContext('2d');
  var P = svg('svg', {viewBox: '0 0 105 68', class: 'heat-svg'}, wrap);
  var zoneG = svg('g', {class: 'zones'}, P);
  var L = svg('g', {class: 'lines'}, P);
  svg('rect', {x: 0, y: 0, width: 105, height: 68}, L); svg('line', {x1: 52.5, y1: 0, x2: 52.5, y2: 68}, L);
  svg('circle', {cx: 52.5, cy: 34, r: 9.15}, L);
  [[0, 1], [105, -1]].forEach(function (g) { var x = g[0], d = g[1];
    svg('rect', {x: d > 0 ? x : x - 16.5, y: 13.85, width: 16.5, height: 40.3}, L);
    svg('rect', {x: d > 0 ? x : x - 5.5, y: 24.85, width: 5.5, height: 18.3}, L); });
  var dirP = svg('text', {x: 104, y: 66.6, class: 'hdir', 'text-anchor': 'end'}, P);
  var dirO = svg('text', {x: 1, y: 66.6, class: 'hdir'}, P);
  dirP.textContent = 'POSH ATTACK →'; dirO.textContent = '← ' + OPP.toUpperCase() + ' ATTACK';

  /* palette: transparent → Posh blue → pale blue → white (brand: blue + white only) */
  var pal = (function () {
    var c = document.createElement('canvas'); c.width = 256; c.height = 1; var x = c.getContext('2d');
    var g = x.createLinearGradient(0, 0, 256, 0);
    g.addColorStop(0, 'rgba(47,123,255,0)'); g.addColorStop(.18, 'rgba(47,123,255,.28)');
    g.addColorStop(.45, 'rgba(47,123,255,.72)'); g.addColorStop(.72, 'rgba(120,175,255,.88)');
    g.addColorStop(1, 'rgba(255,255,255,.96)');
    x.fillStyle = g; x.fillRect(0, 0, 256, 1); return x.getImageData(0, 0, 256, 1).data;
  })();
  function heat(pts) {
    octx.clearRect(0, 0, W, HH); ctx.clearRect(0, 0, W, HH);
    if (!pts.length) return;
    // fewer, bolder blobs for one player; softer, tighter ones for a whole team so hotspots stay visible
    var r = (pts.length > 200 ? 5.2 : 6.5) * S, a = Math.min(0.3, 2.4 / Math.sqrt(pts.length + 4));
    pts.forEach(function (p) {
      var x = p[0] * S, y = p[1] * S, g = octx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(0,0,0,' + a + ')'); g.addColorStop(1, 'rgba(0,0,0,0)');
      octx.fillStyle = g; octx.fillRect(x - r, y - r, 2 * r, 2 * r);
    });
    var img = octx.getImageData(0, 0, W, HH), d = img.data, mx = 0;
    for (var i = 3; i < d.length; i += 4) if (d[i] > mx) mx = d[i];
    mx = mx || 1;
    for (var j = 0; j < d.length; j += 4) {
      var v = Math.min(255, Math.round(Math.pow(d[j + 3] / mx, 1.35) * 255)), k = v * 4; // emphasise peaks
      d[j] = pal[k]; d[j + 1] = pal[k + 1]; d[j + 2] = pal[k + 2]; d[j + 3] = pal[k + 3];
    }
    ctx.putImageData(img, 0, 0);
  }

  /* coverage: thirds + lanes, in the player's own attacking direction */
  function coverage(pts, t) {
    var th = [0, 0, 0], ln = [0, 0, 0];
    pts.forEach(function (p) {
      var ax = t === 'p' ? p[0] : 105 - p[0], ay = t === 'p' ? p[1] : 68 - p[1];
      th[Math.min(2, Math.floor(ax / 35))]++; ln[Math.min(2, Math.floor(ay / (68 / 3)))]++;
    });
    return {th: th, ln: ln, n: pts.length};
  }
  function bars(label, vals, names) {
    var n = vals[0] + vals[1] + vals[2] || 1, mx = Math.max.apply(null, vals);
    return '<div class="cov"><span class="cov-l">' + label + '</span>' + vals.map(function (v, i) {
      return '<div class="cov-r"><span>' + names[i] + '</span><i style="--w:' + (100 * v / n).toFixed(0) + '%" class="' +
        (v === mx ? 'top' : '') + '"></i><b class="num">' + Math.round(100 * v / n) + '%</b></div>'; }).join('') + '</div>';
  }
  function showInfo(title, sub, pts, t) {
    var c = coverage(pts, t);
    info.innerHTML = '<p class="hi-k">' + sub + '</p><h3>' + title + '</h3><p class="hi-n"><b class="num">' + c.n +
      '</b> touches</p>' + bars('Thirds', c.th, ['Own', 'Middle', 'Attacking']) + bars('Channels', c.ln, ['Left', 'Centre', 'Right']);
  }

  /* zone control */
  function zonesOn(on) {
    while (zoneG.firstChild) zoneG.removeChild(zoneG.firstChild);
    if (!on) return;
    var cw = 105 / 6, rh = 68 / 3;
    H.grid.forEach(function (row, r) { row.forEach(function (c, k) {
      var n = c[0] + c[1], sh = n ? c[0] / n : .5, fill;
      if (n < 8) fill = 'rgba(255,255,255,.02)';
      else if (sh >= .5) fill = 'rgba(47,123,255,' + (0.1 + (sh - .5) * 1.7).toFixed(2) + ')';
      else fill = 'rgba(201,209,222,' + (0.05 + (.5 - sh) * 1.1).toFixed(2) + ')';
      svg('rect', {x: k * cw + .25, y: r * rh + .25, width: cw - .5, height: rh - .5, rx: .8, fill: fill, class: 'zone'}, zoneG);
      var tx = svg('text', {x: k * cw + cw / 2, y: r * rh + rh / 2 + 1.4, class: 'zpct' + (sh < .5 ? ' opp' : ''), 'text-anchor': 'middle'}, zoneG);
      tx.textContent = n < 8 ? '–' : Math.round(sh * 100) + '%';
      var tn = svg('text', {x: k * cw + cw / 2, y: r * rh + rh / 2 + 5, class: 'zn', 'text-anchor': 'middle'}, zoneG);
      tn.textContent = n + ' touches';
    }); });
  }

  /* shape: average positions of the starters, joined defence → midfield → attack */
  var shapeG = svg('g', {class: 'shape'}, P);
  function shapeOn(on) {
    while (shapeG.firstChild) shapeG.removeChild(shapeG.firstChild);
    if (!on || !H.shape) return;
    // ease dots apart where two players' averages nearly coincide (≤ ~3m shift) so both stay readable
    var Q = H.shape.map(function (q) { return {n: q.n, pos: q.pos, shirt: q.shirt, x: q.x, y: q.y}; });
    for (var it = 0; it < 30; it++) { var moved = false;
      for (var a = 0; a < Q.length; a++) for (var b2 = a + 1; b2 < Q.length; b2++) {
        var dx = Q[b2].x - Q[a].x, dy = Q[b2].y - Q[a].y, dd = Math.sqrt(dx * dx + dy * dy) || .01;
        if (dd < 5.6) { var push = (5.6 - dd) / 2, ux = dx / dd, uy = dy / dd;
          Q[a].x -= ux * push; Q[a].y -= uy * push; Q[b2].x += ux * push; Q[b2].y += uy * push; moved = true; } }
      if (!moved) break; }
    var SH = Q;
    ['DEF', 'MID', 'FWD'].forEach(function (g) {
      var line = SH.filter(function (q) { return q.pos === g; }).sort(function (a, b) { return a.y - b.y; });
      if (line.length > 1) svg('polyline', {points: line.map(function (q) { return q.x + ',' + q.y; }).join(' '), class: 'sline'}, shapeG);
    });
    // dots first, then names placed greedily so no label sits on another label or dot
    var boxes = SH.map(function (q) { return [q.x - 2.8, q.y - 2.8, q.x + 2.8, q.y + 2.8]; });
    function clear(b) { return b[0] > 0 && b[2] < 105 && b[1] > 0 && b[3] < 68 && boxes.every(function (o) {
      return b[2] < o[0] || o[2] < b[0] || b[3] < o[1] || o[3] < b[1]; }); }
    SH.forEach(function (q) {
      svg('circle', {cx: q.x, cy: q.y, r: 2.6, class: 'sdot ' + q.pos}, shapeG);
      svg('text', {x: q.x, y: q.y + .9, class: 'snum', 'text-anchor': 'middle'}, shapeG).textContent = q.shirt || '';
    });
    SH.slice().sort(function (a, b) { return a.x - b.x; }).forEach(function (q) {
      var name = q.n.split(' ').slice(-1)[0], w = name.length * 1.15 + .6, h = 2.6;
      var opts = [[q.x, q.y + 5.4, 'middle'], [q.x, q.y - 3.6, 'middle'], [q.x + 3.4, q.y + .8, 'start'],
                  [q.x - 3.4, q.y + .8, 'end'], [q.x, q.y + 8.4, 'middle'], [q.x, q.y - 6.6, 'middle']];
      var pick = opts[0];
      for (var i = 0; i < opts.length; i++) {
        var o = opts[i], x0 = o[2] === 'middle' ? o[0] - w / 2 : o[2] === 'start' ? o[0] : o[0] - w;
        var b = [x0, o[1] - h + .4, x0 + w, o[1] + .4];
        if (clear(b)) { pick = o; boxes.push(b); break; }
      }
      svg('text', {x: pick[0], y: pick[1], class: 'sname', 'text-anchor': pick[2]}, shapeG).textContent = name;
    });
  }
  function metricsHtml() {
    return (H.metrics || []).filter(function (m) { return m.v != null; }).map(function (m) {
      var d = m.typ != null ? m.v - m.typ : null;
      var dt = d == null ? '' : '<span class="mt-d">' + (d > 0 ? '+' : '') + d.toFixed(1) + (m.u === '%' ? ' pts' : m.u) + ' vs typical</span>';
      return '<div class="mt-r"><span>' + m.l + '</span><b class="num">' + m.v.toFixed(m.u === '%' ? 0 : 1) + m.u + '</b>' + dt + '</div>';
    }).join('');
  }

  /* modes */
  var chips = document.querySelectorAll('[data-hm]');
  function team(t) { var out = []; H.players.forEach(function (p) { if (p.t === t && p.pos !== 'GK') out = out.concat(p.pts); }); return out; }
  function setMode(key) {
    chips.forEach(function (c) { c.setAttribute('aria-pressed', c.getAttribute('data-hm') === key); });
    wrap.classList.toggle('zone-mode', key === 'zones');
    shapeOn(key === 'shape');
    if (key === 'shape') {
      heat([]); zonesOn(false);
      cap.textContent = 'Average position of each starter\u2019s touches (45+ minutes), Posh attacking right. Lines join defence, midfield and attack.';
      info.innerHTML = '<p class="hi-k">Team shape</p><h3>How Posh set up</h3>' + metricsHtml() +
        '<p class="hi-tip">"Typical" = the middle value across every game with touch data. Positions are where players had the ball, not where they stood without it.</p>';
      return;
    }
    if (key === 'zones') {
      heat([]); zonesOn(true);
      cap.textContent = H.summary + ' Zones show Posh’s share of all touches there (goalkeepers excluded).';
      var tp = team('p'), to = team('o');
      info.innerHTML = '<p class="hi-k">Zone control</p><h3>Who had the ball where</h3><p class="hi-n"><b class="num">' +
        Math.round(100 * tp.length / (tp.length + to.length || 1)) + '%</b> of outfield touches were Posh’s</p>' +
        '<p class="hi-legend"><i class="lp"></i>Posh majority <i class="lo"></i>' + OPP + ' majority</p>' +
        '<p class="hi-tip">Pick a player to see where they operated.</p>';
    } else if (key === 'tp' || key === 'to') {
      var t = key === 'tp' ? 'p' : 'o', pts = team(t); zonesOn(false); heat(pts);
      cap.textContent = (t === 'p' ? 'Posh' : OPP) + ' outfield players combined — brighter = more touches.';
      showInfo(t === 'p' ? 'Posh' : OPP, 'Team · outfield', pts, t);
    } else {
      var pl = H.players[+key]; zonesOn(false); heat(pl.pts);
      cap.textContent = pl.n + ' (' + (pl.t === 'p' ? 'Posh' : OPP) + ') — every touch, brighter = more often.';
      showInfo(pl.n, (pl.t === 'p' ? 'Posh' : OPP) + ' · ' + pl.pos + ' · ' + pl.mins + ' mins', pl.pts, pl.t);
    }
  }
  chips.forEach(function (c) { c.addEventListener('click', function () {
    setMode(c.getAttribute('data-hm'));
    // phones: the chips sit below the pitch, so bring the heatmap back into view
    if (c.classList.contains('hchip') && window.innerWidth <= 900)
      wrap.scrollIntoView({behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center'});
  }); });
  setMode('zones');
})();
