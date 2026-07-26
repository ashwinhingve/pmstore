import Image from "next/image";
import { cn } from "@/lib/utils";
import { isRepresentativeImage } from "@/lib/pharma/medicine-image";
import { getCategoryTint, getFormGlyph } from "@/lib/pharma/medicine-visual";

interface ProductVisualProps {
  /** Raw image URL from the product (may be null or a placeholder). */
  imageUrl?: string | null;
  form?: string | null;
  category?: string | null;
  name: string;
  sizes?: string;
  priority?: boolean;
  /** Photo fit — 'cover' for grid cards, 'contain' for the detail gallery. */
  fit?: "cover" | "contain";
  className?: string;
}

/**
 * The product visual. Renders the real uploaded photo when there is one;
 * otherwise a **designed tile** — a soft category tint + the dosage-form glyph —
 * instead of a repeated stock photo, so every medicine reads as distinct. The
 * tile is honest (clearly not a pack shot), which retires the old
 * "Representative" overlay. Fills its parent, which sets the aspect box.
 */
export function ProductVisual({
  imageUrl,
  form,
  category,
  name,
  sizes = "(max-width: 768px) 50vw, 25vw",
  priority = false,
  fit = "cover",
  className,
}: ProductVisualProps) {
  const hasPhoto = !isRepresentativeImage(imageUrl) && !!imageUrl;

  if (hasPhoto) {
    return (
      <div
        className={cn("relative h-full w-full", className)}
        style={{ backgroundColor: "var(--paper-tint)" }}
      >
        <Image
          src={imageUrl as string}
          alt={name}
          fill
          sizes={sizes}
          priority={priority}
          loading={priority ? undefined : "lazy"}
          className={fit === "contain" ? "object-contain p-3" : "object-cover"}
        />
      </div>
    );
  }

  const tint = getCategoryTint(category);
  const Glyph = getFormGlyph(form);

  return (
    <div
      className={cn("relative h-full w-full overflow-hidden", className)}
      style={{ backgroundColor: tint.bg }}
      role="img"
      aria-label={name}
    >
      {/* Oversized faint motif — quiet depth without inventing a gradient. */}
      <Glyph
        className="absolute -bottom-6 -right-6 h-2/3 w-2/3"
        style={{ color: tint.fg, opacity: 0.09 }}
        strokeWidth={1.25}
        aria-hidden="true"
      />
      {/* The dosage-form glyph, centered. */}
      <div className="absolute inset-0 flex items-center justify-center">
        <Glyph
          className="h-[36%] w-[36%]"
          style={{ color: tint.fg, opacity: 0.9 }}
          strokeWidth={1.5}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
