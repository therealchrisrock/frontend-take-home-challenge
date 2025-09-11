import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";

export default function UserProfileLoading() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20">
            <div className="container mx-auto space-y-4 px-4 py-8">
                {/* Hero Section Skeleton */}
                <Card className="border-2 border-purple-200 bg-gradient-to-r from-purple-100 to-pink-100 dark:border-purple-800 dark:from-purple-900/50 dark:to-pink-900/50">
                    <CardContent className="p-8">
                        <div className="flex flex-col items-center gap-8 md:flex-row md:items-start">
                            {/* Avatar Section */}
                            <div className="relative">
                                <Skeleton className="h-32 w-32 rounded-full" />
                            </div>

                            {/* Player Info */}
                            <div className="flex-1 text-center md:text-left">
                                <div className="mb-2 flex items-center justify-center gap-3 md:justify-start">
                                    <Skeleton className="h-8 w-48" />
                                    <Skeleton className="h-6 w-20" />
                                </div>
                                <Skeleton className="mb-4 h-4 w-32 mx-auto md:mx-0" />

                                {/* XP Progress Bar */}
                                <div className="mb-4">
                                    <div className="mb-1 flex justify-between text-sm">
                                        <Skeleton className="h-3 w-16" />
                                        <Skeleton className="h-3 w-20" />
                                    </div>
                                    <Skeleton className="h-3 w-full" />
                                </div>

                                {/* Quick Stats */}
                                <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                                    {[...Array(4)].map((_, i) => (
                                        <div key={i} className="text-center">
                                            <Skeleton className="h-8 w-12 mx-auto mb-1" />
                                            <Skeleton className="h-3 w-8 mx-auto" />
                                        </div>
                                    ))}
                                </div>

                                {/* Action Buttons */}
                                <div className="flex justify-center gap-2 md:justify-start">
                                    <Skeleton className="h-10 w-32" />
                                    <Skeleton className="h-10 w-28" />
                                </div>
                            </div>

                            {/* Trophy Display */}
                            <div className="hidden lg:block">
                                <Card className="p-4">
                                    <Skeleton className="h-5 w-24 mb-2" />
                                    <Skeleton className="h-8 w-16 mx-auto mb-2" />
                                    <Skeleton className="h-2 w-full" />
                                </Card>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Tabs Skeleton */}
                <div className="space-y-4">
                    <div className="mx-auto flex w-full justify-center lg:w-[400px]">
                        <Skeleton className="h-10 w-[400px]" />
                    </div>

                    {/* Content Skeleton */}
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {[...Array(6)].map((_, i) => (
                            <Card key={i}>
                                <CardHeader>
                                    <Skeleton className="h-6 w-32" />
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-4 w-3/4" />
                                        <Skeleton className="h-4 w-1/2" />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}