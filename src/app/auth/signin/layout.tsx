import { redirect } from "next/navigation";
import AuthLayout from "~/app/auth/_components/AuthLayout";
import { getServerAuthSession } from "~/server/auth";
import { AuthAside } from "../_components/AuthAside";

export default async function SignInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerAuthSession();
  if (session) {
    redirect("/");
  }
  return (
    <AuthLayout
      aside={<AuthAside variant="solid" />}
      reverse={false}
      brandName="Birdseye Checkers"
      brandHref="/"
    >
      {children}
    </AuthLayout>
  );
}
