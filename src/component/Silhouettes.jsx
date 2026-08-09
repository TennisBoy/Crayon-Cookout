import React from 'react';

const GRAY = '#E5E7EB';
const GRAY2 = '#D1D5DB';
const OUT = '#6B7280';

export default function Silhouette({ type, colors = [], greyed = false, size = 64 }) {
  const c = (i) => greyed ? (i === 0 ? GRAY : GRAY2) : (colors[i] ?? colors[0] ?? GRAY);
  const o = greyed ? GRAY2 : OUT;
  const R = SILHOUETTES[type];
  if (!R) return <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: 'block' }} />;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: 'block', overflow: 'visible' }}>
      {R(c, o, greyed)}
    </svg>
  );
}

const SILHOUETTES = {
  // ===== NATURE =====
  butterfly: (c, o) => (<>
    <ellipse cx="28" cy="38" rx="24" ry="22" fill={c(0)} />
    <ellipse cx="72" cy="38" rx="24" ry="22" fill={c(0)} />
    <ellipse cx="32" cy="70" rx="17" ry="15" fill={c(0)} opacity="0.88" />
    <ellipse cx="68" cy="70" rx="17" ry="15" fill={c(0)} opacity="0.88" />
    <circle cx="28" cy="38" r="6" fill={o} opacity="0.3" />
    <circle cx="72" cy="38" r="6" fill={o} opacity="0.3" />
    <rect x="47" y="22" width="6" height="56" rx="3" fill={o} />
    <circle cx="50" cy="18" r="5" fill={o} />
    <path d="M50 14 L44 6 M50 14 L56 6" stroke={o} strokeWidth="2" fill="none" strokeLinecap="round" />
  </>),

  flower: (c, o) => (<>
    <circle cx="50" cy="22" r="15" fill={c(0)} />
    <circle cx="78" cy="50" r="15" fill={c(0)} />
    <circle cx="50" cy="78" r="15" fill={c(0)} />
    <circle cx="22" cy="50" r="15" fill={c(0)} />
    <circle cx="50" cy="50" r="14" fill={c(1)} />
    <rect x="47" y="78" width="6" height="18" rx="2" fill={c(0)} opacity="0.7" />
  </>),

  tree: (c, o) => (<>
    <circle cx="50" cy="35" r="28" fill={c(0)} />
    <circle cx="32" cy="48" r="18" fill={c(0)} />
    <circle cx="68" cy="48" r="18" fill={c(0)} />
    <rect x="44" y="60" width="12" height="35" rx="3" fill={c(1)} />
  </>),

  mushroom: (c, o) => (<>
    <path d="M15 50 Q15 22 50 22 Q85 22 85 50 Z" fill={c(0)} />
    <circle cx="35" cy="40" r="5" fill={c(1)} />
    <circle cx="58" cy="35" r="6" fill={c(1)} />
    <circle cx="68" cy="44" r="4" fill={c(1)} />
    <rect x="38" y="50" width="24" height="40" rx="4" fill={c(1)} />
  </>),

  leaf: (c, o) => (<>
    <path d="M50 10 Q85 35 50 90 Q15 35 50 10 Z" fill={c(0)} />
    <path d="M50 12 L50 88" stroke={o} strokeWidth="2" fill="none" opacity="0.4" />
    <path d="M50 30 L62 24 M50 40 L64 36 M50 50 L66 48 M50 30 L38 24 M50 40 L36 36 M50 50 L34 48" stroke={o} strokeWidth="1.5" fill="none" opacity="0.3" />
  </>),

  acorn: (c, o) => (<>
    <path d="M28 42 Q28 25 50 25 Q72 25 72 42 Z" fill={c(0)} />
    <path d="M28 42 Q28 25 50 25 Q72 25 72 42" stroke={o} strokeWidth="1" fill="none" opacity="0.4" />
    <ellipse cx="50" cy="62" rx="20" ry="26" fill={c(1)} />
    <rect x="47" y="84" width="6" height="8" fill={c(1)} />
  </>),

  bee: (c, o) => (<>
    <ellipse cx="50" cy="55" rx="28" ry="22" fill={c(0)} />
    <rect x="34" y="36" width="8" height="38" fill={c(1)} opacity="0.7" />
    <rect x="52" y="36" width="8" height="38" fill={c(1)} opacity="0.7" />
    <ellipse cx="72" cy="35" rx="12" ry="10" fill={c(0)} opacity="0.6" />
    <ellipse cx="80" cy="45" rx="10" ry="8" fill={c(0)} opacity="0.6" />
    <circle cx="26" cy="45" r="6" fill={o} />
    <path d="M22 38 L16 30 M26 36 L22 26" stroke={o} strokeWidth="2" fill="none" strokeLinecap="round" />
  </>),

  ladybug: (c, o) => (<>
    <ellipse cx="50" cy="55" rx="32" ry="26" fill={c(0)} />
    <path d="M50 30 L50 80" stroke={o} strokeWidth="2" fill="none" />
    <circle cx="38" cy="48" r="5" fill={c(1)} />
    <circle cx="62" cy="48" r="5" fill={c(1)} />
    <circle cx="40" cy="65" r="4" fill={c(1)} />
    <circle cx="60" cy="65" r="4" fill={c(1)} />
    <circle cx="25" cy="38" r="7" fill={o} />
    <path d="M22 32 L14 25 M28 30 L26 20" stroke={o} strokeWidth="2" fill="none" strokeLinecap="round" />
  </>),

  // ===== ANIMALS =====
  lion: (c, o) => (<>
    <circle cx="50" cy="50" r="36" fill={c(0)} />
    <path d="M50 14 L46 4 L54 8 Z M70 20 L76 10 L74 20 Z M86 42 L96 38 L90 46 Z M86 64 L96 66 L88 70 Z M70 84 L74 92 L66 86 Z M50 90 L46 98 L54 94 Z M30 84 L24 92 L28 84 Z M14 64 L4 66 L10 70 Z M14 42 L4 38 L12 46 Z M30 20 L24 10 L26 20 Z" fill={c(0)} />
    <circle cx="50" cy="52" r="22" fill={c(1)} />
    <circle cx="42" cy="48" r="3" fill={o} />
    <circle cx="58" cy="48" r="3" fill={o} />
    <path d="M46 58 Q50 62 54 58" stroke={o} strokeWidth="2" fill="none" strokeLinecap="round" />
    <path d="M50 54 L47 58 L53 58 Z" fill={o} />
  </>),

  elephant: (c, o) => (<>
    <circle cx="45" cy="50" r="28" fill={c(0)} />
    <ellipse cx="72" cy="40" rx="12" ry="14" fill={c(1)} />
    <path d="M65 55 Q80 55 82 72 Q82 82 74 82 L68 82" stroke={c(0)} strokeWidth="9" fill="none" strokeLinecap="round" />
    <rect x="30" y="72" width="8" height="18" rx="2" fill={c(0)} />
    <rect x="50" y="72" width="8" height="18" rx="2" fill={c(0)} />
    <circle cx="38" cy="42" r="3" fill={o} />
    <path d="M20 35 L8 32 M20 40 L8 44" stroke={c(0)} strokeWidth="4" fill="none" strokeLinecap="round" />
  </>),

  giraffe: (c, o) => (<>
    <rect x="42" y="10" width="14" height="35" rx="5" fill={c(0)} />
    <ellipse cx="49" cy="12" rx="12" ry="9" fill={c(0)} />
    <path d="M42 7 L40 2 M56 7 L58 2" stroke={c(0)} strokeWidth="3" fill="none" strokeLinecap="round" />
    <ellipse cx="55" cy="55" rx="24" ry="16" fill={c(0)} />
    <rect x="38" y="68" width="7" height="22" rx="2" fill={c(0)} />
    <rect x="56" y="68" width="7" height="22" rx="2" fill={c(0)} />
    <circle cx="52" cy="13" r="1.5" fill={o} />
    <ellipse cx="55" cy="48" rx="4" ry="3" fill={c(1)} opacity="0.5" />
    <ellipse cx="62" cy="58" rx="4" ry="3" fill={c(1)} opacity="0.5" />
    <ellipse cx="50" cy="62" rx="4" ry="3" fill={c(1)} opacity="0.5" />
  </>),

  turtle: (c, o) => (<>
    <ellipse cx="52" cy="50" rx="30" ry="24" fill={c(0)} />
    <path d="M28 50 Q52 28 76 50" stroke={o} strokeWidth="1.5" fill="none" opacity="0.4" />
    <path d="M40 38 L44 50 L40 62 M52 34 L52 66 M64 38 L60 50 L64 62" stroke={o} strokeWidth="1.5" fill="none" opacity="0.4" />
    <circle cx="24" cy="48" r="9" fill={c(0)} />
    <circle cx="22" cy="46" r="1.5" fill={o} />
    <ellipse cx="30" cy="74" rx="6" ry="5" fill={c(0)} />
    <ellipse cx="48" cy="78" rx="6" ry="5" fill={c(0)} />
    <ellipse cx="68" cy="74" rx="6" ry="5" fill={c(0)} />
    <ellipse cx="80" cy="68" rx="5" ry="4" fill={c(0)} />
  </>),

  dolphin: (c, o) => (<>
    <path d="M10 55 Q30 25 60 35 Q88 42 90 60 Q88 68 78 66 Q60 72 40 65 Q20 72 12 60 Z" fill={c(0)} />
    <path d="M70 40 L82 22 L74 44" fill={c(0)} />
    <path d="M30 50 L14 42 L28 56" fill={c(0)} />
    <circle cx="20" cy="52" r="2.5" fill={o} />
    <path d="M12 58 Q6 60 10 66" stroke={c(0)} strokeWidth="4" fill="none" strokeLinecap="round" />
  </>),

  penguin: (c, o) => (<>
    <ellipse cx="50" cy="55" rx="28" ry="35" fill={c(0)} />
    <ellipse cx="50" cy="58" rx="18" ry="24" fill={c(1)} />
    <circle cx="50" cy="25" r="16" fill={c(0)} />
    <path d="M44 28 Q50 34 56 28" fill={c(1)} />
    <path d="M46 30 L50 38 L54 30" fill={c(1)} />
    <circle cx="44" cy="22" r="2.5" fill={o} />
    <circle cx="56" cy="22" r="2.5" fill={o} />
    <ellipse cx="42" cy="88" rx="7" ry="4" fill={o} />
    <ellipse cx="58" cy="88" rx="7" ry="4" fill={o} />
  </>),

  fox: (c, o) => (<>
    <path d="M20 60 Q20 35 50 35 Q80 35 80 60 Q80 72 68 70 L60 88 L40 88 L32 70 Q20 72 20 60 Z" fill={c(0)} />
    <path d="M28 42 L18 22 L36 36 Z M72 42 L82 22 L64 36 Z" fill={c(0)} />
    <path d="M44 70 L50 78 L56 70 Z" fill={c(1)} />
    <circle cx="38" cy="52" r="3" fill={o} />
    <circle cx="62" cy="52" r="3" fill={o} />
    <path d="M48 62 L52 62" stroke={o} strokeWidth="2" strokeLinecap="round" />
    <path d="M78 70 Q92 66 90 88 L80 82" fill={c(0)} />
  </>),

  owl: (c, o) => (<>
    <ellipse cx="50" cy="55" rx="30" ry="35" fill={c(0)} />
    <path d="M28 28 L20 16 L38 24 Z M72 28 L80 16 L62 24 Z" fill={c(0)} />
    <circle cx="38" cy="42" r="11" fill={c(1)} />
    <circle cx="62" cy="42" r="11" fill={c(1)} />
    <circle cx="38" cy="42" r="5" fill={o} />
    <circle cx="62" cy="42" r="5" fill={o} />
    <path d="M46 58 L50 64 L54 58 Z" fill={o} />
    <path d="M38 72 L34 80 M44 74 L42 84 M56 74 L58 84 M62 72 L66 80" stroke={c(1)} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.6" />
  </>),

  // ===== WEATHER =====
  sun: (c, o) => (<>
    <circle cx="50" cy="50" r="24" fill={c(0)} />
    <g stroke={c(0)} strokeWidth="5" strokeLinecap="round">
      <path d="M50 8 L50 20 M50 80 L50 92 M8 50 L20 50 M80 50 L92 50" fill="none" />
      <path d="M20 20 L28 28 M72 72 L80 80 M20 80 L28 72 M72 28 L80 20" fill="none" />
    </g>
    <circle cx="42" cy="46" r="2.5" fill={o} />
    <circle cx="58" cy="46" r="2.5" fill={o} />
    <path d="M44 56 Q50 60 56 56" stroke={o} strokeWidth="2" fill="none" strokeLinecap="round" />
  </>),

  cloud: (c, o) => (<>
    <circle cx="30" cy="50" r="18" fill={c(0)} />
    <circle cx="50" cy="40" r="22" fill={c(0)} />
    <circle cx="72" cy="50" r="16" fill={c(0)} />
    <ellipse cx="50" cy="62" rx="32" ry="12" fill={c(0)} />
    <path d="M20 62 Q20 55 28 55" stroke={c(1)} strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.6" />
    <path d="M60 70 L56 80 M70 70 L66 80 M78 68 L74 78" stroke={c(1)} strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.6" />
  </>),

  rainbow: (c, o, g) => {
    const a = (d, col) => <path d={d} stroke={g ? GRAY : col} strokeWidth="9" fill="none" />;
    return (<>
      {a("M10 80 Q10 25 50 25 Q90 25 90 80", "#EF4444")}
      {a("M19 80 Q19 34 50 34 Q81 34 81 80", "#F97316")}
      {a("M28 80 Q28 43 50 43 Q72 43 72 80", "#FACC15")}
      {a("M37 80 Q37 52 50 52 Q63 52 63 80", "#22C55E")}
      {a("M46 80 Q46 61 50 61 Q54 61 54 80", "#3B82F6")}
      <ellipse cx="50" cy="82" rx="44" ry="6" fill={g ? GRAY2 : "#E9D5FF"} opacity="0.6" />
    </>);
  },

  lightning: (c, o) => (<>
    <path d="M55 5 L25 50 L45 50 L35 95 L75 40 L52 40 L62 5 Z" fill={c(0)} />
  </>),

  snowflake: (c, o) => (<>
    <g stroke={c(0)} strokeWidth="5" strokeLinecap="round" fill="none">
      <path d="M50 8 L50 92 M14 30 L86 70 M86 30 L14 70" />
      <path d="M50 18 L42 10 M50 18 L58 10 M50 82 L42 90 M50 82 L58 90" />
      <path d="M22 36 L14 34 M22 36 L20 28 M78 64 L86 66 M78 64 L80 72 M78 36 L86 34 M78 36 L80 28 M22 64 L14 66 M22 64 L20 72" />
    </g>
    <circle cx="50" cy="50" r="6" fill={c(1)} />
  </>),

  raindrop: (c, o) => (<>
    <path d="M50 10 Q80 50 50 85 Q20 50 50 10 Z" fill={c(0)} />
    <ellipse cx="38" cy="45" rx="6" ry="12" fill={c(1)} opacity="0.5" />
  </>),

  // ===== FOOD =====
  pizza: (c, o) => (<>
    <path d="M50 10 L10 85 L90 85 Z" fill={c(1)} />
    <path d="M50 22 L22 82 L78 82 Z" fill={c(0)} />
    <circle cx="45" cy="50" r="5" fill={o} opacity="0.5" />
    <circle cx="58" cy="65" r="4" fill={o} opacity="0.5" />
    <circle cx="40" cy="72" r="4" fill={o} opacity="0.5" />
  </>),

  icecream: (c, o) => (<>
    <path d="M30 45 L70 45 L50 92 Z" fill={c(1) || '#D4A373'} />
    <path d="M35 50 L65 50 L52 82 Z" fill={o} opacity="0.15" />
    <circle cx="50" cy="35" r="18" fill={c(0)} />
    <circle cx="38" cy="42" r="12" fill={c(0)} />
    <circle cx="62" cy="42" r="12" fill={c(0)} />
  </>),

  hamburger: (c, o) => (<>
    <path d="M15 30 Q15 15 50 15 Q85 15 85 30 L85 38 L15 38 Z" fill={c(1) || '#D4A373'} />
    <ellipse cx="50" cy="28" rx="30" ry="8" fill={c(1) || '#D4A373'} />
    <rect x="15" y="38" width="70" height="8" fill="#22C55E" opacity="0.7" />
    <rect x="15" y="46" width="70" height="12" rx="3" fill={c(0)} />
    <rect x="15" y="58" width="70" height="6" fill="#FACC15" opacity="0.7" />
    <path d="M15 64 L85 64 L85 80 Q85 85 80 85 L20 85 Q15 85 15 80 Z" fill={c(1) || '#D4A373'} />
    <circle cx="30" cy="24" r="2" fill={o} opacity="0.4" />
    <circle cx="50" cy="22" r="2" fill={o} opacity="0.4" />
    <circle cx="68" cy="25" r="2" fill={o} opacity="0.4" />
  </>),

  taco: (c, o) => (<>
    <path d="M12 72 Q12 30 50 30 Q88 30 88 72 Q88 80 80 78 Q50 72 20 78 Q12 80 12 72 Z" fill={c(0)} />
    <path d="M22 64 Q30 48 40 56 M50 62 Q58 46 66 56" stroke={o} strokeWidth="2" fill="none" opacity="0.4" />
    <ellipse cx="35" cy="40" rx="6" ry="8" fill={c(1)} />
    <ellipse cx="55" cy="38" rx="6" ry="8" fill={c(1)} />
    <ellipse cx="70" cy="44" rx="5" ry="7" fill="#22C55E" opacity="0.7" />
    <ellipse cx="42" cy="48" rx="5" ry="6" fill="#EF4444" opacity="0.6" />
  </>),

  donut: (c, o) => (<>
    <circle cx="50" cy="50" r="36" fill={c(1) || '#D4A373'} />
    <circle cx="50" cy="50" r="28" fill={c(0)} />
    <circle cx="50" cy="50" r="10" fill="#FDF2F8" />
    <circle cx="28" cy="35" r="2.5" fill="#EF4444" opacity="0.7" />
    <circle cx="70" cy="40" r="2.5" fill="#22C55E" opacity="0.7" />
    <circle cx="35" cy="68" r="2.5" fill="#3B82F6" opacity="0.7" />
    <circle cx="68" cy="68" r="2.5" fill="#FACC15" opacity="0.7" />
  </>),

  watermelon: (c, o) => (<>
    <path d="M10 80 Q10 25 50 25 Q90 25 90 80 Z" fill={c(1)} />
    <path d="M18 80 Q18 33 50 33 Q82 33 82 80 Z" fill={c(0)} />
    <circle cx="35" cy="55" r="2.5" fill={o} />
    <circle cx="50" cy="48" r="2.5" fill={o} />
    <circle cx="65" cy="55" r="2.5" fill={o} />
    <circle cx="42" cy="68" r="2.5" fill={o} />
    <circle cx="58" cy="68" r="2.5" fill={o} />
  </>),

  strawberry: (c, o) => (<>
    <path d="M50 28 Q82 35 50 92 Q18 35 50 28 Z" fill={c(0)} />
    <path d="M35 22 L50 8 L65 22 Z" fill="#22C55E" />
    <rect x="47" y="18" width="6" height="8" fill="#22C55E" />
    <circle cx="42" cy="48" r="2" fill={o} opacity="0.5" />
    <circle cx="55" cy="55" r="2" fill={o} opacity="0.5" />
    <circle cx="48" cy="68" r="2" fill={o} opacity="0.5" />
    <circle cx="38" cy="65" r="2" fill={o} opacity="0.5" />
    <circle cx="58" cy="72" r="2" fill={o} opacity="0.5" />
  </>),

  // ===== SPORTS =====
  soccerball: (c, o) => (<>
    <circle cx="50" cy="50" r="36" fill={c(0)} />
    <polygon points="50,28 62,36 58,50 42,50 38,36" fill={c(1)} />
    <polygon points="50,28 38,36 28,28 36,18" fill="none" stroke={c(1)} strokeWidth="2.5" />
    <polygon points="50,28 62,36 72,28 64,18" fill="none" stroke={c(1)} strokeWidth="2.5" />
    <polygon points="42,50 38,36 24,42 28,56" fill="none" stroke={c(1)} strokeWidth="2.5" />
    <polygon points="58,50 62,36 76,42 72,56" fill="none" stroke={c(1)} strokeWidth="2.5" />
    <polygon points="50,72 42,50 28,56 36,72" fill="none" stroke={c(1)} strokeWidth="2.5" />
    <polygon points="50,72 58,50 72,56 64,72" fill="none" stroke={c(1)} strokeWidth="2.5" />
  </>),

  basketball: (c, o) => (<>
    <circle cx="50" cy="50" r="36" fill={c(0)} />
    <path d="M50 14 Q50 50 50 86" stroke={o} strokeWidth="2.5" fill="none" />
    <path d="M14 50 Q50 50 86 50" stroke={o} strokeWidth="2.5" fill="none" />
    <path d="M20 25 Q50 50 80 25 M20 75 Q50 50 80 75" stroke={o} strokeWidth="2.5" fill="none" />
  </>),

  hockeystick: (c, o) => (<>
    <rect x="15" y="20" width="8" height="60" rx="3" fill={c(0)} transform="rotate(15 19 50)" />
    <path d="M8 78 Q8 88 24 88 L30 88 L30 80 L20 80 Q14 80 14 76 Z" fill={c(0)} />
  </>),

  football: (c, o) => (<>
    <ellipse cx="50" cy="50" rx="34" ry="22" fill={c(0)} />
    <path d="M28 42 L72 42 M28 58 L72 58" stroke={o} strokeWidth="2" fill="none" opacity="0.5" />
    <path d="M50 36 L48 40 L52 40 L50 44 L48 48 L52 48 L50 52 L48 56 L52 56 L50 60" stroke={o} strokeWidth="2.5" fill="none" />
  </>),

  trophy: (c, o) => (<>
    <path d="M28 20 L72 20 L72 45 Q72 65 50 65 Q28 65 28 45 Z" fill={c(0)} />
    <path d="M28 25 Q14 25 14 40 Q14 52 28 50" stroke={c(0)} strokeWidth="5" fill="none" />
    <path d="M72 25 Q86 25 86 40 Q86 52 72 50" stroke={c(0)} strokeWidth="5" fill="none" />
    <rect x="44" y="65" width="12" height="14" fill={c(0)} />
    <rect x="30" y="79" width="40" height="10" rx="2" fill={c(0)} />
    <path d="M42 30 L50 38 L58 30" fill={c(1)} opacity="0.4" />
  </>),

  // ===== AROUND THE WORLD =====
  eiffeltower: (c, o) => (<>
    <path d="M42 92 L58 92 L56 72 L44 72 Z" fill={c(0)} />
    <path d="M40 72 L60 72 L56 50 L44 50 Z" fill={c(0)} />
    <path d="M38 50 L62 50 L58 30 L42 30 Z" fill={c(0)} />
    <path d="M36 30 L64 30 L60 12 L40 12 Z" fill={c(0)} />
    <path d="M50 4 L46 12 L54 12 Z" fill={c(0)} />
    <path d="M44 72 L56 72 M42 50 L58 50 M40 30 L60 30" stroke={c(1)} strokeWidth="1.5" fill="none" opacity="0.5" />
  </>),

  mapleleaf: (c, o) => (<>
    <path d="M50 8 L52 22 L62 16 L58 28 L72 26 L64 36 L78 40 L66 46 L76 56 L62 54 L66 66 L54 58 L56 72 L50 64 L44 72 L46 58 L34 66 L38 54 L24 56 L34 46 L22 40 L36 36 L28 26 L42 28 L38 16 L48 22 Z" fill={c(0)} />
    <rect x="47" y="64" width="6" height="24" fill={c(0)} />
  </>),

  liberty: (c, o) => (<>
    <path d="M44 20 L56 20 L54 14 L46 14 Z" fill={c(0)} />
    <circle cx="43" cy="12" r="2" fill={c(0)} />
    <circle cx="50" cy="10" r="2" fill={c(0)} />
    <circle cx="57" cy="12" r="2" fill={c(0)} />
    <rect x="44" y="20" width="12" height="14" rx="2" fill={c(0)} />
    <path d="M46 22 L46 18 M50 22 L50 16 M54 22 L54 18" stroke={c(0)} strokeWidth="2" strokeLinecap="round" />
    <path d="M38 34 Q50 28 62 34 L64 80 L36 80 Z" fill={c(1)} />
    <rect x="30" y="80" width="40" height="12" fill={c(1)} />
    <path d="M62 30 L70 14 L66 30" fill={c(0)} />
    <circle cx="70" cy="14" r="3" fill={c(0)} />
  </>),

  bigben: (c, o) => (<>
    <rect x="38" y="30" width="24" height="60" fill={c(0)} />
    <rect x="34" y="20" width="32" height="12" fill={c(0)} />
    <path d="M34 20 L50 4 L66 20 Z" fill={c(0)} />
    <circle cx="50" cy="48" r="9" fill={c(1)} />
    <path d="M50 39 L50 48 L56 52" stroke={o} strokeWidth="1.5" fill="none" />
    <rect x="40" y="84" width="20" height="10" fill={c(0)} />
    <path d="M38 30 L62 30 M38 40 L62 40 M38 70 L62 70" stroke={c(1)} strokeWidth="1" opacity="0.4" />
  </>),

  pyramid: (c, o) => (<>
    <path d="M10 85 L50 20 L90 85 Z" fill={c(0)} />
    <path d="M50 20 L90 85 L50 85 Z" fill={c(1)} opacity="0.4" />
    <path d="M50 20 L30 85" stroke={o} strokeWidth="1.5" fill="none" opacity="0.3" />
    <path d="M35 70 L50 42 L65 70 L50 85 Z" fill={c(1)} opacity="0.3" />
  </>),

  globe: (c, o) => (<>
    <circle cx="50" cy="50" r="36" fill={c(1)} />
    <ellipse cx="50" cy="50" rx="36" ry="14" fill={c(0)} opacity="0.7" />
    <path d="M50 14 Q35 50 50 86 M50 14 Q65 50 50 86" stroke={c(0)} strokeWidth="3" fill="none" opacity="0.5" />
    <ellipse cx="50" cy="50" rx="14" ry="36" fill="none" stroke={c(0)} strokeWidth="3" opacity="0.5" />
    <circle cx="50" cy="50" r="36" fill="none" stroke={o} strokeWidth="2" />
  </>),

  // ===== SCHOOL =====
  pencil: (c, o) => (<>
    <rect x="38" y="20" width="24" height="56" fill={c(0)} />
    <path d="M38 76 L62 76 L50 92 Z" fill={c(1)} />
    <path d="M50 84 L46 76 L54 76 Z" fill={o} />
    <rect x="38" y="14" width="24" height="8" fill="#EC4899" />
    <rect x="38" y="12" width="24" height="4" rx="2" fill={o} />
    <path d="M42 26 L42 72 M58 26 L58 72" stroke={c(1)} strokeWidth="1" opacity="0.3" />
  </>),

  ruler: (c, o) => (<>
    <rect x="16" y="42" width="68" height="16" rx="2" fill={c(0)} />
    <path d="M22 42 L22 48 M30 42 L30 50 M38 42 L38 48 M46 42 L46 50 M54 42 L54 48 M62 42 L62 50 M70 42 L70 48 M78 42 L78 50" stroke={c(1)} strokeWidth="2" fill="none" />
    <rect x="16" y="42" width="68" height="16" rx="2" fill="none" stroke={o} strokeWidth="1" opacity="0.3" />
  </>),

  apple: (c, o) => (<>
    <path d="M50 28 Q25 28 25 55 Q25 85 50 85 Q75 85 75 55 Q75 28 50 28 Z" fill={c(0)} />
    <path d="M50 28 Q50 20 50 16" stroke={o} strokeWidth="3" fill="none" strokeLinecap="round" />
    <path d="M50 22 Q62 18 66 10 Q56 16 50 22" fill="#22C55E" />
  </>),

  book: (c, o) => (<>
    <path d="M50 25 Q35 18 16 22 L16 82 Q35 78 50 85 Z" fill={c(0)} />
    <path d="M50 25 Q65 18 84 22 L84 82 Q65 78 50 85 Z" fill={c(0)} />
    <path d="M50 25 L50 85" stroke={o} strokeWidth="2" fill="none" />
    <path d="M22 30 L44 34 M22 42 L44 46 M22 54 L44 58" stroke={o} strokeWidth="1" fill="none" opacity="0.3" />
    <path d="M56 34 L78 30 M56 46 L78 42 M56 58 L78 54" stroke={o} strokeWidth="1" fill="none" opacity="0.3" />
  </>),

  gradcap: (c, o) => (<>
    <path d="M14 42 L50 28 L86 42 L50 56 Z" fill={c(0)} />
    <path d="M30 46 L30 62 Q50 70 70 62 L70 46" fill={c(0)} />
    <path d="M70 42 L82 50 L82 64" stroke={c(0)} strokeWidth="2" fill="none" />
    <circle cx="82" cy="66" r="3" fill={c(0)} />
    <rect x="36" y="50" width="28" height="6" fill={c(1)} opacity="0.4" />
  </>),

  calculator: (c, o) => (<>
    <rect x="25" y="12" width="50" height="76" rx="4" fill={c(0)} />
    <rect x="31" y="18" width="38" height="16" rx="2" fill={c(1)} />
    <rect x="34" y="40" width="10" height="10" rx="2" fill={c(1)} />
    <rect x="48" y="40" width="10" height="10" rx="2" fill={c(1)} />
    <rect x="62" y="40" width="10" height="10" rx="2" fill={c(1)} />
    <rect x="34" y="54" width="10" height="10" rx="2" fill={c(1)} />
    <rect x="48" y="54" width="10" height="10" rx="2" fill={c(1)} />
    <rect x="62" y="54" width="10" height="10" rx="2" fill={c(1)} />
    <rect x="34" y="68" width="10" height="10" rx="2" fill={c(1)} />
    <rect x="48" y="68" width="10" height="10" rx="2" fill={c(1)} />
    <rect x="62" y="68" width="10" height="10" rx="2" fill={c(1)} />
  </>),

  schoolbus: (c, o) => (<>
    <rect x="8" y="28" width="84" height="48" rx="6" fill={c(0)} />
    <rect x="14" y="34" width="18" height="14" rx="2" fill={c(1)} />
    <rect x="36" y="34" width="18" height="14" rx="2" fill={c(1)} />
    <rect x="58" y="34" width="18" height="14" rx="2" fill={c(1)} />
    <rect x="78" y="34" width="10" height="14" rx="2" fill={c(1)} />
    <circle cx="26" cy="78" r="8" fill={o} />
    <circle cx="26" cy="78" r="3" fill={c(0)} />
    <circle cx="70" cy="78" r="8" fill={o} />
    <circle cx="70" cy="78" r="3" fill={c(0)} />
    <rect x="8" y="54" width="84" height="4" fill={c(1)} opacity="0.4" />
  </>),

  // ===== FANTASY =====
  dragon: (c, o) => (<>
    <ellipse cx="45" cy="55" rx="25" ry="18" fill={c(0)} />
    <path d="M68 50 Q88 30 82 60 Q76 68 68 60" fill={c(1)} opacity="0.7" />
    <circle cx="28" cy="42" r="14" fill={c(0)} />
    <path d="M16 38 L6 30 L16 40 M16 44 L4 42 L16 46" fill={c(0)} />
    <path d="M22 35 L18 24 L28 32 M32 33 L30 20 L38 30" fill={c(1)} />
    <circle cx="24" cy="42" r="2.5" fill={o} />
    <path d="M18 48 L10 52 L18 54 M18 52 L12 60 L20 58" fill={c(0)} />
    <path d="M40 64 Q35 75 30 78 M50 67 Q48 80 45 85" stroke={c(0)} strokeWidth="6" fill="none" strokeLinecap="round" />
    <path d="M58 50 L52 46 L58 44 L54 40 L62 42" fill={c(1)} opacity="0.6" />
  </>),

  unicorn: (c, o) => (<>
    <ellipse cx="48" cy="58" rx="26" ry="18" fill={c(0)} />
    <circle cx="28" cy="42" r="15" fill={c(0)} />
    <path d="M28 28 L22 8 L34 26 Z" fill={c(1)} />
    <path d="M16 36 L8 28 L16 40 M18 30 L10 24 L18 32" fill={c(0)} opacity="0.7" />
    <path d="M30 30 Q26 20 34 18 Q40 24 36 32" fill={c(1)} opacity="0.6" />
    <path d="M40 28 Q38 18 46 16 Q52 22 48 30" fill={c(1)} opacity="0.6" />
    <circle cx="24" cy="42" r="2.5" fill={o} />
    <path d="M68 55 Q80 50 76 72 Q70 68 68 60" fill={c(0)} />
    <rect x="36" y="72" width="6" height="18" rx="2" fill={c(0)} />
    <rect x="52" y="72" width="6" height="18" rx="2" fill={c(0)} />
  </>),

  castle: (c, o) => (<>
    <rect x="20" y="50" width="60" height="40" fill={c(0)} />
    <rect x="14" y="35" width="14" height="55" fill={c(0)} />
    <rect x="72" y="35" width="14" height="55" fill={c(0)} />
    <rect x="43" y="28" width="14" height="62" fill={c(1)} />
    <path d="M14 35 L14 28 L21 28 L21 35 Z M72 35 L72 28 L79 28 L79 35 Z M43 28 L43 20 L57 20 L57 28 Z" fill={c(0)} />
    <path d="M46 60 Q50 55 54 60 L54 70 L46 70 Z" fill={o} opacity="0.4" />
    <path d="M12 35 L14 32 L16 35 L18 32 L20 35 L22 32 L24 35 L26 32 L28 35" stroke={c(0)} strokeWidth="2" fill="none" />
    <path d="M70 35 L72 32 L74 35 L76 32 L78 35 L80 32 L82 35 L84 32 L86 35" stroke={c(0)} strokeWidth="2" fill="none" />
    <path d="M43 20 L43 18 L45 20 L47 18 L49 20 L51 18 L53 20 L55 18 L57 20" stroke={c(0)} strokeWidth="2" fill="none" />
  </>),

  sword: (c, o) => (<>
    <rect x="47" y="8" width="6" height="58" fill={c(0)} />
    <path d="M47 8 L50 4 L53 8 Z" fill={c(0)} />
    <rect x="34" y="64" width="32" height="6" rx="2" fill={c(1) || '#92400E'} />
    <rect x="46" y="70" width="8" height="18" rx="2" fill={c(1) || '#92400E'} />
    <circle cx="50" cy="90" r="4" fill={c(1) || '#92400E'} />
    <path d="M47 14 L47 60 M53 14 L53 60" stroke={o} strokeWidth="0.8" opacity="0.3" />
  </>),

  crown: (c, o) => (<>
    <path d="M14 30 L26 60 L38 30 L50 60 L62 30 L74 60 L86 30 L82 80 L18 80 Z" fill={c(0)} />
    <circle cx="14" cy="30" r="4" fill={c(1)} />
    <circle cx="38" cy="30" r="4" fill={c(1)} />
    <circle cx="62" cy="30" r="4" fill={c(1)} />
    <circle cx="86" cy="30" r="4" fill={c(1)} />
    <rect x="18" y="70" width="64" height="6" fill={c(1)} opacity="0.5" />
    <circle cx="50" cy="73" r="3" fill="#EF4444" opacity="0.6" />
  </>),

  wizardhat: (c, o) => (<>
    <path d="M50 10 Q58 40 72 70 L28 70 Q42 40 50 10 Z" fill={c(0)} />
    <ellipse cx="50" cy="72" rx="34" ry="8" fill={c(0)} />
    <path d="M38 50 L42 54 L36 58 M58 40 L62 44 L56 48 M48 60 L52 64 L46 68" fill={c(1)} opacity="0.7" />
    <circle cx="40" cy="56" r="2" fill={c(1)} opacity="0.7" />
    <circle cx="60" cy="48" r="2" fill={c(1)} opacity="0.7" />
  </>),

  fairy: (c, o) => (<>
    <circle cx="50" cy="22" r="10" fill={c(1)} />
    <path d="M44 16 L40 8 L48 14 M56 16 L60 8 L52 14" fill={c(0)} />
    <path d="M50 32 Q38 42 40 70 Q50 75 60 70 Q62 42 50 32" fill={c(0)} />
    <path d="M40 45 Q20 35 16 50 Q22 55 38 50" fill={c(1)} opacity="0.6" />
    <path d="M60 45 Q80 35 84 50 Q78 55 62 50" fill={c(1)} opacity="0.6" />
    <rect x="46" y="72" width="3" height="16" fill={c(0)} />
    <rect x="51" y="72" width="3" height="16" fill={c(0)} />
    <circle cx="50" cy="92" r="2" fill={c(1)} />
  </>),

  // ===== TRANSPORTATION =====
  racecar: (c, o) => (<>
    <path d="M10 60 Q10 48 24 46 L34 38 Q42 34 60 36 L76 42 L88 46 Q92 48 92 56 L92 64 Q92 70 86 70 L14 70 Q10 70 10 66 Z" fill={c(0)} />
    <circle cx="30" cy="72" r="10" fill={o} />
    <circle cx="30" cy="72" r="4" fill={c(0)} />
    <circle cx="70" cy="72" r="10" fill={o} />
    <circle cx="70" cy="72" r="4" fill={c(0)} />
    <path d="M38 42 L58 42 L66 48 L36 48 Z" fill={c(1)} opacity="0.5" />
  </>),

  firetruck: (c, o) => (<>
    <rect x="8" y="34" width="84" height="36" rx="4" fill={c(0)} />
    <rect x="58" y="24" width="30" height="14" rx="2" fill={c(0)} />
    <rect x="62" y="28" width="10" height="8" fill={c(1)} opacity="0.5" />
    <rect x="76" y="28" width="10" height="8" fill={c(1)} opacity="0.5" />
    <rect x="14" y="40" width="14" height="12" fill={c(1)} opacity="0.5" />
    <rect x="32" y="40" width="14" height="12" fill={c(1)} opacity="0.5" />
    <rect x="62" y="56" width="6" height="4" fill={c(1)} opacity="0.5" />
    <rect x="78" y="56" width="6" height="4" fill={c(1)} opacity="0.5" />
    <circle cx="26" cy="74" r="9" fill={o} />
    <circle cx="26" cy="74" r="3" fill={c(0)} />
    <circle cx="54" cy="74" r="9" fill={o} />
    <circle cx="54" cy="74" r="3" fill={c(0)} />
    <circle cx="76" cy="74" r="9" fill={o} />
    <circle cx="76" cy="74" r="3" fill={c(0)} />
    <rect x="44" y="20" width="3" height="16" fill={c(0)} />
  </>),

  airplane: (c, o) => (<>
    <path d="M10 50 Q10 42 24 42 L52 42 L72 24 Q80 22 80 28 L62 42 L86 44 Q92 46 92 50 Q92 54 86 56 L62 58 L80 72 Q80 78 72 76 L52 58 L24 58 Q10 58 10 50 Z" fill={c(0)} />
    <circle cx="40" cy="50" r="2.5" fill={o} opacity="0.4" />
    <circle cx="52" cy="50" r="2.5" fill={o} opacity="0.4" />
  </>),

  train: (c, o) => (<>
    <rect x="10" y="30" width="50" height="44" rx="4" fill={c(0)} />
    <rect x="62" y="38" width="28" height="36" rx="3" fill={c(0)} />
    <rect x="16" y="36" width="14" height="12" fill={c(1)} opacity="0.5" />
    <rect x="36" y="36" width="14" height="12" fill={c(1)} opacity="0.5" />
    <path d="M62 30 L68 20 L84 20 L90 30" fill={c(0)} />
    <rect x="68" y="44" width="8" height="8" fill={c(1)} opacity="0.5" />
    <rect x="78" y="44" width="8" height="8" fill={c(1)} opacity="0.5" />
    <rect x="42" y="58" width="10" height="10" fill={c(1)} opacity="0.4" />
    <circle cx="22" cy="78" r="7" fill={o} />
    <circle cx="40" cy="78" r="7" fill={o} />
    <circle cx="72" cy="78" r="6" fill={o} />
    <circle cx="84" cy="78" r="6" fill={o} />
  </>),

  sailboat: (c, o) => (<>
    <path d="M14 64 L86 64 L78 80 L22 80 Z" fill={c(0)} />
    <rect x="48" y="16" width="4" height="48" fill={o} />
    <path d="M52 20 L82 60 L52 60 Z" fill={c(0)} />
    <path d="M44 28 L16 60 L44 60 Z" fill={c(0)} opacity="0.85" />
    <path d="M48 16 L44 12 L52 12 Z" fill={c(0)} />
  </>),
};