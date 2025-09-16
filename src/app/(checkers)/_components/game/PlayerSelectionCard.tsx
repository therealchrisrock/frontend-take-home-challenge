"use client";

import {
  ChevronDown,
  Link,
  Search,
  User,
  UserCheck,
  Users,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { ScrollArea } from "~/components/ui/scroll-area";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

interface PlayerSelectionCardProps {
  selectedFriend: string | null;
  onFriendChange: (friendId: string | null) => void;
  showInviteButton?: boolean;
}

type SelectionMode = "friend" | "anyone";

export function PlayerSelectionCard({
  selectedFriend,
  onFriendChange,
  showInviteButton = false,
}: PlayerSelectionCardProps) {
  const { data: session } = useSession();
  const [selectionMode, setSelectionMode] = useState<SelectionMode>("friend");
  const [friendSearchOpen, setFriendSearchOpen] = useState(false);
  const [friendSearchQuery, setFriendSearchQuery] = useState("");

  // API queries
  const { data: friends } = api.user.getFriends.useQuery();

  const { data: searchResults } = api.user.searchUsers.useQuery(
    { query: friendSearchQuery },
    { enabled: friendSearchQuery.length > 2 && selectionMode === "friend" },
  );

  // Get selected friend data
  const selectedFriendData = friends?.find((friend) => friend.id === selectedFriend);

  // Filter friends based on search query
  const filteredFriends = friends?.filter((friend) =>
  (friend.name?.toLowerCase().includes(friendSearchQuery.toLowerCase()) ||
    friend.username?.toLowerCase().includes(friendSearchQuery.toLowerCase()))
  ) ?? [];

  const handleFriendSelect = (friendId: string) => {
    onFriendChange(friendId);
    setFriendSearchOpen(false);
    setFriendSearchQuery("");
  };

  const handleModeChange = (mode: SelectionMode) => {
    setSelectionMode(mode);
    if (mode === "anyone") {
      onFriendChange(null);
    }
  };

  const displayResults = friendSearchQuery.length > 2 ? searchResults : filteredFriends;

  return (
    <div className="space-y-4">
      {/* Selection Mode Toggle */}
      <div>
        <Label className="mb-3 block text-base text-gray-900">
          Who would you like to play with?
        </Label>
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant={selectionMode === "friend" ? "default" : "outline"}
            className={cn(
              "h-auto flex-col p-4",
              selectionMode === "friend"
                ? "bg-primary hover:bg-primary-700"
                : "hover:border-gray-300"
            )}
            onClick={() => handleModeChange("friend")}
          >
            <UserCheck className="mb-2 h-6 w-6" />
            <div className="text-center">
              <p className="font-medium">Specific Friend</p>
              <p className="text-xs opacity-75">
                Send invitation to a friend
              </p>
            </div>
          </Button>

          <Button
            variant={selectionMode === "anyone" ? "default" : "outline"}
            className={cn(
              "h-auto flex-col p-4",
              selectionMode === "anyone"
                ? "bg-primary hover:bg-primary-700"
                : "hover:border-gray-300"
            )}
            onClick={() => handleModeChange("anyone")}
          >
            <Link className="mb-2 h-6 w-6" />
            <div className="text-center">
              <p className="font-medium">Anyone</p>
              <p className="text-xs opacity-75">
                Create shareable link
              </p>
            </div>
          </Button>
        </div>
      </div>

      {/* Friend Selection */}
      {selectionMode === "friend" && (
        <div>
          <Label className="mb-3 block text-sm text-gray-700">
            Select a friend to invite
          </Label>

          {/* Friend Selector */}
          <Popover open={friendSearchOpen} onOpenChange={setFriendSearchOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={friendSearchOpen}
                className="w-full justify-between bg-white p-3 h-auto"
              >
                {selectedFriendData ? (
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={selectedFriendData.image ?? undefined} />
                      <AvatarFallback>
                        {selectedFriendData.name?.[0] ??
                          selectedFriendData.username?.[0] ?? "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                      <p className="font-medium">
                        {selectedFriendData.name ?? selectedFriendData.username}
                      </p>
                      <p className="text-sm text-gray-500">
                        @{selectedFriendData.username}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-gray-500">
                    <User className="h-4 w-4" />
                    <span>Choose a friend...</span>
                  </div>
                )}
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
              <div className="border-b p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search friends..."
                    value={friendSearchQuery}
                    onChange={(e) => setFriendSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <ScrollArea className="h-[300px]">
                {displayResults?.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    {friendSearchQuery.length > 2 ? (
                      <p>No friends found matching "{friendSearchQuery}"</p>
                    ) : friends?.length === 0 ? (
                      <div>
                        <Users className="mx-auto mb-2 h-8 w-8 opacity-50" />
                        <p>No friends yet</p>
                        <p className="text-sm">Add some friends first to invite them to play</p>
                      </div>
                    ) : (
                      <p>Start typing to search your friends</p>
                    )}
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {displayResults?.map((friend) => (
                      <Button
                        key={friend.id}
                        variant="ghost"
                        className="w-full justify-start p-3 h-auto hover:bg-gray-50"
                        onClick={() => handleFriendSelect(friend.id)}
                      >
                        <Avatar className="h-8 w-8 mr-3">
                          <AvatarImage src={friend.image ?? undefined} />
                          <AvatarFallback>
                            {friend.name?.[0] ?? friend.username?.[0] ?? "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="text-left flex-1">
                          <p className="font-medium">
                            {friend.name ?? friend.username}
                          </p>
                          <p className="text-sm text-gray-500">
                            @{friend.username}
                          </p>
                        </div>
                        {selectedFriend === friend.id && (
                          <UserCheck className="h-4 w-4 text-primary-600" />
                        )}
                      </Button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* Current Selection Summary */}
      <Card className="bg-gray-50 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            {selectionMode === "friend" && selectedFriendData ? (
              <Avatar className="h-8 w-8">
                <AvatarImage src={selectedFriendData.image ?? undefined} />
                <AvatarFallback>
                  {selectedFriendData.name?.[0] ??
                    selectedFriendData.username?.[0] ?? "U"}
                </AvatarFallback>
              </Avatar>
            ) : (
              <Link className="h-5 w-5 text-primary-700" />
            )}
          </div>
          <div className="flex-1">
            <p className="font-medium text-gray-900">
              {selectionMode === "friend" && selectedFriendData
                ? `Playing with ${selectedFriendData.name ?? selectedFriendData.username}`
                : selectionMode === "friend"
                  ? "Select a friend to invite"
                  : "Creating shareable invitation link"
              }
            </p>
            <p className="text-sm text-gray-600">
              {selectionMode === "friend" && selectedFriendData
                ? "Your friend will receive a direct invitation"
                : selectionMode === "friend"
                  ? "Choose from your friends list"
                  : "Anyone with the link can join your game"
              }
            </p>
          </div>
          {selectionMode === "friend" && selectedFriendData && (
            <Badge variant="secondary">Friend</Badge>
          )}
          {selectionMode === "anyone" && (
            <Badge variant="outline">Shareable</Badge>
          )}
        </div>
      </Card>
    </div>
  );
}