"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { ChevronLeft, Users, Share2, Clock } from "lucide-react";
import { api } from "~/trpc/react";
import { type TimeControl } from "~/lib/game/time-control-types";
import { BoardPreview } from "~/app/(checkers)/_components/game/BoardPreview";
import { GameWrapper } from "~/app/(checkers)/_components/game/game-wrapper";
import { InvitationPanel } from "./InvitationPanel";
import { FriendInviteList } from "./FriendInviteList";
import { InviteStatusIndicator } from "./InviteStatusIndicator";
import { ShareableInviteDialog } from "~/components/game/ShareableInviteDialog";
import { ComingSoon } from "~/components/ui/coming-soon";
import { toast } from "~/hooks/use-toast";

type Variant = "american" | "brazilian" | "international" | "canadian";
type InvitationStep = "configure-game" | "invitation-ready";

interface GameInviteScreenProps {
  preselectedFriendId?: string;
  preselectedUsername?: string;
}

export function GameInviteScreen({ 
  preselectedFriendId, 
  preselectedUsername 
}: GameInviteScreenProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  
  // State management
  const [currentStep, setCurrentStep] = useState<InvitationStep>("configure-game");
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>(preselectedFriendId ? [preselectedFriendId] : []);
  const [variant, setVariant] = useState<Variant>("american");
  const [timeControl, setTimeControl] = useState<TimeControl | null>(null);
  const [timeControlType, setTimeControlType] = useState<"none" | "blitz" | "rapid" | "classical" | "custom">("none");
  const [invitation, setInvitation] = useState<{
    inviteId: string;
    inviteToken: string;
    inviteUrl: string;
    expiresAt: Date | null;
    gameMode: string;
    variant: string | null;
  } | null>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);

  // API to search users by username for pre-selection
  const { data: usernameSearchResult } = api.user.searchUsers.useQuery(
    { query: preselectedUsername ?? "" },
    { 
      enabled: !!preselectedUsername && preselectedUsername.length > 0,
    }
  );

  // Extract query parameters for pre-selection
  useEffect(() => {
    const friendId = searchParams.get("friendId");
    const username = searchParams.get("username");
    
    if (friendId) {
      setSelectedFriendIds([friendId]);
    } else if (username || preselectedUsername) {
      // Look up friend by username
      const targetUsername = username || preselectedUsername;
      if (usernameSearchResult && usernameSearchResult.length > 0) {
        const foundUser = usernameSearchResult.find(
          user => user.username?.toLowerCase() === targetUsername?.toLowerCase()
        );
        if (foundUser) {
          setSelectedFriendIds([foundUser.id]);
        }
      }
    }
  }, [searchParams, preselectedUsername, usernameSearchResult]);

  // Determine board size based on variant
  const getBoardSize = (gameVariant: Variant) => {
    switch (gameVariant) {
      case "international": return 10;
      case "canadian": return 12;
      default: return 8;
    }
  };

  // API mutation for creating invitations
  const createInviteMutation = api.gameInvite.createInvitation.useMutation({
    onSuccess: (result) => {
      setInvitation({
        inviteId: result.inviteId,
        inviteToken: result.inviteToken,
        inviteUrl: result.inviteUrl,
        expiresAt: result.expiresAt,
        gameMode: "online",
        variant: variant,
      });
      setCurrentStep("invitation-ready");
      toast({
        title: "Invitation Created",
        description: selectedFriendIds.length > 0 
          ? `${selectedFriendIds.length} friend invitation${selectedFriendIds.length !== 1 ? 's' : ''} sent!`
          : "Shareable link generated!",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to create invitation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleBack = () => {
    if (currentStep === "configure-game") {
      router.push("/game");
    } else {
      setCurrentStep("configure-game");
    }
  };

  const handleFriendSelectionChange = (friendIds: string[]) => {
    setSelectedFriendIds(friendIds);
  };

  const handleCreateInvitation = () => {
    createInviteMutation.mutate({
      gameConfig: {
        variant: variant,
        boardSize: getBoardSize(variant),
        timeLimit: timeControl ? timeControl.initialMinutes * 60 : undefined,
      },
      friendIds: selectedFriendIds.length > 0 ? selectedFriendIds : undefined,
    });
  };

  const handleInviteFriends = async (friendIds: string[]) => {
    // This will be handled by the createInvitation call with friendIds
    // For now, we just update the selected friends
    setSelectedFriendIds(friendIds);
  };

  const handleGameReady = (gameId: string) => {
    router.push(`/game/${gameId}`);
  };

  const getTimeControlPreset = (type: string): TimeControl | null => {
    switch (type) {
      case "blitz":
        return {
          format: "X+Y",
          initialMinutes: 5,
          incrementSeconds: 3,
          preset: "blitz",
        };
      case "rapid":
        return {
          format: "X+Y",
          initialMinutes: 15,
          incrementSeconds: 10,
          preset: "rapid",
        };
      case "classical":
        return {
          format: "X+Y",
          initialMinutes: 30,
          incrementSeconds: 30,
          preset: "classical",
        };
      default:
        return null;
    }
  };

  const handleTimeControlTypeChange = (type: string) => {
    setTimeControlType(type as typeof timeControlType);
    if (type === "none") {
      setTimeControl(null);
    } else if (type !== "custom") {
      setTimeControl(getTimeControlPreset(type));
    } else {
      setTimeControl({
        format: "X+Y",
        initialMinutes: 10,
        incrementSeconds: 5,
        preset: "custom",
      });
    }
  };

  if (!session?.user) {
    return (
      <div className="flex justify-center p-4">
        <Card className="p-6 text-center">
          <p className="text-gray-600">Please sign in to invite friends to play.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex justify-center overflow-hidden p-4">
      <GameWrapper>
        {/* Board Preview */}
        <div className="h-full">
          <BoardPreview 
            size={getBoardSize(variant)}
            gameMode="ai" 
            aiDifficulty="medium"
            shouldFlip={false}
          />
        </div>

        {/* Invitation Flow */}
        <div className="max-h-full w-full space-y-4 self-start overflow-y-auto lg:mt-8">
          <Button
            variant="ghost"
            className="text-gray-600 hover:text-gray-900"
            onClick={handleBack}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          {/* Game Configuration */}
          {currentStep === "configure-game" && (
            <Card className="border-gray-200 bg-white p-4">
              <div className="mb-4">
                <h2 className="mb-1 text-xl font-bold text-gray-900">
                  Create Game Invitation
                </h2>
                <p className="text-gray-600">
                  Configure your game settings and invite friends
                </p>
              </div>

              <div className="space-y-5">
                {/* Game Variant */}
                <div>
                  <Label className="mb-3 block text-base text-gray-900">
                    Game Rules
                  </Label>
                  <RadioGroup
                    value={variant}
                    onValueChange={(v) => setVariant(v as Variant)}
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-start gap-2">
                        <RadioGroupItem value="american" id="american" className="sr-only" />
                        <Label
                          htmlFor="american"
                          className={`flex w-full cursor-pointer items-center justify-center rounded-md border p-3 transition-colors ${
                            variant === "american"
                              ? "border-amber-400 bg-amber-50"
                              : "border-gray-200 bg-gray-50 hover:border-gray-300"
                          }`}
                        >
                          <div className="text-sm font-medium text-gray-900">
                            American (8×8)
                          </div>
                        </Label>
                      </div>

                      <div className="flex items-start gap-2">
                        <RadioGroupItem value="international" id="international" className="sr-only" />
                        <Label
                          htmlFor="international"
                          className={`flex w-full cursor-pointer items-center justify-center rounded-md border p-3 transition-colors ${
                            variant === "international"
                              ? "border-amber-400 bg-amber-50"
                              : "border-gray-200 bg-gray-50 hover:border-gray-300"
                          }`}
                        >
                          <div className="text-sm font-medium text-gray-900">
                            International (10×10)
                          </div>
                        </Label>
                      </div>

                      <div className="flex items-start gap-2">
                        <RadioGroupItem value="brazilian" id="brazilian" className="sr-only" />
                        <Label
                          htmlFor="brazilian"
                          className={`flex w-full cursor-pointer items-center justify-center rounded-md border p-3 transition-colors ${
                            variant === "brazilian"
                              ? "border-amber-400 bg-amber-50"
                              : "border-gray-200 bg-gray-50 hover:border-gray-300"
                          }`}
                        >
                          <div className="text-sm font-medium text-gray-900">
                            Brazilian (8×8)
                          </div>
                        </Label>
                      </div>

                      <div className="flex items-start gap-2">
                        <RadioGroupItem value="canadian" id="canadian" className="sr-only" />
                        <Label
                          htmlFor="canadian"
                          className={`flex w-full cursor-pointer items-center justify-center rounded-md border p-3 transition-colors ${
                            variant === "canadian"
                              ? "border-amber-400 bg-amber-50"
                              : "border-gray-200 bg-gray-50 hover:border-gray-300"
                          }`}
                        >
                          <div className="text-sm font-medium text-gray-900">
                            Canadian (12×12)
                          </div>
                        </Label>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                {/* Time Control Settings */}
                <div>
                  <Label className="mb-3 block flex items-center gap-2 text-base text-gray-900">
                    <Clock className="h-4 w-4" />
                    Time Control
                  </Label>
                  <ComingSoon
                    message="Coming Soon"
                    variant="default"
                    icon="clock"
                    className="overflow-hidden rounded-md"
                  >
                    <div className="space-y-3 rounded-md bg-gray-50 p-4">
                      <div>
                        <Label className="mb-2 block text-sm text-gray-700">
                          Time Control Type
                        </Label>
                        <Select
                          value={timeControlType}
                          onValueChange={handleTimeControlTypeChange}
                        >
                          <SelectTrigger className="h-8 w-full border-gray-200 bg-white px-2 text-gray-900">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Time Control</SelectItem>
                            <SelectItem value="blitz">⚡ Blitz (5|3)</SelectItem>
                            <SelectItem value="rapid">🚀 Rapid (15|10)</SelectItem>
                            <SelectItem value="classical">🏛️ Classical (30|30)</SelectItem>
                            <SelectItem value="custom">⚙️ Custom</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </ComingSoon>
                </div>

                {/* Friend Selection */}
                <div>
                  <Label className="mb-3 block text-base text-gray-900">
                    Invite Friends (Optional)
                  </Label>
                  <FriendInviteList
                    selectedFriends={selectedFriendIds}
                    onSelectionChange={handleFriendSelectionChange}
                    className="mb-4"
                  />
                </div>

                <div className="flex pt-2">
                  <Button
                    className="w-full bg-amber-600 text-white hover:bg-amber-700"
                    onClick={handleCreateInvitation}
                    disabled={createInviteMutation.isPending}
                  >
                    {createInviteMutation.isPending ? (
                      <>Creating Invitation...</>
                    ) : (
                      <>
                        <Users className="mr-2 h-4 w-4" />
                        Create Game Invitation
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Invitation Ready - Show both URL and Status */}
          {currentStep === "invitation-ready" && invitation && (
            <div className="space-y-4">
              <InvitationPanel
                invitation={invitation}
                onInviteFriends={handleInviteFriends}
                onGameReady={handleGameReady}
              />
              
              <InviteStatusIndicator
                inviteId={invitation.inviteId}
                onGameReady={handleGameReady}
                onCancel={() => {
                  setInvitation(null);
                  setCurrentStep("configure-game");
                }}
              />
            </div>
          )}
        </div>
      </GameWrapper>

      {/* Share Dialog */}
      {invitation && (
        <ShareableInviteDialog
          open={showShareDialog}
          onOpenChange={setShowShareDialog}
          inviteId={invitation.inviteId}
        />
      )}
    </div>
  );
}