import { type Metadata } from "next";
import { getServerAuthSession } from "~/server/auth";
import { redirect } from "next/navigation";
import ProfileManagement from "~/components/profile/ProfileManagement";
import StatsSection from "~/components/profile/StatsSection";
import MatchHistory from "~/components/profile/MatchHistory";

export const metadata: Metadata = {
  title: "Your Profile",
  description: "View your checkers statistics, match history, and manage your profile settings.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function ProfilePage() {
  const session = await getServerAuthSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold">Profile</h1>

      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">Overview</h2>
        <ProfileManagement userId={session.user.id} />
      </section>

      <section className="mt-10 space-y-6">
        <h2 className="text-2xl font-semibold">Statistics</h2>
        <StatsSection userId={session.user.id} />
      </section>

      <section className="mt-10 space-y-6">
        <h2 className="text-2xl font-semibold">Match History</h2>
        <MatchHistory userId={session.user.id} />
      </section>
    </div>
  );
}