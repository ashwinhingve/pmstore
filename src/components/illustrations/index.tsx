/**
 * Brand illustration set — inline SVG line art in token colors only.
 * All illustrations are decorative (aria-hidden); pair them with real text.
 * Style: 2px rounded strokes, --ink-40 linework, --ink emphasis, --mint accents,
 * --paper-tint / --mint-soft fills. No stock imagery anywhere in the app.
 */

interface ArtProps {
  className?: string;
}

const artDefaults = {
  'aria-hidden': true,
  focusable: 'false',
  fill: 'none',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

/** Empty shopping basket with a stray tablet — cart empty state. */
export function EmptyCartArt({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 200 140" className={className} {...artDefaults}>
      <path
        d="M50 58h100l-9 54a10 10 0 0 1-10 8H69a10 10 0 0 1-10-8l-9-54Z"
        fill="var(--paper-tint)"
        stroke="var(--ink-40)"
        strokeWidth="2.5"
      />
      <path d="M74 58 92 26m34 32-18-32" stroke="var(--ink-40)" strokeWidth="2.5" />
      <path d="M64 76h72m-68 16h64" stroke="var(--foil)" strokeWidth="2" strokeDasharray="3 6" />
      <circle cx="162" cy="112" r="9" fill="var(--mint-soft)" stroke="var(--mint)" strokeWidth="2.5" />
      <path d="M157 112h10" stroke="var(--mint)" strokeWidth="2.5" />
    </svg>
  );
}

/** Magnifier over a blister strip — no search results. */
export function EmptySearchArt({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 200 140" className={className} {...artDefaults}>
      <rect
        x="34" y="44" width="92" height="56" rx="8"
        fill="var(--paper-tint)" stroke="var(--ink-40)" strokeWidth="2.5"
      />
      {[52, 76, 100].map((x) => (
        <circle key={x} cx={x} cy="63" r="7" fill="var(--paper-card)" stroke="var(--foil)" strokeWidth="2" />
      ))}
      {[52, 76].map((x) => (
        <circle key={x} cx={x} cy="84" r="7" fill="var(--paper-card)" stroke="var(--foil)" strokeWidth="2" />
      ))}
      <circle cx="134" cy="84" r="26" fill="var(--paper-card)" stroke="var(--ink)" strokeWidth="3" opacity="0.9" />
      <path d="m153 103 16 16" stroke="var(--ink)" strokeWidth="3.5" />
      <path d="M127 84h14m-7-7v14" stroke="var(--ink-40)" strokeWidth="2.5" />
    </svg>
  );
}

/** Prescription pad with an upward arrow — upload prompt. */
export function PrescriptionArt({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 200 140" className={className} {...artDefaults}>
      <rect
        x="58" y="18" width="84" height="104" rx="8"
        fill="var(--paper-card)" stroke="var(--ink-40)" strokeWidth="2.5"
      />
      <path d="M72 40h28m-28 16h56m-56 14h56m-56 14h40" stroke="var(--foil)" strokeWidth="2.5" />
      <path
        d="M74 30c0-4 3-6 6-6s6 2 6 6-3 6-6 6l10 12m-10-12h-6"
        stroke="var(--ink)" strokeWidth="2.5"
      />
      <circle cx="140" cy="104" r="22" fill="var(--mint-soft)" stroke="var(--mint)" strokeWidth="2.5" />
      <path d="M140 114V94m-8 8 8-8 8 8" stroke="var(--mint)" strokeWidth="3" />
    </svg>
  );
}

/** Three tablets reading 4 · 0 · 4 — not-found page. */
export function NotFoundArt({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 220 120" className={className} {...artDefaults}>
      {[
        { cx: 50, label: '4' },
        { cx: 110, label: '0' },
        { cx: 170, label: '4' },
      ].map(({ cx, label }) => (
        <g key={cx}>
          <circle cx={cx} cy="60" r="34" fill="var(--paper-tint)" stroke="var(--ink-40)" strokeWidth="2.5" />
          <path d={`M${cx - 24} 60h48`} stroke="var(--foil)" strokeWidth="2" />
          <text
            x={cx} y="52" textAnchor="middle"
            fill="var(--ink)" fontFamily="var(--font-data)" fontSize="22" fontWeight="600"
          >
            {label}
          </text>
        </g>
      ))}
    </svg>
  );
}

/** Tipped bottle with scattered tablets — error boundary. */
export function ErrorArt({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 200 140" className={className} {...artDefaults}>
      <g transform="rotate(-18 96 78)">
        <rect x="72" y="42" width="48" height="70" rx="8" fill="var(--paper-tint)" stroke="var(--ink-40)" strokeWidth="2.5" />
        <rect x="78" y="30" width="36" height="14" rx="4" fill="var(--paper-card)" stroke="var(--ink-40)" strokeWidth="2.5" />
        <rect x="80" y="62" width="32" height="28" rx="3" fill="var(--paper-card)" stroke="var(--foil)" strokeWidth="2" />
      </g>
      <circle cx="52" cy="116" r="6" fill="var(--paper-card)" stroke="var(--ink-40)" strokeWidth="2.5" />
      <circle cx="74" cy="124" r="6" fill="var(--paper-card)" stroke="var(--ink-40)" strokeWidth="2.5" />
      <circle cx="150" cy="120" r="6" fill="var(--paper-card)" stroke="var(--ink-40)" strokeWidth="2.5" />
      <path d="M156 34v16m0 8v.5" stroke="var(--ink)" strokeWidth="3.5" />
    </svg>
  );
}

/** Sealed parcel with a mint check — order success. */
export function OrderSuccessArt({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 200 140" className={className} {...artDefaults}>
      <path
        d="M56 56l44-20 44 20v44l-44 20-44-20V56Z"
        fill="var(--paper-tint)" stroke="var(--ink-40)" strokeWidth="2.5"
      />
      <path d="M56 56l44 20 44-20M100 76v44" stroke="var(--ink-40)" strokeWidth="2.5" />
      <circle cx="148" cy="44" r="20" fill="var(--mint)" stroke="var(--mint)" strokeWidth="2" />
      <path d="m139 44 6 6 12-12" stroke="var(--paper-card)" strokeWidth="3.5" />
    </svg>
  );
}

/**
 * Blister-pack sheet — decorative hero art. Drawn for dark navy surfaces:
 * strokes in --ink-10 / --paper, mint accents. Use with low opacity.
 */
export function BlisterHeroArt({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 260 200" className={className} {...artDefaults}>
      <rect
        x="20" y="24" width="220" height="152" rx="16"
        stroke="var(--ink-10)" strokeWidth="2" opacity="0.5"
      />
      {[0, 1, 2].map((row) =>
        [0, 1, 2, 3].map((col) => (
          <g key={`${row}-${col}`}>
            <circle
              cx={62 + col * 46}
              cy={64 + row * 38}
              r="14"
              stroke="var(--ink-10)"
              strokeWidth="2"
              opacity="0.6"
            />
            <circle
              cx={62 + col * 46}
              cy={64 + row * 38}
              r="7"
              fill={row === 1 && col === 2 ? 'var(--mint)' : 'var(--paper)'}
              opacity={row === 1 && col === 2 ? 1 : 0.35}
            />
          </g>
        ))
      )}
    </svg>
  );
}

/** Delivery van with a parcel — shipping / tracking. */
export function ShippingArt({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 220 140" className={className} {...artDefaults}>
      <rect x="24" y="46" width="96" height="52" rx="6" fill="var(--paper-tint)" stroke="var(--ink-40)" strokeWidth="2.5" />
      <path
        d="M120 60h34l22 22v16h-56V60Z"
        fill="var(--paper-card)" stroke="var(--ink-40)" strokeWidth="2.5"
      />
      <path d="M126 66v16h24l-14-16h-10Z" fill="var(--paper-tint)" stroke="var(--foil)" strokeWidth="2" />
      <circle cx="56" cy="102" r="11" fill="var(--paper-card)" stroke="var(--ink)" strokeWidth="2.5" />
      <circle cx="152" cy="102" r="11" fill="var(--paper-card)" stroke="var(--ink)" strokeWidth="2.5" />
      <path d="M56 58h32m-32 14h20" stroke="var(--mint)" strokeWidth="2.5" />
      <path d="M8 70h8m-12 14h12" stroke="var(--foil)" strokeWidth="2.5" />
    </svg>
  );
}
