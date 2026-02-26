/**
 * ============================================================
 *  ADMIN.JS — CODE ONLY
 *
 *  This file contains only engine code. Claude may update
 *  this file freely. Your content lives in admin-config.js.
 *
 *  Load order in HTML: admin-config.js FIRST, then admin.js
 * ============================================================
 */

var ENGINE_VERSION = '2.7';

// ── FONT OPTIONS ──────────────────────────────────────────────
var FONT_OPTIONS = {
  display: [
    { label: "Bebas Neue",            value: "'Bebas Neue', sans-serif",            google: "Bebas+Neue" },
    { label: "Barlow Condensed",      value: "'Barlow Condensed', sans-serif",      google: "Barlow+Condensed:wght@200;300;400;600" },
    { label: "Unbounded",             value: "'Unbounded', sans-serif",              google: "Unbounded:wght@300;400;700" },
    { label: "DM Sans",               value: "'DM Sans', sans-serif",               google: "DM+Sans:wght@300;400;700" },
    { label: "Cormorant Garamond",    value: "'Cormorant Garamond', serif",          google: "Cormorant+Garamond:wght@300;400;600;700" },
    { label: "Playfair Display",      value: "'Playfair Display', serif",            google: "Playfair+Display:wght@400;700" },
    { label: "Anton",                 value: "'Anton', sans-serif",                  google: "Anton" },
    { label: "Oswald",                value: "'Oswald', sans-serif",                google: "Oswald:wght@200;300;400;600" },
    { label: "Big Shoulders Display", value: "'Big Shoulders Display', sans-serif",  google: "Big+Shoulders+Display:wght@300;400;700" },
    { label: "Teko",                  value: "'Teko', sans-serif",                  google: "Teko:wght@300;400;600" },
  ],
  body: [
    { label: "Barlow Condensed", value: "'Barlow Condensed', sans-serif", google: "Barlow+Condensed:wght@200;300;400;500;600" },
    { label: "DM Sans",          value: "'DM Sans', sans-serif",          google: "DM+Sans:wght@300;400;500" },
    { label: "Inter",            value: "'Inter', sans-serif",            google: "Inter:wght@300;400;500" },
    { label: "Outfit",           value: "'Outfit', sans-serif",           google: "Outfit:wght@200;300;400;500" },
    { label: "Syne",             value: "'Syne', sans-serif",             google: "Syne:wght@400;500;600" },
    { label: "Space Grotesk",    value: "'Space Grotesk', sans-serif",    google: "Space+Grotesk:wght@300;400;500" },
    { label: "Jost",             value: "'Jost', sans-serif",             google: "Jost:wght@200;300;400;500" },
    { label: "Nunito Sans",      value: "'Nunito Sans', sans-serif",      google: "Nunito+Sans:wght@200;300;400;600" },
  ],
};

// ══════════════════════════════════════════════════════════════
//  SPORT STAT SCHEMAS
//  Defines the stat fields and awards available per sport.
//  Lives here (engine) — values live in admin-config.js.
//
//  Each field:
//    key        — unique identifier, stored in season.stats{}
//    label      — human-readable display name
//    awardKey   — links to league.awards{} for the award name
//    type       — "owner"   → owner dropdown + optional sub-fields
//                 "text"    → single text field
//                 "number"  → numeric input
//    subFields  — additional inputs rendered alongside owner picker
//                 { key, label, type: "text"|"number" }
//    fromStandings — true if value is auto-derived (last place, most PA)
// ══════════════════════════════════════════════════════════════
var SPORT_STAT_SCHEMAS = {

  // ── FOOTBALL ────────────────────────────────────────────────
  football: {
    label: "Football",
    universalExtra: [
      { key: "teamsInLeague", label: "Teams in League", type: "number" }
    ],
    stats: [
      {
        key: "regularSeasonChamp",
        label: "Regular Season Champion",
        awardKey: "regularSeasonChamp",
        type: "owner",
        subFields: [
          { key: "record", label: "Record", type: "text" }
        ]
      },
      {
        key: "highestTeamGameScore",
        label: "Highest Team Score (Single Week)",
        awardKey: "highestTeamGameScore",
        type: "owner",
        subFields: [
          { key: "score", label: "Score", type: "number" },
          { key: "week", label: "Week #", type: "number" }
        ]
      },
      {
        key: "highestIndividualScore",
        label: "Highest Individual Player Score",
        awardKey: "highestIndividualScore",
        type: "owner",
        subFields: [
          { key: "playerName", label: "Player Name", type: "text" },
          { key: "points", label: "Points", type: "number" }
        ]
      },
      {
        key: "seasonPointsLeader",
        label: "Season Points Leader",
        awardKey: "seasonPointsLeader",
        type: "owner",
        subFields: [
          { key: "playerName", label: "Player Name", type: "text" },
          { key: "total", label: "Season Total", type: "number" }
        ]
      },
      {
        key: "mostPointsAgainst",
        label: "Most Points Against (Unluckiest)",
        awardKey: "mostPointsAgainst",
        type: "owner",
        fromStandings: true,
        subFields: [
          { key: "total", label: "Points Against Total", type: "number" }
        ]
      },
      {
        key: "lastPlace",
        label: "Last Place",
        awardKey: "lastPlace",
        type: "owner",
        fromStandings: true,
        subFields: [
          { key: "record", label: "Record", type: "text" }
        ]
      },
      {
        key: "closestWin",
        label: "Closest Win of Season",
        awardKey: "closestWin",
        type: "owner",
        subFields: [
          { key: "opponent", label: "Opponent", type: "text", dropdown: true },
          { key: "margin", label: "Margin", type: "number" },
          { key: "week", label: "Week #", type: "number" }
        ]
      }
    ],
    awards: [
      { key: "champion",              defaultLabel: "The Lombardi",          hint: "Season Champion" },
      { key: "regularSeasonChamp",    defaultLabel: "The Bye Week Trophy",   hint: "Regular Season #1 Seed" },
      { key: "highestTeamGameScore",  defaultLabel: "The Stiff Arm",         hint: "Highest Single-Week Team Score" },
      { key: "highestIndividualScore",defaultLabel: "The Heisman",           hint: "Highest Single Player Score" },
      { key: "seasonPointsLeader",    defaultLabel: "The Cannon",            hint: "Most Season Points" },
      { key: "mostPointsAgainst",     defaultLabel: "The Hard Luck Trophy",  hint: "Most Points Scored Against" },
      { key: "lastPlace",             defaultLabel: "The Toilet Bowl Crown", hint: "Last Place Finisher" },
      { key: "closestWin",            defaultLabel: "The Nail Biter",        hint: "Closest Win of the Season" }
    ],
    standingsColumns: [
      { key: "rank",       label: "#" },
      { key: "team",       label: "Team" },
      { key: "owner",      label: "Owner" },
      { key: "record",     label: "Record" },
      { key: "pointsFor",  label: "PF" },
      { key: "pointsAgainst", label: "PA" }
    ],
    playoffRounds: ["wildcard", "semis", "finals"],
    hasConsolation: true,
    cardTemplateDefaults: [
      { key: "champion",               label: "Champion",               show: true },
      { key: "championTeam",           label: "Champion Team",          show: true },
      { key: "record",                 label: "Record",                 show: true },
      { key: "seed",                   label: "Playoff Seed",           show: true },
      { key: "championshipScore",      label: "Championship Score",     show: true },
      { key: "regularSeasonChamp",     label: "Reg. Season Champ",      show: true },
      { key: "highestTeamGameScore",   label: "High Week Score",        show: false },
      { key: "highestIndividualScore", label: "High Player Score",      show: false },
      { key: "seasonPointsLeader",     label: "Points Leader",          show: false },
      { key: "teamsInLeague",          label: "Teams in League",        show: false }
    ]
  },

  // ── MARCH MADNESS ───────────────────────────────────────────
  madness: {
    label: "March Madness",
    universalExtra: [
      { key: "teamsInLeague", label: "Bracket Entries", type: "number" },
      { key: "scoringSystem", label: "Scoring System Used", type: "text" }
    ],
    stats: [
      {
        key: "winningBracket",
        label: "Winning Bracket",
        awardKey: "champion",
        type: "owner",
        fromStandings: true,
        subFields: [
          { key: "correctPicks", label: "Correct Picks", type: "number" },
          { key: "totalPoints", label: "Total Points", type: "number" }
        ]
      },
      {
        key: "mostCorrectPicks",
        label: "Most Correct Picks",
        awardKey: "mostCorrectPicks",
        type: "owner",
        fromStandings: true,
        subFields: [
          { key: "count", label: "Correct Picks", type: "number" }
        ]
      },
      {
        key: "perfectBracketThrough",
        label: "Perfect Bracket Through Round",
        awardKey: "perfectBracketThrough",
        type: "owner",
        multiWinner: true,
        subFields: [
          { key: "round", label: "Round", type: "roundDropdown" }
        ]
      },
      {
        key: "earliestBust",
        label: "Earliest Bracket Bust",
        awardKey: "earliestBust",
        type: "owner",
        subFields: [
          { key: "round", label: "Round Busted", type: "roundDropdown" }
        ]
      },
      {
        key: "cinderellaPick",
        label: "Best Cinderella Pick",
        awardKey: "cinderellaPick",
        type: "owner",
        subFields: [
          { key: "team", label: "Upset Team", type: "text" },
          { key: "round", label: "Round", type: "roundDropdown" }
        ]
      },
      {
        key: "bestSingleRound",
        label: "Most Points — Single Round",
        awardKey: "bestSingleRound",
        type: "owner",
        multiWinner: true,
        subFields: [
          { key: "round", label: "Round", type: "roundDropdown" },
          { key: "points", label: "Points", type: "number" }
        ]
      },
      {
        key: "finalFourCorrect",
        label: "Final Four Correctly Predicted",
        awardKey: "finalFourCorrect",
        type: "owner",
        multiWinner: true,
        subFields: []
      },
      {
        key: "championshipCorrect",
        label: "Championship Game Correctly Predicted",
        awardKey: "championshipCorrect",
        type: "owner",
        multiWinner: true,
        subFields: []
      },
      {
        key: "lastPlace",
        label: "Last Place / Worst Bracket",
        awardKey: "lastPlace",
        type: "owner",
        fromStandings: true,
        subFields: [
          { key: "totalPoints", label: "Total Points", type: "number" }
        ]
      }
    ],
    awards: [
      { key: "champion",              defaultLabel: "The Bracket King",        hint: "Winning Bracket" },
      { key: "mostCorrectPicks",      defaultLabel: "The Oracle",              hint: "Most Correct Picks" },
      { key: "cinderellaPick",        defaultLabel: "The Cinderella Chaser",   hint: "Best Upset Pick" },
      { key: "earliestBust",          defaultLabel: "The First Out",           hint: "Earliest Bracket Bust" },
      { key: "lastPlace",             defaultLabel: "The Participation Cup",   hint: "Last Place / Worst Bracket" },
      { key: "championshipCorrect",   defaultLabel: "The Crystal Ball",        hint: "Correctly Predicted Champion" },
      { key: "bestSingleRound",       defaultLabel: "The Round Dominator",     hint: "Most Points in a Single Round" },
      { key: "finalFourCorrect",      defaultLabel: "The Prophet",             hint: "All Final Four Correctly Predicted" },
      { key: "perfectBracketThrough", defaultLabel: "The Unblemished",         hint: "Perfect Bracket Longest" }
    ],
    standingsColumns: [
      { key: "rank",         label: "#" },
      { key: "owner",        label: "Owner" },
      { key: "bracketName",  label: "Bracket Name" },
      { key: "totalPoints",  label: "Total Points" },
      { key: "correctPicks", label: "Correct Picks" }
    ],
    playoffRounds: [],      // No bracket — single tournament
    hasConsolation: false,
    cardTemplateDefaults: [
      { key: "winningBracket",       label: "Winning Bracket",    show: true },
      { key: "correctPicks",         label: "Correct Picks",      show: true },
      { key: "totalPoints",          label: "Total Points",       show: true },
      { key: "actualWinner",         label: "Tournament Winner",  show: true },
      { key: "mostCorrectPicks",     label: "Most Correct Picks", show: true },
      { key: "cinderellaPick",       label: "Cinderella Pick",    show: false },
      { key: "perfectBracketThrough",label: "Perfect Through",    show: false }
    ]
  },

  // ── OTHER ────────────────────────────────────────────────────
  other: {
    label: "Other",
    universalExtra: [
      { key: "teamsInLeague", label: "Entries / Teams", type: "number" }
    ],
    stats: [],    // No predefined stats — fully freeform via customStats
    awards: [
      { key: "champion", defaultLabel: "The Champion Trophy", hint: "Season Winner" }
    ],
    standingsColumns: [
      { key: "rank",      label: "#" },
      { key: "owner",     label: "Owner" },
      { key: "team",      label: "Team / Entry" },
      { key: "record",    label: "Record / Score" }
    ],
    playoffRounds: [],
    hasConsolation: false,
    cardTemplateDefaults: [
      { key: "champion",      label: "Champion",   show: true },
      { key: "championTeam",  label: "Team",       show: true },
      { key: "record",        label: "Record",     show: true }
    ]
  }
};

// ══════════════════════════════════════════════════════════════
//  ID GENERATORS
//  Lightweight unique IDs for roster members, leagues, seasons.
// ══════════════════════════════════════════════════════════════
function generateId(prefix) {
  return (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ══════════════════════════════════════════════════════════════
//  ROSTER HELPERS
//  Utilities for looking up members, resolving team names, etc.
// ══════════════════════════════════════════════════════════════
var RosterEngine = {

  /**
   * Get all active members from master roster.
   */
  activeMembers: function (config) {
    var roster = (config.masterRoster || []);
    return roster.filter(function (m) { return m.active !== false; });
  },

  /**
   * Get a member by ID.
   */
  getMember: function (config, memberId) {
    return (config.masterRoster || []).find(function (m) { return m.id === memberId; }) || null;
  },

  /**
   * Get all team name entries for a member in a specific league.
   * Matches by leagueKey (OFC/BRC) OR by leagueName for 'Other' entries.
   * Returns array of { name, logo? } objects.
   */
  getTeamsForLeague: function (member, leagueName) {
    if (!member) return [];
    // New schema: member.leagues[]
    if (member.leagues) {
      var entry = (member.leagues || []).find(function (lg) {
        return lg.leagueKey === leagueName || lg.leagueName === leagueName;
      });
      return entry ? (entry.teams || []) : [];
    }
    // Legacy flat schema fallback
    return (member.teams || []).filter(function (t) {
      return t.league === leagueName;
    });
  },

  /**
   * Get the most recent team name for a member in a league.
   * Used to auto-populate new seasons for variable-name sports (madness, other).
   */
  getLatestTeam: function (member, leagueName) {
    var teams = RosterEngine.getTeamsForLeague(member, leagueName);
    return teams.length ? teams[teams.length - 1] : null;
  },

  /**
   * Get the single fixed team for a member in a league (football).
   * Football team names don't change, so we just take the first one.
   */
  getFixedTeam: function (member, leagueName) {
    var teams = RosterEngine.getTeamsForLeague(member, leagueName);
    return teams.length ? teams[0] : null;
  },

  /**
   * Build the season roster array for a new season.
   * Auto-populates from active league members and their team names.
   * sport: "football" | "madness" | "other"
   */
  buildSeasonRoster: function (config, league) {
    var sport = league.sport || 'other';
    // Football: use curated league.members list
    // Madness/other: derive from master roster — anyone active with a team entry for this league
    if (sport === 'football') {
      var memberIds = league.members || [];
      return memberIds.map(function (mid) {
        var member = RosterEngine.getMember(config, mid);
        if (!member) return null;
        var teamEntry = RosterEngine.getFixedTeam(member, league.name);
        return {
          memberId: mid,
          ownerName: member.name,
          teamName: teamEntry ? teamEntry.name : '',
          logo:     teamEntry ? teamEntry.logo : ''
        };
      }).filter(Boolean);
    } else {
      return (config.masterRoster || []).filter(function (m) {
        if (m.active === false) return false;
        return RosterEngine.getTeamsForLeague(m, league.name).length > 0;
      }).map(function (member) {
        var teamEntry = RosterEngine.getLatestTeam(member, league.name);
        return {
          memberId: member.id,
          ownerName: member.name,
          teamName: teamEntry ? teamEntry.name : '',
          logo:     teamEntry ? teamEntry.logo : ''
        };
      });
    }
  },

  /**
   * Build a display label "Owner — Team" for dropdowns.
   * Falls back gracefully if team name is missing.
   */
  ownerTeamLabel: function (member, teamName) {
    var name = member ? member.name : 'Unknown';
    return teamName ? (name + ' \u2014 ' + teamName) : name;
  },

  /**
   * Compute awards earned for a season and return array of
   * { memberId, awardKey, awardLabel, year, leagueId } objects.
   * Used to build each owner's lifetime achievement record.
   */
  computeSeasonAwards: function (season, league, schema) {
    if (!schema || !season) return [];
    var awards  = [];
    var awardDefs = league.awards || {};

    // Champion is always from universal fields
    if (season.championMemberId) {
      awards.push({
        memberId:   season.championMemberId,
        awardKey:   'champion',
        awardLabel: awardDefs['champion'] || 'Champion',
        year:       season.year,
        leagueId:   league.id,
        leagueName: league.name
      });
    }

    // Stats-derived awards
    (schema.stats || []).forEach(function (statDef) {
      if (!statDef.awardKey) return;
      var statVal = season.stats && season.stats[statDef.key];
      if (!statVal) return;
      var ownerId = statVal.memberId || statVal.owner;
      if (!ownerId) return;
      awards.push({
        memberId:   ownerId,
        awardKey:   statDef.awardKey,
        awardLabel: awardDefs[statDef.awardKey] || statDef.label,
        year:       season.year,
        leagueId:   league.id,
        leagueName: league.name
      });
    });

    return awards;
  },

  /**
   * Build full lifetime award record for a member across all leagues/seasons.
   * Returns array of award objects sorted by year descending.
   */
  getMemberAwards: function (config, memberId) {
    var allAwards = [];
    (config.leagueData || []).forEach(function (league) {
      var schema = SPORT_STAT_SCHEMAS[league.sport] || SPORT_STAT_SCHEMAS.other;
      (league.seasons || []).forEach(function (season) {
        var earned = RosterEngine.computeSeasonAwards(season, league, schema);
        earned.forEach(function (a) {
          if (a.memberId === memberId) allAwards.push(a);
        });
      });
    });
    return allAwards.sort(function (a, b) { return (b.year || 0) - (a.year || 0); });
  }
};

// ══════════════════════════════════════════════════════════════
//  CARD TEMPLATE ENGINE
//  Manages per-league card template configuration.
//  The template controls which stat fields appear on the
//  baseball card and in what order.
// ══════════════════════════════════════════════════════════════
var CardTemplateEngine = {

  /**
   * Get default card template fields for a sport.
   */
  getDefaults: function (sport) {
    var schema = SPORT_STAT_SCHEMAS[sport] || SPORT_STAT_SCHEMAS.other;
    return (schema.cardTemplateDefaults || []).map(function (f) {
      return { key: f.key, label: f.label, show: f.show };
    });
  },

  /**
   * Merge saved template with defaults (adds any new fields, preserves order/show state).
   */
  mergeWithDefaults: function (saved, sport) {
    var defaults = CardTemplateEngine.getDefaults(sport);
    if (!saved || !saved.length) return defaults;
    // Start from saved order, then append any new defaults not yet in saved
    var savedKeys  = saved.map(function (f) { return f.key; });
    var merged     = saved.slice();
    defaults.forEach(function (d) {
      if (savedKeys.indexOf(d.key) === -1) merged.push(d);
    });
    return merged;
  },

  /**
   * Get the visible fields in order for rendering a card.
   */
  getVisibleFields: function (league) {
    var template = league.cardTemplate || [];
    return template.filter(function (f) { return f.show !== false; });
  },

  /**
   * Resolve a field's display value from a season object.
   * Handles nested stats and universal top-level fields.
   */
  resolveFieldValue: function (fieldKey, season, roster) {
    // Universal top-level fields
    var universalMap = {
      champion:          function () { return season.championName || ''; },
      championTeam:      function () { return season.championTeamName || ''; },
      record:            function () { return season.record || ''; },
      seed:              function () { return season.seed ? '#' + season.seed : ''; },
      championshipScore: function () { return season.championshipScore || ''; },
      teamsInLeague:     function () { return season.teamsInLeague || ''; },
      scoringSystem:     function () { return season.scoringSystem || ''; }
    };
    if (universalMap[fieldKey]) return universalMap[fieldKey]();
    // Stats fields
    var stat = season.stats && season.stats[fieldKey];
    if (!stat) return '';
    // Build a readable summary from the stat's subfields
    var parts = [];
    if (stat.ownerName)   parts.push(stat.ownerName);
    if (stat.team)        parts.push(stat.team);
    if (stat.bracketName) parts.push(stat.bracketName);
    if (stat.score !== undefined) parts.push(stat.score);
    if (stat.points !== undefined) parts.push(stat.points + ' pts');
    if (stat.total !== undefined)  parts.push(stat.total);
    if (stat.count !== undefined)  parts.push(stat.count);
    if (stat.round)       parts.push('(' + stat.round + ')');
    if (stat.week)        parts.push('Wk ' + stat.week);
    return parts.join(' · ');
  }
};

// ══════════════════════════════════════════════════════════════
//  PLAYOFF ENGINE
//  Manages round definitions and bracket data per sport.
// ══════════════════════════════════════════════════════════════
var PlayoffEngine = {

  /**
   * Get round definitions for a sport.
   * Returns array of { key, label } objects.
   */
  getRounds: function (sport, hasConsolation) {
    var schema = SPORT_STAT_SCHEMAS[sport] || SPORT_STAT_SCHEMAS.other;
    var rounds = (schema.playoffRounds || []).map(function (r) {
      var labels = {
        wildcard: 'Wild Card',
        semis:    'Semifinals',
        finals:   'Championship'
      };
      return { key: r, label: labels[r] || r };
    });
    if (hasConsolation && schema.hasConsolation) {
      rounds.push({ key: 'consolation', label: 'Consolation / Toilet Bowl' });
    }
    return rounds;
  },

  /**
   * Create an empty matchup entry.
   */
  emptyMatchup: function () {
    return {
      homeMemberId:  '',
      homeOwnerName: '',
      homeTeamName:  '',
      homeScore:     '',
      awayMemberId:  '',
      awayOwnerName: '',
      awayTeamName:  '',
      awayScore:     ''
    };
  },

  /**
   * Create an empty playoff structure for a season.
   */
  emptyPlayoffs: function (sport, hasConsolation) {
    var rounds  = PlayoffEngine.getRounds(sport, hasConsolation);
    var bracket = {};
    rounds.forEach(function (r) {
      bracket[r.key] = [PlayoffEngine.emptyMatchup()];
    });
    return bracket;
  }
};

// ══════════════════════════════════════════════════════════════
//  SEASON FACTORY
//  Creates a blank season object with correct shape for a sport.
// ══════════════════════════════════════════════════════════════
var SeasonFactory = {

  create: function (config, league, year) {
    var sport  = league.sport || 'other';
    var schema = SPORT_STAT_SCHEMAS[sport] || SPORT_STAT_SCHEMAS.other;
    var roster = RosterEngine.buildSeasonRoster(config, league);

    // Build empty stats object from schema
    var stats = {};
    (schema.stats || []).forEach(function (statDef) {
      var entry = { memberId: '', ownerName: '' };
      (statDef.subFields || []).forEach(function (sf) {
        entry[sf.key] = sf.type === 'number' ? 0 : '';
      });
      stats[statDef.key] = entry;
    });

    // Build standings rows from roster
    var standingsCols = schema.standingsColumns || [];
    var standings = roster.map(function (r, i) {
      var row = { rank: i + 1, memberId: r.memberId, owner: r.ownerName };
      standingsCols.forEach(function (col) {
        if (!row[col.key]) row[col.key] = '';
      });
      row.owner = r.ownerName;
      row.team  = r.teamName;
      return row;
    });

    // Build empty playoffs
    var playoffs = PlayoffEngine.emptyPlayoffs(sport, true);

    return {
      id:                generateId('ssn'),
      year:              year || new Date().getFullYear().toString(),
      isFinal:           false,
      championMemberId:  '',
      championName:      '',
      championTeamName:  '',
      runnerUpMemberId:  '',
      runnerUpName:      '',
      runnerUpTeamName:  '',
      record:            '',
      seed:              '',
      championshipScore: '',
      story:             '',
      image:             '',
      teamsInLeague:     roster.length || 0,
      scoringSystem:     '',
      roster:            roster,
      stats:             stats,
      standings:         standings,
      playoffs:          playoffs,
      customStats:       []
    };
  }
};

// ══════════════════════════════════════════════════════════════
//  LEAGUE FACTORY
//  Creates a blank league object with correct defaults.
// ══════════════════════════════════════════════════════════════
var LeagueFactory = {

  create: function (sport) {
    var schema  = SPORT_STAT_SCHEMAS[sport] || SPORT_STAT_SCHEMAS.other;
    var awards  = {};
    (schema.awards || []).forEach(function (a) {
      awards[a.key] = a.defaultLabel;
    });
    var cardTemplate      = CardTemplateEngine.getDefaults(sport);
    var standingsColumns  = StandingsColumnEngine.getDefaults(sport);

    return {
      id:           generateId('lg'),
      name:         '',
      fullName:      '',
      sport:        sport || 'football',
      season:       '',
      link:         'league.html?league=',
      linkLabel:    'Enter League',
      accentColor:  '',
      logo:         '',
      heroEyebrow:  '',
      heroTitle:    '',
      heroSubtitle: '',
      currentSeasonId: '',
      pageLayout: {
        sections:      PageLayoutEngine.getDefaults(),
        championImgSize: 160
      },
      slideshow: {
        slides:  [],
        overlay: 'rgba(0,0,0,0.55)'
      },
      awardImages:      {},
      customAwards:     [],
      awards:           awards,
      cardTemplate:     cardTemplate,
      standingsColumns: standingsColumns,
      seasons:          []
    };
  }
};

// ══════════════════════════════════════════════════════════════
//  ROSTER MEMBER FACTORY
// ══════════════════════════════════════════════════════════════
var MemberFactory = {

  create: function (name) {
    return {
      id:       generateId('mbr'),
      name:     name || '',
      nickname: '',
      mugshot:  '',
      active:   true,
      leagues:  []   // [ { leagueKey, leagueName, teams: [ { name, logo? } ] } ]
    };
  },

  /**
   * Create a league entry for a member.
   * leagueKey: 'OFC' | 'BRC' | 'Other'
   * leagueName: display name (required for Other, optional label otherwise)
   */
  createLeagueEntry: function (leagueKey, leagueName) {
    return {
      leagueKey:   leagueKey   || '',
      leagueName:  leagueName  || '',
      teams:       []
    };
  },

  /**
   * Create a team entry within a league.
   * OFC: { name, logo }   BRC/Other: { name }
   */
  createTeamEntry: function (teamName, logo) {
    var entry = { name: teamName || '' };
    if (logo !== undefined) entry.logo = logo || '';
    return entry;
  },

  /**
   * Migration shim: convert old flat teams[] format to new leagues[] format.
   * Old format: member.teams = [ { league, name, logo } ]
   * New format: member.leagues = [ { leagueKey, leagueName, teams: [{name,logo}] } ]
   * Safe to call on already-migrated members (leagues already present).
   */
  migrate: function (member) {
    // Already on new schema
    if (member.leagues) return member;

    var leagueMap = {};
    (member.teams || []).forEach(function (t) {
      var key = t.league || 'Other';
      if (!leagueMap[key]) {
        leagueMap[key] = {
          leagueKey:  key,
          leagueName: '',
          teams:      []
        };
      }
      leagueMap[key].teams.push({ name: t.name || '', logo: t.logo || '' });
    });

    member.leagues = Object.keys(leagueMap).map(function (k) { return leagueMap[k]; });
    delete member.teams;
    return member;
  }
};

// ══════════════════════════════════════════════════════════════
//  PAGE SECTION DEFINITIONS
//  Canonical list of all possible league page sections.
//  key      — stored in pageLayout.sections[].key
//  label    — shown in admin UI
//  default  — true = on by default for new leagues
// ══════════════════════════════════════════════════════════════
var PAGE_SECTION_DEFS = [
  { key: 'champion',    label: 'Current Champion',  defaultOn: true  },
  { key: 'story',       label: 'Season Story',       defaultOn: true  },
  { key: 'standings',   label: 'Final Standings',    defaultOn: true  },
  { key: 'bracket',     label: 'Playoff Bracket',    defaultOn: true  },
  { key: 'roster',      label: 'Season Roster',      defaultOn: false },
  { key: 'awards',      label: 'Season Awards',      defaultOn: true  },
  { key: 'pastSeasons', label: 'Past Seasons',       defaultOn: true  }
];

// ══════════════════════════════════════════════════════════════
//  PAGE LAYOUT ENGINE
//  Manages the ordered sections array on league.pageLayout.
// ══════════════════════════════════════════════════════════════
var PageLayoutEngine = {

  /**
   * Return the default sections array (used for new leagues and as fallback).
   */
  getDefaults: function () {
    return PAGE_SECTION_DEFS.map(function (d) {
      return { key: d.key, enabled: d.defaultOn };
    });
  },

  /**
   * Migrate a league's legacy pageLayout (showChampion, showStandings, etc.)
   * to the new sections array format. Safe to call on already-migrated leagues.
   */
  migrate: function (league) {
    if (!league.pageLayout) league.pageLayout = {};
    var pl = league.pageLayout;

    // Already migrated
    if (pl.sections && pl.sections.length) return;

    // Build from legacy boolean flags, preserving intent
    var legacyMap = {
      champion:    pl.showChampion    !== false,
      story:       true,
      standings:   pl.showStandings   !== false,
      bracket:     true,
      roster:      false,
      awards:      pl.showAwards      !== false,
      pastSeasons: pl.showPastSeasons !== false
    };

    pl.sections = PAGE_SECTION_DEFS.map(function (d) {
      return {
        key:     d.key,
        enabled: legacyMap.hasOwnProperty(d.key) ? legacyMap[d.key] : d.defaultOn
      };
    });
  },

  /**
   * Merge saved sections with canonical defs — adds any new sections
   * not yet in the saved array (appended at end, using defaultOn).
   */
  mergeWithDefaults: function (saved) {
    if (!saved || !saved.length) return PageLayoutEngine.getDefaults();
    var savedKeys = saved.map(function (s) { return s.key; });
    var merged    = saved.slice();
    PAGE_SECTION_DEFS.forEach(function (d) {
      if (savedKeys.indexOf(d.key) === -1) {
        merged.push({ key: d.key, enabled: d.defaultOn });
      }
    });
    return merged;
  },

  /**
   * Get label for a section key.
   */
  getLabel: function (key) {
    var def = PAGE_SECTION_DEFS.find(function (d) { return d.key === key; });
    return def ? def.label : key;
  }
};

// ══════════════════════════════════════════════════════════════
//  STANDINGS COLUMN ENGINE
//  Manages per-league standings column configuration.
//  Stored as league.standingsColumns[] — each entry:
//    { key, label, show }
//  Mirrors CardTemplateEngine pattern exactly.
// ══════════════════════════════════════════════════════════════
var StandingsColumnEngine = {

  /**
   * Get default standings columns for a sport from the schema.
   * Returns array of { key, label, show } objects (all shown by default).
   */
  getDefaults: function (sport) {
    var schema = SPORT_STAT_SCHEMAS[sport] || SPORT_STAT_SCHEMAS.other;
    return (schema.standingsColumns || []).map(function (c) {
      return { key: c.key, label: c.label, show: true };
    });
  },

  /**
   * Merge saved columns with schema defaults.
   * Preserves saved order and show state; appends any new schema columns.
   */
  mergeWithDefaults: function (saved, sport) {
    var defaults = StandingsColumnEngine.getDefaults(sport);
    if (!saved || !saved.length) return defaults;
    var savedKeys = saved.map(function (c) { return c.key; });
    var merged    = saved.slice();
    defaults.forEach(function (d) {
      if (savedKeys.indexOf(d.key) === -1) merged.push(d);
    });
    return merged;
  },

  /**
   * Get visible columns in order for rendering.
   */
  getVisibleColumns: function (league) {
    var cols = league.standingsColumns || [];
    return cols.filter(function (c) { return c.show !== false; });
  }
};

// ── deepMerge ────────────────────────────────────────────────
// Must be defined BEFORE the boot IIFE that calls it.
function deepMerge(base, override) {
  var result = Object.assign({}, base);
  Object.keys(override).forEach(function (key) {
    if (
      override[key] !== null &&
      typeof override[key] === 'object' &&
      !Array.isArray(override[key]) &&
      base[key] && typeof base[key] === 'object' &&
      !Array.isArray(base[key])
    ) {
      result[key] = deepMerge(base[key], override[key]);
    } else {
      result[key] = override[key];
    }
  });
  return result;
}

/**
 * Migrate a league object from old schema to new.
 * - Adds awardImages / customAwards if missing
 * - Migrates season.customStats entries: preserves winner/value,
 *   creates matching league.customAwards entries by label if not already present.
 */
function migrateLeague(league) {
  if (!league.awardImages)  league.awardImages  = {};
  if (!league.customAwards) league.customAwards = [];

  // Migrate legacy showX flags → sections array
  PageLayoutEngine.migrate(league);

  // Migrate/seed standingsColumns if missing
  if (!league.standingsColumns || !league.standingsColumns.length) {
    league.standingsColumns = StandingsColumnEngine.getDefaults(league.sport);
  } else {
    // Merge in any new columns added to the schema since last save
    league.standingsColumns = StandingsColumnEngine.mergeWithDefaults(league.standingsColumns, league.sport);
  }

  // Migrate any existing season.customStats into league.customAwards
  (league.seasons || []).forEach(function (season) {
    if (!season.customStats || !season.customStats.length) return;
    season.customStats.forEach(function (cs) {
      if (!cs.label) return;
      // Find or create matching league-level custom award by label
      var existing = league.customAwards.find(function (ca) {
        return ca.label === cs.label || ca.id === cs.customAwardId;
      });
      if (!existing) {
        existing = {
          id:    generateId('ca'),
          label: cs.label  || '',
          image: cs.image  || ''
        };
        league.customAwards.push(existing);
      }
      // Stamp the season entry with the stable id and remove redundant fields
      cs.customAwardId = existing.id;
      delete cs.label;
      delete cs.image;
    });
  });
}

// ══════════════════════════════════════════════════════════════
//  BOOT: merge localStorage over config defaults
// ══════════════════════════════════════════════════════════════
(function () {
  var config = JSON.parse(JSON.stringify(SITE_CONFIG_DEFAULTS));
  try {
    var stored = localStorage.getItem('ofc_site_config');
    if (stored) { config = deepMerge(config, JSON.parse(stored)); }
  } catch (e) { console.warn('Could not load config from localStorage:', e); }
  window.SITE_CONFIG          = config;
  window.ADMIN_PIN            = ADMIN_PIN;
  window.ENGINE_VERSION       = ENGINE_VERSION;
  window.SITE_CONFIG_DEFAULTS = SITE_CONFIG_DEFAULTS;
  window.FONT_OPTIONS         = FONT_OPTIONS;
  window.KB_DIRECTIONS        = KB_DIRECTIONS;
  window.SPORT_STAT_SCHEMAS   = SPORT_STAT_SCHEMAS;
  window.PAGE_SECTION_DEFS       = PAGE_SECTION_DEFS;
  window.PageLayoutEngine        = PageLayoutEngine;
  window.StandingsColumnEngine   = StandingsColumnEngine;
  window.RosterEngine            = RosterEngine;
  window.CardTemplateEngine   = CardTemplateEngine;
  window.PlayoffEngine        = PlayoffEngine;
  window.SeasonFactory        = SeasonFactory;
  window.LeagueFactory        = LeagueFactory;
  window.MemberFactory        = MemberFactory;
  window.generateId           = generateId;
  window.migrateLeague        = migrateLeague;
})();
