"use client";


type Variant = "american" | "brazilian" | "international" | "canadian";

interface GameInviteScreenProps {
  preselectedFriendId?: string;
  preselectedUsername?: string;
}

export function GameInviteScreen({
  preselectedFriendId,
  preselectedUsername
}: GameInviteScreenProps) {
  // Legacy component deprecated by lobby-first flow
  return null;
}