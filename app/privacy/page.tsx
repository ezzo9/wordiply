import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Wordiply Unlimited handles data: no accounts, no server-side storage, and what local storage and analytics are used for.",
  alternates: { canonical: "/privacy" },
};

const SECTION_HEADING = "font-tile text-xs font-bold uppercase tracking-wide text-white/80";
const BODY = "mt-2 text-sm leading-relaxed text-white/60";

export default function PrivacyPage() {
  return (
    <PageShell>
      <div className="flex flex-col gap-6">
        <div className="border-b border-white/20 pb-4">
          <h1 className="text-lg font-bold text-white">Privacy Policy</h1>
          <p className="mt-1 text-xs text-white/50">Last updated: August 19, 2026</p>
        </div>

        <section>
          <p className={BODY.replace("mt-2 ", "")}>
            Wordiply Unlimited is a word puzzle game. This page explains what data the site
            touches, in plain terms — there isn&apos;t much of it, because the game has no user
            accounts and no server-side database at all.
          </p>
        </section>

        <section>
          <h2 className={SECTION_HEADING}>The short version</h2>
          <p className={BODY}>
            There are no accounts to create and nothing you type is sent to or stored on a
            server. The only data involved is a small amount kept in your own browser (to avoid
            repeating puzzles and to remember your personal best), and, if enabled, aggregate
            traffic analytics that don&apos;t identify you individually.
          </p>
        </section>

        <section>
          <h2 className={SECTION_HEADING}>Data stored on your device</h2>
          <p className={BODY}>
            The game uses your browser&apos;s local storage — never a server — for two things:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-white/60">
            <li>
              Which Unlimited puzzles you&apos;ve already played, so you can work through the
              full pool before seeing a repeat.
            </li>
            <li>Your personal best score, so it can be shown to you on future visits.</li>
          </ul>
          <p className={BODY}>
            This data stays on your device, is never transmitted anywhere, and you can clear it
            at any time through your browser&apos;s site settings.
          </p>
        </section>

        <section>
          <h2 className={SECTION_HEADING}>Custom puzzle links</h2>
          <p className={BODY}>
            Custom mode encodes the starter letters you pick directly into the page&apos;s URL
            (the <code className="text-white/80">?s=</code> parameter) so you can share a link
            with a friend. That URL only ever contains letters you chose — no personal
            information — and isn&apos;t stored anywhere beyond wherever you choose to share it.
          </p>
        </section>

        <section>
          <h2 className={SECTION_HEADING}>Analytics</h2>
          <p className={BODY}>
            This site may use Google Analytics (GA4) to understand aggregate traffic, such as
            which pages are visited and roughly how many people are playing. When active, Google
            Analytics uses cookies and may log standard technical information like your
            approximate location (derived from IP address), device, and browser type. It does not
            identify you personally. You can opt out using your browser&apos;s cookie settings or
            tools like Google&apos;s{" "}
            <a
              href="https://tools.google.com/dlpage/gaoptout"
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-white/40 underline-offset-2 hover:decoration-white"
            >
              Analytics opt-out browser add-on
            </a>
            . See{" "}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-white/40 underline-offset-2 hover:decoration-white"
            >
              Google&apos;s Privacy Policy
            </a>{" "}
            for how Google itself handles this data.
          </p>
        </section>

        <section>
          <h2 className={SECTION_HEADING}>Hosting &amp; technical logs</h2>
          <p className={BODY}>
            Like virtually any website, requests to this site pass through standard
            infrastructure (our hosting provider and CDN), which may log routine technical
            details such as IP address and request timestamps for security and performance
            purposes. This is standard web server behavior, not something specific to Wordiply
            Unlimited, and isn&apos;t used to build a profile of you.
          </p>
        </section>

        <section>
          <h2 className={SECTION_HEADING}>No ads, no selling data</h2>
          <p className={BODY}>
            This site doesn&apos;t run advertising and doesn&apos;t sell, rent, or share any data
            with third parties beyond the analytics described above.
          </p>
        </section>

        <section>
          <h2 className={SECTION_HEADING}>Children&apos;s privacy</h2>
          <p className={BODY}>
            Wordiply Unlimited is a general-audience word game and isn&apos;t directed at
            children under 13. We don&apos;t knowingly collect personal information from
            children.
          </p>
        </section>

        <section>
          <h2 className={SECTION_HEADING}>Changes to this policy</h2>
          <p className={BODY}>
            If this policy changes, the &quot;last updated&quot; date at the top of this page
            will change too. Continued use of the site after an update means you accept the
            revised policy.
          </p>
        </section>

        <section>
          <h2 className={SECTION_HEADING}>Contact</h2>
          <p className={BODY}>
            Questions about this policy? Reach out at{" "}
            <a
              href="mailto:privacy@wordiplyunlimited.com"
              className="underline decoration-white/40 underline-offset-2 hover:decoration-white"
            >
              privacy@wordiplyunlimited.com
            </a>
            .
          </p>
        </section>

        <Link
          href="/"
          className="text-center text-xs font-medium text-white/50 underline-offset-4 hover:text-white/80 hover:underline"
        >
          ← Back to Wordiply Unlimited
        </Link>
      </div>
    </PageShell>
  );
}
