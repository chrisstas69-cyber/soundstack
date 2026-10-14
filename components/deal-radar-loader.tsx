import { DealRadar } from "@/components/deal-radar";
import { listSponsors } from "@/lib/sponsor-store";
import { mergeSponsorsIntoDeals } from "@/lib/sponsors";
import type { Deal } from "@/lib/types";
import { connection } from "next/server";

export async function DealRadarLoader({ deals }: { deals: Deal[] }) {
  await connection();
  const today = new Date().toISOString().slice(0, 10);
  const sponsors = await listSponsors();
  return (
    <DealRadar
      deals={mergeSponsorsIntoDeals(deals, sponsors, today)}
      today={today}
    />
  );
}
