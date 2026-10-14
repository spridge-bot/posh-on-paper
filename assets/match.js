/* Posh On Paper — interactive match story.
   Reads the JSON in #match-data and draws live SVGs (pitch, xG race, momentum, scoreboard).
   As each story step scrolls to the middle of the screen, every visual jumps to that minute:
   shots appear, the xG lines extend, the clock and score update, and the step's focus
   (a goal, or a momentum spell) is highlighted. Hover/tap a shot for its details. */
(function () {
  var el = document.getElementById('match-data');
  if (!el) return;
  var D = JSON.parse(el.textContent);
  var NS = 'http://www.w3.org/2000/svg';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function svg(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  var tweens = {};
  function tween(node, attrs, key) { // animate SVG attributes with rAF; instant if reduced motion
    if (reduce) { for (var a in attrs) node.setAttribute(a, attrs[a]); return; }
    var from = {}, t0 = null, id = key || Math.random();
    for (var b in attrs) from[b] = parseFloat(node.getAttribute(b)) || 0;
    tweens[id] = true;
    function f(ts) {
      if (!t0) t0 = ts; var k = Math.min((ts - t0) / 550, 1), e = 1 - Math.pow(1 - k, 3);
      for (var c in attrs) node.setAttribute(c, from[c] + (attrs[c] - from[c]) * e);
      if (k < 1) requestAnimationFrame(f);
    }
    requestAnimationFrame(f);
  }
  var SIT = {FastBreak: 'counter-attack', RegularPlay: 'open play', SetPiece: 'set piece',
    FromCorner: 'corner', Penalty: 'penalty', FreeKick: 'free kick', ThrowInSetPiece: 'throw-in'};
  var RES = {G: 'Goal', S: 'Saved / blocked', M: 'Missed', W: 'Hit the woodwork'};

  /* ---------------- pitch (105 x 68, Posh attack right) ---------------- */
  var pitch = document.getElementById('st-pitch');
  var P = svg('svg', {viewBox: '-3 -3 111 74', class: 'pitch-svg', role: 'img',
    'aria-label': 'Shot map: Posh attack right'}, pitch);
  var L = svg('g', {class: 'lines'}, P);
  svg('rect', {x: 0, y: 0, width: 105, height: 68, rx: .6}, L);
  svg('line', {x1: 52.5, y1: 0, x2: 52.5, y2: 68}, L);
  svg('circle', {cx: 52.5, cy: 34, r: 9.15}, L);
  [[0, 1], [105, -1]].forEach(function (g) {
    var x = g[0], d = g[1];
    svg('rect', {x: d > 0 ? x : x - 16.5, y: 13.85, width: 16.5, height: 40.3}, L);
    svg('rect', {x: d > 0 ? x : x - 5.5, y: 24.85, width: 5.5, height: 18.3}, L);
    svg('rect', {x: d > 0 ? x - 1.6 : x, y: 30.34, width: 1.6, height: 7.32, class: 'goalmouth'}, L);
    svg('circle', {cx: x + d * 11, cy: 34, r: .45, class: 'spot'}, L);
  });
  svg('text', {x: 103, y: -0.8, class: 'dir', 'text-anchor': 'end'}, P).textContent = 'POSH ATTACK →';
  svg('text', {x: 2, y: -0.8, class: 'dir'}, P).textContent = '← ' + D.opp.toUpperCase() + ' ATTACK';
  var dots = D.shots.map(function (s, i) {
    if (s[8]) return null; // own goal: recorded from the defender's end, so it would plot at the wrong end
    var posh = s[4] === 'p', x = posh ? s[0] : 105 - s[0], y = posh ? s[1] : 68 - s[1];
    var r = 0.9 + 5.2 * Math.sqrt(Math.max(s[2], 0.005));
    var c = svg('circle', {cx: x, cy: y, r: r, class: 'shot ' + (posh ? 'p' : 'o') + (s[5] === 'G' ? ' goal' : ''),
      tabindex: 0, 'data-i': i}, P);
    return c;
  });

  /* ---------------- xG race ---------------- */
  var W = 600, H = 210, padL = 30, padR = 104, padT = 12, padB = 22;
  var race = document.getElementById('st-race');
  var R = svg('svg', {viewBox: '0 0 ' + W + ' ' + H, class: 'race-svg', preserveAspectRatio: 'none',
    role: 'img', 'aria-label': 'xG race'}, race);
  var end = D.end, cum = {p: [[0, 0]], o: [[0, 0]]}, tot = {p: 0, o: 0};
  D.shots.slice().sort(function (a, b) { return a[3] - b[3]; }).forEach(function (s) {
    if (s[8]) return; // own goals carry no shooter xG
    var t = s[4]; cum[t].push([s[3], tot[t]]); tot[t] += s[2]; cum[t].push([s[3], tot[t]]);
  });
  cum.p.push([end, tot.p]); cum.o.push([end, tot.o]);
  var ymax = Math.max(tot.p, tot.o, D.xg[0] || 0, D.xg[1] || 0, 0.5) * 1.12;
  function X(t) { return padL + (W - padL - padR) * t / end; }
  function Y(v) { return H - padB - (H - padT - padB) * v / ymax; }
  for (var g = 0; g <= ymax; g += (ymax > 3 ? 1 : 0.5)) {
    svg('line', {x1: padL, x2: W - padR, y1: Y(g), y2: Y(g), class: 'grid'}, R);
    svg('text', {x: padL - 6, y: Y(g) + 3, class: 'tick', 'text-anchor': 'end'}, R).textContent = g.toFixed(g % 1 ? 1 : 0);
  }
  [0, 15, 30, 45, 60, 75, 90].concat(end > 95 ? [105, 120] : []).forEach(function (t) {
    if (t > end) return;
    svg('text', {x: X(t), y: H - 6, class: 'tick', 'text-anchor': 'middle'}, R).textContent = t + "'";
  });
  svg('line', {x1: X(45), x2: X(45), y1: padT, y2: H - padB, class: 'ht'}, R);
  var clip = svg('clipPath', {id: 'race-clip'}, svg('defs', {}, R));
  var clipRect = svg('rect', {x: 0, y: 0, width: X(0), height: H}, clip);
  var lines = svg('g', {'clip-path': 'url(#race-clip)'}, R);
  ['o', 'p'].forEach(function (t) {
    svg('path', {d: 'M' + cum[t].map(function (q) { return X(q[0]).toFixed(1) + ',' + Y(q[1]).toFixed(1); }).join('L'),
      class: 'race ' + t}, lines);
  });
  D.goals.forEach(function (g) {
    var t = g[1] ? 'p' : 'o', v = 0;
    cum[t].forEach(function (q) { if (q[0] <= g[0]) v = q[1]; });
    svg('circle', {cx: X(g[0]), cy: Y(v), r: 5, class: 'rgoal ' + t}, lines);
  });
  var clockLine = svg('line', {x1: X(0), x2: X(0), y1: padT, y2: H - padB, class: 'clock'}, R);
  var endP = svg('text', {x: W - padR + 6, y: Y(tot.p), class: 'endlab p'}, R);
  var endO = svg('text', {x: W - padR + 6, y: Y(tot.o), class: 'endlab o'}, R);
  function placeEnds(tp, to, t) { // labels ride the lines at the current minute, never overlapping
    var yp = Y(tp) + 4, yo = Y(to) + 4, gap = 15;
    if (Math.abs(yp - yo) < gap) { var mid = (yp + yo) / 2, s = yp <= yo ? -1 : 1;
      yp = mid + s * gap / 2; yo = mid - s * gap / 2; }
    var x = X(t) + 8;
    tween(endP, {x: x, y: yp}, 'endP'); tween(endO, {x: x, y: yo}, 'endO');
  }

  /* ---------------- momentum ---------------- */
  var mom = document.getElementById('st-mom'), M = null, winRect = null;
  if (D.mom.length && mom) {
    var MH = 64, mx = Math.max.apply(null, D.mom.map(function (q) { return Math.abs(q[1]); })) || 1;
    M = svg('svg', {viewBox: '0 0 ' + W + ' ' + MH, class: 'mom-svg', preserveAspectRatio: 'none',
      role: 'img', 'aria-label': 'Momentum'}, mom);
    winRect = svg('rect', {x: 0, y: 0, width: 0, height: MH, class: 'win'}, M);
    var bw = (W - padL - padR) / end;
    D.mom.forEach(function (q) {
      var h = Math.abs(q[1]) / mx * (MH / 2 - 3);
      svg('rect', {x: X(q[0]) - bw * .45, y: q[1] > 0 ? MH / 2 - h : MH / 2, width: bw * .9,
        height: Math.max(h, .5), class: 'mbar ' + (q[1] > 0 ? 'p' : 'o'), 'data-t': q[0]}, M);
    });
    svg('line', {x1: padL, x2: W - padR, y1: MH / 2, y2: MH / 2, class: 'axis'}, M);
  } else if (mom) { mom.parentNode.style.display = 'none'; }

  /* ---------------- scoreboard + state ---------------- */
  var sbClock = document.getElementById('sb-clock'), sbH = document.getElementById('sb-h'),
      sbA = document.getElementById('sb-a'), sbNote = document.getElementById('sb-note');
  function score(t) {
    var p = 0, o = 0;
    D.goals.forEach(function (g) { if (g[0] <= t) { if (g[1]) p++; else o++; } });
    return D.home ? [p, o] : [o, p];
  }
  function cumAt(t, side) { var v = 0; cum[side].forEach(function (q) { if (q[0] <= t) v = q[1]; }); return v; }
  function setState(step) {
    var t = Math.min(step.t, end);
    dots.forEach(function (c, i) {
      if (!c) return;
      var s = D.shots[i];
      c.classList.toggle('on', s[3] <= t);
      c.classList.toggle('focus', step.focus === i);
    });
    tween(clipRect, {width: X(t) + 1}, 'clip');
    tween(clockLine, {x1: X(t), x2: X(t)}, 'clock');
    var tp = step.final ? (D.xg[0] != null ? D.xg[0] : tot.p) : cumAt(t, 'p');
    var to = step.final ? (D.xg[1] != null ? D.xg[1] : tot.o) : cumAt(t, 'o');
    endP.textContent = 'Posh ' + (tp + 1e-9).toFixed(2); endO.textContent = D.opp + ' ' + (to + 1e-9).toFixed(2);
    placeEnds(step.final ? cumAt(end, 'p') : tp, step.final ? cumAt(end, 'o') : to, t);
    var sc = score(t);
    sbH.textContent = sc[0]; sbA.textContent = sc[1];
    sbClock.textContent = step.final ? 'FT' : (step.t >= 45.9 && step.t < 46 ? 'HT' : (t <= 0 ? "KO" : Math.round(t) + "'"));
    sbNote.textContent = step.kicker;
    if (winRect) {
      if (step.win) { tween(winRect, {x: X(step.win[0]), width: X(step.win[1]) - X(step.win[0])}, 'win');
        winRect.setAttribute('class', 'win on ' + (step.side === 'posh' ? 'p' : 'o')); }
      else winRect.setAttribute('class', 'win');
      M.querySelectorAll('.mbar').forEach(function (b) { b.classList.toggle('future', +b.getAttribute('data-t') > t); });
    }
  }

  /* ---------------- steps: activate the one crossing the middle of the screen ---------------- */
  var stepEls = document.querySelectorAll('.st-step');
  var active = -1;
  function activate(i) {
    if (i === active) return; active = i;
    stepEls.forEach(function (s, j) { s.classList.toggle('is-active', j === i); s.classList.toggle('is-past', j < i); });
    setState(D.steps[i]);
  }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) activate(+e.target.getAttribute('data-step')); });
    }, {rootMargin: '-45% 0px -50% 0px'});
    stepEls.forEach(function (s) { io.observe(s); });
  }
  stepEls.forEach(function (s) { s.addEventListener('click', function () { activate(+s.getAttribute('data-step')); }); });
  activate(D.steps.length - 1); // before scrolling, show the full picture
  activate(0);
  document.querySelector('.story').classList.add('ready');

  /* ---------------- shot tooltip (hover / tap / keyboard) ---------------- */
  var tip = document.getElementById('shot-tip');
  function showTip(c) {
    var s = D.shots[+c.getAttribute('data-i')];
    tip.innerHTML = '<b>' + (s[8] ? 'Own goal' : (s[6] || 'Shot')) + '</b><span>' + s[3] + "' · " +
      (s[4] === 'p' ? 'Posh' : D.opp) + '</span><span>' + (s[8] ? '' : 'xG ' + s[2].toFixed(2) + ' · ') +
      (RES[s[5]] || '') + (SIT[s[7]] ? ' · ' + SIT[s[7]] : '') + '</span>';
    var r = c.getBoundingClientRect(), pr = pitch.getBoundingClientRect();
    tip.style.left = Math.min(Math.max(r.left - pr.left + r.width / 2, 70), pr.width - 70) + 'px';
    tip.style.top = (r.top - pr.top) + 'px';
    tip.hidden = false;
  }
  dots.forEach(function (c) {
    if (!c) return;
    c.addEventListener('mouseenter', function () { showTip(c); });
    c.addEventListener('focus', function () { showTip(c); });
    c.addEventListener('click', function (e) { e.stopPropagation(); showTip(c); });
    c.addEventListener('mouseleave', function () { tip.hidden = true; });
    c.addEventListener('blur', function () { tip.hidden = true; });
  });
  document.addEventListener('click', function () { tip.hidden = true; });

  /* ---------------- stat bars: fill + count up when they scroll into view ---------------- */
  var stats = document.querySelector('.statgrid');
  if (stats && 'IntersectionObserver' in window && !reduce) {
    stats.classList.add('pre');
    new IntersectionObserver(function (es, o) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        o.disconnect(); stats.classList.remove('pre'); stats.classList.add('go');
        stats.querySelectorAll('.num[data-v]').forEach(function (n) {
          var v = +n.getAttribute('data-v'), dp = +n.getAttribute('data-dp'), suf = n.getAttribute('data-suf') || '', t0 = null;
          function f(ts) { if (!t0) t0 = ts; var k = Math.min((ts - t0) / 900, 1), e2 = 1 - Math.pow(1 - k, 3);
            n.textContent = (v * e2).toFixed(dp) + suf; if (k < 1) requestAnimationFrame(f); }
          requestAnimationFrame(f);
        });
      });
    }, {threshold: .25}).observe(stats);
  }
})();
