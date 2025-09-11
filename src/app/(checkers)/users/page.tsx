import { type Metadata } from "next";
import SimpleUsersList from "~/app/(checkers)/users/_components/simple-users-list";
import { getServerAuthSession } from "~/server/auth";

export const metadata: Metadata = {
  title: "Player Directory",
  description:
    "Browse and connect with checkers players from around the world. View profiles, stats, and challenge players.",
  openGraph: {
    title: "Player Directory - Birdseye Checkers",
    description:
      "Discover and challenge checkers players from our global community.",
  },
};

export default async function UsersPage() {
  const session = await getServerAuthSession();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-3xl font-bold text-transparent">
          Player Directory
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Discover and connect with other players
        </p>
      </div>

      <SimpleUsersList currentUserId={session?.user?.id} />
    </div>
  );
}
