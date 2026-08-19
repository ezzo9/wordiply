"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  MAX_GUESSES,
  PUZZLES,
  computeScore,
  createGameState,
  getDailyPuzzle,
  getUnlimitedPuzzle,
  loadDictionary,
  markPuzzlePlayed,
  submitGuess,
  type GameState,
  type GuessRejectionReason,
  type Puzzle,
} from "@/lib/game";
import { Button } from "./Button";
import { ConfirmModal } from "./ConfirmModal";
import { GuessRow } from "./GuessRow";
import { HowToPlayModal } from "./HowToPlayModal";
import { Modal } from "./Modal";
import { ResultsScreen } from "./ResultsScreen";
import { Tile } from "./Tile";
import { TypingPreview } from "./TypingPreview";
import { useFitTileSize } from "./useFitTileSize";

// Matches the starter tiles' fixed "sm" size (32px) — guess rows share one
// tile size (sized to fit the longest current guess) instead of each row
// auto-fitting independently, so shorter words don't get stretched to fill
// the line and everything reads as one consistent, centered word.
const GUESS_TILE_MAX_PX = 32;
const GUESS_ROW_GAP_PX = 8; // matches the guesses list's `gap-2`
// Extra breathing room on top of the 5 rows themselves, pushing the form
// further down from the starter tiles on both mobile and desktop.
const GUESSES_AREA_EXTRA_PX = 64;
// Reserves room for a full round of guesses up front, so the layout doesn't
// shift as they're typed in and there's generous space from the very start.
const GUESSES_AREA_MIN_HEIGHT_PX =
  MAX_GUESSES * GUESS_TILE_MAX_PX + (MAX_GUESSES - 1) * GUESS_ROW_GAP_PX + GUESSES_AREA_EXTRA_PX;

// A small tilted-tile "WORDIPLY" wordmark for the game screen's header only —
// the genre's usual scattered/rotated tile treatment, but toned down (a
// smaller rotation range, our own pink/navy two-tone rather than the
// competitor's palette) and scoped to just this one spot. The shared Tile
// component used everywhere else (starter tiles, guesses, results) stays
// straight/non-rotated, unaffected by this.
const HEADER_WORDMARK = "WORDIPLY".split("").map((letter, i) => ({
  letter,
  rotate: [-7, 6, -5, 8, -6, 5, -8, 4][i],
}));

function HeaderWordmark() {
  return (
    <div className="flex items-center" aria-hidden="true">
      {HEADER_WORDMARK.map(({ letter, rotate }, i) => (
        <span
          key={i}
          style={{ transform: `rotate(${rotate}deg)`, marginLeft: i === 0 ? 0 : -2 }}
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-[1.5px] font-tile text-xs font-extrabold shadow-md sm:h-7 sm:w-7 sm:text-sm ${
            i % 2 === 0
              ? "border-[#e6c2da] bg-[#f3dded] text-[#33397d]"
              : "border-[#282d63] bg-[#33397d] text-white"
          }`}
        >
          {letter}
        </span>
      ))}
    </div>
  );
}

export type GameMode = "daily" | "unlimited" | "custom";

type Phase = "playing" | "results";

// Unlimited lives at "/" (the homepage); Daily lives at "/daily"; Custom
// cross-promotes making a new one at "/custom". Each mode cross-promotes
// somewhere else instead of a generic "back home" link, since "/" is no
// longer a separate marketing page.
const CROSS_LINK: Record<GameMode, { href: string; label: string }> = {
  unlimited: { href: "/daily", label: "Play today's Daily puzzle" },
  daily: { href: "/", label: "Play Unlimited" },
  custom: { href: "/custom", label: "Create your own puzzle" },
};

const MODE_HEADING: Record<GameMode, string> = {
  unlimited: "Wordiply Unlimited",
  daily: "Wordiply Daily",
  custom: "Wordiply Custom Puzzle",
};

// Unique explainer copy per mode (not shown on Custom, which has its own
// page copy) — genuinely different text for each, not a find-and-replace
// of the same paragraphs, since both pages need to stand on their own for
// search engines and for a visitor landing directly on either one.
const MODE_EXPLAINER: Partial<Record<GameMode, { heading: string; paragraphs: string[] }>> = {
  unlimited: {
    heading: "How Wordiply Unlimited works",
    paragraphs: [
      `Unlimited mode is the practice anytime way to play Wordiply. Every puzzle starts with a short starter fragment, just three to six letters, and your job is to find the longest real English word that contains those letters in order, anywhere inside it. Type "TCH" and you might land on "watch," then push further to something like "unwatched."`,
      `You get five guesses per round. Every valid word adds to your letter score, while your best single guess sets your length score as a percentage of the longest word we actually found. There's a real decision in every guess: lock in a word you know is safe, or reach for something longer you're only half sure exists in the dictionary.`,
      `Unlimited serves a fresh, randomly chosen puzzle every time you finish one, with no daily cap and no waiting. Play one round on a break, or ten in a row if you're chasing a personal best. We track which puzzles you've already seen on this device so you won't hit a repeat until you've worked through the whole pool.`,
      `Prefer the same puzzle as everyone else, or want to send a hand-picked starter to a friend? Daily and Custom mode cover both. For solo practice with zero pressure and zero waiting, this is the one.`,
    ],
  },
  daily: {
    heading: "How Wordiply Daily works",
    paragraphs: [
      `Daily mode gives everyone the exact same Wordiply puzzle, once a day. Instead of a random starter, today's fragment (three to six letters) is fixed for every player worldwide until the puzzle resets at midnight UTC. Your job is the same as any Wordiply round: find the longest real English word containing that fragment, in order, anywhere inside it, within five guesses.`,
      `A short starter like "ARC" might only get you to "march" at first, but a sharper guess could reach something like "counterattacking." Every valid word raises your letter score, and your single best guess sets your length score, measured against the longest word we found for today's puzzle.`,
      `Because everyone is solving the same fragment, Daily is built for comparing notes: share your score with a friend who played the same puzzle and see who found the longer word. Once you've revealed the answer or used your five guesses, that's it until tomorrow. We show a live countdown to the next puzzle instead of serving a random replacement, so you know exactly when to come back.`,
      `Want to keep playing right now instead of waiting? Switch to Unlimited for as many random puzzles as you like, or build your own starter in Custom mode.`,
    ],
  },
};

function rejectionMessage(reason: GuessRejectionReason | undefined, starter: string): string {
  switch (reason) {
    case "empty":
      return "Type a word first.";
    case "missing-starter":
      return `Your word must contain "${starter.toUpperCase()}".`;
    case "already-guessed":
      return "You've already tried that word.";
    case "not-a-word":
      return "That's not in our dictionary.";
    case "limit-reached":
      return `You've used all ${MAX_GUESSES} guesses.`;
    default:
      return "That guess isn't valid.";
  }
}

export interface GameScreenProps {
  mode: GameMode;
  /** Required for "custom" mode — the caller has already resolved it (starter + dictionary lookup) before rendering this. */
  customPuzzle?: Puzzle;
}

export function GameScreen({ mode, customPuzzle }: GameScreenProps) {
  // Daily is fully deterministic (same puzzle for everyone, today), so it
  // can be picked synchronously right here — no fetch, no loading state,
  // same result on the server-rendered HTML and the client. Custom puzzles
  // are resolved by the caller before this even mounts, so they're also
  // synchronous here. Unlimited's real pick needs localStorage (client-only,
  // to avoid repeating a puzzle) so it's re-picked in an effect below — but
  // it still starts from a real, deterministic puzzle (not null) here, so
  // the server-rendered HTML always has a complete, crawlable page instead
  // of silently rendering nothing until that effect runs on the client.
  const [gameState, setGameState] = useState<GameState | null>(() => {
    if (mode === "daily") return createGameState(getDailyPuzzle(PUZZLES));
    if (mode === "custom" && customPuzzle) return createGameState(customPuzzle);
    if (mode === "unlimited") return createGameState(PUZZLES[0]);
    return null;
  });
  const [phase, setPhase] = useState<Phase>("playing");
  const [dictionary, setDictionary] = useState<Set<string> | null>(null);
  const [dictionaryError, setDictionaryError] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showRevealConfirm, setShowRevealConfirm] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const longestGuessLength = gameState?.guesses.reduce((max, g) => Math.max(max, g.length), 1) ?? 1;
  const { containerRef: guessesContainerRef, tilePx: sharedGuessTilePx } = useFitTileSize(
    longestGuessLength,
    GUESS_TILE_MAX_PX
  );

  useEffect(() => {
    if (mode !== "unlimited") return;
    const puzzle = getUnlimitedPuzzle(PUZZLES);
    markPuzzlePlayed(puzzle.id);
    setGameState(createGameState(puzzle));
    // Only ever picks the *first* unlimited puzzle on mount — later ones
    // come from handlePlayAgain, not this effect re-running.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadDictionary()
      .then(setDictionary)
      .catch(() => setDictionaryError(true));
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!gameState || !dictionary) return;

    const { state: nextState, result } = submitGuess(gameState, input, dictionary);
    if (!result.ok) {
      setError(rejectionMessage(result.reason, gameState.puzzle.starter));
      return;
    }

    setError(null);
    setInput("");
    setGameState(nextState);
    if (nextState.guesses.length >= MAX_GUESSES) {
      setPhase("results");
    }
  }

  function handleReveal() {
    if (!gameState || gameState.guesses.length === 0) {
      setPhase("results");
      return;
    }
    setShowRevealConfirm(true);
  }

  function handlePlayAgain() {
    const puzzle = getUnlimitedPuzzle(PUZZLES);
    markPuzzlePlayed(puzzle.id);
    setGameState(createGameState(puzzle));
    setInput("");
    setError(null);
    setPhase("playing");
    inputRef.current?.focus();
  }

  // Only unlimited mode ever sees this, and only for the brief instant
  // before the effect above resolves — no network wait behind it. Custom
  // mode's caller guarantees customPuzzle is already resolved before
  // mounting this component, so it's never null there either.
  if (!gameState) return null;

  const { puzzle, guesses } = gameState;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2 border-b border-white/20 pb-4">
        <div className="min-w-0 shrink-0">
          <h1 className="sr-only">{MODE_HEADING[mode]}</h1>
          <div aria-hidden="true">
            <HeaderWordmark />
          </div>
        </div>
        {mode === "custom" ? (
          <span className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-[0.65rem] font-semibold text-white/70 sm:px-4 sm:py-1.5 sm:text-xs">
            Custom puzzle
          </span>
        ) : (
          <div className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-white/10 p-0.5 sm:gap-1 sm:p-1">
            <Link
              href="/"
              aria-current={mode === "unlimited" ? "page" : undefined}
              className={`rounded-full px-2 py-1 text-[0.65rem] font-semibold transition-colors sm:px-3 sm:py-1.5 sm:text-xs ${
                mode === "unlimited" ? "bg-white text-[#33397d]" : "text-white/70 hover:text-white"
              }`}
            >
              Unlimited
            </Link>
            <Link
              href="/daily"
              aria-current={mode === "daily" ? "page" : undefined}
              className={`rounded-full px-2 py-1 text-[0.65rem] font-semibold transition-colors sm:px-3 sm:py-1.5 sm:text-xs ${
                mode === "daily" ? "bg-white text-[#33397d]" : "text-white/70 hover:text-white"
              }`}
            >
              Daily
            </Link>
          </div>
        )}
      </div>

      {/* Sticky on mobile so the starter fragment stays visible when tapping
          the guess input scrolls the page to clear the on-screen keyboard —
          otherwise the very thing you're typing toward gets pushed off
          screen. Reverts to normal flow above the sm breakpoint, where
          on-screen keyboards aren't a factor. */}
      <div className="sticky top-0 z-10 -mx-6 bg-background px-6 pb-2 pt-3 sm:static sm:z-auto sm:mx-0 sm:bg-transparent sm:px-0 sm:pb-0 sm:pt-0">
        <div className="mt-4 flex flex-wrap justify-center gap-1 sm:mt-0">
          {puzzle.starter.split("").map((letter, i) => (
            <Tile key={i} letter={letter} size="sm" variant="starter" heavy />
          ))}
        </div>
      </div>

      <div
        ref={guessesContainerRef}
        className="flex flex-col justify-start gap-2"
        style={{ minHeight: GUESSES_AREA_MIN_HEIGHT_PX }}
      >
        {guesses.map((guess) => (
          <GuessRow
            key={guess}
            word={guess}
            starter={puzzle.starter}
            onDarkSurface
            sharedTilePx={sharedGuessTilePx}
          />
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <label htmlFor="guess-input" className="sr-only">
          Your guess
        </label>
        <div
          onClick={() => inputRef.current?.focus()}
          className="flex cursor-text items-center gap-2 border-b-2 border-white/30 py-2 focus-within:border-white"
        >
          <div className="relative min-w-0 flex-1 overflow-hidden">
            {input.length > 0 && (
              <div className="pointer-events-none absolute inset-0 flex items-center">
                <TypingPreview input={input} starter={puzzle.starter} maxTilePx={28} />
              </div>
            )}
            <input
              ref={inputRef}
              id="guess-input"
              type="text"
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`A word containing "${puzzle.starter}"`}
              className={`w-full bg-transparent text-lg font-normal caret-transparent outline-none placeholder:text-white/50 sm:text-xl ${
                input.length > 0 ? "text-transparent" : "text-white"
              }`}
            />
          </div>
          <span className="shrink-0 text-xs font-semibold tabular-nums text-white/60 sm:text-sm">
            {input.length} letters
          </span>
        </div>

        {error && (
          <p role="alert" className="text-sm font-medium text-accent-300 sm:text-base">
            {error}
          </p>
        )}
        {dictionaryError && (
          <p role="alert" className="text-xs font-medium text-accent-300 sm:text-sm">
            Couldn&apos;t load the dictionary — try refreshing.
          </p>
        )}

        <div className="mt-3 flex items-center justify-center gap-3">
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={!dictionary || guesses.length >= MAX_GUESSES}
          >
            Submit
          </Button>
          <Button type="button" variant="outline" size="md" onClick={handleReveal}>
            Reveal
          </Button>
          <button
            type="button"
            onClick={() => setShowHowToPlay(true)}
            aria-label="How to play"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-white/40 font-tile text-sm font-bold text-white hover:bg-white/10 sm:h-12 sm:w-12 sm:text-base"
          >
            i
          </button>
        </div>
      </form>

      {phase === "results" && (
        <Modal>
          <ResultsScreen
            state={gameState}
            score={computeScore(gameState)}
            onPlayAgain={mode === "unlimited" ? handlePlayAgain : undefined}
            playAgainLabel="Create new puzzle"
            crossLink={CROSS_LINK[mode]}
            dailyResetCountdown={mode === "daily"}
          />
        </Modal>
      )}

      {showHowToPlay && <HowToPlayModal onClose={() => setShowHowToPlay(false)} />}

      {showRevealConfirm && (
        <ConfirmModal
          title="Reveal the answer?"
          message="This ends the puzzle immediately and shows the longest word we found. Your score is based only on the guesses you've already made."
          confirmLabel="Reveal"
          onConfirm={() => {
            setShowRevealConfirm(false);
            setPhase("results");
          }}
          onCancel={() => setShowRevealConfirm(false)}
        />
      )}

      {mode !== "custom" && (
        <Link
          href="/custom"
          className="text-center text-xs font-medium text-white/50 underline-offset-4 hover:text-white/80 hover:underline"
        >
          Challenge a friend — create a custom puzzle →
        </Link>
      )}

      {MODE_EXPLAINER[mode] && (
        <div className="border-t border-white/10 pt-4 text-sm leading-relaxed text-white/60">
          <h2 className="font-tile text-xs font-bold uppercase tracking-wide text-white/80">
            {MODE_EXPLAINER[mode]!.heading}
          </h2>
          {MODE_EXPLAINER[mode]!.paragraphs.map((paragraph, i) => (
            <p key={i} className={i === 0 ? "mt-2" : "mt-3"}>
              {paragraph}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
