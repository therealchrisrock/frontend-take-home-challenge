import { Header } from "~/components/Header";
import { FriendsMiniDrawer } from "~/components/friends-mini-drawer";
import { getServerAuthSession } from "~/server/auth";

export async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerAuthSession();
  return (
    <div className="">
      {/* Header */}
      <Header className={session?.user ? "lg:pr-16" : ""} />

      {/* Main Content */}
      <div className={`relative ${session?.user ? "lg:pr-16" : ""}`}>
        <main className="">{children}</main>
      </div>

      {/* Right-side friends mini drawer (fixed). Always present on desktop. */}
      {session?.user ? <FriendsMiniDrawer /> : null}
    </div>
  );
}
