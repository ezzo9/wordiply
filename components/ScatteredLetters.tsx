const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// Deterministic PRNG (mulberry32) so the scatter is identical on server and
// client renders — using Math.random() here would cause a hydration mismatch.
function mulberry32(seed: number) {
  let state = seed;
  return function next() {
    state = (state + 0x6d2b79f5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface ScatterLetter {
  id: number;
  letter: string;
  top: number;
  left: number;
  rotate: number;
  scale: number;
  opacity: number;
}

function generateScatter(count: number, seed: number): ScatterLetter[] {
  const rand = mulberry32(seed);
  return Array.from({ length: count }, (_, id) => ({
    id,
    letter: LETTERS[Math.floor(rand() * LETTERS.length)],
    top: rand() * 100,
    left: rand() * 100,
    rotate: rand() * 32 - 16,
    scale: 0.6 + rand() * 1.1,
    opacity: 0.01 + rand() * 0.015,
  }));
}

// Own, original pattern (not sourced from any site's asset) — generated once
// at module load with a fixed seed so it's stable across renders.
const SCATTER = generateScatter(42, 20260815);

export function ScatteredLetters() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 select-none overflow-hidden"
    >
      {SCATTER.map((s) => (
        <span
          key={s.id}
          className="absolute font-tile font-bold text-white"
          style={{
            top: `${s.top}%`,
            left: `${s.left}%`,
            fontSize: "3rem",
            opacity: s.opacity,
            transform: `translate(-50%, -50%) rotate(${s.rotate}deg) scale(${s.scale})`,
          }}
        >
          {s.letter}
        </span>
      ))}
    </div>
  );
}
