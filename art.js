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
      const c = { gold: ['#111111', '#111111'], silver: ['#bdbdbd', '#111111'], bronze: ['#ffffff', '#111111'] }[kind] || ['#111111', '#111111'];
      return svg(`<path d="M18 2 h11 l6 16 -9 4z" fill="#fff" stroke="#111" stroke-width="2"/><path d="M46 2 h-11 l-6 16 9 4z" fill="#fff" stroke="#111" stroke-width="2"/>
        <circle cx="32" cy="39" r="21" fill="${c[1]}"/><circle cx="32" cy="39" r="17" fill="${c[0]}"/><path d="M32 30 l2.6 5.4 5.9 .8 -4.3 4.1 1 5.9 -5.2 -2.8 -5.2 2.8 1 -5.9 -4.3 -4.1 5.9 -.8z" fill="${kind === 'gold' ? '#fff' : '#111'}"/>${kind === 'gold' ? sparkle(51, 22, 5) : ''}`, s, `${kind} medal`);
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
  const bStyle = (m, j) => { const k = clamp(m), q = clamp(j); return { w: 11 + k * 11, b: 0.15 + k * 1.05, f: 0.8 + k * 0.35, k, lw: 8 + q * 7, sn: 0.7 + q * 0.45, q }; };
  // Animated poses. Each pose loops between frame A and frame B (SMIL, so it runs on iOS too).
  // Arms: [shoulder, elbow, hand]; legs: [hip, knee, foot]; dy = how far the body moves down in frame B.
  const STAND = { l: [[92, 176], [90, 192], [88, 206]], r: [[128, 176], [130, 192], [132, 206]] };
  const FR = (a, b = a) => [a, b];
  const mirror = (a) => a.map(([x, y]) => [220 - x, y]);
  const POSES = {
    nap: { dur: 3.4, l: FR([[62, 134], [50, 156], [80, 160]]), r: 'mirror' },
    press: { dur: 1.9, bar: true, l: FR([[64, 128], [34, 140], [48, 116]], [[64, 124], [40, 86], [46, 40]]), r: 'mirror' },
    curl: { dur: 1.5, db: true, l: FR([[62, 126], [50, 152], [52, 178]], [[62, 126], [50, 152], [64, 124]]), r: 'mirror' },
    squat: { dur: 2.1, bar: true, behind: true, dy: 16, l: FR([[64, 122], [32, 112], [40, 92]]), r: 'mirror',
      legs: { l: FR(STAND.l, [[92, 192], [62, 196], [84, 206]]), r: FR(STAND.r, [[128, 192], [158, 196], [136, 206]]) } },
    flex: { dur: 1.2, l: FR([[62, 130], [14, 124], [18, 86]], [[62, 128], [10, 116], [24, 80]]), r: 'mirror' },
    victory: { dur: 0.9, l: FR([[66, 118], [40, 86], [28, 54]], [[66, 118], [44, 82], [38, 48]]), r: 'mirror' },
    wave: { dur: 0.8, l: FR([[62, 130], [14, 124], [18, 86]]), r: FR([[158, 122], [190, 104], [198, 70]], [[158, 122], [192, 100], [214, 76]]) },
    run: { dur: 0.6, run: 1, dy: -6, l: FR([[64, 128], [40, 146], [28, 124]], [[64, 128], [46, 156], [30, 164]]), r: FR([[156, 128], [176, 156], [190, 164]], [[156, 128], [180, 146], [192, 124]]),
      legs: { l: FR([[96, 176], [80, 192], [68, 204]], [[96, 170], [106, 190], [116, 204]]), r: FR([[124, 176], [136, 192], [148, 204]], [[124, 170], [114, 190], [104, 204]]) } },
    jumprope: { dur: 0.8, rope: true, dy: -20, l: FR([[64, 130], [46, 150], [36, 150]]), r: 'mirror',
      legs: { l: FR(STAND.l, [[92, 156], [84, 172], [92, 186]]), r: FR(STAND.r, [[128, 156], [136, 172], [128, 186]]) } },
  };
  A.POSES = Object.keys(POSES);
  const pt = (p) => `${p[0]} ${p[1]}`;
  const SPL = 'keyTimes="0;.5;1" calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1" repeatCount="indefinite"';
  const still = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  /** <animate> between two values (nothing if they match or motion is reduced). */
  const anim = (attr, a, b, dur) => (still || a === b ? '' : `<animate attributeName="${attr}" values="${a};${b};${a}" dur="${dur}s" ${SPL}/>`);
  const animT = (type, a, b, dur) => (still || a === b ? '' : `<animateTransform attributeName="transform" type="${type}" values="${a};${b};${a}" dur="${dur}s" ${SPL}/>`);
  const bic = ([S, E, H]) => {
    const mx = (S[0] + E[0]) / 2, my = (S[1] + E[1]) / 2, len = Math.hypot(E[0] - S[0], E[1] - S[1]);
    let ang = (Math.atan2(E[1] - S[1], E[0] - S[0]) * 180) / Math.PI;
    const cross = (E[0] - S[0]) * (H[1] - S[1]) - (E[1] - S[1]) * (H[0] - S[0]);
    const up = Math.abs(cross) < 200 ? (Math.cos((ang * Math.PI) / 180) >= 0 ? 1 : -1) : -Math.sign(cross);
    if (up < 0) ang += 180;
    return { mx, my, ang, hl: len * 0.36 };
  };
  A.buddy = ({ m = 0, j = 0, gold = false, size = 160, pose = 'flex' } = {}) => {
    const st = bStyle(m, j), k = st.k, q = st.q, P0 = POSES[pose] || POSES.flex, D = P0.dur;
    const arms = { l: P0.l, r: P0.r === 'mirror' ? P0.l.map(mirror) : P0.r };
    const legs = P0.legs || { l: FR(STAND.l), r: FR(STAND.r) };
    const d3 = (f) => `M${pt(f[0])} L${pt(f[1])} L${pt(f[2])}`;
    const arm = (side, [A0, B0]) => {
      const a = bic(A0), b = bic(B0);
      let bAng = b.ang; while (bAng - a.ang > 180) bAng -= 360; while (a.ang - bAng > 180) bAng += 360;
      const R = 21, hl = a.hl;
      const path = (cls, stroke, w) => `<path class="${cls}" d="${d3(A0)}" stroke="${stroke}" style="stroke-width:${w}px" fill="none" stroke-linecap="round" stroke-linejoin="round">${anim('d', d3(A0), d3(B0), D)}</path>`;
      return `<g class="bd-armg ${side}">${path('bd-arm o', OUT, st.w + 6.5)}${path('bd-arm', '#fff', st.w)}
        <g transform="translate(${a.mx} ${a.my})">${animT('translate', `${a.mx} ${a.my}`, `${b.mx} ${b.my}`, D)}<g transform="rotate(${a.ang.toFixed(1)})">${animT('rotate', a.ang.toFixed(1), bAng.toFixed(1), D)}
          <g class="bd-bi" style="transform:scale(${st.b})"><path d="M${-hl} 1 A${hl} ${R} 0 0 1 ${hl} 1 Z" fill="#fff"/><path d="M${-hl} 1 A${hl} ${R} 0 0 1 ${hl} 1" stroke="${OUT}" stroke-width="2.6" fill="none" stroke-linecap="round"/></g></g></g>
        <circle class="bd-fist" cx="${A0[2][0]}" cy="${A0[2][1]}" r="10" fill="#fff" stroke="${OUT}" stroke-width="3" style="transform:scale(${st.f})">${anim('cx', A0[2][0], B0[2][0], D)}${anim('cy', A0[2][1], B0[2][1], D)}</circle>
      </g>`;
    };
    const leg = ([A0, B0], dir) => `<g class="bd-leg">
        <path class="bd-lg o" d="${d3(A0)}" stroke="${OUT}" style="stroke-width:${st.lw + 6.5}px" stroke-linecap="round" stroke-linejoin="round" fill="none">${anim('d', d3(A0), d3(B0), D)}</path>
        <path class="bd-lg" d="${d3(A0)}" stroke="#fff" style="stroke-width:${st.lw}px" stroke-linecap="round" stroke-linejoin="round" fill="none">${anim('d', d3(A0), d3(B0), D)}</path>
        <g class="bd-shoe" style="transform:scale(${st.sn});opacity:${q > 0 ? 1 : 0}"><ellipse cx="${A0[2][0] + dir * 5}" cy="${A0[2][1] + 1}" rx="13" ry="6.5" fill="#fff" stroke="${OUT}" stroke-width="3">${anim('cx', A0[2][0] + dir * 5, B0[2][0] + dir * 5, D)}${anim('cy', A0[2][1] + 1, B0[2][1] + 1, D)}</ellipse>
          <path class="bd-wing" d="M0 0 q${-dir * 14} -12 ${-dir * 20} -4 q${dir * 6} 2 ${dir * 4} 6 q${-dir * 8} 0 ${-dir * 12} 4 q${dir * 10} 4 ${dir * 16} 0z" transform="translate(${A0[2][0] - dir * 8} ${A0[2][1] - 2})" fill="#fff" stroke="${OUT}" stroke-width="2" style="opacity:${q >= 1 ? 1 : 0}">${animT('translate', `${A0[2][0] - dir * 8} ${A0[2][1] - 2}`, `${B0[2][0] - dir * 8} ${B0[2][1] - 2}`, D)}</path></g></g>`;
    const run = P0.run || 0, dy = P0.dy || 0;
    const speed = run ? `<g class="bd-speed">${[0, 1, 2].map((i) => `<path d="M${8 - i * 4} ${104 + i * 16} h26" stroke="${INK}" stroke-width="4" stroke-linecap="round" style="opacity:${q > i * 0.4 ? 1 : 0}"/>`).join('')}</g>` : '';
    const happy = Math.max(k, q) >= 1, asleep = Math.max(k, q) <= 0;
    const mouth = `<g class="bd-grin" style="opacity:${happy ? 1 : 0}"><path d="M105 92 q5 5 10 0 z" fill="${INK}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/></g>
      <path class="bd-smile" d="M106 93 q4 3 8 0" stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round" style="opacity:${happy ? 0 : 1}"/>`;
    const band = `<g class="bd-band" style="opacity:${q > 0 ? 1 : 0}"><g clip-path="url(#bd-clip)"><rect x="40" y="66" width="140" height="9" fill="${INK}"/></g><path d="M148 70 l16 -6 M148 72 l15 6" stroke="${INK}" stroke-width="5" stroke-linecap="round"/></g>
      <path class="bd-sweat" d="M150 84 q4 7 0 10 q-4 -3 0 -10z" fill="#fff" stroke="${INK}" stroke-width="1.8" style="opacity:${q >= 0.5 ? 1 : 0}"/>`;
    const crown = gold ? `<path d="M88 70 l-3 -22 14 12 11 -18 11 18 14 -12 -3 22 z" fill="#fff" stroke="${OUT}" stroke-width="3" stroke-linejoin="round" transform="translate(0 -14)"/>` : '';
    // equipment that follows the hands
    const hA = [arms.l[0][2], arms.r[0][2]], hB = [arms.l[1][2], arms.r[1][2]];
    const plate = (x, y) => `<ellipse cx="${x}" cy="${y}" rx="9" ry="22" fill="#fff" stroke="${INK}" stroke-width="3"/><circle cx="${x}" cy="${y}" r="2.4" fill="${INK}"/>`;
    const bar = P0.bar ? `<g>${animT('translate', '0 0', `0 ${hB[0][1] - hA[0][1]}`, D)}<path d="M${hA[0][0] - 16} ${hA[0][1]} H${hA[1][0] + 16}" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>${plate(hA[0][0] - 24, hA[0][1])}${plate(hA[1][0] + 24, hA[1][1])}</g>` : '';
    const db = P0.db ? [0, 1].map((i) => `<g transform="translate(${pt(hA[i])})">${animT('translate', pt(hA[i]), pt(hB[i]), D)}<path d="M-14 0 h28" stroke="${INK}" stroke-width="4" stroke-linecap="round"/><rect x="-20" y="-9" width="8" height="18" rx="3" fill="#fff" stroke="${INK}" stroke-width="2.6"/><rect x="12" y="-9" width="8" height="18" rx="3" fill="#fff" stroke="${INK}" stroke-width="2.6"/></g>`).join('') : '';
    const rope = P0.rope ? `<path d="M36 150 Q110 -80 184 150" stroke="${INK}" stroke-width="2.6" fill="none">${anim('d', 'M36 150 Q110 -80 184 150', 'M36 150 Q110 268 184 150', D)}</path>` : '';
    const wave = pose === 'wave' ? `<path d="M206 52 q6 4 4 12 M214 46 q7 6 4 16" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>` : '';
    return `<svg class="buddy pose-${pose}" width="${size}" height="${size}" viewBox="0 -6 220 220" aria-hidden="true">
      <defs><clipPath id="bd-clip"><path d="${BODY}"/></clipPath></defs>
      <ellipse class="bd-shadow" cx="110" cy="210" rx="62" ry="4" fill="${INK}" opacity=".08"/>
      ${speed}
      <g class="bd-zzz" style="opacity:${asleep ? 1 : 0}"><path d="M156 44 h11 l-11 11 h11 M174 24 h8 l-8 8 h8 M188 8 h6 l-6 6 h6" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>
      ${rope}
      <g class="bd-all">${leg(legs.l, -1)}${leg(legs.r, 1)}
        <g>${animT('translate', '0 0', `0 ${dy}`, D)}
        ${P0.behind ? bar : ''}
        <g class="bd-tail"><path d="M158 172 C196 172 202 132 184 112" stroke="${OUT}" stroke-width="13" fill="none" stroke-linecap="round"/><path d="M158 172 C196 172 202 132 184 112" stroke="#fff" stroke-width="7.5" fill="none" stroke-linecap="round"/></g>
        <path d="${BODY}" fill="#fff" stroke="${OUT}" stroke-width="3.4" stroke-linejoin="round"/>
        ${band}${crown}
        <g class="bd-awake" style="opacity:${!asleep && !happy ? 1 : 0}"><g class="bd-eyes"><circle cx="99" cy="84" r="3.3" fill="${INK}"/><circle cx="121" cy="84" r="3.3" fill="${INK}"/></g></g>
        <g class="bd-strain" style="opacity:${happy ? 1 : 0}"><path d="M94 80 l7 4 -7 4 M126 80 l-7 4 7 4" stroke="${INK}" stroke-width="2.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>
        <g class="bd-sleep" style="opacity:${asleep ? 1 : 0}"><path d="M94 85 h8 M118 85 h8" stroke="${INK}" stroke-width="2.8" stroke-linecap="round"/></g>
        ${mouth}${arm('l', arms.l)}${arm('r', arms.r)}${P0.behind ? '' : bar}${db}${wave}
      </g></g></svg>`;
  };
  const BODY = catD(110, 120, 2.5);
  /** Animate an existing Buddy to new muscle / leg power (CSS transitions do the swelling). */
  A.buddySet = (el, m, j) => {
    if (!el) return; const st = bStyle(m, j);
    const each = (sel, f) => el.querySelectorAll(sel).forEach(f);
    each('.bd-arm', (p) => { p.style.strokeWidth = `${p.classList.contains('o') ? st.w + 6.5 : st.w}px`; });
    each('.bd-bi', (p) => { p.style.transform = `scale(${st.b})`; });
    each('.bd-fist', (p) => { p.style.transform = `scale(${st.f})`; });
    each('.bd-lg', (p) => { p.style.strokeWidth = `${p.classList.contains('o') ? st.lw + 6.5 : st.lw}px`; });
    each('.bd-shoe', (p) => { p.style.transform = `scale(${st.sn})`; });
    each('.bd-wing', (p) => { p.style.opacity = st.q >= 1 ? 1 : 0; });
    each('.bd-speed path', (p, i) => { p.style.opacity = st.q > i * 0.4 ? 1 : 0; });
    const op = (sel, on) => each(sel, (n) => { n.style.opacity = on ? 1 : 0; });
    const hi = Math.max(st.k, st.q);
    op('.bd-awake', hi > 0 && hi < 1); op('.bd-strain', hi >= 1); op('.bd-sleep', hi <= 0); op('.bd-zzz', hi <= 0); op('.bd-grin', hi >= 1); op('.bd-smile', hi < 1); op('.bd-band', st.q > 0); op('.bd-sweat', st.q >= 0.5);
  };
  window.ART = A;
}());
