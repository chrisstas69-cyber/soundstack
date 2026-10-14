"use client";

import { useState, type FormEvent } from "react";

type Status =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "success"; alreadySubscribed: boolean }
  | { state: "error"; message: string };

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState<Status>({ state: "idle" });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ state: "loading" });

    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, company }),
      });
      const payload = (await response.json()) as { error?: string; alreadySubscribed?: boolean };

      if (!response.ok) {
        setStatus({
          state: "error",
          message: payload.error ?? "Could not subscribe just now.",
        });
        return;
      }

      setEmail("");
      setStatus({ state: "success", alreadySubscribed: Boolean(payload.alreadySubscribed) });
    } catch {
      setStatus({ state: "error", message: "Could not reach the signup service." });
    }
  }

  const message =
    status.state === "success"
      ? status.alreadySubscribed
        ? "That email is already on the list."
        : "You're on the list."
      : status.state === "error"
        ? status.message
        : "";

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-md flex-col gap-2" noValidate>
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <label htmlFor="company">Company</label>
        <input
          id="company"
          name="company"
          tabIndex={-1}
          autoComplete="off"
          value={company}
          onChange={(event) => setCompany(event.target.value)}
        />
      </div>
      <label htmlFor="email" className="text-xs uppercase tracking-[0.16em] text-faint">
        Email
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          placeholder="you@studio.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="h-11 min-w-0 flex-1 rounded-full border border-line bg-background px-4 text-sm text-foreground outline-none placeholder:text-faint focus-visible:border-accent"
        />
        <button
          type="submit"
          disabled={status.state === "loading"}
          className="h-11 rounded-full border border-foreground/20 px-4 text-sm text-foreground transition-colors hover:border-accent hover:text-accent disabled:cursor-wait disabled:opacity-60"
        >
          {status.state === "loading" ? "Sending…" : "Subscribe"}
        </button>
      </div>
      <p role="status" aria-live="polite" className="min-h-5 text-sm text-muted">
        {message}
      </p>
    </form>
  );
}
