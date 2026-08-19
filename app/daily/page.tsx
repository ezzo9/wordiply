import type { Metadata } from "next";
import { GameScreen } from "@/components/GameScreen";
import { PageShell } from "@/components/PageShell";

export const metadata: Metadata = {
  title: { absolute: "Wordiply Game Daily" },
  description:
    "Wordiply Daily: today's word puzzle. Find the longest word containing the starter letters. One new puzzle every day, free.",
  alternates: { canonical: "/daily" },
};

export default function DailyPage() {
  return (
    <PageShell>
      <GameScreen mode="daily" />
    </PageShell>
  );
}
