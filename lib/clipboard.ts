/**
 * Legacy copy-to-clipboard via a temporary offscreen textarea + execCommand.
 * Unlike the modern Clipboard API, this works synchronously in most
 * browsers even outside a secure context (plain HTTP, non-localhost) —
 * it's the fallback tier that makes "Copy" a genuine one-click action
 * instead of requiring a second manual copy step, in the cases where
 * navigator.clipboard isn't available at all.
 */
export function legacyCopyToClipboard(text: string): boolean {
  if (typeof document === "undefined") return false;

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "-9999px";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  let succeeded = false;
  try {
    succeeded = document.execCommand("copy");
  } catch {
    succeeded = false;
  }

  document.body.removeChild(textarea);
  return succeeded;
}
