"use client";

import React, { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Checkbox } from "~/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Badge } from "~/components/ui/badge";
import { 
  Search, 
  Users, 
  UserCheck, 
  Send,
  Loader2,
  CheckCircle,
  Clock,
  X
} from "lucide-react";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";

interface Friend {
  id: string;
  username: string | null;
  name: string | null;
  image: string | null;
  isOnline?: boolean;
  lastSeen?: Date;
}

interface PendingInvitation {
  friendId: string;
  status: 'sending' | 'sent' | 'error';
  sentAt?: Date;
}

interface FriendInviteListProps {
  selectedFriends: string[];
  onSelectionChange: (friendIds: string[]) => void;
  onInviteFriends?: (friendIds: string[]) => Promise<void>;
  gameInviteId?: string;
  className?: string;
}

export function FriendInviteList({ 
  selectedFriends, 
  onSelectionChange, 
  onInviteFriends,
  gameInviteId,
  className 
}: FriendInviteListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [isInviting, setIsInviting] = useState(false);

  // Search for users to invite (for now, show all available users)
  // In a real app, this would fetch the user's friends list
  const { data: friends, isLoading: loadingFriends } = api.user.searchUsers.useQuery(
    { query: "" },
    { 
      refetchOnWindowFocus: false,
      enabled: true
    }
  );

  // Filter friends based on search query
  const filteredFriends = friends?.filter((friend: Friend) => {
    const searchTerm = searchQuery.toLowerCase();
    const username = friend.username?.toLowerCase() || "";
    const name = friend.name?.toLowerCase() || "";
    return username.includes(searchTerm) || name.includes(searchTerm);
  }) || [];

  const handleFriendToggle = (friendId: string) => {
    const newSelection = selectedFriends.includes(friendId)
      ? selectedFriends.filter(id => id !== friendId)
      : [...selectedFriends, friendId];
    
    onSelectionChange(newSelection);
  };

  const handleSelectAll = () => {
    if (selectedFriends.length === filteredFriends.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(filteredFriends.map((f: Friend) => f.id));
    }
  };

  const handleSendInvitations = async () => {
    if (selectedFriends.length === 0) return;

    setIsInviting(true);
    
    // Set all as sending
    const newPending = selectedFriends.map(id => ({
      friendId: id,
      status: 'sending' as const
    }));
    setPendingInvitations(prev => [...prev, ...newPending]);

    try {
      await onInviteFriends?.(selectedFriends);
      
      // Mark as sent
      setPendingInvitations(prev => 
        prev.map(inv => 
          selectedFriends.includes(inv.friendId)
            ? { ...inv, status: 'sent' as const, sentAt: new Date() }
            : inv
        )
      );
      
      // Clear selection
      onSelectionChange([]);
      
    } catch (error) {
      // Mark as error
      setPendingInvitations(prev => 
        prev.map(inv => 
          selectedFriends.includes(inv.friendId)
            ? { ...inv, status: 'error' as const }
            : inv
        )
      );
    } finally {
      setIsInviting(false);
    }
  };

  const getPendingStatus = (friendId: string) => {
    return pendingInvitations.find(inv => inv.friendId === friendId);
  };

  const getDisplayName = (friend: Friend) => {
    return friend.username || friend.name || "Anonymous";
  };

  const getStatusBadge = (friend: Friend) => {
    const pending = getPendingStatus(friend.id);
    
    if (pending) {
      switch (pending.status) {
        case 'sending':
          return <Badge variant="outline" className="text-xs"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Sending</Badge>;
        case 'sent':
          return <Badge className="text-xs bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Sent</Badge>;
        case 'error':
          return <Badge variant="destructive" className="text-xs"><X className="h-3 w-3 mr-1" />Failed</Badge>;
      }
    }

    if (friend.isOnline) {
      return <Badge variant="outline" className="text-xs text-green-600">Online</Badge>;
    }

    return null;
  };

  if (loadingFriends) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2 text-sm text-muted-foreground">Loading friends...</span>
        </div>
      </div>
    );
  }

  if (!friends?.length) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="text-center py-8 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-sm">No friends found</p>
          <p className="text-xs mt-1">Add friends to send them game invitations</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search and Controls */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search friends..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {filteredFriends.length > 0 && (
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSelectAll}
              className="text-xs"
            >
              {selectedFriends.length === filteredFriends.length ? (
                <>
                  <X className="h-3 w-3 mr-1" />
                  Deselect All
                </>
              ) : (
                <>
                  <UserCheck className="h-3 w-3 mr-1" />
                  Select All ({filteredFriends.length})
                </>
              )}
            </Button>

            {selectedFriends.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {selectedFriends.length} selected
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Friends List */}
      <ScrollArea className="h-60 border rounded-lg">
        <div className="p-2 space-y-1">
          {filteredFriends.map((friend: Friend) => {
            const isSelected = selectedFriends.includes(friend.id);
            const pending = getPendingStatus(friend.id);
            const isDisabled = pending && pending.status !== 'error';

            return (
              <div
                key={friend.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer hover:bg-accent/50",
                  isSelected && "bg-accent border-primary",
                  isDisabled && "opacity-50 cursor-not-allowed"
                )}
                onClick={() => !isDisabled && handleFriendToggle(friend.id)}
              >
                <Checkbox
                  checked={isSelected}
                  disabled={isDisabled}
                  className="pointer-events-none"
                />

                <Avatar className="h-8 w-8">
                  <AvatarImage src={friend.image || undefined} />
                  <AvatarFallback className="text-xs">
                    {getDisplayName(friend)[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">
                      {getDisplayName(friend)}
                    </p>
                    {getStatusBadge(friend)}
                  </div>
                  {friend.username && friend.name && (
                    <p className="text-xs text-muted-foreground truncate">
                      @{friend.username}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Send Invitations Button */}
      {selectedFriends.length > 0 && (
        <Button
          onClick={handleSendInvitations}
          disabled={isInviting}
          className="w-full"
        >
          {isInviting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sending invitations...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Send {selectedFriends.length} invitation{selectedFriends.length !== 1 ? 's' : ''}
            </>
          )}
        </Button>
      )}

      {/* Invitation Summary */}
      {pendingInvitations.length > 0 && (
        <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
          <div className="flex items-center gap-1 mb-1">
            <Clock className="h-3 w-3" />
            Invitation Status
          </div>
          <div className="space-y-1">
            {pendingInvitations
              .filter(inv => inv.status === 'sent')
              .slice(0, 3)
              .map(inv => {
                const friend = friends?.find((f: Friend) => f.id === inv.friendId);
                return (
                  <div key={inv.friendId} className="text-green-600">
                    ✓ Sent to {friend ? getDisplayName(friend) : 'Unknown'}
                  </div>
                );
              })}
            {pendingInvitations.filter(inv => inv.status === 'sent').length > 3 && (
              <div className="text-muted-foreground">
                +{pendingInvitations.filter(inv => inv.status === 'sent').length - 3} more
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}