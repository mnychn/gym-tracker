/* Gym Log — minimal black line drawings on white (inline SVG).
   The mascot is Buddy, a chunky line-drawn gym cat. window.ART.name(size) → SVG string. */
(function () {
  // black line art + white, with pops of pink and yellow
  // monochrome: ink, white, two greys
  const INK = '#111111', BL = 'none', L = '#111111', LD = '#111111', P = '#d4d4d4', PD = '#9a9a9a', M = '#e8e8e8', MD = '#9a9a9a', Y = '#ededed', YD = '#9a9a9a', OUT = '#111111';
  const CR = '#ffffff', FUR = '#ffffff', FUR2 = '#111111';
  /** Fuzzy outline: a squarish blob with little scalloped tufts all round. */
  const fur = (cx, cy, rx, ryT, ryB, n, bump) => {
    const e = (v) => Math.sign(v) * Math.pow(Math.abs(v), 0.78);
    const pts = Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2 - Math.PI / 2, c = Math.cos(a), sn = Math.sin(a); return [cx + rx * e(c), cy + (sn < 0 ? ryT : ryB) * e(sn)]; });
    let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    pts.forEach((a0, i) => {
      const a1 = pts[(i + 1) % n], mx = (a0[0] + a1[0]) / 2, my = (a0[1] + a1[1]) / 2, l = Math.hypot(mx - cx, my - cy) || 1;
      const b = bump * (0.35 + ((i * 7) % 5) / 3.2);
      d += ` Q${(mx + ((mx - cx) / l) * b).toFixed(1)} ${(my + ((my - cy) / l) * b).toFixed(1)} ${a1[0].toFixed(1)} ${a1[1].toFixed(1)}`;
    });
    return `${d} Z`;
  };
  /** Short fur hatch strokes scattered over a body (deterministic), skipping the face. */
  const hatch = (cx, cy, rx, ry, n, len, skip) => {
    let out = '';
    for (let i = 0; i < n; i++) {
      const a = i * 2.39996, r = Math.sqrt((i + 0.5) / n) * 0.86;
      const x = cx + Math.cos(a) * rx * r, y = cy + Math.sin(a) * ry * r;
      if (skip && skip(x, y)) continue;
      const t = ((i * 13) % 7 - 3) * 0.12;
      out += `M${x.toFixed(1)} ${y.toFixed(1)} l${(len * t).toFixed(1)} ${len.toFixed(1)} `;
    }
    return out;
  };
  const face = (x, y, k = 1, mood = 'smile') => {
    const e = 1.3 * k, dx = 4.2 * k; y -= 9 * k;
    const eyes = mood === 'sleep'
      ? `<path d="M${x - dx - 2.2 * k} ${y} q${2.2 * k} ${1.8 * k} ${4.4 * k} 0 M${x + dx - 2.2 * k} ${y} q${2.2 * k} ${1.8 * k} ${4.4 * k} 0" stroke="${INK}" stroke-width="${1.6 * k}" fill="none" stroke-linecap="round"/>`
      : `<circle cx="${x - dx}" cy="${y}" r="${e}" fill="${INK}"/><circle cx="${x + dx}" cy="${y}" r="${e}" fill="${INK}"/><circle cx="${x - dx + 0.8 * k}" cy="${y - 0.9 * k}" r="${0.8 * k}" fill="${CR}"/><circle cx="${x + dx + 0.8 * k}" cy="${y - 0.9 * k}" r="${0.8 * k}" fill="${CR}"/>`;
    const mouth = mood === 'open'
      ? `<ellipse cx="${x}" cy="${y + 4.6 * k}" rx="${2.4 * k}" ry="${2 * k}" fill="${INK}"/>`
      : `<path d="M${x - 1.6 * k} ${y + 2.6 * k} q${1.6 * k} ${1.2 * k} ${3.2 * k} 0" stroke="${INK}" stroke-width="${1.1 * k}" fill="none" stroke-linecap="round"/>`;
    return `${eyes}<ellipse cx="${x - 10 * k}" cy="${y + 4 * k}" rx="${3.2 * k}" ry="${2 * k}" fill="${BL}" opacity=".85"/><ellipse cx="${x + 10 * k}" cy="${y + 4 * k}" rx="${3.2 * k}" ry="${2 * k}" fill="${BL}" opacity=".85"/>${mouth}`;
  };
  // Buddy's silhouette: a chunky pear-shaped cat, ears drawn into the outline (Buddy coordinates, 220×206 box)
  const CAT = [['M', 72, 98], ['C', 68, 78, 70, 62, 76, 44], ['L', 96, 60], ['C', 104, 57, 116, 57, 124, 60], ['L', 144, 44], ['C', 150, 62, 152, 78, 148, 98],
    ['C', 168, 112, 176, 138, 172, 160], ['C', 168, 180, 140, 186, 110, 186], ['C', 80, 186, 52, 180, 48, 160], ['C', 44, 138, 52, 112, 72, 98]];
  const catD = (cx, cy, s) => CAT.map(([c, ...n]) => c + n.map((v, i) => (i % 2 ? cy + ((v - 120) * s) / 2.5 : cx + ((v - 110) * s) / 2.5).toFixed(1)).join(' ')).join(' ') + ' Z';
  const horn = () => '';
  const blob = (cx = 32, cy = 40, s = 1) => `<path d="M${cx + 16 * s} ${cy + 18 * s} q${9 * s} ${-1 * s} ${8 * s} ${-12 * s}" stroke="${OUT}" stroke-width="2" fill="none" stroke-linecap="round"/><path d="${catD(cx, cy - 2 * s, s)}" fill="#fff" stroke="${OUT}" stroke-width="2" stroke-linejoin="round"/>`;
  const arm = (d) => `<path d="${d}" stroke="${OUT}" stroke-width="6.5" stroke-linecap="round" fill="none"/><path d="${d}" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none"/>`;
  const sparkle = (x, y, r, c = '#fff') => `<path d="M${x} ${y - r} L${x + r * 0.28} ${y - r * 0.28} L${x + r} ${y} L${x + r * 0.28} ${y + r * 0.28} L${x} ${y + r} L${x - r * 0.28} ${y + r * 0.28} L${x - r} ${y} L${x - r * 0.28} ${y - r * 0.28} Z" fill="${c}"/>`;
  const svg = (inner, size, label) => `<svg class="art" width="${size}" height="${size}" viewBox="0 0 64 64" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"'}>${inner}</svg>`;

  const A = {
    lift: (s = 40) => svg(`${arm('M19 36 L15 14')}${arm('M45 36 L49 14')}
      <rect x="9" y="10" width="46" height="4.5" rx="2.2" fill="${LD}"/><rect x="3" y="5" width="8" height="15" rx="3.5" fill="${L}"/><rect x="53" y="5" width="8" height="15" rx="3.5" fill="${L}"/>
      ${blob(32, 42, 0.86)}${face(32, 43, 0.85)}`, s),
    jog: (s = 40) => svg(`<path d="M3 30h9M5 37h8M3 44h7" stroke="${L}" stroke-width="3" stroke-linecap="round"/>
      ${blob(35, 36, 0.86)}<rect x="17" y="21" width="36" height="5.5" rx="2.7" fill="${P}"/><path d="M52 23 l7 -4 M52 25 l7 3" stroke="${P}" stroke-width="3" stroke-linecap="round"/>
      <ellipse cx="27" cy="53" rx="7" ry="4" fill="${P}"/><ellipse cx="44" cy="53" rx="7" ry="4" fill="${PD}"/>${face(35, 37, 0.85)}`, s),
    dance: (s = 40) => svg(`<path d="M50 6v14" stroke="${LD}" stroke-width="3" stroke-linecap="round"/><ellipse cx="46.5" cy="20.5" rx="4.5" ry="3.5" fill="${LD}"/><path d="M50 6l7 3" stroke="${LD}" stroke-width="3" stroke-linecap="round"/>
      ${arm('M12 38 L5 26')}${arm('M50 40 L58 36')}${blob(31, 40, 0.84)}<path d="M23 18 l-6 -6 0 9z M23 18 l6 -6 0 9z" fill="${P}"/><circle cx="23" cy="16.5" r="2.4" fill="${PD}"/>${face(31, 41, 0.85)}`, s),
    watch: (s = 40) => svg(`<rect x="22" y="2" width="20" height="14" rx="5" fill="${L}"/><rect x="22" y="48" width="20" height="14" rx="5" fill="${L}"/>
      <rect x="11" y="11" width="42" height="42" rx="13" fill="${INK}"/><rect x="15" y="15" width="34" height="34" rx="10" fill="${CR}"/><rect x="53" y="26" width="4" height="10" rx="2" fill="${LD}"/>${face(32, 30, 0.9)}`, s),
    calendar: (s = 40) => svg(`<rect x="6" y="10" width="52" height="48" rx="13" fill="${CR}" stroke="${OUT}" stroke-width="2"/><path d="M6 23 V22 a12 12 0 0 1 12 -12 h28 a12 12 0 0 1 12 12 v1z" fill="${L}"/>
      <rect x="18" y="4" width="5" height="12" rx="2.5" fill="${LD}"/><rect x="41" y="4" width="5" height="12" rx="2.5" fill="${LD}"/>
      <path d="M32 51 s-10 -6 -10 -12.5 a5.2 5.2 0 0 1 10 -2.2 a5.2 5.2 0 0 1 10 2.2 c0 6.5 -10 12.5 -10 12.5z" fill="${P}"/>`, s),
    scan: (s = 40) => svg(`<rect x="13" y="3" width="38" height="58" rx="11" fill="${L}"/><rect x="17" y="9" width="30" height="46" rx="7" fill="${CR}"/>
      <rect x="22" y="38" width="5" height="10" rx="2.5" fill="${P}"/><rect x="29.5" y="32" width="5" height="16" rx="2.5" fill="${M}"/><rect x="37" y="35" width="5" height="13" rx="2.5" fill="${LD}"/>${face(32, 19, 0.75)}`, s),
    medal: (kind = 'gold', s = 40) => {
      const c = { gold: ['#f9c23c', '#e0950a'], silver: ['#e6e8f0', '#a9b0c3'], bronze: ['#f5b07d', '#cf7f45'] }[kind] || ['#f9c23c', '#e0950a'];
      return svg(`<path d="M18 2 h11 l6 16 -9 4z" fill="#8b63f2"/><path d="M46 2 h-11 l-6 16 9 4z" fill="#f2557a"/>
        <circle cx="32" cy="39" r="21" fill="${c[1]}"/><circle cx="32" cy="39" r="17" fill="${c[0]}"/><path d="M32 30 l2.6 5.4 5.9 .8 -4.3 4.1 1 5.9 -5.2 -2.8 -5.2 2.8 1 -5.9 -4.3 -4.1 5.9 -.8z" fill="#fff"/>${kind === 'gold' ? sparkle(51, 22, 5) : ''}`, s, `${kind} medal`);
    },
    noMedal: (s = 40) => svg(`<circle cx="32" cy="36" r="20" fill="none" stroke="${OUT}" stroke-width="3" stroke-dasharray="5 5"/>${face(32, 34, 0.8, 'sleep')}`, s, 'no medal'),
    flame: (s = 40) => svg(`<path d="M32 3 C36 14 52 20 52 38 C52 51 43 60 32 60 C21 60 12 51 12 38 C12 27 19 22 22 14 C25 22 28 24 30 24 C30 16 29 9 32 3 Z" fill="${PD}"/>
      <path d="M32 22 C36 30 45 33 45 44 C45 52 39 57 32 57 C25 57 19 52 19 44 C19 37 24 34 27 29 C29 33 30 34 32 22 Z" fill="${Y}"/>${face(32, 44, 0.75)}`, s),
    star: (s = 40) => svg(`<path d="M32 4 C34 4 35 5 36 7 L41 18 L53 19.5 C57 20 58 23 55.5 25.5 L46.5 34 L49 46 C49.8 50 47 52 43.5 50 L32 44 L20.5 50 C17 52 14.2 50 15 46 L17.5 34 L8.5 25.5 C6 23 7 20 11 19.5 L23 18 L28 7 C29 5 30 4 32 4 Z" fill="${Y}" stroke="${YD}" stroke-width="2" stroke-linejoin="round"/>${face(32, 28, 0.8)}`, s),
    target: (s = 40) => svg(`<circle cx="30" cy="34" r="25" fill="${P}"/><circle cx="30" cy="34" r="18" fill="${CR}"/><circle cx="30" cy="34" r="11" fill="${P}"/>
      <path d="M30 34 L54 10" stroke="${LD}" stroke-width="3.5" stroke-linecap="round"/><path d="M50 6 l8 0 0 8 -6 -2z" fill="${L}"/>${face(30, 32, 0.6)}`, s),
    pie: (s = 40) => svg(`<circle cx="32" cy="32" r="26" fill="#9a9a9a"/><path d="M32 32 L32 6 A26 26 0 0 1 56.7 40 Z" fill="#d4d4d4"/><path d="M32 32 L56.7 40 A26 26 0 0 1 40 56.7 Z" fill="#ededed"/>
      <circle cx="32" cy="32" r="15" fill="${CR}"/>${face(32, 30, 0.7)}`, s),
    flex: (s = 40) => svg(`${arm('M47 46 L56 36')}${blob(29, 40, 0.84)}
      <rect x="53.5" y="20" width="4.5" height="20" rx="2.2" fill="${LD}"/><rect x="49" y="15" width="13.5" height="7" rx="3.5" fill="${L}"/><rect x="49" y="38" width="13.5" height="7" rx="3.5" fill="${L}"/>
      <rect x="11" y="19" width="36" height="5.5" rx="2.7" fill="${M}"/>${sparkle(10, 10, 5, Y)}${face(29, 41, 0.85)}`, s),
    heart: (s = 40) => svg(`<path d="M32 57 C32 57 6 42 6 23 C6 13 13 7 21 7 C26 7 30 10 32 14 C34 10 38 7 43 7 C51 7 58 13 58 23 C58 42 32 57 32 57 Z" fill="#e2e2e2"/>
      <ellipse cx="19" cy="18" rx="5" ry="3" fill="${CR}" opacity=".55" transform="rotate(-30 19 18)"/>${face(32, 28, 0.85)}`, s),
    scale: (s = 40) => svg(`<rect x="6" y="14" width="52" height="44" rx="15" fill="${L}"/><circle cx="32" cy="33" r="15" fill="${CR}"/><path d="M32 33 L39 25" stroke="${PD}" stroke-width="3" stroke-linecap="round"/>
      ${face(32, 38, 0.6)}<rect x="12" y="52" width="10" height="5" rx="2.5" fill="${LD}"/><rect x="42" y="52" width="10" height="5" rx="2.5" fill="${LD}"/>`, s),
    drop: (s = 40) => svg(`<path d="M32 4 C40 18 52 28 52 41 C52 52 43 60 32 60 C21 60 12 52 12 41 C12 28 24 18 32 4 Z" fill="${Y}"/><ellipse cx="23" cy="36" rx="3" ry="6" fill="${CR}" opacity=".6"/>${face(32, 40, 0.85)}`, s),
    sprout: (s = 40) => svg(`<path d="M32 30 C32 22 30 16 32 10" stroke="${MD}" stroke-width="3" stroke-linecap="round" fill="none"/>
      <path d="M32 16 C24 4 10 10 12 16 C18 22 28 20 32 16 Z" fill="${M}"/><path d="M32 14 C40 2 54 8 52 14 C46 20 36 18 32 14 Z" fill="${MD}"/>
      <path d="M12 30 h40 l-5 26 a6 6 0 0 1 -6 5 h-18 a6 6 0 0 1 -6 -5z" fill="${P}"/>${face(32, 42, 0.75)}`, s),
    chart: (s = 40) => svg(`<rect x="4" y="8" width="56" height="48" rx="14" fill="${CR}" stroke="${OUT}" stroke-width="2"/>
      <path d="M13 44 L24 34 L33 39 L49 20" stroke="${LD}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/><circle cx="49" cy="20" r="5" fill="${P}"/>${sparkle(52, 9, 5, Y)}`, s),
    tape: (s = 40) => svg(`<path d="M44 44 h16 v10 h-16z" fill="${Y}"/><path d="M48 44v4M52 44v6M56 44v4" stroke="${YD}" stroke-width="1.5"/>
      <circle cx="28" cy="34" r="24" fill="${M}"/><circle cx="28" cy="34" r="18" fill="${CR}"/>${face(28, 32, 0.8)}`, s),
    avocado: (s = 40) => svg(`<path d="M32 3 C42 3 46 14 50 24 C55 36 54 60 32 60 C10 60 9 36 14 24 C18 14 22 3 32 3 Z" fill="#111111"/>
      <path d="M32 9 C40 9 43 18 46 26 C50 36 49 55 32 55 C15 55 14 36 18 26 C21 18 24 9 32 9 Z" fill="#f2f2f2"/><circle cx="32" cy="41" r="9" fill="#9a9a9a"/>${face(32, 24, 0.75)}`, s),
    trophy: (s = 40) => svg(`<path d="M16 10 C6 10 6 26 18 28" stroke="${YD}" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M48 10 C58 10 58 26 46 28" stroke="${YD}" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M14 6 h36 v14 c0 12 -8 20 -18 20 s-18 -8 -18 -20z" fill="${Y}"/><rect x="28" y="38" width="8" height="10" fill="${YD}"/><rect x="18" y="48" width="28" height="10" rx="4" fill="${L}"/>
      ${face(32, 19, 0.85)}${sparkle(55, 40, 5, Y)}${sparkle(8, 40, 4, Y)}`, s),
    flag: (s = 40) => svg(`<rect x="12" y="4" width="4" height="58" rx="2" fill="${INK}"/><path d="M16 7 h34 l-6 11 6 11 h-34z" fill="${P}"/>
      <path d="M16 7h8v7h-8zM32 7h8v7h-8zM24 14h8v8h-8zM40 14h6l-2 4 2 4h-6zM16 22h8v7h-8zM32 22h8v7h-8z" fill="${CR}" opacity=".9"/>`, s),
    wave: (s = 40) => svg(`${arm('M50 34 L58 18')}${blob(30, 40, 0.84)}${face(30, 41, 0.85)}<path d="M57 9 q4 3 3 8 M61 7 q4 4 2 10" stroke="${L}" stroke-width="2" fill="none" stroke-linecap="round"/>`, s),
  };

  /* Buddy — the big mascot.
     m = muscle power (this week's lifts / goal), j = leg power (this week's jog minutes / goal); 0 … 1 … 1.25.
     Arms thicken + biceps bulge with m; legs, sneakers, headband, sweat and speed lines grow with j; gold adds a crown. */
  const clamp = (v) => Math.max(0, Math.min(1.25, v || 0));
  const bStyle = (m, j) => { const k = clamp(m), q = clamp(j); return { k, q }; };
  // Animated poses. Each pose loops between frame A and frame B (SMIL, so it runs on iOS too).
  // Arms: [shoulder, elbow, paw]; legs: [hip, knee, foot]; dy = how far the body moves in frame B.
  const STAND = { l: [[90, 170], [88, 188], [86, 202]], r: [[130, 170], [132, 188], [134, 202]] };
  const FR = (a, b = a) => [a, b];
  const mirror = (a) => a.map(([x, y]) => [220 - x, y]);
  const POSES = {
    nap: { dur: 3.4, l: FR([[76, 136], [50, 158], [52, 176]]), r: 'mirror' },
    press: { dur: 1.9, bar: true, l: FR([[76, 124], [30, 140], [40, 112]], [[76, 124], [38, 84], [44, 40]]), r: 'mirror' },
    curl: { dur: 1.5, db: true, l: FR([[76, 128], [40, 154], [38, 180]], [[76, 128], [36, 152], [40, 120]]), r: 'mirror' },
    squat: { dur: 2.1, bar: true, behind: true, dy: 16, l: FR([[76, 120], [30, 112], [38, 90]]), r: 'mirror',
      legs: { l: FR(STAND.l, [[90, 186], [64, 192], [82, 202]]), r: FR(STAND.r, [[130, 186], [156, 192], [138, 202]]) } },
    flex: { dur: 1.2, l: FR([[76, 128], [16, 122], [20, 84]], [[76, 126], [12, 114], [26, 78]]), r: 'mirror' },
    victory: { dur: 0.9, l: FR([[76, 116], [40, 84], [30, 50]], [[76, 116], [44, 80], [40, 46]]), r: 'mirror' },
    wave: { dur: 0.8, l: FR([[76, 132], [40, 156], [40, 178]]), r: FR([[144, 120], [190, 102], [198, 66]], [[144, 120], [192, 98], [214, 72]]) },
    run: { dur: 0.6, run: 1, dy: -6, l: FR([[76, 128], [36, 144], [28, 122]], [[76, 128], [42, 156], [30, 168]]), r: FR([[144, 128], [178, 156], [190, 168]], [[144, 128], [184, 144], [192, 122]]),
      legs: { l: FR([[96, 170], [80, 188], [68, 200]], [[96, 166], [106, 186], [116, 200]]), r: FR([[124, 170], [136, 188], [150, 200]], [[124, 166], [114, 186], [104, 200]]) } },
    jumprope: { dur: 0.8, rope: true, dy: -20, l: FR([[76, 132], [40, 150], [32, 150]]), r: 'mirror',
      legs: { l: FR(STAND.l, [[90, 150], [84, 166], [90, 180]]), r: FR(STAND.r, [[130, 150], [136, 166], [130, 180]]) } },
  };
  A.POSES = Object.keys(POSES);
  const pt = (p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
  const SPL = 'keyTimes="0;.5;1" calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1" repeatCount="indefinite"';
  const still = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  /** <animate> between two values (nothing if they match or motion is reduced). */
  const anim = (attr, a, b, dur) => (still || a === b ? '' : `<animate attributeName="${attr}" values="${a};${b};${a}" dur="${dur}s" ${SPL}/>`);
  const animT = (type, a, b, dur) => (still || a === b ? '' : `<animateTransform attributeName="transform" type="${type}" values="${a};${b};${a}" dur="${dur}s" ${SPL}/>`);
  /** Tapered limb segment a→b (width wa → wb) as a closed quad. */
  const seg = (a, b, wa, wb) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
    return `M${pt([a[0] + nx * wa / 2, a[1] + ny * wa / 2])} L${pt([b[0] + nx * wb / 2, b[1] + ny * wb / 2])} L${pt([b[0] - nx * wb / 2, b[1] - ny * wb / 2])} L${pt([a[0] - nx * wa / 2, a[1] - ny * wa / 2])} Z`;
  };
  /** Bicep bulge on the upper arm, on the inside of the elbow bend (or upward when the arm is straight). */
  const bic = ([S, E, H], wS, wE) => {
    const mx = (S[0] + E[0]) / 2, my = (S[1] + E[1]) / 2, len = Math.hypot(E[0] - S[0], E[1] - S[1]);
    let ang = (Math.atan2(E[1] - S[1], E[0] - S[0]) * 180) / Math.PI;
    const cross = (E[0] - S[0]) * (H[1] - S[1]) - (E[1] - S[1]) * (H[0] - S[0]);
    const up = Math.abs(cross) < 200 ? (Math.cos((ang * Math.PI) / 180) >= 0 ? 1 : -1) : -Math.sign(cross);
    if (up < 0) ang += 180;
    return { mx, my, ang, rx: len * 0.34, off: (wS + wE) / 4 * 0.55 };
  };
  // Buddy: the user's own animated gym-cat loops (mascot/*.webp, transparent background). Old pose names map onto them.
  const MASCOT = { treadmill: 'treadmill-run', press: 'overhead-press', curl: 'dumbbell-curl', row: 'cable-row', jumprope: 'jump-rope',
    boxing: 'punching-bag', bench: 'bench-press', legpress: 'leg-press', water: 'water-break', nap: 'sleeping' };
  const ALIAS = { run: 'treadmill', squat: 'legpress', flex: 'curl', victory: 'boxing', wave: 'water' };
  A.POSES = Object.keys(MASCOT);
  A.buddy = ({ gold = false, size = 160, pose = 'curl' } = {}) => {
    const name = MASCOT[pose] ? pose : ALIAS[pose] || 'curl';
    return `<img class="buddy pose-${name}" data-pose="${name}" data-gold="${gold ? 1 : ''}" src="mascot/${MASCOT[name]}.webp" width="${size}" height="${size}" alt="" draggable="false">`;
  };
  /** Swap Buddy for its new state and give it a little "pump" bounce. */
  A.buddySet = (el) => {
    if (!el || !el.parentNode) return;
    el.classList.remove('bd-pump'); void el.offsetWidth; el.classList.add('bd-pump');
  };
  window.ART = A;
}());
