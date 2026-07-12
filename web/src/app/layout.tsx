import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  metadataBase: new URL("https://botsbuilderkids.com"),
  title: {
    default: "Bots Builder — Kids Robotics Classes in Frisco, TX",
    template: "%s · Bots Builder",
  },
  description:
    "Robotics and coding classes for kids ages 7–14 in Frisco, TX. Kids build and program real VEX robots, earn skill badges, and progress toward the VEX World Championship in Dallas. Small 8-kid classes taught by a professional engineer.",
  keywords: [
    "kids robotics classes Frisco",
    "robotics classes for kids Frisco TX",
    "kids coding classes Frisco",
    "VEX robotics Frisco",
    "STEM classes for kids Frisco",
    "robotics camp Frisco Texas",
    "after school robotics Collin County",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title: "Bots Builder — Kids Robotics Classes in Frisco, TX",
    description:
      "Kids build and program autonomous robots on a four-level engineering ladder. Small 8-kid classes, skill badges, parent Demo Days.",
    url: "https://botsbuilderkids.com",
    siteName: "Bots Builder",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bots Builder — Kids Robotics Classes in Frisco, TX",
    description:
      "Real engineering for ages 7–14. Small classes, VEX robots, a ladder to the World Championship in Dallas.",
  },
  robots: { index: true, follow: true },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "Bots Builder",
  description: "Robotics and coding classes for kids ages 7–14 in Frisco, Texas.",
  email: "support@botsbuilderkids.com",
  // Business address is city-level only; classes are held at a venue we don't own.
  address: { "@type": "PostalAddress", addressLocality: "Frisco", addressRegion: "TX", addressCountry: "US" },
  areaServed: "Frisco, TX",
  priceRange: "$25–$599",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,800&family=Atkinson+Hyperlegible:wght@400;700&family=IBM+Plex+Mono:wght@400;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Providers>
          <Nav />
          <main>{children}</main>
          <footer className="footer">
            <div className="footer-grid">
              <div>
                <p className="footer-brand">Bots Builder LLC</p>
                <p>Robotics classes for ages 7–14 · Frisco, Texas</p>
              </div>
              <div>
                <p className="footer-head">Contact</p>
                <p><a href="mailto:support@botsbuilderkids.com">support@botsbuilderkids.com</a></p>
                <p><a href="/contact/">Contact form</a></p>
              </div>
              <div>
                <p className="footer-head">Programs</p>
                <p><a href="/programs/">The four-level ladder</a></p>
                <p><a href="/schedule/">Schedule &amp; enrollment</a></p>
                <p><a href="/pricing/">Pricing</a></p>
                <p><a href="/faq/">FAQ</a></p>
                <p><a href="/terms/">Terms</a> · <a href="/privacy/">Privacy</a> · <a href="/refunds/">Refunds</a></p>
              </div>
            </div>
            <p className="footer-fine">
              © {new Date().getFullYear()} Bots Builder LLC. VEX and VEX IQ are trademarks of
              Innovation First, Inc. Bots Builder is an independent program, not affiliated with
              or endorsed by Innovation First.
            </p>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
