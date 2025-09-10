import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Authentication",
  description:
    "Sign in or create an account to play Checkers online with friends and AI opponents.",
  openGraph: {
    title: "Sign In - Birdseye Checkers",
    description:
      "Join the Checkers community. Sign in or create a free account to start playing.",
    images: ["/og-image.png"],
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
