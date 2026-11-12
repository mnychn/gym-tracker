/* Exercise animations: a small 2D figure rig drawn in SVG.
 *
 * Angles: dir(a) = (sin a, cos a) in SVG space, so 0 = straight down, 90 = forward (the figure faces right),
 * 180 = straight up, -90 = backward.
 * A pose sets the pelvis position `hip`, torso angle `t` (pelvis -> neck), and each limb:
 *   {x, y}          absolute target for the hand/ankle, solved with 2-bone IK (keeps contacts on floor/bench)
 *   {a, r}          polar target from the shoulder/hip (r = fraction of full limb length), solved with IK
 *   {a1, a2, r1, r2} forward kinematics: absolute angles of upper/lower segment (+ optional length scale)
 * Limbs: hN/hF = near/far arm, fN/fF = near/far leg. In `view: 'front'` N is the figure's left (viewer's right).
 */
(() => {
'use strict';
const L = { head: 10, neck: 5, torso: 48, shoAt: 44, ua: 27, fa: 25, th: 36, sh: 35, foot: 11, hipW: 9, shoW: 16 };
const FLOOR = 170;
const RAD = Math.PI / 180;
const dir = (a) => [Math.sin(a * RAD), Math.cos(a * RAD)];
const add = (p, v, s = 1) => [p[0] + v[0] * s, p[1] + v[1] * s];
const angOf = (v) => Math.atan2(v[0], v[1]) / RAD;
const r1 = (n) => Math.round(n * 10) / 10;

function ik(root, target, l1, l2, bend) {
  const dx = target[0] - root[0], dy = target[1] - root[1];
  const d = Math.hypot(dx, dy);
  const dc = Math.min(l1 + l2 - 0.01, Math.max(Math.abs(l1 - l2) + 0.01, d || 1));
  const base = angOf([dx, dy]);
  const A = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + dc * dc - l2 * l2) / (2 * l1 * dc)))) / RAD;
  const c1 = add(root, dir(base + A), l1), c2 = add(root, dir(base - A), l1);
  const cross = (j) => dx * (j[1] - root[1]) - dy * (j[0] - root[0]);
  const mid = Math.sign(cross(c1)) === bend ? c1 : c2;
  return { mid, end: add(root, dir(base), dc), reach: d - (l1 + l2) };
}
function limb(root, s, l1, l2, bend) {
  if (s.a1 != null) {
    const mid = add(root, dir(s.a1), l1 * (s.r1 ?? 1));
    return { mid, end: add(mid, dir(s.a2 ?? s.a1), l2 * (s.r2 ?? 1)), reach: -1 };
  }
  const target = s.x != null ? [s.x, s.y] : add(root, dir(s.a), (l1 + l2) * (s.r ?? 1));
  return ik(root, target, l1, l2, s.b ?? bend);
}

/** Solve a pose into joint positions. */
function solve(p) {
  const front = p.view === 'front';
  const t = p.t ?? 180, td = dir(t), ts = p.ts ?? 1;
  const hip = p.hip;
  const neck = add(hip, td, L.torso * ts);
  const sho = add(hip, td, L.shoAt * ts);
  const perp = dir(t - 90);
  const w = front ? 1 : 0;
  const J = { hip, neck, sho, front };
  J.head = add(neck, dir(t + (p.nt || 0)), (L.neck + L.head) * (p.hs ?? 1));
  J.fwd = dir(t - 90 + (p.nt || 0));
  J.reach = {};
  for (const s of ['N', 'F']) {
    const sg = s === 'N' ? 1 : -1;
    J['s' + s] = add(sho, perp, L.shoW * w * sg);
    J['p' + s] = add(hip, perp, L.hipW * w * sg);
    const arm = limb(J['s' + s], p['h' + s] || { a: 0 }, L.ua * (p.as ?? 1), L.fa * (p.as ?? 1), 1);
    J['e' + s] = arm.mid; J['h' + s] = arm.end; J.reach['h' + s] = arm.reach;
    const leg = limb(J['p' + s], p['f' + s] || { a: 0 }, L.th * (p.ls ?? 1), L.sh * (p.ls ?? 1), -1);
    J['k' + s] = leg.mid; J['a' + s] = leg.end; J.reach['f' + s] = leg.reach;
    const fa = p['fa' + s] ?? (front ? 90 * sg * 0.7 : 90);
    J['toe' + s] = add(leg.end, dir(fa), L.foot * (front ? 0.45 : 1));
  }
  if (p.rot) {
    const c = Math.cos(p.rot * RAD), sn = Math.sin(p.rot * RAD);
    const rot = (q) => [hip[0] + (q[0] - hip[0]) * c - (q[1] - hip[1]) * sn, hip[1] + (q[0] - hip[0]) * sn + (q[1] - hip[1]) * c];
    for (const k of Object.keys(J)) if (Array.isArray(J[k]) && k !== 'fwd') J[k] = rot(J[k]);
  }
  return J;
}

function lerp(a, b, e) {
  if (typeof a === 'number' && typeof b === 'number') return a + (b - a) * e;
  if (Array.isArray(a) && Array.isArray(b)) return a.map((x, i) => x + (b[i] - x) * e);
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const o = {};
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      o[k] = a[k] === undefined ? b[k] : b[k] === undefined ? a[k] : lerp(a[k], b[k], e);
    }
    return o;
  }
  return e < 0.5 ? a : b;
}

// ------------------------------------------------------------------ drawing
const line = (p, q, w, cls) => `<line x1="${r1(p[0])}" y1="${r1(p[1])}" x2="${r1(q[0])}" y2="${r1(q[1])}" stroke-width="${w}" class="${cls}"/>`;
const path = (pts, w, cls) => `<polyline points="${pts.map((p) => `${r1(p[0])},${r1(p[1])}`).join(' ')}" stroke-width="${w}" class="${cls}"/>`;

function drawProp(pr, J) {
  const at = pr.at ? J[pr.at] : null;
  const ox = pr.dx || 0, oy = pr.dy || 0;
  switch (pr.type) {
    case 'bench': {
      const { x, y, w, h } = pr;
      return `<rect x="${x}" y="${y}" width="${w}" height="7" rx="3" class="eq-pad"/>
        ${line([x + 8, y + 7], [x + 8, y + h], 4, 'eq')}${line([x + w - 8, y + 7], [x + w - 8, y + h], 4, 'eq')}`;
    }
    case 'box': return `<rect x="${pr.x}" y="${pr.y}" width="${pr.w}" height="${pr.h}" rx="3" class="${pr.soft ? 'eq-soft' : 'eq-pad'}"/>`;
    case 'db': return `<g transform="translate(${r1(at[0] + ox)},${r1(at[1] + oy)})"><circle r="7" class="eq-db"/><circle r="2.6" class="eq-db-in"/></g>`;
    case 'dbV': return `<g transform="translate(${r1(at[0] + ox)},${r1(at[1] + oy)})"><rect x="-2" y="-9" width="4" height="18" class="eq-db"/><rect x="-7" y="-13" width="14" height="6" rx="2" class="eq-db"/><rect x="-7" y="7" width="14" height="6" rx="2" class="eq-db"/></g>`;
    case 'kb': return `<g transform="translate(${r1(at[0])},${r1(at[1])})"><path d="M-5,2 Q0,-9 5,2" class="eq-kb-h"/><circle cy="9" r="8" class="eq-db"/></g>`;
    case 'band': return line(J[pr.a], J[pr.b], 2.5, 'eq-band');
    default: return '';
  }
}

function draw(def, pose) {
  const J = solve(pose);
  const hl = new Set(def.hl || []);
  const front = J.front;
  const segCls = (name, far) => (hl.has(name) ? (far ? 'hl far' : 'hl') : (far ? 'fig far' : 'fig'));
  const limbs = (s, far) => {
    const out = [];
    out.push(line(J['p' + s], J['k' + s], 9, segCls('th' + s, far)));
    out.push(line(J['k' + s], J['a' + s], 8, segCls('sh' + s, far)));
    out.push(line(J['a' + s], J['toe' + s], 6, far ? 'fig far' : 'fig'));
    return out.join('');
  };
  const arms = (s, far) => line(J['s' + s], J['e' + s], 8, segCls('ua' + s, far)) + line(J['e' + s], J['h' + s], 7, segCls('fa' + s, far));
  let body;
  if (front) {
    body = path([J.sN, J.sF, J.pF, J.pN, J.sN], 9, `${hl.has('torso') ? 'hl' : 'fig'} fill`)
      + line(J.sho, J.neck, 7, 'fig');
  } else {
    body = line(J.hip, J.neck, 15, hl.has('torso') ? 'hl' : 'fig');
  }
  const head = `<circle cx="${r1(J.head[0])}" cy="${r1(J.head[1])}" r="${L.head}" class="head"/>`
    + (front ? '' : line(add(J.head, J.fwd, 8), add(J.head, J.fwd, 11.5), 4, 'fig'));
  const props = def.props || [];
  const behind = props.filter((p) => ['bench', 'box'].includes(p.type)).map((p) => drawProp(p, J)).join('');
  const held = props.filter((p) => !['bench', 'box'].includes(p.type)).map((p) => drawProp(p, J)).join('');
  const floor = def.noFloor ? '' : line([6, FLOOR + 2], [234, FLOOR + 2], 2, 'floor');
  const order = front
    ? limbs('F') + limbs('N') + body + arms('F') + arms('N') + head
    : limbs('F', true) + arms('F', true) + body + head + limbs('N') + arms('N');
  return floor + behind + order + held;
}

// ------------------------------------------------------------------ pose helpers
const STAND = (x = 120) => ({ hip: [x, 97], t: 180, hN: { a: 0, r: 1 }, hF: { a: 0, r: 1 }, fN: { x, y: 166 }, fF: { x, y: 166 } });
/** Rigid straight body from ankle at elevation angle `deg` (push-up/plank). */
function plank(ankle, deg) {
  const u = [Math.cos(deg * RAD), -Math.sin(deg * RAD)];
  return { hip: add(ankle, u, 70.9), t: angOf(u) };
}
const seatedFront = { view: 'front', hip: [120, 121], t: 180, fN: { a1: 20, a2: 2, r1: 0.3 }, fF: { a1: -20, a2: -2, r1: 0.3 } };
const seatProps = [{ type: 'box', x: 102, y: 26, w: 36, h: 92, soft: true }, { type: 'box', x: 96, y: 122, w: 48, h: 9 }];
const lyingBase = () => ({ hip: [146, 124], t: -90, fN: { x: 178, y: 166 }, fF: { x: 178, y: 166 } });

const ANIMS = {};
// ---- legs
ANIMS['goblet squat'] = {
  hl: ['thN', 'thF'], props: [{ type: 'dbV', at: 'hN', dx: 2 }],
  frames: [
    { label: 'Start', ...STAND(116), hip: [112, 97], hN: { a: 45, r: 0.36 }, hF: { a: 45, r: 0.36 } },
    { label: 'Squat down', ...STAND(116), hip: [94, 128], t: 152, hN: { a: 72, r: 0.36 }, hF: { a: 72, r: 0.36 } },
  ],
};
ANIMS['squat'] = {
  hl: ['thN', 'thF'], props: [{ type: 'db', at: 'hF' }, { type: 'db', at: 'hN' }],
  frames: [
    { label: 'Start', ...STAND(116), hip: [113, 97] },
    { label: 'Squat down', ...STAND(116), hip: [94, 128], t: 150 },
  ],
};
ANIMS['db romanian deadlift'] = {
  hl: ['thN', 'thF'], props: [{ type: 'db', at: 'hF' }, { type: 'db', at: 'hN' }],
  frames: [
    { label: 'Start', ...STAND(128) },
    { label: 'Hinge back', ...STAND(128), hip: [95, 105], t: 112 },
  ],
};
ANIMS['srdl'] = {
  hl: ['thN'], props: [{ type: 'db', at: 'hF' }],
  frames: [
    { label: 'Start', ...STAND(128), fF: { a: -8, r: 0.97 } },
    { label: 'Hinge on one leg', ...STAND(128), hip: [95, 105], t: 100, fF: { a: -80, r: 1 } },
  ],
};
ANIMS['bulgarian split squat'] = {
  hl: ['thN'], props: [{ type: 'bench', x: 28, y: 136, w: 64, h: 34 }, { type: 'db', at: 'hF' }, { type: 'db', at: 'hN' }],
  frames: [
    { label: 'Start', hip: [122, 104], t: 178, hN: { a: 0, r: 1 }, hF: { a: 0, r: 1 }, fN: { x: 150, y: 166 }, fF: { x: 80, y: 132 }, faF: -100 },
    { label: 'Lower', hip: [114, 130], t: 168, hN: { a: 0, r: 1 }, hF: { a: 0, r: 1 }, fN: { x: 150, y: 166 }, fF: { x: 80, y: 132 }, faF: -100 },
  ],
};
ANIMS['step down'] = {
  hl: ['thN'], props: [{ type: 'box', x: 62, y: 150, w: 72, h: 20 }],
  frames: [
    { label: 'Start', hip: [116, 78], t: 180, hN: { a: 40, r: 1 }, hF: { a: 40, r: 1 }, fN: { x: 116, y: 146 }, fF: { a: 14, r: 0.97 }, faF: 110 },
    { label: 'Tap heel down', hip: [110, 106], t: 168, hN: { a: 62, r: 1 }, hF: { a: 62, r: 1 }, fN: { x: 116, y: 146 }, fF: { a: 31, r: 0.985 }, faF: 90 },
  ],
};
ANIMS['hip thrust'] = {
  hl: ['thN', 'thF'], props: [{ type: 'bench', x: 14, y: 132, w: 60, h: 38 }, { type: 'db', at: 'hip', dy: -11 }],
  frames: [
    { label: 'Start', hip: [103, 154], t: -131, nt: 25, hN: { x: 101, y: 146 }, hF: { x: 101, y: 146 }, fN: { x: 150, y: 166 }, fF: { x: 150, y: 166 } },
    { label: 'Drive hips up', hip: [114, 131], t: -98, nt: 35, hN: { x: 112, y: 124 }, hF: { x: 112, y: 124 }, fN: { x: 150, y: 166 }, fF: { x: 150, y: 166 } },
  ],
};
ANIMS['clam shell'] = {
  hl: ['thN'], props: [{ type: 'band', a: 'kN', b: 'kF' }],
  frames: [
    { label: 'Start', view: 'front', rot: -90, hip: [150, 148], t: 180, hN: { a1: 4, a2: -4 }, hF: { a1: 172, a2: 140 },
      fN: { a1: -12, a2: -14, r1: 0.78, r2: 0.78 }, fF: { a1: 12, a2: 14, r1: 0.78, r2: 0.78 }, faN: 90, faF: -90 },
    { label: 'Open top knee', view: 'front', rot: -90, hip: [150, 148], t: 180, hN: { a1: 4, a2: -4 }, hF: { a1: 172, a2: 140 },
      fN: { a1: 48, a2: -66, r1: 0.78, r2: 0.78 }, fF: { a1: 12, a2: 14, r1: 0.78, r2: 0.78 }, faN: 90, faF: -90 },
  ],
};
// ---- back & chest
ANIMS['seated band row'] = {
  hl: ['torso', 'uaN'], props: [{ type: 'band', a: 'toeN', b: 'hN' }, { type: 'band', a: 'toeF', b: 'hF' }],
  frames: [
    { label: 'Start', hip: [78, 160], t: 180, hN: { a: 90, r: 0.97 }, hF: { a: 90, r: 0.97 }, fN: { x: 148, y: 160 }, fF: { x: 148, y: 160 }, faN: 180, faF: 180 },
    { label: 'Row', hip: [78, 160], t: 184, hN: { a: 30, r: 0.45 }, hF: { a: 30, r: 0.45 }, fN: { x: 148, y: 160 }, fF: { x: 148, y: 160 }, faN: 180, faF: 180 },
  ],
};
ANIMS['single-arm kb row'] = {
  hl: ['torso', 'uaN'], props: [{ type: 'bench', x: 22, y: 136, w: 112, h: 34 }, { type: 'kb', at: 'hN' }],
  frames: [
    { label: 'Start', hip: [86, 102], t: 98, hN: { x: 132, y: 146 }, hF: { x: 128, y: 134 }, fN: { x: 116, y: 166 }, fF: { x: 44, y: 132 }, faF: -100 },
    { label: 'Row to hip', hip: [86, 102], t: 98, hN: { x: 108, y: 104 }, hF: { x: 128, y: 134 }, fN: { x: 116, y: 166 }, fF: { x: 44, y: 132 }, faF: -100 },
  ],
};
ANIMS['bent-over db row'] = {
  hl: ['torso', 'uaN'], props: [{ type: 'db', at: 'hF' }, { type: 'db', at: 'hN' }],
  frames: [
    { label: 'Start', ...STAND(128), hip: [103, 104], t: 120 },
    { label: 'Row', ...STAND(128), hip: [103, 104], t: 120, hN: { a: -40, r: 0.5 }, hF: { a: -40, r: 0.5 } },
  ],
};
ANIMS['butterfly'] = {
  hl: ['torso'], props: seatProps,
  frames: [
    { label: 'Open', ...seatedFront, hN: { x: 183, y: 80, b: -1 }, hF: { x: 57, y: 80, b: 1 } },
    { label: 'Squeeze', ...seatedFront, hN: { x: 126, y: 88, b: -1 }, hF: { x: 114, y: 88, b: 1 } },
  ],
};
ANIMS['db pullover'] = {
  hl: ['torso', 'uaN'], props: [{ type: 'bench', x: 66, y: 132, w: 104, h: 38 }, { type: 'dbV', at: 'hN' }],
  frames: [
    { label: 'Start', ...lyingBase(), hN: { a: 180, r: 0.97 }, hF: { a: 180, r: 0.97 } },
    { label: 'Arc overhead', ...lyingBase(), hN: { a: 268, r: 0.94 }, hF: { a: 268, r: 0.94 } },
  ],
};
ANIMS['push-up'] = {
  hl: ['torso', 'uaN'],
  frames: [
    { label: 'Top', ...plank([48, 163], 24.5), hN: { x: 152, y: 166 }, hF: { x: 152, y: 166 }, fN: { x: 48, y: 163 }, fF: { x: 48, y: 163 }, faN: 50, faF: 50 },
    { label: 'Lower', ...plank([48, 163], 7.5), hN: { x: 152, y: 166 }, hF: { x: 152, y: 166 }, fN: { x: 48, y: 163 }, fF: { x: 48, y: 163 }, faN: 50, faF: 50 },
  ],
};
ANIMS['incline push-up'] = {
  hl: ['torso', 'uaN'], props: [{ type: 'bench', x: 132, y: 133, w: 70, h: 37 }],
  frames: [
    { label: 'Top', ...plank([68, 163], 43), hN: { x: 151, y: 131 }, hF: { x: 151, y: 131 }, fN: { x: 68, y: 163 }, fF: { x: 68, y: 163 }, faN: 50, faF: 50 },
    { label: 'Lower', ...plank([68, 163], 26), hN: { x: 151, y: 131 }, hF: { x: 151, y: 131 }, fN: { x: 68, y: 163 }, fF: { x: 68, y: 163 }, faN: 50, faF: 50 },
  ],
};
ANIMS['plank'] = {
  hl: ['torso'],
  frames: [
    { label: 'Hold', ...plank([40, 163], 12.4), hN: { x: 177, y: 166 }, hF: { x: 177, y: 166 }, fN: { x: 40, y: 163 }, fF: { x: 40, y: 163 }, faN: 50, faF: 50 },
    { label: 'Hold', ...plank([40, 163], 12.9), hN: { x: 177, y: 166 }, hF: { x: 177, y: 166 }, fN: { x: 40, y: 163 }, fF: { x: 40, y: 163 }, faN: 50, faF: 50 },
  ],
  dur: [1.6, 1.6], hold: 0,
};
ANIMS['db roll'] = {
  hl: ['torso'], props: [{ type: 'db', at: 'hN', dy: 1 }],
  frames: [
    { label: 'Start', hip: [93, 128], t: 115, hN: { x: 142, y: 160 }, hF: { x: 142, y: 160 }, fN: { a1: -5, a2: -90 }, fF: { a1: -5, a2: -90 }, faN: -60, faF: -60 },
    { label: 'Roll out', hip: [119.5, 143.4], t: 100, hN: { x: 204, y: 160 }, hF: { x: 204, y: 160 }, fN: { a1: -55, a2: -90 }, fF: { a1: -55, a2: -90 }, faN: -60, faF: -60 },
  ],
};
// ---- shoulders & arms
ANIMS['db shoulder press'] = {
  hl: ['uaN', 'uaF'], props: [...seatProps, { type: 'db', at: 'hN' }, { type: 'db', at: 'hF' }],
  frames: [
    { label: 'Start', ...seatedFront, hN: { a1: 80, a2: 180 }, hF: { a1: -80, a2: -180 } },
    { label: 'Press up', ...seatedFront, hN: { a1: 163, a2: 177 }, hF: { a1: -163, a2: -177 } },
  ],
};
ANIMS['single-arm lateral raise'] = {
  hl: ['uaN'], props: [{ type: 'db', at: 'hN' }],
  frames: [
    { label: 'Start', view: 'front', hip: [120, 95], t: 180, hN: { a1: 8, a2: 6 }, hF: { a1: -8, a2: -6 }, fN: { a1: 4, a2: 0 }, fF: { a1: -4, a2: 0 } },
    { label: 'Raise to shoulder height', view: 'front', hip: [120, 95], t: 180, hN: { a1: 88, a2: 96 }, hF: { a1: -8, a2: -6 }, fN: { a1: 4, a2: 0 }, fF: { a1: -4, a2: 0 } },
  ],
};
ANIMS['rear delt fly'] = {
  hl: ['uaN', 'uaF'], props: [{ type: 'db', at: 'hN' }, { type: 'db', at: 'hF' }],
  frames: [
    { label: 'Hinged forward', view: 'front', hip: [120, 97], t: 180, ts: 0.62, hs: 0.2, hN: { a1: 6, a2: 4 }, hF: { a1: -6, a2: -4 }, fN: { a1: 6, a2: -2, r1: 0.95 }, fF: { a1: -6, a2: 2, r1: 0.95 } },
    { label: 'Open wide', view: 'front', hip: [120, 97], t: 180, ts: 0.62, hs: 0.2, hN: { a1: 84, a2: 92 }, hF: { a1: -84, a2: -92 }, fN: { a1: 6, a2: -2, r1: 0.95 }, fF: { a1: -6, a2: 2, r1: 0.95 } },
  ],
};
const seatedSide = { hip: [100, 131], t: 180, fN: { x: 136, y: 166 }, fF: { x: 136, y: 166 } };
ANIMS['overhead'] = {
  hl: ['uaN', 'uaF'], props: [{ type: 'box', x: 72, y: 135, w: 52, h: 35 }, { type: 'dbV', at: 'hN' }],
  frames: [
    { label: 'Start', ...seatedSide, hN: { a1: 176, a2: 180 }, hF: { a1: 176, a2: 180 } },
    { label: 'Lower behind head', ...seatedSide, hN: { a1: 176, a2: 325 }, hF: { a1: 176, a2: 325 } },
  ],
};
ANIMS['french press'] = {
  hl: ['uaN', 'uaF'], props: [{ type: 'bench', x: 66, y: 132, w: 104, h: 38 }, { type: 'db', at: 'hN' }],
  frames: [
    { label: 'Start', ...lyingBase(), hN: { a1: 180, a2: 180 }, hF: { a1: 180, a2: 180 } },
    { label: 'Bend elbows', ...lyingBase(), hN: { a1: 190, a2: 300 }, hF: { a1: 190, a2: 300 } },
  ],
};
ANIMS['bicep curl'] = {
  hl: ['uaN', 'uaF'], props: [{ type: 'db', at: 'hF' }, { type: 'db', at: 'hN' }],
  frames: [
    { label: 'Start', ...STAND(), hN: { a1: 0, a2: 0 }, hF: { a1: 0, a2: 0 } },
    { label: 'Curl up', ...STAND(), hN: { a1: -6, a2: 150 }, hF: { a1: -6, a2: 150 } },
  ],
};
// ---- cardio
ANIMS['hiit'] = {
  hl: ['thN', 'thF'], caption: 'Example move: jumping jacks',
  frames: [
    { label: 'Jumping jacks', view: 'front', hip: [120, 96], t: 180, hN: { a1: 12, a2: 6 }, hF: { a1: -12, a2: -6 }, fN: { a1: 3, a2: 2 }, fF: { a1: -3, a2: -2 } },
    { label: 'Jumping jacks', view: 'front', hip: [120, 90], t: 180, hN: { a1: 158, a2: 170 }, hF: { a1: -158, a2: -170 }, fN: { a1: 17, a2: 15 }, fF: { a1: -17, a2: -15 } },
  ],
  dur: [0.32, 0.32], hold: 0.04,
};
const walkA = { label: 'Walk', hip: [120, 98], t: 177, fN: { a1: 22, a2: 6 }, fF: { a1: -18, a2: -32 }, hN: { a1: -22, a2: -12 }, hF: { a1: 22, a2: 50 } };
const walkB = { label: 'Walk', hip: [120, 96], t: 177, fN: { a1: 0, a2: 0 }, fF: { a1: 12, a2: -38 }, hN: { a1: 0, a2: 6 }, hF: { a1: 0, a2: 6 } };
const swap = (p) => ({ ...p, fN: p.fF, fF: p.fN, hN: p.hF, hF: p.hN });
ANIMS['walk'] = { hl: ['thN', 'thF'], frames: [walkA, walkB, swap(walkA), swap(walkB)], loop: 'cycle', dur: [0.42, 0.42, 0.42, 0.42], hold: 0, ease: 'linear' };

// ------------------------------------------------------------------ playback
const ease = { sine: (x) => 0.5 - Math.cos(Math.PI * x) / 2, linear: (x) => x };
function timeline(def) {
  const n = def.frames.length, hold = def.hold ?? 0.45;
  const order = def.loop === 'cycle' ? [...Array(n).keys(), 0] : [...Array(n).keys(), ...[...Array(n - 1).keys()].reverse()];
  const segs = []; let t = 0;
  for (let i = 0; i < order.length - 1; i++) {
    // concentric (out) a little faster than the controlled return
    const d = (def.dur && def.dur[i]) || (i < n - 1 ? 1.1 : 1.5);
    segs.push({ from: order[i], to: order[i + 1], start: t, dur: d });
    t += d + hold;
  }
  return { segs, total: t, hold };
}
function poseAt(def, tl, time) {
  const tt = time % tl.total;
  let seg = tl.segs[tl.segs.length - 1];
  for (const s of tl.segs) if (tt < s.start + s.dur + tl.hold) { seg = s; break; }
  const x = Math.min(1, Math.max(0, (tt - seg.start) / seg.dur));
  const e = (ease[def.ease] || ease.sine)(x);
  const pose = lerp(def.frames[seg.from], def.frames[seg.to], e);
  pose.label = e < 0.5 ? def.frames[seg.from].label : def.frames[seg.to].label;
  return pose;
}

const reduce = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function mount(el, key) {
  const def = ANIMS[key]; if (!def) return null;
  const tl = timeline(def);
  // Crop empty space above the figure: sample the whole loop for the highest point reached.
  let minY = Infinity;
  for (let i = 0; i <= 40; i++) {
    const J = solve(poseAt(def, tl, (tl.total * i) / 40));
    for (const k of Object.keys(J)) if (Array.isArray(J[k]) && k !== 'fwd') minY = Math.min(minY, J[k][1] - (k === 'head' ? L.head : 0));
  }
  (def.props || []).forEach((p) => { if (p.y != null) minY = Math.min(minY, p.y); });
  const top = Math.max(-10, Math.floor(minY - 22));
  el.innerHTML = `<svg viewBox="0 ${top} 240 ${180 - top}" role="img" aria-label="Animated demonstration"></svg>
    <div class="anim-bar"><span class="anim-label"></span><button type="button" class="anim-toggle"></button></div>`;
  const svg = el.querySelector('svg'), lab = el.querySelector('.anim-label'), btn = el.querySelector('.anim-toggle');
  let playing = !reduce(), t0 = performance.now(), paused = def.frames.length > 1 ? (tl.segs[0].dur + 0.2) : 0, raf = 0;
  const frame = (now) => {
    if (!svg.isConnected) return;
    const time = playing ? (now - t0) / 1000 : paused;
    const pose = poseAt(def, tl, time);
    svg.innerHTML = draw(def, pose);
    lab.textContent = def.caption ? `${def.caption}` : pose.label || '';
    if (playing) raf = requestAnimationFrame(frame);
  };
  const setBtn = () => { btn.textContent = playing ? 'Pause' : 'Play'; };
  btn.addEventListener('click', () => {
    if (playing) { paused = (performance.now() - t0) / 1000; playing = false; cancelAnimationFrame(raf); }
    else { t0 = performance.now() - paused * 1000; playing = true; raf = requestAnimationFrame(frame); }
    setBtn(); frame(performance.now());
  });
  setBtn(); frame(performance.now());
  return { stop: () => cancelAnimationFrame(raf) };
}

function still(key) {
  const def = ANIMS[key];
  return `<svg viewBox="0 -10 240 190" aria-hidden="true">${draw(def, def.frames[Math.min(1, def.frames.length - 1)])}</svg>`;
}
window.ExAnim = { has: (k) => !!ANIMS[k], mount, still, _ANIMS: ANIMS, _solve: solve, _draw: draw, _poseAt: poseAt, _timeline: timeline };
})();
