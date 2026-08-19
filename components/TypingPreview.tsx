"use client";

import { Tile } from "./Tile";
import { useFitTileSize } from "./useFitTileSize";

export interface TypingPreviewProps {
  input: string;
  starter: string;
  /** Caps tile size — smaller when shown inline inside the input bar itself. */
  maxTilePx?: number;
}

/**
 * Live tile preview of the guess being typed — empty outline tiles that
 * switch to the starter's pink fill once that stretch of letters matches
 * the puzzle's required fragment, giving immediate feedback before submit.
 */
export function TypingPreview({ input, starter, maxTilePx }: TypingPreviewProps) {
  const { containerRef, tilePx } = useFitTileSize(input.length, maxTilePx);

  if (input.length === 0) return null;

  const startIndex = input.toLowerCase().indexOf(starter);

  return (
    <div ref={containerRef} className="flex w-full gap-1">
      {input.split("").map((letter, i) => {
        const isMatch = startIndex !== -1 && i >= startIndex && i < startIndex + starter.length;
        return <Tile key={i} letter={letter} pixelSize={tilePx} variant={isMatch ? "starter" : "empty"} />;
      })}
    </div>
  );
}
