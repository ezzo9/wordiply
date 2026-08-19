"use client";

import { useEffect, useState } from "react";

// Matches Tailwind's `sm` breakpoint (640px) so this always agrees with the
// `sm:` classes used everywhere else for mobile/desktop layout differences.
const MOBILE_QUERY = "(max-width: 639px)";

/** Defaults to false (desktop) until mounted — avoids an SSR/client mismatch, at the cost of a brief flash on real mobile devices. */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    setIsMobile(mql.matches);
    const listener = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", listener);
    return () => mql.removeEventListener("change", listener);
  }, []);

  return isMobile;
}
