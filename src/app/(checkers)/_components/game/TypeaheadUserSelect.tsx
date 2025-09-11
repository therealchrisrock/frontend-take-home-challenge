"use client";

import React, { useState, useEffect, useRef } from "react";
import { Input } from "~/components/ui/input";
import { Card } from "~/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { 
  Search, 
  X,
  UserCheck,
  Loader2
} from "lucide-react";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { useSession } from "next-auth/react";
import { useDebounce } from "~/hooks/use-debounce";

interface User {
  id: string;
  username: string | null;
  name: string | null;
  image: string | null;
}

interface TypeaheadUserSelectProps {
  selectedUser: User | null;
  onUserSelect: (user: User | null) => void;
  preselectedUserId?: string;
  preselectedUsername?: string;
  className?: string;
}

export function TypeaheadUserSelect({ 
  selectedUser, 
  onUserSelect,
  preselectedUserId,
  preselectedUsername,
  className 
}: TypeaheadUserSelectProps) {
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const debouncedQuery = useDebounce(searchQuery, 300);

  // Search for users
  const { data: searchResults, isLoading } = api.user.searchUsers.useQuery(
    { query: debouncedQuery },
    { 
      enabled: debouncedQuery.length > 0 && !selectedUser,
    }
  );

  // Handle preselection from username
  const { data: preselectedUserData } = api.user.searchUsers.useQuery(
    { query: preselectedUsername ?? "" },
    { 
      enabled: !!preselectedUsername && !selectedUser && !preselectedUserId,
    }
  );

  // Handle preselection
  useEffect(() => {
    if (preselectedUserId && !selectedUser) {
      // If we have a user ID, we need to fetch that user's data
      // For now, we'll search by empty string and filter
      // In production, you'd have a getUserById endpoint
    } else if (preselectedUserData && preselectedUserData.length > 0 && !selectedUser) {
      const foundUser = preselectedUserData.find(
        user => user.username?.toLowerCase() === preselectedUsername?.toLowerCase()
      );
      if (foundUser) {
        onUserSelect(foundUser);
      }
    }
  }, [preselectedUserId, preselectedUserData, preselectedUsername, selectedUser, onUserSelect]);

  // Filter out current user from results
  const filteredResults = searchResults?.filter(
    user => user.id !== session?.user?.id
  ) || [];

  // Handle clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleUserClick = (user: User) => {
    onUserSelect(user);
    setSearchQuery("");
    setIsOpen(false);
  };

  const handleRemoveUser = () => {
    onUserSelect(null);
    setSearchQuery("");
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const getDisplayName = (user: User) => {
    return user.username || user.name || "Anonymous";
  };

  // If user is already selected, show the card
  if (selectedUser) {
    return (
      <Card className={cn("p-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={selectedUser.image || undefined} />
              <AvatarFallback className="text-sm">
                {getDisplayName(selectedUser)[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">
                {getDisplayName(selectedUser)}
              </p>
              {selectedUser.username && selectedUser.name && (
                <p className="text-xs text-muted-foreground">
                  @{selectedUser.username}
                </p>
              )}
            </div>
            <Badge variant="secondary" className="text-xs">
              <UserCheck className="h-3 w-3 mr-1" />
              Selected
            </Badge>
          </div>
          <button
            onClick={handleRemoveUser}
            className="rounded-full p-1 hover:bg-gray-100 transition-colors"
            aria-label="Remove user"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>
      </Card>
    );
  }

  // Show search input
  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search for a friend by username or name..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(e.target.value.length > 0);
          }}
          onFocus={() => {
            setIsFocused(true);
            if (searchQuery.length > 0) {
              setIsOpen(true);
            }
          }}
          onBlur={() => setIsFocused(false)}
          className="pl-9 pr-3"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-auto rounded-md border bg-white shadow-lg"
        >
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
              Searching...
            </div>
          ) : filteredResults.length > 0 ? (
            <div className="py-1">
              {filteredResults.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleUserClick(user)}
                  className="flex w-full items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.image || undefined} />
                    <AvatarFallback className="text-xs">
                      {getDisplayName(user)[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium">
                      {getDisplayName(user)}
                    </p>
                    {user.username && user.name && (
                      <p className="text-xs text-muted-foreground">
                        @{user.username}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : debouncedQuery.length > 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No users found matching "{debouncedQuery}"
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}