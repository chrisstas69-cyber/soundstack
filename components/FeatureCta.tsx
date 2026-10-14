function paymentLink(): string | null {
  const value = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK?.trim();
  if (!value) return null;

  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

const LABEL = "Feature Your Plugin / Pack ($149)";

export function FeatureCta({ prominent = false }: { prominent?: boolean }) {
  const href = paymentLink();
  const className = prominent
    ? "inline-flex items-center justify-center rounded-full bg-accent px-5 py-3 text-sm font-medium text-accent-ink transition-transform hover:-translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    : "inline-flex items-center justify-center rounded-full bg-accent px-3.5 py-2 text-center text-[13px] font-medium leading-tight text-accent-ink transition-transform hover:-translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:text-sm";

  if (!href) {
    return (
      <button
        type="button"
        disabled
        aria-disabled="true"
        title="Set NEXT_PUBLIC_STRIPE_PAYMENT_LINK to enable checkout"
        className={`${className} cursor-not-allowed opacity-45 hover:translate-y-0`}
      >
        {LABEL}
      </button>
    );
  }

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {LABEL}
    </a>
  );
}
