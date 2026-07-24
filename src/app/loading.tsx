export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--paper)]">
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
