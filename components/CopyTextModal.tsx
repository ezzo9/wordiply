"use client";

import { useRef, useState } from "react";
import { Button } from "./Button";
import { Modal } from "./Modal";

export interface CopyTextModalProps {
  title: string;
  text: string;
  onClose: () => void;
}

/**
 * Our own styled replacement for window.prompt() as a copy fallback — shown
 * only when neither the Web Share API nor the Clipboard API is available
 * (e.g. an insecure/non-HTTPS origin). Attempts the legacy execCommand
 * copy (still broadly supported without a secure-context requirement) so
 * the button actually works most of the time; the text is always visible
 * and selectable either way as the ultimate fallback.
 */
export function CopyTextModal({ title, text, onClose }: CopyTextModalProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [copied, setCopied] = useState(false);

  function handleCopyClick() {
    const el = textareaRef.current;
    if (!el) return;
    el.focus();
    el.select();
    try {
      if (document.execCommand("copy")) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // execCommand unsupported — the text is already selected for a manual copy.
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-tile text-lg font-bold text-stone-900 dark:text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg text-stone-500 hover:bg-stone-900/5 dark:text-stone-400 dark:hover:bg-white/10"
          >
            ×
          </button>
        </div>

        <div className="rounded-2xl border border-[#33397d]/15 bg-[#faf3f8] p-3 shadow-inner dark:border-white/15 dark:bg-stone-800">
          <textarea
            ref={textareaRef}
            readOnly
            value={text}
            onClick={(e) => e.currentTarget.select()}
            rows={5}
            className="w-full resize-none border-0 bg-transparent p-0 font-mono text-[0.8rem] leading-relaxed text-stone-700 outline-none dark:text-stone-200"
          />
        </div>

        <Button variant="navy" size="md" onClick={handleCopyClick} className="w-full !rounded-full">
          {copied ? "Copied!" : "Copy"}
        </Button>
        <p className="text-center text-xs text-stone-500 dark:text-stone-400">
          Or tap the text above to select it and copy manually.
        </p>
      </div>
    </Modal>
  );
}
