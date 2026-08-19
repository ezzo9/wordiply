import { useEffect, useRef, useState } from "react";

const GAP_PX = 4;
const MIN_TILE_PX = 15;
const MAX_TILE_PX = 40;

/**
 * Measures its container's real rendered width and computes the tile size
 * (in px) needed to fit `letterCount` tiles — plus the gaps between them —
 * on exactly one row, so long words never wrap mid-word. Clamped between a
 * legibility floor and a sensible ceiling.
 */
export function useFitTileSize(letterCount: number, maxTilePx: number = MAX_TILE_PX) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tilePx, setTilePx] = useState(maxTilePx);

  useEffect(() => {
    function measure() {
      const width = containerRef.current?.getBoundingClientRect().width;
      if (!width || letterCount === 0) return;
      const raw = (width - (letterCount - 1) * GAP_PX) / letterCount;
      setTilePx(Math.max(MIN_TILE_PX, Math.min(maxTilePx, Math.floor(raw))));
    }

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [letterCount, maxTilePx]);

  return { containerRef, tilePx, gapPx: GAP_PX };
}
