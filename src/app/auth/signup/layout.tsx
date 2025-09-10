import AuthLayout from "~/app/auth/_components/AuthLayout";

export default function SignUpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthLayout
      imageSrc="/rogue.png"
      imageAlt="Checkers"
      reverse
      brandName="Birdseye Checkers"
      brandHref="/"
    >
      {children}
    </AuthLayout>
  );
}