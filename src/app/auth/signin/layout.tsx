import AuthLayout from "~/app/auth/_components/AuthLayout";

export default function SignInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthLayout
      imageSrc="/checkers.png"
      imageAlt="Checkers"
      reverse={false}
      brandName="Birdseye Checkers"
      brandHref="/"
    >
      {children}
    </AuthLayout>
  );
}