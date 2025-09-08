'use client';

import { Suspense } from 'react';
import { PlayerCard } from './PlayerCard';
import { PlayerCardSkeleton } from './PlayerCardSkeleton';
import { type PieceColor } from '~/lib/game-logic';
import { type PlayerInfo } from '~/lib/player-types';
import { api } from '~/trpc/react';

interface PlayerCardWrapperProps {
  player: PlayerInfo;
  color: PieceColor;
  position: 'top' | 'bottom';
  isActive?: boolean;
  className?: string;
  /** Enable server-side data fetching for authenticated users */
  enableServerData?: boolean;
  /** Show loading skeleton while data is being fetched */
  showLoadingSkeleton?: boolean;
}

interface PlayerCardWithDataProps {
  player: PlayerInfo;
  color: PieceColor;
  position: 'top' | 'bottom';
  isActive?: boolean;
  className?: string;
  enableServerData?: boolean;
}

function PlayerCardWithData({
  player,
  color,
  position,
  isActive = false,
  className = '',
  enableServerData = false,
}: PlayerCardWithDataProps) {
  // Fetch user profile data if the player has an ID and server data is enabled
  const { data: profileData, isLoading: profileLoading } = api.user.getPlayerProfile.useQuery(
    { userId: player.id! },
    {
      enabled: enableServerData && !!player.id && !player.isAI,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime)
    }
  );

  // Fetch player stats if authenticated and server data is enabled
  const { data: statsData, isLoading: statsLoading } = api.user.getPlayerStats.useQuery(
    { userId: player.id },
    {
      enabled: enableServerData && !!player.id && !player.isAI,
      staleTime: 2 * 60 * 1000, // 2 minutes
      gcTime: 5 * 60 * 1000, // 5 minutes (renamed from cacheTime)
    }
  );

  // Show skeleton while loading if any data is being fetched
  const isLoading = enableServerData && (profileLoading || statsLoading);

  if (isLoading) {
    return (
      <PlayerCardSkeleton
        color={color}
        position={position}
        className={className}
      />
    );
  }

  // Merge server data with client data
  const enhancedPlayer: PlayerInfo = {
    ...player,
    ...(profileData && {
      name: profileData.name || player.name,
      avatar: profileData.image || player.avatar,
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

  return (
    <PlayerCard
      player={enhancedPlayer}
      color={color}
      position={position}
      isActive={isActive}
      className={className}
    />
  );
}

export function PlayerCardWrapper({
  player,
  color,
  position,
  isActive = false,
  className = '',
  enableServerData = false,
  showLoadingSkeleton = true,
}: PlayerCardWrapperProps) {
  // If loading skeleton is disabled, render directly
  if (!showLoadingSkeleton) {
    return (
      <PlayerCardWithData
        player={player}
        color={color}
        position={position}
        isActive={isActive}
        className={className}
        enableServerData={enableServerData}
      />
    );
  }

  return (
    <Suspense
      fallback={
        <PlayerCardSkeleton
          color={color}
          position={position}
          className={className}
        />
      }
    >
      <PlayerCardWithData
        player={player}
        color={color}
        position={position}
        isActive={isActive}
        className={className}
        enableServerData={enableServerData}
      />
    </Suspense>
  );
}