"use client";

import { m } from "framer-motion";
import {
  CheckCircle2,
  ChevronRight,
  Circle,
  Link2,
  Search,
  UserPlus,
  Users
} from "lucide-react";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
// Board preview and layout are managed by OnlineGameWizard

interface Friend {
  id: string;
  username: string | null;
  name: string | null;
  image: string | null;
  isOnline?: boolean;
  lastSeen?: Date | null;
}

interface FriendSelectorProps {
  selectedFriend: Friend | null;
  onFriendSelect: (friend: Friend | null) => void;
  generateLink: boolean;
  onGenerateLinkChange: (generate: boolean) => void;
  onNext: () => void;
  preselectedUserId?: string;
  preselectedUsername?: string;
}

export function FriendSelector({
  selectedFriend,
  onFriendSelect,
  generateLink,
  onGenerateLinkChange,
  onNext,
  preselectedUserId,
  // preselectedUsername is accepted by props for compatibility, but not used here
}: FriendSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectionMode, setSelectionMode] = useState<"friend" | "link">(
    generateLink ? "link" : selectedFriend ? "friend" : "friend"
  );

  // Fetch friends list
  const { data: friends, isLoading: loadingFriends } = api.user.getFriends.useQuery();

  // Filter friends based on search
  const filteredFriends = friends?.filter((friend: Friend) => {
    const searchTerm = searchQuery.toLowerCase();
    const username = friend.username?.toLowerCase() || "";
    const name = friend.name?.toLowerCase() || "";
    return username.includes(searchTerm) || name.includes(searchTerm);
  }) || [];

  // Handle selection mode changes
  const handleSelectionModeChange = (mode: string) => {
    setSelectionMode(mode as "friend" | "link");
    if (mode === "link") {
      onGenerateLinkChange(true);
      onFriendSelect(null);
    } else {
      onGenerateLinkChange(false);
    }
  };

  // Handle friend selection
  const handleFriendClick = (friend: Friend) => {
    if (selectionMode === "friend") {
      onFriendSelect(friend.id === selectedFriend?.id ? null : friend);
    }
  };

  const getDisplayName = (friend: Friend) => {
    return friend.name || friend.username || "Anonymous";
  };

  const getInitials = (friend: Friend) => {
    const name = getDisplayName(friend);
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Auto-select preselected friend
  useEffect(() => {
    if (preselectedUserId && friends) {
      const friend = friends.find(f => f.id === preselectedUserId);
      if (friend) {
        onFriendSelect(friend);
        setSelectionMode("friend");
        onGenerateLinkChange(false);
      }
    }
  }, [preselectedUserId, friends, onFriendSelect, onGenerateLinkChange]);

  return (
    <Card className="border-gray-200 bg-white p-6">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Choose Your Opponent
          </h2>
          <p className="text-gray-600">
            Select a friend to challenge or generate a link to share
          </p>
        </div>

        {/* Selection Mode */}
        <RadioGroup value={selectionMode} onValueChange={handleSelectionModeChange}>
          <div className="space-y-3">
            <m.div
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <Label
                htmlFor="friend-mode"
                className={cn(
                  "flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all w-full",
                  selectionMode === "friend"
                    ? "border-primary/10 bg-primary/10"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="friend" id="friend-mode" className="sr-only" />
                  <Users className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Invite a Friend</p>
                    <p className="text-sm text-gray-600">Challenge someone from your friends list</p>
                  </div>
                </div>
                {selectionMode === "friend" && (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                )}
              </Label>
            </m.div>

            <m.div
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <Label
                htmlFor="link-mode"
                className={cn(
                  "flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all w-full",
                  selectionMode === "link"
                    ? "border-primary/10 bg-primary/10"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="link" id="link-mode" className="sr-only" />
                  <Link2 className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Generate Invite Link</p>
                    <p className="text-sm text-gray-600">Create a link to share with anyone</p>
                  </div>
                </div>
                {selectionMode === "link" && (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                )}
              </Label>
            </m.div>
          </div>
        </RadioGroup>

        {/* Friend Selection */}
        {selectionMode === "friend" && (
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search friends..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Friends List */}
            {loadingFriends ? (
              <ScrollArea className="h-64 rounded-lg border">
                <div className="p-2 space-y-1">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 rounded-lg border-2 border-transparent"
                    >
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 min-w-0 space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-5 w-12 rounded-full" />
                        <Skeleton className="h-5 w-5 rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : filteredFriends.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-600 font-medium">No friends found</p>
                <p className="text-sm text-gray-500 mt-1">
                  {searchQuery ? "Try a different search" : "Add friends to challenge them"}
                </p>
                <Button variant="outline" size="sm" className="mt-4">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Find Friends
                </Button>
              </div>
            ) : (
              <ScrollArea className="h-64 rounded-lg border">
                <div className="p-2 space-y-1">
                  {filteredFriends.map((friend: Friend) => {
                    const isSelected = selectedFriend?.id === friend.id;

                    return (
                      <m.div
                        key={friend.id}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => handleFriendClick(friend)}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all",
                          isSelected
                            ? "primary/10 border-2 border-primary/10"
                            : "hover:bg-gray-50 border-2 border-transparent"
                        )}
                      >
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={friend.image || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {getInitials(friend)}
                            </AvatarFallback>
                          </Avatar>
                          {friend.isOnline && (
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {getDisplayName(friend)}
                          </p>
                          {friend.username && (
                            <p className="text-sm text-gray-500 truncate">
                              @{friend.username}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {friend.isOnline && (
                            <Badge variant="outline" className="text-xs text-green-600">
                              Online
                            </Badge>
                          )}
                          {isSelected ? (
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                          ) : (
                            <Circle className="h-5 w-5 text-gray-300" />
                          )}
                        </div>
                      </m.div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}

          </div>
        )}

        {/* Continue Button */}
        <div className="flex justify-end pt-4 border-t">
          <Button
            onClick={onNext}
            disabled={selectionMode === "friend" && !selectedFriend}
            className="bg-primary text-white"
          >
            Continue to Game Settings
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </Card>
  );
}