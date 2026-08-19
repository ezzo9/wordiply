import type { Metadata } from "next";
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
