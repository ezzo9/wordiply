import type { Metadata, Viewport } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import { Analytics } from "@/components/Analytics";
import "./globals.css";

const bodyFont = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const tileFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-tile",
  display: "swap",
});

const SITE_NAME = "Wordiply Unlimited";
const DESCRIPTION =
  "Unlimited guesses to find the longest word containing your starter fragment. A new puzzle every day, or play Unlimited any time.";

export const metadata: Metadata = {
  metadataBase: new URL("https://wordiplyunlimited.com"),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  openGraph: {
    title: SITE_NAME,
    description: DESCRIPTION,
    url: "https://wordiplyunlimited.com",
    siteName: SITE_NAME,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: DESCRIPTION,
  },
};

// Without this, iOS Safari treats the on-screen keyboard as an overlay and
// auto-scrolls the page to keep the focused input above it — which is what
// pushes the starter word out of view. `resizes-content` makes Safari
// actually shrink the layout viewport for the keyboard instead, so the page
// reflows to fit above it rather than scrolling.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${bodyFont.variable} ${tileFont.variable} bg-background text-foreground font-sans antialiased`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
