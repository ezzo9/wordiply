"use client";

import { Button } from "./Button";
import { Modal } from "./Modal";

export interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Our own styled replacement for window.confirm(). */
export function ConfirmModal({ title, message, confirmLabel, onConfirm, onCancel }: ConfirmModalProps) {
  return (
    <Modal onClose={onCancel}>
      <div className="flex flex-col gap-4">
        <h2 className="font-tile text-lg font-bold text-stone-900 dark:text-white">{title}</h2>
        <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-300">{message}</p>
        <div className="flex gap-3">
          <Button variant="navyOutline" size="md" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button variant="navy" size="md" onClick={onConfirm} className="flex-1">
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
