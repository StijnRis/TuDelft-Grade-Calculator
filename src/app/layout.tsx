import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} – final grade & required exam grade`, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  keywords: ["TU Delft", "grade calculator", "studiegids", "study guide", "exam grade", "ECTS"],
  alternates: { canonical: "/" },
  openGraph: { title: SITE_NAME, description: SITE_DESCRIPTION, type: "website", siteName: SITE_NAME, url: SITE_URL },
  twitter: { card: "summary", title: SITE_NAME, description: SITE_DESCRIPTION },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { themeColor: "#00a6d6", width: "device-width", initialScale: 1 };

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  applicationCategory: "EducationalApplication",
  operatingSystem: "Any",
  offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <header className="nav">
          <div className="container nav-inner">
            <Link href="/" className="brand">🎓 {SITE_NAME}</Link>
            <nav>
              <Link href="/calculator/">Manual calculator</Link>
            </nav>
          </div>
        </header>
        <main className="container">{children}</main>
        <footer className="footer container">
          <p>
            Unofficial tool, not affiliated with TU Delft. Data comes from the{" "}
            <a href="https://studiegids.tudelft.nl/" rel="noopener">TU Delft study guide</a>.
            Always check the official course page for the binding assessment rules.
          </p>
        </footer>
      </body>
    </html>
  );
}
