import AuthLayout from "~/app/auth/_components/AuthLayout";
import { AuthAside } from "../_components/AuthAside";

export default function SignUpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthLayout
      aside={<AuthAside variant="solid" />}
      reverse
      brandName="Birdseye Checkers"
      brandHref="/"
    >
      {children}
    </AuthLayout>
  );
}
