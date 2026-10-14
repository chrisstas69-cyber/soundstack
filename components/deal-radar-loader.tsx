import { DealRadar } from "@/components/deal-radar";
import type { Deal } from "@/lib/types";
import { connection } from "next/server";

export async function DealRadarLoader({ deals }: { deals: Deal[] }) {
  await connection();
  const today = new Date().toISOString().slice(0, 10);
  return <DealRadar deals={deals} today={today} />;
}
