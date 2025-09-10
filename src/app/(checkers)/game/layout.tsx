import { type Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Play Checkers",
    template: "%s - Birdseye Checkers",
  },
  description:
    "Play checkers online. Choose from local multiplayer, AI opponents, or online battles with friends.",
  openGraph: {
    title: "Play Checkers Online",
    description:
      "Challenge friends or AI opponents in classic checkers gameplay.",
    images: ["/og-image.png"],
  },
};

export default function GameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
