import "~/styles/globals.css";

import { type Metadata, type Viewport } from "next";
import { Geist } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";
import { Providers } from "./_components/providers";
import { SkinStyleInjector } from "~/components/SkinStyleInjector";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? "https://checkers.game"),
  title: {
    default: "Birdseye Checkers - Play Online & Challenge Friends",
    template: "%s | Birdseye Checkers",
  },
  description: "Play checkers online with friends or AI opponents. Master classic checkers with multiple difficulty levels, real-time multiplayer, and battle royale modes. Free to play!",
  keywords: [
    "checkers",
    "draughts",
    "board game",
    "online checkers",
    "multiplayer checkers",
    "checkers game",
    "play checkers",
    "checkers online",
    "checkers AI",
    "checkers bot",
    "free checkers",
  ],
  authors: [{ name: "Checkers Game Team" }],
  creator: "Birdseye Checkers",
  publisher: "Birdseye Checkers",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: "Birdseye Checkers - Play Online & Challenge Friends",
    description: "Play checkers online with friends or AI opponents. Master classic checkers with multiple difficulty levels and game modes.",
    url: "/",
    siteName: "Birdseye Checkers",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Birdseye Checkers - Play Online",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Birdseye Checkers - Play Online & Challenge Friends",
    description: "Play checkers online with friends or AI opponents. Free to play!",
    images: ["/og-image.png"],
    creator: "@checkersgame",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      {
        rel: "mask-icon",
        url: "/safari-pinned-tab.svg",
        color: "#f59e0b",
      },
    ],
  },
  manifest: "/site.webmanifest",
  alternates: {
    canonical: "/",
  },
  category: "games",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1f2937" },
  ],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable}`}>
      <head>
        <SkinStyleInjector />
      </head>
      <body>
        <Providers>
          <TRPCReactProvider>
            {children}
          </TRPCReactProvider>
        </Providers>
      </body>
    </html>
  );
}
