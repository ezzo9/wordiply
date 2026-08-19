import { Footer } from "./Footer";
import { ScatteredLetters } from "./ScatteredLetters";

/** Shared page chrome: scattered-letter background + centered, mobile-first column. Footer always sits in normal flow at the end, on every screen size. */
export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-dvh flex-col bg-background">
      <ScatteredLetters />
      <div className="relative mx-auto flex w-full max-w-md flex-col px-6 py-6 sm:py-16">
        <div className="flex flex-col">{children}</div>
        <Footer />
      </div>
    </main>
  );
}
