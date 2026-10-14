import {
  BlobError,
  BlobPreconditionFailedError,
  get,
  put,
} from "@vercel/blob";
import {
  parseSponsorStore,
  serializeSponsorStore,
  type Sponsor,
} from "@/lib/sponsors";

/** Private blob. One document so a homepage read is a single fetch. */
export const SPONSORS_BLOB_PATH = "sponsors/featured.json";

const WRITE_ATTEMPTS = 5;

type SponsorDocument = {
  sponsors: Sponsor[];
  etag: string | null;
};

type Mutation = {
  sponsors: Sponsor[];
  changed: boolean;
};

type MemoryState = {
  sponsors: Sponsor[];
  etag: string;
};

const memoryGlobal = globalThis as typeof globalThis & {
  __soundstackSponsorMemory?: MemoryState;
};

function memoryState(): MemoryState {
  memoryGlobal.__soundstackSponsorMemory ??= { sponsors: [], etag: "0" };
  return memoryGlobal.__soundstackSponsorMemory;
}

/**
 * In-process store for the signed-webhook test and `next dev`.
 * Ignored when NODE_ENV is production so a stray env var cannot drop
 * live sponsors on a cold start.
 */
export function isMemorySponsorStore(): boolean {
  return (
    process.env.SPONSOR_STORE === "memory" &&
    process.env.NODE_ENV !== "production"
  );
}

/** Clears the in-process store. Production blob data is untouched. */
export function resetSponsorStoreForTests(): void {
  memoryGlobal.__soundstackSponsorMemory = { sponsors: [], etag: "0" };
}

/**
 * True when the Blob SDK can authenticate.
 * On Vercel, connect a private Blob store so the project receives
 * BLOB_STORE_ID and a short-lived VERCEL_OIDC_TOKEN.
 * BLOB_READ_WRITE_TOKEN is the fallback for local and non-Vercel hosts.
 */
export function isSponsorStoreConfigured(): boolean {
  if (isMemorySponsorStore()) return true;
  if (process.env.BLOB_READ_WRITE_TOKEN?.trim()) return true;
  return Boolean(
    process.env.BLOB_STORE_ID?.trim() && process.env.VERCEL_OIDC_TOKEN?.trim(),
  );
}

export async function listSponsors(): Promise<Sponsor[]> {
  if (!isSponsorStoreConfigured()) return [];

  try {
    const document = await readSponsorDocument();
    return document.sponsors;
  } catch (error) {
    console.error("[soundstack] could not read sponsors", error);
    return [];
  }
}

/** Like listSponsors, but a read failure or missing store throws. */
export async function listSponsorsStrict(): Promise<Sponsor[]> {
  if (!isSponsorStoreConfigured()) {
    throw new Error(
      "Sponsor store is not configured. Connect a private Vercel Blob store or set BLOB_READ_WRITE_TOKEN.",
    );
  }
  const document = await readSponsorDocument();
  return document.sponsors;
}

export async function saveSponsor(
  incoming: Sponsor,
): Promise<{ sponsor: Sponsor; created: boolean }> {
  let created = false;
  let stored = incoming;

  await mutateSponsors((sponsors) => {
    const index = sponsors.findIndex((row) => row.id === incoming.id);
    if (index === -1) {
      created = true;
      stored = incoming;
      return { sponsors: [...sponsors, incoming], changed: true };
    }

    const previous = sponsors[index];
    stored = {
      ...incoming,
      includedInNewsletter: previous.includedInNewsletter,
      ownerAlertSent: previous.ownerAlertSent,
      buyerAlertSent: previous.buyerAlertSent,
    };
    const next = sponsors.slice();
    next[index] = stored;
    return {
      sponsors: next,
      changed: JSON.stringify(previous) !== JSON.stringify(stored),
    };
  });

  return { sponsor: stored, created };
}

export async function markSponsorsIncluded(ids: string[]): Promise<string[]> {
  const wanted = new Set(ids);
  const sponsors = await mutateSponsors((current) => {
    let changed = false;
    const next = current.map((sponsor) => {
      if (!wanted.has(sponsor.id) || sponsor.includedInNewsletter) return sponsor;
      changed = true;
      return { ...sponsor, includedInNewsletter: true };
    });
    return { sponsors: next, changed };
  });

  return sponsors
    .filter((sponsor) => wanted.has(sponsor.id) && sponsor.includedInNewsletter)
    .map((sponsor) => sponsor.id);
}

export async function markSponsorAlerts(
  id: string,
  flags: { ownerAlertSent: boolean; buyerAlertSent: boolean },
): Promise<void> {
  await mutateSponsors((sponsors) => {
    const index = sponsors.findIndex((sponsor) => sponsor.id === id);
    if (index === -1) return { sponsors, changed: false };

    const current = sponsors[index];
    const nextSponsor: Sponsor = {
      ...current,
      ownerAlertSent: current.ownerAlertSent || flags.ownerAlertSent,
      buyerAlertSent: current.buyerAlertSent || flags.buyerAlertSent,
    };
    if (
      nextSponsor.ownerAlertSent === current.ownerAlertSent &&
      nextSponsor.buyerAlertSent === current.buyerAlertSent
    ) {
      return { sponsors, changed: false };
    }

    const next = sponsors.slice();
    next[index] = nextSponsor;
    return { sponsors: next, changed: true };
  });
}

async function mutateSponsors(
  mutate: (sponsors: Sponsor[]) => Mutation,
): Promise<Sponsor[]> {
  if (!isSponsorStoreConfigured()) {
    throw new Error(
      "Sponsor store is not configured. Connect a private Vercel Blob store or set BLOB_READ_WRITE_TOKEN.",
    );
  }

  if (isMemorySponsorStore()) {
    const state = memoryState();
    const result = mutate(state.sponsors.map(cloneSponsor));
    if (result.changed) {
      state.sponsors = result.sponsors.map(cloneSponsor);
      state.etag = String(Number(state.etag) + 1);
    }
    return state.sponsors.map(cloneSponsor);
  }

  for (let attempt = 0; attempt < WRITE_ATTEMPTS; attempt += 1) {
    const current = await readSponsorDocument();
    const result = mutate(current.sponsors);
    if (!result.changed) return result.sponsors;

    try {
      await put(SPONSORS_BLOB_PATH, serializeSponsorStore(result.sponsors), {
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: Boolean(current.etag),
        contentType: "application/json",
        cacheControlMaxAge: 60,
        ...(current.etag ? { ifMatch: current.etag } : {}),
      });
      return result.sponsors;
    } catch (error) {
      if (!isWriteConflict(error) || attempt === WRITE_ATTEMPTS - 1) throw error;
    }
  }

  throw new Error("Could not write sponsors.");
}

async function readSponsorDocument(): Promise<SponsorDocument> {
  if (isMemorySponsorStore()) {
    const state = memoryState();
    return {
      sponsors: state.sponsors.map(cloneSponsor),
      etag: state.etag === "0" ? null : state.etag,
    };
  }

  const result = await get(SPONSORS_BLOB_PATH, {
    access: "private",
    useCache: false,
  });

  if (!result || result.statusCode !== 200 || !result.stream) {
    return { sponsors: [], etag: null };
  }

  const text = await new Response(result.stream).text();
  if (!text.trim()) return { sponsors: [], etag: result.blob.etag };
  return { sponsors: parseSponsorStore(text), etag: result.blob.etag };
}

function cloneSponsor(sponsor: Sponsor): Sponsor {
  return { ...sponsor };
}

function isWriteConflict(error: unknown): boolean {
  if (error instanceof BlobPreconditionFailedError) return true;
  return (
    error instanceof BlobError &&
    /already exists|precondition|conditional|overwrite|conflict/i.test(error.message)
  );
}
