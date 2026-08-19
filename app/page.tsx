import type { Metadata } from "next";
import { GameScreen } from "@/components/GameScreen";
import { PageShell } from "@/components/PageShell";

export const metadata: Metadata = {
  description:
    "Play Wordiply Unlimited: find the longest word containing your starter letters. No daily limit, new puzzles anytime, free to play.",
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <PageShell>
      <GameScreen mode="unlimited" />
    </PageShell>
  );
}
