"use client";

import { useState, type FormEvent } from "react";

type Status =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "success"; alreadySubscribed: boolean }
  | { state: "error"; message: string };

export function NewsletterForm({
  id = "email",
  layout = "inline",
}: {
  id?: string;
  layout?: "inline" | "stacked";
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>({ state: "idle" });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ state: "loading" });

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
          state: "error",
          message: payload.error ?? "Could not subscribe just now.",
        });
        return;
      }

      setEmail("");
      setStatus({
        state: "success",
        alreadySubscribed: Boolean(payload.alreadySubscribed),
      });
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

  const field = (
    <>
      <label htmlFor={id} className={layout === "inline" ? "sr-only" : "text-xs uppercase tracking-[0.16em] text-faint"}>
        Email
      </label>
      <div className={layout === "inline" ? "flex w-full gap-2 sm:w-auto" : "flex flex-col gap-2 sm:flex-row"}>
        <input
          id={id}
          name="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          placeholder="you@studio.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="h-10 min-w-0 flex-1 rounded-full border border-line bg-background px-4 text-base text-foreground outline-none placeholder:text-faint focus-visible:border-accent sm:w-56"
        />
        <button
          type="submit"
          disabled={status.state === "loading"}
          className="h-10 shrink-0 rounded-full border border-foreground/20 px-4 text-sm text-foreground transition-colors hover:border-accent hover:text-accent disabled:cursor-wait disabled:opacity-60"
        >
          {status.state === "loading" ? "Sending…" : "Subscribe"}
        </button>
      </div>
    </>
  );

  const statusLine = (
    <p role="status" aria-live="polite" className={message ? "text-sm text-muted" : "sr-only"}>
      {message}
    </p>
  );

  if (layout === "stacked") {
    return (
      <form onSubmit={onSubmit} className="flex w-full max-w-md flex-col gap-2">
        {field}
        {statusLine}
      </form>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-serif text-lg leading-none tracking-tight text-foreground sm:text-xl">
            The list, once a day.
          </p>
          <p className="mt-1 text-sm text-muted">
            New sales, free presets, and packs. Nothing else from us.
          </p>
        </div>
        <div className="w-full sm:max-w-md sm:shrink-0">{field}</div>
      </div>
      {statusLine}
    </form>
  );
}
