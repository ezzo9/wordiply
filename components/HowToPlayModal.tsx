import Link from "next/link";
import { GuessRow } from "./GuessRow";
import { Logo } from "./Logo";
import { Modal } from "./Modal";
import { Tile } from "./Tile";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-tile text-base font-bold text-stone-900 dark:text-white">{title}</h2>
      <div className="mt-1.5 flex flex-col gap-2 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
        {children}
      </div>
    </div>
  );
}

export function HowToPlayModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-[#dcb0cf] pb-3 dark:border-stone-700">
          <Logo size="sm" monochromeNavy />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg text-stone-500 hover:bg-stone-900/5 dark:text-stone-400 dark:hover:bg-white/10"
          >
            ×
          </button>
        </div>

        <h1 className="font-tile text-xl font-bold text-stone-900 dark:text-white">How to play</h1>

        <div className="flex flex-col gap-4">
          <Section title="The rules">
            <p>
              Every puzzle gives you a short starter fragment — 3 to 6 letters. Your job is to find
              the longest real word that contains those letters, in that exact order, anywhere
              inside it. It doesn&apos;t need to be at the start of the word.
            </p>
            <p>
              You get 5 guesses per puzzle. Each guess must be a real word from our dictionary (over
              170,000 English words), and you can&apos;t repeat a guess you&apos;ve already made.
              Every valid word you find adds to your score, so use your guesses wisely.
            </p>
          </Section>

          <Section title="A worked example">
            <p>Say the starter is:</p>
            <div className="flex justify-center gap-1.5 py-1">
              {"MARC".split("").map((letter, i) => (
                <Tile key={i} letter={letter} size="lg" variant="starter" />
              ))}
            </div>
            <p>
              &ldquo;MARCH&rdquo; contains it, so it&apos;s a valid guess. If the longest word we
              could find for this starter were &ldquo;MARCHIONESS&rdquo; (11 letters), guessing
              MARCH would score:
            </p>
            <GuessRow word="MARCH" starter="MARC" />
          </Section>

          <Section title="Scoring">
            <p>
              <span className="font-semibold text-stone-800 dark:text-stone-100">Length score</span>{" "}
              is your single best guess, shown as a percentage of the longest possible word for that
              puzzle: <code className="rounded bg-stone-100 px-1 py-0.5 text-xs dark:bg-stone-900">round(best guess length ÷ longest possible length × 100)</code>.
            </p>
            <p>
              <span className="font-semibold text-stone-800 dark:text-stone-100">Letter score</span>{" "}
              adds up the length of every guess you submit — not just your best one. The more real
              words you find within your 5 guesses, the higher it climbs.
            </p>
          </Section>

          <Section title="Reveal">
            <p>
              Stuck? The <span className="font-semibold text-stone-800 dark:text-stone-100">Reveal</span> button
              ends the puzzle immediately and shows the longest word we found. Your score is based
              only on the guesses you&apos;d already made before revealing — so it&apos;s a fine way
              to bail out, but it won&apos;t boost your score.
            </p>
          </Section>

          <Section title="Daily vs. Unlimited">
            <p>
              <span className="font-semibold text-stone-800 dark:text-stone-100">Daily</span> gives
              you one puzzle a day — the same one for everyone, based on the date. Come back
              tomorrow for a new one.
            </p>
            <p>
              <span className="font-semibold text-stone-800 dark:text-stone-100">Unlimited</span>{" "}
              serves a random puzzle from our pool each time. We track what you&apos;ve played on
              this device so you won&apos;t see a repeat until you&apos;ve been through the whole
              pool.
            </p>
          </Section>

          <Section title="Custom puzzles">
            <p>
              Want to challenge a friend?{" "}
              <Link
                href="/custom"
                className="font-semibold text-[#33397d] underline underline-offset-2 dark:text-white"
              >
                Create your own puzzle
              </Link>{" "}
              by picking the starter letters yourself, then send them the link — they&apos;ll play
              your exact puzzle and try to beat your score.
            </p>
          </Section>
        </div>
      </div>
    </Modal>
  );
}
