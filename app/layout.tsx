import type { Metadata } from "next";
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
