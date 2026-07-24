import { Logo } from "@/components/shared/Logo";

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--paper)]">
      {/* Logo with pulse animation */}
      <div className="mb-12 text-[var(--ink)]">
        <div
          className="animate-pulse"
          style={{
            animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
          }}
        >
          <Logo size={56} variant="mark" />
        </div>
      </div>

      {/* Skeleton grid */}
      <div className="grid grid-cols-3 gap-4">
        {[...Array(9)].map((_, i) => (
          <div
            key={i}
            className="w-24 h-24 bg-[var(--foil-soft)] rounded-[var(--radius-md)] animate-pulse"
            style={{
              animationDelay: `${i * 0.1}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
