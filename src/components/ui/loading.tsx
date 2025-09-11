import { Card, CardContent } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";

interface LoadingPageProps {
    title?: string;
    subtitle?: string;
    cardCount?: number;
    layout?: "list" | "grid";
}

export function LoadingPage({
    title = "Loading...",
    subtitle,
    cardCount = 6,
    layout = "grid"
}: LoadingPageProps) {
    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header skeleton */}
            <div className="mb-8">
                <Skeleton className="h-8 w-64 mb-2" />
                {subtitle && <Skeleton className="h-4 w-96" />}
            </div>

            {/* Content skeleton */}
            {layout === "grid" ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {[...Array(cardCount)].map((_, i) => (
                        <Card key={i}>
                            <CardContent className="p-4">
                                <div className="flex flex-col items-center text-center">
                                    <Skeleton className="h-16 w-16 rounded-full mb-3" />
                                    <Skeleton className="h-4 w-24 mb-2" />
                                    <Skeleton className="h-3 w-20" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="space-y-3">
                    {[...Array(cardCount)].map((_, i) => (
                        <Card key={i}>
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <Skeleton className="h-12 w-12 rounded-full" />
                                    <div className="flex-1">
                                        <Skeleton className="h-4 w-32 mb-2" />
                                        <Skeleton className="h-3 w-24" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

export function LoadingSpinner({ size = "default" }: { size?: "sm" | "default" | "lg" }) {
    const sizeClasses = {
        sm: "h-4 w-4",
        default: "h-6 w-6",
        lg: "h-8 w-8"
    };

    return (
        <div className="flex items-center justify-center p-4">
            <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 ${sizeClasses[size]}`} />
        </div>
    );
}

export function LoadingDots() {
    return (
        <div className="flex items-center justify-center space-x-1 p-4">
            <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
    );
}