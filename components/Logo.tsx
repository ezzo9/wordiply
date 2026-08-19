import { Tile, type TileSize } from "./Tile";

const WORDMARK = "WORDIPLY";

export interface LogoProps {
  size?: TileSize;
  className?: string;
  /** True when rendered directly on the indigo page background rather than a light card. */
  onDarkSurface?: boolean;
  /** Solid navy tiles instead of alternating brand/accent — for the pink results card. */
  monochromeNavy?: boolean;
}

/**
 * Straight (non-rotated) tile wordmark. Letters alternate brand/accent fill
 * for visual rhythm instead of the tilted, alternating-rotation treatment
 * other tile-word games use.
 */
export function Logo({
  size = "sm",
  className = "",
  onDarkSurface = false,
  monochromeNavy = false,
}: LogoProps) {
  return (
    <div className={`flex flex-col items-center gap-1.5 ${className}`}>
      <div className="flex gap-1">
        {WORDMARK.split("").map((letter, i) => (
          <Tile
            key={i}
            letter={letter}
            size={size}
            variant={monochromeNavy ? "navy" : i % 2 === 0 ? "filled" : "accent"}
          />
        ))}
      </div>
      <span
        className={`text-xs font-semibold uppercase tracking-[0.35em] ${
          onDarkSurface ? "text-white/70" : "text-stone-500 dark:text-stone-400"
        }`}
      >
        Unlimited
      </span>
    </div>
  );
}
