import { SITE_SHORT_NAME, SITE_SLOGAN } from "@/lib/constants";

interface LogoProps {
  size?: number;
  variant?: "mark" | "full";
  /** Show the slogan under the wordmark (only meaningful with variant="full"). */
  withSlogan?: boolean;
  className?: string;
}

/**
 * PM Store logo — a pharmaceutical capsule holding a stylized "P".
 *
 * - `mark`: icon only (nav, favicon, footer).
 * - `full`: icon + "PM Store" wordmark, optionally with the slogan.
 *
 * Two-tone by design: the capsule is always mint (`--mint`, the brand accent,
 * legible on both paper and the navy footer band); the "P" and wordmark use
 * `currentColor`, so they turn navy on light surfaces and paper on dark ones —
 * set the surrounding text color and the logo adapts.
 */
export function Logo({
  size = 40,
  variant = "mark",
  withSlogan = false,
  className = "",
}: LogoProps) {
  const viewBoxSize = 64;

  const mark = (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label={`${SITE_SHORT_NAME} mark`}
    >
      {/* Capsule — mint outline with a soft mint wash. rx = height/2 → stadium. */}
      <rect
        x="6"
        y="18"
        width="52"
        height="28"
        rx="14"
        className="fill-[var(--mint-soft)] stroke-[var(--mint)]"
        strokeWidth="3.5"
      />
      {/* Capsule seam — the two-piece joint, in mint. */}
      <path
        d="M32 19.5 V44.5"
        className="stroke-[var(--mint)]"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.55"
      />
      {/* "P" — stem + bowl, in currentColor so it adapts to the surface. */}
      <path
        d="M22 21 V43"
        stroke="currentColor"
        strokeWidth="4.25"
        strokeLinecap="round"
      />
      <path
        d="M22 21 H30 A7 7 0 0 1 30 34 H22"
        fill="none"
        stroke="currentColor"
        strokeWidth="4.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  if (variant === "full") {
    const wordmarkFontSize = Math.max(15, size * 0.5);
    return (
      <div className="flex items-center gap-2.5">
        {mark}
        <span className="flex flex-col leading-none">
          <span
            className="font-[family-name:var(--font-display)] font-extrabold tracking-tight"
            style={{ fontSize: `${wordmarkFontSize}px`, color: "currentColor" }}
          >
            {SITE_SHORT_NAME}
          </span>
          {withSlogan && (
            <span
              className="mt-1 font-medium opacity-75"
              style={{ fontSize: `${Math.max(10, wordmarkFontSize * 0.42)}px` }}
            >
              {SITE_SLOGAN}
            </span>
          )}
        </span>
      </div>
    );
  }

  return mark;
}
