"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { legacyCopyToClipboard } from "@/lib/clipboard";
import type { GameState, PersonalBestResult, Score } from "@/lib/game";
import { buildShareText, recordPersonalBest } from "@/lib/game";
import { Button } from "./Button";
import { CopyTextModal } from "./CopyTextModal";
import { GuessRow } from "./GuessRow";
import { Logo } from "./Logo";
import { Tile } from "./Tile";
import { useFitTileSize } from "./useFitTileSize";

export interface ResultsScreenProps {
  state: GameState;
  score: Score;
  onPlayAgain?: () => void;
  playAgainLabel?: string;
  crossLink: { href: string; label: string };
  /** Daily mode: shows "come back tomorrow" + a live countdown instead of the play-again button. */
  dailyResetCountdown?: boolean;
}

/** ms remaining until the next UTC midnight, when the daily puzzle rotates (see getDailyPuzzleIndex). */
function msUntilNextUTCMidnight(): number {
  const now = new Date();
  const nextMidnightUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return nextMidnightUTC - now.getTime();
}

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((n) => String(n).padStart(2, "0")).join(":");
}

/** Live-updating "time until tomorrow's daily puzzle" — ticks once a second while the results screen is open. */
function useDailyResetCountdown(active: boolean): string {
  const [remainingMs, setRemainingMs] = useState(() => msUntilNextUTCMidnight());

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => setRemainingMs(msUntilNextUTCMidnight()), 1000);
    return () => clearInterval(interval);
  }, [active]);

  return formatCountdown(remainingMs);
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <circle cx="15" cy="5" r="2.25" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="5" cy="10" r="2.25" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="15" cy="15" r="2.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 8.8 13 6M7 11.2 13 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function ResultsScreen({
  state,
  score,
  onPlayAgain,
  playAgainLabel = "Play again",
  crossLink,
  dailyResetCountdown = false,
}: ResultsScreenProps) {
  const { puzzle, guesses } = state;
  const [shareStatus, setShareStatus] = useState<"idle" | "shared" | "copied">("idle");
  const [personalBest, setPersonalBest] = useState<PersonalBestResult | null>(null);
  const [copyFallbackText, setCopyFallbackText] = useState<string | null>(null);
  const countdown = useDailyResetCountdown(dailyResetCountdown);
  const { containerRef: longestWordRef, tilePx: longestWordTilePx } = useFitTileSize(
    puzzle.longestWord.length,
    26
  );

  // Record once per finished game — this component is freshly mounted each
  // time a result is shown, so an effect keyed on the score itself only
  // ever fires the one time for this round.
  useEffect(() => {
    setPersonalBest(recordPersonalBest(score.lengthScore));
  }, [score.lengthScore]);

  async function handleShare() {
    const text = buildShareText(state, score);

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ text });
        setShareStatus("shared");
        setTimeout(() => setShareStatus("idle"), 2500);
      } catch {
        // User cancelled the native share sheet — respect that, no-op.
      }
      return;
    }

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        setShareStatus("copied");
        setTimeout(() => setShareStatus("idle"), 2500);
        return;
      } catch {
        // Clipboard write rejected (e.g. permission denied) — fall through to the manual fallback below.
      }
    }

    // Clipboard API is unavailable — happens on any insecure (non-HTTPS,
    // non-localhost) origin. The legacy execCommand copy still works
    // synchronously in most browsers even there, so this stays a genuine
    // one-click action instead of forcing a second manual copy step.
    if (legacyCopyToClipboard(text)) {
      setShareStatus("copied");
      setTimeout(() => setShareStatus("idle"), 2500);
      return;
    }

    // Truly nothing worked — last resort manual copy dialog, not the
    // browser's native window.prompt().
    setCopyFallbackText(text);
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="flex flex-col items-center gap-1.5 border-b border-[#dcb0cf] pb-2 dark:border-stone-700">
          <Logo size="sm" monochromeNavy />
        </div>

        <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-[#33397d] dark:text-white">
            Answer revealed
          </p>
          <h1 className="font-tile text-xl font-bold text-stone-900 dark:text-white">Your scores</h1>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
              Length score
            </p>
            <p className="font-tile text-xl font-bold text-[#33397d] dark:text-white">
              {score.lengthScore}%
            </p>
            <p className="text-xs text-stone-600 dark:text-stone-300">of the longest word</p>
            {personalBest && (
              <p className="mt-1">
                {personalBest.isNewBest ? (
                  <span className="inline-block rounded-full bg-[#33397d]/10 px-2 py-0.5 text-[0.65rem] font-semibold text-[#33397d] dark:bg-white/10 dark:text-white">
                    🎉 New best!
                  </span>
                ) : (
                  <span className="text-[0.65rem] font-medium text-stone-500 dark:text-stone-400">
                    Best: {personalBest.best}%
                  </span>
                )}
              </p>
            )}
          </div>

          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
              Letter score
            </p>
            <p className="font-tile text-xl font-bold text-[#33397d] dark:text-white">{score.letterScore}</p>
            <p className="text-xs text-stone-600 dark:text-stone-300">
              across {guesses.length} {guesses.length === 1 ? "guess" : "guesses"}
            </p>
          </div>
        </div>

        <div className="border-t border-[#dcb0cf] pt-2 dark:border-stone-700">
          <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
            The longest word
          </p>
          <div ref={longestWordRef} className="mt-1 flex w-full gap-1">
            {puzzle.longestWord.split("").map((letter, i) => (
              <Tile key={i} letter={letter} pixelSize={longestWordTilePx} variant="navy" />
            ))}
          </div>
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
            {puzzle.longestLength} letters, containing &ldquo;{puzzle.starter.toUpperCase()}&rdquo;
          </p>

          <p className="mt-2 text-[0.65rem] font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
            Your guesses
          </p>
          {guesses.length > 0 ? (
            <div className="mt-1 flex flex-col gap-1">
              {guesses.map((guess) => (
                <GuessRow key={guess} word={guess} starter={puzzle.starter} compact />
              ))}
            </div>
          ) : (
            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">No guesses submitted.</p>
          )}
        </div>

        <div className="flex flex-col items-center gap-1.5 border-t border-[#dcb0cf] pt-2 dark:border-stone-700">
          <Button
            variant="navy"
            size="md"
            onClick={handleShare}
            className="w-full max-w-[220px] !rounded-full !py-2"
          >
            {shareStatus === "idle" && (
              <>
                Share <ShareIcon />
              </>
            )}
            {shareStatus === "shared" && "Shared!"}
            {shareStatus === "copied" && "Copied to clipboard!"}
          </Button>
          {dailyResetCountdown ? (
            <div className="flex w-full flex-col items-center gap-0.5 rounded-xl border border-[#33397d]/15 py-2 dark:border-white/15">
              <p className="text-xs font-semibold text-stone-600 dark:text-stone-300">Come back tomorrow!</p>
              <p className="font-tile text-lg font-bold tabular-nums text-[#33397d] dark:text-white">
                {countdown}
              </p>
              <p className="text-[0.65rem] text-stone-500 dark:text-stone-400">until the next daily puzzle</p>
            </div>
          ) : (
            onPlayAgain && (
              <Button variant="navyOutline" size="md" onClick={onPlayAgain} className="w-full !py-2">
                {playAgainLabel}
              </Button>
            )
          )}
          <Link
            href={crossLink.href}
            className="text-center text-xs font-medium text-stone-500 underline-offset-4 hover:underline dark:text-stone-400"
          >
            {crossLink.label} →
          </Link>
        </div>
      </div>

      {copyFallbackText && (
        <CopyTextModal
          title="Copy your result"
          text={copyFallbackText}
          onClose={() => setCopyFallbackText(null)}
        />
      )}
    </>
  );
}
