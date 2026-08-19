"use client";

import { Tile } from "./Tile";
import { useFitTileSize } from "./useFitTileSize";

export interface GuessRowProps {
  word: string;
  starter: string;
  /** True when rendered directly on the indigo page background (GameScreen) rather than the results card. */
  onDarkSurface?: boolean;
  /** Smaller tiles + number, for the results screen's stacked guess list so a full 5-guess round fits without scrolling. */
  compact?: boolean;
  /**
   * A tile size shared across every row in the list (computed once from the
   * longest current guess), instead of each row auto-fitting to its own
   * width. Centers the tiles+count as one block per row — short words don't
   * get stretched to fill the line — matching the genre's usual in-game
   * guess-list treatment.
   */
  sharedTilePx?: number;
}

const COMPACT_MAX_TILE_PX = 22;

/**
 * Renders a submitted guess as a row of tiles — the letters that match the
 * puzzle's starter fragment get a solid fill, the rest are empty outline
 * tiles, matching the live typing preview's treatment. Letter count shown
 * right after the last tile.
 */
export function GuessRow({ word, starter, onDarkSurface = false, compact = false, sharedTilePx }: GuessRowProps) {
  const { containerRef, tilePx: autoTilePx } = useFitTileSize(
    word.length,
    compact ? COMPACT_MAX_TILE_PX : undefined
  );
  const startIndex = word.indexOf(starter);
  const emptyVariant = onDarkSurface ? "empty" : "emptyLight";
  const tilePx = sharedTilePx ?? autoTilePx;

  return (
    <div className={`flex w-full items-center gap-1.5 ${sharedTilePx !== undefined ? "justify-center" : ""}`}>
      <div
        ref={sharedTilePx === undefined ? containerRef : undefined}
        className={sharedTilePx !== undefined ? "flex shrink-0 gap-1" : "flex min-w-0 flex-1 gap-1"}
      >
        {word.split("").map((letter, i) => {
          const isMatch = startIndex !== -1 && i >= startIndex && i < startIndex + starter.length;
          return (
            <Tile key={i} letter={letter} pixelSize={tilePx} variant={isMatch ? "starter" : emptyVariant} />
          );
        })}
      </div>
      <span
        className={`shrink-0 font-tile ${compact ? "text-base" : "text-2xl"} font-extrabold ${
          onDarkSurface ? "text-accent-400" : "text-[#33397d] dark:text-white"
        }`}
      >
        {word.length}
      </span>
    </div>
  );
}
