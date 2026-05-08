import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, Activity, RefreshCw, Loader2, Clock,
  ChevronDown, ChevronUp, Circle
} from 'lucide-react';

// ─── API config ──────────────────────────────────────────────────────────────
// ESPN public soccer API (no key required, CORS-open)
const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer';

// ─── League catalogue ────────────────────────────────────────────────────────
const SCORE_LEAGUES = [
  { id: 'all',              name: 'All Leagues',       espn: null              },
  { id: 'eng.1',            name: 'Premier League',    espn: 'eng.1',  flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { id: 'esp.1',            name: 'La Liga',           espn: 'esp.1',  flag: '🇪🇸' },
  { id: 'ita.1',            name: 'Serie A',           espn: 'ita.1',  flag: '🇮🇹' },
  { id: 'ger.1',            name: 'Bundesliga',        espn: 'ger.1',  flag: '🇩🇪' },
  { id: 'fra.1',            name: 'Ligue 1',           espn: 'fra.1',  flag: '🇫🇷' },
  { id: 'uefa.champions',   name: 'Champions League',  espn: 'uefa.champions', flag: '⭐' },
  { id: 'usa.1',            name: 'MLS',               espn: 'usa.1',  flag: '🇺🇸' },
  { id: 'mex.1',            name: 'Liga MX',           espn: 'mex.1',  flag: '🇲🇽' },
];

const STANDING_LEAGUES = [
  { id: 'eng.1',          name: 'Premier League',   flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { id: 'esp.1',          name: 'La Liga',           flag: '🇪🇸' },
  { id: 'ita.1',          name: 'Serie A',           flag: '🇮🇹' },
  { id: 'ger.1',          name: 'Bundesliga',        flag: '🇩🇪' },
  { id: 'fra.1',          name: 'Ligue 1',           flag: '🇫🇷' },
  { id: 'uefa.champions', name: 'Champions League',  flag: '⭐' },
  { id: 'usa.1',          name: 'MLS',               flag: '🇺🇸' },
];

// ─── ESPN helpers ────────────────────────────────────────────────────────────
const parseEspnEvent = (event, leagueName) => {
  const comp  = event.competitions?.[0];
  const home  = comp?.competitors?.find(c => c.homeAway === 'home');
  const away  = comp?.competitors?.find(c => c.homeAway === 'away');
  const state = event.status?.type?.state;          // 'pre' | 'in' | 'post'
  const completed = event.status?.type?.completed;

  return {
    id:       event.id,
    league:   leagueName,
    homeTeam: { name: home?.team?.displayName || '—', logo: home?.team?.logo },
    awayTeam: { name: away?.team?.displayName || '—', logo: away?.team?.logo },
    homeScore: home?.score ?? null,
    awayScore: away?.score ?? null,
    status:    state === 'in'   ? 'LIVE'
             : completed        ? 'FT'
             :                   'UPCOMING',
    minute:    event.status?.displayClock || '',
    date:      event.date,
  };
};

const fetchEspnLeague = async (espnSlug, leagueName) => {
  const url = `${ESPN_BASE}/${espnSlug}/scoreboard`;
  const res  = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.events || []).map(e => parseEspnEvent(e, leagueName));
};

// ─── ESPN standings helper ──────────────────────────────────────────────────
// Correct endpoint: apis/v2 (not apis/site/v2)
const ESPN_STANDINGS_BASE = 'https://site.api.espn.com/apis/v2/sports/soccer';

const fetchStandings = async (espnLeagueSlug) => {
  const url = `${ESPN_STANDINGS_BASE}/${espnLeagueSlug}/standings`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();

  const rows = [];

  const processEntries = (entries, groupName = '') => {
    entries.forEach(entry => {
      const stat  = (name) => entry.stats?.find(s => s.name === name)?.value ?? 0;
      const rank  = stat('rank') || (rows.length + 1);
      const logo  = entry.team?.logos?.[0]?.href || null;
      rows.push({
        position: rank,
        team: {
          id:    entry.team?.id,
          name:  entry.team?.displayName || entry.team?.name || '—',
          crest: logo,
        },
        played: stat('gamesPlayed'),
        won:    stat('wins'),
        drawn:  stat('ties'),          // ESPN uses 'ties', not 'draws'
        lost:   stat('losses'),
        gf:     stat('pointsFor'),
        ga:     stat('pointsAgainst'),
        gd:     stat('pointDifferential'),
        points: stat('points'),
        form:   '',
        group:  groupName,
      });
    });
  };

  // data.children[0].standings.entries is the standard path
  if (data.children?.length) {
    data.children.forEach(child => {
      processEntries(child.standings?.entries || [], child.name || '');
    });
  } else if (data.standings?.entries?.length) {
    processEntries(data.standings.entries);
  }

  rows.sort((a, b) => a.position - b.position);
  return rows;
};

// ─── Tiny UI pieces ───────────────────────────────────────────────────────────
const StatusBadge = ({ status, minute }) => {
  if (status === 'LIVE') return (
    <span className="ls-badge ls-badge--live">
      <span className="ls-badge__dot" /> {minute || 'LIVE'}
    </span>
  );
  if (status === 'FT') return <span className="ls-badge ls-badge--ft">FT</span>;
  return <span className="ls-badge ls-badge--upcoming">⏰</span>;
};

const TeamLogo = ({ src, name }) => src
  ? <img src={src} alt={name} className="ls-logo" onError={e => { e.target.style.display = 'none'; }} />
  : <span className="ls-logo-fallback">{name?.[0] || '?'}</span>;

const FormDot = ({ result }) => {
  const cls = result === 'W' ? 'ls-form--w' : result === 'D' ? 'ls-form--d' : 'ls-form--l';
  return <span className={`ls-form-dot ${cls}`}>{result}</span>;
};

// ─── Main component ────────────────────────────────────────────────────────────
export default function LiveScores() {
  const [tab,             setTab]           = useState('scores');   // 'scores' | 'standings'
  const [scoreLeague,     setScoreLeague]   = useState('all');
  const [standingLeague,  setStandingLeague]= useState('eng.1');
  const [matches,         setMatches]       = useState([]);
  const [standings,       setStandings]     = useState([]);
  const [loadingMatches,  setLoadingMatches]= useState(false);
  const [loadingStandings,setLoadingStandings]=useState(false);
  const [matchError,      setMatchError]    = useState(null);
  const [standError,      setStandError]    = useState(null);
  const [lastUpdated,     setLastUpdated]   = useState(null);
  const refreshTimerRef = useRef(null);

  // ── fetch matches ─────────────────────────────────────────────────────────
  const loadMatches = useCallback(async () => {
    setLoadingMatches(true);
    setMatchError(null);
    try {
      let all = [];
      if (scoreLeague === 'all') {
        const results = await Promise.allSettled(
          SCORE_LEAGUES.filter(l => l.espn).map(l => fetchEspnLeague(l.espn, l.name))
        );
        results.forEach(r => { if (r.status === 'fulfilled') all.push(...r.value); });
      } else {
        const league = SCORE_LEAGUES.find(l => l.id === scoreLeague);
        if (league?.espn) all = await fetchEspnLeague(league.espn, league.name);
      }
      // Sort: LIVE → FT → UPCOMING, then by date
      all.sort((a, b) => {
        const order = { LIVE: 0, FT: 1, UPCOMING: 2 };
        const o = (order[a.status] ?? 3) - (order[b.status] ?? 3);
        return o !== 0 ? o : new Date(a.date) - new Date(b.date);
      });
      setMatches(all);
      setLastUpdated(new Date());
    } catch (e) {
      setMatchError('Could not load matches – ' + e.message);
    } finally {
      setLoadingMatches(false);
    }
  }, [scoreLeague]);

  // ── fetch standings ───────────────────────────────────────────────────────
  const loadStandings = useCallback(async () => {
    setLoadingStandings(true);
    setStandError(null);
    try {
      const rows = await fetchStandings(standingLeague);
      setStandings(rows);
    } catch (e) {
      setStandError('Could not load standings – ' + e.message);
    } finally {
      setLoadingStandings(false);
    }
  }, [standingLeague]);

  // ── effects ───────────────────────────────────────────────────────────────
  useEffect(() => { loadMatches(); }, [loadMatches]);
  useEffect(() => { if (tab === 'standings') loadStandings(); }, [tab, loadStandings]);

  // auto-refresh live scores every 60 s
  useEffect(() => {
    if (tab !== 'scores') return;
    refreshTimerRef.current = setInterval(loadMatches, 60_000);
    return () => clearInterval(refreshTimerRef.current);
  }, [tab, loadMatches]);

  // ── derived ───────────────────────────────────────────────────────────────
  const liveMatches     = matches.filter(m => m.status === 'LIVE');
  const finishedMatches = matches.filter(m => m.status === 'FT');
  const upcomingMatches = matches.filter(m => m.status === 'UPCOMING');

  const currentStandLeague = STANDING_LEAGUES.find(l => l.id === standingLeague);

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        /* ── Page wrapper ── */
        .ls-page { max-width: 1100px; margin: 0 auto; padding: 2rem 1rem 4rem; }
        .ls-hero { margin-bottom: 2rem; }
        .ls-eyebrow { font-size: .7rem; letter-spacing: .15em; color: var(--color-primary, #e74c3c);
                      font-weight: 700; margin-bottom: .5rem; }
        .ls-title { font-size: clamp(1.6rem,4vw,2.4rem); font-weight: 800; margin: 0 0 .4rem; }
        .ls-subtitle { color: var(--color-muted, #888); font-size: .95rem; }

        /* ── Tabs ── */
        .ls-tabs { display: flex; gap: .5rem; margin-bottom: 1.5rem; }
        .ls-tab { padding: .55rem 1.25rem; border-radius: 99px; border: 2px solid transparent;
                  font-weight: 600; font-size: .88rem; cursor: pointer; transition: all .2s;
                  background: var(--color-surface-alt, #f3f3f3); color: inherit; }
        .ls-tab--active { background: var(--color-primary, #e74c3c); color: #fff; border-color: var(--color-primary, #e74c3c); }

        /* ── Toolbar ── */
        .ls-toolbar { display: flex; align-items: center; gap: .75rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
        .ls-select { padding: .45rem .85rem; border-radius: 8px; border: 1.5px solid var(--color-border, #e0e0e0);
                     background: var(--color-surface, #fff); font-weight: 600; font-size: .85rem;
                     cursor: pointer; color: inherit; }
        .ls-updated { margin-left: auto; font-size: .78rem; color: var(--color-muted, #888); }
        .ls-refresh-btn { display: flex; align-items: center; gap: .3rem; padding: .4rem .8rem;
                          border-radius: 8px; border: 1.5px solid var(--color-border, #ddd);
                          cursor: pointer; font-size: .82rem; background: transparent; color: inherit;
                          transition: all .2s; }
        .ls-refresh-btn:hover { border-color: var(--color-primary, #e74c3c); color: var(--color-primary, #e74c3c); }

        /* ── Section header ── */
        .ls-section-header { font-size: .72rem; letter-spacing: .12em; font-weight: 700;
                             color: var(--color-muted, #888); margin: 1.5rem 0 .65rem; display: flex;
                             align-items: center; gap: .4rem; }
        .ls-section-header::before { content: ''; flex: 1; height: 1px; background: var(--color-border, #e0e0e0); }

        /* ── Match card ── */
        .ls-cards { display: flex; flex-direction: column; gap: .6rem; }
        .ls-card { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center;
                   gap: .75rem; padding: .9rem 1.1rem; border-radius: 12px;
                   background: var(--color-surface, #fff);
                   border: 1.5px solid var(--color-border, #e8e8e8);
                   transition: box-shadow .2s; }
        .ls-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,.08); }
        .ls-card--live { border-color: #e74c3c44; background: #fff5f5; }
        .ls-team { display: flex; align-items: center; gap: .55rem; }
        .ls-team--away { flex-direction: row-reverse; text-align: right; }
        .ls-team-name { font-size: .88rem; font-weight: 600; }
        .ls-logo { width: 28px; height: 28px; object-fit: contain; }
        .ls-logo-fallback { width: 28px; height: 28px; border-radius: 50%; background: var(--color-primary, #e74c3c);
                            color: #fff; font-size: .85rem; font-weight: 700;
                            display: flex; align-items: center; justify-content: center; }
        .ls-score { display: flex; flex-direction: column; align-items: center; gap: .2rem; min-width: 80px; }
        .ls-scoreline { font-size: 1.3rem; font-weight: 800; letter-spacing: .05em; }
        .ls-league-tag { font-size: .65rem; color: var(--color-muted, #999); font-weight: 600;
                         letter-spacing: .06em; }
        .ls-time { font-size: .75rem; color: var(--color-muted, #999); }

        /* ── Badge ── */
        .ls-badge { font-size: .68rem; font-weight: 700; padding: .15rem .45rem; border-radius: 99px;
                    letter-spacing: .06em; white-space: nowrap; display: inline-flex; align-items: center; gap: .25rem; }
        .ls-badge--live { background: #e74c3c; color: #fff; }
        .ls-badge__dot { width: 6px; height: 6px; border-radius: 50%; background: #fff; animation: ls-pulse 1.2s infinite; }
        @keyframes ls-pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
        .ls-badge--ft { background: #2ecc71; color: #fff; }
        .ls-badge--upcoming { background: var(--color-surface-alt, #eee); color: #666; }

        /* ── Standings ── */
        .ls-league-tabs { display: flex; gap: .4rem; flex-wrap: wrap; margin-bottom: 1.25rem; }
        .ls-league-tab { padding: .4rem .9rem; border-radius: 8px; border: 1.5px solid transparent;
                         font-size: .82rem; font-weight: 600; cursor: pointer; transition: all .2s;
                         background: var(--color-surface-alt, #f3f3f3); color: inherit; }
        .ls-league-tab--active { background: var(--color-primary, #e74c3c); color: #fff; }
        .ls-table-wrap { overflow-x: auto; border-radius: 12px; border: 1.5px solid var(--color-border, #e8e8e8); }
        .ls-table { width: 100%; border-collapse: collapse; font-size: .85rem; }
        .ls-table thead th { padding: .65rem .8rem; text-align: center; font-size: .7rem;
                             letter-spacing: .1em; color: var(--color-muted, #888); font-weight: 700;
                             border-bottom: 1.5px solid var(--color-border, #e8e8e8);
                             background: var(--color-surface-alt, #f8f8f8); }
        .ls-table thead th:first-child,
        .ls-table thead th:nth-child(2) { text-align: left; }
        .ls-table tbody tr { transition: background .15s; }
        .ls-table tbody tr:hover { background: var(--color-surface-alt, #f5f5f5); }
        .ls-table tbody tr:not(:last-child) td { border-bottom: 1px solid var(--color-border, #f0f0f0); }
        .ls-table td { padding: .65rem .8rem; text-align: center; vertical-align: middle; }
        .ls-table td:first-child { text-align: center; font-weight: 700; font-size: .8rem;
                                   color: var(--color-muted, #888); min-width: 30px; }
        .ls-table td:nth-child(2) { text-align: left; }
        .ls-team-cell { display: flex; align-items: center; gap: .5rem; }
        .ls-crest { width: 22px; height: 22px; object-fit: contain; }
        .ls-crest-fallback { width: 22px; height: 22px; border-radius: 50%; background: #ddd;
                             font-size: .7rem; display: flex; align-items: center; justify-content: center; font-weight:700; }
        .ls-pts { font-weight: 800; font-size: .95rem; }
        .ls-gd--pos { color: #27ae60; font-weight:700; }
        .ls-gd--neg { color: #e74c3c; font-weight:700; }
        .ls-form-dot { width: 18px; height: 18px; border-radius: 50%; font-size: .62rem; font-weight: 800;
                       display: inline-flex; align-items: center; justify-content: center; margin: 0 1px; }
        .ls-form--w { background: #27ae60; color: #fff; }
        .ls-form--d { background: #f39c12; color: #fff; }
        .ls-form--l { background: #e74c3c; color: #fff; }
        .ls-form-row { display: flex; gap: 2px; justify-content: center; }
        .ls-pos-cl  { border-left: 4px solid #3498db; }
        .ls-pos-el  { border-left: 4px solid #f39c12; }
        .ls-pos-rel { border-left: 4px solid #e74c3c; }

        /* ── Misc ── */
        .ls-empty { text-align: center; padding: 3rem 1rem; color: var(--color-muted, #888); }
        .ls-spinner { display: flex; justify-content: center; padding: 3rem; }
        .ls-error { text-align: center; padding: 2rem; color: #e74c3c; }
        .ls-count-badge { font-size: .72rem; background: var(--color-primary, #e74c3c);
                          color: #fff; border-radius: 99px; padding: .1rem .45rem; margin-left: .3rem; }
      `}</style>

      <div className="ls-page">
        {/* Hero */}
        <div className="ls-hero">
          <p className="ls-eyebrow">FOOTBALL HUB</p>
          <h1 className="ls-title">Live Scores &amp; Standings</h1>
          <p className="ls-subtitle">
            Real-time scores &amp; standings powered by ESPN — no login required
          </p>
        </div>

        {/* Tabs */}
        <div className="ls-tabs">
          <button
            className={`ls-tab ${tab === 'scores' ? 'ls-tab--active' : ''}`}
            onClick={() => setTab('scores')}
          >
            ⚡ Scores
            {liveMatches.length > 0 && (
              <span className="ls-count-badge">{liveMatches.length} LIVE</span>
            )}
          </button>
          <button
            className={`ls-tab ${tab === 'standings' ? 'ls-tab--active' : ''}`}
            onClick={() => setTab('standings')}
          >
            🏆 Standings
          </button>
        </div>

        {/* ── SCORES tab ─────────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {tab === 'scores' && (
            <motion.div key="scores" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="ls-toolbar">
                <select className="ls-select" value={scoreLeague} onChange={e => setScoreLeague(e.target.value)}>
                  {SCORE_LEAGUES.map(l => (
                    <option key={l.id} value={l.id}>{l.flag ? `${l.flag} ${l.name}` : l.name}</option>
                  ))}
                </select>
                <button className="ls-refresh-btn" onClick={loadMatches} disabled={loadingMatches}>
                  <RefreshCw size={13} className={loadingMatches ? 'animate-spin' : ''} />
                  Refresh
                </button>
                {lastUpdated && (
                  <span className="ls-updated">
                    Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>

              {loadingMatches && (
                <div className="ls-spinner"><Loader2 size={28} className="animate-spin" /></div>
              )}

              {matchError && <p className="ls-error">{matchError}</p>}

              {!loadingMatches && !matchError && (
                <>
                  {/* ── LIVE ── */}
                  {liveMatches.length > 0 && (
                    <>
                      <div className="ls-section-header">🔴 LIVE NOW ({liveMatches.length})</div>
                      <div className="ls-cards">
                        {liveMatches.map(m => <MatchCard key={m.id} match={m} />)}
                      </div>
                    </>
                  )}

                  {/* ── FINISHED ── */}
                  {finishedMatches.length > 0 && (
                    <>
                      <div className="ls-section-header">✅ FULL TIME ({finishedMatches.length})</div>
                      <div className="ls-cards">
                        {finishedMatches.map(m => <MatchCard key={m.id} match={m} />)}
                      </div>
                    </>
                  )}

                  {/* ── UPCOMING ── */}
                  {upcomingMatches.length > 0 && (
                    <>
                      <div className="ls-section-header">🕐 UPCOMING ({upcomingMatches.length})</div>
                      <div className="ls-cards">
                        {upcomingMatches.map(m => <MatchCard key={m.id} match={m} />)}
                      </div>
                    </>
                  )}

                  {matches.length === 0 && (
                    <p className="ls-empty">No matches found for today in this league.</p>
                  )}
                </>
              )}
            </motion.div>
          )}

          {/* ── STANDINGS tab ──────────────────────────────────────────────── */}
          {tab === 'standings' && (
            <motion.div key="standings" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {/* League selector */}
              <div className="ls-league-tabs">
                {STANDING_LEAGUES.map(l => (
                  <button
                    key={l.id}
                    className={`ls-league-tab ${standingLeague === l.id ? 'ls-league-tab--active' : ''}`}
                    onClick={() => setStandingLeague(l.id)}
                  >
                    {l.flag} {l.name}
                  </button>
                ))}
              </div>

              <div className="ls-toolbar">
                <button className="ls-refresh-btn" onClick={loadStandings} disabled={loadingStandings}>
                  <RefreshCw size={13} className={loadingStandings ? 'animate-spin' : ''} />
                  Refresh
                </button>
                {currentStandLeague && (
                  <span className="ls-updated">{currentStandLeague.flag} {currentStandLeague.name}</span>
                )}
              </div>

              {loadingStandings && (
                <div className="ls-spinner"><Loader2 size={28} className="animate-spin" /></div>
              )}

              {standError && <p className="ls-error">{standError}</p>}

              {!loadingStandings && !standError && standings.length > 0 && (
                <div className="ls-table-wrap">
                  <table className="ls-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Team</th>
                        <th title="Played">P</th>
                        <th title="Won" style={{ color: '#27ae60' }}>W</th>
                        <th title="Drawn">D</th>
                        <th title="Lost" style={{ color: '#e74c3c' }}>L</th>
                        <th title="Goals For">GF</th>
                        <th title="Goals Against">GA</th>
                        <th title="Goal Difference">GD</th>
                        <th title="Points">PTS</th>
                        <th title="Last 5 matches">Form</th>
                      </tr>
                    </thead>
                    <tbody>
                      {standings.map((row, i) => {
                        const pos = row.position;
                        // colour-code rows (CL, EL, relegation zones vary by league)
                        const rowCls = pos <= 4 ? 'ls-pos-cl'
                                     : pos >= standings.length - 2 ? 'ls-pos-rel'
                                     : '';
                        const gdCls = row.gd > 0 ? 'ls-gd--pos' : row.gd < 0 ? 'ls-gd--neg' : '';
                        const formLetters = (row.form || '').split(',').filter(Boolean).slice(-5);

                        return (
                          <tr key={row.team?.id || i} className={rowCls}>
                            <td>{pos}</td>
                            <td>
                              <div className="ls-team-cell">
                                {row.team?.crest
                                  ? <img src={row.team.crest} alt={row.team.name} className="ls-crest" />
                                  : <span className="ls-crest-fallback">{row.team?.name?.[0]}</span>
                                }
                                {row.team?.name}
                              </div>
                            </td>
                            <td>{row.played}</td>
                            <td style={{ color: '#27ae60', fontWeight: 700 }}>{row.won}</td>
                            <td>{row.drawn}</td>
                            <td style={{ color: '#e74c3c' }}>{row.lost}</td>
                            <td>{row.gf}</td>
                            <td>{row.ga}</td>
                            <td className={gdCls}>{row.gd > 0 ? `+${row.gd}` : row.gd}</td>
                            <td className="ls-pts">{row.points}</td>
                            <td>
                              <div className="ls-form-row">
                                {formLetters.map((l, j) => <FormDot key={j} result={l} />)}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {!loadingStandings && !standError && standings.length === 0 && (
                <p className="ls-empty">No standings available for this competition right now.</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

// ── Match card component ───────────────────────────────────────────────────────
function MatchCard({ match }) {
  const isLive = match.status === 'LIVE';
  const isFt   = match.status === 'FT';
  // Only display score for live or finished games — upcoming always show time
  const showScore = (isLive || isFt) && match.homeScore !== null && match.awayScore !== null;

  const dateStr = match.date
    ? new Date(match.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <motion.div
      className={`ls-card ${isLive ? 'ls-card--live' : ''}`}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      layout
    >
      {/* Home team */}
      <div className="ls-team">
        <TeamLogo src={match.homeTeam.logo} name={match.homeTeam.name} />
        <span className="ls-team-name">{match.homeTeam.name}</span>
      </div>

      {/* Centre: score / status */}
      <div className="ls-score">
        {showScore ? (
          <span className="ls-scoreline">{match.homeScore} – {match.awayScore}</span>
        ) : (
          <span className="ls-time">{dateStr}</span>
        )}
        <StatusBadge status={match.status} minute={match.minute} />
        <span className="ls-league-tag">{match.league}</span>
      </div>

      {/* Away team */}
      <div className="ls-team ls-team--away">
        <TeamLogo src={match.awayTeam.logo} name={match.awayTeam.name} />
        <span className="ls-team-name">{match.awayTeam.name}</span>
      </div>
    </motion.div>
  );
}
