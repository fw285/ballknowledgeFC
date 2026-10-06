/* ============================================================
   Draft Night FC · match engine
   A 2D football simulation in the spirit of Football Manager's
   match engine: 22 players with real attributes and playstyles,
   team tactics from the manager, a physical ball, duels, set
   pieces, fatigue, substitutions, momentum and live ratings.

   Deterministic: the same input gives the same match on every
   device. It only uses an integer RNG and + − × ÷ √ (no sin, exp
   or pow), so phones and laptops agree bit for bit.

   Coordinates are metres. x runs 0..105 along the pitch, y 0..68
   across it. "Team frame" (u, v): u = distance from your own goal
   line, v = across the pitch from your left touchline.
   ============================================================ */
export const ENGINE_VERSION = "3.1";
export const DT = 0.1;                 // seconds of match time per tick
const SUBSTEPS = 2, HS = DT / SUBSTEPS;
export const L = 105, W = 68;
const CY = 34, GH = 3.66, BAR = 2.44, BOX_D = 16.5, BOX_H = 20.16;
const sqrt = Math.sqrt, abs = Math.abs, min = Math.min, max = Math.max, floor = Math.floor, round = Math.round;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const hyp = (x, y) => sqrt(x * x + y * y);
const sq = x => x * x;
function tab(T, x) { if (x <= T[0][0]) return T[0][1]; for (let i = 1; i < T.length; i++) { if (x <= T[i][0]) { const a = T[i - 1], b = T[i]; return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]); } } return T[T.length - 1][1]; }
function mulberry(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export const GROUP = g => g === "GK" ? "GK" : (g === "CB" || g === "FB") ? "DEF" : (g === "DM" || g === "CM" || g === "AM") ? "MID" : "FWD";
// Positions a bench player can cover: his own, or a neighbouring role.
const COVER = { GK: ["GK"], CB: ["CB", "DM", "FB"], FB: ["FB", "CB", "W"], DM: ["DM", "CM", "CB"], CM: ["CM", "DM", "AM"], AM: ["AM", "CM", "W"], W: ["W", "AM", "FB", "ST"], ST: ["ST", "W", "AM"] };
const STRETCH = 1;
const num = (v, d) => typeof v === "number" && isFinite(v) && v > 0 ? v : d;

/* ---------- chance quality ---------- */
// sin of the angle the goal mouth subtends, then a distance factor. Table lookups keep it exact everywhere.
const XG_ANG = [[0, 0], [0.12, 0.008], [0.2, 0.02], [0.29, 0.045], [0.39, 0.085], [0.5, 0.15], [0.6, 0.26], [0.75, 0.38], [0.92, 0.5], [1, 0.56]];
const XG_DIST = [[0, 1], [12, 1], [20, 0.85], [30, 0.6], [40, 0.38]];
export function xgAt(dx, dy) {
  if (dx < 0.3) dx = 0.3;
  const a1 = hyp(dx, dy - GH), a2 = hyp(dx, dy + GH);
  return tab(XG_ANG, (2 * GH * dx) / (a1 * a2)) * tab(XG_DIST, hyp(dx, dy));
}
// How dangerous it is to have the ball here (team frame).
function threat(u, v) {
  const dx = L - u, dy = abs(v - CY);
  let th = 0.004 + 0.02 * sq(u / L) + 0.05 * sq(max(0, u - 62) / 43);
  if (dx < 32 && dy < 24) th += 0.45 * xgAt(dx, dy);
  return th;
}
const lossCost = u => 0.012 + 0.07 * sq(1 - clamp(u, 0, L) / L) + (u < 22 ? 0.04 : 0);

/* ---------- players: attributes, playstyles ---------- */
export const ATTR_KEYS = ["pac", "dri", "pas", "vis", "cro", "fin", "lon", "hea", "tac", "mar", "str", "sta", "agg", "com"];
export const GK_KEYS = ["gkr", "gkh", "gkd", "gks"];
export const PLAYSTYLES = ["poacher", "target man", "false nine", "complete forward", "pressing forward", "inverted winger", "touchline winger", "advanced playmaker", "deep-lying playmaker", "box-to-box", "ball-winner", "anchor", "mezzala", "ball-playing defender", "stopper", "overlapping full-back", "inverted full-back", "wing-back", "sweeper keeper", "shot-stopper", "dribbler", "long-shot taker", "set-piece specialist", "aerial threat", "speedster", "clinical finisher", "engine"];
export function deriveAttrs(pl, g) {
  const r = num(pl.rating, 72), pc = num(pl.pace, 68), G = GROUP(g);
  const at = num(pl.attack, G === "FWD" ? r + 2 : G === "MID" ? r - 6 : G === "DEF" ? r - 30 : 20);
  const df = num(pl.defense, G === "DEF" ? r + 2 : G === "MID" ? r - 8 : G === "GK" ? r : r - 40);
  let o;
  if (G === "GK") o = { pac: pc - 15, dri: 40, pas: r - 22, vis: r - 25, cro: 30, fin: 20, lon: 30, hea: 40, tac: 30, mar: 40, str: r - 10, sta: r - 20, agg: 45, com: r - 6, gkr: r + 1, gkh: r - 2, gkd: r - 1, gks: r - 12 };
  else if (g === "CB") o = { pac: pc, dri: r - 24, pas: r - 12, vis: r - 20, cro: r - 28, fin: at - 5, lon: at, hea: df, tac: df + 2, mar: df + 2, str: r + 1, sta: r - 6, agg: 66, com: r - 4 };
  else if (g === "FB") o = { pac: pc, dri: r - 10, pas: r - 8, vis: r - 14, cro: r - 5, fin: at - 8, lon: at - 6, hea: r - 16, tac: df - 2, mar: df - 4, str: r - 12, sta: r + 2, agg: 60, com: r - 6 };
  else if (g === "DM") o = { pac: pc, dri: r - 10, pas: r - 1, vis: r - 6, cro: r - 16, fin: at - 10, lon: at - 2, hea: r - 12, tac: df + 2, mar: df + 2, str: r - 4, sta: r + 2, agg: 66, com: r };
  else if (g === "CM") o = { pac: pc, dri: r - 4, pas: r + 2, vis: r, cro: r - 10, fin: at - 6, lon: at - 2, hea: r - 16, tac: df, mar: df - 2, str: r - 8, sta: r + 3, agg: 58, com: r };
  else if (g === "AM") o = { pac: pc, dri: r + 2, pas: r + 1, vis: r + 3, cro: r - 8, fin: at - 2, lon: at - 2, hea: r - 22, tac: df - 4, mar: df - 6, str: r - 14, sta: r - 2, agg: 50, com: r + 1 };
  else if (g === "W") o = { pac: pc, dri: at + 2, pas: r - 6, vis: r - 6, cro: r - 2, fin: at - 6, lon: at - 8, hea: r - 24, tac: df, mar: df - 4, str: r - 14, sta: r - 2, agg: 50, com: r - 3 };
  else o = { pac: pc, dri: at - 4, pas: r - 12, vis: r - 10, cro: r - 18, fin: at + 2, lon: at - 8, hea: r - 6, tac: df, mar: df - 6, str: r - 4, sta: r - 8, agg: 56, com: r - 2 };
  if (o.gkr == null) Object.assign(o, { gkr: 20, gkh: 20, gkd: 30, gks: 20 });
  return o;
}
function normAttrs(pl, g) {
  const d = deriveAttrs(pl, g), src = pl.attrs && typeof pl.attrs === "object" ? pl.attrs : {}, o = {};
  for (const k of Object.keys(d)) o[k] = clamp(num(src[k], d[k]), 15, 99) / 100;
  if (pl.golden) for (const k of Object.keys(o)) o[k] = min(0.99, o[k] + 0.04);
  // stretch the scale around 75 so the gap between good and elite players shows on the pitch
  for (const k of Object.keys(o)) o[k] = clamp(0.75 + (o[k] - 0.75) * STRETCH, 0.1, 1.04);
  return o;
}

/* ---------- tactics ---------- */
export const STYLE_TACTICS = {
  possession: { press: 8, line: 8, width: 7, tempo: 4, mentality: 6, buildUp: "short", fullbacks: "inverted", counter: false },
  pressing: { press: 9, line: 7, width: 6, tempo: 8, mentality: 7, buildUp: "mixed", fullbacks: "overlapping", counter: true },
  counter: { press: 4, line: 3, width: 5, tempo: 8, mentality: 4, buildUp: "direct", fullbacks: "conservative", counter: true },
  pragmatic: { press: 5, line: 5, width: 5, tempo: 5, mentality: 5, buildUp: "mixed", fullbacks: "overlapping", counter: false },
  direct: { press: 6, line: 5, width: 7, tempo: 7, mentality: 6, buildUp: "direct", fullbacks: "overlapping", counter: false }
};
export function defaultTactics(manager) {
  const style = manager && !manager.none && STYLE_TACTICS[manager.style] ? manager.style : "pragmatic";
  const t = { ...STYLE_TACTICS[style] };
  if (manager && manager.tactics && typeof manager.tactics === "object") for (const k of Object.keys(t)) if (manager.tactics[k] != null && manager.tactics[k] !== "") t[k] = manager.tactics[k];
  return t;
}
function normTac(t) {
  t = t || {};
  const n = k => clamp(((+t[k] || 5) - 1) / 9, 0, 1);
  return {
    press: n("press"), line: n("line"), width: n("width"), tempo: n("tempo"), mentality: n("mentality"),
    buildUp: ["short", "mixed", "direct"].includes(t.buildUp) ? t.buildUp : "mixed",
    fullbacks: ["inverted", "overlapping", "wingbacks", "conservative"].includes(t.fullbacks) ? t.fullbacks : "overlapping",
    counter: !!t.counter
  };
}
const WEATHER = {
  "Clear": { fric: 1.3, err: 1, wind: 1, longOK: 1 }, "Light rain": { fric: 1.15, err: 1.05, wind: 1, longOK: 1 },
  "Heavy rain": { fric: 0.95, err: 1.14, wind: 1.05, longOK: 0.9 }, "Strong wind": { fric: 1.3, err: 1.03, wind: 1.4, longOK: 0.8 },
  "Cold and clear": { fric: 1.35, err: 1.01, wind: 1, longOK: 1 }, "Fog": { fric: 1.3, err: 1.04, wind: 1, longOK: 0.6 }
};
const REF = { Strict: { foul: 1.25, card: 1.5 }, Average: { foul: 1, card: 1 }, Lenient: { foul: 0.8, card: 0.6 } };

/* ============================================================
   simulateMatch(input) → full match
   input = { seed, teams:{ A:{name, slots:[{k,label,g,x,y,player}], bench:[player], manager, stadium, aura, captain, tactics, links:[[k,k]]}, B:{...} } }
   ============================================================ */
export function simulateMatch(input) {
  const R = mulberry((input.seed >>> 0) || 1);
  const rr = (a, b) => a + R() * (b - a);
  const gauss = () => (R() + R() + R() - 1.5) * 2;
  const d6 = () => 1 + floor(R() * 6);

  /* ---------- people ---------- */
  const ents = [], T = {};
  function benchGroup(pl) { const ps = (pl.positions || []).map(x => String(x).toUpperCase()); for (const g of ["GK", "CB", "FB", "DM", "CM", "AM", "W", "ST"]) if (ps.some(p => p === g || (g === "FB" && /B$/.test(p) && p !== "CB") || (g === "W" && /W$/.test(p)) || (g === "ST" && (p === "CF" || p === "ST")))) return g; return "CM"; }
  function mkPlayer(team, pl, slot) {
    const g = slot ? slot.g : benchGroup(pl);
    const p = {
      id: ents.length, team, name: String(pl.name), slot, g, G: GROUP(g), a: normAttrs(pl, g), tags: new Set((pl.tags || []).map(t => String(t).toLowerCase())),
      foot: pl.foot || "R", h: clamp(num(pl.heightCm, 181), 160, 205) / 100, golden: !!pl.golden, meme: !!pl.isMeme, ovr: num(pl.rating, 70),
      x: -20, y: -20, vx: 0, vy: 0, fx: 1, fy: 0, on: false, playing: false, state: "bench", energy: 1,
      rating: pl.golden ? 6.7 : 6.35, yellow: 0, tx: 0, ty: 0, urg: 1, think: 0, run: null, runCd: 0, recv: null, stun: 0, tackleCd: 0,
      nextDec: 0, lag: 0, controlUntil: 0, duelCd: 0, carryStart: 0, firstTime: false, volley: false, restartKick: false, fadeIn: null, fadeLen: 0.5, fadeAt: null, goneAt: null, carry: null, hands: false, dive: null, nu: rr(-1, 1), nv: rr(-1, 1), enteredAt: 0, lastPass: null, lastBeat: -999,
      st: { passes: 0, passOk: 0, shots: 0, onT: 0, goals: 0, assists: 0, tackles: 0, intercepts: 0, dribbles: 0, saves: 0, keyPasses: 0, fouls: 0 }
    };
    p.g0 = g;
    p.vmax = (p.G === "GK" ? 5.2 + 3.0 * p.a.pac : 5.6 + 4.0 * p.a.pac) * (p.tags.has("speedster") ? 1.03 : 1);
    p.acc = 3.2 + 2.8 * p.a.pac;
    ents.push(p); return p;
  }
  for (const side of ["A", "B"]) {
    const ti = input.teams[side];
    const team = {
      side, name: ti.name || side, players: [], bench: [], onPitch: [], score: 0, subs: 0, links: new Set(), ctx: {},
      tacBase: normTac(ti.tactics || defaultTactics(ti.manager)), aura: ti.aura && !ti.aura.none && ti.aura.trigger ? ti.aura : null,
      captain: ti.captain || null, stadium: ti.stadium && !ti.stadium.none && !ti.stadium.isMeme ? ti.stadium : (ti.stadium && ti.stadium.isMeme ? ti.stadium : null),
      momP: 0.3, momEff: 0, shout: 0, shut: false, auraState: {}, minusComp: 0, minusOrg: 0, minusUntil: 0,
      stats: { shots: 0, onT: 0, xg: 0, passes: 0, passOk: 0, possTicks: 0, corners: 0, fouls: 0, yellows: 0, reds: 0, offsides: 0, saves: 0, tackles: 0, bigChances: 0 }
    };
    team.mgrRating = ti.manager && !ti.manager.none ? clamp(num(ti.manager.rating, 75), 40, 99) : 58;
    team.mgr = (team.mgrRating - 50) / 49;
    for (const [a, b] of (ti.links || [])) { team.links.add(a + "|" + b); team.links.add(b + "|" + a); }
    team.org = clamp(0.3 + 0.62 * team.mgr + 0.006 * min(14, (ti.links || []).length), 0.15, 1);
    for (const sl of ti.slots) if (sl && sl.player && sl.player.name) team.players.push(mkPlayer(team, sl.player, sl));
    for (const pl of (ti.bench || [])) if (pl && pl.name) team.bench.push(mkPlayer(team, pl, null));
    team.tac = { ...team.tacBase };
    T[side] = team;
  }
  T.A.opp = T.B; T.B.opp = T.A;
  const teams = [T.A, T.B];

  /* ---------- pre-match rolls ---------- */
  const rolls = {};
  for (const team of teams) {
    if (!team.players.length) continue;
    // the keeper only gets injured if there's a keeper on the bench to replace him
    const pool = team.bench.some(b => b.G === "GK") ? team.players : team.players.filter(p => p.G !== "GK");
    const victim = pool[floor(R() * pool.length)], roll = d6();
    rolls["injury" + team.side] = { who: victim.name, roll };
    if (roll === 1) {
      const repl = team.bench.find(b => b.g0 === victim.slot.g) || team.bench.find(b => (COVER[b.g0] || []).includes(victim.slot.g)) || team.bench.find(b => b.G === victim.G) || team.bench.find(b => b.G !== "GK") || team.bench[0];
      const i = team.players.indexOf(victim); victim.state = "injured";
      if (repl) { team.bench.splice(team.bench.indexOf(repl), 1); repl.slot = victim.slot; repl.g = victim.slot.g; team.players.splice(i, 1, repl); rolls["injury" + team.side].replacedBy = repl.name; }
      else team.players.splice(i, 1);
    }
  }
  const okStadium = t => t.stadium && t.stadium.name && !t.stadium.none;
  const vRoll = d6(); let host = vRoll <= 3 ? T.A : T.B; if (!okStadium(host)) host = host.opp;
  const stadium = okStadium(host) ? host.stadium : null, home = stadium ? host : null;
  rolls.venue = { roll: vRoll, host: home ? home.side : null, name: stadium ? stadium.name : "A neutral ground" };
  const wR = d6(), weather = ["Clear", "Light rain", "Heavy rain", "Strong wind", "Cold and clear", "Fog"][wR - 1]; rolls.weather = { roll: wR, name: weather };
  const rR = d6(), refType = rR <= 2 ? "Strict" : rR <= 4 ? "Average" : "Lenient"; rolls.ref = { roll: rR, name: refType };
  const WX = WEATHER[weather], RF = REF[refType], FRIC = WX.fric;
  const atm = stadium ? clamp(num(stadium.atmosphere, 6), 1, 10) / 10 : 0;
  const alt = stadium ? max(0, num(stadium.altitudeMeters, 0)) : 0;
  const homeComp = team => !home ? 0 : team === home ? 0.045 * atm : -0.045 * atm;
  const momMul = team => !home ? 1 : team === home ? 1 + 0.6 * atm : 1 - 0.2 * atm;
  const drainMul = team => (home && team !== home && alt > 1200 ? 1 + min(alt, 3600) / 4000 : 1);

  /* ---------- state ---------- */
  const DBG = { pass: {}, lost: {}, ctrlFail: 0, intercept: 0, outPass: 0, end: {}, chains: [], gk: { att: 0, saved: 0, goalNoTry: 0, gap: [] }, takeon: 0 };
  const DEBUG = !!input.debug;
  const CHAIN = [];
  const chain = (s) => { CHAIN.push((S.tick) + ":" + s); if (CHAIN.length > 12) CHAIN.shift(); };
  const passEnd = (why) => { if (B.pass && B.pass.to && B.pass.from && !B.pass.ended) { B.pass.ended = 1; const k = B.pass.kind + ":" + why; DBG.end[k] = (DBG.end[k] || 0) + 1; } };
  const S = { tick: 0, half: 1, clock: 0, add1: 1 + floor(R() * 3), add2: 3, restart: null, poss: null, possId: 0, lastPossChange: { A: 0, B: 0 }, wonAt: { A: null, B: null }, lastShot: { A: -999, B: -999 }, shootout: false, events: [], htTick: null, ftTick: null, auraLate: false, attackFlag: -1, lastSubCheck: null, lastSubTick: -1, kick: null, endTick: 0, recentShot: null };
  const B = { x: L / 2, y: CY, z: 0, vx: 0, vy: 0, vz: 0, owner: null, last: null, lastTeam: null, mode: "dead", pass: null, shot: null, tried: {}, flight: 0, stillSince: 0, kicker: null, kickTick: 0, kickPos: null, ogFlight: -1 };
  const dir = team => ((team.side === "A") === (S.half === 1)) ? 1 : -1;
  const U = (team, x) => dir(team) > 0 ? x : L - x;
  const V = (team, y) => dir(team) > 0 ? y : W - y;
  const XY = (team, u, v) => dir(team) > 0 ? { x: u, y: v } : { x: L - u, y: W - v };
  const gkOf = team => team.onPitch.find(p => p.G === "GK") || null;
  const nearestOf = (list, x, y, f) => { let best = null, bd = 1e9; for (const p of list) { if (f && !f(p)) continue; const d = hyp(p.x - x, p.y - y); if (d < bd) { bd = d; best = p; } } return best ? { p: best, d: bd } : null; };
  const byDist = (x, y) => (a, b) => (hyp(a.x - x, a.y - y) - hyp(b.x - x, b.y - y)) || (a.id - b.id);
  const inOwnBox = p => U(p.team, p.x) < BOX_D && abs(V(p.team, p.y) - CY) < BOX_H;
  const clockMin = () => S.clock / 60;
  function ev(type, o) { const e = { tick: S.tick, clock: round(S.clock), half: S.half, type, ...o }; S.events.push(e); return e; }
  function rate(p, d) { if (!p) return; const k = d > 0 ? 0.55 * (p.rating > 8 ? 0.6 : 1) : 0.75; p.rating = clamp(p.rating + d * k, 3, 10); }
  function addMom(team, v) { team.momP += v * momMul(team); }
  const pid = p => p ? p.id : null;

  /* ---------- recording ---------- */
  const MAXT = 66000, E = ents.length;
  const REC = { X: new Int16Array(MAXT * E), Y: new Int16Array(MAXT * E), F: new Uint8Array(MAXT * E), BX: new Int16Array(MAXT), BY: new Int16Array(MAXT), BZ: new Int16Array(MAXT), OW: new Int8Array(MAXT), PO: new Uint8Array(MAXT), CL: new Uint16Array(MAXT), MD: new Uint8Array(MAXT) };
  const MOM = [], RAT = ents.map(() => []), STA = ents.map(() => []);
  function record() {
    const k = S.tick; if (k >= MAXT) return;
    for (let i = 0; i < E; i++) { const p = ents[i]; REC.X[k * E + i] = round(p.x * 10); REC.Y[k * E + i] = round(p.y * 10); REC.F[k * E + i] = (p.on ? 1 : 0) | (p.playing ? 2 : 0) | (p.hands ? 4 : 0) | (p.dive ? 8 : 0); }
    REC.BX[k] = round(B.x * 10); REC.BY[k] = round(B.y * 10); REC.BZ[k] = round(B.z * 10);
    REC.OW[k] = B.owner ? B.owner.id : -1; REC.PO[k] = controlled() ? (S.poss === T.B ? 1 : 0) : 2; REC.CL[k] = round(S.clock);
    REC.MD[k] = S.shootout ? 4 : B.mode === "dead" ? 1 : 0;
    if (k % 100 === 0) { MOM.push(round(momentum() * 100)); for (let i = 0; i < E; i++) { RAT[i].push(ents[i].on || ents[i].state === "off" ? round(ents[i].rating * 10) : 0); STA[i].push(ents[i].state === "bench" || ents[i].state === "injured" ? 0 : round(ents[i].energy * 100)); } }
  }
  // possession only counts while a team has the ball or a pass is on its way to a teammate (not loose balls or clearances)
  const controlled = () => !!(B.owner || (B.pass && B.pass.to && B.pass.from && B.pass.from.team === B.pass.to.team && B.pass.kind !== "clear"));
  const momentum = () => (T.A.momP - T.B.momP) / (T.A.momP + T.B.momP + 0.8);

  /* ---------- line-ups on the pitch ---------- */
  function enter(p) { p.on = true; p.playing = true; p.state = "play"; p.enteredAt = S.tick; if (!p.team.onPitch.includes(p)) p.team.onPitch.push(p); }
  for (const team of teams) for (const p of team.players) enter(p);

  /* ---------- context: who has it, lines, roles ---------- */
  function updateContext() {
    let poss = B.mode === "dead" && S.restart ? S.restart.team : B.owner ? B.owner.team : B.pass && B.pass.from ? B.pass.from.team : B.lastTeam;
    if (poss && poss !== S.poss) { S.lastPossChange[poss.side] = S.tick; S.possId++; S.wonAt[poss.side] = U(poss, B.x); }
    S.poss = poss;
    for (const team of teams) {
      const c = team.ctx; c.own = poss === team; c.bu = U(team, B.x); c.bv = V(team, B.y);
      let a1 = -1, a2 = -1;
      for (const o of team.opp.onPitch) { const u = U(team, o.x); if (u > a1) { a2 = a1; a1 = u; } else if (u > a2) a2 = u; }
      c.offU = max(L / 2, a2, c.own ? c.bu : 0);
    }
  }
  function landing() {
    if (B.z > 0.05 || B.vz > 0.05) { const t = (B.vz + sqrt(B.vz * B.vz + 2 * 9.81 * max(0, B.z))) / 9.81; return { x: clamp(B.x + B.vx * t, 0.5, L - 0.5), y: clamp(B.y + B.vy * t, 0.5, W - 0.5) }; }
    const sp = hyp(B.vx, B.vy); if (sp < 0.2) return { x: B.x, y: B.y };
    const d = min(30, sp * sp / (2 * (FRIC + 0.02 * sp))); return { x: clamp(B.x + B.vx / sp * d, 0.5, L - 0.5), y: clamp(B.y + B.vy / sp * d, 0.5, W - 0.5) };
  }
  function roles(team) {
    const c = team.ctx, opp = team.opp, tac = team.tac;
    c.pressers = []; c.support = []; c.marks = new Map(); c.chasers = [];
    if (B.mode !== "play") return;
    const free = !B.owner;
    if (free && !(B.pass && B.pass.to && B.pass.to.team === team)) {
      const pt = landing(); c.chasePt = pt;
      const behind = B.pass && B.pass.to && B.pass.to.team !== team && (B.pass.kind === "through" || B.pass.kind === "over" || (B.pass.loft && U(team, pt.x) < 30));
      const n = B.pass && B.pass.to && B.pass.to.team !== team ? (behind ? 2 : hyp(B.pass.to.x - pt.x, B.pass.to.y - pt.y) > 4 ? 1 : 0) : 2;
      const ptU = U(team, pt.x);
      const firstOpp = nearestOf(opp.onPitch, pt.x, pt.y);
      const gkCan = p => { const reach = p.tags.has("sweeper keeper") || p.a.gks > 0.75 ? 22 : 16.5; if (ptU > reach || abs(V(team, pt.y) - CY) > 18) return false; const tg = hyp(p.x - pt.x, p.y - pt.y) / p.vmax, to = firstOpp ? firstOpp.d / firstOpp.p.vmax : 99; return tg < to - 0.15; };
      c.chasers = team.onPitch.filter(p => (p.G !== "GK" || gkCan(p)) && (p.G !== "DEF" || ptU < 40 || hyp(p.x - pt.x, p.y - pt.y) < 12)).sort(byDist(pt.x, pt.y)).slice(0, n);
    }
    if (B.owner && B.owner.team === team) c.support = team.onPitch.filter(p => p !== B.owner && p.G !== "GK" && !p.run && !p.recv).sort(byDist(B.owner.x, B.owner.y)).slice(0, 2);
    if (B.owner && B.owner.team === opp && !B.owner.hands) {
      const counterpress = S.tick - S.lastPossChange[opp.side] < 35 && tac.press > 0.45;
      const engage = c.bu < 36 + 54 * tac.press || counterpress || c.bu < 30;
      // in the final third the nearest defender steps out to confront the carrier
      if (c.bu < 34) {
        // the engaging defender must be goal-side of the ball; when one is beaten the next one steps across
        const cand = team.onPitch.filter(p => p.G !== "GK" && p.stun <= S.tick && U(team, p.x) < c.bu - 0.3 && hyp(p.x - B.owner.x, p.y - B.owner.y) < 16 && (p.G === "DEF" || hyp(p.x - B.owner.x, p.y - B.owner.y) < 7)).sort(byDist(B.owner.x, B.owner.y));
        if (cand[0]) c.pressers.push(cand[0]);
        if (c.bu < 26 && cand[1] && hyp(cand[1].x - B.owner.x, cand[1].y - B.owner.y) < 9) c.pressers.push(cand[1]);
      }
      if (engage) {
        const n = 1 + (tac.press > 0.6 ? 1 : 0) + (counterpress ? 1 : 0);
        const cand = team.onPitch.filter(p => p.G !== "GK" && p.stun <= S.tick && !c.pressers.includes(p) && (p.G !== "DEF" || (c.bu < 34 && hyp(p.x - B.owner.x, p.y - B.owner.y) < 9))).sort(byDist(B.owner.x, B.owner.y));
        let defs = c.pressers.length; for (const p of cand) { if (c.pressers.length >= n + defs) break; if (c.pressers.includes(p)) continue; if (p.G === "DEF") { if (defs) continue; defs++; } c.pressers.push(p); }
      }
    }
    if (!c.own) {
      const mine = team.onPitch.filter(p => p.G !== "GK" && !c.pressers.includes(p) && !c.chasers.includes(p));
      const theirs = opp.onPitch.filter(o => o.G !== "GK" && o !== B.owner && U(team, o.x) < 62);
      const pairs = [];
      // the most advanced attackers are the defenders' responsibility first
      for (const m of mine) for (const o of theirs) { let d = hyp(m.x - o.x, m.y - o.y); if (m.G === "DEF" && U(team, o.x) < 30) d -= 4; if (o.run) d -= 3; if (d < 14) pairs.push([d, m, o]); }
      pairs.sort((a, b) => a[0] - b[0] || a[1].id - b[1].id || a[2].id - b[2].id);
      const usedM = new Set(), usedO = new Set();
      for (const [, m, o] of pairs) { if (usedM.has(m.id) || usedO.has(o.id)) continue; usedM.add(m.id); usedO.add(o.id); c.marks.set(m.id, o); }
    }
  }

  /* ---------- off-ball movement ---------- */
  const SPD = [0.32, 0.55, 0.76, 1];
  function setXY(p, u, v, urg) { if (dir(p.team) > 0) { p.tx = u; p.ty = v; } else { p.tx = L - u; p.ty = W - v; } p.urg = urg; }
  function setT(p, x, y, urg) { p.tx = x; p.ty = y; p.urg = urg; }
  function think(p) {
    const team = p.team, c = team.ctx;
    if (p === B.owner) return;
    if (p.recv && S.tick <= p.recv.until && B.pass && B.pass.to === p) { setT(p, p.recv.x, p.recv.y, 3); return; }
    if (p.recv && S.tick > p.recv.until) p.recv = null;
    if (B.mode === "dead") { setPieceTarget(p); return; }
    if (p.G === "GK" && B.shot && B.shot.team !== team) return;     // diving
    if (c.chasers.includes(p)) { setT(p, c.chasePt.x, c.chasePt.y, 3); return; }
    if (c.own) attackTarget(p); else defendTarget(p);
  }
  function attackTarget(p) {
    const team = p.team, c = team.ctx, tac = team.tac, s = p.slot;
    if (!s) { setT(p, p.x, p.y, 1); return; }
    if (p.G === "GK") { const sw = p.tags.has("sweeper keeper"); setXY(p, clamp(5 + (sw ? 15 : 8) * tac.line * (c.bu / L), 3, sw ? 22 : 15), CY + (c.bv - CY) * 0.1, 1); return; }
    const q = clamp((s.y - 19) / 67, 0, 1), v0 = s.x / 100 * W, side = v0 < CY ? -1 : 1, edge = side < 0 ? 3 : W - 3;
    const def = clamp(15 + 22 * tac.line + 0.5 * (c.bu - 30), 12, 58);
    let front = min(def + 34 + 14 * tac.mentality, c.offU - 0.6); if (front < def + 16) front = def + 16;
    let u = def + q * (front - def), v = CY + (v0 - CY) * (0.78 + 0.36 * tac.width), urg = 1;
    const g = s.g;
    if (g === "FB") {
      const fb = tac.fullbacks;
      if (fb === "overlapping") { if (c.bu > 38) { u = max(u, min(c.bu + 3, front - 5)); v = lerp(v, edge, 0.7); } }
      else if (fb === "wingbacks") { u = max(u, min(c.bu + 6, front - 3), def + 26); v = lerp(v, edge, 0.85); }
      else if (fb === "inverted") { u = def + 13; v = CY + side * 10; }
      else u = def + 2;
      if (p.tags.has("inverted full-back") && fb !== "inverted" && c.bu > 45) { v = lerp(v, CY + side * 12, 0.6); }
    } else if (g === "W") {
      const fbHigh = tac.fullbacks === "overlapping" || tac.fullbacks === "wingbacks";
      if (p.tags.has("inverted winger")) { if (c.bu > 45) v = CY + side * 12; }
      else if (p.tags.has("touchline winger")) v = lerp(v, edge, 0.8);
      else if (fbHigh && c.bu > 50) v = lerp(v, CY, 0.25);
      else if (tac.fullbacks === "inverted") v = lerp(v, edge, 0.6);
    } else if (g === "ST") {
      if (p.tags.has("false nine")) u -= 11;
      else if (p.tags.has("target man") || p.tags.has("poacher")) u = front;
      if (p.tags.has("poacher")) v = lerp(v, CY, 0.5);
    } else if (g === "AM") { if (abs(v - CY) > 8) v = CY + side * 10; }
    else if (g === "DM" || p.tags.has("anchor")) { u = def + 9; v = lerp(v, CY, 0.5); }
    else if (g === "CB" && p.tags.has("ball-playing defender") && c.bu < 50) u += 3;
    if (g === "CM" && (p.tags.has("box-to-box") || p.tags.has("mezzala")) && c.bu > 60) { u += 8; if (p.tags.has("mezzala")) v = CY + side * 13; }
    if (g === "CM" && p.tags.has("deep-lying playmaker")) { u = def + 11; v = lerp(v, CY, 0.4); }
    const err = (1 - team.org) * 3; u += p.nu * err; v += p.nv * err;
    // rest defence: centre-backs (and holding full-backs/DMs) stay goal-side of the opposition's most advanced forwards
    if (g === "CB" || (g === "FB" && (tac.fullbacks === "conservative" || tac.fullbacks === "inverted")) || (g === "DM" && tac.mentality < 0.6)) {
      let deep = L; for (const o of team.opp.onPitch) { if (o.G === "GK") continue; const ou = U(team, o.x); if (ou < deep) deep = ou; }
      // all-out attack pushes the last line up too, so there's less cover when the ball is lost
      const allOut = max(0, tac.mentality - 0.6) / 0.4;
      const cushion = g === "CB" ? max(1.5, 4 + 4 * (1 - tac.line) - 2.5 * allOut) : 1;
      u = min(u, deep - cushion, g === "CB" ? 46 + 6 * tac.line + 8 * allOut : 60);
    }
    if (c.support.includes(p) && B.owner) {
      const ou = U(team, B.owner.x), ov = V(team, B.owner.y); let du = u - ou, dv = v - ov; const d = hyp(du, dv) || 1, want = clamp(d, 9, 16);
      u = ou + du / d * want; v = ov + dv / d * want; urg = 2;
    }
    if (p.run) { if (S.tick > p.run.until || !c.own) p.run = null; else { u = p.run.u; v = p.run.v; urg = 3; if (p.run.hold) u = min(u, c.offU - 0.4); } }
    else maybeRun(p, u, v);
    setXY(p, clamp(u, 1, L - 1), clamp(v, 1, W - 1), urg);
  }
  function maybeRun(p, u, v) {
    const team = p.team, c = team.ctx, tac = team.tac;
    if (!B.owner || B.owner.team !== team || B.owner === p || S.tick < p.runCd) return;
    const wideFinal = c.bu > L - 30 && abs(c.bv - CY) > 13, g = p.slot.g;
    let pr = 0, ru = u, rv = v, hold = false;
    if (wideFinal && p.G !== "DEF") {
      const bs = c.bv < CY ? -1 : 1;
      if (g === "ST") { pr = 0.55; ru = L - rr(5, 9); rv = CY + bs * rr(0, 5); }
      else if (g === "W" && (p.slot.x < 50 ? -1 : 1) !== bs) { pr = 0.45; ru = L - rr(4, 8); rv = CY - bs * rr(3, 7); }
      else if (g === "AM" || (g === "CM" && (p.tags.has("box-to-box") || tac.mentality > 0.6))) { pr = 0.3; ru = L - rr(10, 17); rv = CY + rr(-6, 6); }
    } else if (c.bu > (L - c.offU > 28 ? 6 : 22) && (p.G === "FWD" || (g === "AM" && tac.mentality > 0.5))) {
      pr = 0.06 + 0.1 * tac.mentality + 0.07 * tac.tempo + (p.tags.has("pressing forward") || p.tags.has("speedster") || p.tags.has("complete forward") ? 0.06 : 0) - (p.tags.has("false nine") || p.tags.has("target man") ? 0.05 : 0);
      // a high line leaves acres behind it: quick forwards keep testing it
      const space = L - c.offU; pr *= clamp((space - 14) / 12, 0.5, 2.6) * (0.7 + 0.6 * p.a.pac);
      ru = c.offU + rr(6, 14) + max(0, space - 25) * 0.3; rv = clamp(v + rr(-7, 7), 4, W - 4); hold = true;
    } else if (g === "FB" && (tac.fullbacks === "overlapping" || tac.fullbacks === "wingbacks" || p.tags.has("overlapping full-back") || p.tags.has("wing-back")) && c.bu > 45 && abs(c.bv - (p.slot.x < 50 ? 0 : W)) < 26) {
      pr = 0.13; ru = min(c.bu + 14, L - 12); rv = p.slot.x < 50 ? 3 : W - 3;
    }
    if (pr && R() < pr * 0.18) { p.run = { u: ru, v: rv, hold, until: S.tick + floor(rr(25, 42)) }; p.runCd = S.tick + floor(rr(60, 110)); }
  }
  function defendTarget(p) {
    const team = p.team, c = team.ctx, tac = team.tac, s = p.slot;
    if (!s) { setT(p, p.x, p.y, 1); return; }
    if (p.G === "GK") { gkPosition(p); return; }
    if (c.pressers.includes(p) && B.owner) {
      // jockey: get goal-side of where the carrier is going, not where he was
      const o = B.owner, ax = o.x + o.vx * 0.45, ay = o.y + o.vy * 0.45, g = XY(team, 0, CY), d = hyp(g.x - ax, g.y - ay) || 1;
      setT(p, ax + (g.x - ax) / d * 0.9, ay + (g.y - ay) / d * 0.9, 3); return;
    }
    const q = clamp((s.y - 19) / 67, 0, 1), v0 = s.x / 100 * W;
    const blockDef = 16 + 26 * tac.line;
    // the back line sits on the edge of the box when play is close, and only drops in when the ball is in the box
    const inBox = c.bu < BOX_D + 1 && abs(c.bv - CY) < BOX_H + 2;
    const def = inBox ? clamp(c.bu - 3, 5.5, 12.5) : clamp(lerp(15.5, blockDef, clamp((c.bu - 20) / 38, 0, 1)), 14.5, 44);
    // the block compresses as the ball nears our goal: two banks around the box, the striker left up as an outlet
    const span = lerp(10.5, 22 + 12 * tac.line, clamp((c.bu - 18) / 40, 0, 1));
    let u = def + q * span, v = CY + (v0 - CY) * 0.6 + (c.bv - CY) * 0.4, urg = 1;
    if (s.g === "ST") u = clamp(c.bu + 16, def + span + 4, 56);
    if (c.bu < 40 && p.G !== "DEF") v = CY + (v0 - CY) * 0.5 + (c.bv - CY) * 0.45;
    const err = (1 - team.org + team.minusOrg) * 3; u += p.nu * err * 0.7; v += p.nv * err;
    // hold a sensible line: never let the carrier play into acres of space behind you
    const car = B.owner && B.owner.team !== team ? B.owner : null;
    if (car && p.G === "DEF") {
      const cu = U(team, car.x), pressed = team.ctx.pressers.length && hyp(team.ctx.pressers[0].x - car.x, team.ctx.pressers[0].y - car.y) < 3;
      if (cu > 30) u = min(u, max(15, cu - (pressed ? 9 : 15)));   // drop off a runner with time to pick a pass
      else u = clamp(u, 5.5, max(5.5, min(u, cu - 2.5)));             // near the box: hold the line, stay goal-side
    }
    const m = c.marks.get(p.id);
    if (m) {
      // good markers sit tighter and goal-side; poor ones leave a yard
      const mk = 0.5 * p.a.mar + 0.25 * p.a.tac + 0.25 * p.a.com;
      const mu = U(team, m.x), mv = V(team, m.y), gd = hyp(mu, mv - CY) || 1, gs = (mu < 32 ? 1.4 : 2.2) * (1.65 - 0.85 * mk);
      const w = min(0.95, (mu < 30 ? 0.85 : mu < 55 ? 0.65 : 0.35) * (0.7 + 0.4 * mk));
      u = lerp(u, mu - mu / gd * gs, w); v = lerp(v, mv + (CY - mv) / gd * gs, w); urg = mu < 35 || m.run ? 3 : 2;
    }
    const pu = U(team, p.x);
    if (c.bu < pu - 3) urg = 3; else if (hyp(pu - u, V(team, p.y) - v) > 10) urg = 2;
    setXY(p, clamp(u, 1, L - 1), clamp(v, 1, W - 1), urg);
  }
  function gkPosition(p) {
    const team = p.team, c = team.ctx, bu = c.bu, bv = c.bv, d = hyp(bu, bv - CY) || 1;
    if (B.owner && B.owner.team !== team && d < 30) { const k = d < 15 ? clamp(0.3 * d, 1.5, 4.5 + 2 * p.a.gks) : clamp(0.9 + 0.08 * d, 1, 3.2); setXY(p, bu / d * k, CY + (bv - CY) / d * k, 3); return; }
    const sw = p.tags.has("sweeper keeper") || p.a.gks > 0.8;
    let k = clamp(1.1 + 0.07 * d, 1, 6);
    if (d > 24) { let line = L; for (const q of team.onPitch) if (q.G === "DEF") line = min(line, U(team, q.x)); k = max(k, clamp(0.32 * line, 1, sw ? 13 : 9)); }
    if (bu > 55) k = clamp(k + team.tac.line * (sw ? 10 : 5), 1, sw ? 18 : 11);
    setXY(p, clamp(bu / d * k, 0.6, 18), clamp(CY + (bv - CY) / d * k, CY - 8, CY + 8), d < 25 ? 2 : 1);
  }

  /* ---------- movement ---------- */
  const ACT = [];
  function movePlayers() {
    ACT.length = 0; for (const p of ents) if (p.on) ACT.push(p);
    const act = ACT, nA = act.length, celebrating = B.mode === "dead" && S.restart && S.restart.celebrate && S.tick < S.restart.celebrate.until;
    for (let ii = 0; ii < nA; ii++) {
      const p = act[ii];
      let cap = p.vmax * SPD[p.urg] * (0.72 + 0.28 * p.energy), acc = p.acc;
      if (p.lag > S.tick) { cap *= 0.35; acc *= 0.5; }   // turning to chase a ball played in behind
      if (p.stun > S.tick) cap *= 0.45;
      if (p === B.owner) { cap = min(cap, p.vmax * (0.55 + 0.2 * p.a.dri) * (0.8 + 0.2 * p.energy)); if (pressureOn(p) > 0.3 && S.tick - p.lastBeat > 8) cap *= 0.75; }
      if (p.state === "leaving") cap = 1.6;
      if (p.dive) { if (S.tick >= p.dive.start && S.tick <= p.dive.until) { p.tx = p.dive.x; p.ty = p.dive.y; cap = p.dive.v; acc = 30; } else if (S.tick > p.dive.until) p.dive = null; }
      const dx = p.tx - p.x, dy = p.ty - p.y, d = hyp(dx, dy);
      const want = min(cap, d * 1.7);
      let tvx = d > 0.01 ? dx / d * want : 0, tvy = d > 0.01 ? dy / d * want : 0;
      if (!p.dive && p.state !== "leaving" && !celebrating) {
        for (let jj = 0; jj < nA; jj++) {
          const o = act[jj];
          const sx = p.x - o.x; if (sx > 2.2 || sx < -2.2 || o === p) continue;
          const sy = p.y - o.y; if (sy > 2.2 || sy < -2.2) continue;
          const sd = sx * sx + sy * sy;
          if (sd > 4.85) continue;
          if (o.state === "leaving") continue;
          const lim = o.team === p.team ? 2.2 : 1.0;
          if (sd < lim * lim && sd > 1e-6) {
            // a beaten defender can't block; otherwise bodies don't pass through each other, the carrier included
            if (o.team !== p.team && ((o === B.owner && p.stun > S.tick) || (p === B.owner && o.stun > S.tick))) continue;
            const s1 = sqrt(sd), k = (lim - s1) * (p === B.owner || o === B.owner ? 4.5 : 2.2); tvx += sx / s1 * k; tvy += sy / s1 * k;
          }
        }
      }
      let ax = tvx - p.vx, ay = tvy - p.vy; const a = hyp(ax, ay), lim2 = acc * DT; if (a > lim2) { ax *= lim2 / a; ay *= lim2 / a; }
      p.vx += ax; p.vy += ay; p.x += p.vx * DT; p.y += p.vy * DT;
      if (p.state !== "leaving") { p.x = clamp(p.x, -2, L + 2); p.y = clamp(p.y, -2, W + 2); }
      const sp = hyp(p.vx, p.vy);
      if (sp > 0.6) { p.fx = p.vx / sp; p.fy = p.vy / sp; }
      else if (B.mode === "play") { const bx = B.x - p.x, by = B.y - p.y, bd = hyp(bx, by); if (bd > 0.1) { p.fx += (bx / bd - p.fx) * 0.2; p.fy += (by / bd - p.fy) * 0.2; const f = hyp(p.fx, p.fy) || 1; p.fx /= f; p.fy /= f; } }
      // fatigue
      if (p.playing) {
        const r = sp / p.vmax, tc = p.team.tac;
        let drain = (3.0e-6 + 0.95e-4 * r * r * r) * (1.5 - 0.85 * p.a.sta) * (0.8 + 0.3 * tc.press + 0.15 * tc.tempo) * drainMul(p.team);
        if (r < 0.3) drain -= 2.2e-6;
        p.energy = clamp(p.energy - drain, 0.2, 1);
      }
      if (p.state === "leaving" && (p.y < -1.2 || p.y > W + 1.2)) { p.on = false; p.state = "off"; }
    }
  }

  /* ---------- ball ---------- */
  function giveBall(p, hands) {
    if (B.shot && !B.shot.done) shotOutcome(B.shot, p.team !== B.shot.team ? (p.G === "GK" ? "saved" : "blocked") : "wide", p.G === "GK" && p.team !== B.shot.team ? p : null);
    B.owner = p; B.mode = "play"; B.pass = null; B.shot = null; B.z = 0; B.vz = 0; B.last = p; B.lastTeam = p.team; B.flight++;
    p.hands = !!hands; p.carry = null; p.run = null; p.recv = null;
    p.controlUntil = S.tick + 2; p.nextDec = S.tick + 3;
  }
  function launch(from, tx, ty, opts) {
    // opts: {kind, loft, speed, arriveSpeed, T, z0, to, setpiece}
    const dx = tx - B.x, dy = ty - B.y, d = hyp(dx, dy) || 0.01;
    B.owner = null; B.mode = "play"; B.flight++; B.tried = {};
    B.last = from; B.lastTeam = from ? from.team : B.lastTeam;
    if (from) { B.tried[from.id] = B.flight; B.kicker = from; B.kickTick = S.tick; }
    B.kickPos = { x: B.x, y: B.y };
    if (opts.loft) {
      const t = opts.T || (0.7 + d / 30);
      B.z = opts.z0 || 0.1; B.vz = 4.905 * t - B.z / t; const vh = d / t * (1 + 0.006 * d / t);
      B.vx = dx / d * vh; B.vy = dy / d * vh;
      return t;
    }
    const ve = opts.arriveSpeed != null ? opts.arriveSpeed : min(16, 8.5 + 0.18 * d);
    let v0 = sqrt(ve * ve + 2 * FRIC * d);
    for (let i = 0; i < 3; i++) v0 = sqrt(ve * ve + 2 * (FRIC + 0.03 * (v0 + ve) / 2) * d);
    if (opts.speed) v0 = opts.speed;
    B.z = 0; B.vz = 0; B.vx = dx / d * v0; B.vy = dy / d * v0;
    return 2 * d / (v0 + ve);
  }
  function teamDefendingGoalAt(gx) { return (dir(T.A) > 0) === (gx === 0) ? T.A : T.B; }

  function ballStep() {
    if (B.mode === "dead") { deadBallMove(); return; }
    if (B.owner) {
      const p = B.owner, off = p.hands ? 0.35 : (hyp(p.vx, p.vy) > 3 ? 0.85 : 0.55);
      B.x = p.x + p.fx * off; B.y = p.y + p.fy * off; B.z = p.hands ? 1.0 : 0; B.vx = p.vx; B.vy = p.vy; B.vz = 0; return;
    }
    // a loose ball or pass heading in on target: the keeper treats it as a shot
    if (!B.shot && !S.shootout && B.last && B.lastTeam && B.last.team === B.lastTeam && B.vx !== 0) {
      const tm = B.lastTeam, gx = dir(tm) > 0 ? L : 0, t = (gx - B.x) / B.vx;
      if (t > 0 && t < 2.4 && abs(gx - B.x) < 22) {
        const yy = B.y + B.vy * t, zz = B.z + B.vz * t - 4.9 * t * t;
        if (abs(yy - CY) < GH + 0.2 && zz < BAR + 0.1) {
          const p = B.last; B.shot = { by: p, team: tm, xg: 0.06, tick: S.tick, method: ["scramble"], header: false, forced: null, assist: null, tried: {}, done: false, wall: null, pen: false, fk: false, auto: true };
          S.recentShot = B.shot;
          const gk = gkOf(tm.opp);
          if (gk) { const react = 0.15 + 0.2 * (1 - gk.a.gkr), kx = gk.x + (gx - gk.x) * 0.3, tk = (kx - B.x) / B.vx, ky = tk > 0 ? B.y + B.vy * tk : yy;
            gk.dive = { x: kx, y: clamp(ky, CY - GH - 3, CY + GH + 3), start: S.tick + round(react / DT), until: S.tick + round((react + 2 * t) / DT) + 10, v: 4.5 + 3.5 * gk.a.gkr }; }
        }
      }
    }
    // a stray back-pass or clearance rolling towards his own net: the keeper goes to fetch it
    if (!B.shot && !S.shootout && B.lastTeam && B.vx !== 0 && B.ogFlight !== B.flight) {
      const tm = B.lastTeam, gx = dir(tm) > 0 ? 0 : L, t = (gx - B.x) / B.vx;
      if (t > 0 && t < 2.6 && abs(gx - B.x) < 24) {
        const yy = B.y + B.vy * t, zz = B.z + B.vz * t - 4.9 * t * t, gk = gkOf(tm);
        if (gk && abs(yy - CY) < GH + 0.5 && zz < BAR + 0.1) {
          B.ogFlight = B.flight; const kx = gk.x + (gx - gk.x) * 0.5, tk = (kx - B.x) / B.vx, ky = tk > 0 ? B.y + B.vy * tk : yy;
          gk.dive = { x: kx, y: clamp(ky, CY - GH - 3, CY + GH + 3), start: S.tick + 2, until: S.tick + round(2 * t / DT) + 10, v: 4.5 + 3.5 * gk.a.gkr };
        }
      }
    }
    for (let s = 0; s < SUBSTEPS; s++) {
      const px = B.x, py = B.y, pz = B.z;
      if (B.z > 0.001 || B.vz > 0.001) {
        B.vz -= 9.81 * HS; const sp = hyp(B.vx, B.vy), drag = 1 - 0.012 * sp * HS; B.vx *= drag; B.vy *= drag;
        B.x += B.vx * HS; B.y += B.vy * HS; B.z += B.vz * HS;
        if (B.z <= 0) { B.z = 0; if (B.vz < -2.2) { B.vz = -B.vz * 0.42; B.vx *= 0.82; B.vy *= 0.82; } else B.vz = 0; }
      } else {
        const sp = hyp(B.vx, B.vy);
        if (sp > 0) { const ns = max(0, sp - (FRIC + 0.03 * sp) * HS); B.vx *= ns / sp; B.vy *= ns / sp; }
        B.x += B.vx * HS; B.y += B.vy * HS;
      }
      if (checkOut(px, py, pz)) return;
      if (B.shot) { shotInteractions(px, py); if (B.mode !== "play" || B.owner) return; }
      if (controlChecks(px, py)) return;
    }
    const sp = hyp(B.vx, B.vy);
    if (B.pass && sp < 0.5 && B.z < 0.02) { passEnd("stopped"); B.pass = null; }
    if (B.shot && !B.shot.auto && sp < 7 && B.z < 0.4) { if (!B.shot.done) shotOutcome(B.shot, B.last && B.last.team !== B.shot.team ? "blocked" : "wide"); B.shot = null; }
    if (sp < 0.3 && B.z < 0.02) { if (!B.stillSince) B.stillSince = S.tick; else if (S.tick - B.stillSince > 25) { const n = nearestOf([...T.A.onPitch, ...T.B.onPitch], B.x, B.y, p => p.G !== "GK" || inOwnBox(p)); if (n) setT(n.p, B.x, B.y, 3); } }
    else B.stillSince = 0;
  }
  function deadBallMove() {
    const r = S.restart; if (!r) return;
    // after a goal the ball sits in the net while the scorers celebrate
    if (r.celebrate && S.tick < r.celebrate.until - 50) { if (B.x > L - 0.5 || B.x < 0.5) { const gx = B.x > L / 2 ? L + 1.2 : -1.2; B.x += (gx - B.x) * 0.2; } B.z = max(0, B.z - 0.3); B.vx = B.vy = B.vz = 0; return; }
    const dx = r.x - B.x, dy = r.y - B.y, d = hyp(dx, dy), step = min(d, (r.ballSpeed || 9) * DT);
    if (d > 0.01) { B.x += dx / d * step; B.y += dy / d * step; }
    B.z = max(0, B.z - 0.3); B.vx = B.vy = B.vz = 0;
  }
  function checkOut(px, py, pz) {
    if ((B.x < 0 || B.x > L || B.y < 0 || B.y > W) && B.pass) passEnd("out");
    if (B.x < 0 || B.x > L) {
      const gx = B.x < 0 ? 0 : L, f = (gx - px) / ((B.x - px) || 1e-9), yc = py + (B.y - py) * f, zc = pz + (B.z - pz) * f;
      if (abs(yc - CY) < GH - 0.11 && zc < BAR - 0.11) { if (S.shootout) { B.x = gx === 0 ? -1 : L + 1; shootResult("goal"); return true; } goalScored(gx); return true; }
      const post = abs(abs(yc - CY) - GH) < 0.22 && zc < BAR + 0.1, bar = abs(zc - BAR) < 0.2 && abs(yc - CY) < GH + 0.1;
      if ((post || bar) && B.shot && !B.shot.wood) {
        B.shot.wood = post ? "post" : "bar"; ev("woodwork", { team: B.shot.team.side, p: pid(B.shot.by), what: B.shot.wood });
        B.x = gx === 0 ? 0.2 : L - 0.2; B.vx = -B.vx * 0.45; B.vy += rr(-2.5, 2.5); B.vz = bar ? 1.5 : B.vz * 0.5; B.tried = {};
        if (S.shootout) { shootResult("miss"); return true; }
        return false;
      }
      if (S.shootout) { shootResult("miss"); return true; }
      const defT = teamDefendingGoalAt(gx);
      if (B.shot) shotOutcome(B.shot, zc > BAR ? "over" : "wide");
      if (B.lastTeam === defT) { const s = yc < CY ? 0.6 : W - 0.6; setRestart("corner", defT.opp, gx === 0 ? 0.6 : L - 0.6, s); }
      else setRestart("goalkick", defT, gx === 0 ? 5.5 : L - 5.5, yc < CY ? CY - 9 : CY + 9);
      return true;
    }
    if (B.y < 0 || B.y > W) { if (S.shootout) { shootResult("miss"); return true; } const t = B.lastTeam ? B.lastTeam.opp : T.A; setRestart("throw", t, clamp(B.x, 1, L - 1), B.y < 0 ? 0 : W); return true; }
    return false;
  }
  function segDist(p, px, py) { const sx = B.x - px, sy = B.y - py, L2 = sx * sx + sy * sy; if (L2 < 1e-6) return hyp(p.x - B.x, p.y - B.y); const t = clamp(((p.x - px) * sx + (p.y - py) * sy) / L2, 0, 1); return hyp(p.x - px - sx * t, p.y - py - sy * t); }
  function controlChecks(px, py) {
    const sp = hyp(B.vx, B.vy);
    // in the air: headers, chests, keeper claims
    if (B.z > 0.9 && B.z < 2.9 && B.vz <= 0 && !B.shot && (!B.kickPos || hyp(B.x - B.kickPos.x, B.y - B.kickPos.y) > 4)) {
      const c = [];
      for (const team of teams) for (const p of team.onPitch) { if (p === B.kicker && S.tick - B.kickTick < 6) continue; const d = hyp(p.x - B.x, p.y - B.y); if (d < 1.7 && B.tried[p.id] !== B.flight) c.push([d, p]); }
      if (!c.length) return false;
      for (const [, p] of c) B.tried[p.id] = B.flight;
      // an unchallenged runner brings a long ball down on his chest or thigh and keeps going
      const longBall = B.pass && (B.pass.kind === "over" || B.pass.kind === "loft" || B.pass.kind === "long");
      if (c.length === 1 && B.pass && B.pass.to === c[0][1] && (B.z < 1.7 || (longBall && B.z < 2.4)) && !(B.pass.kind === "cross" && B.z > 1.15)) { passEnd("ok"); receive(c[0][1], sp); return true; }
      passEnd("aerial");
      let best = null, bs = -9;
      const behindBall = B.pass && (B.pass.kind === "over" || B.pass.kind === "through");
      for (const [d, p] of c) {
        const keeper = p.G === "GK" && inOwnBox(p);
        // on a ball played in behind, the runner is attacking it; a defender is turning and chasing back
        const run = behindBall ? (B.pass.to === p ? 0.35 : p.team !== B.pass.from.team && !keeper ? -0.2 : 0) : 0;
        const setBlock = !keeper && p.G !== "GK" && inOwnBox(p) ? 0.18 * (1 - p.team.tac.line) : 0;   // a deep block is set and waiting for the cross
        const s = 0.45 * p.a.hea + 0.6 * (p.h - 1.75) + 0.2 * p.a.str + R() * 0.35 + (B.pass && B.pass.to === p ? 0.1 : 0) + (p.tags.has("aerial threat") ? 0.08 : 0) - d * 0.15 + (keeper ? 0.35 + 0.4 * p.a.gkh : 0) + run + setBlock;
        if (s > bs) { bs = s; best = p; }
      }
      aerialWin(best, c.length > 1);
      return true;
    }
    if (B.z >= 1.0) return false;
    const c = [];
    for (const team of teams) for (const p of team.onPitch) {
      if (p === B.kicker && S.tick - B.kickTick < 6) continue;
      const deepBox = B.lastTeam && p.team !== B.lastTeam && p.G !== "GK" && inOwnBox(p) ? 1 + 0.45 * (1 - p.team.tac.line) : 1;
      const d = segDist(p, px, py), r0 = p.G === "GK" && inOwnBox(p) ? 1.3 : B.lastTeam && p.team !== B.lastTeam ? 0.85 * (0.62 + 0.25 * p.a.tac + 0.25 * p.a.mar) * deepBox : 0.85;
      if (d < r0) { const tr = B.tried[p.id]; if (tr === B.flight && (B.pass || B.shot)) continue; if (typeof tr === "number" && tr < 0 && S.tick + tr < 4) continue; c.push([d, p]); }
    }
    if (!c.length) return false;
    c.sort((a, b) => a[0] - b[0] || a[1].id - b[1].id);
    for (const [, p] of c) {
      const intended = B.pass && B.pass.to === p, isOpp = B.lastTeam && p.team !== B.lastTeam;
      if (isOpp && B.pass && B.pass.loft && B.z > 0.3 && p.G !== "GK" && R() < 0.5) { B.tried[p.id] = B.flight; continue; }   // the lofted ball clears him
      B.tried[p.id] = B.pass || B.shot ? B.flight : -S.tick;
      let pc;
      if (p.G === "GK" && inOwnBox(p) && isOpp) pc = clamp(0.6 + 0.38 * p.a.gkh - max(0, sp - 14) * 0.03, 0.2, 0.98);
      else if (intended) pc = clamp(0.96 + 0.1 * (p.a.dri - 0.7) - max(0, sp - 15) * 0.03 - pressureOn(p) * 0.08 - (1 - p.energy) * 0.05, 0.5, 0.99);
      else if (isOpp && B.pass) pc = clamp(0.32 + 0.5 * (0.5 * p.a.tac + 0.5 * p.a.mar) - max(0, sp - 9) * 0.05, 0.06, 0.9);
      else pc = clamp(0.82 + 0.12 * p.a.dri - max(0, sp - 12) * 0.03, 0.3, 0.98);
      if (R() < pc) { passEnd(intended ? "ok" : isOpp ? "intercepted" : "teammate"); receive(p, sp); return true; }
      passEnd(intended ? "badtouch" : isOpp ? "deflected" : "mate-miss");
      if (sp > 4) { B.vx = B.vx * 0.55 + rr(-1.5, 1.5); B.vy = B.vy * 0.55 + rr(-1.5, 1.5); B.last = p; B.lastTeam = p.team; B.pass = null; B.flight++; }
    }
    return false;
  }
  function pressureOn(p) { let bd = 99; const l = p.team.opp.onPitch; for (let i = 0; i < l.length; i++) { const o = l[i], dx = o.x - p.x, dy = o.y - p.y; const d2 = dx * dx + dy * dy; if (d2 < bd) bd = d2; } return bd >= 9 ? 0 : clamp((3 - sqrt(bd)) / 3, 0, 1); }
  function receive(p, sp) {
    const pass = B.pass, team = p.team;
    DEBUG && chain(`${team.side} recv ${p.name.split("-")[0]}@${round(U(team, p.x))},${round(V(team, p.y))}${pass && pass.from && pass.from.team !== team ? " INTERCEPT" : ""}`);
    if (pass && pass.offside && pass.to === p) { team.stats.offsides++; ev("offside", { team: team.side, p: p.id }); setRestart("freekick", team.opp, p.x, p.y, { offside: true }); return; }
    const keeperClaim = p.G === "GK" && inOwnBox(p) && B.lastTeam && B.lastTeam !== team && !(pass && pass.from && pass.from.team === team);
    if (pass && pass.from && pass.from !== p) {
      if (pass.from.team === team) {
        team.stats.passOk++; pass.from.st.passOk++; if (DBG.pass[pass.kind]) DBG.pass[pass.kind].ok++;
        const prog = U(team, p.x) - U(team, pass.from.x);
        rate(pass.from, prog > 12 ? 0.035 : 0.006);
        p.lastPass = { from: pass.from, tick: S.tick, kind: pass.kind };
      } else { rate(p, 0.09); rate(pass.from, -0.05); p.st.intercepts++; DBG.intercept++; }
    }
    giveBall(p, keeperClaim);
    if (keeperClaim) { p.nextDec = S.tick + floor(rr(20, 45)); return; }
    const u = U(team, p.x), v = V(team, p.y);
    if (u > L - 18 && abs(v - CY) < 14 && pass && pass.from && pass.from.team === team) { p.controlUntil = S.tick; p.nextDec = S.tick + 1; p.firstTime = true; p.volley = B.z > 0.35 || pass.loft; }
    else { const t = team.tac, pr = pressureOn(p); p.nextDec = S.tick + 2 + round(10 * (pr > 0.5 ? rr(0.2, 0.55) : rr(0.6, 1.5) * (1.25 - 0.55 * t.tempo) * (1 - 0.4 * pr))); }
  }
  function aerialWin(p, contested) {
    const team = p.team, u = U(team, p.x), v = V(team, p.y), pass = B.pass;
    rate(p, contested ? 0.04 : 0.01);
    // the runner a long ball was meant for brings it down and goes, rather than heading it on
    if (pass && pass.to === p && (pass.kind === "over" || pass.kind === "loft" || pass.kind === "long") && B.z < 2.4 && !(u > L - 16 && abs(v - CY) < 12)) { passEnd("ok"); receive(p, hyp(B.vx, B.vy)); return; }
    if (p.G === "GK" && inOwnBox(p)) {
      if (R() < 0.55 + 0.4 * p.a.gkh) { giveBall(p, true); p.nextDec = S.tick + floor(rr(20, 45)); return; }
      const t = XY(team, rr(22, 32), V(team, p.y) + rr(-12, 12)); launch(p, t.x, t.y, { loft: true, T: 1.2 }); B.pass = { from: p, to: null, kind: "punch", tick: S.tick }; return;
    }
    const attacking = (pass && pass.from && pass.from.team === team) || B.lastTeam === team;
    if (attacking && u > L - 16 && abs(v - CY) < 12) { doShot(p, { header: true, xg: shotXg(p, L - u, abs(v - CY), true), setpiece: !!(pass && pass.setpiece), assistFrom: pass && pass.from }); return; }
    if (u < 35) {
      const out = u < 14 && R() < 0.35;
      const t = out ? XY(team, rr(-3, 4), v < CY ? rr(-6, 6) : W + rr(-6, 6)) : XY(team, u + rr(14, 24), clamp(v + rr(-12, 12), 4, W - 4));
      if (out) { const tt = XY(team, u + rr(-2, 3), v < CY ? -4 : W + 4); launch(p, tt.x, tt.y, { loft: true, T: 0.9, z0: 1.8 }); }
      else launch(p, t.x, t.y, { loft: true, T: 1.0, z0: 1.8 });
      B.pass = { from: p, to: null, kind: "clear", tick: S.tick }; return;
    }
    const mate = nearestOf(team.onPitch, p.x, p.y, q => q !== p && q.G !== "GK" && hyp(q.x - p.x, q.y - p.y) < 14);
    const t = mate ? { x: mate.p.x, y: mate.p.y } : XY(team, u + 8, v);
    launch(p, t.x, t.y, { loft: true, T: 0.45, z0: 1.5 }); B.pass = { from: p, to: mate ? mate.p : null, kind: "header", tick: S.tick, loft: true };
    if (mate) mate.p.recv = { x: t.x, y: t.y, until: S.tick + 9 };
  }

  /* ---------- shots and keepers ---------- */
  function shotXg(p, dx, dy, header) {
    let xg = xgAt(dx, dy) * (header ? 0.55 : 1);
    const team = p.team, opp = team.opp, gx = XY(team, L, CY);
    let between = 0;
    for (const o of opp.onPitch) {
      if (o.G === "GK") continue;
      const sx = gx.x - p.x, sy = gx.y - p.y, L2 = sx * sx + sy * sy || 1; const t = ((o.x - p.x) * sx + (o.y - p.y) * sy) / L2;
      if (t <= 0 || t >= 1) continue; const d = hyp(o.x - p.x - sx * t, o.y - p.y - sy * t); if (d < 1.2 + 2.2 * t) between++;
    }
    const pr = pressureOn(p);
    xg *= (1 - 0.13 * min(between, 4)) * (1 - 0.35 * pr);
    const gk = gkOf(opp); if (gk && !between && hyp(gk.x - gx.x, gk.y - gx.y) < 3 && dx < 16) xg *= 1.35;
    return clamp(xg, 0.003, 0.85);
  }
  function doShot(p, info) {
    const team = p.team, opp = team.opp, u = U(team, p.x), v = V(team, p.y), dx = L - u, dy = v - CY, d = hyp(dx, dy);
    const pr = pressureOn(p);
    let side;
    if (info.forcedSide) side = info.forcedSide; else { const far = dy < 0 ? 1 : -1; side = R() < 0.64 ? far : -far; }
    let tv = CY + side * (GH - 0.3 - rr(0, 1.0) * (1.25 - p.a.fin)), tz = info.header ? rr(0.2, 1.9) : R() < 0.58 ? rr(0.12, 0.6) : rr(1.05, 2.15);
    const skill = info.header ? p.a.hea : d > 20 ? 0.6 * p.a.lon + 0.4 * p.a.fin : p.a.fin;
    const weak = !info.header && ((p.foot === "R" && dy < -4) || (p.foot === "L" && dy > 4)) ? 1.12 : 1;
    let sig = (0.8 + d * 0.09) * (1.5 - skill) * (1 + pr * 0.8) * (1 + 0.4 * (1 - p.energy)) * WX.err * (info.header ? 1.05 : 1) * weak * (1 - 0.08 * team.momEff) * (1 - 2 * homeComp(team) - (p.tags.has("clinical finisher") ? 0.08 : 0)) * (1 + team.minusComp);
    if (info.freekick) sig *= 1.15 * (p.tags.has("set-piece specialist") ? 0.8 : 1);
    if (info.volley) sig *= 1.25;
    if (team.auraState.late && clockMin() >= 75) sig *= 0.85;
    if (!info.pen) { tv += gauss() * sig; tz += gauss() * sig * 0.5; }
    if (info.target) { tv = info.target.v; tz = info.target.z; }
    let spd = info.pen ? rr(19, 24) : info.header ? rr(12, 17) : d > 20 ? 21 + 10 * (0.6 * p.a.lon + 0.4 * p.a.str) : 17 + 10 * (0.7 * p.a.fin + 0.3 * p.a.str);
    if (!info.pen && !info.header) spd *= rr(0.88, 1.05);
    const goal = XY(team, L + 0.5, tv);
    const hd = hyp(goal.x - B.x, goal.y - B.y), t = hd / spd;
    B.owner = null; B.mode = "play"; B.flight++; B.tried = {}; B.pass = null; B.last = p; B.lastTeam = team;
    B.tried[p.id] = B.flight; B.kicker = p; B.kickTick = S.tick;
    B.z = info.header ? max(B.z, 1.7) : 0.1;
    B.vx = (goal.x - B.x) / t; B.vy = (goal.y - B.y) / t; B.vz = (tz - B.z + 0.5 * 9.81 * t * t) / t;
    const xg = info.xg != null ? info.xg : shotXg(p, dx, abs(dy), !!info.header);
    const method = [];
    if (info.pen) method.push("penalty"); else if (info.freekick) method.push("free kick"); else if (info.header) method.push("header"); else if (info.volley) method.push("volley");
    if (!info.pen && !info.freekick) { if (d > 20) method.push("long range"); else if (d < 6.5) method.push("close range"); }
    const lp = p.lastPass && S.tick - p.lastPass.tick < 50 ? p.lastPass : null;
    if (lp && !info.pen && !info.freekick) { if (lp.kind === "through" || lp.kind === "over") method.push("through ball"); else if (lp.kind === "cross") method.push("cross"); else if (lp.kind === "cutback") method.push("cut-back"); }
    if (S.tick - p.lastBeat < 50) method.push("solo run");
    if (S.tick - S.lastShot[team.side] < 50) method.push("rebound");
    if (S.wonAt[team.side] != null && S.wonAt[team.side] < 50 && S.tick - S.lastPossChange[team.side] < 120 && !info.setpiece && !info.pen) method.push("counter");
    if (info.setpiece && !info.pen && !info.freekick) method.push("set piece");
    const gkO = gkOf(opp); let oneOnOne = false;
    if (gkO && !info.pen) { let any = false; for (const o of opp.onPitch) { if (o.G === "GK") continue; if (U(team, o.x) > u - 1.5 && hyp(o.x - p.x, o.y - p.y) < 6) any = true; } oneOnOne = !any && d < 18; if (oneOnOne) method.push("one-on-one"); }
    DEBUG && chain(`${team.side} SHOT ${p.name.split("-")[0]}@${round(u)},${round(v)} xg${round(xg * 100)}`);
    if (DEBUG) DBG.chains.push(CHAIN.join(" | "));
    B.shot = { by: p, team, xg, tick: S.tick, method, header: !!info.header, forced: info.forced || null, assist: info.assistFrom || (lp ? lp.from : null), tried: {}, done: false, wall: info.wall || null, pen: !!info.pen, fk: !!info.freekick };
    S.recentShot = B.shot;
    S.lastShot[team.side] = S.tick;
    if (!S.shootout) { team.stats.shots++; team.stats.xg += xg; p.st.shots++; if (xg >= 0.3) team.stats.bigChances++; }
    if (B.shot.assist && B.shot.assist.team === team) { B.shot.assist.st.keyPasses++; rate(B.shot.assist, 0.12 + xg * 0.4); }
    addMom(team, 0.15 + xg * 0.8);
    rate(p, 0.05 + xg * 0.2);
    // keeper reacts
    const gk = gkOf(opp);
    if (gk) {
      const gu = U(opp, gk.x), bu2 = U(opp, B.x), gu2 = U(opp, goal.x);
      const f = clamp((gu - bu2) / ((gu2 - bu2) || -1e-6), 0, 1);
      const cy = B.y + (goal.y - B.y) * f, cx = gk.x;
      let ty = cy;
      if (info.forced === "goal" && info.pen) ty = gk.y + (cy > gk.y ? -1 : 1) * rr(1.5, 2.8);
      const react = info.pen ? 0.02 : 0.12 + 0.18 * (1 - gk.a.gkr);
      gk.dive = { x: cx, y: clamp(ty, CY - GH - 1, CY + GH + 1), start: S.tick + round(react / DT), until: S.tick + round(react / DT) + 8, v: 5.2 + 3.6 * gk.a.gkr };
    }
  }
  function shotInteractions(px, py) {
    const sh = B.shot, dt = sh.team.opp;
    if (B.z < 1.75 && !sh.pen) for (const o of dt.onPitch) {
      if (o.G === "GK" || sh.tried[o.id]) continue;
      const d = segDist(o, px, py);
      if (d < 0.65 + (inOwnBox(o) ? 0.25 * (1 - dt.tac.line) : 0)) { sh.tried[o.id] = 1; const inWall = sh.wall && sh.wall.includes(o.id); if (R() < (inWall ? (B.z < 1.85 ? 0.85 : 0) : 0.42 + 0.3 * o.a.mar + (inOwnBox(o) ? 0.12 * (1 - dt.tac.line) : 0))) { block(o); return; } }
    }
    const gk = gkOf(dt); if (!gk || sh.tried[gk.id]) return;
    const d = segDist(gk, px, py), reach = (gk.dive ? 1.45 : 0.85) * (0.85 + 0.15 * gk.a.gkr + 0.15 * gk.a.gkd) + (gk.h - 1.85) * 0.5;
    if (d < reach && B.z < 2.55) { sh.tried[gk.id] = 1; saveAttempt(gk, d, reach); }
  }
  function block(o) {
    const sh = B.shot; o.st.tackles++; rate(o, 0.12); sh.blocked = true;
    const back = U(o.team, B.x) < 6 ? 1 : -1;
    if (R() < 0.38) { const gx = dir(o.team) > 0 ? 0 : L; const t = (gx - B.x) / ((B.vx * 0.5) || 1e-6); B.vx = B.vx * 0.5; B.vy = B.vy * 0.3 + (B.y < CY ? -4 : 4); B.vz = rr(1, 4); void t; }
    else { B.vx = -B.vx * rr(0.15, 0.35) + rr(-3, 3); B.vy = B.vy * rr(0.1, 0.4) + rr(-5, 5); B.vz = rr(0, 3); }
    B.last = o; B.lastTeam = o.team; B.flight++; B.tried = {};
    shotOutcome(sh, "blocked"); B.shot = null;
    void back;
  }
  function saveAttempt(gk, d, reach) {
    DBG.gk.att++;
    const sh = B.shot, sp = hyp(B.vx, B.vy), stretch = clamp((d - 0.45) / max(0.3, reach - 0.45), 0, 1);
    let ps = 0.74 + 0.42 * gk.a.gkr + 0.12 * gk.a.gkh - max(0, sp - 22) * 0.02 - stretch * 0.32 - (B.z > 1.9 ? 0.08 : 0) - (sh.header ? 0.25 : 0) + (gk.tags.has("shot-stopper") ? 0.05 : 0);
    const mir = gk.team.aura && gk.team.aura.trigger === "keeper_miracle" && !gk.team.auraState.used && sh.xg >= 0.25;
    if (mir) { ps += 0.5; }
    if (sh.forced === "goal") ps = -1; else if (sh.forced === "saved") ps = 2;
    if (R() >= ps) return;
    DBG.gk.saved++;
    if (mir && R() < 0.98) { gk.team.auraState.used = true; ev("aura", { team: gk.team.side, name: gk.team.aura.name, trigger: "keeper_miracle" }); }
    if (!S.shootout) { gk.team.stats.saves++; gk.st.saves++; } rate(gk, 0.28 + (sh.xg > 0.25 ? 0.35 : 0)); addMom(gk.team, 0.08 + (sh.xg > 0.25 ? 0.12 : 0));
    const catchP = !sh.pen ? (sp < 28 && stretch < 0.6 ? 0.55 + 0.42 * gk.a.gkh : stretch < 0.8 ? 0.2 + 0.2 * gk.a.gkh : 0.06) : 0.05;
    if (S.shootout) { B.vx = -B.vx * 0.2; B.vy = rr(-4, 4); B.vz = 0.5; shootResult("saved"); return; }
    if (R() < catchP) { shotOutcome(sh, "caught", gk); giveBall(gk, true); gk.nextDec = S.tick + floor(rr(25, 55)); return; }
    if (B.z > 1.75 && R() < 0.6) { // tipped over
      B.vz = abs(B.vz) * 0.5 + 2.6; B.vx *= 0.35; B.vy *= 0.35; B.last = gk; B.lastTeam = gk.team; shotOutcome(sh, "tipped", gk); B.shot = null; B.flight++; return; }
    const out = dir(gk.team) > 0 ? 1 : -1;   // away from his goal
    if (R() < 0.55) { B.vx = -out * rr(1, 3); B.vy = (B.y < CY ? -1 : 1) * rr(3.5, 6.5); B.vz = rr(0.3, 1.6); }   // pushed round the post
    else { B.vx = out * rr(1.5, 4.5); B.vy = rr(-3.5, 3.5); B.vz = rr(0.2, 1.2); }   // spilled in front of him B.last = gk; B.lastTeam = gk.team; B.flight++; B.tried = {};
    shotOutcome(sh, "parried", gk); B.shot = null;
  }
  function shotOutcome(sh, outcome, gk) {
    if (sh.done) return; sh.done = true;
    if (sh.auto) { if (outcome !== "goal") return; sh.team.stats.shots++; sh.team.stats.xg += sh.xg; sh.by.st.shots++; }
    const onT = outcome === "goal" || outcome === "caught" || outcome === "parried" || outcome === "tipped" || outcome === "saved";
    if (onT && !S.shootout) { sh.team.stats.onT++; sh.by.st.onT++; }
    if (outcome === "wide" || outcome === "over") rate(sh.by, -0.06 - (sh.xg > 0.3 ? 0.25 : 0));
    ev("shot", { team: sh.team.side, p: sh.by.id, shotTick: sh.tick, xg: round(sh.xg * 100) / 100, outcome: sh.wood && outcome !== "goal" ? sh.wood : outcome, method: sh.method, assist: pid(sh.assist && sh.assist.team === sh.team ? sh.assist : null), keeper: pid(gk), big: sh.xg >= 0.3, pen: sh.pen, fk: sh.fk });
  }
  function goalScored(gx) {
    const conceding = teamDefendingGoalAt(gx), scorers = conceding.opp;
    let sh = B.shot;
    // a shot that took a touch off a defender or the keeper on its way in still belongs to the shooter
    const rs = S.recentShot;
    if (!sh && rs && rs.team === scorers && S.tick - rs.tick < 35 && B.last && (B.last.team === conceding || B.last === rs.by)) { sh = rs; if (!rs.method.includes("deflected") && B.last !== rs.by) rs.method = [...rs.method, "deflected"]; }
    let scorer = sh && sh.team === scorers ? sh.by : B.last, og = false;
    if (DEBUG && (!sh || sh.team !== scorers || sh.auto)) (DBG.scr || (DBG.scr = [])).push({ owner: B.owner ? B.owner.name : null, sp: round(hyp(B.vx, B.vy) * 10) / 10, z: round(B.z * 10) / 10, last: B.last ? B.last.name + (B.last.team === scorers ? '+' : '-') : null, pass: B.pass ? B.pass.kind : null, gk: (()=>{ const g=gkOf(conceding); return g? round(hyp(g.x-B.x,g.y-B.y)*10)/10 + ' tried' + (sh&&sh.tried[g.id]?1:0) : 'none'; })(), age: sh ? S.tick - sh.tick : null, rs: rs ? S.tick - rs.tick : null, chain: CHAIN.slice(-4).join(' | ') });
    if (!sh || sh.team !== scorers) { if (B.last && B.last.team === conceding) og = true; }
    if (sh && sh.team === scorers) { if (sh === B.shot) shotOutcome(sh, "goal"); if (!sh.tried[(gkOf(conceding) || { id: -1 }).id]) { DBG.gk.goalNoTry++; const g = gkOf(conceding); if (g) DBG.gk.gap.push(round(hyp(g.x - B.x, g.y - B.y) * 10) / 10); } }
    scorers.score++;
    const assist = !og && sh && sh.assist && sh.assist.team === scorers ? sh.assist : null;
    if (!og && scorer) { scorer.st.goals++; rate(scorer, 1.05 + (sh && sh.xg < 0.1 ? 0.2 : 0)); }
    if (assist) { assist.st.assists++; rate(assist, 0.75); }
    if (og && scorer) rate(scorer, -0.8);
    for (const p of conceding.onPitch) rate(p, p.G === "GK" ? -0.35 : p.G === "DEF" ? -0.18 : -0.06);
    for (const p of scorers.onPitch) if (p !== scorer && p !== assist) rate(p, 0.04);
    const gs = scorers.aura && scorers.aura.trigger;
    addMom(scorers, gs === "momentum_after_goal" ? 1.2 : 0.7); conceding.momP *= gs === "momentum_after_goal" ? 0.4 : 0.6;
    if (gs === "momentum_after_goal" && !scorers.auraState.used) { scorers.auraState.used = true; ev("aura", { team: scorers.side, name: scorers.aura.name, trigger: gs }); }
    if (gs === "opponent_collapse" && !scorers.auraState.used) { scorers.auraState.used = true; conceding.minusComp = 0.12; conceding.minusOrg = 0.15; conceding.minusUntil = S.tick + 9000; ev("aura", { team: scorers.side, name: scorers.aura.name, trigger: gs }); }
    ev("goal", { team: scorers.side, p: pid(scorer), assist: pid(assist), og, method: sh && sh.team === scorers ? sh.method : og ? ["own goal"] : ["scramble"], xg: sh && sh.team === scorers ? round(sh.xg * 100) / 100 : 0, score: { A: T.A.score, B: T.B.score }, shotTick: sh ? sh.tick : S.tick });
    B.shot = null; B.pass = null;
    B.x = gx === 0 ? -1.2 : L + 1.2; B.z = 0.3;
    setRestart("kickoff", conceding, L / 2, CY, { celebrate: { scorer: og ? null : scorer, team: scorers, until: S.tick + 150 } });
  }

  /* ---------- duels ---------- */
  function duelStep(p) {
    if (p.hands || S.tick < p.controlUntil) return;
    const team = p.team, opp = team.opp, oc = opp.ctx;
    for (const o of opp.onPitch) {
      if (o.G === "GK" && !inOwnBox(o)) continue;
      const d = hyp(o.x - p.x, o.y - p.y); if (d > 1.6) continue;
      if (o.stun > S.tick) continue;
      const presser = oc.pressers.includes(o), nearGoal = U(opp, o.x) < 30;
      // a defender squarely goal-side and touch-tight forces a duel: beat him or lose it
      const boxNow = U(opp, p.x) < BOX_D + 2;
      const runAt = d > 0.01 ? ((o.x - p.x) * p.vx + (o.y - p.y) * p.vy) / d : 0;    // carrier speed toward this defender
      if (d < (boxNow ? 1.6 : 1.3) && runAt > 1.2 && U(opp, o.x) < U(opp, p.x) + (boxNow ? 0.8 : 0.3) && S.tick - p.lastBeat > 10 && o.duelCd <= S.tick) {
        o.duelCd = S.tick + 12;
        const P = clamp(0.28 + 0.65 * (p.a.dri - 0.85 * o.a.tac) + 0.35 * (p.a.pac - o.a.pac) + (p.tags.has("dribbler") ? 0.08 : 0) - (o.tags.has("stopper") || o.tags.has("ball-winner") ? 0.06 : 0), 0.08, 0.8);
        DBG.duel = (DBG.duel || 0) + 1;
        DBG.duelTry = (DBG.duelTry || 0) + 1;
        if (R() < P) { DBG.duelWin = (DBG.duelWin || 0) + 1; DEBUG && chain(`${team.side} BEAT ${o.name.split("-")[0]}`); o.stun = S.tick + 11; p.lastBeat = S.tick; p.st.dribbles++; rate(p, 0.08); rate(o, -0.05); continue; }
        const inBox = U(team, p.x) > L - BOX_D && abs(V(team, p.y) - CY) < BOX_H;
        if (R() < (0.025 + 0.05 * o.a.agg) * RF.foul * (inBox ? 0.15 : 1) * (team.aura && team.aura.trigger === "chaos" ? 1.4 : 1)) { foul(o, p); return; }
        o.team.stats.tackles++; o.st.tackles++; rate(o, 0.12); rate(p, -0.06);
        if (R() < 0.4) { B.owner = null; B.mode = "play"; B.vx = (o.x - p.x) * 2.5 + rr(-3, 3); B.vy = (o.y - p.y) * 2.5 + rr(-3, 3); B.vz = 0; B.last = o; B.lastTeam = o.team; B.flight++; B.tried = {}; B.kicker = null; }
        else giveBall(o);
        return;
      }
      // close pressure: a steady chance of nicking it, no foul involved
      const shield = p.carry && p.carry.hold ? 0.6 : 1;
      const goalSide = U(opp, o.x) < U(opp, p.x) - 0.3;
      let pd = 0.045 * (0.45 + o.a.tac - 0.75 * p.a.dri - 0.25 * (p.a.str - o.a.str)) * (presser ? 1.3 : 1) * (nearGoal ? 1.35 : 1) * (goalSide ? 1.5 : 0.8) * shield * (d < 1.1 ? 1 : 0.5);
      pd = clamp(pd, 0.004, 0.09);
      if (R() < pd) {
        o.team.stats.tackles++; o.st.tackles++; rate(o, 0.1); rate(p, -0.05);
        if (R() < 0.4) { B.owner = null; B.mode = "play"; B.vx = (o.x - p.x) * 2.5 + rr(-3, 3); B.vy = (o.y - p.y) * 2.5 + rr(-3, 3); B.vz = 0; B.last = o; B.lastTeam = o.team; B.flight++; B.tried = {}; B.kicker = null; }
        else giveBall(o);
        return;
      }
      // the occasional reckless challenge
      if (o.tackleCd <= S.tick && d < 1.2) {
        const behind = (o.x - p.x) * p.fx + (o.y - p.y) * p.fy < -0.3;
        const chaos = team.aura && team.aura.trigger === "chaos" ? 1.4 : 1;
        const inBox = U(team, p.x) > L - BOX_D && abs(V(team, p.y) - CY) < BOX_H;
        const pf = 0.0024 * (0.4 + o.a.agg) * (behind ? 2 : 1) * RF.foul * chaos * (weather === "Heavy rain" ? 1.2 : 1) * (inBox ? 0.09 : 1) * (presser ? 1.3 : 1);
        if (R() < pf) { o.tackleCd = S.tick + 20; foul(o, p); return; }
      }
    }
  }
  function tackle(o, p) {
    const behind = (o.x - p.x) * p.fx + (o.y - p.y) * p.fy < -0.3;
    const chaos = p.team.aura && p.team.aura.trigger === "chaos" ? 1.3 : 1;
    const pf = (0.05 + 0.15 * o.a.agg + (behind ? 0.16 : 0) + max(0, p.a.dri - o.a.tac) * 0.25 - 0.07 * o.a.tac) * RF.foul * chaos * (weather === "Heavy rain" ? 1.15 : 1);
    const shield = p.carry && p.carry.hold ? 1.5 : 1;
    const ps = clamp(0.45 + 0.6 * (o.a.tac - 0.75 * p.a.dri) - 0.25 * (p.a.str - o.a.str) * shield, 0.12, 0.85);
    const boxFoul = U(p.team, p.x) > L - BOX_D && abs(V(p.team, p.y) - CY) < BOX_H;
    if (R() < pf * (boxFoul ? 0.08 : 1)) { foul(o, p); return; }
    if (R() < ps) {
      o.team.stats.tackles++; o.st.tackles++; rate(o, 0.11); rate(p, -0.05);
      if (R() < 0.35) { const f = o.team; B.owner = null; B.mode = "play"; B.vx = (p.x - o.x) * 2 + rr(-3, 3); B.vy = (p.y - o.y) * 2 + rr(-3, 3); B.vz = 0; B.last = o; B.lastTeam = f; B.flight++; B.tried = {}; }
      else giveBall(o);
    } else { o.stun = S.tick + 9; p.lastBeat = S.tick; p.st.dribbles++; rate(p, 0.07); rate(o, -0.03); }
  }
  function foul(o, p) {
    const vt = p.team, ft = o.team; ft.stats.fouls++; o.st.fouls++; rate(o, -0.08);
    const u = U(vt, p.x), v = V(vt, p.y), inBox = u > L - BOX_D && abs(v - CY) < BOX_H;
    const chaos = vt.aura && vt.aura.trigger === "chaos" ? 1.6 : 1;
    let card = null;
    let between = 0; for (const q of ft.onPitch) if (q !== o && q.G !== "GK" && U(vt, q.x) > u) between++;
    const dogso = !inBox && u > L - 32 && abs(v - CY) < 16 && between === 0;
    if (dogso && R() < 0.12) card = "red";
    else if (R() < (0.05 + 0.17 * o.a.agg) * RF.card * chaos * (inBox ? 1.3 : 1) * (u > L * 0.6 ? 1.2 : 0.85)) card = "yellow";
    ev(inBox ? "penalty" : "foul", { team: vt.side, p: o.id, victim: p.id, card });
    if (card === "yellow") { o.yellow++; ft.stats.yellows++; rate(o, -0.3); ev("yellow", { team: ft.side, p: o.id, second: o.yellow >= 2 }); if (o.yellow >= 2) sendOff(o, true); }
    else if (card === "red") sendOff(o, false);
    if (inBox) setRestart("penalty", vt, dX(vt, L - 11), CY);
    else setRestart("freekick", vt, p.x, p.y);
  }
  const dX = (team, u) => XY(team, u, CY).x;
  function sendOff(p, second) {
    const t = p.team; t.stats.reds++; rate(p, -1.4);
    if (!second) ev("red", { team: t.side, p: p.id });
    else ev("red", { team: t.side, p: p.id, second: true });
    t.onPitch.splice(t.onPitch.indexOf(p), 1); p.playing = false; p.state = "leaving";
    p.tx = p.x; p.ty = p.y < CY ? -3 : W + 3; p.urg = 0; p.hands = false;
    if (B.owner === p) B.owner = null;
    if (p.G === "GK" && !gkOf(t)) {   // no keeper left: an outfielder goes in goal
      const q = [...t.onPitch].sort((a, b) => (b.h + b.a.str) - (a.h + a.a.str) || a.id - b.id)[0];
      if (q) { q.G = "GK"; q.g = "GK"; q.a.gkr = 0.42; q.a.gkh = 0.4; q.a.gkd = 0.42; q.a.gks = 0.3; q.slot = { ...q.slot, k: q.slot ? q.slot.k : "GK", g: "GK", x: 50, y: 7 }; }
    }
    addMom(t.opp, 0.3);
  }

  /* ---------- the player on the ball ---------- */
  function carrierStep(p) {
    if (p.hands) { if (S.tick >= p.nextDec) keeperDistribute(p); else { p.urg = 0; const t = XY(p.team, clamp(U(p.team, p.x), 3, 14), clamp(V(p.team, p.y), CY - 9, CY + 9)); p.tx = t.x; p.ty = t.y; } return; }
    if (S.tick < p.controlUntil) { p.tx = p.x + p.vx * 0.2; p.ty = p.y + p.vy * 0.2; p.urg = 1; return; }
    if (S.tick < p.nextDec && p.carry && !p.carry.hold && S.tick - (p.carryStart || 0) > 4) {
      const blk = nearestOf(p.team.opp.onPitch, p.x, p.y, q => q.stun <= S.tick); const sp = hyp(p.vx, p.vy);
      if (blk && blk.d < 1.6 && sp < 2.5) p.nextDec = S.tick;
    }
    if (S.tick >= p.nextDec) decide(p);
    if (B.owner !== p) return;
    if (p.carry && S.tick < p.carry.until) { p.tx = p.carry.x; p.ty = p.carry.y; p.urg = p.carry.hold ? 0 : 3; }
    else { p.carry = null; p.tx = p.x + p.fx * 0.5; p.ty = p.y + p.fy * 0.5; p.urg = 1; }
  }
  function keeperDistribute(gk) {
    const team = gk.team, tac = team.tac;
    const short = R() < (tac.buildUp === "short" ? 0.8 : tac.buildUp === "mixed" ? 0.5 : 0.18) + 0.15 * (gk.a.gks - 0.7);
    let target = null;
    if (short) { const c = team.onPitch.filter(q => (q.G === "DEF" || q.slot && q.slot.g === "DM") && pressureOn(q) < 0.4 && hyp(q.x - gk.x, q.y - gk.y) < 32).sort(byDist(gk.x, gk.y)); target = c[0] || null; }
    gk.hands = false;
    if (target) { const t = launch(gk, target.x, target.y, { arriveSpeed: 4 }); B.pass = { from: gk, to: target, kind: "throw", tick: S.tick }; target.recv = { x: target.x, y: target.y, until: S.tick + round(t / DT) + 8 }; team.stats.passes++; gk.st.passes++; B.z = 0.6; return; }
    const fwd = team.onPitch.filter(q => q.G === "FWD" || (q.slot && q.slot.g === "AM")).sort((a, b) => U(team, b.x) - U(team, a.x) || a.id - b.id);
    const r = fwd[floor(R() * min(2, fwd.length))] || team.onPitch.find(q => q !== gk);
    const tu = clamp(U(team, r.x), 40, 72), tv = clamp(V(team, r.y) + rr(-4, 4), 6, W - 6), pt = XY(team, tu, tv);
    const err = (1.25 - gk.a.gks) * 4 * WX.wind;
    const t = launch(gk, pt.x + gauss() * err, pt.y + gauss() * err, { loft: true, T: 2.1 + rr(0, 0.4), z0: 1.0 });
    B.pass = { from: gk, to: r, kind: "long", tick: S.tick, loft: true }; r.recv = { x: pt.x, y: pt.y, until: S.tick + round(t / DT) + 8 }; team.stats.passes++; gk.st.passes++;
  }
  function decide(p) {
    const team = p.team, c = team.ctx, tac = team.tac, opp = team.opp;
    const pu = U(team, p.x), pv = V(team, p.y);
    const no = nearestOf(opp.onPitch, p.x, p.y), dOpp = no ? no.d : 99, pressure = clamp((3.2 - dOpp) / 3.2, 0, 1);
    const lossHere = lossCost(pu);
    const breakOn = S.tick - S.lastPossChange[team.side] < 80 && (S.wonAt[team.side] || 99) < 55;
    const counterOn = breakOn && (tac.counter || R() < 0.55);
    const restartOnly = p.restartKick; p.restartKick = false;
    const opts = [];
    const sdx = L - pu, sdy = abs(pv - CY), sd = hyp(sdx, sdy);
    if (!restartOnly && sdx < 35 && sdy < 24 && sdx > 0.5) {
      const xg = shotXg(p, sdx, sdy, false);
      const minXg = sd > 17 ? (p.tags.has("long-shot taker") || p.a.lon > 0.8 ? 0.014 : 0.02) : 0.045;
      if (xg > minXg) {
        let e = xg * 0.85 * (0.95 + 0.6 * (p.a.fin - 0.7)) * (0.8 + 0.4 * tac.mentality) * (1 + 0.2 * team.momEff);
        if (sd > 17) e *= (1.1 + 1.1 * p.a.lon) * (p.tags.has("long-shot taker") ? 1.35 : 1) * (pressure < 0.3 ? 1.3 : 1);
        if (p.firstTime) e *= 1.15;
        opts.push({ k: "shot", ev: e, xg });
      }
    }
    for (const r of team.onPitch) {
      if (r === p) continue;
      const rGK = r.G === "GK"; if (rGK && !(pu < 30 && pressure > 0.3 && tac.buildUp !== "direct")) continue;
      const d = hyp(r.x - p.x, r.y - p.y), ru = U(team, r.x), rv = V(team, r.y);
      if (d < 45) { const o = passOption(p, r, "ground", pressure); if (o) opts.push(o); }
      if (d > 24 && !rGK && (r.G !== "DEF" || abs(rv - CY) > 18)) { const o = passOption(p, r, "loft", pressure); if (o) opts.push(o); }
      if (!restartOnly && r.G !== "DEF" && !rGK && ru > pu - 2 && r.run && r.run.hold && (p.a.vis > 0.62 || p.tags.has("advanced playmaker") || p.tags.has("deep-lying playmaker"))) { const o = passOption(p, r, "through", pressure); if (o) opts.push(o); }
      if (!restartOnly && r.G !== "DEF" && !rGK && r.run && r.run.hold && d > 14 && L - c.offU > 20 && (p.a.pas > 0.55 || p.G === "DEF")) { const o = passOption(p, r, "over", pressure); if (o) opts.push(o); }
      if (pu > L - 36 && abs(pv - CY) > 11 && ru > L - 24 && abs(rv - CY) < 15) { const o = passOption(p, r, "cross", pressure); if (o) opts.push(o); }
      if (!restartOnly && pu > L - 15 && abs(pv - CY) > 7 && ru > L - 21 && ru < pu - 2 && abs(rv - CY) < 11) { const o = passOption(p, r, "cutback", pressure); if (o) opts.push(o); }
    }
    if (!restartOnly) {
      const dirs = [[1, 0], [0.8, 0.6], [0.8, -0.6], [0.25, 1], [0.25, -1]];
      for (const [du, dv] of dirs) {
        const tu = pu + du * 6.5, tv = pv + dv * 6.5; if (tu > L - 1 || tv < 1.5 || tv > W - 1.5 || tu < 1) continue;
        const pt = XY(team, tu, tv);
        let near = 99, block = null, blockD = 99, crowd = 0;
        const sx = pt.x - p.x, sy = pt.y - p.y, L2 = sx * sx + sy * sy;
        for (const o of opp.onPitch) {
          const dd = hyp(o.x - pt.x, o.y - pt.y); if (dd < near) near = dd; if (dd < 5) crowd++;
          if (o.stun > S.tick) continue;
          const t = clamp(((o.x - p.x) * sx + (o.y - p.y) * sy) / L2, 0, 1), dl = hyp(o.x - p.x - sx * t, o.y - p.y - sy * t);
          if (t > 0.05 && dl < 1.8 && dl < blockD) { blockD = dl; block = o; }
        }
        let P, k = "carry";
        if (block) { k = "takeon"; P = clamp(0.28 + 0.65 * (p.a.dri - 0.85 * block.a.tac) + 0.35 * (p.a.pac - block.a.pac) + (p.tags.has("dribbler") ? 0.08 : 0), 0.08, 0.8); }
        else P = clamp(0.97 - pressure * 0.25 - (near < 3 ? (3 - near) * 0.13 : 0) - 0.06 * crowd, 0.2, 0.97);
        let e = P * threat(tu, tv) - (1 - P) * lossHere;
        if (k === "takeon") e *= p.tags.has("dribbler") ? 1.3 : 0.9;
        if (du > 0.5) e *= (1 + 0.25 * tac.tempo) * (counterOn ? 1.3 : 1);
        if (du > 0.5 && pu < 50 && pressure < 0.15 && !block) e += 0.0012;   // step into space when nobody closes you down
        e *= 0.92 + 0.16 * p.a.dri;
        opts.push({ k, ev: e, tx: pt.x, ty: pt.y, P });
      }
      if (pressure > 0.55) opts.push({ k: "hold", ev: 0.5 * threat(pu, pv) * (0.55 + 0.6 * p.a.str) * (p.tags.has("target man") ? 1.3 : 1) });
      if (pu < 24 && pressure > 0.45) opts.push({ k: "clear", ev: 0.004 + 0.012 * pressure });
      else if (pu < 30 && tac.mentality < 0.3 && pressure > 0.15) opts.push({ k: "clear", ev: 0.004 + 0.01 * pressure + 0.006 * (0.3 - tac.mentality) / 0.3 });
      // a deep, defensive side doesn't keep the ball at the back for long: after a few seconds it goes long
      if (tac.mentality < 0.3 && tac.tempo < 0.45 && pu < 50 && S.tick - S.lastPossChange[team.side] > 50 + 120 * tac.mentality) opts.push({ k: "clear", hoof: true, ev: 0.004 + 0.02 * (0.3 - tac.mentality) / 0.3 });
    }
    if (!opts.length) { p.nextDec = S.tick + 3; return; }
    opts.sort((a, b) => b.ev - a.ev);
    const dq = 0.45 * p.a.vis + 0.35 * (p.a.com + homeComp(team)) + 0.2 * team.org - 0.25 * pressure * (1 - p.a.com) - team.minusComp;
    let pick = opts[0];
    if (opts.length > 1 && R() > 0.5 + 0.45 * dq) { pick = opts[1]; if (opts.length > 2 && R() < 0.35) pick = opts[2]; }
    p.firstTime = false;
    execute(p, pick, pressure);
  }
  function passOption(p, r, kind, pressure) {
    const team = p.team, tac = team.tac, opp = team.opp;
    const d0 = hyp(r.x - p.x, r.y - p.y);
    let tx, ty, spd, loft = false, Tf = 0;
    if (kind === "ground" || kind === "cutback") { spd = clamp(10.5 + d0 * 0.4, 10.5, 24); const t = d0 / spd; tx = r.x + r.vx * t * 0.7; ty = r.y + r.vy * t * 0.7; }
    else if (kind === "loft" || kind === "cross") {
      loft = true; Tf = kind === "cross" ? 0.95 + d0 / 45 : 0.7 + d0 / 30;
      if (kind === "cross") { const pt = XY(team, clamp(U(team, r.x + r.vx * Tf), L - 13, L - 4), clamp(V(team, r.y + r.vy * Tf), CY - 9, CY + 9)); tx = pt.x; ty = pt.y; }
      else { tx = r.x + r.vx * Tf * 0.8; ty = r.y + r.vy * Tf * 0.8; }
      spd = d0 / Tf;
    }
    else if (kind === "over") {   // lofted ball over the top into the space behind the line
      const space = L - team.ctx.offU, ahead = clamp(4 + 0.35 * space, 6, 16) + 3 * r.a.pac, ru = U(team, r.x);
      const pt = XY(team, min(ru + ahead, L - 7), V(team, r.y)); tx = pt.x; ty = pt.y + r.vy * 0.4;
      // a higher, dropping arc: over the heads of the line, down into the space behind it
      loft = true; Tf = 1.05 + hyp(tx - p.x, ty - p.y) / 28; spd = hyp(tx - p.x, ty - p.y) / Tf;
    }
    else { const ahead = 6 + 5 * r.a.pac, ru = U(team, r.x); const pt = XY(team, min(ru + ahead, L - 6), V(team, r.y)); tx = pt.x; ty = pt.y + r.vy * 0.6; spd = clamp(11.5 + d0 * 0.38, 11.5, 24); }
    if (tx < 1 || tx > L - 1 || ty < 1 || ty > W - 1) return null;
    if (loft && !(WX.longOK >= 1) && d0 > 35 && R() > WX.longOK) return null;
    const dd = hyp(tx - p.x, ty - p.y);
    let risk = 0;
    const sx = tx - p.x, sy = ty - p.y, L2 = sx * sx + sy * sy || 1;
    for (const o of opp.onPitch) {
      if (loft) {
        // defenders who have to turn and chase a ball dropping behind them lose a moment
        const turn = kind === "over" && U(team, o.x) < U(team, tx) - 2 && o.G !== "GK" ? 0.45 : 0;
        const tO = max(0, hyp(o.x - tx, o.y - ty) - 1.2) / (o.vmax * 0.85) + turn, tR = max(0, hyp(r.x - tx, r.y - ty) - 1.2) / (r.vmax * 0.85);
        if (tO < Tf + 0.35) risk += (tO <= tR ? 0.45 : 0.2 * (1 - (tO - tR) / 1.5 > 0 ? 1 - (tO - tR) / 1.5 : 0)) * (0.6 + 0.6 * o.a.hea) * (o.G === "GK" && kind === "cross" ? 1.4 : 1);
        continue;
      }
      let t = ((o.x - p.x) * sx + (o.y - p.y) * sy) / L2; if (t < 0) continue; if (t > 1) t = 1;
      const dO = hyp(o.x - p.x - sx * t, o.y - p.y - sy * t); if (dO > 9) continue;
      const tb = t * dd / spd, to = max(0, dO - 0.8) / (o.vmax * 0.8) + 0.2 + 0.2 * (1 - o.a.tac);
      if (to < tb + 0.1) risk += 0.9 * (1 - to / (tb + 0.15));
      if (dO < 1.8) risk += 0.4 * (1 - dO / 1.8) + 0.2;
    }
    if (kind === "cross") risk += 0.25 * (1 - p.a.cro);
    if (kind === "loft") { risk += 0.12 + 0.004 * d0; const reach = r.vmax * 0.85 * Tf + 1.5; if (hyp(r.x - tx, r.y - ty) > reach) return null; }
    if (kind === "over") { risk += 0.1 + 0.003 * d0; const reach = r.vmax * 0.9 * Tf + 2; if (hyp(r.x - tx, r.y - ty) > reach) return null; }
    const skill = kind === "cross" ? p.a.cro : kind === "over" ? 0.6 * p.a.pas + 0.4 * p.a.vis : p.a.pas;
    let P = (1 - min(risk, 0.97)) * (1 - dd * 0.005 * (1.25 - skill) * (loft ? 1.6 : 1)) * (1 - pressure * 0.12 * (1 - p.a.com));
    const ro = nearestOf(opp.onPitch, tx, ty), rPress = ro ? clamp((2.5 - ro.d) / 2.5, 0, 1) : 0;
    P *= 1 - 0.25 * rPress;
    if (team.links.has(p.slot && r.slot ? p.slot.k + "|" + r.slot.k : "")) P = min(0.98, P + 0.04);
    P = clamp(P, 0.02, 0.98);
    const tu = U(team, tx), tv = V(team, ty), pu = U(team, p.x);
    let val = threat(tu, tv) * (0.85 + 0.3 * (1 - rPress));
    if (kind === "cross") val = xgAt(L - tu, abs(tv - CY)) * (0.55 + 0.6 * r.a.hea + (r.h - 1.8) * 0.8 + (r.tags.has("aerial threat") || r.tags.has("target man") ? 0.15 : 0)) + threat(tu, tv) * 0.25;
    if (kind === "cutback") val *= 1.2;
    if (kind === "through") val *= 1.1;
    // played clean through: nobody but the keeper between the receiver and goal is worth a lot more than the spot suggests
    if (kind === "through" || kind === "over") {
      let between = 0; for (const o of opp.onPitch) if (o.G !== "GK" && U(team, o.x) > tu - 1) between++;
      if (between === 0) val += 0.06 + 0.12 * clamp((tu - 45) / 45, 0, 1);
      else if (between === 1) val += 0.03 * clamp((tu - 45) / 45, 0, 1);
    }
    const prog = tu - pu;
    let e = P * val - (1 - P) * (lossCost(tu) * 0.8 + lossCost(pu) * 0.2);
    if (prog > 3) e *= 1 + 0.35 * tac.tempo; else if (prog < -3) e *= 1.15 - 0.5 * tac.tempo;
    if (tac.buildUp === "short" && pu < 45 && dd < 22) e += 0.002 * P;
    if (tac.buildUp === "direct" && dd > 30 && prog > 15) e *= 1.45;
    // teams look to progress rather than recycle forever at the back
    const stale = S.tick - S.lastPossChange[team.side], pu0 = U(team, p.x);
    if (pu0 < 55) { if (prog > 4) e += 0.0005 * min(prog, 25) * (stale > 250 ? 1.5 : 1); else if (prog < -2 && stale > 200) e *= 0.75; }
    if (p.lastPass && p.lastPass.from === r && S.tick - p.lastPass.tick < 80) e *= 0.65;
    if (tac.buildUp === "short" && dd > 35) e *= 0.7;
    if (prog > 8 && S.tick - S.lastPossChange[team.side] < 60 && (S.wonAt[team.side] || 99) < 60) e += (tac.counter ? 0.006 : 0.0025) * min(1, prog / 25);
    const sit = clamp((0.4 - tac.mentality) / 0.4, 0, 1) * clamp((0.45 - tac.tempo) / 0.45 + 0.5, 0.5, 1.5);
    if (sit > 0 && pu < 55) { if ((loft || kind === "over") && prog > 18) e += 0.005 * sit; else if (prog < 6) e -= 0.0015 * sit; }
    if (abs(tv - CY) > 20) e *= 0.85 + 0.3 * tac.width;
    e += 0.0035 * P * (1 - tac.tempo);
    if (p.tags.has("deep-lying playmaker") || p.tags.has("advanced playmaker")) { if (kind === "through" || kind === "over" || (kind === "loft" && prog > 15)) e *= 1.2; }
    if (kind === "cross") e *= (0.8 + 0.5 * p.a.cro) * (p.slot && (p.slot.g === "W" || p.slot.g === "FB") ? 1.25 : 1) * (0.85 + 0.3 * tac.width);
    return { k: "pass", kind, r, tx, ty, spd, loft, Tf, P, ev: e, prog };
  }
  function execute(p, o, pressure) {
    const team = p.team;
    if (o.k === "shot") { doShot(p, { xg: o.xg, volley: p.volley }); p.volley = false; return; }
    if (o.k === "takeon") { DBG.takeon++;
      const def = nearestOf(team.opp.onPitch, p.x, p.y, q => (q.G !== "GK" || inOwnBox(q)) && q.stun <= S.tick);
      if (def && def.d < 4) {
        const dfn = def.p, chaos = p.team.aura && p.team.aura.trigger === "chaos" ? 1.3 : 1;
        DBG.toTry = (DBG.toTry || 0) + 1;
        if (R() < o.P) { DBG.toWin = (DBG.toWin || 0) + 1; DEBUG && chain(`${team.side} BEAT ${dfn.name.split("-")[0]}`); dfn.stun = S.tick + 11; p.lastBeat = S.tick; p.st.dribbles++; rate(p, 0.09); rate(dfn, -0.05); }
        else if (R() < (0.08 + 0.14 * dfn.a.agg) * RF.foul * chaos * (U(p.team, p.x) > L - BOX_D && abs(V(p.team, p.y) - CY) < BOX_H ? 0.18 : 1)) { foul(dfn, p); return; }
        else { dfn.team.stats.tackles++; dfn.st.tackles++; rate(dfn, 0.11); rate(p, -0.07); if (R() < 0.4) { B.owner = null; B.mode = "play"; B.vx = (dfn.x - p.x) * 2.5 + rr(-3, 3); B.vy = (dfn.y - p.y) * 2.5 + rr(-3, 3); B.last = dfn; B.lastTeam = dfn.team; B.flight++; B.tried = {}; } else giveBall(dfn); return; }
      }
    }
    if (o.k !== "pass" && o.k !== "shot") DEBUG && chain(`${team.side} ${o.k} ${p.name.split("-")[0]}@${round(U(team, p.x))}`);
    if (o.k === "carry" || o.k === "takeon") { p.carry = { x: o.tx, y: o.ty, until: S.tick + floor(rr(6, 12)), takeOn: o.k === "takeon" }; p.carryStart = S.tick; p.nextDec = S.tick + (o.k === "takeon" ? 6 : 7); return; }
    if (o.k === "hold") { p.carry = { x: p.x, y: p.y, until: S.tick + 5, hold: true }; p.nextDec = S.tick + 5; return; }
    if (o.k === "clear") {
      const toTouch = !o.hoof && R() < 0.4, pv = V(team, p.y);
      const t = toTouch ? XY(team, min(U(team, p.x) + rr(15, 35), L - 12), pv < CY ? -6 : W + 6) : XY(team, min(U(team, p.x) + rr(38, 52), L - 12), clamp(pv + rr(-16, 16), 5, W - 5));
      launch(p, t.x + gauss() * 3, t.y + gauss() * 3, { loft: true, T: toTouch ? 1.4 : 2.0 }); B.pass = { from: p, to: null, kind: "clear", tick: S.tick, loft: true }; rate(p, 0.01); return;
    }
    // passes
    const d = hyp(o.tx - p.x, o.ty - p.y);
    const skill = o.kind === "cross" ? p.a.cro : p.a.pas;
    let err = (1.25 - skill) * (1 + pressure * 0.7) * (1 + 0.5 * (1 - p.energy)) * WX.err * (o.loft ? WX.wind : 1) * (1 - 0.05 * team.momEff) * (1 - homeComp(team)) * (1 + team.minusComp);
    if (team.links.has(p.slot && o.r.slot ? p.slot.k + "|" + o.r.slot.k : "")) err *= 0.85;
    const kErr = o.kind === "through" ? 2.1 : o.kind === "over" ? 1.9 : o.loft ? 1.5 : 1;
    const lat = gauss() * d * 0.045 * err * kErr, lng = gauss() * d * 0.05 * err * kErr, ux = (o.tx - p.x) / (d || 1), uy = (o.ty - p.y) / (d || 1);
    const tx = clamp(o.tx + ux * lng - uy * lat, -1, L + 1), ty = clamp(o.ty + uy * lng + ux * lat, -1, W + 1);
    const t = o.loft ? launch(p, tx, ty, { loft: true, T: o.Tf }) : launch(p, tx, ty, {});
    const c = team.ctx, ru = U(team, o.r.x);
    const offside = ru > max(c.offU - (team.ctx.own ? 0 : 0), U(team, p.x)) + 0.3 && ru > L / 2 && o.kind !== "cutback" ? true : ((o.kind === "through" || o.kind === "over") && R() < 0.05 * (1.3 - o.r.a.com));
    B.pass = { from: p, to: o.r, kind: o.kind, tick: S.tick, loft: o.loft, offside };
    DEBUG && chain(`${team.side} ${o.kind} ${p.name.split("-")[0]}@${round(U(team, p.x))}->${o.r.name.split("-")[0]}@${round(U(team, tx))},${round(V(team, ty))} P${round(o.P * 100)}`);
    const dk = DBG.pass[o.kind] || (DBG.pass[o.kind] = { n: 0, ok: 0, P: 0 }); dk.n++; dk.P += o.P;
    o.r.recv = { x: tx, y: ty, until: S.tick + round(t / DT) + 8 };
    if (o.r.run) o.r.run = null;
    // play through the press and the players who pressed are turned the wrong way, out of the game for a moment
    for (const q of team.opp.ctx.pressers || []) { if (U(team, q.x) > U(team, p.x) - 1 && U(team, tx) > U(team, q.x) + 3) q.lag = max(q.lag, S.tick + 7); }
    // a ball in behind catches defenders facing the wrong way: the runner already knew it was coming
    if (o.kind === "over" || o.kind === "through") for (const q of team.opp.onPitch) {
      if (q.G === "GK") continue; const qu = U(team, q.x);
      if (qu > ru - 6 && qu < U(team, tx) + 2) q.lag = S.tick + round(4 + 4 * (1 - 0.5 * q.a.mar - 0.5 * q.a.pac));
    }
    team.stats.passes++; p.st.passes++;
    if (p.slot && (p.slot.g === "CM" || p.slot.g === "AM") && R() < 0.3 * team.tac.tempo) { const pt = XY(team, U(team, p.x) + 7, V(team, p.y)); p.run = { u: U(team, pt.x), v: V(team, pt.y), hold: false, until: S.tick + 15 }; }
  }

  /* ---------- restarts and set pieces ---------- */
  function setRestart(type, team, x, y, extra) {
    extra = extra || {};
    if (B.shot && !B.shot.done) shotOutcome(B.shot, B.z > 2.4 ? "over" : "wide");
    B.mode = "dead"; B.owner = null; B.pass = null; B.shot = null; B.vx = B.vy = B.vz = 0;
    for (const p of ents) { p.carry = null; p.run = null; p.recv = null; p.hands = false; p.dive = null; }
    const u = U(team, x), v = V(team, y);
    let kind = type;
    if (type === "freekick" && !extra.offside) {
      if (u > L - 28 && abs(v - CY) < 15) kind = "fkdirect";
      else if (u > L - 42 && abs(v - CY) >= 12) kind = "fkcross";
      else kind = "fkshort";
    } else if (type === "freekick") kind = "fkshort";
    const delays = { throw: [9, 19], goalkick: [20, 32], corner: [24, 36], fkshort: [10, 21], fkcross: [22, 34], fkdirect: [32, 48], penalty: [50, 70], kickoff: [42, 58] };
    let [a, b] = delays[kind] || [5, 9];
    if ((kind === "fkshort" || kind === "fkcross" || kind === "fkdirect") && R() < 0.22) { a += 25; b += 55; }   // a player down, treatment
    DBG.restarts = DBG.restarts || {}; DBG.restarts[kind] = (DBG.restarts[kind] || 0) + 1;
    const r = { type: kind, team, x, y, ready: S.tick + round(rr(a, b) / DT), taker: null, spots: new Map(), celebrate: extra.celebrate || null, ballSpeed: kind === "kickoff" ? 14 : 9 };
    if (kind === "kickoff" && extra.half) r.ready = S.tick + 5;
    S.restart = r;
    if (kind === "corner") { team.stats.corners++; addMom(team, 0.08); ev("corner", { team: team.side }); }
    if (kind === "fkdirect" || kind === "fkcross" || kind === "penalty") addMom(team, kind === "penalty" ? 0.3 : 0.1);
    r.taker = chooseTaker(r);
    if (kind === "corner" || kind === "fkcross" || kind === "fkdirect") boxSpots(r);
    if (kind === "penalty") penSpots(r);
    if (kind === "kickoff") { const [k1, k2] = kickers(team); r.taker = k1; r.k2 = k2; }
    managerSubs(T.A); managerSubs(T.B);
    if (S.lastSubTick === S.tick) r.ready = max(r.ready, S.tick + 90);
  }
  function kickers(team) { const f = team.onPitch.filter(p => p.G !== "GK").sort((a, b) => (b.slot ? b.slot.y : 0) - (a.slot ? a.slot.y : 0) || a.id - b.id); return [f[0], f[1]]; }
  function chooseTaker(r) {
    const team = r.team, op = team.onPitch.filter(p => p.G !== "GK");
    if (r.type === "goalkick") return gkOf(team) || op[0];
    if (r.type === "throw" || r.type === "fkshort") return nearestOf(op, r.x, r.y).p;
    if (r.type === "penalty") { const cap = op.find(p => p.name === team.captain); return cap || [...op].sort((a, b) => (b.a.fin + b.a.com) - (a.a.fin + a.a.com) || a.id - b.id)[0]; }
    const spec = op.filter(p => p.tags.has("set-piece specialist"));
    const pool = spec.length ? spec : op;
    if (r.type === "fkdirect") return [...pool].sort((a, b) => (b.a.lon + b.a.fin) - (a.a.lon + a.a.fin) || a.id - b.id)[0];
    return [...pool].sort((a, b) => b.a.cro - a.a.cro || a.id - b.id)[0];
  }
  function boxSpots(r) {
    const team = r.team, opp = team.opp, s = V(team, r.y) < CY ? -1 : 1;
    const atk = team.onPitch.filter(p => p !== r.taker && p.G !== "GK");
    const headers = [...atk].sort((a, b) => (b.a.hea + (b.h - 1.8) * 2 + (b.tags.has("aerial threat") ? 0.1 : 0)) - (a.a.hea + (a.h - 1.8) * 2 + (a.tags.has("aerial threat") ? 0.1 : 0)) || a.id - b.id);
    const zones = [[L - 4.5, CY + s * 4.5], [L - 6, CY], [L - 5.5, CY - s * 5.5], [L - 11, CY + s * 1.5], [L - 9.5, CY - s * 4]];
    const inBox = headers.slice(0, r.type === "fkdirect" ? 4 : 5);
    inBox.forEach((p, i) => { const z = zones[i]; r.spots.set(p.id, XY(team, z[0] - (r.type === "fkdirect" ? 6 : 0), z[1] + rr(-1, 1))); });
    const rest = atk.filter(p => !inBox.includes(p)).sort((a, b) => (b.slot ? b.slot.y : 0) - (a.slot ? a.slot.y : 0) || a.id - b.id);
    rest.forEach((p, i) => { r.spots.set(p.id, i === 0 ? XY(team, L - 19, CY + rr(-5, 5)) : XY(team, i === 1 ? L - 30 : 46, CY + (i % 2 ? -1 : 1) * 10)); });
    const def = opp.onPitch.filter(p => p.G !== "GK"); const used = new Set();
    const gk = gkOf(opp); if (gk) r.spots.set(gk.id, XY(team, L - 0.8, CY + s * 0.6));
    const fw = [...def].sort((a, b) => (b.slot ? b.slot.y : 0) - (a.slot ? a.slot.y : 0) || a.id - b.id).slice(0, 1);
    fw.forEach(p => { used.add(p.id); r.spots.set(p.id, XY(team, 55, CY + rr(-6, 6))); });
    if (r.type === "fkdirect") {
      const bx = U(team, r.x), by = V(team, r.y), gd = hyp(L - bx, CY - by) || 1, ux = (L - bx) / gd, uy = (CY - by) / gd, n = gd < 22 ? 4 : 3;
      r.wall = [];
      const cand = def.filter(p => !used.has(p.id)).sort(byDist(r.x, r.y));
      for (let i = 0; i < n && i < cand.length; i++) { const p = cand[i]; used.add(p.id); r.wall.push(p.id); const off = (i - (n - 1) / 2) * 0.6; r.spots.set(p.id, XY(team, bx + ux * 9.15 - uy * off, by + uy * 9.15 + ux * off)); }
    }
    for (const a of inBox) { const sp = r.spots.get(a.id); const m = def.filter(p => !used.has(p.id)).sort(byDist(sp.x, sp.y))[0]; if (!m) break; used.add(m.id); const g = XY(team, L, CY), d = hyp(g.x - sp.x, g.y - sp.y) || 1; r.spots.set(m.id, { x: sp.x + (g.x - sp.x) / d * 0.9, y: sp.y + (g.y - sp.y) / d * 0.9 }); }
    def.filter(p => !used.has(p.id)).forEach((p, i) => r.spots.set(p.id, XY(team, i === 0 ? L - 3 : L - 17, CY + (i === 0 ? s * 3 : rr(-6, 6)))));
  }
  function penSpots(r) {
    const team = r.team, all = [...team.onPitch, ...team.opp.onPitch].filter(p => p !== r.taker && p.G !== "GK");
    all.forEach((p, i) => r.spots.set(p.id, XY(team, L - BOX_D - rr(1, 3), CY - 18 + 36 * (i + 0.5) / all.length)));
    const gk = gkOf(team.opp); if (gk) r.spots.set(gk.id, XY(team, L - 0.3, CY));
    const own = gkOf(team); if (own) r.spots.set(own.id, XY(team, 30, CY));
  }
  function kickoffPos(p, kt, r) {
    const team = p.team, s = p.slot;
    if (r && p === r.taker) return XY(team, L / 2 - 0.4, CY);
    if (r && p === r.k2) return XY(team, L / 2 - 1.8, CY - 2.5);
    if (!s) return { x: p.x, y: p.y };
    if (p.G === "GK") return XY(team, 4, CY);
    const q = clamp((s.y - 19) / 67, 0, 1);
    let u = min(10 + q * 36, L / 2 - 1.5); const v = CY + (s.x / 100 * W - CY) * 0.85;
    if (team !== kt && hyp(L / 2 - u, v - CY) < 9.6) u = L / 2 - 9.6;
    return XY(team, u, v);
  }
  function setPieceTarget(p) {
    const r = S.restart; if (!r) { setT(p, p.x, p.y, 1); return; }
    if (r.celebrate && S.tick < r.celebrate.until) { celebrate(p, r.celebrate); return; }
    if (p === r.taker) {
      const team = p.team; let bx = r.x, by = r.y;
      if (r.type === "throw") { setT(p, r.x, r.y < CY ? -0.3 : W + 0.3, 2); return; }
      const g = XY(team, L, CY), d = hyp(g.x - bx, g.y - by) || 1, back = r.type === "kickoff" ? 0.3 : 0.9;
      setT(p, bx - (g.x - bx) / d * back, by - (g.y - by) / d * back, 2); return;
    }
    if (r.type === "kickoff") { const k = kickoffPos(p, r.team, r); setT(p, k.x, k.y, S.tick > r.ready - 80 ? 2 : 1); return; }
    const sp = r.spots.get(p.id);
    if (sp) { setT(p, sp.x, sp.y, 2); return; }
    if (p.G === "GK" && p.team !== r.team) { gkPosition(p); return; }
    if (p.team.ctx.own) attackTarget(p); else defendTarget(p);
  }
  function celebrate(p, c) {
    if (c.scorer && p === c.scorer) { const v = V(p.team, p.y) < CY ? 1.5 : W - 1.5; setXY(p, L - 2, v, S.tick < c.until - 90 ? 3 : 0); return; }
    if (c.scorer && p.team === c.team && p.G !== "GK") { setT(p, c.scorer.x, c.scorer.y, S.tick > c.until - 130 ? 3 : 1); return; }
    const k = kickoffPos(p, S.restart.team, S.restart); setT(p, k.x, k.y, 0);
  }
  function restartStep() {
    const r = S.restart; if (!r) return;
    if (!r.taker || !r.taker.playing) r.taker = chooseTaker(r);
    if (r.type === "kickoff" && r.celebrate && S.tick >= r.celebrate.until) r.celebrate = null;
    if (S.tick < r.ready) return;
    const tk = r.taker, nearSpot = hyp(B.x - r.x, B.y - r.y) < 0.5, tkd = hyp(tk.x - r.x, tk.y - r.y);
    if (!nearSpot || tkd > (r.type === "throw" ? 1.6 : 1.5)) { if (S.tick > r.ready + 120) { tk.x = r.x - 0.6; tk.y = r.y; B.x = r.x; B.y = r.y; } else return; }
    executeRestart(r);
  }
  function executeRestart(r) {
    const team = r.team, tk = r.taker; S.restart = null;
    B.x = r.x; B.y = r.y; B.z = 0;
    if (r.type === "kickoff") {
      giveBall(tk); const back = team.onPitch.filter(q => q.slot && GROUP(q.slot.g) === "MID").sort(byDist(tk.x, tk.y))[0] || r.k2 || tk;
      if (back !== tk) { const t = launch(tk, back.x, back.y, {}); B.pass = { from: tk, to: back, kind: "ground", tick: S.tick }; back.recv = { x: back.x, y: back.y, until: S.tick + round(t / DT) + 8 }; team.stats.passes++; }
      return;
    }
    if (r.type === "throw") {
      const opts = team.onPitch.filter(q => q !== tk && q.G !== "GK" && hyp(q.x - tk.x, q.y - tk.y) < 22).sort((a, b) => (hyp(a.x - tk.x, a.y - tk.y) - 4 * pressureOn(a)) - (hyp(b.x - tk.x, b.y - tk.y) - 4 * pressureOn(b)) || a.id - b.id);
      const tgt = opts[floor(R() * min(2, opts.length))] || nearestOf(team.onPitch, tk.x, tk.y, q => q !== tk).p;
      const d = hyp(tgt.x - tk.x, tgt.y - tk.y), t = launch(tk, tgt.x + gauss() * 0.6, tgt.y + gauss() * 0.6, { loft: true, T: 0.55 + d / 25, z0: 2.0 });
      B.pass = { from: tk, to: tgt, kind: "throw", tick: S.tick, loft: true }; tgt.recv = { x: tgt.x, y: tgt.y, until: S.tick + round(t / DT) + 8 }; team.stats.passes++; return;
    }
    if (r.type === "goalkick" || r.type === "fkshort") {
      giveBall(tk); tk.restartKick = true; tk.controlUntil = S.tick; tk.nextDec = S.tick;
      if (r.type === "goalkick" && R() > (team.tac.buildUp === "short" ? 0.8 : team.tac.buildUp === "mixed" ? 0.45 : 0.12)) { tk.restartKick = false; tk.hands = false; keeperDistribute(tk); }
      return;
    }
    if (r.type === "penalty") { giveBall(tk); penaltyKick(tk, team, false); return; }
    if (r.type === "fkdirect" && (R() < 0.75 || tk.a.lon > 0.75)) {
      giveBall(tk); const u = U(team, tk.x), v = V(team, tk.y);
      doShot(tk, { freekick: true, setpiece: true, xg: clamp(xgAt(L - u, abs(v - CY)) * 0.45, 0.02, 0.12), wall: r.wall || [] }); return;
    }
    // corners and crossed free kicks
    giveBall(tk);
    if (r.type === "corner" && R() < 0.12) { const m = nearestOf(team.onPitch, tk.x, tk.y, q => q !== tk && q.G !== "GK"); if (m) { const t = launch(tk, m.p.x, m.p.y, {}); B.pass = { from: tk, to: m.p, kind: "ground", tick: S.tick }; m.p.recv = { x: m.p.x, y: m.p.y, until: S.tick + round(t / DT) + 8 }; return; } }
    const box = team.onPitch.filter(q => q !== tk && q.G !== "GK" && U(team, q.x) > L - 17);
    let tgt = null, bs = -9; for (const q of box) { const s = q.a.hea + (q.h - 1.8) * 2 + R() * 0.5; if (s > bs) { bs = s; tgt = q; } }
    const aim = tgt ? { x: tgt.x, y: tgt.y } : XY(team, L - 8, CY);
    const err = (1.3 - tk.a.cro) * 2.6 * WX.wind;
    const t = launch(tk, aim.x + gauss() * err, aim.y + gauss() * err, { loft: true, T: 1.25 + rr(0, 0.35) });
    B.pass = { from: tk, to: tgt, kind: "cross", tick: S.tick, loft: true, setpiece: true };
    if (tgt) tgt.recv = { x: aim.x, y: aim.y, until: S.tick + round(t / DT) + 6 };
    team.stats.passes++; tk.st.passes++;
  }
  function penaltyKick(tk, team, shootout) {
    const gk = gkOf(team.opp), skill = 0.5 * tk.a.fin + 0.5 * tk.a.com;
    const pGoal = clamp(0.77 + 0.3 * (skill - 0.75) - 0.22 * ((gk ? gk.a.gkr : 0.4) - 0.75) + (shootout ? -0.02 : 0), 0.55, 0.93);
    const r = R(), outc = r < pGoal ? "goal" : r < pGoal + (1 - pGoal) * 0.72 ? "saved" : "miss";
    const side = R() < 0.5 ? -1 : 1;
    let target;
    if (outc === "goal") target = { v: CY + side * rr(1.4, 3.2), z: rr(0.15, 2.0) };
    else if (outc === "saved") target = { v: CY + side * rr(0.7, 2.3), z: rr(0.2, 1.3) };
    else target = R() < 0.6 ? { v: CY + side * rr(3.9, 5), z: rr(0.2, 1.8) } : { v: CY + side * rr(0, 3), z: rr(2.6, 3.4) };
    doShot(tk, { pen: true, setpiece: true, xg: 0.78, forced: outc === "saved" ? "saved" : outc === "goal" ? "goal" : null, target });
  }

  /* ---------- managers ---------- */
  function managerSubs(team) {
    if (S.shootout || team.subs >= 3 || !team.bench.length || clockMin() < 46) return;
    if (S.lastSubCheck && S.lastSubCheck[team.side] && S.tick - S.lastSubCheck[team.side] < 450) return;
    S.lastSubCheck = S.lastSubCheck || {}; S.lastSubCheck[team.side] = S.tick;
    const min_ = clockMin(), diff = team.score - team.opp.score, smart = team.mgr;
    const bench = team.bench.filter(b => b.state === "bench" && b.G !== "GK");
    if (!bench.length) return;
    const fit = (b, slotG) => b.g0 === slotG ? 1 : (COVER[b.g0] || []).includes(slotG) ? 0.6 : 0;
    // tired legs first, then a bad game; a booked defender late on is a risk worth removing
    const need = p => (p.energy < 0.6 ? (0.6 - p.energy) * 4 : 0) + (p.rating < 6.2 ? (6.2 - p.rating) * 0.9 : 0)
      + (p.yellow && min_ > 60 && (p.G === "DEF" || p.g === "DM") ? 0.3 : 0) + (p.meme ? 0.4 : 0) + (min_ > 72 ? 0.06 : 0);
    const bar = (min_ < 60 ? 0.6 : 0.32) - 0.1 * smart;
    let best = null;
    for (const p of team.onPitch) {
      if (p.G === "GK" || p.enteredAt !== 0 || !p.slot) continue;
      const n = need(p); if (n <= bar) continue;
      for (const b of bench) { const f = fit(b, p.slot.g); if (!f) continue; const sc = n + 0.4 * f + 0.01 * (b.ovr - p.ovr); if (!best || sc > best.sc || (sc === best.sc && b.id < best.inn.id)) best = { sc, out: p, inn: b, tactical: false }; }
    }
    // chasing the game late: a midfielder makes way for an extra attacker
    if (!best && diff < 0 && min_ > 64) for (const p of team.onPitch) {
      if (p.enteredAt !== 0 || !p.slot || (p.slot.g !== "CM" && p.slot.g !== "DM")) continue;
      for (const b of bench) { if (b.g0 !== "AM" && b.g0 !== "W" && b.g0 !== "ST") continue; const sc = (1 - p.energy) + 0.3 * (6.8 - p.rating) + 0.01 * b.ovr; if (!best || sc > best.sc) best = { sc, out: p, inn: b, tactical: true }; }
    }
    if (!best) return;
    const { out, inn, tactical } = best;
    team.bench.splice(team.bench.indexOf(inn), 1); team.subs++;
    inn.slot = tactical ? { ...out.slot, g: "AM", y: min(80, out.slot.y + 12) } : out.slot;
    inn.g = inn.slot.g;
    team.onPitch.splice(team.onPitch.indexOf(out), 1); out.playing = false; out.state = "leaving"; out.tx = out.x; out.ty = out.y < CY ? -3 : W + 3; out.urg = 0;
    enter(inn); inn.x = L / 2 + (team.side === "A" ? -3 : 3); inn.y = -0.8; inn.energy = 1;
    S.lastSubTick = S.tick;
    ev("sub", { team: team.side, p: inn.id, out: out.id, tactical, why: tactical ? "attack" : out.energy < 0.6 ? "tired" : out.rating < 6.2 ? "poor" : out.yellow ? "booked" : "fresh legs" });
  }
  function updateTactics(team) {
    const b = team.tacBase, m = team.momEff, diff = team.score - team.opp.score, mn = clockMin();
    let ment = b.mentality, press = b.press, tempo = b.tempo, line = b.line;
    const k = 0.6 + 0.4 * team.mgr;
    if (diff < 0 && mn >= 62) { const late = mn >= 80 ? 1 : 0.6; ment += 0.25 * k * late; tempo += 0.15 * k * late; press += 0.1 * k * late; line += 0.08 * k * late;
      const lvl = mn >= 80 ? 2 : 1; if ((team.shout || 0) < lvl && S.half === 2) { team.shout = lvl; ev("tactic", { team: team.side, kind: lvl === 2 ? "allout" : "chase" }); } }
    if (diff > 0 && mn >= 75) { ment -= 0.2 * k; line -= 0.1 * k; tempo -= 0.1 * k; if (!team.shut && S.half === 2) { team.shut = true; ev("tactic", { team: team.side, kind: "protect" }); } }
    ment += 0.15 * m; press += 0.1 * m;
    const au = team.aura && team.aura.trigger, st = team.auraState;
    if (au === "early_storm" && mn < 15) { ment += 0.25; press += 0.2; tempo += 0.15; }
    if (au === "halftime_surge" && st.surge && mn < 60) { ment += 0.25; press += 0.15; }
    if (au === "comeback_late" && st.late) { ment += 0.3; tempo += 0.2; }
    if (team.minusUntil && S.tick > team.minusUntil) { team.minusComp = 0; team.minusOrg = 0; team.minusUntil = 0; }
    team.tac = { ...b, mentality: clamp(ment, 0, 1), press: clamp(press, 0, 1), tempo: clamp(tempo, 0, 1), line: clamp(line, 0, 1) };
  }
  function auraChecks() {
    const mn = clockMin();
    for (const team of teams) {
      const au = team.aura && team.aura.trigger, st = team.auraState; if (!au || st.used) continue;
      if (au === "early_storm" && S.half === 1 && S.tick === 5) { st.used = true; ev("aura", { team: team.side, name: team.aura.name, trigger: au }); }
      if (au === "early_storm" && mn < 15) addMom(team, 0.004);
      if (au === "comeback_late" && mn >= 75 && team.score < team.opp.score) { st.used = true; st.late = true; ev("aura", { team: team.side, name: team.aura.name, trigger: au }); addMom(team, 0.8); }
      if (au === "chaos" && mn > 1 && !st.flag) { st.flag = true; }
    }
  }

  /* ---------- one tick ---------- */
  function tick() {
    updateContext();
    if (S.tick % 3 === 0) { roles(T.A); roles(T.B); }
    if (input.trace && S.tick >= input.trace[0] && S.tick <= input.trace[1] && S.tick % 3 === 0) { for (const t of teams) { const c = t.ctx; (DBG.trace || (DBG.trace = [])).push(S.tick + " " + t.side + " own" + (c.own ? 1 : 0) + " bu" + round(c.bu) + " press[" + c.pressers.map(p => p.name.split("-")[0] + (p.stun > S.tick ? "*" : "")).join(",") + "] chase[" + c.chasers.map(p => p.name.split("-")[0]).join(",") + "]"); } }
    if (S.tick % 10 === 0) {
      const M = momentum(); T.A.momEff = M; T.B.momEff = -M;
      updateTactics(T.A); updateTactics(T.B); auraChecks();
    }
    if (B.mode === "dead") restartStep(); else if (B.owner) carrierStep(B.owner);
    for (const p of ents) {
      if (!p.on) continue;
      if (p.state === "leaving") { p.ty = p.y < CY ? -3 : W + 3; p.tx = p.x; p.urg = 0; continue; }
      if (p !== B.owner && (S.tick >= p.think || (B.mode === "dead" && ((S.tick + p.id) & 1) === 0))) { think(p); p.think = S.tick + 3; }
    }
    movePlayers();
    ballStep();
    if (B.owner && B.mode === "play") duelStep(B.owner);
    // bookkeeping
    if (B.mode === "play" && S.poss) {
      if (controlled()) S.poss.stats.possTicks++;
      const u = U(S.poss, B.x);
      if (u > L * 0.66) addMom(S.poss, 0.0025);
      if (u > L - BOX_D && abs(V(S.poss, B.y) - CY) < BOX_H) addMom(S.poss, 0.006);
      if (B.owner && u > L - BOX_D && abs(V(S.poss, B.y) - CY) < BOX_H && S.attackFlag !== S.possId) { S.attackFlag = S.possId; ev("attack", { team: S.poss.side, p: B.owner.id }); }
    }
    for (const team of teams) team.momP *= 1 - DT / 150;
    record();
    S.tick++; S.clock += DT;
  }

  /* ---------- the match ---------- */
  function placeForKickoff(kickTeam) {
    const r = { type: "kickoff", team: kickTeam, x: L / 2, y: CY, ready: S.tick + 5, taker: null, spots: new Map(), celebrate: null };
    const [k1, k2] = kickers(kickTeam); r.taker = k1; r.k2 = k2;
    for (const p of [...T.A.onPitch, ...T.B.onPitch]) { const k = kickoffPos(p, kickTeam, r); p.x = k.x; p.y = k.y; p.vx = p.vy = 0; p.tx = k.x; p.ty = k.y; p.fx = dir(p.team); p.fy = 0; }
    B.x = L / 2; B.y = CY; B.z = 0; B.mode = "dead"; B.owner = null; B.pass = null; B.shot = null;
    S.restart = r;
  }
  function playHalf(h) {
    S.half = h; S.clock = h === 1 ? 0 : 2700;
    placeForKickoff(h === 1 ? T.A : T.B);
    ev("kickoff", { team: h === 1 ? "A" : "B" });
    if (h === 2) {
      for (const team of teams) for (const p of team.onPitch) p.energy = min(1, p.energy + 0.1);
      for (const team of teams) if (team.aura && team.aura.trigger === "halftime_surge" && !team.auraState.used && team.score < team.opp.score) { team.auraState.used = true; team.auraState.surge = true; addMom(team, 0.9); ev("aura", { team: team.side, name: team.aura.name, trigger: "halftime_surge" }); }
    }
    let end = h === 1 ? 2700 + S.add1 * 60 : 5400;
    let decided2 = false;
    for (let guard = 0; guard < 36000; guard++) {
      if (h === 2 && !decided2 && S.clock >= 5400) { decided2 = true; const g2 = S.events.filter(e => e.type === "goal" && e.half === 2).length, subs = S.events.filter(e => e.type === "sub").length, cards = S.events.filter(e => e.type === "yellow" || e.type === "red").length; S.add2 = clamp(2 + round(g2 * 0.5 + subs * 0.25 + cards * 0.25 + R()), 2, 7); end = 5400 + S.add2 * 60; ev("added", { minutes: S.add2 }); }
      if (h === 1 && guard === 0) ev("added_plan", { minutes: S.add1 });
      // stoppage-time aura: one last set piece
      if (h === 2 && S.clock > 5400 + 30 && B.mode === "play") for (const team of teams) {
        const au = team.aura && team.aura.trigger; if (au === "stoppage_time" && !team.auraState.used && team.score <= team.opp.score) { team.auraState.used = true; ev("aura", { team: team.side, name: team.aura.name, trigger: au }); const pt = XY(team, L - 24, CY + (R() < 0.5 ? -1 : 1) * 18); setRestart("freekick", team, pt.x, pt.y); }
      }
      tick();
      if (S.tick >= MAXT - 2000) break;
      if (S.clock >= end && (B.mode === "dead" || S.clock >= end + 25 || abs(U(T.A, B.x) - L / 2) < 25)) break;
    }
  }
  playHalf(1);
  S.htTick = S.tick; ev("ht", { score: { A: T.A.score, B: T.B.score } });
  playHalf(2);
  S.ftTick = S.tick; ev("ft", { score: { A: T.A.score, B: T.B.score } });

  /* ---------- penalty shootout ---------- */
  let pens = null;
  function shootResult(res) { if (S.kick && !S.kick.done) { S.kick.done = true; S.kick.res = res; } }
  if (T.A.score === T.B.score) {
    S.shootout = true; pens = { A: 0, B: 0, log: [] };
    S.half = 1;   // both teams shoot at the right-hand goal: A's frame faces it in half 1
    const order = team => { const op = team.onPitch.filter(p => p.G !== "GK"); const cap = op.find(p => p.name === team.captain); const rest = op.filter(p => p !== cap).sort((a, b) => (b.a.fin + b.a.com) - (a.a.fin + a.a.com) || a.id - b.id); return cap ? [cap, ...rest] : rest; };
    const tk = { A: order(T.A), B: order(T.B) };
    const gather = () => { let i = 0; for (const p of [...T.A.onPitch, ...T.B.onPitch]) { if (p.G === "GK") continue; const a = i++ * 0.55; p.x = L / 2 + 4 * ((i % 2) ? 1 : -1) * (0.3 + (i % 5) * 0.15); p.y = CY - 5 + (i % 10); p.tx = p.x; p.ty = p.y; p.vx = p.vy = 0; void a; } };
    gather();
    let a = 0, b = 0;
    for (let i = 0; i < 30; i++) {
      const team = i % 2 === 0 ? T.A : T.B, n = floor(i / 2), list = tk[team.side]; if (!list.length) break;
      const taker = list[n % list.length], gk = gkOf(team.opp), ownGk = gkOf(team);
      // walk up
      taker.x = L - 16; taker.y = CY - 1; taker.tx = L - 11.8; taker.ty = CY; taker.urg = 1;
      if (gk) { gk.x = L - 0.4; gk.y = CY; gk.tx = gk.x; gk.ty = gk.y; gk.dive = null; }
      if (ownGk) { ownGk.x = L / 2 + 6; ownGk.y = CY + 8; ownGk.tx = ownGk.x; ownGk.ty = ownGk.y; }
      B.mode = "dead"; B.owner = null; B.x = L - 11; B.y = CY; B.z = 0; S.restart = null;
      const save = team.side === "A" ? 1 : -1; void save;
      // shoot as if team attacks the right-hand goal
      const wasHalf = S.half; S.half = team.side === "A" ? 1 : 2;
      for (let k = 0; k < 30; k++) { movePlayers(); record(); S.tick++; }
      S.kick = { done: false, res: null };
      giveBall(taker); taker.x = L - 11.6; taker.y = CY; B.x = L - 11; B.y = CY;
      penaltyKick(taker, team, true);
      for (let k = 0; k < 40 && !S.kick.done; k++) { movePlayers(); ballStep(); record(); S.tick++; }
      if (!S.kick.done) S.kick.res = "saved";
      const scored = S.kick.res === "goal"; if (scored) team.side === "A" ? a++ : b++;
      S.half = wasHalf;
      pens.log.push({ team: team.side, p: taker.id, scored });
      ev("shootout", { team: team.side, p: taker.id, scored, score: { A: a, B: b } });
      for (let k = 0; k < 14; k++) { movePlayers(); record(); S.tick++; }
      taker.x = L / 2 + rr(-4, 4); taker.y = CY + rr(-5, 5); taker.tx = taker.x; taker.ty = taker.y;
      const ka = floor((i + 2) / 2), kb = floor((i + 1) / 2);
      if (i < 10) { const remA = 5 - ka, remB = 5 - kb; if (a > b + remB || b > a + remA) break; }
      else if (i % 2 === 1 && a !== b) break;
    }
    pens.A = a; pens.B = b;
  }
  S.endTick = S.tick;

  /* ---------- results ---------- */
  const winner = T.A.score > T.B.score ? "A" : T.B.score > T.A.score ? "B" : pens ? (pens.A > pens.B ? "A" : "B") : null;
  const totPoss = T.A.stats.possTicks + T.B.stats.possTicks || 1;
  const stats = {};
  for (const team of teams) { const s = team.stats; stats[team.side] = { shots: s.shots, onT: s.onT, xg: round(s.xg * 100) / 100, passes: s.passes, passPct: s.passes ? round(100 * s.passOk / s.passes) : 0, poss: round(100 * s.possTicks / totPoss), corners: s.corners, fouls: s.fouls, yellows: s.yellows, reds: s.reds, offsides: s.offsides, saves: s.saves, tackles: s.tackles, bigChances: s.bigChances }; }
  const N = S.tick;
  const people = ents.map(p => ({ id: p.id, team: p.team.side, name: p.name, g: p.slot ? p.slot.g : p.g, slotK: p.slot ? p.slot.k : null, gk: p.G === "GK", bench: !p.slot || !p.team.players.includes(p), rating: round(p.rating * 10) / 10, st: p.st, golden: p.golden, meme: p.meme, played: p.state !== "bench" && p.state !== "injured" }));
  const motm = [...people].filter(p => p.played).sort((a, b) => b.rating - a.rating || a.id - b.id)[0];
  return {
    version: ENGINE_VERSION, dt: DT, ticks: N, ents: people, E,
    rec: { X: REC.X.slice(0, N * E), Y: REC.Y.slice(0, N * E), F: REC.F.slice(0, N * E), BX: REC.BX.slice(0, N), BY: REC.BY.slice(0, N), BZ: REC.BZ.slice(0, N), OW: REC.OW.slice(0, N), PO: REC.PO.slice(0, N), CL: REC.CL.slice(0, N), MD: REC.MD.slice(0, N) },
    mom: MOM, ratings: RAT, stamina: STA, events: S.events, rolls, final: { A: T.A.score, B: T.B.score }, pens, winner, stats,
    htTick: S.htTick, ftTick: S.ftTick, add1: S.add1, add2: S.add2, motm: motm ? motm.id : null,
    tactics: { A: T.A.tacBase, B: T.B.tacBase }, dbg: DBG
  };
}

/* A small digest so two devices can confirm they computed the same match. */
export function digest(res) {
  let h = 2166136261 >>> 0;
  const mix = v => { h ^= v & 0xffff; h = Math.imul(h, 16777619) >>> 0; };
  const step = max(1, floor(res.ticks / 2000));
  for (let k = 0; k < res.ticks; k += step) { mix(res.rec.BX[k]); mix(res.rec.BY[k]); for (let i = 0; i < res.E; i += 3) mix(res.rec.X[k * res.E + i]); }
  mix(res.final.A); mix(res.final.B); mix(res.events.length);
  return h.toString(16);
}
