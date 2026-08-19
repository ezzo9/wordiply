import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-4 border-t border-white/15 pt-3 text-center">
      <p className="text-xs leading-relaxed text-white/50">
        Wordiply Unlimited is an independent project and is not affiliated with, endorsed by, or
        sponsored by The Guardian.
      </p>
      <Link
        href="/privacy"
        className="mt-2 inline-block text-xs font-medium text-white/50 underline-offset-4 hover:text-white/80 hover:underline"
      >
        Privacy Policy
      </Link>
    </footer>
  );
}
