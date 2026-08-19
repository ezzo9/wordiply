"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { legacyCopyToClipboard } from "@/lib/clipboard";
import {
  CUSTOM_STARTER_MAX_LEN,
  CUSTOM_STARTER_MIN_LEN,
  buildCustomPuzzle,
  findLongestWordForStarter,
  loadDictionary,
  normalizeCustomStarter,
} from "@/lib/game";
import { Button } from "./Button";
import { CopyTextModal } from "./CopyTextModal";
import { GameScreen } from "./GameScreen";
import { Tile } from "./Tile";

export function CustomModeScreen({ initialStarter }: { initialStarter?: string }) {
  const [dictionary, setDictionary] = useState<Set<string> | null>(null);
  const [dictionaryError, setDictionaryError] = useState(false);

  useEffect(() => {
    loadDictionary()
      .then(setDictionary)
      .catch(() => setDictionaryError(true));
  }, []);

  const urlStarter = initialStarter ? normalizeCustomStarter(initialStarter) : "";

  // A starter is present in the URL — this visitor is here to play someone
  // else's shared puzzle, not create one.
  if (urlStarter.length >= CUSTOM_STARTER_MIN_LEN) {
    if (dictionaryError) {
      return (
        <StatusMessage title="Couldn't load the dictionary">
          Try refreshing the page.
        </StatusMessage>
      );
    }
    if (!dictionary) {
      return <StatusMessage title="Loading your puzzle…">Just a moment.</StatusMessage>;
    }
    const puzzle = buildCustomPuzzle(urlStarter, dictionary);
    if (!puzzle) {
      return (
        <StatusMessage title="This puzzle link isn't valid">
          No English words contain &ldquo;{urlStarter.toUpperCase()}&rdquo;.{" "}
          <Link href="/custom" className="underline underline-offset-2 hover:text-white">
            Create your own puzzle
          </Link>{" "}
          instead.
        </StatusMessage>
      );
    }
    return <GameScreen mode="custom" customPuzzle={puzzle} />;
  }

  return <CreatePuzzleForm dictionary={dictionary} dictionaryError={dictionaryError} />;
}

function StatusMessage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-center">
      <h1 className="font-tile text-lg font-bold text-white">{title}</h1>
      <p className="max-w-xs text-sm text-white/70">{children}</p>
    </div>
  );
}

function CreatePuzzleForm({
  dictionary,
  dictionaryError,
}: {
  dictionary: Set<string> | null;
  dictionaryError: boolean;
}) {
  const [raw, setRaw] = useState("");
  const [shareStatus, setShareStatus] = useState<"idle" | "copied" | "shared">("idle");
  const [copyFallbackText, setCopyFallbackText] = useState<string | null>(null);
  const starter = normalizeCustomStarter(raw);

  const tooShort = starter.length > 0 && starter.length < CUSTOM_STARTER_MIN_LEN;
  const match =
    dictionary && starter.length >= CUSTOM_STARTER_MIN_LEN
      ? findLongestWordForStarter(starter, dictionary)
      : null;
  const noMatches = dictionary && starter.length >= CUSTOM_STARTER_MIN_LEN && !match;
  const checking = !dictionary && !dictionaryError && starter.length >= CUSTOM_STARTER_MIN_LEN;
  const isReady = starter.length >= CUSTOM_STARTER_MIN_LEN && !!match;

  async function handleCopyLink() {
    if (!isReady) return;
    const url = `${window.location.origin}/custom?s=${starter}`;
    const text = `Can you beat my Wordiply puzzle? Starter: ${starter.toUpperCase()}\n${url}`;

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ text });
        setShareStatus("shared");
        setTimeout(() => setShareStatus("idle"), 2500);
      } catch {
        // User cancelled the native share sheet — no-op.
      }
      return;
    }

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(url);
        setShareStatus("copied");
        setTimeout(() => setShareStatus("idle"), 2500);
        return;
      } catch {
        // Falls through to the manual prompt below.
      }
    }

    // Clipboard API is unavailable (insecure/non-HTTPS origin) — the legacy
    // execCommand copy still works synchronously in most browsers even
    // there, so this stays a genuine one-click action instead of forcing a
    // second manual copy step.
    if (legacyCopyToClipboard(url)) {
      setShareStatus("copied");
      setTimeout(() => setShareStatus("idle"), 2500);
      return;
    }

    // Truly nothing worked — last resort manual copy dialog, not the
    // browser's native window.prompt().
    setCopyFallbackText(url);
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-white/60">
            Custom mode
          </p>
          <h1 className="font-tile text-xl font-bold text-white sm:text-2xl">Create a puzzle</h1>
          <p className="mt-2 text-sm text-white/70">
            Pick your own starter letters, then send the link to a friend — they&apos;ll play the
            exact same puzzle and try to beat your score.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="starter-input" className="text-xs font-semibold uppercase tracking-wide text-white/60">
            Starter letters ({CUSTOM_STARTER_MIN_LEN}-{CUSTOM_STARTER_MAX_LEN})
          </label>
          <input
            id="starter-input"
            type="text"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder="e.g. marc"
            className="w-full border-b-2 border-white/30 bg-transparent pb-2 text-xl font-normal text-white outline-none placeholder:text-white/40 focus:border-white"
          />

          {starter.length > 0 && (
            <div className="mt-1 flex justify-center gap-1">
              {starter.split("").map((letter, i) => (
                <Tile key={i} letter={letter} size="sm" variant="starter" heavy />
              ))}
            </div>
          )}

          <div className="min-h-[2.5rem] text-center text-sm">
            {tooShort && (
              <p className="text-white/60">Needs at least {CUSTOM_STARTER_MIN_LEN} letters.</p>
            )}
            {checking && <p className="text-white/60">Checking the dictionary…</p>}
            {noMatches && (
              <p className="text-accent-300">
                No English words contain &ldquo;{starter.toUpperCase()}&rdquo; — try something else.
              </p>
            )}
            {isReady && match && (
              <p className="text-white/80">
                {match.matchCount} {match.matchCount === 1 ? "word contains" : "words contain"} this — longest
                is <span className="font-semibold text-white">{match.longestWord.toUpperCase()}</span> (
                {match.longestLength} letters).
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center gap-3">
          <Button variant="primary" size="md" onClick={handleCopyLink} disabled={!isReady} className="w-full">
            {shareStatus === "idle" && "Copy puzzle link"}
            {shareStatus === "copied" && "Copied!"}
            {shareStatus === "shared" && "Shared!"}
          </Button>
          {isReady && (
            <Link
              href={`/custom?s=${starter}`}
              className="text-center text-xs font-medium text-white/60 underline-offset-4 hover:underline"
            >
              Play it yourself first →
            </Link>
          )}
        </div>
      </div>

      {copyFallbackText && (
        <CopyTextModal
          title="Copy your puzzle link"
          text={copyFallbackText}
          onClose={() => setCopyFallbackText(null)}
        />
      )}
    </>
  );
}
