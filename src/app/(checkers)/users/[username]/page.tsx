import { notFound } from "next/navigation";
import { api } from "~/trpc/server";
import GameProfileView from "~/components/profile/GameProfileView";
import { getServerAuthSession } from "~/server/auth";

interface PageProps {
  params: Promise<{
    username: string;
  }>;
}

export default async function UserProfilePage({ params }: PageProps) {
  const { username } = await params;
  const session = await getServerAuthSession();

  try {
    const user = await api.user.getProfile({ username });
    
    if (!user) {
      notFound();
    }

    // Don't allow viewing own profile through this route
    if (session?.user?.id === user.id) {
      // Redirect to own profile page
      return (
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">This is your profile!</h1>
            <a href="/profile" className="text-primary hover:underline">
              View your editable profile →
            </a>
          </div>
        </div>
      );
    }

    const [stats, matchHistory] = await Promise.all([
      api.user.getGameStats({ userId: user.id }),
      api.user.getEnhancedMatchHistory({ 
        userId: user.id,
        take: 5 
      })
    ]);

    const isOwnProfile = session?.user?.id === user.id;

    return (
      <GameProfileView 
        user={user}
        stats={stats}
        matchHistory={matchHistory}
        isOwnProfile={isOwnProfile}
        currentUserId={session?.user?.id}
      />
    );
  } catch {
    notFound();
  }
}

export async function generateMetadata({ params }: PageProps) {
  const { username } = await params;
  
  try {
    const user = await api.user.getProfile({ username });
    
    return {
      title: `${user.name ?? user.username}'s Game Profile`,
      description: `View ${user.name ?? user.username}'s checkers stats and achievements`,
    };
  } catch {
    return {
      title: "User Profile",
      description: "View user's game profile",
    };
  }
}