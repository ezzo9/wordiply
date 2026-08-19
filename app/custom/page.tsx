import type { Metadata } from "next";
import { CustomModeScreen } from "@/components/CustomModeScreen";
import { PageShell } from "@/components/PageShell";

interface CustomPageProps {
  searchParams: { s?: string };
}

export function generateMetadata({ searchParams }: CustomPageProps): Metadata {
  const hasStarter = typeof searchParams.s === "string" && searchParams.s.length > 0;
  return {
    title: hasStarter ? "Custom Puzzle" : { absolute: "Wordiply Custom Puzzle | Challenge a Friend" },
    description: hasStarter
      ? "Someone challenged you to a custom Wordiply puzzle. Find the longest word containing their starter letters."
      : "Create your own Wordiply puzzle: pick starter letters and share the link with a friend to see who finds the longest word.",
    alternates: { canonical: "/custom" },
    // Individual shared puzzles (?s=...) are user-generated and ephemeral,
    // not meaningful to index, and there are effectively unlimited variants.
    // The creation page itself (no ?s=) is real, stable content and stays
    // indexable normally.
    robots: hasStarter ? { index: false, follow: true } : undefined,
  };
}

export default function CustomPage({ searchParams }: CustomPageProps) {
  return (
    <PageShell>
      <CustomModeScreen initialStarter={searchParams.s} />
    </PageShell>
  );
}
