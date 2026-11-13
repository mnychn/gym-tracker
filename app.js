/* Gym Log — a no-build PWA. All data lives in localStorage on each device. */
(() => {
'use strict';

// ---------------------------------------------------------------- utilities
const KEY = 'gymlog.v1';
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const clone = (o) => JSON.parse(JSON.stringify(o));
const toNum = (v) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : null; };
const pad = (n) => String(n).padStart(2, '0');
const localISO = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
const dayStart = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

const ICON = {
  check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z"/></svg>',
  more: '<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/></svg>',
  up: '<svg viewBox="0 0 24 24"><path d="M6 14l6-6 6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24"><path d="M6 10l6 6 6-6"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 12.5h9l1-12.5"/></svg>',
  chev: '<svg viewBox="0 0 24 24"><path d="M9 5.5l6.5 6.5L9 18.5"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.6v.01"/></svg>',
};

function fmtClock(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}
function fmtSecs(v) {
  const s = toNum(v);
  if (s == null) return esc(v);
  return s >= 60 ? `${Math.floor(s / 60)}:${pad(Math.round(s % 60))}` : `${s}s`;
}
function fmtDur(ms) {
  if (!ms) return '';
  const m = Math.round(ms / 60000);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m} min`;
}
function fmtDate(iso, long = false) {
  const d = new Date(iso);
  const opts = { weekday: 'short', month: 'short', day: 'numeric' };
  if (long || d.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric';
  return d.toLocaleDateString(undefined, opts);
}
function shortDate(t) { return new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }
function relDays(iso) {
  const n = Math.round((dayStart(new Date()) - dayStart(new Date(iso))) / 864e5);
  return n <= 0 ? 'today' : n === 1 ? 'yesterday' : `${n} days ago`;
}
const unit = () => db.settings.unit;
function fmtW(w) {
  if (w === '' || w == null) return '—';
  return toNum(w) != null && /^[\d.,\s]+$/.test(String(w)) ? `${w} ${unit()}` : esc(w);
}
const wMode = (v) => (v === '' || v == null || toNum(v) != null) && !/[a-z]/i.test(String(v ?? '')) ? 'decimal' : 'text';

/** "16 kg × 15 · 4 sets" or "16×15, 18×12" when sets differ. */
function summarize(sets, timed) {
  if (!sets.length) return '—';
  const rep = (r) => (timed ? fmtSecs(r) : esc(r));
  const same = sets.every((s) => s.w === sets[0].w && s.r === sets[0].r);
  if (same) {
    const w = sets[0].w === 'BW' || sets[0].w === '' ? '' : `${fmtW(sets[0].w)} × `;
    return `${w}${rep(sets[0].r)} · ${sets.length} set${sets.length > 1 ? 's' : ''}`;
  }
  return sets.map((s) => `${s.w === 'BW' ? 'BW' : esc(s.w)}×${rep(s.r)}`).join(', ');
}

// ---------------------------------------------------------------- storage
// Weekly targets + body goal. Calories/protein are reminders only (not tracked).
const GOAL_DEFAULTS = { sessions: 4, pt: 2, jogMin: 180, muscleKg: 2.5, kcal: 2150, protein: 100 };
function defaults() {
  const seed = window.SEED || { routine: [], sessions: [] };
  return {
    version: 1,
    plan: seed.plan || 1,
    settings: { unit: 'kg', defaultRest: 60, sound: true, vibrate: true, keepAwake: true, theme: 'auto' },
    goals: { ...GOAL_DEFAULTS },
    routine: clone(seed.routine),
    sessions: clone(seed.sessions),
    scans: [],
    active: null,
    rest: null,
  };
}
/** One-time switch to a newer training plan from seed.js; the old routine is kept so it can be restored. */
function migrate(d) {
  const seed = window.SEED || {};
  if (seed.plan && (d.plan || 1) < seed.plan) {
    if (d.routine && d.routine.length) d.prevRoutine = d.routine;
    d.routine = clone(seed.routine); d.plan = seed.plan; d.planNotice = true;
  }
  if (!Array.isArray(d.scans)) d.scans = [];
  d.goals = { ...GOAL_DEFAULTS, ...(d.goals || {}) };
  return d;
}
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw), base = defaults();
      return migrate({ ...base, ...d, plan: d.plan || 1, settings: { ...base.settings, ...(d.settings || {}) } });
    }
  } catch (e) { /* fall through to defaults */ }
  return defaults();
}
let saveWarned = false;
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(db)); }
  catch (e) { if (!saveWarned) { toast('Could not save — browser storage is unavailable'); saveWarned = true; } }
}

let db = load();
save();
const ui = { tab: 'train', openDays: new Set(), progressEx: null, metric: null, editing: null, modalActs: {}, chart: null, progressMode: 'ex', bodyMetric: 'smm' };
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

// ---------------------------------------------------------------- feedback
let actx = null;
function unlockAudio() {
  try {
    if (!actx) { const C = window.AudioContext || window.webkitAudioContext; if (C) actx = new C(); }
    if (actx && actx.state === 'suspended') actx.resume();
  } catch (e) { /* ignore */ }
}
document.addEventListener('pointerdown', unlockAudio, { passive: true });
function tone(freq, at, len = 0.16, vol = 0.35) {
  if (!db.settings.sound || !actx) return;
  const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime + at;
  o.type = 'sine'; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  o.connect(g).connect(actx.destination); o.start(t); o.stop(t + len + 0.02);
}
const blip = () => tone(660, 0, 0.09, 0.2);
function alarm() { tone(880, 0); tone(880, 0.22); tone(1320, 0.44, 0.35); buzz([180, 90, 180, 90, 300]); }
function buzz(p) { if (db.settings.vibrate && navigator.vibrate) { try { navigator.vibrate(p); } catch (e) { /* ignore */ } } }

let wakeLock = null;
async function acquireWakeLock() {
  if (!db.settings.keepAwake || !db.active || wakeLock || !('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
  try { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); }
  catch (e) { wakeLock = null; }
}
function releaseWakeLock() { if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; } }

let toastTimer;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2400);
}

// ---------------------------------------------------------------- modal
function openModal(html, acts = {}) {
  ui.modalActs = acts;
  const m = $('#modal');
  m.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">${html}</div>`;
  m.hidden = false;
  const f = m.querySelector('[autofocus]'); if (f) setTimeout(() => f.focus(), 60);
}
function closeModal() { const m = $('#modal'); m.hidden = true; m.innerHTML = ''; ui.modalActs = {}; ui.editing = null; }
$('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });
function confirmBox({ title, body = '', ok = 'OK', danger = false }) {
  return new Promise((resolve) => {
    openModal(`<h3>${esc(title)}</h3><div class="muted">${body}</div>
      <div class="actions"><button class="btn" data-act="m:no">Cancel</button>
      <button class="btn ${danger ? 'danger fill' : 'primary'}" data-act="m:yes">${esc(ok)}</button></div>`,
    { yes: () => { closeModal(); resolve(true); }, no: () => { closeModal(); resolve(false); } });
  });
}

// ---------------------------------------------------------------- domain helpers
const sortedSessions = () => [...db.sessions].sort((a, b) => (a.date < b.date ? 1 : -1));
const norm = (s) => String(s || '').trim().toLowerCase();
function lastEntry(name, excludeId) {
  for (const s of sortedSessions()) {
    if (s.id === excludeId) continue;
    const e = s.entries.find((x) => norm(x.name) === norm(name));
    if (e && e.sets.length) return { session: s, entry: e };
  }
  return null;
}
// ---- weekly goals: what kind of session was it, and how many jogging minutes?
const JOG_RE = /\b(jog|jogging|run|running|treadmill)\b/i;
const CARDIO_RE = /\b(jog|jogging|run|running|treadmill|walk|walking|hiit|cardio)\b/i;
const KINDS = { pt: 'With PT', self: 'On your own', class: 'Class', cardio: 'Cardio' };
const isGym = (k) => k === 'pt' || k === 'self' || k === 'class';
function dayKind(d) {
  if (d.kind) return d.kind;
  return d.exercises.length && d.exercises.every((x) => CARDIO_RE.test(x.name)) ? 'cardio' : 'self';
}
function kindOf(s) {
  if (s.kind) return s.kind;
  const d = db.routine.find((x) => x.id === s.dayId);
  if (d && d.kind) return d.kind;
  return s.entries.length && s.entries.every((e) => CARDIO_RE.test(e.name)) ? 'cardio' : 'self';
}
function jogSecs(s) {
  return s.entries.filter((e) => JOG_RE.test(e.name)).reduce((t, e) => t + e.sets
    .filter((x) => x.done !== false).reduce((a, x) => a + (e.timed ? toNum(x.r) || 0 : 0), 0), 0);
}
const weekStartOf = (d) => dayStart(d) - ((d.getDay() + 6) % 7) * 864e5; // Monday 00:00
function weekStats(ws) {
  const we = ws + 7 * 864e5, r = { gym: 0, pt: 0, jogMin: 0, days: [] };
  db.sessions.forEach((s) => {
    const t = new Date(s.date).getTime(); if (t < ws || t >= we) return;
    const k = kindOf(s);
    if (isGym(k)) { r.gym += 1; r.days.push(k); }
    if (k === 'pt') r.pt += 1;
    r.jogMin += jogSecs(s) / 60;
  });
  r.jogMin = Math.round(r.jogMin);
  return r;
}
/** Up next = the first gym day not done yet this week; once all are done, keep rotating. */
function nextDay() {
  const gym = db.routine.filter((d) => dayKind(d) !== 'cardio');
  const pool = gym.length ? gym : db.routine;
  if (!pool.length) return null;
  const ws = weekStartOf(new Date());
  const doneThisWeek = new Set(db.sessions.filter((s) => new Date(s.date).getTime() >= ws).map((s) => s.dayId));
  const open = pool.find((d) => !doneThisWeek.has(d.id));
  if (open) return open;
  const last = sortedSessions().find((s) => pool.some((d) => d.id === s.dayId));
  if (!last) return pool[0];
  return pool[(pool.findIndex((d) => d.id === last.dayId) + 1) % pool.length];
}
function lastDoneOf(dayId) { return sortedSessions().find((s) => s.dayId === dayId); }
function knownNames() {
  const set = new Map();
  db.routine.forEach((d) => d.exercises.forEach((x) => set.set(norm(x.name), x.name)));
  db.sessions.forEach((s) => s.entries.forEach((e) => { if (!set.has(norm(e.name))) set.set(norm(e.name), e.name); }));
  return [...set.values()];
}
function volumeOf(entries) {
  let v = 0;
  entries.forEach((e) => e.sets.forEach((s) => { if (s.done !== false && !e.timed) { const w = toNum(s.w), r = toNum(s.r); if (w != null && r != null) v += w * r; } }));
  return Math.round(v);
}
function entryFrom(ex) {
  const n = Math.max(1, parseInt(ex.sets, 10) || 1);
  return {
    id: uid(), exId: ex.id, name: ex.name, timed: !!ex.timed, rest: toNum(ex.rest) ?? db.settings.defaultRest, notes: ex.notes || '',
    sets: Array.from({ length: n }, () => ({ w: ex.weight ?? '', r: ex.reps ?? '', done: false })),
  };
}
const elapsed = (a) => { const now = Date.now(); return now - a.startedAt - a.pausedMs - (a.pausedAt ? now - a.pausedAt : 0); };

// ---------------------------------------------------------------- workout actions
function startWorkout(dayId) {
  if (db.active) { go('train'); return; }
  const day = db.routine.find((d) => d.id === dayId);
  db.active = {
    id: uid(), dayId: day ? day.id : null, dayName: day ? day.name : 'Workout', kind: day ? dayKind(day) : 'self',
    startedAt: Date.now(), pausedAt: null, pausedMs: 0, setTimer: null,
    entries: day ? day.exercises.map(entryFrom) : [],
  };
  save(); unlockAudio(); acquireWakeLock(); window.scrollTo(0, 0); go('train');
}
function startRest(sec, label) {
  if (!sec || sec <= 0) return;
  db.rest = { endsAt: Date.now() + sec * 1000, total: sec, label: label || 'Rest', fired: false };
  save(); renderRest();
}
function finishFlow() {
  const a = db.active;
  const done = a.entries.map((e) => ({ ...e, sets: e.sets.filter((s) => s.done) })).filter((e) => e.sets.length);
  const nSets = done.reduce((n, e) => n + e.sets.length, 0);
  const vol = volumeOf(done);
  const canUpdate = !!a.dayId && db.routine.some((d) => d.id === a.dayId);
  openModal(`
    <h3>Finish workout?</h3>
    <div class="muted">${esc(a.dayName)}</div>
    <div class="stats" style="margin-top:14px">
      <div class="stat"><div class="v num">${fmtClock(elapsed(a))}</div><div class="k">Duration</div></div>
      <div class="stat"><div class="v num">${nSets}</div><div class="k">Sets done</div></div>
      <div class="stat"><div class="v num">${vol ? vol.toLocaleString() : '—'}</div><div class="k">Volume ${vol ? unit() : ''}</div></div>
    </div>
    ${nSets ? '' : '<p class="muted small" style="margin-top:14px">No sets are checked off, so nothing will be saved to history.</p>'}
    ${canUpdate && nSets ? `<div class="card flush" style="margin-top:14px"><label class="setting">
      <div class="grow"><div>Update routine targets</div><div class="small muted">Use today's weight, reps and sets as next time's plan</div></div>
      <span class="switch"><input type="checkbox" id="upd-routine" checked><span></span></span></label></div>` : ''}
    <div class="actions"><button class="btn" data-act="m:cancel">Keep going</button>
      <button class="btn primary" data-act="m:finish">${nSets ? 'Save workout' : 'End workout'}</button></div>`,
  {
    cancel: closeModal,
    finish: () => {
      const upd = $('#upd-routine') && $('#upd-routine').checked;
      if (nSets) {
        db.sessions.push({
          id: a.id, dayId: a.dayId, dayName: a.dayName, kind: a.kind || 'self', date: localISO(new Date(a.startedAt)), duration: elapsed(a), ...(a.watch ? { watch: a.watch } : {}),
          entries: done.map((e) => ({ name: e.name, timed: e.timed, sets: e.sets.map((s) => ({ w: s.w, r: s.r, done: true })) })),
        });
        if (upd) updateRoutineFrom(a.dayId, done);
      }
      db.active = null; db.rest = null; save(); releaseWakeLock(); closeModal();
      toast(nSets ? 'Workout saved 💪' : 'Workout ended');
      go(nSets ? 'history' : 'train');
    },
  });
}
function updateRoutineFrom(dayId, entries) {
  const day = db.routine.find((d) => d.id === dayId); if (!day) return;
  entries.forEach((e) => {
    const last = e.sets[e.sets.length - 1];
    let ex = day.exercises.find((x) => x.id === e.exId) || day.exercises.find((x) => norm(x.name) === norm(e.name));
    if (!ex) { ex = { id: uid(), name: e.name, timed: e.timed, rest: e.rest, notes: '' }; day.exercises.push(ex); }
    // Never shrink the planned set count just because a session was cut short.
    ex.weight = last.w; ex.reps = last.r; ex.sets = Math.max(parseInt(ex.sets, 10) || 0, e.sets.length); ex.rest = e.rest;
  });
}
function completeSetTimer(withAlert) {
  const a = db.active, st = a && a.setTimer; if (!st) return;
  const e = a.entries[st.ei], s = e && e.sets[st.si];
  a.setTimer = null;
  if (s) { s.r = String(st.target); s.done = true; }
  save();
  if (withAlert) alarm();
  if (e && e.rest) startRest(e.rest, `${e.name} · set ${st.si + 1}`);
  renderView();
}

// ---------------------------------------------------------------- exercise guides & animations
function guideKey(name) {
  const G = window.GUIDES || {}, A = window.GUIDE_ALIASES || {};
  let k = norm(name);
  if (!G[k] && A[k]) k = A[k];
  if (!G[k]) k = norm(k.replace(/\s*\(.*\)\s*$/, '')); // "Push-up (knee)" -> "push-up"
  if (!G[k] && A[k]) k = A[k];
  if (G[k] && G[k].alias) k = G[k].alias;
  return G[k] ? k : null;
}
function openGuide(name) {
  const key = guideKey(name);
  const g = key ? window.GUIDES[key] : null;
  const list = (arr, tag) => (arr && arr.length ? `<${tag} class="guide-list">${arr.map((x) => `<li>${esc(x)}</li>`).join('')}</${tag}>` : '');
  const hasImg = !!(g && g.img && g.img.length);
  const hasAnim = hasImg || (key && window.ExAnim && window.ExAnim.has(key));
  openModal(`
    <div class="row"><div class="grow"><h3>${esc(name)}</h3>${g && g.zh ? `<div class="small muted">${esc(g.zh)}</div>` : ''}</div>
      <button class="icon-btn" data-act="m:close" aria-label="Close">${ICON.close}</button></div>
    ${g ? `<div class="row" style="flex-wrap:wrap;gap:6px;margin-top:10px">${g.muscles.map((m) => `<span class="pill accent">${esc(m)}</span>`).join('')}</div>` : ''}
    ${hasAnim ? '<div class="anim" id="m-anim" style="margin-top:14px"></div>' : ''}
    ${g ? `
      ${g.assumed ? `<p class="small muted guide-note">${esc(g.assumed)}</p>` : ''}
      <div class="section-title">How to do it</div>${list(g.steps, 'ol')}
      <div class="section-title">Form cues</div>${list(g.cues, 'ul')}
      <div class="section-title">Common mistakes</div>${list(g.mistakes, 'ul')}`
    : '<p class="muted" style="margin-top:14px">No guide for this exercise yet. Add your own cues in the exercise notes (Routine tab).</p>'}`,
  { close: closeModal });
  if (hasImg) mountImages($('#m-anim'), g);
  else if (hasAnim) window.ExAnim.mount($('#m-anim'), key);
}

const imgSrc = (f) => `exercise-img/${encodeURIComponent(f)}`;
const REPDB_CREDIT = 'Exercise data by <a href="https://repdb.co" target="_blank" rel="noopener nofollow">RepDB (repdb.co)</a>';

/** Big start/peak illustrations in the guide sheet, cross-fading like a two-frame flip-book. */
function mountImages(el, g) {
  const frames = g.img;
  el.innerHTML = `<div class="photo-stage">${frames.map((f, i) => `<img src="${imgSrc(f)}" alt="position ${i + 1}" class="${i ? '' : 'on'}" decoding="async">`).join('')}</div>
    <div class="anim-bar"><span class="anim-label"></span>${frames.length > 1 ? '<button type="button" class="anim-toggle"></button>' : ''}</div>
    <div class="photo-credit">${REPDB_CREDIT}</div>`;
  const imgs = [...el.querySelectorAll('img')], lab = el.querySelector('.anim-label'), btn = el.querySelector('.anim-toggle');
  const labels = frames.length > 1 ? ['Start', 'Peak'] : ['Position'];
  let i = 0, timer = 0;
  let playing = frames.length > 1 && !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const show = (n) => { i = n; imgs.forEach((im, k) => im.classList.toggle('on', k === i)); lab.textContent = labels[i]; };
  const loop = () => {
    clearTimeout(timer);
    if (!playing || !el.isConnected) return;
    timer = setTimeout(() => { if (!el.isConnected) return; show((i + 1) % imgs.length); loop(); }, i === 0 ? 1300 : 1700);
  };
  const setBtn = () => { if (btn) btn.textContent = playing ? 'Pause' : 'Play'; };
  if (btn) btn.addEventListener('click', () => { playing = !playing; setBtn(); loop(); });
  // tapping the picture while paused flips to the other position
  el.querySelector('.photo-stage').addEventListener('click', () => { if (!playing && imgs.length > 1) show((i + 1) % imgs.length); });
  show(0); setBtn(); loop();
}

/** Inline exercise picture (tap = open the guide). Loops start <-> peak with CSS only, so many can run at once. */
function thumb(name, size = 'md') {
  const key = guideKey(name);
  const g = key ? window.GUIDES[key] : null;
  const open = `data-act="guide" data-name="${esc(name)}" aria-label="How to do ${esc(name)}"`;
  if (g && g.img && g.img.length) {
    return `<button type="button" class="thumb ${size}" ${open}><img src="${imgSrc(g.img[0])}" alt="" loading="lazy" decoding="async">${g.img[1] ? `<img class="b" src="${imgSrc(g.img[1])}" alt="" loading="lazy" decoding="async">` : ''}</button>`;
  }
  if (key && window.ExAnim && window.ExAnim.has(key)) return `<button type="button" class="thumb ${size} anim" ${open}>${window.ExAnim.still(key)}</button>`;
  return '';
}

// ---------------------------------------------------------------- body scans
const fmt1 = (v) => (v == null || v === '' ? '—' : (+v).toFixed(1));
const avg2 = (a, b) => { const x = toNum(a), y = toNum(b); return x != null && y != null ? (x + y) / 2 : x ?? y; };
const sortedScans = () => [...db.scans].sort((a, b) => (a.date < b.date ? -1 : 1));
// [key, chip label, long label, unit ('w' = weight unit)]
const BODY = [
  ['smm', 'Muscle', 'Skeletal muscle', 'w'], ['weight', 'Weight', 'Weight', 'w'], ['fat', 'Fat %', 'Body fat', '%'],
  ['lbm', 'Lean', 'Lean body mass', 'w'], ['arms', 'Arms', 'Arm lean mass (avg L/R)', 'w'], ['legs', 'Legs', 'Leg lean mass (avg L/R)', 'w'],
];
const SCAN_FIELDS = [
  ['weight', 'Weight', 'w'], ['smm', 'Skeletal muscle', 'w'], ['fat', 'Body fat', '%'], ['lbm', 'Lean body mass', 'w'],
  ['armL', 'Left arm lean', 'w'], ['armR', 'Right arm lean', 'w'], ['legL', 'Left leg lean', 'w'], ['legR', 'Right leg lean', 'w'],
];
function bodyVal(s, k) {
  if (k === 'arms') return avg2(s.armL, s.armR);
  if (k === 'legs') return avg2(s.legL, s.legR);
  return toNum(s[k]);
}
/** Muscle goal = first scan's skeletal muscle + goals.muscleKg. */
function bodyGoal(sc) {
  const withM = sc.filter((s) => toNum(s.smm) != null);
  if (!withM.length) return { target: null, gained: 0 };
  const base = toNum(withM[0].smm), latest = toNum(withM[withM.length - 1].smm);
  return { base, latest, target: base + (toNum(db.goals.muscleKg) || 0), gained: latest - base };
}
function nextScanText(latest) {
  const due = new Date(latest.date).getTime() + 56 * 864e5; // every ~8 weeks
  return due > Date.now() ? `due ${shortDate(due)}` : 'due now';
}

// ---------------------------------------------------------------- read a scan sheet from a photo (on-device OCR)
// Tesseract.js (Apache-2.0) is bundled in vendor/tesseract and only loaded when you upload a scan.
// The image never leaves the device.
let ocrWorker = null;
function loadScript(src) {
  return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('load ' + src)); document.head.appendChild(s); });
}
async function getOcr(onProgress) {
  if (ocrWorker) return ocrWorker;
  const base = new URL('vendor/tesseract/', location.href).href;
  if (!window.Tesseract) await loadScript(base + 'tesseract.min.js');
  ocrWorker = await window.Tesseract.createWorker('eng', 1, {
    workerPath: base + 'worker.min.js', corePath: base, langPath: base, workerBlobURL: false,
    logger: (m) => { if (onProgress && m.status === 'recognizing text') onProgress(m.progress); },
  });
  return ocrWorker;
}
function fileImage(file) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => { res(img); setTimeout(() => URL.revokeObjectURL(url), 1000); };
    img.onerror = () => rej(new Error('Not an image'));
    img.src = url;
  });
}
/** Scale to ~1800px wide and threshold: white text on the coloured sheet becomes dark on light. */
function prepImage(img) {
  const sc = Math.min(3, 1800 / img.naturalWidth);
  const mk = () => {
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * sc); c.height = Math.round(img.naturalHeight * sc);
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, c.width, c.height);
    return [c, g];
  };
  const [plain] = mk(), [inv, g] = mk();
  const d = g.getImageData(0, 0, inv.width, inv.height), p = d.data;
  for (let i = 0; i < p.length; i += 4) { const y = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2]; const v = y > 200 ? 0 : 255; p[i] = p[i + 1] = p[i + 2] = v; }
  g.putImageData(d, 0, 0);
  return { plain, inv };
}
// field → label pattern on the sheet (Evolt 360; similar wording on InBody), plausible range
const SCAN_LABELS = {
  weight: [/\bWEIGHT\b/i, 25, 250], lbm: [/LEAN\s*BODY\s*MASS/i, 15, 120], smm: [/SKELETAL\s*MUSCLE/i, 8, 80],
  fat: [/BODY\s*FAT\s*(PERCENT|%)|PERCENT\s*BODY\s*FAT|PBF/i, 3, 70],
  armL: [/LEFT\s*ARM/i, 0.3, 8], armR: [/RIGHT\s*ARM/i, 0.3, 8], legL: [/LEFT\s*LEG/i, 1.5, 25], legR: [/RIGHT\s*LEG/i, 1.5, 25],
};
/** words: [{t, x, y}] with x/y as fractions of image width. Returns {fields, date}. */
function parseScanWords(words, lines, valueWords = []) {
  const out = {};
  const toNums = (ws) => ws.map((w) => {
    const m = w.t.replace(',', '.').match(/^(\d{1,3}(?:\.\d{1,2})?)%?\/?$/); // ranges like [36.6 or (1.98 don't match
    return m && (m[1].includes('.') || +m[1] >= 100) ? { v: +m[1], x: w.x, y: w.y } : null; // scan values have decimals (or lost their dot)
  }).filter(Boolean);
  const primary = toNums(valueWords);
  const nums = primary.concat(toNums(words).filter((n) => !primary.some((q) => Math.abs(q.x - n.x) < 0.02 && Math.abs(q.y - n.y) < 0.01)));
  const fit = (v, lo, hi) => { for (const f of [1, 0.1, 0.01]) { if (v * f >= lo && v * f <= hi) return +(v * f).toFixed(2); } return null; };
  Object.entries(SCAN_LABELS).forEach(([k, [re, lo, hi]]) => {
    for (const ln of lines) {
      const m = ln.text.match(re); if (!m) continue;
      // which word does the match start in?
      let pos = 0, lw = ln.words[0];
      for (const w of ln.words) { if (pos + w.t.length >= m.index) { lw = w; break; } pos += w.t.length + 1; }
      const below = nums.filter((n) => n.y > lw.y + 0.004 && n.y < lw.y + 0.06);
      let cand;
      if (/^(armL|legL)$/.test(k)) cand = below.filter((n) => n.x < lw.x).sort((a, b) => a.y - b.y || a.x - b.x);
      else cand = below.filter((n) => n.x > lw.x - 0.09 && n.x < lw.x + 0.12).sort((a, b) => a.y - b.y || a.x - b.x);
      if (cand.length) {
        const rowY = cand[0].y, row = cand.filter((n) => Math.abs(n.y - rowY) < 0.012);
        const pick = /^(armL|legL)$/.test(k) ? row.sort((a, b) => a.x - b.x)[0] : row.sort((a, b) => Math.abs(a.x - lw.x) - Math.abs(b.x - lw.x))[0];
        const v = fit(pick.v, lo, hi);
        if (v != null) { out[k] = v; break; }
      }
    }
  });
  // date like 09-11-2026 or 11/9/2026 — day first unless the phone is set to US format
  let date = null;
  const dm = lines.map((l) => l.text).join(' ').match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2})\b/);
  if (dm) {
    let [a, b] = [+dm[1], +dm[2]];
    const us = /^en-US/i.test(navigator.language || '');
    let day = us ? b : a, mon = us ? a : b;
    if (mon > 12 && day <= 12) [day, mon] = [mon, day];
    if (mon >= 1 && mon <= 12 && day >= 1 && day <= 31) date = `${dm[3]}-${pad(mon)}-${pad(day)}`;
  }
  return { fields: out, date };
}
async function readScanFile(file, onProgress) {
  const img = await fileImage(file);
  const { plain, inv } = prepImage(img);
  let half = 0;
  const w = await getOcr((p) => onProgress && onProgress(half + p / 2));
  const run = async (canvas) => {
    const r = await w.recognize(canvas, {}, { blocks: true });
    const W = canvas.width, words = [], lines = [];
    (r.data.blocks || []).forEach((b) => b.paragraphs.forEach((p) => p.lines.forEach((l) => {
      const lw = l.words.map((x) => ({ t: x.text, x: x.bbox.x0 / W, y: x.bbox.y0 / W }));
      words.push(...lw); lines.push({ text: lw.map((x) => x.t).join(' '), words: lw });
    })));
    return { words, lines };
  };
  const a = await run(inv); // labels (white on colour) + most values
  half = 0.5;
  const b = await run(plain); // values in white boxes, read more accurately
  const res = parseScanWords(a.words, a.lines.concat(b.lines), b.words);
  return res;
}
async function onScanUpload(file) {
  const st = $('#sc-status');
  const say = (h) => { if (st) { st.hidden = false; st.innerHTML = h; } };
  say('Reading your scan… <span class="num" id="sc-pct">0%</span> <span class="faint">(first time downloads the reader, ~10 MB)</span>');
  try {
    const res = await readScanFile(file, (p) => { const e = $('#sc-pct'); if (e) e.textContent = `${Math.round(p * 100)}%`; });
    if (!$('#sc-date')) return; // modal closed meanwhile
    const got = Object.keys(res.fields);
    document.querySelectorAll('.scan-grid .field.filled, #sc-date.filled').forEach((e) => e.classList.remove('filled'));
    got.forEach((k) => { const e = $(`#sc-${k}`); if (e) { e.value = res.fields[k]; e.classList.add('filled'); } });
    if (res.date) { $('#sc-date').value = res.date; $('#sc-date').classList.add('filled'); }
    const missing = SCAN_FIELDS.filter(([k]) => !got.includes(k)).map(([, l]) => l);
    say(got.length
      ? `<b>Read ${got.length} value${got.length === 1 ? '' : 's'}</b> (highlighted). Check them — and the date — against your sheet before saving.${missing.length ? `<br><span class="faint">Not found: ${missing.join(', ')}.</span>` : ''}`
      : 'Couldn’t find scan values in that image. Try a sharper screenshot of the result sheet, or type the numbers in.');
  } catch (e) {
    say('Couldn’t read that file. Use a photo or screenshot (JPG/PNG/HEIC), or type the numbers in.');
  }
}

function scanModal(scan) {
  const isNew = !scan;
  const now = new Date(); now.setHours(8, 0, 0, 0);
  const s = scan ? clone(scan) : { id: uid(), date: localISO(now) };
  const d = new Date(s.date);
  const u = (x) => (x === 'w' ? unit() : x);
  openModal(`
    <div class="row"><h3 class="grow">${isNew ? 'Add body scan' : 'Edit body scan'}</h3><button class="icon-btn" data-act="m:close" aria-label="Close">${ICON.close}</button></div>
    <label class="btn soft big upload" style="margin-top:6px">📷 Upload scan photo or screenshot
      <input type="file" accept="image/*" id="sc-file" style="position:absolute;inset:0;opacity:0"></label>
    <p class="small muted" id="sc-status" style="margin-top:8px">Reads the numbers on your phone — the image isn’t uploaded anywhere. Or type them in below.</p>
    <div style="margin-top:10px"><label class="lbl">Date</label><input type="date" class="field" id="sc-date" value="${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}"></div>
    <div class="scan-grid">${SCAN_FIELDS.map(([k, l, un]) => `<div><label class="lbl">${l} <span class="faint">${u(un)}</span></label>
      <input class="field" id="sc-${k}" value="${esc(s[k] ?? '')}" inputmode="decimal"></div>`).join('')}</div>
    <div style="margin-top:10px"><label class="lbl">Notes</label><input class="field" id="sc-notes" value="${esc(s.notes || '')}" placeholder="e.g. Evolt 360, morning, before eating"></div>
    <div class="actions">${isNew ? '<button class="btn" data-act="m:close">Cancel</button>' : '<button class="btn danger" data-act="m:del">Delete</button>'}
      <button class="btn primary" data-act="m:save">Save</button></div>`,
  {
    close: closeModal,
    del: async () => {
      if (await confirmBox({ title: 'Delete this scan?', ok: 'Delete', danger: true })) { db.scans = db.scans.filter((x) => x.id !== s.id); save(); renderView(); }
    },
    save: () => {
      const dv = $('#sc-date').value;
      if (dv) { const [y, m, dd] = dv.split('-').map(Number); s.date = localISO(new Date(y, m - 1, dd, 8)); }
      SCAN_FIELDS.forEach(([k]) => { const v = toNum($(`#sc-${k}`).value); if (v == null) delete s[k]; else s[k] = v; });
      s.notes = $('#sc-notes').value.trim();
      if (s.weight == null && s.smm == null) { toast('Enter at least weight or skeletal muscle'); return; }
      const i = db.scans.findIndex((x) => x.id === s.id);
      if (i >= 0) db.scans[i] = s; else db.scans.push(s);
      save(); closeModal(); toast('Scan saved'); ui.tab = 'progress'; ui.progressMode = 'body'; render();
    },
  });
}

// ---------------------------------------------------------------- quick log: jog / class
function quickLogModal(kind) {
  const isJog = kind === 'jog';
  const today = new Date();
  const dv = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  openModal(`
    <div class="row"><h3 class="grow">${isJog ? 'Log a jog' : 'Log a class'}</h3><button class="icon-btn" data-act="m:close" aria-label="Close">${ICON.close}</button></div>
    <div class="seg full" style="margin-top:10px"><button class="${isJog ? 'on' : ''}" data-act="m:jog">Jog</button><button class="${isJog ? '' : 'on'}" data-act="m:cls">Class</button></div>
    ${isJog ? '' : `<div style="margin-top:12px"><label class="lbl">Class</label><input class="field" id="ql-name" placeholder="e.g. Pilates, Body Pump, Spin" autofocus></div>`}
    <div class="row" style="margin-top:12px">
      <div class="grow"><label class="lbl">Date</label><input type="date" class="field" id="ql-date" value="${dv}" max="${dv}"></div>
      <div style="width:96px"><label class="lbl">Minutes</label><input class="field" id="ql-min" inputmode="numeric" value="45" ${isJog ? 'autofocus' : ''}></div>
      ${isJog ? '<div style="width:96px"><label class="lbl">km <span class="faint">optional</span></label><input class="field" id="ql-km" inputmode="decimal"></div>' : ''}
    </div>
    <p class="small muted" style="margin-top:10px">${isJog ? `Counts toward your ${db.goals.jogMin} min jogging target. Tip: you can also start the <b>Jog</b> day to use a timer.` : 'Counts as one of your weekly gym sessions.'}</p>
    <div class="actions"><button class="btn" data-act="m:close">Cancel</button><button class="btn primary" data-act="m:save">Save</button></div>`,
  {
    close: closeModal,
    jog: () => quickLogModal('jog'),
    cls: () => quickLogModal('class'),
    save: () => {
      const min = toNum($('#ql-min').value);
      if (!min || min <= 0) { toast('Enter the minutes'); $('#ql-min').focus(); return; }
      const [y, m, d] = ($('#ql-date').value || dv).split('-').map(Number);
      const isToday = y === today.getFullYear() && m === today.getMonth() + 1 && d === today.getDate();
      const when = isToday ? new Date(Date.now() - min * 60000) : new Date(y, m - 1, d, 12);
      const name = isJog ? 'Jog' : (($('#ql-name') && $('#ql-name').value.trim()) || 'Class');
      const km = isJog ? toNum($('#ql-km').value) : null;
      const s = {
        id: uid(), dayId: null, dayName: name, kind: isJog ? 'cardio' : 'class', date: localISO(when), duration: Math.round(min * 60000),
        entries: [{ name, timed: true, sets: [{ w: 'BW', r: String(Math.round(min * 60)), done: true }] }],
      };
      if (km) s.distance = km;
      db.sessions.push(s); save(); closeModal(); toast(isJog ? `Jog logged · ${Math.round(min)} min` : `${name} logged`); renderView();
    },
  });
}
// ---------------------------------------------------------------- Apple Watch (via an Apple Shortcuts automation + clipboard)
// A Shortcut runs when a watch workout ends and copies text like:
//   GYMLOG / type: Running / start: 2026-11-13T07:05:00+08:00 / end: … / duration: 50 min / distance: 6.2 km / energy: 410 kcal / heart rate: 148
// Web apps can't read Apple Health directly, so the user taps "Paste from Watch" and confirms.
function parseWhen(v) {
  if (!v) return null;
  let t = Date.parse(v);
  if (Number.isNaN(t)) t = Date.parse(v.replace(/\s+at\s+/i, ' ').replace(/(\d)(am|pm)\b/i, '$1 $2'));
  return Number.isNaN(t) ? null : t;
}
function parseDur(v) {
  if (!v) return null;
  const s = String(v).toLowerCase().replace(',', '.');
  if (/^\s*\d+:\d{2}(:\d{2})?\s*$/.test(s)) { const p = s.trim().split(':').map(Number); return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1]; }
  let secs = 0, hit = false;
  s.replace(/(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours|m|min|mins|minute|minutes|s|sec|secs|second|seconds)\b/g, (_, n, u) => {
    hit = true; secs += +n * (u[0] === 'h' ? 3600 : u[0] === 'm' ? 60 : 1); return '';
  });
  if (hit) return Math.round(secs);
  const n = toNum(s);
  return n == null ? null : Math.round(n > 600 ? n : n * 60); // bare number: seconds if large, else minutes
}
function parseDist(v) {
  if (!v) return null;
  const s = String(v).toLowerCase().replace(',', '.'), n = toNum(s);
  if (n == null || n <= 0) return null;
  if (/\bmi\b|mile/.test(s)) return +(n * 1.609).toFixed(2);
  if (/\bkm\b|kilomet/.test(s)) return +n.toFixed(2);
  if (/\bm\b|met(er|re)/.test(s) || n > 100) return +(n / 1000).toFixed(2);
  return +n.toFixed(2);
}
function parseWatch(text) {
  if (!text || !/gymlog/i.test(text)) return null;
  const get = (...keys) => {
    for (const k of keys) { const m = text.match(new RegExp(`^[\\s•-]*${k}\\s*[:=]\\s*(.+)$`, 'im')); if (m && m[1].trim()) return m[1].trim(); }
    return '';
  };
  const start = parseWhen(get('start', 'start date')), end = parseWhen(get('end', 'end date'));
  let secs = parseDur(get('duration', 'time'));
  if (!secs && start && end && end > start) secs = Math.round((end - start) / 1000);
  const kcal = toNum(get('energy', 'active energy', 'calories', 'kcal'));
  const hr = toNum(get('heart rate', 'avg heart rate', 'hr'));
  return {
    type: get('type', 'workout', 'activity') || 'Workout',
    start: start || (end && secs ? end - secs * 1000 : Date.now() - (secs || 0) * 1000),
    secs: secs || 0, km: parseDist(get('distance')),
    kcal: kcal ? Math.round(kcal) : null, hr: hr ? Math.round(hr) : null,
  };
}
function watchKind(type) {
  const t = type.toLowerCase();
  if (/run|jog/.test(t)) return 'jog';
  if (/strength|core|weight/.test(t)) return 'gym';
  if (/walk|hik/.test(t)) return 'walk';
  return 'class';
}
const watchPill = (w) => (w ? [w.kcal ? `${w.kcal} kcal` : '', w.hr ? `${w.hr} bpm` : ''].filter(Boolean).join(' · ') : '');

async function pasteFromWatch() {
  let text = '';
  try { if (navigator.clipboard && navigator.clipboard.readText) text = await navigator.clipboard.readText(); } catch (e) { /* denied → manual paste */ }
  const w = parseWatch(text);
  if (w) watchConfirm(w);
  else watchPasteBox(text ? 'Your clipboard doesn’t hold a workout from the Shortcut.' : '');
}
function watchPasteBox(msg) {
  openModal(`<div class="row"><h3 class="grow">Paste from Watch</h3><button class="icon-btn" data-act="m:close" aria-label="Close">${ICON.close}</button></div>
    ${msg ? `<p class="small muted">${msg}</p>` : ''}
    <p class="small muted">Run the <b>Gym Log workout</b> Shortcut (it runs by itself when an Apple Watch workout ends), then paste here.</p>
    <textarea class="field" id="w-text" rows="6" style="height:auto;padding:10px" placeholder="GYMLOG&#10;type: Running&#10;duration: 50 min&#10;distance: 6.2 km"></textarea>
    <div class="actions"><button class="btn" data-act="m:help">Set up</button><button class="btn primary" data-act="m:go">Continue</button></div>`,
  {
    close: closeModal, help: watchSetup,
    go: () => { const w = parseWatch($('#w-text').value); if (w) watchConfirm(w); else toast('Couldn’t read that — it should start with GYMLOG'); },
  });
}
/** Review screen: choose how the watch workout counts, then save (or attach to a gym session). */
function watchConfirm(w, as) {
  const dup = db.sessions.find((s) => s.watch && Math.abs(s.watch.start - w.start) < 60000);
  const k = as || watchKind(w.type);
  const day = dayStart(new Date(w.start));
  const gymToday = db.sessions.filter((s) => isGym(kindOf(s)) && kindOf(s) !== 'class' && dayStart(new Date(s.date)) === day && !s.watch)
    .sort((a, b) => Math.abs(new Date(a.date) - w.start) - Math.abs(new Date(b.date) - w.start));
  const target = k === 'gym' ? (db.active ? 'active' : gymToday[0] ? gymToday[0].id : 'new') : null;
  const min = Math.round(w.secs / 60);
  const opt = (v, l) => `<button class="${k === v ? 'on' : ''}" data-act="m:as" data-k="${v}">${l}</button>`;
  openModal(`<div class="row"><h3 class="grow">Apple Watch workout</h3><button class="icon-btn" data-act="m:close" aria-label="Close">${ICON.close}</button></div>
    <div class="small muted">${esc(w.type)} · ${fmtDate(localISO(new Date(w.start)))} ${new Date(w.start).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</div>
    <div class="stats" style="margin-top:12px">
      <div class="stat"><div class="v num">${min || '—'}</div><div class="k">Minutes</div></div>
      <div class="stat"><div class="v num">${w.km ?? '—'}</div><div class="k">km</div></div>
      <div class="stat"><div class="v num">${w.kcal ?? '—'}</div><div class="k">kcal${w.hr ? ` · ${w.hr} bpm` : ''}</div></div>
    </div>
    ${dup ? '<p class="small" style="color:var(--warn);margin-top:12px">This workout looks already imported.</p>' : ''}
    <label class="lbl" style="margin-top:14px">Count it as</label>
    <div class="seg full">${opt('jog', 'Jog')}${opt('class', 'Class')}${opt('gym', 'Gym')}${opt('walk', 'Other')}</div>
    <p class="small muted" style="margin-top:8px">${k === 'jog' ? `Adds ${min} min to your jogging target.`
      : k === 'class' ? 'Counts as one of your weekly gym sessions.'
      : k === 'walk' ? 'Saved to History; doesn’t count toward your targets.'
      : target === 'active' ? 'Adds time, calories and heart rate to the workout you’re logging now.'
      : target !== 'new' ? `Adds time, calories and heart rate to <b>${esc(gymToday[0].dayName)}</b> from the same day.`
      : 'No Gym Log session that day, so it’s saved as a new gym session (no sets).'}</p>
    ${k === 'class' ? `<div style="margin-top:10px"><label class="lbl">Class name</label><input class="field" id="w-name" value="${esc(/other|mixed|cross/i.test(w.type) ? 'Class' : w.type)}"></div>` : ''}
    <div class="row" style="margin-top:10px">
      <div class="grow"><label class="lbl">Minutes</label><input class="field" id="w-min" inputmode="numeric" value="${min || ''}"></div>
      ${k === 'jog' || k === 'walk' ? `<div class="grow"><label class="lbl">km</label><input class="field" id="w-km" inputmode="decimal" value="${w.km ?? ''}"></div>` : ''}
    </div>
    <div class="actions"><button class="btn" data-act="m:close">Cancel</button><button class="btn primary" data-act="m:save">Save</button></div>`,
  {
    close: closeModal,
    as: (el) => watchConfirm(w, el.dataset.k),
    save: () => {
      const m = toNum($('#w-min').value) || min;
      if (!m) { toast('Enter the minutes'); return; }
      const secs = Math.round(m * 60);
      const km = $('#w-km') ? toNum($('#w-km').value) : w.km;
      const watch = { type: w.type, start: w.start, secs, km: km || null, kcal: w.kcal, hr: w.hr };
      if (k === 'gym' && target === 'active') { db.active.watch = watch; }
      else if (k === 'gym' && target !== 'new') {
        const s = db.sessions.find((x) => x.id === target); s.watch = watch; if (!s.duration) s.duration = secs * 1000;
      } else {
        const name = k === 'jog' ? 'Jog' : k === 'class' ? (($('#w-name') && $('#w-name').value.trim()) || 'Class') : k === 'walk' ? w.type : `${w.type} (Apple Watch)`;
        const s = {
          id: uid(), dayId: null, dayName: name, kind: k === 'jog' || k === 'walk' ? 'cardio' : k === 'class' ? 'class' : 'self',
          date: localISO(new Date(w.start)), duration: secs * 1000, watch,
          entries: k === 'gym' ? [] : [{ name, timed: true, sets: [{ w: 'BW', r: String(secs), done: true }] }],
        };
        if (km && (k === 'jog' || k === 'walk')) s.distance = km;
        db.sessions.push(s);
      }
      save(); closeModal(); toast('Apple Watch workout saved ⌚'); renderView();
    },
  });
}
function watchSetup() {
  const step = (n, t) => `<li>${t}</li>`;
  openModal(`<div class="row"><h3 class="grow">Connect Apple Watch</h3><button class="icon-btn" data-act="m:close" aria-label="Close">${ICON.close}</button></div>
    <p class="small muted">Web apps can’t read Apple Health directly, so a free Shortcut copies each finished watch workout and you paste it here with one tap. Do this once on your iPhone.</p>
    <div class="section-title">1 · Build the Shortcut</div>
    <ol class="guide-list">
      ${step(1, 'Open <b>Shortcuts</b> → <b>+</b>. Name it <b>Gym Log workout</b>.')}
      ${step(2, 'Add <b>Find Health Samples</b>. Set: Type is <b>Workouts</b> · Sort by <b>Start Date</b> · Order <b>Latest First</b> · Limit <b>1</b>.')}
      ${step(3, 'Add <b>Text</b> and type the lines below. For each <i>[ ]</i>, tap <b>Health Samples</b> from the variable bar, tap it again, and pick that detail. For Start/End Date, also set Date Format to <b>ISO 8601</b> with time.')}
    </ol>
    <pre class="code">GYMLOG
type: [Type]
start: [Start Date]
end: [End Date]
duration: [Duration]</pre>
    <ol class="guide-list" start="4">
      ${step(4, 'Add <b>Copy to Clipboard</b>, then <b>Show Notification</b> “Workout ready — open Gym Log and tap Paste from Watch”.')}
      ${step(5, 'Tap ▶︎ once to test and tap <b>Allow</b> for Health access.')}
    </ol>
    <div class="section-title">2 · Run it automatically</div>
    <ol class="guide-list">
      ${step(1, 'Shortcuts → <b>Automation</b> → <b>+</b> → <b>Apple Watch Workout</b>.')}
      ${step(2, 'Workout Type: <b>Any</b> · When Workout: <b>Ends</b> → <b>Run Immediately</b>.')}
      ${step(3, 'Next → choose <b>Gym Log workout</b>.')}
    </ol>
    <div class="section-title">3 · After each workout</div>
    <p class="small muted">Open Gym Log → <b>Paste from Watch</b> (Train tab) → tap <b>Paste</b> → check it → <b>Save</b>. Runs add to your jogging target, classes count as gym sessions, and strength workouts attach calories and heart rate to that day’s Gym Log session.</p>
    <p class="small muted"><b>Optional extras:</b> add more lines such as <i>distance: …</i>, <i>energy: …</i> or <i>heart rate: …</i> if you can pick them in your iOS version. If “Workouts” isn’t in the Type list, use <i>type: Running</i> and <i>duration: [Ask for Input]</i> instead.</p>
    <div class="actions"><button class="btn primary" data-act="m:close">Done</button></div>`,
  { close: closeModal });
}

const pace = (s) => {
  const secs = jogSecs(s) || (s.duration || 0) / 1000;
  if (!s.distance || !secs) return '';
  const p = Math.round(secs / s.distance);
  return `${Math.floor(p / 60)}:${pad(p % 60)}/km`;
};

// ---------------------------------------------------------------- views
const views = {};

views.train = () => (db.active ? activeView() : idleView());

const meter = (v, max) => `<div class="meter" role="presentation"><span style="width:${Math.max(0, Math.min(100, max ? (v / max) * 100 : 0))}%"></span></div>`;
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

/** This week's targets: gym sessions (PT + own/class) and jogging minutes, plus the last 6 weeks. */
function weekCard() {
  const g = db.goals, now = new Date(), ws = weekStartOf(now), w = weekStats(ws);
  const daysLeft = 6 - ((now.getDay() + 6) % 7);
  const gymLeft = Math.max(0, g.sessions - w.gym), jogLeft = Math.max(0, g.jogMin - w.jogMin);
  let hint;
  if (!gymLeft && !jogLeft) hint = '<b style="color:var(--accent)">Both weekly targets hit.</b> Nice work.';
  else {
    const todo = [];
    if (gymLeft) todo.push(plural(gymLeft, 'gym session'));
    if (jogLeft) todo.push(`${jogLeft} min jogging${jogLeft > 60 ? ` (≈ ${Math.ceil(jogLeft / 60)} × ${Math.round(jogLeft / Math.ceil(jogLeft / 60) / 5) * 5} min)` : ''}`);
    hint = `To go: ${todo.join(' · ')} — ${daysLeft ? `${plural(daysLeft, 'day')} left after today` : 'last day of the week'}`;
  }
  const past = [6, 5, 4, 3, 2, 1].map((i) => {
    const s = ws - i * 7 * 864e5, st = weekStats(s);
    const hit = st.gym >= g.sessions && st.jogMin >= g.jogMin;
    return `<div class="wk ${hit ? 'hit' : ''}" title="Week of ${shortDate(s)}: ${st.gym} gym sessions, ${st.jogMin} min jogging">
      <span class="wk-d">${shortDate(s)}</span><span class="num">${st.gym}/${g.sessions}</span><span class="num">${st.jogMin}m</span></div>`;
  }).join('');
  return `<section class="card week">
    <div class="row"><b class="grow">This week</b><span class="small muted num">${shortDate(ws)} – ${shortDate(ws + 6 * 864e5)}</span></div>
    <div class="goal"><div class="row"><span class="grow">Gym sessions</span><span class="num"><b>${w.gym}</b> / ${g.sessions}</span></div>
      ${meter(w.gym, g.sessions)}<div class="small muted">PT ${w.pt}/${g.pt}${w.days.length ? ` · ${w.days.map((k) => KINDS[k]).join(', ')}` : ''}</div></div>
    <div class="goal"><div class="row"><span class="grow">Jogging</span><span class="num"><b>${w.jogMin}</b> / ${g.jogMin} min</span></div>
      ${meter(w.jogMin, g.jogMin)}</div>
    <div class="small muted" style="margin-top:10px">${hint}</div>
    <div class="row" style="margin-top:12px;flex-wrap:wrap">
      <button class="btn sm soft" data-act="quick-log" data-k="jog">+ Log a jog</button>
      <button class="btn sm soft" data-act="quick-log" data-k="class">+ Log a class</button>
      <button class="btn sm soft" data-act="watch-paste">⌚ Paste from Watch</button></div>
    <div class="lbl" style="margin-top:14px">Past weeks <span class="faint">· gym / jog</span></div>
    <div class="wks">${past}</div>
  </section>`;
}

/** Small muscle-goal card from the body scans. */
function muscleCard() {
  const sc = sortedScans();
  if (!sc.length) {
    return `<button class="card day-card" data-act="go-body"><div class="grow"><div class="title">Muscle goal</div>
      <div class="sub">Add your body scan to track skeletal muscle toward +${db.goals.muscleKg} kg</div></div><span class="chev faint">${ICON.chev}</span></button>`;
  }
  const g = bodyGoal(sc), latest = sc[sc.length - 1];
  return `<button class="card day-card" data-act="go-body"><div class="grow">
      <div class="row"><span class="title grow">Muscle goal</span><span class="num small"><b>${fmt1(latest.smm)}</b> / ${fmt1(g.target)} kg</span></div>
      ${meter(g.gained, db.goals.muscleKg)}
      <div class="sub">${g.gained >= 0 ? '+' : '−'}${fmt1(Math.abs(g.gained))} of +${db.goals.muscleKg} kg skeletal muscle · next scan ${nextScanText(latest)}</div>
    </div><span class="chev faint">${ICON.chev}</span></button>`;
}

function idleView() {
  const nd = nextDay();
  const last = nd && lastDoneOf(nd.id);
  const ndKind = nd ? dayKind(nd) : null;

  const notice = db.planNotice ? `<section class="card notice">
      <b>Your new plan is loaded</b>
      <div class="small muted" style="margin-top:4px">2 PT days, 1–2 days on your own, and jogging toward ${db.goals.jogMin / 60} h a week. Your previous routine is saved — restore it any time in Settings.</div>
      <div class="row" style="margin-top:10px"><button class="btn sm soft" data-act="go" data-tab="routine">See routine</button><button class="btn sm ghost" data-act="dismiss-plan">Got it</button></div>
    </section>` : '';

  const hero = nd ? `
    <section class="card hero">
      <div class="eyebrow">Up next${ndKind ? ` · ${KINDS[ndKind]}` : ''}</div>
      <h2>${esc(nd.name)}</h2>
      <div class="small muted">${last ? `Last done ${fmtDate(last.date)} · ${relDays(last.date)}` : 'Not done yet'}</div>
      <ul>${nd.exercises.map((x) => `<li data-act="guide" data-name="${esc(x.name)}">${thumb(x.name, 'sm')}<span class="guide-link">${esc(x.name)}</span><span class="num">${summarize(Array.from({ length: +x.sets || 1 }, () => ({ w: x.weight, r: x.reps })), x.timed)}</span></li>`).join('')}</ul>
      ${ndKind === 'pt' ? '<p class="small muted" style="margin:-6px 0 12px">Your PT may swap exercises — rename one with ⋯ or add new ones during the workout. Weights you log become next time’s targets.</p>' : ''}
      <button class="btn primary big" data-act="start" data-day="${nd.id}">Start workout</button>
    </section>` : `<div class="card empty">No routine yet. Add training days in <b>Routine</b>.</div>`;

  const others = db.routine.filter((d) => !nd || d.id !== nd.id).map((d) => {
    const l = lastDoneOf(d.id), k = dayKind(d);
    return `<button class="card day-card" data-act="start" data-day="${d.id}">
      <div class="grow"><div class="title">${esc(d.name)}${k === 'cardio' ? ' <span class="pill">timer</span>' : ''}</div>
      <div class="sub">${d.exercises.map((x) => esc(x.name)).join(' · ') || 'No exercises'}</div></div>
      <span class="faint small">${l ? relDays(l.date) : ''}</span><span class="chev faint">${ICON.chev}</span></button>`;
  }).join('');

  return {
    title: '<h1>Train</h1>',
    body: `<div class="stack">
      ${notice}
      ${weekCard()}
      ${hero}
    </div>
    ${others ? `<div class="section-title">Other days</div><div class="stack">${others}</div>` : ''}
    <div class="section-title">Body</div>
    <div class="stack">${muscleCard()}</div>
    <div class="section-title">More</div>
    <div class="stack">
      <button class="btn big" data-act="start" data-day="">Start empty workout</button>
      <div class="card"><div class="row"><div class="grow"><b>Rest timer</b><div class="small muted">Quick countdown, no workout needed</div></div></div>
        <div class="row" style="margin-top:10px;flex-wrap:wrap">${[30, 45, 60, 90, 120, 180].map((s) => `<button class="btn sm soft" data-act="quick-rest" data-s="${s}">${fmtSecs(s)}</button>`).join('')}</div>
      </div>
    </div>`,
  };
}

function activeView() {
  const a = db.active;
  const totalSets = a.entries.reduce((n, e) => n + e.sets.length, 0);
  const doneSets = a.entries.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);
  const cards = a.entries.map((e, ei) => exCard(e, ei)).join('');
  return {
    title: `<div class="grow"><div class="small muted" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(a.dayName)}</div>
        <div class="clock ${a.pausedAt ? 'paused' : ''}" data-clock>0:00</div></div>
      <button class="btn sm" data-act="pause">${a.pausedAt ? 'Resume' : 'Pause'}</button>
      <button class="btn sm primary" data-act="finish">Finish</button>`,
    body: `<div class="wk-summary"><span class="pill accent num">${doneSets}/${totalSets} sets</span>
        <span class="pill num">Started ${new Date(a.startedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</span>
        ${a.pausedAt ? '<span class="pill">Paused</span>' : ''}</div>
      <div class="stack">${cards || '<div class="card empty">No exercises yet — add one below.</div>'}</div>
      <div class="stack" style="margin-top:16px">
        <button class="btn big soft" data-act="add-ex">+ Add exercise</button>
        <button class="btn big ghost" data-act="watch-paste">${a.watch ? `⌚ Watch added · ${watchPill(a.watch) || fmtDur(a.watch.secs * 1000)}` : '⌚ Paste from Watch'}</button>
        <button class="btn big primary" data-act="finish">Finish workout</button>
        <button class="btn big ghost danger" data-act="discard">Discard workout</button>
      </div>`,
  };
}

function exCard(e, ei) {
  const a = db.active;
  const prev = lastEntry(e.name, a.id);
  const allDone = e.sets.length && e.sets.every((s) => s.done);
  const rows = e.sets.map((s, si) => {
    let btn;
    const running = a.setTimer && a.setTimer.ei === ei && a.setTimer.si === si;
    if (s.done) btn = `<button class="check" data-act="toggle-set" aria-label="Undo set">${ICON.check}</button>`;
    else if (e.timed && running) btn = `<button class="check running" data-act="stop-timer" data-settimer aria-label="Stop timer">…</button>`;
    else if (e.timed) btn = `<button class="check play" data-act="start-timer" aria-label="Start timer">${ICON.play}</button>`;
    else btn = `<button class="check" data-act="toggle-set" aria-label="Complete set">${ICON.check}</button>`;
    return `<tr class="${s.done ? 'done' : ''}" data-ei="${ei}" data-si="${si}">
      <td>${si + 1}</td>
      <td><input data-bind="set" data-f="w" value="${esc(s.w)}" inputmode="${wMode(s.w)}" enterkeyhint="done" aria-label="Weight set ${si + 1}"></td>
      <td><input data-bind="set" data-f="r" value="${esc(s.r)}" inputmode="numeric" enterkeyhint="done" aria-label="${e.timed ? 'Seconds' : 'Reps'} set ${si + 1}"></td>
      <td>${btn}</td></tr>`;
  }).join('');
  return `<section class="card ex ${allDone ? 'complete' : ''}" data-ei="${ei}">
    <div class="ex-head">${thumb(e.name, 'lg')}<div class="grow"><button class="ex-name guide-link" data-act="guide" data-name="${esc(e.name)}">${esc(e.name)}</button>
      <div class="ex-meta">${prev ? `Last: ${summarize(prev.entry.sets, e.timed)} <span class="faint">(${shortDate(prev.session.date)})</span>` : 'First time'}</div></div>
      <button class="icon-btn" data-act="guide" data-name="${esc(e.name)}" aria-label="How to do ${esc(e.name)}">${ICON.info}</button>
      <button class="icon-btn" data-act="ex-menu" aria-label="Exercise options">${ICON.more}</button></div>
    ${e.notes ? `<div class="ex-notes">${esc(e.notes)}</div>` : ''}
    <table class="sets"><thead><tr><th>Set</th><th>${unit()}</th><th>${e.timed ? 'Sec' : 'Reps'}</th><th></th></tr></thead><tbody>${rows}</tbody></table>
    <div class="ex-foot"><button class="btn sm ghost" data-act="add-set">+ Set</button>
      <button class="btn sm ghost" data-act="del-set" ${e.sets.length < 2 ? 'disabled' : ''}>− Set</button>
      <span class="grow"></span>
      ${e.rest ? `<button class="btn sm soft" data-act="rest-now">Rest ${fmtSecs(e.rest)}</button>` : ''}</div>
  </section>`;
}

views.history = () => {
  const list = sortedSessions();
  let html = '', month = '';
  list.forEach((s) => {
    const d = new Date(s.date);
    const m = d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    if (m !== month) { html += `<div class="section-title">${m}</div>`; month = m; }
    html += `<button class="card sess" data-act="edit-session" data-id="${s.id}" style="margin-bottom:10px">
      <div class="row"><span class="d grow">${fmtDate(s.date)}</span>
        ${s.distance ? `<span class="pill num">${s.distance} km${pace(s) ? ` · ${pace(s)}` : ''}</span>` : ''}
        ${watchPill(s.watch) ? `<span class="pill num" title="From Apple Watch">⌚ ${watchPill(s.watch)}</span>` : ''}
        ${s.duration ? `<span class="pill num">${fmtDur(s.duration)}</span>` : ''}</div>
      <div class="small muted">${esc(s.dayName || 'Workout')} <span class="faint">· ${KINDS[kindOf(s)]}</span></div>
      <div class="ex-list">${s.entries.map((e) => `${esc(e.name)} <span class="faint">— ${summarize(e.sets, e.timed)}</span>`).join('<br>')}</div>
    </button>`;
  });
  return {
    title: '<h1>History</h1><button class="btn sm soft" data-act="quick-log" data-k="jog">+ Jog</button><button class="btn sm soft" data-act="log-past">+ Log past</button>',
    body: html || '<div class="card empty">No workouts logged yet.</div>',
  };
};

function metricsFor(name) {
  const rows = [];
  [...db.sessions].sort((a, b) => (a.date < b.date ? -1 : 1)).forEach((s) => {
    const e = s.entries.find((x) => norm(x.name) === norm(name)); if (!e || !e.sets.length) return;
    const numericW = e.sets.every((x) => toNum(x.w) != null && !/[a-z]/i.test(String(x.w)));
    const rs = e.sets.map((x) => toNum(x.r)).filter((v) => v != null);
    rows.push({
      t: new Date(s.date).getTime(), date: s.date, entry: e, timed: e.timed,
      weight: numericW ? Math.max(...e.sets.map((x) => toNum(x.w))) : null,
      reps: rs.length ? Math.max(...rs) : null,
      volume: numericW && !e.timed ? e.sets.reduce((v, x) => v + toNum(x.w) * (toNum(x.r) || 0), 0) : null,
      total: rs.length ? rs.reduce((a, b) => a + b, 0) : null,
    });
  });
  return rows;
}

const modeSeg = () => `<div class="seg full" role="tablist" style="margin-bottom:12px">
  <button class="${ui.progressMode === 'ex' ? 'on' : ''}" data-act="progress-mode" data-m="ex">Exercises</button>
  <button class="${ui.progressMode === 'body' ? 'on' : ''}" data-act="progress-mode" data-m="body">Body</button></div>`;
views.progress = () => {
  const v = ui.progressMode === 'body' ? bodyView() : exerciseProgress();
  return { title: v.title, body: modeSeg() + v.body };
};

function bodyView() {
  const sc = sortedScans();
  const title = '<h1>Progress</h1><button class="btn sm soft" data-act="add-scan">+ Scan</button>';
  const fuel = `<div class="card small muted" style="line-height:1.6"><b style="color:var(--text)">Daily fuel for muscle gain</b><br>
    About <b class="num" style="color:var(--text)">${Number(db.goals.kcal).toLocaleString()} kcal</b> and <b class="num" style="color:var(--text)">${db.goals.protein} g protein</b> a day, protein spread over 3–4 meals.
    Add ~200–300 kcal on long jog days. If your weight hasn’t gone up after 4 weeks, add 100–150 kcal. Change these in Settings.</div>`;
  if (!sc.length) {
    return { title, body: `<div class="stack"><div class="card empty">No body scans yet.<br><span class="small">Add your Evolt or InBody results to track skeletal muscle toward your +${db.goals.muscleKg} kg goal.</span>
      <div style="margin-top:12px"><button class="btn primary" data-act="add-scan">Add body scan</button></div></div>${fuel}</div>` };
  }
  const k = BODY.some((b) => b[0] === ui.bodyMetric) ? ui.bodyMetric : 'smm';
  const meta = BODY.find((b) => b[0] === k), un = meta[3] === 'w' ? unit() : '%';
  const fmtV = (v) => (v == null ? '—' : `${fmt1(v)} ${un}`);
  const pts = sc.filter((s) => bodyVal(s, k) != null).map((s) => ({ t: new Date(s.date).getTime(), v: bodyVal(s, k), label: shortDate(s.date) }));
  const g = bodyGoal(sc), latest = sc[sc.length - 1];
  const target = k === 'smm' ? g.target : null;
  ui.chart = { pts, fmtV };
  const first = pts.length ? pts[0].v : null, last = pts.length ? pts[pts.length - 1].v : null;
  const delta = first != null && pts.length > 1 ? last - first : null;
  const goalCard = g.target != null ? `<div class="card">
      <div class="row"><b class="grow">Muscle goal</b><span class="num small">${fmt1(g.base)} → <b>${fmt1(g.target)}</b> ${unit()}</span></div>
      ${meter(g.gained, db.goals.muscleKg)}
      <div class="small muted">${g.gained >= 0 ? '+' : '−'}${fmt1(Math.abs(g.gained))} of +${db.goals.muscleKg} ${unit()} skeletal muscle · next scan ${nextScanText(latest)}.
        Realistic pace: about 0.2–0.4 ${unit()} of muscle a month.</div></div>` : '';
  return {
    title,
    body: `<div class="stack">
      ${goalCard}
      <div class="seg full" role="tablist">${BODY.map(([key, l]) => `<button class="${key === k ? 'on' : ''}" data-act="body-metric" data-k="${key}">${l}</button>`).join('')}</div>
      <div class="stats">
        <div class="stat"><div class="v num">${fmtV(last)}</div><div class="k">${meta[2]}</div></div>
        <div class="stat"><div class="v num">${delta == null ? '—' : (delta > 0 ? '+' : delta < 0 ? '−' : '±') + fmt1(Math.abs(delta))}</div><div class="k">Since ${pts.length ? shortDate(pts[0].t) : 'start'}</div></div>
        <div class="stat"><div class="v num">${sc.length}</div><div class="k">Scan${sc.length === 1 ? '' : 's'}</div></div>
      </div>
      <div class="card chart-wrap">${pts.length ? chartSVG(pts, undefined, target) : '<div class="empty">No values for this measure yet — edit a scan to add them.</div>'}<div class="tip" hidden></div></div>
      <div class="card"><table class="tbl"><thead><tr><th>Date</th><th class="r">Weight</th><th class="r">Muscle</th><th class="r">Fat %</th></tr></thead><tbody>
        ${[...sc].reverse().map((s) => `<tr class="tap" data-act="edit-scan" data-id="${s.id}"><td>${shortDate(s.date)}</td><td class="r">${fmt1(s.weight)}</td><td class="r">${fmt1(s.smm)}</td><td class="r">${fmt1(s.fat)}</td></tr>`).join('')}
      </tbody></table><div class="small faint" style="margin-top:8px">Tap a row to edit. Scan at the same time of day, before eating, for comparable numbers.</div></div>
      ${fuel}
    </div>`,
  };
}

function exerciseProgress() {
  const names = knownNames().filter((n) => db.sessions.some((s) => s.entries.some((e) => norm(e.name) === norm(n))));
  if (!names.length) return { title: '<h1>Progress</h1>', body: '<div class="card empty">Log a workout to see progress.</div>' };
  if (!ui.progressEx || !names.some((n) => norm(n) === norm(ui.progressEx))) ui.progressEx = names[0];
  const rows = metricsFor(ui.progressEx);
  const timed = rows.some((r) => r.timed);
  const hasW = rows.some((r) => r.weight != null);
  const metrics = [];
  if (hasW) metrics.push(['weight', 'Top weight']);
  metrics.push(['reps', timed ? 'Longest' : 'Best reps']);
  if (hasW && !timed) metrics.push(['volume', 'Volume']);
  metrics.push(['total', timed ? 'Total time' : 'Total reps']);
  if (!metrics.some((m) => m[0] === ui.metric)) ui.metric = metrics[0][0];
  const key = ui.metric;
  const fmtV = (v) => (v == null ? '—'
    : key === 'weight' ? `${+v.toFixed(2)} ${unit()}`
    : key === 'volume' ? `${Math.round(v).toLocaleString()} ${unit()}`
    : timed ? fmtSecs(Math.round(v)) : String(Math.round(v)));
  const pts = rows.filter((r) => r[key] != null).map((r) => ({ t: r.t, v: r[key], label: shortDate(r.t) }));
  const best = pts.length ? Math.max(...pts.map((p) => p.v)) : null;
  const latest = pts.length ? pts[pts.length - 1].v : null;
  const first = pts.length ? pts[0].v : null;
  const delta = latest != null && first != null ? latest - first : null;
  ui.chart = { pts, fmtV };

  // group the dropdown: routine days first, then anything else from history
  const used = new Set();
  const groups = db.routine.map((d) => {
    const opts = d.exercises.filter((x) => names.some((n) => norm(n) === norm(x.name)) && !used.has(norm(x.name)))
      .map((x) => { used.add(norm(x.name)); return x.name; });
    return opts.length ? `<optgroup label="${esc(d.name)}">${opts.map((n) => `<option ${norm(n) === norm(ui.progressEx) ? 'selected' : ''}>${esc(n)}</option>`).join('')}</optgroup>` : '';
  }).join('');
  const rest = names.filter((n) => !used.has(norm(n)));
  const restGroup = rest.length ? `<optgroup label="Past exercises">${rest.map((n) => `<option ${norm(n) === norm(ui.progressEx) ? 'selected' : ''}>${esc(n)}</option>`).join('')}</optgroup>` : '';

  return {
    title: '<h1>Progress</h1>',
    body: `<div class="stack">
      <select class="field" data-bind="progress-ex" aria-label="Exercise">${groups}${restGroup}</select>
      <div class="seg full" role="tablist">${metrics.map(([k, l]) => `<button class="${k === key ? 'on' : ''}" data-act="metric" data-k="${k}">${l}</button>`).join('')}</div>
      <div class="stats">
        <div class="stat"><div class="v num">${fmtV(latest)}</div><div class="k">Latest</div></div>
        <div class="stat"><div class="v num">${fmtV(best)}</div><div class="k">Best</div></div>
        <div class="stat"><div class="v num">${delta == null ? '—' : (delta > 0 ? '+' : delta < 0 ? '−' : '±') + fmtV(Math.abs(delta))}</div><div class="k">Since ${pts.length ? shortDate(pts[0].t) : 'start'}</div></div>
      </div>
      <div class="card chart-wrap">${pts.length ? chartSVG(pts, timed && key !== 'weight' ? (v) => fmtSecs(v) : undefined) : '<div class="empty">No numeric data for this metric.</div>'}<div class="tip" hidden></div></div>
      <div class="card"><table class="tbl"><thead><tr><th>Date</th><th>Sets</th><th class="r">${metrics.find((m) => m[0] === key)[1]}</th></tr></thead><tbody>
        ${[...rows].reverse().map((r) => `<tr><td>${shortDate(r.t)}</td><td class="muted">${summarize(r.entry.sets, r.timed)}</td><td class="r">${fmtV(r[key])}</td></tr>`).join('')}
      </tbody></table></div>
    </div>`,
  };
}

function niceTicks(lo, hi, n = 4) {
  if (lo === hi) { hi = hi > 0 ? hi * 1.2 : 1; lo = 0; } // flat series: show it against zero, not a ±1 zoom
  const raw = (hi - lo) / n, mag = 10 ** Math.floor(Math.log10(raw)), err = raw / mag;
  const step = (err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1) * mag;
  const out = [];
  for (let v = Math.floor(lo / step) * step; v <= Math.ceil(hi / step) * step + step / 1e6; v += step) out.push(+v.toFixed(6));
  return out;
}
const CH = { W: 640, H: 240, L: 44, R: 16, T: 16, B: 30 };
function chartSVG(pts, axisFmt = (v) => +v.toFixed(2), target = null) {
  const { W, H, L, R, T, B } = CH;
  let x0 = pts[0].t, x1 = pts[pts.length - 1].t;
  if (x0 === x1) { x0 -= 3 * 864e5; x1 += 3 * 864e5; }
  const vals = pts.map((p) => p.v).concat(target != null ? [target] : []);
  const ticks = niceTicks(Math.min(...vals), Math.max(...vals));
  const lo = ticks[0], hi = ticks[ticks.length - 1];
  const X = (t) => L + ((t - x0) / (x1 - x0)) * (W - L - R);
  const Y = (v) => T + (1 - (v - lo) / (hi - lo || 1)) * (H - T - B);
  pts.forEach((p) => { p.x = X(p.t); p.y = Y(p.v); });
  const grid = ticks.map((v) => `<line class="grid" x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}"/><text class="axis" x="${L - 8}" y="${Y(v) + 4}" text-anchor="end">${axisFmt(v)}</text>`).join('');
  const xl = [pts[0], pts[Math.floor((pts.length - 1) / 2)], pts[pts.length - 1]]
    .filter((p, i, arr) => arr.indexOf(p) === i)
    .map((p, i, arr) => `<text class="axis" x="${p.x}" y="${H - 8}" text-anchor="${arr.length === 1 ? 'middle' : i === 0 ? 'start' : i === arr.length - 1 ? 'end' : 'middle'}">${p.label}</text>`).join('');
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('');
  const area = pts.length > 1 ? `<path class="area" d="${line}L${pts[pts.length - 1].x.toFixed(1)},${Y(lo)}L${pts[0].x.toFixed(1)},${Y(lo)}Z"/>` : '';
  const dots = pts.map((p, i) => `<circle class="pt" data-i="${i}" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4"/>`).join('');
  const goal = target != null ? `<line class="goal-line" x1="${L}" x2="${W - R}" y1="${Y(target)}" y2="${Y(target)}"/>
    <text class="axis goal-l" x="${W - R - 4}" y="${Y(target) - 6}" text-anchor="end">Goal ${+target.toFixed(1)}</text>` : '';
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Progress chart">${grid}${goal}${xl}${area}
    <path class="line" d="${line}"/><line class="cross" y1="${T}" y2="${H - B}" visibility="hidden"/>${dots}
    <rect x="${L}" y="0" width="${W - L - R}" height="${H}" fill="transparent" data-hit/></svg>`;
}
function bindChart() {
  const wrap = $('.chart-wrap'); if (!wrap || !ui.chart || !ui.chart.pts.length) return;
  const svg = wrap.querySelector('svg'), tip = wrap.querySelector('.tip'), cross = svg.querySelector('.cross');
  const { pts, fmtV } = ui.chart;
  let cur = -1;
  const show = (e) => {
    const rect = svg.getBoundingClientRect(), wrapRect = wrap.getBoundingClientRect();
    const sx = ((e.clientX - rect.left) / rect.width) * CH.W;
    let i = 0; pts.forEach((p, k) => { if (Math.abs(p.x - sx) < Math.abs(pts[i].x - sx)) i = k; });
    if (i !== cur) {
      svg.querySelectorAll('.pt').forEach((c) => c.setAttribute('r', '4'));
      svg.querySelector(`.pt[data-i="${i}"]`).setAttribute('r', '6');
      cur = i;
    }
    const p = pts[i];
    cross.setAttribute('x1', p.x); cross.setAttribute('x2', p.x); cross.setAttribute('visibility', 'visible');
    tip.innerHTML = `${fmtDate(new Date(p.t).toISOString())}<br><b class="num">${fmtV(p.v)}</b>`;
    tip.hidden = false;
    const left = rect.left - wrapRect.left + (p.x / CH.W) * rect.width;
    const tw = tip.offsetWidth;
    tip.style.left = `${Math.min(Math.max(left, tw / 2 + 4), wrapRect.width - tw / 2 - 4)}px`;
    const top = rect.top - wrapRect.top + (p.y / CH.H) * rect.height - tip.offsetHeight - 12;
    tip.style.top = `${top < 0 ? rect.top - wrapRect.top + (p.y / CH.H) * rect.height + 14 : top}px`;
  };
  const hide = () => { tip.hidden = true; cross.setAttribute('visibility', 'hidden'); svg.querySelectorAll('.pt').forEach((c) => c.setAttribute('r', '4')); cur = -1; };
  svg.addEventListener('pointermove', show);
  svg.addEventListener('pointerdown', show);
  svg.addEventListener('pointerleave', hide);
}

views.routine = () => {
  const days = db.routine.map((d, di) => `
    <details class="card day-edit" data-di="${di}" ${ui.openDays.has(d.id) ? 'open' : ''}>
      <summary><span class="chev">${ICON.chev}</span><div class="grow"><div style="font-weight:700" data-dayname="${di}">${esc(d.name)}</div>
        <div class="small muted">${KINDS[dayKind(d)]} · ${d.exercises.length} exercise${d.exercises.length === 1 ? '' : 's'}</div></div>
        <button class="btn sm soft" data-act="start" data-day="${d.id}">Start</button></summary>
      <div style="margin-top:12px">
        <div class="row" style="align-items:flex-end">
          <div class="grow"><label class="lbl">Day name</label><input class="field" data-bind="rday" data-di="${di}" value="${esc(d.name)}"></div>
          <div style="width:136px"><label class="lbl">Type</label><select class="field" data-bind="rkind" data-di="${di}">
            ${['pt', 'self', 'cardio'].map((k) => `<option value="${k}" ${dayKind(d) === k ? 'selected' : ''}>${KINDS[k]}</option>`).join('')}</select></div>
        </div>
        <div style="margin-top:12px">${d.exercises.map((x, xi) => exEditor(x, di, xi, d.exercises.length)).join('')}</div>
        <button class="btn soft" style="width:100%" data-act="rx-add" data-di="${di}">+ Add exercise</button>
        <div class="row" style="margin-top:12px">
          <button class="btn sm" data-act="day-move" data-di="${di}" data-d="-1" ${di === 0 ? 'disabled' : ''}>Move up</button>
          <button class="btn sm" data-act="day-move" data-di="${di}" data-d="1" ${di === db.routine.length - 1 ? 'disabled' : ''}>Move down</button>
          <span class="grow"></span>
          <button class="btn sm danger" data-act="day-del" data-di="${di}">Delete day</button>
        </div>
      </div>
    </details>`).join('');
  return {
    title: '<h1>Routine</h1>',
    body: `<div class="card week-plan">
        <b>Suggested week</b>
        <table class="tbl plan"><tbody>
          <tr><td>Mon</td><td>PT 1 — shoulders, chest, back</td></tr>
          <tr><td>Tue</td><td>Jog 60 min, easy</td></tr>
          <tr><td>Wed</td><td>Self — arms &amp; upper (+ optional 30 min easy jog)</td></tr>
          <tr><td>Thu</td><td>PT 2 — lower body</td></tr>
          <tr><td>Fri</td><td>Rest</td></tr>
          <tr><td>Sat</td><td>Self — glutes &amp; legs, or a class</td></tr>
          <tr><td>Sun</td><td>Jog 60–90 min, easy</td></tr>
        </tbody></table>
        <div class="small muted" style="margin-top:8px">Any order works — the Train tab tracks your weekly totals. Keep most jogs easy, and avoid a hard run the day before PT 2. Add weight once you hit the top of the rep range on every set.</div>
      </div>
      <p class="small muted" style="margin:14px 2px 12px">“Up next” on Train is the first gym day you haven’t done this week. Weight, reps and sets here are the starting values when you begin a workout.</p>
      <div class="stack">${days}</div>
      <button class="btn big soft" style="margin-top:14px" data-act="day-add">+ Add training day</button>
      <datalist id="ex-names">${knownNames().map((n) => `<option value="${esc(n)}">`).join('')}</datalist>`,
  };
};
function exEditor(x, di, xi, n) {
  const b = (f) => `data-bind="rx" data-di="${di}" data-xi="${xi}" data-f="${f}"`;
  return `<div class="ex-edit">
    <div class="row">${thumb(x.name, 'sm')}<input class="field grow" ${b('name')} value="${esc(x.name)}" list="ex-names" placeholder="Exercise name" aria-label="Exercise name">
      <div class="tools">
        <button class="icon-btn" data-act="guide" data-name="${esc(x.name)}" aria-label="How to do it">${ICON.info}</button>
        <button class="icon-btn" data-act="rx-move" data-di="${di}" data-xi="${xi}" data-d="-1" ${xi === 0 ? 'disabled' : ''} aria-label="Move up">${ICON.up}</button>
        <button class="icon-btn" data-act="rx-move" data-di="${di}" data-xi="${xi}" data-d="1" ${xi === n - 1 ? 'disabled' : ''} aria-label="Move down">${ICON.down}</button>
        <button class="icon-btn" data-act="rx-del" data-di="${di}" data-xi="${xi}" aria-label="Delete exercise">${ICON.trash}</button>
      </div></div>
    <div class="ex-edit-grid">
      <div><label class="lbl">Sets</label><input class="field" ${b('sets')} value="${esc(x.sets)}" inputmode="numeric"></div>
      <div><label class="lbl">${x.timed ? 'Seconds' : 'Reps'}</label><input class="field" ${b('reps')} value="${esc(x.reps)}" inputmode="numeric"></div>
      <div><label class="lbl">Weight</label><input class="field" ${b('weight')} value="${esc(x.weight)}" inputmode="${wMode(x.weight)}" placeholder="${unit()}"></div>
      <div><label class="lbl">Rest (s)</label><input class="field" ${b('rest')} value="${esc(x.rest)}" inputmode="numeric"></div>
    </div>
    <div class="row" style="margin-top:8px">
      <input class="field grow" ${b('notes')} value="${esc(x.notes)}" placeholder="Notes (optional)">
      <label class="row small muted" style="gap:8px;flex:none">Timed<span class="switch"><input type="checkbox" ${b('timed')} ${x.timed ? 'checked' : ''}><span></span></span></label>
    </div>
  </div>`;
}

views.settings = () => {
  const s = db.settings;
  const sw = (k, title, sub) => `<label class="setting"><div class="grow"><div>${title}</div>${sub ? `<div class="small muted">${sub}</div>` : ''}</div>
    <span class="switch"><input type="checkbox" data-bind="setting" data-k="${k}" ${s[k] ? 'checked' : ''}><span></span></span></label>`;
  const seg = (k, opts) => `<div class="seg">${opts.map(([v, l]) => `<button class="${s[k] === v ? 'on' : ''}" data-act="setting-seg" data-k="${k}" data-v="${v}">${l}</button>`).join('')}</div>`;
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  return {
    title: '<h1>Settings</h1>',
    body: `
    <div class="section-title">Workout</div>
    <div class="card flush">
      <div class="setting"><div class="grow"><div>Weight unit</div><div class="small muted">Label only — numbers aren't converted</div></div>${seg('unit', [['kg', 'kg'], ['lb', 'lb']])}</div>
      <div class="setting"><div class="grow"><div>Default rest</div><div class="small muted">For newly added exercises (seconds)</div></div>
        <input class="field" style="width:84px;text-align:center" data-bind="setting" data-k="defaultRest" value="${s.defaultRest}" inputmode="numeric"></div>
      ${sw('sound', 'Timer sounds', 'Beeps at 3-2-1 and when rest ends')}
      ${sw('vibrate', 'Vibration', 'Android only — iPhone doesn’t allow web vibration')}
      ${sw('keepAwake', 'Keep screen awake', 'During a workout, so timers stay visible')}
      <div class="setting"><div class="grow"><div>Appearance</div></div>${seg('theme', [['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']])}</div>
    </div>
    <div class="section-title">Goals</div>
    <div class="card flush">
      ${[['sessions', 'Gym sessions a week', 'PT days + your own sessions + classes'], ['pt', 'PT sessions a week', ''],
        ['jogMin', 'Jogging minutes a week', '180 = 3 hours. If you’re new to jogging, build up ~15 min a week'],
        ['muscleKg', 'Muscle to gain (kg)', 'Added to your first body scan’s skeletal muscle'],
        ['kcal', 'Calories a day', 'Reminder only'], ['protein', 'Protein a day (g)', 'Reminder only']]
        .map(([k, t, sub]) => `<div class="setting"><div class="grow"><div>${t}</div>${sub ? `<div class="small muted">${sub}</div>` : ''}</div>
        <input class="field" style="width:84px;text-align:center" data-bind="goal" data-k="${k}" value="${esc(db.goals[k])}" inputmode="decimal"></div>`).join('')}
    </div>
    <div class="section-title">Your data</div>
    <div class="card flush">
      ${db.prevRoutine ? `<div class="setting"><div class="grow"><div>Previous routine</div><div class="small muted">Swap back to the routine you had before the PT plan (the current one is kept for swapping again)</div></div><button class="btn sm" data-act="swap-routine">Swap</button></div>` : ''}
      <div class="setting"><div class="grow"><div>Stored on this device</div><div class="small muted">${db.sessions.length} workouts · ${db.scans.length} body scans · ${db.routine.length} training days. Each device keeps its own copy — use backup files to move data between your phone and Mac.</div></div></div>
      <div class="setting"><div class="grow"><div>Export backup</div><div class="small muted">Save everything as a .json file</div></div><button class="btn sm" data-act="export">Export</button></div>
      <div class="setting"><div class="grow"><div>Import backup</div><div class="small muted">Merge or replace from a .json file</div></div>
        <label class="btn sm" style="position:relative;overflow:hidden">Import<input type="file" accept="application/json,.json" data-bind="import" style="position:absolute;inset:0;opacity:0"></label></div>
      <div class="setting"><div class="grow"><div>Reset everything</div><div class="small muted">Erase history and restore the original routine</div></div><button class="btn sm danger" data-act="reset">Reset</button></div>
    </div>
    <div class="section-title">Apple Watch</div>
    <div class="card flush">
      <div class="setting"><div class="grow"><div>Connect Apple Watch workouts</div><div class="small muted">Free Shortcut that copies each finished workout for Gym Log</div></div><button class="btn sm" data-act="watch-setup">Set up</button></div>
      <div class="setting"><div class="grow"><div>Paste from Watch</div><div class="small muted">Import the workout the Shortcut copied</div></div><button class="btn sm" data-act="watch-paste">Paste</button></div>
    </div>
    <div class="section-title">Credits</div>
    <div class="card small muted" style="line-height:1.6">${REPDB_CREDIT}. Illustrations from the RepDB free tier.</div>
    <div class="section-title">Install as an app</div>
    <div class="card small muted" style="line-height:1.6">
      ${standalone ? '<b style="color:var(--accent)">✓ Running as an installed app.</b><br>' : ''}
      <b style="color:var(--text)">iPhone:</b> open in Safari → Share → <i>Add to Home Screen</i>.<br>
      <b style="color:var(--text)">Android:</b> Chrome menu → <i>Install app</i>.<br>
      <b style="color:var(--text)">Mac:</b> Safari → File → <i>Add to Dock</i>, or Chrome → install icon in the address bar.
    </div>`,
  };
};

// ---------------------------------------------------------------- session editor (history)
function openSessionEditor(session, isNew) {
  ui.editing = { s: clone(session), isNew };
  renderEditor();
}
function renderEditor() {
  const { s, isNew } = ui.editing;
  const d = new Date(s.date);
  const dateVal = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const html = `
    <div class="row"><h3 class="grow">${isNew ? 'Log workout' : 'Edit workout'}</h3><button class="icon-btn" data-act="m:close" aria-label="Close">${ICON.close}</button></div>
    <div class="small muted">${esc(s.dayName || 'Workout')}</div>
    <div class="row" style="margin-top:12px">
      <div class="grow"><label class="lbl">Date</label><input type="date" class="field" data-bind="ed-date" value="${dateVal}"></div>
      <div style="width:120px"><label class="lbl">Duration (min)</label><input class="field" data-bind="ed-dur" inputmode="numeric" value="${s.duration ? Math.round(s.duration / 60000) : ''}" placeholder="—"></div>
    </div>
    <div class="row" style="margin-top:10px">
      <div class="grow"><label class="lbl">Type</label><select class="field" data-bind="ed-kind">
        ${Object.keys(KINDS).map((k) => `<option value="${k}" ${kindOf(s) === k ? 'selected' : ''}>${KINDS[k]}</option>`).join('')}</select></div>
      ${jogSecs(s) || kindOf(s) === 'cardio' ? `<div style="width:120px"><label class="lbl">Distance (km)</label><input class="field" data-bind="ed-dist" inputmode="decimal" value="${s.distance ?? ''}" placeholder="—"></div>` : ''}
    </div>
    ${s.entries.map((e, ei) => `
      <div class="card ex" style="margin-top:12px">
        <div class="ex-head"><input class="field grow" data-bind="ed-name" data-ei="${ei}" value="${esc(e.name)}" aria-label="Exercise name">
          <button class="icon-btn" data-act="m:delEntry" data-ei="${ei}" aria-label="Remove exercise">${ICON.trash}</button></div>
        <table class="sets"><thead><tr><th>Set</th><th>${unit()}</th><th>${e.timed ? 'Sec' : 'Reps'}</th><th></th></tr></thead><tbody>
        ${e.sets.map((st, si) => `<tr data-ei="${ei}" data-si="${si}"><td>${si + 1}</td>
          <td><input data-bind="ed-set" data-f="w" value="${esc(st.w)}" inputmode="${wMode(st.w)}"></td>
          <td><input data-bind="ed-set" data-f="r" value="${esc(st.r)}" inputmode="numeric"></td>
          <td><button class="icon-btn" data-act="m:delSet" aria-label="Remove set">${ICON.close}</button></td></tr>`).join('')}
        </tbody></table>
        <div class="ex-foot"><button class="btn sm ghost" data-act="m:addSet" data-ei="${ei}">+ Set</button></div>
      </div>`).join('')}
    <button class="btn soft" style="width:100%;margin-top:12px" data-act="m:addEntry">+ Add exercise</button>
    <div class="actions">
      ${isNew ? '<button class="btn" data-act="m:close">Cancel</button>' : '<button class="btn danger" data-act="m:delete">Delete</button>'}
      <button class="btn primary" data-act="m:save">Save</button></div>`;
  const keepScroll = $('#modal .sheet') ? $('#modal .sheet').scrollTop : 0;
  openModal(html, {
    close: closeModal,
    addSet: (el) => { const e = ui.editing.s.entries[+el.dataset.ei]; const l = e.sets[e.sets.length - 1] || { w: '', r: '' }; e.sets.push({ w: l.w, r: l.r, done: true }); renderEditor(); },
    delSet: (el) => { const tr = el.closest('tr'); ui.editing.s.entries[+tr.dataset.ei].sets.splice(+tr.dataset.si, 1); renderEditor(); },
    delEntry: (el) => { ui.editing.s.entries.splice(+el.dataset.ei, 1); renderEditor(); },
    addEntry: () => { ui.editing.s.entries.push({ name: '', timed: false, sets: [{ w: '', r: '', done: true }] }); renderEditor(); },
    delete: async () => {
      const id = ui.editing.s.id;
      if (await confirmBox({ title: 'Delete this workout?', body: 'This can’t be undone.', ok: 'Delete', danger: true })) {
        db.sessions = db.sessions.filter((x) => x.id !== id); save(); toast('Workout deleted'); renderView();
      }
    },
    save: () => {
      const ed = ui.editing.s;
      ed.entries = ed.entries.map((e) => ({ ...e, name: e.name.trim() })).filter((e) => e.name && e.sets.length);
      const i = db.sessions.findIndex((x) => x.id === ed.id);
      if (i >= 0) db.sessions[i] = ed; else db.sessions.push(ed);
      save(); closeModal(); toast('Saved'); renderView();
    },
  });
  $('#modal').firstElementChild.scrollTop = keepScroll;
}

// ---------------------------------------------------------------- rendering
const topbar = $('#topbar'), view = $('#view');
function applyTheme() {
  const t = db.settings.theme;
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
  else delete document.documentElement.dataset.theme;
}
function renderView() {
  const v = views[ui.tab]();
  topbar.innerHTML = `<div class="topbar-inner">${v.title}</div>`;
  view.innerHTML = v.body;
  document.querySelectorAll('.tabs button').forEach((b) => {
    b.classList.toggle('on', b.dataset.tab === ui.tab);
    b.classList.toggle('live', b.dataset.tab === 'train' && !!db.active);
  });
  if (ui.tab === 'progress') bindChart();
  tick();
}
function render() { applyTheme(); renderView(); renderRest(); }
function go(tab) { ui.tab = tab; render(); }

function renderRest() {
  const el = $('#restbar'), r = db.rest;
  if (!r) { el.hidden = true; el.innerHTML = ''; el.classList.remove('over'); return; }
  el.hidden = false;
  if (!el.firstChild) {
    el.innerHTML = `<div class="restbar-inner"><div class="grow"><div class="lab" data-rl></div><div class="t" data-rt></div></div>
      <button data-act="rest-add" data-d="-15">−15</button><button data-act="rest-add" data-d="15">+15</button>
      <button class="go" data-act="rest-skip">Skip</button><div class="progress" data-rp></div></div>`;
  }
  updateRest();
}
let lastCue = null;
function updateRest() {
  const r = db.rest; if (!r) return;
  const el = $('#restbar');
  if (!el.firstChild) { renderRest(); return; }
  const left = r.endsAt - Date.now();
  if (left > 0) {
    el.classList.remove('over');
    el.querySelector('[data-rl]').textContent = r.label;
    el.querySelector('[data-rt]').textContent = fmtClock(left + 999);
    el.querySelector('[data-rp]').style.width = `${Math.max(0, Math.min(100, (left / (r.total * 1000)) * 100))}%`;
    el.querySelector('.go').textContent = 'Skip';
    const sec = Math.ceil(left / 1000);
    if (sec <= 3 && sec !== lastCue) { lastCue = sec; blip(); }
  } else {
    if (!r.fired) {
      r.fired = true; save();
      if (-left < 5000) alarm(); // don't blare if we only just came back from the background
    }
    el.classList.add('over');
    el.querySelector('[data-rl]').textContent = r.label;
    el.querySelector('[data-rt]').textContent = 'Rest over — go!';
    el.querySelector('[data-rp]').style.width = '0%';
    el.querySelector('.go').textContent = 'OK';
    if (-left > 8000) { db.rest = null; lastCue = null; save(); renderRest(); }
  }
}
function tick() {
  const a = db.active;
  if (a) {
    document.querySelectorAll('[data-clock]').forEach((c) => { c.textContent = fmtClock(elapsed(a)); });
    const st = a.setTimer;
    if (st) {
      const left = st.target * 1000 - (Date.now() - st.startedAt);
      if (left <= 0) completeSetTimer(-left < 5000);
      else { const b = $('[data-settimer]'); if (b) b.textContent = fmtClock(left + 999); }
    }
  }
  updateRest();
}
setInterval(tick, 250);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { acquireWakeLock(); tick(); } });
window.addEventListener('scroll', () => topbar.classList.toggle('scrolled', window.scrollY > 4), { passive: true });

// ---------------------------------------------------------------- events
document.addEventListener('click', async (ev) => {
  const t = ev.target.closest('[data-act], .tabs button[data-tab]');
  if (!t || t.disabled) return;
  if (t.dataset.tab) { go(t.dataset.tab); window.scrollTo(0, 0); return; }
  const act = t.dataset.act;
  if (act.startsWith('m:')) { ev.preventDefault(); const f = ui.modalActs[act.slice(2)]; if (f) f(t); return; }
  if (t.closest('summary') && act === 'start') ev.preventDefault();
  const a = db.active;
  const exEl = t.closest('[data-ei]');
  const ei = exEl ? +exEl.dataset.ei : -1;
  const e = a && ei >= 0 ? a.entries[ei] : null;
  const row = t.closest('tr[data-si]');
  const si = row ? +row.dataset.si : -1;

  switch (act) {
    case 'start': {
      if (db.active) { toast('Finish or discard the current workout first'); go('train'); break; }
      startWorkout(t.dataset.day);
      break;
    }
    case 'quick-rest': unlockAudio(); startRest(+t.dataset.s, 'Rest'); break;
    case 'pause':
      if (a.pausedAt) { a.pausedMs += Date.now() - a.pausedAt; a.pausedAt = null; } else a.pausedAt = Date.now();
      save(); renderView(); break;
    case 'finish': finishFlow(); break;
    case 'discard':
      if (await confirmBox({ title: 'Discard this workout?', body: 'Nothing from this session will be saved.', ok: 'Discard', danger: true })) {
        db.active = null; db.rest = null; save(); releaseWakeLock(); render();
      }
      break;
    case 'toggle-set': {
      const s = e.sets[si]; s.done = !s.done; save();
      if (s.done) { buzz(30); if (e.rest) startRest(e.rest, `${e.name} · set ${si + 1} done`); }
      renderView(); break;
    }
    case 'start-timer': {
      const target = toNum(e.sets[si].r);
      if (!target) { toast('Enter the seconds first'); break; }
      unlockAudio();
      a.setTimer = { ei, si, startedAt: Date.now(), target }; db.rest = null; save(); renderRest(); renderView(); break;
    }
    case 'stop-timer': {
      const st = a.setTimer; if (!st) break;
      const secs = Math.max(1, Math.round((Date.now() - st.startedAt) / 1000));
      a.setTimer = null; const s = a.entries[st.ei].sets[st.si]; s.r = String(secs); s.done = true; save();
      if (e.rest) startRest(e.rest, `${e.name} · set ${si + 1} done`);
      renderView(); break;
    }
    case 'add-set': { const l = e.sets[e.sets.length - 1] || { w: '', r: '' }; e.sets.push({ w: l.w, r: l.r, done: false }); save(); renderView(); break; }
    case 'del-set': {
      if (e.sets.length < 2) break;
      if (a.setTimer && a.setTimer.ei === ei && a.setTimer.si === e.sets.length - 1) a.setTimer = null;
      e.sets.pop(); save(); renderView(); break;
    }
    case 'rest-now': unlockAudio(); startRest(e.rest, e.name); break;
    case 'rest-add': db.rest.endsAt += +t.dataset.d * 1000; db.rest.total = Math.max(db.rest.total + +t.dataset.d, 1);
      if (db.rest.endsAt <= Date.now()) db.rest.endsAt = Date.now() + 1000;
      db.rest.fired = false; lastCue = null; save(); updateRest(); break;
    case 'rest-skip': db.rest = null; lastCue = null; save(); renderRest(); break;
    case 'ex-menu': exMenu(ei); break;
    case 'guide': {
      // in the routine editor, use the name as currently typed
      const inp = t.closest('.ex-edit') && t.closest('.ex-edit').querySelector('[data-f="name"]');
      const name = (inp ? inp.value : t.dataset.name).trim();
      if (name) openGuide(name); else toast('Name the exercise first');
      break;
    }
    case 'add-ex': addExerciseModal(); break;

    case 'edit-session': openSessionEditor(db.sessions.find((s) => s.id === t.dataset.id), false); break;
    case 'log-past': logPastModal(); break;

    case 'metric': ui.metric = t.dataset.k; renderView(); break;
    case 'progress-mode': ui.progressMode = t.dataset.m; renderView(); break;
    case 'body-metric': ui.bodyMetric = t.dataset.k; renderView(); break;
    case 'add-scan': scanModal(null); break;
    case 'edit-scan': scanModal(db.scans.find((s) => s.id === t.dataset.id)); break;
    case 'go-body': ui.progressMode = 'body'; go('progress'); window.scrollTo(0, 0); break;
    case 'quick-log': quickLogModal(t.dataset.k); break;
    case 'watch-paste': pasteFromWatch(); break;
    case 'watch-setup': watchSetup(); break;
    case 'dismiss-plan': db.planNotice = false; save(); renderView(); break;
    case 'swap-routine':
      if (await confirmBox({ title: 'Swap routines?', body: 'Your current routine is kept, so you can swap back here any time. History isn’t affected.', ok: 'Swap' })) {
        [db.routine, db.prevRoutine] = [db.prevRoutine, db.routine]; db.planNotice = false; save(); toast('Routine swapped'); render();
      }
      break;

    case 'day-add': {
      const d = { id: uid(), name: `Day ${db.routine.length + 1}`, exercises: [] };
      db.routine.push(d); ui.openDays.add(d.id); save(); renderView(); break;
    }
    case 'day-move': {
      const di = +t.dataset.di, j = di + +t.dataset.d;
      [db.routine[di], db.routine[j]] = [db.routine[j], db.routine[di]]; save(); renderView(); break;
    }
    case 'day-del': {
      const di = +t.dataset.di;
      if (await confirmBox({ title: `Delete “${db.routine[di].name}”?`, body: 'Your logged history for this day is kept.', ok: 'Delete', danger: true })) {
        db.routine.splice(di, 1); save(); renderView();
      }
      break;
    }
    case 'rx-add': {
      const d = db.routine[+t.dataset.di];
      d.exercises.push({ id: uid(), name: '', sets: 3, reps: '10', weight: '', rest: db.settings.defaultRest, timed: false, notes: '' });
      ui.openDays.add(d.id); save(); renderView();
      const inputs = view.querySelectorAll(`[data-bind="rx"][data-di="${t.dataset.di}"][data-f="name"]`);
      if (inputs.length) inputs[inputs.length - 1].focus();
      break;
    }
    case 'rx-move': {
      const list = db.routine[+t.dataset.di].exercises, i = +t.dataset.xi, j = i + +t.dataset.d;
      [list[i], list[j]] = [list[j], list[i]]; save(); renderView(); break;
    }
    case 'rx-del': {
      const list = db.routine[+t.dataset.di].exercises, i = +t.dataset.xi;
      if (await confirmBox({ title: `Remove “${list[i].name || 'exercise'}”?`, ok: 'Remove', danger: true })) { list.splice(i, 1); save(); renderView(); }
      break;
    }

    case 'setting-seg': db.settings[t.dataset.k] = t.dataset.v; save(); render(); break;
    case 'export': exportData(); break;
    case 'reset':
      if (await confirmBox({ title: 'Reset all data?', body: 'Deletes all logged workouts and restores the original routine. Export a backup first if you want to keep anything.', ok: 'Reset', danger: true })) {
        const s = db.settings; db = defaults(); db.settings = s; save(); toast('Reset done'); render();
      }
      break;
    default: break;
  }
});

// remember which routine days are expanded
document.addEventListener('toggle', (ev) => {
  const d = ev.target; if (!d.matches || !d.matches('details.day-edit')) return;
  const day = db.routine[+d.dataset.di]; if (!day) return;
  if (d.open) ui.openDays.add(day.id); else ui.openDays.delete(day.id);
}, true);

// Checkboxes are handled on 'change' (older Safari doesn't fire 'input' for them); everything else on 'input'.
document.addEventListener('input', (ev) => { if (ev.target.type !== 'checkbox') onBind(ev.target); });
function onBind(el) {
  const bind = el.dataset && el.dataset.bind; if (!bind || bind === 'import') return;
  const val = el.type === 'checkbox' ? el.checked : el.value;
  switch (bind) {
    case 'set': {
      const tr = el.closest('tr'), e = db.active.entries[+tr.dataset.ei], si = +tr.dataset.si, f = el.dataset.f;
      const old = e.sets[si][f];
      e.sets[si][f] = val;
      // carry the change down to later, not-yet-done sets that still had the same value
      for (let k = si + 1; k < e.sets.length; k++) {
        const s = e.sets[k];
        if (!s.done && s[f] === old) {
          s[f] = val;
          const inp = el.closest('tbody').querySelector(`tr[data-si="${k}"] input[data-f="${f}"]`);
          if (inp) inp.value = val;
        }
      }
      save(); break;
    }
    case 'rday': db.routine[+el.dataset.di].name = val; { const n = $(`[data-dayname="${el.dataset.di}"]`); if (n) n.textContent = val; } save(); break;
    case 'rx': {
      const x = db.routine[+el.dataset.di].exercises[+el.dataset.xi], f = el.dataset.f;
      x[f] = f === 'sets' || f === 'rest' ? (toNum(val) ?? val) : val;
      save();
      if (f === 'timed') renderView();
      break;
    }
    case 'setting': {
      const k = el.dataset.k;
      db.settings[k] = k === 'defaultRest' ? (toNum(val) ?? 60) : val; save();
      if (k === 'keepAwake') { if (val) acquireWakeLock(); else releaseWakeLock(); }
      break;
    }
    case 'progress-ex': ui.progressEx = val; ui.metric = null; renderView(); break;
    case 'ed-date': { if (!val) break; const old = new Date(ui.editing.s.date); const [y, m, d] = val.split('-').map(Number); ui.editing.s.date = localISO(new Date(y, m - 1, d, old.getHours(), old.getMinutes())); break; }
    case 'ed-dur': ui.editing.s.duration = (toNum(val) || 0) * 60000; break;
    case 'ed-kind': ui.editing.s.kind = val; break;
    case 'ed-dist': { const v = toNum(val); if (v) ui.editing.s.distance = v; else delete ui.editing.s.distance; break; }
    case 'rkind': db.routine[+el.dataset.di].kind = val; save(); renderView(); break;
    case 'goal': { const v = toNum(val); if (v != null && v >= 0) { db.goals[el.dataset.k] = v; save(); } break; }
    case 'ed-name': ui.editing.s.entries[+el.dataset.ei].name = val; break;
    case 'ed-set': { const tr = el.closest('tr'); ui.editing.s.entries[+tr.dataset.ei].sets[+tr.dataset.si][el.dataset.f] = val; break; }
    default: break;
  }
}
document.addEventListener('change', (ev) => {
  const el = ev.target;
  if (el.type === 'checkbox') onBind(el);
  if (el.dataset && el.dataset.bind === 'import' && el.files && el.files[0]) importData(el.files[0]);
  if (el.id === 'sc-file' && el.files && el.files[0]) { onScanUpload(el.files[0]); el.value = ''; }
  if (el.dataset && el.dataset.bind === 'set' && el.dataset.f === 'w') el.inputMode = wMode(el.value);
});
document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Enter' && ev.target.matches && ev.target.matches('.sets input')) ev.target.blur();
  if (ev.key === 'Escape' && !$('#modal').hidden) closeModal();
});

// ---------------------------------------------------------------- modals: workout
function exMenu(ei) {
  const a = db.active, e = a.entries[ei];
  openModal(`
    <h3>${esc(e.name)}</h3>
    <div class="row" style="margin-top:12px">
      <div class="grow"><label class="lbl">Name</label><input class="field" id="m-name" value="${esc(e.name)}"></div>
      <div style="width:110px"><label class="lbl">Rest (sec)</label><input class="field" id="m-rest" value="${e.rest}" inputmode="numeric"></div>
    </div>
    <div style="margin-top:10px"><label class="lbl">Notes</label><input class="field" id="m-notes" value="${esc(e.notes)}"></div>
    <div class="row" style="margin-top:14px">
      <button class="btn sm" data-act="m:up" ${ei === 0 ? 'disabled' : ''}>Move up</button>
      <button class="btn sm" data-act="m:down" ${ei === a.entries.length - 1 ? 'disabled' : ''}>Move down</button>
      <span class="grow"></span>
      <button class="btn sm danger" data-act="m:remove">Remove</button>
    </div>
    <div class="actions"><button class="btn" data-act="m:close">Cancel</button><button class="btn primary" data-act="m:save">Save</button></div>`,
  {
    close: closeModal,
    save: () => {
      e.name = $('#m-name').value.trim() || e.name; e.rest = toNum($('#m-rest').value) ?? 0; e.notes = $('#m-notes').value.trim();
      save(); closeModal(); renderView();
    },
    up: () => { moveEntry(ei, -1); closeModal(); },
    down: () => { moveEntry(ei, 1); closeModal(); },
    remove: () => {
      if (a.setTimer && a.setTimer.ei === ei) a.setTimer = null;
      else if (a.setTimer && a.setTimer.ei > ei) a.setTimer.ei -= 1;
      a.entries.splice(ei, 1); save(); closeModal(); renderView();
    },
  });
}
function moveEntry(ei, d) {
  const a = db.active, j = ei + d; if (j < 0 || j >= a.entries.length) return;
  [a.entries[ei], a.entries[j]] = [a.entries[j], a.entries[ei]];
  if (a.setTimer) { if (a.setTimer.ei === ei) a.setTimer.ei = j; else if (a.setTimer.ei === j) a.setTimer.ei = ei; }
  save(); renderView();
}
function addExerciseModal() {
  const names = knownNames();
  openModal(`
    <h3>Add exercise</h3>
    <div style="margin-top:12px"><label class="lbl">Name</label><input class="field" id="m-name" list="m-names" autofocus placeholder="e.g. Lat Pulldown">
      <datalist id="m-names">${names.map((n) => `<option value="${esc(n)}">`).join('')}</datalist></div>
    <div class="ex-edit-grid" style="grid-template-columns:repeat(4,1fr)">
      <div><label class="lbl">Sets</label><input class="field" id="m-sets" value="3" inputmode="numeric"></div>
      <div><label class="lbl" id="m-rlab">Reps</label><input class="field" id="m-reps" value="10" inputmode="numeric"></div>
      <div><label class="lbl">Weight</label><input class="field" id="m-w" placeholder="${unit()}"></div>
      <div><label class="lbl">Rest (s)</label><input class="field" id="m-rest" value="${db.settings.defaultRest}" inputmode="numeric"></div>
    </div>
    <label class="row small muted" style="margin-top:12px;gap:10px"><span class="switch"><input type="checkbox" id="m-timed"><span></span></span>Timed exercise (seconds instead of reps)</label>
    <div class="actions"><button class="btn" data-act="m:close">Cancel</button><button class="btn primary" data-act="m:add">Add</button></div>`,
  {
    close: closeModal,
    add: () => {
      const name = $('#m-name').value.trim(); if (!name) { $('#m-name').focus(); return; }
      const prev = lastEntry(name);
      const lastSet = prev && prev.entry.sets[prev.entry.sets.length - 1];
      const e = entryFrom({
        name, sets: $('#m-sets').value, timed: $('#m-timed').checked || !!(prev && prev.entry.timed),
        reps: $('#m-reps').value || (lastSet ? lastSet.r : ''), weight: $('#m-w').value || (lastSet ? lastSet.w : ''), rest: $('#m-rest').value,
      });
      e.exId = null;
      db.active.entries.push(e); save(); closeModal(); renderView();
      setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 50);
    },
  });
  $('#m-timed').addEventListener('change', (ev) => { $('#m-rlab').textContent = ev.target.checked ? 'Seconds' : 'Reps'; });
}
function logPastModal() {
  openModal(`<div class="row"><h3 class="grow">Log a past workout</h3><button class="icon-btn" data-act="m:close" aria-label="Close">${ICON.close}</button></div>
    <p class="small muted">Pick the day — sets are prefilled from your routine and you can edit them.</p>
    <div class="picker-list">${db.routine.map((d) => `<button data-act="m:pick" data-day="${d.id}"><span>${esc(d.name)}</span><span class="chev faint">${ICON.chev}</span></button>`).join('')}
      <button data-act="m:pick" data-day=""><span>Blank workout</span><span class="chev faint">${ICON.chev}</span></button></div>`,
  {
    close: closeModal,
    pick: (el) => {
      const d = db.routine.find((x) => x.id === el.dataset.day);
      const now = new Date(); now.setHours(12, 0, 0, 0);
      openSessionEditor({
        id: uid(), dayId: d ? d.id : null, dayName: d ? d.name : 'Workout', date: localISO(now), duration: 0,
        entries: d ? d.exercises.map((x) => { const e = entryFrom(x); return { name: e.name, timed: e.timed, sets: e.sets.map((s) => ({ ...s, done: true })) }; })
          : [{ name: '', timed: false, sets: [{ w: '', r: '', done: true }] }],
      }, true);
    },
  });
}

// ---------------------------------------------------------------- backup
async function exportData() {
  const data = JSON.stringify({ ...db, exportedAt: new Date().toISOString(), app: 'gym-log' }, null, 1);
  const name = `gym-log-${localISO().slice(0, 10)}.json`;
  const file = new File([data], name, { type: 'application/json' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] }) && /iPhone|iPad|Android/i.test(navigator.userAgent)) {
      await navigator.share({ files: [file], title: name }); return;
    }
  } catch (e) { if (e.name === 'AbortError') return; }
  const url = URL.createObjectURL(file);
  const link = document.createElement('a'); link.href = url; link.download = name;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  toast('Backup exported');
}
function importData(file) {
  const reader = new FileReader();
  reader.onload = () => {
    let d;
    try { d = JSON.parse(reader.result); } catch (e) { toast('That file isn’t valid JSON'); return; }
    if (!d || !Array.isArray(d.sessions) || !Array.isArray(d.routine)) { toast('Not a Gym Log backup file'); return; }
    const fresh = d.sessions.filter((s) => !db.sessions.some((x) => x.id === s.id)).length;
    const scans = Array.isArray(d.scans) ? d.scans : [];
    const freshScans = scans.filter((s) => !db.scans.some((x) => x.id === s.id)).length;
    const keepRoutine = (d.plan || 1) < (db.plan || 1);
    openModal(`<h3>Import backup</h3>
      <p class="muted">The file has ${plural(d.sessions.length, 'workout')}, ${plural(scans.length, 'body scan')} and ${plural(d.routine.length, 'training day')}. New to this device: ${plural(fresh, 'workout')}, ${plural(freshScans, 'scan')}.
        ${keepRoutine ? 'Its routine is older than yours, so merging keeps your current routine.' : ''}</p>
      <div class="stack">
        <button class="btn big primary" data-act="m:merge">Merge — add new items${keepRoutine ? '' : ', use file’s routine'}</button>
        <button class="btn big danger" data-act="m:replace">Replace everything on this device</button>
        <button class="btn big ghost" data-act="m:close">Cancel</button></div>`,
    {
      close: closeModal,
      merge: () => {
        db.sessions = db.sessions.concat(d.sessions.filter((s) => !db.sessions.some((x) => x.id === s.id)));
        db.scans = db.scans.concat(scans.filter((s) => !db.scans.some((x) => x.id === s.id)));
        if (!keepRoutine) { db.routine = d.routine; if (d.plan) db.plan = d.plan; }
        save(); closeModal(); toast(`Imported ${fresh} workouts, ${freshScans} scans`); render();
      },
      replace: () => {
        const base = defaults();
        db = migrate({ ...base, ...d, plan: d.plan || 1, settings: { ...base.settings, ...(d.settings || {}) }, active: db.active, rest: db.rest });
        delete db.exportedAt; delete db.app;
        save(); closeModal(); toast('Backup restored'); render();
      },
    });
  };
  reader.readAsText(file);
}

// ---------------------------------------------------------------- boot
render();
if (db.active) acquireWakeLock();
if ('serviceWorker' in navigator && (location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname))) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
})();
