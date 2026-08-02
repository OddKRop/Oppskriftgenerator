import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Oppskriftgenerator",
  description: "Finn en tilfeldig oppskrift",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    // Etiketten under ikonet på hjem-skjermen. iOS kutter etter rundt tolv
    // tegn, så det fulle navnet ble «Oppskriftge…». Samme ord som manifestets
    // short_name.
    title: "Oppskrift",
  },
};

// viewport-fit=cover er det som gjør at env(safe-area-inset-*) i det hele tatt
// får en verdi. Uten den er innrykket 0px, og home-indikatoren på iPhone legger
// seg oppå tabbaren. Bredde og skala settes eksplisitt fordi et eget
// viewport-objekt erstatter Next sine standardverdier.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nb">
      <body className={`${inter.variable} bg-bg text-text antialiased`}>{children}</body>
    </html>
  );
}
