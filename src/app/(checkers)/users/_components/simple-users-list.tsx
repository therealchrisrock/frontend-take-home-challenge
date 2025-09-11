"use client";

import { Search, User } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { LoadingSpinner } from "~/components/ui/loading";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/trpc/react";

interface SimpleUsersListProps {
    currentUserId?: string;
}

export default function SimpleUsersList({ currentUserId }: SimpleUsersListProps) {
    const [searchQuery, setSearchQuery] = useState("");

    const { data: users, isLoading } = api.user.searchUsers.useQuery(
        { query: searchQuery },
        {
            enabled: searchQuery.length > 0,
        },
    );

    return (
        <div className="space-y-6">
            {/* Search Bar */}
            <div className="relative mx-auto max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                    type="text"
                    placeholder="Search players..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* Users Grid */}
            {isLoading && searchQuery.length > 0 ? (
                <div className="py-12 text-center">
                    <LoadingSpinner size="lg" />
                    <p className="mt-4 text-gray-500">Searching for players...</p>
                </div>
            ) : isLoading ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {[...Array(8)].map((_, i) => (
                        <Card key={i} className="animate-pulse">
                            <CardContent className="p-4">
                                <div className="flex flex-col items-center text-center">
                                    <Skeleton className="h-16 w-16 rounded-full mb-3 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-shimmer" />
                                    <Skeleton className="h-4 w-24 mb-2 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-shimmer" />
                                    <Skeleton className="h-3 w-20 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-shimmer" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : searchQuery.length === 0 ? (
                <div className="py-12 text-center">
                    <User className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                    <p className="text-gray-500">Start typing to search for players</p>
                </div>
            ) : users && users.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {users.map((user) => (
                        <Link key={user.id} href={`/users/${user.username}`}>
                            <Card className="transition-all hover:shadow-md hover:scale-[1.02]">
                                <CardContent className="p-4">
                                    <div className="flex flex-col items-center text-center">
                                        <Avatar className="h-16 w-16 mb-3">
                                            <AvatarImage src={user.image ?? undefined} />
                                            <AvatarFallback className="bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300 text-lg">
                                                {(user.name ?? user.username).charAt(0).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="w-full">
                                            <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                                                {user.name ?? user.username}
                                            </div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                                @{user.username}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="py-12 text-center">
                    <User className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                    <h3 className="mb-1 font-medium text-gray-900 dark:text-gray-100">
                        No players found
                    </h3>
                    <p className="text-gray-500">Try a different search term</p>
                </div>
            )}
        </div>
    );
}