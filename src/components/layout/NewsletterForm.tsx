"use client";

import { useState, FormEvent } from "react";
import { Button } from "@/components/ui/button";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to subscribe");
      }

      setEmail("");
      setStatus("success");
      // Auto-clear success after 5 seconds
      setTimeout(() => setStatus("idle"), 5000);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong";
      setErrorMessage(message);
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-2">
        <label htmlFor="newsletter-email" className="block text-sm font-semibold text-[var(--ink)]">
          Subscribe to updates
        </label>
        <div className="flex gap-2">
          <input
            id="newsletter-email"
            type="email"
            name="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={status === "loading"}
            required
            className="flex-1 px-3 py-2 rounded-[var(--radius-md)] border border-[var(--foil-soft)] bg-[var(--paper-card)] text-[var(--ink)] placeholder:text-[var(--ink-40)] focus:outline-none focus:ring-2 focus:ring-[var(--mint)] focus:ring-offset-0 disabled:opacity-50 min-h-11"
          />
          <Button
            type="submit"
            disabled={status === "loading" || !email}
            className="min-h-11 px-4 bg-[var(--mint)] text-[var(--paper-card)] hover:opacity-90 disabled:opacity-50"
          >
            {status === "loading" ? "Subscribing..." : "Subscribe"}
          </Button>
        </div>
      </div>

      {status === "success" && (
        <p className="text-sm text-[var(--mint)]">You&apos;re subscribed.</p>
      )}

      {status === "error" && (
        <p className="text-sm text-[var(--ink-70)]">{errorMessage}</p>
      )}
    </form>
  );
}
