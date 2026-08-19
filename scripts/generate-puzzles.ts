/**
 * Offline puzzle generator.
 *
 * Precomputes the entire puzzle pool into /data/puzzles.json at build time.
 * The app never calls an external API at runtime — this script is the only
 * place network access happens, and only to populate local caches that are
 * committed/reused (/data/dictionary.txt, /data/common-words.txt).
 *
 * /data is the source-of-truth build cache. dictionary.txt is also copied
 * to /public/data so the client can fetch it as a plain static asset at
 * runtime (lib/game.ts) without an API route — it's too large (~1.7MB) to
 * bundle directly. puzzles.json (~450KB) is small enough that lib/game.ts
 * imports it directly instead, bundling it into the client JS so the
 * puzzle pool is available synchronously with no fetch/loading state; it's
 * read from /data, not copied to /public. common-words.txt is a build-only
 * recognizability signal and isn't copied anywhere either.
 *
 * Each puzzle's exampleWords is a small curated sample (3-4 words spanning
 * short/medium/long), not an exhaustive list — gameplay validation checks
 * guesses against the full dictionary + starter substring instead, so rare
 * words are still accepted if a player types them.
 *
 * Usage: npm run generate-puzzles
 */
import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "..", "data");
const DICTIONARY_PATH = path.join(DATA_DIR, "dictionary.txt");
const COMMON_WORDS_PATH = path.join(DATA_DIR, "common-words.txt");
const OUTPUT_PATH = path.join(DATA_DIR, "puzzles.json");

const PUBLIC_DATA_DIR = path.resolve(__dirname, "..", "public", "data");

// ENABLE1 ("Enhanced North American Benchmark Lexicon") — the standard
// public-domain word-game dictionary, ~172,820 words, one per line.
const DICTIONARY_URL =
  "https://raw.githubusercontent.com/dolph/dictionary/master/enable1.txt";

// Top 10,000 English words by frequency (Google Trillion Word Corpus,
// via first20hours/google-10000-english). Used only as a "recognizability"
// signal so we don't surface obscure scientific/technical words as the
// puzzle's target — never shipped to or queried by the runtime app.
const COMMON_WORDS_URL =
  "https://raw.githubusercontent.com/first20hours/google-10000-english/master/google-10000-english-no-swears.txt";

const MIN_STARTER_LEN = 3;
const MAX_STARTER_LEN = 4;

// A puzzle needs enough valid words that a player has room to guess
// something reasonable, but not so many that the starter is a trivial,
// maximally-generic fragment (e.g. "ing", "ate") with an unwieldy word list.
const MIN_VALID_WORDS = 15;
const MAX_VALID_WORDS = 300;

// "The longest word should be a meaningful stretch beyond the starter" is
// interpreted here as: at least this many letters longer than the starter
// itself, i.e. longestLength >= starter.length + MIN_LENGTH_DELTA. This
// scales the bar with the starter length instead of a fixed absolute one.
// Lowered from 8 to 4 so requiring the featured longest word to be
// *strongly* recognizable (see isStronglyRecognizable) — plainly common,
// not just technically valid via a compound split or abstract derivational
// suffix — still leaves a large enough qualifying pool: at 8 that combo
// only cleared ~1,300 candidates; at 4 it clears ~3,600, comfortably
// above target while every puzzle's answer still reads as an everyday word.
const MIN_LENGTH_DELTA = 4;

// A puzzle shouldn't lean on a single obscure word as its only realistic
// answer: besides the long showpiece word (already guaranteed by
// MIN_LENGTH_DELTA above), we require several shorter/medium recognizable
// alternatives too, so there's a real spread of everyday words to reach
// for — not just one. The compound-word-aware recognizer (see above) made
// this much more achievable than it used to be: raised from 4 to 8 once
// that landed, and the qualifying pool still comfortably clears the target.
// This only gates which puzzles make the curated pool — it doesn't affect
// gameplay validation, which (see lib/game.ts) still accepts any real
// dictionary word containing the starter, rare ones included.
const MIN_RECOGNIZABLE_WORDS = 8;
const SHORT_BUCKET_MAX_DELTA = 3; // starter.length .. +3
const MEDIUM_BUCKET_MAX_DELTA = 7; // +4 .. +7 (long is +8 and up) — only used to spread pickExampleWords' sample across short/medium/long, independent of MIN_LENGTH_DELTA

// exampleWords is a small curated sample shown/shipped per puzzle — not the
// full match list. Keeping it modest keeps puzzles.json small and each
// puzzle easy to eyeball/review, while gameplay stays unaffected (guesses
// are validated against the full dictionary, not this list).
const EXAMPLE_WORDS_MAX = 5;

const TARGET_POOL_SIZE = 5000;
const MIN_POOL_SIZE = 3000;

async function ensureCached(
  localPath: string,
  url: string,
  label: string
): Promise<string> {
  if (existsSync(localPath)) {
    console.log(`[cache] ${label} already cached at ${localPath}`);
    return readFile(localPath, "utf8");
  }

  console.log(`[fetch] downloading ${label} from ${url} ...`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${label}: HTTP ${res.status}`);
  }
  const text = await res.text();
  await writeFile(localPath, text, "utf8");
  console.log(`[fetch] saved ${label} to ${localPath} (${text.length} bytes)`);
  return text;
}

function parseWordList(text: string): string[] {
  return text
    .split("\n")
    .map((w) => w.trim().toLowerCase())
    .filter((w) => w.length > 0 && /^[a-z]+$/.test(w));
}

// --- Recognizability heuristic -------------------------------------------
//
// We don't have a runtime dependency we can call for "is this word well
// known", so we approximate it offline: a word is "recognizable" if it (or
// its stem, after undoing common inflectional/derivational suffixes) shows
// up in the top-10k common word list. This reliably keeps things like
// "marches" (-> "march") and "characterizations" (-> "character") while
// rejecting long, obscure ENABLE1 entries that have no common root.
//
// That alone still misses a lot of genuinely everyday words: compounds like
// "housekeeping" or "gatekeeper" don't appear in a raw frequency list (their
// parts are individually far more common than the whole), and no single
// suffix rule reduces them to something that does. makeRecognizer() below
// also checks whether a word splits into two independently-recognizable
// halves, which is what actually gets those in — tripling the qualifying
// puzzle pool and roughly doubling the average findable words per puzzle
// when this was tuned (2,208 -> 5,997 candidates, 14.7 -> 26.7 avg).
// Split into two tiers. Inflectional suffixes (plurals, verb tenses,
// comparatives, and simple adverbs) don't change how recognizable a word
// feels — "runs"/"running"/"runner" all read as plainly as "run" itself.
// Derivational suffixes (nominalizing/adjectivizing forms like -ness,
// -tion, -able) can produce a technically-valid but much more abstract or
// rarer-feeling word from a common root (e.g. "proprietary" -> a common
// root, but "nonproprietaries" via -ary+s does not feel common at all) —
// those are still accepted for general recognizability (breadth of
// guessable words), but NOT for choosing the featured "longest word"
// shown as the puzzle's answer, which should read as an everyday word on
// its own.
const INFLECTIONAL_SUFFIX_RULES: Array<[string, string]> = [
  ["'s", ""],
  ["ies", "y"],
  ["ied", "y"],
  ["ier", "y"],
  ["iest", "y"],
  ["ing", ""],
  ["ing", "e"],
  ["ed", ""],
  ["ed", "e"],
  ["es", ""],
  ["s", ""],
  ["er", ""],
  ["er", "e"],
  ["est", ""],
  ["est", "e"],
  ["ly", ""],
];

const DERIVATIONAL_SUFFIX_RULES: Array<[string, string]> = [
  ["ness", ""],
  ["ment", ""],
  ["tion", ""],
  ["tions", ""],
  ["ation", ""],
  ["ations", ""],
  ["able", ""],
  ["ible", ""],
  ["ful", ""],
  ["less", ""],
  ["ize", ""],
  ["ise", ""],
];

function rootCandidates(word: string, rules: Array<[string, string]>): string[] {
  const out = [word];
  for (const [suffix, replacement] of rules) {
    if (word.endsWith(suffix) && word.length - suffix.length >= 2) {
      const stem = word.slice(0, -suffix.length) + replacement;
      out.push(stem);
      // Undo a doubled final consonant left by stripping -ing/-ed,
      // e.g. "running" -> "runn" -> "run".
      if ((suffix === "ing" || suffix === "ed") && replacement === "") {
        const last = stem[stem.length - 1];
        const prev = stem[stem.length - 2];
        if (last && last === prev && !"aeiou".includes(last)) {
          out.push(stem.slice(0, -1));
        }
      }
    }
  }
  return out;
}

// --- Pronounceability heuristic -------------------------------------------
//
// A starter can pass every other filter (enough matches, recognizable words,
// good length spread) and still be a bad puzzle if the fragment itself is
// unpronounceable gibberish — e.g. "ssfu" only occurs by gluing "bliss"/
// "success"/"stress" to "-ful", so as an isolated 4-letter prompt it gives a
// player nothing to work with. We detect this data-drivenly: any run of 3+
// consecutive consonants in the starter must be a cluster that real English
// words actually start or end with (e.g. "str" starts hundreds of words,
// "rks" ends hundreds — "ssf" and "ctl" start or end none). 'y' counts as a
// vowel here since it commonly functions as one (cycle, rhythm, gym).
//
// That alone still misses a subtler case: a starter like "llie" or "llab"
// has no 3-consonant run at all (the doubled consonant is only 2 letters
// before a vowel), so the check above never fires — but "LL" essentially
// never begins a real English word (only a handful of Welsh loanwords like
// "llama" do; ENABLE1 has 406 words *ending* in "ll" vs. only 4 starting
// with it), so seeing it as a puzzle's own opening tiles reads as gibberish
// even though it's a perfectly valid substring elsewhere. The fix has to be
// position-aware: the starter's own leading/trailing consonant run (2+
// letters) must specifically be a common word *start*/*end* respectively —
// not just a plausible cluster anywhere in the language.
const VOWELS = new Set(["a", "e", "i", "o", "u", "y"]);
const NATURAL_CLUSTER_MIN_COUNT = 3;
// Higher bar than NATURAL_CLUSTER_MIN_COUNT — calibrated against real counts:
// genuine onsets like "st"/"br"/"ch" start hundreds-to-thousands of words,
// while non-starters like "ll"/"bb"/"kv" top out at a dozen or so (mostly
// loanwords), so anything comfortably between those (tried: 25) cleanly
// separates the two groups without rejecting real clusters.
const EDGE_CLUSTER_MIN_COUNT = 25;
const MAX_EDGE_CLUSTER_LEN = 4;

function buildClusterBoundaryMaps(words: string[]): {
  startsWith: Map<string, number>;
  endsWith: Map<string, number>;
} {
  const startsWith = new Map<string, number>();
  const endsWith = new Map<string, number>();
  for (const word of words) {
    for (let len = 2; len <= MAX_EDGE_CLUSTER_LEN; len++) {
      if (word.length < len) continue;
      const prefix = word.slice(0, len);
      startsWith.set(prefix, (startsWith.get(prefix) ?? 0) + 1);
      const suffix = word.slice(-len);
      endsWith.set(suffix, (endsWith.get(suffix) ?? 0) + 1);
    }
  }
  return { startsWith, endsWith };
}

function makePronounceabilityChecker(words: string[]) {
  const { startsWith, endsWith } = buildClusterBoundaryMaps(words);

  function isNaturalCluster(cluster: string): boolean {
    return (
      (startsWith.get(cluster) ?? 0) >= NATURAL_CLUSTER_MIN_COUNT ||
      (endsWith.get(cluster) ?? 0) >= NATURAL_CLUSTER_MIN_COUNT
    );
  }

  const sameClass = (a: string, b: string) => VOWELS.has(a) === VOWELS.has(b);

  return function isPronounceable(fragment: string): boolean {
    // Generic interior check: any 3+ letter run of a single class — all
    // consonants, OR all vowels — anywhere in the fragment must be a
    // phonotactically plausible English cluster (starts or ends *some*
    // real word — direction doesn't matter here, just plausibility). This
    // catches consonant gibberish ("ssf", only glued together by a suffix)
    // and vowel gibberish the same way: "eei" only ever occurs mid-word
    // (e.g. "fr-eei-ng"), never as how any real word actually starts or
    // ends, so as an isolated puzzle fragment it reads as pure nonsense.
    for (let i = 0; i + 3 <= fragment.length; i++) {
      const window = fragment.slice(i, i + 3);
      const chars = window.split("");
      const uniformClass =
        chars.every((ch) => !VOWELS.has(ch)) || chars.every((ch) => VOWELS.has(ch));
      if (uniformClass && !isNaturalCluster(window)) return false;
    }

    // Edge-specific check: the fragment's *own* leading/trailing run of a
    // single class (2+ letters, consonant or vowel) must be a common
    // word-start/word-end respectively — this is what catches "llie"
    // (leading "ll" is a real cluster in general, per the check above via
    // words like "ball"/"call", but essentially never *starts* a word) and
    // equally a leading/trailing vowel run that's real mid-word but never
    // how a word actually begins or ends. Only applies when a letter of the
    // *other* class elsewhere in the fragment actually marks that run as
    // "the leading part" / "the trailing part" — a fragment that's a single
    // uniform class all the way through (like "eei") has no such distinction
    // and is already covered by the generic check above.
    let leadEnd = 0;
    while (leadEnd < fragment.length && sameClass(fragment[leadEnd], fragment[0])) leadEnd++;
    if (
      leadEnd >= 2 &&
      leadEnd < fragment.length &&
      (startsWith.get(fragment.slice(0, leadEnd)) ?? 0) < EDGE_CLUSTER_MIN_COUNT
    ) {
      return false;
    }

    let trailStart = fragment.length;
    while (
      trailStart > 0 &&
      sameClass(fragment[trailStart - 1], fragment[fragment.length - 1])
    ) {
      trailStart--;
    }
    const trailLen = fragment.length - trailStart;
    if (
      trailLen >= 2 &&
      trailStart > 0 &&
      (endsWith.get(fragment.slice(trailStart)) ?? 0) < EDGE_CLUSTER_MIN_COUNT
    ) {
      return false;
    }

    return true;
  };
}

/**
 * Builds two recognizability checks sharing the same common-word data:
 *
 * - `isStronglyRecognizable`: direct membership, a simple inflectional
 *   suffix away from one (plurals, verb tenses, comparatives, -ly
 *   adverbs), or a compound of two pieces that *each themselves* pass this
 *   same strong check (e.g. "housekeeping" = "house" + "keeping", where
 *   "keeping" itself strongly reduces to "keep"). This is the bar for the
 *   puzzle's featured "longest word" — the one actually shown as the
 *   answer — so it reads as a plainly everyday word or a sensible
 *   combination of two of them, not a technically-valid but awkward
 *   derivation.
 * - `isRecognizable`: the broader check — also accepts derivational
 *   suffixes (-ness, -tion, -able, etc.) anywhere, including as one half
 *   of a compound split. This is deliberately looser and used only for the
 *   "enough guessable words overall" breadth requirement and the
 *   example-word variety pool, never for choosing the featured answer —
 *   stacking a compound split *and* a derivational suffix together (e.g.
 *   "careless" + "ness" via "care" + "lessness") is exactly how words like
 *   "carelessness" or "roundaboutness" would otherwise sneak in as if they
 *   were as plain as their root word.
 */
function makeRecognizer(commonWords: Set<string>) {
  const strongSingleCache = new Map<string, boolean>();
  const strongCache = new Map<string, boolean>();
  const looseCache = new Map<string, boolean>();

  function isStronglySingle(word: string): boolean {
    const cached = strongSingleCache.get(word);
    if (cached !== undefined) return cached;
    let result = commonWords.has(word);
    if (!result) {
      for (const candidate of rootCandidates(word, INFLECTIONAL_SUFFIX_RULES)) {
        if (commonWords.has(candidate)) {
          result = true;
          break;
        }
      }
    }
    strongSingleCache.set(word, result);
    return result;
  }

  // Compounds are only allowed into the strong tier if BOTH halves pass the
  // strong (direct-or-inflection) bar on their own — no derivational
  // stacking allowed here.
  function isStronglyRecognizable(word: string): boolean {
    if (isStronglySingle(word)) return true;

    const cached = strongCache.get(word);
    if (cached !== undefined) return cached;

    let result = false;
    for (let i = 3; i <= word.length - 3; i++) {
      if (isStronglySingle(word.slice(0, i)) && isStronglySingle(word.slice(i))) {
        result = true;
        break;
      }
    }
    strongCache.set(word, result);
    return result;
  }

  function isRecognizableSingle(word: string): boolean {
    if (isStronglySingle(word)) return true;
    const cached = looseCache.get(word);
    if (cached !== undefined) return cached;
    let result = false;
    for (const candidate of rootCandidates(word, DERIVATIONAL_SUFFIX_RULES)) {
      if (commonWords.has(candidate)) {
        result = true;
        break;
      }
    }
    looseCache.set(word, result);
    return result;
  }

  const compoundCache = new Map<string, boolean>();

  // Plenty of everyday words are compounds of two common words that neither
  // appear in the frequency list as a whole nor reduce to one via a simple
  // suffix (e.g. "housekeeping" = "house" + "keeping", "gatekeeper" = "gate"
  // + "keeper"). Split the word at every point and accept it if one side is
  // directly common and the other is independently recognizable — loosely
  // here, since this feeds the breadth/variety pool, not the featured answer.
  function isRecognizable(word: string): boolean {
    if (isRecognizableSingle(word)) return true;

    const cached = compoundCache.get(word);
    if (cached !== undefined) return cached;

    let result = false;
    for (let i = 3; i <= word.length - 3; i++) {
      const first = word.slice(0, i);
      const second = word.slice(i);
      if (commonWords.has(first) && isRecognizableSingle(second)) {
        result = true;
        break;
      }
    }
    compoundCache.set(word, result);
    return result;
  }

  return { isRecognizable, isStronglyRecognizable };
}

// --- Candidate index -------------------------------------------------------

interface Candidate {
  starter: string;
  exampleWords: string[];
  longestWord: string;
  longestLength: number;
  score: number;
}

/**
 * Picks up to EXAMPLE_WORDS_MAX recognizable words spanning short, medium,
 * and long lengths, always including the featured longestWord, so the
 * curated sample stays small but representative rather than exhaustive.
 */
function pickExampleWords(
  recognizableWords: string[],
  starter: string,
  longestWord: string
): string[] {
  const byLengthAsc = [...recognizableWords].sort((a, b) => a.length - b.length);
  const short = byLengthAsc.filter((w) => w.length - starter.length <= SHORT_BUCKET_MAX_DELTA);
  const medium = byLengthAsc.filter((w) => {
    const delta = w.length - starter.length;
    return delta > SHORT_BUCKET_MAX_DELTA && delta <= MEDIUM_BUCKET_MAX_DELTA;
  });
  const long = byLengthAsc.filter((w) => w.length - starter.length > MEDIUM_BUCKET_MAX_DELTA);

  const picked: string[] = [];
  const add = (word: string | undefined) => {
    if (word && word !== starter && !picked.includes(word) && picked.length < EXAMPLE_WORDS_MAX) {
      picked.push(word);
    }
  };

  add(short[0]);
  add(medium[0]);
  add(longestWord);
  add(long.find((w) => w !== longestWord)); // a second long option, if one exists
  add(medium[1]);
  add(short[1]);

  return picked;
}

function buildSubstringIndex(words: string[]): Map<string, string[]> {
  const index = new Map<string, string[]>();
  const seenInWord = new Set<string>();

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    seenInWord.clear();

    for (let len = MIN_STARTER_LEN; len <= MAX_STARTER_LEN; len++) {
      if (word.length < len) continue;
      for (let start = 0; start <= word.length - len; start++) {
        seenInWord.add(word.slice(start, start + len));
      }
    }

    seenInWord.forEach((sub) => {
      let bucket = index.get(sub);
      if (!bucket) {
        bucket = [];
        index.set(sub, bucket);
      }
      bucket.push(word);
    });

    if ((i + 1) % 25000 === 0) {
      console.log(`[index] processed ${i + 1}/${words.length} words...`);
    }
  }

  return index;
}

function selectCandidates(
  index: Map<string, string[]>,
  commonWords: Set<string>,
  dictionaryWords: Set<string>,
  words: string[]
): Candidate[] {
  const { isRecognizable, isStronglyRecognizable } = makeRecognizer(commonWords);
  const isPronounceable = makePronounceabilityChecker(words);
  const candidates: Candidate[] = [];
  let checked = 0;

  index.forEach((allMatches, starter) => {
    checked++;
    if (checked % 50000 === 0) {
      console.log(
        `[filter] evaluated ${checked}/${index.size} candidate substrings, kept ${candidates.length}...`
      );
    }

    // The starter must be a pure fragment, not a complete word on its own —
    // otherwise the trivial "guess" is just retyping the starter back with
    // zero added letters, which isn't a real puzzle.
    if (dictionaryWords.has(starter)) return;

    // The starter must also be a fragment a player can actually get a
    // foothold on — reject unpronounceable letter clusters (see above).
    if (!isPronounceable(starter)) return;

    if (allMatches.length < MIN_VALID_WORDS || allMatches.length > MAX_VALID_WORDS) {
      return;
    }

    // The featured "longest word" — the one actually shown as the puzzle's
    // answer — must be strongly recognizable (plainly common, or a simple
    // inflection of a common word), not just technically valid via a
    // compound split or an abstract derivational suffix. That looser bar
    // still applies below for general word-list breadth.
    let longestWord: string | null = null;
    for (const word of allMatches) {
      if (word.length <= (longestWord?.length ?? 0)) continue;
      if (!isStronglyRecognizable(word)) continue;
      longestWord = word;
    }
    if (!longestWord) return;

    const longestLength = longestWord.length;
    if (longestLength - starter.length < MIN_LENGTH_DELTA) return;

    // Require breadth: enough recognizable words overall, plus at least one
    // shorter/medium recognizable alternative besides the long showpiece
    // word — so there's always a realistic "easy" guess to reach for too.
    // This stays on the looser definition deliberately: it's just a depth
    // check (does this starter have enough real matches at all), not a
    // display list, and gameplay validates guesses against the full
    // dictionary regardless.
    const recognizableWords = allMatches.filter(isRecognizable);
    if (recognizableWords.length < MIN_RECOGNIZABLE_WORDS) return;

    let shortOrMediumCount = 0;
    for (const word of recognizableWords) {
      const delta = word.length - starter.length;
      if (delta <= MEDIUM_BUCKET_MAX_DELTA) shortOrMediumCount++;
    }
    if (shortOrMediumCount < 1) return;

    // Score favors puzzles with more "reach" (a longer showpiece word
    // relative to the starter) and more combinations (recognizable and
    // total matches) — no bonus for the starter being a common word, since
    // starters are now required to not be complete words at all.
    const score =
      (longestLength - starter.length) * 10 +
      Math.min(recognizableWords.length, 30) * 5 +
      Math.min(allMatches.length, 100);

    // exampleWords is what players actually *see* as hints/samples, so it
    // draws from the strong pool only — same bar as the featured answer —
    // even though the looser `recognizableWords` above is what determines
    // whether the puzzle qualifies at all.
    const stronglyRecognizableWords = allMatches.filter(isStronglyRecognizable);

    candidates.push({
      starter,
      exampleWords: pickExampleWords(stronglyRecognizableWords, starter, longestWord),
      longestWord,
      longestLength,
      score,
    });
  });

  return candidates;
}

// --- Main --------------------------------------------------------------

async function main() {
  console.log("=== Puzzle generation started ===");

  const dictionaryText = await ensureCached(
    DICTIONARY_PATH,
    DICTIONARY_URL,
    "ENABLE1 dictionary"
  );
  const commonWordsText = await ensureCached(
    COMMON_WORDS_PATH,
    COMMON_WORDS_URL,
    "common word frequency list"
  );

  const words = parseWordList(dictionaryText);
  const wordSet = new Set(words);
  const commonWords = new Set(parseWordList(commonWordsText));
  console.log(
    `[load] ${words.length} dictionary words, ${commonWords.size} common words`
  );

  console.log(
    `[index] building substring index (lengths ${MIN_STARTER_LEN}-${MAX_STARTER_LEN})...`
  );
  const index = buildSubstringIndex(words);
  console.log(`[index] built index of ${index.size} unique substrings`);

  console.log("[filter] scoring and filtering candidates...");
  const candidates = selectCandidates(index, commonWords, wordSet, words);
  console.log(`[filter] ${candidates.length} candidates passed all filters`);

  if (candidates.length < MIN_POOL_SIZE) {
    throw new Error(
      `Only found ${candidates.length} qualifying candidates, need at least ${MIN_POOL_SIZE}. ` +
        `Consider relaxing MIN_LENGTH_DELTA, MAX_VALID_WORDS, or the recognizability heuristic.`
    );
  }

  candidates.sort((a, b) => b.score - a.score);
  const selected = candidates.slice(0, TARGET_POOL_SIZE);
  // Shuffle deterministically-ish by starter so puzzles aren't grouped by
  // score (i.e. all the "common substring" ones first) when consumed in
  // order by the app.
  selected.sort((a, b) => a.starter.localeCompare(b.starter));

  const puzzles = selected.map((c, i) => ({
    id: i + 1,
    starter: c.starter,
    longestWord: c.longestWord,
    longestLength: c.longestLength,
    exampleWords: c.exampleWords,
  }));

  await writeFile(OUTPUT_PATH, JSON.stringify(puzzles, null, 2) + "\n", "utf8");
  console.log(`[output] wrote ${puzzles.length} puzzles to ${OUTPUT_PATH}`);

  console.log("[publish] copying dictionary.txt to /public/data ...");
  await mkdir(PUBLIC_DATA_DIR, { recursive: true });
  await copyFile(DICTIONARY_PATH, path.join(PUBLIC_DATA_DIR, "dictionary.txt"));
  console.log(`[publish] copied dictionary.txt to ${PUBLIC_DATA_DIR}`);
  console.log(
    "[publish] puzzles.json stays in /data only — lib/game.ts imports it directly (bundled, not fetched)."
  );

  console.log("=== Puzzle generation complete ===");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
