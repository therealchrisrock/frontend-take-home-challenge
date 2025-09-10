import { type Metadata } from "next";
import { getServerAuthSession } from "~/server/auth";
import { redirect } from "next/navigation";
import MatchHistoryTable from "~/components/history/MatchHistoryTable";

export const metadata: Metadata = {
  title: "Match History",
  description:
    "Review your checkers game history, analyze past matches, and track your progress over time.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function HistoryPage() {
  const session = await getServerAuthSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Match History</h1>
        <p className="text-muted-foreground mt-2">
          View and analyze your complete game history
        </p>
      </div>

      <MatchHistoryTable userId={session.user.id} />
    </div>
  );
}
