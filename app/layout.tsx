import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Permanent_Marker } from "next/font/google";
import "./globals.css";
import Footer from "./_components/footer";
import AuthProvider from "./_providers/auth";
import { Toaster } from "./_components/ui/sonner";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { BRAND_BACKGROUND, SHARE_TITLE, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "./_lib/site";
import { getFlagMode } from "./_lib/flags";
import SwRegister from "./_components/sw-register";

const sans = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk", display: "swap" });
const brand = Permanent_Marker({ subsets: ["latin"], weight: "400", variable: "--font-permanent-marker", display: "swap" });

// Imagem da prévia: app/opengraph-image.png e app/twitter-image.png (convenção de arquivo do Next).
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: SITE_NAME,
    title: SHARE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SHARE_TITLE,
    description: SITE_DESCRIPTION,
  },
  // PWA (Prompt 20): manifest em app/manifest.ts; no iPhone instalado, abre sem a barra do Safari.
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: "black",
  },
};

export const viewport: Viewport = {
  themeColor: BRAND_BACKGROUND,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`dark ${sans.variable} ${brand.variable} font-sans`}>
        <AuthProvider>
          <main className="flex-1">{children}</main>
          <Toaster />
          <Footer />
          <SwRegister modes={[getFlagMode("PWA_INSTALL"), getFlagMode("WEB_PUSH")]} />
        </AuthProvider>
        <Analytics />
        <SpeedInsights />

      </body>
    </html>
  );
}
