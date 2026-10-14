"use client";

import { useState, type FormEvent } from "react";

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; alreadySubscribed: boolean }
  | { kind: "error"; message: string };

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ kind: "loading" });

    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = (await response.json()) as {
        error?: string;
        alreadySubscribed?: boolean;
      };

      if (!response.ok) {
        setStatus({
          kind: "error",
          message: payload.error || "Could not join the list.",
        });
        return;
      }

      setEmail("");
      setStatus({
        kind: "success",
        alreadySubscribed: Boolean(payload.alreadySubscribed),
      });
    } catch {
      setStatus({
        kind: "error",
        message: "Network error. Try again in a moment.",
      });
    }
  }

  const message =
    status.kind === "success"
      ? status.alreadySubscribed
        ? "You are already on the list."
        : "You are on the list."
      : status.kind === "error"
        ? status.message
        : "";

  return (
    <form onSubmit={onSubmit} className="mt-6">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="sr-only" htmlFor="newsletter-email">
          Email address
        </label>
        <input
          id="newsletter-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@studio.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="h-12 min-w-0 flex-1 rounded-full border border-line bg-ink px-4 text-sm text-bone outline-none placeholder:text-mute"
        />
        <button
          type="submit"
          disabled={status.kind === "loading"}
          className="h-12 rounded-full bg-bone px-5 text-sm font-medium text-ink transition-colors hover:bg-white disabled:opacity-60"
        >
          {status.kind === "loading" ? "Adding…" : "Get the list"}
        </button>
      </div>
      <p
        aria-live="polite"
        className={`mt-3 min-h-5 text-sm ${status.kind === "error" ? "text-signal" : "text-bone"}`}
      >
        {message}
      </p>
    </form>
  );
}
