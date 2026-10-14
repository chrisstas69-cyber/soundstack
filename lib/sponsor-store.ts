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

/**
 * True when the Blob SDK can authenticate.
 * On Vercel, connect a private Blob store so the project receives
 * BLOB_STORE_ID and a short-lived VERCEL_OIDC_TOKEN.
 * BLOB_READ_WRITE_TOKEN is the fallback for local and non-Vercel hosts.
 */
export function isSponsorStoreConfigured(): boolean {
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

export async function saveSponsor(sponsor: Sponsor): Promise<void> {
  if (!isSponsorStoreConfigured()) {
    throw new Error(
      "Sponsor store is not configured. Connect a private Vercel Blob store or set BLOB_READ_WRITE_TOKEN.",
    );
  }

  for (let attempt = 0; attempt < WRITE_ATTEMPTS; attempt += 1) {
    const current = await readSponsorDocument();
    const next = upsertSponsor(current.sponsors, sponsor);

    try {
      await put(SPONSORS_BLOB_PATH, serializeSponsorStore(next), {
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: Boolean(current.etag),
        contentType: "application/json",
        cacheControlMaxAge: 60,
        ...(current.etag ? { ifMatch: current.etag } : {}),
      });
      return;
    } catch (error) {
      if (!isWriteConflict(error) || attempt === WRITE_ATTEMPTS - 1) throw error;
    }
  }
}

async function readSponsorDocument(): Promise<{
  sponsors: Sponsor[];
  etag: string | null;
}> {
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

function upsertSponsor(sponsors: Sponsor[], sponsor: Sponsor): Sponsor[] {
  const index = sponsors.findIndex((row) => row.id === sponsor.id);
  if (index === -1) return [...sponsors, sponsor];
  const next = sponsors.slice();
  next[index] = sponsor;
  return next;
}

function isWriteConflict(error: unknown): boolean {
  if (error instanceof BlobPreconditionFailedError) return true;
  return (
    error instanceof BlobError &&
    /already exists|precondition|conditional|overwrite|conflict/i.test(error.message)
  );
}
