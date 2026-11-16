/* Gym Log — little hand-made illustrations (inline SVG), in the style of the app icon:
   soft white blob characters, lavender / peach / mint, rosy cheeks. window.ART.name(size) → SVG string. */
(function () {
  const INK = '#34304d', BL = '#ffab9d', L = '#9c92f6', LD = '#6c60ea', P = '#f7a259', PD = '#f0803f', M = '#5fcf8e', MD = '#2fae63', Y = '#ffcc4d', YD = '#f2a900', OUT = '#d6d0ff';
  const face = (x, y, k = 1, mood = 'smile') => {
    const e = 2.3 * k, dx = 5.5 * k;
    const eyes = mood === 'sleep'
      ? `<path d="M${x - dx - 2.2 * k} ${y} q${2.2 * k} ${1.8 * k} ${4.4 * k} 0 M${x + dx - 2.2 * k} ${y} q${2.2 * k} ${1.8 * k} ${4.4 * k} 0" stroke="${INK}" stroke-width="${1.6 * k}" fill="none" stroke-linecap="round"/>`
      : `<circle cx="${x - dx}" cy="${y}" r="${e}" fill="${INK}"/><circle cx="${x + dx}" cy="${y}" r="${e}" fill="${INK}"/><circle cx="${x - dx + 0.8 * k}" cy="${y - 0.9 * k}" r="${0.8 * k}" fill="#fff"/><circle cx="${x + dx + 0.8 * k}" cy="${y - 0.9 * k}" r="${0.8 * k}" fill="#fff"/>`;
    const mouth = mood === 'open'
      ? `<ellipse cx="${x}" cy="${y + 4.6 * k}" rx="${2.4 * k}" ry="${2 * k}" fill="${INK}"/>`
      : `<path d="M${x - 3 * k} ${y + 3.6 * k} Q${x} ${y + 6.6 * k} ${x + 3 * k} ${y + 3.6 * k}" stroke="${INK}" stroke-width="${1.7 * k}" fill="none" stroke-linecap="round"/>`;
    return `${eyes}<ellipse cx="${x - 10 * k}" cy="${y + 4 * k}" rx="${3.2 * k}" ry="${2 * k}" fill="${BL}" opacity=".85"/><ellipse cx="${x + 10 * k}" cy="${y + 4 * k}" rx="${3.2 * k}" ry="${2 * k}" fill="${BL}" opacity=".85"/>${mouth}`;
  };
  const blob = (cx = 32, cy = 40, s = 1) => `<path d="M${cx} ${cy - 24 * s} C${cx + 16 * s} ${cy - 24 * s} ${cx + 24 * s} ${cy - 11 * s} ${cx + 24 * s} ${cy} C${cx + 24 * s} ${cy + 12 * s} ${cx + 14 * s} ${cy + 17 * s} ${cx} ${cy + 17 * s} C${cx - 14 * s} ${cy + 17 * s} ${cx - 24 * s} ${cy + 12 * s} ${cx - 24 * s} ${cy} C${cx - 24 * s} ${cy - 11 * s} ${cx - 16 * s} ${cy - 24 * s} ${cx} ${cy - 24 * s} Z" fill="#fff" stroke="${OUT}" stroke-width="2"/>`;
  const arm = (d) => `<path d="${d}" stroke="${OUT}" stroke-width="7" stroke-linecap="round" fill="none"/><path d="${d}" stroke="#fff" stroke-width="4" stroke-linecap="round" fill="none"/>`;
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
      <rect x="11" y="11" width="42" height="42" rx="13" fill="${INK}"/><rect x="15" y="15" width="34" height="34" rx="10" fill="#fff"/><rect x="53" y="26" width="4" height="10" rx="2" fill="${LD}"/>${face(32, 30, 0.9)}`, s),
    calendar: (s = 40) => svg(`<rect x="6" y="10" width="52" height="48" rx="13" fill="#fff" stroke="${OUT}" stroke-width="2"/><path d="M6 23 V22 a12 12 0 0 1 12 -12 h28 a12 12 0 0 1 12 12 v1z" fill="${L}"/>
      <rect x="18" y="4" width="5" height="12" rx="2.5" fill="${LD}"/><rect x="41" y="4" width="5" height="12" rx="2.5" fill="${LD}"/>
      <path d="M32 51 s-10 -6 -10 -12.5 a5.2 5.2 0 0 1 10 -2.2 a5.2 5.2 0 0 1 10 2.2 c0 6.5 -10 12.5 -10 12.5z" fill="${P}"/>`, s),
    scan: (s = 40) => svg(`<rect x="13" y="3" width="38" height="58" rx="11" fill="${L}"/><rect x="17" y="9" width="30" height="46" rx="7" fill="#fff"/>
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
    target: (s = 40) => svg(`<circle cx="30" cy="34" r="25" fill="${P}"/><circle cx="30" cy="34" r="18" fill="#fff"/><circle cx="30" cy="34" r="11" fill="${P}"/>
      <path d="M30 34 L54 10" stroke="${LD}" stroke-width="3.5" stroke-linecap="round"/><path d="M50 6 l8 0 0 8 -6 -2z" fill="${L}"/>${face(30, 32, 0.6)}`, s),
    pie: (s = 40) => svg(`<circle cx="32" cy="32" r="26" fill="#2a78d6"/><path d="M32 32 L32 6 A26 26 0 0 1 56.7 40 Z" fill="#1baf7a"/><path d="M32 32 L56.7 40 A26 26 0 0 1 40 56.7 Z" fill="#eb6834"/>
      <circle cx="32" cy="32" r="15" fill="#fff"/>${face(32, 30, 0.7)}`, s),
    flex: (s = 40) => svg(`${arm('M47 46 L56 36')}${blob(29, 40, 0.84)}
      <rect x="53.5" y="20" width="4.5" height="20" rx="2.2" fill="${LD}"/><rect x="49" y="15" width="13.5" height="7" rx="3.5" fill="${L}"/><rect x="49" y="38" width="13.5" height="7" rx="3.5" fill="${L}"/>
      <rect x="11" y="19" width="36" height="5.5" rx="2.7" fill="${M}"/>${sparkle(10, 10, 5, Y)}${face(29, 41, 0.85)}`, s),
    heart: (s = 40) => svg(`<path d="M32 57 C32 57 6 42 6 23 C6 13 13 7 21 7 C26 7 30 10 32 14 C34 10 38 7 43 7 C51 7 58 13 58 23 C58 42 32 57 32 57 Z" fill="#ff8fa3"/>
      <ellipse cx="19" cy="18" rx="5" ry="3" fill="#fff" opacity=".55" transform="rotate(-30 19 18)"/>${face(32, 28, 0.85)}`, s),
    scale: (s = 40) => svg(`<rect x="6" y="14" width="52" height="44" rx="15" fill="${L}"/><circle cx="32" cy="33" r="15" fill="#fff"/><path d="M32 33 L39 25" stroke="${PD}" stroke-width="3" stroke-linecap="round"/>
      ${face(32, 38, 0.6)}<rect x="12" y="52" width="10" height="5" rx="2.5" fill="${LD}"/><rect x="42" y="52" width="10" height="5" rx="2.5" fill="${LD}"/>`, s),
    drop: (s = 40) => svg(`<path d="M32 4 C40 18 52 28 52 41 C52 52 43 60 32 60 C21 60 12 52 12 41 C12 28 24 18 32 4 Z" fill="${Y}"/><ellipse cx="23" cy="36" rx="3" ry="6" fill="#fff" opacity=".6"/>${face(32, 40, 0.85)}`, s),
    sprout: (s = 40) => svg(`<path d="M32 30 C32 22 30 16 32 10" stroke="${MD}" stroke-width="3" stroke-linecap="round" fill="none"/>
      <path d="M32 16 C24 4 10 10 12 16 C18 22 28 20 32 16 Z" fill="${M}"/><path d="M32 14 C40 2 54 8 52 14 C46 20 36 18 32 14 Z" fill="${MD}"/>
      <path d="M12 30 h40 l-5 26 a6 6 0 0 1 -6 5 h-18 a6 6 0 0 1 -6 -5z" fill="${P}"/>${face(32, 42, 0.75)}`, s),
    chart: (s = 40) => svg(`<rect x="4" y="8" width="56" height="48" rx="14" fill="#fff" stroke="${OUT}" stroke-width="2"/>
      <path d="M13 44 L24 34 L33 39 L49 20" stroke="${LD}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/><circle cx="49" cy="20" r="5" fill="${P}"/>${sparkle(52, 9, 5, Y)}`, s),
    tape: (s = 40) => svg(`<path d="M44 44 h16 v10 h-16z" fill="${Y}"/><path d="M48 44v4M52 44v6M56 44v4" stroke="${YD}" stroke-width="1.5"/>
      <circle cx="28" cy="34" r="24" fill="${M}"/><circle cx="28" cy="34" r="18" fill="#fff"/>${face(28, 32, 0.8)}`, s),
    avocado: (s = 40) => svg(`<path d="M32 3 C42 3 46 14 50 24 C55 36 54 60 32 60 C10 60 9 36 14 24 C18 14 22 3 32 3 Z" fill="#5c9e3c"/>
      <path d="M32 9 C40 9 43 18 46 26 C50 36 49 55 32 55 C15 55 14 36 18 26 C21 18 24 9 32 9 Z" fill="#d6ef8f"/><circle cx="32" cy="41" r="9" fill="#a8693c"/>${face(32, 24, 0.75)}`, s),
    trophy: (s = 40) => svg(`<path d="M16 10 C6 10 6 26 18 28" stroke="${YD}" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M48 10 C58 10 58 26 46 28" stroke="${YD}" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M14 6 h36 v14 c0 12 -8 20 -18 20 s-18 -8 -18 -20z" fill="${Y}"/><rect x="28" y="38" width="8" height="10" fill="${YD}"/><rect x="18" y="48" width="28" height="10" rx="4" fill="${L}"/>
      ${face(32, 19, 0.85)}${sparkle(55, 40, 5, Y)}${sparkle(8, 40, 4, Y)}`, s),
    flag: (s = 40) => svg(`<rect x="12" y="4" width="4" height="58" rx="2" fill="${INK}"/><path d="M16 7 h34 l-6 11 6 11 h-34z" fill="${P}"/>
      <path d="M16 7h8v7h-8zM32 7h8v7h-8zM24 14h8v8h-8zM40 14h6l-2 4 2 4h-6zM16 22h8v7h-8zM32 22h8v7h-8z" fill="#fff" opacity=".9"/>`, s),
    wave: (s = 40) => svg(`${arm('M50 34 L58 18')}${blob(30, 40, 0.84)}${face(30, 41, 0.85)}<path d="M57 9 q4 3 3 8 M61 7 q4 4 2 10" stroke="${L}" stroke-width="2" fill="none" stroke-linecap="round"/>`, s),
  };

  /* Buddy — the big mascot. m = muscle power (0 noodle arms … 1 weekly lifting goal … 1.25 extra), jog adds a headband, gold a crown. */
  const bStyle = (m) => { const k = Math.max(0, Math.min(1.25, m || 0)); return { w: 11 + k * 11, b: 0.15 + k * 1.05, f: 0.8 + k * 0.35, k }; };
  A.buddy = ({ m = 0, jog = false, gold = false, size = 160 } = {}) => {
    const st = bStyle(m), k = st.k;
    const BODY = 'M110 66 C150 66 170 98 170 128 C170 158 146 172 110 172 C74 172 50 158 50 128 C50 98 70 66 110 66 Z';
    const arm = (side) => {
      const x = (v) => (side < 0 ? v : 220 - v);
      const d = `M${x(62)} 130 L${x(14)} 124 L${x(18)} 88`;
      return `<g class="bd-armg ${side < 0 ? 'l' : 'r'}">
        <path class="bd-arm o" d="${d}" stroke="${OUT}" style="stroke-width:${st.w + 4}px" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <path class="bd-arm" d="${d}" stroke="#fff" style="stroke-width:${st.w}px" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <g class="bd-bi" style="transform:scale(${st.b})"><path d="M${x(17)} 126 A16 21 0 0 ${side < 0 ? 1 : 0} ${x(49)} 126 Z" fill="#fff"/>
          <path d="M${x(17)} 126 A16 21 0 0 ${side < 0 ? 1 : 0} ${x(49)} 126" stroke="${OUT}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
          <path d="M${x(36)} 112 q${side * -4} -3 ${side * -8} -1" stroke="${OUT}" stroke-width="2" fill="none" stroke-linecap="round" opacity=".8"/></g>
        <circle class="bd-fist" cx="${x(18)}" cy="82" r="11" fill="#fff" stroke="${OUT}" stroke-width="2.5" style="transform:scale(${st.f})"/>
        <path class="bd-pump" d="M${x(2)} 98 q${side * 7} 7 0 14 M${x(-5)} 94 q${side * 9} 10 0 21" stroke="${L}" stroke-width="2.6" fill="none" stroke-linecap="round" style="opacity:${k >= 0.6 ? 1 : 0}"/>
      </g>`;
    };
    const brows = `<path class="bd-brows" d="M88 102 l10 3 M132 102 l-10 3" stroke="${INK}" stroke-width="3" stroke-linecap="round" style="opacity:${k < 0.34 ? 1 : 0}"/>`;
    const mouth = `<g class="bd-grin" style="opacity:${k >= 1 ? 1 : 0}"><path d="M100 128 Q110 142 120 128 Z" fill="${INK}"/><path d="M104 134 Q110 139 116 134" stroke="#ff8fa3" stroke-width="3" fill="none" stroke-linecap="round"/></g>
      <path class="bd-smile" d="M102 128 Q110 136 118 128" stroke="${INK}" stroke-width="3.4" fill="none" stroke-linecap="round" style="opacity:${k >= 1 ? 0 : 1}"/>`;
    const band = jog ? `<g clip-path="url(#bd-clip)"><rect x="40" y="84" width="140" height="11" fill="${P}"/></g><path d="M166 88 l18 -8 M166 92 l17 6" stroke="${P}" stroke-width="5" stroke-linecap="round"/>
      <path d="M156 104 q4 7 0 10 q-4 -3 0 -10z" fill="#9fd8ff"/>` : '';
    const crown = gold ? `<path d="M88 70 l-3 -22 14 12 11 -18 11 18 14 -12 -3 22 z" fill="${Y}" stroke="${YD}" stroke-width="2.5" stroke-linejoin="round"/><circle cx="110" cy="56" r="3" fill="#fff"/>${sparkle(190, 50, 8, Y)}${sparkle(28, 50, 6, Y)}` : '';
    return `<svg class="buddy" width="${size}" height="${Math.round(size * 0.9)}" viewBox="0 0 220 198" aria-hidden="true">
      <defs><clipPath id="bd-clip"><path d="${BODY}"/></clipPath></defs>
      <ellipse class="bd-shadow" cx="110" cy="182" rx="56" ry="8" fill="${INK}" opacity=".12"/>
      <g class="bd-all">${arm(-1)}${arm(1)}
        <path d="${BODY}" fill="#fff" stroke="${OUT}" stroke-width="3"/>
        <ellipse cx="86" cy="86" rx="10" ry="6" fill="#fff" opacity=".9" transform="rotate(-30 86 86)"/>
        ${band}${crown}${brows}
        <g class="bd-eyes"><circle cx="96" cy="114" r="6.5" fill="${INK}"/><circle cx="124" cy="114" r="6.5" fill="${INK}"/>
          <circle cx="98.4" cy="111.6" r="2.2" fill="#fff"/><circle cx="126.4" cy="111.6" r="2.2" fill="#fff"/></g>
        <ellipse cx="80" cy="126" rx="9" ry="5.5" fill="${BL}" opacity=".85"/><ellipse cx="140" cy="126" rx="9" ry="5.5" fill="${BL}" opacity=".85"/>
        ${mouth}
      </g></svg>`;
  };
  /** Animate an existing Buddy to a new muscle power (CSS transitions do the swelling). */
  A.buddySet = (el, m) => {
    if (!el) return; const st = bStyle(m);
    el.querySelectorAll('.bd-arm').forEach((p) => { p.style.strokeWidth = `${p.classList.contains('o') ? st.w + 4 : st.w}px`; });
    el.querySelectorAll('.bd-bi').forEach((p) => { p.style.transform = `scale(${st.b})`; });
    el.querySelectorAll('.bd-fist').forEach((p) => { p.style.transform = `scale(${st.f})`; });
    el.querySelectorAll('.bd-pump').forEach((p) => { p.style.opacity = st.k >= 0.6 ? 1 : 0; });
    const op = (sel, on) => { const n = el.querySelector(sel); if (n) n.style.opacity = on ? 1 : 0; };
    op('.bd-brows', st.k < 0.34); op('.bd-grin', st.k >= 1); op('.bd-smile', st.k < 1);
  };
  window.ART = A;
}());
