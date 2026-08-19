const ROW_1 = "QWERTYUIOP".split("");
const ROW_2 = "ASDFGHJKL".split("");
const ROW_3 = "ZXCVBNM".split("");

const KEY_BASE =
  "flex h-11 items-center justify-center rounded-md text-base font-semibold shadow-sm active:brightness-90 select-none";

function LetterKey({ letter, onPress }: { letter: string; onPress: (letter: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onPress(letter)}
      className={`${KEY_BASE} min-w-0 flex-1 bg-white text-[#33397d]`}
    >
      {letter}
    </button>
  );
}

/**
 * A custom on-screen QWERTY keyboard, fixed to the bottom of the viewport,
 * mobile-only (hidden at the `sm` breakpoint and up). Replaces the native
 * keyboard on mobile entirely — the real guess `<input>` is read-only there
 * — so typing never triggers iOS's focus-driven page scroll.
 */
export function MobileKeyboard({
  onLetter,
  onBackspace,
  onEnter,
  enterDisabled,
}: {
  onLetter: (letter: string) => void;
  onBackspace: () => void;
  onEnter: () => void;
  enterDisabled?: boolean;
}) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-[#33397d] pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 sm:hidden"
      role="group"
      aria-label="On-screen keyboard"
    >
      <div className="mx-auto flex max-w-md flex-col gap-1.5 px-1.5">
        <div className="flex gap-1.5">
          {ROW_1.map((letter) => (
            <LetterKey key={letter} letter={letter} onPress={onLetter} />
          ))}
        </div>
        <div className="flex gap-1.5 px-4">
          {ROW_2.map((letter) => (
            <LetterKey key={letter} letter={letter} onPress={onLetter} />
          ))}
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={onEnter}
            disabled={enterDisabled}
            className={`${KEY_BASE} min-w-0 flex-[1.6] bg-brand-600 text-xs text-white disabled:opacity-50`}
          >
            ENTER
          </button>
          {ROW_3.map((letter) => (
            <LetterKey key={letter} letter={letter} onPress={onLetter} />
          ))}
          <button
            type="button"
            onClick={onBackspace}
            aria-label="Backspace"
            className={`${KEY_BASE} min-w-0 flex-[1.6] bg-white/20 text-base text-white`}
          >
            ⌫
          </button>
        </div>
      </div>
    </div>
  );
}
