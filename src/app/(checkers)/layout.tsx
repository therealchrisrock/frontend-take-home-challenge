import { AppLayout } from "~/components/AppLayout";

export default function MainAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout>{children}</AppLayout>;
}
