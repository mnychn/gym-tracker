/* Gym Log — little hand-made illustrations (inline SVG), in the style of the app icon:
   soft white blob characters, lavender / peach / mint, rosy cheeks. window.ART.name(size) → SVG string. */
(function () {
  // retro mid-century palette: navy ink, cream, mustard, burnt orange, teal, sage
  const INK = '#1d2b4a', BL = '#ef7a5a', L = '#2f8f8c', LD = '#1f6766', P = '#e8693f', PD = '#c94a2c', M = '#8db36b', MD = '#5f8a45', Y = '#f2b63c', YD = '#cf8f16', OUT = '#1d2b4a';
  const CR = '#f7eedb', FUR = '#f2b63c', FUR2 = '#f9d98f';
  /** Fuzzy outline: a squarish blob with little scalloped tufts all round. */
  const fur = (cx, cy, rx, ryT, ryB, n, bump) => {
    const e = (v) => Math.sign(v) * Math.pow(Math.abs(v), 0.78);
    const pts = Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2 - Math.PI / 2, c = Math.cos(a), sn = Math.sin(a); return [cx + rx * e(c), cy + (sn < 0 ? ryT : ryB) * e(sn)]; });
    let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    pts.forEach((a0, i) => {
      const a1 = pts[(i + 1) % n], mx = (a0[0] + a1[0]) / 2, my = (a0[1] + a1[1]) / 2, l = Math.hypot(mx - cx, my - cy) || 1;
      d += ` Q${(mx + ((mx - cx) / l) * bump).toFixed(1)} ${(my + ((my - cy) / l) * bump).toFixed(1)} ${a1[0].toFixed(1)} ${a1[1].toFixed(1)}`;
    });
    return `${d} Z`;
  };
  const face = (x, y, k = 1, mood = 'smile') => {
    const e = 2.3 * k, dx = 5.5 * k;
    const eyes = mood === 'sleep'
      ? `<path d="M${x - dx - 2.2 * k} ${y} q${2.2 * k} ${1.8 * k} ${4.4 * k} 0 M${x + dx - 2.2 * k} ${y} q${2.2 * k} ${1.8 * k} ${4.4 * k} 0" stroke="${INK}" stroke-width="${1.6 * k}" fill="none" stroke-linecap="round"/>`
      : `<circle cx="${x - dx}" cy="${y}" r="${e}" fill="${INK}"/><circle cx="${x + dx}" cy="${y}" r="${e}" fill="${INK}"/><circle cx="${x - dx + 0.8 * k}" cy="${y - 0.9 * k}" r="${0.8 * k}" fill="${CR}"/><circle cx="${x + dx + 0.8 * k}" cy="${y - 0.9 * k}" r="${0.8 * k}" fill="${CR}"/>`;
    const mouth = mood === 'open'
      ? `<ellipse cx="${x}" cy="${y + 4.6 * k}" rx="${2.4 * k}" ry="${2 * k}" fill="${INK}"/>`
      : `<path d="M${x - 3 * k} ${y + 3.6 * k} Q${x} ${y + 6.6 * k} ${x + 3 * k} ${y + 3.6 * k}" stroke="${INK}" stroke-width="${1.7 * k}" fill="none" stroke-linecap="round"/>`;
    return `${eyes}<ellipse cx="${x - 10 * k}" cy="${y + 4 * k}" rx="${3.2 * k}" ry="${2 * k}" fill="${BL}" opacity=".85"/><ellipse cx="${x + 10 * k}" cy="${y + 4 * k}" rx="${3.2 * k}" ry="${2 * k}" fill="${BL}" opacity=".85"/>${mouth}`;
  };
  const horn = (x, y, s, dir) => `<path d="M${x - 4.5 * s} ${y + 4 * s} C${x - 5 * s + dir * 1.5 * s} ${y - 7 * s} ${x + 5 * s + dir * 1.5 * s} ${y - 7 * s} ${x + 4.5 * s} ${y + 4 * s} Z" fill="${P}" stroke="${OUT}" stroke-width="${Math.min(3, 1.6 * Math.max(0.8, s))}" stroke-linejoin="round"/>
    <ellipse cx="${x + dir * 0.6 * s}" cy="${y - 2.6 * s}" rx="${1.6 * s}" ry="${1 * s}" fill="${CR}" opacity=".7"/>`;
  const blob = (cx = 32, cy = 40, s = 1) => `${horn(cx - 11 * s, cy - 23 * s, s, -1)}${horn(cx + 11 * s, cy - 23 * s, s, 1)}<path d="${fur(cx, cy, 24 * s, 24 * s, 17 * s, 20, 1.6 * s)}" fill="${FUR}" stroke="${OUT}" stroke-width="2" stroke-linejoin="round"/>`;
  const arm = (d) => `<path d="${d}" stroke="${OUT}" stroke-width="7" stroke-linecap="round" fill="none"/><path d="${d}" stroke="${FUR}" stroke-width="4" stroke-linecap="round" fill="none"/>`;
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
      const c = { gold: [Y, YD], silver: ['#e3e6ef', '#aeb5c6'], bronze: ['#f5b07d', '#cf7f45'] }[kind] || [Y, YD];
      return svg(`<path d="M18 2 h11 l6 16 -9 4z" fill="${L}"/><path d="M46 2 h-11 l-6 16 9 4z" fill="${P}"/>
        <circle cx="32" cy="39" r="21" fill="${c[1]}"/><circle cx="32" cy="39" r="17" fill="${c[0]}"/>${face(32, 37, 0.85)}${kind === 'gold' ? sparkle(51, 22, 5) : ''}`, s, `${kind} medal`);
    },
    noMedal: (s = 40) => svg(`<circle cx="32" cy="36" r="20" fill="none" stroke="${OUT}" stroke-width="3" stroke-dasharray="5 5"/>${face(32, 34, 0.8, 'sleep')}`, s, 'no medal'),
    flame: (s = 40) => svg(`<path d="M32 3 C36 14 52 20 52 38 C52 51 43 60 32 60 C21 60 12 51 12 38 C12 27 19 22 22 14 C25 22 28 24 30 24 C30 16 29 9 32 3 Z" fill="${PD}"/>
      <path d="M32 22 C36 30 45 33 45 44 C45 52 39 57 32 57 C25 57 19 52 19 44 C19 37 24 34 27 29 C29 33 30 34 32 22 Z" fill="${Y}"/>${face(32, 44, 0.75)}`, s),
    star: (s = 40) => svg(`<path d="M32 4 C34 4 35 5 36 7 L41 18 L53 19.5 C57 20 58 23 55.5 25.5 L46.5 34 L49 46 C49.8 50 47 52 43.5 50 L32 44 L20.5 50 C17 52 14.2 50 15 46 L17.5 34 L8.5 25.5 C6 23 7 20 11 19.5 L23 18 L28 7 C29 5 30 4 32 4 Z" fill="${Y}" stroke="${YD}" stroke-width="2" stroke-linejoin="round"/>${face(32, 28, 0.8)}`, s),
    target: (s = 40) => svg(`<circle cx="30" cy="34" r="25" fill="${P}"/><circle cx="30" cy="34" r="18" fill="${CR}"/><circle cx="30" cy="34" r="11" fill="${P}"/>
      <path d="M30 34 L54 10" stroke="${LD}" stroke-width="3.5" stroke-linecap="round"/><path d="M50 6 l8 0 0 8 -6 -2z" fill="${L}"/>${face(30, 32, 0.6)}`, s),
    pie: (s = 40) => svg(`<circle cx="32" cy="32" r="26" fill="#2a78d6"/><path d="M32 32 L32 6 A26 26 0 0 1 56.7 40 Z" fill="#1baf7a"/><path d="M32 32 L56.7 40 A26 26 0 0 1 40 56.7 Z" fill="#eb6834"/>
      <circle cx="32" cy="32" r="15" fill="${CR}"/>${face(32, 30, 0.7)}`, s),
    flex: (s = 40) => svg(`${arm('M47 46 L56 36')}${blob(29, 40, 0.84)}
      <rect x="53.5" y="20" width="4.5" height="20" rx="2.2" fill="${LD}"/><rect x="49" y="15" width="13.5" height="7" rx="3.5" fill="${L}"/><rect x="49" y="38" width="13.5" height="7" rx="3.5" fill="${L}"/>
      <rect x="11" y="19" width="36" height="5.5" rx="2.7" fill="${M}"/>${sparkle(10, 10, 5, Y)}${face(29, 41, 0.85)}`, s),
    heart: (s = 40) => svg(`<path d="M32 57 C32 57 6 42 6 23 C6 13 13 7 21 7 C26 7 30 10 32 14 C34 10 38 7 43 7 C51 7 58 13 58 23 C58 42 32 57 32 57 Z" fill="#ff8fa3"/>
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
    avocado: (s = 40) => svg(`<path d="M32 3 C42 3 46 14 50 24 C55 36 54 60 32 60 C10 60 9 36 14 24 C18 14 22 3 32 3 Z" fill="#5c9e3c"/>
      <path d="M32 9 C40 9 43 18 46 26 C50 36 49 55 32 55 C15 55 14 36 18 26 C21 18 24 9 32 9 Z" fill="#d6ef8f"/><circle cx="32" cy="41" r="9" fill="#a8693c"/>${face(32, 24, 0.75)}`, s),
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
  // [shoulder, elbow, hand] per arm; x mirrored for the right arm when given as 'mirror'
  const POSES = {
    flex: { l: [[62, 130], [14, 124], [18, 86]], r: 'mirror' },
    flexOne: { l: [[62, 130], [14, 124], [18, 86]], r: [[160, 136], [186, 152], [166, 164]] },
    victory: { l: [[66, 118], [40, 86], [28, 54]], r: 'mirror' },
    lift: { l: [[66, 116], [34, 92], [52, 58]], r: 'mirror', bar: true },
    wave: { l: [[62, 130], [14, 124], [18, 86]], r: [[158, 122], [190, 104], [200, 70]], wave: true },
    run: { l: [[64, 128], [40, 150], [22, 128]], r: [[156, 126], [186, 118], [200, 142]], run: 1 },
    run2: { l: [[64, 126], [34, 118], [20, 142]], r: [[156, 128], [180, 150], [198, 128]], run: -1 },
  };
  A.POSES = Object.keys(POSES);
  const pt = (p) => `${p[0]} ${p[1]}`;
  A.buddy = ({ m = 0, j = 0, gold = false, size = 160, pose = 'flex' } = {}) => {
    const st = bStyle(m, j), k = st.k, q = st.q, P0 = POSES[pose] || POSES.flex;
    const mir = (a) => a.map(([x, y]) => [220 - x, y]);
    const arms = { l: P0.l, r: P0.r === 'mirror' ? mir(P0.l) : P0.r };
    const arm = (side, [S, E, H]) => {
      const d = `M${pt(S)} L${pt(E)} L${pt(H)}`;
      // biceps: a half-ellipse on the upper arm, on the side the hand is (or upward for straight arms)
      const mx = (S[0] + E[0]) / 2, my = (S[1] + E[1]) / 2, len = Math.hypot(E[0] - S[0], E[1] - S[1]);
      let ang = (Math.atan2(E[1] - S[1], E[0] - S[0]) * 180) / Math.PI;
      const cross = (E[0] - S[0]) * (H[1] - S[1]) - (E[1] - S[1]) * (H[0] - S[0]);
      const up = Math.abs(cross) < 200 ? (Math.cos((ang * Math.PI) / 180) >= 0 ? 1 : -1) : -Math.sign(cross); // +1 = bulge on the local "top"
      if (up < 0) ang += 180;
      const hl = len * 0.36, R = 21;
      return `<g class="bd-armg ${side}">
        <path class="bd-arm o" d="${d}" stroke="${OUT}" style="stroke-width:${st.w + 4}px" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <path class="bd-arm" d="${d}" stroke="${FUR}" style="stroke-width:${st.w}px" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <g transform="translate(${mx} ${my}) rotate(${ang.toFixed(1)})"><g class="bd-bi" style="transform:scale(${st.b})">
          <path d="M${-hl} 1 A${hl} ${R} 0 0 1 ${hl} 1 Z" fill="${FUR}"/><path d="M${-hl} 1 A${hl} ${R} 0 0 1 ${hl} 1" stroke="${OUT}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
          <path d="M${-hl * 0.2} -12 q4 -3 8 -1" stroke="${OUT}" stroke-width="2" fill="none" stroke-linecap="round" opacity=".8"/></g></g>
        <circle class="bd-fist" cx="${H[0]}" cy="${H[1]}" r="11" fill="${FUR}" stroke="${OUT}" stroke-width="2.5" style="transform:scale(${st.f})"/>
      </g>`;
    };
    // legs: standing, or mid-stride when running
    const run = P0.run || 0;
    const legs = run
      ? [[[96, 164], [run > 0 ? 70 : 150, 180], run > 0 ? -1 : 1], [[124, 164], [run > 0 ? 150 : 70, 186], run > 0 ? 1 : -1]]
      : [[[94, 164], [86, 188], -1], [[126, 164], [134, 188], 1]];
    const legSvg = legs.map(([h, f, dir]) => `<g class="bd-leg">
        <path class="bd-lg o" d="M${pt(h)} L${pt(f)}" stroke="${OUT}" style="stroke-width:${st.lw + 4}px" stroke-linecap="round"/>
        <path class="bd-lg" d="M${pt(h)} L${pt(f)}" stroke="${FUR}" style="stroke-width:${st.lw}px" stroke-linecap="round"/>
        <g class="bd-shoe" style="transform:scale(${st.sn})"><ellipse cx="${f[0] + dir * 6}" cy="${f[1] + 2}" rx="15" ry="8.5" fill="${dir < 0 ? L : LD}" stroke="${OUT}" stroke-width="2"/>
          <path d="M${f[0] + dir * 6 - 9} ${f[1] + 6} h18" stroke="${CR}" stroke-width="2.5" stroke-linecap="round"/>
          <path class="bd-wing" d="M${f[0] - dir * 8} ${f[1] - 2} q${-dir * 14} -12 ${-dir * 20} -4 q${dir * 6} 2 ${dir * 4} 6 q${-dir * 8} 0 ${-dir * 12} 4 q${dir * 10} 4 ${dir * 16} 0z" fill="${CR}" stroke="${OUT}" stroke-width="2" style="opacity:${q >= 1 ? 1 : 0}"/></g></g>`).join('');
    const speed = run ? `<g class="bd-speed">${[0, 1, 2].map((i) => `<path d="M${run > 0 ? 8 - i * 4 : 212 + i * 4} ${104 + i * 16} h${run > 0 ? 26 : -26}" stroke="${L}" stroke-width="4" stroke-linecap="round" style="opacity:${q > i * 0.4 ? 1 : 0}"/>`).join('')}</g>` : '';
    const brows = `<path class="bd-brows" d="M84 92 l12 4 M136 92 l-12 4" stroke="${INK}" stroke-width="3" stroke-linecap="round" style="opacity:${Math.max(k, q) < 0.34 ? 1 : 0}"/>`;
    const happy = Math.max(k, q) >= 1;
    const mouth = `<g class="bd-grin" style="opacity:${happy ? 1 : 0}"><path d="M92 128 Q110 154 128 128 Z" fill="${INK}"/><path d="M101 143 Q110 138 119 143 Q110 150 101 143Z" fill="${BL}"/>
        <path d="M97 128 l3 6 3 -6z M117 128 l3 6 3 -6z" fill="${CR}"/></g>
      <g class="bd-smile" style="opacity:${happy ? 0 : 1}"><path d="M94 129 Q110 141 126 129" stroke="${INK}" stroke-width="3.4" fill="none" stroke-linecap="round"/>
        <path d="M100 132.5 l2.5 5 2.5 -4z M115 133.5 l2.5 4 2.5 -5z" fill="${CR}" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/></g>`;
    const tails = run < 0 ? 'M56 82 l-18 -8 M56 86 l-17 6' : 'M164 82 l18 -8 M164 86 l17 6';
    const band = `<g class="bd-band" style="opacity:${q > 0 ? 1 : 0}"><g clip-path="url(#bd-clip)"><rect x="40" y="78" width="140" height="11" fill="${L}"/></g><path d="${tails}" stroke="${L}" stroke-width="5" stroke-linecap="round"/></g>
      <path class="bd-sweat" d="M156 104 q4 7 0 10 q-4 -3 0 -10z" fill="#9fd8ff" style="opacity:${q >= 0.5 ? 1 : 0}"/>`;
    const crown = gold ? `<path d="M88 70 l-3 -22 14 12 11 -18 11 18 14 -12 -3 22 z" fill="${P}" stroke="${OUT}" stroke-width="2.5" stroke-linejoin="round"/><circle cx="110" cy="56" r="3" fill="${CR}"/>${sparkle(190, 40, 8, Y)}${sparkle(28, 40, 6, Y)}` : '';
    const bar = P0.bar ? (() => { const [a, b] = [arms.l[2], arms.r[2]]; return `<rect x="${a[0] - 14}" y="${a[1] - 3}" width="${b[0] - a[0] + 28}" height="6" rx="3" fill="${LD}"/>
      <rect x="${a[0] - 24}" y="${a[1] - 15}" width="11" height="30" rx="4" fill="${L}"/><rect x="${b[0] + 13}" y="${b[1] - 15}" width="11" height="30" rx="4" fill="${L}"/>`; })() : '';
    const wave = P0.wave ? `<path d="M206 52 q6 4 4 12 M214 46 q7 6 4 16" stroke="${L}" stroke-width="3" fill="none" stroke-linecap="round"/>` : '';
    const lean = run ? ` transform="rotate(${run * 5} 110 160)"` : '';
    return `<svg class="buddy pose-${pose}" width="${size}" height="${Math.round(size * 0.94)}" viewBox="0 0 220 206" aria-hidden="true">
      <defs><clipPath id="bd-clip"><path d="${BODY}"/></clipPath></defs>
      <ellipse class="bd-shadow" cx="110" cy="196" rx="56" ry="7" fill="${INK}" opacity=".12"/>
      ${speed}
      <g class="bd-all"><g${lean}>${legSvg}${arm('l', arms.l)}${arm('r', arms.r)}
        ${horn(84, 66, 2.6, -1)}${horn(136, 66, 2.6, 1)}
        <path d="${BODY}" fill="${FUR}" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/>
        <path d="${fur(110, 150, 30, 16, 14, 14, 2)}" fill="${FUR2}"/>
        <g fill="${YD}" opacity=".55"><circle cx="72" cy="104" r="3"/><circle cx="66" cy="114" r="2"/><circle cx="150" cy="100" r="2.6"/><circle cx="155" cy="111" r="1.8"/></g>
        ${band}${crown}${brows}
        <g class="bd-eyes"><circle cx="94" cy="110" r="13" fill="${CR}" stroke="${INK}" stroke-width="2.6"/><circle cx="126" cy="110" r="13" fill="${CR}" stroke="${INK}" stroke-width="2.6"/>
          <circle cx="97" cy="112" r="6.5" fill="${INK}"/><circle cx="123" cy="112" r="6.5" fill="${INK}"/>
          <circle cx="99.4" cy="109.6" r="2.2" fill="${CR}"/><circle cx="125.4" cy="109.6" r="2.2" fill="${CR}"/></g>
        <ellipse cx="74" cy="128" rx="8" ry="5" fill="${BL}" opacity=".8"/><ellipse cx="146" cy="128" rx="8" ry="5" fill="${BL}" opacity=".8"/>
        ${mouth}${bar}${wave}
      </g></g></svg>`;
  };
  const BODY = fur(110, 122, 60, 56, 49, 34, 4.2);
  /** Animate an existing Buddy to new muscle / leg power (CSS transitions do the swelling). */
  A.buddySet = (el, m, j) => {
    if (!el) return; const st = bStyle(m, j);
    const each = (sel, f) => el.querySelectorAll(sel).forEach(f);
    each('.bd-arm', (p) => { p.style.strokeWidth = `${p.classList.contains('o') ? st.w + 4 : st.w}px`; });
    each('.bd-bi', (p) => { p.style.transform = `scale(${st.b})`; });
    each('.bd-fist', (p) => { p.style.transform = `scale(${st.f})`; });
    each('.bd-lg', (p) => { p.style.strokeWidth = `${p.classList.contains('o') ? st.lw + 4 : st.lw}px`; });
    each('.bd-shoe', (p) => { p.style.transform = `scale(${st.sn})`; });
    each('.bd-wing', (p) => { p.style.opacity = st.q >= 1 ? 1 : 0; });
    each('.bd-speed path', (p, i) => { p.style.opacity = st.q > i * 0.4 ? 1 : 0; });
    const op = (sel, on) => each(sel, (n) => { n.style.opacity = on ? 1 : 0; });
    const hi = Math.max(st.k, st.q);
    op('.bd-brows', hi < 0.34); op('.bd-grin', hi >= 1); op('.bd-smile', hi < 1); op('.bd-band', st.q > 0); op('.bd-sweat', st.q >= 0.5);
  };
  window.ART = A;
}());
