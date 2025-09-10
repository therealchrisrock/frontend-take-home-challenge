import AuthLayout from "~/app/auth/_components/AuthLayout";

export default function SignOutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthLayout
      imageSrc="/roguelike.png"
      imageAlt="Checkers"
      reverse
      brandName="Birdseye Checkers"
      brandHref="/"
    >
      {children}
    </AuthLayout>
  );
}
