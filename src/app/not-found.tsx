import { EmptyState } from "@/components/shared/EmptyState";

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen p-8 bg-[var(--paper)]">
      <EmptyState
        title="Page not found"
        description="Could not find the requested resource"
        action={{ label: "Return home", href: "/" }}
      />
    </div>
  );
}
