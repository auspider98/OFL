/**
 * ============================================================
 *  OFL-ENGINE.JS — shared calculations for the OFL site
 *  Reads window.OFL_DATA (and window.OFL_BRC_ANALYSIS when present).
 *  Never stores or edits data — it only calculates.
 *
 *  Load after admin-config.js, ofl-data.js (+ ofl-brc-analysis.js), admin.js:
 *    <script src="ofl-engine.js"></script>
 *
 *  window.OFL_ENGINE
 *    .util  — formatting + seeded random helpers
 *    .ofc   — standings, schedule, scoring model, playoff-odds simulation
 *    .brc   — bracket rounds, results, who picked what, max possible points
 *    .cards — titles, seasons, awards and the Hall of Fame (finished seasons only)
 *
 *  Used by: race.html, gazette.html, playas.html, playa.html, team.html, records.html, standings.html, league.html (standings), ofl-newsroom.js (league.html card)
 * ============================================================
 */
(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════════
     UTIL
  ══════════════════════════════════════════════════════════ */
  function esc(s) { return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function num(v) { var n = parseFloat(v); return isNaN(n) ? 0 : n; }
  function f2(n) { return (Math.round(n * 100) / 100).toFixed(2); }
  function initials(n) { return (n || '?').split(' ').map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase(); }
  function ord(n) { var s = ['th','st','nd','rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
  function hex(h) { return /^#[0-9a-f]{6}$/i.test(String(h || '').trim()) ? h : null; }
  function hash(str) { var h = 0; for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0; return Math.abs(h); }
  function pctTxt(p) { return p >= 0.995 && p < 1 ? '>99' : (p > 0 && p < 0.005 ? '<1' : String(Math.round(p * 100))); }
  /* Seeded RNG (mulberry32) so numbers don't jitter between identical runs */
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0; var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gauss(r) {
    var u = 0, v = 0; while (u === 0) u = r(); v = r();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  var DATA = window.OFL_DATA || {};
  var ROSTER = DATA.masterRoster || [];
  function member(mid) { return ROSTER.find(function (r) { return r.id === mid; }) || {}; }

  /* ══════════════════════════════════════════════════════════
     OFC — football
  ══════════════════════════════════════════════════════════ */
  var SIMS = 10000;          // simulated seasons per odds run (every page uses the same number)
  var SEED = 20260;          // same starting point everywhere, so the same week gives the same odds
  var SHRINK = 4;            // games of league-average "prior" blended into each team's scoring
  var PLAYOFF_TEAMS = 4;     // OFC: top 4 make the playoffs

  var OFC = (DATA.leagueData || []).find(function (l) { return l.sport === 'football'; }) || null;

  function sortedWeeks(s) { return (s.weeks || []).slice().sort(function (a, b) { return (a.weekNumber || 0) - (b.weekNumber || 0); }); }
  function completeWeeks(s) { return sortedWeeks(s).filter(function (w) { return w.isComplete; }); }
  /* Seasons with at least one completed week, newest first */
  var SEASONS = OFC ? (OFC.seasons || []).filter(function (s) { return completeWeeks(s).length; })
    .sort(function (a, b) { return (parseInt(b.year, 10) || 0) - (parseInt(a.year, 10) || 0); }) : [];
  function lastDone(s) { var c = completeWeeks(s); return c.length ? (c[c.length - 1].weekNumber || 0) : 0; }

  /* Games in a week: { h, a, hs, as, ht, at } */
  function gamesOf(week) {
    return ((week && week.games) || []).map(function (g) {
      var h = g.home || {}, a = g.away || {};
      if (!h.memberId || !a.memberId) return null;
      return { h: h.memberId, a: a.memberId, hs: num(h.score), as: num(a.score), ht: h.teamName || '', at: a.teamName || '' };
    }).filter(Boolean);
  }

  /* Every member in a season, in first-appearance order */
  function teamIds(season) {
    var ids = [];
    sortedWeeks(season).forEach(function (w) {
      (w.games || []).forEach(function (g) { [g.home, g.away].forEach(function (s) { if (s && s.memberId && ids.indexOf(s.memberId) < 0) ids.push(s.memberId); }); });
    });
    return ids;
  }

  /* Regular-season length: set per season in ofl-data.html (blank = 15). Archived seasons = weeks on file. */
  function regWeeks(season) {
    if (season.isFinal) return completeWeeks(season).length;
    return parseInt(season.regularSeasonWeeks, 10) || 15;
  }

  /* Standings after week k (k = 0 → before the season).
     rows sorted by wins (ties = ½) then points for; each row { id, w, l, t, pf, pa, res[], name, rank, streak, gp } */
  function standingsThrough(season, k) {
    var st = {};
    completeWeeks(season).forEach(function (w) {
      gamesOf(w).forEach(function (g) {
        [[g.h, g.ht], [g.a, g.at]].forEach(function (x) {
          if (!st[x[0]]) st[x[0]] = { id: x[0], w: 0, l: 0, t: 0, pf: 0, pa: 0, res: [], name: x[1] };
          if (x[1]) st[x[0]].name = x[1];
        });
        if ((w.weekNumber || 0) > k) return;
        var H = st[g.h], A = st[g.a];
        H.pf += g.hs; H.pa += g.as; A.pf += g.as; A.pa += g.hs;
        if (g.hs > g.as) { H.w++; A.l++; H.res.push('W'); A.res.push('L'); }
        else if (g.as > g.hs) { A.w++; H.l++; A.res.push('W'); H.res.push('L'); }
        else { H.t++; A.t++; H.res.push('T'); A.res.push('T'); }
      });
    });
    var rows = Object.keys(st).map(function (id) { return st[id]; });
    rows.sort(function (a, b) { return (b.w + b.t / 2) - (a.w + a.t / 2) || b.pf - a.pf; });
    rows.forEach(function (r, i) {
      r.rank = i + 1;
      var last = r.res[r.res.length - 1], n = 0;
      for (var j = r.res.length - 1; j >= 0 && r.res[j] === last; j--) n++;
      r.streak = last ? { type: last, n: n } : null;
      r.gp = r.w + r.l + r.t;
    });
    var map = {}; rows.forEach(function (r) { map[r.id] = r; });
    return { rows: rows, map: map };
  }
  function rec(r) { return r.w + '–' + r.l + (r.t ? '–' + r.t : ''); }

  /* Playoff record for one member in one season: every playoff game counts
     (wild card, semifinals, title game, 3rd place and Toilet Bowl).
     Finished seasons (isFinal) count every round. A season in progress counts only the
     rounds switched to complete in ofl-data.html (season.playoffRoundsComplete).
     Returns { w, l, t, gp } */
  function playoffRecord(season, mid) {
    var out = { w: 0, l: 0, t: 0, gp: 0 };
    if (!season || !mid) return out;
    var po = season.playoffs || {}, done = season.playoffRoundsComplete || {};
    ['wildcard', 'semis', 'finals', 'consolation'].forEach(function (k) {
      if (!season.isFinal && !done[k]) return;
      (po[k] || []).forEach(function (g) {
        if (g.homeMemberId !== mid && g.awayMemberId !== mid) return;
        if (!g.homeMemberId || !g.awayMemberId) return;
        if (g.homeScore === '' || g.homeScore == null || g.awayScore === '' || g.awayScore == null) return;
        var hs = num(g.homeScore), as = num(g.awayScore);
        if (!hs && !as) return;
        var me = g.homeMemberId === mid ? hs : as, op = g.homeMemberId === mid ? as : hs;
        if (me > op) out.w++; else if (me < op) out.l++; else out.t++;
        out.gp++;
      });
    });
    return out;
  }
  /* "10-5" / "10–5–1" → { w, l, t } (null if blank) */
  function parseRec(str) {
    if (str == null || str === '') return null;
    var p = String(str).split(/[-–]/).map(function (v) { return parseInt(v, 10) || 0; });
    return p.length >= 2 ? { w: p[0], l: p[1], t: p[2] || 0 } : null;
  }
  /* Overall record = regular season (typed standings record) + playoffs.
     Returns { reg:{w,l,t}, po:{w,l,t,gp}, all:{w,l,t} } */
  function overallRecord(season, mid, regStr) {
    var row = (season.standings || []).find(function (r) { return r.memberId === mid; }) || {};
    var reg = parseRec(regStr != null ? regStr : row.record) || { w: 0, l: 0, t: 0 };
    var po = playoffRecord(season, mid);
    return { reg: reg, po: po, all: { w: reg.w + po.w, l: reg.l + po.l, t: reg.t + po.t } };
  }

  /* Remaining regular-season schedule after week k: real matchups if loaded, else Yahoo's repeating cycle.
     Returns { games: [{ id, week, h, a }], source: 'loaded' | 'pattern' } */
  function remainingSchedule(season, k) {
    var weeks = sortedWeeks(season), out = [], usedPattern = false;
    var cycle = Math.max(1, teamIds(season).length - 1), R = regWeeks(season);
    for (var wk = k + 1; wk <= R; wk++) {
      var src = weeks.find(function (w) { return w.weekNumber === wk && (w.games || []).length; });
      if (!src) {
        var mirror = ((wk - 1) % cycle) + 1;
        src = weeks.find(function (w) { return w.weekNumber === mirror; });
        usedPattern = true;
      }
      if (!src) continue;
      (src.games || []).forEach(function (g, i) {
        if (!g.home || !g.away || !g.home.memberId || !g.away.memberId) return;
        out.push({ id: wk + '-' + i, week: wk, h: g.home.memberId, a: g.away.memberId });
      });
    }
    return { games: out, source: usedPattern ? 'pattern' : 'loaded' };
  }

  /* Scoring model from games through week k — each team's mean & spread, shrunk toward league average */
  function scoringModel(season, k, ids) {
    ids = ids || teamIds(season);
    var all = [], per = {};
    ids.forEach(function (id) { per[id] = []; });
    completeWeeks(season).forEach(function (w) {
      if ((w.weekNumber || 0) > k) return;
      gamesOf(w).forEach(function (g) {
        if (!per[g.h]) per[g.h] = []; if (!per[g.a]) per[g.a] = [];
        per[g.h].push(g.hs); per[g.a].push(g.as); all.push(g.hs, g.as);
      });
    });
    var lm = all.length ? all.reduce(function (s, v) { return s + v; }, 0) / all.length : 110;
    var lv = all.length ? all.reduce(function (s, v) { return s + (v - lm) * (v - lm); }, 0) / all.length : 400;
    var model = {};
    ids.forEach(function (id) {
      var xs = per[id] || [], n = xs.length;
      var m = n ? xs.reduce(function (s, v) { return s + v; }, 0) / n : lm;
      var v = n ? xs.reduce(function (s, x) { return s + (x - m) * (x - m); }, 0) / n : lv;
      model[id] = { mu: (n * m + SHRINK * lm) / (n + SHRINK), sd: Math.sqrt((n * v + SHRINK * lv) / (n + SHRINK)) };
    });
    return model;
  }

  /* Full simulation (race.html: seeds, win buckets, per-game conditional odds).
     picks = { gameId: 'h' | 'a' } forces a winner. base = { id: { w, t, pf } }. */
  function simulate(n, schedule, picks, model, base, seed, ids, playoffTeams) {
    var r = rng(seed), k = ids.length, PLAYOFF_TEAMS = playoffTeams || 4;
    var idx = {}; ids.forEach(function (id, i) { idx[id] = i; });
    var bw = ids.map(function (id) { return base[id].w + base[id].t * 0.5; });
    var bpf = ids.map(function (id) { return base[id].pf; });
    var seedCount = ids.map(function () { return [0, 0, 0, 0, 0]; }); // seeds 1-4 + miss
    var winSum = ids.map(function () { return 0; });
    var gameWins = {}; schedule.forEach(function (g) { gameWins[g.id] = 0; });
    var w = new Float64Array(k), pf = new Float64Array(k), order = ids.map(function (_, i) { return i; });
    // Extra bookkeeping for the team "Path" panels
    var G = schedule.length, homeWon = new Uint8Array(G), made = new Uint8Array(k);
    var gHW = new Float64Array(G), gamePO = [], poTotal = new Float64Array(k);
    var gameT1 = [], gameT2 = [], t1Total = new Float64Array(k), t2Total = new Float64Array(k);
    var top1 = new Uint8Array(k), top2 = new Uint8Array(k);
    for (var gj = 0; gj < G; gj++) { gamePO.push(new Float64Array(k)); gameT1.push(new Float64Array(k)); gameT2.push(new Float64Array(k)); }
    var remCount = ids.map(function () { return 0; });
    schedule.forEach(function (g) { remCount[idx[g.h]]++; remCount[idx[g.a]]++; });
    var winB = ids.map(function (_, i) { return new Float64Array(remCount[i] + 1); });
    var winBPO = ids.map(function (_, i) { return new Float64Array(remCount[i] + 1); });

    for (var s = 0; s < n; s++) {
      for (var i = 0; i < k; i++) { w[i] = bw[i]; pf[i] = bpf[i]; }
      for (var j = 0; j < schedule.length; j++) {
        var g = schedule[j], hi = idx[g.h], ai = idx[g.a];
        var hs = model[g.h].mu + model[g.h].sd * gauss(r);
        var as_ = model[g.a].mu + model[g.a].sd * gauss(r);
        var forced = picks[g.id];
        if (forced === 'h' && hs <= as_) { var tmp = hs; hs = as_; as_ = tmp; }
        if (forced === 'a' && as_ <= hs) { var tmp2 = hs; hs = as_; as_ = tmp2; }
        pf[hi] += hs; pf[ai] += as_;
        if (hs > as_) { w[hi]++; gameWins[g.id]++; homeWon[j] = 1; } else { w[ai]++; homeWon[j] = 0; }
      }
      order.sort(function (x, y) { return (w[y] - w[x]) || (pf[y] - pf[x]); });
      for (var p = 0; p < k; p++) {
        var t = order[p];
        seedCount[t][p < PLAYOFF_TEAMS ? p : 4]++;
        winSum[t] += w[t];
        made[t] = p < PLAYOFF_TEAMS ? 1 : 0;
        top1[t] = p === 0 ? 1 : 0; top2[t] = p < 2 ? 1 : 0;
        t1Total[t] += top1[t]; t2Total[t] += top2[t];
      }
      for (var q = 0; q < k; q++) {
        var rw = Math.round(w[q] - bw[q]);
        winB[q][rw]++; if (made[q]) { winBPO[q][rw]++; poTotal[q]++; }
      }
      for (var gk = 0; gk < G; gk++) {
        if (!homeWon[gk]) continue;
        gHW[gk]++;
        var row = gamePO[gk], r1 = gameT1[gk], r2 = gameT2[gk];
        for (var q2 = 0; q2 < k; q2++) { row[q2] += made[q2]; r1[q2] += top1[q2]; r2[q2] += top2[q2]; }
      }
    }
    var res = {};
    ids.forEach(function (id, i) {
      var sc = seedCount[i];
      res[id] = {
        seeds: sc.map(function (c) { return c / n; }),
        playoff: (sc[0] + sc[1] + sc[2] + sc[3]) / n,
        top: sc[0] / n,
        projW: winSum[i] / n,
        rem: remCount[i],
        byWins: Array.prototype.map.call(winB[i], function (c, kk) { return { k: kk, n: c, po: c ? winBPO[i][kk] / c : 0 }; })
      };
    });
    res._n = n; res._idx = idx; res._gHW = gHW; res._gamePO = gamePO; res._poTotal = poTotal;
    res._gameT1 = gameT1; res._gameT2 = gameT2; res._t1Total = t1Total; res._t2Total = t2Total;
    res._homeWinPct = {}; schedule.forEach(function (g) { res._homeWinPct[g.id] = gameWins[g.id] / n; });
    return res;
  }

  /* Lite simulation — playoff odds only. Draws the same random numbers in the same order as
     simulate(), so for the same inputs both return identical playoff odds. */
  function simulateLite(n, schedule, model, base, seed, ids, playoffTeams) {
    var r = rng(seed), k = ids.length, pt = playoffTeams || PLAYOFF_TEAMS;
    var idx = {}; ids.forEach(function (id, i) { idx[id] = i; });
    var bw = ids.map(function (id) { return base[id].w + base[id].t * 0.5; });
    var bpf = ids.map(function (id) { return base[id].pf; });
    var made = ids.map(function () { return 0; });
    var w = new Float64Array(k), pf = new Float64Array(k), order = ids.map(function (_, i) { return i; });
    for (var s = 0; s < n; s++) {
      for (var i = 0; i < k; i++) { w[i] = bw[i]; pf[i] = bpf[i]; }
      for (var j = 0; j < schedule.length; j++) {
        var g = schedule[j], hi = idx[g.h], ai = idx[g.a];
        var hs = model[g.h].mu + model[g.h].sd * gauss(r);
        var as_ = model[g.a].mu + model[g.a].sd * gauss(r);
        pf[hi] += hs; pf[ai] += as_;
        if (hs > as_) w[hi]++; else w[ai]++;
      }
      order.sort(function (x, y) { return (w[y] - w[x]) || (pf[y] - pf[x]); });
      for (var p = 0; p < pt && p < k; p++) made[order[p]]++;
    }
    var out = {}; ids.forEach(function (id, i) { out[id] = made[i] / n; });
    return out;
  }

  /* Playoff odds after week k of a season → { memberId: 0..1 }. Cached per season + week. */
  var ODDS_CACHE = {};
  function odds(season, k) {
    var key = season.year + '|' + k;
    if (ODDS_CACHE[key]) return ODDS_CACHE[key];
    var ids = teamIds(season), st = standingsThrough(season, k), base = {};
    ids.forEach(function (id) { var r = st.map[id]; base[id] = r ? { w: r.w, t: r.t, pf: r.pf } : { w: 0, t: 0, pf: 0 }; });
    var sched = remainingSchedule(season, k).games;
    var out;
    if (!sched.length) {   // nothing left to play: standings decide it
      out = {}; ids.forEach(function (id) { out[id] = st.map[id] && st.map[id].rank <= PLAYOFF_TEAMS ? 1 : 0; });
    } else {
      out = simulateLite(SIMS, sched, scoringModel(season, k, ids), base, SEED, ids, PLAYOFF_TEAMS);
    }
    ODDS_CACHE[key] = out;
    return out;
  }

  /* ══════════════════════════════════════════════════════════
     BRC — bracket challenge
  ══════════════════════════════════════════════════════════ */
  var RKEYS = ['R64', 'R32', 'S16', 'E8', 'F4', 'Final'], RURL = ['r64', 'r32', 's16', 'e8', 'f4', 'final'];
  var RNAME = ['Round of 64', 'Round of 32', 'Sweet 16', 'Elite Eight', 'Final Four', 'Championship'];
  var RPTS = [1, 2, 4, 8, 16, 32];
  var BRC = (DATA.leagueData || []).find(function (l) { return l.sport === 'madness'; }) || null;
  /* Seasons with standings, newest first */
  var BSEASONS = BRC ? (BRC.seasons || []).filter(function (s) { return (s.standings || []).length; })
    .sort(function (a, b) { return (parseInt(b.year, 10) || 0) - (parseInt(a.year, 10) || 0); }) : [];

  /* The bracket analysis export only describes its own year */
  function analysisFor(season) {
    var an = window.OFL_BRC_ANALYSIS || null;
    return an && an.meta && String(an.meta.year) === String(season.year) && an.actualResults ? an : null;
  }
  /* Completed rounds (contiguous from the Round of 64). With the analysis export for that year,
     a round counts only once every game in it is final (meta.roundProgress); without it,
     a round counts once points for it are on file. */
  function roundsOf(season) {
    var out = [], an = analysisFor(season), prog = an && an.meta && an.meta.roundProgress;
    for (var r = 0; r < 6; r++) {
      var done;
      if (prog && prog[RKEYS[r]]) done = num(prog[RKEYS[r]].total) > 0 && num(prog[RKEYS[r]].complete) >= num(prog[RKEYS[r]].total);
      else done = (season.standings || []).some(function (row) { return num((row.pointsByRound || [])[r]) > 0; });
      if (!done) break;
      out.push(r);
    }
    return out;
  }
  /* "Michigan State" = "Michigan St.", "UConn" = "Connecticut" */
  function normTeam(t) {
    return String(t || '').toLowerCase().replace(/\./g, '').replace(/\bstate\b/g, 'st').replace(/^uconn$/, 'connecticut')
      .replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
  }
  /* Competition ranking (ties share a rank): writes list[i][field] */
  function assignRank(list, key, field) {
    var s = list.slice().sort(function (a, b) { return b[key] - a[key]; });
    s.forEach(function (x, i) { x[field] = (i && x[key] === s[i - 1][key]) ? s[i - 1][field] : i + 1; });
    return s;
  }
  /* Who picked what: { slots: { slotId: [{ id, team }] }, champ: { memberId: team }, all: { memberId: [picks] } } */
  var PICKS = null;
  function picks(an) {
    if (PICKS) return PICKS;
    PICKS = { slots: {}, champ: {}, all: {} };
    (an.standings || []).forEach(function (st) {
      PICKS.all[st.memberId] = st.allPicks || [];
      (st.allPicks || []).forEach(function (p) {
        (PICKS.slots[p.slotId] = PICKS.slots[p.slotId] || []).push({ id: st.memberId, team: p.team });
        if (p.slotId === 'champ' || p.round === 'Final') PICKS.champ[st.memberId] = p.team;
      });
    });
    return PICKS;
  }
  /* Game results through round r: [{ slot, ri, w, ws, wsd, l, ls, lsd }] */
  function resultsThrough(an, r) {
    return Object.keys(an.actualResults).map(function (k) {
      var g = an.actualResults[k];
      return { slot: k, ri: RKEYS.indexOf(g.round), w: g.winner, ws: num(g.winnerScore), wsd: num(g.winnerSeed), l: g.loser, ls: num(g.loserScore), lsd: num(g.loserSeed) };
    }).filter(function (g) { return g.ri >= 0 && g.ri <= r; });
  }
  function slotOrder(a, b) {
    var pa = a.slot.split('_'), pb = b.slot.split('_');
    return (parseInt(pa[0], 10) || 0) - (parseInt(pb[0], 10) || 0) || (parseInt(pa[1], 10) || 0) - (parseInt(pb[1], 10) || 0);
  }
  /* Most points a bracket can still reach after round `through`, given eliminated teams (normTeam keys) */
  function maxPts(an, id, through, cumv, elim) {
    var m = cumv;
    (picks(an).all[id] || []).forEach(function (p) { var ri = RKEYS.indexOf(p.round); if (ri > through && !elim[normTeam(p.team)]) m += RPTS[ri]; });
    return m;
  }

  /* ══════════════════════════════════════════════════════════
     CARDS — titles, seasons, awards, Hall of Fame
     Finished seasons (isFinal) only, so a champion entered early never counts.
     Shared by playas.html (trading cards) and playa.html (Playa Profile) so the
     numbers always match. leagueData is optional; it defaults to OFL_DATA.leagueData.
  ══════════════════════════════════════════════════════════ */
  function ld(leagueData) { return leagueData || DATA.leagueData || []; }

  /* Titles → [{ year, leagueName, sport }], newest first */
  function championships(mid, leagueData) {
    var entries = [];
    ld(leagueData).forEach(function (league) {
      (league.seasons || []).forEach(function (season) {
        if (season.isFinal && season.championMemberId && season.championMemberId === mid) {
          entries.push({ year: season.year || '?', leagueName: league.name || '', sport: league.sport || '' });
        }
      });
    });
    entries.sort(function (a, b) { return (parseInt(b.year, 10) || 0) - (parseInt(a.year, 10) || 0); });
    return entries;
  }

  /* Seasons played (on the roster or in the standings) */
  function seasonsPlayed(mid, leagueData) {
    var total = 0;
    ld(leagueData).forEach(function (league) {
      (league.seasons || []).forEach(function (season) {
        if (!season.isFinal) return;
        var inRoster    = (season.roster    || []).some(function (r) { return r.memberId === mid; });
        var inStandings = (season.standings || []).some(function (r) { return r.memberId === mid; });
        if (inRoster || inStandings) total++;
      });
    });
    return total;
  }

  /* Awards won, not counting the championship → [{ awardName, awardImage, year, leagueName, sport }], newest first */
  function awardsWon(mid, leagueData) {
    var awards  = [];
    var schemas = window.SPORT_STAT_SCHEMAS || {};
    ld(leagueData).forEach(function (league) {
      var schema    = schemas[league.sport] || schemas.other || {};
      var awardDefs = schema.awards || [];
      (league.seasons || []).forEach(function (season) {
        if (!season.isFinal) return;
        var stats       = season.stats       || {};
        var customStats = season.customStats || [];
        // Schema-defined awards — skip champion
        awardDefs.forEach(function (a) {
          if (a.key === 'champion') return;
          var statDef = (schema.stats || []).find(function (s) { return s.awardKey === a.key; });
          var statKey = statDef ? statDef.key : a.key;
          var stat    = stats[statKey];
          if (!stat || stat.memberId !== mid) return;
          awards.push({
            awardName:  (league.awards && league.awards[a.key]) || a.defaultLabel || a.key,
            awardImage: (league.awardImages && league.awardImages[a.key]) || '',
            year:       season.year || '?',
            leagueName: league.name || '',
            sport:      league.sport || ''
          });
        });
        // Custom awards
        (league.customAwards || []).forEach(function (ca) {
          var entry = customStats.find(function (cs) { return cs.customAwardId === ca.id; });
          if (!entry || entry.memberId !== mid) return;
          awards.push({
            awardName:  ca.label || 'Award',
            awardImage: ca.image || '',
            year:       season.year || '?',
            leagueName: league.name || '',
            sport:      league.sport || ''
          });
        });
      });
    });
    awards.sort(function (a, b) { return (parseInt(b.year, 10) || 0) - (parseInt(a.year, 10) || 0); });
    return awards;
  }

  /* Hall of Fame — in when ANY one of these is reached:
       Titles:  7 OFC  ·  5 BRC  ·  8 combined
       Awards: 25 OFC  · 15 BRC  · 40 combined
     Alumni keep what they earned. Class = the season they first reached a path;
     inductee numbers follow that order. pct = progress on their best path (0..1). */
  var HOF_PATHS = [
    { key: 'ofcT', label: 'OFC Titles', need: 7 },
    { key: 'brcT', label: 'BRC Titles', need: 5 },
    { key: 'allT', label: 'Titles',     need: 8 },
    { key: 'ofcA', label: 'OFC Awards', need: 25 },
    { key: 'brcA', label: 'BRC Awards', need: 15 },
    { key: 'allA', label: 'Awards',     need: 40 }
  ];
  var HOF_CACHE = null;
  function hofTable(leagueData) {
    leagueData = ld(leagueData);
    if (HOF_CACHE && HOF_CACHE.ld === leagueData) return HOF_CACHE;
    var roster = (window.OFL_DATA && window.OFL_DATA.masterRoster) || [];
    var sportOf = {}; leagueData.forEach(function (l) { sportOf[l.name || ''] = l.sport; });
    var info = {};
    roster.forEach(function (m) {
      var years = {};
      function add(y, k) { y = parseInt(y, 10) || 0; (years[y] = years[y] || { ofcT: 0, brcT: 0, ofcA: 0, brcA: 0 })[k]++; }
      championships(m.id, leagueData).forEach(function (t) { add(t.year, sportOf[t.leagueName] === 'madness' ? 'brcT' : 'ofcT'); });
      awardsWon(m.id, leagueData).forEach(function (a) { add(a.year, sportOf[a.leagueName] === 'madness' ? 'brcA' : 'ofcA'); });
      var c = { ofcT: 0, brcT: 0, ofcA: 0, brcA: 0, allT: 0, allA: 0 }, cls = null, path = null;
      Object.keys(years).map(Number).sort(function (a, b) { return a - b; }).forEach(function (y) {
        var e = years[y];
        c.ofcT += e.ofcT; c.brcT += e.brcT; c.ofcA += e.ofcA; c.brcA += e.brcA;
        c.allT = c.ofcT + c.brcT; c.allA = c.ofcA + c.brcA;
        if (cls === null) {
          var hit = HOF_PATHS.filter(function (pt) { return c[pt.key] >= pt.need; })[0];
          if (hit) { cls = y; path = hit.label; }
        }
      });
      var best = HOF_PATHS.reduce(function (b, pt) { var v = c[pt.key] / pt.need; return v > b.v ? { v: v, label: pt.label } : b; }, { v: 0, label: '' });
      info[m.id] = { counts: c, pct: Math.min(1, best.v), bestPath: best.label, inducted: cls !== null, classYear: cls, path: path, no: 0, titles: c.allT, awards: c.allA };
    });
    var inducted = roster.filter(function (m) { return info[m.id].inducted; }).sort(function (a, b) {
      var x = info[a.id], y = info[b.id];
      return (x.classYear - y.classYear) || (y.titles - x.titles) || (y.awards - x.awards) || String(a.name).localeCompare(String(b.name));
    });
    inducted.forEach(function (m, i) { info[m.id].no = i + 1; });
    HOF_CACHE = { ld: leagueData, info: info };
    return HOF_CACHE;
  }
  function hofInfo(mid, leagueData) { return hofTable(leagueData).info[mid] || { inducted: false, pct: 0, titles: 0, awards: 0 }; }

  window.OFL_ENGINE = {
    util: { esc: esc, num: num, f2: f2, initials: initials, ord: ord, hex: hex, hash: hash, pctTxt: pctTxt, rng: rng, gauss: gauss, member: member },
    ofc: {
      league: OFC, seasons: SEASONS, SIMS: SIMS, SEED: SEED, SHRINK: SHRINK, PLAYOFF_TEAMS: PLAYOFF_TEAMS,
      sortedWeeks: sortedWeeks, completeWeeks: completeWeeks, lastDone: lastDone, gamesOf: gamesOf, teamIds: teamIds,
      regWeeks: regWeeks, standingsThrough: standingsThrough, rec: rec, playoffRecord: playoffRecord, parseRec: parseRec, overallRecord: overallRecord,
      remainingSchedule: remainingSchedule, scoringModel: scoringModel,
      simulate: simulate, simulateLite: simulateLite, odds: odds
    },
    brc: {
      league: BRC, seasons: BSEASONS, RKEYS: RKEYS, RURL: RURL, RNAME: RNAME, RPTS: RPTS,
      analysisFor: analysisFor, roundsOf: roundsOf, normTeam: normTeam, assignRank: assignRank,
      picks: picks, resultsThrough: resultsThrough, slotOrder: slotOrder, maxPts: maxPts
    },
    cards: {
      championships: championships, seasons: seasonsPlayed, awards: awardsWon,
      HOF_PATHS: HOF_PATHS, hofTable: hofTable, hof: hofInfo
    }
  };
})();
