export type TileVariant = "filled" | "accent" | "outline" | "ghost" | "starter" | "empty" | "emptyLight" | "navy";
export type TileSize = "sm" | "md" | "lg" | "xl";

const SIZE_CLASSES: Record<TileSize, string> = {
  sm: "h-8 w-8 text-lg rounded-md border-[1.5px] sm:h-9 sm:w-9 sm:text-xl",
  md: "h-10 w-10 text-xl rounded-lg border-2 sm:h-11 sm:w-11 sm:text-2xl",
  lg: "h-12 w-12 text-3xl rounded-lg border-2 sm:h-14 sm:w-14 sm:text-4xl",
  xl: "h-14 w-14 text-4xl rounded-xl border-2 sm:h-16 sm:w-16 sm:text-5xl",
};

const VARIANT_CLASSES: Record<TileVariant, string> = {
  filled: "bg-brand-600 border-brand-700 text-white",
  accent: "bg-accent-500 border-accent-600 text-white",
  outline:
    "bg-white border-stone-300 text-stone-800 dark:bg-stone-800 dark:border-stone-600 dark:text-stone-100",
  ghost:
    "bg-stone-100 border-stone-200 text-stone-400 dark:bg-stone-800/60 dark:border-stone-700 dark:text-stone-500",
  // For the puzzle's starter letters and any found word containing them —
  // a soft blush tile with dark indigo text, close in spirit to the genre's
  // usual pink/navy combo but our own tone (deliberately not sampled from
  // any specific site's exact hex values).
  starter: "bg-[#f3dded] border-[#e6c2da] text-[#33397d]",
  // Transparent fill, white border — for letters outside the starter match,
  // on the indigo page background (live typing preview, in-game guesses).
  // Full-opacity border (not a faded white) so it reads with the same visual
  // weight as the filled "starter" tiles beside it, not smaller/lighter.
  empty: "bg-transparent border-white text-white",
  // Same idea, but for the same context on a light card (results, how-to-play).
  emptyLight: "bg-transparent border-stone-300 text-stone-700 dark:border-stone-500 dark:text-stone-200",
  // Solid navy fill — pairs with "starter" pink as the results screen's only
  // two tones (no teal/amber there), matching the pink-card + navy-tile combo.
  navy: "bg-[#33397d] border-[#282d63] text-white",
};

export interface TileProps {
  letter: string;
  variant?: TileVariant;
  size?: TileSize;
  /** Exact pixel dimension — overrides `size`, for rows that auto-fit to one line (see useFitTileSize). */
  pixelSize?: number;
  /** Extra-bold weight, for the puzzle's own starter letters so they stand out from guessed words. */
  heavy?: boolean;
  className?: string;
}

/** A single straight (never rotated) letter tile — our own take on the genre's tile motif. */
export function Tile({
  letter,
  variant = "filled",
  size = "md",
  pixelSize,
  heavy = false,
  className = "",
}: TileProps) {
  const style = pixelSize
    ? {
        width: pixelSize,
        height: pixelSize,
        fontSize: Math.max(11, Math.round(pixelSize * 0.62)),
      }
    : undefined;

  return (
    <div
      style={style}
      className={`flex select-none items-center justify-center font-tile ${heavy ? "font-extrabold" : "font-bold"} uppercase leading-none shadow-sm ${pixelSize ? "shrink-0 rounded-md border-[1.5px]" : SIZE_CLASSES[size]} ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {letter}
    </div>
  );
}
