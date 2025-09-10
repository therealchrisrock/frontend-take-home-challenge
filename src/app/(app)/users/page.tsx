import { type Metadata } from "next";
import { getServerAuthSession } from "~/server/auth";
import UsersBrowser from "~/components/profile/UsersBrowser";

export const metadata: Metadata = {
  title: "Player Directory",
  description: "Browse and connect with checkers players from around the world. View profiles, stats, and challenge players.",
  openGraph: {
    title: "Player Directory - Birdseye Checkers",
    description: "Discover and challenge checkers players from our global community.",
  },
};

export default async function UsersPage() {
  const session = await getServerAuthSession();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Player Directory
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Discover and connect with other players
        </p>
      </div>

      <UsersBrowser currentUserId={session?.user?.id} />
    </div>
  );
}

