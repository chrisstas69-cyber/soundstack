"use client";

import { useState, type FormEvent } from "react";

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success" }
  | { kind: "error"; message: string };

export function FeatureRequestForm() {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ kind: "loading" });
    const data = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/sponsors/feature-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          url,
          email,
          note,
          ss_hp: String(data.get("ss_hp") ?? ""),
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setStatus({
          kind: "error",
          message: payload.error || "Could not send that request.",
        });
        return;
      }

      setName("");
      setUrl("");
      setEmail("");
      setNote("");
      setStatus({ kind: "success" });
    } catch {
      setStatus({
        kind: "error",
        message: "Network error. Try again in a moment.",
      });
    }
  }

  const message =
    status.kind === "success"
      ? "Request sent. We will email you if the listing is featured."
      : status.kind === "error"
        ? status.message
        : "";

  return (
    <form onSubmit={onSubmit} className="relative mt-10 max-w-xl">
      <div className="grid gap-4">
        <Field
          id="feature-name"
          label="Product name"
          value={name}
          onChange={setName}
          required
          maxLength={120}
          autoComplete="off"
          placeholder="Tape Stop"
        />
        <Field
          id="feature-url"
          label="Product URL"
          value={url}
          onChange={setUrl}
          required
          type="text"
          inputMode="url"
          autoComplete="url"
          placeholder="https://example.com/tape-stop"
        />
        <Field
          id="feature-email"
          label="Contact email"
          value={email}
          onChange={setEmail}
          required
          type="email"
          autoComplete="email"
          placeholder="you@studio.com"
        />
        <label className="block" htmlFor="feature-note">
          <span className="text-xs uppercase tracking-[0.16em] text-faint">
            Short note
          </span>
          <textarea
            id="feature-note"
            name="note"
            required
            rows={4}
            maxLength={500}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Where producers can find it, and how you will share the listing."
            className="mt-2 w-full rounded-2xl border border-line bg-background px-4 py-3 text-sm text-foreground outline-none placeholder:text-faint focus-visible:border-accent"
          />
        </label>
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed top-0 left-[-10000px] h-px w-px overflow-hidden"
      >
        <label htmlFor="ss_hp">Website</label>
        <input
          id="ss_hp"
          name="ss_hp"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>
      <button
        type="submit"
        disabled={status.kind === "loading"}
        className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-accent px-5 text-sm font-medium text-accent-ink transition-transform hover:-translate-y-px disabled:opacity-60"
      >
        {status.kind === "loading" ? "Sending…" : "Request a free feature"}
      </button>
      <p
        aria-live="polite"
        className={`mt-3 min-h-5 text-sm ${status.kind === "error" ? "text-sale" : "text-foreground"}`}
      >
        {message}
      </p>
    </form>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  required,
  type = "text",
  placeholder,
  autoComplete,
  maxLength,
  inputMode,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  maxLength?: number;
  inputMode?: "url" | "email" | "text";
}) {
  return (
    <label className="block" htmlFor={id}>
      <span className="text-xs uppercase tracking-[0.16em] text-faint">
        {label}
      </span>
      <input
        id={id}
        name={id}
        type={type}
        required={required}
        value={value}
        maxLength={maxLength}
        autoComplete={autoComplete}
        inputMode={inputMode}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-12 w-full rounded-2xl border border-line bg-background px-4 text-sm text-foreground outline-none placeholder:text-faint focus-visible:border-accent"
      />
    </label>
  );
}
