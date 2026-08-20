/**
 * Core game logic — fully client-side, no API routes.
 *
 * puzzles.json (~450KB) is imported directly at build time and bundled into
 * the client JS, not fetched at runtime — so the puzzle pool is available
 * synchronously the instant the page's JS runs, with no loading state, for
 * every visitor. dictionary.txt (~1.7MB) is too large for that trade-off;
 * it's still fetched from /public/data in the background (see
 * loadDictionary below) and only gates guess *submission*, not the puzzle
 * showing up. No external network calls are made either way — the fetch
 * only ever hits a same-origin static file bundled with the app.
 */
import rawPuzzles from "@/data/puzzles.json";

export interface Puzzle {
  id: number;
  starter: string;
  longestWord: string;
  longestLength: number;
  /** A small curated sample (3-4 words), not the exhaustive match list — see scripts/generate-puzzles.ts. */
  exampleWords: string[];
}

/** The full puzzle pool, available synchronously — no fetch, no loading state. */
export const PUZZLES: Puzzle[] = rawPuzzles as Puzzle[];

// --- Dictionary loading ----------------------------------------------------
//
// Memoizes its in-flight/resolved promise at module scope, so the file is
// fetched and parsed exactly once per page session no matter how many times
// a guess is validated.

const DICTIONARY_URL = "/data/dictionary.txt";

let dictionaryPromise: Promise<Set<string>> | null = null;

export function loadDictionary(): Promise<Set<string>> {
  if (!dictionaryPromise) {
    dictionaryPromise = fetch(DICTIONARY_URL)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load dictionary.txt: HTTP ${res.status}`);
        }
        return res.text();
      })
      .then((text) => {
        const words = text
          .split("\n")
          .map((w) => w.trim().toLowerCase())
          .filter((w) => w.length > 0);
        return new Set(words);
      });
  }
  return dictionaryPromise;
}

// --- Daily puzzle ----------------------------------------------------------
//
// Same approach as Wordle-style daily games: a fixed epoch plus the number
// of UTC calendar days since it gives a stable index into the puzzle pool,
// so every player sees the same puzzle on the same day regardless of local
// timezone. As a side effect, the pool doesn't repeat until it fully cycles
// (~10 years at the current pool size).

const DAILY_EPOCH_UTC = Date.UTC(2024, 0, 1);
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function getDailyPuzzleIndex(
  puzzleCount: number,
  referenceDate: Date = new Date()
): number {
  if (puzzleCount <= 0) {
    throw new Error("Cannot compute a daily puzzle index for an empty pool");
  }
  const todayUTC = Date.UTC(
    referenceDate.getUTCFullYear(),
    referenceDate.getUTCMonth(),
    referenceDate.getUTCDate()
  );
  const daysSinceEpoch = Math.floor((todayUTC - DAILY_EPOCH_UTC) / MS_PER_DAY);
  // Normalize into [0, puzzleCount) even if daysSinceEpoch is negative
  // (reference date before the epoch).
  return ((daysSinceEpoch % puzzleCount) + puzzleCount) % puzzleCount;
}

export function getDailyPuzzle(
  puzzles: Puzzle[],
  referenceDate: Date = new Date()
): Puzzle {
  const index = getDailyPuzzleIndex(puzzles.length, referenceDate);
  return puzzles[index];
}

// Once a player finishes today's daily (via guesses or Reveal), that result
// is saved device-only in localStorage, keyed to the puzzle's own id — so
// navigating away and back (or reloading) shows their finished result and
// the countdown instead of silently handing them a fresh attempt. The id
// check means a stale save from a previous day's puzzle is just ignored,
// no explicit expiry/cleanup needed.
const DAILY_COMPLETION_STORAGE_KEY = "wordiply:daily-completion";

interface DailyCompletion {
  puzzleId: number;
  guesses: string[];
}

function readDailyCompletion(): DailyCompletion | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DAILY_COMPLETION_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as DailyCompletion).puzzleId === "number" &&
      Array.isArray((parsed as DailyCompletion).guesses) &&
      (parsed as DailyCompletion).guesses.every((g) => typeof g === "string")
    ) {
      return parsed as DailyCompletion;
    }
    return null;
  } catch {
    return null;
  }
}

export function markDailyCompleted(puzzleId: number, guesses: string[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    DAILY_COMPLETION_STORAGE_KEY,
    JSON.stringify({ puzzleId, guesses } satisfies DailyCompletion)
  );
}

/** The saved GameState for today's daily puzzle if it's already been finished today, otherwise null. */
export function getCompletedDailyState(puzzles: Puzzle[]): GameState | null {
  const completion = readDailyCompletion();
  if (!completion) return null;
  const todayPuzzle = getDailyPuzzle(puzzles);
  if (completion.puzzleId !== todayPuzzle.id) return null;
  return { puzzle: todayPuzzle, guesses: completion.guesses };
}

// --- Unlimited mode puzzle selection ---------------------------------------
//
// Played puzzle IDs are tracked device-only in localStorage. Once every
// puzzle in the pool has been played, the played list is reset so the pool
// starts cycling again instead of getting stuck with nothing left to serve.

const PLAYED_PUZZLES_STORAGE_KEY = "wordiply:played-puzzle-ids";

function readPlayedPuzzleIds(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PLAYED_PUZZLES_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((v): v is number => typeof v === "number")
      : [];
  } catch {
    return [];
  }
}

function writePlayedPuzzleIds(ids: number[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PLAYED_PUZZLES_STORAGE_KEY, JSON.stringify(ids));
}

export function resetPlayedPuzzles(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PLAYED_PUZZLES_STORAGE_KEY);
}

export function markPuzzlePlayed(puzzleId: number): void {
  const ids = readPlayedPuzzleIds();
  if (!ids.includes(puzzleId)) {
    writePlayedPuzzleIds([...ids, puzzleId]);
  }
}

export function getUnlimitedPuzzle(puzzles: Puzzle[]): Puzzle {
  if (puzzles.length === 0) {
    throw new Error("Cannot pick an unlimited puzzle from an empty pool");
  }

  let playedIds = new Set(readPlayedPuzzleIds());
  if (playedIds.size >= puzzles.length) {
    resetPlayedPuzzles();
    playedIds = new Set();
  }

  const unplayed = puzzles.filter((p) => !playedIds.has(p.id));
  const pool = unplayed.length > 0 ? unplayed : puzzles;
  return pool[Math.floor(Math.random() * pool.length)];
}

// --- Custom mode -------------------------------------------------------
//
// No backend, so a custom puzzle can't be stored anywhere — it's rebuilt
// entirely client-side from just the starter letters, which are the only
// thing encoded in the shared URL (?s=starter). The longest word is found
// live against the full dictionary (already loaded for guess validation
// anyway), rather than pre-validated like the curated pool — any starter
// with at least one real word containing it is a playable puzzle.

export const CUSTOM_STARTER_MIN_LEN = 3;
export const CUSTOM_STARTER_MAX_LEN = 6;

/** Lowercase, letters-only, length-capped — matches what a starter is allowed to contain. */
export function normalizeCustomStarter(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z]/g, "")
    .slice(0, CUSTOM_STARTER_MAX_LEN);
}

export interface CustomStarterMatch {
  longestWord: string;
  longestLength: number;
  matchCount: number;
  exampleWords: string[];
}

/** Searches the full dictionary for words containing `starter`, live — null if none exist. */
export function findLongestWordForStarter(
  starter: string,
  dictionary: ReadonlySet<string>
): CustomStarterMatch | null {
  let longestWord: string | null = null;
  const examples: string[] = [];

  dictionary.forEach((word) => {
    if (word.length <= starter.length || !word.includes(starter)) return;
    if (!longestWord || word.length > longestWord.length) longestWord = word;
    if (examples.length < 5) examples.push(word);
  });

  if (!longestWord) return null;

  let matchCount = 0;
  dictionary.forEach((word) => {
    if (word.length > starter.length && word.includes(starter)) matchCount++;
  });

  return {
    longestWord,
    longestLength: (longestWord as string).length,
    matchCount,
    exampleWords: examples,
  };
}

/** id 0 marks a custom puzzle — never assigned by the curated pool (which starts at 1). */
export function buildCustomPuzzle(starter: string, dictionary: ReadonlySet<string>): Puzzle | null {
  const match = findLongestWordForStarter(starter, dictionary);
  if (!match) return null;
  return {
    id: 0,
    starter,
    longestWord: match.longestWord,
    longestLength: match.longestLength,
    exampleWords: match.exampleWords,
  };
}

// --- Guess validation & game state ------------------------------------------

/** Both modes end after this many guesses, win-or-lose — the round's score is whatever was earned by then. */
export const MAX_GUESSES = 5;

export type GuessRejectionReason =
  | "empty"
  | "missing-starter"
  | "already-guessed"
  | "not-a-word"
  | "limit-reached";

export interface GuessValidation {
  ok: boolean;
  reason?: GuessRejectionReason;
}

export interface GameState {
  puzzle: Puzzle;
  guesses: string[];
}

export function createGameState(puzzle: Puzzle): GameState {
  return { puzzle, guesses: [] };
}

function normalizeGuess(rawGuess: string): string {
  return rawGuess.trim().toLowerCase();
}

export function validateGuess(
  state: GameState,
  rawGuess: string,
  dictionary: ReadonlySet<string>
): GuessValidation {
  const guess = normalizeGuess(rawGuess);

  if (state.guesses.length >= MAX_GUESSES) {
    return { ok: false, reason: "limit-reached" };
  }
  if (!guess) return { ok: false, reason: "empty" };
  if (!guess.includes(state.puzzle.starter)) {
    return { ok: false, reason: "missing-starter" };
  }
  if (state.guesses.includes(guess)) {
    return { ok: false, reason: "already-guessed" };
  }
  if (!dictionary.has(guess)) {
    return { ok: false, reason: "not-a-word" };
  }

  return { ok: true };
}

export function submitGuess(
  state: GameState,
  rawGuess: string,
  dictionary: ReadonlySet<string>
): { state: GameState; result: GuessValidation } {
  const result = validateGuess(state, rawGuess, dictionary);
  if (!result.ok) {
    return { state, result };
  }

  const guess = normalizeGuess(rawGuess);
  return {
    state: { ...state, guesses: [...state.guesses, guess] },
    result,
  };
}

// --- Scoring -----------------------------------------------------------

export interface Score {
  /** Best single guess length as a % of the puzzle's longestLength. */
  lengthScore: number;
  /** Sum of every submitted guess's length. */
  letterScore: number;
  bestGuess: string | null;
  bestGuessLength: number;
}

export function computeScore(state: GameState): Score {
  if (state.guesses.length === 0) {
    return { lengthScore: 0, letterScore: 0, bestGuess: null, bestGuessLength: 0 };
  }

  let bestGuess = state.guesses[0];
  for (const guess of state.guesses) {
    if (guess.length > bestGuess.length) bestGuess = guess;
  }

  const letterScore = state.guesses.reduce((sum, g) => sum + g.length, 0);
  const lengthScore = Math.round(
    (bestGuess.length / state.puzzle.longestLength) * 100
  );

  return {
    lengthScore,
    letterScore,
    bestGuess,
    bestGuessLength: bestGuess.length,
  };
}

// --- Personal best -------------------------------------------------------
//
// Device-local record of the best lengthScore ever achieved, across every
// puzzle played (daily and unlimited combined — lengthScore is a normalized
// percentage, so it's comparable across different puzzles). This is real,
// honestly-sourced data about this player's own history — not a fabricated
// stat — used to give a genuine reason to come back and try to beat it.

const PERSONAL_BEST_STORAGE_KEY = "wordiply:personal-best-length-score";

export function getPersonalBestLengthScore(): number {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(PERSONAL_BEST_STORAGE_KEY);
  const parsed = raw ? Number(raw) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

export interface PersonalBestResult {
  best: number;
  isNewBest: boolean;
}

/** Records this round's lengthScore if it beats the stored best. Call once per finished game. */
export function recordPersonalBest(lengthScore: number): PersonalBestResult {
  const current = getPersonalBestLengthScore();
  if (lengthScore > current) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(PERSONAL_BEST_STORAGE_KEY, String(lengthScore));
    }
    return { best: lengthScore, isNewBest: true };
  }
  return { best: current, isNewBest: false };
}

// --- Sharing -----------------------------------------------------------

/** Maps A-Z to the Unicode "enclosed alphanumeric" tile-style letter forms. */
function toEnclosedLetters(word: string, style: "circled" | "squared"): string {
  const base = style === "circled" ? 0x1f150 : 0x1f130;
  return word
    .toUpperCase()
    .split("")
    .map((ch) => {
      const offset = ch.charCodeAt(0) - 65; // 'A'
      return offset >= 0 && offset <= 25 ? String.fromCodePoint(base + offset) : ch;
    })
    .join("");
}

/** "WORDIPLY" rendered as two-tone tile emoji, matching our Logo's split-color treatment. */
function wordmarkEmoji(): string {
  const word = "WORDIPLY";
  const half = Math.ceil(word.length / 2);
  return toEnclosedLetters(word.slice(0, half), "circled") + toEnclosedLetters(word.slice(half), "squared");
}

export function buildShareText(state: GameState, score: Score): string {
  const { puzzle } = state;
  // Custom puzzles (id 0, never assigned by the curated pool) link back to
  // the exact same starter so a friend plays the identical puzzle, instead
  // of the generic homepage — and skip the "#id" tag, which only means
  // something for pool puzzles.
  const isCustom = puzzle.id === 0;
  return [
    isCustom ? wordmarkEmoji() : `${wordmarkEmoji()} #${puzzle.id}`,
    `🌟 Length Score: ${score.lengthScore}%`,
    `🚀 Letter Score: ${score.letterScore}`,
    isCustom
      ? `🔗 Beat my score: https://wordiplyunlimited.com/custom?s=${puzzle.starter}`
      : `🔗 Play Wordiply Unlimited: https://wordiplyunlimited.com`,
    `🎬 Today's starter: ${toEnclosedLetters(puzzle.starter, "squared")}`,
  ].join("\n");
}
