/* Posh On Paper — tactics trends: one small chart per shape metric, game by game. */
(function () {
  var el = document.getElementById('tac-data');
  if (!el) return;
  var D = JSON.parse(el.textContent), box = document.getElementById('trend-grid'), NS = 'http://www.w3.org/2000/svg';
  function svg(t, a, p) { var n = document.createElementNS(NS, t); for (var k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; }
  var rows = D.rows, n = rows.length, W = 560, H = 150, pl = 34, pr = 10, pt = 14, pb = 22;
  function X(i) { return pl + (W - pl - pr) * (n === 1 ? .5 : i / (n - 1)); }
  D.metrics.forEach(function (m) {
    var vals = rows.map(function (r) { return r[m.k]; }).filter(function (v) { return v != null; });
    if (!vals.length) return;
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals), pad = (hi - lo) * .15 || 1;
    lo -= pad; hi += pad;
    function Y(v) { return H - pb - (H - pt - pb) * (v - lo) / (hi - lo); }
    var card = document.createElement('div'); card.className = 'panel trend';
    card.innerHTML = '<div class="tr-h"><b>' + m.l + '</b><span>typical ' + D.med[m.k].toFixed(m.u === '%' ? 0 : 1) + m.u + '</span></div>';
    var s = svg('svg', {viewBox: '0 0 ' + W + ' ' + H, class: 'tr-svg', role: 'img', 'aria-label': m.l + ' by game'}, card);
    // shade the current manager's games
    var first = rows.findIndex(function (r) { return r.era === D.cur; });
    if (first >= 0) svg('rect', {x: X(first) - (n > 1 ? (W - pl - pr) / (n - 1) / 2 : 20), y: pt - 6, width: W - pr - X(first) + (n > 1 ? (W - pl - pr) / (n - 1) / 2 : 20), height: H - pt - pb + 6, class: 'tr-cur'}, s);
    [lo + pad, (lo + hi) / 2, hi - pad].forEach(function (v) {
      svg('text', {x: pl - 6, y: Y(v) + 3, class: 'tr-tick', 'text-anchor': 'end'}, s).textContent = v.toFixed(0);
    });
    svg('line', {x1: pl, x2: W - pr, y1: Y(D.med[m.k]), y2: Y(D.med[m.k]), class: 'tr-med'}, s);
    var pts = [];
    rows.forEach(function (r, i) { if (r[m.k] != null) pts.push(X(i).toFixed(1) + ',' + Y(r[m.k]).toFixed(1)); });
    svg('polyline', {points: pts.join(' '), class: 'tr-line'}, s);
    rows.forEach(function (r, i) {
      if (r[m.k] == null) return;
      var a = svg('a', {href: '../m/' + r.id + '/index.html'}, s);
      var c = svg('circle', {cx: X(i), cy: Y(r[m.k]), r: 5, class: 'tr-dot ' + r.result}, a);
      svg('title', {}, c).textContent = r.date + ' ' + r.opp + ' (' + (r.home ? 'H' : 'A') + ') ' + r.gf + '–' + r.ga + ' · ' + m.l + ' ' + r[m.k] + m.u;
    });
    [0, n - 1].forEach(function (i) {
      svg('text', {x: X(i), y: H - 6, class: 'tr-tick', 'text-anchor': i ? 'end' : 'start'}, s).textContent = rows[i].date.slice(0, 7);
    });
    box.appendChild(card);
  });
})();
