"use client";

import { AnimatePresence, m } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import type { Session } from "next-auth";
import { useToast } from "~/hooks/use-toast";
import type { TimeControl } from "~/lib/game/time-control-types";
import type { BoardVariant } from "~/lib/game/variants";
import { api } from "~/trpc/react";
import { BoardPreview } from "./BoardPreview";
import { FriendSelector } from "./FriendSelector";
import { GameWrapper } from "./game-wrapper";
import { GameConfirmation } from "./GameConfirmation";

interface OnlineGameWizardProps {
  preselectedFriendId?: string;
  preselectedUsername?: string;
  initialSession: Session | null;
}

export function OnlineGameWizard({
  preselectedFriendId,
  preselectedUsername,
  initialSession,
}: OnlineGameWizardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const session = initialSession;
  // If host already has an active invite, redirect directly to that game
  const { data: activeInvite } = api.gameInvite.getActiveInviteForHost.useQuery(undefined, {
    enabled: !!session?.user?.id,
    staleTime: 30_000,
  });

  useEffect(() => {
    // If there is an active pending invite, take the user to the waiting room (step 3)
    if (activeInvite && activeInvite.status === "PENDING") {
      const params = new URLSearchParams(searchParams.toString());
      params.set("step", "3");
      params.set("inviteId", activeInvite.id);
      router.replace(`/game/online?${params.toString()}`);
    }
  }, [activeInvite, router, searchParams]);

  const stepParam = searchParams.get("step");
  const friendIdParam = searchParams.get("friendId");
  const generateLinkParam = searchParams.get("generateLink") === "true";
  const inviteIdFromUrl = searchParams.get("inviteId");

  // Wizard state - controlled by URL search params
  const [isTransitioning, setIsTransitioning] = useState(false);
  const currentStep = stepParam
    ? parseInt(stepParam, 10)
    : preselectedUsername
      ? 2
      : 1;

  useEffect(() => {
    // When URL changes, disable transitioning to show new step content
    setIsTransitioning(false);
  }, [stepParam]);

  // Game configuration state
  const [selectedFriend, setSelectedFriend] = useState<{
    id: string;
    username: string | null;
    name: string | null;
    image: string | null;
  } | null>(null);
  const [generateLink, setGenerateLink] = useState(generateLinkParam);
  const [variant, setVariant] = useState<BoardVariant>("american");
  const [timeControl, setTimeControl] = useState<TimeControl | null>(null);
  const [hostColor, setHostColor] = useState<"red" | "black" | "random">("red");

  // Invitation state
  const [invitation, setInvitation] = useState<{
    inviteId: string;
    inviteToken: string;
    inviteUrl: string;
    expiresAt: Date | null;
    gameMode: string;
    variant: string | null;
  } | null>(null);
  // Invite status polling while on waiting step
  const { data: inviteStatus } = api.gameInvite.getInvitationStatus.useQuery(
    { invitationId: (invitation?.inviteId || inviteIdFromUrl)! },
    { enabled: currentStep === 3 && (!!invitation?.inviteId || !!inviteIdFromUrl), refetchInterval: 1500 },
  );

  useEffect(() => {
    if (currentStep === 3 && inviteStatus?.status === "ready" && inviteStatus?.gameId) {
      router.push(`/game/${inviteStatus.gameId}`);
    }
  }, [currentStep, inviteStatus, router]);

  const cancelInviteMutation = api.gameInvite.cancelInvitation.useMutation();

  // Ensure pending invite is cancelled if user navigates away from waiting step
  useEffect(() => {
    if (currentStep !== 3 || !(invitation?.inviteId || inviteIdFromUrl)) return;
    const id = invitation?.inviteId || inviteIdFromUrl!;
    const handler = () => {
      navigator.sendBeacon?.(
        "/api/trpc/gameInvite.cancelInvitation",
        new Blob([JSON.stringify({ 0: { json: { invitationId: id } } })], { type: "application/json" })
      );
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [currentStep, invitation?.inviteId, inviteIdFromUrl]);

  const effectiveFriendId = preselectedFriendId || friendIdParam;

  // Load preselected friend if provided via props or URL by user ID
  const { data: friendData } = api.user.getUserById.useQuery(
    { userId: effectiveFriendId! },
    { enabled: !!effectiveFriendId },
  );

  // Load preselected friend by username if provided
  const { data: userByUsername } = api.user.getProfile.useQuery(
    { username: preselectedUsername! },
    { enabled: !!preselectedUsername },
  );

  useEffect(() => {
    if (friendData) {
      setSelectedFriend({
        id: friendData.id,
        username: friendData.username,
        name: friendData.name,
        image: friendData.image,
      });
    }
  }, [friendData]);

  useEffect(() => {
    if (userByUsername) {
      setSelectedFriend({
        id: userByUsername.id,
        username: userByUsername.username,
        name: userByUsername.name,
        image: userByUsername.image,
      });
    }
  }, [userByUsername]);

  // API mutation for creating invitations
  const createInviteMutation = api.gameInvite.createInvitation.useMutation({
    onSuccess: (result: {
      inviteId: string;
      inviteToken: string;
      inviteUrl: string;
      expiresAt: Date | null;
    }) => {
      // Stay on wizard and go to waiting step with invite details
      setInvitation({
        inviteId: result.inviteId,
        inviteToken: result.inviteToken,
        inviteUrl: result.inviteUrl,
        expiresAt: result.expiresAt,
        gameMode: "online",
        variant: variant,
      });

      const params = new URLSearchParams(searchParams.toString());
      params.set("step", "3");
      params.set("inviteId", result.inviteId);
      setIsTransitioning(true);
      setTimeout(() => router.push(`/game/online?${params.toString()}`), 150);

      toast({
        title: "Game Created",
        description: selectedFriend
          ? `Challenge sent to ${selectedFriend.username || selectedFriend.name}!`
          : "Game created! Share the link to invite someone.",
      });
    },
    onError: (error: { message: string }) => {
      toast({
        title: "Failed to create invitation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleBack = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      if (currentStep === 1) {
        router.push("/game");
        return;
      }

      // If user landed on step 2 via a direct link, go back to main game menu
      if (currentStep === 2 && preselectedUsername) {
        router.push("/game");
        return;
      }

      // Step 3 removed in lobby-first flow

      const prevStep = currentStep - 1;
      const params = new URLSearchParams(searchParams.toString());
      params.set("step", prevStep.toString());

      if (prevStep === 1) {
        // Clean up URL and state when going back to friend selection
        params.delete("friendId");
        params.delete("username");
        params.delete("generateLink");
        // Clear the selected friend state
        setSelectedFriend(null);
        setGenerateLink(false);
      }
      router.push(`/game/online?${params.toString()}`);
    }, 150);
  };

  const handleNext = () => {
    if (currentStep === 1 && !selectedFriend && !generateLink) {
      toast({
        title: "Selection Required",
        description:
          "Please select a friend or choose to generate an invite link",
        variant: "destructive",
      });
      return;
    }

    setIsTransitioning(true);
    setTimeout(() => {
      const nextStep = currentStep + 1;
      const params = new URLSearchParams(searchParams.toString());
      params.set("step", nextStep.toString());

      if (currentStep === 1) {
        if (selectedFriend) {
          params.set("friendId", selectedFriend.id);
          if (selectedFriend.username) {
            params.set("username", selectedFriend.username);
          }
        } else if (generateLink) {
          params.set("generateLink", "true");
        }
      }
      router.push(`/game/online?${params.toString()}`);
    }, 150);
  };

  const handleSendChallenge = () => {
    const boardSize =
      variant === "international" ? 10 : variant === "canadian" ? 12 : 8;

    createInviteMutation.mutate({
      friendIds: selectedFriend ? [selectedFriend.id] : undefined,
      gameConfig: {
        variant: variant,
        boardSize: boardSize,
        timeLimit: timeControl ? timeControl.initialMinutes * 60 : undefined,
        hostColor: hostColor,
      },
    });
  };

  const handleGameReady = (gameId: string) => {
    router.push(`/game/${gameId}`);
  };

  return (
    <div className="relative">
      <div className="p-4">
        <AnimatePresence mode="wait">
          {!isTransitioning && (
            <m.div
              key={currentStep}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <GameWrapper>
                {/* Board Preview (left) */}
                <div className="h-full">
                  {(() => {
                    const getBoardSize = (v: BoardVariant) =>
                      v === "international" ? 10 : v === "canadian" ? 12 : 8;
                    const currentUserName = session?.user?.name ?? "You";
                    const players = selectedFriend
                      ? {
                        red: { id: "current-user", name: currentUserName, isBot: false },
                        black: {
                          id: selectedFriend.id,
                          name: selectedFriend.name || selectedFriend.username || "Friend",
                          isBot: false,
                        },
                      }
                      : generateLink
                        ? {
                          red: { id: "current-user", name: currentUserName, isBot: false },
                          black: { id: "guest", name: "Guest", isBot: false },
                        }
                        : undefined;
                    const size = currentStep === 1 ? 8 : getBoardSize(variant);
                    const gameMode = selectedFriend || generateLink ? "online" : "ai";
                    return (
                      <BoardPreview
                        size={size}
                        gameMode={gameMode}
                        players={players as any}
                        aiDifficulty="medium"
                        shouldFlip={false}
                      />
                    );
                  })()}
                </div>

                {/* Step Panel (right) */}
                <div className="max-h-full w-full space-y-4 self-start overflow-y-auto">
                  {currentStep === 1 && (
                    <FriendSelector
                      selectedFriend={selectedFriend}
                      onFriendSelect={setSelectedFriend}
                      generateLink={generateLink}
                      onGenerateLinkChange={setGenerateLink}
                      onNext={handleNext}
                      preselectedUserId={preselectedFriendId || userByUsername?.id}
                      preselectedUsername={preselectedUsername}
                    />
                  )}

                  {currentStep === 2 && (
                    <GameConfirmation
                      selectedFriend={selectedFriend}
                      generateLink={generateLink}
                      variant={variant}
                      onVariantChange={setVariant}
                      timeControl={timeControl}
                      onTimeControlChange={setTimeControl}
                      hostColor={hostColor}
                      onHostColorChange={setHostColor}
                      onBack={() => handleBack()}
                      onSendChallenge={handleSendChallenge}
                      isLoading={createInviteMutation.isPending}
                    />
                  )}

                  {currentStep === 3 && (
                    <div className="border-gray-200 bg-white p-6 rounded-md shadow-sm">
                      <div className="space-y-4">
                        <div>
                          <h2 className="text-xl font-semibold">Waiting for opponent…</h2>
                          <p className="text-gray-600">Share the link below. You’ll be redirected when they join.</p>
                        </div>
                        {invitation && (
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Invite Link</label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={invitation.inviteUrl}
                                readOnly
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm font-mono"
                                onClick={(e) => (e.currentTarget as HTMLInputElement).select()}
                              />
                              <button
                                type="button"
                                className="px-3 py-2 border rounded-md"
                                onClick={async () => {
                                  await navigator.clipboard.writeText(invitation.inviteUrl);
                                  toast({ title: "Copied!", description: "Invitation link copied" });
                                }}
                              >Copy</button>
                            </div>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <button
                            className="px-3 py-2 border rounded-md"
                            onClick={() => {
                              if (!invitation?.inviteId && !inviteIdFromUrl) return;
                              const id = invitation?.inviteId || inviteIdFromUrl!;
                              cancelInviteMutation.mutate({ invitationId: id }, {
                                onSettled: () => {
                                  const params = new URLSearchParams(searchParams.toString());
                                  params.set("step", "2");
                                  params.delete("inviteId");
                                  setInvitation(null);
                                  router.push(`/game/online?${params.toString()}`);
                                },
                              });
                            }}
                          >Cancel</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </GameWrapper>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}