export interface ModalProps {
  children: React.ReactNode;
  /** When provided, clicking the backdrop (not the card itself) dismisses the modal. Omit for modals that shouldn't be casually dismissed (e.g. results). */
  onClose?: () => void;
}

export function Modal({ children, onClose }: ModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose ? (e) => e.target === e.currentTarget && onClose() : undefined}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#424c94] p-4"
    >
      <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl bg-[#f6e3ef] p-4 shadow-2xl dark:bg-stone-900">
        {children}
      </div>
    </div>
  );
}
