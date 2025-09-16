import Image from "next/image";
import AuthLayout from "~/app/auth/_components/AuthLayout";

export default function SignOutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthLayout
      aside={
        <Image
          src="/checker.png"
          alt="Checkers"
          fill
          className="object-fit"
          priority
        />
      }
      reverse
      brandName="Birdseye Checkers"
      brandHref="/"
    >
      {children}
    </AuthLayout>
  );
}
