/**
 * ============================================================
 *  OFL-NEWSROOM.JS — the writing behind The OFC Gazette and The Hardwood Herald
 *  Turns OFC weeks and BRC rounds into stories, headlines and classifieds.
 *  All math comes from ofl-engine.js; all wording comes from ofl-phrasebook.js.
 *    <script src="ofl-engine.js"></script>
 *    <script src="ofl-phrasebook.js"></script>
 *    <script src="ofl-newsroom.js"></script>
 *  If the phrasebook is missing (or a slot is empty), built-in fallback lines are used.
 *
 *  window.OFL_NEWSROOM
 *    .ofc.editions / .ofc.write(season, week) / .ofc.classifieds(ed)
 *    .brc.editions / .brc.write(edition)      / .brc.classifieds(ed)
 *    .latest('ofc' | 'brc')  → headline summary for the league-page card
 *    .lowercase(el)          → applies House Rules → Never Capitalize to rendered text
 *
 *  Used by: gazette.html, league.html
 * ============================================================
 */
(function () {
  'use strict';
  var E = window.OFL_ENGINE;
  if (!E) { console.warn('ofl-newsroom.js: load ofl-engine.js first'); return; }

  /* ── Shared math & formatting (ofl-engine.js) ─────────── */
  var esc = E.util.esc, num = E.util.num, f2 = E.util.f2, ord = E.util.ord, hex = E.util.hex, hash = E.util.hash, pctTxt = E.util.pctTxt, member = E.util.member;
  var completeWeeks = E.ofc.completeWeeks, gamesOf = E.ofc.gamesOf, standingsThrough = E.ofc.standingsThrough, rec = E.ofc.rec, regWeeks = E.ofc.regWeeks;
  var SEASONS = E.ofc.seasons, PLAYOFF_TEAMS = E.ofc.PLAYOFF_TEAMS;
  var BSEASONS = E.brc.seasons, RKEYS = E.brc.RKEYS, RURL = E.brc.RURL, RNAME = E.brc.RNAME, RPTS = E.brc.RPTS;
  var roundsOf = E.brc.roundsOf, normTeam = E.brc.normTeam, assignRank = E.brc.assignRank;
  var resultsThrough = E.brc.resultsThrough, slotOrder = E.brc.slotOrder, maxPts = E.brc.maxPts;
  function oddsThrough(season, k) { return E.ofc.odds(season, k); }

  var DATA = window.OFL_DATA || {};
  var ROSTER = DATA.masterRoster || [];

  /* ── Writing helpers ──────────────────────────────────── */
  function pick(arr, seed) { return arr[Math.abs(seed) % arr.length]; }
  function poss(team) { return team + (/s$/i.test(team) ? '’' : '’s'); }      // Spiders' / Boknowsbest's
  function cap(t) { return t ? t.charAt(0).toUpperCase() + t.slice(1) : t; }   // sentence start: "The Smokies"
  function verb(team, singular, plural) { return /s$/i.test(team) ? plural : singular; }   // "Spiders beat" / "Ozzies beat"
  function listNames(a) { return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }

  /* ══════════════════════════════════════════════════════════
     THE PHRASEBOOK — wording lives in ofl-phrasebook.js
     Fill-ins: {name}  {name’s} (possessive)  {name:verb|verbs} (agrees with that name)
  ══════════════════════════════════════════════════════════ */
  var PB = window.OFL_PHRASEBOOK || {};
  var HOUSE = PB.house || {};
  var MEMBERS = PB.members || {};
  function clean(a) { return Array.isArray(a) ? a.filter(function (x) { return x != null && String(x).trim(); }) : []; }
  function lines(group, type, slot) { var t = (PB[group] || {})[type]; return clean(t && t[slot]); }
  function gcd(a, b) { while (b) { var t = b; b = a % b; a = t; } return a; }
  /* Step through a pool so consecutive editions land on different lines */
  function stepFor(n) { if (n < 4) return 1; for (var st = 3; st < n; st++) if (gcd(st, n) === 1) return st; return 1; }
  function isPlural(v) { return /s$/i.test(String(v || '').replace(/[^A-Za-z]+$/, '')); }
  var TOKEN_RE = /\{([A-Za-z]+)(?:(['\u2019]s)|:([^|}]*)\|([^}]*))?\}/g;
  function fill(tpl, vars, html) {
    return String(tpl).replace(TOKEN_RE, function (m, name, ps, a, b) {
      if (!vars || !(name in vars)) return '';
      var v = vars[name], str = (v && typeof v === 'object') ? v.v : v;
      str = str == null ? '' : String(str);
      if (a !== undefined) return isPlural(str) ? b : a;
      if (ps) str = poss(str);
      return html ? esc(str) : str;
    });
  }
  /* Owner fill-ins ({ v: name, id: memberId }) sometimes become a Playa Gags nickname */
  function nick(vars, salt) {
    var out = {};
    Object.keys(vars || {}).forEach(function (k) {
      var v = vars[k];
      if (v && typeof v === 'object' && v.id) {
        var nn = clean((MEMBERS[v.id] || {}).nicknames);
        if (nn.length && hash(salt + k + v.id) % 100 < 30) v = { v: nn[hash(salt + v.id) % nn.length], id: v.id };
      }
      out[k] = v;
    });
    return out;
  }
  function Writer(group, edNo) { this.group = group; this.edNo = edNo || 0; this.occ = {}; }
  /* types: one type or [tier, fallbackType]; fb: built-in lines if the phrasebook slot is empty */
  Writer.prototype.say = function (types, slot, vars, html, fb) {
    types = [].concat(types);
    var arr = [], used = types[0];
    for (var i = 0; i < types.length; i++) { arr = lines(this.group, types[i], slot); if (arr.length) { used = types[i]; break; } }
    if (!arr.length) arr = clean([].concat(fb || []));
    if (!arr.length) return '';
    var key = this.group + '.' + used + '.' + slot, occ = this.occ[key] || 0;
    this.occ[key] = occ + 1;
    var n = arr.length, idx = (hash(key) + this.edNo * stepFor(n) + occ) % n;
    var out = fill(arr[idx], nick(vars, key + '|' + this.edNo + '|' + occ), html);
    return (slot === 'headline' || slot === 'kicker') ? out : cap(out);
  };
  /* A full story's wording: kicker, headline, sub, caption, closer */
  Writer.prototype.story = function (types, vars, fb) {
    fb = fb || {};
    return { kicker: this.say(types, 'kicker', vars, false, fb.kicker), head: this.say(types, 'headline', vars, false, fb.head),
      sub: this.say(types, 'sub', vars, true, fb.sub), caption: this.say(types, 'caption', vars, true, fb.caption),
      closer: this.say(types, 'closer', vars, true, []) };
  };
  Writer.prototype.ad = function (type, vars, fb) {
    var group = this.group === 'brc' ? 'brcAds' : 'ofcAds', d = (PB[group] || {})[type] || {};
    var w2 = new Writer(group, this.edNo); w2.occ = this.occ;
    return { k: d._label || fb.k, t: w2.say(type, 'lines', vars, true, fb.t) };
  };
  function withCloser(body, closer) { return closer ? String(body).replace(/<\/p>\s*$/, ' ' + closer + '</p>') : body; }
  /* Playa Gags: sometimes tack a member's one-liner onto a story about them */
  function gagLine(id, edNo, salt, vars) {
    var g = clean((MEMBERS[id] || {}).gags);
    if (!g.length || hash('gag|' + salt + '|' + edNo + '|' + id) % 100 >= 45) return '';
    var nn = clean((MEMBERS[id] || {}).nicknames);
    var v = { owner: vars.owner || '', team: vars.team || '', nick: nn.length ? nn[hash(id + edNo) % nn.length] : (vars.owner || '') };
    return cap(fill(g[(hash(id + salt) + edNo * stepFor(g.length)) % g.length], v, true));
  }

  /* House Rules → Never Capitalize: wrap matches so even all-caps headlines print them lowercase */
  function reEsc(x) { return String(x).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  var LC = clean(HOUSE.lowercase).map(function (x) { return String(x).trim(); }).sort(function (a, b) { return b.length - a.length; });
  var LC_RE = LC.length ? new RegExp('\\b(' + LC.map(reEsc).join('|') + ')\\b', 'gi') : null;
  function lowercaseText(str) { return LC_RE ? String(str).replace(LC_RE, function (m) { return m.toLowerCase(); }) : str; }
  function lowercaseDom(root) {
    if (!LC_RE || !root || !document.createTreeWalker) return;
    var tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), nodes = [];
    while (tw.nextNode()) {
      var nd = tw.currentNode, par = nd.parentNode;
      if (!par || /^(SCRIPT|STYLE|TEXTAREA)$/.test(par.nodeName) || (par.classList && par.classList.contains('ofl-lc'))) continue;
      LC_RE.lastIndex = 0;
      if (LC_RE.test(nd.nodeValue)) nodes.push(nd);
    }
    nodes.forEach(function (nd) {
      var str = nd.nodeValue, frag = document.createDocumentFragment(), last = 0;
      LC_RE.lastIndex = 0;
      str.replace(LC_RE, function (m) {
        var off = arguments[arguments.length - 2];
        if (off > last) frag.appendChild(document.createTextNode(str.slice(last, off)));
        var sp = document.createElement('span'); sp.className = 'ofl-lc'; sp.textContent = m.toLowerCase();
        frag.appendChild(sp); last = off + m.length; return m;
      });
      if (last < str.length) frag.appendChild(document.createTextNode(str.slice(last)));
      nd.parentNode.replaceChild(frag, nd);
    });
  }
  function edNoOf(eds, season, k) {
    for (var i = 0; i < eds.length; i++) if (eds[i].s === season && eds[i].k === k) return i;
    return hash(String(season.year) + k) % 97;
  }

  /* ══════════════════════════════════════════════════════════
     THE OFC GAZETTE
  ══════════════════════════════════════════════════════════ */
  /* Team identity for a given season (historic team names; logo from that name if on file) */
  function ident(mid, teamName) {
    var m = ROSTER.find(function (r) { return r.id === mid; }) || {};
    var e = (m.leagues || []).find(function (l) { return l.leagueKey === 'OFC'; });
    var teams = e ? (e.teams || []) : [];
    var byName = teams.find(function (t) { return t.name === teamName; });
    var cur = teams.length ? teams[teams.length - 1] : null;
    var t = byName || cur || {};
    return { id: mid, owner: m.name || '', team: teamName || t.name || m.name || '?',
      logo: t.logo || (cur && cur.logo) || m.mugshot || '', color: hex(t.primaryColor) || hex(cur && cur.primaryColor) || '#888888' };
  }

  /* All OFC scores in chronological order (for record checks) */
  var ALL_SCORES = (function () {
    var list = [];
    SEASONS.slice().reverse().forEach(function (s) {
      completeWeeks(s).forEach(function (w) {
        gamesOf(w).forEach(function (g) {
          list.push({ y: parseInt(s.year, 10), wk: w.weekNumber, score: g.hs, id: g.h });
          list.push({ y: parseInt(s.year, 10), wk: w.weekNumber, score: g.as, id: g.a });
        });
      });
    });
    return list;
  })();
  function before(y, wk) { return function (x) { return x.y < y || (x.y === y && x.wk < wk); }; }

  /* All-time series between two members through (year, week) */
  function seriesThrough(aId, bId, y, wk) {
    var r = { a: 0, b: 0, t: 0 };
    SEASONS.forEach(function (s) {
      var yr = parseInt(s.year, 10);
      if (yr > y) return;
      completeWeeks(s).forEach(function (w) {
        if (yr === y && w.weekNumber > wk) return;
        gamesOf(w).forEach(function (g) {
          var as_, bs;
          if (g.h === aId && g.a === bId) { as_ = g.hs; bs = g.as; }
          else if (g.h === bId && g.a === aId) { as_ = g.as; bs = g.hs; }
          else return;
          if (as_ > bs) r.a++; else if (bs > as_) r.b++; else r.t++;
        });
      });
    });
    return r;
  }

  /* ══════════════════════════════════════════════════════════
     THE NEWSROOM — turn a week into stories
  ══════════════════════════════════════════════════════════ */
  function writeEdition(season, k) {
    var yr = parseInt(season.year, 10);
    var week = completeWeeks(season).find(function (w) { return w.weekNumber === k; });
    var games = gamesOf(week);
    var pre = standingsThrough(season, k - 1), post = standingsThrough(season, k);
    var oddsPre = oddsThrough(season, k - 1), oddsPost = oddsThrough(season, k);
    var T = {}; post.rows.forEach(function (r) { T[r.id] = ident(r.id, r.name); });
    games.forEach(function (g) { if (g.ht) T[g.h] = ident(g.h, g.ht); if (g.at) T[g.a] = ident(g.a, g.at); });
    var seed = hash(season.year + '-' + k);

    var seasonPrior = ALL_SCORES.filter(function (x) { return x.y === yr && x.wk < k; }).map(function (x) { return x.score; });
    var allPrior = ALL_SCORES.filter(before(yr, k)).map(function (x) { return x.score; });
    var seasonHi = seasonPrior.length ? Math.max.apply(null, seasonPrior) : Infinity;
    // All-time records only count once there's real history (~3 seasons of scores)
    var allHi = allPrior.length >= 400 ? Math.max.apply(null, allPrior) : Infinity;
    var allLo = allPrior.length >= 400 ? Math.min.apply(null, allPrior) : -Infinity;

    var weekScores = [];
    games.forEach(function (g) { weekScores.push({ id: g.h, s: g.hs, opp: g.a, os: g.as }, { id: g.a, s: g.as, opp: g.h, os: g.hs }); });
    weekScores.sort(function (a, b) { return b.s - a.s; });

    var W8 = new Writer('ofc', edNoOf(EDITIONS, season, k));
    var stories = [];
    var curGame = null;   // set while writing a game's stories; null for league-level stories
    /* types: phrasebook story type(s); vars: fill-ins; fb: built-in fallback wording */
    function add(score, key, types, vars, fb, body, photoId) {
      var t = W8.story(types, vars, fb);
      stories.push({ score: score, key: key, game: curGame || ('L-' + key), team: photoId,
        kicker: t.kicker, head: t.head, sub: t.sub, body: withCloser(body, t.closer), photo: photoId, caption: t.caption });
    }
    function own(id) { return { v: T[id].owner, id: id }; }
    function oddsLine(id) {
      var a = oddsPre[id], b = oddsPost[id];
      if (a == null || b == null) return '';
      var d = Math.round((b - a) * 100);
      if (Math.abs(d) < 5) return '';
      return ' ' + esc(cap(poss(T[id].team))) + ' playoff odds ' + (d > 0 ? 'climbed' : 'sank') + ' from ' + pctTxt(a) + '% to ' + pctTxt(b) + '%.';
    }
    function gameBody(g, Wid, Lid, ws, ls) {
      var W = T[Wid], L = T[Lid], pw = post.map[Wid], pl = post.map[Lid];
      return '<p><b>' + esc(cap(W.team)) + '</b> (' + esc(W.owner) + ') ' + verb(W.team, 'beat', 'beat') + ' <b>' + esc(L.team) + '</b> (' + esc(L.owner) + ') ' +
        f2(ws) + '–' + f2(ls) + ' in Week ' + k + '. ' +
        esc(cap(W.team)) + ' ' + verb(W.team, 'moves', 'move') + ' to ' + rec(pw) + ' (' + ord(pw.rank) + ' place), while ' +
        esc(L.team) + ' ' + verb(L.team, 'falls', 'fall') + ' to ' + rec(pl) + ' (' + ord(pl.rank) + ').' + oddsLine(Wid) + oddsLine(Lid) + '</p>';
    }

    games.forEach(function (g) {
      if (g.hs === g.as) return;
      curGame = g.h + '|' + g.a;
      var hW = g.hs > g.as, Wid = hW ? g.h : g.a, Lid = hW ? g.a : g.h, ws = Math.max(g.hs, g.as), ls = Math.min(g.hs, g.as);
      var W = T[Wid], L = T[Lid], margin = ws - ls;
      var pW = pre.map[Wid], pL = pre.map[Lid];
      var pctW = pW.gp ? (pW.w + pW.t / 2) / pW.gp : 0.5, pctL = pL.gp ? (pL.w + pL.t / 2) / pL.gp : 0.5;
      var body = gameBody(g, Wid, Lid, ws, ls);
      var v = { W: W.team, L: L.team, Wo: own(Wid), Lo: own(Lid), ws: f2(ws), ls: f2(ls), margin: f2(margin), marginR: Math.round(margin),
        week: k, year: season.year, Wrec: rec(post.map[Wid]), Lrec: rec(post.map[Lid]) };
      function vx(extra) { var o = {}; Object.keys(v).forEach(function (x) { o[x] = v[x]; }); Object.keys(extra).forEach(function (x) { o[x] = extra[x]; }); return o; }

      if (ws > allHi) add(96, 'hi' + Wid, 'allTimeHigh', vx({ old: f2(allHi) }), { kicker: 'Record Book', head: '{W} {W:sets|set} All-Time OFC Record With {ws}' }, body, Wid);
      else if (ws > seasonHi && k > 1) add(60, 'shi' + Wid, 'seasonHigh', v, { kicker: 'Season High', head: '{W} {W:posts|post} Season-Best {ws}' }, body, Wid);

      if (ls < allLo) add(90, 'lo' + Lid, 'allTimeLow', vx({ old: f2(allLo) }), { kicker: 'Record Book', head: 'New All-Time Low: {ls}' }, body, Lid);

      if (k >= 4 && pctL - pctW >= 0.3) add(44 + (pctL - pctW) * 35, 'up' + Wid, 'upset', vx({ Wrec: rec(pW), Lrec: rec(pL) }),
        { kicker: 'Upset Alert', head: 'Stunner! {W} {W:topples|topple} {L}' }, body, Wid);

      if (margin >= 40) add(46 + Math.min(20, (margin - 40) * 0.6), 'bo' + Wid, margin >= 60 ? ['blowoutBig', 'blowout'] : 'blowout', v,
        { kicker: 'Blowout', head: '{W} {W:buries|bury} {L} By {marginR}' }, body, Wid);

      if (margin < 3) add(58 - margin * 4, 'nb' + Wid, 'photoFinish', v, { kicker: 'Photo Finish', head: '{W} {W:escapes|escape} By {margin}' }, body, Wid);

      var ps = pre.map[Lid].streak;
      if (ps && ps.type === 'W' && ps.n >= 4) add(42 + ps.n, 'sn' + Lid, 'streakSnapped', vx({ streak: ps.n }),
        { kicker: 'Streak Snapped', head: '{W} {W:ends|end} {L’s} {streak}-Game Win Streak' }, body, Wid);
      var pw2 = pre.map[Wid].streak;
      if (pw2 && pw2.type === 'L' && pw2.n >= 3) add(40 + pw2.n, 'sk' + Wid, 'skidOver', vx({ streak: pw2.n }),
        { kicker: 'Skid Over', head: '{W} {W:snaps|snap} {streak}-Game Losing Streak' }, body, Wid);
      var nw = post.map[Wid].streak;
      if (nw && nw.type === 'W' && nw.n >= 5) add(38 + nw.n, 'hs' + Wid, 'hotStreak', vx({ streak: nw.n, others: post.rows.length - 1 }),
        { kicker: 'Hot Streak', head: '{W} {W:wins|win} {streak} Straight' }, body, Wid);

      add(10 + margin / 10, 'g' + Wid, 'gameRecap', v, { kicker: 'Week {week}', head: '{W} {W:beats|beat} {L}' }, body, Wid);
    });

    // League-level stories
    curGame = null;
    var lead0 = pre.rows[0], lead1 = post.rows[0];
    if (k >= 2 && lead0 && lead1 && lead0.id !== lead1.id) {
      var NL = T[lead1.id];
      add(50, 'lead' + lead1.id, 'newLeader', { team: NL.team, owner: own(lead1.id), rec: rec(lead1), pf: f2(lead1.pf), old: T[lead0.id].team, week: k, year: season.year },
        { kicker: 'Standings', head: 'New King Of The Hill: {team}' },
        '<p><b>' + esc(NL.team) + '</b> sit atop the OFC after Week ' + k + ', unseating ' + esc(T[lead0.id].team) + '. ' +
        'Points for: ' + f2(lead1.pf) + '.' + oddsLine(lead1.id) + '</p>', lead1.id);
    }
    var swings = post.rows.map(function (r) { return { id: r.id, d: (oddsPost[r.id] || 0) - (oddsPre[r.id] || 0) }; })
      .sort(function (a, b) { return Math.abs(b.d) - Math.abs(a.d); });
    if (swings[0] && Math.abs(swings[0].d) >= 0.2 && k < regWeeks(season)) {
      var S = T[swings[0].id], up = swings[0].d > 0;
      add(47, 'odds' + S.id, up ? 'oddsUp' : 'oddsDown',
        { team: S.team, owner: own(S.id), from: pctTxt(oddsPre[S.id]), to: pctTxt(oddsPost[S.id]), swing: Math.round(Math.abs(swings[0].d) * 100), week: k, year: season.year },
        { kicker: 'Playoff Picture', head: up ? '{team’s} Playoff Hopes Soar' : '{team’s} Playoff Hopes Crater' },
        '<p>After Week ' + k + ', <b>' + esc(S.team) + '</b> ' + (up ? 'jumped' : 'dropped') + ' from ' + pctTxt(oddsPre[S.id]) + '% to ' + pctTxt(oddsPost[S.id]) +
        '% to make the playoffs, based on 10,000 simulations of the rest of the ' + season.year + ' regular season.</p>', S.id);
    }
    if (season.isFinal && k === regWeeks(season)) {
      var champ = post.rows[0], field = post.rows.slice(0, PLAYOFF_TEAMS).map(function (r) { return T[r.id].team; });
      add(70, 'rs' + champ.id, 'regSeasonFinal', { team: T[champ.id].team, owner: own(champ.id), rec: rec(champ), pf: f2(champ.pf), field: listNames(field), year: season.year },
        { kicker: 'Regular Season Final', head: '{team} {team:claims|claim} The #1 Seed' },
        '<p><b>' + esc(T[champ.id].team) + '</b> finish the regular season ' + rec(champ) + ' with ' + f2(champ.pf) + ' points. The playoff field: ' +
        post.rows.slice(0, PLAYOFF_TEAMS).map(function (r, i) { return '#' + (i + 1) + ' ' + esc(T[r.id].team) + ' (' + rec(r) + ')'; }).join(', ') + '.</p>', champ.id);
    }

    stories.sort(function (a, b) { return b.score - a.score; });
    // One story per game, and no team featured twice
    var seenGame = {}, seenTeam = {}, picked = [];
    stories.forEach(function (st) {
      if (picked.length >= 4 || seenGame[st.game] || seenTeam[st.team]) return;
      seenGame[st.game] = 1; seenTeam[st.team] = 1; picked.push(st);
    });
    picked.forEach(function (st, i) {   // Playa Gags
      var gl = st.team && T[st.team] ? gagLine(st.team, W8.edNo, 'ofc' + i, { owner: T[st.team].owner, team: T[st.team].team }) : '';
      if (gl) st.body = withCloser(st.body, gl);
    });

    return { season: season, k: k, W8: W8, games: games, pre: pre, post: post, oddsPre: oddsPre, oddsPost: oddsPost, T: T,
      stories: picked, weekScores: weekScores, seed: seed, allHi: allHi };
  }

  /* ── Classifieds ──────────────────────────────────────── */
  function classifieds(ed) {
    var T = ed.T, ws = ed.weekScores, ads = [], s = ed.seed, w = ed.W8 || new Writer('ofc', 0), k = ed.k;
    function own(id) { return { v: T[id].owner, id: id }; }
    var low = ws[ws.length - 1], high = ws[0];
    var hard = ws.filter(function (x) { return x.s < x.os; })[0];        // highest score that still lost
    var worst = ed.games.map(function (g) { return { L: g.hs < g.as ? g.h : g.a, W: g.hs < g.as ? g.a : g.h, m: Math.abs(g.hs - g.as) }; }).sort(function (a, b) { return b.m - a.m; })[0];
    var leader = ed.post.rows[0], last = ed.post.rows[ed.post.rows.length - 1];
    if (low) ads.push(w.ad('wanted', { team: T[low.id].team, owner: own(low.id), pts: f2(low.s), week: k }, { k: 'Wanted', t: 'Points. Any points. Contact {team} ({pts} this week).' }));
    if (hard && hard.s > ws[Math.floor(ws.length / 2)].s) ads.push(w.ad('lost', { team: T[hard.id].team, owner: own(hard.id), pts: f2(hard.s), opp: T[hard.opp].team },
      { k: 'Lost', t: 'A perfectly good {pts}-point week. Last seen in a loss to {opp}. Contact {owner}.' }));
    if (worst) ads.push(w.ad('forSale', { team: T[worst.L].team, owner: own(worst.L), margin: f2(worst.m) }, { k: 'For Sale', t: 'Game plan, used once, did not work. Ask for {owner}.' }));
    if (high) ads.push(w.ad('services', { team: T[high.id].team, owner: own(high.id), pts: f2(high.s) }, { k: 'Services', t: '{team} now offering scoring lessons. {pts} references available.' }));
    if (leader) ads.push(w.ad('realEstate', { team: T[leader.id].team, owner: own(leader.id), rec: rec(leader) }, { k: 'Real Estate', t: 'First place. Prime view. Currently occupied by {team}.' }));
    if (last && last.l > last.w) ads.push(w.ad('helpWanted', { team: T[last.id].team, owner: own(last.id), rec: rec(last) }, { k: 'Help Wanted', t: 'Head coach. Must be willing to relocate out of last place. Apply to {team} ({rec}).' }));
    var dead = ed.post.rows.filter(function (r) { return (ed.oddsPre[r.id] || 0) >= 0.01 && (ed.oddsPost[r.id] || 0) < 0.01; })[0];
    if (dead && k < regWeeks(ed.season)) ads.push(w.ad('obituary', { team: T[dead.id].team, owner: own(dead.id), week: k, year: ed.season.year }, { k: 'Obituary', t: 'Here lies {team’s} season. {owner} asks for privacy.' }));
    var hot = ed.post.rows.filter(function (r) { return r.streak && r.streak.type === 'W' && r.streak.n >= 3; }).sort(function (a, b) { return b.streak.n - a.streak.n; })[0];
    if (hot) ads.push(w.ad('personals', { team: T[hot.id].team, owner: own(hot.id), streak: hot.streak.n }, { k: 'Personals', t: '{team}, {streak} straight wins, seeks worthy opponent.' }));
    if (ws.length) {
      var avg = ws.reduce(function (a, x) { return a + x.s; }, 0) / ws.length;
      ads.push(w.ad('weather', { avg: f2(avg), high: f2(high.s), low: f2(low.s), week: k }, { k: 'Weather', t: 'Week {week}: high {high}, low {low}.' }));
    }
    // three per edition, rotating which ads lead
    var out = [];
    for (var i = 0; i < ads.length && out.length < 3; i++) out.push(ads[(i + s) % ads.length]);
    return out;
  }


  /* ══════════════════════════════════════════════════════════
   THE HARDWOOD HERALD — BRC bracket challenge
   Seasons with points by round get one edition per round;
   older seasons get a single Final Edition.
  ══════════════════════════════════════════════════════════ */
  var BLUE = '#1b2b8f', BRC_FIRST = 2005;
  var BRC = E.brc.league;
  var AWARDS = (BRC && BRC.awards) || {};
  function bident(row) {
    var m = member(row.memberId);
    return { id: row.memberId, owner: row.owner || m.name || '', team: row.bracketName || row.teamName || row.owner || '?', logo: m.mugshot || '', color: BLUE };
  }
  function leaguePhoto() { return { logo: (BRC && BRC.logo) || '', team: 'BRC', owner: '', color: BLUE }; }
  function titlesThrough(mid, y) { return BSEASONS.filter(function (s) { return s.championMemberId === mid && parseInt(s.year, 10) <= y; }).length; }
  function seasonBefore(y) { return BSEASONS.filter(function (s) { return parseInt(s.year, 10) < y; })[0] || null; }

  /* ── Round edition ─────────────────────────────────────── */
  function writeBRCRound(season, r) {
    var an = E.brc.analysisFor(season), yr = parseInt(season.year, 10), seed = hash('brc' + season.year + '-' + r);
    var rows = (season.standings || []).map(function (row) {
      var pbr = (row.pointsByRound || []).map(num), cbr = (row.picksByRound || []).map(num), cum = 0, prev = 0;
      for (var i = 0; i <= r; i++) { cum += pbr[i] || 0; if (i < r) prev += pbr[i] || 0; }
      return { id: row.memberId, t: bident(row), pts: pbr[r] || 0, correct: cbr[r] || 0, cum: cum, prev: prev, champ: row.predictedChampion || '' };
    });
    var post = assignRank(rows, 'cum', 'rank'), pre = assignRank(rows, 'prev', 'prevRank');
    var M = {}; rows.forEach(function (x) { M[x.id] = x; });
    function owner(id) { return M[id] ? M[id].t.owner : (member(id).name || '?'); }
    var games = [], out = {};
    if (an) {
      var PK = E.brc.picks(an), PICKS = PK.slots, CHAMP = PK.champ;
      rows.forEach(function (x) { if (CHAMP[x.id]) x.champ = CHAMP[x.id]; });
      var outBefore = {};
      resultsThrough(an, r).forEach(function (g) {
        out[normTeam(g.l)] = RNAME[g.ri];
        if (g.ri < r) outBefore[normTeam(g.l)] = 1;
        if (g.ri === r) games.push(g);
      });
      games.sort(slotOrder);
      games.forEach(function (g) {
        var pk = PICKS[g.slot] || [];
        g.pickers = pk.filter(function (p) { return normTeam(p.team) === normTeam(g.w); }).map(function (p) { return p.id; });
        g.nPick = pk.length;
      });
      var lead = post[0].cum, leadPrev = pre[0].prev;
      rows.forEach(function (x) {
        x.max = maxPts(an, x.id, r, x.cum, out); x.alive = x.max >= lead;
        x.wasAlive = r === 0 ? true : maxPts(an, x.id, r - 1, x.prev, outBefore) >= leadPrev;
      });
    }
    var RN = RNAME[r], nG = games.length, stories = [];
    var WB = new Writer('brc', edNoOf(BEDITIONS, season, r));
    /* types: phrasebook story type(s); vars: fill-ins; fb: built-in fallback wording */
    function add(score, game, team, types, vars, fb, body, photo) {
      var t = WB.story(types, vars, fb);
      stories.push({ score: score, game: game || ('L' + stories.length), team: team, kicker: t.kicker, head: t.head, sub: t.sub,
        body: withCloser(body, t.closer), photo: photo, caption: t.caption });
    }
    function nm(x) { return '<b>' + esc(x.t.team) + '</b> (' + esc(x.t.owner) + ')'; }
    function standLine(x) { return esc(x.t.team) + ' ' + verb(x.t.team, 'sits', 'sit') + ' ' + ord(x.rank) + ' with ' + x.cum + ' points.'; }
    function whoHad(ids) { return listNames(ids.map(function (id) { return '<b>' + esc(owner(id)) + '</b>'; })); }
    function bv(x, extra) {   // a bracket's fill-ins
      var o = { team: x.t.team, owner: { v: x.t.owner, id: x.id }, pts: x.pts, cum: x.cum, round: RN, year: season.year };
      Object.keys(extra || {}).forEach(function (k2) { o[k2] = extra[k2]; });
      return o;
    }
    var FAMILY = normTeam(HOUSE.familyTeam || ''), RIVALS = clean(HOUSE.rivals).map(normTeam);

    /* Game stories */
    games.forEach(function (g) {
      var diff = g.wsd - g.lsd, scored = g.ws > 0 || g.ls > 0, had = g.pickers.length;
      var line = '<b>' + esc(g.w) + '</b> (' + g.wsd + ' seed) beat <b>' + esc(g.l) + '</b> (' + g.lsd + ' seed)' + (scored ? ' ' + g.ws + '&ndash;' + g.ls : '') + ' in the ' + RN + '. ';
      var pickTxt = had === 0 ? 'Not one BRC bracket had ' + esc(g.w) + ' winning this game.' :
        (had === g.nPick ? 'All ' + had + ' brackets had it.' : had + ' of ' + g.nPick + ' brackets had ' + esc(g.w) + ': ' + whoHad(g.pickers) + '.');
      var gv = { w: g.w, l: g.l, wsd: g.wsd, lsd: g.lsd, ws: scored ? g.ws : '', ls: scored ? g.ls : '', diff: diff, margin: scored ? g.ws - g.ls : '', round: RN, year: season.year };
      function gx(extra) { var o = {}; Object.keys(gv).forEach(function (x) { o[x] = gv[x]; }); Object.keys(extra || {}).forEach(function (x) { o[x] = extra[x]; }); return o; }
      var busted = rows.filter(function (x) { return x.champ && normTeam(x.champ) === normTeam(g.l); });
      if (busted.length) {
        var one = busted.length === 1 ? busted[0] : null;
        add(48 + busted.length * 6 + (5 - r) * 2, g.slot, one ? one.id : null, one ? 'bustOne' : 'bustMany',
          one ? gx({ team: one.t.team, owner: { v: one.t.owner, id: one.id } }) : gx({ count: busted.length, owners: listNames(busted.map(function (x) { return x.t.owner; })) }),
          one ? { kicker: 'Bracket Buster', head: '{l} Loss Busts {team’s} Title Pick' } : { kicker: 'Bracket Buster', head: '{l} Goes Down, Takes {count} Brackets With It' },
          '<p>' + line + (one ? nm(one) + ' had' : whoHad(busted.map(function (x) { return x.id; })) + ' all had') + ' ' + esc(g.l) + ' cutting down the nets. ' + pickTxt + '</p>',
          one ? one.t : leaguePhoto());
      }
      if (diff >= 4) {
        var sc = 30 + diff * 2.5;
        if (had >= 1 && had <= 2) {
          var solo = had === 1 ? M[g.pickers[0]] : null;
          add(sc + 10, g.slot, solo ? solo.id : null, solo ? 'calledItSolo' : 'calledItDuo',
            solo ? gx({ team: solo.t.team, owner: { v: solo.t.owner, id: solo.id } }) : gx({ owners: listNames(g.pickers.map(owner)) }),
            { kicker: 'Called It', head: solo ? 'Only {owner} Saw {w} Coming' : 'Only Two Brackets Saw {w} Coming' },
            '<p>' + line + pickTxt + '</p>', solo ? solo.t : leaguePhoto());
        } else {
          add(sc, g.slot, null, 'upset', gx({ pickers: had }), { kicker: 'Upset Alert', head: '{w} Stuns {l}' }, '<p>' + line + pickTxt + '</p>', leaguePhoto());
        }
      }
      if (scored && g.ws - g.ls <= 2) add(28, g.slot, null, 'buzzer', gv, { kicker: 'Buzzer Beater', head: '{w} Survives {l} By {margin}' }, '<p>' + line + pickTxt + '</p>', leaguePhoto());

      /* House Rules + Playa Gags: rivals, the family team, members' college teams */
      var nw = normTeam(g.w), nl = normTeam(g.l);
      var hv = { w: g.w, l: g.l, wsd: g.wsd, lsd: g.lsd, ws: gv.ws, ls: gv.ls, round: RN, year: season.year };
      function hx(extra) { var o = {}; Object.keys(hv).forEach(function (x) { o[x] = hv[x]; }); Object.keys(extra).forEach(function (x) { o[x] = extra[x]; }); return o; }
      if (RIVALS.indexOf(nl) >= 0) add(52, 'rv' + g.slot, null, 'rivalLoss', hx({ rival: g.l, opp: g.w }), { kicker: 'Breaking News', head: '{rival} Goes Home' }, '<p>' + line + '</p>', leaguePhoto());
      if (RIVALS.indexOf(nw) >= 0) add(20, 'rv' + g.slot, null, 'rivalWin', hx({ rival: g.w, opp: g.l }), { kicker: 'Unfortunate News', head: '{rival} Advances. Unfortunately.' }, '<p>' + line + '</p>', leaguePhoto());
      if (FAMILY && FAMILY === nw) add(36, 'fm' + g.slot, null, 'familyWin', hx({ school: g.w, opp: g.l }), { kicker: 'War Eagle', head: 'War Eagle! {school} Beats {opp}' }, '<p>' + line + '</p>', leaguePhoto());
      if (FAMILY && FAMILY === nl) add(34, 'fm' + g.slot, null, 'familyLoss', hx({ school: g.l, opp: g.w }), { kicker: 'Sad News', head: '{school} Falls To {opp}' }, '<p>' + line + '</p>', leaguePhoto());
      Object.keys(MEMBERS).forEach(function (id) {
        var sch = normTeam(MEMBERS[id].school || '');
        if (!sch || (sch !== nw && sch !== nl)) return;
        var x = M[id], fanName = x ? x.t.owner : (member(id).name || MEMBERS[id].name || '');
        var won = sch === nw, photo = x ? x.t : { logo: member(id).mugshot || '', team: fanName, owner: fanName, color: BLUE };
        add(won ? 32 : 38, 'fan' + id + g.slot, id, won ? 'fanWin' : 'fanLoss',
          hx({ fan: { v: fanName, id: id }, team: x ? x.t.team : '', school: won ? g.w : g.l, opp: won ? g.l : g.w }),
          won ? { kicker: 'Fan Watch', head: '{school} Wins, And {fan} Will Not Shut Up About It' } : { kicker: 'Fan Watch', head: '{school} Is Out, And {fan} Is Inconsolable' },
          '<p>' + line + '</p>', photo);
      });
    });

    /* Best round */
    var byPts = rows.slice().sort(function (a, b) { return b.pts - a.pts; }), top = byPts[0];
    var tops = rows.filter(function (x) { return x.pts === top.pts; });
    var perfect = nG > 0 && top.correct >= nG && tops.length === 1;
    if (top && top.pts > 0) add(perfect ? 62 : 40, null, tops.length === 1 ? top.id : null,
      tops.length === 1 ? (perfect ? 'perfectRound' : 'roundWinner') : 'roundTie',
      tops.length === 1 ? bv(top, { games: nG }) : { count: tops.length, pts: top.pts, round: RN, year: season.year },
      tops.length === 1 ? (perfect ? { kicker: 'Perfect Round', head: 'Perfect! {team} {team:runs|run} The Table' } : { kicker: 'Round Winner', head: '{team} {team:wins|win} The {round}' })
        : { kicker: 'Round Winner', head: '{count}-Way Tie For Best {round}' },
      '<p>' + listNames(tops.map(nm)) + ' scored ' + top.pts + ' in the ' + RN +
        (top.correct && tops.length === 1 ? ' on ' + top.correct + ' correct pick' + (top.correct > 1 ? 's' : '') + (nG ? ' of ' + nG : '') : '') + '. ' +
        (tops.length === 1 ? standLine(top) : '') + '</p>',
      tops.length === 1 ? top.t : leaguePhoto());

    /* Standings stories */
    var leaders = post.filter(function (x) { return x.rank === 1; }), L1 = leaders[0], second = post.filter(function (x) { return x.rank > 1; })[0];
    var prevLeaders = pre.filter(function (x) { return x.prevRank === 1; });
    var gap = second ? L1.cum - second.cum : 0;
    var lv = bv(L1, { pts: L1.cum, gap: gap, second: second ? second.t.team : 'the field', from: ord(L1.prevRank) });
    if (leaders.length >= 2) add(46, null, null, 'logjam', { count: leaders.length, pts: L1.cum, round: RN, year: season.year }, { kicker: 'Logjam', head: '{count} Brackets Tied For First' },
      '<p>' + listNames(leaders.map(nm)) + ' are tied atop the BRC at ' + L1.cum + ' points after the ' + RN + '.</p>', leaguePhoto());
    else if (r === 0) add(45, null, L1.id, 'openingLeader', lv, { kicker: 'Standings', head: '{team} {team:leads|lead} After Opening Round' },
      '<p>' + nm(L1) + ' leads the field after the ' + RN + ' with ' + L1.cum + ' points' + (second ? ', ' + gap + ' ahead of ' + esc(second.t.team) : '') + '.</p>', L1.t);
    else if (prevLeaders.indexOf(L1) < 0) add(55, null, L1.id, 'newLeader', lv, { kicker: 'New Leader', head: 'New No. 1: {team}' },
      '<p>' + nm(L1) + ' climbed from ' + ord(L1.prevRank) + ' to first after the ' + RN + ', unseating ' + listNames(prevLeaders.map(function (x) { return esc(x.t.team); })) +
        '. Lead: ' + gap + ' point' + (gap === 1 ? '' : 's') + '.</p>', L1.t);
    else add(prevLeaders.length > 1 ? 48 : 26, null, L1.id, prevLeaders.length > 1 ? 'breaksAway' : 'stillOnTop', lv,
      { kicker: 'Standings', head: prevLeaders.length > 1 ? '{team} {team:breaks|break} Away' : '{team} {team:is|are} Still On Top' },
      '<p>' + nm(L1) + ' leads the BRC with ' + L1.cum + ' points after the ' + RN + '.</p>', L1.t);

    if (r >= 1) {
      var moves = rows.map(function (x) { return { x: x, d: x.prevRank - x.rank }; }).sort(function (a, b) { return b.d - a.d; });
      var up = moves[0], dn = moves[moves.length - 1];
      if (up.d >= 3) add(36 + up.d * 2, null, up.x.id, 'bigMover', bv(up.x, { spots: up.d, from: ord(up.x.prevRank), to: ord(up.x.rank) }),
        { kicker: 'Big Mover', head: '{team} {team:climbs|climb} {spots} Spots' },
        '<p>A ' + up.x.pts + '-point ' + RN + ' did it for ' + nm(up.x) + '. ' + standLine(up.x) + '</p>', up.x.t);
      if (dn.d <= -3) add(34 - dn.d * 2, null, dn.x.id, 'freefall', bv(dn.x, { spots: -dn.d, from: ord(dn.x.prevRank), to: ord(dn.x.rank) }),
        { kicker: 'Freefall', head: '{team} {team:tumbles|tumble} {spots} Spots' },
        '<p>Only ' + dn.x.pts + ' points in the ' + RN + ' for ' + nm(dn.x) + '. ' + standLine(dn.x) + '</p>', dn.x.t);
    }
    var alive = an ? rows.filter(function (x) { return x.alive; }) : [];
    var gone = an && r < 5 ? rows.filter(function (x) { return x.wasAlive && !x.alive; }) : [];
    if (an && r < 5) {
      if (alive.length === 1) add(70, null, alive[0].id, 'clinched', bv(alive[0], { pts: alive[0].cum, left: 5 - r }),
        { kicker: 'Clinched', head: '{team} {team:clinches|clinch} The {year} BRC' },
        '<p>With ' + (5 - r) + ' round' + (5 - r === 1 ? '' : 's') + ' still to play, ' + nm(alive[0]) +
          ' has locked up the title. No other bracket can reach ' + alive[0].cum + ' points.</p>', alive[0].t);
      else if (gone.length) add(30 + gone.length * 2, null, gone.length === 1 ? gone[0].id : null, gone.length === 1 ? 'eliminatedOne' : 'eliminatedMany',
        gone.length === 1 ? bv(gone[0], { alive: alive.length }) : { count: gone.length, alive: alive.length, year: season.year },
        { kicker: 'Eliminated', head: gone.length === 1 ? '{team} Mathematically Eliminated' : '{count} Brackets Mathematically Eliminated' },
        '<p>' + listNames(gone.map(nm)) + ' can no longer catch first place, even if every remaining pick hits.</p>', gone.length === 1 ? gone[0].t : leaguePhoto());
    }

    /* Championship */
    var ch = null, ru = null;
    if (r === 5) {
      ch = M[season.championMemberId] || L1;
      ru = M[season.runnerUpMemberId] || second;
      var fin = games[0], fsw = season.finalScoreWinner, fsl = season.finalScoreLoser;
      var margin = ru ? ch.cum - ru.cum : 0, tn = titleNote(ch.id, ch.t.owner, yr);
      var hadIt = fin && ch.champ && normTeam(ch.champ) === normTeam(fin.w);
      var cs = WB.story('champion', bv(ch, { pts: ch.cum, award: AWARDS.champion || 'title', margin: margin }), { kicker: 'Champion', head: '{owner} Cuts Down The Nets' });
      stories.push({ score: 120, game: 'L-champ', team: ch.id, kicker: tn.kicker === 'Champion' ? cs.kicker : tn.kicker, head: cs.head,
        sub: (fin ? esc(fin.w) + ' beats ' + esc(fin.l) + (fsw && fsl ? ' ' + fsw + '&ndash;' + fsl : '') + ', and ' : '') + esc(ch.t.team) + ' ' + verb(ch.t.team, 'takes', 'take') + ' the ' + esc(AWARDS.champion || 'title') + '.',
        body: withCloser('<p>' + nm(ch) + ' won the ' + season.year + ' BRC with ' + ch.cum + ' points' + (ru ? ', ' + margin + ' ahead of ' + nm(ru) : '') + '. ' +
          (hadIt ? esc(ch.t.owner) + ' had ' + esc(fin.w) + ' winning it all from the start. ' : '') + 'It&rsquo;s ' + tn.note + '.</p>', cs.closer),
        photo: ch.t, caption: cs.caption });
      if (ru) add(50, null, ru.id, 'runnerUp', bv(ru, { pts: ru.cum, margin: margin, award: AWARDS.runnerUp || 'runner-up prize' }),
        { kicker: 'Runner-Up', head: '{team} {team:settles|settle} For Second' },
        '<p>' + nm(ru) + ' finished second with ' + ru.cum + ' points and takes home the ' + esc(AWARDS.runnerUp || 'runner-up prize') + '.</p>', ru.t);
    }

    var picked = pickStories(stories);
    picked.forEach(function (st, i) {   // Playa Gags
      var x = st.team && M[st.team];
      var gl = x ? gagLine(st.team, WB.edNo, 'brc' + i, { owner: x.t.owner, team: x.t.team }) : '';
      if (gl) st.body = withCloser(st.body, gl);
    });
    return { season: season, r: r, an: an, rows: rows, post: post, games: games, out: out, alive: alive, gone: gone, M: M, seed: seed, ch: ch, ru: ru, WB: WB, stories: picked };
  }

  function pickStories(stories) {
    stories.sort(function (a, b) { return b.score - a.score; });
    var seenGame = {}, seenTeam = {}, picked = [];
    stories.forEach(function (st) {
      if (picked.length >= 4 || seenGame[st.game] || (st.team && seenTeam[st.team])) return;
      seenGame[st.game] = 1; if (st.team) seenTeam[st.team] = 1; picked.push(st);
    });
    return picked;
  }

  function titleNote(mid, ownerName, yr) {
    var n = titlesThrough(mid, yr);
    var prior = BSEASONS.filter(function (s) { return parseInt(s.year, 10) < yr && s.championMemberId === mid; }).map(function (s) { return parseInt(s.year, 10); });
    if (n <= 1) return { kicker: 'First Title', note: 'the first BRC title for ' + esc(ownerName) };
    var streak = 1, y = yr, prev;
    while ((prev = seasonBefore(y)) && prev.championMemberId === mid) { streak++; y = parseInt(prev.year, 10); }
    if (streak >= 2) return { kicker: streak === 2 ? 'Back-to-Back' : 'Dynasty', note: (streak === 2 ? 'back-to-back titles' : streak + ' straight titles') + ' and title No. ' + n + ' for ' + esc(ownerName) };
    return { kicker: 'Champion', note: 'title No. ' + n + ' for ' + esc(ownerName) + ', the first since ' + prior[0] };
  }

  /* ── Final edition (archived seasons without round data) ── */
  function writeBRCFinal(season) {
    var yr = parseInt(season.year, 10), seed = hash('brcF' + season.year);
    var WB = new Writer('brc', edNoOf(BEDITIONS, season, 'final'));
    var rows = (season.standings || []).map(function (row) {
      return { id: row.memberId, t: bident(row), cum: num(row.totalPoints), correct: num(row.correctPicks), champ: row.predictedChampion || '' };
    });
    var post = assignRank(rows, 'cum', 'rank'), M = {};
    rows.forEach(function (x) { M[x.id] = x; });
    var ch = M[season.championMemberId] || post[0], ru = M[season.runnerUpMemberId] || post[1] || null, last = post[post.length - 1];
    var stories = [];
    function add(score, team, types, vars, fb, body, photo, kickerOverride) {
      var t = WB.story(types, vars, fb);
      stories.push({ score: score, game: 'L' + stories.length, team: team, kicker: kickerOverride || t.kicker, head: t.head, sub: t.sub,
        body: withCloser(body, t.closer), photo: photo, caption: t.caption });
    }
    function nm(x) { return '<b>' + esc(x.t.team) + '</b> (' + esc(x.t.owner) + ')'; }
    function bv(x, extra) {
      var o = { team: x.t.team, owner: { v: x.t.owner, id: x.id }, pts: x.cum, year: season.year };
      Object.keys(extra || {}).forEach(function (k2) { o[k2] = extra[k2]; });
      return o;
    }
    var margin = ru ? ch.cum - ru.cum : 0, tn = titleNote(ch.id, ch.t.owner, yr);
    var priorWins = BSEASONS.filter(function (s) { return parseInt(s.year, 10) < yr; }).map(function (s) {
      var w = (s.standings || []).find(function (x) { return x.memberId === s.championMemberId; }); return w ? num(w.totalPoints) : 0; });
    var record = priorWins.length >= 3 && ch.cum > Math.max.apply(null, priorWins);
    var cs = WB.story('champion', bv(ch, { award: AWARDS.champion || 'title', margin: margin }), { kicker: 'Champion', head: '{owner} Cuts Down The Nets' });
    stories.push({ score: 100, game: 'L-champ', team: ch.id, kicker: tn.kicker === 'Champion' ? cs.kicker : tn.kicker, head: cs.head,
      sub: ch.cum + ' points' + (ru ? (margin <= 3 ? ', and by a whisker: ' + margin + ' ahead of ' + esc(ru.t.team) + '.' : ', ' + margin + ' clear of the field.') : '.'),
      body: withCloser('<p>' + nm(ch) + ' won the ' + season.year + ' BRC with ' + ch.cum + ' points' + (ch.correct ? ' and ' + ch.correct + ' correct picks' : '') +
        (ru ? ', finishing ' + margin + ' ahead of ' + nm(ru) : '') + '. It&rsquo;s ' + tn.note + '.' + (record ? ' The highest winning total in BRC history.' : '') + '</p>', cs.closer),
      photo: ch.t, caption: cs.caption });
    if (ru) add(50, ru.id, 'runnerUp', bv(ru, { margin: margin, award: AWARDS.runnerUp || 'runner-up prize' }), { kicker: 'Runner-Up', head: '{team} {team:settles|settle} For Second' },
      '<p>' + nm(ru) + ' finished second with ' + ru.cum + ' points and takes home the ' + esc(AWARDS.runnerUp || 'runner-up prize') + '.</p>', ru.t, AWARDS.runnerUp);
    if (last && last !== ch && rows.length > 2) add(55, last.id, 'lastPlace', bv(last, { award: AWARDS.lastPlace || 'Basement Trophy', behind: ch.cum - last.cum }),
      { kicker: 'Last Place', head: 'Rock Bottom: {team}' },
      '<p>' + nm(last) + ' finished last in the ' + season.year + ' BRC with ' + last.cum + ' points' + (ch ? ', ' + (ch.cum - last.cum) + ' behind the champion' : '') + '.</p>',
      last.t, AWARDS.lastPlace);
    var mc = (season.stats || {}).mostCorrectPicks;
    if (mc && mc.memberId && mc.memberId !== ch.id && M[mc.memberId]) {
      var O = M[mc.memberId];
      add(45, O.id, 'oracle', bv(O, { count: mc.count || 'the most', rank: ord(O.rank), award: AWARDS.mostCorrectPicks || 'the oracle' }),
        { kicker: 'Most Correct Picks', head: '{team} Picks Best, Finishes {rank}' },
        '<p>' + nm(O) + ' made the most correct picks in the ' + season.year + ' BRC' + (mc.count ? ' (' + mc.count + ')' : '') + ' but finished ' + ord(O.rank) + ' with ' + O.cum + ' points.</p>',
        O.t, AWARDS.mostCorrectPicks);
    }
    var picked = pickStories(stories);
    picked.forEach(function (st, i) {   // Playa Gags
      var x = st.team && M[st.team];
      var gl = x ? gagLine(st.team, WB.edNo, 'brcF' + i, { owner: x.t.owner, team: x.t.team }) : '';
      if (gl) st.body = withCloser(st.body, gl);
    });
    return { season: season, r: 'final', rows: rows, post: post, games: [], out: {}, alive: [], gone: [], M: M, seed: seed, ch: ch, ru: ru, last: last, WB: WB, stories: picked };
  }

  function writeBRC(e) { return e.k === 'final' ? writeBRCFinal(e.s) : writeBRCRound(e.s, e.k); }

  /* ── BRC classifieds ───────────────────────────────────── */
  function brcClassifieds(ed) {
    var ads = [], s = ed.seed, round = ed.r !== 'final', lead = ed.post[0], last = ed.post[ed.post.length - 1], w = ed.WB || new Writer('brc', 0);
    function bo(x) { return { v: x.t.owner, id: x.id }; }
    if (round) {
      var RN = RNAME[ed.r], byPts = ed.rows.slice().sort(function (a, b) { return a.pts - b.pts; }), lo = byPts[0], hi = byPts[byPts.length - 1];
      ads.push(w.ad('wanted', { team: lo.t.team, owner: bo(lo), pts: lo.pts, round: RN }, { k: 'Wanted', t: 'A bracket that survives the weekend. Contact {team}.' }));
      ads.push(w.ad('services', { team: hi.t.team, owner: bo(hi), pts: hi.pts, round: RN }, { k: 'Services', t: '{team} now offering bracket consultations.' }));
      ed.games.forEach(function (g) {
        var b = ed.rows.filter(function (x) { return x.champ && normTeam(x.champ) === normTeam(g.l); });
        if (b.length) ads.push(w.ad('lost', { school: g.l, owners: listNames(b.map(function (x) { return x.t.owner; })), round: RN }, { k: 'Lost', t: 'One (1) national champion, {school}. Contact {owners}.' }));
        if (g.wsd - g.lsd >= 4) ads.push(w.ad('forSale', { school: g.l, w: g.w, round: RN }, { k: 'For Sale', t: 'Slightly used {school} bandwagon. Plenty of seats.' }));
      });
      (ed.gone || []).slice(0, 1).forEach(function (x) { ads.push(w.ad('obituary', { team: x.t.team, owner: bo(x), round: RN, year: ed.season.year }, { k: 'Obituary', t: 'Here lies {team’s} title hopes.' })); });
      if (lead) ads.push(w.ad('personals', { team: lead.t.team, owner: bo(lead) }, { k: 'Personals', t: 'Bracket leader seeks challenge. {team}.' }));
      if (ed.games.length) ads.push(w.ad('weather', { round: RN, upsets: ed.games.filter(function (g) { return g.wsd > g.lsd; }).length, games: ed.games.length }, { k: 'Weather', t: 'Chance of busted brackets: 100%.' }));
    } else {
      if (last) ads.push(w.ad('wantedFinal', { team: last.t.team, owner: bo(last), pts: last.cum }, { k: 'Wanted', t: 'Basketball knowledge. Any amount. Contact {team}.' }));
      if (ed.ru) ads.push(w.ad('lostFinal', { team: ed.ru.t.team, owner: bo(ed.ru), margin: ed.ch.cum - ed.ru.cum }, { k: 'Lost', t: 'One (1) BRC title, missed by {margin} points. Contact {owner}.' }));
      if (ed.ch) ads.push(w.ad('servicesFinal', { team: ed.ch.t.team, owner: bo(ed.ch) }, { k: 'Services', t: '{team} now offering bracket consultations.' }));
    }
    if (lead) ads.push(w.ad('realEstate', { team: lead.t.team, owner: bo(lead) }, { k: 'Real Estate', t: 'First place. Courtside view. Currently occupied by {team}.' }));
    if (last && last !== lead) ads.push(w.ad('helpWanted', { team: last.t.team, owner: bo(last), rank: ord(last.rank) }, { k: 'Help Wanted', t: 'Bracket consultant. Must work miracles. Apply to {team}.' }));
    var outAds = [];
    for (var i = 0; i < ads.length && outAds.length < 3; i++) outAds.push(ads[(i + s) % ads.length]);
    return outAds;
  }

  var EDITIONS = [];   // OFC, chronological { s, k }
  SEASONS.slice().reverse().forEach(function (s) { completeWeeks(s).forEach(function (w) { EDITIONS.push({ s: s, k: w.weekNumber }); }); });
  var BEDITIONS = [];  // BRC, chronological { s, k (round index | 'final'), key, label }
  BSEASONS.slice().reverse().forEach(function (s) {
    var rs = roundsOf(s);
    if (rs.length) rs.forEach(function (r) { BEDITIONS.push({ s: s, k: r, key: RURL[r], label: RNAME[r] }); });
    else BEDITIONS.push({ s: s, k: 'final', key: 'final', label: 'Final Edition' });
  });

  /* ══════════════════════════════════════════════════════════
     LATEST — headline summary for the league-page card
  ══════════════════════════════════════════════════════════ */
  function latest(lg) {
    var eds = lg === 'brc' ? BEDITIONS : EDITIONS;
    if (!eds.length) return null;
    var e = eds[eds.length - 1], st, ed;
    try { ed = lg === 'brc' ? writeBRC(e) : writeEdition(e.s, e.k); } catch (x) { return null; }
    st = ed.stories[0] || null;
    var photo = st ? (lg === 'brc' ? st.photo : ed.T[st.photo]) : null;
    return {
      league: lg, season: e.s, edition: e,
      mast: lg === 'brc' ? 'The Hardwood Herald' : 'The OFC Gazette',
      label: lg === 'brc' ? (e.k === 'final' ? 'Final Edition' : RNAME[e.k] + ' Edition') : 'Week ' + e.k + ' Edition',
      kicker: st ? st.kicker : '', head: st ? st.head : '', sub: st ? st.sub : '',
      photo: photo || null,
      href: 'gazette.html?league=' + lg + '&season=' + encodeURIComponent(e.s.year) + (lg === 'brc' ? '&round=' + e.key : '&week=' + e.k)
    };
  }

  window.OFL_NEWSROOM = {
    BLUE: BLUE, BRC_FIRST: BRC_FIRST, AWARDS: AWARDS, FIRST_YEAR: 2016,
    seriesThrough: seriesThrough, listNames: listNames, verb: verb, poss: poss, cap: cap,
    phrasebook: PB, fill: fill, lowercase: lowercaseDom, lowercaseText: lowercaseText,
    ofc: { editions: EDITIONS, write: writeEdition, classifieds: classifieds, ident: ident },
    brc: { editions: BEDITIONS, write: writeBRC, writeRound: writeBRCRound, writeFinal: writeBRCFinal, classifieds: brcClassifieds },
    latest: latest
  };
})();
