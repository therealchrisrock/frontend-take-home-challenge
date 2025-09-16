import { useSession } from "next-auth/react";
import { type PlayerInfo } from "~/lib/game/player-types";
import { api } from "~/trpc/react";

interface UsePlayerCardParams {
  player: PlayerInfo;
  enableServerData?: boolean;
}

interface UsePlayerCardResult {
  player: PlayerInfo;
  isLoading: boolean;
}

export function usePlayerCard({
  player,
  enableServerData = false,
}: UsePlayerCardParams): UsePlayerCardResult {
  const { data: session } = useSession();

  const isCurrentUser = !player.id || session?.user?.id === player.id;
  const isPlaceholderId =
    !!player.id &&
    (player.id.startsWith("player-") ||
      player.id.startsWith("guest-") ||
      player.id.startsWith("ai-") ||
      player.id.startsWith("fallback-"));
  const isGuest = isCurrentUser && !session;

  const shouldFetch =
    enableServerData &&
    !!player.id &&
    !player.isAI &&
    !isGuest &&
    !isPlaceholderId;

  const profileInput = shouldFetch
    ? { userId: player.id! }
    : (undefined as any);
  const { data: profileData, isLoading: profileLoading } =
    api.user.getPlayerProfile.useQuery(profileInput, {
      enabled: shouldFetch,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    });

  const statsInput = shouldFetch ? { userId: player.id } : (undefined as any);
  const { data: statsData, isLoading: statsLoading } =
    api.user.getPlayerStats.useQuery(statsInput, {
      enabled: shouldFetch,
      staleTime: 2 * 60 * 1000,
      gcTime: 5 * 60 * 1000,
    });

  const isLoading = shouldFetch && (profileLoading || statsLoading);

  const enhancedPlayer: PlayerInfo = {
    ...player,
    isGuest,
    isCurrentUser,
    ...(isCurrentUser &&
      session && {
        id: session.user.id,
        name:
          session.user.name ??
          (session.user as { username?: string }).username ??
          player.name,
        username:
          (session.user as { username?: string }).username ??
          (session.user as { name?: string | null }).name ??
          player.username,
        avatar: session.user.image ?? player.avatar ?? undefined,
      }),
    ...(profileData &&
      !isCurrentUser && {
        name: profileData.name ?? player.name,
        username: profileData.username ?? player.username,
        avatar: profileData.image ?? player.avatar ?? undefined,
      }),
    ...(statsData && {
      stats: {
        wins: statsData.wins,
        losses: statsData.losses,
        draws: statsData.draws,
        rating: statsData.rating,
      },
    }),
  };

  return { player: enhancedPlayer, isLoading };
}
