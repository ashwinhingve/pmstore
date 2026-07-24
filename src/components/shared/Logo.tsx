interface LogoProps {
  size?: number;
  variant?: "mark" | "full";
  className?: string;
}

/**
 * Pratigya Medical Store logo component.
 *
 * Concept: A pharmaceutical capsule containing a stylized "P" mark.
 * - mark: icon only (suitable for favicons, nav icons)
 * - full: icon + "Pratigya Medical Store" wordmark
 *
 * Colors use CSS tokens: --ink (navy) and --mint (green).
 * Scales cleanly from 24px to 64px and beyond.
 */
export function Logo({ size = 40, variant = "mark", className = "" }: LogoProps) {
  const viewBoxSize = 64;
  const markSize = size;
  const wordmarkFontSize = Math.max(12, size * 0.45);

  const mark = (
    <svg
      width={markSize}
      height={markSize}
      viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Pratigya Medical Store mark"
    >
      {/* Capsule outline (rounded rectangle) in mint */}
      <rect
        x="10"
        y="16"
        width="44"
        height="32"
        rx="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />

      {/* Stylized "P" mark in the center, formed by geometric shapes */}
      {/* Vertical stem of P */}
      <rect x="22" y="18" width="3" height="28" fill="currentColor" />

      {/* Rounded top loop of P */}
      <path
        d="M 25 18 Q 35 18 35 26 Q 35 34 25 34"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  if (variant === "full") {
    return (
      <div className="flex items-center gap-2">
        {mark}
        <span
          className="font-bold text-[var(--ink)] leading-tight"
          style={{ fontSize: `${wordmarkFontSize}px` }}
        >
          Pratigya
          <br />
          Medical Store
        </span>
      </div>
    );
  }

  return mark;
}
