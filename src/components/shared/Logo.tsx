import { SITE_SHORT_NAME, SITE_SLOGAN } from "@/lib/constants";

interface LogoProps {
  size?: number;
  variant?: "mark" | "full";
  /** Show the slogan under the wordmark (only meaningful with variant="full"). */
  withSlogan?: boolean;
  className?: string;
}

/**
 * PM Store logo — a medical cross whose vertical bar is a pharmaceutical
 * capsule. Navy cross + mint pill: pharmacy at a glance, premium and legible
 * from favicon to hero.
 *
 * - `mark`: symbol only (nav, favicon, footer).
 * - `full`: symbol + "PM Store" wordmark ("PM" emphasised), optionally the slogan.
 *
 * The pill is always mint (`--mint`) — legible on both paper and the navy footer
 * band. The cross arms and wordmark use `currentColor`, so they turn navy on
 * light surfaces and paper on dark ones — set the surrounding text color and the
 * logo adapts. The static assets (public/logo.svg, app-icon.svg, src/app/icon.svg)
 * mirror this artwork.
 */
export function Logo({
  size = 40,
  variant = "mark",
  withSlogan = false,
  className = "",
}: LogoProps) {
  const mark = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label={`${SITE_SHORT_NAME} mark`}
    >
      {/* Cross arm — horizontal, adapts to the surface. */}
      <rect x="11" y="26" width="42" height="12" rx="6" fill="currentColor" />
      {/* Pill — the vertical bar of the cross, always mint. */}
      <rect x="26" y="8" width="12" height="48" rx="6" className="fill-[var(--mint)]" />
      {/* Capsule seam. */}
      <rect x="26.8" y="30.8" width="10.4" height="2.2" rx="1" className="fill-[var(--paper-card)]" opacity="0.9" />
      {/* Soft highlight for a glassy, premium finish. */}
      <rect x="28.6" y="12" width="2.6" height="13" rx="1.3" className="fill-[var(--paper-card)]" opacity="0.4" />
    </svg>
  );

  if (variant === "full") {
    const wordmarkFontSize = Math.max(15, size * 0.5);
    const [first, ...rest] = SITE_SHORT_NAME.split(" ");
    return (
      <div className="flex items-center gap-2.5">
        {mark}
        <span className="flex flex-col leading-none">
          <span
            className="font-[family-name:var(--font-display)] tracking-tight"
            style={{ fontSize: `${wordmarkFontSize}px`, color: "currentColor" }}
          >
            <span className="font-extrabold">{first}</span>
            {rest.length > 0 && <span className="font-medium opacity-90"> {rest.join(" ")}</span>}
          </span>
          {withSlogan && (
            <span
              className="mt-1 font-medium opacity-70"
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
