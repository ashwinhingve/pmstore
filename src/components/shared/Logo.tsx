import Image from "next/image";
import { SITE_SHORT_NAME, SITE_SLOGAN } from "@/lib/constants";

interface LogoProps {
  size?: number;
  variant?: "mark" | "full";
  /** Show the slogan under the wordmark (only meaningful with variant="full"). */
  withSlogan?: boolean;
  className?: string;
}

/**
 * PM Store logo — the brand lockup (the PM monogram cradled in hands, with a
 * medical cross and leaf). Rendered from the raster artwork
 * (public/pmstore-logo.png) — the same image behind the favicon, PWA icons and
 * social cards, so the brand reads identically from a browser tab to the hero.
 *
 * - `mark`: the logo in a clean white rounded badge, so it sits well on the
 *   orange header, the navy footer and paper alike.
 * - `full`: the badge plus the "PM Store" wordmark, optionally the slogan.
 *
 * The badge background is always `--paper-card` (white) to match the artwork's
 * own backdrop; the wordmark uses `currentColor`, so it adapts to the surface.
 */
export function Logo({
  size = 40,
  variant = "mark",
  withSlogan = false,
  className = "",
}: LogoProps) {
  const mark = (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-md)] bg-[var(--paper-card)] shadow-[var(--shadow-xs)] ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src="/pmstore-logo.png"
        alt={`${SITE_SHORT_NAME} logo`}
        width={size}
        height={size}
        className="h-full w-full object-contain"
      />
    </span>
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
