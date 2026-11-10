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
function defaults() {
  const seed = window.SEED || { routine: [], sessions: [] };
  return {
    version: 1,
    settings: { unit: 'kg', defaultRest: 60, sound: true, vibrate: true, keepAwake: true, theme: 'auto' },
    routine: clone(seed.routine),
    sessions: clone(seed.sessions),
    active: null,
    rest: null,
  };
}
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw), base = defaults();
      return { ...base, ...d, settings: { ...base.settings, ...(d.settings || {}) } };
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
const ui = { tab: 'train', openDays: new Set(), progressEx: null, metric: null, editing: null, modalActs: {}, chart: null };
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
function nextDay() {
  if (!db.routine.length) return null;
  const last = sortedSessions().find((s) => db.routine.some((d) => d.id === s.dayId));
  if (!last) return db.routine[0];
  const i = db.routine.findIndex((d) => d.id === last.dayId);
  return db.routine[(i + 1) % db.routine.length];
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
    id: uid(), dayId: day ? day.id : null, dayName: day ? day.name : 'Workout',
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
          id: a.id, dayId: a.dayId, dayName: a.dayName, date: localISO(new Date(a.startedAt)), duration: elapsed(a),
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
  const hasPhoto = !!(g && g.photo);
  const hasAnim = hasPhoto || (key && window.ExAnim && window.ExAnim.has(key));
  openModal(`
    <div class="row"><div class="grow"><h3>${esc(name)}</h3>${g && g.zh ? `<div class="small muted">${esc(g.zh)}</div>` : ''}</div>
      <button class="icon-btn" data-act="m:close" aria-label="Close">${ICON.close}</button></div>
    ${g ? `<div class="row" style="flex-wrap:wrap;gap:6px;margin-top:10px">${g.muscles.map((m) => `<span class="pill accent">${esc(m)}</span>`).join('')}</div>` : ''}
    ${hasAnim ? `<div class="anim${hasPhoto ? ' photo' : ''}" id="m-anim" style="margin-top:14px"></div>` : ''}
    ${g ? `
      ${g.assumed ? `<p class="small muted guide-note">${esc(g.assumed)}</p>` : ''}
      <div class="section-title">How to do it</div>${list(g.steps, 'ol')}
      <div class="section-title">Form cues</div>${list(g.cues, 'ul')}
      <div class="section-title">Common mistakes</div>${list(g.mistakes, 'ul')}`
    : '<p class="muted" style="margin-top:14px">No guide for this exercise yet. Add your own cues in the exercise notes (Routine tab).</p>'}`,
  { close: closeModal });
  if (hasPhoto) mountPhotos($('#m-anim'), g);
  else if (hasAnim) window.ExAnim.mount($('#m-anim'), key);
}

/** Start/end photos from free-exercise-db, cross-fading like a two-frame flip-book. */
function mountPhotos(el, g) {
  const frames = g.photos || [0, 1];
  const name = g.photo.replace(/_/g, ' ');
  el.innerHTML = `<div class="photo-stage">${frames.map((f, i) =>
    `<img src="photos/${encodeURIComponent(g.photo)}/${f}.jpg" alt="${esc(name)} — position ${i + 1}" class="${i ? '' : 'on'}" decoding="async">`).join('')}</div>
    <div class="anim-bar"><span class="anim-label"></span>${frames.length > 1 ? '<button type="button" class="anim-toggle"></button>' : ''}</div>
    <div class="photo-credit">Photo: ${esc(name)} · <a href="https://github.com/yuhonas/free-exercise-db" target="_blank" rel="noopener">free-exercise-db</a> (Unlicense)</div>`;
  const imgs = [...el.querySelectorAll('img')], lab = el.querySelector('.anim-label'), btn = el.querySelector('.anim-toggle');
  const labels = frames.length > 1 ? ['Start', 'Finish'] : ['Hold this position'];
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
  // tapping the photo while paused flips to the other position
  el.querySelector('.photo-stage').addEventListener('click', () => { if (!playing && imgs.length > 1) show((i + 1) % imgs.length); });
  show(0); setBtn(); loop();
}

// ---------------------------------------------------------------- views
const views = {};

views.train = () => (db.active ? activeView() : idleView());

function idleView() {
  const nd = nextDay();
  const now = new Date();
  const weekStart = dayStart(now) - ((now.getDay() + 6) % 7) * 864e5;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const ses = db.sessions.map((s) => new Date(s.date).getTime());
  const wk = ses.filter((t) => t >= weekStart).length, mo = ses.filter((t) => t >= monthStart).length;
  const last = nd && lastDoneOf(nd.id);

  const hero = nd ? `
    <section class="card hero">
      <div class="eyebrow">Up next</div>
      <h2>${esc(nd.name)}</h2>
      <div class="small muted">${last ? `Last done ${fmtDate(last.date)} · ${relDays(last.date)}` : 'Not done yet'}</div>
      <ul>${nd.exercises.map((x) => `<li data-act="guide" data-name="${esc(x.name)}"><span class="guide-link">${esc(x.name)}</span><span class="num">${summarize(Array.from({ length: +x.sets || 1 }, () => ({ w: x.weight, r: x.reps })), x.timed)}</span></li>`).join('')}</ul>
      <button class="btn primary big" data-act="start" data-day="${nd.id}">Start workout</button>
    </section>` : `<div class="card empty">No routine yet. Add training days in <b>Routine</b>.</div>`;

  const others = db.routine.filter((d) => !nd || d.id !== nd.id).map((d) => {
    const l = lastDoneOf(d.id);
    return `<button class="card day-card" data-act="start" data-day="${d.id}">
      <div class="grow"><div class="title">${esc(d.name)}</div>
      <div class="sub">${d.exercises.map((x) => esc(x.name)).join(' · ') || 'No exercises'}</div></div>
      <span class="faint small">${l ? relDays(l.date) : ''}</span><span class="chev faint">${ICON.chev}</span></button>`;
  }).join('');

  return {
    title: '<h1>Train</h1>',
    body: `<div class="stack">
      <div class="stats">
        <div class="stat"><div class="v num">${wk}</div><div class="k">This week</div></div>
        <div class="stat"><div class="v num">${mo}</div><div class="k">This month</div></div>
        <div class="stat"><div class="v num">${db.sessions.length}</div><div class="k">All time</div></div>
      </div>
      ${hero}
    </div>
    ${others ? `<div class="section-title">Other days</div><div class="stack">${others}</div>` : ''}
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
    <div class="ex-head"><div class="grow"><button class="ex-name guide-link" data-act="guide" data-name="${esc(e.name)}">${esc(e.name)}</button>
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
      <div class="row"><span class="d grow">${fmtDate(s.date)}</span>${s.duration ? `<span class="pill num">${fmtDur(s.duration)}</span>` : ''}</div>
      <div class="small muted">${esc(s.dayName || 'Workout')}</div>
      <div class="ex-list">${s.entries.map((e) => `${esc(e.name)} <span class="faint">— ${summarize(e.sets, e.timed)}</span>`).join('<br>')}</div>
    </button>`;
  });
  return {
    title: '<h1>History</h1><button class="btn sm soft" data-act="log-past">+ Log past</button>',
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

views.progress = () => {
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
};

function niceTicks(lo, hi, n = 4) {
  if (lo === hi) { hi = hi > 0 ? hi * 1.2 : 1; lo = 0; } // flat series: show it against zero, not a ±1 zoom
  const raw = (hi - lo) / n, mag = 10 ** Math.floor(Math.log10(raw)), err = raw / mag;
  const step = (err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1) * mag;
  const out = [];
  for (let v = Math.floor(lo / step) * step; v <= Math.ceil(hi / step) * step + step / 1e6; v += step) out.push(+v.toFixed(6));
  return out;
}
const CH = { W: 640, H: 240, L: 44, R: 16, T: 16, B: 30 };
function chartSVG(pts, axisFmt = (v) => +v.toFixed(2)) {
  const { W, H, L, R, T, B } = CH;
  let x0 = pts[0].t, x1 = pts[pts.length - 1].t;
  if (x0 === x1) { x0 -= 3 * 864e5; x1 += 3 * 864e5; }
  const ticks = niceTicks(Math.min(...pts.map((p) => p.v)), Math.max(...pts.map((p) => p.v)));
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
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Progress chart">${grid}${xl}${area}
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
        <div class="small muted">${d.exercises.length} exercise${d.exercises.length === 1 ? '' : 's'}</div></div>
        <button class="btn sm soft" data-act="start" data-day="${d.id}">Start</button></summary>
      <div style="margin-top:12px">
        <label class="lbl">Day name</label>
        <input class="field" data-bind="rday" data-di="${di}" value="${esc(d.name)}">
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
    body: `<p class="small muted" style="margin:0 2px 12px">Days rotate in this order — “Up next” on Train is the day after your last workout. Weight, reps and sets here are the starting values when you begin a workout.</p>
      <div class="stack">${days}</div>
      <button class="btn big soft" style="margin-top:14px" data-act="day-add">+ Add training day</button>
      <datalist id="ex-names">${knownNames().map((n) => `<option value="${esc(n)}">`).join('')}</datalist>`,
  };
};
function exEditor(x, di, xi, n) {
  const b = (f) => `data-bind="rx" data-di="${di}" data-xi="${xi}" data-f="${f}"`;
  return `<div class="ex-edit">
    <div class="row"><input class="field grow" ${b('name')} value="${esc(x.name)}" list="ex-names" placeholder="Exercise name" aria-label="Exercise name">
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
    <div class="section-title">Your data</div>
    <div class="card flush">
      <div class="setting"><div class="grow"><div>Stored on this device</div><div class="small muted">${db.sessions.length} workouts · ${db.routine.length} training days. Each device keeps its own copy — use backup files to move data between your phone and Mac.</div></div></div>
      <div class="setting"><div class="grow"><div>Export backup</div><div class="small muted">Save everything as a .json file</div></div><button class="btn sm" data-act="export">Export</button></div>
      <div class="setting"><div class="grow"><div>Import backup</div><div class="small muted">Merge or replace from a .json file</div></div>
        <label class="btn sm" style="position:relative;overflow:hidden">Import<input type="file" accept="application/json,.json" data-bind="import" style="position:absolute;inset:0;opacity:0"></label></div>
      <div class="setting"><div class="grow"><div>Reset everything</div><div class="small muted">Erase history and restore the original routine</div></div><button class="btn sm danger" data-act="reset">Reset</button></div>
    </div>
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
    case 'ed-name': ui.editing.s.entries[+el.dataset.ei].name = val; break;
    case 'ed-set': { const tr = el.closest('tr'); ui.editing.s.entries[+tr.dataset.ei].sets[+tr.dataset.si][el.dataset.f] = val; break; }
    default: break;
  }
}
document.addEventListener('change', (ev) => {
  const el = ev.target;
  if (el.type === 'checkbox') onBind(el);
  if (el.dataset && el.dataset.bind === 'import' && el.files && el.files[0]) importData(el.files[0]);
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
    openModal(`<h3>Import backup</h3>
      <p class="muted">The file has ${d.sessions.length} workouts and ${d.routine.length} training days. ${fresh} workouts aren’t on this device yet.</p>
      <div class="stack">
        <button class="btn big primary" data-act="m:merge">Merge — add ${fresh} new workouts, use file’s routine</button>
        <button class="btn big danger" data-act="m:replace">Replace everything on this device</button>
        <button class="btn big ghost" data-act="m:close">Cancel</button></div>`,
    {
      close: closeModal,
      merge: () => {
        db.sessions = db.sessions.concat(d.sessions.filter((s) => !db.sessions.some((x) => x.id === s.id)));
        db.routine = d.routine; save(); closeModal(); toast(`Imported ${fresh} workouts`); render();
      },
      replace: () => {
        const base = defaults();
        db = { ...base, ...d, settings: { ...base.settings, ...(d.settings || {}) }, active: db.active, rest: db.rest };
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
